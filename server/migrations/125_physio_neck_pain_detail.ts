// Migration 125: ألمُ الرقبة الميكانيكيّ — البروتوكولُ الثالث مفصَّلاً (§4.dh — ٢٠٢٦-١٠-١٠).
//
// طلبُ المالك: «نبدأ بالبروتوكول الذي بعده… والصورُ أنزلها حين يكون عندي وقت — ضع الاسمَ ورتّبها». فهذا الثالث بالترتيب المتّفق عليه (§4.cx)،
// **بالقالب كاملاً** (§4.dd · §4.dg): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع)، وثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ رقمية،
// واثنتا عشرةَ بطاقةً جديدة للرقبة واللوح والظهر العلويّ (وسبعَ عشرةَ صورةً مطلوبة)، والأجهزةُ بدرجة دليلها و«استعمال المركز» وإعداداتها، والبرنامجُ
// المنزليّ حتى الأسبوع الثامن وزيارةُ متابعة، والمقاييسُ كما زُرعت (NDI ودورانُ الرقبة، والألمُ لكلّ مريض). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الرقبة** (JOSPT 2017): التصنيفُ — نقصُ الحركة ومعه الصداعُ الرقبيّ المنشأ هنا، والألمُ الجذريّ والإصابةُ الارتدادية لكلٍّ بروتوكولُه؛
// وفحصُ سلامة الشرايين الرقبية قبل أيّ علاجٍ يدويّ (IFOMPT 2023)؛ وقاعدةُ الرقبة الكندية بخطواتها الثلاث بعد الرضّ (لا يُختبر الدورانُ بلا عامل أمان)؛ والعضلاتُ العميقة القابضة أساسُ البرنامج (Jull 2002).
//
// المصادر: JOSPT Neck Pain CPG 2017 · KNGF 2018 · OPTIMa 2016 · Bone and Joint Decade 2008 · Cochrane 2015 (التمارين · التحريك) · Jull 2002 و2008 ·
// IFOMPT 2023 · Canadian C-spine rule 2001 · Chow 2009 (الليزر) · Hall 2004 (اختبار الانثناء مع الدوران).
// القواعدُ في `physio_content.ts`: بطاقاتٌ لا تُمَسّ إن وُجدت، والنصوصُ لا تُكتب فوق تعديل إنسان، والمراحلُ لا تتكرّر، والخططُ المفتوحة تأخذ نسختَها.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٥ من ١٠ مقبول إن عاد إلى مستواه المعتاد قبل صباح اليوم التالي — بلا دوخةٍ ولا تنميلٍ ينزل إلى الذراع.";
const PAIN_RULE_EN = "Pain up to 5/10 during exercise is acceptable if it settles to its usual level by the next morning — with no dizziness and no tingling spreading into the arm.";

const ALTERNATE_AR = "يوماً بعد يوم في المركز — لا يومين متتاليين؛ وفي البيت مرّتين أو ثلاثاً في الأسبوع.";
const ALTERNATE_EN = "Alternate days in the clinic — never on consecutive days; two to three times a week at home.";
const WARMUP: [string, string] = ["إحماءٌ: ٥ مرّات لكلّ اتّجاه قبل التمارين.", "Warm-up: 5 repetitions in each direction before exercising."];

/** **البطاقاتُ الجديدة** — والتنفّسُ الحجابيّ والمشيُ المتدرّج من البروتوكول الأوّل (ترحيل ١١٩) برمزيهما. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "neck-arom", nameAr: "حركة الرقبة النشطة في الاتجاهات الستّة", nameEn: "Active cervical range of motion (six directions)",
    kind: "mobility", region: "cervical", sets: 1, reps: 5, hold: 2,
    purpose: ["يحافظ على حركة الرقبة ويعيدها تدريجياً، ويطمئن المريضَ أنّ الحركةَ آمنة، ويقلّل التيبّسَ الذي يأتي من تجنّب الحركة والجلوس الطويل.",
      "Maintains and gradually restores neck movement, reassures the patient that moving is safe, and reduces the stiffness that comes from avoiding movement and prolonged sitting."],
    start: ["جالسٌ على كرسيٍّ بظهرٍ مسنود، والقدمان على الأرض، والكتفان مرتخيتان، والنظرُ إلى الأمام.",
      "Sitting on a chair with the back supported, feet on the floor, shoulders relaxed, looking straight ahead."],
    steps: [[
      "انظر إلى الأسفل ببطء وقرّب الذقنَ من الصدر، ثمّ عُد إلى المنتصف.",
      "انظر إلى السقف ببطء إلى حيث يريحك، ثمّ عُد.",
      "أدِر الرأسَ لتنظر فوق كتفك الأيمن، ثمّ فوق الأيسر.",
      "أمِل الأذنَ نحو الكتف الأيمن دون رفع الكتف، ثمّ نحو الأيسر.",
      "كلُّ حركةٍ ٥ مرّات بثباتٍ ثانيتين في آخرها، ضمن المدى المريح.",
    ], [
      "Look down slowly, bringing the chin towards the chest, then return to the middle.",
      "Look up slowly towards the ceiling as far as is comfortable, then return.",
      "Turn the head to look over the right shoulder, then over the left.",
      "Tilt the ear towards the right shoulder without lifting the shoulder, then towards the left.",
      "Each movement 5 times with a 2-second hold at the end, within the comfortable range.",
    ]],
    cues: [[
      "رفعُ الكتفين أو تدويرُ الجذع مع الرأس ⟵ الكتفان مرتخيتان، والرأسُ وحده يتحرّك.",
      "حركةٌ سريعة أو دفعٌ في آخر المدى ⟵ بطيئةٌ ومتحكَّمٌ بها، والمدى يزيد مع الأيّام.",
      "حبسُ النفس أو شدُّ الفكّ ⟵ تنفّس بهدوء، والفكُّ مرتخٍ.",
    ], [
      "Shrugging the shoulders or turning the trunk with the head → shoulders relaxed, only the head moves.",
      "Fast movement or forcing the end of range → slow and controlled; the range grows over the days.",
      "Holding the breath or clenching the jaw → breathe calmly with a relaxed jaw.",
    ]],
    easier: ["مدىً أصغر، أو في الاستلقاء على الظهر والرأسُ على وسادة.", "Smaller range, or lying on the back with the head on a pillow."],
    harder: ["في الوقوف واللوحان في وضعهما، أو بثباتٍ أطول في آخر المدى (١٠ ثوانٍ) — وبعد كلّ ساعة عملٍ على الحاسوب.",
      "In standing with the shoulder blades set, or with a longer end-range hold (10 seconds) — and after every hour of computer work."],
    stopIf: ["دوخةٌ أو زغللةٌ في النظر أو غثيان، أو تنميلٌ ينزل إلى الذراع، أو ألمٌ حادّ يزداد مع التكرار — أوقف وأخبر الأخصائيّ.",
      "Dizziness, blurred vision or nausea, tingling spreading into the arm, or sharp pain that increases with repetition — stop and inform the specialist."],
    equipment: ["كرسيّ.", "Chair."],
    doseNote: ["مرّتان أو ثلاثٌ يومياً، وبعد كلّ جلوسٍ طويل.", "Two or three times daily, and after any prolonged sitting."],
    images: [
      { key: "neck-arom-1", ar: "الدوران: النظرُ فوق الكتف والكتفان ثابتتان", en: "Rotation: looking over the shoulder with the shoulders still", search: "cervical rotation exercise seated" },
      { key: "neck-arom-2", ar: "الميلُ الجانبيّ: الأذنُ نحو الكتف دون رفعه", en: "Side bending: ear towards the shoulder without lifting it", search: "neck side bend exercise seated" },
    ],
  },
  {
    code: "chin-tuck-supine", nameAr: "إيماءة الذقن في الاستلقاء (العضلات العميقة القابضة للرقبة)", nameEn: "Craniocervical flexion (supine chin nod)",
    kind: "motor_control", region: "cervical", sets: 1, reps: 10, hold: 10, rest: 10,
    purpose: ["يدرّب العضلاتِ العميقة القابضة للرقبة (Deep cervical flexors) التي تضعف وتتأخّر مع ألم الرقبة والصداع الرقبيّ المنشأ، فتسند الرقبةَ وتخفّف العبءَ عن العضلات السطحية — وهو أساسُ البرنامج (Jull 2002).",
      "Trains the deep cervical flexors, which weaken and activate late in neck pain and cervicogenic headache, so they support the neck and unload the superficial muscles — the foundation of the programme (Jull 2002)."],
    start: ["مستلقٍ على الظهر والركبتان مثنيّتان، والرأسُ على منشفةٍ مطويّة بحيث يكون الوجهُ موازياً للسقف، واللسانُ مرتخٍ خلف الأسنان العليا.",
      "Lying on the back with knees bent, the head on a folded towel so the face is parallel to the ceiling, the tongue resting behind the upper teeth."],
    steps: [[
      "أومِئ برأسك إيماءةً صغيرة كمن يقول «نعم» بهدوء: الذقنُ ينخفض قليلاً ومؤخّرةُ الرقبة تطول، والرأسُ لا يرتفع عن المنشفة.",
      "اثبت ١٠ ثوانٍ وتنفّس بشكلٍ طبيعيّ.",
      "أرخِ ببطءٍ وعُد إلى الوضع المحايد.",
      "استرح ١٠ ثوانٍ ثمّ كرّر.",
      "حتى ١٠ مرّات بثباتٍ صحيح — والجودةُ أهمّ من العدد.",
    ], [
      "Nod the head gently as if saying 'yes': the chin lowers slightly and the back of the neck lengthens, without the head lifting off the towel.",
      "Hold for 10 seconds while breathing normally.",
      "Relax slowly back to neutral.",
      "Rest 10 seconds, then repeat.",
      "Up to 10 repetitions with a correct hold — quality matters more than number.",
    ]],
    cues: [[
      "رفعُ الرأس عن المنشفة أو شدُّ العضلات الأمامية البارزة في الرقبة (القصّية الترقوية الخشّائية) ⟵ إيماءةٌ أصغر؛ ضع أصابعك على مقدّمة الرقبة لتشعر أنها مرتخية.",
      "دفعُ الرأس إلى الخلف في المنشفة أو شدُّ الفكّ ⟵ الحركةُ إيماءةٌ لا ضغط، والفكُّ مرتخٍ.",
      "حبسُ النفس ⟵ تنفّس طوال الثبات.",
    ], [
      "Lifting the head off the towel or tightening the prominent front neck muscles (sternocleidomastoid) → a smaller nod; rest your fingers on the front of the neck to feel it stay relaxed.",
      "Pushing the head back into the towel or clenching the jaw → it is a nod, not a push, with a relaxed jaw.",
      "Holding the breath → keep breathing through the hold.",
    ]],
    easier: ["ثباتٌ أقصر (٣–٥ ثوانٍ) وعددٌ أقلّ، أو إيماءةٌ أصغر.", "Shorter holds (3–5 seconds) and fewer repetitions, or a smaller nod."],
    harder: ["بجهاز الضغط الهوائيّ تحت الرقبة (Pressure biofeedback): يرتفع من ٢٠ إلى ٢٢ ثمّ ٢٤ … حتى ٣٠ ملم زئبق مع ثبات ١٠ ثوانٍ؛ ثمّ في الجلوس مستنداً إلى الحائط.",
      "With a pressure biofeedback unit under the neck: from 20 to 22, then 24 … up to 30 mmHg with 10-second holds; then in sitting against a wall."],
    stopIf: ["دوخةٌ، أو صداعٌ يزداد، أو تنميلٌ في الذراع أو الوجه.", "Dizziness, worsening headache, or tingling in the arm or face."],
    equipment: ["فرشةٌ أو سرير، ومنشفةٌ مطويّة — وجهازُ الضغط الهوائيّ في المركز إن وُجد.", "Mat or bed and a folded towel — and the pressure biofeedback unit in the clinic if available."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [
      { key: "chin-tuck-supine-1", ar: "مستلقٍ والرأسُ على منشفةٍ مطويّة، إيماءةٌ صغيرة للذقن", en: "Lying with the head on a folded towel, a small chin nod", search: "craniocervical flexion exercise supine" },
      { key: "chin-tuck-supine-2", ar: "جهازُ الضغط الهوائيّ تحت الرقبة أثناء الإيماءة", en: "Pressure biofeedback unit under the neck during the nod", search: "pressure biofeedback craniocervical flexion" },
    ],
  },
  {
    code: "cervical-retraction", nameAr: "سحب الذقن للخلف في الجلوس", nameEn: "Seated cervical retraction (chin tuck)",
    kind: "mobility", region: "cervical", sets: 1, reps: 10, hold: 2,
    purpose: ["يعيد الرأسَ فوق الكتفين بعد الجلوس الطويل والنظر إلى الشاشة أو الهاتف، ويخفّف ألمَ الرقبة عند مَن يرتاح بهذه الحركة (التفضيل الاتّجاهيّ)، ويُؤدّى في أيّ مكان.",
      "Brings the head back over the shoulders after prolonged sitting and screen or phone use, eases neck pain in those who respond to this direction (directional preference), and can be done anywhere."],
    start: ["جالسٌ منتصباً على كرسيّ، والقدمان على الأرض، والنظرُ إلى الأمام.", "Sitting upright on a chair, feet on the floor, looking straight ahead."],
    steps: [[
      "حرّك الرأسَ كلَّه إلى الخلف بخطٍّ أفقيّ كأنّك تبتعد عن شيءٍ أمام وجهك، والذقنُ يبقى أفقياً (ذقنٌ مزدوج).",
      "اذهب إلى حيث تشعر بشدٍّ مريح في مؤخّرة الرقبة، واثبت ثانيتين.",
      "عُد ببطء إلى الوضع المريح.",
      "كرّر ١٠ مرّات.",
      "يمكن أن تضع إصبعاً على الذقن تدفعه برفق لتزيد الحركةَ قليلاً في آخرها.",
    ], [
      "Move the whole head straight back horizontally, as if moving away from something in front of your face, keeping the chin level (a double chin).",
      "Go to a comfortable stretch at the back of the neck and hold for 2 seconds.",
      "Return slowly to a comfortable position.",
      "Repeat 10 times.",
      "You may place a finger on the chin and push gently to add a little range at the end.",
    ]],
    cues: [[
      "خفضُ الذقن نحو الصدر أو رفعُه نحو السقف ⟵ الحركةُ أفقيةٌ إلى الخلف، والعينان تنظران إلى الأمام.",
      "انحناءُ الظهر أو رفعُ الكتفين ⟵ اجلس منتصباً والكتفان مرتخيتان.",
      "الاستمرارُ مع ألمٍ ينزل إلى الذراع ⟵ توقّف وأخبر الأخصائيّ.",
    ], [
      "Dropping the chin to the chest or lifting it to the ceiling → the movement is straight back, eyes looking ahead.",
      "Slouching or shrugging → sit upright with relaxed shoulders.",
      "Continuing while pain spreads into the arm → stop and inform the specialist.",
    ]],
    easier: ["في الاستلقاء والرأسُ على وسادةٍ رقيقة: ادفع مؤخّرةَ الرأس نحو الوسادة برفق.", "Lying down with the head on a thin pillow: gently press the back of the head into the pillow."],
    harder: ["ثباتٌ أطول (٥–١٠ ثوانٍ)، أو السحبُ ثمّ بسطُ الرقبة لمن يناسبه بحسب الأخصائيّ (Retraction–extension).",
      "Longer holds (5–10 seconds), or retraction followed by extension for those it suits, as prescribed by the specialist."],
    stopIf: ["ألمٌ أو تنميلٌ ينتشر إلى الذراع (Peripheralisation)، أو دوخة.", "Pain or tingling spreading into the arm (peripheralisation), or dizziness."],
    equipment: ["كرسيّ.", "Chair."],
    doseNote: ["١٠ تكرارات كلّ ٢–٣ ساعات في العمل، وبعد كلّ جلوسٍ طويل أمام الشاشة.", "10 repetitions every 2–3 hours at work, and after any long spell at a screen."],
    images: [{ key: "cervical-retraction-1", ar: "من الجانب: الرأسُ مسحوبٌ للخلف والذقنُ أفقيّ", en: "Side view: the head drawn back with the chin level", search: "chin tuck exercise seated side view" }],
  },
  {
    code: "thoracic-extension-towel", nameAr: "بسط الظهر العلويّ على منشفةٍ ملفوفة", nameEn: "Thoracic extension over a towel roll",
    kind: "mobility", region: "thoracic", sets: 1, reps: 10, hold: 3,
    purpose: ["يحرّك الفقراتِ الصدرية العليا المتيبّسة من الانحناء الطويل؛ فالظهرُ العلويّ المتحرّك يخفّف العبءَ عن الرقبة ويسهّل رفعَ الذراعين — ويُكمل التحريكَ اليدويّ الصدريّ.",
      "Mobilises the upper thoracic segments stiffened by prolonged slouching; a mobile upper back unloads the neck and eases arm elevation — and complements thoracic manual therapy."],
    start: ["مستلقٍ على الظهر، ومنشفةٌ ملفوفة بإحكام (أو أسطوانةٌ إسفنجية) أفقياً تحت الظهر العلويّ عند أسفل لوحَي الكتف، والركبتان مثنيّتان، واليدان تسندان مؤخّرةَ الرأس.",
      "Lying on the back with a firmly rolled towel (or foam roller) across the upper back at the lower tips of the shoulder blades, knees bent, hands supporting the back of the head."],
    steps: [[
      "خذ نفساً، ومع الزفير اترك الظهرَ العلويّ يمتدّ فوق المنشفة ببطء والرأسُ مسنودٌ باليدين.",
      "اثبت ٣ ثوانٍ وتنفّس.",
      "عُد ببطء.",
      "كرّر ١٠ مرّات، ثمّ حرّك المنشفةَ قليلاً إلى الأعلى وكرّر.",
      "الحوضُ يبقى على الأرض طوال الوقت.",
    ], [
      "Breathe in, and as you breathe out let the upper back extend slowly over the towel with the head supported by the hands.",
      "Hold for 3 seconds and breathe.",
      "Return slowly.",
      "Repeat 10 times, then move the towel slightly higher and repeat.",
      "The pelvis stays on the floor throughout.",
    ]],
    cues: [[
      "تقوّسُ أسفل الظهر ورفعُ الحوض ⟵ الحركةُ من الظهر العلويّ، والحوضُ ثقيلٌ على الأرض.",
      "سحبُ الرأس باليدين ⟵ اليدان تسندان فقط.",
      "المنشفةُ تحت الرقبة أو أسفل الظهر ⟵ مكانُها عند اللوحين وما فوقهما.",
    ], [
      "Arching the low back and lifting the pelvis → the movement comes from the upper back; keep the pelvis heavy.",
      "Pulling the head with the hands → the hands only support.",
      "Towel under the neck or the low back → it belongs at and just above the shoulder blades.",
    ]],
    easier: ["منشفةٌ أقلّ سُمكاً، أو مدىً أصغر.", "A thinner towel, or a smaller range."],
    harder: ["الذراعان ممدودتان فوق الرأس أثناء البسط، أو على أسطوانةٍ إسفنجية أكبر.", "Arms stretched overhead during the extension, or over a larger foam roller."],
    stopIf: ["ألمٌ حادّ في الضلوع أو الصدر، أو تنميلٌ في الذراعين؛ ولا يُؤدّى مع هشاشة العظام الشديدة أو كسرٍ فقريّ سابق.",
      "Sharp rib or chest pain, or tingling in the arms; not used with severe osteoporosis or a previous vertebral fracture."],
    equipment: ["منشفةٌ كبيرة ملفوفة أو أسطوانةٌ إسفنجية، وفرشة.", "A large rolled towel or foam roller, and a mat."],
    doseNote: ["مرّةً أو مرّتين يومياً.", "Once or twice daily."],
    images: [{ key: "thoracic-extension-towel-1", ar: "مستلقٍ ومنشفةٌ ملفوفة تحت الظهر العلويّ، اليدان خلف الرأس", en: "Lying over a towel roll under the upper back, hands behind the head", search: "thoracic extension foam roller exercise" }],
  },
  {
    code: "scapular-setting", nameAr: "ضبط لوحَي الكتف (للخلف والأسفل)", nameEn: "Scapular setting (retraction and depression)",
    kind: "motor_control", region: "shoulder", sets: 2, reps: 10, hold: 5,
    purpose: ["يعلّم المريضَ وضعاً مريحاً للّوحين بعضلات الظهر الوسطى والسفلى بدل رفع الكتفين بالعضلة شبه المنحرفة العليا — وهي التي تتشنّج مع ألم الرقبة والعمل على الشاشة.",
      "Teaches a comfortable shoulder-blade position using the middle and lower back muscles instead of shrugging with the upper trapezius — the muscle that tightens with neck pain and screen work."],
    start: ["جالسٌ منتصباً أو واقفاً، والذراعان بجانب الجسم والكتفان مرتخيتان.", "Sitting upright or standing, arms by the sides, shoulders relaxed."],
    steps: [[
      "اسحب لوحَي الكتف برفق إلى الخلف ثمّ إلى الأسفل، كأنّك تضعهما في جيبَي بنطالٍ خلفيَّين.",
      "الشدُّ خفيف (نحو ثلث القوّة) — لا تعصر اللوحين معاً.",
      "اثبت ٥ ثوانٍ وتنفّس، والرقبةُ مرتخية.",
      "أرخِ ببطء.",
      "كرّر ١٠ مرّات.",
    ], [
      "Gently draw the shoulder blades back and then down, as if sliding them into your back trouser pockets.",
      "Use a light effort (about a third) — do not squeeze the blades together.",
      "Hold for 5 seconds and breathe, keeping the neck relaxed.",
      "Release slowly.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "رفعُ الكتفين نحو الأذنين ⟵ الحركةُ إلى الأسفل والخلف.",
      "تقوّسُ أسفل الظهر وبروزُ الصدر ⟵ الحركةُ من اللوحين وحدهما.",
      "شدٌّ قويّ يتعب سريعاً ⟵ شدٌّ خفيفٌ يُحتمل طويلاً.",
    ], [
      "Shrugging towards the ears → the movement is down and back.",
      "Arching the low back and pushing the chest out → only the shoulder blades move.",
      "A strong squeeze that tires quickly → a light effort you can sustain.",
    ]],
    easier: ["في الانبطاح والذراعان بجانب الجسم، أو مع لمسة الأخصائيّ على اللوحين.", "Lying prone with the arms by the sides, or with the specialist's touch on the shoulder blades."],
    harder: ["مع رفعٍ أماميّ بطيء للذراعين واللوحان ثابتان، أو أثناء العمل على الحاسوب كلّ ٣٠ دقيقة.", "With a slow forward arm raise while the blades stay set, or during computer work every 30 minutes."],
    stopIf: ["ألمٌ في الكتف أو تنميلٌ في الذراع.", "Shoulder pain or tingling in the arm."],
    equipment: ["كرسيّ.", "Chair."],
    doseNote: ["مرّتان يومياً، وأثناء العمل.", "Twice daily, and during work."],
    images: [{ key: "scapular-setting-1", ar: "من الخلف: اللوحان مسحوبان للخلف والأسفل", en: "From behind: shoulder blades drawn back and down", search: "scapular retraction depression exercise" }],
  },
  {
    code: "self-snag-rotation", nameAr: "تحريك الرقبة الذاتيّ بالمنشفة للدوران (SNAG)", nameEn: "Self-SNAG for cervical rotation (towel)",
    kind: "mobility", region: "cervical", sets: 1, reps: 6, hold: 3, perSide: true,
    purpose: ["لمن عنده نقصٌ في دوران الرقبة أو صداعٌ رقبيّ المنشأ (Cervicogenic headache) بخللٍ في الفقرة العليا: المنشفةُ تثبّت الفقرةَ وتسهّل انزلاقَها أثناء الدوران فيزيد المدى بلا ألم — يعلّمه الأخصائيّ أوّلاً ثمّ يؤدّيه المريضُ في البيت.",
      "For limited rotation or cervicogenic headache from an upper cervical dysfunction: the towel guides the segment's glide during rotation so range increases without pain — taught by the specialist first, then performed at home."],
    start: ["جالسٌ منتصباً، ومنشفةٌ صغيرة (أو حزام) حول مؤخّرة الرقبة عند المستوى الذي يحدّده الأخصائيّ (للفقرة العليا: تحت قاعدة الجمجمة مباشرة)، تمسك طرفيها باليدين.",
      "Sitting upright with a small towel (or strap) around the back of the neck at the level the specialist identifies (for the upper segment: just below the base of the skull), holding both ends."],
    steps: [[
      "للدوران إلى اليمين: أمسك الطرفَ الأيسر للمنشفة ممتدّاً أمام الوجه، والطرفَ الأيمن مثبَّتاً عند الصدر.",
      "اسحب الطرفَ الأيسر برفقٍ نحو الأمام باتّجاه العين، فيدفع الفقرةَ في اتّجاه الحركة.",
      "أدِر الرأسَ ببطءٍ إلى اليمين مع إبقاء السحب حتى آخر المدى المريح.",
      "اثبت ٣ ثوانٍ، ثمّ عُد إلى المنتصف وأنت ما زلت تسحب، ثمّ أرخِ.",
      "٦ تكرارات للجهة المحدودة — والحركةُ بلا ألمٍ دائماً.",
    ], [
      "To rotate right: hold the left end of the towel stretched across the front of the face and anchor the right end at the chest.",
      "Gently pull the left end forwards towards the eye, guiding the segment in the direction of movement.",
      "Turn the head slowly to the right while keeping the pull, to the end of the comfortable range.",
      "Hold for 3 seconds, return to the middle while still pulling, then release.",
      "6 repetitions to the limited side — always pain-free.",
    ]],
    cues: [[
      "ألمٌ أثناء الحركة ⟵ غيّر مستوى المنشفة أو اتّجاهَ السحب قليلاً؛ هذه التقنيةُ يجب أن تكون بلا ألم.",
      "إمالةُ الرأس أو حنيُه مع الدوران ⟵ دورانٌ خالصٌ والنظرُ أفقيّ.",
      "إفلاتُ السحب في العودة ⟵ يبقى السحبُ حتى يعود الرأسُ إلى المنتصف.",
    ], [
      "Pain during the movement → adjust the towel level or the pull direction slightly; the technique must be pain-free.",
      "Tilting or bending the head while turning → pure rotation with the eyes level.",
      "Letting go of the pull on the way back → keep pulling until the head is back in the middle.",
    ]],
    easier: ["مدىً أصغر، وبتوجيه الأخصائيّ في المركز أوّلاً.", "A smaller range, guided by the specialist in the clinic first."],
    harder: ["ثباتٌ أطول، أو بالتقنية نفسِها للميل الجانبيّ بحسب الأخصائيّ.", "Longer holds, or the same technique for side bending as prescribed by the specialist."],
    stopIf: ["دوخةٌ أو زغللةٌ أو غثيان أو تنميلٌ في الوجه أو الذراع، أو ألمٌ أثناء الحركة — أوقف فوراً.",
      "Dizziness, blurred vision, nausea, numbness in the face or arm, or pain during the movement — stop immediately."],
    equipment: ["منشفةٌ صغيرة أو حزامٌ قماشيّ.", "A small towel or a fabric strap."],
    doseNote: ["مرّتان يومياً — للجهة المحدودة وحدها، وبعد أن يعلّمه الأخصائيّ.", "Twice daily — to the limited side only, after the specialist has taught it."],
    images: [{ key: "self-snag-rotation-1", ar: "منشفةٌ حول مؤخّرة الرقبة، طرفٌ يُسحب أمام الوجه والرأسُ يدور", en: "Towel around the back of the neck, one end pulled across the face as the head turns", search: "self snag cervical rotation towel" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "upper-trap-stretch", nameAr: "تمطيط العضلة شبه المنحرفة العليا", nameEn: "Upper trapezius stretch",
    kind: "stretch", region: "cervical", sets: 1, reps: 3, hold: 30, perSide: true,
    purpose: ["يُرخي العضلةَ شبهَ المنحرفة العليا التي تشتدّ وتؤلم مع الجلوس الطويل والضغط النفسيّ وألم الرقبة.",
      "Relaxes the upper trapezius, which tightens and aches with prolonged sitting, stress and neck pain."],
    start: ["جالسٌ منتصباً، ويدُ الجهة المراد تمطيطُها تمسك حافّةَ الكرسيّ تحت الورك لتثبيت الكتف.",
      "Sitting upright, the hand on the side to be stretched holding the edge of the chair beside the hip to anchor the shoulder."],
    steps: [[
      "أمِل الرأسَ نحو الكتف المقابل (الأذنُ نحو الكتف).",
      "أدِر الوجهَ قليلاً بعيداً عن الجهة المُمطَّطة.",
      "ضع اليدَ الأخرى فوق الرأس واتركها تزيد الميلَ برفقٍ شديد حتى تشعر بشدٍّ مريح على جانب الرقبة وأعلى الكتف.",
      "اثبت ٣٠ ثانيةً وتنفّس ببطء.",
      "عُد ببطء، وكرّر بالجهة الأخرى.",
    ], [
      "Tilt the head towards the opposite shoulder (ear towards shoulder).",
      "Turn the face slightly away from the side being stretched.",
      "Rest the other hand on top of the head and let it add a very gentle tilt until a comfortable stretch is felt along the side of the neck and top of the shoulder.",
      "Hold for 30 seconds, breathing slowly.",
      "Return slowly and repeat on the other side.",
    ]],
    cues: [[
      "رفعُ الكتف المُمطَّطة ⟵ الكتفُ ثابتةٌ إلى الأسفل باليد على الكرسيّ.",
      "السحبُ بقوّة حتى الألم ⟵ شدٌّ مريحٌ لا مؤلم، واليدُ ثِقلٌ لا سحب.",
      "إمالةُ الجذع مع الرأس ⟵ الجذعُ منتصب.",
    ], [
      "The stretched shoulder lifting → keep it down by holding the chair.",
      "Pulling hard into pain → a comfortable stretch; the hand is a weight, not a pull.",
      "Leaning the trunk with the head → keep the trunk upright.",
    ]],
    easier: ["بلا يدٍ فوق الرأس — الميلُ وحده.", "Without the hand on the head — the tilt alone."],
    harder: ["ثباتٌ ٤٥ ثانية، أو مع زفيرٍ بطيء وإرخاءٍ أعمق في آخر كلّ نفس.", "A 45-second hold, or a slow exhale with deeper relaxation at the end of each breath."],
    stopIf: ["تنميلٌ أو ألمٌ ينزل إلى الذراع، أو دوخة.", "Tingling or pain spreading into the arm, or dizziness."],
    equipment: ["كرسيّ.", "Chair."],
    doseNote: ["مرّتان يومياً، وبعد العمل على الشاشة.", "Twice daily, and after screen work."],
    images: [{ key: "upper-trap-stretch-1", ar: "الأذنُ نحو الكتف المقابل، يدٌ على الرأس ويدٌ تمسك الكرسيّ", en: "Ear towards the opposite shoulder, one hand on the head, the other holding the chair", search: "upper trapezius stretch seated" }],
  },
  {
    code: "levator-scapulae-stretch", nameAr: "تمطيط العضلة الرافعة للوح الكتف", nameEn: "Levator scapulae stretch",
    kind: "stretch", region: "cervical", sets: 1, reps: 3, hold: 30, perSide: true,
    purpose: ["يُرخي العضلةَ الرافعة للوح الكتف التي تؤلم عند زاوية الرقبة والكتف وتحدّ من الدوران — وكثيراً ما تكون مصدرَ «العقدة» في أعلى اللوح.",
      "Relaxes the levator scapulae, which aches at the angle of the neck and shoulder and limits rotation — often the source of the 'knot' at the top of the shoulder blade."],
    start: ["جالسٌ منتصباً، ويدُ الجهة المراد تمطيطُها تمسك حافّةَ الكرسيّ خلف الورك.", "Sitting upright, the hand on the side to be stretched holding the edge of the chair behind the hip."],
    steps: [[
      "أدِر الوجهَ نحو الإبط المقابل (بزاوية ٤٥° تقريباً).",
      "انظر إلى الأسفل نحو ذلك الإبط كأنّك تشمّه.",
      "ضع اليدَ الأخرى على مؤخّرة الرأس واتركها تزيد الحركةَ بوزنها برفق.",
      "اثبت ٣٠ ثانيةً وتنفّس، حتى تشعر بشدٍّ مريح من مؤخّرة الرقبة إلى أعلى لوح الكتف.",
      "عُد ببطء، وكرّر بالجهة الأخرى.",
    ], [
      "Turn the face towards the opposite armpit (about 45°).",
      "Look down towards that armpit as if smelling it.",
      "Place the other hand on the back of the head and let its weight gently add to the movement.",
      "Hold for 30 seconds and breathe, until a comfortable stretch is felt from the back of the neck to the top of the shoulder blade.",
      "Return slowly and repeat on the other side.",
    ]],
    cues: [[
      "رفعُ الكتف ⟵ الكتفُ ثابتةٌ بالإمساك بالكرسيّ.",
      "حنيُ الظهر كلِّه ⟵ الجذعُ منتصب، والحركةُ من الرقبة.",
      "سحبٌ قويّ باليد ⟵ وزنُ اليد يكفي.",
    ], [
      "The shoulder lifting → anchor it by holding the chair.",
      "Bending the whole back → keep the trunk upright; the movement is in the neck.",
      "Pulling hard with the hand → the weight of the hand is enough.",
    ]],
    easier: ["مدىً أقلّ، بلا يدٍ على الرأس.", "A smaller range, without the hand on the head."],
    harder: ["ثباتٌ ٤٥ ثانية، أو مع وضع يد الجهة المُمطَّطة خلف الرأس والمرفقُ إلى الأعلى ليدور اللوح.",
      "A 45-second hold, or with the hand of the stretched side behind the head and the elbow pointing up to rotate the shoulder blade."],
    stopIf: ["تنميلٌ في الذراع، أو دوخة، أو ألمٌ حادّ.", "Tingling in the arm, dizziness, or sharp pain."],
    equipment: ["كرسيّ.", "Chair."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [{ key: "levator-scapulae-stretch-1", ar: "الوجهُ نحو الإبط المقابل، يدٌ على مؤخّرة الرأس", en: "Face turned towards the opposite armpit, one hand on the back of the head", search: "levator scapulae stretch seated" }],
  },
  {
    code: "cervical-isometrics", nameAr: "تمارين الرقبة الثابتة (المقاومة باليد في الاتجاهات الأربعة)", nameEn: "Cervical isometrics (hand resistance, four directions)",
    kind: "strength", region: "cervical", sets: 1, reps: 5, hold: 10, rest: 10,
    purpose: ["يقوّي عضلاتِ الرقبة بلا حركةٍ ولا ألم، فيبني تحمّلَها وثقةَ المريض بها قبل التقوية بالحركة.",
      "Strengthens the neck muscles without movement or pain, building their endurance and the patient's confidence before dynamic strengthening."],
    start: ["جالسٌ منتصباً، والرأسُ في الوضع المحايد بعد إيماءةٍ خفيفة للذقن.", "Sitting upright with the head in neutral after a light chin nod."],
    steps: [[
      "ضع كفّك على الجبهة، وادفع الرأسَ إلى الأمام في الكفّ بقوّةٍ خفيفة إلى متوسّطة (نحو ٣٠–٥٠٪) دون أن يتحرّك الرأس.",
      "اثبت ١٠ ثوانٍ وتنفّس، ثمّ أرخِ ببطء.",
      "كرّر والكفُّ خلف الرأس (الدفعُ إلى الخلف).",
      "ثمّ والكفُّ على جانب الرأس فوق الأذن (الدفعُ جانباً) لكلّ جهة.",
      "٥ مرّات لكلّ اتّجاه.",
    ], [
      "Place your palm on the forehead and push the head forwards into the palm with light to moderate effort (about 30–50%) without the head moving.",
      "Hold for 10 seconds and breathe, then release slowly.",
      "Repeat with the palm behind the head (pushing backwards).",
      "Then with the palm on the side of the head above the ear (pushing sideways), each side.",
      "5 repetitions in each direction.",
    ]],
    cues: [[
      "حركةُ الرأس ⟵ الكفُّ تقاوم بالقوّة نفسِها، فلا يتحرّك شيء.",
      "قوّةٌ كبيرة أو بدايةٌ مفاجئة ⟵ تبدأ الدفعةُ بالتدريج وتنتهي بالتدريج.",
      "حبسُ النفس ورفعُ الكتفين ⟵ تنفّس، والكتفان مرتخيتان.",
    ], [
      "The head moving → the hand resists with equal force so nothing moves.",
      "A big or sudden effort → build the push up gradually and release it gradually.",
      "Holding the breath or shrugging → breathe, with the shoulders relaxed.",
    ]],
    easier: ["قوّةٌ أقلّ (٢٠٪) وثباتٌ ٥ ثوانٍ.", "Less effort (20%) and 5-second holds."],
    harder: ["قوّةٌ أكبر، أو بالمطّاط حول الرأس مع حركةٍ صغيرة (تقويةٌ ديناميكية) بحسب الأخصائيّ.", "More effort, or a band around the head with small movements (dynamic strengthening) as prescribed by the specialist."],
    stopIf: ["صداعٌ أو دوخة، أو ألمٌ يزيد على ٥ من ١٠، أو تنميلٌ في الذراع؛ ويُتجنّب مع ضغط الدم غير المضبوط.",
      "Headache or dizziness, pain above 5/10, or tingling in the arm; avoid with uncontrolled blood pressure."],
    equipment: ["لا شيء.", "None."],
    doseNote: ["مرّةً يومياً.", "Once daily."],
    images: [
      { key: "cervical-isometrics-1", ar: "الكفُّ على الجبهة تقاوم دفعَ الرأس إلى الأمام", en: "Palm on the forehead resisting the head pushing forwards", search: "cervical isometric flexion exercise" },
      { key: "cervical-isometrics-2", ar: "الكفُّ على جانب الرأس تقاوم الدفعَ الجانبيّ", en: "Palm on the side of the head resisting a sideways push", search: "cervical isometric side bending exercise" },
    ],
  },
  {
    code: "band-row", nameAr: "سحب المطّاط للخلف (التجديف)", nameEn: "Resistance band row",
    kind: "strength", region: "thoracic", sets: 3, reps: 12, rest: 45,
    purpose: ["يقوّي عضلاتِ الظهر العلويّ بين اللوحين (شبه المنحرفة الوسطى والمعيّنية) التي تسند الكتفين والرقبة، ويقاوم الانحناءَ الطويل إلى الأمام.",
      "Strengthens the upper-back muscles between the shoulder blades (middle trapezius and rhomboids) that support the shoulders and neck, countering prolonged forward slouching."],
    start: ["واقفٌ أو جالس، والمطّاطُ مثبَّتٌ أمامك بمستوى الصدر (مقبضُ بابٍ أو عمود)، تمسك طرفيه والذراعان ممدودتان أمامك.",
      "Standing or sitting with the band anchored in front at chest height (a door handle or post), holding both ends with the arms straight in front."],
    steps: [[
      "اضبط اللوحين للخلف والأسفل أوّلاً.",
      "اسحب المطّاطَ نحو جانبي الصدر بثني المرفقين، والمرفقان قريبان من الجسم.",
      "اثبت ثانيتين وأنت تقرّب اللوحين من بعضهما.",
      "عُد ببطءٍ في ٣ ثوانٍ دون أن يُفلت المطّاط.",
      "١٢ تكراراً، ٣ مجموعات.",
    ], [
      "Set the shoulder blades back and down first.",
      "Pull the band towards the sides of the chest by bending the elbows, keeping them close to the body.",
      "Hold for 2 seconds as the shoulder blades draw together.",
      "Return slowly over 3 seconds without letting the band snap back.",
      "12 repetitions, 3 sets.",
    ]],
    cues: [[
      "رفعُ الكتفين نحو الأذنين ⟵ الكتفان إلى الأسفل طوال الحركة.",
      "دفعُ الرأس إلى الأمام أو تقويسُ الظهر ⟵ الرأسُ فوق الكتفين والجذعُ ثابت.",
      "سحبٌ سريع وعودةٌ مرتدّة ⟵ عودةٌ بطيئةٌ متحكَّمٌ بها.",
    ], [
      "Shrugging towards the ears → shoulders down throughout.",
      "Poking the head forwards or arching the back → head over the shoulders, trunk still.",
      "A fast pull and a snapping return → a slow, controlled return.",
    ]],
    easier: ["مطّاطٌ أخفّ، أو بلا مطّاط (سحبُ اللوحين وحده).", "A lighter band, or no band (shoulder-blade squeeze alone)."],
    harder: ["مطّاطٌ أقوى، أو بيدٍ واحدة بالتناوب، أو بثقلٍ مع الانحناء من الورك.", "A stronger band, single-arm alternating, or with a weight in a hip-hinge position."],
    stopIf: ["ألمٌ في الكتف أو تنميلٌ في الذراع، أو ألمٌ في الرقبة يزيد على ٥ من ١٠.", "Shoulder pain or tingling in the arm, or neck pain above 5/10."],
    equipment: ["مطّاطُ مقاومة ونقطةُ تثبيت.", "A resistance band and an anchor point."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [
      { key: "band-row-1", ar: "البداية: الذراعان ممدودتان أمامك والمطّاطُ مشدود", en: "Start: arms straight in front with the band taut", search: "resistance band row start position" },
      { key: "band-row-2", ar: "النهاية: المرفقان خلف الجسم واللوحان متقاربان", en: "Finish: elbows behind the body, shoulder blades drawn together", search: "resistance band row finish position" },
    ],
  },
  {
    code: "prone-y-t", nameAr: "رفع الذراعين بشكل T ثمّ Y في الانبطاح", nameEn: "Prone T and Y raises",
    kind: "strength", region: "thoracic", sets: 2, reps: 10, hold: 2, rest: 45,
    purpose: ["يقوّي شبهَ المنحرفة الوسطى والسفلى التي تضبط اللوحَ وتسند الرقبة — وتضعف كثيراً مع ألم الرقبة المزمن.",
      "Strengthens the middle and lower trapezius, which control the shoulder blade and support the neck — and are often weak in chronic neck pain."],
    start: ["منبطحٌ على السرير أو الفرشة، والجبهةُ على منشفةٍ مطويّة والذقنُ مسحوبٌ قليلاً، والذراعان متدلّيتان على جانبي السرير (أو ممدودتان جانباً على الأرض).",
      "Lying prone on a bed or mat with the forehead on a folded towel and the chin slightly tucked, arms hanging over the sides of the bed (or out to the sides on the floor)."],
    steps: [[
      "T: الذراعان جانباً بزاويةٍ قائمة مع الجسم والإبهامان إلى الأعلى؛ ارفعهما قليلاً بتقريب اللوحين، واثبت ثانيتين، ثمّ أنزِل ببطء.",
      "كرّر ١٠ مرّات.",
      "Y: الذراعان إلى الأمام بزاوية ١٢٠° تقريباً (شكلُ Y) والإبهامان إلى الأعلى؛ ارفعهما قليلاً بسحب اللوحين للأسفل، واثبت ثانيتين، ثمّ أنزِل.",
      "كرّر ١٠ مرّات.",
      "الرأسُ يبقى على المنشفة — لا يرتفع.",
    ], [
      "T: arms out to the sides at right angles with the thumbs up; lift them slightly by drawing the shoulder blades together, hold 2 seconds, then lower slowly.",
      "Repeat 10 times.",
      "Y: arms forwards at about 120° (a Y shape) with the thumbs up; lift them slightly by drawing the shoulder blades down, hold 2 seconds, then lower.",
      "Repeat 10 times.",
      "The head stays on the towel — it does not lift.",
    ]],
    cues: [[
      "رفعُ الرأس أو تقويسُ الرقبة ⟵ الجبهةُ على المنشفة والنظرُ إلى الأرض.",
      "رفعُ الكتفين نحو الأذنين ⟵ اللوحان إلى الأسفل والخلف أوّلاً.",
      "رفعٌ عالٍ بتأرجح ⟵ رفعٌ صغيرٌ بطيءٌ بثبات.",
    ], [
      "Lifting the head or arching the neck → forehead on the towel, eyes to the floor.",
      "Shrugging towards the ears → set the shoulder blades down and back first.",
      "A high, swinging lift → a small, slow, controlled lift.",
    ]],
    easier: ["T وحده بذراعين مثنيّتين، أو في الوقوف والصدرُ مستندٌ إلى حائطٍ مائل.", "T only with bent arms, or standing with the chest supported on an inclined wall."],
    harder: ["ثقلٌ خفيف (٠٫٥–١ كغ) في كلّ يد، أو ثباتٌ أطول.", "A light weight (0.5–1 kg) in each hand, or longer holds."],
    stopIf: ["ألمٌ في الكتف (خاصّةً في Y)، أو ألمٌ في الرقبة، أو تنميلٌ في الذراع.", "Shoulder pain (especially in Y), neck pain, or tingling in the arm."],
    equipment: ["سريرٌ أو فرشة، ومنشفة، وأثقالٌ خفيفة اختيارياً.", "A bed or mat, a towel, and optional light weights."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [
      { key: "prone-y-t-1", ar: "منبطحٌ والذراعان جانباً بشكل T مرفوعتان قليلاً", en: "Prone with the arms out to the sides in a T, slightly lifted", search: "prone T raise exercise" },
      { key: "prone-y-t-2", ar: "منبطحٌ والذراعان أماماً بشكل Y", en: "Prone with the arms forwards in a Y", search: "prone Y raise lower trapezius" },
    ],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "deep-neck-flexor-endurance", nameAr: "رفع الرأس مع إيماءة الذقن (تحمّل العضلات العميقة)", nameEn: "Deep neck flexor endurance (head lift with chin nod)",
    kind: "endurance", region: "cervical", sets: 1, reps: 5, hold: 10, rest: 20,
    purpose: ["المرحلةُ التالية لإيماءة الذقن: تحمّلُ العضلات القابضة العميقة مع السطحية في رفع الرأس، وهو ما تحتاجه الرقبةُ طوال اليوم.",
      "The next step after the chin nod: endurance of the deep and superficial neck flexors together in lifting the head — what the neck needs all day."],
    start: ["مستلقٍ على الظهر، والركبتان مثنيّتان، والذراعان بجانب الجسم.", "Lying on the back with knees bent and arms by the sides."],
    steps: [[
      "أومِئ بالذقن إيماءةً صغيرة (كتمرين الإيماءة).",
      "مع إبقاء الإيماءة، ارفع الرأسَ عن الأرض نحو ٢–٣ سم فقط.",
      "اثبت ١٠ ثوانٍ وتنفّس، والذقنُ ما زال مسحوباً.",
      "أنزِل الرأسَ ببطء ثمّ أرخِ الإيماءة.",
      "استرح ٢٠ ثانية، وكرّر ٥ مرّات.",
    ], [
      "Make a small chin nod (as in the nod exercise).",
      "Keeping the nod, lift the head 2–3 cm off the floor only.",
      "Hold for 10 seconds and breathe, with the chin still tucked.",
      "Lower the head slowly, then release the nod.",
      "Rest 20 seconds and repeat 5 times.",
    ]],
    cues: [[
      "الذقنُ يندفع إلى الأمام عند الرفع ⟵ الإيماءةُ أوّلاً وتبقى طوال الثبات.",
      "رفعٌ عالٍ أو ارتجافٌ في الرقبة ⟵ ارفع أقلّ واثبت أقصر.",
      "حبسُ النفس ⟵ تنفّس.",
    ], [
      "The chin poking forwards on lifting → nod first and keep it throughout the hold.",
      "Lifting high or the neck shaking → lift less and hold for less time.",
      "Holding the breath → breathe.",
    ]],
    easier: ["على سطحٍ مائل (مسندٌ مرفوع ٢٠–٣٠°) يقلّل وزنَ الرأس، أو ثباتٌ ٥ ثوانٍ.", "On an inclined surface (back rest raised 20–30°) to reduce the head's weight, or 5-second holds."],
    harder: ["ثباتٌ يزيد ٥ ثوانٍ كلّ جلستين أو ثلاث حتى ٣٠ ثانية، أو دورانٌ بطيء للرأس وهو مرفوع.", "Increase the hold by 5 seconds every two or three sessions up to 30 seconds, or slow head turns while lifted."],
    stopIf: ["صداعٌ أو دوخةٌ أو ألمٌ حادّ في الرقبة، أو تنميلٌ في الذراع.", "Headache, dizziness, sharp neck pain, or tingling in the arm."],
    equipment: ["فرشة.", "Mat."],
    doseNote: ["مرّةً يومياً.", "Once daily."],
    images: [{ key: "deep-neck-flexor-endurance-1", ar: "مستلقٍ والذقنُ مسحوبٌ والرأسُ مرفوعٌ قليلاً عن الأرض", en: "Lying with the chin tucked and the head lifted slightly off the floor", search: "deep neck flexor endurance exercise" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "neck-pain-mechanical-adult",
  summary: [
    "ألمُ الرقبة الميكانيكيّ غيرُ النوعيّ مع نقصٍ في الحركة (Neck pain with mobility deficits) — حادّاً (أقلّ من ٦ أسابيع) أو تحت الحادّ أو مزمناً (أكثر من ١٢ أسبوعاً) — بلا ألمٍ جذريّ في الذراع، ولا إصابةٍ ارتدادية حديثة، ولا علامات خطر؛ ويدخل فيه الصداعُ الرقبيّ المنشأ (Cervicogenic headache) حين يصاحبه. " +
    "وهو من أكثر أسباب سنوات العيش مع الإعاقة في العالم، ويرتبط بالجلوس الطويل أمام الشاشة وقلّة الحركة والضغط النفسيّ والنوم — والوضعيةُ وحدها لا تفسّره. " +
    "الأساسُ تمارينُ العضلات العميقة القابضة للرقبة وعضلات اللوح والظهر العلويّ مع التحريك اليدويّ للظهر الصدريّ والرقبة والتعليم، ثمّ التقويةُ والتحمّل وبرنامجٌ منزليّ يمنع العودة. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة؛ والألمُ الجذريّ في الذراع والإصابةُ الارتدادية لكلٍّ منهما بروتوكولُه.",
    "Non-specific mechanical neck pain with mobility deficits — acute (under 6 weeks), subacute or chronic (over 12 weeks) — without radicular arm pain, a recent whiplash injury or red flags; cervicogenic headache is included when it accompanies the neck pain. " +
    "It is among the leading causes of years lived with disability worldwide and is linked to prolonged screen time, inactivity, stress and sleep — posture alone does not explain it. " +
    "The core of care is deep cervical flexor, scapular and upper-back exercise with thoracic and cervical manual therapy and education, followed by strengthening, endurance and a home programme that prevents recurrence. " +
    "The programme runs in three phases with session ranges and written progression criteria; radicular arm pain and whiplash each have their own protocol.",
  ],
  goals: [
    "١. خفضُ مؤشر إعاقة الرقبة (NDI) ٧٫٥ نقاطٍ على الأقلّ من ٥٠، أو ٣٠٪ من قيمته الأولى.\n" +
    "٢. خفضُ الألم (NPRS) نقطتين على الأقلّ أو ٣٠٪، ونقصٌ واضح في تكرار الصداع وشدّته إن وُجد.\n" +
    "٣. دورانُ الرقبة ٧٠° على الأقلّ لكلّ جهة، أو متماثلٌ بفرقٍ لا يتجاوز ١٠°.\n" +
    "٤. تحمّلُ العضلات العميقة القابضة: إيماءةُ الذقن ١٠ × ١٠ ثوانٍ بلا تعويض، ورفعُ الرأس معها ٢٠–٣٠ ثانية.\n" +
    "٥. العملُ ساعةً أو أكثر على الشاشة باستراحاتٍ قصيرة بلا نوبة ألم، والعودةُ إلى الأنشطة الثلاثة التي اختارها المريض (PSFS ٧ من ١٠ أو أكثر).\n" +
    "٦. استقلالُ المريض ببرنامجٍ منزليّ، وتغييراتٌ في بيئة العمل والنوم، وخطّةٌ مكتوبة للانتكاسة قبل التخرّج.",
    "1. Reduce the Neck Disability Index (NDI) by at least 7.5 of 50 points, or 30% of baseline.\n" +
    "2. Reduce pain (NPRS) by at least 2 points or 30%, with a clear fall in headache frequency and intensity if present.\n" +
    "3. Cervical rotation of at least 70° to each side, or symmetric within 10°.\n" +
    "4. Deep cervical flexor endurance: chin nod 10 × 10 seconds without substitution, and the head lift with the nod for 20–30 seconds.\n" +
    "5. Work an hour or more at a screen with short breaks without a pain flare, and return to the three activities chosen at baseline (PSFS ≥ 7/10).\n" +
    "6. An independent home programme, changes to work and sleep set-up, and a written flare-up plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين أو تحريك):\n" +
    "• فرزُ علامات الخطر — انظر «موانع الاستعمال» — وفحصُ سلامة الشرايين الرقبية قبل أيّ علاجٍ يدويّ للرقبة بإطار IFOMPT: القصّةُ (صداعٌ حديثٌ غيرُ معتاد، دوخة، أعراضٌ عصبية) وعواملُ الخطر الوعائية وضغطُ الدم؛ والاختبارُ الوضعيّ وحده لا يكفي ولا ينفي.\n" +
    "• التصنيف (JOSPT 2017): نقصُ الحركة ⟵ هذا البروتوكول · مع صداعٍ رقبيّ المنشأ ⟵ هذا البروتوكول بتركيزٍ على الفقرات العليا · مع ضعف تنسيق الحركة بعد إصابةٍ ارتدادية ⟵ بروتوكولُ الإصابة الارتدادية · مع ألمٍ ينتشر إلى الذراع ⟵ بروتوكولُ الاعتلال الجذريّ العنقيّ (عنقودُ Wainner: اختبارُ Spurling، والتباعد، واختبارُ شدّ العصب ULTT A، والدورانُ أقلّ من ٦٠°). والمرحلة: حادّ · تحت الحادّ · مزمن.\n" +
    "• العواملُ النفسية والاجتماعية: الخوفُ من الحركة، والتهويلُ من الألم، والضغطُ في العمل، والنومُ والوسادة، وساعاتُ الشاشة والهاتف.\n" +
    "• المقاييس: الألمُ الآن وأسوأُه في الأسبوع (NPRS)، ومؤشرُ إعاقة الرقبة (NDI من ٥٠)، ومقياسُ الوظيفة الخاصّ بالمريض (PSFS: ثلاثةُ أنشطة، كلٌّ ٠–١٠)، وتكرارُ الصداع وشدّتُه إن وُجد.\n" +
    "• الفحص: مدى الحركة بالدرجات (الدورانُ لكلّ جهة)؛ واختبارُ الانثناء القحفيّ العنقيّ (Craniocervical flexion test) بجهاز الضغط الهوائيّ — من ٢٢ إلى ٣٠ ملم زئبق بلا تعويض؛ وتحمّلُ القابضات العميقة برفع الرأس مع الإيماءة بالثواني؛ واختبارُ الانثناء مع الدوران (Flexion-rotation test) لمن عنده صداع — أقلّ من ٣٢° أو فرقُ ١٠° بين الجهتين يرجّح خللاً في الفقرة العليا (C1–C2)؛ وحركةُ الفقرات الرقبية والصدرية؛ ووضعُ اللوحين وتحكّمُهما؛ والفحصُ العصبيّ للذراعين إن وُجد تنميل.\n" +
    "إعادةُ التقييم: سؤالٌ وفحصٌ قصير في كلّ جلسة (ما الذي تغيّر منذ الجلسة الماضية؟)، والمقاييسُ كاملةً عند الجلسة الثامنة تقريباً وعند الجلسة الأخيرة وفي زيارة المتابعة بعد التخرّج بأربعة أسابيع. ومَن لم يتحسّن بعد ٦–٨ جلسات: إعادةُ التصنيف وفرزُ علامات الخطر والعوامل النفسية؛ وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.",
    "Initial assessment (before any exercise or manual therapy):\n" +
    "• Red-flag screen — see Contraindications — and a cervical arterial screen before any manual therapy to the neck using the IFOMPT framework: history (recent unusual headache, dizziness, neurological symptoms), vascular risk factors and blood pressure; positional testing alone neither rules in nor rules out.\n" +
    "• Classification (JOSPT 2017): mobility deficits → this protocol · with cervicogenic headache → this protocol with an upper cervical focus · with movement coordination impairments after whiplash → the whiplash protocol · with radiating arm pain → the cervical radiculopathy protocol (Wainner cluster: Spurling's test, distraction, ULTT A, rotation under 60°). Stage: acute · subacute · chronic.\n" +
    "• Psychosocial factors: fear of movement, catastrophising, work stress, sleep and pillow, screen and phone time.\n" +
    "• Measures: current and worst pain in the past week (NPRS), Neck Disability Index (NDI, /50), Patient-Specific Functional Scale (PSFS: three activities, each 0–10), and headache frequency and intensity if present.\n" +
    "• Examination: range of motion in degrees (rotation to each side); the craniocervical flexion test with a pressure biofeedback unit — 22 to 30 mmHg without substitution; deep flexor endurance (head lift with the nod) in seconds; the flexion-rotation test for headache — under 32° or a 10° side-to-side difference suggests upper cervical (C1–C2) dysfunction; cervical and thoracic segmental mobility; scapular position and control; and an upper-limb neurological screen if there is tingling.\n" +
    "Reassessment: brief questions and re-testing every session (what has changed since last time?), and the full measures at about session 8, at the last session and at the follow-up visit four weeks after discharge. If there is no improvement after 6–8 sessions: re-classify and re-screen red flags and psychosocial factors; phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — التهدئة واستعادة الحركة (الجلسات ١–٥): التنفّسُ الحجابيّ، وحركةُ الرقبة النشطة، وإيماءةُ الذقن في الاستلقاء، وسحبُ الذقن في الجلوس لمن يرتاح به، وضبطُ اللوحين، وبسطُ الظهر العلويّ على المنشفة، والتحريكُ الذاتيّ بالمنشفة لمن عنده نقصُ دوران أو صداع، والمشيُ اليوميّ.\n" +
    "المرحلة ٢ — التحكّم والتحمّل (الجلسات ٦–١٢): إيماءةُ الذقن ١٠ × ١٠ ثوانٍ، وتمارينُ الرقبة الثابتة، وتمطيطُ شبه المنحرفة العليا والرافعة للوح، والتجديفُ بالمطّاط، ورفعُ الذراعين T وY في الانبطاح، وبسطُ الظهر العلويّ، والمشيُ ٢٠–٣٠ دقيقة.\n" +
    "المرحلة ٣ — القوّة والعودة إلى الوظيفة والوقاية (الجلسات ١٣–١٨): رفعُ الرأس مع الإيماءة، والتمارينُ الثابتة بقوّةٍ أكبر، والتجديفُ وT وY بمقاومةٍ أكبر، والتمطيطُ بعد العمل، ونشاطٌ هوائيّ ١٥٠ دقيقة في الأسبوع.\n" +
    "البرنامجُ: ١٨ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه: الحادُّ يكفيه غالباً ١٠–١٢، والمزمنُ الطويل قد يحتاج أكثر. " +
    "والبرنامجُ المنزليّ يوميّ في كلّ المراحل، ويستمرّ بعد الجلسة الأخيرة حتى نهاية الأسبوع الثامن (العضلاتُ العميقة تحتاج ٦–٨ أسابيع لتبني تحمّلَها)، مع زيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع. " +
    "وتمارينُ المقاومة (التجديف، وT وY) يوماً بعد يوم — لا يومين متتاليين؛ والحركةُ والإيماءةُ والتمطيطُ يومياً. " +
    "والجلسةُ في المركز للتعليم والتصحيح والتدرّج. " + PAIN_RULE_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Settle and restore movement (sessions 1–5): diaphragmatic breathing, active neck range of motion, supine chin nod, seated retraction for those it eases, scapular setting, thoracic extension over a towel, self-SNAG for limited rotation or headache, and daily walking.\n" +
    "Phase 2 — Control and endurance (sessions 6–12): chin nod 10 × 10 seconds, cervical isometrics, upper trapezius and levator scapulae stretches, band rows, prone T and Y raises, thoracic extension, and walking 20–30 minutes.\n" +
    "Phase 3 — Strength, return to function and prevention (sessions 13–18): head lift with the nod, stronger isometrics, rows and T/Y raises with more resistance, stretching after work, and 150 minutes of aerobic activity a week.\n" +
    "Programme: 18 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient: acute pain usually needs 10–12, long-standing chronic pain may need more. " +
    "The home programme is daily in every phase and continues after the last session until the end of week 8 (the deep muscles need 6–8 weeks to build endurance), with a follow-up visit and reassessment four weeks after discharge. " +
    "Resistance exercises (rows, T and Y) on alternate days — never on consecutive days; mobility, the nod and stretching daily. " +
    "Clinic sessions are for teaching, correction and progression. " + PAIN_RULE_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ تُوقف البرنامج ويُحال المريضُ إلى الطبيب:\n" +
    "• فوراً (طوارئ): صداعٌ أو ألمُ رقبةٍ مفاجئٌ شديدٌ غيرُ معتاد («أسوأُ صداعٍ في حياته»)، أو مع دوخةٍ أو ازدواجِ رؤيةٍ أو صعوبةِ كلامٍ أو بلعٍ أو سقوطٍ مفاجئ أو غثيانٍ أو رأرأةٍ أو خدرٍ في الوجه أو اضطرابِ مشية — اشتباهُ خللٍ في الشرايين الرقبية أو تسلّخها (Cervical arterial dysfunction).\n" +
    "• علاماتُ اعتلال النخاع العنقيّ (Myelopathy): اضطرابُ المشية والتوازن، وتنميلٌ أو ثقلٌ في اليدين معاً وصعوبةُ الأعمال الدقيقة (الأزرار، الكتابة)، وشعورٌ كالكهرباء ينزل في الظهر مع حني الرقبة (Lhermitte)، وزيادةُ المنعكسات أو علامةُ هوفمان.\n" +
    "• بعد رضٍّ أو حادث — لمريضٍ واعٍ مستقرّ (وغيرُه إلى الطوارئ مباشرةً): تُطبَّق قاعدةُ الرقبة الكندية (Canadian C-spine rule) بخطواتها الثلاث بالترتيب، وأيُّ خطوةٍ لا تتحقّق ⟵ أشعةٌ قبل أيّ علاج: (١) لا عاملَ خطرٍ عالٍ — عمرٌ ٦٥ فأكثر، أو آليّةُ إصابةٍ خطرة، أو تنميلٌ في الأطراف؛ (٢) وعاملُ أمانٍ واحدٌ على الأقلّ — اصطدامٌ بسيط من الخلف، أو جالسٌ في غرفة الطوارئ، أو مشى في أيّ وقتٍ بعد الإصابة، أو تأخّر ظهورُ ألم الرقبة، أو لا ألمَ عند الضغط على منتصف الفقرات من الخلف — وبلا عامل أمانٍ لا يُختبر الدوران أصلاً؛ (٣) ثمّ يدير رقبتَه بنفسه ٤٥° لكلّ جهة. والإصابةُ الارتدادية لها بروتوكولُها.\n" +
    "• اشتباهُ عدم ثبات الفقرات العليا: التهابُ المفاصل الرثوانيّ، أو متلازمةُ داون، أو استعمالٌ طويل للكورتيزون، أو رضٌّ حديث — مع صداعٍ في مؤخّرة الرأس أو خدرٍ حول الفم أو شعورٍ بأنّ الرأسَ ثقيلٌ لا يُحمل.\n" +
    "• اشتباهُ ورمٍ أو عدوى: سرطانٌ سابق، أو نقصُ وزنٍ غيرُ مفسَّر، أو ألمٌ ليليٌّ ثابت لا يتغيّر بالوضعية، أو حمّى، أو ضعفُ مناعة، أو بدايةٌ جديدة بعد الخمسين.\n" +
    "• ألمٌ في الرقبة أو الفكّ أو الذراع اليسرى يأتي مع الجهد ويزول بالراحة، أو مع ضيق نفسٍ أو تعرّق — اشتباهٌ قلبيّ.\n" +
    "• ضعفٌ عصبيٌّ يزداد في الذراع — إحالةٌ عاجلة (والألمُ الجذريّ المستقرّ له بروتوكولُه).",
    "Red flags that stop the programme and require medical referral:\n" +
    "• Immediately (emergency): sudden, severe, unusual headache or neck pain ('the worst headache of my life'), or with dizziness, double vision, difficulty speaking or swallowing, drop attacks, nausea, nystagmus, facial numbness or gait disturbance — suspected cervical arterial dysfunction or dissection.\n" +
    "• Signs of cervical myelopathy: gait and balance disturbance, numbness or heaviness in both hands with loss of dexterity (buttons, writing), an electric sensation down the back on neck flexion (Lhermitte's sign), hyperreflexia or a positive Hoffmann sign.\n" +
    "• After trauma — in an alert, stable patient (anyone else goes straight to emergency care): apply the three steps of the Canadian C-spine rule in order, and if any step is not met → imaging before any treatment: (1) no high-risk factor — age 65 or over, a dangerous mechanism, or paraesthesia in the limbs; (2) at least one low-risk factor — a simple rear-end collision, sitting position in the emergency department, ambulatory at any time since the injury, delayed onset of neck pain, or no midline cervical spine tenderness — without a low-risk factor, rotation is not tested at all; (3) then active rotation of 45° to each side. Whiplash has its own protocol.\n" +
    "• Suspected upper cervical instability: rheumatoid arthritis, Down syndrome, long-term corticosteroids or recent trauma — with occipital headache, numbness around the mouth or a feeling that the head is too heavy to hold up.\n" +
    "• Suspected malignancy or infection: past cancer, unexplained weight loss, constant night pain unaffected by position, fever, immunosuppression, or new onset after 50.\n" +
    "• Neck, jaw or left-arm pain brought on by exertion and relieved by rest, or with breathlessness or sweating — suspected cardiac origin.\n" +
    "• Progressive neurological weakness in the arm — urgent referral (stable radicular pain has its own protocol).",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد الألمُ أكثر أو استمرّ تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• التحريكُ اليدويّ للرقبة — والسريعُ منه (Thrust manipulation) خاصّةً — بعد فحص سلامة الشرايين وموافقة المريض، وللمدرَّب عليه وحده؛ والتحريكُ الصدريّ أكثرُ أماناً ويفيد ألمَ الرقبة؛ ولا تحريكَ سريعاً للرقبة مع هشاشة العظام أو الالتهابات المفصلية أو مضادّات التخثّر أو علامات عدم الثبات.\n" +
    "• الصداعُ الذي يتغيّر نمطُه، أو يصاحبه قيءٌ أو ضعفٌ أو اضطرابٌ في الرؤية — يراه الطبيب.\n" +
    "• لا طوقَ رقبةٍ (Collar) روتينياً، ولا راحةَ طويلة، ولا أشعةَ ولا رنين روتينياً بلا علامات خطر (قرارُ الطبيب).\n" +
    "• الوسادة: ارتفاعٌ يُبقي الرأسَ على خطّ الجسم في النوم على الجنب — لا «وسادةٌ طبية» واحدة تناسب الجميع.\n" +
    "• العملُ على الشاشة: الشاشةُ بمستوى العين، واستراحةٌ قصيرة كلّ ٣٠–٤٠ دقيقة بحركة الرقبة وسحب الذقن — والتغييرُ المتكرّر للوضعية أهمّ من «الوضعية المثالية».\n" +
    "• ضغطُ الدم غيرُ المضبوط: لا تمارينَ ثابتةً بقوّةٍ عالية ولا حبسَ للنفس.\n" +
    "• لا لغةَ تخويف («فقراتك متآكلة»، «غضروفك ضاغط») — تغيّراتُ الأشعة شائعةٌ مع العمر بلا ألم.",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If pain is higher or lasts longer, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Manual therapy to the neck — thrust manipulation in particular — only after the arterial screen and with the patient's consent, by trained staff only; thoracic techniques are safer and also help neck pain; no cervical thrust with osteoporosis, inflammatory arthritis, anticoagulants or signs of instability.\n" +
    "• A headache that changes pattern, or comes with vomiting, weakness or visual disturbance — refer to the doctor.\n" +
    "• No routine collar, no prolonged rest, and no routine X-ray or MRI without red flags (the doctor's decision).\n" +
    "• Pillow: a height that keeps the head in line with the body in side-lying — no single 'medical pillow' suits everyone.\n" +
    "• Screen work: screen at eye level and a short break every 30–40 minutes with neck movement and chin tucks — frequent changes of position matter more than one 'perfect posture'.\n" +
    "• Uncontrolled blood pressure: no high-effort isometrics and no breath holding.\n" +
    "• No threatening language ('your vertebrae are worn', 'your disc is pressing') — imaging changes are common with age in people without pain.",
  ],
  totalSessions: 18, spw: 6, weeks: 3, minutes: 50,
  refs: [
    { title: "Neck Pain: Revision 2017 — Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability and Health", org: "JOSPT / APTA Orthopaedics (Blanpied et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.0302" },
    { title: "Clinical Practice Guideline for Physical Therapy Assessment and Treatment in Patients With Nonspecific Neck Pain", org: "Physical Therapy — KNGF (Bier et al.)", year: 2018 },
    { title: "Management of neck pain and associated disorders: a clinical practice guideline from the Ontario Protocol for Traffic Injury Management (OPTIMa) Collaboration", org: "European Spine Journal (Côté et al.)", year: 2016 },
    { title: "The Bone and Joint Decade 2000–2010 Task Force on Neck Pain and Its Associated Disorders: executive summary", org: "Spine (Haldeman et al.)", year: 2008 },
    { title: "Exercises for mechanical neck disorders", org: "Cochrane Database of Systematic Reviews (Gross et al.)", year: 2015 },
    { title: "Manipulation and mobilisation for neck pain contrasted against an inactive control or another active treatment", org: "Cochrane Database of Systematic Reviews (Gross et al.)", year: 2015 },
    { title: "A randomized controlled trial of exercise and manipulative therapy for cervicogenic headache", org: "Spine (Jull et al.)", year: 2002 },
    { title: "Clinical assessment of the deep cervical flexor muscles: the craniocervical flexion test", org: "Journal of Manipulative and Physiological Therapeutics (Jull, O'Leary, Falla)", year: 2008 },
    { title: "International Framework for Examination of the Cervical Region for Potential of Vascular Pathologies of the Neck Prior to Musculoskeletal Intervention: International IFOMPT Cervical Framework", org: "JOSPT (Rushton et al.)", year: 2023 },
    { title: "The Canadian C-spine rule for radiography in alert and stable trauma patients", org: "JAMA (Stiell et al.)", year: 2001 },
    { title: "Efficacy of low-level laser therapy in the management of neck pain: a systematic review and meta-analysis of randomised placebo or active-treatment controlled trials", org: "The Lancet (Chow et al.)", year: 2009 },
    { title: "The flexion-rotation test and active cervical mobility — a comparative measurement study in cervicogenic headache", org: "Manual Therapy (Hall, Robinson)", year: 2004 },
  ],
  //  التمارين أوّلاً، ثمّ المساعدُ بترتيب ألم الظهر المزمن الذي اعتمده سليم، ثمّ ما لا يُستخدم. والمساعدُ يؤشّره الأخصائيُّ لمريضه (§4.dd).
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٢٥–٣٥ دقيقة في الجلسة مع العلاج اليدويّ والتعليم، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 25–35 minutes per session with manual therapy and education, plus the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — تمارينُ الرقبة واللوح والظهر العلويّ مع التحريك اليدويّ أقوى ما في الإرشادات (JOSPT 2017 · KNGF 2018 · Cochrane 2015)، والعضلاتُ العميقة القابضة أساسُها (Jull 2002).",
        "Core in every session — neck, scapular and upper-back exercise combined with manual therapy is the strongest recommendation in the guidelines (JOSPT 2017 · KNGF 2018 · Cochrane 2015), with the deep cervical flexors at its centre (Jull 2002)."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "20–40", durationMin: "10–15" },
      parameters: ["على شبه المنحرفة العليا والعضلات المجاورة للفقرات الرقبية والصدرية العليا، في الجلوس المسنود أو الانبطاح بوسادة: السعويّ (Capacitive) ثمّ المقاوِم (Resistive) بدفءٍ مريح، وقبل التمارين — ولا يوضع على مقدّمة الرقبة.",
        "Over the upper trapezius and the cervical and upper thoracic paraspinals, in supported sitting or prone with a pillow: capacitive then resistive mode at a comfortable warmth, before exercise — never over the front of the neck."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدود: تجاربُ صغيرة بتخفيفٍ قصيرِ المدى، ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو المعادن المزروعة في المنطقة أو الحمل أو الأورام أو ضعف الإحساس، وعلى مقدّمة الرقبة (الغدّة الدرقية والشرايين).",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited evidence: small trials of short-term relief; not addressed by guidelines. Contraindicated with a pacemaker, metal implants in the area, pregnancy, tumours or impaired sensation, and over the front of the neck (thyroid and carotid arteries)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الرقبة وأعلى الكتفين في الوضعية الأكثر راحة، قبل التمارين.",
        "Pulsed electromagnetic field (PEMF) over the neck and upper shoulders in the most comfortable position, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). الدليلُ محدودٌ ومتضارب في ألم الرقبة. ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
        "Rotating adjunct — used by the centre with good results (Saleem). Limited, conflicting evidence in neck pain. Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
    { code: "traction", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { forcePctBw: "8–13", holdRestS: "30 / 10", durationMin: "10–15", mode: "Intermittent" },
      parameters: ["ليس في الجلسات الأولى شديدة التهيّج: شدٌّ عنقيّ متقطّع في الاستلقاء والرقبةُ بانثناءٍ ٢٠–٣٠° (لا في البسط)، يبدأ بنحو ٨٪ من وزن الجسم ويزيد حتى ١٠–١٣٪ حسب الاستجابة، ثمّ تمرين؛ ويُوقف مع أيّ دوخةٍ أو تنميلٍ أو ألمٍ في الفكّ.",
        "Not in the first, highly irritable sessions: intermittent cervical traction in supine with the neck in 20–30° of flexion (not extension), starting at about 8% of body weight and progressing to 10–13% as tolerated, followed by exercise; stop with any dizziness, tingling or jaw pain."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). الدليلُ في ألم الرقبة الميكانيكيّ بلا ألمٍ جذريّ محدودٌ ومتضارب (وأوضحُ مع الاعتلال الجذريّ — له بروتوكولُه)؛ فلا يُعطى وحده. ممنوعٌ مع علامات عدم الثبات أو خلل الشرايين الرقبية أو اعتلال النخاع أو الكسور أو الأورام أو هشاشة العظام الشديدة أو التهاب المفاصل الرثوانيّ، ومع مشكلات مفصل الفكّ.",
        "Rotating adjunct — used by the centre (Saleem). Evidence in mechanical neck pain without radicular pain is limited and conflicting (clearer in radiculopathy — its own protocol), so never on its own. Contraindicated with signs of instability, cervical arterial dysfunction, myelopathy, fracture, tumour, severe osteoporosis or rheumatoid arthritis, and with jaw (TMJ) problems."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS): أقطابٌ على العضلات المجاورة للفقرات الرقبية وأعلى الكتفين — لا على مقدّمة الرقبة ولا على الجيب السباتيّ — بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض، قبل التمارين.",
        "Conventional TENS: electrodes over the cervical paraspinals and upper shoulders — never over the front of the neck or the carotid sinus — at a strong but comfortable tingling without contraction, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ لتهدئة الألم (سليم). دليلُه في ألم الرقبة محدودٌ لتخفيفٍ قصيرِ المدى؛ فلا يُعطى وحده. ممنوعٌ مع منظّم ضربات القلب، وعلى مقدّمة الرقبة والجيب السباتيّ، وعلى جلدٍ متضرّر أو ضعيف الإحساس.",
        "Rotating adjunct — used by the centre for pain relief (Saleem). Limited evidence of short-term relief in neck pain, so never on its own. Contraindicated with a pacemaker, over the front of the neck and the carotid sinus, and on damaged or insensate skin."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على الرقبة وأعلى الكتفين في الجلوس المسنود أو الانبطاح بوسادة، قبل التمارين لا بدلها؛ وافحص الجلد قبلها وبعدها. وفي البيت كيسُ ماءٍ دافئ ١٥–٢٠ دقيقة.",
        "Over the neck and upper shoulders in supported sitting or prone with a pillow, before exercise, never instead of it; check the skin before and after. At home, a hot-water bottle for 15–20 minutes."],
      note: ["مساعدٌ بالتناوب، قصيرُ المدى لمن تريحه الحرارةُ وتُرخي عضلاتِه؛ والدليلُ محدود. ممنوعٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
        "Rotating adjunct, short-term, for patients whose pain and muscle tension ease with heat; limited evidence. Contraindicated with impaired sensation, poor circulation or open wounds."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها، والعينان بعيدتان عن الأشعّة.", "Alternative to the hot pack when unavailable, with the same precautions, keeping the eyes away from the lamp."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only; never given alone."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { needleSize: "0.25 × 25–40", points: "2–4", sessions: "1 / week × 2–4" },
      parameters: ["النقاطُ الزنادية (Trigger points) في شبه المنحرفة العليا (Upper trapezius) والرافعة للوح (Levator scapulae) والطحالية (Splenius capitis) والعضلات تحت القذالية (Suboccipitals)، بالإدخال والإخراج السريع حتى الارتعاش الموضعيّ (Local twitch response)، ضمن جلسة التمارين ومعها.",
        "Trigger points in upper trapezius, levator scapulae, splenius capitis and the suboccipitals, using a fast-in/fast-out technique to elicit local twitch responses, within and alongside the exercise session."],
      note: ["مساعدٌ بالتناوب، للمرخَّص بالإبر الجافة وحده. يخفّف الألمَ قصيرَ المدى حين يُضاف إلى التمارين (JOSPT 2017). السلامة: في شبه المنحرفة العليا بإمساكٍ بين الإصبعين (Pincer grip) والإبرةُ موجّهةٌ أفقياً بعيداً عن قمّة الرئة (خطرُ استرواح الصدر)؛ ولا إدخالَ في مقدّمة الرقبة، ولا عميقاً تحت القذال قرب الشريان الفقريّ إلّا للمتمرّس؛ ولا يُعطى وحده.",
        "Rotating adjunct, dry-needling certified staff only. Reduces short-term pain when added to exercise (JOSPT 2017). Safety: in upper trapezius use a pincer grip with the needle directed horizontally away from the lung apex (pneumothorax risk); no needling of the anterior neck, and no deep suboccipital needling near the vertebral artery except by experienced staff; never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم في المركز لهذه الحالة حتى يقرّر سليم (لم يذكره) — مع أنّ دليلَه في ألم الرقبة أفضلُ منه في الظهر: مراجعةٌ في The Lancet (Chow 2009) وجدت تخفيفاً للألم في الحادّ والمزمن، وتذكره JOSPT 2017 للمزمن. فإن قرّر سليم استعمالَه صار مساعداً بإعداداته.",
        "Not used by the centre for this condition until Saleem decides (not mentioned by him) — although its evidence in neck pain is better than in back pain: a Lancet review (Chow 2009) found pain relief in acute and chronic neck pain, and JOSPT 2017 lists it for chronic pain. If Saleem chooses to use it, it becomes an adjunct with its settings."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — ولا دليلَ كافياً على فائدة الأمواج فوق الصوتية العلاجية في ألم الرقبة، ولا تضعها الإرشاداتُ ضمن العلاج الموصى به.",
        "Not used by the centre for this condition (not mentioned by Saleem) — there is insufficient evidence for therapeutic ultrasound in neck pain, and guidelines do not include it in recommended care."] },
  ],
  phases: [
    {
      name: ["التهدئة واستعادة الحركة", "Settle and restore movement"],
      sessionFrom: 1, sessionTo: 5,
      timeframe: ["نحو الأسبوع الأوّل", "About the first week"],
      goals: [
        "يفهم المريضُ أنّ ألمَه غيرُ خطير وأنّ الحركةَ آمنة؛ حركةُ رقبةٍ أوسع وأقلُّ ألماً في كلّ الاتّجاهات؛ بدءُ تنشيط العضلات العميقة القابضة واللوحين؛ تغييراتٌ أولى في العمل والنوم؛ وبرنامجٌ منزليٌّ يوميّ يؤدّيه صحيحاً.",
        "The patient understands that the pain is not serious and that movement is safe; wider, less painful neck movement in all directions; deep cervical flexors and scapular muscles start to activate; first changes at work and in sleep; a daily home programme performed correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• ألمُ الرقبة شائعٌ جداً، وأغلبُه ليس من مرضٍ خطير، والرقبةُ قويّةٌ تتحمّل الحركة.\n" +
        "• تغيّراتُ الأشعة («خشونة»، «انزلاقٌ غضروفيّ صغير») شائعةٌ مع العمر عند مَن لا يشكو ألماً، ولا تفسّر الألمَ وحدها.\n" +
        "• الحركةُ المتدرّجة تخفّف الألم، والطوقُ والراحةُ الطويلة يؤخّران التحسّن.\n" +
        "• الشاشةُ والهاتف: ارفعهما إلى مستوى العين، وخذ استراحةً قصيرة كلّ ٣٠–٤٠ دقيقة — والتغييرُ المتكرّر للوضعية أهمّ من «وضعيةٍ مثالية» واحدة.\n" +
        "• النوم: وسادةٌ تُبقي الرأسَ على خطّ الجسم في النوم على الجنب، وتجنّبُ النوم على البطن والرقبةُ ملتفّة.\n" +
        "• التوتّرُ وقلّةُ النوم يزيدان شدَّ الرقبة وألمَها — والتنفّسُ البطيء جزءٌ من العلاج.",
        "Key messages — in plain language, repeated every session:\n" +
        "• Neck pain is very common, is rarely due to serious disease, and the neck is strong and tolerates movement.\n" +
        "• Imaging changes ('wear and tear', 'a small disc bulge') are common with age in people without pain and do not explain pain on their own.\n" +
        "• Graded movement eases pain, while collars and prolonged rest delay recovery.\n" +
        "• Screens and phones: raise them to eye level and take a short break every 30–40 minutes — frequent changes of position matter more than one 'perfect posture'.\n" +
        "• Sleep: a pillow that keeps the head in line with the body when side-lying, and avoid sleeping prone with the neck twisted.\n" +
        "• Stress and poor sleep increase neck tension and pain — slow breathing is part of treatment.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الألمُ ٤ من ١٠ أو أقلّ مع الأنشطة اليومية، أو انخفض نقطتين على الأقلّ عن التقييم الأوّل.\n" +
        "• تحسّن الدورانُ ١٠° على الأقلّ في الجهة المحدودة، ويلتفت للنظر خلفه بألمٍ قليل.\n" +
        "• يؤدّي إيماءةَ الذقن ١٠ مرّات بثبات ٥ ثوانٍ بلا تعويضٍ بالعضلات السطحية.\n" +
        "• يلتزم بالبرنامج المنزليّ وتغييرات العمل ٥ أيّام في الأسبوع على الأقلّ.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة السابعة: يعيد الأخصائيُّ التصنيفَ وفرزَ علامات الخطر والعوامل النفسية، وإن ظهرت أعراضٌ عصبية أو وعائية — يراه الطبيب.",
        "Progress to phase 2 when all are met:\n" +
        "• Pain ≤ 4/10 with daily activities, or at least 2 points lower than at baseline.\n" +
        "• Rotation improved by at least 10° on the limited side, and able to look behind with little pain.\n" +
        "• Chin nod 10 times with 5-second holds without superficial muscle substitution.\n" +
        "• Does the home programme and work changes at least 5 days a week.\n" +
        "If not achieved by session 7: the specialist re-classifies and re-screens red flags and psychosocial factors; if neurological or vascular symptoms appear, the doctor reviews the patient.",
      ],
      notes: [
        "• العلاجُ اليدويّ بعد فحص السلامة وموافقة المريض، ٥–١٠ دقائق قبل التمارين لا وحده (JOSPT 2017 · Cochrane 2015): التحريكُ الصدريّ (Thoracic manipulation / mobilisation) لأغلب المرضى — أكثرُ أماناً ويفيد الرقبة؛ والتحريكُ الرقبيّ اللطيف (Mobilisation، درجات I–II للألم وIII–IV للتيبّس) أو السريعُ للمدرَّب بعد فحص الشرايين؛ والأنسجةُ الرخوة للعضلات المشدودة — ثمّ يُعاد الفحصُ فوراً ويتبعه تمرينٌ في المدى الجديد.\n" +
        "• الصداعُ الرقبيّ المنشأ: تحريكُ الفقرات العليا والتحريكُ الذاتيّ بالمنشفة (SNAG) مع إيماءة الذقن — هذا الجمعُ أثبتُ ما في الدليل (Jull 2002).\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب (المؤشَّرُ لهذا المريض)، والشدُّ ليس في هذه المرحلة.\n" +
        "• إيماءةُ الذقن تُعلَّم بدقّة: الجودةُ قبل العدد، وجهازُ الضغط الهوائيّ إن وُجد.\n" +
        "• راقب الدوخةَ والصداعَ مع كلّ تقنيةٍ جديدة.",
        "• Manual therapy after the safety screen and with consent, 5–10 minutes before and to facilitate exercise, never alone (JOSPT 2017 · Cochrane 2015): thoracic manipulation or mobilisation for most patients — safer and helpful for the neck; gentle cervical mobilisation (grades I–II for pain, III–IV for stiffness) or thrust by trained staff after the arterial screen; and soft-tissue techniques for tight muscles — then re-test immediately and follow with exercise in the new range.\n" +
        "• Cervicogenic headache: upper cervical mobilisation and the towel self-SNAG with the chin nod — the best-supported combination (Jull 2002).\n" +
        "• One adjunct device per session in rotation (those ticked for this patient); no traction in this phase.\n" +
        "• Teach the chin nod precisely: quality before quantity, with the pressure biofeedback unit if available.\n" +
        "• Watch for dizziness and headache with every new technique.",
      ],
      exercises: [
        { code: "diaphragmatic-breathing", doseNote: ["مرّتان يومياً، وعند شدّ الرقبة والتوتّر.", "Twice daily, and with neck tension and stress."],
          note: ["الكتفان مرتخيتان: كثيرٌ من مرضى الرقبة يتنفّسون بالصدر والكتفين.", "Shoulders relaxed: many neck patients breathe with the chest and shoulders."] },
        { code: "neck-arom" },
        { code: "chin-tuck-supine", hold: 5, doseNote: ["يبدأ ١٠ × ٥ ثوانٍ، ويزيد إلى ١٠ ثوانٍ حين يصير سهلاً بلا تعويض.", "Start at 10 × 5 seconds and progress to 10 seconds once easy without substitution."] },
        { code: "cervical-retraction", note: ["لمن يرتاح بالسحب (من التقييم)، ولا يُعطى إن زاد الألمُ في الذراع.", "For those eased by retraction (from assessment); not given if arm pain increases."] },
        { code: "scapular-setting" },
        { code: "thoracic-extension-towel" },
        { code: "self-snag-rotation", note: ["لمن عنده نقصُ دوران أو صداعٌ رقبيّ المنشأ — بعد أن يعلّمه الأخصائيّ.", "For limited rotation or cervicogenic headache — after the specialist has taught it."] },
        { code: "graded-walking", doseNote: ["١٥–٢٠ دقيقة يومياً بخطواتٍ طبيعية وذراعين تتحرّكان.", "15–20 minutes daily with natural steps and arm swing."],
          note: ["المشيُ هنا للنشاط العامّ وتخفيف التوتّر وشدّ الكتفين.", "Walking here is for general activity and to ease stress and shoulder tension."] },
      ],
    },
    {
      name: ["التحكّم والتحمّل", "Control and endurance"],
      sessionFrom: 6, sessionTo: 12,
      timeframe: ["نحو الأسبوع الثاني", "About week 2"],
      goals: [
        "تحمّلُ العضلات العميقة القابضة وعضلات اللوحين، ومدى حركةٍ كاملٌ أو شبهُ كامل، وألمٌ أقلّ في العمل، ومشيٌ ٢٠–٣٠ دقيقة.",
        "Endurance of the deep cervical flexors and scapular muscles, full or near-full range of motion, less pain at work, and walking 20–30 minutes.",
      ],
      education: [
        "• الألمُ الخفيف أثناء التمرين مقبول إن هدأ قبل اليوم التالي — والإحساسُ بالشدّ لا يعني الضرر.\n" +
        "• العضلاتُ العميقة تحتاج أسابيعَ لتبني تحمّلَها؛ فالانتظامُ اليوميّ أهمّ من الشدّة.\n" +
        "• في العمل: كلّ ٣٠–٤٠ دقيقة دقيقةٌ واحدة — سحبُ الذقن، وضبطُ اللوحين، وحركةُ الرقبة.\n" +
        "• الانتكاسةُ الخفيفة طبيعيةٌ ولها خطّة: خفّف ولا تتوقّف، وعُد إلى تمارين المرحلة ١.",
        "• Mild pain during exercise is acceptable if it settles by the next day — feeling a stretch does not mean harm.\n" +
        "• The deep muscles need weeks to build endurance; daily consistency matters more than intensity.\n" +
        "• At work: one minute every 30–40 minutes — chin tuck, shoulder-blade set and neck movement.\n" +
        "• A mild flare is normal and has a plan: ease off, do not stop, and return to the phase 1 exercises.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• يؤدّي إيماءةَ الذقن ١٠ × ١٠ ثوانٍ بلا تعويض (أو يبلغ ٢٦–٢٨ ملم زئبق على جهاز الضغط).\n" +
        "• الدورانُ ٦٠° على الأقلّ لكلّ جهة، أو الفرقُ بين الجهتين ١٠° أو أقلّ.\n" +
        "• يؤدّي التجديفَ بالمطّاط ٣ × ١٢ ورفعَ الذراعين T وY ٢ × ١٠ بلا ألمٍ في الرقبة ولا رفعٍ للكتفين.\n" +
        "• تحسّن مؤشرُ إعاقة الرقبة ٥ نقاطٍ على الأقلّ (من ٥٠) عن التقييم الأوّل — وإن لم يتحسّن فمراجعةُ الأخصائيّ قبل الانتقال.",
        "Progress to phase 3 when:\n" +
        "• Chin nod 10 × 10 seconds without substitution (or 26–28 mmHg on the pressure unit).\n" +
        "• Rotation of at least 60° to each side, or a side-to-side difference of 10° or less.\n" +
        "• Band rows 3 × 12 and prone T and Y raises 2 × 10 without neck pain or shrugging.\n" +
        "• NDI improved by at least 5 points (of 50) from baseline — if not, specialist review before progressing.",
      ],
      notes: [
        "• التدرّج: زِد شيئاً واحداً في كلّ مرّة — الثباتَ أو التكرارَ أو المقاومة — حين يصير الحاليّ سهلاً (جهدٌ ٦ من ١٠ أو أقلّ).\n" +
        "• العلاجُ اليدويّ يقلّ مع زيادة العمل الفعّال، ويبقى قبل التمارين لمن يفيده.\n" +
        "• الشدُّ — إن أشّره الأخصائيُّ مساعداً لهذا المريض — يبدأ هنا لا قبلها.\n" +
        "• حركةُ الرقبة إحماءٌ قبل كلّ جلسة.\n" +
        "• تمارينُ المطّاط والانبطاح يوماً بعد يوم، والإيماءةُ والتمطيطُ يومياً.",
        "• Progression: change one thing at a time — hold, repetitions or resistance — once the current dose is easy (effort ≤ 6/10).\n" +
        "• Manual therapy decreases as active work increases, and stays before exercise for those who benefit.\n" +
        "• Traction — if ticked as an adjunct for this patient — starts here, not earlier.\n" +
        "• Neck range of motion as the warm-up before every session.\n" +
        "• Band and prone exercises on alternate days; the nod and stretching daily.",
      ],
      exercises: [
        { code: "neck-arom", doseNote: WARMUP },
        { code: "chin-tuck-supine", doseNote: ["١٠ × ١٠ ثوانٍ، وبجهاز الضغط يرتفع درجةً (٢ ملم زئبق) حين تُتقَن العشر.", "10 × 10 seconds; with the pressure unit, move up one level (2 mmHg) once all ten are mastered."] },
        { code: "cervical-isometrics" },
        { code: "upper-trap-stretch" },
        { code: "levator-scapulae-stretch" },
        { code: "band-row", doseNote: [ALTERNATE_AR, ALTERNATE_EN] },
        { code: "prone-y-t", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["يبدأ بـT، ويُضاف Y حين لا يؤلم الكتف.", "Start with T; add Y once it does not hurt the shoulder."] },
        { code: "thoracic-extension-towel" },
        { code: "graded-walking", doseNote: ["٢٠–٣٠ دقيقة يومياً أو ٥ أيّام في الأسبوع، بسرعةٍ يتكلّم فيها ولا يغنّي.", "20–30 minutes daily or 5 days a week, at a pace where talking is possible but not singing."] },
      ],
    },
    {
      name: ["القوّة والعودة إلى الوظيفة والوقاية", "Strength, return to function and prevention"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["نحو الأسبوع الثالث — ثمّ البرنامجُ المنزليّ حتى الأسبوع الثامن", "About week 3 — then the home programme until week 8"],
      goals: [
        "العملُ ساعةً أو أكثر على الشاشة باستراحاتٍ قصيرة بلا نوبة ألم، وحملُ الأغراض ورفعُ الذراعين فوق الرأس بثقة، والعودةُ الكاملة إلى العمل والقيادة والرياضة، واستقلالٌ تامّ ببرنامجٍ منزليّ وخطّةٍ مكتوبة للانتكاسة.",
        "Working an hour or more at a screen with short breaks without a flare, confident carrying and overhead reaching, full return to work, driving and sport, and full independence with a home programme and a written flare-up plan.",
      ],
      education: [
        "• خطّةُ الانتكاسة المكتوبة (تُعطى للمريض):\n" +
        "  ١. نوبةُ ألمٍ أو تيبّسٌ صباحيّ لا يعني ضرراً جديداً — لا طوقَ ولا راحةً طويلة.\n" +
        "  ٢. عُد إلى حركة الرقبة وإيماءة الذقن والحرارة يومين أو ثلاثة، وخفّف تمارينَ المقاومة إلى النصف.\n" +
        "  ٣. راجع وضعَ الشاشة والاستراحات والنوم في الأيّام التي سبقت النوبة.\n" +
        "  ٤. إن لم تتحسّن خلال أسبوعين، أو ظهر تنميلٌ في الذراع أو دوخةٌ أو صداعٌ جديد — راجعنا.\n" +
        "• بعد التخرّج: تمارينُ الرقبة واللوحين مرّتين أو ثلاثاً في الأسبوع، ونشاطٌ هوائيّ ١٥٠ دقيقة في الأسبوع — فالتمرينُ المستمرّ أقوى ما يمنع العودة.\n" +
        "• الاستراحاتُ القصيرة في العمل عادةٌ دائمة لا علاجٌ مؤقّت.",
        "• Written flare-up plan (given to the patient):\n" +
        "  1. A flare or morning stiffness does not mean new damage — no collar and no prolonged rest.\n" +
        "  2. Return to neck movement, the chin nod and heat for two or three days, and halve the resistance exercises.\n" +
        "  3. Review the screen set-up, breaks and sleep in the days before the flare.\n" +
        "  4. If there is no improvement within two weeks, or arm tingling, dizziness or a new headache appears — come back to us.\n" +
        "• After discharge: neck and shoulder-blade exercises two to three times a week and 150 minutes of aerobic activity a week — ongoing exercise is the best way to prevent recurrence.\n" +
        "• Short breaks at work are a permanent habit, not a temporary treatment.",
      ],
      criteria: [
        "يتخرّج حين:\n" +
        "• تحقّقت أهدافُ الخطّة أو أغلبُها: انخفض مؤشرُ إعاقة الرقبة ٧٫٥ نقاطٍ على الأقلّ (أو ٣٠٪)، والألمُ ٢ من ١٠ أو أقلّ مع الأنشطة، والأنشطةُ الثلاثة في PSFS ٧ من ١٠ أو أعلى، والصداعُ — إن وُجد — قلّ تكرارُه وشدّتُه بوضوح.\n" +
        "• الدورانُ ٧٠° على الأقلّ لكلّ جهة أو متماثلٌ بفرقٍ لا يتجاوز ١٠°.\n" +
        "• يثبت في رفع الرأس مع الإيماءة ٢٠–٣٠ ثانية، ويؤدّي تمارينَ المقاومة بمقاومتها الحالية بنمطٍ صحيح.\n" +
        "• يؤدّي برنامجَه وحده صحيحاً، وغيّر بيئةَ عمله، ويعرف خطّةَ الانتكاسة.\n" +
        "ثمّ زيارةُ متابعةٍ وإعادةُ تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "Discharge (graduate) when:\n" +
        "• The plan goals are met or mostly met: NDI reduced by at least 7.5 points (or 30%), pain ≤ 2/10 with activities, the three PSFS activities at 7/10 or higher, and headache — if present — clearly less frequent and less intense.\n" +
        "• Rotation of at least 70° to each side, or symmetric within 10°.\n" +
        "• Holds the head lift with the nod for 20–30 seconds and performs the resistance exercises at their current load with correct technique.\n" +
        "• Performs the programme independently and correctly, has changed the work set-up, and knows the flare-up plan.\n" +
        "Then a follow-up visit and reassessment four weeks after discharge.",
      ],
      notes: [
        "• اربط التمارين بمهامّ المريض: العملُ على الحاسوب، والقيادةُ (الالتفاتُ للخلف)، وحملُ الأطفال والأغراض، والصلاةُ (السجودُ والالتفاتُ في التسليم)، والرياضة.\n" +
        "• المقاومةُ تُزاد ما دامت التقنيةُ صحيحة والألمُ ضمن القاعدة، يوماً بعد يوم.\n" +
        "• الحادُّ الذي تحسّن سريعاً قد يتخرّج قبل الجلسة الثامنة عشرة — بمعايير التخرّج لا بالعدد.\n" +
        "• بعد الجلسة الأخيرة: يكمل البرنامجَ المنزليّ وحده حتى نهاية الأسبوع الثامن (العضلاتُ العميقة تحتاج ٦–٨ أسابيع لتبني تحمّلَها)، ويعود لزيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع.",
        "• Link exercises to the patient's tasks: computer work, driving (looking over the shoulder), carrying children and shopping, prayer (prostration and turning the head at the end of prayer), and sport.\n" +
        "• Increase resistance as long as technique is correct and pain stays within the rule, on alternate days.\n" +
        "• An acute patient who improves quickly may graduate before session 18 — by the discharge criteria, not the count.\n" +
        "• After the last session: the home programme continues independently until the end of week 8 (the deep muscles need 6–8 weeks to build endurance), with a follow-up visit and reassessment four weeks after discharge.",
      ],
      exercises: [
        { code: "neck-arom", doseNote: WARMUP },
        { code: "deep-neck-flexor-endurance" },
        { code: "cervical-isometrics", note: ["بقوّةٍ أكبر، أو بالمطّاط بحركةٍ صغيرة بحسب الأخصائيّ.", "With more effort, or with a band and small movements as prescribed by the specialist."] },
        { code: "band-row", reps: 10, doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["مطّاطٌ أقوى — ١٠–١٢ تكراراً.", "A stronger band — 10–12 repetitions."] },
        { code: "prone-y-t", doseNote: [ALTERNATE_AR, ALTERNATE_EN], note: ["بثقلٍ خفيف ٠٫٥–١ كغ حين يُتقَن بلا ثقل.", "With a light 0.5–1 kg weight once mastered without one."] },
        { code: "upper-trap-stretch", doseNote: ["بعد العمل على الشاشة يومياً.", "Daily after screen work."] },
        { code: "graded-walking", doseNote: ["٣٠ دقيقة ٥ أيّام في الأسبوع (١٥٠ دقيقة)، أو دراجةٌ أو سباحة.", "30 minutes 5 days a week (150 minutes), or cycling or swimming."] },
      ],
    },
  ],
};

export const name = "125_physio_neck_pain_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
