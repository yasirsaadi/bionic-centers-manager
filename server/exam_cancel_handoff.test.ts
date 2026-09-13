// **رفضُ إلغاء المعاينة بعد وقوع العملية صار يُسلِّم إلى بابه** —
// «تصحيح / إلغاء العملية». `npm run test:exam-cancel-handoff`.
//
// ══ ما يُختبَر هنا — الانتقالُ وحده ═══════════════════════════════════════
// إلغاءُ المعاينة **لا يتراجع عن مالٍ ولا عن تصنيع** (`cancel_exam.ts`)، فحين
// يقع بيعٌ أو يُفتَح أمرُ تصنيع يُردّ ٤٠٩ برسالته. **والرفضُ نفسُه لم يتغيّر
// بحرف** — الحُرّاسُ هم هم، والرسالةُ هي هي، وصفرُ الكتابة كما كان.
//
// الذي تغيّر: الردُّ صار يحمل **رمزاً آلياً** بجانب الرسالة، فتفتح الشاشةُ
// **لمن يملكه** النافذةَ القائمة — ووضعُ «إلغاء العملية بالكامل» فيها يعكس
// البيعَ أوّلاً **ثمّ يسحب المعاينةَ بشاهدة ٠٦١ نفسِها**
// (`admin_reversal/store.ts` ⟶ `writeExamCancellation`)، فيؤدّي ما أراده
// الضاغطُ وزيادةً، بالترتيب الآمن.
//
// **ولا صلاحيةَ تغيّرت**: `mayReverse` في `admin_reversal/routes.ts` وحدها
// تقرّر مَن يفتح ذلك الباب، ولم تُمَسّ بحرف — والرمزُ يقول «لهذا الرفضِ
// مسارٌ» لا «أنت تملكه». وطبيبٌ عاديّ يقرأ الرسالةَ كما اليوم بالضبط.
//
// يُشغَّل على Postgres محلّي: DATABASE_URL=... npx tsx server/exam_cancel_handoff.test.ts

import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import { registerRoutes } from "./routes";
import { EXAM_CANCEL_OPERATION_EXISTS } from "@shared/medical";

const PORT = 6957;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تسليم-الإلغاء";
const ADMIN = 99560, RECV = 99561, DOC = 99562, EXPERT = 99563, BM1 = 99564, BM2 = 99565;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** الرسالةُ كما هي في `cancel_exam.ts` — تُطابَق حرفياً كي لا تتغيّر ضمناً. */
const SOLD_TEXT =
  "لا يمكن إلغاء هذه المعاينة بعد تنفيذ الخدمة المرتبطة بها."
  + " يجب إلغاء العملية التجارية/التصنيع من مسارها أولاً.";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (cond) console.log(`✅  ${msg}`);
  else { failures++; console.log(`❌ FAIL  ${msg}${detail ? `\n      ${detail}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(expected);
  check(g === e, msg, g === e ? "" : `expected: ${e}\n      got:      ${g}`);
}

const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
const S = {
  admin: { userId: ADMIN, userName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessible: [1, 2], permissions: perms },
  recv: { userId: RECV, userName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessible: [1], permissions: perms },
  doc: { userId: DOC, userName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessible: [1], permissions: perms },
  bm1: { userId: BM1, userName: "مدير بغداد", branchId: 1, isAdmin: false, role: "branch_manager", accessible: [1], permissions: perms },
  bm2: { userId: BM2, userName: "مدير ذي قار", branchId: 2, isAdmin: false, role: "branch_manager", accessible: [2], permissions: perms },
};
type Svc = "prosthetic" | "medical_support";

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
async function mkPatient(label: string, svc: Svc) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', $4, 1,$3,$5,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, svc === "prosthetic", svc === "medical_support" ? "مسند ركبة" : null,
      svc === "medical_support"]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,$2,0,'manual','active')`, [r[0].id, svc]);
  return r[0].id;
}
async function openEpisode(patientId: number, svc: Svc) {
  const r = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
    serviceType: svc, servicePath: "exam",
  });
  if (r.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function signExam(patientId: number, svc: Svc, episodeId: number) {
  const r = await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), caseType: svc, diagnosis: `معاينة ${svc}`,
    prescription: {}, deviceEpisodeId: episodeId,
  });
  if (r.status >= 300) throw new Error(`فشل التوقيع: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function followupOfExam(examId: number) {
  return (await q(`SELECT id, status, converted_work_order_id FROM post_exam_followups
                    WHERE medical_exam_id=$1`, [examId]))[0];
}
async function sell(followupId: number, price = 1_000_000) {
  const r = await http("POST", `/api/followups/${followupId}/complete-sale`, S.recv,
    { originalPrice: price, discountAmount: 0, expertUserId: EXPERT });
  if (r.status >= 300) throw new Error(`فشل البيع: ${r.status} ${JSON.stringify(r.body)}`);
}
async function cancel(examId: number, session: any, reason = "إلغاءٌ تجريبي") {
  return await http("POST", `/api/medical/exams/${examId}/cancel`, session, { reason });
}
async function isCancelled(examId: number) {
  return (await q(`SELECT 1 FROM medical_exam_cancellations WHERE exam_id=$1`, [examId])).length > 0;
}
async function auditRows(examId: number) {
  return Number((await q<{ n: number }>(
    `SELECT count(*)::int n FROM audit_log WHERE entity_type='medical_exam' AND entity_id=$1`,
    [examId]))[0].n);
}
/** بصمةُ كلّ ما قد يلمسه إلغاءٌ أو مال — «صفرُ كتابة» يُقاس لا يُدّعى. */
async function snapshot(patientId: number) {
  const ep = await q(`SELECT id,status,agreed_cost FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const fu = await q(`SELECT id,status,converted_work_order_id,approved_price FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const wo = await q(`SELECT id,status,purpose FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const ce = await q(`SELECT id,amount,source FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const pay = await q(`SELECT id,amount FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const pt = await q(`SELECT total_cost FROM patients WHERE id=$1`, [patientId]);
  const can = await q(`SELECT exam_id FROM medical_exam_cancellations
                        WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id=$1) ORDER BY exam_id`, [patientId]);
  return JSON.stringify({ ep, fu, wo, ce, pay, pt, can });
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const stmt of [
    `DELETE FROM audit_log WHERE user_id = ANY(ARRAY[${ADMIN},${RECV},${DOC},${BM1},${BM2}])`,
    `DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    `DELETE FROM patient_code_aliases a WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`,
  ]) { try { await q(stmt); } catch { /* جدولٌ غيرُ موجودٍ في هذه النسخة */ } }
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec, br] of [
    [ADMIN, "admin", "المسؤول", "[]", 1],
    [RECV, "reception", "استعلامات", "[]", 1],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]', 1],
    [EXPERT, "prosthetics_expert", "الخبير", "[]", 1],
    [BM1, "branch_manager", "مدير بغداد", "[]", 1],
    [BM2, "branch_manager", "مدير ذي قار", "[]", 2],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$6,$7::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `ech_u${id}`, name, role, spec, br, JSON.stringify([br])]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw
      ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));

  try {
    // كلُّ ما يحتاجه القسمان «د» و«هـ» يُبنى مرّةً في حلقة الاختصاصات.
    const sold: Record<string, { p: number; exam: number; fu: number; ep: number }> = {};

    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      console.log(`\n══════════ ${svc} ══════════`);

      // ══ أ. الرفضُ بعد البيع — الرسالةُ كما هي، ومعها الرمز، وصفرُ كتابة ══
      console.log("\n── أ. بعد البيع: رسالةٌ كما كانت + رمزٌ للمسار ──");
      {
        const p = await mkPatient(`أ-${svc}`, svc);
        const ep = await openEpisode(p, svc);
        const exam = await signExam(p, svc, ep);
        const fu = Number((await followupOfExam(exam)).id);
        await sell(fu);
        same("١. الإعدادُ: بيعٌ تمّ والحلقةُ في التصنيع",
          [(await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [ep]))[0].status,
            (await followupOfExam(exam)).status],
          ["in_manufacturing", "converted"]);

        const before = await snapshot(p);
        const auditBefore = await auditRows(exam);
        const r = await cancel(exam, S.admin);
        same("٢. **الرفضُ ٤٠٩ كما كان** — إلغاءُ المعاينة لا يتراجع عن بيع", r.status, 409);
        same("٣. **والرسالةُ العربية لم تتغيّر بحرف**", r.body?.error, SOLD_TEXT);
        same("٤. **ومعها الرمز** — فتعرف الشاشةُ أن لهذا الرفضِ باباً آخر",
          r.body?.code, EXAM_CANCEL_OPERATION_EXISTS);
        same("٥. **صفرُ كتابة**: لا شاهدةَ إلغاء", await isCancelled(exam), false);
        same("٦. ولا سطرَ تدقيق", await auditRows(exam), auditBefore);
        same("٧. **ولا دينارَ تحرّك** — البصمةُ مطابقةٌ بايتاً (حلقات · متابعات · أوامر · قيود · دفعات · مجموع)",
          await snapshot(p), before);
        sold[svc] = { p, exam, fu, ep };
      }

      // ══ ب. الموضعُ الثاني: أمرُ تصنيعٍ قائمٌ مهما قالت الحالة ══════════
      console.log("\n── ب. أمرُ تصنيعٍ قائم (الحارسُ الثاني) ──");
      {
        const p = await mkPatient(`ب-${svc}`, svc);
        const ep = await openEpisode(p, svc);
        const exam = await signExam(p, svc, ep);
        const fu = Number((await followupOfExam(exam)).id);
        await sell(fu);
        //  فِكستشرٌ متعمَّد: الحالةُ لقطةٌ قد تتأخّر، والأمرُ واقعةٌ لا تُنكَر —
        //  فيُعاد ضبطُ الحالة وحدَها ليُختبَر الحارسُ الثاني بعينه.
        await q(`UPDATE patient_device_episodes SET status='examined' WHERE id=$1`, [ep]);
        const r = await cancel(exam, S.admin);
        same("٨. أمرُ البناء وحدَه يكفي للرفض", r.status, 409);
        same("٩. **وبالرمز نفسِه** — الحارسان لا يفترقان في كلامهما",
          [r.body?.error, r.body?.code], [SOLD_TEXT, EXAM_CANCEL_OPERATION_EXISTS]);
        same("١٠. وصفرُ شاهدة", await isCancelled(exam), false);
      }
    }

    // ══ ج. الرمزُ للرفضِ الذي له بابٌ وحدَه — لا رايةٌ عامّة ═══════════════
    console.log("\n── ج. بقيّةُ الرفوض تصل بلا رمز ──");
    {
      const p = await mkPatient("ج", "prosthetic");
      const ep = await openEpisode(p, "prosthetic");
      const exam = await signExam(p, "prosthetic", ep);

      const empty = await cancel(exam, S.admin, "   ");
      same("١١. سببٌ فارغ ⟵ ٤٠٠ **بلا رمز** — لا بابَ لهذا الرفض",
        [empty.status, empty.body?.code ?? null], [400, null]);

      const ok = await cancel(exam, S.admin);
      same("١٢. ومعاينةٌ بلا بيعٍ تُلغى كما كانت تماماً", ok.status, 200);
      same("١٣. وشاهدتُها كُتبت", await isCancelled(exam), true);

      const again = await cancel(exam, S.admin);
      same("١٤. وإلغاؤها مرّةً ثانية ⟵ ٤٠٩ **بلا رمز**",
        [again.status, again.body?.code ?? null], [409, null]);
    }

    // ══ د. الصلاحياتُ لم تتغيّر بحرف ═══════════════════════════════════════
    console.log("\n── د. الرمزُ ليس إذناً: مَن يفتح الباب لم يتغيّر ──");
    {
      const { p, exam, fu } = sold.prosthetic;

      const docR = await cancel(exam, S.doc);
      same("١٥. **الطبيبُ صاحبُ المعاينة** يُردّ ٤٠٩ بالرسالة نفسِها كما اليوم",
        [docR.status, docR.body?.error], [409, SOLD_TEXT]);

      const prev = (s: any) => http("POST", "/api/admin/operation-reversal/preview", s, { followupId: fu });
      const docPrev = await prev(S.doc);
      same("١٦. **ولا يفتح له الرمزُ باباً**: التصحيحُ الإداريّ يردّه ٤٠٣", docPrev.status, 403);
      same("١٧. والاستقبالُ كذلك ٤٠٣", (await prev(S.recv)).status, 403);
      same("١٨. ومديرُ فرعٍ آخر ٤٠٣ — عزلُ الفرع كما هو", (await prev(S.bm2)).status, 403);
      same("١٩. ومديرُ فرع المريض يمرّ", (await prev(S.bm1)).status, 200);
      const adminPrev = await prev(S.admin);
      same("٢٠. والمسؤولُ العام يمرّ", adminPrev.status, 200);
      check(Array.isArray(adminPrev.body?.availableModes)
        && adminPrev.body.availableModes.includes("full_operation"),
        "٢١. و«إلغاء العملية بالكامل» متاحٌ فعلاً على هذه العملية",
        JSON.stringify(adminPrev.body?.availableModes));
      same("٢٢. **ومحاولاتُ غير المخوَّل لم تكتب شيئاً**: المعاينةُ ما زالت فعّالة",
        await isCancelled(exam), false);
      check(p > 0, "٢٣. (المريضُ المُعَدُّ قائمٌ للقسم التالي)");
    }

    // ══ هـ. وجهةُ الانتقال تؤدّي ما أراده الضاغط ════════════════════════════
    console.log("\n── هـ. النافذةُ التي تُفتَح تسحب المعاينة فعلاً ──");
    {
      const { exam, fu } = sold.medical_support;
      const prev = await http("POST", "/api/admin/operation-reversal/preview", S.admin, { followupId: fu });
      same("٢٤. معاينةُ الأثر تمضي", prev.status, 200);
      const exec = await http("POST", "/api/admin/operation-reversal/execute", S.admin, {
        followupId: fu, intent: "cancel_operation",
        reasonNote: "سُجّلت العملية بالخطأ — اختبار الانتقال",
        stateStamp: prev.body?.stateStamp,
      });
      same("٢٥. و«إلغاء العملية بالكامل» ينفَّذ بمساره القائم", exec.status, 200);
      same("٢٦. **والمعاينةُ تُسحَب بشاهدة ٠٦١ نفسِها** — فالانتقالُ يؤدّي ما قُصد",
        await isCancelled(exam), true);
    }

    // ══ و. عقدُ الشاشة ═════════════════════════════════════════════════════
    console.log("\n── و. عقدُ الشاشة ──");
    {
      const src = fs.readFileSync("client/src/components/medical/PatientMedicalExams.tsx", "utf8");
      check(src.includes("EXAM_CANCEL_OPERATION_EXISTS") && src.includes('from "@shared/medical"'),
        "٢٧. الشاشةُ تستورد الرمزَ من المفردات المشتركة — لا نصَّ مكتوباً فيها");
      check(!/"exam_cancel_operation_exists"|'exam_cancel_operation_exists'/.test(src),
        "٢٨. ولا قيمةَ رمزٍ حرفيةً ثانية تنحرف يوماً");
      check(src.includes("err.code = body?.code ?? null"),
        "٢٩. والخطأُ يحمل رمزَه — لا مطابقةَ رسالةٍ عربية");
      check(src.includes("e?.code === EXAM_CANCEL_OPERATION_EXISTS && mayReverse && target !== null"),
        "٣٠. **والانتقالُ مشروطٌ بثلاثة**: الرمزُ · والصلاحيةُ القائمة · وهويّةُ العملية");
      check(src.includes("setReversalFor(target)"),
        "٣١. ويفتح **النافذةَ القائمة** بحالتها القائمة");
      check(src.includes("target={{ followupId: reversalFor }}"),
        "٣٢. والنافذةُ ما زالت مركَّبةً بهويّة المتابعة كما كانت");
      check(src.includes('const mayReverse = Boolean(session?.isAdmin) || session?.role === "branch_manager";'),
        "٣٣. **و`mayReverse` في الشاشة لم تُمَسّ بحرف**");
      check(!src.includes("/api/admin/operation-reversal"),
        "٣٤. **ولا تنادي الشاشةُ نقطةَ التصحيح بنفسها** — النافذةُ وحدها تناديها");
    }

    // ══ ز. الحُرّاسُ المعماريّون ════════════════════════════════════════════
    console.log("\n── ز. الحُرّاسُ المعماريّون ──");
    {
      const cx = fs.readFileSync("server/medical/cancel_exam.ts", "utf8");
      same("٣٥. **الرفضُ يُبنى من مكانٍ واحد** فلا يحمل موضعٌ رمزَه ويُنساه ثانٍ",
        (cx.match(/new ExamCancelError\(SOLD/g) ?? []).length, 1);
      same("٣٦. وثلاثةُ مواضعَ ترميه كما كانت — لا حارسَ زِيد ولا حارسَ نقص",
        (cx.match(/throw soldRefusal\(\);/g) ?? []).length, 3);
      check(cx.includes('"لا يمكن إلغاء هذه المعاينة بعد تنفيذ الخدمة المرتبطة بها."'),
        "٣٧. ونصُّ الرفض كما هو في مصدره");

      //  **ولا فحصَ `git diff origin/main` هنا.**
      //  أوّلُ صياغةٍ أثبتت «منطقُ الإلغاء لم يُمَسّ» بمقارنةِ مسارٍ
      //  بالأساس — **وتلك واقعةُ مراجعةٍ لا ثابتٌ دائم**: تنهار في أيّ
      //  نسخةٍ بلا المرجع `origin/main` (أرشيفٌ أو استنساخٌ ضحل) بـ
      //  `fatal: bad revision` **فتقتل الملفَّ كلَّه**، وتحمرّ لأيّ فرعٍ
      //  لاحقٍ يمسّ تلك المسارات بحقّ. (أمسكه مراجعٌ آليّ على #٢٩٩.)
      //
      //  **والضمانةُ الحقيقية حيّةٌ فوق**: القسمُ «د» يثبت أن نقطتَي
      //  التصحيح ما زالتا تفحصان الدورَ والفرعَ بأنفسهما (٤٠٣ للطبيب
      //  والاستقبال ومديرِ فرعٍ آخر)، والقسمُ «هـ» يثبت أن مسارَ الإلغاء
      //  الكامل ما زال ينفّذ ويسحب المعاينة بشاهدته — سلوكٌ يُقاس، لا
      //  مقارنةُ ملفّاتٍ بلقطةٍ عابرة.
    }
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active=false WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, DOC, EXPERT, BM1, BM2]]);
    httpServer.close();
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "🎉 كلُّ التأكيدات مرّت" : `❌ ${failures} تأكيداً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
