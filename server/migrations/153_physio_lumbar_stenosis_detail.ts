// Migration 153: تضيّقُ القناة الشوكية القطنية — البروتوكولُ الثامن عشر مفصَّلاً (§4.ek — ٢٠٢٦-١٠-١٧).
//
// المالك (٢٠٢٦-١٠-١٧): «اكمل البروتوكول التالي» — فاختار المساعدُ تضيّقَ القناة القطنية (`lumbar-stenosis-geriatric`): أكثرُ ما يأتي به كبارُ السنّ
// من ألم الساقين مع المشي — العرجُ العصبيّ عند نحو ١١٪ من البالغين ويزيد مع العمر (Katz 2022 · Jensen 2020).
// **بالقالب كاملاً** (§4.dd): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثةُ أسابيع) وتمديدٌ واحد بستٍّ لمن بلغ فرقاً مهمّاً ولم يبلغ معاييرَ الخروج،
// وزيارةُ تثبيتٍ بعد أربعة أسابيع والبرنامجُ المنزليّ مدى الحياة؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–١٢ · ١٣–١٨) بمعايير الفرق المهمّ **في التضيّق نفسِه**
// (ألمُ الساق، والمشيُ بالسرعة الذاتية، وODI، وZCQ)، **وقاعدةُ أعراضٍ للمشي والدراجة** (٤ من ١٠ ثمّ الجلوسُ منحنياً)؛ وأربعُ بطاقاتٍ جديدة (الركبتان إلى
// الصدر، والانحناءُ جالساً، والمشيُ بالمشّاية منحنياً بفترات، والوقوفُ بقدمٍ أمام الأخرى) **وصورُها الأربع وصلت معه**، والمعادةُ بصورها؛ والأجهزةُ
// الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (مسافةُ المشي حتى الأعراض، والمشيُ ٦ دقائق، وODI، والنهوضُ والمشي) وألمُ الساق
// والمسافةُ الكلّية والجلوسُ والقيامُ خمساً والأنشطةُ بالعربية وZCQ إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ التضيّق**: الصورةُ ليست المرض — ٣٠٪ من كبار السنّ عندهم تضيّقٌ شديد في الرنين وأقلُّ من خُمسهم بأعراض (Ishimoto 2013)؛ والمسارُ بلا جراحة
// مطمئنٌ غالباً والتدهورُ السريع نادر (NASS 2011) **لكنّ المشي لا يتحسّن وحده** (Wessberg 2017). **ولا إرشادَ للعلاج الطبيعيّ خاصٌّ به** (بحثٌ صفريّ):
// الكنديّ «نقترح» التثقيفَ والعلاجَ اليدويّ والتمرينَ المنزليّ مرّتين في الأسبوع ستّةَ أسابيع ثمّ يومياً (Bussières 2021)، وNASS دليلُه «غيرُ كافٍ» والحزامُ
// B (NASS 2011)، وNICE «لا تُستعمل» حقنُ فوق الجافية للعرج العصبيّ. **والجرعة**: التجاربُ ١٢ جلسة مرّتين في الأسبوع، والمرّتان أفضلُ من المرّة وكالبيت
// المرّةُ (Minetama 2020)، ولا تجربةَ لثلاثٍ فأكثر، والدوراتُ اليومية حزمُ أجهزةٍ لم تُضف (Macedo 2013) — فالعددُ ١٨ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم.
// **والأجهزة**: التمرينُ (مع العلاج اليدويّ والدراجة) أساسيّ؛ وروبوتُ المشي مساعدٌ مشروطٌ بحزامٍ يحمل الوزن؛ والإبرُ بموعدٍ دوريّ؛ والتحفيزُ والشدُّ والمغناطيسُ
// والتيكارُ والحرارةُ مساعدةٌ بقاعدة المركز والدليلُ ضدّ أكثرها مكتوبٌ في سطره؛ والليزرُ والأمواجُ فوق الصوتية والموجاتُ الصادمة «لا يُستخدم» — **فلا إعداداتِ
// جهازٍ تمنع اعتمادَه**. **وما يخصّ العراق**: الدراساتُ العراقية جراحيةٌ وتشخيصية (تضيّقٌ خِلقيّ في بغداد — Kitab 2019)، ولا دراسةَ للصلاة والوضوء (بحثٌ صفريّ).
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (١٨١ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — أربع؛ والمعادةُ (زُرعت في ١١٩ و١٢٤ و١٢٦ و١٢٩ و١٣٥ و١٣٦ و١٤٠ و١٤٥) تُربط برموزها وصورها، وما يخصّ التضيّقَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "double-knee-to-chest", nameAr: "سحب الركبتين معاً إلى الصدر", nameEn: "Double knee-to-chest",
    kind: "mobility", region: "lumbar", sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["أقوى تمارين الثني في الاستلقاء: ضمُّ الركبتين يثني أسفلَ الظهر ويسطّحه على الفراش، والثنيُ يوسّع القناةَ والثقوبَ الجانبية فيخفّ العرج. وهو من تمارين الثني في تجربة العلاج الطبيعيّ مقابل الجراحة (Delitto 2015)، ويأتي بعد ضمّ ركبةٍ واحدة. والثنيُ وحده لا يكفي — كان في أكثر البرامج الفاشلة، والفارقُ التمطيطُ والتقويةُ والدراجة (Comer 2024).",
      "The strongest lying flexion exercise: hugging both knees bends the lower back and flattens it on the mattress, and flexion widens the canal and the side openings so the claudication eases. It is one of the flexion exercises in the physiotherapy-versus-surgery trial (Delitto 2015), and follows the single knee hug. Flexion alone is not enough — it featured in most unsuccessful programmes, and stretching, strengthening and cycling made the difference (Comer 2024)."],
    start: ["مستلقٍ على ظهره على فراشٍ أو سريرٍ ثابت، والركبتان مثنيّتان والقدمان على الفراش، والرأسُ على وسادةٍ رقيقة.",
      "Lying on the back on a firm mattress or bed, knees bent and feet on the mattress, head on a thin pillow."],
    steps: [[
      "ارفع ركبةً نحو صدرك وأمسكها، ثمّ ارفع الأخرى.",
      "ضمّ الساقين بذراعيك من الأمام تحت الركبتين مباشرةً.",
      "اسحبهما برفقٍ نحو صدرك حتى تشعر بشدٍّ مريح في أسفل الظهر، والرأسُ على الوسادة.",
      "اثبت ٢٠–٣٠ ثانية وتنفّس بهدوء.",
      "أنزل القدمين واحدةً بعد الأخرى إلى الفراش، وارتح، ثمّ أعد — ثلاثَ مرّات.",
    ], [
      "Lift one knee towards your chest and hold it, then lift the other.",
      "Hug the shins with your arms from the front, just below the knees.",
      "Draw them gently towards your chest until you feel a comfortable stretch in the lower back, with the head on the pillow.",
      "Hold for 20–30 seconds, breathing calmly.",
      "Lower the feet to the mattress one at a time, rest, then repeat — three times.",
    ]],
    cues: [[
      "رفعُ الساقين معاً بقوّة البطن ⟵ واحدةٌ بعد الأخرى.",
      "رفعُ الرأس عن الوسادة ⟵ الرأسُ والكتفان مرتخيان.",
      "سحبٌ قويّ يؤلم ⟵ شدٌّ مريحٌ في الظهر فقط.",
      "حبسُ النفَس ⟵ تنفّسٌ عاديّ.",
    ], [
      "Lifting both legs together with the abdominal muscles → one at a time.",
      "Lifting the head off the pillow → head and shoulders relaxed.",
      "A hard, painful pull → only a comfortable stretch in the back.",
      "Holding the breath → normal breathing.",
    ]],
    easier: ["ركبةٌ واحدة في كلّ مرّة (بطاقةُ «سحب الركبة إلى الصدر»)؛ ومن تؤلمه ركبتاه أو عنده ركبةٌ صناعية يمسك خلف الفخذين بدل الساقين.",
      "One knee at a time (the 'Single knee-to-chest' card); with painful knees or a knee replacement, hold behind the thighs instead of the shins."],
    harder: ["ثباتٌ أطول (٤٥–٦٠ ثانية)، أو هزٌّ خفيف للحوض ذهاباً وإياباً والركبتان مضمومتان.", "A longer hold (45–60 seconds), or gentle rocking of the pelvis back and forth with the knees hugged."],
    stopIf: ["ألمٌ أو تنميلٌ يزيد في الساق، أو ألمٌ في الورك أو الركبة، أو دوخةٌ عند النهوض ⟵ يتوقّف ويخبر الأخصائيّ. ومن عنده هشاشةٌ شديدة أو كسرٌ سابق في فقرة: الأخصائيُّ يقرّر قبل البدء.",
      "Pain or tingling increasing in the leg, pain in the hip or knee, or dizziness on getting up → stop and tell the therapist. With severe osteoporosis or a previous vertebral fracture, the therapist decides before starting."],
    equipment: ["فراشٌ أو سريرٌ ثابت، ووسادةٌ رقيقة.", "A firm mattress or bed and a thin pillow."],
    doseNote: ["٣ × ٢٠–٣٠ ثانية، أو ١٠ تكراراتٍ بطيئة، مرّتين في اليوم — اقتراح: لم تذكر التجاربُ جرعتَه.", "3 × 20–30 seconds, or 10 slow repetitions, twice a day — a suggestion: trials did not report its dose."],
    images: [{ key: "double-knee-to-chest-1", ar: "مستلقيةٌ على ظهرها والركبتان مضمومتان إلى الصدر والذراعان حول الساقين من الأمام تحت الركبتين",
      en: "Lying on her back with both knees hugged to the chest and the arms around the front of the shins just below the knees", search: "double knee to chest exercise" }],
  },
  {
    code: "seated-forward-flexion", nameAr: "الانحناء للأمام جالساً", nameEn: "Seated forward flexion",
    kind: "mobility", region: "lumbar", homeSuitable: true, sets: 1, reps: 5, hold: 20, rest: 10,
    purpose: ["يثني أسفلَ الظهر جالساً فيوسّع القناة — وهو أيضاً وضعيةُ الاستراحة في المشي بفترات: حين يبلغ ألمُ الساق حدَّه يجلس وينحني حتى تهدأ الأعراض ثمّ يعود يمشي. والانحناءُ للأمام والجلوسُ يخفّفان أعراضَ التضيّق (NASS 2011)، والثنيُ جالساً من التمارين في إرشادات ألم الظهر مع ألم الساق لكبار السنّ (Delitto 2012).",
      "Bends the lower back while sitting, widening the canal — and it is also the resting position in interval walking: when leg pain reaches its limit the patient sits and bends forward until the symptoms settle, then walks again. Bending forward and sitting relieve stenosis symptoms (NASS 2011), and seated flexion is among the exercises in the low-back-pain guideline for older adults with leg pain (Delitto 2012)."],
    start: ["جالسٌ على كرسيٍّ ثابتٍ بلا عجلات، والقدمان على الأرض متباعدتان قليلاً، واليدان على الفخذين.",
      "Sitting on a stable chair without wheels, feet on the floor slightly apart, hands on the thighs."],
    steps: [[
      "انحنِ ببطء للأمام، والرأسُ يتدلّى أوّلاً.",
      "اترك ظهرك يستدير، وانزل باليدين على الساقين نحو الأرض.",
      "اثبت ٢٠–٣٠ ثانية وتنفّس بهدوء — تشعر بشدٍّ مريح في أسفل الظهر.",
      "عُد ببطء مستنداً بيديك على الفخذين، والرأسُ يرتفع آخراً.",
      "أعد خمسَ مرّات، أو حتى تهدأ أعراضُ الساق إن كانت استراحةً من المشي.",
    ], [
      "Bend forward slowly, letting the head drop first.",
      "Let your back round and slide your hands down the shins towards the floor.",
      "Hold for 20–30 seconds, breathing calmly — you feel a comfortable stretch in the lower back.",
      "Come back up slowly, pushing with your hands on the thighs, the head rising last.",
      "Repeat five times, or until the leg symptoms settle when it is a rest from walking.",
    ]],
    cues: [[
      "النهوضُ سريعاً ⟵ ببطء، فالدوخةُ شائعةٌ عند كبار السنّ.",
      "كرسيٌّ بعجلات أو منخفضٌ جداً ⟵ كرسيٌّ ثابت بارتفاعٍ عاديّ.",
      "حبسُ النفَس ⟵ تنفّسٌ عاديّ.",
    ], [
      "Sitting up quickly → slowly, since dizziness is common in older adults.",
      "A chair with wheels or a very low one → a stable chair of normal height.",
      "Holding the breath → normal breathing.",
    ]],
    easier: ["انحناءٌ أقلّ واليدان على الركبتين، أو ثباتٌ أقصر.", "Less bending with the hands on the knees, or a shorter hold."],
    harder: ["اليدان بين القدمين نحو الأرض، أو ثباتٌ أطول.", "Hands between the feet towards the floor, or a longer hold."],
    stopIf: ["دوخةٌ أو زغللة، أو ألمٌ يزيد في الساق، أو ألمٌ في الصدر ⟵ يتوقّف ويجلس مستقيماً ويخبر الأخصائيّ.",
      "Dizziness or blurred vision, increasing leg pain, or chest pain → stop, sit upright and tell the therapist."],
    equipment: ["كرسيٌّ ثابت بلا عجلات.", "A stable chair without wheels."],
    images: [{ key: "seated-forward-flexion-1", ar: "جالسةٌ على كرسيّ وجذعُها مستديرٌ للأمام فوق فخذيها والرأسُ متدلٍّ والذراعان أمام الساقين نحو الأرض",
      en: "Sitting on a chair with the trunk rounded forward over the thighs, head down and arms hanging in front of the shins towards the floor", search: "seated forward flexion lumbar stenosis" }],
  },
  {
    code: "rollator-flexed-walking", nameAr: "المشي بالمشّاية ذات العجلات بانحناءٍ خفيف (بفترات)", nameEn: "Rollator walking with slight trunk flexion (interval walking)",
    kind: "aerobic", region: "whole_body", homeSuitable: true,
    purpose: ["الانحناءُ الخفيف على مقبضَي المشّاية — كمن يدفع عربةَ التسوّق — يوسّع القناةَ فيمشي المريضُ أبعدَ قبل الأعراض (Lurie 2016)، ومقعدُها مكانُ الاستراحة منحنياً، وتخفّف خطرَ السقوط. ولا تجربةَ مضبوطة للمشّاية في التضيّق (بحثٌ صفريّ) — دليلُها من صورة المرض نفسِه، والعصا لم تُطل المشي (Comer 2010).",
      "Leaning slightly on the rollator handles — like pushing a shopping trolley — widens the canal so the patient walks further before symptoms (Lurie 2016); its seat is the place to rest bent forward, and it lowers the risk of falling. There is no controlled trial of rollators in stenosis (a documented zero result) — the rationale comes from the condition itself, and a walking stick did not lengthen walking (Comer 2010)."],
    start: ["واقفٌ خلف مشّايةٍ بأربع عجلات ومقعد، ومقبضاها بارتفاعٍ يسمح بانحناءٍ خفيف للجذع والمرفقان مثنيّان قليلاً، والمكابحُ مجرَّبة.",
      "Standing behind a four-wheeled rollator with a seat, its handles at a height that allows a slight forward lean with the elbows slightly bent, and the brakes tested."],
    steps: [[
      "امشِ بخطواتٍ طبيعية داخلَ إطار المشّاية والجذعُ مائلٌ قليلاً للأمام.",
      "استمرّ حتى يبلغ ألمُ الساق أو تنميلُها نحو ٤ من ١٠.",
      "ثبّت المكابح، واجلس على مقعدها، وانحنِ للأمام حتى تعود الأعراضُ إلى ما كانت.",
      "عُد إلى المشي — وكرّر حتى يبلغ مجموعُ المشي المدّةَ المكتوبة.",
      "سجّل كلَّ يوم: الدقائقَ حتى الاستراحة الأولى، ومجموعَ المشي.",
    ], [
      "Walk with natural steps inside the rollator frame, the trunk leaning slightly forward.",
      "Keep going until leg pain or tingling reaches about 4/10.",
      "Lock the brakes, sit on its seat and bend forward until the symptoms are back to where they were.",
      "Walk again — and repeat until the total walking time reaches the prescribed amount.",
      "Record every day: the minutes to the first rest, and the total walking time.",
    ]],
    cues: [[
      "المشّايةُ بعيدةٌ أمامه فينحني كثيراً ⟵ داخل إطارها، والانحناءُ خفيف.",
      "الجلوسُ على مقعدها والمكابحُ مفتوحة ⟵ ثبّتها أوّلاً.",
      "انتظارُ أن يشتدّ الألم ⟵ يستريح عند ٤ من ١٠.",
    ], [
      "The rollator far ahead so the patient stoops a lot → inside its frame, with only a slight lean.",
      "Sitting on the seat with the brakes off → lock them first.",
      "Waiting for the pain to get bad → rest at 4/10.",
    ]],
    easier: ["فتراتٌ أقصر (٢–٣ دقائق) واستراحاتٌ أطول، على أرضٍ مستوية داخل البيت.", "Shorter bouts (2–3 minutes) and longer rests, on level ground indoors."],
    harder: ["فتراتٌ أطول واستراحاتٌ أقلّ، ثمّ أرضٌ خارجية ومنحدرٌ خفيف، ثمّ مسافةُ المسجد أو السوق — ثمّ المشيُ بلا مشّاية لمن لا يُخشى سقوطُه.",
      "Longer bouts and fewer rests, then outdoor ground and a gentle slope, then the distance to the mosque or the market — then walking without the rollator for those not at risk of falling."],
    stopIf: ["تنميلٌ ينتشر، أو ضعفٌ في الساق، أو أعراضُ مثانةٍ أو أمعاء أو تنميلٌ بين الفخذين ⟵ يتوقّف ويخبر الأخصائيّ فوراً؛ وألمُ ربلة الساق الذي يخفّ بالوقوف ساكناً دون جلوس، أو ألمُ الصدر أو ضيقُ النفس ⟵ يتوقّف ويخبر الأخصائيّ.",
      "Spreading numbness, leg weakness, bladder or bowel symptoms, or numbness between the thighs → stop and tell the therapist at once; calf pain that eases by standing still without sitting, chest pain or breathlessness → stop and tell the therapist."],
    equipment: ["مشّايةٌ بأربع عجلات ومقعدٍ ومكابح (أو عربةُ تسوّق في السوق)، وساعةٌ أو هاتف للتوقيت.", "A four-wheeled rollator with a seat and brakes (or a shopping trolley in the market), and a watch or phone for timing."],
    doseNote: ["١٠ ⟵ ٢٠–٣٠ دقيقة مجموعاً بقاعدة الأعراض، يومياً — اقتراحٌ مبنيٌّ على مدّة الهوائيّ في التجارب (Pua 2007 · Williamson 2018).",
      "10 → 20–30 minutes in total by the symptom rule, daily — a suggestion built on the aerobic duration used in trials (Pua 2007 · Williamson 2018)."],
    images: [{ key: "rollator-flexed-walking-1", ar: "امرأةٌ كبيرة تمشي على الرصيف ويداها على مقبضَي مشّايةٍ حمراء بأربع عجلات والجذعُ مائلٌ قليلاً للأمام",
      en: "An older woman walking on a pavement with both hands on the handles of a red four-wheeled rollator, her trunk leaning slightly forward", search: "rollator walking elderly" }],
  },
  {
    code: "tandem-stance", nameAr: "الوقوف بقدمٍ أمام الأخرى (الكعبُ أمام الأصابع)", nameEn: "Tandem stance (heel-to-toe)",
    kind: "balance", region: "whole_body", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يدرّب التوازنَ على قاعدةٍ ضيّقة — ومرضى التضيّق أكثرُ سقوطاً: سقط ٤٢٪ منهم في سنة (Wada 2025)، وزاد التضيّقُ خطرَ السقوط ١٫٦ مرّة عند كبار السنّ (Kobayashi 2026)، وبرنامجُ القوّة والتوازن والمشي خفّض السقوط (Williamson 2022). والمشيةُ العريضة وفقدُ التوازن والقدمان معاً والعينان مغمضتان من علامات التضيّق نفسِه (Suri 2010).",
      "Trains balance on a narrow base — and people with stenosis fall more: 42% had fallen in a year (Wada 2025), stenosis raised the risk of falling 1.6-fold in older adults (Kobayashi 2026), and a strength, balance and walking programme reduced falls (Williamson 2022). A wide-based gait and losing balance with the feet together and eyes closed are themselves signs of stenosis (Suri 2010)."],
    start: ["واقفٌ بجانب ظهر كرسيٍّ ثابت أو طاولة، والقدمان معاً، ويدٌ على الكرسيّ، والنظرُ إلى نقطةٍ أمامك.",
      "Standing beside the back of a stable chair or a table, feet together, one hand on the chair, looking at a point ahead."],
    steps: [[
      "قف والقدمان متلاصقتان ويدٌ على الكرسيّ — حتى تثبت.",
      "ضع إحدى القدمين أمام الأخرى بحيث يلمس الكعبُ أصابعَ القدم الخلفية.",
      "ارفع اليدَ عن الكرسيّ قليلاً وأبقها قريبةً منه، واثبت حتى ٣٠ ثانية.",
      "عُد إلى القدمين معاً، ثمّ بدّل القدمَ الأمامية.",
      "ثلاثَ مرّات لكلّ قدم.",
    ], [
      "Stand with the feet together and a hand on the chair — until you are steady.",
      "Place one foot in front of the other so the heel touches the toes of the back foot.",
      "Lift the hand slightly off the chair, keeping it close, and hold for up to 30 seconds.",
      "Return to feet together, then change the front foot.",
      "Three times for each foot.",
    ]],
    cues: [[
      "الوقوفُ بعيداً عن الكرسيّ ⟵ الكرسيُّ في متناول اليد.",
      "النظرُ إلى القدمين ⟵ النظرُ إلى الأمام.",
      "الركبتان مقفلتان ⟵ لينتان قليلاً.",
    ], [
      "Standing far from the chair → keep it within reach.",
      "Looking at the feet → look ahead.",
      "Locked knees → slightly soft.",
    ]],
    easier: ["نصفُ خطوة (القدمُ بجانب الأخرى ومتقدّمةٌ نصفَ قدم)، أو اليدُ على الكرسيّ طوالَ الوقت.", "A half-step position (one foot beside the other and half a foot ahead), or the hand on the chair throughout."],
    harder: ["بلا يد، ثمّ بعينين مغمضتين وشخصٌ بجانبه، ثمّ المشيُ بالكعب أمام الأصابع بمحاذاة الطاولة.", "Without the hand, then with the eyes closed and someone alongside, then heel-to-toe walking along a counter."],
    stopIf: ["دوخةٌ، أو ميلٌ لا يُصحَّح إلّا بالإمساك، أو ألمٌ يزيد في الساق ⟵ يمسك الكرسيّ ويجلس ويخبر الأخصائيّ.",
      "Dizziness, a sway that can only be corrected by holding on, or increasing leg pain → hold the chair, sit down and tell the therapist."],
    equipment: ["كرسيٌّ ثابت أو طاولة.", "A stable chair or a table."],
    images: [{ key: "tandem-stance-1", ar: "امرأةٌ كبيرة بجانب كرسيّ: القدمان معاً ويدٌ على ظهره، ثمّ قدمٌ أمام الأخرى والكعبُ يلمس الأصابع والذراعان بجانبها",
      en: "An older woman beside a chair: feet together with a hand on its back, then one foot in front of the other with the heel touching the toes and the arms by her sides", search: "tandem stance balance exercise elderly" }],
  },
];

const SYMPTOM_RULE_AR = "قاعدةُ الأعراض في المشي والدراجة: يمشي (أو يدوّر) حتى يبلغ ألمُ الساق أو تنميلُها نحو ٤ من ١٠ أو نقطتين فوق ما كان عليه في الراحة، ثمّ يجلس منحنياً للأمام حتى تعود الأعراضُ إلى ما كانت، ثمّ يعيد — حتى ٢٠–٣٠ دقيقة في الجلسة؛ وتهدأ الأعراضُ خلال نحو ٣٠ دقيقة بعد التمرين ولا تزيد صباحَ اليوم التالي — وإلّا خُفّف الحِملُ درجةً. ويتوقّف فوراً ويُفحص إن انتشر التنميل أو ظهر ضعفٌ أو أعراضُ مثانةٍ أو أمعاء أو تنميلٌ بين الفخذين. والقاعدةُ اقتراحٌ مبنيٌّ على عتبة «الألم المتوسّط» في اختبار السير (Markman 2015) وعلى «ما يتحمّله المريض» في التجارب (Pua 2007)، ولا تجربةَ قارنت قواعدَ الأعراض (بحثٌ صفريّ). ويُقال للمريض: لا بأسَ ببعض الألم مع المشي، وكثيرون يسوؤون قليلاً قبل أن يتحسّنوا (Ammendolia 2025).";
const SYMPTOM_RULE_EN = "Symptom rule for walking and cycling: walk (or pedal) until leg pain or tingling reaches about 4/10 or two points above its resting level, then sit bent forward until the symptoms are back where they were, then repeat — up to 20–30 minutes in a session; the symptoms settle within about 30 minutes after exercise and are not worse the next morning — otherwise the load drops one step. Stop at once and assess if numbness spreads, weakness appears, or bladder or bowel symptoms or numbness between the thighs appear. The rule is a suggestion built on the 'moderate pain' threshold of the treadmill test (Markman 2015) and on 'participant tolerance' in trials (Pua 2007); no trial compared symptom rules (a documented zero result). The patient is told: some pain with walking is fine, and many get a little worse before they get better (Ammendolia 2025).";
const EXTEND_AR = "وفي الجلسة ١٨: تمديدٌ واحد بستّ جلسات (حتى ٢٤) إن بلغ مقياسٌ واحد على الأقلّ الفرقَ المهمّ (ODI ٨٫٥ نقطة، أو المشيُ ٣٠٪، أو ZCQ ٠٫٣) ولم تتحقّق معاييرُ الخروج، ولا علامةَ إحالة؛ ومن لم يبلغ أيّاً منها لا يُمدَّد: يُراجَع التشخيصُ والالتزامُ مع طبيب المركز (القواعدُ في «موانع وإحالة»)، والبرنامجُ المنزليّ يستمرّ. وبعد الخروج: زيارةُ تثبيتٍ نحو الأسبوع الرابع (Ammendolia 2016) ومراجعةٌ نحو الشهر الثالث، والبرنامجُ المنزليّ اليوميّ مدى الحياة (Bussières 2021) — فالالتزامُ يقلّ بعد انتهاء الإشراف ويضيع معه الأثر (Williamson 2022). ولا تجربةَ لدورةٍ ثانية أو ممدَّدة (بحثٌ صفريّ).";
const EXTEND_EN = "At session 18: one extension of six sessions (to 24) if at least one measure has reached the important change (ODI 8.5 points, walking 30%, or ZCQ 0.3) without meeting the discharge criteria, and with no referral trigger; a patient who has reached none is not extended: the diagnosis and adherence are reviewed with the centre's doctor (the rules under 'Contraindications and referral'), and the home programme continues. After discharge: a booster visit around week 4 (Ammendolia 2016) and a review around month 3, with the daily home programme for life (Bussières 2021) — adherence falls once supervision ends, and the effect goes with it (Williamson 2022). There is no trial of a second or extended course (a documented zero result).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "lumbar-stenosis-geriatric",
  summary: [
    "تضيّقُ القناة الشوكية القطنية التنكّسيّ (Degenerative lumbar spinal stenosis): نقصٌ في المساحة المتاحة للأعصاب في القناة القطنية من تنكّس الأقراص والمفاصل والأربطة، يظهر بالعرج العصبيّ (Neurogenic claudication) — ألمٌ أو تنميلٌ أو ثقلٌ أو ضعفٌ في الأليتين والساقين، مع ألم الظهر أو بدونه، يبدأ بالوقوف والمشي ويخفّ بالانحناء للأمام والجلوس والاستلقاء (NASS 2011)؛ ومن علاماته أن يمشي المريضُ منحنياً على عربة التسوّق (Lurie 2016). " +
    "والتضيّقُ في الصورة ليس المرض: ٣٠٪ من كبار السنّ عندهم تضيّقٌ شديد في الرنين، و١٧٫٥٪ منهم فقط بأعراض (Ishimoto 2013)، ولا تتبع شدّةُ الألم ومسافةُ المشي شدّةَ التضيّق في الصورة (Sekiguchi 2023). وأعراضُه عند نحو ١١٪ من البالغين وتزيد مع العمر (Katz 2022 · Jensen 2020)، وفي فحصٍ سكّانيّ بعمرٍ متوسّط ٦٦ سنة ٩٫٣٪ (Ishimoto 2012)، وكثيراً ما ترافقه خشونةُ الورك أو الركبة (Young 2022). " +
    "مسارُه بلا جراحة مطمئنٌ غالباً: يتحسّن ثلثُ المرضى إلى نصفهم والتدهورُ العصبيّ السريع نادر (NASS 2011)، وفي ثلاث سنوات تحسّن ألمُ الساق عند ٣٢٪ وبقي عند ٥٥٪ وساء عند ١٣٪ — والمشيُ لم يتحسّن وحده (Wessberg 2017)؛ وذيلُ الفرس الحادّ نادر (حالةٌ في ٣٤٠ — Johnsson 2004). " +
    "الإرشادات: لا إرشادَ للعلاج الطبيعيّ خاصٌّ بالتضيّق (بحثٌ صفريّ). الكنديّ: «نقترح» التثقيفَ والعلاجَ اليدويّ والتمرينَ المنزليّ معاً مرّتين في الأسبوع ستّةَ أسابيع، ثمّ تمريناً منزلياً يومياً — ٣٠ دقيقة دراجة و٣٠ دقيقة تمارين (Bussières 2021 — توصيةٌ مشروطة بيقينٍ متوسّط)، وهو ضدّ حقن الكورتيزون فوق الجافية والبريغابالين والغابابنتين ومضادّات الالتهاب؛ وNASS: العلاجُ الطبيعيّ وحده دليلُه غيرُ كافٍ ودورةٌ محدودة منه خيار، والحزامُ القطنيّ يطيل المشيَ ما دام يُلبس (B) (NASS 2011)؛ والياباني: التمرينُ المشرَف أفضلُ من الذاتيّ إلّا في الشديد (Takeshita 2023)؛ وNICE: «لا تُستعمل» الحقنُ فوق الجافية للعرج العصبيّ في تضيّق القناة المركزيّ (NICE NG59). " +
    "وفي التجارب: العلاجُ اليدويّ مع التمرين والتثقيف أفضلُ من الرعاية الطبية أو التمارين الجماعية أو الذاتية بيقينٍ متوسّط (Ammendolia 2022 · Schneider 2019 · Ammendolia 2018)؛ والعلاجُ الطبيعيّ ساوى الجراحةَ عند سنتين فيمن رُشّحوا لها، وإن انتقل ٥٧٪ منهم إليها (Delitto 2015)؛ والإشرافُ مرّتين في الأسبوع زاد المشيَ ٤٥٦ متراً على البرنامج المنزليّ (Minetama 2019) وخفّض الجراحةَ في سنة من ٢٣٪ إلى ٧٪ (Minetama 2021)، والمرّةُ في الأسبوع كالبيت (Minetama 2020)؛ والدراجةُ كالمشي بحمل الوزن (Pua 2007). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ بنهجٍ معرفيّ سلوكيّ، وتمارينُ الثني والتمطيط، والعلاجُ اليدويّ وتحريكُ العصب، والدراجةُ أو المشيُ بقاعدة الأعراض، والتقويةُ والتوازنُ ومنعُ السقوط، والبرنامجُ المنزليّ — والأجهزةُ مساعدة؛ وثلاثُ مراحل: ضبطُ الأعراض والثني، ثمّ التكييفُ والقوّة، ثمّ تحمّلُ المشي والتوازنُ والإدارةُ الذاتية. " +
    "والعددُ ١٨ جلسة بستٍّ في الأسبوع: التجاربُ ١٢ جلسة مرّتين في الأسبوع ستّةَ أسابيع (والمدى ٨–١٨)، ولا تجربةَ قارنت ثلاثاً فأكثر بمرّتين (بحثٌ صفريّ)، والدوراتُ اليومية لم تكن إلّا حزمَ أجهزةٍ لم يثبت فضلُها (Macedo 2013) — فهو اختيارُ خدمةٍ مكتوبٌ صريحاً: أسبوعان سهلان ثمّ متوسّطان كما في التجارب، والأثقلُ يوماً بعد يوم.",
    "Degenerative lumbar spinal stenosis: reduced space for the nerves in the lumbar canal from degeneration of the discs, facet joints and ligaments, presenting as neurogenic claudication — pain, tingling, heaviness or weakness in the buttocks and legs, with or without back pain, brought on by standing and walking and eased by bending forward, sitting and lying down (NASS 2011); one sign is the patient walking bent over a shopping trolley (Lurie 2016). " +
    "Stenosis on imaging is not the disease: 30% of older people have severe stenosis on MRI and only 17.5% of them have symptoms (Ishimoto 2013), and pain severity and walking distance do not follow the severity of narrowing on imaging (Sekiguchi 2023). Symptoms affect about 11% of adults, rising with age (Katz 2022 · Jensen 2020), 9.3% in a population survey with a mean age of 66 (Ishimoto 2012), and hip or knee osteoarthritis often coexists (Young 2022). " +
    "Its course without surgery is mostly reassuring: a third to a half of patients improve and rapid neurological decline is rare (NASS 2011); over three years leg pain improved in 32%, stayed the same in 55% and worsened in 13% — and walking did not improve on its own (Wessberg 2017); acute cauda equina syndrome is rare (one case in 340 — Johnsson 2004). " +
    "Guidelines: there is no physiotherapy guideline specific to stenosis (a documented zero result). The Canadian guideline: 'we suggest' education, manual therapy and home exercise together twice a week for six weeks, then daily home exercise — 30 minutes of cycling and 30 minutes of exercises (Bussières 2021 — conditional, moderate certainty), and it is against epidural steroid injections, pregabalin, gabapentin and anti-inflammatories; NASS: insufficient evidence for physiotherapy alone, with a limited course as an option, and a lumbar corset lengthening walking while it is worn (B) (NASS 2011); the Japanese guideline: supervised exercise is better than self-training except in severe cases (Takeshita 2023); NICE: 'do not use' epidural injections for neurogenic claudication in central canal stenosis (NICE NG59). " +
    "In trials: manual therapy with exercise and education beat medical care, group exercise or self-directed exercise with moderate certainty (Ammendolia 2022 · Schneider 2019 · Ammendolia 2018); physiotherapy equalled surgery at two years in surgical candidates, although 57% crossed over to it (Delitto 2015); supervision twice a week added 456 m of walking over a home programme (Minetama 2019) and cut surgery within a year from 23% to 7% (Minetama 2021), while once a week equalled home exercise (Minetama 2020); cycling equalled body-weight-supported walking (Pua 2007). " +
    "So the protocol: a core in every session — education with a cognitive-behavioural approach, flexion and stretching exercises, manual therapy and nerve mobilisation, cycling or walking by the symptom rule, strengthening, balance and fall prevention, and the home programme — with devices as adjuncts; three phases: symptom control and flexion, then conditioning and strength, then walking endurance, balance and self-management. " +
    "The dose is 18 sessions at six a week: trials used 12 sessions twice a week for six weeks (range 8–18), no trial compared three or more a week with two (a documented zero result), and daily courses were only device packages with no proven added value (Macedo 2013) — so it is a service choice stated openly: two easy weeks and then moderate ones, as in the trials, with the heavier work every other day.",
  ],
  goals: [
    "• ألمُ الساق (من ١٠) ينقص ١٫٥ نقطة فأكثر (الفرقُ المهمّ في التضيّق — Cleland 2012).\n" +
    "• المشيُ بالسرعة الذاتية حتى التوقّف يزيد ٣٠٪ أو ١٥١ متراً فأكثر (Ammendolia 2018 · Minetama 2024)، ومسافةُ ظهور الأعراض والمشيُ ٦ دقائق تزيدان.\n" +
    "• مؤشّرُ الإعاقة (ODI) ينقص ٨٫٥ نقطة أو ٣٠٪ فأكثر (Young 2026 · Indrekvam 2024).\n" +
    "• خطرُ السقوط ينقص: النهوضُ والمشي (TUG) أقلُّ من ١٢ ثانية، والجلوسُ والقيامُ خمسَ مرّات أقلُّ من ١٢ ثانية (Lusardi 2017).\n" +
    "• المشيُ إلى المسجد أو السوق والوقوفُ في الصلاة بالاستراحات المخطَّطة، والأنشطةُ التي اختارها المريض تتحسّن نحو نقطتين.\n" +
    "• برنامجٌ منزليّ يوميّ يؤدّيه وحده مدى الحياة — تمارينُ ٢٠–٣٠ دقيقة ودراجةٌ أو مشيٌ ٢٠–٣٠ دقيقة (Bussières 2021).\n" +
    "• فهمُ الحالة ومسارها، وأنّ الألمَ مع المشي لا يعني ضرراً، وعلاماتِ ذيل الفرس.",
    "• Leg pain (out of 10) down 1.5 points or more (the important change in stenosis — Cleland 2012).\n" +
    "• Self-paced walking to the forced stop up 30% or 151 m or more (Ammendolia 2018 · Minetama 2024), with the distance to symptom onset and the 6-minute walk increasing.\n" +
    "• The disability index (ODI) down 8.5 points or 30% or more (Young 2026 · Indrekvam 2024).\n" +
    "• Lower fall risk: Timed Up and Go under 12 seconds, and five sit-to-stands under 12 seconds (Lusardi 2017).\n" +
    "• Walking to the mosque or the market and standing in prayer with planned rests, and the activities the patient chose improving by about 2 points.\n" +
    "• A daily home programme done independently for life — 20–30 minutes of exercises and 20–30 minutes of cycling or walking (Bussières 2021).\n" +
    "• Understanding of the condition and its course, that pain with walking does not mean harm, and the signs of cauda equina syndrome.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج (نحو ٦٠ دقيقة):\n" +
    "• التاريخ: الدقائقُ والمسافةُ حتى ظهور ألم الساق، وما يخفّفه (الجلوسُ والانحناءُ وعربةُ التسوّق)، والساقان أم واحدة، والسقوطُ في السنة الأخيرة، والسكّريّ وأمراضُ القلب والضغط، والأدوية (ومميّعاتُ الدم للإبر).\n" +
    "• ما يرجّح التضيّق (Suri 2010): لا ألمَ في الجلوس (نسبةُ الأرجحية ٧٫٤)، والتحسّنُ بالانحناء للأمام (٦٫٤)، والألمُ في الأليتين أو الساقين معاً (٦٫٣)، والمشيةُ العريضة (١٣)، وفقدُ التوازن والقدمان معاً والعينان مغمضتان عشرَ ثوانٍ (٤٫٢)؛ وأداةُ الدعم التشخيصيّ ٧ فأكثر من ١٦ (Konno 2007)، وألمُ الفخذ بعد بسط الظهر ٣٠ ثانية (Katz 1995).\n" +
    "• ما يجب نفيُه (Tomkins-Lane 2020): نبضُ القدم، ومؤشّرُ الكاحل والعضد إن توفّر — أقلُّ من ٠٫٩ يرجّح العرجَ الوعائيّ (Jeon 2012)، وألمُ ربلة الساق الذي يخفّ بالوقوف ساكناً دون جلوس وعائيٌّ غالباً (Nadeau 2013)؛ وفحصُ الورك — ألمُ الأربية (٤٫٩) والتدويرُ المؤلم المحدود (٢١–٩٩) يرجّحان خشونةَ الورك (Rainville 2019)؛ واعتلالُ النخاع الرقبيّ (ثقلُ اليدين وعلامةُ Hoffmann والمشية)؛ واعتلالُ الأعصاب الطرفية (تنميلٌ في القدمين لا يتغيّر بالوضعية — السكّريّ).\n" +
    "• الفحصُ العصبيّ: قوّةُ عضلات الساق من L2 إلى S1، والمنعكساتُ، والإحساس.\n" +
    "• اختبارُ المشي بالسرعة الذاتية: على أرضٍ مستوية بسرعته حتى يُجبَر على التوقّف أو ٣٠ دقيقة؛ تُكتب مسافةُ ظهور الأعراض (المقياسُ المزروع) والمسافةُ الكلّية ومكانُ الأعراض — ثباتُه ٠٫٩٨ (Tomkins 2009)؛ أو المشيُ ٦ دقائق (المزروع).\n" +
    "• المقاييس: ODI بالعربية (Algarni 2014)؛ وألمُ الظهر وألمُ الساق كلٌّ من ١٠ (Alghadir 2016)؛ وZCQ (لا نسخةَ عربية محكَّمة — مسوّدةٌ منشورة قبل التحكيم: Abdulmajeed 2023)؛ والأنشطةُ التي يختارها المريض بالعربية (الوقوفُ في الصلاة والمشيُ إلى المسجد أو السوق — Aldaihan 2026)؛ والنهوضُ والمشي (المزروع)، والجلوسُ والقيامُ خمسَ مرّات، وBerg لمن عمرُه ٦٥ فأكثر أو سقط.\n" +
    "• يُعاد التقييمُ كاملاً في الجلسات ٦ و١٢ و١٨ (و٢٤ إن مُدّد)، وأسئلةُ ذيل الفرس والقوّةُ في كلّ جلسة.",
    "At the first session, before any treatment (about 60 minutes):\n" +
    "• History: the minutes and distance until leg pain starts, what relieves it (sitting, bending forward, a shopping trolley), one leg or both, falls in the past year, diabetes, heart disease and blood pressure, and medicines (including anticoagulants for needling).\n" +
    "• Features favouring stenosis (Suri 2010): no pain when seated (likelihood ratio 7.4), improvement on bending forward (6.4), pain in both buttocks or legs (6.3), a wide-based gait (13), and losing balance with the feet together and eyes closed for ten seconds (4.2); a diagnostic support tool score of 7 or more out of 16 (Konno 2007), and thigh pain after 30 seconds of back extension (Katz 1995).\n" +
    "• What must be ruled out (Tomkins-Lane 2020): foot pulses, and the ankle-brachial index where available — below 0.9 favours vascular claudication (Jeon 2012), and calf pain that eases by standing still without sitting is usually vascular (Nadeau 2013); the hip examination — groin pain (4.9) and painful restricted rotation (21–99) favour hip osteoarthritis (Rainville 2019); cervical myelopathy (clumsy hands, the Hoffmann sign, gait); and peripheral neuropathy (numbness in the feet that does not change with posture — diabetes).\n" +
    "• Neurological examination: leg muscle strength from L2 to S1, reflexes and sensation.\n" +
    "• The self-paced walking test: on level ground at the patient's own pace until forced to stop, or 30 minutes; record the distance to symptom onset (the seeded measure), the total distance and where the symptoms are — reliability 0.98 (Tomkins 2009); or the 6-minute walk (seeded).\n" +
    "• Measures: the Arabic ODI (Algarni 2014); back pain and leg pain, each out of 10 (Alghadir 2016); the ZCQ (no peer-reviewed Arabic version — a preprint: Abdulmajeed 2023); the Arabic patient-specific activities (standing in prayer, walking to the mosque or the market — Aldaihan 2026); Timed Up and Go (seeded), five sit-to-stands, and the Berg scale for those aged 65 or over or who have fallen.\n" +
    "• The full assessment is repeated at sessions 6, 12 and 18 (and 24 if extended), with the cauda equina questions and strength at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• الثني: إمالةُ الحوض، والركبتان إلى الصدر، والقطُّ والجمل، والانحناءُ جالساً — وهو وضعيةُ الاستراحة أيضاً (Delitto 2015)؛ والثنيُ وحده لا يكفي: كان في أكثر البرامج الفاشلة، والفارقُ التمطيطُ والتقويةُ والدراجة (Comer 2024).\n" +
    "• التمطيط: مقدّمةُ الورك، وخلفُ الفخذ، وبطنُ الساق — ٣ × ٣٠ ثانية (Ammendolia 2016 · Williamson 2018).\n" +
    "• العلاجُ اليدويّ مع التمرين لا وحده: تحريكُ الفقرات القطنية بالثني والإبعاد، وتحريكُ الورك والصدر، وتحريكُ العصب الوركيّ (Schneider 2019)؛ والتحريكُ وحده لم يفُق الانتظار (Ammendolia 2022).\n" +
    "• الهوائيّ بقاعدة الأعراض: الدراجةُ والجذعُ مائلٌ للأمام ٥٠–٦٠ دورة في الدقيقة أسبوعين بسرعةٍ مريحة ثمّ متوسّطة حتى ٣٠ دقيقة (Pua 2007)، أو المشيُ بالمشّاية أو على السير بحزامٍ يحمل الوزن (الروبوت)، ثمّ المشيُ على الأرض بفتراتٍ وحلقةُ مشيٍ ٢٠ دقيقة (Williamson 2018).\n" +
    "• التقوية: الجلوسُ والقيام، ومدُّ الركبة جالساً، والوركُ واقفاً في ثلاثة اتّجاهات، والجسر، وصعودُ الدرجة — ٢–٣ × ٨–١٢ بجهدٍ «متوسّطٍ إلى شاقٍّ قليلاً» (Borg ١٣–١٥) تتدرّج بالتكرار ثمّ الحِمل (Williamson 2018)؛ وتثبيتُ الجذع في الحياد أو الثني (Schneider 2019).\n" +
    "• التوازنُ ومنعُ السقوط: نقلُ الوزن، والوقوفُ بقدمٍ أمام الأخرى، والوقوفُ على ساقٍ بإسناد، والمشيُ بين العوائق ومع مهمّةٍ ثانية — سقط ٤٢٪ من مرضى التضيّق في سنة (Wada 2025)، وبرنامجُ القوّة والتوازن والمشي خفّض السقوط (Williamson 2022)، وتمارينُ التوازن نادرةٌ في التجارب (Comer 2024).\n" +
    "• البرنامجُ المنزليّ: مرّتين يومياً أثناء العلاج (٥–٦ تمارين نحو ٢٠ دقيقة — Ammendolia 2016)، ثمّ يومياً مدى الحياة: تمارينُ ٢٠–٣٠ دقيقة ودراجةٌ أو مشيٌ ٢٠–٣٠ دقيقة (Bussières 2021)، وعددُ الخطوات يزيد نحو ١٠٠٠ يومياً عمّا بدأ (Minetama 2024 — اقتراح).\n" +
    SYMPTOM_RULE_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Flexion: pelvic tilt, both knees to the chest, cat-camel and seated forward flexion — which is also the resting position (Delitto 2015); flexion alone is not enough: it featured in most unsuccessful programmes, and stretching, strengthening and cycling made the difference (Comer 2024).\n" +
    "• Stretching: the front of the hip, the hamstrings and the calf — 3 × 30 seconds (Ammendolia 2016 · Williamson 2018).\n" +
    "• Manual therapy alongside exercise, never alone: lumbar flexion-distraction mobilisation, hip and thoracic mobilisation, and sciatic nerve mobilisation (Schneider 2019); manipulation alone did not beat waiting (Ammendolia 2022).\n" +
    "• Aerobic work by the symptom rule: cycling with the trunk leaning forward at 50–60 rpm, at a comfortable pace for two weeks and then moderate, up to 30 minutes (Pua 2007), or walking with a rollator or on the treadmill with a body-weight-support harness (the robot), then walking over ground in intervals and a 20-minute walking circuit (Williamson 2018).\n" +
    "• Strengthening: sit-to-stand, seated knee extension, standing hip work in three directions, the bridge and step-ups — 2–3 × 8–12 at a 'moderate to somewhat hard' effort (Borg 13–15), progressed by repetitions and then load (Williamson 2018); and trunk stabilisation in neutral or flexion (Schneider 2019).\n" +
    "• Balance and fall prevention: weight shifting, tandem stance, single-leg stance with support, and obstacle and dual-task walking — 42% of people with stenosis had fallen in a year (Wada 2025), a strength, balance and walking programme reduced falls (Williamson 2022), and balance exercise was rare in trials (Comer 2024).\n" +
    "• The home programme: twice a day during treatment (5–6 exercises, about 20 minutes — Ammendolia 2016), then daily for life: 20–30 minutes of exercises and 20–30 minutes of cycling or walking (Bussières 2021), with the daily step count rising by about 1,000 over the starting value (Minetama 2024 — a suggestion).\n" +
    SYMPTOM_RULE_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: أسئلةُ ذيل الفرس، والقوّةُ في الساقين — فالتضيّقُ قد يضغط ذيلَ الفرس تدريجياً، وأعراضُه البطيئة تُغفَل عند كبار السنّ (Comer 2020)، واضطرابُ التبوّل نفسُه من علامات التضيّق (Suri 2010).\n" +
    "• طوارئ في اليوم نفسِه (المسارُ البريطانيّ الوطنيّ لذيل الفرس — GIRFT 2023): ألمُ الظهر أو الساق ومعه شيءٌ بدأ خلال أسبوعين من: صعوبةُ بدء التبوّل أو ضعفُ الإحساس بمروره، أو تغيّرُ الإحساس حول الشرج وبين الفخذين، أو ضعفٌ شديد أو متزايد في الساقين معاً، أو فقدُ الإحساس بامتلاء المستقيم، أو ضعفٌ جنسيّ مستجدّ — يُرسل فوراً إلى مستشفى فيه رنينٌ عاجل، وتُكتب الساعةُ والفحصُ وإلى مَن أُحيل؛ ولا تنفي الفحوصُ السلبية ذيلَ الفرس ما دامت الأعراض (GIRFT 2023)، والعلاماتُ وحدها ضعيفةُ الحساسية (Dionne 2019).\n" +
    "• عاجل خلال أسبوعين (GIRFT 2023): ألمٌ جذريّ في الساقين معاً بدأ فجأة أو صار فيهما بعد واحدة، أو أعراضُ ذيل الفرس بدأت قبل أكثرَ من أسبوعين وثابتة؛ وضعفٌ جديد أو يزيد في الساق ⟵ رأيُ جرّاح العمود (Bussières 2021).\n" +
    "• كسرُ فقرةٍ محتمل ⟵ الطبيب قبل البدء: العمرُ فوق ٧٠ (نسبةُ الأرجحية ١١)، أو الكورتيزونُ طويلاً، أو رضّ، أو امرأةٌ كبيرة (Han 2023)؛ وورمٌ سابق، أو حمّى، أو نقصُ وزنٍ غير مفسَّر، أو ألمٌ ليليّ ثابت ⟵ الطبيب (Finucane 2020 · Downie 2013).\n" +
    "• مراجعةُ الطبيب في الأسبوع الأوّل: صورةُ العرج الوعائيّ (ألمُ ربلة الساق يخفّ بالوقوف ساكناً، ونبضٌ ضعيف، ومؤشّرُ الكاحل والعضد أقلُّ من ٠٫٩ — Jeon 2012 · Park 2020)؛ وخشونةُ الورك (ألمُ الأربية والتدويرُ المؤلم المحدود والعرج — Rainville 2019)، ويُعالَج الاثنان إن اجتمعا؛ وعلاماتُ اعتلال النخاع الرقبيّ (يرافق التضيّقَ القطنيَّ تضيّقٌ رقبيّ عند ٨–٦٠٪ — Sekiguchi 2023)؛ وتنميلُ القدمين المتماثل الذي لا يتغيّر بالوضعية (اعتلالُ الأعصاب).\n" +
    "• رأيُ الجرّاح (غيرُ عاجل): عرجٌ شديد بمشيٍ ١٠٠ متر أو أقلّ، أو ضعفٌ جديد أو يزيد، أو فشلُ دورةٍ مناسبة من العلاج غير الجراحيّ (Bussières 2021). وقواعدُ هذا البروتوكول (اقتراح): في الجلسة ٦ — لا تغيّرَ في ألم الساق ولا المشي ⟵ يُعاد فحصُ الوعائيّ والورك والأعصاب والالتزام؛ وفي الجلسة ١٨ — لم يبلغ أيٌّ من ألم الساق والمشي وODI الفرقَ المهمّ ⟵ طبيبُ المركز؛ وبعد ثلاثة أشهر من علاجٍ مناسب والأعراضُ لا يقبلها المريض ⟵ رأيُ جرّاح العمود قراراً مشتركاً — والجراحةُ المتأخّرة نتائجُها كالمبكّرة (Amundsen 2000)، وتجاربُ الجراحة أخذت مَن فشل علاجُه غيرُ الجراحيّ ٣–٦ أشهر (Kovacs 2011).\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): حقنُ الكورتيزون فوق الجافية لم تزد على المخدّر وحده عند ستّة أسابيع (Friedly 2014) و«لا تُستعمل» للعرج العصبيّ (NICE NG59)؛ والبريغابالين لم يفُق الدواءَ الوهميّ في المشي (Markman 2015)؛ والجراحةُ أسرعُ راحةً فيمن اختارها وتتقارب النتائجُ بعد سنوات (Lurie 2015)، والمشيُ لم يختلف بينها وبين العلاج غير الجراحيّ (Malmivaara 2007)، ومضاعفاتُها ١٠–٢٤٪ (Zaina 2016).\n" +
    "موانعُ العلاج اليدويّ والأجهزة: الكسرُ وهشاشةُ العظام الشديدة، والورمُ والالتهابُ في المنطقة، وعدمُ ثبات الفقرات (الانزلاقُ غيرُ المستقرّ) للشدّ والتحريك القويّ؛ والإبرُ مع مميّعات الدم أو اضطراب التخثّر أو التهاب الجلد أو الخوف الشديد منها.",
    "Before every session: the cauda equina questions and leg strength — stenosis can compress the cauda equina gradually, its slow-onset symptoms are overlooked in older people (Comer 2020), and urinary disturbance is itself a sign of stenosis (Suri 2010).\n" +
    "• Same-day emergency (the UK national cauda equina pathway — GIRFT 2023): back or leg pain plus any of these starting within the last two weeks: difficulty starting urination or reduced sensation of the urine flow, altered sensation around the anus and between the legs, severe or progressive weakness in both legs, loss of the sense of rectal fullness, or new sexual dysfunction — send at once to a hospital with emergency MRI, recording the time, findings and receiving clinician; negative tests do not rule out cauda equina syndrome while the symptoms are present (GIRFT 2023), and the signs alone have low sensitivity (Dionne 2019).\n" +
    "• Urgent within two weeks (GIRFT 2023): radicular pain in both legs starting suddenly or spreading from one leg to both, or cauda equina symptoms that began more than two weeks ago and are stable; new or progressive leg weakness → a spinal surgeon's opinion (Bussières 2021).\n" +
    "• Possible vertebral fracture → the doctor before starting: age over 70 (likelihood ratio 11), long-term corticosteroids, trauma, or an older woman (Han 2023); previous cancer, fever, unexplained weight loss or constant night pain → the doctor (Finucane 2020 · Downie 2013).\n" +
    "• A medical review in the first week: a vascular claudication picture (calf pain eased by standing still, weak pulses, an ankle-brachial index below 0.9 — Jeon 2012 · Park 2020); hip osteoarthritis (groin pain, painful restricted rotation and a limp — Rainville 2019), treating both when both are present; signs of cervical myelopathy (cervical stenosis accompanies lumbar stenosis in 8–60% — Sekiguchi 2023); and symmetrical numbness in the feet that does not change with posture (neuropathy).\n" +
    "• A surgeon's opinion (not urgent): severe claudication with walking of 100 m or less, new or progressive weakness, or failure of an appropriate course of non-surgical care (Bussières 2021). This protocol's rules (a suggestion): at session 6 — no change in leg pain or walking → re-check the vascular, hip and nerve causes and adherence; at session 18 — none of leg pain, walking or ODI has reached the important change → the centre's doctor; after three months of appropriate care with symptoms the patient finds unacceptable → a spinal surgeon's opinion as a shared decision — delayed surgery does about as well as early surgery (Amundsen 2000), and surgical trials enrolled patients whose non-surgical care had failed for 3–6 months (Kovacs 2011).\n" +
    "• What the patient is told (the doctor's decision): epidural steroid injections were no better than local anaesthetic alone at six weeks (Friedly 2014) and are 'do not use' for neurogenic claudication (NICE NG59); pregabalin did not beat placebo for walking (Markman 2015); surgery brings faster relief in those who chose it and the results converge over the years (Lurie 2015), walking did not differ between surgery and non-surgical care (Malmivaara 2007), and its complications are 10–24% (Zaina 2016).\n" +
    "Contraindications to manual therapy and devices: fracture and severe osteoporosis, tumour and infection in the area, and spinal instability (an unstable slip) for traction and forceful mobilisation; needling with anticoagulants, a clotting disorder, skin infection or marked fear of needles.",
  ],
  precautions: [
    "• قاعدةُ الأعراض في «التمارين» لكلّ المراحل؛ والتقويةُ والهوائيُّ الأثقل يوماً بعد يوم، وأيّامُ ما بينها للثني والتمطيط والعلاج اليدويّ والتوازن والتثقيف — فكبارُ السنّ بأمراضٍ مرافقة يتعبون سريعاً.\n" +
    "• البسطُ القطنيّ المؤلم يُتجنّب في الوضعيات الطويلة (Delitto 2015)، وإمالةُ الحوض أثناء الوقوف والمشي تخفّفه (Ammendolia 2025).\n" +
    "• القلبُ والضغطُ والسكّريّ: جهدُ الهوائيّ «يتكلّم ولا يغنّي» أو Borg ١٢–١٣؛ ويُسأل عن ألم الصدر وضيق النفس، ويُقاس الضغطُ قبل الجهد لمن يُعالَج منه، والسكّرُ لمن على الإنسولين (احتياطٌ عامّ).\n" +
    "• السقوط: سقط ٢١٪ من كبار السنّ في سنة وزاد التضيّقُ الخطرَ ١٫٦ مرّة (Kobayashi 2026) — فمن سقط أو كان النهوضُ والمشي عنده ١٢ ثانية فأكثر: التوازنُ في كلّ جلسة، والمشيُ بجانب مَن يحرسه، ويُراجع البيتُ معه (الإضاءةُ والسجّادُ والحمّام).\n" +
    "• المشّايةُ والعصا: المشّايةُ ذاتُ العجلات أو عربةُ التسوّق بارتفاعٍ يسمح بانحناءٍ خفيف تخفّف العرج (Lurie 2016) — ولا تجربةَ مضبوطة لها (بحثٌ صفريّ)؛ والعصا لم تُطل المشي (Comer 2010)، فتُعطى للتوازن وحده.\n" +
    "• الحزامُ القطنيّ: يمكن تجربتُه للمشي الطويل والوقوف (السوق والمسجد) إن أطال المشيَ في اختبارٍ مشرَف — NASS: يطيل المشيَ ويخفّف الألم ولا دليلَ على بقاء أثره بعد نزعه (B) (NASS 2011)، وNICE: «لا تُقدَّم» الأحزمة لألم الظهر (NICE NG59)، والحزامُ المصمَّم لتقليل التقعّر لم يفُق العاديّ (Ammendolia 2019) — فلا يُلبس طوالَ اليوم ولا يحلّ محلّ التمرين.\n" +
    "• الحرارةُ والأجهزة: يُفحص الإحساسُ أوّلاً — التضيّقُ والسكّريّ ينقصانه، وضعفُ الدورة الدموية يمنع الحرارة.\n" +
    "• الأدويةُ والحقن ليست من عمل المعالج: يُسأل عنها ويُحال إلى الطبيب.\n" +
    "• النوم: لا دراسةَ لوضعيات النوم (بحثٌ صفريّ) — الاستلقاءُ على الجنب والركبتان مثنيّتان، أو على الظهر بوسادةٍ تحت الركبتين، يثنيان الظهرَ فيريحان غالباً (اقتراح).\n" +
    "• الصلاةُ والوضوء: لا دراسةَ لهما في التضيّق (بحثٌ صفريّ). السجودُ والجلسةُ بين السجدتين ثنيٌ لا يُثير العرجَ غالباً، والقيامُ الطويل في بسطٍ خفيف قد يُثيره — فالقيامُ مستنداً أو الصلاةُ جالساً لمن تثور أعراضُه، والركوعُ ثنيٌ من الورك، والوضوءُ عند المغسلة منحنياً مريح (اقتراح)؛ ويُكتب الوقوفُ في الصلاة والمشيُ إلى المسجد في الأنشطة المختارة.\n" +
    "• التضيّقُ الخِلقيّ: في بغداد كان شكلُ القناة لا العمرُ ما يفسّر التضيّق (Kitab 2019)، والقناةُ الضيّقة خِلقةً أقوى ما ينبئ بالتدهور (Ng 2025) — فإن ذكره تقريرُ الرنين تُراقب العلاماتُ أقرب ويُخفض حدُّ الإحالة (اقتراح).",
    "• The symptom rule under 'Exercises' for every phase; the heavier strengthening and aerobic work every other day, with the days between used for flexion, stretching, manual therapy, balance and education — older adults with comorbidities tire quickly.\n" +
    "• Painful lumbar extension is avoided in sustained postures (Delitto 2015), and a posterior pelvic tilt while standing and walking eases it (Ammendolia 2025).\n" +
    "• Heart, blood pressure and diabetes: aerobic effort at 'can talk but not sing' or Borg 12–13; ask about chest pain and breathlessness, check blood pressure before exertion in those treated for it, and blood sugar in those on insulin (a general precaution).\n" +
    "• Falls: 21% of older people fell in a year and stenosis raised the risk 1.6-fold (Kobayashi 2026) — so for anyone who has fallen or whose Timed Up and Go is 12 seconds or more: balance at every session, walking with someone guarding, and a review of the home with them (lighting, rugs, bathroom).\n" +
    "• Rollator and stick: a wheeled rollator or shopping trolley set to allow a slight forward lean eases claudication (Lurie 2016) — though there is no controlled trial of it (a documented zero result); a stick did not lengthen walking (Comer 2010), so it is given for balance only.\n" +
    "• Lumbar corset: it may be tried for long walks and standing (the market, the mosque) if it lengthens walking in a supervised test — NASS: it lengthens walking and eases pain with no evidence the effect lasts once removed (B) (NASS 2011), NICE: 'do not offer' belts for low back pain (NICE NG59), and a belt designed to reduce the lordosis was no better than an ordinary one (Ammendolia 2019) — so not worn all day and never instead of exercise.\n" +
    "• Heat and devices: check sensation first — stenosis and diabetes reduce it, and poor circulation rules heat out.\n" +
    "• Medicines and injections are not the therapist's role: the patient is asked and referred to the doctor.\n" +
    "• Sleep: there is no study of sleep positions (a documented zero result) — side-lying with the knees bent, or lying on the back with a pillow under the knees, flexes the back and usually eases it (a suggestion).\n" +
    "• Prayer and ablution: no study in stenosis (a documented zero result). Prostration and sitting between prostrations are flexion and rarely provoke claudication, while prolonged standing in slight extension may — so leaning on support while standing, or praying seated, for those whose symptoms flare; bowing is flexion at the hip, and ablution at a basin bent forward is comfortable (a suggestion); standing in prayer and walking to the mosque are written into the chosen activities.\n" +
    "• Developmental stenosis: in Baghdad the shape of the canal, not age, explained the narrowing (Kitab 2019), and a developmentally narrow canal is the strongest predictor of deterioration (Ng 2025) — so when the MRI report mentions it, the signs are watched more closely and the referral threshold is lowered (a suggestion).",
  ],
  spw: 6, weeks: 3, minutes: 50, totalSessions: 18,
  refs: [
    { title: "Non-Surgical Interventions for Lumbar Spinal Stenosis Leading To Neurogenic Claudication: A Clinical Practice Guideline", org: "J Pain — Canadian Chiropractic Guideline Initiative (Bussières et al.)", year: 2021, url: "https://doi.org/10.1016/j.jpain.2021.03.147" },
    { title: "Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Degenerative Lumbar Spinal Stenosis (revised 2011)", org: "North American Spine Society (NASS — Kreiner et al.)", year: 2011, url: "https://www.spine.org/Portals/0/Assets/Downloads/ResearchClinicalCare/Guidelines/LumbarStenosis.pdf" },
    { title: "Low back pain and sciatica in over 16s: assessment and management (NG59 — last updated 29 July 2026)", org: "NICE", year: 2026, url: "https://www.nice.org.uk/guidance/ng59" },
    { title: "Spinal Surgery: National Suspected Cauda Equina Syndrome (CES) Pathway", org: "GIRFT — NHS England", year: 2023, url: "https://spinal.co.uk/wp-content/uploads/2023/08/National-Suspected-Cauda-Equina-Pathway-February-2023-FINAL-V1-1.pdf" },
    { title: "The Essence of Clinical Practice Guidelines for Lumbar Spinal Stenosis, 2021: 3. Conservative Treatment", org: "Spine Surg Relat Res — Japanese Orthopaedic Association guideline (Takeshita et al.)", year: 2023, url: "https://doi.org/10.22603/ssrr.2022-0081" },
    { title: "Low back pain", org: "J Orthop Sports Phys Ther — APTA Orthopaedic Section guideline (Delitto et al.)", year: 2012, url: "https://doi.org/10.2519/jospt.2012.42.4.a1" },
    { title: "Management of lumbar spinal stenosis", org: "BMJ (Lurie et al.)", year: 2016, url: "https://doi.org/10.1136/bmj.h6234" },
    { title: "Associations between radiographic lumbar spinal stenosis and clinical symptoms in the general population: the Wakayama Spine Study", org: "Osteoarthritis Cartilage (Ishimoto et al.)", year: 2013, url: "https://doi.org/10.1016/j.joca.2013.02.656" },
    { title: "The Essence of Clinical Practice Guidelines for Lumbar Spinal Stenosis, 2021: 2. Diagnosis and Evaluation", org: "Spine Surg Relat Res (Sekiguchi et al.)", year: 2023, url: "https://doi.org/10.22603/ssrr.2022-0080" },
    { title: "Diagnosis and Management of Lumbar Spinal Stenosis: A Review", org: "JAMA (Katz et al.)", year: 2022, url: "https://doi.org/10.1001/jama.2022.5921" },
    { title: "Prevalence of lumbar spinal stenosis in general and clinical populations: a systematic review and meta-analysis", org: "Eur Spine J (Jensen et al.)", year: 2020, url: "https://doi.org/10.1007/s00586-020-06339-1" },
    { title: "Prevalence of symptomatic lumbar spinal stenosis and its association with physical performance in a population-based cohort in Japan: the Wakayama Spine Study", org: "Osteoarthritis Cartilage (Ishimoto et al.)", year: 2012, url: "https://doi.org/10.1016/j.joca.2012.06.018" },
    { title: "Prevalence of multimorbid degenerative lumbar spinal stenosis with knee or hip osteoarthritis: a systematic review and meta-analysis", org: "BMC Musculoskelet Disord (Young et al.)", year: 2022, url: "https://doi.org/10.1186/s12891-022-05104-3" },
    { title: "Central lumbar spinal stenosis: natural history of non-surgical patients", org: "Eur Spine J (Wessberg et al.)", year: 2017, url: "https://doi.org/10.1007/s00586-017-5075-x" },
    { title: "Cauda equina syndrome in lumbar spinal stenosis: case report and incidence in Jutland, Denmark", org: "J Spinal Disord Tech (Johnsson et al.)", year: 2004, url: "https://doi.org/10.1097/01.bsd.0000095828.98982.6c" },
    { title: "Non-operative treatment for lumbar spinal stenosis with neurogenic claudication: an updated systematic review", org: "BMJ Open (Ammendolia et al.)", year: 2022, url: "https://doi.org/10.1136/bmjopen-2021-057724" },
    { title: "Comparative Clinical Effectiveness of Nonsurgical Treatment Methods in Patients With Lumbar Spinal Stenosis: A Randomized Clinical Trial", org: "JAMA Netw Open (Schneider et al.)", year: 2019, url: "https://doi.org/10.1001/jamanetworkopen.2018.6828" },
    { title: "Comprehensive Nonsurgical Treatment Versus Self-directed Care to Improve Walking Ability in Lumbar Spinal Stenosis: A Randomized Trial", org: "Arch Phys Med Rehabil (Ammendolia et al.)", year: 2018, url: "https://doi.org/10.1016/j.apmr.2018.05.014" },
    { title: "Surgery versus nonsurgical treatment of lumbar spinal stenosis: a randomized trial", org: "Ann Intern Med (Delitto et al.)", year: 2015, url: "https://doi.org/10.7326/m14-1420" },
    { title: "Supervised physical therapy vs. home exercise for patients with lumbar spinal stenosis: a randomized controlled trial", org: "Spine J (Minetama et al.)", year: 2019, url: "https://doi.org/10.1016/j.spinee.2019.04.009" },
    { title: "Supervised physical therapy versus unsupervised exercise for patients with lumbar spinal stenosis: 1-year follow-up of a randomized controlled trial", org: "Clin Rehabil (Minetama et al.)", year: 2021, url: "https://doi.org/10.1177/0269215520986688" },
    { title: "Therapeutic Advantages of Frequent Physical Therapy Sessions for Patients With Lumbar Spinal Stenosis", org: "Spine (Phila Pa 1976) (Minetama et al.)", year: 2020, url: "https://doi.org/10.1097/brs.0000000000003363" },
    { title: "Treadmill walking with body weight support is no more effective than cycling when added to an exercise program for lumbar spinal stenosis: a randomised controlled trial", org: "Aust J Physiother (Pua et al.)", year: 2007, url: "https://doi.org/10.1016/s0004-9514(07)70040-5" },
    { title: "Physical therapy interventions for degenerative lumbar spinal stenosis: a systematic review", org: "Phys Ther (Macedo et al.)", year: 2013, url: "https://doi.org/10.2522/ptj.20120379" },
    { title: "Psychometric properties of selected tests in patients with lumbar spinal stenosis", org: "Spine J (Cleland et al.)", year: 2012, url: "https://doi.org/10.1016/j.spinee.2012.05.004" },
    { title: "Responsiveness of the Zurich Claudication Questionnaire in Patients With Lumbar Spinal Stenosis Undergoing Nonsurgical Treatment: A Secondary Analysis of a Randomized Controlled Trial", org: "Spine (Phila Pa 1976) (Minetama et al.)", year: 2024, url: "https://doi.org/10.1097/brs.0000000000004984" },
    { title: "Minimal clinically important differences in walking capacity and physical activity after nonsurgical treatment in patients with lumbar spinal stenosis: a secondary analysis of a randomized controlled trial", org: "Spine J (Minetama et al.)", year: 2024, url: "https://doi.org/10.1016/j.spinee.2023.10.011" },
    { title: "Clinimetric analysis of the numeric pain rating scale, Oswestry disability index, and the Roland-Morris disability questionnaire in patients with lumbar spinal stenosis treated with conservative interventions", org: "J Clin Neurosci (Young et al.)", year: 2026, url: "https://doi.org/10.1016/j.jocn.2025.111717" },
    { title: "Responsiveness of the Oswestry Disability Index and Zurich Claudication Questionnaire in patients with lumbar spinal stenosis: evaluation of surgically treated patients from the NORDSTEN study", org: "Eur Spine J (Indrekvam et al.)", year: 2024, url: "https://doi.org/10.1007/s00586-024-08440-1" },
    { title: "Determining Risk of Falls in Community Dwelling Older Adults: A Systematic Review and Meta-analysis Using Posttest Probability", org: "J Geriatr Phys Ther (Lusardi et al.)", year: 2017, url: "https://doi.org/10.1519/jpt.0000000000000099" },
    { title: "Does this older adult with lower extremity pain have the clinical syndrome of lumbar spinal stenosis?", org: "JAMA (Suri et al.)", year: 2010, url: "https://doi.org/10.1001/jama.2010.1833" },
    { title: "Development of a clinical diagnosis support tool to identify patients with lumbar spinal stenosis", org: "Eur Spine J (Konno et al.)", year: 2007, url: "https://doi.org/10.1007/s00586-007-0402-2" },
    { title: "Degenerative lumbar spinal stenosis. Diagnostic value of the history and physical examination", org: "Arthritis Rheum (Katz et al.)", year: 1995, url: "https://doi.org/10.1002/art.1780380910" },
    { title: "Diagnostic tests in the clinical diagnosis of lumbar spinal stenosis: Consensus and Results of an International Delphi Study", org: "Eur Spine J (Tomkins-Lane et al.)", year: 2020, url: "https://doi.org/10.1007/s00586-020-06481-w" },
    { title: "The validity of ankle-brachial index for the differential diagnosis of peripheral arterial disease and lumbar spinal stenosis in patients with atypical claudication", org: "Eur Spine J (Jeon et al.)", year: 2012, url: "https://doi.org/10.1007/s00586-011-2072-3" },
    { title: "The reliability of differentiating neurogenic claudication from vascular claudication based on symptomatic presentation", org: "Can J Surg (Nadeau et al.)", year: 2013, url: "https://doi.org/10.1503/cjs.016512" },
    { title: "Comparison of the history and physical examination for hip osteoarthritis and lumbar spinal stenosis", org: "Spine J (Rainville et al.)", year: 2019, url: "https://doi.org/10.1016/j.spinee.2019.01.006" },
    { title: "A criterion measure of walking capacity in lumbar spinal stenosis and its comparison with a treadmill protocol", org: "Spine (Phila Pa 1976) (Tomkins et al.)", year: 2009, url: "https://doi.org/10.1097/brs.0b013e3181b03fc8" },
    { title: "Validation of an Arabic version of the Oswestry index in Saudi Arabia", org: "Ann Phys Rehabil Med (Algarni et al.)", year: 2014, url: "https://doi.org/10.1016/j.rehab.2014.06.006" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "Reliability and validity of the Arabic version of the Swiss Spinal Stenosis Questionnaire Among Saudi Patients with Lumbar Spinal Stenosis", org: "Research Square (preprint) (Abdulmajeed et al.)", year: 2023, url: "https://doi.org/10.21203/rs.3.rs-3161182/v1" },
    { title: "The Arabic Patient-Specific Functional Scale Demonstrates Responsiveness in Detecting Changes in Lower Extremity Function Among Individuals with Lower Extremity Musculoskeletal Disorders", org: "J Clin Med (Aldaihan et al.)", year: 2026, url: "https://doi.org/10.3390/jcm15156009" },
    { title: "Exercise treatments for lumbar spinal stenosis: A systematic review and intervention component analysis of randomised controlled trials", org: "Clin Rehabil (Comer et al.)", year: 2024, url: "https://doi.org/10.1177/02692155231201048" },
    { title: "The boot camp program for lumbar spinal stenosis: a protocol for a randomized controlled trial", org: "Chiropr Man Therap (Ammendolia et al.)", year: 2016, url: "https://doi.org/10.1186/s12998-016-0106-y" },
    { title: "Better Outcomes for Older people with Spinal Trouble (BOOST) Trial: a randomised controlled trial of a combined physical and psychological intervention for older adults with neurogenic claudication, a protocol", org: "BMJ Open (Williamson et al.)", year: 2018, url: "https://doi.org/10.1136/bmjopen-2018-022205" },
    { title: "Association between lumbar spine kinematics and falls in patients with lumbar spinal stenosis: a cross-sectional study", org: "Eur Spine J (Wada et al.)", year: 2025, url: "https://doi.org/10.1007/s00586-025-08748-6" },
    { title: "The Clinical Effectiveness of a Physiotherapy Delivered Physical and Psychological Group Intervention for Older Adults With Neurogenic Claudication: The BOOST Randomized Controlled Trial", org: "J Gerontol A Biol Sci Med Sci (Williamson et al.)", year: 2022, url: "https://doi.org/10.1093/gerona/glac063" },
    { title: "Double-blind, randomized, controlled, crossover trial of pregabalin for neurogenic claudication", org: "Neurology (Markman et al.)", year: 2015, url: "https://doi.org/10.1212/wnl.0000000000001168" },
    { title: "No drugs, more sex? And Rock'n Roll: effective non-operative treatments and practical management strategies for older adults with lumbar spinal stenosis", org: "Chiropr Man Therap (Ammendolia et al.)", year: 2025, url: "https://doi.org/10.1186/s12998-025-00590-3" },
    { title: "SHADES of grey - The challenge of 'grumbling' cauda equina symptoms in older adults with lumbar spinal stenosis", org: "Musculoskelet Sci Pract (Comer et al.)", year: 2020, url: "https://doi.org/10.1016/j.msksp.2019.102049" },
    { title: "What is the diagnostic accuracy of red flags related to cauda equina syndrome (CES), when compared to Magnetic Resonance Imaging (MRI)? A systematic review", org: "Musculoskelet Sci Pract (Dionne et al.)", year: 2019, url: "https://doi.org/10.1016/j.msksp.2019.05.004" },
    { title: "Red flags to screen for vertebral fracture in people presenting with low back pain", org: "Cochrane Database Syst Rev (Han et al.)", year: 2023, url: "https://doi.org/10.1002/14651858.cd014461.pub2" },
    { title: "International Framework for Red Flags for Potential Serious Spinal Pathologies", org: "J Orthop Sports Phys Ther (Finucane et al.)", year: 2020, url: "https://doi.org/10.2519/jospt.2020.9971" },
    { title: "Red flags to screen for malignancy and fracture in patients with low back pain: systematic review", org: "BMJ (Downie et al.)", year: 2013, url: "https://doi.org/10.1136/bmj.f7095" },
    { title: "Prevalence and Risk Factors of Peripheral Arterial Disease in Patients with Lumbar Spinal Stenosis and Intermittent Claudication: CT Angiography Study", org: "J Korean Med Sci (Park et al.)", year: 2020, url: "https://doi.org/10.3346/jkms.2020.35.e87" },
    { title: "Lumbar spinal stenosis: conservative or surgical management?: A prospective 10-year study", org: "Spine (Phila Pa 1976) (Amundsen et al.)", year: 2000, url: "https://doi.org/10.1097/00007632-200006010-00016" },
    { title: "Surgery versus conservative treatment for symptomatic lumbar spinal stenosis: a systematic review of randomized controlled trials", org: "Spine (Phila Pa 1976) (Kovacs et al.)", year: 2011, url: "https://doi.org/10.1097/brs.0b013e31820c97b1" },
    { title: "A randomized trial of epidural glucocorticoid injections for spinal stenosis", org: "N Engl J Med (Friedly et al.)", year: 2014, url: "https://doi.org/10.1056/nejmoa1313265" },
    { title: "Long-term outcomes of lumbar spinal stenosis: eight-year results of the Spine Patient Outcomes Research Trial (SPORT)", org: "Spine (Phila Pa 1976) (Lurie et al.)", year: 2015, url: "https://doi.org/10.1097/brs.0000000000000731" },
    { title: "Surgical or nonoperative treatment for lumbar spinal stenosis? A randomized controlled trial", org: "Spine (Phila Pa 1976) (Malmivaara et al.)", year: 2007, url: "https://doi.org/10.1097/01.brs.0000251014.81875.6d" },
    { title: "Surgical versus non-surgical treatment for lumbar spinal stenosis", org: "Cochrane Database Syst Rev (Zaina et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.cd010264.pub2" },
    { title: "Impact of coexisting lumbar spinal stenosis and sleep disorders on fall risk: a cross-sectional study of community-dwelling residents (locomotive syndrome and health outcome in Aizu cohort study)", org: "Eur Spine J (Kobayashi et al.)", year: 2026, url: "https://doi.org/10.1007/s00586-025-09208-x" },
    { title: "The effectiveness of walking stick use for neurogenic claudication: results from a randomized trial and the effects on walking tolerance and posture", org: "Arch Phys Med Rehabil (Comer et al.)", year: 2010, url: "https://doi.org/10.1016/j.apmr.2009.08.149" },
    { title: "Effect of active TENS versus de-tuned TENS on walking capacity in patients with lumbar spinal stenosis: a randomized controlled trial", org: "Chiropr Man Therap (Ammendolia et al.)", year: 2019, url: "https://doi.org/10.1186/s12998-019-0245-z" },
    { title: "Effect of a prototype lumbar spinal stenosis belt versus a lumbar support on walking capacity in lumbar spinal stenosis: a randomized controlled trial", org: "Spine J (Ammendolia et al.)", year: 2019, url: "https://doi.org/10.1016/j.spinee.2018.07.012" },
    { title: "Redefining lumbar spinal stenosis as a developmental syndrome: does age matter?", org: "J Neurosurg Spine (Kitab et al.)", year: 2019, url: "https://doi.org/10.3171/2019.2.spine181383" },
    { title: "Mid- to long-term natural history of degenerative lumbar spinal stenosis and predictors for clinical deterioration", org: "J Neurosurg Spine (Ng et al.)", year: 2025, url: "https://doi.org/10.3171/2025.5.spine25215" },
    { title: "A comparison between two physical therapy treatment programs for patients with lumbar spinal stenosis: a randomized clinical trial", org: "Spine (Phila Pa 1976) (Whitman et al.)", year: 2006, url: "https://doi.org/10.1097/01.brs.0000241136.98159.8c" },
    { title: "Loading is more effective than posture in lumbar spinal stenosis: a study with a treadmill equipment", org: "Eur Spine J (Oğuz et al.)", year: 2007, url: "https://doi.org/10.1007/s00586-007-0317-y" },
    { title: "Effect of Acupuncture on Neurogenic Claudication Among Patients With Degenerative Lumbar Spinal Stenosis : A Randomized Clinical Trial", org: "Ann Intern Med (Zhu et al.)", year: 2024, url: "https://doi.org/10.7326/m23-2749" },
    { title: "Acupuncture vs Noninsertive Sham Acupuncture in Aging Patients with Degenerative Lumbar Spinal Stenosis: A Randomized Controlled Trial", org: "Am J Med (Qin et al.)", year: 2020, url: "https://doi.org/10.1016/j.amjmed.2019.08.038" },
    { title: "Spinal manipulation and electrical dry needling as an adjunct to conventional physical therapy in patients with lumbar spinal stenosis: a multi-center randomized clinical trial", org: "Spine J (Young et al.)", year: 2024, url: "https://doi.org/10.1016/j.spinee.2023.12.002" },
    { title: "The influence of flexion distraction spinal manipulation on patients with lumbar spinal stenosis: A prospective, open-label, single-arm, pilot study", org: "J Bodyw Mov Ther (Smith et al.)", year: 2022, url: "https://doi.org/10.1016/j.jbmt.2022.05.012" },
    { title: "Efficacy and characteristics of physiotherapy interventions in patients with lumbar spinal stenosis: a systematic review", org: "Eur Spine J (Temporiti et al.)", year: 2022, url: "https://doi.org/10.1007/s00586-022-07222-x" },
    { title: "The efficacy of physical therapy and physical therapy plus calcitonin in the treatment of lumbar spinal stenosis", org: "Yonsei Med J (Sahin et al.)", year: 2009, url: "https://doi.org/10.3349/ymj.2009.50.5.683" },
    { title: "Efficacy of exercise and ultrasound in patients with lumbar spinal stenosis: a prospective randomized controlled trial", org: "Clin Rehabil (Goren et al.)", year: 2010, url: "https://doi.org/10.1177/0269215510367539" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — تبدأ بأسئلة ذيل الفرس والقوّة وإحماءٍ على الدراجة خمسَ دقائق (Schneider 2019)، ثمّ العلاجِ اليدويّ وتحريكِ العصب، ثمّ الهوائيّ بقاعدة الأعراض أو حلقةِ التقوية (الأثقلُ يوماً بعد يوم)، ثمّ التوازنِ ومراجعةِ البرنامج المنزليّ.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — starting with the cauda equina questions, strength and a five-minute warm-up on the bike (Schneider 2019), then manual therapy and nerve mobilisation, then aerobic work by the symptom rule or the strengthening circuit (the heavier work every other day), then balance and a review of the home programme."],
      note: ["أساسيٌّ في كلّ جلسة — الكنديّ «نقترح» التثقيفَ والعلاجَ اليدويّ والتمرينَ معاً بيقينٍ متوسّط (Bussières 2021)، والعلاجُ اليدويّ مع التمرين أفضلُ من الرعاية الطبية والتمارين الجماعية (Schneider 2019 · Ammendolia 2022)، والأثرُ متوسّطٌ وأوضحُه في المدى القصير؛ والدراجةُ من التمرين هنا — ميّزت البرامجَ الناجحة (Comer 2024) وساوت المشيَ بحمل الوزن (Pua 2007). ولا حدثَ خطيراً في التجارب، والألمُ العضليّ العابر بعد العلاج اليدويّ شائع (Schneider 2019).",
        "Core in every session — the Canadian guideline 'suggests' education, manual therapy and exercise together with moderate certainty (Bussières 2021), manual therapy with exercise beat medical care and group exercise (Schneider 2019 · Ammendolia 2022), and the effect is moderate and clearest in the short term; cycling is part of the exercise here — it distinguished successful programmes (Comer 2024) and equalled body-weight-supported walking (Pua 2007). There were no serious adverse events in trials, and transient muscle soreness after manual therapy is common (Schneider 2019)."] },
    { code: "robotik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { bwsPct: "30–40 → 0", speed: "Comfortable, near pain-free", guidancePct: "Minimal", durationMin: "15–30" },
      parameters: ["مشيٌ على السير بحزامٍ يحمل جزءاً من الوزن، لمن لا يمشي عشرَ دقائق أو لا يتحمّل الدراجة: يُحمل ٣٠–٤٠٪ من الوزن بمشيةٍ قليلة الألم أسبوعين، ثمّ جهدٌ متوسّط وحملٌ أقلّ (١٠٪ كلَّ مرّةٍ يتحمّل) حتى صفر، حتى ٣٠ دقيقة (Pua 2007)، والتوجيهُ الآليّ أقلُّ ما يمكن — فالمطلوبُ حملُ الوزن لا توجيهُ الخطوة؛ ثمّ المشيُ على الأرض. وإن لم يكن في روبوت المركز حزامٌ يحمل الوزن فلا يُستعمل — والدراجةُ بديلٌ مساوٍ.",
        "Treadmill walking with a harness carrying part of the body weight, for those who cannot walk for ten minutes or do not tolerate the bike: 30–40% of body weight supported at a near pain-free gait for two weeks, then moderate effort with less support (10% less each time it is tolerated) down to zero, up to 30 minutes (Pua 2007), with robotic guidance kept to a minimum — the aim is unloading, not guiding the step; then walking over ground. If the centre's robot has no body-weight-support harness it is not used — cycling is an equal alternative."],
      note: ["مساعدٌ مشروط — لا تجربةَ لروبوت المشي في التضيّق (بحثٌ صفريّ: ما وُجد كان جراحةً بالروبوت)؛ ودليلُه من المشي بحمل الوزن على السير: ساوى الدراجة (Pua 2007)، وكان جزءاً من البرنامج الذي تفوّق (Whitman 2006)، وحملُ الوزن يطيل المشيَ قبل الأعراض (Oguz 2007).",
        "Conditional adjunct — there is no trial of a gait robot in stenosis (a documented zero result: what was found was robot-assisted surgery); its rationale is body-weight-supported treadmill walking: it equalled cycling (Pua 2007), was part of the programme that did better (Whitman 2006), and unloading lengthens walking before symptoms (Oguz 2007)."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 3, times: 6,
      params: { needleSize: "0.25–0.30 × 40–60", points: "Lumbar paraspinal and gluteal trigger points", sessions: "6 (2 / week × 3)" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، ولمن يرغب فيها ولا يأخذ مميّعات الدم: النقاطُ الزنادية في العضلات بجانب الفقرات القطنية وفي الألوية — كلَّ ثلاثة أيّامٍ ستَّ مرّات (اقتراح: الكنديّ «تجربةً»، والتجاربُ ثلاثاً في الأسبوع ستّةَ أسابيع أو ثمانية)، مع التمرين دائماً؛ ويُقيَّم بعد الثالثة ويتوقّف إن لم يتغيّر شيء.",
        "Dry-needling certified staff only, for patients who want it and are not on anticoagulants: trigger points in the lumbar paraspinal and gluteal muscles — every three days, six times (a suggestion: the Canadian guideline says 'on a trial basis', and trials used three a week for six or eight weeks), always with exercise; reviewed after the third and stopped if nothing has changed."],
      note: ["مساعدٌ بموعدٍ دوريّ — الكنديّ: الوخزُ «تجربةً» بيقينٍ منخفضٍ جداً (Bussières 2021)، و«لا يُقدَّم» الوخزُ الصينيّ عند NICE (NICE NG59)؛ وفي التجارب خفّضت ١٨ جلسةً في ستّة أسابيع الإعاقةَ ١٫٣ نقطة أكثرَ من الوهميّ — دون الفرق المهمّ (Zhu 2024)، و٢٤ جلسةً في ثمانية أسابيع ٢٫٦ (Qin 2020)؛ والإبرُ الجافّة الكهربائية مع التحريك أضافت إلى العلاج الطبيعيّ تحسّناً عند ثلاثة أشهر (Young 2024). ممنوعٌ مع مميّعات الدم واضطراب التخثّر ورهاب الإبر والالتهاب الموضعيّ.",
        "Adjunct on a periodic schedule — the Canadian guideline: needling 'on a trial basis' with very low certainty (Bussières 2021), and acupuncture is 'do not offer' in NICE (NICE NG59); in trials 18 sessions over six weeks reduced disability by 1.3 points more than sham — below the important change (Zhu 2024), and 24 sessions over eight weeks by 2.6 (Qin 2020); electrical dry needling with manipulation added improvement at three months to physiotherapy (Young 2024). Contraindicated with anticoagulants or clotting disorders, needle phobia and local infection."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["على أسفل الظهر في الاستلقاء على الجنب والركبتان مثنيّتان أو جالساً منحنياً، قبل التمارين لتسهيلها لا بدلها؛ ويُفحص الإحساسُ في الظهر أوّلاً، ولا تُوضع على جلدٍ ضعيف الإحساس.",
        "Over the low back in side-lying with the knees bent or sitting bent forward, before exercise to ease it, never instead of it; check sensation over the back first, and never place it on skin with poor sensation."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: لا تجربةَ للحرارة وحدها في التضيّق (بحثٌ صفريّ)، وكانت في البرامج الفاشلة أكثرَ من الناجحة (Comer 2024)، والأجهزةُ لا تضيف إلى التمرين (Macedo 2013). ممنوعةٌ مع ضعف الإحساس (التضيّقُ والسكّريّ) وضعفِ الدورة الدموية.",
        "Rotating adjunct — for comfort before exercise: there is no trial of heat alone in stenosis (a documented zero result), it featured more in unsuccessful than successful programmes (Comer 2024), and devices add nothing to exercise (Macedo 2013). Contraindicated with poor sensation (stenosis and diabetes) and poor circulation."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها: على أسفل الظهر، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the low back, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: لا تجربةَ للأشعّة تحت الحمراء علاجاً في التضيّق (بحثٌ صفريّ)؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only: there is no treatment trial of infrared in stenosis (a documented zero result); never given alone."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "100–200", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["تحفيزٌ عبر الجلد تقليديّ (Conventional TENS) لتهدئة الألم قبل التمرين لمن لا يستطيع التمرينَ بدونه: الأقطابُ على العضلات بجانب الفقرات القطنية، بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض — ويُقال للمريض إنّه يسكّن ولا يعالج.",
        "Conventional TENS to settle pain before exercise for patients who cannot exercise without it: electrodes over the lumbar paraspinal muscles, at a strong but comfortable tingling with no contraction — the patient is told it relieves but does not treat."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والدليلُ ضدّه في التضيّق: في تجربةٍ مزدوجة التعمية لم يُطل التحفيزُ أثناء المشي المسافةَ (٤٧ متراً بلا دلالة)، وقال باحثوها «لا يُنصح به» (Ammendolia 2019)؛ وNASS: الدليلُ غيرُ كافٍ (NASS 2011)، و«لا يُقدَّم» لألم الظهر وعِرق النسا (NICE NG59)، وكان في كلّ البرامج الفاشلة التي استعملته (Comer 2024). فلا يُعطى وحده ولا بدلَ التمرين — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو على جلدٍ ضعيف الإحساس.",
        "Rotating adjunct by the centre's rule (Saleem) — and the evidence is against it in stenosis: in a double-blind trial, TENS during walking did not lengthen the distance (47 m, not significant), and its authors said it 'should not be a recommended treatment' (Ammendolia 2019); NASS: insufficient evidence (NASS 2011), it is 'do not offer' for low back pain and sciatica (NICE NG59), and it featured in every unsuccessful programme that used it (Comer 2024). So never alone and never instead of exercise — and an item for Saleem. Contraindicated with a pacemaker or over skin with poor sensation."] },
    { code: "traction", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { forcePctBw: "25–40", holdRestS: "30 / 10", durationMin: "15", mode: "Intermittent, supine 90/90 (flexed)" },
      parameters: ["ليس في المرحلة الأولى، ولا مع هشاشة العظام أو كسرٍ سابق أو انزلاقٍ غير مستقرّ أو أعراضِ ذيل الفرس: تجربةٌ محدودة بأسبوع لمن يرتاح بالثني ولم يكفه التمرين (اقتراح) — شدٌّ متقطّع في الاستلقاء والوركان والركبتان مثنيّة ٩٠° (وضعيةُ ثني)، يبدأ بـ٢٥٪ من الوزن حتى ٤٠٪ حسب الاستجابة، ١٥ دقيقة ثمّ تمارينُ الثني؛ ويُوقف إن زادت أعراضُ الساق.",
        "Not in phase 1, and not with osteoporosis, a previous fracture, an unstable slip or cauda equina symptoms: a trial limited to one week for those relieved by flexion whom exercise has not helped enough (a suggestion) — intermittent traction lying on the back with hips and knees bent to 90° (a flexed position), starting at 25% of body weight and up to 40% as tolerated, 15 minutes followed by flexion exercises; stopped if the leg symptoms increase."],
      note: ["مساعدٌ بقاعدة المركز (سليم) بأشدّ الشروط — والدليلُ ضدّه: NASS: الدليلُ غيرُ كافٍ (NASS 2011)، و«لا يُقدَّم الشدّ» لألم الظهر مع عِرق النسا أو بدونه (NICE NG59)، ولم يظهر إلّا في البرامج الفاشلة — وكان في ذراعَي تجربة الدراجة والمشي معاً (Comer 2024 · Pua 2007)، ولا تجربةَ للشدّ وحده في التضيّق (بحثٌ صفريّ)، والتحريكُ بالثني والإبعاد في دراسةٍ بلا مجموعة مقارنة (Smith 2022)؛ وكبارُ السنّ أكثرُهم هشاشة. فبندٌ لسليم: يبقى بشروطه أو «لا يُستخدم».",
        "Adjunct by the centre's rule (Saleem) under the strictest conditions — and the evidence is against it: NASS: insufficient evidence (NASS 2011), 'do not offer traction' for low back pain with or without sciatica (NICE NG59), it appeared only in unsuccessful programmes — including both arms of the cycling-versus-walking trial (Comer 2024 · Pua 2007), there is no trial of traction alone in stenosis (a documented zero result), and flexion-distraction has only an uncontrolled study (Smith 2022); older adults are the most often osteoporotic. So an item for Saleem: keep it with its conditions, or set it to 'Not used'."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على أسفل الظهر قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز، وإعداداتُه يكتبها المشرفُ من الجهاز.",
        "Pulsed electromagnetic field (PEMF) over the low back before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم)، والدليلُ شبهُ معدوم: مراجعةٌ ذكرت «دليلاً منخفضاً جداً» لأسبوعين منه (Temporiti 2022) ولم تُوجد التجربةُ نفسُها (لم يُتحقّق منها). ممنوعٌ مع منظّم ضربات القلب.",
        "Adjunct by the centre's rule (Saleem), with almost no evidence: a review mentioned 'very low evidence' for two weeks of it (Temporiti 2022), and the underlying trial could not be found (not verified). Contraindicated with a pacemaker."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على العضلات بجانب الفقرات القطنية في الاستلقاء على الجنب أو الانبطاح بوسادةٍ تحت البطن (بلا بسطٍ للظهر)، بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف، قبل التمارين، ولا على جلدٍ ضعيف الإحساس.",
        "Over the lumbar paraspinal muscles in side-lying or prone with a pillow under the abdomen (no back extension), at low athermic-to-mildly-warm intensity, before exercise, and never over skin with poor sensation."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — لا تجربةَ للتيكار في التضيّق (بحثٌ صفريّ)، والإنفاذُ الحراريّ قصيرُ الموجة لم يظهر إلّا داخل حزمةٍ يومية (Sahin 2009). ممنوعٌ مع منظّم ضربات القلب أو معدنٍ مزروع في المنطقة (تثبيتُ الفقرات) أو الورم.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial of Tecar in stenosis (a documented zero result), and short-wave diathermy appeared only inside a daily package (Sahin 2009). Contraindicated with a pacemaker, a metal implant in the area (spinal fixation) or a tumour."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم (لم يذكره) — ولا تجربةَ لليزر العلاجيّ في التضيّق (بحثٌ صفريّ: ما وُجد كان جراحةً بالليزر).", "Not used until Saleem decides (he has not mentioned it) — and there is no trial of therapeutic laser in stenosis (a documented zero result: what was found was laser surgery)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لم يُضف شيئاً إلى التمرين في الألم والإعاقة والمشي، وقلّل المسكّناتِ وحدها (Goren 2010)، و«لا تُقدَّم» الأمواجُ فوق الصوتية لألم الظهر وعِرق النسا (NICE NG59).",
        "Not used — it added nothing to exercise for pain, disability or walking, reducing only analgesic use (Goren 2010), and therapeutic ultrasound is 'do not offer' for low back pain and sciatica (NICE NG59)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للموجات الصادمة في التضيّق (بحثٌ صفريّ)، ولا نسيجَ تُسلَّط عليه.", "Not used — there is no trial of shockwave in stenosis (a documented zero result), and no tissue to aim it at."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — الشمعُ للأطراف لا للظهر، ولا تجربة.", "Not used — paraffin is for the limbs, not the spine, and there is no trial."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الضغطُ الهوائيّ المتقطّع علاجٌ للعرج الوعائيّ لا العصبيّ، ولا تجربةَ في التضيّق.", "Not used — intermittent pneumatic compression treats vascular, not neurogenic, claudication, and there is no trial in stenosis."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
  ],
  phases: [
    {
      name: ["ضبط الأعراض والحركة بالثني", "Symptom control and flexion-based mobility"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (الأسبوعُ الأوّل)", "The first six sessions (the first week)"],
      goals: [
        "ألمُ الساق ينقص ١٫٥ نقطة أو المشيُ يزيد ٣٠٪؛ والدراجةُ أو المشيُ ١٠ ⟵ ٢٠ دقيقة بقاعدة الأعراض؛ وتمارينُ الثني والتمطيط في البيت مرّتين يومياً وحده؛ وفهمُ الحالة ومسارها وقاعدةِ الأعراض وعلاماتِ ذيل الفرس.",
        "Leg pain down 1.5 points or walking up 30%; cycling or walking 10 → 20 minutes by the symptom rule; the flexion and stretching exercises done at home twice a day independently; and understanding of the condition, its course, the symptom rule and the cauda equina signs.",
      ],
      education: [
        "• ما هي الحالة: القناةُ ضيّقةٌ من التنكّس، والانحناءُ للأمام والجلوسُ يوسّعانها فيخفّ الألم؛ والصورةُ لا تقول كم سيمشي (Sekiguchi 2023).\n" +
        "• المسار: يتحسّن ثلثُ المرضى إلى نصفهم والتدهورُ السريع نادر (NASS 2011)، والمشيُ يتحسّن بالتمرين لا وحده (Wessberg 2017).\n" +
        "• قاعدةُ الأعراض: الألمُ مع المشي لا يعني ضرراً، والجلوسُ منحنياً يعيده إلى ما كان (Ammendolia 2025).\n" +
        "• تنظيمُ النشاط: المشيُ بفتراتٍ قبل أن تشتدّ الأعراض، والاستراحةُ جالساً منحنياً، والمشّايةُ أو عربةُ التسوّق للمسافات.\n" +
        "• بطاقةُ الأمان: أعراضُ ذيل الفرس ومتى يذهب إلى الطوارئ (GIRFT 2023).",
        "• What the condition is: the canal is narrowed by degeneration, and bending forward and sitting widen it so the pain eases; the scan does not tell how far the patient will walk (Sekiguchi 2023).\n" +
        "• The course: a third to a half of patients improve and rapid decline is rare (NASS 2011), and walking improves with exercise, not on its own (Wessberg 2017).\n" +
        "• The symptom rule: pain with walking does not mean harm, and sitting bent forward brings it back down (Ammendolia 2025).\n" +
        "• Pacing: walking in intervals before the symptoms get bad, resting seated and bent forward, and a rollator or shopping trolley for distances.\n" +
        "• The safety card: the cauda equina symptoms and when to go to the emergency department (GIRFT 2023).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين يتحقّق واحدٌ من الأوّلين ومعه الثالث:\n" +
        "• ألمُ الساق نقص ١٫٥ نقطة فأكثر (Cleland 2012).\n" +
        "• المشيُ بالسرعة الذاتية (المسافةُ أو الزمنُ حتى التوقّف) زاد ٣٠٪ فأكثر (Ammendolia 2018).\n" +
        "• البرنامجُ المنزليّ يؤدّيه صحيحاً وحده.\n" +
        "(اقتراحٌ يجمع الفرقَ المهمّ في التضيّق، لا معيارٌ مجرَّب.) ومن جاء يمشي ٢٠ دقيقة فأكثر وألمُ ساقه ٤ أو أقلّ ينتقل بعد الجلسة الثالثة إن أتقن البرنامج. وفي الجلسة ٦ — لا تغيّر ⟵ يُعاد فحصُ الوعائيّ والورك والأعصاب والالتزام.",
        "Progress to phase 2 when one of the first two is met together with the third:\n" +
        "• Leg pain down 1.5 points or more (Cleland 2012).\n" +
        "• Self-paced walking (distance or time to the forced stop) up 30% or more (Ammendolia 2018).\n" +
        "• The home programme done correctly and independently.\n" +
        "(A proposal combining the important changes in stenosis, not a tested criterion.) A patient who arrives walking 20 minutes or more with leg pain of 4 or less moves on after session 3 once the programme is mastered. At session 6 — no change → re-check the vascular, hip and nerve causes and adherence.",
      ],
      notes: [
        "• العلاجُ اليدويّ مع التمرين: تحريكُ الفقرات القطنية بالثني والإبعاد في الاستلقاء على الجنب، وتحريكُ الورك والصدر، والأنسجةُ الرخوة (Schneider 2019 · Ammendolia 2016)؛ والألمُ العضليّ العابر بعده شائع.\n" +
        "• تحريكُ العصب الوركيّ لمن يتبع ألمُ ساقه مسارَ العصب (Schneider 2019).\n" +
        "• الهوائيّ: الدراجةُ والجذعُ مائلٌ للأمام ٥٠–٦٠ دورة بسرعةٍ مريحة ١٠ ⟵ ٢٠ دقيقة (Pua 2007)، أو المشيُ بالروبوت بحملٍ ٣٠–٤٠٪ من الوزن، أو المشيُ بالمشّاية بفترات.\n" +
        "• تثبيتُ الجذع الخفيف، وإمالةُ الحوض واقفاً وأثناء المشي (Ammendolia 2025).\n" +
        "• الأجهزةُ المساعدة للراحة قبل التمرين لا بدله (Macedo 2013).",
        "• Manual therapy alongside exercise: lumbar flexion-distraction mobilisation in side-lying, hip and thoracic mobilisation, and soft tissue work (Schneider 2019 · Ammendolia 2016); transient muscle soreness afterwards is common.\n" +
        "• Sciatic nerve mobilisation for patients whose leg pain follows the nerve's path (Schneider 2019).\n" +
        "• Aerobic work: cycling with the trunk leaning forward at 50–60 rpm at a comfortable pace, 10 → 20 minutes (Pua 2007), or robotic walking with 30–40% of body weight supported, or rollator walking in intervals.\n" +
        "• Light trunk stabilisation, and a posterior pelvic tilt while standing and walking (Ammendolia 2025).\n" +
        "• Adjunct devices for comfort before exercise, never instead of it (Macedo 2013).",
      ],
      exercises: [
        { code: "pelvic-tilt", sets: 2, reps: 10, hold: 5,
          note: ["في الاستلقاء ثمّ واقفاً مستنداً إلى الحائط — ويُستعمل أثناء الوقوف والمشي.", "Lying, then standing against a wall — and used while standing and walking."] },
        { code: "double-knee-to-chest", sets: 1, reps: 3, hold: 20, rest: 15,
          note: ["بعد ركبةٍ واحدة إن آلم ضمُّ الاثنتين؛ مرّتين يومياً في البيت.", "After the single knee hug if both together hurt; twice a day at home."] },
        { code: "cat-camel", sets: 1, reps: 10,
          note: ["التركيزُ على التقويس (الثني)؛ ومن يصعب عليه الجثوّ يكتفي بالانحناء جالساً.", "The emphasis is on rounding (flexion); those who struggle to kneel use seated flexion instead."] },
        { code: "seated-forward-flexion", sets: 1, reps: 5, hold: 20, rest: 10,
          note: ["وهي وضعيةُ الاستراحة في المشي بفترات.", "It is also the resting position in interval walking."] },
        { code: "thomas-hip-flexor-stretch", sets: 1, reps: 3, hold: 30,
          note: ["لمقدّمة الورك: ضمُّ الركبة الأخرى إلى الصدر يسطّح الظهر فلا يُبسط — وبسطُ الركبة في البطاقة لمبتور تحت الركبة لا ينطبق هنا (Ammendolia 2016).",
            "For the front of the hip: hugging the other knee to the chest flattens the back so it does not extend — the knee-extension part of the card, for below-knee amputees, does not apply here (Ammendolia 2016)."] },
        { code: "abdominal-bracing", sets: 2, reps: 10, hold: 5 },
        { code: "supine-sciatic-slider", sets: 2, reps: 10, hold: 3, rest: 60,
          note: ["لمن يتبع ألمُ ساقه مسارَ العصب؛ بلا ألمٍ يزيد.", "For patients whose leg pain follows the nerve's path; without increasing pain."] },
        { code: "stationary-cycling",
          doseNote: ["١٠ ⟵ ٢٠ دقيقة بسرعةٍ مريحة ٥٠–٦٠ دورة في الدقيقة، والجذعُ مائلٌ للأمام واليدان على المقود (Pua 2007) — بقاعدة الأعراض.",
            "10 → 20 minutes at a comfortable 50–60 rpm, trunk leaning forward with the hands on the handlebar (Pua 2007) — by the symptom rule."] },
        { code: "rollator-flexed-walking",
          doseNote: ["١٠ ⟵ ٢٠ دقيقة مجموعاً بفتراتٍ واستراحاتٍ منحنياً، بقاعدة الأعراض.", "10 → 20 minutes in total in intervals with bent-forward rests, by the symptom rule."] },
        { code: "standing-weight-shift", sets: 2, reps: 10, hold: 3, rest: 30,
          note: ["لمن سقط أو عنده خطرُ سقوط: إلى الجانبين أو إلى الساق الأضعف.", "For those who have fallen or are at risk: to both sides or towards the weaker leg."] },
      ],
    },
    {
      name: ["التكييف المتدرّج والقوّة", "Progressive conditioning and strength"],
      sessionFrom: 7, sessionTo: 12,
      timeframe: ["الجلسات ٧–١٢ (الأسبوعُ الثاني تقريباً)", "Sessions 7–12 (roughly the second week)"],
      goals: [
        "المشيُ يزيد ١٥١ متراً أو ٣٠٪ عن البداية، أو ODI ينقص ٨٫٥؛ والدراجةُ أو المشيُ ٢٠–٣٠ دقيقة بجهدٍ متوسّط؛ وحلقةُ التقوية ٢–٣ × ٨–١٢؛ والوقوفُ بقدمٍ أمام الأخرى ٣٠ ثانية بإسنادٍ خفيف.",
        "Walking up 151 m or 30% from baseline, or ODI down 8.5; cycling or walking 20–30 minutes at moderate effort; the strengthening circuit at 2–3 × 8–12; and tandem stance for 30 seconds with light support.",
      ],
      education: [
        "• التمرينُ هو العلاج: البرامجُ التي فيها تمطيطٌ وتقويةٌ ودراجة نجحت أكثر (Comer 2024).\n" +
        "• الجهد: «يتكلّم ولا يغنّي» أو Borg ١٢–١٣ للهوائيّ و١٣–١٥ للتقوية (Williamson 2018).\n" +
        "• الخطوات: عدّادُ الخطوات في الهاتف، والهدفُ يزيد أسبوعياً (Ammendolia 2025).\n" +
        "• السقوط: لماذا التوازن، وما يُصلَح في البيت.",
        "• Exercise is the treatment: programmes with stretching, strengthening and cycling succeeded more often (Comer 2024).\n" +
        "• Effort: 'can talk but not sing' or Borg 12–13 for aerobic work and 13–15 for strengthening (Williamson 2018).\n" +
        "• Steps: the phone's step counter, with a target rising every week (Ammendolia 2025).\n" +
        "• Falls: why balance matters, and what to fix at home.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين يتحقّق اثنان من ثلاثة (والثالثُ إن أضافه المشرف):\n" +
        "• المشيُ بالسرعة الذاتية زاد ١٥١ متراً أو ٣٠٪ فأكثر عن البداية (Minetama 2024 · Ammendolia 2018).\n" +
        "• ODI نقص ٨٫٥ نقطة فأكثر (Young 2026).\n" +
        "• ZCQ نقص ٠٫٣ نقطة فأكثر في شدّة الأعراض أو الوظيفة (Minetama 2024).\n" +
        "(اقتراحٌ يجمع الفرقَ المهمّ في التضيّق بلا جراحة، لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when two of three are met (the third if the supervisor adds it):\n" +
        "• Self-paced walking up 151 m or 30% or more from baseline (Minetama 2024 · Ammendolia 2018).\n" +
        "• ODI down 8.5 points or more (Young 2026).\n" +
        "• ZCQ down 0.3 points or more in symptom severity or physical function (Minetama 2024).\n" +
        "(A proposal combining the important changes in non-surgical stenosis, not a tested criterion.)",
      ],
      notes: [
        "• الدراجة: جهدٌ متوسّط حتى ٣٠ دقيقة — المدّةُ أوّلاً ثمّ المقاومة (Pua 2007).\n" +
        "• الروبوت: يُنقص الحملُ ١٠٪ كلَّ مرّةٍ يتحمّل فيها حتى صفر، ثمّ المشيُ على الأرض.\n" +
        "• حلقةُ التقوية يوماً بعد يوم: الجلوسُ والقيام، ومدُّ الركبة جالساً، والوركُ واقفاً في ثلاثة اتّجاهات، والجسر — ٢–٣ × ٨–١٢ بـBorg ١٣–١٥، تتدرّج بالتكرار ثمّ المجموعات ثمّ الحمل أو السرعة (Williamson 2018).\n" +
        "• حلقةُ المشي ٢٠ دقيقة تتدرّج بالمسافة ثمّ السرعة ثمّ العوائق والدرج (Williamson 2018)، بقاعدة الأعراض.\n" +
        "• العلاجُ اليدويّ يستمرّ ما دام يحسّن تحمّلَ المشي.",
        "• Cycling: moderate effort up to 30 minutes — duration first, then resistance (Pua 2007).\n" +
        "• The robot: the support is reduced by 10% each time it is tolerated down to zero, then walking over ground.\n" +
        "• The strengthening circuit every other day: sit-to-stand, seated knee extension, standing hip work in three directions and the bridge — 2–3 × 8–12 at Borg 13–15, progressed by repetitions, then sets, then load or speed (Williamson 2018).\n" +
        "• A 20-minute walking circuit progressed by distance, then speed, then obstacles and stairs (Williamson 2018), by the symptom rule.\n" +
        "• Manual therapy continues while it improves walking tolerance.",
      ],
      exercises: [
        { code: "stationary-cycling",
          doseNote: ["٢٠ ⟵ ٣٠ دقيقة بجهدٍ متوسّط (Borg ١٢–١٣) والجذعُ مائلٌ للأمام — المدّةُ أوّلاً ثمّ المقاومة (Pua 2007).", "20 → 30 minutes at moderate effort (Borg 12–13) with the trunk leaning forward — duration first, then resistance (Pua 2007)."] },
        { code: "graded-walking",
          doseNote: ["حلقةُ مشيٍ ٢٠ دقيقة بفتراتٍ بقاعدة الأعراض، تتدرّج بالمسافة ثمّ السرعة ثمّ العوائق (Williamson 2018).", "A 20-minute walking circuit in intervals by the symptom rule, progressed by distance, then speed, then obstacles (Williamson 2018)."] },
        { code: "sit-to-stand", sets: 2, reps: 10, rest: 60,
          note: ["بـBorg ١٣–١٥؛ يتدرّج إلى ٣ مجموعات ثمّ كرسيٍّ أخفض أو ثقلٍ في اليدين.", "At Borg 13–15; progressing to 3 sets, then a lower chair or a weight in the hands."] },
        { code: "seated-knee-extension", sets: 2, reps: 10, hold: 3, rest: 60 },
        { code: "standing-hip-three-way", sets: 2, reps: 10,
          note: ["بمحاذاة طاولة؛ والبسطُ للخلف بلا تقويسٍ للظهر.", "Beside a counter; extension backwards without arching the back."] },
        { code: "glute-bridge", sets: 2, reps: 10, hold: 3, rest: 45,
          note: ["ارتفاعٌ يبقى فيه الظهرُ مستوياً — بلا تقويس.", "Only as high as keeps the back level — without arching."] },
        { code: "hook-lying-march", sets: 2, reps: 8, hold: 3, rest: 30 },
        { code: "tandem-stance", sets: 1, reps: 3, hold: 30, rest: 15,
          note: ["بإسنادٍ خفيف، ثمّ بلا يد.", "With light support, then without the hand."] },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 15, rest: 15,
          note: ["واليدُ قرب الكرسيّ — حتى ٣٠ ثانية.", "With the hand near the chair — up to 30 seconds."] },
        { code: "side-stepping", sets: 2, reps: 10, rest: 45 },
        { code: "hamstring-stretch-seated", sets: 3, hold: 30, rest: 15 },
        { code: "double-knee-to-chest", sets: 1, reps: 3, hold: 30, rest: 15 },
      ],
    },
    {
      name: ["تحمّل المشي والتوازن والإدارة الذاتية", "Walking endurance, balance and self-management"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["الجلسات ١٣–١٨ (الأسبوعُ الثالث) — والتمديدُ ١٩–٢٤", "Sessions 13–18 (the third week) — with the extension at 19–24"],
      goals: [
        "المشيُ المتّصل نحو هدفه (المسجد أو السوق) بالاستراحات المخطَّطة؛ وODI ينقص ٣٠٪ أو ٨٫٥؛ والنهوضُ والمشي أقلُّ من ١٢ ثانية؛ والبرنامجُ المنزليّ اليوميّ يؤدّيه وحده.",
        "Continuous walking towards the patient's goal (the mosque or the market) with planned rests; ODI down 30% or 8.5; Timed Up and Go under 12 seconds; and the daily home programme done independently.",
      ],
      education: [
        "• الإدارةُ الذاتية: ماذا يفعل حين تشتدّ الأعراض (يجلس منحنياً، ويقصّر المشيَ يوماً ثمّ يعود)، ولا يترك البرنامج.\n" +
        "• البرنامجُ مدى الحياة: تمارينُ ٢٠–٣٠ دقيقة ودراجةٌ أو مشيٌ ٢٠–٣٠ دقيقة يومياً (Bussières 2021)؛ والالتزامُ يقلّ بعد انتهاء الإشراف فيضيع الأثر (Williamson 2022) — فزيارةُ التثبيت.\n" +
        "• الصلاةُ والوضوءُ والنهوضُ من الأرض تُتدرَّب في الجلسة.\n" +
        "• متى يعود: أعراضُ ذيل الفرس، أو ضعفٌ جديد، أو مشيٌ يقصر عن ١٠٠ متر.",
        "• Self-management: what to do when the symptoms flare (sit bent forward, shorten the walk for a day, then return), without abandoning the programme.\n" +
        "• The programme for life: 20–30 minutes of exercises and 20–30 minutes of cycling or walking every day (Bussières 2021); adherence falls once supervision ends and the effect goes with it (Williamson 2022) — hence the booster visit.\n" +
        "• Prayer, ablution and getting up from the floor are practised in the session.\n" +
        "• When to come back: cauda equina symptoms, new weakness, or walking falling below 100 m.",
      ],
      criteria: [
        "معاييرُ الخروج (كلُّها أو أكثرُها):\n" +
        "• ODI نقص ٣٠٪ أو ٨٫٥ نقطة فأكثر (Indrekvam 2024 · Young 2026).\n" +
        "• المشيُ بلغ هدفَ المريض أو زاد ٣٠٪ فأكثر (Ammendolia 2018)، والأنشطةُ المختارة تحسّنت نحو نقطتين.\n" +
        "• النهوضُ والمشي أقلُّ من ١٢ ثانية، والجلوسُ والقيامُ خمسَ مرّات أقلُّ من ١٢ ثانية، وBerg فوق ٥٠ إن قيس (Lusardi 2017).\n" +
        "• البرنامجُ المنزليّ يؤدّيه وحده.\n" +
        EXTEND_AR,
        "Discharge criteria (all or most):\n" +
        "• ODI down 30% or 8.5 points or more (Indrekvam 2024 · Young 2026).\n" +
        "• Walking has reached the patient's goal or risen by 30% or more (Ammendolia 2018), and the chosen activities have improved by about 2 points.\n" +
        "• Timed Up and Go under 12 seconds, five sit-to-stands under 12 seconds, and the Berg scale above 50 if measured (Lusardi 2017).\n" +
        "• The home programme done independently.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• المشيُ المتّصل منتصباً نحو هدف المريض، والمشيُ بفتراتٍ خارجاً باستراحاتٍ جالساً مخطَّطة، والمنحدرُ والدرجُ وحملُ الأغراض.\n" +
        "• التوازنُ ومنعُ السقوط: المشيُ بين العوائق ومع مهمّةٍ ثانية، والوصولُ، والنهوضُ من الأرض (Williamson 2022).\n" +
        "• التقويةُ تتدرّج بالحمل.\n" +
        "• تدريبُ الحياة اليومية: القيامُ في الصلاة والركوعُ والسجود، والوضوءُ عند المغسلة، والنهوضُ من الأرض.\n" +
        "• البرنامجُ المنزليّ الأخير مكتوباً، وعددُ الخطوات يزيد نحو ١٠٠٠ يومياً عمّا بدأ (Minetama 2024 — اقتراح).",
        "• Continuous upright walking towards the patient's goal, interval walking outdoors with planned seated rests, slopes, stairs and carrying shopping.\n" +
        "• Balance and fall prevention: obstacle and dual-task walking, reaching, and getting up from the floor (Williamson 2022).\n" +
        "• Strengthening progressed by load.\n" +
        "• Daily-life practice: standing, bowing and prostration in prayer, ablution at a basin, and getting up from the floor.\n" +
        "• The final home programme in writing, with the daily step count rising by about 1,000 over the starting value (Minetama 2024 — a suggestion).",
      ],
      exercises: [
        { code: "graded-walking",
          doseNote: ["٢٠ ⟵ ٣٠ دقيقة متّصلةً منتصباً نحو هدف المريض، أو بفتراتٍ خارجاً باستراحاتٍ مخطَّطة.", "20 → 30 minutes continuous and upright towards the patient's goal, or in intervals outdoors with planned rests."] },
        { code: "obstacle-dual-task-walking",
          doseNote: ["١٠ دقائق بين العوائق ومع مهمّةٍ ثانية (عدٌّ أو كلام)، بجانب مَن يحرسه.", "10 minutes among obstacles and with a second task (counting or talking), with someone guarding."] },
        { code: "tandem-stance", sets: 1, reps: 3, hold: 30, rest: 15,
          note: ["بلا يد، ثمّ بعينين مغمضتين وشخصٌ بجانبه، ثمّ المشيُ بالكعب أمام الأصابع.", "Without the hand, then eyes closed with someone alongside, then heel-to-toe walking."] },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 30, rest: 15 },
        { code: "step-up", sets: 2, reps: 10, rest: 60,
          note: ["درجةٌ بارتفاع درج البيت، بالدرابزين.", "A step the height of the stairs at home, with a rail."] },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["بثقلٍ في اليدين أو كرسيٍّ أخفض.", "With a weight in the hands or a lower chair."] },
        { code: "standing-hip-three-way", sets: 3, reps: 10 },
        { code: "floor-to-stand-recovery", sets: 1, reps: 2,
          note: ["على فرشةٍ بجانب كرسيّ — وخطّةُ السقوط لمن يعيش وحده.", "On a mat beside a chair — and the fall plan for those living alone."] },
        { code: "seated-forward-flexion", sets: 1, reps: 5, hold: 20, rest: 10,
          note: ["استراحةُ المشي وجزءٌ من البرنامج المنزليّ.", "The walking rest and part of the home programme."] },
        { code: "stationary-cycling",
          doseNote: ["٢٠–٣٠ دقيقة بجهدٍ متوسّط — في البيت أو النادي إن توفّرت دراجة (Bussières 2021).", "20–30 minutes at moderate effort — at home or a gym if a bike is available (Bussières 2021)."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ١٨ بستٍّ في الأسبوع (ثلاثةُ أسابيع) وتمديدٌ واحد بستّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، وزيارةُ تثبيتٍ بعد أربعة أسابيع، والبرنامجُ المنزليّ مدى الحياة — والتجاربُ ١٢ جلسة مرّتين في الأسبوع ستّةَ أسابيع، والمرّتان أفضلُ من المرّة، ولا تجربةَ لثلاثٍ فأكثر، والدوراتُ اليومية حزمُ أجهزةٍ لم تُضف شيئاً: أبقِه، أو اجعله ثلاثاً في الأسبوع ستّةَ أسابيع (١٨ جلسة).",
    en: "18 sessions at six a week (three weeks) with one extension of six for those who reached an important change without meeting discharge, a booster visit four weeks later and the home programme for life — trials used 12 sessions twice a week for six weeks, twice beat once a week (Minetama 2020), no trial tested three or more a week, and daily courses were device packages that added nothing (Macedo 2013): keep it, or make it three a week for six weeks (18 sessions)." },
  { key: "limits", topic: "limits",
    ar: "الحدود: ألمُ الساق ١٫٥ نقطة أو المشيُ ٣٠٪ للمرحلة الثانية، ثمّ المشيُ ١٥١ متراً أو ٣٠٪ وODI ٨٫٥ للثالثة، والخروجُ بـODI ٣٠٪ أو ٨٫٥ والنهوضُ والمشي أقلُّ من ١٢ ثانية، وقاعدةُ الأعراض ٤ من ١٠ ثمّ الجلوسُ منحنياً — اقتراحٌ مبنيٌّ على الفرق المهمّ في التضيّق: أبقِها أو عدّلها.",
    en: "The limits: leg pain 1.5 points or walking 30% for phase 2, then walking 151 m or 30% and ODI 8.5 for phase 3, discharge at ODI 30% or 8.5 with Timed Up and Go under 12 seconds, and a 4/10 symptom rule followed by sitting bent forward — proposals built on the important changes in stenosis (Cleland 2012 · Ammendolia 2018 · Minetama 2024 · Young 2026 · Lusardi 2017): keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: طوارئُ ذيل الفرس وعاجلُه وأسئلتُه في كلّ جلسة، والضعفُ الجديد، والكسرُ المحتمل، ومراجعةُ الطبيب للعرج الوعائيّ وخشونة الورك واعتلال النخاع والأعصاب، ورأيُ الجرّاح لمن يمشي ١٠٠ متر أو أقلّ أو بعد ثلاثة أشهر بلا تحسّن: أبقِها أو عدّلها مع طبيب المركز.",
    en: "The referral rules: cauda equina emergencies and urgent cases with the questions at every session (GIRFT 2023), new weakness, possible fracture, a medical review for vascular claudication, hip osteoarthritis, myelopathy and neuropathy, and a surgeon's opinion for walking of 100 m or less or after three months without improvement (Bussières 2021): keep or adjust with the centre's doctor." },
  { key: "device-robotik", topic: "devices",
    ar: "روبوتُ المشي مساعدٌ مشروط: مشيٌ على السير بحزامٍ يحمل ٣٠–٤٠٪ من الوزن ثمّ أقلّ — ولا تجربةَ للروبوت نفسِه في التضيّق، والدليلُ للمشي بحمل الوزن الذي ساوى الدراجة: أبقِه إن كان في روبوت المركز حزامٌ يحمل الوزن، أو اجعله «لا يُستخدم».",
    en: "The gait robot is a conditional adjunct: treadmill walking with a harness carrying 30–40% of body weight, then less — there is no trial of the robot itself in stenosis, and the evidence is for body-weight-supported walking, which equalled cycling (Pua 2007): keep it if the centre's robot has a body-weight-support harness, or set it to 'Not used'." },
  { key: "device-adjuncts", topic: "devices",
    ar: "التحفيزُ الكهربائيّ والشدُّ والمغناطيسُ والتيكارُ والحرارةُ مساعدةٌ بقاعدتك — والتحفيزُ فشل في تجربةٍ مزدوجة التعمية، والشدُّ ضدّه الإرشاداتُ ولم يظهر إلّا في البرامج الفاشلة وكبارُ السنّ أكثرُهم هشاشة، والمغناطيسُ والتيكارُ والحرارةُ بلا تجربة: أبقِها بشروطها أو اجعل بعضَها «لا يُستخدم»، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Electrotherapy, traction, magnetic therapy, Tecar and heat are adjuncts by your rule — TENS failed in a double-blind trial (Ammendolia 2019), guidelines oppose traction and it appeared only in unsuccessful programmes (Comer 2024) while older adults are the most often osteoporotic, and magnetic therapy, Tecar and heat have no trial: keep them with their conditions or set some to 'Not used', and fill the magnetic settings from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ بموعدٍ دوريّ — كلَّ ثلاثة أيّامٍ ستَّ مرّات، والإرشادُ «تجربةً» بيقينٍ منخفضٍ جداً، وأثرُ الوخز في التجارب دون الفرق المهمّ: أبقِه، أو عدّله، أو اجعله «لا يُستخدم».",
    en: "Dry needling is an adjunct on a periodic schedule — every three days, six times; the guideline says 'on a trial basis' with very low certainty (Bussières 2021), and the trial effect was below the important change (Zhu 2024): keep, adjust, or set it to 'Not used'." },
  { key: "device-laser", topic: "devices",
    ar: "الليزرُ «لا يُستخدم» لأنّك لم تذكره ولا تجربةَ له في التضيّق، والأمواجُ فوق الصوتية «لا يُستخدم» ولم تُضف إلى التمرين، والموجاتُ الصادمة «لا يُستخدم» بلا تجربة: أبقِها كذلك أو غيّرها.",
    en: "Laser is 'Not used' because you have not mentioned it and it has no trial in stenosis, ultrasound is 'Not used' and added nothing to exercise (Goren 2010), and shockwave is 'Not used' with no trial: keep them so or change them." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: ألمَ الساق من ١٠ (الأقلّ أفضل)، والمسافةَ الكلّية حتى التوقّف في المشي بالسرعة الذاتية بالمتر (الأكثر أفضل)، والجلوسَ والقيامَ خمسَ مرّات بالثواني (الأقلّ أفضل)، والأنشطةَ التي يختارها المريض بالعربية من ١٠ (الأكثر أفضل)، وZCQ لشدّة الأعراض من ٥ وللوظيفة من ٤ (الأقلّ أفضل — ولا نسخةَ عربية محكَّمة له)، وBerg لمن سقط.",
    en: "Add under 'Measures' → custom measure: leg pain out of 10 (lower is better), total self-paced walking distance to the forced stop in metres (higher is better), five sit-to-stands in seconds (lower is better), the Arabic Patient-Specific Functional Scale out of 10 (higher is better), the ZCQ symptom severity out of 5 and physical function out of 4 (lower is better — with no peer-reviewed Arabic version), and the Berg scale for those who have fallen." },
];

export const name = "153_physio_lumbar_stenosis_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
