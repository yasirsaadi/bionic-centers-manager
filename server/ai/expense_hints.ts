// Inline guidance for the expense entry form. Returns a list of
// short Arabic hints to display under the description field.
//
// Architecture: rules first, AI second. Rules cover the deterministic
// cases (electricity/rent/internet expenses without invoice number;
// large amounts without notes; missing category). The AI escape hatch
// is a single Haiku call for descriptions that don't match any rule
// but might still benefit from human-style suggestion. We keep the AI
// path optional so the feature stays free unless the user opts in.
//
// Cost model (with caching): $0.20-0.50/month at 500 hint requests.

import { safeAiComplete, type AiResult } from "./provider";

export interface ExpenseHintInput {
  description: string;
  amount: number; // dinars
  category?: string | null;
}

export interface ExpenseHint {
  // "info"     → benign suggestion ("consider adding invoice #")
  // "warning"  → likely missing data ("category is empty")
  severity: "info" | "warning";
  message: string;
}

// Tokens that strongly imply a recurring utility/rent expense — for
// these we want the user to attach an invoice number for traceability.
const UTILITY_KEYWORDS = [
  "كهرب", "ماء", "مياه", "غاز", "إنترنت", "انترنت", "مولدة", "مولد",
  "إيجار", "ايجار", "إيجر", "كاميرا", "صيان",
];

// Tokens that suggest a one-off purchase — different hint
// (consider a vendor + receipt).
const PURCHASE_KEYWORDS = [
  "شراء", "اشتر", "جهاز", "أجهزة", "أدوات", "ادوات", "مستلزم",
];

const NORMALISE = (s: string) =>
  s.trim().toLowerCase()
    .replace(/[آأإ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

export function getRuleBasedHints(input: ExpenseHintInput): ExpenseHint[] {
  const hints: ExpenseHint[] = [];
  const desc = NORMALISE(input.description || "");
  const amount = Number(input.amount) || 0;

  // 1. Empty category — basic data quality.
  if (!input.category || !input.category.trim()) {
    hints.push({
      severity: "warning",
      message: "اختر فئة المصروف لتسهيل التقارير لاحقاً.",
    });
  }

  // 2. Utility-like description without an attached invoice/note hint.
  if (UTILITY_KEYWORDS.some((k) => desc.includes(NORMALISE(k)))) {
    hints.push({
      severity: "info",
      message: "هذا يبدو مصروفاً دورياً — أضف رقم فاتورة المورّد في الملاحظات لتسهيل المطابقة.",
    });
  }

  // 3. Purchase-like description — different reminder.
  if (PURCHASE_KEYWORDS.some((k) => desc.includes(NORMALISE(k)))) {
    hints.push({
      severity: "info",
      message: "إن كان شراء معدّات من مورّد، فكّر بتسجيلها في تبويب المشتريات بدلاً من المصاريف.",
    });
  }

  // 4. Large amount without enough description detail.
  // Threshold: 1M IQD ≈ $700; anything above that deserves a paper trail.
  if (amount >= 1_000_000 && (input.description?.trim().length ?? 0) < 12) {
    hints.push({
      severity: "warning",
      message: "المبلغ كبير لكنّ الوصف مختصر. يُستحسن توضيح الجهة المستفيدة وسبب المصروف.",
    });
  }

  // 5. Suspiciously round huge amount (10M+) — common typo trap.
  if (amount >= 10_000_000) {
    hints.push({
      severity: "warning",
      message: "تأكّد من المبلغ — يبدو كبيراً غير معتاد لمصروف يومي.",
    });
  }

  // 6. Description with only digits / very short.
  const trimmedDesc = input.description?.trim() ?? "";
  if (trimmedDesc.length > 0 && trimmedDesc.length < 4) {
    hints.push({
      severity: "warning",
      message: "الوصف قصير جداً — أضف تفاصيل لتسهيل المراجعة لاحقاً.",
    });
  }

  return hints;
}

// Optional AI escalation: only called when explicitly requested by
// the route. Today the route is configured to always skip this; we
// can flip it on later if managers want richer suggestions.
export async function getAiHints(
  input: ExpenseHintInput
): Promise<AiResult<ExpenseHint[]>> {
  const system = `أنت مدقّق محاسبي عراقي. تحلّل وصفاً مختصراً لمصروف يومي وتقترح ملاحظات مفيدة.
أعد فقط مصفوفة JSON من النوع:
[{"severity": "info"|"warning", "message": "نصّ عربي قصير ≤ 100 حرف"}]
اقتصر على ما هو غير واضح من الوصف. لا تعلّق على المبلغ إلاّ إن كان شاذّاً صراحةً.
إن لم تجد ملاحظات مفيدة، أعد [].`;
  const user = JSON.stringify(input);
  const result = await safeAiComplete({ system, user, model: "haiku", maxTokens: 300 });
  if (!result.ok) return result;
  try {
    const cleaned = result.value.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return { ok: true, value: [] };
    const safe: ExpenseHint[] = parsed
      .filter((h: any) => h && typeof h.message === "string")
      .slice(0, 3)
      .map((h: any) => ({
        severity: h.severity === "warning" ? "warning" : "info",
        message: String(h.message).slice(0, 160),
      }));
    return { ok: true, value: safe };
  } catch {
    return { ok: true, value: [] };
  }
}
