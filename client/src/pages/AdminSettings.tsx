import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Key, 
  Building2, 
  Mail, 
  Shield, 
  Save, 
  Eye, 
  EyeOff,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Calendar,
  Lock,
  Plus,
  Trash2,
  MapPin,
  LayoutDashboard,
  AlertTriangle,
  CheckCircle,
  Layers,
  Sparkles,
  Activity,
  Plus,
  Trash2, Bell,
} from "lucide-react";
import type { Branch, BranchSetting, SystemUser } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { MEDICAL_SPECIALTIES, SPECIALTY_LABELS } from "@shared/medical";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Download } from "lucide-react";

interface BranchWithDetails extends Branch {
  patientCount: number;
  hasPassword: boolean;
  currentPassword: string | null;
  settings: {
    showDashboard: boolean;
    showPatients: boolean;
    showPayments: boolean;
    showAccounting: boolean;
    showStatistics: boolean;
  };
}

type UserRole = "admin" | "branch_manager" | "accountant" | "reception" | "therapist" | "surveyor" | "prosthetics_expert" | "doctor";

// Display order of the role PICKER. Typed as the full union, so TypeScript
// refuses to compile if a role is added to UserRole and forgotten here.
// Distinct from the ROLE_ORDER further down, which orders the performance
// report — that one is a loose string list and tolerates unknown roles.
const ROLE_PICKER_ORDER: readonly UserRole[] = [
  "admin",
  "branch_manager",
  "accountant",
  "reception",
  "doctor",
  "therapist",
  "surveyor",
  "prosthetics_expert",
];

function getRoleLabels(t: ReturnType<typeof useTranslation>["t"]): Record<UserRole, string> {
  return {
    admin: t.roles.admin,
    branch_manager: t.roles.branch_manager,
    accountant: t.roles.accountant,
    reception: t.roles.reception,
    therapist: t.roles.therapist,
    surveyor: t.roles.surveyor,
    prosthetics_expert: t.roles.prosthetics_expert,
    doctor: t.roles.doctor,
  };
}

type PermissionSet = {
  canViewPatients: boolean;
  canAddPatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canViewPayments: boolean;
  canAddPayments: boolean;
  canEditPayments: boolean;
  canDeletePayments: boolean;
  canViewReports: boolean;
  canManageAccounting: boolean;
  canAddExpenses: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageTreatmentPlans: boolean;
  canManageSurveys: boolean;
  // Per-user visit permissions. Toggle on for any employee the
  // admin trusts to fix or remove visit records (e.g. a senior
  // receptionist) without elevating them to branch_manager.
  canEditVisits: boolean;
  canDeleteVisits: boolean;
  // Session-tracking module permissions (migration 009).
  canEnterSessions: boolean;
  canManageSessionTargets: boolean;
  canViewSessionsReport: boolean;
};

const defaultPermissions: Record<UserRole, PermissionSet> = {
  admin: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: true,
    canDeletePayments: true,
    canViewReports: true,
    canManageAccounting: true,
    canAddExpenses: false,
    canManageSettings: true,
    canManageUsers: true,
    canManageTreatmentPlans: true,
    canManageSurveys: true,
    canEditVisits: true,
    canDeleteVisits: true,
    canEnterSessions: true,
    canManageSessionTargets: true,
    canViewSessionsReport: true,
  },
  branch_manager: {
    // مدير الفرع: هذه قيمُ **افتراضٍ عند الإنشاء فقط** — الدورُ يقترحها
    // كنقطة بداية معقولة (توسيعٌ صريحٌ سابق). لكن الخادم لم يعد يفرضها
    // تلقائياً عند تسجيل الدخول (إصلاحٌ 2026-09-01): ما يُخزَّن فعلياً على
    // صفّ المستخدم — ولو غُيّر لاحقاً من هذه الشاشة — هو السلطةُ الحقيقية
    // في كل طلب، ويسري فوراً بلا خروجٍ وعودة.
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: true,
    canDeletePayments: true,
    canViewReports: true,
    canManageAccounting: true,
    canAddExpenses: false,
    canManageSettings: true,
    canManageUsers: true,
    canManageTreatmentPlans: true,
    canManageSurveys: true,
    canEditVisits: true,
    canDeleteVisits: true,
    canEnterSessions: true,
    canManageSessionTargets: true,
    canViewSessionsReport: true,
  },
  accountant: {
    // المحاسب: يرى كل البيانات المالية ويُدخِلها، لكنه لا يعدّل ولا يحذف.
    // يرى المرضى للقراءة فقط (لمعرفة لمن الفاتورة أو الدفعة).
    // لا يدير الإعدادات ولا المستخدمين.
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: true,
    canManageAccounting: true,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canManageSurveys: false,
    canEditVisits: false,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: true,
  },
  reception: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    // الاستقبال هم من يجرون الاستبيان مع المريض بعد انتهاء جلسته،
    // فيلزمهم وصول كامل لتعبئة الاستبيانات وقراءة النتائج.
    canManageSurveys: true,
    // الافتراضي إيقاف لتعديل/حذف الزيارات؛ المسؤول يفعّلها يدوياً
    // للموظفين الذين يثق بهم.
    canEditVisits: false,
    canDeleteVisits: false,
    // الاستقبال هم من يدخلون الجلسات اليومية؛ تفعيل الإدخال افتراضياً.
    canEnterSessions: true,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
  },
  therapist: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: false,
    canAddPayments: false,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: true,
    canManageSurveys: false,
    // المعالج الطبيعي قد يحتاج تعديل تفاصيل الزيارة التي قام بها
    // (الجلسات، الملاحظات السريريّة). الحذف يبقى افتراضياً مغلقاً.
    canEditVisits: true,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
  },
  surveyor: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: false,
    canAddPayments: false,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canManageSurveys: true,
    canEditVisits: false,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
  },
  // Prosthetics expert works ONLY inside the manufacturing module, gated by
  // role — not by these general permissions. All general permissions stay off
  // (the expert must not use the general patient/payments/reports screens).
  prosthetics_expert: {
    canViewPatients: false,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: false,
    canAddPayments: false,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canManageSurveys: false,
    canEditVisits: false,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
  },
  // A doctor owns the patient's clinical side and nothing else. Financially
  // blind by the same rule as the pure prosthetics expert above: no payments,
  // no reports, no accounting. The admin can still raise any of these for an
  // individual doctor afterwards.
  doctor: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewPayments: false,
    canAddPayments: false,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: true,
    canManageSurveys: false,
    canEditVisits: true,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
  }
};

function BackupStatusCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "today" | "branch" | "branch_today">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const { data: backupStatus, isLoading } = useQuery<{ lastBackup: string | null; hoursAgo: number | null }>({
    queryKey: ["/api/admin/backup-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backup-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backup status");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: branches } = useQuery<{ id: number; name: string; currentPassword?: string }[]>({
    queryKey: ["/api/admin/settings/branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.branches.map((b: any) => ({
        id: b.branchId,
        name: b.branchName,
        currentPassword: b.currentPassword,
      }));
    },
  });

  const handleSendBackup = async () => {
    if ((filterType === "branch" || filterType === "branch_today") && !selectedBranchId) {
      toast({
        title: t.adminSettings.toastAlert,
        description: t.adminSettings.toastSelectBranchFirst,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/admin/send-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          filterType, 
          branchId: (filterType === "branch" || filterType === "branch_today") ? selectedBranchId : undefined 
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: t.adminSettings.toastSent,
          description: data.message || t.adminSettings.toastBackupSuccess,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-status"] });
      } else {
        toast({
          title: t.adminSettings.toastError,
          description: data.message || t.adminSettings.toastBackupFailed,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.adminSettings.toastError,
        description: t.adminSettings.toastBackupError,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatLastBackup = (dateStr: string | null) => {
    if (!dateStr) return t.adminSettings.neverSent;
    const date = new Date(dateStr);
    const locale = t.dir === "rtl" ? "ar-IQ" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baghdad",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t.adminSettings.lastBackup}</p>
            <p className="font-medium">
              {isLoading ? t.adminSettings.loading : formatLastBackup(backupStatus?.lastBackup || null)}
            </p>
            {backupStatus && backupStatus.hoursAgo !== null && (
              <p className="text-xs text-muted-foreground">
                ({t.adminSettings.since} {backupStatus.hoursAgo} {t.adminSettings.hoursAgo})
              </p>
            )}
          </div>
          <div>
            {backupStatus && backupStatus.hoursAgo !== null && backupStatus.hoursAgo < 24 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 ml-1" />
                {t.adminSettings.upToDate}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertTriangle className="w-3 h-3 ml-1" />
                {t.adminSettings.needsUpdate}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t.adminSettings.selectBackupType}</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            data-testid="button-filter-all"
          >
            {t.adminSettings.allPatients}
          </Button>
          <Button
            type="button"
            variant={filterType === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("today")}
            data-testid="button-filter-today"
          >
            {t.adminSettings.todayPatientsAllBranches}
          </Button>
        </div>

        <div className="border-t pt-3 mt-2">
          <Label className="text-sm text-muted-foreground mb-2 block">{t.adminSettings.orSelectBranch}</Label>
          <Select 
            value={selectedBranchId?.toString() || ""} 
            onValueChange={(value) => {
              setSelectedBranchId(Number(value));
              if (!value) {
                setFilterType("all");
              }
            }}
          >
            <SelectTrigger data-testid="select-branch-filter">
              <SelectValue placeholder={t.adminSettings.selectBranchOptional} />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedBranchId && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                type="button"
                variant={filterType === "branch" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("branch")}
                data-testid="button-filter-branch-all"
              >
                {t.adminSettings.allBranchPatients}
              </Button>
              <Button
                type="button"
                variant={filterType === "branch_today" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("branch_today")}
                data-testid="button-filter-branch-today"
              >
                {t.adminSettings.todayBranchPatients}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBranchId(null);
                  setFilterType("all");
                }}
                data-testid="button-clear-branch"
              >
                {t.adminSettings.clearBranchSelection}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleSendBackup}
        disabled={isSending || ((filterType === "branch" || filterType === "branch_today") && !selectedBranchId)}
        className="w-full gap-2"
        data-testid="button-send-backup"
      >
        <Mail className="w-4 h-4" />
        {isSending ? t.adminSettings.sending : t.adminSettings.sendBackupNow}
      </Button>
    </div>
  );
}

interface AiMemoryNote {
  id: number;
  branchId: number | null;
  scope: string;
  category: string | null;
  title: string;
  note: string;
  isActive: boolean | null;
}

interface BranchOption {
  id: number;
  name: string;
}

// Read/write surface for the manager-curated AI knowledge base. Notes
// stored here get fed to the AI explainer when it's asked about an
// anomaly, so the system effectively "learns" the business context the
// admin types in. No edit history — current note is what the AI sees.
// ============================================================
// Employee accuracy tab — admin-only.
// Shows aggregate activity per employee over a window. The intent
// is to help the admin spot who carries the load and who might
// benefit from training. We don't compute a single "accuracy score"
// number — that's misleading without an audit log of edits/deletes.
// Instead the admin sees raw counts and totals, plus the number of
// anomaly decisions each user resolved (a workload signal).
interface DimensionScore { earned: number; max: number; ratio: number; }
interface ScoreBreakdown {
  productivity: DimensionScore;
  consistency: DimensionScore;
  followups: DimensionScore;
  quality: DimensionScore;
}
interface RoleTarget { entriesTarget: number; activeDaysTarget: number; followUpsTarget: number; }
type PerformanceTargets = Record<string, RoleTarget>;

interface AccuracyRow {
  createdBy: string;
  displayName: string;
  role: string | null;
  branchId: number | null;
  expenseCount: number;
  expenseTotal: number;
  invoiceCount: number;
  invoiceTotal: number;
  purchaseCount: number;
  purchaseTotal: number;
  patientCreateCount: number;
  visitCreateCount: number;
  paymentCreateCount: number;
  anomalyDecisionsCount: number;
  editCount: number;
  deleteCount: number;
  loginCount: number;
  activeDays: number;
  followUpsCount: number;
  patientsCreated: number;
  patientsComplete: number;
  lastActivityAt: string | null;
  score: number;
  totalEntries: number;
  breakdown: ScoreBreakdown;
  target: RoleTarget;
}

function formatIQD(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول النظام",
  branch_manager: "مدير فرع",
  accountant: "محاسب",
  reception: "استقبال",
  therapist: "أخصّائي علاج",
  surveyor: "مسؤول استبيانات",
  prosthetics_expert: "خبير أطراف",
};

function scoreColor(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 25) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function scoreLabel(score: number): string {
  if (score >= 75) return "ممتاز";
  if (score >= 50) return "جيّد";
  if (score >= 25) return "مقبول";
  return "يحتاج متابعة";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوماً`;
  return new Date(iso).toLocaleDateString("ar-IQ");
}

const ROLE_ORDER = ["reception", "doctor", "branch_manager", "accountant", "therapist", "surveyor", "prosthetics_expert", "admin"];

function currentBaghdadMonth(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }).slice(0, 7);
}

// A single scored dimension rendered as a labelled progress bar.
function DimensionBar({ label, dim, detail }: { label: string; dim: DimensionScore; detail: string }) {
  const applicable = dim.max > 0;
  const pct = applicable ? Math.min(100, (dim.earned / dim.max) * 100) : 0;
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 25 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-muted-foreground">
          {applicable ? `${Math.round(dim.earned)} / ${Math.round(dim.max)}` : "غير مطبّق"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${applicable ? barColor : "bg-slate-200"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{detail}</div>
    </div>
  );
}

function EmployeeAccuracyTab() {
  const [month, setMonth] = useState(currentBaghdadMonth());
  const { data, isLoading } = useQuery<{ month: string; rows: AccuracyRow[] }>({
    queryKey: ["/api/admin/employee-accuracy", month],
    queryFn: async () => {
      const res = await fetch(`/api/admin/employee-accuracy?month=${month}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  const knownRows = rows.filter((r) => r.createdBy !== "unknown");
  const unknownRow = rows.find((r) => r.createdBy === "unknown");

  // Group by role — comparison and the reward are per-role. Within each role
  // sort by score descending; the #1 (score > 0) is the month's candidate.
  const byRole = new Map<string, AccuracyRow[]>();
  for (const r of knownRows) {
    const key = r.role ?? "—";
    if (!byRole.has(key)) byRole.set(key, []);
    byRole.get(key)!.push(r);
  }
  Array.from(byRole.values()).forEach((list) => list.sort((a, b) => b.score - a.score));
  const orderedRoles = [
    ...ROLE_ORDER.filter((r) => byRole.has(r)),
    ...Array.from(byRole.keys()).filter((r) => !ROLE_ORDER.includes(r)),
  ];

  return (
    <div className="space-y-4">
      <TargetsEditor />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              مراقب أداء الموظفين
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              تقييم شهري لكل موظّف مقارنةً بأهداف دوره: الإنتاجية، الانتظام اليومي، متابعة المرضى، وجودة البيانات.
              المقارنة تكون بين كل دور ومثيله.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <label className="text-xs text-muted-foreground">شهر التقييم</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentBaghdadMonth())}
              className="p-2 border rounded-md text-sm bg-background"
              data-testid="select-accuracy-month"
            />
          </div>
        </div>

        {/* Score legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
          <div className="rounded-md border bg-green-50 px-3 py-2">
            <div className="font-semibold text-green-800">ممتاز ≥ 75</div>
            <div className="text-green-700/70">بلغ أهدافه أو تجاوزها</div>
          </div>
          <div className="rounded-md border bg-blue-50 px-3 py-2">
            <div className="font-semibold text-blue-800">جيّد 50-74</div>
            <div className="text-blue-700/70">قريب من الأهداف</div>
          </div>
          <div className="rounded-md border bg-amber-50 px-3 py-2">
            <div className="font-semibold text-amber-800">مقبول 25-49</div>
            <div className="text-amber-700/70">دون الأهداف</div>
          </div>
          <div className="rounded-md border bg-red-50 px-3 py-2">
            <div className="font-semibold text-red-800">يحتاج متابعة &lt; 25</div>
            <div className="text-red-700/70">نشاط ضعيف جدّاً</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">جارٍ التحميل…</div>
        ) : knownRows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد بيانات في هذا الشهر.
          </div>
        ) : (
          <div className="space-y-5">
            {orderedRoles.map((roleKey) => {
              const list = byRole.get(roleKey)!;
              return (
                <div key={roleKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      {ROLE_LABELS[roleKey] ?? roleKey}
                    </h3>
                    <span className="text-xs text-muted-foreground">({list.length})</span>
                  </div>
                  <div className="space-y-3">
                    {list.map((r, idx) => {
                      const isTop = idx === 0 && r.score > 0;
                      const completeness = r.patientsCreated > 0
                        ? Math.round((r.patientsComplete / r.patientsCreated) * 100)
                        : null;
                      return (
                        <div
                          key={r.createdBy}
                          className={`border rounded-lg p-4 transition-shadow hover:shadow-sm ${isTop ? "border-green-300 bg-green-50/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-base">{r.displayName}</span>
                                {isTop && (
                                  <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                    ⭐ الأول في دوره
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                آخر نشاط: {relativeTime(r.lastActivityAt)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`inline-flex items-center justify-center min-w-[72px] px-3 py-1.5 rounded-full border text-sm font-bold ${scoreColor(r.score)}`}>
                                {r.score} / 100
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{scoreLabel(r.score)}</div>
                            </div>
                          </div>

                          {/* Dimension breakdown vs role targets */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <DimensionBar
                              label="الإنتاجية"
                              dim={r.breakdown.productivity}
                              detail={`${r.totalEntries} / ${r.target.entriesTarget || "—"} إدخال`}
                            />
                            <DimensionBar
                              label="الانتظام اليومي"
                              dim={r.breakdown.consistency}
                              detail={`${r.activeDays} / ${r.target.activeDaysTarget || "—"} يوم عمل`}
                            />
                            <DimensionBar
                              label="متابعة المرضى"
                              dim={r.breakdown.followups}
                              detail={r.target.followUpsTarget > 0 ? `${r.followUpsCount} / ${r.target.followUpsTarget} اتصال` : "غير مطلوب لهذا الدور"}
                            />
                            <DimensionBar
                              label="جودة البيانات"
                              dim={r.breakdown.quality}
                              detail={`${completeness !== null ? `اكتمال ${completeness}%` : "لا مرضى جدد"} • حذف ${r.deleteCount}`}
                            />
                          </div>

                          {/* Raw counts */}
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                            <MetricBox label="مرضى جدد" count={r.patientCreateCount} />
                            <MetricBox label="زيارات" count={r.visitCreateCount} />
                            <MetricBox label="دفعات" count={r.paymentCreateCount} />
                            <MetricBox label="إجمالي الإدخالات" count={r.totalEntries} highlight />
                            <MetricBox label="اتصالات متابعة" count={r.followUpsCount} />
                            <MetricBox label="عمليّات حذف" count={r.deleteCount} tone={r.deleteCount > 5 ? "red" : "default"} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {unknownRow && unknownRow.totalEntries > 0 && (
          <div className="mt-4 text-xs text-muted-foreground border-t pt-3">
            ملاحظة: يوجد {unknownRow.totalEntries.toLocaleString("ar-IQ")} إدخالاً قديماً قبل تفعيل تتبّع المُنشِئ، ولا يمكن نسبتها لموظّف محدّد.
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          كيف تُحسَب النقاط؟
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-5">
          <li>
            <span className="font-semibold text-foreground">الإنتاجية (٤٠ نقطة)</span> — إدخالاتك (مرضى + زيارات + دفعات + عمل محاسبي)
            مقارنةً بهدف دورك الشهري. بلوغ الهدف = كامل النقاط، وتجاوزه لا يمنح أكثر من الكامل.
          </li>
          <li>
            <span className="font-semibold text-foreground">الانتظام اليومي (٢٠ نقطة)</span> — عدد الأيام التي عملت فيها فعلاً خلال الشهر
            مقارنةً بأيام العمل المستهدفة. العمل الموزّع على أيام الشهر أفضل من دفعة واحدة.
          </li>
          <li>
            <span className="font-semibold text-foreground">متابعة المرضى (١٥ نقطة)</span> — عدد اتصالات المتابعة التي سجّلتها
            مقارنةً بالهدف (يُطبّق على الأدوار المعنيّة فقط).
          </li>
          <li>
            <span className="font-semibold text-foreground">جودة البيانات (٢٥ نقطة)</span> — اكتمال بيانات المرضى الذين أدخلتهم
            (وجود رقم الهاتف) مع قلّة عمليّات الحذف.
          </li>
          <li>
            <span className="font-semibold text-foreground">عدل بين الأدوار</span>: أيّ بُعد لا ينطبق على دورك (هدفه صفر) يُستبعَد
            ويُعاد توزيع وزنه، فيبقى تقييم كل دور من ١٠٠. والمقارنة دائماً بين كل دور ومثيله.
          </li>
        </ul>
      </Card>
    </div>
  );
}

// Admin editor for the per-role monthly targets that drive the scoring.
function TargetsEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PerformanceTargets | null>(null);
  const [open, setOpen] = useState(false);

  const { data: targets } = useQuery<PerformanceTargets>({
    queryKey: ["/api/admin/performance-targets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/performance-targets", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const effective = draft ?? targets ?? {};

  const save = useMutation({
    mutationFn: async (payload: PerformanceTargets) => {
      const res = await fetch("/api/admin/performance-targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/performance-targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-accuracy"] });
      setDraft(null);
      toast({ title: "تم حفظ الأهداف" });
    },
    onError: () => toast({ title: "خطأ", description: "تعذّر حفظ الأهداف", variant: "destructive" }),
  });

  const setField = (role: string, field: keyof RoleTarget, value: number) => {
    setDraft({
      ...(effective as PerformanceTargets),
      [role]: { ...(effective as PerformanceTargets)[role], [field]: value },
    });
  };

  const roles = [
    ...ROLE_ORDER.filter((r) => (effective as PerformanceTargets)[r]),
    ...Object.keys(effective).filter((r) => !ROLE_ORDER.includes(r)),
  ];

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-bold"
      >
        <span className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          الأهداف الشهرية لكل دور
        </span>
        <span className="text-xs text-muted-foreground">{open ? "▲ إخفاء" : "▼ تعديل"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">
            حدّد أهداف كل دور شهريّاً. الهدف صفر يعني أن البُعد لا يُطبَّق على هذا الدور (يُستبعَد من نقاطه).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-right py-2 px-2">الدور</th>
                  <th className="text-center py-2 px-2">هدف الإدخالات</th>
                  <th className="text-center py-2 px-2">أيام العمل</th>
                  <th className="text-center py-2 px-2">اتصالات المتابعة</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const t = (effective as PerformanceTargets)[role];
                  return (
                    <tr key={role} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{ROLE_LABELS[role] ?? role}</td>
                      {(["entriesTarget", "activeDaysTarget", "followUpsTarget"] as const).map((f) => (
                        <td key={f} className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={t?.[f] ?? 0}
                            onChange={(e) => setField(role, f, Math.max(0, Number(e.target.value) || 0))}
                            className="h-8 w-20 text-center mx-auto"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            {draft && (
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                إلغاء
              </Button>
            )}
            <Button
              size="sm"
              disabled={!draft || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              حفظ الأهداف
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function MetricBox({
  label,
  count,
  amount,
  highlight,
  tone = "default",
}: {
  label: string;
  count: number | undefined | null;
  amount?: number;
  highlight?: boolean;
  tone?: "default" | "amber" | "red";
}) {
  // Defensive: server payloads may briefly miss new fields right after
  // a deploy or cache invalidation. Coerce to 0 instead of crashing
  // the whole page (toLocaleString on undefined throws).
  const safeCount = typeof count === "number" && Number.isFinite(count) ? count : 0;
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : tone === "red"
      ? "bg-red-50 border-red-200"
      : highlight
      ? "bg-primary/5 border-primary/20"
      : "bg-muted/30";
  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="font-bold tabular-nums text-sm">
        {safeCount.toLocaleString("ar-IQ")}
      </div>
      {amount !== undefined && amount > 0 && (
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {formatIQD(amount)} د.ع
        </div>
      )}
    </div>
  );
}

function AiMemoryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AiMemoryNote | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery<AiMemoryNote[]>({
    queryKey: ["/api/ai-notes"],
    queryFn: async () => {
      const res = await fetch("/api/ai-notes", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: branches = [] } = useQuery<BranchOption[]>({
    queryKey: ["/api/branches"],
  });

  const saveNote = useMutation({
    mutationFn: async (data: Partial<AiMemoryNote>) => {
      const url = editing?.id ? `/api/ai-notes/${editing.id}` : "/api/ai-notes";
      const method = editing?.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "تعذّر الحفظ");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notes"] });
      toast({ title: editing ? "تم تعديل الملاحظة" : "تمت إضافة الملاحظة" });
      setIsOpen(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ai-notes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("تعذّر الحذف");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-notes"] });
      toast({ title: "تم حذف الملاحظة" });
    },
  });

  const scopeLabel = (s: string) =>
    ({ general: "عامّة", expense: "مصاريف", invoice: "فواتير", patient: "مرضى" } as Record<string, string>)[s] || s;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ذاكرة الذكاء الاصطناعي
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              اكتب هنا أيّ سياق يساعد الذكاء على فهم طبيعة عملك. عند توليد شرح لأيّ تنبيه، يقرأ هذه الملاحظات
              ويأخذها بعين الاعتبار. مثلاً: "في رمضان نتوقع زيادة في الضيافة"، أو "هذا المورد يأتينا كل شهرين بمبلغ كبير".
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setIsOpen(true); }}
            className="gap-2 shrink-0"
            data-testid="button-add-ai-note"
          >
            <Plus className="h-4 w-4" />
            إضافة ملاحظة
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">جارٍ التحميل...</p>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">لا توجد ملاحظات بعد. أضف أوّل ملاحظة لتبدأ تعليم النظام.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border p-4 space-y-2" data-testid={`note-${n.id}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{n.title}</h4>
                        <Badge variant="outline" className="font-normal">{scopeLabel(n.scope)}</Badge>
                        {n.category && <Badge variant="secondary" className="font-normal">{n.category}</Badge>}
                        {n.branchId === null ? (
                          <Badge variant="secondary" className="font-normal">كل الفروع</Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal">
                            {branches.find((b) => b.id === n.branchId)?.name ?? `فرع ${n.branchId}`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{n.note}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditing(n); setIsOpen(true); }}
                        data-testid={`button-edit-note-${n.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => deleteNote.mutate(n.id)}
                        data-testid={`button-delete-note-${n.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل ملاحظة" : "إضافة ملاحظة جديدة"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data: Partial<AiMemoryNote> = {
                scope: String(fd.get("scope") || "general"),
                category: String(fd.get("category") || "").trim() || null,
                title: String(fd.get("title") || "").trim(),
                note: String(fd.get("note") || "").trim(),
                branchId: fd.get("branchId") ? parseInt(String(fd.get("branchId"))) : null,
              };
              if (!data.title || !data.note) {
                toast({ title: "العنوان والنص مطلوبان", variant: "destructive" });
                return;
              }
              saveNote.mutate(data);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">النطاق *</label>
                <select
                  name="scope"
                  defaultValue={editing?.scope || "general"}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="general">عامّة (تنطبق على كل شيء)</option>
                  <option value="expense">مصاريف فقط</option>
                  <option value="invoice">فواتير فقط</option>
                  <option value="patient">مرضى فقط</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الفرع</label>
                <select
                  name="branchId"
                  defaultValue={editing?.branchId ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">كل الفروع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">الفئة (اختياري)</label>
                <Input
                  name="category"
                  defaultValue={editing?.category || ""}
                  placeholder="مثال: salaries, hospitality, maintenance"
                />
                <p className="text-xs text-muted-foreground">
                  اتركها فارغة لتنطبق على كل الفئات. اكتب اسم الفئة بالإنجليزي للربط الدقيق.
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">العنوان *</label>
                <Input
                  name="title"
                  defaultValue={editing?.title || ""}
                  placeholder="مثال: مورد المستلزمات الخاصة يأتي شهرياً"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">الملاحظة *</label>
                <Textarea
                  name="note"
                  defaultValue={editing?.note || ""}
                  rows={4}
                  placeholder="اشرح بتفصيل لكي يفهم الذكاء السياق. مثلاً: 'مورد المستلزمات الطبية الخاصة (محمد علي) يزوّدنا مرة كل شهرين بمبلغ 5-8 ملايين دينار. هذا طبيعي ولا يستحق تنبيه.'"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveNote.isPending}>
                {saveNote.isPending ? "جارٍ الحفظ..." : editing ? "حفظ التعديل" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const roleLabels = getRoleLabels(t);
  const dir = t.dir;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [newBranchPassword, setNewBranchPassword] = useState("");
  const [showBranchPassword, setShowBranchPassword] = useState(false);

  const [backupEmail, setBackupEmail] = useState("");

  // Branch management states
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchLocation, setNewBranchLocation] = useState("");
  const [newBranchPw, setNewBranchPw] = useState("");
  const [showAddBranchDialog, setShowAddBranchDialog] = useState(false);
  const [showAddConfirmation, setShowAddConfirmation] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchWithDetails | null>(null);
  const [selectedBranchForSettings, setSelectedBranchForSettings] = useState<number | null>(null);

  // User management states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [revealedPwUserId, setRevealedPwUserId] = useState<number | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "reception" as UserRole,
    branchId: null as number | null,
    // Multi-branch — only relevant for branch_manager role. When set,
    // the user can switch between any of these branches in the UI.
    // Empty array means single-branch (use branchId).
    branchIds: [] as number[],
    isActive: true,
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: false,
    canDeletePatients: false,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: false,
    canDeletePayments: false,
    canViewReports: false,
    canManageAccounting: false,
    canAddExpenses: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canEditVisits: false,
    canDeleteVisits: false,
    canEnterSessions: false,
    canManageSessionTargets: false,
    canViewSessionsReport: false,
    // Expert capability, independent of the primary role — lets an accountant
    // or branch manager ALSO be assigned prosthetics work orders.
    canWorkAsExpert: false,
    // Doctor capability + the specialties it covers. Deliberately NOT part of
    // `defaultPermissions[role]`, so switching a user's role never silently
    // grants or revokes the right to sign clinical records.
    canWriteMedicalExam: false,
    canApproveDiscount: false,
    medicalSpecialties: [] as string[],
    language: "ar",
  });

  // A user whose PRIMARY role is doctor carries the exam capability implicitly,
  // so the switch is locked on and the specialty becomes mandatory.
  const isDoctorRole = userFormData.role === "doctor";

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: branchesWithDetails } = useQuery<BranchWithDetails[]>({
    queryKey: ["/api/admin/branches/full"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches/full", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: backupEmailData } = useQuery({
    queryKey: ["/api/admin/settings/backup-email"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/backup-email", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: systemUsers, isLoading: isLoadingUsers } = useQuery<SystemUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAdmin,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userFormData) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastUserCreated });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowUserDialog(false);
      resetUserForm();
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof userFormData> }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastUserUpdated });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowUserDialog(false);
      setEditingUser(null);
      resetUserForm();
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastUserDeleted });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const resetUserForm = () => {
    setUserFormData({
      username: "",
      displayName: "",
      password: "",
      role: "reception",
      branchId: null,
      branchIds: [],
      isActive: true,
      canViewPatients: true,
      canAddPatients: true,
      canEditPatients: false,
      canDeletePatients: false,
      canViewPayments: true,
      canAddPayments: true,
      canEditPayments: false,
      canDeletePayments: false,
      canViewReports: false,
      canManageAccounting: false,
      canAddExpenses: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTreatmentPlans: false,
      canEditVisits: false,
      canDeleteVisits: false,
      canEnterSessions: false,
      canManageSessionTargets: false,
      canViewSessionsReport: false,
      canWorkAsExpert: false,
      canWriteMedicalExam: false,
      canApproveDiscount: false,
      medicalSpecialties: [] as string[],
      language: "ar",
    });
  };

  const handleRoleChange = (role: UserRole) => {
    const perms = defaultPermissions[role];
    setUserFormData(prev => ({
      ...prev,
      role,
      ...perms,
    }));
  };

  const openEditUserDialog = (user: SystemUser) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      displayName: user.displayName || "",
      password: "",
      role: user.role as UserRole,
      branchId: user.branchId,
      branchIds: Array.isArray((user as any).branchIds) ? ((user as any).branchIds as number[]) : [],
      isActive: user.isActive ?? true,
      canViewPatients: user.canViewPatients ?? true,
      canAddPatients: user.canAddPatients ?? true,
      canEditPatients: user.canEditPatients ?? false,
      canDeletePatients: user.canDeletePatients ?? false,
      canViewPayments: user.canViewPayments ?? true,
      canAddPayments: user.canAddPayments ?? true,
      canEditPayments: user.canEditPayments ?? false,
      canDeletePayments: user.canDeletePayments ?? false,
      canViewReports: user.canViewReports ?? false,
      canManageAccounting: user.canManageAccounting ?? false,
      canAddExpenses: (user as any).canAddExpenses ?? false,
      canManageSettings: user.canManageSettings ?? false,
      canManageUsers: user.canManageUsers ?? false,
      canManageTreatmentPlans: (user as any).canManageTreatmentPlans ?? false,
      canEditVisits: (user as any).canEditVisits ?? false,
      canDeleteVisits: (user as any).canDeleteVisits ?? false,
      canEnterSessions: (user as any).canEnterSessions ?? false,
      canManageSessionTargets: (user as any).canManageSessionTargets ?? false,
      canViewSessionsReport: (user as any).canViewSessionsReport ?? false,
      canWorkAsExpert: (user as any).canWorkAsExpert ?? false,
      canWriteMedicalExam: (user as any).canWriteMedicalExam ?? false,
      canApproveDiscount: (user as any).canApproveDiscount ?? false,
      medicalSpecialties: Array.isArray((user as any).medicalSpecialties)
        ? ((user as any).medicalSpecialties as string[])
        : [],
      language: (user as any).language || "ar",
    });
    setShowUserDialog(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: userFormData });
    } else {
      createUserMutation.mutate(userFormData);
    }
  };

  const updateAdminPasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/admin/settings/admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastAdminPasswordChanged });
      setCurrentPassword("");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const updateBranchPasswordMutation = useMutation({
    mutationFn: async (data: { branchId: number; newPassword: string }) => {
      const res = await fetch("/api/admin/settings/branch-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastBranchPasswordChanged });
      setNewBranchPassword("");
      setSelectedBranch(null);
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  // ── تنبيهات تلغرام ──────────────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState("");
  const { data: telegramSettings } = useQuery<{ hasToken: boolean; tokenPreview: string; chatId: string }>({
    queryKey: ["/api/admin/settings/telegram"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/telegram", { credentials: "include" });
      if (!res.ok) return { hasToken: false, tokenPreview: "", chatId: "" };
      return res.json();
    },
  });
  const saveTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: telegramToken.trim() }),
      });
      if (!res.ok) throw new Error("تعذّر الحفظ");
      return res.json();
    },
    onSuccess: () => {
      setTelegramToken("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/telegram"] });
      toast({ title: "حُفظ التوكن — اضغط «إرسال رسالة تجريبية» لإتمام الربط" });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });
  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings/telegram/test", {
        method: "POST", credentials: "include",
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/telegram"] });
      toast({
        title: data.ok ? "نجح الربط ✅" : "لم يكتمل الربط",
        description: data.message,
        variant: data.ok ? undefined : "destructive",
      });
    },
  });

  const updateBackupEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/admin/settings/backup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastBackupEmailSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/backup-email"] });
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: { name: string; location?: string; password?: string }) => {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastBranchAdded });
      setNewBranchName("");
      setNewBranchLocation("");
      setNewBranchPw("");
      setShowAddBranchDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: number) => {
      const res = await fetch(`/api/admin/branches/${branchId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastBranchDeleted });
      setBranchToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const updateBranchSettingsMutation = useMutation({
    mutationFn: async (data: { branchId: number } & Partial<BranchSetting>) => {
      const res = await fetch("/api/admin/branches/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.adminSettings.toastBranchSettingsUpdated });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: t.adminSettings.toastError, description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateAdminPassword = () => {
    if (!currentPassword || !newAdminPassword) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastFillAllFields, variant: "destructive" });
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastPasswordsNotMatch, variant: "destructive" });
      return;
    }
    if (newAdminPassword.length < 4) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastPasswordMinLength, variant: "destructive" });
      return;
    }
    updateAdminPasswordMutation.mutate({ currentPassword, newPassword: newAdminPassword });
  };

  const handleUpdateBranchPassword = () => {
    if (!selectedBranch || !newBranchPassword) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastSelectBranchAndPassword, variant: "destructive" });
      return;
    }
    if (newBranchPassword.length < 4) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastPasswordMinLength, variant: "destructive" });
      return;
    }
    updateBranchPasswordMutation.mutate({ branchId: selectedBranch, newPassword: newBranchPassword });
  };

  const handleUpdateBackupEmail = () => {
    if (!backupEmail) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastEnterEmail, variant: "destructive" });
      return;
    }
    updateBackupEmailMutation.mutate(backupEmail);
  };

  const handleValidateAndConfirmAdd = () => {
    if (!newBranchName || newBranchName.length < 2) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastBranchNameMinLength, variant: "destructive" });
      return;
    }
    if (newBranchPw && newBranchPw.length < 4) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastPasswordMinLength, variant: "destructive" });
      return;
    }
    setShowAddConfirmation(true);
  };

  const handleCreateBranch = () => {
    createBranchMutation.mutate({
      name: newBranchName,
      location: newBranchLocation || undefined,
      password: newBranchPw || undefined,
    });
    setShowAddConfirmation(false);
  };

  type SettingKey = "showDashboard" | "showPatients" | "showPayments" | "showAccounting" | "showStatistics";

  const handleToggleSetting = (branchId: number, settingKey: SettingKey, currentValue: boolean) => {
    if (updateBranchSettingsMutation.isPending) return;
    updateBranchSettingsMutation.mutate({
      branchId,
      [settingKey]: !currentValue
    });
  };

  const selectedBranchDetails = branchesWithDetails?.find(b => b.id === selectedBranchForSettings);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPatients = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/export/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to export");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patients_backup_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: t.adminSettings.toastExportSuccess });
    } catch (error) {
      toast({ title: t.adminSettings.toastError, description: t.adminSettings.toastExportFailed, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t.adminSettings.unauthorized}</h2>
          <p className="text-slate-600">{t.adminSettings.unauthorizedDesc}</p>
        </Card>
      </div>
    );
  }

  const sectionLabels: { key: SettingKey; label: string; icon: typeof Users }[] = [
    { key: "showDashboard", label: t.adminSettings.showDashboard, icon: LayoutDashboard },
    { key: "showPatients", label: t.adminSettings.showPatients, icon: Users },
    { key: "showPayments", label: t.adminSettings.showPayments, icon: FileText },
    { key: "showAccounting", label: t.adminSettings.showAccounting, icon: DollarSign },
    { key: "showStatistics", label: t.adminSettings.showStatistics, icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto" dir={dir}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.adminSettings.pageTitle}</h1>
          <p className="text-slate-500">{t.adminSettings.pageSubtitle}</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full max-w-3xl mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            {t.adminSettings.tabUsers}
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2">
            <Key className="w-4 h-4" />
            {t.adminSettings.tabPasswords}
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="w-4 h-4" />
            {t.adminSettings.tabBranches}
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-2">
            <Layers className="w-4 h-4" />
            {t.adminSettings.tabManagement}
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Mail className="w-4 h-4" />
            {t.adminSettings.tabBackup}
          </TabsTrigger>
          <TabsTrigger value="ai-memory" className="gap-2">
            <Sparkles className="w-4 h-4" />
            ذاكرة الذكاء
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="gap-2">
            <Activity className="w-4 h-4" />
            دقّة الموظفين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.userManagement}</h2>
              </div>
              <Button
                onClick={() => {
                  resetUserForm();
                  setEditingUser(null);
                  setShowUserDialog(true);
                }}
                data-testid="button-add-user"
              >
                <Plus className="w-4 h-4 ml-2" />
                {t.adminSettings.addUser}
              </Button>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">{t.adminSettings.loading}</div>
            ) : systemUsers && systemUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableUsername}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableName}</th>
                      <th className="text-right py-3 px-4 font-medium">كلمة المرور</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableRole}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableBranch}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableStatus}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((user) => {
                      // Multi-branch users have branchIds populated; single-
                      // branch users fall back to the legacy branchId field.
                      const userBranchIds: number[] = Array.isArray((user as any).branchIds) && (user as any).branchIds.length > 0
                        ? (user as any).branchIds as number[]
                        : (user.branchId ? [user.branchId] : []);
                      const userBranchNames = userBranchIds
                        .map((id) => branches?.find((b) => b.id === id)?.name)
                        .filter(Boolean) as string[];
                      return (
                        <tr key={user.id} className="border-b hover-elevate" data-testid={`row-user-${user.id}`}>
                          <td className="py-3 px-4">{user.username}</td>
                          <td className="py-3 px-4">{user.displayName || "-"}</td>
                          <td className="py-3 px-4">
                            {(user as any).passwordPlain ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm" dir="ltr">
                                  {revealedPwUserId === user.id ? (user as any).passwordPlain : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRevealedPwUserId(revealedPwUserId === user.id ? null : user.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  tabIndex={-1}
                                  aria-label={revealedPwUserId === user.id ? "إخفاء" : "إظهار"}
                                >
                                  {revealedPwUserId === user.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">غير متوفّرة — عيّن كلمة مرور جديدة</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {roleLabels[user.role as UserRole] || user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {user.role === "admin" ? (
                              t.adminSettings.allBranches
                            ) : userBranchNames.length === 0 ? (
                              "-"
                            ) : userBranchNames.length === 1 ? (
                              userBranchNames[0]
                            ) : (
                              <div className="flex flex-wrap gap-1" title={userBranchNames.join("، ")}>
                                {userBranchNames.map((n) => (
                                  <Badge key={n} variant="outline" className="text-xs">
                                    {n}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.isActive ? "default" : "outline"}>
                              {user.isActive ? t.adminSettings.active : t.adminSettings.inactive}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditUserDialog(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setUserToDelete(user)}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t.adminSettings.noUsers}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="passwords" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.changeAdminPassword}</h2>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="currentPassword">{t.adminSettings.currentPassword}</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t.adminSettings.currentPasswordPlaceholder}
                    className="pl-10"
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newAdminPassword">{t.adminSettings.newPassword}</Label>
                <div className="relative mt-1">
                  <Input
                    id="newAdminPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder={t.adminSettings.newPasswordPlaceholder}
                    className="pl-10"
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmAdminPassword">{t.adminSettings.confirmNewPassword}</Label>
                <Input
                  id="confirmAdminPassword"
                  type="password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder={t.adminSettings.confirmNewPasswordPlaceholder}
                  className="mt-1"
                  data-testid="input-confirm-password"
                />
              </div>

              <Button 
                onClick={handleUpdateAdminPassword}
                disabled={updateAdminPasswordMutation.isPending}
                className="w-full gap-2"
                data-testid="button-save-admin-password"
              >
                <Save className="w-4 h-4" />
                {updateAdminPasswordMutation.isPending ? t.adminSettings.saving : t.adminSettings.savePassword}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.branchPasswords}</h2>
            </div>

            <div className="grid gap-4 mb-6">
              {branches?.map((branch) => (
                <div 
                  key={branch.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedBranch === branch.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedBranch(branch.id)}
                  data-testid={`branch-card-${branch.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                        {branch.currentPassword && (
                          <p className="text-sm font-mono text-primary mt-1">كلمة المرور: {branch.currentPassword}</p>
                        )}
                      </div>
                    </div>
                    {selectedBranch === branch.id && (
                      <Badge variant="default">{t.adminSettings.selected}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedBranch && (
              <div className="space-y-4 max-w-md border-t pt-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                  <Lock className="w-4 h-4" />
                  <span>{t.adminSettings.changePasswordFor} {branches?.find(b => b.id === selectedBranch)?.name}</span>
                </div>

                <div>
                  <Label htmlFor="newBranchPassword">{t.adminSettings.newBranchPassword}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newBranchPassword"
                      type={showBranchPassword ? "text" : "password"}
                      value={newBranchPassword}
                      onChange={(e) => setNewBranchPassword(e.target.value)}
                      placeholder={t.adminSettings.newPasswordPlaceholder}
                      className="pl-10"
                      data-testid="input-branch-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowBranchPassword(!showBranchPassword)}
                    >
                      {showBranchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateBranchPassword}
                  disabled={updateBranchPasswordMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-save-branch-password"
                >
                  <Save className="w-4 h-4" />
                  {updateBranchPasswordMutation.isPending ? t.adminSettings.saving : t.adminSettings.saveBranchPassword}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.branchManagement}</h2>
              </div>
              <Button 
                onClick={() => setShowAddBranchDialog(true)}
                className="gap-2"
                data-testid="button-add-branch"
              >
                <Plus className="w-4 h-4" />
                {t.adminSettings.addNewBranch}
              </Button>
            </div>

            <div className="grid gap-4">
              {branchesWithDetails?.map((branch) => (
                <div 
                  key={branch.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedBranchForSettings === branch.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          {branch.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {branch.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {branch.patientCount} {t.adminSettings.patient}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {branch.currentPassword ? (
                        <Badge variant="secondary" className="gap-1 font-mono text-xs">
                          <Lock className="w-3 h-3" />
                          {branch.currentPassword}
                        </Badge>
                      ) : branch.hasPassword ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t.adminSettings.hasPassword}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          {t.adminSettings.noPassword}
                        </Badge>
                      )}
                      <Button
                        variant={selectedBranchForSettings === branch.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedBranchForSettings(
                          selectedBranchForSettings === branch.id ? null : branch.id
                        )}
                        data-testid={`button-settings-${branch.id}`}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBranchToDelete(branch)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={branch.patientCount > 0}
                        data-testid={`button-delete-${branch.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedBranchForSettings === branch.id && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">{t.adminSettings.sectionSettings}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sectionLabels.map(({ key, label, icon: Icon }) => (
                          <div 
                            key={key}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-600" />
                              <span className="text-sm text-slate-700">{label}</span>
                            </div>
                            <Switch
                              checked={(branch.settings as any)[key] ?? true}
                              onCheckedChange={() => handleToggleSetting(
                                branch.id, 
                                key, 
                                (branch.settings as any)[key] ?? true
                              )}
                              disabled={updateBranchSettingsMutation.isPending}
                              data-testid={`switch-${key}-${branch.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.backupEmail}</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {t.adminSettings.backupEmailDesc}
            </p>

            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="backupEmail">{t.adminSettings.emailLabel}</Label>
                <Input
                  id="backupEmail"
                  type="email"
                  value={backupEmail || backupEmailData?.email || ""}
                  onChange={(e) => setBackupEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="mt-1"
                  dir="ltr"
                  data-testid="input-backup-email"
                />
              </div>

              <Button 
                onClick={handleUpdateBackupEmail}
                disabled={updateBackupEmailMutation.isPending}
                className="w-full gap-2"
                data-testid="button-save-backup-email"
              >
                <Save className="w-4 h-4" />
                {updateBackupEmailMutation.isPending ? t.adminSettings.saving : t.adminSettings.saveEmail}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">تنبيهات تلغرام — مريض جديد</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              تصلك رسالة تلغرام فورية عند تسجيل كل مريض جديد (الاسم، الفرع، النوع، مَن سجّله).
            </p>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2 leading-relaxed">
                الإعداد مرة واحدة: أنشئ بوتاً عبر <b>@BotFather</b> في تلغرام (أمر /newbot)،
                انسخ التوكن هنا واحفظه، افتح بوتك واضغط <b>Start</b>، ثم اضغط «إرسال رسالة تجريبية».
              </div>
              <div>
                <Label htmlFor="telegramToken">
                  توكن البوت
                  {telegramSettings?.hasToken && (
                    <span className="text-xs text-green-700 mr-2">
                      (محفوظ: {telegramSettings.tokenPreview}{telegramSettings.chatId ? " — مرتبط ✅" : " — بانتظار الرسالة التجريبية"})
                    </span>
                  )}
                </Label>
                <Input
                  id="telegramToken"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:AA...  (يُلصق مرة واحدة)"
                  className="mt-1"
                  dir="ltr"
                  data-testid="input-telegram-token"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => saveTelegramMutation.mutate()}
                  disabled={!telegramToken.trim() || saveTelegramMutation.isPending}
                  className="flex-1 gap-2"
                  data-testid="button-save-telegram"
                >
                  <Save className="w-4 h-4" />
                  {saveTelegramMutation.isPending ? "جارٍ الحفظ…" : "حفظ التوكن"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testTelegramMutation.mutate()}
                  disabled={!telegramSettings?.hasToken || testTelegramMutation.isPending}
                  className="flex-1 gap-2"
                  data-testid="button-test-telegram"
                >
                  <Bell className="w-4 h-4" />
                  {testTelegramMutation.isPending ? "جارٍ الإرسال…" : "إرسال رسالة تجريبية"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">{t.adminSettings.securityNote}</h3>
                <p className="text-sm text-amber-700">
                  {t.adminSettings.securityNoteDesc}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.sendBackup}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t.adminSettings.sendBackupDesc}
            </p>

            <BackupStatusCard />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.exportPatientData}</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {t.adminSettings.exportPatientDataDesc}
            </p>

            <Button 
              onClick={handleExportPatients}
              disabled={isExporting}
              className="w-full gap-2 max-w-md"
              data-testid="button-export-patients"
            >
              <Download className="w-4 h-4" />
              {isExporting ? t.adminSettings.exporting : t.adminSettings.exportPatientsCsv}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="ai-memory" className="space-y-6">
          <AiMemoryTab />
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-6">
          <EmployeeAccuracyTab />
        </TabsContent>
      </Tabs>

      <Card className="p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800">{t.adminSettings.adminPermissions}</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permPatientManagement}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permFinanceManagement}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <FileText className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permReports}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permVisits}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Building2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permAllBranches}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permStatistics}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Key className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permPasswords}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Settings className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{t.adminSettings.permSettings}</span>
          </div>
        </div>
      </Card>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranchDialog} onOpenChange={setShowAddBranchDialog}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t.adminSettings.addBranchDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {t.adminSettings.addBranchDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newBranchName">{t.adminSettings.branchNameLabel}</Label>
              <Input
                id="newBranchName"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder={t.adminSettings.branchNamePlaceholder}
                className="mt-1"
                data-testid="input-new-branch-name"
              />
            </div>
            <div>
              <Label htmlFor="newBranchLocation">{t.adminSettings.locationLabel}</Label>
              <Input
                id="newBranchLocation"
                value={newBranchLocation}
                onChange={(e) => setNewBranchLocation(e.target.value)}
                placeholder={t.adminSettings.locationPlaceholder}
                className="mt-1"
                data-testid="input-new-branch-location"
              />
            </div>
            <div>
              <Label htmlFor="newBranchPw">{t.adminSettings.passwordOptional}</Label>
              <Input
                id="newBranchPw"
                type="password"
                value={newBranchPw}
                onChange={(e) => setNewBranchPw(e.target.value)}
                placeholder={t.adminSettings.passwordPlaceholder}
                className="mt-1"
                data-testid="input-new-branch-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddBranchDialog(false)}
            >
              {t.adminSettings.cancel}
            </Button>
            <Button
              onClick={handleValidateAndConfirmAdd}
              disabled={createBranchMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-add-branch"
            >
              {t.adminSettings.addBranch}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Branch Confirmation AlertDialog */}
      <AlertDialog open={showAddConfirmation} onOpenChange={setShowAddConfirmation}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" />
              {t.adminSettings.confirmAddBranch}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.adminSettings.confirmAddBranchDesc} "{newBranchName}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-add-branch">
              {t.adminSettings.no}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateBranch}
              disabled={createBranchMutation.isPending}
              className="gap-2"
              data-testid="button-yes-add-branch"
            >
              {createBranchMutation.isPending ? t.adminSettings.adding : t.adminSettings.yes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Branch Confirmation AlertDialog */}
      <AlertDialog open={!!branchToDelete} onOpenChange={() => setBranchToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t.adminSettings.confirmDeleteBranch}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.adminSettings.confirmDeleteBranchDesc} "{branchToDelete?.name}"؟ {t.adminSettings.cannotUndoAction}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete-branch">
              {t.adminSettings.no}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => branchToDelete && deleteBranchMutation.mutate(branchToDelete.id)}
              disabled={deleteBranchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-branch"
            >
              {deleteBranchMutation.isPending ? t.adminSettings.deleting : t.adminSettings.yes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Management Dialog */}
      <Dialog open={showUserDialog} onOpenChange={(open) => {
        if (!open) {
          setShowUserDialog(false);
          setEditingUser(null);
          resetUserForm();
        }
      }}>
        <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t.adminSettings.editUser : t.adminSettings.addNewUser}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? t.adminSettings.editUserDesc : t.adminSettings.addNewUserDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">{t.adminSettings.usernameLabel}</Label>
                <Input
                  id="username"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={t.adminSettings.usernamePlaceholder}
                  className="mt-1"
                  data-testid="input-user-username"
                />
              </div>
              <div>
                <Label htmlFor="displayName">{t.adminSettings.displayNameLabel}</Label>
                <Input
                  id="displayName"
                  value={userFormData.displayName}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={t.adminSettings.displayNamePlaceholder}
                  className="mt-1"
                  data-testid="input-user-displayname"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">{editingUser ? t.adminSettings.newPasswordLabel : t.adminSettings.passwordRequired}</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showUserPassword ? "text" : "password"}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingUser ? t.adminSettings.leaveBlankToKeep : t.adminSettings.passwordLabel}
                    className="pl-9"
                    data-testid="input-user-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword((v) => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showUserPassword ? "إخفاء" : "إظهار"}
                  >
                    {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>{t.adminSettings.roleLabel}</Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value) => handleRoleChange(value as UserRole)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-user-role">
                    <SelectValue placeholder={t.adminSettings.selectRole} />
                  </SelectTrigger>
                  {/* Derived from ROLE_PICKER_ORDER, never hand-listed: this was
                      previously seven literal <SelectItem>s, so adding the
                      `doctor` role everywhere else still left it unpickable.
                      Now a new role in the union is a compile error until it is
                      given a position and a label. */}
                  <SelectContent>
                    {ROLE_PICKER_ORDER.map((role) => (
                      <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.adminSettings.languageLabel}</Label>
                <Select
                  value={userFormData.language}
                  onValueChange={(value) => setUserFormData(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-user-language">
                    <SelectValue placeholder={t.adminSettings.selectLanguage} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t.adminSettings.arabic}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {userFormData.role !== "admin" && userFormData.role !== "branch_manager" && userFormData.role !== "prosthetics_expert" && (
              <div>
                <Label>{t.adminSettings.branchLabel}</Label>
                <Select
                  value={userFormData.branchId?.toString() || ""}
                  onValueChange={(value) => setUserFormData(prev => ({ ...prev, branchId: Number(value), branchIds: [] }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-user-branch">
                    <SelectValue placeholder={t.adminSettings.selectBranch} />
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

            {/* Branch managers can be assigned to multiple branches.
                The list of selected branches doubles as accessibleBranches
                at runtime — they'll switch between them with a dropdown
                in the header. */}
            {(userFormData.role === "branch_manager" || userFormData.role === "prosthetics_expert") && (
              <div>
                <Label className="flex items-center gap-2">
                  {userFormData.role === "prosthetics_expert" ? "الفروع المسموح له بها" : "الفروع التي يديرها"}
                  <span className="text-xs font-normal text-muted-foreground">
                    (يمكن اختيار أكثر من فرع — سيستطيع التبديل بينها)
                  </span>
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-2 border rounded-md p-3">
                  {branches?.map((branch) => {
                    const checked = (userFormData.branchIds ?? []).includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setUserFormData((prev) => {
                              const current = new Set(prev.branchIds ?? []);
                              if (e.target.checked) current.add(branch.id);
                              else current.delete(branch.id);
                              const next = Array.from(current);
                              return {
                                ...prev,
                                branchIds: next,
                                // Keep the legacy branchId synced to the
                                // first selection so older queries that
                                // still read branchId directly stay
                                // sensible.
                                branchId: next[0] ?? null,
                              };
                            });
                          }}
                          data-testid={`checkbox-branch-${branch.id}`}
                        />
                        <span>{branch.name}</span>
                      </label>
                    );
                  })}
                </div>
                {(userFormData.branchIds ?? []).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    اختر فرعاً واحداً على الأقلّ.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={userFormData.isActive}
                onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-user-active"
              />
              <Label htmlFor="isActive">{t.adminSettings.userActive}</Label>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">{t.adminSettings.permissions}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.adminSettings.permCatPatients}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewPatients"
                        checked={userFormData.canViewPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewPatients: checked }))}
                      />
                      <Label htmlFor="canViewPatients" className="text-sm">{t.adminSettings.canViewPatients}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canAddPatients"
                        checked={userFormData.canAddPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canAddPatients: checked }))}
                      />
                      <Label htmlFor="canAddPatients" className="text-sm">{t.adminSettings.canAddPatients}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEditPatients"
                        checked={userFormData.canEditPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEditPatients: checked }))}
                      />
                      <Label htmlFor="canEditPatients" className="text-sm">{t.adminSettings.canEditPatients}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canDeletePatients"
                        checked={userFormData.canDeletePatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canDeletePatients: checked }))}
                      />
                      <Label htmlFor="canDeletePatients" className="text-sm">{t.adminSettings.canDeletePatients}</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.adminSettings.permCatPayments}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewPayments"
                        checked={userFormData.canViewPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewPayments: checked }))}
                      />
                      <Label htmlFor="canViewPayments" className="text-sm">{t.adminSettings.canViewPayments}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canAddPayments"
                        checked={userFormData.canAddPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canAddPayments: checked }))}
                      />
                      <Label htmlFor="canAddPayments" className="text-sm">{t.adminSettings.canAddPayments}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEditPayments"
                        checked={userFormData.canEditPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEditPayments: checked }))}
                      />
                      <Label htmlFor="canEditPayments" className="text-sm">{t.adminSettings.canEditPayments}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canDeletePayments"
                        checked={userFormData.canDeletePayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canDeletePayments: checked }))}
                      />
                      <Label htmlFor="canDeletePayments" className="text-sm">{t.adminSettings.canDeletePayments}</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.adminSettings.permCatReportsAccounting}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewReports"
                        checked={userFormData.canViewReports}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewReports: checked }))}
                      />
                      <Label htmlFor="canViewReports" className="text-sm">{t.adminSettings.canViewReports}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageAccounting"
                        checked={userFormData.canManageAccounting}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageAccounting: checked }))}
                      />
                      <Label htmlFor="canManageAccounting" className="text-sm">{t.adminSettings.canManageAccounting}</Label>
                    </div>
                    {/* Narrow grant: add & view expenses only (المصروفات tab),
                        without full accounting management. */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canAddExpenses"
                        checked={userFormData.canAddExpenses}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canAddExpenses: checked }))}
                        data-testid="switch-canAddExpenses"
                        disabled={userFormData.canManageAccounting}
                      />
                      <Label htmlFor="canAddExpenses" className="text-sm">
                        إضافة المصاريف فقط
                        {userFormData.canManageAccounting && (
                          <span className="text-xs text-muted-foreground mr-1">(مشمولة في إدارة المحاسبة)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.adminSettings.permCatSystem}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageSettings"
                        checked={userFormData.canManageSettings}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageSettings: checked }))}
                      />
                      <Label htmlFor="canManageSettings" className="text-sm">{t.adminSettings.canManageSettings}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageUsers"
                        checked={userFormData.canManageUsers}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageUsers: checked }))}
                      />
                      <Label htmlFor="canManageUsers" className="text-sm">{t.adminSettings.canManageUsers}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageTreatmentPlans"
                        checked={userFormData.canManageTreatmentPlans}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageTreatmentPlans: checked }))}
                        data-testid="switch-canManageTreatmentPlans"
                      />
                      <Label htmlFor="canManageTreatmentPlans" className="text-sm">{t.adminSettings.canManageTreatmentPlans}</Label>
                    </div>
                    {/* Per-user visit permissions. Off by default;
                        admin flips them on for trusted staff who
                        shouldn't be branch managers. */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEditVisits"
                        checked={userFormData.canEditVisits}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEditVisits: checked }))}
                        data-testid="switch-canEditVisits"
                      />
                      <Label htmlFor="canEditVisits" className="text-sm">تعديل زيارات المرضى</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canDeleteVisits"
                        checked={userFormData.canDeleteVisits}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canDeleteVisits: checked }))}
                        data-testid="switch-canDeleteVisits"
                      />
                      <Label htmlFor="canDeleteVisits" className="text-sm">حذف زيارات المرضى</Label>
                    </div>
                    {/* Session-tracking module permissions (migration 009).
                        Reception gets entry by default; managers get all
                        three; admin grants per user as needed. */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEnterSessions"
                        checked={userFormData.canEnterSessions}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEnterSessions: checked }))}
                        data-testid="switch-canEnterSessions"
                      />
                      <Label htmlFor="canEnterSessions" className="text-sm">إدخال الجلسات اليومية</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageSessionTargets"
                        checked={userFormData.canManageSessionTargets}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageSessionTargets: checked }))}
                        data-testid="switch-canManageSessionTargets"
                      />
                      <Label htmlFor="canManageSessionTargets" className="text-sm">إدارة أهداف الجلسات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewSessionsReport"
                        checked={userFormData.canViewSessionsReport}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewSessionsReport: checked }))}
                        data-testid="switch-canViewSessionsReport"
                      />
                      <Label htmlFor="canViewSessionsReport" className="text-sm">عرض تقرير الجلسات</Label>
                    </div>
                  </div>
                </div>

                {/* Expert capability — independent of the primary role. */}
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="canWorkAsExpert"
                      checked={userFormData.canWorkAsExpert}
                      onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canWorkAsExpert: checked }))}
                      data-testid="switch-canWorkAsExpert"
                      disabled={userFormData.role === "prosthetics_expert"}
                    />
                    <Label htmlFor="canWorkAsExpert" className="text-sm font-semibold">
                      يعمل أيضاً كخبير أطراف
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userFormData.role === "prosthetics_expert"
                      ? "هذا المستخدم خبير أطراف أصلاً (دوره الأساسي)."
                      : "يظهر في قائمة الخبراء ويُسنَد له أوامر تصنيع ويفتح لوحة التصنيع — مع احتفاظه بكامل صلاحيات دوره الأساسي (مثل محاسب خبير، أو مدير فرع خبير)."}
                  </p>
                </div>

                {/* Doctor. Mirrors the expert block above: a user whose PRIMARY
                    role is doctor carries the capability implicitly (the switch
                    is locked on), while anyone else — a branch manager who also
                    examines — can be granted it explicitly. Never auto-granted
                    to an admin: signing a clinical record is a professional act. */}
                <div className="mt-4 rounded-lg border border-teal-300 bg-teal-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="canWriteMedicalExam"
                      checked={isDoctorRole || userFormData.canWriteMedicalExam}
                      onCheckedChange={(checked) =>
                        setUserFormData(prev => ({
                          ...prev,
                          canWriteMedicalExam: checked,
                          // Revoking clears the specialties too, so a re-grant
                          // always starts from an explicit choice.
                          medicalSpecialties: checked ? prev.medicalSpecialties : [],
                        }))
                      }
                      data-testid="switch-canWriteMedicalExam"
                      disabled={isDoctorRole}
                    />
                    <Label htmlFor="canWriteMedicalExam" className="text-sm font-semibold">
                      طبيب — يكتب المعاينة الطبية
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDoctorRole
                      ? "هذا المستخدم طبيب أصلاً (دوره الأساسي) — المعاينة من صلاحياته تلقائياً."
                      : "المعاينة سجلّ سريري موقّع باسمه، تُقفل بعد الحفظ فلا تُعدّل ولا تُحذف، والتصحيح يكون بملحق مؤرّخ. بقية الموظفين يرونها للقراءة فقط."}
                  </p>

                  {(isDoctorRole || userFormData.canWriteMedicalExam) && (
                    <div className="mt-3 border-t border-teal-200 pt-3">
                      <Label className="text-xs font-semibold text-teal-900">
                        اختصاصاته <span className="font-normal text-muted-foreground">(اختياري — اتركها فارغة ليغطّي الثلاثة)</span>
                      </Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {MEDICAL_SPECIALTIES.map((spec) => (
                          <div key={spec} className="flex items-center gap-2">
                            <Checkbox
                              id={`spec-${spec}`}
                              checked={userFormData.medicalSpecialties.includes(spec)}
                              onCheckedChange={(checked) =>
                                setUserFormData(prev => ({
                                  ...prev,
                                  medicalSpecialties: checked
                                    ? [...prev.medicalSpecialties, spec]
                                    : prev.medicalSpecialties.filter((s) => s !== spec),
                                }))
                              }
                              data-testid={`checkbox-specialty-${spec}`}
                            />
                            <Label htmlFor={`spec-${spec}`} className="text-sm font-normal">
                              {SPECIALTY_LABELS[spec]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {userFormData.medicalSpecialties.length === 0 && (
                        <p className="text-xs mt-2 text-muted-foreground">
                          بلا تحديد ⇐ يعاين في الاختصاصات الثلاثة. حدِّد اختصاصاً أو أكثر
                          فقط إن أردت حصر قائمة عمله بها.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* اعتمادُ الخصم والتبرّع — **عَلَمٌ ماليٌّ لا سريريّ**.
                    ولذلك لا يتبع دورَ الطبيب كما يتبعه العَلَمُ أعلاه: مديرُ
                    الفرع والمسؤولُ يعتمدان بسلطتهما، وهذا المفتاح لتخويلِ
                    مَن دورُه شيءٌ آخر — طبيبٌ مسؤولٌ عن قسمٍ مثلاً. */}
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="canApproveDiscount"
                      checked={userFormData.canApproveDiscount}
                      onCheckedChange={(checked) =>
                        setUserFormData(prev => ({ ...prev, canApproveDiscount: checked }))
                      }
                      data-testid="switch-canApproveDiscount"
                    />
                    <Label htmlFor="canApproveDiscount" className="text-sm font-semibold">
                      يعتمد الخصومات والخدمات المجّانية
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    الخصم قرار <b>مالي</b> لا سريري، فلا يُمنح لكل طبيب. المسؤول
                    العام ومدير الفرع يعتمدان في نطاقهما تلقائياً؛ هذا المفتاح
                    لتخويل موظّف بعينه دورُه شيء آخر. ومَن يحمله يعتمد خصمَ فرعه
                    فقط.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row-reverse justify-start gap-2 mt-4">
            <Button
              onClick={handleSaveUser}
              disabled={
                createUserMutation.isPending || updateUserMutation.isPending ||
                !userFormData.username ||
                (!editingUser && !userFormData.password) ||
                (userFormData.role !== "admin" &&
                  userFormData.role !== "branch_manager" &&
                  userFormData.role !== "prosthetics_expert" &&
                  !userFormData.branchId) ||
                ((userFormData.role === "branch_manager" || userFormData.role === "prosthetics_expert") && (userFormData.branchIds ?? []).length === 0) 
              }
              data-testid="button-save-user"
            >
              {createUserMutation.isPending || updateUserMutation.isPending ? t.adminSettings.saving : (editingUser ? t.adminSettings.update : t.adminSettings.add)}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowUserDialog(false);
                setEditingUser(null);
                resetUserForm();
              }}
              data-testid="button-cancel-user"
            >
              {t.adminSettings.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation AlertDialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t.adminSettings.confirmDeleteUser}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.adminSettings.confirmDeleteUserDesc} "{userToDelete?.username}"؟ {t.adminSettings.cannotUndoAction}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete-user">
              {t.adminSettings.no}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? t.adminSettings.deleting : t.adminSettings.yes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
