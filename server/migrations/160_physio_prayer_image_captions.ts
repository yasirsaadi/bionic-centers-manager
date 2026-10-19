// Migration 160: وصفُ صور الصلاة الثلاث كما وصلت (٢٠٢٦-١٠-١٩ — أرسلها المالكُ في المحادثة).
//
// الوصفُ يُكتب تحت الصورة في البطاقة، وكُتب في ترحيلات ١٤٥ و١٥٨ و١٥٩ قبل أن تصل — فلمّا وصلت خالفته الثلاث:
//   - «الركوع بثني الركبتين» (عِرقُ النسا، §4.ec): صورتُه ركوعٌ بظهرٍ مستقيمٍ أفقيّ ويدين على الركبتين — **والركبتان فيها مستقيمتان**،
//     فيقول الوصفُ ما فيها، وأنّ ثنيَ الركبتين قليلاً في الخطوات.
//   - «الصلاة مع الغضروف» (§4.eq): رسمان — جالسٌ على كعبيه على الأرض، وجالسٌ على كرسيّ — **بلا وسادة**.
//   - «الصلاة بعد الرباط» (§4.er): ثلاثةُ رسومٍ على كرسيّ — الجلوسُ معتدلاً ثمّ الركوعُ ثمّ السجودُ بانحناءٍ أكثر — **بلا ركوعٍ على وسادة**.
// **ولا يُكتب فوق تعديل إنسان** (قاعدةُ ١٤١ و١٤٤): يتغيّر الصفُّ إن كانت صورُه كما زرعها ترحيلُه بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { EXERCISES as SCIATICA } from "./145_physio_sciatica_detail";
import { EXERCISES as MENISCAL } from "./158_physio_meniscal_detail";
import { EXERCISES as ACL } from "./159_physio_acl_reconstruction_detail";

export const CAPTIONS: Record<string, { ar: string; en: string }> = {
  "prayer-bent-knee-ruku-1": {
    ar: "رجلٌ في الركوع: ظهرُه مستقيمٌ أفقيّ (الخطّ الأحمر) ويداه على ركبتيه (الدائرة) ونظرُه إلى موضع السجود — وثنيُ الركبتين قليلاً كما في الخطوات",
    en: "A man bowing in prayer: the back straight and level (red line), the hands on the knees (circle) and the gaze to the place of prostration — bend the knees slightly as in the steps",
  },
  "prayer-deep-flexion-meniscus-1": {
    ar: "رسمان: الجلوسُ على الكعبين على الأرض، والجلوسُ على كرسيّ واليدان على الفخذين — والوسادةُ تحت الأليتين في الخطوات",
    en: "Two drawings: sitting back on the heels on the floor, and sitting on a chair with the hands on the thighs — the cushion under the buttocks is in the steps",
  },
  "prayer-kneeling-after-acl-1": {
    ar: "الصلاةُ جلوساً على كرسيّ: الجلوسُ معتدلاً، ثمّ الركوعُ بانحناءٍ قليل، ثمّ السجودُ بانحناءٍ أكثر واليدان على الفخذين — والسجودُ راكعاً على وسادةٍ في الخطوات",
    en: "Praying seated on a chair: sitting upright, then bowing slightly, then prostrating with a deeper bow and the hands on the thighs — kneeling on a cushion is in the steps",
  },
};

export const SOURCES = [...SCIATICA, ...MENISCAL, ...ACL];

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export const name = "160_physio_prayer_image_captions";
export const sql = SOURCES.filter((e) => e.images.some((i) => CAPTIONS[i.key])).map((e) => {
  const before = seeded(e.images);
  const after = seeded(e.images.map((i) => (CAPTIONS[i.key] ? { ...i, ...CAPTIONS[i.key] } : i)));
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(after))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(before))}::jsonb;`;
}).join("\n");
