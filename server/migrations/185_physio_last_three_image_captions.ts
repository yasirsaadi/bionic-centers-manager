// Migration 185: وصفُ الصور الثلاث الأخيرة في «الصور المطلوبة» كما وصلت (٢٠٢٦-١٠-٢٤).
//
// الوصفُ يُكتب تحت الصورة في البطاقة، وكُتب في ترحيلات ١٦١ و١٦٢ و١٧٨ قبل أن تصل — فلمّا وصلت خالفته الثلاث:
//   - «الرسغ المستقيم في العمل والبيت والصلاة» (النفقُ الرسغي، §4.et): وضعها المالكُ في Drive — أربعةُ رسومٍ لليدين على لوحة المفاتيح،
//     **لا رسغاً مرفوعاً من الجانب**: الرسغُ مستقيمٌ مع الساعد من الأعلى ومن الجانب (صحيح)، ومائلٌ إلى الجانب في رسمين (خطأ).
//   - «عصر المنشفة» (ما بعد كسر الكعبرة، §4.eu): وضعها المالكُ في Drive — امرأةٌ من الجانب تعصر منشفةً بيديها أمام صدرها، وسهمان متعاكسان.
//   - «الوضوء مع المعلاق» (ما بعد إصلاح الكفّة، §4.fi): لم يجدها المالكُ فكوّنها المساعدُ من صورتين — **لا امرأةً ولا طشتاً ولا إبريقاً فيها**:
//     رجالٌ يتوضّؤون جالسين على مقاعدَ حجرية صغيرة، وذراعٌ في المعلاق تمسك الصابونَ واليدُ السليمة تمسك المنشفة.
// **ولا يُكتب فوق تعديل إنسان** (قاعدةُ ١٤١ و١٤٤ و١٦٠): يتغيّر الصفُّ إن كانت صورُه كما زرعها ترحيلُه بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { EXERCISES as CTS } from "./161_physio_carpal_tunnel_detail";
import { EXERCISES as DRF } from "./162_physio_distal_radius_detail";
import { EXERCISES as RCR } from "./178_physio_rotator_cuff_repair_detail";

export const CAPTIONS: Record<string, { ar: string; en: string }> = {
  "neutral-wrist-tasks-1": {
    ar: "أربعةُ رسومٍ لليدين على لوحة المفاتيح: الرسغُ مستقيمٌ مع الساعد من الأعلى ومن الجانب (صحيح)، ومائلٌ إلى الجانب في الرسمين الآخرين (خطأ) — والخطُّ المتقطّع يُظهر الاستقامة، والبيتُ والصلاةُ في الخطوات",
    en: "Four drawings of the hands on a keyboard: the wrist straight with the forearm from above and from the side (right), and bent sideways in the other two (wrong) — the dashed line shows the alignment; home and prayer are in the steps",
  },
  "towel-wring-1": {
    ar: "امرأةٌ من الجانب تمسك منشفةً بيضاء بيديها أمام صدرها وتعصرها، وسهمان أحمرُ وأزرق لاتّجاهَي الدوران المتعاكسين",
    en: "A woman seen from the side holding a white towel in both hands in front of her chest and wringing it, with a red and a blue arrow for the two opposite directions of turning",
  },
  "rcr-wudu-with-sling-1": {
    ar: "صورتان: رجالٌ يتوضّؤون جالسين على مقاعدَ حجرية صغيرة ويغسلون أقدامَهم، وذراعٌ في المعلاق تمسك الصابونَ ثابتاً واليدُ السليمة تمسك المنشفة لتغسل — والطشتُ والإبريقُ والغطاءُ المانع في الخطوات",
    en: "Two photos: men doing wudu seated on small stone stools and washing their feet, and an arm in a sling holding the soap steady while the good hand holds the flannel to wash — the basin, jug and waterproof cover are in the steps",
  },
};

export const SOURCES = [...CTS, ...DRF, ...RCR];

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export const name = "185_physio_last_three_image_captions";
export const sql = SOURCES.filter((e) => e.images.some((i) => CAPTIONS[i.key])).map((e) => {
  const before = seeded(e.images);
  const after = seeded(e.images.map((i) => (CAPTIONS[i.key] ? { ...i, ...CAPTIONS[i.key] } : i)));
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(after))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(before))}::jsonb;`;
}).join("\n");
