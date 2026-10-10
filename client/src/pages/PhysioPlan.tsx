// **خطّةُ العلاج الطبيعي للمريض** (§4.cm) — صفحةٌ واحدة للقراءة والتعديل والاعتماد والإسناد والطباعة.
//   /physio/plans/:id          — الخطّة (و`?edit=1` تفتحها للتعديل بعد الإنشاء مباشرةً)
//   /physio/plans              — الاعتماداتُ (للمسؤول والمشرف العام) · المسندةُ إليّ
// كلُّ قرار صلاحيةٍ من الخادم (`canWrite`/`canApprove`)؛ والصفحةُ تُظهر الأزرارَ بحسبه وبحسب الحالة.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ClipboardList, Eye, Pencil, Play, Plus, Printer, RefreshCcw, Send, Trash2, Undo2, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LangToggle, useProtocolLang } from "@/components/physio/PhysioLang";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { ChangePlanTypeDialog, DeletePlanDialog, PLAN_STATUS_TONE } from "@/components/physio/PhysioPlansSection";
import { DeviationsList, ExecuteSessionDialog, PlanSessionsHistory } from "@/components/physio/ExecuteSession";
import { DueAssessmentsList } from "@/components/physio/PlanProgress";
import { SuggestionSummary, type Suggestion } from "@/components/physio/PlanSuggestion";
import { PlanProgress } from "@/components/physio/PlanProgress";
import { LatestAssessmentBox } from "@/components/physio/LatestAssessment";
import { ProtocolPhasesSection, type Phase } from "@/components/physio/ProtocolPhases";
import { localizedText, type ProtocolLang } from "@shared/physio_protocols";
import {
  PLAN_REVIEW_LABELS, PLAN_REVIEW_LABELS_EN, PLAN_STATUS_LABELS, PLAN_STATUS_LABELS_EN, UNAPPROVED_PROTOCOL_BADGE, canApproveFrom, canApprovePlans,
  canReturnFrom, canReviewFrom, canSelfActivate, canSubmitFrom, canWritePlans, isPlanClosed, type PlanStatus,
} from "@shared/physio_plans";

interface PlanDevice {
  deviceId: number; minutes: number | null; parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  code?: string; nameAr?: string; nameEn?: string; availableInBranch?: boolean;
  //  ترحيل ١٢٢ — أساسيٌّ في كلّ جلسة أو مساعدٌ بالتناوب.
  centreUse?: "core" | "adjunct";
}
interface Plan {
  id: number; patientId: number; branchId: number; branchName: string | null; status: PlanStatus;
  titleAr: string; titleEn: string | null;
  goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null;
  precautions: string | null; precautionsEn: string | null; notes: string | null; notesEn: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null;
  /** ترحيل ١٢٣ (§4.dd) — عددُ جلسات هذا المريض، والأسابيعُ مشتقّةٌ منه. */
  totalSessions?: number | null;
  /** نسخةُ المريض من مراحل البروتوكول وتمارينها — يعدّلها الأخصائيّ ولا يمسّ البروتوكول. */
  phases?: Phase[];
  /** الأجهزةُ المساعدة التي يقترحها البروتوكول، بإعداداتها الأولى — يؤشّر منها الأخصائيُّ لمريضه. */
  protocolAdjuncts?: PlanDevice[];
  returnNote: string | null; stopReason: string | null; decidedByName: string | null; decidedAt: string | null;
  createdByName: string | null; createdAt: string; updatedByName: string | null; updatedAt: string;
  patient: { id: number; name: string; code: string | null; age: string | null } | null;
  protocol: { id: number; titleAr: string; titleEn: string; status: string; code: string } | null;
  devices: PlanDevice[]; assignees: { userId: number; name: string; role: string }[];
  /** دورُ المساعد في الجلسة القادمة (ترحيل ١٢٢). */
  rotation?: { sessionsSoFar: number; turnDeviceId: number | null };
  canWrite: boolean; canApprove: boolean; canDelete: boolean; canExecute?: boolean; canCancelSessions?: boolean;
  aiSuggestion?: Suggestion | null;
  graduatedAt?: string | null; graduatedByName?: string | null;
  reviewStatus?: "awaiting" | "reviewed" | null; reviewedByName?: string | null; reviewedAt?: string | null;
}
interface Matrix { devices: { id: number; code: string; nameAr: string; nameEn: string }[]; available: string[] }

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
const fmt = (iso: string | null, lang: ProtocolLang) =>
  iso ? new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—";

const T = {
  ar: {
    back: "ملف المريض", patient: "المريض", branch: "الفرع", protocol: "البروتوكول", dose: "الجرعة", goals: "الأهداف", devices: "الأجهزة",
    device: "الجهاز", minutes: "الدقائق", params: "المعاملات", note: "ملاحظة", exercises: "التمارين والبرنامج المنزلي",
    precautions: "الموانع والاحتياطات", notes: "ملاحظات الأخصائي لهذا المريض", assignees: "المنفّذون", noAssignees: "لم يُسنَد إلى أحد بعد.",
    noDevices: "لا أجهزة في الخطّة.", notAvail: "غير متوفّر في فرع الخطّة", perWeek: "جلسات/أسبوع", weeks: "أسابيع", perSession: "دقيقة/جلسة",
    total: "جلسة", phases: "البرنامج على مراحل — لهذا المريض",
    wroteBy: "كتبها", approvedBy: "اعتمدها", returned: "أُعيدت بملاحظة", stopped: "أُوقفت", fallback: "لم تُكتب العربيةُ بعد — المعروضُ الإنكليزية",
    signature: "توقيع الأخصائي", approval: "الاعتماد", sessions: "الجلسات المنفّذة",
  },
  en: {
    back: "Patient file", patient: "Patient", branch: "Branch", protocol: "Protocol", dose: "Dose", goals: "Goals", devices: "Devices",
    device: "Device", minutes: "Minutes", params: "Parameters", note: "Note", exercises: "Exercises & home programme",
    precautions: "Contraindications & precautions", notes: "Specialist notes for this patient", assignees: "Executed by", noAssignees: "Not assigned yet.",
    noDevices: "No devices in this plan.", notAvail: "Not available in the plan's branch", perWeek: "sessions/week", weeks: "weeks", perSession: "min/session",
    total: "sessions", phases: "Programme by phase — for this patient",
    wroteBy: "Written by", approvedBy: "Approved by", returned: "Returned with a note", stopped: "Stopped", fallback: "English not written yet — Arabic shown",
    signature: "Specialist signature", approval: "Approval", sessions: "Executed sessions",
  },
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="print:shadow-none print:border-0"><CardContent className="p-4 print:p-0 print:pb-3">
      <h3 className="font-bold text-sm mb-2">{title}</h3>{children}
    </CardContent></Card>
  );
}
function TextBlock({ row, field, lang }: { row: any; field: string; lang: ProtocolLang }) {
  const t = localizedText(row, field, lang);
  if (!t.text) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div>
      {t.fallback && <p className="text-[11px] text-amber-700 mb-1 print:hidden">{T[lang].fallback}</p>}
      <p className="text-sm whitespace-pre-wrap" dir={t.fallback ? (lang === "en" ? "rtl" : "ltr") : undefined}>{t.text}</p>
    </div>
  );
}

export default function PhysioPlanPage() {
  const [, params] = useRoute("/physio/plans/:id");
  const id = Number(params?.id);
  const [location] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [lang, setLang] = useProtocolLang();
  const t = T[lang];
  const key = [`/api/physio/plans/${id}`];
  const q = useQuery<Plan>({ queryKey: key, queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${id}`)).json(), retry: false });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (q.data && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1"
      && q.data.canWrite && !isPlanClosed(q.data.status)) setEditing(true);
  }, [q.data?.id, location]);
  const [ask, setAsk] = useState<null | "return" | "stop">(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [execOpen, setExecOpen] = useState(false);
  //  «طباعة التقدّم» (§4.cp): تُخفى أقسامُ الخطّة في الطباعة ويظهر رأسُها وقسمُ التقدّم وحده، ثمّ تعود.
  const [printMode, setPrintMode] = useState<"plan" | "progress">("plan");
  useEffect(() => {
    const back = () => setPrintMode("plan");
    window.addEventListener("afterprint", back);
    return () => window.removeEventListener("afterprint", back);
  }, []);
  const printProgress = () => { setPrintMode("progress"); setTimeout(() => window.print(), 50); };
  const [, navigate] = useLocation();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    if (q.data) qc.invalidateQueries({ queryKey: [`/api/patients/${q.data.patientId}/physio-plans`] });
    qc.invalidateQueries({ queryKey: ["/api/physio/plans"] });
  };
  const act = useMutation({
    mutationFn: async (p: { path: string; body?: any }) => (await apiRequest("POST", `/api/physio/plans/${id}/${p.path}`, p.body ?? {})).json(),
    onSuccess: (_d, p) => {
      toast(p.path === "activate"
        ? { title: "بدأت الخطّة", description: "نزلت في ملفّ المريض وتُنفَّذ الآن، ونُبّه المشرفُ ليراجعها." }
        : { title: "تم" });
      setAsk(null); refresh();
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</div>;
  if (q.isError || !q.data) return <div className="p-6 text-sm">الخطّة غير موجودة أو ليست لك. <Link href="/patients" className="text-primary underline">سجل المرضى</Link></div>;
  const plan = q.data;
  const title = lang === "en" && plan.titleEn ? plan.titleEn : plan.titleAr;
  const statusLabel = (lang === "en" ? PLAN_STATUS_LABELS_EN : PLAN_STATUS_LABELS)[plan.status];
  //  §4.cz — بروتوكولٌ اعتمده المشرف: كاتبُ الخطّة يبدؤها بنفسه، وتعديلُه لا يوقفها.
  const protocolApproved = plan.protocol?.status === "approved";
  const selfStart = plan.canWrite && !plan.canApprove && canSelfActivate(plan.status, plan.protocol?.status);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3 print:p-0" dir={lang === "en" ? "ltr" : "rtl"}>
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Link href={`/patients/${plan.patientId}`}>
          <Button variant="ghost" size="sm" className="gap-1"><ArrowRight className="w-4 h-4" /> {t.back}</Button>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} />
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()} data-testid="button-print-plan">
            <Printer className="w-4 h-4" /> {lang === "en" ? "Print" : "طباعة"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={printProgress} data-testid="button-print-progress">
            <Printer className="w-4 h-4" /> {lang === "en" ? "Progress report" : "تقرير التقدّم"}
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-4 space-y-2 print:p-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardList className="w-5 h-5 text-green-700 print:hidden" />
          <h1 className="text-lg font-bold" data-testid="plan-title">{title}</h1>
          <Badge variant="outline" className={`${PLAN_STATUS_TONE[plan.status]} print:hidden`} data-testid="plan-status">{statusLabel}</Badge>
          {plan.aiSuggestion && (
            <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-300 print:hidden" data-testid="plan-ai-badge">{lang === "en" ? "Suggested by the assistant" : "مقترحة بالمساعد"}</Badge>
          )}
          {plan.protocol && plan.protocol.status !== "approved" && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300" data-testid="plan-unapproved-protocol">{lang === "en" ? "Protocol not yet approved" : UNAPPROVED_PROTOCOL_BADGE}</Badge>
          )}
        </div>
        <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <div><span className="text-muted-foreground">{t.patient}: </span>{plan.patient?.name ?? "—"} {plan.patient?.code ? `(${plan.patient.code})` : ""}{plan.patient?.age ? ` · ${plan.patient.age}` : ""}</div>
          <div><span className="text-muted-foreground">{t.branch}: </span>{plan.branchName ?? "—"}</div>
          {plan.protocol && (
            <div className="sm:col-span-2"><span className="text-muted-foreground">{t.protocol}: </span>
              <Link href={`/physio/protocols/${plan.protocol.id}`} className="text-primary underline print:no-underline print:text-inherit">
                {lang === "en" ? plan.protocol.titleEn : plan.protocol.titleAr}
              </Link>
            </div>
          )}
          <div className="text-xs text-muted-foreground sm:col-span-2">
            {t.wroteBy} {plan.createdByName ?? "—"} · {fmt(plan.createdAt, lang)}
            {plan.status === "approved" && plan.decidedByName ? ` · ${t.approvedBy} ${plan.decidedByName} · ${fmt(plan.decidedAt, lang)}` : ""}
          </div>
        </div>
        {plan.status === "approved" && plan.reviewStatus === "awaiting" && (
          <div className="rounded-md border border-sky-300 bg-sky-50 p-2 text-sm print:hidden" data-testid="plan-awaiting-review">
            <b>{(lang === "en" ? PLAN_REVIEW_LABELS_EN : PLAN_REVIEW_LABELS).awaiting}</b> — {lang === "en"
              ? "started by its author on an approved protocol; it is being executed."
              : "بدأها كاتبُها على بروتوكولٍ معتمَد، وهي تُنفَّذ."}
          </div>
        )}
        {plan.status === "approved" && plan.reviewStatus === "reviewed" && plan.reviewedByName && (
          <div className="text-xs text-emerald-800 print:hidden" data-testid="plan-reviewed">
            {(lang === "en" ? PLAN_REVIEW_LABELS_EN : PLAN_REVIEW_LABELS).reviewed}: {plan.reviewedByName}{plan.reviewedAt ? ` · ${fmt(plan.reviewedAt, lang)}` : ""}
          </div>
        )}
        {plan.status === "returned" && plan.returnNote && (
          <div className="rounded-md border border-orange-300 bg-orange-50 p-2 text-sm print:hidden" data-testid="plan-return-note">
            <b>{t.returned}</b> — {plan.decidedByName ?? ""}: {plan.returnNote}
          </div>
        )}
        {plan.status === "graduated" && (
          <div className="rounded-md border border-sky-300 bg-sky-50 p-2 text-sm" data-testid="plan-graduated">
            <b>{lang === "en" ? "Graduated" : "تخرّج"}</b> — {plan.graduatedByName ?? ""}{plan.graduatedAt ? ` · ${fmt(plan.graduatedAt, lang)}` : ""}
          </div>
        )}
        {plan.status === "stopped" && plan.stopReason && (
          <div className="rounded-md border bg-zinc-50 p-2 text-sm" data-testid="plan-stop-reason"><b>{t.stopped}</b>: {plan.stopReason}</div>
        )}
      </CardContent></Card>

      {/*  الأزرارُ بحسب صلاحية السائل (من الخادم) وحالة الخطّة. */}
      {!editing && (
        <div className="flex flex-wrap gap-2 print:hidden" data-testid="plan-actions">
          {/*  «تنفيذ جلسة» — أيُّ منفّذٍ من القسم في فرع الخطّة المعتمَدة (قرارُ المالك: المسنَدُ افتراضيٌّ لا حصر — §4.cn). */}
          {plan.canExecute && plan.status === "approved" && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setExecOpen(true)} data-testid="button-execute-plan">
              <Play className="w-4 h-4" /> تنفيذ جلسة
            </Button>
          )}
          {plan.canWrite && !isPlanClosed(plan.status) && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditing(true)} data-testid="button-edit-plan"><Pencil className="w-4 h-4" /> تعديل</Button>
          )}
          {/*  §4.cz — على بروتوكولٍ اعتمده المشرف يبدؤها كاتبُها بنفسه، وإلّا تُرسَل للاعتماد. */}
          {selfStart && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={act.isPending}
              onClick={() => act.mutate({ path: "activate" })} data-testid="button-activate-plan">
              <CheckCircle2 className="w-4 h-4" /> اعتماد وبدء العلاج
            </Button>
          )}
          {plan.canWrite && canSubmitFrom(plan.status) && !selfStart && (
            <Button size="sm" className="gap-1" disabled={act.isPending} onClick={() => act.mutate({ path: "submit" })} data-testid="button-submit-plan">
              <Send className="w-4 h-4" /> إرسال للاعتماد
            </Button>
          )}
          {plan.canApprove && canReviewFrom(plan.status, plan.reviewStatus) && (
            <Button size="sm" className="gap-1 bg-sky-600 hover:bg-sky-700" disabled={act.isPending}
              onClick={() => act.mutate({ path: "review" })} data-testid="button-review-plan">
              <Eye className="w-4 h-4" /> موافقة المشرف
            </Button>
          )}
          {plan.canApprove && canApproveFrom(plan.status) && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={act.isPending}
              onClick={() => act.mutate({ path: "approve" })} data-testid="button-approve-plan">
              <CheckCircle2 className="w-4 h-4" /> اعتماد
            </Button>
          )}
          {plan.canApprove && canReturnFrom(plan.status) && (
            <Button size="sm" variant="outline" className="gap-1 border-orange-300 text-orange-800" onClick={() => setAsk("return")} data-testid="button-return-plan">
              <Undo2 className="w-4 h-4" /> إعادة بملاحظة
            </Button>
          )}
          {plan.canWrite && !isPlanClosed(plan.status) && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setAssignOpen(true)} data-testid="button-assign-plan"><UserPlus className="w-4 h-4" /> الإسناد</Button>
          )}
          {plan.canWrite && !isPlanClosed(plan.status) && (
            <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => setAsk("stop")} data-testid="button-stop-plan"><XCircle className="w-4 h-4" /> إيقاف الخطّة</Button>
          )}
          {/*  الحذفُ للمسؤول والمشرف العام حصراً (طلبُ المالك ٢٠٢٦-١٠-٠٧). */}
          {plan.canDelete && !isPlanClosed(plan.status) && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setTypeOpen(true)} data-testid="button-change-plan-type"><RefreshCcw className="w-4 h-4" /> تغيير نوع الخطّة</Button>
          )}
          {plan.canDelete && (
            <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => setDeleteOpen(true)} data-testid="button-delete-plan"><Trash2 className="w-4 h-4" /> حذف</Button>
          )}
        </div>
      )}
      {!editing && plan.aiSuggestion && <SuggestionSummary sg={plan.aiSuggestion} lang={lang} />}
      {!editing && plan.canWrite && !plan.canApprove && canSubmitFrom(plan.status) && !protocolApproved && (
        <p className="text-[11px] text-muted-foreground print:hidden" data-testid="plan-needs-approval-hint">
          {plan.protocol ? "بروتوكولُ هذه الخطّة لم يعتمده المشرفُ بعد — تبدأ بعد موافقته." : "خطّةٌ بلا بروتوكول — تبدأ بعد موافقة المشرف."}
        </p>
      )}
      {!editing && plan.status === "approved" && plan.canWrite && !plan.canApprove && (
        <p className="text-[11px] text-muted-foreground print:hidden">
          {protocolApproved ? "تعديلُك يُبقيها تُنفَّذ ويعيدها لمراجعة المشرف." : "تعديلُ الخطّة المعتمَدة يعيدها إلى الاعتماد."}
        </p>
      )}
      {!editing && plan.canApprove && canReviewFrom(plan.status, plan.reviewStatus) && (
        <p className="text-[11px] text-muted-foreground print:hidden">
          «موافقة المشرف» أو عدّلها أو أوقفها أو غيّر نوعَها — وكاتبُها يُنبَّه بما تفعل.
        </p>
      )}

      {editing ? (
        <PlanEditor plan={plan} lang={lang} onDone={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
      ) : (
        <>
          {/*  **ما بُنيت عليه الخطّة** (§4.da المرحلة ٤): التقييمُ الأوّليّ في آخر معاينة — سطرُه وبنودُ «خطة العلاج» التي أشّرها الفاحص. */}
          <div className="print:hidden"><LatestAssessmentBox patientId={plan.patientId} lang={lang} /></div>
          <div className={printMode === "progress" ? "" : "print:hidden"}>
            <PlanProgress planId={plan.id} planStatus={plan.status} lang={lang} onModify={() => setEditing(true)} patientId={plan.patientId} />
          </div>
          <div className={`space-y-3 ${printMode === "progress" ? "print:hidden" : ""}`}>
          <Section title={t.dose}>
            <div className="text-sm flex flex-wrap gap-4" data-testid="plan-dose">
              {plan.totalSessions ? <span><b>{plan.totalSessions}</b> {t.total}</span> : null}
              <span><b>{plan.sessionsPerWeek ?? "—"}</b> {t.perWeek}</span>
              <span><b>{plan.durationWeeks ?? "—"}</b> {t.weeks}</span>
              <span><b>{plan.sessionMinutes ?? "—"}</b> {t.perSession}</span>
            </div>
          </Section>
          <Section title={t.goals}><TextBlock row={plan} field="goals" lang={lang} /></Section>
          <Section title={t.devices}>
            {plan.devices.length === 0 ? <p className="text-sm text-muted-foreground">{t.noDevices}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="plan-devices">
                  <thead><tr className="text-muted-foreground text-xs border-b">
                    <th className="text-start py-1">{t.device}</th><th className="text-start py-1">{t.minutes}</th>
                    <th className="text-start py-1">{t.params}</th><th className="text-start py-1">{t.note}</th>
                  </tr></thead>
                  <tbody>
                    {plan.devices.map((d) => (
                      <tr key={d.deviceId} className="border-b last:border-0 align-top" data-testid={`plan-device-${d.deviceId}`}>
                        <td className="py-1.5">{lang === "en" ? d.nameEn : d.nameAr}
                          {/*  ترحيل ١٢٢ — أساسيٌّ في كلّ جلسة، أو مساعدٌ بالتناوب ومعه «دوره في الجلسة القادمة». */}
                          <div className="text-[11px] mt-0.5" data-testid={`plan-device-use-${d.deviceId}`}>
                            {d.centreUse === "adjunct"
                              ? <span className="text-violet-800">{lang === "en" ? "Adjunct — rotates" : "مساعد — بالتناوب"}
                                  {plan.rotation?.turnDeviceId === d.deviceId && <b> · {lang === "en" ? "next session" : "دورُه الجلسة القادمة"}</b>}</span>
                              : <span className="text-sky-800">{lang === "en" ? "Core — every session" : "أساسيّ — كلَّ جلسة"}</span>}
                          </div>
                          {d.availableInBranch === false && <div className="text-[11px] text-red-700">{t.notAvail}</div>}</td>
                        <td className="py-1.5">{d.minutes ?? "—"}</td>
                        <td className="py-1.5 whitespace-pre-wrap">{localizedText(d, "parameters", lang).text ?? "—"}</td>
                        <td className="py-1.5 whitespace-pre-wrap">{localizedText(d, "note", lang).text ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          {/*  ترحيل ١٢٣ (§4.dd) — نسخةُ المريض من مراحل البروتوكول: يعدّلها كاتبُ الخطّة بمرونة البروتوكول نفسِها، والبروتوكولُ لا يُمَسّ. */}
          {((plan.phases ?? []).length > 0 || (plan.canWrite && !isPlanClosed(plan.status))) && (
            <Card className="print:shadow-none print:border-0"><CardContent className="p-4 print:p-0 print:pb-3">
              <ProtocolPhasesSection phases={plan.phases ?? []} canEdit={plan.canWrite} isArchived={isPlanClosed(plan.status)} lang={lang}
                saveUrl={`/api/physio/plans/${plan.id}/phases`} onSaved={refresh} title={t.phases}
                currentSession={plan.status === "approved" && plan.rotation ? plan.rotation.sessionsSoFar + 1 : null}
                editNote="تعديلٌ لهذا المريض وحده — البروتوكولُ الأساسيّ لا يتغيّر. وتعديلُ خطّةٍ تُنفَّذ يعيدها لمراجعة المشرف." />
              <PhaseRangeHint plan={plan} lang={lang} />
            </CardContent></Card>
          )}
          <Section title={t.exercises}><TextBlock row={plan} field="exercises" lang={lang} /></Section>
          <Section title={t.precautions}><TextBlock row={plan} field="precautions" lang={lang} /></Section>
          <Section title={t.notes}><TextBlock row={plan} field="notes" lang={lang} /></Section>
          <Section title={t.assignees}>
            {plan.assignees.length === 0 ? <p className="text-sm text-muted-foreground">{t.noAssignees}</p>
              : <p className="text-sm">{plan.assignees.map((a) => a.name).join("، ")}</p>}
          </Section>
          <div className="print:hidden"><Section title={t.sessions}><PlanSessionsHistory planId={plan.id} /></Section></div>
          <div className="hidden print:flex justify-between pt-8 text-sm">
            <div>{t.signature}: ____________</div>
            <div>{t.approval}: {plan.status === "approved" ? plan.decidedByName : "____________"}</div>
          </div>
          </div>
        </>
      )}

      <AskDialog kind={ask} pending={act.isPending} onClose={() => setAsk(null)}
        onSubmit={(text) => act.mutate(ask === "return" ? { path: "return", body: { note: text } } : { path: "stop", body: { reason: text } })} />
      <ChangePlanTypeDialog plan={typeOpen ? { id: plan.id, titleAr: plan.titleAr, protocolId: plan.protocol?.id ?? null } : null}
        onClose={() => setTypeOpen(false)} patientId={plan.patientId} onChanged={refresh} />
      <DeletePlanDialog plan={deleteOpen ? plan : null} onClose={() => setDeleteOpen(false)} patientId={plan.patientId}
        onDeleted={() => navigate(`/patients/${plan.patientId}`)} />
      <ExecuteSessionDialog planId={execOpen ? plan.id : null} onClose={() => setExecOpen(false)} />
      {assignOpen && <AssignDialog plan={plan} onClose={() => setAssignOpen(false)} onDone={() => { setAssignOpen(false); refresh(); }} />}
    </div>
  );
}

/** نطاقُ المراحل لا يطابق عددَ الجلسات (عدّل الأخصائيُّ العددَ لمريضه) — تنبيهٌ ليعدّل المراحلَ إن شاء، لا قيد. */
function PhaseRangeHint({ plan, lang }: { plan: Plan; lang: ProtocolLang }) {
  const ends = (plan.phases ?? []).map((p) => Number(p.sessionTo)).filter((n) => Number.isFinite(n) && n > 0);
  if (!plan.totalSessions || !ends.length) return null;
  const last = Math.max(...ends);
  if (last === plan.totalSessions) return null;
  return (
    <p className="text-xs text-amber-800 mt-2 print:hidden" data-testid="plan-phase-range-hint">
      {lang === "en"
        ? `The phases end at session ${last} while the plan has ${plan.totalSessions} sessions — edit the phase ranges if needed.`
        : `المراحلُ تنتهي عند الجلسة ${last} وعددُ جلسات الخطّة ${plan.totalSessions} — عدّل نطاقاتِ المراحل إن لزم.`}
    </p>
  );
}

function AskDialog({ kind, pending, onClose, onSubmit }: { kind: null | "return" | "stop"; pending: boolean; onClose: () => void; onSubmit: (t: string) => void }) {
  const [text, setText] = useState("");
  useEffect(() => { setText(""); }, [kind]);
  return (
    <Dialog open={kind !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{kind === "return" ? "إعادة الخطّة بملاحظة" : "إيقاف الخطّة"}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          {kind === "return" ? "تعود الخطّةُ إلى كاتبها بملاحظتك ويصله تنبيه، فيعدّلها ويرسلها ثانيةً." : "تبقى الخطّةُ في الملفّ تاريخاً بسبب إيقافها، ولا تُنفَّذ بعده."}
        </p>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} data-testid="input-plan-ask"
          placeholder={kind === "return" ? "مثال: خفّف شدّة التمارين وأضف تقييم الألم أسبوعياً" : "مثال: أنهى المريض البرنامج"} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={!text.trim() || pending} onClick={() => onSubmit(text.trim())} data-testid="button-plan-ask-confirm">
            {kind === "return" ? "إعادة" : "إيقاف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ plan, onClose, onDone }: { plan: Plan; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const c = useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: [`/api/physio/plans/${plan.id}/assignee-candidates`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${plan.id}/assignee-candidates`)).json(),
  });
  const [picked, setPicked] = useState<number[]>(plan.assignees.map((a) => a.userId));
  const m = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/physio/plans/${plan.id}/assignees`, { userIds: picked })).json(),
    onSuccess: () => { toast({ title: "تم" }); onDone(); },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const ROLE: Record<string, string> = { physio_specialist: "أخصائي", therapist: "معالج", physio_technician: "تقني", physio_trainer: "مدرب" };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>إسناد الخطّة</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          مَن ينفّذها من قسم العلاج الطبيعي في فرع {plan.branchName ?? "الخطّة"}. يصلهم تنبيهٌ حين تكون الخطّةُ معتمَدة.
        </p>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {c.isLoading && <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>}
          {c.data?.length === 0 && <div className="text-sm text-muted-foreground">لا حسابات علاج طبيعي في هذا الفرع.</div>}
          {c.data?.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`assignee-${u.id}`}>
              <Checkbox checked={picked.includes(u.id)}
                onCheckedChange={(v) => setPicked((p) => (v ? [...p, u.id] : p.filter((x) => x !== u.id)))} />
              {u.name} <span className="text-xs text-muted-foreground">({ROLE[u.role] ?? u.role})</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()} data-testid="button-save-assignees">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ المحرّر — يكتب باللغة المختارة في الأعلى (حقول `<field>` أو `<field>En`)، والأجهزةُ المتوفّرة في فرع الخطّة وحدها ══════════════
function PlanEditor({ plan, lang, onDone, onCancel }: { plan: Plan; lang: ProtocolLang; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [f, setF] = useState(() => ({ ...plan }));
  const [lines, setLines] = useState<PlanDevice[]>(() => plan.devices.map((d) => ({ ...d })));
  const matrix = useQuery<Matrix>({ queryKey: ["/api/physio/devices"], queryFn: async () => (await apiRequest("GET", "/api/physio/devices")).json() });
  const addable = useMemo(() => (matrix.data?.devices ?? [])
    .filter((d) => (matrix.data?.available ?? []).includes(`${d.id}:${plan.branchId}`) && !lines.some((l) => l.deviceId === d.id)),
  [matrix.data, lines, plan.branchId]);
  const en = lang === "en";
  const k = (field: string) => (en ? `${field}En` : field);
  const set = (field: string, v: string) => setF((p: any) => ({ ...p, [field]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/physio/plans/${plan.id}`, {
      titleAr: f.titleAr, titleEn: f.titleEn, goals: f.goals, goalsEn: f.goalsEn, exercises: f.exercises, exercisesEn: f.exercisesEn,
      precautions: f.precautions, precautionsEn: f.precautionsEn, notes: f.notes, notesEn: f.notesEn,
      sessionsPerWeek: f.sessionsPerWeek, durationWeeks: f.durationWeeks, sessionMinutes: f.sessionMinutes, totalSessions: f.totalSessions ?? null,
      devices: lines.map((l) => ({ deviceId: l.deviceId, minutes: l.minutes, parameters: l.parameters, parametersEn: l.parametersEn, note: l.note, noteEn: l.noteEn,
        centreUse: l.centreUse ?? "core" })),
    })).json(),
    onSuccess: (r: any) => {
      toast({ title: "حُفظت الخطّة", description: r?.demoted ? "عادت الخطّةُ إلى الاعتماد ووصل التنبيه." : undefined });
      onDone();
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const area = (field: string, label: string, rows = 4) => (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Textarea rows={rows} value={(f as any)[k(field)] ?? ""} onChange={(e) => set(k(field), e.target.value)} dir={en ? "ltr" : "rtl"}
        className="mt-1 bg-white" data-testid={`input-plan-${field}`} />
    </div>
  );
  return (
    <Card><CardContent className="p-4 space-y-4" data-testid="plan-editor">
      <p className="text-xs text-muted-foreground">تكتب الآن باللغة {en ? "الإنكليزية" : "العربية"} — بدّلها من الزرّ في الأعلى لكتابة الأخرى.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-sm font-medium">العنوان بالعربية</label>
          <Input value={f.titleAr ?? ""} onChange={(e) => set("titleAr", e.target.value)} className="mt-1 bg-white" data-testid="input-plan-titleAr" /></div>
        <div><label className="text-sm font-medium">Title (English)</label>
          <Input value={f.titleEn ?? ""} onChange={(e) => set("titleEn", e.target.value)} dir="ltr" className="mt-1 bg-white" /></div>
      </div>
      {/*  ترحيل ١٢٣ (§4.dd) — عددُ الجلسات أساسُ الجرعة لهذا المريض، والأسابيعُ تُشتقّ منه (٢٤ ÷ ٦ = ٤، و٢٤ ÷ ٥ ⟵ ٥). */}
      <div className="grid grid-cols-3 gap-3">
        {([["totalSessions", "عدد الجلسات"], ["sessionsPerWeek", "جلسات/أسبوع"], ["sessionMinutes", "دقيقة/جلسة"]] as const).map(([field, label]) => (
          <div key={field}><label className="text-sm font-medium">{label}</label>
            <Input type="number" value={(f as any)[field] ?? ""} onChange={(e) => setF((p: any) => ({ ...p, [field]: num(e.target.value) }))}
              className="mt-1 bg-white" data-testid={`input-plan-${field}`} /></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground -mt-2" data-testid="plan-weeks-derived">
        {f.totalSessions && f.sessionsPerWeek
          ? `المدّة نحو ${Math.ceil(Number(f.totalSessions) / Number(f.sessionsPerWeek))} أسابيع — من العدد والتواتر.`
          : f.durationWeeks ? `المدّة ${f.durationWeeks} أسابيع.` : "اكتب عددَ الجلسات وجلساتِ الأسبوع."}
      </p>
      {area("goals", "الأهداف")}
      <AdjunctChecklist options={plan.protocolAdjuncts ?? []} lines={lines} setLines={setLines} lang={lang} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">الأجهزة (المتوفّرة في فرع الخطّة)</label>
        </div>
        <div className="space-y-2 mt-1">
          {lines.map((l, i) => (
            <div key={l.deviceId} className="rounded-md border p-2 space-y-2 bg-white" data-testid={`plan-line-${l.deviceId}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{en ? l.nameEn : l.nameAr}</span>
                <div className="flex items-center gap-1">
                  {/*  ترحيل ١٢٢ — الأساسيُّ في كلّ جلسة، والمساعدُ يتناوب: جهازٌ مساعدٌ واحد في كلّ جلسة. */}
                  <select className="rounded-md border px-2 py-1 text-xs bg-white" value={l.centreUse ?? "core"} data-testid={`select-plan-use-${l.deviceId}`}
                    onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, centreUse: e.target.value as "core" | "adjunct" } : x)))}>
                    <option value="core">أساسيّ — كلَّ جلسة</option>
                    <option value="adjunct">مساعد — بالتناوب</option>
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <Input type="number" placeholder="الدقائق" value={l.minutes ?? ""}
                  onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, minutes: num(e.target.value) } : x)))} />
                <Input placeholder={en ? "Parameters" : "المعاملات"} dir={en ? "ltr" : "rtl"} value={(en ? l.parametersEn : l.parameters) ?? ""}
                  onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, [en ? "parametersEn" : "parameters"]: e.target.value } : x)))} />
                <Input placeholder={en ? "Note" : "ملاحظة"} dir={en ? "ltr" : "rtl"} value={(en ? l.noteEn : l.note) ?? ""}
                  onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, [en ? "noteEn" : "note"]: e.target.value } : x)))} />
              </div>
            </div>
          ))}
          {addable.length > 0 && (
            <select className="w-full rounded-md border px-2 py-2 text-sm bg-white" value="" data-testid="select-plan-add-device"
              onChange={(e) => {
                const d = addable.find((x) => x.id === Number(e.target.value));
                if (d) setLines((p) => [...p, { deviceId: d.id, nameAr: d.nameAr, nameEn: d.nameEn, minutes: null, parameters: null, parametersEn: null, note: null, noteEn: null, centreUse: "core" }]);
              }}>
              <option value="">+ إضافة جهاز…</option>
              {addable.map((d) => <option key={d.id} value={d.id}>{en ? d.nameEn : d.nameAr}</option>)}
            </select>
          )}
        </div>
      </div>
      {area("exercises", "التمارين والبرنامج المنزلي", 5)}
      {area("precautions", "الموانع والاحتياطات")}
      {area("notes", "ملاحظات الأخصائي لهذا المريض", 3)}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button disabled={save.isPending || !String(f.titleAr ?? "").trim()} onClick={() => save.mutate()} data-testid="button-save-plan">
          {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </div>
    </CardContent></Card>
  );
}

// ══ قائمة الخطط: الاعتماداتُ و«للمراجعة» والمسندةُ إليّ ═══════════════════════════════════════════════════════════
interface ListRow { id: number; titleAr: string; status: PlanStatus; branchName: string | null; patientId: number; patientName: string; patientCode: string | null; createdByName: string | null; submittedAt: string | null; updatedAt: string; protocolStatus: string | null; decidedByName?: string | null; decidedAt?: string | null; reviewStatus?: string | null }

/** صفحةُ `/physio/plans` — تبويبُ الاعتمادات للمسؤول والمشرف العام وحدهما (والخادمُ يحرسه). */
export function PhysioPlansPage() {
  const session = useBranchSession();
  const permissions = usePermissions();
  const s = session ? { ...session, permissions } as any : null;
  return <PhysioPlansList canApprove={canApprovePlans(s)} canWrite={canWritePlans(s)} />;
}

export function PhysioPlansList({ canApprove, canWrite = false }: { canApprove: boolean; canWrite?: boolean }) {
  //  `?tab=due` — رابطُ التنبيه الصباحيّ «مستحقّ التقييم» (§4.cp).
  const wantDue = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "due";
  const [tab, setTab] = useState<"pending" | "review" | "assigned" | "deviations" | "due">(wantDue && canWrite ? "due" : canApprove ? "pending" : "assigned");
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-green-700" /> خطط العلاج الطبيعي</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {canApprove && <TabsTrigger value="pending" data-testid="tab-plans-pending">بانتظار الاعتماد</TabsTrigger>}
          {canApprove && <TabsTrigger value="review" data-testid="tab-plans-review">للمراجعة</TabsTrigger>}
          <TabsTrigger value="assigned" data-testid="tab-plans-assigned">المسندة إليّ</TabsTrigger>
          {canWrite && <TabsTrigger value="due" data-testid="tab-plans-due">مستحقّ التقييم</TabsTrigger>}
          {canWrite && <TabsTrigger value="deviations" data-testid="tab-plans-deviations">اختلافات التنفيذ</TabsTrigger>}
        </TabsList>
        {canApprove && <TabsContent value="pending"><PlansTable view="pending" /></TabsContent>}
        {canApprove && <TabsContent value="review"><PlansTable view="review" /></TabsContent>}
        <TabsContent value="assigned"><PlansTable view="assigned" /></TabsContent>
        {canWrite && <TabsContent value="due"><DueAssessmentsList /></TabsContent>}
        {canWrite && <TabsContent value="deviations"><DeviationsList /></TabsContent>}
      </Tabs>
    </div>
  );
}

function PlansTable({ view }: { view: "pending" | "review" | "assigned" }) {
  const q = useQuery<{ plans: ListRow[] }>({
    queryKey: ["/api/physio/plans", view],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans?view=${view}`)).json(),
  });
  if (q.isLoading) return <div className="text-sm text-muted-foreground p-3">جارٍ التحميل…</div>;
  const rows = q.data?.plans ?? [];
  if (!rows.length) return <Card className="p-4 text-sm text-muted-foreground mt-2">{view === "pending" ? "لا خطة تنتظر الاعتماد." : view === "review" ? "لا خطة جديدة تنتظر مراجعتك." : "لم تُسنَد إليك خطة بعد."}</Card>;
  return (
    <div className="space-y-2 mt-2">
      {rows.map((r) => (
        <Link key={r.id} href={`/physio/plans/${r.id}`} className="block rounded-lg border bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-slate-50" data-testid={`plans-list-row-${r.id}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}</span>
              <span className="text-sm">— {r.titleAr}</span>
              <Badge variant="outline" className={PLAN_STATUS_TONE[r.status]}>{PLAN_STATUS_LABELS[r.status]}</Badge>
              {r.protocolStatus && r.protocolStatus !== "approved" && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">{UNAPPROVED_PROTOCOL_BADGE}</Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{r.branchName ?? "—"} · كتبها {r.createdByName ?? "—"}
              {view === "review" && r.decidedByName ? ` · بدأها ${r.decidedByName}${r.decidedAt ? ` في ${new Date(r.decidedAt).toLocaleDateString("ar-IQ", { month: "short", day: "numeric" })}` : ""}` : ""}</div>
        </Link>
      ))}
    </div>
  );
}

/**
 * **الأجهزةُ المساعدة لهذا المريض** (ترحيل ١٢٣، §4.dd — سليم: «الأجهزةُ على مريض مريض»): ما يقترحه البروتوكولُ مساعداً، بإعداداته الأولى،
 * **لا يُؤشَّر شيءٌ مسبقاً** — يختار الأخصائيُّ ما يناسب هذا المريض فيدخل الخطّةَ مساعداً بالتناوب، والتناوبُ بين المؤشَّر وحده.
 * جهازٌ أو اثنان أفضل: كلٌّ منهما يصل المريضَ مرّاتٍ تكفي ليؤثّر. ولا قيد — يجوز اختيارُ الكلّ أو لا شيء.
 */
function AdjunctChecklist({ options, lines, setLines, lang }: {
  options: PlanDevice[]; lines: PlanDevice[]; setLines: (fn: (p: PlanDevice[]) => PlanDevice[]) => void; lang: ProtocolLang;
}) {
  if (!options.length) return null;
  const en = lang === "en";
  const picked = options.filter((o) => lines.some((l) => l.deviceId === o.deviceId));
  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3 space-y-2" data-testid="plan-adjunct-checklist">
      <div className="text-sm font-medium">{en ? "Adjunct devices for this patient" : "الأجهزةُ المساعدة لهذا المريض"}</div>
      <p className="text-xs text-muted-foreground">
        {en ? "Suggested by the protocol with initial settings. Tick what suits this patient — one adjunct rotates per session among the ticked ones; one or two are best."
          : "يقترحها البروتوكولُ بإعداداتها الأولى. أشّر ما يناسب هذا المريض — يتناوب المؤشَّرُ وحده، جهازٌ مساعدٌ في كلّ جلسة؛ والأفضلُ جهازٌ أو اثنان."}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((o) => {
          const on = lines.some((l) => l.deviceId === o.deviceId);
          return (
            <label key={o.deviceId} className={`flex items-start gap-2 rounded border bg-white p-2 cursor-pointer ${on ? "border-violet-400" : ""}`}
              data-testid={`plan-adjunct-${o.deviceId}`}>
              <Checkbox checked={on} className="mt-0.5"
                onCheckedChange={(v) => setLines((p) => (v ? [...p, { ...o, centreUse: "adjunct" }] : p.filter((l) => l.deviceId !== o.deviceId)))} />
              <span className="min-w-0">
                <span className="text-sm font-medium">{en ? o.nameEn : o.nameAr}</span>
                {o.minutes ? <span className="text-xs text-muted-foreground"> · {o.minutes} {en ? "min" : "د"}</span> : null}
                {localizedText(o, "parameters", lang).text && (
                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3">{localizedText(o, "parameters", lang).text}</div>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {picked.length > 2 && (
        <p className="text-xs text-amber-800" data-testid="plan-adjunct-many">
          {en ? `${picked.length} adjuncts rotate — each reaches the patient about once every ${picked.length} sessions.`
            : `${picked.length} أجهزة مساعدة تتناوب — يصل كلٌّ منها المريضَ نحو مرّةٍ كلَّ ${picked.length} جلسات.`}
        </p>
      )}
    </div>
  );
}
