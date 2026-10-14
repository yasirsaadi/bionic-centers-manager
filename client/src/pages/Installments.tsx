// **صفحةُ «الأقساط»** (§4.ea) — لمن يرى المرضى ودفعاتِهم: المتأخّرة، والمستحقّة خلال سبعة أيام، وكلُّ الخطط النشطة.
// النطاقُ من الخادم: فرعُ الجلسة النشط، والمسؤولُ كلُّ الفروع. ورقمُ «متأخّرة» هو رقمُ الشريط نفسُه.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { CalendarClock, Loader2 } from "lucide-react";
import { PlanSummary, type PlanViewRow } from "@/components/installments/InstallmentParts";

type Scope = "overdue" | "upcoming" | "active";
const TABS: { key: Scope; label: string; empty: string }[] = [
  { key: "overdue", label: "متأخّرة", empty: "لا أقساطَ متأخّرة." },
  { key: "upcoming", label: "مستحقّة خلال أسبوع", empty: "لا أقساطَ مستحقّة خلال الأيام السبعة القادمة." },
  { key: "active", label: "كلّ الخطط النشطة", empty: "لا خططَ أقساطٍ نشطة." },
];

export default function Installments() {
  const [scope, setScope] = useState<Scope>("overdue");
  const q = useQuery<PlanViewRow[]>({
    queryKey: ["/api/installments", scope],
    queryFn: async () => (await apiRequest("GET", `/api/installments?scope=${scope}`)).json(),
  });
  const rows = q.data ?? [];
  const tab = TABS.find((t) => t.key === scope)!;
  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">الأقساط</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        خططُ الأقساط التي فُتحت مع الدفعات. أيُّ دفعةٍ على قسم الخطّة تُحسب على أقساطها تلقائياً، والتذكيرُ يصل الاستقبالَ ومديرَ الفرع
        والمريضَ في تلغرام قبل كلّ قسطٍ بيوم وفي يومه. التعديلُ والإلغاءُ من ملفّ المريض للمسؤول ومدير الفرع.
      </p>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} size="sm" variant={scope === t.key ? "default" : "outline"} onClick={() => setScope(t.key)}
            data-testid={`installments-tab-${t.key}`}>{t.label}</Button>
        ))}
      </div>
      {q.isLoading ? (
        <Card><CardContent className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground" data-testid="installments-empty">{tab.empty}</CardContent></Card>
      ) : (
        <div className="space-y-2" data-testid="installments-list">
          {rows.map((p) => (
            <Card key={p.id} className="p-3"><PlanSummary p={p} showPatient /></Card>
          ))}
        </div>
      )}
    </div>
  );
}
