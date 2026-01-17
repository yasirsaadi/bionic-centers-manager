import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Banknote, TrendingUp, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { AdminGate } from "@/components/AdminGate";
import type { Branch } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";

interface BranchReport {
  revenue: number;
  sold: number;
  paid: number;
  remaining: number;
}

function BranchRevenuesContent() {
  const [, navigate] = useLocation();

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: [api.branches.list.path],
    queryFn: async () => {
      const res = await fetch(api.branches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب الفروع");
      return res.json();
    },
  });

  const { data: branchReports, isLoading: reportsLoading } = useQuery<Record<number, BranchReport>>({
    queryKey: ["/api/reports/all-branches"],
    queryFn: async () => {
      const res = await fetch("/api/reports/all-branches", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب التقارير");
      return res.json();
    },
    enabled: !!branches,
  });

  const isLoading = branchesLoading || reportsLoading;

  const branchColors = [
    { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600" },
    { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600" },
    { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600" },
    { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600" },
    { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600" },
  ];

  return (
    <div className="space-y-8 page-transition">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")} 
          className="h-10 w-10 p-0 rounded-full border"
          data-testid="button-back"
        >
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">إيرادات الفروع</h2>
          <p className="text-muted-foreground mt-1">تفاصيل الإيرادات لكل فرع</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches?.map((branch, index) => {
            const report = branchReports?.[branch.id] || { revenue: 0, sold: 0, paid: 0, remaining: 0 };
            const colorScheme = branchColors[index % branchColors.length];
            
            return (
              <Card 
                key={branch.id} 
                className={`p-6 rounded-2xl border-2 ${colorScheme.border} ${colorScheme.bg} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
                    <Building2 className={`w-6 h-6 ${colorScheme.icon}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{branch.name}</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-600">إجمالي التكاليف</span>
                    </div>
                    <span className="font-bold text-slate-800" data-testid={`text-sold-${branch.id}`}>
                      {report.sold.toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-slate-600">المدفوع</span>
                    </div>
                    <span className="font-bold text-emerald-600" data-testid={`text-paid-${branch.id}`}>
                      {report.paid.toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-slate-600">المتبقي</span>
                    </div>
                    <span className="font-bold text-red-600" data-testid={`text-remaining-${branch.id}`}>
                      {report.remaining.toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BranchRevenues() {
  return (
    <AdminGate>
      <BranchRevenuesContent />
    </AdminGate>
  );
}
