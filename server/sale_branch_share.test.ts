//  **البيعُ على ملفٍّ مُتاحٍ لفرعين — الخبيرُ من أيّ فرعٍ من فروعه، والعمليةُ
//  حيث يعمل الخبير** (٢٠٢٦-٠٩-٢٤).
//
//  شكوى المالك: «زهراء» مسجَّلةٌ في ذي قار ومُتاحةٌ لبغداد. عاينها الطبيب، ثمّ
//  ضغط استقبالُ بغداد «اشترى» **فلم يجد خبيراً واحداً**، ثمّ فتح المسؤولُ
//  القائمةَ **فوجدهم كلَّهم إلّا أيوب** — وهو يريد أيوب. مُعادٌ حيّاً قبل أيّ
//  تعديل، والأسبابُ ثلاثة:
//
//    ① قائمةُ الخبراء كانت تُطلب **بفرع المتابعة** (ذي قار): استقبالُ بغداد
//       يُردّ ٤٠٣ فتصير قائمةً فارغةً بصمت، والمسؤولُ يرى ذي قار وحدها.
//    ② والحفظُ يقيس الخبيرَ بفرع التسجيل أو بفرع المتابعة وحده: أيوب يُردّ
//       «الخبير غير مسموح له بالعمل في هذا الفرع» — وبغدادُ تُردّ أصلاً ٤٠٣
//       لأن المتابعةَ في ذي قار.
//    ③ والمعاينةُ التي أرسلتها بغداد (بلا طلب جهاز) نُسبت لفرع الحالة، فوُلدت
//       متابعتُها في طابور ذي قار لا حيث تقف المريضة. وبيعُ حلقةٍ فتحتها بغداد
//       كان يصطدم بحارس «لا أمرَ في فرعٍ وحلقتُه في آخر» فيُرمى **بلا ردٍّ
//       إطلاقاً** (الطلبُ معلَّق).
//
//  **وقاعدةُ المالك**: «لا أحبّ القيود الصارمة — اجعل النظامَ سهلاً ومتاحاً
//  قدر الإمكان ضمن الشروط والأفرع». فالمرشَّحون = فروعُ ملفّ المريض ∩ نطاقُ
//  الفاعل، والخبيرُ المختار يحسم فرعَ العملية فتنتقل إليه متابعتُها وحلقتُها.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:sale-branch-share`
import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import * as followupStore from "./followup/store";
import {
  saleCandidateBranches, pickSaleBranch, EXPERT_OUTSIDE_PATIENT_BRANCHES,
} from "./followup/sale_branch";

const PORT = 6231 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فرع-البيع";

//  ذي قار = فرعُ التسجيل · بغداد = الفرعُ المُتاح · كربلاء = فرعٌ لا يصل الملفّ.
const DQ = 71, BG = 72, KR = 73;
const U = {
  ADMIN: 9710, R_DQ: 9711, R_BG: 9712, R_KR: 9713,
  DOC_DQ: 9714, DOC_BG: 9715,
  E_DQ: 9721, AYOUB: 9722, E_BOTH: 9723, E_OFF: 9724,
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
  kr: sess(U.R_KR, "reception", KR, [KR], "استقبال كربلاء"),
  docDQ: sess(U.DOC_DQ, "doctor", DQ, [DQ], "طبيب ذي قار"),
  docBG: sess(U.DOC_BG, "doctor", BG, [BG], "طبيب بغداد"),
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
//  **بمهلةٍ صريحة**: أحدُ الأعطاب المُعادة طلبٌ لا يعود أبداً.
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
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const msg = (r: Res) => String(r.body?.error ?? r.body?.message ?? "");

async function mkPatient(label: string, shareWith: number[]) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition,
       amputation_site, branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost,
       patient_classification)
     VALUES ($1,'07801112233',$2,'30','160','60','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
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

/** يوقّع المعاينةَ طبيبٌ بعينه ويُرجع متابعتَها (بلا تصنيع). */
async function signExam(patientId: number, doctor: any, deviceEpisodeId?: number) {
  const key = crypto.randomUUID();
  const body: any = { idempotencyKey: key, caseType: "prosthetic", diagnosis: "بتر تحت الركبة",
    prescription: {} };
  if (deviceEpisodeId) body.deviceEpisodeId = deviceEpisodeId;
  const r = await http("POST", `/api/medical/patients/${patientId}/exams`, doctor, body);
  const [f] = await q(`SELECT id, branch_id, device_episode_id, status FROM post_exam_followups
                        WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [patientId]);
  return { res: r, key, body, followupId: Number(f?.id ?? 0), followupBranch: f?.branch_id ?? null };
}

/** بصمةُ الكتابة على الملفّ — لإثبات «صفر كتابة» على كلّ رفض. */
async function fingerprint(patientId: number) {
  const one = async (t: string, cols: string) =>
    JSON.stringify(await q(`SELECT ${cols} FROM ${t} WHERE patient_id=$1 ORDER BY id`, [patientId]));
  return {
    followups: await one("post_exam_followups", "id, status, branch_id, device_episode_id, selected_expert_user_id"),
    episodes: await one("patient_device_episodes", "id, status, branch_id"),
    orders: await one("prosthetic_work_orders", "id, branch_id, expert_user_id"),
    costs: await one("cost_entries", "id, branch_id, amount"),
    payments: await one("payments", "id, branch_id, amount"),
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
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار'),($2,'بغداد'),($3,'كربلاء')
           ON CONFLICT (id) DO NOTHING`, [DQ, BG, KR]);
  const names = Object.fromEntries((await q(`SELECT id, name FROM branches WHERE id = ANY($1::int[])`,
    [[DQ, BG, KR]])).map((r: any) => [Number(r.id), String(r.name)]));
  await cleanup();
  const users: any[] = [
    [U.ADMIN, "admin", null, [], "المسؤول", null, true],
    [U.R_DQ, "reception", DQ, [DQ], "استقبال ذي قار", null, true],
    [U.R_BG, "reception", BG, [BG], "استقبال بغداد", null, true],
    [U.R_KR, "reception", KR, [KR], "استقبال كربلاء", null, true],
    [U.DOC_DQ, "doctor", DQ, [DQ], "طبيب ذي قار", '["prosthetic"]', true],
    [U.DOC_BG, "doctor", BG, [BG], "طبيب بغداد", '["prosthetic"]', true],
    [U.E_DQ, "prosthetics_expert", DQ, [DQ], "خبير ذي قار", null, true],
    [U.AYOUB, "prosthetics_expert", BG, [BG], "أيوب", null, true],
    [U.E_BOTH, "prosthetics_expert", DQ, [DQ, BG], "خبير الفرعين", null, true],
    [U.E_OFF, "prosthetics_expert", BG, [BG], "خبير موقوف", null, false],
  ];
  for (const [id, role, br, ids, name, spec, active] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_add_patients, can_view_payments,
               can_add_payments, medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,$8,true,true,true,true,$7::jsonb)`,
      [id, `sbs_${id}`, name, role, br, JSON.stringify(ids), spec, active]);
  }

  const srv = await bootRealRoutes();
  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. القرارُ الخالص: المرشَّحون والمفاضلة ──");
    // ══════════════════════════════════════════════════════════════════
    eq(saleCandidateBranches([BG], [DQ, BG]), [BG], "أ١. استقبالُ بغداد: فروعُ الملفّ ∩ نطاقُه = بغداد وحدها");
    eq(saleCandidateBranches(null, [DQ, BG]), [DQ, BG], "أ٢. المسؤول: فروعُ الملفّ كلُّها، التسجيلُ أوّلاً");
    eq(saleCandidateBranches([KR], [DQ, BG]), [], "أ٣. فرعٌ لا يصل الملفّ: لا مرشَّح");
    eq(pickSaleBranch({ candidates: [DQ, BG], workBranches: [BG], prefer: [DQ, null, DQ] }), BG,
      "أ٤. **أيوب يعمل في بغداد وحدها ⟵ البيعُ في بغداد** ولو كانت المتابعةُ في ذي قار");
    eq(pickSaleBranch({ candidates: [DQ, BG], workBranches: [DQ, BG], prefer: [DQ, BG, DQ] }), DQ,
      "أ٥. خبيرٌ في الفرعين ⟵ فرعُ المتابعة أوّلاً (لا نقلَ بلا سبب)");
    eq(pickSaleBranch({ candidates: [DQ, BG], workBranches: [DQ, BG], prefer: [null, BG, DQ] }), BG,
      "أ٦. وبلا فرعِ متابعة ⟵ فرعُ جلسة الفاعل");
    eq(pickSaleBranch({ candidates: [BG], workBranches: [DQ], prefer: [DQ, BG, DQ] }), null,
      "أ٧. خبيرٌ لا يعمل في أيّ مرشَّح ⟵ `null` (يُردّ ولا يُخمَّن)");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. قائمةُ الخبراء بملفّ المريض ──");
    // ══════════════════════════════════════════════════════════════════
    const pList = await mkPatient("قائمة", [BG]);
    const list = async (who: any, pid: number) =>
      http("GET", `/api/manufacturing/experts?patientId=${pid}`, who);
    const namesOf = (r: Res) => (Array.isArray(r.body) ? r.body.map((e: any) => e.displayName).sort() : []);
    const lBG = await list(S.bg, pList);
    //  **وبفروعه** — الوضعُ القديم (بلا `patientId`) يُرجع لغير المسؤول خبراءَ
    //  فرع جلسته، فيصادف أن تكون الأسماءُ نفسَها لبغداد. فالفرعُ على الصفّ هو
    //  ما يثبت أن القائمةَ بُنيت من ملفّ المريض لا من فرع الجلسة.
    const ayoubBG = (Array.isArray(lBG.body) ? lBG.body : [])
      .find((e: any) => e.displayName === "أيوب");
    eq([lBG.status, namesOf(lBG), ayoubBG?.branchNames], [200, ["أيوب", "خبير الفرعين"].sort(), [names[BG]]],
      "ب١. **استقبالُ بغداد يرى أيوب بفرعه** — كانت قائمةً فارغة (٤٠٣ بفرع المتابعة)");
    const lDQ = await list(S.dq, pList);
    const dqRow = (Array.isArray(lDQ.body) ? lDQ.body : [])
      .find((e: any) => e.displayName === "خبير ذي قار");
    eq([namesOf(lDQ), dqRow?.branchNames], [["خبير الفرعين", "خبير ذي قار"].sort(), [names[DQ]]],
      "ب٢. واستقبالُ ذي قار يرى خبراءَ فرعه بفرعهم");
    const lAdm = await list(S.admin, pList);
    eq(namesOf(lAdm), ["أيوب", "خبير الفرعين", "خبير ذي قار"].sort(),
      "ب٣. **والمسؤولُ يرى الجميع ومنهم أيوب** — كان يرى ذي قار وحدها");
    //  **والمصفوفةُ تُفحَص قبل القراءة** — ردٌّ ليس قائمةً (خطأٌ أو شكلٌ قديم)
    //  يُسجَّل فشلاً في بنده، لا انهياراً يُخفي بقيّةَ الأقسام.
    const admRows: any[] = Array.isArray(lAdm.body) ? lAdm.body : [];
    const both = admRows.find((e: any) => e.displayName === "خبير الفرعين");
    eq(both?.branchNames, [names[DQ], names[BG]], "ب٤. ولكلّ خبيرٍ فروعُه بأسمائها");
    ok(Array.isArray(lAdm.body) && !admRows.some((e: any) => e.displayName === "خبير موقوف"),
      "ب٥. والموقوفُ لا يُعرَض");
    eq((await list(S.kr, pList)).status, 403, "ب٦. **وكربلاء لا تصل الملفّ** ⟵ ٤٠٣ كما كان");
    const pOnly = await mkPatient("غير مُتاح", []);
    eq(namesOf(await list(S.admin, pOnly)), ["خبير الفرعين", "خبير ذي قار"].sort(),
      "ب٧. **والمريضُ غيرُ المُتاح كما كان بحرفه**: خبراءُ فرعه وحده");
    eq((await list(S.bg, pOnly)).status, 403, "ب٨. وبغدادُ لا تصله");
    eq((await http("GET", `/api/manufacturing/experts?branchId=${DQ}`, S.bg)).status, 403,
      "ب٩. **وطلبُ الفرع القديم لم يتغيّر**: بغدادُ لا تقرأ خبراءَ ذي قار بالفرع");
    eq((await http("GET", `/api/manufacturing/experts?patientId=abc`, S.admin)).status, 400,
      "ب١٠. ومعرّفُ مريضٍ مشوَّه ⟵ ٤٠٠ لا «كلّ الخبراء»");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. شكلُ «زهراء» على الإنتاج: متابعتُها في ذي قار، واستقبالُ بغداد يبيع بأيوب ──");
    // ══════════════════════════════════════════════════════════════════
    const pZ = await mkPatient("زهراء", [BG]);
    const exZ = await signExam(pZ, S.docDQ);
    eq([exZ.res.status, Number(exZ.followupBranch)], [200, DQ],
      "ج١. معاينةٌ بلا إرسالٍ من بغداد ⟵ المتابعةُ في ذي قار (كما هي على الإنتاج اليوم)");
    const cardBG = await http("GET", `/api/followups/patient/${pZ}`, S.bg);
    ok(cardBG.status === 200 && Array.isArray(cardBG.body)
      && cardBG.body.some((f: any) => Number(f.id) === exZ.followupId),
      "ج٢. بطاقتُها تُقرأ لبغداد (كما كانت)", `status ${cardBG.status}`);
    const buyBG = await http("POST", `/api/followups/${exZ.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    eq(buyBG.status, 200, "ج٣. **استقبالُ بغداد «اشترى» مع أيوب ⟵ ٢٠٠** — كان ٤٠٣ «غير مصرح لك بهذا الفرع»");
    const [fZ] = await q(`SELECT status, branch_id, device_episode_id, selected_expert_user_id
                            FROM post_exam_followups WHERE id=$1`, [exZ.followupId]);
    eq([fZ?.status, Number(fZ?.branch_id), Number(fZ?.selected_expert_user_id)], ["converted", BG, U.AYOUB],
      "ج٤. **والمتابعةُ انتقلت إلى بغداد مع خبيرها** وتحوّلت");
    const [evZ] = await q(`SELECT payload FROM post_exam_followup_events
                            WHERE followup_id=$1 AND event_type='sale_branch_moved'`, [exZ.followupId]);
    eq([Number(evZ?.payload?.fromBranchId), Number(evZ?.payload?.toBranchId)], [DQ, BG],
      "ج٥. وحدثٌ يقول من أين إلى أين");
    eq([evZ?.payload?.fromBranchName, evZ?.payload?.toBranchName, Number(evZ?.payload?.expertUserId)],
      [names[DQ], names[BG], U.AYOUB],
      "ج٥أ. **وبأسماء الفرعين لقطةً** — فسجلُّ الإجراءات يقرأ «من ذي قار إلى بغداد» لا رقمين");
    const [epZ] = await q(`SELECT status, branch_id FROM patient_device_episodes WHERE id=$1`, [fZ?.device_episode_id]);
    eq([epZ?.status, Number(epZ?.branch_id)], ["in_manufacturing", BG], "ج٦. **والجهازُ وُلد في بغداد** وهو قيد التصنيع");
    const woZ = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pZ]);
    eq(woZ.map((w: any) => [Number(w.branch_id), Number(w.expert_user_id)]), [[BG, U.AYOUB]],
      "ج٧. **وأمرُ التصنيع في بغداد بخبيرها أيوب** — أمرٌ واحد");
    const costZ = await q(`SELECT DISTINCT branch_id FROM cost_entries WHERE patient_id=$1`, [pZ]);
    eq(costZ.map((c: any) => Number(c.branch_id)), [BG], "ج٨. **والكلفةُ قُيّدت في بغداد** — حيث وقع البيع");
    const [exRow] = await q(`SELECT branch_id FROM medical_exams WHERE patient_id=$1`, [pZ]);
    eq(Number(exRow?.branch_id), DQ, "ج٩. والمعاينةُ نفسُها باقيةٌ بفرعها — التاريخُ لا يُعاد كتابتُه");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. المسؤولُ يختار أيوب ⟵ بغداد · ويختار خبيرَ ذي قار ⟵ تبقى ذي قار ──");
    // ══════════════════════════════════════════════════════════════════
    const pA = await mkPatient("المسؤول-أيوب", [BG]);
    const exA = await signExam(pA, S.docDQ);
    const buyA = await http("POST", `/api/followups/${exA.followupId}/confirm-purchase`, S.admin,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    eq(buyA.status, 200, "د١. **المسؤولُ «اشترى» مع أيوب ⟵ ٢٠٠** — كان «الخبير غير مسموح له بالعمل في هذا الفرع»");
    const woA = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pA]);
    eq(woA.map((w: any) => Number(w.branch_id)), [BG], "د٢. والعمليةُ في بغداد حيث يعمل أيوب");
    const pA2 = await mkPatient("المسؤول-ذي قار", [BG]);
    const exA2 = await signExam(pA2, S.docDQ);
    const buyA2 = await http("POST", `/api/followups/${exA2.followupId}/confirm-purchase`, S.admin,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    eq(buyA2.status, 200, "د٣. والمسؤولُ مع خبير ذي قار ⟵ ٢٠٠");
    const [fA2] = await q(`SELECT branch_id FROM post_exam_followups WHERE id=$1`, [exA2.followupId]);
    const moved2 = await q(`SELECT 1 FROM post_exam_followup_events WHERE followup_id=$1 AND event_type='sale_branch_moved'`, [exA2.followupId]);
    eq([Number(fA2?.branch_id), moved2.length], [DQ, 0], "د٤. **ولا نقلَ بلا سبب**: تبقى في ذي قار بلا حدثِ نقل");
    const pA3 = await mkPatient("المسؤول-الفرعين", [BG]);
    const exA3 = await signExam(pA3, S.docDQ);
    await http("POST", `/api/followups/${exA3.followupId}/confirm-purchase`, S.admin,
      { originalPrice: 1500000, expertUserId: U.E_BOTH });
    const woA3 = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pA3]);
    eq(woA3.map((w: any) => Number(w.branch_id)), [DQ],
      "د٥. خبيرٌ في الفرعين والبائعُ المسؤول ⟵ فرعُ المتابعة (ذي قار)");
    const pB3 = await mkPatient("بغداد-الفرعين", [BG]);
    const exB3 = await signExam(pB3, S.docDQ);
    await http("POST", `/api/followups/${exB3.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.E_BOTH });
    const woB3 = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pB3]);
    eq(woB3.map((w: any) => Number(w.branch_id)), [BG],
      "د٦. **والخبيرُ نفسُه يبيعه استقبالُ بغداد ⟵ بغداد** — نطاقُ البائع يحسم");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ه. مسارُ المعاينة: الجهازُ في ذي قار، واستقبالُ بغداد يُتمّ البيع مع أيوب ──");
    // ══════════════════════════════════════════════════════════════════
    const pE = await mkPatient("مسار المعاينة", [BG]);
    const devE = await http("POST", `/api/patients/${pE}/device-episodes`, S.dq,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    const epE = Number(devE.body?.id ?? 0);
    const exE = await signExam(pE, S.docDQ, epE);
    eq([exE.res.status, Number(exE.followupBranch)], [200, DQ], "ه١. الجهازُ والمتابعةُ في ذي قار");
    const csE = await http("POST", `/api/followups/${exE.followupId}/complete-sale`, S.bg,
      { originalPrice: 1800000, discountAmount: 100000, expertUserId: U.AYOUB, paidNow: 500000 });
    eq(csE.status, 200, "ه٢. **استقبالُ بغداد «إتمام البيع» مع أيوب ⟵ ٢٠٠**");
    const [epE2] = await q(`SELECT status, branch_id FROM patient_device_episodes WHERE id=$1`, [epE]);
    eq([epE2?.status, Number(epE2?.branch_id)], ["in_manufacturing", BG],
      "ه٣. **والجهازُ انتقل إلى بغداد بهويّته** وهو قيد التصنيع");
    const woE = await q(`SELECT branch_id, expert_user_id, device_episode_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pE]);
    eq(woE.map((w: any) => [Number(w.branch_id), Number(w.expert_user_id), Number(w.device_episode_id)]),
      [[BG, U.AYOUB, epE]], "ه٤. وأمرٌ واحد في بغداد على الجهاز نفسِه");
    const payE = await q(`SELECT branch_id, amount FROM payments WHERE patient_id=$1`, [pE]);
    eq(payE.map((p: any) => [Number(p.branch_id), Number(p.amount)]), [[BG, 500000]],
      "ه٥. **والدفعةُ قُبضت في بغداد**");
    const [auE] = await q(`SELECT branch_id FROM audit_log WHERE entity_type='post_exam_followup'
                             AND entity_id=$1 AND notes LIKE 'إتمامُ بيعٍ مبسّط%'`, [exE.followupId]);
    eq(Number(auE?.branch_id), BG, "ه٦. وسطرُ التدقيق بفرع البيع");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. الحدودُ باقية — وكلُّ رفضٍ بلا كتابة ──");
    // ══════════════════════════════════════════════════════════════════
    const pR = await mkPatient("رفض", [BG]);
    const exR = await signExam(pR, S.docDQ);
    const f0 = await fingerprint(pR);
    const badExpert = await http("POST", `/api/followups/${exR.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    eq([badExpert.status, msg(badExpert)], [400, EXPERT_OUTSIDE_PATIENT_BRANCHES],
      "و١. **استقبالُ بغداد لا يختار خبيرَ ذي قار** — ليس من فروعه");
    eq(await fingerprint(pR), f0, "و٢. وبلا كتابة");
    const off = await http("POST", `/api/followups/${exR.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.E_OFF });
    eq([off.status, msg(off)], [400, "حساب الخبير غير فعّال"], "و٣. والموقوفُ يُردّ برسالته");
    const krBuy = await http("POST", `/api/followups/${exR.followupId}/confirm-purchase`, S.kr,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    eq(krBuy.status, 403, "و٤. **وكربلاء لا تصل الملفّ** ⟵ ٤٠٣");
    const krCard = await http("GET", `/api/followups/patient/${pR}`, S.kr);
    eq(krCard.status, 403, "و٥. ولا تقرأ بطاقتَه");
    eq(await fingerprint(pR), f0, "و٦. وبلا كتابة");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. إعادةُ الفحص تحت القفل — لا يُصدَّق فرعٌ لم يعد صالحاً ──");
    // ══════════════════════════════════════════════════════════════════
    const pL = await mkPatient("تحت القفل", [BG]);
    const exL = await signExam(pL, S.docDQ);
    await q(`UPDATE post_exam_followups SET approved_price=1500000, selected_expert_user_id=$2 WHERE id=$1`,
      [exL.followupId, U.AYOUB]);
    const fL0 = await fingerprint(pL);
    let errKR: any = null;
    try {
      await followupStore.confirmPurchase({
        followupId: exL.followupId, actor: { userId: U.ADMIN, userName: "المسؤول" }, saleBranchId: KR,
      });
    } catch (e) { errKR = e; }
    eq([errKR?.status, String(errKR?.message ?? "")],
      [409, "الخبير غير مسموح له بالعمل في هذا الفرع — حدّث الصفحة واختر الخبير من جديد"],
      "ز١. **فرعُ بيعٍ لا يعمل فيه الخبير ⟵ ٤٠٩** — يُعاد فحصُه تحت القفل ولا يُصدَّق");
    //  **وفرعٌ من فروع الملفّ لا يعمل فيه الخبير** — الشكلُ الذي يعزل هذا الحارسَ
    //  وحده: كربلاءُ أعلاه يردّها حارسُ الإتاحة أيضاً، أمّا ذي قار فتصل الملفَّ،
    //  وأيوبُ لا يعمل فيها (خبيرٌ خرج من فرعٍ بين عرض القائمة والحفظ). **ولا
    //  حارسَ ثانٍ خلفه**: `assignManufacturing` لا يُعيد فحصَ الخبير بالفرع.
    let errDQ: any = null;
    try {
      await followupStore.confirmPurchase({
        followupId: exL.followupId, actor: { userId: U.ADMIN, userName: "المسؤول" }, saleBranchId: DQ,
      });
    } catch (e) { errDQ = e; }
    eq([errDQ?.status, String(errDQ?.message ?? "")],
      [409, "الخبير غير مسموح له بالعمل في هذا الفرع — حدّث الصفحة واختر الخبير من جديد"],
      "ز١ب. **وفرعٌ من فروع الملفّ لا يعمل فيه الخبير ⟵ ٤٠٩ كذلك** — لا يُباع بخبيرٍ خارج فرعه");
    await q(`UPDATE system_users SET branch_ids = $2::jsonb WHERE id=$1`, [U.AYOUB, JSON.stringify([BG, KR])]);
    let errReach: any = null;
    try {
      await followupStore.confirmPurchase({
        followupId: exL.followupId, actor: { userId: U.ADMIN, userName: "المسؤول" }, saleBranchId: KR,
      });
    } catch (e) { errReach = e; }
    await q(`UPDATE system_users SET branch_ids = $2::jsonb WHERE id=$1`, [U.AYOUB, JSON.stringify([BG])]);
    eq([errReach?.status, String(errReach?.message ?? "")],
      [409, "لم يعد هذا الفرع يصل ملفّ المريض — حدّث الصفحة وأعد المحاولة"],
      "ز٢. **وفرعٌ لا يصل الملفّ ⟵ ٤٠٩ ولو عمل فيه الخبير**");
    eq(await fingerprint(pL), fL0, "ز٣. وبلا كتابة في الحالات الثلاث");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. الطلبُ الذي كان يبقى بلا ردّ ──");
    // ══════════════════════════════════════════════════════════════════
    const pH = await mkPatient("بلا رد", [BG]);
    const devH = await http("POST", `/api/patients/${pH}/device-episodes`, S.bg,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    const epH = Number(devH.body?.id ?? 0);
    const exH = await signExam(pH, S.docBG, epH);
    eq(Number(exH.followupBranch), BG, "ح١. جهازٌ فتحته بغداد ⟵ متابعتُه في بغداد");
    await q(`UPDATE patient_device_episodes SET status='awaiting_exam' WHERE id=$1`, [epH]);
    const fH0 = await fingerprint(pH);
    const csH = await http("POST", `/api/followups/${exH.followupId}/complete-sale`, S.bg,
      { originalPrice: 1500000, discountAmount: 0, expertUserId: U.AYOUB });
    ok(csH.status === 409 && msg(csH).length > 0,
      "ح٢. **خطأُ طبقة الحلقات يُقال ٤٠٩** — كان يُرمى فيبقى الطلبُ بلا ردّ", `${csH.status} ${msg(csH)}`);
    eq(await fingerprint(pH), fH0, "ح٣. والمعاملةُ تراجعت كاملةً — بلا كتابة");
    await q(`UPDATE patient_device_episodes SET status='examined' WHERE id=$1`, [epH]);
    //  **والبابُ الداخليّ بلا فرعِ بيع** (اعتمادُ خصمٍ قديمٍ معلَّق): العمليةُ في فرع
    //  حلقتها — كان يُفتَح بفرع التسجيل فيصطدم بالحارس ٤٠٩.
    await q(`UPDATE post_exam_followups SET approved_price=1500000, selected_expert_user_id=$2 WHERE id=$1`,
      [exH.followupId, U.AYOUB]);
    let errH: any = null;
    try {
      await followupStore.confirmPurchase({
        followupId: exH.followupId, actor: { userId: U.ADMIN, userName: "المسؤول" },
      });
    } catch (e) { errH = e; }
    ok(errH === null, "ح٤. **بلا فرعِ بيعٍ صريح ⟵ فرعُ الحلقة** — كان ٤٠٩ «مفتوحٌ على فرعٍ آخر»",
      String(errH?.message));
    const woH = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pH]);
    eq(woH.map((w: any) => Number(w.branch_id)), [BG], "ح٥. والأمرُ مع حلقته في بغداد");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. المعاينةُ لمن أرسل المريض ──");
    // ══════════════════════════════════════════════════════════════════
    const pX = await mkPatient("إرسال بغداد", [BG]);
    const send = await http("POST", "/api/medical-review/requests", S.bg,
      { patientId: pX, serviceType: "prosthetic", requestedPath: "full", reviewKind: "new_device" });
    eq([send.status, Number(send.body?.branchId)], [201, BG], "ط١. بغدادُ ترسلها للطبيب");
    const exX = await signExam(pX, S.docBG);
    const [exXRow] = await q(`SELECT id, branch_id FROM medical_exams WHERE patient_id=$1`, [pX]);
    eq([exX.res.status, Number(exXRow?.branch_id), Number(exX.followupBranch)], [200, BG, BG],
      "ط٢. **المعاينةُ ومتابعتُها في بغداد** — كانتا في ذي قار (فرع الحالة)");
    const replay = await http("POST", `/api/medical/patients/${pX}/exams`, S.docBG, exX.body);
    eq([replay.status, Number(replay.body?.id), replay.body?.created], [200, Number(exXRow?.id), false],
      "ط٣. **وإعادةُ الإرسال بالمفتاح نفسِه تُعيد المعاينةَ نفسَها** — لا «هويّةٌ مختلفة»");
    const nEx = await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pX]);
    eq(Number(nEx[0].n), 1, "ط٤. ومعاينةٌ واحدة");
    const qBG = await http("GET", "/api/followups/decision-queue?state=waiting", S.bg);
    ok((qBG.body?.rows ?? []).some((r: any) => Number(r.followupId) === exX.followupId),
      "ط٥. **وتظهر في «بانتظار الحسم» لبغداد**");
    const qDQ = await http("GET", "/api/followups/decision-queue?state=waiting", S.dq);
    ok(!(qDQ.body?.rows ?? []).some((r: any) => Number(r.followupId) === exX.followupId),
      "ط٦. ولا تظهر في طابور ذي قار");
    //  طلبٌ من فرعٍ لم يعد يصل الملفّ ⟵ القاعدةُ القائمة (فرعُ الحالة).
    const pY = await mkPatient("سحب الإتاحة", [BG]);
    await http("POST", "/api/medical-review/requests", S.bg,
      { patientId: pY, serviceType: "prosthetic", requestedPath: "full", reviewKind: "new_device" });
    await q(`DELETE FROM patient_branch_access WHERE patient_id=$1`, [pY]);
    await signExam(pY, S.docDQ);
    const [exYRow] = await q(`SELECT branch_id FROM medical_exams WHERE patient_id=$1`, [pY]);
    eq(Number(exYRow?.branch_id), DQ, "ط٧. طلبٌ من فرعٍ سُحبت إتاحتُه ⟵ فرعُ الحالة كما كان");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. ضغطتان متزامنتان على بيعٍ ينقل العملية ──");
    // ══════════════════════════════════════════════════════════════════
    const pC = await mkPatient("تزامن", [BG]);
    const exC = await signExam(pC, S.docDQ);
    const [c1, c2] = await Promise.all([
      http("POST", `/api/followups/${exC.followupId}/confirm-purchase`, S.bg,
        { originalPrice: 1500000, expertUserId: U.AYOUB }),
      http("POST", `/api/followups/${exC.followupId}/confirm-purchase`, S.bg,
        { originalPrice: 1500000, expertUserId: U.AYOUB }),
    ]);
    eq([c1.status, c2.status].sort(), [200, 409].sort(), "ي١. واحدةٌ تنجح والأخرى ٤٠٩");
    const woC = await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [pC]);
    const epC = await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pC]);
    eq([Number(woC[0].n), Number(epC[0].n)], [1, 1], "ي٢. أمرٌ واحد وجهازٌ واحد");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. المريضُ غيرُ المُتاح كما كان ──");
    // ══════════════════════════════════════════════════════════════════
    const pN = await mkPatient("فرع واحد", []);
    const exN = await signExam(pN, S.docDQ);
    const buyN = await http("POST", `/api/followups/${exN.followupId}/confirm-purchase`, S.dq,
      { originalPrice: 1500000, expertUserId: U.E_DQ });
    eq(buyN.status, 200, "ك١. استقبالُ ذي قار يبيع بخبير ذي قار");
    const woN = await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pN]);
    const mvN = await q(`SELECT 1 FROM post_exam_followup_events WHERE followup_id=$1 AND event_type='sale_branch_moved'`, [exN.followupId]);
    eq([woN.map((w: any) => Number(w.branch_id)), mvN.length], [[DQ], 0], "ك٢. في ذي قار، بلا نقل");
    const buyNbg = await http("POST", `/api/followups/${exN.followupId}/confirm-purchase`, S.bg,
      { originalPrice: 1500000, expertUserId: U.AYOUB });
    eq(buyNbg.status, 403, "ك٣. وبغدادُ لا تصل ملفَّه ⟵ ٤٠٣");
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
