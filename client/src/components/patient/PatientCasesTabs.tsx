import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Wrench, HeartPulse } from "lucide-react";
import { formatDateIraq } from "@/lib/utils";

// Phase 2 of the independent-cases architecture: one patient, but each
// specialty is shown as its OWN tab with its own details, cost, paid/remaining,
// visits and payments — read from patient_cases + the case-attributed
// visits/payments (case_id). Reads only; writing per-case is a later phase.

interface CaseRow {
  id: number;
  caseType: "physiotherapy" | "prosthetic" | "medical_support" | string;
  status: string;
  cost: number;
  paid: number;
  remaining: number;
  visitCount: number;
  details: Record<string, any> | null;
}

const CASE_META: Record<string, { label: string; icon: any }> = {
  physiotherapy: { label: "علاج طبيعي", icon: Activity },
  prosthetic: { label: "أطراف صناعية", icon: Wrench },
  medical_support: { label: "مساند طبية", icon: HeartPulse },
};

// Arabic labels for the case-detail keys stored in details jsonb.
const DETAIL_LABELS: Record<string, string> = {
  amputationSite: "موقع البتر", prostheticType: "نوع الطرف",
  siliconType: "نوع السيليكون", siliconSize: "قياس السيليكون",
  suspensionSystem: "نظام التعليق", footType: "نوع القدم",
  footSize: "قياس الحذاء", kneeJointType: "نوع مفصل الركبة",
  injurySide: "الجهة", injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
  injuryType: "نوع الإصابة", diseaseType: "التشخيص", injuryArea: "منطقة الإصابة",
  treatmentType: "نوع العلاج", supportType: "نوع المسند",
};

const fmtIQD = (n: number) => `${(n || 0).toLocaleString("en-US")} د.ع`;

export function PatientCasesTabs({ patientId, visits, payments }: {
  patientId: number;
  visits: any[];
  payments: any[];
}) {
  const { data: cases = [] } = useQuery<CaseRow[]>({
    queryKey: [`/api/patients/${patientId}/cases`],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!cases || cases.length === 0) return null;

  const meta = (t: string) => CASE_META[t] ?? { label: t, icon: Activity };

  return (
    <Card className="p-4 md:p-6 rounded-2xl shadow-sm border-primary/20 mb-6">
      <h3 className="font-bold text-lg text-primary mb-4">حالات المريض</h3>
      <Tabs defaultValue={String(cases[0].id)} className="space-y-4" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {cases.map((c) => {
            const m = meta(c.caseType);
            const Icon = m.icon;
            return (
              <TabsTrigger key={c.id} value={String(c.id)} className="gap-2" data-testid={`case-tab-${c.id}`}>
                <Icon className="w-4 h-4" /> {m.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {cases.map((c) => {
          const caseVisits = visits.filter((v) => v.caseId === c.id);
          const casePayments = payments.filter((p) => p.caseId === c.id);
          const details = c.details || {};
          const detailKeys = Object.keys(DETAIL_LABELS).filter((k) => details[k]);
          return (
            <TabsContent key={c.id} value={String(c.id)} className="space-y-4">
              {/* Financial summary for THIS case */}
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="التكلفة" value={fmtIQD(c.cost)} tone="slate" />
                <StatBox label="المدفوع" value={fmtIQD(c.paid)} tone="green" />
                <StatBox label="المتبقّي" value={fmtIQD(c.remaining)} tone={c.remaining > 0 ? "red" : "green"} />
              </div>

              {/* Case-specific details */}
              {detailKeys.length > 0 && (
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold text-primary mb-2">التفاصيل</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {detailKeys.map((k) => (
                      <div key={k}>
                        <div className="text-xs text-muted-foreground">{DETAIL_LABELS[k]}</div>
                        <div className="font-medium">{k === "injuryDate" ? formatDateIraq(details[k]) : String(details[k])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This case's visits */}
              <div className="rounded-xl border p-3">
                <p className="text-sm font-semibold text-primary mb-2">الزيارات ({caseVisits.length})</p>
                {caseVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا زيارات لهذه الحالة.</p>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {caseVisits.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-sm border-b border-dashed py-1">
                        <span className="text-slate-400 font-mono text-xs">{formatDateIraq(v.visitDate)}</span>
                        <span className="flex-1 px-2 truncate">{v.treatmentType || v.notes || "زيارة"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* This case's payments */}
              <div className="rounded-xl border p-3">
                <p className="text-sm font-semibold text-primary mb-2">الدفعات ({casePayments.length})</p>
                {casePayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا دفعات لهذه الحالة.</p>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {casePayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border-b border-dashed py-1">
                        <span className="text-slate-400 font-mono text-xs">{formatDateIraq(p.date)}</span>
                        <span className="flex-1 px-2 truncate">{p.paymentTreatmentType || p.notes || "دفعة"}</span>
                        <span className="font-semibold text-green-700">{fmtIQD(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: "slate" | "green" | "red" }) {
  const toneCls = tone === "green" ? "text-green-700 bg-green-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <div className={`rounded-xl p-3 text-center ${toneCls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="font-bold text-sm md:text-base">{value}</div>
    </div>
  );
}
