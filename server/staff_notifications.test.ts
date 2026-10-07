// تنبيهاتُ الموظّفين عبر بوت تلغرام (§4.by) — حيّاً على Postgres وعلى النقاط والكتّاب الحقيقيّين، وتلغرامُ مُعترَض.
// قاعدة محلّية: `npm run test:staff-notifications`.
//
// (أ) لوحةُ المسؤول: له وحده · الأنواعُ السبعةَ عشر (ومنها ثلاثةُ خطط العلاج الطبيعي، §4.cm) · الحفظُ يُدقَّق · رمزُ الربط.
// (ب) الـwebhook: السرُّ · الربطُ بالتذكرة لمرّةٍ واحدة · التذكرةُ الباطلة.
// (ج) المستلِمون: الفرعُ · الموجَّه · الفاعلُ لا يُنبَّه · اختصاصُ الطبيب · غيرُ المربوط وغيرُ النشط وغيرُ المختار.
// (د) الكتّابُ الحقيقيّون يكتبون الصندوقَ في معاملتهم: معاينةٌ (جهاز · علاجٌ طبيعيّ) · أمرٌ · تحويلٌ (للخبيرين) ·
//     جاهزٌ وتسليم · توقّف · اقتراحٌ · دفعةٌ تدخل (للمسؤول وحده) — والمعاملةُ المرتدّة لا تترك صفّاً، وخطأُ التحضير لا يُفسد المعاملة.
// (هـ) المُرسِلُ يرسل لمن يستحقّ ويختم. (و) الرسائلُ المجدولة رسالةٌ لكلّ مستلِم، و«متأخّرة» = الأحمرُ بلا عذر وحده.
import express from "express";
import { createServer } from "http";
import { sql } from "drizzle-orm";
import { pool, db } from "./db";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.STAFF_TELEGRAM_BOT_TOKEN = "123:TEST";
process.env.STAFF_TELEGRAM_BOT_USERNAME = "bionic_staff_test_bot";
process.env.STAFF_TELEGRAM_WEBHOOK_SECRET = "s3cr3t-staff";

//  تلغرامُ مُعترَض: كلُّ رسالةٍ تُسجَّل ولا تخرج.
const sent: { chatId: string; text: string; markup?: any }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).startsWith("https://api.telegram.org/")) {
    const b = JSON.parse(init?.body ?? "{}");
    if (String(url).endsWith("/sendMessage")) sent.push({ chatId: String(b.chat_id), text: String(b.text), markup: b.reply_markup });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(url, init);
}) as any;

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6963;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تنبيهات-الموظفين";
const ADMIN = 9981, RECV1 = 9982, RECV2 = 9983, DOC_P = 9984, DOC_PH = 9985, EXP1 = 9986, EXP2 = 9987, MGR1 = 9988, OFF = 9989;
const USERS = [ADMIN, RECV1, RECV2, DOC_P, DOC_PH, EXP1, EXP2, MGR1, OFF];
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول", permissions: {} },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال ١", permissions: { canViewPatients: true } },
};
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
async function http(method: string, path: string, session: any, body?: any, headers: Record<string, string> = {}) {
  const res = await realFetch(BASE + path, {
    method, headers: { "content-type": "application/json", ...headers,
      ...(session ? { "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const outbox = async (since: number) => q<{ event_type: string; branch_id: number | null; target_user_ids: number[] | null; text: string; specialty: string | null }>(
  `SELECT event_type, branch_id, target_user_ids, text, specialty FROM staff_notification_outbox WHERE id > $1 ORDER BY id`, [since]);
const maxId = async () => Number((await q(`SELECT COALESCE(MAX(id),0) m FROM staff_notification_outbox`))[0].m);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`).catch(() => undefined);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM ai_knowledge_suggestions WHERE submitted_by = ANY($1)`, [USERS]);
  await q(`DELETE FROM staff_notification_outbox`);
  await q(`DELETE FROM staff_link_tokens WHERE user_id = ANY($1)`, [USERS]);
  await q(`DELETE FROM staff_telegram_links WHERE user_id = ANY($1)`, [USERS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1)`, [USERS]);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, active, doc, specs, expert] of [
    [ADMIN, "admin", 1, true, false, [], false], [RECV1, "reception", 1, true, false, [], false],
    [RECV2, "reception", 2, true, false, [], false], [DOC_P, "doctor", 1, true, true, ["prosthetic"], false],
    [DOC_PH, "doctor", 1, true, true, ["physiotherapy"], false], [EXP1, "prosthetics_expert", 1, true, false, [], true],
    [EXP2, "prosthetics_expert", 1, true, false, [], true], [MGR1, "branch_manager", 1, true, false, [], false],
    [OFF, "reception", 1, false, false, [], false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
               can_view_patients, can_write_medical_exam, medical_specialties, can_work_as_expert)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,$7,true,$8,$9::jsonb,$10)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=EXCLUDED.is_active, can_write_medical_exam=EXCLUDED.can_write_medical_exam,
               medical_specialties=EXCLUDED.medical_specialties, can_work_as_expert=EXCLUDED.can_work_as_expert,
               display_name=EXCLUDED.display_name`,
      [id, `stn_u${id}`, `موظّف ${id}`, role, b, JSON.stringify([b]), active, doc, JSON.stringify(specs), expert]);
  }
  await cleanup();

  const { registerRoutes } = await import("./routes");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
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
  await new Promise<void>((r) => httpServer.once("listening", r));
  const { resolveStaffRecipients, dispatchStaffOnce } = await import("./staff_telegram/dispatcher");
  const notify = await import("./staff_telegram/notify");
  const mfg = await import("./manufacturing/store");
  const episodes = await import("./device_episodes/store");
  const { ensureCaseTx } = await import("./patient_cases/reopen");
  const { createSuggestion } = await import("./ai/knowledge/store");
  const { buildExpertDueDigests, buildEveningSummaries } = await import("./staff_telegram/digests");

  try {
    // ══ أ. لوحةُ المسؤول ══════════════════════════════════════════════════════════════════════
    console.log("\n── أ. لوحة المسؤول ──");
    same("أ١. لغير المسؤول ⟵ ٤٠٣", (await http("GET", "/api/admin/staff-notifications", S.recv1)).status, 403);
    const g = await http("GET", "/api/admin/staff-notifications", S.admin);
    same("أ٢. البوتُ جاهز والأنواعُ سبعةَ عشر (ومنها ثلاثةُ خطط العلاج الطبيعي)، والموظّفُ غيرُ النشط لا يظهر",
      [g.status, g.body?.botReady, g.body?.events?.length, g.body?.users?.some((u: any) => u.id === OFF)], [200, true, 17, false]);
    same("أ٣. الأنواعُ الثلاثة التي لا تقع اليوم ليست فيها",
      ["charge_returned", "discount_pending", "discount_decided"].some((k) => g.body?.events?.some((e: any) => e.key === k)), false);
    same("أ٤. نوعٌ مجهول ⟵ ٤٠٠", (await http("PUT", `/api/admin/staff-notifications/${RECV1}`, S.admin, { events: ["nope"] })).status, 400);
    const prefs: [number, string[]][] = [
      [ADMIN, ["exam_request", "payment_received", "payment_correction_pending", "ai_suggestion", "order_hold_rework", "evening_summary"]],
      [RECV1, ["returned_from_doctor", "awaiting_decision", "ready_for_fitting", "delivered"]],
      [RECV2, ["ready_for_fitting"]],
      [DOC_P, ["exam_request"]], [DOC_PH, ["exam_request"]],
      [EXP1, ["order_assigned", "order_reassigned", "expert_due_digest"]], [EXP2, ["order_assigned", "order_reassigned"]],
      [MGR1, ["order_hold_rework", "evening_summary"]],
    ];
    for (const [u, evs] of prefs) await http("PUT", `/api/admin/staff-notifications/${u}`, S.admin, { events: evs });
    //  **ما يخصّ الدورَ وحده** (قرارُ المالك ٢٠٢٦-١٠-٠٤ — «هند موظّفةُ استقبال يظهر لها مربّعُ المعاينات»).
    const bad = await http("PUT", `/api/admin/staff-notifications/${RECV1}`, S.admin, { events: ["exam_request"] });
    same("أ٤ب. **نوعٌ لا يخصّ دورَه يُرفض** — معاينةٌ لموظّفة استقبال ⟵ ٤٠٠ ولا يُحفَظ",
      [bad.status, (await q(`SELECT count(*)::int n FROM staff_notification_prefs WHERE user_id=$1 AND event_type='exam_request'`, [RECV1]))[0].n], [400, 0]);
    const g2 = (await http("GET", "/api/admin/staff-notifications", S.admin)).body;
    const el = (id: number) => g2.users.find((u: any) => u.id === id)?.eligible;
    same("أ٤ج. **الاستقبالُ يُعرض له ما يخصّه وحده** (لا معاينة ولا خبير ولا مسؤول)",
      el(RECV1), ["returned_from_doctor", "awaiting_decision", "ready_for_fitting", "delivered", "followups_digest"]);
    same("أ٤د. والطبيبُ معايناته · والخبيرُ أوامرُه · والمديرُ ما يخصّه · والمسؤولُ السبعةَ عشر",
      [el(DOC_P), el(EXP1), el(MGR1), el(ADMIN)?.length],
      [["exam_request"], ["order_assigned", "order_reassigned", "expert_due_digest"],
       ["returned_from_doctor", "awaiting_decision", "ready_for_fitting", "delivered", "followups_digest", "order_hold_rework", "evening_summary"], 17]);
    //  «مدير الفرع لا يعاين» (المالك ٢٠٢٦-١٠-٠٤) — و«كلُّ مبلغٍ يدخل» للمسؤول وحده.
    const mgrBad = await Promise.all(["exam_request", "payment_received"].map(async (k) =>
      (await http("PUT", `/api/admin/staff-notifications/${MGR1}`, S.admin, { events: [k] })).status));
    same("أ٤و. **المديرُ لا يُختار له «طلب معاينة» ولا «كلُّ مبلغٍ يدخل»** ⟵ ٤٠٠ لكليهما", mgrBad, [400, 400]);
    same("أ٤هـ. **الترتيبُ من الأهمّ**: المسؤول ⟵ المدير ⟵ الخبيران ⟵ الطبيبان ⟵ الاستقبال، وفرعُ كلٍّ ظاهر",
      [g2.users.filter((u: any) => USERS.includes(u.id)).map((u: any) => u.role), g2.users.find((u: any) => u.id === RECV2)?.branches],
      [["admin", "branch_manager", "prosthetics_expert", "prosthetics_expert", "doctor", "doctor", "reception", "reception"], ["كربلاء"]]);
    const audit = await q(`SELECT new_values FROM audit_log WHERE entity_type='staff_notification_prefs' AND entity_id=$1 ORDER BY id DESC LIMIT 1`, [String(EXP1)]);
    same("أ٥. الحفظُ يُكتب في سجلّ التدقيق بالقديم والجديد",
      JSON.parse(audit[0]?.new_values ?? "{}").events, ["expert_due_digest", "order_assigned", "order_reassigned"]);
    const lk = await http("POST", `/api/admin/staff-notifications/${RECV1}/link`, S.admin);
    const token = String(lk.body?.deepLink ?? "").split("start=")[1] ?? "";
    same("أ٦. رمزُ الربط رابطُ البوت بتذكرة", [lk.status, /^https:\/\/t\.me\/bionic_staff_test_bot\?start=.{20,}$/.test(lk.body?.deepLink ?? "")], [200, true]);
    same("أ٧. والتذكرةُ بصمتُها وحدها في القاعدة",
      (await q(`SELECT count(*)::int n FROM staff_link_tokens WHERE token_hash = $1`, [token])).length && (await q(`SELECT count(*)::int n FROM staff_link_tokens WHERE token_hash = $1`, [token]))[0].n, 0);

    // ══ ب. الـwebhook ═════════════════════════════════════════════════════════════════════════
    console.log("\n── ب. الربط ──");
    const hook = (text: string, secret = "s3cr3t-staff", chat = 5551) => http("POST", "/api/integrations/telegram/staff/webhook", null,
      { message: { chat: { id: chat, type: "private" }, from: { id: chat }, text } }, { "x-telegram-bot-api-secret-token": secret });
    same("ب١. سرٌّ خاطئ ⟵ ٤٠١ ولا ربط", [(await hook(`/start ${token}`, "wrong")).status,
      (await q(`SELECT count(*)::int n FROM staff_telegram_links WHERE user_id=$1`, [RECV1]))[0].n], [401, 0]);
    sent.length = 0;
    await hook(`/start ${token}`);
    same("ب٢. التذكرةُ تربط الموظّفَ بمحادثته وتردّ باسمه",
      [(await q(`SELECT chat_id FROM staff_telegram_links WHERE user_id=$1`, [RECV1]))[0]?.chat_id, /موظّف 9982/.test(sent[0]?.text ?? "")], ["5551", true]);
    sent.length = 0;
    await hook(`/start ${token}`, "s3cr3t-staff", 7777);
    same("ب٣. والتذكرةُ لمرّةٍ واحدة — الثانيةُ «غير صالح» ولا يتغيّر الربط",
      [/غير صالح/.test(sent[0]?.text ?? ""), (await q(`SELECT chat_id FROM staff_telegram_links WHERE user_id=$1`, [RECV1]))[0]?.chat_id], [true, "5551"]);
    //  بقيّةُ الربط مباشرةً — المسارُ نفسُه مُختبَر أعلاه.
    for (const [u, chat] of [[ADMIN, 5550], [RECV2, 5552], [DOC_P, 5553], [DOC_PH, 5554], [EXP1, 5555], [EXP2, 5556], [OFF, 5559]] as const) {
      await q(`INSERT INTO staff_telegram_links (user_id, chat_id) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET chat_id=EXCLUDED.chat_id`, [u, String(chat)]);
    }
    await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1,'exam_request') ON CONFLICT DO NOTHING`, [OFF]);
    //  MGR1 مختارٌ وغيرُ مربوط.

    // ══ ج. المستلِمون ═════════════════════════════════════════════════════════════════════════
    console.log("\n── ج. المستلِمون ──");
    const ids = async (row: any) => (await resolveStaffRecipients({ branch_id: null, target_user_ids: null, exclude_user_id: null, specialty: null, ...row })).map((r) => r.userId).sort();
    same("ج١. معاينةُ أطراف في بغداد ⟵ المسؤول واستقبالُ بغداد وطبيبُ الأطراف — لا كربلاء ولا طبيبُ العلاج الطبيعي ولا غيرُ النشط",
      await ids({ event_type: "exam_request", branch_id: 1, specialty: "prosthetic" }), [ADMIN, DOC_P].sort());
    same("ج٢. ومعاينةُ علاجٍ طبيعيّ ⟵ طبيبُ العلاج الطبيعي لا طبيبُ الأطراف",
      await ids({ event_type: "exam_request", branch_id: 1, specialty: "physiotherapy" }), [ADMIN, DOC_PH].sort());
    same("ج٣. «جاهز» في كربلاء ⟵ استقبالُ كربلاء وحده — لا استقبالُ بغداد", await ids({ event_type: "ready_for_fitting", branch_id: 2 }), [RECV2]);
    same("ج٤. والفاعلُ لا يُنبَّه بما فعله", await ids({ event_type: "exam_request", branch_id: 1, specialty: "prosthetic", exclude_user_id: DOC_P }), [ADMIN]);
    await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1,'exam_request') ON CONFLICT DO NOTHING`, [RECV1]);
    same("ج٤ب. **واختيارٌ قديمٌ لا يخصّ الدورَ لا يُرسَل** — صفٌّ مزروع لموظّفة استقبال يتخطّاه المُرسِل",
      await ids({ event_type: "exam_request", branch_id: 1, specialty: "prosthetic" }), [ADMIN, DOC_P].sort());
    same("ج٥. الموجَّهُ لصاحبه وحده", await ids({ event_type: "order_assigned", target_user_ids: [EXP2] }), [EXP2]);
    same("ج٦. والموجَّهُ بلا صاحبٍ لا يصل أحداً", await ids({ event_type: "order_assigned" }), []);
    same("ج٧. ومختارٌ غيرُ مربوط لا يُحسَب", await ids({ event_type: "order_hold_rework", branch_id: 1 }), [ADMIN]);

    // ══ د. الكتّابُ الحقيقيّون ═════════════════════════════════════════════════════════════════
    console.log("\n── د. الكتّاب ──");
    const mkPatient = async (label: string, branch: number) => (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1, NULL, $2,'40','170','70','x',$3,0,'new') RETURNING id`, [`${MARK} ${label}`, MARK, branch]))[0].id;
    let m = await maxId();
    const pA = await mkPatient("علي", 1);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type) VALUES ($1,1,'prosthetic')`, [pA]);
    await episodes.startDeviceEpisode({ patientId: pA, serviceType: "prosthetic", createdBy: RECV1, servicePath: "exam", actingBranchId: 1 });
    let ob = await outbox(m);
    same("د١. جهازٌ ينتظر المعاينة ⟵ صفُّ «معاينة جديدة» باسم المريض وفرعه واختصاصه، والفاعلُ مستثنى",
      ob.map((r) => [r.event_type, r.branch_id, r.specialty, r.text.includes(`${MARK} علي`) && r.text.includes("فرع بغداد")]),
      [["exam_request", 1, "prosthetic", true]]);
    m = await maxId();
    await episodes.startDeviceEpisode({ patientId: pA, serviceType: "prosthetic", createdBy: RECV1, servicePath: "no_exam", actingBranchId: 1 });
    same("د٢. ومسارُ «بلا معاينة» لا يُنبّه الطبيب", (await outbox(m)).length, 0);

    m = await maxId();
    const pB = await mkPatient("زينب", 2);
    await db.transaction(async (tx) => {
      await ensureCaseTx(tx as any, { patientId: pB, caseType: "physiotherapy", branchId: null, create: {}, reopen: false });
    });
    ob = await outbox(m);
    same("د٣. حالةُ علاجٍ طبيعيٍّ جديدة ⟵ معاينة، وفرعُها من ملفّ المريض حين لا يُمرَّر",
      ob.map((r) => [r.event_type, r.branch_id, r.specialty]), [["exam_request", 2, "physiotherapy"]]);

    m = await maxId();
    let order = await mfg.createWorkOrderForExisting({ patientId: pA, branchId: 1, serviceType: "prosthetic", expertUserId: EXP1, assignedBy: RECV1, purpose: "maintenance" });
    ob = await outbox(m);
    same("د٤. أمرٌ أُسند ⟵ موجَّهٌ للخبير، باسم المريض ورقم الأمر",
      ob.map((r) => [r.event_type, r.target_user_ids, r.text.includes(`رقم ${order.id}`)]), [["order_assigned", [EXP1], true]]);

    m = await maxId();
    order = await mfg.reassignExpert({ order, newExpertUserId: EXP2, reason: "إجازة", performedBy: ADMIN });
    ob = await outbox(m);
    same("د٥. التحويلُ ⟵ «حُوِّل إليك» للجديد و«سُحب منك» للسابق، مع السبب",
      ob.map((r) => [r.event_type, r.target_user_ids, /حُوِّل إليك/.test(r.text) ? "new" : /سُحب منك/.test(r.text) ? "old" : "?", r.text.includes("إجازة")]),
      [["order_reassigned", [EXP2], "new", true], ["order_reassigned", [EXP1], "old", true]]);

    m = await maxId();
    order = await mfg.holdOrder({ order, status: "waiting_materials", reasonCode: "materials_unavailable", note: "نفد السيليكون", performedBy: EXP2, authority: { via: "role" } });
    ob = await outbox(m);
    same("د٦. التوقّفُ ⟵ تنبيهٌ فرعيٌّ بالسبب مقروءاً",
      ob.map((r) => [r.event_type, r.branch_id, r.text.includes("المواد غير متوفّرة") && r.text.includes("نفد السيليكون")]), [["order_hold_rework", 1, true]]);

    const bld = await mfg.createWorkOrderForExisting({ patientId: pB, branchId: 2, serviceType: "medical_support", expertUserId: EXP1, assignedBy: ADMIN, purpose: "maintenance" });
    await q(`UPDATE prosthetic_work_orders SET purpose='initial_build', current_stage='manufacturing' WHERE id=$1`, [bld.id]);
    const live = (await q(`SELECT * FROM prosthetic_work_orders WHERE id=$1`, [bld.id]))[0];
    const asOrder = { ...bld, purpose: "initial_build", currentStage: "manufacturing" } as any;
    void live;
    m = await maxId();
    await mfg.updateStage({ order: asOrder, toStage: "ready_for_fitting", performedBy: EXP1, authority: { via: "role" } } as any);
    ob = await outbox(m);
    same("د٧. «جاهز للتجربة والتسليم» ⟵ تنبيهُ الاستقبال في فرع الأمر",
      ob.map((r) => [r.event_type, r.branch_id]), [["ready_for_fitting", 2]]);

    m = await maxId();
    await createSuggestion({ suggestedText: "سعر الركبة الجديد ٣ مليون", reason: "تحديث", actor: { userId: RECV1, name: "استقبال ١", role: "reception", branchId: 1 } as any });
    ob = await outbox(m);
    same("د٨. اقتراحُ معرفة ⟵ تنبيهٌ عامّ بنصّه", ob.map((r) => [r.event_type, r.text.includes("سعر الركبة")]), [["ai_suggestion", true]]);

    //  «كلُّ مبلغٍ يدخل أيَّ فرع» (المالك ٢٠٢٦-١٠-٠٤) — من الكاتب الوحيد `insertPaymentRow`.
    const { storage } = await import("./storage");
    const caseA = (await q(`SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [pA]))[0].id;
    m = await maxId();
    await storage.createPayment({ patientId: pA, branchId: 2, amount: 150000, caseId: caseA } as any);
    ob = await outbox(m);
    same("د١١. دفعةٌ تُكتب ⟵ تنبيهٌ عامّ بالمبلغ واسم المريض وقسمه وفرع الدفعة (لا فرع التسجيل)",
      ob.map((r) => [r.event_type, r.branch_id, r.text.includes("150,000 د.ع") && r.text.includes(`${MARK} علي`)
        && r.text.includes("الأطراف الصناعية") && r.text.includes("فرع كربلاء")]), [["payment_received", null, true]]);
    same("د١١ب. ويصل المسؤولَ وحده", await ids({ event_type: "payment_received" }), [ADMIN]);
    m = await maxId();
    await storage.createPayment({ patientId: pA, branchId: 1, amount: 0, caseId: caseA, isFreeSessions: true } as any);
    same("د١١ج. والصفرُ (جلساتٌ مُهداة) ليس مالاً يدخل ⟵ لا تنبيه", (await outbox(m)).length, 0);
    m = await maxId();
    await db.transaction(async (tx) => {
      await storage.createPayment({ patientId: pA, branchId: 1, amount: 50000, caseId: caseA } as any, tx);
      throw new Error("rollback");
    }).catch(() => undefined);
    same("د١١د. ودفعةٌ ارتدّت معاملتُها لا تُبلَّغ", (await outbox(m)).length, 0);

    m = await maxId();
    await db.transaction(async (tx) => {
      await notify.notifyExamRequest(tx as any, { patientId: pA, branchId: 1, specialty: "prosthetic" });
      throw new Error("rollback");
    }).catch(() => undefined);
    same("د٩. **معاملةٌ ارتدّت لا تترك صفّاً** — فلا تنبيهَ لعمليةٍ لم تقع", (await outbox(m)).length, 0);

    const committed = await db.transaction(async (tx) => {
      await notify.notifyExamRequest(tx as any, { patientId: "x" as any, branchId: 1, specialty: "prosthetic" });
      const r = await tx.execute(sql`SELECT 1 AS ok`);
      return (r.rows[0] as any).ok;
    }).catch(() => "aborted");
    same("د١٠. **وخطأُ التحضير لا يُفسد معاملةَ العملية** — نقطةُ الحفظ تحميها", committed, 1);

    // ══ هـ. المُرسِل ═════════════════════════════════════════════════════════════════════════
    console.log("\n── هـ. المُرسِل ──");
    await q(`UPDATE staff_notification_outbox SET status='sent' WHERE status='pending'`);
    m = await maxId();
    await episodes.startDeviceEpisode({ patientId: pA, serviceType: "prosthetic", createdBy: MGR1, servicePath: "exam", actingBranchId: 1 });
    sent.length = 0;
    await dispatchStaffOnce();
    same("هـ١. أُرسلت لمحادثات المستحقّين وحدهم",
      sent.map((x) => x.chatId).sort(), ["5550", "5553"].sort());
    same("هـ٢. والصفُّ خُتم «أُرسل»", (await q(`SELECT status FROM staff_notification_outbox WHERE id > $1`, [m])).map((r) => r.status), ["sent"]);
    sent.length = 0;
    await dispatchStaffOnce();
    same("هـ٣. ودورةٌ ثانية لا تعيد الإرسال", sent.length, 0);

    // ══ و. المجدولة ═════════════════════════════════════════════════════════════════════════
    console.log("\n── و. المجدولة ──");
    await q(`UPDATE prosthetic_work_orders SET expected_delivery_date = ((NOW() AT TIME ZONE 'Asia/Baghdad')::date - 2) WHERE id=$1`, [bld.id]);
    m = await maxId();
    same("و١. تذكيرُ الخبير ⟵ رسالةٌ واحدة له فيها أمرُه المتأخّر", await buildExpertDueDigests(), 1);
    ob = await outbox(m);
    same("   موجَّهةٌ إليه وفيها «متأخّرة» واسمُ المريض",
      ob.map((r) => [r.event_type, r.target_user_ids, r.text.includes("متأخّرة") && r.text.includes(`${MARK} زينب`)]), [["expert_due_digest", [EXP1], true]]);
    m = await maxId();
    await buildEveningSummaries();
    ob = await outbox(m);
    same("و٢. الملخّصُ المسائيّ ⟵ رسالةٌ واحدة للمسؤول تجمع الفرعين، ولا شيءَ لمختارٍ غيرِ مربوط",
      ob.map((r) => [r.target_user_ids, r.text.includes("فرع بغداد") && r.text.includes("فرع كربلاء")]), [[[ADMIN], true]]);
    same("و٢ب. وأمرُ كربلاء المتأخّرُ بلا عذر يُعدّ «متأخّرة بلا عذر ١»",
      /فرع كربلاء:[^\n]*متأخّرة بلا عذر 1(?!\d)/.test(ob[0]?.text ?? ""), true);

    //  **الأصفرُ ليس تأخيراً** (المالك ٢٠٢٦-١٠-٠٤): «التأخير يقصد به الأحمر — بدون عذر؛ أما الأصفر بعذر فليس تأخيراً».
    await q(`UPDATE prosthetic_work_orders SET hold_reason_code='materials_unavailable' WHERE id=$1`, [bld.id]);
    m = await maxId();
    await buildEveningSummaries();
    const ev = (await outbox(m))[0]?.text ?? "";
    same("و٣. **أمرٌ فات موعدُه بعذرٍ مكتوب لا يُعدّ متأخّراً** — «بلا عذر 0» ويُذكر بعذره منفصلاً",
      [/فرع كربلاء:[^\n]*متأخّرة بلا عذر 0(?!\d)/.test(ev), /فرع كربلاء:[^\n]*وبعذر مكتوب 1 — ليست تأخيراً/.test(ev)], [true, true]);
    m = await maxId();
    await buildExpertDueDigests();
    const dg = (await outbox(m))[0]?.text ?? "";
    same("و٤. وتذكيرُ الخبير يضعه تحت «بعذر مكتوب» لا تحت «متأخّرة بلا عذر»",
      [dg.includes("متأخّرة بلا عذر"), dg.includes("بعذر مكتوب") && dg.includes(`${MARK} زينب`)], [false, true]);
  } finally {
    await cleanup();
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص تنبيهات الموظفين نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((err) => { console.error(err); process.exit(1); });
