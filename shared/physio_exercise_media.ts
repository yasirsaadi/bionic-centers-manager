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
};

/** رابطُ الصورة إن وصلت، وإلّا `null`. */
export function exerciseImageUrl(key: string): string | null {
  const f = EXERCISE_IMAGE_FILES[key];
  return f ? EXERCISE_IMAGE_BASE + f.file : null;
}
