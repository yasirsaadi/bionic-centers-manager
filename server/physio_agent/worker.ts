// **العاملُ في الخلفية** (§4.ha الفقرة ٤.٤) — لا يعمل الوكيلُ على طلب HTTP (Cloudflare يقطعه نحو ١٠٠ ثانية): نبضٌ كلَّ ١٥ ثانية يستعيد الوظائفَ
// الميتة، ويصالح ما ضاع، ويأخذ وظيفةً بـ`FOR UPDATE SKIP LOCKED`. وأثناء التشغيل **نبضٌ بالمؤقّت** كلَّ ٣٠ ثانية مستقلٌّ عن البثّ (صمتُ دقائق
// بين أحداث البثّ لا يُفقد الوظيفة)، ومهلةُ ساعتين، والإيقافُ يصل خلال نبضة، وإطفاءُ الخادم يعيدها للطابور **بلا** احتساب إخفاق.
import os from "os";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { JOB_ERROR_TEXTS, JOB_STAGE_LABELS, type JobStage } from "@shared/physio_agent";
import { AgentFatal, AgentStop, agentEnabled } from "./model";
import { TransientExhausted } from "./conversation";
import { runJob, type Outcome } from "./pipeline";
import { jobOf, lostRequestNoticeTx, notifyApproversTx, notifyExaminerTx, questionCheckpoint, signalJob, type JobRecord } from "./store";
import { stripNoteEcho } from "@shared/physio_agent_privacy";
import { reconcilerScan, setWorkerNudge } from "./reconcile";

const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];

export const INSTANCE_ID = `${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
//  مهلةُ التشغيل ستُّ ساعات: جولةُ `xhigh` بمخرجٍ طويل قد تأخذ نصفَ ساعة، والكاتبُ والمراجعُ (ثلاثُ جولات) والمدقّقُ وإعاداتُ الخدمة قد تتجاوز ساعتين —
//  والمالكُ: «الوقتُ والكلفة لا يهمّان».
const DEFAULT_RUN_CAP_MS = 6 * 3600_000;
const timing = { tickMs: 15_000, heartbeatMs: 30_000, staleMs: 5 * 60_000, runCapMs: Number(process.env.PHYSIO_AGENT_RUN_CAP_MS) || DEFAULT_RUN_CAP_MS };
const REQUEUE_BACKOFF_MS = [2 * 60_000, 10 * 60_000, 30 * 60_000, 60 * 60_000];
export function setAgentTimingForTests(t: Partial<typeof timing> | null): void {
  Object.assign(timing, t ?? { tickMs: 15_000, heartbeatMs: 30_000, staleMs: 5 * 60_000, runCapMs: DEFAULT_RUN_CAP_MS });
}
let sleepImpl: (ms: number, signal: AbortSignal) => Promise<void> = (ms, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) return reject(signal.reason);
  const t = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
  const onAbort = () => { clearTimeout(t); reject(signal.reason); };
  signal.addEventListener("abort", onAbort, { once: true });
});
export function setAgentSleepForTests(fn: ((ms: number, signal: AbortSignal) => Promise<void>) | null): void {
  sleepImpl = fn ?? ((ms, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(signal.reason); };
    signal.addEventListener("abort", onAbort, { once: true });
  }));
}

const inflight = new Map<number, { ac: AbortController; token: string; done: Promise<void> }>();

/** **أخذُ وظيفة** — واحدةٌ لكلّ نداء، ولا يأخذ اثنان الوظيفةَ نفسَها (`SKIP LOCKED`). و`locked_by` **رمزٌ لكلّ أخذ** (`<العامل>:<عشوائيّ>`)
 *  لا اسمُ العامل وحده: تشغيلٌ قديم استُعيدت وظيفتُه ثمّ أخذها العاملُ نفسُه ثانيةً لا يطابق رمزَها الجديد فيقف. */
export async function claimOne(me = INSTANCE_ID): Promise<JobRecord | null> {
  const token = `${me}:${randomUUID().slice(0, 8)}`;
  return db.transaction(async (tx) => {
    const r = rows(await tx.execute(sql`
      WITH c AS (SELECT id FROM physio_agent_jobs
                  WHERE status = 'queued' AND NOT cancel_requested AND run_after <= now() AND failures < max_failures
                  ORDER BY run_after, id FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE physio_agent_jobs j SET status = 'running', locked_at = now(), locked_by = ${token}, heartbeat_at = now(), runs = j.runs + 1,
             started_at = COALESCE(j.started_at, now()), stage = 'reading', updated_at = now()
        FROM c WHERE j.id = c.id RETURNING j.*`))[0];
    if (!r) return null;
    const job = jobOf(r);
    await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: "claim", userName: "Claude Opus", branchId: job.branchId,
      newValues: { by: token, run: job.runs, failures: job.failures }, notes: "بدأ Opus العملَ على الوظيفة", tx });
    return job;
  });
}

/** **استعادةُ الميتة** — بلا نبضٍ ٥ دقائق: الملغاةُ بطلبٍ تُلغى، وغيرُها يعود للطابور بإخفاقٍ محسوب، وعند الحدّ `worker_lost`. */
export async function recoverStale(): Promise<number> {
  //  المنتظرةُ بطلب إلغاء (`release` قبل النبضة التالية ثمّ إطفاء) لا يأخذها أحدٌ أبداً — تُلغى هنا فلا تحبس المريض.
  const parked = rows(await db.execute(sql`SELECT id FROM physio_agent_jobs WHERE status = 'queued' AND cancel_requested`)).map((r) => Number(r.id));
  for (const id of parked) {
    await db.transaction(async (tx) => {
      const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${id} AND status = 'queued' AND cancel_requested FOR UPDATE SKIP LOCKED`))[0];
      if (!cur) return;
      const job = jobOf(cur);
      const code = job.cancelReason ?? "cancelled_by_user";
      await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = ${code}, error = ${JOB_ERROR_TEXTS[code] ?? code},
        finished_at = now(), locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${job.id}`);
      await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: "cancelled", userName: "Claude Opus", branchId: job.branchId,
        newValues: { code, from: "queued" }, notes: JOB_ERROR_TEXTS[code] ?? code, tx });
    });
  }
  const stale = rows(await db.execute(sql`SELECT * FROM physio_agent_jobs WHERE status = 'running'
      AND heartbeat_at < now() - make_interval(secs => ${timing.staleMs / 1000})`)).map(jobOf)
    //  ما يعمل في هذه النسخة لا يُستعاد (نبضُه تعطّل لانقطاع القاعدة، وهو حيّ) — يوقفه نبضُه حين يعود إن سُرق.
    .filter((j) => !inflight.has(j.id));
  for (const j of stale) {
    await db.transaction(async (tx) => {
      //  إعادةُ الفحص في المعاملة: ما زالت تعمل **وما زال نبضُها قديماً** — نبضةٌ وصلت بين القراءتين تُبقيها لصاحبها.
      const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${j.id} AND status = 'running'
          AND heartbeat_at < now() - make_interval(secs => ${timing.staleMs / 1000}) FOR UPDATE SKIP LOCKED`))[0];
      if (!cur) return;
      const job = jobOf(cur);
      if (job.cancelRequested) {
        const code = job.cancelReason ?? "cancelled_by_user";
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = ${code}, error = ${JOB_ERROR_TEXTS[code] ?? code},
          finished_at = now(), locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${job.id}`);
      } else if (job.failures + 1 < job.maxFailures) {
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'queued', failures = failures + 1, locked_by = NULL, locked_at = NULL,
          run_after = now(), updated_at = now() WHERE id = ${job.id}`);
      } else {
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'failed', failures = max_failures, error_code = 'worker_lost', error = ${JOB_ERROR_TEXTS.worker_lost},
          finished_at = now(), locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${job.id}`);
        await reviseFailedNoticeTx(tx, job, "worker_lost");
      }
      await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: "recover_stale", userName: "Claude Opus", branchId: job.branchId,
        newValues: { from: job.lockedBy, failures: job.failures }, tx });
    });
    await signalJob(j);
  }
  return stale.length;
}

/** **طلبُ المعتمِد إلى Opus انتهى بنفاد المحاولات** (انقطاعُ الخدمة · المهلة · العاملُ الضائع) — يُقال للمعتمِدين كسائر نهاياته، لا يموت صامتاً. */
async function reviseFailedNoticeTx(tx: any, j: JobRecord, code: string): Promise<void> {
  if (j.kind !== "revise") return;
  await notifyApproversTx(tx, j, `⚠️ لم يُكمل Opus طلبَ التعديل: ${JOB_ERROR_TEXTS[code] ?? code}`, j.planId ? `/physio/plans/${j.planId}` : `/patients/${j.patientId}`);
}

/** ملاحظةٌ على آخر سطرٍ في المراحل — يُنتظر في `pipeline.ts` قبل المرحلة التالية، فهو سطرُ مرحلتها. */
async function noteStage(job: JobRecord, me: string, noteAr: string): Promise<void> {
  await db.execute(sql`UPDATE physio_agent_jobs
      SET stages = jsonb_set(stages, ARRAY[(jsonb_array_length(stages) - 1)::text, 'noteAr'], to_jsonb(${noteAr.slice(0, 300)}::text)), updated_at = now()
    WHERE id = ${job.id} AND locked_by = ${me} AND status = 'running' AND jsonb_array_length(stages) > 0`);
  await signalJob(job);
}

async function setStage(job: JobRecord, me: string, stage: JobStage): Promise<void> {
  const entry = { stage, at: new Date().toISOString(), noteAr: JOB_STAGE_LABELS[stage] ?? null };
  const r = await db.execute(sql`UPDATE physio_agent_jobs SET stage = ${stage}, stages = stages || ${JSON.stringify([entry])}::jsonb, updated_at = now()
    WHERE id = ${job.id} AND locked_by = ${me} AND status = 'running'`);
  if (Number(r.rowCount ?? 0) === 0) throw new AgentStop("lost");
  await signalJob(job);
}

/** **إنهاءُ التشغيل** — محروسٌ بملكيّته؛ وطلبُ إلغاءٍ وصل في الأثناء يغلب أيَّ نتيجة. */
async function finishRun(job: JobRecord, me: string, o: Outcome | { kind: "requeue"; code: string; error: string; delayMs: number; countFailure: boolean }
  | { kind: "release" }): Promise<void> {
  if (o.kind === "succeeded" || o.kind === "done") { await signalJob(job); return; }
  await db.transaction(async (tx) => {
    const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${job.id} AND locked_by = ${me} AND status = 'running' FOR UPDATE`))[0];
    if (!cur) return;
    const j = jobOf(cur);
    const audit = (action: string, newValues: unknown, notes?: string) => logAudit({ entityType: "physio_agent_job", entityId: j.id, action, userName: "Claude Opus",
      branchId: j.branchId, newValues, notes: notes ?? null, tx });
    const terminal = async (status: string, code: string, error: string, extra: Record<string, any> = {}) => {
      await tx.execute(sql`UPDATE physio_agent_jobs SET status = ${status}, error_code = ${code}, error = ${error}, error_detail = ${extra.detail ?? null},
        result = ${JSON.stringify(extra.result ?? j.result ?? {})}::jsonb, finished_at = now(), locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${j.id}`);
      await audit(status, { code, detail: extra.detail ?? null }, error);
    };
    if (j.cancelRequested) {
      const code = j.cancelReason ?? "cancelled_by_user";
      await terminal("cancelled", code, JOB_ERROR_TEXTS[code] ?? code);
      await lostRequestNoticeTx(tx, j, code);
      return;
    }
    //  §4.hb — وظيفةُ «تعديل» طلبُ معتمِد: نتيجتُها للمعتمِدين وحدهم، والفاحصُ لا يرى ملاحظتَهم (إلّا «عدّل المعاينة» بنصٍّ ثابت بلا صدى للملاحظة).
    const revise = j.kind === "revise";
    const planLink = j.planId ? `/physio/plans/${j.planId}` : `/patients/${j.patientId}`;
    if (revise && o.kind === "declined") {
      await terminal("failed", "revision_declined", `يرى Opus ألّا يُنفَّذ التعديلُ المطلوب: ${o.decline.reasonAr}`, { result: o.result });
      await notifyApproversTx(tx, j, `⚠️ لم يُنفّذ Opus طلبَ التعديل (${o.decline.reasonAr.slice(0, 200)})`, planLink);
      return;
    }
    if (revise && o.kind === "new_finding") {
      await terminal("needs_exam_revision", "new_finding", `وجد Opus ما لم تسجّله المعاينة: ${o.finding.textAr}`, { result: o.result });
      await notifyApproversTx(tx, j, "⚠️ لم يُكمل Opus طلبَ التعديل: وجد ما لم تسجّله المعاينة — أعد طلبك بعد تعديلها", planLink);
      const finding = stripNoteEcho(o.finding.textAr, j.reviseNote).slice(0, 300);
      await notifyExaminerTx(tx, j, `⚠️ يحتاج Opus تعديلَ المعاينة قبل أن يكمل${finding ? `: ${finding}` : ""}`);
      return;
    }
    if (revise && o.kind === "failed") {
      await terminal("failed", o.code, JOB_ERROR_TEXTS[o.code] ?? o.code, { result: o.result, detail: o.detail ?? null });
      await notifyApproversTx(tx, j, `⚠️ لم يُكمل Opus طلبَ التعديل: ${JOB_ERROR_TEXTS[o.code] ?? o.code}`, planLink);
      return;
    }
    if (revise && o.kind === "cancelled") {
      await terminal("cancelled", o.code, JOB_ERROR_TEXTS[o.code] ?? o.code, o.result ? { result: o.result } : {});
      await lostRequestNoticeTx(tx, j, o.code);
      return;
    }
    switch (o.kind) {
      case "questions":
        //  نقطةُ الاستئناف تُفرَّغ من الخطّة المقبولة: الكاتبُ يُعاد بالأجوبة من أوّله (سؤالٌ في جولة إصلاح المدقّق كان يُرجع الخطّةَ القديمة كما هي)،
        //  وتبقى عدّاداتُ البحث والاستهلاك والمصادرُ المفتوحة.
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'needs_answers', stage = 'questions', questions = ${JSON.stringify(o.questions)}::jsonb,
          result = ${JSON.stringify(o.result)}::jsonb, checkpoint = ${JSON.stringify(questionCheckpoint(j.checkpoint))}::jsonb,
          locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${j.id}`);
        await audit("ask_questions", { count: o.questions.length, round: j.questionRounds + 1 }, "Opus يسأل قبل كتابة الخطّة");
        await notifyExaminerTx(tx, j, `❓ Opus يسأل قبل كتابة خطّة مريضك (${o.questions.length} ${o.questions.length === 1 ? "سؤال" : "أسئلة"})`);
        return;
      case "declined":
        await terminal("failed", "agent_declined", `يرى Opus ألّا تُكتب خطّةٌ الآن: ${o.decline.reasonAr}`, { result: o.result });
        await notifyApproversTx(tx, j, `⚠️ لم يكتب Opus خطّة (${o.decline.reasonAr.slice(0, 200)})`, `/patients/${j.patientId}`);
        await notifyExaminerTx(tx, j, `⚠️ لم يكتب Opus خطّة: ${o.decline.reasonAr.slice(0, 200)}${o.decline.recommendedActionAr ? ` — المقترح: ${o.decline.recommendedActionAr.slice(0, 200)}` : ""}`);
        return;
      case "new_finding":
        await terminal("needs_exam_revision", "new_finding", `وجد Opus ما لم تسجّله المعاينة: ${o.finding.textAr}`, { result: o.result });
        await notifyApproversTx(tx, j, "⚠️ لم يكتب Opus خطّة: وجد ما لم تسجّله المعاينة", `/patients/${j.patientId}`);
        await notifyExaminerTx(tx, j, `⚠️ Opus يحتاج تعديلَ المعاينة: ${o.finding.textAr.slice(0, 300)}`);
        return;
      case "failed":
        await terminal("failed", o.code, JOB_ERROR_TEXTS[o.code] ?? o.code, { result: o.result, detail: o.detail ?? null });
        if (o.code === "unresolved_critical" || o.code === "empty_plan" || o.code === "gates_blocking") {
          await notifyApproversTx(tx, j, `⚠️ لم يكتب Opus خطّة: ${JOB_ERROR_TEXTS[o.code]}`, `/patients/${j.patientId}`);
          await notifyExaminerTx(tx, j, `⚠️ لم يكتب Opus خطّة: ${JOB_ERROR_TEXTS[o.code]}`);
        }
        return;
      case "cancelled":
        await terminal("cancelled", o.code, JOB_ERROR_TEXTS[o.code] ?? o.code, o.result ? { result: o.result } : {});
        return;
      case "requeue":
        if (j.failures + (o.countFailure ? 1 : 0) >= j.maxFailures) {
          await tx.execute(sql`UPDATE physio_agent_jobs SET failures = max_failures WHERE id = ${j.id}`);
          await terminal("failed", o.code, JOB_ERROR_TEXTS[o.code] ?? o.error, { detail: o.error });
          await reviseFailedNoticeTx(tx, j, o.code);
          return;
        }
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'queued', failures = failures + ${o.countFailure ? 1 : 0}, locked_by = NULL, locked_at = NULL,
          run_after = now() + make_interval(secs => ${o.delayMs / 1000}), error_detail = ${o.error.slice(0, 2000)}, updated_at = now() WHERE id = ${j.id}`);
        await audit("requeue", { reason: o.code, failures: j.failures + (o.countFailure ? 1 : 0) }, o.error.slice(0, 500));
        return;
      case "release":
        await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'queued', locked_by = NULL, locked_at = NULL, run_after = now(), updated_at = now() WHERE id = ${j.id}`);
        await audit("release", { reason: "shutdown" }, "أُعيدت الوظيفةُ للطابور عند إطفاء الخادم");
        return;
    }
  });
  await signalJob(job);
}

/** **تشغيلُ وظيفةٍ أُخذت** — حتى نهايتها، والنبضُ والمهلةُ حولها. */
export async function runClaimed(job: JobRecord, me = INSTANCE_ID): Promise<void> {
  const ac = new AbortController();
  //  الرمزُ الذي أخذ به هذه الوظيفة (`claimOne`) — وإن لم يكن (اختبارٌ يمرّر وظيفةً بيده) فـ`me`.
  me = job.lockedBy ?? me;
  let markDone: () => void = () => {};
  const done = new Promise<void>((r) => { markDone = r; });
  inflight.set(job.id, { ac, token: me, done });
  const beat = setInterval(async () => {
    try {
      const r = rows(await db.execute(sql`UPDATE physio_agent_jobs SET heartbeat_at = now() WHERE id = ${job.id} AND locked_by = ${me} AND status = 'running'
        RETURNING cancel_requested`))[0];
      if (!r) ac.abort(new AgentStop("lost"));
      else if (r.cancel_requested) ac.abort(new AgentStop("cancel"));
    } catch (e) { console.error("[physio-agent] heartbeat failed:", e); }
  }, timing.heartbeatMs);
  const deadline = setTimeout(() => ac.abort(new AgentStop("deadline")), timing.runCapMs);
  try {
    const outcome = await runJob(job, {
      me, signal: ac.signal, sleep: (ms) => sleepImpl(ms, ac.signal),
      setStage: (stage) => setStage(job, me, stage as JobStage),
      noteStage: (_stage, noteAr) => noteStage(job, me, noteAr),
      saveCheckpoint: async (cp) => {
        const r = await db.execute(sql`UPDATE physio_agent_jobs SET checkpoint = ${JSON.stringify(cp)}::jsonb, updated_at = now()
          WHERE id = ${job.id} AND locked_by = ${me} AND status = 'running'`);
        if (Number(r.rowCount ?? 0) === 0) throw new AgentStop("lost");
      },
      onRetry: (role, attempt, e) => console.warn(`[physio-agent] job ${job.id} ${role} retry ${attempt}: ${(e as Error)?.message ?? e}`),
      onPrivacyStop: async (kinds) => {
        await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: "privacy_stop", userName: "Claude Opus", branchId: job.branchId,
          newValues: { kinds }, notes: JOB_ERROR_TEXTS.identifier_in_query, tx: db });
      },
    });
    await finishRun(job, me, outcome);
  } catch (e) {
    const stop = e instanceof AgentStop ? e : (ac.signal.aborted && (ac.signal as any).reason instanceof AgentStop ? (ac.signal as any).reason as AgentStop : null);
    if (stop) {
      if (stop.reason === "lost") return;
      if (stop.reason === "shutdown") await finishRun(job, me, { kind: "release" });
      else if (stop.reason === "cancel") await finishRun(job, me, { kind: "cancelled", code: "cancelled_by_user" });
      else await finishRun(job, me, { kind: "requeue", code: "timeout", error: JOB_ERROR_TEXTS.timeout, delayMs: 0, countFailure: true });
    } else if (e instanceof TransientExhausted) {
      const fresh = rows(await db.execute(sql`SELECT failures FROM physio_agent_jobs WHERE id = ${job.id}`))[0];
      const n = Number(fresh?.failures ?? 0);
      await finishRun(job, me, { kind: "requeue", code: "api_unavailable", error: (e.last as Error)?.message ?? String(e.last), delayMs: REQUEUE_BACKOFF_MS[Math.min(n, REQUEUE_BACKOFF_MS.length - 1)], countFailure: true });
    } else if (e instanceof AgentFatal) {
      await finishRun(job, me, { kind: "failed", code: e.code, detail: e.detail, result: e.result });
    } else {
      console.error(`[physio-agent] job ${job.id} failed:`, e);
      await finishRun(job, me, { kind: "failed", code: "internal", detail: String((e as Error)?.message ?? e).slice(0, 2000), result: (e as any)?.agentResult });
    }
  } finally {
    clearInterval(beat); clearTimeout(deadline);
    if (inflight.get(job.id)?.token === me) inflight.delete(job.id);
    markDone();
  }
}

/** **نبضةٌ واحدة** — الاستعادة ثمّ المصالحة ثمّ وظيفةٌ واحدة حتى نهايتها. للاختبار: يعيد رقمَ الوظيفة. */
export async function runAgentOnce(opts: { skipReconcile?: boolean } = {}): Promise<number | null> {
  await recoverStale();
  if (!opts.skipReconcile) await reconcilerScan();
  const job = await claimOne();
  if (!job) return null;
  await runClaimed(job);
  return job.id;
}

let timer: NodeJS.Timeout | null = null;
let ticking = false;
export function nudgeWorker(): void {
  if (!timer) return;
  setImmediate(() => void tick());
}
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const concurrency = Math.max(1, Number(process.env.PHYSIO_AGENT_CONCURRENCY) || 2);
    await recoverStale();
    await reconcilerScan();
    while (inflight.size < concurrency) {
      const job = await claimOne();
      if (!job) break;
      void runClaimed(job).catch((e) => console.error("[physio-agent] run failed:", e)).finally(() => nudgeWorker());
    }
  } catch (e) {
    console.error("[physio-agent] tick failed:", e);
  } finally {
    ticking = false;
  }
}

/** **يبدأ بعد `listen`** — وحده حين يكون الوكيلُ مفعّلاً، ولا تحت الاختبار ولا بـ`PHYSIO_AGENT_WORKER=off`. */
export function startPhysioAgentWorker(): boolean {
  if (timer || !agentEnabled() || process.env.NODE_ENV === "test" || process.env.PHYSIO_AGENT_WORKER === "off") return false;
  setWorkerNudge(nudgeWorker);
  timer = setInterval(() => void tick(), timing.tickMs);
  timer.unref?.();
  //  الإطفاء: تُعاد الوظائفُ للطابور ثمّ **يُعاد الإشارةُ نفسُها** — فالمستمعُ هنا لا يُبقي العمليةَ حيّةً حتى SIGKILL (Node لا يخرج بنفسه ما دام للإشارة مستمع).
  process.once("SIGTERM", () => {
    clearInterval(timer!); timer = null;
    void shutdownAgentWorker(10_000).finally(() => process.kill(process.pid, "SIGTERM"));
  });
  void tick();
  return true;
}
export const workerStartedForTest = (): boolean => timer !== null;
/** إطفاءٌ للاختبار — يعيد ما يعمل إلى الطابور. */
export function releaseAllForTests(): void { inflight.forEach((f) => f.ac.abort(new AgentStop("shutdown"))); }
/** يوقف ما يعمل (يعود للطابور بلا إخفاق) وينتظر انتهاءَه، بحدٍّ أقصى. */
export async function shutdownAgentWorker(maxWaitMs: number): Promise<void> {
  const runs = Array.from(inflight.values());
  runs.forEach((f) => f.ac.abort(new AgentStop("shutdown")));
  await Promise.race([Promise.all(runs.map((f) => f.done)), new Promise((r) => setTimeout(r, maxWaitMs))]);
}
