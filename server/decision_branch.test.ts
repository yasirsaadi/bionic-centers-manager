//  **قرارُ ما بعد المعاينة للفرع الذي أرسل المريض — وخفيٌّ عن غيره ما دام
//  منتظراً** (قرارُ المالك ٢٠٢٦-٠٩-٢٥).
//
//  «إن احتاج معاينةً إضافية أو تمّ إرساله للمعاينة وهو متاحٌ لعدّة أفرع…
//  فيجب أن يعود القرارُ لهذا الفرع حصراً، فلا منطقَ من رؤية فرعٍ آخر القرار،
//  لأن الفرعَ الآخر لم ولن يعرف أن اشترى المريضُ أو لم يشترِ».
//
//  أ. بلا إتاحة: القرارُ لفرع التسجيل — كما كان.
//  ب. **الإرسالُ دون طلب جهاز**: القرارُ للفرع الذي أرسل، ويُباع فيه بخبيره.
//  ج. **القرارُ المنتظر في ملفّ المريض لفرعه وللمسؤول وحدهما**؛ والمحسومُ
//     تاريخٌ يقرؤه كلُّ فرعٍ يصل الملفّ كما كان.
//  د. ما لا يتغيّر: إرسالُ فرع التسجيل · إتاحةٌ سُحبت قبل المعاينة · طلبُ
//     الجهاز · معاينةٌ لم يُرسَل لها أحد.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:decision-branch`
import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

const PORT = 6291 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فرع-القرار";

//  ذي قار = فرعُ التسجيل · بغداد = فرعٌ مُتاح · كربلاء = فرعٌ مُتاحٌ ثانٍ.
const DHIQAR = 91, BAGHDAD = 92, KARBALA = 93;
const R_DQ = 9931, R_BG = 9932, ADMIN = 9933, BG_EXPERT = 9934, DQ_EXPERT = 9935,
  MGR_BOTH = 9936, R_KR = 9937;
const USERS = [R_DQ, R_BG, ADMIN, BG_EXPERT, DQ_EXPERT, MGR_BOTH, R_KR];

const S = {
  dq: { userId: R_DQ, role: "reception", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "استقبال ذي قار", permissions: {} },
  bg: { userId: R_BG, role: "reception", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD], displayName: "استقبال بغداد", permissions: {} },
  kr: { userId: R_KR, role: "reception", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA], displayName: "استقبال كربلاء", permissions: {} },
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0,
    accessibleBranches: [], displayName: "المسؤول", permissions: {} },
  //  مديرٌ يعمل في الفرعين — جلستُه على بغداد ونطاقُه يشمل ذي قار.
  mgrBoth: { userId: MGR_BOTH, role: "branch_manager", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD, DHIQAR], displayName: "مدير الفرعين", permissions: {} },
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

/** مريضُ أطرافٍ يسجّله استقبالُ ذي قار بالنقطة الحقيقية. */
async function register(): Promise<number> {
  const r = await http("POST", "/api/patients", S.dq, {
    name: `${MARK} ${stamp()}`, phone: phone(), referralSource: MARK,
    age: "40", height: "170", weight: "70", branchId: DHIQAR, totalCost: 0,
    treatmentType: "", sessionCount: 0, medicalCondition: "amputee",
    isAmputee: true, isMedicalSupport: false, isPhysiotherapy: false,
    amputationSite: "احادي - طرف سفلي - يمين - جوبارت", supportType: "", injurySide: "",
  });
  if (r.status !== 201) throw new Error(`تعذّر التسجيل: ${r.status} ${msg(r)}`);
  return Number(r.body.id);
}

/**
 * إتاحةُ الملفّ لفرعٍ بالباب الحقيقيّ. و`extra` جوابُ «العملية المفتوحة» حين
 * توجد (قرارٌ منتظر عمليةٌ مفتوحة) — «لا» تُبقيها في فرعها.
 */
async function grant(patientId: number, branchId: number, extra: Record<string, unknown> = {}) {
  const r = await http("POST", `/api/patients/${patientId}/branch-access`, S.admin,
    { branchId, ...extra });
  if (r.status !== 201) throw new Error(`تعذّرت الإتاحة: ${r.status} ${msg(r)}`);
}

/** «إرسال لمراجعة الطبيب» — معاينةٌ كاملة **بلا طلب جهاز**. */
const send = (patientId: number, session: any) =>
  http("POST", "/api/medical-review/requests", session, {
    patientId, serviceType: "prosthetic", requestedPath: "full",
    reviewKind: "follow_up", receptionNote: "بحاجة لمعاينة إضافية",
  });

/** المسؤولُ يوقّع معاينةَ أطرافٍ **بلا جهاز** (لا طلبَ جهازٍ على الملفّ). */
const signBare = (patientId: number) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, S.admin, {
    idempotencyKey: `dbr-${stamp()}`, caseType: "prosthetic",
    diagnosis: "بتر تحت الركبة", prescription: {},
  });

async function followupsOf(patientId: number) {
  return (await q(`SELECT id, branch_id, status, device_episode_id FROM post_exam_followups
                   WHERE patient_id=$1 ORDER BY id`, [patientId]))
    .map((r: any) => ({
      id: Number(r.id), branchId: r.branch_id === null ? null : Number(r.branch_id),
      status: String(r.status),
      episodeId: r.device_episode_id === null ? null : Number(r.device_episode_id),
    }));
}

/** ما تعرضه بطاقةُ «قرار المريض بعد المعاينة» في ملفّ المريض لهذه الجلسة. */
async function cardFor(patientId: number, session: any): Promise<{ status: number; ids: number[] }> {
  const r = await http("GET", `/api/followups/patient/${patientId}`, session);
  return {
    status: r.status,
    ids: Array.isArray(r.body) ? r.body.map((f: any) => Number(f.id)).sort((a, b) => a - b) : [],
  };
}

/** بصمةُ ما يُكتب تشغيلياً وماليّاً على الملفّ — لإثبات «صفر كتابة». */
async function writes(patientId: number) {
  const n = async (t: string) =>
    Number((await q(`SELECT count(*)::int n FROM ${t} WHERE patient_id=$1`, [patientId]))[0].n);
  return {
    orders: await n("prosthetic_work_orders"), episodes: await n("patient_device_episodes"),
    costs: await n("cost_entries"), payments: await n("payments"),
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
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار-ق'),($2,'بغداد-ق'),($3,'كربلاء-ق')
           ON CONFLICT (id) DO NOTHING`, [DHIQAR, BAGHDAD, KARBALA]);
  await cleanup();
  const SPEC = JSON.stringify(["prosthetic", "medical_support"]);
  for (const [id, role, br, ids, name, exam, expert] of [
    [R_DQ, "reception", DHIQAR, [DHIQAR], "استقبال ذي قار", false, false],
    [R_BG, "reception", BAGHDAD, [BAGHDAD], "استقبال بغداد", false, false],
    [R_KR, "reception", KARBALA, [KARBALA], "استقبال كربلاء", false, false],
    [ADMIN, "admin", null, [], "المسؤول", true, false],
    [BG_EXPERT, "prosthetics_expert", BAGHDAD, [BAGHDAD], "خبير بغداد", false, true],
    [DQ_EXPERT, "prosthetics_expert", DHIQAR, [DHIQAR], "خبير ذي قار", false, true],
    [MGR_BOTH, "branch_manager", BAGHDAD, [BAGHDAD, DHIQAR], "مدير الفرعين", false, false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_add_patients, can_view_payments,
               can_add_payments, can_write_medical_exam, medical_specialties, can_work_as_expert)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,true,true,true,$7,$8::jsonb,$9)`,
      [id, `dbr_${id}`, name, role, br, JSON.stringify(ids), exam, exam ? SPEC : "[]", expert]);
  }

  const srv = await bootRealRoutes();
  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. بلا إتاحة: القرارُ لفرع التسجيل — كما كان ──");
    // ══════════════════════════════════════════════════════════════════
    const pa = await register();
    const exA = await signBare(pa);
    eq(exA.status, 200, "أ٠. المسؤولُ يوقّع معاينةَ مريضٍ سُجّل في ذي قار", msg(exA));
    const [fa] = await followupsOf(pa);
    eq([fa?.branchId, fa?.episodeId, fa?.status], [DHIQAR, null, "awaiting_patient_decision"],
      "أ١. القرارُ في ذي قار، بلا طلب جهاز، ومنتظر");
    eq((await cardFor(pa, S.dq)).ids, [fa.id], "أ٢. واستقبالُ ذي قار يراه في ملفّ المريض");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الإرسالُ دون طلب جهاز: القرارُ للفرع الذي أرسل ──");
    // ══════════════════════════════════════════════════════════════════
    const pb = await register();
    await grant(pb, BAGHDAD);
    const sb = await send(pb, S.bg);
    eq([sb.status, sb.body?.branchId], [201, BAGHDAD],
      "ب٠. استقبالُ بغداد يرسل المريضَ للمعاينة، والطلبُ في بغداد", msg(sb));
    const exB = await signBare(pb);
    eq(exB.status, 200, "ب١. المسؤولُ يوقّع المعاينة — بلا جهاز", msg(exB));
    const [fb] = await followupsOf(pb);
    eq(fb?.episodeId, null, "ب٢. قرارٌ بلا طلب جهاز (شرطُ السيناريو)");
    eq(fb?.branchId, BAGHDAD, "ب٣. **القرارُ لبغداد — الفرعِ الذي أرسل المريض**");
    eq((await q(`SELECT branch_id FROM medical_exams WHERE patient_id=$1`, [pb]))
      .map((r: any) => Number(r.branch_id)), [DHIQAR],
      "ب٤. والمعاينةُ نفسُها على فرعها كما كانت — القرارُ وحده ما يتغيّر");
    eq((await q(`SELECT status, exam_id FROM medical_review_requests WHERE id=$1`, [sb.body?.id]))
      .map((r: any) => [r.status, Number(r.exam_id)]), [["examined", Number(exB.body?.id)]],
      "ب٥. وطلبُ بغداد أُغلق بهذه المعاينة");

    //  **وفرعُ التسجيل لا يرى قراراً ليس له، ولا يحسمه.**
    eq((await cardFor(pb, S.dq)).ids, [], "ب٦. **ذي قار لا ترى قرارَ بغداد المنتظر في ملفّ المريض**");
    eq((await cardFor(pb, S.bg)).ids, [fb.id], "ب٧. وبغدادُ تراه");
    const w0 = await writes(pb);
    const dqTry = await http("POST", `/api/followups/${fb.id}/confirm-purchase`, S.dq,
      { expertUserId: DQ_EXPERT, originalPrice: 1000000 });
    eq(dqTry.status, 403, "ب٨. **ذي قار لا تحسم قرارَ بغداد**", msg(dqTry));
    eq(await writes(pb), w0, "ب٩. وبلا كتابة");

    //  **ويُباع في بغداد بخبير بغداد** — وخبيرُ ذي قار لا يُسنَد لقرارها.
    const wrongExpert = await http("POST", `/api/followups/${fb.id}/confirm-purchase`, S.bg,
      { expertUserId: DQ_EXPERT, originalPrice: 1000000 });
    eq(wrongExpert.status, 400, "ب١٠. خبيرُ ذي قار لا يُسنَد لقرار بغداد", msg(wrongExpert));
    eq(await writes(pb), w0, "ب١١. وبلا كتابة");
    const buy = await http("POST", `/api/followups/${fb.id}/confirm-purchase`, S.bg,
      { expertUserId: BG_EXPERT, originalPrice: 1000000 });
    eq(buy.status, 200, "ب١٢. **بغدادُ تُتمّ البيع بخبيرها**", msg(buy));
    eq((await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pb]))
      .map((r: any) => [Number(r.branch_id), Number(r.expert_user_id)]), [[BAGHDAD, BG_EXPERT]],
      "ب١٣. **أمرُ التصنيع في بغداد بخبيرها**");
    eq((await q(`SELECT branch_id, status FROM patient_device_episodes WHERE patient_id=$1`, [pb]))
      .map((r: any) => [Number(r.branch_id), r.status]), [[BAGHDAD, "in_manufacturing"]],
      "ب١٤. **والجهازُ فُتح في بغداد**");
    eq((await q(`SELECT branch_id, amount FROM cost_entries WHERE patient_id=$1`, [pb]))
      .map((r: any) => [Number(r.branch_id), Number(r.amount)]), [[BAGHDAD, 1000000]],
      "ب١٥. **والكلفةُ في بغداد** — حيث وقع البيع");
    const [fb2] = await followupsOf(pb);
    eq([fb2.branchId, fb2.status], [BAGHDAD, "converted"], "ب١٦. والقرارُ محسومٌ في بغداد");
    eq((await q(`SELECT p.branch_id, pc.branch_id cb FROM patients p
                 JOIN patient_cases pc ON pc.patient_id=p.id AND pc.case_type='prosthetic'
                 WHERE p.id=$1`, [pb])).map((r: any) => [Number(r.branch_id), Number(r.cb)]),
      [[DHIQAR, DHIQAR]], "ب١٧. **والملفُّ لم يُنقَل**: فرعُ التسجيل وفرعُ الحالة ذي قار كما كانا");
    eq((await cardFor(pb, S.dq)).ids, [fb.id], "ب١٨. **والمحسومُ تاريخٌ** — ذي قار تراه بعد الحسم");

    //  **واختيارُ الخبير من بابه أيضاً** — ثمّ إتمامُ البيع بالخبير المحفوظ.
    const pb2 = await register();
    await grant(pb2, BAGHDAD);
    eq((await send(pb2, S.bg)).status, 201, "ب١٩. بغدادُ ترسل مريضاً ثانياً");
    eq((await signBare(pb2)).status, 200, "ب٢٠. ويُعايَن بلا جهاز");
    const [fc] = await followupsOf(pb2);
    eq(fc?.branchId, BAGHDAD, "ب٢١. والقرارُ لبغداد");
    const pick = await http("POST", `/api/followups/${fc.id}/expert`, S.bg, { expertUserId: BG_EXPERT });
    eq(pick.status, 200, "ب٢٢. **بغدادُ تختار خبيرَها من باب الاختيار**", msg(pick));
    const buy2 = await http("POST", `/api/followups/${fc.id}/confirm-purchase`, S.bg,
      { originalPrice: 900000 });
    eq(buy2.status, 200, "ب٢٣. ثمّ تُتمّ البيعَ بالخبير المحفوظ", msg(buy2));
    eq((await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pb2]))
      .map((r: any) => [Number(r.branch_id), Number(r.expert_user_id)]), [[BAGHDAD, BG_EXPERT]],
      "ب٢٤. وأمرُه في بغداد بخبيرها");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. القرارُ المنتظر لفرعه وللمسؤول — والمحسومُ للجميع ──");
    // ══════════════════════════════════════════════════════════════════
    //  قرارُ ذي قار (عُويِن ولم يُرسله أحد)، ثمّ أُتيح الملفُّ لبغداد.
    const pc = await register();
    eq((await signBare(pc)).status, 200, "ج٠. معاينةٌ في ذي قار");
    //  القرارُ المنتظر عمليةٌ مفتوحة، فيُسأل المسؤول — «لا»: يبقى في فرعه.
    await grant(pc, BAGHDAD, { moveOpenOperations: false });
    const [fd] = await followupsOf(pc);
    eq(fd?.branchId, DHIQAR, "ج١. والقرارُ لذي قار");
    const bgCard = await cardFor(pc, S.bg);
    eq([bgCard.status, bgCard.ids], [200, []],
      "ج٢. **بغدادُ تفتح الملفَّ ولا ترى قرارَ ذي قار المنتظر**");
    eq((await cardFor(pc, S.dq)).ids, [fd.id], "ج٣. وذي قار تراه");
    eq((await cardFor(pc, S.admin)).ids, [fd.id], "ج٤. والمسؤولُ يراه");
    eq((await cardFor(pc, S.mgrBoth)).ids, [fd.id], "ج٥. ومديرٌ نطاقُه يشمل ذي قار يراه");
    eq((await cardFor(pc, S.kr)).status, 403, "ج٦. وفرعٌ لا يصل الملفَّ يُردّ كما كان");
    //  **وحين يُحسَم يصير تاريخاً يقرؤه كلُّ فرعٍ يصل الملفّ** — كما كان.
    const closed = await http("POST", `/api/followups/${fd.id}/close`, S.dq,
      { reason: "other", note: "لم يشترِ" });
    eq(closed.status, 200, "ج٧. ذي قار تسجّل «لم يشترِ»", msg(closed));
    eq((await cardFor(pc, S.bg)).ids, [fd.id], "ج٨. **وبغدادُ تقرؤه تاريخاً بعد الحسم**");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. ما لا يتغيّر ──");
    // ══════════════════════════════════════════════════════════════════
    //  د١. أرسله فرعُ التسجيل ⟵ القرارُ له.
    const pd1 = await register();
    await grant(pd1, BAGHDAD);
    eq((await send(pd1, S.dq)).status, 201, "د١. ذي قار ترسل مريضها المُتاح لبغداد");
    await signBare(pd1);
    eq((await followupsOf(pd1)).map((f) => f.branchId), [DHIQAR], "د٢. والقرارُ لذي قار");

    //  د٢. أرسلته بغداد ثمّ سُحبت إتاحتُها قبل المعاينة ⟵ فرعُ الحالة.
    const pd2 = await register();
    await grant(pd2, BAGHDAD);
    eq((await send(pd2, S.bg)).status, 201, "د٣. بغدادُ ترسل");
    const rv = await http("DELETE", `/api/patients/${pd2}/branch-access/${BAGHDAD}`, S.admin);
    eq(rv.status, 200, "د٤. ثمّ تُسحب إتاحتُها قبل المعاينة", msg(rv));
    await signBare(pd2);
    eq((await followupsOf(pd2)).map((f) => f.branchId), [DHIQAR],
      "د٥. **والقرارُ لا يذهب لفرعٍ لم يعد يصل الملفّ** — يبقى لفرع الحالة");

    //  د٣. طلبُ جهاز ⟵ القرارُ لفرع الجهاز، ولو أرسلت بغدادُ إرسالاً آخر.
    const pd3 = await register();
    await grant(pd3, BAGHDAD);
    const dev = await http("POST", `/api/patients/${pd3}/device-episodes`, S.dq,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    eq([dev.status, dev.body?.branchId], [201, DHIQAR], "د٦. ذي قار تفتح طلبَ جهاز", msg(dev));
    const sd3 = await send(pd3, S.bg);
    eq(sd3.status, 201, "د٧. وبغدادُ ترسل إرسالاً بلا جهاز", msg(sd3));
    const exD3 = await http("POST", `/api/medical/patients/${pd3}/exams`, S.admin,
      { idempotencyKey: `dbr-${stamp()}`, caseType: "prosthetic", diagnosis: "بتر",
        prescription: {}, deviceEpisodeId: dev.body?.id });
    eq(exD3.status, 200, "د٨. والمعاينةُ على الجهاز", msg(exD3));
    eq((await followupsOf(pd3)).map((f) => [f.branchId, f.episodeId]), [[DHIQAR, Number(dev.body?.id)]],
      "د٩. **والقرارُ لفرع الجهاز كما كان** — طلبُ الجهاز هو الرابط");

    //  د٤. معاينةٌ لم يُرسَل لها أحد على ملفٍّ مُتاح ⟵ فرعُ الحالة كما كان.
    const pd4 = await register();
    await grant(pd4, BAGHDAD);
    await signBare(pd4);
    eq((await followupsOf(pd4)).map((f) => f.branchId), [DHIQAR],
      "د١٠. معاينةٌ بلا إرسال ⟵ القرارُ لفرع الحالة كما كان");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. أرسله فرعان: القرارُ لأوّلهما — الطلبُ الذي يحمله صفُّ «معايناتي» ──");
    // ══════════════════════════════════════════════════════════════════
    //  طلبٌ سريعٌ أحاله الطبيبُ إلى معاينةٍ كاملة، ثمّ إرسالٌ كاملٌ من الفرع
    //  الآخر: المعاينةُ الواحدة تُغلق الاثنين. وصفُّ «معايناتي» يحمل أقدمَهما
    //  (`pendingFullRequestsFor`: الأقدمُ أوّلاً) — فالقرارُ لفرعه، بالترتيبين.
    for (const [first, second, firstName] of [
      [S.dq, S.bg, "ذي قار"], [S.bg, S.dq, "بغداد"],
    ] as const) {
      const pe = await register();
      await grant(pe, BAGHDAD);
      const quick = await http("POST", "/api/medical-review/requests", first, {
        patientId: pe, serviceType: "prosthetic", requestedPath: "quick",
        reviewKind: "follow_up", receptionNote: "مراجعة سريعة",
      });
      eq(quick.status, 201, `هـ١. ${firstName} ترسل طلباً سريعاً أوّلاً`, msg(quick));
      const esc = await http("POST", `/api/medical-review/requests/${quick.body?.id}/decide`, S.admin,
        { decision: "require_full_exam" });
      eq([esc.status, esc.body?.status], [200, "escalated"], "هـ٢. والطبيبُ يحيله إلى معاينةٍ كاملة", msg(esc));
      const full = await send(pe, second);
      eq(full.status, 201, "هـ٣. ثمّ يرسله الفرعُ الآخر إرسالاً كاملاً", msg(full));
      const exE = await signBare(pe);
      eq(exE.status, 200, "هـ٤. معاينةٌ واحدة بلا جهاز", msg(exE));
      eq((await q(`SELECT status FROM medical_review_requests WHERE id = ANY($1::int[]) ORDER BY id`,
        [[quick.body?.id, full.body?.id]])).map((r: any) => r.status), ["examined", "examined"],
        "هـ٥. أغلقت الطلبين معاً");
      eq((await followupsOf(pe)).map((f) => f.branchId), [first.branchId],
        `هـ٦. **والقرارُ لـ${firstName} — أوّلِ مَن أرسل**`);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. قرارٌ نقله المسؤولُ بنافذة الإتاحة يُباع في فرعه الجديد ──");
    // ══════════════════════════════════════════════════════════════════
    //  «نعم» عن العملية المفتوحة تنقل القرارَ إلى الفرع المضاف (§4.t) — وهو
    //  يصل الملفّ، فبيعُه يقع فيه: خبيرُه وجهازُه هناك.
    const pf = await register();
    eq((await signBare(pf)).status, 200, "و٠. معاينةٌ في ذي قار");
    const mv = await http("POST", `/api/patients/${pf}/branch-access`, S.admin,
      { branchId: BAGHDAD, moveOpenOperations: true, keepExpert: true });
    eq(mv.status, 201, "و١. المسؤولُ يُتيح الملفَّ لبغداد وينقل إليها القرارَ المنتظر", msg(mv));
    const [ff] = await followupsOf(pf);
    eq(ff?.branchId, BAGHDAD, "و٢. والقرارُ صار في بغداد");
    const buyF = await http("POST", `/api/followups/${ff.id}/confirm-purchase`, S.bg,
      { expertUserId: BG_EXPERT, originalPrice: 800000 });
    eq(buyF.status, 200, "و٣. **بغدادُ تبيعه بخبيرها**", msg(buyF));
    eq((await q(`SELECT o.branch_id, o.expert_user_id, e.branch_id eb
                 FROM prosthetic_work_orders o JOIN patient_device_episodes e ON e.id = o.device_episode_id
                 WHERE o.patient_id=$1`, [pf]))
      .map((r: any) => [Number(r.branch_id), Number(r.expert_user_id), Number(r.eb)]),
      [[BAGHDAD, BG_EXPERT, BAGHDAD]], "و٤. **والأمرُ والجهازُ في بغداد** — حيث نُقلت مسؤوليتُه");
  } finally {
    srv.close();
    await cleanup();
  }
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} نجح · ${fail} فشل`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
