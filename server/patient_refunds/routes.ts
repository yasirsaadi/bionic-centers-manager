// **«طلب استرجاع مبلغ لمريض»** (ترحيل ١٩١، §4.fz) — النقاط.
//
//   GET  /api/patients/:id/refund-options     — حاملُ المفتاح والمسؤول: حالاتُ المريض بصافي ما دُفع والمتاح للاسترجاع.
//   GET  /api/patients/:id/refunds            — مَن يرى دفعات المريض: طلباتُ استرجاعه (المعلَّق والمعتمد والمرفوض) — لملفّه.
//   POST /api/patient-refunds                 — حاملُ المفتاح: يطلب؛ والمسؤولُ يسترجع مباشرةً (طلبٌ يُعتمد في الحال بقراريه).
//   GET  /api/patient-refunds                 — المسؤولُ: كلُّ الطلبات (أو بحالة)؛ وغيرُه: طلباتُه هو.
//   GET  /api/patient-refunds/pending-count   — المسؤولُ وحده: عددُ المعلَّق، يُجمع في رقم «طلبات التصحيح».
//   GET  /api/patient-refunds/:id             — السندُ للطباعة: للمسؤول، ولطالبه، ولمن يرى دفعات المريض في فرعه.
//   POST /api/patient-refunds/:id/approve     — المسؤولُ وحده: دفعةُ الاسترجاع بيوم الاعتماد، وقراراه (نسبةُ المستشفى · كلفةُ الحالة).
//   POST /api/patient-refunds/:id/reject      — المسؤولُ وحده، بسبب.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import { getSession, accessibleBranchesFor, type BranchSession } from "../sessions_module/permissions";
import {
  patientBranchIdsOf, scopeReachesPatient, resolveActingBranchId, adminMustChooseBranch, ADMIN_BRANCH_CHOICE_ERROR,
} from "../patients/branch_access";
import * as followupStore from "../followup/store";
import { notifyRefundDecided, notifyRefundPending } from "../staff_telegram/notify";
import { branchCashConfig, parseAmount } from "@shared/cash_book";
import { amountInArabicWords } from "@shared/reserve_withdrawals";
import { HOSPITAL_AUTO_START, hospitalAutoApplies } from "@shared/hospital_ratio";
import { baghdadTodayYmd } from "@shared/visit_date";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import {
  REFUND_CASE_LABELS, REFUND_DETAIL_ERROR, REFUND_DETAIL_MAX, REFUND_DETAIL_MIN, REFUND_STATUS_LABELS,
  canRequestRefund, defaultReduceCost, parseReturnedSessions, refundReasonLabel, refundReasonOf, refundVoucherNo, returnedSessionsLine,
  REFUND_COMPANION_MAX, REFUND_NATIONAL_ID_MAX, REFUND_FORM_FIELD_ERROR, optionalFormText,
  type RefundStatus,
} from "@shared/patient_refunds";
import * as store from "./store";

const money = (n: number) => n.toLocaleString("en-US");

function fail(res: any, e: unknown) {
  if (e instanceof store.RefundError) return res.status(e.status).json({ error: e.message });
  console.error("[patient-refunds]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

function auditRow(req: any, s: BranchSession, tx: any, p: { entityType: string; entityId: number; action: string; branchId: number; oldValues?: any; newValues?: any; notes: string }) {
  return logAudit({
    ...p, tx, userId: s.userId ?? null, userName: s.displayName ?? null,
    ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
  });
}

/** يُفعّل لحامل المفتاح تنبيهَ «قرار طلبه» مرّةً حين يُشعَل المفتاح — وما يطفئه المسؤولُ بعدها يبقى مطفأً. */
export async function enableRefundDecidedNotice(userId: number) {
  await db.execute(sql`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES (${userId}, 'refund_request_decided') ON CONFLICT DO NOTHING`);
}

/** فرعُ الطلب في ذي قار؟ — نسبةُ المستشفى قائمةٌ لفرعه فيُسأل المسؤولُ أيُخصم منها. */
function hospitalBranch(branchName: string | null | undefined): boolean {
  return Boolean(branchCashConfig(branchName ?? "").hospitalRatioPct);
}

/** البطاقةُ كما يقرؤها المسؤول والسند — كلُّ ما يحتاجه القرارُ مقروءاً. */
async function present(row: store.RequestRow) {
  const pending = row.status === "pending";
  const money_ = pending ? await store.caseMoneyTx(db as any, row.caseId) : null;
  const others = pending ? await store.otherPendingOnCase(row.caseId, row.id) : null;
  const askHospital = hospitalBranch(row.branchName) && (pending ? hospitalAutoApplies(baghdadTodayYmd()) : row.deductHospital !== null);
  const suggestDeduct = pending && askHospital ? await store.caseHasPaymentSince(row.caseId, HOSPITAL_AUTO_START) : null;
  const [kase] = pending
    ? ((await db.execute(sql`SELECT cost FROM patient_cases WHERE id = ${row.caseId}`)).rows as any[])
    : [];
  const netNow = money_?.net ?? null;
  return {
    id: row.id, voucherNo: refundVoucherNo(row.id),
    patientId: row.patientId, patientName: row.patientName ?? "", patientCode: row.patientCode ?? "",
    caseId: row.caseId, caseType: row.caseType, caseLabel: REFUND_CASE_LABELS[row.caseType] ?? row.caseType,
    branchId: row.branchId, branchName: row.branchName ?? "",
    amount: row.amount, amountWords: amountInArabicWords(row.amount),
    reason: row.reason, reasonLabel: refundReasonLabel(row.reason), detail: row.detail,
    companionName: row.companionName ?? null, nationalId: row.nationalId ?? null,
    status: row.status as RefundStatus, statusLabel: REFUND_STATUS_LABELS[row.status as RefundStatus] ?? row.status,
    //  للمعلَّق: صافي ما دُفع الآن وما يبقى له بعده، وللمحسوم: ما كان لحظةَ الطلب.
    netPaid: netNow ?? row.netPaidAtRequest, refundedBefore: money_?.refunded ?? null,
    netAfter: netNow == null ? null : netNow - row.amount, exceeds: netNow != null && row.amount > netNow,
    otherPendingCount: others?.count ?? 0, otherPendingAmount: others?.amount ?? 0,
    caseCost: kase ? Number(kase.cost ?? 0) : row.costBefore,
    askHospital, suggestDeductHospital: suggestDeduct, suggestReduceCost: defaultReduceCost(row.reason),
    deductHospital: row.deductHospital, reduceCost: row.reduceCost, costBefore: row.costBefore, costAfter: row.costAfter,
    requestedBy: row.requestedBy, requestedByName: row.requestedByName, requestedAt: row.requestedAt,
    decidedByName: row.decidedByName, decidedAt: row.decidedAt, decisionNote: row.decisionNote, paymentId: row.paymentId,
    //  **الجلساتُ المُرجَعة** (ترحيل ١٩٣) — وللمعلَّق ما يجوز إرجاعُه الآن، فيرى المسؤولُ زيارةً سُجّلت بعد الطلب.
    sessionsReturned: row.sessionsReturned ?? null,
    sessionsLine: row.caseType === "physiotherapy" ? returnedSessionsLine(row.sessionsReturned) : null,
    sessionsNow: pending && row.caseType === "physiotherapy"
      ? (await store.physioSessionStateTx(db as any, row.patientId, row.caseId, row.id)).state : null,
  };
}

/** يصل المريضَ من فرعٍ في نطاق الجلسة (فرعُ تسجيله أو فرعٌ أُتيح له الملفّ، §4.t). */
async function reachPatient(req: any, res: any, patientId: number) {
  if (!Number.isInteger(patientId) || patientId <= 0) { res.status(400).json({ error: "مريض غير صالح" }); return null; }
  const patient = await storage.getPatient(patientId);
  if (!patient) {
    const any = await storage.getPatientAnyState(patientId).catch(() => null);
    res.status(any ? 409 : 404).json({ error: any ? PATIENT_IN_TRASH_ERROR : "المريض غير موجود" });
    return null;
  }
  if (!(await scopeReachesPatient(accessibleBranchesFor(req), patient as any))) {
    res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    return null;
  }
  return patient;
}

const mayViewPayments = (s: BranchSession) => Boolean(s.isAdmin || s.permissions?.canViewPayments);

export function registerPatientRefundRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/patients/:id/refund-options", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!canRequestRefund(s)) return res.status(403).json({ error: "طلبُ الاسترجاع لمن أشعل له المسؤولُ مفتاحَه" });
    const patient = await reachPatient(req, res, Number(req.params.id));
    if (!patient) return;
    try {
      //  فرعُ الاسترجاع كما سيُكتب — فالمسؤولُ الذي يسترجع مباشرةً يرى سؤالَ نسبة المستشفى إن كان فرعُه ذي قار.
      const patientBranchIds = await patientBranchIdsOf(patient as any);
      const branchId = resolveActingBranchId({
        scope: accessibleBranchesFor(req), sessionBranchId: s.branchId ?? null,
        homeBranchId: (patient as any).branchId ?? null, patientBranchIds,
      }) ?? (patient as any).branchId;
      const branchName = branchId ? ((await db.execute(sql`SELECT name FROM branches WHERE id = ${branchId}`)).rows[0] as any)?.name ?? "" : "";
      const askHospital = hospitalBranch(branchName) && hospitalAutoApplies(baghdadTodayYmd());
      const cases = await store.refundOptions(patient.id);
      const withSuggest = [];
      for (const c of cases) {
        withSuggest.push({ ...c, suggestDeductHospital: askHospital ? await store.caseHasPaymentSince(c.caseId, HOSPITAL_AUTO_START) : null });
      }
      res.json({
        cases: withSuggest, isAdmin: Boolean(s.isAdmin), branchName, askHospital,
        //  رأسُ الاستمارة (§4.gi): اسمُ المريض ورقمُ ملفّه من الملفّ نفسِه — لا يُكتبان باليد.
        patientName: (patient as any).name ?? "", patientCode: (patient as any).patientCode ?? "",
        mustChooseBranch: adminMustChooseBranch({ isAdmin: Boolean(s.isAdmin), sessionBranchId: s.branchId ?? null, patientBranchIds }),
      });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/patients/:id/refunds", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!mayViewPayments(s) && !canRequestRefund(s)) return res.status(403).json({ error: "ليس لديك صلاحية عرض الدفعات" });
    const patient = await reachPatient(req, res, Number(req.params.id));
    if (!patient) return;
    try {
      const list = await store.listRequests({ patientId: patient.id, limit: 100 });
      res.json(await Promise.all(list.map(present)));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/patient-refunds", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!canRequestRefund(s)) return res.status(403).json({ error: "طلبُ الاسترجاع لمن أشعل له المسؤولُ مفتاحَه" });
    const patient = await reachPatient(req, res, Number(req.body?.patientId));
    if (!patient) return;
    const caseId = Number(req.body?.caseId);
    if (!Number.isInteger(caseId) || caseId <= 0) return res.status(400).json({ error: "اختر القسم الذي يُسترجع منه" });
    const amount = parseAmount(req.body?.amount);
    if (amount === null) return res.status(400).json({ error: "المبلغ غير صالح" });
    const reason = refundReasonOf(req.body?.reason);
    if (!reason) return res.status(400).json({ error: "اختر سبب الاسترجاع" });
    const detail = typeof req.body?.detail === "string" ? req.body.detail.trim() : "";
    if (detail.length < REFUND_DETAIL_MIN || detail.length > REFUND_DETAIL_MAX) return res.status(400).json({ error: REFUND_DETAIL_ERROR });
    //  **كم جلسةً تُرجَع** — لقسم العلاج الطبيعي إلزاميّ (والمخزنُ يردّ غيابَه)، ومصفوفةٌ فاسدة تُردّ هنا.
    const rawSessions = req.body?.sessionsReturned;
    const sessionsReturned = rawSessions == null ? null : parseReturnedSessions(rawSessions);
    if (rawSessions != null && sessionsReturned === null) return res.status(400).json({ error: "عدد الجلسات المُرجَعة غير صالح" });
    //  **الاستمارة** (ترحيل ١٩٥): اسمُ المرافق ورقمُ الجنسية يُحفظان وغيرُ إلزاميَّين — والأطولُ من الحدّ يُردّ لا يُقصّ.
    const companionName = optionalFormText(req.body?.companionName, REFUND_COMPANION_MAX);
    const nationalId = optionalFormText(req.body?.nationalId, REFUND_NATIONAL_ID_MAX);
    if (companionName === undefined || nationalId === undefined) return res.status(400).json({ error: REFUND_FORM_FIELD_ERROR });

    //  **فرعُ الاسترجاع فرعُ الجلسة** — حيث يخرج المالُ من قاصته فعلاً (كالدفعة الجديدة)؛ والمسؤولُ على «كلّ الفروع» يختار لملفٍّ متعدّد الفروع.
    const patientBranchIds = await patientBranchIdsOf(patient as any);
    if (adminMustChooseBranch({ isAdmin: Boolean(s.isAdmin), sessionBranchId: s.branchId ?? null, patientBranchIds })) {
      return res.status(409).json({ error: ADMIN_BRANCH_CHOICE_ERROR });
    }
    const branchId = resolveActingBranchId({
      scope: accessibleBranchesFor(req), sessionBranchId: s.branchId ?? null,
      homeBranchId: (patient as any).branchId ?? null, patientBranchIds,
    }) ?? (patient as any).branchId;
    if (!branchId) return res.status(409).json({ error: "تعذّر تحديد فرع الاسترجاع" });

    try {
      //  **المسؤولُ يسترجع مباشرةً**: قراراه يُفحصان قبل أيّ كتابة، والاعتمادُ في معاملة الطلب نفسِها — فشلُه لا يترك طلباً يتيماً.
      let adminInput: store.ApproveInput | null = null;
      if (s.isAdmin) {
        const branchName = ((await db.execute(sql`SELECT name FROM branches WHERE id = ${branchId}`)).rows[0] as any)?.name ?? "";
        adminInput = approvalInput(s, req.body, { branchName, reason });
        const caseType = ((await db.execute(sql`SELECT case_type FROM patient_cases WHERE id = ${caseId} AND patient_id = ${patient.id}`)).rows[0] as any)?.case_type ?? "";
        await store.approvePrecheck({ patientId: patient.id, caseType, reduceCost: adminInput.reduceCost, hasActiveFollowup: adminInput.hasActiveFollowup });
      }
      const row = await store.create({
        patientId: patient.id, caseId, branchId, amount, reason, detail,
        userId: s.userId ?? null, userName: s.displayName ?? null, sessionsReturned, companionName, nationalId,
      }, async (tx, r, m) => {
        await auditRow(req, s, tx, { entityType: "patient_refund_request", entityId: r.id, action: "create", branchId,
          newValues: { patientId: r.patientId, caseId, amount, reason, detail, netPaid: m.net, sessionsReturned: r.sessionsReturned ?? null,
            ...(companionName ? { companionName } : {}), ...(nationalId ? { nationalId } : {}) },
          notes: `طلب استرجاع ${money(amount)} — ${REFUND_CASE_LABELS[m.caseType] ?? m.caseType} — ${refundReasonLabel(reason)}`
            + (m.caseType === "physiotherapy" ? ` — يُرجع ${returnedSessionsLine(r.sessionsReturned)}` : "") });
        //  المسؤولُ يسترجع مباشرةً: لا تنبيهَ له بطلبه هو.
        if (!s.isAdmin) {
          await notifyRefundPending(tx, {
            patientId: r.patientId, branchId, caseLabel: REFUND_CASE_LABELS[m.caseType] ?? m.caseType,
            amountText: money(amount), amountWords: amountInArabicWords(amount), netPaidText: money(m.net),
            refundedBeforeText: money(m.refunded), reason: refundReasonLabel(reason),
            detail: m.caseType === "physiotherapy" ? `${detail} — يُرجع ${returnedSessionsLine(r.sessionsReturned)}` : detail, requestId: r.id,
            actorName: s.displayName ?? null, actorUserId: s.userId ?? null,
          });
        }
      }, adminInput ? (tx, r) => store.approveTx(tx, r.id, adminInput!, afterApprove(req, s, adminInput!)) : undefined);
      res.status(201).json(await present(row));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/patient-refunds/pending-count", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "للمسؤول وحده" });
    res.json({ count: await store.pendingCount() });
  });

  app.get("/api/patient-refunds", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : null;
    try {
      const list = s.isAdmin
        ? await store.listRequests({ status, branchId: req.query.branchId ? Number(req.query.branchId) || null : null })
        : canRequestRefund(s)
          ? await store.listRequests({ status, requestedBy: s.userId ?? -1 })
          : null;
      if (!list) return res.status(403).json({ error: "طلبُ الاسترجاع لمن أشعل له المسؤولُ مفتاحَه" });
      res.json(await Promise.all(list.map(present)));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/patient-refunds/:id", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const row = await store.getRequest(id);
    if (!row) return res.status(404).json({ error: "الطلب غير موجود" });
    //  المسؤول، وطالبُه، ومَن يرى دفعات المريض في فرعه.
    const mine = s.userId != null && row.requestedBy === s.userId;
    if (!s.isAdmin && !mine) {
      if (!mayViewPayments(s)) return res.status(403).json({ error: "ليس لديك صلاحية عرض الدفعات" });
      const patient = await reachPatient(req, res, row.patientId);
      if (!patient) return;
    }
    res.json(await present(row));
  });

  /** قرارا المسؤول من جسم الطلب — والسؤالُ عن نسبة المستشفى إلزاميّ في فرعها من يوم البدء. */
  function approvalInput(s: BranchSession, body: any, cur: { branchName?: string | null; reason: string }) {
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;
    const ask = hospitalBranch(cur.branchName) && hospitalAutoApplies(baghdadTodayYmd());
    let deductHospital: boolean | null = null;
    if (ask) {
      if (typeof body?.deductHospital !== "boolean") {
        throw new store.RefundError(400, "اختر: هل يُخصم المسترجَع من نسبة مستشفى العين؟");
      }
      deductHospital = body.deductHospital;
    }
    const reduceCost = typeof body?.reduceCost === "boolean" ? body.reduceCost : defaultReduceCost(cur.reason);
    const input: store.ApproveInput = {
      userId: s.userId ?? null, userName: s.displayName ?? null, note, deductHospital, reduceCost,
      hasActiveFollowup: (patientId, caseType) => followupStore.hasActiveFollowup({ patientId, serviceType: caseType as any }),
    };
    return input;
  }

  /** ما يُكتب مع الاعتماد في معاملته: سطرا التدقيق وتنبيهُ الطالب. */
  function afterApprove(req: any, s: BranchSession, input: store.ApproveInput) {
    return async (tx: any, row: store.RequestRow, done: { paymentId: number; journalPosted: boolean }) => {
      await auditRow(req, s, tx, { entityType: "payment", entityId: done.paymentId, action: "create", branchId: row.branchId,
        newValues: { amount: -row.amount, caseId: row.caseId, refundRequestId: row.id, journalPosted: done.journalPosted,
          returnedSessions: row.sessionsReturned ?? null },
        notes: `دفعة استرجاع — سند ${row.id} — ${row.patientName ?? ""}` });
      await auditRow(req, s, tx, { entityType: "patient_refund_request", entityId: row.id, action: "approve", branchId: row.branchId,
        oldValues: { status: "pending" },
        newValues: { status: "approved", paymentId: done.paymentId, deductHospital: input.deductHospital, reduceCost: input.reduceCost,
          costBefore: row.costBefore, costAfter: row.costAfter, note: input.note },
        notes: `اعتمادُ استرجاع ${money(row.amount)} — ${row.patientName ?? ""}${row.requestedByName ? ` — طلبه ${row.requestedByName}` : ""}` });
      if (row.requestedBy && row.requestedBy !== s.userId) {
        await notifyRefundDecided(tx, {
          requesterUserId: row.requestedBy, approved: true, patientName: row.patientName ?? "", amountText: money(row.amount),
          voucherNo: refundVoucherNo(row.id), patientId: row.patientId, note: input.note,
        });
      }
    };
  }

  async function approveAs(req: any, s: BranchSession, id: number, body: any): Promise<store.RequestRow> {
    const cur = await store.getRequest(id);
    if (!cur) throw new store.RefundError(404, "الطلب غير موجود");
    const input = approvalInput(s, body, cur);
    return await store.approve(id, input, afterApprove(req, s, input));
  }

  app.post("/api/patient-refunds/:id/approve", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "اعتمادُ الاسترجاع للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    try {
      res.json(await present(await approveAs(req, s, id, req.body)));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/patient-refunds/:id/reject", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "رفضُ الاسترجاع للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    if (note.length < 3) return res.status(400).json({ error: "اكتب سببَ الرفض — يصل الطالبَ" });
    try {
      const row = await store.reject(id, { userId: s.userId ?? null, userName: s.displayName ?? null, note }, async (tx, row) => {
        await auditRow(req, s, tx, { entityType: "patient_refund_request", entityId: row.id, action: "reject", branchId: row.branchId,
          oldValues: { status: "pending" }, newValues: { status: "rejected", note },
          notes: `رفضُ طلب استرجاع ${money(row.amount)} — ${row.patientName ?? ""} — ${note}` });
        if (row.requestedBy) {
          await notifyRefundDecided(tx, {
            requesterUserId: row.requestedBy, approved: false, patientName: row.patientName ?? "", amountText: money(row.amount),
            voucherNo: refundVoucherNo(row.id), patientId: row.patientId, note,
          });
        }
      });
      res.json(await present(row));
    } catch (e) { fail(res, e); }
  });
}
