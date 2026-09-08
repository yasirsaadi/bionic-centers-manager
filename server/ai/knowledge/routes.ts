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

function branchIdOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function articleIdList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => Number.isInteger(x) && x > 0);
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

    const targetArticleId = req.body?.targetArticleId != null ? Number(req.body.targetArticleId) : null;
    const scope = req.body?.scope;
    if (scope !== undefined && scope !== null && !isKnowledgeScope(scope)) {
      return res.status(400).json({ error: "نطاقٌ غير معروف" });
    }
    const result = await approveSuggestion({
      id,
      targetArticleId: targetArticleId && Number.isFinite(targetArticleId) ? targetArticleId : null,
      title: str(req.body?.title) ?? undefined,
      body: str(req.body?.body) ?? undefined,
      scope: isKnowledgeScope(scope) ? scope : undefined,
      branchId: req.body?.branchId !== undefined ? branchIdOrNull(req.body.branchId) : undefined,
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

    const article = await createArticle({
      title, body, scope, branchId: branchIdOrNull(req.body?.branchId), actor: actorFrom(req),
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

    const result = await editArticle({
      id, title, body, scope, branchId: branchIdOrNull(req.body?.branchId), actor: actorFrom(req),
    });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ article: result.article });
  });

  // ══ ٨. تفعيل/تعطيل ═════════════════════════════════════════════════════
  app.patch("/api/ai/knowledge/articles/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة معرفة المساعد المسؤولُ العام وحده" });
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const active = Boolean(req.body?.active);

    const result = await setArticleActive({ id, active, actor: actorFrom(req) });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ article: result.article });
  });
}
