//  **تراجعٌ عن توسّعين، وإصلاحان ضيّقان** (٢٠٢٦-٠٩-٢٤).
//
//  قرارُ المالك بعد الطلبين ٤٠٩ و٤١٠: «المريضُ الذي يُشارَك مع فرعٍ آخر لا
//  يُنقَل ملفُّه — بدّل قالباً في بغداد بعد أن اشترى من ذي قار، ثمّ عاد لذي قار
//  واشترى قدماً… ممنوعٌ أن تُنقَل أموالُه من فرعه القديم». فأُرجع ما أضافه
//  الطلبان من عندي (نقلُ المتابعة وحلقتها إلى فرع الخبير، وقائمةُ الخبراء بملفّ
//  المريض، وأبوابُ المتابعة لكلّ فرعٍ يصل الملفّ، ونسبةُ المعاينة لمن أرسل
//  المريض)، وبقي أمران لا ينقلان شيئاً:
//
//  أ. **نافذةُ المعاينة تفتح على ما سجّله الاستقبال** — كانت تقرؤه من ملفّ
//     المريض، وذلك البابُ يردّ صامتاً طبيباً بلا «عرض المرضى» (٤٠٣) وطبيباً
//     يعمل في فرعين والمريضُ في غير فرع جلسته (٤٠٤)، فتفتح فارغةً من نوع البتر
//     ونوع المسند (شكوى المالك، مُعادٌ حيّاً). صارت تقرؤه من باب المعاينة.
//
//  ب. **جهازٌ فتحه الفرعُ المُتاح يُباع في فرعه** — كان البيعُ يفتح الأمرَ بفرع
//     التسجيل فيصطدم بحارس «لا أمرَ في فرعٍ وحلقتُه في آخر» ويُرمى من معالجٍ
//     غير متزامن: **لا ردَّ إطلاقاً** (مُعادٌ حيّاً). صار الأمرُ والكلفةُ والدفعةُ
//     في فرع الجهاز كما فُتح — **ولا تُنقَل متابعةٌ ولا حلقةٌ ولا مال**.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:shared-device-sale`
import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

const PORT = 6271 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-بيع-الفرع-المتاح";

//  ذي قار = فرعُ التسجيل · بغداد = الفرعُ المُتاح · كربلاء = لا يصل الملفّ.
const DHIQAR = 81, BAGHDAD = 82, KARBALA = 83;
const R_DQ = 9831, R_BG = 9832, ADMIN = 9833, D_NOVIEW = 9834, D_MULTI = 9835,
  D_KR = 9836, AYOUB = 9837, DQ_EXPERT = 9838;
const USERS = [R_DQ, R_BG, ADMIN, D_NOVIEW, D_MULTI, D_KR, AYOUB, DQ_EXPERT];

const S = {
  dq: { userId: R_DQ, role: "reception", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "استقبال ذي قار", permissions: {} },
  bg: { userId: R_BG, role: "reception", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD], displayName: "استقبال بغداد", permissions: {} },
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0,
    accessibleBranches: [], displayName: "المسؤول", permissions: {} },
  noView: { userId: D_NOVIEW, role: "doctor", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "طبيبٌ بلا عرض مرضى", permissions: {} },
  //  يعمل في الفرعين، وجلستُه على بغداد — والمريضُ مسجَّلٌ في ذي قار.
  multi: { userId: D_MULTI, role: "doctor", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD, DHIQAR], displayName: "طبيب الفرعين", permissions: {} },
  kr: { userId: D_KR, role: "doctor", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA], displayName: "طبيب كربلاء", permissions: {} },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

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
//  **بمهلةٍ صريحة**: أحدُ العطبين كان طلباً لا يعود أبداً.
async function http(method: string, path: string, session: any, body?: any): Promise<Res> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
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
const eq = (got: unknown, want: unknown, m: string, why = "") =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}${why ? ` — ${why}` : ""}`);
const msg = (r: Res) => String(r.body?.error ?? r.body?.message ?? "");

let seq = 0;
const stamp = () => `${Date.now() % 1_000_000}${++seq}`;
const phone = () => `0780${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/** تسجيلٌ بالنقطة الحقيقية كما يرسله النموذجُ — بجلسة الاستقبال. */
async function register(kind: "support" | "prosthetic") {
  const base = {
    name: `${MARK} ${kind === "support" ? "مسند" : "طرف"} ${stamp()}`,
    phone: phone(), referralSource: MARK, age: "34", height: "170", weight: "70",
    branchId: DHIQAR, totalCost: 0, treatmentType: "", sessionCount: 0,
  };
  const body = kind === "support"
    ? { ...base, medicalCondition: "medical_support", isMedicalSupport: true, isAmputee: false,
        isPhysiotherapy: false, supportType: "مسند ظهر", injurySide: "يمين", amputationSite: "" }
    : { ...base, medicalCondition: "amputee", isAmputee: true, isMedicalSupport: false,
        isPhysiotherapy: false, amputationSite: "احادي - طرف سفلي - يمين - جوبارت",
        supportType: "", injurySide: "" };
  const r = await http("POST", "/api/patients", S.dq, body);
  return { status: r.status, id: Number(r.body?.id) };
}

/** بصمةُ ما يُكتب ماليّاً وتشغيلياً على الملفّ — لإثبات «صفر كتابة». */
async function writes(patientId: number) {
  const n = async (t: string) =>
    Number((await q(`SELECT count(*)::int n FROM ${t} WHERE patient_id=$1`, [patientId]))[0].n);
  return {
    orders: await n("prosthetic_work_orders"), payments: await n("payments"),
    costs: await n("cost_entries"),
  };
}

async function cleanup() {
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source=$1`, [MARK]);
  for (const p of pts) await storage.deletePatient(Number(p.id));
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
}

process.on("unhandledRejection", (e: any) => {
  console.error("  [رفضٌ غيرُ ملتقَط]", e?.message ?? e);
});

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار-ب'),($2,'بغداد-ب'),($3,'كربلاء-ب')
           ON CONFLICT (id) DO NOTHING`, [DHIQAR, BAGHDAD, KARBALA]);
  await cleanup();
  const SPEC = JSON.stringify(["prosthetic", "medical_support"]);
  for (const [id, role, br, ids, name, view, exam, expert] of [
    [R_DQ, "reception", DHIQAR, [DHIQAR], "استقبال ذي قار", true, false, false],
    [R_BG, "reception", BAGHDAD, [BAGHDAD], "استقبال بغداد", true, false, false],
    [ADMIN, "admin", null, [], "المسؤول", true, true, false],
    [D_NOVIEW, "doctor", DHIQAR, [DHIQAR], "طبيبٌ بلا عرض مرضى", false, true, false],
    [D_MULTI, "doctor", BAGHDAD, [BAGHDAD, DHIQAR], "طبيب الفرعين", true, true, false],
    [D_KR, "doctor", KARBALA, [KARBALA], "طبيب كربلاء", true, true, false],
    [AYOUB, "prosthetics_expert", BAGHDAD, [BAGHDAD], "أيوب", false, false, true],
    [DQ_EXPERT, "prosthetics_expert", DHIQAR, [DHIQAR], "خبير ذي قار", false, false, true],
  ] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_add_patients, can_view_payments,
               can_add_payments, can_write_medical_exam, medical_specialties, can_work_as_expert)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7,$7,$7,$7,$8,$9::jsonb,$10)`,
      [id, `sds_${id}`, name, role, br, JSON.stringify(ids), view, exam,
       exam ? SPEC : "[]", expert]);
  }

  const srv = await bootRealRoutes();
  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. نافذةُ المعاينة تفتح على ما سجّله الاستقبال ──");
    // ══════════════════════════════════════════════════════════════════
    const sup = await register("support");
    const pro = await register("prosthetic");
    eq([sup.status, pro.status], [201, 201], "أ٠. الاستقبالُ يسجّل المريضين بالنقطة الحقيقية");

    //  **السببُ بعينه**: الباب القديم يردّ الطبيبين — فكانت النافذةُ تفتح فارغة.
    eq((await http("GET", `/api/patients/${sup.id}`, S.noView)).status, 403,
      "أ١. ملفُّ المريض يردّ الطبيبَ الذي لا يحمل «عرض المرضى» (٤٠٣) — كان مصدرَ النافذة");
    eq((await http("GET", `/api/patients/${sup.id}`, S.multi)).status, 404,
      "أ٢. ويردّ طبيبَ الفرعين وجلستُه على غير فرع المريض (٤٠٤)");

    const exSupNo = await http("GET", `/api/medical/patients/${sup.id}/exams`, S.noView);
    eq(exSupNo.status, 200, "أ٣. **وباب المعاينة يصله** — بنطاق قائمته نفسِه");
    eq([exSupNo.body?.registration?.supportType, exSupNo.body?.registration?.injurySide],
      ["مسند ظهر", "يمين"], "أ٤. **ويحمل نوعَ المسند وجهتَه كما سجّلهما الاستقبال**");
    const exProMulti = await http("GET", `/api/medical/patients/${pro.id}/exams`, S.multi);
    eq(exProMulti.status, 200, "أ٥. وطبيبُ الفرعين يصله كذلك");
    eq(exProMulti.body?.registration?.amputationSite, "احادي - طرف سفلي - يمين - جوبارت",
      "أ٦. **ويحمل نوعَ البتر بحرفه** — فتفتح عليه النافذة");
    //  **حقولٌ سريريةٌ وحدها — بلا مال.**
    eq(Object.keys(exSupNo.body?.registration ?? {}).sort(),
      ["amputationSite", "diseaseType", "injuries", "injuryArea", "injurySide", "injuryType",
       "supportType"], "أ٧. **سبعةُ حقولٍ سريرية لا غير** — لا كلفةَ ولا مدفوعَ ولا هاتف");
    eq((await http("GET", `/api/medical/patients/${sup.id}/exams`, S.kr)).status, 403,
      "أ٨. **والنطاقُ باقٍ**: طبيبُ فرعٍ لا يصل الملفَّ يُردّ كما كان");

    //  **والنافذةُ تقرأ من هنا لا من ملفّ المريض.**
    const dialog = readFileSync("client/src/components/medical/NewExamDialog.tsx", "utf8")
      .replace(/\/\/[^\n]*/g, "");
    ok(/const patientRow = examsData\?\.registration \?\? null;/.test(dialog),
      "أ٩. النافذةُ تقرأ ما سجّله الاستقبالُ من باب المعاينة");
    ok(!/fetch\(`\/api\/patients\/\$\{patientId\}`/.test(dialog),
      "أ١٠. **ولا تجلب ملفَّ المريض بعد اليوم** — فلا يعود الردُّ الصامتُ يُفرغها");
    ok(/enabled: open && !isEdit,/.test(dialog),
      "أ١١. وتجلبه لكلّ معاينةٍ جديدة — ولو وصل الجهازُ جاهزاً من «معايناتي»");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. جهازٌ فتحه الفرعُ المُتاح يُباع في فرعه — ولا ينتقل شيء ──");
    // ══════════════════════════════════════════════════════════════════
    const shared = await register("prosthetic");
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note)
             VALUES ($1,$2,'المسؤول','إتاحة لبغداد')`, [shared.id, BAGHDAD]);
    const dev = await http("POST", `/api/patients/${shared.id}/device-episodes`, S.bg,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    eq([dev.status, dev.body?.branchId], [201, BAGHDAD], "ب٠. بغدادُ تفتح طلبَ الجهاز في فرعها (٤٠٧)");
    const ex = await http("POST", `/api/medical/patients/${shared.id}/exams`, S.admin,
      { idempotencyKey: `sds-${stamp()}`, caseType: "prosthetic", diagnosis: "بتر تحت الركبة",
        prescription: {}, deviceEpisodeId: dev.body?.id });
    eq(ex.status, 200, "ب١. المسؤولُ يوقّع المعاينةَ على ذلك الجهاز");
    const [f0] = await q(`SELECT id, branch_id FROM post_exam_followups WHERE patient_id=$1`, [shared.id]);
    eq(Number(f0?.branch_id), BAGHDAD, "ب٢. وقرارُ ما بعد المعاينة في بغداد — فرعِ الجهاز");

    const sale = await http("POST", `/api/followups/${f0.id}/complete-sale`, S.bg,
      { originalPrice: 1500000, discountAmount: 0, expertUserId: AYOUB, paidNow: 400000 });
    eq(sale.status, 200, "ب٣. **البيعُ يمضي** — كان لا يعود ردُّه إطلاقاً", msg(sale));
    const [wo] = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`,
      [shared.id]);
    eq([Number(wo?.branch_id), Number(wo?.expert_user_id)], [BAGHDAD, AYOUB],
      "ب٤. **الأمرُ في بغداد بأيوب** — حيث فُتح الجهاز");
    eq((await q(`SELECT branch_id, amount FROM payments WHERE patient_id=$1`, [shared.id]))
      .map((r: any) => [Number(r.branch_id), Number(r.amount)]), [[BAGHDAD, 400000]],
      "ب٥. **والدفعةُ في بغداد** — حيث قُبض المال");
    eq((await q(`SELECT branch_id, amount FROM cost_entries WHERE patient_id=$1`, [shared.id]))
      .map((r: any) => [Number(r.branch_id), Number(r.amount)]), [[BAGHDAD, 1500000]],
      "ب٦. **والكلفةُ في بغداد**");
    const [f1] = await q(`SELECT branch_id, status FROM post_exam_followups WHERE id=$1`, [f0.id]);
    const [e1] = await q(`SELECT branch_id FROM patient_device_episodes WHERE id=$1`, [dev.body?.id]);
    eq([Number(f1.branch_id), f1.status, Number(e1.branch_id)], [BAGHDAD, "converted", BAGHDAD],
      "ب٧. **ولا ينتقل شيء**: القرارُ والجهازُ في فرعهما كما كانا");
    eq(Number((await q(`SELECT count(*)::int n FROM post_exam_followup_events
                        WHERE followup_id=$1 AND event_type='sale_branch_moved'`, [f0.id]))[0].n), 0,
      "ب٨. ولا سطرَ «انتقلت العملية» — النقلُ أُلغي");
    eq((await q(`SELECT branch_id FROM patients WHERE id=$1`, [shared.id]))
      .map((r: any) => Number(r.branch_id)), [DHIQAR], "ب٩. وفرعُ التسجيل ذي قار كما هو");

    //  **والمسارُ العاديّ بحرفه**: جهازُ فرع التسجيل يُباع في فرع التسجيل.
    const home = await register("prosthetic");
    const devH = await http("POST", `/api/patients/${home.id}/device-episodes`, S.dq,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    await http("POST", `/api/medical/patients/${home.id}/exams`, S.admin,
      { idempotencyKey: `sds-${stamp()}`, caseType: "prosthetic", diagnosis: "بتر",
        prescription: {}, deviceEpisodeId: devH.body?.id });
    const [fh] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1`, [home.id]);
    const saleH = await http("POST", `/api/followups/${fh.id}/complete-sale`, S.dq,
      { originalPrice: 1200000, discountAmount: 0, expertUserId: DQ_EXPERT });
    eq(saleH.status, 200, "ب١٠. جهازُ فرع التسجيل يُباع كما كان");
    eq((await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [home.id]))
      .map((r: any) => Number(r.branch_id)), [DHIQAR], "ب١١. وأمرُه في ذي قار بحرفه");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. ما أُرجع: القرارُ لفرعه، والقائمةُ بفرع القرار ──");
    // ══════════════════════════════════════════════════════════════════
    //  قرارٌ في ذي قار (جهازٌ فتحته ذي قار) على ملفٍّ مُتاحٍ لبغداد: **لفرعه** —
    //  «إن عاين في ذي قار فبانتظار الحسم لذي قار» (قرارُ المالك).
    const own = await register("prosthetic");
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note)
             VALUES ($1,$2,'المسؤول','إتاحة لبغداد')`, [own.id, BAGHDAD]);
    const devO = await http("POST", `/api/patients/${own.id}/device-episodes`, S.dq,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    await http("POST", `/api/medical/patients/${own.id}/exams`, S.admin,
      { idempotencyKey: `sds-${stamp()}`, caseType: "prosthetic", diagnosis: "بتر",
        prescription: {}, deviceEpisodeId: devO.body?.id });
    const [fo] = await q(`SELECT id, branch_id FROM post_exam_followups WHERE patient_id=$1`, [own.id]);
    eq(Number(fo.branch_id), DHIQAR, "ج٠. القرارُ في ذي قار");
    const w0 = await writes(own.id);
    const saleO = await http("POST", `/api/followups/${fo.id}/complete-sale`, S.bg,
      { originalPrice: 1000000, discountAmount: 0, expertUserId: AYOUB });
    eq([saleO.status, msg(saleO)], [403, "غير مصرح لك بهذا الفرع"],
      "ج١. **بغدادُ لا تحسم قرارَ ذي قار** — كما كان قبل ٤٠٩");
    eq(await writes(own.id), w0, "ج٢. وبلا كتابة");
    eq((await http("GET", `/api/manufacturing/experts?branchId=${DHIQAR}`, S.bg)).status, 403,
      "ج٣. وقائمةُ خبراء ذي قار ليست لاستقبال بغداد — كما كانت");
    const byPatient = await http("GET", `/api/manufacturing/experts?patientId=${own.id}`, S.admin);
    eq(byPatient.status, 400, "ج٤. **ولا قائمةَ «بملفّ المريض» بعد اليوم** — تُطلب بفرعٍ كما كانت");
    const listDq = await http("GET", `/api/manufacturing/experts?branchId=${DHIQAR}`, S.admin);
    eq((listDq.body ?? []).map((e: any) => Number(e.id)).filter((i: number) => [AYOUB, DQ_EXPERT].includes(i)),
      [DQ_EXPERT], "ج٥. والمسؤولُ يرى خبراءَ فرع القرار — أيوب ليس منهم ما لم يُلحَق حسابُه بذي قار");
    const saleA = await http("POST", `/api/followups/${fo.id}/complete-sale`, S.admin,
      { originalPrice: 1000000, discountAmount: 0, expertUserId: AYOUB });
    eq(saleA.status, 400, "ج٦. **وخبيرٌ لا يعمل في فرع القرار يُردّ** — ولو اختاره المسؤول", msg(saleA));
    eq(await writes(own.id), w0, "ج٧. وبلا كتابة");

    //  **ومصدرُ الواجهة كما كان**: القائمةُ بفرع القرار.
    for (const f of ["LegacyDecisionActions", "ExamPathDecisionActions", "PostExamDecisionCard"]) {
      const src = readFileSync(`client/src/components/${f}.tsx`, "utf8");
      ok(/\/api\/manufacturing\/experts\?branchId=/.test(src) && !/patientId=/.test(src.replace(/\/\/[^\n]*/g, "")
        .match(/\/api\/manufacturing\/experts[^`"]*/g)?.join(" ") ?? ""),
        `ج٨. ${f}: القائمةُ تُطلب بفرع القرار لا بملفّ المريض`);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. مثالُ المالك بعينه: كلُّ فرعٍ يسجّل عملياتِه، والمالُ في قاصته ──");
    // ══════════════════════════════════════════════════════════════════
    //  «بدّل قالباً في بغداد بعد أن اشترى من ذي قار، ثمّ عاد لذي قار واشترى
    //  قدماً… ممنوعٌ أن تُنقَل أموالُه من فرعه القديم». بالأبواب الحقيقية كلِّها.
    const ex1 = await register("prosthetic");
    const devD = await http("POST", `/api/patients/${ex1.id}/device-episodes`, S.dq,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    await http("POST", `/api/medical/patients/${ex1.id}/exams`, S.admin,
      { idempotencyKey: `sds-${stamp()}`, caseType: "prosthetic", diagnosis: "بتر",
        prescription: {}, deviceEpisodeId: devD.body?.id });
    const [fd] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1`, [ex1.id]);
    const buy1 = await http("POST", `/api/followups/${fd.id}/complete-sale`, S.dq,
      { originalPrice: 1500000, discountAmount: 0, expertUserId: DQ_EXPERT, paidNow: 500000 });
    eq(buy1.status, 200, "د٠. اشترى طرفاً كاملاً في ذي قار ودفع فيها", msg(buy1));
    const snap = async () => ({
      payments: (await q(`SELECT id, branch_id, amount, case_id FROM payments
                          WHERE patient_id=$1 ORDER BY id`, [ex1.id]))
        .map((r: any) => [Number(r.id), Number(r.branch_id), Number(r.amount), Number(r.case_id)]),
      costs: (await q(`SELECT id, branch_id, amount FROM cost_entries
                       WHERE patient_id=$1 ORDER BY id`, [ex1.id]))
        .map((r: any) => [Number(r.id), Number(r.branch_id), Number(r.amount)]),
      orders: (await q(`SELECT id, branch_id, expert_user_id FROM prosthetic_work_orders
                        WHERE patient_id=$1 ORDER BY id`, [ex1.id]))
        .map((r: any) => [Number(r.id), Number(r.branch_id), Number(r.expert_user_id)]),
    });
    const before = await snap();

    //  **الإتاحةُ بالباب الحقيقيّ، وجوابُ «لا» عن العملية المفتوحة** — تبقى
    //  في فرعها بخبيرها كما اتّفقنا (§4.t).
    const grant = await http("POST", `/api/patients/${ex1.id}/branch-access`, S.admin,
      { branchId: BAGHDAD, moveOpenOperations: false });
    eq(grant.status, 201, "د١. المسؤولُ يُتيح الملفَّ لبغداد، والعمليةُ القائمة تبقى", msg(grant));
    eq(await snap(), before, "د٢. **ولا يتحرّك بالإتاحة صفٌّ واحد** — لا دفعةَ ولا كلفةَ ولا أمر");

    const sock = await http("POST", "/api/no-exam/device-sale", S.bg,
      { patientId: ex1.id, component: "socket", expertUserId: AYOUB,
        originalPrice: 300000, discountAmount: 0, paidNow: 200000 });
    eq(sock.status, 201, "د٣. بغدادُ تبدّل القالبَ بأيوب وتقبض", msg(sock));
    const foot = await http("POST", "/api/no-exam/device-sale", S.dq,
      { patientId: ex1.id, component: "foot", expertUserId: DQ_EXPERT,
        originalPrice: 400000, discountAmount: 0, paidNow: 100000 });
    eq(foot.status, 201, "د٤. ثمّ عاد لذي قار فاشترى قدماً", msg(foot));

    const after = await snap();
    //  **الصفوفُ القديمة بحرفها** — نفسُ المعرّف والفرع والمبلغ والحالة.
    eq(after.payments.slice(0, before.payments.length), before.payments,
      "د٥. **دفعةُ ذي قار الأولى كما هي بحرفها** — لم تنتقل إلى بغداد");
    eq(after.costs.slice(0, before.costs.length), before.costs,
      "د٦. وكلفتُها كذلك");
    eq(after.orders.slice(0, before.orders.length), before.orders,
      "د٧. وأمرُ الطرف في ذي قار بخبيره كما كان");
    //  **وكلُّ حركةٍ جديدة في فرعها**.
    eq(after.payments.slice(before.payments.length).map(([, b, a]) => [b, a]),
      [[BAGHDAD, 200000], [DHIQAR, 100000]], "د٨. **دفعةُ القالب في بغداد ودفعةُ القدم في ذي قار**");
    eq(after.costs.slice(before.costs.length).map(([, b, a]) => [b, a]),
      [[BAGHDAD, 300000], [DHIQAR, 400000]], "د٩. والكلفتان كذلك — كلٌّ في فرعه");
    eq(after.orders.slice(before.orders.length).map(([, b, e]) => [b, e]),
      [[BAGHDAD, AYOUB], [DHIQAR, DQ_EXPERT]], "د١٠. وأمرُ القالب في بغداد بأيوب، وأمرُ القدم في ذي قار");
    //  **وقاصةُ كلّ فرعٍ تساوي ما قبضه فعلاً.**
    const box = await q(`SELECT branch_id, sum(amount)::bigint s FROM payments
                         WHERE patient_id=$1 GROUP BY branch_id ORDER BY branch_id`, [ex1.id]);
    eq(box.map((r: any) => [Number(r.branch_id), Number(r.s)]),
      [[DHIQAR, 600000], [BAGHDAD, 200000]], "د١١. **قاصةُ ذي قار ٦٠٠ ألف وقاصةُ بغداد ٢٠٠ ألف** — ما قبضه كلٌّ بيده");
    eq((await q(`SELECT p.branch_id, pc.branch_id cb FROM patients p
                 JOIN patient_cases pc ON pc.patient_id=p.id AND pc.case_type='prosthetic'
                 WHERE p.id=$1`, [ex1.id])).map((r: any) => [Number(r.branch_id), Number(r.cb)]),
      [[DHIQAR, DHIQAR]], "د١٢. وفرعُ التسجيل وفرعُ الحالة ذي قار كما كانا — الملفُّ لم يُنقَل");
  } finally {
    srv.close();
    await cleanup();
  }
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} نجح · ${fail} فشل`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
