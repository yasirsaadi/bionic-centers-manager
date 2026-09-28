//  **فترةُ التصدير** — ما يختاره الموظّفُ تحت الأقسام قبل Excel أو PDF (طلبُ المالك ٢٠٢٦-٠٩-٢٨).
//  منطقٌ خالص بلا React ولا شبكة. والخادمُ (`/api/patients/registry?activeFrom=&activeTo=`) يُصدِّر مَن كان له نشاطٌ
//  في الفترة (تسجيل · زيارة · دفعة · معاينة · طلب جهاز · أمر تصنيع)، ومع الأقسام نشاطُ ذلك القسم وحده.
//
//  **والفتراتُ هي المتعارفُ عليها في التقارير**:
//    · الكلّ — بلا قيدِ تاريخ.
//    · يومٌ محدّد.
//    · أسبوعٌ محدّد — **السبت إلى الجمعة** (أسبوعُ العمل في العراق) الذي يقع فيه اليومُ المختار.
//    · شهرٌ محدّد — الشهرُ التقويميّ كاملاً (من أوّله إلى آخره).
//    · آخرُ ٣ أشهر · آخرُ ٦ أشهر · آخرُ سنة — **تنتهي باليوم** وتبدأ من اليوم نفسِه قبل ٣/٦/١٢ شهراً.
//  والأيامُ كلُّها أيامُ بغداد، والطرفان شاملان.

export type ExportPeriodKind = "all" | "day" | "week" | "month" | "3m" | "6m" | "12m";

export const EXPORT_PERIODS: { key: ExportPeriodKind; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "day", label: "يوم محدد" },
  { key: "week", label: "أسبوع محدد" },
  { key: "month", label: "شهر محدد" },
  { key: "3m", label: "آخر ٣ أشهر" },
  { key: "6m", label: "آخر ٦ أشهر" },
  { key: "12m", label: "آخر سنة" },
];

export interface ExportPeriod {
  kind: ExportPeriodKind;
  /** يومٌ `YYYY-MM-DD` لليوم والأسبوع، وشهرٌ `YYYY-MM` للشهر؛ ولا يُقرأ في غيرها. */
  anchor?: string;
}

export interface DateRange { from: string; to: string }

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseYmd = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
};

/** اليومُ بتوقيت بغداد (UTC+3) — لا بساعة الجهاز. */
export function baghdadToday(now: Date = new Date()): string {
  return ymd(new Date(now.getTime() + 3 * 3_600_000));
}

/** نفسُ اليوم قبل `months` شهراً — ويُقصَر على آخر الشهر (٣١ مايو − ٣ ⟵ ٢٨/٢٩ فبراير). */
function monthsBefore(d: Date, months: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() - months, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

/**
 * الفترةُ الفعلية لاختيارٍ ما، أو `null` لـ«الكل». واختيارٌ ناقص (يومٌ بلا تاريخ) يُعامَل «اليوم» لا خطأً.
 * @param today يومُ بغداد الحاليّ `YYYY-MM-DD`.
 */
export function exportPeriodRange(p: ExportPeriod, today: string): DateRange | null {
  const t = parseYmd(today)!;
  switch (p.kind) {
    case "all":
      return null;
    case "day": {
      const d = parseYmd(p.anchor ?? "") ?? t;
      return { from: ymd(d), to: ymd(d) };
    }
    case "week": {
      //  أسبوعُ العمل العراقي: السبت (6) أوّلُه والجمعة (5) آخرُه.
      const d = parseYmd(p.anchor ?? "") ?? t;
      const back = (d.getUTCDay() + 1) % 7; // السبت ⟵ ٠ · الأحد ⟵ ١ · … · الجمعة ⟵ ٦
      const start = new Date(d.getTime() - back * 86_400_000);
      return { from: ymd(start), to: ymd(new Date(start.getTime() + 6 * 86_400_000)) };
    }
    case "month": {
      const m = /^(\d{4})-(\d{2})$/.exec(p.anchor ?? "");
      const y = m ? +m[1] : t.getUTCFullYear();
      const mo = m ? +m[2] - 1 : t.getUTCMonth();
      return { from: ymd(new Date(Date.UTC(y, mo, 1))), to: ymd(new Date(Date.UTC(y, mo + 1, 0))) };
    }
    case "3m":
    case "6m":
    case "12m": {
      const n = p.kind === "3m" ? 3 : p.kind === "6m" ? 6 : 12;
      return { from: ymd(monthsBefore(t, n)), to: today };
    }
  }
}

/** وصفُ الفترة في عنوان PDF وأعلى الجدول: «أسبوع ٢٠٢٦-٠٩-٢٦ إلى ٢٠٢٦-١٠-٠٢». */
export function exportPeriodLabel(p: ExportPeriod, today: string): string {
  const r = exportPeriodRange(p, today);
  if (!r) return "كل التواريخ";
  const name = EXPORT_PERIODS.find((e) => e.key === p.kind)!.label;
  if (p.kind === "day") return `يوم ${r.from}`;
  if (p.kind === "month") return `شهر ${r.from.slice(0, 7)} (${r.from} إلى ${r.to})`;
  if (p.kind === "week") return `أسبوع ${r.from} إلى ${r.to}`;
  return `${name} (${r.from} إلى ${r.to})`;
}

/** وسمُ اسم الملفّ: `2026-09-26_to_2026-10-02` أو `all-dates`. */
export function exportPeriodFileTag(p: ExportPeriod, today: string): string {
  const r = exportPeriodRange(p, today);
  if (!r) return "all-dates";
  return r.from === r.to ? r.from : `${r.from}_to_${r.to}`;
}
