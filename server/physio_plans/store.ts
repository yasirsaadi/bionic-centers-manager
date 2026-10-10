// **خطّةُ العلاج الطبيعي للمريض** (ترحيل ١٠٩، §4.cm) — طبقةُ البيانات. القواعدُ في `shared/physio_plans.ts`.
// كلُّ انتقالٍ في معاملةٍ بقفل الصفّ، وتنبيهُه في المعاملة نفسِها (`enqueueStaffEvent`) — ارتدّت ⟵ لا تنبيه.
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, devices, patients, physioDeviceBranches, physioExercises, physioPlanAssignees, physioPlanDevices, physioPlanPhaseExercises,
  physioPlanPhases, physioPlanSessions, physioPlans, physioPlanSuggestions, physioProtocolDevices, physioProtocolPhaseExercises,
  physioProtocolPhases, physioProtocols, systemUsers, type PhysioPlan,
} from "@shared/schema";
import {
  canApproveFrom, canReturnFrom, canReviewFrom, canSelfActivate, canSubmitFrom, isPlanAssigneeRole, isPlanEditable, PLAN_NOT_FOUND,
  SELF_ACTIVATE_NEEDS_APPROVED_PROTOCOL, sessionAdjuncts, type PlanStatus,
} from "@shared/physio_plans";
import { centreUseOf, normalizeDose, planLineUse } from "@shared/physio_protocols";
import { deviceParamsLine, PHASE_TEXT_FIELDS, type PhaseInput } from "@shared/physio_exercises";
import { withImageUrls } from "../physio_protocols/exercises_store";
import { enqueueStaffEvent } from "../staff_telegram/outbox";

export class PlanError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
/** `isApprover`: مسؤولٌ أو مشرفٌ عام (`canApprovePlans`) — به يُعرف أنّ التعديلَ والإيقافَ والاستبدالَ قرارُ مشرفٍ يُنبَّه به كاتبُ الخطّة (§4.cz). */
export interface Actor { userId: number | null; name: string | null; isApprover?: boolean }

export interface PlanDeviceInput {
  deviceId: number; minutes: number | null;
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  /** ترحيل ١٢٢ — أساسيٌّ في كلّ جلسة أو مساعدٌ بالتناوب. */
  centreUse: "core" | "adjunct";
}
export interface PlanInput {
  titleAr: string; titleEn: string | null;
  goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null;
  precautions: string | null; precautionsEn: string | null; notes: string | null; notesEn: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null;
  /** ترحيل ١٢٣ — عددُ جلسات هذا المريض، والأسابيعُ مشتقّةٌ منه (`normalizeDose`). */
  totalSessions: number | null;
  devices: PlanDeviceInput[];
}

/** الأجهزةُ المتوفّرة في فرع — **صفٌّ غائب = غير متوفّر** (§4.cj). */
async function availableDeviceIds(ex: any, branchId: number): Promise<Set<number>> {
  const rows = await ex.select({ deviceId: physioDeviceBranches.deviceId }).from(physioDeviceBranches)
    .where(and(eq(physioDeviceBranches.branchId, branchId), eq(physioDeviceBranches.available, true)));
  return new Set(rows.map((r: any) => Number(r.deviceId)));
}

/**
 * **الفروعُ التي فيها علاجٌ طبيعيّ** (§4.da، قرارُ المالك: «العلاج الطبيعي فقط في بغداد وذي قار») — مَن فيه جهازٌ متوفّرٌ واحدٌ على الأقلّ.
 * مصدرُه توفّرُ الأجهزة بالفرع (ترحيل ١٠٦) لا اسمُ الفرع: فإن فُتح القسمُ يوماً في فرعٍ ثالث يكفي تفعيلُ أجهزته.
 */
export async function physioOfferingBranchIds(): Promise<Set<number>> {
  const rows = await db.selectDistinct({ branchId: physioDeviceBranches.branchId }).from(physioDeviceBranches)
    .where(eq(physioDeviceBranches.available, true));
  return new Set(rows.map((r) => Number(r.branchId)));
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
    reviewStatus: physioPlans.reviewStatus, reviewedByName: physioPlans.reviewedByName,
    protocolId: physioPlans.protocolId, protocolStatus: physioProtocols.status, protocolTitleAr: physioProtocols.titleAr,
    deviceCount: sql<number>`(SELECT count(*)::int FROM physio_plan_devices d WHERE d.plan_id = "physio_plans"."id")`,
    assignees: sql<string[]>`COALESCE((SELECT array_agg(u.display_name ORDER BY u.display_name) FROM physio_plan_assignees a
      JOIN system_users u ON u.id = a.user_id WHERE a.plan_id = "physio_plans"."id"), '{}')`,
  }).from(physioPlans).leftJoin(physioProtocols, eq(physioProtocols.id, physioPlans.protocolId))
    .where(eq(physioPlans.patientId, patientId)).orderBy(desc(physioPlans.createdAt));
}

/** **صفحةُ الاعتمادات والمراجعة والمسندة إليّ** — قائمةٌ عبر الفروع (`branchIds` = null للمسؤول). */
export async function listPlans(p: { status?: PlanStatus; reviewAwaiting?: boolean; assigneeUserId?: number; branchIds: number[] | null }) {
  const conds: any[] = [];
  if (p.status) conds.push(eq(physioPlans.status, p.status));
  //  «للمراجعة» (§4.cz): بدأها كاتبُها على بروتوكولٍ معتمَد وتنتظر نظرةَ المشرف — وهي تُنفَّذ.
  if (p.reviewAwaiting) conds.push(and(eq(physioPlans.status, "approved"), eq(physioPlans.reviewStatus, "awaiting")));
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlans.branchId, p.branchIds) : sql`false`);
  if (p.assigneeUserId) {
    conds.push(sql`EXISTS (SELECT 1 FROM physio_plan_assignees a WHERE a.plan_id = "physio_plans"."id" AND a.user_id = ${p.assigneeUserId})`);
  }
  return db.select({
    id: physioPlans.id, titleAr: physioPlans.titleAr, status: physioPlans.status, branchId: physioPlans.branchId,
    branchName: branches.name, patientId: physioPlans.patientId, patientName: patients.name, patientCode: patients.patientCode,
    createdByName: physioPlans.createdByName, submittedAt: physioPlans.submittedAt, updatedAt: physioPlans.updatedAt,
    decidedByName: physioPlans.decidedByName, decidedAt: physioPlans.decidedAt, reviewStatus: physioPlans.reviewStatus,
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
    centreUse: physioPlanDevices.centreUse,
    code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn,
  }).from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId))
    .where(eq(physioPlanDevices.planId, id)).orderBy(asc(physioPlanDevices.displayOrder), asc(devices.displayOrder));
  //  **دورُ المساعد في الجلسة القادمة** (ترحيل ١٢٢) — بالقاعدة نفسِها التي يحكم بها «إنهاء الجلسة».
  const [{ n: sessionsSoFar }] = await db.select({ n: sql<number>`count(*)::int` }).from(physioPlanSessions)
    .where(and(eq(physioPlanSessions.planId, id), isNull(physioPlanSessions.cancelledAt)));
  const rotation = sessionAdjuncts(lines.map((l) => ({ ...l, deviceId: Number(l.deviceId) })), Number(sessionsSoFar));
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
    devices: lines.map((l) => ({ ...l, centreUse: planLineUse(l.centreUse), availableInBranch: avail.has(Number(l.deviceId)) })),
    rotation: { sessionsSoFar: Number(sessionsSoFar), turnDeviceId: rotation.turnDeviceId },
    assignees,
    //  ترحيل ١٢٣ (§4.dd) — نسخةُ المريض من مراحل البروتوكول وتمارينها، والأجهزةُ المساعدة التي يقترحها بروتوكولُها (يختار منها الأخصائيّ).
    phases: await getPlanPhases(id),
    protocolAdjuncts: plan.protocolId ? await protocolAdjuncts(plan.protocolId, avail) : [],
  };
}

/**
 * **الأجهزةُ المساعدة التي يقترحها البروتوكول** (§4.dd — «الأجهزةُ على مريض مريض»، سليم): لا تدخل الخطّةَ تلقائياً — يؤشّر الأخصائيُّ منها ما يناسب
 * هذا المريض فيدخل بإعداداته الأولى، والتناوبُ بين المؤشَّر وحده. المتوفّرةُ في فرع الخطّة وحدها.
 */
async function protocolAdjuncts(protocolId: number, avail: Set<number>) {
  const rows = await db.select({ line: physioProtocolDevices, code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn })
    .from(physioProtocolDevices).innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
    .where(eq(physioProtocolDevices.protocolId, protocolId)).orderBy(asc(physioProtocolDevices.displayOrder));
  return rows.filter((r) => centreUseOf(r.line) === "adjunct" && avail.has(Number(r.line.deviceId)))
    .map((r) => ({ ...planLineFromProtocol(r.line, r.code), code: r.code, nameAr: r.nameAr, nameEn: r.nameEn }));
}

/** مراحلُ الخطّة بترتيبها، ولكلٍّ تمارينُها بجرعتها **والبطاقةُ كاملةً بصورها** — بشكل مراحل البروتوكول نفسِه (`getPhases`). */
export async function getPlanPhases(planId: number, ex: any = db) {
  const phases = await ex.select().from(physioPlanPhases).where(eq(physioPlanPhases.planId, planId)).orderBy(asc(physioPlanPhases.position));
  if (!phases.length) return [];
  const links = await ex.select({ link: physioPlanPhaseExercises, exercise: physioExercises })
    .from(physioPlanPhaseExercises)
    .innerJoin(physioExercises, eq(physioExercises.id, physioPlanPhaseExercises.exerciseId))
    .where(inArray(physioPlanPhaseExercises.phaseId, phases.map((p: any) => p.id)))
    .orderBy(asc(physioPlanPhaseExercises.position), asc(physioPlanPhaseExercises.id));
  return phases.map((p: any) => ({
    ...p,
    exercises: links.filter((l: any) => l.link.phaseId === p.id).map((l: any) => ({
      exerciseId: l.exercise.id,
      sets: l.link.sets, reps: l.link.reps, holdSeconds: l.link.holdSeconds, restSeconds: l.link.restSeconds,
      doseNote: l.link.doseNote, doseNoteEn: l.link.doseNoteEn, note: l.link.note, noteEn: l.link.noteEn,
      exercise: { ...l.exercise, images: withImageUrls(l.exercise.images) },
    })),
  }));
}

/**
 * **نسخُ مراحل البروتوكول وتمارينها إلى الخطّة** (ترحيل ١٢٣، §4.dd) — عند فتحها أو تغيير نوعها. ثمّ هي للمريض: يعدّلها الأخصائيُّ
 * (التمارين والتكرارات والجرعة ونطاقُ الجلسات) ولا يمسّ البروتوكول، ولا يمسّها تعديلُ البروتوكول بعدها.
 */
async function copyProtocolPhases(tx: any, protocolId: number, planId: number) {
  const phases = await tx.select().from(physioProtocolPhases).where(eq(physioProtocolPhases.protocolId, protocolId))
    .orderBy(asc(physioProtocolPhases.position));
  if (!phases.length) return;
  const links = await tx.select().from(physioProtocolPhaseExercises)
    .where(inArray(physioProtocolPhaseExercises.phaseId, phases.map((p: any) => p.id)))
    .orderBy(asc(physioProtocolPhaseExercises.position), asc(physioProtocolPhaseExercises.id));
  for (const { id: phaseId, protocolId: _p, ...ph } of phases) {
    const [row] = await tx.insert(physioPlanPhases).values({ ...ph, planId }).returning({ id: physioPlanPhases.id });
    const mine = links.filter((l: any) => l.phaseId === phaseId);
    if (mine.length) {
      await tx.insert(physioPlanPhaseExercises).values(mine.map(({ id: _i, phaseId: _ph, ...l }: any) => ({ ...l, phaseId: row.id })));
    }
  }
}

/** **مراحلُ الخطّة تُستبدل كاملة** — بقاعدة مراحل البروتوكول نفسِها: التمرينُ من المكتبة غيرُ مؤرشفٍ إلّا ما كان فيها من قبل. */
async function writePlanPhases(tx: any, planId: number, phases: PhaseInput[]) {
  const old = await tx.select({ id: physioPlanPhases.id }).from(physioPlanPhases).where(eq(physioPlanPhases.planId, planId));
  const had = new Set<number>(old.length
    ? (await tx.select({ e: physioPlanPhaseExercises.exerciseId }).from(physioPlanPhaseExercises)
      .where(inArray(physioPlanPhaseExercises.phaseId, old.map((o: any) => o.id)))).map((r: any) => Number(r.e))
    : []);
  const ids = Array.from(new Set(phases.flatMap((p) => p.exercises.map((e) => e.exerciseId))));
  if (ids.length) {
    const found = await tx.select({ id: physioExercises.id, isArchived: physioExercises.isArchived }).from(physioExercises)
      .where(inArray(physioExercises.id, ids));
    if (found.length !== ids.length) throw new PlanError(400, "تمرينٌ غير موجود في المكتبة");
    if (found.some((f: any) => f.isArchived && !had.has(Number(f.id)))) throw new PlanError(400, "تمرينٌ مؤرشف لا يُضاف إلى مرحلة");
  }
  await tx.delete(physioPlanPhases).where(eq(physioPlanPhases.planId, planId));
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const values: Record<string, unknown> = { planId, position: i + 1, nameAr: p.nameAr, nameEn: p.nameEn,
      sessionFrom: p.sessionFrom ?? null, sessionTo: p.sessionTo ?? null };
    for (const f of PHASE_TEXT_FIELDS) { values[f] = p[f] ?? null; values[`${f}En`] = p[`${f}En`] ?? null; }
    const [row] = await tx.insert(physioPlanPhases).values(values as any).returning({ id: physioPlanPhases.id });
    if (p.exercises.length) {
      await tx.insert(physioPlanPhaseExercises).values(p.exercises.map((e, j) => ({ ...e, phaseId: row.id, position: j })));
    }
  }
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
    totalSessions: pr.totalSessions,
  };
  const avail = await availableDeviceIds(tx, branchId);
  //  **«استعمالُ المركز» يحكم لا درجةُ الدليل** (ترحيل ١٢٢، §4.cx): «لا يُستخدم» لا يدخل، والأساسيُّ والمساعدُ يدخلان بدورهما —
  //  **وإعداداتُ الجهاز** (`params`) تُكتب سطراً أوّلَ في «المعاملات» فيراها الأخصائيُّ ويعدّلها لهذا المريض.
  const rows = await tx.select({ line: physioProtocolDevices, code: devices.code }).from(physioProtocolDevices)
    .innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
    .where(eq(physioProtocolDevices.protocolId, pr.id)).orderBy(asc(physioProtocolDevices.displayOrder));
  const lines: PlanDeviceInput[] = rows
    .filter((r: any) => centreUseOf(r.line) !== "not_used" && avail.has(Number(r.line.deviceId)))
    .map((r: any) => planLineFromProtocol(r.line, r.code));
  return { base, lines };
}

/** بندُ خطّةٍ من جهاز بروتوكول: استعمالُه، ودقائقُه، ونصوصُه باللغتين وأوّلُها سطرُ إعداداته. */
function planLineFromProtocol(l: any, code: string): PlanDeviceInput {
  const withSettings = (settings: string, text: string | null) => [settings, text].filter((x) => x && x.trim()).join("\n") || null;
  return {
    deviceId: Number(l.deviceId), minutes: l.minutes,
    parameters: withSettings(deviceParamsLine(code, l.params, "ar"), l.parameters),
    parametersEn: withSettings(deviceParamsLine(code, l.params, "en"), l.parametersEn),
    note: l.note, noteEn: l.noteEn, centreUse: centreUseOf(l) === "adjunct" ? "adjunct" : "core",
  };
}

const planDeviceRow = (planId: number, l: PlanDeviceInput, i: number) => ({
  planId, deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn,
  note: l.note, noteEn: l.noteEn, centreUse: l.centreUse, displayOrder: i,
});

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
    //  **الأساسيُّ وحده يدخل** (§4.dd — «الأجهزةُ على مريض مريض»): المساعدُ يؤشّره الأخصائيُّ لمريضه من «الأجهزة المساعدة» في المحرّر.
    const core = lines.filter((l: PlanDeviceInput) => l.centreUse === "core");
    if (core.length) {
      await tx.insert(physioPlanDevices).values(core.map((l: PlanDeviceInput, i: number) => planDeviceRow(row.id, l, i)));
    }
    if (p.protocolId) await copyProtocolPhases(tx, p.protocolId, row.id);
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
    const kept = lines.filter((l: PlanDeviceInput) => want.has(Number(l.deviceId))).map((l: PlanDeviceInput) => {
      const m = want.get(Number(l.deviceId));
      return { ...l, minutes: m == null ? l.minutes : l.minutes == null ? m : Math.min(m, l.minutes) };
    });
    const capDose = (v: unknown, cap: number | null) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return cap;
      return cap == null ? n : Math.min(n, cap);
    };
    //  عددُ الجلسات (ترحيل ١٢٣): يبقى عددَ البروتوكول، وإن خفّض المساعدُ جلساتِ الأسبوع أو الأسابيع فلا يتجاوز حاصلَهما.
    const spw = capDose(r?.dose?.sessionsPerWeek, base.sessionsPerWeek);
    const weeks = capDose(r?.dose?.durationWeeks, base.durationWeeks);
    const lowered = spw !== base.sessionsPerWeek || weeks !== base.durationWeeks;
    const total = lowered && spw && weeks ? Math.min(base.totalSessions ?? Number.POSITIVE_INFINITY, spw * weeks) : base.totalSessions;
    const [row] = await tx.insert(physioPlans).values({
      ...base, patientId: sg.patientId, branchId: sg.branchId, status: "draft",
      ...normalizeDose({ sessionsPerWeek: spw, durationWeeks: weeks, totalSessions: total }),
      sessionMinutes: capDose(r?.dose?.sessionMinutes, base.sessionMinutes),
      notes: typeof r?.notesAr === "string" && r.notesAr.trim() ? r.notesAr.trim() : null,
      notesEn: typeof r?.notesEn === "string" && r.notesEn.trim() ? r.notesEn.trim() : null,
      createdBy: actor.userId, createdByName: actor.name, updatedBy: actor.userId, updatedByName: actor.name,
    }).returning();
    if (kept.length) {
      await tx.insert(physioPlanDevices).values(kept.map((l: PlanDeviceInput, i: number) => planDeviceRow(row.id, l, i)));
    }
    await copyProtocolPhases(tx, sg.protocolId, row.id);
    await tx.update(physioPlanSuggestions).set({ planId: row.id, acceptedAt: new Date() }).where(eq(physioPlanSuggestions.id, sg.id));
    return row;
  });
}

async function lockPlan(tx: any, id: number): Promise<PhysioPlan> {
  const [row] = await tx.select().from(physioPlans).where(eq(physioPlans.id, id)).for("update");
  if (!row) throw new PlanError(404, PLAN_NOT_FOUND);
  return row;
}

/** حالةُ بروتوكول الخطّة الآن — `null` لخطّةٍ بلا بروتوكول. */
async function protocolStatusOf(ex: any, protocolId: number | null): Promise<string | null> {
  if (!protocolId) return null;
  const [r] = await ex.select({ status: physioProtocols.status }).from(physioProtocols).where(eq(physioProtocols.id, protocolId));
  return r?.status ?? null;
}

/** **مشرفٌ يعمل في خطّة غيره** — فيُنبَّه كاتبُها (§4.cz). */
const supervisorActsOnOthers = (plan: PhysioPlan, actor: Actor): boolean =>
  Boolean(actor.isApprover) && plan.createdBy != null && plan.createdBy !== actor.userId;

/** **تنبيهُ كاتب الخطّة بما فعله المشرف** — موافقةً وتعديلاً وإيقافاً واستبدالاً وحذفاً (§4.cz). */
async function notifyAuthor(tx: any, plan: PhysioPlan, actor: Actor, line: string, linkPath = `/physio/plans/${plan.id}`) {
  if (!plan.createdBy) return;
  await enqueueStaffEvent(tx, {
    event: "physio_plan_decided", targetUserIds: [plan.createdBy], excludeUserId: actor.userId,
    text: `${line}: ${await patientLabel(tx, plan.patientId, plan.branchId)}\n${plan.titleAr}${actor.name ? ` — ${actor.name}` : ""}`,
    linkPath,
  });
}

/** مراجعةُ المشرف مكتوبةً على الصفّ: نظر فيها مَن ومتى. */
const reviewedBy = (actor: Actor) => ({ reviewStatus: "reviewed", reviewedBy: actor.userId, reviewedByName: actor.name, reviewedAt: new Date() });

/**
 * **تعديلٌ كامل** — والأجهزةُ تُستبدل. جهازٌ غيرُ متوفّرٍ في فرع الخطّة يُردّ إلّا إن كان فيها من قبل.
 * **والخطّةُ المعتمَدة** (§4.cz): بيد المشرف في خطّة غيره ⟵ تبقى، «راجعها المشرف»، ويُنبَّه كاتبُها؛ وبيد الأخصائيّ على بروتوكولٍ معتمَد ⟵
 * تبقى تُنفَّذ وتعود «بانتظار مراجعة المشرف» ويُنبَّه المشرف؛ وعلى بروتوكولٍ غير معتمَد ⟵ تعود «بانتظار الاعتماد» كما كانت.
 */
type NextStatus = (current: PlanStatus, protocolStatus: string | null) => PlanStatus;

/**
 * **حالةُ الخطّة بعد أيّ تعديل** — نصوصاً وأجهزةً ومراحلَ وتمارين، قاعدةٌ واحدة (§4.cz): بيد المشرف في خطّة غيره تبقى «راجعها المشرف»؛ وبيد
 * الأخصائيّ على بروتوكولٍ معتمَد تبقى تُنفَّذ وتعود للمراجعة؛ وعلى غير معتمَد تعود «بانتظار الاعتماد». والتنبيهاتُ بعد كتابة التوابع.
 */
async function applyPlanEdit(tx: any, before: PhysioPlan, fields: Record<string, unknown>, nextStatus: NextStatus, actor: Actor) {
  const status = nextStatus(before.status as PlanStatus, await protocolStatusOf(tx, before.protocolId));
  const demoted = before.status === "approved" && status === "pending";
  const keptActive = before.status === "approved" && status === "approved";
  const bySupervisor = keptActive && supervisorActsOnOthers(before, actor);
  const backToReview = keptActive && !actor.isApprover;
  const [after] = await tx.update(physioPlans).set({
    ...fields, status, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
    ...(demoted ? { submittedAt: new Date(), decidedBy: null, decidedByName: null, decidedAt: null,
      reviewStatus: null, reviewedBy: null, reviewedByName: null, reviewedAt: null } : {}),
    ...(bySupervisor ? reviewedBy(actor) : {}),
    ...(backToReview ? { reviewStatus: "awaiting", reviewedBy: null, reviewedByName: null, reviewedAt: null } : {}),
  }).where(eq(physioPlans.id, before.id)).returning();
  return { after: after as PhysioPlan, demoted, backToReview, bySupervisor };
}

async function notifyPlanEdit(tx: any, r: { after: PhysioPlan; demoted: boolean; backToReview: boolean; bySupervisor: boolean }, actor: Actor) {
  if (r.demoted) await notifyPending(tx, r.after, actor, "عُدّلت خطّةٌ معتمَدة فعادت إلى الاعتماد");
  if (r.backToReview) await notifyPending(tx, r.after, actor, "عُدّلت خطّةٌ بدأت وتُنفَّذ — للمراجعة", "✏️");
  if (r.bySupervisor) await notifyAuthor(tx, r.after, actor, "✏️ عدّل المشرفُ خطّتك");
}

export async function updatePlan(id: number, input: PlanInput, nextStatus: NextStatus, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا تُعدَّل");
    const avail = await availableDeviceIds(tx, before.branchId);
    const had = new Set((await tx.select({ d: physioPlanDevices.deviceId }).from(physioPlanDevices)
      .where(eq(physioPlanDevices.planId, id))).map((r) => Number(r.d)));
    const bad = input.devices.find((d) => !avail.has(d.deviceId) && !had.has(d.deviceId));
    if (bad) throw new PlanError(400, "جهازٌ غيرُ متوفّرٍ في فرع الخطّة");
    const { devices: lines, ...fields } = input;
    const r = await applyPlanEdit(tx, before, fields, nextStatus, actor);
    await tx.delete(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    if (lines.length) {
      await tx.insert(physioPlanDevices).values(lines.map((l, i) => planDeviceRow(id, l, i)));
    }
    await notifyPlanEdit(tx, r, actor);
    return { before, after: r.after, demoted: r.demoted, backToReview: r.backToReview };
  });
}

/**
 * **تعديلُ مراحل الخطّة وتمارينها لهذا المريض** (ترحيل ١٢٣، §4.dd — قرارُ المالك: «مرونةُ سليم نفسُها لكلّ أخصائيّ… لما اختير للمريض
 * دون تأثّر الرئيسي») — التمارينُ والتكراراتُ والمجموعاتُ والثباتُ والراحةُ والجرعةُ ونطاقُ الجلسات والنصوص. البروتوكولُ لا يُمَسّ،
 * وحالةُ الخطّة بقاعدة كلّ تعديل (`applyPlanEdit`).
 */
export async function setPlanPhases(id: number, phases: PhaseInput[], nextStatus: NextStatus, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا تُعدَّل");
    const oldPhases = await getPlanPhases(id, tx);
    await writePlanPhases(tx, id, phases);
    const r = await applyPlanEdit(tx, before, {}, nextStatus, actor);
    await notifyPlanEdit(tx, r, actor);
    return {
      before: { status: before.status, phases: oldPhases.map(({ exercises, ...ph }: any) => ({ ...ph, exercises: exercises.map(({ exercise, ...x }: any) => x) })) },
      after: r.after, demoted: r.demoted, backToReview: r.backToReview,
    };
  });
}

async function notifyPending(tx: any, plan: PhysioPlan, actor: Actor, prefix = "خطّة علاج طبيعي تنتظر الاعتماد", icon = "📋") {
  const who = await patientLabel(tx, plan.patientId, plan.branchId);
  await enqueueStaffEvent(tx, {
    event: "physio_plan_pending", excludeUserId: actor.userId,
    text: `${icon} ${prefix}: ${who}\n${plan.titleAr}${plan.createdByName ? ` — كتبها ${plan.createdByName}` : ""}`,
    linkPath: `/physio/plans/${plan.id}`,
  });
}

/**
 * **«اعتماد وبدء العلاج»** (§4.cz) — كاتبُ الخطّة يبدؤها بنفسه من المسوّدة أو المُعادة **إذا كان بروتوكولُها معتمَداً من المشرف** (يُقرأ في
 * المعاملة نفسِها). فتصير معتمَدةً تُنفَّذ في الحال، و«بانتظار مراجعة المشرف»؛ ويُنبَّه المشرفُ والمسؤول للمراجعة، والمنفّذون المسنَدون.
 * وإن بدأها مشرفٌ فهي مراجَعةٌ أصلاً.
 */
export async function activatePlan(id: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!canSubmitFrom(before.status)) throw new PlanError(409, "الخطّةُ بدأت من قبل أو أُرسلت للاعتماد");
    if (!canSelfActivate(before.status, await protocolStatusOf(tx, before.protocolId))) throw new PlanError(409, SELF_ACTIVATE_NEEDS_APPROVED_PROTOCOL);
    const now = new Date();
    const [after] = await tx.update(physioPlans).set({
      status: "approved", submittedAt: now, decidedBy: actor.userId, decidedByName: actor.name, decidedAt: now, returnNote: null,
      ...(actor.isApprover ? reviewedBy(actor) : { reviewStatus: "awaiting", reviewedBy: null, reviewedByName: null, reviewedAt: null }),
      updatedBy: actor.userId, updatedByName: actor.name, updatedAt: now,
    }).where(eq(physioPlans.id, id)).returning();
    if (!actor.isApprover) await notifyPending(tx, after, actor, "خطّةٌ جديدة بدأت باعتماد الأخصائيّ — للمراجعة", "🆕");
    const ids = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
      .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
    await notifyAssigned(tx, after, ids, actor);
    return { before, after };
  });
}

/** **«موافقة المشرف»** (§4.cz) — على خطّةٍ بدأها كاتبُها وتنتظر المراجعة؛ ويُنبَّه الكاتب. */
export async function reviewPlan(id: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!canReviewFrom(before.status, before.reviewStatus)) throw new PlanError(409, "لا مراجعةَ معلَّقة على هذه الخطّة");
    const [after] = await tx.update(physioPlans).set({ ...reviewedBy(actor), updatedAt: new Date() })
      .where(eq(physioPlans.id, id)).returning();
    await notifyAuthor(tx, after, actor, "✅ وافق المشرفُ على خطّتك");
    return { before, after };
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
      //  اعتمادُ المشرف قبل البدء مراجعةٌ بنفسه (§4.cz).
      ...(decision === "approve" ? reviewedBy(actor) : {}),
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
    if (supervisorActsOnOthers(before, actor)) await notifyAuthor(tx, after, actor, `⛔ أوقف المشرفُ خطّتك (${reason})`);
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
export async function deletePlan(id: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const plan = await lockPlan(tx, id);
    const lines = await tx.select().from(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    const assignees = (await tx.select({ u: physioPlanAssignees.userId }).from(physioPlanAssignees)
      .where(eq(physioPlanAssignees.planId, id))).map((r) => Number(r.u));
    //  مراحلُها وتمارينُها تتبعها (`ON DELETE CASCADE`) — وصورتُها في سطر التدقيق.
    const phases = (await getPlanPhases(id, tx)).map(({ exercises, ...ph }: any) => ({ ...ph, exercises: exercises.map(({ exercise, ...x }: any) => x) }));
    await tx.delete(physioPlans).where(eq(physioPlans.id, id));
    //  الخطّةُ لم تعد — فالرابطُ ملفُّ المريض (§4.cz).
    if (supervisorActsOnOthers(plan, actor)) await notifyAuthor(tx, plan, actor, "🗑️ حذف المشرفُ خطّتك", `/patients/${plan.patientId}`);
    return { ...plan, devices: lines, assignees, phases };
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
    const [after] = await tx.update(physioPlans).set({ ...base, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
      //  استبدالُ المشرف نوعَ خطّةٍ تُنفَّذ قرارُه — فهي مراجَعة (§4.cz).
      ...(before.status === "approved" && actor.isApprover ? reviewedBy(actor) : {}) })
      .where(eq(physioPlans.id, id)).returning();
    await tx.delete(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    //  كخطّةٍ جديدة (§4.dd): الأساسيُّ وحده، والمساعدُ يؤشّره الأخصائيّ؛ ومراحلُ البروتوكول الجديد بدلَ القديمة.
    const core = lines.filter((l: PlanDeviceInput) => l.centreUse === "core");
    if (core.length) {
      await tx.insert(physioPlanDevices).values(core.map((l: PlanDeviceInput, i: number) => planDeviceRow(id, l, i)));
    }
    await tx.delete(physioPlanPhases).where(eq(physioPlanPhases.planId, id));
    await copyProtocolPhases(tx, protocolId, id);
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
    if (supervisorActsOnOthers(before, actor)) await notifyAuthor(tx, after, actor, `🔄 استبدل المشرفُ نوعَ خطّتك (كانت «${before.titleAr}»)`);
    return { before, after };
  });
}
