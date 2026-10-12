// **خاناتُ الجهاز قوائمُ اختيار** (قرارُ المالك ٢٠٢٦-١٠-١٢، §4.dw) — كانت نصّاً حرّاً فيُكتب الشيءُ الواحد بألفاظٍ عدّة («هيدروليك»،
// «ركبه هايدروليك»…) فلا يُعدّ ولا يُقرأ واحداً، والخطأُ الإملائيّ يصل الخبيرَ في أمر التصنيع. فصارت للخمس قوائمُ المالك بحرفها،
// **ولكلٍّ من أربعٍ منها حقلٌ حرّ بجانبه** للموديل أو الملاحظة («موديل الركبة» …) — لا يُشترط، ويُعرض مع خانته في سطرها.
//
//   • **نوعُ الطرف بحسب الطرف نفسِه**: السفليُّ قائمتُه والعلويُّ قائمتُه — «لا يجوز يختار طرفاً سفلياً فتظهر له خلال المرفق».
//     والطرفُ المجهول (معاينةٌ بلا بترٍ مسجَّل) القائمتان معاً؛ **والسليكونيُّ التعويضيّ نصٌّ حرّ كما كان** (أذنٌ أو إصبع — قائمةُ المالك للأطراف).
//   • **نوعُ السليكون للعلويّ والسفليّ** «قفل محوري» أو «فاكيوم»، والسليكونيُّ التعويضيّ نصٌّ حرّ كما كان.
//   • **المرفقُ والكفّ** نصٌّ حرّ — لم تُعطَ لهما قائمة.
//   • **«لا ينطبق»** باقٍ في كلّ قائمة (§4.cq): ما لا يخصّ هذا الجهاز لا يمنع بيعاً صحيحاً.
//   • **والمكتوبُ قبل اليوم لا يُمحى**: يُعرض كما هو، والمعاينةُ القديمة تُعدَّل وهو فيها؛ والجديدُ من القائمة وحدها (`specChoiceProblems`).
//
// لا استيرادَ هنا من `limb_specs.ts` (يستوردنا هو) — النوعُ وحده.
import type { LimbKind } from "./limb_specs";

export const NOT_APPLICABLE_CHOICE = "لا ينطبق";

/** نوعُ الطرف السفليّ — بحرف المالك. */
export const LOWER_PROSTHESIS_TYPES = [
  "طرف لبتر جوبارت", "طرف لبتر خلال الكاحل", "طرف سايمز", "طرف تحت الركبة", "طرف خلال الركبة", "طرف فوق الركبة", "طرف خلال الحوض",
] as const;
/** نوعُ الطرف العلويّ — بحرف المالك. */
export const UPPER_PROSTHESIS_TYPES = [
  "طرف كف جزئي", "طرف خلال الكف", "طرف تحت المرفق", "طرف خلال المرفق", "طرف فوق المرفق", "طرف خلال الكتف",
] as const;
export const KNEE_TYPES = ["مقفول", "ميكانيك حر", "ميكانيك حديث", "هوائي هيدروليك", "هيدروليك", "ذكي أو بايونك"] as const;
export const FOOT_TYPES = ["ثابتة", "أحادية المحور", "سايمز اعتيادية", "سايمز كاربون", "كاربون رباعية المحاور"] as const;
export const SOCKET_TYPES = ["كاربون درجة أولى", "كاربون درجة ثانية"] as const;
/** نوعُ السليكون للأطراف العلوية والسفلية — نظامُ تثبيته. */
export const LINER_TYPES = ["قفل محوري", "فاكيوم"] as const;

/** **الحقلُ الحرّ بجانب الخانة** — مفتاحُه وعنوانُه وخانتُه. يُكتب بجهته كخانته (`kneeModel:right`). */
export const SPEC_COMPANIONS = [
  { key: "kneeModel", of: "kneeJointType", label: "موديل الركبة" },
  { key: "footModel", of: "footType", label: "موديل القدم" },
  { key: "socketNotes", of: "socketType", label: "ملاحظات السوكيت" },
  { key: "siliconModel", of: "siliconType", label: "موديل السليكون" },
] as const;
export const COMPANION_KEYS: readonly string[] = SPEC_COMPANIONS.map((c) => c.key);

/** حقلُ خانةٍ الحرّ — أو `null`. */
export const companionOf = (base: string): { key: string; label: string } | null => {
  const c = SPEC_COMPANIONS.find((x) => x.of === base);
  return c ? { key: c.key, label: c.label } : null;
};
/** خانةُ حقلٍ حرّ — `kneeModel` ⟵ `kneeJointType` — أو `null` لخانةٍ ليست حقلاً حرّاً. */
export const parentOfCompanion = (key: string): string | null => SPEC_COMPANIONS.find((x) => x.key === key)?.of ?? null;

/**
 * **قائمةُ خانةٍ لطرفٍ بنوعه** — أو `null` حين تبقى نصّاً حرّاً. `kind` نوعُ الطرف (`limbSlots`): `lower` · `upper` · `silicone` · `null` (مجهول).
 * و«لا ينطبق» ليست منها — تُضاف في الشاشة وتُقبل في الفحص دائماً.
 */
export function specChoices(base: string, kind: LimbKind | null): readonly string[] | null {
  switch (base) {
    case "prostheticType":
      if (kind === "lower") return LOWER_PROSTHESIS_TYPES;
      if (kind === "upper") return UPPER_PROSTHESIS_TYPES;
      if (kind === "silicone") return null;
      return [...LOWER_PROSTHESIS_TYPES, ...UPPER_PROSTHESIS_TYPES];
    case "kneeJointType": return KNEE_TYPES;
    case "footType": return FOOT_TYPES;
    case "socketType": return SOCKET_TYPES;
    case "siliconType": return kind === "silicone" ? null : LINER_TYPES;
    default: return null;
  }
}

/** **قيمةٌ مقبولةٌ لخانة**: من قائمتها، أو «لا ينطبق»، أو خانتُها حرّة. */
export function specChoiceAccepted(base: string, value: string, kind: LimbKind | null): boolean {
  const opts = specChoices(base, kind);
  return !opts || value === NOT_APPLICABLE_CHOICE || opts.includes(value);
}

/** **الخانةُ مع حقلها الحرّ نصّاً واحداً** للعرض والطباعة: «هيدروليك — موديل الركبة: 3R80». */
export function withCompanionText(base: string, value: string | null, companion: string | null): string | null {
  const c = companionOf(base);
  const extra = c && companion ? `${c.label}: ${companion}` : null;
  if (!value) return extra;
  return extra ? `${value} — ${extra}` : value;
}
