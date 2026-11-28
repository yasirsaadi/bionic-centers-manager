// **إسنادُ خطّة Bionic AI بأجزائها والبديلُ لغياب المُسنَد** (ترحيل ٢٠١، §4.hc — المرحلةُ الرابعة). الخادمُ يحكم كلَّ شيء (مَن يُسند، ومَن يسجّل كلَّ جزء،
// ومَن يطلب البديلَ ومَن يعتمده) — هنا العرضُ وحده بما يردّه.
//   • `OpusAssignmentCard` — بطاقةُ «الإسناد» في صفحة الخطّة: لكلّ جزءٍ مُسنَدُه، والبدلاءُ، وأزرارُ المعتمِد والمُسنَد.
//   • `AssignPartsDialog` — «إسناد» للمعتمِد: الأجهزةُ والتمارين، أو الجزآن لشخصٍ واحد، والسببُ حين يُبدَّل مُسنَدٌ قائم.
//   • `SubstituteRequestDialog` — «اطلب بديلاً»: من منفّذي فرعه، بتاريخين وسبب؛ ولا ينفّذ البديلُ حتى يعتمده المسؤولُ أو المشرفُ العام.
//   • `SubstitutionItem` — طلبُ بديلٍ واحد بحاله وأزراره (سحب · اعتماد · رفض · إنهاء) — في البطاقة و«جلسات اليوم» و«اعتمادات العلاج الطبيعي».
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, UserPlus, Users } from "lucide-react";
import { AI_BRAND } from "@shared/ai_brand";
import {
  endedLabel, lapsedLabel, PART_LABELS, SUBSTITUTION_MAX_DAYS, substitutionInputError, SUBSTITUTION_STATUS_LABELS, type PlanPart,
} from "@shared/physio_plan_assignment";
import { baghdadTodayYmd } from "@shared/visit_date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { arText } from "@/lib/opus_agent";

// ══ الأشكال ═════════════════════════════════════════════════════════════════════════════════════
export type PartVerdictView = { ok: true; via: "approver" | "assignee" | "substitute" } | { ok: false; code: string; reasonAr: string };
export interface SubstitutionView {
  id: number; assigneeId: number; assigneeName: string | null; substituteId: number; substituteName: string | null; requestedBy: number; requestedByName: string | null;
  planId: number | null; part: PlanPart | null; dateFrom: string; dateTo: string; effectiveFrom: string | null; reason: string; status: string;
  requestedAt: string | null; decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; lapseReason: string | null; lapsedBy: number | null;
  plan: { id: number; titleAr: string; patientId: number; patientName: string; patientCode: string | null; branchName: string | null } | null;
  coveredPlans: number; substituteCanDryNeedle: boolean; unseen?: boolean;
}
export interface AssignmentView {
  required: PlanPart[];
  parts: { part: PlanPart; assignee: { id: number; name: string | null; role: string | null; eligible: boolean; canDryNeedle: boolean } | null;
    assignedAt: string | null; assignedByName: string | null; assignedVersion: number | null; reason: string | null; seenByHolder: boolean }[];
  awaiting: boolean; missingParts: PlanPart[];
  openSession: { id: number; date: string; recordedParts: { part: PlanPart; byName: string | null; at: string | null }[]; missingParts: PlanPart[];
    sessionsBefore: number; phasePosition: number | null } | null;
  canAssign: boolean; canClose: boolean; planHasNeedle: boolean;
  verdicts: Partial<Record<PlanPart, PartVerdictView>>;
  myUnseen: PlanPart[]; canRequestSubstitute: PlanPart[];
  substitutions: SubstitutionView[];
}

export const PHYSIO_ROLE_AR: Record<string, string> = { physio_specialist: "أخصائي", therapist: "معالج", physio_technician: "تقني", physio_trainer: "مدرب" };
const roleAr = (r: string | null | undefined) => (r ? PHYSIO_ROLE_AR[r] ?? "" : "");
export const partsText = (parts: readonly PlanPart[]) => parts.map((p) => `«${PART_LABELS[p]}»`).join(" و");

/** «٢٨ تشرين الثاني» — يومٌ بلا ساعة. */
export const dayAr = (d: string | null | undefined): string => {
  if (!d) return "—";
  const t = new Date(`${String(d).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("ar-IQ", { day: "numeric", month: "long", timeZone: "UTC" });
};
export const timeAr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString("ar-IQ", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Baghdad" }) : "");

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

/** يُعيد جلبَ كلّ ما يعرض الإسنادَ والبدلاء. */
export function useAssignmentRefresh() {
  const qc = useQueryClient();
  return (planId?: number | null) => {
    if (planId) {
      qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}`] });
      qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}/sessions`] });
    }
    qc.invalidateQueries({ queryKey: ["/api/physio/today"] });
    qc.invalidateQueries({ queryKey: ["/api/physio/substitutes"] });
    qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews", "pending-count"] });
    qc.invalidateQueries({ queryKey: ["/api/physio/opus-plans"] });
    qc.invalidateQueries({ queryKey: ["/api/physio/plans"] });
  };
}

// ══ طلبُ بديلٍ واحد ═════════════════════════════════════════════════════════════════════════════
const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-slate-100 text-slate-700", lapsed: "bg-slate-100 text-slate-700",
};
export function substitutionStatusText(s: Pick<SubstitutionView, "status" | "lapseReason" | "lapsedBy">): string {
  if (s.status === "lapsed") return s.lapsedBy ? endedLabel(s.lapseReason ?? "") : lapsedLabel(s.lapseReason ?? "");
  return SUBSTITUTION_STATUS_LABELS[s.status] ?? s.status;
}
/** عددُ الخطط بالعربية — «خطّةٌ واحدة» · «خطّتان» · «٣ خطط» · «١١ خطّة». */
export const plansCountText = (n: number): string =>
  n === 0 ? "لا خطّة" : n === 1 ? "خطّةٌ واحدة" : n === 2 ? "خطّتان" : n <= 10 ? `${arText(n)} خطط` : `${arText(n)} خطّة`;
/** النطاقُ بالكلمات — والجزءُ الفارغ «الأجزاءُ المُسنَدة كلُّها» لا «الجزآن» (فمَن يحمل التمارينَ وحدها لا يُظنّ بديلُه للأجهزة). */
export function substitutionScopeText(s: SubstitutionView): string {
  const scope = s.planId == null ? `كلّ خطط ${s.assigneeName ?? "—"} — ${plansCountText(s.coveredPlans)} الآن`
    : s.plan ? `${s.plan.patientName}${s.plan.patientCode ? ` (${s.plan.patientCode})` : ""} — ${s.plan.titleAr}` : "خطّةٌ واحدة";
  return `${scope} · ${s.part ? PART_LABELS[s.part] : "الأجزاءُ المُسنَدة كلُّها"}`;
}

export function SubstitutionItem({ s, viewerId, approver, showScope = true, testPrefix = "sub" }: {
  s: SubstitutionView; viewerId: number | null; approver: boolean; showScope?: boolean; testPrefix?: string;
}) {
  const { toast } = useToast();
  const refresh = useAssignmentRefresh();
  const [mode, setMode] = useState<null | "reject" | "end">(null);
  const [text, setText] = useState("");
  const m = useMutation({
    mutationFn: async (p: { path: "withdraw" | "decide" | "end"; body?: any }) => (await apiRequest("POST", `/api/physio/substitutes/${s.id}/${p.path}`, p.body ?? {})).json(),
    onSuccess: (_d, p) => {
      toast({ title: p.path === "withdraw" ? "سُحب الطلب" : p.path === "end" ? "انتهى البديل" : p.body?.decision === "approve" ? "اعتُمد البديل — يعلم المُسنَدُ والبديل" : "رُفض الطلب — يعلم صاحبُه" });
      setMode(null); setText(""); refresh(s.planId);
    },
    onError: (e) => { refresh(s.planId); toast({ title: "خطأ", description: errText(e), variant: "destructive" }); },
  });
  const pending = s.status === "pending";
  const active = s.status === "approved" && s.dateTo >= baghdadTodayYmd();
  const mineAsRequester = viewerId != null && (viewerId === s.requestedBy || viewerId === s.assigneeId);
  return (
    <div className="rounded-md border bg-white p-2 space-y-1.5 min-w-0" data-testid={`${testPrefix}-${s.id}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <b className="min-w-0">{s.substituteName ?? "—"}</b>
        <span className="text-muted-foreground">بديلاً عن</span>
        <b className="min-w-0">{s.assigneeName ?? "—"}</b>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[s.status] ?? STATUS_TONE.lapsed)} data-testid={`${testPrefix}-status-${s.id}`}>
          {substitutionStatusText(s)}
        </span>
        {s.unseen && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-600 text-white">جديد</span>}
      </div>
      {showScope && (
        <div className="text-xs text-slate-700 break-words">
          {s.plan ? <Link href={`/physio/plans/${s.plan.id}`} className="hover:underline">{substitutionScopeText(s)}</Link> : substitutionScopeText(s)}
          {s.plan?.branchName ? <span className="text-muted-foreground"> · {s.plan.branchName}</span> : null}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        {s.dateFrom === s.dateTo ? `يوم ${dayAr(s.dateFrom)}` : `من ${dayAr(s.dateFrom)} إلى ${dayAr(s.dateTo)}`}
        {s.status === "approved" && s.effectiveFrom && s.effectiveFrom !== s.dateFrom ? ` · نافذٌ من ${dayAr(s.effectiveFrom)}` : ""}
        {s.requestedByName && s.requestedBy !== s.assigneeId ? ` · طلبه ${s.requestedByName}` : ""}
      </div>
      <div className="text-xs break-words"><span className="text-muted-foreground">السبب: </span>{s.reason}</div>
      {s.decisionNote && <div className="text-xs break-words"><span className="text-muted-foreground">القرار{s.decidedByName ? ` (${s.decidedByName})` : ""}: </span>{s.decisionNote}</div>}
      {mode && (
        <div className="space-y-1.5">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="bg-white"
            placeholder={mode === "reject" ? "سببُ الرفض * — يصل صاحبَ الطلب" : "سببُ الإنهاء *"} data-testid={`${testPrefix}-text-${s.id}`} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="destructive" disabled={m.isPending || text.trim().length < 3}
              onClick={() => m.mutate(mode === "reject" ? { path: "decide", body: { decision: "reject", note: text.trim() } } : { path: "end", body: { reason: text.trim() } })}
              data-testid={`${testPrefix}-confirm-${s.id}`}>{mode === "reject" ? "رفض الطلب" : "إنهاء البديل"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode(null); setText(""); }}>رجوع</Button>
          </div>
        </div>
      )}
      {!mode && (pending || active) && (
        <div className="flex flex-wrap gap-2">
          {pending && approver && (
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={m.isPending}
              onClick={() => m.mutate({ path: "decide", body: { decision: "approve" } })} data-testid={`${testPrefix}-approve-${s.id}`}>اعتماد البديل</Button>
          )}
          {pending && approver && (
            <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => setMode("reject")} data-testid={`${testPrefix}-reject-${s.id}`}>رفض</Button>
          )}
          {pending && mineAsRequester && (
            <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ path: "withdraw" })} data-testid={`${testPrefix}-withdraw-${s.id}`}>سحب الطلب</Button>
          )}
          {active && (approver || viewerId === s.assigneeId) && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setMode("end")} data-testid={`${testPrefix}-end-${s.id}`}>إنهاء البديل</Button>
          )}
        </div>
      )}
    </div>
  );
}

// ══ بطاقةُ «الإسناد» في صفحة الخطّة ══════════════════════════════════════════════════════════════
export function OpusAssignmentCard({ planId, assignment, viewerId, closed, onAssign, onSubstitute }: {
  planId: number; assignment: AssignmentView; viewerId: number | null; closed: boolean; onAssign: () => void; onSubstitute: () => void;
}) {
  const a = assignment;
  const anyHolder = a.parts.some((p) => p.assignee);
  return (
    <div className="rounded-lg border border-violet-200 bg-white p-3 space-y-2 print:border-0 print:p-0" dir="rtl" data-testid="opus-assignment-card">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="w-4 h-4 text-violet-700 print:hidden" />
        <h3 className="font-bold text-sm m-0">الإسناد</h3>
        {a.awaiting && !closed && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900" data-testid="assignment-awaiting">بانتظار الإسناد: {partsText(a.missingParts)}</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground m-0 print:hidden">التنفيذُ لمن أسنده المسؤولُ أو المشرفُ العام — كلُّ جزءٍ لمُسنَده أو لبديلٍ معتمَد.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {a.parts.map((p) => {
          const v = a.verdicts[p.part];
          return (
            <div key={p.part} className={cn("rounded-md border p-2 space-y-0.5 min-w-0", p.assignee?.eligible ? "bg-slate-50/60" : "bg-amber-50/70 border-amber-300")}
              data-testid={`assignment-part-${p.part}`}>
              <div className="text-xs text-muted-foreground">جزءُ «{PART_LABELS[p.part]}»</div>
              {p.assignee ? (
                <div className="text-sm font-semibold break-words" data-testid={`assignment-holder-${p.part}`}>
                  {p.assignee.name ?? "—"} {roleAr(p.assignee.role) && <span className="text-xs font-normal text-muted-foreground">({roleAr(p.assignee.role)})</span>}
                  {viewerId != null && p.assignee.id === viewerId && <span className="ms-1 rounded-full bg-violet-100 text-violet-800 px-1.5 text-[11px] font-semibold">أنت</span>}
                </div>
              ) : (
                <div className="text-sm font-semibold text-amber-900">بانتظار الإسناد</div>
              )}
              {p.assignee && !p.assignee.eligible && <div className="text-[11px] text-amber-900">الحسابُ خارج فرع الخطّة أو القسم الآن — أعِد الإسناد.</div>}
              {p.assignedByName && (
                <div className="text-[11px] text-muted-foreground">
                  أسنده {p.assignedByName}{p.assignedAt ? ` · ${dayAr(p.assignedAt.slice(0, 10))}` : ""}{p.assignedVersion ? ` · النسخة ${arText(p.assignedVersion)}` : ""}
                </div>
              )}
              {p.reason && <div className="text-[11px] text-slate-700 break-words">السبب: {p.reason}</div>}
              {a.canAssign && p.assignee && !p.seenByHolder && <div className="text-[11px] text-sky-800">جديد — لم تُفتح الخطّةُ بعدُ من حساب المُسنَد</div>}
              {v && !v.ok && !a.canAssign && p.assignee && viewerId !== p.assignee.id && (
                <div className="text-[11px] text-muted-foreground">يسجّله {p.assignee.name ?? "—"} أو بديلٌ معتمَد.</div>
              )}
            </div>
          );
        })}
      </div>
      {a.substitutions.length > 0 && (
        <div className="space-y-1.5 print:hidden" data-testid="assignment-substitutions">
          <div className="text-xs font-semibold">البدلاء</div>
          {a.substitutions.map((s) => <SubstitutionItem key={s.id} s={s} viewerId={viewerId} approver={a.canAssign} showScope={s.planId == null} testPrefix="plan-sub" />)}
        </div>
      )}
      {!closed && (a.canAssign || a.canRequestSubstitute.length > 0) && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {a.canAssign && (
            <Button size="sm" className="gap-1 bg-violet-700 hover:bg-violet-800" onClick={onAssign} data-testid="button-assign-parts">
              <UserPlus className="w-4 h-4" /> {anyHolder ? "تغيير الإسناد" : "إسناد"}
            </Button>
          )}
          {(a.canRequestSubstitute.length > 0 || (a.canAssign && anyHolder)) && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onSubstitute} data-testid="button-request-substitute">
              <CalendarClock className="w-4 h-4" /> {a.canAssign && a.canRequestSubstitute.length === 0 ? "أنشئ بديلاً" : "اطلب بديلاً"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** **«جديد — أُسند إليك»**: يُقال مرّةً في هذه الزيارة للصفحة، ويُعلَّم «رآه» في الخادم في الحال. */
export function AssignedToYouBanner({ planId, unseen }: { planId: number; unseen: PlanPart[] }) {
  const [shown] = useState<PlanPart[]>(() => unseen);
  const sent = useRef(false);
  const refresh = useAssignmentRefresh();
  useEffect(() => {
    if (sent.current || !unseen.length) return;
    sent.current = true;
    apiRequest("POST", "/api/physio/part-assignments/seen", { planId }).then(() => refresh(planId)).catch(() => { sent.current = false; });
  }, [planId, unseen.length]);
  if (!shown.length) return null;
  return (
    <div className="rounded-md border border-sky-300 bg-sky-50 p-2 text-sm text-sky-950 print:hidden" dir="rtl" data-testid="assigned-to-you">
      <b>جديد</b> — أُسند إليك جزءُ {partsText(shown)} من هذه الخطّة. تسجّله أنت في «جلسات اليوم»، وإن غبت فاطلب بديلاً.
    </div>
  );
}

// ══ «إسناد» للمعتمِد ═══════════════════════════════════════════════════════════════════════════
interface Candidate { id: number; name: string; role: string; canDryNeedle?: boolean; planHasNeedle?: boolean }

export function AssignPartsDialog({ planId, branchName, assignment, open, onClose }: {
  planId: number; branchName: string | null; assignment: AssignmentView; open: boolean; onClose: () => void;
}) {
  const { toast } = useToast();
  const refresh = useAssignmentRefresh();
  const required = assignment.required;
  const both = required.includes("devices") && required.includes("exercises");
  const current = (part: PlanPart) => assignment.parts.find((p) => p.part === part)?.assignee?.id ?? null;
  const c = useQuery<Candidate[]>({
    queryKey: [`/api/physio/plans/${planId}/assignee-candidates`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${planId}/assignee-candidates`)).json(),
    enabled: open,
  });
  const [pick, setPick] = useState<Record<PlanPart, string>>({ devices: "", exercises: "" });
  const [same, setSame] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) return;
    const d = current("devices"); const x = current("exercises");
    setPick({ devices: d ? String(d) : "", exercises: x ? String(x) : "" });
    setSame(both && d != null && d === x);
    setReason("");
  }, [open, planId]);
  const effective = (part: PlanPart): string => (same && part === "exercises" ? pick.devices : pick[part]);
  const changes: Partial<Record<PlanPart, number | null>> = {};
  for (const part of required) {
    const now = effective(part);
    const was = current(part);
    const nowId = now ? Number(now) : null;
    if (nowId !== was) changes[part] = nowId;
  }
  const replacing = (Object.keys(changes) as PlanPart[]).some((part) => current(part) != null);
  const reasonOk = !replacing || reason.trim().length >= 3;
  const list = c.data ?? [];
  const byId = (id: string) => list.find((u) => String(u.id) === id);
  const planHasNeedle = assignment.planHasNeedle || list.some((u) => u.planHasNeedle);
  const needleHolder = required.includes("devices") ? byId(effective("devices")) : undefined;
  const m = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/physio/plans/${planId}/part-assignments`, { ...changes, ...(replacing ? { reason: reason.trim() } : {}) })).json(),
    onSuccess: (r: any) => {
      const left: PlanPart[] = r?.needsAssignment ?? [];
      toast({ title: "حُفظ الإسناد", description: left.length ? `ما زال ${partsText(left)} بلا إسناد.` : "يصل كلَّ مُسنَدٍ تنبيهٌ في التطبيق، وفي تلغرام إن ربط حسابَه." });
      refresh(planId); onClose();
    },
    onError: (e) => { refresh(planId); toast({ title: "خطأ", description: errText(e), variant: "destructive" }); },
  });
  const Select = ({ part }: { part: PlanPart }) => (
    <label className="block text-sm min-w-0">
      <span className="font-medium">{both && same ? "الجزآن معاً" : `جزءُ «${PART_LABELS[part]}»`}</span>
      <select className="mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm" value={pick[part]} disabled={c.isLoading}
        onChange={(e) => setPick((p) => ({ ...p, [part]: e.target.value }))} data-testid={`assign-select-${part}`}>
        <option value="">بلا إسناد</option>
        {list.map((u) => <option key={u.id} value={u.id}>{u.name}{roleAr(u.role) ? ` — ${roleAr(u.role)}` : ""}</option>)}
      </select>
    </label>
  );
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إسناد خطّة {AI_BRAND}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground m-0">
          التنفيذُ محصورٌ بمن تختاره من قسم العلاج الطبيعي في فرع {branchName ?? "الخطّة"}، ويمكن تقسيمُها: الأجهزةُ لواحد والتمارينُ لآخر. ويصل كلَّ مُسنَدٍ تنبيهٌ في التطبيق، وفي تلغرام إن ربط حسابَه.
        </p>
        {c.isError && <p className="text-sm text-red-700">{errText(c.error)}</p>}
        {!c.isLoading && list.length === 0 && !c.isError && <p className="text-sm text-muted-foreground">لا حسابات علاج طبيعي في هذا الفرع.</p>}
        {both && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={same} onCheckedChange={(v) => setSame(v === true)} data-testid="assign-same" /> الجزآن لشخصٍ واحد
          </label>
        )}
        <div className={cn("grid gap-3", both && !same ? "sm:grid-cols-2" : "")}>
          {required.includes("devices") && <Select part="devices" />}
          {required.includes("exercises") && !(both && same) && <Select part="exercises" />}
        </div>
        {planHasNeedle && needleHolder && !needleHolder.canDryNeedle && (
          <p className="text-[11px] text-amber-800 m-0 flex gap-1" data-testid="assign-needle-warning">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> في الخطّة إبرٌ جافة — ليست لـ«{needleHolder.name}» صلاحيتُها، فيعلّمها حاملُها أو المعتمِد.
          </p>
        )}
        {replacing && (
          <label className="block text-sm">
            <span className="font-medium">سببُ تغيير الإسناد *</span>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 bg-white" placeholder="مثال: نُقل علي إلى فرعٍ آخر"
              data-testid="assign-reason" />
            <span className="text-[11px] text-muted-foreground">يصل المُسنَدَ القديم والجديد، ويُلغى كلُّ بديلٍ لم يعد له إسناد.</span>
          </label>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={m.isPending || !Object.keys(changes).length || !reasonOk} onClick={() => m.mutate()} className="bg-violet-700 hover:bg-violet-800"
            data-testid="button-save-part-assignments">{m.isPending ? "جارٍ الحفظ…" : "عيّن وأرسل التنبيه"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ «اطلب بديلاً» ══════════════════════════════════════════════════════════════════════════════
interface SubCandidate { id: number; name: string | null; role: string | null; branches: number[]; canDryNeedle: boolean }

export function SubstituteRequestDialog({ open, onClose, planId = null, approver, holders = [], viewerId }: {
  open: boolean; onClose: () => void;
  /** من صفحة الخطّة: «هذه الخطّة وحدها» افتراضاً؛ ومن «جلسات اليوم»: كلُّ خططي. */
  planId?: number | null; approver: boolean;
  /** للمعتمِد من صفحة الخطّة: مَن يغيب (مُسنَدو الخطّة). */
  holders?: { id: number; name: string | null }[]; viewerId: number | null;
}) {
  const { toast } = useToast();
  const refresh = useAssignmentRefresh();
  const today = baghdadTodayYmd();
  const selfHolder = viewerId != null && holders.some((h) => h.id === viewerId);
  const [onBehalf, setOnBehalf] = useState<string>("");
  const [scope, setScope] = useState<"plan" | "all">(planId ? "plan" : "all");
  const [part, setPart] = useState<"" | PlanPart>("");
  const [sub, setSub] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) return;
    setScope(planId ? "plan" : "all"); setPart(""); setSub(""); setFrom(today); setTo(today); setReason("");
    setOnBehalf(approver && !selfHolder && holders[0] ? String(holders[0].id) : "");
  }, [open]);
  const assigneeId = approver && onBehalf ? Number(onBehalf) : viewerId;
  const qs = new URLSearchParams();
  if (assigneeId) qs.set("assigneeId", String(assigneeId));
  if (scope === "plan" && planId) qs.set("planId", String(planId));
  if (part) qs.set("part", part);
  const cq = useQuery<{ candidates: SubCandidate[]; needleInScope: boolean; coveredPlans: number; branchIds: number[] }>({
    queryKey: ["/api/physio/substitute-candidates", qs.toString()],
    queryFn: async () => (await apiRequest("GET", `/api/physio/substitute-candidates?${qs.toString()}`)).json(),
    enabled: open && Boolean(assigneeId), retry: false,
  });
  const list = cq.data?.candidates ?? [];
  const picked = list.find((u) => String(u.id) === sub);
  useEffect(() => { if (sub && !picked && cq.data) setSub(""); }, [cq.data]);
  const inputErr = substitutionInputError({ dateFrom: from, dateTo: to, reason, today });
  const m = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/physio/substitutes", {
      ...(approver && onBehalf ? { assigneeId: Number(onBehalf) } : {}), substituteId: Number(sub),
      ...(scope === "plan" && planId ? { planId } : {}), ...(part ? { part } : {}), dateFrom: from, dateTo: to, reason: reason.trim(),
    })).json(),
    onSuccess: (r: any) => {
      const ok = r?.substitution?.status === "approved";
      toast({ title: ok ? "أُنشئ البديل واعتُمد" : "أُرسل طلبُ البديل", description: ok ? "يعلم المُسنَدُ والبديل." : "ينتظر اعتمادَ المسؤول أو المشرف العام، ويصلك القرار." });
      refresh(planId); onClose();
    },
    onError: (e) => { refresh(planId); toast({ title: "لم يُرسَل", description: errText(e), variant: "destructive" }); },
  });
  const partial = picked && cq.data && picked.branches.length < cq.data.branchIds.length;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{approver ? "بديلٌ لغياب مُسنَد" : "أنا غائب — اطلب بديلاً"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {approver && holders.length > 0 && (
            <label className="block text-sm">
              <span className="font-medium">الغائب</span>
              <select className="mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm" value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)} data-testid="sub-on-behalf">
                {selfHolder && <option value="">أنا</option>}
                {holders.filter((h) => h.id !== viewerId).map((h) => <option key={h.id} value={h.id}>{h.name ?? "—"}</option>)}
              </select>
            </label>
          )}
          {planId && (
            <div className="space-y-1 text-sm" role="radiogroup">
              <span className="font-medium">النطاق</span>
              <label className="flex items-center gap-2"><input type="radio" checked={scope === "plan"} onChange={() => setScope("plan")} data-testid="sub-scope-plan" /> هذه الخطّة وحدها</label>
              <label className="flex items-center gap-2"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} data-testid="sub-scope-all" />
                {approver && onBehalf ? "كلّ خطط الغائب" : "كلّ خططي"}</label>
            </div>
          )}
          <label className="block text-sm">
            <span className="font-medium">الجزء</span>
            <select className="mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm" value={part} onChange={(e) => setPart(e.target.value as any)} data-testid="sub-part">
              <option value="">{approver && onBehalf ? "كلّ ما أُسند إلى الغائب" : "كلّ ما أُسند إليّ"}</option>
              <option value="devices">الأجهزة وحدها</option>
              <option value="exercises">التمارين وحدها</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">{approver ? "البديل (من منفّذي فرع الخطّة)" : "البديل (من منفّذي فرعك)"}</span>
            <select className="mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm" value={sub} onChange={(e) => setSub(e.target.value)} disabled={cq.isLoading}
              data-testid="sub-candidate">
              <option value="">— اختر —</option>
              {list.map((u) => <option key={u.id} value={u.id}>{u.name ?? "—"}{roleAr(u.role) ? ` — ${roleAr(u.role)}` : ""}</option>)}
            </select>
            {cq.isError && <span className="text-[11px] text-red-700">{errText(cq.error)}</span>}
            {cq.data && cq.data.coveredPlans === 0 && <span className="text-[11px] text-amber-800">لا جزءَ مُسنَداً في هذا النطاق — لا شيءَ يُغطّى.</span>}
            {!cq.isLoading && cq.data && cq.data.coveredPlans > 0 && list.length === 0 && <span className="text-[11px] text-muted-foreground">لا منفّذَ آخر في فرعك.</span>}
          </label>
          {picked && cq.data?.needleInScope && !picked.canDryNeedle && (
            <p className="text-[11px] text-amber-800 m-0" data-testid="sub-needle-warning">فيها إبرٌ جافة — ليست لـ«{picked.name}» صلاحيتُها، فيعلّمها حاملُها أو المعتمِد.</p>
          )}
          {partial && <p className="text-[11px] text-amber-800 m-0">حسابُ «{picked!.name}» ليس في كلّ فروع هذه الخطط — تُغطّى خططُ فروعه وحدها.</p>}
          <div className="grid grid-cols-1 gap-2">
            <label className="block text-sm"><span className="font-medium">من</span>
              <Input type="date" min={today} value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} className="mt-1 bg-white" data-testid="sub-from" />
            </label>
            <label className="block text-sm"><span className="font-medium">إلى</span>
              <Input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 bg-white" data-testid="sub-to" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">السبب *</span>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 bg-white" placeholder="مثال: إجازةٌ مرضية" data-testid="sub-reason" />
          </label>
          {inputErr && (reason.trim() || from !== today || to !== today) && <p className="text-[11px] text-red-700 m-0">{inputErr}</p>}
          <p className="text-[11px] text-muted-foreground m-0">
            {approver ? "يُعتمد البديلُ حين تُنشئه، ويعلم المُسنَدُ والبديل." : "لا ينفّذ البديلُ حتى يعتمده المسؤولُ أو المشرفُ العام، ويصلكما القرار. وبديلُ «كلّ خططي» يغطّي ما أُسند إليك حين يُعتمد — وما يُسند بعده يحتاج طلباً جديداً."}
            {` أقصى المدّة ${arText(SUBSTITUTION_MAX_DAYS)} يوماً.`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={m.isPending || !sub || Boolean(inputErr) || !assigneeId} onClick={() => m.mutate()} data-testid="button-send-substitute">
            {m.isPending ? "جارٍ الإرسال…" : approver ? "أنشئ البديل" : "اطلب البديل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** المُسنَدون الحاليّون (لاختيار الغائب). */
export const holdersOf = (a: AssignmentView) => {
  const seen = new Map<number, { id: number; name: string | null }>();
  for (const p of a.parts) if (p.assignee && p.assignee.eligible) seen.set(p.assignee.id, { id: p.assignee.id, name: p.assignee.name });
  return Array.from(seen.values());
};
export const useHolders = (a: AssignmentView | null | undefined) => useMemo(() => (a ? holdersOf(a) : []), [a]);
