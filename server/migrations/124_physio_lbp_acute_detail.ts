// Migration 124: ألمُ أسفل الظهر الحادّ وتحت الحادّ — البروتوكولُ الثاني مفصَّلاً (§4.dg — ٢٠٢٦-١٠-١٠).
//
// قرارُ المالك بعد أن اعتمد سليمٌ الأوّل: «ننتقل للبروتوكولات… وعلى غرار أوّل بروتوكول من ناحية كلّ التفاصيل وبدقّة وبدون استثناء». فهذا الثاني
// بالترتيب المتّفق عليه (§4.cx)، **بالقالب كما استقرّ بعد ترحيلَي ١٢٢ و١٢٣** (§4.dd): عددُ الجلسات وتواترُها لهذه الحالة (١٢ × ستّ في الأسبوع × ٥٠
// دقيقة — «الحادُّ أقصرُ بكثير»)، وثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة، وتمارينُ من المكتبة بجرعتها في كلّ مرحلة (أربعُ بطاقاتٍ جديدة
// والباقي من البروتوكول الأوّل برموزها)، ولكلّ جهازٍ درجةُ دليله و«استعمالُ المركز» وإعداداتٌ أولى، وبرنامجٌ منزليّ حتى الأسبوع السادس وزيارةُ متابعة،
// والمقاييسُ كما زُرعت (ODI · مسافةُ الأصابع عن الأرض، والألمُ لكلّ مريض). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **والفرقُ عن المزمن في الجوهر لا في الشكل**: المسارُ الطبيعيّ للحادّ جيّد، فالأساسُ الطمأنةُ والبقاءُ نشيطاً، والعلاجُ اليدويّ والحرارةُ السطحية
// أقوى ما يخفّف الألمَ قصيرَ المدى، والتصنيفُ العلاجيّ يوجّه الجلساتِ الأولى، و**منعُ الإزمان** (STarT Back) **ومنعُ العودة** (التمرينُ المستمرّ) هدفان.
//
// المصادر: NICE NG59 · JOSPT CPG Revision 2021 · ACP 2017 · سلسلة The Lancet 2018 · STarT Back (2011) · Cochrane (الحرارة 2006 · الراحة في الفراش 2010)
// · Costa 2012 (المآل) · Steffens 2016 (الوقاية) · Childs 2004 (قاعدةُ التحريك) · Long 2004 (التفضيل الاتّجاهيّ) · Fritz 2007 (التصنيف العلاجيّ).
// القواعدُ في `physio_content.ts`: بطاقاتٌ لا تُمَسّ إن وُجدت، والنصوصُ لا تُكتب فوق تعديل إنسان، والمراحلُ لا تتكرّر، والخططُ المفتوحة تأخذ نسختَها.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٥ من ١٠ مقبول إن لم ينتشر إلى الساق وعاد إلى مستواه المعتاد قبل صباح اليوم التالي — وفي الأيّام الأولى تبقى الحركةُ في المدى المريح.";
const PAIN_RULE_EN = "Pain up to 5/10 during exercise is acceptable if it does not spread into the leg and settles to its usual level by the next morning — in the first days, movement stays within the comfortable range.";

const ALTERNATE_AR = "يوماً بعد يوم في المركز — لا يومين متتاليين؛ وفي البيت مرّتين أو ثلاثاً في الأسبوع.";
const ALTERNATE_EN = "Alternate days in the clinic — never on consecutive days; two to three times a week at home.";
const WARMUP: [string, string] = ["إحماءٌ: ١٠ تكرارات قبل التمارين.", "Warm-up: 10 repetitions before exercising."];

/** **البطاقاتُ الجديدة** — الباقي من البروتوكول الأوّل (ترحيل ١١٩) برموزه، لا يُعاد زرعُه ولا يُمَسّ. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "log-roll", nameAr: "النهوض من السرير بالتدحرج الجانبيّ", nameEn: "Log roll (getting in and out of bed)",
    kind: "functional", region: "lumbar", sets: 1, reps: 3,
    purpose: ["يقلّل الألمَ الحادّ عند النهوض من السرير والاستلقاء عليه: الجذعُ يتحرّك قطعةً واحدة بلا لفٍّ ولا عطفٍ مفاجئ، والذراعان والساقان تعملان — مهارةٌ يحتاجها المريضُ من اليوم الأوّل، ويتركها حين يهدأ الألم.",
      "Reduces acute pain when getting out of and into bed: the trunk moves as one unit without sudden twisting or bending, and the arms and legs do the work — a skill needed from day one and dropped once pain settles."],
    start: ["مستلقٍ على الظهر قريباً من حافّة السرير، الركبتان مثنيّتان والقدمان على السرير.",
      "Lying on the back close to the edge of the bed, knees bent, feet on the bed."],
    steps: [[
      "شدَّ عضلاتِ البطن شدّاً خفيفاً وتنفّس طبيعياً — لا تحبس النفس.",
      "تدحرج إلى جنبك نحو حافّة السرير: الكتفان والحوضُ والركبتان معاً قطعةً واحدة كجذع شجرة.",
      "أنزِل الساقين معاً عن حافّة السرير ببطء.",
      "وفي اللحظة نفسِها ادفع السريرَ بالمرفق السفليّ ثمّ باليد العليا لترفع جذعك إلى الجلوس — ووزنُ الساقين وهما تنزلان يساعدك.",
      "اجلس لحظةً على الحافّة، ثمّ قُم بالانحناء من الورك ويداك على الفخذين. وللاستلقاء: اعكس الخطوات.",
    ], [
      "Brace the abdominal muscles lightly and breathe normally — do not hold the breath.",
      "Roll onto your side towards the edge of the bed: shoulders, pelvis and knees move together as one unit, like a log.",
      "Lower both legs together off the edge of the bed, slowly.",
      "At the same moment push into the bed with the lower elbow and then the upper hand to raise the trunk to sitting — the weight of the legs as they lower helps you.",
      "Sit for a moment on the edge, then stand by hinging at the hips with the hands on the thighs. To lie down, reverse the steps.",
    ]],
    cues: [[
      "الكتفان يدوران قبل الحوض (التواء) ⟵ قطعةٌ واحدة.",
      "النهوضُ مباشرةً من الاستلقاء على الظهر كالقيام من تمرين البطن ⟵ دائماً من الجنب.",
      "اندفاعٌ سريع مع حبس النفس ⟵ ببطء، وزفيرٌ أثناء الدفع.",
    ], [
      "Shoulders turn before the pelvis (twisting) → move as one unit.",
      "Sitting straight up from lying on the back, like a sit-up → always come up from the side.",
      "Rushing with a held breath → slowly, breathing out while pushing.",
    ]],
    easier: ["مع شخصٍ يسند الكتفَ العليا، أو سريرٌ أعلى، أو حبلٌ أو مقبضٌ يُمسك.", "With someone supporting the upper shoulder, a higher bed, or a rail or rope to hold."],
    harder: ["الطريقةُ نفسُها في السيارة: الجلوسُ على المقعد أوّلاً ثمّ إدخالُ الساقين معاً والجذعُ قطعةٌ واحدة — والخروجُ بعكسها.",
      "The same method for the car: sit on the seat first, then swing both legs in together with the trunk as one unit — and the reverse to get out."],
    stopIf: ["ألمٌ شديد يمنع الحركة كلّياً، أو ألمٌ ينتشر إلى الساقين، أو خدرٌ جديد.", "Severe pain that prevents any movement, pain spreading into the legs, or new numbness."],
    equipment: ["سرير.", "Bed."],
    doseNote: ["تُتدرَّب ٣ مرّات في الجلسة الأولى، ثمّ تُستعمل عند كلّ نهوضٍ واستلقاء ما دام الألمُ حادّاً.",
      "Practise 3 times in the first session, then use it every time you get up or lie down while pain is acute."],
    images: [
      { key: "log-roll-1", ar: "مستلقٍ على الجنب عند حافّة السرير والركبتان مثنيّتان", en: "Side-lying at the edge of the bed with knees bent", search: "log roll side lying bed" },
      { key: "log-roll-2", ar: "النهوضُ إلى الجلوس بدفع السرير باليدين والساقان تنزلان عن الحافّة", en: "Pushing up to sitting with the arms as the legs lower off the edge", search: "log roll sit up from bed" },
    ],
  },
  {
    code: "standing-extension", nameAr: "البسط من الوقوف", nameEn: "Standing back extension (McKenzie)",
    kind: "mobility", region: "lumbar", sets: 1, reps: 10, hold: 2,
    purpose: ["لمن ظهر عنده في التقييم تفضيلُ البسط (Directional preference): نسخةٌ واقفة من البسط المتكرّر تُؤدّى في أيّ مكان — بعد الجلوس الطويل أو الانحناء — فتخفّف الألمَ وتمركزه نحو الظهر وتكسر وضعيةَ العطف الطويلة.",
      "For patients with an extension directional preference on assessment: a standing form of repeated extension that can be done anywhere — after prolonged sitting or bending — to ease and centralise pain and break up sustained flexion."],
    start: ["واقفٌ والقدمان بعرض الكتفين، والكفّان على أسفل الظهر والأصابعُ تشير إلى الأسفل، والركبتان مستقيمتان بلا تيبّس.",
      "Standing with the feet shoulder-width apart, palms on the low back with the fingers pointing down, knees straight but not locked."],
    steps: [[
      "انظر إلى الأمام وخذ نفساً.",
      "مع الزفير، مِل بالجذع إلى الخلف ببطء فوق يديك، والحوضُ يتقدّم قليلاً إلى الأمام.",
      "اذهب إلى حيث يسمح الألم، واثبت ثانيتين.",
      "عُد إلى الوقوف المستقيم.",
      "زِد المدى قليلاً مع كلّ تكرار ما دام الألمُ يخفّ أو يتمركز نحو الظهر.",
    ], [
      "Look ahead and take a breath.",
      "As you breathe out, lean the trunk back slowly over your hands, letting the pelvis move slightly forwards.",
      "Go as far as symptoms allow and hold for 2 seconds.",
      "Return to upright standing.",
      "Increase the range a little each repetition as long as pain eases or centralises towards the spine.",
    ]],
    cues: [[
      "ثنيُ الركبتين أو رميُ الرأس إلى الخلف ⟵ الحركةُ من أسفل الظهر، والرأسُ يتبع الجذع.",
      "المدى كلُّه من التكرار الأوّل ⟵ يزيد تدريجياً.",
      "الاستمرارُ مع انتشار الألم إلى الساق ⟵ توقّف فوراً وأخبر الأخصائيّ.",
    ], [
      "Bending the knees or throwing the head back → the movement comes from the low back; the head follows the trunk.",
      "Full range from the first repetition → build up gradually.",
      "Continuing while pain spreads into the leg → stop immediately and inform the specialist.",
    ]],
    easier: ["مدىً صغير بلا ثبات، أو البسطُ من الانبطاح متّكئاً على المرفقين.", "Small range without a hold, or prone extension resting on the elbows."],
    harder: ["البسطُ من الانبطاح بالمدى الكامل (تمرينُ ماكنزي) في البيت، وهذا في العمل والطريق.", "Full-range prone press-ups (McKenzie) at home, and this one at work and on the go."],
    stopIf: ["الألمُ ينتشر إلى الساق أو يبتعد عن الظهر (Peripheralisation)، أو دوخة — هذا التمرينُ لا يناسبه الآن؛ أخبر الأخصائيّ.",
      "Pain spreads into the leg or away from the spine (peripheralisation), or dizziness — this exercise does not suit you now; inform the specialist."],
    equipment: ["لا شيء.", "None."],
    doseNote: ["١٠ تكرارات كلّ ٢–٣ ساعات، وبعد كلّ جلوسٍ طويل أو انحناء — بحسب ما يقرّره الأخصائيّ.",
      "10 repetitions every 2–3 hours, and after any prolonged sitting or bending — as prescribed by the specialist."],
    images: [{ key: "standing-extension-1", ar: "واقفٌ يميل إلى الخلف والكفّان على أسفل الظهر", en: "Standing, leaning back with the palms on the low back", search: "standing back extension exercise" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "hook-lying-march", nameAr: "رفع القدم بالتناوب مع شدّ البطن في الاستلقاء", nameEn: "Hook-lying march with abdominal brace",
    kind: "motor_control", region: "lumbar", sets: 2, reps: 8, hold: 3, rest: 30, perSide: true,
    purpose: ["يعلّم المريضَ أن يُبقي الحوضَ والظهرَ ثابتين بشدٍّ خفيف لعضلات البطن بينما تتحرّك الساق — الخطوةُ بين شدّ البطن والكلب والطائر في تمارين التحكّم الحركيّ.",
      "Teaches the patient to keep the pelvis and spine still with a light abdominal brace while the leg moves — the step between abdominal bracing and the bird dog in motor-control training."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان والقدمان على الأرض، واليدان على عظمتَي الحوض الأماميّتين ليشعر بأيّ حركةٍ فيه.",
      "Lying on the back, knees bent, feet flat, hands on the front points of the pelvis to feel any movement."],
    steps: [[
      "شدَّ عضلاتِ البطن شدّاً خفيفاً (نحو ربع أقصى قوّة) وتنفّس طبيعياً.",
      "ارفع قدماً واحدة عن الأرض ببطء حتى تصير الركبةُ فوق الورك (٩٠°).",
      "اثبت ٣ ثوانٍ والحوضُ ثابتٌ تحت يديك — لا يميل ولا يدور.",
      "أنزِل القدمَ ببطء، وكرّر بالأخرى.",
      "كلُّ رفعةٍ تكرارٌ لجانبها.",
    ], [
      "Brace the abdominal muscles lightly (about a quarter of maximum effort) and breathe normally.",
      "Slowly lift one foot off the floor until the knee is above the hip (90°).",
      "Hold for 3 seconds with the pelvis still under your hands — no tilting or rotating.",
      "Lower the foot slowly and repeat with the other leg.",
      "Each lift counts as one repetition for that side.",
    ]],
    cues: [[
      "الحوضُ يميل أو يدور تحت اليدين ⟵ ارفع القدمَ أقلّ، أو شدَّ البطنَ أكثر قليلاً.",
      "تقوّسُ الظهر أو دفعُه بقوّة إلى الأرض ⟵ الظهرُ في وضعه المحايد.",
      "حبسُ النفس ⟵ تنفّس طوال التمرين.",
    ], [
      "Pelvis tilts or rotates under the hands → lift the foot less, or brace a little more.",
      "Arching the back or pressing it hard into the floor → keep the spine in neutral.",
      "Holding the breath → keep breathing throughout.",
    ]],
    easier: ["رفعُ الكعب وحده وأصابعُ القدم على الأرض، أو انزلاقُ الكعب على الأرض لتمديد الساق ثمّ إعادتها.",
      "Lift only the heel with the toes on the floor, or slide the heel along the floor to straighten the leg and bring it back."],
    harder: ["تمرينُ «الحشرة الميتة» (Dead bug): الساقان مرفوعتان والذراعان نحو السقف، وتُمَدّ ذراعٌ وساقٌ متقابلتان والظهرُ ثابت.",
      "Dead bug: both legs lifted and arms pointing to the ceiling, extending the opposite arm and leg while the spine stays still."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أو ينتشر إلى الساق.", "Pain above 5/10 or pain spreading into the leg."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["مرّةً أو مرّتين يومياً.", "Once or twice daily."],
    images: [{ key: "hook-lying-march-1", ar: "مستلقٍ والركبتان مثنيّتان، قدمٌ مرفوعة والركبةُ فوق الورك، واليدان على الحوض", en: "Crook lying, one foot lifted with the knee above the hip, hands on the pelvis", search: "supine marching core exercise" }],
  },
  {
    code: "figure-4-stretch", nameAr: "تمطيط الألوية (وضعية الرقم ٤)", nameEn: "Figure-4 gluteal (piriformis) stretch",
    kind: "stretch", region: "hip", sets: 1, reps: 3, hold: 30, perSide: true,
    purpose: ["يُرخي عضلاتِ الألوية والكمّثرية (Piriformis) التي تشتدّ دفاعاً مع ألم الظهر، ويحسّن حركةَ الورك فيخفّ العبءُ عن أسفل الظهر عند الانحناء والجلوس.",
      "Relaxes the gluteal and piriformis muscles that guard with back pain, and improves hip mobility so the low back is less loaded in bending and sitting."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان والقدمان على الأرض، ووسادةٌ رقيقة تحت الرأس.", "Lying on the back, knees bent, feet flat, a thin pillow under the head."],
    steps: [[
      "ضع كاحلَ الساق اليمنى على الفخذ الأيسر فوق الركبة (شكلُ الرقم ٤)، والركبةُ اليمنى تتّجه إلى الخارج.",
      "أمسك خلف الفخذ الأيسر بيديك (اليدُ اليمنى تمرّ بين الساقين).",
      "اسحب الفخذَ الأيسر نحو الصدر ببطء حتى تشعر بشدٍّ مريح في الألية اليمنى.",
      "اثبت ٣٠ ثانيةً وتنفّس ببطء، ثمّ أنزِل ببطء.",
      "كرّر بالجهة الأخرى.",
    ], [
      "Place the right ankle on the left thigh just above the knee (a figure 4), letting the right knee turn out.",
      "Hold behind the left thigh with both hands (the right hand passes between the legs).",
      "Slowly draw the left thigh towards the chest until a comfortable stretch is felt in the right buttock.",
      "Hold for 30 seconds breathing slowly, then lower slowly.",
      "Repeat on the other side.",
    ]],
    cues: [[
      "رفعُ الرأس والكتفين أو شدُّ الرقبة ⟵ الرأسُ على الوسادة.",
      "ألمٌ في الركبة المثنيّة ⟵ قلّل السحب، أو ضع الكاحلَ أبعد عن الركبة.",
      "السحبُ حتى الألم أو ارتدادٌ متكرّر ⟵ شدٌّ ثابتٌ مريح.",
    ], [
      "Lifting the head and shoulders or straining the neck → keep the head on the pillow.",
      "Pain in the bent knee → pull less, or place the ankle further from the knee.",
      "Pulling into pain or bouncing → a steady, comfortable stretch.",
    ]],
    easier: ["القدمُ الأخرى تبقى على الأرض بلا سحب، وتُدفع الركبةُ المثنيّة إلى الخارج برفق — أو الوضعيةُ نفسُها جالساً على كرسيّ مع ميلٍ خفيف إلى الأمام بظهرٍ مستقيم.",
      "Leave the other foot on the floor without pulling and gently push the bent knee outwards — or the same position sitting on a chair, leaning slightly forwards with a straight back."],
    harder: ["سحبُ الفخذ أقرب إلى الصدر، وثباتٌ ٤٥ ثانية.", "Draw the thigh closer to the chest and hold for 45 seconds."],
    stopIf: ["ألمٌ ينتشر إلى الساق (تهيّجُ العصب الوركيّ)، أو ألمٌ في مقدّمة الورك أو في الركبة؛ ويُمنع هذا الوضعُ بعد عملية تبديل مفصل الورك.",
      "Pain spreading into the leg (sciatic irritation), or pain at the front of the hip or in the knee; this position is not used after hip replacement."],
    equipment: ["فرشة، ووسادةٌ رقيقة.", "Mat, thin pillow."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [
      { key: "figure-4-stretch-1", ar: "مستلقٍ وكاحلٌ فوق الركبة المقابلة، واليدان تسحبان الفخذَ نحو الصدر", en: "Lying with one ankle over the opposite knee, hands drawing the thigh to the chest", search: "figure four stretch supine" },
      { key: "figure-4-stretch-2", ar: "الوضعيةُ نفسُها جالساً على كرسيّ مع ميلٍ إلى الأمام بظهرٍ مستقيم", en: "The same position sitting on a chair, leaning forwards with a straight back", search: "seated figure four stretch chair" },
    ],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "lbp-acute-adult",
  summary: [
    "ألمُ أسفل الظهر غيرُ النوعيّ (Non-specific) الحادّ (أقلّ من ٦ أسابيع) وتحت الحادّ (٦–١٢ أسبوعاً)، بلا علامات خطر ولا ألمٍ جذريٍّ في الساق — من أكثر أسباب مراجعة الطبيب والغياب عن العمل. " +
    "مسارُه الطبيعيّ جيّد: يتحسّن أغلبُ المرضى كثيراً خلال الأسابيع الستّة الأولى، لكنّ النوبةَ تعود عند كثيرين خلال السنة، وقلّةٌ تتحوّل إلى ألمٍ مزمن — والخوفُ من الحركة والراحةُ في الفراش أقوى ما يدفع إلى ذلك. " +
    "لذلك الأساسُ الطمأنةُ والتعليمُ والبقاءُ نشيطاً (Stay active)، ومعها علاجٌ يدويّ وحرارةٌ سطحية تخفّفان الألمَ قصيرَ المدى، وتمارينُ الاتّجاه المفضَّل والتحكّم الحركيّ، ثمّ برنامجٌ يمنع عودةَ النوبة. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة، ويُصنَّف المريضُ في التقييم الأوّل بأداة STarT Back والتصنيف العلاجيّ (Treatment-based classification) ليأخذ ما يناسبه.",
    "Acute (under 6 weeks) and subacute (6–12 weeks) non-specific low back pain, without red flags or radicular leg pain — one of the commonest reasons for seeing a doctor and for time off work. " +
    "Its natural course is favourable: most patients improve markedly within the first six weeks, but episodes recur in many within a year and a minority develop chronic pain — fear of movement and bed rest are the strongest drivers. " +
    "The core of care is therefore reassurance, education and staying active, supported by manual therapy and superficial heat for short-term relief, directional-preference and motor-control exercise, and then a programme to prevent recurrence. " +
    "The programme runs in three phases with session ranges and written progression criteria; at the first assessment the patient is stratified with the STarT Back Tool and the treatment-based classification so that care matches the patient.",
  ],
  goals: [
    "١. الطمأنةُ: يفهم المريضُ أنّ ألمَه غيرُ خطير وأنّ البقاءَ نشيطاً يسرّع التحسّن، ويستمرّ في عمله وأنشطته (معدَّلةً إن لزم) من الأسبوع الأوّل.\n" +
    "٢. خفضُ الألم (NPRS) إلى ٢ من ١٠ أو أقلّ مع الأنشطة اليومية — والفرقُ ذو المعنى سريرياً نقطتان أو ٣٠٪.\n" +
    "٣. خفضُ الإعاقة بمؤشر أوزوستري (ODI) إلى ٢٠٪ فأقلّ (إعاقةٌ بسيطة)، أو ٥٠٪ على الأقلّ من قيمته الأولى.\n" +
    "٤. مشيٌ متّصل ٣٠ دقيقة، والعودةُ الكاملة إلى العمل والأنشطة الثلاثة التي اختارها المريض في التقييم الأوّل (PSFS ٧ من ١٠ أو أكثر).\n" +
    "٥. منعُ الإزمان: لا يبقى خطرُ STarT Back مرتفعاً عند التخرّج، والخوفُ من الحركة يُعالَج مبكّراً.\n" +
    "٦. منعُ العودة: برنامجُ تمارين منزليّ مستمرّ وخطّةٌ مكتوبة للانتكاسة قبل التخرّج.",
    "1. Reassurance: the patient understands that the pain is not serious and that staying active speeds recovery, and keeps working and doing usual activities (modified if needed) from the first week.\n" +
    "2. Reduce pain (NPRS) to 2/10 or less with daily activities — a clinically meaningful change is 2 points or 30%.\n" +
    "3. Reduce disability on the Oswestry Disability Index (ODI) to 20% or less (minimal disability), or by at least 50% of baseline.\n" +
    "4. Walk 30 minutes continuously and return fully to work and to the three activities chosen at baseline (PSFS ≥ 7/10).\n" +
    "5. Prevent chronicity: STarT Back risk is no longer high at discharge, and fear of movement is addressed early.\n" +
    "6. Prevent recurrence: an ongoing home exercise programme and a written flare-up plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين):\n" +
    "• فرزُ علامات الخطر (Red flags) — انظر «موانع الاستعمال»؛ أيُّ علامةٍ منها تُوقف البرنامج حتى يراه الطبيب.\n" +
    "• القصّة: حادّ (أقلّ من ٦ أسابيع) أم تحت الحادّ (٦–١٢ أسبوعاً)، ونوبةٌ أولى أم متكرّرة، وكيف بدأ، وما الذي يزيده ويخفّفه، وشدّةُ التهيّج (Irritability): كم يثور الألمُ بحركةٍ قليلة وكم يطول هدوؤه.\n" +
    "• ألمُ الساق: ألمٌ تحت الركبة مع خدرٍ أو ضعفٍ أو علاماتٍ عصبية ⟵ بروتوكولُ اعتلال الجذر القطنيّ (عِرق النسا)، لا هذا.\n" +
    "• خطرُ الإزمان بأداة STarT Back (منخفض · متوسّط · مرتفع): المنخفضُ تكفيه غالباً الطمأنةُ والتعليمُ والبرنامجُ المنزليّ بجلساتٍ أقلّ، والمتوسّطُ هذا البرنامج، والمرتفعُ هذا البرنامج بمقاربةٍ نفسيةٍ مُدمَجة (Psychologically informed): تعرّضٌ متدرّج للحركات المخيفة، وتحدٍّ هادئ لمعتقدات الخوف، وأهدافٌ وظيفية — وقد يحتاج إحالةً نفسية.\n" +
    "• المقاييس: الألمُ الآن وأسوأُه في الأسبوع (NPRS ٠–١٠)، ومؤشرُ أوزوستري (ODI)، ومقياسُ الوظيفة الخاصّ بالمريض (PSFS: ثلاثةُ أنشطةٍ يصعب عليه أداؤها، كلٌّ ٠–١٠)، واستبيانُ معتقدات الخوف والتجنّب في العمل (FABQ-W)، ومسافةُ الأصابع عن الأرض عند الانحناء.\n" +
    "• الفحص: الوقفةُ (انحرافٌ جانبيّ Lateral shift؟)، ومدى الحركة، والحركاتُ المتكرّرة لمعرفة التفضيل الاتّجاهيّ (Directional preference): هل يتمركز الألمُ أو يخفّ بالبسط أو العطف المتكرّر؛ والحركاتُ الشاذّة أثناء العطف والعودة (Aberrant movements)؛ واختبارُ عدم الثبات في الانبطاح (Prone instability test)؛ وحركةُ الفقرات بالضغط الخلفيّ الأماميّ (PA spring test)؛ ودورانُ الورك الداخليّ؛ والفحصُ العصبيّ (رفعُ الساق المستقيمة SLR، والقوّة، والحسّ، والمنعكسات) إن كان في الساق ألم.\n" +
    "• التصنيفُ العلاجيّ (Treatment-based classification) يوجّه الجلساتِ الأولى، وقد يجمع المريضُ أكثر من صنف:\n" +
    "  ١. التحريك (Manipulation) — قاعدةُ التنبّؤ (Childs 2004)، أربعٌ من خمس: ألمٌ منذ أقلّ من ١٦ يوماً، ولا أعراضَ تحت الركبة، وFABQ-W أقلّ من ١٩، وتيبّسٌ في فقرةٍ قطنية واحدة على الأقلّ، ودورانٌ داخليّ لوركٍ واحدٍ على الأقلّ أكثر من ٣٥°.\n" +
    "  ٢. تمارينُ الاتّجاه المفضَّل (Specific exercise) — ألمٌ يتمركز أو يخفّ باتّجاهٍ واحد من الحركة المتكرّرة.\n" +
    "  ٣. التحكّمُ الحركيّ والتثبيت (Stabilisation) — حركاتٌ شاذّة، واختبارُ عدم الثبات إيجابيّ، ونوباتٌ متكرّرة، وعمرٌ أصغر غالباً.\n" +
    "إعادةُ التقييم: سؤالٌ وفحصٌ قصير في كلّ جلسة (ما الذي تغيّر منذ الجلسة الماضية؟)، والمقاييسُ كاملةً عند الجلسة الخامسة أو السادسة وعند الجلسة الأخيرة وفي زيارة المتابعة بعد التخرّج بأربعة أسابيع. ومَن لم يتحسّن بعد ٤–٦ جلسات: إعادةُ التصنيف وفرزُ علامات الخطر والعوامل النفسية، وقد يحتاج الطبيب؛ وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.",
    "Initial assessment (before any exercise):\n" +
    "• Red-flag screen — see Contraindications; any red flag stops the programme until a doctor has reviewed the patient.\n" +
    "• History: acute (under 6 weeks) or subacute (6–12 weeks), first or recurrent episode, mode of onset, aggravating and easing factors, and irritability: how easily pain flares with little movement and how long it takes to settle.\n" +
    "• Leg pain: pain below the knee with numbness, weakness or neurological signs → the lumbar radiculopathy (sciatica) protocol, not this one.\n" +
    "• Risk of chronicity with the STarT Back Tool (low · medium · high): low risk usually needs only reassurance, education and the home programme with fewer sessions; medium risk this programme; high risk this programme with a psychologically informed approach — graded exposure to feared movements, calm challenge of fear beliefs and functional goals — and possibly psychological referral.\n" +
    "• Measures: current and worst pain in the past week (NPRS 0–10), Oswestry Disability Index (ODI), Patient-Specific Functional Scale (PSFS: three difficult activities, each 0–10), Fear-Avoidance Beliefs Questionnaire work subscale (FABQ-W), and fingertip-to-floor distance in forward bending.\n" +
    "• Examination: posture (lateral shift?), range of motion, repeated movements to identify a directional preference (does pain centralise or ease with repeated extension or flexion?), aberrant movements during flexion and return, the prone instability test, segmental mobility (PA spring test), hip internal rotation, and a neurological screen (straight leg raise, myotomes, dermatomes, reflexes) if there is leg pain.\n" +
    "• The treatment-based classification guides the first sessions; a patient may fit more than one subgroup:\n" +
    "  1. Manipulation — clinical prediction rule (Childs 2004), four of five: symptoms under 16 days, no symptoms below the knee, FABQ-W under 19, hypomobility at one or more lumbar levels, and more than 35° internal rotation in at least one hip.\n" +
    "  2. Specific (directional-preference) exercise — pain centralises or eases with one direction of repeated movement.\n" +
    "  3. Stabilisation (motor control) — aberrant movements, a positive prone instability test, recurrent episodes, usually younger patients.\n" +
    "Reassessment: brief questions and re-testing every session (what has changed since last time?), and the full measures at session 5 or 6, at the last session and at the follow-up visit four weeks after discharge. If there is no improvement after 4–6 sessions: re-classify and re-screen red flags and psychosocial factors, and consider medical review; phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — التهدئةُ والطمأنة والحركةُ المريحة (الجلسات ١–٤): التنفّسُ الحجابيّ، والنهوضُ من السرير بالتدحرج، وإمالةُ الحوض، وتدويرُ الجذع السفليّ، والقطّ والجمل في المدى المريح، وتمرينُ الاتّجاه المفضَّل (البسطُ من الانبطاح ومن الوقوف لمن يفضّل البسط، أو الركبةُ إلى الصدر لمن يرتاح بالعطف)، والمشيُ القصير المتكرّر يومياً.\n" +
    "المرحلة ٢ — استعادةُ الحركة وتنشيطُ الجذع (الجلسات ٥–٩): شدُّ البطن، ورفعُ القدم بالتناوب، والجسر، والكلبُ والطائر، والجسرُ الجانبيّ على الركبتين، وتمرينُ البطن المعدَّل (McGill)، وتمطيطُ الألوية، والجلوسُ والقيام، والمشيُ ٢٠–٣٠ دقيقة.\n" +
    "المرحلة ٣ — العودةُ إلى النشاط الكامل والوقاية من العودة (الجلسات ١٠–١٢): الانحناءُ من الورك بالعصا، ورفعُ الثقل من الأرض بالورك، وحملُ الثقل بيدٍ واحدة والمشي، والجسرُ الجانبيّ، واللوحُ الأماميّ، والمشيُ ٣٠ دقيقة.\n" +
    "البرنامجُ: ١٢ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه: منخفضُ الخطر في STarT Back يكفيه غالباً عددٌ أقلّ للطمأنة والتعليم وتسليم البرنامج المنزليّ، ومرتفعُ الخطر قد يحتاج أكثر. " +
    "والبرنامجُ المنزليّ يوميّ في كلّ المراحل، ويستمرّ بعد الجلسة الأخيرة حتى نهاية الأسبوع السادس، مع زيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع. " +
    "وتمارينُ الثقل (رفعُ الثقل من الأرض، والحملُ بيدٍ واحدة والمشي) يوماً بعد يوم — لا يومين متتاليين؛ والحركةُ والتحكّمُ والمشيُ يومياً. " +
    "والجلسةُ في المركز للطمأنة والتعليم والتصحيح والتدرّج. " + PAIN_RULE_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Settle, reassure and move comfortably (sessions 1–4): diaphragmatic breathing, log roll, posterior pelvic tilt, lower trunk rotation, cat–camel within the comfortable range, the directional-preference exercise (prone and standing extension for an extension preference, or knee to chest for a flexion preference), and short, frequent daily walks.\n" +
    "Phase 2 — Restore movement and activate the trunk (sessions 5–9): abdominal bracing, hook-lying march, glute bridge, bird dog, modified side plank, McGill curl-up, figure-4 gluteal stretch, sit to stand, and walking 20–30 minutes.\n" +
    "Phase 3 — Return to full activity and prevent recurrence (sessions 10–12): hip hinge with dowel, kettlebell deadlift, suitcase carry, side plank, front plank, and walking 30 minutes.\n" +
    "Programme: 12 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient: low STarT Back risk usually needs fewer, for reassurance, education and handing over the home programme, while high risk may need more. " +
    "The home programme is daily in every phase and continues after the last session until the end of week 6, with a follow-up visit and reassessment four weeks after discharge. " +
    "Loaded exercises (kettlebell deadlift, suitcase carry) on alternate days — never on consecutive days; mobility, motor control and walking daily. " +
    "Clinic sessions are for reassurance, teaching, correction and progression. " + PAIN_RULE_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ (Red flags) تُوقف البرنامج ويُحال المريضُ إلى الطبيب:\n" +
    "• فوراً (طوارئ): خدرٌ في منطقة السرج (حول الشرج والأعضاء التناسلية)، أو احتباسُ البول أو سلسُه أو فقدانُ التحكّم بالبراز حديثاً، أو ضعفٌ أو خدرٌ في الساقين معاً — اشتباهُ متلازمة ذيل الفرس (Cauda equina).\n" +
    "• ضعفٌ عصبيٌّ يزداد في ساق (سقوطُ القدم مثلاً).\n" +
    "• اشتباهُ كسر: رضٌّ كبير، أو رضٌّ بسيط مع هشاشة عظام أو استعمالٍ طويل للكورتيزون، أو ألمٌ مفاجئ فوق السبعين.\n" +
    "• اشتباهُ ورم: سرطانٌ سابق، أو نقصُ وزنٍ غيرُ مفسَّر، أو ألمٌ ليليٌّ ثابت لا يتغيّر بالوضعية، أو بدايةٌ جديدة بعد الخمسين.\n" +
    "• اشتباهُ عدوى: حمّى، أو ضعفُ مناعة، أو تعاطٍ بالوريد، أو عمليةٌ أو عدوى بولية حديثة.\n" +
    "• ألمٌ غيرُ ميكانيكيّ (لا يتغيّر بالحركة ولا بالراحة)، أو مع أعراضٍ بولية أو هضمية أو نسائية — قد يكون من الأحشاء (الكلية، البنكرياس، الحوض).\n" +
    "• ألمٌ في الصدر أو البطن يمتدّ إلى الظهر، أو نبضٌ محسوس في البطن (اشتباهُ أمّ الدم الأبهرية).\n" +
    "• اشتباهُ التهاب الفقار المحوريّ: تيبّسٌ صباحيّ أكثر من ٣٠ دقيقة يتحسّن بالحركة، وبدايةٌ قبل الخامسة والأربعين، واستيقاظٌ في النصف الثاني من الليل — إحالةٌ لطبيب الروماتيزم (وله بروتوكولُه).",
    "Red flags that stop the programme and require medical referral:\n" +
    "• Immediately (emergency): saddle anaesthesia, new urinary retention or incontinence or loss of bowel control, or bilateral leg weakness or numbness — suspected cauda equina syndrome.\n" +
    "• Progressive neurological deficit in a leg (e.g. foot drop).\n" +
    "• Suspected fracture: major trauma, minor trauma with osteoporosis or long-term corticosteroid use, or sudden pain over age 70.\n" +
    "• Suspected malignancy: past cancer, unexplained weight loss, constant night pain unaffected by position, or new onset after 50.\n" +
    "• Suspected infection: fever, immunosuppression, intravenous drug use, recent surgery or urinary infection.\n" +
    "• Non-mechanical pain (unchanged by movement or rest), or pain with urinary, digestive or gynaecological symptoms — possibly visceral (kidney, pancreas, pelvis).\n" +
    "• Chest or abdominal pain radiating to the back, or a pulsatile abdominal mass (suspected aortic aneurysm).\n" +
    "• Suspected axial spondyloarthritis: morning stiffness over 30 minutes that improves with movement, onset before 45, waking in the second half of the night — refer to rheumatology (separate protocol).",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد أكثر أو استمرّ، تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• الألمُ الذي ينتشر إلى الساق ويبتعد عن الظهر (Peripheralisation) أثناء تمرينٍ أو تحريكٍ يعني إيقافَه وإبلاغَ الأخصائيّ؛ وتمركزُه نحو الظهر علامةٌ جيّدة.\n" +
    "• التهيّجُ العالي في الأيّام الأولى (ألمٌ شديد يثور بحركةٍ قليلة ويطول هدوؤه): تمارينُ قليلةٌ لطيفة، ولا ثقلَ ولا شدَّ، والعلاجُ اليدويّ بدرجاتٍ لطيفة.\n" +
    "• التحريكُ السريع (Thrust manipulation) لا يُعطى مع هشاشة العظام، أو مضادّات التخثّر، أو الأمراض الالتهابية للمفاصل، أو العلامات العصبية، أو خوفٍ شديد منه — ويُستبدل بالتحريك اللطيف؛ وبموافقة المريض دائماً.\n" +
    "• هشاشةُ العظام: لا عطفَ للجذع مع حمل ولا لفَّ قويّاً.\n" +
    "• الحمل: لا استلقاءَ طويلاً على الظهر بعد الشهر الرابع، ولا تحريكَ سريعاً، ولا تيكار ولا مغناطيس، ولا تحفيزَ كهربائياً على البطن والحوض.\n" +
    "• أمراضُ القلب أو الضغطُ غيرُ المضبوط: النشاطُ بشدّةٍ معتدلة (يستطيع الكلام أثناءه)، ولا حبسَ للنفس.\n" +
    "• لا راحةَ في الفراش، ولا حزامَ ظهرٍ روتينياً، ولا أشعةَ ولا رنين روتينياً (قرارُ الطبيب — لا يغيّر العلاج في الحادّ بلا علامات خطر)، ولا لغةَ تخويفٍ مثل «فقرةٌ طالعة» أو «غضروفك انزلق» — الكلماتُ تؤثّر في الألم والتعافي.\n" +
    "• الدواءُ بوصفة الطبيب وحده؛ ومَن يمنعه الألمُ من النوم أو المشي رغم البرنامج يراجع الطبيب.",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If it is higher or lasts longer, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Pain that spreads down the leg and away from the spine (peripheralisation) during an exercise or a technique means stopping it and informing the specialist; centralisation towards the spine is a good sign.\n" +
    "• High irritability in the first days (severe pain that flares with little movement and settles slowly): few, gentle exercises, no loading and no traction, and gentle grades of manual therapy.\n" +
    "• Thrust manipulation is not used with osteoporosis, anticoagulants, inflammatory joint disease, neurological signs or marked fear of it — use gentle mobilisation instead; always with the patient's consent.\n" +
    "• Osteoporosis: no loaded trunk flexion or forceful twisting.\n" +
    "• Pregnancy: avoid prolonged supine lying after the fourth month; no thrust manipulation, no TECAR or magnetic therapy, and no electrical stimulation over the abdomen or pelvis.\n" +
    "• Cardiac disease or uncontrolled hypertension: moderate intensity (able to talk), and no breath holding.\n" +
    "• No bed rest, no routine lumbar belt, no routine X-ray or MRI (the doctor's decision — it does not change acute care without red flags), and no threatening language such as 'a vertebra has slipped out' or 'your disc has slipped' — words affect pain and recovery.\n" +
    "• Medication by the doctor's prescription only; a patient whom pain keeps from sleeping or walking despite the programme should see the doctor.",
  ],
  totalSessions: 12, spw: 6, weeks: 2, minutes: 50,
  refs: [
    { title: "Low back pain and sciatica in over 16s: assessment and management (NG59)", org: "NICE", year: 2016, url: "https://www.nice.org.uk/guidance/ng59" },
    { title: "Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021", org: "JOSPT / APTA Orthopaedics", year: 2021, url: "https://doi.org/10.2519/jospt.2021.0304" },
    { title: "Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians", org: "ACP (Annals of Internal Medicine)", year: 2017, url: "https://doi.org/10.7326/M16-2367" },
    { title: "Prevention and treatment of low back pain: evidence, challenges, and promising directions", org: "The Lancet Low Back Pain Series (Foster et al.)", year: 2018, url: "https://doi.org/10.1016/S0140-6736(18)30489-6" },
    { title: "Comparison of stratified primary care management for low back pain with current best practice (STarT Back)", org: "The Lancet (Hill et al.)", year: 2011, url: "https://doi.org/10.1016/S0140-6736(11)60937-9" },
    { title: "Superficial heat or cold for low back pain", org: "Cochrane Database of Systematic Reviews (French et al.)", year: 2006 },
    { title: "Advice to rest in bed versus advice to stay active for acute low-back pain and sciatica", org: "Cochrane Database of Systematic Reviews (Dahm et al.)", year: 2010 },
    { title: "The prognosis of acute and persistent low-back pain: a meta-analysis", org: "CMAJ (da C Menezes Costa et al.)", year: 2012, url: "https://doi.org/10.1503/cmaj.111271" },
    { title: "Prevention of Low Back Pain: A Systematic Review and Meta-analysis", org: "JAMA Internal Medicine (Steffens et al.)", year: 2016, url: "https://doi.org/10.1001/jamainternmed.2015.7431" },
    { title: "A clinical prediction rule to identify patients with low back pain most likely to benefit from spinal manipulation: a validation study", org: "Annals of Internal Medicine (Childs et al.)", year: 2004 },
    { title: "Does it matter which exercise? A randomized control trial of exercise for low back pain", org: "Spine (Long et al.)", year: 2004 },
    { title: "Subgrouping patients with low back pain: evolution of a classification approach to physical therapy", org: "JOSPT (Fritz, Cleland, Childs)", year: 2007 },
  ],
  //  التمارينُ أوّلاً، ثمّ المساعدُ بترتيبه (الحرارةُ أوّلاً — أقواها دليلاً في الحادّ)، ثمّ ما لا يُستخدم. والمساعدُ يؤشّره الأخصائيُّ لمريضه (§4.dd).
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٢٥–٣٥ دقيقة في الجلسة مع الطمأنة والتعليم، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 25–35 minutes per session with reassurance and education, plus the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة. وفي الحادّ الدليلُ الأقوى للطمأنة والبقاء نشيطاً (NICE · Lancet 2018 · Cochrane 2010)، والتمرينُ وسيلتُهما: تمرينُ الاتّجاه المفضَّل يخفّف الألمَ لمن ظهر عنده تفضيل (Long 2004)، والتمرينُ المستمرّ أقوى ما يمنع النوبةَ التالية (Steffens 2016).",
        "Core in every session. In acute pain the strongest evidence is for reassurance and staying active (NICE · Lancet 2018 · Cochrane 2010), and exercise is how both are delivered: directional-preference exercise eases pain in those with a preference (Long 2004), and ongoing exercise is the best-proven way to prevent the next episode (Steffens 2016)."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "recommended", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على أسفل الظهر في الاستلقاء على الجنب أو الانبطاح المريح (وسادةٌ تحت البطن)، قبل التمارين لتسهيلها لا بدلها. افحص الجلد قبل الكمادة وبعدها. وفي البيت: كيسُ ماءٍ دافئ أو لفافةٌ حرارية ٢٠ دقيقة مرّتين أو ثلاثاً يومياً — بلا نومٍ عليها.",
        "Over the low back in side-lying or comfortable prone (pillow under the abdomen), before exercise to ease it, never instead of it. Check the skin before and after. At home: a hot-water bottle or heat wrap for 20 minutes two or three times a day — never while sleeping."],
      note: ["مساعدٌ بالتناوب، وأقوى المساعدين دليلاً في الحادّ: الحرارةُ السطحية تخفّف الألمَ والإعاقة قصيرَ المدى (ACP 2017 توصيةٌ قوية · Cochrane 2006). ممنوعةٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
        "Rotating adjunct, and the best-evidenced adjunct in acute pain: superficial heat reduces pain and disability in the short term (ACP 2017 strong recommendation · Cochrane 2006). Contraindicated with impaired sensation, poor circulation or open wounds."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على العضلات المجاورة للفقرات القطنية (Paraspinal) في الانبطاح المريح: في الجلسات الأولى بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف (Athermic) وبالنمط السعويّ (Capacitive)، ثمّ المقاوِم (Resistive) مع تراجع الألم؛ وقبل التمارين.",
        "Over the lumbar paraspinals in comfortable prone: in the first sessions at low, athermic-to-mild-warmth intensity in capacitive mode, then resistive mode as pain settles; before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدود: تجاربُ صغيرة بتخفيفٍ قصيرِ المدى للألم، ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو المعادن المزروعة في المنطقة أو الحمل أو الأورام أو ضعف الإحساس.",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited evidence: small trials of short-term pain relief; not addressed by guidelines. Contraindicated with a pacemaker, metal implants in the area, pregnancy, tumours or impaired sensation."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على أسفل الظهر في الوضعية الأكثر راحة، قبل التمارين.",
        "Pulsed electromagnetic field (PEMF) over the low back in the most comfortable position, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدودٌ ومتضارب في ألم الظهر. ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited, conflicting evidence in low back pain. Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "TENS / IFC", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS) أو التيارُ المتداخل (IFC) لتهدئة الألم الحادّ: أربعةُ أقطابٍ حول منطقة الألم، بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباضٍ عضليّ، قبل التمارين — ويُقال للمريض إنّه يسكّن ولا يعالج.",
        "Conventional TENS or interferential current (IFC) to settle acute pain: four electrodes around the painful area, at a strong but comfortable tingling with no muscle contraction, before exercise — the patient is told it relieves pain but does not treat it."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ لتهدئة الألم (سليم)، والإرشاداتُ لا توصي به (NICE NG59؛ ولا دليلَ كافياً في الحادّ — ACP 2017)؛ فلا يُعطى وحده. ممنوعٌ مع منظّم ضربات القلب أو على البطن في الحمل أو على جلدٍ متضرّر أو ضعيف الإحساس.",
        "Rotating adjunct — used by the centre for pain relief (Saleem); guidelines do not recommend it (NICE NG59; insufficient evidence in acute pain — ACP 2017), so never on its own. Contraindicated with a pacemaker, over the abdomen in pregnancy, or on damaged or insensate skin."] },
    { code: "traction", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { forcePctBw: "25–40", holdRestS: "60 / 20", durationMin: "10–15", mode: "Intermittent" },
      parameters: ["ليس في الجلسات الأولى شديدة التهيّج: بعد أن يهدأ الألم (عادةً من المرحلة ٢)، شدٌّ قطنيّ متقطّع في الاستلقاء والوركان والركبتان بزاوية ٩٠° (90/90) بحزام الحوض والصدر، يبدأ بـ٢٥٪ من وزن الجسم ويزيد حتى ٤٠٪ حسب الاستجابة، ثمّ تمرينٌ بعده؛ ويُوقف إن زاد الألمُ بعده أو انتشر إلى الساق.",
        "Not in the first, highly irritable sessions: once pain settles (usually from phase 2), intermittent lumbar traction in supine with hips and knees at 90/90 using pelvic and thoracic belts, starting at 25% of body weight and progressing up to 40% as tolerated, followed by exercise; stop if pain increases afterwards or spreads into the leg."],
      note: ["مساعدٌ بالتناوب كما في ألم الظهر المزمن — يستعمله المركز (سليم)، والإرشاداتُ لا توصي به لألم الظهر (NICE NG59) ولا دليلَ على فائدته في الحادّ؛ فلا يُعطى وحده ولا في الأيّام الأولى. ولمن عنده ألمٌ في الساق مع علاماتٍ عصبية بروتوكولُ اعتلال الجذر القطنيّ. ممنوعٌ مع هشاشة العظام أو الكسور أو الأورام أو عدم ثبات الفقرات أو أعراض ذيل الفرس (Cauda equina) أو الحمل.",
        "Rotating adjunct as in chronic low back pain — used by the centre (Saleem); guidelines do not recommend it for low back pain (NICE NG59) and there is no evidence of benefit in acute pain, so never on its own and never in the first days. Leg pain with neurological signs belongs to the lumbar radiculopathy protocol. Contraindicated with osteoporosis, fracture, tumour, spinal instability, cauda equina symptoms or pregnancy."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسها.", "Alternative to the hot pack when unavailable, with the same precautions."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only; never given alone."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { needleSize: "0.30 × 50–60", points: "2–4", sessions: "1 / week × 1–2" },
      parameters: ["لمن عنده نقاطٌ زنادية (Trigger points) واضحة تعيد ألمَه المألوف في المربّعة القطنية (Quadratus lumborum) والألوية الوسطى والصغرى (Gluteus medius / minimus) وباسطات الظهر (Erector spinae)، بعد الأيّام الأولى، بطريقة الإدخال والإخراج السريع حتى استجابة الارتعاش الموضعية (Local twitch response)، ضمن جلسة التمارين ومعها.",
        "For clear trigger points that reproduce the familiar pain in quadratus lumborum, gluteus medius/minimus and erector spinae, after the first days, using a fast-in/fast-out technique to elicit local twitch responses, within and alongside the exercise session."],
      note: ["مساعدٌ بالتناوب، للمرخَّص بالإبر الجافة وحده. دليلُه في ألم الظهر من تجارب المزمن أكثر (JOSPT 2021)، وفي الحادّ محدود — فلا يُبدأ به. يُتجنّب الإدخالُ العميق فوق الضلع الثاني عشر (خطرُ الرئة)، وتُوجَّه الإبرةُ في المربّعة القطنية نحو النتوء المستعرض؛ ولا يُعطى وحده.",
        "Rotating adjunct, dry-needling certified staff only. Its evidence in low back pain comes mostly from chronic-pain trials (JOSPT 2021) and is limited in acute pain — so it is not a starting treatment. Avoid deep insertion above the 12th rib (pneumothorax risk) and direct the needle towards the transverse process in quadratus lumborum; never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — دليلٌ منخفضُ الجودة ومتضارب، ولا تضعه الإرشاداتُ ضمن العلاج.",
        "Not used by the centre for this condition (not mentioned by Saleem) — low-quality, conflicting evidence; not part of guideline-recommended care."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — والأمواجُ فوق الصوتية العلاجية لا تُقدَّم لألم الظهر (NICE NG59).",
        "Not used by the centre for this condition (not mentioned by Saleem) — therapeutic ultrasound is not offered for low back pain (NICE NG59)."] },
  ],
  phases: [
    {
      name: ["التهدئةُ والطمأنة والحركةُ المريحة", "Settle, reassure and move comfortably"],
      sessionFrom: 1, sessionTo: 4,
      timeframe: ["الأيّامُ الأولى — نحو الأسبوع الأوّل", "The first days — about week 1"],
      goals: [
        "يفهم المريضُ أنّ ألمَه غيرُ خطير وأنّ الحركةَ آمنة؛ يعرف وضعياتِ الراحة واتّجاهَ الحركة الذي يخفّف ألمه؛ ينهض من السرير والكرسيّ بألمٍ أقلّ؛ يمشي مشياً قصيراً متكرّراً كلّ يوم؛ ويواصل أنشطتَه وعملَه معدَّلةً إن لزم.",
        "The patient understands that the pain is not serious and that movement is safe; knows positions of ease and the direction of movement that eases the pain; gets out of bed and chairs with less pain; takes short, frequent walks every day; and keeps up activities and work, modified if needed.",
      ],
      education: [
        "الرسائلُ الأساسية — تُقال بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• ألمُ الظهر الحادّ شائعٌ جداً، وأغلبُه ليس من مرضٍ خطير، ويتحسّن معظمُه كثيراً خلال أسابيع قليلة.\n" +
        "• الألمُ الشديد لا يعني ضرراً شديداً: عضلاتُ الظهر وأربطتُه تتهيّج وتشتدّ دفاعاً، وهذا يهدأ.\n" +
        "• الأشعةُ والرنين لا تُطلب عادةً في الحادّ (يقرّرها الطبيب): لا تغيّر العلاج، وتغيّراتُها شائعةٌ عند مَن لا يشكو ألماً.\n" +
        "• ابقَ نشيطاً: الراحةُ في الفراش تؤخّر الشفاء، والاستمرارُ في الأنشطة اليومية والعمل — ولو معدَّلاً — يسرّعه.\n" +
        "• الحرارةُ في البيت (كيسُ ماءٍ دافئ ٢٠ دقيقة) تخفّف الألم.\n" +
        "• النوم: على الجنب ووسادةٌ بين الركبتين، أو على الظهر ووسادةٌ تحت الركبتين.\n" +
        "• غيّر وضعيتك كثيراً: في الأيّام الأولى لا جلوسَ أكثر من ٢٠–٣٠ دقيقة، ثمّ قُم وامشِ قليلاً.\n" +
        "• الدواءُ بوصفة الطبيب وحده.",
        "Key messages — in plain language, repeated every session:\n" +
        "• Acute back pain is very common, is rarely due to serious disease, and mostly improves a great deal within a few weeks.\n" +
        "• Severe pain does not mean severe damage: the back muscles and ligaments are irritated and guarding, and this settles.\n" +
        "• X-rays and scans are not usually needed in acute pain (the doctor decides): they do not change treatment, and their findings are common in people without pain.\n" +
        "• Stay active: bed rest delays recovery, while continuing daily activities and work — even in modified form — speeds it up.\n" +
        "• Heat at home (a hot-water bottle for 20 minutes) eases pain.\n" +
        "• Sleep on the side with a pillow between the knees, or on the back with a pillow under the knees.\n" +
        "• Change position often: in the first days sit no longer than 20–30 minutes at a time, then get up and walk a little.\n" +
        "• Medication by the doctor's prescription only.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الألمُ في الراحة ٣ من ١٠ أو أقلّ، أو انخفض نقطتين على الأقلّ عن التقييم الأوّل.\n" +
        "• ينهض من السرير ومن الكرسيّ بألمٍ قليل.\n" +
        "• اتّجاهُ الحركة المفضَّل معروف، والألمُ متمركزٌ أو ثابت — لا ينتشر إلى الساق.\n" +
        "• يمشي ١٠–١٥ دقيقةً متّصلة.\n" +
        "• يؤدّي برنامجَه المنزليّ صحيحاً، ويستطيع أن يشرح بكلماته لماذا الحركةُ آمنةٌ له.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة السادسة: يعيد الأخصائيُّ التصنيفَ وفرزَ علامات الخطر والعوامل النفسية (STarT Back)، وإن ساء الألمُ أو ظهرت علاماتٌ عصبية — يراه الطبيب.",
        "Progress to phase 2 when all are met:\n" +
        "• Pain at rest ≤ 3/10, or at least 2 points lower than at baseline.\n" +
        "• Gets out of bed and up from a chair with little pain.\n" +
        "• The preferred direction of movement is known, and pain is centralised or stable — not spreading into the leg.\n" +
        "• Walks 10–15 minutes continuously.\n" +
        "• Does the home programme correctly and can explain in their own words why movement is safe for them.\n" +
        "If not achieved by session 6: the specialist re-classifies and re-screens red flags and psychosocial factors (STarT Back); if pain worsens or neurological signs appear, the doctor reviews the patient.",
      ],
      notes: [
        "• العلاجُ اليدويّ (Manual therapy) بحسب التصنيف، ٥–١٠ دقائق قبل التمارين ولتسهيلها لا وحده (NICE · JOSPT 2021 · ACP 2017): التحريكُ السريع (Thrust manipulation) لمن يطابق قاعدةَ التنبّؤ ولا موانعَ له، أو التحريكُ غيرُ السريع (Non-thrust mobilisation) بدرجاتٍ لطيفة (I–II للألم، III–IV للتيبّس)، والأنسجةُ الرخوة — ثمّ يُعاد الفحصُ فوراً ويُتبَع بتمرينٍ في المدى الجديد.\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب (المؤشَّرُ لهذا المريض) — والحرارةُ السطحية أقواها دليلاً في الحادّ؛ والشدُّ ليس في هذه المرحلة.\n" +
        "• تمرينُ الاتّجاه المفضَّل بحسب التقييم: البسطُ (من الانبطاح ومن الوقوف) لمن يتمركز ألمُه بالبسط، والركبةُ إلى الصدر لمن يرتاح بالعطف — ولا يُعطى الاتّجاهان معاً لمن ظهر عنده تفضيلٌ واضح.\n" +
        "• الانحرافُ الجانبيّ (Lateral shift) إن وُجد وتمركز الألمُ بتصحيحه: يصحّحه الأخصائيُّ يدوياً ثمّ البسط، ويتعلّم المريضُ تصحيحَه بنفسه.\n" +
        "• راقب الخوفَ ولغةَ الجسد أكثر من دقّة الحركة في الأيّام الأولى، وامدح ما يستطيعه؛ والكلماتُ المطمئنة جزءٌ من العلاج.\n" +
        "• نصيحةُ العمل: البقاءُ فيه أو العودةُ إليه مبكّراً، بمهامّ معدَّلة مؤقّتاً إن لزم.",
        "• Manual therapy according to the classification, 5–10 minutes before and to facilitate exercise, never alone (NICE · JOSPT 2021 · ACP 2017): thrust manipulation for patients who meet the prediction rule and have no contraindication, or non-thrust mobilisation at gentle grades (I–II for pain, III–IV for stiffness), and soft-tissue techniques — then re-test immediately and follow with exercise in the new range.\n" +
        "• One adjunct device per session in rotation (those ticked for this patient) — superficial heat has the strongest evidence in acute pain; no traction in this phase.\n" +
        "• The directional-preference exercise according to assessment: extension (prone and standing) for patients who centralise with extension, knee to chest for those eased by flexion — not both directions for a patient with a clear preference.\n" +
        "• A lateral shift that centralises when corrected: the specialist corrects it manually followed by extension, and teaches self-correction.\n" +
        "• In the first days watch fear and body language more than movement precision, and praise what the patient can do; reassuring words are part of treatment.\n" +
        "• Work advice: stay at work or return early, with temporarily modified duties if needed.",
      ],
      exercises: [
        { code: "diaphragmatic-breathing", doseNote: ["عند اشتداد الألم وقبل النوم، وفي وضعيات الراحة.", "During pain flares, before sleep and in positions of ease."] },
        { code: "log-roll" },
        { code: "pelvic-tilt" },
        { code: "lower-trunk-rotation", note: ["مدىً صغير مريح في الأيّام الأولى.", "Small, comfortable range in the first days."] },
        { code: "cat-camel", note: ["في المدى المريح فقط.", "Within the comfortable range only."] },
        { code: "prone-press-up", note: ["لمن يفضّل البسط فقط (من التقييم) — يبدأ بالانبطاح دقيقتين ثمّ الاتّكاء على المرفقين قبل الرفع باليدين.",
          "Only for an extension preference (from assessment) — start with two minutes lying prone, then prone on elbows, before pressing up."] },
        { code: "standing-extension", note: ["لمن يفضّل البسط فقط — في العمل وبعد الجلوس.", "Only for an extension preference — at work and after sitting."] },
        { code: "single-knee-to-chest", note: ["لمن يرتاح بالعطف فقط (من التقييم).", "Only for a flexion preference (from assessment)."] },
        { code: "graded-walking", doseNote: ["مشيٌ قصيرٌ متكرّر: ٥–١٠ دقائق ثلاث مرّات يومياً، ويزيد دقيقتين كلّ يومين ما دام الألمُ في اليوم التالي كما هو — هذا هو «البقاءُ نشيطاً».",
          "Short, frequent walks: 5–10 minutes three times a day, adding 2 minutes every two days if next-day pain is unchanged — this is 'staying active'."] },
      ],
    },
    {
      name: ["استعادةُ الحركة وتنشيطُ الجذع", "Restore movement and activate the trunk"],
      sessionFrom: 5, sessionTo: 9,
      timeframe: ["نحو نهاية الأسبوع الأوّل وبداية الثاني", "About the end of week 1 and the start of week 2"],
      goals: [
        "حركةٌ كاملة أو شبهُ كاملة بلا خوف، وتنشيطُ عضلات الجذع والورك وتحمّلُها، ومشيٌ ٢٠–٣٠ دقيقة، والعودةُ إلى أغلب الأنشطة اليومية والعمل، وتحسّنٌ واضح في مؤشر أوزوستري.",
        "Full or near-full movement without fear, trunk and hip activation and endurance, walking 20–30 minutes, return to most daily activities and work, and a clear improvement in ODI.",
      ],
      education: [
        "• الألمُ الخفيف أثناء التمرين مقبول (حتى ٥ من ١٠) إن هدأ قبل اليوم التالي — الإحساسُ بالألم لا يعني الضرر.\n" +
        "• عُد إلى ما تتجنّبه خوفاً بخطواتٍ صغيرة: الانحناءُ، وحملُ الأغراض، والصلاةُ بركوعها وسجودها.\n" +
        "• التدرّج (Pacing): كميّةٌ ثابتة يومياً تُزاد قليلاً — لا كثيرٌ في اليوم الجيّد ثمّ توقّف.\n" +
        "• في الجلوس الطويل: قُم وتحرّك كلّ ٣٠–٤٠ دقيقة، وابسط ظهرك واقفاً إن كان يريحك.\n" +
        "• التمارينُ التي تتعلّمها الآن هي نفسُها التي تمنع النوبةَ القادمة — فاستمرّ عليها بعد أن يزول الألم.",
        "• Mild pain during exercise is acceptable (up to 5/10) if it settles by the next day — hurt does not equal harm.\n" +
        "• Return to what you avoid out of fear in small steps: bending, carrying, and prayer with its bowing and prostration.\n" +
        "• Pacing: a steady daily amount increased a little at a time — not a lot on a good day followed by stopping.\n" +
        "• With prolonged sitting: get up and move every 30–40 minutes, and extend the back in standing if it helps.\n" +
        "• The exercises you are learning now are the same ones that prevent the next episode — keep doing them after the pain has gone.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• الألمُ مع الأنشطة اليومية ٣ من ١٠ أو أقلّ، والحركةُ في كلّ الاتّجاهات بلا خوفٍ ظاهر.\n" +
        "• يؤدّي الكلبَ والطائر ٨ مرّات لكلّ جهة بثبات ٥–١٠ ثوانٍ وظهرُه ثابت.\n" +
        "• يثبت في الجسر الجانبيّ على الركبتين ٢٠–٣٠ ثانيةً لكلّ جهة، ويؤدّي الجسرَ ١٢ مرّة.\n" +
        "• يجلس ويقوم ١٠ مرّات بلا استعمال اليدين.\n" +
        "• يمشي ٢٠–٣٠ دقيقة.\n" +
        "• تحسّن مؤشرُ أوزوستري ٣٠٪ على الأقلّ عن التقييم الأوّل — وإن لم يتحسّن فمراجعةُ الأخصائيّ قبل الانتقال، وإعادةُ STarT Back.",
        "Progress to phase 3 when:\n" +
        "• Pain with daily activities ≤ 3/10, and movement in all directions without obvious fear.\n" +
        "• Bird dog 8 per side with 5–10-second holds and a stable spine.\n" +
        "• Modified side plank 20–30 seconds per side, and bridge × 12.\n" +
        "• Sit to stand × 10 without using the hands.\n" +
        "• Walks 20–30 minutes.\n" +
        "• ODI improved by at least 30% from baseline — if not, specialist review before progressing and a repeat STarT Back.",
      ],
      notes: [
        "• العلاجُ اليدويّ يقلّ مع زيادة العمل الفعّال، ويبقى قبل التمارين لمن يفيده.\n" +
        "• التدرّج: زِد شيئاً واحداً في كلّ مرّة — التكرارَ أو الثبات أو الصعوبة — حين تصير الجرعةُ الحالية سهلة (جهدٌ ٦ من ١٠ أو أقلّ).\n" +
        "• قاعدةُ التحمّل (McGill): تكراراتٌ أكثر بثباتٍ قصير (٨–١٠ ثوانٍ) أفضلُ من ثباتٍ طويلٍ واحد.\n" +
        "• راقب الحوضَ في الجسر والكلب والطائر ورفع القدم: لا دورانَ ولا تقوّسَ زائد.\n" +
        "• الشدُّ — إن أشّره الأخصائيُّ مساعداً لهذا المريض — يبدأ هنا لا قبلها، ويُوقف إن زاد الألمُ بعده.\n" +
        "• القطّ والجمل إحماءٌ قبل كلّ جلسة.",
        "• Manual therapy decreases as active work increases, and stays before exercise for those who benefit.\n" +
        "• Progression: change only one variable at a time — repetitions, hold or difficulty — once the current dose is easy (effort ≤ 6/10).\n" +
        "• Endurance rule (McGill): more repetitions with short holds (8–10 s) beat one long hold.\n" +
        "• Watch the pelvis in the bridge, bird dog and march: no rotation and no excessive arching.\n" +
        "• Traction — if ticked as an adjunct for this patient — starts here, not earlier, and stops if pain increases afterwards.\n" +
        "• Cat–camel as the warm-up before every session.",
      ],
      exercises: [
        { code: "cat-camel", doseNote: WARMUP },
        { code: "abdominal-bracing", note: ["مراجعةٌ قصيرة في أوّل الجلسة — ثمّ يُستعمل الشدُّ في كلّ تمرين.", "A short review at the start — then the brace is used in every exercise."] },
        { code: "hook-lying-march" },
        { code: "glute-bridge" },
        { code: "bird-dog" },
        { code: "side-plank", note: ["على الركبتين في هذه المرحلة.", "On the knees in this phase."] },
        { code: "mcgill-curl-up" },
        { code: "figure-4-stretch" },
        { code: "sit-to-stand" },
        { code: "graded-walking", doseNote: ["٢٠–٣٠ دقيقة يومياً بسرعةٍ يتكلّم فيها ولا يغنّي — وتُقسَم مرّتين إن لزم.",
          "20–30 minutes daily at a pace where talking is possible but not singing — split into two bouts if needed."] },
      ],
    },
    {
      name: ["العودةُ إلى النشاط الكامل والوقاية من العودة", "Return to full activity and prevent recurrence"],
      sessionFrom: 10, sessionTo: 12,
      timeframe: ["نحو نهاية الأسبوع الثاني — ثمّ البرنامجُ المنزليّ حتى الأسبوع السادس", "About the end of week 2 — then the home programme until week 6"],
      goals: [
        "رفعُ الأوزان اليومية وحملُها بثقة، والعودةُ الكاملة إلى العمل والرياضة والصلاة بلا قيود، واستقلالٌ تامّ ببرنامجٍ منزليّ للوقاية، وخطّةٌ مكتوبة للانتكاسة.",
        "Confident lifting and carrying of everyday loads, full return to work, sport and prayer without restriction, full independence with a home prevention programme, and a written flare-up plan.",
      ],
      education: [
        "• خطّةُ الانتكاسة المكتوبة (تُعطى للمريض):\n" +
        "  ١. نوبةٌ جديدة لا تعني ضرراً جديداً؛ لا تخف ولا تلزم الفراش.\n" +
        "  ٢. خفّف النشاطَ إلى النصف يومين أو ثلاثة — لا إلى الصفر — وواصل المشيَ القصير المتكرّر.\n" +
        "  ٣. عُد إلى تمارين المرحلة ١ وتمرين اتّجاهك المفضَّل، والحرارةُ تريح.\n" +
        "  ٤. إن لم تتحسّن خلال أسبوعين، أو ظهرت علامةُ خطر — راجعنا.\n" +
        "• الوقايةُ المثبتة: التمارينُ المستمرّة — وحدها أو مع التثقيف — تقلّل عودةَ ألم الظهر، أمّا أحزمةُ الظهر والنعالُ الطبية فلا تمنعه (Steffens 2016).\n" +
        "• بعد التخرّج: تمارينُ القوّة مرّتين أو ثلاثاً في الأسبوع، ومشيٌ أو رياضةٌ يحبّها ١٥٠ دقيقة في الأسبوع.\n" +
        "• لا «وضعيةَ مثالية» للجلوس أو الرفع؛ الظهرُ القويّ المتحرّك أفضلُ من الظهر «المحميّ».",
        "• Written flare-up plan (given to the patient):\n" +
        "  1. A new episode does not mean new damage; do not panic and do not take to bed.\n" +
        "  2. Halve activity for two or three days — not to zero — and keep up short, frequent walks.\n" +
        "  3. Return to the phase 1 exercises and your directional-preference exercise; heat helps.\n" +
        "  4. If there is no improvement within two weeks, or a red flag appears — come back to us.\n" +
        "• Proven prevention: ongoing exercise — alone or with education — reduces recurrence of back pain, whereas back belts and shoe insoles do not (Steffens 2016).\n" +
        "• After discharge: strength exercises two to three times a week, and walking or any sport they enjoy for 150 minutes a week.\n" +
        "• There is no single perfect sitting or lifting posture; a strong, mobile back beats a 'protected' one.",
      ],
      criteria: [
        "يتخرّج حين:\n" +
        "• تحقّقت أهدافُ الخطّة أو أغلبُها: الألمُ ٢ من ١٠ أو أقلّ مع الأنشطة، ومؤشرُ أوزوستري ٢٠٪ فأقلّ أو تحسّن ٥٠٪ على الأقلّ، والأنشطةُ الثلاثة في PSFS ٧ من ١٠ أو أعلى.\n" +
        "• يرفع ثقلاً من الأرض إلى الخصر (١٠–١٥ كغ أو ما يحتاجه في عمله) بنمطٍ صحيح وبلا خوف.\n" +
        "• عاد إلى عمله وأنشطته المعتادة.\n" +
        "• يؤدّي برنامجَه وحده صحيحاً، ويعرف خطّةَ الانتكاسة.\n" +
        "ثمّ زيارةُ متابعةٍ وإعادةُ تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "Discharge (graduate) when:\n" +
        "• The plan goals are met or mostly met: pain ≤ 2/10 with activities, ODI ≤ 20% or improved by at least 50%, and the three PSFS activities at 7/10 or higher.\n" +
        "• Lifts a load from floor to waist (10–15 kg or what work requires) with correct technique and without fear.\n" +
        "• Has returned to work and usual activities.\n" +
        "• Performs the programme independently and correctly and knows the flare-up plan.\n" +
        "Then a follow-up visit and reassessment four weeks after discharge.",
      ],
      notes: [
        "• اربط التمارين بمهامّ المريض الحقيقية: عملُه، وأطفالُه، وصلاتُه (الركوعُ والسجود حركةٌ آمنة تُتدرَّب)، ورياضتُه.\n" +
        "• الثقلُ يُزاد ما دامت التقنيةُ صحيحة والألمُ ضمن القاعدة، وتمارينُ الثقل يوماً بعد يوم.\n" +
        "• منخفضُ الخطر الذي تحسّن سريعاً قد يتخرّج قبل الجلسة الثانية عشرة — بمعايير التخرّج لا بالعدد.\n" +
        "• بعد الجلسة الأخيرة: يكمل البرنامجَ المنزليّ وحده حتى نهاية الأسبوع السادس من بدء العلاج (القوّةُ مرّتين أو ثلاثاً في الأسبوع، والحركةُ والمشيُ يومياً)، ويعود لزيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "• Link exercises to the patient's real tasks: work, children, prayer (bowing and prostration are safe movements to train) and sport.\n" +
        "• Increase load as long as technique is correct and pain stays within the rule; loaded exercises on alternate days.\n" +
        "• A low-risk patient who improves quickly may graduate before session 12 — by the discharge criteria, not the count.\n" +
        "• After the last session: the home programme continues independently until the end of week 6 from the start of treatment (strength two to three times a week, mobility and walking daily), with a follow-up visit and reassessment four weeks after discharge.",
      ],
      exercises: [
        { code: "cat-camel", doseNote: WARMUP },
        { code: "hip-hinge-dowel", note: ["مراجعةُ النمط قبل الثقل.", "Rehearse the pattern before loading."] },
        { code: "kettlebell-deadlift", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "suitcase-carry", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "side-plank", note: ["على القدمين حين يثبت ٣٠ ثانيةً على الركبتين.", "On the feet once 30 seconds on the knees is achieved."],
          doseNote: ["يزيد ٥ ثوانٍ كلّ جلستين أو ثلاث حتى ٣٠ ثانية.", "Add 5 seconds every two or three sessions up to 30 seconds."] },
        { code: "front-plank", doseNote: ["يزيد ٥ ثوانٍ كلّ جلستين أو ثلاث حتى ٣٠ ثانية.", "Add 5 seconds every two or three sessions up to 30 seconds."] },
        { code: "graded-walking", doseNote: ["٣٠ دقيقة ٥ أيّام في الأسبوع (١٥٠ دقيقة)، أو دراجةٌ أو سباحة.", "30 minutes 5 days a week (150 minutes), or cycling or swimming."] },
      ],
    },
  ],
};

export const name = "124_physio_lbp_acute_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
