// نقاط REST لمتابعة ما بعد المعاينة واعتماد البيع.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   **قراءةُ الملفّ**            — استقبال · مدير فرع · **طبيب** · مسؤول
//   المتابعة التجارية            — استقبال · مدير فرع · مسؤول
//   (تأجيل · إغلاق · إعادة فتح · تواصل · إسناد خبير · تأكيد شراء)
//   تحديدُ السعر التجاري         — **مدير الفرع في فرعه** · مسؤول
//   إشارةُ «يرغب بالشراء الآن»   — **طبيبٌ مخوَّل** · مسؤول
//   حسمُ طلبِ سعرٍ قديمٍ معلَّق    — طبيبٌ مخوَّل · مسؤول (توافقٌ رجعي)
//
// **والقاعدةُ في سطر**: الطبيبُ يملك القرار السريري، والفرعُ يملك القرار
// التجاري. فالطبيبُ يقرأ الملفَّ كلَّه ويرفع إشارةً واحدة — ولا يؤجّل ولا
// يغلق ولا يسنِد خبيراً ولا يؤكّد شراءً ولا يسعّر. وكانت البوّابةُ واحدةً
// لكلّ مَن يلمس الملفّ، فورث الطبيبُ أفعالاً تجاريةً لم يقرّر أحدٌ أن
// تكون له.
//
// وليس تضييقاً عليه بل **رفعُ عبء**: «لم يشترِ» قرارٌ يحتاج مَن كلّم
// المريضَ وسمع سببَه، لا مَن رآه في العيادة قبل أسبوعين.
//
// ونطاقُ الفرع مفروضٌ في كل نقطة: يُقرأ فرع المتابعة من صفّها لا من الطلب.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import * as store from "./store";
import { FollowupError } from "./store";
import {
  canActCommercially, canConfirmPurchase, canDecideLegacyPriceRequest,
  canSetCommercialPrice, canSignalPurchaseInterest, canViewFollowup,
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

/**
 * رسالةُ الردّ حين يطرق الطبيبُ باباً تجارياً.
 *
 * **تقول ما يستطيعه لا ما يُمنَع منه**: طبيبٌ يقرأ «غير مصرح» عارية يظنّ
 * حسابَه معطّلاً ويتّصل بالدعم. وهذه تقول له أين موقعُه من المسار.
 */
const COMMERCIAL_ONLY =
  "المتابعة التجارية للاستقبال ومدير الفرع — وللطبيب قراءةُ الملفّ "
  + "وإشارةُ «المريض يرغب بالشراء الآن»";

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

  // ── «بانتظار موافقتي» — **بقايا المسار القديم وحدها** ────────────────
  //  لم يعد شيءٌ يدخل هذا الطابور: تغييرُ السعر صار قرارَ مديرِ الفرع لا
  //  طلباً. فهو يفرغ ولا يمتلئ، ويبقى كي لا يتجمّد ما كان معلَّقاً لحظةَ
  //  النشر. وحين يفرغ يختفي من الشاشة من تلقائه.
  app.get("/api/followups/approvals", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canDecideLegacyPriceRequest(s)) {
      //  قائمةٌ فارغة لا 403: الشاشة تُعرض للجميع وتخلو لمن لا يحسم.
      return res.json({ priceApprovals: [], mayApprove: false });
    }
    const out = await store.listPendingApprovals(branchScope(req));
    res.json({ ...out, mayApprove: true, legacyOnly: true });
  });

  // ── تأجيل ────────────────────────────────────────────────────────────
  app.post("/api/followups/:id/defer", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
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

  // ── إشارةُ الطبيب «المريض يرغب بالشراء الآن» — **تسليمٌ لا بيع** ──────
  //  لا حالةَ تتغيّر ولا ديناراً يتحرّك: رايةٌ ترفع الملفَّ إلى رأس طابور
  //  الاستعلامات. وتركُها **لا يعني أن المريض رفض**.
  app.post("/api/followups/:id/purchase-interest", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canSignalPurchaseInterest(s)) {
      return res.status(403).json({
        error: "إشارة رغبة الشراء يرفعها الطبيب المخوَّل أو المسؤول العام",
      });
    }
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const out = await store.signalPurchaseInterest({
        followupId: f.id, note: str(req.body?.note), actor: actorOf(req),
      });
      //  والضغطةُ المكرّرة لا تُنتج سطرَ تدقيقٍ ثانياً كما لا تُنتج حدثاً.
      if (!out.alreadySignaled) {
        await logAudit({
          entityType: "post_exam_followup", entityId: f.id, action: "update",
          userId: s.userId, userName: s.userName, branchId: f.branchId,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `إشارة رغبة الشراء لمتابعة #${f.id} — بلا أثرٍ مالي`,
        });
      }
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── تحديدُ السعر التجاري — **قرارُ مديرِ الفرع لا طلبٌ يُعتمَد** ──────
  //  الطبيبُ يملك القرار السريري، والفرعُ يملك القرار التجاري. فلا صفَّ
  //  طلبٍ يُنشأ ولا حالةَ انتظارٍ تُحتجَز ولا طابورَ يمتلئ.
  app.post("/api/followups/:id/commercial-price", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canSetCommercialPrice(s)) {
      return res.status(403).json({
        error: "تحديد السعر النهائي لمدير الفرع أو المسؤول العام — الاستقبال يبيع بالسعر المحفوظ",
      });
    }
    //  ونطاقُ الفرع يُقرأ من صفّ المتابعة: مديرُ فرعٍ آخر يُردّ هنا.
    const f = await loadInScope(req, res);
    if (!f) return;
    if (req.body?.finalPrice === undefined || req.body?.finalPrice === null) {
      return res.status(400).json({ error: "السعر النهائي مطلوب" });
    }
    try {
      const out = await store.setCommercialPrice({
        followupId: f.id, finalPrice: Number(req.body.finalPrice),
        reason: str(req.body?.reason), note: str(req.body?.note),
        actor: actorOf(req),
      });
      const c = out.change;
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: { approvedPrice: c.previousPrice, priceSource: f.priceSource },
        newValues: {
          approvedPrice: c.finalPrice, priceSource: "manager_set",
          difference: c.difference, percentageDifference: c.percentageDifference,
          reason: str(req.body?.reason), note: str(req.body?.note),
        },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: c.changed
          ? `تحديد السعر التجاري لمتابعة #${f.id}: ${c.previousPrice.toLocaleString()} ⟶ ${c.finalPrice.toLocaleString()} د.ع (${c.difference > 0 ? "+" : ""}${c.difference.toLocaleString()}، ${c.percentageDifference}٪)`
          : `تثبيت السعر التجاري لمتابعة #${f.id} كما هو: ${c.finalPrice.toLocaleString()} د.ع`,
      });
      res.json(out);
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── الطلبُ القديم — **بابٌ مغلق، ومعه الطريق** ───────────────────────
  //  لا يُنشأ طلبُ تعديل سعرٍ جديد بعد اليوم. والنافذةُ المفتوحة منذ ما قبل
  //  النشر تُردّ برسالةٍ تقول **ما تغيّر ومَن يفعلها الآن** — لا 404 عارية
  //  ولا صمتٌ يجعل الموظّف يظنّ النظامَ معطّلاً.
  app.post("/api/followups/:id/price-request", isAuthenticated, async (req: Req, res) => {
    return res.status(400).json({
      error: "لم يعد تغييرُ السعر طلباً يُعتمَد — يحدّده مديرُ الفرع مباشرة. حدّث الصفحة.",
    });
  });

  // ── حسمُ طلبٍ قديمٍ معلَّق — **توافقٌ رجعي حتى ينفد** ─────────────────
  //  يُحسَم بقانون يومه: طبيبٌ مخوَّل أو المسؤول. ومديرُ الفرع يُردّ عنه كما
  //  كان يُردّ — فقد يكون رفعَ سعرٍ وقّع الطبيبُ على أصله.
  app.post("/api/price-requests/:requestId/decide", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    //  الحارس أوّلاً وقبل أي قراءة: مديرُ الفرع يُردّ هنا صراحةً.
    if (!canDecideLegacyPriceRequest(s)) {
      return res.status(403).json({
        error: "هذا طلبٌ قديم — يحسمه الطبيب المخوَّل أو المسؤول العام حصراً",
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
    //  **والطبيبُ يُردّ هنا صراحةً**: هذه الضغطة تفتح أمرَ تصنيعٍ وتقيّد
    //  كلفةً — فعلٌ تشغيليٌّ ماليّ لا سريريّ.
    if (!canConfirmPurchase(s)) {
      return res.status(403).json({ error: COMMERCIAL_ONLY });
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
