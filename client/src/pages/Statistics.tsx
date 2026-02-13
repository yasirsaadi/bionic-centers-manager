import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  BarChart3, Users, TrendingUp, Building2, Calendar, Banknote, 
  Activity, UserCheck, Heart, Accessibility, Stethoscope, FileDown, FileSpreadsheet,
  Plus, Pencil, Trash2, ChartBar, Globe, Lock
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatDateIraq, formatDateIraqShort } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import type { Branch, Patient, Visit, Payment, CustomStat } from "@shared/schema";
import { useBranchSession } from "@/components/BranchGate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { AmiriRegular } from "@/lib/amiri-font";
import ArabicReshaper from "arabic-reshaper";

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

interface TreatmentRevenue {
  treatmentType: string;
  totalAmount: number;
  count: number;
}

const TREATMENT_COLORS: Record<string, string> = {
  "روبوت": "#0088FE",
  "تمارين تأهيلية": "#00C49F",
  "أجهزة علاج طبيعي": "#FFBB28",
  "غير محدد": "#8884d8",
};

function RevenueByTreatmentChart({ selectedBranch }: { selectedBranch: string }) {
  const { data: revenueByTreatment = [] } = useQuery<TreatmentRevenue[]>({
    queryKey: ["/api/statistics/revenue-by-treatment", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      const res = await fetch(`/api/statistics/revenue-by-treatment?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (!revenueByTreatment.length) return null;

  const chartData = revenueByTreatment.map((item) => ({
    name: item.treatmentType,
    value: item.totalAmount,
    count: item.count,
    color: TREATMENT_COLORS[item.treatmentType] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="text-revenue-by-treatment-title">
          <Banknote className="w-5 h-5 text-primary" />
          الإيرادات حسب نوع العلاج
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} د.ع`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 flex flex-col justify-center">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between" data-testid={`text-treatment-revenue-${item.name}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold">{item.value.toLocaleString()} د.ع</span>
                  <span className="text-xs text-muted-foreground mr-2">({item.count} دفعة)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const queryClient = useQueryClient();

  // Custom Stats
  const [showCustomStatDialog, setShowCustomStatDialog] = useState(false);
  const [editingCustomStat, setEditingCustomStat] = useState<CustomStat | null>(null);
  const [customStatForm, setCustomStatForm] = useState({
    name: "",
    description: "",
    statType: "count",
    category: "patients",
    filterField: "",
    filterValue: "",
    isGlobal: false,
    branchId: null as number | null,
  });

  const { data: customStats } = useQuery<CustomStat[]>({
    queryKey: ["/api/custom-stats"],
  });

  const createCustomStatMutation = useMutation({
    mutationFn: async (data: typeof customStatForm) => {
      return await apiRequest("POST", "/api/custom-stats", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-stats"] });
      setShowCustomStatDialog(false);
      resetCustomStatForm();
    },
  });

  const updateCustomStatMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof customStatForm }) => {
      return await apiRequest("PUT", `/api/custom-stats/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-stats"] });
      setShowCustomStatDialog(false);
      setEditingCustomStat(null);
      resetCustomStatForm();
    },
  });

  const deleteCustomStatMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/custom-stats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-stats"] });
    },
  });

  const resetCustomStatForm = () => {
    setCustomStatForm({
      name: "",
      description: "",
      statType: "count",
      category: "patients",
      filterField: "",
      filterValue: "",
      isGlobal: false,
      branchId: null,
    });
  };

  const openEditDialog = (stat: CustomStat) => {
    setEditingCustomStat(stat);
    setCustomStatForm({
      name: stat.name,
      description: stat.description || "",
      statType: stat.statType,
      category: stat.category,
      filterField: stat.filterField || "",
      filterValue: stat.filterValue || "",
      isGlobal: stat.isGlobal || false,
      branchId: stat.branchId,
    });
    setShowCustomStatDialog(true);
  };

  const handleSaveCustomStat = () => {
    if (editingCustomStat) {
      updateCustomStatMutation.mutate({ id: editingCustomStat.id, data: customStatForm });
    } else {
      createCustomStatMutation.mutate(customStatForm);
    }
  };

  const FILTER_FIELDS = [
    { value: "", label: "بدون تصفية" },
    { value: "isAmputee", label: "مريض بتر" },
    { value: "isPhysiotherapy", label: "مريض علاج طبيعي" },
    { value: "isMedicalSupport", label: "مساند طبية" },
    { value: "medicalCondition", label: "الحالة الطبية" },
    { value: "amputationSite", label: "موقع البتر" },
    { value: "diseaseType", label: "نوع المرض" },
  ];

  const STAT_TYPES = [
    { value: "count", label: "عدد" },
    { value: "sum", label: "مجموع" },
    { value: "percentage", label: "نسبة مئوية" },
    { value: "average", label: "متوسط" },
  ];

  const CATEGORIES = [
    { value: "patients", label: "المرضى" },
    { value: "payments", label: "المدفوعات" },
    { value: "visits", label: "الزيارات" },
  ];

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

  // Calculate custom stat values - moved after filteredPatients definition
  const calculateCustomStatValue = useCallback((stat: CustomStat): { value: number; label: string } => {
    let patients = filteredPatients;
    
    // For branch-specific stats, filter by that branch
    if (stat.branchId && !stat.isGlobal) {
      patients = allPatients?.filter(p => p.branchId === stat.branchId) || [];
    }
    
    // Apply filter if specified
    if (stat.filterField && stat.filterValue) {
      patients = patients.filter((p: any) => {
        const fieldValue = p[stat.filterField!];
        if (typeof fieldValue === "boolean") {
          return fieldValue === (stat.filterValue === "true");
        }
        return String(fieldValue) === stat.filterValue;
      });
    }
    
    let value = 0;
    let label = "";
    const totalPatients = filteredPatients.length;
    
    switch (stat.statType) {
      case "count":
        value = patients.length;
        label = `${value} مريض`;
        break;
      case "sum":
        if (stat.category === "payments") {
          value = patients.reduce((sum, p) => {
            const patientPayments = p.payments?.reduce((pSum, pay) => pSum + (pay.amount || 0), 0) || 0;
            return sum + patientPayments;
          }, 0);
          label = `${value.toLocaleString()} د.ع`;
        } else {
          value = patients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
          label = `${value.toLocaleString()} د.ع`;
        }
        break;
      case "percentage":
        value = totalPatients > 0 ? Math.round((patients.length / totalPatients) * 100) : 0;
        label = `${value}%`;
        break;
      case "average":
        if (patients.length > 0) {
          const total = patients.reduce((sum, p) => sum + (p.age || 0), 0);
          value = Math.round(total / patients.length);
          label = `${value} سنة`;
        } else {
          label = "غير متوفر";
        }
        break;
    }
    
    return { value, label };
  }, [filteredPatients, allPatients]);

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
        month: formatDateIraqShort(month + '-01'),
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

  // Get current branch name for reports
  const currentBranchName = useMemo(() => {
    if (selectedBranch === "all") return "جميع الفروع";
    return branches?.find(b => b.id === Number(selectedBranch))?.name || branchSession?.branchName || "";
  }, [selectedBranch, branches, branchSession]);

  // Get time range label for reports
  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "week": return "آخر أسبوع";
      case "month": return "آخر شهر";
      case "quarter": return "آخر 3 أشهر";
      case "year": return "آخر سنة";
      default: return "كل الوقت";
    }
  }, [timeRange]);

  // Helper function to reshape Arabic text for PDF
  const reshapeArabic = (text: string): string => {
    try {
      const shaped = ArabicReshaper.convertArabic(text);
      // Reverse the text for proper RTL display in PDF
      return shaped.split('').reverse().join('');
    } catch {
      return text.split('').reverse().join('');
    }
  };

  // Export to PDF function
  const exportToPDF = useCallback(() => {
    if (!stats) return;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Add Amiri Arabic font
    doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegular);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
    
    // Set RTL direction for Arabic text
    doc.setR2L(true);
    
    // Title
    doc.setFontSize(20);
    doc.text(reshapeArabic("تقرير الإحصائيات"), 105, 20, { align: 'center' });
    
    // Subtitle with branch and date info
    doc.setFontSize(12);
    doc.text(reshapeArabic(`الفرع: ${currentBranchName}`), 105, 30, { align: 'center' });
    doc.text(reshapeArabic(`الفترة: ${timeRangeLabel}`), 105, 37, { align: 'center' });
    doc.text(reshapeArabic(`تاريخ التقرير: ${formatDateIraq(new Date())}`), 105, 44, { align: 'center' });
    
    let yPos = 55;
    
    // Summary Section
    doc.setFontSize(14);
    doc.text(reshapeArabic("ملخص الإحصائيات"), 190, yPos, { align: 'right' });
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [[reshapeArabic('البيان'), reshapeArabic('القيمة')]],
      body: [
        [reshapeArabic('إجمالي المرضى'), stats.totalPatients.toString()],
        [reshapeArabic('مرضى البتر'), stats.amputeeCount.toString()],
        [reshapeArabic('مرضى العلاج الطبيعي'), stats.physioCount.toString()],
        [reshapeArabic('مرضى الدعم الطبي'), stats.medicalSupportCount.toString()],
        [reshapeArabic('إجمالي الإيرادات'), `${stats.allTimeRevenue.toLocaleString()} ${reshapeArabic('د.ع')}`],
        [reshapeArabic('المبالغ المحصلة'), `${stats.allTimePaid.toLocaleString()} ${reshapeArabic('د.ع')}`],
        [reshapeArabic('المبالغ المتبقية'), `${stats.allTimeRemaining.toLocaleString()} ${reshapeArabic('د.ع')}`],
        [reshapeArabic('نسبة التحصيل'), `${stats.collectionRate}%`],
        [reshapeArabic('إجمالي الزيارات (في الفترة)'), stats.totalVisits.toString()],
      ],
      styles: { font: 'Amiri', halign: 'right' },
      headStyles: { fillColor: [41, 128, 185], font: 'Amiri', textColor: [255, 255, 255] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Age Distribution
    if (stats.ageDistribution.length > 0) {
      doc.setFontSize(14);
      doc.text(reshapeArabic("توزيع الأعمار"), 190, yPos, { align: 'right' });
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic('الفئة العمرية'), reshapeArabic('العدد')]],
        body: stats.ageDistribution.map(item => [reshapeArabic(item.name), item.count.toString()]),
        styles: { font: 'Amiri', halign: 'right' },
        headStyles: { fillColor: [52, 152, 219], font: 'Amiri', textColor: [255, 255, 255] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      doc.setFont('Amiri');
      yPos = 20;
    }
    
    // Condition Distribution
    if (stats.conditionDistribution.length > 0) {
      doc.setFontSize(14);
      doc.text(reshapeArabic("توزيع الحالات الطبية"), 190, yPos, { align: 'right' });
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic('الحالة'), reshapeArabic('العدد')]],
        body: stats.conditionDistribution.map(item => [reshapeArabic(item.name), item.value.toString()]),
        styles: { font: 'Amiri', halign: 'right' },
        headStyles: { fillColor: [46, 204, 113], font: 'Amiri', textColor: [255, 255, 255] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Branch Distribution (admin only)
    if (isAdmin && stats.branchDistribution.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        doc.setFont('Amiri');
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(reshapeArabic("توزيع المرضى حسب الفروع"), 190, yPos, { align: 'right' });
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic('الفرع'), reshapeArabic('عدد المرضى'), reshapeArabic('الإيرادات')]],
        body: stats.branchDistribution.map(item => [
          reshapeArabic(item.name), 
          item.count.toString(),
          `${item.revenue.toLocaleString()} ${reshapeArabic('د.ع')}`
        ]),
        styles: { font: 'Amiri', halign: 'right' },
        headStyles: { fillColor: [155, 89, 182], font: 'Amiri', textColor: [255, 255, 255] },
      });
    }
    
    // Save the PDF
    const fileName = `تقرير_الإحصائيات_${currentBranchName}_${formatDateIraq(new Date()).replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }, [stats, currentBranchName, timeRangeLabel, isAdmin]);

  // Export to Excel function
  const exportToExcel = useCallback(() => {
    if (!stats) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ['تقرير الإحصائيات'],
      ['الفرع', currentBranchName],
      ['الفترة', timeRangeLabel],
      ['تاريخ التقرير', formatDateIraq(new Date())],
      [],
      ['ملخص الإحصائيات'],
      ['البيان', 'القيمة'],
      ['إجمالي المرضى', stats.totalPatients],
      ['مرضى البتر', stats.amputeeCount],
      ['مرضى العلاج الطبيعي', stats.physioCount],
      ['مرضى الدعم الطبي', stats.medicalSupportCount],
      ['إجمالي الإيرادات (د.ع)', stats.allTimeRevenue],
      ['المبالغ المحصلة (د.ع)', stats.allTimePaid],
      ['المبالغ المتبقية (د.ع)', stats.allTimeRemaining],
      ['نسبة التحصيل (%)', stats.collectionRate],
      ['إجمالي الزيارات (في الفترة)', stats.totalVisits],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');
    
    // Age Distribution Sheet
    if (stats.ageDistribution.length > 0) {
      const ageData = [
        ['توزيع الأعمار'],
        ['الفئة العمرية', 'العدد'],
        ...stats.ageDistribution.map(item => [item.name, item.count])
      ];
      const ageSheet = XLSX.utils.aoa_to_sheet(ageData);
      XLSX.utils.book_append_sheet(workbook, ageSheet, 'توزيع الأعمار');
    }
    
    // Condition Distribution Sheet
    if (stats.conditionDistribution.length > 0) {
      const conditionData = [
        ['توزيع الحالات الطبية'],
        ['الحالة', 'العدد'],
        ...stats.conditionDistribution.map(item => [item.name, item.value])
      ];
      const conditionSheet = XLSX.utils.aoa_to_sheet(conditionData);
      XLSX.utils.book_append_sheet(workbook, conditionSheet, 'الحالات الطبية');
    }
    
    // Amputation Sites Sheet
    if (stats.amputationSiteData.length > 0) {
      const amputationData = [
        ['مواقع البتر'],
        ['الموقع', 'العدد'],
        ...stats.amputationSiteData.map(item => [item.name, item.value])
      ];
      const amputationSheet = XLSX.utils.aoa_to_sheet(amputationData);
      XLSX.utils.book_append_sheet(workbook, amputationSheet, 'مواقع البتر');
    }
    
    // Disease Types Sheet
    if (stats.diseaseTypeData.length > 0) {
      const diseaseData = [
        ['أنواع الأمراض'],
        ['النوع', 'العدد'],
        ...stats.diseaseTypeData.map(item => [item.name, item.value])
      ];
      const diseaseSheet = XLSX.utils.aoa_to_sheet(diseaseData);
      XLSX.utils.book_append_sheet(workbook, diseaseSheet, 'أنواع الأمراض');
    }
    
    // Branch Distribution Sheet (admin only)
    if (isAdmin && stats.branchDistribution.length > 0) {
      const branchData = [
        ['توزيع المرضى حسب الفروع'],
        ['الفرع', 'عدد المرضى', 'الإيرادات (د.ع)'],
        ...stats.branchDistribution.map(item => [item.name, item.count, item.revenue])
      ];
      const branchSheet = XLSX.utils.aoa_to_sheet(branchData);
      XLSX.utils.book_append_sheet(workbook, branchSheet, 'توزيع الفروع');
    }
    
    // Monthly Trend Sheet
    if (stats.monthlyTrend.length > 0) {
      const trendData = [
        ['الاتجاهات الشهرية'],
        ['الشهر', 'عدد المرضى', 'عدد الزيارات'],
        ...stats.monthlyTrend.map(item => [item.month, item.patients, item.visits])
      ];
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'الاتجاهات الشهرية');
    }
    
    // Save the Excel file
    const fileName = `تقرير_الإحصائيات_${currentBranchName}_${formatDateIraq(new Date()).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [stats, currentBranchName, timeRangeLabel, isAdmin]);

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

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToPDF}
              disabled={!stats}
              className="gap-2"
              data-testid="button-export-pdf"
            >
              <FileDown className="w-4 h-4" />
              تصدير PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={!stats}
              className="gap-2"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير Excel
            </Button>
          </div>
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

          {/* Revenue by Treatment Type */}
          <RevenueByTreatmentChart selectedBranch={selectedBranch} />

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

          {/* Custom Statistics Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartBar className="w-5 h-5 text-primary" />
                الإحصائيات المخصصة
              </CardTitle>
              <Dialog open={showCustomStatDialog} onOpenChange={(open) => {
                setShowCustomStatDialog(open);
                if (!open) {
                  setEditingCustomStat(null);
                  resetCustomStatForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-custom-stat">
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة حقل إحصائي
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomStat ? "تعديل حقل إحصائي" : "إضافة حقل إحصائي جديد"}
                    </DialogTitle>
                    <DialogDescription>
                      أنشئ حقول إحصائية مخصصة لتتبع مقاييس محددة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="stat-name">اسم الحقل</Label>
                      <Input
                        id="stat-name"
                        value={customStatForm.name}
                        onChange={(e) => setCustomStatForm({ ...customStatForm, name: e.target.value })}
                        placeholder="مثال: عدد مرضى البتر"
                        data-testid="input-custom-stat-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stat-description">الوصف (اختياري)</Label>
                      <Textarea
                        id="stat-description"
                        value={customStatForm.description}
                        onChange={(e) => setCustomStatForm({ ...customStatForm, description: e.target.value })}
                        placeholder="وصف مختصر للحقل الإحصائي"
                        data-testid="input-custom-stat-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>نوع الإحصاء</Label>
                        <Select
                          value={customStatForm.statType}
                          onValueChange={(value) => setCustomStatForm({ ...customStatForm, statType: value })}
                        >
                          <SelectTrigger data-testid="select-stat-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>الفئة</Label>
                        <Select
                          value={customStatForm.category}
                          onValueChange={(value) => setCustomStatForm({ ...customStatForm, category: value })}
                        >
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>التصفية حسب</Label>
                      <Select
                        value={customStatForm.filterField}
                        onValueChange={(value) => setCustomStatForm({ ...customStatForm, filterField: value })}
                      >
                        <SelectTrigger data-testid="select-filter-field">
                          <SelectValue placeholder="اختر حقل التصفية" />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value || "none"}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {customStatForm.filterField && customStatForm.filterField !== "none" && (
                      <div className="grid gap-2">
                        <Label>قيمة التصفية</Label>
                        {["isAmputee", "isPhysiotherapy", "isMedicalSupport"].includes(customStatForm.filterField) ? (
                          <Select
                            value={customStatForm.filterValue}
                            onValueChange={(value) => setCustomStatForm({ ...customStatForm, filterValue: value })}
                          >
                            <SelectTrigger data-testid="select-filter-value">
                              <SelectValue placeholder="اختر القيمة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">نعم</SelectItem>
                              <SelectItem value="false">لا</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={customStatForm.filterValue}
                            onChange={(e) => setCustomStatForm({ ...customStatForm, filterValue: e.target.value })}
                            placeholder="أدخل قيمة التصفية"
                            data-testid="input-filter-value"
                          />
                        )}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Switch
                          id="is-global"
                          checked={customStatForm.isGlobal}
                          onCheckedChange={(checked) => setCustomStatForm({ ...customStatForm, isGlobal: checked })}
                          data-testid="switch-is-global"
                        />
                        <Label htmlFor="is-global" className="flex items-center gap-2 cursor-pointer">
                          {customStatForm.isGlobal ? (
                            <>
                              <Globe className="w-4 h-4 text-blue-500" />
                              <span>حقل عام (مرئي لجميع الفروع)</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-orange-500" />
                              <span>حقل خاص بالفرع</span>
                            </>
                          )}
                        </Label>
                      </div>
                    )}
                    {isAdmin && !customStatForm.isGlobal && (
                      <div className="grid gap-2">
                        <Label>الفرع</Label>
                        <Select
                          value={customStatForm.branchId?.toString() || ""}
                          onValueChange={(value) => setCustomStatForm({ ...customStatForm, branchId: value ? Number(value) : null })}
                        >
                          <SelectTrigger data-testid="select-branch">
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
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCustomStatDialog(false);
                        setEditingCustomStat(null);
                        resetCustomStatForm();
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleSaveCustomStat}
                      disabled={!customStatForm.name || createCustomStatMutation.isPending || updateCustomStatMutation.isPending}
                      data-testid="button-save-custom-stat"
                    >
                      {createCustomStatMutation.isPending || updateCustomStatMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {customStats && customStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customStats.map((stat) => {
                    const { value, label } = calculateCustomStatValue(stat);
                    const branchName = branches?.find(b => b.id === stat.branchId)?.name;
                    return (
                      <div
                        key={stat.id}
                        className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 relative group"
                        data-testid={`custom-stat-${stat.id}`}
                      >
                        <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(stat)}
                            data-testid={`button-edit-stat-${stat.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا الحقل الإحصائي؟")) {
                                deleteCustomStatMutation.mutate(stat.id);
                              }
                            }}
                            data-testid={`button-delete-stat-${stat.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {stat.isGlobal ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                              <Globe className="w-3 h-3 ml-1" />
                              عام
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200">
                              <Lock className="w-3 h-3 ml-1" />
                              {branchName || "خاص"}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {STAT_TYPES.find(t => t.value === stat.statType)?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-purple-600 mb-1">{stat.name}</p>
                        <p className="text-2xl font-bold text-purple-800">{label}</p>
                        {stat.description && (
                          <p className="text-xs text-slate-500 mt-2">{stat.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <ChartBar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد حقول إحصائية مخصصة</p>
                  <p className="text-sm mt-1">أضف حقولاً لتتبع مقاييس محددة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
