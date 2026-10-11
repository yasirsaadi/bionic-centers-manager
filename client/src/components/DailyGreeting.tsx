// **تحيّةُ الموظّف اليومية** (§4.dp — طلبُ المالك ٢٠٢٦-١٠-١١): نافذةٌ مرّةً كلَّ يوم بتوقيت بغداد، «صباح الخير» أو «مساء الخير» باسمه وعبارةٌ من
// المالك، **لا تُغلق إلّا بـ«حسناً»** (لا خارجَها ولا «Esc» ولا «X»). والخادمُ يقرّر هل تظهر وما نصُّها (`/api/greeting`)، و«حسناً» يكتب يومَها
// على الحساب فلا تعود في اليوم نفسِه ولو من جهازٍ آخر. **وللمالك بدلَها تذكيرُ تغيير العبارات** حين يمضي شهر.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { baghdadTodayYmd } from "@shared/visit_date";

type Greeting =
  | { show: false }
  | { show: true; kind: "greeting"; period: "morning" | "evening"; text: string }
  | { show: true; kind: "reminder"; days: number };

/**
 * **يومُ بغداد كما يراه المستخدم الآن** — يتجدّد عند أوّل لمسةٍ أو ضغطة مفتاح أو عودةٍ إلى التطبيق بعد تغيّر اليوم (مراجعةُ Codex): التطبيقُ المثبَّت
 * يبقى مفتوحاً ليلاً على جهاز الاستقبال، فتظهر تحيّةُ اليوم الجديد حين يلمسه الموظّفُ صباحاً — بوقتها الصحيح — لا عند منتصف الليل، وبلا طلبٍ دوريّ.
 */
function useBaghdadDay(): string {
  const [day, setDay] = useState(() => baghdadTodayYmd());
  useEffect(() => {
    const check = () => { const t = baghdadTodayYmd(); setDay((d) => (d === t ? d : t)); };
    const events = ["pointerdown", "keydown", "focus"] as const;
    for (const e of events) window.addEventListener(e, check, { passive: true });
    document.addEventListener("visibilitychange", check);
    return () => {
      for (const e of events) window.removeEventListener(e, check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return day;
}

export function DailyGreeting() {
  const [, navigate] = useLocation();
  const day = useBaghdadDay();
  //  أُغلقت في أيّ يوم — فاليومُ التالي يُسأل عنه الخادمُ من جديد.
  const [closedDay, setClosedDay] = useState<string | null>(null);
  const closed = closedDay === day;
  const q = useQuery<Greeting>({
    queryKey: ["/api/greeting", day],
    queryFn: async () => (await apiRequest("GET", "/api/greeting")).json(),
    staleTime: Number.POSITIVE_INFINITY, retry: false,
  });
  //  **تُغلق بعد أن يُسجَّل اليومُ في الخادم لا قبله** (مراجعةُ Codex): إغلاقٌ يسبق التسجيلَ يوهم أنّها رُئيت وهي تعود بعد التحديث أو من جهازٍ آخر.
  //  وإن فشل التسجيلُ تبقى مفتوحةً بسطر خطأٍ و«حاول ثانيةً» — **ومعها «إغلاق»** كي لا يُحبس موظّفٌ خلف نافذةٍ والشبكةُ مقطوعة (فتعود حينها، وهذا صادق).
  const seen = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/greeting/seen", {})).json() });
  //  يومٌ جديد يبدأ بلا خطأ الأمس.
  useEffect(() => { seen.reset(); }, [day]);
  const g = q.data;
  if (!g || !g.show || closed) return null;
  const done = (then?: () => void) => seen.mutate(undefined, { onSuccess: () => { setClosedDay(day); then?.(); } });
  const failed = seen.isError && !seen.isPending;
  const failure = failed ? (
    <div className="text-xs text-destructive space-y-1" data-testid="daily-greeting-error">
      <p>تعذّر الحفظ — تحقّق من الاتّصال واضغط ثانيةً.</p>
      <button type="button" className="underline text-muted-foreground" onClick={() => setClosedDay(day)} data-testid="daily-greeting-close-anyway">إغلاق</button>
    </div>
  ) : null;
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
            <Button className="mx-auto min-w-32" disabled={seen.isPending} onClick={() => done()} data-testid="daily-greeting-ok">
              {failed ? "حاول ثانيةً" : "حسناً"}
            </Button>
            {failure}
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
              <Button disabled={seen.isPending} onClick={() => done(() => navigate("/admin?tab=staff-notifications"))} data-testid="daily-greeting-change">تغييرها الآن</Button>
              <Button variant="outline" disabled={seen.isPending} onClick={() => done()} data-testid="daily-greeting-later">لاحقاً</Button>
            </div>
            {failure}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
