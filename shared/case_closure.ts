// **الحالةُ ذاتُ التاريخ تُغلَق ولا تُهدَم** — قواعدُ الإغلاق والاسترجاع،
// **منطقٌ خالص** بلا شبكة ولا قاعدة بيانات فيُختبَر وحده ويقرؤه الطرفان.
//
// ══ القاعدةُ الحاكمة ══════════════════════════════════════════════════════
// الهدمُ الفيزيائيّ بابُه **السقالةُ وحدها** (`patient_cases/disposal.ts`):
// صفوفٌ فتحها التطبيقُ تلقائياً ولم يستعملها أحد. أمّا حالةٌ اكتسبت تاريخاً
// — معاينةً موقّعة، أو تصنيعاً، أو تسليماً، أو صيانةً، أو مالاً قُبض — فسحبُها
// من العمل **إغلاقٌ لا محو**: `patient_cases.status = 'closed'`، فتخرج من
// طوابير الطبيب والتصنيع والعدّادات، **ويبقى كلُّ صفٍّ تابعٍ كما هو بايتاً**.
//
// ══ والمالُ يُعكَس بقيدٍ معاكس، لا بتحريرِ ما وقع ═══════════════════════════
// الدفعةُ الأصلية **لا تُعدَّل ولا تُحذف أبداً**. والمستردُّ يُسجَّل **حركةً
// ماليّةً مستقلّة** بالسالب، فينقص صافي المقبوض والوارد والإيراد بمقداره
// بالضبط — والتاريخُ يبقى يقول: قُبض كذا يومَ كذا، ثمّ رُدّ كذا يومَ كذا.

/** خدماتُ الحالة الثلاث — نفسُ مفردات `patient_cases.case_type`. */
export type ClosureServiceType = "prosthetic" | "medical_support" | "physiotherapy";

/** ماذا يقع للمال عند الإغلاق — مُشتقٌّ من الرقمين، لا يُرسَل من العميل. */
export type ClosureRefundKind =
  /** لا مالَ على الحالة أصلاً — لا سؤالَ ماليّ يُطرَح. */
  | "no_money"
  /** رُدّ كلُّ المقبوض. */
  | "full_refund"
  /** رُدّ بعضُه واحتُفظ بالباقي. */
  | "partial_refund"
  /** لم يُردّ شيء — احتُفظ بالكامل. */
  | "no_refund";

export interface ClosureMoney {
  /** مجموعُ دفعات هذه الحالة **بما فيها الاستردادات السابقة** (بالسالب). */
  netPaid: number;
  /** ما يُردّ الآن — موجبٌ أو صفر. */
  refundAmount: number;
  /** ما يبقى للمركز بعد هذا الاسترداد. */
  retainedAmount: number;
  kind: ClosureRefundKind;
}

/**
 * **الصافي هو الحدّ، لا مجموعُ الدفعات الموجبة.** الاستردادُ السابق صفٌّ
 * سالبٌ في الجدول نفسِه، فقراءةُ المجموع تمنع بنيوياً أن يُردَّ المبلغُ
 * مرّتين بإغلاقين متتاليين — ولا عدّادَ ثانٍ يُخترَع ليُحفَظ متزامناً.
 */
export function computeClosureMoney(netPaid: number, refundAmount: number): ClosureMoney {
  const net = Math.trunc(netPaid);
  const refund = Math.trunc(refundAmount);
  const retained = net - refund;
  const kind: ClosureRefundKind = net <= 0
    ? "no_money"
    : refund <= 0
      ? "no_refund"
      : refund >= net
        ? "full_refund"
        : "partial_refund";
  return { netPaid: net, refundAmount: refund, retainedAmount: retained, kind };
}

// ── الرسائل — نصٌّ واحد يقرؤه الخادمُ والشاشةُ والاختبار ──────────────────
export const CLOSURE_MESSAGES = {
  refundNotInteger: "مبلغ الاسترجاع يجب أن يكون رقماً صحيحاً بالدينار.",
  refundNegative: "مبلغ الاسترجاع لا يكون سالباً — اتركه صفراً إن لم يُردّ شيء.",
  /** **الرفضُ يسمّي الرقمين** فيعرف الموظّف كم يملك أن يردّ فعلاً. */
  refundOverNet: (net: number, asked: number) =>
    `مبلغ الاسترجاع (${asked.toLocaleString()} د.ع) أكبر من صافي المقبوض على هذه الحالة`
    + ` (${net.toLocaleString()} د.ع) — لا يُردّ أكثر ممّا قُبض.`,
  refundWithoutMoney:
    "لا يوجد مبلغ مقبوض على هذه الحالة — لا استرجاع يُسجَّل.",
  reasonRequired: "سبب الإغلاق إلزامي.",
  refundReasonRequired: "سبب الاسترجاع إلزامي عند ردّ مبلغ.",
  retainedReasonRequired:
    "سبب الاحتفاظ بالمبلغ المتبقّي إلزامي — يُقرأ في التدقيق بعد أشهر.",
} as const;

export interface ClosureRequest {
  reason: unknown;
  refundAmount?: unknown;
  refundReason?: unknown;
  retainedReason?: unknown;
}

export interface ParsedClosure {
  reason: string;
  money: ClosureMoney;
  refundReason: string | null;
  retainedReason: string | null;
}

export type ClosureParse =
  | { ok: true; value: ParsedClosure }
  | { ok: false; message: string };

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * **التحقّقُ كلُّه قبل أيّ كتابة.** يُنادى في الخادم بـ`netPaid` المقروء
 * **تحت القفل** — لا بالرقم الذي عرضته الشاشة قبل دقيقة.
 */
export function parseClosureRequest(netPaid: number, req: ClosureRequest): ClosureParse {
  const reason = text(req.reason);
  if (!reason) return { ok: false, message: CLOSURE_MESSAGES.reasonRequired };

  const rawRefund = req.refundAmount;
  //  الغيابُ يعني صفراً صريحاً — لا استرجاع. وأيُّ شكلٍ آخر يُرفَض ولا
  //  يُقرأ صفراً بصمت: رقمٌ مشوَّه يصير «لم يُردّ شيء» يكتب تاريخاً كاذباً.
  let refund = 0;
  if (rawRefund !== undefined && rawRefund !== null && rawRefund !== "") {
    const n = typeof rawRefund === "number" ? rawRefund : Number(rawRefund);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, message: CLOSURE_MESSAGES.refundNotInteger };
    }
    if (n < 0) return { ok: false, message: CLOSURE_MESSAGES.refundNegative };
    refund = n;
  }

  const net = Math.trunc(netPaid);
  if (refund > 0 && net <= 0) {
    return { ok: false, message: CLOSURE_MESSAGES.refundWithoutMoney };
  }
  if (refund > net) {
    return { ok: false, message: CLOSURE_MESSAGES.refundOverNet(net, refund) };
  }

  const money = computeClosureMoney(net, refund);
  const refundReason = text(req.refundReason) || null;
  const retainedReason = text(req.retainedReason) || null;

  if (money.refundAmount > 0 && !refundReason) {
    return { ok: false, message: CLOSURE_MESSAGES.refundReasonRequired };
  }
  //  **والاحتفاظُ يُعلَّل** — صفرُ استرجاعٍ أو جزئيّه سواء. أمّا حالةٌ بلا
  //  مالٍ أصلاً فلا شيءَ احتُفظ به ولا سؤالَ يُطرَح.
  if (money.retainedAmount > 0 && !retainedReason) {
    return { ok: false, message: CLOSURE_MESSAGES.retainedReasonRequired };
  }

  return { ok: true, value: { reason, money, refundReason, retainedReason } };
}

/** وسمُ الدفعة لكلّ خدمة — الوسمُ القائم نفسُه، فيُخصَم من قسمه هو. */
export const CLOSURE_PAYMENT_TAG: Record<ClosureServiceType, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

export const CLOSURE_SERVICE_LABEL: Record<ClosureServiceType, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

/** ملاحظةُ صفّ الاسترجاع — تُقرأ في سجلّ الدفعات بلا فتح التدقيق. */
export const refundPaymentNote = (service: ClosureServiceType, reason: string) =>
  `استرجاع مبلغ عند إغلاق حالة ${CLOSURE_SERVICE_LABEL[service]} — ${reason}`;
