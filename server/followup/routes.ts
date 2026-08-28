// نقاط REST لمتابعة ما بعد المعاينة واعتماد البيع.
//
// ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
//
//   قراءةُ الملفّ                — استقبال · مدير فرع · طبيب · مسؤول
//   المتابعة التجارية (الصفوفُ    — استقبال · مدير فرع · **طبيبٌ مخوَّل** · مسؤول
//   الموروثة — `service_path`
//   ≠ `exam` فقط)
//   (تأجيل · إغلاق · إعادة فتح · تواصل · إسناد خبير · تأكيد شراء ·
//    تحديد السعر التجاري)
//   إشارةُ «يرغب بالشراء الآن»   — طبيبٌ مخوَّل · مسؤول
//   حسمُ طلبِ سعرٍ قديمٍ معلَّق    — طبيبٌ مخوَّل · مسؤول (توافقٌ رجعي)
//
// ══ ⚠ **مسارُ المعاينة الجديد (`service_path = 'exam'`) — المرحلة الثانية،
//    وتصحيحُها 2026-08-28** ═══════════════════════════════════════════════
//
//   إتمامُ البيع / «لم يشترِ»    — **استقبال · محاسب · مدير فرع · مسؤول
//   (`/complete-sale`, `/not-bought`)  عام — ولا الطبيبُ إطلاقاً**
//   (`canCompleteReceptionSale`، مصدرُ الحقيقة الواحد — والبابان الجديدان
//   يتحقّقان صراحةً من `service_path = 'exam'` قبل أيّ كتابة).
//
//   **وكلُّ بابٍ تجاريٍّ قديم — `/expert`, `/commercial`,
//   `/commercial-price`, `/confirm-purchase`, `/approve-purchase`, `/close`،
//   ومعها `/defer`, `/accept-price`, `/purchase-interest` — متقاعدٌ على
//   هذا المسار للجميع بلا استثناءٍ للدور، ولو كان مسؤولاً عاماً.**
//   `retiredOnExamPath` هي الحارسُ الواحد لكلّها: **عقدُ مسارٍ لا قيدُ
//   صلاحية** — الردُّ ٤٠٩ لا ٤٠٣، لأن المشكلة «هذا البابُ ليس بابَ هذه
//   العملية» لا «أنت لا تملك صلاحية».
//
// **والقاعدةُ في سطر لهذا المسار**: لا سلطةَ تجاريةً للطبيب إطلاقاً على
// الإطلاق — لا من الأبواب الجديدة ولا من القديمة (القسم 4.h/4.f/4.i في
// CLAUDE.md). **والمحاسبُ كالاستقبال تماماً هنا** — كلاهما يكلّم المريض
// ويقرّر البيع، وهذا خلاف بابِ «تحديد السعر التجاري» القديم (مديرُ الفرع/
// المسؤول حصراً) الذي **بقي محصوراً بحرفه للصفوف الموروثة وحدها** (ولا
// يجوز أن يُستعمَل على مسار المعاينة إطلاقاً بعد اليوم — مثله كمثل بقية
// الأبواب القديمة). الاستعلاماتُ (استقبالٌ أو محاسبٌ أو مديرُ فرع) تختار
// الخبيرَ وتُدخل السعرَ الأصليّ ومقدارَ الخصم، والخادمُ يشتقّ الباقي ويبيع
// ذرّياً. **وصفوفُ المسار القديم لا تُمَسّ**: تبقى على قاعدة الصلاحيات
// الموروثة أعلاه بحرفها — بما فيها الطبيب.
//
// **وسلطةُ المسؤول تُفحَص أوّلاً** في كل بوّابة، فلا يقيّدها دورٌ عاديّ —
// ومَن يحمل `isAdmin` يمرّ **بهذه السلطة لا بدوره**، طبيباً كان أم غيره.
// **والطبيبُ المسؤولُ الفعليّ في النظام القائم يحمل `isAdmin`**، فسلطتُه
// التجاريةُ الكاملة تمرّ من هنا — لا من دورٍ طبّيٍّ خاص، ولا من هويّةٍ
// مكتوبةٍ في الكود.
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
import {
  saleState, missingLabel, PURCHASE_DECISION_LABELS, PRICE_KIND_LABELS,
  COMMERCIAL_FIELD_LABELS, canOverwriteCommercialField, ownerLabel,
  examPathActions, examPathStatusLine, canCompleteReceptionSale,
  type CommercialField,
} from "@shared/commercial";
import * as discountStore from "../discounts/store";
import { followupDiscountRef } from "@shared/discount";
import { mayApproveHere as mayApproveDiscountHere, discountAuditNote } from "../discounts/routes";

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

/**
 * الجلسةُ كما يقرؤها حارسُ المالكية (ترحيل ٠٦٦) — **من الجلسة الموقَّعة لا
 * من الطلب**. تُمرَّر إلى كلّ كاتبٍ تجاريّ في المخزن، والمُترجِمُ يُلزم بها
 * في التوقيع فلا يسقط الحارسُ بالسهو.
 */
const ownerSessionOf = (req: Req) => {
  const s = getSession(req);
  return {
    userId: s.userId, role: s.role, isAdmin: s.isAdmin, permissions: s.permissions,
  };
};

/**
 * **الأبوابُ المتقاعدة على مسار المعاينة — للجميع بلا استثناءٍ للدور**
 * (المرحلة الثانية، وتصحيحُها 2026-08-28).
 *
 * `defer` · «قبل السعر» · «يرغب بالشراء» · **«إغلاقٌ بلا شراء» القديم**
 * (`/close`) — ومعها الآن `/expert` و`/commercial` و`/commercial-price`
 * و`/confirm-purchase`/`/approve-purchase` — كانت خطواتٍ حول واقعةٍ واحدة
 * صار يُسجّلها الموظّفُ مباشرة: اشترى (`/complete-sale`) أو لم يشترِ
 * (`/not-bought`، سببٌ حرٌّ إلزاميّ لا رمزٌ من قائمةٍ ثابتة). فتُردّ على
 * العمليات الجديدة برسالةٍ تدلّ على البابِ الواحد.
 *
 * **وهذا عقدُ مسارٍ لا قيدُ صلاحية** — الردُّ ٤٠٩ لا ٤٠٣، وللجميع بلا
 * استثناء: **الاستقبالُ والمحاسبُ ومديرُ الفرع والمسؤولُ العام يُردّون عن
 * هذه الأبواب على عمليةٍ من المسار الجديد بعينه تماماً كالطبيب** — لا لأنهم
 * لا يملكون الصلاحية (يملكونها، عبر `/complete-sale` و`/not-bought`)، بل
 * لأن البابَ القديم نفسَه تقاعد على هذا المسار. **تصحيحٌ عن تصميمٍ أوّل** كان
 * يستثني الاستقبالَ ومديرَ الفرع والمسؤولَ من هذا التقاعد بحارسٍ دوريٍّ منفصل
 * (`blockedOnNewExamPath`، مُزال) — فبابان فقط يُتمّان البيعَ على هذا
 * المسار، ولا ثالثَ ولو لمسؤولٍ عام.
 *
 * **والصفوفُ القديمة لا تُمَسّ**: حلقةٌ بلا مسار (`service_path IS NULL`) أو
 * متابعةٌ بلا حلقة تبقى على أفعالها كلِّها حتى تنفد — فلا يُحبَس ملفٌّ في
 * حالةٍ لا زرَّ لها، وتبقى `/expert`/`/commercial`/`/commercial-price`/
 * `/confirm-purchase`/`/close` مفتوحةً لها بقاعدة الصلاحيات الموروثة أعلاه
 * بحرفها — بما فيها الطبيب.
 */
async function retiredOnExamPath(res: any, followupId: number): Promise<boolean> {
  if (!(await store.isExamPathFollowup(followupId))) return false;
  res.status(409).json({
    error: "هذه العملية على المسار المبسّط — سجّل «اشترى» أو «لم يشترِ»"
      + " من «إتمام البيع» مباشرة في بطاقة المريض.",
  });
  return true;
}

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
 * رسالةُ الردّ لمن ليس من مسؤولي المتابعة.
 *
 * **تقول مَن يفعلها لا «غير مصرح» عارية**: مَن يقرأ ردّاً عارياً يظنّ حسابَه
 * معطّلاً ويتّصل بالدعم. وهي تصيب المحاسبَ والمعالجَ وخبيرَ الأطراف —
 * أمّا الطبيبُ المخوَّل فيمرّ.
 */
const COMMERCIAL_ONLY =
  "متابعة ما بعد المعاينة للاستقبال ومدير الفرع والطبيب المخوَّل والمسؤول العام";

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
    const s = getSession(req);
    const owner = ownerSessionOf(req);
    const withDetail = await Promise.all(rows.map(async (f) => {
      //  ══ **الشاشةُ تقرأ ما يقرؤه الخادم** (المرحلة ٢) ══════════════════
      //  ما بقي ناقصاً · وأيُّ حقلٍ مقفولٌ على مَن · والأفعالُ المتاحة —
      //  كلُّها من الدوالّ التي تحرس النقاط نفسِها، فلا يظهر زرٌّ يُردّ ولا
      //  يُخفى زرٌّ يُقبَل.
      const examPath = f.episodeServicePath === "exam";
      const st = saleState({
        priceKind: f.priceKind, expertUserId: f.selectedExpertUserId,
      });
      //  **صلاحيةُ المسار الجديد لا القديمة**: البيعُ على مسار المعاينة
      //  بابان فقط (`/complete-sale`, `/not-bought`)، ومَن يفتحهما
      //  `canCompleteReceptionSale` — لا `canConfirmPurchase` الموروثة
      //  (تشمل الطبيبَ لصفوفٍ قديمة لا علاقة لها بهذا المسار).
      const mayAct = canCompleteReceptionSale(owner);
      return {
        ...f,
        examPath,
        missing: st.missing,
        missingLabel: missingLabel(st.missing),
        statusLine: examPath
          ? examPathStatusLine({
            status: f.status, decision: f.purchaseDecision, missing: st.missing,
          })
          : null,
        actions: examPath
          ? examPathActions({
            session: owner, status: f.status,
            decisionField: {
              owner: f.purchaseDecisionOwner, ownerUserId: f.purchaseDecisionUserId,
              ownerName: f.purchaseDecisionName,
            },
            mayAct,
          })
          : null,
        //  **الأقفالُ يقولها الخادم** — والشاشةُ تعرضها ولا تخترعها.
        locks: {
          price: !canOverwriteCommercialField({
            field: {
              owner: f.priceOwner, ownerUserId: f.priceOwnerUserId,
              ownerName: f.priceOwnerName,
            }, session: owner,
          }),
          expert: !canOverwriteCommercialField({
            field: {
              owner: f.expertOwner, ownerUserId: f.expertOwnerUserId,
              ownerName: f.expertOwnerName,
            }, session: owner,
          }),
          decision: !canOverwriteCommercialField({
            field: {
              owner: f.purchaseDecisionOwner, ownerUserId: f.purchaseDecisionUserId,
              ownerName: f.purchaseDecisionName,
            }, session: owner,
          }),
        },
        ownerLabels: {
          price: ownerLabel({
            owner: f.priceOwner, ownerUserId: f.priceOwnerUserId,
            ownerName: f.priceOwnerName,
          }),
          expert: ownerLabel({
            owner: f.expertOwner, ownerUserId: f.expertOwnerUserId,
            ownerName: f.expertOwnerName,
          }),
          decision: ownerLabel({
            owner: f.purchaseDecisionOwner, ownerUserId: f.purchaseDecisionUserId,
            ownerName: f.purchaseDecisionName,
          }),
        },
        events: await store.getEvents(f.id),
        priceRequests: await store.getPriceRequests(f.id),
      };
    }));
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

  // ── الخدماتُ التي يحكمها ملفُّ متابعةٍ حيّ — **لإخفاء الباب المكرَّر** ──
  //  سجلُّ المرضى يسأل هذه أوّلاً فلا يعرض «تخصيص وإسناد خبير» لخدمةٍ
  //  سيردّها الخادم. وهي **قراءةٌ محضة**: الحارسُ في `assign-manufacturing`
  //  لم يُمسّ، وهذا إخفاءُ زرٍّ لا استبدالُ حراسة.
  app.get("/api/followups/governed", isAuthenticated, async (req: Req, res) => {
    if (!canViewFollowup(getSession(req))) return res.json({ governed: {} });
    res.json({ governed: await store.governedServices(branchScope(req)) });
  });

  // ── تأجيل ────────────────────────────────────────────────────────────
  app.post("/api/followups/:id/defer", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
    const f = await loadInScope(req, res);
    if (!f) return;
    if (await retiredOnExamPath(res, f.id)) return;
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
    if (await retiredOnExamPath(res, f.id)) return;
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

  // ── إغلاق بلا شراء — **متقاعدٌ على مسار المعاينة** (المرحلة الثانية) ──
  app.post("/api/followups/:id/close", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canActCommercially(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
    const f = await loadInScope(req, res);
    if (!f) return;
    if (await retiredOnExamPath(res, f.id)) return;
    try {
      const updated = await store.closeWithoutPurchase({
        followupId: f.id, reason: String(req.body?.reason ?? ""),
        note: str(req.body?.note), actor: actorOf(req),
        //  حارسُ المالكية: لا يُقلَب قرارُ الطبيب «اشترى» إلى إغلاق.
        session: ownerSessionOf(req),
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
    //  ══ **بوّابةٌ واحدة لاختيار الخبير** — هنا وفي نافذة «اشترى» سواء ══
    //  و`canSelectExpert` المشتركة شرطان: **مَن** (`canConfirmPurchase`)
    //  و**متى** (الملفُّ حيّ). والخادم يفصلهما عمداً كي **لا يكذب رمزُ
    //  الردّ**: مَن لا يملك الصلاحية يُردّ ٤٠٣، وملفٌّ تحوّل أو أُغلق يُردّ
    //  ٤٠٩ من حارس المخزن — فهي حالةُ الصفّ لا صفةُ الطالب. وحارسُ المخزن
    //  يقبل الحالات الخمس الحيّة نفسَها حرفاً، فلا ثغرةَ بين النصفين.
    if (!canConfirmPurchase(s)) {
      return res.status(403).json({ error: COMMERCIAL_ONLY });
    }
    const f = await loadInScope(req, res);
    if (!f) return;
    if (await retiredOnExamPath(res, f.id)) return;
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
        session: ownerSessionOf(req),
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
    if (await retiredOnExamPath(res, f.id)) return;
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

  // ── **تفاصيلُ البيع: بابٌ واحد** (المرحلة الثانية، ترحيل ٠٦٦) ─────────
  //
  //  سعرٌ · خبيرٌ · قرارٌ — في نداءٍ واحد ومعاملةٍ واحدة. ومَن يُدخل آخرَ
  //  حقلٍ ناقصٍ **يُتمّ البيعَ في المعاملة نفسِها**، فلا يُسأل «اشترى؟» ثانيةً.
  //
  //  **ولا اعتمادَ خصمٍ ولا طابورَ موافقات**: سعرٌ أو خصمٌ أو مجّانيّةٌ
  //  يُدخلها مخوَّلٌ نافذةٌ فوراً. والطلباتُ القديمة المعلَّقة تبقى بمسارها.
  //
  //  **والمالكيةُ في المخزن**: مَن يجوز له الكتابةُ فوق حقلٍ يُحسَم من
  //  الجلسة الموقَّعة تحت قفل الصفّ — لا من الشاشة ولا من جسم الطلب.
  app.post("/api/followups/:id/commercial", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canConfirmPurchase(s)) return res.status(403).json({ error: COMMERCIAL_ONLY });
    const f = await loadInScope(req, res);
    if (!f) return;
    if (await retiredOnExamPath(res, f.id)) return;
    try {
      const out = await store.setCommercialFields({
        followupId: f.id,
        patch: {
          price: req.body?.price ?? null,
          expertUserId: req.body?.expertUserId,
          decision: req.body?.decision,
          notBoughtReason: req.body?.notBoughtReason,
          note: str(req.body?.note),
        },
        actor: actorOf(req),
        session: ownerSessionOf(req),
        //  ══ **مَن يكتب «بوصفه الطبيب»** ═══════════════════════════════
        //  صاحبُ معاينةِ هذه المتابعة بعينه. فطبيبٌ آخر — ولو بنفس
        //  الاختصاص — يكتب بوصفه موظّفاً، ولا يُقفِل حقلاً على زميله.
        asDoctor: await store.isExamDoctorOf(f.id, s.userId),
        validateExpert,
        expertLabel: async (id: number) => {
          const m = await import("../medical/store");
          return (await m.userNames([id]))[id] ?? null;
        },
      });
      //  ══ التدقيق: **حقلٌ حقلاً، بقيمته القديمة والجديدة** ═════════════
      for (const field of out.changed) {
        const label = COMMERCIAL_FIELD_LABELS[field as CommercialField];
        const oldV = field === "price" ? f.approvedPrice
          : field === "expert" ? f.selectedExpertUserId : f.purchaseDecision;
        const newV = field === "price" ? out.followup.approvedPrice
          : field === "expert" ? out.followup.selectedExpertUserId
            : out.followup.purchaseDecision;
        await logAudit({
          entityType: "post_exam_followup", entityId: f.id, action: "update",
          userId: s.userId, userName: s.userName, branchId: f.branchId,
          oldValues: { [field]: oldV }, newValues: { [field]: newV },
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `تفاصيل البيع — ${label} لمتابعة #${f.id}: ${String(oldV ?? "غير محدد")}`
            + ` ⟶ ${String(newV ?? "غير محدد")}`
            + (field === "price" && out.followup.priceKind
              ? ` (${PRICE_KIND_LABELS[out.followup.priceKind]})` : ""),
        });
      }
      if (out.converted) {
        await logAudit({
          entityType: "prosthetic_work_order", entityId: out.workOrderId ?? 0,
          action: "create", userId: s.userId, userName: s.userName, branchId: f.branchId,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `تم الشراء وبدأ التصنيع — متابعة #${f.id}`
            + ` بسعر ${out.followup.approvedPrice.toLocaleString()} د.ع`
            + (out.followup.priceKind === "free" ? " (مجاني)" : ""),
        });
      }
      res.json({
        ...out.followup,
        converted: out.converted,
        workOrderId: out.workOrderId,
        closed: out.closed,
        missing: out.missing,
        //  ورسالةٌ تقول ما بقي بالعربية — لا رمزَ حقلٍ إنجليزيّ.
        missingLabel: missingLabel(out.missing),
        decisionLabel: out.followup.purchaseDecision
          ? PURCHASE_DECISION_LABELS[out.followup.purchaseDecision] : null,
      });
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  **إتمامُ البيع المبسّط — بابٌ واحد** (المرحلة الثانية)
  //
  //  الاستقبالُ يختار الخبير ويُدخل السعرَ الأصليّ ومقدارَ الخصم فقط.
  //  **لا `finalPrice` ولا `priceKind` ولا قرارَ شراء يُقبَل من العميل** —
  //  الثلاثةُ تُشتَقّ في الخادم (`deriveOfferFromDiscount`) ثمّ تُسلَّم إلى
  //  `setCommercialFields` القانونية بوصفها بياناتِ السيرفر لا الطلب. وحفظٌ
  //  واحد = بيعٌ كامل: لا خطوةَ «تفاصيل البيع» ثم خطوةَ «اشترى» منفصلتين —
  //  الحفظُ **هو** قرارُ «اشترى»، ويبدأ التصنيعُ في المعاملة نفسِها عبر
  //  `storage.assignManufacturing` (المسارُ القانونيُّ الوحيد، بلا نسخةٍ
  //  ثانية من المحاسبة).
  // ══════════════════════════════════════════════════════════════════════
  app.post("/api/followups/:id/complete-sale", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canCompleteReceptionSale(s)) {
      return res.status(403).json({
        error: "إتمامُ البيع للاستقبال والمحاسب ومدير الفرع والمسؤول العام — لا الطبيب",
      });
    }
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const out = await store.completeReceptionSale({
        followupId: f.id,
        originalPrice: req.body?.originalPrice,
        discountAmount: req.body?.discountAmount,
        expertUserId: req.body?.expertUserId,
        note: str(req.body?.note),
        actor: actorOf(req),
        session: ownerSessionOf(req),
        validateExpert,
        expertLabel: async (id: number) => {
          const m = await import("../medical/store");
          return (await m.userNames([id]))[id] ?? null;
        },
      });
      const discountAmount = (out.followup.originalPrice ?? 0) - out.followup.approvedPrice;
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: {
          approvedPrice: f.approvedPrice, priceKind: f.priceKind,
          selectedExpertUserId: f.selectedExpertUserId, purchaseDecision: f.purchaseDecision,
        },
        newValues: {
          originalPrice: out.followup.originalPrice, approvedPrice: out.followup.approvedPrice,
          priceKind: out.followup.priceKind, selectedExpertUserId: out.followup.selectedExpertUserId,
          purchaseDecision: "bought",
        },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `إتمامُ بيعٍ مبسّط لمتابعة #${f.id} — سعرٌ أصليّ`
          + ` ${out.followup.originalPrice?.toLocaleString() ?? "—"} د.ع`
          + ` وخصمٌ ${discountAmount.toLocaleString()} د.ع`
          + ` ⟶ نهائيّ ${out.followup.approvedPrice.toLocaleString()} د.ع`
          + (out.followup.priceKind === "free" ? " (مجاني)" : ""),
      });
      await logAudit({
        entityType: "prosthetic_work_order", entityId: out.workOrderId ?? 0,
        action: "create", userId: s.userId, userName: s.userName, branchId: f.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تم الشراء وبدأ التصنيع — متابعة #${f.id} بسعر`
          + ` ${out.followup.approvedPrice.toLocaleString()} د.ع`
          + (out.followup.priceKind === "free" ? " (مجاني)" : ""),
      });
      res.json({
        ...out.followup,
        converted: out.converted,
        workOrderId: out.workOrderId,
        decisionLabel: PURCHASE_DECISION_LABELS.bought,
      });
    } catch (e) { if (!fail(res, e)) throw e; }
  });

  // ── «لم يشترِ» — فعلٌ منفصل، بسببٍ حرٍّ إلزاميّ (المرحلة الثانية) ─────
  //  يُغلق الملفَّ بلا تصنيعٍ ولا كلفةٍ ولا دينار. السببُ نصٌّ حرٌّ يُكتب كما
  //  قاله المريض — لا رمزٌ من قائمةٍ ثابتة كما كان البابُ القديم `/close`.
  app.post("/api/followups/:id/not-bought", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canCompleteReceptionSale(s)) {
      return res.status(403).json({
        error: "«لم يشترِ» للاستقبال والمحاسب ومدير الفرع والمسؤول العام — لا الطبيب",
      });
    }
    const f = await loadInScope(req, res);
    if (!f) return;
    try {
      const updated = await store.completeReceptionNotBought({
        followupId: f.id,
        reason: req.body?.reason,
        note: str(req.body?.note),
        actor: actorOf(req),
        session: ownerSessionOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: { status: f.status },
        newValues: { status: "closed_without_purchase", reason: str(req.body?.reason) },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `«لم يشترِ» — متابعة #${f.id}: ${str(req.body?.reason) ?? ""}`,
      });
      res.json({ ...updated, decisionLabel: PURCHASE_DECISION_LABELS.not_bought });
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
    //  وهذا البابُ متقاعدٌ كذلك على مسار المعاينة — القسم 4.i: تحديدُ السعر
    //  التجاري القديم يبقى محصوراً بالصفوف الموروثة وحدها.
    if (await retiredOnExamPath(res, f.id)) return;
    if (req.body?.finalPrice === undefined || req.body?.finalPrice === null) {
      return res.status(400).json({ error: "السعر النهائي مطلوب" });
    }
    try {
      const out = await store.setCommercialPrice({
        session: ownerSessionOf(req),
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

  // ── تأكيد الشراء وبدء التصنيع ────────────────────────────────────────
  //  **الاستقبالُ ومديرُ الفرع والطبيبُ المخوَّل والمسؤول العام.**
  //
  //  ومشاركةُ الطبيب هنا **اختيارٌ لا واجب**: يسجّلها إن وقف المريضُ أمامه
  //  والاستعلامات مشغول، ولا يقف عليه بيعٌ أبداً — الاستقبالُ ومديرُ الفرع
  //  يُتمّان المسارَ وحدهما، ولا حالةَ فيه تنتظر طبيباً.
  //
  //  **وسلطةُ المسؤول تسبق الدور**: `canConfirmPurchase` تفحص `isAdmin`
  //  أوّلاً، فحسابٌ دورُه عاديٌّ ويحمل السلطة يمرّ بها لا بدوره.
  //
  //  ينادي `storage.assignManufacturing` في معاملةٍ واحدة مع سجلّ التأكيد.
  //  ولا مسارَ تصنيعٍ ثانٍ: الباب هو الباب، والمتغيّر حارسُه وحده.
  async function confirmPurchaseHandler(req: Req, res: any) {
    const s = getSession(req);
    if (!canConfirmPurchase(s)) {
      return res.status(403).json({ error: COMMERCIAL_ONLY });
    }
    const f = await loadInScope(req, res);
    if (!f) return;
    if (await retiredOnExamPath(res, f.id)) return;

    const patient = await storage.getPatient(f.patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });

    // ══ الخبيرُ الناقص يُختار **هنا**، والموجودُ لا يُستبدَل ═════════════
    //
    // كان الحقلُ لا يُقرأ من الجسم إطلاقاً، والزرُّ يُعطَّل حتى يُختار
    // الخبيرُ من نقطةٍ أخرى. فصار على الموظّف أن يخرج ويختار ويعود ويضغط —
    // ثلاثُ خطواتٍ لسؤالٍ واحد. والنافذةُ الآن تسأله في مكانه.
    //
    // **والأمانُ لم يضعف، بل تحدّد**:
    //   • رقمٌ من الجسم يُقرأ **فقط** حين لا خبيرَ محفوظاً — فالموجودُ
    //     اختاره أحدٌ صراحةً ولا يُبدَّل من باب البيع.
    //   • ويُكتب بنقطة الاختيار نفسها (`store.selectExpert`) بحدثها
    //     وتدقيقها — لا كتابةً جانبية.
    //   • ويُتحقَّق منه بـ`validateExpertForBranch` نفسها: فرعُ المريض،
    //     حسابٌ فعّال، صفةُ خبير.
    //   • وبوّابتُه `canSelectExpert` — «مَن يُتمّ البيع يختار خبيرَه».
    let workingFollowup = f;
    if (f.selectedExpertUserId === null) {
      const rawExpert = req.body?.expertUserId;
      const askedExpert = rawExpert === undefined || rawExpert === null || rawExpert === ""
        ? null : Number(rawExpert);
      if (askedExpert === null || !Number.isFinite(askedExpert) || !Number.isInteger(askedExpert)
        || askedExpert <= 0) {
        return res.status(400).json({
          error: "لم يُختَر خبير لهذا الجهاز — اختر الخبير المسؤول لإتمام البيع",
        });
      }
      //  ولا بوّابةَ ثانية هنا: `canConfirmPurchase` فُحصت في رأس المعالج،
      //  وهي **نصفُ `canSelectExpert` الأوّل بعينه**. وحياةُ الملفّ — نصفُها
      //  الثاني — يحرسها `store.selectExpert` بـ٤٠٩، فلا يُكتب خبيرٌ على
      //  ملفٍّ تحوّل أو أُغلق.
      const okExpert = await validateExpert(askedExpert, patient.branchId);
      if (!okExpert.ok) return res.status(400).json({ error: okExpert.reason });
      try {
        workingFollowup = await store.selectExpert({
          session: ownerSessionOf(req),
          followupId: f.id, expertUserId: askedExpert, actor: actorOf(req),
        });
        await logAudit({
          entityType: "post_exam_followup", entityId: f.id, action: "update",
          userId: s.userId, userName: s.userName, branchId: f.branchId,
          oldValues: { selectedExpertUserId: null },
          newValues: { selectedExpertUserId: askedExpert },
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `اختيار الخبير #${askedExpert} ضمن نافذة «اشترى»`,
        });
      } catch (e) { if (!fail(res, e)) throw e; return; }
    }

    //  ويُتحقَّق من الخبير **المحفوظ**: قد يكون غادر الفرع أو عُطّل حسابُه
    //  منذ اختياره.
    const v = await validateExpert(workingFollowup.selectedExpertUserId!, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // ══ أولُ سعرٍ حين سكتت المعاينة — **ليس خصماً** ════════════════════
    // الطبيبُ قد يترك كلفةَ الجهاز فارغة، فلا يكون للجهاز سعرٌ أصليٌّ قطّ.
    // وأولُ رقمٍ يُكتب حينها هو **السعر الطبيعي** لا تخفيضٌ لشيء — فيُدخله
    // مَن يُتمّ البيع بلا اعتماد، ولا يقف المريضُ على مدير الفرع لسهوِ حقل.
    //
    // **والحارسُ شرطٌ لا دور**: المخزن يرفض الكتابة إن كان السعر موجباً
    // أصلاً (يفحصه تحت القفل)، فمتى وُجد سعرٌ صار تخفيضُه خصماً يمرّ ببابه.
    if (workingFollowup.approvedPrice <= 0) {
      const raw = req.body?.originalPrice;
      const asked = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      if (asked === null || !Number.isFinite(asked) || !Number.isInteger(asked) || asked <= 0) {
        return res.status(400).json({
          error: "لم يحدّد الطبيب كلفة الجهاز — أدخل السعر الأصلي لإتمام البيع",
        });
      }
      try {
        workingFollowup = await store.setInitialCommercialPrice({
          session: ownerSessionOf(req),
          followupId: f.id, originalPrice: asked, actor: actorOf(req),
        });
        await logAudit({
          entityType: "post_exam_followup", entityId: f.id, action: "update",
          userId: s.userId, userName: s.userName, branchId: f.branchId,
          oldValues: { approvedPrice: f.approvedPrice, priceSource: f.priceSource },
          newValues: { approvedPrice: asked, priceSource: "reception_set" },
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `تحديد السعر الأصلي لأول مرّة (المعاينة بلا كلفة): ${asked.toLocaleString()} د.ع`,
        });
      } catch (e) { if (!fail(res, e)) throw e; return; }
    }

    // ══ خصمٌ أو تبرّع؟ ⟶ بابُ الاعتماد. وإلّا فالمسارُ كما هو حرفاً ══════
    // **والسعرُ الأصلي هو السعرُ المحفوظ على الصفّ** — كلفةُ المعاينة، أو
    // قرارُ مدير الفرع، أو أولُ سعرٍ كُتب قبل سطرين. ولا رقمَ من الطلب.
    //
    // ولا يتحوّل الملفُّ ولا يُنشأ أمرُ تصنيعٍ ولا تُقيَّد كلفةٌ قبل الاعتماد:
    // `confirmPurchase` تُنادى من `applyApproved` وحدها بعده.
    const dsc = req.body?.discount;
    const wantsFree = dsc?.isFree === true;
    const wantsCut = dsc && dsc.finalPrice !== undefined && dsc.finalPrice !== null
      && dsc.finalPrice !== "" && Number(dsc.finalPrice) !== workingFollowup.approvedPrice;
    if (wantsFree || wantsCut) {
      try {
        const out = await discountStore.submitDiscount({
          patientId: f.patientId, department: f.serviceType as any,
          branchId: f.branchId, contextRef: followupDiscountRef(f.id),
          originalPrice: workingFollowup.approvedPrice,
          finalPrice: wantsFree ? 0 : Number(dsc.finalPrice),
          isFree: wantsFree,
          reason: String(dsc?.reason ?? ""), note: str(dsc?.note),
          //  **الخبيرُ من الصفّ العامل لا من صورته الأولى**: قد يكون اختير
          //  قبل سطورٍ داخل هذه النافذة نفسها، و`f` لقطةٌ سبقت ذلك. وقراءتُها
          //  هنا كانت تُفشل أشدَّ الحالات وقوعاً — «لا سعرَ ولا خبيرَ ثم خصم»
          //  — برسالةٍ تطلب خبيراً **اختير فعلاً في النداء نفسه**.
          payload: {
            followupId: f.id, expertUserId: workingFollowup.selectedExpertUserId,
          },
          actor: actorOf(req),
          actorMayApprove: mayApproveDiscountHere(req, f.branchId),
          //  **الاعتمادُ المباشر يكتب سطرَه داخل معاملته** — فلا يُعتمد
          //  خصمٌ ويتحرّك مالٌ بإذنٍ لا أثرَ له.
          audit: {
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            note: (row) => discountAuditNote(row, "طلب واعتماد"),
          },
        });
        //  والمعلَّقُ وحده يُدقَّق من هنا: لا مالَ تحرّك، فسطرُه أفضلُ جهدٍ
        //  كبقيّة النظام — ولا يستطيع أن يُفشل ما نجح.
        if (out.status === "pending") {
          await logAudit({
            entityType: "service_discount", entityId: out.request.id,
            action: "create",
            userId: s.userId, userName: s.userName, branchId: f.branchId,
            newValues: {
              patientId: f.patientId, followupId: f.id,
              department: f.serviceType, status: out.request.status,
            },
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            notes: discountAuditNote(out.request, "طلب"),
          });
        }
        //  ══ ورايةُ «يرغب بالشراء» تُرفع تلقائياً — **بلا زرٍّ ثانٍ** ══
        //  مَن طلب خصماً لمريضٍ فقد أعلن أن المريض يريد الشراء. فبدل أن
        //  يُطلَب من الموظّف أن يضغط زرّاً إضافياً ليقول ما قاله فعله،
        //  تُرفع الرايةُ هنا — **idempotent** (الثانيةُ لا تُنشئ حدثاً ولا
        //  تغيّر صاحبَها)، و**فشلُها لا يُفشل شيئاً**: هي ترتيبُ طابورٍ
        //  لا مال.
        if (out.status === "pending") {
          try {
            await store.signalPurchaseInterest({ followupId: f.id, actor: actorOf(req) });
          } catch (e) {
            console.error("[followup] purchase-interest signal failed:", e);
          }
        }
        return res.json({
          ok: true, pendingApproval: out.status === "pending",
          discountRequestId: out.request.id, discountStatus: out.request.status,
          workOrderId: out.applied?.workOrderId ?? null,
          followup: out.applied?.followup ?? workingFollowup,
        });
      } catch (e: any) {
        if (e?.name === "DiscountError") return res.status(e.status).json({ error: e.message });
        if (fail(res, e)) return;
        if (e?.name === "ActiveAssignmentError" || e?.code === "23505") {
          return res.status(409).json({
            error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — حدّث الصفحة",
          });
        }
        throw e;
      }
    }

    try {
      const out = await store.confirmPurchase({
        followupId: f.id, note: str(req.body?.note), actor: actorOf(req),
      });
      await logAudit({
        entityType: "post_exam_followup", entityId: f.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: f.branchId,
        oldValues: { status: f.status },
        newValues: {
          status: "converted", workOrderId: out.workOrderId,
          approvedPrice: workingFollowup.approvedPrice,
        },
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تأكيد الشراء لمتابعة #${f.id} بسعر ${workingFollowup.approvedPrice.toLocaleString()} د.ع — أمر تصنيع #${out.workOrderId}`,
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
