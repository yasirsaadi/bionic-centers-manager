// شاشةُ «متابعة ما بعد المعاينة».
//
// الطوابيرُ التي كانت غير موجودة: مريضٌ عاين ولم يشترِ كان يختفي من كل شاشة.
// وهنا يظهر — بمن ينتظر قرارَه، ومن فات موعدُ متابعته، **ومن قال للطبيب
// إنه يريده اليوم**.
//
// ولا طابورَ اعتمادٍ حيّاً: تغييرُ السعر صار قرارَ مديرِ الفرع، والشراءُ
// تسجيلَ واقعة. وما بقي من «بانتظار موافقتي» فبقايا معلَّقةٌ حتى تنفد.
//
// **والنطاق يفرضه الخادم**: هذه الشاشة تعرض ما يصلها، ولا تصفّي بالفرع بنفسها.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import {
  FOLLOWUP_FILTERS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUS_LABELS,
  canDecideLegacyPriceRequest,
  priceSourceShort, type FollowupReason, type FollowupStatus,
} from "@shared/followup";

interface Row {
  id: number;
  patientId: number;
  patientCode: string | null;
  patientName: string;
  branchName: string | null;
  serviceType: string;
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
  nextFollowUpAt: string | null;
  noScheduledFollowUp: boolean;
  lastReason: string | null;
  lastContactAt: string | null;
  closedReason: string | null;
  examSignedAt: string | null;
  examDoctorName: string | null;
  purchaseInterestAt: string | null;
  purchaseInterestByName: string | null;
}

//  **المرشِّحاتُ من المشتركة**: أربعةٌ حيّة وسلّةٌ للقديم. وكانت الشاشةُ
//  تعرض كلَّ حالةٍ في القاعدة مرشِّحاً مستقلاً فقرأها الموظّف كلوحةِ إدارةِ
//  آلةِ حالات — والمرشِّحُ الذي لا يُستعمل ضجيجٌ لا خيار.
const FILTERS = FOLLOWUP_FILTERS;

const SERVICE_LABELS: Record<string, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};

//  ألوانٌ تتبع المعنى: الكهرماني انتظارُ فعلٍ من الفرع، والأزرق انتظارُ
//  اعتمادٍ من طبيب، والرمادي منتهٍ. فيُقرأ الطابور بالنظرة لا بالقراءة.
const STATUS_TONE: Record<string, string> = {
  awaiting_patient_decision: "bg-amber-100 text-amber-800",
  follow_up: "bg-amber-50 text-amber-700",
  price_approval_pending: "bg-blue-100 text-blue-800",
  price_approved_waiting_patient: "bg-violet-100 text-violet-800",
  //  كهرمانيّ لا أزرق: صار انتظارَ فعلٍ من الفرع لا اعتماداً من طبيب.
  purchase_approval_pending: "bg-amber-100 text-amber-800",
  closed_without_purchase: "bg-gray-100 text-gray-600",
  converted: "bg-green-100 text-green-800",
};

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ar-IQ", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

/** هل فات موعدُه — بتاريخ بغداد، فلا يُحسب يومٌ زائد أو ناقص. */
function isOverdue(row: Row): boolean {
  if (!row.nextFollowUpAt) return false;
  if (row.status !== "follow_up" && row.status !== "awaiting_patient_decision") return false;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  return new Date(row.nextFollowUpAt).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }) < today;
}

export default function PostExamFollowups() {
  const session = useBranchSession();
  const [filter, setFilter] = useState("all");

  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ["/api/followups", filter],
    queryFn: async () => {
      const res = await fetch(`/api/followups?filter=${encodeURIComponent(filter)}`,
        { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل المتابعات");
      return res.json();
    },
  });

  const { data: approvals } = useQuery<{
    priceApprovals: any[]; mayApprove: boolean;
  }>({
    queryKey: ["/api/followups/approvals"],
    queryFn: async () => {
      const res = await fetch("/api/followups/approvals", { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل طابور الاعتماد");
      return res.json();
    },
  });

  const mayApprove = canDecideLegacyPriceRequest(session as any);
  //  **بقايا المسار القديم وحدها**: لا يُنشأ طلبٌ جديد بعد اليوم، فهذا
  //  الطابور يفرغ ولا يمتلئ — ويختفي من الشاشة حين يفرغ.
  const pendingMine = approvals?.priceApprovals?.length ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-followups-title">
          متابعة ما بعد المعاينة
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          المرضى الذين وقّع الطبيب معاينتهم ولم يبدأ تصنيعُهم بعد.
        </p>
      </div>

      {/* «طلبات قديمة معلَّقة» — للطبيب والمسؤول وحدهما. لا يُنشأ جديدٌ
          فيها، وتختفي البطاقة كلُّها حين تنفد. */}
      {mayApprove && pendingMine > 0 && (
        <Card className="border-blue-200 bg-blue-50/40" data-testid="card-my-approvals">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              طلبات سعر قديمة معلَّقة
              <Badge className="bg-blue-600">{pendingMine}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(approvals?.priceApprovals ?? []).map((a: any) => (
              <Link key={`p${a.requestId}`} href={`/patients/${a.patientId}`}>
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                  data-testid={`row-approval-price-${a.requestId}`}>
                  <div>
                    <span className="font-medium">{a.patientName}</span>
                    <span className="text-muted-foreground mx-2">{a.patientCode}</span>
                    <Badge variant="outline" className="text-xs">طلب قديم</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.currentPrice?.toLocaleString()} ⟶ {a.proposedPrice?.toLocaleString()} د.ع
                  </div>
                </div>
              </Link>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              طلباتٌ قُدّمت قبل التبسيط. تُحسَم من بطاقة «قرار المريض بعد
              المعاينة» في صفحة المريض. والسعرُ اليوم يحدّده مديرُ الفرع مباشرة.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
            data-testid={`button-filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (rows ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12" data-testid="text-followups-empty">
              لا توجد متابعات في هذا التصنيف.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-right">الرمز</th>
                    <th className="px-3 py-2 text-right">المريض</th>
                    <th className="px-3 py-2 text-right">الخدمة</th>
                    <th className="px-3 py-2 text-right">الفرع</th>
                    <th className="px-3 py-2 text-right">تاريخ المعاينة</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">السبب</th>
                    <th className="px-3 py-2 text-right">آخر تواصل</th>
                    <th className="px-3 py-2 text-right">المتابعة القادمة</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30"
                      data-testid={`row-followup-${r.id}`}>
                      <td className="px-3 py-2 font-mono text-xs">{r.patientCode ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">
                        {/*  **الرايةُ أوّلَ ما يُقرأ** — والخادمُ يرفع صاحبها
                            إلى رأس الطابور، فلا يبحث عنه أحد. */}
                        {r.purchaseInterestAt && (
                          <span className="ml-1" title={`يرغب بالشراء الآن${
                            r.purchaseInterestByName ? ` — ${r.purchaseInterestByName}` : ""}`}
                            data-testid={`badge-interest-${r.id}`}>🟢</span>
                        )}
                        {r.patientName}
                      </td>
                      <td className="px-3 py-2">{SERVICE_LABELS[r.serviceType] ?? r.serviceType}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.branchName ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.examSignedAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[r.status] ?? ""}`}>
                          {FOLLOWUP_STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {r.approvedPrice > 0 ? (
                          <>
                            <span className="font-medium">{r.approvedPrice.toLocaleString()}</span>
                            <span className="text-muted-foreground"> د.ع</span>
                            <div className="text-[11px] text-muted-foreground">
                              {priceSourceShort(r.priceSource)}
                            </div>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {r.closedReason
                          ? FOLLOWUP_REASON_LABELS[r.closedReason as FollowupReason] ?? r.closedReason
                          : r.lastReason
                            ? FOLLOWUP_REASON_LABELS[r.lastReason as FollowupReason] ?? r.lastReason
                            : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(r.lastContactAt)}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.noScheduledFollowUp ? (
                          <span className="text-muted-foreground">بلا موعد</span>
                        ) : (
                          <span className={isOverdue(r) ? "text-red-600 font-medium" : ""}>
                            {fmtDate(r.nextFollowUpAt)}
                            {isOverdue(r) && " — متأخّر"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/patients/${r.patientId}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-open-${r.id}`}>
                            فتح <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
