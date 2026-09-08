// ══ منعُ تكرار تسجيل المريض — بالاسم وبالهاتف (قرارُ مالكٍ صريح) ══════════
//
//  قاعدتان مستقلّتان، بحارسين مستقلّين، وبلا قيدٍ في القاعدة لأيٍّ منهما:
//
//   ١) **الاسمُ عند التسجيل فقط** — بادئةٌ لا مطابقةٌ تامّة ولا تشابه: يُرفض
//      تسجيلٌ إن كان اسمُ مريضٍ فعّالٍ **قائم** يبدأ بالنصّ المُدخَل بالضبط
//      (بعد التطبيع الكنسيّ). الاتجاهُ **واحد لا اثنان**: اسمٌ أطول يُمدِّد
//      اسماً موجوداً هو تسجيلٌ **جديد** لا تكراراً — «أحمد حسين فايق صالح»
//      لا يُردّ لوجود «أحمد حسين فايق» ما لم يكن هو نفسُه مطابقاً حرفياً.
//      لا قيدَ فريدٍ في القاعدة: التكرارُ التاريخيّ القائم لا يجوز أن يكسر
//      النشر. `POST /api/patients` وحدها تفرضه — لا `PUT`.
//
//   ٢) **الهاتفُ عند التسجيل والتعديل معاً** — رقمٌ مطبَّعٌ واحد (`phone_e164`)
//      لمريضٍ فعّالٍ واحد نظام‑ياً، بلا استثناء عائلة/وليّ/رقمٍ مشترك. صيغٌ
//      كتابيةٌ مختلفة تُطبَّع لنفس الرقم تتعارض (المطبِّعُ نفسُه في
//      `shared/phone.ts`). ولا قيدَ فريدٍ في القاعدة أيضاً — بيانات هاتفية
//      تاريخية لا تُعاد كتابتُها ولا يخاطر النشرُ بها.
//
//  **الأمانُ من التزامن بلا قيدٍ في القاعدة**: قفلٌ استشاريّ
//  (`pg_advisory_xact_lock`)، يُقفَل **قبل** الفحص وطَوال المعاملة. والمفتاحان
//  (اسمٌ/هاتف) بمساحتَي أسماءٍ منفصلتين كي لا يتصادما، ومختلفتان عن `919`
//  (قفلُ صفّ المريض القائم في storage.ts) لأنّ لا صفَّ مريضٍ موجوداً بعد عند
//  التسجيل.
//
//  **والهاتفُ يُقفَل بهاش الرقم** — تطابقٌ تامّ لا بادئة، فمفتاحان مختلفان
//  يعنيان رقمين مختلفين حقاً، ولا تعارض ممكناً بينهما أصلاً.
//
//  **والاسمُ يُقفَل بمفتاحٍ عامٍّ ثابتٍ واحد — لا بهاش الاسم** (تصحيحٌ لاحق،
//  ٢٠٢٦-٠٩-٠٨): قفلٌ بهاش الاسم كان يحمي التطابقَ التامّ فقط («أحمد حسين
//  فايق» ضدّ نفسها) ولا يحمي قاعدةَ **البادئة** نفسَها — طلبا تسجيلٍ متزامنان
//  بنصَّين مختلفين («أحمد حسين» و«أحمد حسين فايق») كانا يأخذان مفتاحَي هاشٍ
//  مختلفين فلا يتسلسلان، فيرى كلاهما «لا تعارض» (إذ لا صفَّ لأيٍّ منهما بعد)
//  ويكتبان معاً — وينكسر بالضبط الشرطُ الذي صُمِّم هذا الحارس ليحرسه. فصار
//  القفلُ **عاماً وثابتاً**: كلُّ تسجيلٍ متزامن — أيّاً كان الاسم — يتسلسل
//  خلف بعضه في هذه المعاملة القصيرة (فحصُ الاسم + فحصُ الهاتف + الإدراج)،
//  فمَن يدخل ثانياً يُعيد الفحص على ما كتبه الأوّل فعلاً لا على قراءةٍ بائتة.
//  **بساطةٌ مقصودة**: التسجيلُ عمليةٌ نادرةُ التزامن (استقبالٌ يسجّل مريضاً
//  بين حينٍ وآخر لا آلافَ الطلبات بالثانية)، فقفلٌ عامٌّ واحد أبسطُ صوابٍ من
//  نطاق بادئاتٍ معقَّد أو فهرسٍ فريد — وكلاهما خارج هذا التصحيح عمداً.
//
//  ══ ٣) والسلّةُ تحجز الهويّةَ — لا تُسقِطها ولا تفتح باباً خلفياً لها ═══════
//  (تصحيحٌ لاحق، ٢٠٢٦-٠٩-٠٨) — الثغرةُ: مريضٌ يُحذَف (سلّةٌ، ٣٠ يوماً
//  للاستعادة) ⟵ مريضٌ **جديدٌ** بنفس اسمه ورقمه يُسجَّل بلا عائق (الحارسُ
//  الفعّالُ لا يرى المحذوف) ⟵ الأصليُّ يُستعاد ⟵ **فعّالان بهويّةٍ واحدة**
//  — يخرق قاعدةَ الهاتف الجديدة (فعّالٌ واحد لكلّ رقم) ويُبطل الحمايةَ التي
//  بُنيت لأجلها السلّةُ أصلاً (مراجعةُ الإدارة قبل فتح ملفٍّ ثانٍ لنفس
//  الشخص، القسم ٤.ز في CLAUDE.md).
//
//  فصار **التسجيلُ وحده** (لا PUT، ولا أيّ قارئٍ تشغيليّ آخر) يفحص السلّةَ
//  أيضاً: اسمٌ أو هاتفٌ يطابق صفّاً **محذوفاً** يُرفَض ٤٠٩ — **بنفس رسالة
//  السلّة الآمنة القائمة** (`IN_TRASH_ESCALATION`، `@shared/patient_trash`)
//  لا رسالةً جديدة تُخترَع: «يوجد ملف مطابق يحتاج مراجعة الإدارة قبل
//  التسجيل» — بلا اسمٍ ولا رقمٍ ولا فرعٍ ولا ذكرِ سلّةٍ، تماماً كما تفعل
//  `lookup-by-name` لمن لا يملك رؤية السلّة أصلاً. **والمحذوفُ يبقى محذوفاً
//  فعلاً**: لا كتابةَ عليه، لا استعادةَ ضمنية — فقط تُحجَز هويّتُه حتى
//  يستعيدها صاحبُها أو يُبَتّ فيها إدارياً.

import { sql } from "drizzle-orm";
import { activePatientSql, trashedPatientSql } from "./active_patient";
import { IN_TRASH_ESCALATION } from "@shared/patient_trash";

/** مساحةُ أسماء القفل الاستشاريّ لتكرار الاسم — منفصلة عن `919` وعن الهاتف. */
const PATIENT_NAME_LOCK_NAMESPACE = 83101;
/** مساحةُ أسماء القفل الاستشاريّ لتكرار الهاتف. */
const PATIENT_PHONE_LOCK_NAMESPACE = 83102;

/** رسالةُ التعارض على اسمٍ **فعّال** — معتمَدةٌ بالحرف، لا تتغيّر بهذا التصحيح. */
export const NAME_PREFIX_CONFLICT_MESSAGE = "يوجد اسم مسجل يبدأ بهذا الاسم، أكمل كتابة الاسم.";

/** يُرمى حين يبدأ اسمُ مريضٍ فعّالٍ قائم بالنصّ المطبَّع نفسه عند التسجيل. */
export class PatientNameConflictError extends Error {
  constructor() {
    super(NAME_PREFIX_CONFLICT_MESSAGE);
    this.name = "PatientNameConflictError";
  }
}

/** يُرمى حين يحمل مريضٌ فعّالٌ آخر نفسَ رقم الهاتف المطبَّع. */
export class PatientPhoneConflictError extends Error {
  constructor() {
    super("رقم الهاتف مسجَّل لمريضٍ آخر");
    this.name = "PatientPhoneConflictError";
  }
}

/**
 * يُرمى حين يبدأ اسمُ مريضٍ **محذوف** (سلّة) بالنصّ المطبَّع نفسه عند
 * التسجيل — **رسالةُ السلّة الآمنة القائمة نفسُها**، بلا اسمٍ ولا رقمٍ ولا
 * فرعٍ ولا ذكرِ سلّةٍ أصلاً (`IN_TRASH_ESCALATION` — نفسُ ما تقوله
 * `lookup-by-name` لمن لا يملك رؤية السلّة).
 */
export class PatientNameTrashConflictError extends Error {
  constructor() {
    super(IN_TRASH_ESCALATION);
    this.name = "PatientNameTrashConflictError";
  }
}

/** ونظيرُه للهاتف — نفسُ الرسالة الآمنة، **للتسجيل فقط** (راجع `assertPhoneAvailable`). */
export class PatientPhoneTrashConflictError extends Error {
  constructor() {
    super(IN_TRASH_ESCALATION);
    this.name = "PatientPhoneTrashConflictError";
  }
}

type SqlRunner = { execute: (query: any) => Promise<any> };

function firstRow(result: any): any {
  return result?.rows?.[0];
}

/**
 * هل يبدأ اسمُ مريضٍ فعّالٍ **قائم** بالنصّ المُدخَل (بعد التطبيع)؟ **قراءةٌ
 * بلا قفل** — للفحص الحيّ في نافذة التسجيل ولإعادة التحقّق داخل معاملة
 * مقفولة سلفاً على حدٍّ سواء. التطبيعُ عبر `patient_search_norm` القانونية
 * نفسها (migration 054) — لا نسخةٌ ثانية قد تنحرف بايتاً عن العمود المخزَّن.
 *
 * `left(target, length(prefix)) = prefix` بدل `LIKE 'prefix%'` عمداً: يتجنّب
 * كاملاً حراسةَ رموز `LIKE` الخاصّة (`%`، `_`) في اسمٍ حقيقي، ويصحّ تلقائياً
 * حين يكون الاسمُ القائم أقصر من المُدخَل (فـ`left` يُرجعه كاملاً فلا يساوي
 * المُدخَل الأطول). واسمٌ مُدخَلٌ يطبَّع إلى فراغ (فراغٌ أو علاماتٌ فقط) لا
 * يطابق أحداً أبداً — فراغٌ لا يعني «أيّ اسم».
 */
export async function hasActiveNamePrefixConflict(
  runner: SqlRunner,
  name: string,
): Promise<boolean> {
  const result = await runner.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM patients ap
      WHERE ${activePatientSql("ap")}
        AND ap.name_norm IS NOT NULL
        AND patient_search_norm(${name}) <> ''
        AND left(ap.name_norm, char_length(patient_search_norm(${name}))) = patient_search_norm(${name})
    ) AS conflict
  `);
  return Boolean(firstRow(result)?.conflict);
}

/**
 * **نظيرُها على السلّة** — الشرطُ الوحيد المختلف هو `trashedPatientSql` بدل
 * `activePatientSql`؛ منطقُ البادئة نفسُه بالحرف. **للتسجيل فقط** (راجع
 * `assertNameAvailableForRegistration`) — لا قارئَ تشغيليّاً آخر يستعملها.
 */
export async function hasTrashedNamePrefixConflict(
  runner: SqlRunner,
  name: string,
): Promise<boolean> {
  const result = await runner.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM patients ap
      WHERE ${trashedPatientSql("ap")}
        AND ap.name_norm IS NOT NULL
        AND patient_search_norm(${name}) <> ''
        AND left(ap.name_norm, char_length(patient_search_norm(${name}))) = patient_search_norm(${name})
    ) AS conflict
  `);
  return Boolean(firstRow(result)?.conflict);
}

/** جوابُ فحص توفّر الاسم — لِمن يحتاج السببَ أيضاً (نافذةُ التسجيل الحيّة). */
export type NameAvailability =
  | { available: true }
  | { available: false; reason: "active_conflict" | "trash_conflict"; message: string };

/**
 * **الفحصُ الحيّ الكامل** لنافذة التسجيل — `GET /api/patients/name-availability`
 * وحدها تناديها. فعّالٌ أوّلاً (الحالةُ الأشيع، والرسالةُ المعتمَدة القديمة
 * بلا تغيير)، فمحذوفٌ ثانياً (رسالةُ السلّة الآمنة نفسُها). **قراءةٌ بلا
 * قفل** كنظيرتيها — الحسمُ الفعليُّ في `assertNameAvailableForRegistration`
 * وحدها عند الحفظ.
 */
export async function checkNameAvailability(
  runner: SqlRunner,
  name: string,
): Promise<NameAvailability> {
  if (await hasActiveNamePrefixConflict(runner, name)) {
    return { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE };
  }
  if (await hasTrashedNamePrefixConflict(runner, name)) {
    return { available: false, reason: "trash_conflict", message: IN_TRASH_ESCALATION };
  }
  return { available: true };
}

/**
 * **بابُ الإنفاذ الوحيد على التسجيل**: يقفل قفلاً استشارياً **عاماً وثابتاً
 * واحداً** (لا بهاش الاسم — راجع شرح الملفّ أعلاه) طَوالَ معاملة الإنشاء
 * القصيرة كلِّها ثمّ يفحص — فلا سباقَ بين قفلٍ وقراءة، ولا سباقَ بين تسجيلَين
 * متزامنين مهما اختلف اسماهما. يُستدعى **داخل** معاملة `storage.createPatient`
 * قبل أيّ `INSERT`، لا قبلها ولا بعدها. **لا يُستعمَل على `PUT` أبداً** —
 * القاعدةُ للتسجيل وحده.
 *
 * **وتفحص السلّةَ أيضاً بعد الفعّال** — نفسُ القفل نفسِه، فلا نافذةَ سباقٍ
 * بين الفحصين: هويّةٌ في السلّة محجوزةٌ حتى تُستعاد أو يُبَتّ فيها إدارياً
 * (راجع شرح الملفّ، القسم ٣).
 */
export async function assertNameAvailableForRegistration(
  tx: SqlRunner,
  name: string,
): Promise<void> {
  // مفتاحٌ ثابت — لا بهاش الاسم: يسري على **كلّ** تسجيلٍ متزامن مهما اختلف
  // الاسم، فيحمي قاعدةَ البادئة ذاتَها لا التطابقَ التامّ فقط.
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${PATIENT_NAME_LOCK_NAMESPACE}, 0)`,
  );
  if (await hasActiveNamePrefixConflict(tx, name)) {
    throw new PatientNameConflictError();
  }
  if (await hasTrashedNamePrefixConflict(tx, name)) {
    throw new PatientNameTrashConflictError();
  }
}

/**
 * هل يحمل مريضٌ فعّالٌ **آخر** (بمعزلٍ عن `excludePatientId`، لملفٍّ يعدّل
 * نفسَه) نفسَ رقم الهاتف المطبَّع E.164؟ **قراءةٌ بلا قفل**.
 */
export async function hasActivePhoneConflict(
  runner: SqlRunner,
  phoneE164: string,
  excludePatientId: number | null,
): Promise<boolean> {
  const result = await runner.execute(
    excludePatientId == null
      ? sql`
          SELECT EXISTS (
            SELECT 1 FROM patients ap
            WHERE ${activePatientSql("ap")} AND ap.phone_e164 = ${phoneE164}
          ) AS conflict
        `
      : sql`
          SELECT EXISTS (
            SELECT 1 FROM patients ap
            WHERE ${activePatientSql("ap")} AND ap.phone_e164 = ${phoneE164}
              AND ap.id <> ${excludePatientId}
          ) AS conflict
        `,
  );
  return Boolean(firstRow(result)?.conflict);
}

/**
 * **نظيرُها على السلّة** — تطابقٌ تامّ لا بادئة، كأصلها. **للتسجيل فقط**
 * (`checkTrash` في `assertPhoneAvailable` لا يُرفَع إلّا من `createPatient`)
 * فلا `excludePatientId` هنا أصلاً — لا صفَّ قائماً يُستثنى عند الإنشاء.
 */
export async function hasTrashedPhoneConflict(
  runner: SqlRunner,
  phoneE164: string,
): Promise<boolean> {
  const result = await runner.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM patients ap
      WHERE ${trashedPatientSql("ap")} AND ap.phone_e164 = ${phoneE164}
    ) AS conflict
  `);
  return Boolean(firstRow(result)?.conflict);
}

/**
 * **بابُ الإنفاذ الوحيد للهاتف** — على التسجيل والتعديل معاً. يقفل مفتاح
 * الرقم المطبَّع استشارياً ثمّ يفحص. المناديان (`storage.createPatient`
 * بـ`excludePatientId: null`، و`storage.updatePatient` باستثناء صفّ المريض
 * نفسِه) يستدعيانها **داخل** معاملةٍ فعلية قائمة أصلاً — `pg_advisory_xact_lock`
 * يتطلّب ذلك، ومَريدا الدالّتين كلاهما مضمونان أن يكونا داخل معاملة حين
 * يمسّان الهاتف (راجع تعليق إعادة الدخول في `updatePatient`).
 *
 * **و`checkTrash` للتسجيل وحده** — `createPatient` يرفعها صراحةً،
 * `updatePatient` **لا يمرّرها أبداً** فتبقى `false` افتراضاً: تعديلُ هاتفٍ
 * على مريضٍ فعّالٍ قائم سلوكُه كما كان بالحرف — لا فحصَ سلّةٍ جديداً عليه.
 * حجزُ الهويّة شأنُ فتح ملفٍّ جديد، لا تصحيحِ ملفٍّ قائم.
 */
export async function assertPhoneAvailable(
  tx: SqlRunner,
  phoneE164: string,
  excludePatientId: number | null,
  opts: { checkTrash?: boolean } = {},
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${PATIENT_PHONE_LOCK_NAMESPACE}, hashtext(${phoneE164}))`,
  );
  if (await hasActivePhoneConflict(tx, phoneE164, excludePatientId)) {
    throw new PatientPhoneConflictError();
  }
  if (opts.checkTrash && await hasTrashedPhoneConflict(tx, phoneE164)) {
    throw new PatientPhoneTrashConflictError();
  }
}
