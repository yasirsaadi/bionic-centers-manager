// نقاط REST لمتابعة ما بعد المعاينة واعتماد البيع.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   تسجيلُ قرار المريض والمتابعة  — استقبال · مدير فرع · طبيب · مسؤول
//   اعتمادُ/رفضُ تعديل السعر      — **طبيبٌ مخوَّل أو مسؤول حصراً**
//   اعتمادُ الشراء                — **طبيبٌ مخوَّل أو مسؤول حصراً**
//
// ومديرُ الفرع **يتابع ولا يعتمد** عمداً: السعر قرارٌ وقّعه الطبيب في سجلٍّ
// سريري، فمن يعتمد تعديله طبيبٌ لا إداريّ. وهذا الفرق هو جوهر الميزة —
// ولذلك يُفحص في الخادم على كل كتابة، فإخفاءُ زرٍّ في الواجهة عرضٌ لا حراسة.
//
// وليس شرطاً أن يكون **طبيب المعاينة نفسه**: أي طبيبٍ مخوَّل يعتمد، وإلّا
// تجمّد ملفّ المريض حتى يعود زميلٌ من إجازته.
//
// ونطاقُ الفرع مفروضٌ في كل نقطة: يُقرأ فرع المتابعة من صفّها لا من الطلب.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import * as store from "./store";
import { FollowupError } from "./store";
import { canApprove, canRecordFollowup } from "@shared/followup";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: (s?.permissions ?? {}) as Record<string, any>,
  };
}

/** الفروع التي يصلها المستخدم. `null` = مسؤول، أي كل الفروع. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

function canReachBranch(req: Req, branchId: number | null): boolean {
  const scope = branchScope(req);
  if (scope === null) return true;
  if (branchId === null) return false;
  return scope.includes(branchId);
}

const actorOf = (req: Req) => {
  const s = getSession(req);
  return { userId: s.userId, userName: s.userName };
};

/** يترجم خطأ العمل إلى ردٍّ صريح — والسباق يُقال للمستخدم لا يُبتلع. */
function fail(res: any, err: unknown): boolean {
  if (err instanceof FollowupError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

export function registerFollowupRoutes(app: Express, isAuthenticated: any) {
  /**
   * يقرأ المتابعة ويفرض نطاق الفرع **قبل أي شيء آخر**.
   *
   * والفرع يُقرأ من صفّ المتابعة نفسه لا من جسم الطلب — فمعرّفٌ من فرعٍ
   * آخر يُردّ ولو ورد في عنوانٍ صحيح.
   */
  async function loadInScope(req: Req, res: any): Promise<store.FollowupRow | null> {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return null;
    }
    const f = await store.getFollowup(id);
    if (!f) {
      res.status(404).json({ error: "المتابعة غير موجودة" });
      return null;
    }
    if (!canReachBranch(req, f.branchId)) {
      res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      return null;
    }
    return f;
  }

  // ── قراءة: متابعات مريض + تاريخها ────────────────────────────────────
  app.get("/api/followups/patient/:patientId", isAuthenticated, async (req: Req, res) => {
    const patientId = Number(req.params.patientId);
    if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    if (!canReachBranch(req, patient.branchId)) {
      return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    }
    const rows = await store.getFollowupsForPatient(patientId);
    const withDetail = await Promise.all(rows.map(async (f) => ({
      ...f,
      events: await store.getEvents(f.id),
      priceRequests: await store.getPriceRequests(f.id),
    })));
    res.json(withDetail);
  });

  // ── شاشة «متابعة ما بعد المعاينة» ────────────────────────────────────
  app.get("/api/followups", isAuthenticated, async (req: Req, res) => {
    const rows = await store.listFollowups({
      scope: branchScope(req),
      filter: typeof req.query.filter === "string" ? req.query.filter : "all",
    });
    res.json(rows);
  });

  // ── «بانتظار موافقتي» — للطبيب والمسؤول ──────────────────────────────
  app.get("/api/followups/approvals", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canApprove(s)) {
      //  قائمةٌ فارغة لا 403: الشاشة تُعرض للجميع وتخلو لمن لا يعتمد.
      return res.json({ priceApprovals: [], purchaseApprovals: [], mayApprove: false });
    }
    const out = await store.listPendingApprovals(branchScope(req));
    res.json({ ...out, mayApprove: true });
  });

  // ── تأجيل ────────────────────────────────────────────────────────────
  app.post("/api/followups/:id/defer", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const updated = await store.recordDeferral({
        followupId: f.id,
        reason: String(req.body?.reason ?? ""),
        note: str(req.body?.note),
        nextFollowUpAt: str(req.body?.nextFollowUpAt),
        noScheduledFollowUp: req.body?.noScheduledFollowUp === true,
        actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تأجيل متابعة #${f.id} — ${req.body?.reason}`,
      });
      res.json(updated);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── تسجيل تواصل بلا تغيير حالة ───────────────────────────────────────
  app.post("/api/followups/:id/contact", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      res.json(await store.recordContact({
        followupId: f.id, note: str(req.body?.note), actor: actorOf(req),
      }));
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── «وافق المريض على السعر» ⟶ بانتظار اعتماد الشراء ──────────────────
  //  **ولا يبدأ تصنيعاً**: موافقةُ المريض ليست اعتماداً.
  app.post("/api/followups/:id/accept-price", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const updated = await store.recordPatientAcceptedPrice({
        followupId: f.id, note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `المريض وافق على السعر المعتمد (${f.approvedPrice.toLocaleString()} د.ع) — بانتظار اعتماد الشراء`,
      });
      res.json(updated);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── إغلاق بلا شراء ───────────────────────────────────────────────────
  app.post("/api/followups/:id/close", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const updated = await store.closeWithoutPurchase({
        followupId: f.id, reason: String(req.body?.reason ?? ""),
        note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `إغلاق متابعة #${f.id} بلا شراء — ${req.body?.reason}`,
      });
      res.json(updated);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── إعادة الفتح — حدثٌ جديد لا تصحيحُ قديم ───────────────────────────
  app.post("/api/followups/:id/reopen", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    const to = req.body?.toStatus === "follow_up" ? "follow_up" : "awaiting_patient_decision";
    try {
      const updated = await store.reopen({
        followupId: f.id, toStatus: to, note: str(req.body?.note),
        nextFollowUpAt: str(req.body?.nextFollowUpAt),
        noScheduledFollowUp: req.body?.noScheduledFollowUp === true,
        actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `إعادة فتح متابعة #${f.id} ⟶ ${to}`,
      });
      res.json(updated);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── طلب تعديل السعر — **اقتراحٌ لا تعديل** ───────────────────────────
  app.post("/api/followups/:id/price-request", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const out = await store.requestPriceChange({
        followupId: f.id, proposedPrice: Number(req.body?.proposedPrice),
        reason: String(req.body?.reason ?? ""), note: str(req.body?.note),
        actor: actorOf(req),
      });
      await logAudit({
        entityType: "price_change_request", entityId: out.requestId, action: "create",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `طلب تعديل سعر لمتابعة #${f.id}: ${f.approvedPrice.toLocaleString()} ⟶ ${Number(req.body?.proposedPrice).toLocaleString()} د.ع`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── اعتماد/رفض تعديل السعر — **طبيب أو مسؤول حصراً** ─────────────────
  app.post("/api/price-requests/:requestId/decide", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    //  الحارس أوّلاً وقبل أي قراءة: مديرُ الفرع يُردّ هنا صراحةً.
    if (!canApprove(s)) {
      return res.status(403).json({
        error: "اعتماد تعديل السعر للطبيب المخوَّل أو المسؤول العام حصراً",
      });
    }
    const requestId = Number(req.params.requestId);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const decision = req.body?.decision === "approve" ? "approve" : "reject";

    //  نطاق الفرع يُفحص من متابعة الطلب — قبل أي كتابة.
    const reqs = await store.getPriceRequestById(requestId);
    if (!reqs) return res.status(404).json({ error: "طلب تعديل السعر غير موجود" });
    if (!canReachBranch(req, reqs.branchId)) {
      return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    }

    try {
      const out = await store.decidePriceChange({
        requestId, decision, note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "price_change_request", entityId: requestId, action: "update",
        userId: s.userId, userName: s.userName, branchId: reqs.branchId,
        oldValues: { approvedPrice: reqs.currentPrice },
        newValues: { approvedPrice: out.followup.approvedPrice, decision },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: decision === "approve"
          ? `اعتماد تعديل السعر #${requestId}: ${reqs.currentPrice.toLocaleString()} ⟶ ${out.followup.approvedPrice.toLocaleString()} د.ع`
          : `رفض تعديل السعر #${requestId} — السعر المعتمد بقي ${out.followup.approvedPrice.toLocaleString()} د.ع`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── اعتماد الشراء — **طبيب أو مسؤول حصراً**، وهو ما يبدأ البيع ────────
  //  ينادي `storage.assignManufacturing` في معاملةٍ واحدة مع سجلّ الاعتماد.
  app.post("/api/followups/:id/approve-purchase", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canApprove(s)) {
      return res.status(403).json({
        error: "اعتماد الشراء للطبيب المخوَّل أو المسؤول العام حصراً",
      });
    }
    const f = await loadInScope(req, res);
    if (!f) return;

    const expertUserId = Number(req.body?.expertUserId);
    if (!Number.isFinite(expertUserId)) {
      return res.status(400).json({ error: "اختيار الخبير مطلوب لبدء التصنيع" });
    }
    //  الخبير يُتحقَّق بنفس قائمة «تخصيص» — فرع المريض وفعّالٌ فيه.
    const patient = await storage.getPatient(f.patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    const v = await validateExpert(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    try {
      const out = await store.approvePurchase({
        followupId: f.id, expertUserId, note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        newValues: { workOrderId: out.workOrderId, approvedPrice: f.approvedPrice },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `اعتماد الشراء لمتابعة #${f.id} بسعر ${f.approvedPrice.toLocaleString()} د.ع — أمر تصنيع #${out.workOrderId}`,
      });
      res.json(out);
    } catch (e) {
      if (fail(res, e)) return;
      //  حارسُ «تخصيص» القائم: ضغطةٌ متزامنة سبقتنا إلى أمر البناء.
      if ((e as any)?.name === "ActiveAssignmentError" || (e as any)?.code === "23505") {
        return res.status(409).json({
          error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — حدّث الصفحة",
        });
      }
      if ((e as any)?.status && (e as any)?.message) {
        return res.status((e as any).status).json({ error: (e as any).message });
      }
      throw e;
    }
  });
}

/** يعيد استعمال تحقّق «تخصيص» نفسه — لا قائمة خبراء ثانية تنحرف عنها. */
async function validateExpert(
  expertUserId: number, branchId: number | null,
): Promise<{ ok: boolean; reason?: string }> {
  if (branchId === null) return { ok: false, reason: "المريض بلا فرع — لا يمكن إسناد خبير" };
  const m = await import("../manufacturing/store");
  return await m.validateExpertForBranch(expertUserId, branchId);
}
