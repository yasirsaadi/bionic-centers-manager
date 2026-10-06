// **المدقّقُ الماليّ في المساعد** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.cd) — حيّاً على Postgres، عبر `executeTool` نفسِه.
// قاعدة محلّية: `npm run test:ai-audit`.
//
//   • **أ**: مَن يراه — المسؤولُ ومديرُ الفرع (ولو بلا صلاحية المحاسبة)، لا محاسبُ الاستقبال ولا الموظّف.
//   • **ب**: النطاق — المديرُ على فرعه النشط ولو طلب غيرَه، والمسؤولُ على ما يختار، وقاصةُ الدكتور للمسؤول وحده.
//   • **ج**: الجرد — الأرقامُ أرقامُ المحاسبة والدفتر، ونسبةُ الدكتور مسحوباتٌ لا مصروف.
//   • **د**: المطابقات — كلُّ حكمٍ يُحسب في الخادم: المتبقّي السالب، ونسبةُ المستشفى، والمكرّر، وبلا وصف، والمتأخّر، والحذف.
//   • **هـ**: كشفُ الحركات — المجموعُ على كلّ ما طابق لا على المعروض.

import { pool } from "./db";
import { resolveAiAccess } from "./ai/access";
import { executeTool, toolsFor } from "./ai/tools/registry";
import { getSheet } from "./cash_book/store";
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

const MARK = "اختبار-المدقق";
const DQ = 9711, BG = 9712;
const BRANCHES = [DQ, BG];
const DQ_NAME = `${MARK} ذي قار`, BG_NAME = `${MARK} بغداد`;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const TODAY = baghdadTodayYmd();
const D1 = addDays(TODAY, -10), D2 = addDays(TODAY, -9);
const noon = (ymd: string) => new Date(`${ymd}T12:00:00+03:00`);

async function cleanup() {
  const pids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM audit_log WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM payments WHERE patient_id IN (${pids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${pids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${pids})`).catch(() => undefined);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function expense(day: string, category: string, section: string, amount: number, description: string | null, createdAt?: Date) {
  await q(`INSERT INTO expenses (branch_id, category, section, amount, expense_date, description, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`, [DQ, category, section, amount, day, description, createdAt ?? noon(day)]);
}

const access = (session: any, branchName: string | null, scopeBranchId: number | null) =>
  resolveAiAccess({ session, branchName, scopeBranchId });
const SESS = {
  admin: { userId: 1, role: "admin", isAdmin: true, branchId: 0, permissions: {} },
  mgrDq: { userId: 2, role: "branch_manager", isAdmin: false, branchId: DQ, accessibleBranches: [DQ, BG], permissions: {} },
  mgrBg: { userId: 3, role: "branch_manager", isAdmin: false, branchId: BG, accessibleBranches: [BG], permissions: { canManageAccounting: true } },
  accountant: { userId: 4, role: "reception", isAdmin: false, branchId: DQ, accessibleBranches: [DQ], permissions: { canManageAccounting: true } },
  staff: { userId: 5, role: "reception", isAdmin: false, branchId: DQ, accessibleBranches: [DQ], permissions: { canViewPatients: true } },
};

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [DQ, DQ_NAME, BG, BG_NAME]);
  await cleanup();
  try {
    // ── البذرة: ذي قار بدفترين، ١٠٪ للدكتور و١٠٪ للمستشفى ──
    const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
         is_amputee, is_physiotherapy, total_cost, patient_classification)
       VALUES ($1,'07701234567',$2,'40','172','78','x',$3,true,true,0,'new') RETURNING id, patient_code`, [`${MARK} مريض`, MARK, DQ]);
    const mkCase = async (t: string) => (await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
       VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [p.id, DQ, t]))[0].id;
    const dev = await mkCase("prosthetic"), phy = await mkCase("physiotherapy");
    const pay = (amount: number, caseId: number, day: string) =>
      q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, date) VALUES ($1,$2,$3,$4,$5)`, [p.id, DQ, amount, caseId, noon(day)]);
    await pay(1_000_000, dev, D1); await pay(400_000, phy, D1); await pay(200_000, dev, D2);
    await expense(D1, "utilities", "prosthetic", 50_000, "كهرباء المولّد");
    await expense(D1, "transport", "prosthetic", 30_000, "وقود سيارة");
    await expense(D1, "transport", "prosthetic", 30_000, "وقود سيارة");               // مكرّر
    await expense(D1, "hospital_percentage", "prosthetic", 100_000, "نسبة المستشفى"); // = ١٠٪ من ١٬٠٠٠٬٠٠٠ ✓
    await expense(D2, "maintenance", "prosthetic", 20_000, null);                       // بلا وصف
    await expense(D1, "rent", "physio", 100_000, "إيجار", new Date(noon(D1).getTime() + 6 * 86_400_000)); // متأخّر ٦ أيام
    await q(`INSERT INTO cash_book_openings (branch_id, book, opening_date, cash_balance, ratio_balance) VALUES ($1,'devices',$2,0,0),($1,'physio',$2,0,0)`, [DQ, D1]);
    await q(`INSERT INTO cash_book_entries (branch_id, book, entry_date, kind, amount, note) VALUES ($1,'devices',$2,'dr_transfer',1000000,'تحويل')`, [DQ, D2]);
    await q(`INSERT INTO audit_log (entity_type, entity_id, action, user_name, branch_id, old_values, created_at)
             VALUES ('payment', 1, 'delete', 'موظف تجريبي', $1, '{"amount":75000}', $2)`, [DQ, noon(D2)]);

    // ══ أ. مَن يراه ══
    console.log("\n── أ. مَن يراه ──");
    const aAdmin = access(SESS.admin, null, null);
    const aMgr = access(SESS.mgrDq, DQ_NAME, DQ);
    const aAcc = access(SESS.accountant, DQ_NAME, DQ);
    const aStaff = access(SESS.staff, DQ_NAME, DQ);
    const offered = (a: any) => toolsFor(a).map((t) => t.name).filter((n) => n === "financial_audit" || n === "financial_ledger");
    same("أ١. المسؤولُ ومديرُ الفرع (بلا صلاحية المحاسبة) يُعرض عليهما المدقّق",
      [offered(aAdmin), offered(aMgr)], [["financial_audit", "financial_ledger"], ["financial_audit", "financial_ledger"]]);
    same("أ٢. **ومحاسبُ الاستقبال بصلاحية المحاسبة والموظّفُ لا** — قرارُ المالك «المدراء وحدهم والمسؤول»",
      [offered(aAcc), offered(aStaff), aAcc.mode], [[], [], "general"]);
    const deniedAcc = await executeTool(aAcc, "financial_audit", { startDate: D1, endDate: D2 });
    same("أ٣. ونداءٌ مخترَع من المحاسب يُردّ قبل القاعدة", [deniedAcc.ok, String(deniedAcc.data.error)], [false, "هذه الأداة غير متاحة لصلاحيتك."]);

    // ══ ب. النطاق ══
    console.log("\n── ب. النطاق ──");
    const asked = await executeTool(access(SESS.mgrBg, BG_NAME, BG), "financial_audit", { startDate: D1, endDate: D2, branchId: DQ });
    same("ب١. **مديرُ بغداد يطلب ذي قار ⟵ يُجرَد فرعُه هو**", [asked.ok, (asked.data as any).scope.branch, (asked.data as any).totals.cashIn], [true, BG_NAME, 0]);
    const adminDq = await executeTool(aAdmin, "financial_audit", { startDate: D1, endDate: D2, branchId: DQ });
    same("ب٢. والمسؤولُ يختار ذي قار", [(adminDq.data as any).scope.branch, (adminDq.data as any).scope.days], [DQ_NAME, 2]);
    const mgr = await executeTool(aMgr, "financial_audit", { startDate: D1, endDate: D2 });
    const A: any = mgr.data;
    same("ب٣. **قاصةُ الدكتور للمسؤول وحده**", [A.drBox === null, (adminDq.data as any).drBox !== null], [true, true]);

    // ══ ج. الجرد ══
    console.log("\n── ج. الجرد ──");
    same("ج١. الوارد · المصاريف · الصافي · نسبةُ الدكتور · الصافي بعدها",
      [A.totals.cashIn, A.totals.expenses, A.totals.net, A.totals.ownerDrawings, A.totals.netAfterOwnerDrawings],
      [1_600_000, 330_000, 1_270_000, 160_000, 1_110_000]);
    same("ج٢. الوارد بالأقسام — أطراف ١٬٢٠٠٬٠٠٠ (٧٥٪) وعلاج طبيعي ٤٠٠٬٠٠٠ (٢٥٪)",
      A.cashIn.byDepartment.map((d: any) => [d.label, d.amount, d.count, d.sharePct]),
      [["الأطراف الصناعية", 1_200_000, 2, 75], ["العلاج الطبيعي", 400_000, 1, 25]]);
    same("ج٣. المصاريف بالأبواب — ونسبةُ المستشفى باسمها لا برمزها",
      A.expenses.byCategory.map((c: any) => [c.label, c.amount]),
      [["إيجارات", 100_000], ["نسبة المستشفى", 100_000], ["نقل", 60_000], ["كهرباء ومياه", 50_000], ["صيانة", 20_000]]);
    const devBook = A.cashBooks.find((b: any) => b.book === "الأطراف والمساند" || b.book?.includes("أطراف"));
    const sheetD2 = await getSheet(DQ, "devices", D2);
    same("ج٤. **متبقّي الدفتر آخرَ الفترة = متبقّي ورقة اليوم نفسِها** (−١٥٠٬٠٠٠)",
      [devBook?.endRemaining, sheetD2.totals.remaining], [-150_000, -150_000]);
    same("ج٥. ونسبةُ الدكتور بفرعها ونسبتها", A.ownerDrawings, [{ branch: DQ_NAME, pct: 10, amount: 160_000 }]);

    // ══ د. المطابقات ══
    console.log("\n── د. المطابقات ──");
    const st = (code: string) => A.checks.filter((c: any) => c.code === code).map((c: any) => c.status);
    same("د١. السطورُ تطابق المحاسبة، والصافي، والدفترُ يطابق المحاسبة",
      [st("cash_in_lines"), st("expense_lines"), st("net"), st("book_vs_accounting")], [["ok"], ["ok"], ["ok"], ["ok"]]);
    same("د٢. **المتبقّي السالب خلل** في دفتر الأطراف وحده", st("book_negative").sort(), ["fail", "ok"]);
    const neg = A.checks.find((c: any) => c.code === "book_negative" && c.status === "fail");
    check(String(neg?.detail).includes(D2) && String(neg?.detail).includes("-150,000"), "د٣. ودليلُه اليومُ والمبلغ", String(neg?.detail));
    same("د٤. نسبةُ المستشفى غير المطابقة — الأطراف يوم ٢ والعلاج يوم ١",
      A.cashBooks.map((b: any) => b.hospitalMismatches.map((m: any) => [m.date, m.expected, m.recorded])),
      [[[D2, 20_000, 0]], [[D1, 40_000, 0]]]);
    same("د٥. المكرّرُ وبلا وصف والمتأخّرُ والحذف ملاحظات",
      [st("expense_duplicates"), st("expense_bare"), st("expense_late"), st("money_deletions")], [["warn"], ["warn"], ["warn"], ["warn"]]);
    same("د٦. وتفاصيلُها",
      [A.expenses.duplicates.map((d: any) => [d.category, d.amount, d.times]), A.expenses.withoutDescription.count,
       A.expenses.enteredLate.sample.map((x: any) => x.lagDays), A.changes.latest.map((c: any) => [c.entity, c.action, c.user, c.amountBefore])],
      [[["نقل", 30_000, 2]], 1, [6], [["دفعة", "حذف", "موظف تجريبي", 75_000]]]);

    // ══ هـ. كشفُ الحركات ══
    console.log("\n── هـ. كشفُ الحركات ──");
    const led = await executeTool(aMgr, "financial_ledger", { kind: "expenses", startDate: D1, endDate: D2, category: "نقل", limit: 1 });
    same("هـ١. **المجموعُ على كلّ ما طابق** ولو عُرض سطرٌ واحد",
      [(led.data as any).matchedCount, (led.data as any).matchedTotal, (led.data as any).rows.length, (led.data as any).truncated], [2, 60_000, 1, true]);
    const phyPays = await executeTool(aMgr, "financial_ledger", { kind: "payments", startDate: D1, endDate: D2, department: "علاج طبيعي" });
    same("هـ٢. دفعاتُ العلاج الطبيعي", [(phyPays.data as any).matchedCount, (phyPays.data as any).matchedTotal], [1, 400_000]);
    const ents = await executeTool(aMgr, "financial_ledger", { kind: "cash_book_entries", startDate: D1, endDate: D2 });
    same("هـ٣. سطورُ الدفتر — التحويلُ إلى قاصة الدكتور", (ents.data as any).rows.map((r: any) => [r.kind, r.amount]), [["تحويل إلى قاصة الدكتور", 1_000_000]]);
    const bad = await executeTool(aMgr, "financial_ledger", { kind: "salaries", startDate: D1, endDate: D2 });
    check(bad.ok === false, "هـ٤. نوعُ كشفٍ غير معروف يُرفض صراحةً", JSON.stringify(bad.data));
  } finally {
    await cleanup();
    await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [BRANCHES]).catch(() => undefined);
  }
  console.log(failures === 0 ? "\n✅ كل فحوص المدقّق الماليّ نجحت" : `\n❌ ${failures} فشل`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
