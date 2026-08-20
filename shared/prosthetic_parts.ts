// **ما المطلوب؟** — طرفٌ كامل أم جزءٌ منه. مصدرُ حقيقةٍ واحد.
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
// ══ وقائمةٌ واحدة لمسارين ═══════════════════════════════════════════════
// شراءُ جزءٍ جديد وصيانةُ جزءٍ قائم يسألان السؤال نفسه بالضبط. وقائمتان
// كانتا ستنحرفان: يُضاف «الأدابتر» إلى إحداهما فتُصان قطعةٌ لا تُباع.
//
// ══ ولماذا `full_prosthesis` داخل القائمة ═══════════════════════════════
// لأن الطلبَ **إمّا كلٌّ أو جزء**، وعمودٌ واحد يقول أيَّهما أوضحُ من علمٍ
// منفصلٍ وعمودٍ يناقضه. والصيانةُ وحدها تستثنيه: لا يُصان «الطرف كلُّه»
// — يُصان جزءٌ منه بعينه.

/** الأجزاءُ الثمانية التي تُباع مفردةً وتُصان مفردةً. */
export const PROSTHETIC_COMPONENTS = [
  "socket", "silicone", "knee", "tube", "adapter", "foot", "foam_cover", "foot_shell",
] as const;
export type ProstheticComponent = (typeof PROSTHETIC_COMPONENTS)[number];

/** الطلبُ كلُّه: طرفٌ كامل، أو واحدٌ من الأجزاء الثمانية. */
export const REQUESTED_ITEMS = ["full_prosthesis", ...PROSTHETIC_COMPONENTS] as const;
export type RequestedItem = (typeof REQUESTED_ITEMS)[number];

/**
 * العناوينُ العربية — **بألفاظ الفرع نفسها** كما نطقها المالك.
 *
 * ولا تُترجَم في الشاشة ولا تُشتَقّ: نصٌّ واحد يقرؤه الاستقبالُ والطبيبُ
 * والخبيرُ والمحاسب، فلا يسمّي كلٌّ منهم القطعة باسم.
 */
export const REQUESTED_ITEM_LABELS: Record<RequestedItem, string> = {
  full_prosthesis: "طرف صناعي كامل",
  socket: "القالب",
  silicone: "السليكون",
  knee: "الركبة",
  tube: "التيوب",
  adapter: "الأدابتر",
  foot: "القدم",
  foam_cover: "الغلاف الإسفنجي",
  foot_shell: "غلاف القدم",
};

export const isProstheticComponent = (v: unknown): v is ProstheticComponent =>
  typeof v === "string" && (PROSTHETIC_COMPONENTS as readonly string[]).includes(v);

export const isRequestedItem = (v: unknown): v is RequestedItem =>
  typeof v === "string" && (REQUESTED_ITEMS as readonly string[]).includes(v);

/**
 * عنوانُ ما طُلب — **والقيمةُ المجهولة لا تظهر باسمها البرمجيّ**.
 *
 * وغيابُ القيمة يُقرأ «طرف صناعي كامل»: صفوفُ ما قبل هذا الترحيل كلُّها
 * أطرافٌ كاملة، وهذا هو معناها الحقيقيّ لا افتراضٌ يُرمَّم به نقص.
 */
export function requestedItemLabel(v: unknown): string {
  if (v === null || v === undefined || v === "") return REQUESTED_ITEM_LABELS.full_prosthesis;
  return isRequestedItem(v) ? REQUESTED_ITEM_LABELS[v] : REQUESTED_ITEM_LABELS.full_prosthesis;
}

/** عنوانُ جزءٍ يُصان — و**لا يُقبل «الطرف كلُّه»** هنا. */
export function componentLabel(v: unknown): string | null {
  return isProstheticComponent(v) ? REQUESTED_ITEM_LABELS[v] : null;
}

/**
 * **الجزءُ المستخرَج من الطلب** — أو `null` للطرف الكامل.
 *
 * فالعمودان متلازمان: `requested_item = 'knee'` يعني `component = 'knee'`،
 * و`full_prosthesis` يعني `component IS NULL`. وهذه الدالّة تشتقّ الثاني من
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
 */
export function parseRequestedItem(v: unknown): {
  ok: boolean; value: RequestedItem | null; error?: string;
} {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (!isRequestedItem(v)) {
    return { ok: false, value: null, error: "المطلوب غير صالح — اختر من القائمة" };
  }
  return { ok: true, value: v };
}

/** ومثلُها للصيانة — **والطرفُ الكامل ليس جزءاً يُصان**. */
export function parseComponent(v: unknown): {
  ok: boolean; value: ProstheticComponent | null; error?: string;
} {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (v === "full_prosthesis") {
    return { ok: false, value: null, error: "حدّد الجزء المراد صيانته — لا يُصان الطرف كاملاً" };
  }
  if (!isProstheticComponent(v)) {
    return { ok: false, value: null, error: "الجزء غير صالح — اختر من القائمة" };
  }
  return { ok: true, value: v };
}

/** «المطلوب: ركبة» — السطرُ الذي يقرؤه الطبيبُ والخبير، بصيغةٍ واحدة. */
export function requestedItemLine(v: unknown): string {
  return `المطلوب: ${requestedItemLabel(v)}`;
}
