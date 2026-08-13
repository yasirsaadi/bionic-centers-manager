// دمج مريض له معاينة موقّعة — اختبار حيّ على Postgres.
// يحتاج قاعدة محلية: `npm run test:merge-exams`.
//
// العلّة التي يحرسها: `medical_exams` هو **الثالث** من الجداول التي تشير
// إلى `patient_cases.id` (مع `visits` و`payments`)، وكان الوحيد الذي لا
// يُعاد ربطه في `mergePatients`. فحذف صفوف حالات الملف المصدر كان يسقط
// على المفتاح الأجنبي، ودمج أي مريض سبق أن فُحِص كان **يفشل كلّياً**.
//
// وهو أيضاً الوحيد من بين أربعة عشر جدولاً تشير إلى `patients.id` الذي كان
// غائباً عن قائمة إعادة التوجيه.
//
// والإصلاح **إداري لا سريري**: إنسان واحد كان له ملفّان، فتتبعه معاينته.
// ولا تُمسّ كلمة واحدة من كلام الطبيب — وهذا ما يتحقّق منه أغلب ما يلي.

import { pool, db } from "../db";
import { storage } from "../storage";
import {
  medicalExams, medicalExamAddenda, patientCases, patients, systemUsers,
} from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

// Safety: this test writes and deletes patient rows. Local test DB only.
const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function eq_(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MARK = "اختبار-دمج-المعاينات";
const DOCTOR_ID = 9101;

async function mkPatient(name: string): Promise<number> {
  const p = await storage.createPatient({
    name, phone: "07701234567", referralSource: MARK,
    age: "40", medicalCondition: "physiotherapy", branchId: 1,
  } as any);
  return p.id;
}

async function mkCase(patientId: number, caseType: string): Promise<number> {
  const [c] = await db.insert(patientCases)
    .values({ patientId, branchId: 1, caseType, cost: 0 })
    .onConflictDoNothing()
    .returning();
  if (c) return c.id;
  const [existing] = await db.select().from(patientCases)
    .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, caseType)));
  return existing.id;
}

/** معاينة موقّعة بكامل محتواها السريري، لتُقارَن حرفاً بحرف بعد الدمج. */
async function mkExam(patientId: number, caseId: number | null, caseType: string) {
  const [e] = await db.insert(medicalExams).values({
    patientId, caseId, caseType, branchId: 1,
    doctorId: DOCTOR_ID, doctorName: "د. سامر",
    chiefComplaint: "ألم في الركبة اليمنى",
    clinicalFindings: "تورّم واضح ومدى حركة محدود",
    diagnosis: "التهاب مفصل الركبة",
    plan: "علاج طبيعي ١٢ جلسة",
    notes: "المريض متعاون",
    prescription: { treatments: [{ treatmentType: "روبوت", sessionCount: 12 }] },
    deviceCost: null,
    version: 1,
  }).returning();
  return e;
}

async function cleanup() {
  await pool.query(`DROP TABLE IF EXISTS _merge_exam_block`);
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await pool.query(`INSERT INTO branches (id, name) VALUES (1, 'بغداد') ON CONFLICT (id) DO NOTHING`);
  await pool.query(
    `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active)
     VALUES ($1, 'doc_merge_test', 'x', 'د. سامر', 'doctor', 1, true) ON CONFLICT (id) DO NOTHING`,
    [DOCTOR_ID],
  );
  await cleanup();

  // ── ١. السيناريو الكامل ──────────────────────────────────────────────
  console.log("\n── دمج مريض له معاينة موقّعة مرتبطة بحالة ──");
  const src = await mkPatient("ملف مكرَّر");
  const tgt = await mkPatient("الملف الأصلي");
  const srcCase = await mkCase(src, "physiotherapy");
  const tgtCase = await mkCase(tgt, "physiotherapy");
  check(srcCase !== tgtCase, "لكل ملف حالة علاج طبيعي مستقلّة");

  const exam = await mkExam(src, srcCase, "physiotherapy");
  const [addendum] = await db.insert(medicalExamAddenda).values({
    examId: exam.id, doctorId: DOCTOR_ID, doctorName: "د. سامر",
    body: "تحسّن ملحوظ بعد ست جلسات",
  }).returning();
  check(!!exam.id && !!addendum.id, "معاينة موقّعة + ملحق على الملف المصدر");

  // لقطة سريرية كاملة قبل الدمج — هي المرجع في المقارنة بعده.
  const before = {
    chiefComplaint: exam.chiefComplaint, clinicalFindings: exam.clinicalFindings,
    diagnosis: exam.diagnosis, plan: exam.plan, notes: exam.notes,
    prescription: exam.prescription, caseType: exam.caseType,
    doctorId: exam.doctorId, doctorName: exam.doctorName,
    signedAt: exam.signedAt?.toISOString(), version: exam.version,
    editedAt: exam.editedAt, editedBy: exam.editedBy, deviceCost: exam.deviceCost,
  };

  // المرحلة الحاسمة: قبل الإصلاح كان هذا السطر يرمي انتهاك مفتاح أجنبي.
  let mergeErr = "";
  try { await storage.mergePatients(src, tgt); } catch (e: any) { mergeErr = String(e?.message ?? e); }
  check(mergeErr === "", "الدمج نجح (قبل الإصلاح كان يفشل على المفتاح الأجنبي)", mergeErr);

  const srcGone = await db.select().from(patients).where(eq(patients.id, src));
  eq_("والملف المصدر حُذف", srcGone.length, 0);

  // ── ٢. المعاينة نفسها، منقولة لا منسوخة ─────────────────────────────
  const [after] = await db.select().from(medicalExams).where(eq(medicalExams.id, exam.id));
  check(!!after, "المعاينة ما زالت موجودة بنفس المعرّف", `exam id ${exam.id}`);
  eq_("و patient_id صار الملف الهدف", after.patientId, tgt);
  eq_("و case_id صار حالة الهدف", after.caseId, tgtCase);

  const totalExams = await db.select({ n: sql<number>`count(*)::int` }).from(medicalExams)
    .where(eq(medicalExams.patientId, tgt));
  eq_("ولا نسخة ثانية أُنشئت", totalExams[0].n, 1);

  // ── ٣. لا حرف سريري تغيّر ───────────────────────────────────────────
  console.log("\n── المحتوى السريري والتوقيع لم يُمسّا ──");
  eq_("الشكوى", after.chiefComplaint, before.chiefComplaint);
  eq_("الفحص السريري", after.clinicalFindings, before.clinicalFindings);
  eq_("التشخيص", after.diagnosis, before.diagnosis);
  eq_("الخطة", after.plan, before.plan);
  eq_("الملاحظات", after.notes, before.notes);
  eq_("الوصفة", after.prescription, before.prescription);
  eq_("نوع الحالة", after.caseType, before.caseType);
  eq_("الطبيب ومعرّفه", [after.doctorId, after.doctorName], [before.doctorId, before.doctorName]);
  eq_("وقت التوقيع", after.signedAt?.toISOString(), before.signedAt);
  eq_("رقم النسخة", after.version, before.version);
  eq_("ولا أثر لتحرير (editedAt/editedBy فارغان)", [after.editedAt, after.editedBy], [before.editedAt, before.editedBy]);

  const revisions = await db.select({ n: sql<number>`count(*)::int` })
    .from(sql`medical_exam_revisions`).where(sql`exam_id = ${exam.id}`);
  eq_("ولم تُنشأ نسخة سريرية — الدمج إداري لا تحرير", revisions[0].n, 0);

  // ── ٤. الملحق باقٍ على نفس المعاينة ─────────────────────────────────
  const [addAfter] = await db.select().from(medicalExamAddenda).where(eq(medicalExamAddenda.id, addendum.id));
  check(!!addAfter, "الملحق ما زال موجوداً");
  eq_("ومرتبط بنفس المعاينة", addAfter.examId, exam.id);
  eq_("ونصّه لم يتغيّر", addAfter.body, "تحسّن ملحوظ بعد ست جلسات");

  // ── ٥. الختم عاد بعد الدمج ──────────────────────────────────────────
  console.log("\n── ختم المعاينات بعد الدمج ──");
  let sealed = false;
  try {
    await pool.query(`UPDATE medical_exams SET diagnosis = 'تلاعب' WHERE id = $1`, [exam.id]);
  } catch { sealed = true; }
  check(sealed, "التعديل المباشر على المعاينة ما زال مرفوضاً");
  const [stillSealed] = await db.select().from(medicalExams).where(eq(medicalExams.id, exam.id));
  eq_("والتشخيص لم يتغيّر", stillSealed.diagnosis, before.diagnosis);

  // ── ٦. معاينة بلا حالة (case_id = NULL) ─────────────────────────────
  console.log("\n── معاينة case_id = NULL ──");
  const src2 = await mkPatient("مكرَّر بلا حالة");
  const tgt2 = await mkPatient("أصلي ثانٍ");
  const orphan = await mkExam(src2, null, "physiotherapy");
  eq_("المعاينة أُنشئت بلا حالة", orphan.caseId, null);

  await storage.mergePatients(src2, tgt2);
  const [orphanAfter] = await db.select().from(medicalExams).where(eq(medicalExams.id, orphan.id));
  eq_("انتقل patient_id إلى الهدف", orphanAfter.patientId, tgt2);
  eq_("و case_id بقي NULL — لا علاقة مخترَعة", orphanAfter.caseId, null);
  eq_("والتشخيص كما هو", orphanAfter.diagnosis, before.diagnosis);

  // ── ٧. فشل بعد إعادة الربط ⇒ تراجع كامل ────────────────────────────
  console.log("\n── فشل الدمج بعد إعادة ربط المعاينة ──");
  {
    const s3 = await mkPatient("مصدر يفشل");
    const t3 = await mkPatient("هدف يفشل");
    const c3 = await mkCase(s3, "physiotherapy");
    await mkCase(t3, "physiotherapy");
    const e3 = await mkExam(s3, c3, "physiotherapy");

    // جدول خارجي يحمل مفتاحاً إلى المريض المصدر: يُسقط الدمج عند
    // `DELETE FROM patients` في آخر المعاملة — أي بعد إعادة ربط المعاينة.
    await pool.query(`CREATE TABLE IF NOT EXISTS _merge_exam_block (id serial primary key, patient_id integer references patients(id))`);
    await pool.query(`INSERT INTO _merge_exam_block (patient_id) VALUES ($1)`, [s3]);

    let failed = false;
    try { await storage.mergePatients(s3, t3); } catch { failed = true; }
    check(failed, "الدمج فشل كما هو مصمَّم للاختبار");

    const [e3After] = await db.select().from(medicalExams).where(eq(medicalExams.id, e3.id));
    eq_("والمعاينة بقيت على المصدر — لا نقل جزئي", e3After.patientId, s3);
    eq_("وحالتها بقيت حالة المصدر", e3After.caseId, c3);
    const c3Alive = await db.select({ n: sql<number>`count(*)::int` }).from(patientCases).where(eq(patientCases.id, c3));
    eq_("وحالة المصدر لم تُحذف", c3Alive[0].n, 1);

    let sealedAfterFail = false;
    try { await pool.query(`UPDATE medical_exams SET notes = 'x' WHERE id = $1`, [e3.id]); }
    catch { sealedAfterFail = true; }
    check(sealedAfterFail, "والختم سليم بعد الفشل");

    await pool.query(`DROP TABLE IF EXISTS _merge_exam_block`);
  }

  // ── ٨. صفّ غير متسق لا يُمسّ، والدمج يفشل بأمان ────────────────────
  // معاينة تحمل `case_id` لحالة المريض المصدر بينما `patient_id` فيها
  // لمريض ثالث. لا قيد في القاعدة يمنع هذا، وبيانات تاريخية قد تحمله.
  //
  // القاعدة: إعادة الربط تشترط `patient_id` للمصدر أيضاً، فلا تُحرَّك
  // معاينة إنسان آخر. والصفّ الباقي يشير إلى حالة على وشك الحذف، فيسقط
  // الدمج على المفتاح الأجنبي — **فشل ظاهر يكشف الخلل، لا تعديل صامت
  // يخفيه**.
  console.log("\n── صفّ غير متسق: لا يُمسّ، والدمج يفشل بأمان ──");
  {
    const s4 = await mkPatient("مصدر بصفّ غريب");
    const t4 = await mkPatient("هدف رابع");
    const stranger = await mkPatient("مريض ثالث لا علاقة له");
    const c4 = await mkCase(s4, "physiotherapy");
    await mkCase(t4, "physiotherapy");

    // معاينة سليمة للمصدر — يجب أن تتراجع مع المعاملة لا أن تبقى منقولة.
    const ownExam = await mkExam(s4, c4, "physiotherapy");
    // والصفّ غير المتسق: حالة المصدر، ومريض آخر.
    const crossed = await mkExam(stranger, c4, "physiotherapy");
    eq_("الصفّ غير المتسق أُنشئ: حالة المصدر + مريض ثالث",
      [crossed.caseId, crossed.patientId], [c4, stranger]);

    let mergeErr = "";
    try { await storage.mergePatients(s4, t4); } catch (e: any) { mergeErr = String(e?.message ?? e); }
    check(mergeErr !== "", "الدمج فشل بدل أن يمسّ بيانات مريض آخر", "نجح — وهذا خطأ");
    check(/foreign key|medical_exams/i.test(mergeErr), "  والفشل على المفتاح الأجنبي كما هو مقصود", mergeErr);

    const [crossedAfter] = await db.select().from(medicalExams).where(eq(medicalExams.id, crossed.id));
    eq_("معاينة المريض الثالث لم تُمسّ: patient_id", crossedAfter.patientId, stranger);
    eq_("ولا case_id", crossedAfter.caseId, c4);
    eq_("ولا تشخيصها", crossedAfter.diagnosis, before.diagnosis);

    // التراجع الكامل: حتى معاينة المصدر السليمة عادت كما كانت.
    const [ownAfter] = await db.select().from(medicalExams).where(eq(medicalExams.id, ownExam.id));
    eq_("ومعاينة المصدر السليمة تراجعت أيضاً", [ownAfter.patientId, ownAfter.caseId], [s4, c4]);
    const s4Alive = await db.select({ n: sql<number>`count(*)::int` }).from(patients).where(eq(patients.id, s4));
    eq_("والملف المصدر لم يُحذف", s4Alive[0].n, 1);
    const c4Alive = await db.select({ n: sql<number>`count(*)::int` }).from(patientCases).where(eq(patientCases.id, c4));
    eq_("وحالته لم تُحذف", c4Alive[0].n, 1);
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = $1`, [DOCTOR_ID]);
  console.log(failures === 0 ? "\n✅ all merge-exams cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
