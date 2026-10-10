// **التقييمُ الأوّليّ للعلاج الطبيعي — داخل المعاينة** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// أرسل المالكُ استمارةَ تقييمٍ ورقية (صفحتان بالإنجليزية) وقال: «في خانة المعاينة تحديداً للأخصائيّ أو الطبيب أريد هذه الفورمات
// **بدون أيّ نقص** (عدا اسم المركز القديم)، مدموجةً باستمارةٍ واحدة **بدون تكرارات**: يؤشّر المختصُّ ما يحتاج ويملأ ما يجب ثمّ
// يحفظ، فتُخزَّن في خانة المعاينة بتاريخها ووقتها، ويطّلع عليها المعالجُ أو موظّفُ الاستقبال لاحقاً من ملفّ المريض — وعلى
// أساسها تُختار الخطّة».
//
// فهذا الملفُّ **المصدرُ الواحد** للاستمارة: خاناتُها بترتيب الورقتين وألفاظِهما الإنجليزية (اللغةُ الأولى كالأصل) ومعها ترجمةٌ
// عربية لزرّ «عربي»، وقاعدةُ الإلزام، والتطبيعُ الذي يقرؤه الخادمُ قبل أيّ كتابة، والملخّصُ الذي يظهر في الملفّ. الشاشةُ تفحص
// بالقاعدة نفسِها قبل الإرسال، والخادمُ يردّ بها — فلا تنحرف إحداهما.
//
// قراراتُ المالك في التفاصيل: **قوةُ العضلات ٠–٥ كما في الورقة** (بلا +/−) · **مستوى المساعدة وحالةُ التحميل نصٌّ حرٌّ كالأصل** ·
// الإلزامُ: القسمُ الأوّل أو «لا ينطبق»، والألم، والإحساس، وبندٌ من خطّة العلاج (والتشخيصُ في «قرار الفاحص») · **ورمزٌ للاستمارة
// وإصدارٌ** بدل رمز الوثيقة القديم. **و«تاريخ بداية الإصابة» هو «تاريخ الإصابة» نفسُه** الذي كتبته الاستعلامات — لا خانةٌ ثانية؛
// ويُختَم نصُّه في التقييم يومَ الحفظ (`onsetAtSigning`) فيبقى السجلُّ كاملاً كما وُقّع.

export const PT_FORM_CODE = "BC-PT-01";
export const PT_FORM_VERSION = 1;

export type Lang = "en" | "ar";
export interface Opt { code: string; en: string; ar: string }

const o = (code: string, en: string, ar: string): Opt => ({ code, en, ar });

export const PT_INVESTIGATIONS: readonly Opt[] = [
  o("mri", "MRI", "رنين مغناطيسي"), o("ct", "CT scan", "مفراس"), o("xray", "X-Ray", "أشعة سينية"),
  o("injections", "Injections", "حُقن"), o("other", "Other", "أخرى"),
];
export const PT_TRENDS: readonly Opt[] = [o("same", "Same", "كما هي"), o("better", "Better", "أفضل"), o("worse", "Worse", "أسوأ")];
export const PT_ALLERGIES: readonly Opt[] = [
  o("nka", "No Known Allergy", "لا حساسية معروفة"), o("drug", "Drug", "دواء"), o("food", "Food", "طعام"), o("other", "Other", "أخرى"),
];
export const PT_YES_NO: readonly Opt[] = [o("yes", "Yes", "نعم"), o("no", "No", "لا")];
export const PT_SYMPTOMS: readonly Opt[] = [o("intermittent", "Intermittent", "متقطّع"), o("constant", "Constant", "مستمرّ")];
export const PT_LOCATIONS: readonly Opt[] = [
  o("shoulder", "Shoulder", "الكتف"), o("back", "Back", "الظهر"), o("neck", "Neck", "الرقبة"), o("hip", "Hip", "الورك"),
  o("knee", "Knee", "الركبة"), o("ankle_foot", "Ankle/Foot", "الكاحل/القدم"),
];
export const PT_AGGRAVATING: readonly Opt[] = [
  o("standing", "Standing", "الوقوف"), o("walking", "Walking", "المشي"), o("movement", "Movement", "الحركة"),
  o("sitting", "Sitting", "الجلوس"), o("lying", "Lying", "الاستلقاء"),
];
export const PT_RELIEVING: readonly Opt[] = [
  o("heat", "Heat", "الحرارة"), o("ice", "Ice", "الثلج"), o("rest", "Rest", "الراحة"),
  o("medication", "Medication", "الدواء"), o("position_change", "Position Change", "تغيير الوضعية"),
];
export const PT_SENSATION: readonly Opt[] = [o("intact", "Intact", "سليم"), o("impaired", "Impaired", "ضعيف"), o("absent", "Absent", "معدوم")];

/** قوةُ العضلات اليدويّة — الصفوفُ الستّة بألفاظ الورقة. */
export const PT_MMT_GROUPS: readonly Opt[] = [
  o("shoulder", "Shoulder Flexors / Extensors", "عضلات الكتف القابضة / الباسطة"),
  o("elbow", "Elbow Flexors / Extensors", "عضلات المرفق القابضة / الباسطة"),
  o("wrist", "Wrist Flexors / Extensors", "عضلات الرسغ القابضة / الباسطة"),
  o("hip", "Hip Flexors / Extensors", "عضلات الورك القابضة / الباسطة"),
  o("knee", "Knee Flexors / Extensors", "عضلات الركبة القابضة / الباسطة"),
  o("ankle", "Ankle Dorsiflexors / Plantarflexors", "عضلات الكاحل الرافعة / الخافضة"),
];
/** **٠–٥ كما في الورقة** — قرارُ المالك: بلا «+» ولا «−». */
export const PT_MMT_GRADES = ["0", "1", "2", "3", "4", "5"] as const;
export const PT_MMT_LEGEND: Record<Lang, string> = {
  en: "Grading: 0=No Contraction, 1=Trace, 2=Poor, 3=Fair, 4=Good, 5=Normal",
  ar: "الدرجات: ٠=لا انقباض، ١=أثر، ٢=ضعيف، ٣=مقبول، ٤=جيّد، ٥=طبيعي",
};

export const PT_ASHWORTH_REGIONS: readonly Opt[] = [o("upper", "Upper Limb", "الطرف العلوي"), o("lower", "Lower Limb", "الطرف السفلي")];
export const PT_ASHWORTH_GRADES = ["0", "1", "1+", "2", "3", "4"] as const;
export const PT_ASHWORTH_LEGEND: Record<Lang, string> = {
  en: "0 = No increase in tone, 1 = Slight, 1+ = Slight (catch + minimal resistance), 2 = Marked, 3 = Considerable, 4 = Rigid",
  ar: "٠ = لا زيادة في التوتّر، ١ = خفيفة، ١+ = خفيفة (التقاط + مقاومة دنيا)، ٢ = واضحة، ٣ = كبيرة، ٤ = تيبّس",
};

export const PT_FUNCTIONAL: readonly Opt[] = [
  o("bed_mobility", "Bed Mobility (Rolling, Supine-Sit)", "الحركة في السرير (التقلّب، من الاستلقاء للجلوس)"),
  o("transfers", "Transfers (Sit-Stand, Bed-WC)", "الانتقال (جلوس-وقوف، سرير-كرسي متحرّك)"),
  o("balance_sitting", "Balance (Sitting)", "التوازن (جلوساً)"),
  o("balance_standing", "Balance (Standing)", "التوازن (وقوفاً)"),
  o("gait", "Gait – Distance / Equipment Used", "المشي — المسافة / الأداة المستعملة"),
  o("weight_bearing", "Weight Bearing Status", "حالة التحميل على الطرف"),
];

/**
 * **رموزُ «مستوى المساعدة» والأدوات** — تحت «الحالة الوظيفية» وفوق «خطة العلاج» كما في الورقة (طلبُ المالك ٢٠٢٦-١٠-١٠ بصورتها).
 * الرموزُ نفسُها تُكتب في الخانات باللغتين؛ والعربيةُ تشرح معناها.
 */
export const PT_ASSIST_LEGEND: Record<Lang, string> = {
  en: "Assistance codes: I=Independent, S=Supervised, SBA=Stand-By Assist, Min A=Minimal Assist, Mod A=Moderate Assist, Max A=Maximum Assist, U=Unable. "
    + "Equipment: Cr=Crutches, SPC=Single Point Cane, HW=Hemi Walker, SW=Standard Walker, WC=Wheelchair.",
  ar: "رموز المساعدة: I = مستقلّ، S = بإشراف، SBA = مساعدٌ واقفٌ بجانبه، Min A = مساعدة قليلة، Mod A = مساعدة متوسّطة، Max A = مساعدة كبيرة، U = لا يستطيع. "
    + "الأدوات: Cr = عكّازان، SPC = عصا بنقطة واحدة، HW = مشّاية نصفية، SW = مشّاية عادية، WC = كرسي متحرّك.",
};

/** **خطّةُ العلاج** — المربّعاتُ الخمسة عشر بترتيب الورقة (صفوفٌ من خمسة). */
export const PT_PLAN_ITEMS: readonly Opt[] = [
  o("therapeutic_exercises", "Therapeutic Exercises", "تمارين علاجية"), o("rom", "ROM", "مدى الحركة"),
  o("strengthening", "Strengthening", "التقوية"), o("balance_training", "Balance Training", "تدريب التوازن"),
  o("anti_inflammatory", "Anti Inflammatory", "مضادّ للالتهاب"),
  o("gait_training", "Gait Training", "تدريب المشي"), o("transfer_training", "Transfer Training", "تدريب الانتقال"),
  o("bed_mobility", "Bed Mobility", "الحركة في السرير"), o("pain_management", "Pain Management", "إدارة الألم"),
  o("stairs_training", "Stairs Training", "تدريب الدرج"),
  o("traction", "Traction", "الشدّ"), o("muscle_relaxation", "Muscle Relaxation", "إرخاء العضلات"),
  o("home_exercise_program", "Home Exercise Program", "برنامج تمارين منزلي"), o("patient_education", "Patient Education", "تثقيف المريض"),
  o("stretching", "Stretching", "الإطالة"),
];

/** عناوينُ الاستمارة باللغتين — الإنجليزيةُ بحرف الورقة. */
export const PT_LABELS = {
  formTitle: { en: "Physiotherapy Initial Assessment", ar: "التقييم الأوّلي للعلاج الطبيعي" },
  sectionA: { en: "Section A — Physiotherapy Initial Assessment", ar: "القسم الأوّل — التقييم الأوّلي للعلاج الطبيعي" },
  na: { en: "N/A", ar: "لا ينطبق" },
  investigations: { en: "Investigations:", ar: "الفحوصات:" },
  trend: { en: "Condition Trend:", ar: "تطوّر الحالة:" },
  history: { en: "History", ar: "التاريخ المرضي" },
  onset: { en: "Date of Onset / Injury:", ar: "تاريخ بداية الإصابة:" },
  surgery: { en: "Date of Surgery (if any):", ar: "تاريخ العملية (إن وُجدت):" },
  pastHistory: { en: "Past Medical History:", ar: "السوابق المرضية:" },
  allergy: { en: "Drug / Food Allergy:", ar: "الحساسية من الدواء أو الطعام:" },
  specify: { en: "Specify:", ar: "حدّد:" },
  previousTherapy: { en: "Previous Therapy for this Condition:", ar: "علاجٌ سابق لهذه الحالة:" },
  previousVisits: { en: "Number of Visits:", ar: "عدد الزيارات:" },
  pain: { en: "Pain Assessment", ar: "تقييم الألم" },
  symptoms: { en: "Symptoms:", ar: "الأعراض:" },
  painScale: { en: "Pain Scale (0–10)", ar: "مقياس الألم (٠–١٠)" },
  atBest: { en: "At Best:", ar: "في أفضل حالاته:" },
  atWorst: { en: "At Worst:", ar: "في أسوأ حالاته:" },
  location: { en: "Location:", ar: "الموقع:" },
  other: { en: "Other:", ar: "أخرى:" },
  aggravating: { en: "Aggravating:", ar: "ما يزيده:" },
  relieving: { en: "Relieving:", ar: "ما يخفّفه:" },
  sensation: { en: "Sensation", ar: "الإحساس" },
  overallStatus: { en: "Overall Status:", ar: "الحالة العامّة:" },
  affectedRegions: { en: "Affected Region(s), if impaired/absent:", ar: "المناطق المصابة (إن كان ضعيفاً أو معدوماً):" },
  mmt: { en: "Manual Muscle Testing (MMT)", ar: "اختبار قوة العضلات اليدويّ" },
  muscleGroup: { en: "Muscle Group", ar: "المجموعة العضلية" },
  right: { en: "Right", ar: "يمين" },
  left: { en: "Left", ar: "يسار" },
  spasticity: { en: "Spasticity: Modified Ashworth Scale", ar: "التشنّج: مقياس أشورث المعدّل" },
  region: { en: "Region", ar: "المنطقة" },
  functional: { en: "Functional Status", ar: "الحالة الوظيفية" },
  activity: { en: "Activity", ar: "النشاط" },
  assistance: { en: "Level of Assistance", ar: "مستوى المساعدة" },
  equipment: { en: "Equipment / Notes", ar: "الأداة / ملاحظات" },
  plan: { en: "Physiotherapy Plan of Treatment", ar: "خطة العلاج الطبيعي" },
} as const satisfies Record<string, Record<Lang, string>>;

export type MmtGrade = (typeof PT_MMT_GRADES)[number];
export type AshworthGrade = (typeof PT_ASHWORTH_GRADES)[number];
export interface Sides<T> { r: T | null; l: T | null }

/** **ما يُخزَّن مع المعاينة** — رموزٌ لا ألفاظ، فتُعرَض بأيّ لغة ولا تتغيّر بتغيّر الترجمة. */
export interface PhysioInitialAssessment {
  form: typeof PT_FORM_CODE;
  version: number;
  sectionANa: boolean;
  investigations: string[];
  trend: string | null;
  /** نصُّ «تاريخ الإصابة» يومَ الحفظ — يُختَم من ملفّ المريض، لا يكتبه الفاحصُ هنا. */
  onsetAtSigning: string | null;
  surgeryDate: string | null;
  pastHistory: string | null;
  allergy: string[];
  allergySpecify: string | null;
  previousTherapy: string | null;
  previousVisits: number | null;
  symptoms: string | null;
  painBest: number | null;
  painWorst: number | null;
  location: string[];
  locationOther: string | null;
  aggravating: string[];
  relieving: string[];
  relievingOther: string | null;
  sensation: string | null;
  sensationRegions: string | null;
  mmt: Record<string, Sides<MmtGrade>>;
  ashworth: Record<string, Sides<AshworthGrade>>;
  functional: Record<string, { assist: string | null; notes: string | null }>;
  plan: string[];
}

/** استمارةٌ فارغة — بها تفتح النافذةُ لمعاينةٍ جديدة. */
export function emptyInitialAssessment(): PhysioInitialAssessment {
  return {
    form: PT_FORM_CODE, version: PT_FORM_VERSION, sectionANa: false,
    investigations: [], trend: null, onsetAtSigning: null, surgeryDate: null, pastHistory: null,
    allergy: [], allergySpecify: null, previousTherapy: null, previousVisits: null,
    symptoms: null, painBest: null, painWorst: null, location: [], locationOther: null,
    aggravating: [], relieving: [], relievingOther: null, sensation: null, sensationRegions: null,
    mmt: Object.fromEntries(PT_MMT_GROUPS.map((g) => [g.code, { r: null, l: null }])),
    ashworth: Object.fromEntries(PT_ASHWORTH_REGIONS.map((g) => [g.code, { r: null, l: null }])),
    functional: Object.fromEntries(PT_FUNCTIONAL.map((g) => [g.code, { assist: null, notes: null }])),
    plan: [],
  };
}

/** عناوينُ ما يُنبَّه على نقصه — تسمّي الشاشةُ والملفُّ بها الناقصَ بالعربية (لا إلزامَ منذ ٢٠٢٦-١٠-١٠). */
export const PT_REQUIRED_LABELS: Record<string, string> = {
  diagnosis: "التشخيص",
  painBest: "الألم في أفضل حالاته",
  painWorst: "الألم في أسوأ حالاته",
  symptoms: "الأعراض (متقطّع / مستمرّ)",
  location: "موقع الألم",
  sensation: "الإحساس",
  sensationRegions: "المناطق المصابة بالإحساس",
  plan: "بندٌ واحد على الأقلّ من خطة العلاج",
  previousVisits: "عدد زيارات العلاج السابق",
  surgeryDate: "تاريخ العملية",
};

const TEXT_MAX = 500;
const LONG_TEXT_MAX = 2000;
const txt = (v: unknown, max = TEXT_MAX): string | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const codesOf = (list: readonly Opt[]) => new Set(list.map((x) => x.code));

export type ParseResult =
  /** `gaps`: ما يُنبَّه على نقصه — **لا يمنع الحفظ** (`assessmentGaps`). */
  | { ok: true; value: PhysioInitialAssessment; gaps: string[] }
  | { ok: false; error: string; missing: string[] };

/**
 * **تطبيعُ الاستمارة وفحصُها** — يقرؤها الخادمُ قبل أيّ كتابة، والشاشةُ قبل الإرسال.
 *
 * رمزٌ غيرُ معروف أو رقمٌ خارج حدّه ⟵ رفضٌ يسمّي الخانة (لا يسقط صامتاً) — **وهذا وحده يمنع الحفظ**.
 * **ولا خانةَ إلزامية** (قرارُ المالك ٢٠٢٦-١٠-١٠: «اجعل جميع الحقول غير إلزامية، ويمكن أن يحفظها بدون أي حقل، مع تنبيهٍ أنّ التشخيص
 * مثلاً لم يُكتب، وإمكانية أن يعدّل عليها في أي وقت»): ما كان إلزامياً صار **تنبيهاً** (`gaps` ⟵ `assessmentGaps`).
 */
export function parseInitialAssessment(raw: unknown, opts: { today?: string } = {}): ParseResult {
  const bad = (field: string, error: string): ParseResult => ({ ok: false, error, missing: [field] });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("assessment", "استمارة التقييم غير صالحة");
  const r = raw as Record<string, any>;
  const a = emptyInitialAssessment();

  const pickList = (key: string, list: readonly Opt[]): string[] | null => {
    const v = r[key];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) return null;
    const allowed = codesOf(list);
    const out: string[] = [];
    for (const x of v) {
      if (typeof x !== "string" || !allowed.has(x)) return null;
      if (!out.includes(x)) out.push(x);
    }
    return list.map((y) => y.code).filter((c) => out.includes(c));
  };
  const pickOne = (key: string, list: readonly Opt[]): string | null | undefined => {
    const v = r[key];
    if (v === undefined || v === null || v === "") return null;
    return typeof v === "string" && codesOf(list).has(v) ? v : undefined;
  };
  const pickInt = (key: string, min: number, max: number): number | null | undefined => {
    const v = r[key];
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };

  a.sectionANa = r.sectionANa === true;

  const lists: [keyof PhysioInitialAssessment, readonly Opt[], string][] = [
    ["investigations", PT_INVESTIGATIONS, "الفحوصات"], ["allergy", PT_ALLERGIES, "الحساسية"],
    ["location", PT_LOCATIONS, "موقع الألم"], ["aggravating", PT_AGGRAVATING, "ما يزيد الألم"],
    ["relieving", PT_RELIEVING, "ما يخفّف الألم"], ["plan", PT_PLAN_ITEMS, "خطة العلاج"],
  ];
  for (const [key, list, label] of lists) {
    const v = pickList(key as string, list);
    if (v === null) return bad(key as string, `قيمةٌ غير صالحة في «${label}»`);
    (a as any)[key] = v;
  }
  //  «لا حساسية معروفة» وحدها — لا تجتمع مع دواءٍ أو طعام.
  if (a.allergy.includes("nka")) a.allergy = ["nka"];

  const ones: [keyof PhysioInitialAssessment, readonly Opt[], string][] = [
    ["trend", PT_TRENDS, "تطوّر الحالة"], ["previousTherapy", PT_YES_NO, "العلاج السابق"],
    ["symptoms", PT_SYMPTOMS, "الأعراض"], ["sensation", PT_SENSATION, "الإحساس"],
  ];
  for (const [key, list, label] of ones) {
    const v = pickOne(key as string, list);
    if (v === undefined) return bad(key as string, `قيمةٌ غير صالحة في «${label}»`);
    (a as any)[key] = v;
  }

  const best = pickInt("painBest", 0, 10);
  const worst = pickInt("painWorst", 0, 10);
  if (best === undefined) return bad("painBest", "الألم في أفضل حالاته رقمٌ صحيح من ٠ إلى ١٠");
  if (worst === undefined) return bad("painWorst", "الألم في أسوأ حالاته رقمٌ صحيح من ٠ إلى ١٠");
  if (best !== null && worst !== null && best > worst) return bad("painBest", "الألم في أفضل حالاته لا يزيد على أسوئها");
  a.painBest = best;
  a.painWorst = worst;

  const visits = pickInt("previousVisits", 0, 999);
  if (visits === undefined) return bad("previousVisits", "عدد زيارات العلاج السابق رقمٌ صحيح من ٠ إلى ٩٩٩");
  a.previousVisits = a.previousTherapy === "yes" ? visits : null;

  const surgery = txt(r.surgeryDate, 10);
  if (surgery) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(surgery) || Number.isNaN(Date.parse(surgery))) return bad("surgeryDate", "تاريخ العملية غير صالح");
    if (opts.today && surgery > opts.today) return bad("surgeryDate", "تاريخ العملية لا يكون في المستقبل");
  }
  a.surgeryDate = surgery;
  a.pastHistory = txt(r.pastHistory, LONG_TEXT_MAX);
  a.allergySpecify = a.allergy.some((x) => x !== "nka") ? txt(r.allergySpecify) : null;
  a.locationOther = txt(r.locationOther);
  a.relievingOther = txt(r.relievingOther);
  a.sensationRegions = a.sensation === "impaired" || a.sensation === "absent" ? txt(r.sensationRegions) : null;

  const grid = <T extends string>(key: "mmt" | "ashworth", rows: readonly Opt[], grades: readonly T[], label: string) => {
    const src = r[key] && typeof r[key] === "object" ? r[key] : {};
    const out: Record<string, Sides<T>> = {};
    for (const row of rows) {
      const cell = src[row.code] && typeof src[row.code] === "object" ? src[row.code] : {};
      const side = (v: unknown): T | null | undefined => {
        if (v === undefined || v === null || v === "") return null;
        const s = String(v).trim();
        return (grades as readonly string[]).includes(s) ? (s as T) : undefined;
      };
      const rv = side(cell.r);
      const lv = side(cell.l);
      if (rv === undefined || lv === undefined) return { error: `درجةٌ غير صالحة في «${label}» — ${row.ar}` };
      out[row.code] = { r: rv, l: lv };
    }
    return { out };
  };
  const mmt = grid("mmt", PT_MMT_GROUPS, PT_MMT_GRADES, "قوة العضلات");
  if ("error" in mmt) return bad("mmt", mmt.error!);
  a.mmt = mmt.out;
  const ash = grid("ashworth", PT_ASHWORTH_REGIONS, PT_ASHWORTH_GRADES, "التشنّج");
  if ("error" in ash) return bad("ashworth", ash.error!);
  a.ashworth = ash.out;

  const fsrc = r.functional && typeof r.functional === "object" ? r.functional : {};
  for (const row of PT_FUNCTIONAL) {
    const cell = fsrc[row.code] && typeof fsrc[row.code] === "object" ? fsrc[row.code] : {};
    a.functional[row.code] = { assist: txt(cell.assist), notes: txt(cell.notes) };
  }

  return { ok: true, value: a, gaps: assessmentGaps(a) };
}

/**
 * **ما يُنبَّه على نقصه** — كان إلزاماً حتى ٢٠٢٦-١٠-١٠ وصار تنبيهاً لا يمنع الحفظ: التشخيصُ (حين يُعطى نصُّه)، وبندٌ من خطّة العلاج،
 * وما لم يُؤشَّر «لا ينطبق» على القسم الأوّل: الألمُ في أفضل حالاته وأسوئها والإحساس؛ وحين يكون الألمُ أكثرَ من صفر: الأعراضُ وموقعُه؛
 * وحين يكون الإحساسُ ضعيفاً أو معدوماً: المناطقُ المصابة؛ و«علاجٌ سابق: نعم» بلا عدد الزيارات.
 */
export function assessmentGaps(a: PhysioInitialAssessment | null, diagnosis?: unknown): string[] {
  const gaps: string[] = [];
  if (diagnosis !== undefined && !(typeof diagnosis === "string" && diagnosis.trim())) gaps.push("diagnosis");
  if (!a) return gaps;
  if (!a.sectionANa) {
    if (a.painBest === null) gaps.push("painBest");
    if (a.painWorst === null) gaps.push("painWorst");
    if ((a.painWorst ?? 0) > 0) {
      if (!a.symptoms) gaps.push("symptoms");
      if (a.location.length === 0 && !a.locationOther) gaps.push("location");
    }
    if (!a.sensation) gaps.push("sensation");
    else if ((a.sensation === "impaired" || a.sensation === "absent") && !a.sensationRegions) gaps.push("sensationRegions");
  }
  if (a.previousTherapy === "yes" && a.previousVisits === null) gaps.push("previousVisits");
  if (a.plan.length === 0) gaps.push("plan");
  return gaps;
}

/** **سطرُ التنبيه** — «لم يُكتب بعد: التشخيص، الإحساس…»، أو `null` حين لا نقص. */
export function assessmentGapsText(gaps: readonly string[]): string | null {
  return gaps.length ? `لم يُكتب بعد: ${gaps.map((k) => PT_REQUIRED_LABELS[k] ?? k).join("، ")}` : null;
}

/** هل في الاستمارة شيءٌ مكتوب أصلاً؟ — تنقيحُ معاينةٍ قديمة بلا تقييم يجوز أن يبقى بلا تقييم. */
export function assessmentHasContent(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, any>;
  if (r.sectionANa === true) return true;
  for (const [k, v] of Object.entries(r)) {
    if (k === "form" || k === "version" || k === "sectionANa" || k === "onsetAtSigning") continue;
    if (Array.isArray(v) ? v.length > 0 : v && typeof v === "object"
      ? Object.values(v).some((c: any) => c && typeof c === "object" && Object.values(c).some((x) => x !== null && x !== ""))
      : v !== null && v !== undefined && v !== "") return true;
  }
  return false;
}

/** يقرأ ما خُزّن (أو `null`) — للعرض. ما لا يُقرأ يُعامَل غياباً لا خطأً. */
export function readStoredAssessment(v: unknown): PhysioInitialAssessment | null {
  if (!v || typeof v !== "object" || (v as any).form !== PT_FORM_CODE) return null;
  const base = emptyInitialAssessment();
  return { ...base, ...(v as PhysioInitialAssessment) };
}

export const optLabel = (list: readonly Opt[], code: string | null | undefined, lang: Lang): string =>
  (code ? list.find((x) => x.code === code)?.[lang] : null) ?? "";

/**
 * **سطرُ الملخّص** — في بطاقة المعاينة وصفحة الاستمارة الأولى وبجانب اختيار البروتوكول:
 * «الألم ٣–٧ من ١٠ · الظهر · متقطّع · الإحساس سليم · بنود خطة العلاج: ٧».
 */
export function assessmentSummaryAr(a: PhysioInitialAssessment | null): string | null {
  if (!a) return null;
  const parts: string[] = [];
  if (a.sectionANa) parts.push("القسم الأوّل: لا ينطبق");
  else {
    if (a.painBest !== null || a.painWorst !== null) {
      parts.push(a.painBest !== null && a.painWorst !== null && a.painBest !== a.painWorst
        ? `الألم ${a.painBest}–${a.painWorst} من ١٠` : `الألم ${a.painWorst ?? a.painBest} من ١٠`);
    }
    const loc = [...a.location.map((c) => optLabel(PT_LOCATIONS, c, "ar")), ...(a.locationOther ? [a.locationOther] : [])];
    if (loc.length) parts.push(loc.join("، "));
    if (a.symptoms) parts.push(optLabel(PT_SYMPTOMS, a.symptoms, "ar"));
    if (a.sensation) parts.push(`الإحساس ${optLabel(PT_SENSATION, a.sensation, "ar")}`);
  }
  if (a.plan.length) parts.push(`بنود خطة العلاج: ${a.plan.length}`);
  return parts.join(" · ") || null;
}

/** بنودُ خطّة العلاج المؤشَّرة بلغةٍ — لصفحة الخطّة ولـ«اقترح خطّة». */
export function assessmentPlanLabels(a: PhysioInitialAssessment | null, lang: Lang): string[] {
  return a ? a.plan.map((c) => optLabel(PT_PLAN_ITEMS, c, lang)).filter(Boolean) : [];
}

/**
 * **التقييمُ نصّاً إنجليزياً** — يقرؤه «اقترح خطّة» بدل النصّ الحرّ (بلا اسمٍ ولا هاتف: لا شيءَ هنا يعرّف المريض).
 */
export function assessmentAsEnglishText(a: PhysioInitialAssessment | null): string | null {
  if (!a) return null;
  const L = (list: readonly Opt[], codes: string[]) => codes.map((c) => optLabel(list, c, "en")).join(", ");
  const lines: string[] = [];
  if (a.sectionANa) lines.push("Section A: N/A");
  else {
    if (a.investigations.length) lines.push(`Investigations: ${L(PT_INVESTIGATIONS, a.investigations)}`);
    if (a.trend) lines.push(`Condition trend: ${optLabel(PT_TRENDS, a.trend, "en")}`);
    //  **«تاريخ بداية الإصابة» والحساسية** — كانا يسقطان من النصّ (§4.da المرحلة ٤): «لا تضيع أيُّ معلومة»، و«اقترح خطّة» يقرؤه.
    if (a.onsetAtSigning) lines.push(`Date of onset / injury: ${a.onsetAtSigning === "congenital" ? "Since birth" : a.onsetAtSigning === "unknown" ? "Unknown" : a.onsetAtSigning}`);
    if (a.surgeryDate) lines.push(`Date of surgery: ${a.surgeryDate}`);
    if (a.pastHistory) lines.push(`Past medical history: ${a.pastHistory}`);
    if (a.allergy.length) lines.push(`Drug / food allergy: ${L(PT_ALLERGIES, a.allergy)}${a.allergySpecify ? ` (${a.allergySpecify})` : ""}`);
    if (a.previousTherapy) lines.push(`Previous therapy for this condition: ${optLabel(PT_YES_NO, a.previousTherapy, "en")}${a.previousVisits !== null ? ` (${a.previousVisits} visits)` : ""}`);
    if (a.symptoms) lines.push(`Symptoms: ${optLabel(PT_SYMPTOMS, a.symptoms, "en")}`);
    if (a.painBest !== null || a.painWorst !== null) lines.push(`Pain (0–10): at best ${a.painBest ?? "—"}, at worst ${a.painWorst ?? "—"}`);
    if (a.location.length || a.locationOther) lines.push(`Location: ${[L(PT_LOCATIONS, a.location), a.locationOther].filter(Boolean).join(", ")}`);
    if (a.aggravating.length) lines.push(`Aggravating: ${L(PT_AGGRAVATING, a.aggravating)}`);
    if (a.relieving.length || a.relievingOther) lines.push(`Relieving: ${[L(PT_RELIEVING, a.relieving), a.relievingOther].filter(Boolean).join(", ")}`);
    if (a.sensation) lines.push(`Sensation: ${optLabel(PT_SENSATION, a.sensation, "en")}${a.sensationRegions ? ` (${a.sensationRegions})` : ""}`);
  }
  const mmt = PT_MMT_GROUPS.filter((g) => a.mmt[g.code]?.r !== null || a.mmt[g.code]?.l !== null)
    .map((g) => `${g.en} R ${a.mmt[g.code].r ?? "—"} / L ${a.mmt[g.code].l ?? "—"}`);
  if (mmt.length) lines.push(`MMT: ${mmt.join("; ")}`);
  const ash = PT_ASHWORTH_REGIONS.filter((g) => a.ashworth[g.code]?.r !== null || a.ashworth[g.code]?.l !== null)
    .map((g) => `${g.en} R ${a.ashworth[g.code].r ?? "—"} / L ${a.ashworth[g.code].l ?? "—"}`);
  if (ash.length) lines.push(`Modified Ashworth: ${ash.join("; ")}`);
  const fn = PT_FUNCTIONAL.filter((g) => a.functional[g.code]?.assist || a.functional[g.code]?.notes)
    .map((g) => `${g.en}: ${[a.functional[g.code].assist, a.functional[g.code].notes].filter(Boolean).join(" — ")}`);
  if (fn.length) lines.push(`Functional status: ${fn.join("; ")}`);
  if (a.plan.length) lines.push(`Plan of treatment: ${L(PT_PLAN_ITEMS, a.plan)}`);
  return lines.length ? lines.join("\n") : null;
}
