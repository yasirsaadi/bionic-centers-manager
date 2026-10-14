// **نظامُ الأقساط** (ترحيل ١٤٢، §4.ea) — النقاط. والفتحُ نفسُه داخل `POST /api/payments` (في معاملة الدفعة).
//
//   GET   /api/installments?scope=overdue|upcoming|active[&branchId] — قائمةُ صفحة «الأقساط»: فرعُ الجلسة النشط، والمسؤولُ كلُّ الفروع أو فرعٌ يختاره.
//   GET   /api/installments/overdue-count                         — رقمُ الشريط بالنطاق نفسِه.
//   GET   /api/patients/:id/installments                          — خططُ المريض وديونُ أقسامه (لنافذة الدفعة وصندوق الملفّ).
//   PATCH /api/installments/:id                                   — التعديلُ: المسؤولُ ومديرُ الفرع وحدهما (قرارُ المالك)، بسطر تدقيق.
//   POST  /api/installments/:id/cancel                            — الإلغاءُ بسبب: المسؤولُ ومديرُ الفرع وحدهما، بسطر تدقيق.
// والرؤيةُ لمن يرى المرضى ودفعاتِهم (`canViewPatients` و`canViewPayments`) — الاستقبالُ والمدراءُ والمحاسبون.
import type { Express, Request } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession, accessibleBranchesFor } from "../sessions_module/permissions";
import { scopeReachesPatient } from "../patients/branch_access";
import { storage } from "../storage";
import { hasRole } from "@shared/user_roles";
import { addDaysYmd, parseInstallmentInput } from "@shared/installments";
import { baghdadTodayYmd } from "@shared/visit_date";
import * as store from "./store";

/** مَن يرى الأقساط: المسؤول، أو مَن يرى المرضى **ودفعاتِهم** — فالطبيبُ الذي يرى الملفَّ بلا مالٍ لا يراها. */
export function canViewInstallments(s: any): boolean {
  return Boolean(s?.isAdmin || (s?.permissions?.canViewPatients && s?.permissions?.canViewPayments));
}
/** مَن يعدّل الخطّة ويلغيها: المسؤولُ ومديرُ الفرع وحدهما (قرارُ المالك ٢٠٢٦-١٠-١٤). */
export function canManageInstallments(s: any): boolean {
  return Boolean(s?.isAdmin || hasRole(s, "branch_manager"));
}

/** نطاقُ القائمة: الموظّفُ فرعُ جلسته النشط وحده (§4.ay)، والمسؤولُ كلُّ الفروع أو ما يختاره. */
function listBranch(req: Request): number | null | false {
  const s = getSession(req);
  if (s?.isAdmin) return Number(req.query.branchId) > 0 ? Number(req.query.branchId) : null;
  return s?.branchId ? Number(s.branchId) : false;
}

const fail = (res: any, e: unknown) => {
  if (e instanceof store.InstallmentError) return res.status(e.status).json({ message: e.message });
  console.error("[installments]", e);
  return res.status(500).json({ message: "تعذّر تنفيذ الطلب" });
};

export function registerInstallmentRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/installments", isAuthenticated, async (req, res) => {
    const s = getSession(req);
    if (!canViewInstallments(s)) return res.status(403).json({ message: "غير مصرح" });
    const branch = listBranch(req);
    if (branch === false) return res.json([]);
    const scope = ["overdue", "upcoming", "active"].includes(String(req.query.scope)) ? String(req.query.scope) : "overdue";
    try {
      const today = baghdadTodayYmd();
      const soon = addDaysYmd(today, 7);
      const all = await store.activePlans(branch, today);
      const rows = scope === "overdue" ? all.filter((p) => p.figures.overdueCount > 0)
        : scope === "upcoming" ? all.filter((p) => p.figures.overdueCount === 0 && p.figures.nextDueDate !== null && p.figures.nextDueDate <= soon)
        : all;
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  app.get("/api/installments/overdue-count", isAuthenticated, async (req, res) => {
    const s = getSession(req);
    if (!canViewInstallments(s)) return res.status(403).json({ message: "غير مصرح" });
    const branch = listBranch(req);
    if (branch === false) return res.json({ count: 0 });
    try {
      const all = await store.activePlans(branch, baghdadTodayYmd());
      res.json({ count: all.filter((p) => p.figures.overdueCount > 0).length });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/patients/:id/installments", isAuthenticated, async (req, res) => {
    const s = getSession(req);
    if (!canViewInstallments(s)) return res.status(403).json({ message: "غير مصرح" });
    const id = Number(req.params.id);
    const patient = await storage.getPatient(id);
    if (!patient || !(await scopeReachesPatient(accessibleBranchesFor(req), patient as any))) {
      return res.status(404).json({ message: "المريض غير موجود" });
    }
    try {
      const today = baghdadTodayYmd();
      res.json({ plans: await store.plansForPatient(id, today), cases: await store.casesForPatient(id),
        canManage: canManageInstallments(s) });
    } catch (e) { fail(res, e); }
  });

  /** خطّةٌ في نطاق المدير: فرعُها من فروعه (والمسؤولُ كلُّها). */
  const managedPlan = async (req: Request, res: any) => {
    const s = getSession(req);
    if (!canManageInstallments(s)) { res.status(403).json({ message: "تعديلُ خطّة الأقساط وإلغاؤها للمسؤول ومدير الفرع" }); return null; }
    const plan = await store.getPlan(Number(req.params.id), baghdadTodayYmd());
    if (!plan) { res.status(404).json({ message: "الخطّة غير موجودة" }); return null; }
    const scope = accessibleBranchesFor(req);
    if (scope !== null && !scope.includes(plan.branchId)) { res.status(403).json({ message: "الخطّةُ في فرعٍ آخر" }); return null; }
    return { s, plan };
  };

  app.patch("/api/installments/:id", isAuthenticated, async (req, res) => {
    const m = await managedPlan(req, res);
    if (!m) return;
    const parsed = parseInstallmentInput(req.body, baghdadTodayYmd(), { partial: true });
    if (!parsed.ok) return res.status(400).json({ message: parsed.error });
    if (Object.keys(parsed.value).length === 0) return res.status(400).json({ message: "لم يتغيّر شيء" });
    try {
      const { before, after } = await store.updatePlan(m.plan.id, parsed.value, m.s?.displayName ?? null);
      await logAudit({ entityType: "installment_plan", entityId: m.plan.id, action: "update", userId: m.s?.userId ?? null,
        userName: m.s?.displayName ?? null, branchId: m.plan.branchId, oldValues: before, newValues: after,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
      res.json(await store.getPlan(m.plan.id, baghdadTodayYmd()));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/installments/:id/cancel", isAuthenticated, async (req, res) => {
    const m = await managedPlan(req, res);
    if (!m) return;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (reason.length < 3) return res.status(400).json({ message: "اكتب سبب إلغاء الخطّة" });
    try {
      const { before, after } = await store.cancelPlan(m.plan.id, reason, m.s?.displayName ?? null);
      await logAudit({ entityType: "installment_plan", entityId: m.plan.id, action: "cancel", userId: m.s?.userId ?? null,
        userName: m.s?.displayName ?? null, branchId: m.plan.branchId, oldValues: before, newValues: after, notes: reason,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
      res.json(await store.getPlan(m.plan.id, baghdadTodayYmd()));
    } catch (e) { fail(res, e); }
  });
}
