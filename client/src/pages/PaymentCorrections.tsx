// طلباتُ تصحيح الدفعات — قائمةٌ واعتماد (2026-08-30).
//
// ══ المسؤولُ العامّ وحده ═════════════════════════════════════════════════
// نفسُ حارس `isGlobalAdmin` في `server/payments/correction_routes.ts` —
// الصفحةُ تفحص `session.isAdmin` محلياً قبل الجلب أصلاً (نمطُ
// `DiscountApprovals`/`ReturnedCharges` القائم)، والخادمُ هو الحارسُ
// الحقيقيّ الذي لا يتغيّر بتغيّر هذه الشاشة.
//
// ══ القرارُ — البابان القائمان وحدهما ═══════════════════════════════════
// «اعتماد» و«رفض» ينادِيان `POST /api/admin/payment-corrections/:id/
// approve|reject` القائمتين حرفياً (`server/payments/correction_routes.ts`)
// — لا منطقَ قرارٍ جديد هنا، ولا نسخةَ ثانية من `applyCorrectionWriteTx`.
// هذه الصفحةُ عميلٌ رقيقٌ فوق نقطتين موجودتين منذ الجولة السابقة.
//
// ══ بلا إزالةٍ تفاؤلية ═══════════════════════════════════════════════════
// الصفُّ لا يُحذَف محلياً عند الحفظ أبداً — نجاحٌ أو فشلٌ كلاهما يُبطلان
// استعلامَي القائمة والعدّاد فيُعاد الجلبُ من القاعدة، فتُعرَض الحقيقةُ لا
// تخمينٌ متفائل. تعارضٌ (٤٠٩ — تغيّرت بياناتُ الدفعة أو حالةُ الطلب منذ
// الفتح) يترك الصفَّ ظاهراً برسالة الخادم نفسِها، لا صمتاً ولا اختفاءً.
//
// ══ لماذا لا `apiRequest` ═══════════════════════════════════════════════
// `throwIfResNotOk` في `client/src/lib/queryClient.ts` تبني رسالةَ الخطأ من
// `res.text()` لا `res.json()`، فتصل رسالةُ الخادم كنصٍّ خامٍّ مسبوقٍ برمز
// الحالة (`'409: {"message":...}'`) لا جملةً عربية مقروءة. فهذا الملفّ
// ينادي `fetch` مباشرةً ويقرأ `body.message` صراحةً — نفسُ نمط
// `useDeletePayment`/`updatePaymentFull` في هذا الملفّ من الجولة السابقة.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import {
  Banknote, Loader2, ShieldAlert, AlertTriangle, AlertCircle, Trash2, Pencil, Check, X,
} from "lucide-react";

interface CorrectionRow {
  id: number;
  targetType: string;
  targetId: number;
  patientId: number;
  branchId: number;
  action: "update" | "delete";
  beforeSnapshot: Record<string, unknown> | null;
  requestedPatch: Record<string, unknown> | null;
  reason: string;
  status: string;
  requestedBy: number | null;
  requestedByName: string | null;
  requestedRole: string | null;
  requestedAt: string | null;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  appliedAt: string | null;
  patientName: string | null;
  patientCode: string | null;
  branchName: string | null;
  currentPaymentExists: boolean;
  currentAmount: number | null;
  currentDate: string | null;
  currentPaymentTreatmentType: string | null;
  currentIsFreeSessions: boolean | null;
  currentSessionCount: number | null;
  currentNotes: string | null;
}

// ══ تسمياتٌ عربيّة صديقة — كما وردت في المهمّة حرفياً ═══════════════════
const FIELD_LABELS: Record<string, string> = {
  amount: "المبلغ",
  date: "التاريخ المالي",
  paymentTreatmentType: "نوع العلاج",
  isFreeSessions: "جلسات مجانية",
  notes: "الملاحظات",
  sessionCount: "عدد الجلسات",
};

// ترتيبُ الحقول في العرض ثابتٌ ومقروء — لا ترتيبَ مفاتيح JSON العشوائي.
const FIELD_ORDER = ["amount", "date", "paymentTreatmentType", "isFreeSessions", "notes", "sessionCount"];

const REQUESTER_ROLE_LABELS: Record<string, string> = {
  reception: "الاستعلامات",
  accountant: "المحاسب",
  branch_manager: "مدير الفرع",
  admin: "المسؤول العام",
};

const money = (n: unknown) => `${Number(n || 0).toLocaleString("en-US")} د.ع`;

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (field) {
    case "amount": return money(value);
    case "date": return fmt(String(value));
    case "isFreeSessions": return value ? "نعم" : "لا";
    default: return String(value);
  }
}

/**
 * قيمةٌ سابقة ⟵ قيمةٌ مطلوبة — وحدةٌ معزولةٌ عن اتجاه الصفحة (نفسُ تقنية
 * `PriceTransition` المستعملة في `DiscountApprovals`، معمَّمةً لقيمٍ
 * نصّية لا رقمية فقط): بلا هذا العزل يقلب محرّكُ الاتجاه العربيّ سهماً
 * محايداً بين قيمتين فيُقرأ معكوساً.
 */
function ValueTransition({ from, to, testId }: { from: string; to: string; testId?: string }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", display: "inline-block" }}
      className="whitespace-nowrap" data-testid={testId}>
      <span className="text-muted-foreground line-through decoration-muted-foreground/60">{from}</span>
      <span aria-hidden="true" className="mx-1">→</span>
      <b>{to}</b>
    </span>
  );
}

function CurrentPaymentSummary({ r }: { r: CorrectionRow }) {
  if (!r.currentPaymentExists) {
    return (
      <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-300 rounded-md px-3 py-2 text-sm"
        data-testid={`correction-${r.id}-missing-payment`}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          <b>الدفعةُ المستهدَفة لم تعد موجودة</b> — لا يمكن معرفة حالتها الحالية، ولا يمكن
          اعتمادُ هذا الطلب. يبقى بإمكانك رفضُه.
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1"
      data-testid={`correction-${r.id}-current-payment`}>
      <p className="font-medium text-muted-foreground text-xs">الدفعةُ الحالية (كما هي الآن)</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
        <span>{FIELD_LABELS.amount}: <b className="font-mono">{money(r.currentAmount)}</b></span>
        <span>{FIELD_LABELS.date}: {fmt(r.currentDate)}</span>
        <span>{FIELD_LABELS.paymentTreatmentType}: {r.currentPaymentTreatmentType || "—"}</span>
        <span>{FIELD_LABELS.isFreeSessions}: {r.currentIsFreeSessions ? "نعم" : "لا"}</span>
        <span>{FIELD_LABELS.sessionCount}: {r.currentSessionCount ?? "—"}</span>
      </div>
      {r.currentNotes && (
        <p className="text-muted-foreground" dir="auto" style={{ unicodeBidi: "plaintext" }}>
          {FIELD_LABELS.notes}: {r.currentNotes}
        </p>
      )}
    </div>
  );
}

function CorrectionCard({
  r, approveDisabled, rejectDisabled, onApprove, onReject,
}: {
  r: CorrectionRow;
  approveDisabled: boolean;
  rejectDisabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const patchKeys = r.requestedPatch
    ? FIELD_ORDER.filter((k) => Object.prototype.hasOwnProperty.call(r.requestedPatch as object, k))
    : [];

  return (
    <Card data-testid={`correction-row-${r.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <span data-testid={`correction-${r.id}-patient-name`}>{r.patientName ?? "—"}</span>
          {r.patientCode && (
            <span className="text-xs font-mono text-muted-foreground"
              data-testid={`correction-${r.id}-patient-code`}>{r.patientCode}</span>
          )}
          {r.branchName && (
            <Badge variant="secondary" data-testid={`correction-${r.id}-branch`}>{r.branchName}</Badge>
          )}
          {r.action === "delete" ? (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
              <Trash2 className="w-3 h-3" /> طلبُ حذف دفعة
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
              <Pencil className="w-3 h-3" /> طلبُ تعديل دفعة
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
          <span>طلبها: <b className="text-foreground">{r.requestedByName ?? "—"}</b>
            {r.requestedRole && (
              <span> ({REQUESTER_ROLE_LABELS[r.requestedRole] ?? r.requestedRole})</span>
            )}
          </span>
          <span data-testid={`correction-${r.id}-requested-at`}>{fmt(r.requestedAt)}</span>
        </div>

        <p className="bg-muted/40 rounded-md px-3 py-2" dir="auto" style={{ unicodeBidi: "plaintext" }}
          data-testid={`correction-${r.id}-reason`}>
          <span className="text-muted-foreground">السبب: </span>{r.reason}
        </p>

        {r.action === "update" && patchKeys.length > 0 && (
          <div className="space-y-1.5" data-testid={`correction-${r.id}-patch`}>
            <p className="font-medium text-muted-foreground text-xs">التغييرُ المطلوب</p>
            {patchKeys.map((key) => (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{FIELD_LABELS[key] ?? key}:</span>
                <ValueTransition
                  testId={`correction-${r.id}-field-${key}`}
                  from={formatFieldValue(key, r.beforeSnapshot?.[key])}
                  to={formatFieldValue(key, (r.requestedPatch as any)?.[key])}
                />
              </div>
            ))}
          </div>
        )}

        <CurrentPaymentSummary r={r} />

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={approveDisabled}
            onClick={onApprove}
            data-testid={`correction-${r.id}-approve`}
          >
            <Check className="w-4 h-4" /> اعتماد
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
            disabled={rejectDisabled}
            onClick={onReject}
            data-testid={`correction-${r.id}-reject`}
          >
            <X className="w-4 h-4" /> رفض
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** أيّ قرارٍ يُطلَب تأكيدُه الآن — الصفُّ ونوعُ القرار معاً. */
type PendingDecision = { row: CorrectionRow; kind: "approve" | "reject" };

export default function PaymentCorrections() {
  const session = useBranchSession();
  const isAdmin = Boolean((session as any)?.isAdmin);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [confirm, setConfirm] = useState<PendingDecision | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading, isError, error } = useQuery<CorrectionRow[]>({
    queryKey: ["/api/admin/payment-corrections", "pending"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-corrections?status=pending", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.message || "تعذّر جلب طلبات تصحيح الدفعات");
      }
      return res.json();
    },
  });
  const rows = data ?? [];

  // ══ الاعتماد/الرفض — عميلٌ رقيقٌ فوق البابين القائمين ═══════════════════
  // نداءٌ واحدٌ يخدم الاثنين معاً (`kind` يختار المسار)، فلا منطقَ مكرَّراً.
  const decide = useMutation({
    mutationFn: async (v: { id: number; kind: "approve" | "reject"; decisionNote: string }) => {
      const res = await fetch(`/api/admin/payment-corrections/${v.id}/${v.kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decisionNote: v.decisionNote.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.message || (v.kind === "approve" ? "تعذّر اعتماد الطلب" : "تعذّر رفض الطلب"));
      }
      return res.json();
    },
    // بلا إزالةٍ تفاؤلية للصفّ: النجاحُ يُبطل القائمةَ والعدّادَ معاً فيُعاد
    // الجلبُ من القاعدة — لا حذفَ محلياً يفترض ما سيرجعه الخادم.
    onSuccess: (_data, v) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-corrections", "pending"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-corrections", "pending-count"] });
      toast({
        title: v.kind === "approve" ? "تمّ اعتماد الطلب" : "تمّ رفض الطلب",
        description: v.kind === "approve"
          ? "طُبِّق التصحيحُ على الدفعة، وقُيِّد أثرُها المحاسبيّ."
          : "لم يتغيّر شيءٌ في الدفعة — أُغلق الطلبُ دون تنفيذه.",
      });
    },
    // تعارضٌ (٤٠٩ — تغيّرت بياناتُ الدفعة أو حالةُ الطلب منذ الفتح) أو أيُّ
    // فشلٍ آخر: الصفُّ يبقى ظاهراً (بلا حذفٍ تفاؤليّ أصلاً)، والقائمةُ
    // تُحدَّث من القاعدة فوراً كي لا يبقى معروضاً بحالةٍ تجاوزها الواقع.
    onError: (err: any, v) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-corrections", "pending"] });
      toast({
        title: v.kind === "approve" ? "تعذّر اعتماد الطلب" : "تعذّر رفض الطلب",
        description: err?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setConfirm(null);
      setNote("");
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6" dir="rtl">
        <Card><CardContent className="py-10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground" data-testid="text-corrections-forbidden">
            طلباتُ تصحيح الدفعات للمسؤول العام فقط.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Banknote className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">طلباتُ تصحيح الدفعات</h1>
        {rows.length > 0 && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10" data-testid="corrections-count">
            {rows.length}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        تعديلٌ أو حذفٌ لحقلٍ محميٍّ في دفعة (المبلغ · التاريخ الماليّ · نوع
        العلاج · الجلسات المجانية) قدّمه موظّفٌ غيرُ المسؤول العام، وينتظر
        قرارك. الاعتمادُ يُطبِّق التغييرَ فوراً على الدفعة ويُقيِّد أثرَه
        المحاسبيّ؛ والرفضُ يُغلق الطلبَ بلا أثرٍ مالي.
      </p>

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" data-testid="corrections-loading" />
        </CardContent></Card>
      ) : isError ? (
        <Card><CardContent className="py-10 text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm text-destructive" data-testid="text-corrections-error">
            {(error as Error)?.message || "تعذّر جلب طلبات تصحيح الدفعات"}
          </p>
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"
          data-testid="text-corrections-empty">
          لا توجد طلباتُ تصحيحٍ معلَّقة حالياً.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <CorrectionCard
              key={r.id}
              r={r}
              approveDisabled={!r.currentPaymentExists || (decide.isPending && decide.variables?.id === r.id)}
              rejectDisabled={decide.isPending && decide.variables?.id === r.id}
              onApprove={() => { setNote(""); setConfirm({ row: r, kind: "approve" }); }}
              onReject={() => { setNote(""); setConfirm({ row: r, kind: "reject" }); }}
            />
          ))}
        </div>
      )}

      {/* ══ حوارُ التأكيد — مشتركٌ للاعتماد والرفض معاً ═══════════════════
          مغلَقٌ افتراضاً (`open={!!confirm}`)، فتحُه من زرّ الصفّ لا من
          `AlertDialogTrigger` — الحوارُ واحدٌ لكلّ الصفوف لا نسخةً بكلّ
          بطاقة. */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => { if (!open) { setConfirm(null); setNote(""); } }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-decision-dialog-title">
              {confirm?.kind === "approve"
                ? (confirm.row.action === "delete" ? "اعتماد حذف الدفعة؟" : "اعتماد تعديل الدفعة؟")
                : "رفض طلب التصحيح؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "approve"
                ? (confirm.row.action === "delete"
                  ? "سيُحذَف صفّ الدفعة نهائياً ويُعكَس قيدُها المحاسبي فوراً — هذا الإجراء لا رجعة فيه."
                  : "سيُطبَّق التغييرُ المطلوب على الدفعة فوراً، ويُعاد بناء قيدها المحاسبي إن لزم.")
                : "لن يتغيّر شيءٌ في الدفعة — يُغلَق الطلبُ دون تنفيذه، ويبقى بإمكان مقدّمه إرسالَ طلبٍ آخر."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">ملاحظة (اختياري)</label>
            <Textarea
              className="text-right"
              placeholder="اكتب ملاحظةً عن القرار إن أردت"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-decision-note"
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                decide.mutate({ id: confirm.row.id, kind: confirm.kind, decisionNote: note });
              }}
              className={confirm?.kind === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              disabled={decide.isPending}
              data-testid="confirm-decision"
            >
              {decide.isPending
                ? "جارٍ الحفظ..."
                : (confirm?.kind === "approve" ? "نعم، اعتمد" : "نعم، ارفض")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
