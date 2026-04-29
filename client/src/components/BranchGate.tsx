import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Loader2, User, ShieldCheck, Building2, Clock, Globe } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTranslation } from "@/i18n/LanguageContext";

const userOptions = [
  { value: "admin", label: "مسؤول النظام", labelEn: "System Admin", icon: ShieldCheck },
  { value: "baghdad", label: "بايونك بغداد", labelEn: "Bionic Baghdad", icon: Building2 },
  { value: "karbala", label: "الوارث كربلاء", labelEn: "Al-Warith Karbala", icon: Building2 },
  { value: "dhiqar", label: "بايونك ذي قار", labelEn: "Bionic Dhi Qar", icon: Building2 },
  { value: "mosul", label: "بايونك الموصل", labelEn: "Bionic Mosul", icon: Building2 },
  { value: "kirkuk", label: "بايونك كركوك", labelEn: "Bionic Kirkuk", icon: Building2 },
];

interface UserPermissions {
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
  canManageSurveys: boolean;
}

interface BranchSession {
  branchId: number;
  branchName: string;
  isAdmin: boolean;
  userId?: number;
  role?: string;
  displayName?: string;
  permissions?: UserPermissions;
  shift?: string;
  language?: string;
  // Set on multi-branch users (branch_manager assigned to several
  // branches). The user can switch between any of these via a header
  // dropdown; switching updates branchId / branchName here and on
  // the server session.
  accessibleBranches?: number[];
}

interface BranchGateProps {
  children: React.ReactNode;
}

export function useBranchSession(): BranchSession | null {
  const [session, setSession] = useState<BranchSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("branch_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem("branch_session");
      }
    }
  }, []);

  return session;
}

export function clearBranchSession() {
  localStorage.removeItem("branch_session");
  localStorage.removeItem("admin_verified");
  window.location.reload();
}

export function BranchGate({ children }: BranchGateProps) {
  const { setLanguage } = useLanguage();
  const { t, language, dir } = useTranslation();
  const [session, setSession] = useState<BranchSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("branch_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem("branch_session");
      }
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/verify-branch", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          branchKey: selectedBranch,
          username: username.toLowerCase().trim(), 
          password,
          shift: selectedShift
        }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const effectiveLanguage = language || data.language || "ar";
        const branchSession: BranchSession = {
          branchId: data.branchId,
          branchName: data.branchName,
          isAdmin: data.isAdmin,
          userId: data.userId,
          role: data.role,
          displayName: data.displayName,
          permissions: data.permissions,
          shift: data.shift,
          language: effectiveLanguage,
          accessibleBranches: Array.isArray(data.accessibleBranches) ? data.accessibleBranches : undefined,
        };
        localStorage.setItem("branch_session", JSON.stringify(branchSession));
        setLanguage(effectiveLanguage as "ar" | "en");
        setSession(branchSession);
        
        if (data.isAdmin) {
          localStorage.setItem("admin_verified", "true");
        }
      } else {
        setError(data.message || t.login.errorInvalid);
      }
    } catch (err) {
      console.error("Branch verification error:", err);
      setError(t.login.errorGeneral);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const isRtl = dir === "rtl";
  const iconPosition = isRtl ? "right-3" : "left-3";
  const inputPadding = isRtl ? "pr-10" : "pl-10";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4" dir={dir}>
      <Card className="p-6 sm:p-8 w-full max-w-md rounded-2xl shadow-xl border-0 mx-auto">
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            data-testid="button-login-language-toggle"
            title={language === "ar" ? "English" : "العربية"}
          >
            <Globe className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center mb-8">
          <img src={logoImage} alt="Bionic Logo" className="w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 text-center">{t.login.title}</h1>
          <p className="text-muted-foreground mt-2">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.branch}</label>
            <Select value={selectedBranch} onValueChange={(val) => { setSelectedBranch(val); if (val !== "admin") setSelectedShift("auto"); else setSelectedShift(""); }}>
              <SelectTrigger className="h-12" data-testid="select-branch-login">
                <SelectValue placeholder={t.login.selectBranch} />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <option.icon className="w-4 h-4 text-primary" />
                      {language === "en" ? option.labelEn : option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.username}</label>
            <div className="relative">
              <User className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                type="text"
                placeholder={t.login.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputPadding} h-12`}
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.password}</label>
            <div className="relative">
              <Lock className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                type="password"
                placeholder={t.login.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputPadding} h-12`}
                autoComplete="current-password"
                data-testid="input-branch-password"
              />
            </div>
          </div>

          {selectedBranch && selectedBranch !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.shift}</label>
              <div className="relative">
                <Clock className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10`} />
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className={`${inputPadding} h-12`} data-testid="select-shift">
                    <SelectValue placeholder={t.login.selectShift} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.login.shiftAuto}</SelectItem>
                    <SelectItem value="morning">{t.login.shiftMorning}</SelectItem>
                    <SelectItem value="evening">{t.login.shiftEvening}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg gap-2" 
            disabled={!selectedBranch || !username || !password || isSubmitting}
            data-testid="button-branch-login"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {t.login.login}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t.login.footer}
        </p>
      </Card>
    </div>
  );
}
