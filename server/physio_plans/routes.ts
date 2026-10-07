// **خطّةُ العلاج الطبيعي للمريض** (ترحيل ١٠٩، §4.cm) — النقاط. كلُّ كتابةٍ بسطر تدقيق.
//
//   GET  /api/patients/:patientId/physio-plans   — خططُ المريض (قراءة؛ والمنفّذُ يرى المعتمَدة والموقوفة وحدهما)
//   POST /api/patients/:patientId/physio-plans   — خطّةٌ جديدة مسوّدةً، من بروتوكولٍ أو بلا (`canWritePlans`)
//   GET  /api/physio/plans?view=pending|assigned — الاعتماداتُ (للمعتمِد) · المسندةُ إليّ
//   GET  /api/physio/plans/:id                   — الخطّةُ كاملة
//   PUT  /api/physio/plans/:id                   — تعديلٌ كامل؛ المعتمَدةُ تعود إلى الاعتماد بيد غير المعتمِد
//   POST /api/physio/plans/:id/submit|approve|return|stop
//   DELETE /api/physio/plans/:id              — للمسؤول والمشرف العام حصراً
//   POST /api/physio/plans/:id/change-protocol — تغييرُ نوع الخطّة (بروتوكولٌ آخر)، لهما حصراً
//   GET  /api/physio/plans/:id/assignee-candidates · PUT /api/physio/plans/:id/assignees
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession, accessibleBranchesFor } from "../sessions_module/permissions";
import { scopeReachesPatient } from "../patients/branch_access";
import { storage } from "../storage";
import {
  canApprovePlans, canDeletePlans, canReadPlans, canWritePlans, planStatusAfterEdit, planVisibleTo, PLAN_NOT_FOUND,
} from "@shared/physio_plans";
import * as store from "./store";

function fail(res: any, e: unknown) {
  if (e instanceof store.PlanError) return res.status(e.status).json({ error: e.message });
  console.error("[physio-plans]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

const text = (v: unknown, max = 8000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const intIn = (v: unknown, lo: number, hi: number): number | null | "bad" => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : "bad";
};

/** يطبّع جسمَ الخطّة — أو يُرجع رسالةَ الخطأ. */
export function parsePlanBody(b: any): store.PlanInput | string {
  const titleAr = text(b?.titleAr, 300);
  if (!titleAr) return "اكتب عنوانَ الخطّة";
  const sessionsPerWeek = intIn(b?.sessionsPerWeek, 1, 14);
  const durationWeeks = intIn(b?.durationWeeks, 1, 104);
  const sessionMinutes = intIn(b?.sessionMinutes, 5, 240);
  if (sessionsPerWeek === "bad" || durationWeeks === "bad" || sessionMinutes === "bad") return "الجلسات في الأسبوع ١–١٤، والأسابيع ١–١٠٤، والدقائق ٥–٢٤٠";
  if (!Array.isArray(b?.devices) || b.devices.length > 40) return "قائمةُ الأجهزة غير صالحة";
  const seen = new Set<number>();
  const devices: store.PlanDeviceInput[] = [];
  for (const d of b.devices) {
    const deviceId = Number(d?.deviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0 || seen.has(deviceId)) return "جهازٌ غير صالح أو مكرّر";
    seen.add(deviceId);
    const minutes = intIn(d?.minutes, 1, 120);
    if (minutes === "bad") return "دقائقُ الجهاز ١–١٢٠";
    devices.push({ deviceId, minutes, parameters: text(d?.parameters, 1000), parametersEn: text(d?.parametersEn, 1000),
      note: text(d?.note, 1000), noteEn: text(d?.noteEn, 1000) });
  }
  return {
    titleAr, titleEn: text(b?.titleEn, 300),
    goals: text(b?.goals), goalsEn: text(b?.goalsEn), exercises: text(b?.exercises), exercisesEn: text(b?.exercisesEn),
    precautions: text(b?.precautions), precautionsEn: text(b?.precautionsEn), notes: text(b?.notes), notesEn: text(b?.notesEn),
    sessionsPerWeek, durationWeeks, sessionMinutes, devices,
  };
}

export function registerPhysioPlanRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actor = (s: any): store.Actor => ({ userId: s.userId ?? null, name: s.displayName ?? null });
  const audit = (req: any, s: any, p: { entityId: number; action: string; branchId: number | null; oldValues?: any; newValues?: any; notes?: string }) =>
    logAudit({ entityType: "physio_plan", ...p, userId: s.userId ?? null, userName: s.displayName ?? null,
      ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
  const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
  //  **المشرفُ العام على كلّ الفروع** (§4.cg) — نطاقُه في الخطط كالمسؤول.
  const scopeOf = (req: any, s: any): number[] | null => (s.permissions?.canSupervisePhysio ? null : accessibleBranchesFor(req));

  /** الخطّةُ وحارساها: قراءةُ المريض بنطاق السائل، ورؤيةُ حالتها. */
  async function loadPlan(req: any, res: any, id: number | null) {
    const s = sess(req);
    if (!canReadPlans(s)) { res.status(403).json({ error: "خططُ العلاج الطبيعي لقسمه والمستشيرين" }); return null; }
    if (!id) { res.status(400).json({ error: "رقمٌ غير صالح" }); return null; }
    const row = await store.getPlanRow(id);
    if (!row) { res.status(404).json({ error: PLAN_NOT_FOUND }); return null; }
    const patient = await storage.getPatient(row.patientId);
    const scope = scopeOf(req, s);
    const reaches = patient && (scope === null || scope.includes(row.branchId) || await scopeReachesPatient(scope, patient as any));
    if (!reaches || !planVisibleTo(s, row.status)) { res.status(404).json({ error: PLAN_NOT_FOUND }); return null; }
    return { s, row };
  }

  app.get("/api/patients/:patientId/physio-plans", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadPlans(s)) return res.status(403).json({ error: "خططُ العلاج الطبيعي لقسمه والمستشيرين" });
    const patientId = idOf(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const patient = await storage.getPatient(patientId);
      if (!patient || !(await scopeReachesPatient(scopeOf(req, s), patient as any))) return res.status(404).json({ error: "المريض غير موجود" });
      const rows = (await store.listPatientPlans(patientId)).filter((p) => planVisibleTo(s, p.status));
      res.json({ plans: rows, canWrite: canWritePlans(s), canApprove: canApprovePlans(s), canDelete: canDeletePlans(s) });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/patients/:patientId/physio-plans", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canWritePlans(s)) return res.status(403).json({ error: "يكتب الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
    const patientId = idOf(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const protocolId = req.body?.protocolId == null || req.body.protocolId === "" ? null : idOf(req.body.protocolId);
    if (req.body?.protocolId != null && req.body.protocolId !== "" && !protocolId) return res.status(400).json({ error: "بروتوكولٌ غير صالح" });
    try {
      const patient = await storage.getPatient(patientId);
      const scope = scopeOf(req, s);
      if (!patient || !(await scopeReachesPatient(scope, patient as any))) return res.status(404).json({ error: "المريض غير موجود" });
      //  **فرعُ الخطّة فرعُ العمل** — الفرعُ النشط إن كان يصل الملفّ، وإلّا فرعُ التسجيل.
      const active = Number(s.branchId) || null;
      const branchId = active && await scopeReachesPatient([active], patient as any) ? active : Number(patient.branchId);
      const row = await store.createPlan({ patientId, branchId, protocolId, titleAr: text(req.body?.titleAr, 300), actor: actor(s) });
      await audit(req, s, { entityId: row.id, action: "create", branchId, newValues: row });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadPlans(s)) return res.status(403).json({ error: "خططُ العلاج الطبيعي لقسمه والمستشيرين" });
    const view = req.query.view === "assigned" ? "assigned" : "pending";
    if (view === "pending" && !canApprovePlans(s)) return res.status(403).json({ error: "الاعتماداتُ للمسؤول والمشرف العام" });
    try {
      const rows = await store.listPlans(view === "pending"
        ? { status: "pending", branchIds: scopeOf(req, s) }
        : { assigneeUserId: Number(s.userId), branchIds: scopeOf(req, s) });
      res.json({ view, plans: rows.filter((p) => planVisibleTo(s, p.status)) });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const plan = await store.getPlan(l.row.id);
      res.json({ ...plan, canWrite: canWritePlans(l.s), canApprove: canApprovePlans(l.s), canDelete: canDeletePlans(l.s) });
    } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يعدّل الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const input = parsePlanBody(req.body);
      if (typeof input === "string") return res.status(400).json({ error: input });
      const r = await store.updatePlan(l.row.id, input, (cur) => planStatusAfterEdit(cur, l.s), actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "update", branchId: l.row.branchId, oldValues: r.before,
        newValues: { ...r.after, devices: input.devices },
        notes: r.demoted ? "عُدّلت خطّةٌ معتمَدة فعادت إلى الاعتماد" : undefined });
      res.json({ ...r.after, demoted: r.demoted });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/plans/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يرسل الخطّةَ كاتبُها" });
      const row = await store.submitPlan(l.row.id, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "submit", branchId: l.row.branchId, newValues: { status: row.status } });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  for (const decision of ["approve", "return"] as const) {
    app.post(`/api/physio/plans/:id/${decision}`, isAuthenticated, async (req: any, res) => {
      try {
        const l = await loadPlan(req, res, idOf(req.params.id));
        if (!l) return;
        if (!canApprovePlans(l.s)) return res.status(403).json({ error: "يعتمد الخطّةَ المسؤولُ أو المشرفُ العام" });
        const note = text(req.body?.note, 2000);
        if (decision === "return" && !note) return res.status(400).json({ error: "اكتب ملاحظةَ الإعادة" });
        const r = await store.decidePlan(l.row.id, decision, note, actor(l.s));
        await audit(req, l.s, { entityId: l.row.id, action: decision, branchId: l.row.branchId,
          oldValues: { status: r.before.status }, newValues: { status: r.after.status, returnNote: r.after.returnNote } });
        res.json(r.after);
      } catch (e) { fail(res, e); }
    });
  }

  app.post("/api/physio/plans/:id/stop", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يوقف الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const reason = text(req.body?.reason, 2000);
      if (!reason) return res.status(400).json({ error: "اكتب سببَ الإيقاف" });
      const r = await store.stopPlan(l.row.id, reason, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "stop", branchId: l.row.branchId,
        oldValues: { status: r.before.status }, newValues: { status: "stopped", stopReason: reason } });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  //  **تغييرُ نوع الخطّة — للمسؤول والمشرف العام حصراً** (طلبُ المالك ٢٠٢٦-١٠-٠٧): بروتوكولٌ آخر يملؤها، لا تعديلُ مواصفاتها.
  app.post("/api/physio/plans/:id/change-protocol", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canDeletePlans(l.s)) return res.status(403).json({ error: "يغيّر نوعَ الخطّة المسؤولُ أو المشرفُ العام حصراً" });
      const protocolId = idOf(req.body?.protocolId);
      if (!protocolId) return res.status(400).json({ error: "اختر البروتوكول" });
      const r = await store.changePlanProtocol(l.row.id, protocolId, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "change_protocol", branchId: l.row.branchId,
        oldValues: { protocolId: r.before.protocolId, titleAr: r.before.titleAr }, newValues: { protocolId: r.after.protocolId, titleAr: r.after.titleAr },
        notes: `تغيير نوع الخطة من «${r.before.titleAr}» إلى «${r.after.titleAr}»` });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  //  **الحذف — للمسؤول والمشرف العام حصراً** (طلبُ المالك ٢٠٢٦-١٠-٠٧). والأخصائيُّ يوقف ولا يحذف.
  app.delete("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canDeletePlans(l.s)) return res.status(403).json({ error: "يحذف الخطّةَ المسؤولُ أو المشرفُ العام حصراً" });
      const removed = await store.deletePlan(l.row.id);
      await audit(req, l.s, { entityId: l.row.id, action: "delete", branchId: l.row.branchId, oldValues: removed,
        notes: `حذف خطة العلاج الطبيعي «${l.row.titleAr}» للمريض #${l.row.patientId}` });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans/:id/assignee-candidates", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يُسند الخطّةَ كاتبُها" });
      res.json(await store.assigneeCandidates(l.row.branchId));
    } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/plans/:id/assignees", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يُسند الخطّةَ كاتبُها" });
      const ids = Array.isArray(req.body?.userIds) ? req.body.userIds.map(Number) : null;
      if (!ids || ids.length > 20 || ids.some((n: number) => !Number.isInteger(n) || n <= 0)) return res.status(400).json({ error: "قائمةٌ غير صالحة" });
      const uniq = Array.from(new Set<number>(ids));
      const r = await store.setAssignees(l.row.id, uniq, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "assign", branchId: l.row.branchId, oldValues: { userIds: r.before }, newValues: { userIds: r.after } });
      res.json({ userIds: r.after });
    } catch (e) { fail(res, e); }
  });
}
