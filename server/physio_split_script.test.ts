// **سكربتُ يوم الفصل على قاعدةٍ حقيقية** — `scripts/physio_split_2026_11_21.sql` (§4.gq).
// `npm run test:physio-split-script` — يزرع مرضى الحالات كلِّها ثمّ يشغّل السكربتَ بحرفه، ويقيس الديونَ بدالّة التطبيق نفسِها
// (`storage.getPatientBranchBalances`) قبله وبعده: لا دينارَ يضيع، ودينُ العلاج الطبيعي ينتقل وحده، والتاريخُ لا يُمسّ.

import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./db";
import { storage } from "./storage";

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
async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
const SCRIPT = readFileSync(join(import.meta.dirname, "..", "scripts", "physio_split_2026_11_21.sql"), "utf8");
const NAME = "مركز بغداد للعلاج الطبيعي";

async function patient(name: string, branch: number, physio: boolean): Promise<number> {
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, total_cost)
                       VALUES ($1, '07700000000', 'اختبار-سكربت-الفصل', '30', 'x', $2, $3, 0) RETURNING id`, [name, branch, physio]);
  return Number(p.id);
}
async function kase(pid: number, type: string, branch: number): Promise<number> {
  const [c] = await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
                       VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [pid, branch, type]);
  return Number(c.id);
}
async function cost(pid: number, branch: number, amount: number, caseId: number | null, source = "physio_pricing") {
  await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, created_at)
           VALUES ($1,$2,$3,$4,$5,'2026-11-10')`, [pid, branch, amount, source, caseId]);
  await q(`UPDATE patients SET total_cost = total_cost + $2 WHERE id = $1`, [pid, amount]);
  if (caseId) await q(`UPDATE patient_cases SET cost = cost + $2 WHERE id = $1`, [caseId, amount]);
}
async function pay(pid: number, branch: number, amount: number, caseId: number | null) {
  await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, date, notes)
           VALUES ($1,$2,$3,$4,'2026-11-10','دفعة اختبار')`, [pid, branch, amount, caseId]);
}
async function balances(branch: number): Promise<Map<number, number>> {
  const m = new Map<number, number>();
  for (const b of await storage.getPatientBranchBalances(branch)) m.set(b.patientId, b.cost - b.paid);
  return m;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'ذي قار'),(4,'الموصل'),(5,'كركوك') ON CONFLICT DO NOTHING`);
  //  صناديقُ الفروع الخمسة كما على الإنتاج.
  await q(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type, normal_balance, branch_id, is_system)
           SELECT '1111' || lpad(b::text,2,'0'), 'صندوق ' || b, 'asset', 'debit', b, true FROM generate_series(1,5) b
           ON CONFLICT DO NOTHING`);
  //  الحساباتُ بأرقام الإنتاج وأسمائه.
  const users: [number, string, string, number, number[]][] = [
    [11, "saleem", "branch_manager", 1, [1, 3]], [28, "drsara", "physio_specialist", 1, []], [16, "رقية", "accountant", 1, []],
    [22, "عمر", "branch_manager", 1, [1]], [27, "aya", "reception", 1, []], [25, "ياسر استقبال", "reception", 1, []],
    [23, "ايوب", "prosthetics_expert", 1, [1, 4, 5, 3]],
  ];
  for (const [id, un, role, b, bs] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1,$2,'x',$2,$3,$4,$5::jsonb,true)`, [id, un, role, b, JSON.stringify(bs)]);
  }
  await q(`UPDATE system_users SET can_view_patients = true, can_manage_accounting = true, can_view_reports = true,
             can_add_payments = true, can_add_expenses = true WHERE id = 22`);
  await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES (22,'installment_due'),(22,'new_patient')`);
  const devs = await q(`SELECT id FROM devices ORDER BY id LIMIT 4`);
  for (const d of devs) {
    await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1,1,true),($1,3,true)`, [d.id]);
  }

  //  أ. علاجٌ طبيعيّ وحده في بغداد: ٣٠٠ ألف، دفع ١٠٠ ⟵ دينُ ٢٠٠ ينتقل، ومعه خطّةٌ قائمة وأخرى منتهية وطلبُ استرجاعٍ معلَّق وأقساط.
  const A = await patient("مريض أ", 1, true); const Ac = await kase(A, "physiotherapy", 1);
  await cost(A, 1, 300000, Ac); await pay(A, 1, 100000, Ac);
  await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status) VALUES ($1,1,'خطة قائمة','approved'),($1,1,'خطة منتهية','graduated')`, [A]);
  await q(`INSERT INTO patient_refund_requests (patient_id, case_id, case_type, branch_id, amount, reason, detail)
           VALUES ($1,$2,'physiotherapy',1,10000,'other','x')`, [A, Ac]);
  await q(`INSERT INTO installment_plans (patient_id, branch_id, total_amount, installment_amount, number_of_installments, start_date, case_id)
           VALUES ($1,1,200000,50000,4,'2026-12-01',$2)`, [A, Ac]);
  await q(`INSERT INTO medical_review_requests (patient_id, service_type, case_id, branch_id, requested_path, review_kind, status)
           VALUES ($1,'physiotherapy',$2,1,'full','other','pending')`, [A, Ac]);
  //  ب. القسمان: أطرافٌ ١٬٠٠٠ ودفع ٥٠٠، وعلاجٌ طبيعيّ ٢٠٠ ودفع ٥٠ ⟵ ١٥٠ وحدها تنتقل، والأطرافُ تبقى.
  const B = await patient("مريض ب", 1, true); const Bp = await kase(B, "prosthetic", 1); const Bc = await kase(B, "physiotherapy", 1);
  await cost(B, 1, 1000000, Bp, "device_sale"); await pay(B, 1, 500000, Bp);
  await cost(B, 1, 200000, Bc); await pay(B, 1, 50000, Bc);
  await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status) VALUES ($1,1,'خطة ب','draft')`, [B]);
  //  ج. مسجَّلٌ في كربلاء وعلاجُه الطبيعيّ في بغداد: ٨٠ ألف ⟵ تنتقل، ويُتاح الملفُّ للمركز.
  const C = await patient("مريض ج", 2, true); const Cc = await kase(C, "physiotherapy", 1);
  await cost(C, 1, 80000, Cc);
  //  د. أطرافٌ وحدها في بغداد، وهـ. علاجٌ طبيعيّ في ذي قار — لا يُمسّان.
  const D = await patient("مريض د", 1, false); const Dp = await kase(D, "prosthetic", 1); await cost(D, 1, 500000, Dp, "device_sale");
  const E = await patient("مريض هـ", 3, true); const Ec = await kase(E, "physiotherapy", 3); await cost(E, 3, 120000, Ec);
  //  و. دائنٌ في بغداد (دفع أكثر) ⟵ الرصيدُ السالب ينتقل أيضاً.
  const F = await patient("مريض و", 1, true); const Fc = await kase(F, "physiotherapy", 1);
  await cost(F, 1, 50000, Fc); await pay(F, 1, 70000, Fc);

  const before1 = await balances(1);
  const beforeAll = new Map((await storage.getPatientBranchBalances()).map((b) => [b.patientId, b.cost - b.paid]));
  const paysBefore = await q(`SELECT id, branch_id, amount FROM payments ORDER BY id`);

  console.log("\n── أ. التشغيل ──");
  await pool.query(SCRIPT);
  const [nb] = await q(`SELECT id, location FROM branches WHERE name = $1`, [NAME]);
  const NEW = Number(nb?.id);
  check(NEW > 5, "أ١. الفرعُ أُنشئ برقمٍ جديد وعنوانِه", JSON.stringify(nb));
  let second = "";
  try { await pool.query(SCRIPT); } catch (e: any) { second = String(e?.message ?? ""); }
  check(second.includes("موجودٌ قبلُ"), "أ٢. **التشغيلُ الثاني يُرفض كلُّه** بحارسه", second);
  same("أ٣. ولم يُنشئ فرعاً ثانياً", (await q(`SELECT count(*)::int AS n FROM branches WHERE name = $1`, [NAME]))[0].n, 1);

  console.log("\n── ب. الدَّين ──");
  const after1 = await balances(1); const afterN = await balances(NEW);
  const afterAll = new Map((await storage.getPatientBranchBalances()).map((b) => [b.patientId, b.cost - b.paid]));
  same("ب١. **علاجٌ طبيعيّ وحده: بغداد صفر والمركز ٢٠٠ ألف**", [after1.get(A) ?? 0, afterN.get(A)], [0, 200000]);
  same("ب٢. **القسمان: الأطرافُ ٥٠٠ في بغداد، والعلاجُ الطبيعيّ ١٥٠ في المركز**", [after1.get(B), afterN.get(B)], [500000, 150000]);
  same("ب٣. مسجَّلُ كربلاء: علاجُه الطبيعيّ ٨٠ في المركز، وبغداد صفر", [after1.get(C) ?? 0, afterN.get(C)], [0, 80000]);
  same("ب٤. والدائنُ ينتقل دائناً", [after1.get(F) ?? 0, afterN.get(F)], [0, -20000]);
  same("ب٥. أطرافُ بغداد وحدها كما هي", [before1.get(D), after1.get(D), afterN.has(D)], [500000, 500000, false]);
  same("ب٦. **مجموعُ كلّ مريض كما كان** — لا دينارَ يضيع",
    [A, B, C, D, E, F].map((id) => afterAll.get(id) === beforeAll.get(id)), [true, true, true, true, true, true]);
  same("ب٧. **ولا دفعةَ مُسّت**", await q(`SELECT id, branch_id, amount FROM payments ORDER BY id`), paysBefore);
  const pairs = await q(`SELECT branch_id, SUM(amount)::int AS s, MIN(created_at)::text AS t FROM cost_entries WHERE source = 'branch_split' GROUP BY 1 ORDER BY 1`);
  same("ب٨. القيدان متعاكسان بأوّل لحظةٍ من السبت (بغداد)",
    pairs.map((r) => [Number(r.branch_id) === NEW ? "new" : Number(r.branch_id), r.s, r.t]),
    [[1, -410000, "2026-11-20 21:00:00"], ["new", 410000, "2026-11-20 21:00:00"]]);

  console.log("\n── ج. المرضى والطلبات ──");
  const home = new Map((await q(`SELECT id, branch_id FROM patients`)).map((r) => [Number(r.id), Number(r.branch_id)]));
  same("ج١. فرعُ التسجيل: أ و و إلى المركز، وب ود في بغداد، وج في كربلاء، وهـ في ذي قار",
    [A, F, B, D, C, E].map((id) => home.get(id)), [NEW, NEW, 1, 1, 2, 3]);
  const caseBr = new Map((await q(`SELECT id, branch_id FROM patient_cases`)).map((r) => [Number(r.id), Number(r.branch_id)]));
  same("ج٢. حالاتُ العلاج الطبيعي إلى المركز، والأطرافُ وذي قار كما هي",
    [Ac, Bc, Cc, Fc, Bp, Dp, Ec].map((id) => caseBr.get(id)), [NEW, NEW, NEW, NEW, 1, 1, 3]);
  same("ج٣. الملفُّ يُتاح للمركز لـ ب وج وحدهما",
    (await q(`SELECT patient_id FROM patient_branch_access WHERE branch_id = $1 ORDER BY patient_id`, [NEW])).map((r) => Number(r.patient_id)),
    [B, C].sort((x, y) => x - y));
  same("ج٤. الخططُ القائمة إلى المركز والمنتهيةُ في بغداد",
    (await q(`SELECT title_ar, branch_id FROM physio_plans ORDER BY id`)).map((r) => [r.title_ar, Number(r.branch_id) === NEW ? "new" : Number(r.branch_id)]),
    [["خطة قائمة", "new"], ["خطة منتهية", 1], ["خطة ب", "new"]]);
  same("ج٥. الاسترجاعُ المعلَّق وخطّةُ الأقساط وطلبُ المعاينة إلى المركز",
    [(await q(`SELECT branch_id FROM patient_refund_requests`))[0].branch_id,
     (await q(`SELECT branch_id FROM installment_plans`))[0].branch_id,
     (await q(`SELECT branch_id FROM medical_review_requests`))[0].branch_id].map(Number), [NEW, NEW, NEW]);
  same("ج٦. سطرُ تدقيقٍ لكلّ مريضٍ نُقل", (await q(`SELECT count(*)::int AS n FROM audit_log WHERE entity_type = 'patient' AND branch_id = $1`, [NEW]))[0].n, 4);

  console.log("\n── د. الفرع والحسابات ──");
  const acc = await q(`SELECT account_code FROM chart_of_accounts WHERE branch_id = $1`, [NEW]);
  same("د١. صندوقٌ واحد للمركز برمزٍ جديد", acc.map((r) => r.account_code), ["111106"]);
  same("د٢. دفترُ «علاج طبيعي» برصيدٍ صفر من السبت",
    (await q(`SELECT book, opening_date::text AS d, cash_balance FROM cash_book_openings WHERE branch_id = $1`, [NEW])).map((r) => [r.book, r.d, r.cash_balance]),
    [["physio", "2026-11-21", 0]]);
  same("د٣. الأجهزةُ متاحةٌ في المركز ومطفأةٌ في بغداد وذي قار كما هي",
    (await q(`SELECT branch_id, bool_or(available) AS a FROM physio_device_branches GROUP BY 1 ORDER BY 1`)).map((r) => [Number(r.branch_id) === NEW ? "new" : Number(r.branch_id), r.a]),
    [[1, false], [3, true], ["new", true]]);
  const u = new Map((await q(`SELECT id, role, branch_id, branch_ids FROM system_users`)).map((r) => [Number(r.id), [r.role, Number(r.branch_id), r.branch_ids]]));
  same("د٤. الحسابات: سليم ذي قار والمركز · سارة المركز · رقيّة مديرةُ المركز · آية وياسر الفرعان · عمر وأيوب كما هما",
    [11, 28, 16, 27, 25, 22, 23].map((id) => u.get(id)),
    [["branch_manager", 3, [3, NEW]], ["physio_specialist", NEW, [NEW]], ["branch_manager", NEW, [NEW]],
     ["reception", 1, [1, NEW]], ["reception", 1, [1, NEW]], ["branch_manager", 1, [1]], ["prosthetics_expert", 1, [1, 4, 5, 3]]]);
  const [rq] = await q(`SELECT can_manage_accounting, can_view_reports, can_supervise_physio FROM system_users WHERE id = 16`);
  same("د٥. رقيّة بصلاحيات عمر، ولا إشرافَ علاجٍ طبيعيّ لم يكن لها", [rq.can_manage_accounting, rq.can_view_reports, rq.can_supervise_physio], [true, true, false]);
  same("د٦. وتنبيهاتُ عمر لها",
    (await q(`SELECT event_type FROM staff_notification_prefs WHERE user_id = 16 ORDER BY 1`)).map((r) => r.event_type), ["installment_due", "new_patient"]);
  same("د٧. سطرُ تدقيقٍ لكلّ حسابٍ عُدّل", (await q(`SELECT count(*)::int AS n FROM audit_log WHERE entity_type = 'system_user'`))[0].n, 5);

  console.log(failures === 0 ? "\n✅ كلُّ التأكيدات نجحت" : `\n❌ ${failures} تأكيداً سقط`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
