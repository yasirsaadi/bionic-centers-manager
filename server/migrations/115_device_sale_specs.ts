// Migration 115: مواصفاتُ الجهاز عند «اشترى» (§4.cq — المرحلةُ الثانية، ٢٠٢٦-١٠-٠٨).
//
//   • patient_device_episodes.device_specs — ما يملؤه الاستعلاماتُ من خانات الجهاز في نافذة «إتمام البيع» حين تركها الطبيب
//     فارغة (`shared/device_specs.ts`). **وكلمةُ الطبيب في وصفته تبقى الحاكمة** عند القراءة (`mergeDeviceSpecs`).
// عمودٌ على جدولٍ قائم — لا مسَّ بكاسكيد الحذف ولا بالدمج.
export const name = "115_device_sale_specs";

export const sql = `
ALTER TABLE patient_device_episodes ADD COLUMN IF NOT EXISTS device_specs JSONB NOT NULL DEFAULT '{}'::jsonb;
`;
