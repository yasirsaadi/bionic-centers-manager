// طبقةُ بيانات المعرفة الموثوقة — القراءةُ للمساعد، والكتابةُ للمسؤول
// العام وحده عبر دورة حياة الاقتراحات.
//
// ══ نمط `Tx` — الكاتبُ القانونيّ مرّةً، غلافٌ رقيق فوقه ══════════════════
// `createArticleTx`/`editArticleTx` تأخذان معاملة المُستدعي — نفسُ نمط
// `startDeviceEpisodeTx` القائم في هذا المستودع. `approveSuggestion` تفتح
// معاملةً واحدة وتناديهما داخلها، فقرارُ الاعتماد وكتابةُ المقالة يقعان
// معاً أو لا يقع شيء. و`createArticle`/`editArticle` غلافان يفتحان
// معاملتهما الخاصّة لمن يناديهما مباشرة (نقطة الإنشاء المباشر من لوحة
// المسؤول، لا عبر اقتراح).
//
// ══ لا حذفَ أبداً — حالةٌ تتغيّر ═══════════════════════════════════════════
// تعديلُ مقالةٍ فعّالة **لا يكتب فوق صفّها**: يُنشئ صفّاً جديداً
// (`supersedesId` يشير للقديم) ويُطفئ القديم (`isActive=false`). ورفضُ
// اقتراحٍ أو اعتمادُه **لا يحذف صفّ الاقتراح** — يُحسَم بعمودَي الحالة
// والقرار، فيبقى سجلّاً كاملاً مقروءاً للأبد (القسم أ، الفقرة ٨).

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { aiKnowledgeArticles, aiKnowledgeSuggestions } from "@shared/schema";
import { logAudit } from "../../accounting/ledger";
import { isCapability, type Capability } from "@shared/ai_capabilities";

export type KnowledgeScope =
  | "general" | "reception" | "medical" | "manufacturing"
  | "physiotherapy" | "finance" | "administration";

/** نفسُ سبع الفئات في `CHECK` الترحيل ٠٧٥ — مصدرٌ واحد يُستورَد لا يُكرَّر. */
export const KNOWLEDGE_SCOPES: readonly KnowledgeScope[] = [
  "general", "reception", "medical", "manufacturing",
  "physiotherapy", "finance", "administration",
];

export function isKnowledgeScope(v: unknown): v is KnowledgeScope {
  return typeof v === "string" && (KNOWLEDGE_SCOPES as readonly string[]).includes(v);
}

/** نفسُ قيدَي `CHECK` الترحيل ٠٧٦ على `content_type` — مصدرٌ واحد. */
export const KNOWLEDGE_CONTENT_TYPES = ["workflow", "troubleshooting"] as const;
export type KnowledgeContentType = (typeof KNOWLEDGE_CONTENT_TYPES)[number];
export function isKnowledgeContentType(v: unknown): v is KnowledgeContentType {
  return typeof v === "string" && (KNOWLEDGE_CONTENT_TYPES as readonly string[]).includes(v);
}

/**
 * تحقّقٌ صارمٌ من جمهور المقالة (٠٧٦، القسم ٢ من مراجعة الإكمال) — **فشلٌ
 * مغلَق**: أيّ عنصرٍ ليس قدرةً حقيقية من `shared/ai_capabilities.ts` يردّ
 * `{ok:false}` بدل تجاهله صامتاً. الغيابُ (`undefined`/`null`) يبقى «بلا
 * قيد» صحيحاً، ومصفوفةٌ فارغة تُطبَّع إلى `null` — **صورةٌ واحدة مخزَّنة**
 * لـ«بلا قيد» لا صورتان (`null` و`[]`) قد تنحرفان لاحقاً في شرطٍ يفحص
 * إحداهما فقط.
 */
export function parseAudience(
  v: unknown,
): { ok: true; value: Capability[] | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (!Array.isArray(v)) return { ok: false };
  if (v.length === 0) return { ok: true, value: null };
  if (!v.every((x) => isCapability(x))) return { ok: false };
  return { ok: true, value: Array.from(new Set(v as Capability[])) };
}

/** مَن يكتب — من الجلسة دائماً، لا من جسم الطلب. */
export interface Actor {
  userId: number | null;
  name: string | null;
  role?: string | null;
  branchId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ١. القراءةُ للاسترجاع — ما يراه المساعد فعلاً ═════════════════════════
// ═══════════════════════════════════════════════════════════════════════

export interface ActiveArticleRow {
  id: number;
  title: string;
  body: string;
  scope: string;
  branchId: number | null;
}

/**
 * شرطُ نطاق الفرع — **نفسُ قاعدة `operationalBranches` حرفياً** في بقيّة
 * أدوات المساعد: `null` (المسؤول) يرى كلّ شيء، مصفوفةٌ فارغة لا ترى شيئاً
 * (لا حتى المقالات العامّة — جلسةٌ بلا فرعٍ محسوم حالةٌ مكسورة أصلاً، ولا
 * تُميَّز هنا عن بقيّة الأدوات)، وإلّا مقالاتُ الفرع + المقالات العامّة
 * (`branch_id IS NULL`) معاً.
 */
function branchScopeCondition(operationalBranches: number[] | null) {
  if (operationalBranches === null) return sql`TRUE`;
  if (operationalBranches.length === 0) return sql`FALSE`;
  return sql`(${aiKnowledgeArticles.branchId} IS NULL OR ${aiKnowledgeArticles.branchId} IN (${sql.join(
    operationalBranches.map((b) => sql`${b}`), sql`, `,
  )}))`;
}

/**
 * شرطُ الجمهور — **إضافيٌّ فوق قاعدة `scope` القديمة، لا بديلٌ عنها**
 * (القسم I من مهمّة ٠٧٦).
 *
 * `audience IS NULL` (كلّ مقالات ٠٧٥ وما قبلها) ⟶ لا فلترةَ إضافية، السلوكُ
 * القديم بالحرف. وإلّا: تقاطعٌ — `?|` عاملُ jsonb «يحوي أيّاً من» — بين
 * مصفوفة الجمهور المخزَّنة وقدرات الجلسة، أو أن يحوي الجمهورُ `general`
 * صراحةً (مقالةٌ مُقيَّدةٌ بجمهورٍ لكنها تريد فتح بابٍ عامّاً أيضاً).
 */
function audienceCondition(capabilities: readonly Capability[]) {
  const capsArray = sql.join(capabilities.map((c) => sql`${c}`), sql`, `);
  return sql`(${aiKnowledgeArticles.audience} IS NULL
    OR ${aiKnowledgeArticles.audience} ?| ARRAY[${capsArray}]
    OR ${aiKnowledgeArticles.audience} @> '["general"]'::jsonb)`;
}

/**
 * كلُّ المقالات **الفعّالة** الواقعة ضمن نطاق هذا المستخدم — **قبل**
 * الترشيح بالسؤال، لا بعده.
 *
 * ══ ولماذا فئتان مستبعَدتان بشرط لا بدور ═════════════════════════════════
 * «المال ليس بابه المعرفة» (القسم ب من المهمّة): مقالاتُ `finance` لا
 * تصل من ليس في الوضع الماليّ فعلاً، ومقالاتُ `administration` لا تصل
 * لمن لا يملك سلطةً إدارية — بصرف النظر عمّا يسأله، فالحجبُ هنا حجبُ
 * **معرفةٍ عن سياقٍ إداريّ/ماليّ حسّاس**، لا حجبَ إجابةٍ عن سؤالٍ بعينه.
 *
 * ══ و`capabilities` — طبقةٌ ثانية اختيارية (٠٧٦) ═══════════════════════
 * قدراتُ الجلسة (`shared/ai_capabilities.ts`) تُفحَص **أيضاً** عبر
 * `audienceCondition` — لا تحلّ محلّ فحص `finance`/`administration` أعلاه،
 * بل تضيف تصفيةً أدقّ لمقالاتٍ وسمها المسؤولُ بجمهورٍ محدَّد (تدريبٌ في
 * الغالب). مقالةٌ بلا `audience` (كلّ ما قبل ٠٧٦) لا تتأثّر بهذا الشرط.
 */
export async function listActiveArticlesInScope(params: {
  operationalBranches: number[] | null;
  allowFinance: boolean;
  allowAdministration: boolean;
  capabilities: readonly Capability[];
}): Promise<ActiveArticleRow[]> {
  const excludedScopes: string[] = [];
  if (!params.allowFinance) excludedScopes.push("finance");
  if (!params.allowAdministration) excludedScopes.push("administration");

  const rows = await db.select({
    id: aiKnowledgeArticles.id, title: aiKnowledgeArticles.title,
    body: aiKnowledgeArticles.body, scope: aiKnowledgeArticles.scope,
    branchId: aiKnowledgeArticles.branchId,
  }).from(aiKnowledgeArticles)
    .where(and(
      eq(aiKnowledgeArticles.isActive, true),
      branchScopeCondition(params.operationalBranches),
      excludedScopes.length
        ? sql`${aiKnowledgeArticles.scope} NOT IN (${sql.join(excludedScopes.map((s) => sql`${s}`), sql`, `)})`
        : sql`TRUE`,
      audienceCondition(params.capabilities),
    ));
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٢. إدارةُ المقالات — للمسؤول العام وحده ═══════════════════════════════
// ═══════════════════════════════════════════════════════════════════════

export interface ArticleAdminRow extends ActiveArticleRow {
  seedKey: string | null;
  isActive: boolean;
  version: number;
  supersedesId: number | null;
  /** جمهورُ القدرات (٠٧٦) — `null` = بلا قيدٍ إضافيّ فوق `scope`. */
  audience: Capability[] | null;
  contentType: KnowledgeContentType;
  createdByName: string;
  approvedByName: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
}

function toAdminRow(r: typeof aiKnowledgeArticles.$inferSelect): ArticleAdminRow {
  const audience = Array.isArray(r.audience)
    ? (r.audience as unknown[]).filter((x): x is Capability => isCapability(x))
    : null;
  return {
    id: r.id, title: r.title, body: r.body, scope: r.scope, branchId: r.branchId,
    seedKey: r.seedKey, isActive: r.isActive, version: r.version, supersedesId: r.supersedesId,
    audience: audience && audience.length ? audience : null,
    contentType: isKnowledgeContentType(r.contentType) ? r.contentType : "workflow",
    createdByName: r.createdByName, approvedByName: r.approvedByName,
    approvedAt: r.approvedAt.toISOString(), createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** كلُّ نسخة من كلّ مقالة — للوحة المسؤول، **الأحدثُ إنشاءً أوّلاً**. */
export async function listArticlesForAdmin(): Promise<ArticleAdminRow[]> {
  const rows = await db.select().from(aiKnowledgeArticles).orderBy(desc(aiKnowledgeArticles.id));
  return rows.map(toAdminRow);
}

interface ArticleWriteParams {
  title: string;
  body: string;
  scope: KnowledgeScope;
  branchId: number | null;
  actor: Actor;
  /**
   * ══ إنشاءٌ vs تعديل — معنيان مختلفان لغياب الحقل (القسم ٢، مراجعةُ
   * الإكمال) ══════════════════════════════════════════════════════════════
   * **إنشاءٌ** (`createArticleTx`): الغيابُ = الافتراض (`audience: null`،
   * `contentType: "workflow"`). **تعديلٌ** (`editArticleTx`): الغيابُ =
   * **وراثةٌ** من المقالة الحالية — تعديلُ صياغةٍ لا يجوز أن يُسقط قيداً
   * موجوداً بصمت لمجرّد أن المسؤول لم يُعِد إرسال الحقل. فحضورُ الحقل هنا
   * (ولو بقيمة `null` صريحة لمسح القيد) يعني «غيّره»، وغيابُه (`undefined`)
   * يعني «اتركه كما هو» — والمنادي (نقاط REST) هو مَن يقرّر أيَّهما بتضمين
   * المفتاح في هذا الكائن من عدمه، لا بقيمته.
   */
  audience?: Capability[] | null;
  contentType?: KnowledgeContentType;
}

/** الكاتبُ القانونيّ — إنشاءُ مقالةٍ جديدة من الصفر (نسخةٌ أولى). */
export async function createArticleTx(tx: any, params: ArticleWriteParams): Promise<ArticleAdminRow> {
  const audience = params.audience ?? null;
  const contentType = params.contentType ?? "workflow";
  const [row] = await tx.insert(aiKnowledgeArticles).values({
    title: params.title.trim(),
    body: params.body.trim(),
    scope: params.scope,
    branchId: params.branchId,
    audience,
    contentType,
    isActive: true,
    version: 1,
    supersedesId: null,
    createdBy: params.actor.userId,
    createdByName: params.actor.name ?? "—",
    approvedBy: params.actor.userId,
    approvedByName: params.actor.name ?? "—",
  }).returning();
  await logAudit({
    entityType: "ai_knowledge_article", entityId: row.id, action: "create",
    userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
    newValues: {
      title: row.title, scope: row.scope, branchId: row.branchId, version: row.version,
      audience: row.audience, contentType: row.contentType,
    },
    ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
  });
  return toAdminRow(row);
}

export async function createArticle(params: ArticleWriteParams): Promise<ArticleAdminRow> {
  return db.transaction((tx: any) => createArticleTx(tx, params));
}

/**
 * الكاتبُ القانونيّ — تعديلُ مقالةٍ قائمة: **نسخةٌ جديدة، لا كتابةٌ فوق
 * القديمة**. يُقفَل صفّها أوّلاً (`FOR UPDATE`) فلا تعديلان متزامنان
 * يُنتجان نسختين متفرّعتين من الأصل نفسه.
 *
 * ══ حدٌّ زمنيّ لانتظار القفل — لا انتظارَ أبديّ (تصحيحٌ إنتاجيّ) ═══════════
 * «FOR UPDATE» بلا مهلة كانت تُعلّق الطلبَ إلى الأبد إن كان صفٌّ آخر يحمل
 * قفلاً عليه (تعديلٌ متزامنٌ آخر لنفس المقالة، أو معاملةٌ عالقة في مكانٍ
 * آخر) — فيبقى زرّ «حفظ» في الواجهة على «جارٍ الحفظ...» بلا نجاحٍ ولا خطأ
 * أبداً، لأن الخادم نفسه لم يُجب بعد. `SET LOCAL lock_timeout` يقتصر على
 * هذه المعاملة وحدها (يُنسى تلقائياً عند COMMIT/ROLLBACK، فلا أثرَ خارج هذا
 * الاستدعاء ولا حاجةَ لإعادة ضبطه)، والالتقاطُ أدناه يُترجم رمز بوستغرس
 * `55P03` (`lock_not_available`) إلى ردٍّ عربيّ واضح بدل الانتظار الأبديّ.
 *
 * **ومُثبَتٌ حيّاً أن هذا لا يُفسد المعاملة**: PostgreSQL يعامل `COMMIT` على
 * معاملةٍ أُجهضت بخطأ (كهذا) كأنه `ROLLBACK` صامت — فالعودةُ بـ`{ok:false}`
 * هنا بدل رمي الخطأ لا تكتب شيئاً جزئياً، والقفل والمعاملة الموصوفان أعلاه
 * باقيان بحرفهما — لم يتغيّر شكلُ `FOR UPDATE` ولا شرطُه.
 */
export async function editArticleTx(
  tx: any, params: ArticleWriteParams & { id: number },
): Promise<{ ok: true; article: ArticleAdminRow } | { ok: false; error: string }> {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  try {
    await tx.execute(sql`SELECT 1 FROM ai_knowledge_articles WHERE id = ${params.id} FOR UPDATE`);
  } catch (err: any) {
    if (err?.code === "55P03") {
      return { ok: false, error: "المقالة قيد التعديل من مكانٍ آخر الآن — أعد المحاولة بعد قليل" };
    }
    throw err;
  }
  const [current] = await tx.select().from(aiKnowledgeArticles)
    .where(eq(aiKnowledgeArticles.id, params.id));
  if (!current) return { ok: false, error: "المقالة غير موجودة" };
  if (!current.isActive) {
    return { ok: false, error: "لا يمكن تعديل مقالةٍ غير فعّالة — فعّلها أولاً أو أنشئ مقالةً جديدة" };
  }

  //  ══ الوراثةُ — غيابُ الحقل هنا يعني «لا تُغيّره»، لا «امسحه» ══════════
  //  (القسم ٢، مراجعةُ الإكمال) مقالةٌ موسومةٌ `audience:["finance"]` لا
  //  يجوز أن تصير بلا قيدٍ لمجرّد أن المسؤول عدّل صياغةً أو اعتمد اقتراحاً
  //  دون أن يمرّ صراحةً بحقلَي الجمهور/النوع — فتُورَث القيمةُ الحالية.
  const nextAudienceRaw = params.audience !== undefined ? params.audience : current.audience;
  const nextAudience = Array.isArray(nextAudienceRaw)
    ? (nextAudienceRaw as unknown[]).filter((x): x is Capability => isCapability(x))
    : null;
  const nextContentType = params.contentType !== undefined
    ? params.contentType
    : (isKnowledgeContentType(current.contentType) ? current.contentType : "workflow");

  const [next] = await tx.insert(aiKnowledgeArticles).values({
    title: params.title.trim(),
    body: params.body.trim(),
    scope: params.scope,
    branchId: params.branchId,
    audience: nextAudience && nextAudience.length ? nextAudience : null,
    contentType: nextContentType,
    isActive: true,
    version: current.version + 1,
    supersedesId: current.id,
    //  المؤلّفُ الأصليّ يبقى — التعديل تصحيحٌ إداريّ لا تأليفٌ جديد.
    createdBy: current.createdBy,
    createdByName: current.createdByName,
    approvedBy: params.actor.userId,
    approvedByName: params.actor.name ?? "—",
  }).returning();

  await tx.update(aiKnowledgeArticles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(aiKnowledgeArticles.id, current.id));

  await logAudit({
    entityType: "ai_knowledge_article", entityId: next.id, action: "edit",
    userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
    oldValues: {
      id: current.id, title: current.title, version: current.version,
      audience: current.audience, contentType: current.contentType,
    },
    newValues: {
      title: next.title, scope: next.scope, version: next.version, supersedesId: next.supersedesId,
      audience: next.audience, contentType: next.contentType,
    },
    ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
  });

  return { ok: true, article: toAdminRow(next) };
}

export async function editArticle(
  params: ArticleWriteParams & { id: number },
): Promise<{ ok: true; article: ArticleAdminRow } | { ok: false; error: string }> {
  return db.transaction((tx: any) => editArticleTx(tx, params));
}

/**
 * تفعيلٌ/تعطيلٌ — بلا نسخةٍ جديدة، فقط تبديلُ الحالة.
 *
 * **والتعطيلُ حرٌّ دائماً** — حتى لآخر نسخةٍ في سلسلتها؛ فالمسؤول قد يريد
 * سحب مقالةٍ خاطئة كلّياً بلا استبدال. **أمّا التفعيلُ فمحروسٌ**: إن كانت
 * لهذه المقالة نسخةٌ أحدث (صفٌّ آخر `supersedesId`-ه يساوي هذا المعرّف)
 * فتفعيلُها يُنتج نسختين فعّالتين معاً من نفس السلسلة — فيُردّ صراحةً.
 */
export async function setArticleActive(params: {
  id: number; active: boolean; actor: Actor;
}): Promise<{ ok: true; article: ArticleAdminRow } | { ok: false; error: string }> {
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM ai_knowledge_articles WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(aiKnowledgeArticles)
      .where(eq(aiKnowledgeArticles.id, params.id));
    if (!current) return { ok: false, error: "المقالة غير موجودة" };

    if (params.active && !current.isActive) {
      const [newer] = await tx.select({ id: aiKnowledgeArticles.id }).from(aiKnowledgeArticles)
        .where(eq(aiKnowledgeArticles.supersedesId, current.id)).limit(1);
      if (newer) {
        return { ok: false, error: "توجد نسخةٌ أحدث من هذه المقالة — عدِّل النسخة الأحدث بدل إعادة تفعيل القديمة" };
      }
    }

    if (current.isActive === params.active) {
      return { ok: true, article: toAdminRow(current) }; // لا تغيير — لا حاجة لكتابةٍ ولا تدقيق
    }

    const [row] = await tx.update(aiKnowledgeArticles)
      .set({ isActive: params.active, updatedAt: new Date() })
      .where(eq(aiKnowledgeArticles.id, params.id))
      .returning();

    await logAudit({
      entityType: "ai_knowledge_article", entityId: row.id, action: params.active ? "activate" : "deactivate",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      newValues: { isActive: row.isActive },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, article: toAdminRow(row) };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٣. اقتراحاتُ الموظّفين — تقديمٌ حرّ، حسمٌ للمسؤول العام وحده ══════════
// ═══════════════════════════════════════════════════════════════════════

export interface SuggestionRow {
  id: number;
  submittedBy: number;
  submittedByName: string;
  submittedByRole: string | null;
  branchId: number | null;
  submittedAt: string;
  sourceQuestion: string | null;
  sourceAnswer: string | null;
  referencedArticleIds: number[] | null;
  suggestedText: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  resultingArticleId: number | null;
}

function toSuggestionRow(r: typeof aiKnowledgeSuggestions.$inferSelect): SuggestionRow {
  const ids = Array.isArray(r.referencedArticleIds)
    ? (r.referencedArticleIds as unknown[]).filter((x): x is number => typeof x === "number")
    : null;
  return {
    id: r.id, submittedBy: r.submittedBy, submittedByName: r.submittedByName,
    submittedByRole: r.submittedByRole, branchId: r.branchId,
    submittedAt: r.submittedAt.toISOString(),
    sourceQuestion: r.sourceQuestion, sourceAnswer: r.sourceAnswer,
    referencedArticleIds: ids && ids.length ? ids : null,
    suggestedText: r.suggestedText, reason: r.reason,
    status: r.status as SuggestionRow["status"],
    decidedBy: r.decidedBy, decidedByName: r.decidedByName,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    decisionNote: r.decisionNote, resultingArticleId: r.resultingArticleId,
  };
}

/**
 * **إرسالُ اقتراح — لا يمسّ المعرفة الفعّالة بحرف.** أيّ موظّفٍ مصادَق
 * يستطيع هذا (لا شرط صلاحيةٍ إضافي)، وناتجُه صفٌّ `pending` وحده.
 */
export async function createSuggestion(params: {
  suggestedText: string;
  reason: string;
  sourceQuestion?: string | null;
  sourceAnswer?: string | null;
  referencedArticleIds?: number[] | null;
  actor: Actor;
}): Promise<SuggestionRow> {
  if (!params.actor.userId) throw new Error("suggestion requires an authenticated system user");
  const refs = (params.referencedArticleIds ?? []).filter((n) => Number.isInteger(n) && n > 0);
  const [row] = await db.insert(aiKnowledgeSuggestions).values({
    submittedBy: params.actor.userId,
    submittedByName: params.actor.name ?? "—",
    submittedByRole: params.actor.role ?? null,
    branchId: params.actor.branchId ?? null,
    sourceQuestion: params.sourceQuestion?.trim() || null,
    sourceAnswer: params.sourceAnswer?.trim() || null,
    referencedArticleIds: refs.length ? refs : null,
    suggestedText: params.suggestedText.trim(),
    reason: params.reason.trim(),
  }).returning();
  //  ══ سجلُّ الاقتراح نفسُه هو الأثرُ التدقيقيّ الكامل (لا يُحذف أبداً) ══
  //  فسطرُ audit_log هنا خفيفٌ عمداً: مَن قدّم ومتى، بلا نسخِ نصّ السؤال/
  //  الجواب/الاقتراح إلى جدولٍ ثانٍ — نفسُ مبدأ تقليل البيانات في سطر
  //  `ai_chat` (لا نصّ محادثةٍ يُؤرشَف مرّتين).
  await logAudit({
    entityType: "ai_knowledge_suggestion", entityId: row.id, action: "submit",
    userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
    newValues: { hasSourceQuestion: Boolean(row.sourceQuestion), referencedCount: refs.length },
    ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null,
  });
  return toSuggestionRow(row);
}

export async function listSuggestions(status?: "pending" | "approved" | "rejected"): Promise<SuggestionRow[]> {
  const rows = status
    ? await db.select().from(aiKnowledgeSuggestions)
      .where(eq(aiKnowledgeSuggestions.status, status)).orderBy(desc(aiKnowledgeSuggestions.id))
    : await db.select().from(aiKnowledgeSuggestions).orderBy(desc(aiKnowledgeSuggestions.id));
  return rows.map(toSuggestionRow);
}

/**
 * **رفضٌ** — بسببٍ إلزاميّ، بلا مسٍّ للمعرفة الفعّالة. الصفُّ يبقى، حالتُه
 * وحدها تتغيّر.
 */
export async function rejectSuggestion(params: {
  id: number; decisionNote: string; actor: Actor;
}): Promise<{ ok: true; suggestion: SuggestionRow } | { ok: false; error: string }> {
  if (!params.decisionNote.trim()) return { ok: false, error: "سببُ الرفض إلزاميّ" };
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM ai_knowledge_suggestions WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(aiKnowledgeSuggestions)
      .where(eq(aiKnowledgeSuggestions.id, params.id));
    if (!current) return { ok: false, error: "الاقتراح غير موجود" };
    if (current.status !== "pending") return { ok: false, error: "هذا الاقتراح مَحسومٌ من قبل" };

    const [row] = await tx.update(aiKnowledgeSuggestions).set({
      status: "rejected",
      decidedBy: params.actor.userId,
      decidedByName: params.actor.name ?? "—",
      decidedAt: new Date(),
      decisionNote: params.decisionNote.trim(),
      updatedAt: new Date(),
    }).where(eq(aiKnowledgeSuggestions.id, params.id)).returning();

    await logAudit({
      entityType: "ai_knowledge_suggestion", entityId: row.id, action: "reject",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      newValues: { status: "rejected" },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, suggestion: toSuggestionRow(row) };
  });
}

/**
 * **اعتمادٌ** — يقرّر المسؤول: مقالةٌ جديدة كلّياً، أو نسخةٌ جديدة لمقالةٍ
 * قائمة (`targetArticleId`). **معاملةٌ واحدة**: يفشل الاعتمادُ فلا شيءَ
 * يُكتب — لا مقالة ولا نسخة ولا تغييرَ حالة.
 *
 * النصُّ النهائيّ **يُختار صراحةً لا يُشتقّ ضمناً**: `body` إن أرسله
 * المسؤول (عدّل صياغة الموظّف)، وإلّا نصُّ الاقتراح كما كتبه الموظّف
 * بالحرف — فلا فرقَ خفيّاً بين «اعتمدتُه كما هو» و«نسيت أن أملأ الحقل».
 */
export async function approveSuggestion(params: {
  id: number;
  targetArticleId?: number | null;
  title?: string;
  body?: string;
  scope?: KnowledgeScope;
  branchId?: number | null;
  /** غيابُهما ⟶ وراثةٌ عند تعديل مقالةٍ قائمة، افتراضٌ عند إنشاء واحدةٍ جديدة. */
  audience?: Capability[] | null;
  contentType?: KnowledgeContentType;
  actor: Actor;
}): Promise<
  | { ok: true; suggestion: SuggestionRow; article: ArticleAdminRow }
  | { ok: false; error: string }
> {
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM ai_knowledge_suggestions WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(aiKnowledgeSuggestions)
      .where(eq(aiKnowledgeSuggestions.id, params.id));
    if (!current) return { ok: false, error: "الاقتراح غير موجود" };
    if (current.status !== "pending") return { ok: false, error: "هذا الاقتراح مَحسومٌ من قبل" };

    const finalBody = (params.body ?? current.suggestedText).trim();
    if (!finalBody) return { ok: false, error: "نصُّ المقالة لا يمكن أن يكون فارغاً" };

    let articleResult: { ok: true; article: ArticleAdminRow } | { ok: false; error: string };
    if (params.targetArticleId) {
      const [target] = await tx.select().from(aiKnowledgeArticles)
        .where(eq(aiKnowledgeArticles.id, params.targetArticleId));
      if (!target) return { ok: false, error: "المقالةُ المستهدَفة غير موجودة" };
      articleResult = await editArticleTx(tx, {
        id: params.targetArticleId,
        title: params.title ?? target.title,
        body: finalBody,
        scope: (params.scope ?? target.scope) as KnowledgeScope,
        branchId: params.branchId !== undefined ? params.branchId : target.branchId,
        //  ══ وراثةٌ افتراضية — نفسُ `editArticleTx` بالحرف ══
        //  اعتمادُ اقتراحٍ يعدّل صياغةَ مقالةٍ موسومةٍ بجمهورٍ أو نوعٍ محدَّد
        //  **لا يُسقطهما** إلّا أن يُمرّرهما المسؤولُ صراحةً في طلب الاعتماد.
        audience: params.audience, contentType: params.contentType,
        actor: params.actor,
      });
    } else {
      if (!params.title?.trim()) return { ok: false, error: "عنوانُ المقالة إلزاميّ عند إنشاء مقالةٍ جديدة" };
      if (!params.scope) return { ok: false, error: "نطاقُ المقالة إلزاميّ عند إنشاء مقالةٍ جديدة" };
      const article = await createArticleTx(tx, {
        title: params.title.trim(), body: finalBody, scope: params.scope,
        branchId: params.branchId ?? null,
        audience: params.audience, contentType: params.contentType,
        actor: params.actor,
      });
      articleResult = { ok: true, article };
    }
    if (!articleResult.ok) return articleResult;

    const [row] = await tx.update(aiKnowledgeSuggestions).set({
      status: "approved",
      decidedBy: params.actor.userId,
      decidedByName: params.actor.name ?? "—",
      decidedAt: new Date(),
      decisionNote: null,
      resultingArticleId: articleResult.article.id,
      updatedAt: new Date(),
    }).where(eq(aiKnowledgeSuggestions.id, params.id)).returning();

    await logAudit({
      entityType: "ai_knowledge_suggestion", entityId: row.id, action: "approve",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      newValues: { status: "approved", resultingArticleId: articleResult.article.id },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });

    return { ok: true, suggestion: toSuggestionRow(row), article: articleResult.article };
  });
}
