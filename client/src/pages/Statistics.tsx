import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerIraq } from "@/components/DatePickerIraq";
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
  BarChart3, Users, UserPlus, TrendingUp, Building2, Calendar, Banknote, 
  Activity, UserCheck, Heart, Accessibility, Stethoscope, FileDown, FileSpreadsheet,
  Plus, Pencil, Trash2, ChartBar, Globe, Lock, ClipboardCheck
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatDateIraq, formatDateIraqShort, getTodayIraq } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import type { Branch, Patient, Visit, Payment, CustomStat, SurveyResponse, SurveyTemplate } from "@shared/schema";
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

const TREATMENT_COLORS: Record<string, string> = {
  "روبوت": "#0088FE",
  "تمارين تأهيلية": "#00C49F",
  "أجهزة علاج طبيعي": "#FFBB28",
  "أبر صينية": "#FF8042",
  "استشارة طبية": "#82ca9d",
  "غير محدد": "#8884d8",
};

export default function Statistics() {
  const { t } = useTranslation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin ?? false;
  
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIraq());
  const [dateFrom, setDateFrom] = useState<string>(getTodayIraq());
  const [dateTo, setDateTo] = useState<string>(getTodayIraq());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return `${monday.getFullYear()}-W${String(Math.ceil((((monday.getTime() - new Date(monday.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(monday.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${q}`;
  });
  const [selectedHalf, setSelectedHalf] = useState<string>(() => {
    const now = new Date();
    const h = now.getMonth() < 6 ? 1 : 2;
    return `${now.getFullYear()}-H${h}`;
  });

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

  const { data: surveyResponses } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses", selectedBranch],
    queryFn: async () => {
      const branchParam = selectedBranch !== "all" ? `?branchId=${selectedBranch}` : "";
      const res = await fetch(`/api/survey-responses${branchParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: surveyTemplates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
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
    { value: "", label: t.statistics.noFilter },
    { value: "isAmputee", label: t.statistics.filterAmputee },
    { value: "isPhysiotherapy", label: t.statistics.filterPhysio },
    { value: "isMedicalSupport", label: t.statistics.filterMedSupport },
    { value: "medicalCondition", label: t.statistics.filterCondition },
    { value: "amputationSite", label: t.statistics.filterAmputationSite },
    { value: "diseaseType", label: t.statistics.filterDiseaseType },
  ];

  const STAT_TYPES = [
    { value: "count", label: t.statistics.typeCount },
    { value: "sum", label: t.statistics.typeSum },
    { value: "percentage", label: t.statistics.typePercentage },
    { value: "average", label: t.statistics.typeAverage },
  ];

  const CATEGORIES = [
    { value: "patients", label: t.statistics.catPatients },
    { value: "payments", label: t.statistics.catPayments },
    { value: "visits", label: t.statistics.catVisits },
  ];

  const getDateRange = (range: string): { start: Date | null; end: Date | null } => {
    if (range === "all") return { start: null, end: null };
    
    if (range === "today" || range === "date") {
      const dateStr = range === "today" ? getTodayIraq() : selectedDate;
      const dayStart = new Date(dateStr + "T00:00:00");
      const dayEnd = new Date(dateStr + "T23:59:59.999");
      return { start: dayStart, end: dayEnd };
    }

    if (range === "range") {
      const start = new Date(dateFrom + "T00:00:00");
      const end = new Date(dateTo + "T23:59:59.999");
      return { start, end };
    }

    if (range === "specificMonth") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (range === "specificWeek") {
      const match = selectedWeek.match(/^(\d{4})-W(\d{2})$/);
      if (match) {
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        const jan1 = new Date(year, 0, 1);
        const days = (week - 1) * 7;
        const dayOfWeek = jan1.getDay();
        const offset = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
        const monday = new Date(year, 0, 1 + offset + days);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        monday.setHours(0, 0, 0, 0);
        sunday.setHours(23, 59, 59, 999);
        return { start: monday, end: sunday };
      }
      return { start: null, end: null };
    }

    if (range === "specificYear") {
      const year = parseInt(selectedYear);
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }

    if (range === "quarterYear") {
      const match = selectedQuarter.match(/^(\d{4})-Q(\d)$/);
      if (match) {
        const year = parseInt(match[1]);
        const q = parseInt(match[2]);
        const startMonth = (q - 1) * 3;
        const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
        const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
        return { start, end };
      }
      return { start: null, end: null };
    }

    if (range === "halfYear") {
      const match = selectedHalf.match(/^(\d{4})-H(\d)$/);
      if (match) {
        const year = parseInt(match[1]);
        const h = parseInt(match[2]);
        const startMonth = (h - 1) * 6;
        const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
        const end = new Date(year, startMonth + 6, 0, 23, 59, 59, 999);
        return { start, end };
      }
      return { start: null, end: null };
    }

    return { start: null, end: null };
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
        label = `${value} ${t.statistics.patientUnit}`;
        break;
      case "sum":
        if (stat.category === "payments") {
          value = patients.reduce((sum, p) => {
            const patientPayments = p.payments?.reduce((pSum, pay) => pSum + (pay.amount || 0), 0) || 0;
            return sum + patientPayments;
          }, 0);
          label = `${value.toLocaleString()} ${t.statistics.currency}`;
        } else {
          value = patients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
          label = `${value.toLocaleString()} ${t.statistics.currency}`;
        }
        break;
      case "percentage":
        value = totalPatients > 0 ? Math.round((patients.length / totalPatients) * 100) : 0;
        label = `${value}%`;
        break;
      case "average":
        if (patients.length > 0) {
          const total = patients.reduce((sum, p) => sum + Number(p.age || 0), 0);
          value = Math.round(total / patients.length);
          label = `${value} ${t.statistics.yearUnit}`;
        } else {
          label = t.statistics.notAvailable;
        }
        break;
    }
    
    return { value, label };
  }, [filteredPatients, allPatients]);

  const stats = useMemo(() => {
    if (!filteredPatients.length) return null;

    const { start: startDate, end: endDate } = getDateRange(timeRange);

    const isInRange = (dateVal: string | Date | null | undefined) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    };

    // Calculate visits filtered by visit date (from all patients in branch)
    const allVisitsInRange = filteredPatients.flatMap(p => 
      (p.visits || []).filter(v => !startDate || isInRange(v.visitDate))
    );
    const totalVisits = allVisitsInRange.length;

    const newClassifiedPatients = filteredPatients.filter(p => 
      p.patientClassification === 'new' && (!startDate || isInRange(p.createdAt))
    );

    const timeFilteredPatients = startDate 
      ? filteredPatients.filter(p => 
          isInRange(p.createdAt) || 
          (p.visits || []).some(v => isInRange(v.visitDate)) ||
          (p.payments || []).some(pay => isInRange(pay.date))
        )
      : filteredPatients;

    const newPaidPatients = newClassifiedPatients.filter(p =>
      (p.totalCost || 0) > 0
    ).length;

    const totalPatients = timeFilteredPatients.length;
    const totalNewPatients = newClassifiedPatients.length;
    const amputeeCount = timeFilteredPatients.filter(p => p.isAmputee).length;
    const physioCount = timeFilteredPatients.filter(p => !p.isAmputee && !p.isMedicalSupport).length;
    const medicalSupportCount = timeFilteredPatients.filter(p => p.isMedicalSupport).length;
    const newAmputeeCount = newClassifiedPatients.filter(p => p.isAmputee).length;
    const newPhysioCount = newClassifiedPatients.filter(p => !p.isAmputee && !p.isMedicalSupport).length;
    const newMedicalSupportCount = newClassifiedPatients.filter(p => p.isMedicalSupport).length;

    // Calculate payments filtered by payment date (from all patients in branch)
    const allPaymentsInRange = filteredPatients.flatMap(p => 
      (p.payments || []).filter(pay => !startDate || isInRange(pay.date))
    );
    const totalPaid = allPaymentsInRange.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    // Time-filtered financial totals
    const timeFilteredRevenue = timeFilteredPatients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const timeFilteredPaidFromPayments = allPaymentsInRange.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    
    // All-time financial totals (branch-filtered only, no time filter)
    const allTimeRevenue = filteredPatients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const allTimePaid = filteredPatients.reduce((sum, p) => {
      const patientPayments = p.payments?.reduce((pSum, payment) => pSum + (payment.amount || 0), 0) || 0;
      return sum + patientPayments;
    }, 0);
    const allTimeRemaining = allTimeRevenue - allTimePaid;
    const timeFilteredRemaining = timeFilteredRevenue - timeFilteredPaidFromPayments;

    const ageDistribution = AGE_GROUPS.map(group => ({
      name: group.label,
      count: timeFilteredPatients.filter(p => Number(p.age || 0) >= group.min && Number(p.age || 0) <= group.max).length,
    }));

    const conditionDistribution = [
      { name: t.statistics.condAmputee, value: amputeeCount, color: '#0088FE' },
      { name: t.statistics.condPhysiotherapy, value: physioCount, color: '#00C49F' },
      { name: t.statistics.condMedicalSupport, value: medicalSupportCount, color: '#FFBB28' },
    ];

    const classificationNewCount = timeFilteredPatients.filter(p => p.patientClassification === "new").length;
    const classificationPastCount = timeFilteredPatients.filter(p => p.patientClassification === "past").length;
    const classificationUnsetCount = timeFilteredPatients.filter(p => !p.patientClassification).length;
    const classificationDistribution = [
      { name: t.patientForm.newPatient, value: classificationNewCount, color: '#10b981' },
      { name: t.patientForm.pastPatient, value: classificationPastCount, color: '#f59e0b' },
      { name: t.statistics.notSpecified, value: classificationUnsetCount, color: '#94a3b8' },
    ].filter(item => item.value > 0);

    const branchDistribution = branches?.map(branch => ({
      name: branch.name,
      count: timeFilteredPatients.filter(p => p.branchId === branch.id).length,
      revenue: timeFilteredPatients
        .filter(p => p.branchId === branch.id)
        .reduce((sum, p) => sum + (p.totalCost || 0), 0),
    })) || [];

    const amputationSites: { [key: string]: number } = {};
    timeFilteredPatients.filter(p => p.isAmputee && p.amputationSite).forEach(p => {
      const site = p.amputationSite || t.statistics.unspecified;
      amputationSites[site] = (amputationSites[site] || 0) + 1;
    });
    const amputationSiteData = Object.entries(amputationSites)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const diseaseTypes: { [key: string]: number } = {};
    timeFilteredPatients.filter(p => !p.isAmputee && !p.isMedicalSupport && p.diseaseType).forEach(p => {
      const type = p.diseaseType || t.statistics.unspecified;
      diseaseTypes[type] = (diseaseTypes[type] || 0) + 1;
    });
    const diseaseTypeData = Object.entries(diseaseTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const referralSources: { [key: string]: number } = {};
    timeFilteredPatients.forEach(p => {
      const source = (p.referralSource && p.referralSource.trim()) ? p.referralSource.trim() : t.statistics.unspecified;
      referralSources[source] = (referralSources[source] || 0) + 1;
    });
    const referralSourceData = Object.entries(referralSources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const visitsByTreatmentMap: Record<string, number> = {};
    allVisitsInRange.forEach((v: any) => {
      const type = v.treatmentType || 'غير محدد';
      visitsByTreatmentMap[type] = (visitsByTreatmentMap[type] || 0) + 1;
    });
    const visitsByTreatmentData = Object.entries(visitsByTreatmentMap)
      .map(([name, value]) => ({ name, value, color: TREATMENT_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value);

    const revenueByTreatmentMap: Record<string, { amount: number; count: number }> = {};
    allPaymentsInRange.forEach((pay: any) => {
      const type = pay.paymentTreatmentType || 'غير محدد';
      if (!revenueByTreatmentMap[type]) revenueByTreatmentMap[type] = { amount: 0, count: 0 };
      revenueByTreatmentMap[type].amount += (pay.amount || 0);
      revenueByTreatmentMap[type].count += 1;
    });
    const revenueByTreatmentData = Object.entries(revenueByTreatmentMap)
      .map(([name, data]) => ({ name, value: data.amount, count: data.count, color: TREATMENT_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value);

    // Monthly trend: using time-filtered data
    const monthlyData: { [key: string]: { patients: number; payments: number; visits: number } } = {};
    
    timeFilteredPatients.forEach(p => {
      const date = new Date(p.createdAt || "");
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
      }
      monthlyData[monthKey].patients += 1;
    });
    
    allVisitsInRange.forEach((v: any) => {
      const date = new Date(v.visitDate || "");
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
      }
      monthlyData[monthKey].visits += 1;
    });
    
    allPaymentsInRange.forEach((pay: any) => {
      const date = new Date(pay.date || "");
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { patients: 0, payments: 0, visits: 0 };
      }
      monthlyData[monthKey].payments += (pay.amount || 0);
    });
    
    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatDateIraqShort(month + '-01'),
        ...data,
      }));

    const monthlyPaymentData: { [key: string]: { collected: number; totalCost: number } } = {};
    filteredPatients.forEach(p => {
      const payments = p.payments || [];
      const patientCost = p.totalCost || 0;
      
      if (startDate) {
        const paymentsInRange = payments.filter(pay => isInRange(pay.date));
        paymentsInRange.forEach(pay => {
          const date = new Date(pay.date || "");
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyPaymentData[monthKey]) {
            monthlyPaymentData[monthKey] = { collected: 0, totalCost: 0 };
          }
          monthlyPaymentData[monthKey].collected += (pay.amount || 0);
        });
        if (patientCost > 0) {
          const pDate = new Date(p.createdAt || "");
          if (isInRange(p.createdAt)) {
            const mk = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyPaymentData[mk]) {
              monthlyPaymentData[mk] = { collected: 0, totalCost: 0 };
            }
            monthlyPaymentData[mk].totalCost += patientCost;
          }
        }
      } else {
        payments.forEach(pay => {
          const date = new Date(pay.date || "");
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyPaymentData[monthKey]) {
            monthlyPaymentData[monthKey] = { collected: 0, totalCost: 0 };
          }
          monthlyPaymentData[monthKey].collected += (pay.amount || 0);
        });
        if (patientCost > 0) {
          const pDate = new Date(p.createdAt || "");
          const mk = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyPaymentData[mk]) {
            monthlyPaymentData[mk] = { collected: 0, totalCost: 0 };
          }
          monthlyPaymentData[mk].totalCost += patientCost;
        }
      }
    });
    const monthlyPaymentTrend = Object.entries(monthlyPaymentData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatDateIraqShort(month + '-01'),
        collected: data.collected,
        remaining: Math.max(0, data.totalCost - data.collected),
        total: data.totalCost,
      }));

    const shiftDistribution = { morning: 0, evening: 0, unknown: 0 };
    allVisitsInRange.forEach((v: any) => {
      if (v.shift === "morning") shiftDistribution.morning++;
      else if (v.shift === "evening") shiftDistribution.evening++;
      else shiftDistribution.unknown++;
    });
    const shiftData = [
      { name: t.statistics.morningShift, value: shiftDistribution.morning, color: '#0088FE' },
      { name: t.statistics.eveningShift, value: shiftDistribution.evening, color: '#FF8042' },
    ];
    if (shiftDistribution.unknown > 0) {
      shiftData.push({ name: t.statistics.unspecified, value: shiftDistribution.unknown, color: '#8884d8' });
    }

    const displayRevenue = startDate ? timeFilteredRevenue : allTimeRevenue;
    const displayPaid = startDate ? totalPaid : allTimePaid;
    const displayRemaining = startDate ? timeFilteredRemaining : allTimeRemaining;

    return {
      totalPatients,
      totalNewPatients,
      newPaidPatients,
      newAmputeeCount,
      newPhysioCount,
      newMedicalSupportCount,
      amputeeCount,
      physioCount,
      medicalSupportCount,
      allTimeRevenue: displayRevenue,
      allTimePaid: displayPaid,
      allTimeRemaining: displayRemaining,
      totalPaid,
      totalVisits,
      ageDistribution,
      conditionDistribution,
      branchDistribution,
      amputationSiteData,
      diseaseTypeData,
      referralSourceData,
      visitsByTreatmentData,
      revenueByTreatmentData,
      classificationDistribution,
      monthlyTrend,
      monthlyPaymentTrend,
      shiftData,
      collectionRate: displayRevenue > 0 ? ((displayPaid / displayRevenue) * 100).toFixed(1) : '0',
    };
  }, [filteredPatients, branches, timeRange, selectedDate, dateFrom, dateTo, selectedMonth, selectedWeek, selectedYear, selectedQuarter, selectedHalf]);

  const surveyStats = useMemo(() => {
    if (!surveyResponses || surveyResponses.length === 0) return null;
    
    const total = surveyResponses.length;
    const avgSatisfaction = Math.round(surveyResponses.reduce((sum, r) => sum + (r.percentage || 0), 0) / total);
    
    const now = new Date();
    const thisMonth = surveyResponses.filter(r => {
      const d = new Date(r.completedAt || "");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const byBranch = branches?.map(branch => {
      const branchResponses = surveyResponses.filter(r => r.branchId === branch.id);
      const avg = branchResponses.length > 0
        ? Math.round(branchResponses.reduce((s, r) => s + (r.percentage || 0), 0) / branchResponses.length)
        : 0;
      return { name: branch.name, value: avg, count: branchResponses.length };
    }).filter(b => b.count > 0) || [];

    const byTemplate = surveyTemplates?.map((tmpl, i) => {
      const tmplResponses = surveyResponses.filter(r => r.templateId === tmpl.id);
      const avg = tmplResponses.length > 0
        ? Math.round(tmplResponses.reduce((s, r) => s + (r.percentage || 0), 0) / tmplResponses.length)
        : 0;
      return { name: tmpl.name, value: avg, count: tmplResponses.length };
    }).filter(d => d.count > 0) || [];

    return { total, avgSatisfaction, thisMonth, byBranch, byTemplate };
  }, [surveyResponses, branches, surveyTemplates]);

  // Get current branch name for reports
  const currentBranchName = useMemo(() => {
    if (selectedBranch === "all") return t.statistics.allBranches;
    const branchName = branches?.find(b => b.id === Number(selectedBranch))?.name || branchSession?.branchName || "";
    return t.branches[branchName as keyof typeof t.branches] || branchName;
  }, [selectedBranch, branches, branchSession, t]);

  // Get time range label for reports
  const arabicMonthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const englishMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const quarterLabels = ["الربع الأول", "الربع الثاني", "الربع الثالث", "الربع الرابع"];
  const halfLabels = ["النصف الأول", "النصف الثاني"];

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "today": return t.statistics.timeToday;
      case "date": return formatDateIraq(selectedDate);
      case "range": return `${formatDateIraq(dateFrom)} - ${formatDateIraq(dateTo)}`;
      case "specificMonth": {
        const [year, month] = selectedMonth.split("-").map(Number);
        return `${arabicMonthNames[month - 1]} ${year}`;
      }
      case "specificWeek": {
        const match = selectedWeek.match(/^(\d{4})-W(\d{2})$/);
        if (match) {
          const year = parseInt(match[1]);
          const week = parseInt(match[2]);
          return `${t.statistics.specificWeek} ${week} - ${year}`;
        }
        return selectedWeek;
      }
      case "specificYear": return selectedYear;
      case "quarterYear": {
        const match = selectedQuarter.match(/^(\d{4})-Q(\d)$/);
        if (match) return `${quarterLabels[parseInt(match[2]) - 1]} ${match[1]}`;
        return selectedQuarter;
      }
      case "halfYear": {
        const match = selectedHalf.match(/^(\d{4})-H(\d)$/);
        if (match) return `${halfLabels[parseInt(match[2]) - 1]} ${match[1]}`;
        return selectedHalf;
      }
      default: return t.statistics.timeAllTime;
    }
  }, [timeRange, selectedDate, dateFrom, dateTo, selectedMonth, selectedWeek, selectedYear, selectedQuarter, selectedHalf, t]);

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
        [reshapeArabic('مرضى جدد (تصنيف)'), stats.classificationDistribution.find(d => d.name === t.patientForm.newPatient)?.value?.toString() || '0'],
        [reshapeArabic('مرضى قدامى (تصنيف)'), stats.classificationDistribution.find(d => d.name === t.patientForm.pastPatient)?.value?.toString() || '0'],
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
      ['مرضى جدد (تصنيف)', stats.classificationDistribution.find(d => d.name === t.patientForm.newPatient)?.value || 0],
      ['مرضى قدامى (تصنيف)', stats.classificationDistribution.find(d => d.name === t.patientForm.pastPatient)?.value || 0],
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
            {t.statistics.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.statistics.subtitle}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Branch filter - only visible to admin users */}
          {isAdmin && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]" data-testid="select-branch-filter">
                <Building2 className="w-4 h-4 ml-2" />
                <SelectValue placeholder={t.statistics.selectBranch} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.statistics.allBranches}</SelectItem>
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
              {t.branches[branchSession.branchName as keyof typeof t.branches] || branchSession.branchName}
            </Badge>
          )}

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-time-range">
              <Calendar className="w-4 h-4 ml-2" />
              <SelectValue placeholder={t.statistics.timePeriod} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t.statistics.today}</SelectItem>
              <SelectItem value="date">{t.statistics.specificDate}</SelectItem>
              <SelectItem value="specificWeek">{t.statistics.specificWeek}</SelectItem>
              <SelectItem value="specificMonth">{t.statistics.specificMonth}</SelectItem>
              <SelectItem value="specificYear">{t.statistics.specificYear}</SelectItem>
              <SelectItem value="quarterYear">{t.statistics.quarterYear}</SelectItem>
              <SelectItem value="halfYear">{t.statistics.halfYear}</SelectItem>
              <SelectItem value="range">{t.statistics.dateRange}</SelectItem>
              <SelectItem value="all">{t.statistics.allTime}</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === "date" && (
            <DatePickerIraq
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              className="w-[160px]"
              data-testid="input-specific-date"
            />
          )}

          {timeRange === "specificWeek" && (
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-specific-week"
            />
          )}

          {timeRange === "specificMonth" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-specific-month"
            >
              {(() => {
                const now = new Date();
                const options = [];
                for (let i = 0; i < 24; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = `${arabicMonthNames[d.getMonth()]} ${d.getFullYear()}`;
                  options.push(<option key={val} value={val}>{label}</option>);
                }
                return options;
              })()}
            </select>
          )}

          {timeRange === "specificYear" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-specific-year"
            >
              {(() => {
                const now = new Date();
                const options = [];
                for (let i = 0; i < 5; i++) {
                  const y = now.getFullYear() - i;
                  options.push(<option key={y} value={String(y)}>{y}</option>);
                }
                return options;
              })()}
            </select>
          )}

          {timeRange === "quarterYear" && (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-quarter"
            >
              {(() => {
                const now = new Date();
                const options = [];
                for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
                  for (let q = 4; q >= 1; q--) {
                    if (y === now.getFullYear() && q > Math.ceil((now.getMonth() + 1) / 3)) continue;
                    const val = `${y}-Q${q}`;
                    const label = `${quarterLabels[q - 1]} ${y}`;
                    options.push(<option key={val} value={val}>{label}</option>);
                  }
                }
                return options;
              })()}
            </select>
          )}

          {timeRange === "halfYear" && (
            <select
              value={selectedHalf}
              onChange={(e) => setSelectedHalf(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-half"
            >
              {(() => {
                const now = new Date();
                const options = [];
                for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
                  for (let h = 2; h >= 1; h--) {
                    if (y === now.getFullYear() && h === 2 && now.getMonth() < 6) continue;
                    const val = `${y}-H${h}`;
                    const label = `${halfLabels[h - 1]} ${y}`;
                    options.push(<option key={val} value={val}>{label}</option>);
                  }
                }
                return options;
              })()}
            </select>
          )}

          {timeRange === "range" && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">{t.statistics.fromDate}:</span>
                <DatePickerIraq
                  value={dateFrom}
                  onChange={(val) => setDateFrom(val)}
                  className="w-[150px]"
                  data-testid="input-date-from"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">{t.statistics.toDate}:</span>
                <DatePickerIraq
                  value={dateTo}
                  onChange={(val) => setDateTo(val)}
                  className="w-[150px]"
                  data-testid="input-date-to"
                />
              </div>
            </div>
          )}

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
              {t.statistics.exportPdf}
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={!stats}
              className="gap-2"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t.statistics.exportExcel}
            </Button>
          </div>
        </div>
      </div>

      {!stats ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">{t.statistics.noData}</h3>
            <p className="text-muted-foreground">{t.statistics.noDataDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Monthly New Visitors Report - First Section */}
          <MonthlyNewPatientsReport branchId={selectedBranch} t={t} />

          {/* Payment Status - Monthly Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                {t.statistics.paymentStatus}
              </CardTitle>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#0088FE' }} />
                  <span>{t.statistics.collected}: <strong>{stats.allTimePaid.toLocaleString()}</strong> {t.statistics.currency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF8042' }} />
                  <span>{t.statistics.remaining}: <strong>{stats.allTimeRemaining.toLocaleString()}</strong> {t.statistics.currency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00C49F' }} />
                  <span>المجموع الكلي: <strong>{(stats.allTimePaid + stats.allTimeRemaining).toLocaleString()}</strong> {t.statistics.currency}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stats.monthlyPaymentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${t.statistics.currency}`, '']} />
                  <Legend />
                  <Bar dataKey="collected" name={t.statistics.collected} fill="#0088FE" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="remaining" name={t.statistics.remaining} fill="#FF8042" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="total" name="المجموع الكلي" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">{t.statistics.totalPatients}</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-700">{stats.totalPatients}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-600 font-medium">{t.statistics.newRegistered}</p>
                    <p className="text-2xl md:text-3xl font-bold text-cyan-700">{stats.totalNewPatients}</p>
                  </div>
                  <UserPlus className="w-10 h-10 text-cyan-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600 font-medium">{t.statistics.newPaidPatients}</p>
                    <p className="text-2xl md:text-3xl font-bold text-indigo-700">{stats.newPaidPatients}</p>
                    {stats.totalNewPatients > 0 && (
                      <p className="text-xs text-indigo-500">{((stats.newPaidPatients / stats.totalNewPatients) * 100).toFixed(0)}% {t.statistics.ofNewPatients}</p>
                    )}
                  </div>
                  <Banknote className="w-10 h-10 text-indigo-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">{t.statistics.totalRevenue}</p>
                    <p className="text-xl md:text-2xl font-bold text-green-700">{stats.allTimeRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">{t.statistics.currency}</p>
                  </div>
                  <Banknote className="w-10 h-10 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">{t.statistics.collectionRate}</p>
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
                    <p className="text-sm text-orange-600 font-medium">{t.statistics.totalVisits}</p>
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
                    <p className="text-sm text-muted-foreground">{t.statistics.amputeeCases}</p>
                    <p className="text-2xl font-bold">{stats.amputeeCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.statistics.newRegistered}: {stats.newAmputeeCount} | {((stats.amputeeCount / (stats.totalPatients || 1)) * 100).toFixed(1)}% {t.statistics.ofTotal}
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
                    <p className="text-sm text-muted-foreground">{t.statistics.physiotherapy}</p>
                    <p className="text-2xl font-bold">{stats.physioCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.statistics.newRegistered}: {stats.newPhysioCount} | {((stats.physioCount / (stats.totalPatients || 1)) * 100).toFixed(1)}% {t.statistics.ofTotal}
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
                    <p className="text-sm text-muted-foreground">{t.statistics.medicalSupport}</p>
                    <p className="text-2xl font-bold">{stats.medicalSupportCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.statistics.newRegistered}: {stats.newMedicalSupportCount} | {((stats.medicalSupportCount / (stats.totalPatients || 1)) * 100).toFixed(1)}% {t.statistics.ofTotal}
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
                  {t.statistics.ageDistribution}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.ageDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={50} />
                    <Tooltip formatter={(value) => [value, t.statistics.patientCount]} />
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
                  {t.statistics.conditionDistribution}
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
                    <Tooltip formatter={(value) => [value, t.statistics.patientCount]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Patient Classification Distribution */}
          {stats.classificationDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  {t.statistics.classificationDistribution}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.classificationDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.classificationDistribution.map((entry, index) => (
                        <Cell key={`cell-class-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, t.statistics.patientCount]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branch Distribution - only visible to admin users */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {t.statistics.branchDistribution}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.branchDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'count' ? t.statistics.patientCount : t.statistics.revenue]} />
                      <Legend />
                      <Bar dataKey="count" name={t.statistics.patientCount} fill="#0088FE" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Visits by Treatment Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="text-visits-by-treatment-title">
                <Activity className="w-5 h-5 text-primary" />
                {t.statistics.visitsByTreatment}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.visitsByTreatmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {stats.visitsByTreatmentData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ${t.statistics.visits}`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex flex-col justify-center">
                  {stats.visitsByTreatmentData.map((item: any) => {
                    const total = stats.visitsByTreatmentData.reduce((sum: number, d: any) => sum + d.value, 0);
                    return (
                      <div key={item.name} className="flex items-center justify-between" data-testid={`text-treatment-visits-${item.name}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-bold">{item.value.toLocaleString()} {t.statistics.visits}</span>
                          <span className="text-xs text-muted-foreground mr-2">({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Treatment Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="text-revenue-by-treatment-title">
                <Banknote className="w-5 h-5 text-primary" />
                {t.statistics.revenueByTreatment}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.revenueByTreatmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {stats.revenueByTreatmentData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ${t.statistics.currency}`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex flex-col justify-center">
                  {stats.revenueByTreatmentData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between" data-testid={`text-treatment-revenue-${item.name}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold">{item.value.toLocaleString()} {t.statistics.currency}</span>
                        <span className="text-xs text-muted-foreground mr-2">({item.count} {t.statistics.payment})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Source Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t.statistics.referralSources}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stats.referralSourceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name={t.statistics.patientCount} fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {stats.referralSourceData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {stats.referralSourceData.map((item: { name: string; value: number }, index: number) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-md hover-elevate" data-testid={`referral-source-item-${index}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.value} {t.statistics.patient}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({stats.totalPatients > 0 ? ((item.value / stats.totalPatients) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shift Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" data-testid="text-shift-stats-title">
                <Activity className="w-5 h-5 text-primary" />
                {t.statistics.shiftStats}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.shiftData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {stats.shiftData.map((entry, index) => (
                        <Cell key={`shift-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, t.statistics.session]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex flex-col justify-center">
                  {stats.shiftData.map((item, index) => {
                    const totalShiftVisits = stats.shiftData.reduce((sum, d) => sum + d.value, 0);
                    return (
                      <div key={item.name} className="flex items-center justify-between" data-testid={`shift-stat-item-${index}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.value} {t.statistics.session}</Badge>
                          <span className="text-xs text-muted-foreground">
                            ({totalShiftVisits > 0 ? ((item.value / totalShiftVisits) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t.statistics.monthlyTrend}
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
                  <Area yAxisId="left" type="monotone" dataKey="patients" name={t.statistics.newPatients} stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                  <Area yAxisId="left" type="monotone" dataKey="visits" name={t.statistics.visits} stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Amputation Sites */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Accessibility className="w-5 h-5 text-primary" />
                  {t.statistics.amputationTypes}
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

            {/* Disease Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  {t.statistics.diseaseTypes}
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
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                {t.statistics.financialSummary}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-600 mb-1">{t.statistics.totalCosts}</p>
                  <p className="text-2xl font-bold text-green-700">{stats.allTimeRevenue.toLocaleString()} {t.statistics.currency}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">{t.statistics.amountsCollected}</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.allTimePaid.toLocaleString()} {t.statistics.currency}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-600 mb-1">{t.statistics.amountsRemaining}</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.allTimeRemaining.toLocaleString()} {t.statistics.currency}</p>
                </div>
              </div>

              {/* Revenue by Branch - only visible to admin users */}
              {isAdmin && selectedBranch === "all" && stats.branchDistribution.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">{t.statistics.revenueByBranch}</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.branchDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ${t.statistics.currency}`, t.statistics.revenue]} />
                      <Bar dataKey="revenue" name={t.statistics.revenue} fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Satisfaction Survey Section */}
          {surveyStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  {t.statistics.surveySatisfaction || "رضا المرضى"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
                    <p className="text-sm text-teal-600 mb-1">{t.statistics.surveyTotal || "إجمالي الاستبيانات"}</p>
                    <p className="text-2xl font-bold text-teal-700" data-testid="text-survey-total">{surveyStats.total}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
                    <p className="text-sm text-cyan-600 mb-1">{t.statistics.surveyAvg || "متوسط الرضا"}</p>
                    <p className="text-2xl font-bold text-cyan-700" data-testid="text-survey-avg">{surveyStats.avgSatisfaction}%</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                    <p className="text-sm text-indigo-600 mb-1">{t.statistics.surveyThisMonth || "استبيانات هذا الشهر"}</p>
                    <p className="text-2xl font-bold text-indigo-700" data-testid="text-survey-month">{surveyStats.thisMonth}</p>
                  </div>
                </div>

                {surveyStats.byBranch.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-4">{t.statistics.surveyByBranch || "رضا المرضى حسب الفرع"}</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={surveyStats.byBranch}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value: number) => [`${value}%`, t.statistics.surveyAvg || "متوسط الرضا"]} />
                        <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]}>
                          {surveyStats.byBranch.map((_, index) => (
                            <Cell key={`survey-branch-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {surveyStats.byTemplate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-4">{t.statistics.surveyByDept || "رضا المرضى حسب القسم"}</h4>
                    <div className="space-y-3">
                      {surveyStats.byTemplate.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between" data-testid={`survey-dept-${index}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${item.value}%`, backgroundColor: COLORS[index % COLORS.length] }}
                              />
                            </div>
                            <Badge variant={item.value >= 80 ? "default" : item.value >= 60 ? "secondary" : "destructive"}>
                              {item.value}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">({item.count})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custom Statistics Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartBar className="w-5 h-5 text-primary" />
                {t.statistics.customStats}
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
                    {t.statistics.addCustomField}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomStat ? t.statistics.editCustomField : t.statistics.addCustomFieldNew}
                    </DialogTitle>
                    <DialogDescription>
                      {t.statistics.customStatDesc}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="stat-name">{t.statistics.fieldName}</Label>
                      <Input
                        id="stat-name"
                        value={customStatForm.name}
                        onChange={(e) => setCustomStatForm({ ...customStatForm, name: e.target.value })}
                        placeholder={t.statistics.fieldNamePlaceholder}
                        data-testid="input-custom-stat-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stat-description">{t.statistics.descriptionOptional}</Label>
                      <Textarea
                        id="stat-description"
                        value={customStatForm.description}
                        onChange={(e) => setCustomStatForm({ ...customStatForm, description: e.target.value })}
                        placeholder={t.statistics.descPlaceholder}
                        data-testid="input-custom-stat-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>{t.statistics.statType}</Label>
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
                        <Label>{t.statistics.category}</Label>
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
                      <Label>{t.statistics.filterBy}</Label>
                      <Select
                        value={customStatForm.filterField}
                        onValueChange={(value) => setCustomStatForm({ ...customStatForm, filterField: value })}
                      >
                        <SelectTrigger data-testid="select-filter-field">
                          <SelectValue placeholder={t.statistics.selectFilterField} />
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
                        <Label>{t.statistics.filterValue}</Label>
                        {["isAmputee", "isPhysiotherapy", "isMedicalSupport"].includes(customStatForm.filterField) ? (
                          <Select
                            value={customStatForm.filterValue}
                            onValueChange={(value) => setCustomStatForm({ ...customStatForm, filterValue: value })}
                          >
                            <SelectTrigger data-testid="select-filter-value">
                              <SelectValue placeholder={t.statistics.selectValue} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">{t.statistics.yes}</SelectItem>
                              <SelectItem value="false">{t.statistics.no}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={customStatForm.filterValue}
                            onChange={(e) => setCustomStatForm({ ...customStatForm, filterValue: e.target.value })}
                            placeholder={t.statistics.enterFilterValue}
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
                              <span>{t.statistics.globalField}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-orange-500" />
                              <span>{t.statistics.branchSpecific}</span>
                            </>
                          )}
                        </Label>
                      </div>
                    )}
                    {isAdmin && !customStatForm.isGlobal && (
                      <div className="grid gap-2">
                        <Label>{t.statistics.branch}</Label>
                        <Select
                          value={customStatForm.branchId?.toString() || ""}
                          onValueChange={(value) => setCustomStatForm({ ...customStatForm, branchId: value ? Number(value) : null })}
                        >
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder={t.statistics.selectBranch} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {t.branches[branch.name as keyof typeof t.branches] || branch.name}
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
                      {t.statistics.cancel}
                    </Button>
                    <Button
                      onClick={handleSaveCustomStat}
                      disabled={!customStatForm.name || createCustomStatMutation.isPending || updateCustomStatMutation.isPending}
                      data-testid="button-save-custom-stat"
                    >
                      {createCustomStatMutation.isPending || updateCustomStatMutation.isPending ? t.statistics.saving : t.statistics.save}
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
                              if (confirm(t.statistics.deleteConfirm)) {
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
                              {t.statistics.global}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200">
                              <Lock className="w-3 h-3 ml-1" />
                              {branchName ? (t.branches[branchName as keyof typeof t.branches] || branchName) : t.statistics.private}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {STAT_TYPES.find(st => st.value === stat.statType)?.label}
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
                  <p>{t.statistics.noCustomStats}</p>
                  <p className="text-sm mt-1">{t.statistics.addFieldsPrompt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${ARABIC_MONTHS[m] || m} ${year}`;
}

function MonthlyNewPatientsReport({ branchId, t }: { branchId: string; t: any }) {
  const { data, isLoading } = useQuery<Array<{
    month: string;
    totalNew: number;
    paidCount: number;
    unpaidCount: number;
  }>>({
    queryKey: ['/api/statistics/monthly-new-patients', branchId],
    queryFn: async () => {
      const url = branchId && branchId !== "all"
        ? `/api/statistics/monthly-new-patients?branchId=${branchId}`
        : '/api/statistics/monthly-new-patients';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl w-full" />;
  }

  if (!data || data.length === 0) return null;

  const totals = data.reduce((acc, row) => ({
    totalNew: acc.totalNew + row.totalNew,
    paidCount: acc.paidCount + row.paidCount,
    unpaidCount: acc.unpaidCount + row.unpaidCount,
  }), { totalNew: 0, paidCount: 0, unpaidCount: 0 });

  const overallRate = totals.totalNew > 0 ? ((totals.paidCount / totals.totalNew) * 100).toFixed(1) : '0';

  const chartData = data.map(row => ({
    ...row,
    label: formatMonthLabel(row.month),
    rate: row.totalNew > 0 ? Math.round((row.paidCount / row.totalNew) * 100) : 0,
  }));

  return (
    <Card data-testid="card-monthly-new-patients">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          {t.statistics.monthlyNewPatients}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t.statistics.monthlyNewPatientsDesc}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{totals.totalNew}</p>
            <p className="text-xs text-blue-600">{t.statistics.totalNewPatients}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totals.paidCount}</p>
            <p className="text-xs text-green-600">{t.statistics.paidPatients}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">{totals.unpaidCount}</p>
            <p className="text-xs text-orange-600">{t.statistics.unpaidPatients}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{overallRate}%</p>
            <p className="text-xs text-purple-600">{t.statistics.purchaseRate}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  paidCount: t.statistics.paidPatients,
                  unpaidCount: t.statistics.unpaidPatients,
                };
                return [value, labels[name] || name];
              }}
              labelFormatter={(label) => label}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  paidCount: t.statistics.paidPatients,
                  unpaidCount: t.statistics.unpaidPatients,
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="paidCount" stackId="a" fill="#00C49F" radius={[0, 0, 0, 0]} />
            <Bar dataKey="unpaidCount" stackId="a" fill="#FF8042" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-testid="table-monthly-new-patients">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t.statistics.month}</th>
                <th className="text-center py-2 px-3 font-semibold text-blue-700">{t.statistics.totalNewPatients}</th>
                <th className="text-center py-2 px-3 font-semibold text-green-700">{t.statistics.paidPatients}</th>
                <th className="text-center py-2 px-3 font-semibold text-orange-700">{t.statistics.unpaidPatients}</th>
                <th className="text-center py-2 px-3 font-semibold text-purple-700">{t.statistics.purchaseRate}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium">{row.label}</td>
                  <td className="text-center py-2 px-3">{row.totalNew}</td>
                  <td className="text-center py-2 px-3 text-green-700 font-medium">{row.paidCount}</td>
                  <td className="text-center py-2 px-3 text-orange-700 font-medium">{row.unpaidCount}</td>
                  <td className="text-center py-2 px-3">
                    <Badge variant={row.rate >= 50 ? "default" : "secondary"} className="text-xs">
                      {row.rate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="py-2 px-3">{t.statistics.total}</td>
                <td className="text-center py-2 px-3 text-blue-700">{totals.totalNew}</td>
                <td className="text-center py-2 px-3 text-green-700">{totals.paidCount}</td>
                <td className="text-center py-2 px-3 text-orange-700">{totals.unpaidCount}</td>
                <td className="text-center py-2 px-3">
                  <Badge variant="default" className="text-xs">{overallRate}%</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
