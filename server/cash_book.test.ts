// **دفترُ القاصة اليوميّ** (قرارُ المالك ٢٠٢٦-١٠-٠٦، ترحيل ٠٩٨، §4.ca) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:cash-book`.
//
//   • **أ**: مَن يقرأ ويكتب — المحاسبُ ومديرُ الفرع والمسؤولُ وحدهم، وفي فرعهم النشط.
//   • **ب**: الرصيدُ الافتتاحيّ — قبله لا كتابة، والموظّفُ يسجّله مرّةً، والمسؤولُ يعدّله.
//   • **ج**: الوارد — دفعاتُ المرضى بقسم حالتها لكلّ دفتر، والدفعةُ بلا قسم في دفتر الأطراف موسومةً، و«وارد آخر».
//   • **د**: الصادر — المصروفُ صفٌّ في `expenses` بقسم الدفتر، والتحويلُ ليس مصروفاً.
//   • **هـ**: النسب — لا نسبةَ للدكتور من يوم القطع (§4.dj)؛ والمستشفى لذي قار مصروفاً؛ والعتبة لكربلاء بيد.
//   • **و**: الحساب — مجموعُ اليوم والباقي من أمس والمتبقي، وما بقي من النسبة واستلامُه للمسؤول؛ ولا مجموعَ للتحويلات.
//   • **ن**: نسبةُ الدكتور قبل يوم القطع بأيّامٍ ثابتة (٢٠٢٦-١٠-٠٩ و١٠) — كما كانت، وورقتُها المطبوعة لا تُعلَّم، ولا نسبةَ بعده.
//   • **س**: قاصةُ المواد وقاصةُ الرواتب والإيجار (§4.dj) — التراكمُ والسحبُ للمسؤول والبدايةُ والهدفُ، وتقاعدُ «رواتب» و«إيجارات».
//   • **ز**: الأقفال — الأيامُ الماضية للمسؤول، والنسبُ لا تُكتب بيد، والمصروفُ يعدّله صاحبُه أو صاحبُ «إدارة المحاسبة».
//   • **ح**: التدقيق · **ط**: المنطقُ الخالص.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createHash } from "crypto";
import {
  branchCashConfig, ratioAmount, dayNameOf, canWriteDay, drBoxAccountLabel, packSheetPages, distinctNoteParts,
  RESERVES_START, drRatioApplies, reserveStartOf, reserveBox, monthlyTargetLine,
} from "@shared/cash_book";
import { reserveBoxes, cashBookPeriod } from "./cash_book/store";
import { baghdadTodayYmd } from "@shared/visit_date";

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

const PORT = 6893;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-دفتر-القاصة";
const BGD = 9701, DQ = 9702, KRB = 9703;
const ADMIN = 9971, ACC = 9972, MGR = 9973, RECV = 9974, ACC_DQ = 9975, ACC_KRB = 9976;
const USERS = [ADMIN, ACC, MGR, RECV, ACC_DQ, ACC_KRB];
const BRANCHES = [BGD, DQ, KRB];

const sess = (userId: number, role: string, branchId: number, extra: any = {}) => ({
  userId, role, isAdmin: role === "admin", branchId, accessibleBranches: [branchId], displayName: `u${userId}`, permissions: {}, ...extra,
});
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BGD, accessibleBranches: BRANCHES, displayName: "المسؤول", permissions: {} },
  acc: sess(ACC, "accountant", BGD),
  mgr: sess(MGR, "branch_manager", BGD),
  recv: sess(RECV, "reception", BGD, { permissions: { canAddPatients: true, canViewPatients: true, canAddExpenses: true } }),
  accDq: sess(ACC_DQ, "accountant", DQ),
  accKrb: sess(ACC_KRB, "accountant", KRB),
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
function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const TODAY = baghdadTodayYmd();
const YDAY = addDays(TODAY, -1);
/** نسبةُ أمس (٢٠٪ من ٣٠٠ ألف) — **ما دام أمسُ قبل يوم القطع** (§4.dj): اليومَ نعم، ومن الغد لا. وما قبل القطع يُحرس بأيّامٍ ثابتة في «ن». */
const RY = drRatioApplies(YDAY) ? 60_000 : 0;
/** يومان ثابتان قبل يوم القطع — لا يتغيّران بيوم التشغيل. */
const D1 = "2026-10-09", D2 = "2026-10-10";
/** منتصفُ نهار بغداد لتاريخٍ ما — لا يقع على حدّ يوم. */
const noon = (ymd: string) => new Date(`${ymd}T12:00:00+03:00`);

async function cleanup() {
  const pids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type='expense'
             AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[])))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM journal_entries WHERE source_type='expense' AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[]))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM dr_box_expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM dr_box_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_prints WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_reserves WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM money_correction_requests WHERE branch_id = ANY($1::int[])`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM staff_notification_outbox WHERE branch_id = ANY($1::int[])`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM payments WHERE patient_id IN (${pids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${pids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${pids})`).catch(() => undefined);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(branchId: number) {
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','x',$3,true,true,0,'new') RETURNING id`, [`${MARK} ${branchId}`, MARK, branchId]);
  const mk = async (t: string) => (await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [p.id, branchId, t]))[0].id;
  return { id: Number(p.id), dev: Number(await mk("prosthetic")), phy: Number(await mk("physiotherapy")) };
}
async function pay(patientId: number, branchId: number, amount: number, caseId: number | null, when: Date) {
  await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, date) VALUES ($1,$2,$3,$4,$5)`,
    [patientId, branchId, amount, caseId, when]);
}

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4),($5,$6) ON CONFLICT DO NOTHING`,
    [BGD, `${MARK} بغداد`, DQ, `${MARK} ذي قار`, KRB, `${MARK} كربلاء`]);
  for (const [id, role, br] of [[ADMIN, "admin", BGD], [ACC, "accountant", BGD], [MGR, "branch_manager", BGD], [RECV, "reception", BGD],
    [ACC_DQ, "accountant", DQ], [ACC_KRB, "accountant", KRB]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true`,
      [id, `cb_u${id}`, `u${id}`, role, br, JSON.stringify(role === "admin" ? BRANCHES : [br])]);
  }
  await q(`UPDATE system_users SET can_add_expenses=true, can_manage_accounting=false WHERE id = ANY($1::int[])`, [[ACC, MGR, ACC_DQ, ACC_KRB]]);
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

  const sheet = (s: any, book = "devices", date = TODAY, branchId?: number) =>
    http("GET", `/api/cash-book?book=${book}&date=${date}${branchId ? `&branchId=${branchId}` : ""}`, s);
  const row = (s: any, body: any) => http("POST", "/api/cash-book/rows", s, { book: "devices", date: TODAY, ...body });
  const ratio = (s: any, body: any) => http("POST", "/api/cash-book/ratio", s, { book: "devices", date: TODAY, ...body });

  try {
    const P = await mkPatient(BGD);
    await pay(P.id, BGD, 1_000_000, P.dev, noon(TODAY));
    await pay(P.id, BGD, 500_000, P.phy, noon(TODAY));
    await pay(P.id, BGD, 200_000, null, noon(TODAY));
    await pay(P.id, BGD, 300_000, P.dev, noon(YDAY));

    console.log("\n── أ. مَن يقرأ ويكتب ──");
    same("أ١. **الاستقبالُ لا يرى الدفتر** — ٤٠٣", (await sheet(S.recv)).status, 403);
    same("أ٢. **والمحاسبُ في فرعه النشط وحده** — فرعٌ آخر ٤٠٣", (await sheet(S.acc, "devices", TODAY, DQ)).status, 403);
    same("أ٣. **والمسؤولُ يختار الفرع** — بلا فرع ٤٠٠، وبفرعٍ ٢٠٠",
      [(await http("GET", `/api/cash-book?book=devices`, { ...S.admin, branchId: 0 })).status, (await sheet(S.admin, "devices", TODAY, BGD)).status], [400, 200]);
    same("أ٤. **وكربلاء بلا دفتر علاج طبيعي** — ٤٠٠", (await sheet(S.accKrb, "physio")).status, 400);

    console.log("\n── ب. الرصيد الافتتاحيّ ──");
    const s0 = await sheet(S.acc);
    same("ب١. قبله: لا رصيد، ولا كتابة", [s0.body?.opening, s0.body?.canWrite], [null, false]);
    same("ب٢. **ولا سطرَ قبل الرصيد** — ٤٠٩", (await row(S.acc, { kind: "dr_transfer", amount: 1000 })).status, 409);
    same("ب٣. **بدايةُ الدفتر للمسؤول وحده** — ٤٠٣ للمحاسب ولمدير الفرع، ولا صفَّ يُكتب",
      [(await http("POST", "/api/cash-book/opening", S.acc, { book: "devices", openingDate: YDAY, cash: 100_000, ratio: 50_000 })).status,
       (await http("POST", "/api/cash-book/opening", S.mgr, { book: "devices", openingDate: YDAY, cash: 100_000, ratio: 50_000 })).status,
       (await q(`SELECT count(*)::int AS n FROM cash_book_openings WHERE branch_id=$1`, [BGD]))[0].n],
      [403, 403, 0]);
    same("ب٤. **والمسؤولُ يسجّلها ثمّ يعدّلها** — بدأ خطأً بأصفارٍ اليوم، ثمّ صحّحها (أمس، ١٠٠ ألف و٥٠ ألفاً)",
      [(await http("POST", "/api/cash-book/opening", S.admin, { branchId: BGD, book: "devices", openingDate: TODAY, cash: 0, ratio: 0 })).status,
       (await http("POST", "/api/cash-book/opening", S.admin, { branchId: BGD, book: "devices", openingDate: YDAY, cash: 100_000, ratio: 50_000 })).status,
       (await sheet(S.acc)).body?.opening,
       (await q(`SELECT count(*)::int AS n FROM cash_book_openings WHERE branch_id=$1 AND book='devices'`, [BGD]))[0].n],
      [200, 200, { date: YDAY, cash: 100_000, ratio: 50_000 }, 1]);
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: BGD, book: "physio", openingDate: TODAY, cash: 0, ratio: 0 });

    console.log("\n── ج. الوارد ──");
    let d = (await sheet(S.acc)).body;
    const incomeRows = (b: any) => (b?.rows ?? []).filter((r: any) => r.column === "income");
    same("ج١. **دفترُ الأطراف: دفعةُ حالة الأطراف، والدفعةُ بلا قسم موسومةً** — ولا دفعةَ العلاج الطبيعي",
      incomeRows(d).map((r: any) => [r.amount, r.unsectioned]), [[1_000_000, false], [200_000, true]]);
    same("ج٢. **ودفترُ العلاج الطبيعي دفعتُه وحدها**", incomeRows((await sheet(S.acc, "physio")).body).map((r: any) => r.amount), [500_000]);
    same("ج٣. **«وارد آخر» بلا ملاحظة ⟵ ٤٠٠**، وبها يُحفَظ",
      [(await row(S.acc, { kind: "income_other", amount: 50_000 })).status,
       (await row(S.acc, { kind: "income_other", amount: 50_000, note: "بيع جوارب" })).status], [400, 200]);

    console.log("\n── د. الصادر ──");
    const ex = await row(S.acc, { kind: "expense", amount: 150_000, category: "maintenance", note: "تصليح" });
    const [er] = await q(`SELECT section, expense_date::text d, category, amount FROM expenses WHERE id=$1`, [ex.body?.id]);
    same("د١. **المصروفُ صفٌّ في `expenses` بقسم الدفتر ويومه** — فيدخل تقاريرَ المحاسبة", er, { section: "prosthetic", d: TODAY, category: "maintenance", amount: 150_000 });
    same("د٢. **بلا باب ⟵ ٤٠٠**، و«أخرى» بلا ملاحظة ⟵ ٤٠٠",
      [(await row(S.acc, { kind: "expense", amount: 1000 })).status, (await row(S.acc, { kind: "expense", amount: 1000, category: "other" })).status], [400, 400]);
    same("د٣. **التحويلُ إلى قاصة الدكتور ليس مصروفاً** — لا صفَّ في `expenses`",
      [(await row(S.acc, { kind: "dr_transfer", amount: 400_000, note: "يوم أمس" })).status,
       Number((await q(`SELECT count(*)::int n FROM expenses WHERE branch_id=$1`, [BGD]))[0].n)], [200, 1]);
    same("د٤. **ومبلغٌ صفرٌ أو كسرٌ ⟵ ٤٠٠**",
      [(await row(S.acc, { kind: "dr_transfer", amount: 0 })).status, (await row(S.acc, { kind: "dr_transfer", amount: 10.5 })).status], [400, 400]);

    console.log("\n── هـ. النسب ──");
    //  **نسبةُ الدكتور أُلغيت من يوم القطع** (قرارُ المالك ٢٠٢٦-١٠-١١، §4.dj) — واليومُ بعده دائماً. وما قبله في «ن» بأيّامٍ ثابتة.
    const drRows = (b: any) => (b?.rows ?? []).filter((r: any) => r.kind === "dr_ratio").map((r: any) => [r.source, r.amount]);
    d = (await sheet(S.acc)).body;
    same("هـ١. **لا سطرَ «نسبة الدكتور» من يوم القطع** — وارد بغداد ١,٢٥٠,٠٠٠ يبقى في القاصة، ولا نسبةَ متوقَّعة",
      [drRows(d), d.expected?.drRatio, d.ratio?.today], [[], null, 0]);
    await row(S.acc, { kind: "income_other", amount: 50_000, note: "استرداد" });
    d = (await sheet(S.acc)).body;
    same("هـ٢. **ووارد جديد لا يُعيدها**", drRows(d), []);
    const noBtn = await ratio(S.acc, { kind: "dr_ratio" });
    same("هـ٣. **ولا تُضاف بزرّ** — ٤٠٠ برسالةٍ تقول إنها أُلغيت وما بدلها", [noBtn.status, /أُلغيت/.test(noBtn.body?.error ?? "") && /قاصة المواد/.test(noBtn.body?.error ?? "")], [400, true]);
    //  ما سُجّل يدوياً قبل القرار لا يُقرأ بعده — فلا تُحسب النسبةُ مرّتين.
    await q(`INSERT INTO cash_book_entries (branch_id, book, entry_date, kind, amount) VALUES ($1,'devices',$2,'dr_ratio',999)`, [BGD, TODAY]);
    same("هـ٣ب. **والنسبةُ المسجَّلةُ يدوياً قديماً لا تُقرأ**", drRows((await sheet(S.acc)).body), []);
    same("هـ٤. **ولا نسبةَ مستشفى ولا عتبة لبغداد** — ٤٠٠", [(await ratio(S.acc, { kind: "hospital_ratio" })).status,
      (await row(S.acc, { kind: "atabah_ratio", amount: 1000 })).status], [400, 400]);

    const PD = await mkPatient(DQ);
    await pay(PD.id, DQ, 800_000, PD.dev, noon(TODAY));
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: DQ, book: "devices", openingDate: TODAY, cash: 0, ratio: 0 });
    const h1 = await ratio(S.accDq, { kind: "hospital_ratio" });
    await ratio(S.accDq, { kind: "hospital_ratio" });
    const hosp = await q(`SELECT amount, section, category FROM expenses WHERE branch_id=$1 AND category='hospital_percentage'`, [DQ]);
    same("هـ٥. **نسبةُ مستشفى ذي قار ١٠٪ مصروفاً حقيقيّاً، صفّاً واحداً لليوم**", [h1.body?.amount, hosp], [80_000, [{ amount: 80_000, section: "prosthetic", category: "hospital_percentage" }]]);
    same("هـ٦. **ولا نسبةَ دكتور لذي قار اليوم** — «ارجع ما تمّ قطعه» (المالك)", drRows((await sheet(S.accDq)).body), []);

    await http("POST", "/api/cash-book/opening", S.admin, { branchId: KRB, book: "devices", openingDate: TODAY, cash: 0, ratio: 0 });
    const at = await row(S.accKrb, { kind: "atabah_ratio", amount: 70_000, note: "حصة العتبة" });
    const [atr] = await q(`SELECT category, amount FROM expenses WHERE id=$1`, [at.body?.id]);
    same("هـ٧. **نسبةُ العتبة لكربلاء بيد المحاسب — مصروفٌ بفئتها**", atr, { category: "shrine_percentage", amount: 70_000 });

    console.log("\n── و. الحساب ──");
    d = (await sheet(S.acc)).body;
    same("و١. **مجموعُ اليوم والباقي من أمس والمتبقي** — الصادر مصروفٌ ١٥٠ ألفاً وتحويلٌ ٤٠٠ ألف بلا نسبة، والباقي من أمس = افتتاحيّ ١٠٠ ألف + وارد أمس ٣٠٠ ألف − نسبةُ أمس إن كان قبل القطع",
      d.totals, { income: 1_300_000, outflow: 550_000, dayNet: 750_000, prevRemaining: 400_000 - RY, remaining: 1_150_000 - RY });
    same("و٢. **ولا مجموعَ للتحويلات في الردّ** — الصادرُ رقمٌ واحد", Object.keys(d.totals).some((k) => /transfer/i.test(k)), false);
    same("و٣. **ما بقي من النسبة**: لا نسبةَ اليوم، والمتبقي من أمس (٥٠ ألفاً افتتاحيّ + نسبةُ أمس إن كان قبل القطع)", [d.ratio.today, d.ratio.prev, d.ratio.remaining], [0, 50_000 + RY, 50_000 + RY]);
    same("و٤. **واستلامُ ما بقي من النسبة للمسؤول وحده** (٤٠٣ للمحاسب)", (await row(S.acc, { kind: "ratio_received", amount: 30_000 })).status, 403);
    await row(S.admin, { branchId: BGD, kind: "ratio_received", amount: 30_000, note: "استلمت" });
    d = (await sheet(S.acc)).body;
    same("و٥. **فينقص المتبقي في النسبة ولا يمسّ القاصة**", [d.ratio.remaining, d.totals.remaining], [20_000 + RY, 1_150_000 - RY]);
    const tomorrowLike = (await sheet(S.admin, "devices", TODAY, BGD)).body;
    same("و٦. **وكلُّ يومٍ يبدأ من باقي سابقه**: يومُ الافتتاح باقيه الافتتاحيّ",
      (await sheet(S.acc, "devices", YDAY)).body?.totals?.prevRemaining, 100_000);
    check(tomorrowLike?.totals?.remaining === 1_150_000 - RY, "و٧. والمسؤولُ يرى الصفحةَ نفسَها بالأرقام نفسِها");

    console.log("\n── ز. الأقفال ──");
    same("ز١. **الأمسُ مقفلٌ على المحاسب** (٤٠٣)، **ومفتوحٌ للمسؤول** (٢٠٠)",
      [(await row(S.acc, { kind: "dr_transfer", amount: 1000, date: YDAY })).status,
       (await row(S.admin, { branchId: BGD, kind: "dr_transfer", amount: 1000, date: YDAY })).status], [403, 200]);
    same("ز٢. **مبلغُ نسبة الدكتور لا يُكتب بيد ولا يُحذف** — سطرٌ محسوب، ٤٠٠",
      [(await http("PATCH", `/api/cash-book/rows/auto/0`, S.acc, { amount: 1 })).status, (await http("DELETE", `/api/cash-book/rows/auto/0`, S.acc)).status], [400, 400]);
    //  **تصحيحُ سطرٍ مكتوب للمسؤول وحده** (قرارُ المالك ٢٠٢٦-١٠-٠٧): الموظّفُ — محاسباً أو مديراً، كاتباً للسطر أو غيرَه — لا يعدّل ولا يحذف.
    const tr = d.rows.find((r: any) => r.kind === "dr_transfer");
    same("ز٣. **ولا يعدّل الموظّفُ سطراً كتبه** — مصروفاً أو تحويلاً، كاتبَه أو مديراً (٤٠٣)، **والمسؤولُ يعدّل** (٢٠٠)",
      [(await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.acc, { amount: 160_000 })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.mgr, { amount: 160_000 })).status,
       (await http("PATCH", `/api/cash-book/rows/entry/${tr.id}`, S.acc, { amount: 1 })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.admin, { amount: 160_000 })).status], [403, 403, 403, 200]);
    same("ز٣ب. **ولا يحذفه ليعيد كتابته** (٤٠٣) — والسطرُ باقٍ",
      [(await http("DELETE", `/api/cash-book/rows/entry/${tr.id}`, S.acc)).status, (await http("DELETE", `/api/cash-book/rows/expense/${ex.body.id}`, S.mgr)).status,
       (await q(`SELECT deleted_at IS NULL alive FROM cash_book_entries WHERE id=$1`, [tr.id]))[0].alive], [403, 403, true]);
    same("ز٤. **والمسؤولُ يحذف، والحذفُ ناعم** — يبقى الصفُّ بختمه", [(await http("DELETE", `/api/cash-book/rows/entry/${tr.id}`, S.admin)).status,
      (await q(`SELECT deleted_at IS NOT NULL del, deleted_by FROM cash_book_entries WHERE id=$1`, [tr.id]))[0]], [200, { del: true, deleted_by: ADMIN }]);

    console.log("\n── ي. قاصة الدكتور (§4.cb) ──");
    await row(S.acc, { kind: "dr_transfer", amount: 500_000, note: "اليوم" });
    await row(S.accDq, { kind: "dr_transfer", amount: 70_000 });
    const box = (s: any, from = YDAY, to = TODAY, branchId = BGD) => http("GET", `/api/dr-box?branchId=${branchId}&from=${from}&to=${to}`, s);
    const spend = (s: any, body: any) => http("POST", "/api/dr-box/expenses", s, { branchId: BGD, date: TODAY, category: "salaries", amount: 300_000, ...body });
    same("ي١. **للمسؤول وحده** — التقريرُ والصرفُ ٤٠٣ للمحاسب ولمدير الفرع، ولا صفَّ يُكتب",
      [(await box(S.acc)).status, (await box(S.mgr)).status, (await spend(S.acc, {})).status, (await spend(S.mgr, {})).status,
       Number((await q(`SELECT count(*)::int n FROM dr_box_expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]))[0].n)],
      [403, 403, 403, 403, 0]);
    const expBefore = Number((await q(`SELECT count(*)::int n FROM expenses WHERE branch_id=$1`, [BGD]))[0].n);
    const sheetBefore = (await sheet(S.acc)).body;
    const sp = await spend(S.admin, { note: "ملاحظة سرية" });
    let rep = (await box(S.admin)).body;
    same("ي٢. **الواردُ تحويلاتُ الفرع وحده، والرصيدُ = ما وصل − ما صُرف** (٥٠٠ ألف + ألف أمس − ٣٠٠ ألف) — وتحويلُ ذي قار خارجه",
      [sp.status, rep.totals], [200, { received: 501_000, spent: 300_000, balance: 201_000 }]);
    const sheetAfter = (await sheet(S.acc)).body;
    same("ي٣. **ولا يمسّ قاصةَ الفرع**: لا صفَّ في `expenses`، ومجموعُ الصادر والمتبقي كما هما",
      [Number((await q(`SELECT count(*)::int n FROM expenses WHERE branch_id=$1`, [BGD]))[0].n), sheetAfter.totals], [expBefore, sheetBefore.totals]);
    same("ي٤. **والفرعُ يرى اليومَ والبابَ فقط** — بلا مبلغٍ ولا ملاحظة",
      [sheetAfter.drBoxLines, JSON.stringify(sheetAfter).includes("سرية")], [[{ id: sp.body.id, category: "salaries" }], false]);
    same("ي٥. **وفي فرعه وحده** — ذي قار لا يرى صرفَ بغداد، ولا في يومٍ آخر",
      [(await sheet(S.accDq)).body?.drBoxLines, (await sheet(S.acc, "devices", YDAY)).body?.drBoxLines], [[], []]);
    rep = (await box(S.admin, TODAY, TODAY)).body;
    same("ي٦. **والفترةُ تحصر الحركةَ ولا تحصر الرصيد**", [rep.period, rep.transfers.length, rep.totals.balance],
      [{ received: 500_000, spent: 300_000 }, 1, 201_000]);
    same("ي٧. **مبلغٌ صفر، وبلا باب، وتاريخٌ لم يأتِ** — ٤٠٠",
      [(await spend(S.admin, { amount: 0 })).status, (await spend(S.admin, { category: "" })).status, (await spend(S.admin, { date: addDays(TODAY, 1) })).status],
      [400, 400, 400]);
    await http("PATCH", `/api/dr-box/expenses/${sp.body.id}`, S.admin, { amount: 350_000 });
    same("ي٨. **والتعديلُ للمسؤول** (٤٠٣ للمحاسب) ويغيّر الرصيد",
      [(await http("PATCH", `/api/dr-box/expenses/${sp.body.id}`, S.acc, { amount: 1 })).status, (await box(S.admin)).body.totals.balance], [403, 151_000]);
    same("ي٩. **والحذفُ للمسؤول، ناعم** — يعود الرصيد ويختفي السطرُ من دفتر الفرع",
      [(await http("DELETE", `/api/dr-box/expenses/${sp.body.id}`, S.acc)).status,
       (await http("DELETE", `/api/dr-box/expenses/${sp.body.id}`, S.admin)).status,
       (await box(S.admin)).body.totals.balance, (await sheet(S.acc)).body.drBoxLines,
       (await q(`SELECT deleted_at IS NOT NULL del, deleted_by FROM dr_box_expenses WHERE id=$1`, [sp.body.id]))[0]],
      [403, 200, 501_000, [], { del: true, deleted_by: ADMIN }]);
    same("ي١٠. **وكلُّ كتابةٍ بسطر تدقيق**",
      (await q(`SELECT action FROM audit_log WHERE entity_type='dr_box_expense' AND entity_id=$1 ORDER BY id`, [sp.body.id])).map((a) => a.action),
      ["create", "update", "delete"]);

    //  الرصيدُ الافتتاحيّ لقاصة الدكتور (تكملة §4.cb): يضعه المسؤولُ، ومن يومه يبدأ الحساب.
    const setOpen = (s: any, body: any) => http("POST", "/api/dr-box/opening", s, { branchId: BGD, ...body });
    same("ي١١. **الافتتاحيُّ للمسؤول وحده** — ٤٠٣ للمحاسب، ولا صفّ",
      [(await setOpen(S.acc, { openingDate: TODAY, amount: 1_000_000 })).status,
       Number((await q(`SELECT count(*)::int n FROM dr_box_openings WHERE branch_id=$1`, [BGD]))[0].n)], [403, 0]);
    await setOpen(S.admin, { openingDate: TODAY, amount: 1_000_000 });
    await spend(S.admin, { date: YDAY, amount: 50_000 });
    rep = (await box(S.admin)).body;
    same("ي١٢. **ومن يومه يبدأ الحساب**: الافتتاحيّ مليون + تحويلُ اليوم ٥٠٠ ألف — وتحويلُ أمس ومصروفُه خارجه",
      [rep.opening, rep.totals], [{ date: TODAY, amount: 1_000_000 }, { received: 500_000, spent: 0, balance: 1_500_000 }]);
    await setOpen(S.admin, { openingDate: YDAY, amount: 200_000 });
    rep = (await box(S.admin)).body;
    same("ي١٣. **ويعدّله المسؤولُ** — من أمس بمئتي ألف: + ٥٠١ ألف − ٥٠ ألفاً، وصفٌّ واحد وسطرا تدقيق",
      [rep.totals, Number((await q(`SELECT count(*)::int n FROM dr_box_openings WHERE branch_id=$1`, [BGD]))[0].n),
       (await q(`SELECT action FROM audit_log WHERE entity_type='dr_box_opening' AND branch_id=$1 ORDER BY id`, [BGD])).map((a) => a.action)],
      [{ received: 501_000, spent: 50_000, balance: 651_000 }, 1, ["create", "update"]]);
    same("ي١٤. **وحسابُ كلّ فرعٍ كما في تطبيق «كي كارت»**: بغداد ٢٠٠٩ · ذي قار ٤٣٢٥ · كربلاء «حساب السوبر» · والموصل بلا حساب",
      [rep.branch.account, (await box(S.admin, YDAY, TODAY, DQ)).body?.branch?.account, (await box(S.admin, YDAY, TODAY, KRB)).body?.branch?.account,
       drBoxAccountLabel("بايونك الموصل")],
      ["كي كارت 2009", "كي كارت 4325", "حساب السوبر", null]);
    same("ي١٥. **وتاريخٌ لم يأتِ أو رصيدٌ سالب** — ٤٠٠",
      [(await setOpen(S.admin, { openingDate: addDays(TODAY, 1), amount: 1 })).status, (await setOpen(S.admin, { openingDate: TODAY, amount: -5 })).status],
      [400, 400]);

    //  خلاصةُ المالك لكلّ الفروع (§4.cb تكملة) — يقرؤها المساعدُ الذكيّ بجلسة المالك.
    const sumOf = (s: any, q = "") => http("GET", `/api/dr-box/summary${q}`, s);
    same("ي١٦. **خلاصةُ المالك للمسؤول وحده** — ٤٠٣ للمحاسب ولمدير الفرع", [(await sumOf(S.acc)).status, (await sumOf(S.mgr)).status], [403, 403]);
    const sm = (await sumOf(S.admin, `?from=${YDAY}&to=${TODAY}`)).body;
    const smList: any[] = Object.values(sm.branches);
    const sb = smList.find((b: any) => b.id === BGD);
    const boxB = (await box(S.admin)).body;
    const devB = (await sheet(S.admin, "devices", TODAY, BGD)).body;
    same("ي١٧. **أرقامُها هي أرقامُ الشاشتين نفسِها** — رصيدُ القاصة والحساب، والمتبقي في القاصة والنسبة من دفتر اليوم",
      [sb.account, sb.drBox.balance, sb.drBox.received, sb.books.find((k: any) => k.book === "devices").cashRemaining,
       sb.books.find((k: any) => k.book === "devices").ratioRemaining],
      ["كي كارت 2009", boxB.totals.balance, boxB.totals.received, devB.totals.remaining, devB.ratio.remaining]);
    same("ي١٨. **ومجاميعُ الفترة لكلّ دفتر** — تحويلاتُ بغداد (٥٠٠ ألف + ألف أمس) ونسبتُها (أمسُ وحده إن كان قبل القطع، ولا شيءَ اليوم) والمستلَم، وتحويلُ ذي قار وحده لذي قار",
      [sb.books.find((k: any) => k.book === "devices").period, smList.find((b: any) => b.id === DQ).books[0].period.drTransfers],
      [{ drTransfers: 501_000, drRatio: RY, ratioReceived: 30_000 }, 70_000]);
    same("ي١٩. **والمجاميعُ الكلّية جمعُ الفروع**",
      [sm.totals.drBoxBalance, sm.totals.periodDrTransfers],
      [smList.reduce((a: number, b: any) => a + b.drBox.balance, 0),
       smList.reduce((a: number, b: any) => a + b.books.reduce((x: number, k: any) => x + k.period.drTransfers, 0), 0)]);


    console.log("\n── ن. نسبة الدكتور قبل يوم القطع — بأيّامٍ ثابتة (§4.dj) ──");
    //  دفترُ العلاج الطبيعي لذي قار يبدأ ٢٠٢٦-١٠-٠٩ (قبل القطع): وارد ٤٠٠ ألف يومَ ٩ و٢٠٠ ألف يومَ ١٠ و٣٠٠ ألف اليوم.
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: DQ, book: "physio", openingDate: D1, cash: 1_000_000, ratio: 5_000 });
    await pay(PD.id, DQ, 400_000, PD.phy, noon(D1));
    await pay(PD.id, DQ, 200_000, PD.phy, noon(D2));
    await pay(PD.id, DQ, 300_000, PD.phy, noon(TODAY));
    const dq = (date: string) => sheet(S.admin, "physio", date, DQ);
    const n1 = (await dq(D2)).body;
    same("ن١. **قبل القطع كما كانت**: نسبةُ ذي قار ١٠٪ تلقائياً (٢٠٠ ألف ⟵ ٢٠ ألفاً)، ومربّعُها (٥ آلاف افتتاحيّ + ٤٠ ألفاً نسبةُ يوم ٩)، والباقي من أمس بعدها، ولا قاصتين",
      [drRows(n1), [n1.ratio.today, n1.ratio.prev, n1.ratio.remaining], n1.expected?.drRatio, n1.totals.prevRemaining, n1.reserves],
      [[["auto", 20_000]], [20_000, 45_000, 65_000], { pct: 10, amount: 20_000, recorded: 20_000 }, 1_360_000, null]);
    const n2 = (await dq(TODAY)).body;
    same("ن٢. **ومن يوم القطع لا نسبة**: لا سطرَ ولا نسبةَ اليوم، والباقي من أمس = مليون + ٦٠٠ ألف − ٦٠ ألفاً نسبةُ اليومين، وما بقي من النسبة يُحمل، والقاصتان ظاهرتان",
      [drRows(n2), n2.ratio.today, n2.ratio.prev, n2.totals.prevRemaining, Boolean(n2.reserves)], [[], 0, 65_000, 1_540_000, true]);
    //  ورقةٌ طُبعت قبل القطع ببصمة الصيغة السابقة (بلا مفتاح القاصتين) — تبقى مطابقةً لما في التطبيق.
    const oldFingerprint = (sh: any) => createHash("sha1").update(JSON.stringify({
      branch: sh.branch?.id, book: sh.book, day: sh.day, opening: sh.opening ?? null,
      rows: sh.rows.map((r: any) => [r.source, r.id, r.column, r.amount, r.note, r.category ?? null]),
      totals: sh.totals, ratio: [sh.ratio.today, sh.ratio.prev, sh.ratio.received, sh.ratio.remaining],
      drBox: (sh.drBoxLines ?? []).map((l: any) => [l.id, l.category]),
    })).digest("hex");
    await q(`INSERT INTO cash_book_prints (branch_id, book, day, fingerprint, printed_by_name) VALUES ($1,'physio',$2,$3,'قبل القطع')`, [DQ, D2, oldFingerprint(n1)]);
    same("ن٣. **ورقةٌ طُبعت قبل القطع لا تُعلَّم «عُدّلت بعد الطباعة»** — بصمتُها بالصيغة السابقة تطابق", (await dq(D2)).body.changedAfterPrint, false);
    await row(S.admin, { branchId: DQ, book: "physio", kind: "ratio_received", amount: 65_000, note: "صفّرتُها" });
    const n4 = (await dq(TODAY)).body;
    same("ن٤. **والمسؤولُ يستلم ما بقي من النسبة فيصفر** — ولا يمسّ القاصة", [n4.ratio.remaining, n4.totals.remaining], [0, n2.totals.remaining]);
    const n6 = (await dq(addDays(TODAY, 1))).body;
    same("ن٦. **وورقةُ الغد تبدأ من متبقّي اليوم كاملاً** — لا نسبةَ تُطرح من يومٍ بعد القطع", [n6.totals.prevRemaining, n6.ratio.prev], [n4.totals.remaining, 0]);
    const per: any = await cashBookPeriod(DQ, "physio", D1, TODAY);
    same("ن٥. **ودفترُ الفترة للمدقّق بالقاعدة نفسِها**: نسبةُ اليومين ٦٠ ألفاً وحدها، والمتبقي = مليون + ٩٠٠ ألف − ٦٠ ألفاً",
      [per.period.drRatio, per.endRemaining, per.endRatioBalance], [60_000, 1_840_000, 0]);

    console.log("\n── ل. نسبة الدكتور في التقرير المحاسبي — مسحوبات المالك (§4.ca تكملةٌ رابعة) ──");
    const acct = (await http("GET", `/api/accounting/summary?branchId=${DQ}&startDate=${D1}&endDate=${TODAY}`, S.admin)).body;
    const odB = acct.ownerDrawings?.byBranch?.find((b: any) => b.branchId === DQ);
    same("ل١. **سطرٌ مستقلّ بنسبة الفرع للأيام قبل القطع وحدها** — ذي قار ١٠٪: ٤٠ ألفاً + ٢٠ ألفاً، ولا شيءَ من وارد اليوم",
      [odB?.pct, odB?.amount, acct.ownerDrawings?.total], [10, 60_000, 60_000]);
    same("ل٢. **وليست من المصاريف** — المصاريفُ والصافي كما هما، والصافي بعدها مطروحاً منه",
      [acct.ownerDrawings?.netAfter, Number(acct.totalExpenses) === Number((await q(
        `SELECT COALESCE(SUM(amount),0)::bigint n FROM expenses WHERE branch_id=$1 AND expense_date BETWEEN $2 AND $3`, [DQ, D1, TODAY]))[0].n)],
      [acct.netProfit - 60_000, true]);
    const acctAfter = (await http("GET", `/api/accounting/summary?branchId=${DQ}&startDate=${RESERVES_START}&endDate=${TODAY}`, S.admin)).body;
    same("ل٣. **وفترةٌ بعد القطع لا سطرَ فيها** — لا «نسبة الدكتور» بصفر", [acctAfter.ownerDrawings?.byBranch, acctAfter.ownerDrawings?.total], [[], 0]);

    console.log("\n── ك. طباعة ورقة الدفتر (§4.ca تكملة) ──");
    const printed = (s: any, body: any) => http("POST", "/api/cash-book/printed", s, { book: "devices", date: TODAY, ...body });
    same("ك١. **الاستقبالُ لا يطبع**، وتاريخٌ لم يأتِ ٤٠٠، ويومٌ قبل بداية الدفتر ٤٠٩",
      [(await printed(S.recv, {})).status, (await printed(S.acc, { date: addDays(TODAY, 1) })).status,
       (await printed(S.admin, { branchId: BGD, date: addDays(YDAY, -3) })).status], [403, 400, 409]);
    const p1 = await printed(S.acc, {});
    let ps = (await sheet(S.acc)).body;
    same("ك٢. **المحاسبُ يطبع ورقةَ اليوم** — تُسجَّل باسمه، ولا «تعديلَ بعد الطباعة»",
      [p1.status, ps.lastPrint?.by, ps.changedAfterPrint], [200, `u${ACC}`, false]);
    await row(S.acc, { kind: "income_other", amount: 5_000, note: "بعد الطباعة" });
    same("ك٣. **سطرٌ بعد الطباعة ⟵ «عُدّلت بعد الطباعة»**", (await sheet(S.acc)).body.changedAfterPrint, true);
    await printed(S.acc, {});
    same("ك٤. **والطباعةُ من جديد تُطفئها** — وطباعتان في السجلّ",
      [(await sheet(S.acc)).body.changedAfterPrint, Number((await q(`SELECT count(*)::int n FROM cash_book_prints WHERE branch_id=$1 AND day=$2`, [BGD, TODAY]))[0].n)],
      [false, 2]);
    //  الملاحظةُ وحدها تتغيّر (لا مبلغ) ⟵ سطورُ الورقة وحدها تختلف.
    const after = (await sheet(S.acc)).body.rows.find((r: any) => r.note === "بعد الطباعة");
    await http("PATCH", `/api/cash-book/rows/entry/${after.id}`, S.admin, { note: "بعد الطباعة — مصحّحة" });
    same("ك٤ب. **تصحيحُ ملاحظةٍ بلا مبلغ يُعلَّم أيضاً** — ما طُبع نصُّه تغيّر", (await sheet(S.acc)).body.changedAfterPrint, true);
    await printed(S.acc, {});
    //  سطرٌ في الأمس ⟵ «الباقي من أمس» لليوم يتغيّر، وسطورُ اليوم كما هي.
    const yRow = await row(S.admin, { branchId: BGD, kind: "income_other", amount: 7_000, note: "وارد متأخّر", date: YDAY });
    same("ك٤ج. **سطرٌ في يومٍ سابق يغيّر «الباقي من أمس» فتُعلَّم ورقةُ اليوم**", (await sheet(S.acc)).body.changedAfterPrint, true);
    await http("DELETE", `/api/cash-book/rows/entry/${yRow.body.id}`, S.admin);
    same("ك٤د. **وحذفُه يعيد ورقةَ اليوم مطابقةً**", (await sheet(S.acc)).body.changedAfterPrint, false);
    await printed(S.admin, { branchId: BGD, date: YDAY });
    const op = (await sheet(S.admin, "devices", TODAY, BGD)).body.opening;
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: BGD, book: "devices", openingDate: op.date, cash: op.cash + 1_000, ratio: op.ratio });
    same("ك٥. **وتغييرُ ما قبل اليوم يغيّر «الباقي من أمس» فيُعلَّم كذلك** — تعديلُ بداية الدفتر بعد طباعة الأمس",
      (await sheet(S.admin, "devices", YDAY, BGD)).body.changedAfterPrint, true);
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: BGD, book: "devices", openingDate: op.date, cash: op.cash, ratio: op.ratio });
    same("ك٦. **وإعادتُها كما كانت تُعيد الورقةَ مطابقةً لما طُبع**", (await sheet(S.admin, "devices", YDAY, BGD)).body.changedAfterPrint, false);

    console.log("\n── م. المصروفُ لا يُكتب وصفُه مرّتين (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨) ──");
    //  «أخرى» يُحفظ وصفُه في خانتين (`subcategory` و`description`) — فكان السطرُ «قرطاسية — قرطاسية». في آخر الحزمة: لا يمسّ مجاميعَ ما قبله.
    const other = await row(S.acc, { kind: "expense", amount: 2_000, category: "other", note: "قرطاسية" });
    const [stored] = await q(`SELECT subcategory, description FROM expenses WHERE id=$1`, [other.body?.id]);
    const otherRow = ((await sheet(S.acc)).body?.rows ?? []).find((r: any) => r.source === "expense" && r.id === other.body?.id);
    same("م١. **«أخرى» بوصفه مرّةً واحدة في الدفتر** — والخانتان كما هما لتقارير المحاسبة",
      [other.status, stored?.subcategory, stored?.description, otherRow?.note], [200, "قرطاسية", "قرطاسية", "قرطاسية"]);


    console.log("\n── س. قاصة المواد وقاصة الرواتب والإيجار (§4.dj) ──");
    const rsv = async (s: any = S.acc, book = "devices") => (await sheet(s, book)).body;
    const pick = (b: any) => (b ? [b.today, b.prev, b.withdrawn, b.remaining] : null);
    const r0 = await rsv();
    same("س٠. **تبدآن من يوم القطع (أو من بداية الدفتر بعده) بصفر**",
      [r0.reserves?.start, pick(r0.reserves?.materials), pick(r0.reserves?.payroll), r0.reserves?.payroll?.month], [reserveStartOf(YDAY), [0, 0, 0, 0], [0, 0, 0, 0], null]);
    const mat = await row(S.acc, { kind: "expense", amount: 200_000, category: "materials_reserve", note: "عزل مواد" });
    const pr = await row(S.acc, { kind: "expense", amount: 100_000, category: "payroll_rent" });
    const r1 = await rsv();
    same("س١. **«أجور مواد» و«رواتب وإيجار» مصروفٌ عاديّ** — صفّان في `expenses` بقسم الدفتر، وينقص بهما المتبقي في القاصة ٣٠٠ ألف",
      [mat.status, pr.status, await q(`SELECT category, section FROM expenses WHERE id = ANY($1::int[]) ORDER BY id`, [[mat.body?.id, pr.body?.id]]),
       r1.totals.remaining],
      [200, 200, [{ category: "materials_reserve", section: "prosthetic" }, { category: "payroll_rent", section: "prosthetic" }], r0.totals.remaining - 300_000]);
    same("س٢. **ويتراكم كلٌّ في قاصته**", [pick(r1.reserves.materials), pick(r1.reserves.payroll)], [[200_000, 0, 0, 200_000], [100_000, 0, 0, 100_000]]);
    same("س٣. **ولكلّ دفترٍ قاصتاه** — دفترُ العلاج الطبيعي لبغداد لا يرى مصروفَ الأطراف", pick((await rsv(S.acc, "physio")).reserves?.materials), [0, 0, 0, 0]);
    const nEntries = async () => Number((await q(`SELECT count(*)::int n FROM cash_book_entries WHERE branch_id=$1 AND kind IN ('materials_withdrawn','payroll_withdrawn')`, [BGD]))[0].n);
    const nExp = async () => Number((await q(`SELECT count(*)::int n FROM expenses WHERE branch_id=$1`, [BGD]))[0].n);
    const wd = (sx: any, body: any) => row(sx, { kind: "materials_withdrawn", amount: 50_000, ...body });
    same("س٤. **السحبُ للمسؤول وحده** — ٤٠٣ للمحاسب ولمدير الفرع، ولا سطر", [(await wd(S.acc, {})).status, (await wd(S.mgr, {})).status, await nEntries()], [403, 403, 0]);
    const expBeforeW = await nExp();
    const w1 = await wd(S.admin, { branchId: BGD, note: "دفعة المورّد" });
    const r2 = await rsv();
    same("س٥. **سحبُ المالك ينقص القاصةَ وحدها** — لا صفَّ في `expenses` ولا يتغيّر نقدُ اليوم، ويظهر في المربّع",
      [w1.status, pick(r2.reserves.materials), r2.totals, await nExp(), r2.reserves.materials.withdrawals.map((x: any) => [x.amount, x.note])],
      [200, [200_000, 0, 50_000, 150_000], r1.totals, expBeforeW, [[50_000, "دفعة المورّد"]]]);
    const w2 = await row(S.admin, { branchId: BGD, kind: "payroll_withdrawn", amount: 150_000 });
    same("س٦. **وسحبُ أكثرَ ممّا عُزل لا يُمنع** — يصير المتبقي سالباً (يظهر أحمر)", [w2.status, (await rsv()).reserves.payroll.remaining], [200, -50_000]);
    const setR = (sx: any, body: any) => http("POST", "/api/cash-book/reserves", sx, { branchId: BGD, book: "devices", ...body });
    const nRes = async () => Number((await q(`SELECT count(*)::int n FROM cash_book_reserves WHERE branch_id=$1`, [BGD]))[0].n);
    same("س٧. **رصيدُ البداية والهدفُ للمسؤول وحده** — ٤٠٣ للمحاسب ولمدير الفرع، ولا صفّ",
      [(await setR(S.acc, { reserve: "materials", openingBalance: 1 })).status, (await setR(S.mgr, { reserve: "payroll", monthlyTarget: 5 })).status, await nRes()], [403, 403, 0]);
    await setR(S.admin, { reserve: "materials", openingBalance: 1_000_000 });
    await setR(S.admin, { reserve: "materials", openingBalance: 900_000 });
    same("س٨. **ورصيدُ البداية يدخل «المتبقي من أمس»** — ٩٠٠ ألف بعد تعديل المليون، صفٌّ واحد وسطرا تدقيق",
      [pick((await rsv()).reserves.materials), await nRes(),
       (await q(`SELECT action FROM audit_log WHERE entity_type='cash_book_reserve' AND branch_id=$1 ORDER BY id`, [BGD])).map((a) => a.action)],
      [[200_000, 900_000, 50_000, 1_050_000], 1, ["create", "update"]]);
    same("س٩. **والهدفُ لقاصة الرواتب والإيجار وحدها، والرصيدُ لا يكون سالباً** — ٤٠٠",
      [(await setR(S.admin, { reserve: "materials", monthlyTarget: 5 })).status, (await setR(S.admin, { reserve: "payroll", openingBalance: -1 })).status], [400, 400]);
    await setR(S.admin, { reserve: "payroll", monthlyTarget: 2_000_000 });
    same("س١٠. **ومع الهدف: كم عُزل هذا الشهر وكم بقي عليه**", (await rsv()).reserves.payroll.month, { target: 2_000_000, setAside: 100_000, left: 1_900_000 });
    await setR(S.admin, { reserve: "payroll", monthlyTarget: null });
    same("س١١. **وإزالةُ الهدف تُخفي سطره**", (await rsv()).reserves.payroll.month, null);

    const [oldSal] = await q(`INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, created_by)
      VALUES ($1,'salaries','prosthetic','راتب قديم',10000,$2,'x') RETURNING id`, [BGD, TODAY]);
    const viaAcc = await http("POST", "/api/expenses", S.admin, { branchId: BGD, category: "salaries", section: "prosthetic", amount: 1000, expenseDate: TODAY, description: "x" });
    same("س١٢. **«رواتب» و«إيجارات» تقاعدا** — مصروفٌ جديدٌ بهما ٤٠٠ في الدفتر وفي صفحة المحاسبة وفي طلب التصحيح، برسالةٍ تدلّ على «رواتب وإيجار»",
      [(await row(S.acc, { kind: "expense", amount: 1000, category: "salaries" })).status, (await row(S.acc, { kind: "expense", amount: 1000, category: "rent" })).status,
       viaAcc.status, /رواتب وإيجار/.test(viaAcc.body?.error ?? ""),
       (await http("POST", "/api/money-corrections", S.acc, { targetType: "expense", targetId: ex.body.id, action: "update", category: "salaries", reason: "خطأ في الباب" })).status],
      [400, 400, 400, true, 400]);
    same("س١٣. **والمكتوبُ بهما قبلُ يُعدَّل كما هو، ولا يُنقَل إليهما سطر** — في الدفتر وفي صفحة المحاسبة",
      [(await http("PATCH", `/api/cash-book/rows/expense/${oldSal.id}`, S.admin, { amount: 12_000 })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${oldSal.id}`, S.admin, { category: "rent" })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.admin, { category: "salaries" })).status,
       (await http("PUT", `/api/expenses/${ex.body.id}`, S.admin, { category: "rent" })).status,
       (await http("PUT", `/api/expenses/${oldSal.id}`, S.admin, { amount: 13_000 })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${oldSal.id}`, S.admin, { category: "payroll_rent" })).status],
      [200, 400, 400, 400, 200, 200]);
    same("س١٤. **وبابا القاصتين لا يُكتبان قبل بدايتهما** — دفترُ علاج ذي قار بدأ يوم ٩: يومُ ١٠ ⟵ ٤٠٠ في الدفتر وفي صفحة المحاسبة، والسحبُ كذلك",
      [(await row(S.admin, { branchId: DQ, book: "physio", date: D2, kind: "expense", category: "materials_reserve", amount: 1000 })).status,
       (await http("POST", "/api/expenses", S.admin, { branchId: DQ, category: "payroll_rent", section: "physio", amount: 1000, expenseDate: D2, description: "x" })).status,
       (await row(S.admin, { branchId: DQ, book: "physio", date: D2, kind: "materials_withdrawn", amount: 1000 })).status], [400, 400, 400]);
    const [preCut] = await q(`INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, created_by)
      VALUES ($1,'maintenance','physio','قبل القطع',5000,$2,'x') RETURNING id`, [DQ, D2]);
    same("س١٤ب. **ولا يُنقَل إليهما مصروفُ يومٍ قبل بدايتهما** — في الدفتر وفي صفحة المحاسبة (٤٠٠)، وتعديلُه بغيرهما يمضي",
      [(await http("PATCH", `/api/cash-book/rows/expense/${preCut.id}`, S.admin, { category: "materials_reserve" })).status,
       (await http("PUT", `/api/expenses/${preCut.id}`, S.admin, { category: "payroll_rent" })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${preCut.id}`, S.admin, { amount: 6_000 })).status], [400, 400, 200]);

    //  التراكمُ عبر الأيام بالحساب نفسِه وبدايةٍ ممرَّرةٍ صريحاً — فيومُ القطع الحقيقيّ لا يسبقه يومٌ في القاصة يُختبر عليه.
    const ins = (cat: string, amount: number, day: string) => q(`INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, created_by)
      VALUES ($1,$2,'physio','t',$3,$4,'x')`, [DQ, cat, amount, day]);
    await ins("materials_reserve", 70_000, D1); await ins("materials_reserve", 30_000, D2);
    await ins("payroll_rent", 40_000, D1); await ins("payroll_rent", 15_000, "2026-09-28");
    await q(`INSERT INTO cash_book_entries (branch_id, book, entry_date, kind, amount) VALUES ($1,'physio',$2,'materials_withdrawn',20000)`, [DQ, D2]);
    await http("POST", "/api/cash-book/reserves", S.admin, { branchId: DQ, book: "physio", reserve: "payroll", monthlyTarget: 100_000 });
    const cfgDq = branchCashConfig(`${MARK} ذي قار`);
    const atD1 = await reserveBoxes(DQ, cfgDq, "physio", D1, D1);
    const atD2 = await reserveBoxes(DQ, cfgDq, "physio", D2, D1);
    const atD3 = await reserveBoxes(DQ, cfgDq, "physio", "2026-10-11", D1);
    same("س١٥. **التراكمُ يوماً بعد يوم**: يومَ ٩ عُزل ٧٠ ألفاً، ويومَ ١٠ الباقي من أمس ٧٠ ألفاً + ٣٠ ألفاً − سحبُ ٢٠ ألفاً = ٨٠ ألفاً، ويومَ ١١ يبدأ منها",
      [pick(atD1?.materials), pick(atD2?.materials), atD3?.materials.prev], [[70_000, 0, 0, 70_000], [30_000, 70_000, 20_000, 80_000], 80_000]);
    const fromSep = await reserveBoxes(DQ, cfgDq, "physio", D2, "2026-09-25");
    same("س١٦. **والهدفُ يعدّ هذا الشهر وحده** — رواتبُ ٢٨ أيلول في الرصيد لا في عزل تشرين الأوّل",
      [fromSep?.payroll.prev, fromSep?.payroll.month], [55_000, { target: 100_000, setAside: 40_000, left: 60_000 }]);
    const dqNow = (await dq(TODAY)).body;
    same("س١٧. **ويومٌ قبل البداية لا قاصةَ له، والبدايةُ يومُ القطع** — ما كُتب قبله لا يدخل قاصة ذي قار",
      [await reserveBoxes(DQ, cfgDq, "physio", D1, D2), dqNow.reserves?.start, pick(dqNow.reserves?.materials)], [null, RESERVES_START, [0, 0, 0, 0]]);
    await printed(S.acc, {});
    same("س١٨. **وسحبٌ بعد الطباعة يعلّم الورقة** — القاصتان في بصمتها",
      [(await sheet(S.acc)).body.changedAfterPrint, (await row(S.admin, { branchId: BGD, kind: "materials_withdrawn", amount: 1_000 })).status,
       (await sheet(S.acc)).body.changedAfterPrint], [false, 200, true]);

    console.log("\n── ح. التدقيق ──");
    const aud = await q(`SELECT entity_type, action FROM audit_log WHERE user_id = ANY($1::int[]) AND entity_type IN ('cash_book_entry','cash_book_opening','expense') ORDER BY id`, [USERS]);
    check(aud.length >= 10 && aud.some((a) => a.entity_type === "cash_book_opening") && aud.some((a) => a.action === "delete"),
      "ح١. **كلُّ كتابةٍ بسطر تدقيق** — الافتتاحيُّ والسطورُ والحذف", JSON.stringify(aud.slice(0, 5)));

    console.log("\n── ط. المنطقُ الخالص ──");
    same("ط١. إعدادُ الفروع من الاسم", ["بايونك بغداد", "بايونك ذي قار", "الوارث كربلاء", "بايونك الموصل", "بايونك كركوك"].map((n) => {
      const c = branchCashConfig(n); return [c.books.length, c.drRatioPct, c.hospitalRatioPct, c.hasAtabahRatio];
    }), [[2, 20, null, false], [2, 10, 10, false], [1, 10, null, true], [1, 10, null, false], [1, null, null, false]]);
    same("ط١ب. الدفترُ الافتتاحيّ — ذي قار على «علاج طبيعي» والبقيّة على الأطراف", ["بايونك بغداد", "بايونك ذي قار", "الوارث كربلاء", "بايونك الموصل", "بايونك كركوك"]
      .map((n) => branchCashConfig(n).defaultBook), ["devices", "physio", "devices", "devices", "devices"]);
    //  تقطيعُ ورقة الطباعة بالارتفاع (شكوى «ورقة إضافية»): سطورٌ بارتفاع ٣٠، صفحةٌ وسطى ٦٠٠ والأخيرة ٥٤٠ بعد المجموع والمربّعين.
    const thirty = (n: number) => Array(n).fill(30);
    same("ط٥. **ما يتّسع في صفحةٍ واحدة يبقى فيها** — ١٨ سطراً (٥٤٠) ورقةٌ واحدة، لا ١٤ ثمّ ٤ كالحدّ الثابت القديم",
      [packSheetPages(thirty(18), 600, 540), packSheetPages(thirty(0), 600, 540), packSheetPages(thirty(5), 600, 540)], [[18], [0], [5]]);
    same("ط٦. وما يزيد يكمل في صفحةٍ تالية، والأخيرةُ لا تخلو من سطرٍ مع المجموع",
      [packSheetPages(thirty(19), 600, 540), packSheetPages(thirty(45), 600, 540), packSheetPages([700, 30], 600, 540)], [[18, 1], [20, 20, 5], [1, 1]]);
    same("ط٧. **أجزاءُ الوصف مميَّزة** — المكرَّرُ يسقط ولو بمسافاتٍ أخرى، واسمُ الباب لا يُعاد، والفارغُ لا يُكتب",
      [distinctNoteParts(["قرطاسية", " قرطاسية ", null, ""]), distinctNoteParts(["رواتب", "رواتب", "شهر أيلول"]),
        distinctNoteParts(["رواتب"], ["رواتب"]), distinctNoteParts(["أ", "ب", "أ"])],
      [["قرطاسية"], ["رواتب", "شهر أيلول"], [], ["أ", "ب"]]);
    same("ط٨. **يومُ القطع وبدايةُ القاصتين** — النسبةُ لما قبله، والقاصتان من يومه أو من بداية الدفتر بعده",
      [RESERVES_START, drRatioApplies("2026-10-10"), drRatioApplies("2026-10-11"), reserveStartOf("2026-10-07"), reserveStartOf("2026-11-01"), reserveStartOf(null)],
      ["2026-10-11", true, false, "2026-10-11", "2026-11-01", null]);
    same("ط٩. مربّعُ القاصة وهدفُ الشهر — والباقي على الهدف لا ينزل تحت الصفر",
      [reserveBox(100, 50, 30), monthlyTargetLine(40, 100), monthlyTargetLine(140, 100), monthlyTargetLine(10, null)],
      [{ today: 50, prev: 100, withdrawn: 30, remaining: 120 }, { target: 100, setAside: 40, left: 60 }, { target: 100, setAside: 140, left: 0 }, null]);
    same("ط٢. النسبةُ بالدينار الصحيح", [ratioAmount(1_250_000, 20), ratioAmount(15, 10), ratioAmount(0, 10), ratioAmount(100, null)], [250_000, 2, 0, 0]);
    same("ط٣. اسمُ اليوم من التاريخ وحده", [dayNameOf("2026-10-04"), dayNameOf("2026-10-03")], ["الأحد", "السبت"]);
    same("ط٤. اليومُ المفتوح", [canWriteDay({}, "2026-10-05", "2026-10-05", "2026-10-01"), canWriteDay({}, "2026-10-04", "2026-10-05", "2026-10-01"),
      canWriteDay({ isAdmin: true }, "2026-10-04", "2026-10-05", "2026-10-01"), canWriteDay({ isAdmin: true }, "2026-09-30", "2026-10-05", "2026-10-01"),
      canWriteDay({ isAdmin: true }, "2026-10-06", "2026-10-05", "2026-10-01")], [true, false, true, false, false]);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [BRANCHES]).catch((e) => console.error("branch cleanup:", e.message));
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص دفتر القاصة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
