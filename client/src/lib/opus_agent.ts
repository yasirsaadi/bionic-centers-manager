// **وكيلُ Opus في الواجهة** (§4.ha الفقرة ١١) — أشكالُ ما يردّه الخادمُ ونداءاتُه، وقاعدةُ المراحل التي يعرضها اللوح.
// الخادمُ يحكم كلَّ شيء (مَن يشغّل ومَن يجيب ومَن يرى الخطّة) — هنا العرضُ وحده.
import { JOB_STAGE_LABELS, type JobStage, type JobStatus, type QuestionAffects, type Issue, type AgentSource, type PlanMeasure,
  type ProposedCard, type LibraryProtocolDraft } from "@shared/physio_agent";
import type { GatedPlan, GateLogEntry } from "@shared/physio_agent_gates";

export interface OpusJobSummary { id: number; status: JobStatus; stage: string | null; errorCode: string | null; failures: number; questionRounds: number;
  /** حالُ خطّتها إن كُتبت (منتظرة · معتمَدة) — `null` إن حُذفت أو لم تُكتب. */
  planStatus?: string | null }

export interface OpusJobView {
  id: number; examId: number; patientId: number; status: JobStatus; stage: string | null;
  stages: { stage: string; at: string; noteAr?: string | null }[]; trigger: string;
  questions: { id: string; textAr: string; whyEn: string; affects: QuestionAffects }[];
  questionRounds: number; qa: { round: number; at: string; byName: string | null; answers: { id: string; questionAr: string; answer: string }[] }[];
  failures: number; maxFailures: number; cancelRequested: boolean; errorCode: string | null; error: string | null;
  decline: { by: string; reasonAr: string; reasonEn: string; recommendedActionAr: string } | null;
  newFinding: { kind: string; textAr: string; textEn: string; sourceQuestionId: string | null } | null;
  unresolvedCritical: Issue[];
  /** البوّاباتُ التي أوقفت الخطّة — بأسبابها العربية. */
  blockingGates?: { code: string; reasonAr: string }[];
  startedAt: string | null; finishedAt: string | null; createdAt: string; requestedByName: string | null; planId: number | null;
}
export interface OpusJobResponse { job: OpusJobView | null; planStatus: string | null; enabled: boolean; canRun: boolean; canAnswer: boolean; canCancel: boolean; canSeeProposal: boolean;
  /** لماذا لا يُشغَّل الآن (يردّه الخادم ٤٠٩) — يُقال مكانَ الزرّ. */
  runBlocked?: { code: string; reason: string } | null;
  /** ملاحظةُ اعتماد العلامة الحمراء على هذه المعاينة — قيدٌ يقرؤه Opus أوّلاً. */
  approvalNote?: string | null }

export interface OpusReview { verdict: "pass" | "revise"; summaryAr: string; issues: Issue[]; checked: string[]; round: number }
export interface OpusAudit { verdict: "pass" | "concerns"; summaryAr: string; issues: Issue[]; round: number;
  sourcesChecked: { url: string; reachable: boolean; supportsClaim: boolean; noteEn: string }[] }

export interface OpusProposal {
  plan: { id: number; patientId: number; status: string; titleAr: string; titleEn: string | null; outOfLibrary: boolean; protocolId: number | null;
    protocolCode: string | null; protocolTitleAr: string | null; totalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null;
    createdByName: string | null; createdAt: string };
  job: { id: number; status: string; trigger: string; requestedByName: string | null; finishedAt: string | null; examId: number } | null;
  final: GatedPlan | null;
  gateLog: GateLogEntry[];
  removed: GatedPlan["removed"];
  reviews: OpusReview[]; audits: OpusAudit[];
  unresolved: { reviewer: Issue[]; auditor: Issue[] };
  majorsToAcknowledge: string[];
  sources: AgentSource[]; fetchedUrls: string[]; proposedCards: ProposedCard[]; libraryProtocol: LibraryProtocolDraft | null;
  alternatives: { protocolId: number; whyNotAr: string }[];
  approverConstraints: { examIsThis: boolean; decidedAt: string | null; note: string; flags: { question: string; action: string }[]; forbiddenDevices: string[] }[];
  examStale: boolean; staleReason: string | null; staleText: string | null;
  exerciseNames: Record<number, { nameAr: string; nameEn: string }>;
  deviceNames: Record<string, { nameAr: string; nameEn: string }>;
  measures?: PlanMeasure[];
}

export interface OpusPlanRow {
  id: number; patientId: number; branchId: number | null; branchName: string | null; status: string; titleAr: string; outOfLibrary: boolean;
  staleReason: string | null; createdAt: string; decidedByName: string | null; decidedAt: string | null; examinerName: string | null;
  patientName: string | null; patientCode: string | null;
}

/** نداءٌ يكتب — ونصُّ الخطأ من الخادم كما هو (العربية)، مع رمزه. */
export async function opusPost<T = any>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) { const e: any = new Error(json?.error || "تعذّر تنفيذ الطلب"); e.code = json?.code ?? null; throw e; }
  return json as T;
}
export async function opusGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok) { const e: any = new Error(json?.error || "تعذّر التحميل"); e.status = res.status; throw e; }
  return json as T;
}

export const opusJobKey = (examId: number) => [`/api/physio/exams/${examId}/opus-job`];
export const opusProposalKey = (planId: number) => [`/api/physio/plans/${planId}/opus-proposal`];
export const OPUS_PLANS_KEY = "/api/physio/opus-plans";

/** المراحلُ الظاهرة في اللوح بترتيبها — «المدقّق» لخطّةٍ خارج المكتبة وحدها. */
export const PANEL_STAGES: readonly JobStage[] = ["reading", "research", "writing", "review", "audit", "gates"];

export type StageState = "done" | "run" | "todo";
/**
 * **حالُ كلّ مرحلة** من سجلّ المراحل: ما بعدها ظهر ⟵ «تمّ»؛ والحاليّةُ تعمل ما دامت الوظيفةُ تعمل؛ والنجاحُ يُتمّها كلَّها.
 * و«المدقّق» يظهر حين وقع وحده (أو قبل النهاية «إن كانت خارج المكتبة»).
 */
export function stageStates(job: Pick<OpusJobView, "status" | "stage" | "stages">): { stage: JobStage; label: string; state: StageState; optional: boolean; note: string | null }[] {
  const seen = new Set(job.stages.map((s) => s.stage));
  const order = PANEL_STAGES as readonly string[];
  const cur = job.stage ? order.indexOf(job.stage) : -1;
  const maxSeen = Math.max(-1, ...job.stages.map((s) => order.indexOf(s.stage)));
  const ok = job.status === "succeeded";
  const running = job.status === "running";
  const ended = ok || job.status === "failed" || job.status === "cancelled" || job.status === "needs_exam_revision";
  return PANEL_STAGES.flatMap((stage, i) => {
    const optional = stage === "audit";
    //  لم يقع وقد تجاوزته الوظيفة ⟵ خطّةٌ من المكتبة لا مدقّقَ لها.
    if (optional && !seen.has("audit") && (ended || cur > i || maxSeen > i)) return [];
    let state: StageState = "todo";
    if (ok) state = "done";
    else if (running && cur === i) state = "run";
    else if (cur >= 0 ? i < cur : i <= maxSeen && (seen.has(stage) || i < maxSeen)) state = "done";
    //  آخرُ ملاحظةٍ على هذه المرحلة («البوّاباتُ في الشيفرة: حذفت جهازاً واحداً») — والتسميةُ نفسُها ليست ملاحظة.
    const note = [...job.stages].reverse().find((x) => x.stage === stage && x.noteAr && x.noteAr !== JOB_STAGE_LABELS[stage])?.noteAr ?? null;
    return [{ stage, label: JOB_STAGE_LABELS[stage], state, optional, note }];
  });
}

/** أرقامٌ عربية للعرض — بلا فواصل آلاف («٢٠٠٠» كما على شاشة الجهاز). */
export const ar = (n: number | null | undefined): string => (n === null || n === undefined ? "—"
  : new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 3, useGrouping: false }).format(n));
/** النصُّ بأرقامٍ هنديّة (لما يُبنى نصّاً فيه رقم). */
export const arText = (s: string | number): string => String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
