/**
 * **التفاصيلُ التجارية لجهازٍ عايَنه طبيب** — منطقٌ خالص، بلا شبكةٍ ولا قاعدة.
 *
 * ══ القرارُ الواحد الذي بقي ═══════════════════════════════════════════════
 * كان المسارُ بعد المعاينة يسأل الموظّفَ أسئلةً كثيرة: أيرغب بالشراء؟
 * أنؤجّله؟ أنعتمد سعرَه؟ أنعتمد خصمَه؟ أنعتمد الشراءَ نفسَه؟ وأحدَ عشر سبباً
 * للتأجيل. وكلُّ ذلك حول واقعةٍ واحدة يعرفها الموظّفُ يقيناً: **اشترى أو لم
 * يشترِ**.
 *
 * فصار السؤالُ واحداً، ومعه تفاصيلُ البيع الثلاث:
 *   ① **السعر** — عاديّ، أو بخصم، أو مجّانيّ.
 *   ② **الخبير** المسؤول عن التصنيع.
 *   ③ **القرار** — اشترى / لم يشترِ.
 *
 * ══ ولكلّ حقلٍ **مالك** ══════════════════════════════════════════════════
 * الطبيبُ يستطيع أن يُدخل الثلاثةَ في معاينته — وما أدخله **لا يكتب فوقه**
 * موظّفُ استقبالٍ ولا مديرُ فرع. وما تركه فارغاً يُكمله مَن حضر.
 * والمالكيةُ **محفوظةٌ صريحةً** لا مُستنتَجة من «القيمة غير فارغة»: قيمةٌ
 * قد يكون أدخلها الاستقبالُ نفسُه، فالاستنتاجُ يقلب القاعدة رأساً على عقب.
 */

// ── ① نوعُ السعر — و«لم يُسعَّر» ليست «مجّاناً» ────────────────────────────

export const PRICE_KINDS = ["normal", "discount", "free"] as const;
export type PriceKind = (typeof PRICE_KINDS)[number];

export function isPriceKind(v: unknown): v is PriceKind {
  return typeof v === "string" && (PRICE_KINDS as readonly string[]).includes(v);
}
export function parsePriceKind(v: unknown): PriceKind | null {
  return isPriceKind(v) ? v : null;
}

export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  normal: "السعر",
  discount: "بخصم",
  free: "مجاني",
};

/**
 * **الفرقُ الذي لا يجوز أن يضيع**: صفرٌ لأنه «لم يُسعَّر بعد» ≠ صفرٌ لأنه
 * «مجّانيّ بقرارٍ صريح».
 *
 * الأولى غيابُ رقم، والثانية قرارٌ تجاريٌّ له صاحبٌ وسعرٌ أصليّ. وخلطُهما
 * كان يجعل جهازاً تبرَّع به المركزُ يُقرأ «بانتظار السعر» إلى الأبد، أو —
 * أسوأ — يجعل ملفّاً لم يُسعَّر بعد يمرّ إلى التصنيع بوصفه تبرّعاً.
 *
 * فالتمييزُ بالنوع لا بالرقم: `priceKind === null` تعني «لم يُسعَّر».
 */
export const UNPRICED_LABEL = "غير محدد";

// ── ② مالكُ الحقل ────────────────────────────────────────────────────────

export const FIELD_OWNERS = ["doctor", "staff"] as const;
export type FieldOwner = (typeof FIELD_OWNERS)[number];

export function isFieldOwner(v: unknown): v is FieldOwner {
  return typeof v === "string" && (FIELD_OWNERS as readonly string[]).includes(v);
}
export function parseFieldOwner(v: unknown): FieldOwner | null {
  return isFieldOwner(v) ? v : null;
}

/** الحقولُ الثلاثة التي لها مالك. */
export const COMMERCIAL_FIELDS = ["price", "expert", "decision"] as const;
export type CommercialField = (typeof COMMERCIAL_FIELDS)[number];

export const COMMERCIAL_FIELD_LABELS: Record<CommercialField, string> = {
  price: "السعر",
  expert: "الخبير",
  decision: "القرار",
};

export interface OwnedField {
  owner: FieldOwner | null;
  ownerUserId: number | null;
  ownerName: string | null;
}

export interface CommercialSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  permissions?: Record<string, any> | null;
}

/**
 * **مَن يجوز له أن يكتب فوق هذا الحقل.**
 *
 * - **فارغٌ بلا مالك** ⟶ يُكمله كلُّ مخوَّلٍ بالعمل التجاري (والبوّابةُ
 *   التجاريةُ نفسُها تُفحَص في النقطة قبل هذه الدالّة).
 * - **مالكُه الموظّفون** ⟶ يبقى لهم، ويديره أيُّ مخوَّل.
 * - **مالكُه الطبيبُ** ⟶ **صاحبُه هو** أو **المسؤولُ العام** حصراً.
 *   ومديرُ الفرع **ليس منهم** — قرارُ مالكٍ صريح: توقيعُ الطبيب على رقمٍ
 *   ليس مسوّدةً يصحّحها مَن يدير الفرع. وله أن يطلب من صاحبه أو من المسؤول.
 *
 * **والحراسةُ في الخادم**: هذه الدالّة تُستعمَل في الطرفين معاً كي لا تعرض
 * الشاشةُ زرّاً يردّه الخادم، لكن الفاعلَ يُقرأ من الجلسة الموقَّعة دائماً.
 */
export function canOverwriteCommercialField(params: {
  field: OwnedField | null | undefined;
  session: CommercialSessionLike | null | undefined;
}): boolean {
  const owner = parseFieldOwner(params.field?.owner);
  if (owner === null) return true;      // فارغٌ — يُكمله مَن حضر
  if (owner === "staff") return true;   // للموظّفين، ويبقى لهم
  //  مالكُه الطبيب: المسؤولُ العام، أو صاحبُه بعينه.
  if (params.session?.isAdmin === true) return true;
  const uid = params.session?.userId;
  const owned = params.field?.ownerUserId;
  return typeof uid === "number" && typeof owned === "number" && uid === owned;
}

/** رسالةُ الرفض — تسمّي المالكَ بالعربية لا برمزٍ داخليّ. */
export function ownershipRefusal(field: CommercialField, ownerName: string | null): string {
  const who = ownerName?.trim() ? `د. ${ownerName.trim()}` : "الطبيب";
  return `${COMMERCIAL_FIELD_LABELS[field]} أدخله ${who} — لا يمكن تعديله من هنا.`
    + " يعدّله صاحبُه أو المسؤول العام.";
}

/** «أدخله د. فلان» / «أدخله الموظّفون» — نصٌّ يُقرأ لا رمزٌ داخليّ. */
export function ownerLabel(field: OwnedField | null | undefined): string | null {
  const owner = parseFieldOwner(field?.owner);
  if (owner === null) return null;
  const name = field?.ownerName?.trim();
  if (owner === "doctor") return name ? `أدخله د. ${name}` : "أدخله الطبيب";
  return name ? `أدخله ${name}` : "أدخله الموظّفون";
}

// ── ③ قرارُ الشراء — اثنان لا ثالث ───────────────────────────────────────

export const PURCHASE_DECISIONS = ["bought", "not_bought"] as const;
export type PurchaseDecision = (typeof PURCHASE_DECISIONS)[number];

export function isPurchaseDecision(v: unknown): v is PurchaseDecision {
  return typeof v === "string" && (PURCHASE_DECISIONS as readonly string[]).includes(v);
}
export function parsePurchaseDecision(v: unknown): PurchaseDecision | null {
  return isPurchaseDecision(v) ? v : null;
}

export const PURCHASE_DECISION_LABELS: Record<PurchaseDecision, string> = {
  bought: "اشترى",
  not_bought: "لم يشترِ",
};

/**
 * **السببُ الحرّ هو الواقعةُ الإنسانية** حين لا يشتري المريض.
 *
 * والقائمةُ القديمة (أحدَ عشر رمزاً) كانت تُجبر الموظّفَ على أن يترجم ما
 * قاله المريضُ إلى خانةٍ لا تصفه، فيختار «سبب آخر» في أغلب الأحوال — وهو
 * لا شيء. فصار السببُ نصّاً إلزامياً يُكتب كما قيل.
 *
 * **والرمزُ الموروث يبقى محفوظاً في العمود القديم** (`closed_reason`) لأن
 * القاعدة والتقارير تقرؤه، فيُختَم بالقيمة المحايدة `other` — لا يدّعي سبباً
 * لم يُقَل، والنصُّ الحقيقيّ بجواره.
 */
export const NOT_BOUGHT_LEGACY_REASON = "other";
export const NOT_BOUGHT_REASON_LABEL = "سبب عدم الشراء";

// ── العرضُ التجاريّ: تحقّقٌ واحد للشاشة وللخادم ──────────────────────────

export interface CommercialOffer {
  ok: boolean;
  error?: string;
  kind: PriceKind | null;
  /** السعرُ قبل أيّ تعديل تجاريّ. `null` = لم يُسعَّر. */
  originalPrice: number | null;
  /** ما يُقيَّد فعلاً في المحاسبة. `null` = لم يُسعَّر · `0` = مجّانيّ صريح. */
  finalPrice: number | null;
}

const nilOffer: CommercialOffer = {
  ok: false, kind: null, originalPrice: null, finalPrice: null,
};

/**
 * **الثوابتُ الآمنة، في مكانٍ واحد**:
 * - الأرقامُ أعدادٌ صحيحةٌ غيرُ سالبة (الدينارُ لا يتجزّأ).
 * - **عاديّ**: الأصلُ موجب، والنهائيُّ يساويه بالضبط.
 * - **بخصم**: الأصلُ موجب، والنهائيُّ **أصغرُ منه** وأكبرُ من صفر.
 * - **مجّانيّ**: الأصلُ موجب (فالتبرّعُ يُقاس بقيمته)، والنهائيُّ صفرٌ بالضبط.
 * - **وخصمٌ أو تبرّعٌ بلا أصلٍ موجبٍ معلوم يُردّ**: «خصمٌ من لا شيء» جملةٌ
 *   بلا معنى، وقبولُها يُنتج رقماً لا يفسّره أحد بعد سنة.
 */
export function computeCommercialOffer(params: {
  kind: unknown; originalPrice: unknown; finalPrice?: unknown;
}): CommercialOffer {
  const kind = parsePriceKind(params.kind);
  if (kind === null) return { ...nilOffer, error: "نوع السعر غير صالح" };

  const original = Number(params.originalPrice);
  if (!Number.isInteger(original)) {
    return { ...nilOffer, kind, error: "السعر يجب أن يكون بالدينار الصحيح" };
  }
  if (original <= 0) {
    return {
      ...nilOffer, kind,
      error: kind === "normal"
        ? "السعر يجب أن يكون أكبر من صفر"
        : "لا يمكن تسجيل خصم أو مجّانيّة بلا سعرٍ أصليّ معلوم أكبر من صفر",
    };
  }

  if (kind === "normal") {
    return { ok: true, kind, originalPrice: original, finalPrice: original };
  }
  if (kind === "free") {
    return { ok: true, kind, originalPrice: original, finalPrice: 0 };
  }

  const final = Number(params.finalPrice);
  if (!Number.isInteger(final)) {
    return { ...nilOffer, kind, error: "السعر بعد الخصم يجب أن يكون بالدينار الصحيح" };
  }
  if (final <= 0) {
    return {
      ...nilOffer, kind,
      error: "السعر بعد الخصم يجب أن يكون أكبر من صفر — والمجّانيّة تُختار صراحةً",
    };
  }
  if (final >= original) {
    return {
      ...nilOffer, kind,
      error: "السعر بعد الخصم يجب أن يكون أقلّ من السعر الأصلي",
    };
  }
  return { ok: true, kind, originalPrice: original, finalPrice: final };
}

// ── المرحلةُ الثانية: بيعٌ واحد، ومقدارُ خصمٍ لا نوعُ سعر ─────────────────
//
// ══ لماذا خصمٌ لا نوعُ سعر (Phase 2) ═══════════════════════════════════════
// كانت الاستعلامات تختار «نوعَ السعر» (عاديّ/بخصم/مجّانيّ) ثم — إن اختارت
// «بخصم» — تكتب السعرَ النهائيّ يدوياً: حسابٌ ذهنيٌّ لا يظهر على الشاشة،
// وفرصةُ خطأٍ عند كلّ عملية. **والاستقبالُ يعرف اتفاقاً واحداً فحسب**: كم
// اتّفقا، وكم الخصمُ عن السعر المعلَن. فصار المُدخَلان `originalPrice` و
// `discountAmount`، والنوعُ والسعرُ النهائيُّ **يُشتقّان في الخادم** —
// ولا يُعاد بناءُ حسابهما: هذه الدالّةُ تشتقّ النوعَ من الخصم ثم تُسلِّم
// الأمرَ لـ`computeCommercialOffer` نفسِها، فالثوابتُ الآمنةُ فوق واحدةٌ لا
// تتكرّر.

export interface DiscountOffer extends CommercialOffer {
  /** = originalPrice − finalPrice، وغيابُه كغياب البقيّة يعني لم يُحسَب. */
  discountAmount: number | null;
}

const nilDiscountOffer: DiscountOffer = { ...nilOffer, discountAmount: null };

/**
 * **يشتقّ التفاصيلَ التجارية الثلاثة من مُدخَلين فقط** — لا مُدخَلٍ ثالث.
 *
 * القاعدة (بالضبط كما طُلبت):
 * - `discountAmount === 0` ⟶ `normal`.
 * - `0 < discountAmount < originalPrice` ⟶ `discount`.
 * - `discountAmount === originalPrice` (وأصلٌ موجب) ⟶ `free`، والسعرُ
 *   الأصليُّ **يبقى محفوظاً كما هو** — صفرٌ هنا يعني «مجّانيّ» لا «غيرُ مُسعَّر»،
 *   لأن الشرط الوحيد له في هذا الملفّ هو `discountAmount === originalPrice`
 *   بعينه لا أيُّ صفرٍ آخر.
 *
 * وكلُّ حالةٍ تمرّ أخيراً عبر `computeCommercialOffer` — فلا قاعدةَ أمانٍ
 * ثانية تُكتب هنا، ولا يتفرّع سلوكُها عن الدالّة الأصلية بحرف.
 */
export function deriveOfferFromDiscount(params: {
  originalPrice: unknown; discountAmount: unknown;
}): DiscountOffer {
  const original = Number(params.originalPrice);
  if (!Number.isInteger(original)) {
    return { ...nilDiscountOffer, error: "السعر الأصلي يجب أن يكون بالدينار الصحيح" };
  }
  if (original <= 0) {
    return { ...nilDiscountOffer, error: "السعر الأصلي يجب أن يكون أكبر من صفر" };
  }
  const discount = Number(params.discountAmount);
  if (!Number.isInteger(discount)) {
    return { ...nilDiscountOffer, error: "مقدار الخصم يجب أن يكون بالدينار الصحيح" };
  }
  if (discount < 0) {
    return { ...nilDiscountOffer, error: "مقدار الخصم لا يمكن أن يكون سالباً" };
  }
  if (discount > original) {
    return { ...nilDiscountOffer, error: "مقدار الخصم لا يمكن أن يتجاوز السعر الأصلي" };
  }
  const kind: PriceKind = discount === 0 ? "normal" : discount === original ? "free" : "discount";
  const offer = computeCommercialOffer({
    kind, originalPrice: original, finalPrice: original - discount,
  });
  if (!offer.ok) return { ...offer, discountAmount: null };
  return { ...offer, discountAmount: discount };
}

// ── جهوزيّةُ البيع: ما ينقص، مسمّىً بالعربية ─────────────────────────────

export interface SaleState {
  /** `price` و/أو `expert` — فارغةٌ تعني «مكتمل». */
  missing: CommercialField[];
  ready: boolean;
}

/**
 * **ما ينقص لإتمام البيع** — والقرارُ ليس منها.
 *
 * فالطبيبُ قد يقول «اشترى» ويترك السعرَ أو الخبيرَ فارغاً، والقرارُ يُحفَظ
 * كما قاله ولا يُسأل ثانيةً. وما ينقص يُكمله الموظّف، وعند اكتمال **آخرِ**
 * ناقصٍ يُتمّ الخادمُ البيعَ من تلقائه.
 */
export function saleState(params: {
  priceKind: unknown; expertUserId: unknown;
}): SaleState {
  const missing: CommercialField[] = [];
  //  **النوعُ هو الدليل لا الرقم**: مجّانيٌّ صريحٌ نهائيُّه صفرٌ ومكتمل،
  //  وملفٌّ لم يُسعَّر نهائيُّه صفرٌ وناقص. والرقمُ وحده لا يفرّق بينهما.
  if (parsePriceKind(params.priceKind) === null) missing.push("price");
  const expert = Number(params.expertUserId);
  if (!Number.isFinite(expert) || expert <= 0) missing.push("expert");
  return { missing, ready: missing.length === 0 };
}

/** «بانتظار: السعر، الخبير» — يُقرأ ولا يُفسَّر. */
export function missingLabel(missing: CommercialField[]): string {
  if (missing.length === 0) return "";
  return missing.map((f) => COMMERCIAL_FIELD_LABELS[f]).join("، ");
}

// ── حالةُ العملية كما تُقرأ في الشاشة ────────────────────────────────────

export const PENDING_SALE_DATA_LABEL = "اشترى — بانتظار استكمال بيانات البيع";

/**
 * سطرُ الحالة لعمليةٍ على مسار المعاينة — **مشتقٌّ لا مخزَّن**، فلا حالةَ
 * جديدة في القاعدة ولا قارئٌ قديم ينكسر.
 *
 * `converted` تُقرأ من نصّها القائم في `shared/followup.ts`، وهذه الدالّة
 * للحيّ وحده.
 */
export function examPathStatusLine(params: {
  status: string;
  decision: unknown;
  missing: CommercialField[];
}): string | null {
  if (params.status === "converted") return null; // نصُّها القائم أدقّ
  const d = parsePurchaseDecision(params.decision);
  if (d === "not_bought") return PURCHASE_DECISION_LABELS.not_bought;
  if (d === "bought") {
    return params.missing.length === 0
      ? PENDING_SALE_DATA_LABEL
      : `${PENDING_SALE_DATA_LABEL} — ${missingLabel(params.missing)}`;
  }
  return null; // لا قرارَ بعد: النصُّ القائم «بانتظار قرار المريض» صحيح
}

// ── أفعالُ مسار المعاينة — اثنان لا أكثر (المرحلة الثانية) ───────────────

/**
 * **الأفعالُ الحيّة على عمليةِ مسار معاينةٍ جديدة — بابٌ واحد للبيع.**
 *
 * ⚠ **(المرحلةُ الثانية)**: كانت ثلاثةً — `commercial` (تفاصيلُ البيع) ثم
 * `bought` (زرٌّ ثانٍ منفصل) — خطوتين لواقعةٍ واحدة. **صارا فعلاً واحداً**:
 * `complete_sale` يحمل الخبيرَ والسعرَ الأصليّ ومقدارَ الخصم معاً، وحفظُه
 * **هو** قرارُ الشراء — لا زرَّ ثانياً بعده. و`not_bought` كما كان: الفعلُ
 * الوحيدُ المنفصل، بسببٍ حرٍّ إلزاميّ.
 *
 * لا `signal_purchase_interest` (رايةٌ تسبق قراراً صار يُسجَّل مباشرة) ·
 * لا `defer` (تأجيلٌ بأحدَ عشر سبباً حول واقعةٍ واحدة) · لا اعتمادَ سعرٍ
 * ولا اعتمادَ شراءٍ ولا «قبل السعر» ولا نوعَ سعرٍ يُختار — الخصمُ وحده.
 *
 * **والصفوفُ القديمة لا تُمَسّ**: تبقى على أفعالها القديمة حتى تنفد، فلا
 * يُحبَس ملفٌّ في حالةٍ لا زرَّ لها.
 */
export const EXAM_PATH_ACTIONS = ["complete_sale", "not_bought"] as const;
export type ExamPathAction = (typeof EXAM_PATH_ACTIONS)[number];

export const EXAM_PATH_ACTION_LABELS: Record<ExamPathAction, string> = {
  complete_sale: "إتمام البيع",
  not_bought: "لم يشترِ",
};

/** الأفعالُ المتاحة لهذه الجلسة على عمليةٍ حيّة من مسار المعاينة. */
export function examPathActions(params: {
  session: CommercialSessionLike | null | undefined;
  status: string;
  /** مالكُ القرار — يمنع قلبَ ما قرّره الطبيب على صفٍّ موروث. */
  decisionField?: OwnedField | null;
  mayAct: boolean;
}): ExamPathAction[] {
  if (!params.mayAct) return [];
  //  المنتهيةُ لا فعلَ عليها هنا: تصحيحُها بابُه نظامُ التصحيح الإداريّ.
  if (params.status === "converted" || params.status.startsWith("closed_")) return [];
  //  **بابٌ واحد فحسب**: حفظُ البيع هو نفسُه قرارُ «اشترى»، فلا حاجةَ لقراءة
  //  قرارٍ سابق لإخفاء زرٍّ ثانٍ — كلاهما يظهران معاً أو لا يظهر شيء.
  const mayDecide = canOverwriteCommercialField({
    field: params.decisionField ?? null, session: params.session,
  });
  return mayDecide ? ["complete_sale", "not_bought"] : [];
}

// ── مَن يُتمّ البيع المبسّط — إدارةٌ وتحصيلٌ، لا طبيبَ إطلاقاً ────────────

/**
 * **صلاحيةُ إتمام البيع المبسّط** (`complete-sale`/`not-bought`، المرحلة
 * الثانية) — الاستقبالُ والمحاسبُ ومديرُ الفرع، والمسؤولُ العام بلا قيد.
 *
 * **⚠ (تصحيحٌ 2026-08-28) — المحاسبُ صار كالاستقبال تماماً هنا.** القرارُ
 * الأوّل استبعده بقياسٍ خاطئ على «تحديدَ السعر التجاري» (مديرُ الفرع/
 * المسؤول حصراً) — لكنّ هذا البابَ مختلفٌ: بيعٌ يقرّره مَن يكلّم المريض،
 * والمحاسبُ يفعل ذلك يومياً تماماً كالاستقبال. فصار الشرطُ **دوراً واحداً
 * من ثلاثة**: `reception` أو `accountant` أو `branch_manager` — بنفس البابين
 * ونفس العقد، لا نقطةً ولا شاشةً مستقلّة له.
 *
 * **وليس الطبيب — إطلاقاً، ولو كان مسؤولاً عن الإجابة على المريض شفهياً**:
 * القسمُ 4.h أنهى كتابةَ الطبيب التجارية من المعاينة، وهذا البابُ الجديد لا
 * يعيدها من طريقٍ آخر. **والطبيبُ المسؤولُ الفعليّ في النظام القائم يحمل
 * `isAdmin` فيمرّ بهذه السلطة العليا** — لا بدورٍ طبّيٍّ خاص، ولا هويّةٍ
 * مكتوبةً في الكود؛ **لا دورَ اسمُه «الطبيبُ المسؤول» يُخترَع هنا.**
 *
 * **ومسؤولٌ عامٌّ يحمل دورَ طبيب يمرّ بسلطة `isAdmin` لا بدور الطبيب** — نفسُ
 * قاعدة كلّ بوّابةٍ في هذا الملفّ: السلطةُ العليا تُفحَص أوّلاً وبلا شرط.
 *
 * **والاسمُ بقي `canCompleteReceptionSale`** رغم مشاركة المحاسب — لا داعي
 * لتغييرٍ يُشتّت مواضع الاستدعاء، والتوثيقُ هنا يكفي لشرح مَن يشمله فعلاً.
 */
export function canCompleteReceptionSale(
  s: CommercialSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  return s?.role === "reception" || s?.role === "accountant" || s?.role === "branch_manager";
}
