// **خطّةُ العلاج الطبيعي للمريض** (ترحيل ١٠٩، §4.cm) — طبقةُ البيانات. القواعدُ في `shared/physio_plans.ts`.
// كلُّ انتقالٍ في معاملةٍ بقفل الصفّ، وتنبيهُه في المعاملة نفسِها (`enqueueStaffEvent`) — ارتدّت ⟵ لا تنبيه.
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, devices, patients, physioDeviceBranches, physioPlanAssignees, physioPlanDevices, physioPlans,
  physioPlanSuggestions, physioProtocolDevices, physioProtocols, systemUsers, type PhysioPlan,
} from "@shared/schema";
import {
  canApproveFrom, canReturnFrom, canSubmitFrom, isPlanAssigneeRole, isPlanEditable, PLAN_NOT_FOUND, type PlanStatus,
} from "@shared/physio_plans";
import { enqueueStaffEvent } from "../staff_telegram/outbox";

export class PlanError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface Actor { userId: number | null; name: string | null }

export interface PlanDeviceInput {
  deviceId: number; minutes: number | null;
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
}
export interface PlanInput {
  titleAr: string; titleEn: string | null;
  goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null;
  precautions: string | null; precautionsEn: string | null; notes: string | null; notesEn: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null;
  devices: PlanDeviceInput[];
}

/** الأجهزةُ المتوفّرة في فرع — **صفٌّ غائب = غير متوفّر** (§4.cj). */
async function availableDeviceIds(ex: any, branchId: number): Promise<Set<number>> {
  const rows = await ex.select({ deviceId: physioDeviceBranches.deviceId }).from(physioDeviceBranches)
    .where(and(eq(physioDeviceBranches.branchId, branchId), eq(physioDeviceBranches.available, true)));
  return new Set(rows.map((r: any) => Number(r.deviceId)));
}

async function patientLabel(ex: any, patientId: number, branchId: number): Promise<string> {
  const [p] = await ex.select({ name: patients.name, code: patients.patientCode }).from(patients).where(eq(patients.id, patientId));
  const [b] = await ex.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId));
  return `${p?.name ?? `#${patientId}`}${p?.code ? ` (${p.code})` : ""}${b?.name ? ` — ${b.name}` : ""}`;
}

/** خططُ المريض — أحدثُها أوّلاً، بعدد أجهزتها ومنفّذيها واسمِ بروتوكولها وحالتِه. */
export async function listPatientPlans(patientId: number) {
  return db.select({
    id: physioPlans.id, titleAr: physioPlans.titleAr, titleEn: physioPlans.titleEn, status: physioPlans.status,
    branchId: physioPlans.branchId, createdByName: physioPlans.createdByName, createdAt: physioPlans.createdAt,
    updatedAt: physioPlans.updatedAt, decidedByName: physioPlans.decidedByName, decidedAt: physioPlans.decidedAt,
    protocolId: physioPlans.protocolId, protocolStatus: physioProtocols.status, protocolTitleAr: physioProtocols.titleAr,
    deviceCount: sql<number>`(SELECT count(*)::int FROM physio_plan_devices d WHERE d.plan_id = "physio_plans"."id")`,
    assignees: sql<string[]>`COALESCE((SELECT array_agg(u.display_name ORDER BY u.display_name) FROM physio_plan_assignees a
      JOIN system_users u ON u.id = a.user_id WHERE a.plan_id = "physio_plans"."id"), '{}')`,
  }).from(physioPlans).leftJoin(physioProtocols, eq(physioProtocols.id, physioPlans.protocolId))
    .where(eq(physioPlans.patientId, patientId)).orderBy(desc(physioPlans.createdAt));
}

/** **صفحةُ الاعتمادات والمسندة إليّ** — قائمةٌ عبر الفروع (`branchIds` = null للمسؤول). */
export async function listPlans(p: { status?: PlanStatus; assigneeUserId?: number; branchIds: number[] | null }) {
  const conds: any[] = [];
  if (p.status) conds.push(eq(physioPlans.status, p.status));
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlans.branchId, p.branchIds) : sql`false`);
  if (p.assigneeUserId) {
    conds.push(sql`EXISTS (SELECT 1 FROM physio_plan_assignees a WHERE a.plan_id = "physio_plans"."id" AND a.user_id = ${p.assigneeUserId})`);
  }
  return db.select({
    id: physioPlans.id, titleAr: physioPlans.titleAr, status: physioPlans.status, branchId: physioPlans.branchId,
    branchName: branches.name, patientId: physioPlans.patientId, patientName: patients.name, patientCode: patients.patientCode,
    createdByName: physioPlans.createdByName, submittedAt: physioPlans.submittedAt, updatedAt: physioPlans.updatedAt,
    protocolStatus: physioProtocols.status,
  }).from(physioPlans)
    .innerJoin(patients, eq(patients.id, physioPlans.patientId))
    .leftJoin(branches, eq(branches.id, physioPlans.branchId))
    .leftJoin(physioProtocols, eq(physioProtocols.id, physioPlans.protocolId))
    .where(and(sql`${patients.deletedAt} IS NULL`, ...conds))
    .orderBy(desc(physioPlans.updatedAt)).limit(300);
}

export async function getPlanRow(id: number): Promise<PhysioPlan | null> {
  const [r] = await db.select().from(physioPlans).where(eq(physioPlans.id, id));
  return r ?? null;
}

/** الخطّةُ كاملة: أجهزتُها بأسمائها وتوفّرِها في فرع الخطّة، ومنفّذوها، وبروتوكولُها وحالتُه، والمريضُ والفرع. */
export async function getPlan(id: number) {
  const plan = await getPlanRow(id);
  if (!plan) return null;
  const avail = await availableDeviceIds(db, plan.branchId);
  const lines = await db.select({
    id: physioPlanDevices.id, deviceId: physioPlanDevices.deviceId, minutes: physioPlanDevices.minutes,
    parameters: physioPlanDevices.parameters, parametersEn: physioPlanDevices.parametersEn,
    note: physioPlanDevices.note, noteEn: physioPlanDevices.noteEn, displayOrder: physioPlanDevices.displayOrder,
    code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn,
  }).from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId))
    .where(eq(physioPlanDevices.planId, id)).orderBy(asc(physioPlanDevices.displayOrder), asc(devices.displayOrder));
  const assignees = await db.select({ userId: physioPlanAssignees.userId, name: systemUsers.displayName, role: systemUsers.role })
    .from(physioPlanAssignees).innerJoin(systemUsers, eq(systemUsers.id, physioPlanAssignees.userId))
    .where(eq(physioPlanAssignees.planId, id)).orderBy(asc(systemUsers.displayName));
  const [protocol] = plan.protocolId
    ? await db.select({ id: physioProtocols.id, titleAr: physioProtocols.titleAr, titleEn: physioProtocols.titleEn, status: physioProtocols.status, code: physioProtocols.code })
      .from(physioProtocols).where(eq(physioProtocols.id, plan.protocolId))
    : [null];
  const [patient] = await db.select({ id: patients.id, name: patients.name, code: patients.patientCode, age: patients.age })
    .from(patients).where(eq(patients.id, plan.patientId));
  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, plan.branchId));
  return {
    ...plan, branchName: branch?.name ?? null, patient: patient ?? null, protocol: protocol ?? null,
    devices: lines.map((l) => ({ ...l, availableInBranch: avail.has(Number(l.deviceId)) })),
    assignees,
  };
}

/**
 * **خطّةٌ جديدة** — مسوّدة. من بروتوكولٍ ⟵ تمتلئ منه بنصوصه باللغتين وجرعته، **وأجهزتُه الموصى بها والاختيارية المتوفّرةُ في الفرع وحدها**
 * (غيرُ الموصى به لا يُنقل). وبلا بروتوكول ⟵ خطّةٌ فارغة بعنوانها.
 */
/** **ما تمتلئ به الخطّةُ من بروتوكول** — نصوصُه باللغتين وجرعتُه، والموانعُ والاحتياطاتُ معاً، وأجهزتُه الموصى بها والاختيارية المتوفّرةُ في الفرع وحدها. */
async function protocolFill(tx: any, protocolId: number, branchId: number) {
  const [pr] = await tx.select().from(physioProtocols).where(eq(physioProtocols.id, protocolId));
  if (!pr || pr.isArchived) throw new PlanError(404, "البروتوكول غير موجود");
  const base = {
    protocolId: pr.id, titleAr: pr.titleAr, titleEn: pr.titleEn,
    goals: pr.goals, goalsEn: pr.goalsEn, exercises: pr.exercises, exercisesEn: pr.exercisesEn,
    precautions: [pr.contraindications, pr.precautions].filter(Boolean).join("\n\n") || null,
    precautionsEn: [pr.contraindicationsEn, pr.precautionsEn].filter(Boolean).join("\n\n") || null,
    sessionsPerWeek: pr.sessionsPerWeek, durationWeeks: pr.durationWeeks, sessionMinutes: pr.sessionMinutes,
  };
  const avail = await availableDeviceIds(tx, branchId);
  const lines = (await tx.select().from(physioProtocolDevices).where(eq(physioProtocolDevices.protocolId, pr.id))
    .orderBy(asc(physioProtocolDevices.displayOrder)))
    .filter((l: any) => l.evidence !== "not_recommended" && avail.has(Number(l.deviceId)));
  return { base, lines };
}

export async function createPlan(p: {
  patientId: number; branchId: number; protocolId: number | null; titleAr: string | null; actor: Actor;
}): Promise<PhysioPlan> {
  return db.transaction(async (tx) => {
    const { base, lines } = p.protocolId ? await protocolFill(tx, p.protocolId, p.branchId) : { base: {} as any, lines: [] as any[] };
    const titleAr = (p.titleAr ?? base.titleAr ?? "").trim();
    if (!titleAr) throw new PlanError(400, "اختر بروتوكولاً أو اكتب عنوانَ الخطّة");
    const [row] = await tx.insert(physioPlans).values({
      ...base, titleAr, patientId: p.patientId, branchId: p.branchId, status: "draft",
      createdBy: p.actor.userId, createdByName: p.actor.name, updatedBy: p.actor.userId, updatedByName: p.actor.name,
    }).returning();
    if (lines.length) {
      await tx.insert(physioPlanDevices).values(lines.map((l: any, i: number) => ({
        planId: row.id, deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn,
        note: l.note, noteEn: l.noteEn, displayOrder: i,
      })));
    }
    return row;
  });
}

/**
 * **قبولُ اقتراح المساعد** (§4.co) — يفتح مسوّدةً من البروتوكول المختار كما يفعل «خطة جديدة»، ثمّ يطبّق ما قبله الخادمُ من الاقتراح:
 * الأجهزةُ الباقيةُ ودقائقُها، والجرعة، وملاحظاتُ المريض. **وتقاطعٌ مع البروتوكول الآن** — جهازٌ أُزيل من البروتوكول أو من فرعه بعد الاقتراح لا يعود،
 * ودقائقُ أكثرُ من البروتوكول الآن تُنزَل إليه. ومرّةً واحدة لكلّ اقتراح.
 */
export async function createPlanFromSuggestion(suggestionId: number, actor: Actor): Promise<PhysioPlan> {
  return db.transaction(async (tx) => {
    const [sg] = await tx.select().from(physioPlanSuggestions).where(eq(physioPlanSuggestions.id, suggestionId)).for("update");
    if (!sg) throw new PlanError(404, "الاقتراح غير موجود");
    if (sg.planId || sg.acceptedAt) throw new PlanError(409, "فُتحت خطّةٌ من هذا الاقتراح من قبل");
    const { base, lines } = await protocolFill(tx, sg.protocolId, sg.branchId);
    const r = sg.result as any;
    const want = new Map<number, number | null>((Array.isArray(r?.devices) ? r.devices : []).map((d: any) => [Number(d.deviceId), d.minutes == null ? null : Number(d.minutes)]));
    const kept = lines.filter((l: any) => want.has(Number(l.deviceId))).map((l: any) => {
      const m = want.get(Number(l.deviceId));
      return { ...l, minutes: m == null ? l.minutes : l.minutes == null ? m : Math.min(m, l.minutes) };
    });
    const capDose = (v: unknown, cap: number | null) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return cap;
      return cap == null ? n : Math.min(n, cap);
    };
    const [row] = await tx.insert(physioPlans).values({
      ...base, patientId: sg.patientId, branchId: sg.branchId, status: "draft",
      sessionsPerWeek: capDose(r?.dose?.sessionsPerWeek, base.sessionsPerWeek),
      durationWeeks: capDose(r?.dose?.durationWeeks, base.durationWeeks),
      sessionMinutes: capDose(r?.dose?.sessionMinutes, base.sessionMinutes),
      notes: typeof r?.notesAr === "string" && r.notesAr.trim() ? r.notesAr.trim() : null,
      notesEn: typeof r?.notesEn === "string" && r.notesEn.trim() ? r.notesEn.trim() : null,
      createdBy: actor.userId, createdByName: actor.name, updatedBy: actor.userId, updatedByName: actor.name,
    }).returning();
    if (kept.length) {
      await tx.insert(physioPlanDevices).values(kept.map((l: any, i: number) => ({
        planId: row.id, deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn,
        note: l.note, noteEn: l.noteEn, displayOrder: i,
      })));
    }
    await tx.update(physioPlanSuggestions).set({ planId: row.id, acceptedAt: new Date() }).where(eq(physioPlanSuggestions.id, sg.id));
    return row;
  });
}

async function lockPlan(tx: any, id: number): Promise<PhysioPlan> {
  const [row] = await tx.select().from(physioPlans).where(eq(physioPlans.id, id)).for("update");
  if (!row) throw new PlanError(404, PLAN_NOT_FOUND);
  return row;
}

/** **تعديلٌ كامل** — والأجهزةُ تُستبدل. جهازٌ غيرُ متوفّرٍ في فرع الخطّة يُردّ إلّا إن كان فيها من قبل. */
export async function updatePlan(id: number, input: PlanInput, nextStatus: (current: PlanStatus) => PlanStatus, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا تُعدَّل");
    const avail = await availableDeviceIds(tx, before.branchId);
    const had = new Set((await tx.select({ d: physioPlanDevices.deviceId }).from(physioPlanDevices)
      .where(eq(physioPlanDevices.planId, id))).map((r) => Number(r.d)));
    const bad = input.devices.find((d) => !avail.has(d.deviceId) && !had.has(d.deviceId));
    if (bad) throw new PlanError(400, "جهازٌ غيرُ متوفّرٍ في فرع الخطّة");
    const status = nextStatus(before.status as PlanStatus);
    const demoted = before.status === "approved" && status === "pending";
    const { devices: lines, ...fields } = input;
    const [after] = await tx.update(physioPlans).set({
      ...fields, status, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
      ...(demoted ? { submittedAt: new Date(), decidedBy: null, decidedByName: null, decidedAt: null } : {}),
    }).where(eq(physioPlans.id, id)).returning();
    await tx.delete(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    if (lines.length) {
      await tx.insert(physioPlanDevices).values(lines.map((l, i) => ({ planId: id, ...l, displayOrder: i })));
    }
    if (demoted) await notifyPending(tx, after, actor, "عُدّلت خطّةٌ معتمَدة فعادت إلى الاعتماد");
    return { before, after, demoted };
  });
}

async function notifyPending(tx: any, plan: PhysioPlan, actor: Actor, prefix = "خطّة علاج طبيعي تنتظر الاعتماد") {
  const who = await patientLabel(tx, plan.patientId, plan.branchId);
  await enqueueStaffEvent(tx, {
    event: "physio_plan_pending", excludeUserId: actor.userId,
    text: `📋 ${prefix}: ${who}\n${plan.titleAr}${plan.createdByName ? ` — كتبها ${plan.createdByName}` : ""}`,
    linkPath: `/physio/plans/${plan.id}`,
  });
}

/** **إرسالٌ للاعتماد** — من المسوّدة أو المُعادة، ويصل التنبيهُ المسؤولَ والمشرفَ العام. */
export async function submitPlan(id: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!canSubmitFrom(before.status)) throw new PlanError(409, "أُرسلت الخطّةُ للاعتماد من قبل أو قُرِّرت");
    const [after] = await tx.update(physioPlans).set({ status: "pending", submittedAt: new Date(), updatedAt: new Date(),
      updatedBy: actor.userId, updatedByName: actor.name }).where(eq(physioPlans.id, id)).returning();
    await notifyPending(tx, after, actor);
    return after;
  });
}

/** **اعتمادٌ أو إعادة** — والكاتبُ يُنبَّه، والمنفّذون عند الاعتماد. */
export async function decidePlan(id: number, decision: "approve" | "return", note: string | null, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (decision === "approve" ? !canApproveFrom(before.status) : !canReturnFrom(before.status)) {
      throw new PlanError(409, decision === "approve" ? "الخطّةُ معتمَدةٌ أو موقوفة" : "تُعاد الخطّةُ المنتظِرةُ للاعتماد وحدها");
    }
    const [after] = await tx.update(physioPlans).set({
      status: decision === "approve" ? "approved" : "returned",
      decidedBy: actor.userId, decidedByName: actor.name, decidedAt: new Date(),
      returnNote: decision === "return" ? note : null, updatedAt: new Date(),
    }).where(eq(physioPlans.id, id)).returning();
    const who = await patientLabel(tx, after.patientId, after.branchId);
    if (after.createdBy) {
      await enqueueStaffEvent(tx, {
        event: "physio_plan_decided", targetUserIds: [after.createdBy], excludeUserId: actor.userId,
        text: decision === "approve"
          ? `✅ اعتُمدت خطّتك: ${who}\n${after.titleAr} — ${actor.name ?? ""}`
          : `↩️ أُعيدت خطّتك بملاحظة: ${who}\n${after.titleAr}\nالملاحظة: ${note ?? ""}`,
        linkPath: `/physio/plans/${id}`,
      });
    }
    if (decision === "approve") {
      const ids = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
        .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
      await notifyAssigned(tx, after, ids, actor, who);
    }
    return { before, after };
  });
}

async function notifyAssigned(tx: any, plan: PhysioPlan, userIds: number[], actor: Actor, who?: string) {
  if (!userIds.length) return;
  await enqueueStaffEvent(tx, {
    event: "physio_plan_assigned", targetUserIds: userIds, excludeUserId: actor.userId,
    text: `🧑‍⚕️ أُسندت إليك خطّة علاج طبيعي معتمَدة: ${who ?? await patientLabel(tx, plan.patientId, plan.branchId)}\n${plan.titleAr}`,
    linkPath: `/physio/plans/${plan.id}`,
  });
}

/** **الإيقاف** — لا محو: الخطّةُ تبقى تاريخاً بسببها. */
export async function stopPlan(id: number, reason: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (before.status === "stopped") throw new PlanError(409, "الخطّةُ موقوفة من قبل");
    if (before.status === "graduated") throw new PlanError(409, "الخطّةُ منتهيةٌ بتخرّج المريض");
    const [after] = await tx.update(physioPlans).set({ status: "stopped", stopReason: reason, stoppedAt: new Date(),
      updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date() }).where(eq(physioPlans.id, id)).returning();
    return { before, after };
  });
}

/** مَن يُسنَد إليه في فرعٍ: أدوارُ القسم النشطة التي تعمل فيه. */
export async function assigneeCandidates(branchId: number) {
  const rows = await db.select({
    id: systemUsers.id, name: systemUsers.displayName, role: systemUsers.role, extraRoles: systemUsers.extraRoles,
    branchId: systemUsers.branchId, branchIds: systemUsers.branchIds, isActive: systemUsers.isActive,
  }).from(systemUsers);
  return rows.filter((u) => u.isActive !== false && isPlanAssigneeRole(u) && worksIn(u, branchId))
    .map((u) => ({ id: u.id, name: u.name, role: u.role }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ar"));
}

function worksIn(u: { branchId: number | null; branchIds: unknown }, branchId: number): boolean {
  const list = Array.isArray(u.branchIds) ? (u.branchIds as unknown[]).map(Number) : [];
  return u.branchId === branchId || list.includes(branchId);
}

/** **الإسناد** — يُستبدل كاملاً. والجددُ يُنبَّهون إن كانت الخطّةُ معتمَدة. */
export async function setAssignees(id: number, userIds: number[], actor: Actor) {
  return db.transaction(async (tx) => {
    const plan = await lockPlan(tx, id);
    if (!isPlanEditable(plan.status)) throw new PlanError(409, "الخطّةُ منتهية — موقوفةٌ أو متخرّجة");
    const allowed = new Set((await assigneeCandidates(plan.branchId)).map((u) => u.id));
    if (userIds.some((u) => !allowed.has(u))) throw new PlanError(400, "يُسنَد إلى أدوار العلاج الطبيعي العاملة في فرع الخطّة وحدها");
    const before = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
      .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
    await tx.delete(physioPlanAssignees).where(eq(physioPlanAssignees.planId, id));
    if (userIds.length) {
      await tx.insert(physioPlanAssignees).values(userIds.map((u) => ({ planId: id, userId: u, assignedBy: actor.userId })));
    }
    if (plan.status === "approved") await notifyAssigned(tx, plan, userIds.filter((u) => !before.includes(u)), actor);
    return { before, after: userIds };
  });
}

/** **حذفُ الخطّة** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — للمسؤول والمشرف العام حصراً، وبأيّ حالة. أجهزتُها ومنفّذوها يتبعونها،
 *  والصورةُ الكاملة تُعاد لسطر التدقيق فلا يضيع ما حُذف. */
export async function deletePlan(id: number) {
  return db.transaction(async (tx) => {
    const plan = await lockPlan(tx, id);
    const lines = await tx.select().from(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    const assignees = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
      .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
    await tx.delete(physioPlans).where(eq(physioPlans.id, id));
    return { ...plan, devices: lines, assignees };
  });
}

/**
 * **تغييرُ نوع الخطّة** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — للمسؤول والمشرف العام حصراً: الخطّةُ نفسُها تمتلئ من بروتوكولٍ آخر
 * (العنوانُ والأهدافُ والتمارينُ والموانعُ والجرعةُ والأجهزة) — لا تعديلُ مواصفاتها. ويبقى المريضُ والفرعُ والمنفّذون
 * و«ملاحظات الأخصائيّ لهذا المريض» والحالة؛ والمنفّذون يُنبَّهون إن كانت معتمَدة.
 */
export async function changePlanProtocol(id: number, protocolId: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا يتغيّر نوعُها");
    if (before.protocolId === protocolId) throw new PlanError(409, "هذا هو نوعُ الخطّة الحاليّ");
    const { base, lines } = await protocolFill(tx, protocolId, before.branchId);
    const [after] = await tx.update(physioPlans).set({ ...base, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date() })
      .where(eq(physioPlans.id, id)).returning();
    await tx.delete(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    if (lines.length) {
      await tx.insert(physioPlanDevices).values(lines.map((l: any, i: number) => ({
        planId: id, deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn,
        note: l.note, noteEn: l.noteEn, displayOrder: i,
      })));
    }
    if (after.status === "approved") {
      const ids = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
        .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
      if (ids.length) {
        await enqueueStaffEvent(tx, {
          event: "physio_plan_assigned", targetUserIds: ids, excludeUserId: actor.userId,
          text: `🔄 تغيّر نوعُ خطّةٍ مسندة إليك: ${await patientLabel(tx, after.patientId, after.branchId)}\n${before.titleAr} ⟵ ${after.titleAr}`,
          linkPath: `/physio/plans/${id}`,
        });
      }
    }
    return { before, after };
  });
}
