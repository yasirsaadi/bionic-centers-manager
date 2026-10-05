// **«تسليم قالب اختباري»** (قرارُ المالك ٢٠٢٦-١٠-٠٥، §4.bz).
//
// الخبيرُ في «جاهز للتجربة والتسليم» يسلّم قالباً اختبارياً **لا الجهاز**: الأمرُ لا يُغلَق ولا الحلقة، بل يتوقّف
// `waiting_patient` بسبب `trial_socket` — فيبقى عذرَ تأخيرٍ مكتوباً (أصفر) — ومعه **موعدُ القالب النهائي** يصل المريضَ
// وتتّصل به الاستعلاماتُ حوله. ويتكرّر ما شاء الخبير. وحين يعود المريضُ يعود الأمرُ نفسُه نشطاً إلى خبيره.
//
// «بانتظار القالب النهائي» تعريفٌ واحد: `status = 'waiting_patient' AND hold_reason_code = 'trial_socket'` — فأيُّ
// انتقالٍ آخر (استئناف، توقّفٌ بسببٍ آخر، تسليم، إلغاء) يُخرجه منه بلا أن يُمسّ الموعد.
// إضافيّ، idempotent، بلا لمسِ صفٍّ قائم.

export const name = "097_trial_socket";

export const sql = `
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS trial_socket_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS trial_final_date DATE;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS trial_delivered_at TIMESTAMPTZ;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS trial_last_call_at TIMESTAMPTZ;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS trial_last_call_note TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trial_socket_shape_check') THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT trial_socket_shape_check
      CHECK (
        trial_socket_count >= 0
        AND (NOT (status = 'waiting_patient' AND hold_reason_code = 'trial_socket')
             OR (trial_final_date IS NOT NULL AND purpose = 'initial_build'))
      );
  END IF;
END $$;
`;
