import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, ShieldAlert } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminGateProps {
  children: React.ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin_verified");
    if (stored === "true") {
      setIsVerified(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await apiRequest("POST", "/api/verify-admin", { code });
      if (res.ok) {
        localStorage.setItem("admin_verified", "true");
        setIsVerified(true);
      } else {
        const data = await res.json();
        setError(data.message || "الكود غير صحيح");
      }
    } catch {
      setError("حدث خطأ في التحقق");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
      <Card className="p-8 w-full max-w-md rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-800">صفحة محمية</h2>
          <p className="text-muted-foreground mt-2">يرجى إدخال كود المسؤول للوصول إلى لوحة التحكم</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="أدخل كود المسؤول"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pr-10 text-center text-lg tracking-widest"
              data-testid="input-admin-code"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg gap-2" 
            disabled={!code || isSubmitting}
            data-testid="button-verify-admin"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            تحقق
          </Button>
        </form>
      </Card>
    </div>
  );
}
