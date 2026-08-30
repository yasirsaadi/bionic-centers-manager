// المراجعةُ اليومية — سردٌ إشرافيٌّ للقراءة فقط. المسؤولُ العام حصراً.
//
// ══ ملاحظةٌ للأثر لا للعمل ═════════════════════════════════════════════
// **بلا أزرار فعل** في هذه الصفحة إطلاقاً — لا اعتماد، لا رفض، لا تعديل،
// لا تصحيح. كلُّ ما تفعله هذه الشاشة هو `GET /api/daily-review` وعرضُه.
// القرارات تُتَّخذ من شاشاتها القانونية (المريض، الطابور المناسب) — هنا
// فقط تُقرأ نتيجتُها.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBranchSession } from "@/components/BranchGate";
import {
  ShieldAlert, Loader2, AlertCircle, ChevronRight, ChevronLeft, CalendarClock,
  UserPlus, Stethoscope, ShoppingCart, Wrench, Wand2, Settings2, Banknote,
} from "lucide-react";
import {
  DAILY_REVIEW_FAMILY_LABELS, DAILY_REVIEW_SERVICE_LABELS,
  MONEY_NOT_RECORDED_LABEL, REASON_NOT_SPECIFIED_LABEL, UNKNOWN_LEGACY_REGISTRAR_LABEL,
  FREE_LABEL,
  type DailyReviewRow, type DailyReviewFamily, type DailyReviewServiceFilter,
} from "@shared/daily_review";

interface Branch { id: number; name: string; }

function todayInBaghdad(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
}
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`); // ظهراً — بعيدٌ عن أيّ حافّة تغيّر يوم
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad", hour: "2-digit", minute: "2-digit" });
}
const money = (n: number | null) => n === null ? MONEY_NOT_RECORDED_LABEL
  : `${n.toLocaleString("en-US")} د.ع`;

const FAMILY_ICON: Record<DailyReviewFamily, typeof UserPlus> = {
  registration: UserPlus,
  exam: Stethoscope,
  post_exam_decision: ShoppingCart,
  maintenance_opened: Wrench,
  component_sale_opened: ShoppingCart,
  manufacturing_movement: Settings2,
  device_payment: Banknote,
};

/** أيّ الحقول تُعرَض لهذه الأسرة — إخفاءٌ لا تفريغ؛ لا تسمياتٍ فارغة. */
function relevantFields(family: DailyReviewFamily) {
  return {
    whyTheyCame: family === "registration" || family === "exam"
      || family === "maintenance_opened" || family === "component_sale_opened",
    doctor: family === "exam",
    expert: family === "post_exam_decision" || family === "maintenance_opened"
      || family === "component_sale_opened" || family === "manufacturing_movement",
    decision: family === "post_exam_decision",
    money: family === "post_exam_decision" || family === "maintenance_opened"
      || family === "component_sale_opened",
    paid: family === "device_payment",
    registrar: true, // كلُّ صفٍّ يحمل مَن سجّل المريض أصلاً
  };
}

function FamilyBadge({ family }: { family: DailyReviewFamily }) {
  const Icon = FAMILY_ICON[family];
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <Icon className="w-3.5 h-3.5" />
      {DAILY_REVIEW_FAMILY_LABELS[family]}
    </Badge>
  );
}

function MoneyLine({ row }: { row: DailyReviewRow }) {
  const m = row.money;
  if (!m) return null;
  if (m.legacyUnrecorded) {
    return (
      <p className="text-sm text-muted-foreground">
        السعر: <span className="font-medium">{MONEY_NOT_RECORDED_LABEL}</span>
        {" — "}سجلٌّ قديم بلا حقولٍ تجارية مُهيكَلة
      </p>
    );
  }
  const isFree = m.priceKind === "free";
  return (
    <p className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>الأصليّ: <span className="font-mono">{money(m.originalPrice)}</span></span>
      {m.discount !== null && m.discount > 0 && (
        <span>الخصم: <span className="font-mono">{money(m.discount)}</span></span>
      )}
      <span>
        النهائيّ:{" "}
        {isFree
          ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{FREE_LABEL}</Badge>
          : <span className="font-mono font-medium">{money(m.finalPrice)}</span>}
      </span>
    </p>
  );
}

function EventCard({ row }: { row: DailyReviewRow }) {
  const rel = relevantFields(row.family);
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" />
              {fmtTime(row.eventAt)}
            </span>
            <FamilyBadge family={row.family} />
            <Badge variant="secondary">{DAILY_REVIEW_SERVICE_LABELS[row.serviceType]}</Badge>
          </div>
          {row.branchName && <Badge variant="outline">{row.branchName}</Badge>}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/patients/${row.patientId}`}
            className="font-medium text-primary hover:underline" data-testid={`link-patient-${row.id}`}>
            {row.patientName}
          </Link>
          {row.patientCode && <span className="text-xs text-muted-foreground font-mono">{row.patientCode}</span>}
        </div>

        <p className="text-sm">{row.whatHappened}</p>

        {rel.whyTheyCame && row.whyTheyCame && (
          <p className="text-sm text-muted-foreground">سببُ الحضور: {row.whyTheyCame}</p>
        )}
        {rel.whyTheyCame && !row.whyTheyCame && (
          <p className="text-sm text-muted-foreground">سببُ الحضور: {REASON_NOT_SPECIFIED_LABEL}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {rel.registrar && (
            <span>
              سجّله: {row.registeredByUnknownLegacy
                ? <span className="italic">{UNKNOWN_LEGACY_REGISTRAR_LABEL}</span>
                : (row.registeredByName ?? "—")}
            </span>
          )}
          {row.performedByName && <span>نفّذه: {row.performedByName}</span>}
          {rel.doctor && row.doctorName && <span>الطبيب: {row.doctorName}</span>}
          {rel.expert && row.expertName && <span>الخبير: {row.expertName}</span>}
        </div>

        {rel.decision && row.purchaseDecision && (
          <p className="text-sm">
            القرار:{" "}
            <Badge className={row.purchaseDecision === "bought"
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
              : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>
              {row.purchaseDecision === "bought" ? "اشترى" : "لم يشترِ"}
            </Badge>
            {row.purchaseDecision === "not_bought" && row.notBoughtReason && (
              <span className="text-muted-foreground"> — {row.notBoughtReason}</span>
            )}
          </p>
        )}

        {rel.money && <MoneyLine row={row} />}

        {rel.paid && row.actualAmountPaid !== null && (
          <p className="text-sm">
            المبلغُ المقبوض: <span className="font-mono font-medium">{money(row.actualAmountPaid)}</span>
            {row.paymentActorDirect && row.paymentActorName && (
              <span className="text-muted-foreground"> — قبضه {row.paymentActorName}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DailyReview() {
  const session = useBranchSession();
  const isAdmin = Boolean((session as any)?.isAdmin);

  const [date, setDate] = useState(todayInBaghdad);
  const [branchId, setBranchId] = useState<string>("all");
  const [serviceType, setServiceType] = useState<DailyReviewServiceFilter>("all");

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin,
  });

  const params = useMemo(() => {
    const p = new URLSearchParams({ date, serviceType });
    if (branchId !== "all") p.set("branchId", branchId);
    return p.toString();
  }, [date, branchId, serviceType]);

  const { data, isLoading, isError, error } = useQuery<{ rows: DailyReviewRow[] }>({
    queryKey: ["/api/daily-review", date, branchId, serviceType],
    queryFn: async () => {
      const res = await fetch(`/api/daily-review?${params}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.message || "تعذّر جلب المراجعة اليومية");
      }
      return res.json();
    },
    enabled: isAdmin,
  });
  const rows = data?.rows ?? [];

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6" dir="rtl">
        <Card><CardContent className="py-10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground" data-testid="text-daily-review-forbidden">
            المراجعةُ اليومية للمسؤول العام فقط.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">المراجعة اليومية</h1>
        <p className="text-sm text-muted-foreground">
          ما جرى فعلياً في الأطراف والمساند اليوم — سردٌ للقراءة فقط، الأحدثُ أوّلاً.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setDate((d) => shiftDate(d, -1))}
          data-testid="button-daily-review-prev-day">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <input
          type="date" value={date} max={todayInBaghdad()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="input-daily-review-date"
        />
        <Button variant="outline" size="icon" onClick={() => setDate((d) => shiftDate(d, 1))}
          disabled={date >= todayInBaghdad()} data-testid="button-daily-review-next-day">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={() => setDate(todayInBaghdad())}
          data-testid="button-daily-review-today">
          اليوم
        </Button>

        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-40" data-testid="select-daily-review-branch">
            <SelectValue placeholder="كل الفروع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفروع</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={serviceType} onValueChange={(v) => setServiceType(v as DailyReviewServiceFilter)}>
          <SelectTrigger className="w-44" data-testid="select-daily-review-service">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكلّ — أطراف ومساند</SelectItem>
            <SelectItem value="prosthetic">طرف صناعي</SelectItem>
            <SelectItem value="medical_support">مسند طبي</SelectItem>
          </SelectContent>
        </Select>

        {!isLoading && <span className="text-sm text-muted-foreground">{rows.length} حدثاً</span>}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-300 rounded-md px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {(error as Error)?.message || "تعذّر جلب المراجعة اليومية"}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          لا أحداثَ في هذا اليوم بهذه الفلاتر.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {rows.map((row) => <EventCard key={row.id} row={row} />)}
      </div>
    </div>
  );
}
