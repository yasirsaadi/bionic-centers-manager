// Migration 194: طلبُ إلغاء أمر التصنيع يوافق عليه المديرُ أو المسؤول (§4.gd — طلبُ المالك ٢٠٢٦-١١-٠٨).
//
// واقعةُ قحطان ياسين علوان: اشترى طرفاً يوم ٥ آب ودفع يوم ٩ آب، وفي اليوم نفسِه ألغى الخبيرُ أمرَه من بابٍ قديم كان يغيّر الحالةَ إلى أيّ قيمة
// («الحالة: cancelled» — أُزيل في #205 يوم ١١ آب)، فعاد يوم ٨ تشرين الثاني لأخذ القالب ولا أمرَ له. وقولُ المالك: «ممكن أن يلغي لكن بمصادقة المدير».
// فالخبيرُ يطلب الإلغاءَ بسببه، والأمرُ يبقى قائماً حتى يوافق المديرُ أو المسؤول فيُلغى، أو يرفض فيُمحى الطلب.
// إضافةٌ محضة: ثلاثةُ أعمدةٍ فارغة لكلّ صفٍّ قائم — فلا يتغيّر أمرُ أحدٍ اليوم.
export const name = "194_order_cancel_request";

export const sql = `
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS cancel_requested_by INTEGER REFERENCES system_users(id);
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS cancel_request_note TEXT;
`;
