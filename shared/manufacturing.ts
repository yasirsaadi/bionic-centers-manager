// تصنيع الأطراف والمساند — المفردات الرسمية، مشتركة بين الخادم والواجهة.
//
// ══ المبدأ الحاكم بعد التبسيط ═════════════════════════════════════════════
// **المرحلة تصف أين وصل العمل. الحالة تصف هل هو متوقّف ولماذا.** وهما
// مستقلّان تماماً: توقّفٌ لا يغيّر المرحلة أبداً.
//
// المرحلة لغة مشتركة بين الخبير والمريض — ستّ مراحل واضحة، الاسم نفسه
// للاثنين. أما الحالة وأسبابها وإعادة العمل فداخلية بحتة ولا تُعرض للمريض
// إطلاقاً.
//
// ما سبق كان أربع عشرة مرحلة تفصيلية للأطراف (test_socket، alignment،
// final_socket…) تخلط «أين وصلنا» بـ«ماذا حدث»، ولا تصلح لغةً للمريض،
// وتجعل شريط التقدّم بلا معنى.

export type ServiceType = "prosthetic" | "medical_support";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

export const PURPOSES = ["initial_build", "maintenance"] as const;
export type Purpose = (typeof PURPOSES)[number];
export const PURPOSE_LABELS: Record<string, string> = {
  initial_build: "بناء أولي",
  maintenance: "صيانة",
};

// ══ ١. المراحل الست ═══════════════════════════════════════════════════════
// نفس الترتيب ونفس التسميات للأطراف وللمساند، وللخبير وللمريض.

export const BUILD_STAGES = [
  "order_received",
  "measurements",
  "mold",
  "manufacturing",
  "ready_for_fitting",
  "delivered",
] as const;
export type BuildStage = (typeof BUILD_STAGES)[number];

export const FIRST_STAGE: BuildStage = "order_received";
export const DELIVERED_STAGE: BuildStage = "delivered";
/** المرحلة التي يلتزم عندها الخبير بموعد التسليم. */
export const MOLD_STAGE: BuildStage = "mold";

// ══ ٢. الصيانة — دورة حياتها القصيرة كما هي ══════════════════════════════
// فُحصت ولم تُمسّ: ثلاث خطوات لا تحتاج تبسيطاً، ولا معنى لتمرير جهاز
// مُصلَّح عبر خطّ البناء الكامل. المراحل الست أعلاه لأوامر البناء الأولي
// حصراً، وهذا يبقي الصيانة على `new_assignment` بداية — وهو مقصود لا سهو.
export const PROSTHETIC_MAINTENANCE_STAGES: string[] = [
  "new_assignment",
  "maintenance_cast_done",
  "maintenance_device_done",
];
export const SUPPORT_MAINTENANCE_STAGES: string[] = [
  "new_assignment",
  "maintenance_support_done",
];
export const MAINTENANCE_DONE_STAGES = new Set([
  "maintenance_cast_done", "maintenance_device_done", "maintenance_support_done",
]);

// ══ ٣. التسميات ═══════════════════════════════════════════════════════════
// تشمل الأكواد القديمة عمداً: `prosthetic_work_history` محفوظ بالكامل ولم
// يُعَد كتابته، فسجلّ أمرٍ من العام الماضي يذكر `test_socket` ويجب أن
// يُقرأ. القديم للعرض التاريخي فقط — لا يُكتب في `current_stage` بعد اليوم.
export const STAGE_LABELS: Record<string, string> = {
  // الست الحالية
  order_received: "استلام أمر التصنيع",
  measurements: "القياسات والتقييم",
  mold: "أخذ وتجهيز القالب",
  manufacturing: "التصنيع والتجهيز",
  ready_for_fitting: "جاهز للتجربة والتسليم",
  delivered: "تم التسليم",

  // الصيانة
  new_assignment: "أمر جديد بانتظار بدء العمل",
  maintenance_cast_done: "تم إنجاز صيانة القالب",
  maintenance_device_done: "تم إنجاز صيانة الطرف",
  maintenance_support_done: "تم إنجاز صيانة المسند",

  // ── قديمة، للسجلّ التاريخي فقط ──
  assessment_measurements: "التقييم والقياسات (سابقاً)",
  cast_taken: "أخذ القالب (سابقاً)",
  cast_preparation: "تحضير القالب (سابقاً)",
  test_socket: "تصنيع السوكت التجريبي (سابقاً)",
  first_fitting: "التجربة الأولى (سابقاً)",
  socket_adjustment: "تعديل السوكت أو القالب (سابقاً)",
  alignment: "المحاذاة والتجربة الوظيفية (سابقاً)",
  final_socket: "تصنيع السوكت النهائي (سابقاً)",
  final_assembly: "التجميع النهائي (سابقاً)",
  quality_check: "الفحص النهائي (سابقاً)",
  ready_for_delivery: "جاهز للتسليم (سابقاً)",
  post_delivery_followup: "متابعة ما بعد التسليم (سابقاً)",
  cast_if_needed: "أخذ القالب عند الحاجة (سابقاً)",
  fitting: "التجربة (سابقاً)",
  adjustment: "التعديل (سابقاً)",
};

// ══ ٤. خريطة القديم إلى الجديد ════════════════════════════════════════════
// يستعملها ترحيل 045 لتحويل `current_stage`، وتبقى هنا لأن الواجهة قد
// تلتقي كوداً قديماً في بيانات مخبوءة (cache) قبل التحديث.
export const LEGACY_STAGE_MAP: Record<string, Record<string, BuildStage>> = {
  prosthetic: {
    new_assignment: "order_received",
    assessment_measurements: "measurements",
    cast_taken: "mold",
    cast_preparation: "mold",
    test_socket: "manufacturing",
    first_fitting: "manufacturing",
    socket_adjustment: "manufacturing",
    alignment: "manufacturing",
    final_socket: "manufacturing",
    final_assembly: "manufacturing",
    quality_check: "manufacturing",
    ready_for_delivery: "ready_for_fitting",
    delivered: "delivered",
    post_delivery_followup: "delivered",
  },
  medical_support: {
    new_assignment: "order_received",
    assessment_measurements: "measurements",
    cast_if_needed: "mold",
    manufacturing: "manufacturing",
    fitting: "manufacturing",
    adjustment: "manufacturing",
    quality_check: "manufacturing",
    ready_for_delivery: "ready_for_fitting",
    delivered: "delivered",
  },
};

/** يحوّل كوداً قديماً إلى المرحلة المقابلة. يُرجع null لما لا يُعرف. */
export function mapLegacyStage(serviceType: string, stage: string): BuildStage | null {
  if ((BUILD_STAGES as readonly string[]).includes(stage)) return stage as BuildStage;
  return LEGACY_STAGE_MAP[serviceType]?.[stage] ?? null;
}

// ══ ٥. الحالات — داخلية بحتة ══════════════════════════════════════════════
export const STATUSES = [
  "active",
  "waiting_patient",
  "waiting_materials",
  "medical_hold",
  "technical_rework",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  active: "قيد العمل",
  waiting_patient: "بانتظار المريض",
  waiting_materials: "بانتظار المواد",
  medical_hold: "متوقف لسبب طبي",
  technical_rework: "إعادة عمل فني",
  completed: "مكتمل",
  cancelled: "ملغى",
  // قديمة — للسجلّ التاريخي فقط
  waiting_components: "بانتظار المكونات (سابقاً)",
  needs_recast: "يحتاج إعادة قالب (سابقاً)",
  needs_resocket: "يحتاج إعادة سوكت (سابقاً)",
};

/** الحالات التي تعني «متوقّف» — أربع، وكلها تُبقي المرحلة كما هي. */
export const HOLD_STATUSES = [
  "waiting_patient",
  "waiting_materials",
  "medical_hold",
  "technical_rework",
] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export function isHoldStatus(v: unknown): v is HoldStatus {
  return typeof v === "string" && (HOLD_STATUSES as readonly string[]).includes(v);
}

export const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  waiting_components: "waiting_materials",
  needs_recast: "technical_rework",
  needs_resocket: "technical_rework",
};

// ══ ٦. أسباب التوقّف — داخلية، ولا تصل المريض أبداً ══════════════════════
export const HOLD_REASONS: Record<HoldStatus, { code: string; label: string }[]> = {
  waiting_patient: [
    { code: "patient_no_show", label: "المريض لم يحضر" },
    { code: "patient_return_required", label: "يحتاج مراجعة المريض" },
    { code: "patient_preparation_required", label: "يحتاج تحضير المريض" },
  ],
  waiting_materials: [
    { code: "manufacturer_components", label: "مكوّنات من المصنّع" },
    { code: "materials_unavailable", label: "المواد غير متوفّرة" },
    { code: "component_delay", label: "تأخّر وصول مكوّن" },
    { code: "other", label: "سبب آخر" },
  ],
  medical_hold: [
    { code: "swelling", label: "تورّم" },
    { code: "wound_or_skin_issue", label: "جرح أو مشكلة جلدية" },
    { code: "medical_clearance", label: "بانتظار موافقة طبية" },
    { code: "other", label: "سبب آخر" },
  ],
  technical_rework: [
    { code: "mold_fit", label: "ملاءمة القالب" },
    { code: "socket_fit", label: "ملاءمة السوكت" },
    { code: "alignment_or_calibration", label: "المحاذاة أو المعايرة" },
    { code: "device_adjustment", label: "تعديل الجهاز" },
    { code: "remake", label: "إعادة تصنيع" },
    { code: "other", label: "سبب آخر" },
  ],
};

/** كل رموز الأسباب مسطَّحة، مع القديمة، للعرض التاريخي. */
export const REASON_CODE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(HOLD_REASONS).flat().map((r) => [r.code, r.label]),
  ),
  // قديمة من نظام إعادة العمل السابق
  measurement_error: "خطأ في القياس (سابقاً)",
  cast_error: "خطأ في القالب (سابقاً)",
  socket_fit_error: "مشكلة في ملاءمة السوكت (سابقاً)",
  manufacturing_error: "خطأ في التصنيع (سابقاً)",
  patient_body_change: "تغيّر في حجم الطرف (سابقاً)",
  medical_reason: "سبب طبي (سابقاً)",
  patient_noncompliance: "عدم التزام المريض (سابقاً)",
  component_problem: "مشكلة في المكونات (سابقاً)",
  other: "سبب آخر",
};

export function isValidHoldReason(status: string, code: unknown): boolean {
  if (!isHoldStatus(status)) return false;
  return typeof code === "string" && HOLD_REASONS[status].some((r) => r.code === code);
}

/** نوع إعادة العمل المسجَّل في `prosthetic_rework_events` من اليوم فصاعداً. */
export const REWORK_TYPE = "technical_rework";
export const REWORK_TYPE_LABELS: Record<string, string> = {
  technical_rework: "إعادة عمل فني",
  // قديمة — صفوف محفوظة لا تُمسّ
  recast: "إعادة القالب (سابقاً)",
  resocket: "إعادة تصنيع السوكت (سابقاً)",
  major_adjustment: "تعديل كبير (سابقاً)",
  full_remake: "إعادة تصنيع كاملة (سابقاً)",
};

// ══ ٧. نتيجة التسليم — داخلية، تُطلب عند التسليم ═════════════════════════
export const FINAL_RESULTS: string[] = [
  "first_fit_success",
  "minor_adjustment_success",
  "multiple_adjustments_success",
  "component_changed",
  "medical_incomplete",
  "patient_absent",
  "components_unavailable",
  "technical_rejection",
  "transferred_to_another_expert",
];

export const FINAL_RESULT_LABELS: Record<string, string> = {
  first_fit_success: "ناجح من أول تجربة",
  minor_adjustment_success: "ناجح بعد تعديل بسيط",
  multiple_adjustments_success: "ناجح بعد تعديلات متعددة",
  component_changed: "احتاج تغيير مكوّن",
  medical_incomplete: "غير مكتمل بسبب حالة طبية",
  patient_absent: "غير مكتمل بسبب عدم حضور المريض",
  components_unavailable: "غير مكتمل بسبب نقص المكونات",
  technical_rejection: "غير مقبول فنيّاً",
  transferred_to_another_expert: "تم تحويله إلى خبير آخر",
  // قديمة
  recast_required: "احتاج إعادة قالب (سابقاً)",
  resocket_required: "احتاج إعادة سوكت (سابقاً)",
};

// ══ ٨. المسار ═════════════════════════════════════════════════════════════

export function stagesForOrder(serviceType: string, purpose?: string | null): string[] {
  if (purpose === "maintenance") {
    return serviceType === "medical_support" ? SUPPORT_MAINTENANCE_STAGES : PROSTHETIC_MAINTENANCE_STAGES;
  }
  return [...BUILD_STAGES];
}

/** موضع المرحلة في مسار الأمر، أو -1. */
export function stageIndex(stage: string, serviceType: string, purpose?: string | null): number {
  return stagesForOrder(serviceType, purpose).indexOf(stage);
}

/**
 * المراحل التي يجوز **التقدّم** إليها من المرحلة الحالية.
 *
 * التالية فقط — لا تنقّل عشوائي. والاستثناء الوحيد: مسند لا يحتاج قالباً
 * يجوز له القفز من القياسات إلى التصنيع مباشرة (وهو قرار فنّي حقيقي، لا
 * ثغرة: كثير من المساند جاهزة القياس).
 *
 * الرجوع للخلف ليس هنا إطلاقاً — مساره الوحيد «إعادة عمل فني» بسببه
 * المسجَّل.
 */
export function nextStages(serviceType: string, current: string, purpose?: string | null): string[] {
  const stages = stagesForOrder(serviceType, purpose);
  const i = stages.indexOf(current);
  if (i < 0 || i >= stages.length - 1) return [];

  // الصيانة ليست خطّ إنتاج بل **اختيار ما أُنجِز**: الخبير يصلح القالب أو
  // الطرف، لا هذا ثم ذاك. فمن «إسناد جديد» تُعرَض خطوات الإنجاز كلّها.
  // إلزامه بالتسلسل كان سيسجّل صيانة قالب لم تحدث ليصل إلى صيانة الطرف.
  if (purpose === "maintenance") {
    return i === 0 ? stages.slice(1) : [];
  }

  const out = [stages[i + 1]];
  if (serviceType === "medical_support" && current === "measurements") {
    out.push("manufacturing"); // تخطّي القالب لمسند لا يحتاجه
  }
  return out;
}

/** المرحلة التالية الافتراضية (زرّ «الانتقال للمرحلة التالية»). */
export function defaultNextStage(serviceType: string, current: string, purpose?: string | null): string | null {
  return nextStages(serviceType, current, purpose)[0] ?? null;
}

/** المراحل التي يجوز **الرجوع** إليها في إعادة العمل الفني: ما قبل الحالية. */
export function reworkReturnStages(serviceType: string, current: string, purpose?: string | null): string[] {
  const stages = stagesForOrder(serviceType, purpose);
  const i = stages.indexOf(current);
  if (i <= 0) return [];
  // لا يُرجَع إلى «استلام أمر التصنيع»: العمل بدأ فعلاً، والرجوع إليها
  // يعني إلغاء الأمر لا إعادة عمله.
  return stages.slice(1, i);
}

// ══ ٩. حسابات وتحقّق ══════════════════════════════════════════════════════

export function isValidServiceType(v: unknown): v is ServiceType {
  return v === "prosthetic" || v === "medical_support";
}
export function isValidStageFor(serviceType: string, stage: unknown, purpose?: string | null): boolean {
  return typeof stage === "string" && stagesForOrder(serviceType, purpose).includes(stage);
}
export function isValidStatus(v: unknown): boolean {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}
export function isValidFinalResult(v: unknown): boolean {
  return typeof v === "string" && FINAL_RESULTS.includes(v);
}

/**
 * هل هذه المرحلة عند القالب أو بعده؟ عندها يصير موعد التسليم إلزامياً.
 * مسند تخطّى القالب يقع عند «التصنيع» فيُطلَب منه الموعد أيضاً.
 * والصيانة لا قالب لها فلا موعد إلزامياً.
 */
export function isAtOrBeyondMoldStage(serviceType: string, stage: string, purpose?: string | null): boolean {
  if (purpose === "maintenance") return false;
  const stages = stagesForOrder(serviceType, purpose);
  const moldIdx = stages.indexOf(MOLD_STAGE);
  const idx = stages.indexOf(stage);
  return moldIdx >= 0 && idx >= moldIdx;
}

// ══ ١٠. عرض المريض — ما يجوز أن يراه، ولا شيء غيره ═══════════════════════
/**
 * **العقد مع المريض.** يُحسب التقدّم من المرحلة الحالية وحدها — لا من أعلى
 * مرحلة بلغها الأمر يوماً — فرجوعُ العمل يُرجع الشريط معه، وهذا صدق لا عيب.
 *
 * والمُخرَج **لا يحمل**: حالة، ولا سبباً، ولا ملاحظة، ولا إعادة عمل، ولا
 * اسم خبير. المريض يرى أين وصل جهازه، ولا يُشرَح له لماذا رجع.
 */
export interface PatientStageView {
  stage: string;
  stageLabel: string;
  stepNumber: number;   // ١-based
  totalSteps: number;
  percent: number;      // ٠..١٠٠
  isDelivered: boolean;
}

export function toPatientStageView(order: {
  currentStage: string;
  serviceType: string;
  purpose?: string | null;
}): PatientStageView {
  const stages = stagesForOrder(order.serviceType, order.purpose);
  const idx = stages.indexOf(order.currentStage);
  const stepNumber = idx < 0 ? 1 : idx + 1;
  const totalSteps = stages.length;
  return {
    stage: order.currentStage,
    stageLabel: STAGE_LABELS[order.currentStage] ?? order.currentStage,
    stepNumber,
    totalSteps,
    percent: Math.round((stepNumber / totalSteps) * 100),
    isDelivered: order.currentStage === DELIVERED_STAGE || MAINTENANCE_DONE_STAGES.has(order.currentStage),
  };
}

/** الحقول الممنوعة على أي مُخرَج موجَّه للمريض — يحرسها اختبار دائم. */
export const PATIENT_FORBIDDEN_FIELDS = [
  "status", "holdReasonCode", "holdNote", "reasonCode", "reasonDetails",
  "reworkType", "expertName", "expertUserId", "finalResult", "finalNotes", "notes",
];
