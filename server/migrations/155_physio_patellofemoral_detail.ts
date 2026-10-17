// Migration 155: ألمُ الرضفة الفخذيّ — البروتوكولُ التاسع عشر مفصَّلاً (§4.en — ٢٠٢٦-١٠-١٧).
//
// المالك (٢٠٢٦-١٠-١٧): «نكمل والبروتوكولات» — فاختار المساعدُ ألمَ الرضفة الفخذيّ (`patellofemoral-pain-adult`): أشيعُ ألم الركبة عند الشباب
// والمراهقين — انتشارُه السنويّ ٢٢٫٧٪ في دراسةٍ سكّانية و٢٨٫٩٪ في دراسةٍ للمراهقين، والنساءُ ضعفُ الرجال (Smith 2018 · Boling 2010).
// **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعةُ أسابيع) — والتقويةُ الثقيلة يوماً بعد يوم كما في التجارب — وتمديدٌ واحد
// بستٍّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين في الأسبوعين السادس والثاني عشر؛ وثلاثُ مراحل
// بنطاقات (١–٦ · ٧–١٦ · ١٧–٢٤) بمعايير الفرق المهمّ (الألمُ نقطتان، وكوجالا ١٠) **وقاعدةُ ألمٍ للتحميل** (٢ من ١٠ ثمّ صباحُ اليوم التالي)؛ وخمسُ
// بطاقاتٍ جديدة (تمطيطُ الفخذ الأماميّ واقفاً، وتقويةُ الورك واقفاً بالمطّاط، والقرفصاءُ على ساقٍ حتى الكرسيّ، وإعادةُ تعليم الجري، والشريطُ اللاصق
// للرضفة) والمعادةُ بصورها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقياسُ كما زُرع (كوجالا) والألمُ ووظيفةُ المريض بالعربية
// والنزولُ عن الدرجة وقوّةُ الورك إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ ألمَ الرضفة**: التمرينُ هو العلاج — الورك والركبة معاً بدرجة A في إرشاد JOSPT (Willy 2019) وفي إجماعَي ٢٠١٦ و٢٠١٨ (Crossley 2016 ·
// Collins 2018)، والنعلُ الجاهز مع التمرين لمن تنبسط قدمُه (A)، والشريطُ المفصَّل مع التمرين (B)؛ **وضدّه**: الإبرُ الجافّة (A) والعلاجُ اليدويّ وحده (A)
// والأجهزةُ الفيزيائية (B) والدعّاماتُ والأكمام (B). **والجرعة**: التجاربُ ثلاثاً في الأسبوع أربعةَ أسابيع إلى ثمانية (١٢–٢٤ جلسة غالباً) مع تمرينٍ منزليّ
// يوميّ، ولا تجربةَ لخمسٍ أو ستٍّ في الأسبوع (بحثٌ صفريّ) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والتحفيزُ
// (NMES للفخذ) والتيكارُ والمغناطيسُ والحرارةُ مساعدةٌ بقاعدة المركز والدليلُ ضدّ أكثرها مكتوب؛ والإبرُ والليزرُ والأمواجُ فوق الصوتية والصادمةُ «لا يُستخدم»
// — **فلا إعداداتِ جهازٍ تمنع اعتمادَه**. **وما يخصّ العراق**: لا تجربةَ عراقيةَ للعلاج الطبيعيّ (بحثٌ صفريّ)، وفي النسخة الأردنية من كوجالا بندُ «السجود»
// (Haddad 2021)، ولا دراسةَ للصلاة والجلوس على الأرض.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٢٢٢ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — خمس؛ والمعادةُ (زُرعت في ١٢٦ و١٢٨ و١٣٠ و١٣٨ و١٤٠ و١٤٣ و١٢٤) تُربط برموزها وصورها، وما يخصّ الرضفةَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "quadriceps-stretch-standing", nameAr: "تمطيط عضلة الفخذ الأمامية واقفاً", nameEn: "Standing quadriceps stretch",
    kind: "stretch", region: "knee", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يعيد طولَ عضلة الفخذ الأمامية: قصرُها شائعٌ في ألم الرضفة (Piva 2005)، وحدُّه في الإرشاد ثنيُ الركبة منبطحاً أقلُّ من ١٣٤° (Willy 2019). والتمطيطُ الثابت والمتحرّك ثلاثَ مرّاتٍ ١٥ ثانية مرّتين يومياً خفّفا الألمَ بالقدر نفسِه فيمن قصرت عضلتُهم (Lee 2021). والتمطيطُ جزءٌ من العلاج المركّب لا علاجٌ وحده (Willy 2019).",
      "Restores the length of the front thigh muscle: tightness is common in patellofemoral pain (Piva 2005), and the guideline's cut-off is prone knee flexion below 134° (Willy 2019). Static and dynamic stretching, three times 15 seconds twice a day, eased pain equally in those with a tight quadriceps (Lee 2021). Stretching is part of combined care, not a treatment on its own (Willy 2019)."],
    start: ["واقفٌ بجانب حائطٍ أو كرسيٍّ ثابت يستند إليه بيد، والقدمان معاً.",
      "Standing beside a wall or a stable chair, holding it with one hand, feet together."],
    steps: [[
      "اثنِ ركبةَ الساق التي تتمطّط، وأمسك الكاحلَ أو القدمَ باليد في الجهة نفسِها — أو بحزامٍ حول الكاحل إن لم تصل.",
      "قرّب الكعبَ من الألية برفق، والركبتان متلاصقتان والفخذُ عموديٌّ على الأرض.",
      "شدّ البطنَ وأمِل الحوضَ قليلاً للخلف بلا تقويسٍ للظهر، فيزيد الشدُّ في مقدّمة الفخذ.",
      "اثبت ٣٠ ثانية حتى تشعر بشدٍّ مريح في مقدّمة الفخذ — لا في الرضفة.",
      "أنزل القدمَ ببطء، وأعد ثلاثَ مرّات، ثمّ الساقَ الأخرى إن كانت قصيرةً أيضاً.",
    ], [
      "Bend the knee of the leg being stretched and hold the ankle or foot with the hand on the same side — or a strap around the ankle if you cannot reach.",
      "Bring the heel gently towards the buttock, knees together and the thigh vertical to the floor.",
      "Tighten the abdomen and tilt the pelvis slightly back without arching the back, so the stretch increases at the front of the thigh.",
      "Hold for 30 seconds until you feel a comfortable stretch at the front of the thigh — not at the kneecap.",
      "Lower the foot slowly, repeat three times, then the other leg if it is tight too.",
    ]],
    cues: [[
      "تقويسُ أسفل الظهر ⟵ إمالةُ الحوض للخلف وشدُّ البطن.",
      "الركبةُ تتقدّم أو تبتعد إلى الخارج ⟵ الركبتان متلاصقتان والفخذُ عموديّ.",
      "شدٌّ يؤلم الرضفة ⟵ ثنيٌ أقلّ أو حزام، والشدُّ في العضلة وحدها.",
    ], [
      "Arching the lower back → tilt the pelvis back and tighten the abdomen.",
      "The knee drifting forward or out → knees together with the thigh vertical.",
      "A pull that hurts the kneecap → less bend or a strap, with the stretch felt in the muscle only.",
    ]],
    easier: ["منبطحاً على السرير بحزامٍ حول الكاحل وثنيٍ أقلّ، أو بوسادةٍ تحت الفخذ.", "Lying face down on the bed with a strap around the ankle and less bend, or with a pillow under the thigh."],
    harder: ["بسطُ الورك قليلاً (الفخذُ خلف الجسم)، أو النسخةُ المتحرّكة: ١٥ تكراراً بطيئاً بثباتٍ قصير (Lee 2021).", "A little hip extension (thigh behind the body), or the dynamic version: 15 slow repetitions with a short hold (Lee 2021)."],
    stopIf: ["ألمٌ في الرضفة فوق ٢ من ١٠ أو يبقى بعد التمطيط، أو تقلّصٌ في العضلة، أو دوخة ⟵ يتوقّف ويخبر الأخصائيّ.",
      "Kneecap pain above 2/10 or lasting after the stretch, a muscle cramp, or dizziness → stop and tell the therapist."],
    equipment: ["حائطٌ أو كرسيٌّ ثابت للاستناد، وحزامٌ أو منشفة إن لم تصل اليد.", "A wall or stable chair for support, and a strap or towel if the hand cannot reach."],
    doseNote: ["٣ × ١٥–٣٠ ثانية مرّتين يومياً لمن قصرت عضلتُه (Lee 2021) — ولا حاجةَ إليه لمن طولُها طبيعيّ.", "3 × 15–30 seconds twice a day for those with a tight quadriceps (Lee 2021) — not needed when its length is normal."],
    images: [{ key: "quadriceps-stretch-standing-1", ar: "واقفٌ يستند إلى حائطٍ بيد، والأخرى تمسك كاحلَ الساق المثنيّة والكعبُ قرب الألية والركبتان متلاصقتان",
      en: "Standing with one hand on a wall, the other holding the ankle of the bent leg with the heel near the buttock and the knees together", search: "standing quadriceps stretch" }],
  },
  {
    code: "standing-band-hip-abduction-er", nameAr: "تقوية الورك واقفاً بالمطّاط (التبعيد والتدوير إلى الخارج)", nameEn: "Standing band hip abduction and external rotation",
    kind: "strength", region: "hip", perSide: true, homeSuitable: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يقوّي عضلاتِ الورك الخلفية الجانبية وهو واقف — ما يطلبه الإرشادُ بدرجة A مع تمارين الركبة (Willy 2019). وكان في البرامج التي نجحت: التبعيدُ والتدويرُ إلى الخارج بالمطّاط ثلاثَ مجموعاتٍ من عشر بمطّاطٍ تتعب به في آخر ثلاثة تكرارات، ثمّ ١٠–١٥ بمطّاطٍ أقوى كلَّ أسبوعٍ أو اثنين (Ferber 2015)، والتبعيدُ واقفاً بالمطّاط في تجربة الورك والركبة (Fukuda 2010).",
      "Strengthens the posterolateral hip muscles in standing — what the guideline asks for at grade A alongside knee exercise (Willy 2019). It featured in the programmes that worked: band abduction and external rotation, three sets of ten with a band that makes the last three repetitions hard, then 10–15 with a stronger band every week or two (Ferber 2015), and standing band abduction in the hip-and-knee trial (Fukuda 2010)."],
    start: ["واقفٌ مستقيماً بجانب حائطٍ يستند إليه بيدٍ خفيفة، والمطّاطُ حول الكاحلين للتبعيد، أو مربوطٌ بثباتٍ بارتفاع الركبة حول الفخذ للتدوير.",
      "Standing tall beside a wall, resting a hand on it lightly, with the band around both ankles for abduction, or anchored at knee height around the thigh for rotation."],
    steps: [[
      "التبعيد: انقل الساقَ التي تعمل إلى الجانب ٢٠–٣٠° والأصابعُ إلى الأمام والجذعُ مستقيم.",
      "عُد ببطءٍ في ثانيتين أو ثلاث دون أن يرتخي المطّاط.",
      "التدويرُ إلى الخارج: والمطّاطُ حول الفخذ من الداخل، أدر الركبةَ والفخذَ إلى الخارج ضدّه والحوضُ مستوٍ، ثمّ عُد ببطء.",
      "اعمل الساقين كلتيهما — فالساقُ الواقفة تعمل أيضاً لتثبيت الحوض.",
      "عشرُ تكرارات، ثلاثُ مجموعات، ودقيقةُ راحة بينها.",
    ], [
      "Abduction: move the working leg out to the side 20–30° with the toes forward and the trunk upright.",
      "Return slowly over two or three seconds without letting the band go slack.",
      "External rotation: with the band around the inside of the thigh, turn the knee and thigh outwards against it with the pelvis level, then return slowly.",
      "Work both legs — the standing leg is also working to hold the pelvis steady.",
      "Ten repetitions, three sets, with a minute's rest between them.",
    ]],
    cues: [[
      "ميلُ الجذع إلى الجانب أو رفعُ الحوض ⟵ الجذعُ مستقيمٌ والحركةُ من الورك.",
      "تدويرُ القدم إلى الخارج بدل الورك ⟵ الأصابعُ إلى الأمام في التبعيد.",
      "انهيارُ ركبة الساق الواقفة إلى الداخل ⟵ الركبةُ فوق الإصبع الثاني.",
      "حركةٌ سريعة يجرّها المطّاط ⟵ عودةٌ بطيئة مضبوطة.",
    ], [
      "Leaning the trunk sideways or hitching the hip → trunk upright with the movement from the hip.",
      "Turning the foot out instead of the hip → toes forward in abduction.",
      "The standing knee collapsing inwards → the knee over the second toe.",
      "A fast movement pulled by the band → a slow, controlled return.",
    ]],
    easier: ["مطّاطٌ أخفّ، أو في الاستلقاء: بطاقتا «تمرين الصدفة» و«رفع الساق جانباً».", "A lighter band, or lying down: the 'Clamshell' and 'Side-lying hip abduction' cards."],
    harder: ["مطّاطٌ أقوى كلَّ أسبوعٍ أو اثنين، والوقوفُ على وسادةٍ لينة، ثمّ المشيُ جانباً والمطّاطُ حول الركبتين (Fukuda 2010).", "A stronger band every week or two, standing on a soft cushion, then side-stepping with the band around the knees (Fukuda 2010)."],
    stopIf: ["ألمٌ في ركبة الساق الواقفة فوق ٢ من ١٠، أو ألمٌ في الورك أو الأربية ⟵ يخفّف أو يتوقّف ويخبر الأخصائيّ.",
      "Pain in the standing knee above 2/10, or hip or groin pain → ease off or stop and tell the therapist."],
    equipment: ["مطّاطٌ مقاوم بألوانٍ متدرّجة، وحائطٌ أو طاولة للاستناد.", "Resistance bands in graded colours, and a wall or table for support."],
    doseNote: ["٣ × ١٠ بمطّاطٍ تتعب به في آخر ثلاثة، ثمّ ٣ × ١٠–١٥ بمطّاطٍ أقوى؛ في أيّام التقوية بالمركز وفي البيت حتى ستّة أيّام في الأسبوع (Ferber 2015).", "3 × 10 with a band that tires you in the last three, then 3 × 10–15 with a stronger band; on the strengthening days in the centre and at home up to six days a week (Ferber 2015)."],
    images: [{ key: "standing-band-hip-abduction-1", ar: "واقفٌ بجانب حائطٍ والمطّاطُ حول الكاحلين يبعد ساقاً إلى الجانب والأصابعُ إلى الأمام والجذعُ مستقيم",
      en: "Standing beside a wall with a band around both ankles, moving one leg out to the side with the toes forward and the trunk upright", search: "standing hip abduction resistance band ankles" }],
  },
  {
    code: "single-leg-squat-to-box", nameAr: "القرفصاء على ساقٍ واحدة حتى الكرسيّ", nameEn: "Single-leg squat to a box or chair",
    kind: "strength", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يحمل الفخذَ والوركَ معاً على ساقٍ واحدة في المدى الذي يحتاجه الدرجُ والقيامُ والانتقالُ في الصلاة؛ وكان آخرَ ما وصله برنامجُ الركبة في التجربة الكبرى: قرفصاءُ ساقٍ واحدة ربعاً ثمّ نصفاً حتى ٩٠° في الأسبوعين الأخيرين (Ferber 2015). والكرسيُّ يضبط العمق، والمرآةُ تعلّم الركبةَ فوق القدم والحوضَ مستوياً — والتعليمُ بالتغذية الراجعة أكثرُ ما غيّر حركةَ الركبة (Nunes 2023).",
      "Loads the thigh and hip together on one leg through the range that stairs, standing up and the movements of prayer need; it was the last step of the knee programme in the largest trial: single-leg squats, a quarter and then a half, down to 90° in the last two weeks (Ferber 2015). The chair controls the depth, and a mirror teaches the knee over the foot with a level pelvis — feedback-based retraining changed knee movement the most (Nunes 2023)."],
    start: ["واقفٌ على الساق التي تعمل أمام كرسيٍّ أو صندوقٍ ثابت، والقدمُ الأخرى مرفوعةٌ قليلاً إلى الأمام أو تلمس الأرضَ بأطراف الأصابع، والذراعان إلى الأمام، وأمامه مرآةٌ إن أمكن.",
      "Standing on the working leg in front of a stable chair or box, the other foot lifted slightly forward or touching the floor with the toes, arms forward, facing a mirror if possible."],
    steps: [[
      "اجلس إلى الخلف ببطءٍ في ثلاث ثوانٍ كأنك تجلس على الكرسيّ.",
      "المس الكرسيَّ بالأليتين لمساً خفيفاً دون أن تجلس.",
      "قُم في ثانيتين بدفع القدم كلّها حتى تستقيم الركبة.",
      "الركبةُ فوق الإصبع الثاني، والحوضُ مستوٍ، والجذعُ مائلٌ إلى الأمام قليلاً طوالَ الحركة.",
      "عشرُ تكرارات، ثمّ الساقُ الأخرى.",
    ], [
      "Sit back slowly over three seconds as if sitting on the chair.",
      "Touch the chair lightly with the buttocks without sitting down.",
      "Stand up over two seconds by pushing through the whole foot until the knee is straight.",
      "Knee over the second toe, pelvis level and trunk leaning slightly forward throughout.",
      "Ten repetitions, then the other leg.",
    ]],
    cues: [[
      "الركبةُ تنهار إلى الداخل ⟵ فوق الإصبع الثاني، وانظر في المرآة.",
      "الحوضُ ينزل من الجهة الأخرى أو الجذعُ يميل جانباً ⟵ الحوضُ مستوٍ والجذعُ في الوسط.",
      "السقوطُ على الكرسيّ ⟵ نزولٌ بطيء ولمسٌ خفيف.",
      "رفعُ الكعب ⟵ القدمُ كلُّها على الأرض.",
    ], [
      "The knee collapsing inwards → over the second toe, watching the mirror.",
      "The opposite side of the pelvis dropping or the trunk leaning sideways → pelvis level and trunk centred.",
      "Dropping onto the chair → a slow descent and a light touch.",
      "Lifting the heel → the whole foot on the floor.",
    ]],
    easier: ["كرسيٌّ أعلى (ثنيٌ ٠–٤٥° أوّلاً)، أو اليدُ على حائط، أو الساقان معاً والوزنُ أكثرُ على الساق التي تعمل.", "A higher chair (0–45° of bend first), a hand on a wall, or both legs with more weight on the working leg."],
    harder: ["كرسيٌّ أخفض حتى ٩٠°، أو ثقلٌ في اليدين، أو نزولٌ أبطأ، أو ثباتٌ ثانيتين قبل القيام.", "A lower chair down to 90°, a weight in the hands, a slower descent, or a two-second pause before standing."],
    stopIf: ["ألمٌ في الرضفة فوق ٢ من ١٠ أثناءه، أو ألمٌ يزيد صباحَ اليوم التالي، أو إحساسٌ بأنّ الركبةَ تنفلت ⟵ يرجع خطوةً ويخبر الأخصائيّ.",
      "Kneecap pain above 2/10 during it, pain worse the next morning, or a feeling of the knee giving way → go back a step and tell the therapist."],
    equipment: ["كرسيٌّ أو صندوقٌ ثابت بارتفاعاتٍ مختلفة، ومرآة.", "A stable chair or box of different heights, and a mirror."],
    doseNote: ["٣ × ١٠ ثمّ ٣ × ١٥ في أيّام التقوية (ثلاثاً في الأسبوع)، والعمقُ يزيد بقاعدة الألم (Ferber 2015).", "3 × 10 then 3 × 15 on the strengthening days (three a week), with the depth increasing by the pain rule (Ferber 2015)."],
    images: [{ key: "single-leg-squat-to-box-1", ar: "واقفٌ على ساقٍ واحدة أمام صندوقٍ أو كرسيّ ينزل بالأليتين نحوه والساقُ الأخرى مرفوعةٌ إلى الأمام والذراعان ممدودتان",
      en: "Standing on one leg in front of a box or chair, lowering the buttocks towards it with the other leg lifted forward and the arms out in front", search: "single leg squat to box" }],
  },
  {
    code: "running-cadence-retraining", nameAr: "إعادة تعليم الجري بزيادة عدد الخطوات", nameEn: "Running retraining with a higher step rate",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["لمن يجري — في الرياضة أو كرة القدم: زيادةُ الخطوات في الدقيقة ١٠٪ بالسرعة نفسِها تقصّر الخطوةَ وتخفّف الحِملَ على الرضفة نحو ١٤٪ (Lenhart 2014). وفي عدّائين بألم الرضفة تحسّن الألمُ والمسافةُ بجلسةٍ واحدة ثمّ أسبوعين بالمنظّم الإيقاعيّ وأسبوعين بالساعة (Bramah 2019)، والإرشادُ «يمكن» بدرجة C (Willy 2019)، والمراجعاتُ تتّفق على +٥–١٠٪ (Petri 2026). وأساسُه تنظيمُ حِمل الجري قبل كلّ شيء (Esculier 2018).",
      "For those who run — in sport or football: raising the steps per minute by 10% at the same speed shortens the stride and cuts the load on the kneecap by about 14% (Lenhart 2014). In runners with patellofemoral pain, pain and running distance improved after one session followed by two weeks with a metronome and two weeks with a watch (Bramah 2019); the guideline says 'may' at grade C (Willy 2019), and reviews agree on +5–10% (Petri 2026). Its basis is managing the running load first (Esculier 2018)."],
    start: ["على جهاز الجري أو أرضٍ مستوية بسرعة الجري السهلة المعتادة، ومعه هاتفٌ أو ساعةٌ فيها منظّمٌ إيقاعيّ (مترونوم).",
      "On the treadmill or level ground at the usual easy running pace, with a phone or watch that has a metronome."],
    steps: [[
      "عُدّ خطواتك في دقيقةٍ بسرعتك السهلة، أو اقرأها من الساعة — هذا عددُك الأصليّ.",
      "اضبط المنظّمَ الإيقاعيّ على ٥–١٠٪ فوقه (مثلاً ١٦٠ ⟵ ١٧٠ خطوة في الدقيقة).",
      "اجرِ خمسَ دقائق مع الصوت بخطواتٍ أقصرَ وأخفّ، والقدمُ تهبط تحت الجسم.",
      "ثمّ خمسَ دقائق بلا صوت محافظاً على الإيقاع الجديد.",
      "أسبوعان بالمنظّم، ثمّ أسبوعان تراقب الإيقاعَ بالساعة وحدها.",
    ], [
      "Count your steps in one minute at your easy pace, or read them from the watch — this is your baseline.",
      "Set the metronome 5–10% above it (for example 160 → 170 steps per minute).",
      "Run for five minutes with the beat, with shorter, lighter steps and the foot landing under the body.",
      "Then five minutes without the beat, keeping the new rhythm.",
      "Two weeks with the metronome, then two weeks watching the rhythm on the watch alone.",
    ]],
    cues: [[
      "زيادةُ السرعة بدل عدد الخطوات ⟵ السرعةُ نفسُها وخطواتٌ أقصر.",
      "خطوةٌ طويلة تهبط أمام الجسم على الكعب بقوّة ⟵ هبوطٌ خفيف تحت الجسم.",
      "تغييرُ الهبوط إلى مقدّمة القدم فجأة ⟵ تدريجياً، فهو يُثقل بطنَ الساق ووترَ أخيل (Esculier 2020).",
    ], [
      "Speeding up instead of taking more steps → the same speed with shorter steps.",
      "A long stride landing hard on the heel in front of the body → a light landing under the body.",
      "Switching suddenly to a forefoot landing → gradually, as it loads the calf and Achilles tendon (Esculier 2020).",
    ]],
    easier: ["+٥٪ أوّلاً، والتناوبُ بين المشي والجري، وأرضٌ مستوية.", "+5% first, alternating walking and running, on level ground."],
    harder: ["+١٠٪، وجريٌ أطول، ثمّ المنحدرات.", "+10%, longer runs, then slopes."],
    stopIf: ["ألمُ الركبة ٣ من ١٠ فأكثر أثناء الجري أو بعده، أو يزيد صباحاً، أو ألمٌ في بطن الساق أو وتر أخيل ⟵ يقلّل المسافةَ ويخبر الأخصائيّ (Bramah 2019).",
      "Knee pain of 3/10 or more during or after running, worse the next morning, or pain in the calf or Achilles tendon → reduce the distance and tell the therapist (Bramah 2019)."],
    equipment: ["جهازُ جري أو أرضٌ مستوية، وهاتفٌ فيه تطبيقُ منظّمٍ إيقاعيّ أو ساعةٌ تعدّ الخطوات.", "A treadmill or level ground, and a phone with a metronome app or a watch that counts steps."],
    doseNote: ["جلسةٌ واحدة بإشراف، ثمّ أسبوعان بالمنظّم وأسبوعان بالساعة؛ والمسافةُ تزيد ما دام الألمُ أقلَّ من ٣ من ١٠ (Bramah 2019).", "One supervised session, then two weeks with the metronome and two with the watch; distance increases while pain stays below 3/10 (Bramah 2019)."],
    images: [{ key: "running-cadence-1", ar: "عدّاءٌ يهبط بقدمه تحت جسمه بخطوةٍ قصيرة، مقارنةً بخطوةٍ طويلة تهبط على الكعب أمام الجسم",
      en: "A runner landing with the foot under the body in a short stride, compared with a long stride landing on the heel in front of the body", search: "running overstriding vs short stride under the body" }],
  },
  {
    code: "patellar-taping-mcconnell", nameAr: "الشريط اللاصق للرضفة (المفصَّل لكلّ مريض — طريقة McConnell)", nameEn: "Tailored patellar taping (McConnell)",
    kind: "functional", region: "knee", homeSuitable: true,
    purpose: ["يخفّف الألمَ فوراً ليصير التمرينُ بلا ألم: الإرشادُ «يمكن» استعمالُ الشريط المفصَّل لكلّ مريض مع التمرين حتى أربعة أسابيع (Willy 2019)، والمفصَّلُ أقوى أثراً فورياً من غير المفصَّل (Barton 2014). ويُبقى فقط إن خفّف ألمَ القرفصاء ٥٠٪ فأكثر (Rathleff 2018) — ولا يحلّ محلَّ التمرين، ولا يُستعمل «لتقوية العضلة» (Willy 2019).",
      "Gives immediate pain relief so exercise can be done without pain: the guideline says clinicians 'may' use taping tailored to each patient together with exercise for up to four weeks (Willy 2019), and tailored taping has a larger immediate effect than untailored taping (Barton 2014). It is kept only if it cuts squat pain by 50% or more (Rathleff 2018) — it never replaces exercise and is not used 'to strengthen the muscle' (Willy 2019)."],
    start: ["جالسٌ والساقُ ممدودةٌ مرتخية على السرير، والجلدُ نظيفٌ جافّ، وشريطٌ واقٍ للجلد تحت الشريط الصلب.",
      "Sitting with the leg straight and relaxed on the bed, the skin clean and dry, with a protective under-tape beneath the rigid tape."],
    steps: [[
      "اختبر أوّلاً حركةً تؤلم — القرفصاءَ بالساقين أو النزولَ عن درجة — وسجّل الألمَ من ١٠.",
      "ضع الشريطَ الواقي ثمّ الشريطَ الصلب (أكسيد الزنك) بالترتيب الذي يحتاجه الفحص: الميلُ الأماميّ، ثمّ الميلُ الوحشيّ، ثمّ الانزلاقُ إلى الداخل، ثمّ تخفيفُ الوسادة الدهنية تحت الرضفة.",
      "أعد الاختبارَ بعد كلّ شريط.",
      "أبقِه فقط إن نقص الألمُ ٥٠٪ فأكثر؛ وإلّا انزعه.",
      "علّم المريضَ أو أحدَ أهله وضعَه يومياً؛ يُلبس في النهار وفي التمرين حتى أربعة أسابيع ثمّ يُقلَّل.",
    ], [
      "First test a painful movement — a two-leg squat or stepping down from a step — and record the pain out of 10.",
      "Apply the under-tape, then the rigid zinc-oxide tape in the order the examination calls for: anterior tilt, then lateral tilt, then medial glide, then unloading the fat pad below the kneecap.",
      "Retest after each strip.",
      "Keep it only if the pain falls by 50% or more; otherwise remove it.",
      "Teach the patient or a family member to apply it daily; it is worn during the day and in exercise for up to four weeks, then weaned.",
    ]],
    cues: [[
      "شريطٌ على وتر الرضفة وحده ⟵ التصحيحُ على الرضفة نفسِها بحسب الفحص.",
      "شريطٌ مجعّد أو مشدودٌ على الجلد مباشرةً ⟵ الشريطُ الواقي تحته، والشدُّ على الرضفة لا على الجلد.",
      "تركُه مع حكّةٍ أو احمرار ⟵ يُنزع فوراً.",
    ], [
      "Tape on the patellar tendon only → the correction on the kneecap itself, as the examination shows.",
      "Wrinkled tape, or rigid tape pulled straight onto the skin → the under-tape beneath it, with the pull on the kneecap, not the skin.",
      "Leaving it on despite itching or redness → remove it at once.",
    ]],
    easier: ["الشريطُ المرن (كينيزيو) لمن جلدُه حسّاس — وأثرُه صغير (Jiao 2025).", "Kinesiology tape for sensitive skin — its effect is small (Jiao 2025)."],
    harder: ["لا يتدرّج — يُقلَّل بعد أربعة أسابيع حتى يُترك.", "It does not progress — it is weaned after four weeks until stopped."],
    stopIf: ["حكّةٌ أو فقاعات أو احمرارٌ في الجلد (تفاعلاتُ الجلد عند نحو ٤٠٪ مع الشريط اليوميّ — Collins 2008)، أو لم يخفّف الألم ⟵ يُنزع ويخبر الأخصائيّ.",
      "Itching, blisters or redness of the skin (skin reactions in about 40% with daily taping — Collins 2008), or no pain relief → remove it and tell the therapist."],
    equipment: ["شريطٌ واقٍ للجلد، وشريطٌ صلب من أكسيد الزنك بعرض ٣٨ ملم، ومقصّ.", "A protective under-tape, rigid zinc-oxide tape 38 mm wide, and scissors."],
    doseNote: ["يُعاد يومياً ويُلبس في النهار وفي التمرين حتى أربعة أسابيع ثمّ يُقلَّل (Rathleff 2018 · Willy 2019).", "Reapplied daily and worn during the day and in exercise for up to four weeks, then weaned (Rathleff 2018 · Willy 2019)."],
    images: [{ key: "patellar-taping-1", ar: "ركبةٌ ممدودة عليها شريطٌ لاصق يسحب الرضفةَ إلى الداخل من حافّتها الخارجية",
      en: "A straight knee with tape pulling the kneecap inwards from its outer edge", search: "McConnell patellar taping medial glide" }],
  },
];

const PAIN_RULE_AR = "قاعدةُ الألم للتمارين والنشاط (في كلّ المراحل): يجوز أن يرتفع الألمُ أثناء التمرين أو النشاط حتى نقطتين فوق ما بدأ به، وسقفُه ٣ من ١٠ — وهذا سقفُ التجارب (Rathleff 2018 · Bramah 2019 · Albornoz-Cabello 2023)؛ ويهدأ خلال ٢٤ ساعة، ولا يكون الألمُ المعتاد صباحَ اليوم التالي أعلى ممّا كان (Rathleff 2018 · Rathleff 2020). فإن تجاوزها: ينزل خطوةً (المدى أو الثقل أو التكرار أو درجةُ السلّم)؛ وإن احترمها مرّتين متتاليتين: يتقدّم خطوة. وهي اقتراحٌ يجمع ما استعملته التجارب — ولم تُقارَن قاعدتان (بحثٌ صفريّ). ويُقال للمريض: الألمُ ليس ضرراً، والتحميلُ المتدرّج هو العلاج.\n" +
  "سلّمُ النشاط (للرياضيّ والمراهق — Rathleff 2020): لا ينتقل إلى الدرجة التالية حتى يكون الألمُ ٢ من ١٠ أو أقلّ أثناءها وصباحَ اليوم التالي، وإن ساء فجأةً ينزل درجة: (١) المشيُ الخفيف أو الدراجةُ الخفيفة ⟵ (٢) المشيُ السريع أو الدراجةُ بجهدٍ متوسّط ⟵ (٣) الجريُ البطيء ⟵ (٤) الدرج ⟵ (٥) الجريُ المتوسّط ⟵ (٦) النطّ ⟵ (٧) القفز ⟵ (٨) الجريُ السريع والانعطافُ والقفز ⟵ (٩) إحماءٌ ونصفُ التدريب ⟵ (١٠) إحماءٌ والتدريبُ كاملاً ⟵ (١١) المباراة؛ والعودةُ إلى المباريات بعد أسبوعين من التدريب الكامل بلا ألم. وتُضاف درجاتُ الحياة اليومية التي يختارها المريض: الجلوسُ في الدرس أو المجلس مع فترات، والصلاةُ بأوضاعها كاملة، والمرحاضُ العربيّ، وحملُ الأغراض على الدرج.";
const PAIN_RULE_EN = "The pain rule for exercise and activity (all phases): pain during an exercise or activity may rise up to two points above its starting level, with a ceiling of 3/10 — the ceiling used in trials (Rathleff 2018 · Bramah 2019 · Albornoz-Cabello 2023); it settles within 24 hours, and the usual pain the next morning is not higher than it was (Rathleff 2018 · Rathleff 2020). If it is broken: go down one step (range, load, repetitions or ladder step); if it is respected twice in a row: go up one step. It is a proposal combining what trials used — no trial compared pain rules (a documented zero result). The patient is told: hurt is not harm, and graded loading is the treatment.\n" +
  "The activity ladder (for athletes and adolescents — Rathleff 2020): move to the next step only when pain is 2/10 or less during it and the next morning, and go down a step if it suddenly worsens: (1) light walking or light cycling → (2) brisk walking or moderate cycling → (3) slow running → (4) stairs → (5) running at medium pace → (6) skipping → (7) jumping → (8) fast running, turning and jumping → (9) warm-up and half of training → (10) warm-up and full training → (11) match; return to matches after two weeks of full training without pain. Daily-life steps chosen by the patient are added: sitting through a lesson or a gathering with breaks, full prayer positions, the squat toilet, and carrying shopping up the stairs.";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد بستّ جلسات (حتى ٣٠) إن بلغ مقياسٌ واحد على الأقلّ الفرقَ المهمّ (الألمُ نقطتين، أو كوجالا ١٠ — Crossley 2004) ولم تتحقّق معاييرُ الخروج، ولا علامةَ إحالة؛ ومن لم يبلغ أيّاً منهما لا يُمدَّد: يُراجَع التشخيصُ والالتزامُ مع طبيب المركز (القواعدُ في «موانع وإحالة»)، والبرنامجُ المنزليّ يستمرّ. وبعد الخروج: البرنامجُ المنزليّ حتى الأسبوع الثاني عشر، ومراجعتان في الأسبوعين السادس والثاني عشر — فالإرشادُ الهولنديّ يقيّم عندهما، ويعيد النظرَ في التشخيص إن لم يتحسّن بعد ١٢ أسبوعاً (Ophey 2025). ولا تجربةَ لدورةٍ ثانية أو ممدَّدة (بحثٌ صفريّ).";
const EXTEND_EN = "At session 24: one extension of six sessions (to 30) if at least one measure has reached the important change (pain by 2 points, or Kujala by 10 — Crossley 2004) without meeting the discharge criteria, and with no referral trigger; a patient who has reached neither is not extended: the diagnosis and adherence are reviewed with the centre's doctor (the rules under 'Contraindications and referral'), and the home programme continues. After discharge: the home programme to week 12, with reviews at weeks 6 and 12 — the Dutch guideline evaluates at those points and reconsiders the diagnosis if there is no improvement after 12 weeks (Ophey 2025). There is no trial of a second or extended course (a documented zero result).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "patellofemoral-pain-adult",
  summary: [
    "ألمُ الرضفة الفخذيّ (Patellofemoral pain): ألمٌ حول الرضفة أو خلفها يزيده نشاطٌ واحدٌ على الأقلّ يُحمِّل الرضفةَ والركبةُ مثنيّةٌ تحت الوزن — القرفصاءُ والدرجُ والجريُ والقفز — ومعه غالباً ألمُ الجلوس الطويل والركوع والقيامُ بعد الجلوس (Crossley 2016)؛ ويُشخَّص سريرياً بعد استبعاد غيره من أسباب ألم مقدّمة الركبة (Willy 2019). ومن له خلعٌ سابق أو إحساسٌ بانفلات الرضفة فحالةٌ أخرى (Crossley 2016). " +
    "وهو أشيعُ ألم الركبة عند الشباب: انتشارُه السنويّ ٢٢٫٧٪ في دراسةٍ سكّانية و٢٨٫٩٪ في دراسةٍ للمراهقين، وعند المراهقين ٧٫٢٪ في أيّ وقت (Smith 2018)، والنساءُ ضعفُ الرجال (Boling 2010)، وهو ربعُ مشاكل الركبة إلى خُمسَيها في عيادات إصابات الرياضة (Crossley 2016)؛ وفي السعودية ٩٪ و٣٠٫٣٪ في استبيانين (Aljuhani 2024 · Aldharman 2022)، ولا دراسةَ عراقيةَ للعلاج الطبيعيّ أو الانتشار (بحثٌ صفريّ). " +
    "وكثيراً ما يطول: ٤٠٪ لم يتعافوا جيداً بعد سنةٍ رغم العلاج، وينبئ بذلك ألمٌ أطولُ من شهرين وكوجالا أقلُّ من ٧٠ (Collins 2013)؛ و٥٧٪ بعد ٥–٨ سنوات وإن لم تظهر الخشونةُ في الأشعّة عند ٩٨٪ (Lankhorst 2016)؛ وعند المراهقين ٥٥٫٩٪ ما زال الألمُ بعد سنتين (Rathleff 2016). " +
    "الإرشادات: إرشادُ JOSPT للعلاج الطبيعيّ (Willy 2019): التمرينُ للورك والركبة معاً A — والوركُ الخلفيّ الجانبيّ يمكن أن يتقدّم في البداية — والعلاجُ المركّب A والتمرينُ ركنُه، والنعلُ الجاهز مع التمرين لمن تنبسط قدمُه أكثرَ من الطبيعيّ ستّةَ أسابيع A، والشريطُ المفصَّل مع التمرين حتى أربعة أسابيع B، وإعادةُ تعليم الجري C، وتثقيفُ المريض F؛ وضدّه: الإبرُ الجافّة A، والعلاجُ اليدويّ وحده A، والدعّاماتُ والأكمام B، والتغذيةُ الراجعة بالأجهزة B، والأجهزةُ الفيزيائية — الأمواجُ فوق الصوتية والتبريدُ والتحفيزُ الكهربائيّ والليزر — B. وإجماعا ٢٠١٦ و٢٠١٨ على مثله (Crossley 2016 · Collins 2018)؛ والإرشادُ الهولنديّ: تمرينٌ للفخذ والورك ستّةَ أسابيع إلى اثني عشر بإشرافٍ ولو جزئيّ، يُقيَّم في الأسبوعين ٦ و١٢، ولا حقن، والجراحةُ بعد ستّة أشهرٍ على الأقلّ (Ophey 2025)؛ ورابطةُ المدرّبين الرياضيّين الأمريكية: القرفصاءُ بين ٠ و٤٥° ومدُّ الركبة جالساً بين ٩٠ و٤٥° (C) (Bolgla 2018). " +
    "وفي التجارب: التمرينُ خفّض ألمَ النشاط ١٫٤٦ نقطةً من ١٠ عن عدمه، والوركُ مع الركبة ٢٫٢ عن الركبة وحدها (van der Heijden 2015)، وأوضحُ الأثر عند ثلاثة أشهر للتثقيف مع العلاج الحركيّ، والانتظارُ وحده يُتجنّب (Winters 2020)؛ وتسعُ جلساتٍ بإشرافٍ في ستّة أسابيع مع تمرينٍ يوميّ في البيت خفّضت الألمَ نقطةً عن الرعاية المعتادة حتى سنة (van Linschoten 2009)، والنعلُ الجاهز فاق الحشوةَ المسطّحة بعد ستّة أسابيع وساوى العلاجَ الطبيعيّ (Collins 2008)، ومنظارُ الركبة لم يُضف شيئاً إلى التمرين (Kettunen 2007). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ وتنظيمُ الحِمل وقاعدةُ الألم، وتقويةُ الورك والركبة المتدرّجة، وتعليمُ الحركة بالمرآة، والبرنامجُ المنزليّ — والنعلُ والشريطُ لمن يحتاجهما، والأجهزةُ مساعدة؛ وثلاثُ مراحل: تهدئةُ الركبة وإدارةُ الحِمل، ثمّ التقويةُ المتدرّجة، ثمّ الوظيفةُ والعودةُ إلى النشاط. " +
    "والعددُ ٢٤ جلسة بستٍّ في الأسبوع: التجاربُ ثلاثاً في الأسبوع أربعةَ أسابيع إلى ثمانية (١٢–٢٤ جلسة غالباً، والمدى ٣–٣٩) مع تمرينٍ يوميّ في البيت (van der Heijden 2015 · Ferber 2015)، والحجمُ الأكبر أفضل (Almeida 2025 · Østerås 2013)، ولا تجربةَ لخمسٍ أو ستٍّ في الأسبوع (بحثٌ صفريّ) — فهو اختيارُ خدمةٍ مكتوبٌ صريحاً: التقويةُ الثقيلة يوماً بعد يوم كما في التجارب، وأيّامٌ خفيفة بينها، فالألمُ تحسّن أقلَّ كلّما كثرت أيّامُ التدريب في الأسبوع (de Oliveira 2023).",
    "Patellofemoral pain: pain around or behind the kneecap aggravated by at least one activity that loads it on a flexed, weight-bearing knee — squatting, stairs, running and jumping — often with pain on prolonged sitting, kneeling and rising after sitting (Crossley 2016); it is diagnosed clinically after excluding other causes of anterior knee pain (Willy 2019). A history of dislocation or a sense of the kneecap slipping out is a different condition (Crossley 2016). " +
    "It is the commonest knee pain in young people: annual prevalence 22.7% in one population study and 28.9% in one adolescent study, with an adolescent point prevalence of 7.2% (Smith 2018); women are affected about twice as often as men (Boling 2010), and it accounts for a quarter to two-fifths of knee problems in sports-injury clinics (Crossley 2016); in Saudi Arabia 9% and 30.3% in two surveys (Aljuhani 2024 · Aldharman 2022), with no Iraqi physiotherapy or prevalence study (a documented zero result). " +
    "It often persists: 40% had not recovered well a year later despite treatment, predicted by pain for more than two months and a Kujala score below 70 (Collins 2013); 57% at 5–8 years, although 98% had no osteoarthritis on radiographs (Lankhorst 2016); and 55.9% of adolescents still had pain after two years (Rathleff 2016). " +
    "Guidelines: the JOSPT physiotherapy guideline (Willy 2019): combined hip and knee exercise A — the posterolateral hip may lead early on — combined interventions A with exercise as the critical component, prefabricated foot orthoses with exercise for greater-than-normal pronation for six weeks A, tailored taping with exercise for up to four weeks B, running gait retraining C, and patient education F; and against: dry needling A, manual therapy in isolation A, braces and sleeves B, biofeedback devices B, and biophysical agents — ultrasound, cryotherapy, electrical stimulation and laser — B. The consensus statements of 2016 and 2018 agree (Crossley 2016 · Collins 2018); the Dutch guideline: quadriceps and hip exercise for 6 to 12 weeks, at least partly supervised, evaluated at weeks 6 and 12, no injections, and surgery only after at least six months (Ophey 2025); and the US athletic trainers' statement: squats between 0 and 45° and seated knee extension between 90 and 45° (C) (Bolgla 2018). " +
    "In trials: exercise reduced activity pain by 1.46 points out of 10 compared with none, and hip plus knee by 2.2 points compared with knee alone (van der Heijden 2015); the clearest effect at three months was education combined with physical treatment, and wait-and-see should be avoided (Winters 2020); nine supervised sessions over six weeks with daily home exercise reduced pain by about a point compared with usual care up to a year (van Linschoten 2009), prefabricated orthoses beat flat inserts at six weeks and equalled physiotherapy (Collins 2008), and knee arthroscopy added nothing to exercise (Kettunen 2007). " +
    "So the protocol: a core in every session — education, load management and the pain rule, progressive hip and knee strengthening, movement retraining with a mirror, and the home programme — with orthoses and taping for those who need them and devices as adjuncts; three phases: calming the knee and managing load, then progressive strengthening, then function and return to activity. " +
    "The dose is 24 sessions at six a week: trials used three a week for four to eight weeks (usually 12–24 sessions, range 3–39) plus daily home exercise (van der Heijden 2015 · Ferber 2015), a larger volume did better (Almeida 2025 · Østerås 2013), and no trial tested five or six a week (a documented zero result) — so it is a service choice stated openly: the heavy strengthening every other day, as in trials, with lighter days in between, since pain improved less the more training days there were each week (de Oliveira 2023).",
  ],
  goals: [
    "• أسوأُ الألم والألمُ المعتاد في الأسبوع الأخير (من ١٠) ينقصان نقطتين فأكثر (الفرقُ المهمّ — Crossley 2004).\n" +
    "• مقياسُ كوجالا (من ١٠٠) يزيد ١٠ نقاط فأكثر، ويفضَّل ١٣ — فوق خطأ القياس (Crossley 2004 · Hott 2021).\n" +
    "• الأنشطةُ التي يختارها المريض بالعربية (السجودُ والجلوسُ للتشهّد، والدرج، والجلوسُ في الدرس، وكرةُ القدم) تتحسّن نقطتين فأكثر لكلٍّ منها (Alnahdi 2022).\n" +
    "• النزولُ الجانبيّ عن الدرجة بركبةٍ فوق القدم وحوضٍ مستوٍ وألمٍ ٢ من ١٠ أو أقلّ، وقوّةُ الورك والفخذ فوق حدود الإرشاد أو ٨٠٪ من الجهة الأخرى (Willy 2019).\n" +
    "• العودةُ إلى النشاط والرياضة بسلّم النشاط، والصلاةُ بأوضاعها كاملةً بلا ألمٍ يزيد.\n" +
    "• برنامجٌ منزليّ يؤدّيه وحده حتى الأسبوع الثاني عشر ثمّ يحافظ عليه.\n" +
    "• فهمُ الحالة: أنّ الألمَ ليس ضرراً، وأنّ التحميلَ المتدرّج هو العلاج، وقاعدةُ الألم.",
    "• Worst and usual pain over the past week (out of 10) down 2 points or more (the important change — Crossley 2004).\n" +
    "• The Kujala scale (out of 100) up 10 points or more, ideally 13 — beyond measurement error (Crossley 2004 · Hott 2021).\n" +
    "• The activities the patient chooses, in Arabic (prostration and sitting for tashahhud, stairs, sitting through a lesson, football), each up 2 points or more (Alnahdi 2022).\n" +
    "• Lateral step-down with the knee over the foot, a level pelvis and pain of 2/10 or less, and hip and thigh strength above the guideline cut-offs or 80% of the other side (Willy 2019).\n" +
    "• Return to activity and sport through the activity ladder, and prayer in its full positions without rising pain.\n" +
    "• A home programme done independently to week 12 and then maintained.\n" +
    "• Understanding of the condition: hurt is not harm, graded loading is the treatment, and the pain rule.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج (نحو ٦٠ دقيقة):\n" +
    "• التاريخ: مكانُ الألم (حول الرضفة أو خلفها، أم أسفلها أو على حدبة الساق)، وما يزيده (القرفصاءُ والدرجُ والجلوسُ الطويل والركوعُ والسجود)، وكيف بدأ وما تغيّر من الحِمل، ومدّتُه (أطولُ من شهرين ينبئ ببطء التعافي — Collins 2013)، والخلعُ أو الانفلات، والإصابةُ والتورّمُ والانحباس، والرياضةُ والجري.\n" +
    "• التشخيص: ألمُ القرفصاء أحسنُ الاختبارات — حسّاسيتُه ٩١٪ وغيابُه ينفي غالباً (Cook 2010)، والركوعُ ٨٤٪، والجلوسُ الطويل والدرج؛ وألمُ النزول عن الدرج مع ألم الجلوس الطويل معاً يرجّحانه بقوّة (نسبةُ أرجحية ١٩٫٥ — Mostafaee 2024)؛ واختبارُ ضغط الرضفة وحكّها ضعيف فلا يُعتمد (Cook 2010).\n" +
    "• ما يجب نفيُه: قاعدةُ أوتاوا بعد الإصابة (Kazemi 2023)؛ وفحصُ الورك عند كلّ مراهق — العرجُ وألمُ الأربية أو الفخذ ونقصُ التدوير الداخليّ ⟵ انزلاقُ رأس الفخذ (Peck 2017)؛ والخلعُ والانفلات (Crossley 2016)؛ وألمُ أسفل الرضفة أو حدبة الساق — اعتلالُ الوتر أو التهابُ الغضروف النامي (Ophey 2025 · van Leeuwen 2022)؛ والطقطقةُ والتيبّسُ فوق الأربعين — خشونةُ الرضفة (Collins 2019).\n" +
    "• التهيّج (Willy 2019): ألمٌ شبهُ دائم فوق ٥ من ١٠ = عالٍ ⟵ تخفيفُ الحِمل أوّلاً (الشريط)؛ متقطّعٌ تحت ٣ = منخفض ⟵ تقويةٌ بالوزن مباشرة.\n" +
    "• الضعفُ والحركة (حدودُ الإرشاد — Willy 2019): قوّةُ مبعدات الورك بمقياس اليد أقلُّ من ٣٧٪ من وزن الجسم للرجال و٣٠٪ للنساء، ومادّاتُ الركبة أقلُّ من ٤٤٪ و٣٧٪ (Piva 2006 لثباتها)؛ والنزولُ الجانبيّ عن الدرجة والقرفصاءُ على ساق — انهيارُ الركبة إلى الداخل؛ وطولُ الفخذ الأماميّ (أقلُّ من ١٣٤°) وخلفِ الفخذ وبطنِ الساق؛ ومؤشّرُ وضع القدم فوق ٦ أو فرقُ عرض منتصف القدم فوق ١١ ملم (انبساطُ القدم)؛ وميلُ الرضفة.\n" +
    "• العدّاؤون: عددُ الخطوات في الدقيقة وطريقةُ الهبوط بالفيديو للتعليم لا للقياس.\n" +
    "• المقاييس: كوجالا بالعربية (المقياسُ المزروع — النسخةُ السعودية: ثباتٌ ٠٫٩٦ — Alshehri 2017؛ والأردنية: ٠٫٩٤٨ — Hamdan 2019؛ ونسخةٌ أردنية فيها بندُ «السجود» — Haddad 2021)؛ وأسوأُ الألم والمعتادُ من ١٠ (Alghadir 2016)؛ والأنشطةُ التي يختارها المريض بالعربية (Alnahdi 2022)؛ والنزولُ عن الدرجة: زاويةُ الثني بلا ألم أو العددُ في ٣٠ ثانية (Ophey 2019 · Østerås 2013)؛ والخوفُ من الحركة عند الحاجة (Rethman 2023).\n" +
    "• يُعاد التقييمُ كاملاً في الجلسات ٦ و١٦ و٢٤ (و٣٠ إن مُدّد) وفي الأسبوعين ٦ و١٢، وقاعدةُ الألم وأسئلةُ الإحالة في كلّ جلسة.",
    "At the first session, before any treatment (about 60 minutes):\n" +
    "• History: where the pain is (around or behind the kneecap, or below it or on the tibial tubercle), what aggravates it (squatting, stairs, prolonged sitting, kneeling and prostration), how it began and what load changed, its duration (over two months predicts slower recovery — Collins 2013), dislocation or giving way, injury, swelling and locking, and sport and running.\n" +
    "• Diagnosis: pain on squatting is the best test — sensitivity 91%, so its absence usually rules the condition out (Cook 2010), kneeling 84%, and prolonged sitting and stairs; pain on descending stairs together with pain on prolonged sitting strongly favours it (likelihood ratio 19.5 — Mostafaee 2024); the patellar compression (grind) test is weak and is not relied on (Cook 2010).\n" +
    "• What must be ruled out: the Ottawa rule after injury (Kazemi 2023); and a hip examination in every adolescent — a limp, groin or thigh pain and reduced internal rotation → a slipped capital femoral epiphysis (Peck 2017); dislocation and instability (Crossley 2016); pain below the kneecap or on the tibial tubercle — tendinopathy or apophysitis (Ophey 2025 · van Leeuwen 2022); and crepitus and stiffness over 40 — patellofemoral osteoarthritis (Collins 2019).\n" +
    "• Irritability (Willy 2019): near-constant pain above 5/10 = high → reduce the load first (taping); intermittent below 3 = low → weight-bearing strengthening straight away.\n" +
    "• Impairments (the guideline cut-offs — Willy 2019): hip abductor strength by handheld dynamometer below 37% of body weight in men and 30% in women, and knee extensors below 44% and 37% (Piva 2006 for reliability); lateral step-down and single-leg squat — the knee collapsing inwards; the length of the quadriceps (below 134°), hamstrings and calf; a foot posture index above 6 or a midfoot width difference above 11 mm (pronation); and patellar tilt.\n" +
    "• Runners: steps per minute and the landing pattern on video, for teaching rather than measurement.\n" +
    "• Measures: the Arabic Kujala (the seeded measure — Saudi version reliability 0.96 — Alshehri 2017; Jordanian 0.948 — Hamdan 2019; and a Jordanian version with a 'prostration' item — Haddad 2021); worst and usual pain out of 10 (Alghadir 2016); the Arabic patient-specific activities (Alnahdi 2022); step-down: the pain-free flexion angle or the count in 30 seconds (Ophey 2019 · Østerås 2013); and fear of movement when relevant (Rethman 2023).\n" +
    "• The full assessment is repeated at sessions 6, 16 and 24 (and 30 if extended) and at weeks 6 and 12, with the pain rule and the referral questions at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• التثقيفُ وتنظيمُ الحِمل أوّلاً وفي كلّ جلسة: الألمُ شائعٌ وليس ضرراً ويتحسّن بالتحميل المتدرّج، وقاعدةُ الألم، وسلّمُ النشاط؛ والتثقيفُ وحده أضعفُ من التمرين، ومعه أقوى (Winters 2020 · Esculier 2018).\n" +
    "• الورك: الصدفةُ ورفعُ الساق جانباً في البداية، ثمّ التبعيدُ والتدويرُ إلى الخارج واقفاً بالمطّاط، والجسرُ والجسرُ الجانبيّ — ٣ × ١٠ بثقلٍ تتعب به في آخر ثلاثة تكرارات (Ferber 2015 · Fukuda 2010)؛ ويمكن أن يتقدّم الوركُ في الأسابيع الأولى (Willy 2019).\n" +
    "• الركبة بمداها الآمن أوّلاً (Powers 2014 · Bolgla 2018): القرفصاءُ وضغطُ الساقين بين ٠ و٤٥°، ومدُّ الركبة جالساً بين ٩٠ و٤٥°، ثمّ أعمقُ بقاعدة الألم؛ والثباتُ على الحائط ١٠ × ٣٠ ثانية يومياً لمن ألمُه عالٍ (Rathleff 2020)؛ ثمّ صعودُ الدرجة والنزولُ الجانبيّ عنها والطعنةُ والقرفصاءُ على ساق — حتى ٩٠° في آخر البرنامج (Ferber 2015).\n" +
    "• الحِمل: ٣ × ١٠ بثقلٍ لا يُرفع أكثرَ من ١٠ مرّات (نحو ٧٠٪ من الأقصى — Constantinou 2022)، في أيّام التقوية الثلاثة يوماً بعد يوم؛ والحجمُ الأكبر أفضل (Almeida 2025 · Østerås 2013).\n" +
    "• تعليمُ الحركة بالمرآة والكلام: الركبةُ فوق الإصبع الثاني والحوضُ مستوٍ في كلّ تمرين بالوزن — أكثرُ ما غيّر حركةَ الركبة (Nunes 2023)، لا علاجاً منفصلاً بالأجهزة (Willy 2019).\n" +
    "• التمطيطُ لمن قصرت عضلاتُه: الفخذُ الأماميّ وخلفُه وبطنُ الساق (Lee 2021 · Willy 2019)؛ وتحريكُ الرضفة باليد لمن شدّت الأربطةُ الجانبية — داخلَ العلاج المركّب لا وحده (Willy 2019).\n" +
    "• القدمُ القصيرة لمن تنبسط قدمُه (Kamel 2024)، والدراجةُ للإحماء وأوّلِ درجات السلّم والمقعدُ عالٍ (اقتراح — لا دراسة).\n" +
    "• العدّاؤون: تنظيمُ حِمل الجري أوّلاً، ثمّ زيادةُ الخطوات ٥–١٠٪ (Bramah 2019 · Petri 2026).\n" +
    "• البرنامجُ المنزليّ: يومياً — مجموعتان إلى أربع من عشرة تكراراتٍ فأكثر نحو ١٥–٢٥ دقيقة (van Linschoten 2009 · Ferber 2015)، حتى الأسبوع الثاني عشر.\n" +
    PAIN_RULE_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Education and load management first and at every session: the pain is common, not harmful, and improves with graded loading; the pain rule and the activity ladder; education alone is weaker than exercise and stronger with it (Winters 2020 · Esculier 2018).\n" +
    "• The hip: clamshell and side-lying abduction early, then standing band abduction and external rotation, the bridge and the side plank — 3 × 10 with a load that tires you in the last three repetitions (Ferber 2015 · Fukuda 2010); the hip may lead in the first weeks (Willy 2019).\n" +
    "• The knee in its safe range first (Powers 2014 · Bolgla 2018): squats and leg press between 0 and 45°, seated knee extension between 90 and 45°, then deeper by the pain rule; wall holds 10 × 30 seconds daily when irritability is high (Rathleff 2020); then step-ups, lateral step-downs, lunges and single-leg squats — down to 90° by the end of the programme (Ferber 2015).\n" +
    "• Load: 3 × 10 with a weight that can be lifted no more than 10 times (about 70% of maximum — Constantinou 2022), on three strengthening days every other day; a larger volume did better (Almeida 2025 · Østerås 2013).\n" +
    "• Movement retraining with a mirror and verbal cues: knee over the second toe and pelvis level in every weight-bearing exercise — what changed knee movement the most (Nunes 2023), not a separate device treatment (Willy 2019).\n" +
    "• Stretching for those who are tight: the quadriceps, hamstrings and calf (Lee 2021 · Willy 2019); patellar mobilisation for those with a tight lateral retinaculum — within combined care, never alone (Willy 2019).\n" +
    "• Short-foot exercise for a pronated foot (Kamel 2024), and the bike for warm-up and the first ladder steps with a high saddle (a suggestion — no study).\n" +
    "• Runners: running-load management first, then 5–10% more steps per minute (Bramah 2019 · Petri 2026).\n" +
    "• The home programme: daily — two to four sets of ten or more repetitions, about 15–25 minutes (van Linschoten 2009 · Ferber 2015), to week 12.\n" +
    PAIN_RULE_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: هل تورّمت الركبة أو انحبست أو انفلتت، وهل في الليل ألم، وعند المراهق: هل يعرج أو يؤلمه الوركُ أو الفخذ — فإحالةُ الإرشاد مستمرّةٌ طوالَ العلاج (Willy 2019).\n" +
    "• إحالةٌ في اليوم نفسِه: إصابةٌ ومعها علاماتُ قاعدة أوتاوا — لا يحمل الوزن، أو ألمُ رأس الشظية أو الرضفة، أو لا يثني ٩٠° — للأشعّة (حسّاسيتُها ٩٨٪ — Kazemi 2023)؛ وركبةٌ حارّة متورّمة حمراء أو حمّى — التهابٌ صديديّ محتمل (Kuwabara 2021)؛ وانحباسٌ حقيقيّ لا تُمدّ معه الركبة، أو تورّمٌ دمويّ سريع بعد التواء (قاعدةٌ سريرية)؛ ومراهقٌ لا يحمل الوزن فجأةً مع ألم الورك أو الفخذ أو الركبة (Peck 2017).\n" +
    "• إحالةٌ خلال أيّام: مراهقٌ بألم الركبة أو أسفل الفخذ ومعه عرجٌ أو ألمٌ في الورك أو الأربية أو تدويرٌ داخليّ مؤلمٌ محدود ⟵ صورةُ الوركين (انزلاقُ رأس الفخذ — Peck 2017)؛ فمَن جاء بألم الركبة انتظر صورةَ الورك نحو ٩٨ يوماً مقابل ٧ (Momtaz 2025)، و١٥–٢٣٪ منهم يأتون بألم الركبة أو الفخذ وحده (Matava 1999)؛ وألمٌ ليليّ أو في الراحة لا يتبع الحِمل أو كتلةٌ أو نقصُ وزن — ورمٌ محتمل (Yoshida 2021)؛ وخلعٌ حديث أو انفلاتٌ متكرّر — رأيُ العظام (Crossley 2016 · Bolgla 2018).\n" +
    "• مراجعةُ الطبيب: تورّمٌ أو أعراضٌ ميكانيكية أو ألمٌ على خطّ المفصل بعد التواء (الغضروفُ الهلاليّ والأربطة)؛ وألمٌ على حدبة الساق أو أسفل الرضفة عند المراهق (Osgood–Schlatter وSinding-Larsen–Johansson — van Leeuwen 2022 · Wilczynski 2024) أو عند البالغ (اعتلالُ الوتر — Ophey 2025): تشخيصٌ آخر وبروتوكولٌ آخر؛ وفوق الأربعين مع طقطقةٍ وتيبّس — خشونةُ الرضفة (Collins 2019)؛ والخوفُ الشديد من الحركة أو الاكتئاب (Maclachlan 2017).\n" +
    "• قواعدُ هذا البروتوكول (اقتراحٌ مبنيٌّ على الإرشاد الهولنديّ — Ophey 2025): في الأسبوع السادس بلا تغيّرٍ مهمّ ⟵ يُضاف النعلُ أو الشريط إن لم يُستعملا ويُعاد فحصُ التشخيص والالتزام؛ وفي الأسبوع الثاني عشر بلا تحسّن ⟵ يُعاد النظرُ في التشخيص مع الطبيب؛ وبعد ستّة أشهرٍ من علاجٍ مناسب والأعراضُ معطِّلة ⟵ رأيُ جرّاح العظام بالصور — ومنظارُ الركبة لم يُضف إلى التمرين شيئاً (فرقٌ ١٫١ نقطة في كوجالا وكلفةٌ أعلى — Kettunen 2007)، وتحريرُ الرباط الجانبيّ المفتوح أحدث عدمَ ثباتٍ داخليّاً في ٤ من ٤٠ في أربيل (Hamawandi 2022).\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): المسكّناتُ ومضادّاتُ الالتهاب أثرُها محدودٌ قصير (Heintjes 2004)، والإرشادُ الهولنديّ: الباراسيتامول أوّلاً للألم الشديد وحده ثمّ المرهمُ الموضعيّ، ولا تُعالَج بالحقن (Ophey 2025).\n" +
    "موانعُ الأجهزة والشريط: منظّمُ ضربات القلب والورمُ والجلدُ المجروح أو ضعيفُ الإحساس للتحفيز والتيكار والمغناطيس والحرارة؛ والحساسيةُ من اللاصق للشريط.",
    "Before every session: has the knee swollen, locked or given way, is there night pain, and in adolescents: is there a limp or pain in the hip or thigh — the guideline's referral screen continues throughout treatment (Willy 2019).\n" +
    "• Same-day referral: injury with Ottawa-rule signs — unable to bear weight, tenderness of the fibular head or kneecap, or unable to bend to 90° — for an X-ray (sensitivity 98% — Kazemi 2023); a hot, swollen, red knee or fever — possible septic arthritis (Kuwabara 2021); true locking with the knee unable to straighten, or rapid bloody swelling after a twist (a clinical rule); and an adolescent suddenly unable to bear weight with hip, thigh or knee pain (Peck 2017).\n" +
    "• Referral within days: an adolescent with knee or lower-thigh pain plus a limp, hip or groin pain, or painful restricted internal rotation → hip X-rays (slipped capital femoral epiphysis — Peck 2017); those presenting with knee pain waited about 98 days for hip imaging versus 7 (Momtaz 2025), and 15–23% present with knee or thigh pain alone (Matava 1999); night or rest pain unrelated to load, a mass or weight loss — a possible tumour (Yoshida 2021); and a recent dislocation or repeated giving way — an orthopaedic opinion (Crossley 2016 · Bolgla 2018).\n" +
    "• A medical review: swelling, mechanical symptoms or joint-line pain after a twist (meniscus and ligaments); pain on the tibial tubercle or below the kneecap in an adolescent (Osgood–Schlatter and Sinding-Larsen–Johansson — van Leeuwen 2022 · Wilczynski 2024) or in an adult (tendinopathy — Ophey 2025): a different diagnosis and protocol; over 40 with crepitus and stiffness — patellofemoral osteoarthritis (Collins 2019); and marked fear of movement or depression (Maclachlan 2017).\n" +
    "• This protocol's rules (a suggestion built on the Dutch guideline — Ophey 2025): at week 6 with no important change → add orthoses or taping if not yet used and re-check the diagnosis and adherence; at week 12 with no improvement → reconsider the diagnosis with the doctor; after six months of appropriate care with disabling symptoms → an orthopaedic opinion with imaging — and knee arthroscopy added nothing to exercise (a 1.1-point Kujala difference at a higher cost — Kettunen 2007), while open lateral release caused medial instability in 4 of 40 in Erbil (Hamawandi 2022).\n" +
    "• What the patient is told (the doctor's decision): painkillers and anti-inflammatories have a limited, short effect (Heintjes 2004), and the Dutch guideline: paracetamol first for severe pain only, then a topical gel, and no injections (Ophey 2025).\n" +
    "Contraindications to devices and taping: a pacemaker, tumour, broken skin or reduced sensation for stimulation, Tecar, magnetic therapy and heat; and adhesive allergy for taping.",
  ],
  precautions: [
    "• قاعدةُ الألم وسلّمُ النشاط في «التمارين» لكلّ المراحل؛ والتقويةُ الثقيلة يوماً بعد يوم، وأيّامُ ما بينها للتنشيط والتعليم بالمرآة والتوازن والتمطيط والشريط والتثقيف.\n" +
    "• المدى: القرفصاءُ وضغطُ الساقين ٠–٤٥° ومدُّ الركبة جالساً ٩٠–٤٥° في البداية — فالحِملُ على الرضفة أعلى في غيرها (Powers 2014)؛ ثمّ أعمقُ بقاعدة الألم.\n" +
    "• النعلُ الجاهز: لمن تنبسط قدمُه (مؤشّرُ وضع القدم فوق ٦ أو فرقُ عرض منتصفها فوق ١١ ملم) مع التمرين ستّةَ أسابيع (Willy 2019)، فاق الحشوةَ المسطّحة (Collins 2008)، وأيُّ نعلٍ جاهزٍ مريح يكفي ولا فضلَ للمصنوع على المقاس (Willy 2019)؛ ولا تؤكّد التجاربُ مَن يستفيد منه أكثر (Vicenzino 2010 · Matthews 2020)؛ والإرشادُ الهولنديّ يؤخّره إلى ما بعد ستّة أسابيع بلا تغيّر (Ophey 2025) — كُتب الخلاف.\n" +
    "• الشريط: المفصَّلُ مع التمرين حتى أربعة أسابيع إن خفّف الألمَ ٥٠٪ (Willy 2019 · Rathleff 2018)، وتفاعلاتُ الجلد شائعة (Collins 2008)؛ والدعّاماتُ والأكمام لا تُوصف (Willy 2019 · Smith 2015).\n" +
    "• تقييدُ الدم أثناء التمرين (BFR) — ليس من أجهزة المركز: إن توفّر جهازٌ معايَر، فلمن يؤلمه مدُّ الركبة بالمقاومة: ٣٠٪ من الأقصى بضغط ٧٠–٨٠٪ من ضغط الإغلاق (Constantinou 2022 · Kong 2025)، ولا لمن عنده ضغطٌ أو أمراضُ قلبٍ أو أوعية أو خثرةٌ سابقة أو حمل (Constantinou 2022).\n" +
    "• المراهقون: فحصُ الورك كلَّ مرّة، وحضورُ أحد الوالدين، وسلّمُ النشاط — نجح عند ٨٦٪ في ١٢ أسبوعاً و٨١٪ في سنة (Rathleff 2019)، والتمرينُ المنتظم في المدرسة ثلاثاً في الأسبوع زاد التعافي (Rathleff 2015)؛ ونحو نصفهم يبقى ألمُه سنة (Holden 2021).\n" +
    "• الحذاء: لا وصفةَ خاصّة — حذاءٌ مريح مرن، ومَن أراد الحذاءَ الخفيف للجري يتحوّل تدريجياً (Esculier 2020 · Kayll 2026).\n" +
    "• الوزن: ليس سبباً لبدء الألم (Neal 2019) لكنّ الوزنَ الزائد اقترن ببقائه (Kastelein 2015) — والتثقيفُ في إدارته عند الحاجة (Willy 2019).\n" +
    "• الصلاةُ والجلوسُ على الأرض: لا دراسةَ لهما (بحثٌ صفريّ)؛ والسجودُ صار بنداً في كوجالا الأردنية (Haddad 2021)، وألمُ الجلوس يثور غالباً عند ثنيٍ ٩٠° فأكثر (Ophey 2024)، والركوعُ على الركبة اختبارٌ حسّاس (Cook 2010). فاقتراح: يصلّي كعادته إن بقي الألمُ ٢ من ١٠ أو أقلّ وهدأ صباحاً؛ وإلّا مؤقّتاً: اليدان على الأرض والوزنُ للأمام في النزول للسجود والقيام منه، ووسادةٌ صلبة للجلوس بين السجدتين والتشهّد تقلّل الثني، والكرسيُّ أيّاماً حين يشتدّ — ثمّ يعود إلى الأوضاع كاملةً مع سلّم النشاط، فالصلاةُ على الكرسيّ طويلاً اقترنت بتراجع وظيفة الركبة في الخشونة (Ateef 2021)؛ والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• المرحاضُ العربيّ والدرجُ والجلوسُ الطويل (اقتراح): مرحاضٌ جالسٌ أو مقبضٌ للاستناد في أيّام التهيّج؛ والدرجُ صعوداً بالساق السليمة ونزولاً بالمتألّمة حتى يتدرّب على النزول؛ وقطعُ الجلوس الطويل (الدرسُ والمجلسُ والسيارة) كلَّ ٢٠–٣٠ دقيقة بمدّ الركبة أو مشيٍ قصير.\n" +
    "• الخوفُ من الحركة والقلق يرتبطان بالوظيفة أكثرَ من الألم (Rethman 2023) — يُسألان ويُعالجان بالتثقيف والتحميل المتدرّج.",
    "• The pain rule and the activity ladder under 'Exercises' for every phase; the heavy strengthening every other day, with the days between for activation, mirror retraining, balance, stretching, taping and education.\n" +
    "• Range: squats and leg press 0–45° and seated knee extension 90–45° at first — the load on the kneecap is higher outside them (Powers 2014); then deeper by the pain rule.\n" +
    "• Prefabricated foot orthoses: for a pronated foot (foot posture index above 6 or a midfoot width difference above 11 mm) together with exercise for six weeks (Willy 2019); they beat flat inserts (Collins 2008), any comfortable prefabricated orthosis will do with no advantage for custom-made (Willy 2019), and trials do not confirm who benefits most (Vicenzino 2010 · Matthews 2020); the Dutch guideline delays them until six weeks without change (Ophey 2025) — the disagreement is recorded.\n" +
    "• Taping: tailored taping with exercise for up to four weeks if it cuts pain by 50% (Willy 2019 · Rathleff 2018), with skin reactions common (Collins 2008); braces and sleeves are not prescribed (Willy 2019 · Smith 2015).\n" +
    "• Blood-flow restriction (BFR) — not one of the centre's devices: if a calibrated device is available, for those whose resisted knee extension is painful: 30% of maximum at 70–80% of limb occlusion pressure (Constantinou 2022 · Kong 2025), and not with high blood pressure, heart or vascular disease, a previous clot, or pregnancy (Constantinou 2022).\n" +
    "• Adolescents: a hip examination every time, a parent present, and the activity ladder — successful in 86% at 12 weeks and 81% at a year (Rathleff 2019), with regular school-based exercise three times a week increasing recovery (Rathleff 2015); about half still have pain after a year (Holden 2021).\n" +
    "• Footwear: no special prescription — comfortable, flexible shoes, and a gradual change for those who want minimalist running shoes (Esculier 2020 · Kayll 2026).\n" +
    "• Weight: not a cause of the pain starting (Neal 2019), but excess weight was associated with it persisting (Kastelein 2015) — with education on managing it when appropriate (Willy 2019).\n" +
    "• Prayer and floor sitting: no study of either (a documented zero result); prostration has become an item of the Jordanian Kujala (Haddad 2021), sitting pain usually starts at 90° of knee bend or more (Ophey 2024), and kneeling is a sensitive test (Cook 2010). So a suggestion: pray as usual if pain stays at 2/10 or less and settles by the morning; otherwise temporarily: hands on the floor with the weight forward going down into and up from prostration, a firm cushion when sitting between prostrations and for tashahhud to reduce the bend, and a chair for a few days when it flares — then back to the full positions with the activity ladder, as long-term chair prayer was associated with declining knee function in osteoarthritis (Ateef 2021); the religious ruling is for the patient and their scholar.\n" +
    "• The squat toilet, stairs and prolonged sitting (a suggestion): a sitting toilet or a grab rail on irritable days; stairs up with the good leg and down with the painful one until step-down training takes over; and breaking prolonged sitting (lessons, gatherings, the car) every 20–30 minutes with knee straightening or a short walk.\n" +
    "• Fear of movement and anxiety relate to function more than to pain (Rethman 2023) — they are asked about and addressed with education and graded loading.",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "Patellofemoral Pain: Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability and Health From the Academy of Orthopaedic Physical Therapy of the American Physical Therapy Association", org: "J Orthop Sports Phys Ther — APTA Academy of Orthopaedic Physical Therapy guideline (Willy et al.)", year: 2019, url: "https://doi.org/10.2519/jospt.2019.0302" },
    { title: "2016 Patellofemoral pain consensus statement from the 4th International Patellofemoral Pain Research Retreat, Manchester. Part 1: Terminology, definitions, clinical examination, natural history, patellofemoral osteoarthritis and patient-reported outcome measures", org: "Br J Sports Med — 2016 international consensus, Manchester, part 1 (Crossley et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2016-096384" },
    { title: "2016 Patellofemoral pain consensus statement from the 4th International Patellofemoral Pain Research Retreat, Manchester. Part 2: recommended physical interventions (exercise, taping, bracing, foot orthoses and combined interventions)", org: "Br J Sports Med — 2016 international consensus, Manchester, part 2 (Crossley et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2016-096268" },
    { title: "2018 Consensus statement on exercise therapy and physical interventions (orthoses, taping and manual therapy) to treat patellofemoral pain: recommendations from the 5th International Patellofemoral Pain Research Retreat, Gold Coast, Australia, 2017", org: "Br J Sports Med — 2018 international consensus, Gold Coast (Collins et al.)", year: 2018, url: "https://doi.org/10.1136/bjsports-2018-099397" },
    { title: "Dutch multidisciplinary guideline on anterior knee pain: Patellofemoral pain and patellar tendinopathy", org: "Knee Surg Sports Traumatol Arthrosc — Dutch multidisciplinary guideline (Ophey et al.)", year: 2025, url: "https://doi.org/10.1002/ksa.12367" },
    { title: "National Athletic Trainers' Association Position Statement: Management of Individuals With Patellofemoral Pain", org: "J Athl Train — National Athletic Trainers' Association position statement (Bolgla et al.)", year: 2018, url: "https://doi.org/10.4085/1062-6050-231-15" },
    { title: "Incidence and prevalence of patellofemoral pain: A systematic review and meta-analysis", org: "PLoS One (Smith et al.)", year: 2018, url: "https://doi.org/10.1371/journal.pone.0190892" },
    { title: "Gender differences in the incidence and prevalence of patellofemoral pain syndrome", org: "Scand J Med Sci Sports (Boling et al.)", year: 2010, url: "https://doi.org/10.1111/j.1600-0838.2009.00996.x" },
    { title: "Prevalence of Patellofemoral Pain Among Adults in Saudi Arabia", org: "Cureus (Aljuhani et al.)", year: 2024, url: "https://doi.org/10.7759/cureus.74818" },
    { title: "Prevalence of Patellofemoral Pain and Knee Pain in the General Population of Saudi Arabia", org: "Cureus (Aldharman et al.)", year: 2022, url: "https://doi.org/10.7759/cureus.30355" },
    { title: "Prognostic factors for patellofemoral pain: a multicentre observational analysis", org: "Br J Sports Med (Collins et al.)", year: 2013, url: "https://doi.org/10.1136/bjsports-2012-091696" },
    { title: "Factors that predict a poor outcome 5-8 years after the diagnosis of patellofemoral pain: a multicentre observational analysis", org: "Br J Sports Med (Lankhorst et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2015-094664" },
    { title: "Is Knee Pain During Adolescence a Self-limiting Condition? Prognosis of Patellofemoral Pain and Other Types of Knee Pain", org: "Am J Sports Med (Rathleff et al.)", year: 2016, url: "https://doi.org/10.1177/0363546515622456" },
    { title: "Exercise for treating patellofemoral pain syndrome", org: "Cochrane Database Syst Rev (van der Heijden et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd010387.pub2" },
    { title: "Comparative effectiveness of treatments for patellofemoral pain: a living systematic review with network meta-analysis", org: "Br J Sports Med (Winters et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2020-102819" },
    { title: "Supervised exercise therapy versus usual care for patellofemoral pain syndrome: an open label randomised controlled trial", org: "BMJ (van Linschoten et al.)", year: 2009, url: "https://doi.org/10.1136/bmj.b4074" },
    { title: "Foot orthoses and physiotherapy in the treatment of patellofemoral pain syndrome: randomised clinical trial", org: "BMJ (Collins et al.)", year: 2008, url: "https://doi.org/10.1136/bmj.a1735" },
    { title: "Knee arthroscopy and exercise versus exercise only for chronic patellofemoral pain syndrome: a randomized controlled trial", org: "BMC Med (Kettunen et al.)", year: 2007, url: "https://doi.org/10.1186/1741-7015-5-38" },
    { title: "Strengthening of the hip and core versus knee muscles for the treatment of patellofemoral pain: a multicenter randomized controlled trial", org: "J Athl Train (Ferber et al.)", year: 2015, url: "https://doi.org/10.4085/1062-6050-49.3.70" },
    { title: "Effect of Equalized and Nonequalized Resistance Training Volumes on Pain and Disability in Patients With Patellofemoral Pain: A Systematic Review With Meta-Analyses", org: "J Orthop Sports Phys Ther (Almeida et al.)", year: 2025, url: "https://doi.org/10.2519/jospt.2025.13062" },
    { title: "Dose-response effects of medical exercise therapy in patients with patellofemoral pain syndrome: a randomised controlled clinical trial", org: "Physiotherapy (Østerås et al.)", year: 2013, url: "https://doi.org/10.1016/j.physio.2012.05.009" },
    { title: "Dose-response effect of lower limb resistance training volume on pain and function of women with patellofemoral pain: A systematic review and meta-regression", org: "Phys Ther Sport (de Oliveira et al.)", year: 2023, url: "https://doi.org/10.1016/j.ptsp.2023.07.006" },
    { title: "Analysis of outcome measures for persons with patellofemoral pain: which are reliable and valid?", org: "Arch Phys Med Rehabil (Crossley et al.)", year: 2004, url: "https://doi.org/10.1016/s0003-9993(03)00613-0" },
    { title: "The reliability, validity, interpretability, and responsiveness of the Norwegian version of the Anterior Knee Pain Scale in patellofemoral pain", org: "Disabil Rehabil (Hott et al.)", year: 2021, url: "https://doi.org/10.1080/09638288.2019.1671499" },
    { title: "Cross-cultural adaptation and measurement properties of the Arabic version of the Patient-Specific Functional Scale in patients with lower extremity musculoskeletal disorders", org: "Disabil Rehabil (Alnahdi et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1880651" },
    { title: "Diagnostic accuracy and association to disability of clinical test findings associated with patellofemoral pain syndrome", org: "Physiother Can (Cook et al.)", year: 2010, url: "https://doi.org/10.3138/physio.62.1.17" },
    { title: "Examining the diagnostic accuracy of common physical examination and functional tests in the diagnosis of patellofemoral pain syndrome among patients with anterior knee pain", org: "Physiother Theory Pract (Mostafaee et al.)", year: 2024, url: "https://doi.org/10.1080/09593985.2022.2158053" },
    { title: "Diagnostic Accuracy of Ottawa Knee Rule for Diagnosis of Fracture in Patients with Knee Trauma; a Systematic Review and Meta-analysis", org: "Arch Acad Emerg Med (Kazemi et al.)", year: 2023, url: "https://doi.org/10.22037/aaem.v11i1.1934" },
    { title: "Slipped Capital Femoral Epiphysis: Diagnosis and Management", org: "Am Fam Physician (Peck et al.)", year: 2017, url: "https://pubmed.ncbi.nlm.nih.gov/28671425/" },
    { title: "Incidence and management of Osgood-Schlatter disease in general practice: retrospective cohort study", org: "Br J Gen Pract (van Leeuwen et al.)", year: 2022, url: "https://doi.org/10.3399/bjgp.2021.0386" },
    { title: "Prevalence of Radiographic and Magnetic Resonance Imaging Features of Patellofemoral Osteoarthritis in Young and Middle-Aged Adults With Persistent Patellofemoral Pain", org: "Arthritis Care Res (Hoboken) (Collins et al.)", year: 2019, url: "https://doi.org/10.1002/acr.23726" },
    { title: "Reliability of measures of impairments associated with patellofemoral pain syndrome", org: "BMC Musculoskelet Disord (Piva et al.)", year: 2006, url: "https://doi.org/10.1186/1471-2474-7-33" },
    { title: "Cross-Cultural Adaptation and Psychometric Properties Testing of the Arabic Anterior Knee Pain Scale", org: "Med Sci Monit (Alshehri et al.)", year: 2017, url: "https://doi.org/10.12659/msm.901264" },
    { title: "Validation of the Arabic version of the Kujala patellofemoral pain scoring system", org: "J Orthop Sci (Hamdan et al.)", year: 2019, url: "https://doi.org/10.1016/j.jos.2018.09.008" },
    { title: "Validation of the cultural adaptation of the Kujala score in Arabic", org: "J Orthop Surg Res (Haddad et al.)", year: 2021, url: "https://doi.org/10.1186/s13018-021-02489-0" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "The decline step-down test measuring the maximum pain-free flexion angle: A reliable and valid performance test in patients with patellofemoral pain", org: "Phys Ther Sport (Ophey et al.)", year: 2019, url: "https://doi.org/10.1016/j.ptsp.2018.12.007" },
    { title: "Kinesiophobia Is Associated With Poor Function and Modifiable Through Interventions in People With Patellofemoral Pain: A Systematic Review With Individual Participant Data Correlation Meta-Analysis", org: "Phys Ther (Rethman et al.)", year: 2023, url: "https://doi.org/10.1093/ptj/pzad074" },
    { title: "Is combining gait retraining or an exercise programme with education better than education alone in treating runners with patellofemoral pain?A randomised clinical trial", org: "Br J Sports Med (Esculier et al.)", year: 2018, url: "https://doi.org/10.1136/bjsports-2016-096988" },
    { title: "Short-term effects of hip abductors and lateral rotators strengthening in females with patellofemoral pain syndrome: a randomized controlled clinical trial", org: "J Orthop Sports Phys Ther (Fukuda et al.)", year: 2010, url: "https://doi.org/10.2519/jospt.2010.3246" },
    { title: "Patellofemoral joint stress during weight-bearing and non-weight-bearing quadriceps exercises", org: "J Orthop Sports Phys Ther (Powers et al.)", year: 2014, url: "https://doi.org/10.2519/jospt.2014.4936" },
    { title: "Activity Modification and Knee Strengthening for Osgood-Schlatter Disease: A Prospective Cohort Study", org: "Orthop J Sports Med (Rathleff et al.)", year: 2020, url: "https://doi.org/10.1177/2325967120911106" },
    { title: "Comparing hip and knee focused exercises versus hip and knee focused exercises with the use of blood flow restriction training in adults with patellofemoral pain", org: "Eur J Phys Rehabil Med (Constantinou et al.)", year: 2022, url: "https://doi.org/10.23736/s1973-9087.22.06691-6" },
    { title: "Effectiveness of Interventions Aimed at Changing Movement Patterns in People With Patellofemoral Pain: A Systematic Review With Network Meta-analysis", org: "J Orthop Sports Phys Ther (Nunes et al.)", year: 2023, url: "https://doi.org/10.2519/jospt.2023.11956" },
    { title: "Static and Dynamic Quadriceps Stretching Exercises in Patients With Patellofemoral Pain: A Randomized Controlled Trial", org: "Sports Health (Lee et al.)", year: 2021, url: "https://doi.org/10.1177/1941738121993777" },
    { title: "Effect of adding short foot exercise to hip and knee focused exercises in treatment of patients with patellofemoral pain syndrome: a randomized controlled trial", org: "J Orthop Surg Res (Kamel et al.)", year: 2024, url: "https://doi.org/10.1186/s13018-024-04688-x" },
    { title: "A 10% Increase in Step Rate Improves Running Kinematics and Clinical Outcomes in Runners With Patellofemoral Pain at 4 Weeks and 3 Months", org: "Am J Sports Med (Bramah et al.)", year: 2019, url: "https://doi.org/10.1177/0363546519879693" },
    { title: "Gait Retraining for Patellofemoral Pain in Runners: An Umbrella Review of Clinical and Biomechanical Evidence", org: "Sports Med Open (Petri et al.)", year: 2026, url: "https://doi.org/10.1186/s40798-026-01051-8" },
    { title: "Exercise therapy, patient education, and patellar taping in the treatment of adolescents with patellofemoral pain: a prospective pilot study with 6 months follow-up", org: "Pilot Feasibility Stud (Rathleff et al.)", year: 2018, url: "https://doi.org/10.1186/s40814-017-0227-7" },
    { title: "Effects of Radiofrequency Diathermy Plus Therapeutic Exercises on Pain and Functionality of Patients with Patellofemoral Pain Syndrome: A Randomized Controlled Trial", org: "J Clin Med (Albornoz-Cabello et al.)", year: 2023, url: "https://doi.org/10.3390/jcm12062348" },
    { title: "Narrative: Review of Anterior Knee Pain Differential Diagnosis (Other than Patellofemoral Pain)", org: "Curr Rev Musculoskelet Med (Kuwabara et al.)", year: 2021, url: "https://doi.org/10.1007/s12178-021-09704-9" },
    { title: "Impact of Hip Versus Knee Pain as the Presenting Symptom of Slipped Capital Femoral Epiphysis on Time to Imaging, Surgery, and Complications", org: "J Pediatr Orthop (Momtaz et al.)", year: 2025, url: "https://doi.org/10.1097/bpo.0000000000003016" },
    { title: "Knee pain as the initial symptom of slipped capital femoral epiphysis: an analysis of initial presentation and treatment", org: "J Pediatr Orthop (Matava et al.)", year: 1999, url: "https://doi.org/10.1097/00004694-199907000-00007" },
    { title: "Delay in diagnosis of primary osteosarcoma of bone in children: Have we improved in the last 15 years and what is the impact of delay on diagnosis?", org: "J Bone Oncol (Yoshida et al.)", year: 2021, url: "https://doi.org/10.1016/j.jbo.2021.100359" },
    { title: "Sinding-Larsen-Johansson disease. Clinical features, imaging findings, conservative treatments and research perspectives: a scoping review", org: "PeerJ (Wilczyński et al.)", year: 2024, url: "https://doi.org/10.7717/peerj.17996" },
    { title: "The psychological features of patellofemoral pain: a systematic review", org: "Br J Sports Med (Maclachlan et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-096705" },
    { title: "Open versus arthroscopic release for lateral patellar compression syndrome: a randomized-controlled trial", org: "Arch Orthop Trauma Surg (Hamawandi et al.)", year: 2022, url: "https://doi.org/10.1007/s00402-021-03878-0" },
    { title: "Pharmacotherapy for patellofemoral pain syndrome", org: "Cochrane Database Syst Rev (Heintjes et al.)", year: 2004, url: "https://doi.org/10.1002/14651858.cd003470.pub2" },
    { title: "A clinical prediction rule for identifying patients with patellofemoral pain who are likely to benefit from foot orthoses: a preliminary determination", org: "Br J Sports Med (Vicenzino et al.)", year: 2010, url: "https://doi.org/10.1136/bjsm.2008.052613" },
    { title: "Does foot mobility affect the outcome in the management of patellofemoral pain with foot orthoses versus hip exercises? A randomised clinical trial", org: "Br J Sports Med (Matthews et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2019-100935" },
    { title: "Knee orthoses for treating patellofemoral pain syndrome", org: "Cochrane Database Syst Rev (Smith et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd010513.pub2" },
    { title: "Comparing the Impact of Intermittent Blood Flow Restriction Training and High-Load Resistance Training in Individuals With Patellofemoral Pain: A Randomized Controlled Trial", org: "Arch Phys Med Rehabil (Kong et al.)", year: 2025, url: "https://doi.org/10.1016/j.apmr.2025.06.003" },
    { title: "Activity Modification and Load Management of Adolescents With Patellofemoral Pain: A Prospective Intervention Study Including 151 Adolescents", org: "Am J Sports Med (Rathleff et al.)", year: 2019, url: "https://doi.org/10.1177/0363546519843915" },
    { title: "Exercise during school hours when added to patient education improves outcome for 2 years in adolescent patellofemoral pain: a cluster randomised trial", org: "Br J Sports Med (Rathleff et al.)", year: 2015, url: "https://doi.org/10.1136/bjsports-2014-093929" },
    { title: "Prognostic factors for adolescent knee pain: an individual participant data meta-analysis of 1281 patients", org: "Pain (Holden et al.)", year: 2021, url: "https://doi.org/10.1097/j.pain.0000000000002184" },
    { title: "A Contemporary Approach to Patellofemoral Pain in Runners", org: "J Athl Train (Esculier et al.)", year: 2020, url: "https://doi.org/10.4085/1062-6050-0535.19" },
    { title: "The Effect of Minimalist Versus Motion Control Shoes on Patellofemoral Joint Forces in Adolescents With Patellofemoral Pain During Running: A Randomized Crossover Study", org: "Am J Sports Med (Kayll et al.)", year: 2026, url: "https://doi.org/10.1177/03635465261443316" },
    { title: "Risk factors for patellofemoral pain: a systematic review and meta-analysis", org: "Br J Sports Med (Neal et al.)", year: 2019, url: "https://doi.org/10.1136/bjsports-2017-098890" },
    { title: "The 6-year trajectory of non-traumatic knee symptoms (including patellofemoral pain) in adolescents and young adults in general practice: a study of clinical predictors", org: "Br J Sports Med (Kastelein et al.)", year: 2015, url: "https://doi.org/10.1136/bjsports-2014-093557" },
    { title: "Pain during prolonged sitting in subjects with patellofemoral pain in Dutch physical therapy clinics: an online questionnaire-based analysis", org: "BMJ Open (Ophey et al.)", year: 2024, url: "https://doi.org/10.1136/bmjopen-2024-086958" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "J Relig Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "The effect of adding neuromuscular electrical stimulation to exercise therapy on patellofemoral pain: A systematic review and meta-analysis", org: "PLoS One (Zheng et al.)", year: 2025, url: "https://doi.org/10.1371/journal.pone.0326785" },
    { title: "Neuromuscular electrical stimulation (NMES) for patellofemoral pain syndrome", org: "Cochrane Database Syst Rev (Martimbianco et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.cd011289.pub2" },
    { title: "The effectiveness of neuromuscular electrical stimulation on pain, function, and quadriceps muscle strength in adults with patellofemoral pain: A systematic review and meta-analysis", org: "BMC Musculoskelet Disord (Abdelhamed et al.)", year: 2025, url: "https://doi.org/10.1186/s12891-025-09029-5" },
    { title: "Electrical Stimulation Therapies for Active Duty Military with Patellofemoral Pain Syndrome: A Randomized Trial", org: "Mil Med (Talbot et al.)", year: 2020, url: "https://doi.org/10.1093/milmed/usaa037" },
    { title: "Monopolar dielectric diathermy by emission of radiofrequency in Patellofemoral pain. A single-blind-randomized clinical trial", org: "Electromagn Biol Med (Albornoz-Cabello et al.)", year: 2020, url: "https://doi.org/10.1080/15368378.2020.1793169" },
    { title: "Non-Invasive Radiofrequency Diathermy Neuromodulation Added to Supervised Therapeutic Exercise in Patellofemoral Pain Syndrome: A Single Blind Randomized Controlled Trial with Six Months of Follow-Up", org: "Biomedicines (Albornoz-Cabello et al.)", year: 2024, url: "https://doi.org/10.3390/biomedicines12040850" },
    { title: "Are adjunct treatments effective in improving pain and function when added to exercise therapy in people with patellofemoral pain? A systematic review with meta-analysis and appraisal of the quality of interventions", org: "Br J Sports Med (Souto et al.)", year: 2024, url: "https://doi.org/10.1136/bjsports-2024-108145" },
    { title: "Is there a role of pulsed electromagnetic fields in management of patellofemoral pain syndrome? Randomized controlled study at one year follow-up", org: "Bioelectromagnetics (Servodio Iammarrone et al.)", year: 2016, url: "https://doi.org/10.1002/bem.21953" },
    { title: "Would integrating monochromatic infrared energy into the physical rehabilitation of adolescents with patellofemoral pain syndrome have any advantageous effects? A randomized controlled trial", org: "J Rehabil Med (Alrawaili et al.)", year: 2025, url: "https://doi.org/10.2340/jrm.v57.42169" },
    { title: "The Effectiveness of Photobiomodulation Therapy on Pain and Function in Patients with Patellofemoral Pain Syndrome-A Systematic Review and Meta-Analysis", org: "J Clin Med (Alayat et al.)", year: 2025, url: "https://doi.org/10.3390/jcm15010020" },
    { title: "Effectiveness of Inclusion of Dry Needling in a Multimodal Therapy Program for Patellofemoral Pain: A Randomized Parallel-Group Trial", org: "J Orthop Sports Phys Ther (Espí-López et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.7389" },
    { title: "SHORT-TERM EFFECTS OF TRIGGER POINT DRY NEEDLING ON PAIN AND DISABILITY IN SUBJECTS WITH PATELLOFEMORAL PAIN SYNDROME", org: "Int J Sports Phys Ther (Sutlive et al.)", year: 2018, url: "https://doi.org/10.26603/ijspt20180462" },
    { title: "The effectiveness of dry needling in patellofemoral pain syndrome patients: A systematic review and meta-analysis", org: "J Bodyw Mov Ther (Rashnavadi et al.)", year: 2025, url: "https://doi.org/10.1016/j.jbmt.2025.06.008" },
    { title: "Therapeutic ultrasound for treating patellofemoral pain syndrome", org: "Cochrane Database Syst Rev (Brosseau et al.)", year: 2001, url: "https://doi.org/10.1002/14651858.cd003375" },
    { title: "Contribution of Shockwave Therapy in the Functional Rehabilitation Program of Patients with Patellofemoral Pain Syndrome", org: "J Clin Med (Neculăeș et al.)", year: 2024, url: "https://doi.org/10.3390/jcm13237260" },
    { title: "The 'Best Practice Guide to Conservative Management of Patellofemoral Pain': incorporating level 1 evidence with expert clinical reasoning", org: "Br J Sports Med (Barton et al.)", year: 2015, url: "https://doi.org/10.1136/bjsports-2014-093637" },
    { title: "Intrarater Reliability of Functional Performance Tests for Subjects With Patellofemoral Pain Syndrome", org: "J Athl Train (Loudon et al.)", year: 2002, url: "https://pubmed.ncbi.nlm.nih.gov/12937582/" },
    { title: "Strength around the hip and flexibility of soft tissues in individuals with and without patellofemoral pain syndrome", org: "J Orthop Sports Phys Ther (Piva et al.)", year: 2005, url: "https://doi.org/10.2519/jospt.2005.35.12.793" },
    { title: "Increasing running step rate reduces patellofemoral joint forces", org: "Med Sci Sports Exerc (Lenhart et al.)", year: 2014, url: "https://doi.org/10.1249/mss.0b013e3182a78c3a" },
    { title: "Patellar taping for patellofemoral pain: a systematic review and meta-analysis to evaluate clinical outcomes and biomechanical mechanisms", org: "Br J Sports Med (Barton et al.)", year: 2014, url: "https://doi.org/10.1136/bjsports-2013-092437" },
    { title: "Efficacy on pain and knee function of Kinesio taping among patients with patellofemoral pain syndrome: a systematic review and meta-analysis", org: "BMC Musculoskelet Disord (Jiao et al.)", year: 2025, url: "https://doi.org/10.1186/s12891-025-08627-7" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — أيّامُ التقوية الثلاثة يوماً بعد يوم (إحماءٌ على الدراجة ٥–١٠ دقائق، ثمّ الورك والركبة ٣ × ١٠ بثقلٍ يُرفع عشرَ مرّات، وراحةُ ٣٠–٦٠ ثانية)، والأيّامُ الخفيفة بينها (التنشيطُ والثبات، والتعليمُ بالمرآة، والتوازن، والتمطيطُ والرضفة، والشريط، والتثقيفُ ومراجعةُ البرنامج المنزليّ).",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — three strengthening days every other day (a 5–10-minute warm-up on the bike, then hip and knee work at 3 × 10 with a load that can be lifted ten times, with 30–60 seconds' rest), and light days in between (activation and holds, mirror retraining, balance, stretching and the kneecap, taping, and education with a review of the home programme)."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ للورك والركبة معاً A، والعلاجُ المركّب A والتمرينُ ركنُه (Willy 2019)؛ وخفّض ألمَ النشاط ١٫٤٦ نقطة، والوركُ مع الركبة ٢٫٢ عن الركبة وحدها (van der Heijden 2015)؛ والعلاجُ اليدويّ داخله لا وحده (A ضدّه وحده). والدراجةُ من التمرين هنا — للإحماء وأوّل درجات السلّم. ولا حدثَ خطيراً في التجارب.",
        "Core in every session — combined hip and knee exercise A, and combined interventions A with exercise as the critical component (Willy 2019); it reduced activity pain by 1.46 points, and hip plus knee by 2.2 points more than knee alone (van der Heijden 2015); manual therapy within it, never alone (A against alone). Cycling is part of exercise here — for warm-up and the first ladder steps. There were no serious adverse events in trials."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "NMES (quadriceps) · TENS for pain", frequencyHz: "35–50 (NMES) · 80–100 (TENS)", pulseWidthUs: "200–400 (NMES) · 100–200 (TENS)", intensity: "Max tolerated contraction (NMES) · Sensory (TENS)", onOff: "10 s / 20–30 s (NMES)", durationMin: "15–20" },
      parameters: ["تحفيزٌ عضليّ (NMES) على الفخذ — والقطبُ على العضلة المتّسعة الإنسية — بأقوى انقباضٍ يتحمّله، أثناءَ شدّ الفخذ أو الثبات على الحائط، لمن يعجز عن تنشيط عضلة الفخذ أو يؤلمه مدُّها بالمقاومة: ٣٥–٥٠ هرتز و٢٠٠–٤٠٠ ميكروثانية، ١٥–٢٠ دقيقة، أكثرَ من أربعة أسابيع إن استُعمل (التجاربُ ٢٠–٧٥ هرتز و٦٥–٤٠٠ ميكروثانية — Zheng 2025)؛ أو تحفيزٌ عبر الجلد (TENS) حسّيّ قبل التمرين لتهدئة الألم وحدها — ويُقال للمريض إنّه يسكّن ولا يعالج.",
        "Neuromuscular stimulation (NMES) of the quadriceps — the electrode over vastus medialis — at the strongest tolerated contraction, during quadriceps setting or wall holds, for those who cannot activate the quadriceps or whose resisted extension is painful: 35–50 Hz and 200–400 µs, 15–20 minutes, for more than four weeks if used (trials: 20–75 Hz and 65–400 µs — Zheng 2025); or sensory TENS before exercise for pain relief only — the patient is told it relieves but does not treat."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والإرشادُ ضدّه: لا يُستعمل التحفيزُ الكهربائيّ ضمن الأجهزة الفيزيائية B (Willy 2019)، و«لا يُوصى بها» في الإجماع (Crossley 2016)؛ وفي التجارب أضاف التحفيزُ العضليّ إلى التمرين تخفيفاً صغيراً بيقينٍ منخفضٍ جداً (Martimbianco 2017)، ٠٫٣٧ نقطة في الألم و٤٫٧٦ في كوجالا، ولا أثرَ في الألم في أربعة أسابيع أو أقلّ (Zheng 2025 · Abdelhamed 2025)؛ والتحفيزُ عبر الجلد مع التمرين المنزليّ لم يخفّف الألمَ أكثر (Talbot 2020). فلا يُعطى وحده ولا بدلَ التمرين — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو على جلدٍ ضعيف الإحساس.",
        "Rotating adjunct by the centre's rule (Saleem) — and the guideline is against it: electrical stimulation is among the biophysical agents not to be used, B (Willy 2019), and 'not recommended' in the consensus (Crossley 2016); in trials NMES added a small reduction to exercise with very low certainty (Martimbianco 2017), 0.37 points for pain and 4.76 for Kujala, with no pain effect at four weeks or less (Zheng 2025 · Abdelhamed 2025); and TENS with home exercise did not reduce pain further (Talbot 2020). So never alone and never instead of exercise — and an item for Saleem. Contraindicated with a pacemaker or over skin with poor sensation."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 12,
      params: { mode: "CAP (monopolar dielectric), athermic → mild warmth", powerPct: "Low (trial: 640 kHz pulsed, 30 V)", durationMin: "10–12" },
      parameters: ["على مقدّمة الركبة في الاستلقاء والركبةُ ممدودة، بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف، قبل التمرين: ١٠–١٢ دقيقة — والتجاربُ جهازٌ أحاديّ القطب ٦٤٠ كيلوهرتز نبضيّ و٣٠ فولت ١٢ دقيقة عشرَ جلساتٍ في ثلاثة أسابيع قبل تمرينٍ يوميّ لا يتجاوز ألمُه ٣ من ١٠ (Albornoz-Cabello 2023).",
        "Over the front of the knee lying with the knee straight, at low athermic-to-mildly-warm intensity, before exercise: 10–12 minutes — the trials used a monopolar device at 640 kHz pulsed and 30 V for 12 minutes, ten sessions over three weeks before daily exercise kept below 3/10 pain (Albornoz-Cabello 2023)."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والدليلُ من مجموعةٍ واحدة: ثلاثُ تجاربَ إسبانية خفّضت الألمَ أكثرَ من التمرين وحده (Albornoz-Cabello 2020 · Albornoz-Cabello 2023 · Albornoz-Cabello 2024)، وفي التحليل الجامع أثرٌ كبير بيقينٍ منخفضٍ جداً (Souto 2024)، ولم تُكرَّر خارجها؛ والإرشادُ ضدّ الأجهزة الفيزيائية (Willy 2019). ممنوعٌ مع منظّم ضربات القلب والورم والخثرة والحمل والحمّى والجرح الملتهب (Albornoz-Cabello 2023).",
        "Rotating adjunct by the centre's rule (Saleem) — the evidence comes from one group: three Spanish trials reduced pain more than exercise alone (Albornoz-Cabello 2020 · Albornoz-Cabello 2023 · Albornoz-Cabello 2024), the meta-analysis shows a large effect with very low certainty (Souto 2024), and it has not been replicated elsewhere; the guideline is against biophysical agents (Willy 2019). Contraindicated with a pacemaker, tumour, thrombosis, pregnancy, fever or an infected wound (Albornoz-Cabello 2023)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الركبة قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز، وإعداداتُه يكتبها المشرفُ من الجهاز.",
        "Pulsed electromagnetic field (PEMF) over the knee before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم)، والدليلُ تجربةٌ صغيرة واحدة: ٣١ مريضاً بالتمرين المنزليّ مع المجال المغناطيسيّ أو بدونه، والفرقُ ظهر بعد ستّة أشهر (Servodio Iammarrone 2016) — ولم تُقرأ إعداداتُها. ممنوعٌ مع منظّم ضربات القلب والحمل.",
        "Rotating adjunct by the centre's rule (Saleem), with one small trial as evidence: 31 patients doing home exercise with or without PEMF, with a difference from six months (Servodio Iammarrone 2016) — its settings could not be read. Contraindicated with a pacemaker or pregnancy."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["على الفخذ ومقدّمة الركبة في الاستلقاء، قبل التمارين لتسهيلها لا بدلها؛ ويُفحص الإحساسُ أوّلاً.", "Over the thigh and the front of the knee lying down, before exercise to ease it, never instead of it; check sensation first."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: لا تجربةَ للحرارة السطحية في ألم الرضفة (بحثٌ صفريّ)، والتبريدُ ضمن الأجهزة التي لا تُستعمل B (Willy 2019)؛ والثلجُ لنوبة الألم في البيت وحدها.",
        "Rotating adjunct — for comfort before exercise: there is no trial of superficial heat in patellofemoral pain (a documented zero result), and cryotherapy is among the agents not to be used, B (Willy 2019); ice is for a flare-up at home only."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها: على مقدّمة الركبة والفخذ، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the front of the knee and thigh, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: التجربةُ الوحيدة كانت بجهاز أشعّةٍ أحاديّ الطول الموجيّ ٨٩٠ نانومتر ٤٠ دقيقة ثلاثاً في الأسبوع عند مراهقين (Alrawaili 2025) — لا بمصباح الأشعّة المعتاد؛ والإرشادُ ضدّ الأجهزة الفيزيائية (Willy 2019). لا يُعطى وحده.",
        "Rotating adjunct — comfortable warmth only: the only trial used a monochromatic 890 nm infrared device for 40 minutes three times a week in adolescents (Alrawaili 2025) — not the usual infrared lamp; the guideline is against biophysical agents (Willy 2019). Never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم حتى يقرّر سليم — الإرشادُ ضدّ الليزر العلاجيّ B (Willy 2019)، وتحليلاتٌ جامعة تميل إلى تخفيف الألم بيقينٍ منخفضٍ جداً (Alayat 2025)؛ فإن أراده سليم: ٨١٠ نانومتر و٦ جول لكلّ سم² حول الرضفة مع التمرين دائماً (Alayat 2025).",
        "Not used until Saleem decides — the guideline is against therapeutic laser, B (Willy 2019), and meta-analyses lean towards pain relief with very low certainty (Alayat 2025); if Saleem wants it: 810 nm and 6 J/cm² around the kneecap, always with exercise (Alayat 2025)."] },
    { code: "needle", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الإرشادُ: «لا يُستعمل» الوخزُ بالإبر الجافّة لألم الرضفة A (Willy 2019)؛ ولم تُضف ثلاثُ جلساتٍ أسبوعية إلى العلاج اليدويّ والتمرين (Espí-López 2017)، ولا جلسةٌ واحدة على الوهميّ (Sutlive 2018)؛ وتحليلٌ جامع إيجابيّ بتباينٍ عالٍ (Rashnavadi 2025) — بندٌ لسليم.",
        "Not used — the guideline: dry needling should not be used for patellofemoral pain, A (Willy 2019); three weekly sessions added nothing to manual therapy and exercise (Espí-López 2017), nor did one session over sham (Sutlive 2018); one positive meta-analysis has high heterogeneity (Rashnavadi 2025) — an item for Saleem."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لم يُضف شيئاً إلى تدليك الثلج (Brosseau 2001)، والإرشادُ ضدّه B (Willy 2019)، و«محدودُ الفعالية» عند المدرّبين الرياضيّين (Bolgla 2018).",
        "Not used — it added nothing to ice massage (Brosseau 2001), the guideline is against it, B (Willy 2019), and it has 'limited effectiveness' for athletic trainers (Bolgla 2018)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — تجربةٌ أوّلية واحدة سلّطت الموجاتِ على أوتار الرضفة والفخذ (Neculăeș 2024)، أي على اعتلال الوتر لا ألمِ الرضفة؛ ولا إرشادَ يذكرها.",
        "Not used — a single pilot trial aimed the waves at the patellar and quadriceps tendons (Neculăeș 2024), that is at tendinopathy rather than patellofemoral pain; no guideline mentions it."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا سبب (بحثٌ صفريّ).", "Not used — no trial and no rationale (a documented zero result)."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للشمع في ألم الرضفة (بحثٌ صفريّ).", "Not used — there is no trial of paraffin in patellofemoral pain (a documented zero result)."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — مريضُ ألم الرضفة يمشي طبيعياً، ولا تجربة (بحثٌ صفريّ).", "Not used — patients with patellofemoral pain walk normally, and there is no trial (a documented zero result)."] },
  ],
  phases: [
    {
      name: ["تهدئة الركبة وإدارة الحِمل", "Calming the knee and managing load"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (الأسبوعُ الأوّل)", "The first six sessions (the first week)"],
      goals: [
        "أسوأُ الألم أو المعتادُ ينقص نقطتين، أو يصير الألمُ متقطّعاً تحت ٣ من ١٠؛ والثباتُ على الحائط حتى ٤٥° والجسرُ ٣ × ١٠ بألمٍ ٢ من ١٠ أو أقلّ؛ والبرنامجُ المنزليّ يؤدّيه وحده؛ وفهمُ الحالة وقاعدةِ الألم وسلّمِ النشاط.",
        "Worst or usual pain down 2 points, or the pain becoming intermittent below 3/10; wall holds to 45° and the bridge at 3 × 10 with pain of 2/10 or less; the home programme done independently; and understanding of the condition, the pain rule and the activity ladder.",
      ],
      education: [
        "• ما هي الحالة: حِملٌ على الرضفة أكثرُ ممّا تتحمّله الآن، لا تلفٌ فيها — والألمُ شائعٌ ويتحسّن بالتحميل المتدرّج (Willy 2019).\n" +
        "• المسار: يتحسّن أكثرُهم في أشهر، لكنّ ٤٠٪ يبقى ألمُهم سنة بلا علاجٍ كافٍ (Collins 2013) — فالالتزامُ بالبرنامج هو الفارق.\n" +
        "• قاعدةُ الألم وسلّمُ النشاط: الألمُ حتى ٢ من ١٠ مقبول، وصباحُ اليوم التالي هو الحَكَم (Rathleff 2020).\n" +
        "• تخفيفُ ما يثير الألمَ مؤقّتاً لا تركُ الحركة: الجلوسُ الطويل بفترات، والدرجُ بالساق السليمة، والسجودُ باليدين.\n" +
        "• لا حلولَ سلبية: لا دعّامة، والجهازُ يسكّن ولا يعالج (Barton 2015).",
        "• What the condition is: more load on the kneecap than it can take for now, not damage — the pain is common and improves with graded loading (Willy 2019).\n" +
        "• The course: most improve within months, but 40% still have pain a year later without adequate care (Collins 2013) — so sticking with the programme is what makes the difference.\n" +
        "• The pain rule and the activity ladder: pain up to 2/10 is acceptable, and the next morning is the judge (Rathleff 2020).\n" +
        "• Temporarily easing what provokes the pain, not stopping movement: breaking up prolonged sitting, stairs led by the good leg, and prostration supported by the hands.\n" +
        "• No passive fixes: no brace, and devices relieve rather than treat (Barton 2015).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين يتحقّق الأوّلُ والثاني:\n" +
        "• أسوأُ الألم أو المعتادُ نقص نقطتين فأكثر (Crossley 2004)، أو صار الألمُ متقطّعاً تحت ٣ من ١٠ (Willy 2019).\n" +
        "• الثباتُ على الحائط حتى ٤٥° والجسرُ ٣ × ١٠ بألمٍ ٢ من ١٠ أو أقلّ، والبرنامجُ المنزليّ يؤدّيه صحيحاً وحده.\n" +
        "(اقتراحٌ يجمع الفرقَ المهمّ وتصنيفَ التهيّج، لا معيارٌ مجرَّب.) ومن جاء بتهيّجٍ منخفض ينتقل بعد الجلسة الثالثة إن أتقن البرنامج.",
        "Progress to phase 2 when the first and second are met:\n" +
        "• Worst or usual pain down 2 points or more (Crossley 2004), or the pain has become intermittent below 3/10 (Willy 2019).\n" +
        "• Wall holds to 45° and the bridge at 3 × 10 with pain of 2/10 or less, and the home programme done correctly and independently.\n" +
        "(A proposal combining the important change and the irritability classification, not a tested criterion.) A patient who arrives with low irritability moves on after session 3 once the programme is mastered.",
      ],
      notes: [
        "• الوركُ يتقدّم في البداية (Willy 2019): الصدفةُ ورفعُ الساق جانباً ٣ × ١٠ ⟵ ٣ × ٢٠ ثمّ ثقلٌ على الكاحل (Kamel 2024).\n" +
        "• الركبةُ بلا ألم: شدُّ الفخذ ورفعُ الساق مستقيمة، والثباتُ على الحائط بالزاوية التي لا تؤلم ١٠ × ٣٠ ثانية يومياً لمن تهيّجُه عالٍ (Rathleff 2020)، ومدُّ الركبة جالساً بين ٩٠ و٤٥° وحدها (Powers 2014).\n" +
        "• الشريطُ المفصَّل إن خفّف ألمَ القرفصاء ٥٠٪ — ليصير التمرينُ بلا ألم (Rathleff 2018)؛ وتحريكُ الرضفة باليد لمن شدّت أربطتُها الجانبية.\n" +
        "• النعلُ الجاهز لمن تنبسط قدمُه، والقدمُ القصيرة (Kamel 2024).\n" +
        "• الدراجةُ الخفيفة والمقعدُ عالٍ للإحماء.\n" +
        "• الأجهزةُ المساعدة للراحة قبل التمرين لا بدله.",
        "• The hip leads at first (Willy 2019): clamshell and side-lying abduction 3 × 10 → 3 × 20, then an ankle weight (Kamel 2024).\n" +
        "• The knee without pain: quadriceps setting and the straight-leg raise, wall holds at the pain-free angle 10 × 30 seconds daily for those with high irritability (Rathleff 2020), and seated knee extension between 90 and 45° only (Powers 2014).\n" +
        "• Tailored taping if it cuts squat pain by 50% — so exercise can be done without pain (Rathleff 2018); and patellar mobilisation for those with a tight lateral retinaculum.\n" +
        "• Prefabricated orthoses for a pronated foot, and the short-foot exercise (Kamel 2024).\n" +
        "• Light cycling with a high saddle for warm-up.\n" +
        "• Adjunct devices for comfort before exercise, never instead of it.",
      ],
      exercises: [
        { code: "wall-squat", sets: 1, reps: 5, hold: 30, rest: 30,
          note: ["ثباتٌ بالزاوية التي لا تؤلم (٠–٤٥°) بدل الصعود والنزول، حتى ١٠ × ٣٠ ثانية يومياً في البيت لمن تهيّجُه عالٍ (Rathleff 2020).",
            "A hold at the pain-free angle (0–45°) instead of going up and down, up to 10 × 30 seconds daily at home for those with high irritability (Rathleff 2020)."] },
        { code: "quad-set", sets: 3, reps: 10, hold: 5 },
        { code: "straight-leg-raise", sets: 3, reps: 10 },
        { code: "seated-knee-extension", sets: 3, reps: 10,
          note: ["بين ٩٠ و٤٥° وحدها — فالحِملُ على الرضفة أعلى قربَ الاستقامة (Powers 2014).", "Between 90 and 45° only — the load on the kneecap is higher near full extension (Powers 2014)."] },
        { code: "glute-bridge", sets: 3, reps: 10, hold: 3, rest: 45 },
        { code: "clamshell", sets: 3, reps: 10,
          note: ["٣ × ١٠ ⟵ ٣ × ٢٠ ثمّ مطّاطٌ حول الركبتين (Kamel 2024).", "3 × 10 → 3 × 20, then a band around the knees (Kamel 2024)."] },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10,
          note: ["٣ × ١٠ ⟵ ٣ × ٢٠ ثمّ ثقلٌ على الكاحل (Kamel 2024).", "3 × 10 → 3 × 20, then an ankle weight (Kamel 2024)."] },
        { code: "stationary-cycling",
          doseNote: ["٥–١٠ دقائق بجهدٍ خفيف والمقعدُ عالٍ (ثنيٌ أقلّ للركبة — اقتراح) — للإحماء وأوّل درجات السلّم.", "5–10 minutes at light effort with a high saddle (less knee bend — a suggestion) — for warm-up and the first ladder steps."] },
        { code: "patellar-taping-mcconnell",
          note: ["لمن تهيّجُه عالٍ أو يؤلمه التمرين: يُبقى فقط إن خفّف ألمَ القرفصاء ٥٠٪ فأكثر (Rathleff 2018).", "For high irritability or painful exercise: kept only if it cuts squat pain by 50% or more (Rathleff 2018)."] },
        { code: "patellar-self-mobilisation",
          note: ["لمن شدّت أربطتُه الجانبية (ميلُ الرضفة) — داخلَ البرنامج لا وحده (Willy 2019).", "For those with a tight lateral retinaculum (patellar tilt) — within the programme, never alone (Willy 2019)."] },
        { code: "quadriceps-stretch-standing", sets: 1, reps: 3, hold: 30, rest: 15,
          note: ["لمن ثنيُ ركبته منبطحاً أقلُّ من ١٣٤°، أو منبطحاً بحزامٍ إن آلمه الوقوف.", "For those whose prone knee flexion is below 134°, or lying face down with a strap if standing hurts."] },
        { code: "calf-stretch-standing", sets: 1, reps: 3, hold: 30,
          note: ["لمن نقص ثنيُ كاحله؛ ثلاثَ مرّاتٍ دقيقةً في التجارب (Albornoz-Cabello 2023).", "For those with limited ankle dorsiflexion; three times one minute in trials (Albornoz-Cabello 2023)."] },
        { code: "short-foot", sets: 3, reps: 15, hold: 5,
          note: ["لمن تنبسط قدمُه: جالساً ثمّ واقفاً على الساقين ثمّ على ساق (Kamel 2024).", "For a pronated foot: sitting, then standing on both legs, then on one (Kamel 2024)."] },
      ],
    },
    {
      name: ["تقوية الورك والركبة المتدرّجة", "Progressive hip and knee strengthening"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["الجلسات ٧–١٦ (الأسبوعان الثاني والثالث تقريباً)", "Sessions 7–16 (roughly weeks 2 and 3)"],
      goals: [
        "كوجالا يزيد ١٠ نقاط؛ والتقويةُ ٣ × ١٠ بثقلٍ يُرفع عشرَ مرّات للورك والركبة؛ والنزولُ الجانبيّ عن درجةٍ ١٥ سم بركبةٍ فوق القدم وحوضٍ مستوٍ وألمٍ ٢ من ١٠ أو أقلّ؛ وسلّمُ النشاط حتى الدرجة الخامسة لمن يريد الرياضة.",
        "Kujala up 10 points; strengthening at 3 × 10 with a load that can be lifted ten times for the hip and knee; a lateral step-down from a 15 cm step with the knee over the foot, a level pelvis and pain of 2/10 or less; and the activity ladder to step 5 for those returning to sport.",
      ],
      education: [
        "• التحميلُ هو العلاج: الورك والركبة معاً أفضلُ من الركبة وحدها (van der Heijden 2015)، والحجمُ الأكبر أفضل (Almeida 2025).\n" +
        "• الجهد: الثلاثةُ الأخيرة من كلّ مجموعة صعبة، والألمُ بقاعدته.\n" +
        "• الحركةُ الصحيحة: الركبةُ فوق القدم والحوضُ مستوٍ في الدرج والقيام والسجود — يتدرّب عليها أمام المرآة (Nunes 2023).\n" +
        "• متى يتحسّن: يقلّ الألمُ غالباً من الأسبوع الثالث أو الرابع (Ferber 2015).",
        "• Loading is the treatment: hip and knee together beat the knee alone (van der Heijden 2015), and a larger volume does better (Almeida 2025).\n" +
        "• Effort: the last three repetitions of each set are hard, with pain by its rule.\n" +
        "• Good movement: knee over the foot and pelvis level on stairs, rising and prostration — practised in front of a mirror (Nunes 2023).\n" +
        "• When it improves: pain usually eases from the third or fourth week (Ferber 2015).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين يتحقّق اثنان من ثلاثة:\n" +
        "• كوجالا زاد ١٠ نقاط فأكثر (Crossley 2004).\n" +
        "• النزولُ الجانبيّ عن الدرجة بجودةٍ جيدة — بلا انهيارٍ للركبة إلى الداخل ولا نزولٍ للحوض — وألمٍ ٢ من ١٠ أو أقلّ (Willy 2019).\n" +
        "• قوّةُ مبعدات الورك ومادّات الركبة فوق حدود الإرشاد أو ٨٠٪ من الجهة الأخرى (اقتراح).\n" +
        "(اقتراحٌ يجمع الفرقَ المهمّ واختبارَ الإرشاد، لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when two of three are met:\n" +
        "• Kujala up 10 points or more (Crossley 2004).\n" +
        "• A good-quality lateral step-down — no inward knee collapse or pelvic drop — with pain of 2/10 or less (Willy 2019).\n" +
        "• Hip abductor and knee extensor strength above the guideline cut-offs or 80% of the other side (a suggestion).\n" +
        "(A proposal combining the important change and the guideline's test, not a tested criterion.)",
      ],
      notes: [
        "• أيّامُ التقوية الثلاثة يوماً بعد يوم: ضغطُ الساقين ٠ ⟵ ٤٥° ثمّ إلى ٦٠–٩٠° بقاعدة الألم، ومدُّ الركبة جالساً ٩٠–٤٥° بمقاومة، والجلوسُ والقيام، وصعودُ الدرجة والنزولُ الجانبيّ (١٠ ⟵ ١٥–٢٥ سم)، والطعنة — ٣ × ١٠ بثقلٍ يُرفع عشرَ مرّات (Ferber 2015 · Constantinou 2022).\n" +
        "• الوركُ واقفاً بالمطّاط ٣ × ١٠ ⟵ ١٠–١٥ بمطّاطٍ أقوى كلَّ أسبوعٍ أو اثنين (Ferber 2015)، والجسرُ الجانبيّ للجذع (Bolgla 2018).\n" +
        "• الأيّامُ الخفيفة: رفعُ الحوض على درجة والوقوفُ على ساقٍ أمام المرآة — الركبةُ فوق الإصبع الثاني والحوضُ مستوٍ (Nunes 2023).\n" +
        "• مَن بقي مدُّ ركبته بالمقاومة مؤلماً: تقييدُ الدم إن توفّر جهازُه، أو التحفيزُ العضليّ مع التمرين (في «احتياطات» و«الأجهزة»).\n" +
        "• الشريطُ يُقلَّل بعد أربعة أسابيع.",
        "• Three strengthening days every other day: leg press 0 → 45°, then to 60–90° by the pain rule, resisted seated knee extension 90–45°, sit-to-stand, step-ups and lateral step-downs (10 → 15–25 cm), and lunges — 3 × 10 with a load that can be lifted ten times (Ferber 2015 · Constantinou 2022).\n" +
        "• Standing band hip work 3 × 10 → 10–15 with a stronger band every week or two (Ferber 2015), and the side plank for the trunk (Bolgla 2018).\n" +
        "• Light days: pelvic drops on a step and single-leg stance in front of a mirror — knee over the second toe and pelvis level (Nunes 2023).\n" +
        "• If resisted knee extension remains painful: blood-flow restriction if the device is available, or NMES with exercise (under 'Precautions' and 'Devices').\n" +
        "• Taping is weaned after four weeks.",
      ],
      exercises: [
        { code: "stationary-cycling",
          doseNote: ["٥–١٠ دقائق للإحماء، والجهدُ يزيد مع سلّم النشاط.", "5–10 minutes of warm-up, with the effort rising along the activity ladder."] },
        { code: "leg-press-progressive", sets: 3, reps: 10, rest: 60,
          note: ["٠ ⟵ ٤٥° أوّلاً ثمّ إلى ٦٠–٩٠° بقاعدة الألم، بثقلٍ يُرفع عشرَ مرّات (نحو ٧٠٪ من الأقصى — Constantinou 2022) — لا ٨ كما في بطاقة الاستبدال.",
            "0 → 45° first, then to 60–90° by the pain rule, with a load that can be lifted ten times (about 70% of maximum — Constantinou 2022) — not 8 as on the knee-replacement card."] },
        { code: "seated-knee-extension", sets: 3, reps: 10, rest: 60,
          note: ["بمقاومةٍ على الكاحل بين ٩٠ و٤٥° (Powers 2014).", "With resistance at the ankle between 90 and 45° (Powers 2014)."] },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["الكرسيُّ يُخفض تدريجياً، ثمّ ثقلٌ في اليدين.", "The chair lowered progressively, then a weight in the hands."] },
        { code: "step-up", sets: 3, reps: 10, rest: 60 },
        { code: "lateral-step-down", sets: 3, reps: 10, rest: 60,
          note: ["درجةٌ ١٠ سم ثمّ ١٥–٢٥ سم (Ferber 2015)، أمام المرآة — وهو اختبارُ الانتقال أيضاً.", "A 10 cm step, then 15–25 cm (Ferber 2015), in front of a mirror — it is also the progression test."] },
        { code: "split-squat", sets: 3, reps: 10, rest: 60,
          note: ["ربعُ نزولٍ ثمّ نصف، والركبةُ الأمامية فوق القدم (Ferber 2015).", "A quarter-depth then half-depth, with the front knee over the foot (Ferber 2015)."] },
        { code: "standing-band-hip-abduction-er", sets: 3, reps: 10, rest: 60 },
        { code: "side-plank", sets: 3, reps: 1, hold: 20, rest: 45,
          note: ["على الركبتين ثمّ القدمين، حتى ٣٠–٤٥ ثانية.", "On the knees, then the feet, up to 30–45 seconds."] },
        { code: "pelvic-drop-step", sets: 2, reps: 10,
          note: ["تعليمُ الحوض المستوي على ساقٍ واحدة أمام المرآة (Bolgla 2018).", "Teaching a level pelvis on one leg in front of a mirror (Bolgla 2018)."] },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 30, rest: 15,
          note: ["حتى ٤٥–٦٠ ثانية، ثمّ على وسادةٍ لينة (Ferber 2015).", "Up to 45–60 seconds, then on a soft cushion (Ferber 2015)."] },
        { code: "quadriceps-stretch-standing", sets: 1, reps: 3, hold: 30, rest: 15 },
      ],
    },
    {
      name: ["الوظيفة والعودة إلى النشاط", "Function and return to activity"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["الجلسات ١٧–٢٤ (الأسبوعُ الرابع) — والتمديدُ ٢٥–٣٠", "Sessions 17–24 (the fourth week) — with the extension at 25–30"],
      goals: [
        "القرفصاءُ على ساقٍ حتى ٩٠° بجودةٍ جيدة وألمٍ ٢ من ١٠ أو أقلّ؛ والقفزُ والجريُ وتغييرُ الاتّجاه لمن يريد الرياضة؛ والسجودُ والتشهّدُ والمرحاضُ العربيّ والدرجُ بلا ألمٍ يزيد؛ والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر.",
        "Single-leg squat to 90° with good quality and pain of 2/10 or less; hopping, running and changing direction for those returning to sport; prostration, tashahhud, the squat toilet and stairs without rising pain; and the home programme to week 12.",
      ],
      education: [
        "• الإدارةُ الذاتية: إن عاد الألم ينزل درجةً في السلّم أيّاماً ثمّ يعود، ولا يترك التقوية.\n" +
        "• البرنامجُ المنزليّ: التقويةُ ثلاثاً في الأسبوع حتى الأسبوع الثاني عشر — فالألمُ يعود عند كثيرين (Collins 2013).\n" +
        "• العودةُ إلى المباريات بعد أسبوعين من التدريب الكامل بلا ألم (Rathleff 2020).\n" +
        "• متى يعود: تورّمٌ أو انحباسٌ أو انفلات، أو ألمٌ لا يهدأ بالسلّم.",
        "• Self-management: if the pain returns, go down a ladder step for a few days and then come back, without stopping strengthening.\n" +
        "• The home programme: strengthening three times a week to week 12 — the pain returns in many (Collins 2013).\n" +
        "• Return to matches after two weeks of full training without pain (Rathleff 2020).\n" +
        "• When to come back: swelling, locking or giving way, or pain that does not settle with the ladder.",
      ],
      criteria: [
        "معاييرُ الخروج (كلُّها أو أكثرُها):\n" +
        "• كوجالا زاد ١٠ نقاط فأكثر، ويفضَّل ١٣ — فوق خطأ القياس (Crossley 2004 · Hott 2021).\n" +
        "• أسوأُ الألم ٢ من ١٠ أو أقلّ في الأنشطة التي اختارها، وقاعدةُ الصباح محترمةٌ على أعلى درجةٍ في سلّمه.\n" +
        "• الأنشطةُ المختارة تحسّنت نقطتين فأكثر لكلٍّ منها (Alnahdi 2022).\n" +
        "• عددُ النزول عن الدرجة في ٣٠ ثانية أو القفزُ على ساق ٩٠٪ من الجهة الأخرى فأكثر (اقتراح — ٨٥٪ في المتوسّط عند مرضى الرضفة — Loudon 2002).\n" +
        "• البرنامجُ المنزليّ يؤدّيه وحده.\n" +
        EXTEND_AR,
        "Discharge criteria (all or most):\n" +
        "• Kujala up 10 points or more, ideally 13 — beyond measurement error (Crossley 2004 · Hott 2021).\n" +
        "• Worst pain of 2/10 or less in the chosen activities, with the morning rule respected at the highest step of the patient's ladder.\n" +
        "• The chosen activities each improved by 2 points or more (Alnahdi 2022).\n" +
        "• The 30-second step-down count or the single-leg hop at 90% or more of the other side (a suggestion — the average in patellofemoral pain is 85% — Loudon 2002).\n" +
        "• The home programme done independently.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• القرفصاءُ على ساقٍ حتى الكرسيّ ثمّ أخفض حتى ٩٠°، والطعنةُ أعمق ثمّ ماشية (Ferber 2015).\n" +
        "• سلّمُ النشاط ٦–٨ ثمّ التدريب: النطُّ والقفزُ والهبوطُ على ساق، والقفزُ الجانبيّ، والجريُ على شكل ٨ وتغييرُ الاتّجاه — ولكرة القدم: الركلُ والانعطافُ والهبوط (Rathleff 2020).\n" +
        "• العدّاؤون: زيادةُ الخطوات ٥–١٠٪ وتنظيمُ المسافة والسرعة (Bramah 2019 · Esculier 2020).\n" +
        "• تدريبُ الحياة اليومية في الجلسة: النزولُ إلى السجود والقيامُ منه، والجلوسُ للتشهّد مع وسادةٍ ثمّ بدونها، والقرفصاءُ للمرحاض العربيّ، والنزولُ عن الدرج بالتناوب.\n" +
        "• البرنامجُ المنزليّ الأخير مكتوباً: ٣–٤ تمارين تقوية بمجموعتين إلى أربع، ثلاثَ مرّاتٍ في الأسبوع حتى الأسبوع الثاني عشر.",
        "• Single-leg squat to the chair, then lower down to 90°, and deeper lunges, then walking lunges (Ferber 2015).\n" +
        "• Ladder steps 6–8, then training: skipping, jumping and landing on one leg, lateral hops, and figure-of-eight running with changes of direction — and for football: kicking, turning and landing (Rathleff 2020).\n" +
        "• Runners: 5–10% more steps per minute with managed distance and speed (Bramah 2019 · Esculier 2020).\n" +
        "• Daily-life practice in the session: going down into and up from prostration, sitting for tashahhud with a cushion and then without, squatting for the squat toilet, and step-over-step stair descent.\n" +
        "• The final home programme in writing: 3–4 strengthening exercises of two to four sets, three times a week to week 12.",
      ],
      exercises: [
        { code: "single-leg-squat-to-box", sets: 3, reps: 10, rest: 60 },
        { code: "split-squat", sets: 3, reps: 10, rest: 60,
          note: ["أعمق حتى ٩٠°، ثمّ طعنةٌ ماشية (Ferber 2015).", "Deeper to 90°, then walking lunges (Ferber 2015)."] },
        { code: "leg-press-progressive", sets: 3, reps: 10, rest: 60,
          note: ["إلى ٩٠° بثقلٍ أعلى، ثمّ على ساقٍ واحدة.", "To 90° with a heavier load, then on one leg."] },
        { code: "lateral-step-down", sets: 3, reps: 15, rest: 60 },
        { code: "standing-band-hip-abduction-er", sets: 3, reps: 15, rest: 60 },
        { code: "forward-hop-stick", sets: 3, reps: 5, rest: 60,
          note: ["بالساقين ثمّ بساق، والهبوطُ بركبةٍ فوق القدم — درجةُ القفز في السلّم.", "On two legs, then one, landing with the knee over the foot — the jumping step of the ladder."] },
        { code: "lateral-hops", sets: 3, reps: 10, rest: 60 },
        { code: "figure-8-agility",
          doseNote: ["لمن يعود إلى الرياضة: ٤ مرّات في كلّ اتّجاه بسرعةٍ تزيد — درجةُ الجري والانعطاف في السلّم (Rathleff 2020).", "For those returning to sport: 4 times each way at rising speed — the running-and-turning step of the ladder (Rathleff 2020)."] },
        { code: "running-cadence-retraining",
          note: ["للعدّائين ولاعبي كرة القدم الذين يؤلمهم الجري.", "For runners and footballers whose running is painful."] },
        { code: "star-excursion-reach", sets: 1, reps: 3,
          note: ["الوصولُ بالقدم في الاتّجاهات والركبةُ الواقفة فوق القدم.", "Reaching with the foot in each direction with the standing knee over the foot."] },
        { code: "side-plank", sets: 3, reps: 1, hold: 30, rest: 45 },
        { code: "stationary-cycling",
          doseNote: ["١٠–٢٠ دقيقة بجهدٍ متوسّط إلى عالٍ — للإحماء واللياقة.", "10–20 minutes at moderate to high effort — for warm-up and fitness."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ بستٍّ في الأسبوع (أربعةُ أسابيع) والتقويةُ الثقيلة يوماً بعد يوم، وتمديدٌ واحد بستّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين في السادس والثاني عشر — والتجاربُ ثلاثاً في الأسبوع أربعةَ أسابيع إلى ثمانية (١٢–٢٤ جلسة)، ولا تجربةَ لخمسٍ أو ستّ: أبقِه، أو اجعله ثلاثاً في الأسبوع ستّةَ أسابيع إلى ثمانية (١٨–٢٤ جلسة).",
    en: "24 sessions at six a week (four weeks) with the heavy strengthening every other day, one extension of six for those who reached an important change without meeting discharge, and the home programme to week 12 with reviews at weeks 6 and 12 — trials used three a week for four to eight weeks (12–24 sessions) (van der Heijden 2015), and no trial tested five or six a week: keep it, or make it three a week for six to eight weeks (18–24 sessions)." },
  { key: "limits", topic: "limits",
    ar: "الحدود: قاعدةُ الألم (حتى نقطتين فوق البداية وسقفُها ٣ من ١٠، ولا يزيد صباحاً) وسلّمُ النشاط بـ٢ من ١٠، والانتقالُ بنقص الألم نقطتين ثمّ زيادةِ كوجالا ١٠ وجودةِ النزول عن الدرجة، والخروجُ بكوجالا ١٠ (ويفضَّل ١٣) والأنشطةِ المختارة نقطتين والتماثلِ ٩٠٪ — اقتراحٌ مبنيٌّ على الفرق المهمّ وما استعملته التجارب: أبقِها أو عدّلها.",
    en: "The limits: the pain rule (up to two points above baseline with a 3/10 ceiling, no worse next morning) and the activity ladder at 2/10, progression on a 2-point pain reduction then a 10-point Kujala rise and step-down quality, and discharge at Kujala +10 (ideally 13), the chosen activities +2 and 90% symmetry — proposals built on the important changes and trial practice (Crossley 2004 · Rathleff 2018 · Rathleff 2020 · Hott 2021): keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: فحصُ الورك عند كلّ مراهق (انزلاقُ رأس الفخذ يأتي بألم الركبة ويتأخّر تشخيصُه)، وقاعدةُ أوتاوا بعد الإصابة، والركبةُ الحارّة والانحباسُ والورمُ والخلع، وألمُ أسفل الرضفة وحدبة الساق تشخيصٌ آخر، والأسبوعُ السادس والثاني عشر وستّةُ أشهر لرأي الجرّاح: أبقِها أو عدّلها مع طبيب المركز.",
    en: "The referral rules: a hip examination in every adolescent (a slipped capital femoral epiphysis presents with knee pain and is diagnosed late — Momtaz 2025), the Ottawa rule after injury, a hot knee, locking, tumour and dislocation, pain below the kneecap or on the tibial tubercle as a different diagnosis, and weeks 6 and 12 and six months for a surgeon's opinion (Ophey 2025): keep or adjust with the centre's doctor." },
  { key: "orthoses-taping", topic: "content",
    ar: "النعلُ الجاهز مع التمرين لمن تنبسط قدمُه ستّةَ أسابيع (والإرشادُ الهولنديّ يؤخّره إلى ما بعد ستّة أسابيع بلا تحسّن)، والشريطُ المفصَّل حتى أربعة أسابيع إن خفّف الألمَ ٥٠٪، ولا دعّامة: أبقِ ذلك أو عدّله — ومَن يوفّر النعلَ والشريطَ في المركز؟",
    en: "Prefabricated foot orthoses with exercise for a pronated foot for six weeks (the Dutch guideline delays them until six weeks without improvement — Ophey 2025), tailored taping for up to four weeks if it cuts pain by 50%, and no brace (Willy 2019): keep or adjust — and who supplies the orthoses and tape in the centre?" },
  { key: "device-electro", topic: "devices",
    ar: "التحفيزُ الكهربائيّ مساعدٌ بقاعدتك: تحفيزٌ عضليّ للفخذ أثناء التمرين لمن يعجز عن تنشيطه، أو تحفيزٌ حسّيّ لتهدئة الألم — والإرشادُ ضدّه، وفي التجارب أثرٌ صغير إن طال أكثرَ من أربعة أسابيع: أبقِه بإعداداته أو اجعله «لا يُستخدم».",
    en: "Electrical stimulation is an adjunct by your rule: NMES of the quadriceps during exercise for those who cannot activate it, or sensory TENS for pain — the guideline is against it (Willy 2019), and trials show a small effect when used for more than four weeks (Zheng 2025): keep it with its settings or set it to 'Not used'." },
  { key: "device-adjuncts", topic: "devices",
    ar: "التيكارُ والمغناطيسُ والحرارةُ والأشعّة تحت الحمراء مساعدةٌ بقاعدتك — والتيكارُ دليلُه من مجموعةٍ بحثية واحدة، والمغناطيسُ تجربةٌ صغيرة، والحرارةُ بلا تجربة، والإرشادُ ضدّ الأجهزة الفيزيائية: أبقِها بشروطها أو اجعل بعضَها «لا يُستخدم»، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Tecar, magnetic therapy, heat and infrared are adjuncts by your rule — Tecar's evidence comes from one research group (Albornoz-Cabello 2023), magnetic therapy from one small trial (Servodio Iammarrone 2016), heat has no trial, and the guideline is against biophysical agents (Willy 2019): keep them with their conditions or set some to 'Not used', and fill the magnetic settings from the centre's device." },
  { key: "device-laser-needle", topic: "devices",
    ar: "الإبرُ الجافّة «لا يُستخدم» (الإرشادُ ضدّها بأقوى درجة، وتحليلٌ جامع إيجابيّ متباين)، والليزرُ «لا يُستخدم» (الإرشادُ ضدّه، وتحليلاتٌ جامعة تميل إليه بيقينٍ منخفضٍ جداً بجرعة ٨١٠ نانومتر و٦ جول لكلّ سم²)، والأمواجُ فوق الصوتية والصادمة «لا يُستخدم»: أبقِها كذلك أو غيّرها.",
    en: "Dry needling is 'Not used' (the guideline is against it at grade A, with one heterogeneous positive meta-analysis — Rashnavadi 2025), laser is 'Not used' (the guideline is against it, while meta-analyses lean towards it with very low certainty at 810 nm and 6 J/cm² — Alayat 2025), and ultrasound and shockwave are 'Not used': keep them so or change them." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: أسوأَ الألم والألمَ المعتاد في الأسبوع من ١٠ (الأقلّ أفضل)، والأنشطةَ التي يختارها المريض بالعربية من ١٠ (الأكثر أفضل)، والنزولَ عن الدرجة في ٣٠ ثانية بالعدد أو زاويةَ الثني بلا ألم (الأكثر أفضل)، وقوّةَ مبعدات الورك ومادّات الركبة بنسبةٍ من وزن الجسم إن توفّر مقياسُ القوّة (الأكثر أفضل)؛ واختر نسخةَ كوجالا العربية: السعوديةَ أم الأردنيةَ التي فيها بندُ السجود.",
    en: "Add under 'Measures' → custom measure: worst and usual pain over the past week out of 10 (lower is better), the Arabic Patient-Specific Functional Scale out of 10 (higher is better), the 30-second step-down count or the pain-free flexion angle (higher is better), and hip abductor and knee extensor strength as a percentage of body weight if a dynamometer is available (higher is better); and choose the Arabic Kujala version: the Saudi one (Alshehri 2017) or the Jordanian one with a prostration item (Haddad 2021)." },
];

export const name = "155_physio_patellofemoral_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
