// AI feature 3.4 — auto-suggest an expense category from its description.
//
// User flow: accountant types a free-form expense description (e.g.
// "اشتريت ورق طباعة وأقلام") and clicks the AI suggest button. We send the
// description to Haiku 4.5 with a fixed Iraqi-Arabic system prompt and get
// back one of the 12 fixed expense categories that the rest of the accounting
// system already understands.

import { safeAiComplete, type AiResult } from "./provider";

// The 12 categories must match what the chart of accounts and expense routes
// expect — keep this list in sync with EXPENSE_CATEGORY_MAP in
// server/accounting/auto_journal.ts.
export const EXPENSE_CATEGORIES = [
  "رواتب",
  "إيجارات",
  "مستلزمات طبية",
  "صيانة",
  "كهرباء ومياه",
  "اتصالات",
  "تسويق",
  "نقل",
  "ضيافة",
  "قرطاسية",
  "رسوم بنكية",
  "أخرى",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// System prompt is intentionally small but precise. Stable across all calls so
// once it grows past the cache minimum it'll cache. Iraqi Arabic, as the user
// requested.
const CATEGORIZE_SYSTEM_PROMPT = `
أنت مساعد محاسبي خبير لمراكز طبية في العراق. مهمتك تصنيف وصف المصروف إلى إحدى الفئات الاثنتي عشرة التالية بدقة، مع مراعاة اللهجة العراقية والصياغات الشائعة.

الفئات المسموحة (اختر واحدة فقط واكتبها كما هي حرفياً):

1. رواتب — أيّ مصاريف رواتب أو أجور أو مرتبات أو سُلَف موظفين.
2. إيجارات — إيجار مباني المراكز، مكاتب، مخازن، مواقف.
3. مستلزمات طبية — أدوية، ضمادات، أدوات طبية مستهلكة، مستلزمات أطراف صناعية.
4. صيانة — إصلاح أجهزة، صيانة مبنى، تصليح كراسي وأسرّة، صيانة كهرباء/سباكة.
5. كهرباء ومياه — فواتير الكهرباء الحكومية أو المولّدات، فواتير الماء، اشتراك مولدة الحي.
6. اتصالات — فواتير الإنترنت، الموبايل، الهاتف الأرضي، اشتراكات منصّات اتصال.
7. تسويق — إعلانات، رعاية، طباعة بروشورات، حملات سوشيال ميديا، لوحات إعلانية.
8. نقل — أجور سيارات، بنزين/وقود، سيارات أجرة، توصيل، صيانة دورية للسيارات.
9. ضيافة — قهوة، شاي، ماء معدني، وجبات للمرضى أو الموظفين، حلويات للمناسبات.
10. قرطاسية — أوراق طباعة، أقلام، دفاتر، حبر طابعة، ملفات، أدوات مكتبية.
11. رسوم بنكية — عمولات بنكية، رسوم تحويل، رسوم بطاقات، رسوم سحب آلي.
12. أخرى — أيّ مصروف لا يندرج بوضوح تحت ما سبق.

قواعد:
- أعد اسم الفئة فقط، بدون أيّ شرح أو علامات أو ترقيم أو سطور إضافية.
- اكتب اسم الفئة باللغة العربية كما هو في القائمة أعلاه (لا تترجم، لا تختصر).
- إذا كان الوصف غامضاً أو يحتوي بنوداً متعددة، اختر الفئة الأقرب لقيمة المصروف الأكبر.
- إذا لم تستطع التحديد بثقة معقولة، أعد "أخرى".
`.trim();

/**
 * Suggests a category for an Arabic expense description.
 *
 * Returns:
 *   { ok: true, value: <category> }   on success
 *   { ok: false, reason, message }    on failure (AI off, rate limit, etc.)
 *
 * The returned category is guaranteed to be one of EXPENSE_CATEGORIES.
 * If the model returns something off-list (rare), we fall back to "أخرى".
 */
export async function suggestExpenseCategory(
  description: string
): Promise<AiResult<ExpenseCategory>> {
  const trimmed = description.trim();
  if (!trimmed) {
    return { ok: false, reason: "unknown", message: "الوصف فارغ" };
  }

  const result = await safeAiComplete({
    system: CATEGORIZE_SYSTEM_PROMPT,
    user: `الوصف: ${trimmed}\n\nالفئة:`,
    model: "haiku",
    // Category names are at most ~15 characters; 32 tokens is plenty and caps
    // any runaway response cheaply.
    maxTokens: 32,
  });

  if (!result.ok) return result;

  // The model is instructed to return just the category name, but trim and
  // strip any stray punctuation just in case.
  const cleaned = result.value
    .replace(/[\.\:،,"']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if ((EXPENSE_CATEGORIES as readonly string[]).includes(cleaned)) {
    return { ok: true, value: cleaned as ExpenseCategory };
  }

  // Soft fallback: try a substring match against each category before giving up.
  for (const cat of EXPENSE_CATEGORIES) {
    if (cleaned.includes(cat) || cat.includes(cleaned)) {
      return { ok: true, value: cat };
    }
  }

  console.warn(`[ai/categorize] off-list response: "${result.value}" — falling back to "أخرى"`);
  return { ok: true, value: "أخرى" };
}
