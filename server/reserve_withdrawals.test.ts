// **«طلب سحب من القاصات»** (طلبُ المالك ٢٠٢٦-١١-٠٣، ترحيل ١٨٩، §4.fy) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:reserve-withdrawals`.
//
//   • **أ**: المفتاح — يشعله المسؤولُ من نافذة المستخدم بسطر تدقيق، ويُفعَّل معه تنبيهُ القرار مرّةً.
//   • **ب**: الطلب — لحامل المفتاح وحده، في دفتر فرعه النشط، بمبلغٍ وغرض، والقاصةُ لا تنقص، وطلبٌ معلَّقٌ واحد للقاصة، وتنبيهُ المسؤول مقروءاً.
//   • **ج**: الرؤية — الطالبُ طلباتِه، والمسؤولُ كلَّها بالرصيد قبل السحب وبعده، والعدّادُ للمسؤول وحده، والدفترُ يُظهر المعلَّق.
//   • **د**: الاعتماد للمسؤول وحده — يكتب سطرَ السحب بيوم الاعتماد فتنقص القاصة، بالتدقيق والتنبيه، ولا يُسحب مرّتين ولو تزامنت الضغطتان.
//   • **هـ**: الرفض بسببٍ — لا يتغيّر شيء، والسببُ يصل الطالب.
//   • **و**: المبلغُ فوق الرصيد يُقبل ويُوسم (قرارُ المالك)، والمبلغُ بالكلمات، ومَن يحقّ له التنبيهان.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { resolveStaffRecipients } from "./staff_telegram/dispatcher";
import { baghdadTodayYmd } from "@shared/visit_date";
import { eligibleStaffEvents } from "@shared/staff_notifications";
import { amountInArabicWords, canRequestReserveWithdrawal } from "@shared/reserve_withdrawals";

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

const PORT = 6897;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سحب-القاصات";
const BG = 9741, DQ = 9742;
const ADMIN = 9961, ACC = 9962, ACC2 = 9963, RECV = 9964, ACC_DQ = 9965, MGR = 9966;
const USERS = [ADMIN, ACC, ACC2, RECV, ACC_DQ, MGR];
const BRANCHES = [BG, DQ];
const TODAY = baghdadTodayYmd();

const sess = (userId: number, role: string, branchId: number) => ({
  userId, role, isAdmin: role === "admin", branchId, accessibleBranches: [branchId], displayName: `u${userId}`, permissions: {},
});
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BG, accessibleBranches: BRANCHES, displayName: "المسؤول", permissions: {} },
  acc: sess(ACC, "accountant", BG),
  acc2: sess(ACC2, "accountant", BG),
  recv: sess(RECV, "reception", BG),
  accDq: sess(ACC_DQ, "accountant", DQ),
  mgr: sess(MGR, "branch_manager", BG),
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function cleanup() {
  await q(`DELETE FROM staff_notification_outbox WHERE event_type IN ('reserve_withdrawal_pending','reserve_withdrawal_decided') AND (text LIKE $1 OR target_user_ids && $2::int[])`, [`%${MARK}%`, USERS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM reserve_withdrawal_requests WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_reserves WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM audit_log WHERE branch_id = ANY($1::int[]) OR (entity_type = 'system_user' AND entity_id = ANY($2::int[]))`, [BRANCHES, USERS]);
}

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [BG, `${MARK} بغداد`, DQ, `${MARK} ذي قار`]);
  for (const [id, role, br] of [[ADMIN, "admin", BG], [ACC, "accountant", BG], [ACC2, "accountant", BG], [RECV, "reception", BG],
    [ACC_DQ, "accountant", DQ], [MGR, "branch_manager", BG]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_request_reserve_withdrawal)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,false)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_request_reserve_withdrawal=false`,
      [id, `rw_u${id}`, `u${id}`, role, br, JSON.stringify(role === "admin" ? BRANCHES : [br])]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
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
  await new Promise((r) => httpServer.once("listening", r));

  const ask = (s: any, body: any) => http("POST", "/api/reserve-withdrawals", s, body);
  const sheet = async (s: any, branchId = BG) => (await http("GET", `/api/cash-book?branchId=${branchId}&book=devices&date=${TODAY}`, s)).body;
  const remaining = async (k: "materials" | "payroll") => (await sheet(S.admin))?.reserves?.[k]?.remaining;
  const entries = () => q(`SELECT kind, amount, note, entry_date::text AS day, created_by FROM cash_book_entries WHERE branch_id = $1 AND deleted_at IS NULL ORDER BY id`, [BG]);
  const outbox = (ev: string) => q(`SELECT text, link_path, exclude_user_id, target_user_ids FROM staff_notification_outbox
      WHERE event_type = $1 AND (text LIKE $2 OR target_user_ids && $3::int[]) ORDER BY id`, [ev, `%${MARK}%`, USERS]);

  try {
    //  بدايةُ الدفتر اليوم، ورصيدُ بداية القاصتين — بالنقاط نفسِها التي يستعملها المسؤول.
    same("تمهيد: بدايةُ الدفتر ورصيدُ القاصتين",
      [(await http("POST", "/api/cash-book/opening", S.admin, { branchId: BG, book: "devices", openingDate: TODAY, cash: 1_000_000 })).status,
       (await http("POST", "/api/cash-book/reserves", S.admin, { branchId: BG, book: "devices", reserve: "materials", openingBalance: 400_000 })).status,
       (await http("POST", "/api/cash-book/reserves", S.admin, { branchId: BG, book: "devices", reserve: "payroll", openingBalance: 2_000_000 })).status,
       await remaining("materials"), await remaining("payroll")], [200, 200, 200, 400_000, 2_000_000]);

    console.log("\n── أ. المفتاح ──");
    same("أ١. **بلا مفتاح ⟵ ٤٠٣**، والجلسةُ لا تحمله", [(await ask(S.acc, { book: "devices", reserve: "materials", amount: 1000, purpose: "مواد" })).status],
      [403]);
    const p1 = await http("PATCH", `/api/admin/users/${ACC}`, S.admin, { canRequestReserveWithdrawal: true });
    const pref = async (u: number) => (await q(`SELECT 1 FROM staff_notification_prefs WHERE user_id=$1 AND event_type='reserve_withdrawal_decided'`, [u])).length;
    const userAudit = await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type='system_user' AND entity_id=$1 ORDER BY id DESC LIMIT 1`, [ACC]);
    same("أ٢. **المسؤولُ يشعله من نافذة المستخدم** — يُحفظ، وسطرُ تدقيقٍ بالقديم والجديد، وتنبيهُ قرار طلبه يُفعَّل",
      [p1.status, p1.body?.canRequestReserveWithdrawal, String(userAudit[0]?.new_values ?? "").includes("canRequestReserveWithdrawal"), await pref(ACC)],
      [200, true, true, 1]);
    await q(`DELETE FROM staff_notification_prefs WHERE user_id=$1 AND event_type='reserve_withdrawal_decided'`, [ACC]);
    await http("PATCH", `/api/admin/users/${ACC}`, S.admin, { displayName: "u9962" });
    same("أ٣. **ويُفعَّل مرّةً حين يُشعَل** — حفظٌ آخر للحساب لا يعيد ما أطفأه المسؤول", await pref(ACC), 0);
    await http("PATCH", `/api/admin/users/${ACC}`, S.admin, { canRequestReserveWithdrawal: false });
    await http("PATCH", `/api/admin/users/${ACC}`, S.admin, { canRequestReserveWithdrawal: true });
    same("أ٤. وإعادةُ إشعاله تفعّله", await pref(ACC), 1);
    await q(`UPDATE system_users SET can_request_reserve_withdrawal = true WHERE id = ANY($1::int[])`, [[RECV, ACC_DQ, MGR, ADMIN]]);
    same("أ٥. القاعدةُ المشتركة: الحاملُ يطلب، والمسؤولُ لا يطلب ولو حمله",
      [canRequestReserveWithdrawal({ permissions: { canRequestReserveWithdrawal: true } }), canRequestReserveWithdrawal({ isAdmin: true, permissions: { canRequestReserveWithdrawal: true } }),
       canRequestReserveWithdrawal({ permissions: {} })], [true, false, false]);

    console.log("\n── ب. الطلب ──");
    same("ب١. **المسؤولُ يسحب مباشرةً ⟵ ٤٠٠ · الاستقبالُ بالمفتاح بلا دفتر ⟵ ٤٠٣ · فرعٌ غيرُ النشط ⟵ ٤٠٣**",
      [(await ask(S.admin, { book: "devices", reserve: "materials", amount: 1000, purpose: "مواد" })).status,
       (await ask(S.recv, { book: "devices", reserve: "materials", amount: 1000, purpose: "مواد" })).status,
       (await ask(S.acc, { branchId: DQ, book: "devices", reserve: "materials", amount: 1000, purpose: "مواد" })).status], [400, 403, 403]);
    same("ب٢. **بلا غرض ⟵ ٤٠٠ · مبلغٌ صفر ⟵ ٤٠٠ · قاصةٌ مجهولة ⟵ ٤٠٠ · دفترٌ مجهول ⟵ ٤٠٠**",
      [(await ask(S.acc, { book: "devices", reserve: "materials", amount: 1000, purpose: "  " })).status,
       (await ask(S.acc, { book: "devices", reserve: "materials", amount: 0, purpose: "مواد سيليكون" })).status,
       (await ask(S.acc, { book: "devices", reserve: "ratio", amount: 1000, purpose: "مواد سيليكون" })).status,
       (await ask(S.acc, { book: "x", reserve: "materials", amount: 1000, purpose: "مواد سيليكون" })).status], [400, 400, 400, 400]);
    same("ب٣. **دفترٌ بلا بداية ⟵ ٤٠٩** (ذي قار — القاصةُ لم تبدأ)",
      (await ask(S.accDq, { book: "devices", reserve: "materials", amount: 1000, purpose: "مواد سيليكون" })).status, 409);
    const r1 = await ask(S.acc, { book: "devices", reserve: "materials", amount: "250,000", purpose: `مواد سيليكون من المورّد ${MARK}` });
    same("ب٤. **الطلبُ يُحفظ معلَّقاً** بالمبلغ رقماً وكلمات والرصيدِ قبله وبعده — **والقاصةُ لم تنقص** ولا سطرَ في الدفتر",
      [r1.status, r1.body?.status, r1.body?.amount, r1.body?.amountWords, r1.body?.balance, r1.body?.balanceAfter, r1.body?.exceeds,
       r1.body?.boxLabel, await remaining("materials"), (await entries()).length],
      [200, "pending", 250_000, "مئتان وخمسون ألف دينار", 400_000, 150_000, false, "قاصة المواد", 400_000, 0]);
    //  قرارُ المالك ٢٠٢٦-١١-٠٥ (ترحيل ١٩٠): «يرسل أكثرَ من طلب، وحين أفرغ أوافق واحدةً واحدة» — والضغطةُ المكرّرة وحدها تُردّ.
    same("ب٥. **أكثرُ من طلبٍ معلَّق على القاصة نفسِها** — زميلُه على المواد يُقبل وعلى الرواتب يُقبل، **والطلبُ نفسُه مكرّراً ⟵ ٤٠٩**",
      [(await ask(S.mgr, { book: "devices", reserve: "materials", amount: 1000, purpose: "مواد أخرى" })).status,
       (await ask(S.mgr, { book: "devices", reserve: "payroll", amount: 2_500_000, purpose: `رواتب شهر ١١ ${MARK}` })).status,
       (await ask(S.acc, { book: "devices", reserve: "materials", amount: "250,000", purpose: `مواد سيليكون من المورّد ${MARK}` })).status],
      [200, 200, 409]);
    const pend = await outbox("reserve_withdrawal_pending");
    const t = String(pend[0]?.text ?? "");
    same("ب٦. **تنبيهُ المسؤول مقروءاً** — صفٌّ لكلّ طلبٍ محفوظ، فيه الفرعُ والدفترُ والقاصة والمبلغُ رقماً وكلمات والرصيدُ وبعده والغرضُ والطالب، بلا الطالب نفسِه",
      [pend.length, t.includes("قاصة المواد"), t.includes("بغداد"), t.includes("الأطراف") || t.includes("أطراف") || t.includes("الأجهزة"),
       t.includes("250,000"), t.includes("مئتان وخمسون ألف دينار"), t.includes("400,000"), t.includes("150,000"), t.includes("مواد سيليكون"),
       t.includes("u9962"), Number(pend[0]?.exclude_user_id), pend[0]?.link_path],
      [3, true, true, true, true, true, true, true, true, true, ACC, "/payment-corrections#withdrawals"]);
    const reqAudit = await q(`SELECT action FROM audit_log WHERE entity_type='reserve_withdrawal_request' AND entity_id=$1`, [r1.body?.id]);
    same("ب٧. وسطرُ تدقيقٍ للطلب", reqAudit.map((r) => r.action), ["create"]);

    console.log("\n── ج. الرؤية ──");
    const mine = await http("GET", "/api/reserve-withdrawals", S.acc);
    const other = await http("GET", "/api/reserve-withdrawals", S.acc2);
    const all = await http("GET", "/api/reserve-withdrawals?status=pending", S.admin);
    same("ج١. **الطالبُ طلباتِه وحده، وزميلُه بلا طلباتٍ لا يرى شيئاً، والمسؤولُ كلَّها**",
      [mine.body?.map((r: any) => r.id), other.body?.length, all.body?.length], [[r1.body?.id], 0, 3]);
    const r1Card = all.body?.find((r: any) => r.id === r1.body?.id);
    same("ج١ج. **البطاقةُ تقول ما معها على القاصة**: طلبٌ آخر بـ١٬٠٠٠، وإن اعتُمدت كلُّها يبقى ١٤٩٬٠٠٠",
      [r1Card?.otherPendingCount, r1Card?.otherPendingAmount, r1Card?.balanceAfter, r1Card?.balanceAfterAllPending, r1Card?.allPendingExceed],
      [1, 1000, 150_000, 149_000, false]);
    const payrollCard = all.body?.find((r: any) => r.reserve === "payroll");
    same("ج٢. **المبلغُ فوق الرصيد يُقبل ويُوسم** (قرارُ المالك) — ٢٬٥٠٠٬٠٠٠ من ٢٬٠٠٠٬٠٠٠",
      [payrollCard?.exceeds, payrollCard?.balanceAfter, payrollCard?.amountWords], [true, -500_000, "مليونان وخمسمئة ألف دينار"]);
    //  طلبُ المحاسب على بغداد، ثمّ صار فرعُه النشط ذي قار، أو صار استقبالاً — لا يقرأ طلبَه ولا رصيدَ قاصة بغداد.
    //  الجلسةُ تُحدَّث من صفّ الحساب في كلّ طلب — فالتغييرُ في الصفّ نفسِه.
    await q(`UPDATE system_users SET branch_ids = $2::jsonb WHERE id = $1`, [ACC, JSON.stringify([BG, DQ])]);
    const inDq = await http("GET", "/api/reserve-withdrawals", { ...S.acc, branchId: DQ, accessibleBranches: [BG, DQ] });
    await q(`UPDATE system_users SET branch_ids = $2::jsonb, role = 'reception' WHERE id = $1`, [ACC, JSON.stringify([BG])]);
    const asRecv = await http("GET", "/api/reserve-withdrawals", { ...S.acc, role: "reception" });
    await q(`UPDATE system_users SET role = 'accountant' WHERE id = $1`, [ACC]);
    same("ج١ب. **غيرُ المسؤول في فرعه النشط وحده ومَن يكتب الدفترَ وحده**", [inDq.status, inDq.body?.length, asRecv.status], [200, 0, 403]);
    same("ج٣. **العدّادُ للمسؤول وحده**",
      [(await http("GET", "/api/reserve-withdrawals/pending-count", S.admin)).body?.count, (await http("GET", "/api/reserve-withdrawals/pending-count", S.acc)).status], [3, 403]);
    const sh = await sheet(S.acc2);
    same("ج٤. **الدفترُ يُظهر المعلَّقَ لكلّ مَن يفتحه** (وزميلُ بلا مفتاح لا يطلب)",
      [sh?.canRequestReserveWithdrawal, sh?.pendingReserveWithdrawals?.length, sh?.pendingReserveWithdrawals?.map((p: any) => p.mine)], [false, 3, [false, false, false]]);
    same("ج٥. ولصاحب الطلب «طلبُك» والمفتاحُ ظاهر",
      [(await sheet(S.acc))?.canRequestReserveWithdrawal, (await sheet(S.acc))?.pendingReserveWithdrawals?.find((p: any) => p.reserve === "materials")?.mine], [true, true]);

    console.log("\n── د. الاعتماد ──");
    same("د١. **الاعتمادُ والرفضُ للمسؤول وحده** (٤٠٣) — والطلبُ معلَّق",
      [(await http("POST", `/api/reserve-withdrawals/${r1.body?.id}/approve`, S.acc, {})).status,
       (await http("POST", `/api/reserve-withdrawals/${r1.body?.id}/reject`, S.mgr, { note: "لا" })).status,
       (await q(`SELECT status FROM reserve_withdrawal_requests WHERE id=$1`, [r1.body?.id]))[0]?.status], [403, 403, "pending"]);
    //  ضغطتان متزامنتان — سحبٌ واحد.
    const [a1, a2] = await Promise.all([
      http("POST", `/api/reserve-withdrawals/${r1.body?.id}/approve`, S.admin, { note: "تمّ" }),
      http("POST", `/api/reserve-withdrawals/${r1.body?.id}/approve`, S.admin, {}),
    ]);
    const es = await entries();
    same("د٢. **الاعتمادُ يكتب سطرَ السحب نفسَه بيوم الاعتماد** — مرّةً واحدة ولو تزامنت الضغطتان",
      [[a1.status, a2.status].sort(), es.length, es[0]?.kind, es[0]?.amount, es[0]?.day, Number(es[0]?.created_by),
       String(es[0]?.note).includes("مواد سيليكون"), String(es[0]?.note).includes("u9962")],
      [[200, 409], 1, "materials_withdrawn", 250_000, TODAY, ADMIN, true, true]);
    const done = (await q(`SELECT status, entry_id, decided_by, decision_note FROM reserve_withdrawal_requests WHERE id=$1`, [r1.body?.id]))[0];
    same("د٣. **والقاصةُ تنقص بالمبلغ** والطلبُ محسومٌ مربوطٌ بسطره",
      [await remaining("materials"), (await sheet(S.admin))?.reserves?.materials?.withdrawn, done?.status, done?.entry_id != null, Number(done?.decided_by)],
      [150_000, 250_000, "approved", true, ADMIN]);
    const aud = await q(`SELECT entity_type, action, notes FROM audit_log WHERE branch_id=$1 AND entity_type IN ('cash_book_entry','reserve_withdrawal_request') ORDER BY id`, [BG]);
    same("د٤. **سطرا تدقيق**: سطرُ الدفتر «بطلب» صاحبه، والاعتمادُ على الطلب",
      [aud.filter((a) => a.entity_type === "cash_book_entry").map((a) => String(a.notes).includes("بطلب u9962")),
       aud.filter((a) => a.entity_type === "reserve_withdrawal_request").map((a) => a.action)], [[true], ["create", "create", "create", "approve"]]);
    const dec = await outbox("reserve_withdrawal_decided");
    same("د٥. **الطالبُ يُبلَّغ وحده** بالقرار",
      [dec.length, (dec[0]?.target_user_ids ?? []).map(Number), String(dec[0]?.text).includes("اعتُمد"), String(dec[0]?.text).includes("250,000")],
      [1, [ACC], true, true]);
    same("د٦. **ولا قرارَ ثانٍ** على محسوم (٤٠٩) — والسطرُ واحد",
      [(await http("POST", `/api/reserve-withdrawals/${r1.body?.id}/reject`, S.admin, { note: "تأخّر" })).status, (await entries()).length], [409, 1]);
    same("د٧. **وبعد الحسم يُطلب على القاصة نفسِها من جديد**",
      (await ask(S.acc, { book: "devices", reserve: "materials", amount: 50_000, purpose: `أدوات ${MARK}` })).status, 200);

    console.log("\n── هـ. الرفض ──");
    const pr = payrollCard?.id;
    same("هـ١. **الرفضُ بلا سبب ⟵ ٤٠٠**", (await http("POST", `/api/reserve-withdrawals/${pr}/reject`, S.admin, { note: "" })).status, 400);
    const rj = await http("POST", `/api/reserve-withdrawals/${pr}/reject`, S.admin, { note: "الرصيد لا يكفي" });
    same("هـ٢. **الرفضُ لا يغيّر شيئاً** — القاصةُ كما هي ولا سطر",
      [rj.status, rj.body?.status, rj.body?.decisionNote, await remaining("payroll"), (await entries()).filter((e) => e.kind === "payroll_withdrawn").length],
      [200, "rejected", "الرصيد لا يكفي", 2_000_000, 0]);
    const dec2 = (await outbox("reserve_withdrawal_decided")).filter((d) => (d.target_user_ids ?? []).map(Number).includes(MGR));
    same("هـ٣. **والسببُ يصل الطالب**", [dec2.length, String(dec2[0]?.text).includes("رُفض"), String(dec2[0]?.text).includes("الرصيد لا يكفي")], [1, true, true]);

    console.log("\n── و. القواعد ──");
    same("و١. المبلغُ بالكلمات",
      [1000, 2000, 25_000, 150_000, 500_000, 1_250_000, 3_500_000, 12_000_000].map(amountInArabicWords),
      ["ألف دينار", "ألفا دينار", "خمسة وعشرون ألف دينار", "مئة وخمسون ألف دينار", "خمسمئة ألف دينار", "مليون ومئتان وخمسون ألف دينار",
       "ثلاثة ملايين وخمسمئة ألف دينار", "اثنا عشر مليون دينار"]);
    same("و٢. **مَن يحقّ له التنبيهان**: «ينتظر القرار» للمسؤول وحده، و«قرارُ طلبه» لمَن يكتب الدفتر",
      ["admin", "accountant", "branch_manager", "reception"].map((role) => [
        eligibleStaffEvents({ role }).includes("reserve_withdrawal_pending"), eligibleStaffEvents({ role }).includes("reserve_withdrawal_decided")]),
      [[true, true], [false, true], [false, true], [false, false]]);
    //  مراجعةُ Codex على #698: الطالبُ صار استقبالاً قبل القرار — ردُّ طلبه يصله، وغيرُ الموجَّه لا يتجاوز الدور.
    await q(`INSERT INTO staff_telegram_links (user_id, chat_id) VALUES ($1, 'rw-test-chat') ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id`, [ACC]);
    await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1, 'reserve_withdrawal_decided'), ($1, 'money_correction_pending') ON CONFLICT DO NOTHING`, [ACC]);
    await q(`UPDATE system_users SET role = 'reception' WHERE id = $1`, [ACC]);
    const toAcc = async (event: string, targets: number[] | null) => (await resolveStaffRecipients({ event_type: event, branch_id: BG, target_user_ids: targets, exclude_user_id: null, specialty: null }))
      .map((r) => r.userId).includes(ACC);
    same("و٣. **ردُّ الطلب يصل صاحبَه ولو تغيّر دورُه** — والنوعُ غيرُ الموجَّه يبقى بالدور",
      [await toAcc("reserve_withdrawal_decided", [ACC]), await toAcc("money_correction_pending", null)], [true, false]);
    await q(`UPDATE system_users SET role = 'accountant' WHERE id = $1`, [ACC]);
    await q(`DELETE FROM staff_telegram_links WHERE user_id = $1`, [ACC]);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّ التأكيدات نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); process.exit(1); });
