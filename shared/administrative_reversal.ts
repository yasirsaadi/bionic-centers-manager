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

/**
 * وضعا التصحيح — لا ثالثَ لهما. **وهما اسمان داخليّان لا يصلان الشاشة**:
 * الموظّفُ يصف ما يريد تصحيحه، والخادمُ يختار آليّةَ العكس الآمنة.
 */
export const REVERSAL_MODES = ["purchase_only", "full_operation"] as const;
export type ReversalMode = (typeof REVERSAL_MODES)[number];

export function isReversalMode(v: unknown): v is ReversalMode {
  return typeof v === "string" && (REVERSAL_MODES as readonly string[]).includes(v);
}

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

// ══ **النيّة: ما يريد الموظّفُ تصحيحه، بلغته** ═══════════════════════════
//
// سؤالان متتاليان — «ما الخطأ الذي وقع؟» ثم «نوع التصحيح؟» — يطلبان من
// الموظّف أن يترجم خطأً يعرفه إلى آليّةِ عكسٍ لا يعرفها، ثم يعاقبانه إن
// أخطأ الترجمة. فصار سؤالاً واحداً: **ماذا تريد أن تصحّح؟**
//
// والخادمُ يشتقّ الوضعَ والسبب من النيّة بالخريطتين أدناه — **مصدرٌ واحد
// يقرؤه الطرفان**، فلا تُرسل الشاشةُ وضعاً يخالف ما فهمه الخادم.

export const CORRECTION_INTENTS = [
  "purchase_mistake", "replace_requested_item", "work_order_mistake", "cancel_operation",
] as const;
export type CorrectionIntent = (typeof CORRECTION_INTENTS)[number];

export function isCorrectionIntent(v: unknown): v is CorrectionIntent {
  return typeof v === "string" && (CORRECTION_INTENTS as readonly string[]).includes(v);
}

/**
 * **العنوانُ يقول الأثرَ لا يُجمّله.**
 *
 * «تم إنشاء أمر تصنيع بالخطأ» وحدها كانت تُوهم أن أمر التصنيع وحده يُلغى،
 * بينما الأثرُ الحقيقيّ إلغاءُ العملية التجارية والجهاز والمعاينة معاً.
 * **ولا مسارَ ضيّقٌ يلغي أمر التصنيع وحده** في هذا النظام — فيُقال ذلك في
 * العنوان نفسِه، لا في سطرٍ يُطوى.
 */
export const CORRECTION_INTENT_LABELS: Record<CorrectionIntent, string> = {
  purchase_mistake: "تم تسجيل الشراء بالخطأ",
  replace_requested_item: "تم اختيار جهاز أو جزء خاطئ",
  work_order_mistake: "تم إنشاء أمر التصنيع بالخطأ — تُلغى العملية بالكامل",
  cancel_operation: "سبب آخر — تُلغى العملية بالكامل",
};

/** سطرٌ تحت كلّ خيار يقول ماذا يقع فعلاً — بلا مصطلحٍ داخليّ. */
export const CORRECTION_INTENT_EFFECTS: Record<CorrectionIntent, string> = {
  purchase_mistake:
    "يعود الطلب إلى ما قبل الشراء، وتبقى المعاينة والطلب كما هما.",
  replace_requested_item:
    "تُلغى العملية الحالية بالكامل، ويُفتح طلب جديد بالجهاز الصحيح بانتظار المعاينة.",
  work_order_mistake:
    "يُلغى الشراء وأمر التصنيع والمعاينة معاً — لا أمر التصنيع وحده.",
  cancel_operation:
    "تُلغى العملية بالكامل، ولا يُفتح طلب جديد.",
};

/** النيّة ⟶ آليّةُ العكس. **الخريطةُ واحدة يقرؤها الخادمُ والشاشة.** */
export const CORRECTION_INTENT_MODE: Record<CorrectionIntent, ReversalMode> = {
  purchase_mistake: "purchase_only",
  replace_requested_item: "full_operation",
  work_order_mistake: "full_operation",
  cancel_operation: "full_operation",
};

/** النيّة ⟶ رمزُ السبب المخزَّن — فتبقى التقاريرُ تفرّق بين الأخطاء. */
export const CORRECTION_INTENT_REASON: Record<CorrectionIntent, ReversalReasonCode> = {
  purchase_mistake: "purchase_recorded_by_mistake",
  replace_requested_item: "wrong_service_or_device",
  work_order_mistake: "work_order_created_by_mistake",
  cancel_operation: "other",
};

/**
 * سطرُ «فتح طلب جديد: قالب» — **دالّةٌ واحدة** يستعملها ملخّصُ الشاشة قبل
 * التنفيذ وحقائقُ الحدث بعده، فلا تُكتب العبارةُ مرّتين فتنحرفا.
 */
export function replacementSummaryLine(itemLabel: string): ReversalImpactLine {
  return { kind: "check", text: `فتح طلب جديد: ${itemLabel} — بانتظار المعاينة` };
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
  /** الأوضاعُ المتاحة لهذه العملية بعينها. */
  availableModes: ReversalMode[];
  /**
   * **النوايا المتاحة لهذه العملية بعينها** — يقرّرها الخادم.
   *
   * فلا تُعرَض «تراجع عن الشراء» لجهازٍ سُلِّم، ولا «استبدال» لعمليةٍ لا
   * حلقةَ لها أو لا بديلَ في خدمتها: **خيارٌ يعرضه الخادمُ ثمّ يردّه هو
   * نفسُه ليس خياراً بل فخّ.**
   */
  availableIntents: CorrectionIntent[];
  /** ما طُلب فعلاً — المفتاحُ الخام، ليُستثنى من قائمة البدائل. */
  requestedItem: string | null;
  /** بدائلُ الاستبدال لهذه الخدمة، **من الخادم** بلا اشتقاقٍ في الشاشة. */
  replacementOptions: { value: string; label: string }[];
  /** أثرُ كلّ وضعٍ سطراً سطراً — التفصيلُ الكامل، يُطوى. */
  impact: Record<ReversalMode, ReversalImpactLine[]>;
  /** **الملخّصُ القصير** الذي يُقرأ قبل التأكيد — ثلاثةُ أسطر أو أربعة. */
  summary: Record<ReversalMode, ReversalImpactLine[]>;
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

// ══ سؤالُ إرجاع المبلغ — **بابٌ واحد: يُردّ المالُ ثمّ تُلغى العملية** ══════
//
//  **الواقعة**: «إلغاء العملية بالكامل» يعكس البيعَ، فيصير ما قبضه المركزُ
//  على هذه العملية مالاً بلا ما يقابله. وتركُه «رصيداً يحتاج تسويةً لاحقة»
//  كان يعني أن أحداً يجب أن يتذكّره — **ولا أحدَ يتذكّر**.
//
//  **فالقاعدةُ صارت واحدة، ولا حالةَ ثالثة:**
//
//    توجد دفعة ⟶ **«نعم»** ⟶ يُسجَّل الردُّ الكامل **ثمّ** تُلغى العملية.
//                 **«لا»**  ⟶ **تُلغى محاولةُ الإلغاء، ولا يتغيّر شيء.**
//
//  **ولا «تسويةٌ معلَّقة» بعد اليوم**: إمّا أن يُردّ المالُ فتمضي العملية،
//  وإمّا أن لا تمضي أصلاً. فلا تُخلَّف حالةٌ ينتظرها عملٌ بشريٌّ لاحق.
//
//  **و«لا» ليست فرعاً يُكمَل**: لا سؤالَ ثانياً بعدها، ولا خيارَ «أمضِ الآن
//  وسوِّ لاحقاً» — ذاك هو بعينه ما أنشأ المشكلة. والاختيارُ يُغلق النافذة.
//
//  ══ **وفرعُ «نعم»: يُردّ الصافي المقبوض كاملاً** ═══════════════════════════
//  صفُّ دفعةٍ **سالبٌ** بمقدار الصافي المقبوض على هذه الحلقة بعينها، مربوطٌ
//  بنفس المريض والحالة والحلقة والفرع، ومعه **قيدُ اليومية المرآة** — كلُّه
//  **في معاملة الإلغاء نفسِها**، بالكاتب القانونيّ الواحد
//  (`recordRefundPaymentTx`) الذي تستعمله إعادةُ المال عند إغلاق الحالة.
//
//  **والأصلُ لا يُمَسّ**: لا دفعةٌ تُعدَّل ولا تُحذف ولا قيدٌ يُعكَس — الردُّ
//  حركةٌ جديدة، والتاريخُ يبقى يقول إن مالاً قُبض ثمّ رُدّ.
//
//  ══ **ولماذا يُحرَس في الخادم والشاشةُ تمنع أصلاً؟** ═══════════════════════
//  لأن منعَ الشاشة ليس عقداً: نافذةٌ مفتوحةٌ منذ ما قبل النشر · طلبٌ مصنوعٌ
//  بيدٍ · **ودفعةٌ تُقبَض بين المعاينة والتنفيذ** فلا تكون الشاشةُ سألت
//  أصلاً. **والمبلغُ يُقرأ في الخادم تحت القفل** من صفوف الدفعات — لا من جسم
//  الطلب ولا من لقطةِ معاينةٍ بائتة. فيردّ الخادمُ **الصمتَ** و**«لا»** معاً،
//  كلاًّ برسالته، **قبل أن يكتب حرفاً**.
//
//  ══ **والعمودُ `requires_financial_settlement` يبقى للتاريخ وحدَه** ═══════
//  صفوفٌ قديمةٌ تحمله `TRUE` فعلاً، ويقرؤها حارسُ سلّة المرضى (§٤.g) ليرفع
//  قرارَ الحذف إلى المسؤول العام — **فلا يُحذَف العمود ولا يُعاد كتابتُه**.
//  لكنّ كلَّ صفٍّ جديد يُكتب `FALSE`: لم يعد للنظام بابٌ يُخلّف تسوية.

/** نصُّ السؤال — واحدٌ تقرؤه الشاشةُ والاختبار، فلا صياغتان تنحرفان. */
export const REFUND_QUESTION_LABEL = "هل تم إرجاع المبلغ للمريض؟";

export const REFUND_ANSWERS = ["yes", "no"] as const;
export type RefundAnswer = (typeof REFUND_ANSWERS)[number];

export const REFUND_ANSWER_LABELS: Record<RefundAnswer, string> = {
  yes: "نعم",
  no: "لا",
};

export function isRefundAnswer(v: unknown): v is RefundAnswer {
  return typeof v === "string" && (REFUND_ANSWERS as readonly string[]).includes(v);
}

/**
 *  **رفضُ الخادم حين يلزم الجوابُ ولا يصل** — نصٌّ واحد يقرؤه الخادمُ
 *  والاختبار، ويقول للموظّف ما يفعل بدل «طلب غير صالح» عارية.
 */
export const REFUND_ANSWER_REQUIRED_ERROR =
  "على هذه العملية مبلغ مدفوع — أجب عن سؤال «هل تم إرجاع المبلغ للمريض؟»"
  + " قبل تنفيذ إلغاء العملية بالكامل. إن لم يظهر السؤال فأعد فتح النافذة.";

/**
 *  **رفضُ «لا»** — قرارٌ مكتمل لا نقصٌ في البيانات، فله رسالتُه هو:
 *  المالُ لم يعد للمريض بعد، **فلا تُلغى العملية** حتى يعود.
 */
export const REFUND_NOT_DONE_ERROR =
  "لم يُرجَع المبلغ للمريض بعد — فلم تُلغَ العملية ولم يتغيّر شيء."
  + " أرجِع المبلغ للمريض ثم أعد المحاولة واختر «نعم».";

/**
 *  ملاحظةُ صفّ الاسترجاع — تُقرأ في سجلّ الدفعات بلا فتح التدقيق، وتربطه
 *  بالتصحيح الذي أنشأه. **مبنيّةٌ هنا** ليقرأها الخادمُ والاختبارُ من مصدرٍ
 *  واحد (نظيرُ `refundPaymentNote` لإغلاق الحالة).
 */
export const reversalRefundPaymentNote = (reversalId: number, reason: string) =>
  `استرجاع كامل المبلغ عند إلغاء العملية إدارياً #${reversalId} — ${reason}`;

/**
 *  **متى يُطرَح السؤال** — شرطان معاً لا أحدُهما:
 *
 *  ① **الوضعُ `full_operation` وحده.** «تراجعٌ عن الشراء فقط» يُبقي الطلبَ
 *     حيّاً ليُشترى صحيحاً بعده، فلا رصيدَ يُسأل عن ردّه — والمالُ يُستعمل
 *     في الشراء التالي. أمّا الإلغاءُ الكامل فيُنهي العملية، فيصير المدفوعُ
 *     رصيداً معلَّقاً بلا ما يقابله.
 *
 *  ② **ومبلغٌ مقبوضٌ فعلاً `> 0`.** والمجموعُ يشمل الاستردادات السابقة
 *     (صفوفُ دفعاتٍ سالبة — §٤.r)، فصفرٌ أو سالبٌ يعني **لا شيءَ عند المركز
 *     يُردّ**، وسؤالٌ عن ردّ لا موضوعَ له يُعلّم الموظّفَ أن يضغط بلا قراءة.
 *
 *  **ولا يُقاس على `requiresFinancialSettlement`**: تلك تشترط بيعاً موجباً
 *  أيضاً (`paidAmount > 0 && sale > 0`)، فعمليةٌ قُبض عليها مالٌ بلا كلفةٍ
 *  مسجَّلة كانت تسقط من السؤال — والمالُ عند المركز في الحالتين سواء.
 *
 *  **وقيمةٌ غير رقميّة تُقرأ «لا سؤال»؟ لا** — تُقرأ بحذر: غيرُ المنتهي
 *  ليس «> ٠» فيسقط طبيعياً، ولا يُخمَّن عنه. والشاشةُ تقرأ `paidAmount` من
 *  الخادم دائماً، فالمسارُ الوحيد لغير الرقم عميلٌ بائتٌ أو ردٌّ ناقص.
 */
export function refundQuestionRequired(params: {
  mode: ReversalMode | "" | null | undefined;
  paidAmount: unknown;
}): boolean {
  if (params.mode !== "full_operation") return false;
  const paid = typeof params.paidAmount === "number" ? params.paidAmount : Number.NaN;
  return Number.isFinite(paid) && paid > 0;
}
