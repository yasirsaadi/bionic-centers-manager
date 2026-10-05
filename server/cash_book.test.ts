// **دفترُ القاصة اليوميّ** (قرارُ المالك ٢٠٢٦-١٠-٠٦، ترحيل ٠٩٨، §4.ca) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:cash-book`.
//
//   • **أ**: مَن يقرأ ويكتب — المحاسبُ ومديرُ الفرع والمسؤولُ وحدهم، وفي فرعهم النشط.
//   • **ب**: الرصيدُ الافتتاحيّ — قبله لا كتابة، والموظّفُ يسجّله مرّةً، والمسؤولُ يعدّله.
//   • **ج**: الوارد — دفعاتُ المرضى بقسم حالتها لكلّ دفتر، والدفعةُ بلا قسم في دفتر الأطراف موسومةً، و«وارد آخر».
//   • **د**: الصادر — المصروفُ صفٌّ في `expenses` بقسم الدفتر، والتحويلُ ليس مصروفاً.
//   • **هـ**: النسب — الدكتور (بغداد ٢٠٪) من وارد الدفتر وحده، تُحدَّث ولا تتكرّر؛ والمستشفى لذي قار مصروفاً؛ والعتبة لكربلاء بيد.
//   • **و**: الحساب — مجموعُ اليوم والباقي من أمس والمتبقي، ومربّعُ النسبة واستلامُها للمسؤول؛ ولا مجموعَ للتحويلات.
//   • **ز**: الأقفال — الأيامُ الماضية للمسؤول، والنسبُ لا تُكتب بيد، والمصروفُ يعدّله صاحبُه أو صاحبُ «إدارة المحاسبة».
//   • **ح**: التدقيق · **ط**: المنطقُ الخالص.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { branchCashConfig, ratioAmount, dayNameOf, canWriteDay } from "@shared/cash_book";
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
/** منتصفُ نهار بغداد لتاريخٍ ما — لا يقع على حدّ يوم. */
const noon = (ymd: string) => new Date(`${ymd}T12:00:00+03:00`);

async function cleanup() {
  const pids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type='expense'
             AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[])))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM journal_entries WHERE source_type='expense' AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[]))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
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
    const ex = await row(S.acc, { kind: "expense", amount: 150_000, category: "salaries", note: "راتب" });
    const [er] = await q(`SELECT section, expense_date::text d, category, amount FROM expenses WHERE id=$1`, [ex.body?.id]);
    same("د١. **المصروفُ صفٌّ في `expenses` بقسم الدفتر ويومه** — فيدخل تقاريرَ المحاسبة", er, { section: "prosthetic", d: TODAY, category: "salaries", amount: 150_000 });
    same("د٢. **بلا باب ⟵ ٤٠٠**، و«أخرى» بلا ملاحظة ⟵ ٤٠٠",
      [(await row(S.acc, { kind: "expense", amount: 1000 })).status, (await row(S.acc, { kind: "expense", amount: 1000, category: "other" })).status], [400, 400]);
    same("د٣. **التحويلُ إلى قاصة الدكتور ليس مصروفاً** — لا صفَّ في `expenses`",
      [(await row(S.acc, { kind: "dr_transfer", amount: 400_000, note: "يوم أمس" })).status,
       Number((await q(`SELECT count(*)::int n FROM expenses WHERE branch_id=$1`, [BGD]))[0].n)], [200, 1]);
    same("د٤. **ومبلغٌ صفرٌ أو كسرٌ ⟵ ٤٠٠**",
      [(await row(S.acc, { kind: "dr_transfer", amount: 0 })).status, (await row(S.acc, { kind: "dr_transfer", amount: 10.5 })).status], [400, 400]);

    console.log("\n── هـ. النسب ──");
    const r1 = await ratio(S.acc, { kind: "dr_ratio" });
    same("هـ١. **نسبةُ الدكتور لبغداد ٢٠٪ من وارد الدفتر وحده** (١,٢٥٠,٠٠٠ ⟵ ٢٥٠,٠٠٠)", [r1.status, r1.body?.amount], [200, 250_000]);
    await row(S.acc, { kind: "income_other", amount: 50_000, note: "استرداد" });
    d = (await sheet(S.acc)).body;
    same("هـ٢. **وبعد وارد جديد: المحسوبُ الآن غيرُ المسجَّل** — فتُعرَف الحاجةُ للتحديث", [d.expected.drRatio.amount, d.expected.drRatio.recorded], [260_000, 250_000]);
    await ratio(S.acc, { kind: "dr_ratio" });
    d = (await sheet(S.acc)).body;
    same("هـ٣. **والتحديثُ يعدّل الصفَّ نفسَه ولا يكرّره**", d.rows.filter((r: any) => r.kind === "dr_ratio").map((r: any) => r.amount), [260_000]);
    same("هـ٤. **ولا نسبةَ مستشفى ولا عتبة لبغداد** — ٤٠٠", [(await ratio(S.acc, { kind: "hospital_ratio" })).status,
      (await row(S.acc, { kind: "atabah_ratio", amount: 1000 })).status], [400, 400]);

    const PD = await mkPatient(DQ);
    await pay(PD.id, DQ, 800_000, PD.dev, noon(TODAY));
    await http("POST", "/api/cash-book/opening", S.admin, { branchId: DQ, book: "devices", openingDate: TODAY, cash: 0, ratio: 0 });
    const h1 = await ratio(S.accDq, { kind: "hospital_ratio" });
    await ratio(S.accDq, { kind: "hospital_ratio" });
    const hosp = await q(`SELECT amount, section, category FROM expenses WHERE branch_id=$1 AND category='hospital_percentage'`, [DQ]);
    same("هـ٥. **نسبةُ مستشفى ذي قار ١٠٪ مصروفاً حقيقيّاً، صفّاً واحداً لليوم**", [h1.body?.amount, hosp], [80_000, [{ amount: 80_000, section: "prosthetic", category: "hospital_percentage" }]]);
    same("هـ٦. **ونسبةُ الدكتور لذي قار ١٠٪**", (await ratio(S.accDq, { kind: "dr_ratio" })).body?.amount, 80_000);

    await http("POST", "/api/cash-book/opening", S.admin, { branchId: KRB, book: "devices", openingDate: TODAY, cash: 0, ratio: 0 });
    const at = await row(S.accKrb, { kind: "atabah_ratio", amount: 70_000, note: "حصة العتبة" });
    const [atr] = await q(`SELECT category, amount FROM expenses WHERE id=$1`, [at.body?.id]);
    same("هـ٧. **نسبةُ العتبة لكربلاء بيد المحاسب — مصروفٌ بفئتها**", atr, { category: "shrine_percentage", amount: 70_000 });

    console.log("\n── و. الحساب ──");
    d = (await sheet(S.acc)).body;
    same("و١. **مجموعُ اليوم والباقي من أمس والمتبقي** — الباقي من أمس = افتتاحيّ ١٠٠ ألف + وارد أمس ٣٠٠ ألف",
      d.totals, { income: 1_300_000, outflow: 810_000, dayNet: 490_000, prevRemaining: 400_000, remaining: 890_000 });
    same("و٢. **ولا مجموعَ للتحويلات في الردّ** — الصادرُ رقمٌ واحد", Object.keys(d.totals).some((k) => /transfer/i.test(k)), false);
    same("و٣. **مربّعُ النسبة**: نسبةُ اليوم ٢٦٠ ألفاً + المتبقي من أمس ٥٠ ألفاً", [d.ratio.today, d.ratio.prev, d.ratio.remaining], [260_000, 50_000, 310_000]);
    same("و٤. **واستلامُ النسبة للمسؤول وحده** (٤٠٣ للمحاسب)", (await row(S.acc, { kind: "ratio_received", amount: 100_000 })).status, 403);
    await row(S.admin, { branchId: BGD, kind: "ratio_received", amount: 100_000, note: "استلمت" });
    d = (await sheet(S.acc)).body;
    same("و٥. **فينقص المتبقي في النسبة ولا يمسّ القاصة**", [d.ratio.remaining, d.totals.remaining], [210_000, 890_000]);
    const tomorrowLike = (await sheet(S.admin, "devices", TODAY, BGD)).body;
    same("و٦. **وكلُّ يومٍ يبدأ من باقي سابقه**: يومُ الافتتاح باقيه الافتتاحيّ",
      (await sheet(S.acc, "devices", YDAY)).body?.totals?.prevRemaining, 100_000);
    check(tomorrowLike?.totals?.remaining === 890_000, "و٧. والمسؤولُ يرى الصفحةَ نفسَها بالأرقام نفسِها");

    console.log("\n── ز. الأقفال ──");
    same("ز١. **الأمسُ مقفلٌ على المحاسب** (٤٠٣)، **ومفتوحٌ للمسؤول** (٢٠٠)",
      [(await row(S.acc, { kind: "dr_transfer", amount: 1000, date: YDAY })).status,
       (await row(S.admin, { branchId: BGD, kind: "dr_transfer", amount: 1000, date: YDAY })).status], [403, 200]);
    const drId = d.rows.find((r: any) => r.kind === "dr_ratio").id;
    same("ز٢. **مبلغُ نسبة الدكتور لا يُكتب بيد** — ٤٠٠", (await http("PATCH", `/api/cash-book/rows/entry/${drId}`, S.acc, { amount: 1 })).status, 400);
    same("ز٣. **ومصروفُ المحاسب لا يعدّله المديرُ بلا «إدارة المحاسبة»** (٤٠٣)، ويعدّله كاتبُه (٢٠٠)",
      [(await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.mgr, { amount: 160_000 })).status,
       (await http("PATCH", `/api/cash-book/rows/expense/${ex.body.id}`, S.acc, { amount: 160_000 })).status], [403, 200]);
    const tr = d.rows.find((r: any) => r.kind === "dr_transfer");
    same("ز٤. **والحذفُ ناعم** — يبقى الصفُّ بختمه", [(await http("DELETE", `/api/cash-book/rows/entry/${tr.id}`, S.acc)).status,
      (await q(`SELECT deleted_at IS NOT NULL del, deleted_by FROM cash_book_entries WHERE id=$1`, [tr.id]))[0]], [200, { del: true, deleted_by: ACC }]);

    console.log("\n── ح. التدقيق ──");
    const aud = await q(`SELECT entity_type, action FROM audit_log WHERE user_id = ANY($1::int[]) AND entity_type IN ('cash_book_entry','cash_book_opening','expense') ORDER BY id`, [USERS]);
    check(aud.length >= 10 && aud.some((a) => a.entity_type === "cash_book_opening") && aud.some((a) => a.action === "delete"),
      "ح١. **كلُّ كتابةٍ بسطر تدقيق** — الافتتاحيُّ والسطورُ والحذف", JSON.stringify(aud.slice(0, 5)));

    console.log("\n── ط. المنطقُ الخالص ──");
    same("ط١. إعدادُ الفروع من الاسم", ["بايونك بغداد", "بايونك ذي قار", "الوارث كربلاء", "بايونك الموصل", "بايونك كركوك"].map((n) => {
      const c = branchCashConfig(n); return [c.books.length, c.drRatioPct, c.hospitalRatioPct, c.hasAtabahRatio];
    }), [[2, 20, null, false], [2, 10, 10, false], [1, 10, null, true], [1, 10, null, false], [1, null, null, false]]);
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
