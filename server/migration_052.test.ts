// ترحيل ٠٥٢ — رمزُ المريض العلني. حيّاً على Postgres.
// قاعدة محلّية: `npm run test:migration-052`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **كلّ مريضٍ قائم له رمزٌ فريد وقانوني** — بلا استثناء واحد.
// (٢) **حتميّة الرمز**: الصفّ ١ ⟶ WB-00001، والصفّ ١٦٢٩ ⟶ WB-01629.
// (٣) **ولا قصَّ فوق ٩٩٩٩٩**: هذا هو الفخّ الحقيقي — `LPAD(n,5,'0')` في
//     Postgres **تقصّ** ما زاد ('100000' ⟶ '10000')، فتصنع رمزاً مكرَّراً
//     يصطدم بالتفرّد بعد مئة ألف مريض. والحشو هنا مشروط.
// (٤) **التشغيل مرّتين لا يغيّر شيئاً** ولا يُرجع التسلسل.
// (٥) **والتسلسل لا يرجع أبداً** — ولو حُذف صاحب أعلى رمز.
// (٦) **ولا صفَّ تجاريّاً واحداً يُمَسّ**: لا دفعة ولا زيارة ولا معاينة ولا
//     حلقة ولا أمر ولا قيد كلفة ولا حدث ولا جهة اتصال ولا صفَّ صادر.

import { pool } from "./db";
import { sql as MIG052, name as NAME052 } from "./migrations/052_patient_public_code";
import { PATIENT_CODE_PATTERN } from "@shared/patient_code";

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

const MARK = "اختبار-ترحيل-٠٥٢";
const BIG_ID = 100_042;   // فوق مئة ألف عمداً — موضع القصّ

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function runMigration() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(MIG052);
    await c.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [NAME052]);
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
async function mkPatient(name: string, forcedId?: number) {
  const r = forcedId === undefined
    ? await q<{ id: number; patient_code: string }>(
      `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, total_cost)
       VALUES ($1,'07701234567',$2,'40','x',1,0) RETURNING id, patient_code`, [name, MARK])
    : await q<{ id: number; patient_code: string }>(
      `INSERT INTO patients (id, name, phone, referral_source, age, medical_condition, branch_id, total_cost)
       VALUES ($3,$1,'07701234567',$2,'40','x',1,0) RETURNING id, patient_code`, [name, MARK, forcedId]);
  return r[0];
}
/** يُسقِط العمود عن صفٍّ ليحاكي «مريضاً قديماً بلا رمز» ثم يعيد الترحيل ملأه. */
async function blankCode(id: number) {
  await q(`ALTER TABLE patients ALTER COLUMN patient_code DROP NOT NULL`);
  await q(`UPDATE patients SET patient_code = NULL WHERE id = $1`, [id]);
}
async function seqValue(): Promise<number> {
  const r = await q<{ last_value: string }>(`SELECT last_value FROM patient_code_seq`);
  return Number(r[0].last_value);
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** لقطةُ كلّ ما هو تجاريّ — تُقارَن قبل الترحيل وبعده. */
async function businessSnapshot() {
  const [row] = await q(`SELECT
      (SELECT count(*)::int FROM payments)                        AS payments,
      (SELECT COALESCE(SUM(amount),0)::bigint FROM payments)      AS payments_sum,
      (SELECT count(*)::int FROM visits)                          AS visits,
      (SELECT count(*)::int FROM medical_exams)                   AS exams,
      (SELECT count(*)::int FROM patient_device_episodes)         AS episodes,
      (SELECT count(*)::int FROM prosthetic_work_orders)          AS orders,
      (SELECT count(*)::int FROM cost_entries)                    AS cost_entries,
      (SELECT COALESCE(SUM(amount),0)::bigint FROM cost_entries)  AS cost_sum,
      (SELECT COALESCE(SUM(total_cost),0)::bigint FROM patients)  AS total_cost,
      (SELECT count(*)::int FROM patient_events)                  AS events,
      (SELECT count(*)::int FROM patient_contacts)                AS contacts,
      (SELECT count(*)::int FROM patient_notification_deliveries) AS deliveries`);
  return row;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await cleanup();

  //  حالةُ ما قبل الترحيل تُحاكى بإسقاط أثره ثم إعادته: مريضان بلا رمز،
  //  أحدهما برقمٍ فوق مئة ألف — وهو الصفّ الذي يكشف القصّ.
  const small = await mkPatient("قديمٌ صغير");
  const big = await mkPatient("قديمٌ كبير", BIG_ID);
  await blankCode(small.id);
  await blankCode(big.id);

  const before = await businessSnapshot();
  const seqBefore = await seqValue();

  console.log("\n── الترحيل ──");
  await runMigration();
  await runMigration();   // idempotent: مرّتان بلا خطأ

  // ══ أ. كلّ مريضٍ له رمزٌ فريد وقانوني ═══════════════════════════════
  const codes = await q<{ id: number; patient_code: string }>(
    `SELECT id, patient_code FROM patients ORDER BY id`);
  same("أ. لا مريضَ بلا رمز", codes.filter((r) => !r.patient_code).length, 0);
  same("   وكلّها قانونية",
    codes.filter((r) => !PATIENT_CODE_PATTERN.test(r.patient_code)).map((r) => r.patient_code), []);
  same("   وكلّها فريدة",
    codes.length - new Set(codes.map((r) => r.patient_code)).size, 0);
  same("   والتفرّد مفروضٌ في القاعدة نفسها",
    (await q(`SELECT 1 FROM pg_constraint WHERE conname='uq_patients_patient_code'`)).length, 1);
  same("   والصيغة كذلك",
    (await q(`SELECT 1 FROM pg_constraint WHERE conname='ck_patients_patient_code_format'`)).length, 1);
  same("   والعمود NOT NULL",
    (await q(`SELECT is_nullable FROM information_schema.columns
               WHERE table_name='patients' AND column_name='patient_code'`))[0].is_nullable, "NO");

  // ══ ب. الحتميّة من رقم الصفّ ════════════════════════════════════════
  console.log("\n── الحتميّة ──");
  const fmt = (n: number) => "WB-" + (n < 100000 ? String(n).padStart(5, "0") : String(n));
  same("ب. القديم الصغير أخذ رمز رقم صفّه",
    (await q(`SELECT patient_code FROM patients WHERE id=$1`, [small.id]))[0].patient_code,
    fmt(small.id));
  same("   والصفّ ١ (لو وُجد) يوافق WB-00001",
    (await q(`SELECT patient_code FROM patients WHERE id=1`)).map((r: any) => r.patient_code),
    (await q(`SELECT 1 FROM patients WHERE id=1`)).length ? ["WB-00001"] : []);

  // ══ ج. لا قصَّ فوق ٩٩٩٩٩ ════════════════════════════════════════════
  const bigCode = (await q(`SELECT patient_code FROM patients WHERE id=$1`, [BIG_ID]))[0].patient_code;
  same(`ج. **الصفّ ${BIG_ID} ⟶ WB-${BIG_ID} بلا قصّ**`, bigCode, `WB-${BIG_ID}`);
  check(bigCode.length > 8, "   والرمز أطول من ثمانية محارف فعلاً", bigCode);
  same("   ولو قُصّ لكان WB-10004 — وليس كذلك", bigCode === "WB-10004", false);

  // ══ د. التشغيل مرّتين ═══════════════════════════════════════════════
  console.log("\n── إعادة التشغيل ──");
  const snapshotAfterFirst = await q(`SELECT id, patient_code FROM patients ORDER BY id`);
  const seqAfterFirst = await seqValue();
  await runMigration();
  same("د. الرموز لم تتبدّل", await q(`SELECT id, patient_code FROM patients ORDER BY id`),
    snapshotAfterFirst);
  same("   والتسلسل لم يتحرّك", await seqValue(), seqAfterFirst);

  // ══ هـ. التسلسل لا يرجع ═════════════════════════════════════════════
  console.log("\n── التسلسل ──");
  check(seqAfterFirst >= BIG_ID,
    `هـ. التسلسل فوق أعلى رمز مخصَّص (${seqAfterFirst} ≥ ${BIG_ID})`, String(seqAfterFirst));
  check(seqAfterFirst >= seqBefore, "   ولم يرجع عمّا كان", `${seqBefore} ⟶ ${seqAfterFirst}`);

  //  اسمٌ بديل برقمٍ أعلى من كلّ الملفّات: الترحيل يجب أن يتخطّاه أيضاً،
  //  وإلّا أُعيد استعمال رمزٍ بيد مريضٍ بعد دمج.
  //  **فوق التسلسل الحالي دائماً** لا فوق BIG_ID: التسلسل لا يرجع، فقد
  //  تكون تشغيلاتٌ سابقة رفعته — ورقمٌ ثابت كان سيجعل التأكيد يمرّ بلا
  //  أن يفحص شيئاً.
  const aliasHigh = (await seqValue()) + 1000;
  await q(`INSERT INTO patient_code_aliases (code, patient_id, reason)
           VALUES ($1, $2, 'merge') ON CONFLICT DO NOTHING`, [fmt(aliasHigh), small.id]);
  await runMigration();
  check(await seqValue() >= aliasHigh,
    "   **ورمزُ ملفٍّ دُمج يُحسَب أيضاً — فلا يُعاد استعماله**", String(await seqValue()));

  //  وحذفُ صاحب أعلى رمز لا يُتيح إعادة استعماله.
  const seqBeforeDelete = await seqValue();
  await q(`DELETE FROM patient_code_aliases WHERE patient_id = $1`, [small.id]);
  await q(`DELETE FROM cost_entries WHERE patient_id = $1`, [big.id]);
  await q(`DELETE FROM patient_cases WHERE patient_id = $1`, [big.id]);
  await q(`DELETE FROM patients WHERE id = $1`, [big.id]);
  await runMigration();
  check(await seqValue() >= seqBeforeDelete,
    "   **وحذفُ صاحب أعلى رمز لا يُرجع التسلسل**",
    `${seqBeforeDelete} ⟶ ${await seqValue()}`);

  // ══ و. الجديد يأخذ رمزاً غير مستعمل ═════════════════════════════════
  console.log("\n── الجدد ──");
  const seqNow = await seqValue();
  const fresh = await mkPatient("جديدٌ بعد الترحيل");
  same("و. الجديد يأخذ رمزه من التسلسل لا من رقم صفّه", fresh.patient_code, fmt(seqNow + 1));
  check(PATIENT_CODE_PATTERN.test(fresh.patient_code), "   وهو قانوني", fresh.patient_code);
  same("   ولم يُستعمل قبله",
    (await q(`SELECT count(*)::int n FROM patients WHERE patient_code = $1`, [fresh.patient_code]))[0].n, 1);

  // ══ ز. التزامن ══════════════════════════════════════════════════════
  const many = await Promise.all(
    Array.from({ length: 8 }, (_, i) => mkPatient(`متزامن ${i}`)));
  const manyCodes = many.map((p) => p.patient_code);
  same("ز. **ثمانية إدراجات متزامنة ⟶ ثمانية رموز مختلفة**",
    new Set(manyCodes).size, 8);
  same("   وكلّها قانونية", manyCodes.filter((c) => !PATIENT_CODE_PATTERN.test(c)), []);

  // ══ ح. لا صفَّ تجاريّاً واحداً تغيّر ═════════════════════════════════
  console.log("\n── ما لم يُمَسّ ──");
  const afterBusiness = await businessSnapshot();
  //  المرضى الذين أنشأهم الاختبار نفسه يحرّكون العدّ، فتُطرح آثارُه.
  await cleanup();
  const finalBusiness = await businessSnapshot();
  same("ح. **كلّ الجداول التجارية كما كانت**", finalBusiness, before);
  check(Number(afterBusiness.total_cost) === Number(before.total_cost),
    "   والمال لم يتحرّك أثناء الترحيل",
    `${before.total_cost} ⟶ ${afterBusiness.total_cost}`);

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
