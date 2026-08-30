// المراجعةُ اليومية — عقدٌ مشترك بين الخادم والواجهة. منطقٌ خالص، بلا شبكة.
//
// ══ ما هذه الصفحة، وما ليست ═══════════════════════════════════════════════
// سردٌ إشرافيٌّ ليليّ **للقراءة فقط** فوق حقائق موجودة أصلاً: التسجيل،
// توقيع المعاينة، حسم ما بعد المعاينة، فتح الصيانة، بيع الجزء بلا معاينة،
// حركات التصنيع اللاحقة، والدفعات المؤكَّدة على جهاز. **وليست مصدر حقيقة
// ثانياً**: لا تكتب شيئاً، ولا تُحسب فيها محاسبة، ولا يُبنى عليها قرارٌ في
// أي مكانٍ آخر من النظام. الجداولُ التجارية القائمة تبقى صاحبةَ الحقيقة —
// هذا الملفُّ وحدُه يُترجم حقائقَها إلى صفٍّ واحد يُقرأ.
//
// **ولا تُستعمَل `patient_events` مصدراً**: مُوصولةٌ لخمسة أنواعٍ فقط من
// أصل أربعةٍ وعشرين معلَنة (مراحل تصنيع البناء الأوّلي وحدها)، ولا تحمل
// فاعلاً ولا مالاً ولا طبيباً ولا خبيراً — راجع تعليقها في
// `shared/patient_events.ts`. المصادرُ هنا كلُّها الجداول التجارية القائمة
// نفسُها.
//
// والعلاجُ الطبيعي **خارج النطاق كلياً**: لا `servicePath` له، ولا حضور له
// في أيّ أسرةٍ من أسر هذا الملفّ.

export type DailyReviewServiceType = "prosthetic" | "medical_support";

export const DAILY_REVIEW_SERVICE_TYPES: DailyReviewServiceType[] = ["prosthetic", "medical_support"];

export const DAILY_REVIEW_SERVICE_LABELS: Record<DailyReviewServiceType, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};

export function isDailyReviewServiceType(v: unknown): v is DailyReviewServiceType {
  return v === "prosthetic" || v === "medical_support";
}

/** فلترةُ الخدمة في الطلب — `all` تعني القسمين معاً، لا غياب فلترة. */
export type DailyReviewServiceFilter = "all" | DailyReviewServiceType;

export function isDailyReviewServiceFilter(v: unknown): v is DailyReviewServiceFilter {
  return v === "all" || isDailyReviewServiceType(v);
}

// ── الأسرُ السبع ─────────────────────────────────────────────────────────
//
// كلُّ أسرةٍ مصدرُها جدولٌ تجاريٌّ واحد بعينه — لا اختراعَ لأسرةٍ ثامنة.
// و`manufacturing_movement` تستثني `actionType = 'created'` عمداً: تلك هي
// صفُّ فتح الصيانة/بيع الجزء نفسُه، ولا تُعرَض مرّتين (راجع الحارس
// المعماريّ في server/daily_review.test.ts).
export type DailyReviewFamily =
  | "registration"
  | "exam"
  | "post_exam_decision"
  | "maintenance_opened"
  | "component_sale_opened"
  | "manufacturing_movement"
  | "device_payment";

export const DAILY_REVIEW_FAMILY_LABELS: Record<DailyReviewFamily, string> = {
  registration: "تسجيل مريض",
  exam: "معاينة طبية",
  post_exam_decision: "حسم ما بعد المعاينة",
  maintenance_opened: "فتح صيانة",
  component_sale_opened: "بيع جزء بلا معاينة",
  manufacturing_movement: "حركة تصنيع",
  device_payment: "دفعة جهاز",
};

// ── نصوصٌ ثابتة — لا تُخترَع صياغةٌ بديلة في الواجهة ─────────────────────

export const MONEY_NOT_RECORDED_LABEL = "غير مسجل";
export const REASON_NOT_SPECIFIED_LABEL = "غير محدد";
export const UNKNOWN_LEGACY_REGISTRAR_LABEL = "غير معروف — سجل قديم";
export const FREE_LABEL = "مجاني";

// ── الحقيقةُ التجارية — نفسُ اشتقاق `shared/commercial.ts` قراءةً لا كتابة ──
//
// السعرُ النهائيُّ هو الملتزَمُ به تجارياً (approvedPrice / maintenanceFinalPrice
// / agreedCost بحسب الأسرة) — **وليس** مجموع ما دُفع فعلاً؛ ذاك عمودٌ مستقلّ
// (`actualAmountPaid`) قد يقلّ عنه أو يساويه أو يتأخّر عنه زمنياً.
export type DailyReviewPriceKind = "normal" | "discount" | "free" | null;

export interface DailyReviewMoney {
  originalPrice: number | null;
  finalPrice: number | null;
  /** = originalPrice − finalPrice، وفقط حين يُعرَف الاثنان معاً — لا اشتقاقَ جزئيّاً. */
  discount: number | null;
  priceKind: DailyReviewPriceKind;
  /** صفٌّ قديمٌ بلا حقولٍ تجاريةٍ مُهيكَلة إطلاقاً — صدقٌ لا صفر. */
  legacyUnrecorded: boolean;
}

/**
 * يبني الحقيقةَ التجارية من ثلاثة أعمدةٍ خام — نفسُ الشكل عبر الأسر الثلاث
 * (postExamFollowups / prostheticWorkOrders.maintenance* / patientDeviceEpisodes
 * .componentSale* + agreedCost). **لا حسابَ محاسبياً هنا** — قراءةٌ وطرحٌ
 * بسيط فقط، والقاعدةُ نفسُها في كلّ الحالات الثلاث.
 */
export function moneyFromParts(
  originalPrice: number | null | undefined,
  finalPrice: number | null | undefined,
  priceKind: string | null | undefined,
): DailyReviewMoney {
  const orig = originalPrice ?? null;
  const fin = finalPrice ?? null;
  const kindOk: DailyReviewPriceKind =
    priceKind === "normal" || priceKind === "discount" || priceKind === "free" ? priceKind : null;

  if (orig === null && fin === null && kindOk === null) {
    return { originalPrice: null, finalPrice: null, discount: null, priceKind: null, legacyUnrecorded: true };
  }
  const discount = orig !== null && fin !== null ? orig - fin : null;
  return { originalPrice: orig, finalPrice: fin, discount, priceKind: kindOk, legacyUnrecorded: false };
}

// ── حركاتُ التصنيع — تسميةٌ عربيةٌ واضحة، لا "status_change" خام أبداً ─────
//
// `created` مُستبعَدةٌ من هذا الملفّ بالكامل عمداً: تلك أسرةُ فتح الصيانة/
// البيع نفسِها (٤/٥)، ومَن يستدعي هذه الدالّة بها يحصل على تسميةٍ صادقةٍ
// لكنها لن تُستدعى به أبداً من `server/daily_review/store.ts` (المرشِّح
// يستبعدها قبل الوصول هنا).
//
// و"status_change" تحمل أربعةَ معانٍ مختلفة (توقّف/استئناف/إلغاء/إلغاء
// إداري) يفرّقها فقط بادئةُ `notes` الثابتة التي تكتبها كلٌّ من
// `holdOrder`/`resumeOrder`/`cancelOrder`/`voidOrderAdministratively` في
// `server/manufacturing/store.ts` — لا حقلَ عمودٍ يفرّق بينها.
const STATUS_CHANGE_PREFIXES: Array<{ prefix: string; label: string }> = [
  { prefix: "إلغاء إداري للعملية", label: "إلغاء إداري للعملية" },
  { prefix: "إلغاء الأمر", label: "إلغاء الأمر" },
  { prefix: "استئناف العمل", label: "استئناف العمل" },
  { prefix: "توقّف:", label: "إيقاف الأمر" },
];

export function workHistoryMovementLabel(actionType: string, notes: string | null): string {
  switch (actionType) {
    case "delivered": return "تسليم/إنجاز";
    case "stage_change": return "تقدّم مرحلة التصنيع";
    case "date_change": return "تحديد/تغيير موعد التسليم";
    case "rework": return "إعادة عمل فني";
    case "reassigned": return "تحويل الخبير";
    case "status_change": {
      const n = (notes ?? "").trim();
      const hit = STATUS_CHANGE_PREFIXES.find((x) => n.startsWith(x.prefix));
      // لا تخمينَ حين لا تُطابق بادئةٌ: الصفُّ حقيقيٌّ ولو لم يُفهَم سببُه.
      return hit ? hit.label : "تغيّر حالة الأمر";
    }
    default:
      return actionType;
  }
}

/** actionType المستبعَدة من أسرة الحركات — هذه فتحُ الأمر نفسُه، لا حركةٌ لاحقة. */
export const WORK_HISTORY_OPENING_ACTION_TYPE = "created";

// ── الصفّ الموحَّد ─────────────────────────────────────────────────────────

export interface DailyReviewRow {
  /** مفتاحٌ ثابتٌ لا يتكرّر: `${family}:${sourceId}` — بلا مفتاحٍ أجنبيّ حقيقي. */
  id: string;
  family: DailyReviewFamily;
  /** الزمنُ الموثوق للحدث — ما يُفلتَر ويُرتَّب به، لا بالضرورة زمنَ الكتابة. */
  eventAt: string;
  patientId: number;
  patientName: string;
  patientCode: string | null;
  branchId: number | null;
  branchName: string | null;
  serviceType: DailyReviewServiceType;
  /**
   * **مريضٌ يحمل القسمين معاً** — لأسرة `registration` وحدها (مريضٌ سُجّل
   * أطرافاً ومساند في ملفٍّ واحد؛ لا يُعرَض حدثان). `serviceType` يبقى
   * قيمةً مفردة (تُطابق الفلترةَ حين تُطلَب صراحةً)، وهذا العلمُ وحدَه
   * يقول الحقيقةَ الكاملة للعرض غير المفلتَر — بلا كذبٍ ببادجٍ واحد.
   */
  bothServices: boolean;
  /** «سبب الحضور» — بالأولوية الموصوفة في CLAUDE.md، أو `null` إن غاب كليّاً. */
  whyTheyCame: string | null;
  whatHappened: string;
  /** الموظّف الذي سجّل ملفّ المريض أصلاً — من audit_log وحده، لا تخمين. */
  registeredByName: string | null;
  registeredByUnknownLegacy: boolean;
  /** مَن أدّى **هذا الحدث بعينه** — لا صاحب التسجيل الأصلي. */
  performedByName: string | null;
  doctorName: string | null;
  expertName: string | null;
  purchaseDecision: "bought" | "not_bought" | null;
  notBoughtReason: string | null;
  money: DailyReviewMoney | null;
  /** مجموعُ الدفعات المرتبطة بهذه العملية بعينها بهويةٍ حتمية — لا تخمين. */
  actualAmountPaid: number | null;
  /** مَن قبض — **فقط** حين يُثبته سطرُ تدقيقٍ مباشر على الدفعة نفسها. */
  paymentActorName: string | null;
  paymentActorDirect: boolean;
  /** `payments.date` حين تختلف عن `eventAt` — للعرض التكميليّ فقط. */
  businessDate: string | null;
}

export interface DailyReviewFilters {
  /** يوم بغداد التقويميّ، `YYYY-MM-DD`. */
  date: string;
  branchId: number | null;
  serviceType: DailyReviewServiceFilter;
}

// ── تسميةُ الخبير — حاليٌّ لا لحظيّ، إلّا لحظةَ القرار التجاريّ نفسِها ──────
//
// `prosthetic_work_orders.expert_user_id` **الخبيرُ الحاليّ المسنَد للأمر**
// — قد يتغيّر بعد حركة «تحويل الخبير»، والقاعدةُ لا تحفظ مَن كان قبلها.
// فكلُّ أسرةٍ تقرأ هذا العمود (فتحُ الصيانة، فتحُ بيع الجزء، حركةُ تصنيعٍ
// لاحقة) تعرضه بعنوانٍ يقول ذلك صراحةً. **والاستثناءُ الوحيد**:
// `post_exam_decision` تقرأ `selected_expert_user_id` من صفّ المتابعة
// نفسِه — لقطةٌ حقيقيةٌ للحظة الحسم، لا حالةً حاليةً — فتبقى بعنوانها
// المعتاد.
export const CURRENT_EXPERT_FAMILIES: DailyReviewFamily[] = [
  "maintenance_opened", "component_sale_opened", "manufacturing_movement",
];

export function expertLabelFor(family: DailyReviewFamily): string {
  return (CURRENT_EXPERT_FAMILIES as string[]).includes(family) ? "الخبير الحالي" : "الخبير";
}

// ── إخفاءُ تكرار «نفّذه» — لا نصَّين لشخصٍ واحد على نفس الصفّ ─────────────
//
// التسجيلُ: مَن سجّل هو نفسُه مَن نفّذ حدثَ التسجيل — «سجّله» تكفي.
// المعاينة: الطبيبُ هو مَن أدّى التوقيع — «الطبيب» تكفي. وبقيّةُ الأسر لا
// تتقاطع حقولُها هكذا (الخبيرُ ومَن فتح الأمر شخصان مختلفان عادةً)، فلا
// إخفاءَ فيها.
export function isPerformedByRedundant(
  row: Pick<DailyReviewRow, "family" | "performedByName" | "registeredByName" | "doctorName">,
): boolean {
  if (!row.performedByName) return false;
  if (row.family === "registration") return row.performedByName === row.registeredByName;
  if (row.family === "exam") return row.performedByName === row.doctorName;
  return false;
}
