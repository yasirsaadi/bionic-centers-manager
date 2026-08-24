/**
 * ٠٦٦ — **التفاصيلُ التجارية لجهازٍ عايَنه طبيب، ومالكُ كلّ حقلٍ فيها**.
 *
 * أعمدةٌ على `post_exam_followups` وحدها. **ولا جدولَ جديد**: الصفُّ نفسُه
 * يحمل السعرَ المعتمد والخبيرَ المختار وحالةَ العملية منذ ترحيل ٠٥٣، فوضعُ
 * مالكِ كلٍّ منها بجواره يجعل القراءةَ واحدةً والقفلَ واحداً — و`FOR UPDATE`
 * على صفّ المتابعة يحرس الجميع معاً.
 *
 * ══ ما تُجيب عنه ═══════════════════════════════════════════════════════
 *
 * ① **«لم يُسعَّر» ≠ «مجّانيّ»** — وكان الصفرُ يقولهما معاً.
 *    `price_kind` (`normal`/`discount`/`free`) هو الدليلُ لا الرقم:
 *      `NULL`     ⟶ لم يُسعَّر بعد (و`approved_price = 0`).
 *      `free`     ⟶ مجّانيٌّ بقرارٍ صريح: `approved_price = 0` و
 *                    `original_price > 0` — فالتبرّعُ يُقاس بقيمته.
 *      `discount` ⟶ `0 < approved_price < original_price`.
 *      `normal`   ⟶ `approved_price = original_price > 0`.
 *
 *    **و`approved_price` يبقى مصدرَ الحقيقة الوحيد للمال** كما كان: هو ما
 *    يقيّده `assignManufacturing`. فلا سعرَ ثانٍ يُخترَع، وإنما يُقال **ممّ
 *    تكوّن** هذا الرقم.
 *
 * ② **مالكُ الحقل** — ثلاثةُ حقولٍ لها مالك: السعرُ والخبيرُ والقرار.
 *    `doctor` ⟶ أدخله الطبيبُ في معاينته: لا يكتب فوقه استقبالٌ ولا مديرُ
 *    فرع، بل صاحبُه أو المسؤولُ العام.
 *    `staff`  ⟶ أدخله الموظّفون، ويديره أيُّ مخوَّل.
 *    `NULL`   ⟶ فارغٌ، يُكمله مَن حضر.
 *
 *    **والمالكيةُ محفوظةٌ صريحةً لا مُستنتَجة**: «القيمةُ غير فارغة» لا تقول
 *    مَن كتبها، وسعرٌ أدخله الاستقبالُ كان سيُقرأ سعرَ طبيبٍ فيُقفَل عليه.
 *    ومعها لقطةُ الاسم — حسابٌ يُحذف يترك رقماً لا يُفسَّر، والسطرُ يبقى
 *    مقروءاً («أدخله د. فلان»).
 *
 * ③ **قرارُ الشراء واقعةٌ مسجَّلة لا حالةٌ في الآلة.**
 *    `purchase_decision` (`bought`/`not_bought`) يُحفَظ **ولو نقص السعرُ أو
 *    الخبير** — فلا يُسأل المريضُ «أشتريتَ؟» مرّتين، ويُكمل الموظّفُ ما ينقص
 *    ثمّ يُتمّ الخادمُ البيعَ من تلقائه. ولا حالةَ جديدة في `status`: الصفُّ
 *    يبقى حيّاً كما هو، والعرضُ يُشتقّ (`examPathStatusLine`).
 *
 *    و`not_bought_reason_text` هو **الواقعةُ الإنسانية**: نصٌّ حرٌّ إلزاميّ
 *    بدل أحدَ عشر رمزاً كان الموظّفُ يختار منها «سبب آخر» فلا يُفيد أحداً.
 *    والرمزُ الموروث يبقى في `closed_reason` بالقيمة المحايدة `other`.
 *
 * ══ ما لا يفعله ═══════════════════════════════════════════════════════
 * لا يحذف عموداً ولا جدولاً ولا صفّاً · لا يكتب على صفٍّ قائم (كلُّ الأعمدة
 * تولد `NULL`، وهو الصدق: لم تُسجَّل هذه الوقائعُ لتلك الصفوف) · لا يمسّ
 * `service_discount_requests` ولا `price_change_requests` ولا الحالاتِ
 * الموروثة · ولا يمسّ ترحيلاً من ٠٠١ إلى ٠٦٥.
 *
 * إضافيٌّ بالكامل، وقابلٌ للتشغيل مرّتين.
 */
export const name = "066_exam_commercial_ownership";

export const sql = `
-- ① التسعيرُ الصريح ------------------------------------------------------
ALTER TABLE post_exam_followups
  ADD COLUMN IF NOT EXISTS original_price INTEGER,
  ADD COLUMN IF NOT EXISTS price_kind TEXT,
  ADD COLUMN IF NOT EXISTS price_owner TEXT,
  ADD COLUMN IF NOT EXISTS price_owner_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS price_owner_name TEXT;

COMMENT ON COLUMN post_exam_followups.price_kind IS
  'normal | discount | free. NULL = لم يسعر بعد. وهو الدليل لا الرقم: صفر مع free يعني مجانيا صريحا، وصفر مع NULL يعني غير مسعر.';
COMMENT ON COLUMN post_exam_followups.original_price IS
  'السعر قبل اي تعديل تجاري. NULL = لم يسعر. وخصم او مجانية بلا اصل موجب معلوم مردودة.';
COMMENT ON COLUMN post_exam_followups.price_owner IS
  'doctor = ادخله الطبيب في معاينته فلا يكتب فوقه استقبال ولا مدير فرع · staff = ادخله الموظفون · NULL = فارغ.';

-- ② الخبيرُ ومالكُه ------------------------------------------------------
ALTER TABLE post_exam_followups
  ADD COLUMN IF NOT EXISTS expert_owner TEXT,
  ADD COLUMN IF NOT EXISTS expert_owner_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS expert_owner_name TEXT;

-- ③ قرارُ الشراء ---------------------------------------------------------
ALTER TABLE post_exam_followups
  ADD COLUMN IF NOT EXISTS purchase_decision TEXT,
  ADD COLUMN IF NOT EXISTS purchase_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_decision_owner TEXT,
  ADD COLUMN IF NOT EXISTS purchase_decision_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_decision_name TEXT,
  ADD COLUMN IF NOT EXISTS not_bought_reason_text TEXT;

COMMENT ON COLUMN post_exam_followups.purchase_decision IS
  'bought | not_bought. NULL = لم يقرر بعد. يحفظ ولو نقص السعر او الخبير، فلا يسال المريض مرتين.';
COMMENT ON COLUMN post_exam_followups.not_bought_reason_text IS
  'السبب الحر الالزامي عند «لم يشتر» — الواقعة الانسانية. والرمز الموروث يبقى في closed_reason.';

-- القيمُ محروسةٌ في القاعدة لا في التطبيق وحده: قيمةٌ مخترَعة من سكربت أو
-- من Console تُردّ عند الكتابة لا تُكتشَف بعد شهر. و NULL مقبولةٌ صراحةً في
-- كلٍّ منها لأن الصفوفَ القائمة لم تُسجَّل لها هذه الوقائع.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_price_kind_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_price_kind_check
      CHECK (price_kind IS NULL OR price_kind IN ('normal', 'discount', 'free'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_price_owner_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_price_owner_check
      CHECK (price_owner IS NULL OR price_owner IN ('doctor', 'staff'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_expert_owner_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_expert_owner_check
      CHECK (expert_owner IS NULL OR expert_owner IN ('doctor', 'staff'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_decision_owner_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_decision_owner_check
      CHECK (purchase_decision_owner IS NULL
             OR purchase_decision_owner IN ('doctor', 'staff'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_purchase_decision_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_purchase_decision_check
      CHECK (purchase_decision IS NULL
             OR purchase_decision IN ('bought', 'not_bought'));
  END IF;

  --  **مالكٌ بلا صاحبٍ سطرٌ لا يُسأل عنه أحد**: الاثنان يمتلئان معاً أو
  --  يبقيان فارغين معاً — نفسُ قاعدة «purchase_interest» في ٠٥٣ حرفياً.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_owner_pairs_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_owner_pairs_check
      CHECK (
        (price_owner IS NULL) = (price_owner_user_id IS NULL)
        AND (expert_owner IS NULL) = (expert_owner_user_id IS NULL)
        AND (purchase_decision_owner IS NULL) = (purchase_decision_user_id IS NULL)
      );
  END IF;

  --  **نوعُ سعرٍ بلا أصلٍ موجب لا معنى له.** والتبرّعُ يُقاس بقيمته، والخصمُ
  --  يُقاس بما خُصم منه — فكلاهما يستوجب أصلاً معلوماً أكبرَ من صفر.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_price_kind_needs_original_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_price_kind_needs_original_check
      CHECK (price_kind IS NULL OR (original_price IS NOT NULL AND original_price > 0));
  END IF;

  --  **والقرارُ لا يُسجَّل بلا ختمِ وقتٍ ولا مالك**، و«لم يشترِ» لا تُسجَّل
  --  بلا سببٍ مكتوب — وهو الفرقُ بين سجلٍّ يُقرأ وسجلٍّ يُخمَّن.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pef_decision_shape_check'
                    AND conrelid = 'post_exam_followups'::regclass) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT pef_decision_shape_check
      CHECK (
        purchase_decision IS NULL
        OR (purchase_decision_at IS NOT NULL
            AND purchase_decision_owner IS NOT NULL
            AND (purchase_decision <> 'not_bought'
                 OR COALESCE(BTRIM(not_bought_reason_text), '') <> ''))
      );
  END IF;
END $$;

--  طابورُ «اشترى وينتظر استكمالَ بياناته» — فهرسٌ ضيّقٌ على المسجَّل وحده.
CREATE INDEX IF NOT EXISTS ix_pef_purchase_decision
  ON post_exam_followups (purchase_decision, branch_id)
  WHERE purchase_decision IS NOT NULL;
`;
