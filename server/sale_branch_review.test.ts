//  **مراجعةٌ مستقلّة على الطلب ٤٠٩ — خمسُ ملاحظاتٍ ثبتت، وكلٌّ قسمٌ يعيد شكلَها
//  ويثبت أنه صار صحيحاً** (٢٠٢٦-٠٩-٢٤).
//
//  لم يراجع Codex الطلبَ ٤٠٩ (بلغ حدَّ استعماله)، فراجعه وكيلٌ مستقلّ. وكلُّ
//  ملاحظةٍ أُعيد إنتاجُها **حيّاً قبل أيّ تعديل** على هذه النقاط نفسِها:
//
//    ① بيعٌ **بخصمٍ أو مجّاناً** كان يُسقط فرعَ البيع في `sanitizePayload`، فيبقى
//       في فرع المتابعة بخبيرٍ لا يعمل فيه — بينما البيعُ بسعره الكامل ينتقل.
//    ② المعاينةُ العاريةُ تُنسَب لفرع مَن أرسل المريض **ولو لم يصله الطبيبُ
//       الموقِّع** — فيُردّ طبيبُها ٤٠٣ على تعديلها وملحقها وإلغائها.
//    ③ التصحيحُ الإداريُّ يُؤذَن بفرع **التسجيل** وآثارُه تُكتب في فرع **البيع**:
//       مديرُ بغداد يُردّ عن عملية فرعه، ومديرُ ذي قار يقيّد في بغداد.
//    ④ سحبُ الإتاحة يسابق بيعاً معلَّقاً فيمضي، فيبقى للفرع عملٌ حيٌّ على ملفٍّ
//       لا يفتحه — وفي الاتّجاه المعاكس يمضي البيعُ على إتاحةٍ تُسحَب.
//    ⑤ خبيرٌ محفوظٌ اختاره فرعٌ آخر يحبس «اشترى» في الفرع الآخر بلا مخرج.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ، والسباقان حتميّان
//  لا احتمال: بوّابةٌ على عميل القاعدة **في ملفّ الاختبار وحده**.
//  التشغيل: `DATABASE_URL=… npm run test:sale-branch-review`
import { pool, db } from "./db";
import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import { readFileSync } from "fs";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import * as followupStore from "./followup/store";
import { EXPERT_OUTSIDE_PATIENT_BRANCHES } from "./followup/sale_branch";
import { pickBareExamBranch } from "./medical/exam_branch";
import { REVERSAL_OTHER_BRANCH } from "./admin_reversal/store";
import { REVOKE_BLOCKED_BY_OPERATION } from "./patients/branch_access_store";

const PORT = 6251 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مراجعة-٤٠٩";

//  ذي قار = فرعُ التسجيل · بغداد = الفرعُ المُتاح · كربلاء = فرعٌ لا يصل الملفّ.
const DQ = 74, BG = 75, KR = 76;
const U = {
  ADMIN: 9730, R_DQ: 9731, R_BG: 9732,
  DOC_DQ: 9734, DOC_BG: 9735, DOC_DQ2: 9736,
  MGR_DQ: 9737, MGR_BG: 9738, MGR_KR: 9739,
  E_DQ: 9741, AYOUB: 9742, E_BOTH: 9743,
};
const USERS = Object.values(U);

const sess = (userId: number, role: string, branchId: number, ids: number[], name: string,
  isAdmin = false) => ({
  userId, role, isAdmin, branchId, accessibleBranches: ids, displayName: name, permissions: {},
});
const S = {
  admin: sess(U.ADMIN, "admin", 0, [], "المسؤول", true),
  dq: sess(U.R_DQ, "reception", DQ, [DQ], "استقبال ذي قار"),
  bg: sess(U.R_BG, "reception", BG, [BG], "استقبال بغداد"),
  docDQ: sess(U.DOC_DQ, "doctor", DQ, [DQ], "طبيب ذي قار"),
  docDQ2: sess(U.DOC_DQ2, "doctor", DQ, [DQ], "طبيب ذي قار الثاني"),
  docBG: sess(U.DOC_BG, "doctor", BG, [BG], "طبيب بغداد"),
  mgrDQ: sess(U.MGR_DQ, "branch_manager", DQ, [DQ], "مدير ذي قار"),
  mgrBG: sess(U.MGR_BG, "branch_manager", BG, [BG], "مدير بغداد"),
  mgrKR: sess(U.MGR_KR, "branch_manager", KR, [KR], "مدير كربلاء"),
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bootRealRoutes() {
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
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

type Res = { status: number; body: any };
//  **بمهلةٍ صريحة**: طلبٌ لا يعود يُسجَّل فشلاً لا تعليقاً للحزمة.
async function http(method: string, path: string, session: any, body?: any, ms = 15000): Promise<Res> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(BASE + path, {
      method, signal: ctl.signal,
      headers: {
        "content-type": "application/json",
        "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  } catch (e: any) {
    return { status: 0, body: { error: e?.name === "AbortError" ? "لا ردّ — الطلب معلَّق" : String(e) } };
  } finally {
    clearTimeout(t);
  }
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const msg = (r: Res) => String(r.body?.error ?? r.body?.message ?? "");

async function mkPatient(label: string, shareWith: number[]) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition,
       amputation_site, branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost,
       patient_classification)
     VALUES ($1,'07801114455',$2,'30','160','60','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, DQ]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,$2,'prosthetic',0,'manual','active')`, [p.id, DQ]);
  for (const b of shareWith) {
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note)
             VALUES ($1,$2,'المسؤول','إتاحة')`, [p.id, b]);
  }
  return Number(p.id);
}

/** يوقّع المعاينةَ طبيبٌ بعينه ويُرجع المعاينةَ ومتابعتَها (بلا تصنيع). */
async function signExam(patientId: number, doctor: any) {
  const key = crypto.randomUUID();
  const body: any = { idempotencyKey: key, caseType: "prosthetic", diagnosis: "بتر تحت الركبة",
    prescription: {} };
  const r = await http("POST", `/api/medical/patients/${patientId}/exams`, doctor, body);
  const [e] = await q(`SELECT id, branch_id, doctor_id FROM medical_exams
                        WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [patientId]);
  const [f] = await q(`SELECT id, branch_id FROM post_exam_followups
                        WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [patientId]);
  return {
    res: r, examId: Number(e?.id ?? 0), examBranch: e?.branch_id === undefined ? null : Number(e.branch_id),
    followupId: Number(f?.id ?? 0), followupBranch: f?.branch_id === undefined ? null : Number(f.branch_id),
  };
}

const sendToDoctor = (patientId: number, who: any) =>
  http("POST", "/api/medical-review/requests", who,
    { patientId, serviceType: "prosthetic", requestedPath: "full", reviewKind: "new_device" });

/** بصمةُ الكتابة على الملفّ — لإثبات «صفر كتابة» على كلّ رفض. */
async function fingerprint(patientId: number) {
  const one = async (t: string, cols: string) =>
    JSON.stringify(await q(`SELECT ${cols} FROM ${t} WHERE patient_id=$1 ORDER BY id`, [patientId]));
  return {
    followups: await one("post_exam_followups",
      "id, status, branch_id, device_episode_id, selected_expert_user_id, approved_price"),
    episodes: await one("patient_device_episodes", "id, status, branch_id, agreed_cost"),
    orders: await one("prosthetic_work_orders", "id, branch_id, expert_user_id, status"),
    costs: await one("cost_entries", "id, branch_id, amount"),
    payments: await one("payments", "id, branch_id, amount"),
    discounts: await one("service_discount_requests", "id, branch_id, status"),
    access: await one("patient_branch_access", "id, branch_id"),
    reversals: await one("administrative_operation_reversals", "id"),
    exams: await one("medical_exams", "id, branch_id"),
  };
}

/** يكتب فرعَ معاينةٍ مختومة — **شكلُ الصفّ الموروث** كما تركه ٤٠٩ قبل هذا الإصلاح. */
async function forceExamBranch(examId: number, branchId: number) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL app.allow_exam_edit = 'on'");
    await c.query("UPDATE medical_exams SET branch_id = $1 WHERE id = $2", [branchId, examId]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

/** هل يقف طلبٌ الآن على قفل صفٍّ في جدول الإتاحة؟ — حقيقةٌ من Postgres لا توقيت. */
async function someoneWaitsOnAccessRow(): Promise<boolean> {
  const r = await q<{ n: number }>(
    `SELECT count(*)::int n FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND query ILIKE '%patient_branch_access%'`);
  return Number(r[0]?.n ?? 0) > 0;
}

async function cleanup() {
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source=$1`, [MARK]);
  for (const p of pts) await storage.deletePatient(Number(p.id));
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
}

let unhandled = 0;
process.on("unhandledRejection", (e: any) => {
  unhandled++;
  console.error("  [رفضٌ غيرُ ملتقَط]", e?.message ?? e);
});

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار'),($2,'بغداد'),($3,'كربلاء')
           ON CONFLICT (id) DO NOTHING`, [DQ, BG, KR]);
  const names = Object.fromEntries((await q(`SELECT id, name FROM branches WHERE id = ANY($1::int[])`,
    [[DQ, BG, KR]])).map((r: any) => [Number(r.id), String(r.name)]));
  await cleanup();
  const users: any[] = [
    [U.ADMIN, "admin", null, [], "المسؤول", null],
    [U.R_DQ, "reception", DQ, [DQ], "استقبال ذي قار", null],
    [U.R_BG, "reception", BG, [BG], "استقبال بغداد", null],
    [U.DOC_DQ, "doctor", DQ, [DQ], "طبيب ذي قار", '["prosthetic"]'],
    [U.DOC_DQ2, "doctor", DQ, [DQ], "طبيب ذي قار الثاني", '["prosthetic"]'],
    [U.DOC_BG, "doctor", BG, [BG], "طبيب بغداد", '["prosthetic"]'],
    [U.MGR_DQ, "branch_manager", DQ, [DQ], "مدير ذي قار", null],
    [U.MGR_BG, "branch_manager", BG, [BG], "مدير بغداد", null],
    [U.MGR_KR, "branch_manager", KR, [KR], "مدير كربلاء", null],
    [U.E_DQ, "prosthetics_expert", DQ, [DQ], "خبير ذي قار", null],
    [U.AYOUB, "prosthetics_expert", BG, [BG], "أيوب", null],
    [U.E_BOTH, "prosthetics_expert", DQ, [DQ, BG], "خبير الفرعين", null],
  ];
  for (const [id, role, br, ids, name, spec] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_add_patients, can_view_payments,
               can_add_payments, medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,true,true,true,$7::jsonb)`,
      [id, `sbr_${id}`, name, role, br, JSON.stringify(ids), spec]);
  }

  const srv = await bootRealRoutes();
  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. فرعُ المعاينة العارية خالصاً: فرعٌ يصله الموقِّع دائماً ──");
    // ══════════════════════════════════════════════════════════════════
    const base = {
      fileBranchIds: [DQ, BG], referralBranchId: null as number | null,
      caseBranchId: DQ as number | null, registrationBranchId: DQ as number | null,
      sessionBranchId: null as number | null,
    };
    eq(pickBareExamBranch({ ...base, scope: [DQ], referralBranchId: BG, sessionBranchId: DQ }), DQ,
      "أ١. **طبيبُ ذي قار يوقّع مريضاً أرسلته بغداد ⟵ ذي قار** — كان بغداد فيفقد معاينتَه");
    eq(pickBareExamBranch({ ...base, scope: [BG], referralBranchId: BG, sessionBranchId: BG }), BG,
      "أ٢. طبيبُ بغداد وبغدادُ أرسلت ⟵ بغداد (قصدُ ٤٠٩ كما هو)");
    eq(pickBareExamBranch({ ...base, scope: [BG], sessionBranchId: BG }), BG,
      "أ٣. **طبيبُ بغداد بلا إرسال ⟵ بغداد** — كان فرعَ الحالة (ذي قار) فلا يصله");
    eq(pickBareExamBranch({ ...base, scope: [DQ, BG], referralBranchId: BG, sessionBranchId: DQ }), BG,
      "أ٤. طبيبٌ في الفرعين ⟵ فرعُ المُرسِل أوّلاً");
    eq(pickBareExamBranch({ ...base, scope: null, referralBranchId: BG }), BG,
      "أ٥. المسؤولُ على ترتيبه القائم بحرفه: المُرسِلُ أوّلاً");
    eq(pickBareExamBranch({ ...base, scope: null }), DQ, "أ٦. والمسؤولُ بلا إرسال ⟵ فرعُ الحالة");
    eq(pickBareExamBranch({ ...base, scope: [KR, BG], sessionBranchId: KR }), BG,
      "أ٧. فرعُ الجلسة ليس من فروع الملفّ ⟵ أوّلُ فرعٍ من الملفّ في نطاقه");
    eq(pickBareExamBranch({ ...base, scope: [BG], fileBranchIds: [DQ], referralBranchId: BG,
      sessionBranchId: BG }), DQ,
      "أ٨. مُرسِلٌ سُحبت إتاحتُه ولا فرعَ يصله ⟵ الترتيبُ القائم ولا يُخترَع فرع");
    eq(pickBareExamBranch({ ...base, scope: [DQ], referralBranchId: 0, caseBranchId: -3,
      registrationBranchId: Number.NaN, sessionBranchId: DQ }), DQ,
      "أ٩. والمشوَّهُ يُتجاهَل لا يُقرأ فرعاً");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الملاحظة ②: طبيبُ ذي قار يوقّع مريضةً أرسلتها بغداد — ولا يفقد معاينتَه ──");
    // ══════════════════════════════════════════════════════════════════
    const pB = await mkPatient("إرسال بغداد وتوقيع ذي قار", [BG]);
    const sendB = await sendToDoctor(pB, S.bg);
    eq([sendB.status, Number(sendB.body?.branchId)], [201, BG], "ب١. بغدادُ ترسلها للطبيب (الطلبُ في بغداد)");
    const exB = await signExam(pB, S.docDQ);
    eq([exB.res.status, exB.examBranch, exB.followupBranch], [200, DQ, DQ],
      "ب٢. **المعاينةُ ومتابعتُها في ذي قار حيث يعمل موقِّعُها** — كانتا في بغداد");
    const patchB = await http("PATCH", `/api/medical/exams/${exB.examId}`, S.docDQ,
      { caseType: "prosthetic", diagnosis: "بتر تحت الركبة — مصحَّح", prescription: {} });
    eq(patchB.status, 200, "ب٣. **وطبيبُها يعدّلها** — كان ٤٠٣ «معاينة فرع آخر»");
    const addB = await http("POST", `/api/medical/exams/${exB.examId}/addenda`, S.docDQ, { body: "ملحق" });
    eq(addB.status, 200, "ب٤. ويضيف ملحقاً");
    const mgrCancelB = await http("POST", `/api/medical/exams/${exB.examId}/cancel`, S.mgrDQ,
      { reason: "معاينة على الملف الخطأ" });
    eq(mgrCancelB.status, 200, "ب٥. **ومديرُ ذي قار يلغيها** — كان ٤٠٣");
    //  والعمليةُ ما زالت تصل بغداد: تبيع من بطاقة المريض (قاعدةُ ٤٠٩ بحرفها).
    const pB2 = await mkPatient("بغداد تبيع بعد توقيع ذي قار", [BG]);
    await sendToDoctor(pB2, S.bg);
    const exB2 = await signExam(pB2, S.docDQ);
    const buyB2 = await http("POST", `/api/followups/${exB2.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    const woB2 = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pB2]);
    eq([buyB2.status, woB2.map((w: any) => [Number(w.branch_id), Number(w.expert_user_id)])],
      [200, [[BG, U.AYOUB]]],
      "ب٦. **وبغدادُ تُتمّ البيعَ بأيوب فيقع في بغداد** — المتابعةُ في ذي قار لا تحبسها");
    //  طبيبُ بغداد: بإرسالٍ وبلاه — الفرعُ الذي يصله.
    const pB3 = await mkPatient("طبيب بغداد مع إرسال", [BG]);
    await sendToDoctor(pB3, S.bg);
    const exB3 = await signExam(pB3, S.docBG);
    eq([exB3.examBranch, exB3.followupBranch], [BG, BG], "ب٧. طبيبُ بغداد وبغدادُ أرسلت ⟵ بغداد (كما في ٤٠٩)");
    const pB4 = await mkPatient("طبيب بغداد بلا إرسال", [BG]);
    const exB4 = await signExam(pB4, S.docBG);
    eq([exB4.res.status, exB4.examBranch], [200, BG],
      "ب٨. **طبيبُ بغداد بلا إرسال ⟵ بغداد** — كانت في ذي قار (العطبُ الأقدم نفسُه)");
    const patchB4 = await http("PATCH", `/api/medical/exams/${exB4.examId}`, S.docBG,
      { caseType: "prosthetic", diagnosis: "بتر — مصحَّح", prescription: {} });
    eq(patchB4.status, 200, "ب٩. ويعدّلها — كان ٤٠٣");
    const pB5 = await mkPatient("ذي قار وحدها", []);
    const exB5 = await signExam(pB5, S.docDQ);
    eq([exB5.examBranch, exB5.followupBranch], [DQ, DQ], "ب١٠. والمريضُ غيرُ المُتاح كما كان: فرعُه");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. صاحبُ المعاينة يصل صفَّه الموروث — وحدَه ──");
    // ══════════════════════════════════════════════════════════════════
    //  صفٌّ نسبه ٤٠٩ قبل هذا الإصلاح لفرعٍ لا يصله موقِّعُه (بغداد).
    const pC = await mkPatient("صف موروث", [BG]);
    const exC = await signExam(pC, S.docDQ);
    await forceExamBranch(exC.examId, BG);
    const [exCRow] = await q(`SELECT branch_id, doctor_id FROM medical_exams WHERE id=$1`, [exC.examId]);
    eq([Number(exCRow?.branch_id), Number(exCRow?.doctor_id)], [BG, U.DOC_DQ],
      "ج٠. الشكلُ الموروث: معاينةُ طبيب ذي قار مكتوبةٌ في بغداد");
    const patchC = await http("PATCH", `/api/medical/exams/${exC.examId}`, S.docDQ,
      { caseType: "prosthetic", diagnosis: "بتر — مصحَّح", prescription: {} });
    eq(patchC.status, 200, "ج١. **صاحبُها يعدّلها** — كان ٤٠٣");
    const addC = await http("POST", `/api/medical/exams/${exC.examId}/addenda`, S.docDQ, { body: "ملحق" });
    eq(addC.status, 200, "ج٢. ويضيف ملحقاً");
    const addC2 = await http("POST", `/api/medical/exams/${exC.examId}/addenda`, S.docDQ2, { body: "ملحق زميل" });
    eq([addC2.status, msg(addC2)], [403, "لا يمكنك الكتابة على معاينة فرع آخر"],
      "ج٣. **وزميلُه في ذي قار لا يُنقَذ** — الإنقاذُ لصاحب التوقيع وحده");
    const addCtl = await http("POST", `/api/medical/exams/${exB5.examId}/addenda`, S.docDQ2, { body: "ملحق زميل" });
    eq(addCtl.status, 200, "ج٣أ. والزميلُ نفسُه يكتب الملحقَ على معاينةٍ في فرعه — فالردُّ للفرع لا للاختصاص");
    const mgrC = await http("POST", `/api/medical/exams/${exC.examId}/cancel`, S.mgrDQ, { reason: "خطأ" });
    eq([mgrC.status, msg(mgrC)], [403, "لا يمكنك إلغاء معاينة فرع آخر"],
      "ج٤. **ومديرُ ذي قار لا يُنقَذ** — إذنُه الإداريّ لا يُنال من بابٍ سريريّ");
    const moved = { ...S.docDQ, branchId: KR, accessibleBranches: [KR] };
    const patchMoved = await http("PATCH", `/api/medical/exams/${exC.examId}`, moved,
      { caseType: "prosthetic", diagnosis: "بتر — من كربلاء", prescription: {} });
    eq(patchMoved.status, 403, "ج٥. **وصاحبُها إن لم يعد يصل ملفَّ المريض ⟵ ٤٠٣** — الإنقاذُ مشروطٌ بالملفّ");
    const cancelC = await http("POST", `/api/medical/exams/${exC.examId}/cancel`, S.docDQ, { reason: "خطأ" });
    eq(cancelC.status, 200, "ج٦. وصاحبُها يلغيها");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الملاحظة ①: البيعُ بخصمٍ أو مجّاناً ينتقل كالبيع بسعره ──");
    // ══════════════════════════════════════════════════════════════════
    const pD = await mkPatient("خصم", [BG]);
    const exD = await signExam(pD, S.docDQ);
    eq(exD.followupBranch, DQ, "د٠. المتابعةُ في ذي قار (شكلُ «زهراء» على الإنتاج)");
    const buyD = await http("POST", `/api/followups/${exD.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB,
        discount: { finalPrice: 1200000, reason: "negotiation", note: "اتفاق" } });
    eq(buyD.status, 200, "د١. استقبالُ بغداد «اشترى» بخصمٍ مع أيوب ⟵ ٢٠٠");
    const [fD] = await q(`SELECT status, branch_id FROM post_exam_followups WHERE id=$1`, [exD.followupId]);
    eq([fD?.status, Number(fD?.branch_id)], ["converted", BG],
      "د٢. **والمتابعةُ انتقلت إلى بغداد** — كانت تبقى في ذي قار بخبيرٍ لا يعمل فيها");
    const woD = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pD]);
    eq(woD.map((w: any) => [Number(w.branch_id), Number(w.expert_user_id)]), [[BG, U.AYOUB]],
      "د٣. **وأمرُ التصنيع في بغداد بأيوب**");
    const epD = await q(`SELECT DISTINCT branch_id FROM patient_device_episodes WHERE patient_id=$1`, [pD]);
    eq(epD.map((e: any) => Number(e.branch_id)), [BG], "د٤. والجهازُ في بغداد");
    const costD = await q(`SELECT branch_id, amount FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [pD]);
    eq(costD.map((c: any) => [Number(c.branch_id), Number(c.amount)]), [[BG, 1200000]],
      "د٥. **والكلفةُ المخفَّضة قُيّدت في بغداد**");
    const [dD] = await q(`SELECT branch_id, status, payload FROM service_discount_requests WHERE patient_id=$1`, [pD]);
    eq([Number(dD?.branch_id), Number(dD?.payload?.saleBranchId)], [BG, BG],
      "د٦. **وصفُّ الخصم في بغداد يحمل فرعَ البيع** — كان يُسقَط في `sanitizePayload`");
    const [mvD] = await q(`SELECT payload FROM post_exam_followup_events
                            WHERE followup_id=$1 AND event_type='sale_branch_moved'`, [exD.followupId]);
    eq([Number(mvD?.payload?.fromBranchId), Number(mvD?.payload?.toBranchId)], [DQ, BG],
      "د٧. وحدثُ النقل يقول من ذي قار إلى بغداد");
    const pD2 = await mkPatient("مجاني", [BG]);
    const exD2 = await signExam(pD2, S.docDQ);
    const freeD = await http("POST", `/api/followups/${exD2.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB, discount: { isFree: true } });
    eq(freeD.status, 200, "د٨. «اشترى» مجّاناً مع أيوب ⟵ ٢٠٠");
    const woD2 = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pD2]);
    const [fD2] = await q(`SELECT branch_id FROM post_exam_followups WHERE id=$1`, [exD2.followupId]);
    const [dD2] = await q(`SELECT branch_id, payload FROM service_discount_requests WHERE patient_id=$1`, [pD2]);
    eq([woD2.map((w: any) => Number(w.branch_id)), Number(fD2?.branch_id), Number(dD2?.branch_id),
      Number(dD2?.payload?.saleBranchId)], [[BG], BG, BG, BG],
      "د٩. **والتبرّعُ كذلك في بغداد** — الأمرُ والمتابعةُ وصفُّ الاعتماد");
    const pD3 = await mkPatient("خصم بلا نقل", [BG]);
    const exD3 = await signExam(pD3, S.docDQ);
    await http("POST", `/api/followups/${exD3.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.E_DQ,
        discount: { finalPrice: 1300000, reason: "negotiation" } });
    const woD3 = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pD3]);
    const mvD3 = await q(`SELECT 1 FROM post_exam_followup_events WHERE followup_id=$1
                            AND event_type='sale_branch_moved'`, [exD3.followupId]);
    eq([woD3.map((w: any) => Number(w.branch_id)), mvD3.length], [[DQ], 0],
      "د١٠. وخصمُ ذي قار بخبيرها يبقى فيها بلا نقل");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. الملاحظة ③: التصحيحُ الإداريّ يُصحِّحه فرعُ العملية ──");
    // ══════════════════════════════════════════════════════════════════
    const pE = await mkPatient("تصحيح إداري", [BG]);
    const exE = await signExam(pE, S.docDQ);
    await http("POST", `/api/followups/${exE.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    const [fE] = await q(`SELECT branch_id FROM post_exam_followups WHERE id=$1`, [exE.followupId]);
    eq(Number(fE?.branch_id), BG, "هـ٠. البيعُ وقع في بغداد");
    const pvBG = await http("POST", "/api/admin/operation-reversal/preview", S.mgrBG, { followupId: exE.followupId });
    eq(pvBG.status, 200, "هـ١. **مديرُ بغداد يفتح تصحيحَ عملية فرعه** — كان ٤٠٣ «فرع آخر»");
    const pvDQ = await http("POST", "/api/admin/operation-reversal/preview", S.mgrDQ, { followupId: exE.followupId });
    eq([pvDQ.status, msg(pvDQ)],
      [403, `هذه العمليةُ في فرع ${names[BG]} — يُصحِّحها ذلك الفرعُ أو المسؤول العام`],
      "هـ٢. **ومديرُ ذي قار يُردّ برسالةٍ تسمّي بغداد** — كان يمضي");
    const pvKR = await http("POST", "/api/admin/operation-reversal/preview", S.mgrKR, { followupId: exE.followupId });
    eq([pvKR.status, msg(pvKR)], [403, REVERSAL_OTHER_BRANCH], "هـ٣. وكربلاء لا تصل الملفّ ⟵ رسالتُها القائمة");
    const pvAdm = await http("POST", "/api/admin/operation-reversal/preview", S.admin, { followupId: exE.followupId });
    eq(pvAdm.status, 200, "هـ٤. والمسؤولُ يفتحه");
    const fE0 = await fingerprint(pE);
    const exeDQ = await http("POST", "/api/admin/operation-reversal/execute", S.mgrDQ, {
      followupId: exE.followupId, intent: "purchase_mistake", reasonNote: "اختبار",
      stateStamp: pvAdm.body?.stateStamp,
    });
    eq(exeDQ.status, 403, "هـ٥. **ومديرُ ذي قار يُردّ عند التنفيذ تحت القفل** — كان يقيّد في بغداد −١,٥٠٠,٠٠٠");
    eq(await fingerprint(pE), fE0, "هـ٦. وبلا كتابة");
    const exeBG = await http("POST", "/api/admin/operation-reversal/execute", S.mgrBG, {
      followupId: exE.followupId, intent: "purchase_mistake", reasonNote: "اختبار",
      stateStamp: pvBG.body?.stateStamp,
    });
    eq(exeBG.status, 200, "هـ٧. ومديرُ بغداد يُنفّذ");
    const costE = await q(`SELECT branch_id, amount FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [pE]);
    eq(costE.map((c: any) => [Number(c.branch_id), Number(c.amount)]), [[BG, 1500000], [BG, -1500000]],
      "هـ٨. والقيدُ المعاكس في بغداد حيث وقع البيع");
    //  والمرآة: عمليةٌ في ذي قار على الملفّ المشترك.
    const pE2 = await mkPatient("تصحيح في ذي قار", [BG]);
    const exE2 = await signExam(pE2, S.docDQ);
    await http("POST", `/api/followups/${exE2.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    const pvBG2 = await http("POST", "/api/admin/operation-reversal/preview", S.mgrBG, { followupId: exE2.followupId });
    eq([pvBG2.status, msg(pvBG2)],
      [403, `هذه العمليةُ في فرع ${names[DQ]} — يُصحِّحها ذلك الفرعُ أو المسؤول العام`],
      "هـ٩. **وبغدادُ لا تُصحِّح عمليةَ ذي قار** ولو وصلت الملفّ");
    const pvDQ2 = await http("POST", "/api/admin/operation-reversal/preview", S.mgrDQ, { followupId: exE2.followupId });
    eq(pvDQ2.status, 200, "هـ١٠. وذي قار تُصحِّحها");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. شقيقُها: تصحيحُ السعر بعد البيع يُحكَم بفرع البيع تحت القفل ──");
    // ══════════════════════════════════════════════════════════════════
    const pF = await mkPatient("تصحيح سعر", [BG]);
    const exF = await signExam(pF, S.docDQ);
    await http("POST", `/api/followups/${exF.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    //  سعرٌ من المعاينة (الشكلُ الوحيد الذي يُصحَّح بعد البيع).
    await q(`UPDATE post_exam_followups SET price_source='exam' WHERE id=$1`, [exF.followupId]);
    const [fF] = await q(`SELECT device_episode_id, branch_id FROM post_exam_followups WHERE id=$1`, [exF.followupId]);
    eq([Number(fF?.branch_id), exF.examBranch], [BG, DQ], "و٠. البيعُ في بغداد والمعاينةُ في ذي قار");
    const correct = (scope: number[] | null) => db.transaction((tx) =>
      followupStore.applyExamPriceCorrectionAfterSale({
        followupId: exF.followupId, medicalExamId: exF.examId,
        examDeviceEpisodeId: null, newPrice: 1600000, reason: "خطأ إدخال",
        scope, actor: { userId: U.MGR_DQ, userName: "مدير ذي قار" }, tx,
      }));
    const fF0 = await fingerprint(pF);
    let errF: any = null;
    try { await correct([DQ]); } catch (e) { errF = e; }
    eq([errF?.status, String(errF?.message ?? "")],
      [403, `هذا البيعُ في فرع ${names[BG]} — يُصحِّح سعرَه ذلك الفرعُ أو المسؤول العام. لم يُعدَّل شيء.`],
      "و١. **مديرُ ذي قار يصل المعاينةَ ولا يصل البيع ⟵ ٤٠٣** — كان يقيّد الفرقَ في بغداد");
    eq(await fingerprint(pF), fF0, "و٢. وبلا كتابة");
    let outF: any = null, errF2: any = null;
    try { outF = await correct([BG]); } catch (e) { errF2 = e; }
    ok(errF2 === null && outF?.delta === 100000, "و٣. ونطاقُ بغداد يُصحِّحه", String(errF2?.message ?? ""));
    const corrF = await q(`SELECT branch_id, amount FROM cost_entries WHERE patient_id=$1
                            AND source='exam_price_correction'`, [pF]);
    eq(corrF.map((c: any) => [Number(c.branch_id), Number(c.amount)]), [[BG, 100000]],
      "و٤. والفرقُ في بغداد");
    const medSrc = readFileSync(new URL("./medical/routes.ts", import.meta.url), "utf8");
    const call = medSrc.slice(medSrc.indexOf("applyExamPriceCorrectionAfterSale({"),
      medSrc.indexOf("applyExamPriceCorrectionAfterSale({") + 900);
    ok(/scope:\s*branchScope\(req\)/.test(call),
      "و٥. والنقطةُ الوحيدة التي تناديه تمرّر نطاقَ الجلسة");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. الملاحظة ④أ: سحبُ الإتاحة وبيعٌ معلَّق لم يُلتزَم ──");
    // ══════════════════════════════════════════════════════════════════
    const pG = await mkPatient("سباق السحب", [BG]);
    const exG = await signExam(pG, S.docDQ);
    await q(`UPDATE post_exam_followups SET approved_price=1500000, selected_expert_user_id=$2 WHERE id=$1`,
      [exG.followupId, U.AYOUB]);
    let releaseSale!: () => void;
    const saleGate = new Promise<void>((r) => { releaseSale = r; });
    let saleHeld!: () => void;
    const saleReady = new Promise<void>((r) => { saleHeld = r; });
    const saleG = db.transaction(async (tx) => {
      const out = await followupStore.confirmPurchase({
        followupId: exG.followupId, actor: { userId: U.R_BG, userName: "استقبال بغداد" },
        saleBranchId: BG, tx,
      });
      saleHeld();
      await saleGate; // البيعُ مكتملٌ داخل معاملته ولم يُلتزَم
      return out;
    });
    await saleReady;
    let revokeG: Res | null = null;
    const revokeGp = http("DELETE", `/api/patients/${pG}/branch-access/${BG}`, S.admin)
      .then((r) => { revokeG = r; return r; });
    let waited = false;
    for (let i = 0; i < 300 && !waited && revokeG === null; i++) {
      await sleep(10);
      waited = await someoneWaitsOnAccessRow();
    }
    ok(waited && revokeG === null,
      "ز١. **السحبُ يقف على صفّ الإتاحة حتى يُلتزَم البيع** — كان يمضي ٢٠٠ في عشرين مللي ثانية",
      `waited=${waited} revoke=${JSON.stringify(revokeG)}`);
    releaseSale();
    const outG = await saleG;
    const rG = await revokeGp;
    eq([rG.status, msg(rG)], [409, REVOKE_BLOCKED_BY_OPERATION],
      "ز٢. **ثمّ يرى أمرَ البيع فيُردّ ٤٠٩**");
    const accG = await q(`SELECT branch_id FROM patient_branch_access WHERE patient_id=$1`, [pG]);
    eq(accG.map((a: any) => Number(a.branch_id)), [BG], "ز٣. والإتاحةُ باقية");
    const fileG = await http("GET", `/api/patients/${pG}`, S.bg);
    const woPageG = await http("GET", `/api/manufacturing/orders/${outG.workOrderId}`, S.mgrBG);
    eq([fileG.status, woPageG.status], [200, 200],
      "ز٤. **وبغدادُ تفتح الملفَّ وصفحةَ أمرها** — كان ٤٠٤ على ملفٍّ لها فيه عملٌ حيّ");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. الملاحظة ④ب: بيعٌ يصل وسحبٌ لم يُلتزَم ──");
    // ══════════════════════════════════════════════════════════════════
    const pH = await mkPatient("سباق البيع", [BG]);
    const exH = await signExam(pH, S.docDQ);
    const fH0 = await fingerprint(pH);
    //  بوّابةٌ على العميل المُستعار: تحجز السحبَ **بعد** حذفه صفَّ الإتاحة وقبل
    //  سطر تدقيقه — أي بعد أن قرأ العملَ الحيّ (لا شيء) وقبل أن يلتزم.
    const origConnect = (pool as any).connect.bind(pool);
    let held = false;
    let releaseRevoke!: () => void;
    const revokeGate = new Promise<void>((r) => { releaseRevoke = r; });
    (pool as any).connect = async (...cArgs: any[]) => {
      if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
      const client: any = await origConnect();
      if (!client || typeof client.query !== "function") return client;
      const cq = client.query.bind(client);
      client.query = async (...args: any[]) => {
        const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
        if (!held && /insert into "audit_log"/i.test(text)
            && JSON.stringify(args[1] ?? args[0]?.values ?? []).includes("patient_branch_access")) {
          held = true;
          await revokeGate;
        }
        return cq(...args);
      };
      return client;
    };
    let saleH: Res | null = null, revokeH: Res | null = null;
    try {
      const revokeHp = http("DELETE", `/api/patients/${pH}/branch-access/${BG}`, S.admin)
        .then((r) => { revokeH = r; return r; });
      for (let i = 0; i < 300 && !held && revokeH === null; i++) await sleep(10);
      ok(held, "ح٠. السحبُ حذف صفَّ الإتاحة ولم يُلتزَم بعد (البوّابةُ أمسكته)",
        JSON.stringify(revokeH));
      const saleHp = http("POST", `/api/followups/${exH.followupId}/confirm-purchase`, S.bg,
        { originalPrice: 1500000, expertUserId: U.AYOUB })
        .then((r) => { saleH = r; return r; });
      let saleWaited = false;
      for (let i = 0; i < 300 && !saleWaited && saleH === null; i++) {
        await sleep(10);
        saleWaited = await someoneWaitsOnAccessRow();
      }
      ok(saleWaited && saleH === null,
        "ح١. **البيعُ يقف على صفّ الإتاحة المحذوف** — كان يقرؤه حرّاً فيمضي",
        `waited=${saleWaited} sale=${JSON.stringify(saleH)}`);
      releaseRevoke();
      await revokeHp;
      await saleHp;
    } finally {
      releaseRevoke();
      (pool as any).connect = origConnect;
    }
    eq((revokeH as Res | null)?.status, 200, "ح٢. السحبُ يلتزم");
    eq([(saleH as Res | null)?.status, msg(saleH as any)],
      [409, "لم يعد هذا الفرع يصل ملفّ المريض — حدّث الصفحة وأعد المحاولة"],
      "ح٣. **ثمّ يرى البيعُ أن الإتاحةَ ذهبت فيُردّ ٤٠٩**");
    //  **والبيعُ نفسُه لم يقع**: لا أمرَ ولا جهازَ ولا كلفةَ ولا دفعةَ ولا خصم،
    //  والمتابعةُ في ذي قار لم تتحوّل. (أمّا سعرُها الأوّل وخبيرُها فخطوتان
    //  يلتزمهما معالجُ «اشترى» **قبل** البيع بمعاملتيهما — سلوكٌ قائم قبل هذا
    //  الإصلاح، يُعاد بهما الضغطُ ولا يحرّكان ديناراً.)
    const fH1 = await fingerprint(pH);
    const fwH = await q(`SELECT status, branch_id, device_episode_id FROM post_exam_followups
                          WHERE id=$1`, [exH.followupId]);
    eq([fH1.episodes, fH1.orders, fH1.costs, fH1.payments, fH1.discounts,
      fwH.map((f: any) => [f.status, Number(f.branch_id), f.device_episode_id])],
      [fH0.episodes, fH0.orders, fH0.costs, fH0.payments, fH0.discounts,
        [["awaiting_patient_decision", DQ, null]]],
      "ح٤. **وبلا أمرٍ ولا جهازٍ ولا كلفةٍ ولا نقلٍ لبغداد** — كان يُكتب لها بيعٌ على ملفٍّ لا تفتحه");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. الملاحظة ⑤: خبيرٌ محفوظٌ لا يصلح لهذا البائع يُبدَّل من نافذة «اشترى» ──");
    // ══════════════════════════════════════════════════════════════════
    const pI = await mkPatient("خبير محفوظ", [BG]);
    const exI = await signExam(pI, S.docDQ);
    const selI = await http("POST", `/api/followups/${exI.followupId}/expert`, S.bg, { expertUserId: U.AYOUB });
    eq(selI.status, 200, "ط٠. بغدادُ تختار أيوبَ على متابعةٍ في ذي قار");
    const fI0 = await fingerprint(pI);
    const noBody = await http("POST", `/api/followups/${exI.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000 });
    eq([noBody.status, msg(noBody)], [400, EXPERT_OUTSIDE_PATIENT_BRANCHES],
      "ط١. ذي قار بلا بديل ⟵ ٤٠٠ برسالة المحفوظ كما كان");
    const badBody = await http("POST", `/api/followups/${exI.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    eq([badBody.status, msg(badBody)], [400, EXPERT_OUTSIDE_PATIENT_BRANCHES],
      "ط٢. وبديلٌ لا يصلح هو أيضاً ⟵ ٤٠٠");
    const junk = await http("POST", `/api/followups/${exI.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: "abc" });
    eq(junk.status, 400, "ط٣. ومعرّفٌ مشوَّه ⟵ ٤٠٠");
    eq(await fingerprint(pI), fI0, "ط٤. وبلا كتابة في الثلاث — أيوبُ باقٍ");
    const swap = await http("POST", `/api/followups/${exI.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    eq(swap.status, 200, "ط٥. **ذي قار تختار خبيرَها فيمضي البيع** — كان ٤٠٠ بلا مخرج");
    const woI = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pI]);
    const [fI] = await q(`SELECT branch_id, selected_expert_user_id FROM post_exam_followups WHERE id=$1`, [exI.followupId]);
    eq([woI.map((w: any) => [Number(w.branch_id), Number(w.expert_user_id)]),
      Number(fI?.branch_id), Number(fI?.selected_expert_user_id)],
      [[[DQ, U.E_DQ]], DQ, U.E_DQ], "ط٦. والعمليةُ في ذي قار بخبيرها");
    const [evI] = await q(`SELECT payload FROM post_exam_followup_events WHERE followup_id=$1
                            AND event_type='expert_selected' ORDER BY id DESC LIMIT 1`, [exI.followupId]);
    eq([Number(evI?.payload?.oldExpertUserId), Number(evI?.payload?.newExpertUserId)], [U.AYOUB, U.E_DQ],
      "ط٧. والإبدالُ بنقطة الاختيار نفسِها: «كان أيوب فصار خبيرَ ذي قار»");
    const [auI] = await q(`SELECT old_values, notes FROM audit_log WHERE entity_type='post_exam_followup'
                            AND entity_id=$1 AND notes LIKE 'استبدال الخبير%'`, [exI.followupId]);
    //  `old_values` نصُّ JSON في عموده (`logAudit` تكتبه بـ`JSON.stringify`).
    const ovI = typeof auI?.old_values === "string" ? JSON.parse(auI.old_values) : auI?.old_values;
    eq(Number(ovI?.selectedExpertUserId), U.AYOUB, "ط٨. وسطرُ التدقيق يقول المحفوظَ الذي أُبدل");
    const pI2 = await mkPatient("خبير صالح", [BG]);
    const exI2 = await signExam(pI2, S.docDQ);
    await http("POST", `/api/followups/${exI2.followupId}/expert`, S.bg, { expertUserId: U.E_BOTH });
    const keep = await http("POST", `/api/followups/${exI2.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    const woI2 = await q(`SELECT expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pI2]);
    eq([keep.status, woI2.map((w: any) => Number(w.expert_user_id))], [200, [U.E_BOTH]],
      "ط٩. **والمحفوظُ الصالحُ لا يُبدَّل من باب البيع** — كما كان");

    ok(unhandled === 0, "ي. ولا رفضَ غيرَ ملتقَط في الحزمة كلِّها", `${unhandled}`);
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await cleanup();
  }
  console.log(`\nنجح ${pass} · فشل ${fail}`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* */ }
  process.exit(2);
});
