import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { AmiriRegular } from "@/lib/amiri-font";
import ArabicReshaper from "arabic-reshaper";
import { useBranchSession } from "@/components/BranchGate";
import { formatDateIraq } from "@/lib/utils";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet, 
  Calculator, 
  Receipt,
  Users,
  Building2,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  FileText,
  PieChart,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  RefreshCw,
  ArrowLeft,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const EXPENSE_CATEGORIES = [
  { value: "salaries", label: "رواتب" },
  { value: "rent", label: "إيجار" },
  { value: "medical_supplies", label: "مستلزمات طبية" },
  { value: "maintenance", label: "صيانة" },
  { value: "utilities", label: "خدمات (كهرباء/ماء)" },
  { value: "other", label: "أخرى" }
];

const CATEGORY_COLORS = {
  salaries: "#3b82f6",
  rent: "#f59e0b",
  medical_supplies: "#10b981",
  maintenance: "#8b5cf6",
  utilities: "#ec4899",
  other: "#6b7280"
};

const expenseFormSchema = z.object({
  branchId: z.number(),
  category: z.string().min(1, "يرجى اختيار التصنيف"),
  amount: z.number().min(1, "المبلغ يجب أن يكون أكبر من صفر"),
  description: z.string().optional(),
  expenseDate: z.string().min(1, "يرجى اختيار التاريخ"),
  notes: z.string().optional()
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface Branch {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  branchId: number;
  category: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

interface AccountingSummary {
  totalRevenue: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number;
  effectiveStartDate: string | null;
  effectiveEndDate: string;
  daysInRange: number;
}

interface Debtor {
  patient: {
    id: number;
    name: string;
    phone: string | null;
  };
  totalCost: number;
  totalPaid: number;
  remaining: number;
  lastPaymentDate: string | null;
}

interface MonthlyTrend {
  month: string;
  monthDate: string;
  totalRevenue: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number;
}

interface ServiceProfitability {
  serviceType: string;
  serviceName: string;
  patientCount: number;
  totalRevenue: number;
  totalPaid: number;
  remaining: number;
  collectionRate: number;
}

interface BranchComparison {
  branchId: number;
  branchName: string;
  patientCount: number;
  totalRevenue: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  patientId: number;
  branchId: number;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  serviceType: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Patient {
  id: number;
  name: string;
  phone: string | null;
  branchId: number;
}

const invoiceFormSchema = z.object({
  patientId: z.number().min(1, "يرجى اختيار المريض"),
  branchId: z.number().min(1, "يرجى اختيار الفرع"),
  invoiceDate: z.string().min(1, "يرجى اختيار التاريخ"),
  dueDate: z.string().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "يرجى إدخال الوصف"),
    serviceType: z.string().optional(),
    quantity: z.number().min(1).default(1),
    unitPrice: z.number().min(0, "يرجى إدخال السعر"),
  })).min(1, "يرجى إضافة عنصر واحد على الأقل")
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const INVOICE_STATUS = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800" },
  partial: { label: "مدفوع جزئياً", color: "bg-blue-100 text-blue-800" },
  paid: { label: "مدفوع بالكامل", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغاة", color: "bg-red-100 text-red-800" }
};

const SERVICE_TYPES = [
  { value: "prosthetic", label: "طرف صناعي" },
  { value: "physiotherapy", label: "علاج طبيعي" },
  { value: "medical_support", label: "مسند طبي" },
  { value: "consultation", label: "استشارة" },
  { value: "other", label: "أخرى" }
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + " د.ع";
}

// Returns the number portion only (no currency suffix), formatted with
// thousand separators for the Iraqi Arabic locale. Use this when the
// currency label is rendered as a separate styled span.
function formatNumberOnly(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount);
}

function getCategoryLabel(category: string): string {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
}

interface TreatmentRevenueData {
  treatmentType: string;
  totalAmount: number;
  count: number;
}

const TREATMENT_TYPE_COLORS: Record<string, string> = {
  "روبوت": "#0088FE",
  "تمارين تأهيلية": "#00C49F",
  "أجهزة علاج طبيعي": "#FFBB28",
  "غير محدد": "#8884d8",
};

function AccountingRevenueByTreatment({ selectedBranch }: { selectedBranch: string }) {
  const { t } = useTranslation();
  const { data: revenueByTreatment = [] } = useQuery<TreatmentRevenueData[]>({
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
    color: TREATMENT_TYPE_COLORS[item.treatmentType] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="text-accounting-revenue-by-treatment">
          <PieChart className="h-5 w-5" />
          {t.accounting.revenueByTreatment}
        </CardTitle>
        <CardDescription>{t.accounting.revenueByTreatmentDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
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
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ${t.accounting.currency}`, '']} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="space-y-3 flex flex-col justify-center">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between" data-testid={`text-accounting-treatment-revenue-${item.name}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                  <span className="text-xs text-muted-foreground mr-2">({item.count} {t.accounting.paymentUnit})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Formats an ISO date (YYYY-MM-DD) as Arabic: "١١ كانون الثاني ٢٠٢٦".
// Uses Iraqi Arabic month names AND Eastern Arabic-Indic numerals so the
// entire string is RTL-native. This matters because Western digits (0-9)
// are LTR runs that get mis-ordered by the BiDi algorithm when surrounded
// by Arabic text — using ٠-٩ keeps everything in pure RTL flow and the
// date reads day → month → year right-to-left as expected.
const ARABIC_MONTHS_IQ = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];
const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicIndicDigits(value: number | string): string {
  return String(value)
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 9 ? ARABIC_INDIC_DIGITS[code] : ch;
    })
    .join("");
}
function formatArabicDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const monthIdx = Number(m) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${toArabicIndicDigits(Number(d))} ${ARABIC_MONTHS_IQ[monthIdx]} ${toArabicIndicDigits(y)}`;
}

export default function Accounting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  
  const [activeTab, setActiveTab] = useState("dashboard");
  // For branch staff, lock to their branch only
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isAdmin ? "all" : (userBranchId?.toString() || "all")
  );
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<{description: string; serviceType: string; quantity: number; unitPrice: number}[]>([
    { description: "", serviceType: "", quantity: 1, unitPrice: 0 }
  ]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<"expense" | "invoice" | null>(null);
  const [isDailyDialogOpen, setIsDailyDialogOpen] = useState(false);
  const [dailySummaryDate, setDailySummaryDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);

  // Determine effective branch filter - branch staff can only see their branch
  const effectiveBranchFilter = isAdmin ? selectedBranch : (userBranchId?.toString() || "all");

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"]
  });

  // Fetch accounting summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AccountingSummary>({
    queryKey: ["/api/accounting/summary", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/accounting/summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    }
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    }
  });

  // Fetch expenses by category
  const { data: expensesByCategory = [] } = useQuery<{category: string, total: number}[]>({
    queryKey: ["/api/expenses/by-category/summary", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/expenses/by-category/summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses by category");
      return res.json();
    }
  });

  // Fetch invoices
  const { data: invoicesList = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    }
  });

  // Fetch patients for invoice creation
  const { data: patientsList = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", selectedBranch],
    queryFn: async () => {
      const branchId = selectedBranch !== "all" ? selectedBranch : undefined;
      const res = await fetch(branchId ? `/api/patients?branchId=${branchId}` : "/api/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    }
  });

  // Fetch debtors
  const { data: debtors = [], isLoading: debtorsLoading } = useQuery<Debtor[]>({
    queryKey: ["/api/accounting/debtors", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      const res = await fetch(`/api/accounting/debtors?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch debtors");
      return res.json();
    }
  });

  // Fetch monthly trends
  const { data: monthlyTrends = [] } = useQuery<MonthlyTrend[]>({
    queryKey: ["/api/accounting/monthly-trends", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      params.append("months", "12");
      const res = await fetch(`/api/accounting/monthly-trends?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monthly trends");
      return res.json();
    }
  });

  // Fetch profitability by service
  const { data: serviceProfitability = [] } = useQuery<ServiceProfitability[]>({
    queryKey: ["/api/accounting/profitability-by-service", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      const res = await fetch(`/api/accounting/profitability-by-service?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch service profitability");
      return res.json();
    }
  });

  // Fetch branch comparison
  const { data: branchComparison = [] } = useQuery<BranchComparison[]>({
    queryKey: ["/api/accounting/branch-comparison", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/accounting/branch-comparison?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branch comparison");
      return res.json();
    }
  });

  // Form for adding/editing expenses
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      branchId: 1,
      category: "",
      amount: 0,
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
      notes: ""
    }
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/by-category/summary"] });
      setIsExpenseDialogOpen(false);
      form.reset();
      toast({ title: t.accounting.expenseAddedSuccess });
    },
    onError: (error: any) => {
      toast({ title: t.accounting.expenseAddError, description: error.message, variant: "destructive" });
    }
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExpenseFormData> }) => {
      const res = await apiRequest("PUT", `/api/expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/by-category/summary"] });
      setIsExpenseDialogOpen(false);
      setEditingExpense(null);
      form.reset();
      toast({ title: t.accounting.expenseUpdatedSuccess });
    },
    onError: (error: any) => {
      toast({ title: t.accounting.expenseUpdateError, description: error.message, variant: "destructive" });
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/by-category/summary"] });
      toast({ title: t.accounting.expenseDeletedSuccess });
    },
    onError: (error: any) => {
      toast({ title: t.accounting.expenseDeleteError, description: error.message, variant: "destructive" });
    }
  });

  const handleSubmitExpense = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      branchId: expense.branchId,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || "",
      expenseDate: expense.expenseDate,
      notes: expense.notes || ""
    });
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = (id: number) => {
    setDeleteConfirmId(id);
    setDeleteType("expense");
  };

  const openNewExpenseDialog = () => {
    setEditingExpense(null);
    form.reset({
      branchId: selectedBranch !== "all" ? parseInt(selectedBranch) : 1,
      category: "",
      amount: 0,
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
      notes: ""
    });
    setIsExpenseDialogOpen(true);
  };

  // Invoice mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      setIsInvoiceDialogOpen(false);
      toast({ title: t.accounting.invoiceCreatedSuccess });
    },
    onError: (error: any) => {
      toast({ title: t.accounting.invoiceCreateError, description: error.message, variant: "destructive" });
    }
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: t.accounting.invoiceDeletedSuccess });
      setDeleteConfirmId(null);
      setDeleteType(null);
    },
    onError: (error: any) => {
      toast({ title: t.accounting.invoiceDeleteError, description: error.message, variant: "destructive" });
    }
  });

  const handleCreateInvoice = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const items = invoiceItems.filter(item => item.description && item.unitPrice > 0).map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));
    
    if (items.length === 0) {
      toast({ title: t.accounting.addItemRequired, variant: "destructive" });
      return;
    }

    const selectedPatientId = parseInt((document.getElementById("invoice-patient") as HTMLInputElement)?.value || "0");
    const invoiceDate = (document.getElementById("invoice-date-value") as HTMLInputElement)?.value;
    const discount = parseInt((document.getElementById("invoice-discount") as HTMLInputElement)?.value || "0");
    const notes = (document.getElementById("invoice-notes") as HTMLTextAreaElement)?.value;
    
    if (!selectedPatientId) {
      toast({ title: t.accounting.selectPatientRequired, variant: "destructive" });
      return;
    }

    const patient = patientsList.find(p => p.id === selectedPatientId);
    
    createInvoiceMutation.mutate({
      patientId: selectedPatientId,
      branchId: patient?.branchId || parseInt(selectedBranch) || 1,
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      subtotal,
      discount: discount || 0,
      total: subtotal - (discount || 0),
      notes,
      items
    });
  };

  const openNewInvoiceDialog = () => {
    setEditingInvoice(null);
    setInvoiceItems([{ description: "", serviceType: "", quantity: 1, unitPrice: 0 }]);
    setIsInvoiceDialogOpen(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: "", serviceType: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const updateInvoiceItem = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceItems];
    (updated[index] as any)[field] = value;
    setInvoiceItems(updated);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId && deleteType === "expense") {
      deleteExpenseMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteType(null);
    } else if (deleteConfirmId && deleteType === "invoice") {
      deleteInvoiceMutation.mutate(deleteConfirmId);
    }
  };

  // Arabic text reshaping for PDF - using arabic-reshaper for proper ligatures
  const reshapeArabic = useCallback((text: string): string => {
    try {
      const shaped = ArabicReshaper.convertArabic(text);
      // Reverse the text for proper RTL display in PDF
      return shaped.split('').reverse().join('');
    } catch {
      return text.split('').reverse().join('');
    }
  }, []);

  const currentBranchName = selectedBranch === "all" 
    ? t.accounting.allBranches 
    : branches.find(b => b.id.toString() === selectedBranch)?.name || t.accounting.unspecified;

  const currentBranchNameArabic = selectedBranch === "all" 
    ? "جميع الفروع" 
    : branches.find(b => b.id.toString() === selectedBranch)?.name || "غير محدد";

  const getCategoryLabelTranslated = (category: string): string => {
    const categoryMap: Record<string, string> = {
      salaries: t.accounting.catSalaries,
      rent: t.accounting.catRent,
      medical_supplies: t.accounting.catMedicalSupplies,
      maintenance: t.accounting.catMaintenance,
      utilities: t.accounting.catUtilities,
      other: t.accounting.catOther,
    };
    return categoryMap[category] || category;
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: t.accounting.statusPending,
      partial: t.accounting.statusPartial,
      paid: t.accounting.statusPaid,
      cancelled: t.accounting.statusCancelled,
    };
    return statusMap[status] || status;
  };

  const getServiceTypeLabel = (value: string): string => {
    const serviceMap: Record<string, string> = {
      prosthetic: t.accounting.svcProsthetic,
      physiotherapy: t.accounting.svcPhysiotherapy,
      medical_support: t.accounting.svcMedicalSupport,
      consultation: t.accounting.svcConsultation,
      other: t.accounting.svcOther,
    };
    return serviceMap[value] || value;
  };

  const displayCurrency = (amount: number): string => {
    return new Intl.NumberFormat(t.dir === 'rtl' ? 'ar-IQ' : 'en-US').format(amount) + " " + t.accounting.currency;
  };

  // Export to PDF
  const exportToPDF = useCallback(() => {
    if (!summary) return;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Add Amiri Arabic font
    doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegular);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
    doc.setR2L(true);
    
    // Title
    doc.setFontSize(20);
    doc.text(reshapeArabic("التقرير المحاسبي الشامل"), 105, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.text(reshapeArabic(`الفرع: ${currentBranchNameArabic}`), 105, 30, { align: 'center' });
    doc.text(reshapeArabic(`تاريخ التقرير: ${formatDateIraq(new Date())}`), 105, 37, { align: 'center' });
    
    let yPos = 50;
    
    // Financial Summary Section
    doc.setFontSize(14);
    doc.text(reshapeArabic("الملخص المالي"), 195, yPos, { align: 'right' });
    yPos += 10;
    
    // Summary table
    const summaryTableData = [
      [reshapeArabic(formatCurrency(summary.totalRevenue)), reshapeArabic("إجمالي الإيرادات")],
      [reshapeArabic(formatCurrency(summary.totalPaid)), reshapeArabic("المدفوعات")],
      [reshapeArabic(formatCurrency(summary.totalRemaining)), reshapeArabic("المتبقي")],
      [reshapeArabic(formatCurrency(summary.totalExpenses)), reshapeArabic("المصروفات")],
      [reshapeArabic(formatCurrency(summary.netProfit)), reshapeArabic("صافي الربح")],
      [reshapeArabic(`${summary.collectionRate}%`), reshapeArabic("نسبة التحصيل")]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [[reshapeArabic("القيمة"), reshapeArabic("البيان")]],
      body: summaryTableData,
      theme: 'striped',
      styles: { font: 'Amiri', halign: 'right', fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175], halign: 'right' },
      margin: { left: 15, right: 15 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Expenses by Category
    if (expensesByCategory.length > 0) {
      doc.setFontSize(14);
      doc.text(reshapeArabic("المصروفات حسب التصنيف"), 195, yPos, { align: 'right' });
      yPos += 10;
      
      const expenseCategoryData = expensesByCategory.map(e => [
        reshapeArabic(formatCurrency(e.total)),
        reshapeArabic(getCategoryLabel(e.category))
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic("المبلغ"), reshapeArabic("التصنيف")]],
        body: expenseCategoryData,
        theme: 'striped',
        styles: { font: 'Amiri', halign: 'right', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'right' },
        margin: { left: 15, right: 15 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Branch Comparison (new page if needed)
    if (branchComparison.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(reshapeArabic("مقارنة الفروع"), 195, yPos, { align: 'right' });
      yPos += 10;
      
      const branchData = branchComparison.map(b => [
        reshapeArabic(`${b.collectionRate}%`),
        reshapeArabic(formatCurrency(b.netProfit)),
        reshapeArabic(formatCurrency(b.totalExpenses)),
        reshapeArabic(formatCurrency(b.totalPaid)),
        reshapeArabic(String(b.patientCount)),
        reshapeArabic(b.branchName)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[
          reshapeArabic("التحصيل"),
          reshapeArabic("صافي الربح"),
          reshapeArabic("المصروفات"),
          reshapeArabic("المحصل"),
          reshapeArabic("المرضى"),
          reshapeArabic("الفرع")
        ]],
        body: branchData,
        theme: 'striped',
        styles: { font: 'Amiri', halign: 'right', fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94], halign: 'right' },
        margin: { left: 15, right: 15 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Debtors List (new page if needed)
    if (debtors.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(reshapeArabic("قائمة المديونيات"), 195, yPos, { align: 'right' });
      yPos += 10;
      
      const debtorData = debtors.slice(0, 20).map((d, i) => [
        d.lastPaymentDate ? formatDateIraq(d.lastPaymentDate) : "-",
        reshapeArabic(formatCurrency(d.remaining)),
        reshapeArabic(formatCurrency(d.totalPaid)),
        reshapeArabic(formatCurrency(d.totalCost)),
        reshapeArabic(d.patient.name),
        String(i + 1)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[
          reshapeArabic("آخر دفعة"),
          reshapeArabic("المتبقي"),
          reshapeArabic("المدفوع"),
          reshapeArabic("الإجمالي"),
          reshapeArabic("المريض"),
          "#"
        ]],
        body: debtorData,
        theme: 'striped',
        styles: { font: 'Amiri', halign: 'right', fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68], halign: 'right' },
        margin: { left: 15, right: 15 }
      });
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        reshapeArabic(`صفحة ${i} من ${pageCount}`),
        105,
        285,
        { align: 'center' }
      );
    }
    
    doc.save(`تقرير_محاسبي_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: t.accounting.exportSuccess });
  }, [summary, expensesByCategory, branchComparison, debtors, currentBranchNameArabic, reshapeArabic, toast]);

  // Daily cash summary PDF for the accountant.
  // Pulls /api/accounting/daily-summary for the chosen date and renders a
  // single-page report: revenue by service, expenses by category, today's
  // net, yesterday's running cash, today's closing cash. Includes signature
  // lines for accountant and manager.
  const generateDailySummaryPDF = useCallback(async () => {
    setDailySummaryLoading(true);
    try {
      const params = new URLSearchParams({ date: dailySummaryDate });
      if (effectiveBranchFilter !== "all") {
        params.append("branchId", effectiveBranchFilter);
      }
      const res = await fetch(`/api/accounting/daily-summary?${params}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "تعذّر جلب الملخص اليومي");
      }
      const data: {
        date: string;
        branchName: string | null;
        todayRevenue: number;
        todayExpenses: number;
        todayNet: number;
        yesterdayClosing: number;
        todayClosing: number;
        revenueByService: { type: string; amount: number }[];
        expensesByCategory: { category: string; amount: number }[];
      } = await res.json();

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.addFileToVFS("Amiri-Regular.ttf", AmiriRegular);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      doc.setFont("Amiri");
      doc.setR2L(true);

      // Header
      doc.setFontSize(18);
      doc.text(reshapeArabic("الملخص اليومي للقاصة"), 105, 20, { align: "center" });
      doc.setFontSize(11);
      doc.text(reshapeArabic("مجموعة مراكز د. ياسر الساعدي"), 105, 28, { align: "center" });

      // Meta line
      doc.setFontSize(11);
      const branchLabel = data.branchName ? `الفرع: ${data.branchName}` : "كل الفروع";
      doc.text(reshapeArabic(branchLabel), 195, 40, { align: "right" });
      doc.text(reshapeArabic(`التاريخ: ${formatArabicDate(data.date)}`), 15, 40, { align: "left" });

      let yPos = 50;

      // Revenue by service
      doc.setFontSize(13);
      doc.text(reshapeArabic("وارد اليوم — موزّع حسب نوع الخدمة"), 195, yPos, { align: "right" });
      yPos += 6;

      const revenueRows = data.revenueByService.length > 0
        ? data.revenueByService.map((r) => [
            reshapeArabic(formatCurrency(r.amount)),
            reshapeArabic(r.type || "غير محدد"),
          ])
        : [[reshapeArabic("—"), reshapeArabic("لا يوجد وارد اليوم")]];
      revenueRows.push([
        reshapeArabic(formatCurrency(data.todayRevenue)),
        reshapeArabic("الإجمالي"),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic("المبلغ"), reshapeArabic("نوع الخدمة")]],
        body: revenueRows,
        theme: "striped",
        styles: { font: "Amiri", halign: "right", fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74], halign: "right" },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === revenueRows.length - 1) {
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.fillColor = [220, 252, 231];
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Expenses by category
      doc.setFontSize(13);
      doc.text(reshapeArabic("مصاريف اليوم — موزّعة حسب الفئة"), 195, yPos, { align: "right" });
      yPos += 6;

      const expenseRows = data.expensesByCategory.length > 0
        ? data.expensesByCategory.map((e) => [
            reshapeArabic(formatCurrency(e.amount)),
            reshapeArabic(e.category || "أخرى"),
          ])
        : [[reshapeArabic("—"), reshapeArabic("لا توجد مصاريف اليوم")]];
      expenseRows.push([
        reshapeArabic(formatCurrency(data.todayExpenses)),
        reshapeArabic("الإجمالي"),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic("المبلغ"), reshapeArabic("الفئة")]],
        body: expenseRows,
        theme: "striped",
        styles: { font: "Amiri", halign: "right", fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: "right" },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === expenseRows.length - 1) {
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.fillColor = [254, 226, 226];
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Cash summary block
      doc.setFontSize(13);
      doc.text(reshapeArabic("ملخّص القاصة"), 195, yPos, { align: "right" });
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic("المبلغ"), reshapeArabic("البيان")]],
        body: [
          [reshapeArabic(formatCurrency(data.todayRevenue)), reshapeArabic("وارد اليوم")],
          [reshapeArabic(formatCurrency(data.todayExpenses)), reshapeArabic("مصاريف اليوم")],
          [reshapeArabic(formatCurrency(data.todayNet)), reshapeArabic("صافي اليوم (وارد − مصاريف)")],
          [reshapeArabic(formatCurrency(data.yesterdayClosing)), reshapeArabic("رصيد القاصة من أمس")],
          [reshapeArabic(formatCurrency(data.todayClosing)), reshapeArabic("رصيد القاصة في نهاية اليوم")],
        ],
        theme: "grid",
        styles: { font: "Amiri", halign: "right", fontSize: 11 },
        headStyles: { fillColor: [30, 64, 175], halign: "right" },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === 4) {
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.fillColor = [219, 234, 254];
            cellData.cell.styles.fontSize = 12;
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 25;

      // Signatures
      doc.setFontSize(11);
      doc.text(reshapeArabic("توقيع المحاسب: ____________________"), 195, yPos, { align: "right" });
      doc.text(reshapeArabic("توقيع المسؤول: ____________________"), 15, yPos, { align: "left" });

      doc.save(`ملخص_يومي_${data.date}.pdf`);
      toast({ title: t.accounting.exportSuccess });
      setIsDailyDialogOpen(false);
    } catch (err: any) {
      toast({ title: err.message || "خطأ في توليد الملخص", variant: "destructive" });
    } finally {
      setDailySummaryLoading(false);
    }
  }, [dailySummaryDate, effectiveBranchFilter, reshapeArabic, toast, t.accounting.exportSuccess]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (!summary) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Financial Summary Sheet
    const summaryData = [
      ['التقرير المحاسبي الشامل'],
      ['الفرع', currentBranchNameArabic],
      ['تاريخ التقرير', formatDateIraq(new Date())],
      [],
      ['الملخص المالي'],
      ['البيان', 'القيمة'],
      ['إجمالي الإيرادات (د.ع)', summary.totalRevenue],
      ['المدفوعات (د.ع)', summary.totalPaid],
      ['المتبقي (د.ع)', summary.totalRemaining],
      ['المصروفات (د.ع)', summary.totalExpenses],
      ['صافي الربح (د.ع)', summary.netProfit],
      ['نسبة التحصيل (%)', summary.collectionRate]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص المالي');
    
    // Expenses Sheet
    if (expenses.length > 0) {
      const expenseHeaders = ['#', 'الفرع', 'التصنيف', 'الوصف', 'المبلغ (د.ع)', 'التاريخ', 'ملاحظات'];
      const expenseRows = expenses.map((e, i) => [
        i + 1,
        branches.find(b => b.id === e.branchId)?.name || '-',
        getCategoryLabel(e.category),
        e.description || '-',
        e.amount,
        formatDateIraq(e.expenseDate),
        e.notes || '-'
      ]);
      
      const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
      expenseSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, expenseSheet, 'المصروفات');
    }
    
    // Expenses by Category Sheet
    if (expensesByCategory.length > 0) {
      const catHeaders = ['التصنيف', 'المبلغ (د.ع)'];
      const catRows = expensesByCategory.map(e => [getCategoryLabel(e.category), e.total]);
      const catSheet = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
      catSheet['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, catSheet, 'المصروفات حسب التصنيف');
    }
    
    // Branch Comparison Sheet
    if (branchComparison.length > 0) {
      const branchHeaders = ['الفرع', 'المرضى', 'الإيرادات', 'المحصل', 'المتبقي', 'المصروفات', 'صافي الربح', 'نسبة التحصيل (%)'];
      const branchRows = branchComparison.map(b => [
        b.branchName,
        b.patientCount,
        b.totalRevenue,
        b.totalPaid,
        b.totalRemaining,
        b.totalExpenses,
        b.netProfit,
        b.collectionRate
      ]);
      
      const branchSheet = XLSX.utils.aoa_to_sheet([branchHeaders, ...branchRows]);
      branchSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, branchSheet, 'مقارنة الفروع');
    }
    
    // Debtors Sheet
    if (debtors.length > 0) {
      const debtorHeaders = ['#', 'اسم المريض', 'الهاتف', 'إجمالي التكلفة', 'المدفوع', 'المتبقي', 'آخر دفعة'];
      const debtorRows = debtors.map((d, i) => [
        i + 1,
        d.patient.name,
        d.patient.phone || '-',
        d.totalCost,
        d.totalPaid,
        d.remaining,
        d.lastPaymentDate ? formatDateIraq(d.lastPaymentDate) : 'لم يدفع'
      ]);
      
      const debtorSheet = XLSX.utils.aoa_to_sheet([debtorHeaders, ...debtorRows]);
      debtorSheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, debtorSheet, 'المديونيات');
    }
    
    // Monthly Trends Sheet
    if (monthlyTrends.length > 0) {
      const trendHeaders = ['الشهر', 'المحصل', 'المصروفات', 'صافي الربح', 'نسبة التحصيل (%)'];
      const trendRows = monthlyTrends.map(t => [
        t.month,
        t.totalPaid,
        t.totalExpenses,
        t.netProfit,
        t.collectionRate
      ]);
      
      const trendSheet = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
      trendSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'الاتجاهات الشهرية');
    }
    
    // Service Profitability Sheet
    if (serviceProfitability.length > 0) {
      const serviceHeaders = ['نوع الخدمة', 'عدد المرضى', 'الإيرادات', 'المحصل', 'المتبقي', 'نسبة التحصيل (%)'];
      const serviceRows = serviceProfitability.map(s => [
        s.serviceName,
        s.patientCount,
        s.totalRevenue,
        s.totalPaid,
        s.remaining,
        s.collectionRate
      ]);
      
      const serviceSheet = XLSX.utils.aoa_to_sheet([serviceHeaders, ...serviceRows]);
      serviceSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, serviceSheet, 'ربحية الخدمات');
    }
    
    XLSX.writeFile(workbook, `تقرير_محاسبي_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: t.accounting.exportSuccess });
  }, [summary, expenses, expensesByCategory, branchComparison, debtors, monthlyTrends, serviceProfitability, branches, currentBranchNameArabic, toast]);

  // Prepare chart data
  const expenseChartData = expensesByCategory.map(item => ({
    name: getCategoryLabelTranslated(item.category),
    value: item.total,
    color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || "#6b7280"
  }));

  const revenueKey = t.accounting.chartRevenue;
  const expensesKey = t.accounting.chartExpenses;
  const profitKey = t.accounting.chartProfit;

  const trendChartData = monthlyTrends.map(item => ({
    month: item.month,
    [revenueKey]: item.totalPaid,
    [expensesKey]: item.totalExpenses,
    [profitKey]: item.netProfit
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t.accounting.pageTitle}</h1>
              <p className="text-muted-foreground">{t.accounting.pageSubtitle}</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-40" data-testid="select-branch">
                  <SelectValue placeholder={t.accounting.allBranches} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.accounting.allBranches}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="px-3 py-2 text-sm" data-testid="badge-current-branch">
                <Building2 className="h-4 w-4 ml-2" />
                {branchSession?.branchName || t.accounting.branch}
              </Badge>
            )}
            
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium text-muted-foreground">من</label>
              <DatePickerIraq
                value={dateRange.startDate}
                onChange={(val) => setDateRange(prev => ({ ...prev, startDate: val }))}
                className="w-36"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium text-muted-foreground">إلى</label>
              <DatePickerIraq
                value={dateRange.endDate}
                onChange={(val) => setDateRange(prev => ({ ...prev, endDate: val }))}
                className="w-36"
                data-testid="input-end-date"
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDateRange({ startDate: "", endDate: "" })}
              data-testid="button-clear-filters"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-8 mx-1" />

            <Button
              variant="default"
              onClick={() => {
                setDailySummaryDate(new Date().toISOString().split("T")[0]);
                setIsDailyDialogOpen(true);
              }}
              className="gap-2"
              data-testid="button-daily-summary"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">ملخص يومي</span>
            </Button>

            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={!summary}
              className="gap-2"
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden md:inline">PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={!summary}
              className="gap-2"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden md:inline">Excel</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabDashboard}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2" data-testid="tab-expenses">
              <Receipt className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabExpenses}</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2" data-testid="tab-invoices">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabInvoices}</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2" data-testid="tab-reports">
              <PieChart className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabReports}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabAnalytics}</span>
            </TabsTrigger>
            <TabsTrigger value="debtors" className="gap-2" data-testid="tab-debtors">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden md:inline">{t.accounting.tabDebtors}</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Date range banner: shows effective period covered by the totals.
                flex-row-reverse keeps the descriptive sentence on the visual
                LEFT and the day-count badge on the visual RIGHT (per user's
                preferred reading flow for this strip). */}
            {summary?.effectiveStartDate && (
              <div
                className="flex flex-row-reverse flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-border/50 bg-muted/40 px-4 py-2 text-sm text-muted-foreground"
                data-testid="text-summary-date-range"
              >
                <span>النتائج أدناه تغطّي الفترة</span>
                <span className="font-medium">من</span>
                <span className="font-semibold text-foreground">
                  {formatArabicDate(summary.effectiveStartDate)}
                </span>
                <span className="font-medium">إلى</span>
                <span className="font-semibold text-foreground">
                  {formatArabicDate(summary.effectiveEndDate)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5">
                  <span className="font-bold text-primary">{toArabicIndicDigits(summary.daysInRange)}</span>
                  <span className="text-xs text-primary/80">يوماً</span>
                </span>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.totalRevenue}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-total-revenue">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-primary truncate">
                      {summaryLoading ? "..." : formatNumberOnly(summary?.totalRevenue || 0)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounting.dueAmounts}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.payments}</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-total-paid">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-green-600 truncate">
                      {summaryLoading ? "..." : formatNumberOnly(summary?.totalPaid || 0)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounting.receivedAmounts}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.remaining}</CardTitle>
                  <Wallet className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-total-remaining">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-yellow-600 truncate">
                      {summaryLoading ? "..." : formatNumberOnly(summary?.totalRemaining || 0)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounting.dueBalance}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.expenses}</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-total-expenses">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-red-600 truncate">
                      {summaryLoading ? "..." : formatNumberOnly(summary?.totalExpenses || 0)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounting.totalExpenses}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.netProfit}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-net-profit">
                    <span className={`text-lg md:text-xl font-bold tabular-nums truncate ${(summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryLoading ? "..." : formatNumberOnly(summary?.netProfit || 0)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounting.revenueMinusExpenses}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.collectionRate}</CardTitle>
                  <PieChart className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-xl font-bold tabular-nums text-blue-600" data-testid="text-collection-rate">
                    {summaryLoading ? "..." : `${summary?.collectionRate || 0}%`}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.accounting.paidVsDue}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Monthly Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t.accounting.monthlyTrends}
                  </CardTitle>
                  <CardDescription>{t.accounting.monthlyTrendsDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}م`} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ direction: "rtl" }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey={revenueKey} 
                          stackId="1"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={expensesKey} 
                          stackId="2"
                          stroke="#ef4444" 
                          fill="#ef4444" 
                          fillOpacity={0.3}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={profitKey} 
                          stackId="3"
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Expense by Category Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    {t.accounting.expenseDistribution}
                  </CardTitle>
                  <CardDescription>{t.accounting.expensesByCategory}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t.accounting.serviceProfitability}
                </CardTitle>
                <CardDescription>{t.accounting.serviceProfitabilityDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {serviceProfitability.map((service) => (
                    <Card key={service.serviceType} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{service.serviceName}</CardTitle>
                        <CardDescription>{service.patientCount} {t.accounting.patientCount}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t.accounting.revenueLabel}</span>
                          <span className="font-medium">{displayCurrency(service.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t.accounting.collectedLabel}</span>
                          <span className="font-medium text-green-600">{displayCurrency(service.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t.accounting.remainingLabel}</span>
                          <span className="font-medium text-yellow-600">{displayCurrency(service.remaining)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t.accounting.collectionRateLabel}</span>
                          <Badge variant={service.collectionRate >= 70 ? "default" : service.collectionRate >= 50 ? "secondary" : "destructive"}>
                            {service.collectionRate}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Treatment Type */}
            <AccountingRevenueByTreatment selectedBranch={effectiveBranchFilter} />
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t.accounting.expenseManagement}</h2>
              <Button onClick={openNewExpenseDialog} data-testid="button-add-expense">
                <Plus className="h-4 w-4 ml-2" />
                {t.accounting.addExpense}
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">{t.accounting.branchCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.categoryCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.descriptionCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.amountCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.dateCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.actionsCol}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {t.accounting.loading}
                        </TableCell>
                      </TableRow>
                    ) : expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t.accounting.noExpenses}
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((expense, index) => (
                        <TableRow key={expense.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            {branches.find(b => b.id === expense.branchId)?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ 
                                backgroundColor: `${CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || "#6b7280"}20`,
                                borderColor: CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || "#6b7280"
                              }}
                            >
                              {getCategoryLabelTranslated(expense.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.description || "-"}</TableCell>
                          <TableCell className="font-medium text-red-600">
                            {displayCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {formatDateIraq(expense.expenseDate)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditExpense(expense)}
                                data-testid={`button-edit-expense-${expense.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteExpense(expense.id)}
                                data-testid={`button-delete-expense-${expense.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expense Category Summary */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {EXPENSE_CATEGORIES.map((cat) => {
                const categoryTotal = expensesByCategory.find(e => e.category === cat.value)?.total || 0;
                return (
                  <Card key={cat.value}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{getCategoryLabelTranslated(cat.value)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="text-lg font-bold"
                        style={{ color: CATEGORY_COLORS[cat.value as keyof typeof CATEGORY_COLORS] }}
                      >
                        {displayCurrency(categoryTotal)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t.accounting.invoiceManagement}</h2>
              <Button onClick={openNewInvoiceDialog} data-testid="button-add-invoice">
                <Plus className="h-4 w-4 ml-2" />
                {t.accounting.createInvoice}
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {invoicesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t.accounting.loading}</div>
                ) : invoicesList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">{t.accounting.noInvoices}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.accounting.invoiceNumber}</TableHead>
                        <TableHead>{t.accounting.patientCol}</TableHead>
                        <TableHead>{t.accounting.dateCol}</TableHead>
                        <TableHead>{t.accounting.amountCol}</TableHead>
                        <TableHead>{t.accounting.paidCol}</TableHead>
                        <TableHead>{t.accounting.remainingCol}</TableHead>
                        <TableHead>{t.accounting.statusCol}</TableHead>
                        <TableHead>{t.accounting.actionsCol}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesList.map((invoice) => {
                        const patient = patientsList.find(p => p.id === invoice.patientId);
                        const statusInfo = INVOICE_STATUS[invoice.status as keyof typeof INVOICE_STATUS] || INVOICE_STATUS.pending;
                        const remaining = invoice.total - (invoice.paidAmount || 0);
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{patient?.name || `${t.accounting.patientHash}${invoice.patientId}`}</TableCell>
                            <TableCell>{formatDateIraq(invoice.invoiceDate)}</TableCell>
                            <TableCell>{displayCurrency(invoice.total)}</TableCell>
                            <TableCell className="text-green-600">{displayCurrency(invoice.paidAmount || 0)}</TableCell>
                            <TableCell className={remaining > 0 ? "text-red-600" : "text-green-600"}>{displayCurrency(remaining)}</TableCell>
                            <TableCell>
                              <Badge className={statusInfo.color}>{getStatusLabel(invoice.status)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteConfirmId(invoice.id);
                                    setDeleteType("invoice");
                                  }}
                                  data-testid={`button-delete-invoice-${invoice.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Invoice Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.totalInvoices}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold tabular-nums text-primary">{invoicesList.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.totalAmounts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-blue-600 truncate">
                      {formatNumberOnly(invoicesList.reduce((sum, inv) => sum + inv.total, 0))}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.paid}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-green-600 truncate">
                      {formatNumberOnly(invoicesList.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0))}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.accounting.remaining}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-red-600 truncate">
                      {formatNumberOnly(invoicesList.reduce((sum, inv) => sum + inv.total - (inv.paidAmount || 0), 0))}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-xl font-semibold">
              {isAdmin ? t.accounting.financialReports : `${t.accounting.financialReports} - ${branchSession?.branchName || t.accounting.branch}`}
            </h2>
            
            {/* Branch Comparison - Admin Only or Single Branch View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {isAdmin ? t.accounting.branchComparison : t.accounting.financialSummary}
                </CardTitle>
                <CardDescription>
                  {isAdmin ? t.accounting.analyzeAllBranches : `${t.accounting.analyzeBranch} ${branchSession?.branchName || ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.accounting.branchCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.patientsCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.revenueCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.collectedCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.remainingCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.expensesCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.netProfitCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.collectionCol}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchComparison.map((branch, index) => (
                      <TableRow key={branch.branchId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Badge variant="default">{t.accounting.bestBranch}</Badge>}
                            {branch.branchName}
                          </div>
                        </TableCell>
                        <TableCell>{branch.patientCount}</TableCell>
                        <TableCell>{displayCurrency(branch.totalRevenue)}</TableCell>
                        <TableCell className="text-green-600">{displayCurrency(branch.totalPaid)}</TableCell>
                        <TableCell className="text-yellow-600">{displayCurrency(branch.totalRemaining)}</TableCell>
                        <TableCell className="text-red-600">{displayCurrency(branch.totalExpenses)}</TableCell>
                        <TableCell className={branch.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          {displayCurrency(branch.netProfit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={branch.collectionRate >= 70 ? "default" : branch.collectionRate >= 50 ? "secondary" : "destructive"}>
                            {branch.collectionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Branch Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.accounting.branchChartComparison}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}م`} />
                      <YAxis type="category" dataKey="branchName" width={80} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="totalPaid" name={t.accounting.collectedCol} fill="#10b981" />
                      <Bar dataKey="totalExpenses" name={t.accounting.expensesCol} fill="#ef4444" />
                      <Bar dataKey="netProfit" name={t.accounting.netProfitCol} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">{t.accounting.advancedAnalytics}</h2>

            {/* Monthly Trends Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t.accounting.monthlyPerformance}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t.accounting.monthCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.collectedCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.expensesCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.netProfitCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.collectionRate}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTrends.slice().reverse().map((month) => (
                      <TableRow key={month.monthDate}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-green-600">{displayCurrency(month.totalPaid)}</TableCell>
                        <TableCell className="text-red-600">{displayCurrency(month.totalExpenses)}</TableCell>
                        <TableCell className={month.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          {displayCurrency(month.netProfit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={month.collectionRate >= 70 ? "default" : month.collectionRate >= 50 ? "secondary" : "destructive"}>
                            {month.collectionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debtors Tab */}
          <TabsContent value="debtors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t.accounting.debtorTracking}</h2>
              <Badge variant="destructive" className="text-lg px-4 py-1">
                {debtors.length} {t.accounting.debtorPatient}
              </Badge>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">{t.accounting.patientName}</TableHead>
                      <TableHead className="text-right">{t.accounting.phoneCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.totalCostCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.paidCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.remainingCol}</TableHead>
                      <TableHead className="text-right">{t.accounting.lastPayment}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtorsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {t.accounting.loading}
                        </TableCell>
                      </TableRow>
                    ) : debtors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          {t.accounting.noDebts}
                        </TableCell>
                      </TableRow>
                    ) : (
                      debtors.map((debtor, index) => (
                        <TableRow key={debtor.patient.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{debtor.patient.name}</TableCell>
                          <TableCell>{debtor.patient.phone || "-"}</TableCell>
                          <TableCell>{displayCurrency(debtor.totalCost)}</TableCell>
                          <TableCell className="text-green-600">{displayCurrency(debtor.totalPaid)}</TableCell>
                          <TableCell className="text-red-600 font-bold">{displayCurrency(debtor.remaining)}</TableCell>
                          <TableCell>
                            {debtor.lastPaymentDate ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {formatDateIraq(debtor.lastPaymentDate)}
                              </div>
                            ) : (
                              <Badge variant="destructive">{t.accounting.neverPaid}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {debtors.length > 0 && (
                <CardFooter className="justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    {t.accounting.totalDebts} <span className="font-bold text-red-600">{displayCurrency(debtors.reduce((sum, d) => sum + d.remaining, 0))}</span>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Expense Dialog */}
        <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? t.accounting.editExpense : t.accounting.addNewExpense}
              </DialogTitle>
              <DialogDescription>
                {t.accounting.expenseDetails}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitExpense)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.branchCol}</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-branch">
                            <SelectValue placeholder={t.accounting.selectBranch} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.categoryCol}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue placeholder={t.accounting.selectCategory} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {getCategoryLabelTranslated(cat.value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.amountCurrency}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-expense-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.date}</FormLabel>
                      <DatePickerIraq 
                        value={field.value || ""}
                        onChange={field.onChange}
                        data-testid="input-expense-date"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.description}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.accounting.descriptionPlaceholder} data-testid="input-expense-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.accounting.notes}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t.accounting.notesPlaceholder} data-testid="input-expense-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    {t.accounting.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {editingExpense ? t.accounting.update : t.accounting.add}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Invoice Dialog */}
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.accounting.createNewInvoice}</DialogTitle>
              <DialogDescription>{t.accounting.invoiceDetailsDesc}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.accounting.patient}</label>
                  <select
                    id="invoice-patient"
                    className="w-full p-2 border rounded-md"
                    data-testid="select-invoice-patient"
                  >
                    <option value="">{t.accounting.selectPatient}</option>
                    {patientsList.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.phone || t.accounting.noPhone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.accounting.invoiceDate}</label>
                  <DatePickerIraq
                    value={new Date().toISOString().split("T")[0]}
                    onChange={(val) => {
                      const el = document.getElementById("invoice-date-value") as HTMLInputElement;
                      if (el) el.value = val;
                    }}
                    data-testid="input-invoice-date"
                  />
                  <input type="hidden" id="invoice-date-value" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">{t.accounting.invoiceItems}</label>
                  <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 ml-1" />
                    {t.accounting.addItem}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start border p-2 rounded-md">
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground">{t.accounting.description}</label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                          placeholder={t.accounting.serviceDescription}
                          data-testid={`input-item-description-${index}`}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-muted-foreground">{t.accounting.serviceType}</label>
                        <select
                          value={item.serviceType}
                          onChange={(e) => updateInvoiceItem(index, "serviceType", e.target.value)}
                          className="w-full p-2 border rounded-md text-sm"
                          data-testid={`select-item-service-${index}`}
                        >
                          <option value="">{t.accounting.selectType}</option>
                          {SERVICE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{getServiceTypeLabel(type.value)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">{t.accounting.quantity}</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, "quantity", parseInt(e.target.value) || 1)}
                          data-testid={`input-item-quantity-${index}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">{t.accounting.price}</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(index, "unitPrice", parseInt(e.target.value) || 0)}
                          data-testid={`input-item-price-${index}`}
                        />
                      </div>
                      <div className="col-span-1 pt-5">
                        {invoiceItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInvoiceItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.accounting.discountCurrency}</label>
                  <Input
                    id="invoice-discount"
                    type="number"
                    min="0"
                    defaultValue="0"
                    data-testid="input-invoice-discount"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.accounting.total}</label>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-primary truncate">
                      {formatNumberOnly(invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accounting.notes}</label>
                <Textarea
                  id="invoice-notes"
                  placeholder={t.accounting.invoiceNotesPlaceholder}
                  data-testid="input-invoice-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                {t.accounting.cancel}
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
                data-testid="button-submit-invoice"
              >
                {t.accounting.submitInvoice}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteType(null); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t.accounting.confirmDelete}
              </DialogTitle>
              <DialogDescription>
                {deleteType === "expense" ? t.accounting.confirmDeleteExpense : t.accounting.confirmDeleteInvoice}
                <br />
                <span className="text-red-500 font-medium">{t.accounting.cannotUndo}</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }}>
                {t.accounting.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteExpenseMutation.isPending || deleteInvoiceMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {t.accounting.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Daily cash summary date picker */}
        <Dialog open={isDailyDialogOpen} onOpenChange={setIsDailyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>الملخص اليومي للقاصة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                اختر اليوم المطلوب لتوليد ملف PDF يحتوي على وارد ومصاريف ذلك اليوم،
                صافيه، ورصيد القاصة محسوباً تلقائياً من الأيام السابقة.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">التاريخ</label>
                <DatePickerIraq
                  value={dailySummaryDate}
                  onChange={(val) => setDailySummaryDate(val)}
                  className="w-full"
                  data-testid="input-daily-summary-date"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDailyDialogOpen(false)}
                disabled={dailySummaryLoading}
                data-testid="button-daily-cancel"
              >
                إلغاء
              </Button>
              <Button
                onClick={generateDailySummaryPDF}
                disabled={!dailySummaryDate || dailySummaryLoading}
                className="gap-2"
                data-testid="button-daily-generate"
              >
                <FileDown className="h-4 w-4" />
                {dailySummaryLoading ? "جارٍ التوليد..." : "تصدير PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
