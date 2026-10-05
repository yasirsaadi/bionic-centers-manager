// **دفترُ القاصة اليوميّ** (قرارُ المالك ٢٠٢٦-١٠-٠٦، ترحيل ٠٩٨، §4.ca) — القواعدُ الخالصة في موضعٍ واحد،
// يقرؤها الخادمُ (الحارسُ الأخير) والصفحةُ معاً. نسخةٌ إلكترونية من ورقة الدفتر بأعمدتها وحقولها.
//
// قراراتُ المالك:
// • دفترا «أطراف ومساند» و«علاج طبيعي» لبغداد وذي قار، ودفترُ «أطراف ومساند» وحده لكربلاء والموصل.
// • نسبةُ الدكتور من وارد **كلّ دفترٍ على حدة**: بغداد ٢٠٪، وكربلاء وذي قار والموصل ١٠٪ — ثابتة، تُحسب ولا تُكتب.
// • نسبةُ المستشفى لذي قار وحدها ١٠٪ من وارد الدفتر — ثابتة. ونسبةُ العتبة لكربلاء وحدها — متغيّرة، يكتبها المحاسب.
// • نسبةُ الدكتور ليست مصروفاً (مالُ المالك كالتحويل)؛ ونسبتا المستشفى والعتبة مصروفٌ حقيقيّ لجهةٍ خارجية.
// • يكتب في الدفتر المحاسبُ ومديرُ الفرع والمسؤولُ وحدهم، وفي اليوم نفسِه وحدَه — والأيامُ الماضية للمسؤول.
// • ولا مجموعَ للتحويلات في أيّ مكان: الصادرُ رقمٌ واحد كما في الورقة.

export type CashBook = "devices" | "physio";
export const CASH_BOOKS: readonly CashBook[] = ["devices", "physio"];
export const CASH_BOOK_LABELS: Record<CashBook, string> = {
  devices: "أطراف ومساند",
  physio: "علاج طبيعي",
};

/** قسمُ المصروف (`expenses.section`) الذي يقابل كلَّ دفتر. */
export const BOOK_EXPENSE_SECTION: Record<CashBook, "prosthetic" | "physio"> = {
  devices: "prosthetic",
  physio: "physio",
};

/** ما يُكتب في جدول الدفتر نفسِه — ما ليس مصروفاً. */
export type CashEntryKind = "income_other" | "dr_transfer" | "dr_ratio" | "ratio_received";
export const CASH_ENTRY_KINDS: readonly CashEntryKind[] = ["income_other", "dr_transfer", "dr_ratio", "ratio_received"];

/** أنواعُ الصادر كما يختارها الموظّف — ثلاثةٌ منها صفوفُ مصاريف حقيقية. */
export type OutflowKind = "expense" | "dr_transfer" | "dr_ratio" | "hospital_ratio" | "atabah_ratio";

export const OUTFLOW_LABELS: Record<OutflowKind, string> = {
  expense: "مصاريف",
  dr_transfer: "تحويل إلى قاصة الدكتور",
  dr_ratio: "نسبة الدكتور",
  hospital_ratio: "نسبة المستشفى",
  atabah_ratio: "نسبة العتبة",
};
export const INCOME_OTHER_LABEL = "وارد آخر";

/** فئتا المصروف للنسبتين — `shrine_percentage` قائمةٌ أصلاً في فئات المصاريف («نسبة العتبة»). */
export const HOSPITAL_RATIO_CATEGORY = "hospital_percentage";
export const ATABAH_RATIO_CATEGORY = "shrine_percentage";

/** إعدادُ الفرع — من اسمه، بنمط «نسبة العتبة لكربلاء» القائم في نافذة المصاريف. */
export interface BranchCashConfig {
  books: CashBook[];
  drRatioPct: number | null;
  hospitalRatioPct: number | null;
  hasAtabahRatio: boolean;
}

export function branchCashConfig(branchName: string | null | undefined): BranchCashConfig {
  const n = String(branchName ?? "");
  if (n.includes("بغداد")) return { books: ["devices", "physio"], drRatioPct: 20, hospitalRatioPct: null, hasAtabahRatio: false };
  if (n.includes("ذي قار")) return { books: ["devices", "physio"], drRatioPct: 10, hospitalRatioPct: 10, hasAtabahRatio: false };
  if (n.includes("كربلاء")) return { books: ["devices"], drRatioPct: 10, hospitalRatioPct: null, hasAtabahRatio: true };
  if (n.includes("الموصل")) return { books: ["devices"], drRatioPct: 10, hospitalRatioPct: null, hasAtabahRatio: false };
  //  فرعٌ لم يقرّر له المالكُ نسبةً (كركوك المغلقُ مؤقتاً): دفترٌ واحد بلا نسب — لا تُخترع نسبة.
  return { books: ["devices"], drRatioPct: null, hospitalRatioPct: null, hasAtabahRatio: false };
}

/** النسبةُ من وارد الدفتر — بالدينار الصحيح، والنصفُ يُجبَر للأعلى. */
export function ratioAmount(income: number, pct: number | null): number {
  if (!pct || !Number.isFinite(income) || income <= 0) return 0;
  return Math.round((income * pct) / 100);
}

/** مَن يكتب في الدفتر: المحاسبُ ومديرُ الفرع والمسؤولُ — لا غيرُهم. */
export function canWriteCashBook(s: { isAdmin?: boolean | null; role?: string | null } | null | undefined): boolean {
  if (!s) return false;
  return Boolean(s.isAdmin) || s.role === "branch_manager" || s.role === "accountant";
}

/** يومٌ مفتوحٌ للكتابة: اليومُ نفسُه للموظّف، وأيُّ يومٍ للمسؤول — ولا يومَ قبل الرصيد الافتتاحيّ. */
export function canWriteDay(
  s: { isAdmin?: boolean | null } | null | undefined, day: string, today: string, openingDate: string | null,
): boolean {
  if (!openingDate || day < openingDate || day > today) return false;
  return Boolean(s?.isAdmin) || day === today;
}

/** حسابُ آخر اليوم بالضبط كما في الورقة. */
export interface DayTotals {
  income: number;
  outflow: number;
  dayNet: number;
  prevRemaining: number;
  remaining: number;
}
export function dayTotals(income: number, outflow: number, prevRemaining: number): DayTotals {
  const dayNet = income - outflow;
  return { income, outflow, dayNet, prevRemaining, remaining: prevRemaining + dayNet };
}

/** مربّعُ نسبة العزل: نسبةُ اليوم + المتبقي من نسبة أمس − ما استلمه المالكُ اليوم. */
export function ratioBox(todayRatio: number, prevRatio: number, receivedToday: number) {
  return { today: todayRatio, prev: prevRatio, received: receivedToday, remaining: prevRatio + todayRatio - receivedToday };
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
/** اسمُ اليوم لتاريخ `YYYY-MM-DD` — من التاريخ وحده، بلا ساعة الجهاز. */
export function dayNameOf(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : DAY_NAMES[d.getUTCDay()];
}

export function isYmd(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function isCashBook(v: unknown): v is CashBook {
  return v === "devices" || v === "physio";
}

/** مبلغٌ صحيحٌ موجب — بالدينار، بلا كسور. */
export function parseAmount(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/[,\s]/g, "")) : Number(v);
  return Number.isInteger(n) && n > 0 && n <= 10_000_000_000 ? n : null;
}
