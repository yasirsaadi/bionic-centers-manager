// **تحيّةُ الموظّف اليومية** (§4.dp — طلبُ المالك ٢٠٢٦-١٠-١١): نافذةٌ مرّةً كلَّ يوم بتوقيت بغداد، «صباح الخير» أو «مساء الخير» باسمه وعبارةٌ من
// المالك، **لا تُغلق إلّا بـ«حسناً»** (لا خارجَها ولا «Esc» ولا «X»). والخادمُ يقرّر هل تظهر وما نصُّها (`/api/greeting`)، و«حسناً» يكتب يومَها
// على الحساب فلا تعود في اليوم نفسِه ولو من جهازٍ آخر. **وللمالك بدلَها تذكيرُ تغيير العبارات** حين يمضي شهر.
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

type Greeting =
  | { show: false }
  | { show: true; kind: "greeting"; period: "morning" | "evening"; text: string }
  | { show: true; kind: "reminder"; days: number };

export function DailyGreeting() {
  const [, navigate] = useLocation();
  const [closed, setClosed] = useState(false);
  const q = useQuery<Greeting>({
    queryKey: ["/api/greeting"],
    queryFn: async () => (await apiRequest("GET", "/api/greeting")).json(),
    staleTime: Number.POSITIVE_INFINITY, retry: false,
  });
  const seen = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/greeting/seen", {})).json() });
  const g = q.data;
  if (!g || !g.show || closed) return null;
  const done = (then?: () => void) => { setClosed(true); seen.mutate(); then?.(); };
  const block = (e: Event) => e.preventDefault();
  const morning = g.kind === "greeting" && g.period === "morning";
  return (
    <Dialog open onOpenChange={() => { /* لا تُغلق إلّا بالزرّ */ }}>
      <DialogContent dir="rtl" hideClose onPointerDownOutside={block} onInteractOutside={block} onEscapeKeyDown={block}
        className={`max-w-md text-center ${g.kind === "greeting" ? (morning ? "bg-gradient-to-b from-amber-50 to-white" : "bg-gradient-to-b from-indigo-50 to-white") : ""}`}
        data-testid="daily-greeting">
        {g.kind === "greeting" ? (
          <>
            <div className={`mx-auto grid place-items-center w-14 h-14 rounded-full ${morning ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"}`}>
              {morning ? <Sun className="w-8 h-8" /> : <Moon className="w-7 h-7" />}
            </div>
            <DialogTitle className="sr-only">{morning ? "صباح الخير" : "مساء الخير"}</DialogTitle>
            <DialogDescription asChild>
              <p className="text-lg leading-9 text-slate-800 font-medium" data-testid="daily-greeting-text">{g.text}</p>
            </DialogDescription>
            <Button className="mx-auto min-w-32" onClick={() => done()} data-testid="daily-greeting-ok">حسناً</Button>
          </>
        ) : (
          <>
            <div className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-sky-100 text-sky-700"><Sparkles className="w-7 h-7" /></div>
            <DialogTitle>حان تغييرُ عبارات الترحيب</DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm leading-7 text-slate-700" data-testid="daily-greeting-reminder">
                مضى {g.days} يوماً على عبارات الترحيب التي تظهر لموظّفيك كلَّ يوم. غيّرها لتبقى جديدةً تُفرحهم، أو أبقِها شهراً آخر من البطاقة نفسِها.
              </p>
            </DialogDescription>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => done(() => navigate("/admin?tab=staff-notifications"))} data-testid="daily-greeting-change">تغييرها الآن</Button>
              <Button variant="outline" onClick={() => done()} data-testid="daily-greeting-later">لاحقاً</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
