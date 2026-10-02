import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";

interface AdminGateProps {
  children: React.ReactNode;
}

/**
 *  صفحةٌ للمسؤول العامّ وحده. **كانت تطلب «كود المسؤول» المشترك** (يُحفظ في المتصفّح بعدها)؛ وأُغلقت تلك الكلمةُ مع دخول
 *  الطوارئ (قرارُ المالك ٢٠٢٦-١٠-٠٢، §4.bk). فالحكمُ الآن جلسةُ المستخدم نفسُه: مسؤولٌ عامّ بحسابه الشخصيّ ⟵ تُفتح، وغيرُه ⟵ رسالة.
 */
export function AdminGate({ children }: AdminGateProps) {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let alive = true;
    fetch("/api/verify-admin", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => { if (alive) setState(r.ok ? "ok" : "denied"); })
      .catch(() => { if (alive) setState("denied"); });
    return () => { alive = false; };
  }, []);

  if (state === "checking") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (state === "ok") return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
      <Card className="p-8 w-full max-w-md rounded-2xl shadow-lg text-center" data-testid="admin-gate-denied">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-800">صفحة محمية</h2>
        <p className="text-muted-foreground mt-2">هذه الصفحة للمسؤول العام — ادخل بحسابك الشخصي.</p>
      </Card>
    </div>
  );
}
