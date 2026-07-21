// Manufacturing data layer — all DB access for the prosthetic/medical-support
// module. Enforces the core rules at the query level:
//   - per-EXPERT isolation (expert sees only expert_user_id = his id)
//   - expert-safe patient projection (NO financial fields ever selected)
//   - append-only history & rework (no delete methods exist here)
//   - atomic patient + work-order creation via a real transaction.

import { db } from "../db";
import {
  patients, branches, systemUsers, visits, patientCases,
  prostheticWorkOrders as WO,
  prostheticWorkHistory as WH,
  prostheticReworkEvents as RW,
  type InsertPatient, type Patient, type ProstheticWorkOrder,
} from "@shared/schema";
import { and, eq, or, inArray, notInArray, sql, desc, asc } from "drizzle-orm";

// Thrown when a maintenance order can't be opened because the patient still has
// an open (non-completed, non-cancelled) order. The route maps it to 409.
export class ActiveOrderError extends Error {
  constructor() { super("active order exists"); this.name = "ActiveOrderError"; }
}

// Does the patient have an open (not completed/cancelled) order for this
// service? Targeted query — replaces the old "list every open order in the
// system then scan" guard.
export async function hasActiveOrder(patientId: number, serviceType: string): Promise<boolean> {
  const rows = await db.select({ id: WO.id }).from(WO)
    .where(and(eq(WO.patientId, patientId), eq(WO.serviceType, serviceType), notInArray(WO.status, ["completed", "cancelled"])))
    .limit(1);
  return rows.length > 0;
}
import { stagesForService, NEW_ASSIGNMENT_STAGE } from "@shared/manufacturing";

export const EXPERT_ROLE = "prosthetics_expert";

// ---- experts roster (data-driven; never hardcoded) ---------------------------

export interface ExpertOption { id: number; displayName: string; }

// Active experts allowed to work in `branchId`: role = prosthetics_expert AND
// active AND (branchIds jsonb contains the branch OR primary branchId matches).
export async function getExpertsForBranch(branchId: number): Promise<ExpertOption[]> {
  const rows = await db
    .select({ id: systemUsers.id, displayName: systemUsers.displayName })
    .from(systemUsers)
    .where(
      and(
        // A pure expert OR anyone carrying the expert capability flag
        // (e.g. an accountant / branch-manager who also does mold work).
        or(eq(systemUsers.role, EXPERT_ROLE), eq(systemUsers.canWorkAsExpert, true)),
        eq(systemUsers.isActive, true),
        or(
          sql`${systemUsers.branchIds} @> ${JSON.stringify([branchId])}::jsonb`,
          eq(systemUsers.branchId, branchId),
        ),
      ),
    )
    .orderBy(asc(systemUsers.displayName));
  return rows;
}

// Server-side validation that an expert may be assigned to a branch. Returns
// the reason on failure so the route can 400/403 accurately.
export async function validateExpertForBranch(
  expertUserId: number,
  branchId: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [u] = await db.select().from(systemUsers).where(eq(systemUsers.id, expertUserId));
  if (!u) return { ok: false, reason: "الخبير غير موجود" };
  if (!u.isActive) return { ok: false, reason: "حساب الخبير غير فعّال" };
  // Pure expert OR a user carrying the expert capability flag.
  if (u.role !== EXPERT_ROLE && !u.canWorkAsExpert) return { ok: false, reason: "المستخدم ليس خبير أطراف" };
  const branchIds = Array.isArray(u.branchIds) ? (u.branchIds as number[]) : [];
  const allowed = branchIds.includes(branchId) || u.branchId === branchId;
  if (!allowed) return { ok: false, reason: "الخبير غير مسموح له بالعمل في هذا الفرع" };
  return { ok: true };
}

// ---- expert-safe patient projection (financial fields NEVER selected) --------

export const expertPatientColumns = {
  id: patients.id,
  name: patients.name,
  age: patients.age,
  weight: patients.weight,
  height: patients.height,
  injuryDate: patients.injuryDate,
  injuryCause: patients.injuryCause,
  medicalCondition: patients.medicalCondition,
  amputationSite: patients.amputationSite,
  prostheticType: patients.prostheticType,
  supportType: patients.supportType,
  injurySide: patients.injurySide,
  patientClassification: patients.patientClassification,
} as const;

// ---- backdating helper (mirrors storage.createPatient behaviour) -------------

function resolveCreatedAt(registrationDate?: string | null): Date | undefined {
  if (!registrationDate) return undefined;
  const baghdadOffset = 3 * 60 * 60 * 1000;
  const nowBaghdad = new Date(Date.now() + baghdadOffset);
  const todayBaghdad = nowBaghdad.toISOString().split("T")[0];
  if (registrationDate === todayBaghdad) return undefined; // let defaultNow() handle it
  const [year, month, day] = registrationDate.split("-").map(Number);
  const backdated = new Date(Date.UTC(
    year, month - 1, day,
    nowBaghdad.getUTCHours(), nowBaghdad.getUTCMinutes(), nowBaghdad.getUTCSeconds(),
  ));
  return new Date(backdated.getTime() - baghdadOffset);
}

// ---- atomic patient + work-order creation ------------------------------------

export interface NewWorkOrderParams {
  serviceType: string;
  expertUserId: number;
  expectedDeliveryDate?: string | null;
  assignedBy: number | null;
}

// Creates the patient AND its first work order AND the first history row in a
// single transaction. If the work order fails, the patient insert rolls back.
export async function createPatientWithWorkOrder(
  insertPatient: InsertPatient,
  wo: NewWorkOrderParams,
): Promise<{ patient: Patient; workOrder: ProstheticWorkOrder }> {
  const { registrationDate, ...patientData } = insertPatient as InsertPatient & { registrationDate?: string | null };
  const values: any = { ...patientData };
  const createdAt = resolveCreatedAt(registrationDate);
  if (createdAt) values.createdAt = createdAt;

  return await db.transaction(async (tx) => {
    const [patient] = await tx.insert(patients).values(values).returning();
    const [workOrder] = await tx.insert(WO).values({
      patientId: patient.id,
      branchId: patient.branchId,
      expertUserId: wo.expertUserId,
      serviceType: wo.serviceType,
      status: "active",
      currentStage: NEW_ASSIGNMENT_STAGE,
      expectedDeliveryDate: wo.expectedDeliveryDate ?? null,
      assignedBy: wo.assignedBy,
    }).returning();
    await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: NEW_ASSIGNMENT_STAGE,
      notes: "إنشاء أمر التصنيع وإسناده للخبير",
      performedBy: wo.assignedBy,
    });
    return { patient, workOrder };
  });
}

// Work order for a patient who already exists (admin / branch manager).
export async function createWorkOrderForExisting(params: {
  patientId: number;
  branchId: number;
  serviceType: string;
  expertUserId: number;
  expectedDeliveryDate?: string | null;
  assignedBy: number | null;
  purpose?: string;
}): Promise<ProstheticWorkOrder> {
  const purpose = params.purpose === "maintenance" ? "maintenance" : "initial_build";
  return await db.transaction(async (tx) => {
    // In-tx per-service guard (backed by the partial unique index) — the
    // route's pre-check alone was a check-then-act race.
    const open = await tx.select({ id: WO.id }).from(WO)
      .where(and(eq(WO.patientId, params.patientId), eq(WO.serviceType, params.serviceType), notInArray(WO.status, ["completed", "cancelled"])))
      .limit(1);
    if (open.length > 0) throw new ActiveOrderError();
    const [workOrder] = await tx.insert(WO).values({
      patientId: params.patientId,
      branchId: params.branchId,
      expertUserId: params.expertUserId,
      serviceType: params.serviceType,
      purpose,
      status: "active",
      currentStage: NEW_ASSIGNMENT_STAGE,
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      assignedBy: params.assignedBy,
    }).returning();
    await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: NEW_ASSIGNMENT_STAGE,
      notes: purpose === "maintenance" ? "إنشاء أمر صيانة لمريض موجود" : "إنشاء أمر تصنيع لمريض موجود",
      performedBy: params.assignedBy,
    });
    return workOrder;
  });
}

// Maintenance from the "new visit" flow: create the maintenance work order AND
// the visit row in ONE transaction — so a returning patient's صيانة is either
// fully recorded (order + visit) or not at all. This removes the two-call race
// that could orphan an order (with no visit) and then wedge retries via the
// one-active-order 409 guard. The active-order check runs inside the same tx.
export async function createMaintenanceOrderWithVisit(params: {
  patientId: number;
  branchId: number;
  serviceType: string;
  expertUserId: number;
  // Optional now: the expert commits to the delivery date at the mold stage,
  // same as initial builds — reception no longer invents one.
  expectedDeliveryDate: string | null;
  assignedBy: number | null;
  visitNotes: string;
  visitDate: Date;
}): Promise<ProstheticWorkOrder> {
  return await db.transaction(async (tx) => {
    // Per-service guard: a dual-flag patient's مسند maintenance shouldn't be
    // blocked by an unrelated active طرف order.
    const openOrders = await tx.select({ id: WO.id })
      .from(WO)
      .where(and(eq(WO.patientId, params.patientId), eq(WO.serviceType, params.serviceType), notInArray(WO.status, ["completed", "cancelled"])))
      .limit(1);
    if (openOrders.length > 0) throw new ActiveOrderError();

    const [workOrder] = await tx.insert(WO).values({
      patientId: params.patientId,
      branchId: params.branchId,
      expertUserId: params.expertUserId,
      serviceType: params.serviceType,
      purpose: "maintenance",
      status: "active",
      currentStage: NEW_ASSIGNMENT_STAGE,
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      assignedBy: params.assignedBy,
    }).returning();
    await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: NEW_ASSIGNMENT_STAGE,
      notes: "إنشاء أمر صيانة لمريض موجود",
      performedBy: params.assignedBy,
    });
    // Attribute the visit to the matching case so it shows in the patient's
    // per-case tabs (case-filtered views hide caseId-null rows by default).
    const caseRows = await tx.select({ id: patientCases.id, caseType: patientCases.caseType })
      .from(patientCases).where(eq(patientCases.patientId, params.patientId));
    const caseId = caseRows.find((c) => c.caseType === params.serviceType)?.id
      ?? caseRows.find((c) => c.caseType === "physiotherapy")?.id
      ?? caseRows[0]?.id ?? null;
    await tx.insert(visits).values({
      patientId: params.patientId,
      branchId: params.branchId,
      visitDate: params.visitDate,
      notes: params.visitNotes,
      treatmentType: null,
      caseId,
      createdBy: params.assignedBy,
    });
    return workOrder;
  });
}

// ---- order listing + enrichment ----------------------------------------------

export interface OrderFilters {
  branchId?: number;        // restrict to one branch
  branchIds?: number[];     // manager scope (allowed branches)
  serviceType?: string;
  stage?: string;
  status?: string;
  completed?: boolean;      // true = completed only, false = not completed
  expertUserId?: number;    // filter by expert (managers/admin), or forced for experts
  search?: string;          // patient name contains
}

export interface OrderCard {
  id: number;
  patientId: number;
  patientName: string;
  branchId: number;
  branchName: string | null;
  serviceType: string;
  itemType: string | null;   // prostheticType or supportType
  currentStage: string;
  status: string;
  expertUserId: number;
  expertName: string | null;
  assignedAt: string | null; // created_at
  startedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  finalResult: string | null;
  recastCount: number;
  resocketCount: number;
  daysInStage: number;
  isOverdue: boolean;
}

function daysSince(d: Date | string | null | undefined): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

// Builds the WHERE conditions common to expert / manager / admin listings.
function orderConditions(f: OrderFilters) {
  const c: any[] = [];
  if (f.expertUserId !== undefined) c.push(eq(WO.expertUserId, f.expertUserId));
  if (f.branchId !== undefined) c.push(eq(WO.branchId, f.branchId));
  if (f.branchIds && f.branchIds.length > 0) c.push(inArray(WO.branchId, f.branchIds));
  if (f.serviceType) c.push(eq(WO.serviceType, f.serviceType));
  if (f.stage) c.push(eq(WO.currentStage, f.stage));
  if (f.status) c.push(eq(WO.status, f.status));
  if (f.completed === true) c.push(eq(WO.status, "completed"));
  if (f.completed === false) c.push(sql`${WO.status} <> 'completed'`);
  // Arabic-normalized match (ة↔ه, أ/إ/آ↔ا, ى↔ي) so spelling variants of the
  // same name still match.
  if (f.search && f.search.trim()) {
    const like = "%" + f.search.trim() + "%";
    c.push(sql`translate(${patients.name}, 'أإآةى', 'اااهي') ILIKE translate(${like}, 'أإآةى', 'اااهي')`);
  }
  return c;
}

export async function listOrders(f: OrderFilters): Promise<OrderCard[]> {
  const conds = orderConditions(f);
  const rows = await db
    .select({
      id: WO.id, patientId: WO.patientId, branchId: WO.branchId,
      serviceType: WO.serviceType, purpose: WO.purpose, currentStage: WO.currentStage, status: WO.status,
      expertUserId: WO.expertUserId, assignedAt: WO.createdAt, startedAt: WO.startedAt,
      expectedDeliveryDate: WO.expectedDeliveryDate, completedAt: WO.completedAt,
      finalResult: WO.finalResult,
      patientName: patients.name, prostheticType: patients.prostheticType, supportType: patients.supportType,
      branchName: branches.name, expertName: systemUsers.displayName,
    })
    .from(WO)
    .innerJoin(patients, eq(patients.id, WO.patientId))
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(conds.length ? and(...conds) : sql`TRUE`)
    .orderBy(desc(WO.createdAt));

  return enrichOrders(rows);
}

async function enrichOrders(rows: any[]): Promise<OrderCard[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // Rework counts (recast / resocket) per order — one grouped query.
  const rework = await db
    .select({ workOrderId: RW.workOrderId, reworkType: RW.reworkType, n: sql<number>`COUNT(*)::int` })
    .from(RW)
    .where(inArray(RW.workOrderId, ids))
    .groupBy(RW.workOrderId, RW.reworkType);
  const recast = new Map<number, number>();
  const resocket = new Map<number, number>();
  for (const r of rework) {
    if (r.reworkType === "recast") recast.set(r.workOrderId, Number(r.n));
    else if (r.reworkType === "resocket") resocket.set(r.workOrderId, Number(r.n));
  }

  // When each order entered its current stage — latest history row whose
  // to_stage equals the order's current stage. One query for all orders.
  const hist = await db
    .select({ workOrderId: WH.workOrderId, toStage: WH.toStage, createdAt: WH.createdAt })
    .from(WH)
    .where(inArray(WH.workOrderId, ids));
  const enteredStageAt = new Map<string, Date>(); // key `${orderId}|${stage}`
  for (const h of hist) {
    if (!h.toStage) continue;
    const key = `${h.workOrderId}|${h.toStage}`;
    const prev = enteredStageAt.get(key);
    const ts = h.createdAt ? new Date(h.createdAt) : null;
    if (ts && (!prev || ts > prev)) enteredStageAt.set(key, ts);
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  return rows.map((r) => {
    const stageEntered = enteredStageAt.get(`${r.id}|${r.currentStage}`) ?? r.startedAt ?? r.assignedAt;
    const notFinished = r.status !== "completed" && r.status !== "cancelled";
    const isOverdue = !!r.expectedDeliveryDate && notFinished
      && String(r.expectedDeliveryDate) < today;
    return {
      id: r.id,
      patientId: r.patientId,
      patientName: r.patientName,
      branchId: r.branchId,
      branchName: r.branchName ?? null,
      serviceType: r.serviceType,
      purpose: r.purpose ?? "initial_build",
      itemType: r.serviceType === "medical_support" ? (r.supportType ?? null) : (r.prostheticType ?? null),
      currentStage: r.currentStage,
      status: r.status,
      expertUserId: r.expertUserId,
      expertName: r.expertName ?? null,
      assignedAt: r.assignedAt ? new Date(r.assignedAt).toISOString() : null,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      expectedDeliveryDate: r.expectedDeliveryDate ? String(r.expectedDeliveryDate) : null,
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      finalResult: r.finalResult ?? null,
      recastCount: recast.get(r.id) ?? 0,
      resocketCount: resocket.get(r.id) ?? 0,
      daysInStage: daysSince(stageEntered),
      isOverdue,
    };
  });
}

// ---- single order (raw, for authorization checks) ----------------------------

export async function getRawOrder(id: number): Promise<ProstheticWorkOrder | undefined> {
  const [row] = await db.select().from(WO).where(eq(WO.id, id));
  return row;
}

// Full detail for the detail page — expert-safe patient projection + timeline.
export async function getOrderDetail(id: number) {
  const [order] = await db
    .select({
      id: WO.id, patientId: WO.patientId, branchId: WO.branchId, serviceType: WO.serviceType,
      status: WO.status, currentStage: WO.currentStage, expectedDeliveryDate: WO.expectedDeliveryDate,
      startedAt: WO.startedAt, completedAt: WO.completedAt, finalResult: WO.finalResult,
      finalNotes: WO.finalNotes, expertUserId: WO.expertUserId, assignedBy: WO.assignedBy,
      createdAt: WO.createdAt,
      branchName: branches.name, expertName: systemUsers.displayName,
    })
    .from(WO)
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(eq(WO.id, id));
  if (!order) return null;

  const [patient] = await db.select(expertPatientColumns).from(patients).where(eq(patients.id, order.patientId));
  const timeline = await db.select({
    id: WH.id, actionType: WH.actionType, fromStage: WH.fromStage, toStage: WH.toStage,
    notes: WH.notes, performedBy: WH.performedBy, createdAt: WH.createdAt,
    performedByName: systemUsers.displayName,
  })
    .from(WH)
    .leftJoin(systemUsers, eq(systemUsers.id, WH.performedBy))
    .where(eq(WH.workOrderId, id))
    .orderBy(asc(WH.createdAt));
  const rework = await db.select({
    id: RW.id, reworkType: RW.reworkType, reasonCode: RW.reasonCode, reasonDetails: RW.reasonDetails,
    stageWhenDetected: RW.stageWhenDetected, createdBy: RW.createdBy, createdAt: RW.createdAt,
    createdByName: systemUsers.displayName,
  })
    .from(RW)
    .leftJoin(systemUsers, eq(systemUsers.id, RW.createdBy))
    .where(eq(RW.workOrderId, id))
    .orderBy(desc(RW.createdAt));

  const recastCount = rework.filter((r) => r.reworkType === "recast").length;
  const resocketCount = rework.filter((r) => r.reworkType === "resocket").length;
  const branchNameVal = (patient ? { branchName: order.branchName ?? null } : {});
  return {
    order: {
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate ? String(order.expectedDeliveryDate) : null,
      startedAt: order.startedAt ? new Date(order.startedAt).toISOString() : null,
      completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      recastCount, resocketCount,
    },
    patient: patient ? { ...patient, branchName: order.branchName ?? null } : null,
    timeline,
    rework,
  };
}

// Whether the order has started (left new_assignment). Used to gate who may
// reassign (reception only before work has started).
export function hasStarted(order: ProstheticWorkOrder): boolean {
  return order.currentStage !== NEW_ASSIGNMENT_STAGE || !!order.startedAt;
}

// ---- mutations (all append a history row) ------------------------------------

export async function updateStage(params: {
  order: ProstheticWorkOrder;
  toStage: string;
  notes?: string | null;
  // The promised delivery date, captured when the expert reaches the mold stage.
  // Applied ONLY when the order has no delivery date yet (first commitment) —
  // it is INDEPENDENT of the stage timeline and never overwrites an existing
  // date here, so the promised date stays fixed for accuracy tracking.
  deliveryDate?: string | null;
  newStatus?: string | null;
  finalResult?: string | null;
  finalNotes?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, toStage } = params;
  const fromStage = order.currentStage;
  const delivered = toStage === "delivered";
  return await db.transaction(async (tx) => {
    const patch: any = { currentStage: toStage, updatedAt: new Date() };
    if (!order.startedAt && fromStage === NEW_ASSIGNMENT_STAGE) patch.startedAt = new Date();
    // First-commit only, decided IN the database (COALESCE), not on the
    // possibly-stale `order` snapshot — two concurrent mold updates can't
    // both "win": whichever lands second finds the column already set.
    if (params.deliveryDate && !order.expectedDeliveryDate) {
      patch.expectedDeliveryDate = sql`COALESCE(${WO.expectedDeliveryDate}, ${params.deliveryDate})`;
    }
    if (params.newStatus) patch.status = params.newStatus;
    if (delivered) {
      patch.status = "completed";
      patch.completedAt = new Date();
      patch.finalResult = params.finalResult ?? null;
      if (params.finalNotes) patch.finalNotes = params.finalNotes;
    }
    const [updated] = await tx.update(WO).set(patch).where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: delivered ? "delivered" : "stage_change",
      fromStage, toStage,
      notes: params.notes ?? null,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

export async function updateDeliveryDate(params: {
  order: ProstheticWorkOrder;
  expectedDeliveryDate: string;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, expectedDeliveryDate } = params;
  const previous = order.expectedDeliveryDate ? String(order.expectedDeliveryDate) : "—";
  return await db.transaction(async (tx) => {
    const [updated] = await tx.update(WO)
      .set({ expectedDeliveryDate, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "date_change",
      fromStage: order.currentStage, toStage: order.currentStage,
      notes: `تغيير موعد التسليم المتوقع من ${previous} إلى ${expectedDeliveryDate}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

export async function updateStatus(params: {
  order: ProstheticWorkOrder;
  status: string;
  notes?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, status } = params;
  return await db.transaction(async (tx) => {
    // NOTE: never touches current_stage — status is independent of stage.
    const [updated] = await tx.update(WO)
      .set({ status, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "status_change",
      fromStage: order.currentStage, toStage: order.currentStage,
      notes: params.notes ? `الحالة: ${status} — ${params.notes}` : `الحالة: ${status}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

export async function recordRework(params: {
  order: ProstheticWorkOrder;
  reworkType: string;
  reasonCode?: string | null;
  reasonDetails?: string | null;
  stageWhenDetected?: string | null;
  createdBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, reworkType } = params;
  // recast/resocket move the order into the matching blocked status; the stage
  // is preserved (never cleared) so the previous trail stays intact.
  const newStatus = reworkType === "recast" ? "needs_recast"
    : reworkType === "resocket" ? "needs_resocket"
    : order.status;
  return await db.transaction(async (tx) => {
    await tx.insert(RW).values({
      workOrderId: order.id,
      reworkType,
      reasonCode: params.reasonCode ?? null,
      reasonDetails: params.reasonDetails ?? null,
      stageWhenDetected: params.stageWhenDetected ?? order.currentStage,
      createdBy: params.createdBy,
    });
    const [updated] = await tx.update(WO)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "rework",
      fromStage: order.currentStage, toStage: order.currentStage,
      notes: `إعادة عمل: ${reworkType}${params.reasonCode ? ` (${params.reasonCode})` : ""}`,
      performedBy: params.createdBy,
    });
    return updated;
  });
}

export async function reassignExpert(params: {
  order: ProstheticWorkOrder;
  newExpertUserId: number;
  reason: string;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, newExpertUserId } = params;
  const fromExpert = order.expertUserId;
  return await db.transaction(async (tx) => {
    const [updated] = await tx.update(WO)
      .set({ expertUserId: newExpertUserId, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "reassigned",
      fromStage: order.currentStage, toStage: order.currentStage,
      notes: `تحويل من الخبير #${fromExpert} إلى #${newExpertUserId} — السبب: ${params.reason}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

// ---- patient-page summary card (authorized non-expert users) -----------------

export async function getActiveOrderSummaryForPatient(patientId: number) {
  const [row] = await db
    .select({
      id: WO.id, serviceType: WO.serviceType, purpose: WO.purpose, status: WO.status, currentStage: WO.currentStage,
      startedAt: WO.startedAt, expectedDeliveryDate: WO.expectedDeliveryDate,
      completedAt: WO.completedAt, finalResult: WO.finalResult, expertUserId: WO.expertUserId,
      expertName: systemUsers.displayName,
    })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(eq(WO.patientId, patientId))
    .orderBy(desc(WO.createdAt))
    .limit(1);
  if (!row) return null;
  const rework = await db
    .select({ reworkType: RW.reworkType, n: sql<number>`COUNT(*)::int` })
    .from(RW).where(eq(RW.workOrderId, row.id)).groupBy(RW.reworkType);
  const recastCount = Number(rework.find((r) => r.reworkType === "recast")?.n ?? 0);
  const resocketCount = Number(rework.find((r) => r.reworkType === "resocket")?.n ?? 0);
  return {
    id: row.id,
    expertUserId: row.expertUserId,
    expertName: row.expertName ?? null,
    serviceType: row.serviceType,
    purpose: row.purpose ?? "initial_build",
    status: row.status,
    currentStage: row.currentStage,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    expectedDeliveryDate: row.expectedDeliveryDate ? String(row.expectedDeliveryDate) : null,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    finalResult: row.finalResult ?? null,
    recastCount, resocketCount,
  };
}

// Every work order for a patient, newest first — the full manufacturing
// history (e.g. عناد built the limb in June, أيوب did a maintenance mold in
// July). Each order is an independent episode with its own expert, service
// type, dates and lifecycle. Read-only shape for the patient page.
export async function getAllOrdersForPatient(patientId: number) {
  const rows = await db
    .select({
      id: WO.id, serviceType: WO.serviceType, purpose: WO.purpose, status: WO.status, currentStage: WO.currentStage,
      startedAt: WO.startedAt, expectedDeliveryDate: WO.expectedDeliveryDate,
      completedAt: WO.completedAt, finalResult: WO.finalResult, createdAt: WO.createdAt,
      expertUserId: WO.expertUserId, expertName: systemUsers.displayName,
    })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(eq(WO.patientId, patientId))
    .orderBy(desc(WO.createdAt));
  return rows.map((r) => ({
    id: r.id,
    expertUserId: r.expertUserId,
    expertName: r.expertName ?? null,
    serviceType: r.serviceType,
    purpose: r.purpose ?? "initial_build",
    status: r.status,
    currentStage: r.currentStage,
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
    expectedDeliveryDate: r.expectedDeliveryDate ? String(r.expectedDeliveryDate) : null,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    finalResult: r.finalResult ?? null,
    active: r.status !== "completed" && r.status !== "cancelled",
  }));
}

// ---- admin / manager overview aggregations (done in SQL) ---------------------

export async function getOverview(scope: { branchIds?: number[] | null }) {
  const branchCond = scope.branchIds && scope.branchIds.length > 0
    ? inArray(WO.branchId, scope.branchIds)
    : sql`TRUE`;

  const orders = await db.select({
    id: WO.id, branchId: WO.branchId, expertUserId: WO.expertUserId, serviceType: WO.serviceType,
    status: WO.status, currentStage: WO.currentStage, expectedDeliveryDate: WO.expectedDeliveryDate,
    startedAt: WO.startedAt, completedAt: WO.completedAt, finalResult: WO.finalResult,
    createdAt: WO.createdAt, updatedAt: WO.updatedAt,
    expertName: systemUsers.displayName, branchName: branches.name,
  })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .where(branchCond);

  const ids = orders.map((o) => o.id);
  const reworkRows = ids.length
    ? await db.select({ workOrderId: RW.workOrderId, reworkType: RW.reworkType, reasonCode: RW.reasonCode })
        .from(RW).where(inArray(RW.workOrderId, ids))
    : [];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  const notFinished = (s: string) => s !== "completed" && s !== "cancelled";

  // Per-expert aggregation.
  const experts = new Map<number, any>();
  const stageCounts: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  const branchAgg = new Map<number, any>();
  let overdue = 0, ready = 0, completed = 0, stale = 0;

  const recastByOrder = new Map<number, number>();
  const resocketByOrder = new Map<number, number>();
  for (const r of reworkRows) {
    if (r.reworkType === "recast") recastByOrder.set(r.workOrderId, (recastByOrder.get(r.workOrderId) ?? 0) + 1);
    if (r.reworkType === "resocket") resocketByOrder.set(r.workOrderId, (resocketByOrder.get(r.workOrderId) ?? 0) + 1);
    if (r.reasonCode) reasonCounts[r.reasonCode] = (reasonCounts[r.reasonCode] ?? 0) + 1;
  }

  for (const o of orders) {
    stageCounts[o.currentStage] = (stageCounts[o.currentStage] ?? 0) + 1;
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) overdue++;
    if (o.currentStage === "ready_for_delivery") ready++;
    if (o.status === "completed") completed++;
    if (notFinished(o.status) && daysSince(o.updatedAt) >= 14) stale++;

    const e = experts.get(o.expertUserId) ?? {
      expertUserId: o.expertUserId, expertName: o.expertName ?? `#${o.expertUserId}`,
      total: 0, active: 0, completed: 0, overdue: 0, recasts: 0, resockets: 0,
      firstFitSuccess: 0, completedWithResult: 0, durationSum: 0, durationCount: 0,
    };
    e.total++;
    if (notFinished(o.status)) e.active++;
    if (o.status === "completed") {
      e.completed++;
      if (o.finalResult) {
        e.completedWithResult++;
        if (o.finalResult === "first_fit_success") e.firstFitSuccess++;
      }
      if (o.startedAt && o.completedAt) {
        e.durationSum += Math.max(0, (new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime()) / 86_400_000);
        e.durationCount++;
      }
    }
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) e.overdue++;
    e.recasts += recastByOrder.get(o.id) ?? 0;
    e.resockets += resocketByOrder.get(o.id) ?? 0;
    experts.set(o.expertUserId, e);

    const b = branchAgg.get(o.branchId) ?? { branchId: o.branchId, branchName: o.branchName ?? `#${o.branchId}`, total: 0, completed: 0, overdue: 0 };
    b.total++;
    if (o.status === "completed") b.completed++;
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) b.overdue++;
    branchAgg.set(o.branchId, b);
  }

  const expertList = Array.from(experts.values()).map((e) => ({
    ...e,
    avgDurationDays: e.durationCount ? Math.round(e.durationSum / e.durationCount) : null,
    firstFitRate: e.completedWithResult ? Math.round((e.firstFitSuccess / e.completedWithResult) * 100) : null,
  })).sort((a, b) => b.total - a.total);

  const topReasons = Object.entries(reasonCounts)
    .map(([code, n]) => ({ code, count: n }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: { total: orders.length, overdue, ready, completed, stale },
    stageCounts,
    experts: expertList,
    topReasons,
    branches: Array.from(branchAgg.values()).sort((a, b) => b.total - a.total),
  };
}

// Guard used by routes: is `stage` valid for the order's service type?
export function stageValidFor(serviceType: string, stage: string): boolean {
  return stagesForService(serviceType).includes(stage);
}
