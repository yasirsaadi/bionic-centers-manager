// Migration 121: التقييمُ الأوّليّ للعلاج الطبيعي داخل المعاينة، و«سبب المراجعة» على ملفّ المريض (§4.da — ٢٠٢٦-١٠-٠٩).
//
// قرارُ المالك: استمارةُ التقييم الورقية (صفحتان) **كاملةً بلا نقص** داخل معاينة الأخصائيّ أو الطبيب أو المسؤول، تُحفَظ مع المعاينة
// بتاريخها ووقتها، ويطّلع عليها المعالجُ والاستقبالُ من ملفّ المريض، وعلى أساسها تُختار الخطّة.
//
//   • medical_exams.assessment — **الاستمارةُ مختومةً مع المعاينة** (`shared/physio_initial_assessment.ts`: رموزٌ لا ألفاظ، ومعها رمزُ
//     الاستمارة وإصدارُها). عمودٌ على الجدول المختوم بترِكر ٠٢٨: الإضافةُ لا تحدّث صفّاً فلا تمسّ الختم، والتنقيحُ يكتبه من البابِ
//     المراقَب نفسِه كبقيّة الأعمدة.
//   • medical_exam_revisions.assessment — **النسخةُ السابقة تحمل استمارتَها** — التنقيحُ لا يمحو.
//   • patients.presenting_complaint — **«سبب المراجعة»**: الشكوى بكلمات المراجع يكتبها الاستقبال، منفصلةً عن «التشخيص» الذي يكتبه
//     الفاحص (كانا خانةً واحدة يكتب فيها الفاحصُ فوق ما كتبه الاستقبال). عمودٌ على `patients` — لا جدولَ جديد، فلا مسَّ بكاسكيد الحذف.
// إضافةٌ لا تمسّ صفّاً قائماً: المعايناتُ القديمة بلا تقييم وتُعرَض كما كانت.

export const name = "121_physio_initial_assessment";

export const sql = `
ALTER TABLE medical_exams ADD COLUMN IF NOT EXISTS assessment JSONB;
ALTER TABLE medical_exam_revisions ADD COLUMN IF NOT EXISTS assessment JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS presenting_complaint TEXT;
`;
