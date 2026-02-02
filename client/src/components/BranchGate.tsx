import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Loader2, User, ShieldCheck, Building2 } from "lucide-react";
import logoImage from "@/assets/logo.png";

const userOptions = [
  { value: "admin", label: "مسؤول النظام", icon: ShieldCheck },
  { value: "baghdad", label: "بايونك بغداد", icon: Building2 },
  { value: "karbala", label: "الوارث كربلاء", icon: Building2 },
  { value: "dhiqar", label: "بايونك ذي قار", icon: Building2 },
  { value: "mosul", label: "بايونك الموصل", icon: Building2 },
  { value: "kirkuk", label: "بايونك كركوك", icon: Building2 },
];

interface BranchSession {
  branchId: number;
  branchName: string;
  isAdmin: boolean;
}

interface BranchGateProps {
  children: React.ReactNode;
}

export function useBranchSession(): BranchSession | null {
  const [session, setSession] = useState<BranchSession | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("branch_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("branch_session");
      }
    }
  }, []);

  return session;
}

export function clearBranchSession() {
  sessionStorage.removeItem("branch_session");
  sessionStorage.removeItem("admin_verified");
  window.location.reload();
}

export function BranchGate({ children }: BranchGateProps) {
  const [session, setSession] = useState<BranchSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("branch_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("branch_session");
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
        body: JSON.stringify({ username: username.toLowerCase().trim(), password }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const branchSession: BranchSession = {
          branchId: data.branchId,
          branchName: data.branchName,
          isAdmin: data.isAdmin,
        };
        sessionStorage.setItem("branch_session", JSON.stringify(branchSession));
        setSession(branchSession);
        
        if (data.isAdmin) {
          sessionStorage.setItem("admin_verified", "true");
        }
      } else {
        setError(data.message || "اسم المستخدم أو كلمة السر غير صحيحة");
      }
    } catch (err) {
      console.error("Branch verification error:", err);
      setError("حدث خطأ في التحقق");
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <Card className="p-8 w-full max-w-md rounded-2xl shadow-xl border-0">
        <div className="text-center mb-8">
          <img src={logoImage} alt="Bionic Logo" className="w-32 h-32 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-slate-800">مجموعة مراكز الدكتور ياسر الساعدي</h1>
          <p className="text-muted-foreground mt-2">أدخل اسم المستخدم وكلمة السر للدخول</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اختر الفرع أو أدخل اسم المستخدم</label>
            <Select value={username} onValueChange={setUsername}>
              <SelectTrigger className="h-12" data-testid="select-branch-login">
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <option.icon className="w-4 h-4 text-primary" />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">كلمة السر</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="أدخل كلمة السر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 h-12"
                autoComplete="current-password"
                data-testid="input-branch-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg gap-2" 
            disabled={!username || !password || isSubmitting}
            data-testid="button-branch-login"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            دخول
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          نظام إدارة المرضى - مجموعة مراكز الدكتور ياسر الساعدي
        </p>
      </Card>
    </div>
  );
}
