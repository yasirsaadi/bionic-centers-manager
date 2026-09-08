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
//  فصار **التسجيلُ** (لا أيّ قارئٍ تشغيليّ آخر — راجع القسم ٤ لاستثناء
//  الهاتف عند التعديل) يفحص السلّةَ أيضاً: اسمٌ أو هاتفٌ يطابق صفّاً
//  **محذوفاً** يُرفَض ٤٠٩ — **بنفس رسالة السلّة الآمنة القائمة**
//  (`IN_TRASH_ESCALATION`، `@shared/patient_trash`) لا رسالةً جديدة
//  تُخترَع: «يوجد ملف مطابق يحتاج مراجعة الإدارة قبل التسجيل» — بلا اسمٍ
//  ولا رقمٍ ولا فرعٍ ولا ذكرِ سلّةٍ، تماماً كما تفعل `lookup-by-name` لمن
//  لا يملك رؤية السلّة أصلاً. **والمحذوفُ يبقى محذوفاً فعلاً**: لا كتابةَ
//  عليه، لا استعادةَ ضمنية — فقط تُحجَز هويّتُه حتى يستعيدها صاحبُها أو
//  يُبَتّ فيها إدارياً.
//
//  ══ ٤) والهاتفُ عند التعديل أيضاً — نفسُ الحجز، لا نافذةً ثانية ═══════════
//  (تصحيحٌ لاحقٌ ثانٍ، ٢٠٢٦-٠٩-٠٨) — القسمُ ٣ أغلق بابَ *التسجيل* فقط، وبقي
//  الهاتفُ يتغيّر أيضاً من «تعديل مريض»: مريضٌ فعّالٌ يُبدِّل رقمَه إلى رقم
//  مريضٍ **محذوفٍ** ⟵ الأصلُ يُستعاد خلال الثلاثين يوماً ⟵ **فعّالان بنفس
//  الرقم** — من بابٍ لم يكن القسمُ ٣ قد أغلقه. فصار `storage.updatePatient`
//  يمرّر `checkTrash: true` أيضاً، **بنفس شرط الفحص القائم أصلاً**: فقط حين
//  يتغيّر الرقمُ المطبَّع فعلياً عمّا كان مخزَّناً — رقمُ المريض نفسِه بلا
//  تغيير يبقى صالحاً كما كان بالحرف. **والاسمُ لا يُمَسّ بهذا التصحيح**: لا
//  قاعدةَ بادئةٍ على `PUT` أصلاً (القسم ١)، فلا شيءَ للسلّة تحجزه هناك.
//
//  ══ ٥) وقفلُ الهويّة يشترك فيه ثالثٌ الآن: الاستعادة ═══════════════════════
//  (تصحيحٌ لاحقٌ ثالث، ٢٠٢٦-٠٩-٠٨) — القسمان ٣ و٤ أغلقا بابَي *التسجيل*
//  و*التعديل* أمام هويّةٍ محذوفة، لكنّ فحصَي الفعّال والمحذوف في كليهما
//  يقعان في عبارتَي SQL منفصلتين **تحت قفلٍ لا تشارك فيه الاستعادةُ**. فكانت
//  استعادةٌ متزامنة تستطيع أن **تلتزم بين العبارتين بالضبط**: فحصُ الفعّال
//  يقرأ الهويّةَ محذوفةً بعد (فلا تعارضَ فعّالاً)، ثمّ تلتزم الاستعادةُ، ثمّ
//  فحصُ المحذوف يقرأ الهويّةَ فعّالةً الآن (فلا تعارضَ في السلّة أيضاً) —
//  فيعبر التسجيلُ أو التعديلُ **بصمتٍ تامّ** رغم أنّ القاعدةَ التي صُمِّم
//  القسمان ٣ و٤ ليحرساها بالضبط انكسرت لحظةَ التزام الاستعادة.
//
//  فصار **قفلُ الهويّة** (`acquirePatientIdentityLock` أدناه — المفتاحُ
//  الثابتُ نفسُه الذي كان خاصّاً بالاسم فقط، القسمُ ٢) **مشتركاً بين
//  ثلاثة**: التسجيلُ (عبر `assertNameAvailableForRegistration`) · تعديلُ
//  الهاتف حين يتغيّر فعلياً (عبر `assertPhoneAvailable` — تقفله الآن قبل
//  قفلها الخاصّ بالهاتف) · **والاستعادةُ**
//  (`restorePatient` في `server/patients/trash_store.ts` — تقفله أوّلَ عملٍ
//  في معاملتها، قبل حتى `SELECT ... FOR UPDATE` على صفّها). فأيُّها بدأ
//  أوّلاً يُتمّ معاملته القصيرة كاملةً (فحصَيها معاً، أو استعادتَها كاملةً)
//  قبل أن يبدأ الآخرُ فحصَه الأوّل أصلاً — لا نافذةَ التزامٍ ممكنة بين
//  فحصين مهما تقاربا.
//
//  **وترتيبُ الأقفال ثابتٌ في الاتجاه نفسِه دائماً**: قفلُ الهويّة أوّلاً،
//  فقفلُ الهاتف الخاصّ (إن وُجد) أو قفلُ صفّ الاستعادة بعده — لا العكسُ في
//  أيّ مسار، وإلّا أمكن تجمّدٌ متبادَل بين معاملتين تقفلان بترتيبين
//  متعاكسين.
//
//  **ولا سلوكَ عملٍ تغيّر بحرف**: لا قاعدةَ اسمٍ جديدة على `PUT`، ولا شرطَ
//  أهليّةٍ جديد على الاستعادة، ولا مخطّطاً ولا فهرساً، ولا رسالةً تغيّرت.
//  الغرضُ الوحيد تسلسلُ الثلاثة زمنياً — لا أكثر.

import { sql } from "drizzle-orm";
import { activePatientSql, trashedPatientSql } from "./active_patient";
import { IN_TRASH_ESCALATION } from "@shared/patient_trash";

/**
 * مساحةُ أسماء **قفل الهويّة المشترك** — مفتاحٌ عامٌّ ثابتٌ واحد (لا بهاش
 * شيء)، منفصلةٌ عن `919` وعن قفل الهاتف. كانت خاصّةً بتكرار الاسم عند
 * التسجيل وحده فاتّسع دورُها (تصحيحٌ لاحقٌ ثالث، ٢٠٢٦-٠٩-٠٨) لتشترك فيها
 * التسجيلُ وتعديلُ الهاتف والاستعادةُ معاً — راجع
 * `acquirePatientIdentityLock` أدناه وشرحَ الملفّ، القسم ٥.
 */
const PATIENT_IDENTITY_LOCK_NAMESPACE = 83101;
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

/** ونظيرُه للهاتف — نفسُ الرسالة الآمنة، عند التسجيل والتعديل معاً (راجع `assertPhoneAvailable`). */
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
 * **قفلُ الهويّة المشترك** — كلُّ ما تفعله: تقفل المفتاحَ الثابتَ نفسَه
 * استشارياً طَوالَ معاملة النداء الحالية. تُستدعى **أوّلَ عملٍ على القاعدة**
 * في كلٍّ من: `assertNameAvailableForRegistration` (تسجيل) ·
 * `assertPhoneAvailable` (تسجيلٌ وتعديلُ هاتف) · `restorePatient`
 * (`server/patients/trash_store.ts`، قبل حتى قفل صفّها بـ`FOR UPDATE`).
 * فمَن يدخل أوّلاً من الثلاثة يُتمّ معاملته القصيرة كاملةً قبل أن يبدأ
 * الآخرُ فحصَه الأوّل أصلاً — لا نافذةَ التزامٍ بين فحص الفعّال وفحص
 * المحذوف في أيٍّ منها (شرحُ الملفّ، القسم ٥). **وتكرارُ استدعائها داخل
 * المعاملة نفسِها بلا ضرر** — `pg_advisory_xact_lock` بنفس المفتاح من نفس
 * الجلسة يعود فوراً، فمناديين اثنين على نفس القفل في معاملةٍ واحدة (كما
 * يقع في `storage.createPatient`: مرّةً عبر فحص الاسم ومرّةً عبر فحص
 * الهاتف) لا يتعطّلان على أنفسهما.
 */
export async function acquirePatientIdentityLock(tx: SqlRunner): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${PATIENT_IDENTITY_LOCK_NAMESPACE}, 0)`,
  );
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
 * **بابُ الإنفاذ الوحيد على التسجيل**: يقفل **قفلَ الهويّة المشترك**
 * (`acquirePatientIdentityLock` — عامٌّ وثابتٌ، لا بهاش الاسم، راجع شرح
 * الملفّ أعلاه) طَوالَ معاملة الإنشاء القصيرة كلِّها ثمّ يفحص — فلا سباقَ
 * بين قفلٍ وقراءة، ولا سباقَ بين تسجيلَين متزامنين مهما اختلف اسماهما، ولا
 * سباقَ مع استعادةٍ متزامنة (القسم ٥). يُستدعى **داخل** معاملة
 * `storage.createPatient` قبل أيّ `INSERT`، لا قبلها ولا بعدها. **لا
 * يُستعمَل على `PUT` أبداً** — القاعدةُ للتسجيل وحده.
 *
 * **وتفحص السلّةَ أيضاً بعد الفعّال** — نفسُ القفل نفسِه، فلا نافذةَ سباقٍ
 * بين الفحصين: هويّةٌ في السلّة محجوزةٌ حتى تُستعاد أو يُبَتّ فيها إدارياً
 * (راجع شرح الملفّ، القسم ٣).
 */
export async function assertNameAvailableForRegistration(
  tx: SqlRunner,
  name: string,
): Promise<void> {
  // قفلُ الهويّة المشترك أوّلاً — يسري على **كلّ** تسجيلٍ متزامن مهما اختلف
  // الاسم (يحمي قاعدةَ البادئة ذاتَها لا التطابقَ التامّ فقط)، وعلى أيّ
  // استعادةٍ متزامنة أيضاً (القسم ٥) — فلا تلتزم بين فحصَي الفعّال والمحذوف.
  await acquirePatientIdentityLock(tx);
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
 * **نظيرُها على السلّة** — تطابقٌ تامّ لا بادئة، كأصلها. تُنادى من التسجيل
 * والتعديل معاً (`checkTrash` في `assertPhoneAvailable`، القسمان ٣ و٤ في
 * شرح الملفّ) **بلا `excludePatientId`**: لا حاجةَ له — صفُّ المريض الذي
 * يُسجَّل أو يُعدَّل فعّالٌ بالتعريف (`deleted_at IS NULL`)، فلن يظهر أبداً
 * بين الصفوف المحذوفة التي تفحصها هذه الدالّة، حتى لو حمل هو نفسُه الرقمَ
 * المطلوب.
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
 * **بابُ الإنفاذ الوحيد للهاتف** — على التسجيل والتعديل معاً. يقفل **قفلَ
 * الهويّة المشترك** أوّلاً (`acquirePatientIdentityLock` — القسم ٥، يسري
 * مع الاستعادة أيضاً)، ثمّ مفتاحَ الرقم المطبَّع الخاصّ استشارياً، ثمّ
 * يفحص. **والترتيبُ ثابت**: هويّةٌ فعامٌّ ثمّ هاتفٌ خاصّ — لا العكس، تجنّباً
 * لتجمّدٍ متبادَل مع معاملاتٍ أخرى تقفل الاثنين. المناديان
 * (`storage.createPatient` بـ`excludePatientId: null`، و`storage.updatePatient`
 * باستثناء صفّ المريض نفسِه) يستدعيانها **داخل** معاملةٍ فعلية قائمة أصلاً —
 * `pg_advisory_xact_lock` يتطلّب ذلك، ومَريدا الدالّتين كلاهما مضمونان أن
 * يكونا داخل معاملة حين يمسّان الهاتف (راجع تعليق إعادة الدخول في
 * `updatePatient`).
 *
 * **و`checkTrash` يرفعها المناديان معاً** (تصحيحٌ لاحقٌ ثانٍ، ٢٠٢٦-٠٩-٠٨):
 * `createPatient` كما كانت، و`updatePatient` أيضاً الآن — **فقط حين يتغيّر
 * الرقمُ المطبَّع فعلياً** عمّا كان مخزَّناً على الملفّ (الشرطُ القائم في
 * موضع النداء نفسِه؛ راجع `storage.ts`). هويّةٌ محذوفة محجوزةٌ سواءٌ فُتح
 * لها ملفٌّ جديد بنفس الرقم أم انتقل إليها ملفٌّ فعّالٌ قائم — البابان
 * معاً، لا أحدُهما دون الآخر.
 */
export async function assertPhoneAvailable(
  tx: SqlRunner,
  phoneE164: string,
  excludePatientId: number | null,
  opts: { checkTrash?: boolean } = {},
): Promise<void> {
  // قفلُ الهويّة المشترك أوّلاً — قبل قفل الهاتف الخاصّ (القسم ٥): يمنع
  // استعادةً متزامنة من الالتزام بين فحص الفعّال وفحص المحذوف أدناه.
  await acquirePatientIdentityLock(tx);
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
