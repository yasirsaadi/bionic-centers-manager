// **النصُّ الحرّ ضدّ ورقة السلامة** (§4.hd — المراجعة): معاينةُ الإصدار الثالث تشخيصُها نصٌّ يكتبه الفاحص بكلماته، وورقةُ السلامة أجوبةٌ بضغطة.
// فإن قال النصُّ «على الوارفارين» والورقةُ «لا مضادَّ تخثّر» فالشيفرةُ الحتمية تقرأ الورقة وحدها — وكان التناقضُ تلميحاً للنموذج لا أكثر.
// هنا قاعدةٌ صرفة واحدة يقرؤها الخادمُ (بوّابةٌ مانعة قبل الخطّة وفي تعديلها) والشاشةُ (تنبيهٌ حيّ تحت التشخيص) — بلا قاعدة بيانات:
//   • **التطبيع العربيّ** — التشكيلُ والتطويلُ يُحذفان، وأإآ ⟵ ا، وة ⟵ ه، وى ⟵ ي (الكتابةُ العراقية اليومية: «جلطه» «سيوله» «خثره»).
//   • **النفيُ القريب** («لا يوجد منظّم»، «بدون سيولة»، "no pacemaker") لا يُحسب — وما بقي يحتاج تصحيحَ الورقة أو تأكيدَها (`textSafetyAck`).
//   • **«غير ذلك» لا تصحّ والنصُّ يذكر حالةً من المكتبة** (`otherGroupTextConflicts`) — فلا تسقط موانعُ تلك الحالة بضغطة.
// ولا يُستورد هنا شيءٌ من `physio_exam_v2.ts` وقتَ التشغيل (هو يستورد هذا الملفّ).
import type { PhysioExamV2 } from "./physio_exam_v2";

/** التطبيعُ الواحد للبحث — والأنماطُ تُطبَّع به أيضاً، فتُكتب بأيّ إملاء. */
export function normalizeArabicForSearch(t: string): string {
  return t.replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").toLowerCase();
}
const NEGATION = /(^|[\s،,.;:(])(و?لا|و?ليس|و?ليست|و?بدون|و?بلا|ما|غير|و?لم|نفى|ينفي|تنفي|no|not|non|nor|without|denies|denied|negative|nil|never)([\s،,.;:)]|$)/i;
/** هل سُبقت الكلمةُ بنفيٍ قريب (حتى ثلاث كلمات في الجملة نفسِها)؟ */
function negatedAt(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 40), index);
  const clause = before.split(/[.!؟?\n؛;]/).pop() ?? "";
  const words = clause.trim().split(/\s+/).filter(Boolean).slice(-3).join(" ");
  return NEGATION.test(` ${words} `);
}
/** أوّلُ تطابقٍ غيرِ منفيّ لنمطٍ في النصّ المطبَّع — أو `null`. */
function firstPositive(text: string, pattern: RegExp): string | null {
  const re = new RegExp(normalizeArabicForSearch(pattern.source), "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!negatedAt(text, m.index + (m[0].length - m[0].trimStart().length))) return m[0].trim();
    if (m[0].length === 0) re.lastIndex++;
  }
  return null;
}

type Exam = Pick<PhysioExamV2, "core" | "redFlags"> & { version?: unknown; form?: unknown };
const has = (a: Exam, key: string, code: string) => Array.isArray(a.core?.[key]) && (a.core[key] as string[]).includes(code);

/** المفتاحُ في ورقة السلامة، واسمُه، ومتى يخالفه النصّ (الورقةُ تقول «لا»)، والكلماتُ. */
//  **والكلمةُ تُضيَّق حيث تلتقط مفرداتِ الشكوى اليومية وحدها** (مراجعةُ Codex): «حرقان» و"burning" ألمٌ لا حرق، و"platelet" دمٌ لا معدن،
//  و«قرحة المعدة» ليست جلداً، و«السلسلة» ظهرٌ لا سلس، و"thrombolysis" علاجٌ لا خثرة. **والتضييقُ استثناءٌ مسمّى لا حذفُ كلمة** —
//  فالنفيُ الخاطئ أخطرُ من التنبيه الزائد، والصيغةُ الحقيقية تبقى تُلتقط. و`\b` لا يعرف الحرفَ العربيّ، فحدُّ الكلمة العربية `(?<![ء-ي])`.
//  **و«حرق» جزءُ كلمةٍ لا كلمةٌ كاملة** (المراجعة الثانية): «حرقت» و«حرقها» و«حرقين» و«وبالحرق» و«للحرق» حروقٌ حقيقية، فالمستثنى
//  بالاسم وحده — «حرقان»، و«حرقة» قبل المعدة والبول والصدر والفم والعين (و«حرقة في الساق» تبقى: لا تُميَّز من «حرقُه في الساق» فتُنبَّه).
//  **و«منظّم» بعد السكر والضغط والنبض انضباطٌ لا جهاز** («السكر منظم»)، و«عنده منظم ضربات» يبقى.
export const TEXT_SAFETY_TERMS: readonly { key: string; labelAr: string; when: (a: Exam) => boolean; terms: RegExp }[] = [
  { key: "core.implants", labelAr: "جهازٌ مزروع (منظّم ضربات، منبّه، صمّام…)", when: (a) => has(a, "implants", "none"),
    terms: /pace\s?maker|defibrillat|\bicd\b|\bdbs\b|stimulator|cochlear|shunt|منظمه?(?= (ب?ال)?(ضربات|قلب|نبض|بطاري|جهاز))|(?<!(ال)?(سكر|سكري|ضغط|نبض)(ه|ها)?( (الدم|صار|اصبح|بات|شويه|مو|كلش|جدا|حاليا|نوعا ما|عنده|عندها|لديه|لديها))? )منظم|جهاز تنظيم|بطاري(ه|ات)? (ب?ال)?قلب|\bppm\b|\baicd\b|brain stimulation|مزيل رجفان|منبه(?!ات)|قوقعه|صمام|بطاريه القلب/ },
  { key: "core.anticoagulant", labelAr: "مضادُّ التخثّر أو اضطرابُ النزف", when: (a) => has(a, "anticoagulant", "none"),
    terms: /warfarin|apixaban|rivaroxaban|dabigatran|xarelto|eliquis|clopidogrel|plavix|heparin|enoxaparin|clexane|anticoag|haemophil|hemophil|وارفارين|مميع|سيوله|هيبارين|كليكسان|بلافكس|زاريلتو|اليكويس|هيموفيليا|(?<!(جلطه|سكته|دماغيه) )نزف/ },
  { key: "core.pregnant", labelAr: "الحمل", when: (a) => a.core?.pregnant === "no", terms: /pregnan|(^|[\s،.])حامل([\s،.]|$)|(شهر|اشهر|اسبوع|اسابيع) من الحمل/ },
  { key: "core.cancer", labelAr: "ورمٌ أو سرطان", when: (a) => a.core?.cancer === "no",
    terms: /cancer|tumou?r|malignan|metasta|lymphoma|carcinoma|sarcoma|سرطان|(^|[\s،.])و?ورم(?!ت|ان)|اورام|خبيث|كيمياوي|كيماوي/ },
  //  «حرقة» وحدها (= «حرقُه» بعد التطبيع) **حرقٌ** إلّا أن تصفها الجملةُ ألماً عصبيّاً («تنميل»، «عند المشي»، «بالليل») بلا سببٍ مذكور —
  //  فمصدرُ الحرارة وصفةُ الحرق («الماء الحار»، «المدفأة»، «الشوربة»، «درجة ثانية»، «ندبة»، «قديمة») تغلب، والمجهولُ يُنبَّه (مراجعةُ Codex على #780 ومراجعتُها العكسية). و«منظّم» بعد السكر والضغط والنبض انضباطٌ إلّا أن يتبعه «ضربات/قلب/نبض/بطارية/جهاز».
  { key: "core.skin", labelAr: "جرحٌ أو جلدٌ متضرّر", when: (a) => has(a, "skin", "none"),
    terms: /wound|(?<!\b(peptic|gastric|duodenal|stomach) )ulcer(?!ative)|\bburn(s|ed|t)?\b|\bburn[- ]?(scar|wound|injur|contracture)|sunburn|جرح|جروح|قر(ح|وح)(?![ء-ي]* (في |ب)?(ال)?(معد|اثني|اثنا|هضمي))|حرق(?!ان|ه(?![ء-ي]))|(?<=(ندبه|اثر|اثار|موضع|مكان) )حرقه|حرقه(?![ء-ي])(?! (في |ب)?(ال)?(معد|بول|صدر|فم|عين|مري|بلعوم|حلق|لسان))(?=[^.\n،؛]*(حار|ساخن|نار|ماء|مي |شاي|زيت|مكواه|مدفاه|مدفيه|صوبه|بخار|شوربه|حريق|انفجار|صعقه|كيمياوي|كيماوي|حامض|تيزاب|اسيد|طبخ|سيكار|جكاره|شمس|درجه|ندبه|اثر|ملتئم|جلدي|متقرح|تقرح|قديم|كبيره))|حرقه(?![ء-ي])(?! (في |ب)?(ال)?(معد|بول|صدر|فم|عين|مري|بلعوم|حلق|لسان))(?![^.\n؛]*(تنميل|خدر|نمنم|وخز|مثل الكهرب|كالكهرب|عصب|اعصاب|عند المشي|بالليل|ليلا|في الليل|سكري|من السكر|اعتلال|النسا|ديسك|تنزل|ينزل|نازل|مع (ال)?الم|مع وجع))|حروق|محروق/ },
  { key: "core.metalInField", labelAr: "معدنٌ في منطقة العلاج", when: (a) => a.core?.metalInField === "no",
    terms: /(?<!growth )plate(?!let)|screw|\bnail\b|\brod\b|arthroplasty|(?<!\b(hormone|fluid|vitamin d|vitamin|electrolyte|iron|enzyme|nicotine|calcium|estrogen|oestrogen|testosterone) )replacement|prosthe|fixat|صفيحه|براغي|مسامير|مسمار(?! (ال)?لحم)|بلاتين|مفصل صناعي|(استبدال|تبديل) (ال)?مفصل|تثبيت داخلي|مثبت خارجي|شظيه|شظايا/ },
  { key: "redFlags.cauda_equina", labelAr: "أعراضُ ذيل الفرس", when: (a) => a.redFlags?.cauda_equina === "no",
    terms: /saddle(?! (height|position|seat))|cauda|incontinen|urinary retention|خدر العجان|العجان|سلس(?!ل)|احتباس(?! (ال)?(سوائل|ماء))/ },
  { key: "redFlags.cardiac", labelAr: "ألمُ الصدر أو الإغماء", when: (a) => a.redFlags?.cardiac === "no",
    terms: /chest pain|syncope|(الم|وجع) (في |ب)?(ال)?صدر|ضيق نفس|اغماء/ },
  { key: "redFlags.fracture", labelAr: "كسر", when: (a) => a.redFlags?.fracture === "no", terms: /fracture|كسر|كسور/ },
  { key: "redFlags.dvt_pe", labelAr: "خثرة", when: (a) => a.redFlags?.dvt_pe === "no",
    terms: /\bdvt\b|thrombo(?!cyt|lys|lyt)|(?<!cardio)embol(?!ic (stroke|infarct|cva))|خثره|جلطه في الساق|جلطه رئويه|جلطه بالساق/ },
];
export const TEXT_SAFETY_KEYS: readonly string[] = TEXT_SAFETY_TERMS.map((t) => t.key);

export interface TextSafetyHit { key: string; labelAr: string; term: string; acknowledged: boolean }
/**
 * **ما يخالف ورقةَ السلامة في النصوص** (التشخيص والشكوى والموجودات والملاحظات، وأجوبةُ أسئلة Bionic AI النصّية) — للثالثة وحدها.
 * `acknowledged`: أكّده الفاحصُ في المعاينة (`textSafetyAck`) — فلا يمنع، ويبقى للنموذج تلميحاً.
 */
export function textSafetyHitsOf(a: unknown, texts: readonly (string | null | undefined)[]): TextSafetyHit[] {
  const x = a as Exam | null;
  if (!x || typeof x !== "object" || x.form !== "BC-PT-02" || x.version !== 3) return [];
  const text = normalizeArabicForSearch(texts.filter((t): t is string => typeof t === "string" && Boolean(t.trim())).join("\n"));
  if (!text) return [];
  const ack = new Set(Array.isArray((x as any).textSafetyAck) ? ((x as any).textSafetyAck as string[]) : []);
  const out: TextSafetyHit[] = [];
  for (const t of TEXT_SAFETY_TERMS) {
    if (!t.when(x)) continue;
    const term = firstPositive(text, t.terms);
    if (term) out.push({ key: t.key, labelAr: t.labelAr, term, acknowledged: ack.has(t.key) });
  }
  return out;
}
/** ما يمنع الخطّةَ منها — غيرُ المؤكَّد. */
export const textSafetyConflictsOf = (a: unknown, texts: readonly (string | null | undefined)[]): TextSafetyHit[] =>
  textSafetyHitsOf(a, texts).filter((h) => !h.acknowledged);

/** **حالاتُ المكتبة التي يذكرها النصّ** — ما له موانعُ أو مدخلاتُ بوّابةٍ خاصّة به. «غير ذلك» لا تصحّ معها. */
const LIBRARY_CONDITION_TERMS: readonly { labelAr: string; terms: RegExp }[] = [
  { labelAr: "أسفل الظهر والجذر القطنيّ", terms: /low back|lumbar|sciatica|(?<!\b(tmj|jaw|temporomandibular|articular) )\bdisc\b|ديسك|(?<!(بعد|قبل) )الظهر|الم ظهر|قطني|انزلاق غضروفي|عرق النسا|(^|[\s،.])النسا([\s،.]|$)/ },
  { labelAr: "الرقبة", terms: /(?<!femoral )\bneck\b(?! of (the )?(femur|humerus|bladder|womb))|cervical(?! (cancer|smear|cerclage))|(ال)?رقبه(?! (ال)?(فخذ|عظم))|(ال)?عنق(?! (ال)?(رحم|فخذ|عظم|مثانه))/ },
  { labelAr: "الجلطة الدماغية", terms: /(?<!(heat|sun) )stroke|\bcva\b|hemipleg|جلطه دماغيه|جلطه بالدماغ|سكته دماغيه|شلل نصفي/ },
  { labelAr: "التصلّب اللويحيّ", terms: /multiple sclerosis|(?<![\d.] ?)\bms\b|تصلب لويحي|التصلب اللويحي|التصلب المتعدد/ },
  { labelAr: "شلل العصب الوجهيّ", terms: /bell'?s|facial (nerve )?palsy|شلل الوجه|شلل وجهي|العصب الوجهي|شلل بل(?![ء-ي])|لقوه/ },
  { labelAr: "الروماتويد أو المفاصل اليفعية", terms: /rheumatoid|juvenile (idiopathic )?arthritis|\bjia\b|روماتويد|رثياني|الروماتيزم اليفعي|يفعي/ },
  { labelAr: "التهاب الفقار المحوريّ", terms: /ankylosing|spondyloarth|axial spa|التهاب (ال)?فقار|الفقار (اللاصق|المقسط|المحوري)/ },
  { labelAr: "الكتف التكلّسيّ", terms: /calcif|تكلس/ },
  { labelAr: "الكفّة المدوّرة", terms: /rotator cuff|\bcuff\b|الكفه المدوره|الكفه الدواره/ },
  { labelAr: "وتر العرقوب", terms: /achilles|عرقوب|العرقوب/ },
  { labelAr: "مرفق التنس", terms: /tennis elbow|lateral epicond|مرفق التنس|كوع التنس/ },
  { labelAr: "ما بعد استبدال الورك", terms: /hip (replacement|arthroplasty)|\btha\b|(استبدال|تبديل) (مفصل )?(ال)?ورك|مفصل ورك صناعي|ورك صناعي/ },
  { labelAr: "هشاشة العظام", terms: /osteopor|هشاشه/ },
  { labelAr: "الوذمة اللمفية", terms: /lymph(o)?edema|lymphoedema|وذمه لمفيه|الوذمه اللمفيه|(ال)?وذمه (ال)?ليمفاويه|(تورم|انتفاخ) (ال)?لي?مفاوي/ },
];
/** النصُّ يذكر حالاتٍ من المكتبة (غيرَ منفيّة) ⟵ أسماؤها؛ وبلا ذكرٍ ⟵ []. */
export function otherGroupTextConflicts(texts: readonly (string | null | undefined)[]): string[] {
  const text = normalizeArabicForSearch(texts.filter((t): t is string => typeof t === "string" && Boolean(t.trim())).join("\n"));
  if (!text) return [];
  return LIBRARY_CONDITION_TERMS.filter((c) => firstPositive(text, c.terms) !== null).map((c) => c.labelAr);
}
