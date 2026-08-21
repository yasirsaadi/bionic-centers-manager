// **ما المطلوب؟** — جهازٌ كامل أم جزءٌ منه. مصدرُ حقيقةٍ واحد.
//
// ══ لماذا يلزم أصلاً ═══════════════════════════════════════════════════
// المريضُ العائد لا يطلب طرفاً كاملاً في الغالب: تنكسر ركبةٌ، أو يتمزّق
// سليكون، أو يبلى غلافُ قدم. وكان النظام لا يعرف إلّا «طرف صناعي جديد»،
// فيُكتب الجزءُ المطلوب في **ملاحظةٍ حرّة** إن كُتب أصلاً — فلا يُبحَث عنه
// ولا يُحصى ولا يقرؤه الخبير في أمره ولا الطبيبُ في طلبه.
//
// ولا يكفي أن يُقال في نصّ: «الركبة» في ملاحظةٍ لا تُميَّز عن «كسرت الركبة»
// في شكوى المريض. فالقيمةُ **منظَّمة**: عمودٌ محروسٌ بقيدٍ في القاعدة،
// يُقرأ ويُصفّى ويُجمَع.
//
// ══ ولماذا `full_device` لا `full_prosthesis` ═══════════════════════════
// **جدولُ الحلقات مشترَك بين الأطراف والمساند.** فقيمةٌ اسمُها «طرفٌ كامل»
// على حلقةِ مسندٍ طبيّ **كذبٌ في العمود نفسه**: تُقرأ في التقارير وفي
// السجلّ وفي أيّ استعلامٍ لاحق فتصف مسنداً بأنه طرف. والسنتينلُ محايد،
// والعنوانُ يُشتقّ من نوع الخدمة عند العرض:
//
//   أطراف + `full_device`  ⟶  «طرف صناعي كامل»
//   مساند + `full_device`  ⟶  «مسند طبي كامل»
//
// ══ والأجزاءُ للأطراف وحدها ═════════════════════════════════════════════
// «الركبة» و«القالب» قطعُ طرفٍ صناعيّ بعينها. فطلبُ «ركبة» على مسندٍ طبيّ
// خلطٌ **يُردّ لا يُصحَّح**: تصحيحُه إلى «كامل» كان سيمرّر طلباً لم يقصده أحد.
//
// ══ وقائمةٌ واحدة لمسارين ═══════════════════════════════════════════════
// شراءُ جزءٍ جديد وصيانةُ جزءٍ قائم يسألان السؤال نفسه بالضبط. وقائمتان
// كانتا ستنحرفان: يُضاف «الأدابتر» إلى إحداهما فتُصان قطعةٌ لا تُباع.

/** نوعا الخدمة اللذان يشتركان في جدول الحلقات. */
export const DEVICE_SERVICE_TYPES = ["prosthetic", "medical_support"] as const;
export type DeviceServiceKind = (typeof DEVICE_SERVICE_TYPES)[number];

export const isDeviceServiceKind = (v: unknown): v is DeviceServiceKind =>
  typeof v === "string" && (DEVICE_SERVICE_TYPES as readonly string[]).includes(v);

/** الأجزاءُ الثمانية التي تُباع مفردةً وتُصان مفردةً — **للأطراف وحدها**. */
export const PROSTHETIC_COMPONENTS = [
  "socket", "silicone", "knee", "tube", "adapter", "foot", "foam_cover", "foot_shell",
] as const;
export type ProstheticComponent = (typeof PROSTHETIC_COMPONENTS)[number];

/** **الجهازُ كاملاً** — سنتينلٌ محايد يصلح للأطراف وللمساند معاً. */
export const FULL_DEVICE = "full_device" as const;

/** الطلبُ كلُّه: جهازٌ كامل، أو واحدٌ من الأجزاء الثمانية. */
export const REQUESTED_ITEMS = [FULL_DEVICE, ...PROSTHETIC_COMPONENTS] as const;
export type RequestedItem = (typeof REQUESTED_ITEMS)[number];

/**
 * عناوينُ الأجزاء — **بألفاظ الفرع نفسها** كما نطقها المالك.
 *
 * ولا تُترجَم في الشاشة ولا تُشتَقّ: نصٌّ واحد يقرؤه الاستقبالُ والطبيبُ
 * والخبيرُ والمحاسب، فلا يسمّي كلٌّ منهم القطعة باسم.
 */
export const COMPONENT_LABELS: Record<ProstheticComponent, string> = {
  socket: "القالب",
  silicone: "السليكون",
  knee: "الركبة",
  tube: "التيوب",
  adapter: "الأدابتر",
  foot: "القدم",
  foam_cover: "الغلاف الإسفنجي",
  foot_shell: "غلاف القدم",
};

/**
 * عنوانُ «الجهاز كاملاً» — **مشتقٌّ من نوع الخدمة لا مخزَّن**.
 *
 * عمودٌ واحد وعنوانان: المسندُ مسندٌ والطرفُ طرف، والقيمةُ المخزَّنة
 * محايدةٌ فلا تكذب على أيٍّ منهما.
 */
export const FULL_DEVICE_LABELS: Record<DeviceServiceKind, string> = {
  prosthetic: "طرف صناعي كامل",
  medical_support: "مسند طبي كامل",
};
/** وحين لا يُعرَف نوعُ الخدمة (سجلٌّ عامّ) يبقى الوصفُ محايداً صادقاً. */
export const FULL_DEVICE_NEUTRAL_LABEL = "جهاز كامل";

export const isProstheticComponent = (v: unknown): v is ProstheticComponent =>
  typeof v === "string" && (PROSTHETIC_COMPONENTS as readonly string[]).includes(v);

export const isRequestedItem = (v: unknown): v is RequestedItem =>
  typeof v === "string" && (REQUESTED_ITEMS as readonly string[]).includes(v);

/**
 * عنوانُ ما طُلب — **والقيمةُ المجهولة لا تظهر باسمها البرمجيّ**.
 *
 * وغيابُ القيمة يُقرأ «جهازاً كاملاً»: صفوفُ ما قبل هذا الترحيل كلُّها
 * أجهزةٌ كاملة، وهذا هو معناها الحقيقيّ لا افتراضٌ يُرمَّم به نقص.
 *
 * @param serviceType نوعُ الخدمة إن عُرف — فيُسمّى الكاملُ باسمه الصحيح.
 */
export function requestedItemLabel(v: unknown, serviceType?: unknown): string {
  if (isProstheticComponent(v)) return COMPONENT_LABELS[v];
  return isDeviceServiceKind(serviceType)
    ? FULL_DEVICE_LABELS[serviceType]
    : FULL_DEVICE_NEUTRAL_LABEL;
}

/** عنوانُ جزءٍ يُصان — و**لا يُقبل «الجهاز كلُّه»** هنا. */
export function componentLabel(v: unknown): string | null {
  return isProstheticComponent(v) ? COMPONENT_LABELS[v] : null;
}

/**
 * **الجزءُ المستخرَج من الطلب** — أو `null` للجهاز الكامل.
 *
 * فالعمودان متلازمان: `requested_item = 'knee'` يعني `component = 'knee'`،
 * و`full_device` يعني `component IS NULL`. وهذه الدالّة تشتقّ الثاني من
 * الأوّل فلا يُكتبان بيدين فينحرفا.
 */
export function componentOfRequest(item: unknown): ProstheticComponent | null {
  return isProstheticComponent(item) ? item : null;
}

/**
 * تطبيعُ ما يصل من العميل — **والمجهولُ يُردّ لا يُصحَّح بصمت**.
 *
 * `null` تعني «لم يُرسَل»، والدالّةُ تفرّق بينها وبين «أُرسل ما لا يُعرَف»:
 * الأولى قد تكون مشروعةً (نموذجٌ قديم)، والثانية خطأٌ يُقال.
 *
 * @param serviceType حين يُمرَّر، **تُردّ الأجزاءُ على غير الأطراف** —
 *   وهذا هو الحارسُ الذي يمنع «ركبةً» على مسندٍ طبيّ.
 */
export function parseRequestedItem(v: unknown, serviceType?: unknown): {
  ok: boolean; value: RequestedItem | null; error?: string;
} {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (!isRequestedItem(v)) {
    return { ok: false, value: null, error: "المطلوب غير صالح — اختر من القائمة" };
  }
  if (isProstheticComponent(v) && serviceType !== undefined
      && serviceType !== "prosthetic") {
    return {
      ok: false, value: null,
      error: "الأجزاء للأطراف الصناعية فقط — المسند الطبي يُطلَب كاملاً",
    };
  }
  return { ok: true, value: v };
}

/** ومثلُها للصيانة — **والجهازُ الكامل ليس جزءاً يُصان**. */
export function parseComponent(v: unknown): {
  ok: boolean; value: ProstheticComponent | null; error?: string;
} {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (v === FULL_DEVICE) {
    return { ok: false, value: null, error: "حدّد الجزء المراد صيانته — لا يُصان الجهاز كاملاً" };
  }
  if (!isProstheticComponent(v)) {
    return { ok: false, value: null, error: "الجزء غير صالح — اختر من القائمة" };
  }
  return { ok: true, value: v };
}

/** «المطلوب: ركبة» — السطرُ الذي يقرؤه الطبيبُ والخبير، بصيغةٍ واحدة. */
export function requestedItemLine(v: unknown, serviceType?: unknown): string {
  return `المطلوب: ${requestedItemLabel(v, serviceType)}`;
}

/** خياراتُ «ما المطلوب؟» لنوع خدمةٍ بعينه — القائمةُ نفسها في كل شاشة. */
export function requestedItemOptions(
  serviceType: unknown,
): { value: RequestedItem; label: string }[] {
  const full = { value: FULL_DEVICE, label: requestedItemLabel(FULL_DEVICE, serviceType) };
  //  **والمساندُ بلا أجزاء**: قائمةٌ تعرض «ركبة» على مسندٍ تدعو إلى الخطأ
  //  الذي يردّه الخادم بعدها — فالمنعُ يبدأ من ألّا يُعرَض.
  if (serviceType !== "prosthetic") return [full];
  return [full, ...PROSTHETIC_COMPONENTS.map((c) => ({
    value: c as RequestedItem, label: COMPONENT_LABELS[c],
  }))];
}
