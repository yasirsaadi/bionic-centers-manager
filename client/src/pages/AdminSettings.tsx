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
  Trash2
} from "lucide-react";
import type { Branch, BranchSetting, SystemUser } from "@shared/schema";
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

type UserRole = "admin" | "branch_manager" | "accountant" | "reception" | "therapist" | "surveyor";

function getRoleLabels(t: ReturnType<typeof useTranslation>["t"]): Record<UserRole, string> {
  return {
    admin: t.roles.admin,
    branch_manager: t.roles.branch_manager,
    accountant: t.roles.accountant,
    reception: t.roles.reception,
    therapist: t.roles.therapist,
    surveyor: t.roles.surveyor,
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
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageTreatmentPlans: boolean;
  canManageSurveys: boolean;
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
    canManageSettings: true,
    canManageUsers: true,
    canManageTreatmentPlans: true,
    canManageSurveys: true,
  },
  branch_manager: {
    // مدير الفرع: صلاحيات كاملة على فرعه فقط، تُعامَل كمسؤول النظام
    // داخل الفرع. الخادم يفرض هذه الصلاحيات تلقائياً عند تسجيل الدخول
    // حتى لو غُيّرت من الواجهة، لكن نضع كل القيم true هنا لتعكس
    // النموذج بدقّة عند الإنشاء/التعديل.
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
    canManageSettings: true,
    canManageUsers: true,
    canManageTreatmentPlans: true,
    canManageSurveys: true,
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
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canManageSurveys: false,
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
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    // الاستقبال هم من يجرون الاستبيان مع المريض بعد انتهاء جلسته،
    // فيلزمهم وصول كامل لتعبئة الاستبيانات وقراءة النتائج.
    canManageSurveys: true,
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
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: true,
    canManageSurveys: false,
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
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    canManageSurveys: true,
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
  anomalyDecisionsCount: number;
  editCount: number;
  deleteCount: number;
  loginCount: number;
  lastActivityAt: string | null;
  score: number;
  totalEntries: number;
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

function EmployeeAccuracyTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery<{ days: number; rows: AccuracyRow[] }>({
    queryKey: ["/api/admin/employee-accuracy", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/employee-accuracy?days=${days}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  // Hide the legacy "unknown" bucket from the main grid — show it
  // separately at the bottom as a one-line note for transparency.
  const knownRows = rows.filter((r) => r.createdBy !== "unknown");
  const unknownRow = rows.find((r) => r.createdBy === "unknown");

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              دقّة وحركة الموظفين
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              تقييم أداء كل موظّف بناءً على نشاطه الفعليّ في النظام: الإدخالات، التعديلات، الحذف، التنبيهات، تسجيلات الدخول.
            </p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="p-2 border rounded-md text-sm bg-background"
            data-testid="select-accuracy-window"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوماً</option>
            <option value={60}>آخر 60 يوماً</option>
            <option value={90}>آخر 90 يوماً</option>
            <option value={180}>آخر 180 يوماً</option>
          </select>
        </div>

        {/* Score legend / explainer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
          <div className="rounded-md border bg-green-50 px-3 py-2">
            <div className="font-semibold text-green-800">ممتاز ≥ 75</div>
            <div className="text-green-700/70">نشاط مرتفع وأخطاء قليلة</div>
          </div>
          <div className="rounded-md border bg-blue-50 px-3 py-2">
            <div className="font-semibold text-blue-800">جيّد 50-74</div>
            <div className="text-blue-700/70">أداء طبيعي</div>
          </div>
          <div className="rounded-md border bg-amber-50 px-3 py-2">
            <div className="font-semibold text-amber-800">مقبول 25-49</div>
            <div className="text-amber-700/70">يحتاج تحسين بسيط</div>
          </div>
          <div className="rounded-md border bg-red-50 px-3 py-2">
            <div className="font-semibold text-red-800">يحتاج متابعة &lt; 25</div>
            <div className="text-red-700/70">نشاط قليل أو أخطاء كثيرة</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">جارٍ التحميل…</div>
        ) : knownRows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد بيانات في الفترة المحدّدة.
          </div>
        ) : (
          <div className="space-y-3">
            {knownRows.map((r) => (
              <div
                key={r.createdBy}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{r.displayName}</span>
                      <Badge variant="outline" className="text-xs">
                        {r.role ? ROLE_LABELS[r.role] ?? r.role : "—"}
                      </Badge>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <MetricBox label="مصاريف" count={r.expenseCount} amount={r.expenseTotal} />
                  <MetricBox label="فواتير" count={r.invoiceCount} amount={r.invoiceTotal} />
                  <MetricBox label="مشتريات" count={r.purchaseCount} amount={r.purchaseTotal} />
                  <MetricBox label="إجمالي الإدخالات" count={r.totalEntries} highlight />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <MetricBox label="تعديلات" count={r.editCount} tone="amber" />
                  <MetricBox label="عمليّات حذف" count={r.deleteCount} tone={r.deleteCount > 5 ? "red" : "default"} />
                  <MetricBox label="قرارات تنبيهات" count={r.anomalyDecisionsCount} />
                  <MetricBox label="تسجيلات دخول" count={r.loginCount} />
                </div>
              </div>
            ))}
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
          <li><span className="font-semibold text-foreground">النشاط (60 نقطة كحدّ أقصى)</span> — مقياس لوغاريتمي على عدد الإدخالات. مزيد من الإدخالات يرفع النقاط لكن العائد يقلّ تدريجياً.</li>
          <li><span className="font-semibold text-foreground">الجودة (30 نقطة)</span> — تنخفض كلّما زادت نسبة الحذف والتنبيهات بالنسبة للنشاط الكلّي.</li>
          <li><span className="font-semibold text-foreground">الانضباط (10 نقاط)</span> — تسجيلات الدخول النشطة في الفترة.</li>
          <li>النقاط مؤشّر استرشادي للمسؤول، وليست تقييماً نهائيّاً. تعديل واحد على مصروف خاطئ ليس خطأ — قد يكون تصحيحاً.</li>
        </ul>
      </Card>
    </div>
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
  count: number;
  amount?: number;
  highlight?: boolean;
  tone?: "default" | "amber" | "red";
}) {
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
        {count.toLocaleString("ar-IQ")}
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
  const [userFormData, setUserFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "reception" as UserRole,
    branchId: null as number | null,
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
    canManageSettings: false,
    canManageUsers: false,
    canManageTreatmentPlans: false,
    language: "ar",
  });

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
      canManageSettings: false,
      canManageUsers: false,
      canManageTreatmentPlans: false,
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
      canManageSettings: user.canManageSettings ?? false,
      canManageUsers: user.canManageUsers ?? false,
      canManageTreatmentPlans: (user as any).canManageTreatmentPlans ?? false,
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
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableRole}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableBranch}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableStatus}</th>
                      <th className="text-right py-3 px-4 font-medium">{t.adminSettings.tableActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((user) => {
                      const branch = branches?.find(b => b.id === user.branchId);
                      return (
                        <tr key={user.id} className="border-b hover-elevate" data-testid={`row-user-${user.id}`}>
                          <td className="py-3 px-4">{user.username}</td>
                          <td className="py-3 px-4">{user.displayName || "-"}</td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {roleLabels[user.role as UserRole] || user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{branch?.name || (user.role === "admin" ? t.adminSettings.allBranches : "-")}</td>
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
                <Input
                  id="password"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? t.adminSettings.leaveBlankToKeep : t.adminSettings.passwordLabel}
                  className="mt-1"
                  data-testid="input-user-password"
                />
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
                  <SelectContent>
                    <SelectItem value="admin">{t.roles.admin}</SelectItem>
                    <SelectItem value="branch_manager">{t.roles.branch_manager}</SelectItem>
                    <SelectItem value="accountant">{t.roles.accountant}</SelectItem>
                    <SelectItem value="reception">{t.roles.reception}</SelectItem>
                    <SelectItem value="therapist">{t.roles.therapist}</SelectItem>
                    <SelectItem value="surveyor">{t.roles.surveyor}</SelectItem>
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

            {userFormData.role !== "admin" && (
              <div>
                <Label>{t.adminSettings.branchLabel}</Label>
                <Select
                  value={userFormData.branchId?.toString() || ""}
                  onValueChange={(value) => setUserFormData(prev => ({ ...prev, branchId: Number(value) }))}
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row-reverse justify-start gap-2 mt-4">
            <Button
              onClick={handleSaveUser}
              disabled={createUserMutation.isPending || updateUserMutation.isPending || !userFormData.username || (!editingUser && !userFormData.password) || (userFormData.role !== "admin" && !userFormData.branchId)}
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
