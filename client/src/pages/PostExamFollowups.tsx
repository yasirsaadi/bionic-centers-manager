// طابورُ «بانتظار الحسم / تم الحسم» — شاشةُ عملٍ يومية، لا لوحةَ متابعةٍ
// شاملة. (المرحلة الخامسة، ٢٠٢٦-٠٨-٢٨)
//
// ══ الهدف: لا مريضَ يُفقَد بين المعاينة والحسم ══════════════════════════
// الطبيبُ يوقّع ⟶ المريضُ يظهر هنا تلقائياً ⟶ الاستعلامات/المحاسب/مديرُ
// الفرع/المسؤول يحسم **من هذه الصفحة مباشرةً** بضغطة «إتمام البيع» أو
// «لم يشترِ» — بلا بحثٍ عن المريض ولا فتح ملفّه. وبمجرّد الحسم ينتقل
// الصفُّ إلى «تم الحسم» من تلقاء نفسه: **لا زرَّ «تحديد كمحسوم»** — عضويةُ
// التبويب مُشتقَّةٌ بالكامل من حالة المتابعة القائمة، لا حالةً تُخترَع هنا.
//
// **والحسمُ من نفس مكوّن بطاقة المريض حرفياً** (`ExamPathDecisionActions`)
// — نفسُ البابين `/complete-sale`/`/not-bought`، نفسُ التحقّق، نفسُ معاينة
// السعر الحيّة، نفسُ ملاحظة الطبيب. **بلا حقيقةٍ ماليةٍ جديدة هنا.**
//
// **والنطاقُ يفرضه الخادم**: هذه الشاشة تعرض ما يصلها ضمن فروع الجلسة،
// ومسؤولٌ متعدّدَ الفروع يستطيع تضييقها بفرعٍ واحد — والشارةُ في الشريط
// الجانبيّ تبقى **كلَّ الفروع** بصرف النظر عن هذا الفلتر المحليّ.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { ExamPathDecisionActions } from "@/components/ExamPathDecisionActions";
import {
  DECISION_QUEUE_PAGE_TITLE, DECISION_QUEUE_PAGE_SUBTITLE,
  DECISION_QUEUE_TAB_WAITING, DECISION_QUEUE_TAB_RESOLVED,
  DECISION_QUEUE_SERVICE_FILTERS, DECISION_QUEUE_SERVICE_LABELS,
  DECISION_QUEUE_RESULT_LABELS, actorRoleLabel,
  type DecisionQueueState,
} from "@shared/decision_queue";
import { PRICE_KIND_LABELS } from "@shared/commercial";
import { resolvedSaleDiscount } from "./post_exam_followups_presentation";

interface Branch { id: number; name: string; }

interface WaitingRow {
  followupId: number;
  patientId: number;
  patientCode: string | null;
  patientName: string;
  branchId: number | null;
  branchName: string | null;
  serviceType: "prosthetic" | "medical_support";
  examDoctorName: string | null;
  examSignedAt: string | null;
  examNotes: string | null;
  originalPrice: number | null;
  approvedPrice: number;
  priceKind: string | null;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  actions: string[];
}

interface ResolvedRow {
  followupId: number;
  patientId: number;
  patientCode: string | null;
  patientName: string;
  branchId: number | null;
  branchName: string | null;
  serviceType: "prosthetic" | "medical_support";
  result: "bought" | "not_bought";
  resolvedByName: string | null;
  resolvedByRole: string | null;
  resolvedAt: string | null;
  originalPrice: number | null;
  approvedPrice: number;
  priceKind: string | null;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  notBoughtReasonText: string | null;
}

const fmtDateTime = (v: string | null) =>
  v ? new Date(v).toLocaleString("ar-IQ", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

function ClassificationBadge({ serviceType }: { serviceType: string }) {
  return (
    <Badge variant="outline" className="text-xs" data-testid="badge-service-type">
      {DECISION_QUEUE_SERVICE_LABELS[serviceType] ?? serviceType}
    </Badge>
  );
}

function BranchName({ patientId, patientCode, patientName, branchName }: {
  patientId: number; patientCode: string | null; patientName: string; branchName: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Link href={`/patients/${patientId}`} className="font-medium hover:underline"
        data-testid={`link-patient-${patientId}`}>
        {patientName}
      </Link>
      <span className="font-mono text-xs text-muted-foreground">{patientCode ?? "—"}</span>
      <span className="text-xs text-muted-foreground">{branchName ?? "—"}</span>
    </div>
  );
}

function WaitingCard({ row }: { row: WaitingRow }) {
  return (
    <Card data-testid={`row-waiting-${row.followupId}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <BranchName patientId={row.patientId} patientCode={row.patientCode}
            patientName={row.patientName} branchName={row.branchName} />
          <div className="flex items-center gap-2">
            <ClassificationBadge serviceType={row.serviceType} />
            <Link href={`/patients/${row.patientId}`}>
              <Button variant="ghost" size="sm" data-testid={`button-open-${row.followupId}`}>
                فتح الملف <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div>
            <span className="block text-[11px]">تاريخ المعاينة</span>
            <span className="text-foreground">{fmtDateTime(row.examSignedAt)}</span>
          </div>
          <div>
            <span className="block text-[11px]">طبيب المعاينة</span>
            <span className="text-foreground">{row.examDoctorName ?? "—"}</span>
          </div>
        </div>
        <ExamPathDecisionActions
          followupId={row.followupId}
          patientId={row.patientId}
          branchId={row.branchId}
          actions={row.actions}
          examNotes={row.examNotes}
          prefill={{
            originalPrice: row.originalPrice,
            approvedPrice: row.approvedPrice,
            priceKind: row.priceKind,
            selectedExpertUserId: row.selectedExpertUserId,
          }}
        />
      </CardContent>
    </Card>
  );
}

function ResolvedCard({ row }: { row: ResolvedRow }) {
  const bought = row.result === "bought";
  //  **الخصمُ بدالّةٍ خالصةٍ واحدة، لكلّ الأنواع الثلاثة معاً** (تصحيحٌ
  //  لاحقٌ ثانٍ — كانت مخصَّصةً بـ`priceKind === "discount"` وحدها، فبيعٌ
  //  مجّانيٌّ (خصمُ ١٠٠٪) كان يُعرَض بخصمٍ صفر). التفصيلُ والاختبارُ في
  //  `post_exam_followups_presentation.ts` — منطقٌ خالص، لا يتكرّر هنا.
  const discount = resolvedSaleDiscount(row);
  return (
    <Card data-testid={`row-resolved-${row.followupId}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <BranchName patientId={row.patientId} patientCode={row.patientCode}
            patientName={row.patientName} branchName={row.branchName} />
          <div className="flex items-center gap-2">
            <ClassificationBadge serviceType={row.serviceType} />
            <Badge className={bought ? "bg-green-600" : "bg-gray-500"}
              data-testid={`badge-result-${row.followupId}`}>
              {DECISION_QUEUE_RESULT_LABELS[row.result]}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <span className="block text-[11px]">حُسم بواسطة</span>
            <span className="text-foreground">{row.resolvedByName ?? "—"}</span>
          </div>
          <div>
            <span className="block text-[11px]">الصفة</span>
            <span className="text-foreground" data-testid={`text-resolver-role-${row.followupId}`}>
              {actorRoleLabel(row.resolvedByRole)}
            </span>
          </div>
          <div>
            <span className="block text-[11px]">وقت الحسم</span>
            <span className="text-foreground">{fmtDateTime(row.resolvedAt)}</span>
          </div>
        </div>
        {bought ? (
          <div className="grid grid-cols-2 gap-2 rounded-md bg-green-50 p-2.5 text-xs sm:grid-cols-4"
            data-testid={`grid-sale-${row.followupId}`}>
            <div>
              <span className="block text-muted-foreground">السعر الأصلي</span>
              <span className="font-medium">
                {(row.originalPrice ?? row.approvedPrice).toLocaleString()} د.ع
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">الخصم</span>
              <span className="font-medium">{(discount ?? 0).toLocaleString()} د.ع</span>
            </div>
            <div>
              <span className="block text-muted-foreground">السعر النهائي</span>
              <span className="font-medium">
                {row.priceKind === "free" ? "مجاني (٠ د.ع)" : `${row.approvedPrice.toLocaleString()} د.ع`}
              </span>
              {row.priceKind && (
                <span className="mr-1 text-muted-foreground">
                  ({PRICE_KIND_LABELS[row.priceKind as keyof typeof PRICE_KIND_LABELS] ?? row.priceKind})
                </span>
              )}
            </div>
            <div>
              <span className="block text-muted-foreground">الخبير</span>
              <span className="font-medium">
                {row.selectedExpertName
                  ?? (row.selectedExpertUserId ? `#${row.selectedExpertUserId}` : "—")}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-gray-50 p-2.5 text-xs" data-testid={`text-not-bought-reason-${row.followupId}`}>
            <span className="text-muted-foreground">السبب: </span>
            <span className="text-foreground">{row.notBoughtReasonText ?? "—"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PostExamFollowups() {
  const session = useBranchSession() as any;
  const [tab, setTab] = useState<DecisionQueueState>("waiting");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  //  فلترةُ الفرع تُعرَض فقط لمن يملك أكثر من فرعٍ فعلياً — مسؤولٌ عام أو
  //  مديرُ فرعٍ/موظّفٌ متعدّدُ الفروع. القائمةُ نفسُها المستعملة في شاشة
  //  التصنيع (`/api/branches` للمسؤول، أو فروع الجلسة لغيره).
  const isAdmin = Boolean(session?.isAdmin);
  const accessible: number[] = Array.isArray(session?.accessibleBranches)
    ? session.accessibleBranches : [];
  const showBranchFilter = isAdmin || accessible.length > 1;
  const { data: allBranches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin,
  });
  const { data: myBranches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches", "accessible"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) return [];
      const rows: Branch[] = await res.json();
      return rows.filter((b) => accessible.includes(b.id));
    },
    enabled: !isAdmin && accessible.length > 1,
  });
  const branchOptions = isAdmin ? allBranches : myBranches;

  const queryString = () => {
    const p = new URLSearchParams({ state: tab });
    if (serviceFilter !== "all") p.set("serviceType", serviceFilter);
    if (branchFilter !== "all") p.set("branchId", branchFilter);
    return p.toString();
  };

  const { data, isLoading } = useQuery<{ rows: (WaitingRow | ResolvedRow)[]; total: number }>({
    queryKey: ["/api/followups/decision-queue", tab, serviceFilter, branchFilter],
    queryFn: async () => {
      const res = await fetch(`/api/followups/decision-queue?${queryString()}`,
        { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل الطابور");
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-followups-title">
          {DECISION_QUEUE_PAGE_TITLE}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{DECISION_QUEUE_PAGE_SUBTITLE}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as DecisionQueueState)}>
          <TabsList>
            <TabsTrigger value="waiting" data-testid="tab-waiting">
              {DECISION_QUEUE_TAB_WAITING}
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">
              {DECISION_QUEUE_TAB_RESOLVED}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {showBranchFilter && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-branch-filter">
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {DECISION_QUEUE_SERVICE_FILTERS.map((f) => (
            <Button key={f.key} type="button" size="sm"
              variant={serviceFilter === f.key ? "default" : "outline"}
              onClick={() => setServiceFilter(f.key)}
              data-testid={`button-filter-${f.key}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-total-count">
        {total} {tab === "waiting" ? "بانتظار الحسم" : "محسوم"}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12" data-testid="text-followups-empty">
          {tab === "waiting" ? "لا يوجد مَن ينتظر الحسم." : "لا شيء محسوم بعد ضمن هذه الفلترة."}
        </p>
      ) : (
        <div className="space-y-3">
          {tab === "waiting"
            ? (rows as WaitingRow[]).map((r) => <WaitingCard key={r.followupId} row={r} />)
            : (rows as ResolvedRow[]).map((r) => <ResolvedCard key={r.followupId} row={r} />)}
        </div>
      )}
    </div>
  );
}
