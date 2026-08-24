/**
 * ٠٦٧ — **المراجعةُ المالية لعملياتِ «بلا معاينة»**.
 *
 * **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
 *
 * ترحيلُ ٠٦٥ فتح مسارَ «بلا معاينة» ثمّ أوقفه عند حدٍّ مؤقّت: الطلبُ يُفتَح
 * ويُوثَّق، ولا تخصيصَ ولا تصنيع — لأن طبقةَ الاعتماد المالي لم تكن قد
 * بُنيت. وهذا الترحيلُ يبنيها.
 *
 * ══ جدولان ═══════════════════════════════════════════════════════════════
 *
 * ① `pending_service_charges` — **المبلغُ المعلَّق**، صفٌّ لكلّ عملية.
 *
 *    يعيش **خارج المحاسبة تماماً**: لا `cost_entries` ولا `patients.total_cost`
 *    ولا `patient_cases.cost` ولا دفعةَ ولا قيدَ يومية. فكلُّ حاسبٍ يقرأ
 *    الدفاترَ القانونية يرى **صفراً** من هذا الصفّ حتى لحظة الاعتماد.
 *
 *    **ولا يُحمَّل على جدولٍ قائم**: `medical_review_requests` طلبُ مراجعةٍ
 *    سريرية، و`service_discount_requests` اعتمادُ استثناءٍ على سعر. وهذه
 *    مراجعةُ **المبلغ نفسِه** مهما كان — معنىً ثالثٌ له صفُّه.
 *
 * ② `pending_service_charge_events` — **الرحلةُ كاملةً**.
 *
 *    أُنشئ · أُعيد (بسببه) · صُحّح (بمبلغه القديم والجديد) · أُعيد إرسالُه ·
 *    اعتُمد · طُبِّق. وبلا هذا الجدول كان سببُ الإعادة الأولى يُمحى بالإعادة
 *    الثانية — فيُقرأ الملفُّ وكأنّ الطبيبَ لم يعترض إلّا مرّة.
 *
 * ══ الهويّةُ دقيقةٌ ولا مفاتيحَ بلا معنى ═══════════════════════════════════
 * `device_episode_id` و`work_order_id` **لقطتا رقمٍ بلا مفتاحٍ أجنبيّ** —
 * نفسُ درس `proposed_expert_user_id` (٠٣٥) و`payments.visit_id` (٠٣٨):
 * كاسكيدُ حذفِ المريض يمرّ بترتيبٍ لا يحتمل مفتاحاً هنا، و`SET NULL` على
 * صفٍّ مُدقَّق يمحو الهويّةَ التي وُضعت ليُقرأ بها.
 *
 * أمّا `patient_id` و`case_id` فمفتاحان حقيقيّان — وقد أُضيف الجدولان إلى
 * كاسكيد `deletePatient` وإلى قرارات `mergePatients` كما توجب القاعدة
 * الملزمة في CLAUDE.md.
 *
 * ══ التطبيقُ مرّةً واحدة بالضبط ════════════════════════════════════════════
 * `applied_at` هو الحارس، ومعه فهرسان جزئيّان يمنعان صفَّين معلَّقين على
 * العملية نفسِها. فضغطتان متزامنتان على «اعتماد» تُنتجان **قيدَ كلفةٍ
 * واحداً**: الثانيةُ تنتظر القفل ثمّ تقرأ `approved` فتُردّ.
 *
 * ══ ما لا يفعله ═══════════════════════════════════════════════════════════
 * لا يحذف عموداً ولا جدولاً ولا صفّاً · لا يمسّ تاريخاً مالياً قائماً · لا
 * يمسّ `service_discount_requests` ولا `medical_review_requests` ولا
 * `post_exam_followups` · ولا يمسّ ترحيلاً من ٠٠١ إلى ٠٦٦.
 *
 * إضافيٌّ بالكامل، وقابلٌ للتشغيل مرّتين.
 */
export const name = "067_pending_service_charges";

export const sql = `
CREATE TABLE IF NOT EXISTS pending_service_charges (
  id                    SERIAL PRIMARY KEY,
  patient_id            INTEGER NOT NULL REFERENCES patients(id),
  branch_id             INTEGER REFERENCES branches(id),
  case_id               INTEGER REFERENCES patient_cases(id),
  -- لقطتا هويّةٍ بلا مفتاحٍ أجنبيّ — عمداً، انظر الرأس.
  device_episode_id     INTEGER,
  work_order_id         INTEGER,
  service_type          TEXT NOT NULL,
  operation_kind        TEXT NOT NULL,
  requested_item        TEXT,
  maintenance_component TEXT,
  -- **لقطةُ منشأ الجهاز** — للعرض في الطابور. ومصدرُ الحقيقة أمرُ التصنيع:
  -- صيانةٌ بلا أجرٍ لا تُنشئ صفّاً هنا أصلاً، فلو عاش المنشأُ هنا وحده لضاع.
  device_origin         TEXT,
  -- **خبيرُ البيع** — يختاره الاستقبالُ لحظةَ العمل لا الطبيبُ لحظةَ المراجعة:
  -- الطبيبُ يراجع **المبلغ** لا مَن ينفّذ. لقطةُ رقمٍ بلا مفتاح (درسُ ٠٣٥).
  sale_expert_user_id   INTEGER,
  amount                INTEGER NOT NULL,
  note                  TEXT,
  status                TEXT NOT NULL DEFAULT 'pending_review',
  created_by            INTEGER,
  created_by_name       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  return_reason         TEXT,
  returned_at           TIMESTAMPTZ,
  returned_by           INTEGER,
  returned_by_name      TEXT,
  reviewed_by           INTEGER,
  reviewed_by_name      TEXT,
  reviewed_at           TIMESTAMPTZ,
  applied_at            TIMESTAMPTZ,
  applied_work_order_id INTEGER,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pending_service_charges
  ADD COLUMN IF NOT EXISTS sale_expert_user_id INTEGER;

--  إضافةٌ لقواعدَ شغّلت شكلاً أسبقَ من هذا الترحيل نفسِه. و«external_device»
--  إن وُجد يُترك كما هو — **لا DROP** — ولا يقرؤه شيء بعد اليوم.
ALTER TABLE pending_service_charges
  ADD COLUMN IF NOT EXISTS device_origin TEXT;

COMMENT ON TABLE pending_service_charges IS
  'المبلغ المعلق لعملية «بلا معاينة». خارج المحاسبة تماما حتى يعتمده طبيب مخول: لا cost_entries ولا total_cost ولا دفعة ولا قيد يومية.';
COMMENT ON COLUMN pending_service_charges.applied_at IS
  'حارس التطبيق مرة واحدة بالضبط. غير فارغ = المبلغ قيد فعلا بالكاتب القانوني.';
COMMENT ON COLUMN pending_service_charges.device_origin IS
  'لقطة منشأ الجهاز للعرض: registered / center_unrecorded / external. ومصدر الحقيقة عمود prosthetic_work_orders.device_origin.';

CREATE TABLE IF NOT EXISTS pending_service_charge_events (
  id            BIGSERIAL PRIMARY KEY,
  charge_id     INTEGER NOT NULL REFERENCES pending_service_charges(id),
  patient_id    INTEGER NOT NULL REFERENCES patients(id),
  branch_id     INTEGER,
  event_type    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  reason        TEXT,
  note          TEXT,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id INTEGER,
  actor_name    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pending_service_charge_events IS
  'رحلة المبلغ المعلق كاملة: انشئ · اعيد بسببه · صحح بمبلغيه · اعيد ارساله · اعتمد · طبق. فلا يمحو سبب اعادة سببا قبله.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_status_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_status_check
      CHECK (status IN ('pending_review', 'returned', 'approved'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_kind_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_kind_check
      CHECK (operation_kind IN ('device_sale', 'maintenance'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_service_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_service_check
      CHECK (service_type IN ('prosthetic', 'medical_support'));
  END IF;

  --  **ولا صفَّ بلا مبلغ**: العمليةُ بلا أجر لا تُنشئ صفّاً أصلاً، فلا
  --  اعتمادَ مسرحيٌّ لصفر ولا التباسَ بين «مجّانيّ» و«لم يُدخَل بعد».
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_amount_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_amount_check
      CHECK (amount > 0);
  END IF;

  --  **والمُعادُ يقول سببَه** — إعادةٌ بلا سببٍ تُعيد الموظّفَ إلى التخمين.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_returned_shape_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_returned_shape_check
      CHECK (status <> 'returned'
             OR (COALESCE(BTRIM(return_reason), '') <> '' AND returned_at IS NOT NULL));
  END IF;

  --  **والمعتمدُ مطبَّقٌ ومنسوبٌ** — لا حالةَ «اعتُمد ولم يُقيَّد» تُخزَّن.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_approved_shape_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_approved_shape_check
      CHECK (status <> 'approved'
             OR (applied_at IS NOT NULL AND reviewed_by IS NOT NULL
                 AND reviewed_at IS NOT NULL));
  END IF;

  --  **وبيعٌ يسمّي خبيرَه دائماً** — فالاعتمادُ ينادي الكاتبَ القانونيّ
  --  للبيع، وهو لا يُسنِد إلى مجهول. والصيانةُ خبيرُها على أمرها.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_sale_expert_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_sale_expert_check
      CHECK (operation_kind <> 'device_sale' OR sale_expert_user_id IS NOT NULL);
  END IF;

  --  **ومنشأُ الجهاز ثلاثةٌ لا اثنان**: «صنعناه ولم نسجّله» ليس «صُنع
  --  خارج المركز». ووسمُ الأوّل بالثاني يصف عملَنا بأنه عملُ غيرنا.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_origin_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_origin_check
      CHECK (device_origin IS NULL
             OR device_origin IN ('registered', 'center_unrecorded', 'external'));
  END IF;

  --  وعكسُها: لا تطبيقَ بلا اعتماد.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'psc_applied_only_approved_check') THEN
    ALTER TABLE pending_service_charges ADD CONSTRAINT psc_applied_only_approved_check
      CHECK (applied_at IS NULL OR status = 'approved');
  END IF;
END $$;

-- ══ **منشأُ الجهاز على السجلّ التشغيليّ** ═════════════════════════════════
--  الصيانةُ بلا أجرٍ لا تُنشئ صفَّ مبلغٍ معلَّق، فلو عاش المنشأُ على ذلك
--  الصفّ وحده لاختفى من السجلّ كلّما كانت الخدمةُ مجّانية. فمكانُه أمرُ
--  التصنيع — الهويّةُ التشغيلية الدائمة للصيانة.
--
--  و«NULL» صدقٌ لا نقص: أوامرُ ما قبل هذا الترحيل لم تُسأل، والبناءُ
--  الأوليُّ لا منشأَ له أصلاً — نحن نصنعه.
ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS device_origin TEXT;

COMMENT ON COLUMN prosthetic_work_orders.device_origin IS
  'منشأ الجهاز المُصان: registered (له حلقة) / center_unrecorded (صنعناه قبل النظام) / external (صُنع خارج المركز). NULL = لم يُسأل أو بناء أولي.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pwo_device_origin_check') THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT pwo_device_origin_check
      CHECK (device_origin IS NULL
             OR device_origin IN ('registered', 'center_unrecorded', 'external'));
  END IF;
END $$;

--  ══ **صفٌّ معلَّقٌ واحد لكلّ عملية** — حقيقةٌ في القاعدة لا قاعدةٌ في الشيفرة.
--  ضغطتان تُنتجان صفّاً واحداً، والثانيةُ تصطدم بالفهرس فتُردّ.
CREATE UNIQUE INDEX IF NOT EXISTS uq_psc_open_work_order
  ON pending_service_charges (work_order_id)
  WHERE work_order_id IS NOT NULL AND status <> 'approved';

CREATE UNIQUE INDEX IF NOT EXISTS uq_psc_open_episode_sale
  ON pending_service_charges (device_episode_id)
  WHERE device_episode_id IS NOT NULL AND operation_kind = 'device_sale'
        AND status <> 'approved';

--  طابورُ الطبيب وطابورُ الاستقبال: الأحدثُ أوّلاً ضمن الفرع.
CREATE INDEX IF NOT EXISTS ix_psc_branch_status
  ON pending_service_charges (branch_id, status, id DESC);
CREATE INDEX IF NOT EXISTS ix_psc_patient ON pending_service_charges (patient_id);
CREATE INDEX IF NOT EXISTS ix_psce_charge
  ON pending_service_charge_events (charge_id, id DESC);
CREATE INDEX IF NOT EXISTS ix_psce_patient
  ON pending_service_charge_events (patient_id, id DESC);
`;
