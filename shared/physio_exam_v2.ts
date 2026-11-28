// **معاينةُ العلاج الطبيعي الإلزامية — الاستمارة `BC-PT-02`** (§4.gz، قرارُ المالك ٢٠٢٦-١١-٢٧).
//
// قرارُ المالك: «المعاينةُ إلزاميةٌ منظَّمة» — وهو **ينقض** قرارَ ٢٠٢٦-١٠-١٠ («لا خانةَ إلزامية»، §4.da) **للاستمارة الجديدة وحدها**:
// ما خُزّن بالأولى (`BC-PT-01`) يبقى مقروءاً في كلّ مكان، وتنقيحُه يبقى كما كان بلا إلزام. والثانيةُ ثلاثُ بطاقات فوق أقسام الأولى:
//   ١. **النواة** — لكلّ مريض: مجموعةُ التشخيص (أربعَ عشرةَ مجموعة مغلقة) والتشخيصُ نصّاً والعمرُ والجهةُ وبدايةُ الأعراض والعمليةُ
//      والألمُ والتهيّجُ والإحساسُ والإبلاغُ عن الحرارة والمشيُ والمزروعُ والمعدنُ والحملُ والأدويةُ والأمراضُ… وكلُّ سؤالٍ بشرطه
//      (الحملُ للأنثى في سنّ الإنجاب، وسكّرُ الأساس لمريض الإنسولين، والمعدنُ حين عمليةٌ أو كسرٌ أو بتر — نقدُ التصميم §ج.١٨).
//   ٢. **وحدةُ المجموعة** — خاناتُها الإلزامية وحدها ما يقرّر المسارَ أو البوّابة (GMFCS · هون-ياهر · EDSS · AIS ومستواه · مستوى K ·
//      STarT Back · مرحلةُ ISL · كوب وريسر · DAS28 · هاوس-براكمان…)، والمقاييسُ الأخرى اختيارية (نقدُ التصميم §ج.٢٠).
//   ٣. **العلاماتُ الحمراء** — ثمانٍ عامّة لكلّ مريض (نقدُ التصميم §ج.١٩) وما يخصّ المجموعة؛ كلُّ سؤالٍ نعم/لا، و«لا شيء ممّا سبق» بضغطة.
// والأقسامُ المُعادة من الأولى بخاناتها نفسِها: الإحساسُ (إلزاميٌّ هنا) وقوةُ العضلات وأشورث والحالةُ الوظيفية.
//
// **ومصفوفةُ الموانع حتمية** (`forbiddenDevices`) بتصحيحات الناقد: حدُّ الضغط لكلّ بروتوكول لا بوّابةٌ عامّة في المعاينة (§أ.١ و§ج.١٧)،
// ولا قاعدةَ INR بلا مصدر (§أ.٣)، ومنعُ الروبوت بـFAC للجلطة وحدها (§أ.٥)، والصيامُ والصرعُ وكبتُ المناعة والوزنُ وحاصراتُ بيتا
// وتاريخُ البوتوكس خاناتٌ في النواة (§ب.٦–١٥). والمرجعُ الكامل: `exam_design.json` (تصميمُ المعاينة من البروتوكولات الأربعة والأربعين ونقدُه).
//
// هذا الملفُّ **المصدرُ الواحد**: الخادمُ يفحص به قبل أيّ كتابة، والشاشةُ تعرض به وتفحص قبل الإرسال، و«اقترح خطّة» يقرأ نصَّه الإنجليزي.
import { otherGroupTextConflicts, TEXT_SAFETY_KEYS } from "./physio_exam_text_safety";
import {
  PT_FORM_CODE, PT_FORM_CODE_V2, PT_SENSATION, assessmentAsEnglishText, assessmentGaps, assessmentGapsText, assessmentSummaryAr,
  emptyInitialAssessment, parseInitialAssessment, sensationNeedsRegions, optLabel, type Opt, type PhysioInitialAssessment,
} from "./physio_initial_assessment";
import { arDigits } from "./physio_exercises";

export { PT_FORM_CODE_V2 };
export const PT_FORM_VERSION_V2 = 2;
/** **«تشخيصٌ حرّ + ورقةُ سلامةٍ قصيرة»** (§4.hd، طلبُ المالك ٢٠٢٦-١١-٢٨): الاستمارةُ نفسُها `BC-PT-02` بإصدارٍ ثالث — التشخيصُ نصٌّ حرٌّ إلزاميّ،
 *  وورقةُ السلامة (`V3_REQUIRED_CORE`) والعلاماتُ الحمراء الأربعون كلُّها إلزامية، وكلُّ ما عداها اختياريّ يسأل عنه Bionic AI. والمجهولُ أسوأُ قيمه
 *  في الموانع الحتمية (`forbiddenDevices`). والثانيةُ الموقَّعة تبقى بقواعدها كلِّها. */
export const PT_FORM_VERSION_V3 = 3;
export type ExamRuleset = "v2" | "v3";

const o = (code: string, en: string, ar: string): Opt => ({ code, en, ar });

export type V2Value = string | number | string[] | null;
export type V2Values = Record<string, V2Value>;
export type RedFlagAnswer = "yes" | "no";

/** **ما يُخزَّن مع المعاينة** — خاناتُ الأولى كلُّها (المُعادُ منها يُقرأ كما هو) وفوقها الثلاث. */
export interface PhysioExamV2 extends PhysioInitialAssessment {
  form: typeof PT_FORM_CODE_V2;
  version: typeof PT_FORM_VERSION_V2 | typeof PT_FORM_VERSION_V3;
  core: V2Values;
  module: V2Values;
  redFlags: Record<string, RedFlagAnswer>;
  /** §4.hd — **مَن كتب الخانةَ بجواب سؤالٍ لـ Bionic AI** (`core.x` · `module.x`). يكتبه الخادمُ وحده (لا يُقبل من العميل)، ويسقط حين يغيّر الفاحصُ الخانة. */
  fieldSources?: Record<string, ExamFieldSource>;
  /** §4.hd (المراجعة) — **ما أكّده الفاحصُ من تنبيهات النصّ الحرّ** (`textSafetyHitsOf`): مفاتيحُ ورقة السلامة التي قال فيها «الورقةُ صحيحة رغم ما في النصّ». للثالثة وحدها. */
  textSafetyAck?: string[];
}
export interface ExamFieldSource { by: number | null; byName: string | null; jobId: number; round: number; version: number; at: string }

/** **قواعدُ أيّ إصدار** — `version: 3` ⟵ v3، وغيرُه (والمخزَّنُ بلا إصدار) ⟵ v2. **ولا يقرأ `version` غيرُ هذه الدالّة في هذا الملفّ.** */
export const examRuleset = (a: unknown): ExamRuleset => (a && typeof a === "object" && (a as any).version === PT_FORM_VERSION_V3 ? "v3" : "v2");

export const isExamV2 = (a: unknown): a is PhysioExamV2 =>
  Boolean(a && typeof a === "object" && (a as any).form === PT_FORM_CODE_V2);

// ══ أنواعُ الخانات ═══════════════════════════════════════════════════════════════════════════════
export type V2Kind = "choice" | "multi" | "yesno" | "int" | "num" | "date" | "text";

export interface V2Ctx {
  core: V2Values;
  module: V2Values;
  group: string | null;
  condition: string | null;
  ageYears: number | null;
  sex: string | null;
  ruleset: ExamRuleset;
}

export interface V2Field {
  key: string;
  ar: string;
  en: string;
  kind: V2Kind;
  options?: readonly Opt[];
  /** في `multi`: الرمزُ الذي لا يجتمع مع غيره («لا شيء»). */
  exclusive?: string;
  min?: number;
  max?: number;
  /** في `num`: الخطوة (EDSS بنصف درجة). */
  step?: number;
  unit?: string;
  unitEn?: string;
  /** إلزاميٌّ (حين يكون ظاهراً). */
  required?: boolean | ((c: V2Ctx) => boolean);
  /** يظهر ويُخزَّن حين يصدق — وإلّا يُمحى. */
  when?: (c: V2Ctx) => boolean;
  hint?: string;
  /** في `date`: لا يكون في المستقبل. */
  noFuture?: boolean;
}

export const V2_YES_NO: readonly Opt[] = [o("yes", "Yes", "نعم"), o("no", "No", "لا")];
const SIDES4: readonly Opt[] = [o("right", "Right", "يمين"), o("left", "Left", "يسار"), o("both", "Both sides", "الجانبان"), o("axial", "Axial (spine)", "محوريّ (العمود الفقري)")];
const grades = (list: string[]): Opt[] => list.map((g) => o(g, g, g));

// ══ المجموعاتُ الأربعَ عشرة وبروتوكولاتُها (exam_design.json · per_diagnosis_modules) ══════════════════════════════
export interface V2Condition { code: string; ar: string; en: string; protocols: readonly string[] }
export interface V2Module {
  group: string;
  ar: string;
  en: string;
  protocols: readonly string[];
  conditions?: readonly V2Condition[];
  fields: readonly V2Field[];
}

const isCond = (...codes: string[]) => (c: V2Ctx) => c.condition !== null && codes.includes(c.condition);
const num = (key: string, ar: string, en: string, min: number, max: number, extra: Partial<V2Field> = {}): V2Field =>
  ({ key, ar, en, kind: "num", min, max, ...extra });
const int = (key: string, ar: string, en: string, min: number, max: number, extra: Partial<V2Field> = {}): V2Field =>
  ({ key, ar, en, kind: "int", min, max, ...extra });
const yn = (key: string, ar: string, en: string, extra: Partial<V2Field> = {}): V2Field => ({ key, ar, en, kind: "yesno", options: V2_YES_NO, ...extra });
const ch = (key: string, ar: string, en: string, options: readonly Opt[], extra: Partial<V2Field> = {}): V2Field =>
  ({ key, ar, en, kind: "choice", options, ...extra });
const tx = (key: string, ar: string, en: string, extra: Partial<V2Field> = {}): V2Field => ({ key, ar, en, kind: "text", ...extra });
const dt = (key: string, ar: string, en: string, extra: Partial<V2Field> = {}): V2Field => ({ key, ar, en, kind: "date", noFuture: true, ...extra });
const REQ = { required: true } as const;

const SWELLING: readonly Opt[] = [o("0", "0 (none)", "٠ (لا تورّم)"), o("trace", "Trace", "أثر"), o("1+", "1+", "1+"), o("2+", "2+", "2+"), o("3+", "3+", "3+")];

export const V2_MODULES: readonly V2Module[] = [
  {
    //  ترحيلات ١١٩ (المزمن) و١٢٤ (الحادّ) و١٤٥ (عِرق النسا) و١٥٣ (التضيّق).
    group: "lumbar", ar: "أسفل الظهر والجذر القطنيّ", en: "Low back & lumbar radicular",
    protocols: ["lbp-chronic-adult", "lbp-acute-adult", "lumbar-radiculopathy-adult", "lumbar-stenosis-geriatric"],
    conditions: [
      { code: "nonspecific", ar: "ألمُ ظهرٍ غير نوعيّ", en: "Non-specific low back pain (acute or chronic by onset)", protocols: ["lbp-acute-adult", "lbp-chronic-adult"] },
      { code: "radiculopathy", ar: "اعتلالُ جذرٍ قطنيّ / عِرق النسا", en: "Lumbar radiculopathy / sciatica", protocols: ["lumbar-radiculopathy-adult"] },
      { code: "stenosis", ar: "تضيّقُ القناة القطنية", en: "Lumbar spinal stenosis", protocols: ["lumbar-stenosis-geriatric"] },
    ],
    fields: [
      //  يفصل الحادَّ عن عِرق النسا (١٢٤ · ١٤٥).
      yn("belowKnee", "ألمٌ تحت الركبة مع خدرٍ أو ضعفٍ أو علامةٍ عصبية", "Pain below the knee with numbness, weakness or a neurological sign", REQ),
      //  يقرّر المسار (١١٩ · ١٢٤ · ١٤٥ — نقدُ التصميم §ج.٢٠).
      ch("startBack", "STarT Back", "STarT Back risk", [o("low", "Low", "منخفض"), o("medium", "Medium", "متوسّط"), o("high", "High", "عالٍ")], REQ),
      ch("directionPref", "الاتّجاه المفضَّل", "Directional preference", [o("extension", "Extension", "انبساط"), o("flexion", "Flexion", "انثناء"),
        o("lateral_shift", "Lateral shift", "انزياحٌ جانبيّ"), o("none", "None", "لا يوجد"), o("not_tested", "Not tested", "لم يُختبَر")], REQ),
      int("backPain", "ألمُ الظهر الآن", "Back pain now", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      int("legPain", "ألمُ الساق الآن", "Leg pain now", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      ch("centralization", "المركزة", "Centralization", [o("centralizes", "Centralizes", "مركزة"), o("unstable", "Unstable", "غير ثابتة"),
        o("peripheralizes", "Peripheralizes", "طرفنة"), o("no_effect", "No effect", "لا أثر")]),
      int("odi", "ODI", "Oswestry Disability Index", 0, 100, { unit: "٪", unitEn: "%" }),
      int("slrDeg", "رفعُ الساق مستقيمة", "Straight leg raise", 0, 90, { unit: "°", unitEn: "°" }),
      ch("slrSide", "جهةُ رفع الساق الإيجابي", "SLR positive side", [o("negative", "Negative", "سلبيّ"), o("right", "Right", "يمين"), o("left", "Left", "يسار"), o("both", "Both", "الجهتان")]),
      int("sittingMin", "الجلوسُ المتّصل قبل اشتداد ألم الساق", "Continuous sitting before leg pain rises", 0, 600, { unit: "دقيقة", unitEn: "min" }),
      //  للتضيّق (١٥٣): العرجُ الوعائيّ ومسافةُ المشي.
      ch("footPulses", "نبضُ القدم", "Foot pulses", [o("normal", "Normal", "طبيعيّ"), o("reduced", "Reduced", "ضعيف"), o("absent", "Absent", "غائب")],
        { ...REQ, when: isCond("stenosis") }),
      int("walkToSymptomsM", "مسافةُ المشي حتى الأعراض", "Walking distance to symptoms", 0, 10000, { ...REQ, unit: "م", unitEn: "m", when: isCond("stenosis") }),
      ch("hipExam", "فحصُ الورك", "Hip examination", [o("normal", "Normal", "طبيعيّ"), o("abnormal", "Abnormal", "غير طبيعيّ")], { when: isCond("stenosis") }),
      //  قاعدةُ التقويم للحادّ (١٢٤ — Flynn): عددُ المعايير الخمسة.
      int("manipulationRule", "معاييرُ قاعدة التقويم المتوفّرة", "Manipulation clinical prediction rule criteria met", 0, 5, { unit: "من ٥", unitEn: "of 5", when: isCond("nonspecific") }),
    ],
  },
  {
    //  ترحيلات ١٢٥ (الميكانيكيّ) و١٥١ (الجذريّ العنقيّ) و١٨٣ (الارتجاجية).
    group: "neck", ar: "الرقبة والجذر العنقيّ", en: "Neck & cervical radicular",
    protocols: ["neck-pain-mechanical-adult", "cervical-radiculopathy-adult", "whiplash-adult"],
    conditions: [
      { code: "mechanical", ar: "ألمُ رقبةٍ ميكانيكيّ", en: "Mechanical neck pain", protocols: ["neck-pain-mechanical-adult"] },
      { code: "radiculopathy", ar: "اعتلالُ جذرٍ عنقيّ", en: "Cervical radiculopathy", protocols: ["cervical-radiculopathy-adult"] },
      { code: "whiplash", ar: "رقبةٌ ارتجاجية بعد حادث", en: "Whiplash-associated disorder", protocols: ["whiplash-adult"] },
    ],
    fields: [
      int("neckPain", "ألمُ الرقبة الآن", "Neck pain now", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      int("armPain", "ألمُ الذراع الآن", "Arm pain now", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      //  فحصُ الشريان العنقيّ قبل أيّ علاجٍ يدويّ (١٢٥).
      ch("arterialScreen", "فحصُ الشريان العنقيّ قبل العلاج اليدويّ", "Cervical arterial screen before manual therapy",
        [o("negative", "Done — negative", "أُجري — سلبيّ"), o("positive", "Done — positive", "أُجري — إيجابيّ"), o("not_done", "Not done", "لم يُجرَ")], REQ),
      //  عنقودُ وينر يقرّر التشخيص (١٥١).
      int("wainner", "عنقودُ وينر (عددُ الإيجابي)", "Wainner cluster (positive tests)", 0, 4, { ...REQ, when: isCond("radiculopathy") }),
      //  درجةُ كيبك تقرّر مسارَ الارتجاجية (١٨٣).
      ch("quebecGrade", "درجةُ كيبك", "Quebec Task Force grade", grades(["0", "I", "II", "III", "IV"]), { ...REQ, when: isCond("whiplash") }),
      int("hyperarousal", "فرطُ الاستثارة (WhipPredict)", "Hyperarousal (WhipPredict)", 0, 15, { when: isCond("whiplash") }),
      yn("seatbelt", "كان يضع حزامَ الأمان", "Seat belt worn", { when: isCond("whiplash") }),
      int("rotationR", "دورانُ الرقبة يميناً", "Neck rotation right", 0, 90, { unit: "°", unitEn: "°" }),
      int("rotationL", "دورانُ الرقبة يساراً", "Neck rotation left", 0, 90, { unit: "°", unitEn: "°" }),
      int("cookMyelopathy", "عنقودُ اعتلال النخاع (كوك)", "Cook myelopathy cluster", 0, 5),
      int("ndi", "NDI", "Neck Disability Index", 0, 50),
      yn("headache", "صداعٌ عنقيّ المنشأ", "Cervicogenic headache"),
    ],
  },
  {
    //  ترحيلات ١٢٨ (تحت الأخرم) و١٤٩ (المتجمّد) و١٧٩ (التكلّسيّ) و١٧٨ (ما بعد إصلاح الكفّة).
    group: "shoulder", ar: "الكتف", en: "Shoulder",
    protocols: ["subacromial-pain-adult", "frozen-shoulder-adult", "calcific-shoulder-adult", "rotator-cuff-repair-adult"],
    conditions: [
      { code: "subacromial", ar: "ألمُ تحت الأخرم / اعتلالُ أوتار الكفّة", en: "Subacromial pain / rotator cuff tendinopathy", protocols: ["subacromial-pain-adult"] },
      { code: "frozen", ar: "الكتفُ المتجمّد", en: "Frozen shoulder", protocols: ["frozen-shoulder-adult"] },
      { code: "calcific", ar: "الكتفُ التكلّسيّ", en: "Calcific tendinopathy", protocols: ["calcific-shoulder-adult"] },
      { code: "cuff_repair", ar: "ما بعد إصلاح الكفّة المدوّرة", en: "After rotator cuff repair", protocols: ["rotator-cuff-repair-adult"] },
    ],
    fields: [
      //  الدورانُ الخارجيّ السلبيّ يفصل المتجمّد (١٤٩).
      int("passiveErAffected", "الدورانُ الخارجيّ السلبيّ — المصابة", "Passive external rotation — affected", 0, 120, { ...REQ, unit: "°", unitEn: "°" }),
      int("passiveErOther", "الدورانُ الخارجيّ السلبيّ — السليمة", "Passive external rotation — other side", 0, 120, { ...REQ, unit: "°", unitEn: "°" }),
      int("activeElevation", "الرفعُ الفاعل", "Active elevation", 0, 180, { ...REQ, unit: "°", unitEn: "°" }),
      int("nightPain", "ألمُ الليل", "Night pain", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      int("passiveElevation", "الرفعُ السلبيّ", "Passive elevation", 0, 180, { unit: "°", unitEn: "°" }),
      int("spadi", "SPADI", "SPADI", 0, 100),
      int("michener", "عنقودُ ميشنر (عددُ الإيجابي)", "Michener cluster (positive tests)", 0, 5),
      yn("thyroid", "مرضٌ في الغدّة الدرقية", "Thyroid disease"),
      //  نوعُ غارتنر والنوبةُ الحادّة يقرّران المسار (١٧٩).
      ch("gartner", "نوعُ غارتنر", "Gärtner type", grades(["I", "II", "III"]), { ...REQ, when: isCond("calcific") }),
      yn("acuteAttack", "نوبةٌ حادّة الآن", "Acute calcific attack now", { ...REQ, when: isCond("calcific") }),
      num("depositMm", "حجمُ الترسّب", "Deposit size", 0, 60, { unit: "ملم", unitEn: "mm", when: isCond("calcific") }),
      //  حجمُ التمزّق وإصلاحُ تحت الكتف يقرّران القيودَ والموجاتِ الصادمة (١٧٨).
      ch("tearSize", "حجمُ التمزّق", "Tear size", [o("small", "Small", "صغير"), o("medium", "Medium", "متوسّط"), o("large", "Large", "كبير"), o("massive", "Massive", "هائل")],
        { ...REQ, when: isCond("cuff_repair") }),
      yn("subscapRepair", "أُصلح وترُ تحت الكتف", "Subscapularis repaired", { ...REQ, when: isCond("cuff_repair") }),
      ch("repairTrack", "المسار", "Rehabilitation track", [o("standard", "Standard", "عاديّ"), o("protected", "Protected", "محميّ")], { when: isCond("cuff_repair") }),
    ],
  },
  {
    //  ترحيلات ١٥٢ (مرفق التنس) و١٦١ (النفق الرسغي) و١٦٢ (كسر الكعبرة) و١٨٢ (خشونة اليد).
    group: "elbow_hand", ar: "المرفق والرسغ واليد", en: "Elbow, wrist & hand",
    protocols: ["lateral-elbow-adult", "carpal-tunnel-adult", "distal-radius-fracture-adult", "hand-oa-geriatric"],
    conditions: [
      { code: "lateral_elbow", ar: "مرفقُ التنس", en: "Lateral elbow tendinopathy", protocols: ["lateral-elbow-adult"] },
      { code: "carpal_tunnel", ar: "متلازمةُ النفق الرسغي", en: "Carpal tunnel syndrome", protocols: ["carpal-tunnel-adult"] },
      { code: "distal_radius", ar: "ما بعد كسر الكعبرة البعيد", en: "After distal radius fracture", protocols: ["distal-radius-fracture-adult"] },
      { code: "hand_oa", ar: "خشونةُ مفاصل اليد", en: "Hand osteoarthritis", protocols: ["hand-oa-geriatric"] },
    ],
    fields: [
      num("painFreeGripKg", "القبضةُ بلا ألم — المصابة", "Pain-free grip — affected", 0, 100, { ...REQ, unit: "كغم", unitEn: "kg", when: isCond("lateral_elbow") }),
      int("prtee", "PRTEE", "PRTEE", 0, 100, { when: isCond("lateral_elbow") }),
      ch("pinScreen", "فحصُ العصب بين العظمي الخلفيّ", "Posterior interosseous nerve screen", [o("normal", "Normal", "طبيعيّ"), o("abnormal", "Abnormal", "غير طبيعيّ")], { when: isCond("lateral_elbow") }),
      int("cts6", "CTS-6", "CTS-6", 0, 26, { ...REQ, when: isCond("carpal_tunnel") }),
      yn("thenarAtrophy", "ضمورُ عضلات الإبهام", "Thenar atrophy", { ...REQ, when: isCond("carpal_tunnel") }),
      int("nightWakings", "مرّاتُ الاستيقاظ في الأسبوع", "Night wakings per week", 0, 50, { when: isCond("carpal_tunnel") }),
      int("twoPointMm", "التمييزُ بين نقطتين", "Two-point discrimination", 0, 30, { unit: "ملم", unitEn: "mm", when: isCond("carpal_tunnel") }),
      ch("fixation", "طريقةُ علاج الكسر", "Fracture management", [o("cast", "Cast only", "جبسٌ فقط"), o("plate", "Plate", "صفيحة"),
        o("wires", "K-wires", "أسلاك"), o("external_fixator", "External fixator", "مثبّتٌ خارجيّ")], { ...REQ, when: isCond("distal_radius") }),
      yn("healingConfirmed", "أقرّ الطبيبُ الثباتَ أو الالتئام", "Stability / union confirmed by the doctor", { ...REQ, when: isCond("distal_radius") }),
      int("prwe", "PRWE", "PRWE", 0, 100, { when: isCond("distal_radius") }),
      ch("handOaSite", "الموضع", "Site", [o("thumb_base", "Thumb base", "قاعدةُ الإبهام"), o("fingers", "Fingers", "مفاصلُ الأصابع"), o("both", "Both", "الاثنان")],
        { ...REQ, when: isCond("hand_oa") }),
      yn("inflammatoryHandOa", "شكلٌ التهابيّ (تآكليّ)", "Inflammatory / erosive form", { ...REQ, when: isCond("hand_oa") }),
      int("fihoa", "FIHOA", "FIHOA", 0, 30, { when: isCond("hand_oa") }),
      num("gripMaxAffectedKg", "القبضةُ القصوى — المصابة", "Max grip — affected", 0, 100, { unit: "كغم", unitEn: "kg" }),
      num("gripMaxOtherKg", "القبضةُ القصوى — السليمة", "Max grip — other side", 0, 100, { unit: "كغم", unitEn: "kg" }),
      int("quickDash", "QuickDASH العربي", "QuickDASH (Arabic)", 0, 100),
    ],
  },
  {
    //  ترحيلات ١٢٦ (خشونة الركبة) و١٥٦ (خشونة الورك) و١٥٥ (الرضفة الفخذيّ).
    group: "hip_knee", ar: "خشونةُ الورك والركبة وألمُ الرضفة", en: "Hip & knee osteoarthritis, patellofemoral pain",
    protocols: ["knee-oa-geriatric", "hip-oa-geriatric", "patellofemoral-pain-adult"],
    conditions: [
      { code: "knee_oa", ar: "خشونةُ الركبة", en: "Knee osteoarthritis", protocols: ["knee-oa-geriatric"] },
      { code: "hip_oa", ar: "خشونةُ الورك", en: "Hip osteoarthritis", protocols: ["hip-oa-geriatric"] },
      { code: "patellofemoral", ar: "ألمُ الرضفة الفخذيّ", en: "Patellofemoral pain", protocols: ["patellofemoral-pain-adult"] },
    ],
    fields: [
      //  اختباراتُ الأداء (OARSI) أساسُ معايير الانتقال (١٢٦ · ١٥٦).
      int("sitToStand30", "الجلوسُ والقيام في ٣٠ ثانية", "30-s chair stand", 0, 60, { ...REQ, unit: "مرّة", unitEn: "reps", when: isCond("knee_oa", "hip_oa") }),
      num("tugSec", "النهوضُ والمشي (TUG)", "Timed Up and Go", 0, 300, { unit: "ثانية", unitEn: "s" }),
      ch("swellingStroke", "التورّم بالمسح", "Stroke-test swelling", SWELLING),
      int("kneeFlexionDeg", "ثنيُ الركبة", "Knee flexion", 0, 160, { unit: "°", unitEn: "°" }),
      int("extensionDeficitDeg", "نقصُ البسط", "Extension deficit", 0, 60, { unit: "°", unitEn: "°" }),
      int("hipIrDeg", "دورانُ الورك الداخليّ", "Hip internal rotation", 0, 60, { unit: "°", unitEn: "°", when: isCond("hip_oa") }),
      ch("oaCompartment", "موضعُ الخشونة", "OA compartment", [o("medial", "Medial", "إنسيّ"), o("lateral", "Lateral", "وحشيّ"),
        o("patellofemoral", "Patellofemoral", "رضفيّ"), o("mixed", "Mixed", "مختلط")], { when: isCond("knee_oa") }),
      int("koosHoos", "KOOS / HOOS", "KOOS / HOOS", 0, 100, { when: isCond("knee_oa", "hip_oa") }),
      int("kujala", "كوجالا", "Kujala", 0, 100, { when: isCond("patellofemoral") }),
    ],
  },
  {
    //  ترحيلا ١٥٨ (الغضروف الهلاليّ) و١٥٩ (الرباط الصليبيّ).
    group: "sports_knee", ar: "إصاباتُ الركبة الرياضية", en: "Sports knee injuries",
    protocols: ["knee-meniscal-adult", "acl-reconstruction-adult"],
    conditions: [
      { code: "meniscal", ar: "إصابةُ الغضروف الهلاليّ", en: "Meniscal injury", protocols: ["knee-meniscal-adult"] },
      { code: "acl", ar: "الرباطُ الصليبيّ الأماميّ", en: "Anterior cruciate ligament", protocols: ["acl-reconstruction-adult"] },
    ],
    fields: [
      //  المساراتُ الأربعة للغضروف (١٥٨).
      ch("meniscalTrack", "مسارُ الغضروف", "Meniscal track", [o("degenerative", "Degenerative", "تنكّسيّ"), o("traumatic", "Traumatic (≤45 y)", "إصابيّ (٤٥ فأقلّ)"),
        o("post_meniscectomy", "After partial meniscectomy", "بعد الاستئصال الجزئيّ"), o("post_repair", "After meniscal repair", "بعد الخياطة")],
        { ...REQ, when: isCond("meniscal") }),
      ch("aclStage", "قبل العملية أم بعدها", "Before or after reconstruction", [o("preop", "Before surgery", "قبل العملية"), o("postop", "After reconstruction", "بعد إعادة البناء")],
        { ...REQ, when: isCond("acl") }),
      //  قواعدُ الطُّعم وخياطةُ الغضروف (١٥٩).
      ch("graftType", "نوعُ الطُّعم", "Graft type", [o("bptb", "Patellar tendon (BTB)", "وترُ الرضفة"), o("hamstring", "Hamstring", "خلفُ الفخذ"),
        o("quadriceps", "Quadriceps", "الرباعية"), o("allograft", "Allograft", "طُعمٌ من متبرّع"), o("other", "Other", "غيره")],
        { ...REQ, when: (c) => c.condition === "acl" && c.module.aclStage === "postop" }),
      yn("concurrentMeniscalRepair", "خياطةُ غضروفٍ مع الرباط", "Concurrent meniscal repair", { ...REQ, when: (c) => c.condition === "acl" && c.module.aclStage === "postop" }),
      //  قاعدةُ التورّم ونقصُ البسط (١٥٨ · ١٥٩).
      ch("swellingStroke", "التورّم بالمسح", "Stroke-test swelling", SWELLING, REQ),
      int("extensionDeficitDeg", "نقصُ البسط مقارنةً بالجهة الأخرى", "Extension deficit vs other side", 0, 60, { ...REQ, unit: "°", unitEn: "°" }),
      yn("slrNoLag", "رفعُ الساق مستقيمة بلا تأخّر", "Straight leg raise without lag", REQ),
      int("kneeFlexionDeg", "ثنيُ الركبة", "Knee flexion", 0, 160, { unit: "°", unitEn: "°" }),
      int("quadStrengthPct", "قوّةُ الفخذ نسبةً إلى الأخرى", "Quadriceps strength vs other side", 0, 150, { unit: "٪", unitEn: "%" }),
      int("ikdc", "IKDC", "IKDC", 0, 100),
      ch("sportLevel", "الرياضة", "Sport", [o("pivoting", "Pivoting", "بدوران"), o("non_pivoting", "Non-pivoting", "بلا دوران"), o("none", "None", "لا يمارس")]),
    ],
  },
  {
    //  ترحيلا ١٣٨ (استبدال الركبة) و١٤٠ (استبدال الورك).
    group: "joint_replacement", ar: "ما بعد استبدال المفاصل", en: "After joint replacement",
    protocols: ["tka-geriatric", "tha-geriatric"],
    conditions: [
      { code: "tka", ar: "ما بعد استبدال الركبة", en: "After total knee arthroplasty", protocols: ["tka-geriatric"] },
      { code: "tha", ar: "ما بعد استبدال الورك", en: "After total hip arthroplasty", protocols: ["tha-geriatric"] },
    ],
    fields: [
      ch("weightBearing", "التحميلُ المسموح", "Permitted weight bearing", [o("full", "Full", "كامل"), o("partial", "Partial", "جزئيّ"),
        o("touch", "Touch", "لمسٌ فقط"), o("non", "Non weight bearing", "لا تحميل")], REQ),
      //  القيودُ بحسب مدخل العملية (١٤٠).
      ch("thaApproach", "مدخلُ العملية", "Surgical approach", [o("posterior", "Posterior", "خلفيّ"), o("lateral", "Direct lateral", "وحشيّ مباشر"),
        o("anterolateral", "Anterolateral", "أماميّ وحشيّ"), o("anterior", "Direct anterior", "أماميّ مباشر"), o("unknown", "Unknown", "غير معروف")],
        { ...REQ, when: isCond("tha") }),
      //  معاييرُ الانتقال بثني الركبة (١٣٨ — Bade 2011).
      int("kneeFlexionDeg", "ثنيُ الركبة", "Knee flexion", 0, 160, { ...REQ, unit: "°", unitEn: "°", when: isCond("tka") }),
      int("extensionDeficitDeg", "نقصُ البسط", "Extension deficit", 0, 60, { ...REQ, unit: "°", unitEn: "°", when: isCond("tka") }),
      yn("extensorLag", "تأخّرُ الباسطة", "Extensor lag", { when: isCond("tka") }),
      num("tugSec", "النهوضُ والمشي (TUG)", "Timed Up and Go", 0, 300, { unit: "ثانية", unitEn: "s" }),
      int("sitToStand30", "الجلوسُ والقيام في ٣٠ ثانية", "30-s chair stand", 0, 60, { unit: "مرّة", unitEn: "reps" }),
      yn("floorPrayer", "يصلّي على الأرض أو يستعمل المرحاضَ العربيّ", "Prays on the floor / uses a squat toilet"),
    ],
  },
  {
    //  ترحيلات ١٣٠ (التواء الكاحل) و١٤٣ (ألم الكعب) و١٨٠ (وتر العرقوب).
    group: "foot_ankle", ar: "القدم والكاحل", en: "Foot & ankle",
    protocols: ["ankle-sprain-adult", "plantar-heel-pain-adult", "achilles-tendinopathy-adult"],
    conditions: [
      { code: "ankle_sprain", ar: "التواءُ الكاحل", en: "Lateral ankle sprain", protocols: ["ankle-sprain-adult"] },
      { code: "plantar_heel", ar: "ألمُ الكعب الأخمصيّ", en: "Plantar heel pain", protocols: ["plantar-heel-pain-adult"] },
      { code: "achilles", ar: "اعتلالُ وتر العرقوب", en: "Achilles tendinopathy", protocols: ["achilles-tendinopathy-adult"] },
    ],
    fields: [
      ch("ottawa", "قواعدُ أوتاوا للكاحل", "Ottawa ankle rules", [o("negative", "Negative", "سلبية"), o("positive", "Positive", "إيجابية")], { ...REQ, when: isCond("ankle_sprain") }),
      ch("sprainGrade", "درجةُ الالتواء", "Sprain grade", grades(["I", "II", "III"]), { ...REQ, when: isCond("ankle_sprain") }),
      int("firstStepPain", "ألمُ الخطوة الأولى", "First-step pain", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10", when: isCond("plantar_heel") }),
      //  الارتكازيّ مسارٌ مستقلّ وبلا موجاتٍ صادمة، والتمزّقُ السابق مانعٌ لها (١٨٠ — نقدُ التصميم §ب.١٠).
      ch("tendonType", "نوعُ الاعتلال", "Tendinopathy type", [o("midportion", "Mid-portion", "منتصفُ الوتر"), o("insertional", "Insertional", "ارتكازيّ")],
        { ...REQ, when: isCond("achilles") }),
      yn("priorRupture", "تمزّقٌ سابق أو جراحةٌ في الوتر", "Previous rupture or tendon surgery", { ...REQ, when: isCond("achilles") }),
      int("visaA", "VISA-A", "VISA-A", 0, 100, { when: isCond("achilles") }),
      int("faamAdl", "FAAM-ADL", "FAAM-ADL", 0, 100),
      num("kneeToWallCm", "الركبةُ عن الحائط — المصابة", "Knee-to-wall — affected", 0, 30, { unit: "سم", unitEn: "cm" }),
      int("heelRaises", "رفعاتُ الكعب على ساقٍ واحدة — المصابة", "Single-leg heel raises — affected", 0, 100),
    ],
  },
  {
    //  ترحيلات ١٣٥ (المشي بالطرف) و١٣٦ (ما قبل الطرف) و١٣٧ (البتر العلويّ).
    group: "amputation", ar: "البتر", en: "Amputation",
    protocols: ["lower-limb-prosthetic-gait-adult", "lower-limb-preprosthetic-adult", "upper-limb-amputation-adult"],
    conditions: [
      { code: "lower_preprosthetic", ar: "طرفٌ سفليّ — قبل الطرف الصناعيّ", en: "Lower limb — pre-prosthetic", protocols: ["lower-limb-preprosthetic-adult"] },
      { code: "lower_prosthetic", ar: "طرفٌ سفليّ — المشي بالطرف الصناعيّ", en: "Lower limb — prosthetic gait", protocols: ["lower-limb-prosthetic-gait-adult"] },
      { code: "upper", ar: "طرفٌ علويّ", en: "Upper limb", protocols: ["upper-limb-amputation-adult"] },
    ],
    fields: [
      ch("lowerLevel", "مستوى البتر", "Amputation level", [o("partial_foot", "Partial foot", "قدمٌ جزئية"), o("transtibial", "Transtibial", "تحت الركبة"),
        o("knee_disarticulation", "Knee disarticulation", "خلال الركبة"), o("transfemoral", "Transfemoral", "فوق الركبة"), o("hip_disarticulation", "Hip disarticulation", "خلال الورك")],
        { ...REQ, when: isCond("lower_preprosthetic", "lower_prosthetic") }),
      ch("upperLevel", "مستوى البتر", "Amputation level", [o("partial_hand", "Partial hand", "يدٌ جزئية"), o("transradial", "Transradial", "تحت المرفق"),
        o("elbow_disarticulation", "Elbow disarticulation", "خلال المرفق"), o("transhumeral", "Transhumeral", "فوق المرفق"), o("shoulder", "Shoulder", "الكتف")],
        { ...REQ, when: isCond("upper") }),
      ch("cause", "سببُ البتر", "Cause", [o("trauma", "Trauma", "رضّيّ"), o("blast", "Blast", "انفجار"), o("vascular", "Vascular", "شريانيّ"),
        o("diabetic", "Diabetic", "سكّريّ"), o("tumour", "Tumour", "ورم"), o("congenital", "Congenital", "خلقيّ"), o("other", "Other", "غيره")], REQ),
      ch("stump", "حالُ الجذع", "Residual limb", [o("healed", "Healed", "ملتئم"), o("discharge", "Discharge", "إفراز"),
        o("neuroma", "Neuroma", "ورمٌ عصبيّ"), o("bony_prominence", "Bony prominence", "نتوءٌ عظميّ")], REQ),
      //  مستوى K يقرّر المسار (١٣٥ · ١٣٦ — نقدُ التصميم §ج.٢٠).
      ch("kLevel", "مستوى K", "K-level", grades(["K0", "K1", "K2", "K3", "K4"]), { ...REQ, when: isCond("lower_preprosthetic", "lower_prosthetic") }),
      ch("upperProsthesis", "نوعُ الطرف العلويّ", "Upper-limb prosthesis", [o("myoelectric", "Myoelectric", "عضليّ كهربائيّ"),
        o("body_powered", "Body-powered", "بالحمّالة"), o("none_yet", "None yet", "لم يُصنع بعد")], { ...REQ, when: isCond("upper") }),
      int("phantomPain", "ألمُ الطرف الشبح", "Phantom limb pain", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
      int("hipFlexionContractureDeg", "تقفّعُ ثني الورك", "Hip flexion contracture", 0, 90, { unit: "°", unitEn: "°", when: isCond("lower_preprosthetic", "lower_prosthetic") }),
      num("tugSec", "النهوضُ والمشي (TUG)", "Timed Up and Go", 0, 300, { unit: "ثانية", unitEn: "s", when: isCond("lower_prosthetic") }),
      ch("soundFoot", "القدمُ السليمة", "Sound foot", [o("normal", "Normal", "سليمة"), o("at_risk", "At risk", "في خطر")], { when: isCond("lower_preprosthetic", "lower_prosthetic") }),
    ],
  },
  {
    //  ترحيلات ١٢٩ و١٥٧ (الجلطة) و١٦٧ (الحبل الشوكي) و١٧٤ (باركنسون) و١٨٤ (التصلّب اللويحيّ) و١٦٣ (شلل الوجه).
    group: "neuro_adult", ar: "الأعصاب عند البالغين", en: "Adult neurology",
    protocols: ["stroke-subacute-adult", "stroke-chronic-adult", "sci-incomplete-adult", "parkinsons-geriatric", "multiple-sclerosis-adult", "bells-palsy-all"],
    conditions: [
      { code: "stroke", ar: "الجلطةُ الدماغية", en: "Stroke", protocols: ["stroke-subacute-adult", "stroke-chronic-adult"] },
      { code: "sci", ar: "إصابةُ الحبل الشوكي", en: "Spinal cord injury", protocols: ["sci-incomplete-adult"] },
      { code: "parkinsons", ar: "باركنسون", en: "Parkinson's disease", protocols: ["parkinsons-geriatric"] },
      { code: "ms", ar: "التصلّبُ اللويحيّ", en: "Multiple sclerosis", protocols: ["multiple-sclerosis-adult"] },
      { code: "bells", ar: "شللُ العصب الوجهيّ", en: "Facial nerve (Bell's) palsy", protocols: ["bells-palsy-all"] },
    ],
    fields: [
      ch("strokeType", "نوعُ الجلطة", "Stroke type", [o("ischemic", "Ischaemic", "إقفاريّة"), o("hemorrhagic", "Haemorrhagic", "نزفية"), o("unknown", "Unknown", "غير معروف")],
        { ...REQ, when: isCond("stroke") }),
      //  الإذنُ قبل الشدّة العالية (١٥٧).
      yn("doctorClearance", "أذن الطبيبُ بالجهد عالي الشدّة", "Doctor cleared high-intensity exercise", { ...REQ, when: isCond("stroke") }),
      yn("wristExt20", "بسطُ الرسغ ٢٠° فأكثر والأصابع ١٠° فأكثر", "Wrist extension ≥20° and fingers ≥10°", { when: isCond("stroke") }),
      int("shoulderSubluxation", "خلعُ الكتف بعرض الأصابع", "Shoulder subluxation (finger widths)", 0, 5, { when: isCond("stroke") }),
      int("fuglMeyerArm", "فوغل-ماير للذراع", "Fugl-Meyer upper extremity", 0, 66, { when: isCond("stroke") }),
      //  المستوى ودرجةُ AIS يقرّران المسار (١٦٧).
      ch("sciLevel", "مستوى الإصابة", "Neurological level", grades([
        "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
        "L1", "L2", "L3", "L4", "L5", "S1", "S2", "S3", "S4", "S5"]), { ...REQ, when: isCond("sci") }),
      ch("ais", "درجة AIS", "AIS grade", grades(["A", "B", "C", "D", "E"]), { ...REQ, when: isCond("sci") }),
      //  في T6 فما فوق: الضغطُ المعتاد أساسُ فرط المنعكس الذاتيّ (+٢٠) — نقدُ التصميم §أ.٢.
      int("usualSystolic", "الضغطُ الانقباضيّ المعتاد", "Usual systolic BP", 60, 200, { ...REQ, unit: "ملم زئبق", unitEn: "mmHg", when: (c) => c.condition === "sci" && sciAboveT6(c.module.sciLevel) }),
      ch("pressureUlcer", "قرحةُ ضغط", "Pressure injury", [o("none", "None", "لا يوجد"), o("1", "Stage 1", "المرحلة ١"), o("2", "Stage 2", "المرحلة ٢"),
        o("3", "Stage 3", "المرحلة ٣"), o("4", "Stage 4", "المرحلة ٤")], { ...REQ, when: isCond("sci") }),
      int("scim", "SCIM", "SCIM", 0, 100, { when: isCond("sci") }),
      int("supineSystolic", "الضغطُ الانقباضيّ استلقاءً", "Supine systolic BP", 60, 260, { unit: "ملم زئبق", unitEn: "mmHg", when: isCond("sci", "parkinsons") }),
      int("standingSystolic", "الضغطُ الانقباضيّ وقوفاً", "Standing systolic BP", 60, 260, { unit: "ملم زئبق", unitEn: "mmHg", when: isCond("sci", "parkinsons") }),
      //  هون-ياهر وتوقيتُ الدواء (١٧٤).
      ch("hoehnYahr", "هون وياهر", "Hoehn & Yahr", grades(["1", "1.5", "2", "2.5", "3", "4", "5"]), { ...REQ, when: isCond("parkinsons") }),
      ch("medState", "حالُ الدواء وقتَ المعاينة", "Medication state at exam", [o("on", "ON", "في مفعوله"), o("off", "OFF", "خارج مفعوله")], { ...REQ, when: isCond("parkinsons") }),
      int("updrs3", "MDS-UPDRS III", "MDS-UPDRS part III", 0, 132, { when: isCond("parkinsons") }),
      yn("freezing", "تجمّدُ المشية", "Freezing of gait", { when: isCond("parkinsons") }),
      //  EDSS وحساسيةُ الحرارة (١٨٤).
      num("edss", "EDSS", "EDSS", 0, 10, { ...REQ, step: 0.5, when: isCond("ms") }),
      yn("heatSensitive", "تسوء أعراضُه بالحرارة", "Heat sensitive", { ...REQ, when: isCond("ms") }),
      dt("lastRelapseDate", "تاريخُ آخر انتكاسة", "Last relapse date", { when: isCond("ms") }),
      int("berg", "بيرغ", "Berg Balance Scale", 0, 56, { when: isCond("stroke", "parkinsons", "ms") }),
      num("walk10mSpeed", "سرعةُ المشي ١٠ أمتار", "10-m walk speed", 0, 3, { unit: "م/ث", unitEn: "m/s", when: isCond("stroke", "parkinsons", "ms", "sci") }),
      //  الكورتيزون خلال ٧٢ ساعة وهاوس-براكمان وإغلاقُ العين (١٦٣).
      yn("steroidWithin72h", "أخذ الكورتيزون خلال ٧٢ ساعة", "Corticosteroid within 72 h", { ...REQ, when: isCond("bells") }),
      ch("houseBrackmann", "هاوس-براكمان", "House-Brackmann grade", grades(["I", "II", "III", "IV", "V", "VI"]), { ...REQ, when: isCond("bells") }),
      yn("eyeCloses", "تُغلَق العينُ تماماً", "Eye closes completely", { ...REQ, when: isCond("bells") }),
      int("sunnybrook", "سنيبروك", "Sunnybrook", 0, 100, { when: isCond("bells") }),
    ],
  },
  {
    //  ترحيلات ١٦٩ (الروماتويديّ) و١٧٣ (التهاب الفقار) و١٧٢ (الليفيّ).
    group: "rheum", ar: "الروماتيزم والألمُ المنتشر", en: "Rheumatic & widespread pain",
    protocols: ["rheumatoid-arthritis-adult", "axial-spa-adult", "fibromyalgia-adult"],
    conditions: [
      { code: "ra", ar: "التهابُ المفاصل الروماتويدي", en: "Rheumatoid arthritis", protocols: ["rheumatoid-arthritis-adult"] },
      { code: "axspa", ar: "التهابُ الفقار المحوريّ", en: "Axial spondyloarthritis", protocols: ["axial-spa-adult"] },
      { code: "fibromyalgia", ar: "الألمُ العضليّ الليفيّ", en: "Fibromyalgia", protocols: ["fibromyalgia-adult"] },
    ],
    fields: [
      //  نطاقاتُ الشدّة بـDAS28 (١٦٩).
      num("das28", "DAS28", "DAS28", 0, 10, { ...REQ, step: 0.01, when: isCond("ra") }),
      int("swollenJoints", "المفاصلُ المتورّمة من ٢٨", "Swollen joints /28", 0, 28, { when: isCond("ra") }),
      num("basdai", "BASDAI", "BASDAI", 0, 10, { ...REQ, step: 0.1, when: isCond("axspa") }),
      //  العمودُ الملتحم يمنع الشدَّ والتقويم (١٧٣).
      yn("fusedSpine", "قطعٌ ملتحمة في العمود", "Fused spinal segments", { ...REQ, when: isCond("axspa") }),
      num("asdas", "ASDAS", "ASDAS", 0, 10, { step: 0.1, when: isCond("axspa") }),
      //  التشخيصُ بيد الطبيب (١٧٢).
      yn("doctorConfirmedFm", "أكّد الطبيبُ التشخيصَ والتحاليل", "Diagnosis and blood tests confirmed by a doctor", { ...REQ, when: isCond("fibromyalgia") }),
      int("fiqr", "FIQR", "FIQR", 0, 100, { when: isCond("fibromyalgia") }),
      int("fatigue", "الإعياء", "Fatigue", 0, 10, { unit: "/١٠", unitEn: "/10" }),
      yn("cardiacScreen", "فُحص القلبُ قبل الشدّة العالية", "Cardiac screen before high intensity"),
    ],
  },
  {
    //  ترحيل ١٦٨ (هشاشة العظام والوقاية من السقوط).
    group: "osteo_falls", ar: "الهشاشةُ والسقوط عند الكبار", en: "Osteoporosis & falls (older adults)",
    protocols: ["osteoporosis-falls-geriatric"],
    fields: [
      //  الأسئلةُ الثلاثة (Montero-Odasso 2022 في ١٦٨).
      yn("fell", "سقط في السنة الماضية", "Fell in the past year", REQ),
      yn("unsteady", "يشعر بعدم الثبات", "Feels unsteady", REQ),
      yn("worried", "يخاف السقوط", "Worried about falling", REQ),
      ch("riskLevel", "تصنيفُ الخطر", "Falls risk", [o("low", "Low", "منخفض"), o("intermediate", "Intermediate", "متوسّط"), o("high", "High", "عالٍ")], REQ),
      ch("boneStatus", "حالُ العظم", "Bone status", [o("no_fracture", "No fracture", "بلا كسر"), o("vertebral_fracture", "After vertebral fracture / kyphosis", "بعد كسر فقرة أو حدبة"),
        o("hip_fracture", "After hip fracture", "بعد كسر ورك")], REQ),
      yn("fallRiskMeds", "أدويةٌ تزيد خطر السقوط", "Falls-risk medicines", REQ),
      num("tugSec", "النهوضُ والمشي (TUG)", "Timed Up and Go", 0, 300, { unit: "ثانية", unitEn: "s" }),
      int("berg", "بيرغ", "Berg Balance Scale", 0, 56),
      int("sitToStand30", "الجلوسُ والقيام في ٣٠ ثانية", "30-s chair stand", 0, 60, { unit: "مرّة", unitEn: "reps" }),
      num("gaitSpeed", "سرعةُ المشي", "Gait speed", 0, 3, { unit: "م/ث", unitEn: "m/s" }),
      int("fesI", "FES-I", "FES-I", 16, 64),
      num("heightLossCm", "نقصُ الطول", "Height loss", 0, 30, { unit: "سم", unitEn: "cm" }),
    ],
  },
  {
    //  ترحيلات ١٦٦ (الشلل الدماغيّ) و١٧٥ (الصعر) و١٧٦ (شلل الضفيرة) و١٧٧ (المفاصل اليفعية) و١٧٠ (الجنف).
    group: "pediatric", ar: "الأطفال", en: "Paediatrics",
    protocols: ["cerebral-palsy-pediatric", "torticollis-cmt-pediatric", "brachial-plexus-birth-pediatric", "jia-pediatric", "scoliosis-ais-pediatric"],
    conditions: [
      { code: "cp", ar: "الشللُ الدماغيّ", en: "Cerebral palsy", protocols: ["cerebral-palsy-pediatric"] },
      { code: "cmt", ar: "الصعرُ الخلقيّ العضليّ", en: "Congenital muscular torticollis", protocols: ["torticollis-cmt-pediatric"] },
      { code: "bpbp", ar: "شللُ الضفيرة العضدية الولاديّ", en: "Brachial plexus birth palsy", protocols: ["brachial-plexus-birth-pediatric"] },
      { code: "jia", ar: "التهابُ المفاصل اليفعيّ", en: "Juvenile idiopathic arthritis", protocols: ["jia-pediatric"] },
      { code: "ais", ar: "الجنفُ عند المراهقين", en: "Adolescent idiopathic scoliosis", protocols: ["scoliosis-ais-pediatric"] },
    ],
    fields: [
      //  GMFCS ونوعُ الشلل يقرّران المسار (١٦٦).
      ch("gmfcs", "GMFCS", "GMFCS level", grades(["I", "II", "III", "IV", "V"]), { ...REQ, when: isCond("cp") }),
      ch("cpType", "نوعُ الشلل", "CP type", [o("spastic", "Spastic", "تشنّجيّ"), o("dyskinetic", "Dyskinetic", "حركيّ"), o("ataxic", "Ataxic", "رنحيّ"), o("mixed", "Mixed", "مختلط")],
        { ...REQ, when: isCond("cp") }),
      ch("macs", "MACS", "MACS level", grades(["I", "II", "III", "IV", "V"]), { when: isCond("cp") }),
      int("hipMigrationPct", "إزاحةُ الورك", "Hip migration percentage", 0, 100, { unit: "٪", unitEn: "%", when: isCond("cp") }),
      //  الدورانُ السلبيّ ودرجةُ APTA والكتلة وفحصُ الوركين (١٧٥).
      int("cmtRotationAffected", "الدورانُ السلبيّ نحو الجهة المصابة", "Passive rotation toward affected side", 0, 110, { ...REQ, unit: "°", unitEn: "°", when: isCond("cmt") }),
      ch("aptaGrade", "درجة APTA", "APTA severity grade", grades(["1", "2", "3", "4", "5", "6", "7", "8"]), { ...REQ, when: isCond("cmt") }),
      yn("neckMass", "كتلةٌ في العضلة", "Sternocleidomastoid mass", { ...REQ, when: isCond("cmt") }),
      ch("hipScreen", "فحصُ الوركين", "Hip screen", [o("normal", "Normal", "طبيعيّ"), o("abnormal", "Abnormal", "غير طبيعيّ"), o("not_done", "Not done", "لم يُجرَ")],
        { ...REQ, when: isCond("cmt") }),
      //  علامةُ هورنر (١٧٦).
      yn("hornerSign", "علامةُ هورنر", "Horner sign", { ...REQ, when: isCond("bpbp") }),
      num("birthWeightKg", "وزنُ الولادة", "Birth weight", 0, 8, { unit: "كغم", unitEn: "kg", when: isCond("bpbp") }),
      //  فئةُ ILAR وجدولُ فحص العين (١٧٧).
      ch("ilarCategory", "فئةُ ILAR", "ILAR category", [o("oligo", "Oligoarticular", "قليلُ المفاصل"), o("poly_rf_neg", "Polyarticular RF−", "متعدّدُ المفاصل RF−"),
        o("poly_rf_pos", "Polyarticular RF+", "متعدّدُ المفاصل RF+"), o("systemic", "Systemic", "جهازيّ"), o("psoriatic", "Psoriatic", "صدفيّ"),
        o("era", "Enthesitis-related", "مرتبطٌ بالارتكاز"), o("undifferentiated", "Undifferentiated", "غير متمايز")], { ...REQ, when: isCond("jia") }),
      dt("eyeScreenDate", "تاريخُ آخر فحصٍ للعين", "Last eye (uveitis) screen", { ...REQ, when: isCond("jia") }),
      num("cjadas10", "cJADAS10", "cJADAS10", 0, 30, { step: 0.1, when: isCond("jia") }),
      //  زاويةُ كوب وريسر (١٧٠).
      int("cobbDeg", "زاويةُ كوب", "Cobb angle", 0, 120, { ...REQ, unit: "°", unitEn: "°", when: isCond("ais") }),
      ch("risser", "ريسر", "Risser stage", grades(["0", "1", "2", "3", "4", "5"]), { ...REQ, when: isCond("ais") }),
      int("atrDeg", "دورانُ الجذع (ATR)", "Angle of trunk rotation", 0, 30, { unit: "°", unitEn: "°", when: isCond("ais") }),
      int("braceHours", "ساعاتُ الدعامة يومياً", "Brace hours per day", 0, 24, { when: isCond("ais") }),
    ],
  },
  {
    //  ترحيل ١٧١ (الوذمة اللمفية).
    group: "lymphedema", ar: "الوذمةُ اللمفية", en: "Lymphoedema",
    protocols: ["lymphedema-adult"],
    fields: [
      ch("limb", "الطرف", "Limb", [o("arm", "Arm", "ذراع"), o("leg", "Leg", "ساق")], REQ),
      ch("islStage", "مرحلة ISL", "ISL stage", grades(["0", "I", "II", "III"]), REQ),
      yn("over3Months", "مضى أكثرُ من ثلاثة أشهر على العملية", "More than three months since surgery", REQ),
      //  قياسُ شرايين الساق قبل الضماد (١٧١).
      num("abi", "مؤشّرُ الكاحل-العضد", "Ankle-brachial index", 0, 2, { ...REQ, step: 0.01, when: (c) => c.module.limb === "leg" }),
      ch("heartFailure", "قصورُ القلب", "Heart failure (NYHA)", [o("none", "None", "لا يوجد"), o("I", "I", "I"), o("II", "II", "II"), o("III", "III", "III"), o("IV", "IV", "IV")], REQ),
      yn("radiotherapy", "أشعّةٌ علاجية", "Radiotherapy"),
      num("volumeDiffPct", "فرقُ الحجم بين الطرفين", "Inter-limb volume difference", 0, 300, { unit: "٪", unitEn: "%" }),
      ch("stemmer", "علامةُ ستيمر", "Stemmer sign", [o("positive", "Positive", "إيجابية"), o("negative", "Negative", "سلبية")]),
      int("cellulitisPerYear", "نوباتُ التهاب النسيج في السنة", "Cellulitis episodes per year", 0, 20),
    ],
  },
];

export const V2_GROUPS: readonly Opt[] = V2_MODULES.map((m) => o(m.group, m.en, m.ar));
export const moduleOf = (group: unknown): V2Module | null => V2_MODULES.find((m) => m.group === group) ?? null;
export const conditionOf = (group: unknown, condition: unknown): V2Condition | null =>
  moduleOf(group)?.conditions?.find((c) => c.code === condition) ?? null;
/** في T6 فما فوق (الرقبةُ كلُّها وT1–T6) — قاعدةُ فرط المنعكس الذاتيّ (١٦٧). */
export function sciAboveT6(level: unknown): boolean {
  if (typeof level !== "string") return false;
  if (level.startsWith("C")) return true;
  const m = /^T(\d+)$/.exec(level);
  return Boolean(m && Number(m[1]) <= 6);
}

// ══ النواة — لكلّ مريض (exam_design.json · universal_mandatory، بتصحيحات الناقد) ════════════════════════════════
export const V2_SURGERY_TYPES: readonly Opt[] = [
  o("tka", "Total knee replacement", "استبدالُ ركبة"), o("tha", "Total hip replacement", "استبدالُ ورك"),
  o("acl", "ACL reconstruction", "رباطٌ صليبيّ"), o("meniscus", "Meniscal surgery", "غضروفٌ هلاليّ"),
  o("rotator_cuff", "Rotator cuff repair", "كفّةٌ مدوّرة"), o("fracture_fixation", "Fracture fixation", "تثبيتُ كسر"),
  o("carpal_tunnel", "Carpal tunnel release", "تحريرُ النفق الرسغي"), o("lymph_nodes", "Lymph node dissection", "تفريغُ عقدٍ لمفية"),
  o("amputation", "Amputation", "بتر"), o("spine", "Spinal surgery / fixation", "عمليةٌ في العمود الفقري"), o("other", "Other", "غيرها"),
];
export const V2_IMPLANTS: readonly Opt[] = [
  o("none", "None", "لا شيء"), o("pacemaker", "Pacemaker", "منظّمُ ضربات"), o("icd", "Implanted defibrillator", "مزيلُ رجفانٍ مزروع"),
  o("dbs", "Deep brain stimulator", "منبّهُ دماغٍ عميق"), o("spinal_stim", "Spinal cord stimulator", "منبّهُ نخاع"),
  o("drug_pump", "Drug pump", "مضخّةُ دواء"), o("shunt", "Programmable shunt", "صمّامُ تحويلة قابل للبرمجة"),
  o("cochlear", "Cochlear implant", "قوقعةٌ سمعية"), o("other", "Other", "غيرها"),
];
export const V2_METAL_TYPES: readonly Opt[] = [
  o("joint_replacement", "Joint replacement", "مفصلٌ صناعيّ"), o("plate_screws", "Plate / screws", "صفيحةٌ أو براغي"),
  o("wires_fixator", "Wires / external fixator", "أسلاكٌ أو مثبّتٌ خارجيّ"), o("graft_screws", "Graft screws", "براغي الطُّعم"),
  o("spinal_fixation", "Spinal fixation", "تثبيتُ العمود"), o("shrapnel", "Blast fragments", "شظايا انفجار"),
];
export const V2_ANTICOAG: readonly Opt[] = [
  o("none", "None", "لا شيء"), o("warfarin", "Warfarin", "وارفارين"), o("doac", "Direct oral anticoagulant", "مضادُّ تخثّرٍ حديث"),
  o("antiplatelet", "Antiplatelet (not aspirin)", "مضادُّ صفائح غير الأسبرين"), o("aspirin", "Aspirin only", "أسبرين فقط"),
  o("bleeding_disorder", "Bleeding disorder", "اضطرابُ نزف"),
];
export const V2_SKIN: readonly Opt[] = [
  o("none", "None", "سليم"), o("unhealed_wound", "Unhealed wound", "جرحٌ لم يلتئم"), o("portals", "Arthroscopy portals", "منافذُ تنظير"),
  o("ulcer", "Ulcer", "قرحة"), o("dermatitis", "Dermatitis / inflamed skin", "التهابٌ جلديّ"), o("burn", "Burn", "حرق"),
];
export const V2_BONE: readonly Opt[] = [
  o("none", "None", "لا شيء"), o("osteoporosis", "Confirmed osteoporosis", "هشاشةٌ مؤكّدة"),
  o("fragility_fracture", "Previous fragility fracture", "كسرُ هشاشةٍ سابق"),
  //  نقدُ التصميم §أ.٣: «≥٥ ملغ ثلاثة أشهر» بلا مصدرٍ في الترحيلات — فيُسأل «طويل الأمد» بلا رقم.
  o("long_term_oral_steroid", "Long-term oral corticosteroid", "كورتيزونٌ فمويّ طويلُ الأمد"),
];
export const V2_FAC: readonly Opt[] = [
  o("0", "FAC 0 — cannot walk", "٠ — لا يمشي"), o("1", "FAC 1 — continuous help of one person", "١ — بمساعدة شخصٍ مستمرّة"),
  o("2", "FAC 2 — intermittent help of one person", "٢ — بمساعدة شخصٍ متقطّعة"), o("3", "FAC 3 — supervision", "٣ — بإشراف"),
  o("4", "FAC 4 — independent on level ground", "٤ — مستقلٌّ على المستوي"), o("5", "FAC 5 — independent incl. stairs", "٥ — مستقلٌّ مع الدرج"),
];

/** **مجموعاتٌ يُسأل فيها عن حقنة الكورتيزون** — نقدُ التصميم §ج.١٨: الكتفُ والمرفقُ والقدم، وما تمنع فيه الحقنةُ الموجاتِ الصادمة. */
const STEROID_GROUPS = ["shoulder", "elbow_hand", "foot_ankle", "hip_knee", "sports_knee"];
/** **المعدنُ يُسأل حين عمليةٌ أو كسرٌ أو بتر** — نقدُ التصميم §ج.١٨. */
export function metalApplies(c: V2Ctx): boolean {
  if (c.core.surgery === "yes") return true;
  if (c.group === "amputation" || c.group === "joint_replacement") return true;
  if (c.condition === "distal_radius" || c.condition === "sci") return true;
  return c.group === "osteo_falls" && c.module.boneStatus === "hip_fracture";
}
/** **الحملُ للأنثى في سنّ الإنجاب** (١٢–٥٥ سنة) — نقدُ التصميم §ج.١٨، والإرضاعُ معه (§ب.١٤). */
export const pregnancyApplies = (c: V2Ctx): boolean => c.sex === "female" && c.ageYears !== null && c.ageYears >= 12 && c.ageYears <= 55;

/** حدودُ العمر التي تغيّر سؤالاً أو مانعاً: دون السنتين (العمرُ المصحَّح) · ١٢ و٥٥ (الحملُ والإرضاع) · دون ١٨ (صفائحُ النموّ). */
const AGE_SAFETY_BOUNDS = [2, 12, 18, 56];
/** عمرُ الملفّ رقماً بالسنين (والأرقامُ العربية تُقرأ) — `null` حين لا يُقرأ رقماً. */
export function fileAgeYears(v: unknown): number | null {
  const t = String(v ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}
/**
 * **العمرُ في المعاينة يطابق عمرَ الملفّ حين يغيّر الفرقُ سؤالَ سلامةٍ أو مانعاً** (مراجعةُ المرحلة الأولى): خانةُ العمر «من الملفّ — تأكيدٌ فقط»،
 * وعليها الحملُ وصفائحُ النموّ والعمرُ المصحَّح. فرقُ سنةٍ مقبول (عيدُ ميلاد)؛ وأكثرُ منه **يعبر حدّاً من تلك الحدود** ⟵ رسالةٌ تسمّي العمرين.
 * والفرقُ الذي لا يعبر حدّاً لا يُردّ (عمرُ الملفّ يُكتب يومَ التسجيل وقد يكبر). وعمرُ ملفٍّ لا يُقرأ رقماً لا يُقارَن.
 */
export function examV2AgeConflict(typed: unknown, fileAge: unknown): string | null {
  const f = fileAgeYears(fileAge);
  if (typeof typed !== "number" || f === null || Math.abs(typed - f) <= 1) return null;
  if (!AGE_SAFETY_BOUNDS.some((b) => (typed < b) !== (f < b))) return null;
  return `العمرُ في المعاينة (${arDigits(typed)}) يخالف عمرَ الملفّ (${arDigits(Math.floor(f))}) — والفرقُ يغيّر أسئلةَ السلامة وموانعَها `
    + "(الحمل أو صفائح النموّ أو العمر المصحَّح). صحّح العمرَ في ورقة المريض أو في المعاينة ليتطابقا";
}

export const V2_CORE_FIELDS: readonly V2Field[] = [
  ch("group", "مجموعةُ التشخيص", "Diagnosis group", V2_GROUPS, REQ),
  ch("sex", "الجنس", "Sex", [o("male", "Male", "ذكر"), o("female", "Female", "أنثى")], REQ),
  int("ageYears", "العمر", "Age", 0, 120, { ...REQ, unit: "سنة", unitEn: "years", hint: "من الملفّ — تأكيدٌ فقط" }),
  int("correctedAgeMonths", "العمرُ المصحَّح للرضيع", "Corrected age (infant)", 0, 24, { ...REQ, unit: "شهر", unitEn: "months", when: (c) => c.ageYears !== null && c.ageYears < 2 }),
  ch("side", "الجهةُ المصابة", "Affected side", SIDES4, REQ),
  ch("dominantHand", "اليدُ الغالبة", "Dominant hand", [o("right", "Right", "اليمنى"), o("left", "Left", "اليسرى")], REQ),
  ch("onsetKind", "بدايةُ الأعراض", "Onset", [o("date", "Date known", "بتاريخ"), o("congenital", "Since birth", "منذ الولادة"), o("unknown", "Unknown", "غير معروف")], REQ),
  dt("onsetDate", "تاريخُ بداية الأعراض أو الإصابة", "Date of onset / injury", { ...REQ, when: (c) => c.core.onsetKind === "date" }),
  yn("surgery", "عمليةٌ جراحية لهذه الحالة", "Surgery for this condition", REQ),
  ch("surgeryType", "نوعُ العملية", "Surgery type", V2_SURGERY_TYPES, { ...REQ, when: (c) => c.core.surgery === "yes" }),
  tx("surgeryTypeOther", "العمليةُ بالتحديد", "Surgery (specify)", { ...REQ, when: (c) => c.core.surgery === "yes" && c.core.surgeryType === "other" }),
  dt("surgeryDate", "تاريخُ العملية", "Surgery date", { ...REQ, when: (c) => c.core.surgery === "yes" }),
  yn("surgeonInstructions", "تعليماتُ الجرّاح مكتوبة", "Written surgeon instructions", { ...REQ, when: (c) => c.core.surgery === "yes" }),
  int("painNow", "الألمُ الآن", "Pain now", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
  int("painWorstWeek", "الأسوأُ في الأسبوع الماضي", "Worst pain in the past week", 0, 10, { ...REQ, unit: "/١٠", unitEn: "/10" }),
  ch("irritability", "درجةُ التهيّج", "Irritability", [o("high", "High", "عالٍ"), o("moderate", "Moderate", "متوسّط"), o("low", "Low", "منخفض")], REQ),
  yn("canReportHeat", "يستطيع أن يقول «حارّ» أو «يؤلم» في وقته", "Can report heat or pain in time", REQ),
  ch("fac", "مستوى المشي (FAC)", "Functional Ambulation Category", V2_FAC, REQ),
  ch("walkingAid", "أداةُ المشي", "Walking aid", [o("none", "None", "لا شيء"), o("cane", "Cane", "عصا"), o("crutches", "Crutches", "عكّازان"),
    o("walker", "Walker", "مشّاية"), o("wheelchair", "Wheelchair", "كرسيّ متحرّك")], REQ),
  { key: "implants", ar: "أجهزةٌ مزروعة", en: "Implanted devices", kind: "multi", options: V2_IMPLANTS, exclusive: "none", required: true },
  tx("implantsOther", "الجهازُ المزروع بالتحديد", "Implanted device (specify)", { ...REQ, when: (c) => Array.isArray(c.core.implants) && c.core.implants.includes("other") }),
  //  §4.hd — في الإصدار الثالث يُسأل المعدنُ دائماً (المجموعةُ قد لا تُعرف).
  yn("metalInField", "معدنٌ في منطقة العلاج", "Metal in the treatment area", { ...REQ, when: (c) => c.ruleset === "v3" || metalApplies(c) }),
  { key: "metalTypes", ar: "نوعُ المعدن", en: "Metal type", kind: "multi", options: V2_METAL_TYPES, required: true,
    when: (c) => (c.ruleset === "v3" || metalApplies(c)) && c.core.metalInField === "yes" },
  yn("pregnant", "حامل", "Pregnant", { ...REQ, when: pregnancyApplies }),
  int("pregnancyMonth", "شهرُ الحمل", "Month of pregnancy", 1, 9, { ...REQ, when: (c) => pregnancyApplies(c) && c.core.pregnant === "yes" }),
  yn("breastfeeding", "ترضع", "Breastfeeding", { ...REQ, when: pregnancyApplies }),
  { key: "anticoagulant", ar: "مضادّاتُ التخثّر أو اضطرابُ نزف", en: "Anticoagulants / bleeding disorder", kind: "multi", options: V2_ANTICOAG, exclusive: "none", required: true },
  ch("diabetes", "السكّري", "Diabetes", [o("no", "No", "لا"), o("oral", "Tablets", "بالحبوب"), o("insulin", "Insulin / secretagogues", "بالإنسولين أو الغليبنكلاميد ونحوه")], REQ),
  yn("neuropathy", "اعتلالُ أعصاب القدم", "Diabetic foot neuropathy", { ...REQ, when: (c) => c.core.diabetes === "oral" || c.core.diabetes === "insulin" }),
  //  سكّرُ الأساس لمريض الإنسولين وحده (§ج.١٨) — وفحصُ ما قبل الجهد في كلّ جلسة يبقى على شاشة الجلسة لا المعاينة (§ج.١٧).
  int("glucoseMgdl", "السكّرُ الآن", "Blood glucose now", 20, 600, { ...REQ, unit: "ملغ/دل", unitEn: "mg/dL", when: (c) => c.core.diabetes === "insulin" }),
  ch("cancer", "ورمٌ أو سرطان", "Tumour / cancer", [o("no", "No", "لا"), o("past", "Past", "سابق"), o("current", "Current", "حاليّ")], REQ),
  yn("cancerInField", "الورمُ في منطقة العلاج", "Tumour in the treatment area", { ...REQ, when: (c) => c.core.cancer === "past" || c.core.cancer === "current" }),
  tx("cancerSite", "موضعُ الورم", "Tumour site", { when: (c) => c.core.cancer === "past" || c.core.cancer === "current" }),
  { key: "skin", ar: "الجلدُ في منطقة العلاج", en: "Skin in the treatment area", kind: "multi", options: V2_SKIN, exclusive: "none", required: true },
  yn("steroidInjection", "حقنةُ كورتيزون في المنطقة", "Corticosteroid injection in the area",
    { ...REQ, when: (c) => c.ruleset === "v3" || (c.group !== null && (STEROID_GROUPS.includes(c.group) || c.condition === "jia")) }),
  dt("steroidInjectionDate", "تاريخُ آخر حقنة", "Last injection date", { ...REQ, when: (c) => c.core.steroidInjection === "yes" }),
  int("steroidInjectionsPerYear", "عددُ الحقن في السنة", "Injections per year", 1, 20, { when: (c) => c.core.steroidInjection === "yes" }),
  { key: "boneHealth", ar: "هشاشةُ العظام أو الكورتيزون الفمويّ", en: "Bone health / oral corticosteroid", kind: "multi", options: V2_BONE, exclusive: "none", required: true },
  int("fallsLastYear", "السقطاتُ في السنة الماضية", "Falls in the past year", 0, 50, REQ),
  yn("fallInjury", "أُصيب في سقطة", "Injured in a fall", { ...REQ, when: (c) => typeof c.core.fallsLastYear === "number" && c.core.fallsLastYear > 0 }),
  yn("fallLongLie", "بقي على الأرض ساعةً فأكثر", "Lay on the floor ≥1 hour", { ...REQ, when: (c) => typeof c.core.fallsLastYear === "number" && c.core.fallsLastYear > 0 }),
  //  نقدُ التصميم §ب.٦: سبعةَ عشرَ بروتوكولاً (١٦٣ و١٦٨–١٨٠ و١٨٢–١٨٤)؛ ١٧٩ يسأل قبل أيّ جهاز، و١٧٤ يمنع الجهدَ العالي صائماً.
  yn("fasting", "يصوم الآن (رمضان أو غيره)", "Fasting now (Ramadan or other)", REQ),
  tx("fastingTiming", "التوقيتُ قياساً إلى الإفطار", "Timing relative to iftar", { when: (c) => c.core.fasting === "yes" }),
  //  §ب.٧: ١٤٩ و١٥٧ («uncontrolled epilepsy as a caution with stimulation») و١٧٦ و١٦٦.
  ch("epilepsy", "الصرع", "Epilepsy", [o("none", "None", "لا يوجد"), o("controlled", "Controlled", "مضبوط"), o("uncontrolled", "Uncontrolled", "غير مضبوط")], REQ),
  //  §ب.١٢: مؤشّرٌ للعدوى في ١١٩ و١٢٤ و١٢٥ و١٢٦ و١٢٨ و١٤٩ و١٥١ و١٦٩ و١٧١ و١٧٣ و١٧٧.
  yn("immunosuppressed", "كبتُ مناعة أو دواءٌ بيولوجيّ", "Immunosuppression / biologic", REQ),
  tx("immunosuppressionType", "نوعُ كبت المناعة أو الدواء", "Immunosuppression / drug type", { when: (c) => c.core.immunosuppressed === "yes" }),
  //  §ب.١٥: اثنا عشرَ بروتوكولاً.
  num("weightKg", "الوزن", "Weight", 1, 300, { ...REQ, step: 0.1, unit: "كغم", unitEn: "kg" }),
  int("heightCm", "الطول", "Height", 30, 230, { unit: "سم", unitEn: "cm" }),
  //  §ب.٩: ١٥٧ و١٧٤ — تُبطل الشدّةَ المحسوبة من النبض.
  yn("betaBlocker", "حاصراتُ بيتا", "Beta-blockers", REQ),
  yn("atrialFibrillation", "الرجفانُ الأذينيّ", "Atrial fibrillation"),
  //  §ب.٨: ١٥٧ (المراجعة بعد ٧–١٤ يوماً)، وورد في ١٢٩ و١٥٢ و١٦٣ و١٦٦ و١٧٥ و١٧٦ و١٨٣ و١٨٤.
  yn("botox", "حقنُ بوتوكس", "Botulinum toxin injections", REQ),
  dt("botoxDate", "تاريخُ آخر حقنة بوتوكس", "Last botulinum toxin date", { ...REQ, when: (c) => c.core.botox === "yes" }),
  tx("botoxSite", "موضعُ حقن البوتوكس", "Botulinum toxin site", { when: (c) => c.core.botox === "yes" }),
  //  خطُّ أساسٍ اختياريّ — **بوّابةُ الضغط قبل كلّ جلسة على شاشة الجلسة لا هنا** (§أ.١ و§ج.١٧).
  int("bpSystolic", "الضغطُ الانقباضيّ (خطُّ أساس)", "Baseline systolic BP", 60, 260, { unit: "ملم زئبق", unitEn: "mmHg" }),
  int("bpDiastolic", "الضغطُ الانبساطيّ (خطُّ أساس)", "Baseline diastolic BP", 30, 150, { unit: "ملم زئبق", unitEn: "mmHg" }),
  int("pulse", "النبض (خطُّ أساس)", "Baseline pulse", 30, 200, { unit: "/د", unitEn: "/min" }),
];

// ══ العلاماتُ الحمراء (exam_design.json · red_flag_checklist) ═══════════════════════════════════════════════════════
export type RedFlagUrgency = "emergency" | "same_day" | "urgent" | "routine";
export interface RedFlagDef {
  key: string;
  questionAr: string;
  actionAr: string;
  urgency: RedFlagUrgency;
  /** `null` = عامّة لكلّ مريض؛ وإلّا المجموعاتُ التي تظهر فيها. */
  groups: readonly string[] | null;
  /** داخل المجموعة: الحالاتُ وحدها (`null` = كلُّها). */
  conditions?: readonly string[];
  source: string;
}

export const RED_FLAG_URGENCY_AR: Record<RedFlagUrgency, string> = {
  emergency: "طارئ — نفّذه الآن، لا ينتظر الاعتماد",
  same_day: "في اليوم نفسه",
  urgent: "عاجل — خلال أيام",
  routine: "يُبلَّغ الطبيب",
};

const RF = (key: string, groups: readonly string[] | null, urgency: RedFlagUrgency, questionAr: string, actionAr: string, source: string,
  conditions?: readonly string[]): RedFlagDef => ({ key, groups, urgency, questionAr, actionAr, source, ...(conditions ? { conditions } : {}) });

export const V2_RED_FLAGS: readonly RedFlagDef[] = [
  //  ══ العامّةُ الثماني (نقدُ التصميم §ج.١٩): ذيلُ الفرس · الضعفُ المتزايد · الورم · العدوى · الخثرة · ألمُ الصدر · الانتحار · الجلطة ══
  RF("cauda_equina", null, "emergency",
    "خدرٌ بين الفخذين أو حول الشرج، أو صعوبةٌ جديدة في بدء التبوّل أو احتباسٌ أو سلس، أو فقدانُ التحكّم بالأمعاء، أو ضعفٌ في الساقين معاً، أو اضطرابٌ جنسيّ جديد خلال أسبوعين؟",
    "إيقافٌ فوريّ وإحالةٌ طارئة في اليوم نفسه إلى مستشفى فيه رنينٌ طارئ (ذيل الفرس)، ويُسجَّل وقتُ الإحالة",
    "lbp-chronic · lbp-acute · lumbar-radiculopathy · lumbar-stenosis · axial-spa"),
  RF("progressive_weakness", null, "urgent",
    "ضعفٌ عصبيّ متزايد في طرف (سقوطُ القدم، أو قوّةٌ ٣ من ٥ فأقلّ، أو مشيةٌ خاطفة)، أو ضعفٌ جديد؟",
    "إحالةٌ عاجلة إلى الجرّاح خلال الأسبوع، ولا تحميلَ للجذر",
    "lbp-chronic · lbp-acute · lumbar-radiculopathy · cervical-radiculopathy · lumbar-stenosis · neck · sci · whiplash"),
  RF("cancer_suspicion", null, "urgent",
    "اشتباهُ ورم: سرطانٌ سابق، أو نقصُ وزنٍ غير مبرّر، أو ألمٌ ليليّ ثابت لا يتغيّر بالوضعية، أو كتلةٌ نامية، أو بدايةٌ بعد الخمسين؟",
    "إيقافُ البرنامج حتى يراه الطبيب، وفي الكتلة النامية مسارُ الإحالة العاجلة",
    "كلّ البروتوكولات تقريباً"),
  RF("infection", null, "same_day",
    "اشتباهُ عدوى: حمّى، أو مفصلٌ حارّ أحمر متورّم بعد حقنة أو عملية، أو تعاطي حقن، أو إفرازٌ من الجرح أو الأسلاك؟",
    "إلى الطبيب أو الجرّاح في اليوم نفسه، ولا تمرينَ ولا جهاز على المنطقة",
    "lbp · knee-oa · subacromial · frozen · tka · tha · acl · knee-meniscal · rotator-cuff-repair · distal-radius · hip-oa · rheumatoid · jia · calcific"),
  RF("dvt_pe", null, "emergency",
    "اشتباهُ خثرة: تورّمٌ أو ألمٌ أو دفءٌ في ساق أو ذراع، أو ضيقُ نفسٍ مفاجئ، أو سعالٌ بدم؟",
    "لا تمرينَ ولا تحفيز ولا ضغط ولا حرارة ولا تصريف. إحالةٌ في اليوم نفسه، والطوارئ عند أعراض الرئة",
    "knee-oa · stroke · tka · tha · acl · knee-meniscal · ankle-sprain · preprosthetic · prosthetic-gait · rotator-cuff-repair · lymphedema · sci"),
  RF("cardiac", null, "emergency",
    "ألمُ صدر، أو خفقانٌ أو نبضٌ غير منتظم، أو ضيقُ نفسٍ شديد، أو إغماءٌ عند الجهد أو قبل السقوط؟",
    "إيقافُ الجهد وإحالةٌ إلى الطبيب فوراً، والطوارئ لألم الصدر",
    "lbp-chronic · neck · subacromial · knee-oa · stroke · prosthetic-gait · preprosthetic · osteoporosis-falls · parkinsons · axial-spa · rheumatoid"),
  RF("suicide", null, "same_day",
    "أفكارُ إيذاء النفس أو الانتحار، أو اكتئابٌ شديد؟",
    "إن كانت هناك خطّة أو محاولةٌ حديثة: لا يُترك وحده، ويُحال في اليوم نفسه إلى الطبيب أو الطوارئ مع أحد أهله. وإن كانت الأفكار عابرة: يُبلَّغ الطبيب خلال الأسبوع",
    "fibromyalgia · stroke · sci · upper-limb-amputation · whiplash · ms"),
  RF("stroke_signs", null, "emergency",
    "علاماتُ جلطةٍ جديدة (BE-FAST: التوازن، العين، ميلانُ الوجه، ضعفُ الذراع، الكلام)، أو أسوأُ صداعٍ في حياته؟",
    "طوارئ فوراً. وفي شلل الوجه: إن سلمت الجبهة وسقط الفم، أو ظهر ضعفُ أطراف أو عصبٌ قحفيّ آخر، فإلى الطوارئ",
    "stroke-subacute · stroke-chronic · bells-palsy · ms"),
  //  ══ ما يخصّ المجموعات ══
  RF("visceral", ["lumbar"], "urgent",
    "ألمٌ ليس ميكانيكياً، أو ألمٌ مع أعراضٍ بولية أو هضمية أو نسائية، أو كتلةٌ بطنية نابضة؟",
    "إلى الطبيب (سببٌ حشويّ أو أمّ الدم الأبهرية)", "lbp-chronic · lbp-acute · subacromial"),
  RF("inflammatory", ["lumbar", "shoulder", "hip_knee", "foot_ankle"], "routine",
    "تيبّسٌ صباحيّ أكثر من ٣٠ دقيقة يتحسّن بالحركة، وبدايةٌ قبل ٤٥، واستيقاظٌ في النصف الثاني من الليل، أو تورّمُ مفاصلَ صغيرة متعدّدة؟",
    "إلى طبيب المفاصل (التهابُ الفقار أو التهابُ المفاصل الالتهابيّ)", "lbp · knee-oa · hip-oa · plantar-heel · achilles · hand-oa · subacromial · frozen · fibromyalgia"),
  RF("fracture", ["lumbar", "shoulder", "hip_knee", "sports_knee", "foot_ankle", "osteo_falls"], "urgent",
    "اشتباهُ كسر: إصابةٌ كبيرة، أو صغيرةٌ مع هشاشة أو كورتيزون، أو ألمٌ ظهريّ مفاجئ بعد الانحناء أو السعال أو بعد السبعين، أو علاماتُ أوتاوا للكاحل أو الركبة، أو عجزٌ عن التحميل بعد سقوط، أو ساقٌ قصيرة مدوَّرة للخارج؟",
    "أشعّةٌ أو تصويرٌ قبل أيّ تحميل أو تمرين؛ والورك المكسور إلى الطوارئ في اليوم نفسه",
    "lbp · knee-oa · ankle-sprain · patellofemoral · knee-meniscal · hip-oa · osteoporosis-falls · plantar-heel · lumbar-stenosis · subacromial"),
  RF("myelopathy", ["neck", "elbow_hand", "rheum"], "urgent",
    "علاماتُ اعتلال النخاع العنقيّ: اضطرابُ المشي أو التوازن، أو خدرٌ وثقلٌ في اليدين مع فقد المهارة، أو علامة ليرميت، أو هوفمان، أو فرطُ المنعكسات؟",
    "لا تقويمَ ولا شدَّ، وإحالةٌ عاجلة إلى الطبيب وطلبُ رنين. وإن تدهورت بسرعة فإلى الطوارئ في اليوم نفسه",
    "neck · cervical-radiculopathy · whiplash · lumbar-stenosis · lateral-elbow · rheumatoid", undefined),
  RF("arterial", ["neck"], "emergency",
    "صداعٌ مفاجئ شديد غير معتاد، أو ألمُ رقبة مع دوار أو رؤيةٍ مزدوجة أو تلعثم أو صعوبةِ بلع أو سقوطٍ مفاجئ أو خدرٍ في الوجه أو رأرأة أو هورنر أو طنينٍ نابض (اشتباهُ تسلّخ شريان عنقيّ)؟",
    "طوارئ فوراً، ولا علاجَ يدوياً للرقبة", "neck · cervical-radiculopathy · whiplash"),
  RF("cspine_rule", ["neck"], "urgent",
    "إصابةٌ حديثة بآلية خطرة، أو العمرُ ٦٥ فأكثر، أو تنميلُ الأطراف بعد حادث، أو عجزٌ عن تدوير الرقبة ٤٥° (قاعدة C-spine الكندية)؟",
    "تصويرٌ قبل أيّ فحصٍ للمدى أو تمرين، وطوقٌ صلب بأمر الطبيب حتى التصوير", "neck · whiplash"),
  RF("head_injury", ["neck", "neuro_adult", "osteo_falls"], "emergency",
    "إصابةٌ في الرأس مع درجةِ غلاسكو أقلّ من ١٥ أو قيءٍ أكثر من مرّتين أو نسيانٍ أو كسرٍ مشتبه في الجمجمة، أو سقوطٌ على الرأس مع مضادّ تخثّر؟",
    "إلى الطوارئ لعمل مفراس قبل أيّ علاج", "whiplash · stroke-chronic · stroke-subacute · osteoporosis-falls"),
  RF("bppv", ["neck"], "routine",
    "دوارٌ مع تغيّر وضع الرأس؟",
    "يُجرى اختبارُ الدوار الوضعيّ، ويُعالج بمناورة الإعادة قبل نسبة الدوار إلى الرقبة", "whiplash · neck"),
  RF("shoulder_weakness", ["shoulder"], "urgent",
    "ضعفٌ مفاجئ في رفع الذراع بعد إصابة أو سقوط، أو «طقّة» بعد إصلاح الكفّة، أو خلعٌ لم يُردّ؟",
    "إلى الجرّاح خلال أيام، وفي الخلع إلى الطوارئ في اليوم نفسه", "subacromial · frozen · rotator-cuff-repair · calcific"),
  RF("median_compartment", ["elbow_hand"], "same_day",
    "تنميلٌ متزايد في أصابع العصب الأوسط، أو ألمٌ غير متناسب مع ساعدٍ مشدود (متلازمة الحيّز) بعد كسر؟",
    "إحالةٌ جراحية في اليوم نفسه", "distal-radius · carpal-tunnel"),
  RF("crps", ["elbow_hand", "sports_knee", "neuro_adult"], "urgent",
    "ألمٌ ٥ من ١٠ فأكثر في الأسبوع الأول، أو تغيّرُ لون الجلد أو حرارته أو تورّمٌ مع ألمٍ من اللمس (معايير بودابست)؟",
    "إلى الطبيب لاحتمال متلازمة الألم الناحيّ المركّب", "distal-radius · stroke-subacute · stroke-chronic · acl · rotator-cuff-repair",
    ["distal_radius", "lateral_elbow", "carpal_tunnel", "hand_oa", "meniscal", "acl", "stroke"]),
  RF("fragility_fracture", ["elbow_hand", "rheum", "osteo_falls"], "routine",
    "(بعد ٥٠ أو مع كورتيزون) كسرٌ من سقطةٍ بسيطة، أو نقصٌ في الطول ٤ سم فأكثر، أو حدبة؟",
    "إحالةٌ لتقييم صحّة العظم وخطر السقوط", "distal-radius · osteoporosis-falls · rheumatoid · axial-spa"),
  RF("scfe", ["hip_knee"], "urgent",
    "(ركبةٌ عند مراهق) عرجٌ مع ألمٍ في الورك أو الفخذ، أو تقييدٌ مؤلم في الدوران الداخليّ؟",
    "أشعّةٌ للورك خلال أيام (انزلاقُ رأس الفخذ)، وفي العجز المفاجئ عن التحميل في اليوم نفسه", "patellofemoral · hip-oa"),
  RF("avn_hip", ["hip_knee"], "urgent",
    "(خشونة الورك) فقرُ دمٍ منجليّ، أو كورتيزون بجرعة عالية، أو كوفيد عولج بالكورتيزون، أو العمر دون ٥٠؟",
    "رنينٌ عن طريق الطبيب خلال أيام (احتمالُ نخر رأس الفخذ)، ولا شدَّ", "hip-oa", ["hip_oa"]),
  RF("locked_knee", ["hip_knee", "sports_knee"], "same_day",
    "ركبةٌ مقفلة حقاً لا تنبسط، أو تورّمٌ مشدود خلال ساعتين إلى اثنتي عشرة بعد الالتواء، أو انخلاعٌ أو خذلانٌ متكرّر؟",
    "إلى الجرّاح في اليوم نفسه أو خلال الأسبوع", "knee-meniscal · acl · knee-oa · patellofemoral", ["knee_oa", "patellofemoral", "meniscal", "acl"]),
  RF("tendon_rupture", ["sports_knee", "foot_ankle"], "same_day",
    "صوتُ «طقّة» مع ضعفٍ مفاجئ، أو فجوةٌ محسوسة في الوتر، أو اختبارُ ضغط الساق إيجابيّ، أو عجزٌ جديد عن رفع الساق مستقيمة؟",
    "تمزّقُ وتر العرقوب أو الوتر الرضفيّ: لا تمرين، وإحالةٌ عاجلة إلى العظام في اليوم نفسه", "achilles · ankle-sprain · acl · plantar-heel"),
  RF("tha_dislocation", ["joint_replacement"], "emergency",
    "(بعد استبدال الورك) ألمٌ مفاجئ شديد مع «طقّة»، أو عجزٌ عن التحميل، أو ساقٌ قصيرة ظاهرة؟",
    "اشتباهُ خلع: يُوقف كلّ شيء، ولا يُحرَّك ولا يُردّ، ويُحال إلى الطوارئ فوراً", "tha", ["tha"]),
  RF("quinolones", ["foot_ankle"], "routine",
    "(وتر العرقوب) مضادّاتٌ حيوية من الكينولونات في الأشهر الستة الأخيرة ولو بلا وصفة؟",
    "يُبلَّغ الطبيب، ويُبطَّأ التحميل، ولا يُنصح المريض بإيقاف أيّ دواء", "achilles", ["achilles"]),
  RF("stump_wound", ["amputation"], "urgent",
    "(بتر) جرحٌ لم يلتئم، أو احمرارٌ لا يزول في الجذع، أو ألمٌ نقطيّ في السوكيت، أو جرحٌ في القدم السليمة؟",
    "لا يُلبس الطرف حتى العلاج أو تعديل السوكيت، ويُحال إلى الجرّاح أو صانع الأطراف", "prosthetic-gait · preprosthetic · upper-limb-amputation"),
  RF("seizure", ["neuro_adult", "pediatric"], "emergency",
    "نوبةُ صرعٍ مطوّلة أو متكرّرة، أو نوبةٌ أولى أو جديدة؟",
    "طوارئ للنوبة المطوّلة، وإلى الطبيب في اليوم نفسه للنوبة الجديدة", "stroke · cp · jia (بالقياس)", ["stroke", "cp"]),
  RF("aspiration", ["neuro_adult", "pediatric"], "same_day",
    "اختناقٌ أو سعالٌ مع الأكل أو الشرب، أو حمّى مع سعال؟",
    "إلى الطبيب لاحتمال التهاب الرئة الاستنشاقيّ، وتقييمُ البلع", "stroke-subacute · cp · parkinsons · ms · sci", ["stroke", "sci", "parkinsons", "ms", "cp"]),
  RF("botox_adverse", ["neuro_adult", "pediatric"], "emergency",
    "(بعد البوتوكس) ضعفٌ عامّ، أو صعوبةُ بلع، أو تدلّي الجفن بعد أيام من الحقن؟",
    "طوارئ في اليوم نفسه (احتمالُ بوتوكس مغشوش)", "cp · stroke-chronic", ["stroke", "cp"]),
  RF("autonomic_dysreflexia", ["neuro_adult"], "emergency",
    "(إصابةٌ فوق T6) صداعٌ نابض، تعرّقٌ أو احمرارٌ فوق الإصابة، وضغطٌ انقباضيّ ١٥٠ فأكثر لا يهدأ بالجلوس وإرخاءِ الملابس وتفريغِ المثانة؟",
    "فرطُ منعكسٍ ذاتيّ: إحالةٌ إلى الطوارئ في اليوم نفسه", "sci", ["sci"]),
  RF("parkinson_hyperpyrexia", ["neuro_adult"], "emergency",
    "(باركنسون) حمّى مع تيبّسٍ وتشوّشٍ بعد إيقاف الدواء أو تقليله؟",
    "طوارئ فوراً (فرطُ الحرارة الباركنسونيّ)، ولا يُنصح المريض أبداً بإيقاف الدواء", "parkinsons", ["parkinsons"]),
  RF("ms_relapse", ["neuro_adult"], "same_day",
    "(تصلّب لويحيّ) أعراضٌ جديدة أو أسوأ تدوم أكثر من ٢٤ ساعة بلا حمّى، أو حمّى أو عدوى بولية؟",
    "إلى طبيب الأعصاب أو الطوارئ في اليوم نفسه (انتكاسة أو انتكاسة كاذبة)، ولا تدريبَ متدرّجاً", "ms", ["ms"]),
  RF("bells_referral", ["neuro_adult"], "same_day",
    "(شلل وجه) طفحٌ أو بثورٌ في الأذن أو الفم، أو فقدُ سمع، أو كتلةٌ قرب الأذن، أو تكرّرٌ في الجانب نفسه، أو شللٌ في الجانبين، أو لم يأخذ الكورتيزون خلال ٧٢ ساعة؟",
    "إلى الأنف والأذن أو الأعصاب بصفة عاجلة، ومن لم يأخذ الكورتيزون إلى الطبيب في اليوم نفسه", "bells-palsy", ["bells"]),
  RF("red_eye", ["neuro_adult", "rheum", "pediatric"], "same_day",
    "عينٌ حمراء مؤلمة، أو حساسيةٌ للضوء، أو تغيّرُ الرؤية؟",
    "إلى طبيب العيون في اليوم نفسه (التهاب العنبية، أو قرنيّة العين التي لا تُغلق)", "bells-palsy · axial-spa · jia · rheumatoid", ["bells", "ra", "axspa", "jia"]),
  RF("fused_spine_fall", ["rheum"], "emergency",
    "ألمٌ جديد أو متغيّر في الرقبة أو الظهر بعد سقطةٍ صغيرة أو صدمة عند مريض عمودٍ ملتحم (التهاب الفقار)؟",
    "طوارئ في اليوم نفسه لعمل مفراس أو رنين، ولا تُقوَّم الرقبة المنحنية وتُثبَّت في وضعها المعتاد", "axial-spa", ["axspa"]),
  RF("child_neuro", ["pediatric"], "same_day",
    "(طفل) فقدانُ مهارةٍ مكتسبة، أو خدرٌ أو تقيّؤ، أو صعرٌ بعد عدوى الأذن أو الحلق، أو كتلةٌ نامية، أو صعرٌ يغيّر جانبه، أو عينٌ تحيد؟",
    "إلى طوارئ الأطفال أو طبيب أعصاب الأطفال في اليوم نفسه. وتحيّدُ العين إلى طبيب العيون خلال أسبوع أو أسبوعين", "cmt · cp · bpbp · jia · ais"),
  RF("systemic_jia", ["pediatric"], "same_day",
    "(طفل) حمّى مع طفح، أو حمّى ٣٩ درجةً فأكثر سبعةَ أيام، أو تضخّمُ الكبد أو الطحال، أو نزف؟",
    "طوارئ الأطفال في اليوم نفسه (الشكلُ الجهازيّ للالتهاب المفصليّ اليفعيّ، أو متلازمةُ تنشّط البلاعم)", "jia", ["jia"]),
  RF("scoliosis_flags", ["pediatric"], "urgent",
    "(جنف) منعكسٌ بطنيّ غائب في جانب واحد، أو انحناءٌ صدريّ أيسر، أو ألمٌ ليليّ، أو بدايةٌ قبل العاشرة، أو زيادةٌ ٥° فأكثر بين زيارتين؟",
    "إلى الطبيب قبل البرنامج لطلب الرنين أو التصوير", "ais", ["ais"]),
  RF("cellulitis", ["lymphedema"], "same_day",
    "(وذمة لمفية) احمرارٌ وحرارةٌ وتورّمٌ سريع مع حمّى (التهاب النسيج الخلويّ)، أو تورّمٌ مفاجئ مع أوردة بارزة، أو عقيداتٌ بنفسجية؟",
    "يُوقف الضماد والضاغط والتصريف، ويُحال إلى الطبيب في اليوم نفسه. والعقيدات أو الكتلة إلى الأورام بصفة عاجلة", "lymphedema"),
];

/** **العلاماتُ التي تُسأل لهذا المريض**: العامّةُ الثماني، وما يخصّ مجموعته (والمقيَّدةُ بحالةٍ تظهر حين تُختار حالتُها). */
export function redFlagQuestionsFor(group: unknown, condition: unknown): RedFlagDef[] {
  return V2_RED_FLAGS.filter((f) => {
    if (f.groups === null) return true;
    if (typeof group !== "string" || !f.groups.includes(group)) return false;
    if (!f.conditions) return true;
    return typeof condition === "string" && f.conditions.includes(condition);
  });
}

/**
 * **العلاماتُ الإلزامية في هذه المعاينة** — العامّةُ الثماني وما يخصّ مجموعتَها وحالتَها، في الإصدارين.
 * (§4.hd — المراجعة: كانت الثالثةُ تُلزم الأربعين كلَّها، فكانت «لا شيء ممّا يلي» تكتب «لا» لاثنتين وثلاثين علامةً مطويّةً لم يرها الفاحص، ثمّ تبقى «لا»
 * حين تُؤكَّد المجموعةُ بجواب. فصارت علاماتُ المجموعة تُلزم حين تُعرف المجموعة: عند التوقيع إن اختارها، وفي الجواب نفسِه إن أكّدها بجواب — `answerFollowUps`.)
 */
export function redFlagQuestionsOfExam(a: unknown): RedFlagDef[] {
  const x = (a ?? {}) as Partial<PhysioExamV2>;
  return redFlagQuestionsFor(x.core?.group, x.module?.condition);
}
/** **العلاماتُ المجابة في هذه المعاينة** — الإلزاميةُ، وفي الثالثة كلُّ ما أجاب عنه الفاحصُ من غيرها (اختياراً): «نعم» فيها تُحسب أينما كانت. */
function redFlagsAnsweredOfExam(a: PhysioExamV2): RedFlagDef[] {
  if (examRuleset(a) !== "v3") return redFlagQuestionsOfExam(a);
  const req = new Set(redFlagQuestionsOfExam(a).map((q) => q.key));
  return V2_RED_FLAGS.filter((q) => req.has(q.key) || a.redFlags?.[q.key] === "yes" || a.redFlags?.[q.key] === "no");
}

// ══ الإصدارُ الثالث: ورقةُ السلامة ومدخلاتُ البوّابات والحذر (§4.hd) ═══════════════════════════════════════════
/** **ورقةُ السلامة** — إلزاميةٌ عند التوقيع (حين تنطبق): كلُّ خانةٍ تغيّر الموانعَ أو البوّابةَ لكلّ مريض، وأبناؤها المشروطون. */
export const V3_REQUIRED_CORE: ReadonlySet<string> = new Set([
  "sex", "ageYears", "onsetKind", "onsetDate", "surgery", "surgeryDate", "irritability", "canReportHeat", "implants", "implantsOther",
  "metalInField", "metalTypes", "pregnant", "anticoagulant", "cancer", "cancerInField", "skin", "steroidInjection", "steroidInjectionDate",
  "boneHealth", "epilepsy",
]);
/** «غير ذلك» — للإصدار الثالث وحده: يؤكّد أنّ الحالةَ خارجَ المجموعات (مسارُ «خارج المكتبة»). */
export const V3_OTHER_GROUP = "other";
export const V3_GROUPS: readonly Opt[] = [...V2_GROUPS, o(V3_OTHER_GROUP, "Other — not in the groups", "غير ذلك — ليست في المجموعات")];
const V3_GROUP_FIELD: V2Field = { ...V2_CORE_FIELDS[0], options: V3_GROUPS };
/** خاناتُ النواة بإصدارها — «مجموعةُ التشخيص» في الثالث فيها «غير ذلك». */
export const coreFieldsFor = (ruleset: ExamRuleset): readonly V2Field[] =>
  ruleset === "v3" ? V2_CORE_FIELDS.map((f) => (f.key === "group" ? V3_GROUP_FIELD : f)) : V2_CORE_FIELDS;

/** نطاقُ مدخلٍ: المجموعةُ أو الحالة. */
export interface ExamScope { group?: string; condition?: string }
/**
 * **مدخلاتُ البوّابات** — ما تقرؤه قاعدةُ موانعٍ لمجموعةٍ أو حالةٍ بعينها. مجهولُها يُعامَل بأسوأ قيمه (`worst`) في `forbiddenDevices`،
 * ويسأل عنه Bionic AI قبل الخطّة. و`best` لاختبار الخاصّية وحده (قيمةٌ لا تمنع شيئاً).
 */
export interface GateInput { scope: ExamScope; key: string; worst: V2Value; best: V2Value }
export const GATE_INPUTS: readonly GateInput[] = [
  { scope: { group: "lumbar" }, key: "core.side", worst: "both", best: "right" },
  { scope: { group: "neck" }, key: "core.side", worst: "both", best: "right" },
  { scope: { condition: "stroke" }, key: "core.fac", worst: "5", best: "0" },
  { scope: { condition: "calcific" }, key: "module.acuteAttack", worst: "yes", best: "no" },
  { scope: { condition: "cuff_repair" }, key: "module.tearSize", worst: "massive", best: "small" },
  { scope: { condition: "cuff_repair" }, key: "module.subscapRepair", worst: "yes", best: "no" },
  { scope: { condition: "achilles" }, key: "module.tendonType", worst: "insertional", best: "midportion" },
  { scope: { condition: "achilles" }, key: "module.priorRupture", worst: "yes", best: "no" },
  { scope: { condition: "ms" }, key: "module.heatSensitive", worst: "yes", best: "no" },
  { scope: { condition: "bells" }, key: "module.eyeCloses", worst: "no", best: "yes" },
  { scope: { condition: "axspa" }, key: "module.fusedSpine", worst: "yes", best: "no" },
  { scope: { group: "osteo_falls" }, key: "module.boneStatus", worst: "vertebral_fracture", best: "no_fracture" },
  { scope: { group: "lymphedema" }, key: "module.limb", worst: "leg", best: "arm" },
  { scope: { group: "lymphedema" }, key: "module.abi", worst: 0.5, best: 1 },
  { scope: { group: "lymphedema" }, key: "module.heartFailure", worst: "IV", best: "none" },
];
/**
 * **بروتوكولاتُ الشدّة العالية** — ما يكتب محتواه شدّةً بالنبض أو بالجهد، فتلزم قبل خطّته حاصراتُ بيتا والرجفانُ والوزن.
 * **قائمةٌ مقترحة لسليم أن يؤكّدها** (§4.hd — بنودُ المالك)، واختبارٌ يتحقّق أنّ كلَّ رمزٍ فيها بروتوكولٌ في المجموعات.
 */
export const HIGH_INTENSITY_PROTOCOLS: readonly string[] = [
  "stroke-subacute-adult", "stroke-chronic-adult", "parkinsons-geriatric", "multiple-sclerosis-adult", "axial-spa-adult",
  "rheumatoid-arthritis-adult", "osteoporosis-falls-geriatric", "sci-incomplete-adult",
];

const scopeMatches = (s: ExamScope, group: string | null, condition: string | null) =>
  (s.group === undefined || s.group === group) && (s.condition === undefined || s.condition === condition);

/** **هل أُكّدت مجموعةُ التشخيص؟** — الثانيةُ دائماً؛ والثالثةُ حين تُختار المجموعة (أو «غير ذلك») وحالتُها إن كان لها حالات. */
export function examGroupConfirmed(a: unknown): boolean {
  if (!isExamV2(a) || examRuleset(a) === "v2") return true;
  const g = a.core?.group;
  if (typeof g !== "string" || !g) return false;
  if (g === V3_OTHER_GROUP) return true;
  const m = moduleOf(g);
  if (!m) return false;
  return !(m.conditions?.length) || typeof a.module?.condition === "string" && Boolean(conditionOf(g, a.module.condition));
}
const valueAt = (a: Pick<PhysioExamV2, "core" | "module">, key: string): V2Value | undefined => {
  const [part, k] = key.split(".");
  return part === "core" ? a.core?.[k] : part === "module" ? a.module?.[k] : undefined;
};
const fieldAt = (key: string, group: unknown): V2Field | null => {
  const [part, k] = key.split(".");
  if (part === "core") return V2_CORE_FIELDS.find((f) => f.key === k) ?? null;
  if (part === "module") return moduleFieldsOf(group).find((f) => f.key === k) ?? null;
  return null;
};
/** **مدخلاتُ البوّابات الفارغة** لنطاق المعاينة المؤكَّد (الثالثةُ وحدها) — والخانةُ التي لا تنطبق (مؤشّرُ الكاحل لذراع) ليست ناقصة. */
export function examGateInputsMissing(a: unknown): string[] {
  if (!isExamV2(a) || examRuleset(a) === "v2" || !examGroupConfirmed(a)) return [];
  const c = examV2Ctx(a);
  const out: string[] = [];
  for (const gi of GATE_INPUTS) {
    if (!scopeMatches(gi.scope, c.group, c.condition) || out.includes(gi.key)) continue;
    const f = fieldAt(gi.key, c.group);
    if (f && !applies(f, c)) continue;
    if (isEmptyValue(valueAt(a, gi.key))) out.push(gi.key);
  }
  return out;
}
/**
 * **مدخلاتُ الحذر** — سلامةُ التمرين التي جعلتها الثانيةُ إلزاميةً عمداً (١٥٧ · ١٧٤ · ١٧٩): اختياريةٌ عند التوقيع في الثالثة،
 * ولازمةٌ قبل الخطّة (تُكتب أو يُجاب عنها). بلا خطّة: العامّةُ وما تقرّره المجموعة؛ ومع الخطّة: ما يقرّره جهازُها وبروتوكولُها.
 */
export function examCautionInputsMissing(a: unknown, plan?: { deviceCodes?: readonly string[]; protocolCode?: string | null; outOfLibrary?: boolean } | null): string[] {
  if (!isExamV2(a) || examRuleset(a) === "v2") return [];
  const c = examV2Ctx(a);
  const need: string[] = ["core.diabetes", "core.neuropathy", "core.fasting"];
  if (c.core.surgery === "yes") need.push("core.surgeonInstructions");
  if (c.ageYears !== null && c.ageYears < 2) need.push("core.correctedAgeMonths");
  if (c.group === "neuro_adult" || c.condition === "cp") need.push("core.botox", "core.botoxDate", "core.fallsLastYear");
  if (plan?.deviceCodes?.includes("needle")) need.push("core.immunosuppressed");
  //  §4.hd (المراجعة) — وخطّةُ «خارج المكتبة» لا يُعرف أنّها ليست شديدة: تلزمها مدخلاتُ الشدّة كلّها.
  if ((plan?.protocolCode && HIGH_INTENSITY_PROTOCOLS.includes(plan.protocolCode)) || plan?.outOfLibrary) need.push("core.betaBlocker", "core.atrialFibrillation", "core.weightKg");
  return need.filter((key) => {
    const f = fieldAt(key, c.group);
    return Boolean(f) && applies(f!, c) && isEmptyValue(valueAt(a, key));
  });
}
/** **ما يجب أن يُسأل قبل `submit_plan`** (بلا خطّة): تأكيدُ المجموعة وحالتِها، ومدخلاتُ البوّابات، ومدخلاتُ الحذر. */
export function examMustAskBeforePlan(a: unknown): string[] {
  if (!isExamV2(a) || examRuleset(a) === "v2") return [];
  const out: string[] = [];
  if (!examGroupConfirmed(a)) {
    const g = a.core?.group;
    if (typeof g !== "string" || !g) out.push("core.group");
    if (typeof g !== "string" || !g || (moduleOf(g)?.conditions?.length ?? 0) > 0) out.push("module.condition");
  }
  return [...out, ...examGateInputsMissing(a), ...examCautionInputsMissing(a)];
}
/** **ما يفرضه جوابٌ على نفسه** (§4.hd ٥.٥): مدخلاتٌ صارت لازمةً بالجواب (المجموعةُ ⟵ حالتُها ⟵ مدخلاتُ بوّابتها، والسكّريّ ⟵ اعتلالُ القدم…)
 *  ولم تكن لازمةً قبله — فتُطلب في الجواب نفسِه. */
export function answerFollowUps(stored: unknown, merged: unknown, patchedKeys: readonly string[]): string[] {
  const before = new Set(examMustAskBeforePlan(stored));
  const after = examMustAskBeforePlan(merged);
  const out = after.filter((k) => !before.has(k) || (k === "module.condition" && patchedKeys.includes("core.group")));
  //  §4.hd (المراجعة) — **علاماتُ المجموعة التي أكّدها الجواب** تُجاب في الجواب نفسِه («لا شيء ممّا يلي» أو «نعم» لما وُجد) — فلا تبقى بلا قراءة.
  if (isExamV2(merged)) {
    const wasRequired = new Set(isExamV2(stored) ? redFlagQuestionsOfExam(stored).map((q) => q.key) : []);
    for (const q of redFlagQuestionsOfExam(merged)) {
      const ans = merged.redFlags?.[q.key];
      if (!wasRequired.has(q.key) && ans !== "yes" && ans !== "no") out.push(`redFlags.${q.key}`);
    }
  }
  return out;
}
/** بروتوكولاتُ المكتبة لنطاق المعاينة — الحالةُ ثمّ المجموعة. */
export function protocolsOfExam(a: unknown): readonly string[] {
  if (!isExamV2(a)) return [];
  const cond = conditionOf(a.core?.group, a.module?.condition);
  return cond?.protocols ?? moduleOf(a.core?.group)?.protocols ?? [];
}
/** **ما يجوز أن يُسأل عنه الفاحصُ خانةً في المعاينة** (§4.hd ٥.٢): الفارغُ الآن من المجموعة والحالة وخاناتِ الوحدة والنواةِ الاختيارية —
 *  **لا ورقةَ السلامة ولا العلاماتِ الحمراء ولا الجنسَ والعمر** أبداً. */
export interface AskableField { key: string; en: string; ar: string; kind: V2Kind; options: { code: string; en: string }[] | null; min?: number; max?: number }
export function examAskableFields(a: unknown): AskableField[] {
  if (!isExamV2(a) || examRuleset(a) === "v2") return [];
  const c = examV2Ctx(a);
  const out: AskableField[] = [];
  const push = (key: string, f: V2Field) => {
    if (out.some((x) => x.key === key)) return;
    out.push({ key, en: f.en, ar: f.ar, kind: f.kind, options: f.options ? f.options.map((x) => ({ code: x.code, en: x.en })) : null,
      ...(f.min !== undefined ? { min: f.min } : {}), ...(f.max !== undefined ? { max: f.max } : {}) });
  };
  if (isEmptyValue(c.core.group)) push("core.group", V3_GROUP_FIELD);
  const groups = c.group ? [c.group] : V2_MODULES.map((m) => m.group);
  for (const g of groups) {
    const m = moduleOf(g);
    if (!m) continue;
    const cf = conditionField(m);
    if (cf && isEmptyValue(c.module.condition)) push("module.condition", c.group ? cf : { ...cf, options: V2_MODULES.flatMap((x) => x.conditions ?? []).map((x) => o(x.code, x.en, x.ar)) });
    //  المجموعةُ مؤكَّدة: ما ينطبق الآن (وما يتبع حالةً لم تُختر بعد)؛ وبلا مجموعة: خاناتُ كلّ وحدة.
    for (const f of m.fields) if (isEmptyValue(c.module[f.key]) && (!c.group || applies(f, c) || c.condition === null)) push(`module.${f.key}`, f);
  }
  for (const f of V2_CORE_FIELDS) {
    if (f.key === "group" || V3_REQUIRED_CORE.has(f.key)) continue;
    if (isEmptyValue(c.core[f.key]) && applies(f, c)) push(`core.${f.key}`, f);
  }
  return out;
}
/** مفاتيحُ لا يُسأل عنها أبداً بجواب — ورقةُ السلامة والجنسُ والعمرُ والعلاماتُ الحمراء. */
export const isNeverAskable = (key: string): boolean => {
  if (key.startsWith("redFlags.") || key === "sensation" || key === "sensationRegions" || key === "diagnosis") return true;
  const [part, k] = key.split(".");
  return part === "core" && V3_REQUIRED_CORE.has(k);
};

// ══ التطبيع والفحص ═══════════════════════════════════════════════════════════════════════════════
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
/** «٤٧» و«۴۷» ⟵ «47» — لوحةُ المفاتيح العربية تكتب أرقامَها. */
const westernDigits = (s: string) => s.replace(ARABIC_DIGITS, (d) => {
  const i = "٠١٢٣٤٥٦٧٨٩".indexOf(d);
  return String(i >= 0 ? i : "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
});
const TEXT_MAX = 500;

type FieldResult = { ok: true; v: V2Value } | { ok: false; error: string };

function normalizeField(f: V2Field, raw: unknown, today?: string): FieldResult {
  const empty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
  if (empty) return { ok: true, v: f.kind === "multi" ? [] : null };
  const bad = (why = "قيمةٌ غير صالحة"): FieldResult => ({ ok: false, error: `${why} في «${f.ar}»` });
  switch (f.kind) {
    case "choice":
    case "yesno": {
      if (typeof raw !== "string") return bad();
      return (f.options ?? []).some((x) => x.code === raw) ? { ok: true, v: raw } : bad();
    }
    case "multi": {
      if (!Array.isArray(raw)) return bad();
      const allowed = new Set((f.options ?? []).map((x) => x.code));
      const picked: string[] = [];
      for (const x of raw) {
        if (typeof x !== "string" || !allowed.has(x)) return bad();
        if (!picked.includes(x)) picked.push(x);
      }
      if (f.exclusive && picked.includes(f.exclusive)) return { ok: true, v: [f.exclusive] };
      return { ok: true, v: (f.options ?? []).map((x) => x.code).filter((c) => picked.includes(c)) };
    }
    case "int":
    case "num": {
      const s = typeof raw === "number" ? String(raw) : typeof raw === "string" ? westernDigits(raw.trim()).replace("٫", ".").replace(",", ".") : "";
      if (!/^-?\d+(\.\d+)?$/.test(s)) return bad(f.kind === "int" ? "رقمٌ صحيح مطلوب" : "رقمٌ مطلوب");
      const n = Number(s);
      if (f.kind === "int" && !Number.isInteger(n)) return bad("رقمٌ صحيح مطلوب");
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) return bad(`الرقمُ من ${f.min} إلى ${f.max}`);
      if (f.kind === "num" && f.step && f.step >= 0.5 && Math.abs(n / f.step - Math.round(n / f.step)) > 1e-9) return bad(`بخطوة ${f.step}`);
      return { ok: true, v: f.kind === "num" ? Math.round(n * 100) / 100 : n };
    }
    case "date": {
      if (typeof raw !== "string") return bad("تاريخٌ غير صالح");
      const s = westernDigits(raw.trim()).slice(0, 10);
      if (!isRealCalendarDate(s)) return bad("تاريخٌ غير صالح");
      if (f.noFuture && today && s > today) return bad("التاريخُ لا يكون في المستقبل");
      return { ok: true, v: s };
    }
    case "text": {
      if (typeof raw !== "string" && typeof raw !== "number") return bad();
      const s = String(raw).trim().slice(0, TEXT_MAX);
      return { ok: true, v: s || null };
    }
  }
}

/**
 * **يومٌ موجودٌ في التقويم** (مراجعةُ Codex على #770): `Date.parse("2025-02-31")` يقبله ويدحرجه إلى مارس، والتاريخُ يحسب
 * الحدّةَ ونوافذَ الجراحة والحقنة — فيُعاد بناؤه من أجزائه ويُقارَن بالمكتوب.
 */
export function isRealCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

//  `ruleset` إلزاميٌّ بلا قيمةٍ افتراضية — فيجد `tsc` كلَّ مُستدعٍ (§4.hd).
const ctxOf = (core: V2Values, module: V2Values, ruleset: ExamRuleset): V2Ctx => {
  const group = typeof core.group === "string" ? core.group : null;
  return {
    core, module, group,
    condition: typeof module.condition === "string" ? module.condition : null,
    ageYears: typeof core.ageYears === "number" ? core.ageYears : null,
    sex: typeof core.sex === "string" ? core.sex : null,
    ruleset,
  };
};
const applies = (f: V2Field, c: V2Ctx) => !f.when || f.when(c);
/** الإلزامُ بإصداره: في الثالث ورقةُ السلامة وحدها من النواة (وأبناؤها المشروطون)، ولا خانةَ وحدةٍ ولا «حالة». */
const isRequired = (f: V2Field, c: V2Ctx) => {
  const base = typeof f.required === "function" ? f.required(c) : f.required === true;
  if (c.ruleset === "v2") return base;
  return base && V3_REQUIRED_CORE.has(f.key) && V2_CORE_FIELDS.some((x) => x.key === f.key);
};
/** للشاشة: سياقُ الشروط، وهل الخانةُ ظاهرةٌ وإلزامية — بالقاعدة نفسِها التي يفحص بها الخادم. */
export const examV2Ctx = (a: Pick<PhysioExamV2, "core" | "module"> & { version?: unknown }): V2Ctx => ctxOf(a.core ?? {}, a.module ?? {}, examRuleset(a));
export const fieldApplies = applies;
export const fieldRequired = (f: V2Field, c: V2Ctx) => applies(f, c) && isRequired(f, c);
const isEmptyValue = (v: V2Value | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** **حقلُ «الحالة» في المجموعة** — يظهر حين للمجموعة أكثرُ من حالة، وإلزاميّ. */
export function conditionField(m: V2Module): V2Field | null {
  if (!m.conditions || m.conditions.length === 0) return null;
  return { key: "condition", ar: "الحالةُ داخل المجموعة", en: "Condition within the group", kind: "choice", options: m.conditions.map((c) => o(c.code, c.en, c.ar)), required: true };
}
/** خاناتُ وحدة المجموعة بترتيبها — «الحالة» أوّلاً. */
export function moduleFieldsOf(group: unknown): V2Field[] {
  const m = moduleOf(group);
  if (!m) return [];
  const cf = conditionField(m);
  return cf ? [cf, ...m.fields] : [...m.fields];
}

export function emptyExamV2(): PhysioExamV2 {
  return {
    ...emptyInitialAssessment(), form: PT_FORM_CODE_V2, version: PT_FORM_VERSION_V2,
    core: { implants: [], anticoagulant: [], skin: [], boneHealth: [] }, module: {}, redFlags: {},
  };
}
/** **معاينةٌ جديدة بالإصدار الثالث** (§4.hd) — التشخيصُ الحرّ وورقةُ السلامة والعلاماتُ الأربعون. */
export function emptyExamV3(): PhysioExamV2 {
  return { ...emptyExamV2(), version: PT_FORM_VERSION_V3 };
}

export type ExamV2Parse =
  | { ok: true; value: PhysioExamV2; missing: string[] }
  | { ok: false; error: string; missing: string[] };

/**
 * **تطبيعُ الاستمارة الثانية وفحصُها** — يقرؤها الخادمُ قبل أيّ كتابة، والشاشةُ قبل الإرسال.
 * قيمةٌ غيرُ صالحة ⟵ رفضٌ يسمّي الخانة. ثمّ `missing`: الإلزاميُّ الظاهرُ الفارغ والعلاماتُ بلا جواب — **وهو يمنع الحفظ**
 * (`assessment_incomplete` في الخادم). وما لا ينطبق يُمحى (الحملُ لرجل، ونوعُ العملية بلا عملية…) فلا يُخزَّن ما لم يُسأل.
 */
export function parseExamV2(raw: unknown, opts: { today?: string; diagnosis?: unknown } = {}): ExamV2Parse {
  const bad = (field: string, error: string): ExamV2Parse => ({ ok: false, error, missing: [field] });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("assessment", "استمارة المعاينة غير صالحة");
  const r = raw as Record<string, any>;
  if (r.form !== PT_FORM_CODE_V2) return bad("assessment", `استمارة المعاينة ليست ${PT_FORM_CODE_V2}`);
  const ruleset = examRuleset(r);
  const coreFields = coreFieldsFor(ruleset);
  //  أقسامُ الأولى المُعادة بقاعدتها نفسِها — والمخفيُّ منها هنا لا يُخزَّن (الألمُ والعمليةُ في النواة، و«لا ينطبق» لا مكانَ له في الإلزام).
  const v1 = parseInitialAssessment({ ...r, form: PT_FORM_CODE, sectionANa: false, painBest: null, painWorst: null, surgeryDate: null }, { today: opts.today });
  if (!v1.ok) return { ok: false, error: v1.error, missing: v1.missing };

  const rawCore = r.core && typeof r.core === "object" && !Array.isArray(r.core) ? r.core : {};
  const rawModule = r.module && typeof r.module === "object" && !Array.isArray(r.module) ? r.module : {};
  const core: V2Values = {};
  for (const f of coreFields) {
    const n = normalizeField(f, rawCore[f.key], opts.today);
    if (!n.ok) return bad(`core.${f.key}`, n.error);
    core[f.key] = n.v;
  }
  const module: V2Values = {};
  for (const f of moduleFieldsOf(core.group)) {
    const n = normalizeField(f, rawModule[f.key], opts.today);
    if (!n.ok) return bad(`module.${f.key}`, n.error);
    module[f.key] = n.v;
  }
  //  ما لا ينطبق يُمحى — مرّتان لتتّسق الشروطُ المتسلسلة (العمليةُ ⟵ نوعُها ⟵ «بالتحديد»، والحالةُ ⟵ المعدن).
  for (let pass = 0; pass < 3; pass++) {
    for (const f of coreFields) if (!applies(f, ctxOf(core, module, ruleset))) core[f.key] = f.kind === "multi" ? [] : null;
    for (const f of moduleFieldsOf(core.group)) if (!applies(f, ctxOf(core, module, ruleset))) module[f.key] = f.kind === "multi" ? [] : null;
  }
  if (typeof core.painNow === "number" && typeof core.painWorstWeek === "number" && core.painNow > core.painWorstWeek) {
    return bad("core.painNow", "الألمُ الآن لا يزيد على الأسوأ في الأسبوع الماضي");
  }
  //  §4.hd (المراجعة) — **«غير ذلك» لا تصحّ والتشخيصُ يذكر حالةً من المكتبة**: تأكيدُها يُسقط موانعَ تلك الحالة كلَّها (الورك والكفّة والعرقوب والجلطة…).
  if (ruleset === "v3" && core.group === V3_OTHER_GROUP && opts.diagnosis !== undefined) {
    const named = otherGroupTextConflicts([typeof opts.diagnosis === "string" ? opts.diagnosis : null]);
    if (named.length) return bad("core.group", `التشخيصُ يذكر «${named.join("»، «")}» — اختر مجموعتَها بدل «غير ذلك»`);
  }

  const c = ctxOf(core, module, ruleset);
  const rawFlags = r.redFlags && typeof r.redFlags === "object" && !Array.isArray(r.redFlags) ? r.redFlags : {};
  const redFlags: Record<string, RedFlagAnswer> = {};
  for (const q of ruleset === "v3" ? V2_RED_FLAGS : redFlagQuestionsFor(c.group, c.condition)) {
    const a = rawFlags[q.key];
    if (a === undefined || a === null || a === "") continue;
    if (a !== "yes" && a !== "no") return bad(`redFlags.${q.key}`, "جوابُ العلامة الحمراء «نعم» أو «لا»");
    redFlags[q.key] = a;
  }

  //  §4.hd (المراجعة) — ما أكّده الفاحصُ من تنبيهات النصّ (للثالثة وحدها، ومفاتيحُ معروفة وحدها).
  const ack = ruleset === "v3" && Array.isArray(r.textSafetyAck)
    ? Array.from(new Set((r.textSafetyAck as unknown[]).filter((k): k is string => typeof k === "string" && TEXT_SAFETY_KEYS.includes(k)))) : [];
  const value: PhysioExamV2 = {
    ...v1.value, form: PT_FORM_CODE_V2, version: ruleset === "v3" ? PT_FORM_VERSION_V3 : PT_FORM_VERSION_V2,
    sectionANa: false, painBest: null, painWorst: null, surgeryDate: null,
    core, module, redFlags, ...(ack.length ? { textSafetyAck: ack } : {}),
  };
  return { ok: true, value, missing: examV2Missing(value, opts.diagnosis) };
}

/**
 * **ما ينقص الإلزاميَّ** بمفاتيحه: `diagnosis` · `core.<مفتاح>` · `sensation` · `sensationRegions` · `module.<مفتاح>` · `redFlags.<مفتاح>`.
 * الترتيبُ ترتيبُ الشاشة: التشخيص، فالنواة، فالإحساس، فوحدةُ المجموعة، فالعلاماتُ الحمراء.
 */
export function examV2Missing(a: PhysioExamV2, diagnosis?: unknown): string[] {
  const missing: string[] = [];
  if (diagnosis !== undefined && !(typeof diagnosis === "string" && diagnosis.trim())) missing.push("diagnosis");
  const c = examV2Ctx(a);
  for (const f of V2_CORE_FIELDS) {
    if (applies(f, c) && isRequired(f, c) && isEmptyValue(c.core[f.key])) missing.push(`core.${f.key}`);
    //  الإحساسُ (من الأولى) بعد «يستطيع أن يقول حارّ» — مكانُه في الشاشة.
    if (f.key === "irritability") {
      if (!a.sensation) missing.push("sensation");
      else if (sensationNeedsRegions(a.sensation) && !a.sensationRegions) missing.push("sensationRegions");
    }
  }
  for (const f of moduleFieldsOf(c.group)) {
    if (applies(f, c) && isRequired(f, c) && isEmptyValue(c.module[f.key])) missing.push(`module.${f.key}`);
  }
  for (const q of redFlagQuestionsOfExam(a)) {
    if (a.redFlags?.[q.key] !== "yes" && a.redFlags?.[q.key] !== "no") missing.push(`redFlags.${q.key}`);
  }
  return missing;
}

/** اسمُ الناقص بالعربية — للشاشة ولردّ الخادم (`missingLabels`). */
export function examV2MissingLabel(key: string, group?: unknown): string {
  if (key === "diagnosis") return "التشخيص";
  if (key === "sensation") return "الإحساس في منطقة العلاج";
  if (key === "sensationRegions") return "مناطقُ الإحساس المصابة";
  const [part, k] = key.split(".");
  if (part === "core") return V2_CORE_FIELDS.find((f) => f.key === k)?.ar ?? k;
  if (part === "module") return moduleFieldsOf(group).find((f) => f.key === k)?.ar ?? k;
  if (part === "redFlags") return `علامةٌ حمراء بلا جواب: ${V2_RED_FLAGS.find((f) => f.key === k)?.questionAr.slice(0, 60) ?? k}…`;
  return key;
}
export function examV2MissingText(keys: readonly string[], group?: unknown): string | null {
  if (!keys.length) return null;
  const flags = keys.filter((k) => k.startsWith("redFlags.")).length;
  const rest = keys.filter((k) => !k.startsWith("redFlags.")).map((k) => examV2MissingLabel(k, group));
  return `لم يُكتب بعد: ${[...rest, ...(flags ? [`${arDigits(flags)} من العلامات الحمراء بلا جواب`] : [])].join("، ")}`;
}

// ══ العلاماتُ الحمراء المجابة «نعم» ══════════════════════════════════════════════════════════════════════
export interface RedFlagHit { key: string; questionAr: string; actionAr: string; urgency: RedFlagUrgency }
const URGENCY_RANK: Record<RedFlagUrgency, number> = { emergency: 0, same_day: 1, urgent: 2, routine: 3 };
/** **ما أُجيب «نعم»** — بالأشدّ أوّلاً، ومع كلٍّ الإجراءُ الموصى به ودرجتُه. */
export function redFlagsOf(a: unknown): RedFlagHit[] {
  if (!isExamV2(a)) return [];
  //  §4.hd — في الثالثة «نعم» تُحسب أينما كانت (والعلامةُ خارج مجموعة المعاينة قد يعلّمها الفاحصُ اختياراً).
  return (examRuleset(a) === "v3" ? V2_RED_FLAGS : redFlagQuestionsOfExam(a))
    .filter((q) => a.redFlags?.[q.key] === "yes")
    .map((q) => ({ key: q.key, questionAr: q.questionAr, actionAr: q.actionAr, urgency: q.urgency }))
    .sort((x, y) => URGENCY_RANK[x.urgency] - URGENCY_RANK[y.urgency]);
}

// ══ المرحلةُ الزمنية المشتقّة ══════════════════════════════════════════════════════════════════════════
/** حادّ <٦ أسابيع · تحت الحادّ ٦–١٢ · مزمن >١٢ (exam_design.json · universal_mandatory ٤). */
export function examV2Acuity(core: V2Values, today: string): { code: "acute" | "subacute" | "chronic"; ar: string; en: string; weeks: number } | null {
  if (core.onsetKind !== "date" || typeof core.onsetDate !== "string") return null;
  const weeks = Math.floor((Date.parse(today) - Date.parse(core.onsetDate)) / (7 * 86400000));
  if (!Number.isFinite(weeks) || weeks < 0) return null;
  if (weeks < 6) return { code: "acute", ar: "حادّ (أقلّ من ٦ أسابيع)", en: "Acute (<6 weeks)", weeks };
  if (weeks <= 12) return { code: "subacute", ar: "تحت الحادّ (٦–١٢ أسبوعاً)", en: "Subacute (6–12 weeks)", weeks };
  return { code: "chronic", ar: "مزمن (أكثر من ١٢ أسبوعاً)", en: "Chronic (>12 weeks)", weeks };
}
const daysSince = (date: V2Value, today: string): number | null =>
  typeof date === "string" ? Math.floor((Date.parse(today) - Date.parse(date)) / 86400000) : null;

// ══ مصفوفةُ الموانع الحتمية (exam_design.json · contraindication_matrix، بتصحيحات الناقد) ═════════════════════════════
/** رموزُ الأجهزة كما في جدول `devices` (ترحيل ٠٠٩) وأسماؤها. */
export const V2_DEVICE_NAMES: Record<string, string> = {
  electro: "كهربائي", megnatik: "مغناطيس", laser: "ليزر", tecar: "تيكار", ultrasound: "أمواج فوق صوتية", traction: "شدّ",
  shockwaves: "موجات صادمة", hot_pack: "كمادات حارة", wax: "شمع", infrared: "أشعة تحت حمراء", robotik: "روبوتيك",
  compression: "ضغط", cpm: "تحريك مستمر", needle: "إبر",
};
const DEVICE_ORDER = Object.keys(V2_DEVICE_NAMES);
export interface ForbiddenDevice { deviceCode: string; reasonAr: string }

/**
 * **الأجهزةُ الممنوعة لهذا المريض بالمعاينة وحدها** — قاعدةٌ حتمية تُطبَّق بعد النموذج (قرارُ المالك: «بوّاباتٌ حتمية في الشيفرة بعد النموذج»).
 * لكلّ جهازٍ سطرٌ واحد بأسبابه كلِّها. **ولا قاعدةَ هنا بلا مصدر**: كلُّ صفٍّ بترحيله في تعليقه.
 */
export function forbiddenDevices(a: unknown, opts: { today: string }): ForbiddenDevice[] {
  if (!isExamV2(a)) return [];
  const real = rulesOf(a, opts);
  if (examRuleset(a) === "v2") return real;
  //  §4.hd — **المجهولُ أسوأُ قيمه**: ما قد تمنعه مجموعةٌ أو حالةٌ أو مدخلُ بوّابةٍ لم يُسجَّل بعد يُمنع بسببه حتى يُسجَّل.
  const extra = worstCaseExtra(a, opts, new Set(real.map((d) => d.deviceCode)));
  //  §4.hd (المراجعة) — **بدايةُ الأعراض «غير معروف» تُعامَل حادّةً وفي أيّامها الأولى** (المجهولُ أسوأُ قيمه): لا شدَّ ولا موجاتٍ ولا إبر حتى يُكتب تاريخٌ تقريبيّ.
  //  ليست «لم يُسجَّل بعد» (لا يُسأل عنها بجواب) — يصحّحها الفاحصُ في المعاينة.
  if (a.core?.onsetKind === "unknown") {
    const done = new Set([...real.map((d) => d.deviceCode), ...Array.from(extra.keys())]);
    for (const d of ["traction", "shockwaves", "needle"]) if (!done.has(d)) extra.set(d, UNKNOWN_ONSET_REASON);
  }
  if (!extra.size) return real;
  const reasons = new Map(real.map((d) => [d.deviceCode, d.reasonAr]));
  extra.forEach((why, d) => reasons.set(d, why));
  return DEVICE_ORDER.filter((d) => reasons.has(d)).map((d) => ({ deviceCode: d, reasonAr: reasons.get(d)! }));
}
/** سببُ منع ما تمنعه المرحلةُ الحادّة حين لا تُعرف بدايةُ الأعراض. */
export const UNKNOWN_ONSET_REASON = "بدايةُ الأعراض غير معروفة — تُعامَل حادّةً وفي أيّامها الأولى؛ اكتب تاريخاً تقريبياً في المعاينة لتقصر القائمة";
/** بادئةُ سببِ ما يُمنع لأنّه لم يُسجَّل بعد — تعرفه الشاشةُ فتقول «أكمل المجموعةَ وخاناتها لتقصر القائمة». */
export const NOT_RECORDED_PREFIX = "لم يُسجَّل بعد: ";
export const isNotRecordedReason = (reasonAr: string): boolean => reasonAr.startsWith(NOT_RECORDED_PREFIX);

/** إكمالاتُ المجهول: لكلّ مجموعةٍ وحالةٍ ممكنة نسخةٌ تُكتب فيها مدخلاتُ بوّابتها الفارغة بأسوأ قيمها. */
function worstCompletions(a: PhysioExamV2, today: string, only?: string): PhysioExamV2[] {
  const confirmed = examGroupConfirmed(a);
  const g0 = typeof a.core?.group === "string" && a.core.group ? a.core.group : null;
  const scopes: { group: string; condition: string | null }[] = [];
  if (confirmed) scopes.push({ group: g0!, condition: typeof a.module?.condition === "string" ? a.module.condition : null });
  else {
    const groups = g0 ? [g0] : [...V2_MODULES.map((m) => m.group), V3_OTHER_GROUP];
    for (const g of groups) {
      const m = moduleOf(g);
      if (m?.conditions?.length) for (const cd of m.conditions) scopes.push({ group: g, condition: cd.code });
      else scopes.push({ group: g, condition: null });
    }
  }
  return scopes.map((sc) => {
    const core: V2Values = { ...(a.core ?? {}), group: sc.group };
    const module: V2Values = confirmed ? { ...(a.module ?? {}) } : (sc.group === g0 ? { ...(a.module ?? {}) } : {});
    if (sc.condition) module.condition = sc.condition;
    for (const gi of GATE_INPUTS) {
      if (!scopeMatches(gi.scope, sc.group, sc.condition) || (only && gi.key !== only)) continue;
      const [part, k] = gi.key.split(".");
      const target = part === "core" ? core : module;
      if (isEmptyValue(target[k])) target[k] = gi.worst;
    }
    //  ما بعد استبدال الورك بلا تاريخ عمليةٍ مسجَّل ⟵ داخلَ الأسابيع الستّة (الأسوأ).
    if (sc.condition === "tha" && isEmptyValue(core.surgeryDate)) core.surgeryDate = today;
    return { ...a, core, module };
  });
}
function worstCaseExtra(a: PhysioExamV2, opts: { today: string }, realBanned: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  const confirmed = examGroupConfirmed(a);
  const union = new Set<string>();
  for (const x of worstCompletions(a, opts.today)) for (const d of rulesOf(x, opts)) if (!realBanned.has(d.deviceCode)) union.add(d.deviceCode);
  if (!union.size) return out;
  if (!confirmed) {
    //  المراجعة: اختار المجموعةَ ولم يختر حالتَها ⟵ يُقال «حالةُ «الكتف»» لا «المجموعةُ وحالتُها».
    const g0 = moduleOf(a.core?.group);
    union.forEach((d) => out.set(d, `${NOT_RECORDED_PREFIX}${g0 ? `حالةُ «${g0.ar}»` : "مجموعةُ التشخيص وحالتُها"}`));
    return out;
  }
  //  المجموعةُ مؤكَّدة: لكلّ جهازٍ أسماءُ المدخلات التي تمنعه بأسوأ قيمها.
  const c = examV2Ctx(a);
  for (const key of examGateInputsMissing(a)) {
    const label = fieldAt(key, c.group)?.ar ?? key;
    for (const x of worstCompletions(a, opts.today, key)) for (const d of rulesOf(x, opts)) {
      if (!union.has(d.deviceCode)) continue;
      const prev = out.get(d.deviceCode);
      out.set(d.deviceCode, prev ? (prev.includes(label) ? prev : `${prev}، ${label}`) : `${NOT_RECORDED_PREFIX}${label}`);
    }
  }
  //  ما بقي سببُه تاريخُ العملية (ما بعد استبدال الورك بلا تاريخٍ مسجَّل) — لا يُسأل بجواب: يصحّحه الفاحصُ في المعاينة.
  union.forEach((d) => { if (!out.has(d)) out.set(d, "ما بعد استبدال الورك بلا تاريخ عمليةٍ مسجَّل — صحّح العمليةَ وتاريخَها في المعاينة"); });
  return out;
}

/** **جسمُ القواعد** كما كان — يُقرأ على المعاينة الحقيقية وعلى كلّ إكمالٍ لمجهولها. */
function rulesOf(a: PhysioExamV2, opts: { today: string }): ForbiddenDevice[] {
  const core = a.core ?? {};
  const mod = a.module ?? {};
  const c = examV2Ctx(a);
  const reasons = new Map<string, string[]>();
  const block = (devices: string[], why: string) => {
    for (const d of devices) {
      const list = reasons.get(d) ?? [];
      if (!list.includes(why)) list.push(why);
      reasons.set(d, list);
    }
  };
  const has = (key: string, code: string) => Array.isArray(core[key]) && (core[key] as string[]).includes(code);
  const anyOf = (key: string, codes: string[]) => codes.some((x) => has(key, x));
  const flag = (k: string) => a.redFlags?.[k] === "yes";
  const ALL_ENERGY = ["electro", "megnatik", "laser", "tecar", "ultrasound", "traction", "shockwaves", "hot_pack", "wax", "infrared", "needle", "compression"];

  //  م.١ منظّمُ الضربات ومزيلُ الرجفان — CONTRA العامّ في ترحيل ١٣١، و١١٩ · ١٢٥ · ١٢٦ · ١٢٨ · ١٢٩ · ١٤٩ · ١٥١ · ١٧٤ · ١٨٤ · ١٣٧ · ١٧٩ · ١٨٢ · ١٨٣.
  if (anyOf("implants", ["pacemaker", "icd"])) block(["electro", "megnatik", "tecar", "shockwaves"], "منظّمُ ضرباتٍ أو مزيلُ رجفانٍ مزروع");
  //  م.٢ منبّهُ الدماغ العميق — ١٧٤ (Nutt 2001): كلُّ جهازٍ كهربائيّ أو حراريّ عميق.
  if (has("implants", "dbs")) block(["electro", "megnatik", "tecar", "ultrasound"], "منبّهُ دماغٍ عميق (DBS)");
  //  م.٣ صمّامُ التحويلة والمضخّة والقوقعة ومنبّهُ النخاع — ١٦٦ · ١٦٧ · ١٦٨ · ١١٩: المغناطيسُ إلّا بإذن الطبيب.
  if (anyOf("implants", ["shunt", "drug_pump", "cochlear", "spinal_stim"])) block(["megnatik"], "جهازٌ مزروع (صمّامُ تحويلة أو مضخّة أو قوقعة أو منبّهُ نخاع)");
  //  م.٣ب **وأيُّ جهازٍ مزروع يمنع الموجاتِ الصادمة** — CONTRA العامّ في ترحيل ١٣١ («a pacemaker or implanted device»)؛ والمنظّمُ والمزيلُ في م.١.
  if (Array.isArray(core.implants) && core.implants.some((x) => x !== "none" && x !== "pacemaker" && x !== "icd")) {
    block(["shockwaves"], "جهازٌ مزروع — مانعٌ عامّ في نشرة الموجات الصادمة");
  }
  //  م.٤ الحمل — ١١٩ · ١٢٤ · ١٢٨ · ١٤٩ · ١٤٥ · ١٥٥ · ١٥٦ · ١٦١؛ والتحفيزُ فوق البطن والحوض لمجموعة أسفل الظهر.
  if (core.pregnant === "yes") {
    block(["tecar", "megnatik", "shockwaves", "traction"], "حمل");
    if (c.group === "lumbar") block(["electro"], "حمل — لا تحفيزَ فوق البطن والحوض");
  }
  //  م.٥ مضادّاتُ التخثّر واضطرابُ النزف — كلُّ بروتوكولٍ فيه موجاتٌ صادمة أو إبر (CONTRA ١٣١). **والأسبرينُ وحده ليس منها**،
  //  **ولا قاعدةَ INR** (نقدُ التصميم §أ.٣: الكلمةُ ليست في أيّ ترحيل).
  if (anyOf("anticoagulant", ["warfarin", "doac", "antiplatelet", "bleeding_disorder"])) block(["shockwaves", "needle"], "مضادُّ تخثّرٍ أو اضطرابُ نزف");
  //  م.٦ الإحساس — أكثرُ موانع المكتبة تكراراً (أكثر من ٣٥ بروتوكولاً، و١٦٧ · ١٢٩ · ١٣٥): لا حرارةَ على جلدٍ لا يحسّ،
  //  والمعدومُ يمنع التحفيزَ على الجلد الذي لا يحسّ.
  if (a.sensation === "impaired" || a.sensation === "absent") {
    block(["hot_pack", "infrared", "wax", "tecar", "ultrasound", "shockwaves"], a.sensation === "absent" ? "الإحساسُ معدومٌ في المنطقة" : "الإحساسُ ضعيفٌ في المنطقة");
  }
  if (a.sensation === "absent") block(["electro"], "الإحساسُ معدومٌ في المنطقة");
  //  م.٧ لا يستطيع الإبلاغ عن الحرارة — ١٦٦ · ١٧٧ · ١٧٦ · ١٧٥ · ١٢٩ · ١٥٧ (والتحفيزُ يبدأ بأدنى شدّةٍ ولا يُمنع).
  if (core.canReportHeat === "no") block(["hot_pack", "wax", "infrared", "tecar"], "لا يستطيع أن يقول «حارّ» في وقته");
  //  م.٨ المعدن في الحقل — ١٣٨ · ١٤٠ · ١٥٩ · ١٦٢ · ١٢٦ · ١٥٦ · ١٣٧ · ١٦٧: لا تيكار؛ ولا أمواجَ فوق الإسمنت والبولي إيثيلين؛
  //  والتحفيزُ مسموحٌ إلّا فوق الأسلاك. (والمغناطيسُ والليزرُ مسموحان.)
  if (core.metalInField === "yes") {
    block(["tecar"], "معدنٌ في منطقة العلاج");
    if (has("metalTypes", "joint_replacement")) block(["ultrasound"], "مفصلٌ صناعيّ في منطقة العلاج");
    if (has("metalTypes", "wires_fixator")) block(["electro"], "أسلاكٌ أو مثبّتٌ خارجيّ في منطقة العلاج");
  }
  //  م.٩ الجلد — كلُّ بروتوكولٍ فيه جهاز، و١٣٦ · ١٣٨ · ١٥٩ · ١٤٠ · ١٥٨: الأقطابُ والحرارةُ والموجاتُ والإبرُ والضغطُ فوق الجرح؛
  //  والليزرُ فوق الجلد الملتهب.
  if (Array.isArray(core.skin) && core.skin.some((x) => x !== "none")) {
    block(["electro", "hot_pack", "infrared", "wax", "shockwaves", "needle", "compression"], "جرحٌ أو جلدٌ متضرّر في منطقة العلاج");
    if (has("skin", "dermatitis")) block(["laser"], "التهابٌ جلديّ في منطقة العلاج");
  }
  //  م.١٠ ورمٌ في منطقة العلاج — كلُّ البروتوكولات: كلُّ الأجهزة.
  if ((core.cancer === "past" || core.cancer === "current") && core.cancerInField === "yes") block(ALL_ENERGY, "ورمٌ في منطقة العلاج");
  //  م.١١ اشتباهُ خثرة — ١٣٨ · ١٤٠ · ١٥٩ · ١٥٨ · ١٣٦ · ١٧١ · ١٥٧.
  if (flag("dvt_pe")) block(["electro", "compression", "hot_pack", "megnatik", "shockwaves"], "اشتباهُ خثرة (علامةٌ حمراء)");
  //  م.١٢ عدوى أو التهابٌ حادّ أو مفصلٌ حارّ — ١٢٦ · ١٦٩ · ١٧٧ · ١٨٢ · ١٤٩ · ١٧٩ (النوبة) · ١٣٠.
  if (flag("infection")) block(["hot_pack", "infrared", "wax", "tecar", "ultrasound", "shockwaves"], "اشتباهُ عدوى (علامةٌ حمراء)");
  if (c.condition === "calcific" && mod.acuteAttack === "yes") block(["hot_pack", "infrared", "wax", "tecar", "ultrasound", "shockwaves"], "نوبةٌ تكلّسيّة حادّة");
  //  م.١٣ حقنةُ الكورتيزون — المدّةُ المؤكَّدة في ثلاثة وحدها (نقدُ التصميم §د.٢٢): ١٥٢ ستّة أسابيع · ١٨٠ أربعة · ١٧٩ ثلاثة أشهر.
  if (core.steroidInjection === "yes") {
    const days = daysSince(core.steroidInjectionDate, opts.today);
    const windowDays = c.condition === "lateral_elbow" ? 42 : c.condition === "achilles" ? 28 : c.condition === "calcific" ? 90 : null;
    if (days !== null && windowDays !== null && days < windowDays) block(["shockwaves"], `حقنةُ كورتيزون قبل ${arDigits(days)} يوماً (المهلةُ ${arDigits(windowDays)} يوماً)`);
    //  **وبلا مهلةٍ مكتوبة لهذه الحالة ⟵ موضعُ الحقنة مانعٌ** كما في CONTRA العامّ لترحيل ١٣١ («a site of corticosteroid injection») — لا مهلةَ تُخترع.
    //  §4.hd — وفي الثالثة بلا مجموعةٍ مؤكَّدة: لا تُعرف الحالةُ فلا تُعرف المهلة ⟵ «لم يُسجَّل بعد» (تأكيدُها يحسمه).
    if (windowDays === null) block(["shockwaves"], c.ruleset === "v3" && !examGroupConfirmed(a)
      ? `${NOT_RECORDED_PREFIX}${moduleOf(c.group) ? `حالةُ «${moduleOf(c.group)!.ar}»` : "مجموعةُ التشخيص وحالتُها"} (مهلةُ حقنة الكورتيزون بحسب الحالة)`
      : "موضعُ حقنة كورتيزون — مانعٌ عامّ في نشرة الموجات الصادمة، ولا مهلةَ مكتوبةً لهذه الحالة");
  }
  //  م.١٤ صفائحُ النموّ المفتوحة — ١٧٧ · ١٧٦ · ١٦٦ · ١٨٠ وCONTRA العامّ. واستثناءُ المراهق في آخر نموّه «بقرار» فلا تملكه القاعدةُ الحتمية.
  if (c.ageYears !== null && c.ageYears < 18) block(["shockwaves", "ultrasound", "laser"], "صفائحُ نموٍّ مفتوحة (دون ١٨ سنة)");
  //  م.١٥ الهشاشة وكسرُ الفقرة والعمودُ الملتحم — ١١٩ · ١٢٤ · ١٢٥ · ١٦٨ · ١٧٣ · ١٦٩ · ١٥٣ · ١٦٧: لا شدّ.
  if (Array.isArray(core.boneHealth) && core.boneHealth.some((x) => x !== "none")) block(["traction"], "هشاشةُ عظامٍ أو كورتيزونٌ فمويّ طويل الأمد");
  if (mod.boneStatus === "vertebral_fracture") block(["traction"], "كسرٌ سابق في فقرة");
  if (mod.fusedSpine === "yes") block(["traction"], "عمودٌ ملتحم");
  //  م.١٦ ذيلُ الفرس والضعفُ المتزايد واعتلالُ النخاع والأعراضُ في الجانبين — ١٤٥ · ١٥٣ · ١٥١ · ١٢٥: لا شدّ.
  if (flag("cauda_equina") || flag("progressive_weakness") || flag("myelopathy")) block(["traction"], "علامةٌ عصبية حمراء");
  if (core.side === "both" && (c.group === "lumbar" || c.group === "neck")) block(["traction"], "أعراضٌ في الجانبين");
  //  م.١٧ الروماتويديّ والمفاصلُ اليفعية (عدمُ ثبات C1-C2) — ١٦٩ · ١٧٧ · ١٢٥: لا شدَّ للرقبة.
  if (c.condition === "ra" || c.condition === "jia") block(["traction"], "خطرُ عدم ثبات الفقرتين العنقيتين الأوليين");
  //  م.١٨ شريانُ الساق الضعيف — ١٧١: لا ضمادَ ولا ضغطَ للساق تحت ٠٫٦ (وتحت ٠٫٥ مطلقاً).
  if (mod.limb === "leg" && typeof mod.abi === "number" && mod.abi < 0.6) block(["compression"], `مؤشّرُ الكاحل-العضد ${mod.abi}`);
  //  م.١٩ قصورُ القلب الرابع — ١٧١ (والثالثُ بإذن الطبيب فلا يُمنع هنا).
  if (mod.heartFailure === "IV") block(["compression"], "قصورُ قلبٍ من الدرجة الرابعة");
  //  م.٢٠ التصلّبُ اللويحيّ مع حساسية الحرارة — ١٨٤.
  if (c.condition === "ms" && mod.heatSensitive === "yes") block(["hot_pack", "wax", "infrared", "tecar", "ultrasound"], "حساسيةٌ للحرارة مع التصلّب اللويحيّ");
  //  م.٢١ عينٌ لا تُغلق — ١٦٣: لا أشعّةَ تحت الحمراء ولا شمع، ولا حرارةَ قرب العين.
  if (c.condition === "bells" && mod.eyeCloses === "no") block(["infrared", "wax", "hot_pack"], "العينُ لا تُغلق");
  //  م.٢٢ المرحلةُ الحادّة أو التهيّجُ العالي — ١٢٤ · ١٢٥ · ١٣٠ · ١٧٩ · ١٤٩ · ١٤٥ · ١٥١: لا شدَّ ولا موجاتٍ صادمة ولا تيكارَ حراريّ؛
  //  والإبرُ لا في الأيام الأولى.
  if (core.irritability === "high") block(["traction", "shockwaves", "tecar"], "تهيّجٌ عالٍ");
  const acuity = examV2Acuity(core, opts.today);
  if (acuity?.code === "acute") block(["traction", "shockwaves"], "المرحلةُ الحادّة (أقلّ من ٦ أسابيع)");
  const onsetDays = daysSince(core.onsetDate, opts.today);
  if (core.onsetKind === "date" && onsetDays !== null && onsetDays >= 0 && onsetDays <= 7) block(["needle"], "الأيامُ الأولى بعد الإصابة");
  //  م.٢٣ الروبوتُ لمن يمشي — **للجلطة وحدها** (١٢٩ و١٥٧: «للعاجز عن المشي»)؛ وفي الحبل الشوكيّ والتصلّب بقاعدة البروتوكول نفسِه (نقدُ التصميم §أ.٥).
  if (c.condition === "stroke" && typeof core.fac === "string" && Number(core.fac) >= 3) block(["robotik"], `يمشي (FAC ${core.fac}) — الروبوتُ للعاجز عن المشي في الجلطة`);
  //  م.٢٤ الوترُ الارتكازيّ في العرقوب — ١٨٠: الموجاتُ لمنتصف الوتر وحده، والتمزّقُ السابق يمنعها (نقدُ التصميم §ب.١٠).
  if (c.condition === "achilles" && mod.tendonType === "insertional") block(["shockwaves"], "اعتلالٌ ارتكازيّ في وتر العرقوب");
  if (c.condition === "achilles" && mod.priorRupture === "yes") block(["shockwaves"], "تمزّقٌ أو جراحةٌ سابقة في وتر العرقوب");
  //  م.٢٥ ما بعد استبدال الورك — ١٤٠: لا شدّ، ولا إبرَ حول الورك، ولا موجاتٍ قرب المفصل، ولا كمادةً على الورك في الأسابيع الستّة الأولى.
  if (c.condition === "tha") {
    block(["traction", "needle", "shockwaves"], "ما بعد استبدال الورك");
    const d = daysSince(core.surgeryDate, opts.today);
    if (d !== null && d < 42) block(["hot_pack"], "الأسابيعُ الستّة الأولى بعد استبدال الورك");
  }
  //  م.٢٦ ما قبل الأسبوع الثاني عشر بعد إصلاح الكفّة، أو تمزّقٌ هائل، أو إصلاحُ تحت الكتف — ١٧٨.
  if (c.condition === "cuff_repair") {
    const d = daysSince(core.surgeryDate, opts.today);
    if (d === null || d < 84) block(["shockwaves"], "قبل الأسبوع الثاني عشر بعد إصلاح الكفّة");
    if (mod.tearSize === "massive") block(["shockwaves"], "تمزّقٌ هائل في الكفّة");
    if (mod.subscapRepair === "yes") block(["shockwaves"], "إصلاحُ وتر تحت الكتف");
  }
  //  م.٢٧ الصرعُ غيرُ المضبوط — ١٤٩ و١٥٧ («uncontrolled epilepsy as a caution with stimulation») و١٧٦: التحفيزُ بإذن الطبيب.
  if (core.epilepsy === "uncontrolled") block(["electro"], "صرعٌ غيرُ مضبوط — التحفيزُ بإذن الطبيب");

  return DEVICE_ORDER.filter((d) => reasons.has(d)).map((d) => ({ deviceCode: d, reasonAr: reasons.get(d)!.join("؛ ") }));
}

// ══ القراءة: الملخّصُ والنصُّ الإنجليزيّ ═══════════════════════════════════════════════════════════════════
const valueText = (f: V2Field, v: V2Value, lang: "ar" | "en"): string => {
  if (isEmptyValue(v)) return "";
  if (f.kind === "choice" || f.kind === "yesno") return optLabel(f.options ?? [], v as string, lang) || String(v);
  if (f.kind === "multi") return (v as string[]).map((x) => optLabel(f.options ?? [], x, lang) || x).join(lang === "ar" ? "، " : ", ");
  const unit = lang === "ar" ? f.unit : f.unitEn;
  //  الأرقامُ بالعربية في النصّ العربيّ (والتاريخُ كما هو — لا ينقلب ترتيبُه).
  const n = lang === "ar" && (f.kind === "int" || f.kind === "num") ? arDigits(String(v).replace(".", "٫")) : String(v);
  //  «٥/١٠» كتلةٌ رقميةٌ واحدة (بلا فراغ) فلا ينقلب ترتيبُها في السطر العربيّ.
  return `${n}${unit ? (unit.startsWith("/") ? unit : ` ${unit}`) : ""}`;
};
export const examV2ValueText = valueText;

/** **السطرُ المختصر** — «أسفل الظهر · ألمُ ظهرٍ غير نوعيّ · مزمن (أكثر من ١٢ أسبوعاً) · الألم ٥/٨ من ١٠ · علاماتٌ حمراء: ٢». */
export function examV2SummaryAr(a: PhysioExamV2, opts: { today?: string; diagnosis?: unknown } = {}): string {
  const m = moduleOf(a.core?.group);
  const cond = conditionOf(a.core?.group, a.module?.condition);
  const parts: string[] = [];
  //  §4.hd — بلا مجموعةٍ يبدأ السطرُ بالتشخيص الحرّ (ثمانون حرفاً).
  if (!m && examRuleset(a) === "v3" && typeof opts.diagnosis === "string" && opts.diagnosis.trim()) {
    const d = opts.diagnosis.trim();
    parts.push(d.length > 80 ? `${d.slice(0, 80)}…` : d);
  }
  if (m) parts.push(m.ar);
  if (cond) parts.push(cond.ar);
  //  الحدّةُ المشتقّة من تاريخ البدء (لا تُكتب في اسم الحالة).
  const acuity = opts.today ? examV2Acuity(a.core ?? {}, opts.today) : null;
  if (acuity) parts.push(acuity.ar);
  if (typeof a.core?.painNow === "number") {
    parts.push(`الألم ${arDigits(a.core.painNow)}/${typeof a.core.painWorstWeek === "number" ? arDigits(a.core.painWorstWeek) : "—"} من ١٠`);
  }
  if (a.sensation) parts.push(`الإحساس ${optLabel(PT_SENSATION, a.sensation, "ar")}`);
  const hits = redFlagsOf(a).length;
  parts.push(hits ? `علاماتٌ حمراء: ${arDigits(hits)}` : "بلا علاماتٍ حمراء");
  return parts.join(" · ");
}

/**
 * **الاستمارةُ الثانية نصّاً إنجليزياً** — كلُّ خانةٍ فيها (النواةُ ووحدةُ المجموعة والعلاماتُ الحمراء بجواب كلٍّ منها والموانعُ الحتمية)
 * ثمّ أقسامُ الأولى المُعادة بنصّها. **بلا اسمٍ ولا هاتفٍ ولا رمز**: لا شيءَ هنا يعرّف المريض.
 */
export function examV2EnglishText(a: PhysioExamV2, opts: { today: string }): string {
  const v3 = examRuleset(a) === "v3";
  const lines: string[] = [v3
    ? `Form ${PT_FORM_CODE_V2} v3 (free-text diagnosis + mandatory safety sheet; every other field is optional — "NOT RECORDED" means not assessed, never normal)`
    : `Form ${PT_FORM_CODE_V2} (mandatory structured physiotherapy exam)`];
  const c = examV2Ctx(a);
  const m = moduleOf(c.group);
  const askKeys = new Set(v3 ? [...examMustAskBeforePlan(a), ...examCautionInputsMissing(a, { deviceCodes: ["needle"], protocolCode: HIGH_INTENSITY_PROTOCOLS[0] })] : []);
  const src = (key: string) => {
    const s = a.fieldSources?.[key];
    return s ? ` (added by an answer to Bionic AI, exam version ${s["version"]})` : "";
  };
  if (v3 && !examGroupConfirmed(a)) lines.push("Diagnosis group: NOT CONFIRMED");
  for (const f of coreFieldsFor(examRuleset(a))) {
    if (!applies(f, c)) continue;
    const t = valueText(f, c.core[f.key] ?? null, "en");
    if (v3 && !t && ((!askKeys.has(`core.${f.key}`) && !isRequired(f, c)) || f.key === "group")) continue;
    lines.push(`${f.en}: ${t || (v3 ? "NOT RECORDED" : "—")}${src(`core.${f.key}`)}`);
    if (f.key === "onsetDate") {
      const acuity = examV2Acuity(c.core, opts.today);
      if (acuity) lines.push(`Derived acuity: ${acuity.en}`);
    }
  }
  if (m) {
    lines.push(`Module — ${m.en}:`);
    for (const f of moduleFieldsOf(c.group)) {
      if (!applies(f, c)) continue;
      const t = valueText(f, c.module[f.key] ?? null, "en");
      if (v3 && !t && !askKeys.has(`module.${f.key}`)) continue;
      lines.push(`  ${f.en}: ${t || (v3 ? "NOT RECORDED" : "—")}${src(`module.${f.key}`)}`);
    }
    const cond = conditionOf(c.group, c.condition);
    if (cond) lines.push(`  Library protocols for this condition: ${cond.protocols.join(", ")}`);
    else lines.push(`  Library protocols for this group: ${m.protocols.join(", ")}`);
  }
  lines.push(v3 ? "Red flags (general ones and the diagnosis group's ones are mandatory; other groups' flags only if the examiner ticked them):" : "Red flags (every question answered):");
  for (const q of redFlagsAnsweredOfExam(a)) {
    const ans = a.redFlags?.[q.key];
    lines.push(`  [${ans === "yes" ? "YES" : ans === "no" ? "no" : "unanswered"}] ${q.key}${ans === "yes" ? ` — urgency ${q.urgency}` : ""}`);
  }
  const fd = forbiddenDevices(a, opts);
  lines.push(fd.length
    ? `Deterministic contraindications (devices that must not be used): ${fd.map((x) => `${x.deviceCode} (${x.reasonAr})`).join("; ")}`
    : "Deterministic contraindications: none");
  if (fd.some((x) => isNotRecordedReason(x.reasonAr))) lines.push("Some contraindications above are worst-case bans for facts NOT RECORDED yet; they shorten once the examiner records them.");
  const v1 = assessmentAsEnglishText(a);
  if (v1) lines.push(v1);
  return lines.join("\n");
}

// ══ قارئٌ واحد للاستمارتين ══════════════════════════════════════════════════════════════════════════
/** **النصُّ الإنجليزيّ لأيّ استمارة** — الثانيةُ كلُّها، والأولى كما كانت. */
export function anyAssessmentEnglishText(a: PhysioInitialAssessment | null, opts: { today: string }): string | null {
  if (!a) return null;
  return isExamV2(a) ? examV2EnglishText(a, opts) : assessmentAsEnglishText(a);
}
/** **السطرُ العربيّ لأيّ استمارة** (وبـ`today` تُذكر حدّةُ الثانية المشتقّة). */
export function anyAssessmentSummaryAr(a: PhysioInitialAssessment | null, opts: { today?: string; diagnosis?: unknown } = {}): string | null {
  if (!a) return null;
  return isExamV2(a) ? examV2SummaryAr(a, opts) : assessmentSummaryAr(a);
}
/** **ما ينقص أيَّ استمارة** — الثانيةُ إلزامُها، والأولى تنبيهُها (لا إلزامَ فيها). */
export function anyAssessmentGapsText(a: PhysioInitialAssessment | null, diagnosis?: unknown): string | null {
  if (!a) return null;
  if (isExamV2(a)) return examV2MissingText(examV2Missing(a, diagnosis), a.core?.group);
  return assessmentGapsText(assessmentGaps(a, diagnosis));
}
/** **أسوأُ الألم** — «الأسوأُ في الأسبوع» في الثانية، و«في أسوأ حالاته» في الأولى. */
export function assessmentPainWorst(a: PhysioInitialAssessment | null): number | null {
  if (!a) return null;
  if (isExamV2(a)) return typeof a.core?.painWorstWeek === "number" ? a.core.painWorstWeek : null;
  return a.painWorst;
}
/** رمزُ الاستمارة وإصدارُها للعرض («BC-PT-02 · v2»). */
export const assessmentFormLabel = (a: PhysioInitialAssessment | null): string =>
  isExamV2(a) ? `${PT_FORM_CODE_V2} · v${examRuleset(a) === "v3" ? PT_FORM_VERSION_V3 : PT_FORM_VERSION_V2}` : `${PT_FORM_CODE} · v1`;

// ══ بوّابةُ الوكيل (قرارُ المالك ٢٠٢٦-١١-٢٧، §4.gz) ════════════════════════════════════════════════════════════
export type RedFlagReviewStatus = "pending" | "approved" | "rejected";
export interface RedFlagReviewSummary {
  id: number;
  status: RedFlagReviewStatus;
  flags: { key: string; questionAr: string; actionAr: string; urgency: string }[];
  /** ملاحظةُ مَن أرسلها للاعتماد — و`null` في قرار معتمِدٍ مباشرٍ على معاينة غيره (لا يكتب «ملاحظة الفاحص» عن غيره). */
  examinerNote: string | null;
  decisionNote: string | null;
  /** مَن أرسلها (أو قرّرها مباشرةً) — به يُعرف أهو الفاحصُ نفسُه. */
  requestedById: number | null;
  requestedByName: string | null;
  requestedAt: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
}
export type AgentGateCode =
  | "exam_cancelled" | "not_v2" | "incomplete" | "clear" | "red_flag_unreviewed" | "red_flag_pending" | "red_flag_rejected" | "red_flag_changed"
  | "red_flag_other_exam" | "red_flag_approved";
export interface AgentGate { allowed: boolean; code: AgentGateCode; reason: string }
/** آخرُ طلبٍ على **معاينةٍ أخرى** للمريض نفسِه — حين يكون هو الأحدثَ في ملفّه (`newestOtherExamReview`). */
export interface OtherExamReview { examId: number; status: RedFlagReviewStatus }

/**
 * **الرفضُ والانتظارُ على مستوى المريض** (مراجعةُ المرحلة الأولى): معاينةٌ جديدة كلُّ أجوبتها «لا» لا تتجاوز رفضاً أو طلباً معلَّقاً
 * على معاينةٍ سابقة. والحاكمُ الطلبُ **الأحدث** (بالرقم) بين معايناته الحيّة: إن كان على معاينةٍ أخرى وهو معلَّقٌ أو مرفوض وقفت البوّابة،
 * ولا يرفعه إلّا معتمِد (يعيد اعتمادَها، أو يعتمد علاماتِ المعاينة الجديدة بعده). `reviews`: آخرُ طلبٍ لكلّ معاينةٍ حيّة.
 */
export function newestOtherExamReview(reviews: ReadonlyMap<number, RedFlagReviewSummary>, examId: number): OtherExamReview | null {
  let bestExam = 0;
  let best: RedFlagReviewSummary | null = null as RedFlagReviewSummary | null;
  reviews.forEach((r, id) => { if (!best || r.id > best.id) { best = r; bestExam = id; } });
  if (!best || bestExam === examId || best.status === "approved") return null;
  return { examId: bestExam, status: best.status };
}

/**
 * **هل يعمل الوكيلُ على هذه المعاينة؟** — قاعدةٌ صرفة بلا قاعدة بيانات (تقرؤها `examAgentGate` في الخادم والمراحلُ اللاحقة):
 * نعم حين تكون الثانيةَ كاملةً **و** (بلا علامةٍ حمراء **أو** آخرُ طلبٍ معتمَدٌ يغطّي كلَّ علامةٍ «نعم» الآن). والمرفوضُ يوقفها حتى يطلب معتمِد.
 * **والمعلَّقُ والمرفوضُ يوقفانها قبل النظر في الأجوبة** (مراجعةُ المرحلة الأولى): تنقيحٌ يقلب «نعم» إلى «لا» أو يبدّل المجموعة لا يفتحها —
 * القرارُ للمعتمِد وحده. وكذلك طلبٌ معلَّقٌ أو مرفوضٌ على معاينةٍ أخرى للمريض هو الأحدثُ في ملفّه (`otherExamReview`).
 */
export function agentGateFor(input: {
  assessment: unknown; diagnosis: unknown; cancelled: boolean; review: RedFlagReviewSummary | null; otherExamReview?: OtherExamReview | null;
}): AgentGate {
  const g = (allowed: boolean, code: AgentGateCode, reason: string): AgentGate => ({ allowed, code, reason });
  if (input.cancelled) return g(false, "exam_cancelled", "المعاينةُ ملغاة");
  if (!isExamV2(input.assessment)) return g(false, "not_v2", `المعاينةُ ليست على الاستمارة الإلزامية ${PT_FORM_CODE_V2}`);
  const missing = examV2Missing(input.assessment, input.diagnosis);
  if (missing.length) return g(false, "incomplete", examV2MissingText(missing, input.assessment.core?.group) ?? "المعاينةُ ناقصة");
  const r = input.review;
  if (r?.status === "pending") return g(false, "red_flag_pending", "علامةٌ حمراء تنتظر اعتمادَ المسؤول أو المشرف العام");
  if (r?.status === "rejected") return g(false, "red_flag_rejected", "رُفضت العلامةُ الحمراء — تتوقّف المعاينةُ والإحالةُ قائمة، ولا تعود إلّا بمعتمِد");
  const o = input.otherExamReview ?? null;
  if (o && (o.status === "pending" || o.status === "rejected")) {
    return g(false, "red_flag_other_exam", o.status === "pending"
      ? "علامةٌ حمراء في معاينةٍ سابقة لهذا المريض تنتظر الاعتماد"
      : "رُفضت علامةٌ حمراء في معاينةٍ سابقة لهذا المريض — لا يعود إلّا بمعتمِد");
  }
  const hits = redFlagsOf(input.assessment);
  if (hits.length === 0) return g(true, "clear", "بلا علاماتٍ حمراء");
  if (!r) return g(false, "red_flag_unreviewed", "علامةٌ حمراء لم تُرسَل للاعتماد بعد");
  const covered = new Set(r.flags.map((f) => f.key));
  if (hits.some((h) => !covered.has(h.key))) return g(false, "red_flag_changed", "تغيّرت العلاماتُ الحمراء بعد الاعتماد — تحتاج اعتماداً جديداً");
  return g(true, "red_flag_approved", `اعتُمدت العلامةُ الحمراء بملاحظة: ${r.decisionNote ?? ""}`);
}
