// **خططُ العلاج الطبيعي في ملفّ المريض** (§4.cm) — أعلى تبويب «الخطط العلاجية»؛ والخططُ القديمة تحتها للقراءة.
// «خطّة جديدة» تختار بروتوكولاً من المكتبة (أو بلا بروتوكول) فتُنشأ مسوّدةً ممتلئةً منه، وتُفتح صفحتُها للتعديل.
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Play, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AGE_GROUP_LABELS, type AgeGroup } from "@shared/physio_protocols";
import { PLAN_STATUS_LABELS, UNAPPROVED_PROTOCOL_BADGE, isPlanClosed, type PlanStatus, PLAN_REVIEW_LABELS } from "@shared/physio_plans";
import { ExecuteSessionDialog } from "@/components/physio/ExecuteSession";
import { SuggestBox, type SuggestInfo } from "@/components/physio/PlanSuggestion";

interface PlanRow {
  id: number; titleAr: string; status: PlanStatus; createdByName: string | null; createdAt: string;
  decidedByName: string | null; protocolStatus: string | null; protocolId: number | null; deviceCount: number; assignees: string[];
  reviewStatus?: "awaiting" | "reviewed" | null;
  canExecute?: boolean;
}
interface ProtocolRow { id: number; titleAr: string; titleEn: string; ageGroup: AgeGroup; status: "draft" | "approved" }

export const PLAN_STATUS_TONE: Record<PlanStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  returned: "bg-orange-100 text-orange-800 border-orange-300",
  stopped: "bg-zinc-200 text-zinc-700 border-zinc-300",
  graduated: "bg-sky-100 text-sky-800 border-sky-300",
};

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—");

export function PhysioPlansSection({ patientId }: { patientId: number }) {
  const [, setLocation] = useLocation();
  const [pickOpen, setPickOpen] = useState(false);
  const [deleting, setDeleting] = useState<PlanRow | null>(null);
  const [changingType, setChangingType] = useState<PlanRow | null>(null);
  const [executing, setExecuting] = useState<number | null>(null);
  const q = useQuery<{ plans: PlanRow[]; canWrite: boolean; canApprove: boolean; canDelete: boolean; suggest: SuggestInfo | null }>({
    queryKey: [`/api/patients/${patientId}/physio-plans`],
    queryFn: async () => (await apiRequest("GET", `/api/patients/${patientId}/physio-plans`)).json(),
    retry: false,
  });
  //  مَن لا يقرأ الخطط (استقبالٌ مثلاً) لا يرى هذا القسم أصلاً — والخادمُ يردّ ٤٠٣.
  if (q.isError) return null;
  const plans = q.data?.plans ?? [];
  return (
    <div className="space-y-3" data-testid="physio-plans-section">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-green-700" /> خطط العلاج الطبيعي</h3>
        {q.data?.canWrite && (
          <Button size="sm" onClick={() => setPickOpen(true)} className="gap-1" data-testid="button-new-physio-plan">
            <Plus className="w-4 h-4" /> خطة جديدة
          </Button>
        )}
      </div>
      {q.isLoading ? (
        <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
      ) : plans.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground" data-testid="physio-plans-empty">لا خطة علاج طبيعي لهذا المريض بعد.</Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="flex items-stretch gap-1">
            <button type="button" onClick={() => setLocation(`/physio/plans/${p.id}`)}
              className="flex-1 text-right rounded-lg border bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-slate-50"
              data-testid={`physio-plan-row-${p.id}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{p.titleAr}</span>
                <Badge variant="outline" className={PLAN_STATUS_TONE[p.status]}>{PLAN_STATUS_LABELS[p.status]}</Badge>
                {p.protocolId && p.protocolStatus !== "approved" && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">{UNAPPROVED_PROTOCOL_BADGE}</Badge>
                )}
                {/*  بدأها كاتبُها على بروتوكولٍ معتمَد — تُنفَّذ وتنتظر نظرةَ المشرف (§4.cz). */}
                {p.status === "approved" && p.reviewStatus === "awaiting" && (
                  <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300" data-testid={`physio-plan-awaiting-review-${p.id}`}>{PLAN_REVIEW_LABELS.awaiting}</Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {p.deviceCount} جهاز · كتبها {p.createdByName ?? "—"} في {fmt(p.createdAt)}
                {p.decidedByName && p.status === "approved" ? ` · اعتمدها ${p.decidedByName}` : ""}
                {p.assignees.length ? ` · المنفّذون: ${p.assignees.join("، ")}` : ""}
              </div>
            </button>
            {/*  «تنفيذ جلسة» — لمنفّذي القسم في فرع الخطّة المعتمَدة (§4.cn). */}
            {p.canExecute && (
              <div className="flex flex-col justify-center">
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setExecuting(p.id)}
                  data-testid={`button-execute-physio-plan-${p.id}`}><Play className="w-4 h-4" /> تنفيذ جلسة</Button>
              </div>
            )}
            {/*  تغييرُ نوع الخطّة وحذفُها من الملفّ — للمسؤول والمشرف العام حصراً (طلبُ المالك ٢٠٢٦-١٠-٠٧)، والخادمُ يحرسهما. */}
            {q.data?.canDelete && (
              <div className="flex flex-col justify-center gap-1">
                {!isPlanClosed(p.status) && (
                  <Button variant="ghost" size="icon" title="تغيير نوع الخطّة" onClick={() => setChangingType(p)}
                    data-testid={`button-change-type-physio-plan-${p.id}`}><RefreshCcw className="w-4 h-4" /></Button>
                )}
                <Button variant="ghost" size="icon" title="حذف" onClick={() => setDeleting(p)}
                  data-testid={`button-delete-physio-plan-${p.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            )}
            </div>
          ))}
        </div>
      )}
      <ChangePlanTypeDialog plan={changingType} onClose={() => setChangingType(null)} patientId={patientId} />
      <DeletePlanDialog plan={deleting} onClose={() => setDeleting(null)} patientId={patientId} />
      <ExecuteSessionDialog planId={executing} onClose={() => setExecuting(null)} />
      <NewPlanDialog open={pickOpen} onOpenChange={setPickOpen} patientId={patientId} suggest={q.data?.suggest ?? null}
        onCreated={(id) => setLocation(`/physio/plans/${id}?edit=1`)} />
    </div>
  );
}

function NewPlanDialog({ open, onOpenChange, patientId, suggest, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; patientId: number; suggest: SuggestInfo | null; onCreated: (id: number) => void;
}) {
  const { toast } = useToast();
  const [blankTitle, setBlankTitle] = useState("");
  const m = useMutation({
    mutationFn: async (body: { protocolId?: number; titleAr?: string }) =>
      (await apiRequest("POST", `/api/patients/${patientId}/physio-plans`, body)).json(),
    onSuccess: (row: any) => { onOpenChange(false); onCreated(row.id); },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>خطة علاج طبيعي جديدة</DialogTitle></DialogHeader>
        {/*  «اقترح خطّة» (§4.co) — لكاتبي الخطط، والخادمُ يقرّر مَن يراه (`suggest` غائبٌ لغيرهم). */}
        {open && suggest && <SuggestBox patientId={patientId} info={suggest} onCreated={(id) => { onOpenChange(false); onCreated(id); }} />}
        <p className="text-xs text-muted-foreground">
          اختر بروتوكول الحالة فتمتلئ الخطّة منه — الأهداف والتمارين والاحتياطات والجرعة، والأجهزةُ الموصى بها والاختيارية المتوفّرة في فرعك.
          ثمّ عدّلها لهذا المريض. وتبقى مسوّدةً لا تُنفَّذ حتى تُعتمَد.
        </p>
        <ProtocolPicker enabled={open} disabled={m.isPending} onPick={(id) => m.mutate({ protocolId: id })} />
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs font-medium">أو خطّةٌ بلا بروتوكول</div>
          <div className="flex gap-2">
            <Input value={blankTitle} onChange={(e) => setBlankTitle(e.target.value)} placeholder="عنوان الخطّة" data-testid="input-plan-blank-title" />
            <Button variant="outline" disabled={!blankTitle.trim() || m.isPending} onClick={() => m.mutate({ titleAr: blankTitle.trim() })}
              data-testid="button-plan-blank">إنشاء</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** **حذفُ الخطّة** — تأكيدٌ صريح، ويُكتب ما حُذف كاملاً في سجلّ التدقيق. */
export function DeletePlanDialog({ plan, onClose, patientId, onDeleted }: {
  plan: { id: number; titleAr: string } | null; onClose: () => void; patientId: number; onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/physio/plans/${id}`)).json(),
    onSuccess: () => {
      toast({ title: "حُذفت الخطّة" });
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/physio-plans`] });
      qc.invalidateQueries({ queryKey: ["/api/physio/plans"] });
      onClose(); onDeleted?.();
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={plan !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>حذف الخطّة</DialogTitle></DialogHeader>
        <p className="text-sm">تُحذف خطّة «{plan?.titleAr}» بأجهزتها وإسنادها من ملفّ المريض، ويُحفظ ما حُذف في سجلّ التدقيق. لإنهاء خطّةٍ نُفّذت استعمل «إيقاف الخطّة» بدل الحذف.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="destructive" disabled={m.isPending || !plan} onClick={() => plan && m.mutate(plan.id)} data-testid="button-confirm-delete-physio-plan">حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** قائمةُ البروتوكولات للاختيار — بحثٌ بالعربية والإنكليزية، وشارةُ «غير معتمد بعد». */
function ProtocolPicker({ enabled, disabled, onPick, excludeId }: {
  enabled: boolean; disabled: boolean; onPick: (protocolId: number) => void; excludeId?: number | null;
}) {
  const [search, setSearch] = useState("");
  const list = useQuery<ProtocolRow[]>({
    queryKey: ["/api/physio/protocols", "plan-picker"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/protocols")).json(),
    enabled,
  });
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (list.data ?? []).filter((p) => p.id !== excludeId && (!t || p.titleAr.includes(search.trim()) || p.titleEn.toLowerCase().includes(t)));
  }, [list.data, search, excludeId]);
  return (
    <>
      <div className="relative">
        <Search className="w-4 h-4 absolute right-2 top-2.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الحالة بالعربية أو الإنكليزية"
          className="pr-8" data-testid="input-plan-protocol-search" />
      </div>
      <div className="max-h-[45vh] overflow-y-auto space-y-1.5">
        {list.isLoading && <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>}
        {rows.map((p) => (
          <button key={p.id} type="button" disabled={disabled} onClick={() => onPick(p.id)}
            className="w-full text-right rounded-md border px-3 py-2 hover:bg-slate-50 hover:border-primary/40"
            data-testid={`plan-protocol-${p.id}`}>
            <div className="text-sm font-medium">{p.titleAr} <span className="text-xs text-muted-foreground" dir="ltr">{p.titleEn}</span></div>
            <div className="text-[11px] text-muted-foreground flex gap-2">
              <span>{AGE_GROUP_LABELS[p.ageGroup]}</span>
              {p.status !== "approved" && <span className="text-yellow-700">{UNAPPROVED_PROTOCOL_BADGE}</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * **تغييرُ نوع الخطّة** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — للمسؤول والمشرف العام: بروتوكولٌ آخر يملأ الخطّةَ نفسَها،
 * لا تعديلُ مواصفاتها. ويبقى المنفّذون وملاحظاتُ الأخصائيّ والحالة.
 */
export function ChangePlanTypeDialog({ plan, onClose, patientId, onChanged }: {
  plan: { id: number; titleAr: string; protocolId: number | null } | null; onClose: () => void; patientId: number; onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: async (protocolId: number) => (await apiRequest("POST", `/api/physio/plans/${plan!.id}/change-protocol`, { protocolId })).json(),
    onSuccess: () => {
      toast({ title: "تغيّر نوعُ الخطّة" });
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/physio-plans`] });
      qc.invalidateQueries({ queryKey: [`/api/physio/plans/${plan!.id}`] });
      qc.invalidateQueries({ queryKey: ["/api/physio/plans"] });
      onClose(); onChanged?.();
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={plan !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>تغيير نوع الخطّة</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground" data-testid="hint-change-plan-type">
          النوعُ الحاليّ: <b>{plan?.titleAr}</b>. اختر البروتوكولَ الصحيح فتمتلئ الخطّةُ منه — العنوانُ والأهدافُ والتمارينُ والموانعُ والجرعةُ والأجهزة.
          ويبقى المنفّذون وملاحظاتُ الأخصائيّ وحالةُ الخطّة، ويُكتب التغييرُ في سجلّ التدقيق.
        </p>
        <ProtocolPicker enabled={plan !== null} disabled={m.isPending} excludeId={plan?.protocolId ?? null} onPick={(id) => m.mutate(id)} />
      </DialogContent>
    </Dialog>
  );
}
