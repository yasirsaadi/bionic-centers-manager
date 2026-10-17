// Migration 154: طلبُ معاينةٍ جديدة للعلاج الطبيعي من الاستعلامات (§4.el — ٢٠٢٦-١٠-١٧).
//
// المالك: «اريدها ان تظهر [معاينة جديدة] لموظّفي الاستعلامات ليتمكّنوا من ارسال معاينة جديدة في حال احتاج المريض معاينة اضافية».
// والأطرافُ والمساند لها ذلك منذ زمن (طلبُ جهازٍ على مسار المعاينة). **والعلاجُ الطبيعيّ لم يكن له طلبٌ أصلاً**: انتظارُه مشتقٌّ من
// «قسمٌ لم يُعايَن قطّ» (§4.bi)، فمريضٌ عويِن مرّةً لا يعود إلى «معايناتي» بأيّ باب.
//
// فصار طلبُ المعاينة الكاملة يقبل العلاجَ الطبيعيّ — **بشكلٍ واحد**: مسارٌ كامل، بلا مرساةِ جهازٍ ولا أمرٍ ولا زيارة. فلا يدخل
// طابورَ المراجعة السريعة ولا «المُرجَعون من الطبيب» (كلاهما مقصورٌ على `REVIEW_SERVICE_TYPES` في الشيفرة)، ويدخل «معايناتي»
// وشاراتِ الانتظار من الشرط العامّ القائم (`r.service_type = pc.case_type`) بلا سطرٍ جديد فيها. والطلبُ يُغلَق بتوقيع معاينته.
export const name = "154_physio_exam_request";

export const sql = `
ALTER TABLE medical_review_requests DROP CONSTRAINT IF EXISTS medical_review_requests_service_check;
ALTER TABLE medical_review_requests ADD CONSTRAINT medical_review_requests_service_check
  CHECK (service_type IN ('prosthetic', 'medical_support', 'physiotherapy'));

DO $mrr154$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_review_requests_physio_shape_check') THEN
    ALTER TABLE medical_review_requests ADD CONSTRAINT medical_review_requests_physio_shape_check
      CHECK (service_type <> 'physiotherapy'
             OR (requested_path = 'full' AND device_episode_id IS NULL AND work_order_id IS NULL AND visit_id IS NULL));
  END IF;
END
$mrr154$;
`;
