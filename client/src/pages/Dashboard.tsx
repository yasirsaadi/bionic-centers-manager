import { usePatients } from "@/hooks/use-patients";
import { StatsCard } from "@/components/StatsCard";
import { Users, Activity, Banknote, Clock, Calendar, HeartPulse, Building2, UserPlus, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Branch } from "@shared/schema";
import { api } from "@shared/routes";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

function translateCondition(condition: string | null | undefined, t: any): string {
  if (!condition) return "";
  const conditionMap: Record<string, string> = {
    "amputee": t.dashboard.conditionAmputee,
    "بتر": t.dashboard.conditionAmputee,
    "بتر تحت الركبة": t.dashboard.conditionAmputee,
    "physiotherapy": t.dashboard.conditionPhysiotherapy,
    "علاج طبيعي": t.dashboard.conditionPhysiotherapy,
    "medical_support": t.dashboard.conditionMedicalSupport,
    "إسناد طبي": t.dashboard.conditionMedicalSupport,
    "مساند طبية": t.dashboard.conditionMedicalSupport,
  };
  return conditionMap[condition] || condition;
}

function DashboardContent() {
  const [, navigate] = useLocation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  const { canViewPayments } = usePermissions();
  const { t } = useTranslation();
  
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isAdmin ? "all" : (userBranchId?.toString() || "all")
  );
  
  const effectiveBranchFilter = isAdmin ? selectedBranch : (userBranchId?.toString() || "all");
  
  // Fetch branches for admin selector
  const { data: branches } = useQuery<Branch[]>({
    queryKey: [api.branches.list.path],
    queryFn: async () => {
      const res = await fetch(api.branches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });
  
  const rawBranchName = branches?.find(b => b.id === userBranchId)?.name || "";
  const selectedBranchName = rawBranchName ? ((t.branches as Record<string, string>)[rawBranchName] || rawBranchName) : t.dashboard.branch;
  
  // Fetch overall stats (with branch filtering)
  const { data: stats, isLoading } = useQuery<{ 
    paid: number; 
    remaining: number; 
    sold: number;
    totalPatients: number;
    amputees: number;
    physiotherapy: number;
    medicalSupport: number;
  }>({
    queryKey: ["/api/reports/overall", effectiveBranchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      const url = `/api/reports/overall${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return { paid: 0, remaining: 0, sold: 0, totalPatients: 0, amputees: 0, physiotherapy: 0, medicalSupport: 0 };
      return res.json();
    },
  });

  // Fetch daily stats (with branch filtering)
  const { data: dailyStats, isLoading: isDailyLoading } = useQuery<{ 
    date: string;
    totalPatients: number;
    amputees: number;
    physiotherapy: number;
    medicalSupport: number;
    newPatients: number;
    newAmputees: number;
    newPhysiotherapy: number;
    newMedicalSupport: number;
    visitingPatients: number;
    visitingAmputees: number;
    visitingPhysiotherapy: number;
    visitingMedicalSupport: number;
    totalVisits: number;
    paid: number;
  }>({
    queryKey: ["/api/reports/daily", effectiveBranchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      const url = `/api/reports/daily${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
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
  const todayFormatted = formatDateIraq(new Date());
  
  return (
    <div className="space-y-6 md:space-y-8 page-transition">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">{t.dashboard.overview}</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {isAdmin ? t.dashboard.adminSummary : `${t.dashboard.branchPerformance} ${selectedBranchName}`}
          </p>
        </div>
        
        {/* Branch selector for admin or badge for branch staff */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {isAdmin ? (
            <>
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground hidden sm:block" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-36 md:w-48 h-10 md:h-11 text-sm md:text-base" data-testid="select-branch">
                  <SelectValue placeholder={t.dashboard.selectBranch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.allBranches}</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-branch">
              <Building2 className="w-4 h-4 ml-2" />
              {selectedBranchName}
            </Badge>
          )}
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t.dashboard.overallStats}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatsCard 
            title={t.dashboard.totalPatients} 
            value={totalPatients} 
            icon={Users} 
            color="primary"
          />
          <StatsCard 
            title={t.dashboard.amputeeCases} 
            value={amputeesCount} 
            icon={Activity} 
            color="accent"
          />
          <StatsCard 
            title={t.dashboard.physiotherapy} 
            value={physioCount} 
            icon={Clock} 
            color="green"
          />
          <StatsCard 
            title={t.dashboard.medicalSupport} 
            value={medicalSupportCount} 
            icon={HeartPulse} 
            color="blue"
          />
          {canViewPayments && (
            <StatsCard 
              title={t.dashboard.revenue} 
              value={`${(stats?.paid || 0).toLocaleString()} ${t.dashboard.currencyIQD}`} 
              icon={Banknote} 
              color="primary"
              onClick={() => navigate("/revenues")}
              data-testid="card-total-revenue"
            />
          )}
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-slate-700 mb-3 md:mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
          {t.dashboard.todayStats} ({todayFormatted})
        </h3>
        {isDailyLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <UserPlus className="w-4 h-4" />
                {t.dashboard.newPatientsToday}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatsCard 
                  title={t.dashboard.newPatients} 
                  value={dailyStats?.newPatients || 0} 
                  icon={UserPlus} 
                  color="primary"
                  data-testid="card-new-patients-today"
                />
                <StatsCard 
                  title={t.dashboard.newAmputee} 
                  value={dailyStats?.newAmputees || 0} 
                  icon={Activity} 
                  color="accent"
                />
                <StatsCard 
                  title={t.dashboard.newPhysiotherapy} 
                  value={dailyStats?.newPhysiotherapy || 0} 
                  icon={Clock} 
                  color="green"
                />
                <StatsCard 
                  title={t.dashboard.newMedicalSupport} 
                  value={dailyStats?.newMedicalSupport || 0} 
                  icon={HeartPulse} 
                  color="blue"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Stethoscope className="w-4 h-4" />
                {t.dashboard.visitingPatientsToday}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatsCard 
                  title={t.dashboard.visitingPatients} 
                  value={dailyStats?.visitingPatients || 0} 
                  icon={Users} 
                  color="primary"
                  data-testid="card-visiting-patients-today"
                />
                <StatsCard 
                  title={t.dashboard.amputee} 
                  value={dailyStats?.visitingAmputees || 0} 
                  icon={Activity} 
                  color="accent"
                />
                <StatsCard 
                  title={t.dashboard.physio} 
                  value={dailyStats?.visitingPhysiotherapy || 0} 
                  icon={Clock} 
                  color="green"
                />
                <StatsCard 
                  title={t.dashboard.medSupport} 
                  value={dailyStats?.visitingMedicalSupport || 0} 
                  icon={HeartPulse} 
                  color="blue"
                />
                <StatsCard 
                  title={t.dashboard.totalSessions} 
                  value={dailyStats?.totalVisits || 0} 
                  icon={Stethoscope} 
                  color="green"
                  data-testid="card-total-visits-today"
                />
              </div>
            </div>
            {canViewPayments && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatsCard 
                  title={t.dashboard.dailyRevenue} 
                  value={`${(dailyStats?.paid || 0).toLocaleString()} ${t.dashboard.currencyIQD}`} 
                  icon={Banknote} 
                  color="primary"
                  onClick={() => navigate("/revenues?daily=true")}
                  data-testid="card-daily-revenue"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity Section could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm">
          <h3 className="text-xl font-bold mb-4 font-display">{t.dashboard.recentPatients}</h3>
          <div className="space-y-4">
            {patients?.slice(0, 5).map(patient => (
              <div key={patient.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{translateCondition(patient.medicalCondition, t)}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600">
                  {formatDateIraq(patient.createdAt)}
                </span>
              </div>
            ))}
            {totalPatients === 0 && <p className="text-muted-foreground text-center py-4">{t.dashboard.noPatientsRegistered}</p>}
          </div>
        </div>

        {canViewPayments && (
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="text-xl font-bold mb-2 font-display">{t.dashboard.welcomeTitle}</h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              {t.dashboard.welcomeDesc}
            </p>
            <button 
              onClick={() => navigate("/reports")}
              data-testid="button-view-reports"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-2.5 rounded-xl font-medium transition-all"
            >
              {t.dashboard.viewReports}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
