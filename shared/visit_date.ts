// **تاريخُ الزيارة — قاعدةٌ واحدة للشاشة والخادم** (§4.ar البند ٢٦ — قرارُ المالك ٢٠٢٦-٠٩-٢٩).
//
// «وضع قيد زيارات ان تاخر ٣ ايام بان تخبر الموظف ان اكثر من ٣ ايام هي اضافة من صلاحية المسؤول فقط اي امنعها عن الموظف
//  لكن اتركها للمسؤول العام فقط». فالقاعدة:
//   · يومٌ **لم يأتِ بعد** ⟵ مرفوضٌ للجميع (زيارةٌ لم تقع لا تُعَدّ جلسةً في يومٍ مقبل)؛
//   · اليومُ وحتى **٣ أيامٍ قبله** ⟵ للموظّف كما كان؛
//   · **أقدمُ من ٣ أيام** ⟵ للمسؤول العام وحده.
// والأيامُ أيامُ بغداد (`YYYY-MM-DD`)، وفارغٌ = اليوم.

export const VISIT_BACKDATE_STAFF_DAYS = 3;
export const VISIT_FUTURE_MESSAGE = "لا يمكن تسجيل زيارة بتاريخ لم يأتِ بعد";
export const VISIT_BACKDATE_MESSAGE =
  `تسجيل زيارة أقدم من ${VISIT_BACKDATE_STAFF_DAYS} أيام من صلاحية المسؤول العام فقط — راجع المسؤول`;

/** يومُ بغداد الآن `YYYY-MM-DD`. */
export function baghdadTodayYmd(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** كم يوماً بين تاريخين `YYYY-MM-DD` (الثاني ناقص الأوّل). */
function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
    - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

export type VisitDateVerdict = { ok: true } | { ok: false; status: 400 | 403; message: string };

export function checkVisitDate(
  customDate: string | null | undefined, isAdmin: boolean, today: string = baghdadTodayYmd(),
): VisitDateVerdict {
  if (!customDate) return { ok: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate)) return { ok: false, status: 400, message: "تاريخ الزيارة غير صالح" };
  const back = daysBetween(customDate, today);
  if (back < 0) return { ok: false, status: 400, message: VISIT_FUTURE_MESSAGE };
  if (back > VISIT_BACKDATE_STAFF_DAYS && !isAdmin) return { ok: false, status: 403, message: VISIT_BACKDATE_MESSAGE };
  return { ok: true };
}

/**
 * **لحظةٌ في يومٍ سابق بساعة الآن** — كما تفعل `storage.createVisit` للزيارة المؤرَّخة سلفاً بحرفها: التاريخُ المختار
 * والساعةُ الحاليّة بتوقيت بغداد. يُعيد اللحظةَ (`at`) ونصَّها بتوقيت بغداد بلا منطقة (`wall`) — وهو الشكلُ الذي يقرؤه
 * كاتبُ الدفعات (`insertPaymentRow`) صحيحاً. واليومُ نفسُه ⟵ الآن بلا تعديل. (§4.ar — التسجيلُ بتاريخٍ قديم، ٢٠٢٦-٠٩-٣٠)
 */
export function baghdadMomentOn(ymd: string, now: Date = new Date()): { at: Date; wall: string } {
  const offset = 3 * 60 * 60 * 1000;
  const b = new Date(now.getTime() + offset);
  const [y, m, d] = ymd.split("-").map(Number);
  const wallUtc = new Date(Date.UTC(y, m - 1, d, b.getUTCHours(), b.getUTCMinutes(), b.getUTCSeconds()));
  return { at: new Date(wallUtc.getTime() - offset), wall: wallUtc.toISOString().slice(0, 19) };
}
