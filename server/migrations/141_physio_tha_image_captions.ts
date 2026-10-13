// Migration 141: وصفُ أربع صورٍ من صور ما بعد استبدال الورك كما وصلت (§4.dz التكملة — ٢٠٢٦-١٠-١٣).
//
// الوصفُ يُكتب تحت الصورة في البطاقة، وكُتب في ترحيل ١٤٠ قبل أن تصل الصور — فلمّا وصلت خالف أربعاً منها:
//   - «المقعد المرتفع» صورةُ المقعد وحده بلا مريض، والوصفُ يذكر مريضاً جالساً.
//   - «الحركة الآمنة» تُظهر قيودَ المدخل الخلفيّ وحده (تقاطعُ الساقين، ورفعُ الركبة فوق ٩٠°، والانحناءُ للأمام، والقرفصاءُ العميقة) —
//     والبطاقةُ بحسب المدخل، فيقول الوصفُ لأيّ مدخلٍ هي، كي لا يأخذها مريضُ المدخل الأماميّ قيوداً له.
//   - «النهوض من السرير» خطواتُه السبعُ كلُّها لا الجلوسُ وحده.
//   - «مُلبِس الجوارب» خطواتُه: يُلبَس الجوربُ عليه ثمّ تُدخَل القدم.
// **ولا يُكتب فوق تعديل إنسان**: يتغيّر الصفُّ إن كانت صورُه كما زرعها ١٤٠ بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { EXERCISES } from "./140_physio_tha_detail";

export const CAPTIONS: Record<string, { ar: string; en: string }> = {
  "raised-seat-transfer-hip-1": {
    ar: "مقعدُ مرحاضٍ مرتفع بمسندين يُركَّب فوق المرحاض",
    en: "A raised toilet seat with armrests fitted over the toilet",
  },
  "hip-safe-movement-1": {
    ar: "ما يُتجنّب بعد المدخل الخلفيّ: تقاطعُ الساقين، ورفعُ الركبة فوق ٩٠°، والانحناءُ للأمام، والقرفصاءُ العميقة — وتعليماتُ الجرّاح تحكم",
    en: "What to avoid after a posterior approach: crossing the legs, lifting the knee above 90°, bending forward and deep squatting — the surgeon's instructions govern",
  },
  "bed-mobility-hip-1": {
    ar: "النهوضُ من السرير خطوةً خطوة: ثنيُ الركبتين، والدورانُ ككتلةٍ واحدة ووسادةٌ بين الركبتين، ثمّ إنزالُ الساقين معاً والدفعُ باليدين للجلوس فالوقوف",
    en: "Getting out of bed step by step: knees bent, turning as one unit with a pillow between the knees, then lowering both legs together and pushing up with the hands to sit, then stand",
  },
  "dressing-aids-hip-1": {
    ar: "مُلبِسُ الجوارب: يُلبَس الجوربُ عليه، ثمّ يوضع أمام القدم وتُدخَل فيه وتُسحب حبالُه للأعلى",
    en: "A sock aid: the sock is pulled over it, then it is placed in front of the foot, the foot slipped in and the cords pulled up",
  },
};

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export const name = "141_physio_tha_image_captions";
export const sql = EXERCISES.filter((e) => e.images.some((i) => CAPTIONS[i.key])).map((e) => {
  const before = seeded(e.images);
  const after = seeded(e.images.map((i) => (CAPTIONS[i.key] ? { ...i, ...CAPTIONS[i.key] } : i)));
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(after))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(before))}::jsonb;`;
}).join("\n");
