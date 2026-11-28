// **تشغيلُ وظيفةٍ واحدة** (§4.ha الفقرة ٣.٥): يقرأ ⟵ يكتب (ويبحث) ⟵ البوّابات ⟵ المراجعُ المستقلّ ⟵ (خارج المكتبة: المدقّقُ المستقلّ) ⟵ يحفظ.
// الكاتبُ يُصلح جولتين بعد المراجع؛ وبعدها تبقى الملاحظاتُ «لم تُحلّ»: الحرجةُ تُفشل الوظيفة، والكبيرةُ يُقرّ بها المعتمِد، والصغيرةُ للعلم.
// ونقاطُ استئناف: بعد قبول الكاتب (والمراجع)، وقبل المدقّق، وقبل الحفظ — فإعادةُ النشر لا تُعيد الكاتب إن تجاوزه.
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  AUTO_TRIGGERS, gatesStageNote, researchStageNote, reviewStageNote, MAX_QUESTION_ROUNDS, MAX_WRITER_ROUNDS, OPUS_MODEL_ID, parseAudit, parseDecline, parseNewFinding, parseQuestions, parseReview,
  parseSubmittedPlan, type AgentQuestion, type Audit, type Decline, type Issue, type NewFinding, type Review, type SubmittedPlan,
} from "@shared/physio_agent";
import { applyPlanGates, type GateLogEntry, type GatedPlan } from "@shared/physio_agent_gates";
import { examAgentGate } from "../physio_exam_reviews/store";
import { buildAgentContext, buildGateContext, fingerprintOf, loadExam, newestV2ExamId, type AgentContext } from "./context";
import { runConversation, type RunCtx, type TerminalResult, type TraceEntry, type Usage } from "./conversation";
import { AgentFatal, AgentStop, type AgentRole } from "./model";
import { QUESTION_LIMIT_ERROR } from "./prompts";
import { hasActivePlan, type JobRecord } from "./store";
import { createPlanFromAgentTx } from "./plans";

export type Outcome =
  | { kind: "questions"; questions: AgentQuestion[]; result: Record<string, any> }
  | { kind: "declined"; decline: Decline; result: Record<string, any> }
  | { kind: "new_finding"; finding: NewFinding; result: Record<string, any> }
  | { kind: "succeeded"; planId: number }
  | { kind: "failed"; code: string; detail?: string | null; result?: Record<string, any> }
  | { kind: "cancelled"; code: string; result?: Record<string, any> }
  | { kind: "done" };

export interface Runtime {
  me: string;
  signal: AbortSignal;
  sleep(ms: number): Promise<void>;
  setStage(stage: string): Promise<void>;
  saveCheckpoint(cp: Record<string, any>): Promise<void>;
  /** ملاحظةٌ قصيرة على المرحلة الجارية تُعرض تحتها («حذفت البوّاباتُ جهازاً»). بلا محتوى الخطّة. */
  noteStage?(stage: string, noteAr: string): Promise<void>;
  onRetry(role: AgentRole, attempt: number, e: unknown): void;
  onPrivacyStop(kinds: string[]): Promise<void>;
}

/** نقطةُ اختبارٍ بعد كلّ نقطة استئناف — تُطلق `AgentStop` فتُحاكي إعادةَ النشر في منتصف التشغيل. */
let hook: ((point: string) => void) | null = null;
export function setPipelineHookForTests(fn: ((point: string) => void) | null): void { hook = fn; }

const emptyUsage = (): Usage => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, turns: 0 });

/** **هل تُشغَّل؟** — البوّابةُ والبصمةُ وأنّها الأحدث والمريضُ حيّ، وللتلقائيّ: لا خطّةَ قائمة. صفرُ نداءٍ للنموذج إن لا. */
export async function assertRunnable(job: JobRecord, ex: any = db): Promise<string | null> {
  const exam = await loadExam(ex, job.examId);
  if (!exam || exam.cancelled) return "exam_cancelled";
  const p = ((await ex.execute(sql`SELECT deleted_at FROM patients WHERE id = ${job.patientId}`)).rows ?? [])[0] as any;
  if (!p || p.deleted_at) return "patient_deleted";
  if (fingerprintOf(exam) !== job.examFingerprint) return "exam_changed";
  if ((await newestV2ExamId(ex, job.patientId)) !== job.examId) return "superseded_by_newer_exam";
  if (!(await examAgentGate(job.examId, ex)).allowed) return "gate_closed";
  if (AUTO_TRIGGERS.includes(job.trigger) && await hasActivePlan(ex, job.patientId)) return "has_active_plan";
  return null;
}

interface State {
  drafts: GatedPlan[]; reviews: (Review & { round: number })[]; audits: (Audit & { round: number })[]; gateLog: GateLogEntry[];
  unresolved: { reviewer: Issue[]; auditor: Issue[] }; submissions: number; auditFixUsed: boolean; auditPending: boolean;
  accepted: SubmittedPlan | null; acceptedGated: GatedPlan | null; decline?: Decline; newFinding?: NewFinding;
}

export async function runJob(job: JobRecord, rt: Runtime): Promise<Outcome> {
  await rt.setStage("reading");
  const notRunnable = await assertRunnable(job);
  if (notRunnable) return { kind: "cancelled", code: notRunnable };
  const cp = job.checkpoint ?? {};
  const web = webCountsOf(cp.webCounts);
  const ctxA: AgentContext = await buildAgentContext(job, db, web.writer);
  const runCtx: RunCtx = {
    ids: ctxA.ids, signal: rt.signal, sleep: rt.sleep,
    checkpoint: () => { if (rt.signal.aborted) { const r = (rt.signal as any).reason; throw r instanceof AgentStop ? r : new AgentStop("cancel"); } },
    usage: { writer: emptyUsage(), reviewer: emptyUsage(), auditor: emptyUsage(), ...(cp.usage ?? {}) }, web,
    fetched: new Set<string>(cp.fetchedUrls ?? []), searched: new Set<string>(cp.searchedUrls ?? []), trace: [] as TraceEntry[],
    onResearch: () => { if (stageNow === "writing") { stageNow = "research"; rt.setStage("research").catch(() => {}); } },
    onRetry: rt.onRetry, onPrivacyStop: rt.onPrivacyStop,
    onRefusal: (role, details) => { refusalsSeen.push({ role, category: (details as any)?.category ?? null }); },
  };
  const refusalsSeen: { role: AgentRole; category: string | null }[] = [];
  //  تُنتظر قبل المرحلة التالية، وعلى مرحلتها بعينها (`noteStage` في العامل) — وإخفاقُها لا يوقف الوظيفة.
  const note = async (stage: string, noteAr: string) => { await rt.noteStage?.(stage, noteAr).catch(() => {}); };
  let stageNow = "reading";
  const st: State = {
    drafts: cp.drafts ?? [], reviews: cp.reviews ?? [], audits: cp.audits ?? [], gateLog: cp.gateLog ?? [],
    unresolved: cp.unresolved ?? { reviewer: [], auditor: [] }, submissions: 0, auditFixUsed: false, auditPending: false,
    accepted: cp.accepted ?? null, acceptedGated: cp.acceptedGated ?? null,
  };
  const resultOf = (): Record<string, any> => ({
    model: OPUS_MODEL_ID, drafts: st.drafts, reviews: st.reviews, audits: st.audits, gateLog: st.gateLog, unresolved: st.unresolved,
    ...(st.decline ? { decline: st.decline } : {}), ...(st.newFinding ? { newFinding: st.newFinding } : {}),
    sources: st.acceptedGated?.sources ?? [], fetchedUrls: Array.from(runCtx.fetched), searchedUrls: Array.from(runCtx.searched).slice(0, 500),
    usage: { ...runCtx.usage, web, webSearches: web.writer.searches + web.reviewer.searches + web.auditor.searches,
      webFetches: web.writer.fetches + web.reviewer.fetches + web.auditor.fetches }, trace: runCtx.trace.slice(0, 400),
    ...(refusalsSeen.length ? { refusals: refusalsSeen } : {}),
  });
  const checkpointNow = async (stage: string) => {
    await rt.saveCheckpoint({ stage, accepted: st.accepted, acceptedGated: st.acceptedGated, drafts: st.drafts, reviews: st.reviews, audits: st.audits,
      gateLog: st.gateLog, unresolved: st.unresolved, fetchedUrls: Array.from(runCtx.fetched), searchedUrls: Array.from(runCtx.searched),
      webCounts: web, usage: runCtx.usage });
    hook?.(`after_checkpoint_${stage}`);
  };
  const gateFor = async (plan: SubmittedPlan, final: boolean, round: number) => {
    const g = await buildGateContext(db, { patientId: job.patientId, examId: job.examId, branchId: job.branchId,
      protocolId: plan.mode === "library" ? plan.protocolId : null,
      exerciseIds: [...plan.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId ?? 0)), ...plan.exerciseChanges.map((c) => c.toExerciseId ?? 0)],
      fetched: runCtx.fetched, searched: runCtx.searched, final, at: `round_${round}`, agentGate: await examAgentGate(job.examId) });
    return applyPlanGates(plan, g);
  };
  const reviewInput = (plan: GatedPlan, gateLog: GateLogEntry[], round: number) =>
    `REVIEW TASK — round ${round}. The examination context the writer had is CONTEXT (JSON). The plan after the deterministic gates is PLAN (JSON); GATE_LOG lists what the code removed or clamped.\nCONTEXT:\n${ctxA.initialUser}\nPLAN:\n${JSON.stringify(plan)}\nGATE_LOG:\n${JSON.stringify(gateLog)}`;
  const auditInput = (plan: GatedPlan, round: number) =>
    `AUDIT TASK — out-of-library plan, round ${round}. CONTEXT (JSON) is the examination context; PLAN (JSON) is the plan after the gates; FETCHED lists the URLs the writer opened.\nCONTEXT:\n${ctxA.initialUser}\nPLAN:\n${JSON.stringify(plan)}\nFETCHED:\n${JSON.stringify(Array.from(runCtx.fetched))}`;

  type Sub = { kind: "review"; review: Review } | { kind: "audit"; audit: Audit } | { kind: "declined"; decline: Decline } | { kind: "new_finding"; finding: NewFinding };
  const runReviewer = async (plan: GatedPlan, gateLog: GateLogEntry[], round: number): Promise<Sub> => {
    stageNow = "review"; await rt.setStage("review");
    return await runConversation("reviewer", reviewInput(plan, gateLog, round), runCtx, async (name, input): Promise<TerminalResult> => {
      if (name === "submit_review") { const r = parseReview(input); return r.ok ? { kind: "done", outcome: { kind: "review", review: r.value } } : { kind: "continue", isError: true, content: JSON.stringify({ errors: r.errors }) }; }
      if (name === "decline_plan") { const r = parseDecline(input, "reviewer"); return r.ok ? { kind: "done", outcome: { kind: "declined", decline: r.value } } : { kind: "continue", isError: true, content: JSON.stringify({ errors: r.errors }) }; }
      const r = parseNewFinding(input); return r.ok ? { kind: "done", outcome: { kind: "new_finding", finding: r.value } } : { kind: "continue", isError: true, content: JSON.stringify({ errors: r.errors }) };
    }) as Sub;
  };
  const runAuditor = async (plan: GatedPlan, round: number): Promise<Sub> => {
    stageNow = "audit"; await rt.setStage("audit");
    return await runConversation("auditor", auditInput(plan, round), runCtx, async (name, input): Promise<TerminalResult> => {
      if (name === "submit_audit") { const r = parseAudit(input); return r.ok ? { kind: "done", outcome: { kind: "audit", audit: r.value } } : { kind: "continue", isError: true, content: JSON.stringify({ errors: r.errors }) }; }
      const r = parseNewFinding(input); return r.ok ? { kind: "done", outcome: { kind: "new_finding", finding: r.value } } : { kind: "continue", isError: true, content: JSON.stringify({ errors: r.errors }) };
    }) as Sub;
  };
  const subOutcome = (s: Sub): Outcome | null => {
    if (s.kind === "declined") { st.decline = s.decline; return { kind: "declined", decline: s.decline, result: resultOf() }; }
    if (s.kind === "new_finding") { st.newFinding = s.finding; return { kind: "new_finding", finding: s.finding, result: resultOf() }; }
    return null;
  };

  try {
    return await runStages();
  } catch (e) {
    //  الإخفاقُ النهائيّ يحمل ما جرى حتى لحظته (المسوّدات والمراجعات والاستهلاك والأثر) — فلا يمحو السجلَّ.
    if (e instanceof AgentFatal) e.result = resultOf();
    else if (e && typeof e === "object" && !(e instanceof AgentStop)) (e as any).agentResult = resultOf();
    throw e;
  }

  async function runStages(): Promise<Outcome> {
    let outcome: Outcome | null = null;
    // ══ الكاتب (ما لم يتجاوزه الاستئناف) ══
    if (!st.accepted) {
      stageNow = "writing"; await rt.setStage("writing");
      const writerOut = await runConversation("writer", ctxA.initialUser, runCtx, async (name, input): Promise<TerminalResult> => {
        const err = (errors: string[]): TerminalResult => ({ kind: "continue", isError: true, content: JSON.stringify({ errors }) });
        if (name === "ask_questions") {
          if (job.questionRounds >= MAX_QUESTION_ROUNDS) return { kind: "continue", isError: true, content: QUESTION_LIMIT_ERROR };
          const q = parseQuestions(input);
          return q.ok ? { kind: "done", outcome: { kind: "questions", questions: q.value, result: resultOf() } } : err(q.errors);
        }
        if (name === "decline_plan") {
          const d = parseDecline(input, "writer");
          if (!d.ok) return err(d.errors);
          st.decline = d.value; return { kind: "done", outcome: { kind: "declined", decline: d.value, result: resultOf() } };
        }
        if (name === "report_new_finding") {
          const f = parseNewFinding(input);
          if (!f.ok) return err(f.errors);
          st.newFinding = f.value; return { kind: "done", outcome: { kind: "new_finding", finding: f.value, result: resultOf() } };
        }
        // ── submit_plan ──
        const parsed = parseSubmittedPlan(input);
        if (!parsed.ok) return err(parsed.errors);
        const plan = parsed.value;
        st.submissions += 1;
        const round = st.submissions;
        const auditRound = st.auditPending;
        const final = round >= 1 + MAX_WRITER_ROUNDS || auditRound;
        if (runCtx.fetched.size) await note(stageNow, researchStageNote(runCtx.fetched.size));
        stageNow = "gates"; await rt.setStage("gates");
        const g = await gateFor(plan, final, round);
        st.gateLog.push(...g.log);
        st.drafts.push(g.plan);
        { const byGate = g.plan.removed.filter((r) => r.by === "gate").length;
          const changed = g.log.filter((e) => e.kind === "removed" || e.kind === "clamped").length;
          await note("gates", gatesStageNote(byGate, Math.max(0, changed - byGate))); }
        if (g.blocking.length) {
          if (!final) return { kind: "continue", isError: false, content: JSON.stringify({ status: "revise", round, blockingGateIssues: g.blocking, reviewerIssues: [], auditorIssues: [], gateLog: g.log }) };
          const code = g.blocking.some((b) => b.code === "empty_plan") ? "empty_plan" : "gates_blocking";
          return { kind: "done", outcome: { kind: "failed", code, detail: g.blocking.map((b) => b.code).join(","), result: resultOf() } };
        }
        const rv = await runReviewer(g.plan, g.log, round);
        const so = subOutcome(rv);
        if (so) return { kind: "done", outcome: so };
        const review = (rv as { kind: "review"; review: Review }).review;
        st.reviews.push({ ...review, round });
        await note("review", reviewStageNote(review.verdict, review.issues.length, "reviewer"));
        if (auditRound) {
          //  جولةُ المدقّق: المراجعُ مرّةً على التعديل، ثمّ المدقّقُ مرّةً أخيرة — وما بقي «لم يُحلّ».
          st.auditPending = false;
          st.unresolved.reviewer = review.verdict === "revise" ? review.issues : [];
          const au = await runAuditor(g.plan, round);
          const ao = subOutcome(au);
          if (ao) return { kind: "done", outcome: ao };
          const audit = (au as { kind: "audit"; audit: Audit }).audit;
          st.audits.push({ ...audit, round });
          await note("audit", reviewStageNote(audit.verdict, audit.issues.length, "auditor"));
          st.unresolved.auditor = audit.verdict === "concerns" ? audit.issues : [];
          st.accepted = plan; st.acceptedGated = g.plan;
          return { kind: "done", outcome: { kind: "done" } };
        }
        if (review.verdict === "revise" && round < 1 + MAX_WRITER_ROUNDS) {
          return { kind: "continue", isError: false, content: JSON.stringify({ status: "revise", round, blockingGateIssues: [], reviewerIssues: review.issues, auditorIssues: [], gateLog: g.log }) };
        }
        st.unresolved.reviewer = review.verdict === "revise" ? review.issues : [];
        st.accepted = plan; st.acceptedGated = g.plan;
        if (plan.mode === "out_of_library" && st.audits.length === 0) {
          await checkpointNow("audit");
          const au = await runAuditor(g.plan, round);
          const ao = subOutcome(au);
          if (ao) return { kind: "done", outcome: ao };
          const audit = (au as { kind: "audit"; audit: Audit }).audit;
          st.audits.push({ ...audit, round });
          await note("audit", reviewStageNote(audit.verdict, audit.issues.length, "auditor"));
          if (audit.verdict === "concerns" && !st.auditFixUsed) {
            st.auditFixUsed = true; st.auditPending = true; st.accepted = null; st.acceptedGated = null;
            return { kind: "continue", isError: false, content: JSON.stringify({ status: "revise", round, blockingGateIssues: [], reviewerIssues: [], auditorIssues: audit.issues, gateLog: g.log }) };
          }
          st.unresolved.auditor = audit.verdict === "concerns" ? audit.issues : [];
        }
        return { kind: "done", outcome: { kind: "done" } };
      }) as Outcome;
      if (writerOut.kind !== "done") return writerOut;
      await checkpointNow("saving");
    } else if (cp.stage === "audit" && st.acceptedGated && st.audits.length === 0) {
      //  الاستئنافُ عند المدقّق: محادثةٌ جديدة، ولا جولةَ إصلاحٍ بعدها (محادثةُ الكاتب لم تُحفظ).
      const au = await runAuditor(st.acceptedGated, st.reviews.length);
      const ao = subOutcome(au);
      if (ao) return ao;
      const audit = (au as { kind: "audit"; audit: Audit }).audit;
      st.audits.push({ ...audit, round: st.reviews.length });
      await note("audit", reviewStageNote(audit.verdict, audit.issues.length, "auditor"));
      st.unresolved.auditor = audit.verdict === "concerns" ? audit.issues : [];
      await checkpointNow("saving");
    }
    void outcome;
    // ══ ما لم يُحلّ ══
    const critical = [...st.unresolved.reviewer, ...st.unresolved.auditor].filter((i) => i.severity === "critical");
    if (critical.length) return { kind: "failed", code: "unresolved_critical", detail: critical.map((i) => i.id).join(","), result: resultOf() };
    // ══ الحفظ ══
    stageNow = "saving"; await rt.setStage("saving");
    runCtx.checkpoint();
    const saved = await createPlanFromAgentTx(job, rt.me, st.accepted!, resultOf(), { fetched: runCtx.fetched, searched: runCtx.searched });
    if (saved.kind === "succeeded") return { kind: "succeeded", planId: saved.planId };
    return { kind: "done" };
  }
}

/** عدّاداتُ البحث لكلّ دور من نقطة الاستئناف — والشكلُ القديم (عدّادٌ واحد) يُقرأ للكاتب. */
export function webCountsOf(raw: any): Record<AgentRole, { searches: number; fetches: number }> {
  const one = (x: any) => ({ searches: Number(x?.searches ?? 0) || 0, fetches: Number(x?.fetches ?? 0) || 0 });
  if (raw && (raw.writer || raw.reviewer || raw.auditor)) return { writer: one(raw.writer), reviewer: one(raw.reviewer), auditor: one(raw.auditor) };
  return { writer: one(raw), reviewer: one(null), auditor: one(null) };
}
