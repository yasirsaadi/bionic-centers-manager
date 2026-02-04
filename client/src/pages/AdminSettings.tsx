import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
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
  Layers
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
  settings: {
    showDashboard: boolean;
    showPatients: boolean;
    showPayments: boolean;
    showAccounting: boolean;
    showStatistics: boolean;
  };
}

type UserRole = "admin" | "branch_manager" | "reception";

const roleLabels: Record<UserRole, string> = {
  admin: "مسؤول النظام",
  branch_manager: "مدير فرع",
  reception: "موظف استقبال"
};

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
  },
  branch_manager: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewPayments: true,
    canAddPayments: true,
    canEditPayments: true,
    canDeletePayments: false,
    canViewReports: true,
    canManageAccounting: false,
    canManageSettings: false,
    canManageUsers: false,
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
  }
};

function BackupStatusCard() {
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

  const { data: branches } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
  });

  const handleSendBackup = async () => {
    if ((filterType === "branch" || filterType === "branch_today") && !selectedBranchId) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار الفرع أولاً",
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
          title: "تم الإرسال",
          description: data.message || "تم إرسال النسخة الاحتياطية بنجاح",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-status"] });
      } else {
        toast({
          title: "خطأ",
          description: data.message || "فشل إرسال النسخة الاحتياطية",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatLastBackup = (dateStr: string | null) => {
    if (!dateStr) return "لم يتم الإرسال بعد";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("ar-IQ", {
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
            <p className="text-sm text-muted-foreground">آخر نسخة احتياطية:</p>
            <p className="font-medium">
              {isLoading ? "جاري التحميل..." : formatLastBackup(backupStatus?.lastBackup || null)}
            </p>
            {backupStatus && backupStatus.hoursAgo !== null && (
              <p className="text-xs text-muted-foreground">
                (منذ {backupStatus.hoursAgo} ساعة)
              </p>
            )}
          </div>
          <div>
            {backupStatus && backupStatus.hoursAgo !== null && backupStatus.hoursAgo < 24 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 ml-1" />
                محدث
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertTriangle className="w-3 h-3 ml-1" />
                يحتاج تحديث
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label>اختر نوع البيانات للنسخة الاحتياطية:</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            data-testid="button-filter-all"
          >
            جميع المرضى
          </Button>
          <Button
            type="button"
            variant={filterType === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("today")}
            data-testid="button-filter-today"
          >
            مرضى اليوم (كل الفروع)
          </Button>
        </div>

        <div className="border-t pt-3 mt-2">
          <Label className="text-sm text-muted-foreground mb-2 block">أو اختر فرع معين:</Label>
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
              <SelectValue placeholder="اختر الفرع (اختياري)" />
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
                جميع مرضى الفرع
              </Button>
              <Button
                type="button"
                variant={filterType === "branch_today" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("branch_today")}
                data-testid="button-filter-branch-today"
              >
                مرضى اليوم فقط للفرع
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
                إلغاء اختيار الفرع
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
        {isSending ? "جاري الإرسال..." : "إرسال نسخة احتياطية الآن"}
      </Button>
    </div>
  );
}

export default function AdminSettings() {
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({ title: "تم إنشاء المستخدم بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowUserDialog(false);
      resetUserForm();
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم تحديث المستخدم بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowUserDialog(false);
      setEditingUser(null);
      resetUserForm();
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم حذف المستخدم بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم تغيير كلمة مرور المسؤول بنجاح" });
      setCurrentPassword("");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم تغيير كلمة مرور الفرع بنجاح" });
      setNewBranchPassword("");
      setSelectedBranch(null);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم حفظ البريد الإلكتروني الاحتياطي بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/backup-email"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم إضافة الفرع بنجاح" });
      setNewBranchName("");
      setNewBranchLocation("");
      setNewBranchPw("");
      setShowAddBranchDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم حذف الفرع بنجاح" });
      setBranchToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
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
      toast({ title: "تم تحديث إعدادات الفرع" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches/full"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateAdminPassword = () => {
    if (!currentPassword || !newAdminPassword) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (newAdminPassword.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    updateAdminPasswordMutation.mutate({ currentPassword, newPassword: newAdminPassword });
  };

  const handleUpdateBranchPassword = () => {
    if (!selectedBranch || !newBranchPassword) {
      toast({ title: "خطأ", description: "يرجى اختيار الفرع وإدخال كلمة المرور الجديدة", variant: "destructive" });
      return;
    }
    if (newBranchPassword.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    updateBranchPasswordMutation.mutate({ branchId: selectedBranch, newPassword: newBranchPassword });
  };

  const handleUpdateBackupEmail = () => {
    if (!backupEmail) {
      toast({ title: "خطأ", description: "يرجى إدخال البريد الإلكتروني", variant: "destructive" });
      return;
    }
    updateBackupEmailMutation.mutate(backupEmail);
  };

  const handleValidateAndConfirmAdd = () => {
    if (!newBranchName || newBranchName.length < 2) {
      toast({ title: "خطأ", description: "اسم الفرع يجب أن يكون حرفين على الأقل", variant: "destructive" });
      return;
    }
    if (newBranchPw && newBranchPw.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
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
      
      toast({ title: "تم تصدير البيانات بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تصدير البيانات", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">غير مصرح</h2>
          <p className="text-slate-600">هذه الصفحة متاحة فقط لمسؤول النظام</p>
        </Card>
      </div>
    );
  }

  const sectionLabels: { key: SettingKey; label: string; icon: typeof Users }[] = [
    { key: "showDashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { key: "showPatients", label: "سجل المرضى + إضافة مريض", icon: Users },
    { key: "showPayments", label: "التقارير المالية", icon: FileText },
    { key: "showAccounting", label: "النظام المحاسبي", icon: DollarSign },
    { key: "showStatistics", label: "الإحصاءات", icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إعدادات النظام</h1>
          <p className="text-slate-500">إدارة كلمات المرور والفروع وإعدادات النظام</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2">
            <Key className="w-4 h-4" />
            كلمات المرور
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="w-4 h-4" />
            الفروع
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-2">
            <Layers className="w-4 h-4" />
            إدارة الفروع
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Mail className="w-4 h-4" />
            الاحتياط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-slate-800">إدارة المستخدمين</h2>
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
                إضافة مستخدم
              </Button>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : systemUsers && systemUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium">اسم المستخدم</th>
                      <th className="text-right py-3 px-4 font-medium">الاسم</th>
                      <th className="text-right py-3 px-4 font-medium">الدور</th>
                      <th className="text-right py-3 px-4 font-medium">الفرع</th>
                      <th className="text-right py-3 px-4 font-medium">الحالة</th>
                      <th className="text-right py-3 px-4 font-medium">الإجراءات</th>
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
                          <td className="py-3 px-4">{branch?.name || (user.role === "admin" ? "جميع الفروع" : "-")}</td>
                          <td className="py-3 px-4">
                            <Badge variant={user.isActive ? "default" : "outline"}>
                              {user.isActive ? "نشط" : "غير نشط"}
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
                لا يوجد مستخدمين. أضف مستخدمين جدد لإدارة النظام.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="passwords" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">تغيير كلمة مرور المسؤول</h2>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
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
                <Label htmlFor="newAdminPassword">كلمة المرور الجديدة</Label>
                <div className="relative mt-1">
                  <Input
                    id="newAdminPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
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
                <Label htmlFor="confirmAdminPassword">تأكيد كلمة المرور الجديدة</Label>
                <Input
                  id="confirmAdminPassword"
                  type="password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
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
                {updateAdminPasswordMutation.isPending ? "جاري الحفظ..." : "حفظ كلمة المرور"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">كلمات مرور الفروع</h2>
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
                        <p className="text-sm text-slate-500">{branch.location}</p>
                      </div>
                    </div>
                    {selectedBranch === branch.id && (
                      <Badge variant="default">محدد</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedBranch && (
              <div className="space-y-4 max-w-md border-t pt-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                  <Lock className="w-4 h-4" />
                  <span>تغيير كلمة مرور: {branches?.find(b => b.id === selectedBranch)?.name}</span>
                </div>

                <div>
                  <Label htmlFor="newBranchPassword">كلمة المرور الجديدة للفرع</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newBranchPassword"
                      type={showBranchPassword ? "text" : "password"}
                      value={newBranchPassword}
                      onChange={(e) => setNewBranchPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
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
                  {updateBranchPasswordMutation.isPending ? "جاري الحفظ..." : "حفظ كلمة مرور الفرع"}
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
                <h2 className="text-lg font-bold text-slate-800">إدارة الفروع</h2>
              </div>
              <Button 
                onClick={() => setShowAddBranchDialog(true)}
                className="gap-2"
                data-testid="button-add-branch"
              >
                <Plus className="w-4 h-4" />
                إضافة فرع جديد
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
                            {branch.patientCount} مريض
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {branch.hasPassword ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          كلمة مرور
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          بدون كلمة مرور
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
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">إعدادات إظهار الأقسام</h4>
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
              <h2 className="text-lg font-bold text-slate-800">البريد الإلكتروني الاحتياطي</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              يُستخدم هذا البريد لاستعادة كلمة المرور في حال نسيانها
            </p>

            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="backupEmail">البريد الإلكتروني</Label>
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
                {updateBackupEmailMutation.isPending ? "جاري الحفظ..." : "حفظ البريد الإلكتروني"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">ملاحظة أمنية</h3>
                <p className="text-sm text-amber-700">
                  تأكد من استخدام بريد إلكتروني موثوق وآمن. سيتم استخدام هذا البريد 
                  للتواصل معك في حال نسيان كلمة المرور أو لأي إشعارات أمنية.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">إرسال نسخة احتياطية</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              إرسال نسخة احتياطية من بيانات المرضى إلى بريدك الإلكتروني الآن
            </p>

            <BackupStatusCard />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">تصدير بيانات المرضى</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              قم بتصدير جميع بيانات المرضى إلى ملف CSV للاحتفاظ بنسخة احتياطية على جهازك
            </p>

            <Button 
              onClick={handleExportPatients}
              disabled={isExporting}
              className="w-full gap-2 max-w-md"
              data-testid="button-export-patients"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "جاري التصدير..." : "تصدير بيانات المرضى (CSV)"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800">صلاحيات المسؤول</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">إدارة المرضى</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">إدارة الأموال</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <FileText className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">التقارير</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">الزيارات</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Building2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">جميع الفروع</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">الإحصائيات</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Key className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">كلمات المرور</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Settings className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">الإعدادات</span>
          </div>
        </div>
      </Card>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranchDialog} onOpenChange={setShowAddBranchDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة فرع جديد
            </DialogTitle>
            <DialogDescription>
              أدخل معلومات الفرع الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newBranchName">اسم الفرع *</Label>
              <Input
                id="newBranchName"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="مثال: فرع النجف"
                className="mt-1"
                data-testid="input-new-branch-name"
              />
            </div>
            <div>
              <Label htmlFor="newBranchLocation">الموقع (اختياري)</Label>
              <Input
                id="newBranchLocation"
                value={newBranchLocation}
                onChange={(e) => setNewBranchLocation(e.target.value)}
                placeholder="مثال: شارع الكوفة"
                className="mt-1"
                data-testid="input-new-branch-location"
              />
            </div>
            <div>
              <Label htmlFor="newBranchPw">كلمة المرور (اختياري)</Label>
              <Input
                id="newBranchPw"
                type="password"
                value={newBranchPw}
                onChange={(e) => setNewBranchPw(e.target.value)}
                placeholder="كلمة مرور للدخول للفرع"
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
              إلغاء
            </Button>
            <Button
              onClick={handleValidateAndConfirmAdd}
              disabled={createBranchMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-add-branch"
            >
              إضافة الفرع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Branch Confirmation AlertDialog */}
      <AlertDialog open={showAddConfirmation} onOpenChange={setShowAddConfirmation}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" />
              تأكيد إضافة الفرع
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إضافة فرع "{newBranchName}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-add-branch">
              لا
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateBranch}
              disabled={createBranchMutation.isPending}
              className="gap-2"
              data-testid="button-yes-add-branch"
            >
              {createBranchMutation.isPending ? "جاري الإضافة..." : "نعم"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Branch Confirmation AlertDialog */}
      <AlertDialog open={!!branchToDelete} onOpenChange={() => setBranchToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد حذف الفرع
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف فرع "{branchToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete-branch">
              لا
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => branchToDelete && deleteBranchMutation.mutate(branchToDelete.id)}
              disabled={deleteBranchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-branch"
            >
              {deleteBranchMutation.isPending ? "جاري الحذف..." : "نعم"}
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
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "قم بتعديل بيانات المستخدم والصلاحيات" : "أدخل بيانات المستخدم الجديد وحدد الصلاحيات"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">اسم المستخدم *</Label>
                <Input
                  id="username"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="اسم المستخدم للدخول"
                  className="mt-1"
                  data-testid="input-user-username"
                />
              </div>
              <div>
                <Label htmlFor="displayName">الاسم الظاهر</Label>
                <Input
                  id="displayName"
                  value={userFormData.displayName}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="الاسم الكامل"
                  className="mt-1"
                  data-testid="input-user-displayname"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">{editingUser ? "كلمة المرور الجديدة" : "كلمة المرور *"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? "اترك فارغاً للإبقاء" : "كلمة المرور"}
                  className="mt-1"
                  data-testid="input-user-password"
                />
              </div>
              <div>
                <Label>الدور *</Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value) => handleRoleChange(value as UserRole)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-user-role">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مسؤول النظام</SelectItem>
                    <SelectItem value="branch_manager">مدير فرع</SelectItem>
                    <SelectItem value="reception">موظف استقبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {userFormData.role !== "admin" && (
              <div>
                <Label>الفرع *</Label>
                <Select
                  value={userFormData.branchId?.toString() || ""}
                  onValueChange={(value) => setUserFormData(prev => ({ ...prev, branchId: Number(value) }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-user-branch">
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

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={userFormData.isActive}
                onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-user-active"
              />
              <Label htmlFor="isActive">المستخدم نشط</Label>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">الصلاحيات</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">المرضى</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewPatients"
                        checked={userFormData.canViewPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewPatients: checked }))}
                      />
                      <Label htmlFor="canViewPatients" className="text-sm">عرض المرضى</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canAddPatients"
                        checked={userFormData.canAddPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canAddPatients: checked }))}
                      />
                      <Label htmlFor="canAddPatients" className="text-sm">إضافة مرضى</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEditPatients"
                        checked={userFormData.canEditPatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEditPatients: checked }))}
                      />
                      <Label htmlFor="canEditPatients" className="text-sm">تعديل المرضى</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canDeletePatients"
                        checked={userFormData.canDeletePatients}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canDeletePatients: checked }))}
                      />
                      <Label htmlFor="canDeletePatients" className="text-sm">حذف المرضى</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">المدفوعات</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewPayments"
                        checked={userFormData.canViewPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewPayments: checked }))}
                      />
                      <Label htmlFor="canViewPayments" className="text-sm">عرض المدفوعات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canAddPayments"
                        checked={userFormData.canAddPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canAddPayments: checked }))}
                      />
                      <Label htmlFor="canAddPayments" className="text-sm">إضافة مدفوعات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canEditPayments"
                        checked={userFormData.canEditPayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canEditPayments: checked }))}
                      />
                      <Label htmlFor="canEditPayments" className="text-sm">تعديل المدفوعات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canDeletePayments"
                        checked={userFormData.canDeletePayments}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canDeletePayments: checked }))}
                      />
                      <Label htmlFor="canDeletePayments" className="text-sm">حذف المدفوعات</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">التقارير والمحاسبة</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canViewReports"
                        checked={userFormData.canViewReports}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canViewReports: checked }))}
                      />
                      <Label htmlFor="canViewReports" className="text-sm">عرض التقارير</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageAccounting"
                        checked={userFormData.canManageAccounting}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageAccounting: checked }))}
                      />
                      <Label htmlFor="canManageAccounting" className="text-sm">إدارة المحاسبة</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">النظام</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageSettings"
                        checked={userFormData.canManageSettings}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageSettings: checked }))}
                      />
                      <Label htmlFor="canManageSettings" className="text-sm">إدارة الإعدادات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="canManageUsers"
                        checked={userFormData.canManageUsers}
                        onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, canManageUsers: checked }))}
                      />
                      <Label htmlFor="canManageUsers" className="text-sm">إدارة المستخدمين</Label>
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
              {createUserMutation.isPending || updateUserMutation.isPending ? "جاري الحفظ..." : (editingUser ? "تحديث" : "إضافة")}
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
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation AlertDialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد حذف المستخدم
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستخدم "{userToDelete?.username}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete-user">
              لا
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "جاري الحذف..." : "نعم"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
