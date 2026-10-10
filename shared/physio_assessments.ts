// **إعادةُ التقييم وتقاريرُ النتائج** (ترحيل ١١٣، §4.cp — المرحلةُ السادسة من خطّة العلاج الطبيعي، ٢٠٢٦-١٠-٠٨).
//
// قراراتُ المالك (الخمسُ «توصيتك»):
//   ١. **مقاييسُ رقمية ثابتة لكلّ بروتوكول** — من حقل «التقييم» المكتوب فيها، مسوّداتٌ يعتمدها المشرفُ العام أو المسؤول **اعتماداً مستقلّاً عن البروتوكول**،
//      ومعها مقياسان لكلّ مريض: **الألمُ ٠–١٠** و**تحقّقُ أهداف الخطّة**.
//   ٢. **تقييمٌ أوّليّ عند الاعتماد، ثمّ كلَّ أربعة أسابيع، وآخرُ عند نهاية مدّة الخطّة** — «مستحقّ التقييم» للأخصائيّ وتنبيهٌ صباحيّ،
//      **ولا تتوقّف الجلساتُ إن تأخّر** (تنبيهٌ لا قيد).
//   ٣. **يقيّم كاتبو الخطط وحدهم** (الأخصائيّ · المشرف العام · المسؤول)، والمنفّذون يرون ولا يكتبون.
//   ٤. **حالةٌ جديدة للخطّة «تخرّج»** — منفصلةٌ عن «موقوفة»، كي تفرّق التقاريرُ بين مَن أنهى علاجَه متحسّناً ومَن انقطع.
//   ٥. التقاريرُ للمسؤول والمشرف العام لكلّ الفروع، ولمدير الفرع لفرعه، وللأخصائيّ لمرضاه (المرحلةُ ٦ب).
import { canApprovePlans, canWritePlans } from "./physio_plans";
import { canEditProtocols, type ProtocolSessionLike } from "./physio_protocols";
import { hasRole } from "./user_roles";

export const canAssessPlans = (s: ProtocolSessionLike | null | undefined): boolean => canWritePlans(s);
//  مقاييسُ البروتوكول جزءٌ منه — فتعديلُها دائمٌ للمشرف العام والمسؤول وحدهما (§4.dd).
export const canEditMeasures = (s: ProtocolSessionLike | null | undefined): boolean => canEditProtocols(s);
export const canApproveMeasures = (s: ProtocolSessionLike | null | undefined): boolean => canApprovePlans(s);

export interface MeasureDef {
  code: string; nameAr: string; nameEn: string; unitAr: string | null; unitEn: string | null;
  min: number; max: number; higherIsBetter: boolean;
}

/** **الألم ٠–١٠** — لكلّ مريضٍ مهما كان بروتوكولُه (القرار ١). يُخزَّن عموداً لا سطراً في المقاييس. */
export const PAIN_MEASURE: MeasureDef = {
  code: "pain_nprs", nameAr: "شدّة الألم (NPRS)", nameEn: "Pain (NPRS)", unitAr: "من ١٠", unitEn: "/10", min: 0, max: 10, higherIsBetter: false,
};
/** **تحقّقُ أهداف الخطّة** — نسبةٌ تُحسب من أهدافها: لم يتحقّق ٠ · جزئياً ١ · تحقّق ٢. */
export const GOALS_MEASURE: MeasureDef = {
  code: "goals_pct", nameAr: "تحقّق أهداف الخطّة", nameEn: "Plan goals attained", unitAr: "%", unitEn: "%", min: 0, max: 100, higherIsBetter: true,
};

type Row = [nameAr: string, nameEn: string, unitAr: string | null, unitEn: string | null, min: number, max: number, higherIsBetter: boolean];
const C: Record<string, Row> = {
  odi: ["مؤشر أوزوستري للإعاقة (ODI)", "Oswestry Disability Index (ODI)", "%", "%", 0, 100, false],
  ndi: ["مؤشر إعاقة الرقبة (NDI)", "Neck Disability Index (NDI)", "من ٥٠", "/50", 0, 50, false],
  tsk: ["الخوف من الحركة — تامبا (TSK-17)", "Tampa Scale of Kinesiophobia (TSK-17)", null, null, 17, 68, false],
  slr: ["زاوية رفع الساق المستقيمة (SLR)", "Straight leg raise angle (SLR)", "درجة", "°", 0, 90, true],
  fingertip_floor: ["مسافة الأصابع عن الأرض عند الانحناء", "Fingertip-to-floor distance", "سم", "cm", 0, 60, false],
  walk_distance: ["مسافة المشي حتى ظهور الأعراض", "Walking distance to symptom onset", "متر", "m", 0, 5000, true],
  six_mwt: ["المشي ٦ دقائق (6MWT)", "6-minute walk test (6MWT)", "متر", "m", 0, 1000, true],
  berg: ["مقياس بيرغ للتوازن (Berg)", "Berg Balance Scale", "من ٥٦", "/56", 0, 56, true],
  tug: ["النهوض والمشي (TUG)", "Timed Up and Go (TUG)", "ثانية", "s", 0, 120, false],
  cervical_rotation: ["دوران الرقبة — الجهة الأضعف", "Cervical rotation — weaker side", "درجة", "°", 0, 90, true],
  cobb: ["زاوية كوب (Cobb)", "Cobb angle", "درجة", "°", 0, 90, false],
  atr: ["دوران الجذع بمقياس الانحناء (Scoliometer ATR)", "Angle of trunk rotation (scoliometer)", "درجة", "°", 0, 30, false],
  spadi: ["ألم الكتف وإعاقته (SPADI)", "Shoulder Pain and Disability Index (SPADI)", "من ١٠٠", "/100", 0, 100, false],
  dash: ["إعاقة الذراع والكتف واليد (DASH)", "Disabilities of the Arm, Shoulder and Hand (DASH)", "من ١٠٠", "/100", 0, 100, false],
  shoulder_flexion: ["عطف الكتف الفعّال", "Active shoulder flexion", "درجة", "°", 0, 180, true],
  shoulder_er: ["الدوران الخارجي للكتف", "Shoulder external rotation", "درجة", "°", 0, 90, true],
  constant: ["مقياس كونستانت للكتف (Constant)", "Constant-Murley score", "من ١٠٠", "/100", 0, 100, true],
  ases: ["مقياس ASES للكتف", "ASES shoulder score", "من ١٠٠", "/100", 0, 100, true],
  prtee: ["تقييم المريض لمرفق التنس (PRTEE)", "Patient-Rated Tennis Elbow Evaluation (PRTEE)", "من ١٠٠", "/100", 0, 100, false],
  grip_painfree: ["قوّة القبضة بلا ألم", "Pain-free grip strength", "كغ", "kg", 0, 80, true],
  grip: ["قوّة القبضة", "Grip strength", "كغ", "kg", 0, 80, true],
  bctq_sss: ["شدّة أعراض النفق الرسغي (Boston SSS)", "Boston CTQ — symptom severity", "١–٥", "1–5", 1, 5, false],
  bctq_fss: ["الحالة الوظيفية للنفق الرسغي (Boston FSS)", "Boston CTQ — functional status", "١–٥", "1–5", 1, 5, false],
  fihoa: ["مؤشر خشونة اليد (FIHOA)", "Functional Index for Hand OA (FIHOA)", "من ٣٠", "/30", 0, 30, false],
  koos: ["نتائج الركبة (KOOS)", "Knee injury and OA Outcome Score (KOOS)", "من ١٠٠", "/100", 0, 100, true],
  koos_jr: ["نتائج الركبة المختصر (KOOS-JR)", "KOOS-JR", "من ١٠٠", "/100", 0, 100, true],
  hoos: ["نتائج الورك (HOOS)", "Hip disability and OA Outcome Score (HOOS)", "من ١٠٠", "/100", 0, 100, true],
  hoos_jr: ["نتائج الورك المختصر (HOOS-JR)", "HOOS-JR", "من ١٠٠", "/100", 0, 100, true],
  chair_stand_30: ["الجلوس والوقوف ٣٠ ثانية", "30-second chair stand", "مرّة", "reps", 0, 40, true],
  hip_ir: ["الدوران الداخلي للورك", "Hip internal rotation", "درجة", "°", 0, 45, true],
  hip_ext: ["بسط الورك (سالبٌ مع التقفّع)", "Hip extension (negative with contracture)", "درجة", "°", -30, 30, true],
  kujala: ["مقياس كوجالا للرضفة (Kujala)", "Kujala Anterior Knee Pain Scale", "من ١٠٠", "/100", 0, 100, true],
  visa_a: ["استبيان وتر أخيل (VISA-A)", "VISA-A", "من ١٠٠", "/100", 0, 100, true],
  heel_raise: ["رفع الكعب المتكرّر", "Repeated single-leg heel raise", "مرّة", "reps", 0, 50, true],
  faam_adl: ["قدرة القدم والكاحل (FAAM-ADL)", "Foot and Ankle Ability Measure (FAAM-ADL)", "%", "%", 0, 100, true],
  ankle_df: ["عطف الكاحل الظهري (سالبٌ مع التقفّع)", "Ankle dorsiflexion (negative with contracture)", "درجة", "°", -30, 30, true],
  ybalance: ["اختبار التوازن Y — المركّب", "Y-balance composite", "%", "%", 0, 150, true],
  ikdc: ["مقياس IKDC للركبة", "IKDC subjective knee form", "من ١٠٠", "/100", 0, 100, true],
  knee_flexion: ["عطف الركبة", "Knee flexion", "درجة", "°", 0, 150, true],
  knee_ext_deficit: ["نقص بسط الركبة", "Knee extension deficit", "درجة", "°", 0, 30, false],
  quad_lsi: ["قوّة الرباعية مقارنةً بالسليمة (LSI)", "Quadriceps strength — limb symmetry (LSI)", "%", "%", 0, 150, true],
  prwe: ["تقييم المريض للرسغ (PRWE)", "Patient-Rated Wrist Evaluation (PRWE)", "من ١٠٠", "/100", 0, 100, false],
  wrist_ext: ["بسط الرسغ", "Wrist extension", "درجة", "°", 0, 80, true],
  fugl_meyer_ue: ["فوغل-ماير للطرف العلوي (FMA-UE)", "Fugl-Meyer — upper extremity", "من ٦٦", "/66", 0, 66, true],
  ten_mwt: ["سرعة المشي ١٠ أمتار (10MWT)", "10-metre walk test speed", "م/ث", "m/s", 0, 3, true],
  barthel: ["مؤشر بارثيل للأنشطة اليومية", "Barthel Index", "من ١٠٠", "/100", 0, 100, true],
  mas: ["التشنّج — أشوورث المعدّل (MAS) للعضلة الرئيسية", "Modified Ashworth Scale — key muscle", "٠–٤", "0–4", 0, 4, false],
  wisci: ["مؤشر المشي لإصابات النخاع (WISCI II)", "WISCI II", "من ٢٠", "/20", 0, 20, true],
  scim: ["الاستقلال لإصابات النخاع (SCIM)", "Spinal Cord Independence Measure (SCIM)", "من ١٠٠", "/100", 0, 100, true],
  updrs3: ["الفحص الحركي لباركنسون (MDS-UPDRS III)", "MDS-UPDRS part III", "من ١٣٢", "/132", 0, 132, false],
  mini_bestest: ["اختبار التوازن (Mini-BESTest)", "Mini-BESTest", "من ٢٨", "/28", 0, 28, true],
  t25fw: ["المشي ٢٥ قدماً (T25FW)", "Timed 25-Foot Walk", "ثانية", "s", 0, 180, false],
  mfis: ["أثر التعب (MFIS)", "Modified Fatigue Impact Scale (MFIS)", "من ٨٤", "/84", 0, 84, false],
  house_brackmann: ["درجة هاوس-براكمان (House-Brackmann)", "House-Brackmann grade", "١–٦", "I–VI", 1, 6, false],
  sunnybrook: ["مقياس سنيبروك للوجه (Sunnybrook)", "Sunnybrook Facial Grading", "من ١٠٠", "/100", 0, 100, true],
  gmfm66: ["الحركة الوظيفية الكبرى (GMFM-66)", "Gross Motor Function Measure (GMFM-66)", "من ١٠٠", "/100", 0, 100, true],
  ams_elbow: ["الحركة الفعّالة — عطف المرفق (AMS)", "Active Movement Scale — elbow flexion", "٠–٧", "0–7", 0, 7, true],
  mallet: ["مقياس مالِت المجمَّع (Mallet)", "Aggregate Mallet score", "٥–٢٥", "5–25", 5, 25, true],
  cervical_rotation_affected: ["دوران الرقبة نحو الجهة المصابة", "Cervical rotation toward affected side", "درجة", "°", 0, 110, true],
  cervical_lateral_flexion: ["الميل الجانبي للرقبة", "Cervical lateral flexion", "درجة", "°", 0, 70, true],
  mfs: ["مقياس وظيفة العضلة (MFS)", "Muscle Function Scale", "٠–٥", "0–5", 0, 5, true],
  stump_circ: ["محيط الطرف المتبقّي", "Residual limb circumference", "سم", "cm", 10, 100, false],
  ampnopro: ["مؤشر الحركة للمبتورين بلا طرف (AMPnoPRO)", "AMPnoPRO", "من ٤٣", "/43", 0, 43, true],
  amppro: ["مؤشر الحركة للمبتورين بالطرف (AMPPRO)", "AMPPRO", "من ٤٧", "/47", 0, 47, true],
  phantom_pain: ["ألم الطرف الشبحي", "Phantom limb pain", "من ١٠", "/10", 0, 10, false],
  k_level: ["مستوى K الوظيفي", "Medicare functional K-level", "٠–٤", "K0–K4", 0, 4, true],
  am_ula: ["نشاط الطرف العلوي للمبتورين (AM-ULA)", "Activities Measure for Upper Limb Amputees (AM-ULA)", "من ٤٠", "/40", 0, 40, true],
  haq: ["استبيان تقييم الصحّة (HAQ)", "Health Assessment Questionnaire (HAQ)", "٠–٣", "0–3", 0, 3, false],
  swollen_joints: ["عدد المفاصل المتورّمة", "Swollen joint count", "مفصل", "joints", 0, 28, false],
  basfi: ["مؤشر باث الوظيفي (BASFI)", "BASFI", "٠–١٠", "0–10", 0, 10, false],
  basdai: ["مؤشر باث لنشاط المرض (BASDAI)", "BASDAI", "٠–١٠", "0–10", 0, 10, false],
  basmi: ["مؤشر باث للقياسات (BASMI)", "BASMI", "٠–١٠", "0–10", 0, 10, false],
  chest_expansion: ["تمدّد الصدر", "Chest expansion", "سم", "cm", 0, 10, true],
  fiqr: ["أثر الفيبروميالجيا (FIQR)", "Revised Fibromyalgia Impact Questionnaire (FIQR)", "من ١٠٠", "/100", 0, 100, false],
  fatigue: ["شدّة التعب", "Fatigue severity", "من ١٠", "/10", 0, 10, false],
  fes_i: ["الخوف من السقوط (FES-I)", "Falls Efficacy Scale — International (FES-I)", "١٦–٦٤", "16–64", 16, 64, false],
  chaq: ["استبيان صحّة الطفل (CHAQ)", "Childhood Health Assessment Questionnaire (CHAQ)", "٠–٣", "0–3", 0, 3, false],
  active_joints: ["عدد المفاصل النشطة", "Active joint count", "مفصل", "joints", 0, 71, false],
  limb_circ_diff: ["فرق محيط الطرف عن السليم", "Limb circumference difference vs. healthy side", "سم", "cm", 0, 30, false],
};

/** **المقاييسُ الشائعة** — يختار منها المحرّرُ، ومنها زُرعت مقاييسُ البروتوكولات. */
export const MEASURE_CATALOG: MeasureDef[] = Object.entries(C).map(([code, r]) => ({
  code, nameAr: r[0], nameEn: r[1], unitAr: r[2], unitEn: r[3], min: r[4], max: r[5], higherIsBetter: r[6],
}));
export const catalogMeasure = (code: string): MeasureDef | null => MEASURE_CATALOG.find((m) => m.code === code) ?? null;

/** **مقاييسُ كلّ بروتوكولٍ مزروع** (رمزُ البروتوكول ⟵ رموزُ المقاييس) — من حقل «التقييم» فيه، والقياساتُ التشخيصية والتصنيفية لا تُعدّ نتيجة. */
export const PROTOCOL_MEASURE_SEED: Record<string, string[]> = {
  "lbp-acute-adult": ["odi", "fingertip_floor"],
  "lbp-chronic-adult": ["odi", "tsk"],
  "lumbar-radiculopathy-adult": ["odi", "slr"],
  "lumbar-stenosis-geriatric": ["walk_distance", "six_mwt", "odi", "tug"],
  "neck-pain-mechanical-adult": ["ndi", "cervical_rotation"],
  "cervical-radiculopathy-adult": ["ndi", "cervical_rotation"],
  "whiplash-adult": ["ndi", "cervical_rotation"],
  "scoliosis-ais-pediatric": ["cobb", "atr"],
  "subacromial-pain-adult": ["spadi", "shoulder_flexion"],
  "calcific-shoulder-adult": ["spadi", "constant"],
  "frozen-shoulder-adult": ["spadi", "shoulder_er", "shoulder_flexion"],
  "lateral-elbow-adult": ["prtee", "grip_painfree"],
  "carpal-tunnel-adult": ["bctq_sss", "bctq_fss"],
  "hand-oa-geriatric": ["fihoa", "grip"],
  "knee-oa-geriatric": ["koos", "chair_stand_30", "tug"],
  "hip-oa-geriatric": ["hoos", "hip_ir", "chair_stand_30", "tug"],
  "patellofemoral-pain-adult": ["kujala"],
  "achilles-tendinopathy-adult": ["visa_a", "heel_raise"],
  "plantar-heel-pain-adult": ["faam_adl", "ankle_df"],
  "ankle-sprain-adult": ["faam_adl", "ybalance"],
  "knee-meniscal-adult": ["koos", "ikdc", "knee_flexion"],
  "acl-reconstruction-adult": ["knee_flexion", "knee_ext_deficit", "quad_lsi", "ikdc"],
  "tka-geriatric": ["knee_flexion", "knee_ext_deficit", "tug", "chair_stand_30", "koos_jr"],
  "tha-geriatric": ["tug", "chair_stand_30", "six_mwt", "hoos_jr"],
  "rotator-cuff-repair-adult": ["shoulder_flexion", "shoulder_er", "ases"],
  "distal-radius-fracture-adult": ["prwe", "wrist_ext", "grip"],
  "stroke-subacute-adult": ["fugl_meyer_ue", "berg", "ten_mwt", "barthel", "mas"],
  "stroke-chronic-adult": ["ten_mwt", "six_mwt", "berg", "fugl_meyer_ue", "mas"],
  "sci-incomplete-adult": ["wisci", "ten_mwt", "berg", "scim"],
  "parkinsons-geriatric": ["updrs3", "mini_bestest", "tug", "ten_mwt"],
  "multiple-sclerosis-adult": ["t25fw", "six_mwt", "berg", "mfis"],
  "bells-palsy-all": ["house_brackmann", "sunnybrook"],
  "cerebral-palsy-pediatric": ["gmfm66", "mas", "ankle_df"],
  "brachial-plexus-birth-pediatric": ["ams_elbow", "mallet", "shoulder_er"],
  "torticollis-cmt-pediatric": ["cervical_rotation_affected", "cervical_lateral_flexion", "mfs"],
  "lower-limb-preprosthetic-adult": ["stump_circ", "hip_ext", "ampnopro", "phantom_pain"],
  "lower-limb-prosthetic-gait-adult": ["amppro", "six_mwt", "tug", "k_level"],
  "upper-limb-amputation-adult": ["am_ula", "phantom_pain"],
  "rheumatoid-arthritis-adult": ["haq", "grip", "swollen_joints"],
  "axial-spa-adult": ["basfi", "basdai", "basmi", "chest_expansion"],
  "fibromyalgia-adult": ["fiqr", "fatigue", "six_mwt"],
  "osteoporosis-falls-geriatric": ["tug", "berg", "chair_stand_30", "fes_i"],
  "jia-pediatric": ["chaq", "active_joints"],
  "lymphedema-adult": ["limb_circ_diff", "dash"],
};

export const MEASURES_MAX = 12;
const CODE_RE = /^[a-z][a-z0-9_]{1,39}$/;
const finite = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clip = (v: unknown, n: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** **مقاييسُ بروتوكولٍ من المحرّر** — رمزٌ فريد، واسمان، وحدّان (الأدنى أصغر)، واتجاه. ⟵ الجسمُ النظيف أو رسالةُ الخطأ. */
export function parseMeasures(raw: unknown): MeasureDef[] | string {
  if (!Array.isArray(raw)) return "المقاييسُ قائمة";
  if (raw.length > MEASURES_MAX) return `${MEASURES_MAX} مقياساً على الأكثر`;
  const out: MeasureDef[] = [];
  for (const m of raw) {
    const code = typeof m?.code === "string" ? m.code.trim() : "";
    if (!CODE_RE.test(code) || code === PAIN_MEASURE.code || code === GOALS_MEASURE.code) return `رمزُ مقياسٍ غير صالح: «${code}»`;
    if (out.some((o) => o.code === code)) return `رمزٌ مكرّر: «${code}»`;
    const nameAr = clip(m?.nameAr, 120); const nameEn = clip(m?.nameEn, 120);
    if (!nameAr || !nameEn) return "لكلّ مقياسٍ اسمٌ بالعربية والإنكليزية";
    const min = finite(m?.min); const max = finite(m?.max);
    if (min === null || max === null || !(max > min)) return `حدّا «${nameAr}»: الأدنى أصغرُ من الأعلى`;
    if (typeof m?.higherIsBetter !== "boolean") return `اتجاهُ «${nameAr}»: الأعلى أفضل أم الأقلّ؟`;
    out.push({ code, nameAr, nameEn, unitAr: clip(m?.unitAr, 20), unitEn: clip(m?.unitEn, 20), min, max, higherIsBetter: m.higherIsBetter });
  }
  return out;
}

// ── التقييم ───────────────────────────────────────────────────────────────────────────────────────────────
export const ASSESSMENT_DECISIONS = ["continue", "modify", "discharge", "stop"] as const;
export type AssessmentDecision = (typeof ASSESSMENT_DECISIONS)[number];
export const DECISION_LABELS: Record<AssessmentDecision, string> = {
  continue: "استمرار", modify: "تعديل الخطّة", discharge: "تخرّج — تحقّقت الأهداف", stop: "إيقاف الخطّة",
};
export const DECISION_LABELS_EN: Record<AssessmentDecision, string> = {
  continue: "Continue", modify: "Modify the plan", discharge: "Graduate — goals met", stop: "Stop the plan",
};
export type AssessmentKind = "baseline" | "periodic" | "final";
export const KIND_LABELS: Record<AssessmentKind, string> = { baseline: "أوّليّ", periodic: "دوريّ", final: "ختاميّ" };
export const KIND_LABELS_EN: Record<AssessmentKind, string> = { baseline: "Baseline", periodic: "Periodic", final: "Final" };
export const GOAL_STATUS_LABELS = ["لم يتحقّق", "جزئياً", "تحقّق"] as const;

/** قراءةُ سطرٍ من الخطّة قيمةً مسجّلة: تعريفُ المقياس كما كان يومَ التقييم، والقيمة. */
export interface ScoreSnap extends MeasureDef { value: number }
export interface GoalMark { text: string; status: 0 | 1 | 2 | null }

/** أهدافُ الخطّة سطوراً — تُنزع النقاطُ والترقيم، ولا أكثرَ من ١٢. */
export function planGoalsList(goals: string | null | undefined): string[] {
  return String(goals ?? "").split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*–·]|[0-9٠-٩]+[.)\-–]|[0-9٠-٩]+\s*[-–])\s*/, "").trim())
    .filter(Boolean).slice(0, 12).map((l) => l.slice(0, 300));
}

export function goalsPct(goals: GoalMark[] | null | undefined): number | null {
  const rated = (goals ?? []).filter((g) => g.status === 0 || g.status === 1 || g.status === 2);
  if (!rated.length) return null;
  return Math.round((rated.reduce((a, g) => a + Number(g.status), 0) / (2 * rated.length)) * 100);
}

export interface AssessmentInput {
  assessedOn: string; pain: number | null; scores: { code: string; value: number }[]; goals: GoalMark[];
  notes: string | null; decision: AssessmentDecision;
}

/**
 * **جسمُ التقييم** ⟵ المدخَلُ النظيف أو رسالةُ الخطأ. القياساتُ من مقاييس الخطّة وحدها وداخل حدودها، وقياسٌ واحدٌ على الأقلّ
 * (ألمٌ أو مقياسٌ أو هدف)، و«تخرّج» و«إيقاف» لخطّةٍ معتمَدة وحدها، و«إيقاف» بسببٍ مكتوب.
 */
export function parseAssessment(raw: any, measures: MeasureDef[], planStatus: string): AssessmentInput | string {
  const decision = raw?.decision;
  if (!(ASSESSMENT_DECISIONS as readonly string[]).includes(decision)) return "اختر القرار: استمرار · تعديل · تخرّج · إيقاف";
  if ((decision === "discharge" || decision === "stop") && planStatus !== "approved") return "التخرّجُ والإيقافُ لخطّةٍ معتمَدة";
  const notes = clip(raw?.notes, 2000);
  if (decision === "stop" && !notes) return "اكتب سببَ الإيقاف في الملاحظات";
  const assessedOn = typeof raw?.assessedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.assessedOn) ? raw.assessedOn : "";
  if (!assessedOn) return "تاريخُ التقييم غير صالح";
  const painN = finite(raw?.pain);
  if (painN !== null && (!Number.isInteger(painN) || painN < 0 || painN > 10)) return "الألمُ عددٌ صحيح ٠–١٠";
  const byCode = new Map(measures.map((m) => [m.code, m]));
  const scores: { code: string; value: number }[] = [];
  for (const s of Array.isArray(raw?.scores) ? raw.scores : []) {
    const value = finite(s?.value);
    if (value === null) continue;
    const m = byCode.get(String(s?.code));
    if (!m) return `مقياسٌ ليس من مقاييس الخطّة: «${s?.code}»`;
    if (scores.some((x) => x.code === m.code)) return `قياسٌ مكرّر: «${m.nameAr}»`;
    if (value < m.min || value > m.max) return `«${m.nameAr}» بين ${m.min} و${m.max}`;
    scores.push({ code: m.code, value });
  }
  const goals: GoalMark[] = [];
  for (const g of (Array.isArray(raw?.goals) ? raw.goals : []).slice(0, 12)) {
    const text = clip(g?.text, 300);
    if (!text) continue;
    const st = g?.status;
    if (st !== null && st !== undefined && st !== 0 && st !== 1 && st !== 2) return "حالةُ الهدف: لم يتحقّق · جزئياً · تحقّق";
    goals.push({ text, status: st === 0 || st === 1 || st === 2 ? st : null });
  }
  if (painN === null && !scores.length && goalsPct(goals) === null) return "سجّل قياساً واحداً على الأقلّ — الألم أو مقياسٌ أو هدف";
  return { assessedOn, pain: painN, scores, goals, notes, decision };
}

// ── الموعد (القرار ٢) ─────────────────────────────────────────────────────────────────────────────────────
export const REASSESS_EVERY_DAYS = 28;
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export interface DueState { state: "none" | "baseline" | "due" | "upcoming"; dueOn: string | null; kind: AssessmentKind | null; overdueDays: number }

/** أسبوعُ سماحٍ بعد نهاية المدّة بالتقويم لخطّةٍ بعدد جلسات — للغياب والتأخّر قبل أن يُطلب الختاميُّ لمن لم يُكمل. */
export const FINAL_GRACE_DAYS = 7;

/**
 * **متى التقييمُ التالي** — لخطّةٍ معتمَدة وحدها:
 *   • بلا تقييمٍ قطّ ⟵ «أوّليّ» مستحقٌّ منذ يوم الاعتماد.
 *   • **بعدد جلسات** (ترحيل ١٢٣، §4.dd — قرارُ المالك): «ختاميٌّ» عند الجلسة الأخيرة (يومَ نُفّذت) ما لم يُقيَّم بعدها؛ وقبل اكتمالها
 *     «دوريٌّ» بعد ٢٨ يوماً من آخر تقييم — **إلّا في أسبوعه الأخير** (الباقي جلساتُ أسبوعٍ أو أقلّ) فيكفيه الختاميّ؛ ومَن انقطع ولم يُكمل
 *     يُطلب ختاميُّه بعد نهاية المدّة بالتقويم وأسبوعِ سماح.
 *   • **وبلا عدد** (خططٌ أقدم) ⟵ بعد ٢٨ يوماً من آخر تقييم، أو نهايةُ مدّة الخطّة (الاعتمادُ + الأسابيع) إن جاءت قبلها ولم تُقيَّم بعدها ⟵ «ختاميّ».
 * وما حلّ موعدُه «مستحقّ» بعدد أيام تأخّره — تنبيهٌ لا قيد.
 */
export function assessmentDue(p: {
  status: string; approvedOn: string | null; durationWeeks: number | null; lastOn: string | null; count: number; today: string;
  totalSessions?: number | null; sessionsPerWeek?: number | null; executed?: number; lastSessionOn?: string | null;
}): DueState {
  if (p.status !== "approved" || !p.approvedOn) return { state: "none", dueOn: null, kind: null, overdueDays: 0 };
  if (!p.count || !p.lastOn) {
    return { state: "baseline", dueOn: p.approvedOn, kind: "baseline", overdueDays: Math.max(0, daysBetween(p.approvedOn, p.today)) };
  }
  const next = addDays(p.lastOn, REASSESS_EVERY_DAYS);
  let dueOn = next; let kind: AssessmentKind = "periodic";
  if (p.totalSessions) {
    const executed = Math.max(0, Math.trunc(p.executed ?? 0));
    if (executed >= p.totalSessions && p.lastSessionOn) {
      if (p.lastOn < p.lastSessionOn) { dueOn = p.lastSessionOn; kind = "final"; }
    } else {
      const weeks = p.sessionsPerWeek ? Math.ceil(p.totalSessions / p.sessionsPerWeek) : p.durationWeeks;
      const end = weeks ? addDays(p.approvedOn, weeks * 7 + FINAL_GRACE_DAYS) : null;
      const lastWeek = p.sessionsPerWeek ? p.totalSessions - executed <= p.sessionsPerWeek : false;
      if (end && end > p.lastOn && (end <= next || lastWeek)) { dueOn = end; kind = "final"; }
    }
  } else {
    const end = p.durationWeeks ? addDays(p.approvedOn, p.durationWeeks * 7) : null;
    if (end && end > p.lastOn && end <= next) { dueOn = end; kind = "final"; }
  }
  const overdue = daysBetween(dueOn, p.today);
  return { state: overdue >= 0 ? "due" : "upcoming", dueOn, kind, overdueDays: Math.max(0, overdue) };
}

// ── المقارنة (للصفحة والتقارير) ────────────────────────────────────────────────────────────────────────────
/** القيمةُ على مقياسٍ ٠–١٠٠ حيث ١٠٠ الأفضل — للمنحنى، كي تُقرأ المقاييسُ المختلفة على محورٍ واحد. */
export function normalized(value: number, m: Pick<MeasureDef, "min" | "max" | "higherIsBetter">): number {
  const r = (Math.min(Math.max(value, m.min), m.max) - m.min) / (m.max - m.min);
  return Math.round((m.higherIsBetter ? r : 1 - r) * 100);
}

export interface AssessmentLike { pain: number | null; scores: ScoreSnap[]; goals: GoalMark[] }
export type Verdict = "improved" | "worse" | "same" | "insufficient";
export interface Comparison { improved: number; worsened: number; same: number; compared: number; verdict: Verdict }

/** **الأوّلُ والأخير** — كم مقياساً تحسّن وكم ساء (الألم · كلُّ مقياسٍ في الاثنين برمزه · الأهداف). تحسّن ⟸ ما تحسّن أكثرُ ممّا ساء. */
export function compareAssessments(first: AssessmentLike, last: AssessmentLike): Comparison {
  const pairs: { a: number; b: number; higher: boolean }[] = [];
  if (first.pain != null && last.pain != null) pairs.push({ a: first.pain, b: last.pain, higher: false });
  const f = new Map((first.scores ?? []).map((s) => [s.code, s]));
  for (const s of last.scores ?? []) {
    const a = f.get(s.code);
    if (a) pairs.push({ a: a.value, b: s.value, higher: s.higherIsBetter });
  }
  const ga = goalsPct(first.goals); const gb = goalsPct(last.goals);
  if (ga != null && gb != null) pairs.push({ a: ga, b: gb, higher: true });
  let improved = 0, worsened = 0, same = 0;
  for (const p of pairs) {
    const d = p.higher ? p.b - p.a : p.a - p.b;
    if (d > 0) improved++; else if (d < 0) worsened++; else same++;
  }
  const verdict: Verdict = !pairs.length ? "insufficient" : improved > worsened ? "improved" : worsened > improved ? "worse" : "same";
  return { improved, worsened, same, compared: pairs.length, verdict };
}
export const VERDICT_LABELS: Record<Verdict, string> = { improved: "تحسّن", worse: "ساء", same: "بلا تغيّر", insufficient: "لا مقارنةَ بعد" };
export const VERDICT_LABELS_EN: Record<Verdict, string> = { improved: "Improved", worse: "Worse", same: "No change", insufficient: "Not comparable yet" };

// ══ تقاريرُ النتائج (المرحلةُ ٦ب — القرار ٥) ══════════════════════════════════════════════════════════════════
/** **يرى صفحةَ النتائج**: كاتبو الخطط ومديرُ الفرع. والنطاقُ: المسؤولُ والمشرفُ العام كلُّ الفروع، والمديرُ فرعُه، والأخصائيُّ مرضاه (`outcomesScope`). */
export const canViewOutcomes = (s: ProtocolSessionLike | null | undefined): boolean =>
  canWritePlans(s) || hasRole(s as any, "branch_manager");
export type OutcomesScope = "all" | "branches" | "own";
export function outcomesScope(s: ProtocolSessionLike | null | undefined): OutcomesScope | null {
  if (!canViewOutcomes(s)) return null;
  if (canApprovePlans(s)) return "all";
  if (hasRole(s as any, "branch_manager")) return "branches";
  return "own";
}

/**
 * **الالتزامُ بعدد الجلسات** — المنفَّذُ من المتوقَّع حتى اليوم (أو حتى انتهاء الخطّة): الجلساتُ في الأسبوع × الأسابيعُ المنقضية منذ الاعتماد، لا أكثرَ من مدّة الخطّة.
 * `null` حين لا جرعةَ مكتوبةً أو لم يمضِ يومٌ بعد.
 */
export function adherence(p: { approvedOn: string | null; endOn: string | null; today: string; sessionsPerWeek: number | null; durationWeeks: number | null; executed: number;
  totalSessions?: number | null }): number | null {
  if (!p.approvedOn || !p.sessionsPerWeek) return null;
  const until = p.endOn && p.endOn < p.today ? p.endOn : p.today;
  let weeks = Math.max(0, daysBetween(p.approvedOn, until)) / 7;
  if (p.durationWeeks) weeks = Math.min(weeks, p.durationWeeks);
  //  بعدد جلسات (ترحيل ١٢٣): المتوقَّعُ لا يتجاوزه — ستٌّ في الأسبوع × أربعة أسابيع وعددُها ٢٤ ⟵ ٢٤ لا ٢٨.
  const expected = Math.min(Math.floor(weeks * p.sessionsPerWeek), p.totalSessions ?? Number.POSITIVE_INFINITY);
  if (expected <= 0) return null;
  return Math.min(100, Math.round((p.executed / expected) * 100));
}

export interface PlanOutcome {
  planId: number; status: string; verdict: Verdict; adherence: number | null; overdue: boolean;
  protocolKey: string; protocolTitle: string; branchKey: string; branchName: string;
  specialistKey: string; specialistName: string; executorKey: string; executorName: string;
}
export interface OutcomeGroup {
  key: string; name: string; plans: number; compared: number; improved: number; worse: number; same: number;
  improvedPct: number | null; graduated: number; stopped: number; active: number; adherence: number | null; overdue: number;
}

/** **تجميعُ النتائج** — لكلّ مجموعة: الخطط، وما قورن منها (تقييمان على الأقلّ)، وكم تحسّن وساء ونسبةُ التحسّن من المقارَن، والحالات، ومتوسّطُ الالتزام، والمتأخّرون. */
export function summarizeOutcomes(rows: PlanOutcome[], keyOf: (r: PlanOutcome) => [string, string]): OutcomeGroup[] {
  const m = new Map<string, { name: string; list: PlanOutcome[] }>();
  for (const r of rows) {
    const [k, name] = keyOf(r);
    if (!m.has(k)) m.set(k, { name, list: [] });
    m.get(k)!.list.push(r);
  }
  return Array.from(m.entries()).map(([key, { name, list }]) => groupOf(key, name, list)).sort((a, b) => b.plans - a.plans || a.name.localeCompare(b.name, "ar"));
}
export function groupOf(key: string, name: string, list: PlanOutcome[]): OutcomeGroup {
  const compared = list.filter((r) => r.verdict !== "insufficient");
  const improved = compared.filter((r) => r.verdict === "improved").length;
  const adh = list.map((r) => r.adherence).filter((x): x is number => x != null);
  return {
    key, name, plans: list.length, compared: compared.length, improved,
    worse: compared.filter((r) => r.verdict === "worse").length, same: compared.filter((r) => r.verdict === "same").length,
    improvedPct: compared.length ? Math.round((improved / compared.length) * 100) : null,
    graduated: list.filter((r) => r.status === "graduated").length, stopped: list.filter((r) => r.status === "stopped").length,
    active: list.filter((r) => r.status === "approved").length,
    adherence: adh.length ? Math.round(adh.reduce((a, b) => a + b, 0) / adh.length) : null,
    overdue: list.filter((r) => r.overdue).length,
  };
}
