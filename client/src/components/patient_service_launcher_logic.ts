// منطق «إضافة خدمة جديدة» — **خالص، بلا React ولا شبكة**.
//
// ══ ما هذا الملفّ ═══════════════════════════════════════════════════════
// النافذة الجديدة **موزِّع لا منفّذ**: تختار الخدمة فتفتح المسار القائم لها،
// ولا تحمل منطق عمل ولا تنادي نقطة نهاية بنفسها. وهذا الملفّ هو قرار
// التوزيع وحده: أي خيار ⇒ أي مسار، ومتى يُعطَّل ولماذا.
//
// وأُخرِج إلى ملفّ مستقلّ للسبب نفسه الذي أُخرِج لأجله منطق بطاقة التواصل:
// المشروع بلا مشغّل DOM، فقرارٌ داخل مكوّن React لا يُختبَر. وهنا يُختبَر
// دخلاً وخرجاً — والخريطة نفسها تصير وثيقةً تنفيذية لا تعليقاً يشيخ.
//
// ══ ولا مسار جديد إطلاقاً ═══════════════════════════════════════════════
// هذا **توحيد لنقطة الدخول في الواجهة، لا توحيد للخلفية**. النقاط الثلاث
// القائمة تبقى كما هي بحدودها وتحقّقاتها ومحاسبتها، وكلّ خيار يذهب إلى
// نقطته الصحيحة — ولا نقطة «خدمة عامّة» تجمعها.

import type { Department } from "@shared/service_taxonomy";
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";

/** المسارات الثلاثة القائمة — **لا رابع**. */
export type ServiceFlow =
  /** `POST /api/patients/:id/add-case-type` — قرارٌ بلا مال ولا أمر تصنيع. */
  | { kind: "case_type"; caseType: "amputee" | "medical_support" | "physiotherapy" }
  /** `POST /api/patients/:id/new-service` — قيدٌ مالي على خيطٍ قائم. */
  | { kind: "new_service"; serviceType: "additional_therapy" | "consultation" | "other" }
  /**
   * `POST /api/manufacturing/maintenance-visit` — زيارة وأمر صيانة معاً.
   * و`serviceType` يضبط النافذة على جهاز القسم الذي اختير منه — والخادم
   * يبقى صاحب القرار: يتحقّق أن المريض يملك النوع فعلاً.
   */
  | { kind: "maintenance_visit"; serviceType: "prosthetic" | "medical_support" }
  /** `POST /api/patients/:patientId/device-episodes` — جهازٌ جديد على خيطٍ قائم. */
  | { kind: "device_episode"; serviceType: "prosthetic" | "medical_support" }
  /**
   * **عمليةٌ بلا معاينة** (ترحيل ٠٦٧) — بيعُ جزءٍ أو صيانةٌ يُنجزها
   * الاستقبال بلا إرسال المريض إلى الطبيب، **ومبلغُها يبقى خارج المحاسبة**
   * حتى يعتمده طبيبٌ مخوَّل.
   *
   * ولا تلغي البابين القائمين: «جهاز جديد» يفتح طلباً على مسار المعاينة،
   * و«صيانة» تحجز أجرَها فوراً. هذا بابُ المسار الثالث الذي فتحه ٠٦٥.
   */
  | { kind: "no_exam_operation"; serviceType: "prosthetic" | "medical_support" };

/** النقاط التي يجوز أن يصل إليها موزِّع الخدمات — قائمة مغلقة. */
export const FLOW_ENDPOINTS: Record<ServiceFlow["kind"], string> = {
  case_type: "/api/patients/:id/add-case-type",
  new_service: "/api/patients/:id/new-service",
  maintenance_visit: "/api/manufacturing/maintenance-visit",
  device_episode: "/api/patients/:patientId/device-episodes",
  no_exam_operation: "/api/no-exam/device-sale",
};

export interface PatientServiceFlags {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  isPhysiotherapy?: boolean | null;
  /**
   * حلقات المريض. الحلقة المفتوحة وحدها تعطّل «جهاز جديد» — والمسلَّمة
   * والملغاة **لا تعطّلانه**: أن يكون له جهازٌ سابق هو بالضبط سبب فتح
   * الجديد، لا مانعه.
   */
  episodes?: { serviceType: string; status: string }[] | null;
}

/**
 * مجموعاتُ الموزِّع — **هي الأقسامُ الثلاثة نفسها، لا غير**.
 *
 * كان ثلاثةً من نوعٍ آخر: «خدمات الأجهزة» تجمع الطرفَ والمسندَ في واحد،
 * و«العلاج الطبيعي»، و«خدمات أخرى» تعيش خارج التصنيف كلّه — فالاستشارةُ
 * لا تنتمي إلى قسم، ومديرُ المساند لا يرى بابَه مستقلاً.
 *
 * والآن الأسماءُ هي `Department` حرفياً، فلا خريطةَ بين الشاشة والتقرير.
 */
export type LauncherGroup = Department;

export interface LauncherOption {
  id: string;
  label: string;
  /** سطرٌ صغير يقول ما الذي سيحدث فعلاً عند الضغط. */
  description: string;
  group: LauncherGroup;
  flow: ServiceFlow;
  disabled: boolean;
  /** يُعرَض مكان الوصف حين يكون الخيار معطَّلاً — ولا يُترك بلا سبب. */
  disabledReason?: string;
}

export const GROUP_LABELS: Record<LauncherGroup, string> = DEPARTMENT_LABELS;

/**
 * **حالةٌ قائمة لا تُنشأ ثانيةً.**
 *
 * الخادم يردّ 409 على نوعٍ مفعَّل سلفاً، وفهرس `patient_cases` الفريد يمنع
 * الصفّ المكرَّر. فالتعطيل هنا ليس حمايةً — هو صدقٌ في الواجهة: زرٌّ يفتح
 * نافذةً لتنتهي برسالة خطأ أسوأ من زرٍّ يقول سببه ابتداءً.
 *
 * و**الجهاز الثاني ليس هذا الباب**: مَن يحمل طرفاً ويريد طرفاً جديداً
 * يحتاج حلقة تصنيع مستقلّة — وهي مرحلةٌ قادمة بذاتها. و`new-service`
 * ليست بديلاً عنها (الخادم يرفض `new_prosthetic` أصلاً وهذا صواب)، فلا
 * يُفتَح لها باب جانبي هنا.
 */
const DEVICE_EXISTS = "الخدمة موجودة على ملف المريض — لطلب جهاز جديد استعمل «جهاز جديد» أدناه";

/** حالاتُ الحلقة المفتوحة ورسالةُ كلٍّ منها للموظّف. */
const OPEN_EPISODE_REASON: Record<string, string> = {
  awaiting_exam: "هناك طلب جهاز قائم بانتظار معاينة الطبيب",
  examined: "هناك طلب جهاز مُعايَن بانتظار التخصيص وإسناد الخبير",
  in_manufacturing: "هناك جهاز قيد التصنيع لهذه الخدمة",
};

/** الحلقة المفتوحة لهذه الخدمة إن وُجدت — المسلَّمة والملغاة ليستا مانعاً. */
export function openEpisodeFor(
  p: PatientServiceFlags, serviceType: "prosthetic" | "medical_support",
): { serviceType: string; status: string } | null {
  const list = Array.isArray(p.episodes) ? p.episodes : [];
  return list.find((e) => e.serviceType === serviceType && e.status in OPEN_EPISODE_REASON) ?? null;
}

/** خيارُ «جهاز جديد» — يظهر فقط لمن يملك الخيط أصلاً. */
function newDeviceOption(
  p: PatientServiceFlags, serviceType: "prosthetic" | "medical_support",
  hasCase: boolean, label: string,
): LauncherOption {
  const open = openEpisodeFor(p, serviceType);
  return {
    id: serviceType === "prosthetic" ? "new_prosthetic_device" : "new_support_device",
    label,
    description: "فتح طلب جهاز جديد على نفس الحالة — يبدأ بمعاينة الطبيب",
    group: serviceType,
    flow: { kind: "device_episode", serviceType },
    disabled: !hasCase || open !== null,
    disabledReason: !hasCase
      ? "تُفتَح الحالة أولاً"
      : open
        ? OPEN_EPISODE_REASON[open.status]
        : undefined,
  };
}

/** خيارُ الصيانة لقسمٍ بعينه — يظهر لمن يملك جهازَ ذلك القسم. */
function maintenanceOption(
  p: PatientServiceFlags, serviceType: "prosthetic" | "medical_support",
  hasCase: boolean, label: string,
): LauncherOption {
  return {
    id: serviceType === "prosthetic" ? "maintenance_prosthetic" : "maintenance_support",
    label,
    description: "فتح زيارة وأمر صيانة",
    group: serviceType,
    flow: { kind: "maintenance_visit", serviceType },
    disabled: !hasCase,
    disabledReason: hasCase ? undefined
      : serviceType === "prosthetic"
        ? "لا يوجد طرف صناعي على ملف المريض"
        : "لا يوجد مسند طبي على ملف المريض",
  };
}

/**
 * خيارُ «بلا معاينة» — **بيعٌ أو صيانةٌ بمبلغٍ ينتظر مراجعة الطبيب**.
 *
 * ويُعطَّل بحلقةٍ مفتوحة كما يُعطَّل «جهاز جديد»: طلبٌ قائمٌ يُكمَل ولا
 * يُفتَح فوقه ثانٍ. والخادمُ يبقى صاحبَ القرار على السباق.
 */
function noExamOption(
  p: PatientServiceFlags, serviceType: "prosthetic" | "medical_support",
  hasCase: boolean, label: string,
): LauncherOption {
  const open = openEpisodeFor(p, serviceType);
  //  والصيانةُ لا تعطّلها حلقةٌ مفتوحة — لكنّ النافذة واحدة، فالتعطيل
  //  يتبع أضيقَ البابين صدقاً: طلبٌ قائم يُكمَل من بطاقته.
  return {
    id: serviceType === "prosthetic" ? "no_exam_prosthetic" : "no_exam_support",
    label,
    description: "بيع جزء أو صيانة بلا معاينة — يُنجَز العمل والمبلغ ينتظر اعتماد الطبيب",
    group: serviceType,
    flow: { kind: "no_exam_operation", serviceType },
    disabled: !hasCase || open !== null,
    disabledReason: !hasCase
      ? "تُفتَح الحالة أولاً"
      : open
        ? OPEN_EPISODE_REASON[open.status]
        : undefined,
  };
}

export function launcherOptions(p: PatientServiceFlags): LauncherOption[] {
  const hasProsthetic = Boolean(p.isAmputee);
  const hasSupport = Boolean(p.isMedicalSupport);
  const hasPhysio = Boolean(p.isPhysiotherapy);

  return [
    {
      id: "prosthetic_case",
      label: "أطراف صناعية",
      description: "إضافة حالة أطراف للمريض",
      group: "prosthetic",
      flow: { kind: "case_type", caseType: "amputee" },
      disabled: hasProsthetic,
      disabledReason: hasProsthetic ? DEVICE_EXISTS : undefined,
    },
    {
      id: "support_case",
      label: "مساند طبية",
      description: "إضافة حالة مساند للمريض",
      group: "medical_support",
      flow: { kind: "case_type", caseType: "medical_support" },
      disabled: hasSupport,
      disabledReason: hasSupport ? DEVICE_EXISTS : undefined,
    },
    //  **«أو جزء جديد»** — المريضُ العائد نادراً ما يطلب طرفاً كاملاً:
    //  تنكسر ركبةٌ أو يبلى غلاف. والاسمُ القديم كان يقول له إن هذا ليس
    //  بابَه فيذهب إلى «صيانة» — وشراءُ قطعةٍ **بيعٌ لا صيانة**.
    newDeviceOption(p, "prosthetic", hasProsthetic, "طرف صناعي جديد أو جزء جديد"),
    newDeviceOption(p, "medical_support", hasSupport, "مسند طبي جديد"),
    //  ══ الصيانةُ تُنسَب لقسم جهازها ══════════════════════════════════
    //  كانت بنداً واحداً تحت «خدمات الأجهزة»، فلا يعرف الناظرُ أيَّ قسمٍ
    //  تخصّ. والآن بندٌ تحت كلّ قسمٍ يملكه المريض، يحمل نوعَه معه.
    //
    //  **والاختيارُ الآمن القائم محفوظ**: صاحبُ النوعين تُفتح له نافذتُه
    //  مضبوطةً على ما اختاره من القائمة لا مخمَّنةً، والخادمُ يعيد التحقّق
    //  من أن المريض يملك النوع فعلاً كما كان.
    maintenanceOption(p, "prosthetic", hasProsthetic, "صيانة طرف صناعي"),
    maintenanceOption(p, "medical_support", hasSupport, "صيانة مسند طبي"),
    //  ══ **بلا معاينة** (ترحيل ٠٦٧) ═════════════════════════════════════
    //  المريضُ الذي لا يحتاج طبيباً — قالبٌ يُباع أو ركبةٌ تُصلَّح — يُنجَز
    //  عملُه الآن، **ويبقى مبلغُه خارج المحاسبة** حتى يراجعه طبيبٌ مخوَّل.
    noExamOption(p, "prosthetic", hasProsthetic, "بيع أو صيانة بلا معاينة (أطراف)"),
    noExamOption(p, "medical_support", hasSupport, "بيع أو صيانة بلا معاينة (مساند)"),
    {
      id: "physio_case",
      label: "علاج طبيعي",
      description: "إضافة حالة علاج طبيعي للمريض",
      group: "physiotherapy",
      flow: { kind: "case_type", caseType: "physiotherapy" },
      disabled: hasPhysio,
      // مَن له علاجٌ قائم لا يحتاج حالةً ثانية بل جلساتٍ عليها — والرسالة
      // تدلّه على الخيار الذي تحته مباشرةً بدل أن تقف عند المنع.
      disabledReason: hasPhysio ? "الخدمة موجودة على ملف المريض — أضِف جلسات إضافية بدلاً منها" : undefined,
    },
    {
      id: "additional_therapy",
      label: "جلسات علاج طبيعي إضافية",
      description: "زيادة جلسات على خطة العلاج القائمة",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "additional_therapy" },
      disabled: !hasPhysio,
      disabledReason: hasPhysio ? undefined : "تُفتَح حالة علاج طبيعي أولاً",
    },
    {
      id: "consultation",
      label: "استشارة طبية",
      description: "تسجيل استشارة على ملف المريض",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "consultation" },
      disabled: false,
    },
    {
      id: "other",
      label: "خدمة أخرى",
      description: "خدمة لا مسار خاصّ لها",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "other" },
      disabled: false,
    },
  ];
}

// ══ الصيانة: أيّ جهاز؟ ═══════════════════════════════════════════════════

export type MaintenanceServiceType = "prosthetic" | "medical_support";

/** ما يملكه المريض فعلاً — وهو وحده ما يجوز أن يُصان. */
export function ownedDeviceTypes(p: PatientServiceFlags): MaintenanceServiceType[] {
  return [
    p.isAmputee ? "prosthetic" : null,
    p.isMedicalSupport ? "medical_support" : null,
  ].filter(Boolean) as MaintenanceServiceType[];
}

/**
 * هل يُسأل الموظّف عن نوع الجهاز؟ **فقط حين يملك المريض الاثنين.**
 *
 * صاحبُ نوعٍ واحد لا يُسأل سؤالاً جوابه واحد — والسلوك يبقى كما كان تماماً.
 */
export function needsMaintenanceChoice(p: PatientServiceFlags): boolean {
  return ownedDeviceTypes(p).length > 1;
}

/**
 * ما يُرسَل إلى نقطة الصيانة — **مرآةٌ لقاعدة الخادم حرفاً**.
 *
 * `null` تعني «لا تُرسِل»: إمّا لأن المريض لا يملك النوع المختار، وإمّا
 * لأنه يحمل الاثنين ولم يُحدَّد بعد. والخادم يردّ 400 في الحالتين، فلا
 * تبني الواجهة طلباً تعرف أنه سيُرفض.
 */
export function resolveMaintenanceServiceType(
  p: PatientServiceFlags,
  chosen?: string | null,
): MaintenanceServiceType | null {
  const owned = ownedDeviceTypes(p);
  if (owned.length === 0) return null;
  if (chosen) return owned.includes(chosen as MaintenanceServiceType) ? (chosen as MaintenanceServiceType) : null;
  return owned.length === 1 ? owned[0] : null;
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceServiceType, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};

// ══ تذكرة الإرسال: **واحدة لكل فتح** ═════════════════════════════════════

/**
 * حالة التذكرة بعد كل تغيّر في حالة النافذة — **دالّة خالصة**.
 *
 * ── العطب الذي تغلقه ────────────────────────────────────────────────────
 * كانت التذكرة تُسكّ داخل `onOpenChange(true)` وحده. وهذا يكفي ما دامت
 * النافذة تُفتح بزرّها: الحدث يقع فتُسكّ. لكن الموزِّع **يركّبها وهي
 * مفتوحة أصلاً** (`open` ثابتة)، فلا `onOpenChange` يقع إطلاقاً — فتُرسَل
 * التذكرة فارغةً، والخادم لا يطالب بشيء حين تكون فارغة، **فيسقط منع
 * التكرار بصمت** في المسار الجديد وحده. ضغطتان تصيران خدمتين.
 *
 * ── القاعدة ─────────────────────────────────────────────────────────────
 * مغلقة ⇒ لا تذكرة. مفتوحة ⇒ تذكرةٌ واحدة تثبت ما دامت مفتوحة.
 * فـ`prev ||` تمنع سكّ ثانيةٍ أثناء الفتح نفسه، والتصفير عند الإغلاق يمنع
 * إعادة استعمال تذكرةٍ استُهلكت — والخادم يرفض الثانية على أي حال، لكنه
 * كان سيردّ «مسجَّلة سابقاً» على خدمةٍ جديدة حقيقية.
 *
 * وخالصةٌ لتُختبَر: «فتحٌ واحد ⇒ تذكرة واحدة» ادّعاءٌ عن الزمن، ولا يُثبَت
 * بقراءة مكوّن React بلا مشغّل DOM.
 */
export function nextSubmissionToken(
  previous: string,
  open: boolean,
  mint: () => string,
): string {
  if (!open) return "";
  return previous || mint();
}

/** معرّفٌ عشوائي، ومهرَبٌ لبيئةٍ بلا `crypto.randomUUID`. */
export function mintSubmissionToken(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
