// **خطّةُ العلاج الطبيعي للمريض** (ترحيل ١٠٩، §4.cm) — طبقةُ البيانات. القواعدُ في `shared/physio_plans.ts`.
// كلُّ انتقالٍ في معاملةٍ بقفل الصفّ، وتنبيهُه في المعاملة نفسِها (`enqueueStaffEvent`) — ارتدّت ⟵ لا تنبيه.
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, devices, patients, physioDeviceBranches, physioExercises, physioPlanAssignees, physioPlanDevices, physioPlanMeasures, physioPlanPhaseExercises,
  physioPlanPhases, physioPlanSessionItems, physioPlanSessions, physioPlans, physioPlanSuggestions, physioProtocolDevices, physioProtocolMeasures,
  physioProtocolPhaseExercises, physioProtocolPhases, physioProtocols, systemUsers, type PhysioPlan,
} from "@shared/schema";
import {
  ALREADY_STARTED, canApproveFrom, canReturnFrom, canReviewFrom, canSelfActivate, canSubmitFrom, isPlanAssigneeRole, isPlanEditable, PLAN_NOT_FOUND,
  sessionAdjuncts, type PlanStatus,
} from "@shared/physio_plans";
import { centreUseOf, normalizeDose, planLineUse } from "@shared/physio_protocols";
import { isScheduled, planSettingsGaps, settingsReminderText, type SettingsBlocker } from "@shared/physio_device_settings";
import {
  physioSupervisors, SETTINGS_REMINDER_ACTION, SETTINGS_REMINDER_QUIET_MS, settingsReminderInfo, type SettingsReminderInfo,
} from "../physio_protocols/settings_reminders";
import { logAudit } from "../accounting/ledger";
import { PHASE_TEXT_FIELDS, type PhaseInput } from "@shared/physio_exercises";
import {
  diffSummaryLine, planLineFromProtocol, planProtocolDiff, protocolPrecautionsText, type DiffPhase, type PlanDiff,
} from "@shared/physio_plan_diff";
import type { MeasureDef } from "@shared/physio_assessments";
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
  /** §4.dn (ترحيل ١٣١) — الموعدُ الدوريّ: كلّ كم يوماً وكم مرّة؛ يُخرج البندَ من «كلّ جلسة» ومن التناوب. */
  everyDays?: number | null;
  times?: number | null;
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
  //  «للمراجعة» (§4.cz، و§4.do): بدأها كاتبُها أو عدّلها وتنتظر نظرةَ المشرف — وهي تُنفَّذ.
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

/** أيّامُ تنفيذ البنود الدوريّة في جلسات الخطّة غير الملغاة — `{ deviceId: ["YYYY-MM-DD", …] }` (§4.dn). */
export async function scheduledDoneDates(ex: any, planId: number, deviceIds: number[], before?: string): Promise<Record<number, string[]>> {
  const out: Record<number, string[]> = {};
  for (const d of deviceIds) out[d] = [];
  if (!deviceIds.length) return out;
  const rows = await ex.select({ deviceId: physioPlanSessionItems.deviceId, date: physioPlanSessions.sessionDate })
    .from(physioPlanSessionItems).innerJoin(physioPlanSessions, eq(physioPlanSessions.id, physioPlanSessionItems.sessionId))
    .where(and(eq(physioPlanSessions.planId, planId), isNull(physioPlanSessions.cancelledAt), eq(physioPlanSessionItems.done, true),
      inArray(physioPlanSessionItems.deviceId, deviceIds), ...(before ? [sql`${physioPlanSessions.sessionDate} <= ${before}`] : [])));
  for (const r of rows) out[Number(r.deviceId)]?.push(String(r.date).slice(0, 10));
  return out;
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
    centreUse: physioPlanDevices.centreUse, everyDays: physioPlanDevices.everyDays, times: physioPlanDevices.times,
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
    //  §4.dn — **أيّامُ تنفيذ كلّ بندٍ دوريّ** في جلسات الخطّة غير الملغاة: منها تحسب شاشةُ التنفيذ هل حان موعدُه بتاريخ الجلسة (`scheduleState`).
    scheduleHistory: await scheduledDoneDates(db, id, lines.filter((l) => isScheduled(l)).map((l) => Number(l.deviceId))),
    assignees,
    //  ترحيل ١٢٣ (§4.dd) — نسخةُ المريض من مراحل البروتوكول وتمارينها، والأجهزةُ المساعدة التي يقترحها بروتوكولُها (يختار منها الأخصائيّ).
    phases: await getPlanPhases(id),
    protocolAdjuncts: plan.protocolId ? await protocolAdjuncts(plan.protocolId, avail) : [],
    //  §4.do — **مقاييسُ هذه الخطّة** (لها إن عُدّلت لمريضها، وإلّا مقاييسُ بروتوكولها)، **وما تختلف به عن البروتوكول كما هو الآن**.
    measures: await effectiveMeasures(plan),
    protocolDiff: await planDiffFor(plan),
  };
}

// ══ مقاييسُ الخطّة، وما تختلف به الخطّةُ عن بروتوكولها الآن (ترحيل ١٣٢، §4.do) ═══════════════════════════════════════════
const measureDef = (r: any): MeasureDef => ({
  code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, unitAr: r.unitAr, unitEn: r.unitEn,
  min: Number(r.minValue), max: Number(r.maxValue), higherIsBetter: r.higherIsBetter,
});

/** مقاييسُ بروتوكولٍ بأرقامها (الأعمدةُ `numeric` تصل نصّاً). */
export async function protocolMeasureDefs(protocolId: number | null, ex: any = db): Promise<MeasureDef[]> {
  if (!protocolId) return [];
  const rows = await ex.select().from(physioProtocolMeasures).where(eq(physioProtocolMeasures.protocolId, protocolId))
    .orderBy(asc(physioProtocolMeasures.displayOrder), asc(physioProtocolMeasures.id));
  return rows.map(measureDef);
}

/** مقاييسُ خطّةٍ عُدّلت لمريضها. */
export async function planOwnMeasures(planId: number, ex: any = db): Promise<MeasureDef[]> {
  const rows = await ex.select().from(physioPlanMeasures).where(eq(physioPlanMeasures.planId, planId))
    .orderBy(asc(physioPlanMeasures.displayOrder), asc(physioPlanMeasures.id));
  return rows.map(measureDef);
}

/** **مقاييسُ الخطّة الفعّالة** — لها إن عُدّلت لمريضها (`measuresOwn`)، وإلّا مقاييسُ بروتوكولها الآن، وبلا بروتوكول لا شيء. */
export async function effectiveMeasures(plan: Pick<PhysioPlan, "id" | "protocolId" | "measuresOwn">, ex: any = db): Promise<MeasureDef[]> {
  return plan.measuresOwn ? planOwnMeasures(plan.id, ex) : protocolMeasureDefs(plan.protocolId, ex);
}

/** مراحلُ بتمارينها للمقارنة — بلا صور. */
async function phasesForDiff(ex: any, owner: { planId: number } | { protocolId: number }): Promise<DiffPhase[]> {
  const isPlan = "planId" in owner;
  const P: any = isPlan ? physioPlanPhases : physioProtocolPhases;
  const L: any = isPlan ? physioPlanPhaseExercises : physioProtocolPhaseExercises;
  const phases = await ex.select().from(P).where(isPlan ? eq(P.planId, owner.planId) : eq(P.protocolId, (owner as any).protocolId))
    .orderBy(asc(P.position));
  if (!phases.length) return [];
  const links = await ex.select({ link: L, nameAr: physioExercises.nameAr, nameEn: physioExercises.nameEn })
    .from(L).innerJoin(physioExercises, eq(physioExercises.id, L.exerciseId))
    .where(inArray(L.phaseId, phases.map((p: any) => p.id))).orderBy(asc(L.position), asc(L.id));
  return phases.map((p: any) => ({
    ...p,
    exercises: links.filter((l: any) => l.link.phaseId === p.id)
      .map((l: any) => ({ ...l.link, exercise: { nameAr: l.nameAr, nameEn: l.nameEn } })),
  }));
}

/**
 * **ما تختلف به الخطّةُ عن بروتوكولها كما هو الآن** — والمرجعُ «البروتوكولُ الذي عدّله المشرفُ آخرَ مرّة» (قرارُ المالك): بحالته ومَن عدّله
 * ومتى، وهل عُدّل بعد نسخ الخطّة منه (فبعضُ الفروق منه لا من كاتب الخطّة). وخطّةٌ بلا بروتوكول ⟵ `null`.
 */
export async function planDiffFor(plan: PhysioPlan, ex: any = db): Promise<{
  diff: PlanDiff; changedSinceCopy: boolean;
  reference: { status: string; updatedAt: Date | null; updatedByName: string | null; approvedAt: Date | null; approvedByName: string | null };
} | null> {
  if (!plan.protocolId) return null;
  const [pr] = await ex.select().from(physioProtocols).where(eq(physioProtocols.id, plan.protocolId));
  if (!pr) return null;
  const protoLines = await ex.select({ line: physioProtocolDevices, code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn })
    .from(physioProtocolDevices).innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
    .where(eq(physioProtocolDevices.protocolId, pr.id)).orderBy(asc(physioProtocolDevices.displayOrder));
  const planLines = await ex.select({ line: physioPlanDevices, code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn })
    .from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId))
    .where(eq(physioPlanDevices.planId, plan.id)).orderBy(asc(physioPlanDevices.displayOrder));
  const flat = (r: any) => ({ ...r.line, code: r.code, nameAr: r.nameAr, nameEn: r.nameEn });
  const diff = planProtocolDiff(
    { ...plan, devices: planLines.map(flat), phases: await phasesForDiff(ex, { planId: plan.id }),
      measures: plan.measuresOwn ? await planOwnMeasures(plan.id, ex) : null },
    { ...pr, devices: protoLines.map(flat), phases: await phasesForDiff(ex, { protocolId: pr.id }), measures: await protocolMeasureDefs(pr.id, ex) },
    await availableDeviceIds(ex, plan.branchId),
  );
  return {
    diff,
    changedSinceCopy: Boolean(plan.protocolCopiedAt && pr.updatedAt && new Date(pr.updatedAt) > new Date(plan.protocolCopiedAt)),
    reference: { status: pr.status, updatedAt: pr.updatedAt ?? null, updatedByName: pr.updatedByName ?? null,
      approvedAt: pr.approvedAt ?? null, approvedByName: pr.approvedByName ?? null },
  };
}

// ══ إعداداتُ الجهاز الناقصة في البروتوكول — تذكيرُ المشرف (§4.dq — ٢٠٢٦-١٠-١٢) ═══════════════════════════════════════════
export interface PlanSettingsGaps { gaps: SettingsBlocker[]; supervisors: { id: number; name: string }[]; reminder: SettingsReminderInfo }

/**
 * **ما ينقص بروتوكولَ الخطّة من إعدادات أجهزةٍ فيها** (الموجاتُ الصادمة: النوعُ والشدّةُ والتردّدُ والنبضات — §4.dn)، ومَن يُذكَّر، وآخرُ تذكير.
 * لا شيءَ لخطّةٍ بلا بروتوكول، ولا لبروتوكولٍ مكتمل، ولا لجهازٍ أُزيل من الخطّة.
 */
export async function planSettingsGapsFor(plan: PhysioPlan, ex: any = db): Promise<PlanSettingsGaps | null> {
  if (!plan.protocolId) return null;
  const protoLines = await ex.select({ code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn, params: physioProtocolDevices.params,
    centreUse: physioProtocolDevices.centreUse, evidence: physioProtocolDevices.evidence })
    .from(physioProtocolDevices).innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
    .where(eq(physioProtocolDevices.protocolId, plan.protocolId)).orderBy(asc(physioProtocolDevices.displayOrder));
  const planCodes = (await ex.select({ code: devices.code }).from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId))
    .where(eq(physioPlanDevices.planId, plan.id))).map((r: any) => r.code);
  const gaps = planSettingsGaps(protoLines, planCodes);
  if (!gaps.length) return null;
  return { gaps, supervisors: await physioSupervisors(ex), reminder: await settingsReminderInfo(plan.protocolId, ex) };
}

/** مفتاحُ القفل الاستشاريّ لتذكيرات البروتوكول — مع رقمه، فضغطتان متزامنتان على البروتوكول نفسِه تمرّان واحدةً بعد واحدة. */
const SETTINGS_REMINDER_LOCK = 7031;

/**
 * **«ذكّر المشرف»** — يصل المشرفين العامّين (غيرَ مَن ضغط) في تلغرامهم بالجهاز وخاناته والبروتوكول ومَن ذكّر ولأيّ مريض، **وسطرُ التدقيق على البروتوكول
 * في المعاملة نفسِها** (منه يراه المشرفُ في صفحته، ومنه تُحسب العشرُ دقائق). **تحت قفلٍ على البروتوكول** (مراجعةُ Codex): ضغطتان متزامنتان لا ترسلان
 * تذكيرين؛ **وإن لم يُكتب صفُّ الإرسال لا يُقال «أُرسل»** ولا يُسجَّل (٥٠٣). و`viaTelegram`: هل ربط أحدُهم تلغرامَه وفعّل النوع — وإلّا يُقال إنّه في صفحة البروتوكول وحدها.
 */
export async function remindPlanSettings(plan: PhysioPlan, actor: Actor, meta: { ip?: string | null; userAgent?: string | null } = {}):
  Promise<{ sent: boolean; gaps: SettingsBlocker[]; to: string[]; viaTelegram: boolean }> {
  if (!plan.protocolId) throw new PlanError(409, "خطّةٌ بلا بروتوكول — لا تذكيرَ لازم");
  const protocolId = plan.protocolId;
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SETTINGS_REMINDER_LOCK}, ${protocolId})`);
    const g = await planSettingsGapsFor(plan, tx);
    if (!g) throw new PlanError(409, "إعداداتُ أجهزة هذه الخطّة مكتملةٌ في البروتوكول — لا تذكيرَ لازم");
    const targets = g.supervisors.filter((u) => u.id !== actor.userId);
    if (!targets.length) throw new PlanError(409, "لا مشرفَ عامّاً غيرك يُذكَّر — أدخلها من صفحة البروتوكول");
    const ids = targets.map((u) => u.id);
    const [{ n: linked }] = (await tx.execute(sql`SELECT count(*)::int AS n FROM staff_telegram_links l
      JOIN staff_notification_prefs p ON p.user_id = l.user_id AND p.event_type = 'physio_plan_pending'
      WHERE l.user_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)).rows as { n: number }[];
    const base = { gaps: g.gaps, to: targets.map((u) => u.name), viaTelegram: Number(linked) > 0 };
    const recent = g.reminder.lastAt && Date.now() - new Date(g.reminder.lastAt).getTime() < SETTINGS_REMINDER_QUIET_MS;
    if (recent) return { sent: false, ...base };
    const [pr] = await tx.select({ titleAr: physioProtocols.titleAr }).from(physioProtocols).where(eq(physioProtocols.id, protocolId));
    const queued = await enqueueStaffEvent(tx, {
      event: "physio_plan_pending", targetUserIds: ids, excludeUserId: actor.userId,
      text: settingsReminderText({ protocolTitle: pr?.titleAr ?? "", gaps: g.gaps, byName: actor.name, patient: await patientLabel(tx, plan.patientId, plan.branchId) }),
      linkPath: `/physio/protocols/${protocolId}`,
    });
    if (!queued) throw new PlanError(503, "تعذّر إرسال التذكير الآن — حاول ثانيةً بعد قليل");
    await logAudit({ entityType: "physio_protocol", entityId: protocolId, action: SETTINGS_REMINDER_ACTION, userId: actor.userId, userName: actor.name,
      newValues: { planId: plan.id, to: base.to, gaps: g.gaps.map((x) => ({ code: x.code, missing: x.missing.map((m) => m.ar) })) },
      notes: `تذكيرُ المشرف بإعدادات الجهاز — من خطّة #${plan.id}`, ipAddress: meta.ip ?? null, userAgent: meta.userAgent ?? null, tx });
    return { sent: true, ...base };
  });
}

/**
 * **مقاييسُ الخطّة لمريضها** (§4.do — «تغيير المقاييس … مرونة عالية جداً»): تُستبدل كاملةً وتصير للخطّة (`measuresOwn`)، أو تعود إلى مقاييس
 * بروتوكولها (`list` = null). وحالةُ الخطّة والمراجعةُ والتنبيهُ بقاعدة كلّ تعديل. والتقييماتُ السابقة لقطاتٌ بتعريف يومها فلا تتغيّر.
 */
export async function setPlanMeasures(id: number, list: MeasureDef[] | null, nextStatus: NextStatus, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا تُعدَّل");
    if (list === null && !before.protocolId) throw new PlanError(409, "خطّةٌ بلا بروتوكول — لا مقاييسَ تعود إليها");
    const old = await effectiveMeasures(before, tx);
    await tx.delete(physioPlanMeasures).where(eq(physioPlanMeasures.planId, id));
    if (list?.length) {
      await tx.insert(physioPlanMeasures).values(list.map((m, i) => ({
        planId: id, code: m.code, nameAr: m.nameAr, nameEn: m.nameEn, unitAr: m.unitAr, unitEn: m.unitEn,
        minValue: String(m.min), maxValue: String(m.max), higherIsBetter: m.higherIsBetter, displayOrder: i,
      })));
    }
    const r = await applyPlanEdit(tx, before, { measuresOwn: list !== null }, nextStatus, actor);
    await notifyPlanEdit(tx, r, actor);
    return { before: { measuresOwn: before.measuresOwn, measures: old }, after: r.after, backToReview: r.backToReview };
  });
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
    precautions: protocolPrecautionsText(pr, "ar"), precautionsEn: protocolPrecautionsText(pr, "en"),
    sessionsPerWeek: pr.sessionsPerWeek, durationWeeks: pr.durationWeeks, sessionMinutes: pr.sessionMinutes,
    totalSessions: pr.totalSessions,
    //  §4.do — متى امتلأت من البروتوكول: تعديلُ المشرف البروتوكولَ بعده يُذكر بجانب الفروق. والمقاييسُ تتبع البروتوكولَ الجديد.
    protocolCopiedAt: new Date(), measuresOwn: false,
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

const planDeviceRow = (planId: number, l: PlanDeviceInput, i: number) => ({
  planId, deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn,
  note: l.note, noteEn: l.noteEn, centreUse: l.centreUse, everyDays: l.everyDays ?? null, times: l.times ?? null, displayOrder: i,
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
/** **أخصائيٌّ يحذف خطّةَ زميله أو يغيّر نوعَها** (§4.eh) — فيُنبَّه كاتبُها كما يُنبَّه بفعل المشرف. */
const colleagueActsOnOthers = (plan: PhysioPlan, actor: Actor): boolean =>
  !actor.isApprover && plan.createdBy != null && plan.createdBy !== actor.userId;

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
/** والعكس: عدّلها غيرُ المشرف وهي تُنفَّذ ⟵ تنتظر نظرَه (§4.do). */
const AWAITING_REVIEW = { reviewStatus: "awaiting", reviewedBy: null, reviewedByName: null, reviewedAt: null } as const;

type NextStatus = (current: PlanStatus, protocolStatus: string | null) => PlanStatus;

/**
 * **حالةُ الخطّة بعد أيّ تعديل** — نصوصاً وأجهزةً ومراحلَ وتمارينَ ومقاييس، قاعدةٌ واحدة: **المعتمَدةُ تبقى تُنفَّذ بيد أيّ كاتب** (§4.do —
 * «لا تحتاج اعتمادَ سليم»)؛ بيد المشرف في خطّة غيره ⟵ «راجعها المشرف» ويُنبَّه كاتبُها، وبيد الأخصائيّ ⟵ «بانتظار مراجعة المشرف» ويُنبَّه
 * المشرف باسم مَن عدّل. والتنبيهاتُ بعد كتابة التوابع (`notifyPlanEdit`) فتقول ما تختلف به الخطّةُ بعد التعديل.
 */
async function applyPlanEdit(tx: any, before: PhysioPlan, fields: Record<string, unknown>, nextStatus: NextStatus, actor: Actor) {
  const status = nextStatus(before.status as PlanStatus, await protocolStatusOf(tx, before.protocolId));
  const keptActive = before.status === "approved" && status === "approved";
  const bySupervisor = keptActive && supervisorActsOnOthers(before, actor);
  const backToReview = keptActive && !actor.isApprover;
  const [after] = await tx.update(physioPlans).set({
    ...fields, status, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
    ...(bySupervisor ? reviewedBy(actor) : {}),
    ...(backToReview ? AWAITING_REVIEW : {}),
  }).where(eq(physioPlans.id, before.id)).returning();
  //  `demoted` باقٍ في الردّ لشاشاتٍ أقدم — لا تعود خطّةٌ إلى الاعتماد بتعديلٍ بعد اليوم (§4.do).
  return { after: after as PhysioPlan, demoted: false, backToReview, bySupervisor };
}

async function notifyPlanEdit(tx: any, r: { after: PhysioPlan; backToReview: boolean; bySupervisor: boolean }, actor: Actor) {
  if (r.backToReview) {
    await notifyPending(tx, r.after, actor, "عُدّلت خطّةٌ تُنفَّذ — للاطّلاع والمراجعة", "✏️",
      [`عدّلها ${actor.name ?? "—"}`, await diffLineOf(tx, r.after)]);
  }
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

async function notifyPending(tx: any, plan: PhysioPlan, actor: Actor, prefix = "خطّة علاج طبيعي تنتظر الاعتماد", icon = "📋", extra: (string | null)[] = [],
  linkPath = `/physio/plans/${plan.id}`) {
  const who = await patientLabel(tx, plan.patientId, plan.branchId);
  await enqueueStaffEvent(tx, {
    event: "physio_plan_pending", excludeUserId: actor.userId,
    text: [`${icon} ${prefix}: ${who}`, `${plan.titleAr}${plan.createdByName ? ` — كتبها ${plan.createdByName}` : ""}`, ...extra]
      .filter(Boolean).join("\n"),
    linkPath,
  });
}

/** سطرُ الفروق في التنبيه — «تختلف عن البروتوكول في …» أو «مطابقةٌ…»؛ وخطّةٌ بلا بروتوكول ⟵ «بلا بروتوكول». */
async function diffLineOf(ex: any, plan: PhysioPlan): Promise<string> {
  if (!plan.protocolId) return "خطّةٌ بلا بروتوكول";
  const d = await planDiffFor(plan, ex);
  return d ? diffSummaryLine(d.diff) : "خطّةٌ بلا بروتوكول";
}

/**
 * **«بدء العلاج»** (§4.cz، و§4.do) — كاتبُ الخطّة يبدؤها بنفسه من المسوّدة أو المُعادة أو المنتظِرة، **على أيّ بروتوكولٍ أو بلا بروتوكول**
 * (قرارُ المالك ٢٠٢٦-١٠-١١: «لا تحتاج اعتمادَ سليم ليبدأ، وإنّما اطّلاعَه»). فتصير معتمَدةً تُنفَّذ في الحال، و«بانتظار مراجعة المشرف»؛
 * ويُنبَّه المشرفُ والمسؤول باسم المريض وكاتبها وما تختلف به عن البروتوكول، والمنفّذون المسنَدون. وإن بدأها مشرفٌ فهي مراجَعةٌ أصلاً.
 */
export async function activatePlan(id: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!canSelfActivate(before.status)) throw new PlanError(409, ALREADY_STARTED);
    const now = new Date();
    const [after] = await tx.update(physioPlans).set({
      status: "approved", submittedAt: now, decidedBy: actor.userId, decidedByName: actor.name, decidedAt: now, returnNote: null,
      ...(actor.isApprover ? reviewedBy(actor) : AWAITING_REVIEW),
      updatedBy: actor.userId, updatedByName: actor.name, updatedAt: now,
    }).where(eq(physioPlans.id, id)).returning();
    if (!actor.isApprover) {
      await notifyPending(tx, after, actor, "خطّةٌ جديدة بدأت — للاطّلاع والمراجعة", "🆕", [await diffLineOf(tx, after)]);
    }
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

/** **حذفُ الخطّة** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — لكاتبها: الأخصائيّ والمشرف العام والمسؤول (§4.eh)، وبأيّ حالة. أجهزتُها ومنفّذوها يتبعونها،
 *  والصورةُ الكاملة تُعاد لسطر التدقيق فلا يضيع ما حُذف. وحذفُ الأخصائيّ خطّةً بدأ علاجُها يصل المشرفَ للاطّلاع. */
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
    const patientPath = `/patients/${plan.patientId}`;
    if (supervisorActsOnOthers(plan, actor)) await notifyAuthor(tx, plan, actor, "🗑️ حذف المشرفُ خطّتك", patientPath);
    if (colleagueActsOnOthers(plan, actor)) await notifyAuthor(tx, plan, actor, "🗑️ حذف زميلٌ خطّتك", patientPath);
    //  §4.eh — خطّةٌ تُنفَّذ حذفها غيرُ المشرف: يعلم المشرفُ والمسؤول (والحارسان في المسار: لا جلساتَ ولا تقييمات).
    if (plan.status === "approved" && !actor.isApprover) {
      await notifyPending(tx, plan, actor, "حُذفت خطّةٌ بدأ علاجُها — للاطّلاع", "🗑️", [`حذفها ${actor.name ?? "—"}`], patientPath);
    }
    return { ...plan, devices: lines, assignees, phases };
  });
}

/**
 * **تغييرُ نوع الخطّة** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — لكاتبها: الأخصائيّ والمشرف العام والمسؤول (§4.eh): الخطّةُ نفسُها تمتلئ من بروتوكولٍ آخر
 * (العنوانُ والأهدافُ والتمارينُ والموانعُ والجرعةُ والأجهزة) — لا تعديلُ مواصفاتها. ويبقى المريضُ والفرعُ والمنفّذون
 * و«ملاحظات الأخصائيّ لهذا المريض» والحالة؛ والمنفّذون يُنبَّهون إن كانت معتمَدة. **وبيد الأخصائيّ في خطّةٍ تُنفَّذ** تبقى تُنفَّذ
 * و«بانتظار مراجعة المشرف» ويُنبَّه المشرفُ بالنوعين — قاعدةُ كلّ تعديلٍ بيده (§4.do).
 */
export async function changePlanProtocol(id: number, protocolId: number, actor: Actor) {
  return db.transaction(async (tx) => {
    const before = await lockPlan(tx, id);
    if (!isPlanEditable(before.status)) throw new PlanError(409, "الخطّةُ منتهية — لا يتغيّر نوعُها");
    if (before.protocolId === protocolId) throw new PlanError(409, "هذا هو نوعُ الخطّة الحاليّ");
    const { base, lines } = await protocolFill(tx, protocolId, before.branchId);
    const [after] = await tx.update(physioPlans).set({ ...base, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
      //  استبدالُ المشرف نوعَ خطّةٍ تُنفَّذ قرارُه — فهي مراجَعة (§4.cz)؛ وبيد الأخصائيّ تنتظر مراجعتَه (§4.eh).
      ...(before.status === "approved" ? (actor.isApprover ? reviewedBy(actor) : AWAITING_REVIEW) : {}) })
      .where(eq(physioPlans.id, id)).returning();
    await tx.delete(physioPlanDevices).where(eq(physioPlanDevices.planId, id));
    //  كخطّةٍ جديدة (§4.dd): الأساسيُّ وحده، والمساعدُ يؤشّره الأخصائيّ؛ ومراحلُ البروتوكول الجديد بدلَ القديمة.
    const core = lines.filter((l: PlanDeviceInput) => l.centreUse === "core");
    if (core.length) {
      await tx.insert(physioPlanDevices).values(core.map((l: PlanDeviceInput, i: number) => planDeviceRow(id, l, i)));
    }
    await tx.delete(physioPlanPhases).where(eq(physioPlanPhases.planId, id));
    await copyProtocolPhases(tx, protocolId, id);
    //  §4.do — مقاييسُ الخطّة تتبع البروتوكولَ الجديد (`measuresOwn` = false في `protocolFill`).
    await tx.delete(physioPlanMeasures).where(eq(physioPlanMeasures.planId, id));
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
    if (after.status === "approved" && !actor.isApprover) {
      await notifyPending(tx, after, actor, "تغيّر نوعُ خطّةٍ تُنفَّذ — للاطّلاع والمراجعة", "🔄",
        [`غيّرها ${actor.name ?? "—"}`, `${before.titleAr} ⟵ ${after.titleAr}`]);
    }
    if (supervisorActsOnOthers(before, actor)) await notifyAuthor(tx, after, actor, `🔄 استبدل المشرفُ نوعَ خطّتك (كانت «${before.titleAr}»)`);
    if (colleagueActsOnOthers(before, actor)) await notifyAuthor(tx, after, actor, `🔄 غيّر زميلٌ نوعَ خطّتك (كانت «${before.titleAr}»)`);
    return { before, after };
  });
}
