// Migration 144: وصفُ صورتين من صور ألم الكعب الأخمصيّ كما وصلتا (§4.eb التكملة — ٢٠٢٦-١٠-١٤).
//
// الوصفُ يُكتب تحت الصورة في البطاقة، وكُتب في ترحيل ١٤٣ قبل أن تصل الصور — فلمّا وصلت خالف اثنتين منها:
//   - «التشريط» صورتُه مراحلُ أربع (A–D): شريطٌ حول الكعب على جانبي القدم، ثمّ شريطان متقاطعان تحت القوس، ثمّ شرائطُ عرضية —
//     شكلٌ من أشكال Low-Dye فيه التقاطع، والوصفُ كان يذكر شريطاً حول مقدّم القدم لا تُظهره. فيقول الوصفُ ما في الصورة، وأنّ الخطواتِ المكتوبة هي المرجع.
//   - «القدم القصيرة» صورتُها جالسٌ والقدمُ مرتخيةٌ فوق القدم مفعَّلةً بسهميها — لا قدمٌ واحدة.
// **ولا يُكتب فوق تعديل إنسان**: يتغيّر الصفُّ إن كانت صورُه كما زرعها ١٤٣ بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { EXERCISES } from "./143_physio_plantar_heel_detail";

export const CAPTIONS: Record<string, { ar: string; en: string }> = {
  "low-dye-taping-1": {
    ar: "مراحلُ التشريط A–D تحت القدم: شريطٌ حول الكعب على جانبيها، ثمّ شريطان متقاطعان تحت القوس، ثمّ شرائطُ عرضية تغطّيه — شكلٌ من أشكال Low-Dye، والخطواتُ المكتوبة هي المرجع",
    en: "Taping stages A–D under the foot: a strip around the heel along both sides, then two strips crossing under the arch, then transverse strips covering it — one form of Low-Dye; the written steps are the reference",
  },
  "short-foot-1": {
    ar: "جالساً والقدمان على الأرض: فوقُ القدمُ مرتخية، وتحتها القوسُ مرتفعٌ والإبهامُ والكعبُ يتقاربان (السهمان) والأصابعُ ممدودة",
    en: "Seated with the feet on the floor: above, the foot relaxed; below, the arch raised as the big toe and the heel draw together (the arrows) with the toes long",
  },
};

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export const name = "144_physio_heel_image_captions";
export const sql = EXERCISES.filter((e) => e.images.some((i) => CAPTIONS[i.key])).map((e) => {
  const before = seeded(e.images);
  const after = seeded(e.images.map((i) => (CAPTIONS[i.key] ? { ...i, ...CAPTIONS[i.key] } : i)));
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(after))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(before))}::jsonb;`;
}).join("\n");
