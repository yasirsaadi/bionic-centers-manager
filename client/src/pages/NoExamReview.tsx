// **مبالغ سابقة بانتظار الإكمال** — طابورٌ موروثٌ يفرغ ولا يمتلئ.
//
// ══ وليست مراجعةً طبية ═════════════════════════════════════════════════
// كانت هذه الشاشةُ «مراجعة مبيعات وخدمات بلا معاينة» ويقف عليها **طبيب**:
// المالُ لا يصير حقيقياً حتى يضغط. وقد أُلغيت تلك السلطة (قرارُ المالك):
// **المبلغُ يُقيَّد لحظةَ إدخاله من الاستعلامات**، ولا صفَّ جديد يدخل هنا.
//
// فما بقي **مبالغُ عملياتٍ وقعت قبل التغيير** ولم تُكمَل. ومَن يُنهيها
// الاستقبالُ ومديرُ الفرع والمسؤول ضمن فروعهم — لا طبيب، ولا اختصاصَ
// طبّياً يُسأل عنه أحد.
//
// ══ وفعلان لا أكثر ═════════════════════════════════════════════════════
// **إكمال** ⟶ يُقيَّد المبلغُ لحظتَها بالكاتب القانونيّ **نفسِه** الذي
//   تناديه العملياتُ الجديدة — فلا نسخةَ ثانية من المحاسبة.
// **إعادة للتصحيح** ⟶ بسببٍ مكتوب، ولا دينارَ يتحرّك ولا عمليةَ تُهدَم.
//
// ولا آلةَ رفضٍ ثالثة: العمليةُ وقعت فعلاً — صيانةٌ أُجريت أو جزءٌ بيع —
// فرفضُها كذبٌ على الواقع. المُعادُ هو **المبلغُ** لا العمل.

import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Wallet, Loader2, Check, Undo2, ShieldAlert, ExternalLink, PackageOpen, Wrench,
} from "lucide-react";
import {
  LEGACY_QUEUE_TITLE, LEGACY_QUEUE_HINT, PENDING_CHARGE_ACTION_LABELS,
  RETURN_REASON_LABEL,
} from "@shared/pending_charge";
import { requestedItemLabel, componentLabel } from "@shared/prosthetic_parts";
import { DEVICE_ORIGIN_LABELS, isDeviceOrigin } from "@shared/device_origin";

export interface ChargeCard {
  id: number; patientId: number; patientName: string | null;
  patientCode: string | null; branchId: number | null; branchName: string | null;
  serviceType: string; operationKind: string;
  requestedItem: string | null; maintenanceComponent: string | null;
  deviceOrigin: string | null; amount: number; note: string | null; status: string;
  createdByName: string | null; submittedAt: string; returnReason: string | null;
  returnedAt: string | null; returnedByName: string | null;
  workOrderId: number | null; appliedWorkOrderId: number | null;
}

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

export const fmtStamp = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
};

const SERVICE_LABELS: Record<string, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

/**
 * **ماذا جرى للمريض؟** — سطرٌ واحد يقرأه الطبيبُ بلا فتح ملفّ.
 *
 * مبلغٌ عارٍ يجعله يعتمد بلا قراءة، أو يفتح الملفَّ لكلّ صفّ فلا يُنجز شيئاً.
 * والألفاظُ من `requestedItemLabel` و`componentLabel` القائمتين — **ولا
 * معجمَ ثانٍ** ينحرف عن الأوّل يوماً.
 */
export function operationLine(r: ChargeCard): string {
  if (r.operationKind === "maintenance") {
    const part = componentLabel(r.maintenanceComponent);
    const head = part ? `صيانة ${part}` : "صيانة";
    //  **والمنشأُ يُقال باسمه** — «صنعناه ولم نسجّله» ليس «صُنع خارجنا».
    const origin = isDeviceOrigin(r.deviceOrigin) && r.deviceOrigin !== "registered"
      ? DEVICE_ORIGIN_LABELS[r.deviceOrigin] : null;
    return origin ? `${head} — ${origin}` : head;
  }
  return `بيع ${requestedItemLabel(r.requestedItem, r.serviceType)}`;
}

export default function NoExamReview() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [returning, setReturning] = useState<ChargeCard | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery<{ rows: ChargeCard[]; specialties: string[] }>({
    queryKey: ["/api/no-exam/review"],
    queryFn: async () => {
      const res = await fetch("/api/no-exam/review", { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [] };
      return res.json();
    },
  });
  const rows = data?.rows ?? [];
  const specialties = data?.specialties ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/no-exam/review"] });
    qc.invalidateQueries({ queryKey: ["/api/no-exam/returned"] });
    qc.invalidateQueries({ queryKey: ["/api/no-exam/returned/count"] });
    qc.invalidateQueries({ queryKey: ["/api/patients"] });
    qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
  };

  const approve = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/no-exam/charges/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "اعتُمد المبلغ",
        description: "قُيّد المبلغ على حساب المريض ودخل التقارير المالية.",
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الإكمال", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const doReturn = useMutation({
    mutationFn: async (v: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/no-exam/charges/${v.id}/return`,
        { reason: v.reason });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setReturning(null); setReason("");
      toast({
        title: "أُعيدت للتصحيح",
        description: "لم يتغيّر شيء مالياً — تظهر الآن في طابور الاستقبال بسببها.",
      });
    },
    onError: (err: any) => toast({
      title: "تعذّرت الإعادة", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  if (!isLoading && specialties.length === 0) {
    return (
      <div className="p-4 md:p-6" dir="rtl">
        <Card><CardContent className="py-10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-exam-forbidden">
            مراجعة مبالغ عمليات «بلا معاينة» لطبيبٍ يملك اختصاص الأطراف أو
            المساند، وللمسؤول العام.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">{LEGACY_QUEUE_TITLE}</h1>
        {rows.length > 0 && (
          <Badge variant="secondary" data-testid="no-exam-review-count">{rows.length}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground" data-testid="legacy-queue-hint">
        {LEGACY_QUEUE_HINT}
        {" "}ولم يدخل أيٌّ منها المحاسبة بعد — لا كلفةَ مريض ولا قيدَ دفتر ولا
        تقرير، حتى يُكمَل هنا.
      </p>

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"
          data-testid="text-no-exam-review-empty">
          لا توجد مبالغ سابقة بانتظار الإكمال.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} data-testid={`no-exam-row-${r.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>{r.patientName ?? "—"}</span>
                  {r.patientCode && (
                    <span className="text-xs font-mono text-muted-foreground">{r.patientCode}</span>
                  )}
                  <Badge variant="outline">{SERVICE_LABELS[r.serviceType] ?? r.serviceType}</Badge>
                  {r.branchName && <Badge variant="secondary">{r.branchName}</Badge>}
                  <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100 gap-1">
                    {r.operationKind === "maintenance"
                      ? <Wrench className="w-3 h-3" /> : <PackageOpen className="w-3 h-3" />}
                    بلا معاينة
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium" data-testid={`no-exam-${r.id}-operation`}
                  dir="auto" style={{ unicodeBidi: "plaintext" }}>{operationLine(r)}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="text-muted-foreground">المبلغ: </span>
                    <b className="font-mono" data-testid={`no-exam-${r.id}-amount`}>
                      {money(r.amount)}</b> د.ع</span>
                  <span><span className="text-muted-foreground">سجّلها: </span>
                    {r.createdByName ?? "—"}</span>
                  <span className="text-muted-foreground">{fmtStamp(r.submittedAt)}</span>
                  {r.workOrderId && (
                    <span><span className="text-muted-foreground">أمر التصنيع: </span>
                      <span className="font-mono">#{r.workOrderId}</span></span>
                  )}
                </div>
                {r.note && (
                  <p className="text-sm bg-muted/40 rounded-md px-3 py-2" dir="auto"
                    style={{ unicodeBidi: "plaintext" }}>{r.note}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" disabled={approve.isPending || doReturn.isPending}
                    className="gap-1" data-testid={`no-exam-approve-${r.id}`}
                    onClick={() => approve.mutate(r.id)}>
                    <Check className="w-4 h-4" /> {PENDING_CHARGE_ACTION_LABELS.approve}
                  </Button>
                  <Button size="sm" variant="outline"
                    disabled={approve.isPending || doReturn.isPending}
                    className="gap-1" data-testid={`no-exam-return-${r.id}`}
                    onClick={() => { setReturning(r); setReason(""); }}>
                    <Undo2 className="w-4 h-4" /> {PENDING_CHARGE_ACTION_LABELS.return}
                  </Button>
                  <Link href={`/patients/${r.patientId}`}>
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                      data-testid={`no-exam-open-${r.id}`}>
                      <ExternalLink className="w-4 h-4" /> فتح ملف المريض
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── الإعادة للتصحيح — بسببٍ إلزاميّ ── */}
      <Dialog open={returning !== null} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{PENDING_CHARGE_ACTION_LABELS.return}</DialogTitle></DialogHeader>
          {returning && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {returning.patientName} — {operationLine(returning)} ·
                {" "}<b className="font-mono">{money(returning.amount)}</b> د.ع
              </p>
              <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
                العملية <b>لا تُحذف</b> ولا يتحرّك دينار. تعود إلى استقبال الفرع
                نفسه بسببك، فيُصحَّح المبلغ ويُعاد إرسالُه إليك.
              </p>
              <div className="space-y-1">
                <label className="text-sm font-medium">{RETURN_REASON_LABEL}</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: المبلغ لا يطابق سعر القالب المعتمد — راجعه مع المريض"
                  data-testid="no-exam-return-reason" />
                {!reason.trim() && (
                  <p className="text-xs text-destructive" data-testid="no-exam-return-reason-required">
                    السبب مطلوب — بدونه يعود الموظّف إلى التخمين.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" data-testid="no-exam-return-submit"
              disabled={doReturn.isPending || !reason.trim()}
              onClick={() => returning && doReturn.mutate({
                id: returning.id, reason: reason.trim(),
              })}>
              {doReturn.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : PENDING_CHARGE_ACTION_LABELS.return}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
