// نصُّ عمود «الملاحظات» لسطر الدفتر — واحدٌ للشاشة (`CashBook.tsx`) وللورقة المطبوعة (`CashBookPrint.tsx`)، فلا تختلفان.
import { EXPENSE_CATEGORIES } from "@/lib/expense_categories";
import { OUTFLOW_LABELS, INCOME_OTHER_LABEL, distinctNoteParts, DR_BOX_WITHDRAWAL_CATEGORY, DR_BOX_WITHDRAWAL_LABEL } from "@shared/cash_book";

export const cashCategoryLabel = (c: string | null) => (!c ? ""
  : c === DR_BOX_WITHDRAWAL_CATEGORY ? DR_BOX_WITHDRAWAL_LABEL
  : EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c);

export function cashRowNote(r: { kind: string; source: string; note: string; category: string | null }): string {
  if (r.kind === "income_other") return `${INCOME_OTHER_LABEL}${r.note ? ` — ${r.note}` : ""}`;
  if (r.kind === "dr_transfer") return `${OUTFLOW_LABELS.dr_transfer}${r.note ? ` (${r.note})` : ""}`;
  //  نسبةُ الدكتور محسوبةٌ تلقائياً، وملاحظتُها نسبتُها («٢٠٪ من وارد اليوم»).
  if (r.kind === "dr_ratio") return `${OUTFLOW_LABELS.dr_ratio}${r.note ? ` (${r.note})` : ""}`;
  if (r.kind === "hospital_ratio" || r.kind === "atabah_ratio") {
    return `${OUTFLOW_LABELS[r.kind as "dr_ratio"]}${r.note && r.kind === "atabah_ratio" ? ` — ${r.note}` : ""}`;
  }
  //  **والبابُ لا يتكرّر في وصفه** — «رواتب — رواتب» حين كُتب اسمُ الباب ملاحظةً (`distinctNoteParts`).
  if (r.source === "expense") return distinctNoteParts([cashCategoryLabel(r.category), ...(r.note ? r.note.split(" — ") : [])]).join(" — ");
  return r.note;
}

/**
 * سطرُ قاصة الدكتور كما يراه الفرع: «صُرف من قاصة الدكتور — الباب» لما صرفه المالكُ، بلا مبلغ (§4.cb)؛
 * و«سحب من قاصة الدكتور — المبلغ — الملاحظة» لما سجّله الفرعُ نفسُه (§4.cb تكملةٌ ثالثة). ولا يدخل أيٌّ منهما مجموعَ الدفتر.
 */
export function drBoxLineText(l: { category: string; amount?: number; note?: string }): string {
  if (l.amount !== undefined) {
    return [DR_BOX_WITHDRAWAL_LABEL, l.amount.toLocaleString("en-US"), ...(l.note ? [l.note] : [])].join(" — ");
  }
  return `صُرف من قاصة الدكتور — ${cashCategoryLabel(l.category)}`;
}
