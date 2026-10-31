// اختبارُ ترحيل ١٨٨ — تجميدُ عدّاد جلسات مرضى ما قبل الخطّة المحفوظة قبل الأسعار الجديدة (§4.fu).
//   DATABASE_URL=… npm run test:legacy-physio-freeze
//
// الوعدُ الواحد: **لا عدّادَ يتحرّك بتغيير السعر**. ما يراه كلُّ مريضٍ اليوم (بأسعار ما قبل ٢٠٢٦-١١-٠١) يراه بعد الترحيل بالأسعار الجديدة،
// ولا دينارَ يُمسّ. ومعه الشاهدُ العكسيّ: بلا الترحيل يتحرّك عدّادُ مرضى الكلفة.
import { pool } from "./db";
import { sql as migrationSql } from "./migrations/188_freeze_legacy_physio_counts";
import { PHYSIO_PRICES_BEFORE_2026_11, PHYSIO_TREATMENT_PRICES, resolvePurchasedSessions } from "@shared/pricing";

let failures = 0;
function check(cond: boolean, msg: string, detail?: string) {
  if (cond) console.log(`✅  ${msg}`);
  else { failures++; console.log(`❌ FAIL  ${msg}${detail ? `\n      ${detail}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg, `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MARK = "اختبار-تجميد-العدّاد";
const B = 9881;
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];

async function cleanup() {
  const ids = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).map((r) => r.id);
  await q(`DELETE FROM audit_log WHERE entity_type = 'patient' AND entity_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM payments WHERE patient_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM branches WHERE id = $1`, [B]);
}

type Pay = { type: string | null; n: number | null; free?: boolean; amount?: number; noCase?: boolean };
async function patient(label: string, o: { text: string; plan?: unknown; caseCost?: number | null; totalCost?: number; pays?: Pay[] }) {
  const id = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, treatment_type, total_cost, physio_plan)
                       VALUES ($1, '07709990000', $2, '40', 'physio', $3, true, $4, $5, $6::jsonb) RETURNING id`,
    [`${label} ${MARK}`, MARK, B, o.text, o.totalCost ?? o.caseCost ?? 0, o.plan === undefined ? null : JSON.stringify(o.plan)]))[0].id;
  const caseId = o.caseCost === null ? null
    : (await q(`INSERT INTO patient_cases (patient_id, case_type, cost) VALUES ($1, 'physiotherapy', $2) RETURNING id`, [id, o.caseCost ?? 0]))[0].id;
  const payIds: number[] = [];
  for (const p of o.pays ?? []) {
    payIds.push((await q(`INSERT INTO payments (patient_id, branch_id, amount, payment_treatment_type, session_count, is_free_sessions, case_id)
                          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [id, B, p.amount ?? 0, p.type, p.n, p.free === true, p.noCase ? null : caseId]))[0].id);
  }
  return { id: Number(id), caseId, payIds };
}

/** ما يقرؤه ملفُّ المريض — بمدخلات استمارة العلاج الطبيعي نفسِها (`physio_sheet/store.ts`). */
async function resolve(id: number, prices: Readonly<Record<string, number>>) {
  const [p] = await q(`SELECT physio_plan, treatment_type, total_cost FROM patients WHERE id = $1`, [id]);
  const [c] = await q(`SELECT id, cost FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy' ORDER BY id LIMIT 1`, [id]);
  const pays = await q(`SELECT payment_treatment_type, session_count, is_free_sessions FROM payments
                         WHERE patient_id = $1 AND (case_id = $2 OR case_id IS NULL) ORDER BY id`, [id, c?.id ?? -1]);
  const r = resolvePurchasedSessions({
    plan: Array.isArray(p.physio_plan) ? p.physio_plan : null,
    treatmentTypeText: p.treatment_type,
    caseCost: c ? Number(c.cost ?? 0) : Number(p.total_cost ?? 0),
    paymentSessions: pays.map((x) => ({ treatmentType: x.payment_treatment_type, sessionCount: x.session_count, isFree: x.is_free_sessions === true })),
  }, prices);
  const byType = Object.fromEntries(Object.entries(r.byType).sort(([a], [b]) => a.localeCompare(b)));
  return { byType, source: r.source };
}
const money = async () => (await q(`SELECT
    (SELECT COALESCE(SUM(total_cost), 0) FROM patients WHERE referral_source = $1) AS t,
    (SELECT COALESCE(SUM(c.cost), 0) FROM patient_cases c JOIN patients p ON p.id = c.patient_id WHERE p.referral_source = $1) AS c,
    (SELECT COALESCE(SUM(y.amount), 0) FROM payments y JOIN patients p ON p.id = y.patient_id WHERE p.referral_source = $1) AS y`, [MARK]))[0];

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار التجميد')`, [B]);

  console.log("\n── الأسعار ──");
  same("س.١ الجدولُ الجديد بأسعار المالك", ["استشارة طبية", "روبوت", "تمارين تأهيلية", "أجهزة علاج طبيعي", "تمارين مع أجهزة", "تمارين CP للأطفال", "أبر صينية"].map((t) => PHYSIO_TREATMENT_PRICES[t]),
    [0, 75000, 35000, 35000, 35000, 25000, 25000]);
  same("س.٢ والقديمُ مجمَّدٌ كما كان", ["روبوت", "تمارين تأهيلية", "أجهزة علاج طبيعي", "أبر صينية"].map((t) => PHYSIO_PRICES_BEFORE_2026_11[t]), [50000, 25000, 25000, 25000]);
  check(Object.isFrozen(PHYSIO_PRICES_BEFORE_2026_11), "س.٣ والقديمُ لا يُعدَّل");

  //  مرضى الكلفة (يُجمَّدون) ومرضى غيرُها (لا يُمسّون).
  const A = await patient("دورةٌ قديمة بأقساط وهدايا", { text: "أجهزة علاج طبيعي", caseCost: 275000, pays: [
    { type: "أجهزة علاج طبيعي", n: 4, amount: 100000 }, { type: "أجهزة علاج طبيعي", n: 2, free: true },
    { type: "استشارة طبية", n: 1, free: true, noCase: true }, { type: "أجهزة علاج طبيعي", n: 0, amount: 25000 }] });
  const B1 = await patient("مفردٌ بدفعاته", { text: "روبوت", caseCost: 250000, pays: [{ type: "روبوت", n: 5, amount: 250000 }] });
  const C = await patient("له خطّة", { text: "روبوت (10 جلسات)", plan: [{ treatmentType: "روبوت", sessionCount: 10 }], caseCost: 500000 });
  const D = await patient("بلا قسمٍ بكلفة المريض", { text: "تمارين تأهيلية", caseCost: null, totalCost: 700000 });
  const E = await patient("نصٌّ بنوعين", { text: "روبوت، أبر صينية", caseCost: 300000, pays: [{ type: "روبوت", n: 2, amount: 100000 }] });
  const F = await patient("كلفةٌ لا تقبل القسمة", { text: "أجهزة علاج طبيعي", caseCost: 260000, pays: [{ type: "أجهزة علاج طبيعي", n: 3, amount: 75000 }] });
  const G = await patient("خطّةٌ فارغة وهدايا (انتصار)", { text: "روبوت", plan: [], caseCost: 1300000, pays: [
    { type: "روبوت", n: 2, amount: 100000 }, { type: "روبوت", n: 6, free: true }] });
  const H = await patient("خطّةٌ بلا سطرٍ صالح", { text: "أبر صينية", plan: [{ treatmentType: "", sessionCount: 3 }], caseCost: 250000 });
  //  وقيمتان كانتا ستُسقطان الترحيلَ لو قُيّمت الشروطُ بغير ترتيبها: خطّةٌ ليست مصفوفة، وعددٌ ليس رقماً.
  const I = await patient("خطّةٌ ليست مصفوفة", { text: "روبوت", plan: { x: 1 }, caseCost: 500000 });
  const J = await patient("عددٌ ليس رقماً", { text: "أبر صينية", plan: [{ treatmentType: "روبوت", sessionCount: "abc" }], caseCost: 50000 });
  const all = { A, B1, C, D, E, F, G, H, I, J };

  const today: Record<string, any> = {};
  for (const [k, v] of Object.entries(all)) today[k] = await resolve(v.id, PHYSIO_PRICES_BEFORE_2026_11);
  same("ت.١ ما يراه العدّادُ اليوم (بالأسعار القديمة): ستّةٌ من الكلفة", Object.entries(today).filter(([, r]) => r.source === "cost").map(([k]) => k), ["A", "D", "G", "H", "I", "J"]);

  console.log("\n── بلا الترحيل: السعرُ الجديد يحرّك عدّادَ مرضى الكلفة ──");
  const unfrozen: Record<string, any> = {};
  for (const [k, v] of Object.entries(all)) unfrozen[k] = await resolve(v.id, PHYSIO_TREATMENT_PRICES);
  same("ت.٢ أ: ٢٧٥٬٠٠٠ لا تقبل القسمةَ على ٣٥٬٠٠٠ فيهبط من ١١+٢ إلى دفعاته ٤+٢", [today.A.byType["أجهزة علاج طبيعي"], unfrozen.A.byType["أجهزة علاج طبيعي"]],
    [13, 6]);
  same("ت.٣ د: ٧٠٠٬٠٠٠ تقبلها فيصير ٢٨ عشرين بصمت", [today.D.byType, unfrozen.D.byType], [{ "تمارين تأهيلية": 28 }, { "تمارين تأهيلية": 20 }]);

  const before = await money();
  const auditBefore = Number((await q(`SELECT count(*) FROM audit_log WHERE user_name = 'ترحيل ١٨٨'`))[0].count);
  await pool.query(migrationSql);

  console.log("\n── بعد الترحيل ──");
  const after: Record<string, any> = {};
  for (const [k, v] of Object.entries(all)) after[k] = await resolve(v.id, PHYSIO_TREATMENT_PRICES);
  const strip = (r: any) => {
    //  الاستشارةُ المُهداة لا تدخل خطّةً أبداً (`entersPhysioPlan`) — ولا تُعدّ جلسةً في تبويب الزيارات.
    const o = { ...r.byType }; delete o["استشارة طبية"]; return o;
  };
  same("ج.١ **كلُّ عدّادٍ بالأسعار الجديدة كما كان بالقديمة**", Object.fromEntries(Object.entries(after).map(([k, r]) => [k, strip(r)])),
    Object.fromEntries(Object.entries(today).map(([k, r]) => [k, strip(r)])));
  same("ج.٢ ومرضى الكلفة صاروا يُقرؤون من الخطّة", ["A", "D", "G", "H", "I", "J"].map((k) => after[k].source), ["plan", "plan", "plan", "plan", "plan", "plan"]);
  const planOf = (r: any) => (Array.isArray(r.physio_plan) ? r.physio_plan.map((e: any) => [e.treatmentType, e.sessionCount]) : r.physio_plan);
  same("ج.٣ والخطّةُ المكتوبة", (await q(`SELECT physio_plan FROM patients WHERE id = ANY($1::int[]) ORDER BY id`, [[A.id, D.id, G.id, H.id, I.id, J.id]])).map(planOf),
    [[["أجهزة علاج طبيعي", 13]], [["تمارين تأهيلية", 28]], [["روبوت", 32]], [["أبر صينية", 10]], [["روبوت", 10]], [["أبر صينية", 2]]]);
  same("ج.٤ وغيرُهم لم يُمسّ (المفرد · له خطّة · نوعان · لا تقبل القسمة)",
    (await q(`SELECT physio_plan FROM patients WHERE id = ANY($1::int[]) ORDER BY id`, [[B1.id, C.id, E.id, F.id]])).map(planOf),
    [null, [["روبوت", 10]], null, null]);
  same("ج.٥ والهدايا المجمَّدة موسومةٌ مقيَّدة، والاستشارةُ لا", (await q(`SELECT id, plan_credited FROM payments WHERE id = ANY($1::int[]) ORDER BY id`,
    [[A.payIds[1], A.payIds[2], G.payIds[1]]])).map((r) => r.plan_credited), [true, null, true]);
  same("ج.٦ ولا دينارَ مُسّ (كلفةُ المريض والقسم والدفعات)", await money(), before);
  const audits = await q(`SELECT entity_id, notes FROM audit_log WHERE user_name = 'ترحيل ١٨٨' ORDER BY entity_id`);
  same("ج.٧ وسطرُ تدقيقٍ لكلّ مريضٍ جُمّد", [audits.length - auditBefore, audits.filter((a) => [A.id, D.id, G.id, H.id, I.id, J.id].includes(Number(a.entity_id))).length], [6, 6]);
  check(String(audits.find((a) => Number(a.entity_id) === A.id)?.notes ?? "").includes("11 جلسة"), "ج.٨ ويقول ما اشتُقّ وبأيّ سعر");

  await pool.query(migrationSql);
  same("ج.٩ والإعادةُ لا تفعل شيئاً", Number((await q(`SELECT count(*) FROM audit_log WHERE user_name = 'ترحيل ١٨٨'`))[0].count), audits.length);

  await cleanup();
  await pool.end();
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كل الاختبارات نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
