//  سجلُّ محادثات المساعد — القواعدُ الخالصة (**بلا قاعدة بيانات ولا شبكة**).
//
//  ══ ⚠ قرارُ المالك ٢٠٢٦-٠٩-٢١ **يعكس** قاعدةً موثَّقة ═══════════════════
//  القسمُ ٤.n يقول بالحرف: «**ولا محادثةٌ عادية تُحفَظ أبداً**» — كان ذلك
//  قراراً مقصوداً يومَه (خصوصيّةُ محتوى العيادة). وسأل المالكُ صراحةً: «اين
//  المشكلة ان حفظناها بقاعدة البيانات واقرا مايكتبه الموظفون؟» ثمّ قرّر
//  الحفظ. فهذا **عكسٌ معلَن لا سهوٌ** — والقاعدةُ الأمنيةُ الباقية حولها
//  كما هي: النسخةُ الليلية لا تمسّ هذا الجدول، ولا سطرَ تدقيقٍ يحمل نصّاً.
//
//  ══ ولماذا هنا لا في الخادم ═════════════════════════════════════════════
//  درسُ ٤.u بحرفه: المشروعُ بلا مشغّل DOM وبلا مشغّل اختباراتٍ يحقن الطلبات،
//  فقرارٌ مدفونٌ في معالج نقطةٍ لا يُختبَر إلّا بقراءة نصِّه — وقراءةُ النصّ
//  لا تُمسك انقلاباً في المعنى يعود بصياغةٍ أخرى. فالقرارُ دالّةٌ خالصة
//  تُختبَر دخلاً وخرجاً، ويستوردها الخادمُ والشاشةُ معاً — **ولا نسخةَ ثانية.**

/** المدّة: **تسعون يوماً** ثمّ يُمحى الصفّ (قرارُ المالك ٢٠٢٦-٠٩-٢١). */
export const AI_CHAT_RETENTION_DAYS = 90;

/**
 *  **سقفُ السؤال والجواب المحفوظين.**
 *
 *  سؤالُ المستخدم مقصوصٌ أصلاً عند ٢٠٠٠ حرفٍ في نقطة `/api/ai/chat` قبل أن
 *  يبلغ النموذج — فالسقفُ هنا مطابقٌ له عمداً: ما يُحفَظ هو **ما رآه
 *  المساعدُ فعلاً**، لا نصٌّ أطولُ لم يُعرَض عليه. والجوابُ أوسعُ لأنه يُولَد
 *  ولا يُقصّ في المسار.
 */
export const AI_CHAT_SAVED_QUESTION_MAX = 2000;
export const AI_CHAT_SAVED_ANSWER_MAX = 20000;

/** لقطةُ جلسةٍ بالقدر الذي تحتاجه قرارات هذا الملفّ — لا أكثر. */
export interface ConversationSessionLike {
  isAdmin?: boolean | null;
  role?: string | null;
  userId?: number | null;
}

/**
 *  **مَن يقرأ محادثاتِ الجميع: المسؤولُ العام وحده.**
 *
 *  **ولا `branch_manager`** — وهذا قياسٌ على معرفة المساعد (٤.n) لا اختراعٌ:
 *  «قرارُ معرفة المساعد للمسؤول العام حصراً»، والمحادثاتُ أحسَسُ منها (فيها
 *  نصُّ ما كتبه الموظّف). ومديرُ الفرع سلطتُه تشغيليةٌ في نطاقه، وقراءةُ ما
 *  يكتبه موظّفوه للمساعد ليست من ذلك النطاق.
 *
 *  **ولا يُقاس بالفرع إطلاقاً**: نطاقُ الفرع يحرس بياناتِ المرضى، وهذا حرسُ
 *  محتوى موظّفين — فلو فُتح «كلُّ فرعي» لصار لكلّ مديرٍ نافذةٌ على ما يكتبه
 *  فريقُه، وهو ما لم يطلبه أحد.
 */
export function canReadAllConversations(
  s: ConversationSessionLike | null | undefined,
): boolean {
  return s?.isAdmin === true;
}

/**
 *  **ومَن يقرأ محادثاتِه هو: كلُّ موظّفٍ مصادَق.**
 *
 *  الشرطُ الوحيد أن يكون له رقمُ مستخدمٍ حقيقيّ — فبلا هويّةٍ لا «محادثاتي»
 *  أصلاً، ولا يُقرأ الغيابُ صفراً فيُسلَّم صفوفُ مستخدمٍ آخر (`Number(null)`
 *  تساوي صفراً لا `NaN` — درسُ ٤.u بحرفه).
 */
export function canReadOwnConversations(
  s: ConversationSessionLike | null | undefined,
): boolean {
  return typeof s?.userId === "number" && Number.isInteger(s.userId) && s.userId > 0;
}

/**
 *  **معرّفُ المحادثة — تجميعٌ لا هويّة.**
 *
 *  تسكّه الشاشةُ عند فتح الدرج فتنتمي رسائلُ الجلسة الواحدة إلى خيطٍ واحد
 *  (`closeDrawer` يصفّره، فكلّ فتحةٍ محادثةٌ جديدة كما هي اليوم). **والإذنُ
 *  لا يُبنى عليه أبداً**: القراءةُ تُرشَّح بـ`user_id` من الجلسة، فمعرّفٌ
 *  ملفَّق من عميلٍ خبيث لا يبلغ صفَّ أحدٍ غيره — أقصى أثره أن يخلط خيوطَ
 *  صاحبه هو. ولذلك يُقبَل نصّاً معقولاً ولا يُردّ الطلبُ لأجله: **ضياعُ
 *  تجميعٍ أهونُ من ضياع جوابٍ للموظّف**.
 */
export const AI_CHAT_CONVERSATION_ID_MAX = 64;

export function sanitizeConversationId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  //  حروفُ المعرّفات وحدها — `crypto.randomUUID` وما يشبهه. ونصٌّ غريب
  //  يُقرأ «بلا تجميع» لا يُكتب كما وصل.
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(t)) return null;
  return t;
}

/** قصٌّ آمن: نصٌّ غيرُ نصّيّ يصير فارغاً، والطويلُ يُقصّ عند سقفه. */
export function cappedText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.length > max ? v.slice(0, max) : v;
}

/**
 *  **آخرُ رسالةِ مستخدمٍ في التاريخ المُرسَل — هي السؤال.**
 *
 *  النقطةُ تستقبل التاريخَ كاملاً في كلّ طلب (`messages.slice(-10)`)، فلو
 *  حُفظ كلُّه لتكرّرت الرسائلُ القديمة صفّاً بعد صفّ. فيُحفَظ **التبادلُ
 *  الواحد**: آخرُ ما كتبه المستخدم، والجوابُ عليه.
 */
export function lastUserQuestion(
  history: { role?: string | null; content?: unknown }[] | null | undefined,
): string {
  if (!Array.isArray(history)) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m?.role === "assistant") continue;
    const t = cappedText(m?.content, AI_CHAT_SAVED_QUESTION_MAX);
    if (t.trim()) return t;
  }
  return "";
}

/**
 *  **حدُّ النافذة — يُفرَض عند القراءة أيضاً، لا عند المحو وحده.**
 *
 *  المحوُ كرونٌ يوميّ قد يتأخّر أو يتعطّل؛ وعدُ «تسعين يوماً» يجب أن يصدق
 *  في كلّ لحظة. فالقراءةُ تُرشَّح بالنافذة نفسِها: صفٌّ تجاوزها **لا يُعرَض
 *  ولو بقي في الجدول**. (والمحوُ يبقى ليحرّر المساحة ويصدق الوعدَ فيزيائياً.)
 */
export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - AI_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** أقصى ما تُرجعه صفحةُ قائمة — سقفٌ في الخادم لا يُؤخَذ من العميل. */
export const AI_CHAT_PAGE_SIZE = 50;

/** حجمُ صفحةٍ مطلوبٌ من العميل: يُقصَر على السقف، والمشوَّه يسقط للافتراضيّ. */
export function boundedPageSize(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return AI_CHAT_PAGE_SIZE;
  return Math.min(n, AI_CHAT_PAGE_SIZE);
}

// ═══════════════════════════════════════════════════════════════════════
// ══ مؤشّرُ الصفحة — «عرض المزيد» يبلغ أقدمَ صفٍّ داخل النافذة ═══════════
// ═══════════════════════════════════════════════════════════════════════
//
//  **الواقعة** (مراجعةٌ آلية على #٣٧٢): السقفُ ٥٠ صفّاً وحده بلا مؤشّر،
//  فموظّفٌ تجاوز الخمسين — أو عيادةٌ كاملةٌ في شاشة المسؤول — يبقى أقدمُه
//  محفوظاً تسعين يوماً **ولا سبيلَ إلى قراءته** من الشاشة التي وُعد بها.
//
//  ══ ولماذا مؤشّرُ مفتاحٍ لا `OFFSET` ═══════════════════════════════════
//  الترتيبُ `created_at DESC, id DESC`، والصفوفُ تُضاف **في الرأس** كلّما
//  تحادث أحد. فـ`OFFSET 50` بعد إضافةِ صفَّين يعيد صفَّين سبق أن قُرئا
//  ويقفز عن غيرهما. والمؤشّرُ بالمفتاح مناعةٌ من ذلك بالبناء، **وهو
//  ترتيبُ الفهرسين القائمين حرفاً بحرف** (`idx_ai_chat_conv_user` و
//  `idx_ai_chat_conv_created`) فيُخدَم بلا فرز.
//
//  **وصيغتُه مبهمةٌ للعميل**: نصٌّ واحد لا رقمان، فلا تُبنى عليه شاشةٌ
//  تفترض شكلَه ثمّ ينكسر حين يتغيّر. والمشوَّهُ يُقرأ **غياباً** (أوّلُ
//  صفحة) لا خطأً — مؤشّرٌ بائتٌ من تبويبٍ قديم يُعيد الصفحةَ الأولى، وهو
//  أهونُ من شاشةٍ فارغة بخطأ.

/**
 *  حدُّ صفّ: ختمُه الزمنيّ ومعرّفُه — الترتيبُ نفسُه الذي يقرأ به الفهرس.
 *
 *  **وبالميكروثانية لا بالملّي ثانية — وهذا شرطُ صحّةٍ لا دقّةٍ زائدة.**
 *  `created_at` عمودُ `TIMESTAMPTZ` دقّتُه ميكروثانية، و`Date` في جافاسكربت
 *  تقف عند الملّي ثانية. فمؤشّرٌ مأخوذٌ من `Date.getTime()` **يقصّ الكسر
 *  صامتاً**، فيصير الحدُّ أقدمَ من الصفّ الذي جاء منه: صفٌّ في الملّي ثانية
 *  نفسِها لكن بميكروثانيةٍ أكبر يسقط من **كلتا** الصفحتين — لا الأولى تعرضه
 *  (هو بعدها في الترتيب) ولا الثانية (ليس «أقدمَ» من الحدّ المقصوص).
 *
 *  أمسكه الاختبارُ الحيُّ فعلاً: اثنا عشرَ صفّاً كُتبت في المصفوفة نفسِها،
 *  فبلغت القراءةُ أحدَ عشر — وصفٌّ واحدٌ اختفى بلا أن يقول أحدٌ شيئاً.
 *
 *  **ولذلك تُقرأ القيمةُ من SQL لا من `Date`**: العددُ ميكروثانيةً منذ
 *  المبدأ، حسابُه في الخادم بحسابٍ صحيحٍ دقيق (`numeric` ثمّ `bigint`).
 *  و٩٫٠٠٧×١٠¹⁵ ميكروثانية تبلغ سنة ٢٢٥٥ تقريباً — فالعددُ يبقى آمناً في
 *  جافاسكربت (`Number.isSafeInteger`) طوال عمر هذا النظام.
 */
export interface ConversationCursor {
  createdAtUs: number;
  id: number;
}

/** صفٌّ ⟶ مؤشّرٌ مبهم. `"<us>.<id>"` — تفصيلٌ داخليّ لا يعتمد عليه عميل. */
export function encodeConversationCursor(c: ConversationCursor): string {
  return `${c.createdAtUs}.${c.id}`;
}

/**
 *  مؤشّرٌ مبهم ⟶ حدُّ صفّ، **والمشوَّهُ `null` (أوّلُ صفحة) لا خطأ**.
 *
 *  ويُشترَط الشكلُ كاملاً: رقمان صحيحان موجبان مفصولان بنقطةٍ واحدة. فنصٌّ
 *  غريبٌ أو سالبٌ أو كسريّ أو بجزءٍ ثالث لا يُقرأ نصفَ مؤشّر.
 */
export function decodeConversationCursor(v: unknown): ConversationCursor | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  const m = /^(\d+)\.(\d+)$/.exec(t);
  if (!m) return null;
  const createdAtUs = Number(m[1]);
  const id = Number(m[2]);
  if (!Number.isSafeInteger(createdAtUs) || createdAtUs <= 0) return null;
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return { createdAtUs, id };
}

/**
 *  **صفحةٌ من صفوفٍ جُلبت بـ`limit + 1`** — الزائدُ هو الدليلُ على وجود
 *  تالٍ، فلا يحتاج الأمرُ `COUNT(*)` ثانياً على كلّ نداء.
 *
 *  فإن جاء `limit + 1` صفّاً: يُعاد `limit` منها ومعها مؤشّرُ آخرِ صفٍّ
 *  **مُعاد** (لا المحذوف)، وإلّا `nextCursor = null` صراحةً — «لا مزيد».
 */
export function pageFromRows<T extends { id: number; cursorUs: string | number }>(
  rows: readonly T[], limit: number,
): { rows: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { rows: [...rows], nextCursor: null };
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  //  `bigint` يصل من `node-postgres` نصّاً — فيُحوَّل صراحةً، ولا يُفترَض
  //  رقماً. والقيمةُ التي لا تصلح مؤشّراً تُقرأ «لا مزيد» بدل أن تُنتج
  //  مؤشّراً كاذباً يقفز عن صفوف.
  const us = Number(last.cursorUs);
  if (!Number.isSafeInteger(us) || us <= 0) return { rows: page, nextCursor: null };
  return { rows: page, nextCursor: encodeConversationCursor({ createdAtUs: us, id: last.id }) };
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ووصلُ المؤشّر بالشاشة — رابطُ صفحةٍ يُبنى في مكانٍ واحد ═════════════
// ═══════════════════════════════════════════════════════════════════════
//
//  `client/src/lib/queryClient.ts` يبني الرابطَ الافتراضيّ من
//  `queryKey.join("/")` — فلا موضعَ فيه لسلسلة استعلام. ولولا ذلك ما
//  احتاجت الشاشتان `queryFn` صريحة أصلاً؛ **وهو بعينه سببُ أن المؤشّر لم
//  يكن ليصل الخادمَ لو تُرك للافتراضيّ**.
//
//  فالرابطُ يُبنى هنا: دالّةٌ خالصة تُختبَر دخلاً وخرجاً، تستوردها الشاشتان
//  معاً (درج المساعد ولوحة المسؤول) — **ولا نسخةَ ثانية** تنحرف فتُسقط
//  المؤشّرَ من إحداهما صامتاً.

export interface ConversationPageQuery {
  /** موظّفٌ بعينه في شاشة المسؤول. الفراغُ = كلُّ الموظّفين (لا مُعامِل). */
  userId?: string | number | null;
  /** مؤشّرُ «ما بعد هذا». الغيابُ = الصفحةُ الأولى. */
  cursor?: string | null;
}

/**
 *  رابطُ صفحةٍ من السجلّ — **بترتيبِ مُعامِلاتٍ ثابت** (`userId` ثمّ
 *  `cursor`)، فرابطُ نفسِ الطلب واحدٌ دائماً ولا يتشظّى في ذاكرة المتصفّح.
 *
 *  والقيمةُ الفارغة **لا تُرسَل مُعامِلاً فارغاً**: `?userId=` كان الخادمُ
 *  ليقرأه «كلُّ الموظّفين» على كلّ حال، لكنّ رابطاً يحمل فراغاً يوحي بمرشِّحٍ
 *  لم يُختَر. والقيمُ تُرمَّز دائماً (`encodeURIComponent`).
 */
export function conversationsPageUrl(base: string, q?: ConversationPageQuery): string {
  const parts: string[] = [];
  const uid = q?.userId;
  if (uid !== undefined && uid !== null && String(uid).trim() !== "") {
    parts.push(`userId=${encodeURIComponent(String(uid).trim())}`);
  }
  const cur = typeof q?.cursor === "string" ? q.cursor.trim() : "";
  if (cur) parts.push(`cursor=${encodeURIComponent(cur)}`);
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

/** شكلُ ردّ صفحةٍ كما ترسله النقطتان. */
export interface ConversationPageResponse<T> {
  rows?: T[] | null;
  nextCursor?: string | null;
}

/**
 *  مُعامِلُ الصفحة التالية — **`undefined` حين لا مزيد**، وهو المُصطلَح الذي
 *  يقرؤه `useInfiniteQuery` فيُطفئ `hasNextPage`. فزرُّ «عرض المزيد» يختفي
 *  لأنّ الخادمَ قال إنّ لا تالِيَ، لا لأنّ الشاشةَ خمّنت من عدد الصفوف
 *  (صفحةٌ امتلأت بالمصادفة ليست دليلاً على وجود تالٍ، ولا العكس).
 */
export function nextConversationPageParam(
  page: ConversationPageResponse<unknown> | null | undefined,
): string | undefined {
  const c = typeof page?.nextCursor === "string" ? page.nextCursor.trim() : "";
  return c ? c : undefined;
}

/**
 *  صفوفُ كلّ الصفحات المحمَّلة بترتيبها — **بلا إزالةِ تكرار**: المؤشّرُ
 *  بالمفتاح يجعل الصفحاتِ منفصلةً بالبناء (`(created_at, id) <` حدٌّ صارم)،
 *  وإعادةُ الجلب تعيد اشتقاقَ مؤشّر كلّ صفحةٍ من سابقتها فتبقى منفصلة.
 *  فإزالةُ تكرارٍ هنا كانت ستُخفي انكسارَ ذلك الثابت بدل أن تكشفه.
 */
export function conversationRowsOf<T>(
  pages: readonly (ConversationPageResponse<T> | null | undefined)[] | null | undefined,
): T[] {
  if (!Array.isArray(pages)) return [];
  const out: T[] = [];
  for (const p of pages) {
    if (Array.isArray(p?.rows)) out.push(...(p!.rows as T[]));
  }
  return out;
}
