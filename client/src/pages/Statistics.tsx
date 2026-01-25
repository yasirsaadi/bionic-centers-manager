import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, Users, TrendingUp, Building2, Calendar, Banknote, 
  Activity, UserCheck, Heart, Accessibility, Stethoscope
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import type { Branch, Patient, Visit, Payment } from "@shared/schema";
import { useBranchSession } from "@/components/BranchGate";

type PatientWithRelations = Patient & { visits?: Visit[], payments?: Payment[] };

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const AGE_GROUPS = [
  { label: '0-10', min: 0, max: 10 },
  { label: '11-20', min: 11, max: 20 },
  { label: '21-30', min: 21, max: 30 },
  { label: '31-40', min: 31, max: 40 },
  { label: '41-50', min: 41, max: 50 },
  { label: '51-60', min: 51, max: 60 },
  { label: '61-70', min: 61, max: 70 },
  { label: '70+', min: 71, max: 150 },
];

export default function Statistics() {
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin ?? false;
  
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");

  // Set branch filter automatically for non-admin users
  useEffect(() => {
    if (branchSession && !isAdmin) {
      setSelectedBranch(String(branchSession.branchId));
    }
  }, [branchSession, isAdmin]);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: allPatients, isLoading } = useQuery<PatientWithRelations[]>({
    queryKey: ["/api/patients"],
  });

  const getStartDate = (range: string): Date | null => {
    if (range === "all") return null;
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return null;
    }
    return startDate;
  };

  const filteredPatients = useMemo(() => {
    if (!allPatients) return [];
    let patients = allPatients;
    
    if (selectedBranch !== "all") {
      patients = patients.filter(p => p.branchId === Number(selectedBranch));
    }
    
    return patients;
  }, [allPatients, selectedBranch]);

  const stats = useMemo(() => {
    if (!filteredPatients.length) return null;

    const startDate = getStartDate(timeRange);

    // Filter patients by registration date for patient-based metrics
    const timeFilteredPatients = startDate 
      ? filteredPatients.filter(p => new Date(p.createdAt || "") >= startDate)
      : filteredPatients;

    const totalPatients = timeFilteredPatients.length;
    const amputeeCount = timeFilteredPatients.filter(p => p.isAmputee).length;
    const physioCount = timeFilteredPatients.filter(p => !p.isAmputee && !p.isMedicalSupport).length;
    const medicalSupportCount = timeFilteredPatients.filter(p => p.isMedicalSupport).length;

    // Calculate visits filtered by visit date (from all patients in branch)
    const allVisitsInRange = filteredPatients.flatMap(p => 
      (p.visits || []).filter(v => !startDate || new Date(v.visitDate || "") >= startDate)
    );
    const totalVisits = allVisitsInRange.length;

    // Calculate payments filtered by payment date (from all patients in branch)
    const allPaymentsInRange = filteredPatients.flatMap(p => 
      (p.payments || []).filter(pay => !startDate || new Date(pay.date || "") >= startDate)
    );
    const totalPaid = allPaymentsInRange.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    // All-time financial totals (branch-filtered only, no time filter)
    const allTimeRevenue = filteredPatients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const allTimePaid = filteredPatients.reduce((sum, p) => {
      const patientPayments = p.payments?.reduce((pSum, payment) => pSum + (payment.amount || 0), 0) || 0;
      return sum + patientPayments;
    }, 0);
    const allTimeRemaining = allTimeRevenue - allTimePaid;
    
    // Time-filtered financial totals (for time-range specific stats)
    const timeFilteredRevenue = timeFilteredPatients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalRemaining = allTimeRevenue - allTimePaid;

    const ageDistribution = AGE_GROUPS.map(group => ({
      name: group.label,
      count: timeFilteredPatients.filter(p => p.age >= group.min && p.age <= group.max).length,
    }));

    const conditionDistribution = [
      { name: 'بتر', value: amputeeCount, color: '#0088FE' },
      { name: 'علاج طبيعي', value: physioCount, color: '#00C49F' },
      { name: 'مساند طبية', value: medicalSupportCount, color: '#FFBB28' },
    ];

    const branchDistribution = branches?.map(branch => ({
      name: branch.name,
      count: filteredPatients.filter(p => p.branchId === branch.id).length,
      revenue: filteredPatients
        .filter(p => p.branchId === branch.id)
        .reduce((sum, p) => sum + (p.totalCost || 0), 0),
    })) || [];

    const amputationSites: { [key: string]: number } = {};
    filteredPatients.filter(p => p.isAmputee && p.amputationSite).forEach(p => {
      const site = p.amputationSite || 'غير محدد';
      amputationSites[site] = (amputationSites[site] || 0) + 1;
    });
    const amputationSiteData = Object.entries(amputationSites)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const diseaseTypes: { [key: string]: number } = {};
    filteredPatients.filter(p => !p.isAmputee && !p.isMedicalSupport && p.diseaseType).forEach(p => {
      const type = p.diseaseType || 'غير محدد';
      diseaseTypes[type] = (diseaseTypes[type] || 0) + 1;
    });
    const diseaseTypeData = Object.entries(diseaseTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Monthly trend: patients by registration date, visits/payments by their own dates
    const monthlyData: { [key: string]: { patients: number; payments: number; visits: number } } = {};
    
    // Count patients by registration month
    filteredPatients.forEach(p => {
      const date = new Date(p.createdAt || "");
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
      }
      monthlyData[monthKey].patients += 1;
    });
    
    // Count visits by actual visit date
    filteredPatients.forEach(p => {
      (p.visits || []).forEach(v => {
        const date = new Date(v.visitDate || "");
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
        }
        monthlyData[monthKey].visits += 1;
      });
    });
    
    // Count payments by actual payment date
    filteredPatients.forEach(p => {
      (p.payments || []).forEach(pay => {
        const date = new Date(pay.date || "");
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
        }
        monthlyData[monthKey].payments += (pay.amount || 0);
      });
    });
    
    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('ar-IQ', { month: 'short', year: 'numeric' }),
        ...data,
      }));

    return {
      totalPatients,
      amputeeCount,
      physioCount,
      medicalSupportCount,
      allTimeRevenue,
      allTimePaid,
      allTimeRemaining,
      totalPaid, // Time-range filtered payments
      totalVisits, // Time-range filtered visits
      ageDistribution,
      conditionDistribution,
      branchDistribution,
      amputationSiteData,
      diseaseTypeData,
      monthlyTrend,
      collectionRate: allTimeRevenue > 0 ? ((allTimePaid / allTimeRevenue) * 100).toFixed(1) : '0',
    };
  }, [filteredPatients, branches]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            النظام الإحصائي
          </h1>
          <p className="text-muted-foreground mt-1">تحليل شامل لبيانات المرضى والفروع</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Branch filter - only visible to admin users */}
          {isAdmin && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]" data-testid="select-branch-filter">
                <Building2 className="w-4 h-4 ml-2" />
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفروع</SelectItem>
                {branches?.map(branch => (
                  <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Show current branch name for non-admin users */}
          {!isAdmin && branchSession && (
            <Badge variant="outline" className="h-9 px-4 flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4" />
              {branchSession.branchName}
            </Badge>
          )}

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]" data-testid="select-time-range">
              <Calendar className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الوقت</SelectItem>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
              <SelectItem value="year">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!stats ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد بيانات</h3>
            <p className="text-muted-foreground">لا توجد بيانات متاحة للفترة والفرع المحددين</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">إجمالي المرضى</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-700">{stats.totalPatients}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">إجمالي الإيرادات</p>
                    <p className="text-xl md:text-2xl font-bold text-green-700">{stats.allTimeRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">د.ع</p>
                  </div>
                  <Banknote className="w-10 h-10 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">نسبة التحصيل</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-700">{stats.collectionRate}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">إجمالي الزيارات</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-700">{stats.totalVisits}</p>
                  </div>
                  <Activity className="w-10 h-10 text-orange-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Accessibility className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">حالات البتر</p>
                    <p className="text-2xl font-bold">{stats.amputeeCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.amputeeCount / stats.totalPatients) * 100).toFixed(1)}% من الإجمالي
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">علاج طبيعي</p>
                    <p className="text-2xl font-bold">{stats.physioCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.physioCount / stats.totalPatients) * 100).toFixed(1)}% من الإجمالي
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مساند طبية</p>
                    <p className="text-2xl font-bold">{stats.medicalSupportCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.medicalSupportCount / stats.totalPatients) * 100).toFixed(1)}% من الإجمالي
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  التوزيع العمري للمرضى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.ageDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={50} />
                    <Tooltip formatter={(value) => [value, 'عدد المرضى']} />
                    <Bar dataKey="count" fill="#0088FE" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Condition Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  توزيع الحالات الطبية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.conditionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.conditionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'عدد المرضى']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  حالة المدفوعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'المحصّل', value: stats.allTimePaid, color: '#00C49F' },
                        { name: 'المتبقي', value: stats.allTimeRemaining, color: '#FF8042' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FF8042" />
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} د.ع`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Branch Distribution - only visible to admin users */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    توزيع المرضى حسب الفروع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.branchDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'count' ? 'عدد المرضى' : 'الإيرادات']} />
                      <Legend />
                      <Bar dataKey="count" name="عدد المرضى" fill="#0088FE" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Monthly Trend */}
          {stats.monthlyTrend.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  اتجاه التسجيل الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="patients" name="المرضى الجدد" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                    <Area yAxisId="left" type="monotone" dataKey="visits" name="الزيارات" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Amputation Sites */}
            {stats.amputationSiteData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Accessibility className="w-5 h-5 text-primary" />
                    أنواع البتر الأكثر شيوعاً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.amputationSiteData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-slate-400 w-6">{index + 1}.</span>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(item.value / stats.amputationSiteData[0].value) * 100}%` }}
                            />
                          </div>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disease Types */}
            {stats.diseaseTypeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    أنواع الأمراض الأكثر شيوعاً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.diseaseTypeData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-slate-400 w-6">{index + 1}.</span>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(item.value / stats.diseaseTypeData[0].value) * 100}%` }}
                            />
                          </div>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                الملخص المالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-600 mb-1">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-700">{stats.allTimeRevenue.toLocaleString()} د.ع</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">المبالغ المحصلة</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.allTimePaid.toLocaleString()} د.ع</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-600 mb-1">المبالغ المتبقية</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.allTimeRemaining.toLocaleString()} د.ع</p>
                </div>
              </div>

              {/* Revenue by Branch - only visible to admin users */}
              {isAdmin && selectedBranch === "all" && stats.branchDistribution.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">الإيرادات حسب الفرع</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.branchDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} د.ع`, 'الإيرادات']} />
                      <Bar dataKey="revenue" name="الإيرادات" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
