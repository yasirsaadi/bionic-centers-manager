// Migration 145: عِرقُ النَّسا والاعتلالُ الجذريّ القطنيّ — البروتوكولُ الرابع عشر مفصَّلاً (§4.ec — ٢٠٢٦-١٠-١٤).
//
// المالك (٢٠٢٦-١٠-١٤): «تمام نكمل البروتوكولات» — والتالي بالترتيب المكتوب في القسم ٠: عِرقُ النسا (`lumbar-radiculopathy-adult`).
// **بالقالب كاملاً** (§4.dd): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع) وتمديدٌ واحد بستٍّ بمعيار، وثلاثُ مراحل بنطاقات
// (١–٦ · ٧–١٢ · ١٣–١٨) ومعايير رقمية: تهدئةُ الألم وإيجادُ الاتّجاه المفضَّل، ثمّ استعادةُ الحركة وحركةِ العصب، ثمّ التحميلُ والعودةُ إلى العمل
// والصلاة؛ وخمسُ بطاقاتٍ جديدة (خمسُ صورٍ مطلوبة) وأربعَ عشرةَ معادةً بصورها من ١١٩ و١٢٤ و١٢٦؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال
// المركز»؛ والمقاييسُ كما زُرعت (ODI وزاويةُ رفع الساق) وألمُ الساق ومدّةُ الجلوس والمشي إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`.
// كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ عِرق النسا**: الإرشاداتُ تتّفق على النصيحة والبقاء نشيطاً والتمرين أساساً، والعلاجِ اليدويّ مع التمرين لا وحده، **ولا شدّ ولا تحفيزَ
// كهربائيّ ولا أمواجَ فوق صوتية** (NICE NG59 · KCE 2017 بقوّة · WHO 2023)، وطرقٍ عاجلة لذيل الفرس والضعف المتزايد. **والدليلُ الخاصّ بعِرق النسا
// ضعيف**: التمرينُ أفضلُ من النصيحة لألم الساق قصيرَ المدى وحده (Fernandez 2015)، وأكبرُ تحليلٍ لم يجد فرقاً واضحاً (Dove 2023)، والتجربةُ العملية
// الأفضل (Fritz 2021) حسّنت الإعاقةَ لا ألمَ الساق بستٍّ إلى ثماني جلسات في أربعة أسابيع. **ولم تقارن تجربةٌ عددَ الجلسات أو تواترها** — فالعددُ ١٨
// اختيارُ خدمةٍ مكتوبٌ صريحاً. **والمركزةُ** أنفعُ علامة: ٨٤٫٨٪ تمركز ألمُهم في جلسة (Albert 2012)، ومَن لم يتمركز احتمالُ جراحته ستّةُ أضعاف (Skytte 2005).
// **والأجهزةُ بقاعدة المركز** (سليم — §4.cx) كما في ألم الظهر الحادّ (١٢٤): التحفيزُ والشدُّ والمغناطيسُ والتيكار «مساعد» والإرشاداتُ ضدّ أكثرها —
// كُتب ذلك صريحاً في كلّ جهاز، والشدُّ بشروطٍ أشدّ لأنّ أذاه في عِرق النسا مسجَّل (Wegner 2013)، وبندٌ لسليم على كلٍّ منها.
// **وما يخصّ العراق**: في مستشفى الكندي ببغداد (Ghanim 2024): ٦٦٪ بميلٍ جانبيٍّ للجذع، والجذرُ الخامس ٤٢٪ والعجزيّ الأوّل ٢٢٪؛ ولا تجربةَ علاجٍ عراقية
// (بحثٌ صفريّ مكتوب)، ولا دراسةَ عن الصلاة وعِرق النسا — والركوعُ بثني الركبتين خفّف الحملَ على أسفل الظهر عند الأصحّاء (AbouHassan 2010).
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (١٦٩ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من صفحاتها الرسمية؛
// **وNICE NG59 عُدّل في ٢٩ تموز ٢٠٢٦** فسُحبت توصيتا العلاج النفسيّ — كُتب كما هو اليوم. القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — خمس؛ والمعادةُ (زُرعت في ١١٩ و١٢٤ و١٢٦) تُربط برموزها وصورها، وما يخصّ عِرق النسا في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "prone-on-elbows", nameAr: "الانبطاح ثمّ الاستناد على المرفقين (البسط الثابت)", nameEn: "Prone lying progressing to prone on elbows (sustained extension)",
    kind: "mobility", region: "lumbar", sets: 1, reps: 1, hold: 120,
    purpose: ["أوّلُ درجات البسط لمن ألمُ ساقه يتراجع نحو الظهر بالبسط (الاتّجاه المفضَّل)، وللمرحلة التي تزيد فيها الحركةُ المتكرّرة الأعراض: الوضعيةُ الثابتة بدلَ الحركة (قاعدةُ الفحص في Albert 2012). والهدفُ المركزة — أن يتراجع أبعدُ الألم من القدم والساق نحو الظهر — وقد تمركز ألمُ ٨٤٫٨٪ من مرضى عِرق النسا في جلسة فحصٍ واحدة (Albert 2012)، ومَن لم يتمركز كان احتمالُ جراحته ستّةَ أضعاف (Skytte 2005).",
      "The first step of extension for patients whose leg pain retreats towards the back with extension (their directional preference), and for the stage when repeated movement worsens symptoms: a sustained position instead of movement (the examination rule in Albert 2012). The aim is centralisation — the most distal pain retreating from the foot and leg towards the back — which 84.8% of patients with sciatica achieved in one examination session (Albert 2012); those who did not centralise were six times more likely to have surgery (Skytte 2005)."],
    start: ["منبطحٌ على سريرٍ ثابت أو فرشةٍ على الأرض، والذراعان بجانب الجسم، والرأسُ مائلٌ إلى جانب؛ ووسادةٌ تحت البطن إن لم يستطع الاستلقاء مستوياً.",
      "Lying face down on a firm bed or a mat on the floor, arms by the sides, head turned to one side; a pillow under the abdomen if lying flat is not yet possible."],
    steps: [[
      "ابقَ منبطحاً دقيقةً أو دقيقتين وتنفّس بهدوء، وانتبه إلى أبعد مكانٍ يصل إليه ألمُ الساق.",
      "إن بقي الألمُ كما هو أو تراجع نحو الظهر، ارتفع على مرفقيك: المرفقان تحت الكتفين، والحوضُ على الأرض، والظهرُ مرتخٍ.",
      "ابقَ على المرفقين ٢–٥ دقائق ودَع أسفلَ الظهر يرتخي.",
      "راقب الألم: تراجعُه من الساق نحو الظهر علامةٌ جيّدة؛ وانتشارُه إلى أسفل الساق يعني أن تنزل فوراً.",
      "انزل ببطء إلى الانبطاح، ثمّ قم بالتدحرج على الجنب؛ وكرّر عدّةَ مرّاتٍ في اليوم كما يحدّد الأخصائيّ.",
    ], [
      "Stay face down for one to two minutes, breathing calmly, and notice the furthest point the leg pain reaches.",
      "If the pain stays the same or retreats towards the back, come up onto your elbows: elbows under the shoulders, pelvis on the floor, back relaxed.",
      "Stay on your elbows for 2–5 minutes and let the low back sag.",
      "Watch the pain: retreating from the leg towards the back is a good sign; spreading further down the leg means come down at once.",
      "Lower slowly to lying flat, then get up by rolling onto your side; repeat several times a day as the therapist sets.",
    ]],
    cues: [[
      "شدُّ الأرداف والظهر ⟵ أسفلُ الظهر مرتخٍ يهبط وحده.",
      "رفعُ الحوض عن الأرض ⟵ الحوضُ ملتصقٌ بالأرض والصدرُ وحده يرتفع.",
      "حبسُ النفس ⟵ تنفّسٌ عاديّ طوال المدّة.",
      "الاستمرارُ وألمُ الساق ينتشر إلى الأسفل ⟵ النزولُ والإخبار.",
    ], [
      "Tightening the buttocks and back → the low back relaxed and sagging on its own.",
      "Lifting the pelvis off the floor → the pelvis stays down and only the chest rises.",
      "Holding the breath → normal breathing throughout.",
      "Carrying on while leg pain spreads downwards → come down and tell the therapist.",
    ]],
    easier: ["الانبطاحُ وحده بوسادةٍ تحت البطن، ثمّ بلا وسادة، قبل المرفقين.", "Lying face down alone with a pillow under the abdomen, then without it, before the elbows."],
    harder: ["البسطُ من الانبطاح بالذراعين (بطاقة «البسط من الانبطاح») مدىً جزئيّاً ثمّ كاملاً.", "The prone press-up with the arms (the 'Prone press-up' card), partial range and then full range."],
    stopIf: ["ألمٌ أو خدرٌ أو تنميلٌ ينتشر إلى أسفل الساق أو يزيد ويبقى بعد النزول (انتشارٌ طرفيّ)؛ وخدرٌ جديد بين الفخذين أو تغيّرٌ في البول أو الغائط ⟵ طوارئ في اليوم نفسِه.",
      "Pain, numbness or tingling that spreads further down the leg or increases and stays after coming down (peripheralisation); new numbness between the legs or a change in bladder or bowel → same-day emergency."],
    equipment: ["سريرٌ ثابت أو فرشةٌ على الأرض، ووسادة.", "A firm bed or a floor mat, and a pillow."],
    doseNote: ["٢–٥ دقائق على المرفقين، عدّةَ مرّاتٍ يومياً — اقتراحٌ عمليّ: لم تُوجد مدّةٌ مجرَّبة، والقاعدةُ من Albert 2012: الوضعيةُ الثابتة حين تُسوء الحركةُ المتكرّرة الأعراض.",
      "2–5 minutes on the elbows, several times a day — a practical suggestion: no tested duration was found, and the rule comes from Albert 2012: a sustained position when repeated movement worsens symptoms."],
    images: [{ key: "prone-on-elbows-1", ar: "منبطحٌ ومستندٌ على مرفقيه تحت كتفيه والحوضُ على الأرض والظهرُ مرتخٍ", en: "Lying face down propped on the elbows under the shoulders, pelvis on the floor, back relaxed", search: "prone on elbows sphinx lumbar extension" }],
  },
  {
    code: "lateral-shift-correction", nameAr: "تصحيح ميل الجذع الجانبيّ بالانزلاق عند الحائط", nameEn: "Lateral shift correction (side glide at the wall)",
    kind: "mobility", region: "lumbar", sets: 1, reps: 10, hold: 2,
    purpose: ["لمن مال جذعُه إلى جانب مع عِرق النسا (الميلُ الجانبيّ — Lateral shift): كان عند ٦٦٪ من مرضى الانزلاق الغضروفيّ في مستشفى الكندي ببغداد (Ghanim 2024)، وكان ١٠٪ ممّن ظهر عندهم اتّجاهٌ مفضَّل اتّجاهُهم جانبيّاً (Long 2004 كما ينقله Delitto 2012). يُصحَّح الميلُ أوّلاً ثمّ يأتي البسط. ولم تُوجد تجربةٌ لتصحيح الميل في عِرق النسا (بحثٌ صفريّ مكتوب) — فهو ممارسةٌ سريرية من طريقة ماكنزي، يحدّد الأخصائيُّ جهتَه بالفحص.",
      "For patients whose trunk has shifted to one side with sciatica (lateral shift): present in 66% of patients with disc herniation at Al-Kindy Hospital in Baghdad (Ghanim 2024), and lateral in 10% of those with a directional preference (Long 2004 as reported by Delitto 2012). The shift is corrected first, then extension follows. No trial of shift correction in sciatica was found (a documented zero result) — it is clinical practice from the McKenzie method, and the therapist sets the side by examination."],
    start: ["واقفٌ والقدمان معاً على بعد نحو ٣٠ سم من الحائط، والجانبُ الذي يحدّده الأخصائيّ — عادةً جانبُ الكتفين المائلتين — نحو الحائط، والمرفقُ مثنيٌّ ملتصقٌ بالأضلاع ويستند إلى الحائط.",
      "Standing with the feet together about 30 cm from the wall, the side the therapist sets — usually the side the shoulders lean towards — facing the wall, the elbow bent against the ribs and resting on the wall."],
    steps: [[
      "ادفع حوضَك ببطء نحو الحائط ليصير تحت كتفيك، والكتفان ثابتتان ومستويتان.",
      "اثبت ثانيةً أو ثانيتين في أقصى ما تستطيع دون ألمٍ حادّ.",
      "ارجع ببطء إلى البداية.",
      "كرّر ١٠ مرّات، وراقب ألمَ الساق بعد كلّ بضع مرّات.",
      "في آخر مرّة: ابقَ والحوضُ مصحَّح وانحنِ إلى الخلف (البسطُ من الوقوف) إن طلبه الأخصائيّ.",
    ], [
      "Push your pelvis slowly towards the wall so that it comes under your shoulders, keeping the shoulders still and level.",
      "Hold for one or two seconds at the furthest point you can reach without sharp pain.",
      "Return slowly to the start.",
      "Repeat 10 times, checking the leg pain every few repetitions.",
      "On the last repetition: stay with the pelvis corrected and bend backwards (standing extension) if the therapist asks.",
    ]],
    cues: [[
      "ميلُ الجذع جانباً بدلَ انزلاق الحوض ⟵ الكتفان مستويتان والحوضُ وحده يتحرّك.",
      "لفُّ الوركين ⟵ الحوضُ متّجهٌ إلى الأمام طوالَ الحركة.",
      "الدفعُ بقوّة مع ألمٍ حادّ في الساق ⟵ حركةٌ لطيفة في حدود ما يُحتمل.",
      "البسطُ قبل تصحيح الميل ⟵ التصحيحُ أوّلاً ثمّ البسط.",
    ], [
      "Bending the trunk sideways instead of sliding the pelvis → shoulders level and only the pelvis moves.",
      "Twisting the hips → the pelvis faces forward throughout.",
      "Pushing hard into sharp leg pain → a gentle movement within what is tolerable.",
      "Extending before the shift is corrected → correct first, then extend.",
    ]],
    easier: ["التصحيحُ بيد الأخصائيّ في العيادة (يدفع الحوضَ ويثبّت الكتفين)، أو مدىً أصغر.", "Manual correction by the therapist in clinic (pushing the pelvis while steadying the shoulders), or a smaller range."],
    harder: ["الثباتُ في الوضع المصحَّح ٣٠ ثانية ثمّ البسطُ من الوقوف ١٠ مرّات دون أن يعود الميل.", "Holding the corrected position for 30 seconds, then standing extension 10 times without the shift returning."],
    stopIf: ["انتشارُ ألم الساق أو الخدر إلى الأسفل (انتشارٌ طرفيّ)، أو ضعفٌ جديد في القدم؛ وخدرٌ بين الفخذين أو تغيّرٌ في البول ⟵ طوارئ.",
      "Leg pain or numbness spreading further down (peripheralisation), or new weakness in the foot; numbness between the legs or a change in bladder function → emergency."],
    equipment: ["حائط.", "A wall."],
    doseNote: ["١٠ مرّات بثباتٍ قصير، عدّةَ مرّاتٍ يومياً حتى يستقيم الجذع — ممارسةٌ سريرية بلا تجربة.", "10 repetitions with a short hold, several times a day until the trunk is straight — clinical practice without a trial."],
    images: [{ key: "lateral-shift-correction-1", ar: "واقفٌ بجانب الحائط والمرفقُ على الأضلاع يدفع حوضَه نحو الحائط تحت كتفيه", en: "Standing side-on to the wall, elbow against the ribs, pushing the pelvis towards the wall under the shoulders", search: "lateral shift correction side glide wall mckenzie" }],
  },
  {
    code: "supine-sciatic-slider", nameAr: "انزلاق العصب الوركيّ في الاستلقاء", nameEn: "Supine sciatic nerve slider",
    kind: "neural", region: "lumbar", perSide: true, sets: 3, reps: 10, hold: 5, rest: 60,
    purpose: ["تحريكُ العصب الوركيّ دون شدّه (المنزلِق — Slider): يُشدّ العصبُ من طرفٍ ويُرخى من الآخر في الوقت نفسِه، فيتحرّك أكثر ويُشدّ أقلّ من الشادّ (Coppieters 2008 — دراسةٌ على أعصاب الذراع، ونُقلت إلى العصب الوركيّ استنتاجاً). والإرشادُ الأمريكيّ يجيزه مع العلاجات الأخرى لتحسينٍ قصير المدى (JOSPT 2021 — «may»)، وخفّف الألمَ والإعاقة في تحليلٍ مجمّع (Basson 2017)، ووجدت مراجعةٌ لثماني تجارب أثراً قصيرَ المدى في ستٍّ منها (Peacock 2023)؛ ومع تمارين التحكّم لم يُضف تخفيفاً للألم بل حسّن رفعَ الساق والأعراضَ العصبية (Plaza-Manzano 2020). وفي الاستلقاء يناسب مَن يُتعبه الجلوس، قبل المنزلق جالساً.",
      "Moving the sciatic nerve without stretching it (a slider): the nerve is tensioned at one end while slackened at the other, so it moves more and is strained less than with a tensioner (Coppieters 2008 — a study of arm nerves, transferred to the sciatic nerve by inference). The US guideline allows it alongside other treatment for short-term gains (JOSPT 2021 — 'may'), it reduced pain and disability in a meta-analysis (Basson 2017), a review of eight trials found a short-term effect in six (Peacock 2023), and added to motor-control training it did not reduce pain further but improved the straight leg raise and neural symptoms (Plaza-Manzano 2020). Lying down suits patients whom sitting aggravates, before the seated slider."],
    start: ["مستلقٍ على الظهر ورأسُه على وسادةٍ رقيقة، والساقُ المصابة مرفوعةٌ والوركُ مثنيٌّ نحو ٩٠°، واليدان متشابكتان خلف الفخذ، والركبةُ مثنيّة.",
      "Lying on the back with the head on a thin pillow, the affected leg raised with the hip bent to about 90°, hands clasped behind the thigh, knee bent."],
    steps: [[
      "مُدَّ الركبة ببطء واسحب أصابعَ القدم نحوك، وفي الوقت نفسِه أرجِع رأسَك إلى الخلف على الوسادة.",
      "توقّف قبل أن يبدأ الشدُّ أو التنميل في الساق، واثبت ٥ ثوانٍ.",
      "ثمّ اثنِ الركبة وادفع أصابعَ القدم بعيداً، وفي الوقت نفسِه ارفع ذقنَك قليلاً نحو صدرك.",
      "كرّر ١٠ مرّات بحركةٍ هادئة في الاتّجاهين، ثمّ استرح دقيقة.",
      "٣ مجموعات، وراقب الساقَ بعدها: لا يبقى تنميلٌ أكثرَ من دقيقة.",
    ], [
      "Straighten the knee slowly and pull the toes towards you, and at the same time tip your head back onto the pillow.",
      "Stop before stretch or tingling starts in the leg, and hold for 5 seconds.",
      "Then bend the knee and point the toes away, and at the same time lift the chin slightly towards the chest.",
      "Repeat 10 times with a calm movement both ways, then rest one minute.",
      "3 sets, then check the leg: no tingling should remain for more than a minute.",
    ]],
    cues: [[
      "مدُّ الركبة مع خفض الذقن معاً (يصير شادّاً) ⟵ الرأسُ إلى الخلف حين تمتدّ الركبة.",
      "الدفعُ حتى التنميل القويّ ⟵ الحركةُ قبل الأعراض لا داخلها.",
      "الحركةُ السريعة المرتدّة ⟵ هادئةٌ منتظمة في الاتّجاهين.",
      "إنزالُ الفخذ عن ٩٠° ⟵ اليدان تثبّتان الفخذ في مكانه.",
    ], [
      "Straightening the knee while tucking the chin (it becomes a tensioner) → head back as the knee straightens.",
      "Pushing into strong tingling → move short of the symptoms, not into them.",
      "Fast, bouncing movement → calm and steady both ways.",
      "Letting the thigh drop below 90° → the hands keep the thigh in place.",
    ]],
    easier: ["مدىً أصغر في الركبة، أو الكاحلُ وحده (رفعُ القدم وإنزالها) والركبةُ نصفُ ممدودة، أو بيد الأخصائيّ.", "A smaller knee range, or the ankle alone (toes up and down) with the knee half straight, or moved by the therapist."],
    harder: ["المنزلقُ جالساً (بطاقة «انزلاق العصب الوركيّ جالساً») حين يحتمل الجلوسَ ١٥ دقيقة.", "The seated slider (the 'Seated slump slider' card) once sitting is tolerated for 15 minutes."],
    stopIf: ["تنميلٌ أو خدرٌ يبقى أكثرَ من دقيقة بعد المجموعة، أو ألمٌ ينتشر إلى أسفل الساق، أو ضعفٌ جديد في القدم.",
      "Tingling or numbness lasting more than a minute after a set, pain spreading further down the leg, or new weakness in the foot."],
    equipment: ["سريرٌ أو فرشة، ووسادةٌ رقيقة.", "A bed or mat, and a thin pillow."],
    doseNote: ["في تجربة Shaheen 2025: خمسُ مجموعات في الجلسة (١٠ ثمّ ١٥ ثمّ ٢٠ ثمّ ٢٥ ثمّ ٣٠ مرّة) بثباتٍ ٥ ثوانٍ وراحة ١–٢ دقيقة، ثلاثَ مرّاتٍ في الأسبوع أربعةَ أسابيع؛ ويبدأ هنا بثلاث مجموعات × ١٠ ما دامت الأعراضُ مهتاجة — اقتراح.",
      "In the Shaheen 2025 trial: five sets per session (10, then 15, 20, 25 and 30 repetitions) with a 5-second hold and 1–2 minutes' rest, three times a week for four weeks; here it starts at 3 sets × 10 while symptoms are irritable — a suggestion."],
    images: [{ key: "supine-sciatic-slider-1", ar: "مستلقٍ ممسكٌ خلف فخذه والوركُ مثنيّ يمدّ ركبتَه ويسحب قدمَه نحوه ورأسُه إلى الخلف", en: "Lying on the back holding behind the thigh with the hip bent, straightening the knee and pulling the foot up with the head back", search: "supine sciatic nerve slider knee extension" }],
  },
  {
    code: "slump-slider-seated", nameAr: "انزلاق العصب الوركيّ جالساً (المنزلق المنحني)", nameEn: "Seated slump slider (sciatic nerve)",
    kind: "neural", region: "lumbar", perSide: true, sets: 3, reps: 10, hold: 5, rest: 60,
    purpose: ["المنزلقُ جالساً والظهرُ منحنٍ (Slump slider): في تجربةٍ فلسطينية على عِرق النسا المزمن كان أفضلَ من المنزلق في الاستلقاء، وكلاهما أفضلُ من العلاج المعتاد وحده للألم والإعاقة (Shaheen 2025)؛ وبعد أربعة أسابيع من تحريك العصب نقص ألمُ الساق نقطتين ونصفاً تقريباً لا عند الأسبوعين (Ferreira 2016). وهو المرحلةُ التالية بعد الاستلقاء، وفي آخر البرنامج يصير «شادّاً» حين يهدأ التهيّج.",
      "The slider in slumped sitting: in a Palestinian trial in chronic sciatica it beat the supine slider, and both beat usual care alone for pain and disability (Shaheen 2025); after four weeks of neural mobilisation leg pain fell by about two and a half points, though not at two weeks (Ferreira 2016). It follows the lying version, and late in the programme becomes a 'tensioner' once irritability settles."],
    start: ["جالسٌ على حافّة السرير والفخذان مسنودتان والقدمان معلّقتان، واليدان خلف الظهر، والظهرُ منحنٍ (انهيارٌ مريح) والكتفان مرتخيتان.",
      "Sitting on the edge of the bed with the thighs supported and the feet hanging, hands behind the back, the back rounded (a comfortable slump) and the shoulders relaxed."],
    steps: [[
      "مُدَّ ركبةَ الساق المصابة واسحب أصابعَ القدم نحوك، وفي الوقت نفسِه ارفع رأسَك وانظر إلى الأعلى.",
      "توقّف قبل أن يبدأ الشدُّ أو التنميل، واثبت ٥ ثوانٍ.",
      "ثمّ اثنِ الركبة وادفع أصابعَ القدم بعيداً، وفي الوقت نفسِه أنزِل ذقنَك نحو صدرك.",
      "كرّر ١٠ مرّات بحركةٍ هادئة، ثمّ استرح دقيقة.",
      "٣ مجموعات، ثمّ قف وامشِ قليلاً وراقب الساق.",
    ], [
      "Straighten the knee of the affected leg and pull the toes towards you, and at the same time lift your head and look up.",
      "Stop before stretch or tingling starts, and hold for 5 seconds.",
      "Then bend the knee and point the toes away, and at the same time lower your chin towards your chest.",
      "Repeat 10 times with a calm movement, then rest one minute.",
      "3 sets, then stand, walk a little and check the leg.",
    ]],
    cues: [[
      "مدُّ الركبة والذقنُ نازلٌ معاً ⟵ النظرُ إلى الأعلى حين تمتدّ الركبة.",
      "استقامةُ الظهر أثناء الحركة ⟵ الظهرُ يبقى منحنياً مرتخياً طوالَ المجموعة.",
      "الدفعُ داخل التنميل ⟵ الحركةُ تقف قبل الأعراض.",
      "حبسُ النفس ⟵ تنفّسٌ عاديّ.",
    ], [
      "Straightening the knee while the chin drops → look up as the knee straightens.",
      "Sitting up straight during the movement → the back stays rounded and relaxed throughout the set.",
      "Pushing into tingling → the movement stops short of the symptoms.",
      "Holding the breath → normal breathing.",
    ]],
    easier: ["مدىً أصغر في الركبة، أو الظهرُ أقلُّ انحناءً، أو المنزلقُ في الاستلقاء.", "A smaller knee range, a less rounded back, or the supine slider."],
    harder: ["الشادّ (Tensioner) في المرحلة الثالثة وحين لا يبقى تنميل: مدُّ الركبة وسحبُ القدم والذقنُ نازلٌ معاً، ٣ × ١٠ بثباتٍ قصير — يشدّ العصبَ أكثر (Coppieters 2008)، فلا يُعطى والأعراضُ مهتاجة.",
      "The tensioner in phase 3 when no tingling remains: straighten the knee, pull the foot up and lower the chin together, 3 × 10 with a short hold — it strains the nerve more (Coppieters 2008), so it is not given while symptoms are irritable."],
    stopIf: ["تنميلٌ أو خدرٌ يبقى أكثرَ من دقيقة بعد المجموعة، أو ألمٌ ينتشر إلى أسفل الساق، أو ضعفٌ جديد؛ والشادُّ يتوقّف فوراً إن زاد ألمُ الساق في اليوم التالي.",
      "Tingling or numbness lasting more than a minute after a set, pain spreading further down the leg, or new weakness; the tensioner stops at once if leg pain is worse the next day."],
    equipment: ["سريرٌ أو طاولةٌ مرتفعة تتدلّى منها القدمان.", "A bed or high table with the feet hanging free."],
    doseNote: ["في تجربة Shaheen 2025: خمسُ مجموعات (١٠ ⟵ ٣٠ مرّة) بثباتٍ ٥ ثوانٍ وراحة ١–٢ دقيقة، ثلاثَ مرّاتٍ في الأسبوع أربعةَ أسابيع؛ ويبدأ هنا بثلاث × ١٠ ويزيد نحو جرعة التجربة إن لم تبقَ أعراض — اقتراح.",
      "In the Shaheen 2025 trial: five sets (10 → 30 repetitions) with a 5-second hold and 1–2 minutes' rest, three times a week for four weeks; here it starts at 3 × 10 and builds towards the trial dose if no symptoms remain — a suggestion."],
    images: [{ key: "slump-slider-seated-1", ar: "جالسٌ على حافّة السرير والظهرُ منحنٍ يمدّ ركبتَه ويسحب قدمَه نحوه وهو ينظر إلى الأعلى", en: "Sitting on the edge of the bed with the back rounded, straightening the knee and pulling the foot up while looking up", search: "seated slump slider sciatic nerve glide" }],
  },
  {
    code: "prayer-bent-knee-ruku", nameAr: "الركوع بثني الركبتين والعودة المتدرّجة إلى السجود (الصلاة مع عِرق النسا)", nameEn: "Bent-knee bowing (ruku') and graded return to prostration with sciatica",
    kind: "functional", region: "lumbar", sets: 1, reps: 5,
    purpose: ["الصلاةُ من أكثر الأنشطة اليومية تكراراً، والركوعُ والسجودُ انحناءٌ تحت الحمل قد يزيد ألمَ مَن اتّجاهُه المفضَّل البسط. الركوعُ بثني الركبتين قليلاً خفّف ميلَ الحوض والقوى على الفقرة القطنية الخامسة عند رجالٍ أصحّاء (AbouHassan 2010) — ولم تُوجد دراسةٌ عن الصلاة وعِرق النسا (بحثٌ صفريّ مكتوب). فتُعامل كأيّ نشاطٍ وظيفيّ: تُختبر، وتُعدَّل في المرحلة الأولى، وتعود كاملةً هدفاً متدرّجاً. والحكمُ الشرعيّ للمريض ومرجعه لا للمعالج.",
      "Prayer is one of the most repeated daily activities, and bowing and prostration are loaded flexion that can worsen pain in patients whose preference is extension. Bowing with the knees slightly bent reduced pelvic tilt and the forces on the fifth lumbar level in healthy men (AbouHassan 2010) — and no study of prayer and sciatica was found (a documented zero result). So it is handled like any functional task: tested, adapted in phase 1, and restored in full as a graded goal. Religious rulings are for the patient and his or her own religious authority, not the therapist."],
    start: ["واقفٌ للصلاة والقدمان بعرض الوركين، وكرسيٌّ قريب لمن يحتاجه.", "Standing for prayer with the feet hip-width apart, and a chair nearby for those who need it."],
    steps: [[
      "الركوع: اثنِ ركبتيك قليلاً أوّلاً، ثمّ انحنِ من الوركين والظهرُ مستقيم، واليدان على الركبتين تحملان بعضَ الوزن.",
      "القيامُ من الركوع: ادفع بيديك على ركبتيك واستقم من الوركين لا من الظهر.",
      "السجود في المرحلة الأولى: إن زاد ألمُ الساق أو انتشر بالسجود، يقرّر المريضُ مع مرجعه الصلاةَ جالساً مؤقّتاً؛ وإلّا ينزل إلى الركبتين مستنداً إلى شيءٍ ثابت ثمّ يسجد ببطء.",
      "بعد كلّ صلاة: لاحظ ألمَ الساق — إن لم ينتشر فالخطوةُ التالية في الأيّام القادمة (من الكرسيّ إلى الأرض، ومن السند إلى بلا سند).",
      "وإن زاد بعد الصلاة: عُد إلى الخطوة السابقة، وتمرينُ الاتّجاه المفضَّل بعدها.",
    ], [
      "Bowing: bend the knees slightly first, then bend from the hips with a straight back, hands on the knees taking some of the weight.",
      "Rising from bowing: push with the hands on the knees and straighten from the hips, not the back.",
      "Prostration in phase 1: if leg pain increases or spreads with prostration, the patient decides with his or her religious authority to pray seated for now; otherwise lower to the knees holding something steady, then prostrate slowly.",
      "After each prayer: notice the leg pain — if it did not spread, take the next step over the coming days (from the chair to the floor, from support to no support).",
      "If it is worse after prayer: return to the previous step, with the directional-preference exercise afterwards.",
    ]],
    cues: [[
      "الانحناءُ من الظهر والركبتان مقفولتان ⟵ الركبتان مثنيّتان والانحناءُ من الوركين.",
      "النهوضُ السريع من السجود ⟵ ببطء مستنداً إلى اليدين.",
      "الإصرارُ على الوضع الكامل وألمُ الساق ينتشر ⟵ الخطوةُ السابقة حتى يهدأ.",
    ], [
      "Bending from the back with the knees locked → knees bent and the bend from the hips.",
      "Getting up quickly from prostration → slowly, pushing with the hands.",
      "Insisting on the full position while leg pain spreads → the previous step until it settles.",
    ]],
    easier: ["الصلاةُ جالساً على كرسيّ مؤقّتاً — بقرار المريض ومرجعه — مع الركوع بثني الركبتين واقفاً إن لم يؤلم.", "Praying seated on a chair for now — by the patient's decision with his or her religious authority — with bent-knee bowing in standing if it does not hurt."],
    harder: ["الصلاةُ كاملة على الأرض بلا سند، والسجودُ المطوَّل، دون أن يزيد ألمُ الساق بعدها — هدفُ المرحلة الثالثة.", "Full prayer on the floor without support, including long prostrations, without leg pain worsening afterwards — the phase 3 goal."],
    stopIf: ["ألمٌ ينتشر إلى أسفل الساق ويبقى بعد الصلاة، أو ضعفٌ في القدم، أو خدرٌ بين الفخذين ⟵ الأخصائيّ (والخدرُ بين الفخذين طوارئ).",
      "Pain spreading further down the leg and staying after prayer, weakness in the foot, or numbness between the legs → the therapist (and numbness between the legs is an emergency)."],
    equipment: ["سجّادة، وكرسيٌّ قريب، وشيءٌ ثابت للاستناد.", "A prayer mat, a nearby chair, and something steady to hold."],
    doseNote: ["التدرّجُ بالصلوات اليومية نفسِها، ويُتمرَّن على الركوع ٥ مرّات في الجلسة — اقتراحٌ عمليّ بلا تجربة.", "Progression through the daily prayers themselves, with bowing practised 5 times in the session — a practical suggestion without a trial."],
    images: [{ key: "prayer-bent-knee-ruku-1", ar: "رجلٌ في الركوع وركبتاه مثنيّتان قليلاً وظهرُه مستقيم ويداه على ركبتيه", en: "A man bowing in prayer with the knees slightly bent, a straight back and the hands on the knees", search: "islamic prayer bowing ruku bent knees" }],
  },
];

const PERIPH_AR = "قاعدةُ الأمان في كلّ تمرينٍ ووضعية (من قاعدة الفحص في Albert 2012): إن انتشر ألمُ الساق أو الخدرُ إلى الأسفل أو زاد وبقي (انتشارٌ طرفيّ — Peripheralisation) ⟵ يتوقّف ذلك التمرينُ فوراً ويُختبر اتّجاهٌ آخر أو وضعيةٌ ثابتة؛ وتراجعُ ألم الساق نحو الظهر ولو زاد ألمُ الظهر قليلاً (المركزة — Centralisation) مقبول (عُرفُ طريقة ماكنزي). وخدرٌ جديد بين الفخذين أو تغيّرٌ في البول أو الغائط ⟵ طوارئ في اليوم نفسِه.";
const PERIPH_EN = "Safety rule for every exercise and position (from the examination rule in Albert 2012): if leg pain or numbness spreads further down or increases and stays (peripheralisation) → that exercise stops at once and another direction or a sustained position is tested; leg pain retreating towards the back, even if back pain rises a little (centralisation), is acceptable (a McKenzie-method convention). New numbness between the legs or a change in bladder or bowel → same-day emergency.";
const EXTEND_AR = "وفي الجلسة ١٨: تمديدٌ واحد بستّ جلسات (حتى ٢٤) إن لم يتحقّق واحدٌ أو أكثر من معايير الخروج وكان ما يزال يتحسّن — ألمُ الساق نقص نقطتين فأكثر منذ الجلسة ١٢ أو مؤشّرُ الإعاقة عشرَ نقاط (الفرقُ المهمّ — Ostelo 2008) — ولا علامةَ إحالة؛ ولا تمديدَ لمن ثبت بلا تغيّر: يُحال إلى الطبيب والرأي الجراحيّ (التوقّفُ أوّلاً بمعايير «موانع وإحالة»).";
const EXTEND_EN = "At session 18: one extension of six sessions (to 24) if one or more discharge criteria are unmet and the patient is still improving — leg pain down 2 points or more since session 12, or the disability index down 10 points (the important change — Ostelo 2008) — with no referral trigger; no extension for a patient who has not changed: refer to the doctor for a surgical opinion (the stop rules under 'Contraindications and referral' come first).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "lumbar-radiculopathy-adult",
  summary: [
    "عِرقُ النَّسا والاعتلالُ الجذريّ القطنيّ (Sciatica / lumbar radiculopathy) عند البالغين: ألمٌ ينزل من أسفل الظهر أو الإلية إلى الساق تحت الركبة غالباً، مع تنميلٍ أو خدرٍ أو ضعف أحياناً، وأكثرُه من انزلاقٍ غضروفيّ يضغط جذراً عصبيّاً — الجذرُ القطنيّ الخامس أو العجزيّ الأوّل في الأغلب (في مستشفى الكندي ببغداد: ٤٢٪ و٢٢٪ — Ghanim 2024). " +
    "مسارُه الطبيعيّ مطمئنٌ غالباً لا دائماً: تحسّن ٨٧٪ عند ١٢ أسبوعاً في تجربة الراحة في السرير (Vroomen 1999)، وفي الرعاية الأوّلية تحسّنت الإعاقةُ ٣٠٪ فأكثر عند ٥٥٪ بعد سنة (Konstantinou 2018)؛ والانزلاقُ نفسُه يتراجع في الأكثر، وأكثرُه في المنفصل والمندفع (٩٦٪ و٧٠٪ — Chiu 2015). " +
    "الإرشاداتُ تتّفق على النصيحة والبقاء نشيطاً لكلّ مريض، والتمرينِ أساساً، والعلاجِ اليدويّ مع التمرين لا وحده، وعلى أن لا شدَّ ولا تحفيزَ كهربائيّ ولا أمواجَ فوق صوتية (NICE NG59 · KCE 2017 · WHO 2023)، وعلى طريقٍ عاجل لذيل الفرس والضعف المتزايد، ورأيٍ جراحيّ حين يبقى الألمُ شديداً بعد علاجٍ جيّد (NICE NG59 · Stochkendahl 2018). " +
    "والدليلُ الخاصّ بالعلاج الطبيعيّ لعِرق النسا ضعيف: التمرينُ أفضلُ من النصيحة لألم الساق قصيرَ المدى وحده (Fernandez 2015)، وأكبرُ تحليلٍ لم يجد فرقاً واضحاً (Dove 2023)، والتجربةُ العملية الأفضل حسّنت الإعاقةَ لا ألمَ الساق بستٍّ إلى ثماني جلسات (Fritz 2021). وأنفعُ علامةٍ سريرية المركزة: تمركز ألمُ ٨٤٫٨٪ في جلسة (Albert 2012)، ومَن لم يتمركز احتمالُ جراحته ستّةُ أضعاف (Skytte 2005). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ والطمأنة، وفحصُ الاتّجاه المفضَّل وتمارينُه، وتحريكُ العصب، والعلاجُ اليدويّ مع التمرين، وتمارينُ التحكّم بالجذع، والمشيُ المتدرّج، والعودةُ إلى الصلاة والعمل — والأجهزةُ مساعدةٌ بقاعدة المركز والإرشاداتُ ضدّ أكثرها. ثلاثُ مراحل بمعايير رقمية: تهدئةُ الألم وإيجادُ الاتّجاه المفضَّل، ثمّ استعادةُ الحركة وحركةِ العصب، ثمّ التحميلُ والعودة؛ وقواعدُ إحالةٍ في الجلستين ٦ و١٢.",
    "Sciatica and lumbar radiculopathy in adults: pain travelling from the low back or buttock into the leg, usually below the knee, sometimes with tingling, numbness or weakness, most often from a disc herniation compressing a nerve root — mostly L5 or S1 (at Al-Kindy Hospital in Baghdad: 42% and 22% — Ghanim 2024). " +
    "Its natural course is usually, not always, reassuring: 87% improved by 12 weeks in the bed-rest trial (Vroomen 1999), in primary care disability improved by 30% or more in 55% at one year (Konstantinou 2018), and the herniation itself usually regresses, most often when sequestrated or extruded (96% and 70% — Chiu 2015). " +
    "Guidelines agree on advice and staying active for every patient, exercise as the core, manual therapy only with exercise, and no traction, electrotherapy or ultrasound (NICE NG59 · KCE 2017 · WHO 2023), with urgent pathways for cauda equina syndrome and progressive weakness, and a surgical opinion when severe pain persists despite good care (NICE NG59 · Stochkendahl 2018). " +
    "The physiotherapy evidence specific to sciatica is weak: exercise beat advice only for short-term leg pain (Fernandez 2015), the largest meta-analysis found no clear difference (Dove 2023), and the best pragmatic trial improved disability but not leg pain with six to eight sessions (Fritz 2021). The most useful clinical sign is centralisation: 84.8% centralised in one session (Albert 2012), and non-centralisers were six times more likely to have surgery (Skytte 2005). " +
    "So the protocol: a core in every session — education and reassurance, directional-preference testing and exercise, neural mobilisation, manual therapy with exercise, trunk motor control, graded walking, and a return to prayer and work — with devices as adjuncts by the centre's rule, though guidelines oppose most of them. Three phases with numeric criteria: settling pain and finding the directional preference, then restoring movement and nerve mobility, then loading and return; with referral rules at sessions 6 and 12.",
  ],
  goals: [
    "• ألمُ الساق ينقص نقطتين فأكثر من ١٠ أو ٣٠٪ (الفرقُ المهمّ — Ostelo 2008) ويبلغ ٢ أو أقلّ، ويتمركز ما بقي منه.\n" +
    "• مؤشّرُ الإعاقة (ODI) ينقص ١٠ نقاطٍ فأكثر أو ٣٠٪ (Ostelo 2008) ويبلغ ٢٠ أو أقلّ.\n" +
    "• الجلوسُ والمشيُ ٣٠ دقيقة فأكثر دون أن يرتفع ألمُ الساق نقطتين، والصلاةُ كاملةً، والعودةُ إلى العمل والنشاط المعتاد (NICE NG59).\n" +
    "• فهمُ الحالة ومسارِها والبقاءُ نشيطاً، وبرنامجٌ منزليّ يُكمله وحده، وخطّةٌ لما يفعل إن عاد ألمُ الساق (يعود إلى تمرين اتّجاهه المفضَّل).\n" +
    "• ألّا يفوت إحالةً عاجلة: يعرف علاماتِ ذيل الفرس والضعفِ المتزايد ويتصرّف بها.",
    "• Leg pain down 2 points or more out of 10, or 30% (the important change — Ostelo 2008), reaching 2 or less, with any remaining pain centralised.\n" +
    "• The Oswestry Disability Index (ODI) down 10 points or more, or 30% (Ostelo 2008), reaching 20 or less.\n" +
    "• Sitting and walking for 30 minutes or more without leg pain rising by 2 points, full prayer, and return to work and usual activity (NICE NG59).\n" +
    "• Understanding the condition and its course and staying active, an independent home programme, and a plan for when leg pain returns (back to the directional-preference exercise).\n" +
    "• Never missing an urgent referral: knowing the signs of cauda equina syndrome and progressive weakness and acting on them.",
  ],
  assessment: [
    "• التاريخ: أين يصل ألمُ الساق (رسمٌ للألم بشدّته في الظهر والإلية والفخذ والساق والقدم)، وما يخفّفه وما يزيده — الجلوسُ والانحناءُ أم الوقوفُ والمشي — فهو يختار أوّلَ اتّجاهٍ يُفحص؛ والمدّة؛ ويُسأل في كلّ زيارة عن علامات ذيل الفرس (البول والغائط وخدرُ ما بين الفخذين والوظيفة الجنسية). وزيادةُ الألم بالجلوس أو بالسعال والعطاس تُنذر بمسارٍ أبطأ (Vroomen 2002).\n" +
    "• فحصُ الاتّجاه المفضَّل والمركزة (Albert 2012): الحركةُ أو الوضعيةُ الأوعد إلى نهاية مداها مكرّرةً حتى ١٠ مرّات لكلّ اتّجاه مع مراقبة أبعد الأعراض؛ ويتوقّف الاتّجاهُ فوراً إن زادت الأعراضُ البعيدة، وتُستعمل الوضعيةُ الثابتة إن أساءت الحركة؛ ثمّ مشيُ دقيقة وإعادةُ الرسم: زوالٌ أو نقصٌ ثابت (مركزة) أو غيرُ ثابت أو انتشارٌ طرفيّ أو لا أثر. ويُعاد الفحصُ جلستين أو ثلاثاً قبل الحكم بأنّه لا يتمركز (اقتراح)؛ والمركزةُ تنبّئ بالمسار في أكثر الدراسات (May 2012).\n" +
    "• فحصُ العصب: رفعُ الساق المستقيمة (حساسيته ٠٫٩١ وخصوصيته ٠٫٢٦ — Devillé 2000) ورفعُ الساق المعاكسة (خصوصيته ٠٫٨٨)، واختبارُ الانحناء جالساً (Slump — ٠٫٨٤ و٠٫٨٣ — Majlesi 2008)، والقوّةُ والحسّ والمنعكسات لكلّ جذر بمقياس القوّة من ٥ — ودقّتُها منفردةً محدودة (Al Nezari 2013)؛ والمشي: مشيةُ «خبط القدم» (Steppage) إحالةٌ فورية (Khorami 2021).\n" +
    "• المقاييسُ المزروعة: مؤشّرُ أوزوستري للإعاقة (ODI — بالعربية Algarni 2014 بعشرة بنود، وGuermazi 2005 بثمانية؛ الفرقُ المهمّ ١٠ نقاط أو ٣٠٪ — Ostelo 2008) وزاويةُ رفع الساق المستقيمة — تُقاس بيد الأخصائيّ نفسِه وبمقياس الميل مع التمييز البنيويّ (ثنيُ الكاحل يزيد الأعراض)، ولا يُعدّ تغيّرٌ أقلّ من ٢٠° حقيقيّاً (الفرقُ بين فاحصَين ١٣–٢٠° — Nee 2022)، ولا تُستعمل وحدها معياراً.\n" +
    "• ويضيف المشرف: ألمَ الساق وألمَ الظهر كلّاً من ١٠ (الفرقُ المهمّ نقطتان أو ٣٠٪)، واستبيانَ رولاند-موريس بالعربية (Maki 2014؛ الفرقُ المهمّ ٥ نقاط — Ostelo 2008)، ودقائقَ الجلوس والمشي المتّصل قبل أن يرتفع ألمُ الساق نقطتين (اقتراح؛ ولا مقياسَ مثبَتاً لها في عِرق النسا — بحثٌ صفريّ مكتوب)، ومقياسَ الوظيفة الخاصّ بالمريض بالعربية (PSFS — Alnahdi 2022) لنشاطاته كالصلاة والجلوس في العمل، واستبيانَ DN4 بالعربية للمكوّن العصبيّ (Harifi 2011)؛ وأداةَ ستارت باك بالعربية (STarT Back — Elsabbagh 2019) لتقدير الخطر — والرعايةُ المقسَّمة بالخطر لم تنفع في عِرق النسا (Konstantinou 2020).\n" +
    "• يُعاد التقييمُ في الجلسات ٦ و١٢ و١٨ بقواعد الإحالة في «موانع وإحالة».",
    "• History: where the leg pain reaches (a pain drawing with intensity for back, buttock, thigh, calf and foot), and what eases or worsens it — sitting and bending, or standing and walking — which picks the first direction to test; the duration; and at every visit the cauda equina questions (bladder, bowel, numbness between the legs, sexual function). Pain made worse by sitting or by coughing and sneezing predicts a slower course (Vroomen 2002).\n" +
    "• Directional-preference and centralisation testing (Albert 2012): the most promising movement or position to end range, repeated up to 10 times per direction while monitoring the most distal symptom; a direction stops at once if distal symptoms worsen, and a sustained position is used if movement worsens them; then one minute of walking and a repeat drawing: abolition or stable reduction (centralisation), unstable, peripheralisation, or no effect. Re-test over two or three sessions before labelling a non-centraliser (a suggestion); centralisation predicts the course in most studies (May 2012).\n" +
    "• Nerve examination: straight leg raise (sensitivity 0.91, specificity 0.26 — Devillé 2000) and crossed straight leg raise (specificity 0.88), the slump test (0.84 and 0.83 — Majlesi 2008), and strength, sensation and reflexes by root with a 0–5 power scale — each of limited accuracy on its own (Al Nezari 2013); and gait: a steppage gait means immediate referral (Khorami 2021).\n" +
    "• Seeded measures: the Oswestry Disability Index (ODI — Arabic, Algarni 2014 with ten items, Guermazi 2005 with eight; important change 10 points or 30% — Ostelo 2008) and the straight-leg-raise angle — measured by the same therapist with an inclinometer and structural differentiation (ankle dorsiflexion increases the symptoms), with no change below 20° counted as real (between-rater difference 13–20° — Nee 2022), and never used alone as a criterion.\n" +
    "• The supervisor adds: leg pain and back pain, each out of 10 (important change 2 points or 30%), the Arabic Roland-Morris questionnaire (Maki 2014; important change 5 points — Ostelo 2008), minutes of continuous sitting and walking before leg pain rises 2 points (a suggestion; no validated measure exists in sciatica — a documented zero result), the Arabic Patient-Specific Functional Scale (PSFS — Alnahdi 2022) for activities such as prayer and sitting at work, and the Arabic DN4 for the neuropathic component (Harifi 2011); and the Arabic STarT Back tool (Elsabbagh 2019) for risk — though risk-stratified care did not help in sciatica (Konstantinou 2020).\n" +
    "• Reassess at sessions 6, 12 and 18 with the referral rules under 'Contraindications and referral'.",
  ],
  exercises: [
    "البرنامجُ في «البرنامج على مراحل» بالبطاقات وجرعتها: في كلّ جلسة فحصُ الاتّجاه المفضَّل ثمّ تمرينُه — للبسط (الأكثر): الانبطاحُ ثمّ المرفقان ثمّ البسطُ من الانبطاح ٣ × ١٠ مدىً جزئيّاً ثمّ كاملاً (Al-Banawi 2023) ثمّ البسطُ من الوقوف، ولمن مال جذعُه تصحيحُ الميل أوّلاً، وللانثناء (القليل) سحبُ الركبتين إلى الصدر؛ والبرنامجُ المنزليّ كلَّ ٤–٥ ساعات في الأيّام الأولى (Fritz 2021) — و«١٠ مرّات كلَّ ساعتين» المتداولة لم يُوجد لها مصدرٌ أوّليّ. " +
    "والعلاجُ اليدويّ مع التمرين لا وحده (NICE NG59): تحريكُ الفقرات، والتحريكُ مع حركة الساق (Satpute 2019)؛ ثمّ تحريكُ العصب بالمنزلق في الاستلقاء ثمّ جالساً (Shaheen 2025)، وتمارينُ التحكّم بالجذع (França 2019 · Ye 2015) — شدُّ البطن ثمّ الكلبُ والطائر والجسرُ والجسرُ الجانبيّ — والجمعُ بين الاتّجاه المفضَّل والتحكّم ممارسةٌ جيّدة (Stochkendahl 2018)؛ ثمّ الانحناءُ من الورك والجلوسُ والقيام ورفعُ الثقل لمن يحتاجه عملُه، والمشيُ المتدرّج يومياً، والعودةُ المتدرّجة إلى الصلاة. " +
    "ولا راحةَ في السرير (Vroomen 1999 · Hagen 2005)، ولا يُعطى تمرينٌ يزيد انتشارَ الألم.",
    "The programme is under 'Programme by phase' with its cards and doses: every session starts with directional-preference testing and then its exercise — for extension (the majority): prone lying, then elbows, then the prone press-up 3 × 10 in partial then full range (Al-Banawi 2023), then standing extension; shift correction first for those with a lateral shift; and knees to chest for a flexion preference (the minority); the home programme every 4–5 hours in the early days (Fritz 2021) — the often-quoted '10 repetitions every 2 hours' has no primary source. " +
    "Manual therapy goes with exercise, never alone (NICE NG59): spinal mobilisation and mobilisation with leg movement (Satpute 2019); then neural mobilisation with the supine and then seated slider (Shaheen 2025), and trunk motor control (França 2019 · Ye 2015) — bracing, then bird dog, bridge and side bridge — with directional and motor-control exercise combined as good practice (Stochkendahl 2018); then the hip hinge, sit-to-stand and lifting for those whose work needs it, daily graded walking, and a graded return to prayer. " +
    "No bed rest (Vroomen 1999 · Hagen 2005), and no exercise that spreads the pain further down the leg.",
  ],
  contraindications: [
    "قبل كلّ جلسة: أسئلةُ ذيل الفرس، والقوّةُ في القدم.\n" +
    "• طوارئ في اليوم نفسِه (المسارُ البريطانيّ الوطنيّ لذيل الفرس — GIRFT 2023): ألمُ الظهر أو الساق ومعه شيءٌ بدأ خلال أسبوعين من: صعوبةُ بدء التبوّل أو ضعفُ الإحساس بمروره، أو تغيّرُ الإحساس حول الشرج وبين الفخذين، أو ضعفٌ شديد أو متزايد في الساقين معاً، أو فقدُ الإحساس بامتلاء المستقيم، أو ضعفٌ جنسيّ مستجدّ — يُرسل فوراً إلى مستشفى فيه رنينٌ عاجل؛ والاتّصالُ الهاتفيّ يكفي لإطلاق الإحالة، وتُكتب الساعةُ والفحصُ وإلى مَن أُحيل. ولا تنفي الفحوصُ السلبية ذيلَ الفرس ما دامت الأعراض (GIRFT 2023)، والعلاماتُ وحدها ضعيفةُ الحساسية (Dionne 2019).\n" +
    "• عاجل خلال أسبوعين (GIRFT 2023): ألمٌ جذريّ في الساقين معاً بدأ فجأة أو صار في الساقين بعد واحدة، أو أعراضُ ذيل الفرس بدأت قبل أكثرَ من أسبوعين وثابتة.\n" +
    "• ضعفٌ حركيّ: ضعفٌ جديد أو يزيد، أو قوّةٌ ٣ من ٥ أو أقلّ (كسقوط القدم)، أو مشيةُ خبط القدم ⟵ رأيٌ جراحيّ في الأسبوع نفسِه (اقتراحٌ مبنيّ على Khorami 2021 وOverdevest 2014)؛ وقوّةٌ ٤ ثابتة ⟵ يستمرّ العلاجُ مع إعادة الفحص أسبوعياً. وفي تجربة Peul كان الشفاءُ التامّ للضعف بعد سنة ٨١٪ بالجراحة المبكّرة و٨٠٪ بالعلاج المطوَّل (Overdevest 2014)، والضعفُ الشديد (٣ من ٥) أقوى ما يُبقيه.\n" +
    "• علاماتٌ حمراء أخرى (ورمٌ سابق، حمّى، نقصُ وزنٍ غير مفسَّر، رضٌّ أو هشاشة، ألمٌ ليليّ لا يتغيّر بالوضعية) ⟵ الطبيب قبل البدء (Finucane 2020).\n" +
    "• رأيٌ جراحيّ غيرُ عاجل: حين لا يُحسّن العلاجُ غيرُ الجراحيّ الألمَ أو الوظيفة والصورةُ متّفقةٌ مع الأعراض (NICE NG59)، بعد ٦–١٢ أسبوعاً من البدء على الأقلّ (KCE 2017)، وخلال ١٢ أسبوعاً إن بقي الألمُ شديداً معطِّلاً (Stochkendahl 2018). وقواعدُ هذا البروتوكول (اقتراح): في الجلسة ٦ — لا يتمركز ولا تغيّر ⟵ يُعاد فحصُ الاتّجاهات ويُضاف تحريكُ العصب ويُكتب ذلك؛ وفي الجلسة ١٢ — لم ينقص مؤشّرُ الإعاقة ١٠ نقاط أو ٣٠٪ ولا ألمُ الساق نقطتين ⟵ الإحالةُ معقولةٌ قبل الجلسة ١٨؛ وألمُ ساقٍ ٧ من ١٠ فأكثر أو إعاقةٌ ٤٠ فأكثر بعد ستّة أسابيع من البدء ⟵ رأيٌ جراحيّ. ولا يمنع الوزنُ ولا التدخينُ ولا القلقُ الإحالة (NICE NG59).\n" +
    "• للعلم: الجراحةُ تخفّف ألمَ الساق أسرع ونتيجةُ السنة متقاربة (Peul 2007)، وتفوق برامجَ النشاط البدنيّ في المدى القصير وحده (Fernandez 2016)، وفي عِرق النسا الباقي ٤–١٢ شهراً كان ألمُ الساق بعد ستّة أشهر ٢٫٨ بالجراحة و٥٫٢ بالعلاج غير الجراحيّ (Bailey 2020)؛ وفي تجربةٍ عراقية التوجّه كانت نتائجُ الجراحة عند ستّة أسابيع أفضلَ منها عند ثلاثة أشهر أو ستّة (Hamawandi 2022) — فلا يُطال علاجٌ لا ينفع في الشديد.",
    "Before every session: the cauda equina questions and strength in the foot.\n" +
    "• Same-day emergency (the UK national cauda equina pathway — GIRFT 2023): back or leg pain plus any of these starting within the last two weeks: difficulty starting urination or reduced sensation of the urine flow, altered sensation around the anus and between the legs, severe or progressive weakness in both legs, loss of the sense of rectal fullness, or new sexual dysfunction — send at once to a hospital with emergency MRI; a telephone call is enough to trigger the referral, and the time, findings and receiving clinician are recorded. Negative tests do not rule out cauda equina syndrome while the symptoms are present (GIRFT 2023), and the signs alone have low sensitivity (Dionne 2019).\n" +
    "• Urgent within two weeks (GIRFT 2023): radicular pain in both legs starting suddenly or spreading from one leg to both, or cauda equina symptoms that began more than two weeks ago and are stable.\n" +
    "• Motor weakness: new or progressive weakness, power 3/5 or less (such as foot drop), or a steppage gait → a surgical opinion the same week (a suggestion built on Khorami 2021 and Overdevest 2014); stable power 4/5 → continue treatment with weekly re-testing. In the Peul trial complete recovery of weakness at one year was 81% with early surgery and 80% with prolonged conservative care (Overdevest 2014), and severe weakness (3/5) was the strongest predictor of it persisting.\n" +
    "• Other red flags (previous cancer, fever, unexplained weight loss, trauma or osteoporosis, night pain that does not change with position) → the doctor before starting (Finucane 2020).\n" +
    "• Non-urgent surgical opinion: when non-surgical care has not improved pain or function and imaging matches the symptoms (NICE NG59), at least 6–12 weeks after onset (KCE 2017), and within 12 weeks if pain remains severe and disabling (Stochkendahl 2018). This protocol's rules (a suggestion): at session 6 — not centralising and no change → re-test the directions, add neural mobilisation and record it; at session 12 — the disability index not down 10 points or 30% and leg pain not down 2 points → referral is reasonable before session 18; leg pain 7/10 or more or disability 40 or more six weeks after onset → a surgical opinion. Weight, smoking or distress do not block referral (NICE NG59).\n" +
    "• For information: surgery relieves leg pain faster with a similar one-year result (Peul 2007) and beats physical-activity programmes only in the short term (Fernandez 2016), and in sciatica lasting 4–12 months leg pain at six months was 2.8 with surgery and 5.2 with non-surgical care (Bailey 2020); in an Iraq-affiliated trial surgery at six weeks gave better results than at three or six months (Hamawandi 2022) — so ineffective care is not prolonged in severe cases.",
  ],
  precautions: [
    PERIPH_AR + "\n" +
    "• العلاجُ اليدويّ: لا دفعَ سريعاً (Thrust) مع ضعفٍ متزايد أو أعراضٍ في الساقين معاً أو خدرٍ بين الفخذين أو انتشارٍ طرفيّ بالتحميل — والخطرُ نادرٌ جدّاً (أقلّ من واحدٍ في ٣٫٧ مليون تقديراً — Oliphant 2004) لكنّ تقاريرَ ذيل الفرس بعد التحريك موجودة (Hebert 2015)؛ والتحريكُ الأخفّ (والتحريكُ مع حركة الساق) خيارٌ أوّل.\n" +
    "• الحرارةُ بأنواعها: الإحساسُ في جلد الجذر المصاب قد يضعف — يُفحص قبل كلّ تطبيق.\n" +
    "• الشدّ: أذاه في عِرق النسا مسجَّل — زيادةُ الألم وسوءُ العلامات العصبية وجراحةٌ لاحقة (Wegner 2013) — فشروطُه في «الأجهزة».\n" +
    "• الأدوية من الطبيب، وللعلم: البريغابالين لم ينفع ألمَ الساق وزاد الأعراضَ الجانبية (Mathieson 2017)، والكورتيزونُ بالفم حسّن الإعاقةَ قليلاً لا ألمَ الساق (Goldberg 2015)، وحقنةُ فوق الجافية تخفّف قليلاً وقصيرَ المدى (Oliveira 2020)؛ ولا توصي NICE بمضادّات الصرع ولا الكورتيزون بالفم لعِرق النسا.\n" +
    "• الصلاة: لا دراسةَ عن الصلاة وعِرق النسا (بحثٌ صفريّ مكتوب)؛ الركوعُ بثني الركبتين أخفُّ على أسفل الظهر (AbouHassan 2010)، والصلاةُ جالساً مؤقّتاً قرارُ المريض ومرجعه — وبطاقتُها في المراحل. ومقياسُ الثقة بأداء الصلاة متاحٌ بالعربية (Al-Obaidi 2012).\n" +
    "• التوقّعُ الصادق: يتحسّن الأكثر في أسابيع إلى أشهر، وأثرُ العلاج الطبيعيّ فوق المسار الطبيعيّ صغيرٌ وقصير المدى غالباً (Fernandez 2015 · Dove 2023)، واعتقادُ المريض أنّ مشكلته ستطول أقوى ما يتنبّأ بعدم التحسّن (Konstantinou 2018) — فالطمأنةُ الصادقة جزءٌ من العلاج.",
    PERIPH_EN + "\n" +
    "• Manual therapy: no high-velocity thrust with progressive weakness, symptoms in both legs, numbness between the legs or peripheralisation on loading — the risk is very rare (estimated below one in 3.7 million — Oliphant 2004) but case reports of cauda equina syndrome after manipulation exist (Hebert 2015); gentler mobilisation (and mobilisation with leg movement) comes first.\n" +
    "• Heat of any kind: skin sensation over the affected root may be reduced — test it before every application.\n" +
    "• Traction: its harms in sciatica are documented — more pain, worse neurological signs and later surgery (Wegner 2013) — so its conditions are under 'Devices'.\n" +
    "• Medicines are for the doctor; for information: pregabalin did not help leg pain and caused more side effects (Mathieson 2017), oral steroids improved disability a little but not leg pain (Goldberg 2015), and an epidural injection gives a small, short-term benefit (Oliveira 2020); NICE does not recommend antiepileptics or oral steroids for sciatica.\n" +
    "• Prayer: there is no study of prayer and sciatica (a documented zero result); bent-knee bowing is easier on the low back (AbouHassan 2010), and praying seated for a while is the patient's decision with his or her religious authority — its card is in the phases. A prayer self-efficacy scale exists in Arabic (Al-Obaidi 2012).\n" +
    "• Honest expectations: most patients improve over weeks to months, the added effect of physiotherapy over the natural course is small and mostly short-term (Fernandez 2015 · Dove 2023), and the patient's belief that the problem will last is the strongest predictor of not improving (Konstantinou 2018) — so honest reassurance is part of treatment.",
  ],
  //  ١٨ جلسة × ستّ في الأسبوع = ثلاثةُ أسابيع — اختيارُ خدمة: التجاربُ ٤–٢٤ جلسة بمعدّل ١–٣ في الأسبوع، ولم تقارن واحدةٌ التواتر.
  spw: 6, weeks: 3, minutes: 50, totalSessions: 18,
  refs: [
    { title: "Low back pain and sciatica in over 16s: assessment and management (NG59 — last updated 29 July 2026)", org: "NICE", year: 2026, url: "https://www.nice.org.uk/guidance/ng59" },
    { title: "An evidence-based clinical guideline for the diagnosis and treatment of lumbar disc herniation with radiculopathy", org: "North American Spine Society (Kreiner et al.)", year: 2014, url: "https://doi.org/10.1016/j.spinee.2013.08.003" },
    { title: "Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021", org: "JOSPT / APTA Orthopaedics (George et al.)", year: 2021, url: "https://doi.org/10.2519/jospt.2021.0304" },
    { title: "Low back pain", org: "JOSPT / APTA Orthopaedics (Delitto et al.)", year: 2012, url: "https://doi.org/10.2519/jospt.2012.42.4.a1" },
    { title: "National Clinical Guidelines for non-surgical treatment of patients with recent onset low back pain or lumbar radiculopathy", org: "European Spine Journal (Stochkendahl et al. — Denmark)", year: 2018, url: "https://doi.org/10.1007/s00586-017-5099-2" },
    { title: "Low back pain and radicular pain: assessment and management (KCE Reports 287)", org: "Belgian Health Care Knowledge Centre — KCE (Van Wambeke et al.)", year: 2017, url: "https://kce.fgov.be/sites/default/files/2021-11/KCE_287_Low_back_pain_Report.pdf" },
    { title: "WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings", org: "World Health Organization", year: 2023, url: "https://www.who.int/publications/i/item/9789240081789" },
    { title: "Spinal Surgery: National Suspected Cauda Equina Syndrome (CES) Pathway", org: "GIRFT — NHS England", year: 2023, url: "https://spinal.co.uk/wp-content/uploads/2023/08/National-Suspected-Cauda-Equina-Pathway-February-2023-FINAL-V1-1.pdf" },
    { title: "Recommendations for Diagnosis and Treatment of Lumbosacral Radicular Pain: A Systematic Review of Clinical Practice Guidelines", org: "Journal of Clinical Medicine (Khorami et al.)", year: 2021, url: "https://doi.org/10.3390/jcm10112482" },
    { title: "International Framework for Red Flags for Potential Serious Spinal Pathologies", org: "JOSPT (Finucane et al.)", year: 2020, url: "https://doi.org/10.2519/jospt.2020.9971" },
    { title: "What is the diagnostic accuracy of red flags related to cauda equina syndrome (CES), when compared to Magnetic Resonance Imaging (MRI)? A systematic review", org: "Musculoskeletal Science and Practice (Dionne et al.)", year: 2019, url: "https://doi.org/10.1016/j.msksp.2019.05.004" },
    { title: "Physical Therapy Referral From Primary Care for Acute Back Pain With Sciatica : A Randomized Controlled Trial", org: "Annals of Internal Medicine (Fritz et al.)", year: 2021, url: "https://doi.org/10.7326/m20-4187" },
    { title: "Physical therapy plus general practitioners' care versus general practitioners' care alone for sciatica: a randomised clinical trial with a 12-month follow-up", org: "European Spine Journal (Luijsterburg et al.)", year: 2008, url: "https://doi.org/10.1007/s00586-007-0569-6" },
    { title: "The efficacy of systematic active conservative treatment for patients with severe sciatica: a single-blind, randomized, clinical, controlled trial", org: "Spine (Albert & Manniche)", year: 2012, url: "https://doi.org/10.1097/brs.0b013e31821ace7f" },
    { title: "Individualized functional restoration as an adjunct to advice for lumbar disc herniation with associated radiculopathy. A preplanned subgroup analysis of a randomized controlled trial", org: "The Spine Journal (Hahne et al.)", year: 2017, url: "https://doi.org/10.1016/j.spinee.2016.10.004" },
    { title: "Westeinde sciatica trial: randomized controlled study of bed rest and physiotherapy for acute sciatica", org: "Journal of Neurosurgery (Hofstee et al.)", year: 2002, url: "https://doi.org/10.3171/spi.2002.96.1.0045" },
    { title: "Advice to Stay Active or Structured Exercise in the Management of Sciatica: A Systematic Review and Meta-analysis", org: "Spine (Fernandez et al.)", year: 2015, url: "https://doi.org/10.1097/brs.0000000000001036" },
    { title: "Surgery or physical activity in the management of sciatica: a systematic review and meta-analysis", org: "European Spine Journal (Fernandez et al.)", year: 2016, url: "https://doi.org/10.1007/s00586-015-4148-y" },
    { title: "How effective are physiotherapy interventions in treating people with sciatica? A systematic review and meta-analysis", org: "European Spine Journal (Dove et al.)", year: 2023, url: "https://doi.org/10.1007/s00586-022-07356-y" },
    { title: "Comparative clinical effectiveness of management strategies for sciatica: systematic review and network meta-analyses", org: "The Spine Journal (Lewis et al.)", year: 2015, url: "https://doi.org/10.1016/j.spinee.2013.08.049" },
    { title: "Motor Control Training Compared With Transcutaneous Electrical Nerve Stimulation in Patients With Disc Herniation With Associated Radiculopathy: A Randomized Controlled Trial", org: "American Journal of Physical Medicine & Rehabilitation (França et al.)", year: 2019, url: "https://doi.org/10.1097/phm.0000000000001048" },
    { title: "Comparison of lumbar spine stabilization exercise versus general exercise in young male patients with lumbar disc herniation after 1 year of follow-up", org: "International Journal of Clinical and Experimental Medicine (Ye et al.)", year: 2015, url: "https://pubmed.ncbi.nlm.nih.gov/26309670/" },
    { title: "Optimal exercise dose in adults with chronic low back pain disorders: systematic review with dose-response network meta-analysis", org: "British Journal of Sports Medicine (Arora et al.)", year: 2026, url: "https://doi.org/10.1136/bjsports-2026-111988" },
    { title: "Lack of effectiveness of bed rest for sciatica", org: "New England Journal of Medicine (Vroomen et al.)", year: 1999, url: "https://doi.org/10.1056/nejm199902113400602" },
    { title: "The updated cochrane review of bed rest for low back pain and sciatica", org: "Spine (Hagen et al.)", year: 2005, url: "https://doi.org/10.1097/01.brs.0000154625.02586.95" },
    { title: "Centralization in patients with sciatica: are pain responses to repeated movement and positioning associated with outcome or types of disc lesions?", org: "European Spine Journal (Albert et al.)", year: 2012, url: "https://doi.org/10.1007/s00586-011-2018-9" },
    { title: "Centralization: its prognostic value in patients with referred symptoms and sciatica", org: "Spine (Skytte et al.)", year: 2005, url: "https://doi.org/10.1097/01.brs.0000164119.78463.0c" },
    { title: "Does it matter which exercise? A randomized control trial of exercise for low back pain", org: "Spine (Long et al.)", year: 2004, url: "https://doi.org/10.1097/01.brs.0000146464.23007.2a" },
    { title: "Centralization and directional preference: a systematic review", org: "Manual Therapy (May & Aina)", year: 2012, url: "https://doi.org/10.1016/j.math.2012.05.003" },
    { title: "The McKenzie method compared with manipulation when used adjunctive to information and advice in low back pain patients presenting with centralization or peripheralization: a randomized controlled trial", org: "Spine (Petersen et al.)", year: 2011, url: "https://doi.org/10.1097/brs.0b013e318201ee8e" },
    { title: "Effects of the Addition of Hands-on Procedures to McKenzie Exercises on Pain, Functional Disability and Back Mobility in Patients with Low Back Pain: A Randomised Clinical Trial", org: "Malaysian Journal of Medical Sciences (Al-Banawi et al.)", year: 2023, url: "https://doi.org/10.21315/mjms2023.30.3.11" },
    { title: "Correlation between clinical and MRI findings in disc herniation in the lumbosacral region", org: "Irish Journal of Medical Science (Ghanim et al. — Al-Kindy Teaching Hospital, Baghdad)", year: 2024, url: "https://doi.org/10.1007/s11845-024-03788-1" },
    { title: "The Effectiveness of Neural Mobilization for Neuromusculoskeletal Conditions: A Systematic Review and Meta-analysis", org: "JOSPT (Basson et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.7117" },
    { title: "Neurodynamic treatment did not improve pain and disability at two weeks in patients with chronic nerve-related leg pain: a randomised trial", org: "Journal of Physiotherapy (Ferreira et al.)", year: 2016, url: "https://doi.org/10.1016/j.jphys.2016.08.007" },
    { title: "Effects of Adding a Neurodynamic Mobilization to Motor Control Training in Patients With Lumbar Radiculopathy Due to Disc Herniation: A Randomized Clinical Trial", org: "American Journal of Physical Medicine & Rehabilitation (Plaza-Manzano et al.)", year: 2020, url: "https://doi.org/10.1097/phm.0000000000001295" },
    { title: "Comparison of different treatment positions of nerve slider technique for patients with low back pain: a randomized control trial", org: "European Journal of Physical and Rehabilitation Medicine (Shaheen et al. — Hebron, Palestine)", year: 2025, url: "https://doi.org/10.23736/s1973-9087.24.08541-1" },
    { title: "Do 'sliders' slide and 'tensioners' tension? An analysis of neurodynamic techniques and considerations regarding their application", org: "Manual Therapy (Coppieters & Butler)", year: 2008, url: "https://doi.org/10.1016/j.math.2006.12.008" },
    { title: "Neural mobilization in low back and radicular pain: a systematic review", org: "Journal of Manual & Manipulative Therapy (Peacock et al.)", year: 2023, url: "https://doi.org/10.1080/10669817.2022.2065599" },
    { title: "The Effect of Spinal Mobilization With Leg Movement in Patients With Lumbar Radiculopathy-A Double-Blind Randomized Controlled Trial", org: "Archives of Physical Medicine and Rehabilitation (Satpute et al.)", year: 2019, url: "https://doi.org/10.1016/j.apmr.2018.11.004" },
    { title: "Chiropractic manipulation in the treatment of acute back pain and sciatica with disc protrusion: a randomized double-blind clinical trial of active and simulated spinal manipulations", org: "The Spine Journal (Santilli et al.)", year: 2006, url: "https://doi.org/10.1016/j.spinee.2005.08.001" },
    { title: "Spinal manipulation and home exercise with advice for subacute and chronic back-related leg pain: a trial with adaptive allocation", org: "Annals of Internal Medicine (Bronfort et al.)", year: 2014, url: "https://doi.org/10.7326/m14-0006" },
    { title: "Safety of spinal manipulation in the treatment of lumbar disk herniations: a systematic review and risk assessment", org: "Journal of Manipulative and Physiological Therapeutics (Oliphant)", year: 2004, url: "https://doi.org/10.1016/j.jmpt.2003.12.023" },
    { title: "Serious Adverse Events and Spinal Manipulative Therapy of the Low Back Region: A Systematic Review of Cases", org: "Journal of Manipulative and Physiological Therapeutics (Hebert et al.)", year: 2015, url: "https://doi.org/10.1016/j.jmpt.2013.05.009" },
    { title: "Traction for low-back pain with or without sciatica", org: "Cochrane Database of Systematic Reviews (Wegner et al.)", year: 2013, url: "https://doi.org/10.1002/14651858.cd003010.pub5" },
    { title: "Is there a subgroup of patients with low back pain likely to benefit from mechanical traction? Results of a randomized clinical trial and subgrouping analysis", org: "Spine (Fritz et al.)", year: 2007, url: "https://doi.org/10.1097/brs.0b013e31815d001a" },
    { title: "The Effectiveness of Mechanical Traction Among Subgroups of Patients With Low Back Pain and Leg Pain: A Randomized Trial", org: "JOSPT (Thackeray et al.)", year: 2016, url: "https://doi.org/10.2519/jospt.2016.6238" },
    { title: "Mechanical Traction for Lumbar Radicular Pain: Supine or Prone? A Randomized Controlled Trial", org: "American Journal of Physical Medicine & Rehabilitation (Bilgilisoy Filiz et al.)", year: 2018, url: "https://doi.org/10.1097/phm.0000000000000892" },
    { title: "The effects of the addition of mechanical traction to physical therapy on low back pain? A systematic review with meta-analysis", org: "Acta Orthopaedica et Traumatologica Turcica (Vanti et al.)", year: 2023, url: "https://doi.org/10.5152/j.aott.2023.21323" },
    { title: "Prognosis of sciatica and back-related leg pain in primary care: the ATLAS cohort", org: "The Spine Journal (Konstantinou et al.)", year: 2018, url: "https://doi.org/10.1016/j.spinee.2017.10.071" },
    { title: "Stratified care versus usual care for management of patients presenting with sciatica in primary care (SCOPiC): a randomised controlled trial", org: "The Lancet Rheumatology (Konstantinou et al.)", year: 2020, url: "https://doi.org/10.1016/s2665-9913(20)30099-0" },
    { title: "The probability of spontaneous regression of lumbar herniated disc: a systematic review", org: "Clinical Rehabilitation (Chiu et al.)", year: 2015, url: "https://doi.org/10.1177/0269215514540919" },
    { title: "Predicting the outcome of sciatica at short-term follow-up", org: "British Journal of General Practice (Vroomen et al.)", year: 2002, url: "https://pubmed.ncbi.nlm.nih.gov/11887877/" },
    { title: "Surgery versus prolonged conservative treatment for sciatica", org: "New England Journal of Medicine (Peul et al.)", year: 2007, url: "https://doi.org/10.1056/nejmoa064039" },
    { title: "Surgery versus Conservative Care for Persistent Sciatica Lasting 4 to 12 Months", org: "New England Journal of Medicine (Bailey et al.)", year: 2020, url: "https://doi.org/10.1056/nejmoa1912658" },
    { title: "Recovery of motor deficit accompanying sciatica--subgroup analysis of a randomized controlled trial", org: "The Spine Journal (Overdevest et al.)", year: 2014, url: "https://doi.org/10.1016/j.spinee.2013.07.456" },
    { title: "Effect of Duration of Symptoms on the Clinical and Functional Outcomes of Lumbar Microdiscectomy: A Randomized Controlled Trial", org: "Orthopaedic Surgery (Hamawandi et al. — Iraq-affiliated)", year: 2022, url: "https://doi.org/10.1111/os.13114" },
    { title: "The test of Lasègue: systematic review of the accuracy in diagnosing herniated discs", org: "Spine (Devillé et al.)", year: 2000, url: "https://doi.org/10.1097/00007632-200005010-00016" },
    { title: "The sensitivity and specificity of the Slump and the Straight Leg Raising tests in patients with lumbar disc herniation", org: "Journal of Clinical Rheumatology (Majlesi et al.)", year: 2008, url: "https://doi.org/10.1097/rhu.0b013e31816b2f99" },
    { title: "Neurological examination of the peripheral nervous system to diagnose lumbar spinal disc herniation with suspected radiculopathy: a systematic review and meta-analysis", org: "The Spine Journal (Al Nezari et al.)", year: 2013, url: "https://doi.org/10.1016/j.spinee.2013.02.007" },
    { title: "Reliability of the straight leg raise test for suspected lumbar radicular pain: A systematic review with meta-analysis", org: "Musculoskeletal Science and Practice (Nee et al.)", year: 2022, url: "https://doi.org/10.1016/j.msksp.2022.102529" },
    { title: "Interpreting change scores for pain and functional status in low back pain: towards international consensus regarding minimal important change", org: "Spine (Ostelo et al.)", year: 2008, url: "https://doi.org/10.1097/brs.0b013e31815e3a10" },
    { title: "Validation of an Arabic version of the Oswestry index in Saudi Arabia", org: "Annals of Physical and Rehabilitation Medicine (Algarni et al.)", year: 2014, url: "https://doi.org/10.1016/j.rehab.2014.06.006" },
    { title: "The Oswestry index for low back pain translated into Arabic and validated in a Arab population", org: "Annales de Réadaptation et de Médecine Physique (Guermazi et al.)", year: 2005, url: "https://doi.org/10.1016/j.annrmp.2004.06.055" },
    { title: "Cross-cultural translation, adaptation, and psychometric testing of the Roland-Morris disability questionnaire into modern standard Arabic", org: "Spine (Maki et al.)", year: 2014, url: "https://doi.org/10.1097/brs.0000000000000632" },
    { title: "Cross-cultural adaptation and measurement properties of the Arabic version of the Patient-Specific Functional Scale in patients with lower extremity musculoskeletal disorders", org: "Disability and Rehabilitation (Alnahdi et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1880651" },
    { title: "Validity and reliability of the Arabic adapted version of the DN4 questionnaire (Douleur Neuropathique 4 Questions) for differential diagnosis of pain syndromes with a neuropathic or somatic component", org: "Pain Practice (Harifi et al.)", year: 2011, url: "https://doi.org/10.1111/j.1533-2500.2010.00399.x" },
    { title: "Cross-cultural adaptation and validation of the STarT Back Tool for Arabic speaking adults with low back pain in Saudi Arabia", org: "Journal of Orthopaedic Science (Elsabbagh et al.)", year: 2019, url: "https://doi.org/10.1016/j.jos.2018.09.007" },
    { title: "Trial of Pregabalin for Acute and Chronic Sciatica", org: "New England Journal of Medicine (Mathieson et al.)", year: 2017, url: "https://doi.org/10.1056/nejmoa1614292" },
    { title: "Oral steroids for acute radiculopathy due to a herniated lumbar disk: a randomized clinical trial", org: "JAMA (Goldberg et al.)", year: 2015, url: "https://doi.org/10.1001/jama.2015.4468" },
    { title: "Epidural corticosteroid injections for lumbosacral radicular pain", org: "Cochrane Database of Systematic Reviews (Oliveira et al.)", year: 2020, url: "https://doi.org/10.1002/14651858.cd013577" },
    { title: "Acute low back pain with radiculopathy: a double-blind, randomized, placebo-controlled study", org: "Photomedicine and Laser Surgery (Konstantinovic et al.)", year: 2010, url: "https://doi.org/10.1089/pho.2009.2576" },
    { title: "Comparison of the Effectiveness of TENS and Low-Level Laser Therapy Applied to the Sciatic Nerve Region in Chronic Lumbar Radiculopathy", org: "Journal of Lasers in Medical Sciences (Karagül et al.)", year: 2024, url: "https://doi.org/10.34172/jlms.2024.13" },
    { title: "Comparison of high-intensity laser therapy and combination of transcutaneous nerve stimulation and ultrasound treatment in patients with chronic lumbar radiculopathy: A randomized single-blind study", org: "Pakistan Journal of Medical Sciences (Kolu et al.)", year: 2018, url: "https://doi.org/10.12669/pjms.343.14345" },
    { title: "The effect of dry needling on the radiating pain in subjects with discogenic low-back pain: A randomized control trial", org: "Journal of Research in Medical Sciences (Mahmoudzadeh et al.)", year: 2016, url: "https://doi.org/10.4103/1735-1995.192502" },
    { title: "Acupuncture vs Sham Acupuncture for Chronic Sciatica From Herniated Disk: A Randomized Clinical Trial", org: "JAMA Internal Medicine (Tu et al.)", year: 2024, url: "https://doi.org/10.1001/jamainternmed.2024.5463" },
    { title: "Evaluation of pulsed electromagnetic field therapy in the management of patients with discogenic lumbar radiculopathy", org: "International Journal of Rheumatic Diseases (Omar et al.)", year: 2012, url: "https://doi.org/10.1111/j.1756-185x.2012.01745.x" },
    { title: "Percutaneous electrical nerve stimulation: an alternative to TENS in the management of sciatica", org: "Pain (Ghoname et al.)", year: 1999, url: "https://doi.org/10.1016/s0304-3959(99)00097-4" },
    { title: "Superficial heat or cold for low back pain", org: "Cochrane Database of Systematic Reviews (French et al.)", year: 2006, url: "https://doi.org/10.1002/14651858.cd004750.pub2" },
    { title: "Effects of monopolar pulsed-capacitive dielectric radiofrequency diathermy in patients with chronic low back pain: a randomised clinical trial", org: "Scientific Reports (Lara-Palomo et al.)", year: 2024, url: "https://doi.org/10.1038/s41598-024-64832-9" },
    { title: "Effect of Extracorporeal Shock Wave Therapy on Post-Laminectomy Lumbar Epidural Fibrosis", org: "Annals of Rehabilitation Medicine (Rashad et al.)", year: 2025, url: "https://doi.org/10.5535/arm.240118" },
    { title: "Can postural modification reduce kinetic and kinematic loading during the bowing postures of Islamic prayer?", org: "Ergonomics (AbouHassan et al.)", year: 2010, url: "https://doi.org/10.1080/00140139.2010.532881" },
    { title: "The reliability of prayer-based self-efficacy scale to assess self-confidence of Muslims with low back pain", org: "Physiotherapy Research International (Al-Obaidi et al.)", year: 2012, url: "https://doi.org/10.1002/pri.522" },
  ],
  //  التمارينُ أوّلاً، ثمّ المساعدُ بقاعدة المركز (سليم — §4.cx) كما في ألم الظهر الحادّ، والإرشاداتُ في كلّ سطر؛ ثمّ ما لا يُستخدم.
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — تبدأ كلُّ جلسةٍ بفحص الاتّجاه المفضَّل وتمرينه (Fritz 2021 بدأ كلَّ جلسةٍ به)، ثمّ العلاجُ اليدويّ معه (تحريكُ الفقرات، والتحريكُ مع حركة الساق — Satpute 2019: ستُّ جلساتٍ في أسبوعين خفّفت ألمَ الساق نقطتين)، ثمّ تحريكُ العصب، ثمّ التحكّمُ بالجذع والمشي؛ والبرنامجُ المنزليّ كلَّ ٤–٥ ساعات في الأيّام الأولى ثمّ يومياً.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — each session starts with directional-preference testing and its exercise (Fritz 2021 started every session this way), then manual therapy alongside it (spinal mobilisation, and mobilisation with leg movement — Satpute 2019: six sessions over two weeks reduced leg pain by two points), then neural mobilisation, then trunk control and walking; the home programme every 4–5 hours in the early days, then daily."],
      note: ["أساسيٌّ في كلّ جلسة — NICE NG59: التمرينُ، والعلاجُ اليدويّ مع التمرين لا وحده؛ والإرشادُ الدنماركيّ: التمرينُ المشرَف والعلاجُ اليدويّ إضافةً (توصيةٌ ضعيفة — Stochkendahl 2018)؛ وJOSPT 2021: التمرينُ والتحريكُ وتحريكُ العصب «may» (B)؛ وNASS: الدليلُ غيرُ كافٍ للتمرين وحده ودورةٌ محدودة خيار، والتحريكُ C (Kreiner 2014)؛ وفي التجارب أزال التحريكُ اليوميّ ألمَ الساق عند ٥٥٪ مقابل ٢٠٪ للوهميّ (Santilli 2006)، وزاد تحسّنَ ألم الساق عشرَ نقاطٍ مئوية عند ١٢ أسبوعاً لا بعد سنة (Bronfort 2014). والأثرُ فوق المسار الطبيعيّ صغير: ألمُ الساق قصيرَ المدى (Fernandez 2015)، والإعاقةُ لا ألمُ الساق (Fritz 2021 · Hahne 2017)، والتقديرُ الكلّيّ لا الألم (Luijsterburg 2008)؛ والعلاجُ الطبيعيّ لم يكن أفضلَ من متابعة الحياة اليومية في الحادّ (Hofstee 2002)، والتمرينُ وحده لم يُدعَم في التحليل الشبكيّ (Lewis 2015). والتجاربُ ٤–٢٤ جلسة بمعدّل ١–٣ في الأسبوع، ولم تقارن واحدةٌ التواتر.",
        "Core in every session — NICE NG59: exercise, with manual therapy only alongside exercise; the Danish guideline: supervised exercise and manual therapy as add-ons (weak recommendations — Stochkendahl 2018); JOSPT 2021: exercise, mobilisation and neural mobilisation 'may' (B); NASS: insufficient evidence for exercise alone with a limited course as an option, and manipulation C (Kreiner 2014); in trials daily manipulation abolished leg pain in 55% versus 20% with sham (Santilli 2006), and added 10 percentage points of leg-pain improvement at 12 weeks but not at one year (Bronfort 2014). The effect over the natural course is small: short-term leg pain (Fernandez 2015), disability but not leg pain (Fritz 2021 · Hahne 2017), and global improvement but not pain (Luijsterburg 2008); physiotherapy was no better than carrying on with daily activities in acute sciatica (Hofstee 2002), and exercise alone was not supported in the network meta-analysis (Lewis 2015). Trials used 4–24 sessions at 1–3 a week, and none compared frequencies."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على أسفل الظهر في الوضعية المريحة (الانبطاحُ بوسادةٍ تحت البطن لمن اتّجاهُه البسط)، قبل التمارين لتسهيلها لا بدلها؛ ويُفحص الإحساسُ في جلد الجذر المصاب قبلها، ولا تُوضع على ساقٍ خدراء.",
        "Over the low back in a comfortable position (prone with a pillow under the abdomen for an extension preference), before exercise to ease it, never instead of it; test sensation over the affected root first, and never place it on a numb leg."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: لا تجربةَ للحرارة في عِرق النسا (بحثٌ صفريّ مكتوب)، ودليلُها في ألم الظهر غير المحدَّد (French 2006)، واستُعملت مع غيرها في تجارب عِرق النسا. ممنوعةٌ مع ضعف الإحساس أو اضطراب الدورة أو جرح.",
        "Rotating adjunct — for comfort before exercise: there is no trial of heat in sciatica (a documented zero result); its evidence is in non-specific low back pain (French 2006), and it was used alongside other care in sciatica trials. Contraindicated with impaired sensation, poor circulation or a wound."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 20,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "100–125", intensity: "Sensory", durationMin: "20" },
      parameters: ["تحفيزٌ عبر الجلد تقليديّ (Conventional TENS) لتهدئة الألم قبل التمرين: الأقطابُ على أسفل الظهر وعلى مسار الألم في الساق، بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض — ويُقال للمريض إنّه يسكّن ولا يعالج. وفي التجارب: ١٠٠ هرتز و١٢٥ ميكروثانية ٢٠ دقيقة (Shaheen 2025 جزءاً من العلاج المعتاد).",
        "Conventional TENS to settle pain before exercise: electrodes over the low back and along the painful path in the leg, at a strong but comfortable tingling with no contraction — the patient is told it relieves but does not treat. In trials: 100 Hz and 125 µs for 20 minutes (Shaheen 2025, as part of usual care)."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والإرشاداتُ ضدّه في عِرق النسا: «لا يُقدَّم» التحفيزُ عبر الجلد ولا التيارُ المتداخل (NICE NG59)، وبقوّة (KCE 2017)، وWHO 2023 ضدّ استعماله الروتينيّ، ومراجعةُ ٢٣ إرشاداً: «لا يُفعل» باتّساق (Khorami 2021). خفّف الألمَ أكثرَ من الوهميّ في تجربةٍ تبادلية (Ghoname 1999)، وكانت تمارينُ التحكّم أفضلَ منه (França 2019). فلا يُعطى وحده ولا بدلَ التمرين — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو على جلدٍ ضعيف الإحساس.",
        "Rotating adjunct by the centre's rule (Saleem) — and guidelines oppose it in sciatica: TENS and interferential are 'do not offer' (NICE NG59), strongly so (KCE 2017), WHO 2023 is against routine use, and a review of 23 guidelines found a consistent 'do not do' (Khorami 2021). It relieved pain more than sham in a crossover trial (Ghoname 1999), and motor-control exercise beat it (França 2019). So never alone and never instead of exercise — and an item for Saleem. Contraindicated with a pacemaker or over skin with poor sensation."] },
    { code: "traction", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { forcePctBw: "25–50", holdRestS: "30 / 5", durationMin: "15", mode: "Intermittent, prone" },
      parameters: ["ليس في المرحلة الأولى، ولا مع ضعفٍ يزيد أو أعراضٍ في الساقين: بعد أن يفشل تمرينُ الاتّجاه المفضَّل، تجربةٌ محدودةٌ بأسبوعين (اقتراح) — شدٌّ متقطّع في الانبطاح يبدأ بـ٢٥٪ من وزن الجسم حتى ٥٠٪ حسب الاستجابة ١٥ دقيقة (Bilgilisoy Filiz 2018: الانبطاحُ أفضلُ من العلاج المعتاد وحده) ثمّ تمرينُ البسط؛ ويُوقف فوراً إن زاد ألمُ الساق أو انتشر أو ساءت علامةٌ عصبية. ولم تختلف القوى العالية عن المنخفضة (Vanti 2023).",
        "Not in phase 1, and not with progressive weakness or symptoms in both legs: after directional-preference exercise has failed, a trial limited to two weeks (a suggestion) — intermittent prone traction starting at 25% of body weight and up to 50% as tolerated for 15 minutes (Bilgilisoy Filiz 2018: prone traction beat usual care alone), then extension exercise; stop at once if leg pain increases or spreads or a neurological sign worsens. High forces did not differ from low ones (Vanti 2023)."],
      note: ["مساعدٌ بقاعدة المركز (سليم) بأشدّ الشروط — والإرشاداتُ ضدّه صراحةً: «لا يُقدَّم الشدّ» (NICE NG59)، وبقوّة (KCE 2017)، و«should not» للألم المزمن مع ألم الساق (JOSPT 2021 — D)، وWHO 2023 ضدّه؛ وكوكرين: لا أثرَ له على الأرجح في عِرق النسا، ومن أذاه المسجَّل زيادةُ الألم وسوءُ العلامات العصبية وجراحةٌ لاحقة (Wegner 2013). والمجموعةُ التي رُجي لها (انتشارٌ بالبسط أو رفعُ الساق المعاكسة إيجابيّ — Fritz 2007) لم تنفعها التجربةُ التالية (Thackeray 2016). فبندٌ لسليم: يبقى بشروطه أو «لا يُستخدم». ممنوعٌ مع هشاشة العظام أو كسر أو ورم أو عدم ثبات أو أعراض ذيل الفرس أو حمل.",
        "Adjunct by the centre's rule (Saleem) under the strictest conditions — and guidelines explicitly oppose it: 'do not offer traction' (NICE NG59), strongly so (KCE 2017), 'should not' for chronic low back pain with leg pain (JOSPT 2021 — D), and WHO 2023 is against it; Cochrane: probably no effect in sciatica, with documented harms of more pain, worse neurological signs and later surgery (Wegner 2013). The subgroup once thought to benefit (peripheralisation with extension or a positive crossed straight leg raise — Fritz 2007) did not benefit in the follow-up trial (Thackeray 2016). So an item for Saleem: keep it with its conditions, or set it to 'Not used'. Contraindicated with osteoporosis, fracture, tumour, instability, cauda equina symptoms or pregnancy."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على أسفل الظهر في الوضعية المريحة قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز؛ وإعداداتُ التجربة الوحيدة (Omar 2012) لم يُتحقّق منها، فيكتبها المشرفُ من جهازه.",
        "Pulsed electromagnetic field (PEMF) over the low back in a comfortable position before exercise, non-thermal — on the centre device's programme; the settings of the only trial (Omar 2012) could not be verified, so the supervisor enters them from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم)، والدليلُ ضعيف: تجربةٌ واحدة صغيرة (٤٠ مريضاً باعتلالٍ جذريّ من الغضروف) — ثلاثةُ أسابيع حسّنت الألمَ والإعاقة أكثرَ من الوهميّ (Omar 2012)؛ ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو الحمل.",
        "Adjunct by the centre's rule (Saleem), with weak evidence: one small trial (40 patients with discogenic radiculopathy) — three weeks improved pain and disability more than placebo (Omar 2012); guidelines do not address it. Contraindicated with a pacemaker or pregnancy."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على العضلات المجاورة للفقرات القطنية في الانبطاح المريح، بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف (Athermic) في الجلسات الأولى وبالنمط السعويّ ثمّ المقاوِم؛ قبل التمارين، ولا على جلدٍ ضعيف الإحساس.",
        "Over the lumbar paraspinals in comfortable prone, at low athermic-to-mild-warmth intensity in the first sessions, capacitive then resistive mode; before exercise, and never over skin with poor sensation."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — لا تجربةَ للتيكار في عِرق النسا (بحثٌ صفريّ مكتوب)، وتجربةٌ في ألم الظهر المزمن غير المحدَّد وجدته أفضلَ من الوهميّ (Lara-Palomo 2024). ممنوعٌ مع منظّم ضربات القلب أو معدنٍ مزروع في المنطقة أو الحمل أو ورم.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial of Tecar in sciatica (a documented zero result), and a trial in non-specific chronic low back pain found it better than sham (Lara-Palomo 2024). Contraindicated with a pacemaker, a metal implant in the area, pregnancy or a tumour."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 4, times: 5,
      params: { needleSize: "3–6 cm", points: "Trigger points that reproduce the leg pain", sessions: "5" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، كلَّ أربعة أيّامٍ خمسَ مرّات (بعد كلّ جلستين في Mahmoudzadeh 2016): النقاطُ الزنادية التي تعيد ألمَ الساق المألوف في الألوية الكبرى والوسطى والصغرى والكمثرية والمربّعة القطنية وباسطات الظهر والعضلة القطنية وخلف الفخذ وبطن الساق، بإبرٍ ٣–٦ سم حتى الارتعاش الموضعيّ أو إعادة الألم، ويتوقّف وخزُ العضلة حين لا يعود الألم.",
        "Dry-needling certified staff only, every four days five times (after every second session in Mahmoudzadeh 2016): trigger points that reproduce the familiar leg pain in gluteus maximus, medius and minimus, piriformis, quadratus lumborum, the back extensors, psoas, hamstrings and calf, with 3–6 cm needles until a local twitch or the pain is reproduced, stopping a muscle once its pain no longer appears."],
      note: ["مساعدٌ بموعدٍ دوريّ — أضاف الوخزُ إلى العلاج الطبيعيّ تخفيفاً لألم الساق في نهاية العلاج وبعد شهرين (Mahmoudzadeh 2016)؛ وJOSPT 2021 «can» (C) في المزمن، وWHO 2023 مع الإبر؛ أمّا الوخزُ بالإبر الصينية فـ«لا يُقدَّم» عند NICE وليس روتينيّاً عند الدنمارك، وإن نفع في تجربةٍ كبيرة لعِرق النسا المزمن (Tu 2024). ممنوعٌ مع مميّعات الدم واضطراب التخثّر ورهاب الإبر والورم أو الالتهاب الموضعيّ؛ ويُتجنّب العمقُ فوق الضلع الثاني عشر.",
        "Adjunct on a periodic schedule — needling added to physiotherapy reduced leg pain at the end of treatment and at two months (Mahmoudzadeh 2016); JOSPT 2021 'can' (C) in chronic pain, and WHO 2023 supports needling; acupuncture is 'do not offer' in NICE and not routine in the Danish guideline, though it helped in a large trial in chronic sciatica (Tu 2024). Contraindicated with anticoagulants or clotting disorders, needle phobia, and local tumour or infection; avoid depth above the twelfth rib."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسها: على أسفل الظهر، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the low back, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريحٌ لا أكثر: لا تجربةَ للأشعّة تحت الحمراء في عِرق النسا (بحثٌ صفريّ مكتوب)؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only: there is no trial of infrared in sciatica (a documented zero result); never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم (لم يذكره) — الدليلُ منخفضُ اليقين: تجربةٌ كبيرة في الحادّ مع دواء (Konstantinovic 2010: ٩٠٤ نانومتر، ٣ جول/سم²، خمسَ مرّاتٍ في الأسبوع ١٥ جلسة، بنظامٍ مكثّفٍ داخل المستشفى)، وأخرى على نقاط العصب الوركيّ (Karagül 2024: ٨٥٠ نانومتر، ٤ جول/سم² لكلّ نقطة على ستّ نقاط)؛ والليزرُ عالي الشدّة كان أسوأَ من التحفيز مع الأمواج والتمرين (Kolu 2018). ولا توصيةَ له ولا ضدّه (NICE NG59 سؤالُ بحث · KCE 2017).",
        "Not used until Saleem decides (he has not mentioned it) — low-certainty evidence: a large acute trial alongside medication (Konstantinovic 2010: 904 nm, 3 J/cm², five times a week for 15 sessions in an intensive in-patient regimen), and another over sciatic nerve points (Karagül 2024: 850 nm, 4 J/cm² per point over six points); high-intensity laser did worse than TENS with ultrasound and exercise (Kolu 2018). No recommendation for or against (NICE NG59 research question · KCE 2017)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — «لا تُقدَّم» الأمواجُ فوق الصوتية لألم الظهر مع عِرق النسا أو بدونه (NICE NG59)، وبقوّة (KCE 2017)، وWHO 2023 ضدّها.", "Not used — therapeutic ultrasound is 'do not offer' for low back pain with or without sciatica (NICE NG59), strongly so (KCE 2017), and WHO 2023 is against it."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للموجات الصادمة في الانزلاق الغضروفيّ أو عِرق النسا (بحثٌ صفريّ مكتوب)، والتجربةُ الوحيدة على الظهر في تليّفٍ بعد استئصال الصفيحة (Rashad 2025)؛ وتسليطُها على القناة والجذر لم يُختبر.",
        "Not used — there is no trial of shockwave in disc herniation or sciatica (a documented zero result), and the only lumbar trial was in fibrosis after laminectomy (Rashad 2025); applying it over the canal and nerve root is untested."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — الشمعُ للأطراف لا للظهر، ولا تجربة.", "Not used — paraffin is for the limbs, not the spine, and there is no trial."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تورّمَ يُعالَج ولا تجربة.", "Not used — there is no swelling to treat and no trial."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — المشيُ محفوظٌ غالباً ويُمشى على الأرض، ولا تجربةَ لروبوت المشي في عِرق النسا.", "Not used — walking is usually preserved and practised over ground, and there is no trial of a gait robot in sciatica."] },
  ],
  phases: [
    {
      name: ["تهدئة الألم وإيجاد الاتّجاه المفضَّل (المركزة)", "Settling pain and finding the directional preference (centralisation)"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الأسبوع الأوّل", "Week 1"],
      goals: [
        "اتّجاهٌ مفضَّل يُعرف ويتمركز به ألمُ الساق أو لا ينتشر؛ وتمرينُه يؤدّيه المريضُ وحده كلَّ ٤–٥ ساعات؛ وتصحيحُ الميل الجانبيّ لمن عنده؛ وألمُ الساق يبدأ بالنقصان؛ ومشيٌ قليلٌ متكرّر بدلَ الراحة في السرير؛ وفهمٌ للحالة ومسارها ولعلامات الخطر.",
        "A directional preference found, with leg pain centralising or at least not spreading; its exercise done alone every 4–5 hours; lateral shift corrected where present; leg pain starting to fall; short, frequent walks instead of bed rest; understanding the condition, its course and the warning signs.",
      ],
      education: [
        "• ما هي الحالة: جذرٌ عصبيٌّ متهيّج، غالباً من غضروفٍ منزلق — والانزلاقُ يتراجع وحده في الأكثر، والمنفصلُ والمندفعُ أكثرُها تراجعاً (Chiu 2015)؛ فصورةُ الرنين «الكبيرة» ليست سبباً للتشاؤم.\n" +
        "• التوقّعُ الصادق: يتحسّن الأكثر في أسابيع إلى أشهر (Vroomen 1999 · Konstantinou 2018)، والتمرينُ في البيت نصفُ العلاج.\n" +
        "• ابقَ نشيطاً: الراحةُ في السرير ليست أفضلَ من متابعة الحياة اليومية (Vroomen 1999 · Hagen 2005)؛ المشيُ القليل المتكرّر أفضلُ من الطويل.\n" +
        "• الجلوس: يُكسر كلَّ ٢٠–٣٠ دقيقة بالوقوف والبسط لمن اتّجاهُه البسط (اقتراح)، والجلوسُ المؤلم يُنذر بمسارٍ أبطأ (Vroomen 2002).\n" +
        "• النوم والنهوض: الاستلقاءُ على الجنب بوسادةٍ بين الركبتين أو على البطن لمن يريحه، والنهوضُ بالتدحرج.\n" +
        "• قاعدةُ الانتشار: تراجعُ ألم الساق نحو الظهر جيّد ولو زاد ألمُ الظهر قليلاً، وانتشارُه إلى الأسفل يعني التوقّف.\n" +
        "• بطاقةُ الخطر: صعوبةُ التبوّل أو خدرٌ بين الفخذين أو ضعفٌ يزيد في القدمين ⟵ الطوارئ في اليوم نفسِه، ولو في الليل (GIRFT 2023).",
        "• What it is: an irritated nerve root, usually from a slipped disc — and the herniation usually regresses on its own, sequestrated and extruded ones most often (Chiu 2015); a 'big' MRI picture is not a reason for pessimism.\n" +
        "• Honest expectations: most improve over weeks to months (Vroomen 1999 · Konstantinou 2018), and home exercise is half the treatment.\n" +
        "• Stay active: bed rest is no better than carrying on with daily life (Vroomen 1999 · Hagen 2005); short, frequent walks are better than long ones.\n" +
        "• Sitting: break it every 20–30 minutes by standing and extending for those with an extension preference (a suggestion); painful sitting predicts a slower course (Vroomen 2002).\n" +
        "• Sleeping and getting up: side-lying with a pillow between the knees, or face down for those it relieves, and getting up by rolling.\n" +
        "• The spreading rule: leg pain retreating towards the back is good even if back pain rises a little, and spreading further down means stop.\n" +
        "• The warning card: difficulty passing urine, numbness between the legs or increasing weakness in both feet → the emergency department the same day, even at night (GIRFT 2023).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• ألمُ الساق نقص نقطتين أو ٣٠٪ منذ البداية (Ostelo 2008).\n" +
        "• تمركزٌ ثابت (زوالٌ أو نقصٌ يبقى بعد دقيقة مشي — Albert 2012)، أو على الأقلّ لا انتشارَ طرفيّ مع النشاط اليوميّ.\n" +
        "• لا علامةَ عصبية تسوء، والقوّةُ ثابتةٌ أو أفضل.\n" +
        "• يجلس ١٥ دقيقة ويمشي ١٠ دقائق قبل أن يرتفع ألمُ الساق نقطتين.\n" +
        "(اقتراحٌ مبنيّ على الفرق المهمّ وتعريفات المركزة، لا معيارٌ مجرَّب.) وفي الجلسة ٦: لا يتمركز ولا تغيّر ⟵ يُعاد فحصُ كلّ الاتّجاهات ويُضاف تحريكُ العصب ويُكتب ذلك، وأيُّ علامة خطر ⟵ «موانع وإحالة».",
        "Progress to phase 2 when all are met:\n" +
        "• Leg pain down 2 points or 30% from the start (Ostelo 2008).\n" +
        "• Stable centralisation (abolition or reduction that holds after one minute of walking — Albert 2012), or at least no peripheralisation with daily activity.\n" +
        "• No worsening neurological sign, and strength stable or better.\n" +
        "• Sits for 15 minutes and walks for 10 minutes before leg pain rises 2 points.\n" +
        "(A proposal built on the important change and the centralisation definitions, not a tested criterion.) At session 6: not centralising and no change → re-test every direction, add neural mobilisation and record it; any warning sign → 'Contraindications and referral'.",
      ],
      notes: [
        "• كلُّ جلسةٍ تبدأ بفحص الاتّجاه المفضَّل حتى ١٠ مرّات لكلّ اتّجاه، والاتّجاهُ يتوقّف إن ساءت الأعراضُ البعيدة، والوضعيةُ الثابتة إن ساءت الحركة (Albert 2012).\n" +
        "• البسطُ للأكثر (٨٣٪ من اتّجاهات التفضيل — Long 2004 كما ينقله Delitto 2012): الانبطاح ⟵ المرفقان ⟵ البسطُ من الانبطاح مدىً جزئيّاً ثمّ كاملاً ٣ × ١٠ (Al-Banawi 2023)؛ والبسطُ من الوقوف في العمل. وللانثناء (٧٪) سحبُ الركبتين إلى الصدر، وللجانبيّ (١٠٪) تصحيحُ الميل؛ وطريقةُ ماكنزي كانت أنجحَ من التحريك اليدويّ عند شهرين لمن يتمركز ألمُه أو ينتشر (٧١٪ مقابل ٥٩٪ — Petersen 2011).\n" +
        "• العلاجُ اليدويّ مع التمرين: تحريكٌ لطيف للفقرات وتحريكٌ مع حركة الساق — لا دفعَ سريعاً مع ضعفٍ يزيد.\n" +
        "• البرنامجُ المنزليّ كلَّ ٤–٥ ساعات (Fritz 2021)، وشدُّ البطن الخفيف إن لم يُسئ الساق.\n" +
        "• الصلاةُ في هذه المرحلة بالركوع بثني الركبتين، وما يقرّره المريضُ مع مرجعه إن آلمه السجود (بطاقتُها في المرحلة ٢).",
        "• Every session starts with directional-preference testing, up to 10 repetitions per direction, stopping a direction if distal symptoms worsen and using a sustained position if movement worsens them (Albert 2012).\n" +
        "• Extension for most (83% of preference directions — Long 2004 as reported by Delitto 2012): prone lying → elbows → prone press-up in partial then full range 3 × 10 (Al-Banawi 2023); standing extension at work. For flexion (7%) knees to chest, and for lateral (10%) shift correction; the McKenzie method beat manipulation at two months in patients who centralise or peripheralise (71% versus 59% — Petersen 2011).\n" +
        "• Manual therapy with exercise: gentle spinal mobilisation and mobilisation with leg movement — no high-velocity thrust with progressive weakness.\n" +
        "• The home programme every 4–5 hours (Fritz 2021), with gentle abdominal bracing if it does not aggravate the leg.\n" +
        "• Prayer in this phase with bent-knee bowing, and whatever the patient decides with his or her religious authority if prostration hurts (its card is in phase 2).",
      ],
      exercises: [
        { code: "prone-on-elbows", sets: 1, reps: 1, hold: 120,
          note: ["أوّلاً الانبطاحُ وحده، ثمّ المرفقان إن لم ينتشر الألم.", "Prone lying alone first, then the elbows if pain does not spread."] },
        { code: "prone-press-up", sets: 3, reps: 10, hold: 2,
          note: ["لمن اتّجاهُه البسط وحده — مدىً جزئيّ ثمّ كامل، كلَّ ٤–٥ ساعات في البيت.", "Only for an extension preference — partial then full range, every 4–5 hours at home."] },
        { code: "standing-extension", sets: 1, reps: 10, hold: 2,
          note: ["في العمل وبعد كلّ جلوسٍ طويل، لمن اتّجاهُه البسط.", "At work and after every long sit, for an extension preference."] },
        { code: "lateral-shift-correction", sets: 1, reps: 10, hold: 2,
          note: ["لمن عنده ميلٌ جانبيّ وحده، قبل البسط.", "Only for a lateral shift, before extension."] },
        { code: "single-knee-to-chest", sets: 1, reps: 10, hold: 2,
          note: ["لمن اتّجاهُه الانثناء وحده (القليل) — والركبتان معاً حين يحتمل؛ ولا يُعطى لمن اتّجاهُه البسط.", "Only for a flexion preference (the minority) — both knees once tolerated; not given for an extension preference."] },
        { code: "abdominal-bracing", sets: 2, reps: 10, hold: 10 },
        { code: "log-roll",
          note: ["للنهوض من السرير في الأيّام المؤلمة.", "For getting out of bed on painful days."] },
        { code: "graded-walking",
          note: ["٥–١٠ دقائق مرّاتٍ في اليوم، وتزيد ٢–٥ دقائق يومياً ما دام ألمُ الساق لا يرتفع نقطتين (اقتراح).", "5–10 minutes several times a day, adding 2–5 minutes a day while leg pain does not rise by 2 points (a suggestion)."] },
      ],
    },
    {
      name: ["استعادة الحركة وحركة العصب والتحكّم بالجذع", "Restoring movement, nerve mobility and trunk control"],
      sessionFrom: 7, sessionTo: 12,
      timeframe: ["الأسبوع الثاني", "Week 2"],
      goals: [
        "البسطُ كاملاً دون ألمٍ في الساق؛ والعصبُ يتحرّك بالمنزلق في الاستلقاء ثمّ جالساً دون أن تبقى أعراض؛ وتمارينُ التحكّم بالجذع على أربع والجسر؛ ومشيٌ ٢٠–٣٠ دقيقة يومياً؛ وعودةٌ متدرّجة إلى الصلاة.",
        "Full extension without leg pain; the nerve moving with the supine and then seated slider without lingering symptoms; trunk control on all fours and in the bridge; 20–30 minutes of walking a day; and a graded return to prayer.",
      ],
      education: [
        "• المركزةُ علامةُ تحسّن، وعودةُ الألم إلى الساق تعني الرجوعَ إلى تمرين الاتّجاه المفضَّل أيّاماً.\n" +
        "• تحريكُ العصب ليس شدّاً: المنزلقُ يحرّكه بلطف، ولا يُدفع داخل التنميل (Coppieters 2008).\n" +
        "• التمرينُ يُبنى تدريجياً، والألمُ المحتمل في الظهر وحده مقبول؛ وثقةُ المريض بأنّه سيتحسّن جزءٌ من التحسّن (Konstantinou 2018).\n" +
        "• العودةُ إلى العمل والنشاط مبكّراً بما يحتمل (NICE NG59)، بفتراتٍ قصيرة وتغيير الوضعية.",
        "• Centralisation is a sign of improvement, and pain returning to the leg means going back to the directional-preference exercise for a few days.\n" +
        "• Nerve mobilisation is not stretching: the slider moves the nerve gently, and is never pushed into tingling (Coppieters 2008).\n" +
        "• Exercise is built up gradually, and tolerable back pain alone is acceptable; the patient's confidence in recovery is part of recovery (Konstantinou 2018).\n" +
        "• Return to work and activity early, within tolerance (NICE NG59), with short spells and changes of position.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• مؤشّرُ الإعاقة نقص ١٠ نقاطٍ أو ٣٠٪ منذ البداية (Ostelo 2008).\n" +
        "• ألمُ الساق ٣ من ١٠ أو أقلّ.\n" +
        "• رفعُ الساق المستقيمة سلبيّ مع التمييز، أو زادت زاويةُ بدء الأعراض ٢٠° فأكثر بيد الفاحص نفسِه (Nee 2022) — لا وحدها.\n" +
        "• القوّةُ ثابتةٌ أو أفضل.\n" +
        "• يجلس ٣٠ دقيقة ويمشي ٣٠ دقيقة.\n" +
        "(اقتراحٌ مبنيّ على الفرق المهمّ وخطأ القياس، لا معيارٌ مجرَّب.) وفي الجلسة ١٢: لم ينقص مؤشّرُ الإعاقة ١٠ نقاط أو ٣٠٪ ولا ألمُ الساق نقطتين ⟵ الإحالةُ إلى الطبيب والرأي الجراحيّ معقولةٌ قبل الجلسة ١٨.",
        "Progress to phase 3 when all are met:\n" +
        "• The disability index down 10 points or 30% from the start (Ostelo 2008).\n" +
        "• Leg pain 3/10 or less.\n" +
        "• Straight leg raise negative with differentiation, or the symptom-onset angle up by 20° or more with the same examiner (Nee 2022) — not on its own.\n" +
        "• Strength stable or better.\n" +
        "• Sits for 30 minutes and walks for 30 minutes.\n" +
        "(A proposal built on the important change and the measurement error, not a tested criterion.) At session 12: the disability index not down 10 points or 30% and leg pain not down 2 points → referral to the doctor for a surgical opinion is reasonable before session 18.",
      ],
      notes: [
        "• البسطُ إلى المدى الكامل ثمّ من الوقوف، ويبقى فحصُ الاتّجاه في بداية الجلسة.\n" +
        "• تحريكُ العصب: المنزلقُ في الاستلقاء أوّلاً ثمّ جالساً حين يحتمل الجلوسَ ١٥ دقيقة — ٣ × ١٠ تزيد نحو جرعة التجربة (Shaheen 2025)؛ والجلوسُ المنحني كان أفضلَ من الاستلقاء فيها.\n" +
        "• التحكّمُ بالجذع (França 2019 · Ye 2015): رفعُ القدم بالتناوب مع شدّ البطن، ثمّ الكلبُ والطائر، ثمّ الجسر — ٢ × ١٠ في البيت (Shaheen 2025) — والجمعُ بينه وبين الاتّجاه المفضَّل ممارسةٌ جيّدة (Stochkendahl 2018).\n" +
        "• الصلاة: الركوعُ بثني الركبتين ثمّ السجودُ بالسند فبلا سند، خطوةً كلّما لم يزد ألمُ الساق بعدها.",
        "• Extension to full range and then in standing, with directional testing still at the start of each session.\n" +
        "• Neural mobilisation: the supine slider first, then seated once sitting is tolerated for 15 minutes — 3 × 10 building towards the trial dose (Shaheen 2025), in which slumped sitting beat lying.\n" +
        "• Trunk control (França 2019 · Ye 2015): alternate foot lifts with bracing, then bird dog, then the bridge — 2 × 10 at home (Shaheen 2025) — combined with directional exercise as good practice (Stochkendahl 2018).\n" +
        "• Prayer: bent-knee bowing, then prostration with support and then without, a step each time leg pain is no worse afterwards.",
      ],
      exercises: [
        { code: "prone-press-up", sets: 3, reps: 10, hold: 2,
          note: ["إلى المدى الكامل، ومرّتين أو ثلاثاً يومياً.", "To full range, two or three times a day."] },
        { code: "standing-extension", sets: 1, reps: 10, hold: 2 },
        { code: "supine-sciatic-slider", sets: 3, reps: 10, hold: 5, rest: 60 },
        { code: "slump-slider-seated", sets: 3, reps: 10, hold: 5, rest: 60,
          note: ["حين يحتمل الجلوسَ ١٥ دقيقة.", "Once sitting is tolerated for 15 minutes."] },
        { code: "hook-lying-march", sets: 2, reps: 10, hold: 3, rest: 30 },
        { code: "bird-dog", sets: 2, reps: 10, hold: 5, rest: 30 },
        { code: "glute-bridge", sets: 2, reps: 10, hold: 3, rest: 45 },
        { code: "graded-walking",
          note: ["حتى ٢٠–٣٠ دقيقة يومياً، متّصلةً أو على فترتين.", "Up to 20–30 minutes a day, continuous or in two spells."] },
        { code: "prayer-bent-knee-ruku", reps: 5 },
      ],
    },
    {
      name: ["التحميل والعودة إلى العمل والصلاة", "Loading and return to work and prayer"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["الأسبوع الثالث", "Week 3"],
      goals: [
        "رفعٌ وانحناءٌ من الورك بحملٍ يحتاجه عملُه؛ وتحكّمٌ بالجذع أطولُ مدّة؛ والصلاةُ كاملةً؛ والجلوسُ والمشيُ بلا حدٍّ يذكره؛ وبرنامجٌ منزليّ مستقلّ وخطّةٌ لعودة الألم.",
        "Lifting and hip hinging with the load the job needs; longer trunk control; full prayer; sitting and walking without a noticeable limit; an independent home programme and a plan for a flare-up.",
      ],
      education: [
        "• الظهرُ قويّ، والحركةُ والرفعُ آمنان بالتدرّج — والخوفُ من الحركة يُبطئ التحسّن (Konstantinou 2018).\n" +
        "• خطّةُ العودة: إن عاد ألمُ الساق ⟵ يعود إلى تمرين اتّجاهه المفضَّل كلَّ ٤–٥ ساعات أيّاماً، ويبقى نشيطاً؛ وعلاماتُ الخطر كما في المرحلة الأولى.\n" +
        "• الاستمرارُ بالتمرين ثلاثَ إلى أربع مرّاتٍ في الأسبوع بعد الخروج (المدى الأنفع في ألم الظهر المزمن — Arora 2026، ولم يُختبر في عِرق النسا).",
        "• The back is strong, and moving and lifting are safe when graded — fear of movement slows recovery (Konstantinou 2018).\n" +
        "• The flare-up plan: if leg pain returns → back to the directional-preference exercise every 4–5 hours for a few days, staying active; the warning signs as in phase 1.\n" +
        "• Keep exercising three to four times a week after discharge (the most useful range in chronic low back pain — Arora 2026, untested in sciatica).",
      ],
      criteria: [
        "يخرج من البرنامج (أو يُمدَّد مرّةً بمعيار) حين تتحقّق كلُّها:\n" +
        "• ألمُ الساق ٢ من ١٠ أو أقلّ.\n" +
        "• مؤشّرُ الإعاقة ٢٠ أو أقلّ، أو تحسّن ٥٠٪ فأكثر.\n" +
        "• أنشطتُه في مقياس الوظيفة الخاصّ به (كالصلاة والجلوس في العمل) ٧ من ١٠ فأكثر.\n" +
        "• يؤدّي برنامجَه المنزليّ وحده ويعرف خطّةَ العودة وعلاماتِ الخطر.\n" +
        "(اقتراح.) وقد يخرج قبل الجلسة ١٨ إن تحقّقت.\n" + EXTEND_AR,
        "Discharge from the programme (or one criteria-based extension) when all are met:\n" +
        "• Leg pain 2/10 or less.\n" +
        "• The disability index 20 or less, or improved by 50% or more.\n" +
        "• Activities on the patient-specific scale (such as prayer and sitting at work) 7/10 or more.\n" +
        "• Does the home programme alone and knows the flare-up plan and the warning signs.\n" +
        "(A proposal.) Discharge may come before session 18 if these are met.\n" + EXTEND_EN,
      ],
      notes: [
        "• الانحناءُ من الورك بالعصا ثمّ رفعُ الثقل من الأرض لمن يحتاجه عملُه — ٣ × ٨–١٢ بحملٍ يزيد (اقتراح؛ لا تجربةَ في عِرق النسا)، والجلوسُ والقيام.\n" +
        "• تحريكُ العصب: الشادُّ جالساً حين لا يبقى تنميل (أصعبُ بطاقة المنزلق)، ويتوقّف إن زاد ألمُ الساق في اليوم التالي.\n" +
        "• الجسرُ الجانبيّ والكلبُ والطائر أطول، والدرّاجةُ أو المشيُ ٣٠ دقيقة.\n" +
        "• الصلاةُ كاملةً على الأرض هدفُ المرحلة.",
        "• The hip hinge with a dowel, then lifting from the floor for those whose work needs it — 3 × 8–12 with increasing load (a suggestion; no trial in sciatica), and sit-to-stand.\n" +
        "• Neural mobilisation: the seated tensioner once no tingling remains (the harder level of the slider card), stopping if leg pain is worse the next day.\n" +
        "• Longer side bridge and bird dog, and cycling or walking for 30 minutes.\n" +
        "• Full prayer on the floor is the phase goal.",
      ],
      exercises: [
        { code: "slump-slider-seated", sets: 3, reps: 10, hold: 5, rest: 60,
          note: ["الشادُّ حين لا يبقى تنميل — كما في «أصعب» على البطاقة.", "The tensioner once no tingling remains — as under 'Harder' on the card."] },
        { code: "bird-dog", sets: 3, reps: 8, hold: 10, rest: 30 },
        { code: "side-plank", sets: 3, hold: 20, rest: 30 },
        { code: "glute-bridge", sets: 3, reps: 12, hold: 3, rest: 45 },
        { code: "hip-hinge-dowel", sets: 3, reps: 10, rest: 30 },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60 },
        { code: "kettlebell-deadlift", sets: 3, reps: 8, rest: 90,
          note: ["لمن يحتاج الرفعَ في عمله أو بيته، وبحملٍ يزيد ما دام ألمُ الساق لا يعود.", "For those who lift at work or at home, with load increasing while leg pain does not return."] },
        { code: "stationary-cycling",
          note: ["أو المشيُ ٣٠ دقيقة.", "Or walking for 30 minutes."] },
        { code: "prayer-bent-knee-ruku", reps: 5,
          note: ["الصلاةُ كاملةً على الأرض بلا سند.", "Full prayer on the floor without support."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — أسئلةُ هذا البروتوكول للمشرف العام، تُزرع بـ`checklistSql` ولا تكتب فوق ما علّمه. والنصُّ العربيّ بلا أسماء دراسات (§4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العدد ١٨ بستٍّ في الأسبوع وتمديدٌ واحد بستّ بمعيار، والخروجُ المبكّر إن تحقّقت المعايير — والتجاربُ ٤–٢٤ جلسة بمعدّل ١–٣ في الأسبوع ولم تقارن واحدةٌ التواتر، واقترح البحثُ أن تكون الستُّ في الأسبوع الأوّل ثمّ تقلّ: أبقِه أو عدّله.",
    en: "18 sessions at six a week with one criteria-based extension of six, and early discharge when criteria are met — trials used 4–24 sessions at 1–3 a week and none compared frequencies, and the research suggested six a week in week 1 then tapering: keep or adjust." },
  { key: "limits", topic: "limits",
    ar: "الحدود: ألمُ الساق نقص نقطتين ثمّ ٣ ثمّ ٢ أو أقلّ، ومؤشّرُ الإعاقة نقص ١٠ ثمّ ٢٠ أو أقلّ، والجلوسُ ١٥ ثمّ ٣٠ دقيقة، وزاويةُ رفع الساق ٢٠° بيد الفاحص نفسِه — اقتراحٌ مبنيّ على الفرق المهمّ وخطأ القياس: أبقِها أو عدّلها.",
    en: "Limits: leg pain down 2 points, then 3, then 2 or less; the disability index down 10, then 20 or less; sitting 15 then 30 minutes; the straight-leg-raise angle by 20° with the same examiner — proposals built on Ostelo 2008 and Nee 2022: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة في الجلستين ٦ و١٢، والضعفُ ٣ من ٥ أو مشيةُ خبط القدم إلى رأيٍ جراحيّ في الأسبوع نفسِه، وطوارئُ ذيل الفرس — راجعها مع طبيب المركز وأبقِها أو عدّلها.",
    en: "The referral rules at sessions 6 and 12, power 3/5 or a steppage gait to a surgical opinion the same week, and the cauda equina emergency — review them with the centre's doctor and keep or adjust." },
  { key: "device-traction", topic: "devices",
    ar: "الشدُّ مساعدٌ بقاعدتك بأشدّ الشروط (بعد فشل تمرين الاتّجاه، أسبوعان، ويُوقف مع أيّ انتشار) — والإرشاداتُ ضدّه صراحةً في عِرق النسا وأذاه مسجَّل: أبقِه بشروطه أو اجعله «لا يُستخدم».",
    en: "Traction is an adjunct by your rule under the strictest conditions (after directional exercise fails, two weeks, stopped with any spreading) — guidelines explicitly oppose it in sciatica and its harms are documented: keep it with its conditions or set it to 'Not used'." },
  { key: "device-electro", topic: "devices",
    ar: "التحفيزُ الكهربائيّ والتيكارُ والمغناطيسُ والحرارةُ مساعدةٌ بقاعدتك — والإرشاداتُ ضدّ التحفيز صراحةً، ولا تجربةَ للتيكار ولا للحرارة في عِرق النسا، وتجربةٌ صغيرة للمغناطيس بلا إعداداتٍ مؤكَّدة: أبقِها أو عدّلها، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Electrotherapy, Tecar, magnetic therapy and heat are adjuncts by your rule — guidelines explicitly oppose electrotherapy, there is no trial of Tecar or heat in sciatica, and one small magnetic trial without verified settings: keep or adjust, and fill the magnetic settings from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ كلَّ أربعة أيّامٍ خمسَ مرّات كما في التجربة — أبقِها أو عدّلها أو اجعلها «لا يُستخدم».",
    en: "Dry needling is an adjunct every four days, five times, as in the trial (Mahmoudzadeh 2016) — keep, adjust, or set it to 'Not used'." },
  { key: "device-laser", topic: "devices",
    ar: "الليزرُ «لا يُستخدم» لأنّك لم تذكره، ودليلُه منخفضُ اليقين ولا توصيةَ له ولا ضدّه — أبقِه كذلك أو اجعله مساعداً بإعدادات التجربة المكتوبة في سطره.",
    en: "Laser is 'Not used' because you have not mentioned it, and its evidence is low-certainty with no recommendation either way — keep it so or make it an adjunct with the trial settings written in its line." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: ألمَ الساق وألمَ الظهر كلّاً من ١٠ (الأقلّ أفضل)، ودقائقَ الجلوس والمشي المتّصل (الأكثر أفضل)، واستبيانَ رولاند-موريس بالعربية — ومصادرُها في «التقييم».",
    en: "Add under 'Measures' → custom measure: leg pain and back pain, each out of 10 (lower is better), minutes of continuous sitting and walking (higher is better), and the Arabic Roland-Morris questionnaire (Maki 2014)." },
];

export const name = "145_physio_sciatica_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
