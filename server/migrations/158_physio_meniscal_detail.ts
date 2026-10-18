// Migration 158: إصاباتُ الغضروف الهلاليّ — البروتوكولُ الثاني والعشرون مفصَّلاً (§4.eq — ٢٠٢٦-١٠-١٨).
//
// المالك (٢٠٢٦-١٠-١٨): «ممتاز نكمل البروتوكول التالي» — فاختار المساعدُ إصاباتِ الغضروف الهلاليّ (`knee-meniscal-adult`): التمزّقُ في الرنين عند ٣٥٪
// ممّن بين ٥٠ و٩٠ سنة (Englund 2008)، ومريضُ بغداد وذي قار يأتي كثيراً بتقرير رنين «تمزّق» وينتظر الجراحة؛ ويستعمل بطاقاتِ الركبة القائمة بصورها.
// **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعةُ أسابيع) للعلاج بلا جراحة — والتقويةُ الثقيلة يوماً بعد يوم كما في التجربة
// النرويجية — و١٢ بعد الاستئصال الجزئيّ تمتدّ إلى ١٨ (يعدّلها الأخصائيُّ في خطّة المريض)، وتمديدٌ واحد بستٍّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج،
// والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر — موعدُ قرار الأشهر الثلاثة؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–١٦ · ١٧–٢٤) بمعايير الفرق المهمّ بعد جراحة
// الغضروف (الألمُ نقطتان، ونتائجُ الركبة: الألمُ +١٢ والأعراضُ +٨، وقوّةُ الفخذ ٨٠٪ ثمّ ٩٠٪) **وقاعدةُ ألمٍ وتورّم** (٠–٢ · حتى ٥ · فوق ٥، ودرجةُ اختبار
// المسح)؛ وستُّ بطاقاتٍ جديدة (ثنيُ الركبة واقفاً، وثنيُ الركبتين بالكرة، وثباتُ الركبة ضدّ المطّاط، وقفزةُ المتزلّج، والقفزُ على الصليب، والصلاةُ مع
// الغضروف) والمعادةُ بصورها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (ولنتائج الركبة نسخةٌ عربية مُتحقَّقة في
// إصابات الغضروف)؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الغضروف**: التمرينُ لا الجراحةُ أوّلاً للتنكّسيّ — ساوى الاستئصالَ (Kise 2016) ولم يفُق الاستئصالُ الجراحةَ الوهمية (Sihvonen 2018)؛
// **وقاعدتا إحالةٍ تخصّانه**: قاعدةُ الأشهر الثلاثة للتنكّسيّ (Beaufils 2017)، وقاعدةُ الشابّ بتمزّقٍ إصابيّ إلى الجرّاح خلال أسبوعين إلى ثلاثة لأنّ
// الخياطةَ المبكّرة أنجح (van der List 2025)؛ **وبعد الخياطة لا يضع البروتوكولُ قيوداً** — تعليماتُ الجرّاح تحكم (Pujol 2025). **والجرعة**: التجاربُ
// مرّتين إلى ثلاثٍ في الأسبوع ٨–١٢ أسبوعاً (١٦–٣٦ جلسة)، وبعد الاستئصال ٦–٩ جلسات في أسبوعين أو ثلاثة — ولا تجربةَ لخمسٍ أو ستّ (بحثٌ صفريّ) — فالعددُ
// اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والتحفيزُ العضليّ بعد الاستئصال والتبريدُ مع الضغط مساعدان لهما أساس، والتيكارُ
// والمغناطيسُ والحرارةُ مساعدةٌ بقاعدة المركز والدليلُ عليها غائب؛ والليزرُ والصادمةُ «لا يُستخدم» ولكلٍّ تجربةٌ واحدة بإعداداتها لقرار سليم — **فلا
// إعداداتِ جهازٍ تمنع اعتمادَه**. **وما يخصّ العراق**: لا دراسةَ عراقية للتمزّق (بحثٌ صفريّ)، والركوعُ والقرفصاءُ في العمل يرفعان الخطر (Baker 2002)،
// والصلاةُ لا دليلَ على أنّها تُحدثه.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٢٤١ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ستّ؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٣٠ و١٣٨ و١٤٠ و١٥٥) تُربط برموزها وصورها، وما يخصّ الغضروفَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "standing-hamstring-curl", nameAr: "ثني الركبة واقفاً بثقلٍ على الكاحل (تقوية عضلات خلف الفخذ)", nameEn: "Standing single-leg hamstring curl",
    kind: "strength", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 12, rest: 60,
    purpose: ["يقوّي عضلاتِ خلف الفخذ على ساقٍ واحدة — وهو ثالثُ تمارين القوّة في التجربة النرويجية بعد ضغط الساقين ومدّ الركبة، يُرفع بسرعة ويُنزل ببطء حتى المدّ الكامل (Kise 2016)؛ والتمرينُ قوّى خلفَ الفخذ أكثرَ من الاستئصال في الشهر الثالث والثاني عشر (Berg 2022)، وضعفُ عضلات الفخذ ينبئ بمسارٍ أسوأ (Berg 2021).",
      "Strengthens the hamstrings one leg at a time — the third strength exercise of the Norwegian trial after the leg press and knee extension, lifted quickly and lowered slowly to full extension (Kise 2016); exercise strengthened the hamstrings more than meniscectomy at 3 and 12 months (Berg 2022), and weak thigh muscles predict a poorer course (Berg 2021)."],
    start: ["واقفاً مستقيماً ممسكاً بظهر كرسيٍّ ثابت أو بالحائط، والركبتان متجاورتان، وثقلٌ على كاحل الساق المتمرّنة أو مطّاطٌ مثبَّت أمامه.",
      "Standing tall holding the back of a stable chair or the wall, with the knees side by side and a weight on the ankle of the training leg, or a band anchored in front."],
    steps: [[
      "قف مستقيماً وشدّ البطن قليلاً، والركبتان متجاورتان.",
      "اثنِ الركبة بسرعة (ثانية واحدة) فيرتفع الكعبُ نحو الألية، والفخذُ عموديٌّ بجانب الفخذ الأخرى.",
      "ارفع حتى نحو ٩٠° أو حيث يريحك.",
      "أنزل الساقَ ببطء (ثلاث ثوانٍ) حتى المدّ الكامل.",
      "في آخر مجموعة: أكثرُ عددٍ تستطيعه — فإن زدت مرّتين فأكثر يُرفع الثقلُ في الجلسة التالية (قاعدةُ «زائد اثنين»).",
    ], [
      "Stand tall with the abdomen slightly tight and the knees side by side.",
      "Bend the knee quickly (one second) so the heel rises towards the buttock, with the thigh vertical beside the other thigh.",
      "Lift to about 90° or as far as is comfortable.",
      "Lower the leg slowly (three seconds) to full extension.",
      "In the last set: as many repetitions as you can — if you manage two or more extra, the load goes up next session (the 'plus-two' rule).",
    ]],
    cues: [[
      "الفخذُ يتقدّم إلى الأمام ⟵ الفخذُ عموديٌّ بجانب الأخرى.",
      "تقويسُ أسفل الظهر ⟵ البطنُ مشدود والجذعُ مستقيم.",
      "ترك الثقل يسقط ⟵ إنزالٌ بطيء ثلاثَ ثوانٍ.",
    ], [
      "The thigh drifting forwards → the thigh vertical beside the other.",
      "Arching the lower back → abdomen tight and trunk upright.",
      "Letting the weight drop → a slow three-second lowering.",
    ]],
    easier: ["بلا ثقل أو بمطّاطٍ خفيف، ومدىً أصغر، أو منبطحاً على السرير.", "No weight or a light band, a smaller range, or lying face down on a bed."],
    harder: ["ثقلٌ أكبر على الكاحل، أو جهازُ ثني الركبة على ساقٍ واحدة، وإنزالٌ أبطأ.", "A heavier ankle weight, or a leg-curl machine one leg at a time, with a slower lowering."],
    stopIf: ["ألمٌ خلف الركبة أو انحباسٌ أو «طقّة» (علامةُ جذر الغضروف) ⟵ يتوقّف ويخبر الأخصائيّ؛ وألمٌ فوق ٥ من ١٠ أو تورّمٌ صباحَ اليوم التالي بقاعدة الألم والتورّم.",
      "Pain behind the knee, catching or a 'pop' (a sign of a meniscal root tear) → stop and tell the therapist; and pain above 5/10 or swelling the next morning by the pain-and-swelling rule."],
    equipment: ["كرسيٌّ ثابت، وأثقالُ كاحل ٠٫٥–٥ كغم أو مطّاط؛ وجهازُ ثني الركبة إن توفّر.", "A stable chair, ankle weights of 0.5–5 kg or a band; and a leg-curl machine if available."],
    doseNote: ["أيّامُ القوّة: مجموعتان × ١٥ ⟵ ٣ × ١٢ ⟵ ٣ × ٨ ⟵ ٤ × ٦ بقاعدة «زائد اثنين» (Kise 2016)؛ وفي البيت مرّتين إلى ثلاثٍ في الأسبوع حتى الأسبوع الثاني عشر. وبعد الخياطة داخل المدى الذي يسمح به الجرّاح — فالثنيُ فوق ٩٠° يُجهد خياطةَ القرن الخلفيّ (Adams 2012).",
      "Strength days: 2 × 15 → 3 × 12 → 3 × 8 → 4 × 6 with the 'plus-two' rule (Kise 2016); at home two to three times a week to week 12. After a repair, only within the range the surgeon allows — flexion beyond 90° stresses a posterior-horn repair (Adams 2012)."],
    images: [{ key: "standing-hamstring-curl-1", ar: "واقفٌ ممسكٌ بكرسيّ يثني ركبةً واحدة فيرتفع الكعبُ نحو الألية والفخذُ عموديّ",
      en: "Standing holding a chair, bending one knee so the heel rises towards the buttock with the thigh vertical", search: "standing hamstring curl ankle weight" }],
  },
  {
    code: "fitball-hamstring-curl", nameAr: "ثني الركبتين بالكرة (الجسر وسحب الكرة)", nameEn: "Hamstring curl on an exercise ball",
    kind: "strength", region: "knee", homeSuitable: true, sets: 3, reps: 8, rest: 60,
    purpose: ["يقوّي خلفَ الفخذ والألويةَ معاً مع ثبات الجذع — وهو «خلفُ الفخذ على الكرة» ٣ × ٨ في التجربة النرويجية التي ساوى فيها التمرينُ الاستئصال (Kise 2016)؛ وبدأ به برنامجُ ما بعد الاستئصال جسراً على الكرة ثمّ تدرّج (Hall 2012).",
      "Strengthens the hamstrings and gluteals together with trunk control — it is the 'hamstring on fitball' at 3 × 8 in the Norwegian trial in which exercise equalled meniscectomy (Kise 2016); the post-meniscectomy programme started it as a bridge on the ball and progressed it (Hall 2012)."],
    start: ["مستلقٍ على الظهر فوق فرشة، والكعبان على أعلى كرة التمرين، والذراعان على الأرض بجانب الجسم.",
      "Lying on the back on a mat with both heels on top of the exercise ball and the arms on the floor beside the body."],
    steps: [[
      "شدّ البطن قليلاً.",
      "ارفع الحوضَ جسراً حتى يستقيم الجسمُ من الكتفين إلى الكعبين.",
      "اثنِ الركبتين واسحب الكرةَ نحو الأليتين والحوضُ مرفوع.",
      "أعد الكرةَ ببطء حتى تستقيم الركبتان.",
      "أنزل الحوضَ إلى الأرض، ثمّ أعد.",
    ], [
      "Tighten the abdomen slightly.",
      "Lift the pelvis into a bridge until the body is straight from the shoulders to the heels.",
      "Bend the knees and pull the ball towards the buttocks while keeping the pelvis up.",
      "Roll the ball back out slowly until the knees are straight.",
      "Lower the pelvis to the floor, then repeat.",
    ]],
    cues: [[
      "الحوضُ يهبط أثناء السحب ⟵ الوركان مرفوعان طوالَ الحركة.",
      "تقويسُ أسفل الظهر ⟵ البطنُ مشدود.",
      "الدفعُ في ألمٍ خلف الركبة ⟵ مدىً أصغر.",
    ], [
      "The pelvis dropping during the curl → hips up throughout the movement.",
      "Arching the lower back → abdomen tight.",
      "Pushing into pain behind the knee → a smaller range.",
    ]],
    easier: ["الجسرُ وحده على الكرة بلا سحب (Hall 2012)، أو القدمان على درجة.", "The bridge alone on the ball without the curl (Hall 2012), or the feet on a step."],
    harder: ["على ساقٍ واحدة، أو ثباتٌ ثلاثَ ثوانٍ والكرةُ مسحوبة.", "On one leg, or a three-second hold with the ball pulled in."],
    stopIf: ["ألمٌ خلف الركبة أو في جهتها الداخلية الخلفية أو انحباس (علامةُ جذر الغضروف)، أو تشنّجٌ في العضلة ⟵ يتوقّف ويخبر الأخصائيّ.",
      "Pain behind the knee or at its back-inner side, catching (a sign of a meniscal root tear), or a cramp → stop and tell the therapist."],
    equipment: ["كرةُ تمرين ٥٥–٦٥ سم وفرشة.", "An exercise ball of 55–65 cm and a mat."],
    doseNote: ["٣ × ٨ (Kise 2016)، مرّتين إلى ثلاثٍ في الأسبوع في الأيّام الخفيفة أو أيّام القوّة.", "3 × 8 (Kise 2016), two to three times a week on light or strength days."],
    images: [{ key: "fitball-hamstring-curl-1", ar: "مستلقٍ والكعبان على كرة التمرين والحوضُ مرفوعٌ جسراً، ثمّ الركبتان مثنيّتان والكرةُ مسحوبةٌ نحو الأليتين",
      en: "Lying with the heels on an exercise ball and the pelvis lifted in a bridge, then the knees bent with the ball pulled towards the buttocks", search: "swiss ball hamstring curl bridge" }],
  },
  {
    code: "knee-stability-band-loop", nameAr: "ثبات الركبة على ساقٍ واحدة ضدّ سحب المطّاط", nameEn: "Single-leg knee stability against a band loop",
    kind: "balance", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 10,
    purpose: ["يعلّم الركبةَ أن تبقى فوق القدم وهي تحمل الوزن ويُسحب منها — وهو «ثباتُ الركبة في حلقة المطّاط، على وسادة توازنٍ أو بدونها» ٣ × ١٠ في التجربة النرويجية (Kise 2016)؛ والتمرينُ العصبيّ العضليّ للتمزّق وبعد الجراحة B (Logerstedt 2018).",
      "Teaches the knee to stay over the foot while it bears weight and is pulled — it is the 'knee stability in a pull loop, with or without a balance pad' at 3 × 10 in the Norwegian trial (Kise 2016); neuromuscular training for meniscal tears and after surgery is grade B (Logerstedt 2018)."],
    start: ["حلقةُ مطّاطٍ حول خلف الركبة المتمرّنة مثبّتةٌ أمامها بارتفاع الركبة (تسحبها إلى الأمام) أو بجانبها (تسحبها إلى الداخل)؛ والوقوفُ على تلك الساق والركبةُ ليّنة.",
      "A band loop around the back of the training knee, anchored in front at knee height (pulling it forwards) or to the side (pulling it inwards); standing on that leg with a soft knee."],
    steps: [[
      "قف على الساق المتمرّنة والركبةُ مثنيّةٌ قليلاً، والقدمُ الأخرى مرفوعةٌ قليلاً.",
      "أبقِ الركبةَ فوق الإصبع الثاني ضدّ سحب المطّاط.",
      "انزل ثنياً صغيراً حتى نحو ٣٠° ثمّ اصعد ببطء — عشرَ مرّات.",
      "استدر لتأتي الشدّةُ من الجانب (تسحب الركبةَ إلى الداخل) وأعد.",
      "ثمّ على وسادة توازن.",
    ], [
      "Stand on the training leg with the knee slightly bent and the other foot just off the floor.",
      "Keep the knee over the second toe against the pull of the band.",
      "Bend a little to about 30°, then rise slowly — ten times.",
      "Turn so the pull comes from the side (drawing the knee inwards) and repeat.",
      "Then on a balance pad.",
    ]],
    cues: [[
      "الركبةُ تنهار إلى الداخل ⟵ فوق الإصبع الثاني.",
      "الحوضُ يهبط في الجهة الأخرى ⟵ الحوضُ مستوٍ.",
      "قفلُ الركبة مستقيمة ⟵ ليّنةٌ مثنيّةٌ قليلاً.",
    ], [
      "The knee collapsing inwards → over the second toe.",
      "The pelvis dropping on the other side → a level pelvis.",
      "Locking the knee straight → soft and slightly bent.",
    ]],
    easier: ["القدمان على الأرض والوزنُ أكثرُه على الساق المتمرّنة، ومطّاطٌ أخفّ.", "Both feet on the floor with most of the weight on the training leg, and a lighter band."],
    harder: ["على وسادة توازن، أو بعينين مغمضتين، أو ثنيٌ أعمق، أو التقاطُ كرة.", "On a balance pad, with the eyes closed, a deeper bend, or catching a ball."],
    stopIf: ["ألمٌ فوق ٥ من ١٠، أو انفلاتُ الركبة، أو انحباس ⟵ يتوقّف ويخبر الأخصائيّ.", "Pain above 5/10, the knee giving way, or catching → stop and tell the therapist."],
    equipment: ["حلقةُ مطّاط، ومثبِّتٌ ثابت (بابٌ أو درابزين)، ووسادةُ توازن.", "A band loop, a firm anchor (a door or a rail), and a balance pad."],
    doseNote: ["٣ × ١٠ لكلّ اتّجاه شدّ في الأيّام الخفيفة (Kise 2016).", "3 × 10 for each direction of pull on light days (Kise 2016)."],
    images: [{ key: "knee-stability-band-loop-1", ar: "واقفٌ على ساقٍ واحدة ومطّاطٌ حول ركبتها يسحبها، والركبةُ مثنيّةٌ قليلاً فوق القدم",
      en: "Standing on one leg with a band around that knee pulling it, the knee slightly bent over the foot", search: "single leg knee stability band loop" }],
  },
  {
    code: "skater-hop-soft-landing", nameAr: "قفزة المتزلّج الجانبية بهبوطٍ ليّن", nameEn: "Skater hop with a soft landing",
    kind: "functional", region: "knee", homeSuitable: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يعلّم الهبوطَ الجانبيّ الليّن على ساقٍ واحدة للعودة إلى الرياضة والعمل — وهو «التزلّج» ٣ × ١٠ في التجربة النرويجية: «هبوطٌ ليّن عميق ثابت على ساقٍ واحدة» (Kise 2016). ويبدأ حين يصير التورّمُ أثراً أو أقلّ وقوّةُ الفخذ ٨٠٪ من الجهة الأخرى والقرفصاءُ على ساقٍ بلا ألم (Adams 2012)؛ ولا قفزَ بعد الخياطة قبل أن يسمح الجرّاح — أربعةُ أشهرٍ على الأقلّ (Pujol 2025).",
      "Teaches a soft sideways landing on one leg for return to sport and work — it is 'skating' at 3 × 10 in the Norwegian trial: 'a soft, deep and steady landing on one leg' (Kise 2016). It starts when swelling is trace or less, quadriceps strength is 80% of the other side and a single-leg squat is pain-free (Adams 2012); no jumping after a repair before the surgeon allows it — at least four months (Pujol 2025)."],
    start: ["واقفاً على ساقٍ واحدة على أرضٍ مستوية غير زلقة، والركبةُ مثنيّةٌ قليلاً فوق الأصابع، والجذعُ مائلٌ قليلاً إلى الأمام.",
      "Standing on one leg on a flat, non-slip floor, with the knee slightly bent over the toes and the trunk leaning slightly forwards."],
    steps: [[
      "ادفع الأرضَ جانباً واقفز إلى الساق الأخرى.",
      "اهبط بليونة وعمق على مقدّم القدم ثمّ الكعب، والركبةُ مثنيّةٌ فوق الأصابع.",
      "اثبت ثانيةً أو اثنتين بلا اهتزاز.",
      "اقفز عائداً إلى الساق الأولى.",
      "كلُّ هبوطٍ ثابت مرّة.",
    ], [
      "Push off sideways and hop onto the other leg.",
      "Land softly and deeply on the ball of the foot then the heel, with the knee bent over the toes.",
      "Hold for one or two seconds without wobbling.",
      "Hop back onto the first leg.",
      "Each steady landing counts as one.",
    ]],
    cues: [[
      "هبوطٌ يابسٌ مسموع ⟵ هادئٌ عميق.",
      "الركبةُ تنهار إلى الداخل ⟵ فوق الأصابع.",
      "الجذعُ يسقط جانباً ⟵ مستقيمٌ فوق الساق.",
    ], [
      "A stiff, noisy landing → quiet and deep.",
      "The knee collapsing inwards → over the toes.",
      "The trunk falling sideways → upright over the leg.",
    ]],
    easier: ["خطوةٌ جانبية بلا طيران، أو مسافةٌ أقصر.", "A side step without flight, or a shorter distance."],
    harder: ["مسافةٌ أطول، أو الوصولُ إلى الأرض أو التقاطُ كرة بعد الهبوط، أو بلا توقّف.", "A longer distance, reaching to the floor or catching a ball after landing, or without a pause."],
    stopIf: ["ألمٌ فوق ٥ من ١٠، أو انفلات، أو تورّمٌ صباحَ اليوم التالي ⟵ يعود درجةً ويخبر الأخصائيّ (قواعدُ الوجع — Adams 2012).",
      "Pain above 5/10, giving way, or swelling the next morning → back one level and tell the therapist (the soreness rules — Adams 2012)."],
    equipment: ["أرضٌ مستوية غير زلقة ومساحةُ ٢–٣ أمتار، وعلامتان على الأرض.", "A flat, non-slip floor with 2–3 metres of space, and two floor markers."],
    doseNote: ["٣ × ١٠ في أيّام المرحلة الثالثة (Kise 2016).", "3 × 10 on phase-3 days (Kise 2016)."],
    images: [{ key: "skater-hop-soft-landing-1", ar: "قفزةٌ جانبية من ساقٍ إلى الأخرى والهبوطُ على ساقٍ واحدة والركبةُ مثنيّةٌ فوق القدم",
      en: "A sideways hop from one leg to the other, landing on one leg with the knee bent over the foot", search: "skater hop lateral bound landing" }],
  },
  {
    code: "hop-cross-four-directions", nameAr: "القفز على ساقٍ واحدة على شكل صليب (أربعة اتّجاهات)", nameEn: "Single-leg hop cross in four directions",
    kind: "functional", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 3, rest: 60,
    purpose: ["يدرّب التحكّمَ بالركبة في القفز إلى كلّ الاتّجاهات — وهو «الصليبُ بالعرج» ٣ × ٣ دورات في التجربة النرويجية (Kise 2016)، ويهيّئ لاختبارات القفز قبل العودة إلى الرياضة؛ وكلُّ ثانيةٍ أسرع في قفز ستّة أمتار في البداية قابلها ٣٫١–٧٫١ نقطة أفضل في نتائج الركبة بعد سنتين (Kise 2019).",
      "Trains knee control when hopping in every direction — it is the 'limping cross' at 3 × 3 rounds in the Norwegian trial (Kise 2016), and prepares for the hop tests before return to sport; each second faster on the 6-metre timed hop at baseline went with a 3.1–7.1-point better knee score at two years (Kise 2019)."],
    start: ["صليبٌ بشريطٍ لاصق على الأرض (كلُّ ذراعٍ ٣٠–٤٠ سم)، والوقوفُ على ساقٍ واحدة في مركزه.",
      "A cross of tape on the floor (each arm 30–40 cm), standing on one leg at its centre."],
    steps: [[
      "اقفز إلى الأمام ثمّ عُد إلى المركز.",
      "اقفز إلى اليمين ثمّ عُد إلى المركز.",
      "اقفز إلى الخلف ثمّ عُد إلى المركز.",
      "اقفز إلى اليسار ثمّ عُد إلى المركز — فهذه دورةٌ واحدة.",
      "ثلاثُ دورات، والركبةُ فوق الأصابع في كلّ هبوط.",
    ], [
      "Hop forwards, then back to the centre.",
      "Hop to the right, then back to the centre.",
      "Hop backwards, then back to the centre.",
      "Hop to the left, then back to the centre — that is one round.",
      "Three rounds, with the knee over the toes on every landing.",
    ]],
    cues: [[
      "الهبوطُ على القدمين ⟵ على ساقٍ واحدة.",
      "الركبةُ تنهار إلى الداخل ⟵ فوق الأصابع.",
      "العجلةُ وفقدُ المركز ⟵ ثباتٌ قصير في كلّ هبوط.",
    ], [
      "Landing on both feet → on one leg.",
      "The knee collapsing inwards → over the toes.",
      "Rushing and losing the centre → a brief steady pause on every landing.",
    ]],
    easier: ["قفزاتٌ أصغر، أو وقفةٌ بين الاتّجاهات.", "Smaller hops, or a pause between directions."],
    harder: ["إيقاعٌ أسرع، أو الاتّجاهاتُ المائلة، أو دوراتٌ بالتوقيت.", "A faster rhythm, the diagonal directions, or timed rounds."],
    stopIf: ["ألمٌ فوق ٥ من ١٠، أو انفلات، أو تورّمٌ صباحَ اليوم التالي ⟵ يعود درجةً ويخبر الأخصائيّ؛ ولا قفزَ بعد الخياطة قبل إذن الجرّاح.",
      "Pain above 5/10, giving way, or swelling the next morning → back one level and tell the therapist; and no hopping after a repair before the surgeon allows it."],
    equipment: ["شريطٌ لاصق وأرضٌ مستوية غير زلقة.", "Tape and a flat, non-slip floor."],
    doseNote: ["٣ دورات × ٣ لكلّ ساق في أيّام المرحلة الثالثة (Kise 2016).", "3 × 3 rounds for each leg on phase-3 days (Kise 2016)."],
    images: [{ key: "hop-cross-four-directions-1", ar: "صليبٌ على الأرض والقفزُ على ساقٍ واحدة من مركزه إلى الأمام والجانبين والخلف والعودةُ إليه",
      en: "A cross on the floor, hopping on one leg from its centre forwards, sideways and backwards and back to it", search: "single leg hop cross four square" }],
  },
  {
    code: "prayer-deep-flexion-meniscus", nameAr: "الصلاة والجلوس على الأرض مع إصابة الغضروف الهلاليّ", nameEn: "Prayer and deep knee bending with a meniscal tear",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["يعيد المريضَ إلى أنشطةٍ يقدّرها فيها ثنيٌ عميق — السجودُ والجلوسُ للتشهّد والمرحاضُ العربيّ والجلوسُ على الأرض — بأمان: الركوعُ على الركبتين يبلغ نحو ١٤١° عند المصلّين (Acker 2011)، وفي الثني العميق يتحرّك الغضروفان إلى الخلف ويحملان حصّةً أكبر (Yao 2008)؛ والصلاةُ على الكرسيّ طويلاً اقترنت بوظيفةٍ أسوأ في خشونة الركبة (Ateef 2021). ولا دراسةَ تدخّلٍ للصلاة في الغضروف (بحثٌ صفريّ) — اقتراحٌ بقاعدة الألم والتورّم بحسب المسار، والحكمُ الشرعيّ للمريض ومرجعه.",
      "Brings the patient back safely to valued activities with deep bending — prostration, sitting for tashahhud, the squat toilet and floor sitting: kneeling reaches about 141° in worshippers (Acker 2011), and in deep flexion both menisci move backwards and carry a larger share of the load (Yao 2008); long-term chair prayer was associated with worse function in knee osteoarthritis (Ateef 2021). There is no intervention study of prayer in meniscal tears (a documented zero result) — a suggestion by the pain-and-swelling rule according to the pathway, with the religious ruling for the patient and their scholar."],
    start: ["سجّادةُ الصلاة، ووسادةٌ صلبة، وكرسيٌّ صغير، وكرسيٌّ ثابت قريب — وبعد الخياطة الكرسيُّ وحده حتى يسمح الجرّاح.",
      "A prayer mat, a firm cushion, a low stool, and a stable chair nearby — and after a repair the chair alone until the surgeon allows otherwise."],
    steps: [[
      "القيامُ والركوع واقفاً — والركوعُ بثني الركبتين قليلاً إن آلمه الظهر (Abou Hassan 2010).",
      "النزولُ إلى الركوع على الركبتين ممسكاً بالكرسيّ، على فرشةٍ ليّنة، والركبةُ السليمة أوّلاً.",
      "السجود: بوسادةٍ بين الأليتين والكعبين إن آلمه الثنيُ فوق نحو ١٢٠°.",
      "الجلوسُ بين السجدتين والتشهّد: على وسادةٍ صلبة أو كرسيٍّ صغير، تنخفض جلسةً بعد جلسة.",
      "القيامُ من الأرض بنصف ركوع والساقُ السليمة أمامك ويدٌ على الكرسيّ؛ والمرحاضُ العربيّ بمقعدٍ مرتفعٍ متنقّل أيّامَ التهيّج — ولا لفَّ على ركبةٍ مثنيّة.",
    ], [
      "Standing and bowing upright — bowing with slightly bent knees if the back hurts (Abou Hassan 2010).",
      "Getting down to kneeling while holding the chair, onto a soft mat, with the good knee first.",
      "Prostration: with a cushion between the buttocks and the heels if bending beyond about 120° hurts.",
      "Sitting between prostrations and for tashahhud: on a firm cushion or a low stool, lowered session by session.",
      "Rising from the floor through half-kneeling with the good leg in front and a hand on the chair; and the squat toilet with a portable raised seat on irritable days — never twisting on a bent knee.",
    ]],
    cues: [[
      "لفُّ الجذع على الركبتين آخرَ الصلاة ⟵ يُدار الرأسُ وحده، والاستدارةُ بعد القيام.",
      "السقوطُ إلى الثني الكامل بلا سند ⟵ نزولٌ بطيء ويدٌ على الكرسيّ.",
      "القيامُ على الساق المصابة ⟵ السليمةُ أوّلاً.",
      "البقاءُ على الكرسيّ دائماً بعد يومٍ مؤلم ⟵ الكرسيُّ للخطوة الحمراء وحدها ومؤقّتاً.",
    ], [
      "Twisting the trunk on the knees at the end of prayer → turn the head only, and turn the body after standing.",
      "Dropping into full bending without support → a slow descent with a hand on the chair.",
      "Rising on the injured leg → the good leg first.",
      "Staying on the chair for good after one painful day → the chair for the red step only, and only for now.",
    ]],
    easier: ["وسادةٌ أو كرسيٌّ أعلى، والسجودُ على الكرسيّ.", "A higher cushion or stool, and prostration on a chair."],
    harder: ["وسادةٌ أخفض ثمّ الأرضُ كاملةً، والقيامُ بلا سند.", "A lower cushion, then the floor fully, and rising without support."],
    stopIf: ["ألمٌ حادّ في الجهة الداخلية الخلفية للركبة، أو انحباس، أو «طقّة» (علامةُ جذر الغضروف)، أو ألمٌ فوق ٥ من ١٠، أو تورّمٌ صباحَ اليوم التالي ⟵ الخطوةُ السابقة ويخبر الأخصائيّ؛ وبعد الخياطة لا خطوةَ على الأرض قبل إذن الجرّاح.",
      "Sharp pain at the back-inner side of the knee, catching, or a 'pop' (a sign of a meniscal root tear), pain above 5/10, or swelling the next morning → back to the previous step and tell the therapist; and after a repair no floor step before the surgeon allows it."],
    equipment: ["سجّادة، ووسادةٌ صلبة، وكرسيٌّ صغير، وكرسيٌّ ثابت، ومقعدُ مرحاضٍ مرتفعٌ متنقّل عند الحاجة.", "A prayer mat, a firm cushion, a low stool, a stable chair, and a portable raised toilet seat when needed."],
    doseNote: ["كلُّ خطوةٍ ٣–٥ مرّات في الأيّام الخفيفة، ثمّ في الصلوات اليومية بقدر ما يتحمّل (اقتراح)؛ وبعد الخياطة الصلاةُ على الكرسيّ أربعةَ أشهرٍ على الأقلّ أو كما يقول الجرّاح (Pujol 2025).",
      "Each step 3–5 times on light days, then in the daily prayers as tolerated (a suggestion); after a repair, chair prayer for at least four months or as the surgeon says (Pujol 2025)."],
    images: [{ key: "prayer-deep-flexion-meniscus-1", ar: "وضعٌ معدَّل للصلاة: الجلوسُ على الكعبين بوسادةٍ تحت الأليتين أو الصلاةُ على كرسيّ",
      en: "A modified prayer position: sitting back on the heels with a cushion under the buttocks, or praying on a chair", search: "prayer kneeling cushion chair prayer" }],
  },
];

const PAIN_RULE_AR = "قاعدةُ الألم والتورّم (في كلّ المراحل) — الإشارةُ الضوئية: الألمُ أثناء التمرين وبعده ٠–٢ من ١٠ «آمن»، وحتى ٥ «مقبول»، وفوق ٥ «خطر» — مقياسُ تجربة ما بعد الاستئصال (Hall 2012)؛ والتورّمُ يُقاس باختبار المسح قبل كلّ يوم قوّة (Sturgill 2009). فالأخضرُ بلا تورّمٍ جديد: يتقدّم كما خُطّط؛ والأصفرُ (٣–٥) ويعود الألمُ إلى المعتاد صباحَ اليوم التالي والتورّمُ لم يزد: يعيد المستوى نفسَه؛ والأحمرُ — فوق ٥، أو أسوأ في الصباح، أو زاد التورّمُ درجةً أو بلغ ٢+ — جلسةٌ أو اثنتان أخفّ (الدراجةُ والانقباضُ الثابت والمدى) ثمّ يعود درجةً أدنى، وإن تكرّر الأحمرُ مرّتين في الأسبوع يُراجع التشخيص (اقتراحٌ يجمع مقياسَ ما بعد الاستئصال وقواعدَ الوجع في تأهيل الرباط الصليبيّ — Adams 2012).\n" +
  "وقواعدُ الوجع (Adams 2012): وجعُ الإحماء الذي يستمرّ ⟵ يومان راحةٌ ودرجةٌ أدنى؛ والذي يزول ⟵ يبقى في درجته؛ ووجعُ اليوم التالي في المفصل ⟵ يومُ راحةٍ ولا تقدّم؛ ولا وجعَ ⟵ يتقدّم درجةً في الأسبوع. ولا قفزَ ولا جريَ إلّا والتورّمُ أثرٌ أو أقلّ وقوّةُ الفخذ ٨٠٪ من الجهة الأخرى (Adams 2012). ولا قاعدةَ مجرَّبة خاصّة بالغضروف (بحثٌ صفريّ).";
const PAIN_RULE_EN = "The pain-and-swelling rule (all phases) — the traffic light: pain during and after exercise of 0–2/10 is 'safe', up to 5 is 'acceptable' and above 5 is 'high risk' — the scale of the post-meniscectomy trial (Hall 2012); swelling is graded with the stroke test before every strength day (Sturgill 2009). Green with no new swelling: progress as planned; amber (3–5) with pain back to usual by the next morning and swelling not increased: repeat the same level; red — above 5, worse in the morning, or swelling up one grade or reaching 2+ — one or two lighter sessions (cycling, static contractions and range of motion), then back one level lower, and red twice in a week means the diagnosis is reviewed (a proposal combining the post-meniscectomy scale and the soreness rules of ACL rehabilitation — Adams 2012).\n" +
  "The soreness rules (Adams 2012): warm-up soreness that continues → two days off and one level down; soreness that goes away → stay at that level; joint soreness the next day → one day off and no progression; no soreness → advance one level a week. No hopping or running until swelling is trace or less and quadriceps strength is 80% of the other side (Adams 2012). No meniscus-specific rule has been tested (a documented zero result).";

const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد بستّ جلسات (حتى ٣٠) إن بلغ مقياسٌ واحد على الأقلّ الفرقَ المهمّ (الألمُ نقطتين، أو نتائجُ الركبة: الألمُ +١٢ أو الأعراضُ +٨، أو مقياسُ الركبة الذاتيّ +١٠٫٩، أو الأنشطةُ المختارة +٢٫٥ — Pedersen 2021 · Noorduyn 2019 · Noorduyn 2020) ولم تتحقّق معاييرُ الخروج، والالتزامُ جيّد، ولا علامةَ إحالة. وبعد الاستئصال الجزئيّ ١٢ جلسة تمتدّ إلى ١٨ لمن استؤصل غضروفُه الوحشيّ أو تضرّر غضروفُه المفصليّ أو تجاوز الأربعين بتمزّقٍ تنكّسيّ أو لم يبلغ معاييرَه (Pujol 2025) — فالوحشيُّ أبطأ: ألمٌ وتورّمٌ عند ٦٩٪ مقابل ٨٪ للإنسيّ عند لاعبي الكرة (Nawabi 2014). ومَن لم يبلغ أيّ فرقٍ مهمّ في الجلسة ١٦ أو مراجعة الأسبوع السادس لا يُمدَّد: يُعاد الفحص (الخشونةُ، وتمزّقُ الجذر، والكسرُ تحت الغضروف، والورك، وأسفلُ الظهر)، وتُراجع الجرعةُ والالتزام، ويراجع طبيبَ المركز. وبعد الخروج: البرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين في الأسبوعين السادس والثاني عشر — والثاني عشرُ موعدُ قاعدة الأشهر الثلاثة (في «موانع وإحالة»)؛ وتفوّقُ قوّة الفخذ بالتمرين خفّ بعد خمس سنوات (Berg 2022) فالبرنامجُ يستمرّ. ولا تجربةَ لجلساتٍ تذكيرية في الغضروف (بحثٌ صفريّ).";
const EXTEND_EN = "At session 24: one extension of six sessions (to 30) if at least one measure has reached the important change (pain by 2 points, or the knee score: pain +12 or symptoms +8, or the subjective knee score +10.9, or the chosen activities +2.5 — Pedersen 2021 · Noorduyn 2019 · Noorduyn 2020) without meeting the discharge criteria, with good adherence and no referral trigger. After a partial meniscectomy, 12 sessions extended to 18 for a lateral meniscectomy, damaged joint cartilage, a degenerative tear over 40, or unmet milestones (Pujol 2025) — the lateral side is slower: pain and swelling in 69% versus 8% after medial meniscectomy in footballers (Nawabi 2014). A patient who has reached no important change by session 16 or the week-6 review is not extended: they are re-screened (osteoarthritis, a root tear, a subchondral insufficiency fracture, the hip and the low back), the dose and adherence are reviewed, and they see the centre's doctor. After discharge: the home programme to week 12 with reviews at weeks 6 and 12 — week 12 is the date of the three-month rule (under 'Contraindications and referral'); the strength advantage of exercise faded by five years (Berg 2022), so the programme continues. There is no trial of booster sessions for meniscal tears (a documented zero result).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "knee-meniscal-adult",
  summary: [
    "إصاباتُ الغضروف الهلاليّ (Meniscal tears) نوعان — التنكّسيّ عند من تجاوز ٣٥ سنة بلا إصابةٍ واضحة، يبدأ تدريجياً وغالباً في القرن الخلفيّ للغضروف الإنسيّ، وهو علامةُ ركبةٍ معرّضةٍ للخشونة أكثرَ منه سبباً مؤكّداً للألم (Beaufils 2017)؛ والإصابيّ بعد التواءٍ أو هبوطٍ أو قرفصاءٍ بحِمل مع ألمٍ مفاجئ وتورّمٍ خلال ساعاتٍ إلى يوم (Kopf 2020). وهذا البروتوكولُ للعلاج بلا جراحة ولما بعد الاستئصال الجزئيّ بالمنظار؛ وبعد خياطة الغضروف أو إصلاح جذره تحكم تعليماتُ الجرّاح (Pujol 2025)، والبطاقاتُ نفسُها داخل حدودها. " +
    "التمزّقُ شائعٌ في ركبٍ لا تؤلم: في الرنين عند ٣٥٪ ممّن بين ٥٠ و٩٠ سنة، و٦١٪ من أصحاب التمزّق لم يشكوا ألماً في الشهر السابق (Englund 2008)، وعند ٣٠٪ من بالغين بلا أعراض متوسّطُ عمرهم ٤٤ (Horga 2020)؛ ولا دراسةَ عراقية (بحثٌ صفريّ). وفي التنكّسيّ يتحسّن تسعةٌ من كلّ عشرة خلال سنتين أيّاً كان العلاج (Berg 2021)، والانحباسُ العابر والطقطقةُ لا ينبئان بفائدة الجراحة (Sihvonen 2016 · Wijn 2023)؛ وللاستئصال ثمن: مضاعفاتٌ خطيرة عند ٠٫٣٢٪ (Abram 2018)، واستبدالُ الركبة عند ١٣٫٥٪ خلال خمسَ عشرةَ سنة (Abram 2019). " +
    "الإرشادات: JOSPT — المدى النشط والسلبيّ المتدرّج بعد الجراحة B، والتمرينُ المشرَف عليه مع برنامجٍ منزليّ متدرّج B، والمدى وتقويةُ الركبة والورك والتمرينُ العصبيّ العضليّ للتمزّق وبعد الجراحة B، والتحفيزُ العضليّ بعد إجراءات الغضروف B (Logerstedt 2018)؛ والتوصيةُ السريعة في المجلّة الطبّية البريطانية: «توصيةٌ قوية ضدّ» المنظار في كلّ مرضى الركبة التنكّسية تقريباً ولو مع الانحباس العابر، إلّا ركبةً لا تمتدّ كاملاً (Siemieniuk 2017)؛ والجمعيةُ الأوروبية: لا جراحةَ أوّلاً للتنكّسيّ A، وثلاثةُ أشهرٍ إلى ستّة قبل أيّ جراحة A (Beaufils 2017)، وفي الإصابيّ الخياطةُ أو التركُ مفضَّلان والخياطةُ المبكّرة أنجح C (Kopf 2020)؛ والإجماعُ الأوروبيّ الأمريكيّ ٢٠٢٤: بعد الاستئصال حملُ الوزن كاملاً مبكّراً A والتأهيلُ بالمعايير لا بالزمن B (Pujol 2025)، وللتنكّسيّ العلاجُ بلا جراحة أوّلاً A (Prill 2025)؛ والأكاديميةُ الأمريكية لجرّاحي العظام: العلاجُ الطبيعيّ «قد يفيد» في الإصابيّ الحادّ (Brophy 2025)؛ والمعهدُ البريطانيّ: لا غسيلَ ولا تنظيفَ بالمنظار للخشونة (NICE NG226)؛ والهولنديّ: ثلاثةُ أشهرٍ بلا جراحة على الأقلّ للتنكّسيّ. " +
    "وفي التجارب: التمرينُ ١٢ أسبوعاً ساوى الاستئصالَ بعد سنتين (الفرقُ ٠٫٩ نقطة) وأعطى فخذاً أقوى (Kise 2016)؛ والعلاجُ الطبيعيّ ١٦ جلسة لم يقلّ عن الاستئصال بعد سنتين وخمس (van de Graaf 2018 · Noorduyn 2022)؛ والاستئصالُ لم يفُق الجراحةَ الوهمية (Sihvonen 2018)، والمنظارُ فاق الوهميَّ في المراجعة ٤٫٦ من ١٠٠ في الألم بلا فائدةٍ مهمّة (O'Connor 2022)؛ وفي الشباب لم تتفوّق الجراحةُ المبكّرة على ١٢ أسبوعاً من التمرين والتثقيف (Skou 2022)، ولا الاستئصالُ المبكّر على العلاج الطبيعيّ (van der Graaff 2022)؛ وإضافةُ ١٤ زيارةً في العيادة إلى برنامجٍ منزليّ لم تخفّف الألمَ أكثر (Katz 2025) — فالبرنامجُ المنزليّ نصفُ العلاج. " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ وقاعدةُ الألم والتورّم، والمدُّ الكامل وتنشيطُ الفخذ، والتقويةُ المتدرّجة للركبة والورك بقاعدة «زائد اثنين»، والتمرينُ العصبيّ العضليّ، والدراجة، ثمّ القفزُ والأنشطةُ اليومية (الصلاةُ والمرحاضُ والدرج) — والأجهزةُ مساعدة. " +
    "والعددُ ٢٤ جلسة بستٍّ في الأسبوع للعلاج بلا جراحة، و١٢ بعد الاستئصال الجزئيّ تمتدّ إلى ١٨ (يعدّلها الأخصائيُّ في خطّة المريض): التجاربُ مرّتين إلى ثلاثٍ في الأسبوع ٨–١٢ أسبوعاً — ١٦ جلسة (van de Graaf 2018) و٢٤ (Skou 2022) و٢٤–٣٦ (Kise 2016) — وبعد الاستئصال ٦–٩ جلساتٍ في أسبوعين أو ثلاثة (Moffet 1994 · Kelln 2009)، ولا تجربةَ لخمسٍ أو ستٍّ في الأسبوع (بحثٌ صفريّ)؛ فهو اختيارُ خدمةٍ مكتوبٌ صريحاً: التقويةُ الثقيلة يوماً بعد يوم كما في التجربة، وأيّامٌ خفيفة بينها.",
    "Meniscal tears are of two kinds — degenerative, in people over 35 without a clear injury, starting gradually and usually in the posterior horn of the medial meniscus, a sign of a knee at risk of osteoarthritis more than a proven source of pain (Beaufils 2017); and traumatic, after a twist, landing or loaded squat with sudden pain and swelling within hours to a day (Kopf 2020). This protocol covers non-operative care and rehabilitation after arthroscopic partial meniscectomy; after a meniscal repair or root repair the surgeon's instructions govern (Pujol 2025), with the same cards used within their limits. " +
    "Tears are common in knees that do not hurt: on MRI in 35% of people aged 50 to 90, and 61% of those with a tear had no knee pain in the previous month (Englund 2008), and in 30% of symptom-free adults with a median age of 44 (Horga 2020); there is no Iraqi study (a documented zero result). In degenerative tears nine in ten improve within two years whatever the treatment (Berg 2021), and occasional locking and clicking do not predict benefit from surgery (Sihvonen 2016 · Wijn 2023); meniscectomy has a cost: serious complications in 0.32% (Abram 2018) and knee replacement in 13.5% within fifteen years (Abram 2019). " +
    "Guidelines: JOSPT — progressive active and passive motion after surgery B, supervised exercise with a progressed home programme B, range of motion, knee and hip strengthening and neuromuscular training for tears and after surgery B, and neuromuscular stimulation after meniscal procedures B (Logerstedt 2018); the BMJ Rapid Recommendation: a 'strong recommendation against' arthroscopy in nearly all patients with degenerative knee disease, even with occasional locking, except a knee that cannot fully extend (Siemieniuk 2017); the European society: no surgery first for degenerative lesions A, and three to six months before any surgery A (Beaufils 2017), while for traumatic tears repair or leaving in situ is preferred and early repair does better C (Kopf 2020); the 2024 European–US consensus: after meniscectomy early full weight bearing A and criterion-based rather than time-based rehabilitation B (Pujol 2025), and non-operative care first for degenerative lesions A (Prill 2025); the American Academy of Orthopaedic Surgeons: physical therapy 'may benefit' acute traumatic tears (Brophy 2025); NICE: no arthroscopic lavage or debridement for osteoarthritis (NICE NG226); and the Dutch guideline: at least three months without surgery for degenerative tears. " +
    "In trials: 12 weeks of exercise equalled meniscectomy at two years (difference 0.9 points) with stronger thighs (Kise 2016); 16 physiotherapy sessions were non-inferior to meniscectomy at two and five years (van de Graaf 2018 · Noorduyn 2022); meniscectomy did not beat sham surgery (Sihvonen 2018), and in the review arthroscopy beat placebo by 4.6/100 for pain, with no important benefit (O'Connor 2022); in young adults early surgery did not beat 12 weeks of exercise and education (Skou 2022), nor early meniscectomy physiotherapy (van der Graaff 2022); and adding 14 clinic visits to a home programme did not reduce pain further (Katz 2025) — the home programme is half the treatment. " +
    "So the protocol: a core in every session — education and the pain-and-swelling rule, full extension and quadriceps activation, progressive knee and hip strengthening with the 'plus-two' rule, neuromuscular training and cycling, then hopping and daily activities (prayer, the toilet and stairs) — with devices as adjuncts. " +
    "The dose is 24 sessions at six a week for non-operative care, and 12 after a partial meniscectomy extended to 18 (set by the specialist in the patient's plan): trials used two to three a week for 8–12 weeks — 16 sessions (van de Graaf 2018), 24 (Skou 2022) and 24–36 (Kise 2016) — and after meniscectomy 6–9 sessions over two or three weeks (Moffet 1994 · Kelln 2009), and no trial tested five or six a week (a documented zero result); so it is a service choice stated openly: heavy strengthening every other day as in the trial, with light days in between.",
  ],
  goals: [
    "• الألمُ (من ١٠) ينقص نقطتين فأكثر — فوق خطأ القياس بالعربية ١٫٩٦ (Alghadir 2016).\n" +
    "• نتائجُ الركبة (KOOS) بالعربية: الألمُ +١٢ والأعراضُ +٨ — الفرقُ المهمّ بعد جراحة الغضروف — وعند الخروج حالةٌ يقبلها المريض: الألمُ ٧٤ والأعراضُ ٧٢ والأنشطةُ اليومية ٨١ والرياضةُ ٤٣ وجودةُ الحياة ٥٢ من ١٠٠ (Pedersen 2021 · Almangoush 2013)؛ أو مقياسُ الركبة الذاتيّ (IKDC) +١٠٫٩ (Noorduyn 2019).\n" +
    "• المدُّ كامل (لا ينقص أكثرَ من ٥° عن الركبة الأخرى) والثنيُ ١٢٠° فأكثر، والتورّمُ «أثرٌ» أو لا شيء في اختبار المسح (Sturgill 2009) — اقتراح.\n" +
    "• قوّةُ مادّات الركبة ٨٠٪ من الجهة الأخرى قبل الجري، و٩٠٪ مع اختبارات القفز ٩٠٪ قبل الرياضة (Stensrud 2014 · Reid 2007 · Adams 2012).\n" +
    "• الأنشطةُ التي يختارها المريض بالعربية (السجودُ والتشهّد، والدرج، والمرحاضُ العربيّ، والعمل) تتحسّن ٢٫٥ نقطة لكلٍّ منها (Noorduyn 2020 · Alnahdi 2022).\n" +
    "• برنامجٌ منزليّ يؤدّيه وحده حتى الأسبوع الثاني عشر — موعدُ قاعدة الأشهر الثلاثة — وخطّةٌ للنوبة.\n" +
    "• فهمُ الحالة: التمزّقُ في الرنين شائعٌ في ركبٍ لا تؤلم، والتمرينُ يساوي الاستئصالَ للتنكّسيّ ويقوّي الفخذ، ومتى يعود فوراً.",
    "• Pain (out of 10) down 2 points or more — beyond the Arabic measurement error of 1.96 (Alghadir 2016).\n" +
    "• The Knee injury and Osteoarthritis Outcome Score (KOOS) in Arabic: pain +12 and symptoms +8 — the important change after meniscal surgery — and at discharge a state the patient finds acceptable: pain 74, symptoms 72, daily activities 81, sport 43 and quality of life 52 out of 100 (Pedersen 2021 · Almangoush 2013); or the subjective knee score (IKDC) +10.9 (Noorduyn 2019).\n" +
    "• Full extension (no more than 5° short of the other knee) and flexion of 120° or more, with swelling 'trace' or none on the stroke test (Sturgill 2009) — a suggestion.\n" +
    "• Quadriceps strength 80% of the other side before running, and 90% with hop tests at 90% before sport (Stensrud 2014 · Reid 2007 · Adams 2012).\n" +
    "• The activities the patient chooses, in Arabic (prostration and tashahhud, stairs, the squat toilet, work), each up 2.5 points (Noorduyn 2020 · Alnahdi 2022).\n" +
    "• A home programme done independently to week 12 — the date of the three-month rule — with a flare plan.\n" +
    "• Understanding of the condition: a tear on MRI is common in knees that do not hurt, exercise equals meniscectomy for degenerative tears and strengthens the thigh, and when to come back at once.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج (نحو ٦٠ دقيقة):\n" +
    "• المسار: (أ) تنكّسيّ — ٣٥ سنة فأكثر بلا إصابةٍ واضحة، وغالباً مع بعض الخشونة؛ (ب) إصابيّ — إصابةٌ واضحة ثمّ ألمٌ مفاجئ، ومن ٤٥ سنة فأقلّ يُعامل هكذا لفحص إمكان الخياطة؛ (ج) بعد الاستئصال الجزئيّ — ويُقرأ تقريرُ العملية: الإنسيّ أم الوحشيّ، وكم استؤصل، وحالُ الغضروف المفصليّ؛ (د) بعد الخياطة أو إصلاح الجذر — قيودُ الجرّاح تُكتب في الجلسة الأولى (Pujol 2025).\n" +
    "• التاريخ: آليةُ الإصابة، ومتى ظهر التورّم (خلال ساعتين يرجّح الرباطَ أو كسراً غضروفياً عظمياً، وبعد ٦–٢٤ ساعة يرجّح الغضروف — Logerstedt 2018)، والانحباسُ الثابت أم العابر، والانفلات، والألمُ الليليّ، والألمُ الإنسيّ الشديد المفاجئ، و«طقّةٌ» في الثني العميق، والحمّى، وألمُ الساق، والحقنُ وتوقيتُها، والسكّريّ والمميّعاتُ والسرطان، والعملُ (الركوعُ والقرفصاءُ والحمل)، وعاداتُ الصلاة والمرحاض، والأهداف.\n" +
    "• التشخيص: ألمُ خطّ المفصل عند الضغط حساسيتُه ٧٦٪ ونوعيتُه ٧٧٪، وماكموري ٥٥٪ و٧٧٪ (Logerstedt 2018)، واجتماعُ التاريخ والفحص أدقّ من اختبارٍ واحد — في الإصابيّ نسبةُ الأرجحية الموجبة ٨٫٩ (Decary 2018)؛ واختبارُ ثيسالي لم تتكرّر دقّتُه الأولى في الرعاية الأوّلية (Blyth 2015). وفي التنكّسيّ قد يكون التمزّقُ عارضاً لا سببَ الألم (Englund 2008)، والأشعّةُ واقفاً قبل الرنين عند متوسّطي العمر وكبارهم (Beaufils 2017).\n" +
    "• الفحص (JOSPT B): التورّمُ باختبار المسح المعدَّل (لا شيء · أثر · ١+ · ٢+ · ٣+؛ اتّفاقُ فاحصَين كابا ٠٫٧٥ — Sturgill 2009)، والمدى النشط والسلبيّ بالمنقلة بالفاحص نفسِه (Watkins 1991 · Brosseau 2001) ونقصُ المدّ عن الركبة الأخرى، وقوّةُ مادّات الركبة بمقياس اليد إن توفّر (Mentiplay 2015) وتأخّرُ المدّ في رفع الساق، والألمُ مع فرط المدّ القسريّ ومع أقصى الثني السلبيّ، وماكموري وألمُ خطّ المفصل، والمشية؛ وفحصُ الورك وأسفل الظهر.\n" +
    "• المقاييس: المزروعةُ — نتائجُ الركبة (KOOS) بالنسخة العربية المصرية المُتحقَّقة في إصابات الرباط والغضروف (Almangoush 2013)، ومقياسُ الركبة الذاتيّ (IKDC) بالعربية (Ahmed 2019 · Almalki 2022)، وثنيُ الركبة — ويُضاف: الألمُ بالعربية (Alghadir 2016)، والأنشطةُ المختارة بالعربية (Alnahdi 2022)، ودرجةُ التورّم، ونقصُ المدّ، ونسبةُ قوّة الفخذ إلى الجهة الأخرى، واختباراتُ القفز للشباب والرياضيّين حين يصير التورّمُ أثراً أو أقلّ (Reid 2007)، والجلوسُ والقيامُ ٣٠ ثانية للتنكّسيّ (Jones 1999)؛ ومقياسُ الغضروف الهلاليّ (WOMET) بالعربية خيارٌ جديد (Albishi 2026).\n" +
    "• يُعاد التقييمُ في الجلسات ٦ و١٦ و٢٤ (و٣٠ إن مُدّد) وفي الأسبوعين ٦ و١٢، وبعد الاستئصال في ٤ و٨ و١٢؛ وقاعدةُ الألم والتورّم وأسئلةُ الإحالة في كلّ جلسة.",
    "At the first session, before any treatment (about 60 minutes):\n" +
    "• The pathway: (A) degenerative — 35 or over without a clear injury, usually with some osteoarthritis; (B) traumatic — a clear injury followed by sudden pain, and anyone 45 or younger is managed this way so that repair can be considered; (C) after a partial meniscectomy — read the operation note: medial or lateral, how much was removed, and the state of the joint cartilage; (D) after a repair or root repair — the surgeon's restrictions are written down at the first session (Pujol 2025).\n" +
    "• History: the mechanism, when the swelling appeared (within two hours suggests a ligament or an osteochondral fracture, after 6–24 hours a meniscal tear — Logerstedt 2018), fixed or brief locking, giving way, night pain, sudden severe medial pain, a 'pop' in deep bending, fever, calf pain, injections and their timing, diabetes, anticoagulants and cancer, work (kneeling, squatting and lifting), prayer and toilet habits, and goals.\n" +
    "• Diagnosis: joint-line tenderness has a sensitivity of 76% and a specificity of 77%, and McMurray 55% and 77% (Logerstedt 2018), and history and examination together are more accurate than any single test — for traumatic tears a positive likelihood ratio of 8.9 (Decary 2018); the Thessaly test did not reproduce its original accuracy in primary care (Blyth 2015). In degenerative knees the tear may be incidental rather than the cause of pain (Englund 2008), and weight-bearing radiographs come before MRI in middle-aged and older patients (Beaufils 2017).\n" +
    "• Examination (JOSPT B): swelling with the modified stroke test (zero · trace · 1+ · 2+ · 3+; agreement between two examiners kappa 0.75 — Sturgill 2009), active and passive range with a goniometer by the same examiner (Watkins 1991 · Brosseau 2001) and the extension deficit compared with the other knee, quadriceps strength with a handheld dynamometer if available (Mentiplay 2015) and any extensor lag on the straight-leg raise, pain on forced hyperextension and on maximum passive flexion, McMurray and joint-line tenderness, and gait; and screening of the hip and low back.\n" +
    "• Measures: the seeded ones — the KOOS in its Egyptian Arabic version validated in ligament and meniscal injuries (Almangoush 2013), the subjective knee score (IKDC) in Arabic (Ahmed 2019 · Almalki 2022), and knee flexion — and add: pain in Arabic (Alghadir 2016), the Arabic Patient-Specific Functional Scale (Alnahdi 2022), the swelling grade, the extension deficit, quadriceps strength as a percentage of the other side, hop tests for young and sporting patients once swelling is trace or less (Reid 2007), and the 30-second chair stand for degenerative tears (Jones 1999); the Western Ontario Meniscal Evaluation Tool (WOMET) in Arabic is a new option (Albishi 2026).\n" +
    "• The assessment is repeated at sessions 6, 16 and 24 (and 30 if extended) and at weeks 6 and 12, and after meniscectomy at 4, 8 and 12; the pain-and-swelling rule and the referral questions at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• التثقيفُ أوّلاً وفي كلّ جلسة: التمزّقُ شائعٌ في ركبٍ لا تؤلم ويتحسّن أكثرُ المرضى، والتمرينُ يساوي الاستئصالَ للتنكّسيّ ويقوّي الفخذ (Kise 2016 · Berg 2021)، والطقطقةُ والانحباسُ العابر لا يعنيان أنّ الجراحة ستنفع (Sihvonen 2016)، وقد يزيد الألمُ حين يبدأ التمرين (NICE NG226)، ومتى يعود فوراً.\n" +
    "• أيّامُ القوّة الثلاثة يوماً بعد يوم وبينها ٤٨ ساعة — برنامجُ التجربة النرويجية (Kise 2016): إحماءٌ على الدراجة حتى ٢٠ دقيقة، ثمّ ضغطُ الساقين ومدُّ الركبة وثنيُها — على ساقٍ واحدة من ٩٠° — بمجموعتين × ١٥ ثمّ ٣ × ١٢ ثمّ ٣ × ٨ ثمّ ٤ × ٦، وقاعدةُ «زائد اثنين»: آخرُ مجموعةٍ إلى أقصى عدد، فإن زاد مرّتين فأكثر يُرفع الثقلُ في الجلسة التالية؛ ومعها القرفصاءُ والقرفصاءُ على ساقٍ وصعودُ الدرجة ٣ × ١٠ والركبةُ فوق الأصابع.\n" +
    "• الأيّامُ الخفيفة: ثباتُ الركبة ضدّ المطّاط ٣ × ١٠ وثنيُ الركبتين بالكرة ٣ × ٨ (Kise 2016)، والتوازنُ والوركُ بمستوياتٍ من اثنين إلى ستّة، ١٠–١٥ مرّة × ٢–٣ (Skou 2017)، والمدى، والمشيُ، والتثقيفُ ومراجعةُ البرنامج المنزليّ.\n" +
    "• أوّلَ الأمر وبعد الاستئصال: المدُّ الكامل قبل كلّ شيء، وشدُّ الفخذ ورفعُ الساق والمدُّ الأخير بالمطّاط، والدراجةُ للمدى (Kelln 2009)، والتبريدُ مع الضغط ورفعُ الساق للتورّم (Hrubar 2023)، والعكّازان حتى تصير المشيةُ طبيعية (Pujol 2025).\n" +
    "• القفزُ والأنشطةُ اليومية في المرحلة الثالثة: قفزةُ المتزلّج ٣ × ١٠ والقفزُ على الصليب ٣ × ٣ دورات (Kise 2016)، ثمّ الجريُ المتدرّج للرياضيّ، والصلاةُ والمرحاضُ العربيّ والقيامُ من الأرض بقاعدة الألم.\n" +
    "• البرنامجُ المنزليّ من الجلسة الأولى: تمارينُ الأيّام الخفيفة يومياً ١٠–١٥ دقيقة، وبعد الخروج تمارينُ القوّة مرّتين إلى ثلاثٍ في الأسبوع حتى الأسبوع الثاني عشر — نحو ١٠٠ دقيقة في الأسبوع كما في التجربة الأمريكية (Katz 2025).\n" +
    PAIN_RULE_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Education first and at every session: tears are common in knees that do not hurt and most patients improve, exercise equals meniscectomy for degenerative tears and strengthens the thigh (Kise 2016 · Berg 2021), clicking and brief locking do not mean surgery will help (Sihvonen 2016), pain may rise when exercise starts (NICE NG226), and when to come back at once.\n" +
    "• Three strength days every other day with 48 hours between — the Norwegian trial's programme (Kise 2016): a warm-up on the bike of up to 20 minutes, then the leg press, knee extension and knee curl — one leg at a time from 90° — at 2 × 15, then 3 × 12, then 3 × 8, then 4 × 6, with the 'plus-two' rule: the last set to the maximum, and if two or more extra repetitions are possible the load goes up next session; together with squats, single-leg squats and step-ups at 3 × 10 with the knee over the toes.\n" +
    "• Light days: knee stability against a band at 3 × 10 and the ball hamstring curl at 3 × 8 (Kise 2016), balance and hip work at levels two to six, 10–15 repetitions × 2–3 (Skou 2017), range of motion, walking, and education with a review of the home programme.\n" +
    "• Early on and after meniscectomy: full extension before anything else, quadriceps setting, the straight-leg raise and terminal extension with a band, the bike for range (Kelln 2009), cold with compression and elevation for swelling (Hrubar 2023), and two crutches until gait is normal (Pujol 2025).\n" +
    "• Hopping and daily activities in phase 3: the skater hop at 3 × 10 and the hop cross at 3 × 3 rounds (Kise 2016), then graded running for sporting patients, and prayer, the squat toilet and rising from the floor by the pain rule.\n" +
    "• The home programme from session 1: the light-day exercises daily for 10–15 minutes, and after discharge the strength exercises two to three times a week to week 12 — about 100 minutes a week, as in the American trial (Katz 2025).\n" +
    PAIN_RULE_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: هل انحبست الركبةُ فلا تمتدّ، أو صارت حارّةً حمراء مع حمّى، أو تورّمت الساقُ أو ضاق النفَس، أو جاء ألمٌ إنسيّ شديد مفاجئ، أو «طقّة» في الثني العميق، أو خدرٌ أو ضعف — فالتشخيصُ يُراجع إن لم يتّسق مع الغضروف (Logerstedt 2018).\n" +
    "• إحالةٌ في اليوم نفسِه: ركبةٌ منحبسة حقاً — عجزٌ ثابت عن المدّ الكامل بحاجزٍ نابض لا يزول بالارتخاء بعد التواءٍ أو قرفصاء — والإرشادُ الهولنديّ يجعل المنظارَ خلال أسبوعين، وهي الاستثناءُ الوحيد في التوصية البريطانية (Siemieniuk 2017 · Brophy 2025)؛ أمّا الانحباسُ الكاذب — ثوانٍ وتنفكّ، أو مدٌّ يحدّه الألمُ والتورّم ويتحسّن بتهدئتهما — فلا يُحال وحده، والشكُّ ⟵ رأيُ العظام في الأسبوع نفسِه. وتورّمٌ مشدود خلال ساعتين إلى ١٢ ساعة من الإصابة — الرباطُ الصليبيّ أو كسرٌ غضروفيّ عظميّ حتى يثبت غيرُه (٧١ من ١٠٦ رياضيّين — Maffulli 1993)؛ وإصابةٌ مع قاعدة أوتاوا موجبة ⟵ صورةٌ شعاعية (حساسيتُها ٩٨٫٥٪ — Bachmann 2004)؛ وحمّى أو ركبةٌ حارّةٌ متورّمة، خاصّةً بعد المنظار (التهابٌ احتاج جراحةً عند ٠٫١٣٥٪ — Abram 2018) أو بعد حقنة؛ وألمُ الساق وتورّمُها أو ضيقُ النفَس بعد المنظار (جلطةٌ بأعراض ٠٫٣٤٪ — Krych 2015) ⟵ الطبيبُ بقاعدة ويلز (Wells 2003)؛ وقدمٌ باردة شاحبة بعد إصابة.\n" +
    "• إحالةٌ خلال أيّامٍ إلى أسبوعين: كلُّ من عمرُه ٤٥ فأقلّ بإصابةٍ واضحة وتمزّقٍ محتمل ⟵ رأيُ جرّاح العظام في إمكان الخياطة خلال أسبوعين إلى ثلاثة من الإصابة والتمرينُ يبدأ — فالفشلُ ٧٫٢٪ إن خيط خلال ثلاثة أسابيع و١٥٫٣٪ بعدها (van der List 2025 · Kopf 2020)؛ وتمزّقُ جذر الغضروف الإنسيّ — «طقّةٌ» مؤلمة واحدة في الثني العميق أو الدرج ثمّ ألمٌ خلفيّ إنسيّ عند امرأةٍ في منتصف العمر (القيمةُ التنبّئية ٩٦٫٥٪ — Bae 2013) — ⟵ رأيٌ جراحيّ خلال أسابيع، فبلا إصلاحٍ صار الاستبدالُ عند ٣١٪ خلال خمس سنوات و٥٣٪ بعد نحو ١٤ (Krych 2017 · Krych 2023)؛ والكسرُ تحت الغضروف — ألمٌ إنسيّ شديدٌ مفاجئ وليليّ عند كبيرة، أو بعد الاستئصال (٠٫٢–١٫٥٪ — Yamaguchi 2021 · Pareek 2020) — ⟵ يتوقّف القفزُ والثنيُ المحمَّل ورنينٌ عبر الطبيب؛ واختبارُ لاكمان موجبٌ أو انفلاتٌ ⟵ العظام؛ وألمٌ ليليّ أو نقصُ وزن أو سرطانٌ سابق، أو تيبّسٌ صباحيّ أطولُ من ساعة ومفاصلُ أخرى، أو ألمٌ من الورك أو أسفل الظهر.\n" +
    "• مراجعةُ الطبيب: ألمٌ يمنع البرنامجَ رغم التخفيف نحو أسبوعين، أو تورّمٌ ٢+ لا يهدأ في أسبوعٍ أو اثنين (سحبُ السائل واستبعادُ الالتهاب والبلّورات)؛ ولا حقنةَ كورتيزون خلال أسبوعين بعد المنظار (رفعت الالتهابَ ٣٫٣١ مرّة — Dubin 2025)؛ وأمراضُ القلب والضغطُ غيرُ المنضبط ⟵ إذنٌ قبل الأثقال الثقيلة والقفز (قاعدةٌ عامّة).\n" +
    "• قواعدُ هذا البروتوكول (اقتراح): الجلسةُ ٦ بتورّمٍ ٢+ أو ألمٍ يمنع التمرين ⟵ طبيبُ المركز؛ والجلسةُ ١٦ أو الأسبوعُ السادس بلا فرقٍ مهمّ ⟵ يُعاد الفحصُ ويراجع الطبيب؛ والأسبوعُ الثاني عشر — قاعدةُ الأشهر الثلاثة — وألمٌ أو انحباسٌ لا يقبله رغم التمرين بالتزام ⟵ رأيُ جرّاح العظام إن أراده، ويُخبر أنّ الاستئصال يساوي التمرينَ والجراحةَ الوهمية في التنكّسيّ (Beaufils 2017 · Sihvonen 2018)، وفي التجارب انتقل إلى الجراحة ١٩–٣٨٪ (Kise 2016 · Katz 2020)؛ وبعد الجراحة: ألمٌ مستمرّ أو تيبّسٌ أو تورّمٌ يتكرّر أو انفلاتٌ أو انحباسٌ أو أعراضٌ عصبية أو التهابٌ أو جلطة ⟵ الجرّاح (Pujol 2025)، ونقصُ مدٍّ ثابت بعد الاستئصال لا يتحسّن بتهدئة التورّم نحو أسبوعين ⟵ الجرّاح.\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): المرهمُ المضادّ للالتهاب أوّلاً ثمّ الحبوبُ إن لم يكفِ (NICE NG226)؛ وحقنةُ الكورتيزون للتمزّق التنكّسيّ أبقت النتيجةَ جيدةً عند ٧٩٪ مقابل ٦١٪ بعد تنظيف المنظار في سنة (Vermesan 2013)، وحقنةُ الهيالورونيك آخرَ الاستئصال لم تُفد (Filardo 2016)، والصفائحُ الدموية بأدلّةٍ ضعيفة وإرشاداتٍ متعارضة؛ والاستئصالُ لا يفوق التمرين وقد يزيد تقدّمَ الخشونة قليلاً (Sihvonen 2020)؛ والخياطةُ تفشل عند ١٩٫٥–٢٢٫٦٪ بعد خمس سنوات لكنّها تحفظ الغضروف (Nepple 2022 · Paxton 2011).\n" +
    "موانعُ الأجهزة: منظّمُ ضربات القلب والورمُ والجلدُ المجروح أو ضعيفُ الإحساس وفتحاتُ المنظار قبل التئامها للتحفيز والتيكار والمغناطيس والحرارة؛ والمعدنُ في مجال التيكار؛ ولا ضغطَ على ساقٍ يُشكّ في جلطتها؛ ولا حرارةَ على ركبةٍ متورّمة حديثاً.",
    "Before every session: has the knee locked so it will not straighten, become hot and red with fever, has the calf swollen or breathing become short, has sudden severe medial pain or a 'pop' in deep bending appeared, or numbness or weakness — the diagnosis is revised if it does not fit a meniscal problem (Logerstedt 2018).\n" +
    "• Same-day referral: a truly locked knee — a fixed inability to extend fully with a springy block that does not ease with relaxation, after a twist or a squat — for which the Dutch guideline sets arthroscopy within two weeks, and which is the only exception in the BMJ recommendation (Siemieniuk 2017 · Brophy 2025); pseudo-locking — seconds and it frees itself, or extension limited by pain and swelling that improves as they settle — is not referred on its own, and doubt → an orthopaedic opinion the same week. A tense swelling within two to twelve hours of injury — an ACL tear or an osteochondral fracture until proved otherwise (71 of 106 athletes — Maffulli 1993); an injury with a positive Ottawa rule → a radiograph (sensitivity 98.5% — Bachmann 2004); fever or a hot swollen knee, especially after arthroscopy (infection needing surgery in 0.135% — Abram 2018) or after an injection; calf pain and swelling or breathlessness after arthroscopy (symptomatic thrombosis 0.34% — Krych 2015) → the doctor with the Wells rule (Wells 2003); and a cold, pale foot after an injury.\n" +
    "• Referral within days to two weeks: anyone aged 45 or younger with a clear injury and a likely tear → an orthopaedic opinion on repair within two to three weeks of the injury while exercise starts — failure is 7.2% when repaired within three weeks and 15.3% after (van der List 2025 · Kopf 2020); a medial meniscal root tear — a single painful 'pop' in deep bending or on stairs, then posteromedial pain, in a middle-aged woman (positive predictive value 96.5% — Bae 2013) → a surgical opinion within weeks, since without repair 31% had a replacement within five years and 53% after about 14 (Krych 2017 · Krych 2023); a subchondral insufficiency fracture — sudden severe medial pain at night in an older woman, or after meniscectomy (0.2–1.5% — Yamaguchi 2021 · Pareek 2020) → stop hopping and loaded bending, and MRI through the doctor; a positive Lachman test or giving way → orthopaedics; and night pain, weight loss or a past cancer, morning stiffness over an hour with other joints involved, or pain from the hip or low back.\n" +
    "• A medical review: pain that blocks the programme despite load modification for about two weeks, or 2+ swelling not settling within one or two weeks (aspiration and exclusion of infection and crystals); no steroid injection within two weeks after arthroscopy (it raised infection 3.31-fold — Dubin 2025); and heart disease or uncontrolled blood pressure → clearance before heavy loads and hopping (a general rule).\n" +
    "• This protocol's rules (a suggestion): session 6 with 2+ swelling or pain blocking exercise → the centre's doctor; session 16 or week 6 with no important change → re-screen and a medical review; week 12 — the three-month rule — with pain or locking the patient finds unacceptable despite adherent exercise → an orthopaedic opinion if they want one, with the information that meniscectomy equals exercise and sham surgery for degenerative tears (Beaufils 2017 · Sihvonen 2018), and in trials 19–38% crossed over to surgery (Kise 2016 · Katz 2020); after surgery: persistent pain, stiffness, recurrent swelling, giving way, locking, neurological symptoms, infection or thrombosis → the surgeon (Pujol 2025), and a fixed extension deficit after meniscectomy not improving with swelling control over about two weeks → the surgeon.\n" +
    "• What the patient is told (the doctor's decision): an anti-inflammatory gel first, then tablets if it is not enough (NICE NG226); a steroid injection for a degenerative tear kept a good result in 79% versus 61% after arthroscopic debridement at one year (Vermesan 2013), hyaluronic acid at the end of meniscectomy did not help (Filardo 2016), and platelet-rich plasma has weak evidence and conflicting guidelines; meniscectomy does not beat exercise and may slightly add to osteoarthritis progression (Sihvonen 2020); and repair fails in 19.5–22.6% at five years but preserves the meniscus (Nepple 2022 · Paxton 2011).\n" +
    "Contraindications to devices: a pacemaker, tumour, broken or poorly sensate skin and unhealed arthroscopy portals for stimulation, Tecar, magnetic therapy and heat; metal in the Tecar field; no compression on a leg with a suspected thrombosis; and no heat on a recently swollen knee.",
  ],
  precautions: [
    "• قاعدةُ الألم والتورّم في «التمارين» لكلّ المراحل؛ والقوّةُ الثقيلة يوماً بعد يوم وبينها ٤٨ ساعة، وأيّامُ ما بينها للمدى والتمرين العصبيّ العضليّ والتوازن والدراجة والمشي والمهامّ اليومية والتثقيف.\n" +
    "• بعد الاستئصال الجزئيّ: حملُ الوزن كاملاً بقدر ما يتحمّل والمدى كاملاً (Pujol 2025)، والعكّازان أو عكّازٌ في اليد المقابلة حتى المشي بلا عرج والتورّمُ ١+ أو أقلّ — أيّامٌ لا أسابيع؛ والإشرافُ أنفعُ في الأسبوعين أو الثلاثة الأولى: تسعُ جلساتٍ في ثلاثة أسابيع قلّلت ضعفَ الفخذ ٢٦٪ (Moffet 1994)، وبعدها البرنامجُ المنزليّ المُتقَن يساوي المشرَفَ عليه عند الشباب (Goodwin 2003 · Nutarelli 2021).\n" +
    "• بعد الخياطة أو إصلاح الجذر: لا يضع هذا البروتوكولُ قيوداً — تُكتب قيودُ الجرّاح في الجلسة الأولى ويُعمل داخلها، وفي الإجماع: الشعاعيُّ والجذرُ بلا حملٍ ٤–٦ أسابيع والثنيُ ٠–٩٠°، ولا قرفصاءَ عميقة ولا قفزَ ولا لفَّ أربعةَ أشهرٍ على الأقلّ D (Pujol 2025) — فالصلاةُ على الكرسيّ في تلك المدّة إلّا إن قال الجرّاحُ غيرَ ذلك؛ وأيُّ تعارضٍ ⟵ الجرّاح.\n" +
    "• الدعّامة والنعل والشريط: لا دعّامةَ روتينية — دعّامةُ تخفيف الحِمل لمن ركبتُه مقوّسة مع تمزّقٍ إنسيّ تنكّسيّ وخشونة حين لا يكفي التمرين، بعد الطبيب أو أخصائيّ الأجهزة (Prill 2025)، ودليلُها في الغضروف ميكانيكيٌّ فقط (Shriram 2019)؛ ولا نعلَ مائلاً (Brophy 2022)؛ والشريطُ الحركيّ راحةٌ قصيرة لا علاج.\n" +
    "• الوزن: كلُّ خسارةٍ تفيد الركبة و١٠٪ أفضلُ من ٥٪ (NICE NG226)، والوزنُ الزائد ينبئ بمسارٍ أسوأ (Berg 2021).\n" +
    "• العمل: الركوعُ والقرفصاءُ في العمل يرفعان خطرَ التمزّق التنكّسيّ ٣٫٨ و٢٫٩ مرّة (Baker 2002) — فالعمّالُ والفلّاحون وعمّالُ البلاط: وسادةٌ للركبتين وكرسيٌّ صغير وفتراتُ راحة.\n" +
    "• الصلاةُ والجلوسُ على الأرض والمرحاضُ العربيّ: الركوعُ على الركبتين يبلغ نحو ١٤١° عند المصلّين (Acker 2011)، وفي الثني العميق يتحرّك الغضروفان إلى الخلف ويحملان حصّةً أكبر (Yao 2008)؛ والقرفصاءُ والجلوسُ على الأرض لم يقترنا بتمزّق الجذر في كوريا (Hwang 2012)، ولا دليلَ على أنّ الصلاة تُحدث التمزّق، ولا دراسةَ تدخّل (بحثٌ صفريّ) — فبطاقةُ «الصلاة والجلوس على الأرض مع إصابة الغضروف الهلاليّ»: بلا جراحة وبعد الاستئصال بقاعدة الألم ووسادة، وبعد الخياطة على الكرسيّ أربعةَ أشهر، ومع الشكّ في الجذر لا ثنيَ عميقاً محمَّلاً؛ والصلاةُ على الكرسيّ طويلاً اقترنت بوظيفةٍ أسوأ في الخشونة (Ateef 2021) فالعودةُ إلى الأرض هدف؛ والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• المناخُ والحضور: حرُّ الصيف يفضّل الدراجةَ في الداخل؛ ومن لا يستطيع الحضورَ يومياً يُعطى البديل: مرّتين إلى ثلاثٍ في الأسبوع ثمانيةَ أسابيع إلى اثني عشر كما في التجارب (بندٌ لسليم).",
    "• The pain-and-swelling rule under 'Exercises' for every phase; heavy strength every other day with 48 hours between, and the days between for range of motion, neuromuscular training, balance, cycling, walking, daily tasks and education.\n" +
    "• After a partial meniscectomy: full weight bearing as tolerated and full range (Pujol 2025), with two crutches or one in the opposite hand until walking without a limp and swelling is 1+ or less — days, not weeks; supervision helps most in the first two or three weeks: nine sessions over three weeks cut the quadriceps deficit by 26% (Moffet 1994), and after that a well-taught home programme equals supervised care in young patients (Goodwin 2003 · Nutarelli 2021).\n" +
    "• After a repair or root repair: this protocol sets no restrictions — the surgeon's restrictions are written down at the first session and followed, and in the consensus radial and root repairs have no weight bearing for 4–6 weeks with flexion 0–90°, and no deep squatting, jumping or twisting for at least four months D (Pujol 2025) — so prayer is on a chair in that period unless the surgeon says otherwise; any conflict → the surgeon.\n" +
    "• Brace, insoles and tape: no routine brace — an unloader brace for a bowed knee with a degenerative medial tear and osteoarthritis when exercise is not enough, after the doctor or the orthotist (Prill 2025), with only biomechanical evidence for the meniscus (Shriram 2019); no wedged insoles (Brophy 2022); and kinesiology tape is brief comfort, not treatment.\n" +
    "• Weight: any loss helps the knee and 10% is better than 5% (NICE NG226), and excess weight predicts a poorer course (Berg 2021).\n" +
    "• Work: kneeling and squatting at work raise the risk of a degenerative tear 3.8- and 2.9-fold (Baker 2002) — so labourers, farmers and floor layers: knee pads, a low stool and breaks.\n" +
    "• Prayer, floor sitting and the squat toilet: kneeling reaches about 141° in worshippers (Acker 2011), and in deep flexion both menisci move backwards and carry a larger share of the load (Yao 2008); squatting and floor sitting were not associated with root tears in Korea (Hwang 2012), there is no evidence that prayer causes tears, and there is no intervention study (a documented zero result) — so the card 'Prayer and deep knee bending with a meniscal tear': without surgery and after meniscectomy by the pain rule with a cushion, after a repair on a chair for four months, and with a suspected root tear no loaded deep bending; long-term chair prayer was associated with worse function in osteoarthritis (Ateef 2021), so returning to the floor is a goal; the religious ruling is for the patient and their scholar.\n" +
    "• Climate and attendance: summer heat favours indoor cycling; and those who cannot attend daily are offered the alternative: two to three times a week for eight to twelve weeks, as in the trials (an item for Saleem).",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "Osteoarthritis in over 16s: diagnosis and management (NG226)", org: "NICE — National Institute for Health and Care Excellence", year: 2022, url: "https://www.nice.org.uk/guidance/ng226" },
    { title: "Knee Pain and Mobility Impairments: Meniscal and Articular Cartilage Lesions Revision 2018 (full text)", org: "APTA Academy of Orthopaedic Physical Therapy (hosted copy of the JOSPT guideline)", year: 2018, url: "https://www.orthopt.org/uploads/content_files/files/Knee%20pain%20and%20mobility%20impairments%202018.pdf" },
    { title: "Artroscopie van de knie (Arthroscopy of the knee)", org: "NOV — Dutch Orthopaedic Association guideline (Richtlijnendatabase)", year: 2019, url: "https://richtlijnendatabase.nl/richtlijn/artroscopie_van_de_knie/" },
    { title: "Management of Acute Isolated Meniscal Pathology — Evidence-Based Clinical Practice Guideline", org: "AAOS — American Academy of Orthopaedic Surgeons", year: 2024, url: "https://www.aaos.org/globalassets/quality-and-practice-resources/acute-meniscal-pathology/amp-cpg.pdf" },
    { title: "Management of Osteoarthritis of the Knee (Non-Arthroplasty) — Evidence-Based Clinical Practice Guideline, 3rd edition", org: "AAOS — American Academy of Orthopaedic Surgeons", year: 2021, url: "https://www.aaos.org/oak3cpg" },
    { title: "Knee Pain and Mobility Impairments: Meniscal and Articular Cartilage Lesions Revision 2018", org: "J Orthop Sports Phys Ther — APTA Academy of Orthopaedic Physical Therapy guideline, revision 2018 (Logerstedt et al.)", year: 2018, url: "https://doi.org/10.2519/jospt.2018.0301" },
    { title: "Arthroscopic surgery for degenerative knee arthritis and meniscal tears: a clinical practice guideline", org: "BMJ — Rapid Recommendation (Siemieniuk et al.)", year: 2017, url: "https://doi.org/10.1136/bmj.j1982" },
    { title: "Surgical management of degenerative meniscus lesions: the 2016 ESSKA meniscus consensus", org: "Knee Surg Sports Traumatol Arthrosc — ESSKA degenerative meniscus consensus 2016 (Beaufils et al.)", year: 2017, url: "https://doi.org/10.1007/s00167-016-4407-4" },
    { title: "Management of traumatic meniscus tears: the 2019 ESSKA meniscus consensus", org: "Knee Surg Sports Traumatol Arthrosc — ESSKA traumatic meniscus consensus 2019 (Kopf et al.)", year: 2020, url: "https://doi.org/10.1007/s00167-020-05847-3" },
    { title: "The formal EU-US Meniscus Rehabilitation 2024 Consensus: An ESSKA-AOSSM-AASPT initiative. Part I-Rehabilitation management after meniscus surgery (meniscectomy, repair and reconstruction)", org: "Knee Surg Sports Traumatol Arthrosc — ESSKA–AOSSM–AASPT meniscus rehabilitation consensus 2024, part I (Pujol et al.)", year: 2025, url: "https://doi.org/10.1002/ksa.12674" },
    { title: "The formal EU-US Meniscus Rehabilitation 2024 Consensus: An ESSKA-AOSSM-AASPT initiative. Part II-Prevention, non-operative treatment and return to sport", org: "Knee Surg Sports Traumatol Arthrosc — ESSKA–AOSSM–AASPT meniscus rehabilitation consensus 2024, part II (Prill et al.)", year: 2025, url: "https://doi.org/10.1002/ksa.12689" },
    { title: "Academy of Orthopaedic Surgeons Clinical Practice Guideline Summary: Management of Acute Isolated Meniscal Pathology", org: "J Am Acad Orthop Surg — AAOS guideline summary 2024 (Brophy et al.)", year: 2025, url: "https://doi.org/10.5435/jaaos-d-25-00135" },
    { title: "AAOS Clinical Practice Guideline Summary: Management of Osteoarthritis of the Knee (Nonarthroplasty), Third Edition", org: "J Am Acad Orthop Surg — AAOS guideline summary 2021 (Brophy et al.)", year: 2022, url: "https://doi.org/10.5435/jaaos-d-21-01233" },
    { title: "Incidental meniscal findings on knee MRI in middle-aged and elderly persons", org: "N Engl J Med (Englund et al.)", year: 2008, url: "https://doi.org/10.1056/nejmoa0800777" },
    { title: "Prevalence of abnormal findings in 230 knees of asymptomatic adults using 3.0 T MRI", org: "Skeletal Radiol (Horga et al.)", year: 2020, url: "https://doi.org/10.1007/s00256-020-03394-z" },
    { title: "On a Trajectory for Success-9 in Every 10 People With a Degenerative Meniscus Tear Have Improved Knee Function Within 2 Years After Treatment: A Secondary Exploratory Analysis of a Randomized Controlled Trial", org: "J Orthop Sports Phys Ther (Berg et al.)", year: 2021, url: "https://doi.org/10.2519/jospt.2021.10025" },
    { title: "Mechanical Symptoms and Arthroscopic Partial Meniscectomy in Patients With Degenerative Meniscus Tear: A Secondary Analysis of a Randomized Trial", org: "Ann Intern Med (Sihvonen et al.)", year: 2016, url: "https://doi.org/10.7326/m15-0899" },
    { title: "Arthroscopic partial meniscectomy vs non-surgical or sham treatment in patients with MRI-confirmed degenerative meniscus tears: a systematic review and meta-analysis with individual participant data from 605 randomised patients", org: "Osteoarthritis Cartilage (Wijn et al.)", year: 2023, url: "https://doi.org/10.1016/j.joca.2023.01.002" },
    { title: "Adverse outcomes after arthroscopic partial meniscectomy: a study of 700 000 procedures in the national Hospital Episode Statistics database for England", org: "Lancet (Abram et al.)", year: 2018, url: "https://doi.org/10.1016/s0140-6736(18)31771-9" },
    { title: "Long-term rates of knee arthroplasty in a cohort of 834 393 patients with a history of arthroscopic partial meniscectomy", org: "Bone Joint J (Abram et al.)", year: 2019, url: "https://doi.org/10.1302/0301-620x.101b9.bjj-2019-0335.r1" },
    { title: "Exercise therapy versus arthroscopic partial meniscectomy for degenerative meniscal tear in middle aged patients: randomised controlled trial with two year follow-up", org: "BMJ (Kise et al.)", year: 2016, url: "https://doi.org/10.1136/bmj.i3740" },
    { title: "Effect of Early Surgery vs Physical Therapy on Knee Function Among Patients With Nonobstructive Meniscal Tears: The ESCAPE Randomized Clinical Trial", org: "JAMA (van de Graaf et al.)", year: 2018, url: "https://doi.org/10.1001/jama.2018.13308" },
    { title: "Effect of Physical Therapy vs Arthroscopic Partial Meniscectomy in People With Degenerative Meniscal Tears: Five-Year Follow-up of the ESCAPE Randomized Clinical Trial", org: "JAMA Netw Open (Noorduyn et al.)", year: 2022, url: "https://doi.org/10.1001/jamanetworkopen.2022.20394" },
    { title: "Arthroscopic partial meniscectomy versus placebo surgery for a degenerative meniscus tear: a 2-year follow-up of the randomised controlled trial", org: "Ann Rheum Dis (Sihvonen et al.)", year: 2018, url: "https://doi.org/10.1136/annrheumdis-2017-211172" },
    { title: "Arthroscopic surgery for degenerative knee disease (osteoarthritis including degenerative meniscal tears)", org: "Cochrane Database Syst Rev (O'Connor et al.)", year: 2022, url: "https://doi.org/10.1002/14651858.cd014328" },
    { title: "Early Surgery or Exercise and Education for Meniscal Tears in Young Adults", org: "NEJM Evid (Skou et al.)", year: 2022, url: "https://doi.org/10.1056/evidoa2100038" },
    { title: "Arthroscopic partial meniscectomy versus physical therapy for traumatic meniscal tears in a young study population: a randomised controlled trial", org: "Br J Sports Med (van der Graaff et al.)", year: 2022, url: "https://doi.org/10.1136/bjsports-2021-105059" },
    { title: "A Randomized Trial of Physical Therapy for Meniscal Tear and Knee Pain", org: "N Engl J Med (Katz et al.)", year: 2025, url: "https://doi.org/10.1056/nejmoa2503385" },
    { title: "Early and intensive physiotherapy accelerates recovery postarthroscopic meniscectomy: results of a randomized controlled study", org: "Arch Phys Med Rehabil (Moffet et al.)", year: 1994, url: "https://doi.org/10.1016/0003-9993(94)90165-1" },
    { title: "Effect of early active range of motion rehabilitation on outcome measures after partial meniscectomy", org: "Knee Surg Sports Traumatol Arthrosc (Kelln et al.)", year: 2009, url: "https://doi.org/10.1007/s00167-009-0723-2" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "Cutoff Values to Interpret Short-term Treatment Outcomes After Arthroscopic Meniscal Surgery, Measured With the Knee Injury and Osteoarthritis Outcome Score", org: "J Orthop Sports Phys Ther (Pedersen et al.)", year: 2021, url: "https://doi.org/10.2519/jospt.2021.10149" },
    { title: "Cross-cultural adaptation, reliability, internal consistency and validation of the Arabic version of the knee injury and osteoarthritis outcome score (KOOS) for Egyptian people with knee injuries", org: "Osteoarthritis Cartilage (Almangoush et al.)", year: 2013, url: "https://doi.org/10.1016/j.joca.2013.09.010" },
    { title: "Responsiveness and Minimal Important Change of the IKDC of Middle-Aged and Older Patients With a Meniscal Tear", org: "Am J Sports Med (Noorduyn et al.)", year: 2019, url: "https://doi.org/10.1177/0363546518812880" },
    { title: "Interrater reliability of a clinical scale to assess knee joint effusion", org: "J Orthop Sports Phys Ther (Sturgill et al.)", year: 2009, url: "https://doi.org/10.2519/jospt.2009.3143" },
    { title: "Knee function and knee muscle strength in middle-aged patients with degenerative meniscal tears eligible for arthroscopic partial meniscectomy", org: "Br J Sports Med (Stensrud et al.)", year: 2014, url: "https://doi.org/10.1136/bjsports-2012-091540" },
    { title: "Hop testing provides a reliable and valid outcome measure during rehabilitation after anterior cruciate ligament reconstruction", org: "Phys Ther (Reid et al.)", year: 2007, url: "https://doi.org/10.2522/ptj.20060143" },
    { title: "Current concepts for anterior cruciate ligament reconstruction: a criterion-based rehabilitation progression", org: "J Orthop Sports Phys Ther (Adams et al.)", year: 2012, url: "https://doi.org/10.2519/jospt.2012.3871" },
    { title: "Functional Outcomes of Arthroscopic Partial Meniscectomy Versus Physical Therapy for Degenerative Meniscal Tears Using a Patient-Specific Score: A Randomized Controlled Trial", org: "Orthop J Sports Med (Noorduyn et al.)", year: 2020, url: "https://doi.org/10.1177/2325967120954392" },
    { title: "Cross-cultural adaptation and measurement properties of the Arabic version of the Patient-Specific Functional Scale in patients with lower extremity musculoskeletal disorders", org: "Disabil Rehabil (Alnahdi et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1880651" },
    { title: "Diagnostic Validity of Combining History Elements and Physical Examination Tests for Traumatic and Degenerative Symptomatic Meniscal Tears", org: "PM R (Décary et al.)", year: 2018, url: "https://doi.org/10.1016/j.pmrj.2017.10.009" },
    { title: "Diagnostic accuracy of the Thessaly test, standardised clinical history and other clinical examination tests (Apley's, McMurray's and joint line tenderness) for meniscal tears in comparison with magnetic resonance imaging diagnosis", org: "Health Technol Assess (Blyth et al.)", year: 2015, url: "https://doi.org/10.3310/hta19620" },
    { title: "Reliability of goniometric measurements and visual estimates of knee range of motion obtained in a clinical setting", org: "Phys Ther (Watkins et al.)", year: 1991, url: "https://doi.org/10.1093/ptj/71.2.90" },
    { title: "Intra- and intertester reliability and criterion validity of the parallelogram and universal goniometers for measuring maximum active knee flexion and extension of patients with knee restrictions", org: "Arch Phys Med Rehabil (Brosseau et al.)", year: 2001, url: "https://doi.org/10.1053/apmr.2001.19250" },
    { title: "Assessment of Lower Limb Muscle Strength and Power Using Hand-Held and Fixed Dynamometry: A Reliability and Validity Study", org: "PLoS One (Mentiplay et al.)", year: 2015, url: "https://doi.org/10.1371/journal.pone.0140822" },
    { title: "Arabic translation and validation of three knee scores, Lysholm Knee Score (LKS), Oxford Knee Score (OKS), and International Knee Documentation Committee Subjective Knee Form (IKDC)", org: "SICOT J (Ahmed et al.)", year: 2019, url: "https://doi.org/10.1051/sicotj/2018054" },
    { title: "Arabic version of the International Knee Documentation Committee Subjective Knee Form (IKDC): Translation and validation", org: "J Back Musculoskelet Rehabil (Almalki et al.)", year: 2022, url: "https://doi.org/10.3233/bmr-210136" },
    { title: "A 30-s chair-stand test as a measure of lower body strength in community-residing older adults", org: "Res Q Exerc Sport (Jones et al.)", year: 1999, url: "https://doi.org/10.1080/02701367.1999.10608028" },
    { title: "Cross-Cultural Adaptation, Validity, and Reliability of the Arabic Version of the Western Ontario Meniscal Evaluation Tool", org: "J Knee Surg (Albishi et al.)", year: 2026, url: "https://doi.org/10.1055/a-2664-7377" },
    { title: "Study protocol for a randomised controlled trial of meniscal surgery compared with exercise and patient education for treatment of meniscal tears in young adults", org: "BMJ Open (Skou et al.)", year: 2017, url: "https://doi.org/10.1136/bmjopen-2017-017436" },
    { title: "INFLUENCE OF CRYOTHERAPY WITH PULSE COMPRESSION ON THE FUNCTIONAL CONDITION OF THE KNEE JOINT AFTER PARTIAL MENISCECTOMY", org: "Wiad Lek (Hrubar et al.)", year: 2023, url: "https://doi.org/10.36740/wlek202301125" },
    { title: "The effects of neuromuscular exercise on medial knee joint load post-arthroscopic partial medial meniscectomy: 'SCOPEX', a randomised control trial protocol", org: "BMC Musculoskelet Disord (Hall et al.)", year: 2012, url: "https://doi.org/10.1186/1471-2474-13-233" },
    { title: "Acute haemarthrosis of the knee in athletes. A prospective study of 106 cases", org: "J Bone Joint Surg Br (Maffulli et al.)", year: 1993, url: "https://doi.org/10.1302/0301-620x.75b6.8245089" },
    { title: "The accuracy of the Ottawa knee rule to rule out knee fractures: a systematic review", org: "Ann Intern Med (Bachmann et al.)", year: 2004, url: "https://doi.org/10.7326/0003-4819-140-5-200403020-00013" },
    { title: "Incidence and Risk Factor Analysis of Symptomatic Venous Thromboembolism After Knee Arthroscopy", org: "Arthroscopy (Krych et al.)", year: 2015, url: "https://doi.org/10.1016/j.arthro.2015.04.091" },
    { title: "Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis", org: "N Engl J Med (Wells et al.)", year: 2003, url: "https://doi.org/10.1056/nejmoa023153" },
    { title: "Early Meniscal Repair Leads to Higher Success Rates Than Delayed Meniscal Repair: A Systematic Review and Meta-analysis", org: "Am J Sports Med (van der List et al.)", year: 2025, url: "https://doi.org/10.1177/03635465241298619" },
    { title: "Predictive value of painful popping for a posterior root tear of the medial meniscus in middle-aged to older Asian patients", org: "Arthroscopy (Bae et al.)", year: 2013, url: "https://doi.org/10.1016/j.arthro.2012.10.026" },
    { title: "Non-operative management of medial meniscus posterior horn root tears is associated with worsening arthritis and poor clinical outcome at 5-year follow-up", org: "Knee Surg Sports Traumatol Arthrosc (Krych et al.)", year: 2017, url: "https://doi.org/10.1007/s00167-016-4359-8" },
    { title: "Nonoperative Management of Degenerative Medial Meniscus Posterior Root Tears: Poor Outcomes at a Minimum 10-Year Follow-up", org: "Am J Sports Med (Krych et al.)", year: 2023, url: "https://doi.org/10.1177/03635465231185132" },
    { title: "Extrusion of the medial meniscus is a potential predisposing factor for post-arthroscopy osteonecrosis of the knee", org: "BMC Musculoskelet Disord (Yamaguchi et al.)", year: 2021, url: "https://doi.org/10.1186/s12891-021-04730-7" },
    { title: "Spontaneous Osteonecrosis/Subchondral Insufficiency Fractures of the Knee: High Rates of Conversion to Surgical Treatment and Arthroplasty", org: "J Bone Joint Surg Am (Pareek et al.)", year: 2020, url: "https://doi.org/10.2106/jbjs.19.00381" },
    { title: "Corticosteroid Injections Within 2 Weeks After Knee Arthroscopy Are Associated With Increased Infection Risk", org: "Arthroscopy (Dubin et al.)", year: 2025, url: "https://doi.org/10.1016/j.arthro.2024.05.034" },
    { title: "Five-Year Outcome of Operative and Nonoperative Management of Meniscal Tear in Persons Older Than Forty-Five Years", org: "Arthritis Rheumatol (Katz et al.)", year: 2020, url: "https://doi.org/10.1002/art.41082" },
    { title: "Arthroscopic debridement compared to intra-articular steroids in treating degenerative medial meniscal tears", org: "Eur Rev Med Pharmacol Sci (Vermesan et al.)", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/24338461/" },
    { title: "No Effects of Early Viscosupplementation After Arthroscopic Partial Meniscectomy: A Randomized Controlled Trial", org: "Am J Sports Med (Filardo et al.)", year: 2016, url: "https://doi.org/10.1177/0363546516660070" },
    { title: "Arthroscopic partial meniscectomy for a degenerative meniscus tear: a 5 year follow-up of the placebo-surgery controlled FIDELITY (Finnish Degenerative Meniscus Lesion Study) trial", org: "Br J Sports Med (Sihvonen et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2020-102813" },
    { title: "Meniscal Repair Outcomes at Greater Than 5 Years: A Systematic Review and Meta-Analysis", org: "J Bone Joint Surg Am (Nepple et al.)", year: 2022, url: "https://doi.org/10.2106/jbjs.21.01303" },
    { title: "Meniscal repair versus partial meniscectomy: a systematic review comparing reoperation rates and clinical outcomes", org: "Arthroscopy (Paxton et al.)", year: 2011, url: "https://doi.org/10.1016/j.arthro.2011.03.088" },
    { title: "Effectiveness of supervised physical therapy in the early period after arthroscopic partial meniscectomy", org: "Phys Ther (Goodwin et al.)", year: 2003, url: "https://doi.org/10.1093/ptj/83.6.520" },
    { title: "Home-Based vs Supervised Inpatient and/or Outpatient Rehabilitation Following Knee Meniscectomy: A Systematic Review and Meta-analysis", org: "JAMA Netw Open (Nutarelli et al.)", year: 2021, url: "https://doi.org/10.1001/jamanetworkopen.2021.11582" },
    { title: "Effects of a valgus unloader brace in the medial meniscectomized knee joint: a biomechanical study", org: "J Orthop Surg Res (Shriram et al.)", year: 2019, url: "https://doi.org/10.1186/s13018-019-1085-1" },
    { title: "Sports injury, occupational physical activity, joint laxity, and meniscal damage", org: "J Rheumatol (Baker et al.)", year: 2002, url: "https://pubmed.ncbi.nlm.nih.gov/11908573/" },
    { title: "Knee kinematics of high-flexion activities of daily living performed by male Muslims in the Middle East", org: "J Arthroplasty (Acker et al.)", year: 2011, url: "https://doi.org/10.1016/j.arth.2010.08.003" },
    { title: "Magnetic resonance image analysis of meniscal translation and tibio-menisco-femoral contact in deep knee flexion", org: "J Orthop Res (Yao et al.)", year: 2008, url: "https://doi.org/10.1002/jor.20553" },
    { title: "Risk factors for medial meniscus posterior root tear", org: "Am J Sports Med (Hwang et al.)", year: 2012, url: "https://doi.org/10.1177/0363546512447792" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "J Relig Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "A Comparison of Neuromuscular Electrical Stimulation Parameters for Postoperative Quadriceps Strength in Patients After Knee Surgery: A Systematic Review", org: "Sports Health (Conley et al.)", year: 2021, url: "https://doi.org/10.1177/1941738120964817" },
    { title: "Efficacy of electromyographic biofeedback and electrical stimulation following arthroscopic partial meniscectomy: a randomized controlled trial", org: "Clin Rehabil (Akkaya et al.)", year: 2012, url: "https://doi.org/10.1177/0269215511419382" },
    { title: "2019 American College of Rheumatology/Arthritis Foundation Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee", org: "Arthritis Care Res — American College of Rheumatology / Arthritis Foundation guideline 2019 (Kolasinski et al.)", year: 2020, url: "https://doi.org/10.1002/acr.24131" },
    { title: "Comparison of a continuous temperature-controlled cryotherapy device to a simple icing regimen following outpatient knee arthroscopy", org: "J Knee Surg (Woolf et al.)", year: 2008, url: "https://doi.org/10.1055/s-0030-1247786" },
    { title: "Evaluation of the efficacy of transfer energy capacitive and resistive therapy in patients with knee osteoarthritis", org: "Turk J Med Sci (Tezen et al.)", year: 2024, url: "https://doi.org/10.55730/1300-0144.5913" },
    { title: "Effects of pulsed electromagnetic fields on patients' recovery after arthroscopic surgery: prospective, randomized and double-blind study", org: "Knee Surg Sports Traumatol Arthrosc (Zorzi et al.)", year: 2007, url: "https://doi.org/10.1007/s00167-007-0298-8" },
    { title: "Effectiveness of low-level laser therapy in the rehabilitation of knee meniscus injuries: a randomized, double-blind, placebo-controlled trial", org: "Lasers Med Sci (Alsirhani et al.)", year: 2026, url: "https://doi.org/10.1007/s10103-026-05038-5" },
    { title: "Extracorporeal shockwave therapy for degenerative meniscal tears results in a decreased T2 relaxation time and pain relief: An exploratory randomized clinical trial", org: "Knee Surg Sports Traumatol Arthrosc (Hashimoto et al.)", year: 2024, url: "https://doi.org/10.1002/ksa.12384" },
    { title: "[Effect of acupuncture exercise therapy synchronizing isokinetic muscle strength training for postoperative rehabilitation of meniscectomy under arthroscopy]", org: "Zhongguo Zhen Jiu (Cui et al.)", year: 2023, url: "https://doi.org/10.13703/j.0255-2930.20221228-0002" },
    { title: "[Clinical research for rehabilitation training combined with modified shu-acupuncture for joint dysfunction after meniscal suture surgery]", org: "Zhongguo Zhen Jiu (Luo et al.)", year: 2017, url: "https://doi.org/10.13703/j.0255-2930.2017.09.012" },
    { title: "Muscle Strength and Osteoarthritis Progression After Surgery or Exercise for Degenerative Meniscal Tears: Secondary Analyses of a Randomized Trial", org: "Arthritis Care Res (Hoboken) (Berg et al.)", year: 2022, url: "https://doi.org/10.1002/acr.24736" },
    { title: "Knee Injury and Osteoarthritis Outcome Score (KOOS): systematic review and meta-analysis of measurement properties", org: "Osteoarthritis Cartilage (Collins et al.)", year: 2016, url: "https://doi.org/10.1016/j.joca.2016.03.010" },
    { title: "Up to One-Half of Runners Return to Running One Year After Arthroscopic Partial Meniscectomy", org: "Arthrosc Sports Med Rehabil (Sayegh et al.)", year: 2022, url: "https://doi.org/10.1016/j.asmr.2022.06.002" },
    { title: "Return to play after lateral meniscectomy compared with medial meniscectomy in elite professional soccer players", org: "Am J Sports Med (Nawabi et al.)", year: 2014, url: "https://doi.org/10.1177/0363546514540271" },
    { title: "The 6-m timed hop test is a prognostic factor for outcomes in patients with meniscal tears treated with exercise therapy or arthroscopic partial meniscectomy: a secondary, exploratory analysis of the Odense-Oslo meniscectomy versus exercise (OMEX) trial", org: "Knee Surg Sports Traumatol Arthrosc (Kise et al.)", year: 2019, url: "https://doi.org/10.1007/s00167-018-5241-7" },
    { title: "Can postural modification reduce kinetic and kinematic loading during the bowing postures of Islamic prayer?", org: "Ergonomics (AbouHassan et al.)", year: 2010, url: "https://doi.org/10.1080/00140139.2010.532881" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — أيّامُ القوّة الثلاثة يوماً بعد يوم وبينها ٤٨ ساعة (إحماءٌ على الدراجة ١٠–٢٠ دقيقة، ثمّ ضغطُ الساقين ومدُّ الركبة وثنيُها على ساقٍ واحدة من ٩٠° بمجموعتين × ١٥ ⟵ ٣ × ١٢ ⟵ ٣ × ٨ ⟵ ٤ × ٦ وقاعدةُ «زائد اثنين»، والقرفصاءُ وصعودُ الدرجة ٣ × ١٠ — Kise 2016)، والأيّامُ الخفيفة بينها (المدى وتنشيطُ الفخذ، وثباتُ الركبة والتوازنُ والورك، وثنيُ الركبتين بالكرة، والقفزُ في المرحلة الثالثة، والصلاةُ والمهامُّ اليومية، والتثقيفُ ومراجعةُ البرنامج المنزليّ).",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — three strength days every other day with 48 hours between (a 10–20-minute warm-up on the bike, then the leg press, knee extension and knee curl one leg at a time from 90° at 2 × 15 → 3 × 12 → 3 × 8 → 4 × 6 with the 'plus-two' rule, and squats and step-ups at 3 × 10 — Kise 2016), and light days in between (range of motion and quadriceps activation, knee stability, balance and hip work, the ball hamstring curl, hopping in phase 3, prayer and daily tasks, and education with a review of the home programme)."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ المشرَف عليه المتدرّج مع برنامجٍ منزليّ B (Logerstedt 2018)، والعلاجُ بلا جراحة أوّلاً للتنكّسيّ A (Prill 2025)؛ ساوى الاستئصالَ وقوّى الفخذ (Kise 2016)، ولم يقلّ عنه بعد خمس سنوات (Noorduyn 2022). والعلاجُ اليدويّ للرضفة والمفصل داخله لاستعادة المدى وحدها لا لتسكين الألم — فحزمةُ العيادة ومنها خمسُ دقائق يدوية لم تفُق البرنامجَ المنزليّ ولا الوهميّ (Katz 2025). والدراجةُ من التمرين هنا. والأعراضُ التي احتاجت رعايةً ٢٣٪ في الذراعين (Kise 2016).",
        "Core in every session — supervised progressive exercise with a home programme B (Logerstedt 2018), and non-operative care first for degenerative lesions A (Prill 2025); it equalled meniscectomy and strengthened the thigh (Kise 2016), and remained non-inferior at five years (Noorduyn 2022). Manual therapy of the kneecap and joint is inside it, to restore range only and not for pain relief — the clinic package with five minutes of manual therapy did not beat the home programme or sham (Katz 2025). Cycling is part of exercise here. Knee symptoms needing care occurred in 23% in both arms (Kise 2016)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "NMES biphasic (quadriceps)", frequencyHz: "≥50", pulseWidthUs: "250–300", intensity: "Max tolerated contraction", onOff: "1:2–1:3 with a 2–3 s ramp", durationMin: "15 (10–15 contractions during quad sets)" },
      parameters: ["تحفيزٌ عضليّ (NMES) للفخذ بأقطابٍ كبيرة (٤٠ سم² فأكثر) بتيّارٍ ثنائيّ الطور ٥٠ هرتز فأكثر و٢٥٠–٣٠٠ ميكروثانية، بأقوى انقباضٍ يتحمّله، ونسبةُ العمل إلى الراحة ١ : ٢–٣ بصعودٍ ٢–٣ ثوانٍ (Conley 2021) — أثناءَ شدّ الفخذ والمدّ الأخير، ١٠–١٥ انقباضاً في الجلسة، في الأسبوعين الأوّلين بعد الاستئصال لمن تأخّر مدُّه في رفع الساق، ويتوقّف حين يرفعها بلا تأخّر.",
        "Neuromuscular stimulation (NMES) of the quadriceps with large electrodes (40 cm² or more), a biphasic current of 50 Hz or more and 250–300 µs, at the strongest tolerated contraction, with an on-to-off ratio of 1:2–3 and a 2–3-second ramp (Conley 2021) — during quadriceps setting and terminal extension, 10–15 contractions per session, in the first two weeks after meniscectomy for those with an extensor lag on the straight-leg raise, stopping once the leg is raised without a lag."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — وبعد الاستئصال له أساس: التحفيزُ وإعادةُ التعليم العضليّ بعد إجراءات الغضروف B (Logerstedt 2018)، والتحفيزُ مع التمرين بعد الاستئصال C (Pujol 2025)؛ لكنّ مراجعةَ إعداداته فيها تجربةُ استئصالٍ واحدة قديمة (Conley 2021)، وفي تجربةٍ احتاج المحفَّزون العكّازَ ٤٫٥ أيّام مقابل ١٫٥ بالتغذية الراجعة و٨٫٣ للبيت وحده (Akkaya 2012). وللتنكّسيّ مع الخشونة «لا يُقدَّم» عند المعهد البريطانيّ (NICE NG226)، والتحفيزُ عبر الجلد (TENS) للألم ضدّه بقوّة في خشونة الركبة (Kolasinski 2020). ممنوعٌ مع منظّم ضربات القلب، وعلى فتحاتٍ لم تلتئم، ومع الشكّ في جلطة.",
        "Rotating adjunct by the centre's rule (Saleem) — with a basis after meniscectomy: neuromuscular stimulation and re-education after meniscal procedures B (Logerstedt 2018), and stimulation with exercise after meniscectomy C (Pujol 2025); but the review of its settings contains one old meniscectomy trial (Conley 2021), and in one trial stimulated patients needed crutches for 4.5 days versus 1.5 with biofeedback and 8.3 with home exercise alone (Akkaya 2012). For degenerative tears with osteoarthritis NICE says 'do not offer' (NICE NG226), and TENS for pain is strongly recommended against in knee osteoarthritis (Kolasinski 2020). Contraindicated with a pacemaker, over unhealed portals and with a suspected thrombosis."] },
    { code: "compression", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { pressureMmhg: "Moderate — device default (trial pressure not reported)", cycleS: "Device default intermittent cycle", durationMin: "15–20, leg elevated, after exercise" },
      parameters: ["تبريدٌ مع ضغطٍ متقطّع والساقُ مرفوعة ١٥–٢٠ دقيقة بعد التمرين — في الجلسات ١–٦ بعد الاستئصال أو حين يكون التورّمُ ١+ فأكثر؛ والضغطُ والدورةُ من برنامج الجهاز (لم تُذكر في التجربة).",
        "Cold with intermittent compression and the leg elevated for 15–20 minutes after exercise — in sessions 1–6 after meniscectomy or whenever swelling is 1+ or more; pressure and cycle from the device's programme (not reported in the trial)."],
      note: ["مساعدٌ بالتناوب — بعد الاستئصال خفّف التبريدُ مع الضغط النبضيّ الألمَ والتورّمَ أكثرَ من أكياس الثلج في ٦٣ مريضاً (Hrubar 2023)، والتبريدُ المستمرّ حسّن النومَ في الليلتين الأوليين لا الألم (Woolf 2008)؛ والإجماع: يُعالَج التورّمُ D (Pujol 2025). لا بدلَ التمرين. ممنوعٌ مع الشكّ في جلطة — يُحال ولا يُضغط — ومرضِ الشرايين الطرفية وحساسيةِ البرد وضعفِ الإحساس والفتحاتِ الملتهبة.",
        "Rotating adjunct — after meniscectomy, cryotherapy with pulsed compression reduced pain and swelling more than ice bags in 63 patients (Hrubar 2023), and continuous cryotherapy improved sleep on the first two nights but not pain (Woolf 2008); the consensus: swelling should be addressed, D (Pujol 2025). Never instead of exercise. Contraindicated with a suspected thrombosis — refer, do not compress — peripheral arterial disease, cold sensitivity, reduced sensation and infected portals."] },
    { code: "tecar", centreUse: "adjunct", evidence: "not_recommended", minutes: 12,
      params: { mode: "CAP (capacitive), athermic → mild warmth", powerPct: "Low (no meniscal trial)", durationMin: "10–12" },
      parameters: ["على جانبي الركبة في الاستلقاء والركبةُ ممدودة، بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف، قبل التمرين للتنكّسيّ والمزمن وحدهما — لا على ركبةٍ متورّمة حديثاً ولا في الأسبوعين الأوّلين بعد الجراحة.",
        "Over the sides of the knee lying with the knee straight, at low athermic-to-mildly-warm intensity, before exercise for degenerative and longstanding tears only — not on a recently swollen knee and not in the first two weeks after surgery."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — ولا تجربةَ في الغضروف ولا بعد المنظار (بحثٌ صفريّ)، وفي خشونة الركبة لم تُضف ستُّ جلساتٍ إلى العلاج الطبيعيّ شيئاً (Tezen 2024). يُنتج حرارة: ممنوعٌ مع منظّم ضربات القلب والمعدن في المجال والورم والحمل والتورّم الحادّ.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial in meniscal tears or after arthroscopy (a documented zero result), and in knee osteoarthritis six sessions added nothing to physiotherapy (Tezen 2024). It produces heat: contraindicated with a pacemaker, metal in the field, tumour, pregnancy and acute swelling."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الركبة قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز، وإعداداتُه يكتبها المشرفُ من الجهاز.",
        "Pulsed electromagnetic field (PEMF) over the knee before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والتجربةُ الوحيدة بعد منظارٍ لعلاج الغضروف المفصليّ لا الهلاليّ، بجهازٍ منزليّ ١٫٥ ملّي تسلا ستَّ ساعاتٍ يومياً تسعين يوماً، فحسّن نتائجَ الركبة وقلّل المسكّنات (Zorzi 2007) — ولا تُنقل إلى جلسةٍ في المركز؛ ولا تجربةَ في الغضروف الهلاليّ (بحثٌ صفريّ). ممنوعٌ مع منظّم ضربات القلب والحمل.",
        "Rotating adjunct by the centre's rule (Saleem) — the only trial was after arthroscopic treatment of joint cartilage, not the meniscus, with a home device at 1.5 mT for six hours a day for ninety days, which improved knee scores and reduced painkillers (Zorzi 2007) — not transferable to a clinic session; there is no trial in meniscal tears (a documented zero result). Contraindicated with a pacemaker or pregnancy."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["على الفخذ والركبة قبل التمارين لتسهيلها، للتنكّسيّ المزمن بلا تورّمٍ حديث — لا على ركبةٍ متورّمة ولا بعد الجراحة؛ ويُفحص الإحساسُ أوّلاً.", "Over the thigh and knee before exercise to ease it, for longstanding degenerative tears without recent swelling — not on a swollen knee and not after surgery; check sensation first."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: لا تجربةَ للحرارة في الغضروف (بحثٌ صفريّ)، والكلّيةُ الأمريكية تجعل الحرارةَ والبرودة مشروطتين في خشونة الركبة (Kolasinski 2020). لا يُعطى وحده.",
        "Rotating adjunct — for comfort before exercise: there is no trial of heat in meniscal tears (a documented zero result), and the American College conditionally recommends heat and cold in knee osteoarthritis (Kolasinski 2020). Never given alone."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها: على الفخذ والركبة بلا تورّمٍ حديث، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the thigh and knee without recent swelling, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: لا تجربةَ في الغضروف (بحثٌ صفريّ). لا يُعطى وحده ولا على ركبةٍ متورّمة.", "Rotating adjunct — comfortable warmth only: there is no trial in meniscal tears (a documented zero result). Never given alone or on a swollen knee."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ سعودية واحدة على ٤٠ مريضاً بتمزّقٍ وألمٍ ستّةَ أسابيع فأكثر: ٩٠٤ نانومتر بأربعة صماماتٍ ٦٠ ملّي واط، نبضيّ ٢٤٠٠ و٧٠٠ هرتز، ٢٫٥٢ جول لكلّ نقطة على عشرين نقطة فوق الغضروف الإنسيّ (١٠٠٫٨ جول في الجلسة) مع تأهيلٍ ستّةَ أسابيع، فنقص الألمُ ٣٫٣٦ مقابل ٢٫٠٨ (Alsirhani 2026) — وعددُ جلساته لم يُذكر؛ و«لا يُقدَّم» للخشونة عند المعهد البريطانيّ (NICE NG226). فإن أراده سليم: بهذه الجرعة، للتمزّق بلا جراحة بعد ٤–٦ أسابيع من التمرين بلا تحسّن.",
        "Not used until Saleem decides — one Saudi trial of 40 patients with a tear and pain for six weeks or more: 904 nm with four 60 mW diodes, pulsed at 2400 and 700 Hz, 2.52 J per point over twenty points above the medial meniscus (100.8 J per session) with six weeks of rehabilitation, reduced pain by 3.36 versus 2.08 (Alsirhani 2026) — the number of sessions was not reported; NICE says 'do not offer' for osteoarthritis (NICE NG226). If Saleem wants it: at this dose, for a non-operative tear not improving after 4–6 weeks of exercise."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ يابانية واحدة بالوهميّ على ٢٧ مريضاً بتمزّقٍ تنكّسيّ: موجاتٌ مركّزة تصعد إلى ٠٫٢٥ ملّي جول/مم² في ٥٠٠ نبضة ثمّ ٢٠٠٠ نبضة بأربعٍ في الثانية، ثلاثُ جلساتٍ أسبوعياً، فقلّ الألمُ بعد سنة ولم تختلف مقاييسُ الركبة (Hashimoto 2024)؛ ولا إرشادَ يذكرها للغضروف. فإن جعلها سليم مساعدة: للتنكّسيّ بعد ستّة أسابيع من التمرين بلا تحسّن، وتُكتب إعداداتُها من جهاز المركز (مركّزٌ أم شعاعيّ) قبل الاعتماد.",
        "Not used until Saleem decides — one Japanese sham-controlled trial of 27 patients with degenerative tears: focused waves ramped to 0.25 mJ/mm² over 500 impulses, then 2000 impulses at four per second, three weekly sessions, reduced pain at one year with no difference in knee scores (Hashimoto 2024); no guideline mentions it for the meniscus. If Saleem makes it an adjunct: for degenerative tears not improving after six weeks of exercise, with the settings entered from the centre's device (focused or radial) before approval."] },
    { code: "needle", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ للإبر الجافّة في الغضروف ولا بعد المنظار (بحثٌ صفريّ)، و«لا يُقدَّم» الوخزُ بالإبر الجافّة ولا الصينية للخشونة (NICE NG226)؛ والصينيةُ يومياً بعد الاستئصال في تجربتين صغيرتين (Cui 2023 · Luo 2017) ليست من أجهزة المركز.",
        "Not used — there is no trial of dry needling in meniscal tears or after arthroscopy (a documented zero result), and NICE says do not offer dry needling or acupuncture for osteoarthritis (NICE NG226); daily acupuncture after meniscectomy in two small trials (Cui 2023 · Luo 2017) is not a centre device."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ في الغضروف (بحثٌ صفريّ)، و«لا يُقدَّم» للخشونة (NICE NG226)، وفي التجربة الأمريكية كانت الأمواجُ بلا شدّةٍ علاجاً وهمياً تحسّن معه المرضى كالعلاج الحقيقيّ (Katz 2025).",
        "Not used — there is no trial in meniscal tears (a documented zero result), NICE says do not offer it for osteoarthritis (NICE NG226), and in the American trial zero-intensity ultrasound was a sham with which patients improved as much as with real treatment (Katz 2025)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا سببَ للركبة (بحثٌ صفريّ).", "Not used — no trial and no rationale for the knee (a documented zero result)."] },
    { code: "wax", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — للكفّ والقدم، ولا تجربة (بحثٌ صفريّ).", "Not used — for the hand and foot, and there is no trial (a documented zero result)."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — بعد الاستئصال المدى كاملٌ بقدر ما يتحمّل (Pujol 2025)، والدراجةُ وسحبُ الكعب يغنيان عنه، ولا تجربة (بحثٌ صفريّ)؛ وبعد الخياطة قرارُه للجرّاح.",
        "Not used — after meniscectomy the full range is allowed as tolerated (Pujol 2025), the bike and heel slides do the same job, and there is no trial (a documented zero result); after a repair it is the surgeon's decision."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — بعد الاستئصال يحمل الوزنَ كاملاً مبكّراً A (Pujol 2025)، ومن مُنع الحِملَ بعد الخياطة يحتاج تدريبَ العكّازين لا الروبوت (بحثٌ صفريّ).",
        "Not used — after meniscectomy patients bear full weight early, A (Pujol 2025), and those kept off the leg after a repair need crutch training, not the robot (a documented zero result)."] },
  ],
  phases: [
    {
      name: ["تهدئة الركبة واستعادة المدّ وعضلة الفخذ", "Calming the knee, restoring extension and the quadriceps"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (الأسبوعُ الأوّل) — وبعد الاستئصال ١–٤", "The first six sessions (the first week) — and after meniscectomy 1–4"],
      goals: [
        "التورّمُ ١+ أو أقلّ ولا يزيد بعد الجلسات؛ ونقصُ المدّ ٥° أو أقلّ عن الركبة الأخرى والثنيُ ١١٠° فأكثر؛ ورفعُ الساق بلا تأخّرٍ في المدّ؛ ومشيةٌ طبيعية بلا عكّاز؛ وثقلٌ يُرفع ١٥ مرّة محدَّدٌ لثلاثة تمارين قوّة؛ وفهمُ الحالة وقاعدةِ الألم والتورّم.",
        "Swelling of 1+ or less and not rising after sessions; an extension deficit of 5° or less compared with the other knee and flexion of 110° or more; a straight-leg raise without an extensor lag; normal gait without a crutch; a 15-repetition load set for three strength exercises; and understanding of the condition and the pain-and-swelling rule.",
      ],
      education: [
        "• ما هي الحالة: التمزّقُ شائعٌ في ركبٍ لا تؤلم (Englund 2008)، وتسعةٌ من عشرة يتحسّنون (Berg 2021)، والتمرينُ يساوي الاستئصالَ للتنكّسيّ ويقوّي الفخذ (Kise 2016).\n" +
        "• الطقطقةُ والانحباسُ العابر لا يعنيان أنّ الجراحة ستنفع (Sihvonen 2016)، والركبةُ التي لا تمتدّ أبداً تعود فوراً.\n" +
        "• قاعدةُ الألم والتورّم: الصباحُ التالي هو الحَكَم، والتورّمُ الجديد يوقف التقدّمَ يوماً.\n" +
        "• بعد الاستئصال: حملُ الوزن كاملاً مسموح والعكّازُ حتى تصير المشيةُ طبيعية (Pujol 2025)، والتبريدُ ورفعُ الساق للتورّم، وعلاماتُ الالتهاب والجلطة.\n" +
        "• يقلّ الألمُ غالباً بعد نحو ستّة أسابيع، وقد لا يصير الفرقُ مهمّاً قبل ٨–١٠ أسابيع (Skou 2017) — فالبرنامجُ المنزليّ يكمل ما بعد الجلسات.",
        "• What the condition is: tears are common in knees that do not hurt (Englund 2008), nine in ten improve (Berg 2021), and exercise equals meniscectomy for degenerative tears and strengthens the thigh (Kise 2016).\n" +
        "• Clicking and brief locking do not mean surgery will help (Sihvonen 2016), and a knee that will not straighten at all comes back at once.\n" +
        "• The pain-and-swelling rule: the next morning is the judge, and new swelling stops progression for a day.\n" +
        "• After meniscectomy: full weight bearing is allowed with a crutch until gait is normal (Pujol 2025), cold and elevation for swelling, and the signs of infection and thrombosis.\n" +
        "• Pain usually eases after about six weeks, and the change may not become important until 8–10 weeks (Skou 2017) — so the home programme carries on after the sessions.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• التورّمُ ١+ أو أقلّ في اختبار المسح ولا يزيد بعد الجلسات (Sturgill 2009).\n" +
        "• نقصُ المدّ ٥° أو أقلّ عن الركبة الأخرى والثنيُ ١١٠° فأكثر — بالمنقلة بالفاحص نفسِه (Watkins 1991).\n" +
        "• رفعُ الساق مستقيمة بلا تأخّرٍ في المدّ، ومشيةٌ طبيعية بلا عكّاز.\n" +
        "• ثقلٌ يُرفع ١٥ مرّة محدَّدٌ لضغط الساقين ومدّ الركبة وثنيها (Kise 2016).\n" +
        "(اقتراحٌ يجمع معاييرَ الإجماع بعد الجراحة وما استعملته التجارب، لا معيارٌ مجرَّب — Pujol 2025.) وبعد الاستئصال تُطلب في الجلسة ٤: مشيةٌ بلا عكّاز، ورفعُ الساق بلا تأخّر، ونقصُ مدٍّ ٥° أو أقلّ.",
        "Progress to phase 2 when all are met:\n" +
        "• Swelling of 1+ or less on the stroke test and not rising after sessions (Sturgill 2009).\n" +
        "• An extension deficit of 5° or less compared with the other knee and flexion of 110° or more — with a goniometer by the same examiner (Watkins 1991).\n" +
        "• A straight-leg raise without an extensor lag, and normal gait without a crutch.\n" +
        "• A 15-repetition load set for the leg press, knee extension and knee curl (Kise 2016).\n" +
        "(A proposal combining the post-surgery consensus criteria and trial practice, not a tested criterion — Pujol 2025.) After meniscectomy, by session 4: gait without a crutch, a straight-leg raise without a lag, and an extension deficit of 5° or less.",
      ],
      notes: [
        "• المدُّ أوّلاً: إسنادُ الكعب وشدُّ الفخذ والمدُّ الأخير بالمطّاط — ونقصُ المدّ الثابت الذي لا يتحسّن بتهدئة التورّم علامةُ إحالة.\n" +
        "• التحفيزُ العضليّ للفخذ لمن عجز عن رفع الساق بلا تأخّر بعد الاستئصال، في الأسبوعين الأوّلين (Conley 2021 — في «الأجهزة»).\n" +
        "• الدراجةُ للمدى ثمّ ١٠–٢٠ دقيقة (Kelln 2009 · Kise 2016)، والمقعدُ عالٍ أوّلاً.\n" +
        "• التبريدُ مع الضغط ورفعُ الساق ١٥–٢٠ دقيقة بعد التمرين لمن تورّمُه ١+ فأكثر أو بعد الجراحة (Hrubar 2023).\n" +
        "• الجلساتُ ٣–٦: يُحدَّد ثقلٌ يُرفع ١٥ مرّة لضغط الساقين ومدّ الركبة وثنيها، بمدىً لا يؤلم.\n" +
        "• بعد الاستئصال: ضخُّ الكاحل والعكّازان حتى المشية الطبيعية، وفحصُ فتحات المنظار وعلامات الجلطة في كلّ جلسة.",
        "• Extension first: heel props, quadriceps setting and terminal extension with a band — and a fixed extension deficit that does not improve as swelling settles is a referral sign.\n" +
        "• NMES of the quadriceps for those who cannot lift the leg without a lag after meniscectomy, in the first two weeks (Conley 2021 — under 'Devices').\n" +
        "• The bike for range, then 10–20 minutes (Kelln 2009 · Kise 2016), with a high saddle at first.\n" +
        "• Cold with compression and elevation for 15–20 minutes after exercise for swelling of 1+ or more or after surgery (Hrubar 2023).\n" +
        "• Sessions 3–6: a 15-repetition load is set for the leg press, knee extension and knee curl, through a pain-free range.\n" +
        "• After meniscectomy: ankle pumps and crutches until gait is normal, with the portals and the signs of thrombosis checked at every session.",
      ],
      exercises: [
        { code: "quad-set", sets: 3, reps: 10, hold: 5 },
        { code: "straight-leg-raise", sets: 3, reps: 10,
          note: ["إن تأخّر المدُّ (الركبةُ تنثني وهي ترتفع) يُضاف التحفيزُ العضليّ بعد الاستئصال.", "If there is an extensor lag (the knee bends as it rises), NMES is added after meniscectomy."] },
        { code: "heel-prop", sets: 2, hold: 120,
          note: ["المدُّ الكامل أوّلُ الأهداف — ونقصُه الثابت بعد تهدئة التورّم يُحال.", "Full extension is the first goal — a fixed deficit after the swelling has settled is referred."] },
        { code: "heel-slide", sets: 2, reps: 10, hold: 3 },
        { code: "terminal-knee-extension", sets: 3, reps: 15, hold: 2 },
        { code: "patellar-self-mobilisation", sets: 1, reps: 10,
          note: ["بعد الاستئصال أو لمن تيبّست رضفتُه.", "After meniscectomy or for a stiff kneecap."] },
        { code: "stationary-cycling",
          doseNote: ["للمدى أوّلاً بلا مقاومة والمقعدُ عالٍ، ثمّ ١٠–٢٠ دقيقة بمقاومةٍ يختارها (Kelln 2009 · Kise 2016).", "For range first without resistance with a high saddle, then 10–20 minutes at a resistance of the patient's choosing (Kelln 2009 · Kise 2016)."] },
        { code: "ankle-pumps", sets: 1, reps: 20,
          note: ["بعد الاستئصال في الأيّام الأولى.", "After meniscectomy in the first days."] },
        { code: "cold-elevation",
          note: ["لمن تورّمُه ١+ فأكثر أو بعد الجراحة، ١٥–٢٠ دقيقة بعد التمرين.", "For swelling of 1+ or more or after surgery, 15–20 minutes after exercise."] },
        { code: "walking-aid-gait",
          note: ["بعد الاستئصال: الحملُ كاملاً والعكّازان حتى المشي بلا عرج — أيّامٌ لا أسابيع (Pujol 2025).", "After meniscectomy: full weight bearing with crutches until walking without a limp — days, not weeks (Pujol 2025)."] },
        { code: "seated-knee-extension", sets: 2, reps: 15,
          note: ["على ساقٍ واحدة من ٩٠°، لتحديد ثقلٍ يُرفع ١٥ مرّة بمدىً لا يؤلم (Kise 2016).", "One leg at a time from 90°, to set a 15-repetition load through a pain-free range (Kise 2016)."] },
        { code: "standing-hamstring-curl", sets: 2, reps: 15, rest: 60,
          note: ["خفيفاً لتحديد ثقلٍ يُرفع ١٥ مرّة.", "Light, to set a 15-repetition load."] },
        { code: "glute-bridge", sets: 3, reps: 10, hold: 3 },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10 },
        { code: "calf-raise", sets: 3, reps: 15 },
        { code: "wall-squat", sets: 3, reps: 10,
          note: ["نزولٌ قصير ٠–٤٥° بقاعدة الألم، والركبةُ فوق الأصابع.", "A short descent of 0–45° by the pain rule, with the knee over the toes."] },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 30 },
        { code: "hamstring-stretch-seated", sets: 3, hold: 30 },
      ],
    },
    {
      name: ["التقوية المتدرّجة والتحكّم العصبيّ العضليّ", "Progressive strengthening and neuromuscular control"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["الجلسات ٧–١٦ (الأسبوعان الثاني والثالث تقريباً) — وبعد الاستئصال ٥–٨", "Sessions 7–16 (roughly weeks 2 and 3) — and after meniscectomy 5–8"],
      goals: [
        "الألمُ ينقص نقطتين، أو نتائجُ الركبة: الألمُ +١٢ أو الأعراضُ +٨؛ وقوّةُ مادّات الركبة ٨٠٪ من الجهة الأخرى والتورّمُ أثرٌ أو أقلّ؛ والتقويةُ ٣ × ٨ بقاعدة «زائد اثنين»؛ والقرفصاءُ على ساقٍ حتى الكرسيّ والركبةُ فوق الأصابع.",
        "Pain down 2 points, or the knee score: pain +12 or symptoms +8; quadriceps strength 80% of the other side with swelling trace or less; strengthening at 3 × 8 with the 'plus-two' rule; and a single-leg squat to a chair with the knee over the toes.",
      ],
      education: [
        "• التحميلُ هو العلاج: الثقلُ يزيد بقاعدة «زائد اثنين» لا بالتقويم (Kise 2016)، والفخذُ القويّ يحمي الركبة — ضعفُه ينبئ بتقدّم الخشونة (Berg 2022).\n" +
        "• الحركةُ الصحيحة: الركبةُ فوق الأصابع في القرفصاء والدرج والسجود.\n" +
        "• الألمُ بقاعدته، والتورّمُ يُفحص قبل كلّ يوم قوّة.\n" +
        "• قد يبقى بعضُ الانحباس العابر — لا يعني ضرراً ولا حاجةً إلى الجراحة (Sihvonen 2016).",
        "• Loading is the treatment: the load rises by the 'plus-two' rule, not by the calendar (Kise 2016), and a strong thigh protects the knee — its weakness predicts osteoarthritis progression (Berg 2022).\n" +
        "• Good movement: the knee over the toes in squats, on stairs and in prostration.\n" +
        "• Pain by its rule, and swelling checked before every strength day.\n" +
        "• Some brief locking may persist — it does not mean damage or a need for surgery (Sihvonen 2016).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين يتحقّق اثنان من ثلاثة:\n" +
        "• الألمُ نقص نقطتين فأكثر — فوق خطأ القياس بالعربية ١٫٩٦ (Alghadir 2016).\n" +
        "• نتائجُ الركبة: الألمُ +١٢ أو الأعراضُ +٨ — الفرقُ المهمّ بعد جراحة الغضروف (Pedersen 2021)، وخطأُ القياس أكبر فيُقرأ مع غيره (Collins 2016).\n" +
        "• قوّةُ مادّات الركبة ٨٠٪ من الجهة الأخرى بمقياس اليد والتورّمُ أثرٌ أو أقلّ (Pujol 2025 · Adams 2012).\n" +
        "(اقتراحٌ يجمع الفرقَ المهمّ ومعاييرَ الإجماع، لا معيارٌ مجرَّب.) وبعد الاستئصال في الجلسة ٨: الثنيُ ١٢٠° فأكثر والتورّمُ أثرٌ أو أقلّ بعد التحميل.",
        "Progress to phase 3 when two of three are met:\n" +
        "• Pain down 2 points or more — beyond the Arabic measurement error of 1.96 (Alghadir 2016).\n" +
        "• The knee score: pain +12 or symptoms +8 — the important change after meniscal surgery (Pedersen 2021), with a larger measurement error, so it is read with the others (Collins 2016).\n" +
        "• Quadriceps strength 80% of the other side on a handheld dynamometer with swelling trace or less (Pujol 2025 · Adams 2012).\n" +
        "(A proposal combining the important changes and the consensus criteria, not a tested criterion.) After meniscectomy, by session 8: flexion of 120° or more and swelling trace or less after loading.",
      ],
      notes: [
        "• أيّامُ القوّة الثلاثة: ضغطُ الساقين ومدُّ الركبة وثنيُها على ساقٍ واحدة من ٩٠° — ٣ × ١٢ ثمّ ٣ × ٨ بقاعدة «زائد اثنين»، ومعها صعودُ الدرجة والقرفصاءُ على ساقٍ والطعنة ٣ × ١٠ والركبةُ فوق الأصابع (Kise 2016)؛ وراحةُ ٦٠–٩٠ ثانية.\n" +
        "• الأيّامُ الخفيفة: ثباتُ الركبة ضدّ المطّاط وثنيُ الركبتين بالكرة (Kise 2016)، والوركُ بالمطّاط، والوصولُ بالقدم في اتّجاهات النجمة، والتوازنُ على ساق — بمستوياتٍ تزيد بسطحٍ ليّن وعينين مغمضتين (Skou 2017).\n" +
        "• الدراجةُ ٢٠ دقيقة للإحماء بمقاومةٍ يختارها (Kise 2016)، والمشيُ المتدرّج.\n" +
        "• من بقي ثنيُه أقلّ من ١٢٠°: الثنيُ على الدرجة حاملاً الوزن.\n" +
        "• الصلاةُ بقاعدة الألم من هذه المرحلة — والسجودُ بوسادة إن آلمه ما فوق ١٢٠°.",
        "• Three strength days: the leg press, knee extension and knee curl one leg at a time from 90° — 3 × 12 then 3 × 8 with the 'plus-two' rule, together with step-ups, single-leg squats and lunges at 3 × 10 with the knee over the toes (Kise 2016); 60–90 seconds' rest.\n" +
        "• Light days: knee stability against the band and the ball hamstring curl (Kise 2016), band hip work, star-excursion reaches and single-leg balance — at levels that rise with a soft surface and closed eyes (Skou 2017).\n" +
        "• The bike for 20 minutes of warm-up at a resistance of the patient's choosing (Kise 2016), and graded walking.\n" +
        "• If flexion is still below 120°: the weight-bearing step flexion stretch.\n" +
        "• Prayer by the pain rule from this phase — with prostration on a cushion if bending beyond 120° hurts.",
      ],
      exercises: [
        { code: "stationary-cycling",
          doseNote: ["٢٠ دقيقة للإحماء بمقاومةٍ يختارها (Kise 2016).", "20 minutes of warm-up at a resistance of the patient's choosing (Kise 2016)."] },
        { code: "leg-press-progressive", sets: 3, reps: 12, rest: 90,
          note: ["على ساقٍ واحدة من ٩٠°: ٣ × ١٢ ثمّ ٣ × ٨ بقاعدة «زائد اثنين» (Kise 2016) — لا ٨ من البداية كما في بطاقة الاستبدال.", "One leg at a time from 90°: 3 × 12 then 3 × 8 with the 'plus-two' rule (Kise 2016) — not 8 from the start as on the knee-replacement card."] },
        { code: "seated-knee-extension", sets: 3, reps: 12, rest: 90,
          note: ["على ساقٍ واحدة من ٩٠° بثقلٍ على الكاحل، بقاعدة «زائد اثنين» (Kise 2016).", "One leg at a time from 90° with an ankle weight, by the 'plus-two' rule (Kise 2016)."] },
        { code: "standing-hamstring-curl", sets: 3, reps: 12, rest: 90 },
        { code: "step-up", sets: 3, reps: 10, rest: 60 },
        { code: "split-squat", sets: 3, reps: 10, rest: 60 },
        { code: "single-leg-squat-to-box", sets: 3, reps: 10, rest: 60,
          note: ["الركبةُ فوق الأصابع (Kise 2016).", "Knee over the toes (Kise 2016)."] },
        { code: "lateral-step-down", sets: 3, reps: 10, rest: 60 },
        { code: "knee-stability-band-loop", sets: 3, reps: 10 },
        { code: "fitball-hamstring-curl", sets: 3, reps: 8, rest: 60 },
        { code: "standing-band-hip-abduction-er", sets: 3, reps: 10, rest: 60 },
        { code: "star-excursion-reach", sets: 2, reps: 5 },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 45,
          note: ["ثمّ على وسادةٍ ليّنة وبعينين مغمضتين (Skou 2017).", "Then on a soft pad and with the eyes closed (Skou 2017)."] },
        { code: "knee-flexion-step-stretch", sets: 1, reps: 10, hold: 10,
          note: ["لمن بقي ثنيُه أقلّ من ١٢٠°.", "For those whose flexion is still below 120°."] },
        { code: "quadriceps-stretch-standing", sets: 1, reps: 3, hold: 30 },
        { code: "prayer-deep-flexion-meniscus",
          note: ["بلا جراحة وبعد الاستئصال بقاعدة الألم؛ وبعد الخياطة الكرسيُّ وحده.", "Without surgery and after meniscectomy by the pain rule; after a repair the chair only."] },
      ],
    },
    {
      name: ["الوظيفة والقفز والأنشطة اليومية", "Function, hopping and daily activities"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["الجلسات ١٧–٢٤ (الأسبوعُ الرابع) — والتمديدُ ٢٥–٣٠، وبعد الاستئصال ٩–١٢ والتمديدُ حتى ١٨", "Sessions 17–24 (the fourth week) — with the extension at 25–30, and after meniscectomy 9–12 with the extension to 18"],
      goals: [
        "نتائجُ الركبة عند الحالة التي يقبلها المريض أو مقياسُ الركبة الذاتيّ +١٠٫٩؛ والأنشطةُ المختارة +٢٫٥ لكلٍّ منها؛ والقفزُ وقوّةُ الفخذ ٩٠٪ من الجهة الأخرى لمن يعود إلى الرياضة؛ والسجودُ والتشهّدُ والمرحاضُ العربيّ والدرجُ بلا ألمٍ يزيد ولا تورّم؛ والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر.",
        "The knee score at the state the patient finds acceptable or the subjective knee score +10.9; the chosen activities each +2.5; hopping and quadriceps strength at 90% of the other side for those returning to sport; prostration, tashahhud, the squat toilet and stairs without rising pain or swelling; and the home programme to week 12.",
      ],
      education: [
        "• الإدارةُ الذاتية: إن عاد الألمُ أو التورّم ينزل درجةً أيّاماً ثمّ يعود، ولا يترك التقوية.\n" +
        "• البرنامجُ المنزليّ: تمارينُ القوّة مرّتين إلى ثلاثٍ في الأسبوع حتى الأسبوع الثاني عشر، ثمّ يحافظ عليها.\n" +
        "• العودةُ إلى الرياضة بالمعايير لا بالزمن — وبعد الاستئصال غالباً بعد ٤–١٢ أسبوعاً (Prill 2025)، ونحو نصفِ العدّائين فقط عادوا إلى جريهم بعد سنة (Sayegh 2022).\n" +
        "• متى يعود: انحباسٌ لا ينفكّ، أو ركبةٌ حارّة، أو تورّمٌ يتكرّر، أو انفلات، أو ألمٌ إنسيّ شديد مفاجئ.",
        "• Self-management: if pain or swelling returns, drop a level for a few days and then come back, without stopping strengthening.\n" +
        "• The home programme: the strength exercises two to three times a week to week 12, then maintained.\n" +
        "• Return to sport by criteria, not by time — after meniscectomy usually after 4–12 weeks (Prill 2025), and only about half of runners were back to their running a year later (Sayegh 2022).\n" +
        "• When to come back: locking that does not free, a hot knee, recurrent swelling, giving way, or sudden severe medial pain.",
      ],
      criteria: [
        "معاييرُ الخروج (اثنان على الأقلّ، والأخيرُ لكلّ مريض):\n" +
        "• نتائجُ الركبة عند الحالة التي يقبلها المريض أو فوقها (الألمُ ٧٤، والأعراضُ ٧٢، والأنشطةُ اليومية ٨١، والرياضةُ ٤٣، وجودةُ الحياة ٥٢ — ولمن عمرُه ٤٠ فأقلّ أعلى بـ٦–١٧ نقطة — Pedersen 2021).\n" +
        "• مقياسُ الركبة الذاتيّ زاد ١٠٫٩ فأكثر (Noorduyn 2019)، أو الأنشطةُ المختارة ٢٫٥ لكلٍّ منها (Noorduyn 2020).\n" +
        "• للرياضة: اختباراتُ القفز وقوّةُ الفخذ ٩٠٪ من الجهة الأخرى فأكثر (Stensrud 2014 · Reid 2007)، والتورّمُ أثرٌ أو أقلّ والمدى كامل.\n" +
        "• البرنامجُ المنزليّ يؤدّيه وحده، وخطّةُ النوبة.\n" +
        EXTEND_AR,
        "Discharge criteria (at least two, and the last for every patient):\n" +
        "• The knee score at or above the state the patient finds acceptable (pain 74, symptoms 72, daily activities 81, sport 43, quality of life 52 — and 6–17 points higher for those aged 40 or younger — Pedersen 2021).\n" +
        "• The subjective knee score up 10.9 or more (Noorduyn 2019), or the chosen activities up 2.5 each (Noorduyn 2020).\n" +
        "• For sport: hop tests and quadriceps strength at 90% or more of the other side (Stensrud 2014 · Reid 2007), swelling trace or less and full range.\n" +
        "• The home programme done independently, with a flare plan.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• القوّةُ الثقيلة ٤ × ٦ بقاعدة «زائد اثنين» (Kise 2016).\n" +
        "• القفز: قفزةُ المتزلّج ٣ × ١٠ والقفزُ على الصليب ٣ × ٣ دورات (Kise 2016)، ثمّ القفزُ إلى الأمام والثبات والقفزُ الجانبيّ والجريُ على شكل ٨ لمن يعود إلى الرياضة — والتورّمُ أثرٌ أو أقلّ وقوّةُ الفخذ ٨٠٪ والقرفصاءُ على ساقٍ بلا ألم (Adams 2012).\n" +
        "• الجريُ المتدرّج للرياضيّ (اقتراحٌ من تأهيل الرباط الصليبيّ — Adams 2012): ١٦٠ متراً مشياً و١٦٠ جرياً عشرَ مرّات، ثمّ يطول الجريُ درجةً حين يكتمل ٣٫٢ كيلومتر بلا تورّمٍ ولا ألمٍ يزيد، أربعَ مرّاتٍ في الأسبوع على الأكثر ويوماً بعد يوم، ولا أكثر من درجتين في الأسبوع؛ ولا تدرّجَ خاصّاً بالغضروف (بحثٌ صفريّ).\n" +
        "• الحياةُ اليومية في الجلسة: السجودُ والتشهّدُ بوسادةٍ ثمّ بدونها، والقيامُ من الأرض بالساق السليمة أوّلاً، والقرفصاءُ للمرحاض العربيّ، والنزولُ عن الدرج بالتناوب.\n" +
        "• البرنامجُ المنزليّ الأخير مكتوباً: ٤–٥ تمارين قوّة مرّتين إلى ثلاثٍ في الأسبوع حتى الأسبوع الثاني عشر، وتمارينُ التوازن يومياً.",
        "• Heavy strength at 4 × 6 with the 'plus-two' rule (Kise 2016).\n" +
        "• Hopping: the skater hop at 3 × 10 and the hop cross at 3 × 3 rounds (Kise 2016), then forward hop-and-stick, lateral hops and figure-of-eight running for those returning to sport — with swelling trace or less, quadriceps strength at 80% and a pain-free single-leg squat (Adams 2012).\n" +
        "• Graded running for sporting patients (a suggestion from ACL rehabilitation — Adams 2012): 160 metres walking and 160 metres jogging ten times, then a longer jog one level up once 3.2 kilometres are completed without increased swelling or pain, at most four times a week and every other day, and no more than two levels a week; there is no meniscus-specific progression (a documented zero result).\n" +
        "• Daily life in the session: prostration and tashahhud with a cushion and then without, rising from the floor with the good leg first, squatting for the squat toilet, and step-over-step stair descent.\n" +
        "• The final home programme in writing: 4–5 strength exercises two to three times a week to week 12, and balance exercises daily.",
      ],
      exercises: [
        { code: "leg-press-progressive", sets: 4, reps: 6, rest: 90,
          note: ["على ساقٍ واحدة بثقلٍ أعلى بقاعدة «زائد اثنين» (Kise 2016).", "One leg at a time with a heavier load by the 'plus-two' rule (Kise 2016)."] },
        { code: "seated-knee-extension", sets: 4, reps: 6, rest: 90 },
        { code: "standing-hamstring-curl", sets: 4, reps: 6, rest: 90 },
        { code: "single-leg-squat-to-box", sets: 3, reps: 10, rest: 60 },
        { code: "split-squat", sets: 3, reps: 10, rest: 60,
          note: ["أعمق، ثمّ طعنةٌ ماشية لمن يعود إلى الرياضة.", "Deeper, then walking lunges for those returning to sport."] },
        { code: "skater-hop-soft-landing", sets: 3, reps: 10, rest: 60 },
        { code: "hop-cross-four-directions", sets: 3, reps: 3, rest: 60 },
        { code: "forward-hop-stick", sets: 3, reps: 5, rest: 60,
          note: ["بالساقين ثمّ بساق، والهبوطُ بركبةٍ فوق القدم — تمهيداً لاختبارات القفز.", "On two legs, then one, landing with the knee over the foot — leading up to the hop tests."] },
        { code: "lateral-hops", sets: 3, reps: 10, rest: 60 },
        { code: "figure-8-agility",
          doseNote: ["لمن يعود إلى الرياضة: ٤ مرّات في كلّ اتّجاه بسرعةٍ تزيد.", "For those returning to sport: 4 times each way at rising speed."] },
        { code: "knee-stability-band-loop", sets: 3, reps: 10,
          note: ["على وسادة توازن أو بعينين مغمضتين.", "On a balance pad or with the eyes closed."] },
        { code: "fitball-hamstring-curl", sets: 3, reps: 8, rest: 60,
          note: ["على ساقٍ واحدة إن أتقنه بالساقين.", "On one leg once it is mastered on two."] },
        { code: "kneeling-floor-transfer",
          note: ["النزولُ إلى الأرض والقيامُ منها بالساق السليمة أوّلاً — لا بعد الخياطة قبل أربعة أشهر.", "Getting down to and up from the floor with the good leg first — not after a repair before four months."] },
        { code: "prayer-deep-flexion-meniscus",
          note: ["وسادةٌ أخفض ثمّ الأرض، والقيامُ بلا سند.", "A lower cushion, then the floor, and rising without support."] },
        { code: "stationary-cycling",
          doseNote: ["١٠–٢٠ دقيقة بجهدٍ متوسّط إلى عالٍ — للإحماء واللياقة.", "10–20 minutes at moderate to high effort — for warm-up and fitness."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ بستٍّ في الأسبوع (أربعةُ أسابيع) للعلاج بلا جراحة والتقويةُ الثقيلة يوماً بعد يوم، و١٢ بعد الاستئصال الجزئيّ تمتدّ إلى ١٨، وتمديدٌ واحد بستّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين — والتجاربُ مرّتين إلى ثلاثٍ في الأسبوع ثمانيةَ أسابيع إلى اثني عشر (١٦–٣٦ جلسة)، وبعد الاستئصال ٦–٩ جلسات في أسبوعين أو ثلاثة، ولا تجربةَ لخمسٍ أو ستّ: أبقِه، أو اجعله مرّتين إلى ثلاثٍ في الأسبوع ثمانيةَ أسابيع إلى اثني عشر.",
    en: "24 sessions at six a week (four weeks) for non-operative care with heavy strengthening every other day, 12 after a partial meniscectomy extended to 18, one extension of six for those who reached an important change without meeting discharge, and the home programme to week 12 with two reviews — trials used two to three a week for eight to twelve weeks (16–36 sessions) (Kise 2016 · van de Graaf 2018 · Skou 2022), and after meniscectomy 6–9 sessions over two or three weeks (Moffet 1994 · Kelln 2009), and no trial tested five or six a week: keep it, or make it two to three a week for eight to twelve weeks." },
  { key: "limits", topic: "limits",
    ar: "الحدود: قاعدةُ الألم والتورّم (٠–٢ آمن، وحتى ٥ مقبول، وفوق ٥ أو زيادةُ التورّم درجةً أو بلوغُه ٢+ خطر)، والانتقالُ إلى الثانية بالتورّم ١+ ونقصِ المدّ ٥° والثنيِ ١١٠° ورفعِ الساق بلا تأخّر، وإلى الثالثة باثنين من: الألمُ نقطتان ونتائجُ الركبة +١٢ أو +٨ وقوّةُ الفخذ ٨٠٪، والخروجُ بحالةٍ يقبلها المريض في نتائج الركبة أو المقياس الذاتيّ +١٠٫٩ أو الأنشطةِ +٢٫٥ والقفزِ ٩٠٪ للرياضة، ولا قفزَ ولا جريَ قبل التورّم أثراً وقوّةِ الفخذ ٨٠٪ — اقتراحٌ مبنيٌّ على الفرق المهمّ وما استعملته التجارب: أبقِها أو عدّلها.",
    en: "The limits: the pain-and-swelling rule (0–2 safe, up to 5 acceptable, above 5 or swelling up one grade or reaching 2+ high risk) (Hall 2012 · Adams 2012), progression to phase 2 on swelling of 1+, an extension deficit of 5°, flexion of 110° and a straight-leg raise without a lag, to phase 3 on two of: pain −2, the knee score +12 or +8 and quadriceps strength 80%, and discharge at an acceptable knee-score state, the subjective knee score +10.9 or the activities +2.5 and hopping at 90% for sport (Pedersen 2021 · Noorduyn 2019 · Noorduyn 2020), with no hopping or running before swelling is trace and the quadriceps is at 80% — proposals built on the important changes and trial practice: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: الركبةُ المنحبسة حقاً (حاجزٌ نابض ثابت) في اليوم نفسِه والانحباسُ الكاذب لا يُحال وحده، والتورّمُ المشدود خلال ساعات من الإصابة، وقاعدةُ أوتاوا، والركبةُ الحارّة بعد المنظار أو الحقنة، والجلطة؛ وكلُّ من عمرُه ٤٥ فأقلّ بإصابةٍ واضحة إلى جرّاح العظام خلال أسبوعين إلى ثلاثة لإمكان الخياطة، وتمزّقُ الجذر والكسرُ تحت الغضروف خلال أسابيع؛ وقاعدةُ الأشهر الثلاثة في الأسبوع الثاني عشر؛ ومعاييرُ ما بعد الجراحة: أبقِها أو عدّلها مع طبيب المركز.",
    en: "The referral rules: a truly locked knee (a fixed springy block) the same day while pseudo-locking is not referred on its own, a tense swelling within hours of injury, the Ottawa rule, a hot knee after arthroscopy or an injection, and thrombosis; everyone aged 45 or younger with a clear injury to an orthopaedic surgeon within two to three weeks for a possible repair (van der List 2025), and a root tear or a subchondral insufficiency fracture within weeks (Krych 2017 · Yamaguchi 2021); the three-month rule at week 12 (Beaufils 2017); and the post-surgery criteria (Pujol 2025): keep or adjust with the centre's doctor." },
  { key: "repair", topic: "content",
    ar: "بعد خياطة الغضروف أو إصلاح جذره لا يضع البروتوكولُ قيوداً: تُكتب قيودُ الجرّاح في الجلسة الأولى، والصلاةُ على الكرسيّ ولا قرفصاءَ عميقة ولا قفزَ ولا لفَّ أربعةَ أشهرٍ على الأقلّ إلّا إن قال غيرَ ذلك: أبقِ ذلك، أو اكتب مع جرّاحي المركز قيوداً افتراضية لكلّ نوع خياطة (الطوليّ والشعاعيّ والجذر).",
    en: "After a meniscal repair or root repair the protocol sets no restrictions: the surgeon's restrictions are written down at the first session, with chair prayer and no deep squatting, jumping or twisting for at least four months unless the surgeon says otherwise (Pujol 2025): keep this, or write default restrictions with the centre's surgeons for each repair type (vertical, radial and root)." },
  { key: "device-electro-compression", topic: "devices",
    ar: "التحفيزُ العضليّ مساعدٌ بقاعدتك بعد الاستئصال لمن تأخّر مدُّه (٥٠ هرتز فأكثر وثنائيُّ الطور وأقوى انقباضٍ في الأسبوعين الأوّلين)، والمعهدُ البريطانيّ ضدّه للتنكّسيّ مع الخشونة؛ والتبريدُ مع الضغط مساعدٌ بعد الاستئصال وللتورّم ١+ فأكثر، وإعداداتُه لم تُذكر في التجربة: أبقِهما بإعداداتهما، واملأ ضغطَ جهاز الضغط ودورتَه من الجهاز، أو اجعل أحدَهما «لا يُستخدم».",
    en: "NMES is an adjunct by your rule after meniscectomy for those with an extensor lag (50 Hz or more, biphasic, the strongest contraction, in the first two weeks — Conley 2021), and NICE is against it for degenerative tears with osteoarthritis (NICE NG226); cold with compression is an adjunct after meniscectomy and for swelling of 1+ or more, with settings not reported in the trial (Hrubar 2023): keep them with their settings and fill the compression pressure and cycle from the device, or set either to 'Not used'." },
  { key: "device-adjuncts", topic: "devices",
    ar: "التيكارُ والمغناطيسُ والحرارةُ والأشعّة تحت الحمراء مساعدةٌ بقاعدتك — ولا تجربةَ لأيٍّ منها في الغضروف، والتيكارُ لم يُضف شيئاً في خشونة الركبة، والمغناطيسُ تجربتُه الوحيدة بجهازٍ منزليّ ستَّ ساعاتٍ يومياً بعد منظار الغضروف المفصليّ، ولا حرارةَ على ركبةٍ متورّمة: أبقِها بشروطها أو اجعل بعضَها «لا يُستخدم»، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Tecar, magnetic therapy, heat and infrared are adjuncts by your rule — none has a trial in meniscal tears, Tecar added nothing in knee osteoarthritis (Tezen 2024), the only magnetic trial used a home device for six hours a day after arthroscopic cartilage treatment (Zorzi 2007), and no heat on a swollen knee: keep them with their conditions or set some to 'Not used', and fill the magnetic settings from the centre's device." },
  { key: "device-laser-shock-needle", topic: "devices",
    ar: "الليزرُ «لا يُستخدم» ولو كانت له تجربةٌ واحدة (٩٠٤ نانومتر و٢٫٥٢ جول لكلّ نقطة على عشرين نقطة، وعددُ الجلسات لم يُذكر)، والموجاتُ الصادمة «لا يُستخدم» ولها تجربةٌ واحدة بالوهميّ (مركّزة ٠٫٢٥ ملّي جول/مم² و٢٠٠٠ نبضة ثلاثَ مرّاتٍ أسبوعياً، قلّ الألمُ ولم تختلف المقاييس)، والإبرُ الجافّة والأمواجُ فوق الصوتية «لا يُستخدم»: أبقِها كذلك، أو اجعل الليزرَ أو الصادمةَ مساعداً للتنكّسيّ بعد ستّة أسابيع بلا تحسّن واكتب إعداداتِها من جهاز المركز.",
    en: "Laser is 'Not used' although it has one trial (904 nm and 2.52 J per point over twenty points, number of sessions not reported — Alsirhani 2026), shockwave is 'Not used' with one sham-controlled trial (focused 0.25 mJ/mm² and 2000 impulses three times weekly; pain fell, scores did not differ — Hashimoto 2024), and dry needling and ultrasound are 'Not used': keep them so, or make laser or shockwave an adjunct for degenerative tears not improving after six weeks and enter its settings from the centre's device." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: الألمَ من ١٠ (الأقلّ أفضل)، والأنشطةَ التي يختارها المريض بالعربية من ١٠ (الأكثر أفضل)، ودرجةَ التورّم في اختبار المسح من ٠ إلى ٤ (الأقلّ أفضل)، ونقصَ المدّ بالدرجات (الأقلّ أفضل)، وقوّةَ الفخذ نسبةً إلى الجهة الأخرى وقفزَ الساق الواحدة نسبةً إليها (الأكثر أفضل)، والجلوسَ والقيامَ ٣٠ ثانية للتنكّسيّ (الأكثر أفضل)؛ وتأكّد أنّ نتائجَ الركبة المزروعة بالنسخة العربية المُتحقَّقة في إصابات الغضروف، ومقياسُ الغضروف الهلاليّ بالعربية خيارٌ جديد.",
    en: "Add under 'Measures' → custom measure: pain out of 10 (lower is better), the Arabic Patient-Specific Functional Scale out of 10 (higher is better), the stroke-test swelling grade from 0 to 4 (lower is better), the extension deficit in degrees (lower is better), quadriceps strength and the single-leg hop as a percentage of the other side (higher is better), and the 30-second chair stand for degenerative tears (higher is better); and make sure the seeded KOOS uses the Arabic version validated in meniscal injuries (Almangoush 2013), with the Arabic WOMET as a new option (Albishi 2026)." },
];

export const name = "158_physio_meniscal_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
