//  **الساعةُ والطقسُ في رأس القائمة** (§4.es — طلبُ المالك ٢٠٢٦-١٠-١٩، والبديلُ «ج»: شريحتان، و«ص / م»).
//
//    • الساعةُ من جهاز الموظّف بتوقيت بغداد (`formatClock12`) وتتبدّل على رأس كلّ دقيقة — وحين يعود الهاتفُ من السكون في الحال،
//      فمؤقّتُ صفحةٍ نائمة يتأخّر.
//    • الطقسُ طقسُ مدينة الفرع النشط من خادمنا (`/api/weather` — يجلبه الخادمُ من الأرصاد النرويجية ويحفظه)، يُعاد كلَّ عشر دقائق
//      **لهذه الشريحة وحدها** (`refetchInterval` العامُّ باقٍ `false`، §4.cy)، ومفتاحُه فرعُ الجلسة فيتبدّل بتبديله.
//    • وما لا يُعرف لا يظهر: الشريحةُ تختفي وتبقى الساعة.
//    • والضغطُ على الطقس يفتح سطرَ التفصيل ومصدرَه — شرطُ ترخيص الأرصاد (CC BY 4.0).
//
//  والحالةُ في هذه المكوّنات الصغيرة وحدها، فدقّةُ الدقيقة لا تُعيد رسمَ القائمة كلِّها.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3, Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning, CloudHail, Snowflake, Thermometer,
} from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { useTranslation } from "@/i18n/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  WEATHER_CITIES, WEATHER_CREDIT, formatClock12, formatTemp, weatherLabel, type WeatherKind, type WeatherNow,
} from "@shared/weather";

/** الآن — يتبدّل على رأس كلّ دقيقة، وعند العودة إلى الصفحة. */
export function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      t = setTimeout(tick, 60_000 - (n % 60_000) + 50);
    };
    t = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(t);
      tick();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, []);
  return now;
}

export const WEATHER_REFETCH_MS = 10 * 60_000;

export function useBranchWeather(): WeatherNow | null {
  const session = useBranchSession();
  const { data } = useQuery<{ weather: WeatherNow | null }>({
    queryKey: ["/api/weather", session?.branchId ?? null],
    enabled: !!session,
    refetchInterval: WEATHER_REFETCH_MS,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/weather", { credentials: "include" });
      if (!res.ok) return { weather: null };
      return res.json();
    },
  });
  return data?.weather ?? null;
}

const ICONS: Record<WeatherKind, { day: typeof Sun; night?: typeof Sun; tone: string; nightTone?: string }> = {
  clear: { day: Sun, night: Moon, tone: "text-amber-500", nightTone: "text-indigo-400" },
  fair: { day: CloudSun, night: CloudMoon, tone: "text-amber-500", nightTone: "text-indigo-400" },
  partly: { day: CloudSun, night: CloudMoon, tone: "text-amber-500", nightTone: "text-indigo-400" },
  cloudy: { day: Cloud, tone: "text-slate-400" },
  fog: { day: CloudFog, tone: "text-slate-400" },
  drizzle: { day: CloudDrizzle, tone: "text-sky-500" },
  rain: { day: CloudRain, tone: "text-sky-500" },
  heavy_rain: { day: CloudRain, tone: "text-sky-600" },
  thunder: { day: CloudLightning, tone: "text-violet-500" },
  sleet: { day: CloudHail, tone: "text-sky-400" },
  snow: { day: Snowflake, tone: "text-sky-400" },
};

export function WeatherIcon({ w, className }: { w: Pick<WeatherNow, "kind" | "night">; className?: string }) {
  const spec = w.kind ? ICONS[w.kind] : null;
  if (!spec) return <Thermometer className={cn("text-slate-400", className)} aria-hidden />;
  const Icon = w.night && spec.night ? spec.night : spec.day;
  return <Icon className={cn(w.night && spec.nightTone ? spec.nightTone : spec.tone, className)} aria-hidden />;
}

function cityName(w: WeatherNow, en: boolean) {
  return en ? WEATHER_CITIES.find((c) => c.key === w.cityKey)?.nameEn ?? w.city : w.city;
}

/** شريحتا رأس القائمة: الساعة، والطقسُ بزرٍّ يفتح تفصيلَه ومصدرَه. */
export function SidebarClockWeather() {
  const { language } = useTranslation();
  const en = language === "en";
  const now = useMinuteNow();
  const w = useBranchWeather();
  const label = w ? weatherLabel(w.kind, en) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="sidebar-clock-weather">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 ring-1 ring-slate-200 px-2 py-1 text-xs font-bold text-slate-700"
        data-testid="sidebar-clock">
        <Clock3 className="w-3.5 h-3.5 text-slate-500" aria-hidden />
        <span>{formatClock12(now, en)}</span>
      </span>
      {w && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 ring-1 ring-sky-200 px-2 py-1 text-xs font-bold text-sky-900 hover:bg-sky-100 transition-colors"
              data-testid="sidebar-weather" aria-label={en ? "Weather details" : "تفاصيل الطقس"}>
              <WeatherIcon w={w} className="w-4 h-4 shrink-0" />
              <bdi dir="ltr">{formatTemp(w.tempC, en)}</bdi>
              <span className="truncate">{label ? `${label} · ` : ""}{cityName(w, en)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 text-sm" data-testid="sidebar-weather-details">
            <div className="flex items-center gap-3">
              <WeatherIcon w={w} className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{en ? `Weather now in ${cityName(w, true)}` : `الطقس الآن في ${w.city}`}</div>
                <div className="font-display text-lg font-extrabold text-slate-800 leading-tight">
                  <bdi dir="ltr">{formatTemp(w.tempC, en)}</bdi>{label ? ` ${label}` : ""}
                </div>
              </div>
            </div>
            {w.updatedAt && (
              <p className="mt-2 text-xs text-slate-500">
                {en ? "Forecast issued at " : "صدر التوقّع الساعة "}{formatClock12(Date.parse(w.updatedAt), en)}
              </p>
            )}
            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
              {en ? "Data from " : `${WEATHER_CREDIT} `}
              <a href="https://www.met.no/en" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline hover:text-slate-700">MET Norway</a>
              {" · "}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline hover:text-slate-700">CC BY 4.0</a>
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** السطرُ الصغير تحت الاسم في شريط الهاتف العلويّ: الساعةُ والحرارةُ ورمزُها. */
export function TopBarClockWeather() {
  const { language } = useTranslation();
  const en = language === "en";
  const now = useMinuteNow();
  const w = useBranchWeather();
  return (
    <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-500" data-testid="topbar-clock-weather">
      <span>{formatClock12(now, en)}</span>
      {w && (
        <>
          <span className="text-slate-300" aria-hidden>·</span>
          <WeatherIcon w={w} className="w-3.5 h-3.5" />
          <bdi dir="ltr">{formatTemp(w.tempC, en)}</bdi>
        </>
      )}
    </span>
  );
}
