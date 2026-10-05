// **القالبُ الاختباري** (قرارُ المالك ٢٠٢٦-١٠-٠٥، ترحيل ٠٩٧، §4.bz) — القواعدُ الخالصة في موضعٍ واحد،
// يقرؤها الخادمُ (الحارسُ الأخير) والشاشاتُ معاً.
//
// الخبيرُ في «جاهز للتجربة والتسليم» يسلّم قالباً اختبارياً لا الجهاز: الأمرُ يتوقّف «بانتظار المريض» بسببٍ خاصّ،
// ومعه موعدُ القالب النهائي. والاستعلاماتُ **وحدها** تتّصل بالمريض حوله، وحين يعود يعود الأمرُ نفسُه إلى خبيره.

export const TRIAL_SOCKET_REASON = "trial_socket";
export const TRIAL_SOCKET_LABEL = "تسليم قالب اختباري";
export const TRIAL_RETURN_LABEL = "أتى للقالب النهائي";
export const TRIAL_RETURN_HINT = "يعود أمرُ التصنيع نفسُه إلى الخبير — بلا أمرٍ جديد ولا مال";
/** أطولُ مدى لموعد القالب النهائي — سنةٌ تكفي، وأبعدُ منها خطأُ إدخال. */
export const TRIAL_MAX_DAYS = 365;

export const TRIAL_DATE_ERROR = "موعد القالب النهائي إلزامي — من اليوم إلى سنة";
export const TRIAL_NOT_ELIGIBLE_ERROR = "القالب الاختباري لأمر تصنيع طرفٍ أوّلي في مرحلة «جاهز للتجربة والتسليم» وحدها";
export const TRIAL_ALREADY_AWAITING_ERROR = "القالب الاختباري مسلَّم — الأمر بانتظار عودة المريض للقالب النهائي";
export const TRIAL_NOT_AWAITING_ERROR = "هذا الأمر ليس بانتظار القالب النهائي — حدّث الصفحة";
export const TRIAL_CALL_NOTE_ERROR = "اكتب نتيجة الاتصال";

/** «بانتظار القالب النهائي» — تعريفٌ واحد: توقّفٌ بانتظار المريض بسبب القالب الاختباري. */
export function isTrialAwaiting(o: { status: string | null | undefined; holdReasonCode: string | null | undefined }): boolean {
  return o.status === "waiting_patient" && o.holdReasonCode === TRIAL_SOCKET_REASON;
}

/** هل يُسلَّم قالبٌ اختباريّ على هذا الأمر الآن؟ (بناءٌ أوّلي لطرف، في «جاهز للتجربة والتسليم»، غيرُ منتهٍ ولا منتظِر.) */
export function canDeliverTrialSocket(o: {
  purpose: string | null | undefined; serviceType: string | null | undefined;
  currentStage: string | null | undefined; status: string | null | undefined; holdReasonCode?: string | null;
}): boolean {
  if (o.purpose !== "initial_build" || o.serviceType !== "prosthetic") return false;
  if (o.currentStage !== "ready_for_fitting") return false;
  if (o.status === "completed" || o.status === "cancelled") return false;
  return !isTrialAwaiting({ status: o.status, holdReasonCode: o.holdReasonCode ?? null });
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** موعدٌ صالح: `YYYY-MM-DD` حقيقيّ من اليوم إلى `TRIAL_MAX_DAYS`. */
export function isValidTrialDate(v: unknown, today: string): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  if (addDays(v, 0) !== v) return false; // ٢٠٢٦-٠٢-٣٠ ليس يوماً
  return v >= today && v <= addDays(today, TRIAL_MAX_DAYS);
}

/**
 * **متى يُطلَب الاتصال** — من الموعد وآخر اتّصال وحدهما، بلا عدّادٍ مخزَّن:
 * - `before`: من اليوم السابق للموعد إلى يومه، ولم يُتَّصل منذ ذلك اليوم السابق — «ذكّره بموعده».
 * - `missed`: مضى الموعد ولم يعد، ولم يُتَّصل بعده — «فاته موعده».
 * - `null`: لا اتّصال مطلوب الآن.
 * وتسجيلُ الاتصال يطلب موعداً جديداً، فتبدأ الدورةُ من جديد عليه.
 */
export type TrialCallState = "before" | "missed" | null;
export function trialCallState(finalDate: string | null | undefined, lastCallDay: string | null | undefined, today: string): TrialCallState {
  if (!finalDate) return null;
  const dayBefore = addDays(finalDate, -1);
  if (today > finalDate) return !lastCallDay || lastCallDay <= finalDate ? "missed" : null;
  if (today >= dayBefore) return !lastCallDay || lastCallDay < dayBefore ? "before" : null;
  return null;
}

export const TRIAL_CALL_STATE_LABELS: Record<Exclude<TrialCallState, null>, string> = {
  before: "ذكّره بموعده",
  missed: "فاته موعده — اتّصل به",
};

/** أوامرُ المريض التي تنتظر القالبَ النهائي — من قائمة `/api/manufacturing/patient/:id/orders` كما هي، وبقسمٍ إن طُلب. */
export function trialAwaitingOrders<T extends { trialAwaiting?: boolean; serviceType?: string | null }>(
  orders: readonly T[] | null | undefined, serviceType?: string,
): T[] {
  return (orders ?? []).filter((o) => o.trialAwaiting === true && (!serviceType || o.serviceType === serviceType));
}
