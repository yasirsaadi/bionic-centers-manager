// Migration 129: الجلطةُ الدماغية — المرحلةُ تحت الحادّة — البروتوكولُ السادس مفصَّلاً (§4.dl — ٢٠٢٦-١٠-١١).
//
// البروتوكولُ السادس بالترتيب المتّفق عليه (§4.cx): «ابدأ البروتوكول الذي بعده» — الجلطةُ الدماغية، ومنها تحت الحادّة (`stroke-subacute-adult`، الأشهرُ الستّة
// الأولى). **بالقالب كاملاً** (§4.dd): ٤٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثمانية أسابيع)، وثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقال، وأربعَ عشرةَ بطاقةً
// جديدة (وأربعَ عشرةَ صورةً مطلوبة — وخمسُ بطاقاتٍ من قبل بصورها، بقاعدة المالك «لا تطلب صوراً مكرّرة»)، والأجهزةُ الخمسة بدرجة دليلها و«استعمال المركز»
// وإعداداتها، والمقاييسُ كما زُرعت (فوغل-ماير، بيرغ، ١٠ أمتار، بارثيل، أشوورث). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الجلطة**: التحسّنُ يتبع كمّيةَ التدريب الموجَّه بالمهمّة (Lohse 2014 · Veerbeek 2014 · French 2016) لا طريقةً بعينها (Pollock 2014) — فالعددُ هنا
// أكبر: ٥٠ دقيقة ستّاً في الأسبوع داخلَ الجرعة الفعّالة (٣٠–٦٠ دقيقة يومياً — Pollock) وأقلُّ من ثلاث ساعاتٍ تريدها NICE 2023، فالبيتُ مع المرافق نصفُ العلاج.
// والأجهزة: الروبوتُ متضارب (كوكرين مع، وNICE «للبحث فقط»)، والتحفيزُ بحسب الاستعمال (القدمُ كالدعامة، والكتفُ مبكراً، والذراعُ «لا روتينياً»)، والصادمةُ
// والإبرُ للتشنّج بأثرٍ قصير. والاستعمالُ: التحفيزُ مساعدٌ «تبعاً لكلام سليم»، والإبرُ كما في البروتوكول، والروبوتُ والصادمة لم يذكرهما سليم ولا القاعدة
// فكما زُرعا (مساعد) حتى يقرّر؛ ولا تيكارَ ولا مغناطيسَ ولا شدَّ ولا حرارةَ — لا مكانَ لها هنا. والعلاجُ القسريّ بشرط NICE (٢٠° للرسغ و١٠° للأصابع).
//
// المصادرُ سبعٌ وعشرون، عناوينُها ومعرّفاتُها من سجلّ Europe PMC (وNICE من موقعها). القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const SAFETY_AR = "القياسُ قبل كلّ جلسة: ضغطُ الدم والنبض، ويُسأل عن الدوخة والصداع والضعف الجديد؛ والتعبُ يُحترم — جلسةٌ أخفّ لا إلغاءٌ.";
const SAFETY_EN = "Before every session: blood pressure and pulse, and ask about dizziness, headache and new weakness; respect fatigue — a lighter session rather than none.";
const DAILY: [string, string] = ["يومياً — في الجلسة وفي البيت مع المرافق.", "Daily — in the session and at home with the carer."];

/** **البطاقاتُ الجديدة** — والجلوسُ والقيام والجسرُ (ترحيل ١١٩) وصعودُ الدرجة ورفعُ الكعبين والدرّاجةُ الثابتة (ترحيل ١٢٦) برموزها وصورها. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "sitting-reach", nameAr: "الوصول جالساً إلى الأمام والجانبين", nameEn: "Seated reaching (sitting balance)",
    kind: "balance", region: "whole_body", sets: 2, reps: 10, rest: 30,
    purpose: ["يدرّب توازنَ الجذع في الجلوس ونقلَ الوزن فوق الورك المصاب — وهو أساسُ القيام والنقل والمشي؛ والوصولُ إلى أبعد من طول الذراع يُجبر الجذعَ على العمل بلا إسناد.",
      "Trains trunk balance in sitting and weight transfer over the affected hip — the basis of standing up, transfers and walking; reaching beyond arm's length makes the trunk work without support."],
    start: ["جالسٌ على حافّة سريرٍ أو كرسيٍّ ثابت بلا مسندين، والقدمان على الأرض بعرض الورك، والفخذان على المقعد حتى منتصفهما، ومعالجٌ أو مرافقٌ بجانب الجهة المصابة.",
      "Sitting on the edge of a bed or a stable chair without armrests, feet flat and hip-width apart, thighs half on the seat, with a therapist or carer beside the affected side."],
    steps: [[
      "ضع أغراضاً خفيفة (كوباً بلاستيكياً أو كرة) أمامك وعلى جانبيك، أبعدَ قليلاً من طول ذراعك.",
      "مدّ يدك والتقط الغرض، والجذعُ يميل نحوه من الوركين.",
      "عُد إلى الجلوس المنتصب ببطء، والقدمان على الأرض طوال الوقت.",
      "نوّع الاتّجاه: أمامٌ، فالجهةُ المصابة، فالسليمة — وأبعدُ قليلاً كلّما سهل.",
      "عشرُ مرّات، ثمّ استرح.",
    ], [
      "Place light objects (a plastic cup or a ball) in front and to each side, slightly beyond arm's length.",
      "Reach out and pick up the object, leaning the trunk towards it from the hips.",
      "Return slowly to upright sitting, keeping both feet on the floor throughout.",
      "Vary the direction: forwards, towards the affected side, towards the good side — a little further as it gets easier.",
      "Ten reaches, then rest.",
    ]],
    cues: [[
      "رفعُ القدمين أو انزلاقُ الحوض ⟵ القدمان على الأرض والوزنُ على الوركين معاً.",
      "الميلُ إلى الجهة السليمة دائماً ⟵ ابدأ بالوصول نحو الجهة المصابة ليحمل وركُها الوزن.",
      "الإمساكُ بالسرير باليد الأخرى ⟵ اليدُ الأخرى على الفخذ ما أمكن.",
    ], [
      "Feet lifting or the pelvis sliding → feet down, weight through both hips.",
      "Always leaning to the good side → start by reaching towards the affected side so its hip takes the weight.",
      "Holding on to the bed with the other hand → rest the other hand on the thigh where possible.",
    ]],
    easier: ["أغراضٌ داخل طول الذراع، أو ظهرٌ مسنود، أو القدمان على درجةٍ أعلى.", "Objects within arm's reach, a supported back, or the feet on a raised step."],
    harder: ["أبعدُ من طول الذراع ونحو الأرض، أو على سطحٍ ليّن، أو بعينين مغلقتين بجانب المعالج.", "Further than arm's length and down towards the floor, on a soft surface, or with eyes closed beside the therapist."],
    stopIf: ["دوخةٌ أو تعرّقٌ أو ألمٌ في الصدر، أو ألمٌ في الكتف المصاب.", "Dizziness, sweating or chest pain, or pain in the affected shoulder."],
    equipment: ["سريرٌ أو كرسيٌّ ثابت، وأغراضٌ خفيفة.", "A bed or stable chair, and light objects."],
    doseNote: ["يومياً، مرّتين، وبإشراف مرافقٍ في البيت.", "Daily, twice, supervised by a carer at home."],
    images: [{ key: "sitting-reach-1", ar: "جالسٌ على حافّة السرير يميل ويمدّ يده إلى غرضٍ أبعد من طول ذراعه", en: "Sitting on the edge of a bed, leaning to reach an object beyond arm's length", search: "seated reaching balance exercise stroke" }],
  },
  {
    code: "roll-to-sit", nameAr: "التدحرج والجلوس على حافّة السرير", nameEn: "Rolling and sitting up over the edge of the bed",
    kind: "functional", region: "whole_body", sets: 1, reps: 5, rest: 60,
    purpose: ["يعلّم المريضَ ومرافقَه الطريقةَ الآمنة للنهوض من السرير بأقلّ مساعدة — بلا شدٍّ على الذراع المصابة — وهي أوّلُ خطوةٍ في الاستقلال اليوميّ.",
      "Teaches the patient and carer a safe way to get up from bed with the least help — without pulling on the affected arm — the first step towards daily independence."],
    start: ["مستلقٍ على الظهر قربَ حافّة السرير من الجهة المصابة، والذراعُ المصابة بجانب الجسم لا تحته.",
      "Lying on the back near the edge of the bed on the affected side, with the affected arm beside the body, not underneath it."],
    steps: [[
      "اثنِ الركبتين، وساعد الساقَ المصابة بالسليمة إن احتاجت.",
      "ضع الذراعَ المصابة على البطن، ثمّ مدّ الذراعَ السليمة عبر الجسم وتدحرج نحو الجهة المصابة.",
      "أنزل الساقين عن حافّة السرير.",
      "ادفع باليد السليمة على السرير لترفع الجذعَ إلى الجلوس.",
      "اجلس منتصباً والقدمان على الأرض، وتوقّف لحظةً قبل الوقوف.",
    ], [
      "Bend both knees, helping the affected leg with the good one if needed.",
      "Place the affected arm on the stomach, then reach the good arm across the body and roll towards the affected side.",
      "Lower both legs over the edge of the bed.",
      "Push down on the bed with the good hand to bring the trunk up to sitting.",
      "Sit upright with the feet on the floor, and pause before standing.",
    ]],
    cues: [[
      "سحبُ المريض من ذراعه المصابة ⟵ لا تُشدّ الذراعُ المصابة أبداً؛ المساعدةُ من لوح الكتف والحوض.",
      "الذراعُ المصابة تحت الجسم عند التدحرج ⟵ تُوضع على البطن قبل الحركة.",
      "الوقوفُ فورَ الجلوس ⟵ لحظةُ جلوسٍ أوّلاً لتجنّب الدوخة.",
    ], [
      "Pulling the patient up by the affected arm → never pull the affected arm; help from the shoulder blade and pelvis.",
      "The affected arm trapped underneath when rolling → place it on the stomach first.",
      "Standing straight after sitting up → pause first to avoid dizziness.",
    ]],
    easier: ["رأسُ السرير مرفوع، أو مساعدةُ شخصٍ واحد من الحوض.", "The head of the bed raised, or one person helping at the pelvis."],
    harder: ["من الجهة السليمة أيضاً، وبلا مساعدة، وأسرع.", "Also over the good side, without help, and faster."],
    stopIf: ["دوخةٌ شديدة عند الجلوس، أو ألمٌ في الكتف المصاب.", "Marked dizziness on sitting up, or pain in the affected shoulder."],
    equipment: ["سرير.", "A bed."],
    doseNote: ["عند كلّ نهوضٍ من السرير، ويتعلّمه المرافق.", "Every time the patient gets out of bed; taught to the carer."],
    images: [{ key: "roll-to-sit-1", ar: "مستلقٍ يتدحرج على جنبه ويدفع بيده السليمة ليجلس على حافّة السرير", en: "Rolling onto the side and pushing up with the good hand to sit on the edge of the bed", search: "stroke patient sitting up from bed technique" }],
  },
  {
    code: "bed-to-chair-transfer", nameAr: "الانتقال من السرير إلى الكرسيّ", nameEn: "Bed-to-chair transfer",
    kind: "functional", region: "whole_body", sets: 1, reps: 5, rest: 60,
    purpose: ["يعيد أكثرَ حركةٍ يحتاجها المريضُ ومرافقُه كلَّ يوم بأمان — من السرير إلى الكرسيّ والمرحاض والسيارة — ويقلّل السقوطَ وإرهاقَ المرافق.",
      "Restores, safely, the movement the patient and carer need most every day — from bed to chair, toilet and car — reducing falls and carer strain."],
    start: ["جالسٌ على حافّة السرير والقدمان على الأرض، والكرسيّ (بمسندين، وفراملُه مشدودة إن كان متحرّكاً) بزاوية ٤٥° من الجهة السليمة.",
      "Sitting on the edge of the bed with the feet on the floor, the chair (with armrests, brakes on if it is a wheelchair) at 45° on the good side."],
    steps: [[
      "تقدّم إلى حافّة السرير وأرجع القدمين قليلاً تحت الركبتين.",
      "مِل بالجذع إلى الأمام («الأنفُ فوق أصابع القدم») وقف بالدفع على الساقين معاً.",
      "ضع اليدَ السليمة على المسند البعيد للكرسيّ.",
      "استدر بخطواتٍ صغيرة حتى يلامس الكرسيُّ مؤخّرةَ الساقين.",
      "انزل إلى الجلوس ببطء والجذعُ مائلٌ إلى الأمام.",
    ], [
      "Shuffle forward to the edge of the bed and bring the feet slightly back under the knees.",
      "Lean the trunk forward ('nose over toes') and stand by pushing through both legs.",
      "Place the good hand on the far armrest of the chair.",
      "Turn with small steps until the chair touches the back of the legs.",
      "Lower slowly into the seat with the trunk leaning forward.",
    ]],
    cues: [[
      "رفعُ المريض من الذراع المصابة أو من تحت الإبط ⟵ المساعدةُ من الحوض بحزامٍ أو بالإمساك عند الخصر.",
      "الدورانُ على قدمٍ ثابتة ⟵ خطواتٌ صغيرة.",
      "الجلوسُ بإسقاط الجسم ⟵ نزولٌ متحكَّم والجذعُ مائلٌ إلى الأمام.",
    ], [
      "Lifting the patient by the affected arm or under the armpit → help from the pelvis with a belt or at the waistband.",
      "Pivoting on a fixed foot → small steps.",
      "Dropping into the chair → a controlled lowering with the trunk leaning forward.",
    ]],
    easier: ["سريرٌ أعلى، أو مساعدةُ شخص، أو لوحُ انتقالٍ للضعيف جداً.", "A higher bed, one person helping, or a transfer board for the very weak."],
    harder: ["نحو الجهة المصابة، وإلى كرسيٍّ أخفض أو بلا مسندين، ثمّ المرحاض والسيارة.", "Towards the affected side, to a lower chair or one without armrests, then the toilet and the car."],
    stopIf: ["دوخةٌ أو ضعفٌ مفاجئ في الساقين، أو ألمٌ في الكتف المصاب.", "Dizziness or sudden leg weakness, or pain in the affected shoulder."],
    equipment: ["سرير، وكرسيٌّ بمسندين، وحزامُ نقلٍ عند الحاجة.", "A bed, a chair with armrests, and a transfer belt if needed."],
    doseNote: ["عند كلّ انتقالٍ في اليوم، ويتدرّب عليه المرافقُ في المركز.", "At every transfer during the day; the carer practises it in the centre."],
    images: [{ key: "bed-to-chair-transfer-1", ar: "المريضُ يقف من السرير ويستدير إلى كرسيٍّ بجانبه، والمرافقُ يساعد من الحوض", en: "The patient stands from the bed and turns to a chair beside it, the carer helping at the pelvis", search: "stroke stand pivot transfer bed to chair" }],
  },
  {
    code: "affected-arm-weight-bearing", nameAr: "الاستناد على اليد المصابة جالساً", nameEn: "Seated weight-bearing through the affected arm",
    kind: "motor_control", region: "wrist_hand", sets: 1, reps: 5, hold: 30, rest: 15,
    purpose: ["يُبقي الرسغَ والأصابعَ ممدودةً ويقاوم انقباضَها إلى الداخل مع التشنّج، ويوصل الإحساسَ من الذراع المصابة ويُشركها في التوازن — بلا شدٍّ على الكتف.",
      "Keeps the wrist and fingers stretched out against the curling of spasticity, feeds sensation from the affected arm and involves it in balance — without pulling on the shoulder."],
    start: ["جالسٌ على حافّة السرير، واليدُ المصابة مبسوطةٌ على السرير بجانب الورك والأصابعُ ممدودةٌ إلى الخلف أو الجانب، والمرفقُ مستقيم (يثبّته المعالجُ أو المرافقُ إن احتاج).",
      "Sitting on the edge of the bed with the affected hand flat on the bed beside the hip, fingers spread pointing back or sideways, the elbow straight (held by the therapist or carer if needed)."],
    steps: [[
      "افتح أصابعَ اليد المصابة بلطفٍ وضعها مبسوطةً على السرير.",
      "مِل بالجسم قليلاً نحو الجهة المصابة لتحمل اليدُ جزءاً من الوزن.",
      "ابقَ ٣٠ ثانية وتنفّس، والكتفُ لا يرتفع نحو الأذن.",
      "عُد إلى الوسط ثمّ كرّر ٥ مرّات، ويمكن أن تميل إلى الأمام والخلف قليلاً.",
    ], [
      "Gently open the fingers of the affected hand and lay it flat on the bed.",
      "Lean the body slightly towards the affected side so the hand takes some of the weight.",
      "Stay for 30 seconds, breathing, without the shoulder hitching up.",
      "Return to the middle and repeat 5 times; you can also rock slightly forwards and back.",
    ]],
    cues: [[
      "الأصابعُ مقبوضةٌ تحت الكفّ ⟵ تُفتح أوّلاً وتُبسط.",
      "المرفقُ ينثني فجأةً ⟵ الإسنادُ عند المرفق أو وزنٌ أقلّ.",
      "ألمٌ في الرسغ أو الكتف ⟵ ميلٌ أقلّ، أو اليدُ على وسادةٍ أو سطحٍ أعلى.",
    ], [
      "Fingers curled under the palm → open and flatten them first.",
      "The elbow buckling → support at the elbow, or less weight.",
      "Pain in the wrist or shoulder → less lean, or the hand on a cushion or a higher surface.",
    ]],
    easier: ["الساعدُ على وسادةٍ بدل اليد، أو وزنٌ قليل.", "The forearm on a cushion instead of the hand, or very little weight."],
    harder: ["الاستنادُ مع الوصول باليد السليمة، أو في الوقوف على طاولة.", "Weight-bearing while reaching with the good hand, or standing at a table."],
    stopIf: ["ألمٌ في الكتف المصاب أو الرسغ، أو يدٌ متورّمةٌ حارّة.", "Pain in the affected shoulder or wrist, or a swollen, hot hand."],
    equipment: ["سرير، ووسادة.", "A bed and a cushion."],
    doseNote: ["مرّتين أو ثلاثاً يومياً، وأثناء الجلوس.", "Two or three times daily, and while sitting."],
    images: [{ key: "affected-arm-weight-bearing-1", ar: "جالسٌ واليدُ المصابة مبسوطةٌ على السرير بجانب الورك تحمل جزءاً من الوزن", en: "Sitting with the affected hand flat on the bed beside the hip, taking some weight", search: "stroke weight bearing affected arm sitting" }],
  },
  {
    code: "table-towel-slide", nameAr: "زلق الذراع المصابة على الطاولة بالمنشفة", nameEn: "Table-top towel slides (affected arm)",
    kind: "mobility", region: "shoulder", sets: 2, reps: 10, rest: 30,
    purpose: ["يحرّك الكتفَ والمرفقَ المصابين إلى الأمام في مدىً آمن والطاولةُ تحمل ثقلَ الذراع — فيحفظ الحركةَ ويقلّل ألمَ الكتف ويبدأ التحكّمَ الفعّال، بلا بكراتٍ فوق الرأس.",
      "Moves the affected shoulder and elbow forward through a safe range with the table taking the arm's weight — maintaining movement, reducing shoulder pain and starting active control, without overhead pulleys."],
    start: ["جالسٌ أمام طاولةٍ بارتفاع البطن، والذراعان على منشفةٍ فوقها، واليدُ السليمة فوق المصابة أو بجانبها.",
      "Sitting at a table at stomach height with both arms on a towel on top, the good hand over or beside the affected one."],
    steps: [[
      "ازلق المنشفةَ إلى الأمام بالذراعين معاً، والجذعُ يميل قليلاً من الوركين.",
      "توقّف عند شدٍّ مريح بلا ألمٍ في الكتف، واثبت ثانيتين.",
      "عُد ببطءٍ إلى البداية.",
      "ثمّ ارسم دوائرَ وحرفَ ثمانية على الطاولة.",
      "كرّر ١٠ مرّات.",
    ], [
      "Slide the towel forward with both arms together, the trunk leaning slightly from the hips.",
      "Stop at a comfortable stretch without shoulder pain and hold for 2 seconds.",
      "Slide back slowly to the start.",
      "Then draw circles and figures of eight on the table.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ مرتخٍ إلى الأسفل، والمدى أقلّ.",
      "دفعُ الذراع إلى ألم ⟵ الحركةُ بلا ألمٍ في الكتف دائماً.",
      "الذراعُ السليمة تعمل وحدها ⟵ المصابةُ تشارك بقدر ما تستطيع، ثمّ وحدها.",
    ], [
      "Hitching the shoulder → relax it down and use a smaller range.",
      "Pushing into pain → always move without shoulder pain.",
      "The good arm doing all the work → the affected arm joins in as much as it can, then alone.",
    ]],
    easier: ["مدىً أصغر بمساعدة المعالج.", "A smaller range with the therapist's help."],
    harder: ["الذراعُ المصابة وحدها، أو على سطحٍ مائلٍ إلى الأعلى.", "The affected arm alone, or on an upward-sloping surface."],
    stopIf: ["ألمٌ في الكتف المصاب، أو تورّمٌ في اليد.", "Pain in the affected shoulder, or swelling of the hand."],
    equipment: ["طاولة، ومنشفة.", "A table and a towel."],
    doseNote: ["مرّتين يومياً.", "Twice daily."],
    images: [{ key: "table-towel-slide-1", ar: "جالسٌ أمام طاولة يزلق منشفةً إلى الأمام بذراعيه", en: "Sitting at a table, sliding a towel forward with both arms", search: "towel slide table shoulder exercise stroke" }],
  },
  {
    code: "ankle-dorsiflexion-seated", nameAr: "رفع مقدّمة القدم جالساً", nameEn: "Seated ankle dorsiflexion (toe lifts)",
    kind: "strength", region: "ankle_foot", sets: 3, reps: 10, hold: 2, rest: 30,
    purpose: ["يقوّي رافعاتِ القدم التي تضعف بعد الجلطة — وضعفُها يجعل مقدّمةَ القدم تتعثّر في المشي (هبوطُ القدم) — ويعلّم تحريكَها بإرادة المريض.",
      "Strengthens the ankle dorsiflexors, which weaken after stroke — their weakness makes the toes catch when walking (drop foot) — and trains voluntary control."],
    start: ["جالسٌ على كرسيٍّ والقدمان على الأرض، والكعبُ المصاب أمام الركبة قليلاً.",
      "Sitting on a chair with the feet on the floor, the affected heel slightly in front of the knee."],
    steps: [[
      "ارفع مقدّمةَ القدم المصابة عن الأرض والكعبُ على الأرض.",
      "اثبت ثانيتين.",
      "أنزلها ببطء.",
      "كرّر ١٠ مرّات، ٣ مجموعات.",
    ], [
      "Lift the front of the affected foot off the floor, keeping the heel down.",
      "Hold for 2 seconds.",
      "Lower it slowly.",
      "Repeat 10 times, 3 sets.",
    ]],
    cues: [[
      "رفعُ الساق كلّها من الورك ⟵ الكعبُ يبقى على الأرض والحركةُ من الكاحل.",
      "انقلابُ القدم إلى الداخل ⟵ ارفعها مستقيمةً نحو الإصبع الثاني.",
      "حبسُ النفس ⟵ تنفّس.",
    ], [
      "Lifting the whole leg from the hip → the heel stays down; the movement is at the ankle.",
      "The foot turning inwards → lift it straight, towards the second toe.",
      "Holding the breath → keep breathing.",
    ]],
    easier: ["بمساعدة المعالج أو المرافق، أو مع تحفيزٍ كهربائيّ على العضلة.", "With help from the therapist or carer, or with electrical stimulation of the muscle."],
    harder: ["مطّاطٌ حول مقدّمة القدم، أو في الوقوف والظهرُ مستندٌ إلى حائط.", "A band around the forefoot, or standing with the back against a wall."],
    stopIf: ["تشنّجٌ مؤلم في الساق، أو ألمٌ في الكاحل.", "A painful cramp in the leg, or ankle pain."],
    equipment: ["كرسيّ، ومطّاطٌ للتصعيب.", "A chair; a band for progression."],
    doseNote: ["يومياً، مرّتين.", "Daily, twice."],
    images: [{ key: "ankle-dorsiflexion-seated-1", ar: "جالسٌ يرفع مقدّمةَ قدمه والكعبُ على الأرض", en: "Seated, lifting the front of the foot with the heel on the floor", search: "seated ankle dorsiflexion toe raises exercise" }],
  },
  {
    code: "standing-weight-shift", nameAr: "نقل الوزن واقفاً إلى الساق المصابة", nameEn: "Standing weight shifting onto the affected leg",
    kind: "balance", region: "whole_body", sets: 2, reps: 10, hold: 3, rest: 30,
    purpose: ["يعلّم الساقَ المصابة أن تحمل وزنَ الجسم — وقلّةُ الحمل عليها سببُ عرجٍ وسقوطٍ بعد الجلطة — ويدرّب التوازنَ في الوقوف قبل المشي.",
      "Teaches the affected leg to take body weight — under-loading it causes limping and falls after stroke — and trains standing balance before walking."],
    start: ["واقفٌ أمام طاولةٍ أو بين قضيبين متوازيين، والقدمان بعرض الورك، واليدُ السليمة على السطح، والمعالجُ بجانب الجهة المصابة.",
      "Standing at a table or between parallel bars, feet hip-width apart, the good hand on the surface, the therapist beside the affected side."],
    steps: [[
      "انقل وزنَك ببطءٍ نحو الساق المصابة حتى يصير الوركُ فوق القدم.",
      "اثبت ٣ ثوانٍ والركبةُ مستقيمةٌ غيرُ مقفلةٍ إلى الخلف.",
      "عُد إلى الوسط، ثمّ إلى الأمام والخلف بالطريقة نفسِها.",
      "كرّر ١٠ مرّات.",
    ], [
      "Shift your weight slowly onto the affected leg until the hip is over the foot.",
      "Hold for 3 seconds with the knee straight but not snapped back.",
      "Return to the middle, then shift forwards and backwards in the same way.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "ميلُ الجذع بدل نقل الحوض ⟵ الحوضُ هو الذي يتحرّك فوق القدم.",
      "الركبةُ تُقفل إلى الخلف ⟵ «ركبةٌ ناعمة» مستقيمةٌ بلا قفل.",
      "الاتّكاءُ بقوّةٍ على اليد ⟵ اليدُ تلمس السطح فقط ما أمكن.",
    ], [
      "Leaning the trunk instead of moving the pelvis → it is the pelvis that moves over the foot.",
      "The knee snapping back → a 'soft', straight knee without locking.",
      "Leaning hard on the hand → the hand only touches the surface where possible.",
    ]],
    easier: ["نقلٌ أقلّ، أو ميزانٌ تحت كلّ قدمٍ ليرى المريضُ الوزن.", "A smaller shift, or a bathroom scale under each foot so the patient sees the weight."],
    harder: ["رفعُ القدم السليمة عن الأرض لحظةً، أو الوقوفُ وقدمٌ أمام الأخرى.", "Lifting the good foot briefly, or standing with one foot in front of the other."],
    stopIf: ["دوخة، أو ضعفٌ مفاجئ في الساق، أو ألمٌ في الصدر.", "Dizziness, sudden leg weakness, or chest pain."],
    equipment: ["طاولةٌ ثابتة أو قضيبان متوازيان، وميزانان عند الحاجة.", "A stable table or parallel bars, and two bathroom scales if needed."],
    doseNote: ["يومياً، مرّتين، بجانب سطحٍ ثابت.", "Daily, twice, beside a stable surface."],
    images: [{ key: "standing-weight-shift-1", ar: "واقفٌ أمام طاولة ينقل وزنَه نحو الساق المصابة، والمعالجُ بجانبه", en: "Standing at a table shifting weight onto the affected leg, the therapist alongside", search: "standing weight shifting exercise stroke" }],
  },
  {
    code: "overground-gait-training", nameAr: "تدريب المشي على الأرض بالمساعدة", nameEn: "Overground gait training",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["المشيُ نفسُه أفضلُ تدريبٍ للمشي: تكرارٌ كثيرٌ بمساعدةٍ تقلّ تدريجياً يحسّن السرعةَ والمسافةَ والاستقلال — والهدفُ مشيٌ آمن في البيت ثمّ في الشارع.",
      "Walking itself is the best training for walking: many repetitions with help that gradually reduces improve speed, distance and independence — aiming for safe walking at home, then outdoors."],
    start: ["واقفٌ بالحذاء والدعامة (إن وُصفت) والأداةِ المناسبة (عكّازٌ رباعيّ أو عصا أو مشّاية)، والمعالجُ بجانب الجهة المصابة وخلفها قليلاً.",
      "Standing in shoes, with the brace (if prescribed) and the right aid (quad cane, stick or frame), the therapist beside the affected side and slightly behind."],
    steps: [[
      "قف منتصباً والوزنُ على الساقين معاً.",
      "قدّم الأداةَ، ثمّ الساقَ المصابة، ثمّ السليمة (والعصا في اليد السليمة).",
      "اجعل الخطوتين متساويتين، والكعبُ يلمس الأرضَ أوّلاً.",
      "امشِ مسافةً قصيرةً بلا توقّف، ثمّ استرح جالساً، وزِد المسافةَ في كلّ جلسة.",
      "أضف الاستدارةَ والمشيَ إلى الخلف والجانب حين يثبت المشيُ إلى الأمام.",
    ], [
      "Stand tall with weight on both legs.",
      "Move the aid, then the affected leg, then the good leg (with the stick in the good hand).",
      "Make both steps equal, with the heel touching down first.",
      "Walk a short distance without stopping, then rest seated; increase the distance each session.",
      "Add turning, walking backwards and sideways once forward walking is steady.",
    ]],
    cues: [[
      "خطوةٌ قصيرة بالساق السليمة (وقوفٌ قصيرٌ على المصابة) ⟵ «ابقَ على الساق المصابة» قبل أن تخطو بالسليمة.",
      "جرُّ مقدّمة القدم ⟵ ارفع الركبةَ واسحب الكاحلَ إلى الأعلى؛ والدعامةُ أو التحفيزُ لمن لا يستطيع.",
      "النظرُ إلى القدمين ⟵ النظرُ إلى الأمام.",
    ], [
      "A short step with the good leg (brief standing on the affected one) → 'stay on the affected leg' before stepping with the good one.",
      "Dragging the toes → lift the knee and pull the ankle up; a brace or stimulation for those who cannot.",
      "Looking at the feet → look ahead.",
    ]],
    easier: ["بين القضيبين المتوازيين، أو بمساعدة شخصين، أو بجهاز المشي الروبوتيّ لغير القادر على المشي.", "Between parallel bars, with two people helping, or on the robotic gait trainer for those unable to walk."],
    harder: ["أسرع، وأطول، وبلا أداة، وعلى أرضٍ غير مستوية، ومع حمل غرض.", "Faster, longer, without the aid, on uneven ground, and carrying something."],
    stopIf: ["دوخة، أو ألمٌ في الصدر، أو ضيقُ نفس، أو ضعفٌ جديد.", "Dizziness, chest pain, breathlessness, or new weakness."],
    equipment: ["أداةُ المشي المناسبة، والدعامةُ إن وُصفت، وحزامُ نقل.", "The right walking aid, the brace if prescribed, and a transfer belt."],
    doseNote: ["في كلّ جلسة، وأكثرَ ما يستطيع من الخطوات.", "Every session, with as many steps as possible."],
    images: [{ key: "overground-gait-training-1", ar: "مريضُ جلطةٍ يمشي بعكّازٍ رباعيّ والمعالجُ بجانب الجهة المصابة", en: "A stroke patient walking with a quad cane, the therapist beside the affected side", search: "stroke gait training quad cane therapist" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "side-stepping", nameAr: "المشي جانباً بمحاذاة الطاولة", nameEn: "Side-stepping along a counter",
    kind: "balance", region: "hip", sets: 2, reps: 10, rest: 45,
    purpose: ["يقوّي الألويةَ الجانبية التي تثبّت الحوضَ عند الوقوف على الساق المصابة، ويدرّب نقلَ الوزن والتوازنَ الجانبيّ — وهو ما يضعف كثيراً ويسبّب السقوطَ إلى الجانب.",
      "Strengthens the lateral hip muscles that steady the pelvis when standing on the affected leg, and trains weight transfer and side-to-side balance — often weak and a cause of sideways falls."],
    start: ["واقفٌ مواجهاً طاولةَ مطبخٍ أو حافّةً ثابتة، واليدان عليها، والقدمان معاً.",
      "Standing facing a kitchen counter or a stable edge, hands on it, feet together."],
    steps: [[
      "اخطُ بالساق المصابة إلى جانبها خطوةً متوسّطة، والقدمُ تشير إلى الأمام.",
      "انقل الوزنَ عليها، ثمّ قرّب الساقَ السليمة.",
      "عشرُ خطواتٍ إلى جهة، ثمّ عشرٌ إلى الأخرى.",
      "الجذعُ منتصبٌ والنظرُ إلى الأمام.",
    ], [
      "Step sideways with the affected leg a medium step, toes pointing forwards.",
      "Shift the weight onto it, then bring the good leg alongside.",
      "Ten steps one way, then ten back.",
      "Keep the trunk upright and the eyes forward.",
    ]],
    cues: [[
      "القدمُ تدور إلى الخارج ⟵ أصابعُ القدمين إلى الأمام.",
      "الميلُ بالجذع إلى الجانب ⟵ الجذعُ منتصب والحوضُ مستوٍ.",
      "جرُّ القدم على الأرض ⟵ ارفعها قليلاً عند كلّ خطوة.",
    ], [
      "The foot turning out → toes forwards.",
      "Leaning the trunk sideways → trunk upright, pelvis level.",
      "Dragging the foot → lift it slightly with each step.",
    ]],
    easier: ["خطواتٌ أصغر، واليدان تمسكان.", "Smaller steps, holding on with both hands."],
    harder: ["يدٌ واحدة ثمّ بلا يدين، أو مطّاطٌ دائريّ فوق الركبتين.", "One hand, then no hands, or a loop band above the knees."],
    stopIf: ["دوخة، أو التواءٌ في الكاحل، أو ألمٌ في الصدر.", "Dizziness, the ankle rolling, or chest pain."],
    equipment: ["طاولةُ مطبخٍ أو حافّةٌ ثابتة، ومطّاطٌ دائريّ للتصعيب.", "A kitchen counter or stable edge; a loop band for progression."],
    doseNote: ["يومياً.", "Daily."],
    images: [{ key: "side-stepping-1", ar: "واقفٌ يمسك حافّةَ طاولة ويخطو جانباً", en: "Standing holding a counter edge, stepping sideways", search: "side stepping holding counter exercise" }],
  },
  {
    code: "reach-grasp-task", nameAr: "الوصول والإمساك بالأغراض على الطاولة", nameEn: "Reach-to-grasp task practice",
    kind: "functional", region: "wrist_hand", sets: 3, reps: 10, rest: 30,
    purpose: ["تكرارُ مهامٍّ يدويةٍ حقيقية (التقاطُ كوب، نقلُ مكعّب، قلبُ ورقة) هو ما يعيد استعمالَ اليد — تدريبٌ موجَّهٌ بالمهمّة يزداد صعوبةً كلّما نجح المريض.",
      "Repeating real hand tasks (picking up a cup, moving a block, turning a page) is what restores hand use — task-oriented practice that gets harder as the patient succeeds."],
    start: ["جالسٌ أمام طاولةٍ والقدمان على الأرض، والساعدُ المصاب على الطاولة، وأمامه أغراضٌ مختلفةُ الحجم (كوب، مكعّبات، ملعقة، مناديل).",
      "Sitting at a table with the feet on the floor, the affected forearm on the table, and objects of various sizes in front (a cup, blocks, a spoon, tissues)."],
    steps: [[
      "مدّ اليدَ المصابة نحو الغرض، والجذعُ ثابتٌ ما أمكن.",
      "افتح الأصابعَ وأمسك الغرض.",
      "انقله إلى مكانٍ آخر على الطاولة، أو إلى الفم كأنّك تشرب.",
      "اتركه بفتح الأصابع، وأعِد اليدَ إلى البداية.",
      "عشرُ مرّاتٍ لكلّ غرض، وغيّر الأغراضَ والمسافات.",
    ], [
      "Reach with the affected hand towards the object, keeping the trunk still where possible.",
      "Open the fingers and grasp the object.",
      "Move it to another place on the table, or towards the mouth as if drinking.",
      "Release it by opening the fingers, and bring the hand back to the start.",
      "Ten times per object, varying the objects and distances.",
    ]],
    cues: [[
      "رفعُ الكتف أو ميلُ الجذع للوصول ⟵ قرّب الغرضَ قليلاً.",
      "اليدُ السليمة تساعد دائماً ⟵ اليدُ السليمة على الفخذ.",
      "السرعةُ على حساب الدقّة ⟵ ببطءٍ وبدقّة، ثمّ أسرع.",
    ], [
      "Hitching the shoulder or leaning the trunk to reach → move the object a little closer.",
      "The good hand always helping → rest the good hand on the thigh.",
      "Speed at the expense of accuracy → slowly and accurately, then faster.",
    ]],
    easier: ["أغراضٌ كبيرةٌ خفيفة وقريبة، أو الساعدُ مسنود.", "Large, light, nearby objects, or the forearm supported."],
    harder: ["أغراضٌ صغيرة (عملاتٌ معدنية، أزرار)، وأبعد وأعلى، ومهامّ يومية (الأكل، تمشيطُ الشعر).", "Small objects (coins, buttons), further away and higher, and daily tasks (eating, combing the hair)."],
    stopIf: ["ألمٌ في الكتف المصاب، أو تورّمٌ في اليد، أو تعبٌ شديد.", "Pain in the affected shoulder, swelling of the hand, or marked fatigue."],
    equipment: ["طاولة، وأغراضٌ منزليةٌ مختلفةُ الحجم.", "A table and household objects of different sizes."],
    doseNote: ["يومياً، أكثرَ ما يمكن من التكرارات موزّعةً على اليوم.", "Daily, as many repetitions as possible spread through the day."],
    images: [{ key: "reach-grasp-task-1", ar: "جالسٌ أمام طاولة يمدّ يدَه المصابة ليمسك كوباً", en: "Sitting at a table, reaching with the affected hand to grasp a cup", search: "stroke task oriented training reaching grasping cup" }],
  },
  {
    code: "mirror-therapy", nameAr: "العلاج بالمرآة", nameEn: "Mirror therapy",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["يرى المريضُ في المرآة اليدَ السليمة تتحرّك كأنّها المصابة — فيتحفّز الجزءُ المصاب من الدماغ؛ ويحسّن الحركةَ والاستعمالَ اليوميّ، وخاصّةً لمن ضعفت يدُه كثيراً.",
      "The patient watches the good hand moving in a mirror as if it were the affected one — stimulating the affected side of the brain; it improves movement and daily use, especially when the hand is very weak."],
    start: ["جالسٌ أمام طاولةٍ عليها مرآةٌ قائمة في منتصف الجسم، واليدُ المصابة خلف المرآة لا تُرى، والسليمةُ أمامها، والنظرُ إلى المرآة.",
      "Sitting at a table with an upright mirror in the midline, the affected hand hidden behind it and the good hand in front, looking into the mirror."],
    steps: [[
      "انظر إلى انعكاس اليد السليمة في المرآة وتخيّل أنّها اليدُ المصابة.",
      "حرّك اليدَ السليمة ببطء: فتحٌ وقبضٌ للأصابع، ثمّ ثنيُ الرسغ وبسطُه، ثمّ قلبُ الكفّ.",
      "حاول أن تحرّك اليدَ المصابة خلف المرآة بالحركة نفسِها قدرَ ما تستطيع.",
      "ثمّ مهامُّ بسيطة أمام المرآة: لمسُ الأصابع بالإبهام، ودحرجةُ كرةٍ صغيرة.",
      "استمرّ نحو ٣٠ دقيقة بفتراتٍ قصيرة.",
    ], [
      "Look at the reflection of the good hand and imagine it is the affected hand.",
      "Move the good hand slowly: opening and closing the fingers, bending and straightening the wrist, turning the palm.",
      "Try to move the affected hand behind the mirror in the same way, as far as you can.",
      "Then simple tasks in front of the mirror: touching each finger to the thumb, rolling a small ball.",
      "Continue for about 30 minutes in short spells.",
    ]],
    cues: [[
      "النظرُ إلى اليد المصابة خلف المرآة ⟵ النظرُ إلى المرآة وحدها.",
      "حركاتٌ سريعةٌ كثيرة ⟵ بطيئةٌ واضحة يتابعها المريض.",
      "مرآةٌ صغيرة لا تُخفي اليدَ المصابة ⟵ مرآةٌ أكبر (٣٠ × ٤٠ سم على الأقلّ).",
    ], [
      "Looking at the affected hand behind the mirror → look only into the mirror.",
      "Many fast movements → slow, clear movements the patient can follow.",
      "A small mirror that does not hide the affected hand → a larger mirror (at least 30 × 40 cm).",
    ]],
    easier: ["حركاتٌ أقلّ وفتراتٌ أقصر.", "Fewer movements and shorter spells."],
    harder: ["مهامُّ بأغراض، أو مع حركة اليد المصابة الحقيقية.", "Tasks with objects, or combined with real movement of the affected hand."],
    stopIf: ["دوخةٌ أو صداعٌ أو ارتباكٌ أثناء النظر إلى المرآة.", "Dizziness, headache or confusion while looking into the mirror."],
    equipment: ["مرآةٌ قائمة (أو صندوقُ مرآة)، وطاولة.", "An upright mirror (or mirror box) and a table."],
    doseNote: ["نحو ٣٠ دقيقة، خمسَ مرّاتٍ في الأسبوع على الأقلّ لأربعة أسابيع — بإشرافٍ أوّلاً ثمّ في البيت.", "About 30 minutes, at least five times a week for four weeks — supervised at first, then at home."],
    images: [{ key: "mirror-therapy-1", ar: "جالسٌ أمام مرآةٍ قائمة على الطاولة، يدٌ أمامها والأخرى خلفها", en: "Sitting at a table with an upright mirror, one hand in front of it and the other behind", search: "mirror therapy stroke hand" }],
  },
  {
    code: "calf-stretch-standing", nameAr: "تمطيط عضلة الساق واقفاً", nameEn: "Standing calf stretch",
    kind: "stretch", region: "ankle_foot", sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يُبقي الكاحلَ قادراً على الانثناء إلى الأعلى رغم تشنّج عضلة الساق — فيلمس الكعبُ الأرضَ وتستوي القدمُ في الوقوف والمشي؛ ويُعطى مع الدعامة والوقوف لا بدلهما.",
      "Keeps the ankle able to bend upwards despite calf spasticity — so the heel reaches the floor and the foot is flat in standing and walking; given alongside the brace and standing, not instead of them."],
    start: ["واقفٌ مواجهاً الحائط واليدان عليه، والساقُ المصابة خلف الأخرى بخطوة، والكعبان على الأرض، والقدمان إلى الأمام.",
      "Standing facing a wall with the hands on it, the affected leg a step behind the other, both heels down and the feet pointing forwards."],
    steps: [[
      "اثنِ الركبةَ الأمامية ببطءٍ ومِل بالحوض إلى الأمام.",
      "أبقِ الركبةَ الخلفية مستقيمةً والكعبَ على الأرض حتى تشعر بشدٍّ في بطن الساق.",
      "اثبت ٣٠ ثانية وتنفّس.",
      "عُد، ثمّ كرّر ٣ مرّات.",
    ], [
      "Slowly bend the front knee and move the pelvis forwards.",
      "Keep the back knee straight and the heel down until you feel a stretch in the calf.",
      "Hold for 30 seconds and breathe.",
      "Return, then repeat 3 times.",
    ]],
    cues: [[
      "ارتفاعُ الكعب الخلفيّ ⟵ خطوةٌ أقصر والكعبُ ثابت.",
      "القدمُ الخلفية تدور إلى الخارج ⟵ أصابعُها إلى الأمام.",
      "ارتدادٌ سريع ⟵ شدٌّ ثابتٌ متواصل.",
    ], [
      "The back heel lifting → a shorter step, heel down.",
      "The back foot turning out → toes forwards.",
      "Bouncing → a steady, sustained stretch.",
    ]],
    easier: ["جالساً ومنشفةٌ حول مقدّمة القدم تُسحب باليد، أو بمساعدة المعالج.", "Seated with a towel around the forefoot pulled by hand, or with the therapist's help."],
    harder: ["ثباتٌ أطول (٦٠ ثانية)، أو الوقوفُ على لوحٍ مائل.", "A longer hold (60 seconds), or standing on a tilt board."],
    stopIf: ["ألمٌ حادّ في الكاحل أو بطن الساق، أو دوخة.", "Sharp ankle or calf pain, or dizziness."],
    equipment: ["حائط، ومنشفة.", "A wall and a towel."],
    doseNote: ["يومياً، مرّتين.", "Daily, twice."],
    images: [{ key: "calf-stretch-standing-1", ar: "واقفٌ مستندٌ إلى الحائط، الساقُ الخلفية ممدودةٌ والكعبُ على الأرض", en: "Standing against a wall, the back leg straight with the heel down", search: "standing calf stretch wall" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "forced-use-mitt", nameAr: "استعمال اليد المصابة وتقييد السليمة بقفّاز (العلاج القسريّ المعدّل)", nameEn: "Modified constraint-induced movement therapy (mitt on the good hand)",
    kind: "functional", region: "wrist_hand",
    purpose: ["يكسر عادةَ «عدم الاستعمال المتعلَّم» — حين يعتمد المريضُ على اليد السليمة فتضعف المصابةُ أكثر — بتقييد السليمة ساعاتٍ وتمرين المصابة على مهامّ يومية؛ لمن يبسط الرسغَ ٢٠° والأصابعَ ١٠° على الأقلّ.",
      "Breaks 'learned non-use' — relying on the good hand so the affected one weakens further — by restricting the good hand for hours while the affected hand practises daily tasks; for those with at least 20° of active wrist and 10° of finger extension."],
    start: ["جالسٌ أمام طاولةٍ وقفّازٌ قماشيٌّ مبطَّن (بلا أصابع منفصلة) على اليد السليمة، وأمامه مهامّ يومية: كوب، ملعقة، مناديل، قلم.",
      "Sitting at a table with a padded fabric mitt (no separate fingers) on the good hand, and daily tasks in front: a cup, a spoon, tissues, a pen."],
    steps: [[
      "اختر مع المعالج مهامّ يستطيع المريضُ أن يبدأها باليد المصابة (الشرب، الأكل، الكتابة).",
      "أدِّ كلَّ مهمّةٍ مرّاتٍ كثيرة، وتصعب قليلاً كلّما نجحت (التشكيل Shaping).",
      "البس القفّازَ في البيت ساعاتٍ متّصلة في النهار — في الأنشطة الآمنة وحدها.",
      "سجّل في دفترٍ ما فعلته باليد المصابة كلَّ يوم.",
    ], [
      "With the therapist, choose tasks the patient can start with the affected hand (drinking, eating, writing).",
      "Repeat each task many times, making it slightly harder each time it succeeds (shaping).",
      "Wear the mitt at home for continuous hours during the day — for safe activities only.",
      "Keep a daily log of what you did with the affected hand.",
    ]],
    cues: [[
      "القفّازُ أثناء المشي أو على الدرج ⟵ يُخلع لكلّ ما يحتاج التوازنَ أو الأمان.",
      "مهامُّ صعبةٌ جداً تُحبط المريض ⟵ ابدأ بما ينجح فيه.",
      "اليدُ السليمة تساعد خلسةً ⟵ القفّازُ يمنعها، والمرافقُ يذكّر.",
    ], [
      "Wearing the mitt while walking or on stairs → take it off for anything that needs balance or safety.",
      "Tasks so hard they discourage the patient → start with what succeeds.",
      "The good hand secretly helping → the mitt prevents it, and the carer reminds.",
    ]],
    easier: ["ساعاتٌ أقلّ ومهامّ أبسط.", "Fewer hours and simpler tasks."],
    harder: ["ساعاتٌ أطول ومهامّ أدقّ (الأزرار، الكتابة، استعمالُ الهاتف).", "Longer hours and finer tasks (buttons, writing, using a phone)."],
    stopIf: ["ألمٌ في الكتف أو اليد المصابة، أو إحباطٌ شديد، أو أيُّ خطرِ سقوط.", "Pain in the affected shoulder or hand, marked frustration, or any fall risk."],
    equipment: ["قفّازٌ مبطَّن، وأغراضٌ منزلية، ودفترُ تسجيل.", "A padded mitt, household objects, and a log book."],
    doseNote: ["تدريبٌ مركَّز في الجلسة، والقفّازُ في البيت بحسب خطّة المعالج (ساعاتٌ يومياً).", "Focused practice in the session, and the mitt at home per the therapist's plan (hours a day)."],
    images: [{ key: "forced-use-mitt-1", ar: "قفّازٌ على اليد السليمة، والمريضُ يأكل أو يشرب باليد المصابة", en: "A mitt on the good hand while the patient eats or drinks with the affected hand", search: "constraint induced movement therapy mitt stroke" }],
  },
  {
    code: "obstacle-dual-task-walking", nameAr: "المشي بين العوائق ومع مهمّةٍ ثانية", nameEn: "Obstacle and dual-task walking",
    kind: "balance", region: "whole_body",
    purpose: ["المشيُ في الشارع والسوق ليس مشياً في ممرٍّ فارغ: يحتاج تخطّي العوائق والاستدارةَ والكلامَ والنظرَ حوله في الوقت نفسِه — وتدريبُه يقلّل السقوطَ ويعيد المريضَ إلى المجتمع.",
      "Walking in the street and the market is not walking in an empty corridor: it needs stepping over obstacles, turning, talking and looking around at the same time — training it reduces falls and returns the patient to the community."],
    start: ["واقفٌ في ممرٍّ فيه عوائقُ منخفضة (أحذية، علبٌ صغيرة، مخاريط)، والأداةُ المناسبة إن احتاج، والمعالجُ بجانبه.",
      "Standing in a corridor with low obstacles (shoes, small boxes, cones), the right aid if needed, and the therapist alongside."],
    steps: [[
      "امشِ بين العوائق وتخطَّها بالقدمين بالتناوب.",
      "استدر حول علامةٍ وعُد.",
      "أضف مهمّةً ثانية: العدَّ إلى الخلف، أو تسميةَ أشياء، أو حملَ كوبٍ فيه ماء.",
      "كرّر ٣–٥ مرّات، والصعوبةُ تزيد كلّما ثبت المشي.",
    ], [
      "Walk between the obstacles and step over them with alternate feet.",
      "Turn around a marker and come back.",
      "Add a second task: counting backwards, naming things, or carrying a cup of water.",
      "Repeat 3–5 times, increasing the difficulty as walking becomes steady.",
    ]],
    cues: [[
      "التوقّفُ عن المشي للكلام ⟵ المشيُ يستمرّ؛ وإن توقّف دائماً فالمهمّةُ أسهل.",
      "جرُّ القدم المصابة فوق العائق ⟵ ارفع الركبةَ أعلى.",
      "النظرُ إلى الأرض طوال الوقت ⟵ النظرُ إلى الأمام والعوائقُ بطرف العين.",
    ], [
      "Stopping walking to talk → keep walking; if it always stops, make the task easier.",
      "Dragging the affected foot over the obstacle → lift the knee higher.",
      "Looking at the floor all the time → look ahead, seeing the obstacles from the corner of the eye.",
    ]],
    easier: ["عوائقُ أقلّ وأخفض، وبلا مهمّةٍ ثانية.", "Fewer, lower obstacles and no second task."],
    harder: ["عوائقُ أعلى، ومنحدرٌ ودرج، وأرضٌ غيرُ مستوية، ومشيٌ خارج المركز.", "Higher obstacles, slopes and stairs, uneven ground, and walking outside the centre."],
    stopIf: ["تعثّرٌ متكرّر، أو دوخة، أو ألمٌ في الصدر.", "Repeated tripping, dizziness, or chest pain."],
    equipment: ["عوائقُ منخفضة (أحذية، علب، مخاريط)، وكوب.", "Low obstacles (shoes, boxes, cones) and a cup."],
    doseNote: ["في كلّ جلسةٍ في المرحلة الأخيرة.", "Every session in the final phase."],
    images: [{ key: "obstacle-dual-task-walking-1", ar: "مريضٌ يتخطّى عوائقَ منخفضة في ممرّ والمعالجُ بجانبه", en: "A patient stepping over low obstacles in a corridor with the therapist alongside", search: "stroke obstacle walking training" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "stroke-subacute-adult",
  summary: [
    "الجلطةُ الدماغية في المرحلة تحت الحادّة (Subacute stroke) — من الخروج من المستشفى حتى ستّة أشهر — عند البالغين بضعفٍ في جهةٍ واحدة (Hemiparesis): ضعفٌ وتشنّجٌ وفقدُ توازنٍ وصعوبةٌ في المشي واستعمال اليد والأنشطة اليومية. " +
    "هذه الأشهرُ نافذةُ التعافي الأكبر: الدماغُ يعيد تنظيمَ نفسه بالممارسة، والتحسّنُ يتبع كمّيةَ التدريب الموجَّه بالمهمّة وتكرارَه — فالأساسُ تمرينُ المهامّ الحقيقية نفسِها (الجلوس، القيام، المشي، الوصول والإمساك) مرّاتٍ كثيرةً وبصعوبةٍ تزيد، لا طريقةٌ علاجيةٌ بعينها (Pollock 2014). " +
    "ومعه تدريبُ المرافق، والبرنامجُ المنزليّ اليوميّ لزيادة الكمّية، والدعامةُ أو التحفيزُ لهبوط القدم، وحمايةُ الكتف المصاب، والوقايةُ من السقوط؛ والأجهزةُ مساعدةٌ للتمرين لا بديلٌ عنه. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة؛ وما بعد ستّة أشهر بروتوكولُ المرحلة المزمنة، والأيّامُ الأولى في المستشفى خارجَ هذا البروتوكول.",
    "Stroke in the subacute phase — from hospital discharge to six months — in adults with one-sided weakness (hemiparesis): weakness, spasticity, loss of balance and difficulty walking, using the hand and managing daily activities. " +
    "These months are the main window of recovery: the brain reorganises with practice, and improvement follows the amount and repetition of task-oriented training — so the core is practising the real tasks themselves (sitting, standing up, walking, reaching and grasping) many times with increasing difficulty, not any one named treatment approach (Pollock 2014). " +
    "Alongside it come carer training, a daily home programme to increase the amount of practice, a brace or stimulation for drop foot, protection of the affected shoulder and falls prevention; devices support exercise, they do not replace it. " +
    "The programme runs in three phases with session ranges and written progression criteria; beyond six months the chronic-phase protocol applies, and the first days in hospital are outside this protocol.",
  ],
  goals: [
    "١. الاستقلالُ في الأنشطة اليومية: تحسّنُ مؤشّر بارثيل (Barthel) ١٠ نقاطٍ على الأقلّ من ١٠٠ (الفرقُ المهمّ نحو ٩ — Hsieh 2007).\n" +
    "٢. المشي: مستوى أعلى في تصنيف المشي الوظيفيّ (FAC) — والهدفُ ٤ فأكثر (مستقلٌّ على الأرض المستوية) — وزيادةُ سرعة المشي ١٠ أمتار ٠٫١٦ م/ث على الأقلّ (Tilson 2010) أو الانتقالُ إلى فئةٍ أعلى: أقلُّ من ٠٫٤ م/ث مشيٌ في البيت، و٠٫٤–٠٫٨ مجتمعٌ محدود، وأكثرُ من ٠٫٨ مشيٌ في المجتمع (Schmid 2007).\n" +
    "٣. التوازن: تحسّنُ مقياس بيرغ (Berg) ٥ نقاطٍ على الأقلّ (أكبرُ من خطأ القياس — Hiengkaew 2012)، وانتقالاتٌ آمنة بلا سقوط.\n" +
    "٤. الذراع: تحسّنُ فوغل-ماير للطرف العلويّ (FMA-UE) ٩–١٠ نقاط في المرحلة تحت الحادّة (Arya 2011)، أو استعمالُ اليد المصابة في مهمّتين أو ثلاثٍ يومية يختارها المريض.\n" +
    "٥. لا ألمَ في الكتف المصاب، ولا زيادةَ في التشنّج (أشوورث المعدّل MAS)، ولا تقلّصاتٍ تمنع الوقوفَ والمشي.\n" +
    "٦. المريضُ ومرافقُه مستقلّان ببرنامجٍ منزليٍّ يوميّ، ونقلٍ آمن، وأداةِ مشيٍ ودعامةٍ عند الحاجة، وخطّةٍ للوقاية من السقوط قبل التخرّج.",
    "1. Independence in daily activities: Barthel Index improved by at least 10 of 100 points (the important difference is about 9 — Hsieh 2007).\n" +
    "2. Walking: a higher Functional Ambulation Category (FAC) — aiming for 4 or more (independent on level ground) — and 10-metre walking speed increased by at least 0.16 m/s (Tilson 2010) or a move into a higher band: under 0.4 m/s household walking, 0.4–0.8 limited community, over 0.8 community walking (Schmid 2007).\n" +
    "3. Balance: Berg Balance Scale improved by at least 5 points (beyond measurement error — Hiengkaew 2012), with safe transfers and no falls.\n" +
    "4. Arm: Fugl-Meyer upper extremity (FMA-UE) improved by 9–10 points in the subacute phase (Arya 2011), or use of the affected hand in two or three daily tasks the patient chooses.\n" +
    "5. No pain in the affected shoulder, no increase in spasticity (Modified Ashworth Scale, MAS), and no contractures preventing standing and walking.\n" +
    "6. Patient and carer independent with a daily home programme, safe transfers, a walking aid and brace when needed, and a falls-prevention plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين):\n" +
    "• فرزُ علامات الخطر واستقرارُ الحالة الطبية — انظر «موانع الاستعمال»؛ وضغطُ الدم والنبض والسكّر قبل الجلسة الأولى.\n" +
    "• القصّة: نوعُ الجلطة (انسداديةٌ أم نزفية) وتاريخُها وجهتُها، والأمراضُ (الضغط، السكّري، القلب، الرجفان الأذينيّ)، والأدوية (مضادّاتُ التخثّر والصفائح — للكدمات والإبر)، والسقوطُ منذ الجلطة، والبلع، والبيتُ (الدرج، المرحاض) والمرافق.\n" +
    "• ما يغيّر طريقةَ التدريب: الإدراكُ والذاكرة، والكلامُ والفهم (الحُبسة Aphasia — تعليماتٌ قصيرة ومرئية)، وإهمالُ جهةٍ واحدة (Neglect)، والإحساس، والبصر، والمزاجُ والاكتئاب، والتعب.\n" +
    "• المقاييس: مؤشّرُ بارثيل للأنشطة اليومية (Barthel)، وتصنيفُ المشي الوظيفيّ (FAC من ٠ لا يمشي إلى ٥ مستقلٌّ في كلّ مكانٍ وعلى الدرج — Mehrholz 2007)، وسرعةُ المشي ١٠ أمتار (10MWT) بالسرعة المريحة، والمشيُ ٦ دقائق (6MWT) لمن يمشي، وتوازنُ بيرغ (Berg)، وفوغل-ماير للطرف العلويّ (FMA-UE)، والتشنّجُ بأشوورث المعدّل (MAS) للعضلات الرئيسية.\n" +
    "• الفحص: القوّةُ والتحكّمُ الإراديّ في الطرفين المصابين، ومدى الحركة المنفعل (الكاحل، الكتف، الرسغ والأصابع) والتقلّصات، والجلوسُ والقيامُ والنقلُ والمشيُ ونمطُه (هبوطُ القدم، قفلُ الركبة إلى الخلف، دورانُ الساق)، والكتفُ المصاب: الألمُ والتدلّي (عرضُ إصبعٍ أو أكثر بين الأخرم ورأس العضد)، واليدُ: التورّمُ وبسطُ الرسغ والأصابع (شرطُ العلاج القسريّ: ٢٠° في الرسغ و١٠° في الأصابع — NICE 2023).\n" +
    "• التنبّؤ: مَن كان FAC عنده ٤ فأكثر بعد أربعة أسابيع يمشي غالباً في المجتمع بعد ستّة أشهر (Mehrholz 2007)؛ ومَن بقي بلا بسطٍ في الأصابع ولا رفعٍ للكتف فرصةُ يده أقلّ — فيُركَّز معه على الاستعمال المساعد وحماية الكتف.\n" +
    "إعادةُ التقييم: ضغطُ الدم وسؤالٌ قصير في كلّ جلسة، وسرعةُ المشي وFAC كلَّ أسبوعين، والمقاييسُ كاملةً عند الجلسة الرابعة والعشرين تقريباً وعند الجلسة الأخيرة وفي زيارة المتابعة بعد أربعة أسابيع. ومَن لا يزال يتحسّن عند نهاية البرنامج وهو ضمن الأشهر الستّة يُعاد له برنامجٌ جديد؛ ومَن توقّف تحسّنُه يُراجَع (الجرعة، المزاج، الألم، التشنّج — الطبيبُ لحقن البوتوكس، الدعامة). وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.",
    "Initial assessment (before any exercise):\n" +
    "• Red-flag screen and medical stability — see Contraindications; blood pressure, pulse and blood glucose before the first session.\n" +
    "• History: stroke type (ischaemic or haemorrhagic), date and side, conditions (hypertension, diabetes, heart disease, atrial fibrillation), medicines (anticoagulants and antiplatelets — relevant to bruising and needling), falls since the stroke, swallowing, and the home (stairs, toilet) and carer.\n" +
    "• What changes how training is delivered: cognition and memory, speech and comprehension (aphasia — short, visual instructions), one-sided neglect, sensation, vision, mood and depression, and fatigue.\n" +
    "• Measures: Barthel Index for daily activities, Functional Ambulation Category (FAC, from 0 cannot walk to 5 independent everywhere including stairs — Mehrholz 2007), 10-metre walk test (10MWT) at comfortable speed, 6-minute walk test (6MWT) for those who walk, Berg Balance Scale, Fugl-Meyer upper extremity (FMA-UE), and spasticity by the Modified Ashworth Scale (MAS) for key muscles.\n" +
    "• Examination: strength and voluntary control in the affected limbs, passive range (ankle, shoulder, wrist and fingers) and contractures, sitting, standing up, transfers and walking pattern (drop foot, knee snapping back, leg circumduction), the affected shoulder — pain and subluxation (a finger's breadth or more between acromion and humeral head), and the hand — swelling and active wrist and finger extension (required for constraint-induced therapy: 20° at the wrist and 10° at the fingers — NICE 2023).\n" +
    "• Prognosis: patients with FAC 4 or more at four weeks usually walk in the community at six months (Mehrholz 2007); those still without finger extension or shoulder abduction have a poorer outlook for the hand — so focus with them on assisted use and shoulder protection.\n" +
    "Reassessment: blood pressure and brief questions every session, gait speed and FAC every two weeks, and the full measures at about session 24, at the last session and at the follow-up visit four weeks later. Patients still improving at the end of the programme and within six months of the stroke start a new programme; when progress stalls, review the dose, mood, pain and spasticity (the doctor for botulinum toxin, the brace). Phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — الجلوس والنقل والوقوف (الجلسات ١–١٢): الوصولُ جالساً، والتدحرجُ والجلوس، والانتقالُ من السرير إلى الكرسيّ، والجلوسُ والقيام من مقعدٍ عالٍ، والجسر، ورفعُ مقدّمة القدم جالساً، والاستنادُ على اليد المصابة، وزلقُ الذراع على الطاولة، ونقلُ الوزن واقفاً، والمشيُ بالمساعدة (والجهازُ الروبوتيّ لغير القادر).\n" +
    "المرحلة ٢ — المشي والتوازن واستعمال الذراع في المهامّ (الجلسات ١٣–٣٠): المشيُ على الأرض بأداةٍ تقلّ مساعدتُها، والمشيُ جانباً، وصعودُ الدرجة، والجلوسُ والقيامُ بلا يدين، والدرّاجةُ الثابتة، والوصولُ والإمساك، والعلاجُ بالمرآة، وتمطيطُ عضلة الساق.\n" +
    "المرحلة ٣ — المشيُ في المجتمع واللياقة واستعمالُ اليد اليوميّ (الجلسات ٣١–٤٨): المشيُ بين العوائق ومع مهمّةٍ ثانية، والدرج، ورفعُ الكعبين، والقيامُ بثقل، والدرّاجةُ ٢٠–٣٠ دقيقة، والعلاجُ القسريّ المعدّل لمن يستطيع، والمهامُّ اليدويةُ اليومية.\n" +
    "البرنامجُ: ٤٨ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه. " +
    "والجرعةُ هنا تتبع الدليل: بعد الجلطة الأكثرُ أفضل (Lohse 2014 · Veerbeek 2014)، وخمسون دقيقةً ستّةَ أيّامٍ في الأسبوع داخلَ ما وجدته مراجعةُ كوكرين فعّالاً (٣٠–٦٠ دقيقة يومياً، ٥–٧ أيّام — Pollock 2014)، لكنّها أقلُّ من ثلاث ساعاتٍ يومياً توصي بها NICE 2023 للعلاجات كلّها معاً — فالبرنامجُ المنزليّ اليوميّ مع المرافق ليس إضافةً بل نصفُ العلاج: ساعةٌ أو أكثر من تكرار المهامّ في البيت، وقد عادل برنامجٌ منزليٌّ يديره المعالج المشيَ على السير بدعم الوزن (LEAPS 2011). " +
    "وفي كلّ جلسة: أكثرُ ما يمكن من التكرارات للمهامّ نفسِها (الجلوس والقيام، الخطوات، الوصول والإمساك) بصعوبةٍ تزيد (French 2016)، والأجهزةُ قبل التمرين أو معه لا بدله. " +
    "وبعد الجلسة الأخيرة: البرنامجُ المنزليّ يومياً، ومراجعةٌ بعد أربعة أسابيع، وبرنامجٌ جديد إن استمرّ التحسّن ضمن الأشهر الستّة. " + SAFETY_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Sitting, transfers and standing (sessions 1–12): seated reaching, rolling and sitting up, bed-to-chair transfers, sit-to-stand from a high seat, bridging, seated ankle dorsiflexion, weight-bearing through the affected arm, table-top towel slides, standing weight shifts, and assisted walking (the robotic trainer for those who cannot walk).\n" +
    "Phase 2 — Walking, balance and task use of the arm (sessions 13–30): overground walking with an aid giving less and less help, side-stepping, step-ups, sit-to-stand without the hands, stationary cycling, reach-to-grasp practice, mirror therapy, and calf stretching.\n" +
    "Phase 3 — Community walking, fitness and daily use of the hand (sessions 31–48): obstacle and dual-task walking, stairs, calf raises, weighted sit-to-stand, cycling for 20–30 minutes, modified constraint-induced therapy for those eligible, and daily hand tasks.\n" +
    "Programme: 48 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient. " +
    "The dose follows the evidence: after stroke, more is better (Lohse 2014 · Veerbeek 2014), and fifty minutes six days a week is within what a Cochrane review found effective (30–60 minutes a day, 5–7 days a week — Pollock 2014), but below the three hours a day NICE 2023 recommends across all therapies — so the daily home programme with the carer is not an extra but half the treatment: an hour or more of task practice at home; a therapist-managed home programme did as well as body-weight-supported treadmill training (LEAPS 2011). " +
    "Each session: as many repetitions as possible of the tasks themselves (sit-to-stand, stepping, reaching and grasping) with increasing difficulty (French 2016), with devices before or alongside exercise, never instead of it. " +
    "After the last session: the daily home programme, a review after four weeks, and a new programme if improvement continues within six months. " + SAFETY_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ تُوقف الجلسة ويُحال المريضُ فوراً:\n" +
    "• علاماتُ جلطةٍ جديدة — طوارئ فوراً: ميلٌ في الوجه، أو ضعفٌ جديد في الذراع أو الساق، أو اضطرابٌ جديد في الكلام، أو فقدُ توازنٍ أو بصرٍ مفاجئ، أو صداعٌ مفاجئٌ شديد («أسوأُ صداعٍ في حياتي» — اشتباهُ نزف).\n" +
    "• ألمٌ في الصدر، أو خفقانٌ غير منتظم جديد، أو ضيقُ نفسٍ شديد، أو إغماء.\n" +
    "• ساقٌ متورّمةٌ مؤلمةٌ دافئة — اشتباهُ خثرةٍ في الأوردة العميقة (DVT): إحالةٌ عاجلة ولا تمرين.\n" +
    "• سقوطٌ مع ضربةٍ على الرأس عند مَن يأخذ مضادّاتِ التخثّر — طوارئ حتى مع غياب الأعراض.\n" +
    "• نوبةُ صرع، أو هبوطُ سكّر (تعرّق، رجفة، ارتباك) — يُعالَج ويُوقف التمرين ويراه الطبيب.\n" +
    "• ضغطُ دمٍ مرتفعٌ جداً قبل الجلسة أو منخفضٌ مع دوخة — لا تمرينَ حتى يراه الطبيب (حدودُ الطبيب لكلّ مريض).\n" +
    "• يدٌ متورّمةٌ حارّةٌ مؤلمة في الجهة المصابة مع ألمٍ في الكتف — اشتباهُ متلازمة الكتف واليد (الألمُ الناحيّ المركّب CRPS): الطبيبُ قريباً.\n" +
    "• سعالٌ أو اختناقٌ مع الأكل والشرب، أو حرارةٌ مع سعال — اشتباهُ اضطراب البلع والتهاب الرئة: الطبيب.\n" +
    "• حزنٌ شديد أو أفكارٌ بإيذاء النفس — الطبيبُ في اليوم نفسِه.",
    "Red flags that stop the session and require immediate referral:\n" +
    "• Signs of a new stroke — emergency: facial droop, new arm or leg weakness, new speech disturbance, sudden loss of balance or vision, or a sudden severe headache ('the worst headache of my life' — suspected bleed).\n" +
    "• Chest pain, a new irregular heartbeat, marked breathlessness, or fainting.\n" +
    "• A swollen, painful, warm leg — suspected deep vein thrombosis (DVT): urgent referral and no exercise.\n" +
    "• A fall with a blow to the head in someone taking anticoagulants — emergency even without symptoms.\n" +
    "• A seizure, or low blood sugar (sweating, shaking, confusion) — treat it, stop exercise and refer to the doctor.\n" +
    "• Very high blood pressure before the session, or low blood pressure with dizziness — no exercise until the doctor has reviewed (the doctor sets the limits for each patient).\n" +
    "• A swollen, hot, painful hand on the affected side with shoulder pain — suspected shoulder-hand syndrome (complex regional pain syndrome, CRPS): the doctor soon.\n" +
    "• Coughing or choking with eating and drinking, or fever with a cough — suspected swallowing problem and chest infection: the doctor.\n" +
    "• Severe low mood or thoughts of self-harm — the doctor the same day.",
  ],
  precautions: [
    "• " + SAFETY_AR + "\n" +
    "• الكتفُ المصاب: لا يُشدّ المريضُ من ذراعه المصابة أبداً، ولا بكراتٍ فوق الرأس (AHA 2016)، ولا حركةً منفعلةً فوق ٩٠° ما لم يدُر لوحُ الكتف معها، والذراعُ مسنودةٌ على وسادةٍ أو طاولة في الجلوس؛ وحمّالةُ الذراع للمشي والنقل في الطور الرخو عند التدلّي، لا طوال اليوم؛ ولألم الكتف: الشريطُ اللاصق أو التحفيزُ (NICE 2023)، والبوتوكسُ للتشنّج الشديد (الطبيب).\n" +
    "• السقوط: حزامُ نقلٍ والمعالجُ بجانب الجهة المصابة، والتوازنُ بجانب سطحٍ ثابت، وأداةُ المشي المناسبة؛ ويُراجَع البيت (السجّاد، الإضاءة، مقابضُ المرحاض والحمّام).\n" +
    "• هبوطُ القدم: دعامةُ الكاحل والقدم (AFO) يصنعها قسمُ المساند في المركز ويقيسها، أو التحفيزُ الكهربائيّ الوظيفيّ — والاثنان متقاربان في أثرهما على سرعة المشي (Prenton 2016 · 2018).\n" +
    "• التشنّج: الحركةُ والوقوفُ والوضعيةُ الصحيحة يومياً، والتمطيطُ وحده أثرُه على التقلّصات قليل (Harvey 2017)؛ والتشنّجُ الذي يمنع الوظيفة أو يؤلم يُحال إلى الطبيب (حقنُ البوتوكس مع التمرين).\n" +
    "• الإحساسُ المفقود وإهمالُ الجهة: لا حرارةَ على جلدٍ لا يحسّ، وفحصُ القدم واليد المصابة يومياً، والتعليماتُ والأغراضُ في الجهة المهمَلة تدريجياً.\n" +
    "• مضادّاتُ التخثّر: الكدماتُ أسهل، والإبرُ الجافة بحذرٍ شديد أو لا (قرارُ الطبيب والمرخَّص)؛ والسكّري: وجبةٌ خفيفة قبل الجلسة.\n" +
    "• الحُبسةُ والإدراك: جملٌ قصيرة، وإشارةٌ وعرضٌ بالفعل، وتمرينٌ واحدٌ في كلّ مرّة، والمرافقُ حاضرٌ ليتعلّم.\n" +
    "• التعبُ والمزاج: جلساتٌ قصيرةٌ متكرّرة أفضلُ من طويلةٍ مرهقة، والاكتئابُ شائعٌ بعد الجلطة ويُبلَّغ به الطبيب.",
    "• " + SAFETY_EN + "\n" +
    "• The affected shoulder: never pull the patient by the affected arm, no overhead pulleys (AHA 2016), no passive movement above 90° unless the shoulder blade rotates with it, and support the arm on a pillow or table in sitting; an arm sling for walking and transfers in the flaccid stage when the shoulder is subluxed, not all day; for shoulder pain, taping or electrical stimulation (NICE 2023), and botulinum toxin for severe spasticity (the doctor).\n" +
    "• Falls: a transfer belt with the therapist on the affected side, balance work beside a stable surface, and the right walking aid; review the home (rugs, lighting, toilet and bathroom rails).\n" +
    "• Drop foot: an ankle-foot orthosis (AFO) made and measured by the centre's orthotics department, or functional electrical stimulation — the two have similar effects on walking speed (Prenton 2016 · 2018).\n" +
    "• Spasticity: daily movement, standing and correct positioning; stretching alone has little effect on contractures (Harvey 2017); spasticity that limits function or causes pain is referred to the doctor (botulinum toxin with exercise).\n" +
    "• Sensory loss and neglect: no heat on skin without sensation, check the affected foot and hand daily, and gradually bring instructions and objects into the neglected side.\n" +
    "• Anticoagulants: bruising is easier, and dry needling only with great caution or not at all (the doctor's and the certified practitioner's decision); diabetes: a light snack before the session.\n" +
    "• Aphasia and cognition: short sentences, gesture and demonstration, one exercise at a time, with the carer present to learn.\n" +
    "• Fatigue and mood: short, frequent sessions are better than long, exhausting ones, and depression is common after stroke and is reported to the doctor.",
  ],
  totalSessions: 48, spw: 6, weeks: 8, minutes: 50,
  refs: [
    { title: "Stroke rehabilitation in adults (NG236)", org: "NICE", year: 2023, url: "https://www.nice.org.uk/guidance/ng236" },
    { title: "Guidelines for Adult Stroke Rehabilitation and Recovery: A Guideline for Healthcare Professionals From the American Heart Association/American Stroke Association", org: "Stroke — AHA/ASA (Winstein et al.)", year: 2016, url: "https://doi.org/10.1161/STR.0000000000000098" },
    { title: "Physical rehabilitation approaches for the recovery of function and mobility following stroke", org: "Cochrane Database of Systematic Reviews (Pollock et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.CD001920.pub3" },
    { title: "What is the evidence for physical therapy poststroke? A systematic review and meta-analysis", org: "PLoS One (Veerbeek et al.)", year: 2014, url: "https://doi.org/10.1371/journal.pone.0087987" },
    { title: "Is more better? Using metadata to explore dose-response relationships in stroke rehabilitation", org: "Stroke (Lohse, Lang, Boyd)", year: 2014, url: "https://doi.org/10.1161/STROKEAHA.114.004695" },
    { title: "Repetitive task training for improving functional ability after stroke", org: "Cochrane Database of Systematic Reviews (French et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.CD006073.pub3" },
    { title: "Body-weight-supported treadmill rehabilitation after stroke (LEAPS)", org: "New England Journal of Medicine (Duncan et al.)", year: 2011, url: "https://doi.org/10.1056/NEJMoa1010790" },
    { title: "Electromechanical-assisted training for walking after stroke", org: "Cochrane Database of Systematic Reviews (Mehrholz et al.)", year: 2020, url: "https://doi.org/10.1002/14651858.CD006185.pub5" },
    { title: "Treadmill training and body weight support for walking after stroke", org: "Cochrane Database of Systematic Reviews (Mehrholz et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.CD002840.pub4" },
    { title: "Mirror therapy for improving motor function after stroke", org: "Cochrane Database of Systematic Reviews (Thieme et al.)", year: 2018, url: "https://doi.org/10.1002/14651858.CD008449.pub3" },
    { title: "Constraint-induced movement therapy for upper extremities in people with stroke", org: "Cochrane Database of Systematic Reviews (Corbetta et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.CD004433.pub3" },
    { title: "Physical fitness training for stroke patients", org: "Cochrane Database of Systematic Reviews (Saunders et al.)", year: 2020, url: "https://doi.org/10.1002/14651858.CD003316.pub7" },
    { title: "Physical activity and exercise recommendations for stroke survivors: a statement for healthcare professionals from the American Heart Association/American Stroke Association", org: "Stroke — AHA/ASA (Billinger et al.)", year: 2014, url: "https://doi.org/10.1161/STR.0000000000000022" },
    { title: "Stretch for the treatment and prevention of contractures", org: "Cochrane Database of Systematic Reviews (Harvey et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.CD007455.pub3" },
    { title: "Functional electrical stimulation versus ankle foot orthoses for foot-drop: a meta-analysis of orthotic effects", org: "Journal of Rehabilitation Medicine (Prenton et al.)", year: 2016, url: "https://doi.org/10.2340/16501977-2136" },
    { title: "Functional electrical stimulation and ankle foot orthoses provide equivalent therapeutic effects on foot drop: a meta-analysis providing direction for future research", org: "Journal of Rehabilitation Medicine (Prenton et al.)", year: 2018, url: "https://doi.org/10.2340/16501977-2289" },
    { title: "Efficacy of electrical stimulation in preventing or reducing subluxation of the shoulder after stroke: a meta-analysis", org: "Australian Journal of Physiotherapy (Ada, Foongchomcheay)", year: 2002, url: "https://doi.org/10.1016/s0004-9514(14)60165-3" },
    { title: "Effectiveness of functional electrical stimulation in improving clinical outcomes in the upper arm following stroke: a systematic review and meta-analysis", org: "BioMed Research International (Vafadar et al.)", year: 2015, url: "https://doi.org/10.1155/2015/729768" },
    { title: "Positive Effects of Extracorporeal Shock Wave Therapy on Spasticity in Poststroke Patients: A Meta-Analysis", org: "Journal of Stroke and Cerebrovascular Diseases (Guo et al.)", year: 2017, url: "https://doi.org/10.1016/j.jstrokecerebrovasdis.2017.08.019" },
    { title: "The effectiveness of extracorporeal shock wave therapy for improving upper limb spasticity and functionality in stroke patients: a systematic review and meta-analysis", org: "Clinical Rehabilitation (Cabanas-Valdés et al.)", year: 2020, url: "https://doi.org/10.1177/0269215520932196" },
    { title: "Is Dry Needling Effective for the Management of Spasticity, Pain, and Motor Function in Post-Stroke Patients? A Systematic Review and Meta-Analysis", org: "Pain Medicine (Fernández-de-las-Peñas et al.)", year: 2021, url: "https://doi.org/10.1093/pm/pnaa392" },
    { title: "Meaningful gait speed improvement during the first 60 days poststroke: minimal clinically important difference", org: "Physical Therapy (Tilson et al.)", year: 2010, url: "https://doi.org/10.2522/ptj.20090079" },
    { title: "Improvements in speed-based gait classifications are meaningful", org: "Stroke (Schmid et al.)", year: 2007, url: "https://doi.org/10.1161/strokeaha.106.475921" },
    { title: "Establishing the minimal clinically important difference of the Barthel Index in stroke patients", org: "Neurorehabilitation and Neural Repair (Hsieh et al.)", year: 2007, url: "https://doi.org/10.1177/1545968306294729" },
    { title: "Estimating the minimal clinically important difference of an upper extremity recovery measure in subacute stroke patients", org: "Topics in Stroke Rehabilitation (Arya, Verma, Garg)", year: 2011, url: "https://doi.org/10.1310/tsr18s01-599" },
    { title: "Minimal detectable changes of the Berg Balance Scale, Fugl-Meyer Assessment Scale, Timed Up & Go Test, gait speeds, and 2-minute walk test in individuals with chronic stroke with different degrees of ankle plantarflexor tone", org: "Archives of Physical Medicine and Rehabilitation (Hiengkaew et al.)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2012.01.014" },
    { title: "Predictive validity and responsiveness of the functional ambulation category in hemiparetic patients after stroke", org: "Archives of Physical Medicine and Rehabilitation (Mehrholz et al.)", year: 2007, url: "https://doi.org/10.1016/j.apmr.2007.06.764" },
  ],
  //  التمارين أوّلاً ثمّ الأجهزةُ بترتيب الزرع؛ ولا تيكارَ ولا مغناطيسَ ولا شدَّ ولا حرارةَ هنا — لا مكانَ لها في تأهيل الجلطة، ولسليم أن يضيف (§4.dl).
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٤٠–٥٠ دقيقةً في الجلسة من التدريب الموجَّه بالمهمّة بأكبر عددٍ من التكرارات، مع تدريب المرافق، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 40–50 minutes per session of task-oriented training with as many repetitions as possible, with carer training, plus the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — تكرارُ المهامّ للطرفين العلويّ والسفليّ «يُقدَّم» (NICE 2023)، والتدريبُ المكثّف المتكرّر للحركة أقوى توصية (AHA 2016)، والأكثرُ أفضل (Lohse 2014 · Veerbeek 2014).",
        "Core in every session — repetitive task training for the arm and leg is to be offered (NICE 2023), intensive repetitive mobility training carries the strongest recommendation (AHA 2016), and more is better (Lohse 2014 · Veerbeek 2014)."] },
    { code: "robotik", centreUse: "adjunct", evidence: "optional", minutes: 30,
      params: { bwsPct: "30–50 → 0–20", speed: "1.2–2.0 km/h", guidancePct: "100 → 40", durationMin: "20–30" },
      parameters: ["لغير القادر على المشي أو المعتمد على المساعدة (FAC ٠–٢)، وخاصّةً في الأشهر الثلاثة الأولى: دعمُ وزنٍ يبدأ ٣٠–٥٠٪ ويقلّ نحو ٠–٢٠٪، وقوّةُ توجيهٍ تبدأ ١٠٠٪ وتقلّ، وسرعةٌ ١٫٢–٢ كم/س، ٢٠–٣٠ دقيقة — مع تدريب المشي على الأرض لا بدله، ويتوقّف حين يمشي بمساعدة شخصٍ واحد.",
        "For those unable to walk or dependent on help (FAC 0–2), especially in the first three months: body-weight support starting at 30–50% and reduced towards 0–20%, guidance force starting at 100% and reduced, speed 1.2–2.0 km/h, 20–30 minutes — alongside overground walking, not instead of it, and stopped once the patient walks with one person helping."],
      note: ["مساعدٌ بالتناوب (كما في الزرع — لم يذكره سليم). والدليلُ متضارب: كوكرين (Mehrholz 2020) وجدت أنّ التدريبَ الروبوتيّ مع العلاج المعتاد يزيد فرصةَ المشي المستقلّ (واحدٌ من كلّ ثمانية)، وأكثرُ من يستفيد غيرُ القادر على المشي في الأشهر الثلاثة الأولى؛ بينما تقول NICE 2023 «يُقدَّم في إطار البحث فقط»، وAHA 2016 «قد يُنظر فيه». ولا يُعطى للقادر على المشي بديلاً عن المشي على الأرض.",
        "Rotating adjunct (as seeded — not mentioned by Saleem). The evidence conflicts: Cochrane (Mehrholz 2020) found that robotic training with usual therapy increases the chance of independent walking (one in eight), with most benefit for non-walkers in the first three months; NICE 2023 says to offer it only within research, and AHA 2016 that it may be considered. It is never given to someone who can walk instead of overground walking."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 20,
      params: { currentType: "NMES / FES", frequencyHz: "30–50", pulseWidthUs: "200–300", intensity: "Motor (visible contraction)", onOff: "5/5 – 15/15", durationMin: "20–30" },
      parameters: ["ثلاثةُ استعمالات: (١) هبوطُ القدم — تحفيزٌ وظيفيّ (FES) لرافعات القدم أثناء المشي، بديلاً عن الدعامة أو معها؛ (٢) الكتفُ المتدلّي مبكراً — على فوق الشوكة والدالّية الخلفية؛ (٣) الذراعُ التي تنقبض ولا تتحرّك ضدّ المقاومة — مع المحاولة الإرادية في المهمّة. انقباضٌ مرئيّ مريح، قبل التمارين أو أثناءها.",
        "Three uses: (1) drop foot — functional electrical stimulation (FES) of the dorsiflexors during walking, instead of or with a brace; (2) early shoulder subluxation — over supraspinatus and posterior deltoid; (3) an arm that contracts but cannot move against resistance — combined with voluntary effort in a task. A visible, comfortable contraction, before or during exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). والدليلُ يختلف بالاستعمال: لهبوط القدم أثرُه على سرعة المشي يعادل الدعامة (Prenton 2016 · 2018) وتؤيّده NICE؛ وللكتف المتدلّي يقلّل التدلّي إن بدأ مبكراً لا الألم (Ada 2002 · Vafadar 2015)؛ وللذراع «لا يُقدَّم روتينياً» عند NICE 2023 إلّا تجربةً لمن ينقبض ولا يقاوم، ويستمرّ إن تحسّن. ممنوعٌ مع منظّم ضربات القلب، وعلى جلدٍ لا يحسّ أو متضرّر، وعلى مقدّمة الرقبة.",
        "Rotating adjunct — used by the centre (Saleem). The evidence differs by use: for drop foot its effect on walking speed equals a brace (Prenton 2016 · 2018) and NICE supports it; for early shoulder subluxation it reduces the subluxation, not the pain (Ada 2002 · Vafadar 2015); for the arm NICE 2023 says do not offer routinely, except as a trial for those who contract but cannot move against resistance, continued only if improving. Contraindicated with a pacemaker, on insensate or damaged skin, and over the front of the neck."] },
    { code: "shockwaves", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { mode: "Radial", pressureBar: "1.5–2.5", impulses: "1500–2000", frequencyHz: "4–5", sessions: "1 / week × 3" },
      parameters: ["على العضلات المتشنّجة التي تعيق الوظيفة (عضلةُ الساق، قابضاتُ الرسغ والأصابع، قابضاتُ المرفق) عند اتّصال العضلة بالوتر، ثمّ التمرينُ والتمطيطُ مباشرةً.",
        "Over spastic muscles that limit function (calf, wrist and finger flexors, elbow flexors) at the muscle–tendon junction, followed straight away by exercise and stretching."],
      note: ["مساعدٌ بالتناوب (كما في الزرع — لم يذكره سليم). مراجعاتٌ وجدت تخفيفاً للتشنّج (أشوورث) يمتدّ أسابيع (Guo 2017 · Cabanas-Valdés 2020)، لكنّ جودةَ الدراسات منخفضة، ولا توصي به NICE ولا AHA 2016. ولا يُعطى بلا تمرينٍ بعده. ممنوعٌ مع اضطرابات التخثّر (ومضادّاتُ التخثّر قرارُ الطبيب)، وفوق ورمٍ أو التهابٍ أو جلدٍ لا يحسّ، ومع الحمل.",
        "Rotating adjunct (as seeded — not mentioned by Saleem). Reviews found reduced spasticity (Ashworth) lasting weeks (Guo 2017 · Cabanas-Valdés 2020), but study quality is low, and neither NICE nor AHA 2016 recommends it. Never given without exercise afterwards. Contraindicated with bleeding disorders (anticoagulants are the doctor's decision), over a tumour, infection or insensate skin, and in pregnancy."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { needleSize: "0.25–0.30 × 25–50", points: "1–3 muscles", sessions: "1–2 / week" },
      parameters: ["في العضلات المتشنّجة (عضلةُ الساق، قابضاتُ الرسغ والأصابع) بالإدخال والإخراج السريع نحو دقيقةٍ لكلّ عضلة، ثمّ التمرينُ مباشرةً.",
        "Into spastic muscles (calf, wrist and finger flexors) using a fast-in/fast-out technique for about one minute per muscle, followed straight away by exercise."],
      note: ["مساعدٌ بالتناوب، للمرخَّص بالإبر الجافة وحده (كما في الزرع). وجدت مراجعةٌ تخفيفاً قصيرَ المدى للتشنّج في الطرف السفليّ بدليلٍ متوسّط، بلا أثرٍ بعد أربعة أسابيع ولا على الحركة (Fernández-de-las-Peñas 2021)، ولا توصي به NICE ولا AHA. ومضادّاتُ التخثّر والصفائح شائعةٌ بعد الجلطة: قرارُ الطبيب قبل أيّ إبرة، والحذرُ في الجهة التي لا تحسّ.",
        "Rotating adjunct, dry-needling certified staff only (as seeded). A review found short-term reduction of lower-limb spasticity with moderate-certainty evidence, no effect after four weeks and none on movement (Fernández-de-las-Peñas 2021); neither NICE nor AHA recommends it. Anticoagulants and antiplatelets are common after stroke: the doctor decides before any needling, with care on the insensate side."] },
  ],
  phases: [
    {
      name: ["الجلوس والنقل والوقوف", "Sitting, transfers and standing"],
      sessionFrom: 1, sessionTo: 12,
      timeframe: ["نحو الأسبوعين الأوّلين", "About the first two weeks"],
      goals: [
        "جلوسٌ متوازنٌ مستقلّ مع الوصول، ونقلٌ من السرير إلى الكرسيّ بإشرافٍ أو مساعدةٍ خفيفة، وقيامٌ من مقعدٍ عالٍ، ووقوفٌ بإسنادٍ دقيقتين، ومشيٌ بمساعدة شخصٍ أو أداةٍ لمسافةٍ قصيرة، وكتفٌ مصابٌ بلا ألم، ومرافقٌ يتقن النقلَ والبرنامجَ المنزليّ.",
        "Independent, balanced sitting with reaching, bed-to-chair transfers with supervision or light help, standing up from a high seat, standing for two minutes with support, walking a short distance with one person or an aid, a pain-free affected shoulder, and a carer competent in transfers and the home programme.",
      ],
      education: [
        "الرسائلُ الأساسية للمريض والمرافق — بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• الدماغُ يتعافى بالتكرار: كلُّ حركةٍ تُمارَس كثيراً تعود أسرع — والمرافقُ شريكٌ في العلاج لا متفرّج.\n" +
        "• ساعد المريضَ بأقلّ ما يلزم: ما يفعله وحده ولو ببطءٍ يتعلّمه، وما يُفعل عنه لا يتعلّمه.\n" +
        "• الذراعُ المصابة لا تُشدّ أبداً، وتُسند في الجلوس والسرير، ولا تُترك متدلّية.\n" +
        "• الوقايةُ من السقوط: لا وقوفَ ولا مشيَ وحده حتى يقول المعالج، والحذاءُ مغلق، والإنارةُ ليلاً.\n" +
        "• الوضعية: الاستلقاءُ على الجهة المصابة بأمان (الكتفُ إلى الأمام) أو على السليمة ووسادةٌ أمام الصدر للذراع المصابة، والجلوسُ منتصباً على كرسيٍّ لا في السرير.\n" +
        "• ضغطُ الدم والأدوية والإقلاعُ عن التدخين — الوقايةُ من جلطةٍ ثانية جزءٌ من العلاج.\n" +
        "• علاماتُ جلطةٍ جديدة (ميلُ الوجه، ضعفُ الذراع، اضطرابُ الكلام) تعني الطوارئ فوراً.",
        "Key messages for the patient and carer — in plain language, repeated every session:\n" +
        "• The brain recovers through repetition: every movement practised many times returns faster — and the carer is a partner in treatment, not a spectator.\n" +
        "• Help the patient as little as needed: what they do themselves, even slowly, they learn; what is done for them, they do not.\n" +
        "• Never pull the affected arm; support it in sitting and in bed, and never leave it hanging.\n" +
        "• Falls prevention: no standing or walking alone until the therapist says so, closed shoes, and a light at night.\n" +
        "• Positioning: lying safely on the affected side (shoulder brought forward) or on the good side with a pillow in front of the chest for the affected arm, and sitting upright in a chair rather than in bed.\n" +
        "• Blood pressure, medicines and stopping smoking — preventing a second stroke is part of treatment.\n" +
        "• Signs of a new stroke (facial droop, arm weakness, speech disturbance) mean emergency care at once.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين:\n" +
        "• يجلس بلا إسنادٍ ويصل إلى الأمام والجانبين بثبات.\n" +
        "• ينتقل من السرير إلى الكرسيّ بإشرافٍ أو مساعدةٍ خفيفة.\n" +
        "• يقف من مقعدٍ عالٍ ويبقى واقفاً دقيقتين بإسنادٍ خفيف.\n" +
        "• يمشي بمساعدة شخصٍ واحد أو أداة (FAC ٢ فأكثر)، أو يتقدّم على الجهاز الروبوتيّ إن لم يمشِ بعد.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثانية عشرة: يُراجَع الإدراكُ والمزاجُ والتعبُ والألمُ والتشنّج، ويبقى في المرحلة مع تكرارٍ أكثر في البيت.",
        "Progress to phase 2 when:\n" +
        "• Sits without support and reaches forwards and to the sides steadily.\n" +
        "• Transfers from bed to chair with supervision or light help.\n" +
        "• Stands up from a high seat and stays standing for two minutes with light support.\n" +
        "• Walks with one person or an aid (FAC 2 or more), or is progressing on the robotic trainer if not yet walking.\n" +
        "If not achieved by session 12: review cognition, mood, fatigue, pain and spasticity, and stay in this phase with more practice at home.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• التكرارُ هو الجرعة: أكثرُ ما يمكن من محاولات الجلوس والقيام والخطوات في كلّ جلسة، لا تمرينٌ واحدٌ طويل.\n" +
        "• المساعدةُ باليد من الحوض والركبة لا من الذراع المصابة، ودعمُ الركبة إن انثنت أو أُقفلت إلى الخلف.\n" +
        "• لغير القادر على المشي (FAC ٠–١): الجهازُ الروبوتيّ أو المشيُ بين القضيبين بمساعدة شخصين، وتدريبُ الوقوف.\n" +
        "• هبوطُ القدم: يُطلب قياسُ الدعامة من قسم المساند مبكراً، أو التحفيزُ الكهربائيّ لرافعات القدم.\n" +
        "• الكتفُ المتدلّي: التحفيزُ الكهربائيّ على فوق الشوكة والدالّية الخلفية يقلّل التدلّيَ إن بدأ مبكراً (Ada 2002 · Vafadar 2015).\n" +
        "• تدريبُ المرافق في كلّ جلسة على النقل والبرنامج المنزليّ.",
        "Notes for the specialist:\n" +
        "• Repetition is the dose: as many attempts at sitting, standing up and stepping as possible each session, not one long exercise.\n" +
        "• Hands-on help from the pelvis and knee, not the affected arm, and support the knee if it buckles or snaps back.\n" +
        "• For those unable to walk (FAC 0–1): the robotic trainer, or walking between the parallel bars with two people, plus standing practice.\n" +
        "• Drop foot: ask the orthotics department to measure for a brace early, or use electrical stimulation of the ankle dorsiflexors.\n" +
        "• Shoulder subluxation: electrical stimulation of supraspinatus and posterior deltoid reduces subluxation when started early (Ada 2002 · Vafadar 2015).\n" +
        "• Train the carer every session in transfers and the home programme.",
      ],
      exercises: [
        { code: "sitting-reach" },
        { code: "roll-to-sit" },
        { code: "bed-to-chair-transfer" },
        { code: "sit-to-stand", sets: 3, reps: 5, doseNote: ["من مقعدٍ عالٍ واليدان على الفخذين — ٣ × ٥، وأكثرُ في اليوم مع المرافق.", "From a high seat with the hands on the thighs — 3 × 5, and more through the day with the carer."],
          note: ["القدمُ المصابة خلف السليمة قليلاً لتحمل الوزن، والمعالجُ يثبّت الركبةَ المصابة.", "The affected foot slightly behind the good one so it takes weight, with the therapist steadying the affected knee."] },
        { code: "glute-bridge", sets: 2, reps: 10, note: ["بالساقين معاً، والمعالجُ يثبّت القدمَ والركبةَ المصابتين.", "With both legs, the therapist steadying the affected foot and knee."] },
        { code: "ankle-dorsiflexion-seated" },
        { code: "affected-arm-weight-bearing" },
        { code: "table-towel-slide" },
        { code: "standing-weight-shift", note: ["لمن يقف بإسناد — بين القضيبين أو أمام طاولة.", "For those who can stand with support — between the parallel bars or at a table."] },
        { code: "overground-gait-training", doseNote: ["في كلّ جلسة، بمساعدة شخصٍ أو بين القضيبين، وأكثرُ ما يمكن من الخطوات.", "Every session, with one person helping or between the parallel bars, with as many steps as possible."],
          note: ["لغير القادر على المشي: الجهازُ الروبوتيّ بديلاً حتى يمشي.", "For those unable to walk: the robotic trainer instead until walking is possible."] },
      ],
    },
    {
      name: ["المشي والتوازن واستعمال الذراع في المهامّ", "Walking, balance and task use of the arm"],
      sessionFrom: 13, sessionTo: 30,
      timeframe: ["نحو الأسابيع الثالث إلى الخامس", "About weeks 3–5"],
      goals: [
        "مشيٌ بإشرافٍ أو مستقلّ على الأرض المستوية (FAC ٣–٤) بأداةٍ أخفّ، وسرعةُ مشيٍ أعلى، وتوازنٌ أفضل (Berg)، وقيامٌ بلا يدين، وصعودُ درجةٍ بالدرابزين، واستعمالُ اليد المصابة في مهامّ بسيطة، ولياقةٌ أفضل.",
        "Walking on level ground with supervision or independently (FAC 3–4) with a lighter aid, faster walking, better balance (Berg), standing up without the hands, a step climbed with a rail, use of the affected hand in simple tasks, and better fitness.",
      ],
      education: [
        "• كلُّ خطوةٍ تُحسب: المشيُ اليوميّ في البيت مع المرافق جزءٌ من العلاج — تُعدّ الدقائقُ أو الخطواتُ وتُرفع كلَّ أسبوع.\n" +
        "• التعبُ بعد الجلطة شائع: نشاطٌ موزّعٌ مع راحاتٍ قصيرة.\n" +
        "• اليدُ المصابة تُستعمل في كلّ ما تستطيعه ولو ببطء (الإمساكُ بالكوب، تثبيتُ الورقة) — ما لا يُستعمل يضعف.\n" +
        "• الدرج: اصعد بالساق السليمة أوّلاً وانزل بالمصابة أوّلاً، ممسكاً بالدرابزين.\n" +
        "• الدعامةُ تُلبس كما وُصفت، ويُفحص الجلدُ تحتها يومياً.",
        "• Every step counts: daily walking at home with the carer is part of treatment — count the minutes or steps and raise them every week.\n" +
        "• Fatigue after stroke is common: spread activity with short rests.\n" +
        "• Use the affected hand for everything it can do, even slowly (holding a cup, steadying paper) — what is not used weakens.\n" +
        "• Stairs: go up with the good leg first and down with the affected leg first, holding the rail.\n" +
        "• Wear the brace as prescribed and check the skin under it daily.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• يمشي على الأرض المستوية بإشرافٍ أو مستقلّاً (FAC ٣ فأكثر) لمسافة ٥٠ متراً على الأقلّ.\n" +
        "• يقوم من كرسيٍّ عاديّ بلا يدين.\n" +
        "• يصعد درجةً وينزلها ممسكاً بالدرابزين.\n" +
        "• تحسّنت سرعةُ المشي ومقياسُ بيرغ عن التقييم الأوّل.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثلاثين: يُراجَع التشنّجُ والدعامةُ والأداةُ والجرعة، ويبقى في المرحلة.",
        "Progress to phase 3 when:\n" +
        "• Walks on level ground with supervision or independently (FAC 3 or more) for at least 50 metres.\n" +
        "• Stands up from a standard chair without the hands.\n" +
        "• Steps up and down a step holding a rail.\n" +
        "• Gait speed and Berg have improved from baseline.\n" +
        "If not achieved by session 30: review spasticity, the brace, the aid and the dose, and stay in this phase.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• الانتقالُ من الجهاز الروبوتيّ إلى المشي على الأرض حين يمشي بمساعدة شخصٍ واحد — فالمشيُ على الأرض هو الهدف.\n" +
        "• الذراع: تدريبٌ موجَّهٌ بالمهمّة في كلّ جلسة بأكبر عددٍ من التكرارات، والعلاجُ بالمرآة لمن ضعفت يدُه كثيراً، والتحفيزُ الكهربائيّ مع المحاولة الإرادية لمن يحرّكها قليلاً.\n" +
        "• التشنّج: الوقوفُ والحركةُ يومياً، والأمواجُ الصادمة أو الإبرُ مساعدةٌ قصيرةُ الأثر قبل التمرين لمن يعيقه التشنّج (إن اختارها الأخصائيّ).\n" +
        "• اللياقة: الدرّاجةُ الثابتة أو المشيُ بشدّةٍ متوسّطة ١٠–٢٠ دقيقة، مع قياس الضغط والنبض؛ والسيرُ المتحرّك (بدعم الوزن أو بلا) لمن يمشي أصلاً — يُنظر فيه (NICE 2023)، ويزيد السرعةَ قليلاً لا الاستقلالَ في المشي (Mehrholz 2017 في كوكرين).",
        "Notes for the specialist:\n" +
        "• Move from the robotic trainer to overground walking once the patient walks with one person helping — overground walking is the goal.\n" +
        "• Arm: task-oriented practice every session with as many repetitions as possible, mirror therapy for a very weak hand, and electrical stimulation combined with voluntary effort for those with a little movement.\n" +
        "• Spasticity: daily standing and movement; shockwave therapy or dry needling are short-acting adjuncts before exercise for those limited by spasticity (if the specialist chooses them).\n" +
        "• Fitness: stationary cycling or walking at moderate intensity for 10–20 minutes, with blood pressure and pulse checked; treadmill training (with or without body-weight support) for those who already walk — to be considered (NICE 2023); it raises speed a little, not walking independence (Cochrane, Mehrholz 2017).",
      ],
      exercises: [
        { code: "sit-to-stand", doseNote: ["من كرسيٍّ عاديّ بلا يدين — ٣ × ١٠.", "From a standard chair without the hands — 3 × 10."] },
        { code: "standing-weight-shift", note: ["بلا يدين ثمّ بقدمٍ أمام الأخرى.", "Without the hands, then with one foot in front of the other."] },
        { code: "side-stepping" },
        { code: "step-up", sets: 2, note: ["الساقُ المصابة تصعد أوّلاً على درجةٍ ١٠ سم، ممسكاً بالدرابزين.", "The affected leg steps up first onto a 10 cm step, holding a rail."] },
        { code: "overground-gait-training", doseNote: ["في كلّ جلسة، ومسافةٌ أطول وأداةٌ أخفّ، ومشيٌ يوميّ في البيت مع المرافق.", "Every session, with longer distances and a lighter aid, plus daily walking at home with the carer."] },
        { code: "stationary-cycling", doseNote: ["١٠–٢٠ دقيقة بشدّةٍ متوسّطة (يتكلّم ولا يغنّي)، والقدمُ المصابة مثبّتةٌ بالحزام.", "10–20 minutes at moderate intensity (able to talk, not sing), with the affected foot strapped to the pedal."] },
        { code: "reach-grasp-task" },
        { code: "mirror-therapy", note: ["لمن ضعفت يدُه كثيراً (لا يبسط الأصابع) — مساعدٌ للتدريب لا بديل (NICE 2023 · Thieme 2018).", "For those with a very weak hand (unable to extend the fingers) — an adjunct to training, not a replacement (NICE 2023 · Thieme 2018)."] },
        { code: "calf-stretch-standing" },
      ],
    },
    {
      name: ["المشي في المجتمع واللياقة واستعمال اليد اليوميّ", "Community walking, fitness and daily use of the hand"],
      sessionFrom: 31, sessionTo: 48,
      timeframe: ["نحو الأسابيع السادس إلى الثامن — ثمّ البرنامجُ المنزليّ وإعادةُ التقييم", "About weeks 6–8 — then the home programme and reassessment"],
      goals: [
        "مشيٌ مستقلّ في البيت وخارجه (FAC ٤–٥) بسرعةٍ أعلى ومسافةٍ أطول، وتخطّي العوائق والدرج، ولياقةٌ أفضل، واستعمالُ اليد في الأنشطة اليومية، واستقلالٌ في البرنامج المنزليّ مع المرافق، وخطّةٌ للوقاية من السقوط.",
        "Independent walking at home and outdoors (FAC 4–5) at a higher speed and over longer distances, managing obstacles and stairs, better fitness, use of the hand in daily activities, an independent home programme with the carer, and a falls-prevention plan.",
      ],
      education: [
        "• النشاطُ مدى الحياة: مشيٌ أو درّاجةٌ أغلبَ أيّام الأسبوع يحسّن اللياقة ويقلّل خطرَ جلطةٍ ثانية.\n" +
        "• الوقايةُ من السقوط في البيت والشارع: الإنارة، والسجّاد، والمقابض، والحذاء، والنهوضُ ببطء.\n" +
        "• اليدُ المصابة في كلّ نشاطٍ يوميّ تستطيعه: الأكل، اللبس، الكتابة.\n" +
        "• العودةُ إلى الحياة بالتدريج: الصلاةُ (على كرسيٍّ إن لزم)، والزيارات، والعمل.\n" +
        "• ما بعد البرنامج: البرنامجُ المنزليّ يومياً، والمراجعةُ بعد أربعة أسابيع، وبرنامجٌ جديد إن استمرّ التحسّن.",
        "• Lifelong activity: walking or cycling on most days of the week improves fitness and lowers the risk of a second stroke.\n" +
        "• Falls prevention at home and outside: lighting, rugs, grab rails, footwear, and getting up slowly.\n" +
        "• Use the affected hand in every daily activity it can manage: eating, dressing, writing.\n" +
        "• Return to life gradually: prayer (on a chair if needed), visits and work.\n" +
        "• After the programme: the daily home programme, a review after four weeks, and a new programme if improvement continues.",
      ],
      criteria: [
        "ينتهي البرنامجُ حين:\n" +
        "• يمشي مستقلّاً في البيت (FAC ٤ فأكثر)، وتحسّنت سرعةُ مشيه ٠٫١٦ م/ث على الأقلّ أو انتقل إلى فئةٍ أعلى.\n" +
        "• تحسّن بارثيل ١٠ نقاطٍ على الأقلّ، وبيرغ ٥ نقاطٍ على الأقلّ.\n" +
        "• ينتقل ويقوم ويصعد الدرجَ بأمان، ولم يسقط.\n" +
        "• يؤدّي البرنامجَ المنزليّ مع المرافق، ومعه خطّةُ الوقاية من السقوط.\n" +
        "ثمّ زيارةُ متابعةٍ وإعادةُ تقييمٍ بعد أربعة أسابيع؛ ومَن لا يزال يتحسّن ضمن الأشهر الستّة يبدأ برنامجاً جديداً، ومَن تجاوزها يُنقل إلى بروتوكول المرحلة المزمنة.",
        "The programme ends when:\n" +
        "• Walks independently at home (FAC 4 or more), with gait speed improved by at least 0.16 m/s or a move into a higher band.\n" +
        "• Barthel has improved by at least 10 points and Berg by at least 5 points.\n" +
        "• Transfers, stands up and climbs stairs safely, with no falls.\n" +
        "• Performs the home programme with the carer, with a falls-prevention plan.\n" +
        "Then a follow-up visit and reassessment after four weeks; patients still improving within six months start a new programme, and those beyond six months move to the chronic-phase protocol.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• العلاجُ القسريّ المعدّل لمن يبسط الرسغَ ٢٠° والأصابعَ ١٠° على الأقلّ (NICE 2023): تدريبٌ مركَّز في الجلسة والقفّازُ في البيت ساعاتٍ يومياً — يحسّن حركةَ الذراع، وأثرُه على الإعاقة أقلّ (Corbetta 2015)؛ وانتبه للسقوط والتعب والمزاج.\n" +
        "• اللياقة: ٢٠–٣٠ دقيقةً ثلاثَ مرّاتٍ في الأسبوع فأكثر بشدّةٍ متوسّطة — ٤٠–٧٠٪ من احتياطيّ النبض أو جهدٌ محسوس ١١–١٤ من ٢٠ (Billinger 2014) — يحسّن اللياقةَ والإعاقة (Saunders 2020)، مع قياس الضغط والنبض.\n" +
        "• المشيُ في المجتمع: عوائق، ومنحدرات، ودرج، ومشيٌ خارج المركز مع المرافق، ومهمّةٌ ثانية.\n" +
        "• تخفيفُ الأداة والدعامة متى أمكن بأمان، لا قبل ذلك.",
        "Notes for the specialist:\n" +
        "• Modified constraint-induced therapy for those with at least 20° of active wrist and 10° of finger extension (NICE 2023): focused practice in the session and the mitt at home for hours a day — it improves arm movement, with less effect on disability (Corbetta 2015); watch for falls, fatigue and mood.\n" +
        "• Fitness: 20–30 minutes three or more times a week at moderate intensity — 40–70% of heart-rate reserve or a perceived exertion of 11–14 out of 20 (Billinger 2014) — improves fitness and disability (Saunders 2020), with blood pressure and pulse checked.\n" +
        "• Community walking: obstacles, slopes, stairs, walking outside the centre with the carer, and a second task.\n" +
        "• Reduce the aid and brace when it is safe to do so, not before.",
      ],
      exercises: [
        { code: "obstacle-dual-task-walking" },
        { code: "overground-gait-training", doseNote: ["أسرعُ وأطول، وخارج المركز مع المرافق — ٣٠ دقيقة يومياً موزّعة.", "Faster and longer, outside the centre with the carer — 30 minutes a day in spells."] },
        { code: "step-up", note: ["درجةٌ ١٥–٢٠ سم، ثمّ الدرجُ الحقيقيّ بالتناوب.", "A 15–20 cm step, then real stairs step over step."] },
        { code: "calf-raise", note: ["بالساقين ممسكاً بالطاولة، ثمّ على الساق المصابة وحدها.", "With both legs holding a table, then on the affected leg alone."] },
        { code: "sit-to-stand", doseNote: ["بثقلٍ أمام الصدر أو من مقعدٍ أخفض — ٣ × ١٠.", "With a weight at the chest or from a lower seat — 3 × 10."] },
        { code: "stationary-cycling", doseNote: ["٢٠–٣٠ دقيقة بشدّةٍ متوسّطة.", "20–30 minutes at moderate intensity."] },
        { code: "forced-use-mitt", note: ["لمن يبسط الرسغَ ٢٠° والأصابعَ ١٠° على الأقلّ.", "For those with at least 20° of active wrist and 10° of finger extension."] },
        { code: "reach-grasp-task", note: ["مهامُّ يوميةٌ دقيقة: الأكل، الأزرار، الكتابة.", "Fine daily tasks: eating, buttons, writing."] },
      ],
    },
  ],
};

export const name = "129_physio_stroke_subacute_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
