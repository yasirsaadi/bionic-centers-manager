// بحثُ المرضى — التطبيع والترتيب، **منطقٌ خالص يُستعمل في الطرفين**.
//
// ══ لماذا ملفٌّ واحد ═══════════════════════════════════════════════════
// كان في المشروع ثلاث قواعد تطبيع لا واحدة: `normalizeArabic` في الواجهة،
// و`translate(name,'أإآةى','اااهي')` في SQL مرّتين، و`includes` خام في
// شاشاتٍ أخرى. فالموظّف يكتب «احمد» فيجده في سجلّ المرضى ولا يجده في
// «معايناتي» — والسبب أن كل شاشة تسأل سؤالاً مختلفاً.
//
// وهذا الملفّ هو السؤال الواحد. والدالّة `patient_search_norm` في القاعدة
// (ترحيل ٠٥٤) **مطابقةٌ لهذه خطوةً بخطوة**، فما يطابق في الذاكرة يطابق في
// SQL. واختبارٌ يقارن الاثنتين على عيّناتٍ حقيقية يحرس التطابق.
//
// ══ وحدُّ التطبيع ═══════════════════════════════════════════════════════
// التطبيع العدواني يُنتج مطابقاتٍ كاذبة أكثر ممّا يُنقذ. فالمطبَّق هنا ما
// يخلط فعلاً في كتابة الأسماء العراقية: صورُ الألف والياء والتاء المربوطة،
// والتشكيلُ والتطويل، والمسافاتُ المكرّرة، والأرقامُ الهندية. ولا شيء
// أبعد — لا حذفَ همزاتٍ داخلية ولا توحيدَ حروفٍ متقاربة صوتياً.

// ── الأرقام ──────────────────────────────────────────────────────────────
// العربية-الهندية (٠-٩) والفارسية (۰-۹) ⟶ ASCII. الموظّف قد يكتب رقم
// الهاتف بأي لوحة مفاتيح، والرمز `WB-٠٠٠٤٢` يجب أن يجد `WB-00042`.
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const ai = ARABIC_INDIC.indexOf(ch);
    if (ai >= 0) { out += String(ai); continue; }
    const pi = PERSIAN.indexOf(ch);
    if (pi >= 0) { out += String(pi); continue; }
    out += ch;
  }
  return out;
}

/**
 * التطبيع الأساسي للنصّ المبحوث عنه وللاسم المخزَّن معاً.
 *
 * الخطوات بترتيبها — و**ترتيبها جزءٌ من العقد** مع دالّة القاعدة:
 *   ١. الأرقام الهندية/الفارسية ⟶ ASCII.
 *   ٢. التشكيل يُحذف (َ ُ ِ ّ ْ ً ٌ ٍ ٰ).
 *   ٣. التطويل (ـ) يُحذف.
 *   ٤. أ إ آ ٱ ٲ ٳ ⟶ ا.
 *   ٥. ى ⟶ ي · ة ⟶ ه · ؤ ⟶ و · ئ ⟶ ي.
 *   ٦. الحروف اللاتينية ⟶ صغيرة.
 *   ٧. المسافات تُوحَّد وتُقصّ.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return normalizeDigits(String(input))
    //  التشكيل: الفتحة إلى السكون، والتنوين، والمدّة العلوية.
    .replace(/[ً-ْٰ]/g, "")
    //  التطويل — زينةٌ خطّية لا تغيّر الكلمة.
    .replace(/ـ/g, "")
    .replace(/[أإآٱٲٳ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** الهاتف يُقارن أرقاماً فقط — فالمسافات والشرطات والأقواس زينةُ عرض. */
export function digitsOnly(input: string | null | undefined): string {
  return normalizeDigits(String(input ?? "")).replace(/\D+/g, "");
}

// ── سُلّم الترتيب ─────────────────────────────────────────────────────────
// **الأصغر أدقّ.** والسلّم واحدٌ للذاكرة وللـSQL، فلا ترتيبان ينحرفان.
//
// والقاعدة الحاكمة: **لا نتيجةَ تقريبية تسبق مطابقةً تامّة أو ببادئة**
// إطلاقاً — لأن الموظّف الذي كتب الاسم كاملاً وصحيحاً يجب أن يجده أوّلاً،
// ولو شابهه عشرون اسماً آخر.
export const RANK = {
  CODE_EXACT: 1,
  ALIAS_EXACT: 2,
  PHONE_EXACT: 3,
  NAME_EXACT: 4,
  NAME_PREFIX: 5,
  TOKEN_PREFIX: 6,
  ID_PREFIX: 7,
  SUBSTRING: 8,
  FUZZY: 9,
} as const;

export type Rank = (typeof RANK)[keyof typeof RANK];

/**
 * أدنى طولٍ يبدأ عنده التسامح مع الخطأ المطبعي.
 *
 * حرفٌ أو حرفان يشبهان كل شيء: مسافةُ تحريرٍ واحدة على «عل» تصل «علي» و«عم»
 * و«عن» و«ال»… فالنتيجة ضجيجٌ لا بحث. ودون ذلك يعمل البحث بالبادئة — وهو
 * أسرع وأدقّ لأول حرفٍ يُكتب.
 */
export const FUZZY_MIN_QUERY = 3;

/**
 * مسافةُ تحرير محدودةٌ بسقف — تتوقّف مبكراً بدل أن تحسب المصفوفة كاملة.
 *
 * تُرجع `null` حين تتجاوز السقف، فالمنادي لا يحتاج الرقم الحقيقي بل «هل
 * هو ضمن الحدّ». والسقف يجعلها O(n·k) لا O(n·m).
 */
export function boundedEditDistance(a: string, b: string, max: number): number | null {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return null;
  if (a.length === 0) return b.length <= max ? b.length : null;
  if (b.length === 0) return a.length <= max ? a.length : null;

  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowBest = cur[0];
    //  النافذة القُطرية: ما خرج عن السقف لا يُحسب أصلاً.
    const from = Math.max(1, i - max);
    const to = Math.min(b.length, i + max);
    for (let j = 1; j <= b.length; j++) {
      if (j < from || j > to) { cur[j] = max + 1; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowBest) rowBest = cur[j];
    }
    if (rowBest > max) return null;
    const tmp = prev; prev = cur; cur = tmp;
  }
  const d = prev[b.length];
  return d <= max ? d : null;
}

/**
 * سقفُ الخطأ المسموح بحسب طول الاستعلام — كلمةٌ أطول تحتمل خطأً أكثر.
 *
 * ══ ولماذا هذا السقف تحديداً ═══════════════════════════════════════════
 * خطأان في كلمةٍ من خمسة أحرف = خُمسا الكلمة، وهذا لا يجد خطأً مطبعياً بل
 * يجد كلمةً أخرى: «زكريا» تبعد خطأين عن «كريم». والسقفُ هنا معايَرٌ ليقارب
 * ما يقبله `word_similarity` في القاعدة عند ٠٫٥ — فلا تكون القائمة المحمَّلة
 * في المتصفّح أسخى بكثير من صفحةٍ تأتي من الخادم.
 *
 * **وهو تقاربٌ لا تطابق، وهذا مقصود**: مسافةُ التحرير ومقياسُ الترايغرام
 * قياسان مختلفان لا يُطابَق بينهما بضبط عتبة. والمضمون بين الطرفين هو
 * **التطبيع والسلّم** — أمّا الحافّة الأخيرة (ما يدخل تقريباً وما لا يدخل)
 * فقد تختلف في حالةٍ حدّية، والفرق يقع دائماً في الرتبة التاسعة أي في ذيل
 * القائمة لا في صدرها.
 */
export function allowedTypos(queryLength: number): number {
  if (queryLength < FUZZY_MIN_QUERY) return 0;
  if (queryLength <= 5) return 1;
  if (queryLength <= 9) return 2;
  return 3;
}

// ── التسجيل ──────────────────────────────────────────────────────────────

export interface SearchablePatient {
  name?: string | null;
  phone?: string | null;
  patientCode?: string | null;
  /** الأسماء البديلة بعد الدمج — الرمز القديم يجب أن يصل لصاحبه. */
  aliasCodes?: string[] | null;
}

export interface MatchResult {
  rank: Rank;
  /** كسرُ التعادل داخل الرتبة — الأصغر أفضل (موضعُ المطابقة أو مسافةُ الخطأ). */
  tie: number;
}

/**
 * يطابق مريضاً واحداً باستعلامٍ واحد. `null` = لا مطابقة.
 *
 * والرمزُ يُقارن **مطبَّعاً بأرقامه** لا بصيغته: مَن يكتب `wb 42` أو
 * `WB-٠٠٠٤٢` يقصد الرمز نفسه.
 */
export function matchPatient(
  query: string, patient: SearchablePatient,
): MatchResult | null {
  const q = normalizeSearchText(query);
  if (!q) return null;

  const qDigits = digitsOnly(query);
  const name = normalizeSearchText(patient.name);
  const phone = digitsOnly(patient.phone);
  const code = normalizeSearchText(patient.patientCode);
  const aliases = (patient.aliasCodes ?? []).map((c) => normalizeSearchText(c));

  //  ١-٣: المطابقات التامّة على المعرّفات. الرمز يُقارن بصيغتيه — كما
  //  كُتب، وبأرقامه وحدها — فيُقبل «42» لمن رمزه WB-00042 إن ساوى رقمه.
  if (code && (q === code || (qDigits && digitsOnly(code) === qDigits && qDigits.length >= 4))) {
    return { rank: RANK.CODE_EXACT, tie: 0 };
  }
  for (const a of aliases) {
    if (a && (q === a || (qDigits && digitsOnly(a) === qDigits && qDigits.length >= 4))) {
      return { rank: RANK.ALIAS_EXACT, tie: 0 };
    }
  }
  if (phone && qDigits && phone === qDigits) return { rank: RANK.PHONE_EXACT, tie: 0 };

  //  ٤-٦: الاسم — تامٌّ، ثمّ ببادئة الاسم، ثمّ ببادئة أي كلمة فيه.
  //  وبادئةُ الكلمة مهمّة عملياً: الموظّف يكتب اسم الأب أو الجدّ كثيراً.
  if (name && name === q) return { rank: RANK.NAME_EXACT, tie: 0 };
  if (name && name.startsWith(q)) return { rank: RANK.NAME_PREFIX, tie: name.length - q.length };
  if (name) {
    //  وموضعُ الكلمة يكسر التعادل: «كريم» في «كريم حسن» قبلها في «علي كريم».
    const tokens = name.split(" ");
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].startsWith(q)) return { rank: RANK.TOKEN_PREFIX, tie: i };
    }
  }

  //  ٧: بادئةُ الهاتف أو الرمز — «0770» يجد كل من يبدأ به.
  if (qDigits && qDigits.length >= 2) {
    if (phone && phone.startsWith(qDigits)) return { rank: RANK.ID_PREFIX, tie: 0 };
    if (code && digitsOnly(code).startsWith(qDigits)) return { rank: RANK.ID_PREFIX, tie: 1 };
  }

  //  ٨: احتواء — موضعُ المطابقة يكسر التعادل، فالأقرب إلى البداية أوّلاً.
  if (name) {
    const at = name.indexOf(q);
    if (at >= 0) return { rank: RANK.SUBSTRING, tie: at };
  }
  if (qDigits && qDigits.length >= 3 && phone && phone.includes(qDigits)) {
    return { rank: RANK.SUBSTRING, tie: 50 };
  }

  //  ٩: الخطأ المطبعي — **آخر ما يُجرَّب، وبعد ثلاثة أحرف فصاعداً**.
  //  يُقاس على الاسم كلّه وعلى كلّ كلمةٍ فيه: «محمد احمد» مكتوباً «احمذ»
  //  يجب أن يُوجَد بكلمته لا بالاسم كاملاً.
  if (q.length >= FUZZY_MIN_QUERY && name) {
    const max = allowedTypos(q.length);
    const whole = boundedEditDistance(q, name, max);
    if (whole !== null) return { rank: RANK.FUZZY, tie: whole };
    for (const tok of name.split(" ")) {
      //  الكلمةُ الأقصر من الاستعلام بكثير لا تُقارن — «د» ليست خطأً في «احمد».
      if (Math.abs(tok.length - q.length) > max) continue;
      const d = boundedEditDistance(q, tok, max);
      if (d !== null) return { rank: RANK.FUZZY, tie: d + 1 };
    }
  }
  return null;
}

/**
 * يرشّح قائمةً في الذاكرة ويرتّبها بالصلة — **للقوائم المحمَّلة أصلاً**.
 *
 * القوائم الكبيرة المدعومة بقاعدة بيانات تبحث في الخادم، فلا تُحمَّل كلّها
 * إلى المتصفّح لتُرشَّح فيه. وهذه لمن حمّلها أصلاً لسببٍ آخر (قائمةُ عمل
 * الطبيب، منتقي مريضٍ في نافذة).
 *
 * **والترتيب مستقرّ**: عند تساوي الرتبة والكسر يبقى ترتيب المصدر كما هو —
 * فلا يقفز صفٌّ فوق آخر لسببٍ غير مفهوم.
 */
export function filterAndRank<T>(
  items: readonly T[], query: string, toPatient: (item: T) => SearchablePatient,
): T[] {
  const q = query.trim();
  if (!q) return items.slice();
  const scored: { item: T; rank: number; tie: number; idx: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const m = matchPatient(q, toPatient(items[i]));
    if (m) scored.push({ item: items[i], rank: m.rank, tie: m.tie, idx: i });
  }
  scored.sort((a, b) =>
    a.rank - b.rank || a.tie - b.tie || a.idx - b.idx);
  return scored.map((s) => s.item);
}
