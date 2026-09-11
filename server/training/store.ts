// تدريبُ الموظّفين — طبقةُ البيانات. القراءةُ تحلّ المعرفةَ الفعّالة حيّاً؛
// الكتابةُ للموظّف العاديّ تقدّمَه هو وحده؛ وبناءُ المسارات والوحدات
// نفسِها للمسؤول العام حصراً (القسم ٣، مراجعةُ إكمال).
//
// ══ لا نسخةَ ثانية من المحاسبة — ولا من **معرفة المقالات** ═══════════════
// هذا الملفّ **لا يكتب مقالةَ معرفةٍ ولا يعدّلها أبداً** — ذاك يبقى حكراً
// على `server/ai/knowledge/store.ts` القائمة، وهذا الملفّ يقرأ نتيجتها فقط
// (`resolveActiveArticles`). أمّا **هيكلُ التدريب** (المساراتُ والوحدات
// التي تُشير إلى تلك المقالات بمعرّفها) فيُكتَب **هنا** بنفس مبدأ «لا نسخةَ
// ثانية»: لا تُنسَخ متونُ المقالات داخل وحدةٍ أبداً — رقمُ المقالة وحده.
//
// ══ الهويّةُ من الجلسة دائماً — لا معرّفَ مستخدمٍ من العميل أبداً ═══════════
// كلُّ دالّةٍ تخصّ تقدّم موظّفٍ تأخذ `access: AiAccessContext` (المشتقّة من
// الجلسة في `server/ai/access.ts`) أو حقولها الدنيا — لا `userId` خامٍ من
// جسم طلبٍ أو وسائط أداة. فإكمالُ وحدةٍ لصالح موظّفٍ آخر مستحيلٌ بنيوياً لا
// بفحصٍ لاحق. ودوالُّ إدارة التدريب (تحت) تأخذ `Actor` — نفسُ نمط
// `server/ai/knowledge/store.ts` — والحارسَ الحقيقيّ (المسؤولُ العام وحده)
// في طبقة النقاط (`routes.ts`)، لا هنا.

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  trainingTracks, trainingModules, employeeTrainingProgress, systemUsers, branches,
  aiKnowledgeArticles,
} from "@shared/schema";
import { audienceMatches, capabilitiesFor, isCapability, type Capability } from "@shared/ai_capabilities";
import {
  gradeAnswer, isQuizSpec, resolveNonQuizResult,
  type ModuleResult, type ProgressStatus, type QuizSpec,
} from "@shared/ai_training";
import { logAudit } from "../accounting/ledger";
import type { AiAccessContext } from "../ai/access";
import type { Actor } from "../ai/knowledge/store";

// ═══════════════════════════════════════════════════════════════════════
// ══ ١. حلّ المعرفة — السلسلةُ الفعّالة حيّاً، لا الرقمُ المخزَّن حرفياً ═══
// ═══════════════════════════════════════════════════════════════════════

/**
 * تُعطى رقمَ مقالةٍ (كما خُزِّن في `training_modules.knowledge_article_ids`
 * وقتَ الزرع أو الإنشاء) وتُرجع **النسخة الفعّالة الحالية من سلسلتها** —
 * ولو عُدِّلت المقالةُ مراراً بعد ذلك. تمشي **أماماً** عبر سلسلة
 * `supersedes_id` (كلّ تعديلٍ يُنشئ صفّاً جديداً يشير `supersedesId`-ه
 * للقديم) حتى تجد الصفَّ الفعّال في السلسلة، أو لا شيء إن أُطفئت السلسلةُ
 * كلُّها (مقالةٌ سُحبت تماماً بلا بديل) — فتُستبعَد من الدرس بصمتٍ بدل أن
 * تُظهر متناً قديماً ميتاً.
 *
 * **مقالاتٌ عامّةٌ فقط (`branch_id IS NULL`) — حارسٌ ضدّ تسرّب فرع**:
 * التدريبُ معرفةُ إجراءٍ لا بياناتِ فرع (`listAccessibleTracks` أدناه
 * تفرض هذا بنيوياً بحذف فحص الفرع أصلاً)، فمقالةٌ خاصّةٌ بفرعٍ بعينه
 * (`ai_knowledge_articles.branch_id`) **لا تُحَلّ هنا مطلقاً** — لو
 * أشارت وحدةُ تدريبٍ إليها يوماً بالخطأ، ترجع `resolveActiveArticle`
 * `null` (كأنّ السلسلة سُحبت) بدل أن تُسرّب متن فرعٍ لموظّفي كلّ الفروع.
 * والشرطُ داخل الـCTE نفسِه فيقطع السلسلةَ من نقطة الانحراف لا يُصفّي
 * النتيجةَ النهائية فقط — نسخةٌ عامّةٌ لاحقة في نفس السلسلة تبقى تُحَلّ.
 *
 * ══ دفاعٌ في العمق — قيودُ المقالة **نفسِها**، لا قيودُ المسار وحدها
 * (القسم ٧، مراجعةُ الإكمال) ═══════════════════════════════════════════
 * `getModuleLesson`/`submitTrainingAnswer` يفحصان جمهورَ **المسار**، وهذا
 * كافٍ ما دامت الوحدةُ تشير دائماً إلى مقالةٍ من نفس نطاق مسارها — لكنّه
 * ليس ضماناً بنيوياً. فمسارٌ عامُّ الجمهور يشير خطأً إلى مقالةٍ `scope:
 * finance` أو `audience:["finance"]` كان سيُسرّب محتواها لمن لا يملك
 * القدرة المالية. فيُعاد هنا **نفسُ فحص النطاق** الذي يحرس الاسترجاعَ
 * العاديّ (`server/ai/knowledge/retrieval.ts: retrieveKnowledge`) — لا
 * قاعدةً ثانية: `scope==='finance'` يشترط `mode==='financial'` بعينها،
 * و`scope==='administration'` يشترط `isAdmin || branch_manager` بعينها،
 * ثمّ `audienceMatches` على عمود `audience` نفسِه. **والملغاةُ لا تُعرَض
 * ولا تُفسَّر خطأً برمجياً** — تُستبعَد من الدرس بصمتٍ كأنّ السلسلة سُحبت،
 * فلا يُميَّز الموظّفُ بين «حُذفت المقالة» و«ليست لك».
 */
async function resolveActiveArticle(
  storedId: number, access: AiAccessContext,
): Promise<{ id: number; title: string; body: string } | null> {
  const result = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT id, title, body, scope, audience, is_active, supersedes_id
        FROM ai_knowledge_articles WHERE id = ${storedId} AND branch_id IS NULL
      UNION ALL
      SELECT a.id, a.title, a.body, a.scope, a.audience, a.is_active, a.supersedes_id
        FROM ai_knowledge_articles a
        JOIN chain c ON a.supersedes_id = c.id
       WHERE a.branch_id IS NULL
    )
    SELECT id, title, body, scope, audience FROM chain WHERE is_active = TRUE LIMIT 1
  `);
  const row = (result.rows ?? [])[0] as any;
  if (!row) return null;

  const caps = capabilitiesFor(access);
  //  ══ نفسُ حارسَي `retrieveKnowledge` بالحرف — لا نسخةٌ ثانية تنحرف ══
  const allowFinance = access.mode === "financial";
  const allowAdministration = access.isAdmin || access.role === "branch_manager";
  if (row.scope === "finance" && !allowFinance) return null;
  if (row.scope === "administration" && !allowAdministration) return null;
  const rowAudience = Array.isArray(row.audience) ? (row.audience as string[]) : null;
  if (!audienceMatches(rowAudience, caps)) return null;

  return { id: Number(row.id), title: String(row.title), body: String(row.body) };
}

async function resolveActiveArticles(
  ids: readonly number[], access: AiAccessContext,
): Promise<{ id: number; title: string; body: string }[]> {
  const out: { id: number; title: string; body: string }[] = [];
  for (const id of ids) {
    const resolved = await resolveActiveArticle(id, access);
    if (resolved) out.push(resolved);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٢. الكتالوج — المساراتُ والوحداتُ ضمن جمهور هذه الجلسة ══════════════
// ═══════════════════════════════════════════════════════════════════════

export interface ModuleSummary {
  id: number;
  title: string;
  description: string;
  position: number;
  hasQuiz: boolean;
  practiceOnly: boolean;
  status: ProgressStatus | "not_started";
}

export interface TrackSummary {
  id: number;
  title: string;
  description: string;
  modules: ModuleSummary[];
}

/**
 * المساراتُ **المتاحة لهذه الجلسة بعينها** — تقاطعُ جمهور المسار مع قدرات
 * المستخدم (`shared/ai_capabilities.ts`)، لا كلّ مسارٍ في القاعدة. ومسارٌ
 * لا وحدةَ فعّالة فيه لا يظهر أصلاً (لا صفحةٌ فارغة).
 *
 * **بلا نطاق فرعٍ عمداً**: التدريب معرفةُ إجراءٍ لا بياناتِ فرع — نفسُ
 * جمهور القدرة يراه في أيّ فرع. (خلافاً لتقدّم الإدارة أدناه، الذي **يُقيَّد**
 * بالفرع لأنه بياناتُ موظّفين.)
 */
export async function listAccessibleTracks(access: AiAccessContext): Promise<TrackSummary[]> {
  const caps = capabilitiesFor(access);
  const allTracks = await db.select().from(trainingTracks)
    .where(eq(trainingTracks.isActive, true)).orderBy(asc(trainingTracks.sortOrder));
  const accessible = allTracks.filter((t) =>
    audienceMatches(Array.isArray(t.audience) ? (t.audience as string[]) : null, caps));
  if (accessible.length === 0) return [];

  const trackIds = accessible.map((t) => t.id);
  const modules = await db.select().from(trainingModules)
    .where(and(inArray(trainingModules.trackId, trackIds), eq(trainingModules.isActive, true)))
    .orderBy(asc(trainingModules.position));

  const moduleIds = modules.map((m) => m.id);
  const progressRows = access.userId != null && moduleIds.length > 0
    ? await db.select().from(employeeTrainingProgress)
      .where(and(
        eq(employeeTrainingProgress.userId, access.userId),
        inArray(employeeTrainingProgress.moduleId, moduleIds),
      ))
    : [];
  const statusByModule = new Map<number, ProgressStatus>(
    progressRows.map((p): [number, ProgressStatus] => [p.moduleId, p.status as ProgressStatus]));

  const modulesByTrack = new Map<number, typeof modules>();
  for (const m of modules) {
    const list = modulesByTrack.get(m.trackId) ?? [];
    list.push(m);
    modulesByTrack.set(m.trackId, list);
  }

  return accessible
    .map((t): TrackSummary => ({
      id: t.id, title: t.title, description: t.description,
      //  ══ تعليقُ إرجاعٍ صريح (`: ModuleSummary`) — لا تجميلاً ══
      //  بلا هذا التوصيف يتّسع الاتحاد `ProgressStatus | "not_started"` إلى
      //  `string` خام (تشوّهٌ معروف في TypeScript: نوعُ اتحادٍ حرفيّ مع
      //  `string` يُطوى إلى `string`)، فيفشل التحقّق ضدّ `ModuleSummary`.
      modules: (modulesByTrack.get(t.id) ?? []).map((m): ModuleSummary => ({
        id: m.id, title: m.title, description: m.description, position: m.position,
        hasQuiz: isQuizSpec(m.quiz), practiceOnly: m.practiceOnly,
        status: statusByModule.get(m.id) ?? "not_started",
      })),
    }))
    .filter((t) => t.modules.length > 0);
}

/**
 * أوّلُ وحدةٍ غيرِ منجَزة عبر كلّ المسارات المتاحة، بترتيب المسارات ثم
 * الوحدات — «كمّل تدريبي من آخر مكان» تجيبها هذه الدالّة وحدها بلا تخمين.
 *
 * **«غيرُ منجَزة» = `not_started`/`started`/`needs_review` معاً** — وحدةٌ
 * أخطأ فيها الموظّف اختبارَها **لم تكتمل بعد**، فتبقى في طابور المتابعة حتى
 * يعيد المحاولة وينجح؛ فقط `completed`/`practice_only` تُعَدّان منجَزتين
 * وتُخطَّيان. إسقاطُ `needs_review` من هذا الشرط (كما كان) كان يُخرج الوحدةَ
 * من «كمّل تدريبي» صامتاً بعد أوّل إجابةٍ خاطئة — لا نجاحٌ ولا طابورُ متابعة.
 */
export async function findNextIncompleteModule(
  access: AiAccessContext,
): Promise<{ trackId: number; trackTitle: string; moduleId: number; moduleTitle: string } | null> {
  const tracks = await listAccessibleTracks(access);
  for (const t of tracks) {
    const next = t.modules.find((m) =>
      m.status === "not_started" || m.status === "started" || m.status === "needs_review");
    if (next) return { trackId: t.id, trackTitle: t.title, moduleId: next.id, moduleTitle: next.title };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٣. الدرس — يُبنى من المعرفة الفعّالة حيّاً، وبأثرٍ جانبيّ واحد ضيّق ══
// ═══════════════════════════════════════════════════════════════════════

export interface LessonView {
  moduleId: number;
  trackId: number;
  trackTitle: string;
  title: string;
  description: string;
  learningObjectives: string[];
  lesson: { articleId: number; articleTitle: string; body: string }[];
  /** نصُّ السؤال فقط — **بلا** المفاهيم المطلوبة ولا تلميحاتها إطلاقاً. */
  quizQuestion: string | null;
  practiceOnly: boolean;
  status: ProgressStatus;
}

async function currentProgress(userId: number, moduleId: number) {
  const [row] = await db.select().from(employeeTrainingProgress)
    .where(and(eq(employeeTrainingProgress.userId, userId), eq(employeeTrainingProgress.moduleId, moduleId)));
  return row ?? null;
}

/** لمسةٌ بلا تغيير حالة — وحدةٌ سبق فتحها، لا تُعاد كتابةُ ختم إكمالها. */
async function touchProgress(id: number): Promise<void> {
  await db.update(employeeTrainingProgress)
    .set({ lastAttemptedAt: new Date(), updatedAt: new Date() })
    .where(eq(employeeTrainingProgress.id, id));
}

/**
 * ══ `attemptCount` — يعدّ إجاباتٍ مُرسَلة، لا مرّاتِ فتحٍ (القسم ٤، مراجعةُ
 * الإكمال) ═════════════════════════════════════════════════════════════
 * فتحُ درسٍ (هنا) **لا يُعَدّ محاولة** — الموظّفُ لم يُجب عن شيء بعد، سواءٌ
 * فُتحت وحدةٌ عمليّة/بلا اختبار فاكتملت فوراً، أو وحدةٌ باختبارٍ فبقيت
 * `started`. فيبدأ العدّادُ `0` دائماً هنا، و`submitTrainingAnswer` وحدها
 * ترفعه — أوّل إجابةٍ حقيقية تكتبه `1` لا `2` (كانت `insertProgress` تكتب
 * `1` هنا فتُحتسَب المحاولةُ الأولى الحقيقية `٢`).
 */
async function insertProgress(params: {
  userId: number; trackId: number; moduleId: number; status: ProgressStatus;
  completedAt: Date | null; attemptCount: number;
}): Promise<void> {
  await db.insert(employeeTrainingProgress).values({
    userId: params.userId, trackId: params.trackId, moduleId: params.moduleId,
    status: params.status, attemptCount: params.attemptCount,
    ...(params.completedAt ? { completedAt: params.completedAt } : {}),
  });
}

/**
 * فتحُ وحدة — يحلّ الدرسَ من معرفتها الفعّالة، **ويُبدئ أو يلمس تقدّمَها**
 * بأثرٍ جانبيّ واحد فقط:
 *   - وحدةٌ **بلا اختبار** (أو موسومةٌ `practiceOnly`) ⟶ تُكتَب منجَزةً
 *     فوراً (`completed`/`practice_only`) — لا شيء آخر يُقيَّم بعدها.
 *   - وحدةٌ **باختبار** حقيقيّ ⟶ تبقى `started` حتى يُستدعى تصحيحُ إجابة.
 * وفتحٌ ثانٍ لوحدةٍ منجَزةٍ سلفاً **لا يعيد كتابة ختم إكمالها** — لمسةٌ فقط.
 */
export async function getModuleLesson(params: {
  moduleId: number; access: AiAccessContext;
}): Promise<{ ok: true; lesson: LessonView } | { ok: false; error: string }> {
  const caps = capabilitiesFor(params.access);
  const [moduleRow] = await db.select().from(trainingModules)
    .where(and(eq(trainingModules.id, params.moduleId), eq(trainingModules.isActive, true)));
  if (!moduleRow) return { ok: false, error: "الوحدة غير موجودة" };

  const [trackRow] = await db.select().from(trainingTracks)
    .where(and(eq(trainingTracks.id, moduleRow.trackId), eq(trainingTracks.isActive, true)));
  if (!trackRow) return { ok: false, error: "المسار غير موجود" };
  if (!audienceMatches(Array.isArray(trackRow.audience) ? (trackRow.audience as string[]) : null, caps)) {
    return { ok: false, error: "هذه الوحدة خارج نطاق صلاحيتك" };
  }

  const articleIds = Array.isArray(moduleRow.knowledgeArticleIds)
    ? (moduleRow.knowledgeArticleIds as unknown[]).filter((x): x is number => typeof x === "number")
    : [];
  const lesson = await resolveActiveArticles(articleIds, params.access);
  const quiz = isQuizSpec(moduleRow.quiz) ? (moduleRow.quiz as QuizSpec) : null;
  const objectives = Array.isArray(moduleRow.learningObjectives)
    ? (moduleRow.learningObjectives as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  let status: ProgressStatus = "started";
  if (params.access.userId != null) {
    const existing = await currentProgress(params.access.userId, moduleRow.id);
    if (existing) {
      await touchProgress(existing.id);
      status = existing.status as ProgressStatus;
    } else if (!quiz || moduleRow.practiceOnly) {
      const result: ModuleResult = resolveNonQuizResult(moduleRow.practiceOnly);
      await insertProgress({
        userId: params.access.userId, trackId: trackRow.id, moduleId: moduleRow.id,
        status: result, completedAt: new Date(), attemptCount: 0,
      });
      status = result;
    } else {
      await insertProgress({
        userId: params.access.userId, trackId: trackRow.id, moduleId: moduleRow.id,
        status: "started", completedAt: null, attemptCount: 0,
      });
      status = "started";
    }
  }

  return {
    ok: true,
    lesson: {
      moduleId: moduleRow.id, trackId: trackRow.id, trackTitle: trackRow.title,
      title: moduleRow.title, description: moduleRow.description,
      learningObjectives: objectives,
      lesson: lesson.map((l) => ({ articleId: l.id, articleTitle: l.title, body: l.body })),
      quizQuestion: quiz?.question ?? null,
      practiceOnly: moduleRow.practiceOnly,
      status,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٤. تصحيحُ إجابة — حتميٌّ من مفاهيمَ مخزَّنة، لا برأي النموذج ════════
// ═══════════════════════════════════════════════════════════════════════

export interface SubmitAnswerOutcome {
  result: "completed" | "needs_review";
  matchedCount: number;
  totalConcepts: number;
  /** تلميحاتُ المفاهيم الناقصة فقط — عند `needs_review`، بعد المحاولة لا قبلها. */
  missingHints: string[];
}

/**
 * تصحيحُ إجابة موظّفٍ عن اختبار وحدة — **حتميٌّ بالكامل**
 * (`shared/ai_training.ts: gradeAnswer`)، ويكتب تقدّم **المستخدم صاحب
 * الجلسة وحده** (`access.userId` — لا معرّفَ آخر يُقبل من أيّ مصدر).
 *
 * تُرفَض وحدةٌ بلا اختبار، ووحدةٌ `practiceOnly` (القسم E: لا تصحيحَ آليّاً
 * حيث لا يُؤمَن — تُعرَض تدريباً لا اختباراً).
 */
export async function submitTrainingAnswer(params: {
  moduleId: number; answerText: string; access: AiAccessContext;
  ipAddress?: string | null; userAgent?: string | null;
}): Promise<{ ok: true; outcome: SubmitAnswerOutcome } | { ok: false; error: string }> {
  if (params.access.userId == null) return { ok: false, error: "الجلسة غير صالحة" };
  const answer = String(params.answerText ?? "").trim();
  if (!answer) return { ok: false, error: "الإجابة فارغة" };

  const caps = capabilitiesFor(params.access);
  const [moduleRow] = await db.select().from(trainingModules)
    .where(and(eq(trainingModules.id, params.moduleId), eq(trainingModules.isActive, true)));
  if (!moduleRow) return { ok: false, error: "الوحدة غير موجودة" };

  const [trackRow] = await db.select().from(trainingTracks)
    .where(and(eq(trainingTracks.id, moduleRow.trackId), eq(trainingTracks.isActive, true)));
  if (!trackRow || !audienceMatches(Array.isArray(trackRow.audience) ? (trackRow.audience as string[]) : null, caps)) {
    return { ok: false, error: "هذه الوحدة خارج نطاق صلاحيتك" };
  }
  if (moduleRow.practiceOnly) {
    return { ok: false, error: "هذه وحدةُ تدريبٍ عمليّ بلا تصحيحٍ آليّ — اقرأ الدرس واكتفِ به" };
  }
  const quiz = isQuizSpec(moduleRow.quiz) ? (moduleRow.quiz as QuizSpec) : null;
  if (!quiz) return { ok: false, error: "هذه الوحدة بلا اختبار — اكتفِ بقراءة الدرس والانتقال للتالية" };

  const grade = gradeAnswer(quiz, answer);
  const result: "completed" | "needs_review" = grade.passed ? "completed" : "needs_review";
  const missingHints = grade.missingIndexes.map((i) => quiz.requiredConcepts[i]?.hint ?? "");
  const now = new Date();
  //  ══ `completedAt` يُختم عند النجاح وحده (القسم ٤، مراجعةُ الإكمال) ══
  //  إجابةٌ خاطئة `needs_review` **لا تحمل** ختمَ اكتمال — القيدُ
  //  `etp_completed_shape_check` (ترحيل ٠٧٦ المصحَّح) يفرض هذا في القاعدة
  //  نفسها، فلا صفٌّ يحمل حالةً ناقصة وختمَ اكتمالٍ معاً. وإعادةُ محاولةٍ
  //  بعد نجاحٍ سابق (نادر — لماذا يعيد موظّفٌ اختباراً اجتازه؟) تُصفِّر
  //  `completedAt` إن رسب هذه المرّة: الحالةُ الحقيقية تسود على تاريخها.
  const completedAtValue = result === "completed" ? now : null;

  //  بياناتُ تقييمٍ مدمَجة للتدقيق — لا نصَّ محادثةٍ كامل، ومقتطَفٌ قصير فقط.
  const answerSummary = {
    matchedCount: grade.matchedIndexes.length, totalConcepts: grade.totalConcepts,
    missingHints, answerExcerpt: answer.slice(0, 200),
  };

  const existing = await currentProgress(params.access.userId, moduleRow.id);
  if (existing) {
    await db.update(employeeTrainingProgress).set({
      status: result, answerSummary, completedAt: completedAtValue, lastAttemptedAt: now,
      //  ══ محاولةٌ مُرسَلة فعلياً — أوّلُ إرسالٍ حقيقيّ يرفع العدّاد من ٠
      //  (لا ١، بعد إصلاح `insertProgress`) إلى ١ بالضبط ══
      attemptCount: existing.attemptCount + 1, updatedAt: now,
    }).where(eq(employeeTrainingProgress.id, existing.id));
  } else {
    //  لا صفَّ سابقٍ (إرسالٌ مباشر بلا فتح درسٍ أوّلاً) — هذا الإرسالُ نفسُه
    //  هو المحاولةُ الأولى.
    await db.insert(employeeTrainingProgress).values({
      userId: params.access.userId, trackId: trackRow.id, moduleId: moduleRow.id,
      status: result, answerSummary, attemptCount: 1, completedAt: completedAtValue,
    });
  }

  await logAudit({
    entityType: "employee_training_progress", entityId: moduleRow.id, action: "submit_answer",
    userId: params.access.userId, branchId: params.access.branchId,
    newValues: {
      moduleId: moduleRow.id, trackId: trackRow.id, result,
      matchedCount: answerSummary.matchedCount, totalConcepts: answerSummary.totalConcepts,
    },
    ipAddress: params.ipAddress ?? null, userAgent: params.userAgent ?? null,
  });

  return {
    ok: true,
    outcome: {
      result, matchedCount: grade.matchedIndexes.length, totalConcepts: grade.totalConcepts,
      missingHints: result === "needs_review" ? missingHints : [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٥. عرضُ الإدارة — نطاقٌ صريح، لا استنتاجَ من نصّ محادثة ═══════════════
// ═══════════════════════════════════════════════════════════════════════
//
// ══ الصلاحية (القسم G من المهمّة) ═══════════════════════════════════════
// لا عَلَمَ صلاحيةٍ مخصَّصاً لـ«رؤية تقدّم تدريب الموظّفين» في نظام الصلاحيات
// القائم (تحقَّقنا من كامل أعمدة `system_users` قبل هذا القرار)، واختراعُ
// عَلَمٍ جديد لهذه الميزة وحدها تكلفةٌ غيرُ متناسبة في هذه المرحلة. فأُعيد
// استعمال **نفس** قاعدة «سلطةٍ إدارية» القائمة فعلياً في هذا المستودع لحجب
// المعرفة الإدارية (`allowAdministration` في `server/ai/knowledge/retrieval.ts`،
// حرفياً `isAdmin || role === 'branch_manager'`) — لا قاعدةٌ ثالثة تنحرف
// عنها. **وهذا أضيقُ لا أوسع** من صلاحياتٍ تشغيلية أخرى كـ`canViewReports`؛
// تقدّمُ التدريب بياناتُ أداءٍ عن أشخاص، فالأولى تضييقُها لا توسيعُها.

export interface ManagementModuleProgress {
  moduleId: number; moduleTitle: string; status: ProgressStatus | "not_started";
  lastAttemptedAt: string | null;
}
export interface ManagementTrackProgress {
  trackId: number; trackTitle: string;
  completedModules: number; totalModules: number;
  needsReviewCount: number;
  modules: ManagementModuleProgress[];
}
export interface ManagementEmployeeRow {
  userId: number; displayName: string; branchId: number | null; branchName: string | null;
  tracks: ManagementTrackProgress[];
  lastActivityAt: string | null;
}

export interface ManagementScope {
  isAdmin: boolean;
  role: string | null | undefined;
  /** نفسُ `operationalBranches` — `null` = كلّ الفروع، مصفوفةٌ = محصورةٌ بها. */
  operationalBranches: number[] | null;
}

export async function getManagementTrainingProgress(
  scope: ManagementScope,
): Promise<{ ok: true; rows: ManagementEmployeeRow[] } | { ok: false; error: string }> {
  const isBranchManager = scope.role === "branch_manager";
  if (!scope.isAdmin && !isBranchManager) {
    return { ok: false, error: "عرضُ تقدّم تدريب الموظّفين متاحٌ للمسؤول العام أو مديرِ الفرع ضمن فرعه فقط" };
  }

  //  ══ نطاقُ الموظّفين — **بالفرع الأساسيّ فقط** (تبسيطٌ مُعلَنٌ لا سهو):
  //  موظّفٌ متعدّد الفروع (`branchIds`) خارج فرعه الأساسيّ قد لا يظهر لمديرِ
  //  فرعٍ آخر يشاركه فعلياً — وهذا يُنقِص الظهور لا يُفرِط فيه، فالخطأ
  //  الآمن هنا هو الأضيق لا الأوسع (نفسُ مبدأ «تفضيل أقلّ صلاحية»). ══
  const employees = scope.isAdmin
    ? await db.select().from(systemUsers).where(eq(systemUsers.isActive, true))
    : (scope.operationalBranches && scope.operationalBranches.length > 0
      ? await db.select().from(systemUsers).where(and(
        eq(systemUsers.isActive, true),
        inArray(systemUsers.branchId, scope.operationalBranches),
      ))
      : []);
  if (employees.length === 0) return { ok: true, rows: [] };

  const allBranches = await db.select().from(branches);
  const branchNameById = new Map(allBranches.map((b) => [b.id, b.name]));

  const allTracks = await db.select().from(trainingTracks).where(eq(trainingTracks.isActive, true))
    .orderBy(asc(trainingTracks.sortOrder));
  const allModules = await db.select().from(trainingModules).where(eq(trainingModules.isActive, true))
    .orderBy(asc(trainingModules.position));
  const modulesByTrack = new Map<number, typeof allModules>();
  for (const m of allModules) {
    const list = modulesByTrack.get(m.trackId) ?? [];
    list.push(m);
    modulesByTrack.set(m.trackId, list);
  }

  const userIds = employees.map((e) => e.id);
  const progressRows = await db.select().from(employeeTrainingProgress)
    .where(inArray(employeeTrainingProgress.userId, userIds));
  const progressByUserModule = new Map<string, typeof progressRows[number]>();
  for (const p of progressRows) progressByUserModule.set(`${p.userId}:${p.moduleId}`, p);

  const rows: ManagementEmployeeRow[] = employees.map((emp) => {
    const caps = capabilitiesFor({ isAdmin: emp.role === "admin", role: emp.role, permissions: emp as unknown as Record<string, unknown> });
    const empTracks = allTracks.filter((t) =>
      audienceMatches(Array.isArray(t.audience) ? (t.audience as string[]) : null, caps));

    let lastActivityAt: string | null = null;
    const trackRows: ManagementTrackProgress[] = empTracks.map((t) => {
      const mods = modulesByTrack.get(t.id) ?? [];
      let completed = 0; let needsReview = 0;
      const moduleRows: ManagementModuleProgress[] = mods.map((m) => {
        const p = progressByUserModule.get(`${emp.id}:${m.id}`);
        const status = (p?.status as ProgressStatus | undefined) ?? "not_started";
        if (status === "completed" || status === "practice_only") completed++;
        if (status === "needs_review") needsReview++;
        const lastAttempted = p?.lastAttemptedAt ? p.lastAttemptedAt.toISOString() : null;
        if (lastAttempted && (!lastActivityAt || lastAttempted > lastActivityAt)) lastActivityAt = lastAttempted;
        return { moduleId: m.id, moduleTitle: m.title, status, lastAttemptedAt: lastAttempted };
      });
      return {
        trackId: t.id, trackTitle: t.title,
        completedModules: completed, totalModules: mods.length, needsReviewCount: needsReview,
        modules: moduleRows,
      };
    }).filter((t) => t.totalModules > 0);

    return {
      userId: emp.id, displayName: emp.displayName,
      branchId: emp.branchId, branchName: emp.branchId != null ? (branchNameById.get(emp.branchId) ?? null) : null,
      tracks: trackRows, lastActivityAt,
    };
  });

  return { ok: true, rows };
}

// ═══════════════════════════════════════════════════════════════════════
// ══ ٦. إدارةُ التدريب — إنشاءٌ وتعديلٌ للمسؤول العام وحده (القسم ٣،
// مراجعةُ إكمال) ══════════════════════════════════════════════════════════
//
// ══ لماذا هنا لا في `server/ai/knowledge/store.ts` ═══════════════════════
// هذه دوالٌّ على `training_tracks`/`training_modules` — جدولا هذا الملفّ،
// لا `ai_knowledge_articles`. الكتابةُ الوحيدة التي تلمس المعرفةَ نفسَها
// تبقى حصراً في ملفّ المعرفة كما كانت — هنا نكتب **إشارةً** إليها
// (`knowledge_article_ids`) لا نصَّها.
//
// ══ بلا حذفٍ فعليّ أبداً ═══════════════════════════════════════════════
// نفسُ مبدأ ٠٦١/٠٦٨/معرفة المساعد: «لا شيء يُمحى، الحالة تتغيّر». تفعيلٌ/
// تعطيلٌ فقط — لا `DELETE` في أيّ دالّةٍ هنا، ولا نقطةَ REST توفّره.

/**
 * وجودُ كلّ رقم مقالةٍ في `ai_knowledge_articles` — **أيَّ نسخة**، فعّالةً
 * كانت أم لا؛ `resolveActiveArticle` يمشي أماماً من أيّ نقطةٍ في السلسلة
 * فيصل النسخةَ الفعّالة الحالية بصرف النظر عمّا أُدرِج هنا (القسم ٧). مصفوفةٌ
 * فارغة تمرّ دائماً — «بلا مقالاتٍ مرجعية» شكلٌ صحيح لوحدةٍ (نادرٌ، لكنه ليس
 * خطأً بنيوياً).
 */
async function articleIdsExist(ids: readonly number[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db.select({ id: aiKnowledgeArticles.id }).from(aiKnowledgeArticles)
    .where(inArray(aiKnowledgeArticles.id, ids as number[]));
  const found = new Set(rows.map((r) => r.id));
  return ids.every((id) => found.has(id));
}

export interface TrainingTrackAdminRow {
  id: number; seedKey: string | null; title: string; description: string;
  audience: Capability[]; isActive: boolean; sortOrder: number;
  createdByName: string; approvedByName: string; createdAt: string; updatedAt: string;
}

function toTrackAdminRow(r: typeof trainingTracks.$inferSelect): TrainingTrackAdminRow {
  const audience = Array.isArray(r.audience)
    ? (r.audience as unknown[]).filter((x): x is Capability => isCapability(x))
    : [];
  return {
    id: r.id, seedKey: r.seedKey, title: r.title, description: r.description,
    audience: audience.length ? audience : ["general"],
    isActive: r.isActive, sortOrder: r.sortOrder,
    createdByName: r.createdByName, approvedByName: r.approvedByName,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

/** إنشاءُ مسارٍ جديد — جمهورٌ صريحٌ دائماً (`["general"]` إن تُرك فارغاً، نفسُ افتراض العمود). */
export async function createTrainingTrack(params: {
  title: string; description: string; audience: Capability[]; sortOrder: number; actor: Actor;
}): Promise<TrainingTrackAdminRow> {
  const audience = params.audience.length ? params.audience : (["general"] as Capability[]);
  const [row] = await db.insert(trainingTracks).values({
    title: params.title.trim(), description: params.description.trim(),
    audience, sortOrder: params.sortOrder, isActive: true,
    createdBy: params.actor.userId, createdByName: params.actor.name ?? "—",
    approvedBy: params.actor.userId, approvedByName: params.actor.name ?? "—",
  }).returning();
  await logAudit({
    entityType: "training_track", entityId: row.id, action: "create",
    userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
    newValues: { title: row.title, audience: row.audience, sortOrder: row.sortOrder },
    ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null,
  });
  return toTrackAdminRow(row);
}

/**
 * تعديلُ مسارٍ قائم — **حقولٌ جزئية**: غيابُ حقلٍ من `params` (لا القيمةُ
 * `undefined` الصريحة، فهذا كائنٌ داخليّ لا جسمَ JSON — طبقةُ النقاط تقرّر
 * أيَّ مفاتيحَ تُمرِّر) يعني «اتركه كما هو»، لا كتابةٌ فوقه بقيمةٍ فارغة.
 * تعديلُ سطرٍ لا نسخةٌ جديدة (خلافاً للمعرفة) — المسارُ هيكلٌ تنظيميّ لا
 * سجلٌّ يُوثَّق تاريخُ نسخه.
 */
export async function updateTrainingTrack(params: {
  id: number; title?: string; description?: string; audience?: Capability[]; sortOrder?: number;
  actor: Actor;
}): Promise<{ ok: true; track: TrainingTrackAdminRow } | { ok: false; error: string }> {
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM training_tracks WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(trainingTracks).where(eq(trainingTracks.id, params.id));
    if (!current) return { ok: false, error: "المسار غير موجود" };

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (params.title !== undefined) patch.title = params.title.trim();
    if (params.description !== undefined) patch.description = params.description.trim();
    if (params.audience !== undefined) patch.audience = params.audience.length ? params.audience : ["general"];
    if (params.sortOrder !== undefined) patch.sortOrder = params.sortOrder;

    const [row] = await tx.update(trainingTracks).set(patch).where(eq(trainingTracks.id, params.id)).returning();
    await logAudit({
      entityType: "training_track", entityId: row.id, action: "edit",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      oldValues: { title: current.title, audience: current.audience, sortOrder: current.sortOrder },
      newValues: { title: row.title, audience: row.audience, sortOrder: row.sortOrder },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, track: toTrackAdminRow(row) };
  });
}

/** تفعيلٌ/تعطيلٌ — بلا حذفٍ فعليّ أبداً، ومدقَّقٌ (كانت هاتان النقطتان تكتبان بلا تدقيق قبل هذه المراجعة). */
export async function setTrainingTrackActive(params: {
  id: number; active: boolean; actor: Actor;
}): Promise<{ ok: true; track: TrainingTrackAdminRow } | { ok: false; error: string }> {
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM training_tracks WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(trainingTracks).where(eq(trainingTracks.id, params.id));
    if (!current) return { ok: false, error: "المسار غير موجود" };
    if (current.isActive === params.active) return { ok: true, track: toTrackAdminRow(current) };

    const [row] = await tx.update(trainingTracks)
      .set({ isActive: params.active, updatedAt: new Date() })
      .where(eq(trainingTracks.id, params.id)).returning();
    await logAudit({
      entityType: "training_track", entityId: row.id, action: params.active ? "activate" : "deactivate",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      newValues: { isActive: row.isActive },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, track: toTrackAdminRow(row) };
  });
}

export interface TrainingModuleAdminRow {
  id: number; trackId: number; seedKey: string | null; title: string; description: string;
  position: number; knowledgeArticleIds: number[]; learningObjectives: string[] | null;
  quiz: QuizSpec | null; practiceOnly: boolean; isActive: boolean;
  createdAt: string; updatedAt: string;
}

function toModuleAdminRow(r: typeof trainingModules.$inferSelect): TrainingModuleAdminRow {
  const articleIds = Array.isArray(r.knowledgeArticleIds)
    ? (r.knowledgeArticleIds as unknown[]).filter((x): x is number => typeof x === "number")
    : [];
  const objectives = Array.isArray(r.learningObjectives)
    ? (r.learningObjectives as unknown[]).filter((x): x is string => typeof x === "string")
    : null;
  return {
    id: r.id, trackId: r.trackId, seedKey: r.seedKey, title: r.title, description: r.description,
    position: r.position, knowledgeArticleIds: articleIds,
    learningObjectives: objectives && objectives.length ? objectives : null,
    quiz: isQuizSpec(r.quiz) ? (r.quiz as QuizSpec) : null,
    practiceOnly: r.practiceOnly, isActive: r.isActive,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * إنشاءُ وحدةٍ جديدة — **تحقّقٌ صارمٌ قبل الكتابة**: المسارُ موجود، وكلُّ
 * رقم مقالةٍ مرجعيّ موجودٌ فعلاً (لا يُفحَص أنه فعّالٌ الآن — `resolveActiveArticle`
 * يحلّ ذلك حيّاً عند كلّ قراءة، فرقمٌ يشير لنسخةٍ سابقة في سلسلةٍ لاحقاً
 * تُعدَّل يبقى صحيحاً؛ رقمٌ لا وجود له مطلقاً وحده يُرفَض).
 */
export async function createTrainingModule(params: {
  trackId: number; title: string; description: string; position: number;
  knowledgeArticleIds: number[]; learningObjectives: string[] | null; quiz: QuizSpec | null;
  practiceOnly: boolean; actor: Actor;
}): Promise<{ ok: true; module: TrainingModuleAdminRow } | { ok: false; error: string }> {
  const [track] = await db.select({ id: trainingTracks.id }).from(trainingTracks)
    .where(eq(trainingTracks.id, params.trackId));
  if (!track) return { ok: false, error: "المسار غير موجود" };
  if (!(await articleIdsExist(params.knowledgeArticleIds))) {
    return { ok: false, error: "إحدى المقالات المرجعيّة غير موجودة" };
  }

  const [row] = await db.insert(trainingModules).values({
    trackId: params.trackId, title: params.title.trim(), description: params.description.trim(),
    position: params.position, knowledgeArticleIds: params.knowledgeArticleIds,
    learningObjectives: params.learningObjectives, quiz: params.quiz,
    practiceOnly: params.practiceOnly, isActive: true,
  }).returning();
  await logAudit({
    entityType: "training_module", entityId: row.id, action: "create",
    userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
    newValues: {
      trackId: row.trackId, title: row.title, position: row.position,
      hasQuiz: Boolean(row.quiz), practiceOnly: row.practiceOnly,
      articleCount: params.knowledgeArticleIds.length,
    },
    ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null,
  });
  return { ok: true, module: toModuleAdminRow(row) };
}

/** تعديلُ وحدةٍ قائمة — حقولٌ جزئية، نفسُ مبدأ `updateTrainingTrack`. */
export async function updateTrainingModule(params: {
  id: number; title?: string; description?: string; position?: number;
  knowledgeArticleIds?: number[]; learningObjectives?: string[] | null; quiz?: QuizSpec | null;
  practiceOnly?: boolean; actor: Actor;
}): Promise<{ ok: true; module: TrainingModuleAdminRow } | { ok: false; error: string }> {
  if (params.knowledgeArticleIds !== undefined && !(await articleIdsExist(params.knowledgeArticleIds))) {
    return { ok: false, error: "إحدى المقالات المرجعيّة غير موجودة" };
  }
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM training_modules WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(trainingModules).where(eq(trainingModules.id, params.id));
    if (!current) return { ok: false, error: "الوحدة غير موجودة" };

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (params.title !== undefined) patch.title = params.title.trim();
    if (params.description !== undefined) patch.description = params.description.trim();
    if (params.position !== undefined) patch.position = params.position;
    if (params.knowledgeArticleIds !== undefined) patch.knowledgeArticleIds = params.knowledgeArticleIds;
    if (params.learningObjectives !== undefined) patch.learningObjectives = params.learningObjectives;
    if (params.quiz !== undefined) patch.quiz = params.quiz;
    if (params.practiceOnly !== undefined) patch.practiceOnly = params.practiceOnly;

    const [row] = await tx.update(trainingModules).set(patch).where(eq(trainingModules.id, params.id)).returning();
    await logAudit({
      entityType: "training_module", entityId: row.id, action: "edit",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      oldValues: { title: current.title, position: current.position, hasQuiz: Boolean(current.quiz) },
      newValues: { title: row.title, position: row.position, hasQuiz: Boolean(row.quiz) },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, module: toModuleAdminRow(row) };
  });
}

/** تفعيلٌ/تعطيلٌ لوحدة — بلا حذفٍ فعليّ، ومدقَّق. */
export async function setTrainingModuleActive(params: {
  id: number; active: boolean; actor: Actor;
}): Promise<{ ok: true; module: TrainingModuleAdminRow } | { ok: false; error: string }> {
  return db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT 1 FROM training_modules WHERE id = ${params.id} FOR UPDATE`);
    const [current] = await tx.select().from(trainingModules).where(eq(trainingModules.id, params.id));
    if (!current) return { ok: false, error: "الوحدة غير موجودة" };
    if (current.isActive === params.active) return { ok: true, module: toModuleAdminRow(current) };

    const [row] = await tx.update(trainingModules)
      .set({ isActive: params.active, updatedAt: new Date() })
      .where(eq(trainingModules.id, params.id)).returning();
    await logAudit({
      entityType: "training_module", entityId: row.id, action: params.active ? "activate" : "deactivate",
      userId: params.actor.userId, userName: params.actor.name, branchId: params.actor.branchId ?? null,
      newValues: { isActive: row.isActive },
      ipAddress: params.actor.ipAddress ?? null, userAgent: params.actor.userAgent ?? null, tx,
    });
    return { ok: true, module: toModuleAdminRow(row) };
  });
}
