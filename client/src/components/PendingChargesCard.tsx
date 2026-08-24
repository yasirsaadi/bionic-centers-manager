// **مبالغ بلا معاينة** — بطاقةُ ملفّ المريض.
//
// ══ لماذا على الملفّ أيضاً ══════════════════════════════════════════════
// الطابورُ شاشةُ عملٍ لمن ينتظره، وملفُّ المريض هو ما يُفتَح حين يقف أمام
// الموظّف ويسأل «كم عليّ؟». فما لم يُعتمَد بعد **يُقال صراحةً** بدل أن
// يختفي فيُظنّ مسجَّلاً — أو يُطالَب به المريضُ مرّتين.
//
// ══ والمعتمَدُ يبقى مقروءاً ════════════════════════════════════════════
// الصفُّ لا يُحذَف عند الاعتماد — يقول متى اعتُمد وبأيّ أمر. فمَن يقرأ
// الملفَّ بعد شهور يعرف أن هذا المبلغ مرَّ بمراجعة ولم يُقيَّد بلا قرار.

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, Undo2, CheckCircle2 } from "lucide-react";
import {
  PENDING_CHARGE_STATUS_LABELS, RETURN_REASON_LABEL,
  type PendingChargeStatus,
} from "@shared/pending_charge";
import { requestedItemLabel, componentLabel } from "@shared/prosthetic_parts";
import { DEVICE_ORIGIN_LABELS, isDeviceOrigin } from "@shared/device_origin";

interface Row {
  id: number; serviceType: string; operationKind: string;
  requestedItem: string | null; maintenanceComponent: string | null;
  deviceOrigin: string | null; amount: number; note: string | null;
  status: PendingChargeStatus; createdByName: string | null; submittedAt: string;
  returnReason: string | null; returnedByName: string | null; returnedAt: string | null;
  reviewedByName: string | null; reviewedAt: string | null;
  workOrderId: number | null; appliedWorkOrderId: number | null;
}

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
};

function line(r: Row): string {
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

const STATUS_STYLE: Record<PendingChargeStatus, string> = {
  pending_review: "bg-sky-100 text-sky-900 hover:bg-sky-100",
  returned: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
};

const STATUS_ICON: Record<PendingChargeStatus, typeof Clock> = {
  pending_review: Clock, returned: Undo2, approved: CheckCircle2,
};

export function PendingChargesCard({ patientId }: { patientId: number }) {
  const { data } = useQuery<{ rows: Row[] }>({
    queryKey: [`/api/patients/${patientId}/pending-charges`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/pending-charges`,
        { credentials: "include" });
      if (!res.ok) return { rows: [] };
      return res.json();
    },
  });
  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;

  const live = rows.filter((r) => r.status !== "approved");

  return (
    <Card data-testid="pending-charges-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          مبالغ عمليات «بلا معاينة»
          {live.length > 0 && (
            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100"
              data-testid="pending-charges-live">{live.length} بانتظار الاعتماد</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {live.length > 0 && (
          <p className="text-xs text-muted-foreground" data-testid="pending-charges-note">
            المبالغ المعلّقة <b>لم تُضَف إلى كلفة المريض ولا إلى حساباته</b> —
            تدخلها فور اعتماد الطبيب.
          </p>
        )}
        {rows.map((r) => {
          const Icon = STATUS_ICON[r.status];
          return (
            <div key={r.id} className="rounded-md border px-3 py-2 space-y-1"
              data-testid={`pending-charge-${r.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${STATUS_STYLE[r.status]} gap-1`}>
                  <Icon className="w-3 h-3" />
                  {PENDING_CHARGE_STATUS_LABELS[r.status]}
                </Badge>
                <span className="font-medium" dir="auto"
                  style={{ unicodeBidi: "plaintext" }}>{line(r)}</span>
                <span className="font-mono" data-testid={`pending-charge-${r.id}-amount`}>
                  {money(r.amount)}</span>
                <span className="text-muted-foreground text-xs">د.ع</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.createdByName ?? "—"} · {fmt(r.submittedAt)}
                {r.status === "approved" && r.reviewedByName
                  && ` · اعتمدها ${r.reviewedByName} · ${fmt(r.reviewedAt)}`}
                {(r.appliedWorkOrderId ?? r.workOrderId)
                  && ` · أمر التصنيع #${r.appliedWorkOrderId ?? r.workOrderId}`}
              </div>
              {r.status === "returned" && r.returnReason && (
                <p className="text-xs bg-amber-50 border border-amber-300 rounded px-2 py-1"
                  data-testid={`pending-charge-${r.id}-reason`}>
                  <b>{RETURN_REASON_LABEL}: </b>
                  <span dir="auto" style={{ unicodeBidi: "plaintext" }}>{r.returnReason}</span>
                  {r.returnedByName ? ` — ${r.returnedByName}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
