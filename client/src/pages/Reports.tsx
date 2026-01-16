import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Banknote, Clock, Building2 } from "lucide-react";
import { useState } from "react";
import { api, buildUrl } from "@shared/routes";
import type { Branch } from "@shared/schema";
import { AdminGate } from "@/components/AdminGate";

function ReportsContent() {
  const [selectedBranch, setSelectedBranch] = useState<string>("1");

  const { data: branches } = useQuery<Branch[]>({
    queryKey: [api.branches.list.path],
    queryFn: async () => {
      const res = await fetch(api.branches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب الفروع");
      return res.json();
    },
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/reports/daily", selectedBranch],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.reports.daily.path, { branchId: selectedBranch }), { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("فشل في جلب التقرير");
      return res.json();
    },
  });

  const selectedBranchName = branches?.find(b => b.id.toString() === selectedBranch)?.name || "الفرع";

  return (
    <div className="space-y-8 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">التقارير المالية</h2>
          <p className="text-muted-foreground mt-1">ملخص الإيرادات والمدفوعات لكل فرع</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48 h-11" data-testid="select-branch">
              <SelectValue placeholder="اختر الفرع" />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">
                  الإيرادات
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المدفوعات</p>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-revenue">
                {(report?.revenue || 0).toLocaleString('ar-IQ')} د.ع
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                  المبيعات
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي التكاليف</p>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-sold">
                {(report?.sold || 0).toLocaleString('ar-IQ')} د.ع
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-600 rounded-md">
                  المحصّل
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">المبلغ المدفوع</p>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-paid">
                {(report?.paid || 0).toLocaleString('ar-IQ')} د.ع
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md">
                  المتبقي
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-red-600" data-testid="text-remaining">
                {(report?.remaining || 0).toLocaleString('ar-IQ')} د.ع
              </p>
            </Card>
          </div>

          <Card className="p-8 rounded-2xl border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ملخص فرع {selectedBranchName}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  التاريخ: {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
              <Button variant="outline" className="gap-2 print:hidden" onClick={() => window.print()} data-testid="button-print-report">
                <FileText className="w-4 h-4" />
                طباعة التقرير
              </Button>
            </div>

            <div className="overflow-hidden border rounded-xl">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right p-4 font-semibold text-slate-600">البند</th>
                    <th className="text-left p-4 font-semibold text-slate-600">المبلغ (د.ع)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-4 text-slate-700">إجمالي تكاليف العلاج</td>
                    <td className="p-4 font-bold text-left font-mono">{(report?.sold || 0).toLocaleString('ar-IQ')}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-4 text-slate-700">إجمالي المبالغ المحصّلة</td>
                    <td className="p-4 font-bold text-left font-mono text-emerald-600">{(report?.paid || 0).toLocaleString('ar-IQ')}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 bg-red-50/50">
                    <td className="p-4 text-slate-700 font-semibold">المبالغ المتبقية</td>
                    <td className="p-4 font-bold text-left font-mono text-red-600">{(report?.remaining || 0).toLocaleString('ar-IQ')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Reports() {
  return (
    <AdminGate>
      <ReportsContent />
    </AdminGate>
  );
}
