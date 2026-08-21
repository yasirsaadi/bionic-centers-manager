// **مَن كان في المركز اليوم** — تعريفٌ واحد لصفوف السجلّ ولعدّاده.
//
// ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
// مرشِّح «مرضى اليوم» كان يسأل جدول الزيارات وحده. والزيارةُ **صفٌّ يُنشئه
// الموظّف بيده**، وكثيرٌ ممّا يقع في المركز لا يمرّ به:
//
//   • مريضٌ سُجِّل اليوم ولم تُفتح له زيارةٌ بعد.
//   • مريضٌ دفع دفعةً على حسابه.
//   • مريضٌ وقّع الطبيبُ معاينته.
//   • مريضٌ طلب جهازاً أو جزءاً جديداً.
//   • مريضٌ اشترى فبدأ تصنيعُه.
//   • مريضٌ فُتحت له صيانة.
//
// فيختفي من «مرضى اليوم» مَن جاء فعلاً واشترى ودفع. والموظّفُ الذي يرى ذلك
// **يخترع زيارةً** ليظهر المريض — فيتلوّث جدولُ الزيارات بصفوفٍ لا تصف
// زيارة، وتنحرف كلُّ إحصاءةٍ مبنيّةٍ عليه.
//
// ══ والحلُّ سؤالُ الجداول الأصلية لا اختراعُ صفوف ═══════════════════════
// النشاطُ يُقرأ من مصادره: التسجيل، والزيارة، والدفعة، والمعاينة الموقّعة،
// وطلبُ الجهاز، وأمرُ التصنيع (بناءً كان أو صيانة). **ولا يُنشأ صفٌّ واحد
// لأجل العرض** — القراءةُ لا تكتب.
//
// **ومجرّدُ فتحِ صفحة المريض ليس نشاطاً**: لا شيء هنا يُكتب بالتصفّح.
//
// ══ ولماذا `EXISTS` لكلّ مصدر ═════════════════════════════════════════
// لأن السؤال «هل وقع شيء» لا «كم وقع». فالمريضُ الذي دفع ثلاث دفعاتٍ وزار
// مرّتين **صفٌّ واحد** — و`EXISTS` تتوقّف عند أول تطابق، فلا ضربَ صفوفٍ
// يحتاج `DISTINCT` بعده. وهو ما يجعل العدّاد والصفوف يتّفقان بنيوياً:
// الشرطُ واحدٌ يمرّ على `patients` نفسها.

import { sql, type SQL } from "drizzle-orm";
import { patients } from "@shared/schema";

/**
 * **يومُ بغداد** لعمودٍ بلا منطقة زمنية.
 *
 * القيمُ الساذجة في هذه القاعدة مكتوبةٌ بتوقيت UTC (`now()` على خادمٍ
 * بـUTC)، فتُفسَّر UTC ثم تُحوَّل. وبغيرها تُقرأ زيارةُ الساعة العاشرة
 * مساءً في اليوم السابق — وهي أكثرُ ساعةٍ يقع فيها الخلاف.
 */
const bgdNaive = (col: string) =>
  sql.raw(`((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date`);

/** ويومُ بغداد لعمودٍ يحمل منطقته — تحويلٌ مباشر. */
const bgdTz = (col: string) =>
  sql.raw(`(${col} AT TIME ZONE 'Asia/Baghdad')::date`);

/**
 * **مصادرُ النشاط** — كلٌّ منها جدولٌ أصليّ لا مشتقّ.
 *
 * الترتيب يقصد الأرخص أوّلاً: `EXISTS` تتوقّف عند أول تطابق، فبدءُ السلسلة
 * بالتسجيل (عمودٌ على `patients` نفسها) يحسم أغلبَ مرضى اليوم بلا ضمّة.
 */
export const PATIENT_ACTIVITY_SOURCES = [
  "registered", "visit", "payment", "exam", "device_request", "work_order",
] as const;
export type PatientActivitySource = (typeof PATIENT_ACTIVITY_SOURCES)[number];

/**
 * شرطُ «هذا المريض كان نشطاً في يوم بغداد الفلاني».
 *
 * يُضاف إلى `conditions` نفسها التي تحمل تثبيتَ الفرع لغير المسؤول —
 * فالنشاطُ لا يُخرج موظّفاً من فرعه، تماماً كالبحث بالاسم.
 *
 * @param date `YYYY-MM-DD` — يومُ بغداد كما اختاره المستخدم.
 */
export function patientActiveOnDate(date: string): SQL {
  const P = "patients.id";
  return sql`(
    -- ① سُجِّل اليوم — ولو لم تُفتح له زيارةٌ بعد.
    ${bgdNaive("patients.created_at")} = ${date}::date
    -- ② زيارةٌ غيرُ محذوفة (الحذفُ الناعم يُحترَم كما في كل قراءة).
    OR EXISTS (
      SELECT 1 FROM visits v
       WHERE v.patient_id = ${sql.raw(P)}
         AND v.deleted_at IS NULL
         AND ${bgdNaive("v.visit_date")} = ${date}::date
    )
    -- ③ دفعةٌ على حسابه.
    OR EXISTS (
      SELECT 1 FROM payments pm
       WHERE pm.patient_id = ${sql.raw(P)}
         AND ${bgdNaive("pm.date")} = ${date}::date
    )
    -- ④ معاينةٌ وقّعها الطبيب.
    OR EXISTS (
      SELECT 1 FROM medical_exams me
       WHERE me.patient_id = ${sql.raw(P)}
         AND ${bgdTz("me.signed_at")} = ${date}::date
    )
    -- ⑤ طلبُ جهازٍ أو جزءٍ جديد.
    OR EXISTS (
      SELECT 1 FROM patient_device_episodes de
       WHERE de.patient_id = ${sql.raw(P)}
         AND ${bgdTz("de.created_at")} = ${date}::date
    )
    -- ⑥ أمرُ تصنيعٍ فُتح — بناءً كان (اشترى فبدأ تصنيعُه) أو صيانة.
    OR EXISTS (
      SELECT 1 FROM prosthetic_work_orders wo
       WHERE wo.patient_id = ${sql.raw(P)}
         AND ${bgdTz("wo.created_at")} = ${date}::date
    )
  )`;
}

/**
 * الشرطُ نفسه، مقيَّداً بمصدرٍ واحد — **للاختبار وحده**.
 *
 * يُثبِت أن كلَّ مصدرٍ يُدخل المريضَ **بمفرده**: نجاحُ المجموع لا يُثبت أن
 * السادس يعمل، فقد يكون الأوّلُ هو مَن أدخله في كل حالة.
 */
export function patientActiveOnDateBySource(
  date: string, source: PatientActivitySource,
): SQL {
  const P = "patients.id";
  switch (source) {
    case "registered":
      return sql`(${bgdNaive("patients.created_at")} = ${date}::date)`;
    case "visit":
      return sql`EXISTS (SELECT 1 FROM visits v WHERE v.patient_id = ${sql.raw(P)}
        AND v.deleted_at IS NULL AND ${bgdNaive("v.visit_date")} = ${date}::date)`;
    case "payment":
      return sql`EXISTS (SELECT 1 FROM payments pm WHERE pm.patient_id = ${sql.raw(P)}
        AND ${bgdNaive("pm.date")} = ${date}::date)`;
    case "exam":
      return sql`EXISTS (SELECT 1 FROM medical_exams me WHERE me.patient_id = ${sql.raw(P)}
        AND ${bgdTz("me.signed_at")} = ${date}::date)`;
    case "device_request":
      return sql`EXISTS (SELECT 1 FROM patient_device_episodes de WHERE de.patient_id = ${sql.raw(P)}
        AND ${bgdTz("de.created_at")} = ${date}::date)`;
    case "work_order":
      return sql`EXISTS (SELECT 1 FROM prosthetic_work_orders wo WHERE wo.patient_id = ${sql.raw(P)}
        AND ${bgdTz("wo.created_at")} = ${date}::date)`;
  }
}

//  يُبقي `patients` مستوردةً كي يبقى اسمُ الجدول مرتبطاً بالمخطّط: لو
//  أُعيدت تسميتُه انكسر البناءُ هنا بدل أن يسقط الاستعلامُ وقتَ التشغيل.
void patients;
