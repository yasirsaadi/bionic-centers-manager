// **البحثُ في مكتبة البروتوكولات** (§4.dc — طلبُ المالك ٢٠٢٦-١٠-٠٩): «لا يقبل الألفَ بلا همزة — «الم الظهر» لا يجد «ألم الظهر» —
// وأريد البحثَ يغطّي ما في داخل البروتوكولات: إن بحث الأخصائيُّ عن «ركبة» يظهر اسمُ البروتوكول الذي يحويها، احترافياً مرتّباً».
//
//   • **تطبيعٌ واحد** — `normalizeSearchText` نفسُها التي يبحث بها سجلُّ المرضى: صورُ الألف ⟵ ا، ى ⟵ ي، ة ⟵ ه، ؤ ⟵ و، ئ ⟵ ي،
//     والتشكيلُ والتطويلُ يُحذفان، والإنكليزيةُ بلا حالة أحرف. فـ«الم» = «ألم»، و«ركبه» = «ركبة».
//   • **كلُّ ما في البروتوكول** حقلٌ بمكانه ووزنه: الاسمُ أثقلُها، ثمّ الموجزُ والأهدافُ والتمارين، ثمّ الأجهزةُ والمراحلُ وبطاقاتُ
//     تمارينها والمقاييس، ثمّ الموانعُ والاحتياطاتُ والمراجع — باللغتين.
//   • **كلُّ كلمةٍ في السؤال يجب أن توجد** في البروتوكول (في أيّ حقل)، و«ال» التعريف لا تُسقط مطابقة («الركبة» تجد «ركبة»).
//   • **والترتيبُ بالأدقّ**: ما وُجد في الاسم أوّلاً، والعبارةُ متّصلةً فوق كلماتها متفرّقة، ثمّ ثقلُ الحقل.
//   • **و«وُجدت في»**: لكلّ نتيجةٍ مكانُ الكلمة ومقتطفٌ حولها بمواضع التظليل — فيعرف الأخصائيُّ لماذا ظهر البروتوكول قبل أن يفتحه.
// منطقٌ خالص بلا قاعدة: الخادمُ يبني الحقولَ ويرتّب بها (`server/physio_protocols/search.ts`)، والاختبارُ يقيسها وحدها.
import { normalizeSearchText } from "./patient_search";

export interface SearchField {
  /** مفتاحٌ ثابت للحقل (`title`، `goals`، `device:tecar`…). */
  key: string;
  label: string;
  labelEn: string;
  /** وزنُ الحقل — الأثقلُ أدلُّ على أنّ البروتوكولَ «عن» الكلمة. */
  weight: number;
  text: string | null | undefined;
}
export interface ProtocolDoc { id: number; fields: SearchField[] }

/** موضعُ تظليلٍ داخل نصّ: [بداية، نهاية) بالمحارف. */
export type Range = [number, number];
export interface SearchHit { key: string; label: string; labelEn: string; snippet: string; ranges: Range[] }
export interface ProtocolMatch {
  id: number;
  score: number;
  /** وُجدت كلُّ الكلمات في اسم البروتوكول (بإحدى اللغتين). */
  inTitle: boolean;
  /** مواضعُ التظليل في الاسمين. */
  titleRanges: { ar: Range[]; en: Range[] };
  /** أين وُجدت الكلمات خارج الاسم — الأثقلُ أوّلاً، وثلاثةٌ على الأكثر. */
  hits: SearchHit[];
}

/** أوزانُ الحقول — مرجعٌ واحد يقرؤه الخادمُ حين يبني الحقول. */
export const FIELD_WEIGHTS = {
  title: 100, code: 60, summary: 30, goals: 22, exercises: 22, phaseName: 18, exerciseCard: 18, device: 16,
  assessment: 15, measure: 15, phaseText: 10, deviceText: 10, contraindications: 12, precautions: 12, reference: 6,
} as const;

/** أقلُّ طولٍ لكلمة السؤال — حرفٌ واحد يطابق كلَّ شيء. */
export const MIN_TOKEN = 2;
const SNIPPET_BEFORE = 45;
const SNIPPET_AFTER = 75;
const MAX_HITS = 3;

/**
 * **التطبيعُ بخريطة** — الناتجُ مطابقٌ لـ`normalizeSearchText` حرفاً بحرف (يحرسه الاختبار)، ومعه لكلّ حرفٍ ناتجٍ موضعُه في النصّ الأصلي،
 * فتُرَدّ المطابقةُ إلى مكانها لتظليلها ولو حُذف تشكيلٌ أو طُوي سطر.
 */
export function normalizeWithMap(input: string | null | undefined): { norm: string; map: number[] } {
  const src = String(input ?? "");
  const out: string[] = [];
  const map: number[] = [];
  let pendingSpace = -1;
  let i = 0;
  for (const ch of src) {
    const at = i;
    i += ch.length;
    if (/\s/.test(ch)) { if (out.length && pendingSpace < 0) pendingSpace = at; continue; }
    let c = normalizeSearchText(ch);
    //  التشكيلُ والتطويلُ تُحذف (يُرجعها التطبيعُ فراغاً).
    if (!c) continue;
    if (pendingSpace >= 0) { out.push(" "); map.push(pendingSpace); pendingSpace = -1; }
    for (const part of c) { out.push(part); map.push(at); }
  }
  return { norm: out.join(""), map };
}

/** كلماتُ السؤال مطبَّعةً بلا تكرار — وما دون حرفين يُترك. */
export function queryTokens(q: string | null | undefined): string[] {
  const words = normalizeSearchText(q).split(" ").filter((w) => w.length >= MIN_TOKEN);
  return Array.from(new Set(words));
}

/** صورُ الكلمة التي تُقبل: هي، وبلا «ال» التعريف إن بقي بعدها حرفان («الركبه» ⟵ «ركبه»). */
function variants(token: string): string[] {
  return token.startsWith("ال") && token.length >= 4 ? [token, token.slice(2)] : [token];
}

// ══ **بداياتُ الكلمات لا أجزاؤها** ══ بحثُ «الجزء من أيّ موضع» كان يجد «الم» داخل «المزمن» و«ركب» داخل «تركيب». فالكلمةُ تُطابَق
//  حيث تبدأ كلمةٌ في النصّ — أو بعد سابقةٍ عربية تلتصق بها (و · ف · ب · ك · ل · ال · وال · بال · لل…) — **وتامّةً** حين تنتهي الكلمةُ
//  عندها أو بلاحقةٍ قصيرة (ـه · ـات · ـين · ـها…). والتامّةُ أدلّ: تُرجَّح، وحين توجد في حقلٍ يُظلَّل التامُّ وحده.
//  والإنكليزيةُ مثلُها، ولكلمةٍ لاتينية من أربعة أحرفٍ فأكثر يُقبل الجزءُ داخل الكلمة أضعفَ (arthritis ⟵ osteoarthritis).
const CLITICS = new Set(["و", "ف", "ب", "ك", "ل", "ال", "وال", "فال", "بال", "كال", "لل", "ولل", "وب", "ول", "فب", "فل"]);
const SUFFIXES = new Set(["ه", "ها", "هم", "هما", "ات", "ان", "ين", "ون", "ي", "يه", "يا", "تين", "تان", "s", "es"]);
//  حرفُ كلمة في النصّ المطبَّع: لاتينيٌّ صغير أو رقم، أو حرفٌ عربيّ (بلا تشكيل — حذفه التطبيع). بلا \p{L} (يتطلّب علَم u وهدفاً أحدث).
const isWordChar = (c: string | undefined) => !!c && /[0-9a-z\u00c0-\u024f\u0621-\u064a\u0660-\u0669\u066e-\u06d3\u06fa-\u06ff]/.test(c);
const LATIN = /^[a-z0-9]/;

/** مطابقةٌ في المطبَّع: مداها، وهل هي كلمةٌ تامّة، وهل هي جزءٌ من داخل كلمة. */
interface Found { range: Range; whole: boolean; inner: boolean }

function findAll(norm: string, token: string): Found[] {
  const out: Found[] = [];
  for (const v of variants(token)) {
    let from = 0;
    for (;;) {
      const k = norm.indexOf(v, from);
      if (k < 0) break;
      from = k + 1;
      const e = k + v.length;
      let ws = k;
      while (ws > 0 && isWordChar(norm[ws - 1])) ws--;
      let we = e;
      while (we < norm.length && isWordChar(norm[we])) we++;
      const atStart = ws === k || CLITICS.has(norm.slice(ws, k));
      const inner = !atStart && LATIN.test(v) && v.length >= 4;
      if (!atStart && !inner) continue;
      const whole = atStart && (we === e || SUFFIXES.has(norm.slice(e, we)));
      out.push({ range: [k, e], whole, inner });
    }
  }
  return out;
}

/** وزنُ المطابقة: التامّةُ كاملة، وبدايةُ الكلمة أقلّ، وجزءُ الكلمة اللاتينية أضعف. */
const strength = (f: Found) => (f.whole ? 1 : f.inner ? 0.4 : 0.6);

/** ما يُظلَّل لكلمةٍ في حقل: التامُّ إن وُجد، وإلّا البدايات، وإلّا الأجزاء. */
function shown(found: Found[]): Range[] {
  const whole = found.filter((f) => f.whole);
  if (whole.length) return whole.map((f) => f.range);
  const starts = found.filter((f) => !f.inner);
  return (starts.length ? starts : found).map((f) => f.range);
}

/** مدىً في المطبَّع ⟵ مدىً في الأصل. */
const toOriginal = (r: Range, map: number[]): Range => [map[r[0]], map[r[1] - 1] + 1];

/** يدمج المتداخلَ — والمتجاورَ بينه مسافةٌ وحدها إن أُعطي النصّ («النتوء الأخرمي» تظليلٌ واحد). */
function mergeRanges(rs: Range[], text?: string): Range[] {
  const sorted = rs.slice().sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && (r[0] <= last[1] || (text !== undefined && /^\s+$/.test(text.slice(last[1], r[0]))))) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/** مقتطفٌ حول أوّل مطابقة: سطرٌ واحد، يبدأ وينتهي عند كلمة، ومواضعُ التظليل فيه. */
export function snippetAround(text: string, ranges: Range[]): { snippet: string; ranges: Range[] } {
  const flat = text.replace(/[\r\n\t]/g, " ");
  const first = ranges.reduce((m, r) => (r[0] < m[0] ? r : m), ranges[0]);
  let start = Math.max(0, first[0] - SNIPPET_BEFORE);
  let end = Math.min(flat.length, first[1] + SNIPPET_AFTER);
  if (start > 0) { const sp = flat.indexOf(" ", start); if (sp >= 0 && sp < first[0]) start = sp + 1; }
  if (end < flat.length) { const sp = flat.lastIndexOf(" ", end); if (sp > first[1]) end = sp; }
  const lead = start > 0 ? "… " : "";
  const tail = end < flat.length ? " …" : "";
  const body = flat.slice(start, end);
  const inside = ranges.filter((r) => r[0] >= start && r[1] <= end).map((r): Range => [r[0] - start + lead.length, r[1] - start + lead.length]);
  const snippet = lead + body + tail;
  return { snippet, ranges: mergeRanges(inside, snippet) };
}

/**
 * **يرتّب البروتوكولات لسؤال** — ما لم توجد فيه كلُّ الكلمات لا يُعاد. الدرجة: لكلّ كلمةٍ أثقلُ حقلٍ وُجدت فيه، ومكافأةٌ للعبارة متّصلةً
 * (بضعف ثقل حقلها)، ولاسمٍ يبدأ بالسؤال. والترتيبُ بالدرجة ثمّ بالحقل الأثقل — ويُرجع `[]` لسؤالٍ بلا كلمةٍ صالحة.
 */
export function rankProtocols(
  docs: readonly ProtocolDoc[], q: string | null | undefined,
  /** لغةُ المقتطف حين يوجد الموضعُ بالنسختين — وبلا تحديد: لغةُ السؤال (عربيٌّ إن كان فيه حرفٌ عربيّ). */
  opts: { lang?: "ar" | "en" } = {},
): ProtocolMatch[] {
  const tokens = queryTokens(q);
  if (!tokens.length) return [];
  const preferEn = opts.lang ? opts.lang === "en" : !/[\u0600-\u06FF]/.test(String(q ?? ""));
  const phrase = tokens.join(" ");
  const out: ProtocolMatch[] = [];
  for (const doc of docs) {
    const prepared = doc.fields
      .filter((f) => f.text && String(f.text).trim())
      .map((f) => ({ f, ...normalizeWithMap(f.text) }));
    const best = new Map<string, number>();
    let phraseBonus = 0;
    let prefixBonus = 0;
    const hitsByField: { f: SearchField; norm: string; map: number[]; ranges: Range[] }[] = [];
    for (const p of prepared) {
      const ranges: Range[] = [];
      for (const t of tokens) {
        const found = findAll(p.norm, t);
        if (!found.length) continue;
        ranges.push(...shown(found));
        best.set(t, Math.max(best.get(t) ?? 0, p.f.weight * Math.max(...found.map(strength))));
      }
      if (!ranges.length) continue;
      //  العبارةُ متّصلةً («ألم الظهر» لا «ألم … الظهر») — بضعف ثقل حقلها.
      if (tokens.length > 1 && findAll(p.norm, phrase).length) phraseBonus = Math.max(phraseBonus, p.f.weight * 2);
      //  واسمٌ يبدأ بالسؤال أدلُّ من اسمٍ يحويه في وسطه.
      if (p.f.key.startsWith("title") && findAll(p.norm, tokens[0]).some((x) => x.range[0] === 0 || (x.range[0] <= 3 && !x.inner))) {
        prefixBonus = Math.max(prefixBonus, p.f.weight / 2);
      }
      hitsByField.push({ f: p.f, norm: p.norm, map: p.map, ranges });
    }
    if (best.size !== tokens.length) continue;
    const score = Array.from(best.values()).reduce((a, b) => a + b, 0) + phraseBonus + prefixBonus;

    const titleHit = (key: string) => hitsByField.find((h) => h.f.key === key);
    const titleRangesOf = (key: string): Range[] => {
      const h = titleHit(key);
      return h ? mergeRanges(h.ranges.map((r) => toOriginal(r, h.map)), String(h.f.text)) : [];
    };
    const titleTokens = new Set<string>();
    for (const h of hitsByField.filter((x) => x.f.key.startsWith("title"))) {
      for (const t of tokens) if (findAll(h.norm, t).length) titleTokens.add(t);
    }
    const inTitle = titleTokens.size === tokens.length;
    //  ما وُجد في اسمه يكفيه سطرٌ واحد «وأيضاً في…»؛ وما وُجد في محتواه وحده يقول أين — حتى ثلاثة مواضع.
    //  **الموضعُ مرّةً بلغةٍ واحدة**: نسختا الحقل (`goals` و`goalsEn`) موضعٌ واحد — تُعرَض المفضّلةُ إن وُجدت فيها الكلمة، وإلّا الأخرى.
    const byBase = new Map<string, (typeof hitsByField)[number]>();
    //  والرمزُ يرتّب ولا يُعرَض موضعاً — «الرمز: knee-oa-geriatric» لا يقول للأخصائيّ شيئاً.
    for (const h of hitsByField.filter((x) => !x.f.key.startsWith("title") && x.f.key !== "code")) {
      const base = h.f.key.replace(/En$/, "");
      const isEn = h.f.key.endsWith("En");
      const cur = byBase.get(base);
      if (!cur || (isEn === preferEn && cur.f.key.endsWith("En") !== preferEn)) byBase.set(base, h);
    }
    const hits: SearchHit[] = Array.from(byBase.values())
      .sort((a, b) => b.f.weight - a.f.weight || b.ranges.length - a.ranges.length)
      .slice(0, inTitle ? 1 : MAX_HITS)
      .map((h) => {
        const original = mergeRanges(h.ranges.map((r) => toOriginal(r, h.map)));
        const s = snippetAround(String(h.f.text), original);
        return { key: h.f.key, label: h.f.label, labelEn: h.f.labelEn, snippet: s.snippet, ranges: s.ranges };
      });
    out.push({
      id: doc.id, score, inTitle,
      titleRanges: { ar: titleRangesOf("title"), en: titleRangesOf("titleEn") }, hits,
    });
  }
  return out.sort((a, b) => b.score - a.score || Number(b.inTitle) - Number(a.inTitle));
}

/** **اسمُ البروتوكول يطابق السؤال؟** — للمنتقيات التي تختار بالاسم وحده (اختيارُ بروتوكول الخطّة): القاعدةُ نفسُها بلا محتوى. */
export function titleMatches(q: string | null | undefined, titleAr: string | null | undefined, titleEn: string | null | undefined): boolean {
  const tokens = queryTokens(q);
  if (!tokens.length) return true;
  const norm = `${normalizeSearchText(titleAr)} ${normalizeSearchText(titleEn)}`;
  return tokens.every((t) => findAll(norm, t).length > 0);
}
