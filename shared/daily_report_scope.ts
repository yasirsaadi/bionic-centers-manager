//  **نطاقُ التقرير اليومي للمرضى** — الأقسامُ المختارة والفترة (طلبُ المالك ٢٠٢٦-١٠-٠١، §4.az):
//  «تخصيص نوع القسم اطراف او مساند او علاج او كلهم او اثنان منهم كذلك تخصيص مدة من والى».
//  منطقٌ خالص بلا شبكة ولا React: الخادمُ يحسب به مالَ الاختيار، والشاشةُ تختار به صفوفَ الملخّص،
//  فلا يفترق المعروضُ عن المحسوب.

export const REPORT_SERVICES = ["prosthetic", "medical_support", "physiotherapy"] as const;
export type ReportService = (typeof REPORT_SERVICES)[number];

/**
 *  الأقسامُ من نصّ الطلب (`a,b`). **`null` = الكلّ** (لا ترشيح): لا معامل، أو لا قسمَ صالح، أو الثلاثة.
 *  والقيمُ الغريبة تُهمَل.
 */
export function parseReportServices(raw: unknown): ReportService[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parts = raw.split(",").map((s) => s.trim());
  const sel = REPORT_SERVICES.filter((k) => parts.includes(k));
  return sel.length === 0 || sel.length === REPORT_SERVICES.length ? null : sel;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDay(s: unknown): s is string {
  if (typeof s !== "string" || !DAY_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 *  الفترةُ من الطلب — يومان شاملان بتوقيت بغداد. `from`/`to`، و`date` القديمُ يومٌ واحد،
 *  وبلا شيءٍ اليومُ. وطرفٌ واحد ⟵ يومٌ واحد، وطرفان مقلوبان يُرتَّبان.
 */
export function parseReportRange(q: { from?: unknown; to?: unknown; date?: unknown }, today: string): { from: string; to: string } {
  const from = validDay(q.from) ? q.from : validDay(q.date) ? q.date : null;
  const to = validDay(q.to) ? q.to : null;
  const a = from ?? to ?? today;
  const b = to ?? from ?? today;
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export interface MoneyPair { revenue: number; paid: number }
export interface DepartmentMoney {
  prosthetic: MoneyPair;
  medical_support: MoneyPair;
  physiotherapy: MoneyPair;
  legacyDevicesUnsplit: { revenue: number };
  unclassified: MoneyPair;
}
export interface ExpenseSections { devices: number; physio: number; shared: number }

export interface ScopedMoney {
  /** مجموعُ الأقسام المختارة. */
  selected: MoneyPair;
  /** مصاريفُ الاختيار — `null` حين لا تنفصل (الأطرافُ وحدها أو المساندُ وحدها: مصروفُ الأجهزة واحدٌ لهما). */
  expenses: number | null;
  /** المصروفُ المشترك الذي لا يخصّ قسماً — يُذكر ولا يُطرَح من قسم. */
  sharedExpenses: number;
  /** المقبوضُ − المصاريف، أو `null` حين لا تنفصل المصاريف. */
  netCash: number | null;
}

/**
 *  مالُ الأقسام المختارة — **من أرقام مصدر الحقيقة المحاسبي نفسِها، جمعاً لا حساباً جديداً**.
 *  - الأجهزةُ القديمةُ غيرُ المفصولة (مبيعاتٌ فقط) تدخل حين يُختار القسمان معاً — هي مالُ أجهزة، ولا يُعرَف أيُّهما.
 *  - و«غيرُ المصنَّف» لا يدخل اختياراً جزئياً: لا يُنسَب لقسمٍ بالتخمين.
 *  - والمصاريفُ على نموذجها (أجهزة · علاج طبيعي · مشترك): أجهزةٌ حين يُختار القسمان، وعلاجٌ طبيعي حين يُختار.
 */
export function scopeDepartmentMoney(
  services: readonly ReportService[],
  d: DepartmentMoney,
  exp: ExpenseSections,
): ScopedMoney {
  const has = (k: ReportService) => services.includes(k);
  const bothDevices = has("prosthetic") && has("medical_support");
  const oneDevice = has("prosthetic") !== has("medical_support");
  let revenue = 0, paid = 0;
  for (const k of services) { revenue += d[k].revenue || 0; paid += d[k].paid || 0; }
  if (bothDevices) revenue += d.legacyDevicesUnsplit?.revenue || 0;
  const expenses = oneDevice ? null
    : (bothDevices ? exp.devices || 0 : 0) + (has("physiotherapy") ? exp.physio || 0 : 0);
  return {
    selected: { revenue, paid },
    expenses,
    sharedExpenses: exp.shared || 0,
    netCash: expenses === null ? null : paid - expenses,
  };
}

/** وصفُ الاختيار بالعربية — للعنوان المطبوع. */
export const REPORT_SERVICE_LABELS: Record<ReportService, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};
export function reportServicesLabel(services: readonly ReportService[] | null): string {
  if (!services || services.length === 0 || services.length === REPORT_SERVICES.length) return "كل الأقسام";
  return REPORT_SERVICES.filter((k) => services.includes(k)).map((k) => REPORT_SERVICE_LABELS[k]).join(" + ");
}

// ══ التفصيلُ اليوميّ لفترةٍ من أكثر من يوم (§4.az) ══════════════════════
//  «من ١ إلى ١٠ … مجموعُ كلّ يوم ثمّ مجموعُ العشرة». كلُّ يومٍ من `getAccountingSummary` نفسِها بحدود يوم بغداد،
//  والمجموعُ جمعُ الأيام — ويُختبَر أنه يساوي ملخّصَ الفترة.

/** أقصى أيامٍ يُفصَّل لها — كلُّ يومٍ استعلامٌ محاسبيٌّ كامل. */
export const MAX_DAILY_BREAKDOWN_DAYS = 92;

/** أيامُ الفترة بالترتيب، والطرفان شاملان. */
export function enumerateReportDays(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let i = 0; ; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i)).toISOString().split("T")[0];
    if (day > to) break;
    out.push(day);
  }
  return out;
}

export interface DailyMoney {
  /** المقبوض. */ paid: number;
  /** المبيعات. */ revenue: number;
  /** `null` حين لا تنفصل مصاريفُ الاختيار. */ expenses: number | null;
  net: number | null;
}

/**
 *  مالُ يومٍ من ملخّصه المحاسبيّ — **بتعريف الملخّص المالي نفسِه**: للكلّ الإجماليُّ والمصاريفُ والصافي
 *  (المقبوض − المصاريف)، وللاختيار الجزئيّ `scopeDepartmentMoney`.
 */
export function dayMoney(
  a: { byDepartment: DepartmentMoney; rollups: { grandTotal: MoneyPair }; totalExpenses: number; expensesBySection: ExpenseSections },
  services: readonly ReportService[] | null,
): DailyMoney {
  if (!services) {
    const paid = a.rollups.grandTotal.paid || 0;
    const expenses = a.totalExpenses || 0;
    return { paid, revenue: a.rollups.grandTotal.revenue || 0, expenses, net: paid - expenses };
  }
  const s = scopeDepartmentMoney(services, a.byDepartment, a.expensesBySection);
  return { paid: s.selected.paid, revenue: s.selected.revenue, expenses: s.expenses, net: s.netCash };
}

export interface DailyRow extends Partial<DailyMoney> { day: string; visits: number }

/** مجموعُ الأيام — والمصاريفُ والصافي `null` إن غابا عن يومٍ واحد (لا يُجمَع مجهول). */
export function sumDailyRows(rows: readonly DailyRow[], withMoney: boolean): Omit<DailyRow, "day"> {
  const visits = rows.reduce((s, r) => s + (r.visits || 0), 0);
  if (!withMoney) return { visits };
  const add = (k: keyof DailyMoney) =>
    rows.some((r) => r[k] === null || r[k] === undefined) ? null : rows.reduce((s, r) => s + (r[k] as number), 0);
  return { visits, paid: add("paid") ?? 0, revenue: add("revenue") ?? 0, expenses: add("expenses"), net: add("net") };
}
