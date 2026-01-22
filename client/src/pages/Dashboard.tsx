import { usePatients } from "@/hooks/use-patients";
import { StatsCard } from "@/components/StatsCard";
import { Users, Activity, Banknote, Clock, Calendar, HeartPulse } from "lucide-react";
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
    medicalSupport: number;
  }>({
    queryKey: ["/api/reports/overall"],
    queryFn: async () => {
      const res = await fetch("/api/reports/overall", { credentials: "include" });
      if (!res.ok) return { paid: 0, remaining: 0, sold: 0, totalPatients: 0, amputees: 0, physiotherapy: 0, medicalSupport: 0 };
      return res.json();
    },
  });

  // Fetch daily stats
  const { data: dailyStats, isLoading: isDailyLoading } = useQuery<{ 
    date: string;
    totalPatients: number;
    amputees: number;
    physiotherapy: number;
    medicalSupport: number;
    paid: number;
  }>({
    queryKey: ["/api/reports/daily"],
    queryFn: async () => {
      const res = await fetch("/api/reports/daily", { credentials: "include" });
      if (!res.ok) return { date: "", totalPatients: 0, amputees: 0, physiotherapy: 0, medicalSupport: 0, paid: 0 };
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
  const medicalSupportCount = stats?.medicalSupport || 0;

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-GB');
  
  return (
    <div className="space-y-6 md:space-y-8 page-transition">
      <div>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">نظرة عامة</h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1">ملخص أداء المركز وإحصائيات المرضى</p>
      </div>

      {/* Overall Stats */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          الإحصائيات الإجمالية
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatsCard 
            title="إجمالي المرضى" 
            value={totalPatients} 
            icon={Users} 
            color="primary"
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
            title="مساند طبية" 
            value={medicalSupportCount} 
            icon={HeartPulse} 
            color="blue"
          />
          <StatsCard 
            title="الإيرادات" 
            value={`${(stats?.paid || 0).toLocaleString('ar-IQ')} د.ع`} 
            icon={Banknote} 
            color="primary"
            onClick={() => navigate("/revenues")}
            data-testid="card-total-revenue"
          />
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
          إحصائيات اليوم ({todayFormatted})
        </h3>
        {isDailyLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <StatsCard 
              title="مرضى اليوم" 
              value={dailyStats?.totalPatients || 0} 
              icon={Users} 
              color="primary"
            />
            <StatsCard 
              title="حالات بتر اليوم" 
              value={dailyStats?.amputees || 0} 
              icon={Activity} 
              color="accent"
            />
            <StatsCard 
              title="علاج طبيعي اليوم" 
              value={dailyStats?.physiotherapy || 0} 
              icon={Clock} 
              color="green"
            />
            <StatsCard 
              title="مساند طبية اليوم" 
              value={dailyStats?.medicalSupport || 0} 
              icon={HeartPulse} 
              color="blue"
            />
            <StatsCard 
              title="إيرادات اليوم" 
              value={`${(dailyStats?.paid || 0).toLocaleString('ar-IQ')} د.ع`} 
              icon={Banknote} 
              color="primary"
              onClick={() => navigate("/revenues?daily=true")}
              data-testid="card-daily-revenue"
            />
          </div>
        )}
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
                  {new Date(patient.createdAt || "").toLocaleDateString('en-GB')}
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
