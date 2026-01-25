import { useState, useEffect } from "react";
import { X, Share, Plus, MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setPlatform("ios");
      setShowPrompt(true);
    } else if (isAndroid) {
      setPlatform("android");
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "true");
    setShowPrompt(false);
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-md mx-4" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            تثبيت التطبيق
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            يمكنك تثبيت هذا التطبيق على جهازك للوصول السريع إليه
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {platform === "ios" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">لأجهزة iPhone و iPad:</h3>
              <ol className="space-y-4 list-none">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </span>
                  <div className="flex-1">
                    <p>اضغط على زر المشاركة</p>
                    <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center">
                      <Share className="w-6 h-6" />
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </span>
                  <div className="flex-1">
                    <p>اختر "إضافة إلى الشاشة الرئيسية"</p>
                    <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-2 justify-center">
                      <Plus className="w-5 h-5" />
                      <span className="text-sm">إضافة إلى الشاشة الرئيسية</span>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </span>
                  <div className="flex-1">
                    <p>اضغط "إضافة" في الزاوية العليا</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {platform === "android" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">لأجهزة Android:</h3>
              <ol className="space-y-4 list-none">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </span>
                  <div className="flex-1">
                    <p>اضغط على القائمة (ثلاث نقاط)</p>
                    <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center">
                      <MoreVertical className="w-6 h-6" />
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </span>
                  <div className="flex-1">
                    <p>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</p>
                    <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-2 justify-center">
                      <Download className="w-5 h-5" />
                      <span className="text-sm">تثبيت التطبيق</span>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </span>
                  <div className="flex-1">
                    <p>اضغط "تثبيت" للتأكيد</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleDismiss} className="w-full">
              فهمت، لا تظهر مرة أخرى
            </Button>
            <Button variant="outline" onClick={handleRemindLater} className="w-full">
              ذكرني لاحقاً
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
