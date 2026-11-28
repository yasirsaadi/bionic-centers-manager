// **إسنادُ خطّة Bionic AI بأجزائها والبديلُ لغياب المُسنَد** (ترحيل ٢٠١، §4.hc) — النقاط. كلُّ كتابةٍ بسطر تدقيق (في طبقة البيانات، في معاملتها).
//
//   PUT  /api/physio/plans/:id/part-assignments   — «إسناد» (المعتمِد): { devices?: id|null, exercises?: id|null, reason? }
//   POST /api/physio/part-assignments/seen        — «رآه» المُسنَد: { planId }
//   GET  /api/physio/substitute-candidates        — مرشّحو البديل (المُسنَدُ نفسُه أو المعتمِد): ?assigneeId&planId&part
//   POST /api/physio/substitutes                  — طلبُ بديل (المُسنَد؛ والمعتمِدُ نيابةً عنه يُعتمد حين يُنشأ)
//   POST /api/physio/substitutes/:id/withdraw     — سحبُ الطلب المنتظر (صاحبُه أو المُسنَد)
//   POST /api/physio/substitutes/:id/decide       — قرارُ المعتمِد: { decision: approve|reject, note? }
//   POST /api/physio/substitutes/:id/end          — إنهاءُ بديلٍ معتمَد مبكّراً (المعتمِد أو المُسنَد): { reason }
//   POST /api/physio/substitutes/seen             — رأى القرار: { ids }
//   GET  /api/physio/substitutes?view=pending|decided — طابورُ المعتمِد
import type { Express } from "express";
import { canApproveProtocols } from "@shared/physio_protocols";
import { canExecutePlans } from "@shared/physio_plans";
import { AI_BRAND } from "@shared/ai_brand";
import { canAssignOpusPlans, isPlanPart, type PlanPart } from "@shared/physio_plan_assignment";
import * as assignment from "./assignment";
import type { Actor } from "./store";

interface Deps {
  loadPlan: (req: any, res: any, id: number | null) => Promise<{ s: any; row: any } | null>;
  audit: (req: any, s: any, p: { entityId: number; action: string; branchId: number | null; oldValues?: any; newValues?: any; notes?: string }) => Promise<void>;
  actor: (s: any) => Actor;
  sess: (req: any) => any;
  scopeOf: (req: any, s: any) => number[] | null;
  fail: (res: any, e: unknown) => void;
  idOf: (v: unknown) => number | null;
}

export function registerPhysioAssignmentRoutes(app: Express, isAuthenticated: any, d: Deps) {
  const meta = (req: any) => ({ ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
  const physioStaff = (res: any, s: any) => {
    if (canExecutePlans(s)) return true;
    res.status(403).json({ error: "لقسم العلاج الطبيعي" });
    return false;
  };
  const partOf = (v: unknown): PlanPart | null | "bad" => (v === undefined || v === null || v === "" ? null : isPlanPart(v) ? v : "bad");

  app.put("/api/physio/plans/:id/part-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const l = await d.loadPlan(req, res, d.idOf(req.params.id));
      if (!l) return;
      if (!canAssignOpusPlans(l.s)) return res.status(403).json({ error: `يُسند خطّةَ ${AI_BRAND} المسؤولُ أو المشرفُ العام`, code: "approver_only" });
      const want: Partial<Record<PlanPart, number | null>> = {};
      for (const part of ["devices", "exercises"] as const) {
        if (!(part in (req.body ?? {}))) continue;
        const v = req.body[part];
        if (v === null) { want[part] = null; continue; }
        const n = Number(v);
        if (!Number.isInteger(n) || n <= 0) return res.status(400).json({ error: "مُسنَدٌ غير صالح", code: "assignee_invalid" });
        want[part] = n;
      }
      if (!Object.keys(want).length) return res.status(400).json({ error: "لم يتغيّر الإسناد", code: "no_change" });
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;
      const r = await assignment.assignParts(l.row.id, want, reason, d.actor(l.s), meta(req));
      const fresh = await assignment.assignmentViewById(l.row.id, { userId: l.s.userId ?? null, approver: canApproveProtocols(l.s), session: l.s, scope: d.scopeOf(req, l.s) });
      res.json({ ...r, assignment: fresh, needsAssignment: fresh.missingParts });
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/part-assignments/seen", isAuthenticated, async (req: any, res) => {
    try {
      const l = await d.loadPlan(req, res, d.idOf(req.body?.planId));
      if (!l) return;
      res.json({ ok: true, parts: await assignment.markAssignmentSeen(l.row.id, d.actor(l.s)) });
    } catch (e) { d.fail(res, e); }
  });

  /** النطاقُ المطلوب وحارساه: المُسنَدُ نفسُه أو المعتمِد، والخطّةُ (إن ذُكرت) تصلها قراءةُ السائل. */
  async function scopeFrom(req: any, res: any, src: any): Promise<{ s: any; assigneeId: number; planId: number | null; part: PlanPart | null } | null> {
    const s = d.sess(req);
    if (!physioStaff(res, s)) return null;
    const approver = canApproveProtocols(s);
    const assigneeId = src?.assigneeId == null || src.assigneeId === "" ? Number(s.userId) : d.idOf(src.assigneeId);
    if (!assigneeId) { res.status(400).json({ error: "مُسنَدٌ غير صالح" }); return null; }
    if (!approver && assigneeId !== Number(s.userId)) { res.status(403).json({ error: "يطلب البديلَ المُسنَدُ نفسُه أو المسؤولُ أو المشرفُ العام", code: "not_assignee" }); return null; }
    const part = partOf(src?.part);
    if (part === "bad") { res.status(400).json({ error: "الجزء: الأجهزة أو التمارين" }); return null; }
    let planId: number | null = null;
    if (src?.planId != null && src.planId !== "") {
      const l = await d.loadPlan(req, res, d.idOf(src.planId));
      if (!l) return null;
      if (l.row.origin !== "opus") { res.status(409).json({ error: `البديلُ لخطط ${AI_BRAND} وحدها`, code: "opus_only" }); return null; }
      planId = l.row.id;
    }
    return { s, assigneeId, planId, part };
  }

  app.get("/api/physio/substitute-candidates", isAuthenticated, async (req: any, res) => {
    try {
      const sc = await scopeFrom(req, res, req.query);
      if (!sc) return;
      res.json(await assignment.substituteCandidates({ assigneeId: sc.assigneeId, planId: sc.planId, part: sc.part }));
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/substitutes", isAuthenticated, async (req: any, res) => {
    try {
      const sc = await scopeFrom(req, res, req.body);
      if (!sc) return;
      const substituteId = d.idOf(req.body?.substituteId);
      if (!substituteId) return res.status(400).json({ error: "اختر البديل", code: "substitute_invalid" });
      const today = assignment.baghdadToday();
      const dateFrom = typeof req.body?.dateFrom === "string" && req.body.dateFrom ? req.body.dateFrom : today;
      const dateTo = typeof req.body?.dateTo === "string" && req.body.dateTo ? req.body.dateTo : dateFrom;
      const row = await assignment.requestSubstitute({ assigneeId: sc.assigneeId, substituteId, planId: sc.planId, part: sc.part, dateFrom, dateTo,
        reason: typeof req.body?.reason === "string" ? req.body.reason : "" }, d.actor(sc.s), meta(req));
      res.status(201).json({ substitution: row });
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/substitutes/seen", isAuthenticated, async (req: any, res) => {
    try {
      const s = d.sess(req);
      if (!physioStaff(res, s)) return;
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 100) : [];
      res.json({ ok: true, marked: await assignment.markSubstitutionsSeen(ids, d.actor(s)) });
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/substitutes/:id/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const s = d.sess(req);
      if (!physioStaff(res, s)) return;
      const id = d.idOf(req.params.id);
      if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
      res.json({ substitution: await assignment.withdrawSubstitute(id, d.actor(s), meta(req)) });
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/substitutes/:id/decide", isAuthenticated, async (req: any, res) => {
    try {
      const s = d.sess(req);
      if (!canApproveProtocols(s)) return res.status(403).json({ error: "يعتمد البديلَ المسؤولُ أو المشرفُ العام", code: "approver_only" });
      const id = d.idOf(req.params.id);
      if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
      const decision = req.body?.decision === "approve" ? "approve" : req.body?.decision === "reject" ? "reject" : null;
      if (!decision) return res.status(400).json({ error: "القرار: اعتماد أو رفض" });
      const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 1000) : null;
      res.json({ substitution: await assignment.decideSubstitute(id, decision, note, d.actor(s), meta(req)) });
    } catch (e) { d.fail(res, e); }
  });

  app.post("/api/physio/substitutes/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const s = d.sess(req);
      if (!physioStaff(res, s)) return;
      const id = d.idOf(req.params.id);
      if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
      const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : "";
      res.json({ substitution: await assignment.endSubstitute(id, reason, d.actor(s), meta(req)) });
    } catch (e) { d.fail(res, e); }
  });

  app.get("/api/physio/substitutes", isAuthenticated, async (req: any, res) => {
    try {
      const s = d.sess(req);
      if (!canApproveProtocols(s)) return res.status(403).json({ error: "طلباتُ البديل للمسؤول والمشرف العام", code: "approver_only" });
      const view = req.query.view === "decided" ? "decided" : "pending";
      res.json({ view, rows: await assignment.listSubstitutions(view) });
    } catch (e) { d.fail(res, e); }
  });
}
