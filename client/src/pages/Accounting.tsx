import { useState, useCallback, useEffect } from "react";
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
  Sparkles,
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
  FileSpreadsheet,
  Search,
  X
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

// Labels match the categories returned by the AI categorize endpoint exactly,
// so the AI suggestion can be matched on either `label` or `value`.
const EXPENSE_CATEGORIES = [
  { value: "salaries", label: "رواتب" },
  { value: "rent", label: "إيجارات" },
  { value: "medical_supplies", label: "مستلزمات طبية" },
  { value: "maintenance", label: "صيانة" },
  { value: "utilities", label: "كهرباء ومياه" },
  { value: "communications", label: "اتصالات" },
  { value: "marketing", label: "تسويق" },
  { value: "transport", label: "نقل" },
  { value: "hospitality", label: "ضيافة" },
  { value: "stationery", label: "قرطاسية" },
  { value: "bank_fees", label: "رسوم بنكية" },
  { value: "other", label: "أخرى" }
];

const CATEGORY_COLORS: Record<string, string> = {
  salaries: "#3b82f6",
  rent: "#f59e0b",
  medical_supplies: "#10b981",
  maintenance: "#8b5cf6",
  utilities: "#ec4899",
  communications: "#06b6d4",
  marketing: "#ef4444",
  transport: "#14b8a6",
  hospitality: "#f97316",
  stationery: "#a855f7",
  bank_fees: "#64748b",
  other: "#6b7280"
};

const expenseFormSchema = z.object({
  branchId: z.number(),
  category: z.string().min(1, "يرجى اختيار التصنيف"),
  subcategory: z.string().optional(),
  amount: z.number().min(1, "المبلغ يجب أن يكون أكبر من صفر"),
  description: z.string().optional(),
  expenseDate: z.string().min(1, "يرجى اختيار التاريخ"),
  notes: z.string().optional()
}).refine(
  (data) => data.category !== "other" || (data.subcategory && data.subcategory.trim().length > 0),
  {
    path: ["subcategory"],
    message: "عند اختيار 'أخرى'، يجب كتابة تصنيف فرعي يوضّح طبيعة المصروف",
  }
);

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface Branch {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  branchId: number;
  category: string;
  subcategory: string | null;
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

interface Vendor {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string | null;
  notes: string | null;
  isActive: boolean | null;
}

interface Purchase {
  id: number;
  purchaseNumber: string;
  vendorId: number;
  branchId: number;
  purchaseDate: string;
  dueDate: string | null;
  category: string;
  description: string | null;
  vendorInvoiceNumber: string | null;
  totalAmount: number;
  paidAmount: number | null;
  status: string;
  paymentMethod: string;
  notes: string | null;
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
  // Use Western thousand separator (comma at baseline) then convert digits
  // to Arabic-Indic. The default `ar-IQ` locale yields the high-positioned
  // Arabic thousands separator (٬, U+066C) which looks like a stray
  // apostrophe in PDF rendering and confuses readers.
  const western = new Intl.NumberFormat("en-US").format(amount);
  const arabicized = western.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  return arabicized + " د.ع";
}

// Returns the number portion only (no currency suffix), formatted with
// thousand separators for the Iraqi Arabic locale. Use this when the
// currency label is rendered as a separate styled span.
function formatNumberOnly(amount: number): string {
  const western = new Intl.NumberFormat("en-US").format(amount);
  return western.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

// Converts Arabic-Indic digits (٠-٩) to Western (0-9) so amount fields
// accept either keyboard. Also strips anything that isn't a digit or a
// decimal point — protects against accidental letter input. Critical for
// accounting inputs where a typo can corrupt totals.
function arabicDigitsToWestern(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d.]/g, "");
}

function getCategoryLabel(category: string): string {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
}

interface TreatmentRevenueData {
  treatmentType: string;
  totalAmount: number;
  count: number;
  subBreakdown?: { name: string; totalAmount: number; count: number }[];
}

// Top-level clinical category palette. Each of the three buckets gets a
// distinct, semantically-loaded colour:
//   - Prosthetics  → indigo (the highest-revenue category, deserves visual weight)
//   - Physiotherapy → teal-green (the broadest, mixed-modality category)
//   - Medical supports → amber
//   - Unknown → muted grey (should be empty in practice; signals data quality)
const TREATMENT_TYPE_COLORS: Record<string, string> = {
  "طرف صناعي": "#4F46E5",
  "علاج طبيعي": "#10B981",
  "مساند طبية": "#F59E0B",
  "غير محدد": "#9CA3AF",
};

// Sub-types within physiotherapy get their own palette so the inner
// breakdown legend is colour-coded too.
const PT_SUBTYPE_COLORS = ["#10B981", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];

interface PatientFinancialSummary {
  patientId: number;
  unpaidCount: number;
  totalDue: number;
  overdueCount: number;
  oldestUnpaidDate: string | null;
  totalPaidLifetime: number;
  sessionPaid: number;
  invoicePaid: number;
  totalInvoiced: number;
  paymentCountLifetime: number;
  lastPaymentDate: string | null;
  totalCost: number;
  availableCredit: number;
}

// Contextual card shown after a patient is selected in the invoice
// form. Always renders something so the accountant knows the system
// did consult the patient's history — even when there's nothing to
// report. Two information blocks:
//   1. Lifetime payment summary (always visible, color-coded by amount).
//   2. Outstanding-invoice warning (only when the patient owes money).
function PatientFinancialChip({ patientId }: { patientId: number | null }) {
  const { data, isLoading } = useQuery<PatientFinancialSummary>({
    queryKey: ["/api/patients", patientId, "financial-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/financial-summary`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: patientId !== null,
    staleTime: 30 * 1000,
  });

  if (patientId === null) return null;
  if (isLoading || !data) {
    return (
      <div className="mt-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        جارٍ جلب سجلّ المريض المالي…
      </div>
    );
  }

  const hasLifetime = data.paymentCountLifetime > 0;
  const hasUnpaid = data.unpaidCount > 0;
  const isSevere = data.overdueCount > 0;

  return (
    <div className="mt-2 space-y-1.5" data-testid="patient-financial-chip">
      <div
        className={`rounded-md border-r-4 px-3 py-2 text-xs space-y-0.5 ${
          hasLifetime
            ? "border-r-emerald-500 bg-emerald-50 text-emerald-900"
            : "border-r-slate-300 bg-muted/40 text-muted-foreground"
        }`}
      >
        <div className="font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          سجلّ الدفعات السابقة
        </div>
        {hasLifetime ? (
          <>
            <div>
              إجمالي ما دفعه المريض سابقاً:{" "}
              <span className="font-bold tabular-nums">{formatCurrency(data.totalPaidLifetime)}</span>
              {" "}
              عبر {data.paymentCountLifetime} دفعة
            </div>
            {data.sessionPaid > 0 && (
              <div className="opacity-80">
                — منها {formatCurrency(data.sessionPaid)} دفعات جلسات/زيارات
              </div>
            )}
            {data.invoicePaid > 0 && (
              <div className="opacity-80">
                — منها {formatCurrency(data.invoicePaid)} على فواتير سابقة
              </div>
            )}
            {data.lastPaymentDate && (
              <div className="opacity-80">
                آخر دفعة: {new Date(data.lastPaymentDate).toLocaleDateString("ar-IQ")}
              </div>
            )}
          </>
        ) : (
          <div>لا توجد دفعات سابقة لهذا المريض في النظام.</div>
        )}
        {data.totalCost > 0 && (
          <div className="opacity-80">
            إجمالي الكلفة المسجَّلة على ملفّه: {formatCurrency(data.totalCost)}
          </div>
        )}
      </div>
      {data.availableCredit > 0 && (
        <div className="rounded-md border-r-4 border-r-primary bg-primary/10 text-primary-foreground px-3 py-2 text-xs space-y-0.5">
          <div className="font-semibold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            رصيد متاح للتطبيق التلقائي
          </div>
          <div className="text-foreground/90">
            دفعات سابقة بقيمة{" "}
            <span className="font-bold tabular-nums">{formatCurrency(data.availableCredit)}</span>
            {" "}
            لم تُربط بأيّ فاتورة بعد. سيُطبَّق منها تلقائياً على هذه الفاتورة عند الحفظ.
          </div>
        </div>
      )}
      {hasUnpaid && (
        <div
          className={`rounded-md border-r-4 px-3 py-2 text-xs space-y-0.5 ${
            isSevere
              ? "border-r-amber-500 bg-amber-50 text-amber-900"
              : "border-r-blue-500 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {isSevere
              ? `هذا المريض عليه ${data.overdueCount} فاتورة متأخّرة`
              : `هذا المريض لديه ${data.unpaidCount} فاتورة غير مدفوعة`}
          </div>
          <div>المتبقّي عليه: {formatCurrency(data.totalDue)}</div>
          <div className="opacity-80">
            فكّر بتسجيل الدفعة على الفاتورة القديمة بدل إنشاء فاتورة جديدة.
          </div>
        </div>
      )}
    </div>
  );
}

interface MonthlyNarrativeResponse {
  narrative: string;
  generatedAt: string;
  snapshot: {
    branchName: string | null;
    month: string;
    current: { revenue: { total: number }; expenses: { total: number }; newPatients: number };
    delta: { revenuePct: number | null; expensesPct: number | null; netPct: number | null };
  };
}

// Renders the markdown-ish narrative the model returns.
// We don't parse full markdown — just bold the H2 headings and break
// paragraphs / bullets. Keeps the bundle small (no extra dep) and
// works for the predictable structure we ask the model to use.
function NarrativeBody({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-primary mt-2">
              {block.replace(/^##\s*/, "")}
            </h3>
          );
        }
        if (/^\s*-\s/.test(block)) {
          const items = block
            .split(/\n/)
            .filter((l) => l.trim())
            .map((l) => l.replace(/^\s*-\s*/, ""));
          return (
            <ul key={idx} className="list-disc pr-5 space-y-1">
              {items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function MonthlyNarrativeCard({
  isAdmin,
  allowedBranches,
  defaultBranchId,
}: {
  isAdmin: boolean;
  allowedBranches: { id: number; name: string }[];
  defaultBranchId: number | null;
}) {
  const { toast } = useToast();
  // Default month = previous month (most useful: the just-closed period).
  const today = new Date();
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const defaultMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [branchId, setBranchId] = useState<number | null>(defaultBranchId);
  const [report, setReport] = useState<MonthlyNarrativeResponse | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/monthly-report", {
        month,
        branchId: isAdmin ? branchId : undefined,
      });
      return res.json() as Promise<MonthlyNarrativeResponse>;
    },
    onSuccess: (data) => {
      setReport(data);
    },
    onError: (err: any) => {
      toast({
        title: "تعذّر توليد التقرير",
        description: err?.message ?? "حاول لاحقاً",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          تقرير سردي شهري ذكي
        </CardTitle>
        <CardDescription>
          ملخّص تنفيذي بالعربية مبني على البيانات الحقيقية للشهر المختار، مع مقارنة بالشهر السابق وتوصيات.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">الشهر</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              data-testid="input-monthly-report-month"
            />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفرع</label>
              <select
                className="w-full p-2 border rounded-md text-sm bg-background"
                value={branchId ?? ""}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                data-testid="select-monthly-report-branch"
              >
                <option value="">كل الفروع</option>
                {allowedBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-monthly-report"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جارٍ التوليد…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  توليد التقرير
                </>
              )}
            </Button>
          </div>
        </div>

        {report && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="text-sm">
                <div className="font-semibold">
                  {report.snapshot.branchName ?? "كل الفروع"} — {report.snapshot.month}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  وُلِّد في {new Date(report.generatedAt).toLocaleString("ar-IQ")}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(report.narrative);
                  toast({ title: "نُسخ التقرير" });
                }}
              >
                نسخ
              </Button>
            </div>
            <NarrativeBody text={report.narrative} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AuditFinding {
  severity: "low" | "medium" | "high";
  category: string;
  title: string;
  description: string;
  suggestedAction: string;
}

interface SmartAuditResponse {
  findings: AuditFinding[];
  summary: string;
  generatedAt: string;
  snapshot: { branchName: string | null; windowDays: number };
}

const SEVERITY_STYLES: Record<AuditFinding["severity"], { badge: string; border: string }> = {
  high: {
    badge: "bg-red-100 text-red-800 border-red-200",
    border: "border-r-red-500 bg-red-50",
  },
  medium: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "border-r-amber-500 bg-amber-50",
  },
  low: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    border: "border-r-blue-500 bg-blue-50",
  },
};

const SEVERITY_LABEL: Record<AuditFinding["severity"], string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

function SmartAuditCard({
  isAdmin,
  allowedBranches,
  defaultBranchId,
}: {
  isAdmin: boolean;
  allowedBranches: { id: number; name: string }[];
  defaultBranchId: number | null;
}) {
  const { toast } = useToast();
  const [windowDays, setWindowDays] = useState(30);
  const [branchId, setBranchId] = useState<number | null>(defaultBranchId);
  const [audit, setAudit] = useState<SmartAuditResponse | null>(null);

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/smart-audit", {
        windowDays,
        branchId: isAdmin ? branchId : undefined,
      });
      return res.json() as Promise<SmartAuditResponse>;
    },
    onSuccess: (data) => setAudit(data),
    onError: (err: any) =>
      toast({
        title: "تعذّر تشغيل التدقيق",
        description: err?.message ?? "حاول لاحقاً",
        variant: "destructive",
      }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          تدقيق محاسبي ذكي
        </CardTitle>
        <CardDescription>
          مراجعة دوريّة معمّقة عبر آخر 30/60/90 يوماً. يلتقط أنماطاً يصعب على القواعد الفوريّة كشفها — تركّز موردين، توزيع توقيت الدفعات، شيخوخة الذمم، ومعدّلات الخصم.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">نطاق التدقيق</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="w-full p-2 border rounded-md text-sm bg-background"
              data-testid="select-audit-window"
            >
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوماً</option>
              <option value={60}>آخر 60 يوماً</option>
              <option value={90}>آخر 90 يوماً</option>
            </select>
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفرع</label>
              <select
                className="w-full p-2 border rounded-md text-sm bg-background"
                value={branchId ?? ""}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                data-testid="select-audit-branch"
              >
                <option value="">كل الفروع</option>
                {allowedBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => auditMutation.mutate()}
              disabled={auditMutation.isPending}
              className="w-full"
              data-testid="button-run-smart-audit"
            >
              {auditMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جارٍ التدقيق…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  تشغيل التدقيق
                </>
              )}
            </Button>
          </div>
        </div>

        {audit && (
          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">
                وُلِّد في {new Date(audit.generatedAt).toLocaleString("ar-IQ")} —
                {" "}{audit.snapshot.branchName ?? "كل الفروع"} —
                آخر {audit.snapshot.windowDays} يوماً
              </div>
              <p className="text-sm leading-relaxed">{audit.summary}</p>
            </div>

            {audit.findings.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                لا توجد ملاحظات تستوجب الانتباه. الوضع المحاسبي طبيعي.
              </div>
            ) : (
              <div className="space-y-2">
                {audit.findings.map((f, i) => {
                  const styles = SEVERITY_STYLES[f.severity];
                  return (
                    <div key={i} className={`border-r-4 rounded-md p-3 ${styles.border}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-semibold text-sm">{f.title}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.badge} shrink-0`}>
                          {SEVERITY_LABEL[f.severity]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{f.category}</div>
                      <p className="text-sm leading-relaxed mb-2">{f.description}</p>
                      <div className="text-xs bg-background/60 rounded px-2 py-1.5 border">
                        <span className="font-semibold">إجراء مقترح: </span>
                        {f.suggestedAction}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ExpenseHint {
  severity: "info" | "warning";
  message: string;
}

// Real-time guidance for the expense form. Watches description / amount /
// category, debounces 350ms, and pings the server for rule-based hints
// (free — no AI calls). Renders a small stack of cards under the form.
// Stays empty when there's nothing to say so it doesn't clutter the
// happy path.
function ExpenseHintsPanel({
  description,
  amount,
  category,
}: {
  description: string;
  amount: number;
  category: string;
}) {
  const [debounced, setDebounced] = useState({ description, amount, category });

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ description, amount, category }), 350);
    return () => clearTimeout(t);
  }, [description, amount, category]);

  const { data } = useQuery<{ hints: ExpenseHint[]; source: string }>({
    queryKey: ["/api/guidance/expense", debounced],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/guidance/expense", debounced);
      return res.json();
    },
    enabled:
      (debounced.description?.trim().length ?? 0) > 0 ||
      debounced.amount > 0 ||
      !debounced.category,
    staleTime: 30 * 1000,
  });

  const hints = data?.hints ?? [];
  if (hints.length === 0) return null;

  return (
    <div className="space-y-1.5" data-testid="expense-hints">
      {hints.map((h, i) => (
        <div
          key={i}
          className={`rounded-md border-r-4 px-3 py-2 text-xs flex items-start gap-2 ${
            h.severity === "warning"
              ? "border-r-amber-500 bg-amber-50 text-amber-900"
              : "border-r-blue-500 bg-blue-50 text-blue-900"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{h.message}</span>
        </div>
      ))}
    </div>
  );
}

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

  // Sort with prosthetics first, then physio, then supports, so the
  // legend always reads in a stable clinical order regardless of which
  // bucket happens to be biggest.
  const order = ["طرف صناعي", "علاج طبيعي", "مساند طبية", "غير محدد"];
  const sortedRevenue = [...revenueByTreatment].sort(
    (a, b) => order.indexOf(a.treatmentType) - order.indexOf(b.treatmentType)
  );

  const chartData = sortedRevenue.map((item) => ({
    name: item.treatmentType,
    value: item.totalAmount,
    count: item.count,
    color: TREATMENT_TYPE_COLORS[item.treatmentType] || "#6b7280",
    subBreakdown: item.subBreakdown ?? [],
  }));

  // Find the physiotherapy bucket so we can show its sub-types as a
  // small breakdown alongside the main pie. This is the user's request:
  // "علاج طبيعي" is one bucket, but they still want visibility into
  // which sub-modalities (روبوت / أجهزة / تمارين / أبر صينية) drove it.
  const physioBucket = chartData.find((c) => c.name === "علاج طبيعي");
  const physioSubtypes = (physioBucket?.subBreakdown ?? [])
    .filter((s) => s.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

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
        {physioSubtypes.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TREATMENT_TYPE_COLORS["علاج طبيعي"] }} />
              تفاصيل العلاج الطبيعي
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              توزيع داخلي لإيرادات العلاج الطبيعي حسب نوع الجلسة المُقدَّمة.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {physioSubtypes.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PT_SUBTYPE_COLORS[i % PT_SUBTYPE_COLORS.length] }}
                    />
                    <span className="text-xs truncate">{s.name}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums shrink-0">
                    {formatCurrency(s.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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

// Friendly Arabic labels for the anomaly_decisions row metadata.
function anomalyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    expense_amount_outlier: "مصروف بمبلغ غير معتاد",
    expense_duplicate: "مصاريف مكرَّرة",
    invoice_overdue: "فاتورة متأخّرة",
    patient_no_payment: "مريض بدون دفعات",
  };
  return map[type] ?? type;
}

function sourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    expense: "مصروف",
    invoice: "فاتورة",
    patient: "مريض",
  };
  return map[type] ?? type;
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
  const [invoicePatientId, setInvoicePatientId] = useState<number | null>(null);
  const [invoicePatientSearch, setInvoicePatientSearch] = useState("");
  const [isInvoicePatientListOpen, setIsInvoicePatientListOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<"expense" | "invoice" | "vendor" | "purchase" | null>(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [vendorPaymentTarget, setVendorPaymentTarget] = useState<Purchase | null>(null);
  const [vendorPaymentAmount, setVendorPaymentAmount] = useState<string>("");
  // Read-only patient record viewer for the debtors tab — accountants can
  // open it to understand who a debtor is and what services they received,
  // but cannot edit or add anything from this surface.
  const [viewingPatientId, setViewingPatientId] = useState<number | null>(null);
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

  // Branches the current user is allowed to operate on. Admins see every
  // branch; non-admins (accountant, branch staff, …) see only their own.
  // This is what every form-side branch picker must use — the unfiltered
  // `branches` is fine for read-only labels (e.g. "show me which branch
  // this expense is in") but never for selection, otherwise a non-admin
  // could file an expense / purchase / invoice against another branch.
  const allowedBranches = isAdmin
    ? branches
    : branches.filter((b) => b.id === userBranchId);

  // Probe whether AI features are available (i.e. ANTHROPIC_API_KEY is set
  // server-side). Used to gracefully hide AI buttons when they wouldn't work.
  const { data: aiStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/ai/status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/status", { credentials: "include" });
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const aiEnabled = aiStatus?.enabled ?? false;
  const [aiCategorySuggesting, setAiCategorySuggesting] = useState(false);

  // Fetch today's cash summary (today's revenue + closing balance)
  // for the two extra KPI cards on the dashboard.
  const todayISO = new Date().toISOString().split("T")[0];
  const { data: todaySummary } = useQuery<{
    todayRevenue: number;
    todayClosing: number;
  }>({
    queryKey: ["/api/accounting/daily-summary", effectiveBranchFilter, todayISO],
    queryFn: async () => {
      const params = new URLSearchParams({ date: todayISO });
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      const res = await fetch(`/api/accounting/daily-summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch today summary");
      return res.json();
    },
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

  // Bulk-fetch items for the visible invoices so the table can show
  // a service description per row. One round-trip total instead of
  // one per invoice.
  const invoiceIds = invoicesList.map((i) => i.id).join(",");
  const { data: invoiceItemsForList = [] } = useQuery<{
    id: number; invoiceId: number; description: string; serviceType: string; quantity: number; unitPrice: number; total: number;
  }[]>({
    queryKey: ["/api/invoice-items/bulk", invoiceIds],
    queryFn: async () => {
      if (!invoiceIds) return [];
      const res = await fetch(`/api/invoice-items/bulk?invoiceIds=${invoiceIds}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: invoiceIds.length > 0,
  });

  // Build a map: invoiceId → readable summary string of its items.
  // First two descriptions joined; falls back to "—" if no items.
  const itemsByInvoiceId = new Map<number, string>();
  {
    const grouped = new Map<number, string[]>();
    for (const it of invoiceItemsForList) {
      const arr = grouped.get(it.invoiceId) ?? [];
      if (it.description) arr.push(it.description);
      grouped.set(it.invoiceId, arr);
    }
    for (const [id, descs] of grouped) {
      if (descs.length === 0) continue;
      const head = descs.slice(0, 2).join("، ");
      const more = descs.length > 2 ? ` (+${descs.length - 2})` : "";
      itemsByInvoiceId.set(id, head + more);
    }
  }

  // Fetch vendors (active only)
  const { data: vendorsList = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const res = await fetch(`/api/vendors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  // Fetch purchases for the active branch + date filter
  const { data: purchasesList = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases", effectiveBranchFilter, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`/api/purchases?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
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

  // Anomaly alerts — surfaces flagged expenses, duplicates, overdue
  // invoices, and patients with no payments. Server enforces branch
  // isolation, so the accountant only ever sees their own branch.
  type Anomaly = {
    id: string;
    type: "expense_amount_outlier" | "expense_duplicate" | "invoice_overdue" | "patient_no_payment";
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    date: string;
    branchId: number;
    branchName?: string;
    source: { type: "expense" | "invoice" | "patient"; id: number; name?: string };
    amount?: number;
    context?: Record<string, unknown>;
  };
  const { data: anomalies = [] } = useQuery<Anomaly[]>({
    queryKey: ["/api/anomalies", effectiveBranchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveBranchFilter !== "all") params.append("branchId", effectiveBranchFilter);
      const res = await fetch(`/api/anomalies?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  // Anomalies the user has dismissed in the current session — used for
  // optimistic UI so a click on "صحيح" / "ليس خطأ" hides the row
  // instantly while the server catches up.
  const [optimisticallyDismissed, setOptimisticallyDismissed] = useState<Set<string>>(new Set());

  // Visible anomalies = server-returned minus the ones the user just
  // dismissed in this session. Computed before any render so the badge
  // count and the list both update together.
  const visibleAnomalies = anomalies.filter((a) => !optimisticallyDismissed.has(a.id));

  // Decisions log fetched alongside anomalies so the "قرارات سابقة"
  // section under the anomalies tab can render with names and undo
  // buttons.
  interface AnomalyDecisionRow {
    id: number;
    anomalyType: string;
    sourceType: string;
    sourceId: number;
    decision: "reviewed" | "not_error";
    reason: string | null;
    branchId: number | null;
    userId: number | null;
    userName: string | null;
    expiresAt: string | null;
    createdAt: string;
  }
  const { data: anomalyDecisionsList = [] } = useQuery<AnomalyDecisionRow[]>({
    queryKey: ["/api/anomalies/decisions"],
    queryFn: async () => {
      const res = await fetch("/api/anomalies/decisions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Cache of AI explanations keyed by anomaly id so that re-clicking the
  // explain button doesn't fire a second LLM call. Re-set when the user
  // clicks "اشرح بالذكاء" the first time.
  const [anomalyExplanations, setAnomalyExplanations] = useState<Record<string, string>>({});
  const [anomalyExplaining, setAnomalyExplaining] = useState<string | null>(null);
  // For the "ليس خطأ" decision dialog — captures the optional reason
  // before submitting so it gets stored alongside the suppression.
  const [notErrorTarget, setNotErrorTarget] = useState<Anomaly | null>(null);
  const [notErrorReason, setNotErrorReason] = useState<string>("");

  const recordAnomalyDecision = async (
    anomaly: Anomaly,
    decision: "reviewed" | "not_error",
    reason?: string
  ) => {
    // Optimistic: hide the anomaly card immediately. If the save fails
    // we reverse this and show an error.
    setOptimisticallyDismissed((prev) => {
      const next = new Set(prev);
      next.add(anomaly.id);
      return next;
    });
    try {
      const res = await fetch("/api/anomalies/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          anomalyType: anomaly.type,
          sourceType: anomaly.source.type,
          sourceId: anomaly.source.id,
          decision,
          reason: reason || null,
          branchId: anomaly.branchId,
        }),
      });
      if (!res.ok) {
        // Roll back optimistic hide on failure.
        setOptimisticallyDismissed((prev) => {
          const next = new Set(prev);
          next.delete(anomaly.id);
          return next;
        });
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "تعذّر حفظ القرار", variant: "destructive" });
        return;
      }
      toast({
        title:
          decision === "reviewed"
            ? "تمّ. سيختفي التنبيه لمدّة شهر، ثمّ يعود تذكيراً إن لم يُحَلّ."
            : "تمّ. هذا التنبيه لن يظهر مجدّداً.",
      });
      // Refresh both the anomalies list and the decisions log so the
      // accountant sees the moved item in "قرارات سابقة".
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies/decisions"] });
      setNotErrorTarget(null);
      setNotErrorReason("");
    } catch (err: any) {
      setOptimisticallyDismissed((prev) => {
        const next = new Set(prev);
        next.delete(anomaly.id);
        return next;
      });
      toast({ title: "تعذّر الاتصال بالخادم", description: err.message, variant: "destructive" });
    }
  };

  const undoAnomalyDecision = async (decisionId: number) => {
    try {
      const res = await fetch(`/api/anomalies/decisions/${decisionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "تعذّر التراجع", variant: "destructive" });
        return;
      }
      toast({ title: "تمّ التراجع. سيظهر التنبيه مجدّداً." });
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies/decisions"] });
    } catch (err: any) {
      toast({ title: "تعذّر الاتصال بالخادم", description: err.message, variant: "destructive" });
    }
  };

  const explainAnomalyAi = async (anomaly: Anomaly) => {
    if (anomalyExplanations[anomaly.id]) return; // already cached
    setAnomalyExplaining(anomaly.id);
    try {
      const res = await fetch("/api/ai/explain-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ anomaly }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "تعذّر الشرح", variant: "destructive" });
        return;
      }
      setAnomalyExplanations((prev) => ({ ...prev, [anomaly.id]: data.explanation as string }));
    } catch (err: any) {
      toast({ title: "خطأ في الاتصال", description: err.message, variant: "destructive" });
    } finally {
      setAnomalyExplaining(null);
    }
  };

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

  // Patient details for the read-only debtor record viewer.
  // Server enforces branch access, so the accountant only ever gets back
  // patients from their own branch.
  const { data: patientRecord, isLoading: patientRecordLoading } = useQuery<{
    id: number;
    name: string;
    age?: string | null;
    phone?: string | null;
    branchId: number;
    medicalCondition?: string | null;
    treatmentType?: string | null;
    isAmputee?: boolean | null;
    isPhysiotherapy?: boolean | null;
    isMedicalSupport?: boolean | null;
    totalCost: number;
    classification?: string | null;
    createdAt?: string | null;
    visits?: Array<{
      id: number;
      visitDate: string;
      treatmentType?: string | null;
      sessionCount?: number | null;
      cost?: number | null;
      notes?: string | null;
      details?: string | null;
    }>;
    payments?: Array<{
      id: number;
      date: string;
      amount: number;
      paymentTreatmentType?: string | null;
      sessionCount?: number | null;
      notes?: string | null;
    }>;
  }>({
    queryKey: ["/api/patients", viewingPatientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${viewingPatientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر جلب سجل المريض");
      return res.json();
    },
    enabled: viewingPatientId !== null,
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
      subcategory: "",
      amount: 0,
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
      notes: ""
    }
  });

  // Watch category so the subcategory autocomplete loads suggestions for the
  // currently-selected category, and so we can highlight the field as required
  // when the user picks "أخرى".
  const watchedCategory = form.watch("category");
  const subcategoryRequired = watchedCategory === "other";

  // Pull previously-used subcategories for this category in the user's branch.
  // Used to populate the <datalist> the subcategory input is bound to so
  // accountants build a self-organising taxonomy instead of typo-fragmenting.
  const { data: subcategorySuggestions = [] } = useQuery<string[]>({
    queryKey: ["/api/expenses/subcategories", watchedCategory],
    queryFn: async () => {
      if (!watchedCategory) return [];
      const params = new URLSearchParams({ category: watchedCategory });
      const res = await fetch(`/api/expenses/subcategories?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!watchedCategory && isExpenseDialogOpen,
    staleTime: 30 * 1000,
  });

  // Asks the server's AI helper to map a free-form expense description to one
  // of the 12 fixed categories, then writes the suggestion into the form.
  const suggestCategoryFromAi = async () => {
    const description = form.getValues("description")?.trim();
    if (!description) {
      toast({
        title: "اكتب وصف المصروف أولاً",
        description: "نحتاج وصفاً مختصراً (مثل: شراء أوراق طباعة) لاقتراح الفئة",
        variant: "destructive",
      });
      return;
    }
    setAiCategorySuggesting(true);
    try {
      const res = await fetch("/api/ai/categorize-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description }),
      });
      // Some failure modes (502 / HTML error pages) return non-JSON;
      // read text first and try to parse, falling back to a usable
      // status message instead of throwing a generic "connection error".
      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        let title = data?.error || "تعذّر الاقتراح";
        if (data?.reason === "disabled") {
          title = "خدمة الذكاء الاصطناعي غير مفعّلة على الخادم";
        } else if (data?.reason === "rate_limit") {
          title = "تجاوز حدّ الطلبات. حاول بعد قليل.";
        } else if (res.status === 502 || res.status === 503) {
          title = "خدمة الذكاء غير متاحة الآن. حاول لاحقاً.";
        }
        toast({ title, variant: "destructive" });
        return;
      }
      // The API returns the Arabic category name; the EXPENSE_CATEGORIES
      // dropdown stores its value in English (e.g. "salaries"). Translate.
      const category = data?.category as string;
      const matched = EXPENSE_CATEGORIES.find(
        (c) => c.label === category || c.value === category
      );
      if (!matched) {
        toast({ title: `تعذّر مطابقة الفئة: ${category}`, variant: "destructive" });
        return;
      }
      form.setValue("category", matched.value, { shouldValidate: true, shouldDirty: true });
      toast({ title: `الفئة المقترحة: ${matched.label}` });
    } catch (err: any) {
      toast({
        title: "تعذّر الاتصال بالخادم",
        description: err?.message ?? "تأكّد من اتصال الإنترنت ثم حاول مرّة أخرى.",
        variant: "destructive",
      });
    } finally {
      setAiCategorySuggesting(false);
    }
  };

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
      subcategory: expense.subcategory || "",
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
    // For non-admins: always default to their session branch so the disabled
    // Select renders the branch name instead of looking empty. For admins:
    // honour whatever branch they've filtered to in the dashboard, falling
    // back to the first branch in the list (more useful than a hard-coded 1).
    const defaultBranchId = !isAdmin && userBranchId
      ? userBranchId
      : selectedBranch !== "all"
      ? parseInt(selectedBranch)
      : (allowedBranches[0]?.id ?? 1);
    form.reset({
      branchId: defaultBranchId,
      category: "",
      subcategory: "",
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
      // Strip the client-only "paidNow" hint before sending — the server
      // doesn't accept it on the invoice schema. We replay it as a
      // proper payment call after the invoice is created so the AR/Cash
      // journal entries land correctly.
      const { paidNow, ...invoicePayload } = data;
      const res = await apiRequest("POST", "/api/invoices", invoicePayload);
      const invoice = await res.json();
      if (paidNow && paidNow > 0 && invoice?.id) {
        await apiRequest("POST", `/api/invoices/${invoice.id}/payment`, { amount: paidNow });
      }
      return invoice;
    },
    onSuccess: (invoice: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsInvoiceDialogOpen(false);
      // If the server auto-applied prior session payments, surface
      // that explicitly so the accountant doesn't wonder why the
      // invoice already shows a paid balance.
      const credit = Number(invoice?.creditApplied) || 0;
      if (credit > 0) {
        toast({
          title: t.accounting.invoiceCreatedSuccess,
          description: `تمّ تطبيق ${formatCurrency(credit)} من دفعات المريض السابقة على هذه الفاتورة تلقائياً.`,
        });
      } else {
        toast({ title: t.accounting.invoiceCreatedSuccess });
      }
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

  // ==================== Vendor + Purchase mutations ====================

  const saveVendorMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      const isEdit = editingVendor?.id;
      const url = isEdit ? `/api/vendors/${editingVendor.id}` : `/api/vendors`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: editingVendor ? "تم تعديل المورد" : "تم إضافة المورد" });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deactivateVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/vendors/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "تم إلغاء تفعيل المورد" });
      setDeleteConfirmId(null);
      setDeleteType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const savePurchaseMutation = useMutation({
    mutationFn: async (data: Partial<Purchase>) => {
      const isEdit = editingPurchase?.id;
      const url = isEdit ? `/api/purchases/${editingPurchase.id}` : `/api/purchases`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: editingPurchase ? "تم تعديل الشراء" : "تم إضافة الشراء" });
      setIsPurchaseDialogOpen(false);
      setEditingPurchase(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/purchases/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: "تم حذف الشراء" });
      setDeleteConfirmId(null);
      setDeleteType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const recordVendorPaymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/purchases/${id}/payment`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: "تم تسجيل الدفعة" });
      setVendorPaymentTarget(null);
      setVendorPaymentAmount("");
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
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

    const selectedPatientId = invoicePatientId;
    const invoiceDate = (document.getElementById("invoice-date-value") as HTMLInputElement)?.value;
    const discount = parseInt((document.getElementById("invoice-discount") as HTMLInputElement)?.value || "0");
    const paidNow = parseInt(
      arabicDigitsToWestern((document.getElementById("invoice-paid-now") as HTMLInputElement)?.value || "0")
    );
    const notes = (document.getElementById("invoice-notes") as HTMLTextAreaElement)?.value;

    if (!selectedPatientId) {
      toast({ title: t.accounting.selectPatientRequired, variant: "destructive" });
      return;
    }

    const total = subtotal - (discount || 0);
    if (paidNow > total) {
      toast({ title: "المبلغ المدفوع أكبر من إجمالي الفاتورة", variant: "destructive" });
      return;
    }

    const patient = patientsList.find(p => p.id === selectedPatientId);

    createInvoiceMutation.mutate(
      {
        patientId: selectedPatientId,
        branchId: patient?.branchId || parseInt(selectedBranch) || 1,
        invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
        subtotal,
        discount: discount || 0,
        total,
        notes,
        items,
        // Carry the up-front payment so the server can record it as a
        // proper payment (separate journal entry) right after invoice
        // creation. Sent as a hint; the post-create handler picks it up.
        paidNow: paidNow > 0 ? paidNow : undefined,
      } as any,
    );
  };

  const openNewInvoiceDialog = () => {
    setEditingInvoice(null);
    setInvoiceItems([{ description: "", serviceType: "", quantity: 1, unitPrice: 0 }]);
    setInvoicePatientId(null);
    setInvoicePatientSearch("");
    setIsInvoicePatientListOpen(false);
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
    if (!deleteConfirmId) return;
    if (deleteType === "expense") {
      deleteExpenseMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteType(null);
    } else if (deleteType === "invoice") {
      deleteInvoiceMutation.mutate(deleteConfirmId);
    } else if (deleteType === "vendor") {
      deactivateVendorMutation.mutate(deleteConfirmId);
    } else if (deleteType === "purchase") {
      deletePurchaseMutation.mutate(deleteConfirmId);
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
    // Original categories have explicit translations from the i18n bundle.
    const categoryMap: Record<string, string> = {
      salaries: t.accounting.catSalaries,
      rent: t.accounting.catRent,
      medical_supplies: t.accounting.catMedicalSupplies,
      maintenance: t.accounting.catMaintenance,
      utilities: t.accounting.catUtilities,
      other: t.accounting.catOther,
    };
    if (categoryMap[category]) return categoryMap[category];
    // Fallback for the categories added later (communications, marketing,
    // transport, hospitality, stationery, bank_fees) — use the Arabic
    // label defined alongside the value in EXPENSE_CATEGORIES so the
    // dropdown never leaks an English value to an Arabic user.
    const fromList = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return fromList?.label || category;
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
      styles: { font: 'Amiri', fontStyle: 'normal', halign: 'right', fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175], font: 'Amiri', fontStyle: 'normal', halign: 'right', textColor: [255, 255, 255] },
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
        styles: { font: 'Amiri', fontStyle: 'normal', halign: 'right', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], font: 'Amiri', fontStyle: 'normal', halign: 'right', textColor: [255, 255, 255] },
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
        styles: { font: 'Amiri', fontStyle: 'normal', halign: 'right', fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94], font: 'Amiri', fontStyle: 'normal', halign: 'right', textColor: [255, 255, 255] },
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
        styles: { font: 'Amiri', fontStyle: 'normal', halign: 'right', fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68], font: 'Amiri', fontStyle: 'normal', halign: 'right', textColor: [255, 255, 255] },
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
        otherSubcategoryBreakdown: { subcategory: string; amount: number }[];
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
        styles: { font: "Amiri", fontStyle: "normal", halign: "right", fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74], font: "Amiri", fontStyle: "normal", halign: "right", textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.section === "body" && cellData.row.index === revenueRows.length - 1) {
            cellData.cell.styles.fillColor = [220, 252, 231];
            cellData.cell.styles.textColor = [22, 101, 52];
            cellData.cell.styles.fontSize = 11;
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Expenses by category
      doc.setFontSize(13);
      doc.text(reshapeArabic("مصاريف اليوم — موزّعة حسب الفئة"), 195, yPos, { align: "right" });
      yPos += 6;

      // Translate the category value (stored as "salaries", "other", …) to the
      // Arabic label, and for the "other" bucket expand each subcategory into
      // its own row so accountants don't lose visibility on what fell under
      // أخرى. Subcategories come pre-sorted by amount desc from the server.
      const labelOf = (categoryValue: string): string =>
        EXPENSE_CATEGORIES.find((c) => c.value === categoryValue)?.label ?? categoryValue ?? "أخرى";

      const expenseRows: string[][] = [];
      if (data.expensesByCategory.length === 0) {
        expenseRows.push([reshapeArabic("—"), reshapeArabic("لا توجد مصاريف اليوم")]);
      } else {
        for (const e of data.expensesByCategory) {
          if (e.category === "other" && data.otherSubcategoryBreakdown.length > 0) {
            // Expand: one row per subcategory, then a small "other" total row.
            for (const sub of data.otherSubcategoryBreakdown) {
              expenseRows.push([
                reshapeArabic(formatCurrency(sub.amount)),
                reshapeArabic(`أخرى — ${sub.subcategory}`),
              ]);
            }
          } else {
            expenseRows.push([
              reshapeArabic(formatCurrency(e.amount)),
              reshapeArabic(labelOf(e.category)),
            ]);
          }
        }
      }
      expenseRows.push([
        reshapeArabic(formatCurrency(data.todayExpenses)),
        reshapeArabic("الإجمالي"),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[reshapeArabic("المبلغ"), reshapeArabic("الفئة")]],
        body: expenseRows,
        theme: "striped",
        styles: { font: "Amiri", fontStyle: "normal", halign: "right", fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], font: "Amiri", fontStyle: "normal", halign: "right", textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.section === "body" && cellData.row.index === expenseRows.length - 1) {
            cellData.cell.styles.fillColor = [254, 226, 226];
            cellData.cell.styles.textColor = [127, 29, 29];
            cellData.cell.styles.fontSize = 11;
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
        styles: { font: "Amiri", fontStyle: "normal", halign: "right", fontSize: 11 },
        headStyles: { fillColor: [30, 64, 175], font: "Amiri", fontStyle: "normal", halign: "right", textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        didParseCell: (cellData: any) => {
          if (cellData.section === "body" && cellData.row.index === 4) {
            cellData.cell.styles.fillColor = [219, 234, 254];
            cellData.cell.styles.textColor = [30, 58, 138];
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
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1">
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
            <TabsTrigger value="vendors" className="gap-2" data-testid="tab-vendors">
              <Building2 className="h-4 w-4" />
              <span className="hidden md:inline">الموردون</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="gap-2" data-testid="tab-anomalies">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden md:inline">تنبيهات</span>
              {visibleAnomalies.length > 0 && (
                <Badge
                  variant={visibleAnomalies.some((a) => a.severity === "high") ? "destructive" : "secondary"}
                  className="h-5 min-w-[20px] px-1.5 tabular-nums"
                >
                  {toArabicIndicDigits(visibleAnomalies.length)}
                </Badge>
              )}
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
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

              {/* Today's revenue — pulled from /api/accounting/daily-summary */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">وارد اليوم</CardTitle>
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-today-revenue">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-emerald-600 truncate">
                      {todaySummary ? formatNumberOnly(todaySummary.todayRevenue) : "..."}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">دفعات سُجِّلت اليوم</p>
                </CardContent>
              </Card>

              {/* Cash on hand — yesterday's closing + today's net revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">المتبقي بالقاصة</CardTitle>
                  <Wallet className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5" data-testid="text-cash-on-hand">
                    <span className="text-lg md:text-xl font-bold tabular-nums text-indigo-600 truncate">
                      {todaySummary ? formatNumberOnly(todaySummary.todayClosing) : "..."}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">د.ع</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">الرصيد النقدي حتى الآن</p>
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
                            <div className="flex flex-col gap-0.5">
                              <Badge
                                variant="outline"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || "#6b7280"}20`,
                                  borderColor: CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || "#6b7280"
                                }}
                              >
                                {getCategoryLabelTranslated(expense.category)}
                              </Badge>
                              {expense.subcategory ? (
                                <span className="text-xs text-muted-foreground" title="تصنيف فرعي">
                                  {expense.subcategory}
                                </span>
                              ) : null}
                            </div>
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
                        <TableHead>وصف الخدمة</TableHead>
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
                        const serviceDescription = itemsByInvoiceId.get(invoice.id) ?? "—";
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{patient?.name || `${t.accounting.patientHash}${invoice.patientId}`}</TableCell>
                            <TableCell className="max-w-[260px] truncate text-sm" title={serviceDescription}>
                              {serviceDescription}
                            </TableCell>
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

            <MonthlyNarrativeCard
              isAdmin={isAdmin}
              allowedBranches={allowedBranches}
              defaultBranchId={isAdmin ? null : (userBranchId ?? null)}
            />

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

            <SmartAuditCard
              isAdmin={isAdmin}
              allowedBranches={allowedBranches}
              defaultBranchId={isAdmin ? null : (userBranchId ?? null)}
            />

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
                      <TableHead className="text-right">معاينة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtorsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {t.accounting.loading}
                        </TableCell>
                      </TableRow>
                    ) : debtors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setViewingPatientId(debtor.patient.id)}
                              data-testid={`button-view-debtor-${debtor.patient.id}`}
                            >
                              <Users className="h-3.5 w-3.5" />
                              معاينة السجل
                            </Button>
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

          {/* Vendors & Purchases Tab */}
          <TabsContent value="vendors" className="space-y-6">
            {/* Vendors panel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>قائمة الموردين</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    الموردون الذين تتعامل معهم — أضف مورداً قبل تسجيل أي شراء.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingVendor(null);
                    setIsVendorDialogOpen(true);
                  }}
                  className="gap-2"
                  data-testid="button-add-vendor"
                >
                  <Plus className="h-4 w-4" />
                  إضافة مورد
                </Button>
              </CardHeader>
              <CardContent>
                {vendorsList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد موردون بعد. ابدأ بإضافة الأول.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">المسؤول</TableHead>
                        <TableHead className="text-right">الهاتف</TableHead>
                        <TableHead className="text-right">العنوان</TableHead>
                        {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorsList.map((v) => (
                        <TableRow key={v.id} data-testid={`vendor-row-${v.id}`}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.contactPerson || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-right">{v.phone || "—"}</TableCell>
                          <TableCell>{v.address || "—"}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingVendor(v);
                                    setIsVendorDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-vendor-${v.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => {
                                    setDeleteConfirmId(v.id);
                                    setDeleteType("vendor");
                                  }}
                                  data-testid={`button-delete-vendor-${v.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Purchases panel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>المشتريات</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    شراء آجل يُسجَّل قيد ذمم دائنة. شراء نقدي يخصم من الصندوق مباشرة.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (vendorsList.length === 0) {
                      toast({ title: "أضف مورداً أولاً", variant: "destructive" });
                      return;
                    }
                    setEditingPurchase(null);
                    setIsPurchaseDialogOpen(true);
                  }}
                  className="gap-2"
                  data-testid="button-add-purchase"
                >
                  <Plus className="h-4 w-4" />
                  إضافة شراء
                </Button>
              </CardHeader>
              <CardContent>
                {purchasesList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد مشتريات بعد.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">المورد</TableHead>
                        <TableHead className="text-right">الفئة</TableHead>
                        <TableHead className="text-right">طريقة الدفع</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead className="text-right">المدفوع</TableHead>
                        <TableHead className="text-right">المتبقي</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasesList.map((p) => {
                        const vendor = vendorsList.find((v) => v.id === p.vendorId);
                        const remaining = p.totalAmount - (p.paidAmount || 0);
                        return (
                          <TableRow key={p.id} data-testid={`purchase-row-${p.id}`}>
                            <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
                            <TableCell>{formatArabicDate(p.purchaseDate)}</TableCell>
                            <TableCell>{vendor?.name || "—"}</TableCell>
                            <TableCell>{p.category}</TableCell>
                            <TableCell>
                              <Badge variant={p.paymentMethod === "credit" ? "secondary" : "outline"}>
                                {p.paymentMethod === "credit" ? "آجل" : "نقدي"}
                              </Badge>
                            </TableCell>
                            <TableCell className="tabular-nums">{formatNumberOnly(p.totalAmount)}</TableCell>
                            <TableCell className="tabular-nums text-green-600">{formatNumberOnly(p.paidAmount || 0)}</TableCell>
                            <TableCell className="tabular-nums text-red-600">{formatNumberOnly(remaining)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === "paid"
                                    ? "default"
                                    : p.status === "partial"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {p.status === "paid"
                                  ? "مدفوع"
                                  : p.status === "partial"
                                  ? "جزئي"
                                  : p.status === "cancelled"
                                  ? "ملغي"
                                  : "معلق"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {p.status !== "paid" && p.status !== "cancelled" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setVendorPaymentTarget(p);
                                      setVendorPaymentAmount(String(remaining));
                                    }}
                                    data-testid={`button-pay-purchase-${p.id}`}
                                  >
                                    دفع
                                  </Button>
                                )}
                                {isAdmin && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingPurchase(p);
                                        setIsPurchaseDialogOpen(true);
                                      }}
                                      data-testid={`button-edit-purchase-${p.id}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive"
                                      onClick={() => {
                                        setDeleteConfirmId(p.id);
                                        setDeleteType("purchase");
                                      }}
                                      data-testid={`button-delete-purchase-${p.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
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
          </TabsContent>

          {/* Anomalies Tab — surfaces flagged records with optional AI
              explanation per item. Items grouped visually by severity:
              red (high), amber (medium), blue (low). */}
          <TabsContent value="anomalies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  تنبيهات المراجعة
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  مصاريف وفواتير ومرضى يستحقّون نظرة ثانية بسبب نمط غير معتاد.
                </p>
                <div className="text-xs text-muted-foreground mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold text-foreground">"تابعتُه، ذكّرني بعد شهر"</span> —
                      حين تكون التنبيه حقيقياً (مثلاً ذمّة متأخّرة) وقد تابعتَ الأمر مع المريض، يخفى الإشعار شهراً
                      كي لا يزعجك يوميّاً، ويعود لاحقاً للتذكير إن لم تُحَلّ المشكلة.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold text-foreground">"ليس خطأ، أخفه نهائياً"</span> —
                      حين يُخطئ النظام في رصد هذه الحالة بالذات (مصروف كبير لكنّه طبيعي عندكم مثلاً)،
                      تُخفيه نهائياً ولا يعود.
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {visibleAnomalies.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="text-muted-foreground">لا توجد تنبيهات حالياً. كل شيء يبدو طبيعياً.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleAnomalies.map((a) => {
                      const severityStyles = {
                        high: "border-red-500/40 bg-red-500/5",
                        medium: "border-amber-500/40 bg-amber-500/5",
                        low: "border-blue-500/40 bg-blue-500/5",
                      } as const;
                      const severityLabels = {
                        high: { text: "عالية", color: "destructive" as const },
                        medium: { text: "متوسطة", color: "secondary" as const },
                        low: { text: "منخفضة", color: "outline" as const },
                      };
                      const sev = severityLabels[a.severity];
                      const explanation = anomalyExplanations[a.id];
                      return (
                        <div
                          key={a.id}
                          className={`rounded-md border p-4 ${severityStyles[a.severity]}`}
                          data-testid={`anomaly-${a.id}`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold">{a.title}</h4>
                                <Badge variant={sev.color}>{sev.text}</Badge>
                                {a.branchName && (
                                  <Badge variant="outline" className="font-normal">
                                    {a.branchName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{a.description}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                                <span>{formatArabicDate(a.date)}</span>
                                {a.amount !== undefined && a.amount > 0 && (
                                  <span className="tabular-nums">
                                    {formatNumberOnly(a.amount)} د.ع
                                  </span>
                                )}
                                {a.source.name && <span>{a.source.name}</span>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                              {aiEnabled && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs"
                                  onClick={() => explainAnomalyAi(a)}
                                  disabled={anomalyExplaining === a.id || !!explanation}
                                  data-testid={`button-explain-${a.id}`}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  {anomalyExplaining === a.id
                                    ? "جارٍ..."
                                    : explanation
                                    ? "تم الشرح"
                                    : "اشرح بالذكاء"}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs border-green-500/40 hover:bg-green-500/10"
                                onClick={() => recordAnomalyDecision(a, "reviewed")}
                                data-testid={`button-reviewed-${a.id}`}
                                title="تابعت الأمر — لا تنبّهني عنه إلاّ بعد شهر إن لم يُحَلّ"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                تابعتُه، ذكّرني بعد شهر
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => {
                                  setNotErrorTarget(a);
                                  setNotErrorReason("");
                                }}
                                data-testid={`button-not-error-${a.id}`}
                                title="هذا التنبيه نفسه خاطئ — لا تنبّهني عنه نهائياً"
                              >
                                <X className="h-3.5 w-3.5" />
                                ليس خطأ، أخفه نهائياً
                              </Button>
                            </div>
                          </div>
                          {explanation && (
                            <div className="mt-3 rounded-md bg-background/60 p-3 text-sm border-l-4 border-primary">
                              <p className="text-xs text-primary font-medium mb-1">شرح بالذكاء الاصطناعي:</p>
                              <p className="text-foreground/90">{explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {anomalyDecisionsList.length > 0 && (
                  <details className="mt-6 border-t pt-4 group">
                    <summary className="text-sm font-medium cursor-pointer flex items-center gap-2 hover:text-primary transition-colors list-none">
                      <span className="inline-block transition-transform group-open:rotate-90">›</span>
                      قرارات سابقة على التنبيهات ({toArabicIndicDigits(anomalyDecisionsList.length)})
                    </summary>
                    <p className="text-xs text-muted-foreground mt-2 mb-3">
                      تنبيهات تمّ تأكيدها أو حذفها سابقاً. تستطيع التراجع عن أيّ قرار فيظهر التنبيه مجدّداً.
                    </p>
                    <div className="space-y-2">
                      {anomalyDecisionsList.map((d) => {
                        const isReviewed = d.decision === "reviewed";
                        const expiresLabel = d.expiresAt
                          ? `حتى ${formatArabicDate(d.expiresAt.toString().split("T")[0])}`
                          : "نهائي";
                        return (
                          <div
                            key={d.id}
                            className="flex items-start gap-2 p-2.5 rounded-md border bg-muted/30 text-sm"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={isReviewed ? "secondary" : "outline"} className="text-xs">
                                  {isReviewed ? "تابعتُه، مخفيّ شهراً" : "ليس خطأ، نهائي"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{expiresLabel}</span>
                                {d.userName && (
                                  <span className="text-xs text-muted-foreground">— {d.userName}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {anomalyTypeLabel(d.anomalyType)} · {sourceTypeLabel(d.sourceType)} #{d.sourceId}
                              </div>
                              {d.reason && (
                                <div className="text-xs italic">"{d.reason}"</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => undoAnomalyDecision(d.id)}
                              data-testid={`button-undo-decision-${d.id}`}
                            >
                              تراجع
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </CardContent>
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
                        disabled={!isAdmin}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-branch">
                            <SelectValue placeholder={t.accounting.selectBranch} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowedBranches.map((branch) => (
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
                      <div className="flex items-center justify-between">
                        <FormLabel>{t.accounting.categoryCol}</FormLabel>
                        {aiEnabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                            onClick={suggestCategoryFromAi}
                            disabled={aiCategorySuggesting}
                            data-testid="button-ai-suggest-category"
                            title="اقتراح الفئة من وصف المصروف بالذكاء الاصطناعي"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {aiCategorySuggesting ? "جارٍ الاقتراح..." : "اقتراح بالذكاء"}
                          </Button>
                        )}
                      </div>
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

                {/* Sub-category field — required when category is "أخرى",
                    optional otherwise. Backed by a datalist of previously
                    used subcategories for the same category in this branch
                    so the system self-organises instead of accumulating
                    near-duplicate free-text entries. */}
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        تصنيف فرعي {subcategoryRequired && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          list="expense-subcategory-suggestions"
                          placeholder={
                            subcategoryRequired
                              ? "مثال: تبرعات للجمعيات، مكافآت موسمية، تصليح طارئ"
                              : "اختياري — تفصيل أكثر للمصروف"
                          }
                          data-testid="input-expense-subcategory"
                        />
                      </FormControl>
                      <datalist id="expense-subcategory-suggestions">
                        {subcategorySuggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                      {subcategoryRequired && !field.value?.trim() ? (
                        <p className="text-xs text-muted-foreground">
                          عند اختيار "أخرى" يجب توضيح طبيعة المصروف لتظهر بشكل واضح في التقارير.
                        </p>
                      ) : subcategorySuggestions.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          اقتراحات سابقة: {subcategorySuggestions.slice(0, 3).join(" • ")}
                        </p>
                      ) : null}
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
                        {/* type="text" + inputMode="decimal" so:
                            (1) the field starts empty when value is 0 instead
                                of showing "0" that gets prepended to user
                                input — accounting risk eliminated.
                            (2) Arabic-Indic numerals (١٠٠) are accepted and
                                converted to Western (100) on the fly, no need
                                to switch keyboard layouts. */}
                        <Input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value === 0 || field.value == null ? "" : field.value}
                          onChange={(e) => {
                            const cleaned = arabicDigitsToWestern(e.target.value);
                            const num = parseFloat(cleaned);
                            field.onChange(isNaN(num) ? 0 : num);
                          }}
                          placeholder="0"
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

                <ExpenseHintsPanel
                  description={form.watch("description") || ""}
                  amount={Number(form.watch("amount")) || 0}
                  category={form.watch("category") || ""}
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
              {invoicePatientId !== null ? (
                (() => {
                  const selected = patientsList.find((p) => p.id === invoicePatientId);
                  const branchName = branches.find((b) => b.id === selected?.branchId)?.name;
                  // Build the treatment type chip from patient flags so the
                  // accountant sees what kind of services this patient was
                  // registered for. Mirrors the same inference the chart uses.
                  const treatmentTags: string[] = [];
                  if (selected?.isAmputee) treatmentTags.push("طرف صناعي");
                  if (selected?.isPhysiotherapy) treatmentTags.push("علاج طبيعي");
                  if (selected?.isMedicalSupport) treatmentTags.push("مساند طبية");
                  return (
                    <>
                      <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>بطاقة المريض — تُسحب من سجلّ المريض المسجَّل، غير قابلة للتعديل في الفاتورة</span>
                            </div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-base font-bold">{selected?.name || `#${invoicePatientId}`}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">رقم #{invoicePatientId}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                              <div>
                                <span className="text-muted-foreground">الهاتف: </span>
                                <span className="font-medium tabular-nums">{selected?.phone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">العمر: </span>
                                <span className="font-medium">{selected?.age || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الفرع: </span>
                                <span className="font-medium">{branchName || "—"}</span>
                              </div>
                              {selected?.address && (
                                <div className="col-span-2 md:col-span-3">
                                  <span className="text-muted-foreground">العنوان: </span>
                                  <span className="font-medium">{selected.address}</span>
                                </div>
                              )}
                            </div>
                            {treatmentTags.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {treatmentTags.map((t) => (
                                  <Badge key={t} variant="secondary" className="text-xs">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              setInvoicePatientId(null);
                              setInvoicePatientSearch("");
                              setIsInvoicePatientListOpen(true);
                            }}
                            data-testid="button-clear-invoice-patient"
                            title="تغيير المريض"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <PatientFinancialChip patientId={invoicePatientId} />
                    </>
                  );
                })()
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium">{t.accounting.patient}</label>
                  {invoicePatientId !== null ? (
                    <div className="text-xs text-muted-foreground italic px-3 py-2 border rounded-md bg-muted/30">
                      تمّ اختيار المريض في الأعلى. اضغط × لتغييره.
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="ابحث باسم المريض أو رقم الهاتف…"
                          value={invoicePatientSearch}
                          onChange={(e) => {
                            setInvoicePatientSearch(e.target.value);
                            setIsInvoicePatientListOpen(true);
                          }}
                          onFocus={() => setIsInvoicePatientListOpen(true)}
                          className="pr-8"
                          data-testid="input-invoice-patient-search"
                        />
                      </div>
                      {isInvoicePatientListOpen && (
                        (() => {
                          const q = invoicePatientSearch.trim().toLowerCase();
                          const filtered = (q
                            ? patientsList.filter((p) => {
                                const name = (p.name || "").toLowerCase();
                                const phone = (p.phone || "").toLowerCase();
                                return name.includes(q) || phone.includes(q);
                              })
                            : patientsList
                          ).slice(0, 50);
                          return (
                            <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto border rounded-md bg-white shadow-lg">
                              {filtered.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                  لا توجد نتائج مطابقة
                                </div>
                              ) : (
                                filtered.map((patient) => (
                                  <button
                                    key={patient.id}
                                    type="button"
                                    className="w-full text-right px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none border-b last:border-b-0"
                                    onClick={() => {
                                      setInvoicePatientId(patient.id);
                                      setInvoicePatientSearch("");
                                      setIsInvoicePatientListOpen(false);
                                    }}
                                    data-testid={`option-invoice-patient-${patient.id}`}
                                  >
                                    <div className="text-sm font-medium truncate">{patient.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {patient.phone || t.accounting.noPhone}
                                    </div>
                                  </button>
                                ))
                              )}
                              {patientsList.length > filtered.length && (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t bg-muted/30">
                                  يُعرض أول ٥٠ نتيجة — أكمل البحث لتضييق النتائج
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}
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
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={item.quantity || ""}
                          onChange={(e) => {
                            const cleaned = arabicDigitsToWestern(e.target.value);
                            const num = parseInt(cleaned);
                            updateInvoiceItem(index, "quantity", isNaN(num) ? 1 : num);
                          }}
                          placeholder="1"
                          data-testid={`input-item-quantity-${index}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">{t.accounting.price}</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={item.unitPrice === 0 ? "" : item.unitPrice}
                          onChange={(e) => {
                            const cleaned = arabicDigitsToWestern(e.target.value);
                            const num = parseInt(cleaned);
                            updateInvoiceItem(index, "unitPrice", isNaN(num) ? 0 : num);
                          }}
                          placeholder="0"
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.accounting.discountCurrency}</label>
                  <Input
                    id="invoice-discount"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    defaultValue=""
                    placeholder="0"
                    onChange={(e) => {
                      e.target.value = arabicDigitsToWestern(e.target.value);
                    }}
                    data-testid="input-invoice-discount"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المدفوع الآن</label>
                  <Input
                    id="invoice-paid-now"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    defaultValue=""
                    placeholder="0"
                    onChange={(e) => {
                      e.target.value = arabicDigitsToWestern(e.target.value);
                    }}
                    data-testid="input-invoice-paid-now"
                  />
                  <p className="text-xs text-muted-foreground">
                    أدخل المبلغ الذي دفعه المريض الآن (إن وُجد).
                  </p>
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
                {deleteType === "expense"
                  ? t.accounting.confirmDeleteExpense
                  : deleteType === "invoice"
                  ? t.accounting.confirmDeleteInvoice
                  : deleteType === "vendor"
                  ? "هل تريد إلغاء تفعيل هذا المورد؟ لن يظهر في القوائم لكن لن تُحذف مشترياته السابقة."
                  : "هل تريد حذف هذا الشراء؟ سيُعكس قيده المحاسبي تلقائياً."}
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
                disabled={
                  deleteExpenseMutation.isPending ||
                  deleteInvoiceMutation.isPending ||
                  deactivateVendorMutation.isPending ||
                  deletePurchaseMutation.isPending
                }
                data-testid="button-confirm-delete"
              >
                {t.accounting.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Read-only patient record viewer for the debtors tab.
            Surfaces the patient's basic info, every visit, and every payment
            so the accountant can understand who they owe and what they were
            charged for — without any way to edit or add. */}
        <Dialog
          open={viewingPatientId !== null}
          onOpenChange={(open) => { if (!open) setViewingPatientId(null); }}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                سجل المريض
                <Badge variant="outline" className="font-normal text-xs ms-2">
                  للمعاينة فقط
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {patientRecordLoading ? (
              <div className="py-12 text-center text-muted-foreground">جارٍ تحميل السجل...</div>
            ) : !patientRecord ? (
              <div className="py-12 text-center text-muted-foreground">لا يمكن عرض هذا السجل</div>
            ) : (
              <div className="space-y-5">
                {/* Basic patient info */}
                <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">الاسم: </span>
                      <span className="font-medium">{patientRecord.name}</span>
                    </div>
                    {patientRecord.age && (
                      <div>
                        <span className="text-muted-foreground">العمر: </span>
                        <span>{patientRecord.age}</span>
                      </div>
                    )}
                    {patientRecord.phone && (
                      <div>
                        <span className="text-muted-foreground">الهاتف: </span>
                        <span dir="ltr">{patientRecord.phone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">الفرع: </span>
                      <span>{branches.find((b) => b.id === patientRecord.branchId)?.name || "—"}</span>
                    </div>
                    {patientRecord.medicalCondition && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">الحالة الطبية: </span>
                        <span>{patientRecord.medicalCondition}</span>
                      </div>
                    )}
                    {patientRecord.classification && (
                      <div>
                        <span className="text-muted-foreground">التصنيف: </span>
                        <span>{patientRecord.classification}</span>
                      </div>
                    )}
                    {patientRecord.createdAt && (
                      <div>
                        <span className="text-muted-foreground">تاريخ التسجيل: </span>
                        <span>{formatArabicDate(patientRecord.createdAt.split("T")[0])}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {patientRecord.isAmputee && <Badge variant="secondary">طرف صناعي</Badge>}
                    {patientRecord.isPhysiotherapy && <Badge variant="secondary">علاج طبيعي</Badge>}
                    {patientRecord.isMedicalSupport && <Badge variant="secondary">مساند طبية</Badge>}
                  </div>
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">إجمالي التكلفة</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {formatNumberOnly(patientRecord.totalCost || 0)}
                      <span className="ms-1 text-xs font-medium text-muted-foreground">د.ع</span>
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">المدفوع</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-green-600">
                      {formatNumberOnly((patientRecord.payments ?? []).reduce((s, p) => s + (p.amount || 0), 0))}
                      <span className="ms-1 text-xs font-medium text-muted-foreground">د.ع</span>
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">المتبقي</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-red-600">
                      {formatNumberOnly(
                        (patientRecord.totalCost || 0) -
                          (patientRecord.payments ?? []).reduce((s, p) => s + (p.amount || 0), 0)
                      )}
                      <span className="ms-1 text-xs font-medium text-muted-foreground">د.ع</span>
                    </p>
                  </div>
                </div>

                {/* Visits history */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    الزيارات ({patientRecord.visits?.length ?? 0})
                  </h4>
                  {!patientRecord.visits || patientRecord.visits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد زيارات مسجَّلة.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">نوع العلاج</TableHead>
                          <TableHead className="text-right">عدد الجلسات</TableHead>
                          <TableHead className="text-right">التكلفة</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientRecord.visits.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{formatArabicDate(v.visitDate.split("T")[0])}</TableCell>
                            <TableCell>{v.treatmentType || "—"}</TableCell>
                            <TableCell>{v.sessionCount ?? "—"}</TableCell>
                            <TableCell className="tabular-nums">
                              {v.cost ? formatCurrency(v.cost) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {v.details || v.notes || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Payments history */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    الدفعات ({patientRecord.payments?.length ?? 0})
                  </h4>
                  {!patientRecord.payments || patientRecord.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد دفعات مسجَّلة.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">نوع الخدمة</TableHead>
                          <TableHead className="text-right">عدد الجلسات</TableHead>
                          <TableHead className="text-right">المبلغ</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientRecord.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{formatArabicDate(p.date.split("T")[0])}</TableCell>
                            <TableCell>{p.paymentTreatmentType || "—"}</TableCell>
                            <TableCell>{p.sessionCount ?? "—"}</TableCell>
                            <TableCell className="tabular-nums text-green-600">
                              {formatCurrency(p.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.notes || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <p className="text-xs text-muted-foreground italic text-center pt-2">
                  هذه الواجهة للمعاينة فقط. لتعديل أو إضافة زيارات أو دفعات، تواصل مع المدير.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingPatientId(null)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* "Not an error" decision dialog — lets the accountant explain
            why this anomaly is actually fine. The optional reason gets
            stored alongside the suppression and surfaces in audit if needed. */}
        <Dialog
          open={notErrorTarget !== null}
          onOpenChange={(open) => { if (!open) { setNotErrorTarget(null); setNotErrorReason(""); } }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تأكيد: ليس خطأ</DialogTitle>
            </DialogHeader>
            {notErrorTarget && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{notErrorTarget.title}</p>
                  <p className="text-muted-foreground mt-1">{notErrorTarget.description}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">السبب (اختياري)</label>
                  <Textarea
                    value={notErrorReason}
                    onChange={(e) => setNotErrorReason(e.target.value)}
                    placeholder="مثال: هذا المورد يأتينا مرة كل شهرين بمبلغ كبير، أو هذا مريض VIP فواتيره طبيعية..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    سيُحفَظ السبب لتفسير الذكاء الاصطناعي مستقبلاً، ولن يظهر هذا التنبيه مجدداً لنفس السجلّ.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setNotErrorTarget(null); setNotErrorReason(""); }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (notErrorTarget) {
                    recordAnomalyDecision(notErrorTarget, "not_error", notErrorReason.trim() || undefined);
                  }
                }}
                data-testid="button-confirm-not-error"
              >
                تأكيد
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

        {/* Add/Edit Vendor Dialog */}
        <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "تعديل مورد" : "إضافة مورد جديد"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                  name: String(fd.get("name") || "").trim(),
                  contactPerson: String(fd.get("contactPerson") || "").trim() || null,
                  phone: String(fd.get("phone") || "").trim() || null,
                  email: String(fd.get("email") || "").trim() || null,
                  address: String(fd.get("address") || "").trim() || null,
                  currency: String(fd.get("currency") || "IQD"),
                  notes: String(fd.get("notes") || "").trim() || null,
                };
                if (!data.name) {
                  toast({ title: "اسم المورد مطلوب", variant: "destructive" });
                  return;
                }
                saveVendorMutation.mutate(data);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">اسم المورد *</label>
                  <Input name="name" defaultValue={editingVendor?.name || ""} required data-testid="input-vendor-name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الشخص المسؤول</label>
                  <Input name="contactPerson" defaultValue={editingVendor?.contactPerson || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الهاتف</label>
                  <Input name="phone" defaultValue={editingVendor?.phone || ""} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">البريد الإلكتروني</label>
                  <Input name="email" type="email" defaultValue={editingVendor?.email || ""} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">العملة</label>
                  <Input name="currency" defaultValue={editingVendor?.currency || "IQD"} dir="ltr" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">العنوان</label>
                  <Input name="address" defaultValue={editingVendor?.address || ""} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <Textarea name="notes" defaultValue={editingVendor?.notes || ""} rows={2} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={saveVendorMutation.isPending} data-testid="button-save-vendor">
                  {saveVendorMutation.isPending ? "جارٍ الحفظ..." : editingVendor ? "حفظ التعديل" : "إضافة"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Purchase Dialog */}
        <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPurchase ? "تعديل شراء" : "إضافة شراء جديد"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                  vendorId: parseInt(String(fd.get("vendorId") || "0")),
                  branchId: parseInt(String(fd.get("branchId") || effectiveBranchFilter)) || null,
                  purchaseDate: String(fd.get("purchaseDate") || new Date().toISOString().split("T")[0]),
                  dueDate: String(fd.get("dueDate") || "") || null,
                  category: String(fd.get("category") || "").trim(),
                  description: String(fd.get("description") || "").trim() || null,
                  vendorInvoiceNumber: String(fd.get("vendorInvoiceNumber") || "").trim() || null,
                  totalAmount: parseInt(String(fd.get("totalAmount") || "0")) || 0,
                  paymentMethod: String(fd.get("paymentMethod") || "credit"),
                  notes: String(fd.get("notes") || "").trim() || null,
                };
                if (!data.vendorId || !data.branchId || !data.category || data.totalAmount <= 0) {
                  toast({ title: "اكتب الحقول الإلزامية: مورد، فرع، فئة، مبلغ > 0", variant: "destructive" });
                  return;
                }
                savePurchaseMutation.mutate(data as any);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">المورد *</label>
                  <select
                    name="vendorId"
                    defaultValue={editingPurchase?.vendorId || ""}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-purchase-vendor"
                  >
                    <option value="">اختر مورداً</option>
                    {vendorsList.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الفرع *</label>
                  <select
                    name="branchId"
                    defaultValue={editingPurchase?.branchId || (effectiveBranchFilter !== "all" ? effectiveBranchFilter : "")}
                    required
                    disabled={!isAdmin}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                    data-testid="select-purchase-branch"
                  >
                    <option value="">اختر فرعاً</option>
                    {allowedBranches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ الشراء *</label>
                  <Input
                    name="purchaseDate"
                    type="date"
                    defaultValue={editingPurchase?.purchaseDate || new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">طريقة الدفع *</label>
                  <select
                    name="paymentMethod"
                    defaultValue={editingPurchase?.paymentMethod || "credit"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-purchase-payment-method"
                  >
                    <option value="credit">آجل (ذمم دائنة)</option>
                    <option value="cash">نقدي فوري</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ الاستحقاق (للآجل)</label>
                  <Input name="dueDate" type="date" defaultValue={editingPurchase?.dueDate || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم فاتورة المورد</label>
                  <Input name="vendorInvoiceNumber" defaultValue={editingPurchase?.vendorInvoiceNumber || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الفئة *</label>
                  <Input
                    name="category"
                    defaultValue={editingPurchase?.category || ""}
                    placeholder="مستلزمات طبية، صيانة، إلخ"
                    required
                    data-testid="input-purchase-category"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المبلغ الإجمالي *</label>
                  <Input
                    name="totalAmount"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    defaultValue={editingPurchase?.totalAmount || ""}
                    required
                    placeholder="0"
                    onChange={(e) => {
                      e.target.value = arabicDigitsToWestern(e.target.value);
                    }}
                    data-testid="input-purchase-amount"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">الوصف</label>
                  <Input name="description" defaultValue={editingPurchase?.description || ""} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <Textarea name="notes" defaultValue={editingPurchase?.notes || ""} rows={2} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={savePurchaseMutation.isPending} data-testid="button-save-purchase">
                  {savePurchaseMutation.isPending ? "جارٍ الحفظ..." : editingPurchase ? "حفظ التعديل" : "إضافة"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Vendor Payment Dialog */}
        <Dialog open={vendorPaymentTarget !== null} onOpenChange={(open) => { if (!open) { setVendorPaymentTarget(null); setVendorPaymentAmount(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تسجيل دفعة لمورد</DialogTitle>
            </DialogHeader>
            {vendorPaymentTarget && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم الشراء:</span>
                    <span className="font-mono">{vendorPaymentTarget.purchaseNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span className="tabular-nums">{formatCurrency(vendorPaymentTarget.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المدفوع سابقاً:</span>
                    <span className="tabular-nums text-green-600">{formatCurrency(vendorPaymentTarget.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>المتبقي:</span>
                    <span className="tabular-nums text-red-600">
                      {formatCurrency(vendorPaymentTarget.totalAmount - (vendorPaymentTarget.paidAmount || 0))}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">مبلغ الدفعة</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={vendorPaymentAmount}
                    onChange={(e) => setVendorPaymentAmount(arabicDigitsToWestern(e.target.value))}
                    placeholder="0"
                    data-testid="input-vendor-payment-amount"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setVendorPaymentTarget(null); setVendorPaymentAmount(""); }}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  const amt = parseInt(vendorPaymentAmount);
                  if (!vendorPaymentTarget || !amt || amt <= 0) {
                    toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
                    return;
                  }
                  recordVendorPaymentMutation.mutate({ id: vendorPaymentTarget.id, amount: amt });
                }}
                disabled={recordVendorPaymentMutation.isPending}
                data-testid="button-confirm-vendor-payment"
              >
                {recordVendorPaymentMutation.isPending ? "جارٍ التسجيل..." : "تسجيل الدفعة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
