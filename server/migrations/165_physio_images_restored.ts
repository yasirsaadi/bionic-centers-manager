// Migration 165: الصورتان اللتان بدّلهما ترحيلُ ١٦٤ تعودان كما كانتا، ووصفُهما معهما (٢٠٢٦-١٠-٢٠، §4.ew).
//
// قرارُ المالك في اليوم نفسه: «استخدم حتى إن كانت بحقوق لأنّي لن أنشرها ولن أستخدمها تجارياً — استخدامٌ شخصيّ خاصّ ١٠٠٪». فعادت ملفّاتُ «التدوير بالمطرقة»
// (١٥٢) و«الاستناد المتدرّج على الكفّ» (١٦٢) الأصلية في `shared/physio_exercise_media.ts` — المطرقةُ نفسُها، ومرحلةُ الطاولة — وهذا الترحيلُ يعيد وصفَهما كما
// زرعه ترحيلاهما. **ولا يُكتب فوق تعديل إنسان** (قاعدةُ ١٦٠ و١٦٤): يتغيّر الصفُّ إن كانت صورُه كما كتبها ١٦٤ بالضبط، وإلّا بقي — وتكرارُه لا يفعل شيئاً.
import { lit } from "./physio_content";
import { CAPTIONS as REPLACED, SOURCES } from "./164_physio_ouh_images_replaced";

const seeded = (images: { key: string; ar: string; en: string; search: string }[]) =>
  images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));

export { SOURCES };
export const KEYS = Object.keys(REPLACED);

export const name = "165_physio_images_restored";
export const sql = SOURCES.filter((e) => e.images.some((i) => REPLACED[i.key])).map((e) => {
  const written164 = seeded(e.images.map((i) => (REPLACED[i.key] ? { ...i, ...REPLACED[i.key] } : i)));
  const original = seeded(e.images);
  return `UPDATE physio_exercises SET images = ${lit(JSON.stringify(original))}::jsonb, updated_at = now()
WHERE code = ${lit(e.code)} AND images = ${lit(JSON.stringify(written164))}::jsonb;`;
}).join("\n");
