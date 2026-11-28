// **نقاطُ وكيل Opus** (§4.ha الفقرة ٨). كلُّ كتابةٍ بسطر تدقيقٍ في معاملتها. والمعتمِدُ (`canApproveProtocols` — المسؤولُ والمشرفُ العام) على كلّ الفروع،
// وغيرُه بنطاق فروعه على ملفّ المريض (`scopeReachesPatient`).
//
//   POST /api/physio/exams/:examId/opus-plan        — «اكتب الخطّة بـ Opus» / «أعد»: كاتبُ معاينة العلاج الطبيعي في النطاق أو المعتمِد ⟵ ٢٠٢ {job}
//   GET  /api/physio/exams/:examId/opus-job         — حالُ الوظيفة (بلا نتيجتها الداخلية) وما يجوز للسائل
//   POST /api/physio/opus-jobs/:id/answers          — أجوبةُ الأسئلة ⟵ ٢٠٢ والوظيفةُ للطابور
//   POST /api/physio/opus-jobs/:id/cancel           — «إلغاء»
//   GET  /api/physio/plans/:id/opus-proposal        — «الخطّة المقترحة» للمعتمِد وحده
//   POST /api/physio/plans/:id/opus-discard         — حذفُ خطّة Opus منتظرة بيد معتمِد
//   GET  /api/physio/opus-plans?view=pending|stale|decided — طابورُ خطط Opus للمعتمِد
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { getSession, accessibleBranchesFor } from "../sessions_module/permissions";
import { scopeReachesPatient } from "../patients/branch_access";
import { storage } from "../storage";
import { canApproveProtocols } from "@shared/physio_protocols";
import { canReadPlans } from "@shared/physio_plans";
import { isActiveJobStatus } from "@shared/physio_agent";
import { doctorSpecialties } from "../medical/store";
import { agentEnabled } from "./model";
import * as store from "./store";
import * as plans from "./plans";
import { nudgeWorkerNow } from "./reconcile";
import { loadExam } from "./context";
import * as versions from "./versions";

const SKIP_STATUS: Record<string, number> = {
  disabled: 503, not_v2: 409, exam_cancelled: 409, patient_deleted: 409, not_newest: 409, gate_closed: 409, job_active: 409,
  has_active_plan: 409, opus_plan_pending: 409, branch_unavailable: 409, already_decided: 409, already_planned: 409, already_tried: 409,
};

export function registerPhysioAgentRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actorOf = (req: any): store.Actor => {
    const s = sess(req);
    return { userId: s.userId ?? null, name: s.displayName ?? null, ip: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null };
  };
  const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
  const fail = (res: any, e: unknown) => {
    if (e instanceof store.AgentJobError || e instanceof plans.OpusPlanError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error("[physio-agent]", e);
    return res.status(500).json({ error: "تعذّر تنفيذ الطلب" });
  };
  const writesPhysioExam = async (s: any) => (await doctorSpecialties(s.userId ?? null)).includes("physiotherapy");
  /** في نطاق السائل؟ — المعتمِدُ على كلّ الفروع. */
  const reaches = async (req: any, patientId: number) => {
    const s = sess(req);
    if (canApproveProtocols(s)) return true;
    const patient = await storage.getPatient(patientId);
    return Boolean(patient) && await scopeReachesPatient(accessibleBranchesFor(req), patient as any);
  };
  /** **مَن يجيب ويُلغي**: كاتبُ معاينة العلاج الطبيعي في النطاق، أو المعتمِد. */
  const mayAnswer = (req: any) => async (j: store.JobRecord) => canApproveProtocols(sess(req)) || ((await writesPhysioExam(sess(req))) && (await reaches(req, j.patientId)));

  app.post("/api/physio/exams/:examId/opus-plan", isAuthenticated, async (req: any, res) => {
    const examId = idOf(req.params.examId);
    if (!examId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const s = sess(req);
    const approver = canApproveProtocols(s);
    try {
      if (!agentEnabled()) return res.status(503).json({ error: "وكيلُ Opus غيرُ مفعّل (لا مفتاحَ لخدمة Claude)", code: "disabled" });
      const exam = await loadExam(db, examId);
      if (!exam) return res.status(404).json({ error: "المعاينةُ غير موجودة", code: "exam_not_found" });
      if (!approver && !(await writesPhysioExam(s))) return res.status(403).json({ error: "يطلبها كاتبُ معاينة العلاج الطبيعي أو المعتمِد", code: "not_writer" });
      if (!(await reaches(req, exam.patientId))) return res.status(403).json({ error: "لا يمكنك العمل على مريضٍ خارج فروعك", code: "branch_scope" });
      const discardPlanId = approver ? idOf(req.body?.discardPlanId) : null;
      const r = await db.transaction(async (tx) => {
        await store.lockPatientAgent(tx, exam.patientId);
        return store.enqueueTx(tx, { examId, trigger: "manual", actor: actorOf(req), discardPlanId });
      });
      if ("skipped" in r) return res.status(SKIP_STATUS[r.skipped] ?? 409).json({ error: r.reason, code: r.skipped, job: r.existing ? store.jobView(r.existing) : null });
      nudgeWorkerNow();
      await store.signalJob(r.job);
      res.status(202).json({ job: store.jobView(r.job) });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/exams/:examId/opus-job", isAuthenticated, async (req: any, res) => {
    const examId = idOf(req.params.examId);
    if (!examId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const s = sess(req);
    try {
      const writer = await writesPhysioExam(s);
      if (!canReadPlans(s) && !writer) return res.status(403).json({ error: "لقسم العلاج الطبيعي" });
      const exam = await loadExam(db, examId);
      if (!exam || !(await reaches(req, exam.patientId))) return res.status(404).json({ error: "المعاينةُ غير موجودة" });
      const job = await store.latestJobOfExam(examId);
      const approver = canApproveProtocols(s);
      const answerer = approver || writer;
      const planId = job ? await store.planIdOfJob(job.id) : null;
      //  حالُ الخطّة وحدها (منتظرة أم اعتُمدت) — فيقول اللوحُ لغير المعتمِد «بانتظار الاعتماد» أو «اعتُمدت» بلا ما فيها.
      const planStatus = planId ? ((await db.execute(sql`SELECT status FROM physio_plans WHERE id = ${planId}`)) as any).rows?.[0]?.status ?? null : null;
      const active = Boolean(job && isActiveJobStatus(job.status));
      //  ما يردّ به الخادمُ «اكتب» الآن — فلا يُعرض زرٌّ يردّه ٤٠٩ (معاينةٌ أقدم، خطّةٌ قائمة، خطّةُ Opus تنتظر…)، ويُقال السببُ مكانه.
      const runBlocked = answerer && !active ? await store.runBlocker(db, examId) : null;
      //  قيدُ المعتمِد على هذه المعاينة (ملاحظةُ اعتماد العلامة الحمراء) — أوّلُ ما يقرؤه Opus، فيُقال على اللوح.
      const approval = ((await db.execute(sql`SELECT decision_note FROM physio_exam_red_flag_reviews WHERE exam_id = ${examId} AND status = 'approved'
          ORDER BY decided_at DESC NULLS LAST, id DESC LIMIT 1`)) as any).rows?.[0];
      //  §4.hb — وظيفةُ «تعديل» طلبُ معتمِد: يلغيها معتمِدٌ وحده، وملاحظتُه لا تُعرض لغيره.
      const revise = job?.kind === "revise";
      res.json({
        job: job ? store.jobView(job, planId, { approver }) : null, planStatus,
        approvalNote: approval?.decision_note ? String(approval.decision_note) : null,
        enabled: agentEnabled(), canRun: answerer && !active && !runBlocked, runBlocked,
        canAnswer: Boolean(job && job.status === "needs_answers" && answerer && !revise),
        canCancel: Boolean(job && isActiveJobStatus(job.status) && (revise ? approver : answerer)),
        canSeeProposal: approver,
      });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/opus-jobs/:id/answers", isAuthenticated, async (req: any, res) => {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const job = await store.answerQuestions(id, req.body?.answers, actorOf(req), mayAnswer(req));
      nudgeWorkerNow();
      res.status(202).json({ job: store.jobView(job, null, { approver: canApproveProtocols(sess(req)) }) });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/opus-jobs/:id/cancel", isAuthenticated, async (req: any, res) => {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const approver = canApproveProtocols(sess(req));
      res.json({ job: store.jobView(await store.cancelJob(id, actorOf(req), mayAnswer(req), approver), null, { approver }) });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans/:id/opus-proposal", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "«الخطّة المقترحة» للمسؤول والمشرف العام" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const p = await plans.opusProposal(id);
      if (!p) return res.status(404).json({ error: "الخطّة غير موجودة" });
      res.json(p);
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/plans/:id/opus-discard", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "يحذفها المسؤولُ أو المشرفُ العام" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      await plans.discardOpusPlan(id, actorOf(req));
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/opus-plans", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "خططُ Opus للمسؤول والمشرف العام" });
    try {
      //  §4.hb — «تعديلاتٌ مقترحة»: اقتراحاتُ Opus المنتظرة على خططٍ معتمَدة قائمة.
      if (req.query?.view === "proposals") return res.json({ view: "proposals", rows: await plans.listOpusProposals() });
      const view = req.query?.view === "stale" ? "stale" : req.query?.view === "decided" ? "decided" : "pending";
      res.json({ view, rows: await plans.listOpusPlans(view) });
    } catch (e) { fail(res, e); }
  });

  // ══ §4.hb — التعديلُ بعد الاعتماد: حالُه واقتراحُ Opus (المعتمِد وحده) ═════════════════════════════════
  const refusedRes = (res: any, r: versions.Refused) => res.status(r.status).json({ error: r.error, code: r.code, ...(r.extra ?? {}) });
  app.get("/api/physio/plans/:id/opus-revision", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "تعديلُ خطّة Opus للمسؤول والمشرف العام" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const v = await versions.opusRevisionView(id);
      if (!v) return res.status(404).json({ error: "الخطّة غير موجودة" });
      res.json(v);
    } catch (e) { fail(res, e); }
  });
  app.post("/api/physio/opus-jobs/:id/proposal/save", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "يحفظ اقتراحَ Opus المسؤولُ أو المشرفُ العام", code: "approver_only" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const r = await versions.acceptProposal(id, req.body, actorOf(req));
      if (!r.ok) return refusedRes(res, r);
      res.json({ version: r.version, plan: r.plan });
    } catch (e) { fail(res, e); }
  });
  app.post("/api/physio/opus-jobs/:id/proposal/discard", isAuthenticated, async (req: any, res) => {
    if (!canApproveProtocols(sess(req))) return res.status(403).json({ error: "يتجاهل اقتراحَ Opus المسؤولُ أو المشرفُ العام", code: "approver_only" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const r = await versions.discardProposal(id, req.body, actorOf(req));
      if (!r.ok) return refusedRes(res, r);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });
}
