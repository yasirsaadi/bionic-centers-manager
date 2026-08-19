// نقاط REST لمتابعة ما بعد المعاينة واعتماد البيع.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   تسجيلُ قرار المريض والمتابعة  — استقبال · مدير فرع · طبيب · مسؤول
//   **طلبُ خصم**                  — استقبال · مدير فرع · طبيب · مسؤول
//   **اعتمادُ/رفضُ الخصم**         — مسؤول · مدير فرع · طبيبٌ مخوَّل
//                                    **وليس صاحبَ الطلب**
//   **تأكيدُ الشراء وبدءُ التصنيع** — استقبال · مدير فرع · طبيب · مسؤول
//
// والفرقُ بين الطلب والاعتماد هو كلّ شيء: **الطلبُ اقتراح** لا يحرّك ديناراً
// — لا سعراً معتمداً ولا كلفةَ مريض ولا قيدَ دفتر ولا أمرَ تصنيع. أمّا
// **الاعتمادُ فقرار** يجعل السعرَ المعتمد هو المخفَّض.
//
// و**«اشترى» تسجيلُ واقعة** وقعت أمام الموظّف بالسعر المعتمد نفسه بلا تغيير
// حرف، فلا سلطةَ تُستأذَن لها ولا خطوةَ «اعتماد شراء» في النظام إطلاقاً.
//
// ودخل مديرُ الفرع في الاعتماد لأن **الخصم قرارٌ تجاري لا سريري**: الطبيبُ
// حدّد الجهازَ وسعرَه في سجلٍّ مختوم، و«نبيعه بأقلّ» مسؤوليةُ مَن يدير
// الفرعَ ويحاسَب على إيراده. وحصرُه بالطبيب كان يعطّل الفرعَ على مكالمة.
//
// **ولا يعتمد أحدٌ طلبَ نفسه** — ولا يرفضه: المطلوب رأيٌ ثانٍ لا نتيجةٌ
// بعينها. ويُفحص من `requested_by` المحفوظ، هنا وتحت القفل في المخزن معاً.
//
// وليس شرطاً أن يكون **طبيب المعاينة نفسه**: أي مخوَّلٍ في الفرع يعتمد،
// وإلّا تجمّد ملفّ المريض حتى يعود زميلٌ من إجازته.
//
// ونطاقُ الفرع مفروضٌ في كل نقطة: يُقرأ فرع المتابعة من صفّها لا من الطلب —
// وهو ما يحدّ مديرَ الفرع والطبيبَ بفروعهما، والمسؤولُ وحده يتجاوزه.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import * as store from "./store";
import { FollowupError } from "./store";
import {
  canApproveDiscount, canApproveLegacyPriceChange, canConfirmPurchase,
  canDecidePriceRequest, canRecordFollowup, canViewFollowup, isSelfDecision,
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

  // ── «بانتظار موافقتي» — **طلباتُ الخصم وحدها** ───────────────────────
  //  ولا اعتمادَ شراءٍ فيها ولا يعود: مهامٌّ روتينية لا قرارَ فيها كانت
  //  تُغرق الشاشة وتحبس الفرع. والباقي اعتمادٌ حقيقي على المال.
  app.get("/api/followups/approvals", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canApproveDiscount(s)) {
      //  قائمةٌ فارغة لا 403: الشاشة تُعرض للجميع وتخلو لمن لا يعتمد.
      return res.json({ priceApprovals: [], mayApprove: false });
    }
    //  **مديرُ الفرع يرى الخصومَ وحدها**: الصفوفُ القديمة قد تكون رفعَ سعر
    //  لا يملك اعتمادَه، فإبقاؤها في طابوره عدَدٌ يراه ولا يستطيع إنهاءه.
    const out = await store.listPendingApprovals(
      branchScope(req), canApproveLegacyPriceChange(s));
    res.json({ ...out, mayApprove: true, mayDecideLegacy: canApproveLegacyPriceChange(s) });
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

  // ── طلبُ خصم — **اقتراحٌ لا تعديل، ولا دينارَ يتحرّك** ────────────────
  async function discountRequestHandler(req: Req, res: any) {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const out = await store.requestDiscount({
        followupId: f.id,
        mode: String(req.body?.discountMode ?? ""),
        value: Number(req.body?.discountValue),
        reason: String(req.body?.reason ?? ""), note: str(req.body?.note),
        actor: actorOf(req),
      });
      await logAudit({
        entityType: "price_change_request", entityId: out.requestId, action: "create",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `طلب خصم لمتابعة #${f.id}: ${f.approvedPrice.toLocaleString()} د.ع ⟶ `
          + `${out.followup.approvedPrice.toLocaleString()} د.ع معتمد حالياً (بانتظار الاعتماد)`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  }
  app.post("/api/followups/:id/discount-request", isAuthenticated, discountRequestHandler);

  // ── النقطةُ القديمة — **مُحوِّلٌ لا اسمٌ ثانٍ** ───────────────────────
  //  صفحةٌ فُتحت قبل النشر ترسل `{ proposedPrice, reason, note }` بمفردات
  //  التأجيل. وإسنادُها إلى معالج الخصم كان **توافقاً مزعوماً**: الحقولُ
  //  تختلف، فكلُّ طلبٍ منها كان سيُردّ بـ400 «نوع الخصم مطلوب».
  //
  //  فهي مُحوِّلٌ حقيقي: يقرأ السعرَ النهائي، ويحسب الفرقَ **على السعر
  //  المقفول** في المخزن، ويكتب خصماً مهيكلاً بالمبلغ. **ولا يُبعث رفعُ
  //  السعر من قبرِه**: طلبٌ يساوي السعر أو يفوقه يُردّ برسالةٍ تقول للموظّف
  //  ما الذي تغيّر وتطلب تحديثَ الصفحة.
  app.post("/api/followups/:id/price-request", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canRecordFollowup(s)) return res.status(403).json({ error: "غير مصرح" });
    const f = await loadInScope(req, res);
    if (!f) return;
    if (req.body?.proposedPrice === undefined || req.body?.proposedPrice === null) {
      return res.status(400).json({ error: "السعر المقترح مطلوب" });
    }
    try {
      const out = await store.requestDiscount({
        followupId: f.id,
        legacyProposedPrice: Number(req.body.proposedPrice),
        reason: String(req.body?.reason ?? ""), note: str(req.body?.note),
        actor: actorOf(req),
      });
      await logAudit({
        entityType: "price_change_request", entityId: out.requestId, action: "create",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `طلب خصم (من نافذة قديمة) لمتابعة #${f.id}: `
          + `${f.approvedPrice.toLocaleString()} ⟶ ${Number(req.body.proposedPrice).toLocaleString()} د.ع`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── اعتماد/رفض الخصم — **مخوَّلٌ غيرُ صاحب الطلب** ────────────────────
  async function decideDiscountHandler(req: Req, res: any) {
    const s = getSession(req);
    const requestId = Number(req.params.requestId);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const decision = req.body?.decision === "approve" ? "approve" : "reject";

    //  الصفُّ يُقرأ **قبل** الحارس: السلطةُ تتبع نوعَه لا تاريخَ اليوم.
    const reqs = await store.getPriceRequestById(requestId);
    if (!reqs) return res.status(404).json({ error: "طلب الخصم غير موجود" });

    // ══ سلطةٌ بحسب نوع الصفّ ═══════════════════════════════════════════
    //  صفٌّ بلا `discount_mode` سابقٌ لهذه المرحلة، وقد يكون **رفعَ سعر**.
    //  فيُحكَم بقانون يومه: طبيبٌ مخوَّل أو المسؤول حصراً — ومديرُ الفرع
    //  يُردّ عنه كما كان يُردّ قبل هذه المرحلة تماماً.
    if (!canDecidePriceRequest({
      session: s, isLegacy: reqs.isLegacy, requestedByUserId: reqs.requestedBy,
    })) {
      //  ورسالةٌ تقول **لماذا** لا «غير مصرح» عارية.
      if (reqs.isLegacy && !canApproveLegacyPriceChange(s)) {
        return res.status(403).json({
          error: "هذا سجلّ تعديل سعر قديم — يعتمده الطبيب المخوَّل أو المسؤول العام حصراً",
        });
      }
      if (!canApproveDiscount(s)) {
        return res.status(403).json({
          error: "اعتماد الخصم للمسؤول العام أو مدير الفرع أو الطبيب المخوَّل",
        });
      }
      // ══ ولا يعتمد أحدٌ طلبَ نفسه ═══════════════════════════════════
      //  يُردّ هنا برسالةٍ صريحة قبل فتح المعاملة — والمخزنُ يفحصها ثانيةً
      //  تحت القفل على الصفّ نفسه، فمنادٍ لا يمرّ بهذه النقطة يصطدم بها.
      return res.status(403).json({
        error: "لا يمكنك اعتماد أو رفض طلب خصم قدّمتَه بنفسك — يقرّره مخوَّلٌ آخر",
      });
    }

    //  نطاق الفرع يُفحص من متابعة الطلب — قبل أي كتابة. وهو ما يحدّ مديرَ
    //  الفرع والطبيبَ بفروعهما، والمسؤولُ العام وحده يتجاوزه.
    if (!canReachBranch(req, reqs.branchId)) {
      return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    }

    try {
      const out = await store.decideDiscount({
        requestId, decision, note: str(req.body?.note), actor: actorOf(req),
      });
      // ══ ونصُّ التدقيق يتبع **نوعَ الصفّ** كما تتبعه الأحداث والسلطة ═════
      //  سجلٌّ قديم قد يكون رفعَ سعر، فتسميتُه «خصماً» في دفتر التدقيق
      //  تُفسده حيث لا يُفسَّر: بعد سنة لا يبقى إلّا هذا السطر.
      const kind = reqs.isLegacy ? "تعديل سعر" : "خصم";
      await logAudit({
        entityType: "price_change_request", entityId: requestId, action: "update",
        userId: s.userId, userName: s.userName, branchId: reqs.branchId,
        oldValues: { approvedPrice: reqs.currentPrice },
        newValues: {
          approvedPrice: out.followup.approvedPrice, decision,
          priceSource: out.followup.priceSource, isLegacyPriceChange: reqs.isLegacy,
        },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: decision === "approve"
          ? `اعتماد ${kind} #${requestId}: ${reqs.currentPrice.toLocaleString()} ⟶ ${out.followup.approvedPrice.toLocaleString()} د.ع`
          : `رفض ${kind} #${requestId} — السعر المعتمد بقي ${out.followup.approvedPrice.toLocaleString()} د.ع`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  }
  app.post("/api/discount-requests/:requestId/decide", isAuthenticated, decideDiscountHandler);
  //  الاسمُ القديم — للنوافذ المفتوحة، بنفس الحارس تماماً.
  app.post("/api/price-requests/:requestId/decide", isAuthenticated, decideDiscountHandler);

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
