// نصُّ عمود «الملاحظات» لسطر الدفتر — واحدٌ للشاشة (`CashBook.tsx`) وللورقة المطبوعة (`CashBookPrint.tsx`)، فلا تختلفان.
import { EXPENSE_CATEGORIES } from "@/lib/expense_categories";
import { OUTFLOW_LABELS, INCOME_OTHER_LABEL } from "@shared/cash_book";

export const cashCategoryLabel = (c: string | null) => (c ? EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c : "");

export function cashRowNote(r: { kind: string; source: string; note: string; category: string | null }): string {
  if (r.kind === "income_other") return `${INCOME_OTHER_LABEL}${r.note ? ` — ${r.note}` : ""}`;
  if (r.kind === "dr_transfer") return `${OUTFLOW_LABELS.dr_transfer}${r.note ? ` (${r.note})` : ""}`;
  if (r.kind === "dr_ratio" || r.kind === "hospital_ratio" || r.kind === "atabah_ratio") {
    return `${OUTFLOW_LABELS[r.kind as "dr_ratio"]}${r.note && r.kind === "atabah_ratio" ? ` — ${r.note}` : ""}`;
  }
  if (r.source === "expense") return `${cashCategoryLabel(r.category)}${r.note ? ` — ${r.note}` : ""}`;
  return r.note;
}

/** سطرُ «صُرف من قاصة الدكتور» كما يراه الفرع — البابُ وحده (§4.cb). */
export const drBoxLineText = (category: string) => `صُرف من قاصة الدكتور — ${cashCategoryLabel(category)}`;
