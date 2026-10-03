//  صفوفُ الملخّص المالي للتقرير اليومي — **مصدرٌ واحد للشاشة وللتصدير وللطباعة** (§4.az).
//  لو بنى كلُّ مخرجٍ صفوفَه لنفسه لانحرف المطبوعُ عن المعروض أوّلَ تعديل، والورقةُ المطبوعة تُوقَّع وتُحفظ.
//  منطقٌ خالص بلا React — ولا حسابَ ماليّاً فيه: كلُّ رقمٍ يصل محسوباً من الخادم، وهذا يختار الصفوفَ فقط.
import {
  DEPARTMENT_LABELS, DEVICES_ROLLUP_LABEL, GRAND_TOTAL_LABEL, REPORT_ROW_LABELS,
} from "@shared/service_taxonomy";
import type { ReportService, ScopedMoney } from "@shared/daily_report_scope";

interface DepartmentMoneyRow { revenue: number; paid: number }
export interface DailyFinancial {
  byDepartment: {
    prosthetic: DepartmentMoneyRow;
    medical_support: DepartmentMoneyRow;
    physiotherapy: DepartmentMoneyRow;
    /** أجهزةٌ قديمة مؤكَّدة لم يُثبَت نوعُها — مبيعاتٌ فقط. */
    legacyDevicesUnsplit: { revenue: number };
    unclassified: DepartmentMoneyRow;
  };
  rollups: {
    devicesCombined: DepartmentMoneyRow;
    classifiedTotal: DepartmentMoneyRow;
    grandTotal: DepartmentMoneyRow;
  };
  expenses: number;
  netCash: number;
  /** للاختيار الجزئيّ وحده (`null` حين تُختار الأقسامُ كلُّها). */
  scoped?: ScopedMoney | null;
}

export const SELECTED_TOTAL_LABEL = "مجموع الأقسام المختارة";

export type FinancialRow = {
  key: string; label: string; m: { revenue: number; paid: number | null }; strong?: boolean;
};

/**
 *  الصفوفُ بترتيبها. **`services = null` = الكلّ** — الصفوفُ كما كانت حرفاً.
 *  ولاختيارٍ جزئيّ: القسمُ المختار وحده، و«الأطراف + المساند» ومعها الأجهزةُ القديمة حين يُختار القسمان،
 *  ثمّ «مجموع الأقسام المختارة» من الخادم حين يُختار أكثرُ من قسم. و«غيرُ المصنَّف» لا يظهر: لا يُنسَب لقسم.
 */
export function financialRows(f: DailyFinancial, services: readonly ReportService[] | null): FinancialRow[] {
  const legacy = f.byDepartment.legacyDevicesUnsplit?.revenue || 0;
  const unclassified = f.byDepartment.unclassified;
  const all = !services;
  const has = (k: ReportService) => all || services!.includes(k);
  const bothDevices = has("prosthetic") && has("medical_support");
  const rows: FinancialRow[] = [];
  if (has("prosthetic")) rows.push({ key: "prosthetic", label: DEPARTMENT_LABELS.prosthetic, m: f.byDepartment.prosthetic });
  if (has("medical_support")) rows.push({ key: "medical_support", label: DEPARTMENT_LABELS.medical_support, m: f.byDepartment.medical_support });
  //  قبل مجموع الأجهزة مباشرة، فيرى القارئ لماذا يزيد المجموعُ على الصفّين فوقه.
  //  و`paid: null` لا صفر: لا نظيرَ له في المقبوض، والصفرُ ادّعاءُ قياس.
  if (bothDevices) {
    if (legacy !== 0) {
      rows.push({ key: "legacyDevicesUnsplit", label: REPORT_ROW_LABELS.legacyDevicesUnsplit,
        m: { revenue: legacy, paid: null } });
    }
    rows.push({ key: "devices", label: DEVICES_ROLLUP_LABEL, m: f.rollups.devicesCombined, strong: true });
  }
  if (has("physiotherapy")) rows.push({ key: "physiotherapy", label: DEPARTMENT_LABELS.physiotherapy, m: f.byDepartment.physiotherapy });
  if (all) {
    //  «مجموع الأقسام المعروفة» يُعرَض فقط حين يختلف عن الإجمالي — وإلّا فهو صفٌّ مكرَّر.
    const hasGap = legacy !== 0 || (unclassified.revenue || 0) !== 0 || (unclassified.paid || 0) !== 0;
    if (hasGap) {
      rows.push({ key: "classifiedTotal", label: REPORT_ROW_LABELS.classifiedTotal, m: f.rollups.classifiedTotal });
      rows.push({ key: "unclassified", label: REPORT_ROW_LABELS.unclassified, m: unclassified });
    }
    rows.push({ key: "grand", label: GRAND_TOTAL_LABEL, m: f.rollups.grandTotal, strong: true });
  } else if (services!.length > 1 && f.scoped && !(bothDevices && services!.length === 2)) {
    //  والقسمان من الأجهزة وحدهما: «الأطراف + المساند» هو مجموعُهما — فلا صفٌّ مكرَّر.
    rows.push({ key: "selected", label: SELECTED_TOTAL_LABEL, m: f.scoped.selected, strong: true });
  }
  return rows;
}

/**
 *  سطرُ المصاريف والصافي — للكلّ كما كان، وللاختيار الجزئيّ مصاريفُ قسمه. وحين لا تنفصل (الأطرافُ وحدها أو
 *  المساندُ وحدها: مصروفُ الأجهزة واحدٌ لهما) يُقال ذلك ولا يُخترَع رقم. والمشتركُ يُذكر ولا يُطرَح.
 */
export function expenseLines(f: DailyFinancial, services: readonly ReportService[] | null): {
  expenses: number | null; netCash: number | null; sharedExpenses: number | null;
} {
  if (!services || !f.scoped) return { expenses: f.expenses, netCash: f.netCash, sharedExpenses: null };
  return { expenses: f.scoped.expenses, netCash: f.scoped.netCash, sharedExpenses: f.scoped.sharedExpenses };
}

// ══ جدولُ «حسب اليوم» (§4.az) — مصدرٌ واحد للشاشة وExcel والطباعة ══════════
export interface DailyBreakdownRow {
  day: string; visits: number; patients: number;
  paid?: number; revenue?: number; corrections?: number; expenses?: number | null; net?: number | null;
}
export type DailyBreakdown =
  | { days: DailyBreakdownRow[]; total: Omit<DailyBreakdownRow, "day">; withMoney: boolean }
  | { tooLong: true; maxDays: number };

export const DAILY_TOTAL_LABEL = "المجموع";
export const DAILY_CORRECTIONS_LABEL = "التصحيحات والتخفيضات";
export const PATIENTS_ATTENDED_LABEL = "المرضى الذين حضروا";
/** يُكتب تحت الجدول: خانةُ المرضى في «المجموع» ليست جمعَ الأيام. */
export const DAILY_PATIENTS_TOTAL_NOTE = "المرضى في «المجموع» = عددُ المرضى المختلفين في الفترة — مَن حضر أكثرَ من يومٍ يُعدّ مرّة.";

/**
 *  رؤوسُ الجدول وصفوفُه — خلايا خام (رقمٌ أو `null` = لا ينفصل)، والمُخرِجُ يُنسّقها. وآخرُ صفّ «المجموع».
 *  وبلا صلاحية المال: اليومُ وعددُ الزيارات وحدهما.
 */
export function dailyBreakdownTable(
  d: Extract<DailyBreakdown, { days: DailyBreakdownRow[] }>,
  dayLabel: (day: string) => string,
): { head: string[]; rows: (string | number | null)[][]; moneyCols: number[] } {
  const money = d.withMoney;
  //  **المبيعاتُ إجماليّةً، والتصحيحاتُ عمودُها** (قرارُ المالك ٢٠٢٦-١٠-٠٣): تصحيحٌ كبير كان يجعل «المبيعات» سالبةً يوماً فيُقرأ خطأً.
  //  والاثنان معاً = المبيعاتُ الصافية في الملخّص المالي.
  const head = ["اليوم", ...(money ? ["الوارد (المقبوض)", "المبيعات (كلفة مسجَّلة)", DAILY_CORRECTIONS_LABEL, "المصاريف", "الصافي"] : []), "عدد الزيارات", PATIENTS_ATTENDED_LABEL];
  const cells = (label: string, r: Omit<DailyBreakdownRow, "day">) =>
    [label, ...(money ? [r.paid ?? 0, (r.revenue ?? 0) - (r.corrections ?? 0), r.corrections ?? 0, r.expenses ?? null, r.net ?? null] : []), r.visits, r.patients];
  return {
    head,
    rows: [...d.days.map((r) => cells(dayLabel(r.day), r)), cells(DAILY_TOTAL_LABEL, d.total)],
    moneyCols: money ? [1, 2, 3, 4, 5] : [],
  };
}
