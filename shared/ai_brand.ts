// **اسمُ وكيل العلاج الطبيعي كما يراه الموظّفون: «Bionic AI»** (قرارُ المالك ٢٠٢٦-١١-٢٨ — «نغيّر اسم Opus إلى Bionic AI في كلّ موضع يظهر به»).
// النموذجُ نفسُه لم يتغيّر (`OPUS_MODEL_ID`) ولا الأسماءُ الداخلية في الشيفرة والقاعدة (`origin = 'opus'` · `physio_opus_*`).
// وما كُتب في القاعدة قبل التغيير بالاسم القديم (اسمُ الكاتب «Claude Opus» وأسبابُ الأخطاء وسطورُ التدقيق وملاحظاتُ البوّابات)
// **لا يُعاد كتابتُه** — يُبدَّل عند العرض وحده (`brandAiText`، وفي الخادم `installAiBrandJson`).
export const AI_BRAND = "Bionic AI";

const LEGACY = /Claude Opus|(?<![A-Za-z_\-])Opus(?![A-Za-z_0-9])/g;
//  «خدمةُ Claude» في أسباب الأخطاء المخزَّنة قبل ٢٠٢٦-١١-٢٨ (رسالةُ الرفض الأولى على الإنتاج) — كلمةُ الخدمة وحدها، لا كلُّ «Claude».
const LEGACY_SERVICE = /(خدمةُ|خدمة|لخدمة|بخدمة) Claude(?![A-Za-z_0-9])/g;

/** يبدّل الاسمَ القديم في نصٍّ يُعرض. */
export function brandAiText(s: string): string {
  let out = s.includes("Opus") ? s.replace(LEGACY, AI_BRAND) : s;
  if (out.includes("Claude")) out = out.replace(LEGACY_SERVICE, `$1 ${AI_BRAND}`);
  return out;
}
