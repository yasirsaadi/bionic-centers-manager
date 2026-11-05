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
