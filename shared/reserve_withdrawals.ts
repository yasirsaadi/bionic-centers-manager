//  **«طلب سحب من القاصات»** (§4.fy — طلبُ المالك ٢٠٢٦-١١-٠٣): حاملُ المفتاح يطلب السحبَ من «قاصة المواد» أو «قاصة الرواتب والإيجار»،
//  ولا يخرج شيءٌ حتى يعتمده المسؤول — فيُكتب سطرُ السحب نفسُه بيوم الاعتماد. وطلبُ المالك: «معلوماتُ السحب في الطلب واضحةٌ ومقروءة»،
//  فالمبلغُ يُكتب رقماً وكلماتٍ، والرصيدُ قبله وبعده.
import type { ReserveKey } from "./cash_book";

export type ReserveWithdrawalStatus = "pending" | "approved" | "rejected";

export const RESERVE_WITHDRAWAL_STATUS_LABELS: Record<ReserveWithdrawalStatus, string> = {
  pending: "بانتظار اعتماد المسؤول",
  approved: "اعتُمد وسُحب",
  rejected: "رُفض",
};

/** الغرضُ إلزاميّ — «أين يذهب المبلغ» — ثلاثةُ أحرفٍ على الأقلّ. */
export const PURPOSE_MIN = 3;
export const PURPOSE_MAX = 500;
export const PURPOSE_ERROR = "اكتب الغرضَ من السحب — أين يذهب المبلغ";

/** مَن يطلب: حاملُ المفتاح وحده، والمسؤولُ يسحب مباشرةً. */
export function canRequestReserveWithdrawal(s: { isAdmin?: unknown; permissions?: { canRequestReserveWithdrawal?: unknown } | null } | null | undefined): boolean {
  return !s?.isAdmin && s?.permissions?.canRequestReserveWithdrawal === true;
}

/** الرصيدُ بعد السحب، وهل يتجاوز المبلغُ الرصيد (قرارُ المالك: يُقبل ويُعرض بالأحمر، والقرارُ له). */
export function balanceAfter(balance: number, amount: number) {
  return { after: balance - amount, exceeds: amount > balance };
}

export function reserveOf(raw: unknown): ReserveKey | null {
  return raw === "materials" || raw === "payroll" ? raw : null;
}

// ══ المبلغُ بالكلمات ══════════════════════════════════════════════════════════════════════════
const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

/** ما دون الألف. */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 10) parts.push(ONES[r]);
    else if (r < 20) parts.push(TEENS[r - 10]);
    else parts.push(r % 10 ? `${ONES[r % 10]} و${TENS[Math.floor(r / 10)]}` : TENS[Math.floor(r / 10)]);
  }
  return parts.join(" و");
}

/**
 * مرتبةٌ (ألف، مليون، مليار) بعددها: ألف · ألفان · ثلاثة آلاف · أحد عشر ألفاً · مئة ألف.
 * **وفي آخر المبلغ** (يليها «دينار» مضافاً إليه): ألفا دينار · خمسة وعشرون ألف دينار.
 */
function scale(n: number, w: { one: string; two: string; twoLast: string; plural: string; acc: string }, last: boolean): string {
  if (n === 1) return w.one;
  if (n === 2) return last ? w.twoLast : w.two;
  if (n >= 3 && n <= 10) return `${below1000(n)} ${w.plural}`;
  const r = n % 100;
  return `${below1000(n)} ${r >= 11 && r <= 99 && !last ? w.acc : w.one}`;
}

const BILLION = { one: "مليار", two: "ملياران", twoLast: "مليارا", plural: "مليارات", acc: "ملياراً" };
const MILLION = { one: "مليون", two: "مليونان", twoLast: "مليونا", plural: "ملايين", acc: "مليوناً" };
const THOUSAND = { one: "ألف", two: "ألفان", twoLast: "ألفا", plural: "آلاف", acc: "ألفاً" };

/**
 * المبلغُ بالكلمات بالدينار — «خمسمئة ألف دينار». للأعداد الصحيحة الموجبة حتى ما دون التريليون؛ وغيرُها نصٌّ فارغ.
 */
export function amountInArabicWords(amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0 || amount >= 1e12) return "";
  const billions = Math.floor(amount / 1e9);
  const millions = Math.floor((amount % 1e9) / 1e6);
  const thousands = Math.floor((amount % 1e6) / 1e3);
  const rest = amount % 1000;
  const parts: string[] = [];
  if (billions) parts.push(scale(billions, BILLION, !millions && !thousands && !rest));
  if (millions) parts.push(scale(millions, MILLION, !thousands && !rest));
  if (thousands) parts.push(scale(thousands, THOUSAND, !rest));
  if (rest) parts.push(below1000(rest));
  return `${parts.join(" و")} دينار`;
}
