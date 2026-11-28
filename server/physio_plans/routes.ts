// **خطّةُ العلاج الطبيعي للمريض** (ترحيل ١٠٩، §4.cm) — النقاط. كلُّ كتابةٍ بسطر تدقيق.
//
//   GET  /api/patients/:patientId/physio-plans   — خططُ المريض (قراءة؛ والمنفّذُ يرى المعتمَدة والموقوفة وحدهما)
//   POST /api/patients/:patientId/physio-plans   — خطّةٌ جديدة مسوّدةً، من بروتوكولٍ أو بلا (`canWritePlans`)
//   GET  /api/physio/plans?view=pending|review|assigned — الاعتماداتُ · «للمراجعة» (للمعتمِد، §4.cz) · المسندةُ إليّ
//   GET  /api/physio/plans/:id                   — الخطّةُ كاملة
//   PUT  /api/physio/plans/:id/phases            — مراحلُ الخطّة وتمارينُها لهذا المريض (§4.dd) — البروتوكولُ لا يُمَسّ، والحالةُ بقاعدة التعديل
//   PUT  /api/physio/plans/:id                   — تعديلٌ كامل؛ المعتمَدةُ تبقى تُنفَّذ بيد أيّ كاتب، وبيد الأخصائيّ تعود لمراجعة المشرف (§4.do)
//   PUT|DELETE /api/physio/plans/:id/measures    — مقاييسُ هذه الخطّة لمريضها، أو العودةُ إلى مقاييس بروتوكولها (§4.do)
//   POST /api/physio/plans/:id/submit|approve|return|stop
//   POST /api/physio/plans/:id/activate          — «بدء العلاج» بيد كاتبها على أيّ بروتوكول (§4.cz، و§4.do)
//   POST /api/physio/plans/:id/review            — «موافقة المشرف» على خطّةٍ بدأها كاتبُها (§4.cz)
//   DELETE /api/physio/plans/:id              — للمسؤول والمشرف العام حصراً
//   POST /api/physio/plans/:id/change-protocol — تغييرُ نوع الخطّة (بروتوكولٌ آخر)، لهما حصراً
//   GET  /api/physio/plans/:id/assignee-candidates · PUT /api/physio/plans/:id/assignees
//   POST /api/physio/plans/:id/home-sheet/telegram — ورقةُ تمارين البيت (PDF الصفحة المطبوعة) إلى تلغرام المريض (§4.ds)
import type { Express } from "express";
import { sql } from "drizzle-orm";
import multer from "multer";
import { logAudit } from "../accounting/ledger";
import { db } from "../db";
import { getSession, accessibleBranchesFor } from "../sessions_module/permissions";
import { scopeReachesPatient } from "../patients/branch_access";
import { storage } from "../storage";
import {
  canApprovePlans, canDeletePlans, canReadPlans, canWritePlans, isPlanClosed, planStatusAfterEdit, planVisibleTo, PLAN_NOT_FOUND,
} from "@shared/physio_plans";
import * as store from "./store";
import * as opusPlans from "../physio_agent/plans";
import { isOpusAwaiting, opusApprovedBlocked, opusAwaitingBlocked, opusPlanStub, planAccessFor } from "@shared/physio_agent";
import * as versions from "../physio_agent/versions";
import { canApproveProtocols } from "@shared/physio_protocols";
import { VERSION_HOW_LABELS } from "@shared/physio_plan_versions";
import { newestV2ExamId } from "../physio_agent/context";
import { nudgeWorkerNow } from "../physio_agent/reconcile";
import { signalJob } from "../physio_agent/store";
import { normalizeSchedule } from "@shared/physio_device_settings";
import * as exec from "./execution";
import * as suggest from "./suggest";
import * as assess from "./assessments";
import * as outcomes from "./outcomes";
import { canAssessPlans, outcomesScope, parseMeasures } from "@shared/physio_assessments";
import { canCancelSessions, canExecutePlans, canSuggestPlans, canWritePlans as canWrite } from "@shared/physio_plans";
import { checkVisitDate, baghdadTodayYmd, mayBackdateVisits } from "@shared/visit_date";
import { DEVICE_TEXT_MAX, doseError, normalizeDose, TOTAL_SESSIONS_MAX } from "@shared/physio_protocols";
import { parsePhasesBody } from "@shared/physio_exercises";
import { HOME_SHEET_MAX_BYTES, homeSheetAllowed, parseIdList } from "@shared/physio_home_sheet";
import { patientBotEnabled } from "../patient_telegram/config";
import * as homeSheet from "./home_sheet";

const homeSheetUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: HOME_SHEET_MAX_BYTES, files: 1, fields: 4 } });

function fail(res: any, e: unknown) {
  if (e instanceof store.PlanError) return res.status(e.status).json({ error: e.message, ...(e.code ? { code: e.code } : {}) });
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
  const totalSessions = intIn(b?.totalSessions, 1, TOTAL_SESSIONS_MAX);
  if (sessionsPerWeek === "bad" || durationWeeks === "bad" || sessionMinutes === "bad") return "الجلسات في الأسبوع ١–١٤، والأسابيع ١–١٠٤، والدقائق ٥–٢٤٠";
  if (totalSessions === "bad") return `عددُ الجلسات ١–${TOTAL_SESSIONS_MAX}`;
  const dose = normalizeDose({ sessionsPerWeek, durationWeeks, totalSessions });
  const tooLong = doseError(dose);
  if (tooLong) return tooLong;
  if (!Array.isArray(b?.devices) || b.devices.length > 40) return "قائمةُ الأجهزة غير صالحة";
  const seen = new Set<number>();
  const devices: store.PlanDeviceInput[] = [];
  for (const d of b.devices) {
    const deviceId = Number(d?.deviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0 || seen.has(deviceId)) return "جهازٌ غير صالح أو مكرّر";
    seen.add(deviceId);
    const minutes = intIn(d?.minutes, 1, 120);
    if (minutes === "bad") return "دقائقُ الجهاز ١–١٢٠";
    //  ترحيل ١٢٢ — أساسيٌّ أو مساعدٌ بالتناوب؛ والغائبُ (شاشةٌ أقدم) أساسيٌّ كما كانت الخطّةُ تُنفَّذ.
    if (d?.centreUse !== undefined && d.centreUse !== null && d.centreUse !== "core" && d.centreUse !== "adjunct") return "استعمالُ الجهاز في الخطّة: أساسيّ أو مساعد";
    //  §4.dn — الموعدُ الدوريّ لهذا المريض (كلّ كم يوماً وكم مرّة).
    const schedule = normalizeSchedule(d?.everyDays, d?.times);
    if (typeof schedule === "string") return schedule;
    devices.push({ deviceId, minutes, parameters: text(d?.parameters, DEVICE_TEXT_MAX), parametersEn: text(d?.parametersEn, DEVICE_TEXT_MAX),
      note: text(d?.note, DEVICE_TEXT_MAX), noteEn: text(d?.noteEn, DEVICE_TEXT_MAX), centreUse: d?.centreUse === "adjunct" ? "adjunct" : "core", ...schedule });
  }
  return {
    titleAr, titleEn: text(b?.titleEn, 300),
    goals: text(b?.goals), goalsEn: text(b?.goalsEn), exercises: text(b?.exercises), exercisesEn: text(b?.exercisesEn),
    precautions: text(b?.precautions), precautionsEn: text(b?.precautionsEn), notes: text(b?.notes), notesEn: text(b?.notesEn),
    //  ترحيل ١٢٣ (§4.dd) — عددُ الجلسات أساسُ الجرعة، والأسابيعُ تُشتقّ منه.
    ...dose, sessionMinutes, devices,
  };
}

export function registerPhysioPlanRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actor = (s: any): store.Actor => ({ userId: s.userId ?? null, name: s.displayName ?? null, isApprover: canApprovePlans(s) });
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
    //  **خطّةُ Opus المنتظرة للمعتمِد وحده** (§4.ha): غيرُه يرى سطرَها في القائمة ولا يفتحها.
    if (!reaches || planAccessFor(s, row) !== "full") { res.status(404).json({ error: PLAN_NOT_FOUND }); return null; }
    //  **وقبل الاعتماد لا تُعدَّل ولا تُنفَّذ** — إلّا الاعتمادُ والحذفُ بيد معتمِد؛ و«الإعادة إلى Opus» في المرحلة القادمة.
    const last = String(req.path ?? "").split("/").filter(Boolean).pop() ?? "";
    const onPlan = /^\d+$/.test(last);
    if (req.method !== "GET" && isOpusAwaiting(row)) {
      if (last === "return") { res.status(409).json({ error: "خطّةُ Opus تُعاد إليه بملاحظة من «أعِده إلى Opus»", code: "opus_use_opus_return" }); return null; }
      const action = req.method === "DELETE" && onPlan ? "delete" : last;
      const why = opusAwaitingBlocked(row, action);
      if (why) { res.status(409).json({ error: why, code: "opus_plan_locked" }); return null; }
    }
    //  §4.hb D5 — **خطّةُ Opus بعد الاعتماد** تُعدَّل بنسخٍ مرقّمة وحدها: أبوابُ التعديل القديمة ٤٠٩ لأيّ أحد، والحذفُ للمعتمِد وحده.
    if (req.method !== "GET" && row.origin === "opus" && !isOpusAwaiting(row)) {
      const action = req.method === "PUT" && onPlan ? "update" : last;
      const why = opusApprovedBlocked(row, action);
      if (why) { res.status(409).json({ error: why, code: "opus_plan_versioned" }); return null; }
      if (req.method === "DELETE" && onPlan && !canApproveProtocols(s)) { res.status(403).json({ error: "تحذف خطّةَ Opus المسؤولُ أو المشرفُ العام", code: "opus_delete_approver_only" }); return null; }
    }
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
      const scope = scopeOf(req, s);
      //  «تنفيذ جلسة» لكلّ خطّةٍ معتمَدة في فرعٍ يعمل فيه السائل (§4.cn) — والخادمُ يحرس التنفيذَ نفسَه ثانيةً.
      //  خطّةُ Opus المنتظرة: كاملةً للمعتمِد، وسطراً بلا عنوانٍ ولا تنفيذٍ لغيره (§4.ha).
      const rows = (await store.listPatientPlans(patientId)).flatMap((p): any[] => {
        const access = planAccessFor(s, p);
        if (access === "none") return [];
        if (access === "stub") return [opusPlanStub({ id: p.id, patientId, status: p.status, createdAt: p.createdAt })];
        return [{ ...p, canExecute: p.status === "approved" && canExecutePlans(s) && (scope === null || scope.includes(p.branchId)) }];
      });
      //  «اقترح خطّة» (§4.co) — لكاتبي الخطط، ومعه ما سيقرؤه المساعدُ من المعاينة كي يرى الأخصائيُّ مصدرَه قبل الضغط.
      //  **ومعه التقييمُ الأوّليّ** (§4.da المرحلة ٤): سطرُه وبنودُ خطّة العلاج التي أشّرها الفاحص — تُعرَض بجانب اختيار البروتوكول.
      let suggestInfo: {
        enabled: boolean; exam: { date: string; diagnosis: string | null } | null;
        assessment: { summary: string | null; planItems: string[]; painWorst: number | null } | null;
      } | null = null;
      if (canSuggestPlans(s)) {
        const ctx = await suggest.patientContext(patientId);
        suggestInfo = {
          enabled: suggest.suggestEnabled(), exam: ctx.exam ? { date: ctx.exam.date, diagnosis: ctx.exam.diagnosis ?? ctx.exam.chiefComplaint } : null,
          assessment: ctx.assessmentView,
        };
      }
      res.json({ plans: rows, canWrite: canWritePlans(s), canApprove: canApprovePlans(s), canDelete: canDeletePlans(s), suggest: suggestInfo });
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

  //  **«اقترح خطّة» بالمساعد** (§4.co) — لكاتبي الخطط. يُحفَظ الاقتراحُ ولا تُنشأ خطّة؛ والفرعُ قاعدةُ «خطة جديدة» نفسُها.
  app.post("/api/patients/:patientId/physio-plans/suggest", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canSuggestPlans(s)) return res.status(403).json({ error: "يطلب الاقتراحَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
    const patientId = idOf(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    if (!suggest.suggestEnabled()) return res.status(503).json({ error: "المساعدُ الذكيّ غير مفعّل" });
    const protocolId = req.body?.protocolId == null || req.body.protocolId === "" ? null : idOf(req.body.protocolId);
    if (req.body?.protocolId != null && req.body.protocolId !== "" && !protocolId) return res.status(400).json({ error: "بروتوكولٌ غير صالح" });
    try {
      const patient = await storage.getPatient(patientId);
      if (!patient || !(await scopeReachesPatient(scopeOf(req, s), patient as any))) return res.status(404).json({ error: "المريض غير موجود" });
      const active = Number(s.branchId) || null;
      const branchId = active && await scopeReachesPatient([active], patient as any) ? active : Number(patient.branchId);
      res.json(await suggest.suggestPlan({
        patientId, branchId, note: text(req.body?.note, 1000), protocolId, fromSuggestionId: idOf(req.body?.fromSuggestionId), actor: actor(s),
      }));
    } catch (e) { fail(res, e); }
  });

  //  **قبولُ الاقتراح** — يفتح مسوّدةً يعدّلها الأخصائيُّ ويرسلها للاعتماد كالعادة. مرّةً واحدة.
  app.post("/api/physio/suggestions/:id/accept", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canSuggestPlans(s)) return res.status(403).json({ error: "يقبل الاقتراحَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const sg = await suggest.getSuggestion(id);
      const patient = sg ? await storage.getPatient(sg.patientId) : null;
      if (!sg || !patient || !(await scopeReachesPatient(scopeOf(req, s), patient as any))) return res.status(404).json({ error: "الاقتراح غير موجود" });
      const row = await store.createPlanFromSuggestion(id, actor(s));
      await audit(req, s, { entityId: row.id, action: "create", branchId: row.branchId, newValues: { ...row, suggestionId: id } });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadPlans(s)) return res.status(403).json({ error: "خططُ العلاج الطبيعي لقسمه والمستشيرين" });
    const view = req.query.view === "assigned" ? "assigned" : req.query.view === "review" ? "review" : "pending";
    if (view !== "assigned" && !canApprovePlans(s)) return res.status(403).json({ error: "الاعتماداتُ والمراجعةُ للمسؤول والمشرف العام" });
    try {
      const rows = await store.listPlans(view === "pending"
        ? { status: "pending", branchIds: scopeOf(req, s), excludeOpus: true }
        : view === "review"
          ? { reviewAwaiting: true, branchIds: scopeOf(req, s) }
          : { assigneeUserId: Number(s.userId), branchIds: scopeOf(req, s) });
      res.json({ view, plans: rows.filter((p) => planVisibleTo(s, p.status)) });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const plan = await store.getPlan(l.row.id);
      const scope = scopeOf(req, l.s);
      //  §4.dq — **إعداداتُ جهازٍ ناقصة في البروتوكول** لمن يبدأ الخطّةَ أو يعتمدها: يُطلب منه أن يذكّر المشرفَ العام (والمشرفُ نفسُه يُدَلّ على البروتوكول).
      const writesOrApproves = canWritePlans(l.s) || canApprovePlans(l.s);
      const gaps = writesOrApproves && !isPlanClosed(l.row.status) ? await store.planSettingsGapsFor(l.row) : null;
      res.json({ ...plan, canWrite: canWritePlans(l.s), canApprove: canApprovePlans(l.s), canDelete: canDeletePlans(l.s),
        canExecute: canExecutePlans(l.s) && (scope === null || scope.includes(l.row.branchId)), canCancelSessions: canCancelSessions(l.s),
        aiSuggestion: await suggest.suggestionOfPlan(l.row.id),
        //  §4.ds — ورقةُ تمارين البيت: تُطبع لكلّ قارئ، وتُرسَل عبر تلغرام بيد فريق العلاج في فرعها لمريضٍ مربوط.
        homeSheet: { allowed: homeSheetAllowed(l.row.status), botEnabled: patientBotEnabled(),
          telegramRecipients: await homeSheet.telegramRecipients(l.row.patientId),
          canSend: canExecutePlans(l.s) && (scope === null || scope.includes(l.row.branchId)) },
        settingsGaps: gaps ? { ...gaps, supervisors: gaps.supervisors.map((u) => u.name), youFill: l.s.permissions?.canSupervisePhysio === true } : null,
        ...(await opusPlanFields(l.row, l.s)) });
    } catch (e) { fail(res, e); }
  });

  //  §4.dq — **«ذكّر المشرف»** بإعدادات الجهاز الناقصة في البروتوكول: لمن يكتب الخططَ أو يعتمدها، وبسطر تدقيقٍ على البروتوكول يراه المشرف.
  app.post("/api/physio/plans/:id/remind-settings", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s) && !canApprovePlans(l.s)) return res.status(403).json({ error: "لكاتبي الخطط والمشرف والمسؤول" });
      if (isPlanClosed(l.row.status)) return res.status(409).json({ error: "الخطّةُ منتهية" });
      //  الإرسالُ وسطرُ التدقيق في معاملةٍ واحدة تحت قفل البروتوكول (`remindPlanSettings`).
      res.json(await store.remindPlanSettings(l.row, actor(l.s), { ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null }));
    } catch (e) { fail(res, e); }
  });

  //  §4.ds — **ورقةُ تمارين البيت إلى تلغرام المريض**: الملفُّ من صفحة الطباعة، والمرحلةُ وتمارينُها تُفحص على الخطّة، ونصُّ الرسالة من الخادم.
  //  لفريق العلاج في فرع الخطّة (كمن ينفّذ جلساتها)، وسطرُ تدقيقٍ بما أُرسل ولمن وبصمته.
  app.post("/api/physio/plans/:id/home-sheet/telegram", isAuthenticated, (req: any, res, next) => {
    homeSheetUpload.single("file")(req, res, (err: any) => {
      if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "الورقةُ أكبرُ من الحدّ (١٥ م.ب)" });
      if (err) return res.status(400).json({ error: "تعذّر قراءةُ الورقة المرسَلة" });
      next();
    });
  }, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const scope = scopeOf(req, l.s);
      if (!canExecutePlans(l.s) || !(scope === null || scope.includes(l.row.branchId))) {
        return res.status(403).json({ error: "إرسالُ الورقة للمريض لفريق العلاج الطبيعي في فرع الخطّة" });
      }
      const plan = await store.getPlan(l.row.id);
      const phase = intIn(req.body?.phasePosition, 1, 1000);
      const result = await homeSheet.sendHomeSheet(
        { id: l.row.id, patientId: l.row.patientId, status: l.row.status, branchName: plan?.branchName ?? null, patientCode: plan?.patient?.code ?? null },
        { pdf: req.file?.buffer ?? null, phasePosition: phase === "bad" ? null : phase, exerciseIds: parseIdList(req.body?.exerciseIds) },
        //  **سطرُ المحاولة قبل أن يخرج شيء، كتابةً صارمة** (`tx: db` — خطؤه يصعد): إن تعذّر التدقيقُ لا يُرسَل ملفٌّ للمريض.
        (attempt) => logAudit({ entityType: "physio_plan", entityId: l.row.id, action: "home_sheet_telegram_attempt", branchId: l.row.branchId,
          userId: l.s.userId ?? null, userName: l.s.displayName ?? null, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          newValues: { patientId: l.row.patientId, ...attempt }, notes: `ورقةُ تمارين البيت إلى تلغرام — ${attempt.recipients} حساب`, tx: db }),
      );
      //  وسطرُ النتيجة بعد الإرسال — وتعثّرُه لا يقلب نجاحاً فشلاً (`logAudit` بلا معاملة يسجّل الخطأ ولا يرميه)، فلا إعادةَ تُكرّر الملفّ.
      await audit(req, l.s, { entityId: l.row.id, action: "home_sheet_telegram", branchId: l.row.branchId,
        newValues: { patientId: l.row.patientId, ...result },
        notes: `ورقةُ تمارين البيت عبر تلغرام — وصلت ${result.sent} من ${result.recipients}` });
      if (result.sent === 0) return res.status(502).json({ error: "تعذّر الإرسالُ عبر تلغرام — أعد المحاولة بعد قليل", ...result });
      res.json(result);
    } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يعدّل الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const input = parsePlanBody(req.body);
      if (typeof input === "string") return res.status(400).json({ error: input });
      const r = await store.updatePlan(l.row.id, input, (cur, protocolStatus) => planStatusAfterEdit(cur, l.s, protocolStatus), actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "update", branchId: l.row.branchId, oldValues: r.before,
        newValues: { ...r.after, devices: input.devices },
        notes: r.backToReview ? "عُدّلت خطّةٌ تُنفَّذ — تبقى تُنفَّذ وعادت لمراجعة المشرف" : undefined });
      res.json({ ...r.after, demoted: r.demoted });
    } catch (e) { fail(res, e); }
  });

  //  **مراحلُ الخطّة وتمارينُها لهذا المريض** (ترحيل ١٢٣، §4.dd) — كاتبو الخطط، وبقاعدة مراحل البروتوكول؛ والبروتوكولُ لا يُمَسّ.
  app.put("/api/physio/plans/:id/phases", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يعدّل الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const phases = parsePhasesBody(req.body?.phases);
      if (typeof phases === "string") return res.status(400).json({ error: phases });
      const r = await store.setPlanPhases(l.row.id, phases, (cur, protocolStatus) => planStatusAfterEdit(cur, l.s, protocolStatus), actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "update_phases", branchId: l.row.branchId, oldValues: r.before,
        newValues: { status: r.after.status, phases },
        notes: r.backToReview ? "عُدّلت مراحلُ خطّةٍ تُنفَّذ — تبقى تُنفَّذ وعادت لمراجعة المشرف" : undefined });
      res.json({ status: r.after.status, demoted: r.demoted, backToReview: r.backToReview });
    } catch (e) { fail(res, e); }
  });

  //  **مقاييسُ التقييم لهذه الخطّة** (§4.do — «تغيير المقاييس … مرونة عالية جداً») — كاتبو الخطط، بقاعدة مقاييس البروتوكول نفسِها (`parseMeasures`)؛
  //  والبروتوكولُ لا يُمَسّ. و`DELETE` يعيدها إلى مقاييس بروتوكولها.
  for (const method of ["put", "delete"] as const) {
    app[method]("/api/physio/plans/:id/measures", isAuthenticated, async (req: any, res) => {
      try {
        const l = await loadPlan(req, res, idOf(req.params.id));
        if (!l) return;
        if (!canWritePlans(l.s)) return res.status(403).json({ error: "يعدّل الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
        const list = method === "delete" ? null : parseMeasures(req.body?.measures);
        if (typeof list === "string") return res.status(400).json({ error: list });
        const r = await store.setPlanMeasures(l.row.id, list, (cur, protocolStatus) => planStatusAfterEdit(cur, l.s, protocolStatus), actor(l.s));
        await audit(req, l.s, { entityId: l.row.id, action: list === null ? "reset_measures" : "update_measures", branchId: l.row.branchId,
          oldValues: r.before, newValues: { measuresOwn: r.after.measuresOwn, measures: list, status: r.after.status },
          notes: list === null ? "عادت مقاييسُ الخطّة إلى مقاييس بروتوكولها" : "مقاييسُ هذه الخطّة لمريضها — البروتوكولُ لا يتغيّر" });
        res.json({ measuresOwn: r.after.measuresOwn, measures: await store.effectiveMeasures(r.after), backToReview: r.backToReview });
      } catch (e) { fail(res, e); }
    });
  }

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

  //  **«بدء العلاج»** (§4.cz، و§4.do) — كاتبُ الخطّة يبدؤها بنفسه على أيّ بروتوكول؛ والمشرفُ يُنبَّه ويراجعها بعدها.
  app.post("/api/physio/plans/:id/activate", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canWritePlans(l.s)) return res.status(403).json({ error: "يبدأ الخطّةَ كاتبُها — الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const r = await store.activatePlan(l.row.id, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "activate", branchId: l.row.branchId,
        oldValues: { status: r.before.status }, newValues: { status: r.after.status, reviewStatus: r.after.reviewStatus },
        notes: "بدأها كاتبُها — والمشرفُ يُنبَّه ويراجعها بعدها" });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  //  **«موافقة المشرف»** (§4.cz) — على خطّةٍ بدأها كاتبُها؛ والتعديلُ والإيقافُ والاستبدالُ والحذفُ من أبوابها القائمة.
  app.post("/api/physio/plans/:id/review", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canApprovePlans(l.s)) return res.status(403).json({ error: "يراجع الخطّةَ المسؤولُ أو المشرفُ العام" });
      const r = await store.reviewPlan(l.row.id, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "review", branchId: l.row.branchId,
        oldValues: { reviewStatus: r.before.reviewStatus }, newValues: { reviewStatus: r.after.reviewStatus } });
      res.json(r.after);
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
        //  **خطّةُ Opus** (§4.ha ٧.٤): من «الخطّة المقترحة» وبإقرارٍ بالملاحظات الكبيرة، والتدقيقُ في معاملتها.
        if (decision === "approve" && isOpusAwaiting(l.row)) {
          const r = await opusPlans.approveOpusPlan(l.row.id, req.body, { userId: l.s.userId ?? null, name: l.s.displayName ?? null,
            ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
          if (!r.ok) return res.status(r.status).json({ error: r.error, code: r.code, ...(r.extra ?? {}) });
          return res.json({ ...r.after, draftProtocolId: r.draftProtocolId, opusVersion: r.version });
        }
        const r = await store.decidePlan(l.row.id, decision, note, actor(l.s));
        await audit(req, l.s, { entityId: l.row.id, action: decision, branchId: l.row.branchId,
          oldValues: { status: r.before.status }, newValues: { status: r.after.status, returnNote: r.after.returnNote } });
        res.json(r.after);
      } catch (e) {
        if (e instanceof opusPlans.OpusPlanError) return res.status(e.status).json({ error: e.message, code: e.code });
        fail(res, e);
      }
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

  //  **تغييرُ نوع الخطّة — لكاتبها: الأخصائيّ والمشرف العام والمسؤول** (طلبُ المالك ٢٠٢٦-١٠-٠٧، ووُسّع للأخصائيّ ٢٠٢٦-١٠-١٥ — §4.eh):
  //  بروتوكولٌ آخر يملؤها، لا تعديلُ مواصفاتها. وبيد الأخصائيّ في خطّةٍ تُنفَّذ ⟵ «بانتظار مراجعة المشرف» ويُنبَّه المشرف.
  app.post("/api/physio/plans/:id/change-protocol", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canDeletePlans(l.s)) return res.status(403).json({ error: "يغيّر نوعَ الخطّة الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const protocolId = idOf(req.body?.protocolId);
      if (!protocolId) return res.status(400).json({ error: "اختر البروتوكول" });
      const r = await store.changePlanProtocol(l.row.id, protocolId, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "change_protocol", branchId: l.row.branchId,
        oldValues: { protocolId: r.before.protocolId, titleAr: r.before.titleAr }, newValues: { protocolId: r.after.protocolId, titleAr: r.after.titleAr },
        notes: `تغيير نوع الخطة من «${r.before.titleAr}» إلى «${r.after.titleAr}»` });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  //  **الحذف — لكاتب الخطّة: الأخصائيّ والمشرف العام والمسؤول** (طلبُ المالك ٢٠٢٦-١٠-٠٧، ووُسّع للأخصائيّ ٢٠٢٦-١٠-١٥ — §4.eh).
  //  والحارسان أدناه لكلّ أحد: ما نُفّذ أو قيس لا يُمحى.
  app.delete("/api/physio/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canDeletePlans(l.s)) return res.status(403).json({ error: "يحذف الخطّةَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      //  **خطّةٌ لها جلساتٌ منفّذة لا تُحذف** (§4.cn) — زياراتُها وعدّاداتُها قائمة؛ تُوقَف فتبقى تاريخاً.
      if (await exec.planHasSessions(l.row.id)) return res.status(409).json({ error: "للخطّة جلساتٌ منفّذة — أوقفها بدل الحذف" });
      //  وكذا خطّةٌ لها تقييمات (§4.cp) — قياساتُ المريض تاريخٌ لا يُمحى.
      if (await assess.planHasAssessments(l.row.id)) return res.status(409).json({ error: "للخطّة تقييماتٌ مسجّلة — أوقفها بدل الحذف" });
      const removed = await store.deletePlan(l.row.id, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "delete", branchId: l.row.branchId, oldValues: removed,
        notes: `حذف خطة العلاج الطبيعي «${l.row.titleAr}» للمريض #${l.row.patientId}` });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ══ خطّةُ Opus بعد الاعتماد وقبله — المرحلةُ الثالثة (ترحيل ٢٠٠، §4.hb) ═════════════════════════════
  const vActor = (req: any, s: any) => ({ userId: s.userId ?? null, name: s.displayName ?? null, ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
  const sendRefused = (res: any, r: versions.Refused) => res.status(r.status).json({ error: r.error, code: r.code, ...(r.extra ?? {}) });
  const approverOnly = (res: any, s: any) => {
    if (canApproveProtocols(s)) return true;
    res.status(403).json({ error: "تعديلُ خطّة Opus للمسؤول والمشرف العام", code: "approver_only" });
    return false;
  };
  /** ما تضيفه خطّةُ Opus إلى صفحة الخطّة: النسخةُ وعددُ النسخ ومَن يعدّل، والممنوعُ الآن، وطلبُ التعديل الجاري (بلا ملاحظته لغير المعتمِد). */
  async function opusPlanFields(row: any, s: any) {
    if (row.origin !== "opus") return {};
    const approver = canApproveProtocols(s);
    const plan = (await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${row.id}`) as any).rows[0];
    const awaiting = isOpusAwaiting(row);
    const vs = awaiting ? { versions: [], virtual: false } : await versions.listVersions(db, plan);
    const current = vs.versions.length ? vs.versions[vs.versions.length - 1] : null;
    const active = (await db.execute(sql`SELECT id, revise_scope, status, stage, stages, revise_note FROM physio_agent_jobs WHERE plan_id = ${row.id} AND kind = 'revise'
        AND status IN ('queued','running','needs_answers') LIMIT 1`) as any).rows[0] ?? null;
    const pending = (await db.execute(sql`SELECT id, base_version FROM physio_agent_jobs WHERE plan_id = ${row.id} AND proposal_status = 'pending' LIMIT 1`) as any).rows[0] ?? null;
    const newest = await newestV2ExamId(db, row.patientId);
    const basisExam = current?.snapshot?.basis?.examId ?? row.sourceExamId ?? null;
    return {
      opusVersion: current?.version ?? null, versionCount: vs.versions.length, versionsVirtual: vs.virtual,
      //  ما يُرسَل مع «تنفيذ جلسة» — النسخةُ النافذة نفسُها: والتنفيذُ يكتب النسخَ المحسوبة لخطّةٍ قبل نظام النسخ ثمّ يطابقها (§4.hb D9).
      executionVersion: awaiting || row.status !== "approved" ? null : (current?.version ?? null),
      canOpusEdit: approver && row.status === "approved", editLocked: awaiting ? null : "opus_versioned",
      opusRevision: active ? { jobId: Number(active.id), scope: active.revise_scope, status: active.status, stage: active.stage, stages: active.stages,
        ...(approver ? { note: active.revise_note } : {}) } : null,
      pendingProposal: approver && pending ? { jobId: Number(pending.id), baseVersion: pending.base_version } : null,
      forbiddenNow: awaiting ? [] : await versions.forbiddenNowOf(plan),
      newerExamSinceVersion: Boolean(!awaiting && newest && basisExam && newest !== basisExam),
    };
  }

  //  «أعِده إلى Opus» — خطّةٌ منتظرة، بملاحظةٍ إلزامية (المعتمِد).
  app.post("/api/physio/plans/:id/opus-return", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!approverOnly(res, l.s)) return;
      const r = await versions.enqueueReturn(l.row.id, req.body, vActor(req, l.s), opusPlans.opusStaleness);
      if (!r.ok) return sendRefused(res, r);
      nudgeWorkerNow(); await signalJob(r.job);
      res.status(202).json({ job: { id: r.job.id, status: r.job.status, kind: r.job.kind, reviseScope: r.job.reviseScope, planId: l.row.id } });
    } catch (e) { fail(res, e); }
  });
  //  «اطلب من Opus تعديلاً» — خطّةٌ معتمَدة بنسختها النافذة (المعتمِد).
  app.post("/api/physio/plans/:id/opus-amend", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!approverOnly(res, l.s)) return;
      const r = await versions.enqueueAmend(l.row.id, req.body, vActor(req, l.s));
      if (!r.ok) return sendRefused(res, r);
      nudgeWorkerNow(); await signalJob(r.job);
      res.status(202).json({ job: { id: r.job.id, status: r.job.status, kind: r.job.kind, reviseScope: r.job.reviseScope, baseVersion: r.job.baseVersion, planId: l.row.id } });
    } catch (e) { fail(res, e); }
  });
  //  «راجِع البوّابات والفرق» — قراءةٌ وحدها (معفاةٌ من الإشارة الحيّة).
  app.post("/api/physio/plans/:id/opus-edit/preview", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!approverOnly(res, l.s)) return;
      const r = await versions.previewOpusEdit(l.row.id, req.body);
      if (!r.ok) return sendRefused(res, r);
      res.json(r.preview);
    } catch (e) { fail(res, e); }
  });
  //  «احفظ النسخة ن+١» — تعديلٌ مباشر بسببٍ إلزاميّ.
  app.post("/api/physio/plans/:id/opus-edit", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!approverOnly(res, l.s)) return;
      const r = await versions.saveOpusEdit(l.row.id, req.body, vActor(req, l.s));
      if (!r.ok) return sendRefused(res, r);
      res.json({ version: r.version, plan: r.plan });
    } catch (e) { fail(res, e); }
  });
  //  **طلبُ المعتمِد إلى Opus للمعتمِدين وحدهم** (§4.hb ٣.٦) — نسخةُ «تعديلٌ من Opus» سببُها نصُّ الطلب وملاحظةُ حفظه: لغيرهم سببٌ ثابت، كما يخفيها
  //  لوحُ الوظيفة وشريطُ الطلب الجاري. وسببُ التعديل المباشر «لماذا عُدّلت» لكلّ قارئ (قرارُ المالك ٦: مَن ومتى ولماذا).
  const OPUS_REVISION_REASON_PUBLIC = "تعديلٌ من Opus بطلب المعتمِد";
  const versionTexts = (v: { how: string; reason: string | null; approvalNote: string | null }, s: any) =>
    v.how === "opus_revision" && !canApproveProtocols(s) ? { reason: OPUS_REVISION_REASON_PUBLIC, approvalNote: null } : { reason: v.reason, approvalNote: v.approvalNote };
  //  «سجلّ النسخ» — لكلّ قارئ الخطّة: مَن ومتى وكيف ولماذا، وما تغيّر، وكم جلسةً نُفّذت على كلّ نسخة.
  app.get("/api/physio/plans/:id/versions", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const plan = (await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${l.row.id}`) as any).rows[0];
      const { versions: list, virtual } = await versions.listVersions(db, plan);
      const per = await versions.sessionsPerVersion(l.row.id);
      res.json({ current: list.length ? list[list.length - 1].version : null, virtual,
        versions: list.map((v) => ({ version: v.version, how: v.how, howAr: VERSION_HOW_LABELS[v.how], ...versionTexts(v, l.s),
          createdByName: v.createdByName, createdAt: v.createdAt, diffSummaryAr: v.diffSummaryAr, jobId: v.jobId, sessionsOnVersion: per.get(v.version) ?? 0,
          backfilled: v.backfilled, snapshotHash: v.snapshotHash })) });
    } catch (e) { fail(res, e); }
  });
  app.get("/api/physio/plans/:id/versions/:n", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const n = idOf(req.params.n);
      const plan = (await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${l.row.id}`) as any).rows[0];
      const v = n ? (await versions.listVersions(db, plan)).versions.find((x) => x.version === n) : null;
      if (!v) return res.status(404).json({ error: "النسخةُ غير موجودة" });
      res.json({ version: v.version, how: v.how, howAr: VERSION_HOW_LABELS[v.how], ...versionTexts(v, l.s), createdByName: v.createdByName,
        createdAt: v.createdAt, snapshot: v.snapshot, gateLog: v.gateLog, snapshotHash: v.snapshotHash, backfilled: v.backfilled, virtual: Boolean(v.virtual) });
    } catch (e) { fail(res, e); }
  });
  app.get("/api/physio/plans/:id/versions/:n/diff", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const n = idOf(req.params.n);
      const against = req.query?.against != null ? idOf(req.query.against) : null;
      const plan = (await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${l.row.id}`) as any).rows[0];
      const d = n ? await versions.versionDiff(plan, n, against) : null;
      if (!d) return res.status(404).json({ error: "النسخةُ غير موجودة" });
      res.json(d);
    } catch (e) { fail(res, e); }
  });

  // ══ التنفيذ — المرحلةُ الرابعة (ترحيل ١١١، §4.cn) ═══════════════════════════════════════════════
  const shiftOf = (s: any): "morning" | "evening" => {
    if (s?.shift === "morning" || s?.shift === "evening") return s.shift;
    const h = new Date(Date.now() + 3 * 3600 * 1000).getUTCHours();
    return h >= 16 && h <= 21 ? "evening" : "morning";
  };
  const dateOf = (v: unknown, today: string): string => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : today);

  //  **جلساتُ اليوم** — الخططُ المعتمَدة في فروع السائل (أو الفرع المختار منها)، والمسنَدُ إليه أوّلاً.
  app.get("/api/physio/today", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canExecutePlans(s)) return res.status(403).json({ error: "جلساتُ اليوم لقسم العلاج الطبيعي" });
    try {
      const scope = scopeOf(req, s);
      const want = idOf(req.query.branchId);
      const branchIds = want ? (scope === null || scope.includes(want) ? [want] : []) : scope;
      res.json({ today: baghdadTodayYmd(), plans: await exec.todayList({ branchIds, userId: s.userId ?? null, today: baghdadTodayYmd() }) });
    } catch (e) { fail(res, e); }
  });

  //  **«إنهاء الجلسة»** — أيُّ منفّذٍ من القسم في فرع الخطّة (قرارُ المالك: المسنَدُ افتراضيٌّ لا حصر).
  app.post("/api/physio/plans/:id/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canExecutePlans(l.s)) return res.status(403).json({ error: "تُنفَّذ الخطّةُ بيد قسم العلاج الطبيعي" });
      const scope = scopeOf(req, l.s);
      if (scope !== null && !scope.includes(l.row.branchId)) return res.status(403).json({ error: "تُنفَّذ الخطّةُ في فرعها — بيد مَن يعمل فيه" });
      const today = baghdadTodayYmd();
      const sessionDate = dateOf(req.body?.date, today);
      const v = checkVisitDate(sessionDate, mayBackdateVisits(l.s));
      if (!v.ok) return res.status(v.status).json({ error: v.message });
      if (!Array.isArray(req.body?.items) || req.body.items.length > 40) return res.status(400).json({ error: "البنودُ غير صالحة" });
      const items = req.body.items.map((i: any) => ({
        deviceId: Number(i?.deviceId), done: i?.done === true,
        minutes: i?.minutes === "" || i?.minutes == null ? null : Number(i.minutes),
        note: typeof i?.note === "string" && i.note.trim() ? i.note.trim().slice(0, 500) : null,
      }));
      if (items.some((i: any) => !Number.isInteger(i.deviceId) || (i.minutes !== null && (!Number.isInteger(i.minutes) || i.minutes < 0 || i.minutes > 240)))) {
        return res.status(400).json({ error: "دقائقُ البند ٠–٢٤٠" });
      }
      const note = typeof req.body?.noteToSpecialist === "string" && req.body.noteToSpecialist.trim() ? req.body.noteToSpecialist.trim().slice(0, 2000) : null;
      //  §4.dr — تمارينُ المرحلة (نُفّذ أم لا وسببُه) والمرحلةُ المختارة؛ وغيابُها من صفحةٍ أقدم لا يُفشل الجلسة.
      let exercises: { exerciseId: number; done: boolean; note: string | null }[] | null = null;
      if (req.body?.exercises !== undefined) {
        if (!Array.isArray(req.body.exercises) || req.body.exercises.length > 40) return res.status(400).json({ error: "التمارينُ غير صالحة" });
        exercises = req.body.exercises.map((x: any) => ({ exerciseId: Number(x?.exerciseId), done: x?.done === true,
          note: typeof x?.note === "string" && x.note.trim() ? x.note.trim().slice(0, 500) : null }));
        if (exercises!.some((x) => !Number.isInteger(x.exerciseId) || x.exerciseId <= 0)) return res.status(400).json({ error: "تمرينٌ غير صالح" });
      }
      const phasePosition = req.body?.phasePosition == null ? null : Number(req.body.phasePosition);
      if (phasePosition !== null && (!Number.isInteger(phasePosition) || phasePosition < 1)) return res.status(400).json({ error: "مرحلةٌ غير صالحة" });
      //  §4.hb D9 — خطّةُ Opus: النسخةُ التي عرضتها الشاشة (وغيابُها من صفحةٍ أقدم ⟵ ٤٠٩ في التنفيذ).
      const planVersion = req.body?.planVersion == null ? null : Number(req.body.planVersion);
      const r = await exec.executeSession({
        planId: l.row.id, items, noteToSpecialist: note, sessionDate, shift: shiftOf(l.s), actor: actor(l.s), planVersion,
        canDryNeedle: l.s.permissions?.canDryNeedle === true, visitCustomDate: sessionDate === today ? null : sessionDate,
        exercises, phasePosition, phaseManual: req.body?.phaseManual === true,
      });
      await logAudit({ entityType: "visit", entityId: r.visit.id, action: "create", userId: l.s.userId ?? null, userName: l.s.displayName ?? null,
        branchId: r.visit.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null, notes: `جلسة من خطة العلاج الطبيعي #${l.row.id}` });
      await audit(req, l.s, { entityId: l.row.id, action: "execute", branchId: l.row.branchId,
        newValues: { sessionId: r.session.id, sessionDate, visitId: r.visit.id, countsWritten: r.writeCounts, items, noteToSpecialist: note,
          ...(exercises ? { phasePosition: r.session.phasePosition, phaseManual: req.body?.phaseManual === true, exercises } : {}) } });
      res.json({ ...r.session, visitId: r.visit.id });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/plans/:id/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      res.json({ sessions: await exec.planSessions(l.row.id), canExecute: canExecutePlans(l.s), canCancel: canCancelSessions(l.s) });
    } catch (e) { fail(res, e); }
  });

  //  **إلغاءُ جلسةٍ نُفّذت خطأً** — للمسؤول والمشرف العام، بسببٍ إلزاميّ.
  app.post("/api/physio/sessions/:id/cancel", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canCancelSessions(s)) return res.status(403).json({ error: "يلغي الجلسةَ المسؤولُ أو المشرفُ العام" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const reason = text(req.body?.reason, 1000);
    if (!reason) return res.status(400).json({ error: "اكتب سببَ الإلغاء" });
    try {
      const r = await exec.cancelSession(id, reason, actor(s));
      await audit(req, s, { entityId: r.before.planId, action: "cancel_session", branchId: r.before.branchId,
        oldValues: { sessionId: id, visitId: r.before.visitId, countsWritten: r.before.countsWritten }, newValues: { cancelReason: reason } });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  //  **ما اختلف عن الخطّة** — لكاتبي الخطط: آخر ثلاثين يوماً في نطاقهم.
  //  ══ إعادةُ التقييم (§4.cp — المرحلةُ السادسة) ══════════════════════════════════════════════════════════════
  //  التقييماتُ لمن يقرأ الخطّة (والمنفّذُ يرى ولا يكتب)، والكتابةُ لكاتبي الخطط وحدهم على خطّةٍ غيرِ منتهية.
  app.get("/api/physio/plans/:id/assessments", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      const v = await assess.planAssessmentView(l.row, baghdadTodayYmd());
      res.json({ ...v, canAssess: canAssessPlans(l.s) && !isPlanClosed(l.row.status) });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/plans/:id/assessments", isAuthenticated, async (req: any, res) => {
    try {
      const l = await loadPlan(req, res, idOf(req.params.id));
      if (!l) return;
      if (!canAssessPlans(l.s)) return res.status(403).json({ error: "يقيّم الأخصائيُّ أو المشرفُ العام أو المسؤول" });
      const day = typeof req.body?.assessedOn === "string" && req.body.assessedOn ? req.body.assessedOn : baghdadTodayYmd();
      const v = checkVisitDate(day, mayBackdateVisits(l.s));
      if (!v.ok) return res.status(v.status).json({ error: v.message });
      const r = await assess.recordAssessment(l.row.id, { ...req.body, assessedOn: day }, actor(l.s));
      await audit(req, l.s, { entityId: l.row.id, action: "assess", branchId: l.row.branchId,
        newValues: { assessmentId: r.row.id, kind: r.row.kind, assessedOn: r.row.assessedOn, pain: r.row.pain, scores: r.row.scores,
          goals: r.row.goals, decision: r.row.decision, notes: r.row.notes } });
      if (r.after.status !== r.before.status) {
        await audit(req, l.s, { entityId: l.row.id, action: r.after.status === "graduated" ? "graduate" : "stop", branchId: l.row.branchId,
          oldValues: { status: r.before.status }, newValues: { status: r.after.status, stopReason: r.after.stopReason ?? null, assessmentId: r.row.id } });
      }
      res.json({ ...r.row, planStatus: r.after.status });
    } catch (e) { fail(res, e); }
  });

  //  **مستحقّ التقييم** — المسؤولُ والمشرفُ العام كلَّ ما في نطاقهما، والأخصائيُّ خططَه هو.
  app.get("/api/physio/assessments/due", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canAssessPlans(s)) return res.status(403).json({ error: "للأخصائيّ والمشرف العام والمسؤول" });
    try {
      res.json({ plans: await assess.dueList({ branchIds: scopeOf(req, s), createdBy: canApprovePlans(s) ? null : Number(s.userId) || -1,
        today: baghdadTodayYmd() }) });
    } catch (e) { fail(res, e); }
  });

  //  **نتائجُ العلاج الطبيعي** (§4.cp — ٦ب، القرار ٥): المسؤولُ والمشرفُ العام كلُّ الفروع (ولهما اختيارُ فرع)، ومديرُ الفرع فرعُه، والأخصائيُّ خططُه.
  //  والفترةُ بيوم اعتماد الخطّة — آخرُ ١٨٠ يوماً افتراضاً.
  app.get("/api/physio/outcomes", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    const scope = outcomesScope(s);
    if (!scope) return res.status(403).json({ error: "للأخصائيّ ومدير الفرع والمشرف العام والمسؤول" });
    const today = baghdadTodayYmd();
    const ymd = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const to = ymd(req.query.to) ?? today;
    const from = ymd(req.query.from) ?? new Date(Date.parse(`${today}T00:00:00Z`) - 180 * 86400000).toISOString().slice(0, 10);
    if (from > to) return res.status(400).json({ error: "بدايةُ الفترة بعد نهايتها" });
    const want = idOf(req.query.branchId);
    try {
      let branchIds: number[] | null = null;
      if (scope === "all") branchIds = want ? [want] : null;
      else if (scope === "branches") {
        const mine = scopeOf(req, s) ?? [];
        branchIds = want ? (mine.includes(want) ? [want] : []) : mine;
      }
      const report = await outcomes.outcomesReport({ branchIds, createdBy: scope === "own" ? Number(s.userId) || -1 : null, from, to, today });
      res.json({ scope, ...report, branches: scope === "all" ? await outcomes.branchList() : [] });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/deviations", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canWrite(s)) return res.status(403).json({ error: "للأخصائيّ والمشرف العام والمسؤول" });
    try {
      const since = new Date(Date.now() + 3 * 3600 * 1000 - 30 * 86400000).toISOString().slice(0, 10);
      res.json({ sessions: await exec.deviations({ branchIds: scopeOf(req, s), sinceDate: since }) });
    } catch (e) { fail(res, e); }
  });

  //  **للاستقبال** — هل لهذا الملفّ خطّةٌ معتمَدة؟ فيُنبَّه في «تسجيل زيارة جلسة علاج طبيعي» كي لا تُحتسب الجلسةُ مرّتين.
  app.get("/api/patients/:patientId/physio-plan-flag", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    const patientId = idOf(req.params.patientId);
    if (!patientId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const patient = await storage.getPatient(patientId);
      if (!patient || !(await scopeReachesPatient(scopeOf(req, s), patient as any))) return res.status(404).json({ error: "المريض غير موجود" });
      res.json({ hasApprovedPlan: await exec.hasApprovedPlan(patientId), canExecute: canExecutePlans(s) });
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
