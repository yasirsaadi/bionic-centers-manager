// نيّةُ رسالة التدريب — منطقٌ خالص، بلا قاعدة بيانات. `npm run test:ai-training-intent`.

import { explicitTrainingNavigation, isTrainingProgressOnlyQuery } from "./ai_training_intent";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

console.log("── أ. مثالُ المهمّة الحرفيّ ──");
check(isTrainingProgressOnlyQuery("وين وصلت بالتدريب؟") === true,
  "أ. «وين وصلت بالتدريب؟» ⟹ تقدّمٌ صِرف");

console.log("\n── ب. متغيّراتُ استعلام التقدّم ──");
check(isTrainingProgressOnlyQuery("شنو وصلت بالتدريب") === true, "ب.١. «شنو وصلت بالتدريب»");
check(isTrainingProgressOnlyQuery("لوين وصل تدريبي؟") === true, "ب.٢. «لوين وصل تدريبي؟»");
check(isTrainingProgressOnlyQuery("كم درس أكملت بالتدريب؟") === true, "ب.٣. «كم درس أكملت بالتدريب؟»");
check(isTrainingProgressOnlyQuery("شگد باقي علي بالتدريب؟") === true, "ب.٤. «شگد باقي علي بالتدريب؟»");
check(isTrainingProgressOnlyQuery("شنو حالة تدريبي؟") === true, "ب.٥. «شنو حالة تدريبي؟»");
check(isTrainingProgressOnlyQuery("ما تقدمي بالتدريب؟") === true, "ب.٦. «ما تقدمي بالتدريب؟»");

console.log("\n── ج. طلباتُ فعلٍ — يجب ألّا تُصنَّف تقدّماً صِرفاً (مثالا المهمّة) ──");
check(isTrainingProgressOnlyQuery("دربني من البداية") === false, "ج.١. «دربني من البداية»");
check(isTrainingProgressOnlyQuery("كمّل تدريبي") === false, "ج.٢. «كمّل تدريبي» — شدّةٌ في الفعل");
check(isTrainingProgressOnlyQuery("كمل تدريبي") === false, "ج.٣. «كمل تدريبي» — بلا شدّة");
check(isTrainingProgressOnlyQuery("ابدأ تدريبي من الأول") === false, "ج.٤. «ابدأ تدريبي من الأول»");
check(isTrainingProgressOnlyQuery("علّمني كيف أفتح صيانة") === false, "ج.٥. «علّمني كيف أفتح صيانة»");
check(isTrainingProgressOnlyQuery("افتح لي درس التدريب") === false, "ج.٦. «افتح لي درس التدريب»");
check(isTrainingProgressOnlyQuery("اختبرني بالتدريب") === false, "ج.٧. «اختبرني بالتدريب»");

console.log("\n── د. رسالةٌ مختلطة — إشارةُ تقدّمٍ وفعلٍ معاً ⟹ تبقى مفتوحة ──");
check(isTrainingProgressOnlyQuery("وين وصلت بالتدريب؟ كمّل من هناك") === false,
  "د.١. «وين وصلت بالتدريب؟ كمّل من هناك» — الفعلُ يعلو على استعلام الحالة");
check(isTrainingProgressOnlyQuery("شنو وصل تدريبي، اكمل من عندك") === false,
  "د.٢. «شنو وصل تدريبي، اكمل من عندك» — نفسُ الشيء بفعلٍ آخر");
check(isTrainingProgressOnlyQuery("وين وصلت بالتدريب؟ تابع من هناك") === false,
  "د.٣. «وين وصلت بالتدريب؟ تابع من هناك» — «تابع» فعلُ متابعةٍ كـ«كمل»/«استمر»"
    + " تماماً، وكان ناقصاً من ACTION_OVERRIDE_TOKENS فيُصنَّف خطأً تقدّماً صِرفاً");
check(explicitTrainingNavigation("وين وصلت بالتدريب؟ تابع من هناك") === "continue",
  "د.٤. نفسُ الجملة ⟹ continue أيضاً — «تابع» تُحسم ملاحةَ متابعةٍ صريحة لا مجرّد"
    + " استثناءٍ من التقدّم الصِرف");

console.log("\n── هـ. بلا سياقِ تدريبٍ إطلاقاً ⟹ لا تصنيف ──");
check(isTrainingProgressOnlyQuery("وين وصلت السيارة؟") === false,
  "هـ.١. «وين وصلت السيارة؟» — لا ذكر تدريب");
check(isTrainingProgressOnlyQuery("كم مريض عندي اليوم؟") === false,
  "هـ.٢. «كم مريض عندي اليوم؟» — سؤالٌ تشغيليّ لا علاقة له بالتدريب");
check(isTrainingProgressOnlyQuery("ما حالة WB-02119؟") === false,
  "هـ.٣. «ما حالة WB-02119؟» — حالةُ مريضٍ لا تدريب");

console.log("\n── و. حالاتٌ حدّية ──");
check(isTrainingProgressOnlyQuery("") === false, "و.١. سلسلةٌ فارغة");
check(isTrainingProgressOnlyQuery("   ") === false, "و.٢. بياضٌ فقط");
check(isTrainingProgressOnlyQuery("تدريب") === false, "و.٣. كلمةٌ واحدة بلا إشارة تقدّم");
check(isTrainingProgressOnlyQuery("وين وصلت") === false,
  "و.٤. إشارةُ تقدّمٍ بلا ذكر «تدريب» إطلاقاً ⟹ لا تصنيف (الافتراضُ الآمن)");

console.log("\n── ز. الملاحةُ الصريحة — مثالا المهمّة ──");
check(explicitTrainingNavigation("دربني من البداية") === "start_over",
  "ز.١. «دربني من البداية» ⟹ start_over");
check(explicitTrainingNavigation("كمّل تدريبي") === "continue",
  "ز.٢. «كمّل تدريبي» ⟹ continue");

console.log("\n── ح. متغيّراتُ الملاحة الصريحة ──");
check(explicitTrainingNavigation("ابدأ تدريبي من الأول") === "start_over",
  "ح.١. «ابدأ تدريبي من الأول» ⟹ start_over");
check(explicitTrainingNavigation("درّبني من جديد") === "start_over",
  "ح.٢. «درّبني من جديد» ⟹ start_over");
check(explicitTrainingNavigation("كمل تدريبي") === "continue",
  "ح.٣. «كمل تدريبي» (بلا شدّة) ⟹ continue");
check(explicitTrainingNavigation("تابع تدريبي") === "continue",
  "ح.٤. «تابع تدريبي» ⟹ continue");
check(explicitTrainingNavigation("استمر بالتدريب") === "continue",
  "ح.٥. «استمر بالتدريب» ⟹ continue");

console.log("\n── ط. لا ملاحةَ صريحة — تبقى على سلوكها القائم ──");
check(explicitTrainingNavigation("دربني") === null,
  "ط.١. «دربني» وحدها بلا «من البداية» ⟹ null — طلبٌ عامّ");
check(explicitTrainingNavigation("افتح لي درس التدريب") === null,
  "ط.٢. «افتح لي درس التدريب» ⟹ null — لا «من البداية» ولا فعلَ متابعة");
check(explicitTrainingNavigation("افتح الوحدة الثانية") === null,
  "ط.٣. اختيارٌ صريح باسم الوحدة ⟹ null — يبقى على سلوكه القائم");
check(explicitTrainingNavigation("وين وصلت بالتدريب؟") === null,
  "ط.٤. سؤالُ تقدّمٍ صِرف ⟹ null من هذه الدالّة — يُحجَب بـisTrainingProgressOnlyQuery"
    + " لا بهذه");
check(explicitTrainingNavigation("كمّل الطلب") === null,
  "ط.٥. «كمّل الطلب» ⟹ null — فعلُ متابعةٍ بلا سياق تدريبٍ إطلاقاً");
check(explicitTrainingNavigation("اعرض التقرير من البداية") === null,
  "ط.٦. «اعرض التقرير من البداية» ⟹ null — «من البداية» بلا سياق تدريبٍ ولا فعل تدريبيّ");
check(explicitTrainingNavigation("") === null, "ط.٧. سلسلةٌ فارغة");

console.log(`\n${failures === 0 ? "✅ نيّةُ التدريب مصنَّفةٌ صحيحاً في كل الحالات" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
