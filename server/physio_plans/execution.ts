// **تنفيذُ خطّة العلاج الطبيعي** (ترحيل ١١١، §4.cn — المرحلةُ الرابعة) — طبقةُ البيانات. القواعدُ في `shared/physio_plans.ts`.
//
// «إنهاء الجلسة» في معاملةٍ واحدة بقفل الخطّة: جلسةٌ وبنودُها، وزيارةُ جلسة العلاج الطبيعي (تُخصم من المدفوعة)، وعدّاداتُ الأجهزة
// إن كان الفرعُ قد بلغ يومَ القفل، وتنبيهُ «ملاحظة للأخصائيّ». والإلغاءُ (للمسؤول والمشرف) يعكسها كلَّها: الزيارةُ تُحذف حذفاً ناعماً
// والعدّادُ ينقص — والجلسةُ تبقى تاريخاً بسببها.
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, dailySessions, devices, patientCases, patients, physioExercises, physioPlanDevices, physioPlanPhaseExercises, physioPlanPhases,
  physioPlanSessionExercises, physioPlanSessionItems, physioPlanSessions, physioPlans, sessionCounts, visits,
} from "@shared/schema";
import {
  countsFromExecution, exerciseItemsError, executionItemsError, phaseForSession, sessionAdjuncts, sessionTreatmentType,
  type ExecutionItemInput, type ExerciseItemInput,
} from "@shared/physio_plans";
import { ADJUNCT_OFF_TURN_NOTE, DRY_NEEDLING_DEVICE_CODE } from "@shared/physio_protocols";
import { storage } from "../storage";
import { isScheduled, scheduleOffNote, scheduleState } from "@shared/physio_device_settings";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { PlanError, scheduledDoneDates, type Actor } from "./store";

/** **جلساتُ اليوم** — الخططُ المعتمَدة في الفروع المعطاة، المسنَدةُ إلى السائل أوّلاً، وهل سُجّلت جلستُها اليوم وآخرُ جلسة. */
export async function todayList(p: { branchIds: number[] | null; userId: number | null; today: string }) {
  const conds: any[] = [eq(physioPlans.status, "approved"), isNull(patients.deletedAt)];
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlans.branchId, p.branchIds) : sql`false`);
  const rows = await db.select({
    planId: physioPlans.id, titleAr: physioPlans.titleAr, branchId: physioPlans.branchId, branchName: branches.name,
    patientId: patients.id, patientName: patients.name, patientCode: patients.patientCode,
    assignedToMe: sql<boolean>`EXISTS (SELECT 1 FROM physio_plan_assignees a WHERE a.plan_id = "physio_plans"."id" AND a.user_id = ${p.userId ?? 0})`,
    assignees: sql<string[]>`COALESCE((SELECT array_agg(u.display_name ORDER BY u.display_name) FROM physio_plan_assignees a
      JOIN system_users u ON u.id = a.user_id WHERE a.plan_id = "physio_plans"."id"), '{}')`,
    doneToday: sql<boolean>`EXISTS (SELECT 1 FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL AND s.session_date = ${p.today})`,
    lastSession: sql<string | null>`(SELECT max(s.session_date)::text FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL)`,
    sessionCount: sql<number>`(SELECT count(*)::int FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL)`,
  }).from(physioPlans)
    .innerJoin(patients, eq(patients.id, physioPlans.patientId))
    .leftJoin(branches, eq(branches.id, physioPlans.branchId))
    .where(and(...conds))
    .orderBy(asc(patients.name)).limit(500);
  return rows.sort((a, b) => Number(b.assignedToMe) - Number(a.assignedToMe));
}

/** جلساتُ خطّةٍ — أحدثُها أوّلاً، ببنودها. */
export async function planSessions(planId: number) {
  const ss = await db.select().from(physioPlanSessions).where(eq(physioPlanSessions.planId, planId))
    .orderBy(desc(physioPlanSessions.sessionDate), desc(physioPlanSessions.id));
  if (!ss.length) return [];
  const items = await db.select({
    sessionId: physioPlanSessionItems.sessionId, deviceId: physioPlanSessionItems.deviceId, plannedMinutes: physioPlanSessionItems.plannedMinutes,
    done: physioPlanSessionItems.done, minutes: physioPlanSessionItems.minutes, note: physioPlanSessionItems.note,
    offTurn: physioPlanSessionItems.offTurn, nameAr: devices.nameAr, nameEn: devices.nameEn,
  }).from(physioPlanSessionItems).innerJoin(devices, eq(devices.id, physioPlanSessionItems.deviceId))
    .where(inArray(physioPlanSessionItems.sessionId, ss.map((s) => s.id))).orderBy(asc(devices.displayOrder));
  const exercises = await sessionExercisesOf(db, ss.map((s) => s.id));
  return ss.map((s) => ({ ...s, items: items.filter((i) => i.sessionId === s.id), exercises: exercises.filter((x: any) => x.sessionId === s.id) }));
}

/** تمارينُ الجلسات بأسمائها (§4.dr) — بترتيبها في المرحلة. */
async function sessionExercisesOf(ex: any, sessionIds: number[]) {
  if (!sessionIds.length) return [];
  return ex.select({
    sessionId: physioPlanSessionExercises.sessionId, exerciseId: physioPlanSessionExercises.exerciseId, done: physioPlanSessionExercises.done,
    note: physioPlanSessionExercises.note, plannedSets: physioPlanSessionExercises.plannedSets, plannedReps: physioPlanSessionExercises.plannedReps,
    plannedHoldSeconds: physioPlanSessionExercises.plannedHoldSeconds, nameAr: physioExercises.nameAr, nameEn: physioExercises.nameEn,
  }).from(physioPlanSessionExercises).innerJoin(physioExercises, eq(physioExercises.id, physioPlanSessionExercises.exerciseId))
    .where(inArray(physioPlanSessionExercises.sessionId, sessionIds))
    .orderBy(asc(physioPlanSessionExercises.displayOrder), asc(physioPlanSessionExercises.id));
}

/** هل لهذا الملفّ خطّةٌ معتمَدة؟ — يقرؤه الاستقبالُ ليرى تنبيهَ «تسجيل زيارة جلسة علاج طبيعي». */
export async function hasApprovedPlan(patientId: number): Promise<boolean> {
  const [r] = await db.select({ id: physioPlans.id }).from(physioPlans)
    .where(and(eq(physioPlans.patientId, patientId), eq(physioPlans.status, "approved"))).limit(1);
  return Boolean(r);
}

/** **«إنهاء الجلسة»** — كلُّ شيءٍ في معاملةٍ واحدة. */
export async function executeSession(p: {
  planId: number; items: ExecutionItemInput[]; noteToSpecialist: string | null; sessionDate: string; shift: "morning" | "evening";
  actor: Actor; canDryNeedle: boolean; visitCustomDate: string | null;
  /**
   * §4.dr — **تمارينُ المرحلة بأعيانها**، نُفّذ أم لا وسببُه، والمرحلةُ التي اختارها المعالج (وإلّا مرحلةُ رقم الجلسة). وغيابُها (صفحةٌ أقدم لم تتحدّث)
   * لا يُسجّل تمارين — ولا يُفشل الجلسة.
   */
  exercises?: ExerciseItemInput[] | null; phasePosition?: number | null;
}) {
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(physioPlans).where(eq(physioPlans.id, p.planId)).for("update");
    if (!plan) throw new PlanError(404, "الخطّة غير موجودة");
    if (plan.status !== "approved") throw new PlanError(409, "تُنفَّذ الخطّةُ المعتمَدة وحدها");
    const planLines = await tx.select({ deviceId: physioPlanDevices.deviceId, minutes: physioPlanDevices.minutes, code: devices.code,
      centreUse: physioPlanDevices.centreUse, displayOrder: physioPlanDevices.displayOrder,
      everyDays: physioPlanDevices.everyDays, times: physioPlanDevices.times })
      .from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId))
      .where(eq(physioPlanDevices.planId, plan.id));
    const needle = planLines.find((l) => l.code === DRY_NEEDLING_DEVICE_CODE);
    //  **المساعدُ يتناوب** (ترحيل ١٢٢، §4.cx): دورُه بعدد جلسات الخطّة قبل هذه — تحت قفل الخطّة، فجلستان متزامنتان لا تأخذان الدورَ نفسَه.
    const [{ n: sessionsSoFar }] = await tx.select({ n: sql<number>`count(*)::int` }).from(physioPlanSessions)
      .where(and(eq(physioPlanSessions.planId, plan.id), isNull(physioPlanSessions.cancelledAt)));
    const { offTurnDeviceIds: adjunctOff } = sessionAdjuncts(planLines.map((l) => ({ ...l, deviceId: Number(l.deviceId) })), Number(sessionsSoFar));
    //  §4.dn — **البندُ الدوريّ** (الموجاتُ الصادمة أسبوعياً): يُطلب حين يحين موعدُه بتاريخ هذه الجلسة، وإلّا فتركُه بلا سبب — كالمساعد الذي ليس دورَه.
    const scheduled = planLines.filter((l) => isScheduled(l));
    const history = await scheduledDoneDates(tx, plan.id, scheduled.map((l) => Number(l.deviceId)), p.sessionDate);
    const offNotes = new Map<number, string>();
    for (const l of scheduled) {
      const st = scheduleState(l, history[Number(l.deviceId)] ?? [], p.sessionDate);
      if (!st.due) offNotes.set(Number(l.deviceId), scheduleOffNote(st));
    }
    const offTurnDeviceIds = [...adjunctOff, ...Array.from(offNotes.keys())];
    const offTurn = new Set(offTurnDeviceIds);
    const err = executionItemsError({
      planDeviceIds: planLines.map((l) => Number(l.deviceId)), items: p.items,
      needleDeviceId: needle ? Number(needle.deviceId) : null, canDryNeedle: p.canDryNeedle, offTurnDeviceIds,
    });
    if (err) throw new PlanError(400, err);
    const isOffTurn = (i: ExecutionItemInput) => !i.done && offTurn.has(i.deviceId);

    //  §4.dr — **تمارينُ المرحلة**: مرحلةُ رقم هذه الجلسة بنطاقات الخطّة، أو ما اختاره المعالج منها؛ والتمارينُ تمارينُها بأعيانها.
    let phasePosition: number | null = null;
    let phaseLinks: { exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; nameAr: string;
      cardSets: number | null; cardReps: number | null; cardHold: number | null }[] = [];
    if (p.exercises) {
      const phases = await tx.select({ id: physioPlanPhases.id, position: physioPlanPhases.position, sessionFrom: physioPlanPhases.sessionFrom,
        sessionTo: physioPlanPhases.sessionTo }).from(physioPlanPhases).where(eq(physioPlanPhases.planId, plan.id));
      if (p.phasePosition != null && !phases.some((ph) => ph.position === p.phasePosition)) throw new PlanError(400, "مرحلةٌ ليست في الخطّة");
      phasePosition = p.phasePosition ?? phaseForSession(phases, Number(sessionsSoFar) + 1);
      const phase = phases.find((ph) => ph.position === phasePosition);
      phaseLinks = phase ? await tx.select({ exerciseId: physioPlanPhaseExercises.exerciseId, sets: physioPlanPhaseExercises.sets,
        reps: physioPlanPhaseExercises.reps, holdSeconds: physioPlanPhaseExercises.holdSeconds, nameAr: physioExercises.nameAr,
        cardSets: physioExercises.sets, cardReps: physioExercises.reps, cardHold: physioExercises.holdSeconds })
        .from(physioPlanPhaseExercises).innerJoin(physioExercises, eq(physioExercises.id, physioPlanPhaseExercises.exerciseId))
        .where(eq(physioPlanPhaseExercises.phaseId, phase.id))
        .orderBy(asc(physioPlanPhaseExercises.position), asc(physioPlanPhaseExercises.id)) : [];
      const exErr = exerciseItemsError({ phaseExerciseIds: phaseLinks.map((x) => Number(x.exerciseId)), items: p.exercises });
      if (exErr) throw new PlanError(400, exErr);
    }
    const exerciseName = (id: number) => phaseLinks.find((x) => Number(x.exerciseId) === id)?.nameAr ?? `#${id}`;
    const skippedExercises = (p.exercises ?? []).filter((x) => !x.done).map((x) => `${exerciseName(x.exerciseId)} (${x.note})`).join("، ");

    const doneCodes = p.items.filter((i) => i.done).map((i) => planLines.find((l) => Number(l.deviceId) === i.deviceId)!.code);
    const devNames = await tx.select({ id: devices.id, nameAr: devices.nameAr }).from(devices);
    const nameOf = (id: number) => devNames.find((d) => d.id === id)?.nameAr ?? `#${id}`;
    const doneText = p.items.filter((i) => i.done).map((i) => `${nameOf(i.deviceId)}${i.minutes ? ` ${i.minutes} د` : ""}`).join("، ");
    const skipped = p.items.filter((i) => !i.done && !isOffTurn(i)).map((i) => `${nameOf(i.deviceId)} (${i.note})`).join("، ");

    //  **زيارةُ جلسة العلاج الطبيعي** — كما يكتبها «تسجيل زيارة جلسة علاج طبيعي»: على قسم العلاج الطبيعي، وبنوع علاجٍ من قائمته.
    const [physioCase] = await tx.select({ id: patientCases.id }).from(patientCases)
      .where(and(eq(patientCases.patientId, plan.patientId), eq(patientCases.caseType, "physiotherapy"))).limit(1);
    const visit = await storage.createVisit({
      patientId: plan.patientId, branchId: plan.branchId, caseId: physioCase?.id ?? null,
      treatmentType: sessionTreatmentType(doneCodes),
      details: `جلسة من الخطة: ${plan.titleAr}`,
      notes: [doneText ? `نُفّذ: ${doneText}` : "", skipped ? `لم يُنفَّذ: ${skipped}` : "",
        skippedExercises ? `لم يُنفَّذ من التمارين: ${skippedExercises}` : ""].filter(Boolean).join(" — ") || null,
      shift: p.shift, createdBy: p.actor.userId, customDate: p.visitCustomDate,
    } as any, tx);

    const [branch] = await tx.select({ countsFrom: branches.physioCountsFrom }).from(branches).where(eq(branches.id, plan.branchId));
    const writeCounts = countsFromExecution(branch?.countsFrom as any, p.sessionDate);
    const [session] = await tx.insert(physioPlanSessions).values({
      planId: plan.id, patientId: plan.patientId, branchId: plan.branchId, sessionDate: p.sessionDate, shift: p.shift,
      executedBy: p.actor.userId, executedByName: p.actor.name, visitId: visit.id,
      noteToSpecialist: p.noteToSpecialist, countsWritten: writeCounts, phasePosition,
    }).returning();
    if (p.exercises?.length) {
      await tx.insert(physioPlanSessionExercises).values(p.exercises.map((x) => {
        const link = phaseLinks.find((l) => Number(l.exerciseId) === x.exerciseId);
        return { sessionId: session.id, exerciseId: x.exerciseId, done: x.done, note: x.note,
          //  الجرعةُ كما عُرضت: جرعةُ المرحلة وإلّا جرعةُ البطاقة (`mergeDose`).
          plannedSets: link?.sets ?? link?.cardSets ?? null, plannedReps: link?.reps ?? link?.cardReps ?? null,
          plannedHoldSeconds: link?.holdSeconds ?? link?.cardHold ?? null,
          displayOrder: phaseLinks.findIndex((l) => Number(l.exerciseId) === x.exerciseId) };
      }));
    }
    await tx.insert(physioPlanSessionItems).values(p.items.map((i) => ({
      sessionId: session.id, deviceId: i.deviceId, done: i.done, minutes: i.minutes,
      note: isOffTurn(i) ? ((i.note ?? "").trim() || offNotes.get(i.deviceId) || ADJUNCT_OFF_TURN_NOTE) : i.note, offTurn: isOffTurn(i),
      plannedMinutes: planLines.find((l) => Number(l.deviceId) === i.deviceId)?.minutes ?? null,
    })));

    //  **العدّاداتُ من التنفيذ** — من يوم القفل فصاعداً وحده: صفُّ الفرع واليوم والوردية، وكلُّ بندٍ نُفّذ يزيد جهازَه واحداً.
    if (writeCounts) {
      await bumpCounts(tx, plan.branchId, p.sessionDate, p.shift, p.items.filter((i) => i.done).map((i) => i.deviceId), +1, p.actor.userId);
    }

    if (p.noteToSpecialist && plan.createdBy) {
      const [pt] = await tx.select({ name: patients.name, code: patients.patientCode }).from(patients).where(eq(patients.id, plan.patientId));
      await enqueueStaffEvent(tx, {
        event: "physio_session_note", targetUserIds: [plan.createdBy], excludeUserId: p.actor.userId,
        text: `📝 ملاحظة من ${p.actor.name ?? "المعالج"} على جلسة ${pt?.name ?? ""}${pt?.code ? ` (${pt.code})` : ""}\n${plan.titleAr}\n${p.noteToSpecialist}`,
        linkPath: `/physio/plans/${plan.id}`,
      });
    }
    return { session, visit, writeCounts };
  });
}

/**
 * يزيد عدّادَ كلّ جهازٍ أو ينقصه — صفُّ اليوم يُنشأ إن غاب، والعدُّ لا ينزل تحت الصفر.
 * **بقفلٍ استشاريٍّ على (الفرع، اليوم، الوردية)** طوالَ المعاملة: جلستان لخطّتين مختلفتين في اللحظة نفسِها لا تُنشئان صفّين
 * ولا تضيع زيادةُ إحداهما — ولا اعتمادَ على قيدٍ فريد قد يغيب عن قاعدةٍ بُنيت بـ`db:push`.
 */
async function bumpCounts(tx: any, branchId: number, date: string, shift: string, deviceIds: number[], delta: 1 | -1, userId: number | null) {
  if (!deviceIds.length) return;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`physio_counts:${branchId}:${date}:${shift}`}))`);
  let [ds] = await tx.select({ id: dailySessions.id }).from(dailySessions)
    .where(and(eq(dailySessions.branchId, branchId), eq(dailySessions.sessionDate, date), eq(dailySessions.shift, shift)));
  if (!ds) {
    if (delta < 0) return;
    if (!userId) throw new PlanError(400, "حسابٌ بلا معرّف");
    [ds] = await tx.insert(dailySessions).values({ branchId, sessionDate: date, shift, createdBy: userId }).returning({ id: dailySessions.id });
  }
  for (const d of deviceIds) {
    const [row] = await tx.select({ id: sessionCounts.id }).from(sessionCounts)
      .where(and(eq(sessionCounts.dailySessionId, ds.id), eq(sessionCounts.deviceId, d)));
    if (row) {
      await tx.update(sessionCounts).set({ count: sql`GREATEST(${sessionCounts.count} + ${delta}, 0)` }).where(eq(sessionCounts.id, row.id));
    } else if (delta > 0) {
      await tx.insert(sessionCounts).values({ dailySessionId: ds.id, deviceId: d, count: 1 });
    }
  }
  await tx.update(dailySessions).set({ updatedAt: new Date() }).where(eq(dailySessions.id, ds.id));
}

/** **إلغاءُ جلسةٍ نُفّذت خطأً** — للمسؤول والمشرف: الزيارةُ تُحذف حذفاً ناعماً، والعدّادُ ينقص إن كُتب، والجلسةُ تبقى بسببها. */
export async function cancelSession(id: number, reason: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(physioPlanSessions).where(eq(physioPlanSessions.id, id)).for("update");
    if (!s) throw new PlanError(404, "الجلسة غير موجودة");
    if (s.cancelledAt) throw new PlanError(409, "الجلسةُ ملغاة من قبل");
    if (s.visitId) await tx.update(visits).set({ deletedAt: new Date() }).where(eq(visits.id, s.visitId));
    if (s.countsWritten) {
      const done = (await tx.select({ d: physioPlanSessionItems.deviceId }).from(physioPlanSessionItems)
        .where(and(eq(physioPlanSessionItems.sessionId, id), eq(physioPlanSessionItems.done, true)))).map((r) => Number(r.d));
      await bumpCounts(tx, s.branchId, String(s.sessionDate), s.shift, done, -1, actor.userId);
    }
    const [after] = await tx.update(physioPlanSessions).set({
      cancelledAt: new Date(), cancelledBy: actor.userId, cancelledByName: actor.name, cancelReason: reason,
    }).where(eq(physioPlanSessions.id, id)).returning();
    return { before: s, after };
  });
}

/**
 * **ما اختلف عن الخطّة** — جلساتُ آخر `days` يوماً (غيرُ الملغاة) فيها بندٌ لم يُنفَّذ، أو دقائقُ غيرُ دقائق الخطّة، أو «ملاحظة للأخصائيّ».
 */
export async function deviations(p: { branchIds: number[] | null; sinceDate: string }) {
  const conds: any[] = [isNull(physioPlanSessions.cancelledAt), gte(physioPlanSessions.sessionDate, p.sinceDate), isNull(patients.deletedAt),
    sql`(${physioPlanSessions.noteToSpecialist} IS NOT NULL OR EXISTS (SELECT 1 FROM physio_plan_session_items i WHERE i.session_id = ${physioPlanSessions.id}
         AND ((NOT i.done AND NOT i.off_turn) OR (i.planned_minutes IS NOT NULL AND i.minutes IS NOT NULL AND i.minutes <> i.planned_minutes)))
         OR EXISTS (SELECT 1 FROM physio_plan_session_exercises e WHERE e.session_id = ${physioPlanSessions.id} AND NOT e.done))`];
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlanSessions.branchId, p.branchIds) : sql`false`);
  const ss = await db.select({
    id: physioPlanSessions.id, planId: physioPlanSessions.planId, sessionDate: physioPlanSessions.sessionDate,
    executedByName: physioPlanSessions.executedByName, noteToSpecialist: physioPlanSessions.noteToSpecialist,
    patientName: patients.name, patientCode: patients.patientCode, titleAr: physioPlans.titleAr, branchName: branches.name,
  }).from(physioPlanSessions)
    .innerJoin(patients, eq(patients.id, physioPlanSessions.patientId))
    .innerJoin(physioPlans, eq(physioPlans.id, physioPlanSessions.planId))
    .leftJoin(branches, eq(branches.id, physioPlanSessions.branchId))
    .where(and(...conds)).orderBy(desc(physioPlanSessions.sessionDate), desc(physioPlanSessions.id)).limit(300);
  if (!ss.length) return [];
  const items = await db.select({
    sessionId: physioPlanSessionItems.sessionId, done: physioPlanSessionItems.done, minutes: physioPlanSessionItems.minutes,
    plannedMinutes: physioPlanSessionItems.plannedMinutes, note: physioPlanSessionItems.note, offTurn: physioPlanSessionItems.offTurn,
    nameAr: devices.nameAr,
  }).from(physioPlanSessionItems).innerJoin(devices, eq(devices.id, physioPlanSessionItems.deviceId))
    .where(inArray(physioPlanSessionItems.sessionId, ss.map((s) => s.id)));
  //  §4.dr — والتمرينُ الذي لم يُنفَّذ اختلافٌ كالجهاز.
  const exercises = (await sessionExercisesOf(db, ss.map((s) => s.id))).filter((x: any) => !x.done);
  return ss.map((s) => ({
    ...s,
    differences: [
      ...items.filter((i) => i.sessionId === s.id
        && ((!i.done && !i.offTurn) || (i.plannedMinutes != null && i.minutes != null && i.minutes !== i.plannedMinutes))),
      ...exercises.filter((x: any) => x.sessionId === s.id).map((x: any) => ({ done: false, minutes: null, plannedMinutes: null, note: x.note,
        nameAr: x.nameAr, kind: "exercise" as const })),
    ],
  }));
}

/** عدّاتُ التنفيذ لفرعٍ ويومٍ ووردية — بجانب اليدويّ في «إدخال الجلسات» أيّامَ العمل معاً. */
export async function executionCounts(branchId: number, date: string, shift: string): Promise<Map<number, number>> {
  const rows = await db.select({ deviceId: physioPlanSessionItems.deviceId, n: sql<number>`count(*)::int` })
    .from(physioPlanSessionItems)
    .innerJoin(physioPlanSessions, eq(physioPlanSessions.id, physioPlanSessionItems.sessionId))
    .where(and(eq(physioPlanSessions.branchId, branchId), eq(physioPlanSessions.sessionDate, date), eq(physioPlanSessions.shift, shift),
      isNull(physioPlanSessions.cancelledAt), eq(physioPlanSessionItems.done, true)))
    .groupBy(physioPlanSessionItems.deviceId);
  return new Map(rows.map((r) => [Number(r.deviceId), Number(r.n)]));
}

/** للخطّة جلساتٌ منفّذة؟ — فلا تُحذف (تُوقَف). */
export async function planHasSessions(planId: number): Promise<boolean> {
  const [r] = await db.select({ id: physioPlanSessions.id }).from(physioPlanSessions).where(eq(physioPlanSessions.planId, planId)).limit(1);
  return Boolean(r);
}

