import { useState, useEffect } from "react";
import { X, Share, Plus, Download, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// PWA install + update banner.
//
// Two distinct user moments live in this component:
//
//   1. Install. We hold a deferredPrompt for Android Chrome (it fires
//      `beforeinstallprompt`). When the user clicks "تثبيت" we trigger
//      it natively — one tap, no app store. iOS Safari doesn't support
//      that event, so we fall back to a guided dialog with the share-
//      menu instructions.
//
//   2. Update. main.tsx dispatches `pwa-update-ready` whenever the
//      service worker finds a new build. We surface a small bottom
//      banner with a "تحديث الآن" button that messages the SW to
//      skipWaiting. The controllerchange listener in main.tsx then
//      reloads the page once the new worker takes over.
//
// Throttling: the install dialog only auto-pops the FIRST time the
// user uses the app for at least 30 seconds, so we don't ambush them
// the moment they log in. Manual access via the floating button
// always works regardless.

const DISMISSED_KEY = "pwa-install-dismissed";
const FIRST_SEEN_KEY = "pwa-first-seen-at";
const AUTO_PROMPT_DELAY_MS = 30_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Are we already running from the home screen? Skip everything.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS legacy
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");

    // Capture the install opportunity Chrome offers. Don't actually
    // pop it yet — we'd rather decide ourselves when to show.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Once installed, hide everything.
    const onInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // Update banner trigger from the SW registration in main.tsx.
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener("pwa-update-ready", onUpdate);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pwa-update-ready", onUpdate);
    };
  }, []);

  // Auto-prompt logic: wait until the user has been around for 30s,
  // hasn't dismissed before, isn't already standalone, and is on a
  // mobile platform. Avoids the "تثبيت?" the second they hit login.
  useEffect(() => {
    if (isStandalone) return;
    if (platform === "other") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (!firstSeen) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      return; // Wait until next visit at least.
    }
    const elapsed = Date.now() - Number(firstSeen);
    if (elapsed < AUTO_PROMPT_DELAY_MS) {
      const timer = setTimeout(
        () => setShowPrompt(true),
        AUTO_PROMPT_DELAY_MS - elapsed
      );
      return () => clearTimeout(timer);
    }
    setShowPrompt(true);
  }, [isStandalone, platform]);

  const dismissPrompt = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  const remindLater = () => setShowPrompt(false);

  const installNow = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch {
      /* user-cancellable, ignore */
    }
  };

  const refreshNow = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Update-ready bottom banner. */}
      {updateReady && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] rounded-lg border bg-white shadow-lg flex items-center gap-3 px-4 py-3" data-testid="pwa-update-banner">
          <RefreshCw className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">تحديث جديد متاح</div>
            <div className="text-xs text-muted-foreground">
              يحتوي على آخر التحسينات والإصلاحات.
            </div>
          </div>
          <Button size="sm" onClick={refreshNow} data-testid="button-pwa-update-now">
            تحديث
          </Button>
        </div>
      )}

      {/* Install dialog. */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="max-w-md mx-4 !bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              تثبيت التطبيق على جهازك
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              الوصول السريع للنظام بنقرة واحدة من شاشة الجهاز، تماماً كأيّ تطبيق.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Android with native install prompt available */}
            {platform === "android" && deferredPrompt && (
              <div className="space-y-3">
                <p className="text-sm">
                  متصفّحك يدعم التثبيت بضغطة واحدة. اضغط الزرّ في الأسفل ثمّ "تثبيت" في النافذة التي تظهر.
                </p>
                <Button onClick={installNow} className="w-full gap-2" data-testid="button-install-now">
                  <Download className="h-4 w-4" />
                  تثبيت التطبيق الآن
                </Button>
              </div>
            )}

            {/* Android without the native event (older Chrome, Firefox…) */}
            {platform === "android" && !deferredPrompt && (
              <div className="space-y-3 text-sm">
                <p>افتح قائمة المتصفّح (النقاط الثلاث في الأعلى)، ثمّ اختر:</p>
                <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-2 justify-center">
                  <Plus className="h-4 w-4" />
                  <span>إضافة إلى الشاشة الرئيسيّة</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  بعض المتصفّحات تعرضها باسم "تثبيت التطبيق".
                </p>
              </div>
            )}

            {/* iOS — Safari has no native event, walk the user through. */}
            {platform === "ios" && (
              <div className="space-y-4 text-sm">
                <p>على iPhone و iPad، الخطوات ثلاثة فقط:</p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">١</span>
                    <div className="flex-1">
                      اضغط زرّ المشاركة من شريط Safari السفلي.
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs">
                        <Share className="h-3.5 w-3.5" />
                        المشاركة
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">٢</span>
                    <div className="flex-1">
                      اختر <span className="font-medium">"إضافة إلى الشاشة الرئيسيّة"</span>.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">٣</span>
                    <div className="flex-1">
                      اضغط <span className="font-medium">"إضافة"</span> في الأعلى لتأكيد التثبيت.
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop fallback — should rarely trigger since we set
                platform to "other" and gate the auto-prompt off. */}
            {platform === "other" && (
              <p className="text-sm text-muted-foreground">
                هذا الجهاز ليس هاتفاً محمولاً. يمكنك تثبيت النظام كتطبيق سطح مكتب من قائمة المتصفّح.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" onClick={remindLater} className="w-full">
                ذكّرني لاحقاً
              </Button>
              <button
                type="button"
                onClick={dismissPrompt}
                className="text-xs text-muted-foreground hover:underline"
              >
                لا تعرض هذه الرسالة مجدّداً
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
