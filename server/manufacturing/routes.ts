// Manufacturing module routes — /api/manufacturing/*.
//
// Authorization is enforced HERE, on the server, not in the UI:
//   - prosthetics_expert: sees/edits ONLY orders where expert_user_id === his id.
//   - branch_manager: scoped to his accessible branches.
//   - admin: everything.
//   - reception: may read the experts roster (for its branch) and change the
//     expert only BEFORE work has started; never opens the expert workspace.
//   - NO financial fields ever leave the server for any manufacturing route.

import type { Express } from "express";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import * as followupStore from "../followup/store";
import {
  hasSignedExam, isLegacyPatient, latestDeviceCost, prescribedSpecs,
  hasSignedExamForEpisode, latestDeviceCostForEpisode, prescribedSpecsForEpisode,
} from "../medical/store";
import {
  getOpenDeviceEpisode, listDeliveredEpisodes, DeviceEpisodeError,
} from "../device_episodes/store";
import {
  isValidFinalResult, isValidStageFor, DELIVERED_STAGE, isAtOrBeyondMoldStage,
  defaultNextStage, nextStages, reworkReturnStages, isHoldStatus, isValidHoldReason,
  MAINTENANCE_DONE_STAGES,
} from "@shared/manufacturing";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: s?.userId as number | undefined,
    role: s?.role as string | undefined,
    isAdmin: Boolean(s?.isAdmin),
    branchId: s?.branchId as number | undefined,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: s?.permissions ?? {},
  };
}

/**
 * رسالةُ الردّ حين تحكم طبقةُ الاعتماد محاولةَ الشراء.
 *
 * الملفُّ المغلق يحتاج **إعادة فتح** أوّلاً، وغيرُه يحتاج اعتماد الشراء.
 * فالرسالة تدلّ على الخطوة التالية بعينها بدل «ممنوع» عامّة يقف عندها
 * الموظّف لا يعرف ما يفعل.
 */
function bypassMessage(status: string | null): string {
  return status === "closed_without_purchase"
    ? "ملفّ متابعة هذا المريض مغلق بلا شراء — أعِد فتحه من بطاقة «قرار المريض بعد المعاينة» ثم سجّل موافقته ليعتمد الطبيب الشراء"
    : "لهذا المريض متابعةُ ما بعد المعاينة — يُعتمد الشراء من بطاقة «قرار المريض بعد المعاينة» ليبدأ التصنيع";
}

export function registerManufacturingRoutes(app: Express, isAuthenticated: any) {
  // A PURE expert: their primary job is expert. Drives the restrictions
  // (financial lock-out, "experts use the order page", hidden dashboard).
  const isExpert = (s: ReturnType<typeof getSession>) => s.role === store.EXPERT_ROLE;
  // Anyone who may OPERATE the manufacturing board: a pure expert OR a user
  // carrying the expert capability flag (accountant/manager who also does mold
  // work). This is additive to their base role — it never removes access.
  const worksAsExpert = (s: ReturnType<typeof getSession>) =>
    s.role === store.EXPERT_ROLE || Boolean(s.permissions?.canWorkAsExpert);
  const isManager = (s: ReturnType<typeof getSession>) => s.role === "branch_manager";

  // Can this manager/admin session act on `branchId`?
  const branchInScope = (s: ReturnType<typeof getSession>, branchId: number) =>
    s.isAdmin || s.accessible.includes(branchId);

  // ---- experts roster for a branch (for reception's patient form + admin) ----
  app.get("/api/manufacturing/experts", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    // Experts don't assign experts. Everyone else who can add/manage patients may read.
    if (isExpert(s)) return res.status(403).json({ error: "غير مصرح" });
    const canRead = s.isAdmin || isManager(s) || s.permissions?.canAddPatients || s.permissions?.canViewPatients;
    if (!canRead) return res.status(403).json({ error: "غير مصرح" });

    // Non-admins are pinned to a branch they can access; admins pass ?branchId=.
    let branchId: number | undefined;
    if (s.isAdmin) {
      branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
      if (!branchId || Number.isNaN(branchId)) return res.status(400).json({ error: "يجب تحديد الفرع" });
    } else {
      const requested = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
      branchId = requested && !Number.isNaN(requested) ? requested : s.branchId;
      if (branchId === undefined || !branchInScope(s, branchId)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }
    }
    const experts = await store.getExpertsForBranch(branchId);
    res.json(experts);
  });

  // ---- expert's own orders ---------------------------------------------------
  app.get("/api/manufacturing/my-orders", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!worksAsExpert(s) || !s.userId) return res.status(403).json({ error: "غير مصرح" });
    // Optional branch filter must be one of the expert's own branches.
    let branchId: number | undefined;
    if (req.query.branchId) {
      branchId = parseInt(String(req.query.branchId));
      if (Number.isNaN(branchId) || !s.accessible.includes(branchId)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }
    }
    const orders = await store.listOrders({
      expertUserId: s.userId,        // HARD isolation — never trust a client id
      branchId,
      serviceType: strOrU(req.query.serviceType),
      stage: strOrU(req.query.stage),
      status: strOrU(req.query.status),
      completed: boolOrU(req.query.completed),
      search: strOrU(req.query.search),
    });
    res.json(orders);
  });

  // ---- admin / manager order list -------------------------------------------
  app.get("/api/manufacturing/orders", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(s.isAdmin || isManager(s))) return res.status(403).json({ error: "غير مصرح" });
    const filters: store.OrderFilters = {
      serviceType: strOrU(req.query.serviceType),
      stage: strOrU(req.query.stage),
      status: strOrU(req.query.status),
      completed: boolOrU(req.query.completed),
      search: strOrU(req.query.search),
    };
    if (req.query.expertUserId) filters.expertUserId = parseInt(String(req.query.expertUserId));
    if (s.isAdmin) {
      if (req.query.branchId) {
        const b = parseInt(String(req.query.branchId));
        if (!Number.isNaN(b)) filters.branchId = b;
      }
    } else {
      // Manager: pinned to accessible branches; a requested branch must be inside.
      if (req.query.branchId) {
        const b = parseInt(String(req.query.branchId));
        if (Number.isNaN(b) || !s.accessible.includes(b)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
        filters.branchId = b;
      } else {
        filters.branchIds = s.accessible.length ? s.accessible : (s.branchId ? [s.branchId] : [-1]);
      }
    }
    res.json(await store.listOrders(filters));
  });

  // ---- single order detail (scope-checked, no leaks) -------------------------
  app.get("/api/manufacturing/orders/:id", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });
    const raw = await store.getRawOrder(id);
    if (!raw) return res.status(404).json({ error: "الأمر غير موجود" });

    // Authorization BEFORE any patient data is loaded. Access is the UNION of
    // the caller's roles: admin (all), manager (own branches), and anyone who
    // works as an expert may open an order ASSIGNED to them. This lets a
    // manager-expert keep branch-wide access and an accountant-expert reach
    // their own assigned orders.
    const assignedToMe = worksAsExpert(s) && raw.expertUserId === s.userId;
    if (s.isAdmin) {
      // all
    } else if (isManager(s) && branchInScope(s, raw.branchId)) {
      // own branch
    } else if (assignedToMe) {
      // own assigned order
    } else {
      return res.status(403).json({ error: "غير مصرح" });
    }
    res.json(await store.getOrderDetail(id));
  });

  // ---- create an order for an EXISTING patient --------------------------------
  // Admin / manager anywhere in their scope; reception may also start
  // manufacturing for a patient of ITS OWN branch (the examined-then-decided
  // -to-buy flow: the patient was registered without cost/expert, came back
  // and committed).
  app.post("/api/manufacturing/orders", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    // Reception (استعلامات) may assign an expert too — but this endpoint
    // WRITES (creates a work order), so it requires the add-patients
    // capability. canViewPatients alone stays read-only (roster/lists) and
    // must never mutate patients or orders.
    const isReceptionish = !s.isAdmin && !isManager(s) && !isExpert(s)
      && Boolean(s.permissions?.canAddPatients);
    if (!(s.isAdmin || isManager(s) || isReceptionish)) return res.status(403).json({ error: "غير مصرح" });
    const patientId = parseInt(req.body?.patientId);
    const expertUserId = parseInt(req.body?.expertUserId);
    // The delivery date is NO LONGER set at assignment. The expert commits to it
    // later, when they reach the mold stage. So it is optional here (null now).
    const expectedDeliveryDate = strOrU(req.body?.expectedDeliveryDate) ?? null;
    if (expectedDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
      return res.status(400).json({ error: "تاريخ غير صالح" });
    }
    // Order purpose: a first build or a later maintenance episode.
    // **الصيانة لها بابٌ واحد.** هذه النقطة تنشئ أمراً مجرَّداً: بلا جهازٍ
    // مقصود، وبلا زيارة، وبلا أجرةٍ مقيَّدة. فقبولُها للصيانة يفتح طريقاً
    // ثانياً يتجاوز النظام كلّه ويُنتج صيانةً بلا هوية ولا أثر مالي.
    if (req.body?.purpose === "maintenance") {
      return res.status(400).json({
        error: "الصيانة تُفتح من «صيانة طرف/مسند» — فهي تسجّل الزيارة والأجور وتحدّد الجهاز",
      });
    }
    const purpose = "initial_build" as const;
    if (Number.isNaN(patientId) || Number.isNaN(expertUserId)) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    // Only prosthetic / medical-support patients. A dual-flag patient may pass
    // an explicit serviceType matching one of their flags.
    const requestedSt = strOrU(req.body?.serviceType);
    let serviceType: "prosthetic" | "medical_support" | null = null;
    if (requestedSt === "prosthetic" && patient.isAmputee) serviceType = "prosthetic";
    else if (requestedSt === "medical_support" && patient.isMedicalSupport) serviceType = "medical_support";
    else if (!requestedSt) serviceType = patient.isAmputee ? "prosthetic" : patient.isMedicalSupport ? "medical_support" : null;
    if (!serviceType) return res.status(400).json({ error: "هذه الميزة لمرضى الأطراف الصناعية والمساند الطبية فقط" });
    // Branch scope.
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    // Expert must be valid for the patient's branch.
    const v = await store.validateExpertForBranch(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // بناءٌ أوليٌّ واحد مفتوح لكل (مريض، خدمة). وصيانةُ جهازٍ قديم لا
    // تزاحمه: عملان على جهازين مختلفين.
    if (await store.hasOpenOrder({ patientId, serviceType, purpose })) {
      return res.status(409).json({
        error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — أكمِله أو ألغِه أولاً",
      });
    }

    // Workflow order: an INITIAL build needs the doctor's signed exam first —
    // it is the exam that says which device to build. A maintenance episode is
    // exempt: the device already exists and was prescribed once.
    // Legacy patients (registered before the exam system) are exempt: their
    // devices were prescribed under the old workflow, and holding routine
    // work hostage to a retroactive exam served no one.
    //
    // **ولا يُلتفّ على الجهاز الحيّ من هنا.** هذه النقطة تنشئ بناءً أولياً
    // مباشرةً بلا بيعٍ ولا سعر، فلو مرّت ومريضُها يحمل حلقةً مفتوحة
    // لأنتجت أمراً يتيماً: تبقى الحلقة «مُعايَنة» للأبد، ويُصنَع الجهاز بلا
    // سعرٍ مقيَّد ولا هويّة. المسار الصحيح واحد — «تخصيص وإسناد خبير».
    // ══ لا التفافَ على اعتماد الشراء (ترحيل ٠٥٣) ═══════════════════════
    // متابعةٌ حيّة تعني أن هذا الجهاز تحت طبقة الاعتماد: بيعُه يمرّ بموافقة
    // المريض ثم باعتماد طبيبٍ أو المسؤول. وبدء بناءٍ من هنا كان يُنتج
    // تصنيعاً بلا اعتماد وبلا سجلٍّ يفسّره — أي إلغاءَ الطبقة كلّها بضغطة.
    //
    // **ولا استثناءَ لأحد، ولا للمسؤول**: صلاحيةُ الاعتماد لا تعني تخطّي
    // المسار، فمَن يملك الاعتماد يعتمد من بابه ويترك أثره.
    //  الحلقة تُحلّ **قبل** الحارس: حكمُ الطبقة على محاولة الشراء الجارية،
    //  وهويّتها هي الحلقة حين توجد.
    const live = await getOpenDeviceEpisode(patientId, serviceType);
    const gov = await followupStore.purchaseGovernedByFollowup({
      patientId, serviceType, deviceEpisodeId: live?.id ?? null,
    });
    if (gov.governed) {
      return res.status(409).json({ error: bypassMessage(gov.status) });
    }
    if (live) {
      return res.status(409).json({
        error: "لدى المريض طلب جهاز جديد قيد الإجراء — أكمِله عبر «تخصيص وإسناد خبير» بعد المعاينة",
      });
    }
    if (!(await hasSignedExam(patientId, serviceType))
        && !(await isLegacyPatient(patientId))) {
      return res.status(409).json({
        error: serviceType === "prosthetic"
          ? "لا يمكن بدء التصنيع قبل معاينة الطبيب — المريض بانتظار معاينة أطراف صناعية"
          : "لا يمكن بدء التصنيع قبل معاينة الطبيب — المريض بانتظار معاينة مساند طبية",
      });
    }

    try {
      const order = await store.createWorkOrderForExisting({
        patientId, branchId: patient.branchId, serviceType, expertUserId,
        expectedDeliveryDate, assignedBy: s.userId ?? null, purpose,
      });
      await audit(req, "prosthetic_work_order", order.id, "create", patient.branchId,
        `إنشاء أمر تصنيع لمريض موجود #${patientId} للخبير #${expertUserId}`);
      res.status(201).json(order);
    } catch (err: any) {
      // حلقةٌ وُلدت بعد فحص النقطة — الجواب من داخل المعاملة، لا 500.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err instanceof store.ActiveOrderError || err?.code === "23505") {
        return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — أكمِله أو ألغِه أولاً" });
      }
      throw err;
    }
  });

  // ---- "تخصيص الطرف/المسند": device specs + price + expert, in ONE step -------
  // The post-exam step: the doctor decided the specs and the patient agreed to
  // buy, so reception records the device details + the agreed price + assigns
  // the expert together. No delivery date (the expert commits to it at the mold
  // stage). Same authorization as assigning an expert.
  app.post("/api/patients/:id/assign-manufacturing", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    // WRITE endpoint (mutates flags/cost/total_cost + creates the order):
    // requires canAddPatients. canViewPatients alone is read-only by design.
    const isReceptionish = !s.isAdmin && !isManager(s) && !isExpert(s)
      && Boolean(s.permissions?.canAddPatients);
    if (!(s.isAdmin || isManager(s) || isReceptionish)) return res.status(403).json({ error: "غير مصرح" });

    const patientId = parseInt(req.params.id);
    const expertUserId = parseInt(req.body?.expertUserId);
    if (Number.isNaN(patientId) || Number.isNaN(expertUserId)) return res.status(400).json({ error: "بيانات ناقصة" });
    const cost = Math.max(0, Number(req.body?.cost) || 0);

    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    // A patient can carry BOTH flags (طرف + مسند). The dialog then sends an
    // explicit serviceType; it must match a flag the patient actually has —
    // otherwise fall back to prosthetic-first.
    const requested = strOrU(req.body?.serviceType);
    let serviceType: "prosthetic" | "medical_support" | null = null;
    if (requested === "prosthetic" && patient.isAmputee) serviceType = "prosthetic";
    else if (requested === "medical_support" && patient.isMedicalSupport) serviceType = "medical_support";
    else if (!requested) serviceType = patient.isAmputee ? "prosthetic" : patient.isMedicalSupport ? "medical_support" : null;
    if (!serviceType) return res.status(400).json({ error: "هذه الميزة لمرضى الأطراف والمساند فقط" });
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    const v = await store.validateExpertForBranch(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // بناءٌ أوليٌّ واحد مفتوح لكل (مريض، خدمة). وصيانةُ جهازٍ قديم لا
    // تمنع بناء الجديد: عملان على جهازين مختلفين.
    if (await store.hasOpenOrder({ patientId, serviceType, purpose: "initial_build" })) {
      return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — أكمِله أو ألغِه أولاً" });
    }

    // Workflow order: no expert before the doctor. تخصيص is always an
    // INITIAL build, and assigning an expert to an unexamined patient has no
    // clinical basis — the exam is what says which device to build.
    // (Maintenance is exempt by construction: it runs through its own
    // endpoint, /api/manufacturing/maintenance-visit.)
    // Legacy patients (registered before the exam system) are exempt — see
    // the identical rule on the orders endpoint above.
    // ══ وضعان ═════════════════════════════════════════════════════════
    // حلقةٌ مفتوحة ⟶ جهازٌ حيّ له هويّته: كل ما يُقرأ يُقرأ منها هي.
    // لا حلقة ⟶ المسار القديم بحرفه، فأغلب المرضى عليه.
    //
    // والحلقة يحلّها الخادم من (المريض، نوع الخدمة) — ولا يُقبل معرّف من
    // العميل إطلاقاً، وإلّا صار بالإمكان توجيه بيعٍ إلى حلقة غير التي
    // فحصها الطبيب.
    // ══ لا التفافَ على اعتماد الشراء (ترحيل ٠٥٣) ═══════════════════════
    // متابعةٌ حيّة تعني أن هذا الجهاز تحت طبقة الاعتماد: بيعُه يمرّ بموافقة
    // المريض ثم باعتماد طبيبٍ أو المسؤول. وبدء بناءٍ من هنا كان يُنتج
    // تصنيعاً بلا اعتماد وبلا سجلٍّ يفسّره — أي إلغاءَ الطبقة كلّها بضغطة.
    //
    // **ولا استثناءَ لأحد، ولا للمسؤول**: صلاحيةُ الاعتماد لا تعني تخطّي
    // المسار، فمَن يملك الاعتماد يعتمد من بابه ويترك أثره.
    const liveEpisode = await getOpenDeviceEpisode(patientId, serviceType);
    const governed = await followupStore.purchaseGovernedByFollowup({
      patientId, serviceType, deviceEpisodeId: liveEpisode?.id ?? null,
    });
    if (governed.governed) {
      return res.status(409).json({ error: bypassMessage(governed.status) });
    }

    const legacyExempt = await isLegacyPatient(patientId);
    if (liveEpisode) {
      // الإعفاء التاريخي **لا يسري هنا**: مريضٌ قديم طلب جهازاً جديداً
      // صراحةً يمرّ بمعاينة ذلك الجهاز، وإلّا خصّصنا جهازاً لم يره طبيب.
      if (liveEpisode.status !== "examined") {
        return res.status(409).json({
          error: liveEpisode.status === "awaiting_exam"
            ? "الجهاز الجديد بانتظار معاينة الطبيب — لا يمكن تخصيصه بعد"
            : "طلب الجهاز ليس في حالة تسمح بالتخصيص",
        });
      }
      if (!(await hasSignedExamForEpisode(liveEpisode.id))) {
        return res.status(409).json({
          error: "لا توجد معاينة موقّعة لهذا الطلب بالذات — يفحصه الطبيب أولاً",
        });
      }
    } else if (!legacyExempt && !(await hasSignedExam(patientId, serviceType))) {
      return res.status(409).json({
        error: serviceType === "prosthetic"
          ? "لا يمكن تخصيص خبير قبل معاينة الطبيب — المريض بانتظار معاينة أطراف صناعية"
          : "لا يمكن تخصيص خبير قبل معاينة الطبيب — المريض بانتظار معاينة مساند طبية",
      });
    }

    // Only the device-spec fields the doctor decides pass through (whitelist).
    const allowed = serviceType === "prosthetic"
      ? ["prostheticType", "siliconType", "siliconSize", "suspensionSystem", "footType", "footSize", "kneeJointType"] as const
      : ["supportType"] as const;
    // Clinical spec fields follow the registration-form rule: only managers,
    // doctors and the admin may WRITE them (the legacy escape for gaps the
    // doctor left blank). A reception session's spec values are dropped at the
    // source — its UI shows a read-only summary and sends none, and this makes
    // that real for a hand-crafted request too.
    const mayWriteClinical = s.isAdmin || isManager(s)
      || s.role === "doctor" || Boolean(s.permissions?.canWriteMedicalExam);
    const fields: any = {};
    // Legacy patients have no doctor decision to protect: reception completes
    // the specs directly, exactly as the pre-exam workflow always worked —
    // but a live episode HAS a decision, so the exemption stops there.
    if (mayWriteClinical || (legacyExempt && !liveEpisode)) {
      for (const f of allowed) if (typeof req.body?.[f] === "string" && req.body[f]) fields[f] = req.body[f];
    }

    // The PRICE follows the same split: reception CONFIRMS the doctor's
    // proposed price, it does not type one — whatever number the request
    // carries is ignored and the exam's proposal is booked verbatim. Managers
    // and the admin may still override (negotiations happen), and that
    // override is theirs to answer for in the audit log.
    let effectiveCost = cost;

    // ══ السعرُ المعتمد يسبق الجميع — بما فيهم المدير (ترحيل ٠٥٣) ═══════
    // متابعةٌ حيّة تعني أن هذا الجهاز تحت طبقة الاعتماد: سعرُه ما اعتمده
    // الطبيب، سواءٌ كان سعر معاينته الأصلي أو تعديلاً اعتُمد بعد مساومة.
    //
    // وفرضُه هنا هو ما يجعل الاعتماد **ذا أثر**: بدونه كان أول حفظِ تخصيص
    // من مديرٍ يكتب رقماً آخر فيتجاوز الطبيبَ والتاريخَ معاً — وهو بالضبط
    // الالتفاف الذي تحرسه هذه المرحلة. ومديرُ الفرع **ليس مستثنى**: السعر
    // قرارٌ وقّعه الطبيب، وتعديلُه يمرّ بطلبٍ يعتمده طبيبٌ أو المسؤول.
    //
    // ولا يمسّ المرضى القدامى ولا العلاج الطبيعي: مَن لا متابعةَ حيّة له
    // يمرّ بالمنطق القائم أدناه حرفاً بحرف.
    const approvedPrice = await followupStore.approvedPriceFor({
      patientId, serviceType, deviceEpisodeId: liveEpisode?.id ?? null,
    });
    if (approvedPrice !== null) {
      effectiveCost = approvedPrice;
    } else if (!mayWriteClinical) {
      // سعرُ **هذا الجهاز** من معاينته هو، لا أحدثُ سعرٍ للمريض في هذا
      // الاختصاص: جهازٌ سابق بسعرٍ آخر لا يسعّر الجديد.
      const proposed = liveEpisode
        ? await latestDeviceCostForEpisode(liveEpisode.id)
        : await latestDeviceCost(patientId, serviceType);
      if (proposed !== null) {
        effectiveCost = proposed;
      } else if (liveEpisode) {
        // ولا رجوع إلى سعرٍ قديم حين تسكت معاينة هذا الطلب.
        return res.status(409).json({
          error: "لم يحدّد الطبيب كلفة هذا الجهاز في معاينته — تُستكمل في المعاينة أو يعتمد المدير التخصيص",
        });
      } else if (!legacyExempt) {
        return res.status(409).json({
          error: "لم يحدّد الطبيب كلفة الجهاز في المعاينة — تُستكمل الكلفة في المعاينة أو يعتمد المدير التخصيص",
        });
      }
      // legacyExempt with no doctor price: reception's entered cost stands —
      // there is no exam proposal to confirm, exactly as before the system.
    }
    // The doctor's signed specs are not anyone's to change: whatever the
    // exam prescribes overrides the request body, field by field — and for a
    // live device it is THAT device's exam, never an older one.
    // Failure to read the exam must not block the assignment — it degrades to
    // trusting the (already role-filtered) body.
    try {
      Object.assign(fields, liveEpisode
        ? await prescribedSpecsForEpisode(liveEpisode.id, serviceType)
        : await prescribedSpecs(patientId, serviceType));
    } catch (err) {
      console.error("[manufacturing] reading prescribed specs failed:", err);
    }

    try {
      const { workOrderId } = await storage.assignManufacturing({
        patientId, serviceType, fields, cost: effectiveCost, expertUserId, assignedBy: s.userId ?? null,
        deviceEpisodeId: liveEpisode?.id ?? null,
      });
      await audit(req, "prosthetic_work_order", workOrderId, "create", patient.branchId,
        `تخصيص ${serviceType === "prosthetic" ? "طرف" : "مسند"} + إسناد الخبير #${expertUserId} لمريض #${patientId} (كلفة ${effectiveCost}${mayWriteClinical ? "" : " — سعر الطبيب المعتمد"})`);
      res.status(201).json({ ok: true, workOrderId });
    } catch (err: any) {
      // The episode re-check under the row lock: a concurrent click already
      // took this device into manufacturing. A business answer, not a fault.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ error: err.message });
      }
      // In-tx guard or the partial unique index: someone beat us to it.
      if (err?.name === "ActiveAssignmentError" || err?.code === "23505") {
        return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط لهذه الخدمة — أكمِله أو ألغِه أولاً" });
      }
      throw err;
    }
  });

  // ---- maintenance visit (order + visit row created ATOMICALLY) ---------------
  // Reception opens this from the patient's "new visit" flow. Both the
  // maintenance work order and the visit row are written in one transaction, so
  // a returning patient's صيانة is never half-recorded.
  app.post("/api/manufacturing/maintenance-visit", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    const isReceptionish = !s.isAdmin && !isManager(s) && !isExpert(s) && Boolean(s.permissions?.canAddPatients);
    if (!(s.isAdmin || isManager(s) || isReceptionish)) return res.status(403).json({ error: "غير مصرح" });
    const patientId = parseInt(req.body?.patientId);
    const expertUserId = parseInt(req.body?.expertUserId);
    // Optional: the delivery date is committed by the EXPERT at the mold stage
    // (same model as initial builds) — reception no longer invents one here.
    const expectedDeliveryDate = strOrU(req.body?.expectedDeliveryDate) ?? null;
    if (Number.isNaN(patientId) || Number.isNaN(expertUserId)) return res.status(400).json({ error: "بيانات ناقصة" });
    if (expectedDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
      return res.status(400).json({ error: "تاريخ غير صالح" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    // ── أيّ جهاز يُصان؟ ─────────────────────────────────────────────────
    // كان السطر `isAmputee ? prosthetic : medical_support` — فمريضٌ يحمل
    // **الاثنين** تُقيَّد صيانة مسنده على خيط الأطراف دائماً: أجورها تُنسَب
    // لحالة الأطراف، وحارسُ «أمر نشط واحد لكل خدمة» يمنع صيانة المسند لأن
    // للأطراف أمراً مفتوحاً. الأولوية الصامتة لم تكن قراراً، بل أول شرطٍ
    // في تعبير ثلاثي.
    //
    // الآن: صاحب نوعٍ واحد يبقى تلقائياً كما كان — لا سؤال ولا تغيير سلوك.
    // وصاحب الاثنين **يجب أن يُصرَّح** بنوعه، ويُتحقَّق أنه يملكه فعلاً.
    // والصمت في حالة الاثنين يُردّ بـ400 لا يُخمَّن: التخمين هو العطب نفسه.
    const owned = [
      patient.isAmputee ? "prosthetic" : null,
      patient.isMedicalSupport ? "medical_support" : null,
    ].filter(Boolean) as ("prosthetic" | "medical_support")[];
    if (owned.length === 0) return res.status(400).json({ error: "الصيانة لمرضى الأطراف والمساند فقط" });
    const requestedService = strOrU(req.body?.serviceType);
    let serviceType: "prosthetic" | "medical_support";
    if (requestedService) {
      if (!owned.includes(requestedService as any)) {
        return res.status(400).json({ error: "هذا النوع غير مفعّل على ملف المريض" });
      }
      serviceType = requestedService as "prosthetic" | "medical_support";
    } else if (owned.length === 1) {
      serviceType = owned[0];
    } else {
      return res.status(400).json({ error: "المريض يحمل طرفاً ومسنداً — حدّد نوع الجهاز المراد صيانته" });
    }
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    const v = await store.validateExpertForBranch(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // Visit date: honour a chosen Baghdad calendar day, else now.
    const BAGHDAD = 3 * 60 * 60 * 1000;
    const customDate = strOrU(req.body?.customDate);
    let visitDate = new Date();
    if (customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
      const nowB = new Date(Date.now() + BAGHDAD);
      const todayB = nowB.toISOString().split("T")[0];
      if (customDate !== todayB) {
        const [y, m, d] = customDate.split("-").map(Number);
        visitDate = new Date(Date.UTC(y, m - 1, d, nowB.getUTCHours(), nowB.getUTCMinutes(), nowB.getUTCSeconds()) - BAGHDAD);
      }
    }
    const visitNotes = strOrU(req.body?.notes) ?? "صيانة طرف/مسند";
    // أجور الصيانة — reception / manager / admin set it here (the roles this
    // endpoint already admits). The amount is the STAFF'S decision — zero or
    // anything else, with no warranty assumption baked in. Booked inside the same
    // transaction that opens the maintenance episode.
    const cost = Math.max(0, Math.round(Number(req.body?.cost) || 0));

    // أيّ جهازٍ يُصان — **يُحسَم داخل المعاملة** لا هنا. النقطة تمرّر ما
    // اختاره الموظّف كما وصل، والطبقة تقفل وتتحقّق وتقرّر. فلا لقطةٌ تشيخ
    // بين القراءة والكتابة.
    try {
      const order = await store.createMaintenanceOrderWithVisit({
        patientId, branchId: patient.branchId, serviceType, expertUserId,
        expectedDeliveryDate, assignedBy: s.userId ?? null, visitNotes, visitDate, cost,
        deviceEpisodeId: req.body?.deviceEpisodeId ?? null,
        legacyUnrecordedDevice: req.body?.legacyUnrecordedDevice === true,
      });
      await audit(req, "prosthetic_work_order", order.id, "create", patient.branchId,
        `إنشاء أمر صيانة + زيارة لمريض #${patientId} للخبير #${expertUserId}`
          + ` (أجور الصيانة ${cost.toLocaleString("en-US")} د.ع)`);
      res.status(201).json(order);
    } catch (err: any) {
      // جهازٌ غير صالح للصيانة — جوابُ عملٍ من داخل المعاملة.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err instanceof store.ActiveOrderError) {
        return res.status(409).json({ error: "لدى المريض أمر صيانة نشط لهذا الجهاز — أكمِله أو ألغِه أولاً" });
      }
      throw err;
    }
  });

  // Resolves an order + checks the caller may WRITE to it (assigned expert,
  // admin, or manager in-branch). Returns the raw order or sends the response.
  /**
   * تعارضٌ بين قراءة الطلب وتنفيذه: الأمر تحرّك تحت أيدينا. يُردّ ٤٠٩ ومعه
   * حالُه الحقيقي، فتُحدِّث الواجهة نفسها ويقرّر المستخدم على ما هو قائم.
   * يُرجع `true` إن كان الخطأ تعارضاً وقد رُدّ عليه.
   */
  function handledConflict(res: any, e: unknown): boolean {
    if (e instanceof store.WorkOrderConflictError) {
      res.status(409).json({
        error: "تغيّر أمر التصنيع بواسطة مستخدم آخر. حدّث الصفحة وحاول مجدداً.",
        currentStage: e.currentStage,
        status: e.status,
      });
      return true;
    }
    return false;
  }

  async function loadWritable(req: Req, res: any): Promise<any | null> {
    const s = getSession(req);
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return null; }
    const raw = await store.getRawOrder(id);
    if (!raw) { res.status(404).json({ error: "الأمر غير موجود" }); return null; }
    // Same union model as the read path: admin, manager-in-branch, or anyone
    // working as the assigned expert may WRITE to the order.
    const assignedToMe = worksAsExpert(s) && raw.expertUserId === s.userId;
    if (s.isAdmin) {
      // all
    } else if (isManager(s) && branchInScope(s, raw.branchId)) {
      // own branch
    } else if (assignedToMe) {
      // own assigned order
    } else {
      res.status(403).json({ error: "غير مصرح" }); return null;
    }
    return raw;
  }

  // ---- advance to the NEXT stage --------------------------------------------
  // زرّ الخبير الرئيسي. **لا تنقّل عشوائي**: الوجهة الوحيدة المقبولة هي
  // المرحلة التالية في الترتيب (ولمسند لا يحتاج قالباً: تخطّي القالب إلى
  // التصنيع). الرجوع للخلف ليس هنا إطلاقاً — مساره «إعادة عمل فني».
  app.patch("/api/manufacturing/orders/:id/advance", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    if (raw.status === "completed" || raw.status === "cancelled") {
      return res.status(409).json({ error: "الأمر منتهٍ — لا يمكن نقله" });
    }
    const allowed = nextStages(raw.serviceType, raw.currentStage, raw.purpose);
    if (allowed.length === 0) {
      return res.status(409).json({ error: "لا توجد مرحلة تالية — الأمر في نهاية المسار" });
    }
    // الافتراضية إن لم تُطلب وجهة، وإلا يجب أن تكون ضمن المسموح.
    const requested = strOrU(req.body?.toStage);
    const toStage = requested ?? defaultNextStage(raw.serviceType, raw.currentStage, raw.purpose)!;
    if (!allowed.includes(toStage)) {
      return res.status(400).json({ error: "لا يمكن الانتقال إلى هذه المرحلة — المسموح هو المرحلة التالية فقط" });
    }

    const delivered = toStage === DELIVERED_STAGE;
    let finalResult: string | undefined;
    if (delivered) {
      finalResult = strOrU(req.body?.finalResult);
      if (!finalResult || !isValidFinalResult(finalResult)) {
        return res.status(400).json({ error: "نتيجة التصنيع والملاءمة إلزامية عند التسليم" });
      }
    }
    // بلوغ القالب (أو تخطّيه إلى ما بعده) يستدعي التزاماً بموعد التسليم،
    // ما لم يكن قد التُزم به سابقاً — فيبقى مثبَّتاً لقياس دقّة التسليم.
    let deliveryDate: string | null = null;
    if (isAtOrBeyondMoldStage(raw.serviceType, toStage, raw.purpose) && !raw.expectedDeliveryDate) {
      deliveryDate = strOrU(req.body?.expectedDeliveryDate) ?? null;
      if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
        return res.status(400).json({ error: "تاريخ التسليم المتوقّع إلزامي عند هذه المرحلة" });
      }
    }
    try {
      const updated = await store.updateStage({
        order: raw, toStage,
        notes: strOrU(req.body?.notes) ?? null,
        deliveryDate,
        // التقدّم يعيد الأمر إلى العمل: توقّفٌ سابق ينتهي بمجرّد المضيّ قُدُماً.
        newStatus: MAINTENANCE_DONE_STAGES.has(toStage) || delivered ? null : "active",
        clearHold: true,
        finalResult: finalResult ?? null,
        finalNotes: strOrU(req.body?.finalNotes) ?? null,
        performedBy: getSession(req).userId ?? null,
      });
      if (delivered) {
        await audit(req, "prosthetic_work_order", raw.id, "deliver", raw.branchId, `تسليم — النتيجة ${finalResult}`);
      }
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- ADMIN escape hatch: set any valid stage -------------------------------
  // ليس واجهة الخبير. مخرج إداري للمدير والمسؤول وحدهما حين تحتاج البيانات
  // تصحيحاً، ويُدقَّق في كل مرّة.
  app.patch("/api/manufacturing/orders/:id/stage", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(s.isAdmin || isManager(s))) {
      return res.status(403).json({ error: "تعديل المرحلة مباشرةً للإدارة — استعمل «الانتقال للمرحلة التالية»" });
    }
    const raw = await loadWritable(req, res);
    if (!raw) return;
    const toStage = strOrU(req.body?.toStage);
    if (!toStage || !isValidStageFor(raw.serviceType, toStage, raw.purpose)) {
      return res.status(400).json({ error: "المرحلة غير صالحة لهذا النوع" });
    }
    const reason = (strOrU(req.body?.reason) ?? "").trim();
    if (!reason) return res.status(400).json({ error: "سبب التعديل الإداري إلزامي" });

    const delivered = toStage === DELIVERED_STAGE;
    let finalResult: string | undefined;
    if (delivered) {
      finalResult = strOrU(req.body?.finalResult);
      if (!finalResult || !isValidFinalResult(finalResult)) {
        return res.status(400).json({ error: "نتيجة التصنيع والملاءمة إلزامية عند التسليم" });
      }
    }
    try {
      const updated = await store.updateStage({
        order: raw, toStage,
        notes: `تعديل إداري — ${reason}`,
        deliveryDate: null,
        finalResult: finalResult ?? null,
        performedBy: s.userId ?? null,
      });
      await audit(req, "prosthetic_work_order", raw.id, "update", raw.branchId,
        `تعديل إداري للمرحلة من ${raw.currentStage} إلى ${toStage} — السبب: ${reason}`);
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- hold: stop the work WITHOUT moving the stage --------------------------
  app.post("/api/manufacturing/orders/:id/hold", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    if (raw.status === "completed" || raw.status === "cancelled") {
      return res.status(409).json({ error: "الأمر منتهٍ" });
    }
    const status = strOrU(req.body?.status);
    if (!status || !isHoldStatus(status)) return res.status(400).json({ error: "نوع التوقّف غير صالح" });
    const reasonCode = strOrU(req.body?.reasonCode);
    if (!isValidHoldReason(status, reasonCode)) return res.status(400).json({ error: "السبب غير صالح لهذا النوع" });
    const note = strOrU(req.body?.note) ?? null;

    // إعادة العمل الفني وحدها تحرّك المرحلة — إلى الخلف، وبمرحلة يختارها
    // الخبير من المراحل السابقة فقط.
    if (status === "technical_rework") {
      const returnToStage = strOrU(req.body?.returnToStage);
      const allowed = reworkReturnStages(raw.serviceType, raw.currentStage, raw.purpose);
      if (!returnToStage || !allowed.includes(returnToStage)) {
        return res.status(400).json({ error: "اختر مرحلة سابقة للرجوع إليها" });
      }
      try {
        const updated = await store.reworkToStage({
          order: raw, returnToStage, reasonCode: reasonCode!, note,
          performedBy: getSession(req).userId ?? null,
        });
        await audit(req, "prosthetic_work_order", raw.id, "rework", raw.branchId,
          `إعادة عمل فني — رجوع إلى ${returnToStage} — السبب: ${reasonCode}`);
        return res.json(updated);
      } catch (e) {
        if (handledConflict(res, e)) return;
        throw e;
      }
    }

    try {
      const updated = await store.holdOrder({
        order: raw, status, reasonCode: reasonCode!, note,
        performedBy: getSession(req).userId ?? null,
      });
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- resume: back to active, stage untouched -------------------------------
  app.post("/api/manufacturing/orders/:id/resume", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    if (raw.status === "completed" || raw.status === "cancelled") {
      return res.status(409).json({ error: "الأمر منتهٍ" });
    }
    if (raw.status === "active") return res.status(409).json({ error: "الأمر يعمل أصلاً" });
    try {
      const updated = await store.resumeOrder({
        order: raw, note: strOrU(req.body?.note) ?? null,
        performedBy: getSession(req).userId ?? null,
      });
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- cancel ----------------------------------------------------------------
  app.post("/api/manufacturing/orders/:id/cancel", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(s.isAdmin || isManager(s))) return res.status(403).json({ error: "إلغاء الأمر للإدارة" });
    const raw = await loadWritable(req, res);
    if (!raw) return;
    if (raw.status === "cancelled") return res.status(409).json({ error: "الأمر ملغى أصلاً" });
    try {
      const updated = await store.cancelOrder({
        order: raw, note: strOrU(req.body?.note) ?? null, performedBy: s.userId ?? null,
      });
      await audit(req, "prosthetic_work_order", raw.id, "cancel", raw.branchId, "إلغاء أمر التصنيع");
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- expected delivery date update ------------------------------------------
  // مَن يملك تحريك الوعد؟ `loadWritable` وحدها تقرّر، وهي ثلاثة بالضبط:
  // **الخبير المسنَد** (هو مَن يعرف واقع الورشة)، و**مدير الفرع** ضمن فروعه
  // المخوّلة، و**الإدارة**. وخبيرٌ آخر — ولو في الفرع نفسه — لا يمسّ وعد
  // زميله، وموظّف الاستقبال لا يمسّه إطلاقاً (٤٠٣ من `loadWritable`).
  //
  // وأول تحديد ليس تغييراً: لا موعد سابق يُبرَّر تركُه، فلا سبب. أما تحريك
  // موعدٍ قائم فسببه إلزامي — عليه تُقاس دقّة التسليم، فلا يتحرّك صامتاً.
  // وفي الحالتين يُكتب سطر في سجلّ الأمر بمَن فعل ومتى.
  app.patch("/api/manufacturing/orders/:id/delivery-date", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    const date = strOrU(req.body?.expectedDeliveryDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "تاريخ غير صالح" });
    }
    // إلزام السبب يُقاس على **صفّ الخادم** لا على ما يدّعيه الطلب، وإلّا
    // لَأسقطه عميلٌ بادّعاء «لا موعد سابق». (وادّعاؤه ذاك يُردّ ٤٠٩ تحت
    // القفل على أي حال.)
    const isChange = !!raw.expectedDeliveryDate;
    const reason = (strOrU(req.body?.reason) ?? "").trim();
    if (isChange && !reason) {
      return res.status(400).json({ error: "سبب تغيير تاريخ التسليم إلزامي — اذكر لماذا تغيّر الموعد" });
    }
    // ما كان معروضاً أمام المستخدم حين قرّر. ترسله الواجهة، وغيابه يُقاس
    // على لقطة الخادم — والفحص الحاسم يقع تحت القفل داخل المعاملة.
    const hasBase = Object.prototype.hasOwnProperty.call(req.body ?? {}, "ifCurrentDate");
    const believed = hasBase
      ? (strOrU(req.body?.ifCurrentDate) ?? null)
      : (raw.expectedDeliveryDate ? String(raw.expectedDeliveryDate).slice(0, 10) : null);
    // «تغييرٌ» إلى الموعد نفسه ليس تغييراً: سطرٌ يقول «من ٢٥ إلى ٢٥» ضجيج
    // في سجلٍّ وُضع ليُقرأ. ويُقاس على ما رآه المستخدم وعلى صفّ الخادم معاً.
    if (believed === date || (isChange && String(raw.expectedDeliveryDate).slice(0, 10) === date)) {
      return res.status(400).json({ error: "التاريخ الجديد مطابق للحالي" });
    }
    try {
      const updated = await store.updateDeliveryDate({
        order: raw, expectedDeliveryDate: date,
        performedBy: getSession(req).userId ?? null,
        reason: isChange ? reason : null,
        ...(hasBase ? { ifCurrentDate: strOrU(req.body?.ifCurrentDate) ?? null } : {}),
      });
      await audit(req, "prosthetic_work_order", raw.id, "update", raw.branchId,
        isChange
          ? `تغيير موعد التسليم من ${raw.expectedDeliveryDate} إلى ${date} — السبب: ${reason}`
          : `تحديد موعد التسليم المتوقع: ${date}`);
      res.json(updated);
    } catch (e: any) {
      // الأمر انتهى بينما ننتظر القفل — تعارضُ حالٍ لا تعارضُ موعد.
      if (handledConflict(res, e)) return;
      // سبقَنا كاتبٌ آخر. لا كتابة ولا سطر ولا تدقيق — والمستخدم يرى ما
      // صار إليه الموعد فعلاً ليقرّر من جديد على أرضٍ صلبة.
      if (e instanceof store.DeliveryDateConflictError) {
        return res.status(409).json({
          error: "تغيّر موعد التسليم بواسطة مستخدم آخر. حدّث الصفحة وحاول مجدداً.",
          currentDate: e.currentDate,
        });
      }
      throw e;
    }
  });

  // ---- reassign expert -------------------------------------------------------
  app.patch("/api/manufacturing/orders/:id/reassign", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });
    const raw = await store.getRawOrder(id);
    if (!raw) return res.status(404).json({ error: "الأمر غير موجود" });

    const newExpertUserId = parseInt(req.body?.newExpertUserId);
    const reason = strOrU(req.body?.reason);
    if (Number.isNaN(newExpertUserId) || !reason || !reason.trim()) {
      return res.status(400).json({ error: "سبب التحويل ومعرّف الخبير الجديد مطلوبان" });
    }

    // WHO may reassign:
    if (isExpert(s)) {
      return res.status(403).json({ error: "لا يمكن للخبير تغيير الإسناد" });
    } else if (s.isAdmin) {
      // any branch
    } else if (isManager(s)) {
      if (!branchInScope(s, raw.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    } else {
      // reception: only its own branch AND only before work has started.
      if (raw.branchId !== s.branchId) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      if (store.hasStarted(raw)) return res.status(409).json({ error: "لا يمكن تغيير الخبير بعد بدء العمل" });
      if (!(s.permissions?.canAddPatients || s.permissions?.canEditPatients)) {
        return res.status(403).json({ error: "غير مصرح" });
      }
    }

    // New expert must be valid for the order's branch.
    const v = await store.validateExpertForBranch(newExpertUserId, raw.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    try {
      const updated = await store.reassignExpert({
        order: raw, newExpertUserId, reason, performedBy: s.userId ?? null,
        // الاستقبال وحده مقيَّد بـ«قبل بدء العمل» — يُعاد فحصه تحت القفل.
        requireNotStarted: !(s.isAdmin || isManager(s)),
      });
      await audit(req, "prosthetic_work_order", raw.id, "reassign", raw.branchId,
        `تحويل من #${raw.expertUserId} إلى #${newExpertUserId} — ${reason}`);
      res.json(updated);
    } catch (e) {
      if (handledConflict(res, e)) return;
      throw e;
    }
  });

  // ---- admin / manager overview ---------------------------------------------
  app.get("/api/manufacturing/overview", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(s.isAdmin || isManager(s))) return res.status(403).json({ error: "غير مصرح" });
    let branchIds: number[] | null = null;
    if (!s.isAdmin) branchIds = s.accessible.length ? s.accessible : (s.branchId ? [s.branchId] : [-1]);
    else if (req.query.branchId) {
      const b = parseInt(String(req.query.branchId));
      if (!Number.isNaN(b)) branchIds = [b];
    }
    res.json(await store.getOverview({ branchIds }));
  });

  // ---- delivery alerts (التنبيهات) --------------------------------------------
  // Computed on the fly from work orders — no cron, no stored notifications.
  // Windows: D-2, D-1, D-0 for un-finished orders, plus OVERDUE after the
  // date; completed orders show as green info inside the same window instead
  // of an alert. Scope follows the caller: expert → own orders only,
  // manager → own branches, admin → all, reception/accountant → own branch.
  app.get("/api/manufacturing/notifications", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    const filters: store.OrderFilters = {};
    if (isExpert(s)) {
      if (!s.userId) return res.status(403).json({ error: "غير مصرح" });
      filters.expertUserId = s.userId;
    } else if (s.isAdmin) {
      // all branches
    } else if (isManager(s)) {
      filters.branchIds = s.accessible.length ? s.accessible : (s.branchId ? [s.branchId] : [-1]);
    } else if (s.branchId && (s.permissions?.canViewPatients || s.permissions?.canManageAccounting)) {
      filters.branchId = s.branchId;
    } else {
      return res.status(403).json({ error: "غير مصرح" });
    }

    const orders = await store.listOrders(filters);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    const dayMs = 86_400_000;
    const daysUntil = (d: string) =>
      Math.round((new Date(d + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / dayMs);

    const items: any[] = [];
    for (const o of orders) {
      if (!o.expectedDeliveryDate || o.status === "cancelled") continue;
      const days = daysUntil(o.expectedDeliveryDate);
      const base = {
        orderId: o.id, patientId: o.patientId, patientName: o.patientName,
        serviceType: o.serviceType, expertName: o.expertName, branchName: o.branchName,
        expectedDeliveryDate: o.expectedDeliveryDate, currentStage: o.currentStage,
        status: o.status, days,
      };
      if (o.status === "completed") {
        // "Show it as completed on the scheduled date" — green info inside
        // the alert window instead of an alert.
        if (days >= 0 && days <= 2) items.push({ ...base, kind: "completed" });
      } else if (days < 0) {
        items.push({ ...base, kind: "overdue" });
      } else if (days === 0) {
        items.push({ ...base, kind: "due_today" });
      } else if (days === 1) {
        items.push({ ...base, kind: "due_tomorrow" });
      } else if (days === 2) {
        items.push({ ...base, kind: "due_in_2_days" });
      }
    }

    const rank: Record<string, number> = { overdue: 0, due_today: 1, due_tomorrow: 2, due_in_2_days: 3, completed: 4 };
    items.sort((a, b) => (rank[a.kind] - rank[b.kind]) || a.days - b.days);
    const alertCount = items.filter((i) => i.kind !== "completed").length;
    res.json({ alertCount, items });
  });

  // ---- patient-page summary card (authorized NON-expert users) ---------------
  app.get("/api/manufacturing/patient/:patientId/summary", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (isExpert(s)) return res.status(403).json({ error: "غير مصرح" }); // experts use the order page
    const patientId = parseInt(req.params.patientId);
    if (Number.isNaN(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    // Branch scope for non-admins.
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح" });
    const canView = s.isAdmin || isManager(s) || s.permissions?.canViewPatients;
    if (!canView) return res.status(403).json({ error: "غير مصرح" });
    res.json(await store.getActiveOrderSummaryForPatient(patientId));
  });

  // ---- patient-page FULL manufacturing history (all orders over time) --------
  // Each returning visit that needed work is its own order with its own expert
  // and service type, so the patient page can show the whole story instead of
  // only the latest order.
  app.get("/api/manufacturing/patient/:patientId/orders", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (isExpert(s)) return res.status(403).json({ error: "غير مصرح" }); // experts use the order page
    const patientId = parseInt(req.params.patientId);
    if (Number.isNaN(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح" });
    const canView = s.isAdmin || isManager(s) || s.permissions?.canViewPatients;
    if (!canView) return res.status(403).json({ error: "غير مصرح" });
    res.json(await store.getAllOrdersForPatient(patientId));
  });
}

// ---- small helpers -----------------------------------------------------------

function strOrU(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function boolOrU(v: unknown): boolean | undefined {
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return undefined;
}
async function audit(req: any, entityType: string, entityId: number, action: string, branchId: number, notes: string) {
  const s = (req.session as any)?.branchSession;
  await logAudit({
    entityType, entityId, action,
    userId: s?.userId ?? null, userName: s?.displayName ?? null, branchId,
    ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null, notes,
  });
}
