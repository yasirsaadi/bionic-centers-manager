//  **مؤثّرُ الطقس مع تحيّة الصباح** (§4.fw — طلبُ المالك ٢٠٢٦-١١-٠١ بعد معاينته): حين يكون طقسُ مدينة الفرع ممطراً أو مغبرّاً **فعلاً**،
//  تنزل مع التحيّة اليومية قطراتُ مطرٍ أو ذرّاتُ غبارٍ سبعَ ثوانٍ ثمّ تتلاشى، وسطرٌ في التحيّة يقول الطقس.
//
//  قراراتُ المالك: (١) حقيقيٌّ من الطقس لا للجميع، (٢) مرّةً في اليوم مع التحيّة، (٣) سبعُ ثوانٍ، (٤) والغبارُ بالأسلوب نفسِه.
//  وهذا الملفُّ القاعدةُ المحضة وحدها (أيُّ طقسٍ ⟵ أيُّ مؤثّر، ونصُّ السطر، ومفتاحُ المسؤول) — والرسمُ في الواجهة.
import type { WeatherKind } from "./weather";

export type WeatherFx = "drizzle" | "rain" | "heavy" | "thunder" | "dust" | "storm";

export const WEATHER_FX_KINDS: readonly WeatherFx[] = ["drizzle", "rain", "heavy", "thunder", "dust", "storm"];

/** مدّةُ المؤثّر — قرارُ المالك «٧ ثواني». */
export const WEATHER_FX_DURATION_MS = 7000;

/**
 * حالةُ الطقس ⟵ المؤثّر. **ما ليس مطراً ولا غباراً لا مؤثّرَ له** (الصافي والغائم والضباب والثلج والدخان) — فالمؤثّرُ يقول الحقيقة.
 * والسديمُ (HZ) غبارٌ خفيف في رصد العراق (`WEATHER_LABELS.haze`)، والمطرُ مع الثلج مطر.
 */
export function weatherFxFor(kind: WeatherKind | null | undefined): WeatherFx | null {
  switch (kind) {
    case "drizzle": return "drizzle";
    case "rain": case "sleet": return "rain";
    case "heavy_rain": return "heavy";
    case "thunder": return "thunder";
    case "dust": case "haze": return "dust";
    case "blowing_dust": case "duststorm": return "storm";
    default: return null;
  }
}

/**
 * سطرُ الطقس في التحيّة. **بلا فعلٍ ولا صفةٍ بجنس المخاطَب** — قاعدةُ عبارات الترحيب (§4.dp): «الحذرُ في الطريق» لا «انتبه».
 * والمدينةُ اسمُها كما في الشريحة.
 */
export function weatherGreetingLine(fx: WeatherFx, city: string): string {
  const c = city.trim() || "مدينتك";
  switch (fx) {
    case "drizzle": return `رذاذٌ خفيف في ${c} اليوم ☂️`;
    case "rain": return `${c} ممطرةٌ اليوم ☔ — الحذرُ في الطريق`;
    case "heavy": return `مطرٌ غزير في ${c} ☔ — التمهّلُ في الطريق أسلم`;
    case "thunder": return `عاصفةٌ رعدية في ${c} ⛈️ — السلامةُ أوّلاً`;
    case "dust": return `غبارٌ في ${c} اليوم 😷 — الكمّامةُ أفضل`;
    case "storm": return `عاصفةٌ ترابية في ${c} 😷 — البقاءُ في الداخل أسلم`;
  }
}

/** مفتاحُ المسؤول في `system_settings` — المؤثّرُ مفعّلٌ ما لم يُطفأ صراحةً. */
export const WEATHER_FX_SETTING_KEY = "weather_greeting_fx";

export function weatherFxEnabled(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off");
}
