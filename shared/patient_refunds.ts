// **استرجاعُ مبلغٍ لمريض — طلبٌ يعتمده المسؤول** (قرارُ المالك ٢٠٢٦-١١-٠٥، §4.fz): «اجعل في لوحة التحكم خياراً أضيفه لمن أريد فيصير قادراً
// على الاسترجاع — باعتمادي طبعاً»، و«الأفضل أن نجعل آليةَ استرجاعٍ كاملة … ولتكن عالمية».
//
// والآليةُ كما في أيّ محاسبة: **الاسترجاعُ حركةٌ مستقلّةٌ بسندها** — الدفعةُ الأصلية لا تُعدَّل ولا تُحذف، والمسترجَعُ صفٌّ سالبٌ في يوم
// الاعتماد بقيده (`recordRefundPaymentTx` — الكاتبُ الواحد للردّ)، وسندٌ مرقّمٌ يُطبع ويوقّعه المريض. ولا يُسترجَع أكثرُ من صافي ما دُفع للحالة.
// **وفي ذي قار** يقرّر المسؤولُ في كلّ استرجاع: أيُخصم من نسبة مستشفى العين (`shared/hospital_ratio.ts`).

export type RefundStatus = "pending" | "approved" | "rejected";
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "بانتظار اعتماد المسؤول",
  approved: "اعتُمد واستُرجع",
  rejected: "رُفض",
};

export const REFUND_REASONS = [
  { value: "stopped_treatment", label: "أوقف العلاج" },
  { value: "device_not_made", label: "جهاز لم يُصنع" },
  { value: "overpaid", label: "دفع زائد أو خطأ في الدفع" },
  { value: "other", label: "غير ذلك" },
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number]["value"];
export function refundReasonOf(raw: unknown): RefundReason | null {
  return REFUND_REASONS.some((r) => r.value === raw) ? (raw as RefundReason) : null;
}
export function refundReasonLabel(v: string | null | undefined): string {
  return REFUND_REASONS.find((r) => r.value === v)?.label ?? "—";
}

/** التفصيلُ إلزاميّ — ما الذي يُستردّ ولماذا. */
export const REFUND_DETAIL_MIN = 3;
export const REFUND_DETAIL_MAX = 500;
export const REFUND_DETAIL_ERROR = "اكتب تفصيل الاسترجاع — ما الذي يُستردّ ولماذا";
export const REFUND_EXCEEDS_ERROR = "المبلغ أكبر من صافي ما دفعه المريض لهذه الحالة";

/** أقسامُ الحالة كما تُكتب في `patient_cases.case_type`، وتسمياتُها. */
export const REFUND_CASE_LABELS: Record<string, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند",
  physiotherapy: "علاج طبيعي",
};

/**
 * مَن يطلب: حاملُ المفتاح («طلب استرجاع مبلغ لمريض» في نافذة المستخدم). **والمسؤولُ يسترجع مباشرةً** — طلبُه يُعتمد في الحال.
 */
export function canRequestRefund(s: { isAdmin?: unknown; permissions?: { canRequestRefund?: unknown } | null } | null | undefined): boolean {
  return s?.isAdmin === true || s?.permissions?.canRequestRefund === true;
}

/** رقمُ السند كما يُطبع — رقمُ الطلب نفسُه، فلا عدّادَ ثانٍ يتسابق. */
export function refundVoucherNo(id: number): string {
  return String(id);
}

/**
 * **أتنقص كلفةُ الحالة بالمبلغ نفسِه؟** — الاقتراحُ الذي يراه المسؤولُ مختاراً عند الاعتماد، وله أن يغيّره:
 * أوقف العلاجَ أو لم يُصنع جهازُه ⟵ نعم (ما لم يُقدَّم لا يُطالَب به، وإلّا صار المريضُ «مديناً» بما استُرجع)؛
 * ودفعٌ زائد ⟵ لا (الكلفةُ صحيحة والزائدُ يُردّ). و«غير ذلك» ⟵ لا، والمسؤولُ يقرّر.
 */
export function defaultReduceCost(reason: string | null | undefined): boolean {
  return reason === "stopped_treatment" || reason === "device_not_made";
}

// ══ **جلساتُ العلاج الطبيعي المُرجَعة** (ترحيل ١٩٣ — واقعةُ كرار ناصر ٢٠٢٦-١١-٠٧) ══════════════════════════════════════════════════
// استرجاعُ قسم العلاج الطبيعي يسأل «كم جلسةً تُرجَع من كلّ نوع» — صفرٌ مقبولٌ (دفعٌ زائد)، والحدُّ الباقي غيرُ المحضور لكلّ نوع ناقصاً
// المعلَّقَ في طلباتٍ أخرى. والاعتمادُ يطرحها من العدّاد: على صفّ الاسترجاع (`payments.returned_sessions`) أو من الخطّة لصاحبها.
export interface ReturnedSessions { treatmentType: string; sessionCount: number }
export const REFUND_SESSIONS_REQUIRED_ERROR = "اكتب كم جلسةً تُرجَع من كلّ نوع — صفرٌ إن لم تُرجَع جلسة";

/** يقرأ المُرسَل: مصفوفةٌ بأنواعٍ مكتوبة وأعدادٍ صحيحة غير سالبة، والصفرُ يُحذف — و`null` لغير المصفوفة. */
export function parseReturnedSessions(raw: unknown): ReturnedSessions[] | null {
  if (!Array.isArray(raw)) return null;
  const by = new Map<string, number>();
  for (const x of raw) {
    const t = String((x as any)?.treatmentType ?? "").trim();
    const n = Number((x as any)?.sessionCount);
    if (!t || !Number.isInteger(n) || n < 0 || n > 1000) return null;
    if (n > 0) by.set(t, (by.get(t) ?? 0) + n);
  }
  return Array.from(by, ([treatmentType, sessionCount]) => ({ treatmentType, sessionCount }));
}

export function returnedSessionsTotal(list: readonly ReturnedSessions[] | null | undefined): number {
  return (list ?? []).reduce((s, x) => s + (Number(x?.sessionCount) || 0), 0);
}

/** «٩ جلسات أجهزة علاج طبيعي · ٢ إبر صينية» — للبطاقة والسند وسجلّ التدقيق. */
export function returnedSessionsLine(list: readonly ReturnedSessions[] | null | undefined): string {
  const parts = (list ?? []).filter((x) => x.sessionCount > 0).map((x) => `${x.sessionCount} ${x.sessionCount === 1 ? "جلسة" : "جلسات"} ${x.treatmentType}`);
  return parts.length ? parts.join(" · ") : "لا جلسات";
}

// ══ **تنبيهاتُ العلاج الطبيعي — لا منع** (قرارُ المالك ٢٠٢٦-١١-١١، §4.gj) ══════════════════════════════════════════════════════════
// المنعُ الوحيد: لا يُرجَع أكثرُ ممّا دفعه المريض. وما سواه **تنبيهٌ أحمر** للموظّف وللمسؤول، والاعتمادُ قرارُه:
//   • المبلغُ أكثرُ من قيمة الجلسات الباقية — وسعرُ الجلسة **ممّا دفعه المريض** (صافي ما دُفع ÷ ما اشتراه من جلسات)، لا سعرُ النظام.
//   • عددُ الجلسات المُرجَعة أكثرُ من الباقي — والعدّادُ عند الاعتماد ينقص بالباقي وحده فلا ينزل تحت الصفر.
export interface PhysioRefundSessionRow { treatmentType: string; bought: number; remaining: number; pending: number; available: number }
export interface PhysioRefundGuide {
  /** صافي ما دفعه في القسم الآن. */ netPaid: number;
  /** ما اشتراه من جلسات (بعد ما أُرجع قبلُ). */ bought: number;
  /** الباقي غيرُ المحضور، بعد المعلَّق في طلباتٍ أخرى. */ available: number;
  /** سعرُ الجلسة ممّا دفعه — `null` حين لا جلسات مشتراة. */ perSession: number | null;
  /** قيمةُ الجلسات الباقية بسعر ما دفعه — الحدُّ الذي يُنبَّه فوقه. */ limit: number;
}
export function physioRefundGuide(netPaid: number, rows: readonly PhysioRefundSessionRow[] | null | undefined,
  /** الجلساتُ المُهداة — بلا مال، فلا تدخل في قسمة سعر الجلسة (مراجعةُ §4.gj). */ freeSessions = 0): PhysioRefundGuide {
  const list = rows ?? [];
  const all = list.reduce((s, r) => s + Math.max(0, Number(r.bought) || 0), 0);
  const free = Math.max(0, Math.floor(Number(freeSessions) || 0));
  //  المشترى بالمال وحده؛ وإن أكلت الهدايا العددَ كلَّه (بياناتٌ قديمة) يُقسم على الكلّ.
  const bought = all - free > 0 ? all - free : all;
  const available = list.reduce((s, r) => s + Math.max(0, Number(r.available) || 0), 0);
  const net = Math.max(0, Number(netPaid) || 0);
  const perSession = bought > 0 ? Math.round(net / bought) : null;
  //  الحدُّ = الباقي × سعرُ الجلسة كما يُعرض (فالمعادلةُ تجمع)، ولا يتجاوز ما دفعه.
  const limit = perSession != null ? Math.min(net, available * perSession) : 0;
  return { netPaid: net, bought, available, perSession, limit };
}
/** المبلغُ فوق قيمة الجلسات الباقية؟ — وبكم. */
export function refundOverSessionsValue(amount: number, guide: PhysioRefundGuide): number {
  return Math.max(0, Math.round(Number(amount) || 0) - guide.limit);
}
/** الأنواعُ التي طُلب إرجاعُ أكثرَ من الباقي منها — بالعدد المطلوب والباقي. */
export function sessionsOverRemaining(list: readonly ReturnedSessions[] | null | undefined,
  rows: readonly { treatmentType: string; available: number; pending?: number }[] | null | undefined): { treatmentType: string; asked: number; available: number; pending: number }[] {
  const out: { treatmentType: string; asked: number; available: number; pending: number }[] = [];
  for (const x of list ?? []) {
    const row = (rows ?? []).find((r) => r.treatmentType === x.treatmentType);
    const available = Math.max(0, Number(row?.available) || 0);
    if (x.sessionCount > available) out.push({ treatmentType: x.treatmentType, asked: x.sessionCount, available, pending: Math.max(0, Number(row?.pending) || 0) });
  }
  return out;
}
/** ما يُطرح فعلاً من العدّاد: لكلّ نوعٍ الأقلُّ من المطلوب والباقي — فلا ينزل العدّادُ تحت الصفر. */
export function clampReturnedSessions(list: readonly ReturnedSessions[] | null | undefined,
  rows: readonly { treatmentType: string; remaining: number }[] | null | undefined): ReturnedSessions[] {
  return (list ?? []).map((x) => {
    const remaining = Math.max(0, Number((rows ?? []).find((r) => r.treatmentType === x.treatmentType)?.remaining) || 0);
    return { treatmentType: x.treatmentType, sessionCount: Math.min(x.sessionCount, remaining) };
  }).filter((x) => x.sessionCount > 0);
}

/** نصُّ التنبيهات الحمراء — للنافذة والبطاقة وتلغرام بحرفٍ واحد. فارغةٌ حين لا تجاوز. */
export function physioRefundWarnings(amount: number, list: readonly ReturnedSessions[] | null | undefined,
  rows: readonly PhysioRefundSessionRow[] | null | undefined, netPaid: number, freeSessions = 0): string[] {
  const out: string[] = [];
  const g = physioRefundGuide(netPaid, rows, freeSessions);
  const over = refundOverSessionsValue(amount, g);
  if (over > 0) {
    out.push(g.bought > 0 && g.available > 0
      ? `المبلغ ${fmt(amount)} أكثر من قيمة الجلسات الباقية (${g.available} ${g.available === 1 ? "جلسة" : "جلسات"} × ${fmt(g.perSession ?? 0)} = ${fmt(g.limit)}) بـ${fmt(over)}`
      : `المبلغ ${fmt(amount)} ولا جلسات باقية غير محضورة للمريض`);
  }
  for (const x of sessionsOverRemaining(list, rows)) {
    out.push(`طُلب إرجاع ${x.asked} ${x.treatmentType} والباقي ${x.available}`
      + (x.pending > 0 ? ` (بعد ${x.pending} معلَّقة في طلبٍ آخر)` : "") + " — العدّاد ينقص بالباقي وحده");
  }
  return out;
}
const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US");

/** الاقتراحُ في النافذة: المبلغ ÷ سعرِ النوع، مقرَّباً للأسفل، ولا يتجاوز الباقي. */
export function suggestReturnedSessions(amount: number, price: number | null | undefined, remaining: number): number {
  if (!price || price <= 0 || !(amount > 0)) return 0;
  return Math.max(0, Math.min(remaining, Math.floor(amount / price)));
}

// ══ **«استمارة استرداد مبلغ»** (ترحيل ١٩٥، §4.gi — طلبُ المالك ٢٠٢٦-١١-١١ بتصميمه) ══════════════════════════════════════════════
// نافذةُ الطلب بشكل الاستمارة الورقية، وتُطبع بعد الاعتماد ليوقّعها المريض أو وليُّ أمره. اسمُ المرافق ورقمُ الجنسية يُحفظان وغيرُ إلزاميَّين.
export const REFUND_COMPANION_MAX = 120;
export const REFUND_NATIONAL_ID_MAX = 40;
export const REFUND_FORM_FIELD_ERROR = "اسم المرافق أو رقم الجنسية أطول من المسموح";
/** نصٌّ اختياريّ: فارغٌ ⟵ `null`، وأطولُ من الحدّ ⟵ `undefined` (يُردّ). */
export function optionalFormText(raw: unknown, max: number): string | null | undefined {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > max ? undefined : t;
}

/** **قبل الاعتماد لا طباعة** (قرارُ المالك): رسالةُ زرّ الطباعة لطلبٍ معلَّق. */
export const REFUND_PRINT_PENDING_MESSAGE = "تواصل مع الدكتور ياسر ليعتمد طلب الاسترجاع كي تتمكّن من طباعة الاستمارة.";

/** «نوع الاسترداد» في الاستمارة: علاجٌ طبيعي أم مساند وأطراف — من قسم الحالة. */
export function refundFormKind(caseType: string | null | undefined): "physio" | "devices" {
  return caseType === "physiotherapy" ? "physio" : "devices";
}

/** عاملُ تصغير «استمارة استرداد مبلغ» في طباعة المتصفّح (§4.gi — ملاحظة Codex على #732): ارتفاعُ الصفحة إلى عرضها، والصفحةُ ٢٩٤ × ٢١٠ مم على ورقةٍ بلا هامش (حشوتُها هامشُها)؛
 *  ما زاد يُصغَّر حتى يدخل ورقةً واحدة، وما دونه ١. النسبةُ لا تتغيّر بتكبير الشاشة على الهاتف. */
export const REFUND_PRINT_PAGE_RATIO = 294 / 210;
export function refundPrintFit(height: number, width: number): number {
  if (!(height > 0) || !(width > 0)) return 1;
  return Math.min(1, REFUND_PRINT_PAGE_RATIO / (height / width));
}
