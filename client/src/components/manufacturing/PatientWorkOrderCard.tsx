import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle2, Clock } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { AdministrativeReversalDialog } from "@/components/AdministrativeReversalDialog";
import { ADMIN_VOID_BADGE } from "@shared/administrative_reversal";
import { STAGE_LABELS, STATUS_LABELS, SERVICE_TYPE_LABELS, FINAL_RESULT_LABELS } from "@shared/manufacturing";

interface OrderRow {
  id: number;
  expertName: string | null;
  serviceType: string;
  purpose?: string;
  status: string;
  currentStage: string;
  startedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  createdAt: string | null;
  finalResult: string | null;
  active: boolean;
  adminVoidReversalId?: number | null;
  dateChanges?: { note: string; byName: string | null; at: string | null }[];
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
  //  ══ **مخرجُ الخطأ حيث يُرى الخطأ** (ترحيل ٠٦٤) ═══════════════════════
  //  «بدأتُ التصنيع بالخطأ» يقولها الموظّفُ لمديره، والمديرُ يقرأ الأمرَ
  //  هنا — فالزرُّ هنا، بهويّةِ الأمر بعينه لا بتخمينِ «آخر عملية».
  //  **والحجبُ عرضٌ لا إذن**: الخادمُ يفحص الدورَ والفرعَ في كلّ نداء.
  const mayReverse = Boolean(session?.isAdmin) || session?.role === "branch_manager";
  const [reverseOrderId, setReverseOrderId] = useState<number | null>(null);

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
    //  مرساةُ «فتح العملية الحالية» حين يوجد أمرُ تصنيع — وصفحةُ الأمر
    //  نفسُها هي الوجهةُ الأولى، وهذه للحالات التي تبقى في صفحة المريض.
    <Card id="patient-manufacturing-card" className="p-4 rounded-2xl border-primary/30 bg-primary/5">
      <h3 className="font-bold text-sm flex items-center gap-2 text-primary mb-3">
        <Wrench className="w-4 h-4" /> سجلّ التصنيع
        <span className="text-xs font-normal text-muted-foreground">({orders.length} أمر)</span>
      </h3>

      {/*  نافذةٌ واحدة للجميع — تُفتَح على الأمر المضغوط بعينه. */}
      <AdministrativeReversalDialog
        open={reverseOrderId !== null}
        onOpenChange={(v) => { if (!v) setReverseOrderId(null); }}
        patientId={patientId}
        target={{ workOrderId: reverseOrderId }}
      />

      <div className="space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            id={`work-order-${o.id}`}
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
                {o.purpose === "maintenance" && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] px-1.5 py-0">صيانة</Badge>
                )}
                <span className="text-xs text-muted-foreground">— الخبير: {o.expertName ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                {/*  الأمرُ المُبطَل يُقال مُبطَلاً — ولا يُفتَح عليه تصحيحٌ ثانٍ. */}
                {o.adminVoidReversalId ? (
                  <Badge variant="outline"
                    className="bg-slate-200 text-slate-700 border-slate-300"
                    data-testid={`badge-order-admin-void-${o.id}`}>
                    {ADMIN_VOID_BADGE}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={o.active
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-green-100 text-green-800 border-green-200"}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </Badge>
                )}
                {mayReverse && !o.adminVoidReversalId && (
                  <button
                    type="button"
                    onClick={() => setReverseOrderId(o.id)}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    data-testid={`button-open-reversal-order-${o.id}`}
                  >
                    تصحيح / إلغاء العملية
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Item label="المرحلة" value={STAGE_LABELS[o.currentStage] ?? o.currentStage} />
              <Item label="بدء العمل" value={fmtD(o.startedAt)} />
              <Item label="التسليم المتوقّع" value={fmtD(o.expectedDeliveryDate)} />
              <Item label={o.completedAt ? "تاريخ التسليم" : "الإنشاء"} value={fmtD(o.completedAt ?? o.createdAt)} />
            </div>
            {(o.dateChanges?.length ?? 0) > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2 space-y-1">
                <div className="text-[11px] font-bold text-amber-900">تغييرات موعد التسليم</div>
                {o.dateChanges!.map((c, i) => (
                  <div key={i} className="text-xs text-amber-900" dir="auto">
                    {c.note}
                    <span className="text-muted-foreground"> — {c.byName ?? "غير معروف"}{c.at ? `، ${fmtD(c.at)}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
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
