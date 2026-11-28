// **نتائجُ العلاج الطبيعي** (§4.cp — المرحلةُ ٦ب، القرار ٥) — قراءةٌ محضة فوق الخطط وتقييماتها وجلساتها.
//
// الخطّةُ تدخل التقرير إن اعتُمدت (معتمَدةٌ أو متخرّجة) أو أُوقفت بعد نشاط (جلسةٍ أو تقييم) — ويومُ اعتمادها داخل الفترة.
// ولكلّ خطّة: حكمُ أوّل تقييمٍ وآخره (`compareAssessments`)، والالتزامُ بعدد الجلسات (`adherence`)، وهل تأخّر تقييمُها (`assessmentDue`).
// والمعالجُ «الرئيسيّ» مَن نفّذ أكثرَ جلساتها.
import { sortBranchesForDisplay, sortByBranchDisplay } from "@shared/branch_order";
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
    sessionsPerWeek: physioPlans.sessionsPerWeek, durationWeeks: physioPlans.durationWeeks, totalSessions: physioPlans.totalSessions,
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
  //  §4.hc — جلسةُ خطّة Bionic AI بجزأين تُنسب لمسجِّل كلّ جزء (مرّةً لكلٍّ منهما)؛ والعددُ المنفَّذ جلساتٌ لا أجزاء.
  const sessions = (await db.execute(sql`
    SELECT s.plan_id, COALESCE(sp.part, 'whole') AS part, COALESCE(sp.recorded_by, s.executed_by) AS executed_by,
           max(COALESCE(sp.recorded_by_name, s.executed_by_name)) AS name,
           count(DISTINCT s.id)::int AS n, max(s.session_date)::text AS last_on
      FROM physio_plan_sessions s LEFT JOIN physio_plan_session_parts sp ON sp.session_id = s.id
     WHERE s.plan_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND s.cancelled_at IS NULL
     GROUP BY s.plan_id, COALESCE(sp.part, 'whole'), COALESCE(sp.recorded_by, s.executed_by)`)).rows as any[];
  const totals = new Map(((await db.execute(sql`SELECT plan_id, count(*)::int AS n FROM physio_plan_sessions
     WHERE plan_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND cancelled_at IS NULL GROUP BY plan_id`)).rows as any[]).map((r) => [Number(r.plan_id), Number(r.n)]));
  const byPlan = new Map<number, typeof assess>();
  for (const a of assess) { if (!byPlan.has(a.planId)) byPlan.set(a.planId, []); byPlan.get(a.planId)!.push(a); }
  return plans.map((p) => {
    const list = byPlan.get(p.id) ?? [];
    const verdict: Verdict = list.length >= 2 ? compareAssessments(list[0] as any, list[list.length - 1] as any).verdict : "insufficient";
    const ses = sessions.filter((s) => Number(s.plan_id) === p.id);
    const executed = totals.get(p.id) ?? 0;
    //  §4.hc — الأكثرُ جلساتٍ في كلّ جزء (الأجهزة · التمارين · الجلسةُ غيرُ المقسومة) يُنسب له؛ فمعالجا الجلسة المقسومة كلاهما.
    const tops = new Map<string, any>();
    for (const s of ses) {
      const k = String(s.part); const cur = tops.get(k);
      if (!cur || Number(s.n) > Number(cur.n) || (Number(s.n) === Number(cur.n) && Number(s.executed_by ?? 0) < Number(cur.executed_by ?? 0))) tops.set(k, s);
    }
    const topList = Array.from(tops.values());
    const executors = Array.from(new Map(topList.filter((t) => t.executed_by)
      .map((t) => [`u${t.executed_by}`, { key: `u${t.executed_by}`, name: String(t.name ?? "—") }] as const)).values());
    const top = topList.slice().sort((a, b) => Number(b.n) - Number(a.n))[0];
    const approvedOn = baghdadDayOf(p.decidedAt);
    const endOn = baghdadDayOf(p.status === "graduated" ? p.graduatedAt : p.status === "stopped" ? p.stoppedAt : null);
    const lastSessionOn = ses.reduce<string | null>((a, s) => (s.last_on && (!a || s.last_on > a) ? String(s.last_on) : a), null);
    const due = assessmentDue({ status: p.status, approvedOn, durationWeeks: p.durationWeeks, lastOn: list.length ? String(list[list.length - 1].assessedOn) : null,
      count: list.length, today: f.today, totalSessions: p.totalSessions, sessionsPerWeek: p.sessionsPerWeek, executed, lastSessionOn });
    return {
      planId: p.id, status: p.status, verdict,
      adherence: adherence({ approvedOn, endOn, today: f.today, sessionsPerWeek: p.sessionsPerWeek, durationWeeks: p.durationWeeks, executed,
        totalSessions: p.totalSessions }),
      overdue: (due.state === "baseline" || due.state === "due") && due.overdueDays > 7,
      protocolKey: p.protocolId ? `p${p.protocolId}` : "none", protocolTitle: p.protocolTitle ?? "بلا بروتوكول",
      branchKey: `b${p.branchId}`, branchName: p.branchName ?? `#${p.branchId}`,
      specialistKey: p.createdBy ? `u${p.createdBy}` : "none", specialistName: p.createdByName ?? "—",
      executorKey: top?.executed_by ? `u${top.executed_by}` : "none", executorName: top ? String(top.name ?? "—") : "لم تُنفَّذ جلسة",
      executors,
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
    byBranch: sortByBranchDisplay(summarizeOutcomes(rows, (r) => [r.branchKey, r.branchName]), (g) => g.name), //  بترتيب العرض الواحد (§4.gt)
    bySpecialist: summarizeOutcomes(rows, (r) => [r.specialistKey, r.specialistName]),
    byExecutor: summarizeOutcomes(rows.flatMap((r) => (r.executors?.length ? r.executors : [{ key: r.executorKey, name: r.executorName }])
      .map((e) => ({ ...r, executorKey: e.key, executorName: e.name }))), (r) => [r.executorKey, r.executorName]),
    overdue: rows.filter((r) => r.overdue).map((r) => ({ planId: r.planId, titleAr: r.titleAr, patientName: r.patientName, patientCode: r.patientCode,
      branchName: r.branchName, specialistName: r.specialistName })).slice(0, 100),
  };
}

/** فروعُ مرشِّح الصفحة — لمَن نطاقُه كلُّ الفروع. */
export async function branchList() {
  return sortBranchesForDisplay(await db.select({ id: branches.id, name: branches.name, temporarilyClosed: branches.temporarilyClosed }).from(branches))
    .map((b) => ({ id: b.id, name: b.name })); //  بترتيب العرض الواحد (§4.gt)
}
