// **التصحيحُ الإداريّ لعمليةِ جهازٍ خاطئة** — عقدٌ واحد للطرفين.
//
// ══ المبدأ المؤسّسي ═════════════════════════════════════════════════════
// **الخطأُ التشغيليّ يُصحَّح بتراجعٍ مدقَّق، لا بحذفٍ مدمّر.**
//
// المالكُ لا يجوز أن يحبسه ضغطةٌ خاطئة. والتاريخُ الطبيُّ والتصنيعيُّ
// والماليُّ لا يجوز أن يُمحى ليبدو الملفُّ نظيفاً. فالطريقُ الوحيد:
//
//   عمليةٌ خاطئة ⟶ تُعكَس ⟶ يبقى التاريخُ كما هو ⟶ تُضاف قيودٌ معاكسة
//   ⟶ تعود الحالةُ التشغيلية الصحيحة ⟶ يُسجَّل مَن ومتى ولماذا
//
// ══ ولماذا ملفٌّ مشترك ═════════════════════════════════════════════════
// الوضعان والأسبابُ والعباراتُ تُقرأ في الخادم وفي الشاشة معاً. وكتابتُها
// مرّتين تجعل الشاشةَ تعرض خياراً يردّه الخادم — أو تُخفي خياراً يقبله.
//
// **والحراسةُ في الخادم لا هنا**: ما في هذا الملفّ للعرض وللتحقّق معاً،
// والفاعلُ يُقرأ من الجلسة الموقَّعة في الخادم دائماً.

/** وضعا التصحيح — لا ثالثَ لهما. */
export const REVERSAL_MODES = ["purchase_only", "full_operation"] as const;
export type ReversalMode = (typeof REVERSAL_MODES)[number];
export const CORRECTION_INTENTS = ["purchase_mistake", "replace_requested_item", "work_order_mistake", "cancel_operation"] as const;
export type CorrectionIntent = (typeof CORRECTION_INTENTS)[number];
export function isCorrectionIntent(v: unknown): v is CorrectionIntent {
  return typeof v === "string" && (CORRECTION_INTENTS as readonly string[]).includes(v);
}
export const CORRECTION_INTENT_LABELS: Record<CorrectionIntent, string> = {
  purchase_mistake: "تم تسجيل الشراء بالخطأ",
  replace_requested_item: "تم اختيار جهاز أو جزء خاطئ",
  work_order_mistake: "تم إنشاء أمر تصنيع بالخطأ",
  cancel_operation: "أخرى — إلغاء العملية",
};

export function isReversalMode(v: unknown): v is ReversalMode {
  return typeof v === "string" && (REVERSAL_MODES as readonly string[]).includes(v);
}

/**
 * **ما يقوله الوضعُ للموظّف** — لا اسمَ داخليّ يصل الشاشة.
 *
 * `purchase_only`: الطلبُ والمعاينةُ صحيحان، والخطأُ ضغطةُ «تم الشراء».
 * `full_operation`: العمليةُ كلُّها خاطئة — جهازٌ غيرُ الذي أراده المريض.
 */
export const REVERSAL_MODE_LABELS: Record<ReversalMode, string> = {
  purchase_only: "تراجع عن الشراء فقط",
  full_operation: "إلغاء العملية بالكامل",
};

export const REVERSAL_MODE_HINTS: Record<ReversalMode, string> = {
  purchase_only:
    "الطلب والمعاينة صحيحان، لكن تم تسجيل الشراء قبل أوانه."
    + " يعود الطلب إلى ما قبل الشراء، وتبقى المعاينة فعّالة.",
  full_operation:
    "العملية كلها خاطئة — جهاز أو خدمة غير التي يريدها المريض."
    + " يُلغى الطلب والمعاينة من السجل الفعّال، ويبقى كل شيء مقروءاً في التاريخ.",
};

/** لماذا يُصحَّح — يُختار من قائمة، فتُقرأ التقاريرُ لا تُخمَّن. */
export const REVERSAL_REASON_CODES = [
  "purchase_recorded_by_mistake",
  "wrong_service_or_device",
  "work_order_created_by_mistake",
  "exam_linked_to_wrong_operation",
  "other",
] as const;
export type ReversalReasonCode = (typeof REVERSAL_REASON_CODES)[number];

export function isReversalReasonCode(v: unknown): v is ReversalReasonCode {
  return typeof v === "string" && (REVERSAL_REASON_CODES as readonly string[]).includes(v);
}

export const REVERSAL_REASON_LABELS: Record<ReversalReasonCode, string> = {
  purchase_recorded_by_mistake: "تم تسجيل الشراء بالخطأ",
  wrong_service_or_device: "تم اختيار خدمة/جهاز خاطئ",
  work_order_created_by_mistake: "تم إنشاء أمر تصنيع بالخطأ",
  exam_linked_to_wrong_operation: "المعاينة مرتبطة بالعملية الخطأ",
  other: "أخرى",
};

/** نصُّ سببٍ للعرض — والمجهولُ يُقال «سبب آخر» لا يُطبع مفتاحُه. */
export function reversalReasonLabel(code: unknown): string {
  return isReversalReasonCode(code) ? REVERSAL_REASON_LABELS[code] : "سبب آخر";
}

/**
 * الحالةُ الطرفيّة الرابعة للمتابعة — **«أُلغيت إدارياً»**.
 *
 * ولا تُوسَم `closed_without_purchase`: معناها المعروض «مغلق بدون شراء»،
 * والمريضُ هنا لم يقرّر شيئاً — الإدارةُ صحّحت خطأً وقع. ولا
 * `closed_exam_cancelled`: تلك تصف سقوطَ معاينةٍ لا تصحيحَ عمليةٍ تجارية.
 * **وسجلٌّ يقول سبباً لم يقع أسوأُ من سجلٍّ صامت.**
 */
export const FOLLOWUP_ADMIN_VOID_STATUS = "closed_admin_void";

/** ما يظهر على السجلّات الملغاة إدارياً — عبارةٌ واحدة في كلّ الشاشات. */
export const ADMIN_VOID_BADGE = "ملغاة إدارياً";

/** عنوانُ الحدث كما يقرؤه الموظّف — لا `administrative_reversal` خاماً. */
export const REVERSAL_EVENT_TITLES: Record<ReversalMode, string> = {
  purchase_only: "تراجع إداري عن الشراء",
  full_operation: "إلغاء إداري للعملية",
};

/** سطرُ القيد المعاكس في السجلّ المالي. */
export function reversalCostNote(reversalId: number | string, mode: ReversalMode): string {
  return `عكس كلفة بسبب ${REVERSAL_EVENT_TITLES[mode]} #${reversalId}`;
}

/**
 * **الرصيدُ السالب يُقال رصيداً لا «متبقٍّ بالسالب»**.
 *
 * بعد عكس كلفةٍ دُفع جزءٌ منها يصير المدفوعُ أكبرَ من المستحقّ. و«المتبقي:
 * −٣٠٠,٠٠٠» سطرٌ يقرؤه الموظّف فيظنّ عطباً في الحساب. والحقيقةُ أبسط:
 * **للمريض رصيدٌ يحتاج تسوية.**
 */
export function remainingBalanceText(remaining: number): string {
  const n = Math.round(Number(remaining) || 0);
  return n < 0
    ? `رصيد للمريض: ${Math.abs(n).toLocaleString("en-US")} د.ع`
    : `المتبقي: ${n.toLocaleString("en-US")} د.ع`;
}

/** ما تعرضه بطاقةُ الأثر قبل التأكيد — سطرٌ لكلّ ما سيتغيّر. */
export interface ReversalImpactLine {
  /** `check` يقع · `warn` تنبيهٌ لا يمنع. */
  kind: "check" | "warn";
  text: string;
}

/** ردُّ المعاينة المسبقة — **آمنٌ للعرض**، بلا SQL ولا رسائل داخلية. */
export interface ReversalPreview {
  patientId: number;
  patientName: string | null;
  followupId: number;
  medicalExamId: number | null;
  deviceEpisodeId: number | null;
  workOrderId: number | null;
  serviceType: string;
  /** ما طُلب فعلاً — «طرف صناعي كامل» أو الجزء. */
  requestedItemLabel: string | null;
  /** السعرُ التجاريُّ الذي سيُعكَس. */
  saleAmount: number;
  /** ما قبضه المركزُ على هذا الملفّ — **لا يُحذف أبداً**. */
  paidAmount: number;
  /** الفرقُ الذي ستحمله قيودُ الدفتر (سالبٌ دائماً حين يوجد بيع). */
  financialDelta: number;
  /** أبقى الدفعُ رصيداً للمريض؟ */
  requiresFinancialSettlement: boolean;
  /** الأوضاعُ المتاحة لهذه العملية بعينها. */
  availableModes: ReversalMode[];
  availableIntents: CorrectionIntent[];
  requestedItem: string | null;
  /** أثرُ كلّ وضعٍ سطراً سطراً. */
  impact: Record<ReversalMode, ReversalImpactLine[]>;
  replacementImpact: ReversalImpactLine[];
  /** حالةُ العملية اليوم كما تُقرأ. */
  currentStatusText: string;
  /** بدأ العملُ فعلاً على الأمر؟ */
  manufacturingStarted: boolean;
  /** سُلِّم الجهازُ فعلاً؟ التاريخُ لا يُعاد كتابتُه. */
  delivered: boolean;
  /** أُلغيت هذه العمليةُ إدارياً من قبل؟ */
  alreadyReversed: boolean;
  /** ختمُ الحالة — يُعاد مع التنفيذ فيُكشَف أيُّ تغيّرٍ بينهما. */
  stateStamp: string;
}
