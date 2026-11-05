// **نسبةُ مستشفى العين — تُعزَل وحدها من كلّ وارد** (قرارُ المالك ٢٠٢٦-١١-٠٥، §4.fz): «نستخرج نسبة ١٠٪ من كلّ إيراد ولا نحتاج زرّ النسبة،
// ونضيف مربّعاً اسمه نسبة المستشفى فيه زرّ تسليمٍ للمستشفى … والسحبُ الأوّل يُسجَّل ضمن المصاريف والتسليمُ يُسجَّل في خلفية المربّع».
//
// • **من يوم البدء** (`HOSPITAL_AUTO_START` — «غداً يوم البدء»، والرصيدُ الأوّل صفر): لا زرّ — صفُّ مصروفٍ واحدٌ لكلّ يومٍ ودفترٍ (`hospital_percentage`)
//   يكتبه الخادمُ ويحدّثه وحده من وارد اليوم (`server/hospital_ratio/store.ts`)، فيدخل القاصةَ والمحاسبةَ كأيّ مصروف. **وما قبله كما كان**: الزرُّ وأسطرُه.
// • **الاسترجاعُ** (§4.fz): مريضٌ استرجع — المسؤولُ يقرّر في كلّ استرجاعٍ «هل يُخصم من نسبة المستشفى». فالخصمُ عُشرُ المسترجَع،
//   وما زاد على نسبة يومه **يُحمل على الأيّام التالية** — فلا مصروفَ سالب ولا مربّعَ تحت الصفر، ومجموعُ ما عُزل عُشرُ الصافي.
// • **المربّعُ** يُعرض في دفتر «علاج طبيعي» لذي قار: عزلُ العلاج وعزلُ الأطراف والمجموع — والتسليمُ للمستشفى طلبٌ يعتمده المسؤول.
import { ratioAmount } from "./cash_book";

/** أوّلُ يومٍ للعزل التلقائيّ (قرارُ المالك ٢٠٢٦-١١-٠٥: «غداً يوم البدء»). */
export const HOSPITAL_AUTO_START_DEFAULT = "2026-11-06";
/**
 * **وفي الاختبار وحده** يُقدَّم يومُ البدء (`HOSPITAL_AUTO_START_TEST`) — فتُختبَر أيّامٌ تلقائية قبل أن يحلّ اليومُ الحقيقيّ.
 * ولا يُقرأ في الإنتاج (`NODE_ENV=production`) ولا في المتصفّح (لا `process` فيه).
 */
const TEST_START = typeof process !== "undefined" && process.env?.NODE_ENV !== "production" ? process.env?.HOSPITAL_AUTO_START_TEST : undefined;
export const HOSPITAL_AUTO_START = TEST_START && /^\d{4}-\d{2}-\d{2}$/.test(TEST_START) ? TEST_START : HOSPITAL_AUTO_START_DEFAULT;
export const HOSPITAL_NAME = "مستشفى العين";
export const HOSPITAL_BOX_LABEL = "نسبة مستشفى العين";

/** أهذا اليومُ يومُ عزلٍ تلقائيّ؟ — وما قبله يبقى بزرّه وأسطرِه كما كان. */
export function hospitalAutoApplies(day: string): boolean {
  return day >= HOSPITAL_AUTO_START;
}

/** واردُ يومٍ من دفترٍ كما يحتاجه العزل: الموجبُ (دفعاتٌ ووارد آخر)، والمسترجَعُ الذي يُخصم من النسبة (موجباً). */
export interface HospitalDayInput { day: string; positive: number; deducted: number }
export interface HospitalDayRow extends HospitalDayInput {
  /** عُشرُ الموجب. */
  gross: number;
  /** عُشرُ المسترجَع المخصوم. */
  deduction: number;
  /** ما بقي من خصمٍ أكبرَ من نسبة الأيّام السابقة. */
  carriedIn: number;
  /** ما يُكتب مصروفاً لليوم — لا أقلّ من صفر. */
  amount: number;
  /** ما يُحمل على الغد. */
  carriedOut: number;
}

/**
 * **سلسلةُ العزل** لدفترٍ واحد — الأيّامُ مرتّبةً تصاعدياً، ويومٌ لا وارد فيه ولا استرجاع يمكن ألّا يُمرَّر.
 * لكلّ يوم: المبلغ = عُشرُ الموجب − عُشرُ المخصوم − المحمول من أمس، ولا ينزل تحت الصفر؛ والباقي يُحمل.
 */
export function hospitalSeries(days: readonly HospitalDayInput[], pct: number | null): HospitalDayRow[] {
  const out: HospitalDayRow[] = [];
  let carry = 0;
  for (const d of days) {
    const gross = ratioAmount(d.positive, pct);
    const deduction = ratioAmount(d.deducted, pct);
    const net = gross - deduction - carry;
    const row: HospitalDayRow = {
      ...d, gross, deduction, carriedIn: carry, amount: Math.max(0, net), carriedOut: Math.max(0, -net),
    };
    carry = row.carriedOut;
    out.push(row);
  }
  return out;
}

/** مربّعُ نسبة المستشفى: الباقي من أمس + ما عُزل اليوم − ما سُلّم اليوم. */
export function hospitalBox(prev: number, todayIn: number, deliveredToday: number) {
  return { prev, today: todayIn, delivered: deliveredToday, remaining: prev + todayIn - deliveredToday };
}

export type HospitalDeliveryStatus = "pending" | "approved" | "rejected";
export const HOSPITAL_DELIVERY_STATUS_LABELS: Record<HospitalDeliveryStatus, string> = {
  pending: "بانتظار اعتماد المسؤول",
  approved: "اعتُمد وسُلّم",
  rejected: "رُفض",
};
export const DELIVERY_NOTE_MAX = 500;
/** خطأ «المبلغُ أكبر من المتبقّي» — لا يُسلَّم للمستشفى أكثرُ ممّا عُزل له. */
export const DELIVERY_EXCEEDS_ERROR = "المبلغ أكبر من المتبقّي للمستشفى";
/** صفُّ عزلٍ يكتبه الخادمُ في يومٍ تلقائيّ — لا يُعدَّل ولا يُحذف باليد (يعيده المطابِقُ كما كان). */
export function isAutoHospitalRow(x: { category?: string | null; expenseDate?: string | Date | null }): boolean {
  if (x.category !== "hospital_percentage" || !x.expenseDate) return false;
  const day = x.expenseDate instanceof Date ? x.expenseDate.toISOString().slice(0, 10) : String(x.expenseDate).slice(0, 10);
  return hospitalAutoApplies(day);
}
export const HOSPITAL_AUTO_ERROR = "نسبة مستشفى العين تُعزل تلقائياً من وارد اليوم — لا تُضاف بزرّ";
