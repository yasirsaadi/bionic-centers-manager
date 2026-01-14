import { usePatients } from "@/hooks/use-patients";
import { StatsCard } from "@/components/StatsCard";
import { Users, Activity, Banknote, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { useLocation } from "wouter";

function DashboardContent() {
  const [, navigate] = useLocation();
  
  // Fetch overall stats for all branches
  const { data: stats, isLoading } = useQuery<{ 
    paid: number; 
    remaining: number; 
    sold: number;
    totalPatients: number;
    amputees: number;
    physiotherapy: number;
  }>({
    queryKey: ["/api/reports/overall"],
    queryFn: async () => {
      const res = await fetch("/api/reports/overall", { credentials: "include" });
      if (!res.ok) return { paid: 0, remaining: 0, sold: 0, totalPatients: 0, amputees: 0, physiotherapy: 0 };
      return res.json();
    },
  });

  const { data: patients } = usePatients();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl w-full" />
        ))}
      </div>
    );
  }

  // Use stats from the API
  const totalPatients = stats?.totalPatients || 0;
  const amputeesCount = stats?.amputees || 0;
  const physioCount = stats?.physiotherapy || 0;
  
  return (
    <div className="space-y-8 page-transition">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-800">نظرة عامة</h2>
        <p className="text-muted-foreground mt-1">ملخص أداء المركز وإحصائيات المرضى</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="إجمالي المرضى" 
          value={totalPatients} 
          icon={Users} 
          color="primary"
          trend="+5 هذا الشهر"
        />
        <StatsCard 
          title="حالات البتر" 
          value={amputeesCount} 
          icon={Activity} 
          color="accent"
        />
        <StatsCard 
          title="العلاج الطبيعي" 
          value={physioCount} 
          icon={Clock} 
          color="green"
        />
        <StatsCard 
          title="الإيرادات" 
          value={`${(stats?.paid || 0).toLocaleString('ar-IQ')} د.ع`} 
          icon={Banknote} 
          color="blue"
        />
      </div>

      {/* Recent Activity Section could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm">
          <h3 className="text-xl font-bold mb-4 font-display">آخر المرضى المسجلين</h3>
          <div className="space-y-4">
            {patients?.slice(0, 5).map(patient => (
              <div key={patient.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.medicalCondition}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600">
                  {new Date(patient.createdAt || "").toLocaleDateString('ar-SA')}
                </span>
              </div>
            ))}
            {totalPatients === 0 && <p className="text-muted-foreground text-center py-4">لا يوجد مرضى مسجلين</p>}
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-2xl text-white shadow-xl shadow-primary/20">
          <h3 className="text-xl font-bold mb-2 font-display">مرحباً بك في النظام</h3>
          <p className="text-white/80 mb-6 leading-relaxed">
            يمكنك من هنا إدارة كافة عمليات المركز بسهولة، بدءاً من تسجيل المرضى ومتابعة حالاتهم، وصولاً إلى الإدارة المالية والأرشفة الإلكترونية.
          </p>
          <button 
            onClick={() => navigate("/reports")}
            data-testid="button-view-reports"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-2.5 rounded-xl font-medium transition-all"
          >
            عرض التقارير
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminGate>
      <DashboardContent />
    </AdminGate>
  );
}
