// نقاط REST لمتابعة ما بعد المعاينة واعتماد البيع.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   تسجيلُ قرار المريض والمتابعة  — استقبال · مدير فرع · طبيب · مسؤول
//   **تأكيدُ الشراء وبدءُ التصنيع** — استقبال · مدير فرع · طبيب · مسؤول
//   اعتمادُ/رفضُ تعديل السعر      — **طبيبٌ مخوَّل أو مسؤول حصراً**
//
// والفرقُ بين السطرين الأوّلين والثالث هو كلّ شيء: **«اشترى» تسجيلُ واقعة**
// وقعت أمام الموظّف بالسعر المعتمد نفسه، فلا سلطةَ تُستأذَن لها. أمّا
// **تعديلُ السعر فاعتماد**: رقمٌ وقّعه الطبيب يُطلب تغييرُه، فيلزم مَن يملك
// تغييره — ومديرُ الفرع ليس منهم عمداً.
//
// وكان تأكيدُ الشراء في الصفّ الثالث خطأً، فحبَس الفرعَ كلَّه بانتظار ضغطةٍ
// لا قرارَ سريرياً فيها. وهذا ما صُحِّح.
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
import {
  canApprove, canConfirmPurchase, canRecordFollowup, canViewFollowup,
} from "@shared/followup";

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
    //  ملفُّ المتابعة يحمل السعر المعتمد وهاتفَ المريض وسببَ تردّده — فقراءتُه
    //  لمسؤولي المتابعة وحدهم. وخبيرُ الأطراف والمحاسب خارجها.
    if (!canViewFollowup(getSession(req))) return res.status(403).json({ error: "غير مصرح" });
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
    if (!canViewFollowup(getSession(req))) return res.status(403).json({ error: "غير مصرح" });
    const rows = await store.listFollowups({
      scope: branchScope(req),
      filter: typeof req.query.filter === "string" ? req.query.filter : "all",
    });
    res.json(rows);
  });

  // ── «بانتظار موافقتي» — **تعديلاتُ السعر وحدها** ─────────────────────
  //  وخرج منها طابورُ «اعتماد الشراء»: مهامٌّ روتينية لا قرارَ سريرياً فيها
  //  كانت تُغرق شاشة الطبيب وتحبس الفرع. والباقي اعتمادٌ حقيقي.
  app.get("/api/followups/approvals", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canApprove(s)) {
      //  قائمةٌ فارغة لا 403: الشاشة تُعرض للجميع وتخلو لمن لا يعتمد.
      return res.json({ priceApprovals: [], mayApprove: false });
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

  // ── «وافق المريض على السعر» ⟶ `purchase_approval_pending` ────────────
  //  **مسارٌ متروك — للتوافق الرجعي وحده.** لا تناديه الواجهة بعد اليوم،
  //  وبابُ العمل صار `/confirm-purchase`. وتبقى هنا كي لا تنكسر نافذةٌ
  //  مفتوحةٌ منذ ما قبل النشر — وما تُنتجه قابلٌ للاستئناف بضغطةٍ واحدة.
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

  // ── اختيار الخبير — **عملُ الاستعلامات، وقبل التصنيع** ───────────────
  //  الطبيب اقترحه في معاينته، والفرع يقرّر. ولا تصنيعَ يبدأ من هنا.
  app.post("/api/followups/:id/expert", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    const expertUserId = Number(req.body?.expertUserId);
    if (!Number.isFinite(expertUserId)) {
      return res.status(400).json({ error: "معرّف الخبير مطلوب" });
    }
    const patient = await storage.getPatient(f.patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    //  نفس تحقّق «تخصيص»: فعّالٌ وفي فرع المريض — لا قائمة خبراء ثانية.
    const v = await validateExpert(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });
    try {
      const updated = await store.selectExpert({
        followupId: f.id, expertUserId, actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: { selectedExpertUserId: f.selectedExpertUserId },
        newValues: { selectedExpertUserId: expertUserId },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `اختيار خبير لمتابعة #${f.id}: #${f.selectedExpertUserId ?? "—"} ⟶ #${expertUserId}`,
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

  // ── تأكيد الشراء وبدء التصنيع — **الاستقبال ومدير الفرع** ────────────
  //  ينادي `storage.assignManufacturing` في معاملةٍ واحدة مع سجلّ التأكيد.
  //  ولا مسارَ تصنيعٍ ثانٍ: الباب هو الباب، والمتغيّر حارسُه وحده.
  async function confirmPurchaseHandler(req: Req, res: any) {
    const s = getSession(req);
    if (!canConfirmPurchase(s)) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const f = await loadInScope(req, res);
    if (!f) return;

    // ══ الخبير **لا يُقبل من الطلب إطلاقاً** ═══════════════════════════
    // اختيارُه فعلٌ مستقلٌّ له نقطتُه وتدقيقُه. فلو قُرئ رقمٌ من الجسم لصار
    // تأكيدُ الشراء باباً خلفياً يسند الجهاز لخبيرٍ لم يُختَر صراحةً.
    // والمخزن يقرأه من الصفّ تحت القفل، وهنا لا يُقرأ الحقل أصلاً —
    // فما لا يُقرأ لا يُهرَّب. والسعرُ كذلك: لا يُقرأ من الطلب هنا ولا هناك.
    const patient = await storage.getPatient(f.patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    if (f.selectedExpertUserId === null) {
      return res.status(409).json({
        error: "اختر الخبير المسؤول أولاً ثم أكّد الشراء",
      });
    }
    //  ويُتحقَّق من الخبير **المحفوظ**: قد يكون غادر الفرع أو عُطّل حسابُه
    //  منذ اختياره.
    const v = await validateExpert(f.selectedExpertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    try {
      const out = await store.confirmPurchase({
        followupId: f.id, note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: { status: f.status },
        newValues: { status: "converted", workOrderId: out.workOrderId, approvedPrice: f.approvedPrice },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تأكيد الشراء لمتابعة #${f.id} بسعر ${f.approvedPrice.toLocaleString()} د.ع — أمر تصنيع #${out.workOrderId}`,
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
  }

  app.post("/api/followups/:id/confirm-purchase", isAuthenticated, confirmPurchaseHandler);
  //  الاسمُ القديم يبقى مسنَداً إلى المعالج نفسه: نافذةٌ مفتوحةٌ منذ ما قبل
  //  النشر تصيبه، ولا يجوز أن تُردّ بـ404 وهي تفعل الصواب.
  app.post("/api/followups/:id/approve-purchase", isAuthenticated, confirmPurchaseHandler);
}

/** يعيد استعمال تحقّق «تخصيص» نفسه — لا قائمة خبراء ثانية تنحرف عنها. */
async function validateExpert(
  expertUserId: number, branchId: number | null,
): Promise<{ ok: boolean; reason?: string }> {
  if (branchId === null) return { ok: false, reason: "المريض بلا فرع — لا يمكن إسناد خبير" };
  const m = await import("../manufacturing/store");
  return await m.validateExpertForBranch(expertUserId, branchId);
}
