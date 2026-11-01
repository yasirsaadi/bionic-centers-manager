// **تحيّةُ الموظّف اليومية** (§4.dp — طلبُ المالك ٢٠٢٦-١٠-١١): نافذةٌ مرّةً كلَّ يوم بتوقيت بغداد، «صباح الخير» أو «مساء الخير» باسمه وعبارةٌ من
// المالك، **لا تُغلق إلّا بـ«حسناً»** (لا خارجَها ولا «Esc» ولا «X»). والخادمُ يقرّر هل تظهر وما نصُّها (`/api/greeting`)، و«حسناً» يكتب يومَها
// على الحساب فلا تعود في اليوم نفسِه ولو من جهازٍ آخر. **وللمالك بدلَها تذكيرُ تغيير العبارات** حين يمضي شهر.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { baghdadTodayYmd } from "@shared/visit_date";
import { weatherFxFor, weatherGreetingLine, type WeatherFx } from "@shared/weather_greeting_fx";
import { useBranchWeatherState } from "@/components/ClockWeather";
import { WeatherFxLayer, prefersReducedMotion } from "@/components/WeatherFxLayer";

/** ما رُئي في هذه الصفحة — احتياطُ `localStorage` حين لا يُكتب. */
const FX_PLAYED_THIS_PAGE = new Set<string>();

type Greeting =
  | { show: false }
  | { show: true; kind: "greeting"; period: "morning" | "evening"; text: string; day?: string; weatherFx?: boolean }
  | { show: true; kind: "reminder"; days: number; day?: string };

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
  const qc = useQueryClient();
  //  **والمفتاحُ للحساب أيضاً** (مراجعةُ Codex): جلسةٌ انتهت ودخل غيرُه من الشاشة نفسِها بلا تحميل — فلا يرث جوابَ زميله ولا اسمَه.
  const userId = useBranchSession()?.userId ?? null;
  const key = ["/api/greeting", userId, day] as const;
  //  **الإغلاقُ يُكتب في ذاكرة الاستعلام لا في حالة المكوّن** (مراجعةُ Codex): صفحاتُ الطباعة تُنزل المكوّنَ ثمّ يُركَّب عند الرجوع، فحالةٌ محلّية
  //  تُنسى وتعود التحيّةُ نفسُها والاستعلامُ لا يتقادم. ومفتاحُه يومُ بغداد — فاليومُ التالي يُسأل عنه الخادمُ من جديد.
  const close = () => qc.setQueryData<Greeting>(key, { show: false });
  const q = useQuery<Greeting>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", "/api/greeting")).json(),
    //  الخطأُ لا يُحفظ جواباً: يُعاد ثلاثاً (١ ثمّ ٢ ثمّ ٤ ثوانٍ)، ثمّ عند العودة إلى التطبيق أو أوّلِ إشارة تحديث.
    staleTime: Number.POSITIVE_INFINITY, retry: 3,
  });
  //  **تُغلق بعد أن يُسجَّل اليومُ في الخادم لا قبله** (مراجعةُ Codex): إغلاقٌ يسبق التسجيلَ يوهم أنّها رُئيت وهي تعود بعد التحديث أو من جهازٍ آخر.
  //  وإن فشل التسجيلُ تبقى مفتوحةً بسطر خطأٍ و«حاول ثانيةً» — **ومعها «إغلاق»** كي لا يُحبس موظّفٌ خلف نافذةٍ والشبكةُ مقطوعة (فتعود حينها، وهذا صادق).
  //  ويُرسَل يومُ التحيّة المعروضة — لا يومُ وصول الطلب (منتصفُ الليل بينهما).
  const seen = useMutation({ mutationFn: async (shownDay?: string) => (await apiRequest("POST", "/api/greeting/seen", { day: shownDay })).json() });
  //  يومٌ جديد يبدأ بلا خطأ الأمس.
  useEffect(() => { seen.reset(); }, [day]);
  const g = q.data;
  //  **مؤثّرُ الطقس مع التحيّة** (§4.fw): طقسُ مدينة الفرع من شريحتها (الاستعلامُ نفسُه — لا طلبَ جديد)، ممطرٌ أو مغبرٌّ فعلاً ⟵ سطرٌ في التحيّة
  //  ومعه سبعُ ثوانٍ من القطرات أو الغبار. والمسؤولُ يطفئه للجميع (`weatherFx: false`).
  const { weather, settled: weatherSettled } = useBranchWeatherState();
  //  **«حسناً» تنتظر أوّلَ جوابٍ للطقس** (مراجعةُ Codex): التحيّةُ والطقسُ يُطلبان معاً، فـ«حسناً» قبل وصول الطقس كانت تُغلق التحيّةَ
  //  ويضيع مطرُ اليوم. وحدُّ الانتظار ٤ ثوانٍ — طقسٌ بطيءٌ أو معطّل لا يحبس الموظّف.
  const [weatherWaitOver, setWeatherWaitOver] = useState(false);
  useEffect(() => {
    if (weatherSettled) return;
    const t = setTimeout(() => setWeatherWaitOver(true), 4000);
    return () => clearTimeout(t);
  }, [weatherSettled]);
  const waitingForWeather = !weatherSettled && !weatherWaitOver;
  const fx: WeatherFx | null = g && g.show && g.kind === "greeting" && g.weatherFx !== false ? weatherFxFor(weather?.kind) : null;
  const [playing, setPlaying] = useState<WeatherFx | null>(null);
  useEffect(() => {
    if (!fx || !userId) return;
    //  **مرّةً في اليوم على الجهاز** — فإعادةُ تحميل الصفحة قبل «حسناً» تُبقي التحيّةَ ولا تُعيد المطر. و«تقليلُ الحركة» ⟵ السطرُ وحده.
    //  **ولا يُحسب «رُئي» والصفحةُ مخفيّة** (مراجعة): تطبيقٌ فُتح خلف نافذةٍ أخرى ينتظر أن يُرى، فلا تضيع مرّةُ اليوم بلا رسم.
    const play = () => {
      const mark = `weather-fx:${userId}:${day}`;
      //  وبلا تخزين (نافذةٌ خاصّة): مرّةً في هذه الصفحة — لا مع كلّ تبدّلٍ للطقس ولا بعد صفحة طباعة.
      if (FX_PLAYED_THIS_PAGE.has(mark)) return;
      FX_PLAYED_THIS_PAGE.add(mark);
      try { if (localStorage.getItem(mark)) return; localStorage.setItem(mark, "1"); } catch { /* الذاكرةُ أعلاه تكفي هذه الصفحة */ }
      if (prefersReducedMotion()) return;
      setPlaying(fx);
    };
    if (document.visibilityState === "visible") { play(); return; }
    const onVisible = () => { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", onVisible); play(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fx, userId, day]);
  const layer = playing ? <WeatherFxLayer fx={playing} onDone={() => setPlaying(null)} /> : null;
  if (!g || !g.show) return layer;
  const done = (then?: () => void) => seen.mutate(g.day, { onSuccess: () => { close(); then?.(); } });
  const failed = seen.isError && !seen.isPending;
  const failure = failed ? (
    <div className="text-xs text-destructive space-y-1" data-testid="daily-greeting-error">
      <p>تعذّر الحفظ — تحقّق من الاتّصال واضغط ثانيةً.</p>
      <button type="button" className="underline text-muted-foreground" onClick={close} data-testid="daily-greeting-close-anyway">إغلاق</button>
    </div>
  ) : null;
  const block = (e: Event) => e.preventDefault();
  const morning = g.kind === "greeting" && g.period === "morning";
  return (
    <>
    {layer}
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
            {fx && weather && (
              <p className={`mx-auto rounded-lg px-3 py-2 text-[15px] font-semibold ${fx === "dust" || fx === "storm" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}
                data-testid="daily-greeting-weather">{weatherGreetingLine(fx, weather.city)}</p>
            )}
            <Button className="mx-auto min-w-32" disabled={seen.isPending || waitingForWeather} onClick={() => done()} data-testid="daily-greeting-ok">
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
    </>
  );
}
