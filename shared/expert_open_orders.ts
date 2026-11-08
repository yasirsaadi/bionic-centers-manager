// **الحالاتُ غيرُ المكتملة لكلّ خبير** (§4.gc — طلبُ المالك ٢٠٢٦-١١-٠٨: «مستقبلاً لا حاجةَ لنيون»).
//
// قاعدةٌ واحدة يقرؤها جدولُ «مقارنة الخبراء» في الخادم (`getOverview`) وورقةُ الطباعة في الواجهة، فلا يقول الجدولُ
// رقماً وتقول الورقةُ غيرَه:
//   · **غيرُ مكتملة** — لا مكتملة ولا ملغاة.
//   · **بعذر** — عليها سببُ توقّفٍ مكتوب (`writtenHoldExcuse` — قاعدةُ «متأخرة بعذر» نفسُها).
//   · **بلا موعد** — لم يُحدَّد موعدُ التسليم بعد (يُحدَّد عند القالب، §4.bj).
//   · **فات موعدها** — موعدُها قبل اليوم بتقويم بغداد.
//   · **راكدة** — بلا موعدٍ ولا عذرٍ مكتوب، ومضى على إسنادها `STALE_NO_DATE_DAYS` يوماً فأكثر: لا تظهر «متأخّرة» في أيّ
//     شاشة لأنّ التأخّرَ يُقاس من الموعد، وهي أحقُّ ما يُتابَع.
// والإسنادُ تاريخُ إنشاء الأمر (`assignedAt` في القائمة = `created_at`).
import { writtenHoldExcuse } from "./manufacturing";

export const STALE_NO_DATE_DAYS = 21;

export interface OpenOrderInput {
  status: string;
  expectedDeliveryDate: string | Date | null | undefined;
  holdReasonCode: string | null | undefined;
  assignedAt: string | Date | null | undefined;
}

export interface OpenOrderClass {
  excused: boolean;
  noDate: boolean;
  late: boolean;
  stale: boolean;
  /** أيّامٌ منذ الإسناد بتقويم بغداد — `null` بلا تاريخ. */
  daysSinceAssigned: number | null;
  /** أيّامٌ حتى الموعد (سالبٌ إن فات) — `null` بلا موعد. */
  daysToDue: number | null;
}

export function isOpenOrderStatus(status: string): boolean {
  return status !== "completed" && status !== "cancelled";
}

/** يومُ بغداد `YYYY-MM-DD` — من نصّ تاريخٍ كما هو، ومن لحظةٍ بتوقيت بغداد. */
export function baghdadDayOf(v: string | Date | null | undefined): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** الأيّامُ من `from` إلى `to` (يومان بتقويم بغداد). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** تصنيفُ أمرٍ غيرِ مكتمل — `null` للمكتمل والملغى. */
export function classifyOpenOrder(o: OpenOrderInput, today: string): OpenOrderClass | null {
  if (!isOpenOrderStatus(o.status)) return null;
  const due = baghdadDayOf(o.expectedDeliveryDate);
  const assigned = baghdadDayOf(o.assignedAt);
  const excused = writtenHoldExcuse(o.holdReasonCode) !== null;
  const daysSinceAssigned = assigned ? Math.max(0, daysBetween(assigned, today)) : null;
  const daysToDue = due ? daysBetween(today, due) : null;
  return {
    excused,
    noDate: !due,
    late: daysToDue !== null && daysToDue < 0,
    stale: !due && !excused && daysSinceAssigned !== null && daysSinceAssigned >= STALE_NO_DATE_DAYS,
    daysSinceAssigned,
    daysToDue,
  };
}

export interface OpenOrdersSummary {
  open: number;
  excused: number;
  unexcused: number;
  noDate: number;
  late: number;
  stale: number;
}

export function emptyOpenSummary(): OpenOrdersSummary {
  return { open: 0, excused: 0, unexcused: 0, noDate: 0, late: 0, stale: 0 };
}

/** يضيف أمراً إلى الملخّص — المكتملُ والملغى لا يُعدّان. */
export function addToOpenSummary(s: OpenOrdersSummary, o: OpenOrderInput, today: string): void {
  const c = classifyOpenOrder(o, today);
  if (!c) return;
  s.open++;
  if (c.excused) s.excused++; else s.unexcused++;
  if (c.noDate) s.noDate++;
  if (c.late) s.late++;
  if (c.stale) s.stale++;
}

export function summarizeOpenOrders(list: readonly OpenOrderInput[], today: string): OpenOrdersSummary {
  const s = emptyOpenSummary();
  for (const o of list) addToOpenSummary(s, o, today);
  return s;
}
