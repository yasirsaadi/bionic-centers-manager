// **خصوصيةُ المريض في وكيل Opus** (§4.ha) — لا اسمَ ولا هاتفَ ولا رمزَ ملفٍّ ولا رقمَ هويّة يخرج إلى النموذج أو إلى بحث الويب، أبداً.
//
// ثلاثُ طبقات: (١) لا يُبنى السياقُ منها أصلاً (`context.ts` لا يقرأ هذه الأعمدة للنصّ)، (٢) النصوصُ الحرّة التي كتبها الموظّفون عن المريض
// (المعاينة · الأجوبة · ملاحظاتُ الاعتماد) تُنقّى (`redactAuthoredText`)، (٣) حارسٌ أخير على كلّ ما يكتبه الخادمُ قبل الإرسال
// (`findAuthoredLeaks`) وعلى كلّ استعلام بحثٍ أو رابطٍ يطلبه النموذج (`findQueryLeaks`).
// **والمطابقةُ بالاسم الكامل أو باسمين متتاليين** — لا باسمٍ واحد («علي» = «على» بعد التطبيع، و«حسن» في «تحسّن»)؛
// **والأرقامُ أرقامُ المريض وحده** — لا «أيُّ سبعة أرقام» فيسقط رقمُ PMID أو DOI.

export interface IdentifierSet {
  fullNames: string[];
  namePairs: string[];
  latinPairs: string[];
  exact: string[];
  digitRuns: string[];
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function asciiDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(AR_DIGITS.includes(d) ? AR_DIGITS.indexOf(d) : FA_DIGITS.indexOf(d)));
}

/** تطبيعٌ للمقارنة: بلا تشكيل ولا تطويل، والألفات ألفٌ، والتاءُ المربوطة هاء، والياءُ ياء، واللاتينيُّ صغير، والفواصلُ فراغٌ واحد. */
export function normalizeForMatch(s: string): string {
  return asciiDigits(String(s ?? ""))
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/[^0-9A-Za-z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
    .trim();
}

/** نقلٌ لاتينيٌّ شائع لأسماءٍ عراقية — لاستعلامات البحث وحدها (`findQueryLeaks`). */
const LATIN: Record<string, string[]> = {
  "محمد": ["muhammad", "mohammed", "mohamed", "mohammad", "muhammed"], "علي": ["ali"], "حسين": ["hussein", "hussain", "husain", "hussien"],
  "حسن": ["hassan", "hasan"], "احمد": ["ahmed", "ahmad"], "عباس": ["abbas"], "جعفر": ["jaafar", "jafar"], "كاظم": ["kadhim", "kazem", "kadhem"],
  "مهدي": ["mahdi", "mehdi"], "عبد": ["abd", "abdul"], "فاطمه": ["fatima", "fatma"], "زهراء": ["zahraa", "zahra"], "زينب": ["zainab", "zaynab"],
  "مريم": ["maryam", "mariam"], "نور": ["noor", "nour"], "سجاد": ["sajjad", "sajad"], "مصطفي": ["mustafa", "mostafa"], "يوسف": ["yousif", "yousef", "yusuf"],
  "عمر": ["omar", "umar"], "خالد": ["khalid", "khaled"], "سالم": ["salem", "salim"], "سليم": ["salim", "saleem"], "ياسر": ["yasir", "yaser", "yasser"],
  "كريم": ["kareem", "karim"], "جاسم": ["jassim", "jasim"], "رضا": ["ridha", "reza", "rida"], "حيدر": ["haider", "hayder"], "عماد": ["imad", "emad"],
  "سعد": ["saad"], "رقيه": ["ruqaya", "ruqayya"], "ايوب": ["ayoub", "ayub"], "صادق": ["sadiq", "sadeq"], "باقر": ["baqir", "baqer"],
};

function digitsOf(s: string | null | undefined): string {
  return asciiDigits(String(s ?? "")).replace(/\D/g, "");
}

export function patientIdentifierSet(p: {
  name?: string | null; phones?: (string | null | undefined)[]; patientCode?: string | null; nationalIds?: (string | null | undefined)[];
  companionNames?: (string | null | undefined)[];
}): IdentifierSet {
  const names = [p.name, ...(p.companionNames ?? [])].map((n) => normalizeForMatch(n ?? "")).filter((n) => n.length >= 2);
  const fullNames: string[] = [];
  const namePairs: string[] = [];
  const latinPairs: string[] = [];
  for (const n of names) {
    const toks = n.split(" ").filter(Boolean);
    if (toks.length >= 1) fullNames.push(n);
    for (let i = 0; i + 1 < toks.length; i++) {
      namePairs.push(`${toks[i]} ${toks[i + 1]}`);
      for (const a of LATIN[toks[i]] ?? []) for (const b of LATIN[toks[i + 1]] ?? []) latinPairs.push(`${a} ${b}`);
    }
  }
  const runs = new Set<string>();
  for (const ph of p.phones ?? []) {
    const d = digitsOf(ph);
    if (d.length < 7) continue;
    runs.add(d);
    const local = d.startsWith("964") ? d.slice(3) : d.startsWith("00964") ? d.slice(5) : d;
    const noZero = local.replace(/^0/, "");
    for (const v of [local, noZero, `964${noZero}`, `0${noZero}`]) if (v.length >= 7) runs.add(v);
    if (noZero.length >= 9) runs.add(noZero.slice(-9));
  }
  for (const id of p.nationalIds ?? []) { const d = digitsOf(id); if (d.length >= 6) runs.add(d); }
  const code = String(p.patientCode ?? "").trim();
  const codeDigits = digitsOf(code);
  if (codeDigits.length >= 4) runs.add(codeDigits);
  return {
    fullNames: Array.from(new Set(fullNames)), namePairs: Array.from(new Set(namePairs)), latinPairs: Array.from(new Set(latinPairs)),
    exact: code ? [code.toLowerCase()] : [], digitRuns: Array.from(runs).sort((a, b) => b.length - a.length),
  };
}

const wordRe = (phrase: string) => new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`);

/** ما يطابق في نصٍّ واحد — أنواعُ المطابقة لا قيمُها (لا يُكتب اسمُ المريض في سجلّ). */
function matchesIn(text: string, ids: IdentifierSet, withLatin: boolean): string[] {
  const out: string[] = [];
  const norm = ` ${normalizeForMatch(text)} `;
  const lower = asciiDigits(String(text ?? "")).toLowerCase();
  if (ids.fullNames.some((n) => n.includes(" ") ? wordRe(n).test(norm) : false)) out.push("full_name");
  if (ids.namePairs.some((n) => wordRe(n).test(norm))) out.push("name_pair");
  if (withLatin && ids.latinPairs.some((n) => wordRe(n).test(norm))) out.push("latin_name");
  if (ids.exact.some((c) => lower.includes(c))) out.push("patient_code");
  const digitRunsIn = (lower.match(/\d+/g) ?? []);
  const joined = digitsOf(lower.replace(/[\s\-()+./]/g, ""));
  if (ids.digitRuns.some((r) => digitRunsIn.some((d) => d === r || (r.length >= 9 && d.includes(r))) || (r.length >= 9 && joined.includes(r)))) out.push("digits");
  return out;
}

export function findAuthoredLeaks(text: string, ids: IdentifierSet): string[] { return matchesIn(text, ids, false); }
export function findQueryLeaks(query: string, ids: IdentifierSet): string[] { return matchesIn(query, ids, true); }

/** **ينقّي نصّاً كتبه موظّفٌ عن المريض** — الاسمُ واسمان متتاليان وأرقامُه ورمزُه ⟵ «[محذوف]». نصُّ المكتبة لا يمرّ هنا. */
export function redactAuthoredText(text: string | null | undefined, ids: IdentifierSet): string {
  let s = String(text ?? "");
  if (!s) return s;
  s = asciiDigits(s);
  for (const c of ids.exact) s = s.replace(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[REDACTED]");
  for (const r of ids.digitRuns) {
    const loose = r.split("").join("[\\s\\-.]?");
    s = s.replace(new RegExp(`\\+?${loose}`, "g"), "[REDACTED]");
  }
  //  الأسماءُ: تُطابَق على النصّ المطبَّع كلمةً كلمة، ثمّ تُحذف كلماتُها الأصلية بمواضعها.
  const phrases = [...ids.fullNames.filter((n) => n.includes(" ")), ...ids.namePairs].sort((a, b) => b.length - a.length);
  if (!phrases.length) return s;
  const tokens: { raw: string; norm: string; start: number; end: number }[] = [];
  const re = /[0-9A-Za-z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) tokens.push({ raw: m[0], norm: normalizeForMatch(m[0]), start: m.index, end: m.index + m[0].length });
  const cut: [number, number][] = [];
  for (const ph of phrases) {
    const parts = ph.split(" ");
    for (let i = 0; i + parts.length <= tokens.length; i++) {
      if (parts.every((p, j) => tokens[i + j].norm === p)) cut.push([tokens[i].start, tokens[i + parts.length - 1].end]);
    }
  }
  cut.sort((a, b) => b[0] - a[0]);
  let lastStart = Number.POSITIVE_INFINITY;
  for (const [a, b] of cut) {
    if (b > lastStart) continue;
    s = `${s.slice(0, a)}[REDACTED]${s.slice(b)}`;
    lastStart = a;
  }
  return s;
}
