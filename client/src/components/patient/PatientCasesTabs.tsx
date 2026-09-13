import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Activity, Wrench, HeartPulse, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateIraq } from "@/lib/utils";
import { useBranchSession } from "@/components/BranchGate";
import { MoneyInput } from "@/components/ui/money-input";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { invalidatePatientData } from "@/lib/queryClient";

// Phase 2 (relocated): the case selector lives as clickable CHIPS in the
// patient header (next to the branch), and clicking a chip shows that case's
// fully independent view — its own details, cost, paid/remaining, visits and
// payments (case_id-attributed). One patient, a separate page per specialty.

export interface CaseRow {
  id: number;
  caseType: "physiotherapy" | "prosthetic" | "medical_support" | string;
  status: string;
  cost: number;
  /**
   * غائبةٌ (لا صفر) حين لا يملك المستخدمُ `canViewPayments` — الخادم
   * (`GET /api/patients/:id/cases`) يحذف الحقلَ لا يُصفّره (إصلاحٌ
   * 2026-09-03). الكلفةُ نفسُها ليست دفعةً فتبقى ظاهرة دوماً.
   */
  paid?: number;
  remaining?: number;
  visitCount: number;
  details: Record<string, any> | null;
}

const CASE_META: Record<string, { label: string; icon: any }> = {
  physiotherapy: { label: "علاج طبيعي", icon: Activity },
  prosthetic: { label: "أطراف صناعية", icon: Wrench },
  medical_support: { label: "مساند طبية", icon: HeartPulse },
};
const meta = (t: string) => CASE_META[t] ?? { label: t, icon: Activity };

const DETAIL_LABELS: Record<string, string> = {
  amputationSite: "موقع البتر", prostheticType: "نوع الطرف",
  siliconType: "نوع السيليكون", siliconSize: "قياس السيليكون",
  suspensionSystem: "نظام التعليق", footType: "نوع القدم",
  footSize: "قياس الحذاء", kneeJointType: "نوع مفصل الركبة",
  injurySide: "الجهة", injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
  injuryType: "نوع الإصابة", diseaseType: "التشخيص", injuryArea: "منطقة الإصابة",
  treatmentType: "نوع العلاج", supportType: "نوع المسند",
};

const fmtIQD = (n: number | undefined) => `${(n || 0).toLocaleString("en-US")} د.ع`;

// Clickable chips for the header — one per case, plus «الكل» (id -1) which
// clears the case filter so every visit/payment shows regardless of case.
export function PatientCaseChips({ cases, selectedId, onSelect }: {
  cases: CaseRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      {cases.length > 1 && (
        <button
          key="all"
          type="button"
          onClick={() => onSelect(-1)}
          data-testid="case-chip-all"
          className={`inline-flex items-center gap-1 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-base font-medium transition-colors border ${
            selectedId === -1
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-white text-primary border-primary/30 hover:bg-primary/5"
          }`}
        >
          الكل
        </button>
      )}
      {cases.map((c) => {
        const m = meta(c.caseType);
        const Icon = m.icon;
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            data-testid={`case-chip-${c.id}`}
            className={`inline-flex items-center gap-1 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-base font-medium transition-colors border ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-primary border-primary/30 hover:bg-primary/5"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        );
      })}
    </>
  );
}

// The selected case's fully independent panel.
// The selected case's header: its finances + type-specific details. The
// case's visits and payments render in the tabs below (filtered by case),
// so they are NOT duplicated here.
export function PatientCasePanel({ caseRow, patientId }: { caseRow: CaseRow; patientId: number }) {
  const details = caseRow.details || {};
  const detailKeys = Object.keys(DETAIL_LABELS).filter((k) => details[k]);
  const m = meta(caseRow.caseType);
  const Icon = m.icon;

  const session = useBranchSession();
  const canEditCost = !!session?.isAdmin || session?.role === "branch_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number>(caseRow.cost || 0);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/cases/${caseRow.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ cost: draft }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر الحفظ"); }
      return res.json();
    },
    //  ══ **إبطالٌ كاملٌ لا مفتاحاً واحداً** (تحكّمُ اتّساق الكلفة،
    //  2026-08-30) ═══════════════════════════════════════════════════════
    //  كان الإبطالُ يقتصر على `"cases"` بينما هذا الحفظُ صار يحرّك
    //  `total_cost` أيضاً — فتبقى الشاشةُ (والسجلّ والمحاسبة) على الرقم
    //  القديم حتى تحديثٍ يدويّ. `invalidatePatientData` نفسُها التي تنادِيها
    //  «تعديل مريض» وكلُّ مسارٍ ماليّ آخر — لا حسابَ إبطالٍ ثانٍ يُنسى هنا.
    onSuccess: () => {
      invalidatePatientData(queryClient, patientId);
      setEditing(false);
      toast({ title: "تم تحديث كلفة الحالة" });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  //  ══ `canViewPayments` — لا صفرَ زائفاً لمن لا يرى الدفعات (إصلاحٌ
  //  2026-09-03) ═══════════════════════════════════════════════════════
  //  `caseRow.paid` غائبةٌ (لا `0`) لهذا المستخدم — فحسابُ «متبقٍّ = الكلفة
  //  − صفر» كان سيعرض «المتبقّي = الكلفة الكاملة» كحقيقةٍ مالية لم تُقَل.
  //  `canViewCasePayments` تتحقّق من الحضور الفعليّ لا من صدق القيمة.
  const canViewCasePayments = caseRow.paid !== undefined;
  const remaining = canViewCasePayments ? (caseRow.cost || 0) - (caseRow.paid || 0) : undefined;

  // ADMIN-ONLY «حذف نوع الحالة» — also cleans ghost cases (flag wiped by the
  // old destructive edit while the case row survived showing a stale cost).
  const isAdminOnly = !!session?.isAdmin;
  //  سببُ السحب — يُكتب مرّةً في النافذة ويُحفَظ في التدقيق وعلى طلبات
  //  المراجعة المسحوبة. اختياريّ عمداً: الخادم يضع نصّاً افتراضياً صادقاً
  //  حين يُترَك فارغاً، فلا يوقف حقلٌ إضافيٌّ تصحيحَ خطأ إدخال.
  const [removeReason, setRemoveReason] = useState("");
  //  ══ **الشاشةُ لا تقرّر البابَ — الخادمُ يقوله** ═══════════════════════════
  //  المعاينةُ تُجلَب عند فتح النافذة: سقالةٌ تُهدَم، أم تاريخٌ يُغلَق وكم
  //  المالُ عليه. والأرقامُ من القاعدة، فلا يُحسَب صافي المقبوض في المتصفّح.
  const [removalOpen, setRemovalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [retainedReason, setRetainedReason] = useState("");
  const resetRemoval = () => {
    setRemoveReason(""); setRefundAmount(0); setRefundReason(""); setRetainedReason("");
  };
  const preview = useQuery<any>({
    queryKey: ["/api/patients/:id/case-type/:t/removal-preview", patientId, caseRow.caseType],
    queryFn: async () => {
      const res = await fetch(
        `/api/patients/${patientId}/case-type/${caseRow.caseType}/removal-preview`,
        { credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "تعذّر القراءة");
      return res.json();
    },
    enabled: isAdminOnly && removalOpen,
  });
  const netPaid = Number(preview.data?.money?.netPaid ?? 0);
  const retained = Math.max(0, netPaid - refundAmount);
  const mode: "dispose" | "close" | null = preview.data?.mode ?? null;

  const closeCase = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/case-type/${caseRow.caseType}/close`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: removeReason,
          refundAmount,
          refundReason: refundReason || undefined,
          retainedReason: retainedReason || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "تعذّر إغلاق الحالة");
      }
      return res.json();
    },
    onSuccess: (r: any) => {
      invalidatePatientData(queryClient, patientId);
      queryClient.invalidateQueries({ queryKey: ["/api/followups/decision-queue"] });
      resetRemoval(); setRemovalOpen(false);
      const refunded = Number(r?.money?.refundAmount ?? 0);
      toast({
        title: "أُغلقت الحالة",
        description: "خرجت من طوابير العمل، وكلُّ سجلّها محفوظ."
          + (refunded > 0 ? ` واسترُجع ${refunded.toLocaleString()} د.ع بحركة مالية مستقلة.` : ""),
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الإغلاق", description: err.message, variant: "destructive",
    }),
  });

  const removeCase = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/case-type/${caseRow.caseType}`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: removeReason }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        //  ══ **والحاجزُ يُقرأ بابَه** (CASEDEL-02) ════════════════════════
        //  كان التوست يعرض `e.message` وحدها — وأحياناً نصَّ Postgres خاماً
        //  عن مفتاحٍ أجنبي. الخادمُ صار يرسل `remedy` مع السبب، فيُعرَض
        //  معه: ما يمنع، ثمّ الخطوةُ التي تفكّه.
        const err: any = new Error(e.message || "تعذّر الحذف");
        err.remedy = typeof e.remedy === "string" ? e.remedy : null;
        throw err;
      }
      return res.json();
    },
    onSuccess: (r: any) => {
      invalidatePatientData(queryClient, patientId);
      queryClient.invalidateQueries({ queryKey: ["/api/followups/decision-queue"] });
      resetRemoval(); setRemovalOpen(false);
      const eps = Array.isArray(r?.disposed?.episodeIds) ? r.disposed.episodeIds.length : 0;
      const reqs = Array.isArray(r?.disposed?.reviewRequestIds) ? r.disposed.reviewRequestIds.length : 0;
      toast({
        title: "سُحب نوع الحالة",
        description: "نُقلت زياراته ودفعاته إلى الحالة المتبقية."
          + (eps ? ` وأُزيلت ${eps} من طلبات الأجهزة غير المستعملة.` : "")
          + (reqs ? ` وسُحبت ${reqs} من طلبات المراجعة المعلَّقة.` : ""),
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر السحب",
      description: err.remedy ? `${err.message}\n${err.remedy}` : err.message,
      variant: "destructive",
    }),
  });

  return (
    <Card className="p-4 md:p-6 rounded-2xl shadow-sm border-primary/20 mb-6 space-y-4">
      <h3 className="font-bold text-lg text-primary flex items-center gap-2">
        <Icon className="w-5 h-5" /> {m.label}
        {isAdminOnly && (
          <AlertDialog
            open={removalOpen}
            onOpenChange={(o) => { setRemovalOpen(o); if (!o) resetRemoval(); }}
          >
            <AlertDialogTrigger asChild>
              <button type="button" className="mr-auto text-red-400 hover:text-red-600" title="سحب نوع الحالة (المدير العام)" data-testid={`delete-case-${caseRow.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              {/*  ══ **زرٌّ واحد، والخادمُ يختار البابَ** ══════════════════════
                  السقالةُ تُهدَم والتاريخُ يُغلَق — والموظّفُ لا يُسأل أيَّهما،
                  فهو لا يعرف ما يشير إلى هذه الحالة في سبعة جداول.  */}
              {preview.isLoading && (
                <AlertDialogHeader>
                  <AlertDialogTitle>قراءة حالة الملف…</AlertDialogTitle>
                  <AlertDialogDescription>جارٍ فحص ما يرتبط بهذه الحالة.</AlertDialogDescription>
                </AlertDialogHeader>
              )}
              {preview.isError && (
                <AlertDialogHeader>
                  <AlertDialogTitle>تعذّرت القراءة</AlertDialogTitle>
                  <AlertDialogDescription data-testid={`removal-preview-error-${caseRow.id}`}>
                    {(preview.error as any)?.message || "أعد المحاولة."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              )}

              {mode === "dispose" && (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>سحب حالة «{m.label}» من ملف المريض؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      هذه الحالة <span className="font-semibold">لا تحمل أيّ سجلّ</span> — لا معاينة
                      ولا تصنيع ولا مال. تُنقل زياراتها ودفعاتها إلى الحالة المتبقية (لا تُحذف)،
                      وتُزال معها طلباتُ الأجهزة التي فتحها النظام تلقائياً ولم يستعملها أحد،
                      وتُصفَّر حقول النوع من الملف. يُسجَّل في سجل التدقيق.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600" htmlFor={`remove-case-reason-${caseRow.id}`}>
                      سبب السحب (اختياري — يُحفظ في سجل التدقيق)
                    </label>
                    <Input
                      id={`remove-case-reason-${caseRow.id}`}
                      data-testid={`remove-case-reason-${caseRow.id}`}
                      value={removeReason}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      placeholder="مثال: أُضيف بالخطأ عند التسجيل"
                    />
                  </div>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={(e) => { e.preventDefault(); removeCase.mutate(); }}
                    >سحب الحالة</AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}

              {mode === "close" && (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>إغلاق حالة «{m.label}»؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="font-semibold">لهذه الحالة سجلٌّ حقيقي فلا تُحذف</span> —
                      {" "}{preview.data?.blocker?.reason}
                      {" "}الإغلاقُ يُخرجها من طوابير العمل والعدّادات،
                      و<span className="font-semibold">يبقى كلُّ شيء كما هو</span>: المعاينات
                      وأوامر التصنيع والتسليم والصيانة والدفعات.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {/*  المالُ من الخادم — لا يُحسَب هنا.  */}
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1"
                       data-testid={`closure-money-${caseRow.id}`}>
                    <div className="flex justify-between">
                      <span className="text-slate-600">صافي المقبوض على هذه الحالة</span>
                      <span className="font-semibold tabular-nums">{fmtIQD(netPaid)}</span>
                    </div>
                    {Number(preview.data?.money?.refundedBefore ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>استُرجع سابقاً</span>
                        <span className="tabular-nums">{fmtIQD(preview.data.money.refundedBefore)}</span>
                      </div>
                    )}
                  </div>

                  {netPaid > 0 && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm text-slate-600" htmlFor={`refund-amount-${caseRow.id}`}>
                          كم استُرجع للمريض؟ (صفر إن لم يُردّ شيء)
                        </label>
                        <MoneyInput
                          value={refundAmount}
                          onValueChange={setRefundAmount}
                          data-testid={`refund-amount-${caseRow.id}`}
                        />
                        <p className="text-xs text-slate-500">
                          يُسجَّل حركةً مالية مستقلّة تُنقص الوارد والإيراد — والدفعة الأصلية لا تُمَسّ.
                        </p>
                      </div>
                      {refundAmount > 0 && (
                        <div className="space-y-1">
                          <label className="text-sm text-slate-600" htmlFor={`refund-reason-${caseRow.id}`}>
                            سبب الاسترجاع (إلزامي)
                          </label>
                          <Input
                            id={`refund-reason-${caseRow.id}`}
                            data-testid={`refund-reason-${caseRow.id}`}
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="مثال: أعاد الجهاز ولم يكمل العلاج"
                          />
                        </div>
                      )}
                      {retained > 0 && (
                        <div className="space-y-1">
                          <label className="text-sm text-slate-600" htmlFor={`retained-reason-${caseRow.id}`}>
                            سبب الاحتفاظ بـ {fmtIQD(retained)} (إلزامي)
                          </label>
                          <Input
                            id={`retained-reason-${caseRow.id}`}
                            data-testid={`retained-reason-${caseRow.id}`}
                            value={retainedReason}
                            onChange={(e) => setRetainedReason(e.target.value)}
                            placeholder="مثال: أجور عمل وقياسات نُفِّذت فعلاً"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm text-slate-600" htmlFor={`close-reason-${caseRow.id}`}>
                      سبب الإغلاق (إلزامي)
                    </label>
                    <Input
                      id={`close-reason-${caseRow.id}`}
                      data-testid={`close-reason-${caseRow.id}`}
                      value={removeReason}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      placeholder="مثال: انتهى العلاج وأُغلق الملف"
                    />
                  </div>

                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-amber-600 hover:bg-amber-700"
                      data-testid={`close-case-confirm-${caseRow.id}`}
                      onClick={(e) => { e.preventDefault(); closeCase.mutate(); }}
                    >إغلاق الحالة</AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        )}
      </h3>

      {/* Financial summary for THIS case */}
      <div className={`grid gap-3 ${canViewCasePayments ? "grid-cols-3" : "grid-cols-1"}`}>
        <div className="rounded-xl p-3 text-center text-slate-700 bg-slate-50 relative">
          <div className="text-xs opacity-80 flex items-center justify-center gap-1">
            التكلفة
            {canEditCost && !editing && (
              <button type="button" onClick={() => { setDraft(caseRow.cost || 0); setEditing(true); }} data-testid={`edit-case-cost-${caseRow.id}`} className="text-primary hover:opacity-70">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <MoneyInput value={draft} onValueChange={setDraft} className="h-8 text-center" />
              <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="text-green-600" data-testid={`save-case-cost-${caseRow.id}`}><Check className="w-4 h-4" /></button>
              <button type="button" onClick={() => setEditing(false)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="font-bold text-sm md:text-base">{fmtIQD(caseRow.cost)}</div>
          )}
        </div>
        {/*  `canViewCasePayments` — بلا صندوقَي «المدفوع»/«المتبقّي» إطلاقاً
            حين لا تصل القيمتان من الخادم؛ لا صفرَ زائفاً في مكانهما. */}
        {canViewCasePayments && (
          <>
            <StatBox label="المدفوع" value={fmtIQD(caseRow.paid)} tone="green" />
            <StatBox label="المتبقّي" value={fmtIQD(remaining)} tone={(remaining ?? 0) > 0 ? "red" : "green"} />
          </>
        )}
      </div>

      {detailKeys.length > 0 && (
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold text-primary mb-2">التفاصيل</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {detailKeys.map((k) => (
              <div key={k}>
                <div className="text-xs text-muted-foreground">{DETAIL_LABELS[k]}</div>
                <div className="font-medium">{k === "injuryDate" ? formatDateIraq(details[k]) : String(details[k])}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: "slate" | "green" | "red" }) {
  const toneCls = tone === "green" ? "text-green-700 bg-green-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <div className={`rounded-xl p-3 text-center ${toneCls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="font-bold text-sm md:text-base">{value}</div>
    </div>
  );
}
