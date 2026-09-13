// **السقالةُ تُسحَب، والتاريخُ يُحمى** — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:case-disposal`.
//
// ══ الثابتُ الذي يحرسه (المرحلة الثالثة — تدقيق ٢٠٢٦-٠٩-١٢) ═══════════════
// **خطأُ إدخالٍ في ثانيةٍ لا يصير خلوداً.** والتطبيقُ يفتح تلقائياً — بلا
// قرارِ إنسان — حلقةَ جهازٍ وطلبَ مراجعةٍ وزيارةَ علامة عند «إضافة نوع حالة»
// أو «طلب جهاز». فسحبُ النوع الخاطئ **يزيل تلك السقالةَ وحدها**؛ وأيُّ أثرٍ
// سريريٍّ أو ماليٍّ أو تصنيعيٍّ أو تسليميّ **يمنع الحذف ويقول الباب**.
//
// وما يُثبته هنا، بندَ بندٍ (أ–ك)، **للأطراف والمساند معاً**:
//   أ.  السقالةُ الكاملة تُسحَب: الحالةُ تختفي، وحلقتُها تُحذَف، وطلبُ
//       مراجعتها يُسحَب (لا يُمحى)، وزيارةُ العلامة تُحذَف ناعماً.
//   ب.  **والحلقةُ الملغاة سقالةٌ أيضاً** — كانت تحبس الخيطَ إلى الأبد.
//   ج.  **إلغاءُ الحلقة يسحب طلبَها ويُقاعد متابعتَها** (INT-06 = RTP-5).
//   د.  التاريخُ الحقيقيّ يمنع، **بسبعة حواجزَ لكلٍّ رمزُه وبابُه**.
//   هـ. **والخيطُ الموازي لا يُمَسّ**: حلقةُ الجهاز الثاني وأمرُه وسجلُّه.
//   و.  **والخدمةُ الأخرى لا تُمَسّ**: أطرافٌ تُسحَب فيبقى المسندُ كاملاً.
//   ز.  **والقرارُ يُعاد أخذُه تحت القفل** — حالةُ الشاشة ليست حدَّ أمان.
//   ح.  **وضغطتان متزامنتان** تُنتجان سحباً واحداً بلا نصفِ تنظيف.
//   ط.  **والمزامنةُ لا تُعيد بناءَ ما سُحب** — لا عَلَمٌ ولا عمودُ تفاصيل.
//   ي.  **وإطفاءُ العَلَم من «تعديل مريض» لا يُيتّم حالةً** (CASEDEL-06).
//   ك.  والصلاحيةُ للمسؤول العام حصراً، **والحاجزُ يحمل بابَه للشاشة**.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import * as episodes from "./device_episodes/store";
import * as followupStore from "./followup/store";
import { classifyCaseDisposal, CaseDisposalBlockedError } from "./patient_cases/disposal";
import { db } from "./db";
import { TERMINAL_STATUSES, isTerminal } from "@shared/followup";
import { purchasePresentation, FOLLOWUP_EVENT_TITLES } from "@shared/followup_events";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6973;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سحب-الحالة";
const ADMIN = 99730, MGR = 99731, RECV = 99732, DOC = 99733, EXPERT = 99734;
const USERS = [ADMIN, MGR, RECV, DOC, EXPERT];

type Svc = "prosthetic" | "medical_support";
/** نوعُ الخدمة كما تسمّيه نقطةُ «إضافة نوع حالة» — «أطراف» اسمُها `amputee`. */
const ADD_KEY: Record<Svc, string> = { prosthetic: "amputee", medical_support: "medical_support" };
const OTHER: Record<Svc, Svc> = { prosthetic: "medical_support", medical_support: "prosthetic" };

const perms = {
  canViewPatients: true, canAddPatients: true, canEditPatients: true,
  canDeletePatients: true,
};
const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: perms,
  },
  /** **مديرُ فرعٍ بكلّ الأعلام** — ويُثبَت أنها لا تفتح هذا الباب. */
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد", permissions: perms,
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: perms,
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد",
    permissions: { ...perms, canWriteMedicalExam: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

// ── بناءُ الحالات ────────────────────────────────────────────────────────
//  **رقمٌ فريدٌ لكلّ ملفّ**: حارسُ «رقمٌ مكرَّر على مريضٍ فعّالٍ آخر» يردّ
//  ٤٠٩ على أيّ تعديلٍ يمسّ الهاتف — ومسارُ «تعديل مريض» في القسم (ي) يمسّه.
let phoneSeq = 0;
const nextPhone = () => `0770${String(2_000_000 + (phoneSeq += 1))}`;

async function mkPatient(label: string, kind: Svc, opts: { branch?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,$8,$2,'40','172','78','بتر',$3,$4,$5,$6,$7,false,0,'new')
     RETURNING id`,
    [`${MARK} ${label}`, MARK,
      kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
      kind === "medical_support" ? "مسند ركبة" : null,
      opts.branch ?? 1, kind === "prosthetic", kind === "medical_support", nextPhone()]);
  return r[0].id;
}
const phoneOf = async (p: number) =>
  String((await q(`SELECT phone FROM patients WHERE id=$1`, [p]))[0]?.phone ?? "");
const mkCase = async (patientId: number, caseType: string, branch = 1, cost = 0) =>
  (await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$3,$2,$4,'manual','active') RETURNING id`,
    [patientId, caseType, branch, cost]))[0].id;

const mkEpisode = async (
  patientId: number, caseId: number, seq: number, status: string,
  servicePath: string | null = "exam", branch = 1,
) => (await q<{ id: number }>(
  `INSERT INTO patient_device_episodes
     (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, service_path)
   VALUES ($1,$2,$6,$3,$4,0,$5) RETURNING id`,
  [patientId, caseId, seq, status, servicePath, branch]))[0].id;

const mkRequest = async (
  patientId: number, caseId: number, svc: Svc,
  opts: { episodeId?: number | null; status?: string; examId?: number | null } = {},
) => (await q<{ id: number }>(
  `INSERT INTO medical_review_requests
     (patient_id, service_type, case_id, branch_id, device_episode_id,
      requested_path, review_kind, created_by, status, decision, decided_at, decided_by, exam_id)
   VALUES ($1,$2,$3,1,$4,'full','new_device',${RECV},$5,
           CASE WHEN $5 IN ('approved','escalated','returned') THEN 'approve' ELSE NULL END,
           CASE WHEN $5 = 'pending' THEN NULL ELSE NOW() END,
           CASE WHEN $5 = 'pending' THEN NULL ELSE ${ADMIN} END, $6)
   RETURNING id`,
  [patientId, svc, caseId, opts.episodeId ?? null, opts.status ?? "pending", opts.examId ?? null]))[0].id;

const mkExam = async (patientId: number, caseId: number, svc: Svc, episodeId: number | null) =>
  (await q<{ id: number }>(
    `INSERT INTO medical_exams
       (patient_id, case_id, branch_id, case_type, doctor_id, doctor_name,
        chief_complaint, clinical_findings, diagnosis, plan, notes, prescription,
        device_episode_id, signed_at)
     VALUES ($1,$2,1,$3,${DOC},'د. سعد','شكوى','فحص','تشخيص','خطة','ملاحظة',
             '{}'::jsonb,$4,NOW()) RETURNING id`,
    [patientId, caseId, svc, episodeId]))[0].id;

const mkFollowup = async (
  patientId: number, caseId: number, svc: Svc, episodeId: number | null,
  status = "awaiting_patient_decision", examId: number | null = null,
) => (await q<{ id: number }>(
  `INSERT INTO post_exam_followups
     (patient_id, case_id, branch_id, service_type, device_episode_id, status, medical_exam_id)
   VALUES ($1,$2,1,$3,$4,$5,$6) RETURNING id`,
  [patientId, caseId, svc, episodeId, status, examId]))[0].id;

const mkOrder = async (patientId: number, svc: Svc, episodeId: number | null, purpose = "initial_build") =>
  (await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, service_type, purpose, status,
        current_stage, device_episode_id)
     VALUES ($1,1,${EXPERT},$2,$3,'active','new_assignment',$4) RETURNING id`,
    [patientId, svc, purpose, episodeId]))[0].id;

// ── قراءةُ الحال ─────────────────────────────────────────────────────────
const caseRows = (p: number) =>
  q(`SELECT id, case_type, status FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [p]);
const epRows = (p: number) =>
  q(`SELECT id, case_id, status FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [p]);
const reqRows = (p: number) =>
  q(`SELECT id, status, decision, decided_by::int db, doctor_note FROM medical_review_requests
      WHERE patient_id=$1 ORDER BY id`, [p]);
const fuRows = (p: number) =>
  q(`SELECT id, status FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [p]);
const visitRows = (p: number) =>
  q(`SELECT id, case_id, deleted_at, details FROM visits WHERE patient_id=$1 ORDER BY id`, [p]);
const flags = async (p: number) => (await q(
  `SELECT is_amputee a, is_medical_support m, is_physiotherapy f,
          amputation_site site, prosthetic_type ptype, support_type stype
     FROM patients WHERE id=$1`, [p]))[0];

const removeCase = (p: number, svc: string, session: any, reason: any = "أُضيف بالخطأ") =>
  http("DELETE", `/api/patients/${p}/case-type/${svc}`, session, { reason });

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const s of [
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE followup_id IN
       (SELECT id FROM post_exam_followups WHERE patient_id IN (${ids}))`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN
       (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN
       (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN
       (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
  ]) await q(s);
  await q(`DELETE FROM visits_forensic_log WHERE patient_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = visits_forensic_log.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name] of [
    [ADMIN, "admin", "null", "المسؤول"],
    [MGR, "branch_manager", "null", "مدير بغداد"],
    [RECV, "reception", "null", "ريام"],
    [DOC, "doctor", '["prosthetic","medical_support"]', "د. سعد"],
    [EXPERT, "prosthetics_expert", "null", "الخبير"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,1,'[1,2]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_id=1, branch_ids='[1,2]'::jsonb,
               medical_specialties=EXCLUDED.medical_specialties`,
      [id, `cd_u${id}`, role, name, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      const L = svc === "prosthetic" ? "أطراف" : "مساند";
      console.log(`\n═══════════════ ${L} ═══════════════`);

      // ══ أ. السقالةُ الكاملة تُسحَب — بالمسار الحقيقيّ لا بحقنٍ يدوي ══════
      console.log(`\n── أ. السقالة الكاملة (${L}) ──`);
      {
        //  المسارُ الطبيعيُّ الذي وُلد منه العطب: الاستقبالُ يفتح «طلب جهاز»
        //  فينشئ التطبيقُ الحلقةَ وطلبَ المراجعة معاً بلا قرارِ إنسان.
        const p = await mkPatient(`أ-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: svc, servicePath: "exam" });
        same("أ١. فتحُ طلب الجهاز ينجح (المسار الطبيعي)", ep.status, 201);
        const epId = Number(ep.body?.id);
        const reqsBefore = await reqRows(p);
        check(reqsBefore.length === 1 && reqsBefore[0].status === "pending",
          "أ٢. والتطبيقُ فتح طلبَ مراجعةٍ معلَّقاً تلقائياً", JSON.stringify(reqsBefore));

        //  وزيارةُ علامةٍ من «إضافة نوع حالة» للخدمة الأخرى، لنثبت أن
        //  زيارةَ هذا الخيط تُحذَف ناعماً ولا تُنقَل.
        await q(`INSERT INTO visits (patient_id, branch_id, case_id, details, notes)
                 VALUES ($1,1,(SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type=$2),
                         'إضافة نوع حالة','إضافة نوع حالة: اختبار')`, [p, svc]);

        const del = await removeCase(p, svc, S.admin);
        check(del.status === 200, "أ٣. **سحبُ النوع ينجح** — السقالةُ لا تُخلّد خطأ إدخال",
          `${del.status} ${JSON.stringify(del.body)}`);
        same("أ٤. ولا حالةَ باقية", (await caseRows(p)).length, 0);
        same("أ٥. **والحلقةُ السقالية أُزيلت فعلاً**", (await epRows(p)).length, 0);

        const reqs = await reqRows(p);
        check(reqs.length === 1 && reqs[0].status === "cancelled",
          "أ٦. **وطلبُ المراجعة سُحب ولم يُمحَ** — الواقعةُ تبقى مقروءة", JSON.stringify(reqs));
        same("أ٧. ولا قرارَ طبيبٍ يُدَّعى (decision = NULL)", reqs[0].decision, null);
        check(Number(reqs[0].db) === ADMIN && String(reqs[0].doctor_note || "").includes("بالخطأ"),
          "أ٨. ومَن سحب ولماذا محفوظان", JSON.stringify(reqs[0]));

        const vs = await visitRows(p);
        check(vs.length === 1 && vs[0].deleted_at !== null && vs[0].case_id === null,
          "أ٩. وزيارةُ العلامة حُذفت ناعماً وفُصلت — لا تُنقَل لخيطٍ باقٍ", JSON.stringify(vs));
        same("أ١٠. ولا سطرَ جنائيّ — الحذفُ الناعم لا يستثير الترِكر",
          (await q(`SELECT 1 FROM visits_forensic_log WHERE patient_id=$1`, [p])).length, 0);

        const f = await flags(p);
        const flagOff = svc === "prosthetic" ? f.a === false : f.m === false;
        check(flagOff, "أ١١. والعَلَمُ أُطفئ", JSON.stringify(f));
        check(svc === "prosthetic" ? f.site === null && f.ptype === null : f.stype === null,
          "أ١٢. وأعمدةُ تفاصيله صُفِّرت — فلا إشارةَ تُعيد بناءه", JSON.stringify(f));

        //  وسطرُ التدقيق يسمّي ما أُزيل بأرقامه.
        const [audit] = await q(
          `SELECT notes FROM audit_log WHERE entity_type='patient' AND entity_id=$1
            ORDER BY id DESC LIMIT 1`, [p]);
        check(String(audit?.notes || "").includes(`#${epId}`)
          && /طلبات أجهزة غير مستعملة/.test(String(audit?.notes || "")),
          "أ١٣. **وسطرُ التدقيق يسمّي السقالةَ بأرقامها**", String(audit?.notes || ""));
        check(/أُضيف بالخطأ/.test(String(audit?.notes || "")),
          "أ١٤. ويحمل سببَ السحب كما كتبه المسؤول", String(audit?.notes || ""));
      }

      // ══ ب. الحلقةُ الملغاة سقالةٌ أيضاً ═══════════════════════════════
      console.log(`\n── ب. الحلقة الملغاة (${L}) ──`);
      {
        const p = await mkPatient(`ب-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "cancelled");
        const del = await removeCase(p, svc, S.admin);
        same("ب١. **والملغاةُ الفارغةُ لا تحبس الخيطَ** — كانت تحبسه إلى الأبد",
          del.status, 200);
        same("ب٢. وأُزيلت معه", (await q(`SELECT 1 FROM patient_device_episodes WHERE id=$1`, [e])).length, 0);
      }
      {
        //  **لكنّ الملغاةَ ذاتَ التاريخ ليست سقالة**: أُلغيت بعد معاينةٍ
        //  وُقّعت عليها (٠٦١) أو إبطالٍ إداريّ (٠٦٤).
        const p = await mkPatient(`ب٢-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "cancelled");
        await mkExam(p, c, svc, e);
        const del = await removeCase(p, svc, S.admin);
        same("ب٣. **وملغاةٌ وُقّعت عليها معاينةٌ يوماً تُحجَب**", del.status, 409);
        same("ب٤. بالرمز الصحيح", del.body?.code, "signed_exam");
        same("ب٥. والحالةُ باقية", (await caseRows(p)).length, 1);
      }

      // ══ ج. إلغاءُ الحلقة يسحب طلبَها ويُقاعد متابعتَها (INT-06 = RTP-5) ══
      console.log(`\n── ج. إلغاء الحلقة يُنظّف أثرَها (${L}) ──`);
      {
        const p = await mkPatient(`ج-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: svc, servicePath: "exam" });
        const epId = Number(ep.body?.id);
        const cancel = await http("POST", `/api/patients/${p}/device-episodes/${epId}/cancel`,
          S.admin, { reason: "فُتح بالخطأ" });
        same("ج١. إلغاءُ الحلقة ينجح", cancel.status, 200);
        const reqs = await reqRows(p);
        check(reqs.length === 1 && reqs[0].status === "cancelled",
          "ج٢. **ولا طلبَ شبحاً يبقى `pending`** — كان يبقى إلى الأبد", JSON.stringify(reqs));
        //  والمرساةُ تحرّرت: فهرسا التفرّد مشروطان بـ`pending`، فالطلبُ
        //  الصحيحُ التالي يمرّ بلا ٤٠٩.
        const again = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: svc, servicePath: "exam" });
        same("ج٣. **والطلبُ الصحيح التالي يمرّ** — المرساةُ تحرّرت", again.status, 201);
      }
      {
        //  متابعةٌ حيّةٌ على حلقةٍ مُعايَنة — تتقاعد بسببها الحقيقيّ.
        const p = await mkPatient(`ج٢-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "examined");
        const fu = await mkFollowup(p, c, svc, e);
        const r = await episodes.cancelPreManufacturingDeviceEpisode({
          patientId: p, episodeId: e, reason: "سُحب الطلب",
          actor: { userId: ADMIN, userName: "المسؤول" },
        });
        same("ج٤. إلغاءُ حلقةٍ مُعايَنة ينجح", r.status, "cancelled");
        same("ج٥. ويُرجع معرّفَ المتابعة المتقاعدة", r.retiredFollowupId, fu);
        const fus = await fuRows(p);
        same("ج٦. **والمتابعةُ الحيّة تقاعدت بسببها الحقيقيّ**",
          fus[0]?.status, "closed_request_cancelled");
        check(isTerminal(String(fus[0]?.status)),
          "ج٧. وهي طرفيّةٌ معروفة — لا تُحسَب حيّةً في أيّ قارئ");
        same("ج٨. ولا تُقرأ «لم يشترِ» ولا «تم الشراء»",
          purchasePresentation({ status: String(fus[0]?.status) }), "request_cancelled");
        const [ev] = await q(
          `SELECT event_type, from_status, to_status, note FROM post_exam_followup_events
            WHERE followup_id=$1 ORDER BY id DESC LIMIT 1`, [fu]);
        same("ج٩. وحدثُها مسجَّلٌ بنوعه", ev?.event_type, "closed_request_cancelled");
        same("ج١٠. ومن حالتها السابقة", ev?.from_status, "awaiting_patient_decision");
        check(typeof FOLLOWUP_EVENT_TITLES["closed_request_cancelled"] === "string",
          "ج١١. **وله عنوانٌ عربيّ** — لا «إجراء مسجَّل على الملف» العامّة");
      }
      {
        //  **والمنتهيةُ لا يُعاد كتابةُ تاريخها** — درسُ INT-01 بالحرف.
        const p = await mkPatient(`ج٣-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "examined");
        const fu = await mkFollowup(p, c, svc, e, "closed_without_purchase");
        const r = await episodes.cancelPreManufacturingDeviceEpisode({
          patientId: p, episodeId: e, reason: "سُحب الطلب",
          actor: { userId: ADMIN, userName: "المسؤول" },
        });
        same("ج١٢. **ومتابعةُ «لم يشترِ» تبقى كما هي**", r.retiredFollowupId, null);
        same("ج١٣. بحالتها الأصلية بحرفها",
          (await fuRows(p))[0]?.status, "closed_without_purchase");
        same("ج١٤. ولا حدثَ زائفٌ يُكتب عليها",
          (await q(`SELECT 1 FROM post_exam_followup_events WHERE followup_id=$1`, [fu])).length, 0);
      }

      // ══ ج-٢. **المسارُ الكامل: افتح ⟶ ألغِ ⟶ اسحب** (P1 من المراجعة) ════
      //  أمسكه مراجعٌ مستقلّ: `cancelScaffoldRequestsForEpisode` تكتب
      //  `cancelled` **وتُبقي** `device_episode_id`، فلو لم تكن `cancelled`
      //  في قائمة السقالة لعادت الحلقةُ «تاريخاً» ولحُبس الخيطُ إلى الأبد —
      //  العطبُ بعينه الذي يغلقه هذا الفرع. والتركيبةُ التي تكسر هي التي لم
      //  تُكتَب، فهذه هي.
      console.log(`\n── ج-٢. افتح ثمّ ألغِ ثمّ اسحب (${L}) ──`);
      {
        const p = await mkPatient(`ج٤-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: svc, servicePath: "exam" });
        const epId = Number(ep.body?.id);
        const cancel = await http("POST", `/api/patients/${p}/device-episodes/${epId}/cancel`,
          S.admin, { reason: "فُتح بالخطأ" });
        same("ج١٥. الإلغاء ينجح", cancel.status, 200);
        const mid = await reqRows(p);
        check(mid.length === 1 && mid[0].status === "cancelled",
          "ج١٦. والطلبُ صار مسحوباً ومرساتُه الحلقةُ باقية", JSON.stringify(mid));
        const del = await removeCase(p, svc, S.admin);
        check(del.status === 200,
          "ج١٧. **ثمّ السحبُ ينجح** — المسحوبُ سقالةٌ لا تاريخ",
          `${del.status} ${JSON.stringify(del.body)}`);
        same("ج١٨. ولا حالةَ باقية", (await caseRows(p)).length, 0);
        same("ج١٩. ولا حلقةَ باقية", (await epRows(p)).length, 0);
        same("ج٢٠. والطلبُ باقٍ مسحوباً بمرساتين محرَّرتين",
          (await q(`SELECT status, case_id, device_episode_id FROM medical_review_requests
                     WHERE patient_id=$1`, [p]))[0],
          { status: "cancelled", case_id: null, device_episode_id: null });
        const [note] = await q(`SELECT doctor_note FROM medical_review_requests WHERE patient_id=$1`, [p]);
        check(/فُتح بالخطأ/.test(String(note?.doctor_note))
          && new RegExp(`طلب الجهاز #${epId}`).test(String(note?.doctor_note)),
          "ج٢١. **والملاحظةُ تُلحِق ولا تمحو** — سببُ الإلغاء ثمّ المرساة",
          String(note?.doctor_note));
      }
      {
        //  **ومسحوبٌ وحدَه بلا حلقة** لا يُقرأ «حسمه الطبيب» (F2).
        const p = await mkPatient(`ج٥-${svc}`, svc);
        const c = await mkCase(p, svc);
        await q(`INSERT INTO medical_review_requests
                   (patient_id, service_type, case_id, branch_id, requested_path,
                    review_kind, created_by, status, decision, decided_at, decided_by)
                 VALUES ($1,$2,$3,1,'full','new_device',${RECV},'cancelled',NULL,NOW(),${ADMIN})`,
          [p, svc, c]);
        const del = await removeCase(p, svc, S.admin);
        check(del.status === 200,
          "ج٢٢. **وطلبٌ مسحوبٌ سلفاً لا يُقرأ «حسمه الطبيب»**",
          `${del.status} ${JSON.stringify(del.body)}`);
      }
      {
        //  **ومرساةُ الحلقة وحدها** (F3): الحلقةُ تُقرَأ سقالةً بشرطٍ على
        //  `device_episode_id`، والصفُّ كان يُختار بـ`case_id` وحده — فطلبٌ
        //  بلا حالةٍ كان يُترَك فينفجر حذفُ الحلقة بـ٢٣٥٠٣ خامّاً.
        const p = await mkPatient(`ج٦-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "awaiting_exam");
        await q(`INSERT INTO medical_review_requests
                   (patient_id, service_type, case_id, branch_id, device_episode_id,
                    requested_path, review_kind, created_by, status)
                 VALUES ($1,$2,NULL,1,$3,'full','new_device',${RECV},'pending')`,
          [p, svc, e]);
        const del = await removeCase(p, svc, S.admin);
        check(del.status === 200,
          "ج٢٣. **وطلبٌ مرساتُه الحلقةُ وحدها يُسحَب معها**",
          `${del.status} ${JSON.stringify(del.body)}`);
        check(!/violates|constraint|ERROR:/i.test(JSON.stringify(del.body)),
          "ج٢٤. ولا نصَّ Postgres خامّاً على مسار النجاح", JSON.stringify(del.body));
        same("ج٢٥. والحلقةُ أُزيلت", (await epRows(p)).length, 0);
      }
      {
        //  **وقرارُ الطبيب لا يُمحى** (F4): طلبٌ مُرجَعٌ يحمل سببَ الإرجاع
        //  الإلزاميّ ومَن أرجعه وقرارَه — الثلاثةُ تبقى، والسحبُ يُلحَق.
        const p = await mkPatient(`ج٧-${svc}`, svc);
        const c = await mkCase(p, svc);
        const WHY = "جهة البتر غير صحيحة — عدّلها وأعد إرسال الطلب";
        await q(`INSERT INTO medical_review_requests
                   (patient_id, service_type, case_id, branch_id, requested_path,
                    review_kind, created_by, status, decision, decided_at, decided_by, doctor_note)
                 VALUES ($1,$2,$3,1,'full','new_device',${RECV},'returned',
                         'return_to_reception',NOW(),${DOC},$4)`,
          [p, svc, c, WHY]);
        same("ج٢٦. سحبُ حالةٍ بطلبٍ مُرجَع ينجح", (await removeCase(p, svc, S.admin)).status, 200);
        const [r] = await q(`SELECT status, decision, decided_by::int db, doctor_note
                               FROM medical_review_requests WHERE patient_id=$1`, [p]);
        same("ج٢٧. **وقرارُ الطبيب باقٍ بحرفه**", r?.decision, "return_to_reception");
        same("ج٢٨. ومَن قرّره باقٍ — لا يُكتب المسؤولُ فوقه", Number(r?.db), DOC);
        check(String(r?.doctor_note || "").startsWith(WHY),
          "ج٢٩. **وسببُه الإلزاميُّ أوّلُ ما يُقرأ**", String(r?.doctor_note));
        check(/سُحبت الحالة/.test(String(r?.doctor_note || "")),
          "ج٣٠. وسطرُ السحب مُلحَقٌ بعده", String(r?.doctor_note));
        same("ج٣١. والحالةُ صارت مسحوبة", r?.status, "cancelled");
      }
      {
        //  **ولا قفلَ سعرٍ بعد سحب الطلب** (F5): `hasActiveFollowup` كانت
        //  تقرأ ثلاثَ طرفيّاتٍ فقط، فالمتقاعدةُ بالسحب تُحسَب حيّةً ويبقى
        //  `totalCost` مقفلاً إلى الأبد بلا متابعةٍ ولا سعرٍ معتمَد.
        const p = await mkPatient(`ج٨-${svc}`, svc);
        const c = await mkCase(p, svc);
        const e = await mkEpisode(p, c, 1, "examined");
        await mkFollowup(p, c, svc, e);
        await episodes.cancelPreManufacturingDeviceEpisode({
          patientId: p, episodeId: e, reason: "سُحب الطلب",
          actor: { userId: ADMIN, userName: "المسؤول" },
        });
        const live = await followupStore.hasActiveFollowup({ patientId: p, serviceType: svc });
        check(live === false,
          "ج٣٢. **ولا متابعةَ حيّة بعد السحب** — القفلُ يرتفع", String(live));
        const phone = await phoneOf(p);
        const upd = await http("PUT", `/api/patients/${p}`, S.admin, {
          name: `${MARK} ج٨-${svc}`, phone, branchId: 1, totalCost: 750000,
        });
        same("ج٣٣. وتعديلُ الكلفة يمضي", upd.status, 200);
        same("ج٣٤. **بلا ملاحظةِ قفل**", upd.body?.costNote ?? null, null);
        same("ج٣٥. والرقمُ كُتب فعلاً",
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0]?.total_cost), 750000);
      }

      // ══ د. التاريخُ الحقيقيّ يمنع — سبعةُ حواجزَ بأبوابها ═══════════════
      console.log(`\n── د. الحواجز السبعة (${L}) ──`);
      {
        type Case = { name: string; code: string; build: (p: number, c: number) => Promise<void> };
        const cases: Case[] = [
          {
            name: "معاينةٌ موقّعة", code: "signed_exam",
            build: async (p, c) => { await mkExam(p, c, svc, null); },
          },
          {
            name: "متابعةُ قرارِ مريض", code: "followup",
            build: async (p, c) => { await mkFollowup(p, c, svc, null); },
          },
          {
            name: "أمرُ تصنيع", code: "work_order",
            build: async (p) => { await mkOrder(p, svc, null); },
          },
          {
            name: "دفعةٌ موسومة", code: "tagged_payment",
            build: async (p) => {
              const tag = svc === "prosthetic" ? "أطراف صناعية" : "مساند طبية";
              await q(`INSERT INTO payments (patient_id, branch_id, amount, payment_treatment_type, date)
                       VALUES ($1,1,100000,$2,CURRENT_DATE)`, [p, tag]);
            },
          },
          {
            name: "مبلغٌ معلَّق", code: "pending_charge",
            build: async (p, c) => {
              await q(`INSERT INTO pending_service_charges
                         (patient_id, case_id, branch_id, service_type, operation_kind,
                          amount, status, created_by)
                       VALUES ($1,$2,1,$3,'maintenance',50000,'pending_review',${RECV})`,
                [p, c, svc]);
            },
          },
          {
            name: "طلبُ خصمٍ معلَّق", code: "discount_request",
            build: async (p, c) => {
              await q(`INSERT INTO service_discount_requests
                         (patient_id, case_id, branch_id, department, context_ref,
                          original_price, proposed_final_price, discount_amount,
                          discount_percentage, is_free, reason, status, payload, requested_by)
                       VALUES ($1,$2,1,$3,'t-${svc}-${p}',100000,80000,20000,20,false,
                               'سبب','pending','{}'::jsonb,${RECV})`,
                [p, c, svc]);
            },
          },
          {
            name: "جهازٌ تجاوز مرحلةَ الطلب", code: "live_episode",
            build: async (p, c) => { await mkEpisode(p, c, 1, "delivered"); },
          },
          {
            name: "طلبُ مراجعةٍ حسمه الطبيب", code: "reviewed_request",
            build: async (p, c) => { await mkRequest(p, c, svc, { status: "approved" }); },
          },
        ];
        for (const t of cases) {
          const p = await mkPatient(`د-${t.code}-${svc}`, svc);
          const c = await mkCase(p, svc);
          await t.build(p, c);
          const before = {
            cases: await caseRows(p), eps: await epRows(p), reqs: await reqRows(p),
          };
          const del = await removeCase(p, svc, S.admin);
          same(`د. ${t.name} ⟶ ٤٠٩`, del.status, 409);
          same(`   بالرمز ${t.code}`, del.body?.code, t.code);
          check(typeof del.body?.remedy === "string" && del.body.remedy.length > 10,
            "   **ومعه البابُ الذي يفكّه** — لا جملةٌ مسدودة", JSON.stringify(del.body));
          check(!/violates|constraint|ERROR:|null value/i.test(String(del.body?.message || "")),
            "   ولا نصَّ Postgres خام", String(del.body?.message));
          same("   وصفرُ كتابة: الحالةُ باقية", await caseRows(p), before.cases);
          same("   والحلقاتُ كما هي", await epRows(p), before.eps);
          same("   والطلباتُ كما هي", await reqRows(p), before.reqs);
        }
      }

      // ══ هـ. الخيطُ الموازي لا يُمَسّ ══════════════════════════════════
      console.log(`\n── هـ. الجهاز الموازي (${L}) ──`);
      {
        //  ترحيلُ ٠٧٣ أجاز أكثرَ من حلقةٍ مفتوحة على الخيط. فحلقةٌ سقالية
        //  وحلقةٌ لها تاريخٌ معاً: **التاريخُ يمنع، ولا تُمَسّ السقالةُ أيضاً.**
        const p = await mkPatient(`هـ-${svc}`, svc);
        const c = await mkCase(p, svc);
        const scaffold = await mkEpisode(p, c, 1, "awaiting_exam");
        const live = await mkEpisode(p, c, 2, "in_manufacturing");
        const order = await mkOrder(p, svc, live);
        const del = await removeCase(p, svc, S.admin);
        same("هـ١. **حلقةٌ حيّةٌ بجوار سقالةٍ ⟶ يُمنَع السحب**", del.status, 409);
        const eps = await epRows(p);
        same("هـ٢. **والسقالةُ لم تُمَسّ** — لا نصفَ تنظيفٍ عند الرفض",
          eps.map((e: any) => Number(e.id)), [scaffold, live]);
        same("هـ٣. وأمرُ التصنيع قائم",
          (await q(`SELECT status FROM prosthetic_work_orders WHERE id=$1`, [order]))[0]?.status, "active");
      }

      // ══ و. الخدمةُ الأخرى لا تُمَسّ ════════════════════════════════════
      console.log(`\n── و. الخدمة الأخرى (${L}) ──`);
      {
        const other = OTHER[svc];
        const p = await mkPatient(`و-${svc}`, svc);
        const c = await mkCase(p, svc);
        const cOther = await mkCase(p, other);
        await q(`UPDATE patients SET is_amputee=true, is_medical_support=true WHERE id=$1`, [p]);
        const epThis = await mkEpisode(p, c, 1, "awaiting_exam");
        const epOther = await mkEpisode(p, cOther, 1, "awaiting_exam");
        const examOther = await mkExam(p, cOther, other, epOther);
        const del = await removeCase(p, svc, S.admin);
        same("و١. سحبُ هذه الخدمة ينجح", del.status, 200);
        const cs = await caseRows(p);
        same("و٢. **والخدمةُ الأخرى باقيةٌ بحالتها**",
          cs.map((x: any) => x.case_type), [other]);
        same("و٣. وحلقتُها لم تُمَسّ",
          (await epRows(p)).map((e: any) => Number(e.id)), [epOther]);
        same("و٤. ومعاينتُها كما هي",
          (await q(`SELECT 1 FROM medical_exams WHERE id=$1`, [examOther])).length, 1);
        same("و٥. وحلقةُ هذه الخدمة وحدها أُزيلت",
          (await q(`SELECT 1 FROM patient_device_episodes WHERE id=$1`, [epThis])).length, 0);
        const f = await flags(p);
        const otherFlagOn = other === "prosthetic" ? f.a === true : f.m === true;
        check(otherFlagOn, "و٦. وعَلَمُ الخدمة الأخرى لم يُطفَأ", JSON.stringify(f));
      }

      // ══ ز. القرارُ يُعاد أخذُه تحت القفل — حالةُ الشاشة ليست حدَّ أمان ══
      console.log(`\n── ز. إعادة القرار تحت القفل (${L}) ──`);
      {
        const p = await mkPatient(`ز-${svc}`, svc);
        const c = await mkCase(p, svc);
        await mkEpisode(p, c, 1, "awaiting_exam");
        //  الشاشةُ رأت «قابلاً للسحب»…
        const before = await db.transaction((tx) =>
          classifyCaseDisposal(tx as any, { patientId: p, caseId: c, caseType: svc }));
        check(before.disposable === true, "ز١. القاعدةُ تقرأ الحالةَ قابلةً للسحب");
        //  …ثمّ وقّع الطبيبُ معاينةً قبل الضغطة.
        await mkExam(p, c, svc, null);
        const del = await removeCase(p, svc, S.admin);
        same("ز٢. **والضغطةُ تُردّ — القرارُ يُعاد أخذُه تحت القفل**", del.status, 409);
        same("ز٣. بالسبب الجديد لا بالقديم", del.body?.code, "signed_exam");
        same("ز٤. والحالةُ باقية", (await caseRows(p)).length, 1);
      }

      // ══ ح. ضغطتان متزامنتان ═══════════════════════════════════════════
      console.log(`\n── ح. التزامن (${L}) ──`);
      {
        const p = await mkPatient(`ح-${svc}`, svc);
        const c = await mkCase(p, svc);
        await mkEpisode(p, c, 1, "awaiting_exam");
        await mkRequest(p, c, svc, { status: "pending" });
        const [a, b] = await Promise.all([
          removeCase(p, svc, S.admin), removeCase(p, svc, S.admin),
        ]);
        const codes = [a.status, b.status].sort();
        same("ح١. **ضغطتان ⟶ نجاحٌ واحد ورفضٌ واحد**", codes, [200, 409]);
        same("ح٢. ولا حالةَ باقية", (await caseRows(p)).length, 0);
        same("ح٣. ولا حلقةَ مكرَّرةُ الحذف", (await epRows(p)).length, 0);
        const reqs = await reqRows(p);
        check(reqs.length === 1 && reqs[0].status === "cancelled",
          "ح٤. وطلبُ المراجعة مسحوبٌ مرّةً واحدة", JSON.stringify(reqs));
      }

      // ══ ط. المزامنةُ لا تُعيد بناءَ ما سُحب ════════════════════════════
      console.log(`\n── ط. لا عودةَ بالمزامنة (${L}) ──`);
      {
        const p = await mkPatient(`ط-${svc}`, svc);
        await mkCase(p, svc);
        await mkCase(p, "physiotherapy");
        await q(`UPDATE patients SET is_physiotherapy=true WHERE id=$1`, [p]);
        await mkEpisode(p, (await caseRows(p))[0].id, 1, "awaiting_exam");
        same("ط١. سحبُ النوع ينجح", (await removeCase(p, svc, S.admin)).status, 200);
        //  والمزامنةُ تُنادى في كلّ قراءةٍ للحالات — فتُجرَّب صراحةً هنا.
        await storage.syncPatientCases(p);
        const cs = await caseRows(p);
        same("ط٢. **ولا تُعيد المزامنةُ بناءَ ما سُحب**",
          cs.map((x: any) => x.case_type), ["physiotherapy"]);
        const cases = await http("GET", `/api/patients/${p}/cases`, S.admin);
        same("ط٣. والنقطةُ الحيّة تقول الشيءَ نفسه", cases.status, 200);
        check(!JSON.stringify(cases.body).includes(`"${svc}"`),
          "ط٤. ولا أثرَ للنوع المسحوب في استجابتها", JSON.stringify(cases.body).slice(0, 200));
      }

      // ══ ي. إطفاءُ العَلَم لا يُيتّم حالةً (CASEDEL-06) ═══════════════════
      console.log(`\n── ي. إطفاء العَلَم من «تعديل مريض» (${L}) ──`);
      {
        const p = await mkPatient(`ي-${svc}`, svc);
        await mkCase(p, svc);
        const field = svc === "prosthetic" ? "isAmputee" : "isMedicalSupport";
        const phone = await phoneOf(p);
        const upd = await http("PUT", `/api/patients/${p}`, S.admin, {
          name: `${MARK} ي-${svc}`, phone, branchId: 1, [field]: false,
        });
        same("ي١. التعديلُ ينجح (لا يُردّ الطلبُ كلُّه)", upd.status, 200);
        const f = await flags(p);
        const stillOn = svc === "prosthetic" ? f.a === true : f.m === true;
        check(stillOn, "ي٢. **والعَلَمُ لم يُطفَأ** — إطفاؤه كان يترك حالةً شبحاً", JSON.stringify(f));
        same("ي٣. والحالةُ باقيةٌ متّسقةً مع العَلَم", (await caseRows(p)).length, 1);
        check(typeof upd.body?.caseFlagNote === "string"
          && /زرّ السلّة/.test(String(upd.body.caseFlagNote)),
          "ي٤. **ويُقال للمستخدم البابُ الصحيح** — لا إسقاطٌ صامت",
          String(upd.body?.caseFlagNote));
        //  وبعد سحب الحالة من بابها، الإطفاءُ يمضي كالمعتاد.
        await removeCase(p, svc, S.admin);
        const upd2 = await http("PUT", `/api/patients/${p}`, S.admin, {
          name: `${MARK} ي-${svc}`, phone, branchId: 1, [field]: false,
        });
        same("ي٥. وبعد سحب الحالة يمضي الإطفاءُ بلا ملاحظة",
          upd2.body?.caseFlagNote ?? null, null);
      }

      // ══ ك. الصلاحية ═══════════════════════════════════════════════════
      console.log(`\n── ك. الصلاحية (${L}) ──`);
      {
        const p = await mkPatient(`ك-${svc}`, svc);
        const c = await mkCase(p, svc);
        await mkEpisode(p, c, 1, "awaiting_exam");
        for (const [who, s] of [["مديرُ الفرع", S.mgr], ["الاستقبال", S.recv], ["الطبيب", S.doc]] as any[]) {
          const r = await removeCase(p, svc, s);
          same(`ك. ${who} ⟶ ٤٠٣ (للمسؤول العام حصراً)`, r.status, 403);
        }
        same("ك١. والحالةُ باقيةٌ بعد كلّ محاولة", (await caseRows(p)).length, 1);
        same("ك٢. والمسؤولُ العام يمضي", (await removeCase(p, svc, S.admin)).status, 200);
      }
    }

    // ══ ل. حارسُ العقد — المفردات والحرّاس المعماريّون ═══════════════════
    console.log("\n── ل. حارسُ العقد ──");
    {
      const src = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

      check(TERMINAL_STATUSES.includes("closed_request_cancelled" as any),
        "ل١. الطرفيّةُ الخامسة في `TERMINAL_STATUSES`");
      //  **ولا قائمةَ ثانيةً مكتوبةً يدوياً في SQL** — نسيانُ طرفيّةٍ في
      //  موضعٍ يجعل متقاعدةً تُحسَب حيّةً فتُقفل الملفَّ إلى الأبد. وأمسك
      //  مراجعٌ مستقلّ أربعةَ مواضعَ بقيت بثلاثِ قيمٍ وحدها (قفلُ السعر،
      //  المتابعةُ الحيّة، وتصادمُ الدمج) — فالحارسُ يشمل كلَّ قارئٍ حيّ.
      for (const rel of [
        "server/patients/trash_store.ts", "server/followup/store.ts",
        "server/storage.ts",
      ]) {
        check(!/status NOT IN \('closed_without_purchase'/.test(src(rel)),
          `ل٢. لا قائمةَ طرفيّاتٍ يدويّة في ${rel} — المصدرُ واحد`);
      }
      //  **والمفرداتُ في `shared/schema.ts` تواكب الترحيلات**: بيئةٌ تُبنى
      //  بـ`db:push` قبل تشغيلها كانت تأخذ قيداً وفهرسين ناقصَين.
      for (const s of ["closed_exam_cancelled", "closed_admin_void", "closed_request_cancelled"]) {
        const sch = src("shared/schema.ts");
        check((sch.match(new RegExp(s, "g")) ?? []).length >= 3,
          `ل٢-ب. \`${s}\` في القيد والفهرسين معاً`,
          String((sch.match(new RegExp(s, "g")) ?? []).length));
      }

      //  **و`caseHasEpisodes` أُزيلت** — الحارسُ العاريُ الذي سبّب العطب.
      check(!/export\s+(async\s+)?function\s+caseHasEpisodes/.test(src("server/device_episodes/store.ts")),
        "ل٣. **`caseHasEpisodes` أُزيلت** — لا حارسَ عارٍ يعود");
      //  **ولا نداءَ لها** — الذكرُ في تعليقٍ يشرح لماذا أُزيلت مطلوبٌ لا ممنوع.
      check(!/caseHasEpisodes\s*\(/.test(src("server/storage.ts")),
        "ل٤. ولا نداءَ لها في `storage.ts`");

      //  **والقرارُ يُؤخَذ داخل معاملة الحذف** — لا قبلها.
      const st = src("server/storage.ts");
      const body = st.slice(st.indexOf("async deleteCaseType"), st.indexOf("async mergePatients"));
      const order = ["pg_advisory_xact_lock", "classifyCaseDisposal", "CaseDisposalBlockedError",
        "disposeCaseScaffolding", "tx.delete(patientCases)"].map((m) => body.indexOf(m));
      check(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]),
        "ل٥. **الترتيبُ الفعليّ**: قفلٌ ⟵ قرارٌ ⟵ رفضٌ ⟵ سحبُ سقالةٍ ⟵ حذفُ الصفّ",
        JSON.stringify(order));
      check(/db\.transaction/.test(body), "ل٦. وكلُّ ذلك في معاملةٍ واحدة");
      //  ولا كتابةَ حلقاتٍ خامٍّ في `disposal.ts` خارج ما تسمح به القاعدة.
      const dis = src("server/patient_cases/disposal.ts");
      check(!/INSERT\s+INTO\s+patient_device_episodes/i.test(dis),
        "ل٧. ولا تُنشئ قاعدةُ السحب حلقةً إطلاقاً");
      check(!/DELETE\s+FROM\s+medical_exams/i.test(dis)
        && !/DELETE\s+FROM\s+post_exam_followups/i.test(dis)
        && !/DELETE\s+FROM\s+prosthetic_work_orders/i.test(dis)
        && !/DELETE\s+FROM\s+payments/i.test(dis)
        && !/DELETE\s+FROM\s+medical_review_requests/i.test(dis),
        "ل٨. **ولا تهدم تاريخاً**: لا معاينةً ولا متابعةً ولا أمراً ولا دفعةً ولا طلباً");

      //  والشاشةُ تقرأ البابَ الذي يرسله الخادم.
      const ui = src("client/src/components/patient/PatientCasesTabs.tsx");
      check(/e\.remedy/.test(ui) && /err\.remedy/.test(ui),
        "ل٩. **والشاشةُ تعرض `remedy`** — لا جملةٌ مسدودة");
      check(/JSON\.stringify\(\{\s*reason:\s*removeReason\s*\}\)/.test(ui),
        "ل١٠. وترسل سببَ السحب");
      //  **و`caseFlagNote` تُعرَض فعلاً** — كانت تُرسَل ولا يقرؤها أحد،
      //  فيبقى الإسقاطُ صامتاً وهو ما وُضعت لمنعه (أمسكه مراجعٌ مستقلّ).
      const edit = src("client/src/pages/EditPatient.tsx");
      check(/result\?\.caseFlagNote/.test(edit) && /toast\(\{[^}]*caseFlagNote/s.test(edit),
        "ل١١. **وشاشةُ تعديل المريض تعرض `caseFlagNote`** — لا إسقاطٌ صامت");
    }

    // ══ م. العلاجُ الطبيعي معزولٌ ══════════════════════════════════════
    console.log("\n── م. عزل العلاج الطبيعي ──");
    {
      const p = await mkPatient("م-فيزيو", "prosthetic");
      const c = await mkCase(p, "physiotherapy");
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [p]);
      //  حارسُ أوامر التصنيع والدفعات الموسومة **لا يُطبَّق على الفيزيو**
      //  (لا وسمَ له) — وأمرُ أطرافٍ على المريض لا يمنع سحبَ خيط الفيزيو.
      await mkOrder(p, "prosthetic", null);
      const del = await removeCase(p, "physiotherapy", S.admin);
      same("م١. سحبُ خيط العلاج الطبيعي لا يمسّه أمرُ أطراف", del.status, 200);
      same("م٢. ولا حالةَ فيزيو باقية",
        (await q(`SELECT 1 FROM patient_cases WHERE id=$1`, [c])).length, 0);
      const f = await flags(p);
      check(f.f === false, "م٣. وعَلَمُ الفيزيو أُطفئ", JSON.stringify(f));
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص سحب نوع الحالة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
