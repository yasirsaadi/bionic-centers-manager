// تصحيحُ سعر جهازٍ **بعد البيع** — حيّاً على Postgres وعلى النقطة نفسها.
// قاعدة محلّية: `npm run test:exam-price-correction`.
//
// ══ الواقعةُ التي بُني لها ═══════════════════════════════════════════════
// وقّع الطبيبُ معاينةَ طرفٍ بـ١,٧٠٠,٠٠٠ وهو يقصد ١,٧٥٠,٠٠٠. اشترى المريضُ
// وبدأ التصنيعُ، ثمّ اكتُشف الخطأ — فوجد الطبيبُ حقلَ السعر مقفلاً لأن
// المتابعة `converted`. فصُحّح الرقمُ من شاشة تعديل المريض العامّة: تحرّك
// `patients.total_cost` وحدَه، وبقيت المتابعةُ والحلقةُ وكلفةُ الخيط على
// الرقم الخطأ. **بابٌ مقفلٌ لم يمنع التصحيح — منع أن يقع في مكانٍ واحد.**
//
// ══ ما يحرسه هذا الملفّ ═════════════════════════════════════════════════
// (أ) **البيعُ وحدَه لم يعد يجمّد**: ما دام السعرُ سعرَ المعاينة يُصحَّح.
// (ب) **والقرارُ التجاريُّ الصريح سيّدُ نفسه**: المعاينةُ تُصحَّح ولا يُمَسّ.
// (ج) **وستّةُ مواضعَ تتحرّك معاً**: المتابعة · الحلقة · كلفةُ الخيط ·
//     مجموعُ المريض · قيدُ الدفتر · الحدث — ومعها النسخةُ والتدقيق.
// (د) **ولا دفعةَ تُعاد كتابتُها ولا أمرَ تصنيعٍ يُمَسّ.**
// (هـ) **وسقوطُ أيّ كتابةٍ يُرجِع الجميع** — ولا نصفَ تصحيح.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import { readFileSync } from "fs";

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

const PORT = 6853;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تصحيح-السعر-بعد-البيع";
const ADMIN = 9881, RECV = 9882, MGR = 9883, DOC = 9884, DOC2 = 9885;
const EXPERT = 9886, ACCT = 9887;
//  **وتُمحى كلُّها عند الانتهاء**: خبيرٌ يبقى في الفرع ١ يدخل قائمةَ خبراء
//  الفرع، فيكسر `test:manufacturing` الذي يؤكّد القائمةَ بأسمائها بالضبط.
const ALL_USERS = [ADMIN, RECV, MGR, DOC, DOC2, EXPERT, ACCT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  //  طبيبٌ آخر **بنفس الاختصاص** — ليُثبَت أنه لا يعيد كتابة توقيع زميله.
  doc2: {
    userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. الزميل", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {},
  },
  acct: {
    userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canAddPatients: true, canManageAccounting: true },
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
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
/**
 * يكتب `device_cost` مباشرةً على معاينةٍ موقّعة — الترِكرُ (٠٢٨) يرفض أيّ
 * `UPDATE` على `medical_exams` لم يفتح البابَ المراقَب صراحةً، فيُفتح هنا
 * تماماً كما توثّق CLAUDE.md — `BEGIN` + `SET LOCAL app.allow_exam_edit`
 * على معاملةٍ واحدة على نفس الاتصال.
 */
async function sealedDeviceCostWrite(examId: number, deviceCost: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.allow_exam_edit = 'on'`);
    await client.query(`UPDATE medical_exams SET device_cost=$2 WHERE id=$1`,
      [examId, deviceCost]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * ══ **السعرُ الابتدائيُّ صار خطوةً منفصلة عن التوقيع** ═══════════════════
 * الشاشةُ الطبّية لا ترسل `deviceCost` عند التوقيع بعد اليوم (القسمُ
 * 4.b/4.f في CLAUDE.md) — والملفُّ هذا يختبر **تصحيحَ** السعر لا نشأتَه.
 * فيُثبَّت السعرُ الابتدائيُّ هنا بلقطةٍ مباشرة على الصفَّين اللذين كانت
 * `ensureFollowupForSignedExam` تكتبهما معاً وقت التوقيع بالضبط
 * (`medical_exams.device_cost` و`post_exam_followups.approved_price` مع
 * `price_source='exam'` الذي لم يتغيّر) — بلا المرور بمسار `PATCH`
 * وتصنيفِه، وهو نفسُه موضوعُ الاختبار لاحقاً ولا يجوز أن يتداخل مع تثبيت
 * السعر الأوّل.
 */
async function signExam(patientId: number, session: any, opts: {
  caseType?: string; deviceCost?: number;
} = {}) {
  const ex = await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: opts.caseType ?? "prosthetic",
    diagnosis: "بتر تحت الركبة",
    prescription: {},
  });
  const price = opts.deviceCost ?? 1_500_000;
  if (ex.status < 300 && ex.body?.id) {
    await sealedDeviceCostWrite(ex.body.id, price);
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [ex.body.id, price]);
  }
  return ex;
}
async function followupsOf(patientId: number, session: any = S.admin) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, session);
  return Array.isArray(r.body) ? r.body : [];
}
const followupOf = async (p: number) => (await followupsOf(p))[0] ?? null;
const eventTypes = (f: any) => (f?.events ?? []).map((e: any) => e.eventType);
const examIdOf = async (patientId: number, caseType = "prosthetic") =>
  (await q<{ id: number }>(
    `SELECT id FROM medical_exams WHERE patient_id=$1 AND case_type=$2 ORDER BY id DESC LIMIT 1`,
    [patientId, caseType]))[0].id;
const editExam = (examId: number, session: any, body: any) =>
  http("PATCH", `/api/medical/exams/${examId}`, session,
    { caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {}, ...body });

/** لقطةُ المال كلِّه لمريض — كلُّ ما يجب أن يتحرّك معاً أو لا يتحرّك. */
async function money(patientId: number, caseType = "prosthetic") {
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [c] = await q(
    `SELECT cost::int AS cost FROM patient_cases WHERE patient_id=$1 AND case_type=$2`,
    [patientId, caseType]);
  const [e] = await q(
    `SELECT COALESCE(SUM(amount),0)::int AS sum, count(*)::int AS n
       FROM cost_entries WHERE patient_id=$1`, [patientId]);
  return { total: p?.total ?? 0, caseCost: c?.cost ?? 0, ledger: e.sum, entries: e.n };
}
/** حالةُ الحلقة وسعرُها — الجهازُ بعينه لا خيطُه. */
async function episodeRow(id: number) {
  const [r] = await q(
    `SELECT status, agreed_cost::int AS cost FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
}

/**
 * يبني مريضاً **بجهازٍ مباع فعلاً**: حلقةٌ تنتظر الفحص ⟶ معاينةٌ موقّعة
 * تطالبها ⟶ بيعٌ عبر النقطة القانونية ⟶ `in_manufacturing` وأمرُ تصنيع.
 * وهذا هو حالُ الإنتاج الذي وقعت فيه الواقعة، لا محاكاةٌ له.
 */
async function soldDevice(label: string, price: number) {
  const patientId = await mkPatient(label);
  const caseId = await mkCase(patientId);
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR,
  });
  await signExam(patientId, S.doc, { deviceCost: price });
  const f = await followupOf(patientId);
  const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
    { expertUserId: EXPERT });
  const examId = await examIdOf(patientId);
  return { patientId, caseId, episodeId: (ep as any).id ?? ep, examId, buy, followupId: f.id };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM audit_log WHERE entity_type='medical_exam' AND entity_id IN
             (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]"],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [DOC2, "doctor", "د. الزميل", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [ACCT, "accountant", "المحاسب", 1, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `epc_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══════════════════════════════════════════════════════════════════
    //  أ) **واقعةُ المالك بالضبط** — ١,٧٠٠,٠٠٠ ⟶ ١,٧٥٠,٠٠٠ بعد البيع.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ) واقعة المالك: تصحيحٌ بعد البيع وبدء التصنيع ──");
    {
      const d = await soldDevice("واقعة المالك", 1_700_000);
      same("١. (البيعُ اعتُمد وبدأ التصنيع)", d.buy.status, 200);
      const before = await money(d.patientId);
      same("٢. (الحالُ قبل التصحيح: حلقةٌ في التصنيع بسعرها)",
        [(await episodeRow(d.episodeId))?.status, (await episodeRow(d.episodeId))?.cost],
        ["in_manufacturing", 1_700_000]);
      same("   (ومجموعُ المريض وكلفةُ الخيط عليه)",
        [before.total, before.caseCost], [1_700_000, 1_700_000]);

      //  **ولا سببَ ⟶ ٤٠٠**: مالٌ يتحرّك بعد البيع لا يقع بلا رواية.
      const noReason = await editExam(d.examId, S.doc, { deviceCost: 1_750_000 });
      same("٣. **بلا سببٍ مكتوب يُردّ ٤٠٠**", noReason.status, 400);
      same("   **ولا شيءَ تحرّك** — لا نسخةَ ولا دينار",
        [(await q(`SELECT version FROM medical_exams WHERE id=$1`, [d.examId]))[0].version,
          JSON.stringify(await money(d.patientId))],
        [1, JSON.stringify(before)]);

      const r = await editExam(d.examId, S.doc, {
        deviceCost: 1_750_000, priceCorrectionReason: "خطأ في إدخال السعر أثناء المعاينة",
      });
      same("٤. **التصحيحُ بعد البيع يُقبل الآن** — لا ٤٠٩", r.status, 200);
      same("٥. **والمعاينةُ تتقدّم نسخةً** — والأصلُ محفوظ",
        [r.body?.version,
          (await q(`SELECT count(*)::int AS n FROM medical_exam_revisions WHERE exam_id=$1`,
            [d.examId]))[0].n],
        [2, 1]);
      same("٦. **وسعرُ المعاينة صار المصحَّح**",
        (await q(`SELECT device_cost::int AS c FROM medical_exams WHERE id=$1`,
          [d.examId]))[0].c, 1_750_000);

      const f = await followupOf(d.patientId);
      same("٧. **والسعرُ المعتمد تبعه** — ومصدرُه ما زال المعاينة",
        [f?.approvedPrice, f?.priceSource], [1_750_000, "exam"]);
      same("٨. **وسعرُ الحلقة تبعه — وحالتُها لم تُمَسّ**",
        [(await episodeRow(d.episodeId))?.cost, (await episodeRow(d.episodeId))?.status],
        [1_750_000, "in_manufacturing"]);

      const after = await money(d.patientId);
      same("٩. **ومجموعُ المريض وكلفةُ الخيط زادا بالفرق وحده**",
        [after.total, after.caseCost], [1_750_000, 1_750_000]);
      const [entry] = await q(
        `SELECT amount::int AS amount, source, device_episode_id::int AS ep, case_id::int AS cs, notes
           FROM cost_entries WHERE patient_id=$1 AND source='exam_price_correction'`, [d.patientId]);
      same("١٠. **وقيدٌ واحدٌ مؤرَّخٌ بالفرق — موسومٌ بالجهاز وبالقسم**",
        [entry?.amount, entry?.source, entry?.ep, entry?.cs],
        [50_000, "exam_price_correction", d.episodeId, d.caseId]);
      check(String(entry?.notes ?? "").includes("خطأ في إدخال السعر"),
        "١١. **والقيدُ يحمل السببَ كما كتبه الطبيب**", String(entry?.notes));
      same("١٢. **والثابتُ محفوظ**: مجموعُ قيود المريض = كلفتُه",
        [after.ledger, after.total], [1_750_000, 1_750_000]);
      same("   (والقيدُ الأصليُّ لم يُعَد كتابتُه ولا حُذف)",
        (await q(`SELECT count(*)::int AS n FROM cost_entries
                   WHERE patient_id=$1 AND source='assign_manufacturing' AND amount=1700000`,
          [d.patientId]))[0].n, 1);

      const ev = (f?.events ?? []).find((e: any) => e.eventType === "exam_price_corrected");
      same("١٣. **وحدثٌ واحدٌ يحمل كلَّ ما يحتاجه المراجع بعد سنة**",
        [ev?.payload?.previousPrice, ev?.payload?.finalPrice, ev?.payload?.delta,
          ev?.payload?.afterSale, ev?.payload?.correctionReason, ev?.payload?.setByName],
        [1_700_000, 1_750_000, 50_000, true, "خطأ في إدخال السعر أثناء المعاينة", "د. المعاين"]);
      same("١٤. **وسطرُ تدقيقٍ للمعاينة مكتوب**",
        (await q(`SELECT count(*)::int AS n FROM audit_log
                   WHERE entity_type='medical_exam' AND entity_id=$1 AND action='update'`,
          [d.examId]))[0].n, 1);

      //  ══ وما **لا** يتغيّر — وهو نصفُ العقد ══════════════════════════
      same("١٥. **ولا دفعةَ أُنشئت ولا عُدّلت ولا حُذفت**",
        (await q(`SELECT count(*)::int AS n FROM payments WHERE patient_id=$1`, [d.patientId]))[0].n, 0);
      const [wo] = await q(
        `SELECT count(*)::int AS n, MIN(status) AS status, MIN(current_stage) AS stage,
                MIN(expert_user_id)::int AS expert, bool_or(expected_delivery_date IS NOT NULL) AS dated
           FROM prosthetic_work_orders WHERE patient_id=$1`, [d.patientId]);
      same("١٦. **وأمرُ التصنيع كما هو** — أمرٌ واحد، بمرحلته وخبيره وبلا موعدٍ جديد",
        [wo.n, wo.status, wo.expert, wo.dated], [1, "active", EXPERT, false]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب) **تصحيحٌ نازل** — الفرقُ سالبٌ ويُقيَّد سالباً.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب) تصحيحٌ نازل بعد البيع ──");
    {
      const d = await soldDevice("تصحيحٌ نازل", 2_000_000);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 1_800_000, priceCorrectionReason: "السعر المتّفق أقلّ",
      });
      same("١٧. **النزولُ يُقبل كالصعود**", r.status, 200);
      const after = await money(d.patientId);
      same("١٨. **والفرقُ السالبُ يُنزَل على الثلاثة**",
        [(await followupOf(d.patientId))?.approvedPrice,
          (await episodeRow(d.episodeId))?.cost, after.total, after.caseCost],
        [1_800_000, 1_800_000, 1_800_000, 1_800_000]);
      same("١٩. **وقيدٌ سالبٌ مؤرَّخ** — النقصانُ حدثٌ ماليٌّ حقيقيّ",
        (await q(`SELECT amount::int AS a FROM cost_entries
                   WHERE patient_id=$1 AND source='exam_price_correction'`, [d.patientId]))[0]?.a,
        -200_000);
      same("٢٠. **والثابتُ محفوظ**", after.ledger, after.total);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج) **جهازٌ سُلِّم** — يُصحَّح ولا يعود إلى المصنع.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج) جهازٌ مسلَّم ──");
    {
      const d = await soldDevice("جهازٌ مسلَّم", 3_000_000);
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW() WHERE id=$1`,
        [d.episodeId]);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 3_100_000, priceCorrectionReason: "فرقُ مقاس",
      });
      same("٢١. **المسلَّمُ يُصحَّح سعرُه**", r.status, 200);
      same("٢٢. **ويبقى مسلَّماً** — لا يُعاد إلى التصنيع",
        [(await episodeRow(d.episodeId))?.status, (await episodeRow(d.episodeId))?.cost],
        ["delivered", 3_100_000]);
      const after = await money(d.patientId);
      same("٢٣. (والمالُ تبعه والثابتُ محفوظ)",
        [after.total, after.ledger], [3_100_000, 3_100_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د) **قرارٌ تجاريٌّ صريح** — المعاينةُ تُصحَّح ولا يُمَسّ السعر.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د) سعرٌ حدّده المدير ──");
    {
      const patientId = await mkPatient("قرارُ المدير");
      await mkCase(patientId);
      const ep = await episodes.startDeviceEpisode({
        patientId, serviceType: "prosthetic", createdBy: MGR,
      });
      await signExam(patientId, S.doc, { deviceCost: 1_700_000 });
      const f = await followupOf(patientId);
      const set = await http("POST", `/api/followups/${f.id}/commercial-price`, S.mgr,
        { finalPrice: 1_600_000, reason: "اتفاق مع المريض" });
      same("٢٤. (المديرُ حدّد ١,٦٠٠,٠٠٠)",
        [set.status, set.body?.followup?.priceSource], [200, "manager_set"]);
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { expertUserId: EXPERT });
      const examId = await examIdOf(patientId);
      const before = await money(patientId);

      const r = await editExam(examId, S.doc, {
        deviceCost: 1_750_000, priceCorrectionReason: "تصحيحُ رقمي",
      });
      same("٢٥. **التصحيحُ يُقبل على المعاينة**", r.status, 200);
      same("٢٦. **وسعرُ المعاينة صار ١,٧٥٠,٠٠٠**",
        (await q(`SELECT device_cost::int AS c FROM medical_exams WHERE id=$1`, [examId]))[0].c,
        1_750_000);
      same("٢٧. **والسعرُ التجاريُّ بقي ١,٦٠٠,٠٠٠** — سلطتُه مستقلّة",
        [(await followupOf(patientId))?.approvedPrice,
          (await followupOf(patientId))?.priceSource],
        [1_600_000, "manager_set"]);
      same("٢٨. **ولا دينارَ تحرّك ولا حلقةَ تغيّرت**",
        [JSON.stringify(await money(patientId)),
          (await episodeRow((ep as any).id ?? ep))?.cost],
        [JSON.stringify(before), 1_600_000]);
      check(String(r.body?.priceNote ?? "").includes(
        "تم تصحيح سعر المعاينة، لكن السعر التجاري المعتمد بقي كما هو لأنه عُدّل بقرار تجاري مستقل"),
      "٢٩. **والعبارةُ تقول ما وقع وما لم يقع** — فلا يُظنّ أن التجاريَّ تحرّك",
      String(r.body?.priceNote));
      check(!eventTypes(await followupOf(patientId)).includes("exam_price_corrected"),
        "٣٠. **ولا حدثَ تصحيحِ سعرٍ كُتب** — لا سجلَّ لِما لم يقع على المال", "");
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ) **خصمٌ اعتُمد** — كالقرار التجاري تماماً.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ) خصمٌ معتمَد ──");
    {
      const d = await soldDevice("خصمٌ معتمَد", 2_500_000);
      //  الخصمُ المعتمَد يكتب `approved_change` (لا `discount_applied` —
      //  ذاك اسمُ الحدث لا اسمُ المصدر، وقيدُ القاعدة يقبل الأربعةَ وحدها).
      await q(`UPDATE post_exam_followups SET price_source='approved_change',
                 approved_price=2000000 WHERE id=$1`, [d.followupId]);
      const before = await money(d.patientId);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 2_600_000, priceCorrectionReason: "تصحيح",
      });
      same("٣١. **يُقبل على المعاينة**", r.status, 200);
      same("٣٢. **ولا يرفع الخصمَ المعتمَد**",
        [(await followupOf(d.patientId))?.approvedPrice, JSON.stringify(await money(d.patientId))],
        [2_000_000, JSON.stringify(before)]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و) **طلبُ خصمٍ معلَّقٌ على هذا الجهاز ⟶ ٤٠٩** — لا يُلغى بصمت.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و) طلبُ خصمٍ معلَّق ──");
    const mkPending = async (patientId: number, ref: string, price: number) =>
      await q(`INSERT INTO service_discount_requests
                 (patient_id, branch_id, department, context_ref, original_price,
                  proposed_final_price, discount_amount, discount_percentage,
                  is_free, reason, status, payload, requested_by)
               VALUES ($1,1,'prosthetic',$2,$3,$4,$5,10,false,'خصم','pending','{}'::jsonb,$6)`,
      [patientId, ref, price, price - price * 0.1, price * 0.1, RECV]);
    {
      const d = await soldDevice("خصمٌ معلَّق", 4_000_000);
      await mkPending(d.patientId, `episode:${d.episodeId}`, 4_000_000);
      const before = await money(d.patientId);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 4_400_000, priceCorrectionReason: "تصحيح",
      });
      same("٣٣. **المعلَّقُ يمنع التصحيح ٤٠٩**", r.status, 409);
      same("٣٤. **ولا شيءَ تحرّك إطلاقاً** — لا نسخةَ ولا سعرَ ولا دينار",
        [(await q(`SELECT version, device_cost::int AS c FROM medical_exams WHERE id=$1`,
          [d.examId]))[0].version,
        (await followupOf(d.patientId))?.approvedPrice,
        JSON.stringify(await money(d.patientId))],
        [1, 4_000_000, JSON.stringify(before)]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز) **خصمٌ معلَّقٌ على جهازٍ آخر لا يمنع** — الهويّةُ بعينها.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز) معلَّقٌ على جهازٍ آخر ──");
    {
      const d = await soldDevice("معلَّقٌ لجهازٍ آخر", 1_000_000);
      //  مرجعٌ لحلقةٍ لا تخصّ هذا الجهاز — مريضٌ عائدٌ له أكثر من طلب.
      await mkPending(d.patientId, `episode:${d.episodeId + 100000}`, 900_000);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 1_100_000, priceCorrectionReason: "تصحيح",
      });
      same("٣٥. **التصحيحُ يمضي** — خصمُ جهازٍ آخر لا يجمّد هذا", r.status, 200);
      same("٣٦. (والمالُ تبعه)",
        [(await followupOf(d.patientId))?.approvedPrice, (await money(d.patientId)).total],
        [1_100_000, 1_100_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح) **مريضٌ بجهازين** — يتحرّك المقصودُ وحده.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح) مريضٌ بجهازين ──");
    {
      const d = await soldDevice("جهازان", 5_000_000);
      //  جهازٌ ثانٍ على الخيط نفسه: يُسلَّم الأول ثم يُطلَب الثاني ويُباع.
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW() WHERE id=$1`,
        [d.episodeId]);
      await q(`UPDATE prosthetic_work_orders SET status='completed' WHERE patient_id=$1`,
        [d.patientId]);
      const ep2 = await episodes.startDeviceEpisode({
        patientId: d.patientId, serviceType: "prosthetic", createdBy: MGR,
      });
      const ep2Id = (ep2 as any).id ?? ep2;
      await signExam(d.patientId, S.doc, { deviceCost: 900_000 });
      const all = await followupsOf(d.patientId);
      const f2 = all.find((x: any) => Number(x.deviceEpisodeId) === Number(ep2Id));
      await http("POST", `/api/followups/${f2.id}/confirm-purchase`, S.recv,
        { expertUserId: EXPERT });
      const exam2 = await examIdOf(d.patientId);
      same("٣٧. (جهازان مباعان بسعريهما)",
        [(await episodeRow(d.episodeId))?.cost, (await episodeRow(ep2Id))?.cost],
        [5_000_000, 900_000]);
      const totalBefore = (await money(d.patientId)).total;

      const r = await editExam(exam2, S.doc, {
        deviceCost: 970_000, priceCorrectionReason: "تصحيحُ الثاني",
      });
      same("٣٨. **تصحيحُ الثاني يُقبل**", r.status, 200);
      same("٣٩. **ويتحرّك هو وحدَه — والأولُ لم يُمَسّ**",
        [(await episodeRow(ep2Id))?.cost, (await episodeRow(d.episodeId))?.cost],
        [970_000, 5_000_000]);
      same("٤٠. **والمجموعُ زاد بفرقِ الثاني وحده**",
        (await money(d.patientId)).total, totalBefore + 70_000);
      same("٤١. **ومتابعةُ الأول لم تتحرّك**",
        (await followupsOf(d.patientId)).find((x: any) =>
          Number(x.deviceEpisodeId) === Number(d.episodeId))?.approvedPrice,
        5_000_000);
      same("٤٢. **وقيدُ التصحيح موسومٌ بحلقة الثاني**",
        (await q(`SELECT device_episode_id::int AS ep FROM cost_entries
                   WHERE patient_id=$1 AND source='exam_price_correction'`, [d.patientId]))
          .map((x: any) => x.ep), [ep2Id]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط) **سباقٌ حقيقيّ** — الحالةُ تتغيّر تحت القفل ⟶ ٤٠٩ ولا نصفَ كتابة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط) انحرافٌ تحت القفل ──");
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    {
      const d = await soldDevice("سباقٌ تحت القفل", 6_000_000);
      const before = await money(d.patientId);
      const holder = await pool.connect();
      let patch: Promise<any>;
      try {
        await holder.query("BEGIN");
        await holder.query(`SELECT id FROM post_exam_followups WHERE id=$1 FOR UPDATE`,
          [d.followupId]);
        await holder.query(
          `UPDATE post_exam_followups SET price_source='manager_set' WHERE id=$1`, [d.followupId]);
        patch = editExam(d.examId, S.doc, {
          deviceCost: 6_500_000, priceCorrectionReason: "تصحيح",
        });
        await sleep(400);
        await holder.query("COMMIT");
      } finally {
        holder.release();
      }
      same("٤٣. **الانحرافُ تحت القفل يُردّ ٤٠٩**", (await patch).status, 409);
      same("٤٤. **ولا نسخةَ ولا سعرَ ولا دينار** — المعاملةُ رجعت كلُّها",
        [(await q(`SELECT version, device_cost::int AS c FROM medical_exams WHERE id=$1`,
          [d.examId]))[0].version,
        (await q(`SELECT count(*)::int AS n FROM medical_exam_revisions WHERE exam_id=$1`,
          [d.examId]))[0].n,
        (await episodeRow(d.episodeId))?.cost,
        JSON.stringify(await money(d.patientId))],
        [1, 0, 6_000_000, JSON.stringify(before)]);
      same("٤٥. **ولا سطرَ تدقيقٍ كُتب**",
        (await q(`SELECT count(*)::int AS n FROM audit_log
                   WHERE entity_type='medical_exam' AND entity_id=$1 AND action='update'`,
          [d.examId]))[0].n, 0);
    }

    //  **وملفٌّ رقماه مختلفان أصلاً لا يُصحَّح** — يُردّ ليراه إنسان.
    {
      const d = await soldDevice("رقمان مختلفان", 2_200_000);
      await q(`UPDATE patient_device_episodes SET agreed_cost=2100000 WHERE id=$1`, [d.episodeId]);
      const before = await money(d.patientId);
      const r = await editExam(d.examId, S.doc, {
        deviceCost: 2_300_000, priceCorrectionReason: "تصحيح",
      });
      same("٤٦. **اختلافُ سعر المتابعة عن سعر الحلقة يُردّ ٤٠٩**", r.status, 409);
      check(String(r.body?.error ?? "").includes("مراجعة إدارية"),
        "٤٧. **والرسالةُ تطلب مراجعةً إدارية** — لا تخمينَ فوق خلل",
        String(r.body?.error));
      same("٤٨. (ولا شيءَ تحرّك)", JSON.stringify(await money(d.patientId)),
        JSON.stringify(before));
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي) **مَن يملك التصحيح** — نفسُ طرفَي «تعديل» حرفياً، بلا توسيع.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي) الصلاحية ──");
    {
      const d = await soldDevice("الصلاحية", 1_200_000);
      const body = { deviceCost: 1_300_000, priceCorrectionReason: "تصحيح" };
      same("٤٩. **طبيبٌ آخر بنفس الاختصاص يُردّ ٤٠٣** — لا يعيد كتابة توقيع زميله",
        (await editExam(d.examId, S.doc2, body)).status, 403);
      same("٥٠. **والاستقبالُ يُردّ**", (await editExam(d.examId, S.recv, body)).status, 403);
      same("٥١. **والمحاسبُ يُردّ**", (await editExam(d.examId, S.acct, body)).status, 403);
      same("٥٢. **والخبيرُ يُردّ**", (await editExam(d.examId, S.expert, body)).status, 403);
      same("٥٣. **ولا دينارَ تحرّك بأيٍّ منها**",
        [(await money(d.patientId)).total, (await episodeRow(d.episodeId))?.cost],
        [1_200_000, 1_200_000]);
      same("٥٤. **ومديرُ الفرع المسؤول يمرّ**",
        (await editExam(d.examId, S.mgr, body)).status, 200);
      same("٥٥. (والمالُ تبعه)",
        [(await money(d.patientId)).total, (await episodeRow(d.episodeId))?.cost],
        [1_300_000, 1_300_000]);
      const d2 = await soldDevice("صلاحيةُ المسؤول", 800_000);
      same("٥٦. **والمسؤولُ العامّ يمرّ**",
        (await editExam(d2.examId, S.admin, {
          deviceCost: 850_000, priceCorrectionReason: "تصحيح",
        })).status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك) **سقوطُ كتابةٍ ماليّة ⟶ يرجع كلُّ شيء** — ولا نصفَ تصحيح.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك) سقوطُ كتابةٍ ماليّة ──");
    {
      const d = await soldDevice("سقوطُ القيد", 7_000_000);
      const before = await money(d.patientId);
      await q(`CREATE OR REPLACE FUNCTION epc_block_entry() RETURNS trigger AS $$
                 BEGIN RAISE EXCEPTION 'epc_test: ledger insert blocked'; END $$ LANGUAGE plpgsql`);
      await q(`DROP TRIGGER IF EXISTS epc_block_entry ON cost_entries`);
      await q(`CREATE TRIGGER epc_block_entry BEFORE INSERT ON cost_entries
                 FOR EACH ROW WHEN (NEW.source = 'exam_price_correction')
                 EXECUTE FUNCTION epc_block_entry()`);
      let r: any;
      try {
        r = await editExam(d.examId, S.doc, {
          deviceCost: 7_500_000, priceCorrectionReason: "تصحيح",
        });
      } finally {
        await q(`DROP TRIGGER IF EXISTS epc_block_entry ON cost_entries`);
        await q(`DROP FUNCTION IF EXISTS epc_block_entry()`);
      }
      check(r.status >= 400, "٥٧. **سقوطُ قيدِ الدفتر يُفشل الطلبَ كلَّه**", String(r.status));
      same("٥٨. **ولا نسخةَ معاينةٍ حُفظت** — الذرّةُ رجعت كاملة",
        [(await q(`SELECT version, device_cost::int AS c FROM medical_exams WHERE id=$1`,
          [d.examId]))[0].version,
        (await q(`SELECT count(*)::int AS n FROM medical_exam_revisions WHERE exam_id=$1`,
          [d.examId]))[0].n],
        [1, 0]);
      same("٥٩. **ولا سعرَ متابعةٍ ولا سعرَ حلقةٍ ولا مجموعَ مريضٍ تحرّك**",
        [(await followupOf(d.patientId))?.approvedPrice,
          (await episodeRow(d.episodeId))?.cost,
          JSON.stringify(await money(d.patientId))],
        [7_000_000, 7_000_000, JSON.stringify(before)]);
      check(!eventTypes(await followupOf(d.patientId)).includes("exam_price_corrected"),
        "٦٠. **ولا حدثَ تصحيحٍ كُتب**", "");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ل) **عقدُ الشاشة** — بلا قاعدة بيانات: ما يقوله الملفُّ المصدريّ.
    // ══════════════════════════════════════════════════════════════════
    //  ══ **تعديلٌ جوهريّ (مرحلةُ «معاينةٌ طبّيةٌ محضة»)** ═══════════════════
    //  كانت هذه النافذةُ تحمل نافذةَ «تصحيح سعر بعد البيع» كاملةً — قفلَها
    //  وتحذيرَها وحقلَ سببها. **وقد أُزيلت بالكامل** (القسم 4.b/4.f في
    //  CLAUDE.md، ضمن إزالة كلّ مسؤوليةٍ تجارية عن الطبيب): لا حقلَ سعرٍ في
    //  نموذج المعاينة إطلاقاً بعد اليوم، فلا معنى لِـ«تصحيحه» من هناك.
    //
    //  **والآليةُ الخادميةُ التي تختبرها الأقسامُ أ–ك أعلاه لم تُمَسّ** —
    //  هي «المسارُ القانونيُّ الآمن» الذي تحتفظ به CLAUDE.md صراحةً لمرحلة
    //  الاستعلامات القادمة (`PATCH /api/medical/exams/:id` ما زال يقبل
    //  `deviceCost`/`priceCorrectionReason` صراحةً حين يُرسَلان، ومنطقُ
    //  `classifyExamPriceChange`/`applyExamPriceCorrectionAfterSale` كما هو
    //  بالضبط) — وهذا القسمُ وحده، الذي كان يفحص واجهةً حذفتها هذه المرحلة،
    //  صار يفحص **غيابها**.
    console.log("\n── ل) عقد الشاشة ──");
    {
      const src = readFileSync("client/src/components/medical/NewExamDialog.tsx", "utf8");
      const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
      for (const gone of [
        "priceLock", "priceWarning", "soldAlready", "discountPending", "confirmPrice",
        "priceCorrectionReason", "afterSaleCorrection", "activeFollowup", "followupRows",
      ]) {
        check(!code.includes(gone),
          `٦١. **ولا أثرَ لـ\`${gone}\`** — لا قفلَ سعرٍ ولا تصحيحَ بعد بيعٍ في النافذة`, gone);
      }
      for (const gone of [
        "تم البيع وبدأت إجراءات التصنيع", "السعر التجاري الحالي ناتج عن قرار مستقل",
        "تصحيح سعر بعد البيع", "سبب التصحيح",
      ]) {
        check(!code.includes(gone),
          `٦٢. **ولا عبارةَ «${gone}»** — نافذةُ التصحيح بابُها الآن نقطةُ \`PATCH\` وحدها`,
          gone);
      }
      //  **والبابُ الخادميُّ الذي كانت تنادِيه هذه النافذةُ لم يُغلَق ولم
      //  يُعَد بناؤه** — يبقى يقبل `deviceCost`/`priceCorrectionReason`
      //  صراحةً حين يصلانه من أيّ عميلٍ آخر، تماماً كما أثبتته الأقسامُ
      //  أ–ك أعلاه عبر النقطة الحقيقية مباشرةً.
      const routes = readFileSync("server/medical/routes.ts", "utf8");
      check(routes.includes("classifyExamPriceChange") && routes.includes("priceCorrectionReason"),
        "٦٣. **والمنطقُ الخادميُّ باقٍ بلا إعادة بناء** — جاهزٌ لمرحلةٍ قادمة");
      //  **وهذا لم يتغيّر**: التوقيعُ نفسُه ما زال يُحدِّث بطاقةَ المريض
      //  وقائمةَ حلقاته بعد النجاح — لا علاقةَ له بحقل السعر المحذوف.
      check(/device-episodes/.test(code) && /\/api\/followups\/patient\//.test(code),
        "٦٤. **وبعد النجاح تُحدَّث المتابعةُ والحلقة** — بلا تحديثٍ يدويّ", "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
