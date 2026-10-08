// Migration 114: استمارةُ المراجع (§4.cq — المرحلةُ الأولى، ٢٠٢٦-١٠-٠٨).
//
//   • patients.governorate         — المحافظةُ خانةً مستقلّة بقائمة (`GOVERNORATE_OPTIONS`) — كانت تُكتب داخل العنوان.
//   • patients.injury_date_status  — تاريخُ الإصابة حين لا تاريخ: «منذ الولادة» (`congenital`) أو «غير معروف» (`unknown`).
//                                    **تاريخٌ أو حالة — لا الاثنان** (قيدٌ هنا، و`normalizeInjuryDate` في الخادم).
// أعمدةٌ على `patients` نفسِه — لا جدولَ جديد، فلا مسَّ بكاسكيد الحذف ولا بالدمج.
export const name = "114_intake_sheet";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS injury_date_status TEXT;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_injury_date_status_check;
ALTER TABLE patients ADD CONSTRAINT patients_injury_date_status_check
  CHECK (injury_date_status IS NULL OR (injury_date_status IN ('congenital','unknown') AND injury_date IS NULL));
`;
