// المساعد يعدّ الحضورَ لا قيودَ الشراء (٢٠٢٦-١٠-٠٣) — `npm run test:ai-operational-attendance`.
// الواقعة: مديرُ بغداد سأل عن زيارات أيلول فأجاب ١٬٠٦٧، والتقريرُ اليومي يستبعد «خدمة جديدة» و«إضافة نوع حالة» (§4.az).
import { pool } from "./db";
import { getOperationalSummary } from "./ai/tools/reports";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const MARK = "اختبار-حضور-المساعد";
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (7,'فرع-اختبار-الحضور') ON CONFLICT DO NOTHING`);
  await cleanup();
  try {
    const pid = (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification, is_physiotherapy)
       VALUES ($1,'07701119999',$2,'40','170','70','x',7,0,'new',true) RETURNING id`, [`${MARK} م`, MARK]))[0].id;
    const ph = (await q(`INSERT INTO patient_cases (patient_id, case_type, status, cost) VALUES ($1,'physiotherapy','active',0) RETURNING id`, [pid]))[0].id;
    //  أيلول بتوقيت بغداد: ثلاثُ جلساتٍ حضوراً + «خدمة جديدة» + «إضافة نوع حالة» (لا حضور) + زيارةٌ عاديةٌ بلا سبب.
    for (const [d, details] of [["2026-09-02 08:00", null], ["2026-09-03 08:00", null], ["2026-09-04 08:00", "تدريب على الجهاز"],
      ["2026-09-02 08:05", "خدمة جديدة"], ["2026-09-05 08:00", "إضافة نوع حالة"]] as const) {
      await q(`INSERT INTO visits (patient_id, branch_id, case_id, visit_date, details, treatment_type) VALUES ($1,7,$2,$3,$4,'روبوت')`, [pid, ph, d, details]);
    }
    const base = { isAdmin: false, requestedBranchId: null, start: "2026-09-01", end: "2026-09-30", compare: false };
    const r = await getOperationalSummary({ ...base, operationalBranches: [7] });
    same("أ١. الزياراتُ = الحضورُ وحده (٣ لا ٥)", r.visits, 3);
    same("أ٢. وجلساتُ العلاج الطبيعي بالتعريف نفسِه", r.physiotherapySessions, 3);
    const a = await getOperationalSummary({ ...base, isAdmin: true, operationalBranches: null });
    same("أ٣. وتفصيلُ الفروع للمسؤول يطابق", a.byBranch?.find((b) => b.branchId === 7)?.visits, 3);
  } finally {
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص حضور المساعد نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
