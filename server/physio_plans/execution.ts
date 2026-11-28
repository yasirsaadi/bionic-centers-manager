// **تنفيذُ خطّة العلاج الطبيعي** (ترحيل ١١١، §4.cn — المرحلةُ الرابعة) — طبقةُ البيانات. القواعدُ في `shared/physio_plans.ts`.
//
// «إنهاء الجلسة» في معاملةٍ واحدة بقفل الخطّة: جلسةٌ وبنودُها، وزيارةُ جلسة العلاج الطبيعي (تُخصم من المدفوعة)، وعدّاداتُ الأجهزة
// إن كان الفرعُ قد بلغ يومَ القفل، وتنبيهُ «ملاحظة للأخصائيّ». والإلغاءُ (للمسؤول والمشرف) يعكسها كلَّها: الزيارةُ تُحذف حذفاً ناعماً
// والعدّادُ ينقص — والجلسةُ تبقى تاريخاً بسببها.
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, dailySessions, devices, patientCases, patients, payments, physioExercises, physioPlanDevices, physioPlanPhaseExercises, physioPlanPhases,
  physioPlanSessionExercises, physioPlanSessionItems, physioPlanSessions, physioPlans, sessionCounts, visits,
} from "@shared/schema";
import {
  countsFromExecution, EXERCISE_DEVICE_CODE, exerciseDeviceError, exerciseItemsError, executionItemsError, phaseForSession, PHASE_MOVED, sessionAdjuncts, sessionTreatmentType,
  type ExecutionItemInput, type ExerciseItemInput,
} from "@shared/physio_plans";
import { ADJUNCT_OFF_TURN_NOTE, DRY_NEEDLING_DEVICE_CODE } from "@shared/physio_protocols";
import { resolvePurchasedSessions } from "@shared/pricing";
import { storage } from "../storage";
import { isScheduled, scheduleOffNote, scheduleState } from "@shared/physio_device_settings";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { PlanError, scheduledDoneDates, type Actor } from "./store";
import { AI_BRAND } from "@shared/ai_brand";
import { checkVisitDate } from "@shared/visit_date";
import { partOfDeviceCode, PART_LABELS, PLAN_PARTS, type PlanPart } from "@shared/physio_plan_assignment";
import { partsOfPlanTx, verdictsFor } from "./assignment";

/** **جلساتُ اليوم** — الخططُ المعتمَدة في الفروع المعطاة، المسنَدةُ إلى السائل أوّلاً، وهل سُجّلت جلستُها اليوم وآخرُ جلسة. */
export async function todayList(p: { branchIds: number[] | null; userId: number | null; today: string; approver?: boolean }) {
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
    origin: physioPlans.origin, opusParts: physioPlans.opusParts, opusVersion: physioPlans.opusVersion,
  }).from(physioPlans)
    .innerJoin(patients, eq(patients.id, physioPlans.patientId))
    .leftJoin(branches, eq(branches.id, physioPlans.branchId))
    .where(and(...conds))
    .orderBy(asc(patients.name)).limit(500);
  const out = await decorateOpusToday(rows, { userId: p.userId, approver: p.approver === true, today: p.today });
  return out.sort((a, b) => Number(b.assignedToMe) - Number(a.assignedToMe));
}

/**
 * §4.hc — **صفوفُ خطط Bionic AI في «جلسات اليوم»**: أجزاؤها ومُسنَدوها وما سُجّل اليوم، وما أُسند إليّ (أو أنا بديلٌ فيه)، و«بانتظار الإسناد»؛
 * وخطّةٌ ليس لي فيها جزءٌ للقراءة وحدها («خطط زملائك»). واليدويةُ كما كانت حرفاً.
 */
async function decorateOpusToday<T extends { planId: number; branchId: number; origin: string | null; opusParts: string[] | null; assignedToMe: boolean; doneToday: boolean }>(
  list: T[], v: { userId: number | null; approver: boolean; today: string }) {
  const opus = list.filter((r) => r.origin === "opus");
  if (!opus.length) return list.map((r) => ({ ...r, readOnly: false }));
  const ver = await verdictsFor(db, opus.map((r) => ({ id: r.planId, branchId: r.branchId, status: "approved", origin: "opus", opusParts: r.opusParts })),
    { userId: v.userId, approver: v.approver }, v.today);
  const ids = opus.map((r) => r.planId);
  const todays = rowsOf(await db.execute(sql`SELECT s.id, s.plan_id, s.parts_required, sp.part, sp.recorded_by_name, sp.recorded_at FROM physio_plan_sessions s
      LEFT JOIN physio_plan_session_parts sp ON sp.session_id = s.id
     WHERE s.plan_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND s.cancelled_at IS NULL AND s.session_date = ${v.today}::date ORDER BY sp.recorded_at`));
  return list.map((r) => {
    if (r.origin !== "opus") return { ...r, readOnly: false };
    const x = ver.get(r.planId)!;
    const mine = todays.filter((t) => Number(t.plan_id) === r.planId);
    const recordedToday = (part: PlanPart) => { const t = mine.find((m) => m.part === part); return t ? { byName: t.recorded_by_name ?? null, at: t.recorded_at ? new Date(t.recorded_at).toISOString() : null } : null; };
    const parts = x.plan.parts.map((part) => { const a = x.assignments.get(part);
      return { part, required: true, holderName: a?.eligible ? a.user?.name ?? null : null, holderEligible: Boolean(a?.eligible), recordedToday: recordedToday(part) }; });
    const myParts = x.plan.parts.filter((part) => x.verdicts[part]?.ok);
    const heldByMe = x.plan.parts.filter((part) => { const a = x.assignments.get(part); const vv = x.verdicts[part];
      return (a?.eligible && a.userId === v.userId) || (vv?.ok && vv.via === "substitute"); });
    const sessionsToday = Array.from(new Set(mine.map((m) => Number(m.id))));
    const openSession = sessionsToday.map((id) => ({ id, req: mine.find((m) => Number(m.id) === id)?.parts_required ?? null,
      rec: mine.filter((m) => Number(m.id) === id && m.part).map((m) => String(m.part)) }))
      .map((o) => ({ id: o.id, missing: missingPartsOf(o.req, x.plan.parts, o.rec) })).find((o) => o.missing.length) ?? null;
    const target = v.approver ? x.plan.parts : heldByMe;
    const substituteFor = x.subs.filter((s) => s.substituteId === v.userId && s.status === "approved" && s.effectiveFrom && s.effectiveFrom <= v.today && v.today <= s.dateTo)
      .map((s) => ({ part: s.part, assigneeName: s.assigneeName, dateTo: s.dateTo }));
    return { ...r,
      parts, myParts, awaitingAssignment: x.plan.parts.some((part) => !x.assignments.get(part)?.eligible),
      assignedToMe: heldByMe.length > 0,
      doneToday: target.length > 0 && target.every((part) => recordedToday(part) !== null),
      awaitingMyPart: Boolean(openSession && openSession.missing.some((m) => myParts.includes(m))), openSessionId: openSession?.id ?? null,
      readOnly: !v.approver && myParts.length === 0,
      unseen: x.plan.parts.some((part) => { const a = x.assignments.get(part); return a && a.userId === v.userId && !a.seenAt; }),
      substituteFor };
  });
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
  //  §4.hc — **أجزاءُ الجلسة** لخطّة Bionic AI: مَن سجّل كلَّ جزءٍ ومتى وبأيّ صفة، وما ينقصها.
  const partRows = rowsOf(await db.execute(sql`SELECT session_id, part, recorded_by_name, recorded_at, via, plan_version FROM physio_plan_session_parts
      WHERE session_id IN (${sql.join(ss.map((s) => sql`${s.id}`), sql`, `)}) ORDER BY recorded_at`));
  const [planRow] = await db.select().from(physioPlans).where(eq(physioPlans.id, planId));
  const planParts = planRow?.origin === "opus" ? await partsOfPlanTx(db, planRow) : [];
  return ss.map((s) => {
    const parts = partRows.filter((r) => Number(r.session_id) === s.id).map((r) => ({ part: r.part as PlanPart, recordedByName: r.recorded_by_name ?? null,
      recordedAt: r.recorded_at ? new Date(r.recorded_at).toISOString() : null, via: r.via, planVersion: r.plan_version ?? null }));
    return { ...s, items: items.filter((i) => i.sessionId === s.id), exercises: exercises.filter((x: any) => x.sessionId === s.id), parts,
      missingParts: s.cancelledAt ? [] : missingPartsOf(s.partsRequired, planParts, parts.map((x) => x.part)) };
  });
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
const arDigitsOf = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export async function executeSession(p: {
  planId: number; items: ExecutionItemInput[]; noteToSpecialist: string | null; sessionDate: string; shift: "morning" | "evening";
  actor: Actor; canDryNeedle: boolean; visitCustomDate: string | null;
  /**
   * §4.dr — **تمارينُ المرحلة بأعيانها**، نُفّذ أم لا وسببُه، والمرحلةُ التي اختارها المعالج (وإلّا مرحلةُ رقم الجلسة). وغيابُها (صفحةٌ أقدم لم تتحدّث)
   * لا يُسجّل تمارين — ولا يُفشل الجلسة.
   */
  exercises?: ExerciseItemInput[] | null; phasePosition?: number | null;
  /** اختارها المعالجُ من القائمة — وإلّا فالمرحلةُ المرسَلة افتراضُ الشاشة، يُعاد حسابُه هنا تحت قفل الخطّة. */
  phaseManual?: boolean;
  /** §4.hb D9 — نسخةُ خطّة Opus التي عرضتها الشاشة؛ تُطابَق تحت قفل الخطّة. */
  planVersion?: number | null;
  /** §4.hc — خطّةُ Bionic AI وحدها: الأجزاءُ التي يسجّلها السائلُ الآن، والجلسةُ التي يُكملها (جزءُ زميله سُجّل)، وتاريخُ الجسم كما أُرسل. */
  parts?: PlanPart[] | null; sessionId?: number | null; mayBackdate?: boolean; explicitDate?: string | null;
}) {
  return db.transaction(async (tx) => {
    //  §4.hb D9 — خطّةُ Opus اعتُمدت قبل نظام النسخ (`opus_version` فارغ): نسخُها المحسوبة تُكتب الآن قبل أن تُختم الجلسة — فلا تُختم بالنسخة ١ وهي
    //  تُنفَّذ على الثانية المحسوبة (عُدّلت صفوفُها قبل المرحلة الثالثة). وترتيبُ الأقفال D13: المريضُ أوّلاً ثمّ صفُّ الخطّة.
    const pre = ((await tx.execute(sql`SELECT origin, opus_version FROM physio_plans WHERE id = ${p.planId}`)) as any).rows?.[0];
    const backfill = pre?.origin === "opus" && pre.opus_version == null;
    if (backfill) await (await import("../physio_agent/versions")).lockOpusPatientFirstTx(tx, p.planId);
    const [plan] = await tx.select().from(physioPlans).where(eq(physioPlans.id, p.planId)).for("update");
    if (!plan) throw new PlanError(404, "الخطّة غير موجودة");
    if (plan.status !== "approved") throw new PlanError(409, "تُنفَّذ الخطّةُ المعتمَدة وحدها");
    let ensured: number | null = null;
    if (backfill && plan.origin === "opus" && plan.opusVersion == null) {
      const raw = ((await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${p.planId}`)) as any).rows[0];
      ensured = await (await import("../physio_agent/versions")).ensureVersionOneTx(tx, raw, { userId: p.actor.userId, name: p.actor.name });
    }
    //  §4.hb D9 — **لا تُختم جلسةٌ بنسخةٍ لم يرها المعالج**: نسخةُ الشاشة = النافذةُ تحت القفل، وإلّا ٤٠٩ (وغيابُها من صفحةٍ أقدم كذلك).
    const opusVersion = plan.origin === "opus" ? (ensured ?? plan.opusVersion ?? 1) : null;
    if (opusVersion !== null && p.planVersion !== opusVersion) {
      throw new PlanError(409, `عُدّلت الخطّة إلى النسخة ${arDigitsOf(opusVersion)} — أعد فتح الجلسة`, "plan_version_changed");
    }
    //  §4.hc — **خطّةُ Bionic AI تُنفَّذ بأجزائها** (قرارُ المالك ٧)؛ واليدويةُ و«اقترح خطّة» كما كانت حرفاً.
    if (plan.origin === "opus") return executeOpusPartsTx(tx, plan, p, opusVersion!);
    if (p.parts || p.sessionId) throw new PlanError(400, `الأجزاءُ لخطّة ${AI_BRAND} وحدها`, "parts_not_opus");
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
      //  **الافتراضُ يُحسب هنا تحت قفل الخطّة** (ملاحظةُ المراجعة على #622): جلسةٌ سُجّلت بعد أن فتح المعالجُ النافذةَ تنقل رقمَ هذه الجلسة، وقد تنقل
      //  مرحلتَها؛ فافتراضُ الشاشة القديم لا يُكتب كأنه اختيار — يُردّ (٤٠٩) لتُعيد الشاشةُ تحميلَ تمارين المرحلة الصحيحة. واختيارُ المعالج يُحترم.
      const auto = phaseForSession(phases, Number(sessionsSoFar) + 1);
      if (!p.phaseManual && p.phasePosition != null && p.phasePosition !== auto) throw new PlanError(409, PHASE_MOVED);
      phasePosition = p.phaseManual && p.phasePosition != null ? p.phasePosition : auto;
      const phase = phases.find((ph) => ph.position === phasePosition);
      phaseLinks = phase ? await tx.select({ exerciseId: physioPlanPhaseExercises.exerciseId, sets: physioPlanPhaseExercises.sets,
        reps: physioPlanPhaseExercises.reps, holdSeconds: physioPlanPhaseExercises.holdSeconds, nameAr: physioExercises.nameAr,
        cardSets: physioExercises.sets, cardReps: physioExercises.reps, cardHold: physioExercises.holdSeconds })
        .from(physioPlanPhaseExercises).innerJoin(physioExercises, eq(physioExercises.id, physioPlanPhaseExercises.exerciseId))
        .where(eq(physioPlanPhaseExercises.phaseId, phase.id))
        .orderBy(asc(physioPlanPhaseExercises.position), asc(physioPlanPhaseExercises.id)) : [];
      const exErr = exerciseItemsError({ phaseExerciseIds: phaseLinks.map((x) => Number(x.exerciseId)), items: p.exercises });
      if (exErr) throw new PlanError(400, exErr);
      //  بندُ «تمارين» وتمارينُه لا يتناقضان: لم يُنفَّذ (أو ليس دورَه) ⟵ لا تُعلَّم تمارينُه، ونُفّذ ⟵ تمرينٌ واحدٌ نُفّذ على الأقلّ.
      const exLine = planLines.find((l) => l.code === EXERCISE_DEVICE_CODE);
      const exItem = exLine ? p.items.find((i) => i.deviceId === Number(exLine.deviceId)) : undefined;
      const devErr = exerciseDeviceError({ deviceDone: exItem ? exItem.done : null, items: p.exercises });
      if (devErr) throw new PlanError(400, devErr);
    }
    const exerciseName = (id: number) => phaseLinks.find((x) => Number(x.exerciseId) === id)?.nameAr ?? `#${id}`;
    const skippedExercises = (p.exercises ?? []).filter((x) => !x.done).map((x) => `${exerciseName(x.exerciseId)} (${x.note})`).join("، ");

    const doneCodes = p.items.filter((i) => i.done).map((i) => planLines.find((l) => Number(l.deviceId) === i.deviceId)!.code);
    const devNames = await tx.select({ id: devices.id, nameAr: devices.nameAr }).from(devices);
    const nameOf = (id: number) => devNames.find((d) => d.id === id)?.nameAr ?? `#${id}`;
    const doneText = p.items.filter((i) => i.done).map((i) => `${nameOf(i.deviceId)}${i.minutes ? ` ${i.minutes} د` : ""}`).join("، ");
    const skipped = p.items.filter((i) => !i.done && !isOffTurn(i)).map((i) => `${nameOf(i.deviceId)} (${i.note})`).join("، ");

    //  **زيارةُ جلسة العلاج الطبيعي** — كما يكتبها «تسجيل زيارة جلسة علاج طبيعي»: على قسم العلاج الطبيعي، وبنوع علاجٍ من قائمته.
    const [physioCase] = await tx.select({ id: patientCases.id, cost: patientCases.cost }).from(patientCases)
      .where(and(eq(patientCases.patientId, plan.patientId), eq(patientCases.caseType, "physiotherapy"))).limit(1);
    //  **ما اشتراه المريض لكلّ نوع** — بقاعدة ملفّه نفسِها (`resolvePurchasedSessions`)، كي تُعدّ «تمارين مع أجهزة» على مَن اشتراها (§4.ft).
    const [buyer] = await tx.select({ physioPlan: patients.physioPlan, treatmentType: patients.treatmentType, totalCost: patients.totalCost })
      .from(patients).where(eq(patients.id, plan.patientId));
    const buyerPays = await tx.select({ treatmentType: payments.paymentTreatmentType, sessionCount: payments.sessionCount, isFree: payments.isFreeSessions, returned: payments.returnedSessions })
      .from(payments).where(and(eq(payments.patientId, plan.patientId),
        physioCase ? or(eq(payments.caseId, physioCase.id), isNull(payments.caseId)) : isNull(payments.caseId)));
    const bought = resolvePurchasedSessions({
      plan: Array.isArray(buyer?.physioPlan) ? buyer.physioPlan : null,
      treatmentTypeText: buyer?.treatmentType ?? null,
      caseCost: physioCase ? Number(physioCase.cost ?? 0) : Number(buyer?.totalCost ?? 0),
      paymentSessions: buyerPays,
    }).byType;
    const visit = await storage.createVisit({
      patientId: plan.patientId, branchId: plan.branchId, caseId: physioCase?.id ?? null,
      treatmentType: sessionTreatmentType(doneCodes, bought),
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
      noteToSpecialist: p.noteToSpecialist, countsWritten: writeCounts, phasePosition, planVersion: opusVersion,
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

// ══ خطّةُ Bionic AI بأجزائها (ترحيل ٢٠١، §4.hc) ═══════════════════════════════════════════════════════
const rowsOf = (r: any): any[] => (r?.rows ?? r ?? []) as any[];
const ymdOf = (d: unknown): string => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "").slice(0, 10));
/** **ما ينقص الجلسة** = (أجزاؤها المطلوبة ∩ أجزاء الخطّة الآن) − ما سُجّل. فجزءٌ أزالته نسخةٌ لاحقة لا يبقى ناقصاً. */
export const missingPartsOf = (required: readonly string[] | null | undefined, planParts: readonly PlanPart[], recorded: readonly string[]): PlanPart[] =>
  required == null ? [] : PLAN_PARTS.filter((p) => required.includes(p) && planParts.includes(p) && !recorded.includes(p));

/** ما اشتراه المريضُ لكلّ نوع — بقاعدة ملفّه (`resolvePurchasedSessions`، §4.ft). */
async function boughtByTypeTx(tx: any, plan: { patientId: number }) {
  const [physioCase] = await tx.select({ id: patientCases.id, cost: patientCases.cost }).from(patientCases)
    .where(and(eq(patientCases.patientId, plan.patientId), eq(patientCases.caseType, "physiotherapy"))).limit(1);
  const [buyer] = await tx.select({ physioPlan: patients.physioPlan, treatmentType: patients.treatmentType, totalCost: patients.totalCost })
    .from(patients).where(eq(patients.id, plan.patientId));
  const buyerPays = await tx.select({ treatmentType: payments.paymentTreatmentType, sessionCount: payments.sessionCount, isFree: payments.isFreeSessions, returned: payments.returnedSessions })
    .from(payments).where(and(eq(payments.patientId, plan.patientId),
      physioCase ? or(eq(payments.caseId, physioCase.id), isNull(payments.caseId)) : isNull(payments.caseId)));
  const bought = resolvePurchasedSessions({
    plan: Array.isArray(buyer?.physioPlan) ? buyer.physioPlan : null,
    treatmentTypeText: buyer?.treatmentType ?? null,
    caseCost: physioCase ? Number(physioCase.cost ?? 0) : Number(buyer?.totalCost ?? 0),
    paymentSessions: buyerPays,
  }).byType;
  return { caseId: physioCase?.id ?? null, bought };
}

interface VisitItem { code: string; nameAr: string; done: boolean; minutes: number | null; note: string | null; offTurn: boolean; order: number }
interface VisitExercise { nameAr: string; done: boolean; note: string | null; order: number }
/** **نوعُ الزيارة ونصُّها من بنود الجلسة كلِّها** — بصيغة «إنهاء الجلسة» نفسِها؛ فالجلسةُ بجزأين تساوي حفظاً واحداً حقلاً بحقل. */
function visitFieldsOf(items: VisitItem[], exercises: VisitExercise[], bought: Record<string, number>) {
  const its = [...items].sort((a, b) => a.order - b.order);
  const exs = [...exercises].sort((a, b) => a.order - b.order);
  const doneText = its.filter((i) => i.done).map((i) => `${i.nameAr}${i.minutes ? ` ${i.minutes} د` : ""}`).join("، ");
  const skipped = its.filter((i) => !i.done && !i.offTurn).map((i) => `${i.nameAr} (${i.note})`).join("، ");
  const skippedExercises = exs.filter((x) => !x.done).map((x) => `${x.nameAr} (${x.note})`).join("، ");
  return {
    treatmentType: sessionTreatmentType(its.filter((i) => i.done).map((i) => i.code), bought),
    notes: [doneText ? `نُفّذ: ${doneText}` : "", skipped ? `لم يُنفَّذ: ${skipped}` : "", skippedExercises ? `لم يُنفَّذ من التمارين: ${skippedExercises}` : ""]
      .filter(Boolean).join(" — ") || null,
  };
}
/** الحقلان من الصفوف المحفوظة للجلسة (بعد الإكمال). */
async function visitFieldsFromDbTx(tx: any, plan: { id: number; patientId: number }, sessionId: number) {
  const its = rowsOf(await tx.execute(sql`SELECT i.done, i.minutes, i.note, i.off_turn, d.code, d.name_ar, l.display_order
      FROM physio_plan_session_items i JOIN devices d ON d.id = i.device_id
      LEFT JOIN physio_plan_devices l ON l.plan_id = ${plan.id} AND l.device_id = i.device_id WHERE i.session_id = ${sessionId}`));
  const exs = rowsOf(await tx.execute(sql`SELECT e.done, e.note, e.display_order, x.name_ar FROM physio_plan_session_exercises e JOIN physio_exercises x ON x.id = e.exercise_id
      WHERE e.session_id = ${sessionId}`));
  const { bought } = await boughtByTypeTx(tx, plan);
  return visitFieldsOf(its.map((r) => ({ code: String(r.code), nameAr: r.name_ar, done: r.done, minutes: r.minutes ?? null, note: r.note ?? null, offTurn: r.off_turn === true,
    order: r.display_order ?? 1000 })), exs.map((r) => ({ nameAr: r.name_ar, done: r.done, note: r.note ?? null, order: Number(r.display_order ?? 0) })), bought);
}

/**
 * **تسجيلُ جزءٍ أو جزأين من جلسة خطّة Bionic AI** — تحت قفل الخطّة (والمريضِ أوّلاً إن كُتبت نسخُها الآن). مَن يسجّل كلَّ جزء: المعتمِد، أو مُسنَدُه،
 * أو بديلٌ معتمَد ليوم الجلسة (`partVerdict`). والجلسةُ واحدةٌ للزيارة الواحدة: يفتحها أوّلُ جزء، ويُكملها الآخرُ (`sessionId`) على الزيارة نفسِها.
 */
async function executeOpusPartsTx(tx: any, plan: any, p: Parameters<typeof executeSession>[0], opusVersion: number) {
  const planParts = await partsOfPlanTx(tx, plan);
  let session: any = null;
  if (p.sessionId) {
    session = rowsOf(await tx.execute(sql`SELECT * FROM physio_plan_sessions WHERE id = ${p.sessionId} FOR UPDATE`))[0];
    if (!session || Number(session.plan_id) !== Number(plan.id)) throw new PlanError(404, "الجلسة غير موجودة", "session_not_found");
    if (session.cancelled_at) throw new PlanError(409, "أُلغيت هذه الجلسة — لا تُكمَل", "session_cancelled");
    //  **زيارتُها حُذفت** من سجلّ الزيارات ⟵ لا يُكتب على زيارةٍ محذوفة ولا تُزاد عدّاداتُها.
    const vis = session.visit_id ? rowsOf(await tx.execute(sql`SELECT deleted_at FROM visits WHERE id = ${session.visit_id}`))[0] : null;
    if (session.visit_id && (!vis || vis.deleted_at)) throw new PlanError(409, "حُذفت زيارةُ هذه الجلسة — ألغِ الجلسةَ أو سجّل جلسةً جديدة", "session_visit_deleted");
    const day = ymdOf(session.session_date);
    if (p.explicitDate && p.explicitDate !== day) throw new PlanError(400, "تُكمَل الجلسةُ بتاريخها", "session_date_mismatch");
    const v = checkVisitDate(day, p.mayBackdate === true);
    if (!v.ok) throw new PlanError(v.status, v.message);
  }
  const sessionDate = session ? ymdOf(session.session_date) : p.sessionDate;
  const recorded: string[] = session ? rowsOf(await tx.execute(sql`SELECT part FROM physio_plan_session_parts WHERE session_id = ${session.id}`)).map((r) => String(r.part)) : [];
  const missing = session ? missingPartsOf(session.parts_required, planParts, recorded) : [];
  const requested: PlanPart[] = p.parts ?? (session ? missing : planParts);
  if (!requested.length) throw new PlanError(400, "لا جزءَ يُسجَّل", "no_parts");
  for (const part of requested) {
    if (session && recorded.includes(part)) throw new PlanError(409, `سُجّل جزءُ «${PART_LABELS[part]}» من هذه الجلسة من قبل`, "part_already_recorded");
    if (session && !missing.includes(part)) throw new PlanError(409, `جزءُ «${PART_LABELS[part]}» ليس من هذه الجلسة`, "part_not_in_session");
    if (!planParts.includes(part)) throw new PlanError(400, `جزءُ «${PART_LABELS[part]}» ليس في الخطّة`, "part_not_in_plan");
  }
  //  **مَن يسجّل** (قرارُ المالك ٧) — تحت قفل الخطّة: الإسنادُ والبدلاءُ يُقرؤون الآن.
  const v = (await verdictsFor(tx, [plan], { userId: p.actor.userId, approver: p.actor.isApprover === true }, sessionDate)).get(Number(plan.id))!;
  for (const part of requested) {
    const x = v.verdicts[part]!;
    if (!x.ok) throw new PlanError(403, x.reasonAr, x.code);
  }
  //  **جلسةُ اليوم مفتوحة** بجزءٍ ناقص ⟵ تُكمَل لا تُفتح ثانية (وجلستان متزامنتان تتسلسلان على قفل الخطّة).
  if (!session) {
    const open = rowsOf(await tx.execute(sql`SELECT s.id, s.parts_required, COALESCE((SELECT array_agg(x.part) FROM physio_plan_session_parts x WHERE x.session_id = s.id), '{}') AS rec
        FROM physio_plan_sessions s WHERE s.plan_id = ${plan.id} AND s.cancelled_at IS NULL AND s.session_date = ${sessionDate}::date AND s.parts_required IS NOT NULL ORDER BY s.id`));
    for (const o of open) {
      const miss = missingPartsOf(o.parts_required, planParts, o.rec ?? []);
      if (miss.length) {
        throw new PlanError(409, "سُجّل جزءٌ من جلسة اليوم — أكمِلها بدل فتح جلسةٍ ثانية", "open_session_exists",
          { sessionId: Number(o.id), missingParts: miss, recordedParts: (o.rec ?? []).map(String) });
      }
    }
  }
  const planLines = await tx.select({ deviceId: physioPlanDevices.deviceId, minutes: physioPlanDevices.minutes, code: devices.code, nameAr: devices.nameAr,
    centreUse: physioPlanDevices.centreUse, displayOrder: physioPlanDevices.displayOrder, everyDays: physioPlanDevices.everyDays, times: physioPlanDevices.times })
    .from(physioPlanDevices).innerJoin(devices, eq(devices.id, physioPlanDevices.deviceId)).where(eq(physioPlanDevices.planId, plan.id));
  const myLines = planLines.filter((l: any) => requested.includes(partOfDeviceCode(l.code)));
  const needle = myLines.find((l: any) => l.code === DRY_NEEDLING_DEVICE_CODE);
  const [{ n: before }] = session
    ? rowsOf(await tx.execute(sql`SELECT count(*)::int AS n FROM physio_plan_sessions WHERE plan_id = ${plan.id} AND cancelled_at IS NULL AND id < ${session.id}`))
    : await tx.select({ n: sql<number>`count(*)::int` }).from(physioPlanSessions).where(and(eq(physioPlanSessions.planId, plan.id), isNull(physioPlanSessions.cancelledAt)));
  const sessionsBefore = Number(before);
  const { offTurnDeviceIds: adjunctOff } = sessionAdjuncts(planLines.map((l: any) => ({ ...l, deviceId: Number(l.deviceId) })), sessionsBefore);
  const scheduled = myLines.filter((l: any) => isScheduled(l));
  const history = await scheduledDoneDates(tx, plan.id, scheduled.map((l: any) => Number(l.deviceId)), sessionDate);
  const offNotes = new Map<number, string>();
  for (const l of scheduled) {
    const st = scheduleState(l, history[Number(l.deviceId)] ?? [], sessionDate);
    if (!st.due) offNotes.set(Number(l.deviceId), scheduleOffNote(st));
  }
  const offTurnDeviceIds = [...adjunctOff, ...Array.from(offNotes.keys())];
  const offTurn = new Set(offTurnDeviceIds);
  //  **بنودُ الأجزاء المسجَّلة بأعيانها** — لا جهازَ من جزء زميله ولا ناقص.
  const err = executionItemsError({ planDeviceIds: myLines.map((l: any) => Number(l.deviceId)), items: p.items, needleDeviceId: needle ? Number(needle.deviceId) : null,
    canDryNeedle: p.canDryNeedle, offTurnDeviceIds, requireOneDone: false });
  if (err) throw new PlanError(400, err);
  const isOffTurn = (i: ExecutionItemInput) => !i.done && offTurn.has(i.deviceId);

  const recordsExercises = requested.includes("exercises");
  if (!recordsExercises && ((p.exercises?.length ?? 0) > 0 || p.phasePosition != null || p.phaseManual)) {
    throw new PlanError(400, "التمارينُ ومرحلتُها من جزء «التمارين» — لم يُطلب تسجيلُه", "exercises_not_requested");
  }
  let phasePosition: number | null = session?.phase_position ?? null;
  let phaseLinks: { exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; nameAr: string;
    cardSets: number | null; cardReps: number | null; cardHold: number | null }[] = [];
  const exercises = p.exercises ?? [];
  if (recordsExercises) {
    const phases = await tx.select({ id: physioPlanPhases.id, position: physioPlanPhases.position, sessionFrom: physioPlanPhases.sessionFrom,
      sessionTo: physioPlanPhases.sessionTo }).from(physioPlanPhases).where(eq(physioPlanPhases.planId, plan.id));
    if (p.phasePosition != null && !phases.some((ph: any) => ph.position === p.phasePosition)) throw new PlanError(400, "مرحلةٌ ليست في الخطّة");
    const auto = phaseForSession(phases, sessionsBefore + 1);
    if (!p.phaseManual && p.phasePosition != null && p.phasePosition !== auto) throw new PlanError(409, PHASE_MOVED);
    phasePosition = p.phaseManual && p.phasePosition != null ? p.phasePosition : auto;
    const phase = phases.find((ph: any) => ph.position === phasePosition);
    phaseLinks = phase ? await tx.select({ exerciseId: physioPlanPhaseExercises.exerciseId, sets: physioPlanPhaseExercises.sets,
      reps: physioPlanPhaseExercises.reps, holdSeconds: physioPlanPhaseExercises.holdSeconds, nameAr: physioExercises.nameAr,
      cardSets: physioExercises.sets, cardReps: physioExercises.reps, cardHold: physioExercises.holdSeconds })
      .from(physioPlanPhaseExercises).innerJoin(physioExercises, eq(physioExercises.id, physioPlanPhaseExercises.exerciseId))
      .where(eq(physioPlanPhaseExercises.phaseId, phase.id))
      .orderBy(asc(physioPlanPhaseExercises.position), asc(physioPlanPhaseExercises.id)) : [];
    const exLine = myLines.find((l: any) => l.code === EXERCISE_DEVICE_CODE);
    const exItem = exLine ? p.items.find((i) => i.deviceId === Number(exLine.deviceId)) : undefined;
    const devErr = exerciseDeviceError({ deviceDone: exItem ? exItem.done : null, items: exercises });
    if (devErr) throw new PlanError(400, devErr);
    //  بندُ «تمارين» لم يُنفَّذ (وسببُه فيه) ⟵ لا تُعلَّم تمارينُه؛ وإلّا **فجزءُ التمارين يُسجَّل بتمارينه** — لا تسامحَ مع صفحةٍ أقدم هنا (اليدويةُ وحدها تتسامح).
    if (!(exItem && !exItem.done)) {
      if (phaseLinks.length && p.exercises == null) throw new PlanError(400, "أرسل تمارينَ المرحلة — جزءُ «التمارين» يُسجَّل بتمارينه", "exercises_required");
      const exErr = exerciseItemsError({ phaseExerciseIds: phaseLinks.map((x) => Number(x.exerciseId)), items: exercises });
      if (exErr) throw new PlanError(400, exErr);
    }
  }
  //  **بندٌ واحدٌ نُفّذ على الأقلّ عند الفتح** — من الأجهزة أو التمارين معاً؛ والإكمالُ يقبل «لم يُنفَّذ» كلَّه بأسبابه (المريضُ رفض التمارين).
  if (!session && !p.items.some((i) => i.done) && !exercises.some((x) => x.done)) throw new PlanError(400, "لم يُعلَّم أيُّ بندٍ «نُفّذ» — لا جلسةَ تُسجَّل");

  const nameOfLine = (id: number) => planLines.find((l: any) => Number(l.deviceId) === id);
  const visitItems: VisitItem[] = p.items.map((i) => { const l = nameOfLine(i.deviceId)!;
    return { code: String(l.code), nameAr: l.nameAr, done: i.done, minutes: i.minutes, note: isOffTurn(i) ? null : i.note, offTurn: isOffTurn(i), order: l.displayOrder ?? 1000 }; });
  let visit: any; let visitBefore: any = null; let writeCounts: boolean;
  if (!session) {
    const { caseId, bought } = await boughtByTypeTx(tx, plan);
    const exNames: VisitExercise[] = exercises.map((x) => ({ nameAr: phaseLinks.find((l) => Number(l.exerciseId) === x.exerciseId)?.nameAr ?? `#${x.exerciseId}`, done: x.done,
      note: x.note, order: phaseLinks.findIndex((l) => Number(l.exerciseId) === x.exerciseId) }));
    const f = visitFieldsOf(visitItems, exNames, bought);
    visit = await storage.createVisit({
      patientId: plan.patientId, branchId: plan.branchId, caseId, treatmentType: f.treatmentType, details: `جلسة من الخطة: ${plan.titleAr}`, notes: f.notes,
      shift: p.shift, createdBy: p.actor.userId, customDate: p.visitCustomDate,
    } as any, tx);
    const [branch] = await tx.select({ countsFrom: branches.physioCountsFrom }).from(branches).where(eq(branches.id, plan.branchId));
    writeCounts = countsFromExecution(branch?.countsFrom as any, sessionDate);
    const [s0] = await tx.insert(physioPlanSessions).values({
      planId: plan.id, patientId: plan.patientId, branchId: plan.branchId, sessionDate, shift: p.shift,
      executedBy: p.actor.userId, executedByName: p.actor.name, visitId: visit.id, noteToSpecialist: p.noteToSpecialist, countsWritten: writeCounts,
      phasePosition: recordsExercises ? phasePosition : null, planVersion: opusVersion, partsRequired: planParts,
    }).returning();
    session = { id: s0.id, session_date: sessionDate, shift: p.shift, counts_written: writeCounts, visit_id: visit.id, branch_id: plan.branchId };
  } else {
    writeCounts = session.counts_written === true;
    if (recordsExercises) await tx.execute(sql`UPDATE physio_plan_sessions SET phase_position = ${phasePosition} WHERE id = ${session.id}`);
    //  **ملاحظةُ المُكمِل للأخصائيّ** تُضاف إلى ملاحظة الجلسة باسمه — فتظهر في سجلّ الجلسات و«ما اختلف عن الخطّة» كملاحظة الفاتح.
    if (p.noteToSpecialist) {
      const line = `${p.actor.name ?? "المعالج"}: ${p.noteToSpecialist}`;
      await tx.execute(sql`UPDATE physio_plan_sessions SET note_to_specialist = CASE WHEN note_to_specialist IS NULL OR note_to_specialist = '' THEN ${line}
          ELSE note_to_specialist || E'\n' || ${line} END WHERE id = ${session.id}`);
    }
  }
  if (exercises.length) {
    await tx.insert(physioPlanSessionExercises).values(exercises.map((x) => {
      const link = phaseLinks.find((l) => Number(l.exerciseId) === x.exerciseId);
      return { sessionId: session.id, exerciseId: x.exerciseId, done: x.done, note: x.note,
        plannedSets: link?.sets ?? link?.cardSets ?? null, plannedReps: link?.reps ?? link?.cardReps ?? null, plannedHoldSeconds: link?.holdSeconds ?? link?.cardHold ?? null,
        displayOrder: phaseLinks.findIndex((l) => Number(l.exerciseId) === x.exerciseId) };
    }));
  }
  if (p.items.length) {
    await tx.insert(physioPlanSessionItems).values(p.items.map((i) => ({
      sessionId: session.id, deviceId: i.deviceId, done: i.done, minutes: i.minutes,
      note: isOffTurn(i) ? ((i.note ?? "").trim() || offNotes.get(i.deviceId) || ADJUNCT_OFF_TURN_NOTE) : i.note, offTurn: isOffTurn(i),
      plannedMinutes: planLines.find((l: any) => Number(l.deviceId) === i.deviceId)?.minutes ?? null,
    })));
  }
  for (const part of requested) {
    const x = v.verdicts[part]! as { ok: true; via: string; substitutionId: number | null };
    await tx.execute(sql`INSERT INTO physio_plan_session_parts (session_id, part, recorded_by, recorded_by_name, plan_version, via, substitution_id, note_to_specialist)
      VALUES (${session.id}, ${part}, ${p.actor.userId}, ${p.actor.name}, ${opusVersion}, ${x.via}, ${x.substitutionId}, ${p.noteToSpecialist})`);
  }
  if (p.sessionId) {
    //  **الزيارةُ نفسُها**: نوعُها ونصُّها من بنود الجلسة كلِّها الآن.
    visitBefore = rowsOf(await tx.execute(sql`SELECT id, treatment_type, notes, branch_id FROM visits WHERE id = ${session.visit_id}`))[0] ?? null;
    const f = await visitFieldsFromDbTx(tx, plan, session.id);
    visit = rowsOf(await tx.execute(sql`UPDATE visits SET treatment_type = ${f.treatmentType}, notes = ${f.notes} WHERE id = ${session.visit_id}
        RETURNING id, branch_id AS "branchId", treatment_type, notes`))[0];
  }
  //  **العدّادات** بيوم الجلسة ووردِيّتها (لا وردية المُكمِل) — كما يعكسها الإلغاء.
  if (writeCounts) {
    await bumpCounts(tx, plan.branchId, ymdOf(session.session_date), String(session.shift), p.items.filter((i) => i.done).map((i) => i.deviceId), +1, p.actor.userId);
  }
  if (p.noteToSpecialist && plan.createdBy) {
    const [pt] = await tx.select({ name: patients.name, code: patients.patientCode }).from(patients).where(eq(patients.id, plan.patientId));
    await enqueueStaffEvent(tx, {
      event: "physio_session_note", targetUserIds: [plan.createdBy], excludeUserId: p.actor.userId,
      text: `📝 ملاحظة من ${p.actor.name ?? "المعالج"} على جلسة ${pt?.name ?? ""}${pt?.code ? ` (${pt.code})` : ""}\n${plan.titleAr}\n${p.noteToSpecialist}`,
      linkPath: `/physio/plans/${plan.id}`,
    });
  }
  const [fresh] = await tx.select().from(physioPlanSessions).where(eq(physioPlanSessions.id, session.id));
  return { session: fresh, visit, visitBefore, writeCounts, parts: requested, attached: Boolean(p.sessionId) };
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
export async function deviations(p: { branchIds: number[] | null; sinceDate: string; today?: string }) {
  const today = p.today ?? new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const conds: any[] = [isNull(physioPlanSessions.cancelledAt), gte(physioPlanSessions.sessionDate, p.sinceDate), isNull(patients.deletedAt),
    sql`(${physioPlanSessions.noteToSpecialist} IS NOT NULL OR EXISTS (SELECT 1 FROM physio_plan_session_items i WHERE i.session_id = ${physioPlanSessions.id}
         AND ((NOT i.done AND NOT i.off_turn) OR (i.planned_minutes IS NOT NULL AND i.minutes IS NOT NULL AND i.minutes <> i.planned_minutes)))
         OR EXISTS (SELECT 1 FROM physio_plan_session_exercises e WHERE e.session_id = ${physioPlanSessions.id} AND NOT e.done)
         OR (${physioPlanSessions.partsRequired} IS NOT NULL AND ${physioPlanSessions.sessionDate} < ${today}::date AND EXISTS (
              SELECT 1 FROM unnest(${physioPlanSessions.partsRequired}) rp(part) WHERE rp.part = ANY(COALESCE(${physioPlans.opusParts}, '{}'::text[]))
                AND NOT EXISTS (SELECT 1 FROM physio_plan_session_parts sp WHERE sp.session_id = ${physioPlanSessions.id} AND sp.part = rp.part))))`];
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlanSessions.branchId, p.branchIds) : sql`false`);
  const ss = await db.select({
    id: physioPlanSessions.id, planId: physioPlanSessions.planId, sessionDate: physioPlanSessions.sessionDate,
    executedByName: physioPlanSessions.executedByName, noteToSpecialist: physioPlanSessions.noteToSpecialist,
    patientName: patients.name, patientCode: patients.patientCode, titleAr: physioPlans.titleAr, branchName: branches.name,
    partsRequired: physioPlanSessions.partsRequired, planParts: physioPlans.opusParts,
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
  //  §4.hc — جزءٌ لم يُسجَّل من جلسة يومٍ مضى (خطّةُ Bionic AI): «لم يُسجَّل جزءُ ‹التمارين›».
  const recordedParts = rowsOf(await db.execute(sql`SELECT session_id, part, recorded_by_name FROM physio_plan_session_parts
      WHERE session_id IN (${sql.join(ss.map((s) => sql`${s.id}`), sql`, `)})`));
  return ss.map(({ partsRequired, planParts, ...s }) => ({
    ...s,
    parts: recordedParts.filter((r) => Number(r.session_id) === s.id).map((r) => ({ part: r.part, recordedByName: r.recorded_by_name ?? null })),
    differences: [
      ...(String(s.sessionDate) < today ? missingPartsOf(partsRequired, (planParts ?? []) as PlanPart[],
        recordedParts.filter((r) => Number(r.session_id) === s.id).map((r) => String(r.part))).map((part) => ({ done: false, minutes: null, plannedMinutes: null,
        note: null, nameAr: `لم يُسجَّل جزءُ «${PART_LABELS[part]}»`, kind: "missing_part" as const, part })) : []),
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

