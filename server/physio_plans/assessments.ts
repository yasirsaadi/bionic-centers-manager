// **إعادةُ التقييم** (ترحيل ١١٣، §4.cp — المرحلةُ السادسة) — طبقةُ البيانات. القواعدُ في `shared/physio_assessments.ts`.
//
// التقييمُ في معاملةٍ واحدة بقفل الخطّة: القياساتُ لقطةٌ بتعريف مقاييس البروتوكول يومَها، والقرارُ «تخرّج» يجعل الخطّةَ `graduated`
// و«إيقاف» يجعلها `stopped` بسببه — في المعاملة نفسِها. و«مستحقّ التقييم» يُحسب من آخر تقييمٍ ويوم الاعتماد ومدّة الخطّة (`assessmentDue`).
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { branches, patients, physioAssessments, physioPlanSessions, physioPlans, physioProtocolMeasures, physioProtocols, type PhysioPlan } from "@shared/schema";
import {
  assessmentDue, parseAssessment, planGoalsList, type AssessmentKind, type MeasureDef, type ScoreSnap,
} from "@shared/physio_assessments";
import { isPlanClosed } from "@shared/physio_plans";
import { PlanError, type Actor } from "./store";

/** يومُ بغداد لطابعٍ زمنيّ. */
export const baghdadDayOf = (d: Date | string | null | undefined): string | null =>
  d ? new Date(new Date(d).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10) : null;

/** مقاييسُ بروتوكولٍ بأرقامها (الأعمدةُ `numeric` تصل نصّاً). وخطّةٌ بلا بروتوكول ⟵ لا مقاييسَ إلّا الألمَ والأهداف. */
export async function protocolMeasures(protocolId: number | null, ex: any = db): Promise<MeasureDef[]> {
  if (!protocolId) return [];
  const rows = await ex.select().from(physioProtocolMeasures).where(eq(physioProtocolMeasures.protocolId, protocolId))
    .orderBy(asc(physioProtocolMeasures.displayOrder), asc(physioProtocolMeasures.id));
  return rows.map((r: any) => ({
    code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, unitAr: r.unitAr, unitEn: r.unitEn,
    min: Number(r.minValue), max: Number(r.maxValue), higherIsBetter: r.higherIsBetter,
  }));
}

export async function planAssessments(planId: number) {
  return db.select().from(physioAssessments).where(eq(physioAssessments.planId, planId))
    .orderBy(asc(physioAssessments.assessedOn), asc(physioAssessments.id));
}

/** الجلساتُ المنفّذة (غيرُ الملغاة) ويومُ آخرها — لموعد الختاميّ بعدد الجلسات (ترحيل ١٢٣، §4.dd). */
export async function executedSessions(planId: number): Promise<{ executed: number; lastSessionOn: string | null }> {
  const [r] = await db.select({ n: sql<number>`count(*)::int`, last: sql<string | null>`max(${physioPlanSessions.sessionDate})::text` })
    .from(physioPlanSessions).where(and(eq(physioPlanSessions.planId, planId), isNull(physioPlanSessions.cancelledAt)));
  return { executed: Number(r?.n ?? 0), lastSessionOn: r?.last ?? null };
}

/** ما تعرضه صفحةُ الخطّة: التقييماتُ، ومقاييسُ بروتوكولها الآن وحالُ اعتمادها، وأهدافُها سطوراً، والموعدُ التالي. */
export async function planAssessmentView(plan: PhysioPlan, today: string) {
  const list = await planAssessments(plan.id);
  const ses = await executedSessions(plan.id);
  const measures = await protocolMeasures(plan.protocolId);
  const [pr] = plan.protocolId
    ? await db.select({ s: physioProtocols.measuresStatus }).from(physioProtocols).where(eq(physioProtocols.id, plan.protocolId))
    : [];
  const last = list[list.length - 1];
  return {
    assessments: list, measures, measuresStatus: pr?.s ?? null, goals: planGoalsList(plan.goals),
    due: assessmentDue({ status: plan.status, approvedOn: baghdadDayOf(plan.decidedAt), durationWeeks: plan.durationWeeks,
      lastOn: last ? String(last.assessedOn) : null, count: list.length, today,
      totalSessions: plan.totalSessions, sessionsPerWeek: plan.sessionsPerWeek, ...ses }),
    sessions: { ...ses, total: plan.totalSessions },
  };
}

/**
 * **تقييمٌ جديد** — كاتبُ خطط على خطّةٍ غيرِ منتهية. النوعُ من التاريخ والقرار: الأوّلُ «أوّليّ»، و«تخرّج»/«إيقاف» «ختاميّ»، وما سواهما «دوريّ».
 */
export async function recordAssessment(planId: number, body: unknown, actor: Actor) {
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(physioPlans).where(eq(physioPlans.id, planId)).for("update");
    if (!plan) throw new PlanError(404, "الخطّة غير موجودة");
    if (isPlanClosed(plan.status)) throw new PlanError(409, "الخطّةُ منتهية — موقوفةٌ أو متخرّجة");
    const measures = await protocolMeasures(plan.protocolId, tx);
    const input = parseAssessment(body, measures, plan.status);
    if (typeof input === "string") throw new PlanError(400, input);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(physioAssessments).where(eq(physioAssessments.planId, planId));
    const kind: AssessmentKind = input.decision === "discharge" || input.decision === "stop" ? "final" : Number(n) === 0 ? "baseline" : "periodic";
    const byCode = new Map(measures.map((m) => [m.code, m]));
    const scores: ScoreSnap[] = input.scores.map((s) => ({ ...byCode.get(s.code)!, value: s.value }));
    const [row] = await tx.insert(physioAssessments).values({
      planId, patientId: plan.patientId, branchId: plan.branchId, kind, assessedOn: input.assessedOn, pain: input.pain,
      scores, goals: input.goals, notes: input.notes, decision: input.decision,
      assessedBy: actor.userId, assessedByName: actor.name,
    }).returning();
    let after: PhysioPlan = plan;
    if (input.decision === "discharge") {
      [after] = await tx.update(physioPlans).set({ status: "graduated", graduatedAt: new Date(), graduatedBy: actor.userId, graduatedByName: actor.name,
        updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date() }).where(eq(physioPlans.id, planId)).returning();
    } else if (input.decision === "stop") {
      [after] = await tx.update(physioPlans).set({ status: "stopped", stopReason: input.notes, stoppedAt: new Date(),
        updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date() }).where(eq(physioPlans.id, planId)).returning();
    }
    return { row, before: plan, after };
  });
}

/**
 * **مستحقّ التقييم** — الخططُ المعتمَدة في الفروع المعطاة (أو التي كتبها `createdBy` وحده) التي حلّ موعدُ تقييمها أو لم يُجرَ أوّليُّها،
 * الأكثرُ تأخّراً أوّلاً.
 */
export async function dueList(p: { branchIds: number[] | null; createdBy: number | null; today: string }) {
  const conds: any[] = [eq(physioPlans.status, "approved"), isNull(patients.deletedAt)];
  if (p.branchIds) conds.push(p.branchIds.length ? inArray(physioPlans.branchId, p.branchIds) : sql`false`);
  if (p.createdBy) conds.push(eq(physioPlans.createdBy, p.createdBy));
  const rows = await db.select({
    planId: physioPlans.id, titleAr: physioPlans.titleAr, branchId: physioPlans.branchId, branchName: branches.name,
    patientId: patients.id, patientName: patients.name, patientCode: patients.patientCode,
    createdBy: physioPlans.createdBy, createdByName: physioPlans.createdByName, decidedAt: physioPlans.decidedAt, durationWeeks: physioPlans.durationWeeks,
    totalSessions: physioPlans.totalSessions, sessionsPerWeek: physioPlans.sessionsPerWeek,
    executed: sql<number>`(SELECT count(*)::int FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL)`,
    lastSessionOn: sql<string | null>`(SELECT max(s.session_date)::text FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL)`,
    lastOn: sql<string | null>`(SELECT max(a.assessed_on)::text FROM physio_assessments a WHERE a.plan_id = "physio_plans"."id")`,
    count: sql<number>`(SELECT count(*)::int FROM physio_assessments a WHERE a.plan_id = "physio_plans"."id")`,
  }).from(physioPlans)
    .innerJoin(patients, eq(patients.id, physioPlans.patientId))
    .leftJoin(branches, eq(branches.id, physioPlans.branchId))
    .where(and(...conds)).orderBy(desc(physioPlans.id)).limit(1000);
  return rows
    .map((r) => ({ ...r, due: assessmentDue({ status: "approved", approvedOn: baghdadDayOf(r.decidedAt), durationWeeks: r.durationWeeks,
      lastOn: r.lastOn, count: Number(r.count), today: p.today,
      totalSessions: r.totalSessions, sessionsPerWeek: r.sessionsPerWeek, executed: Number(r.executed), lastSessionOn: r.lastSessionOn }) }))
    .filter((r) => r.due.state === "baseline" || r.due.state === "due")
    .sort((a, b) => b.due.overdueDays - a.due.overdueDays);
}

export async function planHasAssessments(planId: number): Promise<boolean> {
  const [r] = await db.select({ id: physioAssessments.id }).from(physioAssessments).where(eq(physioAssessments.planId, planId)).limit(1);
  return Boolean(r);
}
