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

/** المسارات الثلاثة القائمة — **لا رابع**. */
export type ServiceFlow =
  /** `POST /api/patients/:id/add-case-type` — قرارٌ بلا مال ولا أمر تصنيع. */
  | { kind: "case_type"; caseType: "amputee" | "medical_support" | "physiotherapy" }
  /** `POST /api/patients/:id/new-service` — قيدٌ مالي على خيطٍ قائم. */
  | { kind: "new_service"; serviceType: "additional_therapy" | "consultation" | "other" }
  /** `POST /api/manufacturing/maintenance-visit` — زيارة وأمر صيانة معاً. */
  | { kind: "maintenance_visit" }
  /** `POST /api/patients/:patientId/device-episodes` — جهازٌ جديد على خيطٍ قائم. */
  | { kind: "device_episode"; serviceType: "prosthetic" | "medical_support" };

/** النقاط التي يجوز أن يصل إليها موزِّع الخدمات — قائمة مغلقة. */
export const FLOW_ENDPOINTS: Record<ServiceFlow["kind"], string> = {
  case_type: "/api/patients/:id/add-case-type",
  new_service: "/api/patients/:id/new-service",
  maintenance_visit: "/api/manufacturing/maintenance-visit",
  device_episode: "/api/patients/:patientId/device-episodes",
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

export type LauncherGroup = "device" | "physio" | "other";

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

export const GROUP_LABELS: Record<LauncherGroup, string> = {
  device: "خدمات الأجهزة",
  physio: "العلاج الطبيعي",
  other: "خدمات أخرى",
};

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
    group: "device",
    flow: { kind: "device_episode", serviceType },
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
  const hasDevice = hasProsthetic || hasSupport;

  return [
    {
      id: "prosthetic_case",
      label: "أطراف صناعية",
      description: "إضافة حالة أطراف للمريض",
      group: "device",
      flow: { kind: "case_type", caseType: "amputee" },
      disabled: hasProsthetic,
      disabledReason: hasProsthetic ? DEVICE_EXISTS : undefined,
    },
    {
      id: "support_case",
      label: "مساند طبية",
      description: "إضافة حالة مساند للمريض",
      group: "device",
      flow: { kind: "case_type", caseType: "medical_support" },
      disabled: hasSupport,
      disabledReason: hasSupport ? DEVICE_EXISTS : undefined,
    },
    newDeviceOption(p, "prosthetic", hasProsthetic, "طرف صناعي جديد"),
    newDeviceOption(p, "medical_support", hasSupport, "مسند طبي جديد"),
    {
      id: "maintenance",
      label: "صيانة طرف/مسند",
      description: "فتح زيارة وأمر صيانة",
      group: "device",
      flow: { kind: "maintenance_visit" },
      disabled: !hasDevice,
      disabledReason: hasDevice ? undefined : "لا يوجد طرف أو مسند على ملف المريض",
    },
    {
      id: "physio_case",
      label: "علاج طبيعي",
      description: "إضافة حالة علاج طبيعي للمريض",
      group: "physio",
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
      group: "physio",
      flow: { kind: "new_service", serviceType: "additional_therapy" },
      disabled: !hasPhysio,
      disabledReason: hasPhysio ? undefined : "تُفتَح حالة علاج طبيعي أولاً",
    },
    {
      id: "consultation",
      label: "استشارة طبية",
      description: "تسجيل استشارة على ملف المريض",
      group: "other",
      flow: { kind: "new_service", serviceType: "consultation" },
      disabled: false,
    },
    {
      id: "other",
      label: "خدمة أخرى",
      description: "خدمة لا مسار خاصّ لها",
      group: "other",
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
