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

export const EXERCISE_IMAGE_FILES: Record<string, ExerciseImageFile> = {};

/** رابطُ الصورة إن وصلت، وإلّا `null`. */
export function exerciseImageUrl(key: string): string | null {
  const f = EXERCISE_IMAGE_FILES[key];
  return f ? EXERCISE_IMAGE_BASE + f.file : null;
}
