// نقاطُ المعرفة الموثوقة — تقديمُ اقتراحٍ لأيّ موظّف، وكلُّ شيءٍ آخر
// للمسؤول العام حصراً.
//
// ══ لا `branch_manager` هنا ═══════════════════════════════════════════════
// القسم أ من المهمّة صريح: «Do not treat branch_manager as global admin».
// فكلّ نقطةِ كتابةٍ أو إدارةٍ هنا محروسةٌ بـ`isGlobalAdmin` وحدها — لا
// `isAdminOrManager` المستعملة في نقاطٍ تشغيلية أخرى بهذا الملفّ.
//
// ══ ولا كتابةَ في أيّ مسارٍ آخر ═══════════════════════════════════════════
// نقطةٌ واحدة فقط تقبل كتابةً من موظّفٍ عاديّ (`POST .../suggestions`)،
// وأثرُها صفٌّ `pending` وحده — لا تغييرَ على أيّ مقالةٍ فعّالة.

import type { Express } from "express";
import { storage } from "../../storage";
import {
  approveSuggestion, createArticle, createSuggestion, editArticle,
  isKnowledgeScope, listArticlesForAdmin, listSuggestions, rejectSuggestion,
  setArticleActive, type Actor,
} from "./store";

type Req = any;

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

function isGlobalAdmin(req: Req): boolean {
  return Boolean((req.session as any)?.branchSession?.isAdmin);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * فرعُ المقالة — **الغيابُ لا يُخلَط بالخطأ**.
 *
 * `null` نطاقٌ عامّ **صحيح** (غيابٌ صريح أو فراغٌ من النموذج). أمّا قيمةٌ
 * غير فارغة لا تُحلَّل رقماً صحيحاً موجباً فترجع `INVALID` — مُميَّزةً عن
 * `null` عمداً؛ كانتا تُخلَطان معاً فيصير خطأ إملائيّ في رقم الفرع نطاقاً
 * عامّاً بصمت (تصحيحٌ — مراجعةٌ حيّة على PR #281).
 */
const INVALID_ID = Symbol("invalid_id");
function parseBranchId(v: unknown): number | null | typeof INVALID_ID {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return INVALID_ID;
  return n;
}

/**
 * تُقرأ الفرعَ من الطلب وتتحقّق منه: تُرجع `{ok:false}` لصنفٍ غير صالح **أو**
 * لفرعٍ غير موجود فعلاً (تحقّقٌ من القاعدة، لا شكلاً فقط) — ولا صفَّ يُكتب
 * قبل هذا التحقّق. القيمةُ الغائبة/الفارغة تبقى `null` صحيحاً بلا استعلام.
 */
async function resolveBranchIdField(v: unknown): Promise<{ ok: true; value: number | null } | { ok: false }> {
  const parsed = parseBranchId(v);
  if (parsed === INVALID_ID) return { ok: false };
  if (parsed === null) return { ok: true, value: null };
  const branches = await storage.getBranches();
  if (!branches.some((b) => b.id === parsed)) return { ok: false };
  return { ok: true, value: parsed };
}

function articleIdList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => Number.isInteger(x) && x > 0);
}

/** معرّفٌ موجبٌ صحيح، أو `INVALID_ID`-مثله للفشل الصريح — لا `NaN` صامتة. */
function parsePositiveIntId(v: unknown): number | typeof INVALID_ID {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return INVALID_ID;
  return n;
}

export function registerAiKnowledgeRoutes(app: Express, isAuthenticated: any) {
  // ══ ١. تقديمُ اقتراح — أيّ موظّفٍ مصادَق ══════════════════════════════
  //
  // **لا يغيّر معرفةً فعّالة بحرف** — صفٌّ `pending` وحده، ثم القرارُ
  // للمسؤول لاحقاً. القسمُ و«ما اقترحه/سُئل» يصلان من الجسم (نصٌّ حرّ لا
  // سلطة)، والهويّةُ من الجلسة وحدها.
  app.post("/api/ai/knowledge/suggestions", isAuthenticated, async (req: Req, res) => {
    const actor = actorFrom(req);
    if (!actor.userId) return res.status(401).json({ error: "الجلسة غير صالحة" });

    const suggestedText = str(req.body?.suggestedText);
    const reason = str(req.body?.reason);
    if (!suggestedText) return res.status(400).json({ error: "النصّ المقترَح مطلوب" });
    if (!reason) return res.status(400).json({ error: "سببُ الاقتراح مطلوب" });

    const suggestion = await createSuggestion({
      suggestedText, reason,
      sourceQuestion: str(req.body?.sourceQuestion),
      sourceAnswer: str(req.body?.sourceAnswer),
      referencedArticleIds: articleIdList(req.body?.referencedArticleIds),
      actor,
    });
    res.status(201).json({
      id: suggestion.id, status: suggestion.status, submittedAt: suggestion.submittedAt,
    });
  });

  // ══ ٢. قائمةُ الاقتراحات — للمسؤول العام وحده ═════════════════════════
  app.get("/api/ai/knowledge/suggestions", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const status = req.query?.status;
    const filter = status === "pending" || status === "approved" || status === "rejected" ? status : undefined;
    const rows = await listSuggestions(filter);
    res.json({ rows });
  });

  // ══ ٣. اعتمادُ اقتراح — يكتب مقالةً (جديدة أو نسخةً) في نفس المعاملة ═══
  app.patch("/api/ai/knowledge/suggestions/:id/approve", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّفٌ غير صالح" });

    //  ══ targetArticleId — إمّا غائبٌ (مقالةٌ جديدة) أو معرّفٌ صحيح، لا ثالث ══
    //  كان `NaN`/سالبٌ/كسريّ يُقرأ صمتاً «مقالةً جديدة» عبر `x && Number.isFinite(x)`
    //  الفالسة على `NaN` — فقيمةٌ ملفوفة أو مطبوعةٌ خطأً كانت تفتح مقالةً
    //  مستقلّة بدل تنسيخ المقالة المقصودة (تصحيحٌ — مراجعةٌ حيّة).
    let targetArticleId: number | null = null;
    if (req.body?.targetArticleId !== undefined && req.body?.targetArticleId !== null) {
      const parsed = parsePositiveIntId(req.body.targetArticleId);
      if (parsed === INVALID_ID) return res.status(400).json({ error: "معرّفُ المقالة الهدف غير صالح" });
      targetArticleId = parsed;
    }

    const scope = req.body?.scope;
    if (scope !== undefined && scope !== null && !isKnowledgeScope(scope)) {
      return res.status(400).json({ error: "نطاقٌ غير معروف" });
    }

    //  ══ branchId — يُحلّ ويُتحقَّق منه **قبل** أي كتابة، لا بعدها ══
    let branchId: number | null | undefined;
    if (req.body?.branchId !== undefined) {
      const resolved = await resolveBranchIdField(req.body.branchId);
      if (!resolved.ok) return res.status(400).json({ error: "رقمُ الفرع غير صالح أو غير موجود" });
      branchId = resolved.value;
    }

    const result = await approveSuggestion({
      id,
      targetArticleId,
      title: str(req.body?.title) ?? undefined,
      body: str(req.body?.body) ?? undefined,
      scope: isKnowledgeScope(scope) ? scope : undefined,
      branchId,
      actor: actorFrom(req),
    });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ suggestion: result.suggestion, article: result.article });
  });

  // ══ ٤. رفضُ اقتراح — بسببٍ حرٍّ إلزاميّ ════════════════════════════════
  app.patch("/api/ai/knowledge/suggestions/:id/reject", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const decisionNote = str(req.body?.decisionNote);
    if (!decisionNote) return res.status(400).json({ error: "سببُ الرفض مطلوب" });

    const result = await rejectSuggestion({ id, decisionNote, actor: actorFrom(req) });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ suggestion: result.suggestion });
  });

  // ══ ٥. المقالات — قائمةٌ كاملة بكلّ نسخها، للمسؤول العام وحده ═════════
  app.get("/api/ai/knowledge/articles", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const rows = await listArticlesForAdmin();
    res.json({ rows });
  });

  // ══ ٦. إنشاءُ مقالةٍ مباشرة (بلا اقتراح) ═══════════════════════════════
  app.post("/api/ai/knowledge/articles", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const title = str(req.body?.title);
    const body = str(req.body?.body);
    const scope = req.body?.scope;
    if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
    if (!body) return res.status(400).json({ error: "النصّ مطلوب" });
    if (!isKnowledgeScope(scope)) return res.status(400).json({ error: "النطاق مطلوب وصحيح" });

    const resolvedBranch = await resolveBranchIdField(req.body?.branchId);
    if (!resolvedBranch.ok) return res.status(400).json({ error: "رقمُ الفرع غير صالح أو غير موجود" });

    const article = await createArticle({
      title, body, scope, branchId: resolvedBranch.value, actor: actorFrom(req),
    });
    res.status(201).json({ article });
  });

  // ══ ٧. تعديلُ مقالةٍ قائمة — نسخةٌ جديدة ═══════════════════════════════
  app.patch("/api/ai/knowledge/articles/:id", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const title = str(req.body?.title);
    const body = str(req.body?.body);
    const scope = req.body?.scope;
    if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
    if (!body) return res.status(400).json({ error: "النصّ مطلوب" });
    if (!isKnowledgeScope(scope)) return res.status(400).json({ error: "النطاق مطلوب وصحيح" });

    const resolvedBranch = await resolveBranchIdField(req.body?.branchId);
    if (!resolvedBranch.ok) return res.status(400).json({ error: "رقمُ الفرع غير صالح أو غير موجود" });

    const result = await editArticle({
      id, title, body, scope, branchId: resolvedBranch.value, actor: actorFrom(req),
    });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ article: result.article });
  });

  // ══ ٨. تفعيل/تعطيل ═════════════════════════════════════════════════════
  app.patch("/api/ai/knowledge/articles/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    //  ══ بوليانٌ حقيقيّ لا تحويلاً قسرياً ══ — `Boolean("false")` سلسلةٌ غير
    //  فارغة فتُقيَّم `true` رغم نصّها الظاهر؛ نفسُ فخّ `Boolean(0)`/`Boolean("0")`
    //  المعكوس. النوعُ وحده يقرّر (تصحيحٌ — مراجعةٌ حيّة على PR #281).
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ error: "الحقل active يجب أن يكون true أو false" });
    }
    const active: boolean = req.body.active;

    const result = await setArticleActive({ id, active, actor: actorFrom(req) });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ article: result.article });
  });
}
