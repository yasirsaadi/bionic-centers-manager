// Migration 193: جلساتُ العلاج الطبيعي المُرجَعة مع الاسترجاع (§4.fz التكملة ٢ — واقعةُ كرار ناصر، ذي قار ٢٠٢٦-١١-٠٧).
//
// دفع ٣٥٠ ألفاً لعشر جلسات وحضر واحدة واستُرجع له ٣١٥ ألفاً باعتماد المالك — **وبقي العدّادُ «باقي ٩»**: الاسترجاعُ كان يكتب مالاً سالباً
// ولا يمسّ الجلسات. فطلبُ الاسترجاع لقسم العلاج الطبيعي يسأل «كم جلسةً تُرجَع من كلّ نوع» (`sessions_returned`)، والاعتمادُ يكتبها على
// صفّ الاسترجاع نفسِه (`payments.returned_sessions`) فيطرحها العدّادُ (`resolvePurchasedSessions`)، أو يُنقص الخطّةَ لصاحبها.
// إضافةٌ محضة: عمودان فارغان لكلّ صفٍّ قائم — فلا يتغيّر عدّادُ أحدٍ اليوم.
export const name = "193_refund_returned_sessions";

export const sql = `
ALTER TABLE patient_refund_requests ADD COLUMN IF NOT EXISTS sessions_returned JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS returned_sessions JSONB;
`;
