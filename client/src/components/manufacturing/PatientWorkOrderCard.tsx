import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { STAGE_LABELS, STATUS_LABELS, SERVICE_TYPE_LABELS, FINAL_RESULT_LABELS } from "@shared/manufacturing";

// Compact manufacturing summary shown on the patient page for authorized
// NON-expert users (reception / branch manager / admin). Experts never open
// the general patient page — they use the order page — and the server blocks
// this endpoint for them, so we also skip the request for the expert role.
export function PatientWorkOrderCard({ patientId }: { patientId: number }) {
  const session = useBranchSession();
  const isExpert = session?.role === "prosthetics_expert";

  const { data } = useQuery<any>({
    queryKey: [`/api/manufacturing/patient/${patientId}/summary`],
    enabled: !isExpert && !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/patient/${patientId}/summary`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isExpert || !data) return null;

  const fmtD = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <Card className="p-4 rounded-2xl border-primary/30 bg-primary/5">
      <h3 className="font-bold text-sm flex items-center gap-2 text-primary mb-3">
        <Wrench className="w-4 h-4" /> حالة التصنيع
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Item label="الخبير المسؤول" value={data.expertName} />
        <Item label="النوع" value={SERVICE_TYPE_LABELS[data.serviceType as "prosthetic"] ?? data.serviceType} />
        <Item label="المرحلة الحالية" value={STAGE_LABELS[data.currentStage] ?? data.currentStage} />
        <Item label="الحالة" value={STATUS_LABELS[data.status] ?? data.status} />
        <Item label="بدء العمل" value={fmtD(data.startedAt)} />
        <Item label="التسليم المتوقّع" value={fmtD(data.expectedDeliveryDate)} />
        <Item label="مرّات إعادة القالب" value={String(data.recastCount)} />
        <Item label="مرّات إعادة السوكت" value={String(data.resocketCount)} />
      </div>
      {data.finalResult && (
        <div className="mt-3 text-sm">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            النتيجة: {FINAL_RESULT_LABELS[data.finalResult] ?? data.finalResult}
          </Badge>
        </div>
      )}
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
