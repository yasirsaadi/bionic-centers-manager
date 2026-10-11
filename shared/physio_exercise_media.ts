// **صورُ بطاقات التمارين التي وصلت** (§4.cx). المالكُ يجمعها من الإنترنت بكلمات البحث المكتوبة في كلّ بطاقة، فتُضغَط وتوضع في
// `client/public/physio-exercises/` باسم رمزها، ويُسجَّل هنا مصدرُها. **صورةٌ لا سطرَ لها هنا تُعرض «صورة منتظرة» برمزها وكلمات بحثها**
// — فلا رابطَ مكسور، ولا ترحيلَ لكلّ دفعة صور: البطاقةُ في القاعدة تقول ما يجب أن تُظهره الصورة، وهذا الملفُّ يقول أين هي.

export interface ExerciseImageFile {
  /** اسمُ الملفّ تحت `/physio-exercises/` — رمزُ الصورة نفسُه بامتداده. */
  file: string;
  /** المصدرُ كما وجده المالك (اسمُ الموقع)، ورابطُه إن عُرف. */
  credit?: string | null;
  sourceUrl?: string | null;
}

export const EXERCISE_IMAGE_BASE = "/physio-exercises/";

//  **الدفعةُ الأولى — صورُ «ألم أسفل الظهر المزمن» السبعُ والعشرون** (٢٠٢٦-١٠-٠٩، §4.cx): جمعها المالكُ من الإنترنت بكلمات البحث في
//  مجلّد Drive، فضُغطت WebP (أطولُ ضلعٍ ١٠٠٠ نقطة) وقُصّ منها ما احتاج: «رفعُ الكيتل بيل» وصلت صورةً واحدة بثلاث مراحل لخانتين ⟵ «البداية»
//  للأولى و«الوقوف» للثانية؛ ومن «الطائر والكلب» وضعيةُ البداية، ومن «إمالة الحوض» الوضعُ المحايد، ومن «رفع الصدر» الوضعُ المرفوع.
//  **والمصدرُ اسمُ الموقع المكتوب على الصورة نفسِها** — وما لم يُكتب عليه موقعٌ بلا مصدر، ولا رابطَ لأيٍّ منها (لم يصل).
export const EXERCISE_IMAGE_FILES: Record<string, ExerciseImageFile> = {
  "abdominal-bracing-1": { file: "abdominal-bracing-1.webp", credit: "Fitness Programer" },
  "bird-dog-1": { file: "bird-dog-1.webp" },
  "bird-dog-2": { file: "bird-dog-2.webp", credit: "Verywell Fit" },
  "cat-camel-1": { file: "cat-camel-1.webp" },
  "cat-camel-2": { file: "cat-camel-2.webp" },
  "diaphragmatic-breathing-1": { file: "diaphragmatic-breathing-1.webp", credit: "Shutterstock" },
  "front-plank-1": { file: "front-plank-1.webp", credit: "MyFitnessPal" },
  "glute-bridge-1": { file: "glute-bridge-1.webp", credit: "Adobe Stock" },
  "glute-bridge-2": { file: "glute-bridge-2.webp" },
  "graded-walking-1": { file: "graded-walking-1.webp", credit: "PIXTA" },
  "hip-hinge-1": { file: "hip-hinge-1.webp", credit: "Shakti Physio Wellness" },
  "hip-hinge-2": { file: "hip-hinge-2.webp" },
  "kettlebell-deadlift-1": { file: "kettlebell-deadlift-1.webp" },
  "kettlebell-deadlift-2": { file: "kettlebell-deadlift-2.webp" },
  "knee-to-chest-1": { file: "knee-to-chest-1.webp", credit: "Healthline" },
  "lower-trunk-rotation-1": { file: "lower-trunk-rotation-1.webp" },
  "mcgill-curl-up-1": { file: "mcgill-curl-up-1.webp", credit: "VectorStock" },
  "pelvic-tilt-1": { file: "pelvic-tilt-1.webp" },
  "pelvic-tilt-2": { file: "pelvic-tilt-2.webp", credit: "Tummee" },
  "prone-press-up-1": { file: "prone-press-up-1.webp" },
  "prone-press-up-2": { file: "prone-press-up-2.webp" },
  "side-plank-1": { file: "side-plank-1.webp" },
  "side-plank-2": { file: "side-plank-2.webp", credit: "Fitwirr" },
  "sit-to-stand-1": { file: "sit-to-stand-1.webp" },
  "sit-to-stand-2": { file: "sit-to-stand-2.webp" },
  "split-squat-1": { file: "split-squat-1.webp" },
  "suitcase-carry-1": { file: "suitcase-carry-1.webp", credit: "Kettlebell Workouts" },
  //  **الدفعةُ الثانية — صورُ «ألم أسفل الظهر الحادّ» الستّ** (٢٠٢٦-١٠-١٠، §4.dg): المجلّدُ نفسُه. «التدحرج ١» لوحُ النهوض وحده (C) من ثلاثة،
  //  فالثانيةُ تحمل التسلسلَ كلَّه؛ و«البسط من الوقوف» بوضعيّتَيه (البطاقةُ لها صورةٌ واحدة) بلا شريط العنوان الإنكليزيّ تحتهما؛
  //  و«الرقم ٤ جالساً» الصورةُ داخل إطارها الزخرفيّ.
  "figure-4-stretch-1": { file: "figure-4-stretch-1.webp", credit: "Web Exercises" },
  "figure-4-stretch-2": { file: "figure-4-stretch-2.webp" },
  "hook-lying-march-1": { file: "hook-lying-march-1.webp" },
  "log-roll-1": { file: "log-roll-1.webp" },
  "log-roll-2": { file: "log-roll-2.webp" },
  "standing-extension-1": { file: "standing-extension-1.webp" },
  //  **الدفعةُ الثالثة — صورُ «ألم الرقبة الميكانيكيّ»: خمسَ عشرةَ من سبعَ عشرة** (٢٠٢٦-١٠-١١، §4.dh): المجلّدُ نفسُه. «الدوران» صفُّه من لوحةٍ بستّة
  //  صفوف و«الميل الجانبيّ» لوحتُه من عشر؛ و«السحب للخلف» الوضعُ الصحيح وحده؛ و«تثبيت اللوحين» لوحتا «للأسفل» و«للخلف» من ستّ؛ و«السناغ» صورتا
  //  الدوران (٣ و٤) بلا رقميهما؛ و«الرفع الجانبيّ للوح» بلا عنوانه؛ و«الانقباض الثابت» ملفٌّ واحد لخانتين: الجبهةُ للأولى والجانبان للثانية؛
  //  و«التجديف» الشكلُ الكامل وحده. **و«نهايةُ التجديف» و«Y منبطحاً» لم تصلا** — الملفّان أظهرا البدايةَ و«T» — فتبقيان «صورة منتظرة».
  "band-row-1": { file: "band-row-1.webp" },
  "cervical-isometrics-1": { file: "cervical-isometrics-1.webp" },
  "cervical-isometrics-2": { file: "cervical-isometrics-2.webp" },
  "cervical-retraction-1": { file: "cervical-retraction-1.webp", credit: "Shutterstock" },
  "chin-tuck-supine-1": { file: "chin-tuck-supine-1.webp" },
  "chin-tuck-supine-2": { file: "chin-tuck-supine-2.webp" },
  "deep-neck-flexor-endurance-1": { file: "deep-neck-flexor-endurance-1.webp" },
  "levator-scapulae-stretch-1": { file: "levator-scapulae-stretch-1.webp", credit: "BackIntelligence" },
  "neck-arom-1": { file: "neck-arom-1.webp", credit: "@elite.physio.in" },
  "neck-arom-2": { file: "neck-arom-2.webp" },
  "prone-y-t-1": { file: "prone-y-t-1.webp" },
  "scapular-setting-1": { file: "scapular-setting-1.webp" },
  "self-snag-rotation-1": { file: "self-snag-rotation-1.webp" },
  "thoracic-extension-towel-1": { file: "thoracic-extension-towel-1.webp" },
  "upper-trap-stretch-1": { file: "upper-trap-stretch-1.webp" },
};

/** رابطُ الصورة إن وصلت، وإلّا `null`. */
export function exerciseImageUrl(key: string): string | null {
  const f = EXERCISE_IMAGE_FILES[key];
  return f ? EXERCISE_IMAGE_BASE + f.file : null;
}
