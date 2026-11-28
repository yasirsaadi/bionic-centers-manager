// **اعتمادُ العلامة الحمراء في معاينة العلاج الطبيعي** (ترحيل ١٩٨، §4.gz) — النقاط. كلُّ كتابةٍ بسطر تدقيقٍ في معاملتها.
//
//   POST /api/physio/exams/:examId/red-flag-review   — «أرسل للاعتماد» (كاتبُ المعاينة أو معتمِد، وملاحظةُ الفاحص إلزامية)؛
//                                                       ومعتمِدٌ يقرّر في الخطوة نفسِها بـ`decision` و`decisionNote` (إلزامية) —
//                                                       وعلى معاينة غيره قرارٌ مباشر بملاحظة القرار وحدها
//   POST /api/physio/red-flag-reviews/:id/decide       — قرارُ المعتمِد: `decision` (approve|reject) و`note` إلزامية
//   GET  /api/physio/red-flag-reviews?view=pending|decided — صفحةُ «اعتمادات العلاج الطبيعي» (للمعتمِد)
//   GET  /api/physio/red-flag-reviews/pending-count    — شارةُ الشريط (للمعتمِد)
// والمعتمِدُ `canApproveProtocols`: المسؤولُ والمشرفُ العام (سليم) بصلاحياتٍ واحدة، وعلى كلّ الفروع (§4.cg).
import type { Express } from "express";
import { getSession, accessibleBranchesFor } from "../sessions_module/permissions";
import { scopeReachesPatient } from "../patients/branch_access";
import { canApproveProtocols } from "@shared/physio_protocols";
import * as store from "./store";
import { pendingOpusCount, staleOpusCount } from "../physio_agent/plans";

export function registerPhysioExamReviewRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actorOf = (req: any): store.ReviewActor => {
    const s = sess(req);
    return { userId: s.userId ?? null, name: s.displayName ?? null, isApprover: canApproveProtocols(s), ip: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null };
  };
  const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
  const fail = (res: any, e: unknown) => {
    if (e instanceof store.ReviewError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error("[physio-exam-reviews]", e);
    return res.status(500).json({ error: "تعذّر تنفيذ الطلب" });
  };

  app.post("/api/physio/exams/:examId/red-flag-review", isAuthenticated, async (req: any, res) => {
    const examId = idOf(req.params.examId);
    if (!examId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const actor = actorOf(req);
    try {
      const review = await store.requestReview({
        examId, actor, examinerNote: req.body?.examinerNote, decision: req.body?.decision, decisionNote: req.body?.decisionNote,
        forbiddenDevices: req.body?.forbiddenDevices,
        //  المعتمِدُ على كلّ الفروع؛ والفاحصُ بنطاق فروعه على فرع المعاينة أو ما يصل ملفَّ المريض.
        branchScopeOk: async (e) => {
          if (actor.isApprover) return true;
          const scope = accessibleBranchesFor(req);
          if (scope === null || (e.branchId !== null && scope.includes(e.branchId))) return true;
          //  **بفرع تسجيل المريض** (`patients.branch_id`) لا بفرع المعاينة — والفروعُ المُتاحُ لها الملفّ تُقرأ داخلها (§4.t).
          return scopeReachesPatient(scope, { id: e.patientId, branchId: e.patientBranchId });
        },
      });
      res.status(201).json(review);
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/red-flag-reviews/:id/decide", isAuthenticated, async (req: any, res) => {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      res.json(await store.decideReview({ reviewId: id, actor: actorOf(req), decision: req.body?.decision, note: req.body?.note,
        forbiddenDevices: req.body?.forbiddenDevices }));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/red-flag-reviews", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "اعتمادُ العلامات الحمراء للمسؤول والمشرف العام" });
    try {
      res.json({ rows: await store.listReviews(req.query?.view === "decided" ? "decided" : "pending") });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/red-flag-reviews/pending-count", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "اعتمادُ العلامات الحمراء للمسؤول والمشرف العام" });
    try {
      //  والشارةُ تجمع العلاماتِ الحمراء وخططَ Opus المنتظرة الطازجة (§4.ha).
      const redFlags = await store.pendingCount();
      const opusPlans = await pendingOpusCount();
      res.json({ count: redFlags + opusPlans, redFlags, opusPlans, opusStale: await staleOpusCount() });
    } catch (e) { fail(res, e); }
  });
}
