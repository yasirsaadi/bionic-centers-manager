// Migration 047: هوية تواصل المريض — جدولان، بلا لمس `patients`.
//
// ══ لماذا جدول مستقلّ ولا عمود واحد في `patients` ════════════════════════
// عمودٌ مثل `telegram_user_id` على صفّ المريض يفترض ثلاثة أشياء كلّها
// خاطئة: أن الحساب واحد، وأن صاحبه هو المريض، وأن العلاقة دائمة. والواقع
// أن أباً واحداً يتابع ثلاثة أبناء مرضى بحسابٍ واحد، وأن الابن يكبر فيربط
// حسابه هو، وأن الوصاية تُسحَب.
//
// و**لا عمود `telegram_link_status`** خصوصاً: الحالة تُشتقّ من جهات الاتصال
// الفعلية — نسخةٌ ثانية منها تنحرف عن أصلها أول مرّة يُسحَب ربطٌ في مسار
// نسي تحديثها، ثم يُصدَّق العمودُ لأنه أقرب.
//
// ══ ما لا يعنيه الربط — وهذا جوهري ═══════════════════════════════════════
// وجود صفٍّ في `patient_contacts` بقناة `telegram` يعني شيئاً واحداً:
// **هذا الحساب رُبِط بهذا الملفّ.** ولا يعني — ولا واحداً منها:
//   • أن رقم هاتف تلغرام يساوي `patients.phone`
//   • أن مالك الحساب هو المريض نفسه
//   • أن ملكية الرقم مُتحقَّق منها
//   • أن تحقّق Telegram Gateway جرى
//   • أن مطابقة مشاركة جهة الاتصال جرت
// هذه حقائق مختلفة، ولا عمود هنا يدّعي واحدة منها. مَن يضيف لاحقاً عموداً
// اسمه `verified` فليُعرّف أولاً **ماذا** تحقّق وبأي دليل.

export const name = "047_patient_communication_identity";

export const sql = `
-- ── جهات اتصال المريض الخارجية ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_contacts (
  id            BIGSERIAL PRIMARY KEY,
  -- المفتاح مُسمّى صراحةً بالاسم الذي يولّده Drizzle لا بالاسم الافتراضي من
  -- Postgres، وإلا رأى drizzle-kit فرقاً دائماً وحاول إعادة بناء القيد.
  patient_id    INTEGER NOT NULL
                CONSTRAINT patient_contacts_patient_id_patients_id_fk
                REFERENCES patients(id),
  -- القناة. المدعوم اليوم 'telegram' وحده، والعمود نصّي ليتّسع لغيرها بلا
  -- ترحيل — والتحقّق في طبقة التطبيق حيث تُعرَف القنوات المفعَّلة فعلاً.
  channel       TEXT NOT NULL,
  -- **نصّ لا رقم.** معرّف تلغرام يتجاوز حدّ الـ32-بت أصلاً، وحسابات القنوات
  -- الأخرى ليست أرقاماً أساساً. وتخزينه رقماً يفقد الأصفار البادئة ويفيض
  -- صامتاً — وهو معرّفٌ لا نحسب به شيئاً، فالنصّ هو شكله الصحيح.
  external_id   TEXT NOT NULL,
  -- صلة صاحب الحساب بالمريض. تُحدَّد **عند إنشاء رابط الربط** لا عند
  -- استهلاكه، فلا يعلن المستهلِك عن نفسه ما ليس له.
  relation      TEXT NOT NULL,
  linked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- السحب. لا عمود 'status' منفصل: النشِط هو ما «revoked_at» فيه فارغ،
  -- وحقيقةٌ واحدة لا تنحرف عن نفسها.
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- لا يُربَط الحساب نفسه بالمريض نفسه مرّتين **وهو نشِط**. جزئي عمداً:
-- السحب يُبقي الصفّ تاريخاً، وإعادةُ الربط بعده تُنشئ صفّاً نشطاً جديداً
-- بلا تصادم — فالتاريخ محفوظ والحاضر واحد.
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_contacts_active
  ON patient_contacts (patient_id, channel, external_id)
  WHERE revoked_at IS NULL;

-- **ولا تفرّد عالمي على «external_id» إطلاقاً.** أبٌ واحد يتابع ثلاثة
-- أبناء مرضى بحسابٍ واحد — ثلاثة صفوف نشطة بنفس المعرّف ومرضى مختلفين،
-- وهي الحالة الطبيعية لا الاستثناء.
CREATE INDEX IF NOT EXISTS idx_patient_contacts_external
  ON patient_contacts (channel, external_id);
CREATE INDEX IF NOT EXISTS idx_patient_contacts_patient
  ON patient_contacts (patient_id);

-- ── تذاكر الربط المؤقّتة ──────────────────────────────────────────────────
-- الرابط الذي يُعطى للمريض لمرّة واحدة. **لا يُخزَّن نصّه إطلاقاً** — بصمته
-- وحدها. فتسريب نسخة القاعدة لا يعطي أحداً رابطاً صالحاً.
CREATE TABLE IF NOT EXISTS patient_link_tokens (
  id                      BIGSERIAL PRIMARY KEY,
  patient_id              INTEGER NOT NULL
                          CONSTRAINT patient_link_tokens_patient_id_patients_id_fk
                          REFERENCES patients(id),
  channel                 TEXT NOT NULL,
  -- الصلة تُحسم هنا وتُنسَخ إلى جهة الاتصال عند الاستهلاك.
  relation                TEXT NOT NULL,
  -- SHA-256 للنصّ الأصلي. فريد عالمياً: تذكرتان بنفس البصمة تعنيان تصادم
  -- عشوائية، وهو ما يجب أن يُرفَض لا أن يُقبَل.
  --
  -- والقيد مُسمّى صراحةً: UNIQUE المجرّدة تعطيه اسم Postgres الافتراضي
  -- (..._token_hash_key) بينما .unique() في Drizzle تتوقّع (..._unique).
  -- الاسمان يصفان القيد نفسه، لكن drizzle-kit يقارن بالاسم — فيرى فرقاً
  -- دائماً ويحاول إعادة بناء القيد في كل db:push. نفس عائلة فخّ PR #194.
  token_hash              TEXT NOT NULL
                          CONSTRAINT patient_link_tokens_token_hash_unique UNIQUE,
  expires_at              TIMESTAMPTZ NOT NULL,
  consumed_at             TIMESTAMPTZ,
  -- مَن استهلكها فعلاً — نصّ كما في جهة الاتصال، وللتدقيق لا للربط.
  consumed_by_external_id TEXT,
  revoked_at              TIMESTAMPTZ,
  created_by_user_id      INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_link_tokens_patient
  ON patient_link_tokens (patient_id);
-- التذاكر المعلَّقة: غير مستهلَكة وغير مسحوبة. تُقرأ لعرض «رابط قائم»
-- ولتنظيف المنتهية.
CREATE INDEX IF NOT EXISTS idx_patient_link_tokens_pending
  ON patient_link_tokens (expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
`;
