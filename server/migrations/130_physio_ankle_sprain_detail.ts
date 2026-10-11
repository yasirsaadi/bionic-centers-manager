// Migration 130: التواءُ الكاحل الوحشيّ — البروتوكولُ السابع مفصَّلاً (§4.dm — ٢٠٢٦-١٠-١١).
//
// البروتوكولُ السابع بالترتيب المتّفق عليه (§4.cx): «ابدأ البروتوكول الذي بعده» — التواءُ الكاحل الوحشيّ (`ankle-sprain-adult`). **بالقالب كاملاً** (§4.dd):
// ١٢ جلسة × ستّ في الأسبوع × ٥٠ دقيقة، وثلاثُ مراحل بنطاقات جلساتٍ (١–٣ · ٤–٨ · ٩–١٢) ومعايير انتقال، وتسعُ بطاقاتٍ جديدة (وثماني صورٍ مطلوبة — فتوازنُ الكاحل
// بصورة «الوقوف على ساقٍ واحدة» منسوخةً، ورفعُ الكعبين من قبل بصورته، بقاعدة المالك «لا تطلب صوراً مكرّرة»)، والأجهزةُ السبعة بدرجة دليلها و«استعمال المركز»
// وإعداداتها، والمقاييسُ كما زُرعت (FAAM-ADL، واختبارُ Y). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الكاحل**: العلاجُ الوظيفيّ (دعامةٌ أو شريط وتحميلٌ متدرّج — JOSPT 2021 «A») والتمرينُ المنظَّم في المركز والبيت («A») والعلاجُ اليدويّ مع التمرين
// («A»)، والتثبيتُ حتى عشرة أيّام للشديد وحده («A» · Lamb 2009). **والدليلُ يخالف نموذجَ المركز للبسيط فكُتب صريحاً**: العلاجُ المشرَف عليه لم يفُق الرعايةَ
// المعتادة في الدرجتين الأولى والثانية (Brison 2016)، والتمرينُ في الأسبوع الأوّل حسّن الوظيفة (Bleakley 2010)، والتوازنُ في البيت ثمانيةَ أسابيع قلّل التكرار
// (Hupperets 2009) — فالبسيطُ تعليمٌ وبرنامجٌ منزليّ وجلساتٌ قليلة، والعددُ لسليم. والأجهزة: الأمواجُ فوق الصوتية «لا» («A»)، والليزرُ متضارب (JOSPT «قد»
// وVuurberg «لا»)، والتحفيزُ متضارب («D»)، والتيكارُ والمغناطيسُ والضغطُ بلا توصية؛ والاستعمالُ بقاعدة سليم (التحفيزُ والتيكارُ والمغناطيسُ مساعدة، والليزرُ
// والأمواجُ لا تُستخدم حتى يقرّر، والضغطُ كما زُرع).
//
// المصادرُ عشرون، عناوينُها ومعرّفاتُها من سجلّ Europe PMC. القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٤ من ١٠ مقبول إن هدأ خلال ساعة، بلا زيادةٍ في التورّم صباحَ اليوم التالي.";
const PAIN_RULE_EN = "Pain up to 4/10 during exercise is acceptable if it settles within an hour, with no increase in swelling the next morning.";
const ALTERNATE: [string, string] = ["يوماً بعد يوم.", "Alternate days."];

/** **البطاقاتُ الجديدة** — ورفعُ الكعبين (ترحيل ١٢٦) برمزه وصورته؛ وتوازنُ الكاحل بطاقةٌ جديدة **بصورة «الوقوف على ساقٍ واحدة» نفسِها** (§4.cx التكملة). */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "ankle-alphabet", nameAr: "كتابة الحروف بالقدم (حركة الكاحل الفعّالة)", nameEn: "Ankle alphabet (active ankle range of motion)",
    kind: "mobility", region: "ankle_foot", perSide: true, sets: 2, reps: 1, rest: 30,
    purpose: ["يحرّك الكاحلَ في كلّ الاتّجاهات بلا حمل منذ الأيّام الأولى — فيقلّل التيبّسَ والتورّم ويُعيد الحركةَ قبل أن يتحمّل الكاحلُ الوزن.",
      "Moves the ankle in every direction without load from the first days — reducing stiffness and swelling and restoring movement before the ankle takes weight."],
    start: ["جالسٌ أو مستلقٍ والساقُ مرفوعةٌ على وسادةٍ أو كرسيّ، والقدمُ في الهواء.",
      "Sitting or lying with the leg raised on a cushion or chair and the foot free in the air."],
    steps: [[
      "تخيّل قلماً في إصبع القدم الكبير.",
      "اكتب الحروفَ (أ إلى ي) في الهواء بحركة الكاحل وحده، والساقُ ثابتة.",
      "اجعل الحروفَ كبيرةً بقدر ما يسمح الألم.",
      "استرح ثمّ أعِد مرّةً ثانية.",
    ], [
      "Imagine a pen attached to your big toe.",
      "Write the letters of the alphabet in the air by moving the ankle alone, keeping the leg still.",
      "Make the letters as large as pain allows.",
      "Rest, then repeat once more.",
    ]],
    cues: [[
      "تحريكُ الساق أو الركبة بدل الكاحل ⟵ الساقُ ثابتة والحركةُ من الكاحل.",
      "حركةٌ سريعة إلى ألمٍ حادّ ⟵ حروفٌ أصغر وأبطأ.",
      "القدمُ متدلّيةٌ تحت مستوى القلب في الأيّام الأولى ⟵ الساقُ مرفوعة لتخفيف التورّم.",
    ], [
      "Moving the leg or knee instead of the ankle → keep the leg still and move only the ankle.",
      "Fast movements into sharp pain → smaller, slower letters.",
      "The foot hanging below heart level in the first days → keep the leg raised to reduce swelling.",
    ]],
    easier: ["حروفٌ أصغر، أو حركةُ الكاحل إلى الأعلى والأسفل وحدها.", "Smaller letters, or only moving the ankle up and down."],
    harder: ["حروفٌ أكبر بعينين مغلقتين، ثمّ الانتقالُ إلى التمارين في الوقوف.", "Larger letters with the eyes closed, then progress to exercises in standing."],
    stopIf: ["ألمٌ حادّ يزداد، أو تورّمٌ يزيد بعد التمرين، أو تنميلٌ في القدم.", "Sharp, increasing pain, swelling that rises after exercise, or tingling in the foot."],
    equipment: ["وسادةٌ أو كرسيّ لرفع الساق.", "A cushion or chair to raise the leg."],
    doseNote: ["مرّتين أو ثلاثاً يومياً، ومع رفع الساق.", "Two or three times daily, with the leg raised."],
    images: [{ key: "ankle-alphabet-1", ar: "جالسٌ والساقُ ممدودة، والقدمُ ترسم حرفاً في الهواء", en: "Sitting with the leg out, the foot tracing a letter in the air", search: "ankle alphabet exercise" }],
  },
  {
    code: "ankle-isometrics", nameAr: "تمارين الكاحل الثابتة في الاتّجاهات الأربعة", nameEn: "Ankle isometrics in four directions",
    kind: "strength", region: "ankle_foot", perSide: true, sets: 1, reps: 10, hold: 5, rest: 5,
    purpose: ["أوّلُ تقويةٍ لعضلات الكاحل بلا حركةٍ في المفصل — وأهمُّها عضلاتُ الجهة الخارجية (الشظويّة Peroneals) التي تحمي الكاحلَ من الالتواء ثانيةً.",
      "The first strengthening of the ankle muscles without moving the joint — above all the outer-side muscles (peroneals), which protect the ankle from turning again."],
    start: ["جالسٌ والقدمُ على الأرض بجانب رجل كرسيٍّ أو حائط، أو مقابل يدِك.",
      "Sitting with the foot on the floor beside a chair leg or a wall, or against your hand."],
    steps: [[
      "للخارج: ادفع بحافّة القدم الخارجية في رجل الكرسيّ أو الحائط — بلا حركة.",
      "للداخل: ادفع بالحافّة الداخلية في رجل الكرسيّ الأخرى أو بالقدم الأخرى.",
      "للأعلى والأسفل: ادفع بظهر القدم ثمّ بباطنها في يدك.",
      "اثبت ٥ ثوانٍ في كلّ اتّجاه بشدّةٍ مريحة، وأرخِ، وكرّر ١٠ مرّات.",
    ], [
      "Outwards: push the outer edge of the foot into the chair leg or wall — without moving.",
      "Inwards: push the inner edge into the other chair leg or against the other foot.",
      "Up and down: push the top of the foot, then the sole, against your hand.",
      "Hold 5 seconds in each direction at a comfortable effort, relax, and repeat 10 times.",
    ]],
    cues: [[
      "تحريكُ الركبة أو الورك بدل الدفع بالكاحل ⟵ الساقُ ثابتة، والدفعُ من القدم.",
      "دفعٌ بكلّ القوّة يؤلم ⟵ نصفُ القوّة يكفي في البداية.",
      "حبسُ النفس ⟵ تنفّس طوال الثبات.",
    ], [
      "Moving the knee or hip instead of pushing with the ankle → keep the leg still and push from the foot.",
      "Pushing with full force and pain → half effort is enough at first.",
      "Holding the breath → breathe throughout the hold.",
    ]],
    easier: ["شدّةٌ أخفّ وثباتٌ أقصر (٣ ثوانٍ).", "Lighter effort and shorter holds (3 seconds)."],
    harder: ["ثباتٌ ١٠ ثوانٍ، ثمّ الانتقالُ إلى المطّاط.", "10-second holds, then progress to the resistance band."],
    stopIf: ["ألمٌ حادّ أو تورّمٌ يزيد بعد التمرين.", "Sharp pain or swelling that increases after exercise."],
    equipment: ["كرسيّ أو حائط.", "A chair or a wall."],
    doseNote: ["يومياً، مرّتين.", "Daily, twice."],
    images: [{ key: "ankle-isometrics-1", ar: "جالسٌ يدفع بحافّة قدمه الخارجية في رجل كرسيّ", en: "Seated, pushing the outer edge of the foot into a chair leg", search: "isometric ankle eversion exercise" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "band-ankle-strengthening", nameAr: "تقوية الكاحل بالمطّاط (وخاصّةً قلب القدم للخارج)", nameEn: "Resistance band ankle strengthening (eversion focus)",
    kind: "strength", region: "ankle_foot", perSide: true, sets: 3, reps: 15, rest: 45,
    purpose: ["يقوّي عضلاتِ الكاحل في الاتّجاهات الأربعة بمقاومةٍ تزيد — والأهمُّ قلبُ القدم للخارج (العضلات الشظويّة) لأنّها تقاوم انقلابَ القدم إلى الداخل.",
      "Strengthens the ankle muscles in all four directions against increasing resistance — most importantly turning the foot outwards (peroneals), because they resist the foot rolling inwards."],
    start: ["جالسٌ والساقُ ممدودة، والمطّاطُ حول مقدّمة القدم: مثبَّتٌ جانباً للقلب إلى الخارج والداخل، أو بيدك للأعلى والأسفل.",
      "Sitting with the leg out and a band around the forefoot: anchored to the side for turning out and in, or held in your hands for up and down."],
    steps: [[
      "للخارج: والمطّاطُ مثبَّتٌ من الجهة الداخلية، أدِر القدمَ للخارج ببطء والساقُ ثابتة.",
      "للداخل والأعلى: غيّر نقطةَ التثبيت وأدِّ الحركةَ نفسَها.",
      "للأسفل: اضغط بمقدّمة القدم إلى الأسفل والمطّاطُ بيديك.",
      "عُد ببطءٍ في ثانيتين في كلّ تكرار.",
    ], [
      "Outwards: with the band anchored on the inner side, turn the foot slowly outwards, keeping the leg still.",
      "Inwards and upwards: change the anchor point and do the same movement.",
      "Downwards: press the forefoot down with the band held in your hands.",
      "Return slowly over 2 seconds on every repetition.",
    ]],
    cues: [[
      "دورانُ الساق كلّها من الورك ⟵ الحركةُ من الكاحل والركبةُ تشير إلى الأعلى.",
      "عودةٌ سريعة مرتدّة ⟵ عودةٌ بطيئةٌ متحكَّم بها.",
      "مدىً صغيرٌ جداً ⟵ المدى كاملاً بلا ألم.",
    ], [
      "Rotating the whole leg from the hip → move only at the ankle with the kneecap pointing up.",
      "A fast, snapping return → a slow, controlled return.",
      "A very small range → the full pain-free range.",
    ]],
    easier: ["مطّاطٌ أخفّ أو مدىً أصغر.", "A lighter band or a smaller range."],
    harder: ["مطّاطٌ أقوى، ثمّ في الوقوف مع المطّاط حول القدم.", "A stronger band, then in standing with the band around the foot."],
    stopIf: ["ألمٌ حادّ في الكاحل أو تورّمٌ يزيد.", "Sharp ankle pain or increasing swelling."],
    equipment: ["مطّاطُ مقاومةٍ بدرجات، ونقطةُ تثبيت.", "Graded resistance bands and an anchor point."],
    doseNote: ["يومياً أو يوماً بعد يوم.", "Daily or on alternate days."],
    images: [{ key: "band-ankle-strengthening-1", ar: "جالسٌ والمطّاطُ حول مقدّمة القدم، والقدمُ تدور للخارج ضدّه", en: "Seated with a band around the forefoot, the foot turning outwards against it", search: "resistance band ankle eversion" }],
  },
  {
    code: "knee-to-wall-lunge", nameAr: "الطعنة نحو الحائط (ثني الكاحل حاملاً الوزن)", nameEn: "Knee-to-wall lunge (weight-bearing dorsiflexion)",
    kind: "mobility", region: "ankle_foot", perSide: true, sets: 2, reps: 10, hold: 2, rest: 30,
    purpose: ["يستعيد انثناءَ الكاحل إلى الأعلى وهو يحمل الوزن — ونقصُه بعد الالتواء يغيّر المشيَ والنزولَ على الدرج ويزيد خطرَ التكرار؛ والمسافةُ من الحائط تُقاس فتُرى المقارنةُ بالجهة الأخرى.",
      "Restores upward bending of the ankle under body weight — its loss after a sprain alters walking and going downstairs and raises the risk of recurrence; the distance from the wall is measured and compared with the other side."],
    start: ["واقفٌ مواجهاً الحائط، والقدمُ المصابة أمام الأخرى وأصابعُها على بعد ٥–١٠ سم من الحائط، واليدان على الحائط.",
      "Standing facing a wall with the injured foot in front, its toes 5–10 cm from the wall, hands on the wall."],
    steps: [[
      "اثنِ الركبةَ الأمامية لتلمس الحائط، والكعبُ على الأرض.",
      "اثبت ثانيتين حين تلمس الركبةُ الحائط.",
      "عُد ببطء.",
      "إن لمست الركبةُ الحائطَ بسهولة فأبعِد القدمَ سنتيمتراً وكرّر.",
    ], [
      "Bend the front knee to touch the wall, keeping the heel on the floor.",
      "Hold 2 seconds when the knee touches the wall.",
      "Return slowly.",
      "If the knee touches the wall easily, move the foot back a centimetre and repeat.",
    ]],
    cues: [[
      "ارتفاعُ الكعب ⟵ الكعبُ ثابتٌ على الأرض؛ قرّب القدمَ من الحائط.",
      "الركبةُ تميل إلى الداخل ⟵ الركبةُ فوق الإصبع الثاني.",
      "قرصٌ مؤلم في مقدّمة الكاحل ⟵ مدىً أقلّ، والمعالجُ يحرّك المفصلَ أوّلاً.",
    ], [
      "The heel lifting → keep the heel down; move the foot closer to the wall.",
      "The knee collapsing inwards → knee over the second toe.",
      "A painful pinch at the front of the ankle → less range, and joint mobilisation by the therapist first.",
    ]],
    easier: ["القدمُ أقربُ إلى الحائط، أو جالساً بسحب القدم تحت الكرسيّ.", "The foot closer to the wall, or seated sliding the foot back under the chair."],
    harder: ["ثباتٌ أطول، أو مع حزامٍ يسحب الساقَ إلى الخلف (بإشراف المعالج).", "Longer holds, or with a belt drawing the shin back (with the therapist)."],
    stopIf: ["ألمٌ حادّ في مقدّمة الكاحل أو خارجه، أو تورّمٌ يزيد.", "Sharp pain at the front or outside of the ankle, or increasing swelling."],
    equipment: ["حائط، وشريطُ قياس.", "A wall and a tape measure."],
    doseNote: ["يومياً، مرّتين.", "Daily, twice."],
    images: [{ key: "knee-to-wall-lunge-1", ar: "القدمُ أمام الحائط والركبةُ تنثني لتلمسه والكعبُ على الأرض", en: "Foot in front of a wall, the knee bending to touch it with the heel down", search: "knee to wall ankle dorsiflexion" }],
  },
  {
    code: "ankle-single-leg-balance", nameAr: "الوقوف على ساقٍ واحدة لثبات الكاحل", nameEn: "Single-leg balance for ankle stability",
    kind: "balance", region: "ankle_foot", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["من أقوى ما في الدليل لمنع تكرار الالتواء مع الدعامة: تدريبُ التوازن على الساق المصابة يعيد إحساسَ الكاحل بوضعه وسرعةَ ردّ العضلات — وفقدُهما هو ما يجعل الكاحلَ «يخون».",
      "Among the strongest evidence for preventing another sprain, alongside bracing: balance training on the injured leg restores the ankle's position sense and the speed of the muscle response — whose loss is what makes the ankle 'give way'."],
    start: ["واقفٌ على الساق المصابة بجانب كرسيٍّ أو طاولة، والأصابعُ تلمسها عند الحاجة، والركبةُ مستقيمةٌ غير مقفلة.",
      "Standing on the injured leg beside a chair or table, fingertips touching it if needed, with the knee straight but not locked."],
    steps: [[
      "ارفع الساقَ الأخرى قليلاً عن الأرض.",
      "ابقَ متوازناً ٣٠ ثانية، والحوضُ مستوٍ والنظرُ إلى الأمام.",
      "استرح، ثمّ كرّر ٣ مرّات.",
      "حين يصير سهلاً: بعينين مغلقتين، ثمّ على وسادة، ثمّ مع رمي كرةٍ والتقاطها.",
    ], [
      "Lift the other leg slightly off the floor.",
      "Stay balanced for 30 seconds with the pelvis level and the eyes forward.",
      "Rest, then repeat 3 times.",
      "When easy: eyes closed, then on a cushion, then throwing and catching a ball.",
    ]],
    cues: [[
      "الإمساكُ بقوّةٍ بالكرسيّ ⟵ أطرافُ الأصابع تلمسه فقط.",
      "انقلابُ القدم إلى الداخل ⟵ الوزنُ على القدم كلّها والإصبعُ الكبير على الأرض.",
      "ميلُ الحوض أو الجذع ⟵ الحوضُ مستوٍ والجذعُ منتصب.",
    ], [
      "Gripping the chair hard → fingertips only touching it.",
      "The foot rolling inwards → weight spread across the whole foot with the big toe on the floor.",
      "The pelvis or trunk tilting → level pelvis and upright trunk.",
    ]],
    easier: ["ثباتٌ أقصر (١٠ ثوانٍ)، أو الساقُ الأخرى تلمس الأرض خفيفاً.", "Shorter holds (10 seconds), or the other foot lightly touching the floor."],
    harder: ["بعينين مغلقتين، أو على وسادةٍ أو لوح توازن، أو مع حركة الذراعين والكرة.", "Eyes closed, on a cushion or wobble board, or with arm movements and a ball."],
    stopIf: ["ألمٌ حادّ في الكاحل، أو إحساسٌ بأنّه يخون.", "Sharp ankle pain, or a feeling of the ankle giving way."],
    equipment: ["كرسيٌّ أو طاولة، ووسادةٌ أو لوحُ توازن، وكرة.", "A chair or table, a cushion or wobble board, and a ball."],
    doseNote: ["يومياً، ويستمرّ في البيت ثمانية أسابيع بعد الإصابة على الأقلّ.", "Daily, continuing at home for at least eight weeks after the injury."],
    images: [{ key: "ankle-single-leg-balance-1", ar: "واقفٌ على ساقٍ واحدة بجانب كرسيّ وأطرافُ الأصابع تلامسه", en: "Standing on one leg beside a chair, fingertips touching it", search: "single leg stance balance exercise chair" }],
  },
  {
    code: "star-excursion-reach", nameAr: "الوصول بالقدم في اتّجاهات النجمة", nameEn: "Star excursion reach",
    kind: "balance", region: "ankle_foot", perSide: true, sets: 2, reps: 5, rest: 30,
    purpose: ["يدرّب ثباتَ الكاحل والركبة والورك وهو يحمل الوزن ويتحرّك — بمدّ القدم الأخرى إلى الأمام والجانبين والخلف؛ ومسافةُ الوصول نفسُها مقياسُ التقدّم (اختبارُ Y).",
      "Trains ankle, knee and hip control under body weight while moving — reaching the other foot forwards, sideways and backwards; the reach distance itself is the progress measure (Y-balance test)."],
    start: ["واقفٌ على الساق المصابة في وسط ثلاثة خطوطٍ على الأرض (أمام، خلفٌ داخليّ، خلفٌ خارجيّ)، واليدان على الخصر.",
      "Standing on the injured leg at the centre of three lines on the floor (forward, back-inside, back-outside), hands on the hips."],
    steps: [[
      "مدّ القدمَ الأخرى على الخطّ الأماميّ أبعدَ ما تستطيع، والمسِ الأرضَ بأطراف أصابعها لمساً خفيفاً.",
      "عُد إلى الوسط دون أن تضع وزناً على القدم الممدودة.",
      "كرّر على الخطّين الخلفيّين.",
      "خمسُ مرّاتٍ لكلّ اتّجاه، ويُسجَّل أبعدُ وصول.",
    ], [
      "Reach the other foot along the forward line as far as you can, lightly touching the floor with the toes.",
      "Return to the centre without putting weight on the reaching foot.",
      "Repeat along the two back lines.",
      "Five reaches in each direction, recording the furthest reach.",
    ]],
    cues: [[
      "الكعبُ يرتفع عن الأرض ⟵ القدمُ الحاملة كاملةٌ على الأرض.",
      "الركبةُ تميل إلى الداخل ⟵ الركبةُ فوق الإصبع الثاني.",
      "الاتّكاءُ على القدم الممدودة ⟵ لمسٌ خفيف فقط، والوزنُ على الساق الحاملة.",
    ], [
      "The heel lifting off → the standing foot stays flat.",
      "The knee collapsing inwards → knee over the second toe.",
      "Leaning on the reaching foot → a light touch only, with weight on the standing leg.",
    ]],
    easier: ["مسافةٌ أقصر، أو بجانب طاولةٍ للإمساك.", "Shorter reaches, or beside a table to hold."],
    harder: ["مسافةٌ أبعد، أو اتّجاهاتٌ أكثر (ثمانية)، أو على سطحٍ ليّن.", "Longer reaches, more directions (eight), or on a soft surface."],
    stopIf: ["ألمٌ حادّ في الكاحل أو الركبة، أو إحساسٌ بأنّ الكاحلَ يخون.", "Sharp ankle or knee pain, or a feeling of the ankle giving way."],
    equipment: ["شريطٌ لاصق على الأرض أو خطوطٌ مرسومة، وشريطُ قياس.", "Tape lines on the floor and a tape measure."],
    doseNote: ["يوماً بعد يوم أو يومياً.", "Alternate days or daily."],
    images: [{ key: "star-excursion-reach-1", ar: "واقفٌ على ساقٍ واحدة يمدّ القدمَ الأخرى على خطٍّ إلى الأمام", en: "Standing on one leg, reaching the other foot forward along a line", search: "star excursion balance exercise" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "forward-hop-stick", nameAr: "القفز إلى الأمام والثبات على ساقٍ واحدة", nameEn: "Forward hop and stick",
    kind: "functional", region: "ankle_foot", perSide: true, sets: 3, reps: 5, rest: 60,
    purpose: ["يعلّم الكاحلَ أن يمتصّ الهبوطَ ويثبت عليه — وهي لحظةُ أغلب الالتواءات في الرياضة والعمل؛ ويبدأ بالساقين ثمّ بساقٍ واحدة.",
      "Teaches the ankle to absorb a landing and stay steady on it — the moment of most sprains in sport and work; it starts on two legs, then on one."],
    start: ["واقفٌ على الساق المصابة خلف خطٍّ على الأرض، والركبةُ مثنيّةٌ قليلاً.",
      "Standing on the injured leg behind a line on the floor with the knee slightly bent."],
    steps: [[
      "اقفز إلى الأمام مسافةً قصيرة (٢٠–٣٠ سم في البداية).",
      "اهبط على الساق نفسِها بركبةٍ مثنيّة، وابقَ ثابتاً ثلاثَ ثوانٍ دون أن تلمس الأرضَ بالأخرى.",
      "عُد إلى البداية مشياً.",
      "خمسُ مرّات، ثمّ زِد المسافة.",
    ], [
      "Hop forward a short distance (20–30 cm at first).",
      "Land on the same leg with a bent knee and hold steady for three seconds without touching down with the other foot.",
      "Walk back to the start.",
      "Five times, then increase the distance.",
    ]],
    cues: [[
      "هبوطٌ بركبةٍ مستقيمة وصوتٌ عالٍ ⟵ هبوطٌ ناعمٌ بانثناء الركبة والورك.",
      "الركبةُ تميل إلى الداخل عند الهبوط ⟵ الركبةُ فوق الإصبع الثاني.",
      "اهتزازٌ ولمسُ الأرض بالأخرى ⟵ مسافةٌ أقصر حتى يثبت.",
    ], [
      "Landing stiff-kneed and loudly → a soft landing bending the knee and hip.",
      "The knee collapsing inwards on landing → knee over the second toe.",
      "Wobbling and touching down → a shorter hop until the landing is steady.",
    ]],
    easier: ["بالساقين معاً، أو قفزٌ في المكان.", "Both legs together, or hopping on the spot."],
    harder: ["مسافةٌ أبعد، أو قفزٌ بزاويةٍ أو إلى الخلف، أو على سطحٍ ليّن.", "Longer hops, hopping diagonally or backwards, or onto a soft surface."],
    stopIf: ["ألمٌ في الكاحل، أو تورّمٌ في اليوم التالي، أو إحساسٌ بأنّه يخون.", "Ankle pain, swelling the next day, or a feeling of the ankle giving way."],
    equipment: ["أرضٌ ثابتةٌ غير زلقة، وخطٌّ على الأرض.", "A firm, non-slip floor and a line marked on it."],
    doseNote: ["يوماً بعد يوم، والدعامةُ أو الشريطُ عند العودة للرياضة.", "Alternate days, with a brace or tape when returning to sport."],
    images: [{ key: "forward-hop-stick-1", ar: "يهبط على ساقٍ واحدة بركبةٍ مثنيّة بعد قفزةٍ إلى الأمام", en: "Landing on one leg with a bent knee after a forward hop", search: "single leg hop and stick exercise" }],
  },
  {
    code: "lateral-hops", nameAr: "القفز الجانبيّ على ساقٍ واحدة", nameEn: "Single-leg lateral hops",
    kind: "functional", region: "ankle_foot", perSide: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يحمّل الكاحلَ في الاتّجاه الذي يلتوي فيه — جانباً — بسرعةٍ وتحكّم، ويقيس الجاهزيةَ للعودة إلى الرياضة والعمل الذي فيه تغييرُ اتّجاهٍ مفاجئ.",
      "Loads the ankle in the direction it sprains — sideways — with speed and control, and tests readiness to return to sport and work with sudden changes of direction."],
    start: ["واقفٌ على الساق المصابة بجانب خطٍّ على الأرض، والركبةُ مثنيّةٌ قليلاً.",
      "Standing on the injured leg beside a line on the floor, knee slightly bent."],
    steps: [[
      "اقفز فوق الخطّ إلى الجانب واهبط على الساق نفسِها.",
      "اقفز عائداً إلى الجانب الأوّل.",
      "كرّر ١٠ قفزاتٍ متتالية بإيقاعٍ ثابت.",
      "استرح ثمّ أعِد المجموعة.",
    ], [
      "Hop sideways over the line, landing on the same leg.",
      "Hop back to the starting side.",
      "Repeat 10 hops in a row at a steady rhythm.",
      "Rest, then repeat the set.",
    ]],
    cues: [[
      "هبوطٌ على حافّة القدم الخارجية ⟵ هبوطٌ على مقدّمة القدم كلّها.",
      "قفزاتٌ عالية بطيئة ⟵ قفزاتٌ منخفضةٌ سريعةٌ متحكَّم بها.",
      "الركبةُ تميل إلى الداخل ⟵ الركبةُ فوق الإصبع الثاني.",
    ], [
      "Landing on the outer edge of the foot → land across the whole forefoot.",
      "High, slow hops → low, quick, controlled hops.",
      "The knee collapsing inwards → knee over the second toe.",
    ]],
    easier: ["بالساقين معاً، أو عددٌ أقلّ.", "Both legs together, or fewer hops."],
    harder: ["أسرع، أو لمدّة ٣٠ ثانية، أو قفزٌ قطريّ إلى الأمام والجانب.", "Faster, for 30 seconds, or diagonal forward-and-sideways hops."],
    stopIf: ["ألمٌ في الكاحل، أو تورّمٌ في اليوم التالي، أو إحساسٌ بأنّه يخون.", "Ankle pain, swelling the next day, or a feeling of the ankle giving way."],
    equipment: ["أرضٌ ثابتةٌ غير زلقة، وخطٌّ أو شريطٌ لاصق.", "A firm, non-slip floor and a line or tape."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "lateral-hops-1", ar: "يقفز جانباً على ساقٍ واحدة فوق خطٍّ على الأرض", en: "Hopping sideways on one leg over a line on the floor", search: "single leg lateral hop exercise" }],
  },
  {
    code: "figure-8-agility", nameAr: "الجري على شكل ٨ وتغيير الاتّجاه", nameEn: "Figure-of-eight running and cutting",
    kind: "functional", region: "whole_body", sets: 3, reps: 4, rest: 60,
    purpose: ["آخرُ خطوةٍ قبل العودة إلى الرياضة: الجريُ حول علامتين والانعطافُ والتوقّفُ المفاجئ — بسرعةٍ تزيد حتى تقارب سرعةَ اللعب.",
      "The last step before returning to sport: running around two markers, turning and stopping suddenly — at increasing speed until close to playing speed."],
    start: ["علامتان (مخروطان أو زجاجتان) على بعد ٥ أمتار، والحذاءُ رياضيّ، والدعامةُ أو الشريطُ عند الحاجة.",
      "Two markers (cones or bottles) 5 metres apart, sports shoes, and a brace or tape if needed."],
    steps: [[
      "اجرِ حول العلامتين على شكل الرقم ٨ بسرعةٍ مريحة.",
      "أعِد أربعَ مرّاتٍ في كلّ اتّجاه.",
      "زِد السرعةَ تدريجياً، وصغّر المسافةَ بين العلامتين لانعطافٍ أحدّ.",
      "أضف توقّفاً مفاجئاً وتغييراً للاتّجاه بإشارةٍ من المعالج.",
    ], [
      "Run around the two markers in a figure-of-eight at a comfortable pace.",
      "Repeat four times in each direction.",
      "Gradually increase the speed, and bring the markers closer for sharper turns.",
      "Add sudden stops and changes of direction on the therapist's signal.",
    ]],
    cues: [[
      "الانعطافُ على كاحلٍ مستقيمٍ متيبّس ⟵ انثناءٌ في الركبة والورك وخطواتٌ قصيرة عند الانعطاف.",
      "التباطؤُ عند الانعطاف نحو الجهة المصابة ⟵ يُعاد بسرعةٍ أقلّ حتى يتساوى الجانبان.",
      "النظرُ إلى القدمين ⟵ النظرُ إلى الأمام.",
    ], [
      "Turning on a stiff, straight ankle → bend the knee and hip and take short steps into the turn.",
      "Slowing down when turning towards the injured side → repeat at lower speed until both sides match.",
      "Looking at the feet → look ahead.",
    ]],
    easier: ["مشيٌ سريع بدل الجري، أو علاماتٌ أبعد.", "Brisk walking instead of running, or markers further apart."],
    harder: ["أسرع، وعلاماتٌ أقرب، وكرةٌ أو مهارةُ اللعب نفسُها.", "Faster, closer markers, and a ball or the sport's own skills."],
    stopIf: ["ألمٌ في الكاحل، أو عرج، أو تورّمٌ في اليوم التالي.", "Ankle pain, limping, or swelling the next day."],
    equipment: ["علامتان، وأرضٌ غير زلقة، وحذاءٌ رياضيّ.", "Two markers, a non-slip surface and sports shoes."],
    doseNote: ["يوماً بعد يوم، لمن يعود إلى الرياضة أو العمل الذي فيه جري.", "Alternate days, for those returning to sport or work that involves running."],
    images: [{ key: "figure-8-agility-1", ar: "يجري حول مخروطين على شكل الرقم ٨", en: "Running a figure-of-eight around two cones", search: "figure 8 running drill cones" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "ankle-sprain-adult",
  summary: [
    "التواءُ الكاحل الوحشيّ (Lateral ankle sprain) عند البالغين: إصابةُ الأربطة الخارجية للكاحل بانقلاب القدم إلى الداخل — أشيعُ إصابات الرياضة والمشي على أرضٍ غير مستوية. " +
    "أغلبُ المرضى يتحسّنون، لكنّ نحو ٤٠٪ بعد الالتواء الأوّل يبقى عندهم بعد سنةٍ ألمٌ أو إحساسٌ بأنّ الكاحلَ «يخون» ويلتوي ثانيةً (عدمُ الثبات المزمن — Doherty 2016) — فالهدفُ ليس تخفيفَ الألم وحده بل منعُ التكرار بتدريب التوازن والقوّة. " +
    "الأساسُ العلاجُ الوظيفيّ: إسنادٌ قصير (دعامةٌ أو شريط) وتحميلٌ مبكّر بقدر الألم وتمارينُ تبدأ في الأيّام الأولى، لا تثبيتٌ طويل (والشديدُ قد يُثبَّت حتى عشرة أيّامٍ بقرار الطبيب)؛ والأجهزةُ مساعدةٌ لا أساس. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة؛ والكسرُ، والتواءُ الكاحل العالي (الارتباط بين الظنبوب والشظية)، والتمزّقُ الكامل غيرُ الثابت لكلٍّ طريقُه.",
    "Lateral ankle sprain in adults: injury to the outer ankle ligaments from the foot rolling inwards — the most common sports injury and a frequent result of walking on uneven ground. " +
    "Most patients recover, but about 40% after a first sprain are left a year later with pain or a feeling that the ankle 'gives way' and sprains again (chronic ankle instability — Doherty 2016) — so the goal is not only pain relief but preventing recurrence through balance and strength training. " +
    "The core is functional treatment: brief support (a brace or tape), early weight bearing as pain allows and exercise from the first days, not prolonged immobilisation (a severe sprain may be immobilised for up to ten days on the doctor's decision); devices are adjuncts, not the core. " +
    "The programme runs in three phases with session ranges and written progression criteria; fractures, high ankle (syndesmotic) sprains and unstable complete tears each follow their own path.",
  ],
  goals: [
    "١. تحسّنُ قدرة القدم والكاحل في الحياة اليومية (FAAM-ADL) إلى ٩٠٪ فأكثر، أو ٨ نقاطٍ على الأقلّ — الفرقُ المهمّ سريرياً (Martin 2005)؛ ولمن يعود إلى الرياضة يتحسّن مقياسُ الرياضة منه ٩ نقاطٍ على الأقلّ.\n" +
    "٢. ألمٌ ٢ من ١٠ أو أقلّ في المشي والدرج، وتورّمٌ زال أو يكاد (محيطُ الكاحل بشريط القياس قريبٌ من الجهة الأخرى).\n" +
    "٣. انثناءُ الكاحل حاملاً الوزن (الطعنةُ نحو الحائط) في حدود ٢ سم من الجهة الأخرى — وهو قريبٌ من أصغر تغيّرٍ يكشفه الاختبار (١٫٦–١٫٩ سم، Powden 2015).\n" +
    "٤. توازنٌ على الساق المصابة ٣٠ ثانيةً بعينين مغلقتين على أرضٍ ثابتة، ومجموعُ اختبار Y يتحسّن، والفرقُ في الوصول الأماميّ أقلُّ من ٤ سم (فرقٌ أكبر ارتبط بإصاباتٍ أكثر في الطرف السفليّ — Plisky 2006).\n" +
    "٥. لمن يعود إلى الرياضة أو عملٍ فيه قفزٌ وجري: مسافةُ القفز على الساق المصابة ٩٠٪ على الأقلّ من الأخرى، وجريٌ وتغييرٌ للاتّجاه بلا ألمٍ ولا تورّم — والقرارُ بمجالات PAASS الخمسة: الألم، وضعفُ الكاحل، وثقةُ اللاعب، والتحكّمُ الحسّيّ الحركيّ، والأداءُ الرياضيّ (Smith 2021).\n" +
    "٦. منعُ التكرار: برنامجٌ منزليٌّ للتوازن يستمرّ ثمانيةَ أسابيع على الأقلّ (Hupperets 2009)، ودعامةٌ أو شريطٌ في الرياضة والعمل الشاقّ (JOSPT 2021 «A»).",
    "1. Improve everyday foot and ankle ability (FAAM-ADL) to 90% or more, or by at least 8 points — the minimal clinically important difference (Martin 2005); for those returning to sport, improve its sports subscale by at least 9 points.\n" +
    "2. Pain 2/10 or less when walking and on stairs, with swelling gone or nearly gone (ankle girth by tape measure close to the other side).\n" +
    "3. Weight-bearing ankle dorsiflexion (knee-to-wall) within 2 cm of the other side — close to the smallest change the test can detect (1.6–1.9 cm, Powden 2015).\n" +
    "4. 30 seconds of balance on the injured leg with the eyes closed on a firm surface, an improving Y-balance composite, and an anterior reach difference under 4 cm (a larger difference was linked to more lower-limb injuries — Plisky 2006).\n" +
    "5. For those returning to sport or to work involving hopping and running: single-leg hop distance at least 90% of the other side, with pain-free running and cutting without swelling — the decision using the five PAASS domains: pain, ankle impairments, athlete perception, sensorimotor control and sport performance (Smith 2021).\n" +
    "6. Prevent recurrence: a home balance programme continuing for at least eight weeks (Hupperets 2009), and a brace or tape for sport and heavy work (JOSPT 2021 'A').",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تحميلٍ أو تمرين):\n" +
    "• فرزُ الكسر بقواعد أوتاوا كاملةً — حساسيتُها نحو ٩٨٪ (Bachmann 2003)، واستعمالُ جزء المشي وحده يُضعفها (JOSPT 2021)؛ وعلاماتُ الخطر الأخرى في «موانع الاستعمال».\n" +
    "• القصّة: آليةُ الإصابة (انقلابُ القدم إلى الداخل)، وصوتُ فرقعة، والقدرةُ على المشي بعدها، والتورّمُ والكدمة، والالتواءاتُ السابقة والإحساسُ بأنّ الكاحلَ يخون، والعمرُ والوزنُ والعملُ والرياضة — وهي ممّا يتنبّأ بالمسار (JOSPT 2021 «B»).\n" +
    "• الفحص: الضغطُ على الأربطة الخارجية، واختبارُ الدرج الأماميّ، والدرجُ الأماميّ الوحشيّ المعكوس وجسُّ الكاحل الأماميّ الوحشيّ (JOSPT 2021 «B») — والأدقُّ بعد ٤–٥ أيّامٍ حين يهدأ الألمُ والتورّم (حساسيةٌ ٨٤٪ ونوعيةٌ ٩٦٪ — Vuurberg 2018)، فإن كان الفحصُ الأوّل مبكّراً يُعاد في الجلسة الرابعة أو الخامسة.\n" +
    "• الدرجة: الأولى شدٌّ بلا تراخٍ، والثانية تمزّقٌ جزئيّ وتراخٍ خفيف، والثالثة تمزّقٌ كامل وتراخٍ واضح وكدمةٌ كبيرة وعجزٌ عن الحمل — والدرجةُ توجّه الإسنادَ ومدّةَ البرنامج.\n" +
    "• الالتواءُ العالي: ألمٌ عند ضغط الرباط بين الظنبوب والشظية فوق الكاحل، واختبارُ ضغط الساق من الجانبين، واختبارُ ثني القدم مع تدويرها للخارج — لا اختبارَ يكفي وحده فتُجمع (Sman 2015)، والاشتباهُ يُحال إلى الطبيب والصور.\n" +
    "• القياساتُ في البداية ومرّتين على الأقلّ بعدها (JOSPT 2021 «A»): قدرةُ القدم والكاحل (FAAM-ADL، ومقياسُ الرياضة منه لمن يعود إليها)، والألمُ من ١٠، ومحيطُ الكاحل بشريط القياس (طريقةُ الشكل ٨) للتورّم، والطعنةُ نحو الحائط بالسنتيمتر للجهتين، والوقوفُ على ساقٍ واحدة بعينين مغلقتين على أرضٍ ثابتة، واختبارُ Y (الأماميّ والخلفيّ الداخليّ والخلفيّ الخارجيّ)، واختباراتُ القفز على ساقٍ واحدة حين يُسمح بها (JOSPT 2021 «B»).\n" +
    "• لمن التوى كاحلُه من قبل أو يشكو أنّه يخون: أداةُ كمبرلاند لعدم ثبات الكاحل (CAIT) — ٢٥ فأقلّ من ٣٠ يرجّح عدمَ الثبات المزمن (Wright 2014).\n" +
    "• علامةٌ تتنبّأ بعدم الثبات المزمن: العجزُ عن القفز والهبوط بعد أسبوعين من الإصابة (Doherty 2016) — فمَن لم يقدر عليهما يحتاج البرنامجَ كاملاً ومتابعةً أطول.\n" +
    "إعادةُ التقييم: أسئلةٌ قصيرة وإعادةُ اختبارٍ في كلّ جلسة (الألمُ والتورّم منذ آخر مرّة)، والقياساتُ كاملةً نحو الجلسة السادسة وفي الأخيرة وفي زيارة المتابعة بعد أربعة أسابيع. وإن لم يتحسّن كما يُتوقّع يُراجَع التشخيص (الكسر، الالتواءُ العالي، الأوتارُ الشظويّة، إصابةُ الغضروف) والجرعةُ والالتزام. والانتقالُ بين المراحل بالمعايير لا بعدد الجلسات وحده.",
    "Initial assessment (before any loading or exercise):\n" +
    "• Screen for fracture with the full Ottawa ankle rules — sensitivity about 98% (Bachmann 2003), and using only the walking part weakens them (JOSPT 2021); other red flags are under 'Contraindications'.\n" +
    "• History: mechanism (the foot rolling inwards), a popping sound, ability to walk afterwards, swelling and bruising, previous sprains and a feeling of the ankle giving way, age, weight, work and sport — these help predict the course (JOSPT 2021 'B').\n" +
    "• Examination: palpation of the lateral ligaments, the anterior drawer test, and the reverse anterolateral drawer test with anterolateral talar palpation (JOSPT 2021 'B') — most accurate at 4–5 days, when pain and swelling settle (sensitivity 84%, specificity 96% — Vuurberg 2018), so an early first examination is repeated at session 4 or 5.\n" +
    "• Grade: I, stretch without laxity; II, partial tear with mild laxity; III, complete tear with clear laxity, marked bruising and inability to bear weight — the grade guides support and programme length.\n" +
    "• High ankle sprain: tenderness over the ligament between tibia and fibula above the ankle, the squeeze test, and the dorsiflexion–external rotation test — no single test is enough, so they are combined (Sman 2015), and suspicion is referred to the doctor and imaging.\n" +
    "• Measures at baseline and at least twice more (JOSPT 2021 'A'): foot and ankle ability (FAAM-ADL, and its sports subscale for those returning to sport), pain out of 10, ankle girth by tape measure (figure-of-eight method) for swelling, knee-to-wall distance in centimetres on both sides, single-leg balance with the eyes closed on a firm surface, the Y-balance test (anterior, posteromedial and posterolateral), and single-leg hop tests once allowed (JOSPT 2021 'B').\n" +
    "• For those with previous sprains or giving way: the Cumberland Ankle Instability Tool (CAIT) — 25 or less out of 30 suggests chronic instability (Wright 2014).\n" +
    "• A sign that predicts chronic instability: inability to complete jumping and landing two weeks after the injury (Doherty 2016) — those who cannot need the full programme and longer follow-up.\n" +
    "Reassessment: brief questions and re-testing every session (pain and swelling since last time), and the full measures at about session 6, at the last session and at the follow-up visit four weeks later. If progress is slower than expected, review the diagnosis (fracture, high ankle sprain, peroneal tendons, osteochondral lesion), the dose and adherence. Phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — الحماية والحركة المبكّرة والتحميل (الجلسات ١–٣): كتابةُ الحروف بالقدم، والتمارينُ الثابتة في الاتّجاهات الأربعة، والطعنةُ نحو الحائط بمدىً مريح، ورفعُ الكعبين بالساقين، والوقوفُ على الساق المصابة بإسناد — مع الدعامة أو الشريط والتحميل بقدر الألم والعلاج اليدويّ.\n" +
    "المرحلة ٢ — القوّة والتوازن (الجلسات ٤–٨): تقويةُ الكاحل بالمطّاط وخاصّةً قلبَ القدم للخارج، ورفعُ الكعب حتى الساق الواحدة، والطعنةُ نحو الحائط، والتوازنُ بعينين مغلقتين ثمّ على وسادة، والوصولُ بالقدم في اتّجاهات النجمة.\n" +
    "المرحلة ٣ — الوظيفة والقفز والعودة إلى الرياضة والعمل (الجلسات ٩–١٢): القفزُ إلى الأمام والثبات، والقفزُ الجانبيّ، والجريُ على شكل ٨ لمن يعود إلى الرياضة، والتوازنُ مع الكرة — ثمّ البرنامجُ المنزليّ.\n" +
    "البرنامجُ: ١٢ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة)، والأخصائيُّ يعدّل العددَ والتواترَ لكلّ مريض. والدليلُ صريحٌ هنا: في الالتواء البسيط (الدرجتان الأولى والثانية) لم يفُق العلاجُ الطبيعيّ المشرَف عليه الرعايةَ المعتادة بعد ثلاثة أشهر (Brison 2016) — فالبسيطُ يكفيه في الغالب التعليمُ وبرنامجٌ منزليّ وجلساتٌ قليلة (٣–٦) للتعليم والتدرّج؛ والجلساتُ الاثنتا عشرة لمن التواؤه شديد، أو تكرّر، أو يعرج بعد أسبوع، أو يعود إلى رياضةٍ أو عملٍ شاقّ — والتمرينُ المشرَف عليه يسرّع العودةَ إلى الرياضة (Vuurberg 2018). والعددُ لسليم.\n" +
    "والتمرينُ يبدأ مبكّراً: برنامجٌ متسارع في الأسبوع الأوّل حسّن الوظيفةَ أكثر من الحماية المعتادة بالراحة والثلج (Bleakley 2010). والشديدُ تطول مراحلُه: العودةُ الكاملة إلى العمل والرياضة نحو ٣–٤ أسابيع للبسيط و٦–٨ لتمزّق الرباط (Vuurberg 2018) — فتُوزَّع جلساتُه على أسابيع أكثر (ثلاثاً أو أربعاً في الأسبوع)، والانتقالُ بالمعايير لا بعدد الجلسات.\n" +
    "والبرنامجُ المنزليّ للتوازن يستمرّ ثمانيةَ أسابيع على الأقلّ بعد الإصابة — قلّل التكرارَ بنحو ٣٥٪ عند الرياضيّين (Hupperets 2009) — مع زيارة متابعةٍ وإعادة تقييمٍ بعد أربعة أسابيع من الجلسة الأخيرة.",
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Protection, early movement and loading (sessions 1–3): the ankle alphabet, four-direction isometrics, a comfortable-range knee-to-wall lunge, double-leg heel raises and supported standing on the injured leg — with a brace or tape, loading as pain allows and manual therapy.\n" +
    "Phase 2 — Strength and balance (sessions 4–8): band strengthening with an eversion focus, heel raises progressing to one leg, the knee-to-wall lunge, balance with the eyes closed then on a cushion, and star excursion reaching.\n" +
    "Phase 3 — Function, hopping and return to sport and work (sessions 9–12): forward hop and stick, lateral hops, figure-of-eight running for those returning to sport, and balance with a ball — then the home programme.\n" +
    "Programme: 12 clinic sessions, six a week (Friday off); the specialist adjusts the number and frequency for each patient. The evidence is explicit here: in simple sprains (grades I–II), supervised physiotherapy did no better than usual care at three months (Brison 2016) — so a simple sprain usually needs education, a home programme and a few sessions (3–6) for teaching and progression; the 12 sessions are for severe or recurrent sprains, a limp persisting after a week, or a return to sport or heavy work — and supervised exercise speeds the return to sport (Vuurberg 2018). The number is Saleem's decision.\n" +
    "Exercise starts early: an accelerated programme in the first week improved function more than standard protection with rest and ice (Bleakley 2010). Severe sprains take longer: full return to work and sport takes about 3–4 weeks after a simple sprain and 6–8 weeks after a ligament rupture (Vuurberg 2018) — so their sessions are spread over more weeks (three or four a week), and progression follows the criteria, not the session count.\n" +
    "The home balance programme continues for at least eight weeks after the injury — it reduced recurrence by about 35% in athletes (Hupperets 2009) — with a follow-up visit and reassessment four weeks after the last session.",
  ],
  contraindications: [
    "علاماتٌ تُوقف البرنامج ويُحال المريضُ إلى الطبيب:\n" +
    "• اشتباهُ كسر بقواعد أوتاوا (Ottawa ankle rules) — أشعةٌ قبل أيّ تحميل: ألمٌ عند الضغط على الحافّة الخلفية أو قمّة أيٍّ من الكعبين (آخر ٦ سم)، أو على قاعدة مشط القدم الخامس، أو على العظم الزورقيّ، أو العجزُ عن المشي أربع خطواتٍ بعد الإصابة مباشرةً وعند الفحص.\n" +
    "• ألمٌ أعلى الكاحل بين العظمين يزيد بضغط الساق من الجانبين أو بتدوير القدم للخارج — اشتباهُ التواء الكاحل العالي (Syndesmosis): الطبيبُ والصور، والتعافي أطول؛ وألمٌ عند رأس الشظية تحت الركبة — اشتباهُ كسرٍ عالٍ (Maisonneuve).\n" +
    "• ضعفٌ في الدفع بمقدّمة القدم وعدمُ انثناء القدم عند ضغط بطن الساق (اختبارُ تومبسون Thompson) — اشتباهُ تمزّق وتر العرقوب: الطبيبُ عاجلاً.\n" +
    "• طقطقةٌ مؤلمة خلف الكعب الخارجيّ — اشتباهُ انخلاع أوتار الشظية: الطبيب.\n" +
    "• ألمٌ عميقٌ في الكاحل وتورّمٌ أو قفلٌ يستمرّ بعد ستّة أسابيع — اشتباهُ إصابة الغضروف (Osteochondral lesion): صورٌ وطبيب.\n" +
    "• قدمٌ باردةٌ شاحبة، أو تنميلٌ وضعفٌ لا يفسّرهما الالتواء، أو ساقٌ متورّمةٌ مؤلمةٌ دافئة (اشتباهُ خثرة DVT) — الطبيبُ فوراً.\n" +
    "• كاحلٌ يخون مرّاتٍ كثيرة رغم برنامجٍ ملتزم — عدمُ ثباتٍ مزمن: تقييمُ الطبيب للجراحة.",
    "Signs that stop the programme and require referral to the doctor:\n" +
    "• Suspected fracture by the Ottawa ankle rules — X-ray before any loading: tenderness at the posterior edge or tip of either malleolus (last 6 cm), at the base of the fifth metatarsal or the navicular, or inability to take four steps both immediately after the injury and at examination.\n" +
    "• Pain above the ankle between the two bones, worse when squeezing the leg from both sides or turning the foot outwards — suspected high ankle (syndesmotic) sprain: the doctor and imaging, with a longer recovery; tenderness at the fibular head below the knee — suspected high fracture (Maisonneuve).\n" +
    "• Weak push-off and no foot movement when the calf is squeezed (Thompson test) — suspected Achilles rupture: the doctor urgently.\n" +
    "• Painful snapping behind the outer ankle bone — suspected peroneal tendon dislocation: the doctor.\n" +
    "• Deep ankle pain with swelling or locking that persists beyond six weeks — suspected osteochondral lesion: imaging and the doctor.\n" +
    "• A cold, pale foot, numbness or weakness not explained by the sprain, or a swollen, painful, warm calf (suspected DVT) — the doctor immediately.\n" +
    "• An ankle that keeps giving way despite a committed programme — chronic instability: the doctor's assessment for surgery.",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد الألمُ أو التورّمُ أكثر تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• الإسناد: دعامةٌ أو شريطٌ مع تحميلٍ متدرّج (JOSPT 2021 «A»)، والدعامةُ أقوى أثراً وتُلبس ٤–٦ أسابيع (Vuurberg 2018)؛ والضمادةُ الأنبوبية المطّاطية وحدها أضعفُ من الدعامة في الالتواء الشديد (Lamb 2009).\n" +
    "• الالتواءُ الشديد: تثبيتٌ قصير بدعامةٍ شبه صلبة أو جبسٍ تحت الركبة حتى عشرة أيّامٍ بقرار الطبيب (JOSPT 2021 «A») — كان أسرعَ تعافياً في الأشهر الثلاثة الأولى وتساوت النتائجُ بعد تسعة أشهر (Lamb 2009)؛ ثمّ العلاجُ الوظيفيّ، ولا تثبيتَ أطولَ من ذلك.\n" +
    "• التورّم: رفعُ الساق والحركةُ المبكّرة؛ والثلجُ على فتراتٍ مع التمرين (JOSPT 2021 «C») ولا مدّةَ مثلى ثابتة له (Bleakley 2004) — ملفوفاً بقماش، ولا على جلدٍ فاقد الإحساس؛ والراحةُ والثلجُ والضغطُ والرفعُ وحدها بلا تمرين لا دورَ لها (Vuurberg 2018).\n" +
    "• لا حرارةَ ولا تدليكَ قويّاً على الكاحل في الأيّام الثلاثة الأولى.\n" +
    "• مسكّناتُ الالتهاب قرارُ الطبيب: تخفّف الألمَ والتورّم، بحذرٍ من آثارها الجانبية ومن تأخيرٍ محتمل للالتئام (Vuurberg 2018).\n" +
    "• العلاجُ اليدويّ (تصريفُ اللمف، وتحريكُ الأنسجة الرخوة والمفصل، وانزلاقُ عظم الكاحل من الأمام إلى الخلف) ضمن مدىً بلا ألم ومع التمرين لا بدله (JOSPT 2021 «A»).\n" +
    "• العودةُ إلى العمل بجدولٍ متدرّج مع الدعامة (JOSPT 2021 «B»): العملُ الجالس أوّلاً، ثمّ الوقوفُ والمشي، ثمّ الحملُ والدرج.\n" +
    "• الوقايةُ بعد الالتواء الأوّل: الدعامةُ مع تمارين التوازن (JOSPT 2021 «A»)، والدعامةُ أو الشريطُ يقلّلان الالتواءَ المتكرّر كثيراً (Vuurberg 2018).",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If pain or swelling rises further, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Support: a brace or tape with progressive weight bearing (JOSPT 2021 'A'); a brace has the greatest effect and is worn for 4–6 weeks (Vuurberg 2018), and a tubular elastic bandage alone is weaker than a brace after a severe sprain (Lamb 2009).\n" +
    "• Severe sprain: brief immobilisation in a semi-rigid brace or a below-knee cast for up to ten days on the doctor's decision (JOSPT 2021 'A') — recovery was faster over the first three months and results were equal at nine months (Lamb 2009); then functional treatment, with no longer immobilisation.\n" +
    "• Swelling: elevation and early movement; ice in short spells with exercise (JOSPT 2021 'C'), with no proven optimal duration (Bleakley 2004) — wrapped in cloth and never on skin with reduced sensation; rest, ice, compression and elevation alone without exercise have no role (Vuurberg 2018).\n" +
    "• No heat and no vigorous massage of the ankle in the first three days.\n" +
    "• Anti-inflammatory drugs are the doctor's decision: they ease pain and swelling, with caution about side effects and possibly delayed healing (Vuurberg 2018).\n" +
    "• Manual therapy (lymphatic drainage, soft-tissue and joint mobilisation, anterior-to-posterior talar glides) within a pain-free range, alongside exercise and never instead of it (JOSPT 2021 'A').\n" +
    "• Return to work on a graded schedule with a brace (JOSPT 2021 'B'): seated work first, then standing and walking, then carrying and stairs.\n" +
    "• Prevention after a first sprain: a brace together with balance exercise (JOSPT 2021 'A'); a brace or tape greatly reduces repeat sprains (Vuurberg 2018).",
  ],
  totalSessions: 12, spw: 6, weeks: 2, minutes: 50,
  refs: [
    { title: "Ankle Stability and Movement Coordination Impairments: Lateral Ankle Ligament Sprains Revision 2021", org: "Journal of Orthopaedic & Sports Physical Therapy (Martin et al.)", year: 2021, url: "https://doi.org/10.2519/jospt.2021.0302" },
    { title: "Diagnosis, treatment and prevention of ankle sprains: update of an evidence-based clinical guideline", org: "British Journal of Sports Medicine (Vuurberg et al.)", year: 2018, url: "https://doi.org/10.1136/bjsports-2017-098106" },
    { title: "Treatment and prevention of acute and recurrent ankle sprain: an overview of systematic reviews with meta-analysis", org: "British Journal of Sports Medicine (Doherty et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-096178" },
    { title: "Accuracy of Ottawa ankle rules to exclude fractures of the ankle and mid-foot: systematic review", org: "BMJ (Bachmann et al.)", year: 2003, url: "https://doi.org/10.1136/bmj.326.7386.417" },
    { title: "Decision rules for the use of radiography in acute ankle injuries. Refinement and prospective validation", org: "JAMA (Stiell et al.)", year: 1993, url: "https://doi.org/10.1001/jama.269.9.1127" },
    { title: "Mechanical supports for acute, severe ankle sprain: a pragmatic, multicentre, randomised controlled trial", org: "The Lancet — CAST (Lamb et al.)", year: 2009, url: "https://doi.org/10.1016/s0140-6736(09)60206-3" },
    { title: "Effect of unsupervised home based proprioceptive training on recurrences of ankle sprain: randomised controlled trial", org: "BMJ (Hupperets, Verhagen, van Mechelen)", year: 2009, url: "https://doi.org/10.1136/bmj.b2684" },
    { title: "Effect of accelerated rehabilitation on function after ankle sprain: randomised controlled trial", org: "BMJ (Bleakley et al.)", year: 2010, url: "https://doi.org/10.1136/bmj.c1964" },
    { title: "Effect of early supervised physiotherapy on recovery from acute ankle sprain: randomised controlled trial", org: "BMJ (Brison et al.)", year: 2016, url: "https://doi.org/10.1136/bmj.i5650" },
    { title: "Recovery From a First-Time Lateral Ankle Sprain and the Predictors of Chronic Ankle Instability: A Prospective Cohort Analysis", org: "The American Journal of Sports Medicine (Doherty et al.)", year: 2016, url: "https://doi.org/10.1177/0363546516628870" },
    { title: "What is the clinical course of acute ankle sprains? A systematic literature review", org: "The American Journal of Medicine (van Rijn et al.)", year: 2008, url: "https://doi.org/10.1016/j.amjmed.2007.11.018" },
    { title: "Diagnostic accuracy of clinical tests for ankle syndesmosis injury", org: "British Journal of Sports Medicine (Sman et al.)", year: 2015, url: "https://doi.org/10.1136/bjsports-2013-092787" },
    { title: "Evidence of validity for the Foot and Ankle Ability Measure (FAAM)", org: "Foot & Ankle International (Martin et al.)", year: 2005, url: "https://doi.org/10.1177/107110070502601113" },
    { title: "Star Excursion Balance Test as a predictor of lower extremity injury in high school basketball players", org: "Journal of Orthopaedic & Sports Physical Therapy (Plisky et al.)", year: 2006, url: "https://doi.org/10.2519/jospt.2006.2244" },
    { title: "Reliability and minimal detectable change of the weight-bearing lunge test: A systematic review", org: "Manual Therapy (Powden, Hoch, Hoch)", year: 2015, url: "https://doi.org/10.1016/j.math.2015.01.004" },
    { title: "The Cumberland ankle instability tool: a report of validity and reliability testing", org: "Archives of Physical Medicine and Rehabilitation (Hiller et al.)", year: 2006, url: "https://doi.org/10.1016/j.apmr.2006.05.022" },
    { title: "Recalibration and validation of the Cumberland Ankle Instability Tool cutoff score for individuals with chronic ankle instability", org: "Archives of Physical Medicine and Rehabilitation (Wright et al.)", year: 2014, url: "https://doi.org/10.1016/j.apmr.2014.04.017" },
    { title: "The use of ice in the treatment of acute soft-tissue injury: a systematic review of randomized controlled trials", org: "The American Journal of Sports Medicine (Bleakley, McDonough, MacAuley)", year: 2004, url: "https://doi.org/10.1177/0363546503260757" },
    { title: "Ultrasound therapy for acute ankle sprains", org: "Cochrane Database of Systematic Reviews (van der Windt et al.)", year: 2002, url: "https://doi.org/10.1002/14651858.CD001250" },
    { title: "Return to sport decisions after an acute lateral ankle sprain injury: introducing the PAASS framework — an international multidisciplinary consensus", org: "British Journal of Sports Medicine (Smith et al.)", year: 2021, url: "https://doi.org/10.1136/bjsports-2021-104087" },
  ],
  //  التمارين أوّلاً، ثمّ المساعدُ بقاعدة سليم (التيكار والمغناطيس والتحفيز)، ثمّ الضغطُ كما زُرع، ثمّ ما لا يُستخدم. ولا حرارةَ ولا شدَّ للكاحل — والثلجُ في البيت.
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٣٠–٣٥ دقيقة في الجلسة مع العلاج اليدويّ والتعليم؛ والتوازنُ في كلّ جلسة، والقفزُ والجريُ في المرحلة الثالثة يوماً بعد يوم.",
        "The phased programme and its cards under 'Programme by phase': 30–35 minutes per session with manual therapy and education; balance in every session, and hopping and running in phase 3 on alternate days."],
      note: ["أساسيٌّ في كلّ جلسة — البرنامجُ المنظَّم في المركز والبيت أقوى توصية (JOSPT 2021 «A»)، والتمرينُ يبدأ بعد الالتواء مبكّراً (Vuurberg 2018)، وتدريبُ التوازن مع الدعامة يقلّل التكرار (Hupperets 2009 · Doherty 2017).",
        "Core in every session — a structured programme in clinic and at home is the strongest recommendation (JOSPT 2021 'A'), exercise starts early after the sprain (Vuurberg 2018), and balance training with a brace reduces recurrence (Hupperets 2009 · Doherty 2017)."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["حول الكاحل والمريضُ مستلقٍ والساقُ مرفوعةٌ قليلاً، واللوحُ المرتدّ تحت بطن الساق: في الأيّام الأولى نمطٌ سعويّ بشدّةٍ منخفضة بلا حرارة للتورّم، ثمّ نمطٌ مقاوِم بدفءٍ مريح بعد أن يهدأ التورّم؛ قبل التمارين.",
        "Around the ankle with the patient lying and the leg slightly raised, the return plate under the calf: in the first days capacitive mode at low, athermic intensity for swelling, then resistive mode at a comfortable warmth once swelling settles; before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). ولا تذكره الإرشاداتُ باسمه؛ وأقربُ ما فيها الإنفاذُ الحراريّ قصيرُ الموجة النبضيّ: يجيزه JOSPT 2021 للتورّم والمشي («C») ولم يجد له Vuurberg 2018 أثراً — فلا يُعطى بدل التمرين، ولا بحرارةٍ في الأيّام الأولى.",
        "Rotating adjunct — used by the centre with good results (Saleem). The guidelines do not name it; the closest they cover is pulsed shortwave diathermy, which JOSPT 2021 allows for oedema and gait ('C') and Vuurberg 2018 found without effect — so it is never instead of exercise, and never heating in the first days."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الكاحل والساقُ مرفوعة، قبل التمارين — بلا حرارة، فيصلح في الأيّام الأولى.",
        "Pulsed electromagnetic field (PEMF) around the ankle with the leg raised, before exercise — non-thermal, so usable in the first days."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). ولا يذكره دليلا JOSPT 2021 وVuurberg 2018، فدليلُه في الالتواء غيرُ ثابت؛ لا يُعطى بدل التمرين.",
        "Rotating adjunct — used by the centre with good results (Saleem). Neither JOSPT 2021 nor Vuurberg 2018 mentions it, so its evidence in ankle sprain is unestablished; never instead of exercise."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS) للألم في الأيّام الأولى: قطبان أو أربعةٌ حول الكاحل (أمام الكعب الخارجيّ وخلفه)، بوخزٍ قويٍّ مريح بلا انقباض، والساقُ مرفوعة، قبل التمارين.",
        "Conventional TENS for pain in the first days: two or four electrodes around the ankle (in front of and behind the outer ankle bone) at a strong but comfortable tingling without contraction, with the leg raised, before exercise."],
      note: ["مساعدٌ يستعمله المركز (سليم) — والدليلُ ضدّه أو متضارب: JOSPT 2021 «D» (أدلّةٌ معه وضدّه)، ولم يجد له Vuurberg 2018 أثراً ونصح بعدمه؛ فهو للألم في الأيّام الأولى وحدها، لا بدل التمرين.",
        "An adjunct used by the centre (Saleem) — but the evidence is against it or conflicting: JOSPT 2021 'D' (evidence for and against), and Vuurberg 2018 found no effect and advised against it; so it is for pain in the first days only, never instead of exercise."] },
    { code: "compression", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { pressureMmhg: "30–50", cycleS: "30 / 10", durationMin: "15–20" },
      parameters: ["الضغطُ الهوائيّ المتقطّع بكُمٍّ على القدم والساق والساقُ مرفوعة: ضغطٌ خفيف (أقلُّ من الضغط الانبساطيّ) بدوراتِ نفخٍ وتفريغٍ قصيرة، في الأيّام الأولى للتورّم، ثمّ تحريكُ الكاحل مباشرةً.",
        "Intermittent pneumatic compression with a sleeve over the foot and leg, the leg raised: light pressure (below diastolic pressure) in short inflate–deflate cycles, in the first days for swelling, followed straight away by ankle movement."],
      note: ["مساعدٌ كما زُرع (لم يذكره سليم ولا القاعدة) — للتورّم في الأيّام الأولى مع رفع الساق والحركة. ولا توصيةَ له في ملخّص JOSPT 2021، والضغطُ ضمن الراحة والثلج والرفع بلا تمرين لا دورَ له (Vuurberg 2018) — فهو مساعدٌ للتمرين لا بديل. ممنوعٌ مع اشتباه الخثرة أو الكسر، أو التهاب الجلد.",
        "Adjunct as seeded (not mentioned by Saleem or the rule) — for swelling in the first days with elevation and movement. JOSPT 2021 makes no recommendation on it, and compression as part of rest, ice and elevation without exercise has no role (Vuurberg 2018) — so it supports exercise and never replaces it. Contraindicated with suspected DVT or fracture, or skin infection."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم في المركز لهذه الحالة حتى يقرّر سليم (لم يذكره). والدليلُ متضارب: JOSPT 2021 يجيزه للألم في البداية («C»، وكان «D» في 2013)، وVuurberg 2018 لم يجد له أثراً ونصح بعدمه.",
        "Not used by the centre for this condition until Saleem decides (not mentioned by him). The evidence conflicts: JOSPT 2021 allows it for pain in the early phase ('C', up from 'D' in 2013), while Vuurberg 2018 found no effect and advised against it."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — JOSPT 2021 يقول «لا يُستعمل» بأقوى درجة («A»)، ولم يفُق الوهميَّ في مراجعة كوكرين (van der Windt 2002) ولا عند Vuurberg 2018.",
        "Not used by the centre for this condition (not mentioned by Saleem) — JOSPT 2021 says it should not be used, at the strongest grade ('A'), and it was no better than sham in the Cochrane review (van der Windt 2002) or in Vuurberg 2018."] },
  ],
  phases: [
    {
      name: ["الحماية والحركة المبكّرة والتحميل", "Protection, early movement and loading"],
      sessionFrom: 1, sessionTo: 3,
      timeframe: ["الأيّام الأولى — وللشديد حتى اليوم العاشر", "The first days — up to day 10 in a severe sprain"],
      goals: [
        "تورّمٌ وألمٌ أقلّ، ومشيٌ بالدعامة أو الشريط بلا عرجٍ كبير (والعكّازان للأيّام الأولى عند الحاجة)، وحركةٌ للكاحل في كلّ الاتّجاهات، وانقباضٌ مريح للعضلات الشظويّة، ووقوفٌ على الساق المصابة بإسناد، وبرنامجٌ منزليٌّ يوميّ يؤدّيه صحيحاً.",
        "Less swelling and pain, walking in a brace or tape without a marked limp (crutches for the first days if needed), ankle movement in every direction, a comfortable peroneal contraction, standing on the injured leg with support, and a daily home programme performed correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• أغلبُ الالتواءات تتحسّن جيّداً، والحركةُ المبكّرة والمشيُ بقدر الألم يسرّعان التعافي — والراحةُ والتثبيتُ الطويلان يؤخّرانه، والجبسُ القصير قرارُ الطبيب للشديد وحده.\n" +
        "• التورّم: رفعُ الساق فوق مستوى القلب عند الجلوس والنوم، وتحريكُ الكاحل كثيراً، والثلجُ على فتراتٍ للألم ملفوفاً بقماش — والثلجُ والراحةُ وحدهما بلا تمرين لا يكفيان.\n" +
        "• في الأيّام الثلاثة الأولى: لا حرارةَ ولا تدليكَ قويّاً على الكاحل ولا ركض.\n" +
        "• الدعامةُ أو الشريطُ يحميان الأربطةَ وهي تلتئم، ويُلبسان في المشي والعمل.\n" +
        "• تمارينُ التوازن هي التي تمنع التكرار — وتُكمَل في البيت أسابيعَ بعد زوال الألم.",
        "Key messages — in plain language:\n" +
        "• Most sprains recover well, and early movement and walking as pain allows speed recovery — long rest and immobilisation slow it, and a short cast is the doctor's decision for severe sprains only.\n" +
        "• Swelling: raise the leg above heart level when sitting and sleeping, move the ankle often, and use ice in short spells for pain, wrapped in cloth — ice and rest alone without exercise are not enough.\n" +
        "• In the first three days: no heat, no vigorous massage of the ankle and no running.\n" +
        "• The brace or tape protects the ligaments while they heal, and is worn for walking and work.\n" +
        "• Balance exercises are what prevent another sprain — and they continue at home for weeks after the pain has gone.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين:\n" +
        "• يمشي بلا عكّازين وبلا عرجٍ واضح (بالدعامة إن احتاج)، والألمُ في المشي ٣ من ١٠ أو أقلّ.\n" +
        "• التورّمُ يقلّ من جلسةٍ إلى جلسة.\n" +
        "• يقف على الساق المصابة ١٠ ثوانٍ بإسنادٍ خفيف.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الخامسة: يُعاد الفحص (الكسر، الالتواء العالي، الوتر الشظويّ) ويُحال إلى الطبيب إن لزم.",
        "Progress to phase 2 when:\n" +
        "• Walks without crutches and without an obvious limp (in the brace if needed), with walking pain 3/10 or less.\n" +
        "• Swelling is reducing from session to session.\n" +
        "• Stands on the injured leg for 10 seconds with light support.\n" +
        "If not achieved by session 5: re-examine (fracture, high ankle sprain, peroneal tendons) and refer to the doctor if needed.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• الفحصُ الدقيق للأربطة (اختبارُ الدرج الأماميّ) أوضحُ بعد ٤–٥ أيّامٍ حين يهدأ الألمُ والتورّم — يُعاد حينها.\n" +
        "• التحميلُ بقدر الألم من اليوم الأوّل، والعكّازان لمن يعرج كثيراً حتى يمشي بنمطٍ طبيعيّ.\n" +
        "• العلاجُ اليدويّ (تحريكُ مفصل الكاحل) لاستعادة انثناء الكاحل إلى الأعلى حين يكون محدوداً، مع التمرين.\n" +
        "• التوازنُ يبدأ مبكّراً متى تحمّل الوقوفَ على الساق — لا يُنتظر زوالُ الألم كلّه.",
        "Notes for the specialist:\n" +
        "• The ligament examination (anterior drawer) is clearer after 4–5 days when pain and swelling settle — repeat it then.\n" +
        "• Load as pain allows from day one, with crutches for a marked limp until the gait is normal.\n" +
        "• Manual therapy (ankle joint mobilisation) to restore dorsiflexion when it is limited, together with exercise.\n" +
        "• Balance training starts early, as soon as standing on the leg is tolerated — do not wait for all pain to go.",
      ],
      exercises: [
        { code: "ankle-alphabet" },
        { code: "ankle-isometrics" },
        { code: "knee-to-wall-lunge", sets: 1, note: ["مدىً مريح بلا ألمٍ حادّ — والقدمُ قريبةٌ من الحائط.", "A comfortable range without sharp pain — with the foot close to the wall."] },
        { code: "calf-raise", sets: 2, reps: 10, doseNote: ["بالساقين ممسكاً بالكرسيّ، ومدىً صغيرٌ مريح.", "On both legs holding a chair, with a small comfortable range."] },
        { code: "ankle-single-leg-balance", note: ["حين يتحمّل الوقوفَ على الساق — بجانب الكرسيّ وأطرافُ الأصابع عليه.", "Once standing on the leg is tolerated — beside a chair with the fingertips on it."] },
      ],
    },
    {
      name: ["القوّة والتوازن", "Strength and balance"],
      sessionFrom: 4, sessionTo: 8,
      timeframe: ["نحو الأسبوع الأوّل والثاني — وللشديد الأسابيع ٢–٤", "About weeks 1–2 — weeks 2–4 in a severe sprain"],
      goals: [
        "حركةٌ كاملة للكاحل (الطعنةُ نحو الحائط قريبةٌ من الجهة الأخرى)، وقوّةٌ أكبر في قلب القدم للخارج ورفع الكعب، وتوازنٌ على ساقٍ واحدة ٣٠ ثانية، ومشيٌ ودرجٌ بلا ألم.",
        "Full ankle movement (knee-to-wall distance close to the other side), greater strength in turning the foot outwards and in heel raises, single-leg balance for 30 seconds, and pain-free walking and stairs.",
      ],
      education: [
        "• التوازنُ يُتدرَّب عليه كلَّ يوم، ويصعب كلّما سهل: بعينين مغلقتين، ثمّ على وسادة.\n" +
        "• الدعامةُ أو الشريطُ في الرياضة والعمل الشاقّ، والحذاءُ بنعلٍ ثابت.\n" +
        "• الألمُ الخفيف بعد التمرين مقبول إن هدأ؛ والتورّمُ الذي يزيد في اليوم التالي يعني أنّ الحملَ زاد — نخفّفه ولا نتوقّف.",
        "• Balance is practised every day and made harder as it gets easier: eyes closed, then on a cushion.\n" +
        "• A brace or tape for sport and heavy work, with firm-soled shoes.\n" +
        "• Mild pain after exercise is fine if it settles; swelling that rises the next day means the load rose too much — we reduce it rather than stop.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• لا تورّمَ يُذكر، والمشيُ والدرجُ بلا ألم.\n" +
        "• الطعنةُ نحو الحائط في حدود ٢ سم من الجهة الأخرى.\n" +
        "• رفعُ الكعب على الساق المصابة وحدها ٢٠ مرّةً على الأقلّ (أو ٩٠٪ من الأخرى).\n" +
        "• التوازنُ على الساق المصابة ٣٠ ثانيةً بعينين مغلقتين أو على وسادة، والفرقُ في الوصول الأماميّ (اختبار Y) أقلُّ من ٤ سم.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثامنة: يُراجَع الفحصُ والجرعةُ والالتزام، ويستمرّ في المرحلة.",
        "Progress to phase 3 when:\n" +
        "• No significant swelling, with pain-free walking and stairs.\n" +
        "• Knee-to-wall within 2 cm of the other side.\n" +
        "• At least 20 single-leg heel raises on the injured side (or 90% of the other side).\n" +
        "• 30 seconds of single-leg balance with the eyes closed or on a cushion, and an anterior reach difference (Y-balance) under 4 cm.\n" +
        "If not achieved by session 8: review the examination, the dose and adherence, and stay in this phase.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• قلبُ القدم للخارج أولويةٌ في التقوية — يُقاس ويُقارَن بالجهة الأخرى.\n" +
        "• التوازنُ يتدرّج: عينان مفتوحتان ⟵ مغلقتان ⟵ سطحٌ ليّن ⟵ حركةُ الذراعين والكرة ⟵ اختبارُ Y.\n" +
        "• تحريكُ مفصل الكاحل يدوياً إن بقي انثناؤه محدوداً.",
        "Notes for the specialist:\n" +
        "• Eversion is the strengthening priority — measure it and compare with the other side.\n" +
        "• Balance progresses: eyes open ⟵ eyes closed ⟵ soft surface ⟵ arm movements and a ball ⟵ Y-balance.\n" +
        "• Mobilise the ankle joint manually if dorsiflexion remains limited.",
      ],
      exercises: [
        { code: "band-ankle-strengthening" },
        { code: "calf-raise", doseNote: ALTERNATE, note: ["بالساقين ثمّ على الساق المصابة وحدها.", "On both legs, then on the injured leg alone."] },
        { code: "knee-to-wall-lunge" },
        { code: "ankle-single-leg-balance", note: ["بعينين مغلقتين، ثمّ على وسادة.", "With the eyes closed, then on a cushion."] },
        { code: "star-excursion-reach" },
      ],
    },
    {
      name: ["الوظيفة والقفز والعودة إلى الرياضة والعمل", "Function, hopping and return to sport and work"],
      sessionFrom: 9, sessionTo: 12,
      timeframe: ["نهاية الأسبوع الثاني ثمّ البيت — وللشديد الأسابيع ٤–٨", "End of week 2, then home — weeks 4–8 in a severe sprain"],
      goals: [
        "هبوطٌ ثابتٌ على الساق المصابة، وقفزٌ جانبيّ متحكَّم، وجريٌ وتغييرٌ للاتّجاه بلا ألمٍ ولا تورّم لمن يعود إلى الرياضة، وعودةٌ إلى العمل والأنشطة، واستقلالٌ ببرنامجٍ منزليٍّ للتوازن يستمرّ أسابيع.",
        "A steady landing on the injured leg, controlled lateral hopping, pain-free running and cutting without swelling for those returning to sport, return to work and activities, and independence with a home balance programme that continues for weeks.",
      ],
      education: [
        "• العودةُ إلى الرياضة بالمعايير لا بالأيّام: حين يتساوى الجانبان في القفز والتوازن بلا ألمٍ ولا تورّم.\n" +
        "• الدعامةُ أو الشريطُ في الرياضة بعد الإصابة يقلّلان التكرارَ كثيراً.\n" +
        "• برنامجُ التوازن المنزليّ يستمرّ — وهو الذي يقلّل الالتواءَ الثاني.\n" +
        "• إن عاد الكاحلُ يخون أو يتورّم بعد النشاط — راجعنا.",
        "• Return to sport by criteria, not days: when both sides match in hopping and balance without pain or swelling.\n" +
        "• A brace or tape for sport after the injury greatly reduces recurrence.\n" +
        "• The home balance programme continues — it is what reduces a second sprain.\n" +
        "• If the ankle starts giving way again or swells after activity — come back to us.",
      ],
      criteria: [
        "ينتهي البرنامجُ حين:\n" +
        "• قدرةُ القدم والكاحل (FAAM-ADL) ٩٠٪ فأكثر، أو تحسّنت ٨ نقاطٍ على الأقلّ.\n" +
        "• القفزُ والهبوطُ على الساق المصابة بلا ألم، ولمن يعود إلى الرياضة: مسافةُ القفز ٩٠٪ على الأقلّ من الجهة الأخرى، والجريُ وتغييرُ الاتّجاه بلا تورّمٍ في اليوم التالي.\n" +
        "• الفرقُ في الوصول الأماميّ (اختبار Y) أقلُّ من ٤ سم.\n" +
        "• يؤدّي البرنامجَ المنزليّ للتوازن وحده، ويعرف متى يلبس الدعامة.\n" +
        "ثمّ زيارةُ متابعةٍ بعد أربعة أسابيع.",
        "Discharge (graduate) when:\n" +
        "• Foot and Ankle Ability Measure (FAAM-ADL) 90% or more, or improved by at least 8 points.\n" +
        "• Hopping and landing on the injured leg without pain; and for those returning to sport: hop distance at least 90% of the other side, with running and cutting causing no swelling the next day.\n" +
        "• Anterior reach difference (Y-balance) under 4 cm.\n" +
        "• Performs the home balance programme independently and knows when to wear the brace.\n" +
        "Then a follow-up visit after four weeks.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• القفزُ يبدأ بالساقين ثمّ بساقٍ واحدة، والمسافةُ والسرعةُ تزيدان بثبات الهبوط.\n" +
        "• تمارينُ الجري وتغيير الاتّجاه لمن يعود إلى الرياضة أو عملٍ فيه جري — ولغيرهم المشيُ السريع على أرضٍ غير مستوية والدرج.\n" +
        "• البرنامجُ المنزليّ للتوازن يُكتب ويُسلَّم بجرعته.",
        "Notes for the specialist:\n" +
        "• Hopping starts on two legs, then one, with distance and speed rising as the landing becomes steady.\n" +
        "• Running and cutting drills for those returning to sport or to work that involves running — for others, brisk walking on uneven ground and stairs.\n" +
        "• The home balance programme is written down and handed over with its dose.",
      ],
      exercises: [
        { code: "forward-hop-stick" },
        { code: "lateral-hops" },
        { code: "figure-8-agility", note: ["لمن يعود إلى الرياضة أو عملٍ فيه جري.", "For those returning to sport or to work that involves running."] },
        { code: "star-excursion-reach", note: ["مسافةٌ أبعد واتّجاهاتٌ أكثر.", "Longer reaches in more directions."] },
        { code: "calf-raise", doseNote: ALTERNATE, note: ["على الساق المصابة وحدها، ثمّ بثقلٍ في اليد.", "On the injured leg alone, then holding a weight."] },
        { code: "ankle-single-leg-balance", note: ["على وسادة مع رمي الكرة والتقاطها.", "On a cushion while throwing and catching a ball."] },
      ],
    },
  ],
};

export const name = "130_physio_ankle_sprain_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
