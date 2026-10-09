// Migration 122: «استعمالُ المركز» لكلّ جهازٍ في البروتوكول — بُعدٌ ثانٍ منفصلٌ عن «درجة الدليل» (§4.cx — قراراتُ المالك ٢٠٢٦-١٠-٠٩).
//
// ملاحظةُ سليم: «التحفيزُ والشدُّ والمغناطيسُ والتيكار كلُّها «غير موصى بها» مع أنّنا نستعملها بنتائج رائعة». والخللُ كان في التصميم: عمودٌ واحد
// (`evidence`) يقول درجةَ الدليل **ويقرّر** ما يدخل الخطّة. وقراراتُ المالك:
//   ١. بُعدان: «درجةُ الدليل» تبقى صادقةً بمصدرها ولا تمنع شيئاً، و**«استعمالُ المركز»** (أساسيّ / مساعد / لا يُستخدم) هو وحده ما يحكم الخطّة.
//   ٢. في ألم الظهر المزمن: التحفيزُ والشدُّ والمغناطيسُ والتيكار **مساعد**، والتمارين **أساسيّ**، والحرارةُ والأشعّةُ والإبر كما كانت (تدخل الخطّة ⟵
//      مساعد)، والليزرُ والأمواجُ فوق الصوتية **لا يُستخدم** حتى يقول سليم غيرَ ذلك.
//   ٣. الإعداداتُ قيمٌ أولى من المراجع يعدّلها سليم والأخصائيّ متى شاءا — في البروتوكول ولكلّ مريضٍ في خطّته.
//   ٤. **المساعدُ يتناوب بين الجلسات** («جلساتُنا ٥٠ دقيقة فقط»): الأساسيُّ في كلّ جلسة، وجهازٌ مساعدٌ واحدٌ بدوره.
//
//   • physio_protocol_devices.centre_use — `NULL` = يُشتقّ من درجة الدليل كما كان يحكم (موصى به ⟵ أساسيّ · اختياري ⟵ مساعد · غير موصى به ⟵
//     لا يُستخدم) — فالبروتوكولاتُ الثلاثة والأربعون الباقية تبقى على ما كانت حتى يقرّر سليم (`centreUseOf`).
//   • physio_plan_devices.centre_use — بندُ الخطّة أساسيٌّ أو مساعد؛ `NULL` (خططٌ قبل اليوم) = أساسيّ في كلّ جلسة كما كانت تُنفَّذ.
//   • physio_plan_session_items.off_turn — مساعدٌ لم يكن دورَه في الجلسة: ليس «لم يُنفَّذ» ولا انحرافاً يُبلَّغ به الأخصائيّ.
//   • وألمُ الظهر المزمن بقرار المالك — **ما لم يعدّله إنسان** (`updated_by IS NULL`، قاعدةُ `physio_content.ts`) وما لم يُكتب استعمالُه بعد
//     (`centre_use IS NULL`): فالتكرارُ بلا أثر، وما كتبه سليم يبقى. ودرجةُ الدليل للتيكار والمغناطيس صارت «محدود أو متضارب» — الأدقّ من
//     «غير موصى به» (لا تذكرهما الإرشادات، وتجاربُهما صغيرة)؛ والتحفيزُ والشدُّ تبقى درجتُهما «الإرشاداتُ ضدّه روتينياً» (NICE NG59 · WHO 2023).
import { lit, num, type Bi } from "./physio_content";

export const name = "122_physio_centre_use";

type Use = "core" | "adjunct" | "not_used";
interface Row { code: string; use: Use; evidence: "recommended" | "optional" | "not_recommended"; minutes: number | null;
  params: Record<string, string>; parameters: Bi | null; note: Bi; ord: number }

//  التمارينُ أوّلاً، ثمّ المساعدُ بدور تناوبه، ثمّ ما لا يُستخدم.
const LBP: Row[] = [
  { code: "exercise", use: "core", evidence: "recommended", minutes: 35, params: {}, ord: 0,
    parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٣٠–٤٠ دقيقة في الجلسة، والبرنامجُ المنزليّ يوميّ.",
      "The phased programme and its cards under 'Programme by phase': 30–40 minutes per session, plus the daily home programme."],
    note: ["أساسيٌّ في كلّ جلسة — الأساسُ في كلّ الإرشادات (NICE · JOSPT · ACP · WHO · Cochrane). والجهازُ المساعد يهدّئ الألمَ ليسهل التمرين، والتمرينُ هو الذي يعالج.",
      "Core in every session — the core intervention in every guideline (NICE · JOSPT · ACP · WHO · Cochrane). The adjunct device eases pain so exercise is easier; exercise is what treats."] },
  { code: "tecar", use: "adjunct", evidence: "optional", minutes: 15, ord: 1,
    params: { mode: "CAP → RES", powerPct: "20–40", durationMin: "10–15" },
    parameters: ["على العضلات المجاورة للفقرات القطنية (Paraspinal) في الانبطاح: النمطُ السعويّ (Capacitive) ٥ دقائق للأنسجة السطحية ثمّ المقاوِم (Resistive) ٥–١٠ دقائق للأعمق، بشدّةٍ يشعر معها المريضُ بدفءٍ مريحٍ لا حرارةٍ مزعجة، وقبل التمارين.",
      "Over the lumbar paraspinals in prone: capacitive mode 5 minutes for superficial tissue, then resistive 5–10 minutes for deeper tissue, at a comfortable warmth (never uncomfortable heat), before exercise."],
    note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدود: تجاربُ صغيرة بتخفيفٍ قصيرِ المدى للألم، ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو المعادن المزروعة في المنطقة أو الحمل أو الأورام أو ضعف الإحساس.",
      "Rotating adjunct — used by the centre with good results (Saleem). Limited evidence: small trials of short-term pain relief; not addressed by guidelines. Contraindicated with a pacemaker, metal implants in the area, pregnancy, tumours or impaired sensation."] },
  { code: "megnatik", use: "adjunct", evidence: "optional", minutes: 15, ord: 2,
    params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
    parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على أسفل الظهر في الاستلقاء أو الانبطاح المريح، قبل التمارين.",
      "Pulsed electromagnetic field (PEMF) over the low back in comfortable supine or prone, before exercise."],
    note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدودٌ ومتضارب في ألم الظهر المزمن. ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
      "Rotating adjunct — used by the centre with good results (Saleem). Limited, conflicting evidence in chronic low back pain. Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
  { code: "traction", use: "adjunct", evidence: "not_recommended", minutes: 15, ord: 3,
    params: { forcePctBw: "25–50", holdRestS: "60 / 20", durationMin: "10–15", mode: "Intermittent" },
    parameters: ["الشدُّ القطنيّ المتقطّع في الاستلقاء والوركان والركبتان بزاوية ٩٠° (90/90) بحزام الحوض والصدر: ابدأ بـ٢٥٪ من وزن الجسم في الجلسة الأولى وزِد حتى ٥٠٪ حسب الاستجابة، ثمّ تمرّن بعده.",
      "Intermittent lumbar traction in supine with hips and knees at 90/90 using pelvic and thoracic belts: start at 25% of body weight in the first session and progress up to 50% as tolerated, then exercise."],
    note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم)، والإرشاداتُ لا توصي به روتينياً (NICE NG59 · WHO 2023)؛ فلا يُعطى وحده. ممنوعٌ مع هشاشة العظام أو الكسور أو الأورام أو عدم ثبات الفقرات أو أعراض ذيل الفرس (Cauda equina) أو الحمل.",
      "Rotating adjunct — used by the centre with good results (Saleem); guidelines advise against routine use (NICE NG59 · WHO 2023), so never on its own. Contraindicated with osteoporosis, fracture, tumour, spinal instability, cauda equina symptoms or pregnancy."] },
  { code: "electro", use: "adjunct", evidence: "not_recommended", minutes: 15, ord: 4,
    params: { currentType: "TENS / IFC", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
    parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS) أو التيارُ المتداخل (IFC): أربعةُ أقطابٍ حول منطقة الألم، بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباضٍ عضليّ، قبل التمارين.",
      "Conventional TENS or interferential current (IFC): four electrodes around the painful area, at a strong but comfortable tingling with no muscle contraction, before exercise."],
    note: ["مساعدٌ بالتناوب — يستعمله المركزُ لتهدئة الألم (سليم)، والإرشاداتُ لا توصي به روتينياً (NICE NG59 · WHO 2023)؛ فلا يُعطى وحده. ممنوعٌ مع منظّم ضربات القلب أو على البطن في الحمل أو على جلدٍ متضرّر أو ضعيف الإحساس.",
      "Rotating adjunct — used by the centre for pain relief (Saleem); guidelines advise against routine use (NICE NG59 · WHO 2023), so never on its own. Contraindicated with a pacemaker, over the abdomen in pregnancy, or on damaged or insensate skin."] },
  { code: "hot_pack", use: "adjunct", evidence: "optional", minutes: 15, ord: 5,
    params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
    parameters: ["على أسفل الظهر في الانبطاح أو الاستلقاء الجانبي، قبل التمارين لا بدلها. افحص الجلد قبل الكمادة وبعدها.",
      "Over the low back in prone or side-lying, before exercise, never instead of it. Check the skin before and after."],
    note: ["مساعدٌ بالتناوب، قصيرُ المدى لمن تخفّف الحرارةُ ألمَه وتسهّل حركته؛ لا دليلَ على أثرٍ طويل في الألم المزمن. ممنوعٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
      "Rotating adjunct, short-term, for patients whose pain and movement ease with heat; no evidence of long-term effect in chronic pain. Contraindicated with impaired sensation, poor circulation or open wounds."] },
  { code: "infrared", use: "adjunct", evidence: "optional", minutes: 10, ord: 6,
    params: { distanceCm: "45–60", durationMin: "10–15" },
    parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسها.", "Alternative to the hot pack when unavailable, with the same precautions."],
    note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only; never given alone."] },
  { code: "needle", use: "adjunct", evidence: "optional", minutes: 10, ord: 7,
    params: { needleSize: "0.30 × 50–60", points: "2–4", sessions: "1 / week × 3–6" },
    parameters: ["النقاطُ الزنادية (Trigger points) في المربّعة القطنية (Quadratus lumborum) والألوية الوسطى والصغرى (Gluteus medius / minimus) وباسطات الظهر (Erector spinae)، بطريقة الإدخال والإخراج السريع حتى استجابة الارتعاش الموضعية (Local twitch response)، ضمن جلسة التمارين ومعها.",
      "Trigger points in quadratus lumborum, gluteus medius/minimus and erector spinae using a fast-in/fast-out technique to elicit local twitch responses, within and alongside the exercise session."],
    note: ["مساعدٌ بالتناوب، للمرخَّص بالإبر الجافة وحده. يُتجنّب الإدخالُ العميق فوق الضلع الثاني عشر (خطرُ الرئة)، وتُوجَّه الإبرةُ في المربّعة القطنية نحو النتوء المستعرض. يقلّل الألمَ قصيرَ المدى حين يُضاف إلى التمارين (JOSPT 2021 · WHO 2023)، ولا يُعطى وحده.",
      "Rotating adjunct, dry-needling certified staff only. Avoid deep insertion above the 12th rib (pneumothorax risk) and direct the needle towards the transverse process in quadratus lumborum. Reduces short-term pain when added to exercise (JOSPT 2021 · WHO 2023); never given alone."] },
  { code: "laser", use: "not_used", evidence: "not_recommended", minutes: null, params: {}, parameters: null, ord: 8,
    note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — دليلٌ منخفضُ الجودة ومتضارب، ولا تضعه الإرشاداتُ ضمن العلاج الأساسيّ.",
      "Not used by the centre for this condition (not mentioned by Saleem) — low-quality, conflicting evidence; not part of guideline-recommended core care."] },
  { code: "ultrasound", use: "not_used", evidence: "not_recommended", minutes: null, params: {}, parameters: null, ord: 9,
    note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — والأمواجُ فوق الصوتية العلاجية لا تُقدَّم (NICE NG59).",
      "Not used by the centre for this condition (not mentioned by Saleem) — therapeutic ultrasound is not offered (NICE NG59)."] },
];

const rows = LBP.map((r) => `(${[
  lit(r.code), lit(r.use), lit(r.evidence), `${num(r.minutes)}::int`, `${lit(JSON.stringify(r.params))}::jsonb`,
  `${lit(r.parameters?.[0])}::text`, `${lit(r.parameters?.[1])}::text`, lit(r.note[0]), lit(r.note[1]), String(r.ord),
].join(", ")})`).join(",\n    ");

export const sql = `
ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS centre_use TEXT;
ALTER TABLE physio_protocol_devices DROP CONSTRAINT IF EXISTS physio_protocol_devices_centre_use_check;
ALTER TABLE physio_protocol_devices ADD CONSTRAINT physio_protocol_devices_centre_use_check
  CHECK (centre_use IS NULL OR centre_use IN ('core', 'adjunct', 'not_used'));

ALTER TABLE physio_plan_devices ADD COLUMN IF NOT EXISTS centre_use TEXT;
ALTER TABLE physio_plan_devices DROP CONSTRAINT IF EXISTS physio_plan_devices_centre_use_check;
ALTER TABLE physio_plan_devices ADD CONSTRAINT physio_plan_devices_centre_use_check
  CHECK (centre_use IS NULL OR centre_use IN ('core', 'adjunct'));

ALTER TABLE physio_plan_session_items ADD COLUMN IF NOT EXISTS off_turn BOOLEAN NOT NULL DEFAULT false;

UPDATE physio_protocol_devices pd SET
  centre_use = v.use, evidence = v.evidence, minutes = v.minutes, params = v.params,
  parameters = v.parameters, parameters_en = v.parameters_en, note = v.note, note_en = v.note_en, display_order = v.ord
FROM physio_protocols p, devices d, (VALUES
    ${rows}
  ) AS v(code, use, evidence, minutes, params, parameters, parameters_en, note, note_en, ord)
WHERE pd.protocol_id = p.id AND p.code = 'lbp-chronic-adult' AND p.updated_by IS NULL
  AND pd.device_id = d.id AND d.code = v.code AND pd.centre_use IS NULL;
`;
