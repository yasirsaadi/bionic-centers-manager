import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { AmiriRegular } from "@/lib/amiri-font";
import ArabicReshaper from "arabic-reshaper";
import { useBranchSession } from "@/components/BranchGate";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + " د.ع";
}

function getCategoryLabel(category: string): string {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
}

export default function Accounting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const branchSession = useBranchSession();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Admin-only access guard - redirect non-admin users
  if (branchSession && !branchSession.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl" data-testid="page-access-denied">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600 flex items-center justify-center gap-2" data-testid="text-access-denied">
              <AlertCircle className="h-6 w-6" />
              غير مصرح بالوصول
            </CardTitle>
            <CardDescription>
              هذه الصفحة متاحة للمسؤولين فقط
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/")} className="gap-2" data-testid="button-go-home">
              <ArrowLeft className="h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"]
  });

  // Fetch accounting summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AccountingSummary>({
    queryKey: ["/api/accounting/summary", selectedBranch, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/accounting/summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    }
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", selectedBranch, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    }
  });

  // Fetch expenses by category
  const { data: expensesByCategory = [] } = useQuery<{category: string, total: number}[]>({
    queryKey: ["/api/expenses/by-category/summary", selectedBranch, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") params.append("branchId", selectedBranch);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/expenses/by-category/summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses by category");
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
    queryKey: ["/api/accounting/branch-comparison", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
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
      toast({ title: "تم إضافة المصروف بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في إضافة المصروف", description: error.message, variant: "destructive" });
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
      toast({ title: "تم تحديث المصروف بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في تحديث المصروف", description: error.message, variant: "destructive" });
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
      toast({ title: "تم حذف المصروف بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في حذف المصروف", description: error.message, variant: "destructive" });
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
    if (confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      deleteExpenseMutation.mutate(id);
    }
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
    ? "جميع الفروع" 
    : branches.find(b => b.id.toString() === selectedBranch)?.name || "غير محدد";

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
    doc.text(reshapeArabic(`الفرع: ${currentBranchName}`), 105, 30, { align: 'center' });
    doc.text(reshapeArabic(`تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}`), 105, 37, { align: 'center' });
    
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
    
    (doc as any).autoTable({
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
      
      (doc as any).autoTable({
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
      
      (doc as any).autoTable({
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
        d.lastPaymentDate ? new Date(d.lastPaymentDate).toLocaleDateString('en-GB') : "-",
        reshapeArabic(formatCurrency(d.remaining)),
        reshapeArabic(formatCurrency(d.totalPaid)),
        reshapeArabic(formatCurrency(d.totalCost)),
        reshapeArabic(d.patient.name),
        String(i + 1)
      ]);
      
      (doc as any).autoTable({
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
    toast({ title: "تم تصدير التقرير بنجاح" });
  }, [summary, expensesByCategory, branchComparison, debtors, currentBranchName, reshapeArabic, toast]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (!summary) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Financial Summary Sheet
    const summaryData = [
      ['التقرير المحاسبي الشامل'],
      ['الفرع', currentBranchName],
      ['تاريخ التقرير', new Date().toLocaleDateString('en-GB')],
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
        new Date(e.expenseDate).toLocaleDateString('en-GB'),
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
        d.lastPaymentDate ? new Date(d.lastPaymentDate).toLocaleDateString('en-GB') : 'لم يدفع'
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
    toast({ title: "تم تصدير التقرير بنجاح" });
  }, [summary, expenses, expensesByCategory, branchComparison, debtors, monthlyTrends, serviceProfitability, branches, currentBranchName, toast]);

  // Prepare chart data
  const expenseChartData = expensesByCategory.map(item => ({
    name: getCategoryLabel(item.category),
    value: item.total,
    color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || "#6b7280"
  }));

  const trendChartData = monthlyTrends.map(item => ({
    month: item.month,
    إيرادات: item.totalPaid,
    مصروفات: item.totalExpenses,
    أرباح: item.netProfit
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
              <h1 className="text-2xl md:text-3xl font-bold">النظام المحاسبي</h1>
              <p className="text-muted-foreground">إدارة شاملة للمصروفات والإيرادات والتقارير المالية</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-40" data-testid="select-branch">
                <SelectValue placeholder="جميع الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفروع</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-36"
              placeholder="من تاريخ"
              data-testid="input-start-date"
            />
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-36"
              placeholder="إلى تاريخ"
              data-testid="input-end-date"
            />
            
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">لوحة التحكم</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2" data-testid="tab-expenses">
              <Receipt className="h-4 w-4" />
              <span className="hidden md:inline">المصروفات</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2" data-testid="tab-reports">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">التقارير</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">التحليلات</span>
            </TabsTrigger>
            <TabsTrigger value="debtors" className="gap-2" data-testid="tab-debtors">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden md:inline">المديونيات</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-primary" data-testid="text-total-revenue">
                    {summaryLoading ? "..." : formatCurrency(summary?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">التكاليف المستحقة</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">المدفوعات</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600" data-testid="text-total-paid">
                    {summaryLoading ? "..." : formatCurrency(summary?.totalPaid || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">المبالغ المستلمة</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">المتبقي</CardTitle>
                  <Wallet className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-yellow-600" data-testid="text-total-remaining">
                    {summaryLoading ? "..." : formatCurrency(summary?.totalRemaining || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">المبالغ المستحقة</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">المصروفات</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600" data-testid="text-total-expenses">
                    {summaryLoading ? "..." : formatCurrency(summary?.totalExpenses || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-profit">
                    {summaryLoading ? "..." : formatCurrency(summary?.netProfit || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">الإيرادات - المصروفات</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">نسبة التحصيل</CardTitle>
                  <PieChart className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600" data-testid="text-collection-rate">
                    {summaryLoading ? "..." : `${summary?.collectionRate || 0}%`}
                  </div>
                  <p className="text-xs text-muted-foreground">المدفوع / المستحق</p>
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
                    الاتجاهات الشهرية
                  </CardTitle>
                  <CardDescription>مقارنة الإيرادات والمصروفات والأرباح</CardDescription>
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
                          dataKey="إيرادات" 
                          stackId="1"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="مصروفات" 
                          stackId="2"
                          stroke="#ef4444" 
                          fill="#ef4444" 
                          fillOpacity={0.3}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="أرباح" 
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
                    توزيع المصروفات
                  </CardTitle>
                  <CardDescription>المصروفات حسب التصنيف</CardDescription>
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
                  ربحية الخدمات
                </CardTitle>
                <CardDescription>تحليل الأداء المالي حسب نوع الخدمة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {serviceProfitability.map((service) => (
                    <Card key={service.serviceType} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{service.serviceName}</CardTitle>
                        <CardDescription>{service.patientCount} مريض</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">الإيرادات:</span>
                          <span className="font-medium">{formatCurrency(service.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المحصل:</span>
                          <span className="font-medium text-green-600">{formatCurrency(service.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المتبقي:</span>
                          <span className="font-medium text-yellow-600">{formatCurrency(service.remaining)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">نسبة التحصيل:</span>
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
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">إدارة المصروفات</h2>
              <Button onClick={openNewExpenseDialog} data-testid="button-add-expense">
                <Plus className="h-4 w-4 ml-2" />
                إضافة مصروف
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الفرع</TableHead>
                      <TableHead className="text-right">التصنيف</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          جارٍ التحميل...
                        </TableCell>
                      </TableRow>
                    ) : expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا توجد مصروفات مسجلة
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
                              {getCategoryLabel(expense.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.description || "-"}</TableCell>
                          <TableCell className="font-medium text-red-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {new Date(expense.expenseDate).toLocaleDateString("en-GB")}
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
                      <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="text-lg font-bold"
                        style={{ color: CATEGORY_COLORS[cat.value as keyof typeof CATEGORY_COLORS] }}
                      >
                        {formatCurrency(categoryTotal)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-xl font-semibold">التقارير المالية</h2>
            
            {/* Branch Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  مقارنة الفروع
                </CardTitle>
                <CardDescription>تحليل أداء جميع الفروع</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الفرع</TableHead>
                      <TableHead className="text-right">المرضى</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                      <TableHead className="text-right">المحصل</TableHead>
                      <TableHead className="text-right">المتبقي</TableHead>
                      <TableHead className="text-right">المصروفات</TableHead>
                      <TableHead className="text-right">صافي الربح</TableHead>
                      <TableHead className="text-right">التحصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchComparison.map((branch, index) => (
                      <TableRow key={branch.branchId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Badge variant="default">الأفضل</Badge>}
                            {branch.branchName}
                          </div>
                        </TableCell>
                        <TableCell>{branch.patientCount}</TableCell>
                        <TableCell>{formatCurrency(branch.totalRevenue)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(branch.totalPaid)}</TableCell>
                        <TableCell className="text-yellow-600">{formatCurrency(branch.totalRemaining)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(branch.totalExpenses)}</TableCell>
                        <TableCell className={branch.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(branch.netProfit)}
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
                <CardTitle>مقارنة بيانية للفروع</CardTitle>
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
                      <Bar dataKey="totalPaid" name="المحصل" fill="#10b981" />
                      <Bar dataKey="totalExpenses" name="المصروفات" fill="#ef4444" />
                      <Bar dataKey="netProfit" name="صافي الربح" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">التحليلات المتقدمة</h2>

            {/* Monthly Trends Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  تفاصيل الأداء الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الشهر</TableHead>
                      <TableHead className="text-right">المحصل</TableHead>
                      <TableHead className="text-right">المصروفات</TableHead>
                      <TableHead className="text-right">صافي الربح</TableHead>
                      <TableHead className="text-right">نسبة التحصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTrends.slice().reverse().map((month) => (
                      <TableRow key={month.monthDate}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(month.totalPaid)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(month.totalExpenses)}</TableCell>
                        <TableCell className={month.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(month.netProfit)}
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
              <h2 className="text-xl font-semibold">متابعة المديونيات</h2>
              <Badge variant="destructive" className="text-lg px-4 py-1">
                {debtors.length} مريض مدين
              </Badge>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">اسم المريض</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">إجمالي التكلفة</TableHead>
                      <TableHead className="text-right">المدفوع</TableHead>
                      <TableHead className="text-right">المتبقي</TableHead>
                      <TableHead className="text-right">آخر دفعة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtorsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          جارٍ التحميل...
                        </TableCell>
                      </TableRow>
                    ) : debtors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          لا توجد مديونيات مستحقة
                        </TableCell>
                      </TableRow>
                    ) : (
                      debtors.map((debtor, index) => (
                        <TableRow key={debtor.patient.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{debtor.patient.name}</TableCell>
                          <TableCell>{debtor.patient.phone || "-"}</TableCell>
                          <TableCell>{formatCurrency(debtor.totalCost)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(debtor.totalPaid)}</TableCell>
                          <TableCell className="text-red-600 font-bold">{formatCurrency(debtor.remaining)}</TableCell>
                          <TableCell>
                            {debtor.lastPaymentDate ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {new Date(debtor.lastPaymentDate).toLocaleDateString("en-GB")}
                              </div>
                            ) : (
                              <Badge variant="destructive">لم يدفع</Badge>
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
                    إجمالي المديونيات: <span className="font-bold text-red-600">{formatCurrency(debtors.reduce((sum, d) => sum + d.remaining, 0))}</span>
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
                {editingExpense ? "تعديل مصروف" : "إضافة مصروف جديد"}
              </DialogTitle>
              <DialogDescription>
                أدخل تفاصيل المصروف
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitExpense)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفرع</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-branch">
                            <SelectValue placeholder="اختر الفرع" />
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
                      <FormLabel>التصنيف</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
                      <FormLabel>المبلغ (د.ع)</FormLabel>
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
                      <FormLabel>التاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expense-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="وصف مختصر للمصروف" data-testid="input-expense-description" />
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
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="ملاحظات إضافية" data-testid="input-expense-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {editingExpense ? "تحديث" : "إضافة"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
