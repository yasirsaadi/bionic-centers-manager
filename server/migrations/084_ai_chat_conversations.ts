// **سجلُّ محادثات المساعد — جدولٌ جديد، إضافيٌّ بالكامل.**
// (قرارُ المالك ٢٠٢٦-٠٩-٢١.)
//
// ══ ⚠ هذا يعكس قاعدةً موثَّقة، ولا يصحّحُ سهواً ══════════════════════════
// القسمُ ٤.n يقول بالحرف: «**ولا محادثةٌ عادية تُحفَظ أبداً** (كما كانت
// دائماً) — فقط لحظةَ تقديم اقتراحٍ صريح تُحفَظ لقطةُ ذلك التبادل». كان ذلك
// قراراً مقصوداً يومَه. وسأل المالكُ صراحةً: «اين المشكلة ان حفظناها بقاعدة
// البيانات واقرا مايكتبه الموظفون؟» ثمّ قرّر الحفظ. **فالعكسُ معلَنٌ بقرار
// صاحب النظام، ومَن يقرأ هذا الملفّ لاحقاً لا يظنّه انحرافاً يُعاد.**
//
// ══ صفٌّ لكلّ تبادل، لا لكلّ محادثة ═════════════════════════════════════
// نقطةُ `/api/ai/chat` تستقبل التاريخَ كاملاً في كلّ طلب (`slice(-10)`)،
// فحفظُه كلِّه يكرّر الرسائلَ القديمة صفّاً بعد صفّ. فيُحفَظ **التبادلُ
// الواحد**: آخرُ سؤالِ المستخدم وجوابُه. و`conversation_id` (تسكّه الشاشةُ
// عند فتح الدرج) يجمع صفوفَ الجلسة الواحدة في خيط — **تجميعٌ لا هويّة**:
// القراءةُ تُرشَّح بـ`user_id` من الجلسة، فمعرّفٌ ملفَّق لا يبلغ صفَّ غيره.
//
// ══ ومفاتيحُه إلى `system_users`/`branches` لا إلى `patients` ═════════════
// **فالقاعدةُ الملزمة في القسم ٨ لا تنطبق**: لا مفتاحَ أجنبيّاً إلى
// `patients` ولا إلى أحد توابعها، فلا شأنَ لكاسكيد `deletePatient` به ولا
// لقرارات `mergePatients`. (تُحقِّق منه المراجعةُ صراحةً — لا يُفترَض.)
//
// ══ والأسماءُ لقطاتٌ لا `join` ═══════════════════════════════════════════
// `user_name`/`user_role`/`branch_name` — درسُ `medical_exams.doctor_name`
// بحرفه: السجلُّ يبقى مقروءاً بعد تغيير اسم الحساب أو دوره أو حذفه.
// والمفتاحان الأجنبيّان يبقيان للنزاهة، واللقطةُ للقراءة.
//
// ══ والمحوُ بعد تسعين يوماً — بالكرون، والنافذةُ تُفرَض عند القراءة أيضاً ══
// `server/ai/conversations/cleanup.ts` يمحو الصفوفَ التي تجاوزت النافذة
// (بـ`WHERE` صريح، ولا `DELETE` بلا شرطٍ أبداً). **ولا يُبنى وعدُ الاحتفاظ
// على نجاح الكرون**: القراءةُ ترشّح بالنافذة نفسِها، فصفٌّ تجاوزها لا يُعرَض
// ولو بقي في الجدول.
//
// ══ وبلا `DROP` ولا `DELETE` ولا `UPDATE` ═══════════════════════════════
// جدولٌ جديد وثلاثةُ فهارس لا أكثر، idempotent، ولا مسٍّ لترحيلٍ من ٠٠١
// إلى ٠٨٣. والنسخةُ الليلية (`server/backup.ts`) **لا تُمَسّ بحرف** — هي
// قائمةُ أعمدةٍ مكتوبةٌ يدوياً من خمسة جداول، فجدولٌ جديد لا يبلغ بريداً.

export const name = "084_ai_chat_conversations";

export const sql = `
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id               SERIAL PRIMARY KEY,
  conversation_id  TEXT,
  user_id          INTEGER NOT NULL REFERENCES system_users(id),
  user_name        TEXT NOT NULL,
  user_role        TEXT,
  branch_id        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  branch_name      TEXT,
  mode             TEXT NOT NULL,
  page_path        TEXT,
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  tool_names       JSONB,
  knowledge_ids    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--  == وحذفُ فرعٍ لا يُحبَس بهذا السجلّ (مراجعةٌ آلية على #٣٧٢) ===========
--  storage.deleteBranch يحذف تابعيه الستّة ثمّ الفرعَ نفسَه، **ولا يعرف
--  هذا الجدول** ولا يلتقط ٢٣٥٠٣. فمفتاحٌ بـNO ACTION كان يجعل حذفَ فرعٍ
--  تحادث فيه أحدٌ يوماً **يفشل بنصّ Postgres خامّ على وجه المستخدم**.
--
--  وSET NULL هو الصوابُ هنا بعينه لا مجرّد مخرَج: branch_name **لقطةُ
--  نصٍّ** أصلاً بحكم تصميم هذا الجدول (٤.ag) — فالصفُّ يبقى مقروءاً كما
--  كُتب، ويسقط الرقمُ وحده. **والحذفُ (CASCADE) كان سيمحو سجلّاً وُضع
--  ليُقرأ، وإضافتُه إلى قائمة deleteBranch كذلك.**
--
--  والكتلةُ أدناه لصفٍّ قائم: قاعدةٌ طُبّق عليها الترحيلُ قبل هذا التصحيح
--  تحمل المفتاحَ القديم، وCREATE TABLE IF NOT EXISTS لا تصلحه. تُقرأ
--  confdeltype فإن لم تكن n (أي SET NULL) يُعاد بناءُ المفتاح وحده —
--  **ولا صفَّ يُمَسّ ولا عمودَ ولا جدول**.
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
    FROM pg_constraint
   WHERE conrelid = 'ai_chat_conversations'::regclass
     AND contype = 'f'
     AND confrelid = 'branches'::regclass
     AND confdeltype <> 'n'
   LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ai_chat_conversations DROP CONSTRAINT %I', cname);
    ALTER TABLE ai_chat_conversations
      ADD CONSTRAINT ai_chat_conversations_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE ai_chat_conversations IS
  'سجل محادثات المساعد — صف لكل تبادل (سؤال وجوابه). قرار المالك 2026-09-21 يعكس قاعدة «لا محادثة تحفظ» في القسم 4.n. الاحتفاظ 90 يوما. خارج النسخة الاحتياطية البريدية.';

COMMENT ON COLUMN ai_chat_conversations.conversation_id IS
  'معرف تجميع تسكه الشاشة عند فتح الدرج — ليس هوية ولا اذنا. القراءة ترشح بـuser_id من الجلسة.';

--  ══ «محادثاتي» — الأحدثُ أوّلاً لمستخدمٍ بعينه ═════════════════════════
CREATE INDEX IF NOT EXISTS idx_ai_chat_conv_user
  ON ai_chat_conversations (user_id, created_at DESC, id DESC);

--  ══ «كلُّ المحادثات» للمسؤول العام، والمحوُ بالنافذة ══════════════════
CREATE INDEX IF NOT EXISTS idx_ai_chat_conv_created
  ON ai_chat_conversations (created_at DESC, id DESC);

--  ══ خيطُ محادثةٍ واحدة — جزئيٌّ: الصفُّ بلا معرّفٍ لا موضعَ له هنا ═════
CREATE INDEX IF NOT EXISTS idx_ai_chat_conv_thread
  ON ai_chat_conversations (user_id, conversation_id, id)
  WHERE conversation_id IS NOT NULL;
`;
