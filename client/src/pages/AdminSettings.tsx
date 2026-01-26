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
  AlertTriangle,
  CheckCircle,
  Layers
} from "lucide-react";
import type { Branch, BranchSetting } from "@shared/schema";

interface BranchWithDetails extends Branch {
  patientCount: number;
  hasPassword: boolean;
  settings: {
    showPatients: boolean;
    showVisits: boolean;
    showPayments: boolean;
    showDocuments: boolean;
    showStatistics: boolean;
    showAccounting: boolean;
    showExpenses: boolean;
  };
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
  const [branchToDelete, setBranchToDelete] = useState<BranchWithDetails | null>(null);
  const [selectedBranchForSettings, setSelectedBranchForSettings] = useState<number | null>(null);

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

  const handleCreateBranch = () => {
    if (!newBranchName || newBranchName.length < 2) {
      toast({ title: "خطأ", description: "اسم الفرع يجب أن يكون حرفين على الأقل", variant: "destructive" });
      return;
    }
    if (newBranchPw && newBranchPw.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    createBranchMutation.mutate({
      name: newBranchName,
      location: newBranchLocation || undefined,
      password: newBranchPw || undefined,
    });
  };

  type SettingKey = "showPatients" | "showVisits" | "showPayments" | "showDocuments" | "showStatistics" | "showAccounting" | "showExpenses";

  const handleToggleSetting = (branchId: number, settingKey: SettingKey, currentValue: boolean) => {
    if (updateBranchSettingsMutation.isPending) return;
    updateBranchSettingsMutation.mutate({
      branchId,
      [settingKey]: !currentValue
    });
  };

  const selectedBranchDetails = branchesWithDetails?.find(b => b.id === selectedBranchForSettings);

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
    { key: "showPatients", label: "المرضى", icon: Users },
    { key: "showVisits", label: "الزيارات", icon: Calendar },
    { key: "showPayments", label: "المدفوعات", icon: DollarSign },
    { key: "showDocuments", label: "المستندات", icon: FileText },
    { key: "showStatistics", label: "الإحصائيات", icon: BarChart3 },
    { key: "showAccounting", label: "المحاسبة", icon: DollarSign },
    { key: "showExpenses", label: "المصروفات", icon: DollarSign },
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

      <Tabs defaultValue="passwords" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg mb-6">
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
              onClick={handleCreateBranch}
              disabled={createBranchMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-add-branch"
            >
              {createBranchMutation.isPending ? "جاري الإضافة..." : "إضافة الفرع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => branchToDelete && deleteBranchMutation.mutate(branchToDelete.id)}
              disabled={deleteBranchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-branch"
            >
              <Trash2 className="w-4 h-4" />
              {deleteBranchMutation.isPending ? "جاري الحذف..." : "حذف الفرع"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
