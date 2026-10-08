// **نتائجُ العلاج الطبيعي** (§4.cp — المرحلةُ ٦ب، القرار ٥) — قراءةٌ محضة فوق الخطط وتقييماتها وجلساتها.
//
// الخطّةُ تدخل التقرير إن اعتُمدت (معتمَدةٌ أو متخرّجة) أو أُوقفت بعد نشاط (جلسةٍ أو تقييم) — ويومُ اعتمادها داخل الفترة.
// ولكلّ خطّة: حكمُ أوّل تقييمٍ وآخره (`compareAssessments`)، والالتزامُ بعدد الجلسات (`adherence`)، وهل تأخّر تقييمُها (`assessmentDue`).
// والمعالجُ «الرئيسيّ» مَن نفّذ أكثرَ جلساتها.
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { branches, patients, physioAssessments, physioPlans, physioProtocols } from "@shared/schema";
import {
  adherence, assessmentDue, compareAssessments, groupOf, summarizeOutcomes, type PlanOutcome, type Verdict,
} from "@shared/physio_assessments";
import { baghdadDayOf } from "./assessments";

export interface OutcomeFilter { branchIds: number[] | null; createdBy: number | null; from: string; to: string; today: string }

export async function planOutcomes(f: OutcomeFilter): Promise<(PlanOutcome & { patientName: string; patientCode: string | null; titleAr: string; approvedOn: string | null })[]> {
  const conds: any[] = [isNull(patients.deletedAt), sql`${physioPlans.decidedAt} IS NOT NULL`,
    sql`(${physioPlans.status} IN ('approved','graduated') OR (${physioPlans.status} = 'stopped' AND (
      EXISTS (SELECT 1 FROM physio_plan_sessions s WHERE s.plan_id = "physio_plans"."id" AND s.cancelled_at IS NULL)
      OR EXISTS (SELECT 1 FROM physio_assessments a WHERE a.plan_id = "physio_plans"."id"))))`,
    sql`((${physioPlans.decidedAt} AT TIME ZONE 'Asia/Baghdad')::date BETWEEN ${f.from}::date AND ${f.to}::date)`];
  if (f.branchIds) conds.push(f.branchIds.length ? inArray(physioPlans.branchId, f.branchIds) : sql`false`);
  if (f.createdBy) conds.push(eq(physioPlans.createdBy, f.createdBy));
  const plans = await db.select({
    id: physioPlans.id, status: physioPlans.status, titleAr: physioPlans.titleAr, branchId: physioPlans.branchId, branchName: branches.name,
    protocolId: physioPlans.protocolId, protocolTitle: physioProtocols.titleAr, createdBy: physioPlans.createdBy, createdByName: physioPlans.createdByName,
    decidedAt: physioPlans.decidedAt, graduatedAt: physioPlans.graduatedAt, stoppedAt: physioPlans.stoppedAt,
    sessionsPerWeek: physioPlans.sessionsPerWeek, durationWeeks: physioPlans.durationWeeks,
    patientName: patients.name, patientCode: patients.patientCode,
  }).from(physioPlans)
    .innerJoin(patients, eq(patients.id, physioPlans.patientId))
    .leftJoin(branches, eq(branches.id, physioPlans.branchId))
    .leftJoin(physioProtocols, eq(physioProtocols.id, physioPlans.protocolId))
    .where(and(...conds)).limit(5000);
  if (!plans.length) return [];
  const ids = plans.map((p) => p.id);
  const assess = await db.select().from(physioAssessments).where(inArray(physioAssessments.planId, ids))
    .orderBy(asc(physioAssessments.assessedOn), asc(physioAssessments.id));
  const sessions = (await db.execute(sql`
    SELECT plan_id, executed_by, max(executed_by_name) AS name, count(*)::int AS n
      FROM physio_plan_sessions WHERE plan_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND cancelled_at IS NULL
     GROUP BY plan_id, executed_by`)).rows as any[];
  const byPlan = new Map<number, typeof assess>();
  for (const a of assess) { if (!byPlan.has(a.planId)) byPlan.set(a.planId, []); byPlan.get(a.planId)!.push(a); }
  return plans.map((p) => {
    const list = byPlan.get(p.id) ?? [];
    const verdict: Verdict = list.length >= 2 ? compareAssessments(list[0] as any, list[list.length - 1] as any).verdict : "insufficient";
    const ses = sessions.filter((s) => Number(s.plan_id) === p.id);
    const executed = ses.reduce((a, s) => a + Number(s.n), 0);
    const top = ses.slice().sort((a, b) => Number(b.n) - Number(a.n))[0];
    const approvedOn = baghdadDayOf(p.decidedAt);
    const endOn = baghdadDayOf(p.status === "graduated" ? p.graduatedAt : p.status === "stopped" ? p.stoppedAt : null);
    const due = assessmentDue({ status: p.status, approvedOn, durationWeeks: p.durationWeeks, lastOn: list.length ? String(list[list.length - 1].assessedOn) : null,
      count: list.length, today: f.today });
    return {
      planId: p.id, status: p.status, verdict,
      adherence: adherence({ approvedOn, endOn, today: f.today, sessionsPerWeek: p.sessionsPerWeek, durationWeeks: p.durationWeeks, executed }),
      overdue: (due.state === "baseline" || due.state === "due") && due.overdueDays > 7,
      protocolKey: p.protocolId ? `p${p.protocolId}` : "none", protocolTitle: p.protocolTitle ?? "بلا بروتوكول",
      branchKey: `b${p.branchId}`, branchName: p.branchName ?? `#${p.branchId}`,
      specialistKey: p.createdBy ? `u${p.createdBy}` : "none", specialistName: p.createdByName ?? "—",
      executorKey: top?.executed_by ? `u${top.executed_by}` : "none", executorName: top ? String(top.name ?? "—") : "لم تُنفَّذ جلسة",
      patientName: p.patientName, patientCode: p.patientCode, titleAr: p.titleAr, approvedOn,
    };
  });
}

/** التقريرُ كاملاً: الإجماليّ، وحسب البروتوكول والفرع والأخصائيّ والمعالج، والمتأخّرون. */
export async function outcomesReport(f: OutcomeFilter) {
  const rows = await planOutcomes(f);
  return {
    period: { from: f.from, to: f.to },
    totals: groupOf("all", "الكلّ", rows),
    byProtocol: summarizeOutcomes(rows, (r) => [r.protocolKey, r.protocolTitle]),
    byBranch: summarizeOutcomes(rows, (r) => [r.branchKey, r.branchName]),
    bySpecialist: summarizeOutcomes(rows, (r) => [r.specialistKey, r.specialistName]),
    byExecutor: summarizeOutcomes(rows, (r) => [r.executorKey, r.executorName]),
    overdue: rows.filter((r) => r.overdue).map((r) => ({ planId: r.planId, titleAr: r.titleAr, patientName: r.patientName, patientCode: r.patientCode,
      branchName: r.branchName, specialistName: r.specialistName })).slice(0, 100),
  };
}

/** فروعُ مرشِّح الصفحة — لمَن نطاقُه كلُّ الفروع. */
export async function branchList() {
  return db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(asc(branches.id));
}
