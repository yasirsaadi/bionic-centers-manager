// Migration 126: خشونةُ الركبة — البروتوكولُ الرابع مفصَّلاً (§4.di — ٢٠٢٦-١٠-١١).
//
// طلبُ المالك بعد اكتمال الثلاثة الأولى: «الآن نبدأ بالبروتوكول القادم» — والرابعُ بالترتيب المتّفق عليه (§4.dg): خشونةُ الركبة (`knee-oa-geriatric`).
// **بالقالب كاملاً** (§4.dd · §4.dg · §4.dh): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعة أسابيع)، وثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ رقمية،
// وثلاثَ عشرةَ بطاقةً جديدة للركبة والورك والكاحل (وأربعَ عشرةَ صورةً مطلوبة)، والأجهزةُ بدرجة دليلها و«استعمال المركز» وإعداداتها، والبرنامجُ المنزليّ
// حتى الأسبوع الثاني عشر وزيارةُ متابعة، والمقاييسُ كما زُرعت (نتائجُ الركبة KOOS، والجلوسُ والوقوف ٣٠ ثانية، والوقوفُ والمشي TUG، والألمُ لكلّ مريض).
// كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الركبة**: التشخيصُ سريريّ بلا أشعةٍ روتينية (NICE 2022)؛ والأساسُ التمرينُ وإنقاصُ الوزن والتعليمُ في كلّ الإرشادات (OARSI 2019 · ACR 2019 ·
// NICE 2022 · EULAR 2018)؛ وتمارينُ التقوية يوماً بعد يوم بإشرافٍ ثلاثَ مرّاتٍ في الأسبوع على الأقلّ (Juhl 2014) — فأربعةُ أسابيع في المركز تعطي اثنتي عشرةَ جلسةَ
// تقويةٍ مشرَفٍ عليها؛ والتحكّمُ العصبيّ العضليّ بمحاذاة الورك والركبة والقدم (GLA:D)؛ والعلاجُ اليدويّ مع التمرين لا وحده (NICE · Deyle 2020).
// **والأجهزةُ هنا أوضحُ ما في الإرشادات ضدّها**: NICE 2022 لا تقدّم التحفيزَ ولا الأمواجَ فوق الصوتية ولا الليزر ولا الإبرَ الجافة، وACR 2019 «توصيةٌ قوية ضدّ»
// التحفيز — والاستعمالُ بقرار المالك «تبعاً لكلام سليم» (§4.cx): التيكارُ والمغناطيسُ والتحفيزُ مساعد، والحرارةُ كما في البروتوكول، والليزرُ والأمواجُ
// فوق الصوتية لا يُستخدمان، والإبرُ كما في البروتوكول (الإرشاداتُ ضدّها) ⟵ لا تُستخدم حتى يقرّر سليم. ولا شدَّ للركبة.
//
// المصادر: OARSI 2019 · ACR/Arthritis Foundation 2019 · NICE NG226 2022 · EULAR 2018 · Cochrane 2015 (التمارين) · Juhl 2014 · GLA:D 2017 · IDEA 2013 ·
// Dobson 2013 (اختباراتُ الأداء) · Deyle 2020 · Stausholm 2019 (الليزر) · Palmer 2014 (التحفيز).
// القواعدُ في `physio_content.ts`: بطاقاتٌ لا تُمَسّ إن وُجدت، والنصوصُ لا تُكتب فوق تعديل إنسان، والمراحلُ لا تتكرّر، والخططُ المفتوحة تأخذ نسختَها.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٥ من ١٠ مقبول إن عاد إلى مستواه المعتاد قبل صباح اليوم التالي — بلا زيادةٍ في تورّم الركبة ولا في تيبّسها الصباحيّ.";
const PAIN_RULE_EN = "Pain up to 5/10 during exercise is acceptable if it settles to its usual level by the next morning — with no increase in knee swelling or morning stiffness.";

const ALTERNATE_AR = "يوماً بعد يوم في المركز — لا يومين متتاليين؛ وفي البيت ثلاثَ مرّاتٍ في الأسبوع.";
const ALTERNATE_EN = "Alternate days in the clinic — never on consecutive days; three times a week at home.";
const WARMUP: [string, string] = ["إحماءٌ: ١٠ دقائق بلا مقاومة أو بمقاومةٍ خفيفة قبل التمارين.", "Warm-up: 10 minutes with no or light resistance before exercising."];

/** **البطاقاتُ الجديدة** — والجلوسُ والقيام والجسرُ والمشيُ المتدرّج والطعنةُ الثابتة من البروتوكول الأوّل (ترحيل ١١٩) برموزها. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "quad-set", nameAr: "شدّ عضلة الفخذ الأمامية والساقُ ممدودة", nameEn: "Quadriceps setting (static quads)",
    kind: "strength", region: "knee", perSide: true, sets: 2, reps: 10, hold: 5, rest: 5,
    purpose: ["يوقظ العضلةَ الرباعية التي تضعف وتتثبّط مع ألم الركبة وتورّمها (Arthrogenic muscle inhibition)، ويعيد بسطَ الركبة الكامل — وهو أوّلُ خطوةٍ قبل أيّ تقويةٍ أثقل.",
      "Re-activates the quadriceps, which weaken and are inhibited by knee pain and swelling (arthrogenic muscle inhibition), and restores full knee extension — the first step before any heavier strengthening."],
    start: ["جالسٌ أو مستلقٍ على الظهر والساقُ ممدودة، ومنشفةٌ صغيرة ملفوفة تحت الركبة، والقدمُ تشير إلى السقف.",
      "Sitting or lying on the back with the leg straight, a small rolled towel under the knee and the toes pointing to the ceiling."],
    steps: [[
      "شدّ عضلةَ الفخذ الأمامية لتضغط مؤخّرةُ الركبة على المنشفة، فترتفع الرضفةُ قليلاً نحو الورك.",
      "اسحب أصابعَ القدم نحوك في الوقت نفسِه.",
      "اثبت ٥ ثوانٍ وتنفّس بشكلٍ طبيعيّ.",
      "أرخِ تماماً ٥ ثوانٍ ثمّ كرّر.",
      "أكمل التكرارات ثمّ الساقَ الأخرى.",
    ], [
      "Tighten the front thigh muscle so the back of the knee presses down into the towel and the kneecap glides slightly up towards the hip.",
      "Pull the toes towards you at the same time.",
      "Hold for 5 seconds while breathing normally.",
      "Relax fully for 5 seconds, then repeat.",
      "Complete the set, then the other leg.",
    ]],
    cues: [[
      "شدُّ الألوية أو رفعُ الساق بدل الفخذ ⟵ الفخذُ الأماميّ وحده، والساقُ تبقى على الأرض.",
      "حبسُ النفس ⟵ تنفّس طوال الثبات.",
      "انقباضٌ ضعيف لا ترتفع معه الرضفة ⟵ ضع أصابعك على الفخذ فوق الركبة لتشعر بالعضلة تقسو.",
    ], [
      "Squeezing the buttocks or lifting the leg instead of the thigh → the front thigh only, with the leg staying down.",
      "Holding the breath → keep breathing through the hold.",
      "A weak contraction that does not move the kneecap → rest your fingers on the thigh above the knee to feel the muscle firm up.",
    ]],
    easier: ["ثباتٌ أقصر (٣ ثوانٍ) وعددٌ أقلّ، أو بلا منشفة.", "Shorter holds (3 seconds) and fewer repetitions, or without the towel."],
    harder: ["ثباتٌ ١٠ ثوانٍ، أو مع رفع الساق مستقيمةً بعده، أو في الوقوف والركبةُ مستقيمة.", "10-second holds, or followed by a straight-leg raise, or in standing with the knee straight."],
    stopIf: ["ألمٌ حادّ في الركبة، أو تورّمٌ يزداد بعد التمرين.", "Sharp knee pain, or swelling that increases after exercise."],
    equipment: ["منشفةٌ صغيرة ملفوفة.", "A small rolled towel."],
    doseNote: ["مرّتان أو ثلاثٌ يومياً.", "Two or three times daily."],
    images: [{ key: "quad-set-1", ar: "الساقُ ممدودة ومنشفةٌ تحت الركبة، والفخذُ يشدّ فتضغط الركبةُ عليها", en: "Leg straight with a towel under the knee, the thigh tightening to press the knee into it", search: "quadriceps setting exercise towel" }],
  },
  {
    code: "heel-slide", nameAr: "سحب الكعب (ثني الركبة في الاستلقاء)", nameEn: "Heel slides (supine knee flexion)",
    kind: "mobility", region: "knee", perSide: true, sets: 1, reps: 10, hold: 3,
    purpose: ["يستعيد ثنيَ الركبة ويقلّل التيبّسَ الصباحيّ وبعد الجلوس، بحركةٍ بلا حملٍ على المفصل — ويحتاج المريضُ ثنياً يقارب ١٠٠–١١٠° للدرج والقيام من الكرسيّ.",
      "Restores knee bending and reduces stiffness in the morning and after sitting, with movement and no load through the joint — about 100–110° of flexion is needed for stairs and rising from a chair."],
    start: ["مستلقٍ على الظهر على سريرٍ أو فرشة والساقان ممدودتان، وكيسٌ بلاستيكيّ أو منشفةٌ تحت الكعب ليسهل الانزلاق.",
      "Lying on the back on a bed or mat with both legs straight, a plastic bag or towel under the heel so it slides easily."],
    steps: [[
      "اسحب الكعبَ نحو الورك ببطء فتنثني الركبة، والكعبُ يبقى على السطح.",
      "توقّف حيث تشعر بشدٍّ مريح، واثبت ٣ ثوانٍ.",
      "أعِد الساقَ ممدودةً ببطء حتى تستقيم الركبةُ كاملاً.",
      "كرّر ١٠ مرّات بإيقاعٍ هادئ.",
      "ثمّ الساقَ الأخرى إن كانت تؤلم أيضاً.",
    ], [
      "Slide the heel slowly towards the buttock so the knee bends, keeping the heel on the surface.",
      "Stop at a comfortable stretch and hold for 3 seconds.",
      "Slide the leg back out slowly until the knee is fully straight.",
      "Repeat 10 times at a calm pace.",
      "Then the other leg if it is also painful.",
    ]],
    cues: [[
      "رفعُ الكعب عن السطح ⟵ يبقى منزلقاً عليه.",
      "حركةٌ سريعة أو دفعٌ إلى الألم ⟵ بطيئةٌ إلى الشدّ المريح، والمدى يزيد مع الأيّام.",
      "التوقّفُ قبل استقامة الركبة عند العودة ⟵ أكمل حتى تستقيم تماماً.",
    ], [
      "Lifting the heel off the surface → keep it sliding on it.",
      "Moving fast or pushing into pain → slowly to a comfortable stretch; the range grows over the days.",
      "Stopping short of a straight knee on the way back → finish with the knee fully straight.",
    ]],
    easier: ["مدىً أصغر، أو بمساعدة منشفةٍ حول القدم تسحبها باليدين.", "A smaller range, or helped by a towel around the foot pulled with both hands."],
    harder: ["ثباتٌ أطول في آخر المدى (١٠ ثوانٍ)، أو في الجلوس بسحب القدم تحت الكرسيّ.", "A longer end-range hold (10 seconds), or in sitting by sliding the foot back under the chair."],
    stopIf: ["ألمٌ حادّ أو إحساسٌ بانحشارٍ في الركبة، أو تورّمٌ يزداد.", "Sharp pain or a catching sensation in the knee, or increasing swelling."],
    equipment: ["سريرٌ أو فرشة، وكيسٌ بلاستيكيّ أو منشفة.", "Bed or mat, and a plastic bag or towel."],
    doseNote: ["مرّتان يومياً، وصباحاً قبل النهوض.", "Twice daily, and in the morning before getting up."],
    images: [{ key: "heel-slide-1", ar: "مستلقٍ والكعبُ ينزلق نحو الورك فتنثني الركبة", en: "Lying on the back, the heel sliding towards the buttock as the knee bends", search: "heel slide knee flexion exercise" }],
  },
  {
    code: "heel-prop", nameAr: "مدّ الركبة بإسناد الكعب", nameEn: "Heel prop (passive knee extension)",
    kind: "stretch", region: "knee", perSide: true, sets: 2, hold: 120, rest: 30,
    purpose: ["يستعيد بسطَ الركبة الكامل بتمطيطٍ طويلٍ خفيف — فنقصُ البسط القليل (٥–١٠°) يزيد العبءَ على المفصل والعضلة في المشي ويُبقي الركبةَ مثنيّةً عند الوقوف.",
      "Restores full knee extension with a long, gentle stretch — even a small extension loss (5–10°) increases load on the joint and muscle when walking and keeps the knee bent in standing."],
    start: ["جالسٌ أو مستلقٍ والساقُ ممدودة، والكعبُ على منشفةٍ ملفوفة أو وسادةٍ صلبة بحيث لا يلمس شيءٌ مؤخّرةَ الركبة.",
      "Sitting or lying with the leg straight and the heel on a rolled towel or firm cushion so nothing touches the back of the knee."],
    steps: [[
      "أرخِ عضلاتِ الفخذ ودع الركبةَ تهبط بثقلها نحو الأرض.",
      "ابقَ هكذا دقيقتين وتنفّس بهدوء.",
      "شدّ الفخذَ الأماميّ مرّتين أو ثلاثاً خلالها لتدفع الركبةَ إلى الأسفل أكثر.",
      "استرح ٣٠ ثانية بثني الركبة قليلاً.",
      "كرّر مرّةً ثانية.",
    ], [
      "Relax the thigh muscles and let the knee sink towards the floor under its own weight.",
      "Stay like this for two minutes, breathing calmly.",
      "Tighten the front thigh two or three times during the hold to push the knee down further.",
      "Rest for 30 seconds with the knee slightly bent.",
      "Repeat once more.",
    ]],
    cues: [[
      "وسادةٌ أو منشفةٌ تحت الركبة ⟵ تحت الكعب وحده، والركبةُ في الهواء.",
      "شدُّ العضلات طوال الوقت ⟵ أرخِ، والثقلُ هو الذي يمدّ.",
      "دورانُ الساق للخارج ⟵ القدمُ تشير إلى السقف.",
    ], [
      "A pillow or towel under the knee → under the heel only, with the knee unsupported.",
      "Tensing the muscles throughout → relax and let gravity do the stretch.",
      "The leg rolling outwards → keep the toes pointing to the ceiling.",
    ]],
    easier: ["مدّةٌ أقصر (دقيقة)، أو كعبٌ على ارتفاعٍ أقلّ.", "A shorter hold (one minute), or the heel on a lower support."],
    harder: ["ثقلٌ خفيف (كيسُ رزٍّ ١–٢ كغ) فوق الركبة لا على الرضفة، أو ٣–٥ دقائق متّصلة.", "A light weight (a 1–2 kg bag of rice) just above the knee, not on the kneecap, or 3–5 minutes continuously."],
    stopIf: ["ألمٌ حادّ خلف الركبة أو تنميلٌ في القدم، أو تورّمٌ يزداد.", "Sharp pain behind the knee or tingling in the foot, or increasing swelling."],
    equipment: ["منشفةٌ ملفوفة أو وسادةٌ صلبة، وكيسٌ خفيف للتصعيب.", "A rolled towel or firm cushion; a light bag for progression."],
    doseNote: ["مرّتين يومياً لمن عنده نقصُ بسط — ويُوقف حين تستقيم الركبةُ كاملاً.", "Twice daily for those with an extension deficit — stop once the knee straightens fully."],
    images: [{ key: "heel-prop-1", ar: "الكعبُ على منشفةٍ ملفوفة والركبةُ في الهواء تهبط نحو الاستقامة", en: "The heel on a rolled towel with the knee unsupported, sinking towards straight", search: "heel prop knee extension stretch" }],
  },
  {
    code: "straight-leg-raise", nameAr: "رفع الساق مستقيمةً في الاستلقاء", nameEn: "Straight leg raise",
    kind: "strength", region: "knee", perSide: true, sets: 3, reps: 10, hold: 3, rest: 45,
    purpose: ["يقوّي العضلةَ الرباعية وقابضاتِ الورك والركبةُ مستقيمةٌ بلا حركةٍ في المفصل — تقويةٌ آمنة للركبة المؤلمة، ويكشف «تأخّرَ البسط» حين تنثني الركبةُ أثناء الرفع.",
      "Strengthens the quadriceps and hip flexors with the knee straight and no movement in the joint — safe strengthening for a painful knee, and it shows any extensor lag when the knee bends during the lift."],
    start: ["مستلقٍ على الظهر، والساقُ الأخرى مثنيّة والقدمُ على السرير، والساقُ التي تتمرّن ممدودة.",
      "Lying on the back with the other knee bent and its foot flat, and the exercising leg straight."],
    steps: [[
      "شدّ الفخذَ الأماميّ أوّلاً حتى تستقيم الركبةُ تماماً، واسحب أصابعَ القدم نحوك.",
      "ارفع الساقَ مستقيمةً حتى تصير بمستوى الركبة الأخرى (نحو ٣٠–٤٠ سم).",
      "اثبت ٣ ثوانٍ.",
      "أنزلها ببطءٍ في ٣ ثوانٍ والركبةُ ما تزال مستقيمة.",
      "أرخِ لحظةً ثمّ كرّر.",
    ], [
      "Tighten the front thigh first until the knee is fully straight, and pull the toes towards you.",
      "Lift the straight leg to the height of the other knee (about 30–40 cm).",
      "Hold for 3 seconds.",
      "Lower slowly over 3 seconds, keeping the knee straight.",
      "Relax briefly, then repeat.",
    ]],
    cues: [[
      "انثناءُ الركبة أثناء الرفع ⟵ شدّ الفخذَ قبل الرفع؛ وإن انثنت فارفعها أقلّ.",
      "تقوّسُ أسفل الظهر ⟵ شدّ البطن خفيفاً، والساقُ الأخرى مثنيّة.",
      "الإسقاطُ السريع ⟵ نزولٌ بطيءٌ متحكَّم.",
    ], [
      "The knee bending during the lift → tighten the thigh before lifting; if it still bends, lift less high.",
      "The low back arching → a light abdominal brace, with the other knee bent.",
      "Dropping the leg → slow, controlled lowering.",
    ]],
    easier: ["مدىً أصغر، أو تكراراتٌ أقلّ بثباتٍ أقصر.", "A smaller range, or fewer repetitions with shorter holds."],
    harder: ["ثقلٌ على الكاحل (٠٫٥–٢ كغ)، أو في الجلوس مسنوداً إلى الخلف بالمرفقين.", "An ankle weight (0.5–2 kg), or in long sitting propped on the elbows."],
    stopIf: ["ألمٌ في أسفل الظهر، أو ألمٌ في الركبة يزيد على ٥ من ١٠.", "Low back pain, or knee pain above 5/10."],
    equipment: ["فرشةٌ أو سرير، وثقلُ كاحلٍ للتصعيب.", "Mat or bed; an ankle weight for progression."],
    doseNote: ["يومياً في المرحلة الأولى، ثمّ يوماً بعد يوم مع الثقل.", "Daily in phase 1, then on alternate days once weighted."],
    images: [{ key: "straight-leg-raise-1", ar: "مستلقٍ والساقُ الأخرى مثنيّة، والساقُ الممدودة مرفوعةٌ والركبةُ مستقيمة", en: "Lying with the other knee bent, the straight leg lifted with the knee locked straight", search: "straight leg raise exercise" }],
  },
  {
    code: "seated-knee-extension", nameAr: "مدّ الركبة جالساً", nameEn: "Seated knee extension (long arc quad)",
    kind: "strength", region: "knee", perSide: true, sets: 3, reps: 10, hold: 3, rest: 60,
    purpose: ["يقوّي العضلةَ الرباعية في مداها كلّه — وقوّتُها أكثرُ ما يرتبط بالألم والوظيفة في خشونة الركبة — ويُصعَّب بثقلٍ على الكاحل خطوةً خطوة.",
      "Strengthens the quadriceps through their full range — quadriceps strength is closely linked to pain and function in knee osteoarthritis — and is progressed step by step with an ankle weight."],
    start: ["جالسٌ على كرسيٍّ ثابت بظهرٍ مسنود، والقدمان على الأرض والفخذان على المقعد كاملاً.",
      "Sitting on a stable chair with the back supported, feet on the floor and the thighs fully on the seat."],
    steps: [[
      "اسحب أصابعَ القدم نحوك.",
      "مدّ الركبةَ ببطءٍ حتى تستقيم الساقُ أمامك.",
      "اثبت ٣ ثوانٍ وشدّ الفخذَ في الأعلى.",
      "أنزل القدمَ ببطءٍ في ٣ ثوانٍ.",
      "أكمل التكرارات ثمّ الساقَ الأخرى.",
    ], [
      "Pull the toes towards you.",
      "Straighten the knee slowly until the leg is straight out in front.",
      "Hold for 3 seconds, tightening the thigh at the top.",
      "Lower the foot slowly over 3 seconds.",
      "Complete the set, then the other leg.",
    ]],
    cues: [[
      "رفعُ الفخذ عن المقعد أو الميلُ للخلف ⟵ الفخذُ ثابتٌ على المقعد، والركبةُ وحدها تتحرّك.",
      "الركلُ السريع ⟵ صعودٌ ونزولٌ بطيئان.",
      "التوقّفُ قبل الاستقامة ⟵ الأعلى ركبةٌ مستقيمة تماماً.",
    ], [
      "Lifting the thigh off the seat or leaning back → the thigh stays on the seat and only the knee moves.",
      "Kicking quickly → slow on the way up and down.",
      "Stopping short of straight → finish with the knee fully straight at the top.",
    ]],
    easier: ["بلا ثقلٍ ومدىً أصغر.", "No weight and a smaller range."],
    harder: ["ثقلٌ على الكاحل يزيد ٠٫٥ كغ حين تصير التكراراتُ سهلة (جهدٌ ٦ من ١٠ أو أقلّ)، أو مطّاطٌ مثبَّتٌ خلف الكرسيّ.", "An ankle weight increased by 0.5 kg once the repetitions are easy (effort ≤ 6/10), or a band anchored behind the chair."],
    stopIf: ["ألمٌ في مقدّمة الركبة يزيد على ٥ من ١٠ أو طقطقةٌ مؤلمة — وفي ألم الرضفة: مدىً أقصر (من ٩٠° إلى ٤٥°).", "Front-of-knee pain above 5/10 or painful clicking — with kneecap pain, use a shorter range (from 90° to 45°)."],
    equipment: ["كرسيٌّ ثابت، وثقلُ كاحلٍ (٠٫٥–٥ كغ) أو مطّاط.", "A stable chair, and an ankle weight (0.5–5 kg) or a band."],
    doseNote: ["يوماً بعد يوم بثقل؛ وبلا ثقلٍ يومياً في المرحلة الأولى.", "Alternate days with weight; daily without weight in phase 1."],
    images: [
      { key: "seated-knee-extension-1", ar: "جالسٌ والساقُ ممدودةٌ أمامه والركبةُ مستقيمة", en: "Seated with the leg straightened out in front and the knee fully straight", search: "seated knee extension exercise" },
      { key: "seated-knee-extension-2", ar: "الحركةُ نفسُها بثقلٍ على الكاحل", en: "The same movement with an ankle weight", search: "ankle weight seated leg extension" },
    ],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "side-lying-hip-abduction", nameAr: "رفع الساق جانباً في الاستلقاء على الجنب", nameEn: "Side-lying hip abduction",
    kind: "strength", region: "hip", perSide: true, sets: 3, reps: 10, hold: 2, rest: 45,
    purpose: ["يقوّي العضلةَ الألوية الوسطى التي تثبّت الحوضَ وتمنع انحرافَ الركبة للداخل في المشي والدرج — وتقويةُ الورك جزءٌ من برامج خشونة الركبة.",
      "Strengthens gluteus medius, which steadies the pelvis and stops the knee collapsing inwards when walking and on stairs — hip strengthening is part of knee osteoarthritis programmes."],
    start: ["مستلقٍ على جنبك والساقُ السفلى مثنيّة للتوازن، والعليا ممدودةٌ على خطّ الجسم، والرأسُ على الذراع أو وسادة.",
      "Lying on your side with the bottom knee bent for balance, the top leg straight in line with the body, and the head on the arm or a pillow."],
    steps: [[
      "شدّ البطنَ خفيفاً لتثبت الحوض.",
      "ارفع الساقَ العليا مستقيمةً نحو السقف قليلاً إلى الخلف، والكعبُ يقود الحركة.",
      "ارفعها نحو ٣٠–٤٠ سم واثبت ثانيتين.",
      "أنزلها ببطء.",
      "أكمل التكرارات ثمّ استلقِ على الجنب الآخر.",
    ], [
      "Set a light abdominal brace to steady the pelvis.",
      "Lift the top leg straight up towards the ceiling and slightly back, leading with the heel.",
      "Lift it about 30–40 cm and hold for 2 seconds.",
      "Lower it slowly.",
      "Complete the set, then lie on the other side.",
    ]],
    cues: [[
      "دورانُ الحوض للخلف أو الساقُ تتقدّم للأمام ⟵ الحوضُ عموديٌّ، والساقُ على خطّ الجسم أو خلفه قليلاً.",
      "أصابعُ القدم تشير للسقف ⟵ تشير إلى الأمام، والكعبُ يقود.",
      "رفعٌ عالٍ بتعويضٍ من الخصر ⟵ ارتفاعٌ أقلّ بشكلٍ صحيح.",
    ], [
      "The pelvis rolling back or the leg drifting forwards → keep the pelvis stacked and the leg in line with the body or slightly behind.",
      "Toes pointing to the ceiling → toes forwards, leading with the heel.",
      "Lifting high by hitching the waist → a lower lift with correct form.",
    ]],
    easier: ["مدىً أصغر، أو والركبةُ مثنيّة (فتحُ الركبتين والقدمان معاً — Clamshell).", "A smaller range, or with the knee bent (opening the knees with the feet together — clamshell)."],
    harder: ["ثقلٌ على الكاحل أو مطّاطٌ فوق الركبتين، أو في الوقوف ممسكاً بكرسيّ.", "An ankle weight or a band above the knees, or in standing holding a chair."],
    stopIf: ["ألمٌ في الورك أو أسفل الظهر، أو ألمٌ في الركبة يزيد على ٥ من ١٠.", "Hip or low back pain, or knee pain above 5/10."],
    equipment: ["فرشةٌ أو سرير، وثقلُ كاحلٍ أو مطّاطٌ للتصعيب.", "Mat or bed; an ankle weight or band for progression."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "side-lying-hip-abduction-1", ar: "مستلقٍ على جنبه والساقُ العليا مرفوعةٌ مستقيمة على خطّ الجسم", en: "Side-lying with the top leg lifted straight in line with the body", search: "side lying hip abduction exercise" }],
  },
  {
    code: "wall-squat", nameAr: "القرفصاء الجزئية مستنداً إلى الحائط", nameEn: "Wall squat (partial)",
    kind: "strength", region: "knee", sets: 3, reps: 10, hold: 5, rest: 60,
    purpose: ["يقوّي الفخذَ والألويةَ في حركةٍ قريبةٍ من الجلوس والقيام والدرج، والحائطُ يسند الظهرَ ويضبط العمقَ بحسب الألم.",
      "Strengthens the quadriceps and gluteals in a movement close to sitting, standing up and stairs, with the wall supporting the back and the depth set by pain."],
    start: ["واقفٌ والظهرُ إلى الحائط، والقدمان بعرض الورك وعلى بعد خطوةٍ صغيرة (٣٠ سم) من الحائط، وأصابعُ القدمين للأمام.",
      "Standing with the back against a wall, feet hip-width apart and a small step (30 cm) away from the wall, toes forwards."],
    steps: [[
      "انزلق بظهرك على الحائط بثني الركبتين حتى ٣٠–٤٥° (ربعُ قرفصاء)، أو بقدر ما يسمح الألم.",
      "الركبتان فوق القدمين باتّجاه الإصبع الثاني.",
      "اثبت ٥ ثوانٍ.",
      "اصعد بدفع القدمين حتى تستقيم الركبتان.",
      "كرّر.",
    ], [
      "Slide down the wall by bending the knees to 30–45° (a quarter squat), or as far as pain allows.",
      "Keep the knees over the feet in line with the second toe.",
      "Hold for 5 seconds.",
      "Push through the feet to slide back up until the knees are straight.",
      "Repeat.",
    ]],
    cues: [[
      "الركبتان تنحرفان للداخل ⟵ باتّجاه الإصبع الثاني، وكأنّك تدفع الأرضَ للخارج.",
      "الركبتان تتقدّمان كثيراً أمام القدمين ⟵ القدمان أبعدُ قليلاً عن الحائط.",
      "الوزنُ على قدمٍ واحدة ⟵ متساوٍ على القدمين.",
    ], [
      "Knees collapsing inwards → in line with the second toe, as if pushing the floor apart.",
      "Knees travelling far in front of the feet → move the feet slightly further from the wall.",
      "Weight shifted onto one foot → evenly on both feet.",
    ]],
    easier: ["نزولٌ أقلّ (١٥–٣٠°) وثباتٌ أقصر.", "Less depth (15–30°) and shorter holds."],
    harder: ["نزولٌ حتى ٦٠° إن لم يؤلم، أو ثباتٌ ٢٠–٣٠ ثانية، أو كرةٌ بين الظهر والحائط.", "Down to 60° if pain-free, 20–30-second holds, or a ball between the back and the wall."],
    stopIf: ["ألمٌ في مقدّمة الركبة يزيد على ٥ من ١٠، أو طقطقةٌ مؤلمة، أو إحساسٌ بعدم ثبات.", "Front-of-knee pain above 5/10, painful clicking, or a feeling of giving way."],
    equipment: ["حائط.", "A wall."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "wall-squat-1", ar: "الظهرُ على الحائط والركبتان مثنيّتان ربعَ قرفصاء فوق القدمين", en: "Back against the wall with the knees bent in a quarter squat over the feet", search: "wall squat partial exercise" }],
  },
  {
    code: "step-up", nameAr: "صعود الدرجة للأمام", nameEn: "Forward step-up",
    kind: "functional", region: "knee", perSide: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يقوّي الفخذَ والألوية لكلّ ساقٍ وحدها في حركةٍ يوميةٍ مباشرة — صعودُ الدرج — ويدرّب محاذاةَ الركبة فوق القدم تحت الحمل (التحكّمُ العصبيّ العضليّ).",
      "Strengthens the quadriceps and gluteals one leg at a time in a direct daily task — climbing stairs — and trains knee-over-foot alignment under load (neuromuscular control)."],
    start: ["واقفٌ أمام درجةٍ ثابتة (١٠–٢٠ سم) أو أوّلِ درجات السلّم، وممسكٌ بالدرابزين أو بكرسيٍّ للتوازن.",
      "Standing in front of a stable step (10–20 cm) or the first stair, holding the handrail or a chair for balance."],
    steps: [[
      "ضع القدمَ كاملةً على الدرجة.",
      "اصعد بدفع هذه القدم حتى تستقيم ركبتُها، والقدمُ الأخرى تلحق.",
      "انزل ببطءٍ بالقدم الأخرى أوّلاً.",
      "الركبةُ التي تعمل فوق القدم طوالَ الحركة.",
      "أكمل التكرارات ثمّ الساقَ الأخرى.",
    ], [
      "Place the whole foot on the step.",
      "Step up by pushing through that foot until its knee is straight, bringing the other foot up.",
      "Step down slowly with the other foot first.",
      "Keep the working knee over the foot throughout.",
      "Complete the set, then the other leg.",
    ]],
    cues: [[
      "الركبةُ تنحرف للداخل ⟵ فوق الإصبع الثاني.",
      "الدفعُ بالقدم التي على الأرض ⟵ القدمُ التي على الدرجة هي التي ترفعك.",
      "ميلُ الجذع أو هبوطُ الحوض من جهة ⟵ الجذعُ مستقيم والحوضُ مستوٍ.",
    ], [
      "The knee collapsing inwards → over the second toe.",
      "Pushing off with the foot on the floor → the foot on the step lifts you.",
      "Leaning the trunk or the pelvis dropping on one side → trunk upright and pelvis level.",
    ]],
    easier: ["درجةٌ أقلّ (١٠ سم)، أو بإمساكٍ أقوى بالدرابزين.", "A lower step (10 cm), or a firmer hold on the rail."],
    harder: ["درجةٌ أعلى (٢٠–٢٥ سم)، أو ثقلٌ في اليدين، أو بلا إمساك.", "A higher step (20–25 cm), weights in the hands, or no hand support."],
    stopIf: ["ألمٌ في الركبة يزيد على ٥ من ١٠، أو فقدانُ التوازن، أو إحساسٌ بعدم ثبات.", "Knee pain above 5/10, loss of balance, or a feeling of giving way."],
    equipment: ["درجةٌ ثابتة أو سلّمٌ بدرابزين.", "A stable step or a staircase with a handrail."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "step-up-1", ar: "قدمٌ كاملة على الدرجة والصعودُ بدفعها والركبةُ فوق القدم", en: "Whole foot on the step, stepping up through it with the knee over the foot", search: "forward step up exercise" }],
  },
  {
    code: "calf-raise", nameAr: "رفع الكعبين واقفاً", nameEn: "Standing calf raise",
    kind: "strength", region: "ankle_foot", sets: 3, reps: 15, hold: 1, rest: 45,
    purpose: ["يقوّي عضلاتِ الساق الخلفية التي تدفع في المشي وتمتصّ الصدمة وتحفظ التوازن — ويفيد مَن يمشي ببطءٍ أو يخشى السقوط.",
      "Strengthens the calf muscles, which push off in walking, absorb shock and help balance — useful for slow walkers and those afraid of falling."],
    start: ["واقفٌ والقدمان بعرض الورك، ويداك على ظهر كرسيٍّ ثابت أو على الحائط.",
      "Standing with the feet hip-width apart and the hands on the back of a stable chair or on a wall."],
    steps: [[
      "ارتفع على أطراف القدمين ببطءٍ ما استطعت.",
      "اثبت ثانية في الأعلى.",
      "انزل ببطءٍ في ٣ ثوانٍ حتى يلامس الكعبان الأرض.",
      "الركبتان مستقيمتان بلا قفل.",
      "كرّر.",
    ], [
      "Rise slowly onto the balls of the feet as high as you can.",
      "Hold for one second at the top.",
      "Lower slowly over 3 seconds until the heels touch the floor.",
      "Keep the knees straight but not locked.",
      "Repeat.",
    ]],
    cues: [[
      "الوزنُ على الأصابع الخارجية ⟵ على الإصبع الكبير والثاني.",
      "النزولُ السريع ⟵ نزولٌ بطيء.",
      "الاتّكاءُ على الكرسيّ ⟵ اليدان للتوازن لا لحمل الوزن.",
    ], [
      "Weight rolling onto the outer toes → over the big and second toes.",
      "Dropping down quickly → a slow lowering.",
      "Leaning on the chair → hands for balance, not to take weight.",
    ]],
    easier: ["جالساً والثقلُ على الركبتين، أو مدىً أصغر.", "Seated with a weight on the knees, or a smaller range."],
    harder: ["على ساقٍ واحدة، أو على حافّة درجة.", "On one leg, or off the edge of a step."],
    stopIf: ["ألمٌ في وتر العرقوب أو الكاحل، أو تشنّجٌ في الساق.", "Achilles or ankle pain, or calf cramp."],
    equipment: ["كرسيٌّ ثابت أو حائط.", "A stable chair or a wall."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "calf-raise-1", ar: "واقفٌ ممسكاً بظهر كرسيّ ومرتفعٌ على أطراف القدمين", en: "Standing holding the back of a chair, risen onto the balls of the feet", search: "standing calf raise chair support" }],
  },
  {
    code: "single-leg-balance", nameAr: "الوقوف على ساقٍ واحدة", nameEn: "Single-leg balance",
    kind: "balance", region: "knee", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يدرّب التوازنَ والإحساسَ بوضع الركبة وتحكّمَ العضلات حولها — ويقلّل السقوطَ وإحساسَ «الركبة تخون» (ACR 2019 توصيةٌ مشروطة بتمارين التوازن).",
      "Trains balance, knee position sense and control of the surrounding muscles — reducing falls and the feeling of the knee giving way (ACR 2019 conditionally recommends balance exercise)."],
    start: ["واقفٌ قرب طاولةٍ أو ظهرِ كرسيٍّ ثابت يمكن الإمساكُ به، والنظرُ إلى نقطةٍ أمامك.",
      "Standing next to a table or the back of a stable chair you can hold, looking at a point ahead."],
    steps: [[
      "ارفع قدماً عن الأرض قليلاً والركبةُ الأخرى مثنيّةٌ قليلاً بلا قفل.",
      "الركبةُ التي تحملك فوق القدم والحوضُ مستوٍ.",
      "اثبت حتى ٣٠ ثانية، والأصابعُ تلامس الكرسيَّ عند الحاجة.",
      "أنزل القدمَ واسترح.",
      "كرّر ٣ مرّات ثمّ الساقَ الأخرى.",
    ], [
      "Lift one foot slightly off the floor with the standing knee softly bent, not locked.",
      "Keep the standing knee over the foot and the pelvis level.",
      "Hold for up to 30 seconds, touching the chair with the fingertips when needed.",
      "Lower the foot and rest.",
      "Repeat 3 times, then the other leg.",
    ]],
    cues: [[
      "هبوطُ الحوض من جهة الساق المرفوعة ⟵ الحوضُ مستوٍ.",
      "الركبةُ تنحرف للداخل ⟵ فوق الإصبع الثاني.",
      "التشبّثُ القويّ بالكرسيّ ⟵ لمسٌ بأطراف الأصابع، ثمّ بلا لمس.",
    ], [
      "The pelvis dropping on the lifted side → keep it level.",
      "The knee collapsing inwards → over the second toe.",
      "Gripping the chair hard → fingertip touch, then no touch.",
    ]],
    easier: ["الإمساكُ باليدين، أو ثباتٌ أقصر (١٠ ثوانٍ).", "Holding with both hands, or shorter holds (10 seconds)."],
    harder: ["بلا إمساك، ثمّ بإدارة الرأس أو على وسادة، ثمّ والعينان مغمضتان بجانب الكرسيّ.", "No hand support, then turning the head or standing on a cushion, then eyes closed beside the chair."],
    stopIf: ["دوخةٌ أو فقدانُ توازنٍ لا يُستعاد بلمس الكرسيّ — ولا يُؤدّى وحيداً لمن سقط في الأشهر الأخيرة.", "Dizziness or loss of balance not recovered by touching the chair — and not alone for anyone who has fallen in recent months."],
    equipment: ["طاولةٌ أو كرسيٌّ ثابت للإمساك، ووسادةٌ للتصعيب.", "A table or stable chair to hold; a cushion for progression."],
    doseNote: ["يومياً — مثلاً عند غسل الأطباق ممسكاً بالمغسلة.", "Daily — for example while washing dishes, holding the sink."],
    images: [{ key: "single-leg-balance-1", ar: "واقفٌ على ساقٍ واحدة بجانب كرسيّ وأطرافُ الأصابع تلامسه", en: "Standing on one leg beside a chair, fingertips touching it", search: "single leg stance balance exercise chair" }],
  },
  {
    code: "stationary-cycling", nameAr: "الدرّاجة الثابتة", nameEn: "Stationary cycling",
    kind: "aerobic", region: "knee", homeSuitable: false,
    purpose: ["نشاطٌ هوائيٌّ بلا صدمةٍ على المفصل: يحرّك الركبةَ في مدىً متكرّر، ويقوّي الفخذ، ويخفّف الألم، ويساعد في إنقاص الوزن — وإحماءٌ مثاليّ قبل التمارين.",
      "Low-impact aerobic exercise: moves the knee repeatedly through range, strengthens the thigh, eases pain and helps weight loss — and an ideal warm-up before exercise."],
    start: ["المقعدُ بارتفاعٍ تكون فيه الركبةُ مثنيّةً قليلاً (٢٠–٣٠°) حين تكون الدوّاسةُ في أسفلها، والظهرُ مستقيم.",
      "Seat height set so the knee is slightly bent (20–30°) with the pedal at the bottom, back upright."],
    steps: [[
      "ابدأ بلا مقاومة بإيقاعٍ مريح.",
      "دوّر الدوّاساتِ بسرعةٍ ثابتة تتكلّم فيها ولا تغنّي.",
      "زِد المقاومةَ درجةً حين تصير المدّةُ سهلة.",
      "اختم بدقيقتين بلا مقاومة.",
      "انزل من الدرّاجة ببطءٍ ممسكاً بها.",
    ], [
      "Start with no resistance at a comfortable cadence.",
      "Pedal at a steady pace where you can talk but not sing.",
      "Add one level of resistance once the duration is easy.",
      "Finish with two minutes without resistance.",
      "Get off slowly while holding the bike.",
    ]],
    cues: [[
      "مقعدٌ منخفضٌ جداً فتنثني الركبةُ كثيراً ⟵ ارفعه، فالمقعدُ المنخفض يزيد ألمَ مقدّمة الركبة.",
      "مقاومةٌ عالية من البداية ⟵ المدّةُ أوّلاً ثمّ المقاومة.",
      "الركبتان تنفتحان للخارج ⟵ فوق الدوّاسات.",
    ], [
      "A seat so low that the knee bends a lot → raise it; a low seat increases front-of-knee pain.",
      "High resistance from the start → build duration first, then resistance.",
      "Knees splaying outwards → keep them over the pedals.",
    ]],
    easier: ["دوراتٌ جزئية ذهاباً وإياباً لمن لا يكمل الدورة، أو ٥ دقائق مرّتين.", "Rocking back and forth through part-turns for those who cannot complete a full turn, or 5 minutes twice."],
    harder: ["٢٠–٣٠ دقيقة بمقاومةٍ متوسّطة، أو فتراتٌ قصيرة أسرع (دقيقةٌ أسرع ودقيقتان مريحتان).", "20–30 minutes at moderate resistance, or short faster intervals (one minute faster, two minutes easy)."],
    stopIf: ["ألمٌ في الصدر أو ضيقُ نفسٍ غيرُ معتاد أو دوخة — أوقف فوراً؛ أو ألمٌ في الركبة يزيد على ٥ من ١٠.", "Chest pain, unusual breathlessness or dizziness — stop at once; or knee pain above 5/10."],
    equipment: ["درّاجةٌ ثابتة في المركز (وفي البيت إن وُجدت).", "A stationary bike in the clinic (and at home if available)."],
    doseNote: ["١٠ دقائق إحماءً في كلّ جلسة، ويزيد حتى ٢٠–٣٠ دقيقة.", "10 minutes as a warm-up every session, building to 20–30 minutes."],
    images: [{ key: "stationary-cycling-1", ar: "على درّاجةٍ ثابتة والركبةُ مثنيّةٌ قليلاً والدوّاسةُ في أسفلها", en: "On a stationary bike with the knee slightly bent and the pedal at the bottom", search: "stationary bike exercise older adult" }],
  },
  {
    code: "hamstring-stretch-seated", nameAr: "تمطيط عضلات خلف الفخذ جالساً", nameEn: "Seated hamstring stretch",
    kind: "stretch", region: "knee", perSide: true, sets: 3, hold: 30, rest: 15,
    purpose: ["يحافظ على مرونة عضلات خلف الفخذ التي تشدّ الركبةَ إلى الانثناء فتعيق بسطَها الكامل في المشي.",
      "Keeps the hamstrings flexible, as tight hamstrings pull the knee into flexion and block full extension when walking."],
    start: ["جالسٌ على حافّة كرسيٍّ ثابت، والساقُ التي تتمطّط ممدودةٌ أمامك والكعبُ على الأرض، والأخرى مثنيّة والقدمُ على الأرض.",
      "Sitting on the edge of a stable chair with the leg to be stretched straight out in front and the heel on the floor, the other knee bent with the foot flat."],
    steps: [[
      "اجلس منتصباً واسحب أصابعَ القدم الممدودة نحوك.",
      "مِل بجذعك للأمام من الورك والظهرُ مستقيم حتى تشعر بشدٍّ خلف الفخذ.",
      "اثبت ٣٠ ثانية وتنفّس بهدوء.",
      "عُد منتصباً واسترح.",
      "كرّر ٣ مرّات ثمّ الساقَ الأخرى.",
    ], [
      "Sit tall and pull the toes of the straight leg towards you.",
      "Lean forwards from the hips with a straight back until you feel a stretch behind the thigh.",
      "Hold for 30 seconds, breathing calmly.",
      "Sit back up and rest.",
      "Repeat 3 times, then the other leg.",
    ]],
    cues: [[
      "تقويسُ الظهر للوصول إلى القدم ⟵ الانحناءُ من الورك والظهرُ مستقيم.",
      "انثناءُ الركبة الممدودة ⟵ تبقى مستقيمةً بلا قفلٍ قويّ.",
      "الارتدادُ في آخر المدى ⟵ ثباتٌ هادئ.",
    ], [
      "Rounding the back to reach the foot → hinge at the hips with a straight back.",
      "The straight knee bending → keep it straight without forcing it.",
      "Bouncing at the end of range → a calm, still hold.",
    ]],
    easier: ["ميلٌ أقلّ، أو الكعبُ أقربُ إلى الكرسيّ.", "Less lean, or the heel closer to the chair."],
    harder: ["القدمُ على كرسيٍّ منخفضٍ أمامك.", "The heel on a low stool in front of you."],
    stopIf: ["تنميلٌ أو ألمٌ ينزل في الساق (شدُّ العصب)، أو ألمٌ في أسفل الظهر.", "Tingling or pain shooting down the leg (nerve tension), or low back pain."],
    equipment: ["كرسيٌّ ثابت.", "A stable chair."],
    doseNote: ["يومياً بعد التمارين.", "Daily after exercising."],
    images: [{ key: "hamstring-stretch-seated-1", ar: "جالسٌ على حافّة الكرسيّ والساقُ ممدودة والجذعُ يميل من الورك", en: "Seated on the edge of a chair with one leg straight, leaning forwards from the hips", search: "seated hamstring stretch chair" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "lateral-step-down", nameAr: "النزول الجانبيّ من الدرجة", nameEn: "Lateral step-down",
    kind: "motor_control", region: "knee", perSide: true, sets: 3, reps: 8, rest: 60,
    purpose: ["يدرّب التحكّمَ بالركبة في النزول — أصعبُ ما في الدرج لمرضى الخشونة — بمحاذاة الورك والركبة والقدم تحت الحمل (التحكّمُ العصبيّ العضليّ في برنامج GLA:D).",
      "Trains knee control on the way down — the hardest part of stairs for people with knee osteoarthritis — with hip, knee and foot alignment under load (neuromuscular control as in GLA:D)."],
    start: ["واقفٌ بجانبك على درجةٍ ثابتة (١٠–١٥ سم) على الساق التي تتمرّن، والأخرى معلّقةٌ بجانب الدرجة، وممسكٌ بالدرابزين أو الحائط.",
      "Standing sideways on a stable step (10–15 cm) on the exercising leg with the other foot hanging beside it, holding the rail or a wall."],
    steps: [[
      "اثنِ ركبةَ الساق التي على الدرجة ببطءٍ لتنزل الأخرى نحو الأرض.",
      "المسِ الأرضَ بكعب القدم المعلّقة لمساً خفيفاً دون أن تحمل عليها.",
      "الركبةُ التي تعمل فوق الإصبع الثاني طوالَ الحركة.",
      "اصعد بدفع القدم التي على الدرجة حتى تستقيم الركبة.",
      "أكمل التكرارات ثمّ الساقَ الأخرى.",
    ], [
      "Bend the knee of the leg on the step slowly so the other foot lowers towards the floor.",
      "Tap the floor lightly with the heel of the hanging foot without putting weight through it.",
      "Keep the working knee over the second toe throughout.",
      "Push through the foot on the step to straighten the knee and rise.",
      "Complete the set, then the other leg.",
    ]],
    cues: [[
      "الركبةُ تنحرف للداخل ⟵ فوق الإصبع الثاني، ومرآةٌ أمامك تساعد.",
      "هبوطُ الحوض من جهة القدم المعلّقة ⟵ الحوضُ مستوٍ.",
      "النزولُ السريع أو الوقوعُ على القدم ⟵ ببطءٍ في ٣ ثوانٍ ولمسٌ خفيف.",
    ], [
      "The knee collapsing inwards → over the second toe; a mirror in front helps.",
      "The pelvis dropping on the hanging side → keep it level.",
      "Dropping quickly or landing on the foot → slowly over 3 seconds with a light tap.",
    ]],
    easier: ["درجةٌ أقلّ (٥–١٠ سم)، أو مدىً أصغر، أو بإمساكٍ أقوى.", "A lower step (5–10 cm), a smaller range, or a firmer hold."],
    harder: ["درجةٌ أعلى (٢٠ سم)، أو بلا إمساك، أو ثقلٌ في اليد المقابلة.", "A higher step (20 cm), no hand support, or a weight in the opposite hand."],
    stopIf: ["ألمٌ في مقدّمة الركبة يزيد على ٥ من ١٠، أو إحساسٌ بعدم ثبات، أو فقدانُ التوازن.", "Front-of-knee pain above 5/10, a feeling of giving way, or loss of balance."],
    equipment: ["درجةٌ ثابتة ودرابزين أو حائط، ومرآة إن وُجدت.", "A stable step and a rail or wall, and a mirror if available."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "lateral-step-down-1", ar: "واقفٌ جانباً على درجة، والركبةُ تنثني فوق القدم والقدمُ الأخرى تلمس الأرض", en: "Standing sideways on a step, the knee bending over the foot as the other foot taps the floor", search: "lateral step down exercise knee" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "knee-oa-geriatric",
  summary: [
    "خشونةُ الركبة (Knee osteoarthritis) — في المفصل الفخذيّ الظنبوبيّ أو الرضفيّ الفخذيّ أو كليهما — عند البالغين وكبار السنّ: ألمٌ مع النشاط، وتيبّسٌ قصيرٌ صباحاً وبعد الجلوس، ونقصٌ في الحركة والقوّة والمشي والدرج. " +
    "والخشونةُ ليست «تآكلاً» يتقدّم حتماً: المفصلُ نسيجٌ حيّ يتكيّف مع الحمل، وشدّةُ الأشعة لا تطابق الألمَ ولا الوظيفة، وأغلبُ المرضى يتحسّنون بالعلاج غير الجراحيّ. " +
    "الأساسُ في كلّ الإرشادات التمرينُ (تقويةُ الفخذ والورك، والتوازنُ والتحكّم، والنشاطُ الهوائيّ) وإنقاصُ الوزن لمن زاد وزنُه والتعليم — ومعه العلاجُ اليدويّ والعصا والدعامةُ عند الحاجة، والأجهزةُ مساعدةٌ لا أساس. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة؛ وما بعد استبدال الركبة، وإصاباتُ الغضروف الهلاليّ والرباط عند الشباب، لكلٍّ بروتوكولُه.",
    "Knee osteoarthritis — tibiofemoral, patellofemoral or both — in adults and older people: activity-related pain, brief morning and post-rest stiffness, and loss of movement, strength, walking and stair ability. " +
    "Osteoarthritis is not inevitable 'wear and tear': the joint is living tissue that adapts to load, imaging severity does not match pain or function, and most patients improve with non-surgical care. " +
    "Every guideline puts exercise (thigh and hip strengthening, balance and control, aerobic activity), weight loss for those who are overweight, and education at the core — supported by manual therapy, a cane and a brace when needed, with devices as adjuncts, not the core. " +
    "The programme runs in three phases with session ranges and written progression criteria; rehabilitation after knee replacement, and meniscal and ligament injuries in younger people, each have their own protocol.",
  ],
  goals: [
    "١. تحسّنُ نتائج الركبة (KOOS) — الألمُ والوظيفةُ اليومية — ١٠ نقاطٍ على الأقلّ من ١٠٠.\n" +
    "٢. خفضُ الألم (NPRS) نقطتين على الأقلّ أو ٣٠٪ من قيمته الأولى.\n" +
    "٣. الجلوسُ والوقوف ٣٠ ثانية: زيادةُ تكرارين على الأقلّ؛ والوقوفُ والمشي (TUG) أقلّ من ١٢ ثانية (عتبةُ خطر السقوط عند كبار السنّ) أو تحسّنٌ واضح.\n" +
    "٤. ثنيُ الركبة ١١٠° على الأقلّ (للدرج والكرسيّ المنخفض)، ونقصُ البسط ٥° أو أقلّ.\n" +
    "٥. المشيُ ٣٠ دقيقةً متّصلة، وصعودُ الدرج ونزولُه بالتناوب ممسكاً بالدرابزين، والعودةُ إلى الأنشطة الثلاثة التي اختارها المريض — ونشاطٌ هوائيّ ١٥٠ دقيقة في الأسبوع.\n" +
    "٦. استقلالُ المريض ببرنامجٍ منزليّ، وخطّةٌ لإنقاص الوزن إن زاد (٥٪ على الأقلّ، و١٠٪ أفضل)، وأداةُ مشيٍ أو دعامةٌ عند الحاجة، وخطّةٌ مكتوبة للنوبة قبل التخرّج.",
    "1. Improve knee outcomes (KOOS) — pain and function in daily living — by at least 10 of 100 points.\n" +
    "2. Reduce pain (NPRS) by at least 2 points or 30% of baseline.\n" +
    "3. 30-second chair stand: at least 2 more repetitions; Timed Up and Go (TUG) under 12 seconds (the fall-risk threshold in older adults) or clearly improved.\n" +
    "4. Knee flexion of at least 110° (for stairs and low chairs) and an extension deficit of 5° or less.\n" +
    "5. Walk 30 minutes continuously, climb and descend stairs step over step holding the rail, and return to the three activities chosen at baseline — with 150 minutes of aerobic activity a week.\n" +
    "6. An independent home programme, a weight-loss plan if overweight (at least 5%, 10% is better), a walking aid or brace when needed, and a written flare-up plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين أو علاجٍ يدويّ):\n" +
    "• فرزُ علامات الخطر — انظر «موانع الاستعمال».\n" +
    "• التشخيص (NICE 2022): سريريٌّ بلا أشعةٍ روتينية لمن عمرُه ٤٥ فأكثر وألمُه مع النشاط، وتيبّسُه الصباحيّ لا يتجاوز ٣٠ دقيقة أو لا تيبّس؛ والأشعةُ للصورة غير المعتادة وحدها (قرارُ الطبيب). ويُفحص الوركُ وأسفلُ الظهر دائماً: ألمُ الركبة قد يأتي من خشونة الورك (ألمٌ في الأربية ونقصٌ في دوران الورك للداخل) أو من الظهر (تنميلٌ ينزل في الساق).\n" +
    "• نوعُ الخشونة: الفخذيّ الظنبوبيّ الداخليّ أو الخارجيّ (ألمٌ في خطّ المفصل، وتقوّسُ الساقين للخارج Varus أو للداخل Valgus) · الرضفيّ الفخذيّ (ألمٌ حول الرضفة مع الدرج والقرفصاء والجلوس الطويل) · والتورّم، والإحساسُ بأنّ الركبةَ تخون، والتهيّج (ألمٌ ليليّ وتورّمٌ يزيد بعد النشاط).\n" +
    "• المريضُ كلُّه: الوزنُ ومؤشّرُ كتلة الجسم ومحيطُ الخصر، والقلبُ وضغطُ الدم والسكّريّ، والسقوطُ في السنة الأخيرة، والمعتقداتُ («العظمُ على العظم»، «التمرينُ يزيد التآكل») والخوفُ من الحركة والمزاجُ والنوم، والألمُ المنتشر في أماكن كثيرة، والأدوية والحُقن السابقة.\n" +
    "• المقاييس: الألمُ الآن وأسوأُه في الأسبوع (NPRS)، ونتائجُ الركبة (KOOS، أو KOOS-12 المختصر)، وثلاثةُ أنشطةٍ يختارها المريض (PSFS، كلٌّ ٠–١٠).\n" +
    "• اختباراتُ الأداء (OARSI — Dobson 2013): الجلوسُ والوقوف ٣٠ ثانية، والمشيُ السريع ٤٠ متراً (٤ × ١٠ أمتار) بالثواني، والدرجُ (صعودُ ونزولُ ٩–١٢ درجة) بالثواني، والوقوفُ والمشي (TUG).\n" +
    "• الفحص: ثنيُ الركبة ونقصُ بسطها بالمنقلة (Goniometer)، والتورّمُ باختبار المسح (Stroke test)، وقوّةُ الفخذ الأماميّ والألوية الوسطى (يدوياً أو بالجهاز)، ورفعُ الساق مستقيمةً بلا تأخّر بسط، ومحاذاةُ الساق في الوقوف، والمشيُ، والوقوفُ على ساقٍ واحدة بالثواني، وحركةُ الرضفة، وحركةُ الورك.\n" +
    "إعادةُ التقييم: سؤالٌ وفحصٌ قصير في كلّ جلسة (الألمُ والتورّمُ منذ الجلسة الماضية)، والمقاييسُ كاملةً عند الجلسة الثامنة تقريباً وعند الجلسة الأخيرة وفي زيارة المتابعة بعد التخرّج بأربعة أسابيع. ومَن لم يتحسّن بعد ٨–١٠ جلسات: مراجعةُ التشخيص (الورك، الظهر، الالتهابُ المفصليّ) والجرعة والالتزام، وإحالةٌ إلى الطبيب للعلاج الدوائيّ أو الحقن — ومَن بقي ألمُه شديداً ويحدّ حياتَه رغم العلاج الأساسيّ يُحال لتقييم الجراحة (NICE 2022). وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.",
    "Initial assessment (before any exercise or manual therapy):\n" +
    "• Red-flag screen — see Contraindications.\n" +
    "• Diagnosis (NICE 2022): clinical, without routine imaging, in people aged 45 or over with activity-related pain and no morning stiffness or stiffness lasting 30 minutes or less; imaging only for atypical presentations (the doctor's decision). Always examine the hip and low back: knee pain may come from hip osteoarthritis (groin pain and reduced hip internal rotation) or from the back (tingling down the leg).\n" +
    "• Type of osteoarthritis: medial or lateral tibiofemoral (joint-line pain, varus or valgus alignment) · patellofemoral (pain around the kneecap with stairs, squatting and prolonged sitting) · plus effusion, giving way, and irritability (night pain and swelling that increases after activity).\n" +
    "• The whole person: weight, body-mass index and waist, heart, blood pressure and diabetes, falls in the past year, beliefs ('bone on bone', 'exercise wears the joint out'), fear of movement, mood and sleep, widespread pain, medications and previous injections.\n" +
    "• Measures: current and worst pain in the past week (NPRS), the Knee injury and Osteoarthritis Outcome Score (KOOS, or the shorter KOOS-12), and three patient-chosen activities (PSFS, each 0–10).\n" +
    "• Performance tests (OARSI — Dobson 2013): 30-second chair stand, 40 m fast-paced walk (4 × 10 m) in seconds, stair climb (up and down 9–12 steps) in seconds, and the Timed Up and Go (TUG).\n" +
    "• Examination: knee flexion and extension deficit by goniometer, effusion by the stroke test, quadriceps and gluteus medius strength (manual or dynamometer), straight-leg raise without extensor lag, standing alignment, gait, single-leg stance in seconds, patellar mobility and hip movement.\n" +
    "Reassessment: brief questions and re-testing every session (pain and swelling since last time), and the full measures at about session 8, at the last session and at the follow-up visit four weeks after discharge. If there is no improvement after 8–10 sessions: review the diagnosis (hip, back, inflammatory arthritis), the dose and adherence, and refer to the doctor for medication or injection — and refer for a surgical opinion when pain stays severe and limits life despite core treatment (NICE 2022). Phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — التهدئة والتعليم وتنشيط الفخذ (الجلسات ١–٦): شدُّ الفخذ والساقُ ممدودة، وسحبُ الكعب، ومدُّ الركبة بإسناد الكعب لمن عنده نقصُ بسط، ورفعُ الساق مستقيمة، ومدُّ الركبة جالساً بلا ثقل، والجسرُ، والجلوسُ والقيام من مقعدٍ عالٍ، والدرّاجةُ الثابتة بلا مقاومة، والمشيُ اليوميّ.\n" +
    "المرحلة ٢ — التقوية والتحكّم العصبيّ العضليّ (الجلسات ٧–١٦): الدرّاجةُ إحماءً، ومدُّ الركبة بثقل الكاحل، والجلوسُ والقيام بلا يدين، ورفعُ الساق جانباً، والقرفصاءُ الجزئية على الحائط، وصعودُ الدرجة، ورفعُ الكعبين، والوقوفُ على ساقٍ واحدة، وتمطيطُ خلف الفخذ، والمشيُ ٢٠–٣٠ دقيقة.\n" +
    "المرحلة ٣ — الوظيفة والتحمّل والوقاية (الجلسات ١٧–٢٤): الدرّاجةُ بمقاومة، والجلوسُ والقيام بثقلٍ أو من مقعدٍ أخفض، وصعودُ درجةٍ أعلى، والنزولُ الجانبيّ من الدرجة، والطعنةُ الثابتة لمن يتحمّلها، ورفعُ الساق جانباً بمقاومة، والتوازنُ الأصعب، ونشاطٌ هوائيّ ١٥٠ دقيقة في الأسبوع.\n" +
    "البرنامجُ: ٢٤ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه: الخفيفُ يكفيه غالباً ١٢–١٨، والشديدُ أو كثيرُ الأمراض قد يحتاج أكثر. " +
    "وتمارينُ التقوية يوماً بعد يوم — ثلاثَ مرّاتٍ في الأسبوع تحت الإشراف (Juhl 2014)، فتعطي الأسابيعُ الأربعة اثنتي عشرةَ جلسةَ تقوية — والحركةُ والدرّاجةُ والتوازنُ والمشيُ يومياً. " +
    "والبرنامجُ المنزليّ يوميّ في كلّ المراحل، ويستمرّ بعد الجلسة الأخيرة حتى نهاية الأسبوع الثاني عشر (القوّةُ تحتاج ٨–١٢ أسبوعاً لتُبنى، والفائدةُ تذهب حين يتوقّف التمرين)، مع زيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع. " +
    "والجلسةُ في المركز للتعليم والتصحيح والتدرّج. " + PAIN_RULE_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Settle, educate and switch on the quadriceps (sessions 1–6): quadriceps setting, heel slides, heel prop for an extension deficit, straight-leg raises, seated knee extension without weight, the glute bridge, sit-to-stand from a high seat, unloaded stationary cycling, and daily walking.\n" +
    "Phase 2 — Strength and neuromuscular control (sessions 7–16): cycling as a warm-up, seated knee extension with an ankle weight, sit-to-stand without hands, side-lying hip abduction, wall squats, step-ups, calf raises, single-leg balance, a seated hamstring stretch, and walking 20–30 minutes.\n" +
    "Phase 3 — Function, endurance and prevention (sessions 17–24): cycling with resistance, weighted or lower sit-to-stand, higher step-ups, lateral step-downs, split squats for those who tolerate them, resisted hip abduction, harder balance, and 150 minutes of aerobic activity a week.\n" +
    "Programme: 24 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient: mild cases usually need 12–18, severe cases or those with many conditions may need more. " +
    "Strengthening on alternate days — three supervised sessions a week (Juhl 2014), so the four weeks give twelve strengthening sessions — with movement, cycling, balance and walking daily. " +
    "The home programme is daily in every phase and continues after the last session until the end of week 12 (strength takes 8–12 weeks to build, and the benefit fades when exercise stops), with a follow-up visit and reassessment four weeks after discharge. " +
    "Clinic sessions are for teaching, correction and progression. " + PAIN_RULE_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ تُوقف البرنامج ويُحال المريضُ إلى الطبيب:\n" +
    "• فوراً (طوارئ): ركبةٌ حارّةٌ حمراءُ متورّمة مع حمّى أو قشعريرة أو عجزٍ عن تحميلها — اشتباهُ التهابٍ صديديّ في المفصل (Septic arthritis)، وخاصّةً بعد حقنةٍ أو مع السكّريّ أو ضعف المناعة أو مفصلٍ صناعيّ.\n" +
    "• تورّمٌ وألمٌ ودفءٌ في بطن الساق، خاصّةً بعد جراحةٍ أو رقودٍ أو سفرٍ طويل — اشتباهُ خثرةٍ في الأوردة العميقة (DVT): إحالةٌ عاجلة ولا تمرين.\n" +
    "• بعد سقوطٍ أو رضّ، وواحدٌ ممّا يلي يكفي — العمرُ ٥٥ فأكثر، أو ألمٌ عند الضغط على الرضفة وحدها أو على رأس الشظية، أو عجزٌ عن ثني الركبة ٩٠°، أو عجزٌ عن المشي ٤ خطوات بعد الإصابة مباشرةً وعند الفحص — أشعةٌ قبل أيّ علاج (قاعدةُ أوتاوا للركبة Ottawa knee rule).\n" +
    "• نوبةٌ مفاجئة بركبةٍ حارّةٍ متورّمة جداً بلا رضّ — اشتباهُ النقرس أو النقرس الكاذب: الطبيبُ قبل التمرين.\n" +
    "• تيبّسٌ صباحيّ يزيد على ساعة، أو تورّمُ مفاصل كثيرة صغيرة (اليدين والقدمين)، أو تعبٌ عامّ — اشتباهُ التهاب مفاصل التهابيّ (الروماتيزم): طبيبُ المفاصل.\n" +
    "• ألمٌ ليليٌّ ثابت لا يتغيّر بالوضعية، أو نقصُ وزنٍ غيرُ مفسَّر، أو سرطانٌ سابق — اشتباهُ ورم.\n" +
    "• ألمٌ مفاجئٌ شديد في الركبة عند كبار السنّ بلا رضّ مع ألمٍ ليليّ — اشتباهُ تموّت العظم (Osteonecrosis): أشعةٌ قبل التحميل.\n" +
    "• ركبةٌ مقفلةٌ لا تنفكّ، أو تخون كثيراً بعد إصابة — إصاباتُ الغضروف الهلاليّ والرباط لها بروتوكولُها.\n" +
    "• ألمٌ في الصدر أو ضيقُ نفسٍ أو دوخةٌ مع الجهد — اشتباهٌ قلبيّ: يوقف التمرين ويراه الطبيب.",
    "Red flags that stop the programme and require medical referral:\n" +
    "• Immediately (emergency): a hot, red, swollen knee with fever or rigors or inability to bear weight — suspected septic arthritis, especially after an injection or with diabetes, immunosuppression or a joint replacement.\n" +
    "• Calf swelling, pain and warmth, especially after surgery, bed rest or long travel — suspected deep vein thrombosis (DVT): urgent referral and no exercise.\n" +
    "• After a fall or injury, any one of the following is enough — age 55 or over, isolated tenderness of the kneecap or tenderness of the fibular head, inability to bend the knee to 90°, or inability to take 4 steps both immediately after the injury and at examination — X-ray before any treatment (Ottawa knee rule).\n" +
    "• A sudden attack of a very swollen, hot knee without injury — suspected gout or pseudogout: the doctor before exercise.\n" +
    "• Morning stiffness over an hour, swelling of many small joints (hands and feet) or general fatigue — suspected inflammatory arthritis: rheumatology.\n" +
    "• Constant night pain unaffected by position, unexplained weight loss or past cancer — suspected malignancy.\n" +
    "• Sudden severe knee pain in an older person without injury, with night pain — suspected osteonecrosis: imaging before loading.\n" +
    "• A locked knee that will not free, or frequent giving way after an injury — meniscal and ligament injuries have their own protocol.\n" +
    "• Chest pain, breathlessness or dizziness on exertion — suspected cardiac cause: stop exercise and refer to the doctor.",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد الألمُ أو التورّمُ أكثر أو استمرّ تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• التورّم: الركبةُ المتورّمة تُثبّط الفخذ — فقلّل الحملَ والمدى حتى يهدأ، والكمادةُ الباردة ١٠–١٥ دقيقة بعد النشاط تريح؛ ولا حرارةَ على ركبةٍ حارّةٍ متورّمة.\n" +
    "• العلاجُ اليدويّ (تحريكُ مفصل الركبة والرضفة والأنسجةُ الرخوة) مع التمرين لا بدلَه (NICE 2022 · ACR 2019)، وقد أفاد مع التمارين أكثرَ من حقنة الكورتيزون بعد سنة (Deyle 2020).\n" +
    "• بعد حقنةٍ في الركبة: نشاطٌ خفيف يومين ثمّ العودةُ إلى البرنامج.\n" +
    "• الأدوات: العصا في اليد المقابلة للركبة المؤلمة (ACR 2019 توصيةٌ قوية لمن يحدّ الألمُ مشيَه)، والدعامةُ الفخذية الظنبوبية لخشونة الجهة الداخلية مع تقوّس الساق (ACR 2019 توصيةٌ قوية) — يقيسها قسمُ المساند في المركز؛ ولا حشواتٍ داخليةً للحذاء مائلةَ الحافّة (Wedged insoles) ولا «أحذيةً طبية» خاصّة (ACR 2019 ضدّها) — حذاءٌ مريحٌ بنعلٍ ليّن يكفي.\n" +
    "• ضغطُ الدم: لا حبسَ للنفس مع التقوية؛ والسكّريّ: وجبةٌ خفيفة قبل التمرين وفحصُ القدمين؛ وخطرُ السقوط: التوازنُ بجانب كرسيٍّ أو حائط دائماً.\n" +
    "• الوزن: كلُّ نقصٍ مفيد، و١٠٪ أفضلُ من ٥٪ (NICE 2022)، والحميةُ مع التمرين أقوى من أيٍّ منهما وحده (IDEA 2013) — بالتنسيق مع الطبيب أو أخصائيّ التغذية.\n" +
    "• لا لغةَ تخويف («ركبتك متآكلة»، «العظمُ على العظم»، «لا تصعد الدرج») — الركبةُ تتحمّل الحركةَ وتتحسّن بها.",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If pain or swelling is higher or lasts longer, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Swelling: a swollen knee inhibits the quadriceps — reduce load and range until it settles; a cold pack for 10–15 minutes after activity helps; no heat on a hot, swollen knee.\n" +
    "• Manual therapy (knee and patellar mobilisation and soft-tissue techniques) alongside exercise, never instead of it (NICE 2022 · ACR 2019); combined with exercise it did better than a corticosteroid injection at one year (Deyle 2020).\n" +
    "• After a knee injection: two days of light activity, then back to the programme.\n" +
    "• Aids: a cane in the hand opposite the painful knee (ACR 2019 strong recommendation when pain limits walking), and a tibiofemoral (unloader) brace for medial osteoarthritis with varus alignment (ACR 2019 strong recommendation) — measured by the centre's orthotics department; no lateral wedge insoles or special 'medical shoes' (ACR 2019 recommends against) — a comfortable shoe with a cushioned sole is enough.\n" +
    "• Blood pressure: no breath-holding during strengthening; diabetes: a light snack before exercise and foot checks; fall risk: balance work always beside a chair or wall.\n" +
    "• Weight: any loss helps and 10% is better than 5% (NICE 2022), and diet plus exercise beats either alone (IDEA 2013) — coordinated with the doctor or a dietitian.\n" +
    "• No frightening language ('your knee is worn out', 'bone on bone', 'avoid stairs') — the knee tolerates movement and improves with it.",
  ],
  totalSessions: 24, spw: 6, weeks: 4, minutes: 50,
  refs: [
    { title: "OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis", org: "Osteoarthritis and Cartilage — OARSI (Bannuru et al.)", year: 2019, url: "https://doi.org/10.1016/j.joca.2019.06.011" },
    { title: "2019 American College of Rheumatology/Arthritis Foundation Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee", org: "Arthritis & Rheumatology — ACR / Arthritis Foundation (Kolasinski et al.)", year: 2020, url: "https://doi.org/10.1002/art.41142" },
    { title: "Osteoarthritis in over 16s: diagnosis and management (NG226)", org: "NICE", year: 2022, url: "https://www.nice.org.uk/guidance/ng226" },
    { title: "2018 EULAR recommendations for physical activity in people with inflammatory arthritis and osteoarthritis", org: "Annals of the Rheumatic Diseases — EULAR (Rausch Osthoff et al.)", year: 2018 },
    { title: "Exercise for osteoarthritis of the knee", org: "Cochrane Database of Systematic Reviews (Fransen et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.CD004376.pub3" },
    { title: "Impact of exercise type and dose on pain and disability in knee osteoarthritis: a systematic review and meta-regression analysis of randomized controlled trials", org: "Arthritis & Rheumatology (Juhl et al.)", year: 2014 },
    { title: "Good Life with osteoArthritis in Denmark (GLA:D): evidence-based education and supervised neuromuscular exercise delivered by certified physiotherapists nationwide", org: "BMC Musculoskeletal Disorders (Skou, Roos)", year: 2017, url: "https://doi.org/10.1186/s12891-017-1439-y" },
    { title: "Effects of intensive diet and exercise on knee joint loads, inflammation, and clinical outcomes among overweight and obese adults with knee osteoarthritis: the IDEA randomized clinical trial", org: "JAMA (Messier et al.)", year: 2013 },
    { title: "OARSI recommended performance-based tests to assess physical function in people diagnosed with hip or knee osteoarthritis", org: "Osteoarthritis and Cartilage (Dobson et al.)", year: 2013 },
    { title: "Physical Therapy versus Glucocorticoid Injection for Osteoarthritis of the Knee", org: "New England Journal of Medicine (Deyle et al.)", year: 2020, url: "https://doi.org/10.1056/NEJMoa1905877" },
    { title: "Efficacy of low-level laser therapy on pain and disability in knee osteoarthritis: systematic review and meta-analysis of randomised placebo-controlled trials", org: "BMJ Open (Stausholm et al.)", year: 2019, url: "https://doi.org/10.1136/bmjopen-2019-031142" },
    { title: "Transcutaneous electrical nerve stimulation as an adjunct to education and exercise for knee osteoarthritis: a randomized controlled trial", org: "Arthritis Care & Research (Palmer et al.)", year: 2014 },
  ],
  //  التمارين أوّلاً، ثمّ المساعدُ بترتيب ألم الظهر المزمن الذي اعتمده سليم، ثمّ ما لا يُستخدم — ولا شدَّ للركبة. والمساعدُ يؤشّره الأخصائيُّ لمريضه (§4.dd).
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٣٠–٣٥ دقيقة في الجلسة مع العلاج اليدويّ والتعليم، والتقويةُ يوماً بعد يوم، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 30–35 minutes per session with manual therapy and education, strengthening on alternate days, plus the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ أقوى توصيةٍ في كلّ الإرشادات (OARSI 2019 · ACR 2019 · NICE 2022 · EULAR 2018 · Cochrane 2015)، ويفيد أكثرَ تحت الإشراف ثلاثَ مرّاتٍ في الأسبوع على الأقلّ (Juhl 2014).",
        "Core in every session — exercise is the strongest recommendation in every guideline (OARSI 2019 · ACR 2019 · NICE 2022 · EULAR 2018 · Cochrane 2015) and works best supervised at least three times a week (Juhl 2014)."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "20–40", durationMin: "10–15" },
      parameters: ["حول الركبة والمريضُ مستلقٍ والركبةُ مثنيّةٌ قليلاً على وسادة، واللوحُ المرتدّ تحت الفخذ: السعويّ (Capacitive) حول المفصل ثمّ المقاوِم (Resistive) على خطّ المفصل والفخذ الأماميّ بدفءٍ مريح، وقبل التمارين.",
        "Around the knee with the patient supine and the knee slightly bent on a pillow, the return plate under the thigh: capacitive mode around the joint, then resistive over the joint line and quadriceps at a comfortable warmth, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدود: تجاربُ صغيرة بتخفيفٍ قصيرِ المدى، ولا تذكره الإرشاداتُ بالاسم. ممنوعٌ مع منظّم ضربات القلب أو المعادن المزروعة في المنطقة (ومنها استبدالُ الركبة) أو الحمل أو الأورام أو ضعف الإحساس، وعلى ركبةٍ حارّةٍ متورّمة.",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited evidence: small trials of short-term relief, not named in the guidelines. Contraindicated with a pacemaker, metal implants in the area (including a knee replacement), pregnancy, tumours or impaired sensation, and on a hot, swollen knee."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الركبة في الاستلقاء أو الجلوس المريح، قبل التمارين.",
        "Pulsed electromagnetic field (PEMF) around the knee in comfortable lying or sitting, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدودٌ ومتضارب في خشونة الركبة، ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited, conflicting evidence in knee osteoarthritis, not addressed by guidelines. Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS): أربعةُ أقطابٍ حول الركبة — فوق خطّ المفصل الداخليّ والخارجيّ وتحته — بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض، قبل التمارين.",
        "Conventional TENS: four electrodes around the knee — above and below the medial and lateral joint lines — at a strong but comfortable tingling without contraction, before exercise."],
      note: ["مساعدٌ يستعمله المركز (سليم) — والإرشاداتُ ضدّه هنا بوضوح: ACR 2019 «توصيةٌ قوية ضدّ» التحفيز في خشونة الركبة، وNICE 2022 لا تقدّمه، ولم يُضف شيئاً إلى التعليم والتمارين في تجربةٍ مضبوطة (Palmer 2014). فإن أبقاه سليمٌ مساعداً فللتهدئة قبل التمرين وحدها ولا يُعطى وحده. ممنوعٌ مع منظّم ضربات القلب، وعلى جلدٍ متضرّر أو ضعيف الإحساس.",
        "An adjunct used by the centre (Saleem) — but the guidelines clearly advise against it here: ACR 2019 strongly recommends against TENS in knee osteoarthritis, NICE 2022 does not offer it, and it added nothing to education and exercise in a controlled trial (Palmer 2014). If Saleem keeps it as an adjunct, it is for settling pain before exercise only and never on its own. Contraindicated with a pacemaker and on damaged or insensate skin."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["حول الركبة قبل التمارين لتخفيف التيبّس، لا بدلها؛ وافحص الجلد قبلها وبعدها. وفي البيت منشفةٌ دافئة صباحاً، وكمادةٌ باردة ١٠–١٥ دقيقة بعد النشاط إن تورّمت الركبة.",
        "Around the knee before exercise to ease stiffness, never instead of it; check the skin before and after. At home, a warm towel in the morning, and a cold pack for 10–15 minutes after activity if the knee swells."],
      note: ["مساعدٌ بالتناوب — العلاجُ الحراريّ (الحرارةُ أو البرودة) توصيةٌ مشروطة في ACR 2019، قصيرُ المدى. ممنوعٌ على ركبةٍ حارّةٍ متورّمة، ومع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
        "Rotating adjunct — thermal therapy (heat or cold) is conditionally recommended by ACR 2019, short-term. Contraindicated on a hot, swollen knee, and with impaired sensation, poor circulation or open wounds."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها.", "Alternative to the hot pack when unavailable, with the same precautions."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر؛ لا يُعطى وحده، ولا على ركبةٍ حارّةٍ متورّمة.", "Rotating adjunct — comfortable warmth only; never given alone, and not on a hot, swollen knee."] },
    { code: "needle", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم لهذه الحالة حتى يقرّر سليم: NICE 2022 «لا تُقدِّم الوخزَ ولا الإبرَ الجافة لعلاج الخشونة»، وACR 2019 توصيةٌ مشروطة بالوخز (Acupuncture) لا بالإبر الجافة. فإن قرّر سليم استعمالَها للنقاط الزنادية في الفخذ وخلفه صارت مساعداً للمرخَّص وحده ومع التمارين.",
        "Not used for this condition until Saleem decides: NICE 2022 says do not offer acupuncture or dry needling for osteoarthritis, and ACR 2019 conditionally recommends acupuncture, not dry needling. If Saleem chooses to use it for trigger points in the thigh muscles, it becomes an adjunct for certified staff only, alongside exercise."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة حتى يقرّر سليم (لم يذكره). والدليلُ متضارب: NICE 2022 لا تقدّمه، ومراجعةٌ لتجارب مضبوطة بالوهميّ (Stausholm 2019) وجدت تخفيفاً للألم والإعاقة بالجرعات الموصى بها. فإن قرّر سليم استعمالَه صار مساعداً بإعداداته.",
        "Not used by the centre for this condition until Saleem decides (not mentioned by him). The evidence conflicts: NICE 2022 does not offer it, while a review of placebo-controlled trials (Stausholm 2019) found reduced pain and disability at the recommended doses. If Saleem chooses to use it, it becomes an adjunct with its settings."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — وNICE 2022 لا تقدّم الأمواجَ فوق الصوتية العلاجية للخشونة لنقص الدليل على فائدتها.",
        "Not used by the centre for this condition (not mentioned by Saleem) — NICE 2022 does not offer therapeutic ultrasound for osteoarthritis owing to insufficient evidence of benefit."] },
  ],
  phases: [
    {
      name: ["التهدئة والتعليم وتنشيط الفخذ", "Settle, educate and switch on the quadriceps"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["نحو الأسبوع الأوّل", "About the first week"],
      goals: [
        "يفهم المريضُ أنّ الخشونةَ تتحسّن بالحركة وأنّ التمرينَ آمن؛ ألمٌ وتورّمٌ أقلّ؛ بسطٌ كامل أو شبهُ كامل وثنيٌ أوسع؛ عضلةُ الفخذ تنقبض جيّداً ورفعُ الساق بلا تأخّر بسط؛ عصا أو أداةُ مشيٍ إن احتاج؛ وبرنامجٌ منزليٌّ يوميّ يؤدّيه صحيحاً.",
        "The patient understands that osteoarthritis improves with movement and that exercise is safe; less pain and swelling; full or near-full extension and more flexion; a good quadriceps contraction and a straight-leg raise without extensor lag; a cane or walking aid if needed; and a daily home programme performed correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• الخشونةُ شائعةٌ جداً مع العمر، والمفصلُ نسيجٌ حيّ يتكيّف مع الحمل — ليست «تآكلاً» يتقدّم حتماً.\n" +
        "• شدّةُ الأشعة لا تطابق الألم: كثيرون بأشعةٍ «سيّئة» يمشون بلا ألم، والعكس.\n" +
        "• التمرينُ هو العلاجُ الأساسيّ وأقوى ما في الدليل، وهو آمن ولا يزيد الخشونة — والحركةُ تغذّي الغضروف، والراحةُ الطويلة تُضعف الفخذ وتزيد الألم.\n" +
        "• الوزن: كلُّ كيلوغرامٍ أقلّ يخفّف الحملَ على الركبة في كلّ خطوة.\n" +
        "• الدرج: اصعد بالركبة السليمة أوّلاً وانزل بالمؤلمة أوّلاً، وأمسك بالدرابزين.\n" +
        "• نظّم يومك: نشاطٌ موزّع مع استراحاتٍ قصيرة أفضلُ من يومٍ مرهقٍ ثمّ يومين راحة.\n" +
        "• الجلوسُ على الأرض والمرحاضُ العربيّ يُثقلان الركبة: كرسيٌّ بارتفاعٍ مناسب، ومقعدُ مرحاضٍ مرتفع أو مرحاضٌ غربيّ، والصلاةُ على كرسيٍّ رخصةٌ عند الحاجة.",
        "Key messages — in plain language, repeated every session:\n" +
        "• Osteoarthritis is very common with age, and the joint is living tissue that adapts to load — it is not inevitable 'wear and tear'.\n" +
        "• X-ray severity does not match pain: many people with 'bad' X-rays walk without pain, and the reverse.\n" +
        "• Exercise is the core treatment with the strongest evidence; it is safe and does not worsen osteoarthritis — movement nourishes cartilage, while long rest weakens the thigh and increases pain.\n" +
        "• Weight: every kilogram less reduces the load on the knee with every step.\n" +
        "• Stairs: go up with the good knee first and down with the painful knee first, holding the rail.\n" +
        "• Pace your day: spread activity with short breaks rather than one exhausting day followed by two days of rest.\n" +
        "• Floor sitting and squat toilets load the knee: a chair of suitable height, a raised toilet seat or a Western toilet, and praying on a chair is permitted when needed.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الألمُ ٤ من ١٠ أو أقلّ مع الأنشطة اليومية، أو انخفض نقطتين على الأقلّ عن التقييم الأوّل.\n" +
        "• لا يزيد التورّمُ بعد الجلسات (اختبارُ المسح ثابتٌ أو أقلّ).\n" +
        "• يرفع الساقَ مستقيمةً ١٠ مرّات بلا تأخّر بسط.\n" +
        "• نقصُ البسط ١٠° أو أقلّ، والثنيُ ٩٠° على الأقلّ.\n" +
        "• يلتزم بالبرنامج المنزليّ ٥ أيّام في الأسبوع على الأقلّ.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثامنة: يعيد الأخصائيُّ التقييمَ (الورك، الظهر، التورّمُ المستمرّ، الالتهابُ المفصليّ)، ويُحال إلى الطبيب للتورّم أو الألم الذي لا يهدأ.",
        "Progress to phase 2 when all are met:\n" +
        "• Pain ≤ 4/10 with daily activities, or at least 2 points lower than at baseline.\n" +
        "• Swelling does not increase after sessions (stroke test stable or lower).\n" +
        "• 10 straight-leg raises without extensor lag.\n" +
        "• Extension deficit of 10° or less, and flexion of at least 90°.\n" +
        "• Does the home programme at least 5 days a week.\n" +
        "If not achieved by session 8: the specialist reassesses (hip, back, persistent effusion, inflammatory arthritis), and refers to the doctor for swelling or pain that does not settle.",
      ],
      notes: [
        "• العلاجُ اليدويّ ٥–١٠ دقائق قبل التمارين لا وحده (NICE 2022 · Deyle 2020): تحريكُ مفصل الركبة للثني والبسط (Mobilisation)، وتحريكُ الرضفة، والأنسجةُ الرخوة للفخذ وخلف الركبة — ثمّ يُعاد الفحصُ فوراً ويتبعه تمرينٌ في المدى الجديد.\n" +
        "• التورّمُ يُثبّط الفخذ (Arthrogenic muscle inhibition): خفّف الحملَ، ورفعُ الساق والكمادةُ الباردة بعد الجلسة، وقِس التورّمَ في كلّ جلسة.\n" +
        "• حدّد النوع: الرضفيُّ الفخذيّ ⟵ قلّل الثنيَ العميق تحت الحمل (مدُّ الركبة من ٩٠° إلى ٤٥°)؛ الداخليُّ مع تقوّس الساق ⟵ تقويةُ الورك ودعامةٌ يقيسها قسمُ المساند.\n" +
        "• علّم استعمالَ العصا في اليد المقابلة وبالطول الصحيح (المقبضُ عند مفصل الرسغ والذراعُ مرتخية)، ودرّب الدرجَ بقاعدته.\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب (المؤشَّرُ لهذا المريض)، وقبل التمارين لا بدلها.",
        "• Manual therapy for 5–10 minutes before exercise, never alone (NICE 2022 · Deyle 2020): knee joint mobilisation into flexion and extension, patellar mobilisation, and soft-tissue work to the thigh and back of the knee — then re-test immediately and follow with exercise in the new range.\n" +
        "• Effusion inhibits the quadriceps (arthrogenic muscle inhibition): reduce load, use leg elevation and a cold pack after the session, and measure swelling every session.\n" +
        "• Identify the type: patellofemoral → limit deep loaded flexion (knee extension from 90° to 45°); medial with varus → hip strengthening and a brace measured by the orthotics department.\n" +
        "• Teach cane use in the opposite hand at the right height (handle at the wrist crease with the arm relaxed), and practise stairs with the rule.\n" +
        "• One adjunct device per session in rotation (those ticked for this patient), before exercise and never instead of it.",
      ],
      exercises: [
        { code: "quad-set" },
        { code: "heel-slide" },
        { code: "heel-prop", note: ["لمن عنده نقصُ بسطٍ (من التقييم)، ويُوقف حين تستقيم الركبة.", "For those with an extension deficit (from the assessment); stop once the knee straightens fully."] },
        { code: "straight-leg-raise", sets: 2, doseNote: ["يومياً بلا ثقل — ٢ × ١٠، والركبةُ مستقيمة طوالَ الرفع.", "Daily without weight — 2 × 10, with the knee straight throughout the lift."] },
        { code: "seated-knee-extension", sets: 2, hold: 5, doseNote: ["يومياً بلا ثقل — ٢ × ١٠ بثباتٍ ٥ ثوانٍ.", "Daily without weight — 2 × 10 with 5-second holds."] },
        { code: "glute-bridge", sets: 2, reps: 10, doseNote: ["يومياً — ٢ × ١٠.", "Daily — 2 × 10."],
          note: ["الركبتان بعرض الورك ولا تنحرفان للداخل.", "Knees hip-width apart without collapsing inwards."] },
        { code: "sit-to-stand", sets: 2, reps: 8, doseNote: ["٢ × ٨ من مقعدٍ عالٍ، واليدان على المسندين عند الحاجة.", "2 × 8 from a high seat, hands on the armrests when needed."],
          note: ["أهمُّ تمرينٍ وظيفيّ للركبة — يُقاس به التحسّن (الجلوسُ والوقوف ٣٠ ثانية).", "The key functional knee exercise — and the measure of progress (30-second chair stand)."] },
        { code: "stationary-cycling", doseNote: ["١٠ دقائق بلا مقاومة في كلّ جلسة.", "10 minutes without resistance every session."] },
        { code: "graded-walking", doseNote: ["١٠–١٥ دقيقة يومياً على أرضٍ مستوية، وبالعصا إن احتاج.", "10–15 minutes daily on level ground, with a cane if needed."],
          note: ["مشيٌ أقصرُ مرّتين أفضلُ من مرّةٍ طويلةٍ مؤلمة.", "Two shorter walks are better than one long painful walk."] },
      ],
    },
    {
      name: ["التقوية والتحكّم العصبيّ العضليّ", "Strength and neuromuscular control"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["نحو الأسبوعين الثاني والثالث", "About weeks 2–3"],
      goals: [
        "قوّةٌ أكبر في الفخذ والورك، وتحكّمٌ بمحاذاة الورك والركبة والقدم في الوقوف والدرج، وتوازنٌ على ساقٍ واحدة، والقيامُ من الكرسيّ بلا يدين، ومشيٌ ٢٠–٣٠ دقيقة.",
        "Greater thigh and hip strength, control of hip–knee–foot alignment in standing and on stairs, single-leg balance, standing up from a chair without the hands, and walking 20–30 minutes.",
      ],
      education: [
        "• الألمُ الخفيف أثناء التمرين مقبول إن هدأ قبل اليوم التالي ولم يزد التورّم — والإحساسُ بالتعب في الفخذ علامةُ عملٍ صحيح.\n" +
        "• القوّةُ تحتاج أسابيعَ لتُبنى، والانتظامُ أهمّ من الشدّة؛ وتمارينُ التقوية يوماً بعد يوم.\n" +
        "• الركبةُ فوق القدم: انتبه لها في كلّ قيامٍ وجلوسٍ ودرج.\n" +
        "• تقدّمُ الوزن: راجع ما تغيّر في الطعام والحركة كلّ أسبوع.\n" +
        "• النوبةُ الخفيفة طبيعيةٌ ولها خطّة: خفّف ولا تتوقّف، وعُد إلى تمارين المرحلة ١ يومين.",
        "• Mild pain during exercise is acceptable if it settles by the next day and swelling does not increase — tired thigh muscles are a sign of correct work.\n" +
        "• Strength takes weeks to build, and consistency matters more than intensity; strengthening on alternate days.\n" +
        "• Knee over foot: watch it with every stand, sit and stair.\n" +
        "• Weight progress: review what has changed in food and activity every week.\n" +
        "• A mild flare is normal and has a plan: ease off, do not stop, and return to the phase 1 exercises for two days.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• يجلس ويقوم من كرسيٍّ عاديّ بلا يدين ٣ × ١٠ بالركبتين فوق القدمين.\n" +
        "• يصعد درجةً بارتفاع ١٥ سم ٢ × ١٠ لكلّ ساق بلا انحراف الركبة للداخل وبألمٍ ٣ من ١٠ أو أقلّ.\n" +
        "• يقف على كلّ ساقٍ ١٠ ثوانٍ على الأقلّ بلمسٍ خفيف أو بلا لمس.\n" +
        "• يمشي ٢٠–٣٠ دقيقة بألمٍ ٣ من ١٠ أو أقلّ، وزاد في الجلوس والوقوف ٣٠ ثانية تكراراً على الأقلّ عن التقييم الأوّل — وإن لم يتحسّن فمراجعةُ الأخصائيّ قبل الانتقال.",
        "Progress to phase 3 when:\n" +
        "• Sit-to-stand from a standard chair without the hands 3 × 10 with the knees over the feet.\n" +
        "• Step-ups onto a 15 cm step 2 × 10 each leg without the knee collapsing inwards and with pain ≤ 3/10.\n" +
        "• Stands on each leg for at least 10 seconds with light or no touch.\n" +
        "• Walks 20–30 minutes with pain ≤ 3/10 and has gained at least one repetition on the 30-second chair stand since baseline — if not, specialist review before progressing.",
      ],
      notes: [
        "• التدرّج: زِد شيئاً واحداً في كلّ مرّة — الثقلَ أو التكرارَ أو ارتفاعَ الدرجة أو عمقَ القرفصاء — حين يصير الحاليّ سهلاً (جهدٌ ٦ من ١٠ أو أقلّ).\n" +
        "• تمارينُ التقوية يوماً بعد يوم: اثنتا عشرةَ جلسةَ تقويةٍ مشرَفٍ عليها في البرنامج كلّه على الأقلّ (Juhl 2014) — والدرّاجةُ والتوازنُ والتمطيطُ يومياً.\n" +
        "• التحكّمُ العصبيّ العضليّ كما في GLA:D: محاذاةُ الورك والركبة والقدم في كلّ تمرينٍ واقف، ومرآةٌ أمام المريض، وجودةُ الحركة قبل الثقل.\n" +
        "• العلاجُ اليدويّ يقلّ مع زيادة العمل الفعّال، ويبقى قبل التمارين لمن يفيده.\n" +
        "• الدرّاجةُ إحماءٌ قبل كلّ جلسة.",
        "• Progression: change one thing at a time — load, repetitions, step height or squat depth — once the current dose is easy (effort ≤ 6/10).\n" +
        "• Strengthening on alternate days: at least twelve supervised strengthening sessions across the programme (Juhl 2014) — with cycling, balance and stretching daily.\n" +
        "• Neuromuscular control as in GLA:D: hip–knee–foot alignment in every standing exercise, a mirror in front of the patient, and quality of movement before load.\n" +
        "• Manual therapy decreases as active work increases, and stays before exercise for those who benefit.\n" +
        "• Cycling as the warm-up before every session.",
      ],
      exercises: [
        { code: "stationary-cycling", doseNote: WARMUP },
        { code: "seated-knee-extension", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["بثقلٍ على الكاحل يبدأ ٠٫٥–١ كغ.", "With an ankle weight starting at 0.5–1 kg."] },
        { code: "sit-to-stand", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["من كرسيٍّ عاديّ بلا يدين، والنزولُ في ٣ ثوانٍ.", "From a standard chair without the hands, lowering over 3 seconds."] },
        { code: "side-lying-hip-abduction", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "wall-squat", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "step-up", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["يبدأ بدرجةٍ ١٠ سم ويرتفع إلى ١٥ سم.", "Start with a 10 cm step and progress to 15 cm."] },
        { code: "calf-raise", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "single-leg-balance", doseNote: ["يومياً بجانب الكرسيّ.", "Daily beside a chair."] },
        { code: "hamstring-stretch-seated" },
        { code: "graded-walking", doseNote: ["٢٠–٣٠ دقيقة يومياً أو ٥ أيّام في الأسبوع، بسرعةٍ يتكلّم فيها ولا يغنّي.", "20–30 minutes daily or 5 days a week, at a pace where talking is possible but not singing."] },
      ],
    },
    {
      name: ["الوظيفة والتحمّل والوقاية", "Function, endurance and prevention"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["نحو الأسبوع الرابع — ثمّ البرنامجُ المنزليّ حتى الأسبوع الثاني عشر", "About week 4 — then the home programme until week 12"],
      goals: [
        "المشيُ ٣٠ دقيقةً متّصلة، والدرجُ بالتناوب، والنزولُ إلى الأرض والقيامُ منها لمن يحتاجه (الصلاة، الجلوس العائليّ)، والعودةُ إلى الأنشطة التي اختارها، واستقلالٌ تامّ ببرنامجٍ منزليّ وخطّةٍ مكتوبة للنوبة وخطّةٍ للوزن.",
        "Walking 30 minutes continuously, stairs step over step, getting down to and up from the floor for those who need it (prayer, family sitting), return to the chosen activities, and full independence with a home programme, a written flare-up plan and a weight plan.",
      ],
      education: [
        "• خطّةُ النوبة المكتوبة (تُعطى للمريض):\n" +
        "  ١. نوبةُ ألمٍ أو تورّمٍ لا تعني ضرراً جديداً — لا راحةَ طويلة.\n" +
        "  ٢. خفّف التمارينَ إلى النصف يومين أو ثلاثة، وأبقِ الحركةَ والدرّاجة، والكمادةُ الباردة إن تورّمت الركبة.\n" +
        "  ٣. راجع ما سبق النوبة: مشيٌ أطول، درجٌ كثير، جلوسٌ على الأرض، زيادةُ وزن.\n" +
        "  ٤. إن لم تتحسّن خلال أسبوعين، أو صارت الركبةُ حارّةً متورّمة أو تقفل — راجعنا.\n" +
        "• بعد التخرّج: تمارينُ التقوية مرّتين أو ثلاثاً في الأسبوع، ونشاطٌ هوائيّ ١٥٠ دقيقة في الأسبوع (مشي، درّاجة، سباحة، أو تاي تشي) — فالفائدةُ تذهب حين يتوقّف التمرين.\n" +
        "• الوزنُ والتمرينُ عادتان دائمتان لا علاجٌ مؤقّت.",
        "• Written flare-up plan (given to the patient):\n" +
        "  1. A flare of pain or swelling does not mean new damage — no prolonged rest.\n" +
        "  2. Halve the exercises for two or three days, keep moving and cycling, and use a cold pack if the knee swells.\n" +
        "  3. Review what came before the flare: a longer walk, many stairs, floor sitting, weight gain.\n" +
        "  4. If there is no improvement within two weeks, or the knee becomes hot and swollen or locks — come back to us.\n" +
        "• After discharge: strengthening two to three times a week and 150 minutes of aerobic activity a week (walking, cycling, swimming or tai chi) — the benefit fades when exercise stops.\n" +
        "• Weight and exercise are lifelong habits, not a temporary treatment.",
      ],
      criteria: [
        "يتخرّج حين:\n" +
        "• تحقّقت أهدافُ الخطّة أو أغلبُها: تحسّنت نتائجُ الركبة (KOOS) ١٠ نقاطٍ على الأقلّ، والألمُ ٣ من ١٠ أو أقلّ مع الأنشطة أو انخفض ٣٠٪، والأنشطةُ الثلاثة في PSFS ٧ من ١٠ أو أعلى.\n" +
        "• زاد في الجلوس والوقوف ٣٠ ثانية تكرارين على الأقلّ، والوقوفُ والمشي (TUG) أقلّ من ١٢ ثانية أو تحسّن بوضوح.\n" +
        "• يمشي ٣٠ دقيقة، ويصعد الدرجَ وينزله بالتناوب ممسكاً بالدرابزين.\n" +
        "• يؤدّي برنامجَه وحده صحيحاً، ويعرف خطّةَ النوبة، وله خطّةٌ للوزن إن زاد.\n" +
        "ثمّ زيارةُ متابعةٍ وإعادةُ تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "Discharge (graduate) when:\n" +
        "• The plan goals are met or mostly met: KOOS improved by at least 10 points, pain ≤ 3/10 with activities or reduced by 30%, and the three PSFS activities at 7/10 or higher.\n" +
        "• At least 2 more repetitions on the 30-second chair stand, and TUG under 12 seconds or clearly improved.\n" +
        "• Walks 30 minutes, and climbs and descends stairs step over step holding the rail.\n" +
        "• Performs the programme independently and correctly, knows the flare-up plan, and has a weight plan if overweight.\n" +
        "Then a follow-up visit and reassessment four weeks after discharge.",
      ],
      notes: [
        "• اربط التمارين بمهامّ المريض: الدرجُ في البيت، والقيامُ من الأرض والجلوسُ عليها، والصلاةُ، والمرحاضُ، وركوبُ السيارة، والسوق.\n" +
        "• المقاومةُ تُزاد ما دامت التقنيةُ صحيحة والألمُ والتورّمُ ضمن القاعدة، يوماً بعد يوم.\n" +
        "• الطعنةُ الثابتة لمن يتحمّلها بلا ألمٍ في مقدّمة الركبة — وإلّا فصعودُ الدرجة يكفي.\n" +
        "• الخفيفُ الذي تحسّن سريعاً قد يتخرّج قبل الجلسة الرابعة والعشرين — بمعايير التخرّج لا بالعدد. ومَن بقي ألمُه شديداً رغم البرنامج: الطبيبُ لتقييم الجراحة (NICE 2022).\n" +
        "• بعد الجلسة الأخيرة: يكمل البرنامجَ المنزليّ وحده حتى نهاية الأسبوع الثاني عشر، ويعود لزيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "• Link exercises to the patient's tasks: stairs at home, getting down to and up from the floor, prayer, the toilet, getting in and out of a car, and shopping.\n" +
        "• Increase resistance as long as technique is correct and pain and swelling stay within the rule, on alternate days.\n" +
        "• Split squats for those who tolerate them without front-of-knee pain — otherwise step-ups are enough.\n" +
        "• A mild case that improves quickly may graduate before session 24 — by the discharge criteria, not the count. If pain stays severe despite the programme: the doctor for a surgical opinion (NICE 2022).\n" +
        "• After the last session: the home programme continues independently until the end of week 12, with a follow-up visit and reassessment four weeks after discharge.",
      ],
      exercises: [
        { code: "stationary-cycling", doseNote: ["١٥–٢٠ دقيقة بمقاومةٍ متوسّطة، أو فتراتٌ قصيرة أسرع.", "15–20 minutes at moderate resistance, or short faster intervals."] },
        { code: "sit-to-stand", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["بثقلٍ أمام الصدر أو من مقعدٍ أخفض.", "With a weight held at the chest or from a lower seat."] },
        { code: "step-up", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["درجةٌ ٢٠ سم أو ثقلٌ في اليدين.", "A 20 cm step or weights in the hands."] },
        { code: "lateral-step-down", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "split-squat", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["لمن يتحمّلها بلا ألمٍ في مقدّمة الركبة، والعمقُ بقدر الألم.", "For those who tolerate it without front-of-knee pain, with depth set by pain."] },
        { code: "side-lying-hip-abduction", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["بثقلٍ على الكاحل أو مطّاطٍ فوق الركبتين.", "With an ankle weight or a band above the knees."] },
        { code: "single-leg-balance", doseNote: ["يومياً — بلا إمساك ثمّ على وسادة.", "Daily — without hand support, then on a cushion."] },
        { code: "calf-raise", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["على ساقٍ واحدة حين يصير بالساقين سهلاً.", "On one leg once the two-leg version is easy."] },
        { code: "graded-walking", doseNote: ["٣٠ دقيقة ٥ أيّام في الأسبوع (١٥٠ دقيقة)، أو درّاجةٌ أو سباحةٌ أو تاي تشي.", "30 minutes 5 days a week (150 minutes), or cycling, swimming or tai chi."] },
      ],
    },
  ],
};

export const name = "126_physio_knee_oa_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
