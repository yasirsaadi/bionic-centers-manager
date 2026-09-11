// نقاطُ تدريب الموظّفين — REST خفيفة فوق `server/training/store.ts`.
//
// ══ الهويّةُ من الجلسة دائماً ═══════════════════════════════════════════
// كلُّ نقطةٍ هنا تشتقّ `AiAccessContext` من `req.session.branchSession`
// بنفس الاستدعاء الذي تستعمله `/api/ai/chat` بالحرف (`resolveAiAccess`) —
// فقدراتُ التدريب **نفسُها** قدراتُ أدوات المساعد، لا حسابٌ ثانٍ ينحرف
// عنه. ولا `userId` يُقرأ من جسم الطلب في أيّ نقطة كتابة.
//
// ══ إدارةُ التدريب (القسم ٣، مراجعةُ إكمال) — المسؤولُ العام وحده ═══════
// نقاطُ الإنشاء/التعديل تحت `admin/` محروسةٌ بـ`isGlobalAdmin` وحدها —
// **لا** `branch_manager`، نفسُ استثناء `server/ai/knowledge/routes.ts`
// («لا `branch_manager` هنا» بالحرف). التفعيلُ/التعطيلُ صار يمرّ عبر
// دوالّ المخزن (`setTrainingTrackActive`/`setTrainingModuleActive`) بدل
// تعديلٍ مباشر هنا — فيُدقَّق الآن (لم يكن يُدقَّق قبل هذه المراجعة).

import type { Express } from "express";
import { resolveAiAccess, operationalBranchesOf } from "../ai/access";
import {
  listAccessibleTracks, findNextIncompleteModule, getModuleLesson,
  submitTrainingAnswer, getManagementTrainingProgress,
  createTrainingTrack, updateTrainingTrack, setTrainingTrackActive,
  createTrainingModule, updateTrainingModule, setTrainingModuleActive,
} from "./store";
import type { Actor } from "../ai/knowledge/store";
import { db } from "../db";
import { trainingTracks, trainingModules } from "@shared/schema";
import { asc, eq } from "drizzle-orm";
import { isCapability, type Capability } from "@shared/ai_capabilities";
import { isQuizSpec, type QuizSpec } from "@shared/ai_training";

type Req = any;

const INVALID_ID = Symbol("invalid_id");
function parsePositiveIntId(v: unknown): number | typeof INVALID_ID {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return INVALID_ID;
  return n;
}

function isGlobalAdmin(req: Req): boolean {
  return Boolean((req.session as any)?.branchSession?.isAdmin);
}

/** نفسُ سياق أدوات المساعد بالحرف — لا حسابَ صلاحيةٍ ثانٍ لهذه الشاشة. */
function accessFrom(req: Req) {
  const branchSession = (req.session as any)?.branchSession;
  //  ══ نطاقٌ تشغيليّ لا ماليّ ══ — التدريب ليس بيانات محاسبة، فلا حاجة
  //  لـ`enforceBranchAccess` (تخصّ اللقطة المالية) هنا؛ `scopeBranchId`
  //  المُمرَّر لـ`resolveAiAccess` غير مستعمَل فعلياً في نقاط هذا الملفّ
  //  (لا أداة `financial_summary` تُستدعى)، فيُترَك `undefined` بأمان.
  return resolveAiAccess({ session: branchSession });
}

/** نفسُ `actorFrom` في `server/ai/knowledge/routes.ts` بالحرف — الهويّةُ من الجلسة. */
function actorFrom(req: Req): Actor {
  const s = (req.session as any)?.branchSession;
  return {
    userId: typeof s?.userId === "number" ? s.userId : null,
    name: typeof s?.displayName === "string" ? s.displayName : null,
    role: typeof s?.role === "string" ? s.role : (s?.isAdmin ? "admin" : null),
    branchId: typeof s?.branchId === "number" ? s.branchId : null,
    ipAddress: req.ip ?? null,
    userAgent: req.get?.("user-agent") ?? null,
  };
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** جمهورٌ — مصفوفةُ قدراتٍ حقيقية فقط، فشلٌ مغلَق لأيّ عنصرٍ فاسد. غيابٌ ⟶ `[]` (يصير `["general"]` في المخزن). */
function parseAudienceInput(v: unknown): { ok: true; value: Capability[] } | { ok: false } {
  if (v === undefined) return { ok: true, value: [] };
  if (!Array.isArray(v) || !v.every((x) => isCapability(x))) return { ok: false };
  return { ok: true, value: Array.from(new Set(v as Capability[])) };
}

/** أرقامُ مقالاتٍ مرجعية — أعدادٌ صحيحة موجبة فقط. غيابٌ ⟶ `[]`. */
function parseArticleIdsInput(v: unknown): { ok: true; value: number[] } | { ok: false } {
  if (v === undefined) return { ok: true, value: [] };
  if (!Array.isArray(v) || !v.every((x) => Number.isInteger(x) && x > 0)) return { ok: false };
  return { ok: true, value: v as number[] };
}

/** أهدافُ تعلّمٍ — مصفوفةُ نصوصٍ غير فارغة، أو `null`/غيابٌ. */
function parseLearningObjectivesInput(v: unknown): { ok: true; value: string[] | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.trim())) return { ok: false };
  const trimmed = v.map((x) => String(x).trim());
  return { ok: true, value: trimmed.length ? trimmed : null };
}

/** اختبارُ وحدة — `null`/غيابٌ (بلا اختبار)، أو شكلٌ صالحٌ حسب `isQuizSpec` فقط. */
function parseQuizInput(v: unknown): { ok: true; value: QuizSpec | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (!isQuizSpec(v)) return { ok: false };
  return { ok: true, value: v };
}

/**
 * حقولُ تعديل مسارٍ من الجسم — **الحضورُ يقرّر لا القيمة** (نفسُ نمط
 * `metadataFieldsFrom` في `server/ai/knowledge/routes.ts`): مفتاحٌ غائبٌ
 * لا يدخل الكائن الناتج فيَرث `updateTrainingTrack` القيمةَ الحالية بدل
 * أن يُسقطها بصمت إلى فراغٍ لم يقصده أحد.
 */
function trackPatchFieldsFrom(body: any):
  | { ok: true; fields: { title?: string; description?: string; audience?: Capability[]; sortOrder?: number } }
  | { ok: false; error: string } {
  const fields: { title?: string; description?: string; audience?: Capability[]; sortOrder?: number } = {};
  if (body && Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = str(body.title);
    if (!title) return { ok: false, error: "العنوان مطلوب" };
    fields.title = title;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = str(body.description);
    if (!description) return { ok: false, error: "الوصف مطلوب" };
    fields.description = description;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "audience")) {
    const parsed = parseAudienceInput(body.audience);
    if (!parsed.ok) return { ok: false, error: "جمهورٌ غير صالح — كلّ عنصرٍ يجب أن يكون قدرةً معروفة" };
    fields.audience = parsed.value;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "sortOrder")) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: "ترتيبٌ غير صالح" };
    fields.sortOrder = n;
  }
  return { ok: true, fields };
}

/** نفسُ مبدأ `trackPatchFieldsFrom` — لحقول تعديل وحدة. */
function modulePatchFieldsFrom(body: any):
  | {
    ok: true; fields: {
      title?: string; description?: string; position?: number;
      knowledgeArticleIds?: number[]; learningObjectives?: string[] | null;
      quiz?: QuizSpec | null; practiceOnly?: boolean;
    };
  }
  | { ok: false; error: string } {
  const fields: {
    title?: string; description?: string; position?: number;
    knowledgeArticleIds?: number[]; learningObjectives?: string[] | null;
    quiz?: QuizSpec | null; practiceOnly?: boolean;
  } = {};
  if (body && Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = str(body.title);
    if (!title) return { ok: false, error: "العنوان مطلوب" };
    fields.title = title;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = str(body.description);
    if (!description) return { ok: false, error: "الوصف مطلوب" };
    fields.description = description;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "position")) {
    const n = Number(body.position);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: "ترتيبٌ غير صالح" };
    fields.position = n;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "knowledgeArticleIds")) {
    const parsed = parseArticleIdsInput(body.knowledgeArticleIds);
    if (!parsed.ok) return { ok: false, error: "قائمةُ المقالات غير صالحة — أعدادٌ صحيحة موجبة فقط" };
    fields.knowledgeArticleIds = parsed.value;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "learningObjectives")) {
    const parsed = parseLearningObjectivesInput(body.learningObjectives);
    if (!parsed.ok) return { ok: false, error: "أهدافُ التعلّم غير صالحة — نصوصٌ غير فارغة فقط" };
    fields.learningObjectives = parsed.value;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "quiz")) {
    const parsed = parseQuizInput(body.quiz);
    if (!parsed.ok) return { ok: false, error: "شكلُ الاختبار غير صالح" };
    fields.quiz = parsed.value;
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "practiceOnly")) {
    if (typeof body.practiceOnly !== "boolean") return { ok: false, error: "practiceOnly يجب أن يكون true أو false" };
    fields.practiceOnly = body.practiceOnly;
  }
  return { ok: true, fields };
}

export function registerTrainingRoutes(app: Express, isAuthenticated: any) {
  // ══ ١. الكتالوج — المساراتُ المتاحة لهذه الجلسة، ومعها تقدّمها ═══════════
  app.get("/api/training/tracks", isAuthenticated, async (req: Req, res) => {
    const access = accessFrom(req);
    const tracks = await listAccessibleTracks(access);
    res.json({ tracks });
  });

  // ══ ٢. «كمّل تدريبي من آخر مكان» — أوّلُ وحدةٍ غيرِ منجَزة ═══════════════
  app.get("/api/training/next", isAuthenticated, async (req: Req, res) => {
    const access = accessFrom(req);
    const next = await findNextIncompleteModule(access);
    res.json({ next });
  });

  // ══ ٣. فتحُ درسِ وحدة — يحلّ المعرفةَ الفعّالة حيّاً ويبدأ/يلمس التقدّم ═══
  app.get("/api/training/modules/:id/lesson", isAuthenticated, async (req: Req, res) => {
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const access = accessFrom(req);
    const result = await getModuleLesson({ moduleId: idParsed, access });
    if (!result.ok) return res.status(403).json({ error: result.error });
    res.json({ lesson: result.lesson });
  });

  // ══ ٤. تصحيحُ إجابةِ اختبار — الكتابةُ الوحيدة على هذا الجدول للموظّف ═══
  app.post("/api/training/modules/:id/answer", isAuthenticated, async (req: Req, res) => {
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const answerText = typeof req.body?.answerText === "string" ? req.body.answerText : "";
    const access = accessFrom(req);
    const result = await submitTrainingAnswer({
      moduleId: idParsed, answerText, access,
      ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
    });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ outcome: result.outcome });
  });

  // ══ ٥. عرضُ الإدارة — مسؤولٌ عامّ (كلّ الفروع) أو مديرُ فرعٍ (فرعه) ═══════
  app.get("/api/training/management/progress", isAuthenticated, async (req: Req, res) => {
    const branchSession = (req.session as any)?.branchSession;
    const result = await getManagementTrainingProgress({
      isAdmin: Boolean(branchSession?.isAdmin),
      role: branchSession?.role ?? null,
      operationalBranches: operationalBranchesOf(branchSession),
    });
    if (!result.ok) return res.status(403).json({ error: result.error });
    res.json({ rows: result.rows });
  });

  // ══ ٦. لوحةُ المسؤول — كلّ المسارات والوحدات بلا فلترةِ جمهور ═══════════
  //  للمسؤول العام وحده، **نفسُ نمط `GET /api/ai/knowledge/articles`
  //  بالحرف**: قائمةٌ كاملة، لا كتالوج مستخدمٍ عاديّ.
  app.get("/api/training/admin/tracks", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const tracks = await db.select().from(trainingTracks).orderBy(asc(trainingTracks.sortOrder));
    const modules = await db.select().from(trainingModules).orderBy(asc(trainingModules.position));
    const modulesByTrack = new Map<number, typeof modules>();
    for (const m of modules) {
      const list = modulesByTrack.get(m.trackId) ?? [];
      list.push(m);
      modulesByTrack.set(m.trackId, list);
    }
    res.json({
      tracks: tracks.map((t) => ({ ...t, modules: modulesByTrack.get(t.id) ?? [] })),
    });
  });

  // ══ ٧. إنشاءُ مسارٍ جديد ═══════════════════════════════════════════════
  app.post("/api/training/admin/tracks", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const title = str(req.body?.title);
    const description = str(req.body?.description);
    if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
    if (!description) return res.status(400).json({ error: "الوصف مطلوب" });
    const audienceParsed = parseAudienceInput(req.body?.audience);
    if (!audienceParsed.ok) return res.status(400).json({ error: "جمهورٌ غير صالح — كلّ عنصرٍ يجب أن يكون قدرةً معروفة" });
    const sortOrderRaw = req.body?.sortOrder;
    const sortOrder = sortOrderRaw === undefined ? 0 : Number(sortOrderRaw);
    if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder)) {
      return res.status(400).json({ error: "ترتيبٌ غير صالح" });
    }

    const track = await createTrainingTrack({
      title, description, audience: audienceParsed.value, sortOrder, actor: actorFrom(req),
    });
    res.status(201).json({ track });
  });

  // ══ ٨. تعديلُ مسارٍ قائم — حقولٌ جزئية ═══════════════════════════════════
  app.patch("/api/training/admin/tracks/:id", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const parsed = trackPatchFieldsFrom(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const result = await updateTrainingTrack({ id: idParsed, ...parsed.fields, actor: actorFrom(req) });
    if (!result.ok) return res.status(404).json({ error: result.error });
    res.json({ track: result.track });
  });

  // ══ ٩. إنشاءُ وحدةٍ جديدة ضمن مسار ═══════════════════════════════════════
  app.post("/api/training/admin/tracks/:id/modules", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const trackIdParsed = parsePositiveIntId(req.params.id);
    if (trackIdParsed === INVALID_ID) return res.status(400).json({ error: "معرّفُ المسار غير صالح" });

    const title = str(req.body?.title);
    const description = str(req.body?.description);
    if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
    if (!description) return res.status(400).json({ error: "الوصف مطلوب" });

    const positionRaw = req.body?.position;
    const position = positionRaw === undefined ? 0 : Number(positionRaw);
    if (!Number.isFinite(position) || !Number.isInteger(position)) {
      return res.status(400).json({ error: "ترتيبٌ غير صالح" });
    }
    const articleIdsParsed = parseArticleIdsInput(req.body?.knowledgeArticleIds);
    if (!articleIdsParsed.ok) return res.status(400).json({ error: "قائمةُ المقالات غير صالحة — أعدادٌ صحيحة موجبة فقط" });
    const objectivesParsed = parseLearningObjectivesInput(req.body?.learningObjectives);
    if (!objectivesParsed.ok) return res.status(400).json({ error: "أهدافُ التعلّم غير صالحة — نصوصٌ غير فارغة فقط" });
    const quizParsed = parseQuizInput(req.body?.quiz);
    if (!quizParsed.ok) return res.status(400).json({ error: "شكلُ الاختبار غير صالح" });
    const practiceOnly = req.body?.practiceOnly === true;

    const result = await createTrainingModule({
      trackId: trackIdParsed, title, description, position,
      knowledgeArticleIds: articleIdsParsed.value, learningObjectives: objectivesParsed.value,
      quiz: quizParsed.value, practiceOnly, actor: actorFrom(req),
    });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.status(201).json({ module: result.module });
  });

  // ══ ١٠. تعديلُ وحدةٍ قائمة — حقولٌ جزئية ══════════════════════════════════
  app.patch("/api/training/admin/modules/:id", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const parsed = modulePatchFieldsFrom(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const result = await updateTrainingModule({ id: idParsed, ...parsed.fields, actor: actorFrom(req) });
    if (!result.ok) return res.status(result.error === "الوحدة غير موجودة" ? 404 : 400).json({ error: result.error });
    res.json({ module: result.module });
  });

  // ══ ١١. تفعيل/تعطيل مسار أو وحدة — **بلا حذفٍ فعليّ إطلاقاً**، ومدقَّقٌ
  //  الآن (كانتا تكتبان بلا تدقيقٍ قبل هذه المراجعة) ═══════════════════════
  app.patch("/api/training/admin/tracks/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ error: "الحقل active يجب أن يكون true أو false" });
    }
    const result = await setTrainingTrackActive({ id: idParsed, active: req.body.active, actor: actorFrom(req) });
    if (!result.ok) return res.status(404).json({ error: result.error });
    res.json({ track: result.track });
  });

  app.patch("/api/training/admin/modules/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ error: "الحقل active يجب أن يكون true أو false" });
    }
    const result = await setTrainingModuleActive({ id: idParsed, active: req.body.active, actor: actorFrom(req) });
    if (!result.ok) return res.status(404).json({ error: result.error });
    res.json({ module: result.module });
  });
}
