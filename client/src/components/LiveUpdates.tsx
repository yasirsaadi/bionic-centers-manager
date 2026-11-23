import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { LIVE_UPDATE_EVENT, startLiveUpdates } from "@/lib/live_updates";
import { GREETING_QUERY_ROOT, refreshesOnBroadcast } from "@shared/staff_greeting";

/**
 * **التحديثُ الحيّ لكلّ مستخدم** (§4.cy): يفتح اتصالَ الصفحة الدائم ما دام المستخدمُ داخلاً، ويُظهر شريطَ «نسخةٌ أحدث» حين لا تُعاد
 * الصفحةُ وحدها (نافذةٌ مفتوحة أو نصٌّ مكتوب). يُركَّب مرّةً في `App.tsx` فيغطّي كلَّ الصفحات — وصفحاتِ الطباعة معها.
 */
export function LiveUpdates() {
  const session = useBranchSession();
  const queryClient = useQueryClient();
  const [newBuild, setNewBuild] = useState<string | null>(null);
  const signedIn = !!session;

  useEffect(() => {
    if (!signedIn || typeof window === "undefined" || typeof (window as any).EventSource !== "function") return;
    return startLiveUpdates({
      EventSourceCtor: (window as any).EventSource,
      doc: document,
      win: window,
      now: () => Date.now(),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (t) => window.clearTimeout(t),
      setInterval: (fn, ms) => window.setInterval(fn, ms),
      clearInterval: (t) => window.clearInterval(t),
      //  كلُّ ما يُعرض إلّا التحيّة (§4.gw): جلبُها يعدّ إنجازَ الأمس، فلا يُعاد مع كتابة كلّ زميل — إلّا وهي في خطأ.
      refresh: () => { void queryClient.invalidateQueries({ predicate: (q) => refreshesOnBroadcast(q.queryKey, q.state.status) }); },
      onGreeting: () => { void queryClient.invalidateQueries({ queryKey: [GREETING_QUERY_ROOT] }); },
      onSidebarOrder: () => { void queryClient.invalidateQueries({ queryKey: ["/api/sidebar-order"] }); },
      reload: () => window.location.reload(),
      onUpdateAvailable: (build) => {
        setNewBuild(build);
        window.dispatchEvent(new CustomEvent(LIVE_UPDATE_EVENT, { detail: { build } }));
      },
      storage: (() => { try { return window.sessionStorage; } catch { return null; } })(),
    });
  }, [signedIn, queryClient]);

  if (!newBuild) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] rounded-lg border bg-white shadow-lg flex items-center gap-3 px-4 py-3"
      dir="rtl"
      //  فوق حافّة الآيفون السفلى في تطبيق الشاشة الرئيسية.
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      data-testid="live-update-banner"
    >
      <RefreshCw className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 text-sm">
        <div className="font-semibold">نسخةٌ أحدث من التطبيق وصلت</div>
        <div className="text-xs text-muted-foreground">احفظ ما تكتبه ثمّ اضغط «تحديث» — أو تُحدَّث وحدها حين تتركها.</div>
      </div>
      <Button size="sm" onClick={() => window.location.reload()} data-testid="button-live-update-now">
        تحديث
      </Button>
    </div>
  );
}
