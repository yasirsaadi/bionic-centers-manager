// Migration 166: الشلل الدماغي عند الأطفال — البروتوكولُ السابع والعشرون مفصَّلاً (§4.ew — ٢٠٢٦-١٠-٢٠).
//
// المالك (٢٠٢٦-١٠-٢٠): «اعتقد نبدا بالشلل الدماغي لانه كثير من الحالات تاتيني للمركز» — فهو بقرار المالك (`cerebral-palsy-pediatric`).
// **بالقالب كاملاً** (§4.dd): كتلةٌ من ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة وتمديدٌ واحد باثنتي عشرة لهدف اليد في الشلل النصفيّ أو هدفٍ يتقدّم، ثمّ برنامجٌ منزليّ
// ومراجعةٌ كلَّ ثلاثة أشهر وكتلةٌ جديدة بأهدافٍ جديدة؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–١٨ · ١٩–٢٤): التقييمُ والأهدافُ وتدريبُ الأهل والسلامة، ثمّ التدريبُ المكثّف
// على الأهداف، ثمّ التثبيتُ والنقلُ إلى البيت والمدرسة — ومعاييرُ من مقياس بلوغ الأهداف والفرق المهمّ في الحركة الكبرى لكلّ مستوى (Oeffinger 2008)؛ **ومساراتٌ بالمستوى
// والعمر** (الرضيع، ومَن يمشي، ومَن يمشي بأداة، ومَن لا يمشي)؛ **وقواعدُ إحالةٍ** (الطوارئ، وما يشبه الشللَ الدماغيّ وليس هو، ومراقبةُ الورك بجدولها، والبلعُ والصدر،
// والبوتوكسُ والجبسُ والجراحة)؛ وتسعُ بطاقاتٍ جديدة للأطفال والمعادةُ بصورتها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (الحركةُ الكبرى
// والتشنّجُ وعطفُ الكاحل)؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده سليم.
//
// **ما يخصّ الشللَ الدماغيّ**: إشاراتُ الأدلّة الضوئية (Novak 2020) والإرشادُ الدوليّ (Jackman 2022) يجعلان أهدافَ الطفل وأهله والمهمّةَ الكاملة في الحياة أساساً،
// والتدخّلَ المبكّر بلا انتظارٍ ولا تحريكٍ سلبيّ (Morgan 2021)، والعلاجُ العصبيّ النمائيّ ليس أفضلَ من المقارَن بأيّ جرعة (te Velde 2022). **والجرعة**: الأهدافُ بنحو ١٤–٢٥
// ساعة واليدُ بنحو ٤٠ (Jackman 2020)، والكتلُ تساوي المستمرَّ بالمجموع نفسِه (Christiansen 2008)، وكلُّ فترةٍ مكثّفة ترفع المستوى ثمّ ينقص بينها (Opheim 2025)، ولا تجربةَ
// وجدت اليوميَّ المستمرّ شهوراً أفضل — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والروبوتُ مساعدٌ بشرطه (II–IV) والدليلُ متضارب،
// والتحفيزُ والمغناطيسُ والكمادةُ بقاعدة المركز وشروطها؛ **والموجاتُ الصادمة مساعدٌ أسبوعيّ × ٣ للتشنّج الموضعيّ وإعداداتُها لسليم — فلا يُعتمد قبلها**؛ والباقي «لا يُستخدم».
// **وما يخصّ العراق**: دراساتُ الأسباب في الموصل وبغداد وديالى والسليمانية وتكريت ودهوك، والأمُّ هي المعتنيةُ غالباً ونصفُ الأمّهات في أربيل لا يقرأن، ولا تجربةَ علاجٍ
// عراقيةً مضبوطة (بحثٌ صفريّ)، وتشخيصٌ بالشلل الدماغيّ دام ١٣ سنةً وكان مرضاً تنكّسياً (Hadi 2019)، والبوتوكسُ المزيّف في المنطقة (Rashid 2018).
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٣١٠ مراجع في تقرير البحث، وفي الترحيل ما ذُكر في النصّ مولَّداً من الجدول، ولا مرجعَ قبل ١٩٩٠)،
// والإرشاداتُ من نصوصها. القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — تسعٌ للأطفال؛ والمعادةُ تُربط برمزها وصورتها، وما يخصّ الطفلَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "cp-goal-task-practice", nameAr: "التدريب على هدف الطفل نفسِه: المهمّةُ كاملةً في مكانها الحقيقيّ", nameEn: "Practising the child's own goal: the whole task in its real setting",
    kind: "functional", region: "whole_body", sets: 3, reps: 5, rest: 60,
    purpose: ["الهدفُ يختاره الطفلُ وأهلُه — المشيُ إلى الصفّ، أو الوقوفُ لغسل اليدين، أو لبسُ الحذاء، أو الأكلُ بالملعقة — ويُدرَّب كاملاً في مكانه الحقيقيّ بأقلّ مساعدة: التدريبُ الموجَّه بالأهداف والتدريبُ بالمهمّة أخضران (Novak 2020)، والإرشادُ الدوليّ يجعل الأهدافَ التي يختارها الطفلُ وأهلُه وتدريبَ المهمّة كاملةً أساسَ العلاج (Jackman 2022). وفي التجارب حسّن العلاجُ الوظيفيّ المهاراتِ اليومية أكثرَ من «تصحيح نوعية الحركة» (Ketelaar 2001 · Lowing 2009)، وتغييرُ المهمّة والبيئة نفع كتغيير الطفل (Law 2011). والأهدافُ تتحقّق بنحو ١٤–٢٥ ساعة تدريب (Jackman 2020).",
      "The goal is chosen by the child and family — walking to the classroom, standing to wash the hands, putting on shoes, eating with a spoon — and practised as a whole in its real setting with the least help: goal-directed and task-specific training are green (Novak 2020), and the international guideline makes goals chosen by the child and family, with whole-task practice, the base of treatment (Jackman 2022). In trials, functional therapy improved daily skills more than 'normalising the quality of movement' (Ketelaar 2001 · Lowing 2009), and changing the task and environment worked as well as changing the child (Law 2011). Goals are reached with about 14–25 hours of practice (Jackman 2020)."],
    start: ["الطفلُ في المكان الذي تقع فيه المهمّة (الحمّام، أو الصفّ، أو سفرةُ الطعام)، والأمُّ أو الأبُ بجانبه، والهدفُ مكتوبٌ بخمس درجات.", "The child in the place where the task happens (the bathroom, the classroom, the meal mat), with a parent beside them and the goal written at five levels."],
    steps: [[
      "اختاروا مع الطفل هدفاً إلى ثلاثة يريدها هو وأهلُه، واكتبوا كلَّ هدفٍ بخمس درجات: −٢ ما يفعله اليوم، و٠ المتوقّعُ بعد الكتلة، و+٢ أفضلُ من المتوقّع.",
      "جرّبوا المهمّةَ كاملةً كما تقع في الحياة — والخطوةُ التي يتعثّر فيها تُدرَّب وحدها قليلاً ثمّ تعود إلى المهمّة.",
      "غيّروا ما حول الطفل قبل أن تغيّروا الطفل: ارتفاعُ الكرسيّ، ومقبضٌ على الحائط، وكوبٌ بمقبضين، ولوحٌ تحت القدمين.",
      "أعطوه أقلَّ مساعدةٍ تكفي أن ينجح، وقلّلوها كلّما نجح ثلاثَ مرّاتٍ متتالية.",
      "كرّروا ٣–٥ محاولاتٍ كاملة ثمّ راحةً قصيرة، ودعوه يرى نتيجتَه (صورةٌ أو ملصقٌ على اللوحة).",
      "يتعلّم الأبُ أو الأمُّ المهمّةَ نفسَها ليكرّراها في البيت كلَّ يوم في وقتها الطبيعيّ — قبل المدرسة، وعند الطعام، وعند النوم.",
    ], [
      "Choose one to three goals with the child that they and their family want, and write each at five levels: −2 what they do today, 0 the expected result after the block, +2 better than expected.",
      "Practise the whole task as it happens in life — the step where the child stumbles is practised briefly on its own and then put back into the task.",
      "Change what surrounds the child before changing the child: the chair height, a rail on the wall, a two-handled cup, a board under the feet.",
      "Give the least help that lets the child succeed, and reduce it each time they succeed three times in a row.",
      "Repeat 3–5 whole attempts, then a short rest, and let the child see the result (a photo or a sticker on the chart).",
      "A parent learns the same task to repeat it at home every day at its natural time — before school, at meals, at bedtime.",
    ]],
    cues: [[
      "تمرينٌ منفصل لا يشبه المهمّة ⟵ المهمّةُ نفسُها في مكانها.",
      "يدُ المعالج تحرّك الطفلَ كلَّ الحركة ⟵ الطفلُ يحاول والمساعدةُ أقلُّ ما يمكن (Morgan 2021).",
      "هدفٌ يختاره المعالجُ وحده ⟵ هدفٌ يريده الطفلُ وأهلُه.",
      "الصعوبةُ نفسُها كلَّ جلسة ⟵ أصعبُ قليلاً حين ينجح.",
    ], [
      "A separate exercise unlike the task → the task itself in its place.",
      "The therapist's hands doing the whole movement → the child tries and the help is as little as possible (Morgan 2021).",
      "A goal chosen by the therapist alone → a goal the child and family want.",
      "The same difficulty every session → slightly harder once the child succeeds.",
    ]],
    easier: ["نصفُ المهمّة بمساعدةٍ أكثر أو أداةٍ تسهّلها، ثمّ تُزال الأداةُ تدريجياً.", "Half the task with more help or an aid that makes it easier, then the aid removed gradually."],
    harder: ["المهمّةُ أسرع، أو في مكانٍ آخر (المدرسة، والسوق)، أو مع حمل غرضٍ أو كلام.", "The task faster, in another place (school, the market), or while carrying something or talking."],
    stopIf: ["نوبةٌ أو تعبٌ شديد أو بكاءٌ لا يهدأ أو ألمٌ جديد ⟵ توقّف، واكتب ما حدث للطبيب (القواعدُ في «موانع وإحالة»).", "A seizure, marked fatigue, crying that will not settle or new pain → stop, and write down what happened for the doctor (the rules under 'Contraindications and referral')."],
    equipment: ["أدواتُ المهمّة نفسُها في البيت أو المركز، وورقةُ الأهداف بدرجاتها الخمس.", "The task's own objects at home or in the centre, and the goal sheet with its five levels."],
    doseNote: ["٢٠–٣٠ دقيقة من كلّ جلسة على الأهداف، والأهلُ يكرّرونها يومياً — والأهدافُ تتحقّق بنحو ١٤–٢٥ ساعة تدريب (Jackman 2020).", "20–30 minutes of each session on the goals, repeated daily by the family — goals are reached with about 14–25 hours of practice (Jackman 2020)."],
    images: [{ key: "cp-goal-task-practice-1", ar: "@@GOAL_AR@@", en: "@@GOAL_EN@@", search: "child cerebral palsy goal directed task practice therapist" }],
  },
  {
    code: "cp-early-motor-play", nameAr: "اللعبُ الحركيّ المبكّر للرضيع والطفل الصغير مع أهله", nameEn: "Early motor play for infants and toddlers with their family",
    kind: "functional", region: "whole_body", sets: 1, reps: 10,
    purpose: ["التدخّلُ يبدأ عند الشكّ في التشخيص لا بعد الانتظار (Morgan 2021 — توصيةٌ قويّة)، والتشخيصُ ممكنٌ قبل الشهر السادس المصحَّح (Novak 2017): الرضيعُ يتعلّم ما يحاوله بنفسه — الوصولَ والتدحرجَ والجلوسَ والوقوفَ بإسناد — في بيئةٍ غنيّة بالألعاب، والأمُّ مدرَّبةٌ لتكرّره في اليوم؛ وبهذا تحسّنت الحركةُ عند السنة في تجربة (Morgan 2016a)، وفي بنغلادش نفع برنامجُ الأهل في البيت مَن كان مستواه الأوّل أو الثاني (Benfer 2024). والتحريكُ السلبيّ بيد المعالج توصيةٌ قويّة ضدّه (Morgan 2021). وفي ديالى أكثرُ الأطفال يأتي بين الشهر السابع والثاني عشر بتأخّر المراحل (Al-Azzawi 2012) — فالمبكّرُ ممكن.",
      "Intervention starts when the diagnosis is suspected, not after waiting (Morgan 2021 — strong recommendation), and diagnosis is possible before 6 months corrected age (Novak 2017): the infant learns what they attempt themselves — reaching, rolling, sitting, standing with support — in a toy-rich environment, with the mother coached to repeat it through the day; this improved motor scores at one year in a trial (Morgan 2016a), and in Bangladesh a parent-delivered home programme helped children at levels I–II (Benfer 2024). Passive handling by the therapist carries a strong recommendation against (Morgan 2021). In Diyala most children present between months 7 and 12 with delayed milestones (Al-Azzawi 2012) — so early is possible."],
    start: ["الرضيعُ على بساطٍ على الأرض بملابس خفيفة، والأمُّ بجانبه، والألعابُ قريبةٌ منه.", "The infant on a mat on the floor in light clothes, the mother beside them, with toys nearby."],
    steps: [[
      "ضعوا الطفلَ في وضعٍ يستطيع أن يتحرّك منه وحده: على بطنه، أو جالساً بإسنادٍ عند الحوض، أو واقفاً يستند إلى أريكة.",
      "ضعوا لعبةً يحبّها أبعدَ قليلاً ممّا يصل إليه، وانتظروا أن يحاول هو.",
      "ساعدوه أقلَّ مساعدةٍ تكفي أن ينجح، ثمّ صفّقوا وكلّموه — النجاحُ يجعله يكرّر.",
      "غيّروا الوضعَ والألعابَ كلَّ بضع دقائق: التدحرج، ثمّ الجلوس، ثمّ الزحف أو الوقوف.",
      "إن كانت يدٌ أضعفَ من الأخرى فضعوا اللعبةَ في جهتها، والعلاجُ القسريّ باللعب في بطاقته.",
      "اجعلوا اللعبَ جزءاً من اليوم: عند تغيير الحفاض، وبعد الرضاعة، وفي الحمّام.",
    ], [
      "Place the child in a position from which they can move by themselves: on their tummy, sitting with support at the pelvis, or standing against a sofa.",
      "Put a favourite toy slightly beyond their reach and wait for them to try.",
      "Give the least help that lets them succeed, then clap and talk to them — success makes them repeat.",
      "Change the position and toys every few minutes: rolling, then sitting, then crawling or standing.",
      "If one hand is weaker than the other, put the toy on its side; constraint-induced play has its own card.",
      "Make play part of the day: at nappy changes, after feeds and at bath time.",
    ]],
    cues: [[
      "الطفلُ على ظهره أو محمولٌ أكثرَ اليوم ⟵ على الأرض يلعب ويتحرّك.",
      "اليدُ تحرّك الطفلَ كلَّ الحركة ⟵ يحاول هو واليدُ تساعد قليلاً.",
      "الألعابُ دائماً في متناول يده ⟵ أبعدُ قليلاً ليتحرّك نحوها.",
      "المقعدُ أو الحضنُ ساعاتٍ طويلة ⟵ وقتٌ أطول على الأرض.",
    ], [
      "The child on their back or carried most of the day → on the floor, playing and moving.",
      "The hands doing the whole movement → the child tries and the hands help a little.",
      "Toys always within reach → slightly further so they move towards them.",
      "A seat or a lap for long hours → more time on the floor.",
    ]],
    easier: ["وضعٌ أسهل (جالسٌ في حضن أمّه أو مستندٌ إلى وسادة) ولعبةٌ أقرب.", "An easier position (sitting in the mother's lap or against a cushion) and a closer toy."],
    harder: ["لعبةٌ أبعد أو أعلى، وسطحٌ ألين (فراش)، والوقوفُ عند الأريكة والانتقالُ على طولها.", "A toy further away or higher, a softer surface (a mattress), and standing at the sofa and cruising along it."],
    stopIf: ["حركاتٌ متكرّرة غريبة أو تحديقٌ أو تصلّبٌ مفاجئ (قد تكون نوبات)، أو فقدُ مهارةٍ كان يتقنها، أو سعالٌ واختناقٌ عند الرضاعة ⟵ إلى الطبيب (القواعدُ في «موانع وإحالة»).", "Repeated odd movements, staring or sudden stiffening (possible seizures), loss of a skill already gained, or coughing and choking at feeds → to the doctor (the rules under 'Contraindications and referral')."],
    equipment: ["بساطٌ على الأرض، وألعابٌ ملوّنة بأصوات، ووسادةٌ للإسناد، ومرآة.", "A floor mat, colourful toys with sounds, a cushion for support, and a mirror."],
    doseNote: ["مرّاتٌ قصيرة كثيرة في اليوم يقودها الأهل، والجلسةُ لتدريبهم — «تدريبٌ يوميّ متكرّر قدر الإمكان» (Morgan 2021).", "Many short bouts a day led by the family, with the session used to coach them — 'daily repeated practice as possible' (Morgan 2021)."],
    images: [{ key: "cp-early-motor-play-1", ar: "@@EARLY_AR@@", en: "@@EARLY_EN@@", search: "infant cerebral palsy early intervention floor play parent coaching" }],
  },
  {
    code: "cp-cimt-play", nameAr: "العلاجُ القسريّ باللعب: اليدُ القويّة في قفّاز والضعيفةُ تلعب", nameEn: "Constraint-induced play: the stronger hand in a mitt, the weaker hand plays",
    kind: "functional", region: "wrist_hand", sets: 1, reps: 10,
    purpose: ["للشلل في جهةٍ واحدة: تُغطّى اليدُ القويّة وقتاً محدّداً كلُّه لعب، فتعمل اليدُ الضعيفة وتتكرّر حركتُها كثيراً — والعلاجُ القسريّ أخضر (Novak 2020)، وأفضلُ من الجرعة القليلة لاستعمال اليدين معاً ومثلُ التدريب باليدين بالجرعة نفسِها (Hoare 2019)، والجرعةُ العالية أثبتُ أثراً (Ramey 2021)، ونصفُ الجرعة لم يحسّن الحركة (Sakzewski 2015). ويبدأ عند الرضيع حين يُشكّ في الشلل النصفيّ (Morgan 2021 · Eliasson 2018)؛ وفي الأردن أدّته الأسرُ في البيت ساعتين يومياً ثمانيةَ أسابيع بزيارةٍ أسبوعية فتحسّن استعمالُ اليد (Al-Oraibi 2011).",
      "For palsy on one side: the stronger hand is covered for a set time that is all play, so the weaker hand works and repeats its movement many times — constraint-induced therapy is green (Novak 2020), better than a low dose for two-handed use and equal to bimanual training at the same dose (Hoare 2019), with a high dose giving the most consistent gains (Ramey 2021) and half the dose not improving movement (Sakzewski 2015). It starts in infancy once unilateral palsy is suspected (Morgan 2021 · Eliasson 2018); in Jordan families delivered it at home for two hours a day for eight weeks with a weekly visit, and hand use improved (Al-Oraibi 2011)."],
    start: ["الطفلُ جالسٌ إلى طاولةٍ صغيرة أو على الأرض، والقفّازُ على يده القويّة، والألعابُ أمام يده الضعيفة.", "The child sitting at a small table or on the floor, the mitt on the stronger hand, and toys in front of the weaker hand."],
    steps: [[
      "ألبسوا اليدَ القويّة قفّازاً سميكاً أو جورباً مخيطاً أو جبيرةً خفيفة كما علّمكم الأخصائيّ — مريحاً لا مربوطاً بقوّة.",
      "اختاروا ألعاباً تكفيها يدٌ واحدة: مكعّباتٌ تُوضع في علبة، وكرةٌ تُرمى، وصلصال، وأزرارُ لعبةٍ تصدر صوتاً.",
      "ضعوا اللعبةَ في جهة اليد الضعيفة وعلى ارتفاعٍ يصل إليه، وشجّعوه أن يمسك ويُفلت ويرمي.",
      "زيدوا الصعوبةَ حين ينجح: أصغرُ حجماً، وأبعد، وأعلى، وأسرع.",
      "انزعوا القفّازَ آخرَ الوقت، والعبوا لعبةً باليدين معاً (بطاقةُ «اللعب بكلتا اليدين»).",
    ], [
      "Put a thick mitt, a sewn sock or a light splint on the stronger hand as the therapist showed you — comfortable, not tied tightly.",
      "Choose toys that need only one hand: blocks into a box, a ball to throw, play dough, buttons on a toy that makes sounds.",
      "Place the toy on the weaker hand's side at a height the child can reach, and encourage them to grasp, release and throw.",
      "Make it harder as they succeed: smaller, further, higher, faster.",
      "Remove the mitt at the end and play a two-handed game (the 'Two-handed play' card).",
    ]],
    cues: [[
      "القفّازُ ساعاتٍ بلا لعب ⟵ وقتٌ محدّد كلُّه لعبٌ باليد الضعيفة.",
      "لعبةٌ صعبة يفشل فيها ⟵ أسهلُ قليلاً لينجح مرّاتٍ كثيرة.",
      "ربطُ اليد القويّة بإحكام ⟵ قفّازٌ مريح يُنزع عند الطعام والنوم.",
      "الطفلُ يبكي ويرفض ⟵ لعبةٌ يحبّها، ووقتٌ أقصر، ومديحٌ على كلّ محاولة.",
    ], [
      "A mitt for hours without play → a set time that is all play with the weaker hand.",
      "A hard toy the child fails at → slightly easier so they succeed many times.",
      "The stronger hand tied tightly → a comfortable mitt removed for meals and sleep.",
      "The child cries and refuses → a favourite toy, a shorter time, and praise for every attempt.",
    ]],
    easier: ["وقتٌ أقصر (ربعُ ساعة) وألعابٌ أكبر، والأمُّ تثبّت اللعبة.", "A shorter time (a quarter of an hour) and bigger toys, with the mother holding the toy steady."],
    harder: ["ألعابٌ صغيرة (خرز، وأزرار)، ومهامُّ يومية باليد الضعيفة (الأكلُ بالملعقة، ونزعُ الجورب).", "Small toys (beads, buttons), and daily tasks with the weaker hand (eating with a spoon, pulling off a sock)."],
    stopIf: ["احمرارٌ أو جرحٌ تحت القفّاز أو الجبيرة، أو ضيقٌ وبكاءٌ لا يهدأ ⟵ يُنزع القفّازُ ويُخبَر الأخصائيّ؛ والإحباطُ ورفضُ القيد وتهيّجُ الجلد من الجبس قد تحدث وتزول (Hoare 2019).", "Redness or a sore under the mitt or splint, or distress and crying that will not settle → remove the mitt and tell the therapist; frustration, refusing the constraint and skin irritation from casts can happen and resolve (Hoare 2019)."],
    equipment: ["قفّازٌ سميك أو جوربٌ مخيط أو جبيرةٌ خفيفة، وألعابٌ تناسب العمر.", "A thick mitt, a sewn sock or a light splint, and toys suited to the child's age."],
    doseNote: ["للرضيع ٣٠–٦٠ دقيقة يومياً ستّةَ أسابيع (Morgan 2021)، وللأكبر نحو ساعتين يومياً في البيت ثمانيةَ أسابيع (Al-Oraibi 2011) — واليدُ تحتاج نحو ٤٠ ساعة (Jackman 2020).", "For an infant 30–60 minutes a day for six weeks (Morgan 2021); for older children about two hours a day at home for eight weeks (Al-Oraibi 2011) — the hand needs about 40 hours (Jackman 2020)."],
    images: [{ key: "cp-cimt-play-1", ar: "@@CIMT_AR@@", en: "@@CIMT_EN@@", search: "constraint induced movement therapy child mitt play hemiplegia" }],
  },
  {
    code: "cp-bimanual-play", nameAr: "اللعبُ والمهامُّ بكلتا اليدين", nameEn: "Two-handed play and tasks (bimanual training)",
    kind: "functional", region: "wrist_hand", sets: 1, reps: 10,
    purpose: ["أكثرُ مهامّ اليوم تحتاج اليدين معاً: التدريبُ باليدين أخضر (Novak 2020)، ومثلُ العلاج القسريّ بالجرعة نفسِها في استعمال اليدين، وبلغ به الأطفالُ أهدافَهم أكثر (Gordon 2011 · Hoare 2019)، ونفع في الشلل في الجهتين أيضاً (Figueiredo 2020 · Bleyenheuft 2017)؛ والبريطانيُّ يوصي بالعلاج القسريّ ثمّ التدريب باليدين في برنامجٍ مكثّف قصير (NICE CG145 2012).",
      "Most daily tasks need both hands together: bimanual training is green (Novak 2020), equal to constraint-induced therapy at the same dose for two-handed use, with children reaching more of their goals (Gordon 2011 · Hoare 2019), and it helped in bilateral palsy too (Figueiredo 2020 · Bleyenheuft 2017); the British guideline advises constraint-induced therapy followed by bimanual training in a short intensive programme (NICE CG145 2012)."],
    start: ["الطفلُ جالسٌ ثابتاً إلى طاولةٍ بارتفاع مرفقيه وقدماه على الأرض أو على لوح، والغرضُ أمامه في الوسط.", "The child sitting steadily at a table at elbow height with the feet on the floor or a board, and the object in front of them in the middle."],
    steps: [[
      "اختاروا لعبةً أو مهمّةً لا تتمّ إلّا باليدين: فتحُ علبةٍ بغطاء، وإدخالُ الخرز في خيط، والرسمُ واليدُ الأخرى تثبّت الورقة، ولفُّ الصلصال، وحملُ صينيةٍ أو كرةٍ كبيرة.",
      "اجعلوا لكلّ يدٍ دوراً: الضعيفةُ تثبّت وتمسك، والقويّةُ تعمل — ثمّ تتبادلان حين يقدر.",
      "الخطوةُ الصعبة تُدرَّب وحدها قليلاً، ثمّ المهمّةُ كاملة.",
      "كرّروا مهامَّ أهداف الطفل نفسِها: لبسُ القميص، وفتحُ حقيبة المدرسة، وأكلُ السندويش باليدين.",
    ], [
      "Choose a game or task that can only be done with two hands: opening a lidded box, threading beads, drawing while the other hand holds the paper, rolling play dough, carrying a tray or a big ball.",
      "Give each hand a role: the weaker one holds and stabilises, the stronger one works — then they swap when the child can.",
      "The hard step is practised briefly on its own, then the whole task.",
      "Repeat the child's own goal tasks: putting on a shirt, opening the school bag, eating a sandwich with both hands.",
    ]],
    cues: [[
      "اليدُ الضعيفة تبقى في الحضن ⟵ لها عملٌ في كلّ لعبة (التثبيت).",
      "الطفلُ يميل ويحني ظهره ⟵ مقعدٌ ثابت وطاولةٌ بالارتفاع المناسب.",
      "لعبةٌ تكفيها يدٌ واحدة ⟵ لعبةٌ تحتاج اليدين.",
      "المعالجُ يحرّك اليدَ بدل الطفل ⟵ يحاول هو أوّلاً.",
    ], [
      "The weaker hand stays in the lap → it has a job in every game (holding).",
      "The child leans and slumps → a steady seat and a table at the right height.",
      "A game one hand can do → a game that needs both hands.",
      "The therapist moves the hand for the child → the child tries first.",
    ]],
    easier: ["أغراضٌ أكبر وأخفّ، واليدُ الضعيفة تثبّت فقط.", "Bigger, lighter objects, with the weaker hand only holding."],
    harder: ["أغراضٌ أصغر، ومهامُّ بسرعةٍ أو ترتيب، واليدُ الضعيفة تعمل أكثر.", "Smaller objects, tasks with speed or sequence, and more work for the weaker hand."],
    stopIf: ["تعبٌ أو ألمٌ في اليد أو الرسغ أو بكاءٌ متواصل ⟵ راحةٌ أو لعبةٌ أسهل؛ وألمٌ يتكرّر ⟵ الأخصائيّ.", "Fatigue, pain in the hand or wrist, or continuous crying → a rest or an easier game; recurring pain → the therapist."],
    equipment: ["ألعابٌ بقطعتين (علبٌ بأغطية، وخرزٌ وخيط، وصلصال، ومكعّبات)، وطاولةٌ وكرسيٌّ ثابتان.", "Two-part toys (lidded boxes, beads and string, play dough, blocks), and a steady table and chair."],
    doseNote: ["في التجارب ٦٠–٩٠ ساعة في مخيّماتٍ مكثّفة (Gordon 2011 · Sakzewski 2015)؛ وفي المركز جزءٌ من كلّ جلسة، والبيتُ يومياً يحمل التكرار.", "Trials used 60–90 hours in intensive camps (Gordon 2011 · Sakzewski 2015); in the centre it is part of each session, and daily home practice carries the repetitions."],
    images: [{ key: "cp-bimanual-play-1", ar: "@@BIMAN_AR@@", en: "@@BIMAN_EN@@", search: "bimanual training child hemiplegia HABIT play both hands" }],
  },
  {
    code: "cp-functional-strength-play", nameAr: "تقويةٌ وظيفية باللعب: القرفصاءُ والقيامُ والصعود", nameEn: "Functional strengthening through play: squats, sit-to-stand and step-ups",
    kind: "strength", region: "whole_body", sets: 3, reps: 10, rest: 60,
    purpose: ["ضعفُ العضلات من أهمّ ما يحدّ حركةَ الطفل: التقويةُ خضراءُ لزيادة القوّة (Novak 2020)، ورفعت القوّةَ والتوازنَ وسرعةَ المشي دون أن تزيد التشنّجَ حين تُعطى بجرعتها (Merino-Andres 2022)؛ لكنّ التقويةَ وحدها لم تحسّن الحركةَ الكبرى (Ryan 2017) — فتُعطى داخل مهامّ وظيفية ومع التدريب على المشي. والمكاسبُ تذهب سريعاً إذا توقّف التمرين (Verschuren 2016).",
      "Muscle weakness is among the main limits on a child's movement: strengthening is green for increasing strength (Novak 2020), and it raised strength, balance and walking speed without increasing spasticity when properly dosed (Merino-Andres 2022); but strengthening alone did not improve gross motor function (Ryan 2017) — so it is given inside functional tasks and alongside walking practice. The gains fade quickly when training stops (Verschuren 2016)."],
    start: ["الطفلُ واقفٌ أمام مقعدٍ بارتفاع ركبتيه، والألعابُ على الأرض أمامه، ودرجةٌ أو صندوقٌ بجانبه.", "The child standing in front of a bench at knee height, toys on the floor in front of them, and a step or box beside them."],
    steps: [[
      "القرفصاءُ لالتقاط لعبة: يثني ركبتيه وينزل ويلتقط اللعبةَ من الأرض، ثمّ يقوم ويضعها في سلّةٍ على المقعد.",
      "الجلوسُ والقيام: يجلس على المقعد ويقوم بلا يدين إن قدر، عشرَ مرّات.",
      "صعودُ الدرجة: يصعد درجةً أو صندوقاً منخفضاً وينزل، والقدمُ الضعيفة تبدأ مرّةً والقويّةُ مرّة.",
      "من الركوع إلى الوقوف: يركع على ركبتيه، ثمّ يضع قدماً أمامه ويقوم.",
      "زيدوا الصعوبةَ حين يُتمّ العشرَ بسهولة: مقعدٌ أخفض، أو درجةٌ أعلى، أو حقيبةُ ظهرٍ فيها وزنٌ خفيف.",
    ], [
      "Squat to pick up a toy: bend the knees, go down and pick the toy up from the floor, then stand and put it in a basket on the bench.",
      "Sit to stand: sit on the bench and stand without hands if possible, ten times.",
      "Step-up: step up onto a low step or box and down, leading with the weaker foot one time and the stronger foot the next.",
      "Kneel to stand: kneel on both knees, then bring one foot forward and stand up.",
      "Make it harder once ten are easy: a lower bench, a higher step, or a backpack with a light weight.",
    ]],
    cues: [[
      "الركبتان تلتقيان إلى الداخل ⟵ الركبةُ فوق القدم.",
      "يقوم بدفع اليدين على الفخذين ⟵ يقوم بالساقين.",
      "يصعد بالقدم القويّة دائماً ⟵ الضعيفةُ أوّلاً مرّةً بعد مرّة.",
      "التمرينُ كلَّ يومٍ بالحمل نفسِه ⟵ يوماً بعد يوم والحملُ يزيد تدريجياً (Verschuren 2016).",
    ], [
      "The knees falling inwards → the knee over the foot.",
      "Pushing up with the hands on the thighs → standing up with the legs.",
      "Always stepping up with the stronger foot → the weaker foot first on alternate repetitions.",
      "Daily training at the same load → every other day, with the load increased gradually (Verschuren 2016).",
    ]],
    easier: ["مقعدٌ أعلى، ودرجةٌ أقلّ ارتفاعاً، ويدٌ على الطاولة أو بيد الأمّ.", "A higher bench, a lower step, and a hand on the table or in the mother's hand."],
    harder: ["مقعدٌ أخفض، ودرجةٌ أعلى، ووزنٌ في حقيبة الظهر، وتوقّفٌ في منتصف القرفصاء.", "A lower bench, a higher step, a weight in the backpack, and a pause halfway down the squat."],
    stopIf: ["ألمٌ في الركبة أو الورك أو القدم يبقى بعد التمرين ⟵ يتوقّف ويُفحص (الوركُ في «موانع وإحالة»).", "Pain in the knee, hip or foot that lasts after the exercise → stop and have it examined (the hip under 'Contraindications and referral')."],
    equipment: ["مقعدٌ أو كرسيٌّ ثابت، ودرجةٌ أو صندوق، وألعابٌ وسلّة، وحقيبةُ ظهرٍ بوزنٍ خفيف.", "A steady bench or chair, a step or box, toys and a basket, and a backpack with a light weight."],
    doseNote: ["١–٣ مجموعات × ٦–١٥ مرّة، مرّتين إلى أربعٍ في الأسبوع في أيّامٍ غير متتالية، ١٢–١٦ أسبوعاً (Verschuren 2016) — فالبيتُ يُكمل بعد الكتلة.", "1–3 sets × 6–15 repetitions, two to four times a week on non-consecutive days, for 12–16 weeks (Verschuren 2016) — so home training continues after the block."],
    images: [{ key: "cp-functional-strength-play-1", ar: "@@STR_AR@@", en: "@@STR_EN@@", search: "child cerebral palsy sit to stand squat step up strengthening" }],
  },
  {
    code: "cp-treadmill-training", nameAr: "المشيُ على السير المتحرّك للطفل، وبحزامٍ يحمل بعضَ الوزن عند الحاجة", nameEn: "Treadmill walking for children, with a harness carrying some body weight when needed",
    kind: "aerobic", region: "whole_body", sets: 1, reps: 1,
    purpose: ["السيرُ المتحرّك — بحزامٍ يحمل بعضَ الوزن أو بلا حزام — أخضر (Novak 2020)، والإرشادُ الدوليّ يقدّم المشيَ على الأرض ويكمّله بالسير (Jackman 2022): مرّتين في الأسبوع سبعةَ أسابيع رفع المشيَ ستّ دقائق من ٢٢٧ إلى ٣٧٧ متراً مقابل ٢٢٣ إلى ٢٦٨ على الأرض (Grecco 2013)، وفي المستويين III–IV لم يكن السيرُ بالحزام أفضلَ من المشي على الأرض (Willoughby 2010)، والأطفالُ الصغار في البيت نفعهم مرّتين في الأسبوع كعشر (Mattern-Baxter 2020). واللياقةُ الهوائية حسّنت الحركةَ الكبرى قليلاً (Ryan 2017).",
      "Treadmill training — with a harness carrying some body weight or without — is green (Novak 2020), and the international guideline puts overground walking first, supplemented with the treadmill (Jackman 2022): twice a week for seven weeks raised the six-minute walk from 227 to 377 m against 223 to 268 m overground (Grecco 2013); at levels III–IV the harness treadmill was no better than overground walking (Willoughby 2010); and toddlers at home did as well with two sessions a week as with ten (Mattern-Baxter 2020). Aerobic fitness slightly improved gross motor function (Ryan 2017)."],
    start: ["الطفلُ على السير ويداه على المقبضين، والمعالجُ بجانبه أو خلفه، والحزامُ عليه إن احتاجه، والدعامةُ والحذاءُ في قدميه.", "The child on the treadmill with the hands on the rails, the therapist beside or behind them, the harness on if needed, and the orthoses and shoes on the feet."],
    steps: [[
      "ابدأ بسرعةٍ بطيئة يمشي بها بخطواتٍ متناوبة، ثلاثَ دقائق إحماءً.",
      "زد السرعةَ قليلاً حتى يمشي أسرعَ من مشيه المعتاد وهو يستطيع الكلامَ بجملٍ قصيرة.",
      "شجّعه على خطوةٍ أطول وأن يضع الكعبَ أوّلاً إن قدر، ويداه تخفّان على المقبض.",
      "لمن يحتاج الحزام: أقلُّ حملٍ للوزن يمنع انثناءَ الركبتين، ويقلّ كلّما قوي.",
      "أنهِ بثلاث دقائق أبطأ، ثمّ امشِ معه على الأرض في الممرّ أو الساحة.",
    ], [
      "Start at a slow speed at which the child walks with alternating steps, three minutes to warm up.",
      "Raise the speed a little until they walk faster than their usual pace while still able to talk in short sentences.",
      "Encourage a longer step and landing on the heel first if they can, with the hands lighter on the rail.",
      "For a child who needs the harness: the least body-weight support that stops the knees buckling, reduced as they get stronger.",
      "Finish with three slower minutes, then walk with them overground in the corridor or yard.",
    ]],
    cues: [[
      "يتعلّق بالمقبضين بكلّ وزنه ⟵ يدان خفيفتان أو يدٌ واحدة.",
      "خطواتٌ قصيرة على أطراف الأصابع ⟵ سرعةٌ يقدر معها على خطوةٍ أطول، والدعامةُ في القدم.",
      "السيرُ وحده ⟵ ثمّ المشيُ على الأرض في الحياة (Jackman 2022).",
      "سرعةٌ واحدة كلَّ جلسة ⟵ تزيد حين يمشي بسهولة.",
    ], [
      "Hanging on the rails with all their weight → light hands or one hand.",
      "Short steps on tiptoe → a speed that allows a longer step, with the orthosis on.",
      "The treadmill alone → then overground walking in daily life (Jackman 2022).",
      "One speed every session → increased once walking is easy.",
    ]],
    easier: ["سرعةٌ أبطأ، ودقائقُ أقلّ مع راحات، وحزامٌ يحمل بعضَ الوزن.", "A slower speed, fewer minutes with rests, and a harness carrying some body weight."],
    harder: ["سرعةٌ أعلى أو ميلٌ خفيف، ودقائقُ أكثر، ويدٌ واحدة على المقبض ثمّ بلا يدين.", "A higher speed or a slight incline, more minutes, and one hand on the rail, then none."],
    stopIf: ["ضيقُ نفسٍ شديد أو شحوبٌ أو دوخة أو نوبة ⟵ أوقف السيرَ فوراً؛ وطفلٌ يخاف من السير أو الحزام ويبكي ⟵ المشيُ على الأرض بدلاً منه.", "Marked breathlessness, pallor, dizziness or a seizure → stop the treadmill at once; a child frightened of the treadmill or harness who keeps crying → overground walking instead."],
    equipment: ["سيرٌ متحرّك بمقبضين ومفتاحِ إيقافٍ قريب، وحزامُ إسنادٍ للأطفال إن وُجد، والدعامةُ والحذاء.", "A treadmill with rails and a nearby stop switch, a children's support harness if available, and the orthoses and shoes."],
    doseNote: ["٢٠–٣٠ دقيقة مرّتين إلى ثلاثٍ في الأسبوع (Grecco 2013)؛ واللياقةُ ٢٠ دقيقةً فأكثر ثلاثاً في الأسبوع ثمانيةَ أسابيع (Verschuren 2016).", "20–30 minutes two to three times a week (Grecco 2013); for fitness 20 minutes or more three times a week for eight weeks (Verschuren 2016)."],
    images: [{ key: "cp-treadmill-training-1", ar: "@@TREAD_AR@@", en: "@@TREAD_EN@@", search: "child cerebral palsy treadmill training body weight support harness" }],
  },
  {
    code: "cp-standing-frame-abduction", nameAr: "برنامجُ الوقوف في جهاز الوقوف والساقان متباعدتان", nameEn: "Standing programme in a stander with the legs apart",
    kind: "functional", region: "hip", sets: 1, reps: 1,
    purpose: ["لطفلٍ لا يقف وحده (المستويات III–V): الوقوفُ والساقان متباعدتان يُبقي رأسَ الفخذ في مكانه ويمطّ العضلات ويحمل الوزنَ على العظم — وحملُ الوزن أخضر (Novak 2020)، والوقوفُ بتبعيد الوركين ساعةً يومياً خمسةَ أيّام توصيةٌ مشروطة (Battisti 2023 · Morgan 2021)؛ ففي المستوى الثالث بقيت نسبةُ إزاحة الورك ١٣–٢٣٪ مع الوقوف اليوميّ مقابل ١٢–٤٧٪ بدونه (Macias-Merlo 2016)، ونقصت بنحو عشر ساعاتٍ في الأسبوع (Martinsson 2021)، وكثرت الكسورُ بلا إصابةٍ عند مَن لا يستعمل جهازَ وقوف (Uddenfeldt Wort 2013) — لكنّ البريطانيَّ لا يعطيه لكثافة العظم وحدها (NICE NG62 2017).",
      "For a child who cannot stand alone (levels III–V): standing with the legs apart keeps the head of the femur in its socket, stretches the muscles and loads the bones — weight-bearing is green (Novak 2020), and standing with the hips abducted for an hour a day, five days a week, is a conditional recommendation (Battisti 2023 · Morgan 2021); at level III the hip migration percentage stayed at 13–23% with daily standing against 12–47% without it (Macias-Merlo 2016), and fell with about ten hours a week (Martinsson 2021), while fractures without major injury were more frequent in children not using a stander (Uddenfeldt Wort 2013) — though the British guideline does not offer it for bone density alone (NICE NG62 2017)."],
    start: ["الطفلُ في جهاز الوقوف وقدماه في الحذاء والدعامة، والركبتان مستقيمتان، والساقان متباعدتان كحرف V، وطاولةُ لعبٍ أمامه.", "The child in the stander with shoes and orthoses on, the knees straight, the legs apart in a V, and a play tray in front of them."],
    steps: [[
      "ألبسوه الدعامةَ والحذاء، ثمّ ثبّتوه في الجهاز بالأحزمة كما علّمكم الأخصائيّ: القدمان أوّلاً، ثمّ الركبتان، ثمّ الحوض، ثمّ الصدر.",
      "باعدوا الساقين بالزاوية التي كتبها الأخصائيّ (نحو ١٥–٣٠ درجةً لكلّ ورك)، والقدمان مسطّحتان والكعبان على اللوح.",
      "اجعلوا وقتَ الوقوف وقتَ لعبٍ أو طعامٍ أو واجبٍ مدرسيّ على الطاولة أمامه، أو مع إخوته.",
      "ابدأوا بوقتٍ قصير وزيدوه كلَّ بضعة أيّام حتى ساعةٍ في اليوم أو أكثر — مرّةً واحدة أو مقسّمةً مرّتين.",
      "بعد الوقوف افحصوا الجلدَ عند القدمين والركبتين والصدر: احمرارٌ يزول خلال نصف ساعة طبيعيّ.",
    ], [
      "Put on the orthoses and shoes, then secure the child in the stander with the straps as the therapist taught you: feet first, then knees, then pelvis, then chest.",
      "Spread the legs to the angle the therapist wrote (about 15–30 degrees for each hip), with the feet flat and the heels on the footplate.",
      "Make standing time play time, meal time or homework at the tray in front of them, or with their brothers and sisters.",
      "Start with a short time and increase it every few days up to an hour a day or more — in one go or split into two.",
      "After standing, check the skin at the feet, knees and chest: redness that fades within half an hour is normal.",
    ]],
    cues: [[
      "الساقان متلاصقتان ⟵ متباعدتان بالزاوية المكتوبة.",
      "الركبتان مثنيّتان والكعبان مرفوعان ⟵ ركبتان مستقيمتان وكعبان على اللوح.",
      "الطفلُ واقفٌ وحده بلا شيء يفعله ⟵ لعبٌ أو طعامٌ أو كلامٌ مع أهله.",
      "الجهازُ في الزاوية لا يُستعمل ⟵ وقتٌ ثابت في جدول اليوم.",
    ], [
      "The legs together → apart at the written angle.",
      "The knees bent and the heels lifted → straight knees and heels on the footplate.",
      "The child standing with nothing to do → play, a meal or talking with the family.",
      "The stander unused in a corner → a fixed time in the daily routine.",
    ]],
    easier: ["ميلُ الجهاز أبعدُ عن العموديّ، ووقتٌ أقصر مرّتين في اليوم.", "The stander tilted further from vertical, and a shorter time twice a day."],
    harder: ["وقوفٌ أقربُ إلى العموديّ، ووقتٌ أطول، واستعمالُ اليدين في اللعب وهو واقف.", "Standing closer to vertical, a longer time, and using the hands in play while standing."],
    stopIf: ["ألمٌ في الورك أو الركبة، أو احمرارٌ لا يزول بعد نصف ساعة، أو تعبٌ وضيقُ نفس، أو نوبة ⟵ يُنزل ويُخبَر الأخصائيّ؛ وألمُ الورك يحتاج صورةَ الحوض (القواعدُ في «موانع وإحالة»).", "Pain in the hip or knee, redness that lasts over half an hour, fatigue and breathlessness, or a seizure → take the child out and tell the therapist; hip pain needs a pelvic X-ray (the rules under 'Contraindications and referral')."],
    equipment: ["جهازُ وقوف (أماميّ أو خلفيّ أو عموديّ) بمباعِدٍ للساقين، والدعامةُ والحذاء، وطاولةٌ للعب.", "A stander (prone, supine or upright) with a leg abductor, the orthoses and shoes, and a play tray."],
    doseNote: ["للورك ٦٠ دقيقة يومياً والتبعيدُ ٣٠–٦٠ درجةً للوركين معاً، وللعظم ٦٠–٩٠، خمسةَ أيّامٍ في الأسبوع (Paleg 2013 · Battisti 2023).", "For the hips 60 minutes a day with 30–60 degrees of total hip abduction, for bone 60–90 minutes, five days a week (Paleg 2013 · Battisti 2023)."],
    images: [{ key: "cp-standing-frame-abduction-1", ar: "@@STAND_AR@@", en: "@@STAND_EN@@", search: "child standing frame stander hip abduction cerebral palsy" }],
  },
  {
    code: "cp-afo-wear-skin", nameAr: "الدعامةُ القدمية كلَّ يوم: لبسُها وجدولُها وفحصُ الجلد", nameEn: "The ankle-foot orthosis every day: putting it on, the wearing schedule and skin checks",
    kind: "functional", region: "ankle_foot", sets: 1, reps: 1,
    purpose: ["الدعامةُ التي تضبط القدمَ والكاحل في الوقوف وفي رفع القدم تجعل المشيَ أكفأ في المستويات I–III (Morris 2011)، وتطيل الخطوةَ وتزيد السرعة (Lintanf 2018 · Betancourt 2019)، وتحفظ عطفَ الكاحل (Morgan 2021)؛ ونصفُ الأطفال بالشلل الدماغيّ يلبسونها (Wingstrand 2014). والبريطانيُّ: يُراجَع مقاسُها في كلّ زيارة، ودعامةُ التمطيط ستَّ ساعاتٍ يومياً فأكثر، وتُنزع إن بقي الألمُ بعد إعادة لبسها (NICE CG145 2012). والمركزُ يصنع الدعامة — وهذه البطاقةُ نصيبُ الأهل.",
      "An orthosis that controls the foot and ankle in standing and in lifting the foot makes walking more efficient at levels I–III (Morris 2011), lengthens the step and increases speed (Lintanf 2018 · Betancourt 2019), and maintains ankle dorsiflexion (Morgan 2021); half of children with cerebral palsy wear one (Wingstrand 2014). The British guideline: the fit is reviewed at every visit, a stretching orthosis is worn six hours a day or more, and it is removed if pain persists after it is put back on (NICE CG145 2012). The centre makes the orthosis — this card is the family's part."],
    start: ["الطفلُ جالسٌ على كرسيٍّ والركبةُ مثنيّة، والجوربُ القطنيّ الطويل على ساقه، والدعامةُ والحذاءُ الأوسعُ بجانبه.", "The child sitting on a chair with the knee bent, a long cotton sock on the leg, and the orthosis and a wider shoe beside them."],
    steps: [[
      "ألبسوه جورباً قطنياً أطولَ من الدعامة بلا تجاعيد.",
      "اثنوا الركبةَ قليلاً، وادفعوا الكعبَ إلى أسفل الدعامة وإلى خلفها حتى يلامس قعرَها.",
      "شدّوا حزامَ الكاحل أوّلاً (فهو يثبّت الكعب)، ثمّ أحزمةَ القدم والساق — مشدودةٌ تمرّ تحتها إصبع.",
      "ألبسوه الحذاءَ فوق الدعامة، وتأكّدوا أنّ الكعبَ لم يرتفع.",
      "اتّبعوا الجدولَ الذي كتبه الأخصائيّ: ساعتان أوّلَ يوم، ثمّ تزيد كلَّ يومٍ حتى ساعات النهار كلِّها.",
      "كلّما نزعتموها افحصوا الجلد: احمرارٌ يزول خلال نصف ساعة طبيعيّ، وما يبقى أو فقاعةٌ أو جرحٌ فلا تُلبس حتى يراها الأخصائيّ.",
    ], [
      "Put on a cotton sock longer than the orthosis, with no wrinkles.",
      "Bend the knee slightly and push the heel down and back into the orthosis until it touches the bottom.",
      "Fasten the ankle strap first (it holds the heel), then the foot and leg straps — snug enough for one finger to pass under.",
      "Put the shoe on over the orthosis and check that the heel has not lifted.",
      "Follow the schedule the therapist wrote: two hours on the first day, increasing each day up to the whole day.",
      "Each time you take it off, check the skin: redness that fades within half an hour is normal; redness that stays, a blister or a sore means no wearing until the therapist has seen it.",
    ]],
    cues: [[
      "الكعبُ مرفوعٌ داخل الدعامة ⟵ ركبةٌ مثنيّة وحزامُ الكاحل أوّلاً.",
      "جوربٌ قصير أو بتجاعيد ⟵ جوربٌ قطنيّ أطولُ منها بلا تجاعيد.",
      "الدعامةُ صارت صغيرة ⟵ مراجعةُ قسم المساند — الطفلُ يكبر.",
      "تُلبس ساعاتٍ ثمّ تُترك أسابيع ⟵ كلَّ يومٍ بالجدول.",
    ], [
      "The heel lifted inside the orthosis → a bent knee and the ankle strap first.",
      "A short or wrinkled sock → a cotton sock longer than the orthosis, without wrinkles.",
      "The orthosis has become small → a visit to the orthotics department — the child grows.",
      "Worn for hours, then left for weeks → every day, by the schedule.",
    ]],
    easier: ["وقتٌ أقصر يزداد ببطء، والأمُّ تلبسها وهو جالس.", "A shorter time increased slowly, with the mother putting it on while the child sits."],
    harder: ["الطفلُ الأكبر يلبسها وحده، ويفحص جلدَه بالمرآة.", "An older child puts it on alone and checks their own skin with a mirror."],
    stopIf: ["احمرارٌ يبقى أكثرَ من نصف ساعة، أو فقاعة، أو جرح، أو ألمٌ لا يزول بإعادة اللبس ⟵ لا تُلبس حتى يراها الأخصائيّ أو قسمُ المساند (NICE CG145 2012).", "Redness lasting more than half an hour, a blister, a sore, or pain not relieved by putting it back on → not worn until the therapist or the orthotics department has seen it (NICE CG145 2012)."],
    equipment: ["الدعامةُ التي صنعها المركز، وجواربُ قطنية طويلة، وحذاءٌ أوسع بفتحةٍ واسعة.", "The orthosis made by the centre, long cotton socks, and a wider shoe with a wide opening."],
    doseNote: ["دعامةُ المشي في ساعات النهار والنشاط، ودعامةُ التمطيط ستَّ ساعاتٍ يومياً فأكثر (NICE CG145 2012).", "A walking orthosis during the day and activity, and a stretching orthosis six hours a day or more (NICE CG145 2012)."],
    images: [{ key: "cp-afo-wear-skin-1", ar: "@@AFO_AR@@", en: "@@AFO_EN@@", search: "child ankle foot orthosis AFO shoes cerebral palsy" }],
  },
  {
    code: "cp-24h-postural-care", nameAr: "العنايةُ بالوضعيات على مدار اليوم والليل: الجلوسُ والنومُ المتناظران", nameEn: "24-hour postural care: symmetric sitting and lying",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["طفلُ المستويين IV–V يبقى ساعاتٍ طويلة في الوضع نفسِه، وميلُ الساقين معاً إلى جهةٍ واحدة يصاحب خروجَ الورك وانحناءَ الظهر: إزاحةُ الورك من صفرٍ في المستوى الأوّل إلى ٩٠٪ في الخامس (Soo 2006)، وفي الخامس بلغ الانحناءُ ٤٠ درجةً فأكثر عند ٧٥٪ في العشرين (Hagglund 2018). والبريطانيُّ يوصي بالعناية بالوضعيات على مدار اليوم (NICE CG145 2012)، وفي سبع دراساتٍ من ثمانٍ قلّت إزاحةُ الورك بدليلٍ منخفض الجودة (Gmelig Meyling 2018)، والمقعدُ المكيَّف دليلُه إيجابيّ غيرُ حاسم (Ryan 2012)؛ ووضعُ الأكل جزءٌ من حماية الصدر (Gibson 2021).",
      "A child at levels IV–V spends long hours in the same position, and both legs leaning to one side goes with hip displacement and a curving spine: hip displacement rises from zero at level I to 90% at level V (Soo 2006), and at level V 75% had a curve of 40 degrees or more by age 20 (Hagglund 2018). The British guideline recommends 24-hour postural management (NICE CG145 2012); seven of eight studies found less hip migration, with low-quality evidence (Gmelig Meyling 2018), and adaptive seating has positive but inconclusive evidence (Ryan 2012); the eating position is part of protecting the chest (Gibson 2021)."],
    start: ["الطفلُ في كرسيّه المكيَّف أو على فراشه، والأمُّ بجانبه، والوسائدُ واللفائفُ جاهزة.", "The child in their adapted seat or on their bed, the mother beside them, with cushions and rolls ready."],
    steps: [[
      "في الجلوس: الحوضُ في عمق الكرسيّ ومستوٍ، والوركان والركبتان والكاحلان بزوايا قائمة تقريباً، والقدمان على مسند، والجذعُ مستقيمٌ بإسنادٍ جانبيّ إن احتاج.",
      "الساقان متباعدتان قليلاً بوسادةٍ بين الركبتين — لا تميلان معاً إلى جهةٍ واحدة.",
      "في النوم: على الظهر أو الجنب والجسمُ مستقيم، ووسادةٌ بين الركبتين، والرأسُ في الوسط — وتُبدَّل الجهةُ كلَّ ليلة.",
      "غيّروا الوضعَ كلَّ ساعةٍ إلى ساعتين في النهار: جلوس، ثمّ وقوفٌ في الجهاز، ثمّ استلقاءٌ على البطن والأهلُ يراقبونه.",
      "عند الأكل: جالسٌ منتصباً والرأسُ منحنٍ قليلاً إلى الأمام، ويبقى جالساً نصفَ ساعةٍ بعد الطعام.",
    ], [
      "Sitting: the pelvis at the back of the seat and level, the hips, knees and ankles at about right angles, the feet on a footrest, and the trunk upright with side supports if needed.",
      "The legs slightly apart with a cushion between the knees — not both leaning to one side.",
      "Sleeping: on the back or side with the body straight, a cushion between the knees and the head in the middle — changing sides every night.",
      "Change position every one to two hours in the day: sitting, then standing in the stander, then lying on the tummy while the family watches.",
      "At meals: sitting upright with the head slightly forward, and staying seated for half an hour after eating.",
    ]],
    cues: [[
      "الساقان مائلتان معاً إلى جهةٍ واحدة ⟵ متباعدتان مستقيمتان بوسادة.",
      "ينزلق إلى الأمام في الكرسيّ ⟵ الحوضُ في العمق وحزامُه مشدود.",
      "الوضعُ نفسُه ساعاتٍ طويلة ⟵ تغييرٌ كلَّ ساعةٍ إلى ساعتين.",
      "الرأسُ إلى الخلف عند الأكل ⟵ منحنٍ قليلاً إلى الأمام.",
    ], [
      "Both legs leaning to one side → apart and straight with a cushion.",
      "Sliding forward in the seat → the pelvis at the back with its belt fastened.",
      "The same position for long hours → a change every one to two hours.",
      "The head tipped back while eating → slightly forward.",
    ]],
    easier: ["وضعٌ واحد أوّلاً (الجلوس)، ثمّ يُضاف الليلُ حين يتعوّد.", "One position first (sitting), with the night added once the child is used to it."],
    harder: ["جدولُ الوضعيات كاملاً في النهار والليل، والطفلُ الأكبر يطلب التغييرَ بنفسه.", "The full position schedule day and night, with an older child asking for changes themselves."],
    stopIf: ["ألمٌ عند التحريك، أو بكاءٌ في وضعٍ معيّن، أو صعوبةٌ جديدة في تغيير الحفاض والتنظيف، أو سعالٌ واختناقٌ عند الأكل، أو احمرارٌ لا يزول ⟵ إلى الأخصائيّ؛ فألمُ الورك وصعوبةُ التنظيف قد يعنيان خروجَ الورك (NICE CG145 2012).", "Pain on moving, crying in a particular position, new difficulty with nappy changes and cleaning, coughing and choking at meals, or redness that does not fade → to the therapist; hip pain and difficulty with cleaning can mean the hip is displacing (NICE CG145 2012)."],
    equipment: ["كرسيٌّ مكيَّف أو عربةٌ بإسناد، ووسائدُ ولفائف (منشفةٌ ملفوفة)، ووسادةٌ بين الركبتين، وجهازُ الوقوف.", "An adapted seat or a supportive buggy, cushions and rolls (a rolled towel), a cushion between the knees, and the stander."],
    doseNote: ["كلَّ يومٍ نهاراً وليلاً — والدليلُ على منع خروج الورك منخفضُ الجودة (Gmelig Meyling 2018)، فهي جزءٌ من مراقبة الورك لا بديلٌ عنها.", "Every day, day and night — the evidence for preventing hip displacement is low quality (Gmelig Meyling 2018), so it is part of hip surveillance, not a replacement for it."],
    images: [{ key: "cp-24h-postural-care-1", ar: "@@POST_AR@@", en: "@@POST_EN@@", search: "24 hour postural care child cerebral palsy night positioning seating" }],
  },
];

const PRACTICE_RULE_AR = "قاعدةُ الممارسة في كلّ تمرين: الطفلُ فاعلٌ يحاول بنفسه لا محمولٌ تحرّكه اليد، والهدفُ هدفُه وهدفُ أهله، والمهمّةُ كاملةٌ في مكانها الحقيقيّ، والتكرارُ كثيرٌ بنجاحٍ متكرّر وصعوبةٍ تزيد قليلاً كلّما نجح، واللعبُ وسيلتُه، والأهلُ يتعلّمون ما يكرّرونه في البيت كلَّ يوم (Morgan 2021 · Jackman 2022)؛ ولا تحريكَ سلبيّاً بيد المعالج بديلاً عن ذلك، فالعلاجُ العصبيّ النمائيّ بصيغته السلبية أحمر (Novak 2020) وليس أفضلَ من المقارَن بأيّ جرعة (te Velde 2022)، والتمطيطُ السلبيّ وحده يزيد المدى درجتين (Harvey 2017) — فيأتي مع الوقوف والدعامة والجبس.";
const PRACTICE_RULE_EN = "The practice rule for every exercise: the child is active and tries by themselves rather than being moved by the hands; the goal is theirs and their family's; the task is whole and in its real place; repetitions are many, with repeated success and difficulty raised a little each time they succeed; play is the means; and the family learns what to repeat at home every day (Morgan 2021 · Jackman 2022). Passive handling by the therapist is no substitute: neurodevelopmental therapy in its passive form is red (Novak 2020) and no better than comparison at any dose (te Velde 2022), and passive stretching alone adds two degrees of range (Harvey 2017) — so it comes with standing, orthoses and casting.";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد باثنتي عشرة جلسة (حتى ٣٦) لطفلٍ بشللٍ نصفيّ هدفُه في اليد — فاليدُ تحتاج نحو ٤٠ ساعة (Jackman 2020) ونصفُ الجرعة لم يحسّن الحركة (Sakzewski 2015) — أو لهدفٍ تقدّم درجةً فأكثر في مقياس بلوغ الأهداف ولم يبلغ «المتوقّع»؛ ومن لم يتقدّم في أيّ هدفٍ لا يُمدَّد: يُراجَع الهدفُ وسببُه (الألم، والورك، والنوبات، والدعامة) مع الطبيب. ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر، والكتلةُ التالية بأهدافٍ جديدة حين يحدّدها الطفلُ وأهلُه — فالمستوى يرتفع في كلّ فترةٍ مكثّفة وينقص بينها (Opheim 2025).";
const EXTEND_EN = "At session 24: one extension of twelve sessions (to 36) for a child with unilateral palsy whose goal is in the hand — the hand needs about 40 hours (Jackman 2020) and half the dose did not improve movement (Sakzewski 2015) — or for a goal that has moved up one level or more on goal attainment scaling without reaching 'expected'; a child who has progressed on no goal is not extended: the goal and its reason (pain, the hip, seizures, the orthosis) are reviewed with the doctor. Then a home programme with a review every three months, and the next block with new goals when the child and family set them — the level rises in each intensive period and falls between them (Opheim 2025).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "cerebral-palsy-pediatric",
  summary: [
    "الشللُ الدماغيّ: اضطراباتٌ دائمة في الحركة والوضعية سببُها إصابةٌ غيرُ متقدّمة في دماغ الجنين أو الرضيع، ويصحبها غالباً اضطرابُ الإحساس والإدراك والتواصل والسلوك والصرعُ ومشكلاتُ العضلات والعظام الثانوية (Rosenbaum 2007)؛ حدوثُه نحو ٢ في كلّ ألف ولادة (Oskoui 2013)، ويمكن تشخيصُه قبل الشهر السادس المصحَّح (Novak 2017). ومن الأطفال: ثلاثةٌ من أربعة يتألّمون، وواحدٌ من ثلاثة لا يمشي، وواحدٌ من ثلاثة انزاح وركُه، وواحدٌ من أربعة مصابٌ بالصرع (Novak 2012). والمستوى الوظيفيّ للحركة الكبرى (GMFCS، من الأوّل إلى الخامس) يرسم منحنى التطوّر المتوقّع (Rosenbaum 2002)، وفي المستويات III–V تبلغ الحركةُ ذروتَها بين السابعة والثامنة ثمّ تنقص (Hanna 2009). " +
    "وفي الدول العربية: ١٫٨ في كلّ ألف، ونحو نصفهم في المستويين الرابع والخامس (٤٨٫٥٪)، وزواجُ الأقارب ٣٧٫٧٪ (Mushta 2022). وفي العراق: في الموصل اختناقُ الولادة ٣٨٫٦٪ والصرعُ ٣٧٫٣٪ (Al-Ali 2007)، وفي بغداد يرقانُ الوليد ٦٢٪ (Al-Naddawi 2011)، وفي ديالى زواجُ الأقارب ٥٨٪ وأكثرُهم يأتي بين الشهر السابع والثاني عشر (Al-Azzawi 2012)، وفي السليمانية وتكريت ودهوك الاختناقُ والخداجُ أوّلُ الأسباب (Ahmed 2018 · Ahmed 2019 · Mohammed 2024)؛ والأمُّ هي المعتنيةُ عند ٩٨٫٣٪ (Faqi-Rahid 2022)، ونصفُ الأمّهات في مركزٍ بأربيل لا يقرأن (Hasan 2014)؛ ولا تجربةَ علاجٍ عراقيةً مضبوطة (بحثٌ صفريّ — ودراسةُ كركوك تعليمٌ للأهل بلا توزيعٍ عشوائيّ، Mohammed 2026). " +
    "الإرشادات: إشاراتُ الأدلّة الضوئية — الأخضرُ للتدريب الموجَّه بالأهداف وبالمهمّة والعلاج القسريّ والتدريب باليدين واللياقة والسير المتحرّك والتقوية (للقوّة) والبرامج المنزلية وحملِ الوزن والجبسِ ومراقبةِ الورك والبوتوكس، والأحمرُ للعلاج العصبيّ النمائيّ بصيغته السلبية القديمة والتكامل الحسّيّ والأكسجين عالي الضغط (Novak 2020)؛ والإرشادُ الدوليّ: أهدافٌ يختارها الطفلُ وأهلُه وتدريبُ المهمّة كاملةً في الحياة، والمشيُ على الأرض أوّلاً ويكمّله السير (Jackman 2022)؛ والتدخّلُ المبكّر: لا انتظار، ولا تحريكَ سلبيّاً بيد المعالج (Morgan 2021)؛ والبريطانيّ: مراقبةُ الورك، والوضعياتُ على مدار اليوم، والدعاماتُ ومراجعتُها، وبرنامجٌ مكثّف لفترةٍ قصيرة ٤–٨ أسابيع (NICE CG145 2012)، وعلاماتُ تشخيصٍ آخرَ متقدّم (NICE NG62 2017). " +
    "والجرعة: الأهدافُ تتحقّق بنحو ١٤–٢٥ ساعة تدريب، واليدُ في الشلل النصفيّ تحتاج نحو ٤٠ (Jackman 2020)، والساقُ ١٢ ساعة للسرعة و٢١ للأهداف و٢٣ للحركة الكبرى (Haddon 2026)؛ والكتلُ المكثّفة بينها راحةٌ تساوي العلاجَ المستمرّ بالمجموع نفسِه بالتزامٍ أعلى (Christiansen 2008 · Trahan 2002)، وكلُّ فترةٍ مكثّفة ترفع المستوى ثمّ ينقص بينها (Opheim 2025)، وأكثرُ من مرّتين في الأسبوع أفضلُ من أقلّ (Storvold 2020) — ولا تجربةَ وجدت العلاجَ اليوميّ المستمرّ شهوراً أفضلَ من الكتل مع البرنامج المنزليّ. " +
    "فالبروتوكول: كتلةٌ من ٢٤ جلسة بستٍّ في الأسبوع × ٥٠ دقيقة (نحو ١٦ ساعة تدريبٍ فعليّ، والبيتُ يضاعفها)، وتمديدٌ واحد باثنتي عشرة لهدف اليد في الشلل النصفيّ أو لهدفٍ يتقدّم ولم يُبلغ، ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر وكتلةٌ جديدة بأهدافٍ جديدة — وهو اختيارُ خدمةٍ مكتوبٌ صريحاً؛ ومساراتٌ بالمستوى والعمر؛ وثلاثُ مراحل: التقييمُ والأهدافُ وتدريبُ الأهل والسلامة، ثمّ التدريبُ المكثّف على الأهداف، ثمّ التثبيتُ والنقلُ إلى البيت والمدرسة.",
    "Cerebral palsy: permanent disorders of movement and posture caused by a non-progressive injury to the fetal or infant brain, often accompanied by disturbances of sensation, perception, communication and behaviour, epilepsy and secondary musculoskeletal problems (Rosenbaum 2007); it affects about 2 per 1,000 births (Oskoui 2013) and can be diagnosed before 6 months corrected age (Novak 2017). Of these children, three in four have pain, one in three cannot walk, one in three has hip displacement and one in four has epilepsy (Novak 2012). The gross motor level (GMFCS, I to V) maps the expected course of development (Rosenbaum 2002), and at levels III–V motor function peaks between seven and eight years and then declines (Hanna 2009). " +
    "In Arab countries: 1.8 per 1,000, about half at levels IV and V (48.5%), with consanguinity in 37.7% (Mushta 2022). In Iraq: in Mosul birth asphyxia 38.6% and epilepsy 37.3% (Al-Ali 2007), in Baghdad neonatal jaundice 62% (Al-Naddawi 2011), in Diyala consanguinity 58% with most children presenting between months 7 and 12 (Al-Azzawi 2012), and in Sulaimani, Tikrit and Duhok asphyxia and prematurity are the leading causes (Ahmed 2018 · Ahmed 2019 · Mohammed 2024); the mother is the carer in 98.3% (Faqi-Rahid 2022), and half the mothers at a centre in Erbil cannot read (Hasan 2014); there is no controlled Iraqi treatment trial (a documented zero result — the Kirkuk study taught parents without random allocation, Mohammed 2026). " +
    "Guidelines: the evidence traffic lights — green for goal-directed and task-specific training, constraint-induced therapy, bimanual training, fitness, treadmill training, strengthening (for strength), home programmes, weight-bearing, casting, hip surveillance and botulinum toxin, and red for neurodevelopmental therapy in its old passive form, sensory integration and hyperbaric oxygen (Novak 2020); the international guideline: goals chosen by the child and family and whole-task practice in daily life, with overground walking first, supplemented by the treadmill (Jackman 2022); early intervention: no waiting, and no passive handling by the therapist (Morgan 2021); the British: hip surveillance, 24-hour postural management, orthoses and their review, and an intensive programme over a short period of 4–8 weeks (NICE CG145 2012), with the signs of another, progressive diagnosis (NICE NG62 2017). " +
    "Dose: goals are reached with about 14–25 hours of practice, while the hand in unilateral palsy needs about 40 (Jackman 2020), and the leg 12 hours for speed, 21 for goals and 23 for gross motor function (Haddon 2026); intensive blocks with rests between them equal continuous therapy at the same total, with better adherence (Christiansen 2008 · Trahan 2002), each intensive period raises the level, which falls between them (Opheim 2025), and more than twice a week beats less (Storvold 2020) — no trial found continuous daily therapy over months better than blocks with a home programme. " +
    "So the protocol: a block of 24 sessions at six a week × 50 minutes (about 16 hours of actual practice, doubled at home), one extension of twelve for a hand goal in unilateral palsy or a goal that is progressing but not reached, then a home programme with a review every three months and a new block with new goals — a service choice, stated openly; pathways by level and age; and three phases: assessment, goals, family coaching and safety; then intensive practice on the goals; then consolidation and transfer to home and school.",
  ],
  goals: [
    "• أهدافُ الطفل وأهله (من واحدٍ إلى ثلاثة) تبلغ «المتوقّع» فأكثر في مقياس بلوغ الأهداف (٠ فأكثر من −٢ — Krasny-Pacini 2013)، ويتحسّن أداؤها ورضا الأهل في مقياس الأداء الكنديّ بنسخته العربية (Hadoush 2026).\n" +
    "• الحركةُ الكبرى (GMFM-66) ترتفع بالفرق المهمّ لمستواه — ١٫٧ في الأوّل و١٫٠ في الثاني و٠٫٧ في الثالث (Oeffinger 2008) — ولا تنقص في المستويات III–V (Hanna 2009).\n" +
    "• الوركُ في مكانه: إزاحةٌ أقلُّ من ٣٠٪ وتبعيدٌ ٣٠° فأكثر، والصورةُ في موعدها (AACPDM Hip Pathway · Battisti 2023).\n" +
    "• الدعامةُ والوقوفُ والجلوسُ مستعملةٌ كلَّ يوم بلا أذىً في الجلد (NICE CG145 2012).\n" +
    "• الأهلُ يؤدّون البرنامجَ المنزليّ وحدهم، والألمُ يُسأل عنه في كلّ زيارة (NICE NG62 2017).",
    "• The goals of the child and family (one to three) reach 'expected' or better on goal attainment scaling (0 or above, from −2 — Krasny-Pacini 2013), with performance and parent satisfaction improving on the Arabic Canadian Occupational Performance Measure (Hadoush 2026).\n" +
    "• Gross motor function (GMFM-66) rises by the important difference for the child's level — 1.7 at level I, 1.0 at II and 0.7 at III (Oeffinger 2008) — and does not fall at levels III–V (Hanna 2009).\n" +
    "• The hip in place: migration under 30% and abduction of 30° or more, with X-rays on time (AACPDM Hip Pathway · Battisti 2023).\n" +
    "• The orthosis, standing and seating used every day without skin harm (NICE CG145 2012).\n" +
    "• The family runs the home programme independently, and pain is asked about at every visit (NICE NG62 2017).",
  ],
  assessment: [
    "في الجلسة الأولى، وتكملتُه في الجلسات ١–٣:\n" +
    "• التاريخ: الحملُ والولادة (الخداج، والاختناق، واليرقان، والالتهاب)، وزواجُ الأقارب وأخٌ مصاب، والمراحلُ الحركية، والرنين، والصرعُ وأدويتُه، والبلعُ والسعالُ مع الأكل والتهاباتُ الصدر، والنومُ والإمساك، والبوتوكسُ والجبسُ والعملياتُ السابقة ومتى (ومن أين جاء البوتوكس — Rashid 2018)، والدعاماتُ والأجهزةُ في البيت، والعلاجاتُ الشعبية (Konuk Sener 2020)، والمدرسة.\n" +
    "• علاماتُ الإحالة أوّلاً (في «موانع وإحالة»): فقدُ مهارةٍ مكتسبة، أو لا سببَ ولا خطر، أو قصّةٌ عائلية لمرضٍ عصبيّ متقدّم، أو علاماتٌ لا تشبه الشللَ الدماغيّ (NICE NG62 2017 · Leach 2014).\n" +
    "• التصنيفات: الحركةُ الكبرى بنسختها العربية (GMFCS-E&R — Almasri 2015)، واليدان (MACS، وMini-MACS قبل الرابعة — Eliasson 2006 · Eliasson 2017)، والتواصل (CFCS — Hidecker 2011)، والأكلُ والشرب (EDACS — Sellers 2014)؛ ونوعُ الشلل — تشنّجيّ أو خلَليُّ التوتّر أو رنحيّ (أداةُ التمييز HAT — Jethwa 2010).\n" +
    "• الورك في كلّ زيارة: مدى التبعيد (أقلُّ من ٣٠° علامة)، والألم، وطولُ الساقين، وصعوبةُ التنظيف؛ وتاريخُ آخر صورةٍ للحوض ونسبةُ الإزاحة (AACPDM Hip Pathway · NICE CG145 2012).\n" +
    "• العظم: كسرٌ بلا إصابةٍ قويّة، وأدويةُ الصرع، ونقصُ الوزن، ولا وقوف (Uddenfeldt Wort 2013 · Henderson 2002).\n" +
    "• الألم: بالوجوه المعدّلة لمن يتكلّم (Hicks 2001 — وبالعربية Finianos 2021)، وبالمقياس السلوكيّ لمن لا يتكلّم (r-FLACC — Malviya 2006؛ وNCCPC-R ٧ فأكثر ألم — Breau 2002).\n" +
    "• المقاييس: الحركةُ الكبرى (GMFM-66) — مزروع (الفرقُ المهمّ ١٫٧ / ١٫٠ / ٠٫٧ في I / II / III — Oeffinger 2008، ولا رقمَ منشوراً للرابع والخامس، ولا نسخةَ عربيةً مُتحقَّقاً منها)، والتشنّجُ بأشوورث المعدّل — مزروع (غيرُ موثوقٍ كثيراً عند الأطفال — Mutlu 2008، فيُقرأ بحذر ومعه المدى)، وعطفُ الكاحل — مزروع (الخطأُ نحو ٥° — Fosang 2003)؛ ومعها بلوغُ الأهداف، والأداءُ الكنديّ بالعربية (Hadoush 2026)، والمشيُ ستّ دقائق لمن يمشي (التغيّرُ الحقيقيّ ٤٧–٦٤ متراً — Thompson 2008) أو دقيقةً واحدة (McDowell 2009)، ومقياسُ التنقّل الوظيفيّ العربيّ ٥ / ٥٠ / ٥٠٠ متر (Albalwi 2023)، وتصويرُ المشي بالفيديو بموافقة الأهل.\n" +
    "• المسارُ بالمستوى والعمر — يضبط الأخصائيُّ الخطّة: الرضيعُ تحت السنتين ⟵ لعبٌ حركيّ مبكّر يقوده الأهل والعلاجُ القسريّ باللعب لعدم تناظر اليدين، والجلسةُ لتدريب الأهل (Morgan 2021 · Eliasson 2018)؛ يمشي (I–II) ⟵ الأهدافُ والمشيُ على الأرض ثمّ السير، والتقويةُ واللياقة، والمشيُ في المجتمع، وللشلل النصفيّ اليدُ بالقسريّ ثمّ اليدين؛ يمشي بأداة (III) ⟵ الأهدافُ والمشيُ بالمشّاية والسيرُ بالحزام والتقوية، والوقوفُ بالتبعيد يومياً، ومراقبةُ الورك؛ لا يمشي (IV–V) ⟵ أهدافُ الجلوس والنقل والتحكّم بالرأس والتنقّل بالكرسيّ والراحة والعناية، والوقوفُ في الجهاز، والوضعياتُ على مدار اليوم، والوركُ والألمُ والبلعُ والصدر — وأكثرُ العمل مع الأهل.\n" +
    "• يُعاد التقييمُ في الجلسة ١٢ (الأهداف) و٢٤ (كلُّه) و٣٦ إن مُدّد، وفي كلّ مراجعةٍ بعد ثلاثة أشهر.",
    "At the first session, completed over sessions 1–3:\n" +
    "• History: pregnancy and birth (prematurity, asphyxia, jaundice, infection), consanguinity and an affected sibling, motor milestones, MRI, epilepsy and its medicines, swallowing, coughing with meals and chest infections, sleep and constipation, previous botulinum toxin, casting and operations and when (and where the toxin came from — Rashid 2018), orthoses and equipment at home, folk treatments (Konuk Sener 2020), and school.\n" +
    "• The referral signs first (under 'Contraindications and referral'): loss of an acquired skill, no cause and no risk factor, a family history of a progressive neurological disease, or signs unlike cerebral palsy (NICE NG62 2017 · Leach 2014).\n" +
    "• Classifications: gross motor function in its Arabic version (GMFCS-E&R — Almasri 2015), hand use (MACS, and Mini-MACS under four — Eliasson 2006 · Eliasson 2017), communication (CFCS — Hidecker 2011), eating and drinking (EDACS — Sellers 2014); and the type of palsy — spastic, dystonic or ataxic (the HAT tool — Jethwa 2010).\n" +
    "• The hip at every visit: abduction range (under 30° is a warning sign), pain, leg length and difficulty with cleaning; and the date of the last pelvic X-ray and the migration percentage (AACPDM Hip Pathway · NICE CG145 2012).\n" +
    "• Bone: a fracture without major injury, antiepileptic medicines, low weight, and no standing (Uddenfeldt Wort 2013 · Henderson 2002).\n" +
    "• Pain: the revised faces scale for a child who talks (Hicks 2001 — and in Arabic, Finianos 2021), and a behavioural scale for one who does not (r-FLACC — Malviya 2006; NCCPC-R 7 or more means pain — Breau 2002).\n" +
    "• Measures: gross motor function (GMFM-66) — seeded (important difference 1.7 / 1.0 / 0.7 at I / II / III — Oeffinger 2008, with no published figure for IV and V and no verified Arabic version), spasticity on the Modified Ashworth Scale — seeded (not very reliable in children — Mutlu 2008, so read with caution alongside range), and ankle dorsiflexion — seeded (error about 5° — Fosang 2003); with goal attainment scaling, the Arabic Canadian Occupational Performance Measure (Hadoush 2026), the six-minute walk for those who walk (true change 47–64 m — Thompson 2008) or the one-minute walk (McDowell 2009), the Arabic Functional Mobility Scale at 5 / 50 / 500 m (Albalwi 2023), and gait video with the family's consent.\n" +
    "• The pathway by level and age — the specialist sets the plan: an infant under two → early motor play led by the family and constraint-induced play for asymmetric hands, with the session used to coach the family (Morgan 2021 · Eliasson 2018); walks (I–II) → goals, overground walking then the treadmill, strengthening and fitness, community walking, and for unilateral palsy the hand with constraint then both hands; walks with an aid (III) → goals, walking with a walker, the harness treadmill and strengthening, daily abducted standing, and hip surveillance; does not walk (IV–V) → goals for sitting, transfers, head control, wheelchair mobility, comfort and care, standing in the stander, 24-hour postural care, and the hip, pain, swallowing and chest — with most of the work alongside the family.\n" +
    "• Reassessment at session 12 (the goals), 24 (all of it) and 36 if extended, and at every three-monthly review.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• الأهدافُ والمهمّةُ الكاملة في كلّ جلسة، والأهلُ يكرّرونها في البيت (Jackman 2022 · Novak 2009).\n" +
    "• الرضيع: لعبٌ حركيّ مبكّر في بيئةٍ غنيّة وتدريبُ الأهل (Morgan 2016a · Morgan 2021).\n" +
    "• اليد: العلاجُ القسريّ باللعب ثمّ التدريبُ باليدين للشلل النصفيّ (Hoare 2019 · Gordon 2011)، واليدان للشلل في الجهتين (Figueiredo 2020).\n" +
    "• المشي: على الأرض أوّلاً ثمّ السيرُ المتحرّك (Jackman 2022 · Grecco 2013)، والتقويةُ الوظيفية يوماً بعد يوم (Verschuren 2016 · Merino-Andres 2022)، واللياقة.\n" +
    "• مَن لا يمشي: الوقوفُ بالتبعيد يومياً، والوضعياتُ على مدار اليوم، والجلوسُ المكيَّف، ومهاراتُ الكرسيّ (Paleg 2013 · NICE CG145 2012).\n" +
    "• الدعامةُ كلَّ يوم بجدولها وفحصِ الجلد (Morris 2011)، والجبسُ المتسلسل بعد البوتوكس بقرار الطبيب (Mathevon 2019).\n" +
    PRACTICE_RULE_AR,
    "The phased programme and its cards are under 'Programme by phase'; in summary:\n" +
    "• Goals and whole-task practice in every session, repeated by the family at home (Jackman 2022 · Novak 2009).\n" +
    "• Infants: early motor play in an enriched environment with family coaching (Morgan 2016a · Morgan 2021).\n" +
    "• The hand: constraint-induced play then bimanual training for unilateral palsy (Hoare 2019 · Gordon 2011), and bimanual training for bilateral palsy (Figueiredo 2020).\n" +
    "• Walking: overground first, then the treadmill (Jackman 2022 · Grecco 2013), functional strengthening every other day (Verschuren 2016 · Merino-Andres 2022), and fitness.\n" +
    "• Children who do not walk: daily abducted standing, 24-hour postural care, adapted seating and wheelchair skills (Paleg 2013 · NICE CG145 2012).\n" +
    "• The orthosis every day with its schedule and skin checks (Morris 2011), and serial casting after botulinum toxin by the doctor's decision (Mathevon 2019).\n" +
    PRACTICE_RULE_EN,
  ],
  contraindications: [
    "قواعدُ إحالةٍ يطبّقها المعالج:\n" +
    "• في اليوم نفسه (الطوارئ): نوبةٌ لا تتوقّف أو نوباتٌ متتالية، أو زرقةٌ أو ضيقُ نفسٍ أو اختناقٌ مع الأكل، أو تورّمٌ وألمٌ في طرفٍ بلا إصابةٍ قويّة (كسرٌ في عظمٍ هشّ — والكسرُ عند ٢٠٪ ممّن لا يمشون، AACPDM Osteoporosis Pathway)، أو ضعفٌ عامّ وصعوبةُ بلعٍ وتدلّي الجفن بعد أيّامٍ من حقن البوتوكس (Rashid 2018 — منتجٌ مزيّف في المنطقة؛ Naidu 2010).\n" +
    "• إلى طبيب الأعصاب: فقدُ مهارةٍ مكتسبة، أو لا خطرَ في الحمل والولادة ولا سببَ ظاهر، أو قصّةٌ عائلية لمرضٍ عصبيّ متقدّم، أو علاماتٌ موضعية غيرُ متوقّعة، أو رنينٌ لا يطابق الشللَ الدماغيّ (NICE NG62 2017) — فـ٥٤ مرضاً استقلابياً قابلاً للعلاج يشبهه (Leach 2014)، وفي بغداد حمل مريضٌ تشخيصَ الشلل الدماغيّ ١٣ سنةً وكان مرضاً تنكّسياً (Hadi 2019)، ومع ضمور العصب البصريّ والحركات اللاإرادية يُفحص الاستقلاب (Straussberg 1998)؛ والنوباتُ غيرُ المضبوطة (NICE CG145 2012).\n" +
    "• إلى طبيب العظام (مراقبةُ الورك): إزاحةٌ أكثرُ من ٣٠٪ أو تزيد ١٠٪ في السنة، أو تبعيدٌ أقلُّ من ٣٠°، أو ألمُ الورك (AACPDM Hip Pathway · Battisti 2023)؛ والصورةُ في الشهر الرابع والعشرين لكلّ شللٍ في الجهتين، وكلَّ سنةٍ للمستويات III–V، وبعد ستّة أشهر إن زادت على ٣٠٪ (NICE CG145 2012) — فالمراقبةُ أنقصت خروجَ الورك من ٨٪ إلى ٠٫٥٪ (Hagglund 2014) ومن ١٥٫١٪ إلى ٠٫٧٪ (Elkamil 2011)؛ وانحناءُ الظهر في المستويين IV–V (Hagglund 2018).\n" +
    "• إلى طبيب الأطفال: السعالُ والاختناقُ مع الأكل والتهاباتُ الصدر المتكرّرة — فالصدرُ أوّلُ أسباب الوفاة (Gibson 2021) والبلعُ مضطربٌ عند النصف (Speyer 2019) — ونقصُ الوزن (Mushta 2021)، والكسرُ بلا إصابةٍ لفحص العظم (AACPDM Osteoporosis Pathway)، والألمُ الذي لا يُعرف سببُه (NICE NG62 2017).\n" +
    "• إلى طبيب التأهيل: تشنّجٌ موضعيّ يمنع الهدف ⟵ البوتوكس ثمّ الجبسُ بعد ٢–٤ أسابيع والتدريب (NICE CG145 2012 · Strobl 2015)، وخلَلُ التوتّر (Fehlings 2024)، وقطعُ الجذور الخلفية الانتقائيّ للمستويين II–III (NICE CG145 2012)، والجراحةُ متعدّدةُ المستويات وتأهيلُها الطويل (Thomason 2011) — والمعالجُ يجهّز الطفلَ ويتابعه بعدها.\n" +
    "موانعُ الأجهزة: لا حرارةَ على جلدٍ ناقص الإحساس ولا لطفلٍ لا يستطيع أن يقول «حارّ»؛ ولا أقطابَ على جلدٍ مجروح؛ ولا مغناطيسَ لطفلٍ له صمّامُ تحويلةٍ قابلٌ للبرمجة أو مضخّةُ دواء أو زرعةُ قوقعة إلّا بإذن الطبيب (تحذيرُ الشركات المصنّعة)؛ والصرعُ غيرُ المضبوط يُسأل عنه الطبيبُ قبل الأجهزة والسير (NICE CG145 2012)؛ والإبرُ وغيرُها بقرارها في سطورها.",
    "Referral rules the therapist applies:\n" +
    "• Same day (emergency): a seizure that does not stop or repeated seizures, cyanosis, breathlessness or choking with meals, swelling and pain in a limb without major injury (a fracture of fragile bone — fractures affect 20% of those who do not walk, AACPDM Osteoporosis Pathway), or general weakness, difficulty swallowing and drooping eyelids days after botulinum toxin injections (Rashid 2018 — a counterfeit product in the region; Naidu 2010).\n" +
    "• To a neurologist: loss of an acquired skill, no risk factor in pregnancy or birth and no clear cause, a family history of a progressive neurological disease, unexpected focal signs, or MRI that does not fit cerebral palsy (NICE NG62 2017) — 54 treatable metabolic diseases mimic it (Leach 2014), in Baghdad a patient carried a cerebral palsy diagnosis for 13 years with a neurodegenerative disease (Hadi 2019), and optic atrophy with involuntary movements calls for a metabolic work-up (Straussberg 1998); and poorly controlled seizures (NICE CG145 2012).\n" +
    "• To an orthopaedic surgeon (hip surveillance): migration over 30% or rising 10% a year, abduction under 30°, or hip pain (AACPDM Hip Pathway · Battisti 2023); an X-ray at 24 months for all bilateral palsy, yearly for levels III–V, and after six months if over 30% (NICE CG145 2012) — surveillance cut hip dislocation from 8% to 0.5% (Hagglund 2014) and from 15.1% to 0.7% (Elkamil 2011); and scoliosis at levels IV–V (Hagglund 2018).\n" +
    "• To a paediatrician: coughing and choking with meals and repeated chest infections — the chest is the leading cause of death (Gibson 2021) and swallowing is disordered in half (Speyer 2019) — low weight (Mushta 2021), a fracture without injury for bone assessment (AACPDM Osteoporosis Pathway), and pain without a known cause (NICE NG62 2017).\n" +
    "• To a rehabilitation doctor: focal spasticity blocking a goal → botulinum toxin, then casting 2–4 weeks later and training (NICE CG145 2012 · Strobl 2015), dystonia (Fehlings 2024), selective dorsal rhizotomy for levels II–III (NICE CG145 2012), and multilevel surgery with its long rehabilitation (Thomason 2011) — with the therapist preparing the child and following up afterwards.\n" +
    "Contraindications to devices: no heat on skin with reduced sensation or for a child who cannot say 'hot'; no electrodes on broken skin; no magnetic therapy for a child with a programmable shunt valve, a drug pump or a cochlear implant without the doctor's permission (manufacturers' warnings); poorly controlled epilepsy is discussed with the doctor before devices and the treadmill (NICE CG145 2012); and needling and the others by their decision in their own lines.",
  ],
  precautions: [
    "• قاعدةُ الممارسة في «التمارين» لكلّ المراحل.\n" +
    "• الأهلُ هم العلاج: الأمُّ هي المعتنيةُ غالباً (Faqi-Rahid 2022) ونصفُ الأمّهات لا يقرأن (Hasan 2014) — فالبرنامجُ بالعرض العمليّ والصور والفيديو لا بالورق وحده؛ وثلثا الأمّهات في دراسةٍ سعودية لم يلتزمن بالبرنامج المنزليّ، والالتزامُ يتبع تفاعلَ المعالج معهنّ (Alwhaibi 2022)؛ وضغطُ الأهل النفسيّ يُسأل عنه (Al-Gamal 2013).\n" +
    "• الاعتقادُ والعلاجاتُ الشعبية: يُصغى إلى ما تعتقده الأمُّ ويُحترم (Mohamed Madi 2019)، ويُسأل بلا لومٍ عن الزيوت والأعشاب والتمائم والكيّ (Konuk Sener 2020)، ويُفحص الجلد.\n" +
    "• البوتوكس من مصدرٍ مرخَّص وحده — تسمّمٌ بمنتجٍ مزيّف عند أطفالٍ بالشلل الدماغيّ في مصر (Rashid 2018)؛ والخطرُ أعلى في المستوى الخامس (Strobl 2015 · Love 2010).\n" +
    "• البدلاتُ الضاغطة: بلا نفعٍ مضاف، وسُجّل معها ضيقُ نفسٍ وارتفاعُ حرارةٍ وزرقة (Novak 2020 · Martins 2016) — لا تُستعمل بلا إشراف.\n" +
    "• المشاركةُ لا الحركةُ وحدها: الهدفُ البيتُ والمدرسةُ واللعب، وفي السعودية ٦٢٫٣٪ لا يذهبون إلى المدرسة (Saleh 2023)؛ والإناثُ أقلُّ حضوراً في مراكز التأهيل في مناطق النزاع ومنها العراق (Barth 2020) — فلا يُترك تأخّرُ البنت بلا متابعة.\n" +
    "• الصلاةُ للأكبر: جالساً أو على الكرسيّ بما يستطيع، والحكمُ الشرعيّ له ولأهله ومرجعهم — لا دراسة (بحثٌ صفريّ).\n" +
    "• الصورُ والفيديو بموافقة الأهل المكتوبة وحدها، ولا تُرسل خارجَ ملفّه.",
    "• The practice rule under 'Exercises' for every phase.\n" +
    "• The family is the treatment: the mother is usually the carer (Faqi-Rahid 2022) and half the mothers cannot read (Hasan 2014) — so the programme is taught by demonstration, pictures and video, not on paper alone; two thirds of mothers in a Saudi study did not follow the home programme, and adherence followed the therapist's engagement with them (Alwhaibi 2022); and parental stress is asked about (Al-Gamal 2013).\n" +
    "• Beliefs and folk treatments: the mother's beliefs are listened to and respected (Mohamed Madi 2019), oils, herbs, amulets and cautery are asked about without blame (Konuk Sener 2020), and the skin is checked.\n" +
    "• Botulinum toxin only from a licensed source — poisoning with a counterfeit product in children with cerebral palsy in Egypt (Rashid 2018); and the risk is higher at level V (Strobl 2015 · Love 2010).\n" +
    "• Suits: no added benefit, with breathlessness, overheating and cyanosis reported (Novak 2020 · Martins 2016) — never used unsupervised.\n" +
    "• Participation, not movement alone: the aim is home, school and play, and in Saudi Arabia 62.3% do not attend school (Saleh 2023); girls attend rehabilitation centres less in conflict areas including Iraq (Barth 2020) — so a girl's delay is not left without follow-up.\n" +
    "• Prayer for older children: seated or on a chair as able, with the religious ruling for them, their family and their scholar — no study (a documented zero result).\n" +
    "• Photos and video only with the family's written consent, and never sent outside the child's file.",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "State of the Evidence Traffic Lights 2019: Systematic Review of Interventions for Preventing and Treating Children with Cerebral Palsy", org: "Curr Neurol Neurosci Rep — State of the Evidence Traffic Lights 2019, systematic review (Novak et al.)", year: 2020, url: "https://doi.org/10.1007/s11910-020-1022-z" },
    { title: "Interventions to improve physical function for children and young people with cerebral palsy: international clinical practice guideline", org: "Dev Med Child Neurol — international clinical practice guideline (Jackman et al.)", year: 2022, url: "https://doi.org/10.1111/dmcn.15055" },
    { title: "Early Intervention for Children Aged 0 to 2 Years With or at High Risk of Cerebral Palsy: International Clinical Practice Guideline Based on Systematic Reviews", org: "JAMA Pediatr — international early-intervention clinical practice guideline (Morgan et al.)", year: 2021, url: "https://doi.org/10.1001/jamapediatrics.2021.0878" },
    { title: "Early, Accurate Diagnosis and Early Intervention in Cerebral Palsy: Advances in Diagnosis and Treatment", org: "JAMA Pediatr — early-diagnosis guideline (Novak et al.)", year: 2017, url: "https://doi.org/10.1001/jamapediatrics.2017.1689" },
    { title: "Cerebral palsy in under 25s: assessment and management (NICE guideline NG62)", org: "NICE guideline NG62 — National Institute for Health and Care Excellence", year: 2017, url: "https://www.nice.org.uk/guidance/ng62" },
    { title: "Spasticity in under 19s: management (NICE clinical guideline CG145)", org: "NICE clinical guideline CG145 — National Institute for Health and Care Excellence", year: 2012, url: "https://www.nice.org.uk/guidance/cg145" },
    { title: "Hip Surveillance in Cerebral Palsy (AACPDM Care Pathway)", org: "AACPDM care pathway — American Academy for Cerebral Palsy and Developmental Medicine (accessed 2026)", year: 2026, url: "https://www.aacpdm.org/publications/care-pathways/hip-surveillance-in-cerebral-palsy" },
    { title: "Prevention of hip dislocation in severe cerebral palsy (GMFCS III-IV-V): an interdisciplinary and multi-professional Care Pathway for clinical best practice implementation", org: "Eur J Phys Rehabil Med — Italian GRADE-ADOLOPMENT care pathway (Battisti et al.)", year: 2023, url: "https://doi.org/10.23736/s1973-9087.23.07978-9" },
    { title: "Osteoporosis in Cerebral Palsy (AACPDM Care Pathway)", org: "AACPDM care pathway — American Academy for Cerebral Palsy and Developmental Medicine (accessed 2026)", year: 2026, url: "https://www.aacpdm.org/publications/care-pathways/osteoporosis-in-cerebral-palsy" },
    { title: "Exercise and physical activity recommendations for people with cerebral palsy", org: "Dev Med Child Neurol — exercise and physical-activity recommendations (Verschuren et al.)", year: 2016, url: "https://doi.org/10.1111/dmcn.13053" },
    { title: "Orthotic management of cerebral palsy: recommendations from a consensus conference", org: "NeuroRehabilitation — ISPO consensus on orthotic management (Morris et al.)", year: 2011, url: "https://doi.org/10.3233/nre-2011-0630" },
    { title: "Best clinical practice in botulinum toxin treatment for children with cerebral palsy", org: "Toxins — international best-practice statement (Strobl et al.)", year: 2015, url: "https://doi.org/10.3390/toxins7051629" },
    { title: "Botulinum toxin assessment, intervention and after-care for lower limb spasticity in children with cerebral palsy: international consensus statement", org: "Eur J Neurol — international consensus (Love et al.)", year: 2010, url: "https://doi.org/10.1111/j.1468-1331.2010.03126.x" },
    { title: "Pharmacological and neurosurgical management of cerebral palsy and dystonia: Clinical practice guideline update", org: "Dev Med Child Neurol — international GRADE clinical practice guideline (Fehlings et al.)", year: 2024, url: "https://doi.org/10.1111/dmcn.15921" },
    { title: "Prevention and management of respiratory disease in young people with cerebral palsy: consensus statement", org: "Dev Med Child Neurol — international Delphi consensus (Gibson et al.)", year: 2021, url: "https://doi.org/10.1111/dmcn.14640" },
    { title: "Neurodevelopmental Therapy for Cerebral Palsy: A Meta-analysis", org: "Pediatrics (Te Velde et al.)", year: 2022, url: "https://doi.org/10.1542/peds.2021-055061" },
    { title: "Outcome tools used for ambulatory children with cerebral palsy: responsiveness and minimum clinically important differences", org: "Dev Med Child Neurol (Oeffinger et al.)", year: 2008, url: "https://doi.org/10.1111/j.1469-8749.2008.03150.x" },
    { title: "What is the threshold dose of upper limb training for children with cerebral palsy to improve function? A systematic review", org: "Aust Occup Ther J (Jackman et al.)", year: 2020, url: "https://doi.org/10.1111/1440-1630.12666" },
    { title: "Intermittent versus continuous physiotherapy in children with cerebral palsy", org: "Dev Med Child Neurol (Christiansen et al.)", year: 2008, url: "https://doi.org/10.1111/j.1469-8749.2008.02036.x" },
    { title: "Changes in gross motor function in children with cerebral palsy following repeated intensive rehabilitation periods: a longitudinal study", org: "Front Pediatr (Opheim et al.)", year: 2025, url: "https://doi.org/10.3389/fped.2025.1636955" },
    { title: "13-year diagnostic delay as cerebral palsy of an Iraqi patient with NBIA type 4", org: "Neurol Clin Pract (Hadi et al.)", year: 2019, url: "https://doi.org/10.1212/cpj.0000000000000622" },
    { title: "Iatrogenic Botulism Outbreak in Egypt due to a Counterfeit Botulinum Toxin A Preparation - A Descriptive Series of Patient Features and Outcome", org: "Basic Clin Pharmacol Toxicol (Rashid et al.)", year: 2018, url: "https://doi.org/10.1111/bcpt.13048" },
    { title: "Effects of a functional therapy program on motor abilities of children with cerebral palsy", org: "Phys Ther (Ketelaar et al.)", year: 2001, url: "https://doi.org/10.1093/ptj/81.9.1534" },
    { title: "Activity focused and goal directed therapy for children with cerebral palsy--do goals make a difference?", org: "Disabil Rehabil (Löwing et al.)", year: 2009, url: "https://doi.org/10.1080/09638280902822278" },
    { title: "Focus on function: a cluster, randomized controlled trial comparing child- versus context-focused intervention for young children with cerebral palsy", org: "Dev Med Child Neurol (Law et al.)", year: 2011, url: "https://doi.org/10.1111/j.1469-8749.2011.03962.x" },
    { title: "Single blind randomised controlled trial of GAME (Goals - Activity - Motor Enrichment) in infants at high risk of cerebral palsy", org: "Res Dev Disabil (Morgan et al.)", year: 2016, url: "https://doi.org/10.1016/j.ridd.2016.04.005" },
    { title: "Efficacy of Early Intervention for Infants With Cerebral Palsy in an LMIC: An RCT", org: "Pediatrics (Benfer et al.)", year: 2024, url: "https://doi.org/10.1542/peds.2023-063854" },
    { title: "Demographic and clinical characteristic of Cerebral Palsy Among Children in Diyala Province - Iraq", org: "Diyala J Med (Al-Azzawi)", year: 2012, url: "https://djm.uodiyala.edu.iq/index.php/djm/article/view/450" },
    { title: "Constraint-induced movement therapy in children with unilateral cerebral palsy", org: "Cochrane Database Syst Rev (Hoare et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd004149.pub3" },
    { title: "Constraint-Induced Movement Therapy for Cerebral Palsy: A Randomized Trial", org: "Pediatrics (Ramey et al.)", year: 2021, url: "https://doi.org/10.1542/peds.2020-033878" },
    { title: "Comparison of dosage of intensive upper limb therapy for children with unilateral cerebral palsy: how big should the therapy pill be?", org: "Res Dev Disabil (Sakzewski et al.)", year: 2015, url: "https://doi.org/10.1016/j.ridd.2014.10.050" },
    { title: "The effectiveness of Baby-CIMT in infants younger than 12 months with clinical signs of unilateral-cerebral palsy; an explorative study with randomized design", org: "Res Dev Disabil (Eliasson et al.)", year: 2018, url: "https://doi.org/10.1016/j.ridd.2017.11.006" },
    { title: "Implementation of constraint-induced movement therapy for young children with unilateral cerebral palsy in Jordan: a home-based model", org: "Disabil Rehabil (Al-Oraibi et al.)", year: 2011, url: "https://doi.org/10.3109/09638288.2011.555594" },
    { title: "Bimanual training and constraint-induced movement therapy in children with hemiplegic cerebral palsy: a randomized trial", org: "Neurorehabil Neural Repair (Gordon et al.)", year: 2011, url: "https://doi.org/10.1177/1545968311402508" },
    { title: "Hand-arm bimanual intensive therapy and daily functioning of children with bilateral cerebral palsy: a randomized controlled trial", org: "Dev Med Child Neurol (Figueiredo et al.)", year: 2020, url: "https://doi.org/10.1111/dmcn.14630" },
    { title: "Intensive upper- and lower-extremity training for children with bilateral cerebral palsy: a quasi-randomized trial", org: "Dev Med Child Neurol (Bleyenheuft et al.)", year: 2017, url: "https://doi.org/10.1111/dmcn.13379" },
    { title: "Effect of muscle strength training in children and adolescents with spastic cerebral palsy: A systematic review and meta-analysis", org: "Clin Rehabil (Merino-Andrés et al.)", year: 2022, url: "https://doi.org/10.1177/02692155211040199" },
    { title: "Exercise interventions for cerebral palsy", org: "Cochrane Database Syst Rev (Ryan et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.cd011660.pub2" },
    { title: "A comparison of treadmill training and overground walking in ambulant children with cerebral palsy: randomized controlled clinical trial", org: "Clin Rehabil (Grecco et al.)", year: 2013, url: "https://doi.org/10.1177/0269215513476721" },
    { title: "Efficacy of partial body weight-supported treadmill training compared with overground walking practice for children with cerebral palsy: a randomized controlled trial", org: "Arch Phys Med Rehabil (Willoughby et al.)", year: 2010, url: "https://doi.org/10.1016/j.apmr.2009.10.029" },
    { title: "Low-Intensity vs High-Intensity Home-Based Treadmill Training and Walking Attainment in Young Children With Spastic Diplegic Cerebral Palsy", org: "Arch Phys Med Rehabil (Mattern-Baxter et al.)", year: 2020, url: "https://doi.org/10.1016/j.apmr.2019.09.015" },
    { title: "Effects of the standing program with hip abduction on hip acetabular development in children with spastic diplegia cerebral palsy", org: "Disabil Rehabil (Macias-Merlo et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1100221" },
    { title: "Abducted Standing in Children With Cerebral Palsy: Effects on Hip Development After 7 Years", org: "Pediatr Phys Ther (Martinsson et al.)", year: 2021, url: "https://doi.org/10.1097/pep.0000000000000789" },
    { title: "Fractures in children with cerebral palsy: a total population study", org: "Dev Med Child Neurol (Uddenfeldt Wort et al.)", year: 2013, url: "https://doi.org/10.1111/dmcn.12178" },
    { title: "Systematic review and evidence-based clinical recommendations for dosing of pediatric supported standing programs", org: "Pediatr Phys Ther (Paleg et al.)", year: 2013, url: "https://doi.org/10.1097/pep.0b013e318299d5e7" },
    { title: "Effect of ankle-foot orthoses on gait, balance and gross motor function in children with cerebral palsy: a systematic review and meta-analysis", org: "Clin Rehabil (Lintanf et al.)", year: 2018, url: "https://doi.org/10.1177/0269215518771824" },
    { title: "Impact of Ankle-Foot Orthosis on Gait Efficiency in Ambulatory Children With Cerebral Palsy: A Systematic Review and Meta-analysis", org: "Am J Phys Med Rehabil (Betancourt et al.)", year: 2019, url: "https://doi.org/10.1097/phm.0000000000001185" },
    { title: "Ankle-foot orthoses in children with cerebral palsy: a cross sectional population based study of 2200 children", org: "BMC Musculoskelet Disord (Wingstrand et al.)", year: 2014, url: "https://doi.org/10.1186/1471-2474-15-327" },
    { title: "Hip displacement in cerebral palsy", org: "J Bone Joint Surg Am (Soo et al.)", year: 2006, url: "https://doi.org/10.2106/jbjs.e.00071" },
    { title: "Incidence of scoliosis in cerebral palsy", org: "Acta Orthop (Hägglund et al.)", year: 2018, url: "https://doi.org/10.1080/17453674.2018.1450091" },
    { title: "Effects of Postural Management on Hip Migration in Children With Cerebral Palsy: A Systematic Review", org: "Pediatr Phys Ther (Gmelig Meyling et al.)", year: 2018, url: "https://doi.org/10.1097/pep.0000000000000488" },
    { title: "An overview of systematic reviews of adaptive seating interventions for children with cerebral palsy: where do we go from here?", org: "Disabil Rehabil Assist Technol (Ryan)", year: 2012, url: "https://doi.org/10.3109/17483107.2011.595044" },
    { title: "Stretch for the treatment and prevention of contracture: an abridged republication of a Cochrane Systematic Review", org: "J Physiother (Harvey et al.)", year: 2017, url: "https://doi.org/10.1016/j.jphys.2017.02.014" },
    { title: "A report: the definition and classification of cerebral palsy April 2006", org: "Dev Med Child Neurol Suppl (Rosenbaum et al.)", year: 2007, url: "https://doi.org/10.1111/j.1469-8749.2007.tb12610.x" },
    { title: "An update on the prevalence of cerebral palsy: a systematic review and meta-analysis", org: "Dev Med Child Neurol (Oskoui et al.)", year: 2013, url: "https://doi.org/10.1111/dmcn.12080" },
    { title: "Clinical prognostic messages from a systematic review on cerebral palsy", org: "Pediatrics (Novak et al.)", year: 2012, url: "https://doi.org/10.1542/peds.2012-0924" },
    { title: "Prognosis for gross motor function in cerebral palsy: creation of motor development curves", org: "JAMA (Rosenbaum et al.)", year: 2002, url: "https://doi.org/10.1001/jama.288.11.1357" },
    { title: "Stability and decline in gross motor function among children and youth with cerebral palsy aged 2 to 21 years", org: "Dev Med Child Neurol (Hanna et al.)", year: 2009, url: "https://doi.org/10.1111/j.1469-8749.2008.03196.x" },
    { title: "Epidemiology of Cerebral Palsy among Children and Adolescents in Arabic-Speaking Countries: A Systematic Review and Meta-Analysis", org: "Brain Sci (Mushta et al.)", year: 2022, url: "https://doi.org/10.3390/brainsci12070859" },
    { title: "Pattern of cerebral palsy in Mosul", org: "Ann Coll Med Mosul (Al-Ali)", year: 2007, url: "https://doi.org/10.33899/mmed.2007.8839" },
    { title: "Risk factors & clinical patterns of cerebral palsy in Children Welfare Teaching Hospital in Baghdad", org: "Iraqi Postgrad Med J (Al-Naddawi et al.)", year: 2011, url: "https://www.ipmj.org/journal/vol10/iss3/2" },
    { title: "Causes of Cerebral Palsy in Sulaimani", org: "Advanced Medical Journal (Ahmed et al.)", year: 2018, url: "https://doi.org/10.56056/amj.2018.46" },
    { title: "Cerebral Palsy Epidemiology in Tikrit-Iraq", org: "Indian J Public Health Res Dev (Ahmed et al.)", year: 2019, url: "https://doi.org/10.5958/0976-5506.2019.00182.7" },
    { title: "PRENATAL AND PERINATAL RISK FACTORS FOR CEREBRAL PALSY IN KURDISH CHILDREN: A CASE-CONTROL STUDY", org: "Health Problems of Civilization (Mohammed et al.)", year: 2024, url: "https://doi.org/10.5114/hpc.2024.142890" },
    { title: "Caregiver’s Knowledge regarding Homecare Management of Spastic Cerebral Palsy Children Under 12 Years Old in Rapareen Province", org: "Erbil J Nurs Midwifery (Faqi-Rahid et al.)", year: 2022, url: "https://doi.org/10.15218/ejnm.2022.07" },
    { title: "Home care management among mothers having children with cerebral palsy in Erbil city", org: "Zanco Journal of Medical Sciences (Hasan)", year: 2014, url: "https://doi.org/10.15218/zjms.2014.0021" },
    { title: "The Impact of a Structured Homecare Intervention Program on Caregivers’ Knowledge of Children with Cerebral Palsy in Kirkuk City", org: "Istanbul Medical Journal (Mohammed et al.)", year: 2026, url: "https://doi.org/10.4274/imj.galenos.2026.65657" },
    { title: "Lower Limb Training Threshold Dose and Motor Learning Strategy Reporting in Children With Cerebral Palsy", org: "Pediatr Phys Ther (Haddon et al.)", year: 2026, url: "https://doi.org/10.1097/pep.0000000000001257" },
    { title: "Intermittent intensive physiotherapy in children with cerebral palsy: a pilot study", org: "Dev Med Child Neurol (Trahan et al.)", year: 2002, url: "https://doi.org/10.1017/s0012162201002006" },
    { title: "Is more frequent physical therapy associated with increased gross motor improvement in children with cerebral palsy? A national prospective cohort study", org: "Disabil Rehabil (Størvold et al.)", year: 2020, url: "https://doi.org/10.1080/09638288.2018.1528635" },
    { title: "Goal attainment scaling in rehabilitation: a literature-based update", org: "Ann Phys Rehabil Med (Krasny-Pacini et al.)", year: 2013, url: "https://doi.org/10.1016/j.rehab.2013.02.002" },
    { title: "The Arabic Canadian Occupational Performance Measure (Arabic-COPM) in Pediatric Rehabilitation: Quantitative Reliability Study", org: "JMIR Pediatr Parent (Hadoush et al.)", year: 2026, url: "https://doi.org/10.2196/87822" },
    { title: "Use of complementary and alternative medicine treatments by mothers of children with developmental disabilities: a cross sectional study", org: "Nurs Health Sci (Konuk Sener et al.)", year: 2020, url: "https://doi.org/10.1111/nhs.12733" },
    { title: "Treatable inborn errors of metabolism presenting as cerebral palsy mimics: systematic literature review", org: "Orphanet J Rare Dis (Leach et al.)", year: 2014, url: "https://doi.org/10.1186/s13023-014-0197-2" },
    { title: "Inter-rater agreement of the Arabic Gross Motor Classification System Expanded & Revised in children with cerebral palsy in Jordan", org: "Disabil Rehabil (Almasri et al.)", year: 2015, url: "https://doi.org/10.3109/09638288.2014.986589" },
    { title: "The Manual Ability Classification System (MACS) for children with cerebral palsy: scale development and evidence of validity and reliability", org: "Dev Med Child Neurol (Eliasson et al.)", year: 2006, url: "https://doi.org/10.1017/s0012162206001162" },
    { title: "Mini-MACS: development of the Manual Ability Classification System for children younger than 4 years of age with signs of cerebral palsy", org: "Dev Med Child Neurol (Eliasson et al.)", year: 2017, url: "https://doi.org/10.1111/dmcn.13162" },
    { title: "Developing and validating the Communication Function Classification System for individuals with cerebral palsy", org: "Dev Med Child Neurol (Hidecker et al.)", year: 2011, url: "https://doi.org/10.1111/j.1469-8749.2011.03996.x" },
    { title: "Development and reliability of a system to classify the eating and drinking ability of people with cerebral palsy", org: "Dev Med Child Neurol (Sellers et al.)", year: 2014, url: "https://doi.org/10.1111/dmcn.12352" },
    { title: "Development of the Hypertonia Assessment Tool (HAT): a discriminative tool for hypertonia in children", org: "Dev Med Child Neurol (Jethwa et al.)", year: 2010, url: "https://doi.org/10.1111/j.1469-8749.2009.03483.x" },
    { title: "Bone density and metabolism in children and adolescents with moderate to severe cerebral palsy", org: "Pediatrics (Henderson et al.)", year: 2002, url: "https://doi.org/10.1542/peds.110.1.e5" },
    { title: "The Faces Pain Scale-Revised: toward a common metric in pediatric pain measurement", org: "Pain (Hicks et al.)", year: 2001, url: "https://doi.org/10.1016/s0304-3959(01)00314-1" },
    { title: "The Arabic Version of the Faces Pain Scale-Revised: Cultural Adaptation, Validity, and Reliability Properties When Used with Children and Adolescents", org: "Children (Basel) (Finianos et al.)", year: 2021, url: "https://doi.org/10.3390/children8121184" },
    { title: "The revised FLACC observational pain tool: improved reliability and validity for pain assessment in children with cognitive impairment", org: "Paediatr Anaesth (Malviya et al.)", year: 2006, url: "https://doi.org/10.1111/j.1460-9592.2005.01773.x" },
    { title: "Psychometric properties of the non-communicating children's pain checklist-revised", org: "Pain (Breau et al.)", year: 2002, url: "https://doi.org/10.1016/s0304-3959(02)00179-3" },
    { title: "Reliability of Ashworth and Modified Ashworth scales in children with spastic cerebral palsy", org: "BMC Musculoskelet Disord (Mutlu et al.)", year: 2008, url: "https://doi.org/10.1186/1471-2474-9-44" },
    { title: "Measures of muscle and joint performance in the lower limb of children with cerebral palsy", org: "Dev Med Child Neurol (Fosang et al.)", year: 2003, url: "https://doi.org/10.1017/s0012162203001245" },
    { title: "Test-retest reliability of the 10-metre fast walk test and 6-minute walk test in ambulatory school-aged children with cerebral palsy", org: "Dev Med Child Neurol (Thompson et al.)", year: 2008, url: "https://doi.org/10.1111/j.1469-8749.2008.02048.x" },
    { title: "Test-retest reliability of a 1-min walk test in children with bilateral spastic cerebral palsy (BSCP)", org: "Gait Posture (McDowell et al.)", year: 2009, url: "https://doi.org/10.1016/j.gaitpost.2008.09.010" },
    { title: "Translation and cross-cultural adaptation of the functional mobility scale in children with cerebral palsy into Arabic", org: "Front Public Health (Albalwi et al.)", year: 2023, url: "https://doi.org/10.3389/fpubh.2023.1199337" },
    { title: "Occupational therapy home programs for cerebral palsy: double-blind, randomized, controlled trial", org: "Pediatrics (Novak et al.)", year: 2009, url: "https://doi.org/10.1542/peds.2009-0288" },
    { title: "Adjunct therapies to improve outcomes after botulinum toxin injection in children: A systematic review", org: "Ann Phys Rehabil Med (Mathevon et al.)", year: 2019, url: "https://doi.org/10.1016/j.rehab.2018.06.010" },
    { title: "Systemic adverse events following botulinum toxin A therapy in children with cerebral palsy", org: "Dev Med Child Neurol (Naidu et al.)", year: 2010, url: "https://doi.org/10.1111/j.1469-8749.2009.03583.x" },
    { title: "3-Methyl glutaconic aciduria in Iraqi Jewish children may be misdiagnosed as cerebral palsy", org: "Neuropediatrics (Straussberg et al.)", year: 1998, url: "https://doi.org/10.1055/s-2007-973537" },
    { title: "Prevention of dislocation of the hip in children with cerebral palsy: 20-year results of a population-based prevention programme", org: "Bone Joint J (Hägglund et al.)", year: 2014, url: "https://doi.org/10.1302/0301-620x.96b11.34385" },
    { title: "Prevalence of hip dislocation among children with cerebral palsy in regions with and without a surveillance programme: a cross sectional study in Sweden and Norway", org: "BMC Musculoskelet Disord (Elkamil et al.)", year: 2011, url: "https://doi.org/10.1186/1471-2474-12-284" },
    { title: "Prevalence of drooling, swallowing, and feeding problems in cerebral palsy across the lifespan: a systematic review and meta-analyses", org: "Dev Med Child Neurol (Speyer et al.)", year: 2019, url: "https://doi.org/10.1111/dmcn.14316" },
    { title: "Burden of Malnutrition among Children and Adolescents with Cerebral Palsy in Arabic-Speaking Countries: A Systematic Review and Meta-Analysis", org: "Nutrients (Mushta et al.)", year: 2021, url: "https://doi.org/10.3390/nu13093199" },
    { title: "Single-event multilevel surgery in children with spastic diplegia: a pilot randomized controlled trial", org: "J Bone Joint Surg Am (Thomason et al.)", year: 2011, url: "https://doi.org/10.2106/jbjs.j.00410" },
    { title: "Factors Affecting Mothers' Adherence to Home Exercise Programs Designed for Their Children with Cerebral Palsy", org: "Int J Environ Res Public Health (Alwhaibi et al.)", year: 2022, url: "https://doi.org/10.3390/ijerph191710792" },
    { title: "Psychological distress and perceived support among Jordanian parents living with a child with cerebral palsy: a cross-sectional study", org: "Scand J Caring Sci (Al-Gamal et al.)", year: 2013, url: "https://doi.org/10.1111/j.1471-6712.2012.01071.x" },
    { title: "The Perception of Disability Among Mothers Living With a Child With Cerebral Palsy in Saudi Arabia", org: "Glob Qual Nurs Res (Mohamed Madi et al.)", year: 2019, url: "https://doi.org/10.1177/2333393619844096" },
    { title: "Efficacy of suit therapy on functioning in children and adolescents with cerebral palsy: a systematic review and meta-analysis", org: "Dev Med Child Neurol (Martins et al.)", year: 2016, url: "https://doi.org/10.1111/dmcn.12988" },
    { title: "Characteristics of Children with Cerebral Palsy and Their Utilization of Services in Saudi Arabia", org: "Healthcare (Basel) (Saleh et al.)", year: 2023, url: "https://doi.org/10.3390/healthcare11192690" },
    { title: "Users of rehabilitation services in 14 countries and territories affected by conflict, 1988-2018", org: "Bull World Health Organ (Barth et al.)", year: 2020, url: "https://doi.org/10.2471/blt.19.249060" },
    { title: "The Effect of Robot-Assisted Gait Training on Locomotor Function and Functional Capability for Daily Activities in Children with Cerebral Palsy: A Single-Blinded, Randomized Cross-Over Trial", org: "Brain Sci (Jin et al.)", year: 2020, url: "https://doi.org/10.3390/brainsci10110801" },
    { title: "Training intensity of robot-assisted gait training in children with cerebral palsy", org: "Dev Med Child Neurol (Choi et al.)", year: 2024, url: "https://doi.org/10.1111/dmcn.15834" },
    { title: "Is robotic gait training effective for individuals with cerebral palsy? A systematic review and meta-analysis of randomized controlled trials", org: "Clin Rehabil (Conner et al.)", year: 2022, url: "https://doi.org/10.1177/02692155221087084" },
    { title: "Lessons learned from conducting a pragmatic, randomized, crossover trial on robot-assisted gait training in children with cerebral palsy (PeLoGAIT)", org: "J Pediatr Rehabil Med (Ammann-Reiffer et al.)", year: 2020, url: "https://doi.org/10.3233/prm-190614" },
    { title: "Effects of dose and duration of Robot-Assisted Gait Training on walking ability of children affected by cerebral palsy", org: "Technol Health Care (Peri et al.)", year: 2017, url: "https://doi.org/10.3233/thc-160668" },
    { title: "Robot-assisted gait training in cerebral palsy: a GRADE-assessed systematic review and meta-analysis with trial sequential analysis", org: "Neurol Res (Al Matairi et al.)", year: 2026, url: "https://doi.org/10.1080/01616412.2026.2697005" },
    { title: "Optimal exercise dose and training modalities for improving gross motor function in children with cerebral palsy: a systematic review and Bayesian network meta-analysis of RCTs", org: "Eur J Pediatr (Ma et al.)", year: 2026, url: "https://doi.org/10.1007/s00431-026-07416-1" },
    { title: "Effectiveness of neuromuscular electrical stimulation in improving mobility in children with cerebral palsy: A systematic review and meta-analysis of randomized controlled trials", org: "Clin Rehabil (Chen et al.)", year: 2023, url: "https://doi.org/10.1177/02692155221109661" },
    { title: "Neuromuscular electrical stimulation to improve gross motor function in children with cerebral palsy: a meta-analysis", org: "Braz J Phys Ther (Salazar et al.)", year: 2019, url: "https://doi.org/10.1016/j.bjpt.2019.01.006" },
    { title: "Functional electrical stimulation of the ankle dorsiflexors during walking in spastic cerebral palsy: a systematic review", org: "Dev Med Child Neurol (Moll et al.)", year: 2017, url: "https://doi.org/10.1111/dmcn.13501" },
    { title: "The orthotic and therapeutic effects following daily community applied functional electrical stimulation in children with unilateral spastic cerebral palsy: a randomised controlled trial", org: "BMC Pediatr (Pool et al.)", year: 2015, url: "https://doi.org/10.1186/s12887-015-0472-y" },
    { title: "Threshold electrical stimulation (TES) in ambulant children with CP: a randomized double-blind placebo-controlled clinical trial", org: "Dev Med Child Neurol (Dali et al.)", year: 2002, url: "https://doi.org/10.1017/s0012162201002237" },
    { title: "Electrical stimulation in cerebral palsy: a randomized controlled trial", org: "Dev Med Child Neurol (Kerr et al.)", year: 2006, url: "https://doi.org/10.1017/s0012162206001915" },
    { title: "Effect of radial shock wave therapy on muscle spasticity in children with cerebral palsy", org: "Int J Rehabil Res (Gonkova et al.)", year: 2013, url: "https://doi.org/10.1097/mrr.0b013e328360e51d" },
    { title: "Effect of total number of pulses of radial extracorporeal shock wave therapy (rESWT) on hamstring muscle spasticity in children with spastic type cerebral palsy: A randomized clinical trial", org: "J Pediatr Rehabil Med (Wardhani et al.)", year: 2022, url: "https://doi.org/10.3233/prm-200796" },
    { title: "Effect of extracorporeal shock wave therapy on gait pattern in hemiplegic cerebral palsy: a randomized controlled trial", org: "Am J Phys Med Rehabil (El-Shamy et al.)", year: 2014, url: "https://doi.org/10.1097/phm.0000000000000133" },
    { title: "Therapeutic Effect of Extracorporeal Shock Wave Therapy According to Treatment Session on Gastrocnemius Muscle Spasticity in Children With Spastic Cerebral Palsy: A Pilot Study", org: "Ann Rehabil Med (Park et al.)", year: 2015, url: "https://doi.org/10.5535/arm.2015.39.6.914" },
    { title: "Radial extracorporeal shock wave therapy (rESWT) in the treatment of spasticity in cerebral palsy: a randomized, placebo-controlled clinical trial", org: "NeuroRehabilitation (Vidal et al.)", year: 2011, url: "https://doi.org/10.3233/nre-2011-0720" },
    { title: "Effect of extracorporeal shockwave therapy on muscle spasticity in patients with cerebral palsy: meta-analysis and systematic review", org: "Eur J Phys Rehabil Med (Kim et al.)", year: 2019, url: "https://doi.org/10.23736/s1973-9087.19.05888-x" },
    { title: "Effects of extracorporeal shock wave therapy on motor function in patients with cerebral palsy: a systematic review and meta-analysis", org: "Disabil Rehabil (Peng et al.)", year: 2025, url: "https://doi.org/10.1080/09638288.2025.2514261" },
    { title: "The effects of extracorporeal shock wave therapy in children with cerebral palsy: a systematic review", org: "Int J Surg (de Roo et al.)", year: 2025, url: "https://doi.org/10.1097/js9.0000000000002251" },
    { title: "Efficacy of radial extracorporeal shock wave therapy compared with botulinum toxin type A injection in treatment of lower extremity spasticity in subjects with cerebral palsy: A randomized, controlled, cross-over study", org: "J Rehabil Med (Vidal et al.)", year: 2020, url: "https://doi.org/10.2340/16501977-2703" },
    { title: "Effectiveness of Extracorporeal Shockwave Therapy on Controlling Spasticity in Cerebral Palsy Patients: A Meta-Analysis of Timing of Outcome Measurement", org: "Children (Basel) (Chang et al.)", year: 2023, url: "https://doi.org/10.3390/children10020332" },
    { title: "Feasibility of Using Pulsed Electromagnetic Field Therapy to Improve the Dynamic Postural Balance of Children with Cerebral Palsy: A Randomized, Sham-Controlled Pilot Study", org: "J Clin Med (Pulay et al.)", year: 2024, url: "https://doi.org/10.3390/jcm14010192" },
    { title: "[Efficacy of dynamic magnetotherapy with modulation frequency 10Hz in the complex of spa rehabilitation of children with cerebral palsy]", org: "Vopr Kurortol Fizioter Lech Fiz Kult (Gurova et al.)", year: 2007, url: "https://pubmed.ncbi.nlm.nih.gov/17886367/" },
    { title: "Therapeutic effects of repetitive transcranial magnetic stimulation in patients with cerebral palsy: a systematic review and network meta-analysis", org: "Neurol Sci (Zhang et al.)", year: 2024, url: "https://doi.org/10.1007/s10072-023-07235-4" },
    { title: "The Impact of Low-Level Laser Therapy on Spasticity in Children with Spastic Cerebral Palsy: A Systematic Review", org: "Brain Sci (Jiménez et al.)", year: 2024, url: "https://doi.org/10.3390/brainsci14121179" },
    { title: "Effect of low-level laser therapy on quadriceps and foot muscle fatigue in children with spastic diplegia: a randomized controlled study", org: "Lasers Med Sci (Abdelhalim et al.)", year: 2023, url: "https://doi.org/10.1007/s10103-023-03841-y" },
    { title: "Adjunctive dry needling reduces spasticity and improves functional outcomes in children with cerebral palsy: a single-blind randomized controlled trial", org: "Front Pediatr (Alkhamees et al.)", year: 2026, url: "https://doi.org/10.3389/fped.2026.1865049" },
    { title: "Acupuncture for cerebral palsy: A meta-analysis of randomized controlled trials", org: "Neural Regen Res (Li et al.)", year: 2018, url: "https://doi.org/10.4103/1673-5374.233455" },
    { title: "Efficacy and safety of acupuncture in children: an overview of systematic reviews", org: "Pediatr Res (Yang et al.)", year: 2015, url: "https://doi.org/10.1038/pr.2015.91" },
    { title: "Effect of hip CPM on gross motor function and development of the hip joint: a single-center randomized controlled study on spastic cerebral palsy children with hip dysplasia", org: "Front Pediatr (Wang et al.)", year: 2023, url: "https://doi.org/10.3389/fped.2023.1090919" },
    { title: "Managing spastic hypertonia in children with cerebral palsy via repetitive passive knee movements", org: "J Rehabil Med (Cheng et al.)", year: 2012, url: "https://doi.org/10.2340/16501977-0937" },
    { title: "Randomized Controlled Trial on Effectiveness of Intermittent Serial Casting on Spastic Equinus Foot in Children with Cerebral Palsy After Botulinum Toxin-A Treatment", org: "Am J Phys Med Rehabil (Dursun et al.)", year: 2017, url: "https://doi.org/10.1097/phm.0000000000000627" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة في الجلسة — هدفُ الطفل نفسُه بالمهمّة الكاملة، ثمّ مسارُ مستواه (اليدُ أو المشيُ أو التقويةُ أو الوقوفُ والوضعيات)، ثمّ تدريبُ الأهل على ما يكرّرونه في البيت؛ والطفلُ فاعلٌ في كلّ دقيقة.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes per session — the child's own goal as a whole task, then the pathway for their level (the hand, walking, strengthening, or standing and positioning), then coaching the family on what to repeat at home; the child is active in every minute."],
      note: ["أساسيٌّ في كلّ جلسة — التدريبُ الموجَّه بالأهداف وبالمهمّة والقسريُّ واليدان واللياقةُ والسيرُ والبرامجُ المنزلية خضراء (Novak 2020)، والإرشادُ الدوليّ يجعل الأهدافَ والمهمّةَ الكاملة أساساً (Jackman 2022)؛ والعلاجُ العصبيّ النمائيّ ليس أفضلَ من المقارَن بأيّ جرعة (te Velde 2022).",
        "Core in every session — goal-directed and task-specific training, constraint-induced and bimanual training, fitness, treadmill training and home programmes are green (Novak 2020), and the international guideline makes goals and whole-task practice the base (Jackman 2022); neurodevelopmental therapy is no better than comparison at any dose (te Velde 2022)."] },
    { code: "robotik", centreUse: "adjunct", evidence: "optional", minutes: 25,
      parameters: ["لمن يمشي بمساعدةٍ أو بأداة (المستويات II–IV) ولا يكفيه المشيُ بيد المعالج وعلى السير لزيادة الخطوات: ٢٠–٣٠ دقيقة ثلاثاً في الأسبوع ستّةَ أسابيع في التجارب (Jin 2020 · Choi 2024b)، بأقلّ حملٍ للوزن وتوجيهٍ يتحمّلهما وبسرعةٍ تناسب الهدف (Choi 2024b)، ثمّ المشيُ على الأرض في الجلسة نفسِها؛ والإعداداتُ من جهاز المركز، وعليه أن يناسب طولَ ساق الطفل.",
        "For a child who walks with help or an aid (levels II–IV) and for whom therapist-assisted and treadmill walking are not enough to add steps: 20–30 minutes three times a week for six weeks in trials (Jin 2020 · Choi 2024b), with the least body-weight support and guidance tolerated and a speed suited to the goal (Choi 2024b), then overground walking in the same session; the settings come from the centre's device, which must fit the child's leg length."],
      note: ["مساعدٌ بشرط — والدليلُ متضارب: لا نفعَ أكثر من المعتاد في تحليلٍ لثماني تجارب (Conner 2022) وفي تجربةٍ عملية (Ammann-Reiffer 2020)، ومثلُ التدريب بالمهمّة بالجرعة نفسِها (Peri 2017)، ونفعٌ صغير في المشي ستّ دقائق (+١٧٫٥ متراً) والسرعة (Al Matairi 2026)، والأفضلُ للوقوف والمشي في تحليلٍ شبكيّ بيقينٍ منخفضٍ جدّاً (Ma 2026)، وأنفعُ في المستويين II–III منه في الرابع (Jin 2020) — فلا يحلّ محلّ المشي على الأرض (Jackman 2022).",
        "A conditional adjunct — and the evidence conflicts: no benefit over usual care in an analysis of eight trials (Conner 2022) and a pragmatic trial (Ammann-Reiffer 2020), equal to task-oriented training at the same dose (Peri 2017), a small gain in the six-minute walk (+17.5 m) and speed (Al Matairi 2026), the best for standing and walking in a network analysis with very low certainty (Ma 2026), and more useful at levels II–III than IV (Jin 2020) — so it does not replace overground walking (Jackman 2022)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["التحفيزُ العضليّ على العضلة الضعيفة (رافعاتُ القدم، أو الفخذ، أو الألوية) أثناء نشاطٍ وظيفيّ — القيامِ أو الوقوفِ أو المشي — بانقباضٍ ظاهرٍ يتحمّله الطفل، والإعداداتُ من جهاز المركز، فالتحاليلُ لم تجمع على إعدادات (Chen 2023 · Salazar 2019). والتحفيزُ الوظيفيّ لرافعات القدم أثناء المشي بديلٌ للدعامة في الشلل النصفيّ (Moll 2017) — وفي تجربته جهازٌ يُلبس ٤ ساعاتٍ يومياً ستّةَ أيّام ثمانيةَ أسابيع (Pool 2015)، لا جهازَ الجلسة؛ والتحفيزُ الليليّ تحت العتبة لا ينفع (Dali 2002).",
        "Muscle stimulation of a weak muscle (the ankle dorsiflexors, the thigh or the gluteals) during a functional activity — standing up, standing or walking — with a visible contraction the child tolerates; the settings come from the centre's device, as the analyses did not agree on settings (Chen 2023 · Salazar 2019). Functional stimulation of the dorsiflexors during walking is an alternative to an orthosis in unilateral palsy (Moll 2017) — its trial used a worn device for 4 hours a day, six days a week for eight weeks (Pool 2015), not the session device; night-time sub-threshold stimulation does not help (Dali 2002)."],
      note: ["مساعدٌ بقاعدة المركز — أصفرُ إيجابيّ مساعدٌ للتدريب بالمهمّة (Novak 2020): أسرعُ في المشي قليلاً وأفضلُ في الوقوف والمشي من الحركة الكبرى (Chen 2023)، ولا فرقَ في القوّة ولا الحركة في تجربةٍ مضبوطة بالوهميّ (Kerr 2006) — فلا يحلّ محلّ التمرين؛ ولطفلٍ يخافه أو لا يستطيع أن يقول «يؤلم» يُبدأ بأخفّ شدّة.",
        "Adjunct by the centre's rule — yellow positive as an add-on to task practice (Novak 2020): slightly faster walking and better standing and walking scores (Chen 2023), with no difference in strength or motor function in a placebo-controlled trial (Kerr 2006) — so it does not replace exercise; for a child who is afraid of it or cannot say 'it hurts', start at the lowest intensity."] },
    { code: "shockwaves", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 3,
      parameters: ["للتشنّج الموضعيّ الذي يمنع هدفاً — عضلةُ الساق أوّلاً (وخلفُ الفخذ وقابضاتُ الرسغ) — مرّةً في الأسبوع ثلاثَ جلسات، مع التدريب والدعامة أو بعد البوتوكس لا بدلها، على بطن العضلة بعيداً عن العظم وصفائح النموّ. " +
        "وفي التجارب: الشعاعيُّ ١٥٠٠ نبضة بـ١٫٥ بار و٤–٥ هرتز (Gonkova 2013 · Wardhani 2022)، والمركّزُ ١٥٠٠ بـ٠٫٠٣ مللي جول/مم² و٥ هرتز أسبوعياً ثلاثةَ أشهر (El-Shamy 2014)؛ والثلاثُ أبقى أثراً من واحدة (Park 2015 · Vidal 2011). " +
        "والإعداداتُ (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز في خاناتها — يملؤها المشرفُ قبل الاعتماد؛ فقيمُ الأدبيات لا تنتقل بين جهازٍ وآخر.",
        "For focal spasticity that blocks a goal — the calf first (and the hamstrings and wrist flexors) — once a week for three sessions, with training and the orthosis or after botulinum toxin rather than instead of them, on the muscle belly away from bone and the growth plates. " +
        "In trials: radial 1500 impulses at 1.5 bar and 4–5 Hz (Gonkova 2013 · Wardhani 2022), and focused 1500 at 0.03 mJ/mm² and 5 Hz weekly for three months (El-Shamy 2014); three sessions last longer than one (Park 2015 · Vidal 2011). " +
        "The settings (type, intensity, frequency, impulses) come from the centre's own device, in their fields — the supervisor fills them before approval, since published values do not transfer between devices."],
      note: ["مساعدٌ بموعدٍ دوريّ — لم تقيّمه إشاراتُ الأدلّة (Novak 2020)، وتحليلاتُه إيجابية: أشوورث −٠٫٦٢ ومدى الكاحل +١٨° (Kim 2019)، وأشوورث وسرعةُ المشي +٠٫١٢ م/ث مع العلاج الطبيعيّ أو البوتوكس أو الدعامة (Peng 2025)، ومراجعةٌ لاثنتي عشرةَ تجربة بلا آثارٍ جانبيةٍ مسجّلة (de Roo 2025)، ولم يكن البوتوكسُ أفضلَ منه عند شهرين (Vidal 2020)؛ لكنّ أثرَه في التشنّج نحو شهر وفي المدى حتى ثلاثة (Chang 2023) — فهو نافذةٌ للتدريب لا علاجٌ وحده.",
        "An adjunct on a periodic schedule — not graded by the evidence traffic lights (Novak 2020), with positive analyses: Ashworth −0.62 and ankle range +18° (Kim 2019), and Ashworth and walking speed +0.12 m/s with physiotherapy, botulinum toxin or an orthosis (Peng 2025), a review of twelve trials with no recorded side effects (de Roo 2025), and botulinum toxin no better than it at two months (Vidal 2020); but its effect on spasticity lasts about a month and on range up to three (Chang 2023) — so it is a window for training, not a treatment on its own."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["على الأطراف أو الظهر لا على الرأس، والإعداداتُ من جهاز المركز — فلا تجربةَ تحدّدها؛ وفي التجربة التجريبية الوحيدة ٢٠/٢٠٠ هرتز و١٥٠ ميكروتسلا ٨–١٦ دقيقة ثلاثاً في الأسبوع أربعةَ أسابيع (Pulay 2024).",
        "Over the limbs or back, not the head, with settings from the centre's device — no trial sets them; the only pilot trial used 20/200 Hz and 150 microtesla for 8–16 minutes three times a week for four weeks (Pulay 2024)."],
      note: ["مساعدٌ بقاعدة المركز — والدليلُ ضعيف: تجربةٌ تجريبية مضبوطة بالوهميّ بلا أثرٍ إلّا ميلاً حدّياً في التوازن (Pulay 2024)، ودراسةٌ روسية منخفضةُ الجودة (Gurova 2007)، والتحفيزُ المغناطيسيّ للدماغ جهازٌ آخر لا يُنقل أثرُه (Zhang 2024)؛ ولا يُستعمل لطفلٍ له صمّامُ تحويلةٍ قابلٌ للبرمجة أو مضخّةُ دواء أو زرعةُ قوقعة إلّا بإذن الطبيب.",
        "Adjunct by the centre's rule — the evidence is weak: a sham-controlled pilot with no effect beyond a borderline trend in balance (Pulay 2024) and a low-quality Russian study (Gurova 2007), while magnetic brain stimulation is a different device whose effect does not transfer (Zhang 2024); not used for a child with a programmable shunt valve, a drug pump or a cochlear implant without the doctor's permission."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "8–10", durationMin: "10" },
      parameters: ["دفءٌ على العضلة المشدودة قبل التدريب أو الجبس عشرَ دقائق — لطفلٍ يستطيع أن يقول «حارّ» وإحساسُه سليم وحده، وبطبقاتٍ أكثر لرقّة جلد الطفل، ويُفحص الجلدُ كلَّ خمس دقائق؛ ولا للطفل الذي لا يتكلّم، ولا على جلدٍ ناقص الإحساس، ولا على موضع احمرار الدعامة.",
        "Warmth on the tight muscle for ten minutes before training or casting — only for a child who can say 'hot' and has intact sensation, with more layers for a child's thin skin and the skin checked every five minutes; never for a child who does not talk, on skin with reduced sensation, or over a red area from the orthosis."],
      note: ["مساعدٌ بقاعدة المركز — لا دراسةَ للكمادة في الشلل الدماغيّ (بحثٌ صفريّ)، ولم تقيّمها إشاراتُ الأدلّة (Novak 2020)؛ وخطرُ الحرق أعلى عند طفلٍ لا يستطيع أن يشكو.",
        "Adjunct by the centre's rule — there is no study of the hot pack in cerebral palsy (a documented zero result), and the evidence traffic lights did not grade it (Novak 2020); the burn risk is higher in a child who cannot complain."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — مراجعةٌ لثماني دراساتٍ رأت كلُّها نقصَ التشنّج بإعداداتٍ غير مكتوبة ومناهجَ متباينة ونتائجَ غير موضوعية (Jimenez 2024)، وتجربةٌ مصرية مع العلاج الطبيعيّ شهراً بلا إعداداتٍ في ملخّصها (Abdelhalim 2023)؛ ونظّارةٌ واقية للطفل إن استُعمل.",
        "Not used until Saleem decides — a review of eight studies all reported less spasticity, with unreported settings, heterogeneous methods and non-objective outcomes (Jimenez 2024), and an Egyptian trial with physiotherapy for a month gives no settings in its abstract (Abdelhalim 2023); protective goggles for the child if used."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ واحدة للإبر الجافّة في الشلل المزدوج من ٦ إلى ١٢ سنة مع العلاج الطبيعيّ ١٢ أسبوعاً: أشوورث −٠٫٥ مقابل −٠٫٢ والوقوفُ والمشيُ أفضل، بلا جدولٍ للجرعة في ملخّصها (Alkhamees 2026)؛ والوخزُ الصينيّ أصفرُ إيجابيّ (Novak 2020) بتحليلٍ أكثرُه من قواعدَ صينية (Li 2018) ومراجعاتٌ عاليةُ الجودة أقربُ إلى المحايد (Yang 2015)؛ وخوفُ الطفل من الإبر.",
        "Not used until Saleem decides — one trial of dry needling in diplegia aged 6 to 12 with physiotherapy for 12 weeks: Ashworth −0.5 against −0.2 with better standing and walking, with no dosing schedule in its abstract (Alkhamees 2026); acupuncture is yellow positive (Novak 2020), with an analysis drawn mostly from Chinese databases (Li 2018) and high-quality reviews closer to neutral (Yang 2015); and children's fear of needles."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — حركةٌ سلبية، والتحريكُ السلبيّ ضدّه (Morgan 2021)؛ ودراسةٌ صينية واحدة للورك في المستويين III–IV ٤٠–٦٠ دقيقة مرّتين يومياً ثمانيةَ أسابيع حسّنت الإزاحةَ بمجموعتين غير متساويتين ومتابعةٍ قصيرة (Wang 2023a)، وأثرٌ فوريّ في الركبة بلا متابعة (Cheng 2012).",
        "Not used until Saleem decides — it is passive movement, and passive handling is advised against (Morgan 2021); one Chinese study of the hip at levels III–IV, 40–60 minutes twice a day for eight weeks, improved migration with unequal groups and short follow-up (Wang 2023a), and an immediate effect at the knee had no follow-up (Cheng 2012)."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا دراسةَ في الشلل الدماغيّ (بحثٌ صفريّ)، وخطرُ الحرق عند طفلٍ لا يشكو؛ والدفءُ بالكمادة بشروطها.", "Not used — there is no study in cerebral palsy (a documented zero result), with a burn risk in a child who cannot complain; warmth is given by the hot pack under its conditions."] },
    { code: "tecar", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا دراسةَ في الشلل الدماغيّ (بحثٌ صفريّ)، وحرارةٌ عميقة عند طفلٍ قد لا يشكو، وقربَ المعادن بعد جراحات العظم.", "Not used — there is no study in cerebral palsy (a documented zero result), with deep heat in a child who may not complain, and near metal after bone surgery."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا دراسةَ في الشلل الدماغيّ (بحثٌ صفريّ).", "Not used — there is no study in cerebral palsy (a documented zero result)."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا دراسة (بحثٌ صفريّ)، وخطرُ الحرق عند الطفل.", "Not used — there is no study (a documented zero result), with a burn risk in children."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق؛ والبدلاتُ الضاغطة غيرُ هذا الجهاز، وهي أصفرُ سلبيّ بلا نفعٍ مضاف (Novak 2020 · Martins 2016).", "Not used — not applicable; suits are not this device, and they are yellow negative with no added benefit (Novak 2020 · Martins 2016)."] },
    { code: "traction", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق.", "Not used — not applicable."] },
  ],
  phases: [
    {
      name: ["التقييم والأهداف وتدريب الأهل والسلامة", "Assessment, goals, family coaching and safety"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلسات ١–٦ (الأسبوعُ الأوّل) — والتدريبُ على هدفٍ واحد يبدأ من الجلسة الأولى", "Sessions 1–6 (the first week) — with practice on one goal starting from the first session"],
      goals: [
        "التصنيفاتُ والمقاييسُ مكتوبة، وعلاماتُ الإحالة مفحوصة، ووضعُ الورك معروف (آخرُ صورةٍ وموعدُ التالية)؛ ومن هدفٍ إلى ثلاثة يختارها الطفلُ وأهلُه مكتوبةٌ بخمس درجات؛ والأهلُ يؤدّون البرنامجَ المنزليّ أمام الأخصائيّ؛ والدعامةُ والوقوفُ والجلوسُ مفحوصةٌ ومقاسة.",
        "Classifications and measures recorded, the referral signs checked, and the hip status known (the last X-ray and the date of the next); one to three goals chosen by the child and family written at five levels; the family performing the home programme in front of the specialist; and the orthosis, standing and seating checked and fitted.",
      ],
      education: [
        "• ما الشللُ الدماغيّ وما المتوقّع: الإصابةُ لا تتقدّم، لكنّ الجسمَ يكبر فتتغيّر العضلاتُ والمفاصل (Rosenbaum 2007)، ومستوى الطفل يرسم مسارَه (Rosenbaum 2002).\n" +
        "• الأهلُ هم العلاج: التكرارُ اليوميّ في البيت هو ما يصنع الفرق (Morgan 2021 · Novak 2009).\n" +
        "• الوركُ وصورتُه في موعدها، والألمُ يُخبَر عنه (AACPDM Hip Pathway).\n" +
        "• ما لا ينفع: التحريكُ السلبيّ وحده، والأكسجينُ عالي الضغط، والبدلاتُ بلا إشراف (Novak 2020).",
        "• What cerebral palsy is and what to expect: the injury does not progress, but the body grows, so muscles and joints change (Rosenbaum 2007), and the child's level maps their course (Rosenbaum 2002).\n" +
        "• The family is the treatment: daily repetition at home is what makes the difference (Morgan 2021 · Novak 2009).\n" +
        "• The hip and its X-ray on time, and pain is reported (AACPDM Hip Pathway).\n" +
        "• What does not help: passive handling alone, hyperbaric oxygen, and unsupervised suits (Novak 2020).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الأهدافُ مكتوبةٌ بدرجاتها، والقياسُ الأوّل تمّ.\n" +
        "• لا علامةَ إحالةٍ عاجلة، والوركُ في جدول مراقبته.\n" +
        "• الأهلُ أدّوا البرنامجَ المنزليّ مرّةً على الأقلّ أمام الأخصائيّ.\n" +
        "(اقتراحٌ يتبع السلامةَ والتنظيم، لا معيارٌ مجرَّب.)",
        "Progress to phase 2 when all are met:\n" +
        "• The goals written with their levels, and the first measurement done.\n" +
        "• No urgent referral sign, and the hip on its surveillance schedule.\n" +
        "• The family has performed the home programme at least once in front of the specialist.\n" +
        "(A proposal based on safety and organisation, not a tested criterion.)",
      ],
      notes: [
        "• التقييمُ لا يأخذ الجلسات كلَّها: من الأولى يبدأ التدريبُ على هدفٍ واحد.\n" +
        "• الدعامة: يُفحص المقاسُ والجلد، وتُطلب جديدةٌ من قسم المساند إن صغرت (NICE CG145 2012).\n" +
        "• البوتوكس: موعدُه وموعدُ الجبس والتدريب بعده مع الطبيب (NICE CG145 2012 · Mathevon 2019).\n" +
        "• الرضيعُ والمستويان IV–V: أكثرُ الجلسة تدريبٌ للأهل.\n" +
        "• الأجهزةُ المساعدة بالتناوب وبشروطها في سطورها.",
        "• Assessment does not take all the sessions: practice on one goal starts from the first.\n" +
        "• The orthosis: fit and skin checked, and a new one requested from the orthotics department if outgrown (NICE CG145 2012).\n" +
        "• Botulinum toxin: its date, and the casting and training after it, agreed with the doctor (NICE CG145 2012 · Mathevon 2019).\n" +
        "• Infants and levels IV–V: most of the session is family coaching.\n" +
        "• Adjunct devices in rotation, under the conditions in their lines.",
      ],
      exercises: [
        { code: "cp-goal-task-practice", sets: 3, reps: 5, rest: 60,
          note: ["هدفٌ واحد من الجلسة الأولى، ثمّ الأهدافُ كلُّها.", "One goal from the first session, then all the goals."] },
        { code: "cp-early-motor-play", sets: 1, reps: 10,
          note: ["للرضيع تحت السنتين، ولمن هو في المستويين IV–V ليجلس ويتحكّم برأسه.", "For infants under two, and for levels IV–V to work on sitting and head control."] },
        { code: "sitting-reach", sets: 2, reps: 10,
          note: ["للمستويين III–IV: توازنُ الجلوس على مقعدٍ بارتفاع ركبتيه، والوصولُ إلى لعبة.", "For levels III–IV: sitting balance on a bench at knee height, reaching for a toy."] },
        { code: "cp-afo-wear-skin", sets: 1, reps: 1,
          note: ["فحصُ المقاس والجلد وجدولُ اللبس مكتوب.", "Fit and skin checked, and the wearing schedule written."] },
        { code: "cp-standing-frame-abduction", sets: 1, reps: 1,
          note: ["للمستويات III–V: الزاويةُ والوقتُ مكتوبان للأهل.", "For levels III–V: the angle and time written for the family."] },
        { code: "cp-24h-postural-care", sets: 1, reps: 1,
          note: ["للمستويين IV–V: الجلوسُ والنومُ والأكل.", "For levels IV–V: sitting, sleeping and eating."] },
      ],
    },
    {
      name: ["التدريب المكثّف على الأهداف", "Intensive practice on the goals"],
      sessionFrom: 7, sessionTo: 18,
      timeframe: ["الجلسات ٧–١٨ (الأسبوعان الثاني والثالث)", "Sessions 7–18 (the second and third weeks)"],
      goals: [
        "كلُّ هدفٍ يتقدّم درجةً على الأقلّ؛ والتكرارُ اليوميّ في البيت منتظم؛ وللشلل النصفيّ برنامجُ اليد قائم (القسريّ ثمّ اليدان)؛ ولمن يمشي المسافةُ والسرعةُ تزيدان؛ ولمن لا يمشي الوقوفُ ساعةً يومياً والجلوسُ متناظر.",
        "Every goal up at least one level; regular daily repetition at home; for unilateral palsy the hand programme under way (constraint, then both hands); for walkers, distance and speed increasing; for non-walkers, an hour of standing a day and symmetric sitting.",
      ],
      education: [
        "• التدريبُ الكثير بنجاحٍ متكرّر أفضلُ من القليل المتعب.\n" +
        "• القوّةُ تذهب حين يتوقّف التمرين (Verschuren 2016) — فالبيتُ يستمرّ بعد الكتلة.\n" +
        "• المشيُ في الحياة: إلى المدرسة والسوق، لا على السير وحده (Jackman 2022).",
        "• Plenty of practice with repeated success is better than a little that exhausts.\n" +
        "• Strength fades when training stops (Verschuren 2016) — so home practice continues after the block.\n" +
        "• Walking in daily life: to school and the market, not on the treadmill alone (Jackman 2022).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• كلُّ هدفٍ تقدّم درجةً على الأقلّ في مقياس بلوغ الأهداف (−١ فأكثر)، أو أُعيدت كتابةُ الهدف الذي لم يتقدّم مع سببه.\n" +
        "• البرنامجُ المنزليّ يُؤدّى خمسةَ أيّامٍ في الأسبوع فأكثر بسجلٍّ يكتبه الأهل.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when all are met:\n" +
        "• Every goal up at least one level on goal attainment scaling (−1 or above), or a goal that has not progressed rewritten with its reason.\n" +
        "• The home programme done five days a week or more, recorded by the family.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• الشللُ النصفيّ: العلاجُ القسريّ باللعب ثمّ اليدان (NICE CG145 2012 · Hoare 2019)، والبيتُ ساعتين يومياً (Al-Oraibi 2011).\n" +
        "• مَن يمشي: المشيُ على الأرض والسيرُ مرّتين إلى ثلاثٍ في الأسبوع (Grecco 2013)، والتقويةُ يوماً بعد يوم (Verschuren 2016)، والدرّاجةُ للياقة.\n" +
        "• بعد البوتوكس: تدريبٌ مكثّف وجبسٌ متسلسل (Mathevon 2019 · Dursun 2017)، وإعادةُ التقييم في ٦–١٢ أسبوعاً (NICE CG145 2012).\n" +
        "• الموجاتُ الصادمة أسبوعياً × ٣ للتشنّج الموضعيّ بشرطها، والروبوتُ لمن لا يكفيه المشيُ بالمساعدة (II–IV) بشرطه.",
        "• Unilateral palsy: constraint-induced play then both hands (NICE CG145 2012 · Hoare 2019), with two hours a day at home (Al-Oraibi 2011).\n" +
        "• Walkers: overground and treadmill walking two to three times a week (Grecco 2013), strengthening every other day (Verschuren 2016), and the bicycle for fitness.\n" +
        "• After botulinum toxin: intensive training and serial casting (Mathevon 2019 · Dursun 2017), with reassessment at 6–12 weeks (NICE CG145 2012).\n" +
        "• Shockwave weekly × 3 for focal spasticity under its condition, and the robot for those for whom assisted walking is not enough (II–IV) under its condition.",
      ],
      exercises: [
        { code: "cp-goal-task-practice", sets: 3, reps: 5, rest: 60 },
        { code: "cp-cimt-play", sets: 1, reps: 10,
          note: ["للشلل النصفيّ: في المركز ثمّ ساعتين يومياً في البيت.", "For unilateral palsy: in the centre, then two hours a day at home."] },
        { code: "cp-bimanual-play", sets: 1, reps: 10,
          note: ["بعد القسريّ في الجلسة نفسِها، وللشلل في الجهتين وحده.", "After constraint in the same session, and on its own for bilateral palsy."] },
        { code: "cp-functional-strength-play", sets: 3, reps: 10, rest: 60,
          note: ["للمستويات I–III، يوماً بعد يوم.", "For levels I–III, every other day."] },
        { code: "cp-treadmill-training", sets: 1, reps: 1,
          note: ["للمستويات I–III، وبالحزام في الثالث؛ ثمّ المشيُ على الأرض.", "For levels I–III, with the harness at level III; then overground walking."] },
        { code: "stationary-cycling", sets: 1, reps: 1,
          note: ["لياقةٌ للمستويات I–III: ٢٠ دقيقةً فأكثر ثلاثاً في الأسبوع (Verschuren 2016)، والقدمان مثبّتتان في الدوّاستين.", "Fitness for levels I–III: 20 minutes or more three times a week (Verschuren 2016), with the feet strapped to the pedals."] },
        { code: "calf-stretch-standing", sets: 3, reps: 1, hold: 30,
          note: ["مع الوقوف والدعامة لا وحده — فالتمطيطُ وحده لا يكفي (Harvey 2017).", "With standing and the orthosis, not alone — stretching alone is not enough (Harvey 2017)."] },
        { code: "cp-standing-frame-abduction", sets: 1, reps: 1,
          note: ["ساعةٌ يومياً خمسةَ أيّامٍ فأكثر.", "An hour a day, five days a week or more."] },
      ],
    },
    {
      name: ["التثبيت والنقل إلى البيت والمدرسة وخطّة الكتلة التالية", "Consolidation, transfer to home and school, and the next block"],
      sessionFrom: 19, sessionTo: 24,
      timeframe: ["الجلسات ١٩–٢٤ (الأسبوعُ الرابع)، ثمّ البرنامجُ المنزليّ ومراجعةٌ كلَّ ثلاثة أشهر", "Sessions 19–24 (the fourth week), then the home programme and a review every three months"],
      goals: [
        "الأهدافُ تُؤدّى في مكانها الحقيقيّ (البيت، والمدرسة، والشارع)؛ والأهلُ يديرون البرنامجَ وحدهم؛ والدعامةُ والوقوفُ والكرسيّ في جدولٍ يوميّ؛ وموعدُ المراجعة وصورةُ الورك والكتلةُ التالية مكتوبة.",
        "The goals performed in their real place (home, school, the street); the family running the programme alone; the orthosis, standing and the chair on a daily schedule; and the review date, the hip X-ray and the next block written down.",
      ],
      education: [
        "• المكسبُ يبقى بالبرنامج المنزليّ وينقص بدونه (Opheim 2025).\n" +
        "• المراجعةُ كلَّ ثلاثة أشهر، وصورةُ الورك بموعدها، والكتلةُ التالية بأهدافٍ جديدة.\n" +
        "• النشاطُ اليوميّ: ساعةُ حركةٍ متوسّطة، ولا جلوسَ متواصلاً أكثرَ من ساعتين لمن يقدر (Verschuren 2016).",
        "• The gain is kept with the home programme and lost without it (Opheim 2025).\n" +
        "• A review every three months, the hip X-ray on time, and the next block with new goals.\n" +
        "• Daily activity: an hour of moderate activity, and no more than two hours of continuous sitting for those who can (Verschuren 2016).",
      ],
      criteria: [
        "الخروجُ من الكتلة حين تتحقّق كلُّها:\n" +
        "• الأهدافُ في «المتوقّع» (٠) فأكثر، أو تقدّمٌ بلا بلوغٍ مع سببٍ مكتوب.\n" +
        "• الحركةُ الكبرى ثابتةٌ أو ارتفعت بالفرق المهمّ لمستواه (Oeffinger 2008).\n" +
        "• الأهلُ يؤدّون البرنامجَ وحدهم، والجدولُ اليوميّ مكتوب.\n" +
        EXTEND_AR,
        "Discharge from the block when all are met:\n" +
        "• The goals at 'expected' (0) or better, or progress without reaching it with a written reason.\n" +
        "• Gross motor function stable or up by the important difference for the child's level (Oeffinger 2008).\n" +
        "• The family runs the programme alone, with the daily schedule written down.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• التدريبُ في المكان الحقيقيّ: المدرسة، والسوق، والجامع، والحديقة.\n" +
        "• المشيُ في المجتمع بالعوائق والكلام لمن يمشي، ومهاراتُ الكرسيّ لمن لا يمشي.\n" +
        "• أهدافُ الكتلة التالية تُكتب مع الأهل، وموعدُ صورة الورك.\n" +
        "• التصويرُ بالفيديو في آخر جلسة بموافقة الأهل للمقارنة في المراجعة.",
        "• Practice in the real place: school, the market, the mosque, the park.\n" +
        "• Community walking with obstacles and talking for walkers, and wheelchair skills for non-walkers.\n" +
        "• Goals for the next block written with the family, and the hip X-ray date.\n" +
        "• A video at the last session, with the family's consent, for comparison at the review.",
      ],
      exercises: [
        { code: "cp-goal-task-practice", sets: 3, reps: 5, rest: 60,
          note: ["في المكان الحقيقيّ للهدف.", "In the goal's real place."] },
        { code: "cp-bimanual-play", sets: 1, reps: 10,
          note: ["مهامُّ أهداف الطفل اليومية باليدين.", "The child's daily goal tasks with both hands."] },
        { code: "cp-functional-strength-play", sets: 3, reps: 10, rest: 60,
          note: ["برنامجُ البيت يوماً بعد يوم ١٢–١٦ أسبوعاً (Verschuren 2016).", "The home programme every other day for 12–16 weeks (Verschuren 2016)."] },
        { code: "obstacle-dual-task-walking", sets: 1, reps: 5,
          note: ["للمستويين I–II: المشيُ في الشارع والمدرسة.", "For levels I–II: walking in the street and at school."] },
        { code: "wheelchair-skills", sets: 1, reps: 5,
          note: ["للمستويات III–V: الكرسيُّ اليدويّ أو الكهربائيّ للتنقّل المستقلّ.", "For levels III–V: a manual or powered chair for independent mobility."] },
        { code: "cp-afo-wear-skin", sets: 1, reps: 1,
          note: ["الطفلُ الأكبر يلبسها ويفحص جلدَه بنفسه.", "An older child puts it on and checks their own skin."] },
        { code: "cp-24h-postural-care", sets: 1, reps: 1,
          note: ["الجدولُ الكامل نهاراً وليلاً.", "The full schedule, day and night."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ كتلةٌ من ٢٤ جلسة بستٍّ في الأسبوع (أربعةُ أسابيع) وتمديدٌ واحد باثنتي عشرة لهدف اليد، ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر وكتلةٌ جديدة بأهدافٍ جديدة — والكتلُ تساوي العلاجَ المستمرّ بالمجموع نفسِه ولا تجربةَ وجدت اليوميَّ المستمرّ شهوراً أفضل، والأهلُ يتوقّعون علاجاً مستمرّاً: أبقِ الكتلة، أو اجعلها أربعاً في الأسبوع أربعةَ أسابيع (كالتجارب)، أو ثلاثاً في الأسبوع مستمرّاً؛ وكم كتلةً في السنة (اثنتان أم ثلاث)، وما يُعطى بينها (زيارةٌ شهرية للبرنامج المنزليّ؟)",
    en: "A block of 24 sessions at six a week (four weeks) with one extension of twelve for a hand goal, then a home programme with a review every three months and a new block with new goals — blocks equal continuous therapy at the same total (Christiansen 2008 · Opheim 2025) and no trial found continuous daily therapy over months better, while families expect continuous treatment: keep the block, make it four a week for four weeks (as in the trials — Trahan 2002), or three a week continuously; and how many blocks a year (two or three), and what is given between them (a monthly home-programme visit?)" },
  { key: "limits", topic: "limits",
    ar: "الحدود: درجةٌ في مقياس بلوغ الأهداف للانتقال، و«المتوقّع» (٠) للخروج، والحركةُ الكبرى بالفرق المهمّ لمستواه (١٫٧ / ١٫٠ / ٠٫٧ في الأوّل والثاني والثالث، ولا رقمَ للرابع والخامس)، والتمديدُ لهدف اليد أو لهدفٍ تقدّم درجة — اقتراحٌ لا معيارٌ مجرَّب: أبقِها أو عدّلها.",
    en: "The limits: one level on goal attainment scaling to progress, 'expected' (0) to discharge, gross motor function by the important difference for the level (1.7 / 1.0 / 0.7 at I, II and III — Oeffinger 2008, with no figure for IV and V), and extension for a hand goal (Jackman 2020) or a goal that has moved up a level — proposals, not tested criteria: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة مع طبيب المركز: الطوارئ (نوبةٌ لا تتوقّف، والاختناق، والكسرُ بلا إصابة، والضعفُ بعد البوتوكس)، والأعصاب (فقدُ مهارة، أو لا سبب، أو قصّةٌ عائلية — فأمراضٌ استقلابية تشبهه)، والعظام (الإزاحةُ فوق ٣٠٪ أو التبعيدُ أقلُّ من ٣٠°)، والأطفال (البلعُ والصدرُ والوزن)، والتأهيل (البوتوكسُ والجبسُ والجراحة): راجعها — ومَن يطلب صورةَ الحوض ويقرأ نسبةَ الإزاحة في المركز، وبأيّ جدول؟",
    en: "The referral rules with the centre's doctor: emergency (a seizure that does not stop, choking, a fracture without injury, weakness after botulinum toxin — Rashid 2018), neurology (loss of a skill, no cause, a family history — metabolic mimics, Leach 2014 · NICE NG62 2017), orthopaedics (migration over 30% or abduction under 30° — AACPDM Hip Pathway), paediatrics (swallowing, chest and weight — Gibson 2021), and rehabilitation (toxin, casting, surgery — NICE CG145 2012): review them — and who orders the pelvic X-ray and reads the migration percentage in the centre, and on what schedule?" },
  { key: "orthoses-equipment", topic: "content",
    ar: "المركزُ يصنع الدعامات: مَن يختار نوعَها (صلبة، أو بمفصل، أو المضادّة لثني الركبة) ومتى تُراجَع (عند التسليم، وبعد أسبوعين، وفي كلّ زيارة)؟ وأجهزةُ الوقوف والكراسيُّ المكيَّفة: هل يوفّرها المركز أو يدلّ عليها؟ والجبسُ المتسلسل بعد البوتوكس: مَن يضعه؟",
    en: "The centre makes orthoses: who chooses the type (solid, hinged, or ground-reaction for crouch — NICE CG145 2012) and when are they reviewed (at delivery, after two weeks, and at every visit)? Standers and adapted seating: does the centre supply them or refer for them? And serial casting after botulinum toxin (Mathevon 2019): who applies it?" },
  { key: "device-shockwaves", topic: "settings",
    ar: "الموجاتُ الصادمة مساعدٌ للتشنّج الموضعيّ (عضلةُ الساق أوّلاً) أسبوعياً ثلاثَ جلسات مع التدريب والدعامة — املأ إعداداتِها من جهاز المركز (النوعُ والشدّةُ والتردّدُ والنبضات) فلا يُعتمد البروتوكولُ قبلها، أو اجعلها «لا يُستخدم»؛ ومن أيّ عمرٍ تُعطى في المركز؟",
    en: "Shockwave is an adjunct for focal spasticity (the calf first) weekly for three sessions with training and the orthosis (Kim 2019 · Peng 2025 · de Roo 2025) — fill in its settings from the centre's device (type, intensity, frequency, impulses), as the protocol cannot be approved before that, or set it to 'Not used'; and from what age is it given in the centre?" },
  { key: "device-robotik", topic: "devices",
    ar: "الروبوتُ مساعدٌ بشرط (المستويات II–IV لمن لا يكفيه المشيُ بالمساعدة) والدليلُ متضارب: هل يناسب جهازُ المركز طولَ ساق الطفل وفيه حزامُ أطفال، ومن أيّ عمرٍ أو طول؟ أبقِه بشرطه، أو اجعله «لا يُستخدم».",
    en: "The robot is a conditional adjunct (levels II–IV for those for whom assisted walking is not enough) and the evidence conflicts (Conner 2022 · Al Matairi 2026): does the centre's device fit a child's leg length with a children's harness, and from what age or height? Keep it with its condition, or set it to 'Not used'." },
  { key: "device-others", topic: "devices",
    ar: "التحفيزُ العضليّ مساعدٌ أثناء النشاط؛ والكمادةُ لمن يقول «حارّ» وحده؛ والمغناطيسُ بقاعدتك بدليلٍ ضعيف وممنوعٌ مع صمّام التحويلة القابل للبرمجة والمضخّة والقوقعة — ما نوعُ جهازه؟ واملأ إعداداته؛ والليزرُ والإبرُ والجهازُ السلبيّ «لا يُستخدم» ولكلٍّ دليلٌ ضعيف في سطره، والباقي «لا يُستخدم»: أبقِها أو غيّرها.",
    en: "Muscle stimulation is an adjunct during activity (Chen 2023); the hot pack only for a child who can say 'hot'; magnetic therapy by your rule with weak evidence (Pulay 2024) and barred with a programmable shunt valve, a pump or a cochlear implant — which type is the device? Fill in its settings; laser, needling and the passive device are 'Not used', each with weak evidence in its line (Jimenez 2024 · Alkhamees 2026 · Wang 2023a), and the rest are 'Not used': keep or change them." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: بلوغَ الأهداف (من −٢ إلى +٢، الأكثر أفضل)، والأداءَ الكنديّ (من ١٠، الأكثر أفضل — له نسخةٌ عربية)، والمشيَ ستّ دقائق بالمتر، ومقياسَ التنقّل الوظيفيّ العربيّ، ونسبةَ إزاحة الورك من الصورة (٪، الأقلّ أفضل)، والألمَ بالمقياس المناسب؛ والتصنيفاتُ الأربعة تُكتب في التقييم — ولا نسخةَ عربيةً مُتحقَّقاً منها للحركة الكبرى ولا لبلوغ الأهداف.",
    en: "Add under 'Measures' → custom measure: goal attainment scaling (−2 to +2, higher is better — Krasny-Pacini 2013), the Canadian Occupational Performance Measure (out of 10, higher is better — Arabic version, Hadoush 2026), the six-minute walk in metres (Thompson 2008), the Arabic Functional Mobility Scale (Albalwi 2023), the hip migration percentage from the X-ray (%, lower is better), and pain on the suitable scale; the four classifications are recorded at assessment — there is no verified Arabic version of the gross motor measure or of goal attainment scaling." },
];

export const name = "166_physio_cerebral_palsy_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
