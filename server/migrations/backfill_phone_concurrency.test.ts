// سباق التزامن بين التعبئة الرجعية للهاتف وتعديل موظف — اختبار حيّ على
// Postgres. يحتاج قاعدة بيانات محلية: `npm run test:phone-concurrency`.
//
// الخطر الذي يحرسه: التعبئة تعمل في الخلفية بعد `listen`، والموظفون يعملون
// في اللحظة نفسها. فبين قراءة التعبئة للرقم وكتابتها للأعمدة المشتقّة توجد
// فجوة حقيقية. لو عُدِّل الرقم داخلها، كانت الكتابة المتأخّرة تدهس الأعمدة
// المشتقّة بقيم محسوبة من الرقم القديم — فيصير الصفّ يحمل رقماً جديداً
// وأعمدةً تصف القديم. تلف صامت لا يظهر في أي سجل.
//
// الاختبار يعيد إنتاج الترتيب الزمني حرفياً (قراءة ← تعديل ← كتابة متأخّرة)
// لأن الحارس في جملة SQL نفسها، فلا يمكن إثباته إلا على قاعدة حقيقية.

import { pool, db } from "../db";
import {
  applyPhoneBackfillBatch,
  backfillPhoneNormalization,
  selectPhoneBackfillBatch,
} from "./backfill_phone_normalization";
import { storage } from "../storage";
import { patients } from "@shared/schema";
import { eq } from "drizzle-orm";

// Safety: this test writes and deletes patient rows. Local test DB only.
const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
  process.exit(1);
}

let failed = 0;
function assert(cond: boolean, msg: string, detail = "") {
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
  if (!cond) failed++;
}

const MARK = "اختبار-تزامن-الهاتف";

async function makeLegacyPatient(name: string, phone: string | null): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id)
     VALUES ($1, $2, $3, '30', 'physiotherapy', 1) RETURNING id`,
    [name, phone, MARK],
  );
  // صفّ ما قبل الترحيل: بلا أي عمود مشتقّ.
  await pool.query(
    `UPDATE patients SET phone_e164 = NULL, phone_country = NULL, phone_status = NULL WHERE id = $1`,
    [rows[0].id],
  );
  return rows[0].id;
}

async function readRow(id: number) {
  const [r] = await db
    .select({
      phone: patients.phone,
      phoneE164: patients.phoneE164,
      phoneCountry: patients.phoneCountry,
      phoneStatus: patients.phoneStatus,
    })
    .from(patients)
    .where(eq(patients.id, id));
  return r;
}

async function cleanup() {
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await pool.query(`DELETE FROM patients WHERE referral_source = $1`, [MARK]);
}

async function main() {
  await pool.query(`INSERT INTO branches (id, name) VALUES (1, 'بغداد') ON CONFLICT (id) DO NOTHING`);
  await cleanup();
  // لا يبقى صفّ آخر مؤهَّل يشوّش على الدفعات.
  await pool.query(`UPDATE patients SET phone_status = 'ok' WHERE phone_status IS NULL`);

  // ── ١. الكتابة المتأخّرة لا تدهس تعديلاً حدث بعد القراءة ──────────────
  console.log("\n── الكتابة المتأخّرة بعد تعديل الموظف ──");
  const racer = await makeLegacyPatient("مريض السباق", "07701111111");

  // (أ) التعبئة تقرأ الرقم القديم.
  const staleBatch = await selectPhoneBackfillBatch();
  const staleRow = staleBatch.find((r) => r.id === racer);
  assert(!!staleRow, "التعبئة قرأت الصفّ المؤهَّل");
  assert(staleRow?.phone === "07701111111", "ولقطتها هي الرقم القديم", `got: ${staleRow?.phone}`);

  // (ب) موظف يعدّل الرقم — المسار الحقيقي، فيكتب الرقم وأعمدته المشتقّة.
  await storage.updatePatient(racer, { phone: "+905321234567" } as any);
  const afterEdit = await readRow(racer);
  assert(afterEdit.phone === "+905321234567", "التعديل كتب الرقم الجديد");
  assert(
    afterEdit.phoneE164 === "+905321234567" && afterEdit.phoneCountry === "TR" && afterEdit.phoneStatus === "ok",
    "واشتقّ أعمدته الجديدة صحيحةً",
    `got: ${afterEdit.phoneE164} / ${afterEdit.phoneCountry} / ${afterEdit.phoneStatus}`,
  );

  // (ج) الكتابة المتأخّرة تصل الآن حاملةً حساب الرقم القديم.
  const appliedIds = await applyPhoneBackfillBatch(staleBatch);
  assert(!appliedIds.includes(racer), "الكتابة المتأخّرة لم تُطبَّق على الصفّ المعدَّل");

  const afterStale = await readRow(racer);
  assert(
    afterStale.phone === "+905321234567" &&
      afterStale.phoneE164 === "+905321234567" &&
      afterStale.phoneCountry === "TR" &&
      afterStale.phoneStatus === "ok",
    "والصفّ بقي متّسقاً: الأعمدة المشتقّة تصف الرقم الجديد",
    `got: ${afterStale.phone} / ${afterStale.phoneE164} / ${afterStale.phoneCountry} / ${afterStale.phoneStatus}`,
  );
  assert(
    afterStale.phoneE164 !== "+9647701111111",
    "ولم تُكتب عليه قيمة الرقم القديم إطلاقاً",
    `got: ${afterStale.phoneE164}`,
  );

  // ── ٢. الحارس ليس مفرطاً: الصفّ الذي لم يُمسّ يُعالَج ────────────────
  console.log("\n── الصفّ غير المعدَّل يُعالَج كالمعتاد ──");
  const calm = await makeLegacyPatient("مريض هادئ", "07702222222");
  const batch2 = await selectPhoneBackfillBatch();
  const applied2 = await applyPhoneBackfillBatch(batch2);
  assert(applied2.includes(calm), "الصفّ الساكن طُبِّقت عليه الكتابة");
  const calmRow = await readRow(calm);
  assert(
    calmRow.phoneE164 === "+9647702222222" && calmRow.phoneCountry === "IQ" && calmRow.phoneStatus === "ok",
    "وقيمه مشتقّة من رقمه هو",
    `got: ${calmRow.phoneE164} / ${calmRow.phoneCountry} / ${calmRow.phoneStatus}`,
  );

  // ── ٣. رقم يتغيّر خارج التطبيق (SQL مباشر) يترك الحالة NULL ──────────
  // الحارس يتخطّاه في الدفعة القديمة، والدورة التالية تلتقطه بقيمته الجديدة
  // الصحيحة — لا بالقديمة.
  console.log("\n── تغيير مباشر يترك phone_status = NULL ──");
  const direct = await makeLegacyPatient("مريض تعديل مباشر", "07703333333");
  const batch3 = await selectPhoneBackfillBatch();
  await pool.query(`UPDATE patients SET phone = '07504444444' WHERE id = $1`, [direct]);
  const applied3 = await applyPhoneBackfillBatch(batch3);
  assert(!applied3.includes(direct), "الدفعة القديمة تخطّته");
  const stillNull = await readRow(direct);
  assert(stillNull.phoneStatus === null, "وبقي مؤهَّلاً (الحالة NULL)");

  await backfillPhoneNormalization(); // الحلقة الكاملة
  const repaired = await readRow(direct);
  assert(
    repaired.phoneE164 === "+9647504444444" && repaired.phoneStatus === "ok",
    "والحلقة التالية عالجته بقيمته الجديدة لا القديمة",
    `got: ${repaired.phoneE164} / ${repaired.phoneStatus}`,
  );

  // ── ٤. الحلقة تنتهي ولا تترك صفّاً مؤهَّلاً ──────────────────────────
  console.log("\n── الحلقة تستنفد المؤهَّلين وتتوقف ──");
  for (let i = 0; i < 7; i++) await makeLegacyPatient(`دفعة ${i}`, `0770555${String(i).padStart(4, "0")}`);
  await backfillPhoneNormalization();
  const { rows: left } = await pool.query<{ n: string }>(
    `SELECT count(*)::int AS n FROM patients WHERE phone_status IS NULL`,
  );
  assert(Number(left[0].n) === 0, "لا صفّ مؤهَّل بقي بعد اكتمال الحلقة", `left: ${left[0].n}`);

  // ── ٥. عمود phone لم يُمسّ في أي من هذا ──────────────────────────────
  const { rows: touched } = await pool.query<{ n: string }>(
    `SELECT count(*)::int AS n FROM patients WHERE referral_source = $1 AND phone IS NULL`,
    [MARK],
  );
  assert(Number(touched[0].n) === 0, "التعبئة لم تُفرّغ عمود phone لأي صفّ");

  await cleanup();
  console.log(failed === 0 ? "\n✅ all phone-concurrency cases pass" : `\n❌ ${failed} case(s) failed`);
  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
