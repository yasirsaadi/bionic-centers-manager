//  ══ اختيارُ القدرات المطابقة لموضوعٍ — دالّةٌ خالصة ══════════════════════
//
//  الفهرسُ كبير، ونصُّ النظام يُرسَل مع **كلّ** سؤال. فوضعُ مئةِ قدرةٍ فيه
//  يكلّف رموزاً في كلّ طلبٍ ويُشوّش اختيار النموذج. فخطوتان: يبحث ثمّ ينادي.
//
//  والمطابقةُ **بالكلمات بعد تطبيعٍ عربيّ** — لا بحثٌ دلاليّ ولا متّجهات.
//  والمطبِّعُ هو `normalizeSearchText` القائم في `shared/patient_search.ts`
//  نفسُه الذي يستعمله بحثُ المرضى واسترجاعُ المعرفة — **ولا مطبِّعٌ عربيٌّ
//  ثانٍ في المستودع** يوماً ينحرف عنه.

import { normalizeSearchText } from "../../../shared/patient_search";
import type { Capability } from "./catalog";

/** أكثرُ ما يُعرَض على النموذج في نداءٍ واحد. */
export const MAX_MATCHES = 12;

/**
 * كلماتُ وقفٍ عربيةٌ شائعة في صياغة السؤال — تُسقَط كي لا تُطابِق كلُّ
 * قدرةٍ لمجرّد أن السؤال فيه «في» أو «من».
 */
const STOP = new Set([
  "في", "من", "الى", "على", "عن", "مع", "هل", "ما", "ماهي", "ماهو", "كم",
  "كيف", "اين", "متى", "الذي", "التي", "هذا", "هذه", "كل", "بعض", "او", "و",
  "لي", "لنا", "له", "اريد", "اعطني", "اظهر", "قائمه", "list", "show", "get",
]);

//  الحروفُ العربية واللاتينية والأرقام — **بلا أصناف يونيكود** (`\p{L}`)
//  لأنّ هدفَ الترجمة في هذا المستودع أقدمُ منها، فتُردّ عند الفحص.
const WORD_BREAK = /[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9]+/;

/**
 * تجريدُ السوابق العربية: أداةُ التعريف وحروفُ العطف والجرّ الملتصقة.
 *
 * **بلا هذا لا تطابق «مصاريف» كلمةَ «والمصاريف»** — وهي الصيغةُ التي
 * تُكتب بها الأوصافُ فعلاً. والشرطُ على الطول يمنع أن تُلتهَم كلمةٌ قصيرة
 * فتصير حرفين يطابقان كلَّ شيء.
 */
function stem(word: string): string {
  let w = word;
  if (w.length > 4 && /^[وفبكل]/.test(w)) w = w.slice(1);
  if (w.length > 4 && w.startsWith("ال")) w = w.slice(2);
  return w;
}

function tokens(text: string): string[] {
  return normalizeSearchText(text)
    .split(WORD_BREAK)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem);
}

/** طولُ البادئة المشتركة التي تُحتسَب قرابةً — «محاسبي» و«محاسبه». */
const PREFIX = 4;

const near = (a: string, b: string): boolean =>
  a.length >= PREFIX && b.length >= PREFIX && a.slice(0, PREFIX) === b.slice(0, PREFIX);

/**
 * ترتيبُ القدرات بحسب مطابقتها للموضوع.
 *
 * **وموضوعٌ فارغ يُرجع الكلّ** (حتى السقف) لا لا شيء: سؤالٌ عامٌّ يستحقّ
 * فهرساً يقرؤه النموذج، لا مصفوفةً فارغة تدفعه إلى الاعتذار.
 *
 * **ولا يُرجَع ما درجتُه صفر** حين يكون للموضوع كلماتٌ حقيقية — فقدرةٌ لا
 * تطابق شيئاً ضجيجٌ يزاحم المطابقَ على السقف.
 */
export function matchCapabilities(
  capabilities: Capability[], topic: string | null | undefined, limit = MAX_MATCHES,
): Capability[] {
  const want = tokens(String(topic ?? ""));
  if (want.length === 0) return capabilities.slice(0, limit);

  const scored = capabilities.map((c) => {
    //  المسارُ يُقطَّع بالشرطات فتُقرأ كلماتُه الإنجليزية (manufacturing،
    //  overview) — فالسؤالُ الإنجليزيّ يطابق أيضاً بلا معجمِ ترجمة.
    const hay = Array.from(new Set(tokens(c.description).concat(tokens(c.path.replace(/[/:]/g, " ")))));
    let score = 0;
    for (const w of want) {
      if (hay.indexOf(w) !== -1) { score += 2; continue; }
      //  قرابةٌ لا مطابقة — اختلافُ الصيغة الصرفية وحدَه لا يُسقط الشاشة.
      for (const h of hay) {
        if (near(h, w)) { score += 1; break; }
      }
    }
    return { c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.c.path.localeCompare(b.c.path))
    .slice(0, limit)
    .map((s) => s.c);
}
