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
import {
  isValidStatus, isValidReworkType, isValidReasonCode,
  isValidFinalResult, isValidStageFor, DELIVERED_STAGE, isMoldStage,
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
    const purpose = req.body?.purpose === "maintenance" ? "maintenance" : "initial_build";
    if (Number.isNaN(patientId) || Number.isNaN(expertUserId)) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    // Only prosthetic / medical-support patients.
    const serviceType = patient.isAmputee ? "prosthetic" : patient.isMedicalSupport ? "medical_support" : null;
    if (!serviceType) return res.status(400).json({ error: "هذه الميزة لمرضى الأطراف الصناعية والمساند الطبية فقط" });
    // Branch scope.
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    // Expert must be valid for the patient's branch.
    const v = await store.validateExpertForBranch(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // One ACTIVE order per patient: block a second order while one is still
    // open (completed/cancelled don't count).
    const existing = await store.listOrders({ completed: false });
    const activeForPatient = existing.find((o) => o.patientId === patientId && o.status !== "cancelled");
    if (activeForPatient) {
      return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط بالفعل — أكمِله أو ألغِه أولاً" });
    }

    const order = await store.createWorkOrderForExisting({
      patientId, branchId: patient.branchId, serviceType, expertUserId,
      expectedDeliveryDate, assignedBy: s.userId ?? null, purpose,
    });
    await audit(req, "prosthetic_work_order", order.id, "create", patient.branchId,
      `إنشاء أمر ${purpose === "maintenance" ? "صيانة" : "تصنيع"} لمريض موجود #${patientId} للخبير #${expertUserId}`);
    res.status(201).json(order);
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
    const serviceType = patient.isAmputee ? "prosthetic" : patient.isMedicalSupport ? "medical_support" : null;
    if (!serviceType) return res.status(400).json({ error: "هذه الميزة لمرضى الأطراف والمساند فقط" });
    if (!s.isAdmin && !branchInScope(s, patient.branchId)) return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    const v = await store.validateExpertForBranch(expertUserId, patient.branchId);
    if (!v.ok) return res.status(400).json({ error: v.reason });

    // One ACTIVE order per patient.
    const existing = await store.listOrders({ completed: false });
    if (existing.find((o) => o.patientId === patientId && o.status !== "cancelled")) {
      return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط بالفعل — أكمِله أو ألغِه أولاً" });
    }

    // Only the device-spec fields the doctor decides pass through (whitelist).
    const allowed = serviceType === "prosthetic"
      ? ["prostheticType", "siliconType", "siliconSize", "suspensionSystem", "footType", "footSize", "kneeJointType"] as const
      : ["supportType"] as const;
    const fields: any = {};
    for (const f of allowed) if (typeof req.body?.[f] === "string" && req.body[f]) fields[f] = req.body[f];

    const { workOrderId } = await storage.assignManufacturing({
      patientId, serviceType, fields, cost, expertUserId, assignedBy: s.userId ?? null,
    });
    await audit(req, "prosthetic_work_order", workOrderId, "create", patient.branchId,
      `تخصيص ${serviceType === "prosthetic" ? "طرف" : "مسند"} + إسناد الخبير #${expertUserId} لمريض #${patientId} (كلفة ${cost})`);
    res.status(201).json({ ok: true, workOrderId });
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
    const expectedDeliveryDate = strOrU(req.body?.expectedDeliveryDate) ?? null;
    if (Number.isNaN(patientId) || Number.isNaN(expertUserId)) return res.status(400).json({ error: "بيانات ناقصة" });
    if (!expectedDeliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
      return res.status(400).json({ error: "تاريخ التسليم المتوقع إلزامي" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
    const serviceType = patient.isAmputee ? "prosthetic" : patient.isMedicalSupport ? "medical_support" : null;
    if (!serviceType) return res.status(400).json({ error: "الصيانة لمرضى الأطراف والمساند فقط" });
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

    try {
      const order = await store.createMaintenanceOrderWithVisit({
        patientId, branchId: patient.branchId, serviceType, expertUserId,
        expectedDeliveryDate, assignedBy: s.userId ?? null, visitNotes, visitDate,
      });
      await audit(req, "prosthetic_work_order", order.id, "create", patient.branchId,
        `إنشاء أمر صيانة + زيارة لمريض #${patientId} للخبير #${expertUserId}`);
      res.status(201).json(order);
    } catch (err: any) {
      if (err instanceof store.ActiveOrderError) {
        return res.status(409).json({ error: "لدى المريض أمر تصنيع نشط بالفعل — أكمِله أو ألغِه أولاً" });
      }
      throw err;
    }
  });

  // Resolves an order + checks the caller may WRITE to it (assigned expert,
  // admin, or manager in-branch). Returns the raw order or sends the response.
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

  // ---- stage update ----------------------------------------------------------
  app.patch("/api/manufacturing/orders/:id/stage", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    const toStage = strOrU(req.body?.toStage);
    if (!toStage || !isValidStageFor(raw.serviceType, toStage)) {
      return res.status(400).json({ error: "المرحلة غير صالحة لهذا النوع" });
    }
    const newStatus = strOrU(req.body?.status);
    if (newStatus && !isValidStatus(newStatus)) return res.status(400).json({ error: "الحالة غير صالحة" });
    // Delivery requires a fabrication & fit result.
    let finalResult: string | undefined;
    if (toStage === DELIVERED_STAGE) {
      finalResult = strOrU(req.body?.finalResult);
      if (!finalResult || !isValidFinalResult(finalResult)) {
        return res.status(400).json({ error: "نتيجة التصنيع والملاءمة إلزامية عند التسليم" });
      }
    }
    // At the mold stage the expert MUST commit to a delivery date — unless one
    // was already set (then it stays locked; not re-taken here). This is the
    // single point the promised date is captured, independent of stage dates.
    let deliveryDate: string | null = null;
    if (isMoldStage(raw.serviceType, toStage) && !raw.expectedDeliveryDate) {
      deliveryDate = strOrU(req.body?.expectedDeliveryDate) ?? null;
      if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
        return res.status(400).json({ error: "تاريخ التسليم إلزامي عند أخذ القالب" });
      }
    }
    const updated = await store.updateStage({
      order: raw, toStage,
      notes: strOrU(req.body?.notes) ?? null,
      deliveryDate,
      newStatus: newStatus ?? null,
      finalResult: finalResult ?? null,
      finalNotes: strOrU(req.body?.finalNotes) ?? null,
      performedBy: getSession(req).userId ?? null,
    });
    if (toStage === DELIVERED_STAGE) {
      await audit(req, "prosthetic_work_order", raw.id, "deliver", raw.branchId, `تسليم — النتيجة ${finalResult}`);
    }
    res.json(updated);
  });

  // ---- expected delivery date update ------------------------------------------
  // The date can be renegotiated with the expert; updating it appends a
  // history row (nothing is overwritten silently) and drives the alerts.
  app.patch("/api/manufacturing/orders/:id/delivery-date", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    // Once the delivery date has been committed (by the expert at the mold
    // stage), CHANGING it is restricted to branch management / admin — so the
    // promised date the expert is measured against can't be quietly moved.
    if (raw.expectedDeliveryDate) {
      const s = getSession(req);
      if (!(s.isAdmin || isManager(s))) {
        return res.status(403).json({ error: "تعديل تاريخ التسليم بعد تحديده يقتصر على إدارة الفرع أو الإدارة العامة" });
      }
    }
    const date = strOrU(req.body?.expectedDeliveryDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "تاريخ غير صالح" });
    }
    const updated = await store.updateDeliveryDate({
      order: raw, expectedDeliveryDate: date,
      performedBy: getSession(req).userId ?? null,
    });
    res.json(updated);
  });

  // ---- status update ---------------------------------------------------------
  app.patch("/api/manufacturing/orders/:id/status", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    const status = strOrU(req.body?.status);
    if (!status || !isValidStatus(status)) return res.status(400).json({ error: "الحالة غير صالحة" });
    const updated = await store.updateStatus({
      order: raw, status, notes: strOrU(req.body?.notes) ?? null,
      performedBy: getSession(req).userId ?? null,
    });
    if (status === "cancelled") {
      await audit(req, "prosthetic_work_order", raw.id, "cancel", raw.branchId, "إلغاء أمر التصنيع");
    }
    res.json(updated);
  });

  // ---- record rework (recast / resocket / …) ---------------------------------
  app.post("/api/manufacturing/orders/:id/rework", isAuthenticated, async (req: Req, res) => {
    const raw = await loadWritable(req, res);
    if (!raw) return;
    const reworkType = strOrU(req.body?.reworkType);
    if (!reworkType || !isValidReworkType(reworkType)) return res.status(400).json({ error: "نوع إعادة العمل غير صالح" });
    const reasonCode = strOrU(req.body?.reasonCode);
    if (reasonCode && !isValidReasonCode(reasonCode)) return res.status(400).json({ error: "سبب غير صالح" });
    const stageWhenDetected = strOrU(req.body?.stageWhenDetected);
    if (stageWhenDetected && !isValidStageFor(raw.serviceType, stageWhenDetected)) {
      return res.status(400).json({ error: "المرحلة غير صالحة" });
    }
    const updated = await store.recordRework({
      order: raw, reworkType, reasonCode: reasonCode ?? null,
      reasonDetails: strOrU(req.body?.reasonDetails) ?? null,
      stageWhenDetected: stageWhenDetected ?? null,
      createdBy: getSession(req).userId ?? null,
    });
    if (reworkType === "recast") await audit(req, "prosthetic_work_order", raw.id, "recast", raw.branchId, "تسجيل إعادة قالب");
    if (reworkType === "resocket") await audit(req, "prosthetic_work_order", raw.id, "resocket", raw.branchId, "تسجيل إعادة سوكت");
    res.json(updated);
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

    const updated = await store.reassignExpert({ order: raw, newExpertUserId, reason, performedBy: s.userId ?? null });
    await audit(req, "prosthetic_work_order", raw.id, "reassign", raw.branchId,
      `تحويل من #${raw.expertUserId} إلى #${newExpertUserId} — ${reason}`);
    res.json(updated);
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
