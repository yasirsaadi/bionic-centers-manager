// Migration 164: وصفُ صورٍ بُدّلت لأنّ مصدرَها يمنع إعادةَ النشر (٢٠٢٦-١٠-٢٠، §4.ev).
//
// شروطُ موقع مستشفيات أكسفورد (`ouh.nhs.uk/help/terms-of-use`) تحصر تنزيلَ موادّه «للبحث والدراسة الخاصّة والاستعمال الداخليّ وحده» — والصورُ في التطبيق تُطبع
// للمريض وتُرسل له في تلغرام، فهي خارجَ ذلك. وكانت منه صورتان مسجَّلتان؛ فبُدّلت ملفّاتُهما في `shared/physio_exercise_media.ts`، وهذا الترحيلُ يكتب وصفَ ما صار:
//   - «تدوير الساعد بالمطرقة» (مرفقُ التنس، ١٥٢): صارت صورَ مستشفى كوين فكتوريا (شروطُها تسمح بإعادة النشر بذكر المصدر) — عصاً تُمسك من طرفها كالمطرقة:
//     عمودية، ثمّ الكفُّ إلى الأسفل، ثمّ إلى الأعلى؛ ولا صورةَ بمطرقةٍ حقيقية برخصةٍ مقبولة.
//   - «الاستناد المتدرّج على الكفّ نحو السجود» (كسرُ الكعبرة، ١٦٢): صارت صورتَي مستشفيات باث وحدها — الجلوسُ إلى الخلف ثمّ الميلُ إلى الأمام على اليدين
//     والركبتين، **بلا مرحلة الطاولة** (كانت من أكسفورد).
// **ولا يُكتب فوق تعديل إنسان** (قاعدةُ ١٤١ و١٤٤ و١٦٠): يتغيّر الصفُّ إن كانت صورُه كما زرعها ترحيلُه بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { EXERCISES as ELBOW } from "./152_physio_lateral_elbow_detail";
import { EXERCISES as DRF } from "./162_physio_distal_radius_detail";

export const CAPTIONS: Record<string, { ar: string; en: string }> = {
  "forearm-rotation-hammer-1": {
    ar: "المرفقُ مثنيٌّ بجانب الجسم وعصاً تُمسك من طرفها كالمطرقة: عموديةٌ، ثمّ الكفُّ إلى الأسفل، ثمّ إلى الأعلى — والمطرقةُ في الخطوات",
    en: "The elbow bent at the side with a bar held at one end like a hammer: upright, then palm down, then palm up — the hammer is in the steps",
  },
  "wrist-weight-bearing-progression-1": {
    ar: "على اليدين والركبتين: الجلوسُ إلى الخلف ثمّ الميلُ إلى الأمام والكفّان مسطّحتان — والطاولةُ قبلها والسجودُ بعدها في الخطوات",
    en: "On hands and knees: sitting back, then leaning forward with the palms flat — the table before it and prostration after it are in the steps",
  },
};

export const SOURCES = [...ELBOW, ...DRF];

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export const name = "164_physio_ouh_images_replaced";
export const sql = SOURCES.filter((e) => e.images.some((i) => CAPTIONS[i.key])).map((e) => {
  const before = seeded(e.images);
  const after = seeded(e.images.map((i) => (CAPTIONS[i.key] ? { ...i, ...CAPTIONS[i.key] } : i)));
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(after))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(before))}::jsonb;`;
}).join("\n");
