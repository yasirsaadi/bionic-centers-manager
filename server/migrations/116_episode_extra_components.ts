// Migration 116: **أكثرُ من جزءٍ في طلبٍ واحد** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.ct).
//
// «حين يأتي مراجعٌ لشراء جزءٍ من طرفٍ صناعيّ فالاستمارةُ تعطي جزءاً واحداً — ماذا لو احتاج قالباً وسليكوناً، أو قدماً وقالباً وسليكوناً؟»
// والقرار: **«المطلوب» مربّعاتُ اختيار** — استمارةٌ واحدة ومعاينةٌ واحدة وسعرٌ واحد وأمرُ تصنيعٍ واحد للأجزاء معاً.
//
//   • patient_device_episodes.extra_components — **الأجزاءُ الإضافيّة** بعد الأوّل. والأوّلُ يبقى في `requested_item`/`component` كما كان،
//     فكلُّ قارئٍ قائمٍ يعمل بلا تغيير (يرى الجزءَ الأوّل)، والقرّاءُ الذين يجب أن يروا الكلَّ يقرؤون العمودين معاً (`requestedParts`).
//   • والقيدُ: **لا أجزاءَ إضافيّةً لجهازٍ كامل**، ومن الأجزاء الثمانية وحدها، ولا يتكرّر الأوّلُ فيها.
// عمودٌ على جدولٍ قائم بقيمةٍ افتراضيّةٍ فارغة — لا صفَّ قديمٌ يتغيّر، ولا مسَّ بكاسكيد الحذف ولا بالدمج.
export const name = "116_episode_extra_components";

export const sql = `
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS extra_components TEXT[] NOT NULL DEFAULT '{}'::text[];

DO $m116$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pde_extra_components') THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT chk_pde_extra_components CHECK (
      (component IS NOT NULL OR cardinality(extra_components) = 0)
      AND extra_components <@ ARRAY['socket','silicone','knee','tube','adapter','foot','foam_cover','foot_shell']::text[]
      AND NOT (COALESCE(component, '') = ANY(extra_components))
    );
  END IF;
END
$m116$;
`;
