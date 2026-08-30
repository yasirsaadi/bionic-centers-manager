// طلباتُ تصحيح الدفعات — عرضٌ فقط (المرحلةُ الأولى، 2026-08-30).
//
// ══ قراءةٌ فقط عمداً ═══════════════════════════════════════════════════
// هذه الصفحةُ لا تعتمد ولا ترفض شيئاً — لا زرَّ قرارٍ فيها ولا نداءَ POST
// واحد. بطاقةُ الاعتماد الحقيقية مرحلةٌ لاحقة تُبنى فوق نموذج القراءة
// المُثرى الذي أنتجته `listCorrectionRequests` (المتابعةُ السابقة): اسمُ
// المريض ورمزُه واسمُ الفرع وحالةُ الدفعة **الآن** — كلُّها من القاعدة،
// بلا استعلامٍ إضافيٍّ واحد لكلّ صفّ (لا N+1 على العميل).
//
// ══ المسؤولُ العامّ وحده ═════════════════════════════════════════════════
// نفسُ حارس `isGlobalAdmin` في `server/payments/correction_routes.ts` —
// الصفحةُ تفحص `session.isAdmin` محلياً قبل الجلب أصلاً (نمطُ
// `DiscountApprovals`/`ReturnedCharges` القائم)، والخادمُ هو الحارسُ
// الحقيقيّ الذي لا يتغيّر بتغيّر هذه الشاشة.

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBranchSession } from "@/components/BranchGate";
import {
  Banknote, Loader2, ShieldAlert, AlertTriangle, AlertCircle, Trash2, Pencil,
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
        <span><b>الدفعةُ المستهدَفة لم تعد موجودة</b> — لا يمكن معرفة حالتها الحالية.</span>
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

function CorrectionCard({ r }: { r: CorrectionRow }) {
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
      </CardContent>
    </Card>
  );
}

export default function PaymentCorrections() {
  const session = useBranchSession();
  const isAdmin = Boolean((session as any)?.isAdmin);

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
        قراره. <b>هذه صفحةُ عرضٍ فقط — الاعتمادُ والرفضُ في مرحلةٍ لاحقة.</b>
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
          {rows.map((r) => <CorrectionCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}
