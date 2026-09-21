//  طبقةُ بيانات سجلّ محادثات المساعد (ترحيل ٠٨٤).
//
//  ══ ⚠ يعكس قاعدةً موثَّقة بقرار المالك (٢٠٢٦-٠٩-٢١) ══════════════════════
//  القسمُ ٤.n يقول «**ولا محادثةٌ عادية تُحفَظ أبداً**». سأل المالكُ لماذا،
//  ثمّ قرّر الحفظ ليقرأ ما يكتبه الموظّفون. **فالعكسُ معلَن.** ولا يعني ذلك
//  ارتخاءَ ما حوله: سطرُ `audit_log` يبقى بلا نصّ كما كان بحرفه، والنسخةُ
//  الليلية لا تمسّ هذا الجدول.
//
//  ══ وحفظُ المحادثة لا يجوز أن يُضيّع جواباً ═════════════════════════════
//  `recordExchange` تُنادى **بعد** أن يُبنى الردُّ وبلا `await` عليه في مسار
//  الطلب: فشلُ كتابةٍ في السجلّ لا يعني أن الموظّف يفقد إجابتَه. وهذا نفسُ
//  حدّ `logAudit` القائم في النقطة نفسِها («أطلق وانسَ»).
//
//  ══ والقراءةُ مرشَّحةٌ بالنافذة دائماً ═════════════════════════════════
//  وعدُ «تسعين يوماً» لا يُبنى على نجاح كرونٍ ليليّ: كلُّ قراءةٍ هنا تُرشَّح
//  بـ`retentionCutoff`، فصفٌّ تجاوز النافذة **لا يُعرَض ولو بقي في الجدول**.

import { and, desc, eq, getTableColumns, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { aiChatConversations } from "@shared/schema";
import {
  AI_CHAT_SAVED_ANSWER_MAX, AI_CHAT_SAVED_QUESTION_MAX,
  cappedText, pageFromRows, retentionCutoff, sanitizeConversationId,
  type ConversationCursor,
} from "@shared/ai_conversations";

export interface ExchangeInput {
  conversationId: unknown;
  userId: number;
  userName: string | null;
  userRole: string | null;
  branchId: number | null;
  branchName: string | null;
  mode: string;
  pagePath: string | null;
  question: unknown;
  answer: unknown;
  toolNames: string[];
  knowledgeIds: number[];
}

/**
 *  الصفُّ **كما يصل العميل**.
 *
 *  ══ ولا `toolNames` فيه — أسماءٌ تقنيةٌ داخلية ═══════════════════════════
 *  (مراجعةٌ آلية على #٣٧٢، ٢٠٢٦-٠٩-٢١.) العمودُ يبقى في القاعدة ويكتبه
 *  `recordExchange` كما هو للتدقيق، **لكنّه لا يُسلَّم لمتصفّح**: `patient_lookup`
 *  و`financial_summary` وأخواتُها أسماءُ أدواتٍ داخلية، و`POST /api/ai/chat`
 *  يُسقطها عمداً من ردّه (`const { tools: _rawTools, ...clientSafe }`) فلا
 *  يصل العميلَ إلّا `toolsUsed` المُترجَمة عربياً — «والاسمُ الخامّ لا يصل
 *  العميل إطلاقاً بعد اليوم» (القسم ٤.n). فسجلُّ المحادثات لا يجوز أن يصير
 *  البابَ الخلفيّ لما أُغلق هناك، **ولا شاشةَ من الاثنتين تقرؤه أصلاً**.
 */
export interface ConversationRow {
  id: number;
  conversationId: string | null;
  userId: number;
  userName: string;
  userRole: string | null;
  branchId: number | null;
  branchName: string | null;
  mode: string;
  pagePath: string | null;
  question: string;
  answer: string;
  knowledgeIds: number[];
  createdAt: Date;
}

/** لقطةُ الآن — معامِلٌ صريح ليبقى الاختبارُ قادراً على تثبيت الزمن. */
function nowOr(now?: Date): Date {
  return now ?? new Date();
}

/**
 *  **يحفظ تبادلاً واحداً.** يُرجع `false` صامتاً على أيّ فشل — لأنّ مُنادِيه
 *  يكون قد سلّم الجوابَ للموظّف فعلاً، وإسقاطُ الطلب لأجل سجلٍّ يضيّع عملاً
 *  وقع. والفشلُ يُطبَع في سجلّ الخادم كي لا يُبتلَع صامتاً تماماً.
 *
 *  **ولا يُحفَظ تبادلٌ فارغ**: سؤالٌ أو جوابٌ خالٍ يعني أنّ لا شيءَ يُقرأ —
 *  وصفٌّ بنصٍّ فارغ ضجيجٌ في شاشة المسؤول لا سجلّ.
 */
export async function recordExchange(input: ExchangeInput): Promise<boolean> {
  const question = cappedText(input.question, AI_CHAT_SAVED_QUESTION_MAX).trim();
  const answer = cappedText(input.answer, AI_CHAT_SAVED_ANSWER_MAX).trim();
  if (!question || !answer) return false;
  if (!Number.isInteger(input.userId) || input.userId <= 0) return false;

  try {
    await db.insert(aiChatConversations).values({
      conversationId: sanitizeConversationId(input.conversationId),
      userId: input.userId,
      //  **الاسمُ لقطةٌ لا `join`** — ويبقى مقروءاً بعد تغيير الحساب أو
      //  حذفه. وغيابُه يُقال «مستخدم #رقم» لا يُترَك فارغاً (العمود
      //  `NOT NULL`، والفراغُ يجعل الصفَّ بلا صاحبٍ يُقرأ).
      userName: (input.userName ?? "").trim() || `مستخدم #${input.userId}`,
      userRole: input.userRole ?? null,
      branchId: input.branchId ?? null,
      branchName: input.branchName ?? null,
      mode: input.mode,
      pagePath: input.pagePath ?? null,
      question,
      answer,
      toolNames: input.toolNames.length ? input.toolNames : null,
      knowledgeIds: input.knowledgeIds.length ? input.knowledgeIds : null,
    });
    return true;
  } catch (e: any) {
    //  **بلا نصِّ السؤال ولا الجواب في السجلّ** — الفشلُ يُقال، والمحتوى لا
    //  يُسكَب في مخرجات الخادم.
    console.error("[AiChatLog] failed to record exchange:", e?.message ?? e);
    return false;
  }
}

/** صفحةٌ مقروءة: صفوفُها ومؤشّرُ ما بعدها (`null` = لا مزيد). */
export interface ConversationPage {
  rows: ConversationRow[];
  nextCursor: string | null;
}

/**
 *  **شرطُ «أقدمُ من هذا الحدّ»** — مقارنةُ صفٍّ مركَّبة `(created_at, id)`،
 *  وهي بعينها مفاتيحُ الفهرسين القائمين وترتيبُهما، فتُخدَم بلا فرز.
 *
 *  و`id` في الحدّ الثاني ضروريّ لا زينة: ختمان متساويان (دفعةٌ كُتبت في
 *  الملّي ثانية نفسِها) كانا سيُعيدان الصفَّ نفسَه إلى الأبد بمقارنةٍ على
 *  الختم وحده — أو يقفزان عنه. **وبلا مؤشّرٍ لا شرطَ إطلاقاً** فتبقى
 *  الصفحةُ الأولى كما كانت بحرفها.
 */
function olderThan(cursor: ConversationCursor | null | undefined) {
  if (!cursor) return [];
  //  **والحدُّ يُبنى بحسابٍ صحيحٍ دقيق لا بـ`Date`**: `'epoch'` مضافاً إليه
  //  عددُ ميكروثانياتٍ صحيح يُنتج الختمَ بعينه بلا كسرٍ ضائع — فالصفُّ الذي
  //  جاء منه المؤشّرُ يُستبعَد بالضبط، ولا يُستبعَد معه جارُه في الملّي
  //  ثانية نفسِها. (ولو مرّ عبر `Date` لقُصّ الكسرُ فاختفى ذلك الجار.)
  const bound = sql`TIMESTAMPTZ 'epoch' + ${cursor.createdAtUs}::bigint * INTERVAL '1 microsecond'`;
  return [sql`(${aiChatConversations.createdAt}, ${aiChatConversations.id})
    < (${bound}, ${cursor.id}::int)`];
}

/**
 *  ميكروثانياتُ الصفّ منذ المبدأ — **تُحسَب في القاعدة لا في جافاسكربت**،
 *  لأنّ `Date` تقف عند الملّي ثانية فتقصّ الكسرَ صامتاً (راجع شرحَ
 *  `ConversationCursor`). و`numeric` قبل `bigint` تجعل الحسابَ دقيقاً بلا
 *  عائمٍ مهما كانت نسخةُ Postgres.
 */
const CURSOR_US =
  sql<string>`(EXTRACT(EPOCH FROM ${aiChatConversations.createdAt})::numeric * 1000000)::bigint`;

/** أعمدةُ الجدول كلُّها ومعها قيمةُ المؤشّر — **والأخيرةُ لا تُسلَّم لعميل**. */
const ROW_SELECT = { ...getTableColumns(aiChatConversations), cursorUs: CURSOR_US };

/**
 *  **ويُبنى الصفُّ بحقولٍ صريحة** — فقيمةُ المؤشّر الداخلية (`cursorUs`)
 *  لا تتسرّب إلى العميل مع الصفوف: المؤشّرُ يُسلَّم مرّةً واحدة في
 *  `nextCursor` مبهماً، ولا يُبنى عليه شكلُ شاشة. **و`toolNames` تُترَك هنا
 *  عمداً** — العمودُ محفوظٌ في القاعدة ولا يُسلَّم لعميل (راجع
 *  `ConversationRow`). والبناءُ الصريح هو ما يجعل الإسقاطَ حقيقةً لا نيّة:
 *  نسخٌ بـ`...r` كان سيُعيدهما الاثنين بلا أن ينتبه أحد.
 */
function toRow(r: any): ConversationRow {
  return {
    id: r.id,
    conversationId: r.conversationId ?? null,
    userId: r.userId,
    userName: r.userName,
    userRole: r.userRole ?? null,
    branchId: r.branchId ?? null,
    branchName: r.branchName ?? null,
    mode: r.mode,
    pagePath: r.pagePath ?? null,
    question: r.question,
    answer: r.answer,
    knowledgeIds: Array.isArray(r.knowledgeIds) ? r.knowledgeIds : [],
    createdAt: r.createdAt,
  };
}

/**
 *  **«محادثاتي»** — صفوفُ هذا المستخدم وحده، الأحدثُ أوّلاً، داخل النافذة.
 *
 *  الترشيحُ بـ`userId` **من الجلسة** لا من الطلب — فلا معرّفٌ في جسمٍ أو
 *  استعلامٍ يفتح صفوفَ غيره.
 */
export async function listMyConversations(
  userId: number, limit: number, now?: Date, cursor?: ConversationCursor | null,
): Promise<ConversationPage> {
  const rows = await db.select(ROW_SELECT).from(aiChatConversations)
    .where(and(
      eq(aiChatConversations.userId, userId),
      gte(aiChatConversations.createdAt, retentionCutoff(nowOr(now))),
      ...olderThan(cursor),
    ))
    .orderBy(desc(aiChatConversations.createdAt), desc(aiChatConversations.id))
    //  **صفٌّ زائدٌ واحد هو الدليلُ على وجود تالٍ** — فلا `COUNT(*)` ثانٍ
    //  على كلّ نداء، ولا ادّعاءَ «لا مزيد» لصفحةٍ امتلأت بالمصادفة.
    .limit(limit + 1);
  const page = pageFromRows(rows, limit);
  return { rows: page.rows.map(toRow), nextCursor: page.nextCursor };
}

/**
 *  **«كلُّ المحادثات» — للمسؤول العام وحده** (الحارسُ في النقطة، وهذه
 *  الدالّةُ لا تُنادى من مسارٍ آخر). ترشيحٌ اختياريّ بمستخدمٍ بعينه.
 */
export async function listAllConversations(
  opts: { limit: number; userId?: number | null; now?: Date; cursor?: ConversationCursor | null },
): Promise<ConversationPage> {
  const conds = [gte(aiChatConversations.createdAt, retentionCutoff(nowOr(opts.now)))];
  if (typeof opts.userId === "number") conds.push(eq(aiChatConversations.userId, opts.userId));
  conds.push(...olderThan(opts.cursor));
  const rows = await db.select(ROW_SELECT).from(aiChatConversations)
    .where(and(...conds))
    .orderBy(desc(aiChatConversations.createdAt), desc(aiChatConversations.id))
    .limit(opts.limit + 1);
  const page = pageFromRows(rows, opts.limit);
  return { rows: page.rows.map(toRow), nextCursor: page.nextCursor };
}

/**
 *  **خيطُ محادثةٍ واحدة** — بمعرّف التجميع، **ومرشَّحٌ بصاحبه دائماً**.
 *
 *  `ownerId` يُمرَّر `null` للمسؤول العام وحده (من النقطة)، وغيرُه يمرّر
 *  رقمَ نفسِه. فمعرّفُ محادثةٍ لزميلٍ لا يفتح شيئاً لمن ليس مسؤولاً — وهذا
 *  هو ما يجعل معرّفَ التجميع **تجميعاً لا إذناً**.
 */
export async function getConversationThread(
  conversationId: string, ownerId: number | null, now?: Date,
): Promise<ConversationRow[]> {
  const conds = [
    eq(aiChatConversations.conversationId, conversationId),
    gte(aiChatConversations.createdAt, retentionCutoff(nowOr(now))),
  ];
  if (typeof ownerId === "number") conds.push(eq(aiChatConversations.userId, ownerId));
  const rows = await db.select().from(aiChatConversations)
    .where(and(...conds))
    .orderBy(aiChatConversations.id)
    .limit(200);
  return rows.map(toRow);
}

/** أسماءُ مَن لهم محادثاتٌ داخل النافذة — لمرشِّح شاشة المسؤول وحدها. */
export async function listConversationUsers(
  now?: Date,
): Promise<{ userId: number; userName: string; count: number }[]> {
  const rows = await db.select({
    userId: aiChatConversations.userId,
    userName: sql<string>`MAX(${aiChatConversations.userName})`,
    count: sql<number>`COUNT(*)::int`,
  }).from(aiChatConversations)
    .where(gte(aiChatConversations.createdAt, retentionCutoff(nowOr(now))))
    .groupBy(aiChatConversations.userId)
    .orderBy(desc(sql`COUNT(*)`));
  return rows.map((r) => ({ userId: r.userId, userName: r.userName, count: Number(r.count) }));
}

/**
 *  **المحوُ بعد النافذة** — `DELETE` **بشرطٍ صريح دائماً**، ولا حذفَ بلا
 *  `WHERE` أبداً (القسم ٨ من `CLAUDE.md`). ويُرجع عددَ ما مُحي ليُسجَّل.
 */
export async function purgeExpiredConversations(now?: Date): Promise<number> {
  const res: any = await db.delete(aiChatConversations)
    .where(lt(aiChatConversations.createdAt, retentionCutoff(nowOr(now))));
  return Number(res?.rowCount ?? 0);
}
