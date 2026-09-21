//  قراراتُ مربّع كتابة المساعد الذكي — **دوالُّ خالصة تُختبَر دخلاً وخرجاً**.
//
//  ولماذا خارجَ المكوّن: المشروع بلا مشغّل DOM، فقرارٌ يعيش داخل React لا
//  يُختبَر إلّا بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود
//  بصياغةٍ أخرى (درسُ ٤.u في CLAUDE.md).

/**
 * أقصى ارتفاعٍ للمربّع بالبكسل قبل أن يبدأ التمريرُ الرأسيّ داخله.
 *
 * عشرُ ريمات (`max-h-40` في Tailwind) — نحوُ ستّة أسطر. فالسؤالُ الطويل
 * يُقرأ كاملاً، والمربّعُ لا يبتلع النافذةَ فيُخفي الجوابَ الذي فوقه.
 */
export const AI_CHAT_INPUT_MAX_HEIGHT_PX = 160;

/**
 * ارتفاعُ المربّع الذي يتبع سطورَه فعلاً.
 *
 * كان `<Input>` سطراً واحداً، فالجملةُ الطويلة تمتدّ أفقياً **ويُقطَع أوّلُها
 * عن النظر** — يكتب الموظّفُ سؤالاً من سطرين فلا يرى ما كتبه. فصار المربّعُ
 * يتوسّع رأسياً حتى الحدّ ثمّ يمرّر.
 *
 * ويُستدعى بعد تصفير الارتفاع إلى `auto` — وإلّا لم ينكمش المربّعُ أبداً حين
 * يُحذَف نصٌّ أو يُفرَّغ بعد الإرسال، لأن `scrollHeight` لا ينقص تحت ارتفاعٍ
 * مفروضٍ سلفاً.
 */
export function grownInputHeight(
  scrollHeight: number,
  max: number = AI_CHAT_INPUT_MAX_HEIGHT_PX,
): number {
  if (!Number.isFinite(scrollHeight) || scrollHeight <= 0) return 0;
  return Math.min(Math.round(scrollHeight), max);
}

/** ما تقرؤه الدالّةُ من حدث لوحة المفاتيح — لا الحدثُ نفسُه. */
export interface AiChatKeyIntent {
  key: string;
  shiftKey: boolean;
  /** تركيبُ إدخالٍ جارٍ (IME) — ضغطةُ Enter فيه تُثبِّت الحرفَ لا تُرسل. */
  isComposing?: boolean;
}

/**
 * أتُرسِل هذه الضغطةُ السؤالَ؟
 *
 * **Enter يُرسل، وShift+Enter سطرٌ جديد** — فالمربّعُ صار متعدّدَ الأسطر،
 * ولا بدّ من بابٍ يكتب به الموظّفُ سطراً ثانياً بلا أن يُرسل.
 *
 * **وتركيبُ الإدخال يُستثنى**: لوحاتُ الإدخال التي تركّب الحروف (IME) ترسل
 * `Enter` لتثبيت ما رُكِّب — فإرسالُ السؤال عندها يقطعه في منتصف كلمة.
 */
export function shouldSendOnKey(e: AiChatKeyIntent): boolean {
  if (e.key !== "Enter") return false;
  if (e.shiftKey) return false;
  if (e.isComposing) return false;
  return true;
}
