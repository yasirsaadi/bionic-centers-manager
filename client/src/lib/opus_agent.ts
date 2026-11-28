// **وكيلُ Opus في الواجهة** (§4.ha الفقرة ١١) — أشكالُ ما يردّه الخادمُ ونداءاتُه، وقاعدةُ المراحل التي يعرضها اللوح.
// الخادمُ يحكم كلَّ شيء (مَن يشغّل ومَن يجيب ومَن يرى الخطّة) — هنا العرضُ وحده.
import { JOB_STAGE_LABELS, type JobStage, type JobStatus, type QuestionAffects, type Issue, type AgentSource, type PlanMeasure,
  type ProposedCard, type LibraryProtocolDraft } from "@shared/physio_agent";
import type { GatedPlan, GateLogEntry } from "@shared/physio_agent_gates";
import type { PlanDiff, PlanSnapshot, VersionHow } from "@shared/physio_plan_versions";
import type { PlanEdit } from "@shared/physio_plan_versions";

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
  /** §4.hb — وظيفةُ «تعديل» (`revise`) بنطاقها: «أعِده إلى Opus» قبل الاعتماد أو «اطلب من Opus تعديلاً» بعده. */
  kind?: "write" | "revise"; reviseScope?: "return" | "amend" | null;
  /** للمعتمِد وحده (الخادمُ لا يرسلها لغيره). */
  reviseNote?: string | null; proposalStatus?: string | null; baseVersion?: number | null; savedVersion?: number | null;
  /** C3 — سببُ الإخفاق مفصَّلاً بالعربية للمعتمِد. */
  errorDetailAr?: string | null;
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
  /** §4.hb D1 — الاعتمادُ لما يُعرض: رقمُ الوظيفة وبصمةُ الاقتراح. */
  agentJobId?: number | null; proposalHash?: string | null;
  /** الاقتراحُ بعد أن صحّحته البوّاباتُ عند محاولة اعتمادٍ سابقة («تغيّر منذ فتحتَه»). */
  regated?: { snapshot: PlanSnapshot; gateLog: GateLogEntry[]; at: string | null } | null;
  /** «جولاتُ الإعادة» — كلُّ «أعِده إلى Opus» بملاحظته ومآله وما تغيّر عن الكتابة السابقة. */
  returnRounds?: ReturnRound[];
  /** إعادةٌ تعمل الآن — «اعتماد» معطّلٌ حتى تنتهي. */
  activeRevision?: { jobId: number; status: JobStatus; stage: string | null; stages: { stage: string; at: string; noteAr?: string | null }[] } | null;
}

export interface ReturnRound {
  jobId: number; status: JobStatus; errorCode: string | null; error: string | null; note: string | null; requestedByName: string | null;
  createdAt: string; finishedAt: string | null; diffFromPrevious: PlanDiff | null; diffSummaryAr: string | null;
}

/** طلبُ «تعديل» في «حال التعديل» (`GET /plans/:id/opus-revision`). */
export interface RevisionJobView {
  id: number; scope: "return" | "amend" | null; status: JobStatus; stage: string | null; stages: { stage: string; at: string; noteAr?: string | null }[];
  note: string | null; requestedByName: string | null; createdAt: string; finishedAt: string | null; errorCode: string | null; error: string | null;
  proposalStatus: string | null; proposalReason: string | null; baseVersion: number | null; savedVersion: number | null; diffSummaryAr: string | null;
  lostByExamChange: boolean;
}
export interface AmendProposal {
  jobId: number; baseVersion: number; currentVersion: number | null; stale: boolean; staleText: string | null; request: string | null;
  snapshot: PlanSnapshot | null; gateLog: GateLogEntry[]; diff: PlanDiff | null; diffSummaryAr: string | null; proposalHash: string | null;
  reviews: OpusReview[]; audits: OpusAudit[]; unresolved: { reviewer: Issue[]; auditor: Issue[] }; majorsToAcknowledge: string[];
}
export interface OpusRevisionResponse { activeJob: RevisionJobView | null; latest: RevisionJobView[]; proposal: AmendProposal | null; currentVersion: number | null }

export interface VersionListItem {
  version: number; how: VersionHow; howAr: string; reason: string | null; approvalNote: string | null; createdByName: string | null; createdAt: string | null;
  diffSummaryAr: string | null; jobId: number | null; sessionsOnVersion: number; backfilled: boolean; snapshotHash: string;
}
export interface VersionsResponse { current: number | null; virtual: boolean; versions: VersionListItem[] }
export interface VersionDetail extends Omit<VersionListItem, "diffSummaryAr" | "sessionsOnVersion" | "jobId"> { snapshot: PlanSnapshot; gateLog: GateLogEntry[]; virtual: boolean }
export interface EditPreviewResponse {
  baseVersion: number; snapshot: PlanSnapshot; gateLog: (GateLogEntry & { sinceBase?: boolean })[]; blocking: GateLogEntry[]; warnings: GateLogEntry[];
  suggestedEdit: PlanEdit | null; diff: PlanDiff; diffSummaryAr: string; gateHash: string; noChange: boolean;
}

export const opusRevisionKey = (planId: number) => [`/api/physio/plans/${planId}/opus-revision`];
export const versionsKey = (planId: number) => [`/api/physio/plans/${planId}/versions`];
export const versionKey = (planId: number, n: number) => [`/api/physio/plans/${planId}/versions/${n}`];

export interface OpusPlanRow {
  id: number; patientId: number; branchId: number | null; branchName: string | null; status: string; titleAr: string; outOfLibrary: boolean;
  staleReason: string | null; createdAt: string; decidedByName: string | null; decidedAt: string | null; examinerName: string | null;
  patientName: string | null; patientCode: string | null;
  /** §4.hb — Opus يعيد كتابتها الآن بملاحظة معتمِد. */
  revising?: boolean;
}
/** صفُّ «تعديلاتٌ مقترحة» — اقتراحُ Opus على خطّةٍ معتمَدة. */
export interface OpusProposalRow {
  jobId: number; planId: number; patientId: number; patientName: string | null; patientCode: string | null; branchName: string | null; titleAr: string;
  baseVersion: number | null; currentVersion: number | null; request: string | null; requestedByName: string | null; finishedAt: string | null; diffSummaryAr: string | null;
}

/** نداءٌ يكتب — ونصُّ الخطأ من الخادم كما هو (العربية)، مع رمزه. */
export async function opusPost<T = any>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) { const e: any = new Error(json?.error || "تعذّر تنفيذ الطلب"); e.code = json?.code ?? null; e.status = res.status; e.body = json; throw e; }
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
