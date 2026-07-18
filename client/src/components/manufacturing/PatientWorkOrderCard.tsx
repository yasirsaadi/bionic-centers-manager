import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle2, Clock } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { STAGE_LABELS, STATUS_LABELS, SERVICE_TYPE_LABELS, FINAL_RESULT_LABELS } from "@shared/manufacturing";

interface OrderRow {
  id: number;
  expertName: string | null;
  serviceType: string;
  status: string;
  currentStage: string;
  startedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  createdAt: string | null;
  finalResult: string | null;
  active: boolean;
}

// Full manufacturing HISTORY on the patient page for authorized NON-expert
// users (reception / branch manager / admin). Each work order is its own
// episode — a returning patient can have several over time, each with its own
// expert and service type (e.g. عناد built the limb, أيوب did a maintenance
// mold a month later). Experts never open the general patient page — they use
// the order page — and the server blocks this endpoint for them.
export function PatientWorkOrderCard({ patientId }: { patientId: number }) {
  const session = useBranchSession();
  const isExpert = session?.role === "prosthetics_expert";

  const { data: orders } = useQuery<OrderRow[]>({
    queryKey: [`/api/manufacturing/patient/${patientId}/orders`],
    enabled: !isExpert && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/patient/${patientId}/orders`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isExpert || !orders || orders.length === 0) return null;

  const fmtD = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <Card className="p-4 rounded-2xl border-primary/30 bg-primary/5">
      <h3 className="font-bold text-sm flex items-center gap-2 text-primary mb-3">
        <Wrench className="w-4 h-4" /> سجلّ التصنيع
        <span className="text-xs font-normal text-muted-foreground">({orders.length} أمر)</span>
      </h3>

      <div className="space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className={`rounded-xl border p-3 ${o.active ? "bg-white border-primary/40" : "bg-slate-50 border-slate-200"}`}
          >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {o.active ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <span className="font-semibold text-sm">
                  {SERVICE_TYPE_LABELS[o.serviceType as "prosthetic"] ?? o.serviceType}
                </span>
                <span className="text-xs text-muted-foreground">— الخبير: {o.expertName ?? "—"}</span>
              </div>
              <Badge
                variant="outline"
                className={o.active
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-green-100 text-green-800 border-green-200"}
              >
                {STATUS_LABELS[o.status] ?? o.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Item label="المرحلة" value={STAGE_LABELS[o.currentStage] ?? o.currentStage} />
              <Item label="بدء العمل" value={fmtD(o.startedAt)} />
              <Item label="التسليم المتوقّع" value={fmtD(o.expectedDeliveryDate)} />
              <Item label={o.completedAt ? "تاريخ التسليم" : "الإنشاء"} value={fmtD(o.completedAt ?? o.createdAt)} />
            </div>
            {o.finalResult && (
              <div className="mt-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  النتيجة: {FINAL_RESULT_LABELS[o.finalResult] ?? o.finalResult}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
