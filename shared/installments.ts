// **نظامُ الأقساط** (قرارُ المالك ٢٠٢٦-١٠-١٤، §4.ea) — القواعدُ الصرفة، مصدرٌ واحد للخادم والواجهة والاختبار.
//
// الخطّةُ تُفتح مع دفعة (علامةُ «هذا المريض أقساط» في نافذة الدفعة) على **قسمٍ واحد** من أقسام المريض:
//   • المبلغُ الكلّيّ = دينُ القسم بعد تلك الدفعة، والقسطُ الشهريّ يكتبه الموظّف، فعددُ الأقساط مشتقّ (`installmentCount`).
//   • المواعيدُ شهريةٌ من تاريخ أوّل قسط، باليوم نفسِه من كلّ شهر (وآخرُ الشهر حين لا يوجد اليوم — ٣١ ⟵ ٣٠ أو ٢٨).
//   • **ما دُفع للخطّة** = كلُّ دفعةٍ على القسم نفسِه بعد الدفعة التي فتحتها — أيُّ دفعةٍ، من أيّ باب، تُحسب على الأقساط بلا بابٍ جديد.
//   • القسطُ رقم ن «مدفوع» حين يبلغ ما دُفع مجموعَ الأقساط حتى ن؛ و«متأخّر» حين يمرّ يومُه (قبل اليوم) ولم يبلغه.
//   • والتذكيرُ (قرارُ المالك): قبل الموعد بيوم وفي يومه، في الساعة التي يختارها الموظّف بتوقيت بغداد — للاستقبال ومدير الفرع والمريض.

export type ReminderKind = "before" | "due";
export const REMINDER_KINDS: readonly ReminderKind[] = ["before", "due"];

export interface InstallmentInput {
  monthlyAmount: number;
  firstDueDate: string;
  reminderTime: string;
  guarantorName: string | null;
  guarantorPhone: string | null;
  notes: string | null;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isYmd(v: unknown): v is string {
  if (typeof v !== "string" || !YMD.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};

/** الشهرُ التالي باليوم نفسِه، وآخرُ الشهر حين لا يوجد اليوم فيه. */
export function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function installmentCount(total: number, monthly: number): number {
  if (!(total > 0) || !(monthly > 0)) return 0;
  return Math.ceil(total / monthly);
}

export function dueDates(firstDueDate: string, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => addMonthsYmd(firstDueDate, i));
}

/**
 * ما يكتبه الموظّف في نافذة الدفعة (أو المديرُ في التعديل) ⟵ قيمٌ نظيفة أو رسالةُ خطأٍ عربية.
 * `partial` للتعديل: ما لم يُرسَل لا يُطلب.
 */
export function parseInstallmentInput(
  raw: any, todayYmd: string, opts: { partial?: boolean } = {},
): { ok: true; value: Partial<InstallmentInput> } | { ok: false; error: string } {
  const r = raw ?? {};
  const out: Partial<InstallmentInput> = {};
  const has = (k: string) => r[k] !== undefined;
  if (!opts.partial || has("monthlyAmount")) {
    const n = Number(String(r.monthlyAmount ?? "").replace(/[,\s٬]/g, ""));
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "اكتب القسط الشهري رقماً صحيحاً أكبر من صفر" };
    out.monthlyAmount = n;
  }
  if (!opts.partial || has("firstDueDate")) {
    if (!isYmd(r.firstDueDate)) return { ok: false, error: "اختر تاريخ القسط الأوّل" };
    //  التعديلُ قد يُبقي تاريخاً مضى (خطّةٌ بدأت قبل شهور)؛ والفتحُ لا يبدأ بموعدٍ مضى.
    if (!opts.partial && r.firstDueDate < todayYmd) return { ok: false, error: "تاريخ القسط الأوّل لا يكون قبل اليوم" };
    if (r.firstDueDate > addMonthsYmd(todayYmd, 12)) return { ok: false, error: "تاريخ القسط الأوّل أبعد من سنة — راجعه" };
    out.firstDueDate = r.firstDueDate;
  }
  if (!opts.partial || has("reminderTime")) {
    const t = typeof r.reminderTime === "string" && r.reminderTime ? r.reminderTime : opts.partial ? "" : "10:00";
    if (!HHMM.test(t)) return { ok: false, error: "اكتب ساعة التذكير بصيغة ١٠:٠٠" };
    out.reminderTime = t;
  }
  if (!opts.partial || has("guarantorName")) out.guarantorName = text(r.guarantorName, 120);
  if (!opts.partial || has("guarantorPhone")) {
    const p = text(r.guarantorPhone, 30);
    if (p && !/^[+\d\s٠-٩-]{6,30}$/.test(p)) return { ok: false, error: "هاتف الكفيل أرقامٌ فقط" };
    out.guarantorPhone = p;
  }
  if (!opts.partial || has("notes")) out.notes = text(r.notes, 500);
  return { ok: true, value: out };
}

export interface PlanFiguresInput {
  totalAmount: number;
  installmentAmount: number;
  firstDueDate: string;
  /** ما دُفع على القسم بعد الدفعة التي فتحت الخطّة. */
  paidToward: number;
  today: string;
}

export interface PlanFigures {
  count: number;
  /** الأقساطُ التي بلغها ما دُفع كاملةً. */
  paidCount: number;
  paidToward: number;
  remaining: number;
  /** القسطُ التالي غيرُ المكتمل — `null` حين اكتملت. */
  nextIndex: number | null;
  nextDueDate: string | null;
  /** ما بقي من القسط التالي (قد يكون جزءاً منه إن دُفع بعضُه). */
  nextAmount: number;
  /** الأقساطُ التي مرّ يومُها (قبل اليوم) ولم تكتمل. */
  overdueCount: number;
  overdueAmount: number;
  completed: boolean;
  dates: string[];
}

/** مجموعُ الأقساط حتى القسط رقم i (من صفر) — والأخيرُ ما بقي من المبلغ الكلّيّ. */
export function cumulativeDue(i: number, total: number, monthly: number): number {
  return Math.min(total, (i + 1) * monthly);
}

export function planFigures(p: PlanFiguresInput): PlanFigures {
  const count = installmentCount(p.totalAmount, p.installmentAmount);
  const dates = dueDates(p.firstDueDate, count);
  const paid = Math.max(0, p.paidToward);
  let paidCount = 0;
  while (paidCount < count && paid >= cumulativeDue(paidCount, p.totalAmount, p.installmentAmount)) paidCount++;
  const completed = paid >= p.totalAmount || count === 0;
  const nextIndex = completed ? null : paidCount;
  const pastDue = dates.filter((d) => d < p.today).length;
  const overdueAmount = pastDue > 0 ? Math.max(0, cumulativeDue(pastDue - 1, p.totalAmount, p.installmentAmount) - paid) : 0;
  return {
    count, paidCount, paidToward: paid, remaining: Math.max(0, p.totalAmount - paid),
    nextIndex, nextDueDate: nextIndex === null ? null : dates[nextIndex],
    nextAmount: nextIndex === null ? 0 : cumulativeDue(nextIndex, p.totalAmount, p.installmentAmount) - paid,
    overdueCount: completed ? 0 : Math.max(0, pastDue - paidCount),
    overdueAmount: completed ? 0 : overdueAmount,
    completed, dates,
  };
}

/** لحظةُ التذكير: يومٌ وساعةٌ بتوقيت بغداد (UTC+3 بلا توقيتٍ صيفيّ) ⟵ لحظةٌ مطلقة. */
export function baghdadMoment(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 3, mm));
}

/** نافذةُ الإرسال: تذكيرٌ فات وقتُه بأكثر من يوم (الخادمُ كان متوقّفاً) لا يُرسَل متأخّراً. */
export const REMINDER_WINDOW_MS = 24 * 3600_000;

/**
 * التذكيراتُ المستحقّة الآن لخطّة: لكلّ قسطٍ لم يكتمل — قبل يومه بيوم، وفي يومه — في الساعة المختارة،
 * إن حلّ وقتُه ولم يمضِ عليه يوم، **ولم يسبق فتحَ الخطّة** (خطّةٌ تُفتح بعد الساعة لا تُرسل تذكيراً عن لحظةٍ قبلها).
 */
export function remindersDue(p: PlanFiguresInput & { reminderTime: string; now: Date; createdAt: Date }): { index: number; kind: ReminderKind; dueDate: string }[] {
  const f = planFigures(p);
  if (f.completed) return [];
  const out: { index: number; kind: ReminderKind; dueDate: string }[] = [];
  for (let i = f.paidCount; i < f.count; i++) {
    const due = f.dates[i];
    for (const kind of REMINDER_KINDS) {
      const at = baghdadMoment(kind === "before" ? addDaysYmd(due, -1) : due, p.reminderTime);
      if (at.getTime() <= p.now.getTime() && p.now.getTime() - at.getTime() < REMINDER_WINDOW_MS && at.getTime() >= p.createdAt.getTime()) {
        out.push({ index: i, kind, dueDate: due });
      }
    }
    //  الأقساطُ بعد الأولى غير المكتملة مواعيدُها أبعد بشهرٍ فأكثر — لا يحلّ تذكيرُها الآن إلّا إن حلّ تذكيرُ ما قبلها.
    if (due > addDaysYmd(p.today, 1)) break;
  }
  return out;
}

export const dmy = (ymd: string | null | undefined) => (ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : "");
export const money = (n: number) => Math.round(n).toLocaleString("en-US");
