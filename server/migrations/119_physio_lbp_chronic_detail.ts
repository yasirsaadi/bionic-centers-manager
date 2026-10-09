// Migration 119: ألمُ أسفل الظهر المزمن — البروتوكولُ الأوّل مفصَّلاً (§4.cx — ٢٠٢٦-١٠-٠٩).
//
// قرارُ المالك بعد ملاحظة المشرف العام: «نبدأ بالبروتوكولات واحدةً بعد واحدة — مفصَّلاً ومرتّباً وعميقاً وبمستوىً عالٍ». فهذا أوّلُها:
// ثلاثُ مراحل بمعايير انتقالٍ مكتوبة، وثماني عشرةَ بطاقةَ تمرين (الهدف · البداية · الخطوات · الجرعة · الأخطاء · الأسهل والأصعب · متى
// يتوقّف · الأدوات · الصور المطلوبة)، وأجهزةٌ بدرجة دليلها وخاناتها، ومراجعُ عالمية. كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// المصادر: NICE NG59 (2016، حُدّث 2020) · JOSPT CPG Revision 2021 · ACP 2017 · WHO 2023 (ألم أسفل الظهر الأوّليّ المزمن) ·
// Cochrane 2021 (التمارين) · سلسلة The Lancet 2018 · STarT Back (2011) · McGill (Low Back Disorders) · Smith 2017 (الألم أثناء التمرين).
// القواعدُ في `physio_content.ts`: بطاقاتٌ لا تُمَسّ إن وُجدت، والنصوصُ لا تُكتب فوق تعديل إنسان، والمراحلُ لا تتكرّر.
import { exercisesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٥ من ١٠ مقبول إن عاد إلى مستواه المعتاد قبل صباح اليوم التالي.";
const PAIN_RULE_EN = "Pain up to 5/10 during exercise is acceptable if it settles to its usual level by the next morning.";

export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "diaphragmatic-breathing", nameAr: "التنفّس الحجابيّ (البطنيّ) في الاستلقاء", nameEn: "Diaphragmatic breathing (crook lying)",
    kind: "breathing", region: "whole_body", sets: 1, reps: 10,
    purpose: ["يخفّض الشدَّ الدفاعيّ في عضلات الظهر والبطن ويهدّئ الجهازَ العصبيّ المتحسّس، وهو مدخلُ تمارين التحكّم الحركيّ.",
      "Reduces protective guarding of the back and abdominal muscles and calms a sensitised nervous system; the entry point to motor-control work."],
    start: ["مستلقٍ على الظهر على سطحٍ ثابت، الركبتان مثنيّتان والقدمان على الأرض بعرض الورك، ووسادةٌ رقيقة تحت الرأس. يدٌ على الصدر، ويدٌ على البطن فوق السرّة.",
      "Lying on the back on a firm surface, knees bent, feet flat hip-width apart, a thin pillow under the head. One hand on the chest, one on the abdomen above the navel."],
    steps: [[
      "خذ شهيقاً بطيئاً من الأنف في ٣–٤ ثوانٍ، فترتفع اليدُ التي على البطن وتبقى اليدُ التي على الصدر شبهَ ثابتة.",
      "توقّف لحظةً قصيرة دون حبس النفس.",
      "أخرج الزفيرَ ببطء من الفم بشفتين شبه مضمومتين في ٤–٦ ثوانٍ (الزفيرُ أطول من الشهيق)، فتنزل اليدُ التي على البطن.",
      "أرخِ الكتفين والفكَّ والظهر مع كلّ زفير.",
      "كرّر عشرةَ أنفاس.",
    ], [
      "Breathe in slowly through the nose for 3–4 seconds; the hand on the abdomen rises while the hand on the chest stays almost still.",
      "Pause briefly without holding the breath.",
      "Breathe out slowly through pursed lips for 4–6 seconds (exhale longer than inhale); the abdominal hand falls.",
      "Let the shoulders, jaw and back relax with every exhale.",
      "Repeat for ten breaths.",
    ]],
    cues: [[
      "الصدرُ والكتفان يرتفعان مع الشهيق ⟵ أبقِهما مرتخيَين ووجّه النفسَ إلى البطن.",
      "دفعُ البطن بالعضلات بقوّة ⟵ الحركةُ من النفس لا من الشدّ.",
      "تنفّسٌ سريع يسبّب دوخة ⟵ أبطئ، وتوقّف إن دُخت.",
    ], [
      "Chest and shoulders rise on inhalation → keep them relaxed and direct the breath to the abdomen.",
      "Pushing the belly out with muscle effort → the movement comes from the breath, not from bracing.",
      "Breathing fast and feeling dizzy → slow down, and stop if dizziness persists.",
    ]],
    easier: ["في الجلوس المسنود أو الاستلقاء على الجنب.", "Supported sitting or side-lying."],
    harder: ["مع شدٍّ خفيف لعضلات البطن (المرحلة ٢)، أو في الجلوس والوقوف وأثناء المشي.", "Combine with a light abdominal brace (phase 2), or practise in sitting, standing and walking."],
    stopIf: ["دوخةٌ أو خفقانٌ أو ضيقُ نفس.", "Dizziness, palpitations or shortness of breath."],
    equipment: ["فرشةٌ أو سرير، ووسادةٌ رقيقة.", "Mat or bed, thin pillow."],
    doseNote: ["مرّتان يومياً، وعند اشتداد الألم وقبل النوم.", "Twice daily, during pain flares and before sleep."],
    images: [{ key: "diaphragmatic-breathing-1", ar: "مستلقٍ والركبتان مثنيّتان، يدٌ على الصدر ويدٌ على البطن", en: "Crook lying, one hand on the chest and one on the abdomen", search: "diaphragmatic breathing lying" }],
  },
  {
    code: "pelvic-tilt", nameAr: "إمالة الحوض للخلف في الاستلقاء", nameEn: "Posterior pelvic tilt (crook lying)",
    kind: "mobility", region: "lumbar", sets: 2, reps: 10, hold: 3,
    purpose: ["يحرّك الفقراتِ القطنية برفق ويعلّم المريضَ التحكّمَ في وضع الحوض — أوّلُ تمارين التحكّم وأخفُّها.",
      "Gently mobilises the lumbar segments and teaches control of pelvic position — the first and gentlest motor-control drill."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان، القدمان على الأرض بعرض الورك، والذراعان بجانب الجسم.",
      "Lying on the back, knees bent, feet flat hip-width apart, arms by the sides."],
    steps: [[
      "خذ شهيقاً مريحاً.",
      "مع الزفير، أمِل الحوضَ للخلف بشدٍّ خفيف لعضلات أسفل البطن والألوية، فيقترب أسفلُ الظهر من الأرض كأنك تسطّحه على السرير.",
      "اثبت ٣ ثوانٍ وأنت تتنفّس.",
      "أرخِ وعُد إلى الوضع المحايد ببطء.",
      "كرّر بحركةٍ صغيرة مريحة.",
    ], [
      "Take a comfortable breath in.",
      "As you breathe out, tilt the pelvis backwards with a light contraction of the lower abdominals and gluteals, so the low back flattens towards the bed.",
      "Hold for 3 seconds while breathing.",
      "Relax slowly back to neutral.",
      "Repeat with a small, comfortable movement.",
    ]],
    cues: [[
      "رفعُ الحوض عن الأرض ⟵ الحركةُ إمالةٌ لا جسر.",
      "حبسُ النفس ⟵ تنفّس أثناء الثبات.",
      "دفعُ الأرض بالقدمين بقوّة ⟵ الحركةُ من البطن والحوض.",
    ], [
      "Lifting the pelvis off the floor → it is a tilt, not a bridge.",
      "Holding the breath → keep breathing during the hold.",
      "Pushing hard through the feet → the movement comes from the abdomen and pelvis.",
    ]],
    easier: ["مدىً أصغر، أو بلا ثبات.", "Smaller range, or no hold."],
    harder: ["إمالةٌ متناوبة للأمام والخلف ببطء، أو في الجلوس على كرسيّ.", "Slow alternating anterior–posterior tilts, or perform in sitting on a chair."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أو ينتشر إلى الساق.", "Pain above 5/10 or pain spreading into the leg."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [
      { key: "pelvic-tilt-1", ar: "الوضع المحايد: فراغٌ صغير تحت أسفل الظهر", en: "Neutral: a small gap under the low back", search: "pelvic tilt exercise" },
      { key: "pelvic-tilt-2", ar: "إمالةُ الحوض للخلف: أسفلُ الظهر يلامس الأرض", en: "Posterior tilt: low back flattened to the floor", search: "posterior pelvic tilt supine" },
    ],
  },
  {
    code: "lower-trunk-rotation", nameAr: "تدوير الجذع السفليّ بالركبتين", nameEn: "Lower trunk rotation (knee rocking)",
    kind: "mobility", region: "lumbar", sets: 2, reps: 10, perSide: true,
    purpose: ["يحرّك الفقراتِ القطنية دوراناً لطيفاً ويُرخي عضلاتِ الظهر والورك.",
      "Gentle rotational mobility of the lumbar spine that relaxes the back and hip muscles."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان ومتلاصقتان والقدمان على الأرض، والذراعان ممدودتان جانباً على شكل حرف T.",
      "Lying on the back, knees bent and together, feet on the floor, arms out to the sides in a T."],
    steps: [[
      "أبقِ الكتفين ملتصقَين بالأرض طوال الحركة.",
      "أمِل الركبتين معاً ببطءٍ إلى جهةٍ واحدة إلى حيث يكون الشدُّ مريحاً لا مؤلماً.",
      "اثبت ثانيتين وتنفّس.",
      "عُد إلى المنتصف بشدٍّ خفيف للبطن، ثمّ إلى الجهة الأخرى.",
      "الذهابُ إلى الجهتين تكرارٌ واحد لكلّ جانب.",
    ], [
      "Keep both shoulders on the floor throughout.",
      "Slowly let both knees fall together to one side, only as far as the stretch stays comfortable.",
      "Hold for 2 seconds and breathe.",
      "Return to the middle with a light abdominal brace, then go to the other side.",
      "One movement to each side counts as one repetition per side.",
    ]],
    cues: [[
      "ارتفاعُ الكتف المقابل ⟵ قلّل المدى.",
      "حركةٌ سريعة بالاندفاع ⟵ بطيئةٌ ومتحكَّمٌ بها.",
      "الدخولُ في المدى المؤلم ⟵ ابقَ في المريح وزِده تدريجياً.",
    ], [
      "Opposite shoulder lifts → reduce the range.",
      "Fast, swinging movement → slow and controlled.",
      "Moving into a painful range → stay within the comfortable range and increase it gradually.",
    ]],
    easier: ["مدىً صغير (ربعُ المسافة).", "Small range (about a quarter of the way)."],
    harder: ["الركبتان مرفوعتان عن الأرض (الورك والركبة ٩٠°) مع شدّ البطن.", "Feet off the floor (hips and knees at 90°) with an abdominal brace."],
    stopIf: ["ألمٌ حادّ أو ألمٌ ينتشر إلى الساق.", "Sharp pain or pain spreading into the leg."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [{ key: "lower-trunk-rotation-1", ar: "الركبتان تميلان معاً إلى جهةٍ والكتفان على الأرض", en: "Knees fall together to one side, shoulders stay down", search: "lower trunk rotation exercise" }],
  },
  {
    code: "single-knee-to-chest", nameAr: "سحب الركبة إلى الصدر", nameEn: "Single knee to chest stretch",
    kind: "stretch", region: "lumbar", sets: 1, reps: 3, hold: 20, perSide: true,
    purpose: ["يُطيل عضلاتِ أسفل الظهر والألوية ويفتح الفقراتِ القطنية بعطفٍ لطيف.",
      "Lengthens the lumbar extensors and gluteals and gently opens the lumbar segments in flexion."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان والقدمان على الأرض.", "Lying on the back, knees bent, feet flat."],
    steps: [[
      "اسحب ركبةً واحدة نحو الصدر بيديك، ممسكاً خلف الفخذ لا فوق الركبة.",
      "اسحب برفق حتى تشعر بشدٍّ مريح في أسفل الظهر أو الألية.",
      "اثبت ٢٠ ثانيةً وتنفّس ببطء.",
      "أنزِل الساقَ ببطء، وكرّر بالأخرى.",
    ], [
      "Draw one knee towards the chest with both hands, holding behind the thigh rather than over the knee.",
      "Pull gently until a comfortable stretch is felt in the low back or buttock.",
      "Hold for 20 seconds, breathing slowly.",
      "Lower the leg slowly and repeat on the other side.",
    ]],
    cues: [[
      "رفعُ الرأس والكتفين ⟵ أبقِهما على الأرض.",
      "الإمساكُ فوق الركبة ⟵ يضغط عليها؛ أمسك خلف الفخذ.",
      "السحبُ بقوّة حتى الألم ⟵ الشدُّ مريحٌ لا مؤلم.",
    ], [
      "Lifting the head and shoulders → keep them on the floor.",
      "Gripping over the kneecap → it compresses the knee; hold behind the thigh.",
      "Pulling into pain → the stretch should be comfortable, not painful.",
    ]],
    easier: ["منشفةٌ حول الفخذ لمن لا يصل بيديه.", "A towel around the thigh for those who cannot reach."],
    harder: ["الركبتان معاً إلى الصدر — لمن يتحمّل العطف.", "Both knees to chest — for those who tolerate flexion."],
    stopIf: ["ألمٌ ينتشر إلى الساق، أو ألمٌ في مقدّمة الورك (خاصّةً بعد عملية ورك).", "Pain spreading into the leg, or pain at the front of the hip (especially after hip surgery)."],
    equipment: ["فرشة، ومنشفة.", "Mat, towel."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [{ key: "knee-to-chest-1", ar: "سحبُ ركبةٍ واحدة بالإمساك خلف الفخذ", en: "One knee drawn up, hands behind the thigh", search: "single knee to chest stretch" }],
  },
  {
    code: "cat-camel", nameAr: "القطّ والجمل (تقويسُ الظهر وتقعيرُه على أربع)", nameEn: "Cat–camel",
    kind: "mobility", region: "lumbar", sets: 1, reps: 10,
    purpose: ["يحرّك العمودَ الفقريّ كلَّه عطفاً وبسطاً بلا حمل ويخفّف التيبّس؛ وهو إحماءُ تمارين القوّة عند ماكجيل (McGill).",
      "Moves the whole spine through flexion and extension without load and eases stiffness; McGill's warm-up before stabilisation work."],
    start: ["على أربع: اليدان تحت الكتفين والركبتان تحت الوركين، الظهرُ مستقيم والرأسُ بامتداده.",
      "Four-point kneeling: hands under shoulders, knees under hips, spine neutral, head in line."],
    steps: [[
      "مع الزفير، قوّس ظهرك للأعلى ببطء كالقطّ، وأنزِل الرأسَ والذقن نحو الصدر، وادفع الأرضَ بيديك.",
      "مع الشهيق، اترك ظهرك ينزل قليلاً نحو الأرض وارفع الرأسَ برفق (الجمل).",
      "تحرّك ببطءٍ في المدى المريح، فقرةً فقرة.",
      "الهدفُ الحركة لا التمطيط في نهاية المدى — ٨ إلى ١٠ دورات.",
    ], [
      "Breathing out, slowly round the back upwards like a cat, tuck the chin and push the floor away.",
      "Breathing in, let the back sag gently towards the floor and lift the head slightly (camel).",
      "Move slowly within a comfortable range, segment by segment.",
      "The aim is motion, not end-range stretching — 8 to 10 cycles.",
    ]],
    cues: [[
      "الحركةُ من الذراعين والوركين ⟵ الحركةُ من العمود الفقريّ.",
      "النزولُ القويّ في التقعير ⟵ مدىً خفيف مريح.",
      "الكتفان قرب الأذنين ⟵ ادفع الأرض ليبتعدا.",
    ], [
      "Moving from the arms and hips → move from the spine.",
      "Forcing the sag → a light, comfortable range.",
      "Shoulders creeping to the ears → push the floor away.",
    ]],
    easier: ["مدىً أصغر، أو في الجلوس على كرسيّ (تقويسُ الظهر وتقعيرُه).", "Smaller range, or seated on a chair (round and arch the back)."],
    harder: ["لا يُصعَّب — هو تمرينُ حركةٍ وإحماء.", "Not progressed — it is a mobility and warm-up drill."],
    stopIf: ["ألمٌ في الرسغ أو الركبة (ضع وسادة)، أو ألمٌ ينتشر إلى الساق.", "Wrist or knee pain (use a cushion), or pain spreading into the leg."],
    equipment: ["فرشة، ووسادةٌ للركبتين عند الحاجة.", "Mat; cushion for the knees if needed."],
    doseNote: ["صباحاً ومساءً، وقبل كلّ جلسة تمارين.", "Morning and evening, and before every exercise session."],
    images: [
      { key: "cat-camel-1", ar: "تقويسُ الظهر للأعلى (القطّ)", en: "Back rounded upwards (cat)", search: "cat camel exercise" },
      { key: "cat-camel-2", ar: "تقعيرُ الظهر برفق (الجمل)", en: "Back gently sagging (camel)", search: "cat cow stretch" },
    ],
  },
  {
    code: "abdominal-bracing", nameAr: "شدّ عضلات البطن (تثبيت الجذع)", nameEn: "Abdominal bracing",
    kind: "motor_control", region: "lumbar", sets: 2, reps: 10, hold: 10,
    purpose: ["يعلّم تنشيطَ عضلات الجذع كلّها معاً بشدّةٍ خفيفة مع استمرار التنفّس — أساسُ الثبات في كلّ التمارين والأنشطة التالية.",
      "Teaches co-activation of all trunk muscles at low intensity while breathing normally — the basis of stability for all later exercises and daily tasks."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان، الظهرُ في وضعه الطبيعيّ (فراغٌ صغير تحته)، وأطرافُ الأصابع على جانبي البطن تحت الأضلاع.",
      "Crook lying, spine in neutral (a small gap under the low back), fingertips on the sides of the abdomen just below the ribs."],
    steps: [[
      "شدّ عضلات البطن كأنك تستعدّ لضربةٍ خفيفة على بطنك: تشعر أنها تصلُب تحت أصابعك من كلّ الجهات.",
      "الشدّةُ ١٠–٢٠٪ من أقصى قوّتك فقط.",
      "لا تسحب السرّةَ للداخل ولا تدفع البطنَ للخارج؛ البطنُ يبقى في مكانه ويصلُب.",
      "اثبت ١٠ ثوانٍ وأنت تتنفّس طبيعياً وتستطيع الكلام.",
      "أرخِ تماماً ٥ ثوانٍ، ثمّ كرّر.",
    ], [
      "Stiffen the abdominal wall as if bracing for a light poke to the stomach: feel it firm up under your fingers on all sides.",
      "Use only 10–20% of maximal effort.",
      "Do not suck the navel in or push the belly out; the abdomen stays where it is and becomes firm.",
      "Hold for 10 seconds while breathing normally and able to talk.",
      "Relax fully for 5 seconds, then repeat.",
    ]],
    cues: [[
      "حبسُ النفس ⟵ عدّ بصوتٍ مسموع أثناء الثبات.",
      "تسطيحُ الظهر أو إمالةُ الحوض ⟵ الظهرُ يبقى في وضعه الطبيعيّ.",
      "شدٌّ قويّ جداً ⟵ يكفي ١٠–٢٠٪.",
    ], [
      "Breath holding → count out loud during the hold.",
      "Flattening the back or tilting the pelvis → keep the spine in neutral.",
      "Bracing too hard → 10–20% is enough.",
    ]],
    easier: ["في الجلوس على كرسيّ، أو ثباتٌ ٥ ثوانٍ.", "Sitting on a chair, or a 5-second hold."],
    harder: ["مع حركة طرف: رفعُ قدمٍ عن الأرض قليلاً بالتناوب، ثمّ في الوقوف وأثناء المشي والرفع.", "Add limb movement: alternate small foot lifts, then brace in standing, walking and lifting."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠، أو دوخة.", "Pain above 5/10, or dizziness."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["مرّتان يومياً، ثمّ أثناء الأنشطة اليومية (الرفع، القيام).", "Twice daily, then during daily tasks (lifting, standing up)."],
    images: [{ key: "abdominal-bracing-1", ar: "الأصابعُ على جانبي البطن تتحسّس الشدّ والظهرُ في وضعه الطبيعيّ", en: "Fingertips feel the brace at the sides of the abdomen, spine neutral", search: "abdominal bracing exercise" }],
  },
  {
    code: "prone-press-up", nameAr: "البسط من الانبطاح (تمرين ماكنزي)", nameEn: "Prone press-up (McKenzie extension)",
    kind: "mobility", region: "lumbar", sets: 1, reps: 10, hold: 2,
    purpose: ["لمن ظهر عنده في التقييم تفضيلٌ اتّجاهيّ للبسط (Directional preference): البسطُ المتكرّر يخفّف الألمَ ويمركزه نحو الظهر.",
      "For patients with an extension directional preference on assessment: repeated extension reduces pain and centralises it towards the spine."],
    start: ["منبطحٌ على البطن، واليدان تحت الكتفين كوضعية الضغط، والحوضُ والساقان مرتخيان على الأرض.",
      "Lying prone, hands under the shoulders as for a push-up, pelvis and legs relaxed on the floor."],
    steps: [[
      "ابدأ بالاتّكاء على المرفقين دقيقةً واحدة إن كان مريحاً.",
      "ادفع بيديك وارفع الجزءَ العلويّ من الجسم ببطء، والحوضُ على الأرض والظهرُ والألويةُ مرتخية.",
      "اصعد إلى حيث يسمح الألم، واثبت ثانيتين في الأعلى مع الزفير.",
      "انزل ببطء.",
      "زِد المدى قليلاً مع كلّ تكرارٍ ما دام الألمُ يتمركز أو يخفّ.",
    ], [
      "Start by resting on the elbows for one minute if comfortable.",
      "Push with the hands and slowly lift the upper body, keeping the pelvis on the floor and the back and buttocks relaxed.",
      "Go as high as symptoms allow and hold for 2 seconds at the top while breathing out.",
      "Lower slowly.",
      "Increase the range a little each repetition as long as pain centralises or eases.",
    ]],
    cues: [[
      "شدُّ الألوية والظهر ⟵ الذراعان تعملان والظهرُ مرتخٍ.",
      "رفعُ الحوض عن الأرض ⟵ الحوضُ ثقيلٌ على الأرض.",
      "الاستمرارُ مع انتشار الألم إلى الساق ⟵ توقّف فوراً.",
    ], [
      "Clenching the buttocks and back → the arms do the work, the back stays relaxed.",
      "Pelvis lifting off the floor → let the pelvis stay heavy.",
      "Continuing while pain spreads down the leg → stop immediately.",
    ]],
    easier: ["الاتّكاءُ على المرفقين فقط.", "Prone on elbows only."],
    harder: ["المدى الكامل حتى استقامة الذراعين، أو البسطُ واقفاً (اليدان على أسفل الظهر) أثناء النهار.", "Full range to straight arms, or standing extension (hands on the low back) through the day."],
    stopIf: ["الألمُ ينتشر إلى الساق أو يبتعد عن الظهر (Peripheralisation) — هذا التمرينُ لا يناسبه؛ أخبر الأخصائيّ.",
      "Pain spreads into the leg or moves away from the spine (peripheralisation) — this exercise is not suitable; inform the specialist."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["١٠ تكرارات كلّ ٣–٤ ساعات في النهار، بحسب ما يقرّره الأخصائيّ.", "10 repetitions every 3–4 hours during the day, as prescribed by the specialist."],
    images: [
      { key: "prone-press-up-1", ar: "منبطحٌ واليدان تحت الكتفين", en: "Prone with hands under the shoulders", search: "prone press up start" },
      { key: "prone-press-up-2", ar: "رفعُ الجذع بالذراعين والحوضُ على الأرض", en: "Upper body raised with the arms, pelvis on the floor", search: "mckenzie press up exercise" },
    ],
  },
  {
    code: "graded-walking", nameAr: "المشي المتدرّج", nameEn: "Graded walking programme",
    kind: "aerobic", region: "whole_body",
    purpose: ["أكثرُ نشاطٍ هوائيٍّ أماناً وفائدةً لألم الظهر المزمن: يحسّن الألمَ والوظيفةَ واللياقة، ويكسر دائرةَ الخوف وقلّة الحركة.",
      "The safest and most useful aerobic activity for chronic low back pain: improves pain, function and fitness, and breaks the cycle of fear and inactivity."],
    start: ["حذاءٌ مريح، وأرضٌ مستوية في البداية (ممرّ، حديقة، جهازُ مشي).", "Comfortable shoes; level ground to begin with (corridor, park, treadmill)."],
    steps: [[
      "حدّد مدّةَ المشي المريحة الآن (مثلاً ١٢ دقيقة قبل أن يزيد الألم).",
      "ابدأ بـ٨٠٪ منها (مثلاً ١٠ دقائق) مرّةً أو مرّتين يومياً — ولا تزد في الأيام الجيّدة.",
      "زِد دقيقتين كلّ ٢–٣ أيّام إن بقي الألمُ في اليوم التالي كما هو.",
      "السرعة: تستطيع الكلامَ بجملٍ كاملة ولا تستطيع الغناء (جهدٌ معتدل).",
      "سجّل المدّة يومياً في دفترٍ أو هاتف.",
    ], [
      "Find the current comfortable walking time (e.g. 12 minutes before pain increases).",
      "Start at 80% of it (e.g. 10 minutes) once or twice a day — and do not do more on good days.",
      "Add 2 minutes every 2–3 days if next-day pain is unchanged.",
      "Pace: able to talk in full sentences but not sing (moderate effort).",
      "Log the time every day in a notebook or phone.",
    ]],
    cues: [[
      "مشيٌ طويل في اليوم الجيّد ثمّ توقّفٌ أيّاماً ⟵ كميّةٌ ثابتة يومياً تُزاد بالخطّة.",
      "مشيٌ متيبّس بذراعين ثابتتين ⟵ حرّك الذراعين وخذ خطواتٍ طبيعية.",
      "انتظارُ زوال الألم قبل البدء ⟵ نمشي مع ألمٍ مقبول.",
    ], [
      "A long walk on a good day followed by days of rest → a fixed daily amount increased by plan.",
      "Stiff walking with rigid arms → swing the arms and take natural steps.",
      "Waiting for the pain to disappear before starting → walk with acceptable pain.",
    ]],
    easier: ["مشيٌ أقصر وأكثر (٥ دقائق ثلاث مرّات يومياً)، أو دراجةٌ ثابتة.", "Shorter, more frequent bouts (5 minutes three times a day), or a stationary bike."],
    harder: ["أرضٌ مائلة، أو سرعةٌ أعلى، أو مدّةٌ أطول حتى ٣٠–٤٥ دقيقة.", "Inclines, a faster pace, or longer bouts up to 30–45 minutes."],
    stopIf: ["ألمٌ في الصدر، أو ضيقُ نفسٍ غير معتاد، أو دوخة، أو ألمٌ في الساق يجبره على التوقّف ويزول بالجلوس (اشتباهُ تضيّق القناة أو ضعف الدورة الدموية) — أخبر الأخصائيّ.",
      "Chest pain, unusual breathlessness, dizziness, or leg pain that forces a stop and eases with sitting (possible stenosis or vascular claudication) — inform the specialist."],
    equipment: ["حذاءٌ مريح، وساعةٌ أو هاتف للتوقيت.", "Comfortable shoes; a watch or phone for timing."],
    doseNote: ["يومياً — المدّةُ بحسب المرحلة.", "Daily — duration per phase."],
    images: [{ key: "graded-walking-1", ar: "مشيٌ بخطواتٍ طبيعية وذراعين تتحرّكان", en: "Walking with natural steps and arm swing", search: "brisk walking posture" }],
  },

  // ═══ المرحلة ٢ ═══
  {
    code: "glute-bridge", nameAr: "الجسر (رفعُ الحوض)", nameEn: "Glute bridge",
    kind: "strength", region: "hip", sets: 3, reps: 12, hold: 3, rest: 45,
    purpose: ["يقوّي الألويةَ وعضلاتِ الفخذ الخلفية وباسطاتِ الظهر معاً، ويعلّم بسطَ الورك بلا تقويسٍ زائد للظهر.",
      "Strengthens the gluteals, hamstrings and back extensors together and teaches hip extension without excessive lumbar arching."],
    start: ["مستلقٍ على الظهر، الركبتان مثنيّتان، القدمان على الأرض بعرض الورك وقريبتان من الألية، والذراعان بجانب الجسم.",
      "Crook lying, feet hip-width apart and close to the buttocks, arms by the sides."],
    steps: [[
      "شدّ البطن خفيفاً كما تعلّمت.",
      "اضغط بالكعبين وارفع الحوضَ حتى يصير الكتفُ والوركُ والركبة على خطٍّ مستقيم.",
      "اعصر الألويةَ في الأعلى واثبت ٣ ثوانٍ وأنت تتنفّس.",
      "انزل ببطء فقرةً فقرة.",
      "كرّر.",
    ], [
      "Set a light abdominal brace.",
      "Press through the heels and lift the pelvis until shoulder, hip and knee form a straight line.",
      "Squeeze the gluteals at the top and hold for 3 seconds while breathing.",
      "Lower slowly, segment by segment.",
      "Repeat.",
    ]],
    cues: [[
      "تقويسُ الظهر في الأعلى ⟵ توقّف حين يستقيم الخطّ واعصر الألوية.",
      "الركبتان تتباعدان أو تتقاربان ⟵ أبقِهما بعرض الورك.",
      "تشنّجُ الفخذ الخلفيّ ⟵ قرّب القدمين من الألية.",
    ], [
      "Arching the back at the top → stop when the line is straight and squeeze the gluteals.",
      "Knees falling out or in → keep them hip-width apart.",
      "Hamstring cramp → bring the feet closer to the buttocks.",
    ]],
    easier: ["مدىً أصغر، أو بلا ثبات.", "Smaller range, or no hold."],
    harder: ["جسرٌ على ساقٍ واحدة، أو شريطٌ مطاطيّ فوق الركبتين، أو القدمان على درجة.", "Single-leg bridge, a resistance band above the knees, or feet on a step."],
    stopIf: ["ألمٌ حادّ في الظهر أو تشنّجٌ لا يزول.", "Sharp back pain or cramp that does not settle."],
    equipment: ["فرشة، وشريطٌ مطاطيّ للتصعيب.", "Mat; resistance band for progression."],
    doseNote: ["يوماً بعد يوم، أو يومياً إن كان سهلاً.", "Every other day, or daily if easy."],
    images: [
      { key: "glute-bridge-1", ar: "البداية: مستلقٍ والقدمان قرب الألية", en: "Start: crook lying, feet close to the buttocks", search: "glute bridge exercise start" },
      { key: "glute-bridge-2", ar: "الأعلى: الكتفُ والوركُ والركبة على خطٍّ واحد", en: "Top: shoulder, hip and knee in one line", search: "glute bridge exercise" },
    ],
  },
  {
    code: "bird-dog", nameAr: "الكلب والطائر (رفعُ اليد والرجل المتقابلتين على أربع)", nameEn: "Bird dog",
    kind: "motor_control", region: "lumbar", sets: 3, reps: 8, hold: 10, rest: 30, perSide: true,
    purpose: ["يقوّي باسطاتِ الظهر والألويةَ بأقلّ ضغطٍ على الفقرات، ويدرّب الثباتَ ضدّ الدوران — أحدُ «الثلاثة الكبار» عند ماكجيل.",
      "Strengthens the back extensors and gluteals with minimal spinal load and trains anti-rotation stability — one of McGill's 'big three'."],
    start: ["على أربع: اليدان تحت الكتفين والركبتان تحت الوركين، الظهرُ في وضعه الطبيعيّ، والرقبةُ بامتداده والنظرُ إلى الأرض.",
      "Four-point kneeling: hands under shoulders, knees under hips, spine neutral, neck in line, eyes to the floor."],
    steps: [[
      "شدّ البطن خفيفاً.",
      "مُدّ ذراعاً للأمام والساقَ المقابلة للخلف معاً ببطء حتى تصيرا موازيتين للأرض.",
      "اثبت ١٠ ثوانٍ وأنت تتنفّس، وأصابعُ القدم متّجهةٌ إلى الأرض.",
      "عُد ببطء، ثمّ الجهةُ الأخرى.",
      "كرّر ٨ مرّات لكلّ جهة.",
    ], [
      "Set a light abdominal brace.",
      "Slowly reach one arm forwards and the opposite leg backwards until both are parallel to the floor.",
      "Hold for 10 seconds while breathing, toes pointing to the floor.",
      "Return slowly, then switch sides.",
      "Repeat 8 times each side.",
    ]],
    cues: [[
      "الحوضُ يدور أو يميل ⟵ تخيّل كوبَ ماءٍ على أسفل ظهرك لا ينسكب.",
      "رفعُ الساق أعلى من الوركين فيتقوّس الظهر ⟵ موازيةٌ للأرض فقط.",
      "رفعُ الرأس للنظر للأمام ⟵ النظرُ إلى الأرض.",
    ], [
      "Pelvis rotating or tipping → imagine a glass of water on the low back that must not spill.",
      "Leg lifted above hip height, arching the back → parallel to the floor only.",
      "Looking forwards → eyes to the floor.",
    ]],
    easier: ["الساقُ وحدها أو الذراعُ وحدها، أو مدٌّ قصير يلامس فيه إصبعُ القدم الأرض.", "Leg only or arm only, or a short reach with the toes touching the floor."],
    harder: ["رسمُ مربّعٍ صغير باليد والقدم أثناء الثبات، أو وزنٌ خفيف للرسغ والكاحل.", "Draw small squares with the hand and foot during the hold, or add light wrist and ankle weights."],
    stopIf: ["ألمٌ في الرسغ أو الركبة (ضع وسادة)، أو ألمٌ في الظهر يزيد على ٥ من ١٠.", "Wrist or knee pain (use a cushion), or back pain above 5/10."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["يومياً.", "Daily."],
    images: [
      { key: "bird-dog-1", ar: "البداية على أربع والظهرُ مستقيم", en: "Start in four-point kneeling, spine neutral", search: "bird dog exercise start position" },
      { key: "bird-dog-2", ar: "مدُّ الذراع والساق المتقابلتين موازيتين للأرض", en: "Opposite arm and leg extended parallel to the floor", search: "bird dog exercise" },
    ],
  },
  {
    code: "side-plank", nameAr: "الجسر الجانبيّ", nameEn: "Side plank",
    kind: "endurance", region: "lumbar", sets: 3, hold: 20, rest: 30, perSide: true,
    purpose: ["يقوّي المربّعةَ القطنية (Quadratus lumborum) والمائلةَ البطنية والألويةَ الوسطى — ثباتُ الجذع الجانبيّ بأقلّ ضغطٍ على الفقرات (من «الثلاثة الكبار»).",
      "Strengthens quadratus lumborum, the obliques and gluteus medius — lateral trunk stability with minimal spinal load (one of the 'big three')."],
    start: ["مستلقٍ على جنبك، المرفقُ تحت الكتف تماماً، والجسمُ على خطٍّ واحد. في البداية الركبتان مثنيّتان ٩٠° (التعديل)، ثمّ الساقان ممدودتان والقدمُ العليا أمام السفلى.",
      "Side-lying, elbow directly under the shoulder, body in one line. Start with knees bent to 90° (modified), later with legs straight and the top foot in front of the bottom foot."],
    steps: [[
      "شدّ البطن خفيفاً.",
      "ارفع الحوضَ عن الأرض حتى يصير الكتفُ والوركُ والركبة (أو القدم) على خطٍّ مستقيم.",
      "اثبت ٢٠ ثانيةً وأنت تتنفّس، واليدُ العليا على الكتف المقابل أو على الورك.",
      "انزل ببطء واسترح، ثمّ الجهةُ الأخرى.",
    ], [
      "Set a light abdominal brace.",
      "Lift the pelvis until shoulder, hip and knee (or foot) form a straight line.",
      "Hold for 20 seconds while breathing, top hand on the opposite shoulder or on the hip.",
      "Lower slowly and rest, then switch sides.",
    ]],
    cues: [[
      "الحوضُ يتدلّى إلى الأرض أو يرتدّ للخلف ⟵ الجسمُ مستقيمٌ كلوح.",
      "المرفقُ بعيدٌ عن الكتف ⟵ تحته تماماً.",
      "الكتفُ يرتفع نحو الأذن ⟵ ادفع الأرضَ بالمرفق.",
    ], [
      "Hips sagging or drifting back → keep the body straight like a board.",
      "Elbow away from the shoulder → directly underneath.",
      "Shoulder hitching to the ear → push the floor away with the elbow.",
    ]],
    easier: ["على الركبتين، أو ثباتٌ ١٠ ثوانٍ، أو واقفاً مع الاتّكاء بالمرفق على الحائط.", "On the knees, a 10-second hold, or standing with the forearm against a wall."],
    harder: ["على القدمين، ثمّ رفعُ الساق العليا، أو التدحرجُ من جانبٍ إلى جانب عبر اللوح الأماميّ.", "On the feet, then lifting the top leg, or rolling from side to side through a front plank."],
    stopIf: ["ألمٌ في الكتف، أو ألمٌ في الظهر يزيد على ٥ من ١٠.", "Shoulder pain, or back pain above 5/10."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["يومياً.", "Daily."],
    images: [
      { key: "side-plank-1", ar: "الجسرُ الجانبيّ على الركبتين (التعديل)", en: "Modified side plank on the knees", search: "modified side plank knees" },
      { key: "side-plank-2", ar: "الجسرُ الجانبيّ الكامل على القدمين", en: "Full side plank on the feet", search: "side plank exercise" },
    ],
  },
  {
    code: "mcgill-curl-up", nameAr: "تمرين البطن المعدَّل (ماكجيل)", nameEn: "McGill modified curl-up",
    kind: "endurance", region: "lumbar", sets: 3, reps: 6, hold: 8, rest: 30,
    purpose: ["يقوّي العضلةَ المستقيمة البطنية بلا عطفٍ للفقرات القطنية — بديلٌ آمن عن تمرين البطن التقليديّ (Sit-up).",
      "Trains rectus abdominis without flexing the lumbar spine — a safe alternative to the traditional sit-up."],
    start: ["مستلقٍ على الظهر، ساقٌ ممدودة والأخرى مثنيّة والقدمُ على الأرض، واليدان تحت أسفل الظهر (الراحتان إلى الأرض) لتحفظا الفراغَ الطبيعيّ تحته.",
      "Lying on the back, one leg straight and the other bent with the foot flat, hands under the low back (palms down) to preserve its natural curve."],
    steps: [[
      "شدّ البطن خفيفاً.",
      "ارفع الرأسَ والكتفين قليلاً جداً عن الأرض (بضعة سنتيمترات) كقطعةٍ واحدة، دون ثني الرقبة.",
      "اثبت ٨ ثوانٍ وأنت تتنفّس.",
      "انزل ببطء.",
      "بدّل الساقين في منتصف المجموعة.",
    ], [
      "Set a light abdominal brace.",
      "Lift the head and shoulders just a few centimetres off the floor as one unit, without bending the neck.",
      "Hold for 8 seconds while breathing.",
      "Lower slowly.",
      "Switch legs halfway through the set.",
    ]],
    cues: [[
      "ثنيُ الرقبة وشدُّ الذقن إلى الصدر ⟵ الرأسُ والرقبةُ والصدر قطعةٌ واحدة والنظرُ إلى السقف.",
      "تسطيحُ أسفل الظهر على اليدين ⟵ يبقى الفراغُ كما هو.",
      "الصعودُ عالياً ⟵ بضعةُ سنتيمترات تكفي.",
    ], [
      "Bending the neck, chin to chest → head, neck and chest move as one, eyes to the ceiling.",
      "Flattening the low back onto the hands → keep the curve.",
      "Lifting too high → a few centimetres is enough.",
    ]],
    easier: ["رفعُ الرأس فقط، والمرفقان على الأرض.", "Lift the head only, elbows on the floor."],
    harder: ["رفعُ المرفقين عن الأرض أثناء الثبات، أو تنفّسٌ عميق في الأعلى.", "Lift the elbows off the floor during the hold, or take deep breaths at the top."],
    stopIf: ["ألمٌ في الرقبة، أو ألمٌ في الظهر يزيد على ٥ من ١٠. ومن عنده هشاشةُ عظام: الرأسُ فقط.", "Neck pain, or back pain above 5/10. With osteoporosis: head lift only."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["يومياً.", "Daily."],
    images: [{ key: "mcgill-curl-up-1", ar: "ساقٌ مثنيّة واليدان تحت أسفل الظهر، والرأسُ والكتفان يرتفعان قليلاً", en: "One knee bent, hands under the low back, head and shoulders lifted slightly", search: "mcgill curl up" }],
  },
  {
    code: "sit-to-stand", nameAr: "الجلوس والقيام من الكرسيّ", nameEn: "Sit to stand",
    kind: "functional", region: "hip", sets: 3, reps: 10, rest: 60,
    purpose: ["يقوّي الفخذَ والألوية ويعلّم الانحناءَ من الورك بظهرٍ ثابت في حركةٍ يوميةٍ متكرّرة.",
      "Strengthens the quadriceps and gluteals and teaches hip hinging with a stable spine in a frequent daily movement."],
    start: ["كرسيٌّ ثابت بلا عجلات مسنودٌ إلى الحائط ومقعدُه بارتفاع الركبة. اجلس على نصف المقعد الأماميّ، والقدمان بعرض الورك ومسطّحتان وخلف الركبتين قليلاً، والذراعان متقاطعتان على الصدر.",
      "A stable chair without wheels against a wall, seat at knee height. Sit on the front half, feet hip-width, flat and slightly behind the knees, arms crossed over the chest."],
    steps: [[
      "شدّ البطن خفيفاً.",
      "مِل بجذعك للأمام من الورك والظهرُ مستقيم حتى يصير الأنفُ فوق أصابع القدمين.",
      "اضغط بالكعبين وقِف حتى يستقيم الوركُ والركبة.",
      "انزل ببطءٍ في ٣ ثوانٍ بالحركة نفسها حتى تلامس المقعدَ دون أن ترتمي.",
      "كرّر.",
    ], [
      "Set a light abdominal brace.",
      "Lean forwards from the hips with a straight back until the nose is over the toes.",
      "Press through the heels and stand until hips and knees are straight.",
      "Lower slowly over 3 seconds with the same movement until you touch the seat without dropping.",
      "Repeat.",
    ]],
    cues: [[
      "الركبتان تنحرفان للداخل ⟵ باتّجاه أصابع القدم.",
      "الارتماءُ على المقعد ⟵ نزولٌ بطيءٌ متحكَّم.",
      "تقوّسُ الظهر عند الميل ⟵ الانحناءُ من الورك والظهرُ مستقيم.",
      "رفعُ الكعبين ⟵ الوزنُ على القدم كلّها.",
    ], [
      "Knees collapsing inwards → track over the toes.",
      "Dropping onto the seat → slow, controlled lowering.",
      "Rounding the back when leaning → hinge at the hips with a straight back.",
      "Heels lifting → weight through the whole foot.",
    ]],
    easier: ["اليدان على مسندي الكرسيّ، أو مقعدٌ أعلى بوسادة.", "Hands on the armrests, or a higher seat with a cushion."],
    harder: ["مقعدٌ أخفض، أو حملُ ثقلٍ أمام الصدر، أو على ساقٍ واحدة مع إسنادٍ خفيف.", "Lower seat, a weight held at the chest, or single-leg with light support."],
    stopIf: ["ألمٌ في الركبة يزيد على ٥ من ١٠، أو دوخةٌ عند القيام.", "Knee pain above 5/10, or dizziness on standing."],
    equipment: ["كرسيٌّ ثابت بلا عجلات، وثقلٌ للتصعيب.", "Stable chair without wheels; a weight for progression."],
    doseNote: ["يوماً بعد يوم في البيت، وفي كلّ جلسة.", "Every other day at home, and in every session."],
    images: [
      { key: "sit-to-stand-1", ar: "البداية: جالسٌ على نصف المقعد والجذعُ يميل من الورك", en: "Start: seated on the front half, trunk leaning from the hips", search: "sit to stand exercise" },
      { key: "sit-to-stand-2", ar: "الوقوفُ الكامل والوركُ والركبة مستقيمان", en: "Full stand with hips and knees straight", search: "chair stand exercise" },
    ],
  },
  {
    code: "hip-hinge-dowel", nameAr: "الانحناء من الورك بالعصا", nameEn: "Hip hinge with dowel",
    kind: "motor_control", region: "hip", sets: 3, reps: 10, rest: 30,
    purpose: ["يعلّم أهمَّ نمطٍ لحماية الظهر في الرفع والانحناء: الحركةُ من الورك والظهرُ ثابتٌ في وضعه الطبيعيّ.",
      "Teaches the key spine-sparing pattern for lifting and bending: movement from the hips with the spine held in neutral."],
    start: ["واقفٌ والقدمان بعرض الورك والركبتان مثنيّتان قليلاً. عصا (أو مقبضُ مكنسة) على طول الظهر تلامس ثلاثَ نقاط: مؤخّرةَ الرأس، وما بين لوحَي الكتف، وعظمَ العجز. يدٌ تمسك العصا خلف الرقبة والأخرى خلف أسفل الظهر.",
      "Standing, feet hip-width, knees slightly bent. A dowel (or broom handle) along the back touching three points: back of the head, between the shoulder blades and the sacrum. One hand holds it behind the neck, the other behind the low back."],
    steps: [[
      "ادفع الوركين للخلف كأنك تغلق بابَ سيارةٍ بمؤخّرتك، والجذعُ يميل للأمام.",
      "أبقِ النقاطَ الثلاث ملامسةً للعصا طوالَ الحركة.",
      "انزل حتى تشعر بشدٍّ خلف الفخذ أو حتى يقارب الجذعُ ٤٥°.",
      "عُد بدفع الوركين للأمام وعصر الألوية.",
      "كرّر ببطء.",
    ], [
      "Push the hips back as if closing a car door with your bottom, letting the trunk tip forwards.",
      "Keep all three contact points on the dowel throughout.",
      "Go down until you feel the hamstrings stretch or the trunk is near 45°.",
      "Return by driving the hips forwards and squeezing the gluteals.",
      "Repeat slowly.",
    ]],
    cues: [[
      "العصا تبتعد عن الرأس أو العجز ⟵ الظهرُ ينحني بدل الورك.",
      "ثنيُ الركبتين كثيراً كالقرفصاء ⟵ الوركان للخلف لا للأسفل.",
      "رفعُ الرأس للنظر للأمام ⟵ الرقبةُ بامتداد الظهر.",
    ], [
      "Dowel leaving the head or sacrum → the spine is bending instead of the hips.",
      "Too much knee bend, like a squat → hips go back, not down.",
      "Lifting the head to look forwards → neck in line with the back.",
    ]],
    easier: ["الوقوفُ وظهرُه قربَ حائط ودفعُ الوركين لملامسته.", "Stand a little in front of a wall and push the hips back to touch it."],
    harder: ["مع ثقلٍ خفيف في اليدين (ثمّ رفعُ الثقل من الأرض في المرحلة ٣)، أو على ساقٍ واحدة.", "Hold a light weight (progressing to the floor lift in phase 3), or single-leg."],
    stopIf: ["ألمٌ في الظهر يزيد على ٥ من ١٠، أو انتشارٌ إلى الساق.", "Back pain above 5/10, or pain spreading into the leg."],
    equipment: ["عصا مستقيمة أو مقبضُ مكنسة.", "Straight dowel or broom handle."],
    doseNote: ["يومياً — ثمّ في كلّ انحناءٍ يوميّ.", "Daily — then in every bend of the day."],
    images: [
      { key: "hip-hinge-1", ar: "العصا على الظهر بثلاث نقاط تماس: الرأس، وبين الكتفين، والعجز", en: "Dowel on the back with three contact points: head, between the shoulder blades, sacrum", search: "hip hinge dowel" },
      { key: "hip-hinge-2", ar: "الوركان للخلف والظهرُ مستقيم", en: "Hips back with a straight spine", search: "hip hinge exercise" },
    ],
  },

  // ═══ المرحلة ٣ ═══
  {
    code: "front-plank", nameAr: "اللوح الأماميّ", nameEn: "Front plank",
    kind: "endurance", region: "lumbar", sets: 3, hold: 20, rest: 30,
    purpose: ["يقوّي جدارَ البطن كلَّه وثباتَ الجذع ضدّ البسط، استعداداً للحمل والرفع.",
      "Strengthens the whole abdominal wall and anti-extension trunk stability in preparation for carrying and lifting."],
    start: ["على المرفقين والركبتين أوّلاً: المرفقان تحت الكتفين والساعدان متوازيان.", "On elbows and knees to start: elbows under the shoulders, forearms parallel."],
    steps: [[
      "شدّ البطن والألوية.",
      "ارفع الركبتين عن الأرض فيصير الجسمُ خطّاً مستقيماً من الرأس إلى الكعبين.",
      "اثبت ٢٠ ثانيةً وأنت تتنفّس.",
      "انزل على الركبتين واسترح.",
    ], [
      "Brace the abdomen and squeeze the gluteals.",
      "Lift the knees so the body forms a straight line from head to heels.",
      "Hold for 20 seconds while breathing.",
      "Lower to the knees and rest.",
    ]],
    cues: [[
      "تدلّي الحوض وتقوّسُ الظهر ⟵ اعصر الألويةَ وارفع الحوضَ قليلاً.",
      "رفعُ الحوض عالياً كالخيمة ⟵ خطٌّ مستقيم.",
      "حبسُ النفس ⟵ تنفّس وعدّ.",
    ], [
      "Hips sagging and back arching → squeeze the gluteals and lift the pelvis slightly.",
      "Hips piked up like a tent → straight line.",
      "Breath holding → breathe and count.",
    ]],
    easier: ["على الركبتين، أو مائلاً واليدان على طاولةٍ أو حائط.", "On the knees, or inclined with hands on a table or wall."],
    harder: ["رفعُ قدمٍ عن الأرض بالتناوب، أو ثباتٌ ٣٠–٤٥ ثانية.", "Alternate foot lifts, or 30–45-second holds."],
    stopIf: ["ألمٌ في الظهر يزيد على ٥ من ١٠، أو ألمٌ في الكتف.", "Back pain above 5/10, or shoulder pain."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["يوماً بعد يوم.", "Every other day."],
    images: [{ key: "front-plank-1", ar: "اللوحُ على المرفقين والجسمُ خطٌّ مستقيم", en: "Forearm plank with the body in a straight line", search: "forearm plank exercise" }],
  },
  {
    code: "kettlebell-deadlift", nameAr: "رفع الثقل من الأرض بالورك", nameEn: "Kettlebell deadlift (hip-hinge lift)",
    kind: "functional", region: "whole_body", sets: 3, reps: 8, rest: 90,
    purpose: ["يدرّب الرفعَ الآمن من الأرض بنمط الانحناء من الورك، ويقوّي الألويةَ والفخذَ الخلفيّ وباسطاتِ الظهر — ويعيد الثقةَ برفع الأشياء اليومية.",
      "Trains safe lifting from the floor with a hip-hinge pattern and strengthens the gluteals, hamstrings and back extensors — restoring confidence in everyday lifting."],
    start: ["واقفٌ والقدمان بعرض الورك، والثقلُ (أو حقيبةٌ أو جالونُ ماء) على الأرض بين القدمين تحت منتصفهما. في البداية يُرفع من ارتفاع كرسيٍّ أو صندوق.",
      "Standing, feet hip-width, the weight (or a bag or water jug) on the floor between the feet under the mid-foot. Begin by lifting from chair or box height."],
    steps: [[
      "انحنِ من الورك كما تعلّمت بالعصا، واثنِ الركبتين بقدر ما يلزم لتصل إلى المقبض والظهرُ مستقيم.",
      "أمسك المقبضَ بقوّة، واشدد البطن، وأبعد الكتفين عن الأذنين.",
      "ادفع الأرضَ بالقدمين وقِف بدفع الوركين للأمام حتى يستقيم الجسم.",
      "انزل بالحركة نفسها عكساً: الوركان للخلف أوّلاً.",
      "ضع الثقلَ على الأرض بتحكّم.",
    ], [
      "Hinge at the hips as practised with the dowel, bending the knees only as much as needed to reach the handle with a straight back.",
      "Grip the handle firmly, brace the abdomen and draw the shoulders away from the ears.",
      "Push the floor away and stand by driving the hips forwards until upright.",
      "Lower with the reverse movement: hips back first.",
      "Place the weight down under control.",
    ]],
    cues: [[
      "تقوّسُ الظهر عند النزول ⟵ ارفع من ارتفاعٍ أعلى حتى يبقى الظهرُ مستقيماً.",
      "الثقلُ بعيدٌ عن الجسم ⟵ قريبٌ يكاد يلامس الساقين.",
      "السحبُ بالذراعين ⟵ الذراعان حبالٌ والقوّةُ من الوركين.",
      "الميلُ للخلف في الأعلى ⟵ قِف مستقيماً فقط.",
    ], [
      "Back rounding on the way down → lift from a higher start until the spine stays neutral.",
      "Weight drifting away from the body → keep it close, almost touching the legs.",
      "Pulling with the arms → the arms are ropes; the drive comes from the hips.",
      "Leaning back at the top → simply stand tall.",
    ]],
    easier: ["ثقلٌ أخفّ، أو من ارتفاع كرسيّ.", "Lighter load, or from chair height."],
    harder: ["زيادةُ الثقل ٢–٤ كغ كلّ أسبوع ما دامت التقنيةُ صحيحة، ثمّ من الأرض.", "Add 2–4 kg per week while technique stays correct, then lift from the floor."],
    stopIf: ["ألمٌ حادّ مفاجئ، أو انتشارٌ إلى الساق، أو ألمٌ يستمرّ إلى اليوم التالي أكثر من المعتاد.", "Sudden sharp pain, pain spreading into the leg, or pain lasting into the next day more than usual."],
    equipment: ["ثقلٌ بمقبض (كتلبيل) ٨–١٦ كغ، أو حقيبةٌ أو جالونُ ماء في البيت، وكرسيٌّ أو صندوق.", "Kettlebell 8–16 kg, or a bag or water jug at home; a chair or box."],
    doseNote: ["مرّتين أو ثلاثاً في الأسبوع.", "Two to three times a week."],
    images: [
      { key: "kettlebell-deadlift-1", ar: "البداية: الوركان للخلف والظهرُ مستقيم واليدان على المقبض", en: "Start: hips back, spine neutral, hands on the handle", search: "kettlebell deadlift start" },
      { key: "kettlebell-deadlift-2", ar: "الوقوفُ الكامل والثقلُ قريبٌ من الجسم", en: "Standing tall with the weight close to the body", search: "kettlebell deadlift" },
    ],
  },
  {
    code: "suitcase-carry", nameAr: "حمل الثقل بيدٍ واحدة والمشي", nameEn: "Suitcase carry",
    kind: "functional", region: "whole_body", perSide: true,
    purpose: ["يدرّب ثباتَ الجذع ضدّ الميل الجانبيّ أثناء المشي بحمل — كحمل الكيس أو الحقيبة — ويقوّي المربّعةَ القطنية والمائلات.",
      "Trains trunk stability against side-bending while walking under load — like carrying a shopping bag — and strengthens quadratus lumborum and the obliques."],
    start: ["واقفٌ مستقيماً، ثقلٌ في يدٍ واحدة بجانب الجسم، والكتفان مستويان.", "Standing tall, a weight in one hand at the side, shoulders level."],
    steps: [[
      "شدّ البطن خفيفاً وقِف طويلاً كأنّ خيطاً يشدّ رأسك للأعلى.",
      "امشِ بخطواتٍ طبيعية ٢٠–٣٠ متراً دون أن تميل نحو الثقل أو بعيداً عنه.",
      "بدّل اليدَ وعُد.",
    ], [
      "Brace lightly and stand tall as if a string pulls the head up.",
      "Walk 20–30 metres with natural steps without leaning towards or away from the weight.",
      "Switch hands and walk back.",
    ]],
    cues: [[
      "الميلُ نحو الثقل أو نزولُ الكتف ⟵ الكتفان مستويان والجذعُ مستقيم.",
      "خطواتٌ قصيرةٌ متيبّسة ⟵ امشِ طبيعياً.",
      "حبسُ النفس ⟵ تنفّس.",
    ], [
      "Leaning towards the weight or a dropped shoulder → shoulders level, trunk upright.",
      "Short, stiff steps → walk naturally.",
      "Breath holding → keep breathing.",
    ]],
    easier: ["ثقلٌ أخفّ، أو مسافةٌ أقصر.", "Lighter weight, or a shorter distance."],
    harder: ["ثقلٌ أكبر، أو المشيُ على درج.", "Heavier weight, or carrying up and down stairs."],
    stopIf: ["ألمٌ في الظهر يزيد على ٥ من ١٠، أو ألمٌ في الكتف أو اليد.", "Back pain above 5/10, or shoulder or hand pain."],
    equipment: ["ثقلٌ بمقبض أو حقيبةٌ أو كيس (٥–١٥ كغ).", "A weight with a handle, a bag or a shopping bag (5–15 kg)."],
    doseNote: ["٣ مرّات × ٢٠–٣٠ متراً لكلّ يد، مرّتين أو ثلاثاً في الأسبوع.", "3 × 20–30 metres per hand, two to three times a week."],
    images: [{ key: "suitcase-carry-1", ar: "المشيُ بثقلٍ في يدٍ واحدة والكتفان مستويان", en: "Walking with a weight in one hand, shoulders level", search: "suitcase carry exercise" }],
  },
  {
    code: "split-squat", nameAr: "الطعنة الثابتة", nameEn: "Split squat",
    kind: "strength", region: "hip", sets: 3, reps: 8, rest: 60, perSide: true,
    purpose: ["يقوّي الفخذَ والألويةَ لكلّ ساقٍ وحدها ويدرّب التوازن — لصعود الدرج والنزول إلى الأرض والقيام منها.",
      "Strengthens the quadriceps and gluteals one leg at a time and trains balance — for stairs and getting down to and up from the floor."],
    start: ["واقفٌ بخطوةٍ واسعة: القدمُ الأمامية مسطّحة والخلفيةُ على أصابعها، والجذعُ مستقيم، واليدان على الوركين أو تمسكان كرسيّاً للتوازن.",
      "Standing in a long stride: front foot flat, back foot on the toes, trunk upright, hands on the hips or holding a chair for balance."],
    steps: [[
      "شدّ البطن خفيفاً.",
      "انزل عمودياً بثني الركبتين حتى تقترب الركبةُ الخلفية من الأرض، أو بقدر ما يسمح الألم.",
      "الركبةُ الأمامية فوق القدم لا تنحرف للداخل.",
      "اصعد بدفع القدم الأمامية.",
      "أكمل التكرارات ثمّ بدّل الساقين.",
    ], [
      "Set a light abdominal brace.",
      "Lower straight down by bending both knees until the back knee nears the floor, or as far as pain allows.",
      "Keep the front knee over the foot without collapsing inwards.",
      "Drive up through the front foot.",
      "Complete the set, then switch legs.",
    ]],
    cues: [[
      "ميلُ الجذع للأمام أو تقوّسُه ⟵ الجذعُ مستقيم.",
      "الركبةُ الأمامية تنحرف للداخل ⟵ باتّجاه الإصبع الثاني.",
      "الخطوةُ قصيرةٌ جداً ⟵ وسّعها ليبقى الكعبُ الأماميّ على الأرض.",
    ], [
      "Trunk leaning forwards or arching → stay upright.",
      "Front knee collapsing inwards → track over the second toe.",
      "Stride too short → lengthen it so the front heel stays down.",
    ]],
    easier: ["مدىً أصغر، أو الإمساكُ بكرسيّ، أو صعودُ درجةٍ واحدة.", "Smaller range, holding a chair, or a single step-up."],
    harder: ["ثقلٌ في اليدين، أو القدمُ الخلفية على كرسيّ (Bulgarian split squat).", "Hold weights, or rear foot elevated on a chair (Bulgarian split squat)."],
    stopIf: ["ألمٌ في الركبة يزيد على ٥ من ١٠، أو فقدانُ التوازن.", "Knee pain above 5/10, or loss of balance."],
    equipment: ["كرسيٌّ للتوازن، وثقلٌ للتصعيب.", "A chair for balance; weights for progression."],
    doseNote: ["مرّتين أو ثلاثاً في الأسبوع.", "Two to three times a week."],
    images: [{ key: "split-squat-1", ar: "النزولُ في الطعنة والجذعُ مستقيم والركبةُ الخلفية قرب الأرض", en: "Lowered split squat, trunk upright, back knee near the floor", search: "split squat exercise" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "lbp-chronic-adult",
  summary: [
    "ألمُ أسفل الظهر غيرُ النوعيّ (Non-specific) الذي يستمرّ أكثر من ١٢ أسبوعاً، بلا كسرٍ ولا عدوى ولا ورمٍ ولا مرضٍ التهابيّ ولا ضغطٍ عصبيٍّ متقدّم — وهو أوّلُ أسباب سنوات العجز في العالم. " +
    "الألمُ المزمن هنا لا يعني تلفاً مستمرّاً: تشترك فيه حساسيةُ الجهاز العصبيّ (Sensitisation) والخوفُ من الحركة وقلّةُ النشاط والنومُ والضغطُ النفسيّ. " +
    "لذلك الأساسُ برنامجُ تمارين متدرّج يقوده المريضُ بنفسه مع التثقيف بعلم الألم (Pain neuroscience education)، والعلاجُ اليدويّ والأجهزةُ مساعدةٌ قصيرة لا بديل. " +
    "البرنامجُ ثلاثُ مراحل بمعايير انتقالٍ مكتوبة، ويُختم بخطّةٍ ذاتية للوقاية والتعامل مع الانتكاسة.",
    "Non-specific low back pain persisting beyond 12 weeks, without fracture, infection, malignancy, inflammatory disease or progressive neurological compromise — the leading cause of years lived with disability worldwide. " +
    "Persistent pain does not mean ongoing damage: nervous-system sensitisation, fear of movement, deconditioning, sleep and stress all contribute. " +
    "The core of care is therefore a graded, patient-led exercise programme combined with pain neuroscience education; manual therapy and electrophysical agents are short-term adjuncts, never substitutes. " +
    "The programme runs in three phases with written progression criteria and ends with a self-management and flare-up plan.",
  ],
  goals: [
    "١. خفضُ الإعاقة بمؤشر أوزوستري (ODI) ١٠ نقاطٍ على الأقلّ أو ٣٠٪ من قيمته الأولى (الفرقُ ذو المعنى سريرياً).\n" +
    "٢. خفضُ الألم (NPRS) نقطتين على الأقلّ أو ٣٠٪.\n" +
    "٣. خفضُ الخوف من الحركة (TSK) وتحسّنُ الثقة بالحركة والرفع.\n" +
    "٤. مشيٌ متّصل ٣٠ دقيقة، والعودةُ إلى العمل والأنشطة الثلاثة التي اختارها المريض في التقييم الأوّل (PSFS ٧ من ١٠ أو أكثر).\n" +
    "٥. استقلالُ المريض ببرنامجٍ منزليّ وخطّةٍ مكتوبة للانتكاسة قبل التخرّج.",
    "1. Reduce disability on the Oswestry Disability Index (ODI) by at least 10 points or 30% of baseline (clinically meaningful change).\n" +
    "2. Reduce pain (NPRS) by at least 2 points or 30%.\n" +
    "3. Reduce fear of movement (TSK) and build confidence in moving and lifting.\n" +
    "4. Walk 30 minutes continuously and return to work and to the three activities chosen at baseline (PSFS ≥ 7/10).\n" +
    "5. Independent home programme and a written flare-up plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين):\n" +
    "• فرزُ علامات الخطر (Red flags) — انظر «موانع الاستعمال»؛ أيُّ علامةٍ منها تُوقف البرنامج حتى يراه الطبيب.\n" +
    "• العواملُ النفسية والاجتماعية (Yellow flags): الخوفُ من الحركة، والتهويلُ من الألم (Catastrophising)، والمزاج، وضغطُ العمل، والتوقّعات. وأداةُ STarT Back تصنّف خطرَ الإزمان منخفضاً أو متوسّطاً أو مرتفعاً؛ والمرتفعُ يحتاج تركيزاً أكبر على التثقيف والتعرّض المتدرّج، وقد يحتاج إحالةً نفسية.\n" +
    "• المقاييس: الألمُ الآن وأسوأُه في الأسبوع (NPRS ٠–١٠)، ومؤشرُ أوزوستري (ODI)، ومقياسُ تامبا للخوف من الحركة (TSK)، ومقياسُ الوظيفة الخاصّ بالمريض (PSFS): ثلاثةُ أنشطةٍ يصعب عليه أداؤها، يقيّم كلّاً من ٠ إلى ١٠.\n" +
    "• الفحص: الوقفةُ والحركة، والحركاتُ المتكرّرة لمعرفة التفضيل الاتّجاهيّ (Directional preference): هل يتمركز الألمُ أو يخفّ بالبسط أو العطف المتكرّر؛ والفحصُ العصبيّ (رفعُ الساق المستقيمة SLR، والقوّة، والحسّ، والمنعكسات) إن كان في الساق ألم.\n" +
    "• القدرة: تحمّلُ عضلات الجذع (اختبارُ بيرنغ-سورنسن للباسطات، والجسرُ الجانبيّ بالثواني)، والجلوسُ والقيام ٥ مرّات بالتوقيت، ومدّةُ المشي المريحة.\n" +
    "إعادةُ التقييم كلّ ٢٨ يوماً بالمقاييس نفسِها، وقرارُ الانتقال بين المراحل بمعاييرها لا بالتاريخ وحده.",
    "Initial assessment (before any exercise):\n" +
    "• Red-flag screen — see Contraindications; any red flag stops the programme until a doctor has reviewed the patient.\n" +
    "• Psychosocial factors (yellow flags): fear of movement, catastrophising, mood, work stress, expectations. The STarT Back Tool stratifies the risk of chronicity as low, medium or high; high risk needs more emphasis on education and graded exposure and may need psychological referral.\n" +
    "• Measures: current and worst pain in the past week (NPRS 0–10), Oswestry Disability Index (ODI), Tampa Scale of Kinesiophobia (TSK) and the Patient-Specific Functional Scale (PSFS): three difficult activities, each rated 0–10.\n" +
    "• Examination: posture and movement; repeated movements to identify a directional preference (does pain centralise or ease with repeated extension or flexion?); neurological screen (straight leg raise, myotomes, dermatomes, reflexes) if there is leg pain.\n" +
    "• Capacity: trunk endurance (Biering-Sørensen test for the extensors, side bridge in seconds), timed five-times sit-to-stand, comfortable walking time.\n" +
    "Reassess every 28 days with the same measures; phase progression follows the criteria, not the calendar alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — التهدئة وبدءُ الحركة الآمنة (الأسبوع ١–٢): التنفّسُ الحجابيّ، وإمالةُ الحوض، وتدويرُ الجذع السفليّ، والركبةُ إلى الصدر، والقطّ والجمل، وشدُّ عضلات البطن، والبسطُ من الانبطاح لمن يفضّل البسط، والمشيُ المتدرّج يومياً.\n" +
    "المرحلة ٢ — بناءُ القوّة والتحمّل (الأسبوع ٣–٦): الجسر، والكلبُ والطائر، والجسرُ الجانبيّ على الركبتين، وتمرينُ البطن المعدَّل (McGill)، والجلوسُ والقيام، والانحناءُ من الورك بالعصا، والمشيُ ٢٠–٣٠ دقيقة.\n" +
    "المرحلة ٣ — العودةُ إلى الوظيفة والوقاية (الأسبوع ٧–١٢): اللوحُ الأماميّ، والجسرُ الجانبيّ الكامل، والجسرُ على ساقٍ واحدة، ورفعُ الثقل من الأرض بالورك، وحملُ الثقل بيدٍ واحدة والمشي، والطعنةُ الثابتة، ونشاطٌ هوائيّ ١٥٠ دقيقة أسبوعياً.\n" +
    "البرنامجُ المنزليّ يوميّ في كلّ المراحل، والجلسةُ في المركز للتعليم والتصحيح والتدرّج. " + PAIN_RULE_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Settle and start moving safely (weeks 1–2): diaphragmatic breathing, posterior pelvic tilt, lower trunk rotation, single knee to chest, cat–camel, abdominal bracing, prone press-ups for an extension preference, and daily graded walking.\n" +
    "Phase 2 — Build strength and endurance (weeks 3–6): glute bridge, bird dog, modified side plank, McGill curl-up, sit to stand, hip hinge with dowel, and walking 20–30 minutes.\n" +
    "Phase 3 — Return to function and prevention (weeks 7–12): front plank, full side plank, single-leg bridge, kettlebell deadlift, suitcase carry, split squat, and 150 minutes of aerobic activity per week.\n" +
    "The home programme is daily in every phase; clinic sessions are for teaching, correction and progression. " + PAIN_RULE_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ (Red flags) تُوقف البرنامج ويُحال المريضُ إلى الطبيب:\n" +
    "• فوراً (طوارئ): خدرٌ في منطقة السرج (حول الشرج والأعضاء التناسلية)، أو احتباسُ البول أو سلسُه أو فقدانُ التحكّم بالبراز حديثاً، أو ضعفٌ أو خدرٌ في الساقين معاً — اشتباهُ متلازمة ذيل الفرس (Cauda equina).\n" +
    "• ضعفٌ عصبيٌّ يزداد في ساق (سقوطُ القدم مثلاً).\n" +
    "• اشتباهُ كسر: رضٌّ كبير، أو رضٌّ بسيط مع هشاشة عظام أو استعمالٍ طويل للكورتيزون، أو ألمٌ مفاجئ فوق السبعين.\n" +
    "• اشتباهُ ورم: سرطانٌ سابق، أو نقصُ وزنٍ غيرُ مفسَّر، أو ألمٌ ليليٌّ ثابت لا يتغيّر بالوضعية، أو بدايةٌ جديدة بعد الخمسين.\n" +
    "• اشتباهُ عدوى: حمّى، أو ضعفُ مناعة، أو تعاطٍ بالوريد، أو عمليةٌ أو عدوى بولية حديثة.\n" +
    "• اشتباهُ التهاب الفقار المحوريّ: تيبّسٌ صباحيّ أكثر من ٣٠ دقيقة يتحسّن بالحركة، وبدايةٌ قبل الخامسة والأربعين، واستيقاظٌ في النصف الثاني من الليل — إحالةٌ لطبيب الروماتيزم (وله بروتوكولُه).\n" +
    "• ألمٌ في الصدر أو البطن يمتدّ إلى الظهر، أو نبضٌ محسوس في البطن (اشتباهُ أمّ الدم الأبهرية).",
    "Red flags that stop the programme and require medical referral:\n" +
    "• Immediately (emergency): saddle anaesthesia, new urinary retention or incontinence or loss of bowel control, or bilateral leg weakness or numbness — suspected cauda equina syndrome.\n" +
    "• Progressive neurological deficit in a leg (e.g. foot drop).\n" +
    "• Suspected fracture: major trauma, minor trauma with osteoporosis or long-term corticosteroid use, or sudden pain over age 70.\n" +
    "• Suspected malignancy: past cancer, unexplained weight loss, constant night pain unaffected by position, or new onset after 50.\n" +
    "• Suspected infection: fever, immunosuppression, intravenous drug use, recent surgery or urinary infection.\n" +
    "• Suspected axial spondyloarthritis: morning stiffness over 30 minutes that improves with movement, onset before 45, waking in the second half of the night — refer to rheumatology (separate protocol).\n" +
    "• Chest or abdominal pain radiating to the back, or a pulsatile abdominal mass (suspected aortic aneurysm).",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد أكثر أو استمرّ، تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• الألمُ الذي ينتشر إلى الساق ويبتعد عن الظهر (Peripheralisation) أثناء تمرينٍ يعني إيقافَ ذلك التمرين وإبلاغَ الأخصائيّ؛ وتمركزُه نحو الظهر علامةٌ جيّدة.\n" +
    "• هشاشةُ العظام: لا عطفَ للجذع مع حمل ولا لفَّ قويّاً؛ تمرينُ البطن المعدَّل برفع الرأس فقط، والانحناءُ من الورك بظهرٍ مستقيم.\n" +
    "• الحمل: لا استلقاءَ طويلاً على الظهر بعد الشهر الرابع؛ ويُستبدل الجسرُ بالجلوس والقيام.\n" +
    "• أمراضُ القلب أو الضغطُ غيرُ المضبوط: النشاطُ الهوائيّ بشدّةٍ معتدلة (يستطيع الكلام أثناءه)، ولا حبسَ للنفس في التمارين.\n" +
    "• لا راحةَ في الفراش، ولا حزامَ ظهرٍ دائم، ولا لغةَ تخويفٍ مثل «ظهرك مهترئ» أو «الفقرات تآكلت» — الكلماتُ تؤثّر في الألم.",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If it is higher or lasts longer, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Pain that spreads down the leg and away from the spine (peripheralisation) during an exercise means stopping that exercise and informing the specialist; centralisation towards the spine is a good sign.\n" +
    "• Osteoporosis: no loaded trunk flexion or forceful twisting; curl-ups with a head lift only, and hinge with a straight back.\n" +
    "• Pregnancy: avoid prolonged supine lying after the fourth month; replace the bridge with sit to stand.\n" +
    "• Cardiac disease or uncontrolled hypertension: aerobic work at moderate intensity (able to talk), and no breath holding during exercises.\n" +
    "• No bed rest, no long-term lumbar belt, and no threatening language such as 'your back is worn out' or 'your discs have crumbled' — words influence pain.",
  ],
  spw: 2, weeks: 12, minutes: 50,
  refs: [
    { title: "Low back pain and sciatica in over 16s: assessment and management (NG59)", org: "NICE", year: 2016, url: "https://www.nice.org.uk/guidance/ng59" },
    { title: "Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021", org: "JOSPT / APTA Orthopaedics", year: 2021, url: "https://doi.org/10.2519/jospt.2021.0304" },
    { title: "Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians", org: "ACP (Annals of Internal Medicine)", year: 2017, url: "https://doi.org/10.7326/M16-2367" },
    { title: "WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings", org: "World Health Organization", year: 2023 },
    { title: "Exercise therapy for chronic low back pain", org: "Cochrane Database of Systematic Reviews (Hayden et al.)", year: 2021, url: "https://doi.org/10.1002/14651858.CD009790.pub2" },
    { title: "Prevention and treatment of low back pain: evidence, challenges, and promising directions", org: "The Lancet Low Back Pain Series (Foster et al.)", year: 2018, url: "https://doi.org/10.1016/S0140-6736(18)30489-6" },
    { title: "Comparison of stratified primary care management for low back pain with current best practice (STarT Back)", org: "The Lancet (Hill et al.)", year: 2011, url: "https://doi.org/10.1016/S0140-6736(11)60937-9" },
    { title: "Should exercises be painful in the management of chronic musculoskeletal pain? A systematic review and meta-analysis", org: "British Journal of Sports Medicine (Smith et al.)", year: 2017 },
    { title: "Low Back Disorders: Evidence-Based Prevention and Rehabilitation, 3rd edition", org: "McGill SM — Human Kinetics", year: 2016 },
  ],
  devices: [
    { code: "exercise", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٣٠–٤٠ دقيقة في الجلسة، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 30–40 minutes per session, plus the daily home programme."],
      note: ["الأساسُ في كلّ الإرشادات (NICE · JOSPT · ACP · WHO · Cochrane).", "The core intervention in every guideline (NICE · JOSPT · ACP · WHO · Cochrane)."] },
    { code: "hot_pack", evidence: "optional", minutes: 15, params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على أسفل الظهر في الانبطاح أو الاستلقاء الجانبي، قبل التمارين لا بدلها. افحص الجلد قبل الكمادة وبعدها.",
        "Over the low back in prone or side-lying, before exercise, never instead of it. Check the skin before and after."],
      note: ["مساعدٌ قصيرُ المدى لمن تخفّف الحرارةُ ألمَه وتسهّل حركته؛ لا دليلَ على أثرٍ طويل في الألم المزمن. ممنوعٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
        "Short-term adjunct for patients whose pain and movement ease with heat; no evidence of long-term effect in chronic pain. Contraindicated with impaired sensation, poor circulation or open wounds."] },
    { code: "infrared", evidence: "optional", minutes: 10, params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسها.", "Alternative to the hot pack when unavailable, with the same precautions."],
      note: ["دفءٌ مريح لا أكثر؛ لا يُعطى وحده.", "Comfortable warmth only; never given alone."] },
    { code: "needle", evidence: "optional", minutes: 10, params: { needleSize: "0.30 × 50–60", points: "2–4", sessions: "1 / week × 3–6" },
      parameters: ["النقاطُ الزنادية (Trigger points) في المربّعة القطنية (Quadratus lumborum) والألوية الوسطى والصغرى (Gluteus medius / minimus) وباسطات الظهر (Erector spinae)، بطريقة الإدخال والإخراج السريع حتى استجابة الارتعاش الموضعية (Local twitch response)، ضمن جلسة التمارين ومعها.",
        "Trigger points in quadratus lumborum, gluteus medius/minimus and erector spinae using a fast-in/fast-out technique to elicit local twitch responses, within and alongside the exercise session."],
      note: ["للمرخَّص بالإبر الجافة وحده. يُتجنّب الإدخالُ العميق فوق الضلع الثاني عشر (خطرُ الرئة)، وتُوجَّه الإبرةُ في المربّعة القطنية نحو النتوء المستعرض. يقلّل الألمَ قصيرَ المدى حين يُضاف إلى التمارين (JOSPT 2021 · WHO 2023)، ولا يُعطى وحده.",
        "Dry-needling certified staff only. Avoid deep insertion above the 12th rib (pneumothorax risk) and direct the needle towards the transverse process in quadratus lumborum. Reduces short-term pain when added to exercise (JOSPT 2021 · WHO 2023); never given alone."] },
    { code: "electro", evidence: "not_recommended",
      note: ["التحفيزُ الكهربائيّ عبر الجلد (TENS) والتيارُ المتداخل (IFC) لا يُقدَّمان لألم أسفل الظهر (NICE NG59).",
        "TENS and interferential therapy are not offered for low back pain (NICE NG59)."] },
    { code: "ultrasound", evidence: "not_recommended",
      note: ["الأمواجُ فوق الصوتية العلاجية لا تُقدَّم (NICE NG59).", "Therapeutic ultrasound is not offered (NICE NG59)."] },
    { code: "traction", evidence: "not_recommended",
      note: ["الشدُّ لا يُقدَّم لألم أسفل الظهر (NICE NG59)، ولا يزيد شيئاً على التمارين.", "Traction is not offered for low back pain (NICE NG59) and adds nothing to exercise."] },
    { code: "laser", evidence: "not_recommended",
      note: ["دليلٌ منخفضُ الجودة ومتضارب؛ لا تضعه الإرشاداتُ ضمن العلاج الأساسيّ.", "Low-quality, conflicting evidence; not part of guideline-recommended core care."] },
    { code: "tecar", evidence: "not_recommended",
      note: ["لا تذكره إرشاداتُ ألم الظهر، وتجاربُه صغيرةٌ وقصيرةُ المدى — لا يُستعمل بديلاً عن التمارين.", "Not addressed by low back pain guidelines; small short-term trials only — never a substitute for exercise."] },
    { code: "megnatik", evidence: "not_recommended",
      note: ["لا دليلَ كافٍ على فائدته في ألم الظهر المزمن.", "Insufficient evidence of benefit in chronic low back pain."] },
  ],
  phases: [
    {
      name: ["التهدئة وبدءُ الحركة الآمنة", "Settle and start moving safely"],
      timeframe: ["الأسبوع ١–٢ (نحو ٤ جلسات)", "Weeks 1–2 (about 4 sessions)"],
      goals: [
        "فهمُ المريض لألمه ونقصُ خوفه من الحركة؛ حركةٌ مريحة في كلّ الاتّجاهات؛ خطُّ أساسٍ للمشي يُزاد تدريجياً؛ وبرنامجٌ منزليٌّ يوميّ يعرفه ويؤدّيه صحيحاً.",
        "The patient understands their pain and fears movement less; comfortable movement in all directions; a walking baseline that grows gradually; a daily home programme performed correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — تُقال بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• ألمُك حقيقيّ، لكنه لا يعني أنّ ظهرك يتضرّر. الظهرُ قويٌّ ومتين.\n" +
        "• تغيّراتُ الأشعة والرنين (تآكلُ الغضروف، الانتفاخ) موجودةٌ عند كثيرٍ ممّن لا يشكون ألماً وتزيد مع العمر طبيعياً — ولا تفسّر الألمَ وحدها.\n" +
        "• الألمُ المزمن يشبه جهازَ إنذارٍ صار حسّاساً أكثر من اللازم، والحركةُ المتدرّجة تعيد ضبطه.\n" +
        "• الراحةُ الطويلة في الفراش تؤخّر التحسّن، والبقاءُ نشيطاً يسرّعه.\n" +
        "• النومُ والتوتّر والمزاج تؤثّر في الألم — وهذا ليس «في رأسك» بل في جهازك العصبيّ.\n" +
        "• التدرّج (Pacing): لا تنتظر «يوماً جيّداً» لتعمل كثيراً ثمّ تتوقّف أيّاماً؛ كميّةٌ ثابتة يومياً تُزاد قليلاً كلّ أسبوع.",
        "Key messages — in plain language, repeated every session:\n" +
        "• Your pain is real, but it does not mean your back is being damaged. The back is strong and robust.\n" +
        "• Imaging changes (disc degeneration, bulges) are common in people without pain and increase normally with age — they do not explain pain on their own.\n" +
        "• Persistent pain is like an alarm system that has become over-sensitive; graded movement helps recalibrate it.\n" +
        "• Prolonged bed rest delays recovery; staying active speeds it up.\n" +
        "• Sleep, stress and mood influence pain — not 'in your head' but in your nervous system.\n" +
        "• Pacing: do not wait for a good day to do a lot and then rest for days; a steady daily amount, increased a little each week.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• يؤدّي تمارينَ المرحلة صحيحاً بلا تصحيحٍ متكرّر، وألمُه أثناءها ٥ من ١٠ أو أقلّ ويعود إلى مستواه قبل صباح اليوم التالي.\n" +
        "• يمشي ١٥ دقيقةً متّصلة على الأقلّ.\n" +
        "• يلتزم بالبرنامج المنزليّ ٥ أيّام في الأسبوع على الأقلّ.\n" +
        "• يستطيع أن يشرح بكلماته لماذا الحركةُ آمنةٌ له.\n" +
        "وإن لم يتحقّق ذلك بعد ٣ أسابيع: يراجع الأخصائيّ العواملَ النفسية والنومَ والالتزام، ويعيد فرزَ علامات الخطر.",
        "Progress to phase 2 when all are met:\n" +
        "• Performs the phase exercises correctly without repeated correction, with pain ≤ 5/10 that settles by the next morning.\n" +
        "• Walks at least 15 minutes continuously.\n" +
        "• Does the home programme at least 5 days a week.\n" +
        "• Can explain in their own words why movement is safe for them.\n" +
        "If not achieved by week 3: the specialist reviews psychosocial factors, sleep and adherence, and re-screens for red flags.",
      ],
      notes: [
        "• العلاجُ اليدويّ (تحريكُ مفاصل الفقرات القطنية والأنسجة الرخوة) يطبّقه الأخصائيّ إن أفاد، ٥–١٠ دقائق، قبل التمارين ولتسهيلها، لا وحده — بحسب إرشادات NICE وJOSPT.\n" +
        "• الحرارةُ السطحية اختياريةٌ قبل التمارين لمن تريحه.\n" +
        "• راقب الخوفَ ولغةَ الجسد أكثر من دقّة الحركة في الأيام الأولى، وامدح ما يستطيعه.\n" +
        "• البسطُ من الانبطاح فقط لمن ظهر عنده تفضيلُ البسط في التقييم.",
        "• Manual therapy (lumbar joint mobilisation and soft-tissue techniques) by the specialist if helpful, 5–10 minutes, before and to facilitate exercise, never alone (NICE · JOSPT).\n" +
        "• Superficial heat is optional before exercise for those who find it comfortable.\n" +
        "• In the first days watch fear and body language more than movement precision, and praise what the patient can do.\n" +
        "• Prone press-ups only for patients with an extension preference on assessment.",
      ],
      exercises: [
        { code: "diaphragmatic-breathing" },
        { code: "pelvic-tilt" },
        { code: "lower-trunk-rotation" },
        { code: "single-knee-to-chest" },
        { code: "cat-camel" },
        { code: "abdominal-bracing" },
        { code: "prone-press-up", note: ["لمن يفضّل البسط فقط (من التقييم).", "Only for an extension directional preference (from assessment)."] },
        { code: "graded-walking", doseNote: ["يبدأ من ٨٠٪ من مدّة المشي المريحة (مثلاً ١٠ دقائق) مرّةً أو مرّتين يومياً، ويزيد دقيقتين كلّ ٢–٣ أيّام.",
          "Start at 80% of the comfortable walking time (e.g. 10 minutes) once or twice daily; add 2 minutes every 2–3 days."] },
      ],
    },
    {
      name: ["بناءُ القوّة والتحمّل", "Build strength and endurance"],
      timeframe: ["الأسبوع ٣–٦", "Weeks 3–6"],
      goals: [
        "تحمّلُ عضلات الجذع والورك، ونمطٌ صحيح للانحناء من الورك، ومشيٌ ٢٠–٣٠ دقيقة، وتحسّنٌ ملموس في مؤشر أوزوستري.",
        "Trunk and hip endurance, a correct hip-hinge pattern, walking 20–30 minutes and a meaningful improvement in ODI.",
      ],
      education: [
        "• الألمُ الخفيف أثناء التمرين متوقّعٌ ومقبول (حتى ٥ من ١٠) إن هدأ قبل اليوم التالي — الإحساسُ بالألم لا يعني الضرر.\n" +
        "• الهدفُ زيادةُ القدرة لا اختفاءُ الألم أوّلاً؛ الألمُ يتبع القدرة.\n" +
        "• الانتكاسةُ الخفيفة (يومٌ أو يومان أسوأ) طبيعيةٌ ولها خطّة: لا تتوقّف، خفّف الكميّة، وعُد إلى الأسهل.\n" +
        "• في الجلوس الطويل: قُم وتحرّك كلّ ٣٠–٤٠ دقيقة.",
        "• Mild pain during exercise is expected and acceptable (up to 5/10) if it settles by the next day — hurt does not equal harm.\n" +
        "• The goal is more capacity, not the disappearance of pain first; pain follows capacity.\n" +
        "• A mild flare (a worse day or two) is normal and has a plan: do not stop, reduce the amount, and return to easier exercises.\n" +
        "• With prolonged sitting: get up and move every 30–40 minutes.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• يؤدّي الكلبَ والطائر ٨ مرّات لكلّ جهة بثبات ١٠ ثوانٍ وظهرُه ثابت.\n" +
        "• يثبت في الجسر الجانبيّ على الركبتين ٣٠ ثانيةً لكلّ جهة.\n" +
        "• يؤدّي الجسرَ ١٢ مرّة، والجلوسَ والقيام ١٠ مرّات بلا استعمال اليدين.\n" +
        "• ينحني من الورك بالعصا بثلاث نقاط تماسٍ ثابتة.\n" +
        "• يمشي ٢٥–٣٠ دقيقة.\n" +
        "• انخفض مؤشرُ أوزوستري ١٠ نقاطٍ على الأقلّ عن التقييم الأوّل — وإن لم ينخفض فمراجعةُ الأخصائيّ قبل الانتقال.",
        "Progress to phase 3 when:\n" +
        "• Bird dog 8 per side with 10-second holds and a stable spine.\n" +
        "• Modified side plank 30 seconds per side.\n" +
        "• Bridge × 12 and sit to stand × 10 without using the hands.\n" +
        "• Hip hinge with the dowel keeping all three contact points.\n" +
        "• Walks 25–30 minutes.\n" +
        "• ODI improved by at least 10 points from baseline — if not, specialist review before progressing.",
      ],
      notes: [
        "• التدرّج: زِد شيئاً واحداً فقط في كلّ مرّة — التكرارَ أو الثبات أو الصعوبة — حين تصير الجرعةُ الحالية سهلة (جهدٌ ٦ من ١٠ أو أقلّ).\n" +
        "• قاعدةُ التحمّل (McGill): تكراراتٌ أكثر بثباتٍ قصير (٨–١٠ ثوانٍ) أفضلُ من ثباتٍ طويلٍ واحد.\n" +
        "• راقب الحوضَ في الجسر والكلب والطائر: لا دورانَ ولا تقوّسَ زائد.\n" +
        "• القطّ والجمل إحماءٌ قبل كلّ جلسة.",
        "• Progression: change only one variable at a time — repetitions, hold or difficulty — once the current dose is easy (effort ≤ 6/10).\n" +
        "• Endurance rule (McGill): more repetitions with short holds (8–10 s) beat one long hold.\n" +
        "• Watch the pelvis in the bridge and bird dog: no rotation and no excessive arching.\n" +
        "• Cat–camel as the warm-up before every session.",
      ],
      exercises: [
        { code: "cat-camel", doseNote: ["إحماءٌ: ١٠ تكرارات قبل التمارين.", "Warm-up: 10 repetitions before exercising."] },
        { code: "glute-bridge" },
        { code: "bird-dog" },
        { code: "side-plank", note: ["على الركبتين في هذه المرحلة.", "On the knees in this phase."] },
        { code: "mcgill-curl-up" },
        { code: "sit-to-stand" },
        { code: "hip-hinge-dowel" },
        { code: "graded-walking", doseNote: ["٢٠–٣٠ دقيقة يومياً أو ٥ أيّام في الأسبوع، بسرعةٍ يتكلّم فيها ولا يغنّي.",
          "20–30 minutes daily or 5 days a week, at a pace where talking is possible but not singing."] },
      ],
    },
    {
      name: ["العودةُ إلى الوظيفة والوقاية", "Return to function and prevention"],
      timeframe: ["الأسبوع ٧–١٢", "Weeks 7–12"],
      goals: [
        "حملُ الأوزان اليومية ورفعُها بثقة (كيسٌ بـ١٠ كغ، طفل)، والعودةُ الكاملة إلى العمل والهوايات، ونشاطٌ هوائيّ ١٥٠ دقيقة أسبوعياً، واستقلالٌ تامّ ببرنامج الوقاية.",
        "Confident lifting and carrying of everyday loads (a 10 kg bag, a child), full return to work and hobbies, 150 minutes of aerobic activity per week, and full independence with a prevention programme.",
      ],
      education: [
        "• خطّةُ الانتكاسة المكتوبة (تُعطى للمريض):\n" +
        "  ١. لا تخف ولا تتوقّف عن الحركة؛ الانتكاسةُ لا تعني ضرراً جديداً.\n" +
        "  ٢. خفّف كميّةَ النشاط إلى النصف يومين أو ثلاثة، لا إلى الصفر.\n" +
        "  ٣. عُد إلى تمارين المرحلة ١ والمشي القصير المتكرّر (٥–١٠ دقائق عدّة مرّات يومياً).\n" +
        "  ٤. الحرارةُ قد تريح.\n" +
        "  ٥. إن لم تتحسّن خلال أسبوعين إلى ستّة أسابيع، أو ظهرت علامةُ خطر — راجعنا.\n" +
        "• بعد التخرّج: تمارينُ القوّة مرّتين أو ثلاثاً أسبوعياً، والمشيُ أو أيُّ رياضةٍ يحبّها — فالتمارينُ المستمرّة مع التثقيف أفضلُ وقايةٍ مثبتة من عودة ألم الظهر.\n" +
        "• لا «وضعيةَ مثالية» للجلوس أو الرفع؛ أفضلُ وضعيةٍ هي التي تتغيّر.",
        "• Written flare-up plan (given to the patient):\n" +
        "  1. Do not panic or stop moving; a flare does not mean new damage.\n" +
        "  2. Halve the amount of activity for two or three days — do not drop to zero.\n" +
        "  3. Return to the phase 1 exercises and short, frequent walks (5–10 minutes several times a day).\n" +
        "  4. Heat may help.\n" +
        "  5. If there is no improvement within 2–6 weeks, or a red flag appears — come back to us.\n" +
        "• After discharge: strength exercises two to three times a week plus walking or any sport they enjoy — ongoing exercise with education is the best-proven way to prevent recurrence.\n" +
        "• There is no single perfect sitting or lifting posture; the best posture is the next one.",
      ],
      criteria: [
        "يتخرّج حين:\n" +
        "• تحقّقت أهدافُ الخطّة أو أغلبُها: تحسّن مؤشرُ أوزوستري ٣٠٪ على الأقلّ، والأنشطةُ الثلاثة في PSFS ٧ من ١٠ أو أعلى.\n" +
        "• يرفع ثقلاً من الأرض إلى الخصر (١٠–١٥ كغ أو ما يحتاجه في عمله) بنمطٍ صحيح.\n" +
        "• يؤدّي برنامجَه وحده صحيحاً، ويعرف خطّةَ الانتكاسة.\n" +
        "• يمارس نشاطاً هوائيّاً ٣٠ دقيقة ٣–٥ مرّات في الأسبوع.",
        "Discharge (graduate) when:\n" +
        "• The plan goals are met or mostly met: ODI improved by at least 30% and the three PSFS activities at 7/10 or higher.\n" +
        "• Lifts a load from floor to waist (10–15 kg or what work requires) with correct technique.\n" +
        "• Performs the programme independently and correctly and knows the flare-up plan.\n" +
        "• Does 30 minutes of aerobic activity 3–5 times a week.",
      ],
      notes: [
        "• اربط التمارين بمهامّ المريض الحقيقية: عملُه، وأطفالُه، وصلاتُه (الركوعُ والسجود حركةٌ آمنة تُتدرَّب)، ورياضتُه.\n" +
        "• قلّل الجلساتِ تدريجياً (مرّةً أسبوعياً ثمّ كلّ أسبوعين) مع زيادة استقلاله.\n" +
        "• الثقلُ يُزاد ما دامت التقنيةُ صحيحة والألمُ ضمن القاعدة.",
        "• Link exercises to the patient's real tasks: work, children, prayer (bowing and prostration are safe movements to train) and sport.\n" +
        "• Taper sessions (weekly, then fortnightly) as independence grows.\n" +
        "• Increase load as long as technique is correct and pain stays within the rule.",
      ],
      exercises: [
        { code: "cat-camel", doseNote: ["إحماءٌ: ١٠ تكرارات قبل التمارين.", "Warm-up: 10 repetitions before exercising."] },
        { code: "front-plank", doseNote: ["يزيد ٥ ثوانٍ كلّ أسبوع حتى ٣٠–٤٥ ثانية.", "Add 5 seconds per week up to 30–45 seconds."] },
        { code: "side-plank", note: ["على القدمين.", "On the feet."], doseNote: ["يزيد ٥ ثوانٍ كلّ أسبوع حتى ٣٠ ثانية.", "Add 5 seconds per week up to 30 seconds."] },
        { code: "glute-bridge", reps: 8, note: ["على ساقٍ واحدة — ٨ لكلّ ساق.", "Single-leg — 8 per leg."] },
        { code: "kettlebell-deadlift" },
        { code: "suitcase-carry" },
        { code: "split-squat" },
        { code: "graded-walking", doseNote: ["٣٠ دقيقة ٥ أيّام في الأسبوع (١٥٠ دقيقة)، أو دراجةٌ أو سباحة.",
          "30 minutes 5 days a week (150 minutes), or cycling or swimming."] },
      ],
    },
  ],
};

export const name = "119_physio_lbp_chronic_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL)].join("\n\n");
