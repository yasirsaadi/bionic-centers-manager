// Migration 128: ألمُ تحت الأخرم واعتلالُ أوتار الكفّة المدوّرة — البروتوكولُ الخامس مفصَّلاً (§4.dk — ٢٠٢٦-١٠-١١).
//
// البروتوكولُ الخامس بالترتيب المتّفق عليه (§4.dg): «تمام ابدأ» — ألمُ تحت الأخرم (`subacromial-pain-adult`). **بالقالب كاملاً** (§4.dd · §4.di):
// ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع)، وثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ رقمية، واثنتا عشرةَ بطاقةً جديدة للكتف (واثنتا عشرةَ صورةً
// مطلوبة — وأربعُ بطاقاتٍ من الرقبة بصورها، بقاعدة المالك «لا تطلب صوراً مكرّرة»)، والأجهزةُ بدرجة دليلها و«استعمال المركز» وإعداداتها، والبرنامجُ المنزليّ
// حتى الأسبوع الثاني عشر وزيارةُ متابعة، والمقاييسُ كما زُرعت (SPADI ورفعُ الذراع الفعّال). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الكتف**: التشخيصُ سريريّ بمجموعة الاختبارات الخمسة (Michener 2009) بلا صورٍ روتينية؛ والأساسُ التمرينُ المتدرّج للكفّة ولوح الكتف (الإرشاداتُ
// الهولندية 2014 · Pieters 2020 · Steuri 2017) — **بحملٍ خفيفٍ وتكرارٍ كثير يومياً** (٣ × ١٥، Holmgren 2012) ثمّ أثقلَ يوماً بعد يوم؛ والألمُ حتى ٥ من ١٠
// إن عاد قبل الجلسة التالية (Holmgren). **والعددُ هنا أصدقُ ما يكون**: التمرينُ المنزليّ الجيّد لم يقلّ عن المشرَف عليه (الإرشاداتُ الهولندية · Kuhn 2009)،
// وستُّ جلساتٍ لم تتفوّق على نصيحةٍ واحدة (GRASP 2021) — فالعددُ ١٨ لنموذج المركز اليوميّ، والخفيفُ يكفيه ٦–١٢، والقرارُ لسليم. وتوسيعُ ما تحت الأخرم لم يفُق
// العمليةَ الوهمية (CSAW · FIMPACT 2018). **والأجهزة**: الأمواجُ فوق الصوتية والتحفيزُ والصادمةُ بلا تكلّس «لا تفوق الوهميّ» في الإرشادات الهولندية، والمغناطيسُ
// «دليلٌ متوسّط على عدم الأثر» (Pieters)، والتيكارُ تجربةٌ مضبوطة بلا فرق — والاستعمالُ بقرار المالك «تبعاً لكلام سليم» (§4.cx): التيكارُ والمغناطيسُ والتحفيزُ
// مساعد، والحرارةُ والإبرُ كما في البروتوكول (مساعد)، والليزرُ والأمواجُ فوق الصوتية لا يُستخدمان حتى يقول، والصادمةُ لا تُستخدم (للتكلّسيّ بروتوكولُه).
//
// المصادر (الروابطُ لما ظهر معرّفُه في سجلّه): Diercks 2014 · Pieters 2020 · Steuri 2017 · Holmgren 2012 · Kuhn 2009 · Littlewood 2016 · Beard 2018 ·
// Paavola 2018 · Hopewell 2021 · Page 2016 · Desjardins-Charbonneau 2015 · Haslerud 2015 · Desmeules 2015 · Kulkarni 2015 · Michener 2009 · Roy 2009 ·
// Arias-Buría 2017 · Avendaño-Coy 2022. القواعدُ في `physio_content.ts`: بطاقاتٌ لا تُمَسّ إن وُجدت، والنصوصُ لا تُكتب فوق تعديل إنسان، والمراحلُ لا تتكرّر،
// والخططُ المفتوحة تأخذ نسختَها.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

const PAIN_RULE_AR = "ألمٌ أثناء التمرين حتى ٥ من ١٠ مقبول إن عاد إلى مستواه المعتاد قبل الجلسة التالية (Holmgren 2012) — بلا زيادةٍ في الألم الليليّ.";
const PAIN_RULE_EN = "Pain up to 5/10 during exercise is acceptable if it returns to its usual level before the next session (Holmgren 2012) — with no increase in night pain.";

const DAILY_LIGHT: [string, string] = ["يومياً بحملٍ خفيف — ٣ × ١٥، والنزولُ في ٣ ثوانٍ.", "Daily at a light load — 3 × 15, lowering over 3 seconds."];
const HEAVY_ALT: [string, string] = ["يوماً بعد يوم بحملٍ أثقل — ٣ × ٨–١٢، والنزولُ في ٣ ثوانٍ.", "Alternate days at a heavier load — 3 × 8–12, lowering over 3 seconds."];
const ALTERNATE: [string, string] = ["يوماً بعد يوم.", "Alternate days."];

/** **البطاقاتُ الجديدة** — وضبطُ لوحَي الكتف وبسطُ الظهر العلويّ والتجديفُ بالمطّاط ورفعُ الذراعين T وY من الرقبة (ترحيل ١٢٥) برموزها وصورها. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "wand-flexion-supine", nameAr: "رفع الذراع بالعصا في الاستلقاء", nameEn: "Supine wand-assisted shoulder flexion",
    kind: "mobility", region: "shoulder", perSide: true, sets: 1, reps: 10, hold: 3,
    purpose: ["يستعيد رفعَ الذراع بمساعدة الذراع السليمة والكتفُ المؤلم مرتخٍ، والجاذبيةُ أخفّ في الاستلقاء — فيتحرّك المفصلُ بلا حملٍ على الأوتار المتهيّجة، ويمنع التيبّسَ الذي يأتي مع تجنّب الحركة.",
      "Restores arm elevation with help from the other arm while the painful shoulder stays relaxed and gravity is reduced in lying — moving the joint without loading irritable tendons, and preventing the stiffness that follows avoiding movement."],
    start: ["مستلقٍ على الظهر والركبتان مثنيّتان، تمسك عصا (أو عصا مكنسة) بكلتا اليدين بعرض الكتفين، والعصا على الفخذين.",
      "Lying on the back with the knees bent, holding a stick (or broom handle) in both hands at shoulder width, the stick resting on the thighs."],
    steps: [[
      "ارفع العصا ببطءٍ فوق الصدر ثمّ نحو الرأس، والذراعُ السليمة تقود والمؤلمةُ تتبعها مرتخية.",
      "توقّف عند شدٍّ مريح أو ألمٍ خفيف لا يزيد على ٣ من ١٠، واثبت ٣ ثوانٍ.",
      "أنزل العصا ببطءٍ إلى الفخذين.",
      "كرّر ١٠ مرّات بإيقاعٍ هادئ وتنفّسٍ طبيعيّ.",
    ], [
      "Raise the stick slowly over the chest and then towards the head, the good arm leading and the painful arm following, relaxed.",
      "Stop at a comfortable stretch or mild pain no higher than 3/10, and hold for 3 seconds.",
      "Lower the stick slowly back to the thighs.",
      "Repeat 10 times at a calm pace, breathing normally.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ مرتخٍ إلى الأسفل، والحركةُ من الذراعين.",
      "تقوّسُ أسفل الظهر في آخر المدى ⟵ الركبتان مثنيّتان والظهرُ على الأرض.",
      "دفعُ الذراع إلى ألمٍ حادّ ⟵ المدى يزيد مع الأيّام لا في جلسةٍ واحدة.",
    ], [
      "Hitching the shoulder up towards the ear → keep the shoulder relaxed and down; the movement comes from the arms.",
      "Arching the low back at the end of the range → knees bent and back flat on the floor.",
      "Forcing into sharp pain → the range grows over days, not in one session.",
    ]],
    easier: ["مدىً أصغر، أو المرفقان مثنيّان والعصا قريبةٌ من الصدر.", "A smaller range, or with the elbows bent and the stick close to the chest."],
    harder: ["في الجلوس أو الوقوف، ثمّ رفعُ الذراع المؤلمة وحدها بلا عصا في الاستلقاء.", "In sitting or standing, then lifting the painful arm alone without the stick while lying."],
    stopIf: ["ألمٌ حادّ أو ألمٌ يبقى أكثر من ساعة بعد التمرين، أو تنميلٌ في الذراع.", "Sharp pain, pain lasting more than an hour after exercise, or tingling in the arm."],
    equipment: ["عصا أو عصا مكنسة، وفرشةٌ أو سرير.", "A stick or broom handle, and a mat or bed."],
    doseNote: ["مرّتان يومياً.", "Twice daily."],
    images: [{ key: "wand-flexion-supine-1", ar: "مستلقٍ على الظهر يرفع العصا بكلتا يديه فوق الرأس", en: "Lying on the back raising a stick overhead with both hands", search: "supine wand shoulder flexion" }],
  },
  {
    code: "isometric-er", nameAr: "الدوران الخارجيّ الثابت (ظهرُ اليد يضغط على الحائط)", nameEn: "Isometric shoulder external rotation (against a wall)",
    kind: "strength", region: "shoulder", perSide: true, sets: 1, reps: 5, hold: 30, rest: 60,
    purpose: ["أوّلُ تحميلٍ لأوتار الكفّة المدوّرة المتهيّجة بلا حركةٍ في المفصل — فالدوّاراتُ الخارجية (الشوكيّة السفلى والمدوّرة الصغرى) تضعف مع ألم الكتف، والانقباضُ الثابت بشدّةٍ مريحة يبدأ به التحميلُ حين تؤلم الحركة.",
      "The first load for irritable rotator cuff tendons without moving the joint — the external rotators (infraspinatus and teres minor) weaken with shoulder pain, and a comfortable static contraction starts the loading when movement hurts."],
    start: ["واقفٌ بجانب حائطٍ أو إطار باب والكتفُ المؤلم نحوه، والمرفقُ مثنيٌّ ٩٠° وملاصقٌ للجسم ومنشفةٌ صغيرة ملفوفة بينهما، والإبهامُ إلى الأعلى وظهرُ اليد على الحائط.",
      "Standing side-on to a wall or door frame with the painful shoulder towards it, the elbow bent to 90° and tucked against the side with a small rolled towel in between, the thumb up and the back of the hand against the wall."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل برفق.",
      "ادفع بظهر اليد في الحائط كأنّك تديّر الساعدَ للخارج — بلا حركة — بنحو نصف قوّتك أو أقلّ.",
      "اثبت ٣٠ ثانية وتنفّس بشكلٍ طبيعيّ، والألمُ لا يزيد على ٣ من ١٠.",
      "أرخِ دقيقةً ثمّ كرّر حتى ٥ مرّات.",
    ], [
      "Gently set the shoulder blade back and down.",
      "Push the back of the hand into the wall as if rotating the forearm outwards — without moving — at about half your strength or less.",
      "Hold for 30 seconds while breathing normally, with pain no higher than 3/10.",
      "Relax for a minute, then repeat up to 5 times.",
    ]],
    cues: [[
      "ابتعادُ المرفق عن الجسم ⟵ المنشفةُ تبقى بين المرفق والجسم.",
      "رفعُ الكتف أو ميلُ الجذع ⟵ الكتفُ إلى الأسفل والجذعُ ثابت.",
      "دفعٌ بكلّ القوّة ⟵ نصفُ القوّة يكفي ويُحتمل ٣٠ ثانية.",
    ], [
      "The elbow drifting away from the body → keep the towel between the elbow and the side.",
      "Shrugging or leaning the trunk → shoulder down, trunk still.",
      "Pushing with full force → half effort is enough and can be held for 30 seconds.",
    ]],
    easier: ["ثباتٌ أقصر (١٠ ثوانٍ) وشدّةٌ أخفّ، أو في الاستلقاء على الظهر واليدُ الأخرى تقاوم.", "Shorter holds (10 seconds) at a lighter effort, or lying on the back with the other hand resisting."],
    harder: ["ثباتٌ ٤٥ ثانية بشدّةٍ أعلى، ثمّ الانتقالُ إلى الدوران الخارجيّ بالمطّاط.", "45-second holds at a higher effort, then progress to band external rotation."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أو يبقى بعد التمرين، أو تنميلٌ في الذراع.", "Pain above 5/10 or persisting after exercise, or tingling in the arm."],
    equipment: ["حائطٌ أو إطارُ باب، ومنشفةٌ صغيرة.", "A wall or door frame, and a small towel."],
    doseNote: ["يومياً، مرّةً أو مرّتين.", "Daily, once or twice."],
    images: [{ key: "isometric-er-1", ar: "المرفقُ ملاصقٌ للجسم، وظهرُ اليد يضغط للخارج على الحائط", en: "Elbow at the side, the back of the hand pressing outwards into a wall", search: "isometric shoulder external rotation wall" }],
  },
  {
    code: "isometric-abduction", nameAr: "الإبعاد الثابت (المرفقُ يضغط جانباً على الحائط)", nameEn: "Isometric shoulder abduction (against a wall)",
    kind: "strength", region: "shoulder", perSide: true, sets: 1, reps: 5, hold: 30, rest: 60,
    purpose: ["يحمّل الوترَ فوق الشوكة (Supraspinatus) والعضلةَ الدالّية بلا رفعٍ للذراع ولا حركة — والوترُ فوق الشوكة أكثرُ الأوتار تأثّراً في ألم تحت الأخرم.",
      "Loads the supraspinatus tendon and the deltoid without lifting the arm or moving — the supraspinatus is the tendon most often involved in subacromial pain."],
    start: ["واقفٌ بجانب الحائط والكتفُ المؤلم نحوه، والذراعُ بجانب الجسم والمرفقُ مثنيٌّ ٩٠°، ووسادةٌ صغيرة أو منشفةٌ مطويّة بين المرفق والحائط.",
      "Standing side-on to the wall with the painful shoulder towards it, the arm by the side and the elbow bent to 90°, with a small cushion or folded towel between the elbow and the wall."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل برفق.",
      "ادفع بالمرفق جانباً في الحائط كأنّك تبعد الذراعَ عن الجسم — بلا حركة — بنحو نصف قوّتك أو أقلّ.",
      "اثبت ٣٠ ثانية وتنفّس، والألمُ لا يزيد على ٣ من ١٠.",
      "أرخِ دقيقةً ثمّ كرّر حتى ٥ مرّات.",
    ], [
      "Gently set the shoulder blade back and down.",
      "Push the elbow sideways into the wall as if lifting the arm away from the body — without moving — at about half your strength or less.",
      "Hold for 30 seconds and breathe, with pain no higher than 3/10.",
      "Relax for a minute, then repeat up to 5 times.",
    ]],
    cues: [[
      "ميلُ الجذع بعيداً عن الحائط ⟵ الجذعُ منتصب، والدفعُ من الكتف.",
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ إلى الأسفل.",
      "حبسُ النفس ⟵ تنفّس طوال الثبات.",
    ], [
      "Leaning the trunk away from the wall → stay upright; the push comes from the shoulder.",
      "Shrugging towards the ear → shoulder down.",
      "Holding the breath → keep breathing through the hold.",
    ]],
    easier: ["ثباتٌ أقصر (١٠ ثوانٍ) وشدّةٌ أخفّ.", "Shorter holds (10 seconds) at a lighter effort."],
    harder: ["ثباتٌ ٤٥ ثانية بشدّةٍ أعلى، ثمّ الانتقالُ إلى رفع الذراع في مستوى لوح الكتف.", "45-second holds at a higher effort, then progress to the scaption raise."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أو يبقى بعد التمرين، أو تنميلٌ في الذراع.", "Pain above 5/10 or persisting after exercise, or tingling in the arm."],
    equipment: ["حائط، ووسادةٌ صغيرة أو منشفة.", "A wall, and a small cushion or towel."],
    doseNote: ["يومياً، مرّةً أو مرّتين.", "Daily, once or twice."],
    images: [{ key: "isometric-abduction-1", ar: "المرفقُ مثنيٌّ بجانب الجسم ويضغط جانباً على الحائط", en: "Elbow bent at the side, pressing outwards into the wall", search: "isometric shoulder abduction wall" }],
  },
  {
    code: "cross-body-stretch", nameAr: "تمطيط خلف الكتف بسحب الذراع عبر الصدر", nameEn: "Cross-body posterior shoulder stretch",
    kind: "stretch", region: "shoulder", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يليّن المحفظةَ والعضلاتِ الخلفية للكتف — وتيبّسُها يُنقص الدورانَ الداخليّ ويغيّر حركةَ رأس العضد عند رفع الذراع. يُعطى لمن عنده نقصٌ في الدوران الداخليّ أو تيبّسٌ خلفيّ في التقييم.",
      "Loosens the posterior capsule and muscles of the shoulder — whose tightness reduces internal rotation and alters how the humeral head moves during arm elevation. Given to those with an internal-rotation deficit or posterior tightness on assessment."],
    start: ["واقفٌ أو جالسٌ منتصباً، والذراعُ المؤلمة ممدودةٌ أمامك بمستوى الكتف أو أخفض قليلاً.",
      "Standing or sitting tall, with the painful arm straight out in front at or slightly below shoulder height."],
    steps: [[
      "اسحب الذراعَ المؤلمة عبر الصدر باليد الأخرى ممسكاً بها فوق المرفق.",
      "اضبط لوحَ الكتف للخلف والأسفل كي لا يتبع الذراعَ إلى الأمام — فيكون الشدُّ في مؤخّرة الكتف.",
      "اثبت ٣٠ ثانية على شدٍّ مريح وتنفّس.",
      "أرخِ ثمّ كرّر ٣ مرّات.",
    ], [
      "Pull the painful arm across the chest with the other hand, holding it just above the elbow.",
      "Set the shoulder blade back and down so it does not follow the arm forwards — the stretch is felt at the back of the shoulder.",
      "Hold for 30 seconds at a comfortable stretch and breathe.",
      "Release, then repeat 3 times.",
    ]],
    cues: [[
      "الشدُّ في مقدّمة الكتف أو ألمٌ حادّ ⟵ ذراعٌ أخفض وسحبٌ أقلّ.",
      "دورانُ الجذع مع الذراع ⟵ الجذعُ يواجه الأمام.",
      "السحبُ على المفصل نفسِه ⟵ امسك فوق المرفق، والكتفُ إلى الأسفل.",
    ], [
      "Stretch felt at the front of the shoulder, or sharp pain → a lower arm and a gentler pull.",
      "The trunk turning with the arm → keep the trunk facing forwards.",
      "Pulling on the joint itself → hold above the elbow, with the shoulder down.",
    ]],
    easier: ["سحبٌ أخفّ، أو الذراعُ أخفض.", "A gentler pull, or the arm lower."],
    harder: ["مستلقٍ على الظهر ولوحُ الكتف مثبَّتٌ على السرير، يسحب الذراعَ عبر الصدر.", "Lying on the back with the shoulder blade pinned against the bed, pulling the arm across the chest."],
    stopIf: ["ألمٌ حادّ أو قرصٌ في مقدّمة الكتف، أو تنميلٌ في الذراع.", "Sharp pain or pinching at the front of the shoulder, or tingling in the arm."],
    equipment: ["لا شيء.", "None."],
    doseNote: ["مرّتان يومياً لمن عنده تيبّسٌ خلفيّ.", "Twice daily for those with posterior tightness."],
    images: [{ key: "cross-body-stretch-1", ar: "اليدُ الأخرى تسحب الذراعَ المؤلمة عبر الصدر من فوق المرفق", en: "The other hand pulling the painful arm across the chest from above the elbow", search: "cross body shoulder stretch" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "side-lying-er", nameAr: "الدوران الخارجيّ في الاستلقاء على الجنب بثقل", nameEn: "Side-lying external rotation with a weight",
    kind: "strength", region: "shoulder", perSide: true, sets: 3, reps: 15, rest: 60,
    purpose: ["يقوّي الدوّاراتِ الخارجية (الشوكيّة السفلى والمدوّرة الصغرى) التي تُبقي رأسَ العضد في مركزه أثناء رفع الذراع — وهي في قلب برامج التمارين التي خفّضت الألمَ والحاجةَ إلى الجراحة؛ والنزولُ البطيء يحمّل الوترَ تحميلاً لامركزياً (Eccentric).",
      "Strengthens the external rotators (infraspinatus and teres minor), which keep the humeral head centred during arm elevation — at the heart of the exercise programmes that reduced pain and the need for surgery; the slow lowering loads the tendon eccentrically."],
    start: ["مستلقٍ على الجنب السليم والرأسُ على وسادة، والمرفقُ العلويّ مثنيٌّ ٩٠° وملاصقٌ للجسم ومنشفةٌ ملفوفة بينهما، والساعدُ أمام البطن والثقلُ في اليد.",
      "Lying on the good side with the head on a pillow, the top elbow bent to 90° and tucked against the side with a rolled towel in between, the forearm across the stomach holding the weight."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل.",
      "أدِر الساعدَ إلى الأعلى ببطءٍ في ثانيتين، والمرفقُ ثابتٌ على المنشفة.",
      "توقّف قبل أن يتحرّك الكتفُ أو يدور الجذعُ للخلف.",
      "أنزل الثقلَ ببطءٍ في ٣ ثوانٍ.",
      "أكمل التكرارات ثمّ استرح.",
    ], [
      "Set the shoulder blade back and down.",
      "Rotate the forearm upwards slowly over 2 seconds, keeping the elbow fixed on the towel.",
      "Stop before the shoulder moves or the trunk rolls backwards.",
      "Lower the weight slowly over 3 seconds.",
      "Complete the set, then rest.",
    ]],
    cues: [[
      "دورانُ الجذع للخلف لرفع الثقل ⟵ الجذعُ ثابت، وثقلٌ أخفّ.",
      "ابتعادُ المرفق عن الجسم ⟵ المنشفةُ تبقى في مكانها.",
      "إسقاطُ الثقل ⟵ نزولٌ بطيء في ٣ ثوانٍ — هو الجزءُ الأهمّ.",
    ], [
      "Rolling the trunk back to lift the weight → keep the trunk still and use a lighter weight.",
      "The elbow lifting away from the body → keep the towel in place.",
      "Dropping the weight → lower slowly over 3 seconds — it is the most important part.",
    ]],
    easier: ["بلا ثقل، أو مدىً أصغر، أو الانقباضُ الثابت عند الحائط.", "Without a weight, a smaller range, or the isometric version against a wall."],
    harder: ["ثقلٌ أكبر بخطواتٍ صغيرة (٠٫٥–١ كغ)، ثمّ ٣ × ٨ بثقلٍ أثقل.", "A heavier weight in small steps (0.5–1 kg), then 3 × 8 with a heavier weight."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أثناء التمرين أو لا يهدأ حتى صباح اليوم التالي، أو تنميلٌ في الذراع.", "Pain above 5/10 during exercise or not settled by the next morning, or tingling in the arm."],
    equipment: ["ثقلٌ خفيف (٠٫٥–٣ كغ) أو قنينةُ ماء، ومنشفةٌ ووسادة.", "A light weight (0.5–3 kg) or a water bottle, a towel and a pillow."],
    doseNote: ["يومياً بحملٍ خفيف (٣ × ١٥)، ويوماً بعد يوم حين يثقل الحمل (٣ × ٨–١٢).", "Daily at a light load (3 × 15); on alternate days once the load is heavy (3 × 8–12)."],
    images: [{ key: "side-lying-er-1", ar: "مستلقٍ على الجنب والمرفقُ ملاصقٌ للجسم، يرفع الثقلَ بتدوير الساعد إلى الأعلى", en: "Side-lying with the elbow at the side, rotating the forearm up with a weight", search: "side lying external rotation dumbbell" }],
  },
  {
    code: "band-er", nameAr: "الدوران الخارجيّ بالمطّاط (منشفةٌ تحت الذراع)", nameEn: "Resistance band external rotation (towel under the arm)",
    kind: "strength", region: "shoulder", perSide: true, sets: 3, reps: 15, rest: 60,
    purpose: ["يقوّي الدوّاراتِ الخارجية في الوقوف بمقاومةٍ تزيد تدريجياً — ويصير في المرحلة الأخيرة بالذراع مرفوعةً ٩٠° لمن يعمل أو يلعب فوق رأسه.",
      "Strengthens the external rotators in standing against a resistance that increases gradually — and in the last phase with the arm raised to 90° for those who work or play overhead."],
    start: ["واقفٌ والمطّاطُ مثبَّتٌ بمستوى المرفق من جهة الذراع السليمة (مقبضُ باب)، تمسكه باليد المؤلمة، والمرفقُ مثنيٌّ ٩٠° وملاصقٌ للجسم ومنشفةٌ ملفوفة بينهما، والساعدُ أمام البطن.",
      "Standing with the band anchored at elbow height on the side of the good arm (a door handle), held in the hand of the painful arm, the elbow bent to 90° and tucked against the side with a rolled towel in between, the forearm across the stomach."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل.",
      "أدِر الساعدَ للخارج بعيداً عن البطن في ثانيتين، والمرفقُ ثابت.",
      "توقّف حين يصير الساعدُ إلى الأمام أو للخارج قليلاً، والألمُ لا يزيد على ٥ من ١٠.",
      "عُد ببطءٍ في ٣ ثوانٍ دون أن يُفلت المطّاط.",
      "أكمل التكرارات.",
    ], [
      "Set the shoulder blade back and down.",
      "Rotate the forearm outwards away from the stomach over 2 seconds, keeping the elbow fixed.",
      "Stop when the forearm points forwards or slightly outwards, with pain no higher than 5/10.",
      "Return slowly over 3 seconds without letting the band snap back.",
      "Complete the set.",
    ]],
    cues: [[
      "ابتعادُ المرفق عن الجسم ⟵ المنشفةُ لا تسقط.",
      "ثنيُ الرسغ أو دورانُ الجذع ⟵ الرسغُ مستقيم، والحركةُ من الكتف.",
      "عودةٌ مرتدّةٌ سريعة ⟵ عودةٌ بطيئةٌ متحكَّمٌ بها.",
    ], [
      "The elbow moving away from the body → the towel must not drop.",
      "Bending the wrist or turning the trunk → keep the wrist straight; the movement comes from the shoulder.",
      "A fast, snapping return → a slow, controlled return.",
    ]],
    easier: ["مطّاطٌ أخفّ أو مدىً أصغر، أو الانقباضُ الثابت عند الحائط.", "A lighter band or a smaller range, or the isometric version against a wall."],
    harder: ["مطّاطٌ أقوى، ثمّ بالذراع مرفوعةً جانباً ٩٠° والمرفقُ مثنيٌّ ٩٠° (لمن يعمل أو يلعب فوق رأسه) في المرحلة الأخيرة.",
      "A stronger band, then with the arm raised to the side at 90° and the elbow bent to 90° (for those who work or play overhead) in the last phase."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أثناء التمرين أو لا يهدأ حتى صباح اليوم التالي، أو تنميلٌ في الذراع.", "Pain above 5/10 during exercise or not settled by the next morning, or tingling in the arm."],
    equipment: ["مطّاطُ مقاومةٍ بدرجات، ونقطةُ تثبيت، ومنشفةٌ صغيرة.", "Resistance bands of graded strength, an anchor point, and a small towel."],
    doseNote: ["يومياً بحملٍ خفيف (٣ × ١٥)، ويوماً بعد يوم حين يثقل الحمل (٣ × ٨–١٢).", "Daily at a light load (3 × 15); on alternate days once the load is heavy (3 × 8–12)."],
    images: [{ key: "band-er-1", ar: "المرفقُ ملاصقٌ للجسم ومنشفةٌ تحته، والساعدُ يدور للخارج ضدّ المطّاط", en: "Elbow at the side with a towel, the forearm rotating outwards against a band", search: "resistance band external rotation towel" }],
  },
  {
    code: "band-ir", nameAr: "الدوران الداخليّ بالمطّاط", nameEn: "Resistance band internal rotation",
    kind: "strength", region: "shoulder", perSide: true, sets: 3, reps: 15, rest: 60,
    purpose: ["يقوّي الدوّاراتِ الداخلية (تحت الكتف Subscapularis) ليتوازن الكتفُ من الأمام والخلف — ويُبنى مع الدوران الخارجيّ لا بدله.",
      "Strengthens the internal rotators (subscapularis) so the shoulder is balanced front and back — built alongside external rotation, not instead of it."],
    start: ["واقفٌ والمطّاطُ مثبَّتٌ بمستوى المرفق من جهة الذراع المؤلمة، تمسكه بيدها، والمرفقُ مثنيٌّ ٩٠° وملاصقٌ للجسم ومنشفةٌ بينهما، والساعدُ إلى الخارج قليلاً.",
      "Standing with the band anchored at elbow height on the side of the painful arm, held in that hand, the elbow bent to 90° and tucked against the side with a towel in between, the forearm turned slightly outwards."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل.",
      "اسحب الساعدَ نحو البطن في ثانيتين، والمرفقُ ثابتٌ على المنشفة.",
      "توقّف حين تقترب اليدُ من البطن.",
      "عُد ببطءٍ في ٣ ثوانٍ.",
      "أكمل التكرارات.",
    ], [
      "Set the shoulder blade back and down.",
      "Pull the forearm in towards the stomach over 2 seconds, keeping the elbow fixed on the towel.",
      "Stop as the hand nears the stomach.",
      "Return slowly over 3 seconds.",
      "Complete the set.",
    ]],
    cues: [[
      "ابتعادُ المرفق عن الجسم ⟵ المنشفةُ لا تسقط.",
      "دورانُ الجذع نحو المطّاط ⟵ الجذعُ ثابتٌ ويواجه الأمام.",
      "انحناءُ الكتف إلى الأمام ⟵ الصدرُ مفتوح واللوحُ مضبوط.",
    ], [
      "The elbow moving away from the body → the towel must not drop.",
      "Turning the trunk towards the band → keep the trunk still and facing forwards.",
      "The shoulder rolling forwards → chest open and shoulder blade set.",
    ]],
    easier: ["مطّاطٌ أخفّ أو مدىً أصغر.", "A lighter band or a smaller range."],
    harder: ["مطّاطٌ أقوى، أو بالذراع مرفوعةً جانباً ٩٠° في المرحلة الأخيرة لمن يعمل فوق رأسه.", "A stronger band, or with the arm raised to the side at 90° in the last phase for those who work overhead."],
    stopIf: ["ألمٌ في مقدّمة الكتف يزيد على ٥ من ١٠، أو تنميلٌ في الذراع.", "Pain at the front of the shoulder above 5/10, or tingling in the arm."],
    equipment: ["مطّاطُ مقاومة، ونقطةُ تثبيت، ومنشفةٌ صغيرة.", "A resistance band, an anchor point, and a small towel."],
    doseNote: ["يومياً بحملٍ خفيف (٣ × ١٥)، ويوماً بعد يوم حين يثقل الحمل (٣ × ٨–١٢).", "Daily at a light load (3 × 15); on alternate days once the load is heavy (3 × 8–12)."],
    images: [{ key: "band-ir-1", ar: "المرفقُ ملاصقٌ للجسم، والساعدُ يُسحب نحو البطن ضدّ المطّاط", en: "Elbow at the side, the forearm pulled in towards the stomach against a band", search: "resistance band internal rotation shoulder" }],
  },
  {
    code: "scaption-raise", nameAr: "رفع الذراع في مستوى لوح الكتف والإبهامُ إلى الأعلى", nameEn: "Scaption raise (thumb up)",
    kind: "strength", region: "shoulder", perSide: true, sets: 3, reps: 15, rest: 60,
    purpose: ["يقوّي الوترَ فوق الشوكة والدالّيةَ وعضلاتِ لوح الكتف معاً في أكثر حركةٍ يحتاجها المريض: رفعُ الذراع — في مستوى لوح الكتف (٣٠° أمام الجانب) والإبهامُ إلى الأعلى، وهو أريحُ للكتف المؤلم من الرفع جانباً والإبهامُ إلى الأسفل؛ والنزولُ البطيء تحميلٌ لامركزيّ للوتر.",
      "Strengthens the supraspinatus, deltoid and scapular muscles together in the movement patients need most — raising the arm — in the scapular plane (30° forward of the side) with the thumb up, which is kinder to a painful shoulder than a side raise with the thumb down; the slow lowering loads the tendon eccentrically."],
    start: ["واقفٌ منتصباً والقدمان بعرض الورك، والثقلُ في اليد والذراعُ بجانب الجسم، والإبهامُ إلى الأمام.",
      "Standing tall with the feet hip-width apart, the weight in the hand, the arm by the side and the thumb pointing forwards."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل.",
      "ارفع الذراعَ ممدودةً في ثانيتين بزاويةٍ ٣٠° أمام الجانب والإبهامُ إلى الأعلى — حتى مستوى الكتف أوّلاً.",
      "توقّف لحظةً في الأعلى بلا رفعٍ للكتف نحو الأذن.",
      "أنزل الذراعَ ببطءٍ في ٣ ثوانٍ.",
      "أكمل التكرارات؛ والمدى يرتفع فوق الكتف حين يصير الرفعُ بلا ألمٍ يزيد على ٣ من ١٠ وبلا رفعٍ للكتف.",
    ], [
      "Set the shoulder blade back and down.",
      "Raise the straight arm over 2 seconds at 30° forward of the side with the thumb up — to shoulder height at first.",
      "Pause briefly at the top without hitching the shoulder towards the ear.",
      "Lower the arm slowly over 3 seconds.",
      "Complete the set; the range rises above shoulder height once the lift is no more than 3/10 painful and free of shoulder hitching.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن (تعويض) ⟵ ثقلٌ أخفّ أو مدىً أقلّ، واللوحُ إلى الأسفل.",
      "ميلُ الجذع للخلف أو للجانب ⟵ الجذعُ منتصبٌ والبطنُ مشدودٌ خفيفاً.",
      "تدويرُ الإبهام إلى الأسفل ⟵ الإبهامُ إلى الأعلى طوال الحركة.",
    ], [
      "Hitching the shoulder towards the ear (compensation) → a lighter weight or a smaller range, with the shoulder blade down.",
      "Leaning the trunk back or sideways → stay upright with a light abdominal brace.",
      "Turning the thumb down → keep the thumb up throughout.",
    ]],
    easier: ["بلا ثقل، أو حتى ٦٠–٩٠° فقط، أو بالذراعين معاً.", "Without a weight, only to 60–90°, or with both arms together."],
    harder: ["ثقلٌ أكبر بخطواتٍ صغيرة، ثمّ المدى كاملاً فوق الرأس، ثمّ ٣ × ٨ بثقلٍ أثقل.", "A heavier weight in small steps, then the full range overhead, then 3 × 8 with a heavier weight."],
    stopIf: ["ألمٌ حادّ، أو ألمٌ يزيد على ٥ من ١٠ لا يخفّ بإنقاص المدى، أو ألمٌ لا يهدأ حتى الصباح.", "Sharp pain, pain above 5/10 that does not ease with a smaller range, or pain not settled by the morning."],
    equipment: ["ثقلٌ خفيف (٠٫٥–٣ كغ) أو قنينةُ ماء.", "A light weight (0.5–3 kg) or a water bottle."],
    doseNote: ["يومياً بحملٍ خفيف (٣ × ١٥)، ويوماً بعد يوم حين يثقل الحمل (٣ × ٨–١٢).", "Daily at a light load (3 × 15); on alternate days once the load is heavy (3 × 8–12)."],
    images: [{ key: "scaption-raise-1", ar: "واقفٌ يرفع الذراعَ ممدودةً بزاويةٍ أمام الجانب والإبهامُ إلى الأعلى", en: "Standing, raising the straight arm slightly forward of the side with the thumb up", search: "scaption exercise thumbs up" }],
  },
  {
    code: "wall-slide-serratus", nameAr: "زلق الساعدين على الحائط (العضلة المنشاريّة الأمامية)", nameEn: "Forearm wall slide (serratus anterior)",
    kind: "motor_control", region: "shoulder", sets: 2, reps: 10, rest: 45,
    purpose: ["يدرّب لوحَ الكتف على الدوران للأعلى والالتصاق بالقفص الصدريّ أثناء رفع الذراع — بالعضلة المنشاريّة الأمامية والشبه المنحرفة السفلى — والساعدان على الحائط يحملان جزءاً من ثقل الذراع فتُرفع بألمٍ أقلّ.",
      "Trains the shoulder blade to rotate upwards and stay against the ribcage during arm elevation — with the serratus anterior and lower trapezius — while the forearms on the wall take some of the arm's weight, so it rises with less pain."],
    start: ["واقفٌ مواجهاً الحائط على بعد خطوةٍ قصيرة، والساعدان على الحائط بعرض الكتفين بمستوى الوجه والمرفقان مثنيّان، وقدمٌ أمام الأخرى.",
      "Standing facing the wall a short step away, the forearms on the wall at shoulder width and face height with the elbows bent, one foot in front of the other."],
    steps: [[
      "ادفع الساعدين في الحائط برفق كأنّك تبعد صدرك عنه — فينفرج اللوحان قليلاً.",
      "ازلق الساعدين إلى الأعلى على الحائط ببطءٍ مع الزفير.",
      "توقّف قبل الألم أو حين يرتفع الكتفان نحو الأذنين.",
      "عُد إلى الأسفل ببطء والضغطُ على الحائط مستمرّ.",
      "كرّر ١٠ مرّات.",
    ], [
      "Press the forearms gently into the wall as if pushing your chest away from it — the shoulder blades spread slightly.",
      "Slide the forearms up the wall slowly as you breathe out.",
      "Stop before pain or when the shoulders start to rise towards the ears.",
      "Slide back down slowly, keeping the pressure on the wall.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "رفعُ الكتفين نحو الأذنين ⟵ الكتفان إلى الأسفل، والمدى أقلّ.",
      "تقوّسُ أسفل الظهر ⟵ البطنُ مشدودٌ خفيفاً والقدمُ الأمامية تحملك.",
      "تركُ الضغط على الحائط ⟵ الدفعُ الخفيف مستمرٌّ طوال الحركة.",
    ], [
      "Shrugging towards the ears → shoulders down, and a smaller range.",
      "Arching the low back → a light abdominal brace with the front foot taking the weight.",
      "Losing the pressure on the wall → keep a light push throughout the movement.",
    ]],
    easier: ["مدىً أصغر، أو بلا دفعٍ في الحائط.", "A smaller range, or without pushing into the wall."],
    harder: ["بمطّاطٍ دائريّ حول الساعدين يُدفع للخارج، أو رفعُ الساعدين عن الحائط لحظةً في الأعلى.", "With a loop band around the forearms pushed outwards, or lifting the forearms off the wall briefly at the top."],
    stopIf: ["ألمٌ حادّ في الكتف أو ألمٌ يزيد على ٥ من ١٠، أو تنميلٌ في الذراعين.", "Sharp shoulder pain or pain above 5/10, or tingling in the arms."],
    equipment: ["حائط، ومطّاطٌ دائريّ للتصعيب.", "A wall, and a loop band for progression."],
    doseNote: ["يومياً أو يوماً بعد يوم.", "Daily or on alternate days."],
    images: [{ key: "wall-slide-serratus-1", ar: "مواجهاً الحائط والساعدان عليه ينزلقان إلى الأعلى", en: "Facing the wall with the forearms sliding up it", search: "serratus wall slide forearms" }],
  },
  {
    code: "doorway-pec-stretch", nameAr: "تمطيط عضلة الصدر عند إطار الباب", nameEn: "Doorway pectoral stretch",
    kind: "stretch", region: "shoulder", perSide: true, sets: 1, reps: 3, hold: 30, rest: 15,
    purpose: ["يطيل عضلةَ الصدر الصغرى (Pectoralis minor) التي تقصر مع الانحناء الطويل إلى الأمام، فتميل لوحَ الكتف إلى الأمام وتحدّ من دورانه للأعلى عند رفع الذراع. يُعطى لمن عنده قصرٌ فيها في التقييم.",
      "Lengthens the pectoralis minor, which shortens with prolonged slouching, tilting the shoulder blade forwards and limiting its upward rotation when the arm is raised. Given to those found to have a short pectoralis minor on assessment."],
    start: ["واقفٌ في إطار الباب، والساعدُ المؤلم على حافّته والمرفقُ بمستوى الكتف أو أعلى قليلاً ومثنيٌّ ٩٠°، وقدمُ الجهة نفسِها أمام الأخرى.",
      "Standing in a doorway with the forearm of the painful side on the frame, the elbow at or slightly above shoulder height and bent to 90°, the foot on the same side in front."],
    steps: [[
      "اضبط لوحَ الكتف للخلف والأسفل.",
      "اخطُ إلى الأمام ببطءٍ وأدِر الجذعَ قليلاً بعيداً عن الباب حتى تشعر بشدٍّ في مقدّمة الصدر تحت الترقوة.",
      "اثبت ٣٠ ثانية وتنفّس.",
      "عُد ثمّ كرّر ٣ مرّات.",
    ], [
      "Set the shoulder blade back and down.",
      "Step forwards slowly and turn the trunk slightly away from the door until you feel a stretch across the front of the chest below the collarbone.",
      "Hold for 30 seconds and breathe.",
      "Return, then repeat 3 times.",
    ]],
    cues: [[
      "ألمٌ أو قرصٌ في مقدّمة الكتف ⟵ المرفقُ أخفض وخطوةٌ أصغر.",
      "بروزُ الرأس أو تقوّسُ أسفل الظهر ⟵ الرأسُ فوق الكتفين والبطنُ مشدودٌ خفيفاً.",
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ إلى الأسفل.",
    ], [
      "Pain or pinching at the front of the shoulder → a lower elbow and a smaller step.",
      "Poking the head forwards or arching the low back → head over the shoulders and a light abdominal brace.",
      "Shrugging towards the ear → shoulder down.",
    ]],
    easier: ["المرفقُ أخفض من الكتف وخطوةٌ أصغر.", "The elbow below shoulder height and a smaller step."],
    harder: ["ثباتٌ ٤٥–٦٠ ثانية، أو المرفقُ أعلى قليلاً.", "Holds of 45–60 seconds, or the elbow slightly higher."],
    stopIf: ["ألمٌ في الكتف، أو تنميلٌ أو وخزٌ في الذراع واليد.", "Shoulder pain, or numbness or tingling in the arm and hand."],
    equipment: ["إطارُ باب.", "A doorway."],
    doseNote: ["مرّتان يومياً لمن عنده قصرٌ في عضلة الصدر.", "Twice daily for those with a short pectoralis minor."],
    images: [{ key: "doorway-pec-stretch-1", ar: "الساعدُ على إطار الباب والجسمُ يتقدّم خطوةً إلى الأمام", en: "Forearm on the door frame, the body stepping forwards", search: "doorway pec stretch one arm" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "wall-push-up-plus", nameAr: "الضغط على الحائط مع دفعٍ إضافيّ (بلس)", nameEn: "Wall push-up plus",
    kind: "strength", region: "shoulder", sets: 3, reps: 10, hold: 2, rest: 60,
    purpose: ["يقوّي العضلةَ المنشاريّة الأمامية في آخر الدفع (الدفعُ الإضافيّ Plus) — وهي التي تُبقي لوحَ الكتف ملتصقاً بالقفص الصدريّ ودوّاراً للأعلى — ويحمّل الكتفَ بالدفع كما في الحياة اليومية، بحملٍ يبدأ خفيفاً على الحائط ويزيد على الطاولة.",
      "Strengthens the serratus anterior at the end of the push (the 'plus') — the muscle that keeps the shoulder blade against the ribcage and rotating upwards — and loads the shoulder in pushing as in daily life, starting light on the wall and progressing to a table."],
    start: ["واقفٌ مواجهاً الحائط على بعد ذراع، واليدان على الحائط بعرض الكتفين بمستوى الصدر، والجسمُ مستقيمٌ من الرأس إلى الكعبين.",
      "Standing an arm's length from the wall, the hands on the wall at shoulder width and chest height, the body straight from head to heels."],
    steps: [[
      "اثنِ المرفقين فيقترب الصدرُ من الحائط ببطء، والمرفقان ٤٥° عن الجسم.",
      "ادفع لتستقيم الذراعان.",
      "وفي الأعلى ادفع أكثر قليلاً (الدفعُ الإضافيّ) فيبتعد الصدرُ عن الحائط وينفرج اللوحان — بلا ثني المرفقين.",
      "اثبت ثانيتين ثمّ أرخِ اللوحين وكرّر.",
    ], [
      "Bend the elbows so the chest moves slowly towards the wall, the elbows at 45° from the body.",
      "Push back until the arms are straight.",
      "At the top, push a little further (the 'plus') so the chest moves away from the wall and the shoulder blades spread — without bending the elbows.",
      "Hold for 2 seconds, then let the shoulder blades settle and repeat.",
    ]],
    cues: [[
      "هبوطُ الوسط أو بروزُ الورك ⟵ الجسمُ لوحٌ مستقيم والبطنُ مشدود.",
      "رفعُ الكتفين نحو الأذنين ⟵ الكتفان إلى الأسفل والرقبةُ طويلة.",
      "المرفقان بعيدان عن الجسم بزاويةٍ قائمة ⟵ ٤٥° أريحُ للكتف.",
    ], [
      "The middle sagging or the hips sticking out → the body is a straight plank with the abdomen braced.",
      "Shrugging towards the ears → shoulders down and the neck long.",
      "The elbows flared out at right angles → 45° is kinder to the shoulder.",
    ]],
    easier: ["أقربُ إلى الحائط، أو الدفعُ الإضافيّ وحده بلا ثني المرفقين.", "Closer to the wall, or the 'plus' alone without bending the elbows."],
    harder: ["اليدان على طاولةٍ ثابتة أو حافّة مغسلة، ثمّ على الأرض على الركبتين.", "Hands on a stable table or the edge of a sink, then on the floor on the knees."],
    stopIf: ["ألمٌ في مقدّمة الكتف يزيد على ٥ من ١٠، أو ألمٌ في الرسغ، أو تنميلٌ في اليدين.", "Pain at the front of the shoulder above 5/10, wrist pain, or tingling in the hands."],
    equipment: ["حائط، ثمّ طاولةٌ ثابتة.", "A wall, then a stable table."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "wall-push-up-plus-1", ar: "مواجهاً الحائط والذراعان ممدودتان، والصدرُ يُدفع بعيداً عنه في آخر الحركة", en: "Facing the wall with straight arms, pushing the chest away at the end of the movement", search: "wall push up plus serratus" }],
  },
  {
    code: "overhead-shelf-lift", nameAr: "رفع الأغراض إلى رفٍّ عالٍ", nameEn: "Loaded reach to a high shelf",
    kind: "functional", region: "shoulder", perSide: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يعيد إلى الكتف أكثرَ ما يخشاه المريضُ في يومه: رفعُ الأغراض فوق مستوى الرأس — بحملٍ يزيد خطوةً خطوة حتى يقارب ما يحتاجه في البيت أو العمل (الرفوف، الخزائن، نشرُ الغسيل).",
      "Returns to the shoulder what patients fear most in their day — lifting things above head height — with a load increased step by step until it matches what is needed at home or at work (shelves, cupboards, hanging laundry)."],
    start: ["واقفٌ أمام رفٍّ أو خزانةٍ بمستوى الرأس أو أعلى قليلاً، وعلى رفٍّ بمستوى الخصر غرضٌ خفيف (علبةٌ أو قنينةُ ماء ٠٫٥–١ كغ).",
      "Standing facing a shelf or cupboard at or slightly above head height, with a light object (a box or water bottle, 0.5–1 kg) on a shelf at waist height."],
    steps: [[
      "اقترب من الرفّ حتى يكون الغرضُ قريباً من الجسم.",
      "اضبط لوحَ الكتف وارفع الغرضَ بيدك المؤلمة إلى الرفّ العالي، والمرفقُ قريبٌ من الجسم في البداية.",
      "ضعه بهدوء، ثمّ أعِده إلى الرفّ السفليّ ببطءٍ في ٣ ثوانٍ.",
      "كرّر ١٠ مرّات؛ والوزنُ أو الارتفاعُ يزيد حين تصير المجموعاتُ الثلاث بلا ألمٍ يزيد على ٣ من ١٠.",
    ], [
      "Stand close to the shelf so the object stays near the body.",
      "Set the shoulder blade and lift the object with the painful arm onto the high shelf, keeping the elbow close to the body at first.",
      "Place it gently, then bring it back down to the lower shelf slowly over 3 seconds.",
      "Repeat 10 times; increase the weight or the height once all three sets are no more than 3/10 painful.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن أو ميلُ الجذع للخلف ⟵ غرضٌ أخفّ أو رفٌّ أخفض.",
      "الوقوفُ بعيداً والذراعُ ممدودةٌ تحمل الثقل ⟵ قرّب الجسمَ من الرفّ.",
      "إنزالُ الغرض بسرعة ⟵ نزولٌ بطيءٌ متحكَّم.",
    ], [
      "Hitching the shoulder towards the ear or leaning back → a lighter object or a lower shelf.",
      "Standing far away and holding the weight at arm's length → move the body closer to the shelf.",
      "Bringing the object down fast → a slow, controlled lowering.",
    ]],
    easier: ["رفٌّ بمستوى الكتف، أو غرضٌ أخفّ، أو باليدين معاً.", "A shelf at shoulder height, a lighter object, or both hands together."],
    harder: ["غرضٌ أثقل (٢–٥ كغ بحسب العمل)، أو رفٌّ أعلى، أو تكراراتٌ أكثر كما في العمل الحقيقيّ.", "A heavier object (2–5 kg depending on the job), a higher shelf, or more repetitions as in real work."],
    stopIf: ["ألمٌ يزيد على ٥ من ١٠ أو لا يهدأ حتى صباح اليوم التالي، أو ضعفٌ مفاجئ في رفع الذراع.", "Pain above 5/10 or not settled by the next morning, or sudden weakness in lifting the arm."],
    equipment: ["رفٌّ أو خزانة، وأغراضٌ بأوزانٍ مختلفة.", "A shelf or cupboard, and objects of different weights."],
    doseNote: ["يوماً بعد يوم.", "Alternate days."],
    images: [{ key: "overhead-shelf-lift-1", ar: "واقفٌ أمام رفٍّ عالٍ يضع عليه غرضاً بيدٍ واحدة", en: "Standing at a high shelf, placing an object on it with one hand", search: "shoulder exercise lifting to high shelf" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "subacromial-pain-adult",
  summary: [
    "ألمُ تحت الأخرم (Subacromial pain syndrome) واعتلالُ أوتار الكفّة المدوّرة (Rotator cuff tendinopathy) عند البالغين: ألمٌ في أعلى الذراع من الخارج مع رفع الذراع والوصول فوق الرأس والنوم على الكتف، بلا إصابةٍ كبيرة — وهو أشيعُ أسباب ألم الكتف. " +
    "والتسميةُ القديمة «انحشار الكتف» (Impingement) مضلّلة: الوترُ لا «يحتكّ بالعظم» فيتآكل، بل يتهيّج حين يزيد الحملُ عليه عمّا اعتاده، ويقوى بحملٍ متدرّج؛ وعمليةُ توسيع ما تحت الأخرم لم تكن أفضلَ من عمليةٍ وهمية (CSAW 2018 · FIMPACT 2018). " +
    "الأساسُ التمرينُ المتدرّج للكفّة المدوّرة ولوح الكتف — أقوى توصيةٍ في كلّ المراجع (الإرشاداتُ الهولندية 2014 · Pieters 2020 · Steuri 2017) — مع التعليم وتعديل النشاط لا الراحة، والعلاجُ اليدويّ إضافةٌ في البداية، والحقنةُ نافذةٌ قصيرة للتمرين لمن يمنعه الألم، والأجهزةُ مساعدةٌ لا أساس. " +
    "البرنامجُ ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة؛ والتهابُ الأوتار التكلّسيّ، والكتفُ المتجمّدة، والتمزّقُ بعد إصابة، وما بعد إصلاح الكفّة — لكلٍّ بروتوكولُه.",
    "Subacromial pain syndrome and rotator cuff tendinopathy in adults: pain over the outer upper arm with arm elevation, overhead reaching and lying on the shoulder, without significant injury — the most common cause of shoulder pain. " +
    "The old label 'impingement' is misleading: the tendon does not 'rub on the bone' and wear away; it becomes irritable when its load rises above what it is used to, and it strengthens with graded load. Subacromial decompression surgery was no better than placebo surgery (CSAW 2018 · FIMPACT 2018). " +
    "The core is graded rotator cuff and scapular exercise — the strongest recommendation in every source (Dutch guideline 2014 · Pieters 2020 · Steuri 2017) — with education and activity modification rather than rest; manual therapy is an early add-on, an injection is a short window for exercise when pain prevents it, and devices are adjuncts, not the core. " +
    "The programme runs in three phases with session ranges and written progression criteria; calcific tendinopathy, frozen shoulder, traumatic tears and rehabilitation after cuff repair each have their own protocol.",
  ],
  goals: [
    "١. تحسّنُ ألم الكتف وإعاقته (SPADI) ١٣ نقطةً على الأقلّ من ١٠٠ — أعلى حدود الفرق المهمّ سريرياً (٨–١٣، Roy 2009).\n" +
    "٢. خفضُ الألم (NPRS) نقطتين على الأقلّ أو ٣٠٪ من قيمته الأولى، ونومٌ لا يقطعه الألم.\n" +
    "٣. رفعُ الذراع الفعّال كاملاً أو شبهَ كامل (١٦٠° على الأقلّ) بلا رفعٍ للكتف نحو الأذن.\n" +
    "٤. قوّةُ الدوران الخارجيّ والإبعاد ٩٠٪ على الأقلّ من الجهة الأخرى (بمقياس القوّة إن توفّر)، أو كاملةٌ بلا ألمٍ في الفحص اليدويّ.\n" +
    "٥. العودةُ إلى الأنشطة الثلاثة التي اختارها المريضُ في التقييم (PSFS)، ومنها رفعُ الأغراض إلى رفٍّ عالٍ وما يحتاجه عملُه أو رياضتُه فوق الرأس.\n" +
    "٦. استقلالُ المريض ببرنامجٍ منزليٍّ يستمرّ حتى الأسبوع الثاني عشر، وخطّةٌ مكتوبة للنوبة قبل التخرّج.",
    "1. Improve shoulder pain and disability (SPADI) by at least 13 of 100 points — the upper bound of the minimal clinically important difference (8–13, Roy 2009).\n" +
    "2. Reduce pain (NPRS) by at least 2 points or 30% of baseline, with sleep no longer broken by pain.\n" +
    "3. Full or near-full active arm elevation (at least 160°) without hitching the shoulder towards the ear.\n" +
    "4. External rotation and abduction strength at least 90% of the other side (by dynamometer if available), or full and pain-free on manual testing.\n" +
    "5. Return to the three activities the patient chose at baseline (PSFS), including lifting objects to a high shelf and whatever overhead work or sport requires.\n" +
    "6. An independent home programme continuing until week 12, and a written flare-up plan before discharge.",
  ],
  assessment: [
    "التقييمُ الأوّل (قبل أيّ تمرين أو علاجٍ يدويّ):\n" +
    "• فرزُ علامات الخطر — انظر «موانع الاستعمال».\n" +
    "• التشخيصُ سريريّ: ألمٌ في أعلى الذراع من الخارج (منطقةُ الدالّية) يزيد برفع الذراع والوصول فوق الرأس وخلف الظهر والنوم عليه، والحركةُ المنفعلة محفوظةٌ غالباً. ومجموعةُ الاختبارات الخمسة (Michener 2009): نير (Neer)، وهوكنز-كينيدي (Hawkins-Kennedy)، والقوسُ المؤلم (Painful arc بين ٦٠° و١٢٠°)، والعلبةُ الفارغة (Empty can)، ومقاومةُ الدوران الخارجيّ — ثلاثةٌ إيجابيةٌ فأكثر ترجّح التشخيص، وأقلُّ من ثلاثة تُبعده؛ وأقواها منفردةً العلبةُ الفارغة ومقاومةُ الدوران الخارجيّ.\n" +
    "• ما يشبهه ويُستبعد: الرقبة (ألمٌ ينزل تحت المرفق أو تنميل، ويتغيّر بحركة الرقبة)؛ الكتفُ المتجمّدة (نقصٌ واضح في الدوران الخارجيّ المنفعل — لها بروتوكولُها)؛ خشونةُ المفصل الحقّانيّ العضديّ (عمرٌ أكبر وتيبّسٌ في كلّ الاتّجاهات — الأشعة)؛ المفصلُ الأخرميّ الترقويّ (ألمٌ موضعيّ أعلى الكتف يزيد بسحب الذراع عبر الصدر)؛ التكلّس (نوبةُ ألمٍ شديدةٌ مفاجئة — الأشعة، وله بروتوكولُه)؛ والتمزّقُ الكامل (ضعفٌ واضح، وعجزٌ عن إبقاء الذراع مرفوعة Drop arm أو مدوّرةً للخارج ER lag sign).\n" +
    "• الصور: لا روتينية — الأشعةُ لمن لم يتحسّن (BESS/BOA 2015) أو يُشتبه بخشونةٍ أو تكلّس، والسونارُ بعد ستّة أسابيع لمن لم يتحسّن أو يُشتبه بتمزّقٍ كامل (الإرشاداتُ الهولندية 2014) — قرارُ الطبيب. وتغيّراتُ الأوتار في الصور شائعةٌ عند مَن لا يشكون ألماً.\n" +
    "• المريضُ كلُّه: العمل (رفعٌ فوق الرأس، حمل، تكرار) والرياضة، واليدُ الغالبة، والنوم، والسكّريّ والغدّة الدرقية (يرفعان خطرَ الكتف المتجمّدة)، والتدخين، والحقنُ السابقة (عددُها وتاريخُها)، والمعتقداتُ («الوترُ مقطوع»، «الحركةُ تؤذيه») والخوفُ من الحركة.\n" +
    "• المقاييس: الألمُ الآن وأسوأُه في الأسبوع والألمُ الليليّ (NPRS)، وألمُ الكتف وإعاقتُه (SPADI)، وثلاثةُ أنشطةٍ يختارها المريض (PSFS، كلٌّ ٠–١٠)؛ أو QuickDASH بديلاً.\n" +
    "• الفحص: مدى الحركة الفعّال والمنفعل بالمنقلة (الرفعُ الأماميّ والجانبيّ، والدورانُ الخارجيّ والداخليّ، واليدُ خلف الظهر)، والقوسُ المؤلم، وقوّةُ الدوران الخارجيّ والداخليّ والإبعاد (يدوياً أو بمقياس القوّة)، وحركةُ لوح الكتف في الرفع (اختبارُ خلل حركة اللوح Scapular dyskinesis test)، ونقصُ الدوران الداخليّ والتيبّسُ الخلفيّ، وقِصَرُ عضلة الصدر الصغرى، والظهرُ العلويّ والرقبة. واختباراتُ تعديل الأعراض (Symptom modification — مساعدةُ اللوح وسحبُه، وتصحيحُ الوضعية) تقول أيُّ وضعٍ يخفّف ألمَ هذا المريض فيُبنى عليه التمرين.\n" +
    "إعادةُ التقييم: سؤالٌ وفحصٌ قصير في كلّ جلسة (الألمُ والنومُ منذ الجلسة الماضية)، والمقاييسُ كاملةً عند الجلسة السادسة تقريباً وعند الجلسة الأخيرة وفي زيارة المتابعة بعد التخرّج بأربعة أسابيع، ثمّ عند نهاية الأسبوع الثاني عشر. ومَن لم يتحسّن بعد ستّة أسابيع من تمارين ملتزمة يُحال إلى الطبيب لتقييمٍ أوسع (BESS/BOA 2015)، ومَن تحسّن يُكمل ستّةَ أسابيع أخرى؛ ويُراجَع قبلها التشخيصُ (الرقبة، الكتفُ المتجمّدة، التمزّقُ الكامل، التكلّس) والجرعةُ والالتزام. وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.",
    "Initial assessment (before any exercise or manual therapy):\n" +
    "• Red-flag screen — see Contraindications.\n" +
    "• Diagnosis is clinical: pain over the outer upper arm (deltoid region) increased by arm elevation, overhead reaching, reaching behind the back and lying on the shoulder, with passive movement usually preserved. The five-test cluster (Michener 2009): Neer, Hawkins-Kennedy, painful arc (between 60° and 120°), empty can and resisted external rotation — three or more positive make the diagnosis likely, fewer than three make it unlikely; the strongest single tests are the empty can and resisted external rotation.\n" +
    "• Look-alikes to exclude: the neck (pain below the elbow or tingling, changing with neck movement); frozen shoulder (clear loss of passive external rotation — its own protocol); glenohumeral osteoarthritis (older, stiff in every direction — X-ray); the acromioclavicular joint (local pain on top of the shoulder, worse with cross-body adduction); calcific tendinopathy (sudden severe pain — X-ray, its own protocol); and a full-thickness tear (marked weakness, inability to hold the arm raised — drop arm — or rotated outwards — external rotation lag sign).\n" +
    "• Imaging: not routine — X-ray when not improving (BESS/BOA 2015) or when osteoarthritis or calcification is suspected, and ultrasound after six weeks when not improving or when a full-thickness tear is suspected (Dutch guideline 2014) — the doctor's decision. Tendon changes on imaging are common in people with no pain.\n" +
    "• The whole person: work (overhead lifting, carrying, repetition) and sport, hand dominance, sleep, diabetes and thyroid disease (which raise the risk of frozen shoulder), smoking, previous injections (number and dates), beliefs ('the tendon is torn', 'movement damages it') and fear of movement.\n" +
    "• Measures: current and worst pain in the past week and night pain (NPRS), the Shoulder Pain and Disability Index (SPADI), and three patient-chosen activities (PSFS, each 0–10); or QuickDASH as an alternative.\n" +
    "• Examination: active and passive range by goniometer (flexion, abduction, external and internal rotation, hand behind back), the painful arc, external rotation, internal rotation and abduction strength (manual or dynamometer), scapular motion during elevation (scapular dyskinesis test), internal-rotation deficit and posterior tightness, pectoralis minor length, and the upper back and neck. Symptom modification tests (scapular assistance and retraction, posture correction) show which position eases this patient's pain, and the exercise is built on it.\n" +
    "Reassessment: brief questions and re-testing every session (pain and sleep since last time), and the full measures at about session 6, at the last session, at the follow-up visit four weeks after discharge and at the end of week 12. Refer to the doctor for wider assessment if there is no improvement after six weeks of committed exercise (BESS/BOA 2015); those improving continue for another six weeks. Before that, review the diagnosis (neck, frozen shoulder, full-thickness tear, calcification), the dose and adherence. Phase progression follows the criteria, not the session count alone.",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — التهدئة والتعليم والتحميل الثابت (الجلسات ١–٥): ضبطُ لوحَي الكتف، وبسطُ الظهر العلويّ على المنشفة، ورفعُ الذراع بالعصا في الاستلقاء، والدورانُ الخارجيّ الثابت والإبعادُ الثابت عند الحائط، والتجديفُ بمطّاطٍ خفيف، وتمطيطُ خلف الكتف لمن عنده تيبّسٌ خلفيّ.\n" +
    "المرحلة ٢ — التقوية المتدرّجة للكفّة ولوح الكتف (الجلسات ٦–١٢): الدورانُ الخارجيّ على الجنب بثقل، والدورانُ الخارجيّ والداخليّ بالمطّاط، ورفعُ الذراع في مستوى لوح الكتف حتى مستوى الكتف ثمّ فوقه، والتجديف، ورفعُ الذراعين T ثمّ Y في الانبطاح، وزلقُ الساعدين على الحائط، وتمطيطُ عضلة الصدر وخلف الكتف لمن يحتاجهما.\n" +
    "المرحلة ٣ — التحميل الأثقل والوظيفيّ وفوق الرأس (الجلسات ١٣–١٨): الكفّةُ بحملٍ أثقل، والدورانُ والذراعُ مرفوعةٌ ٩٠° لمن يعمل أو يلعب فوق رأسه، والرفعُ كاملاً فوق الرأس، والضغطُ على الحائط مع الدفع الإضافيّ، ورفعُ الأغراض إلى رفٍّ عالٍ، والتجديفُ وT وY بثقل.\n" +
    "البرنامجُ: ١٨ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه: الخفيفُ يكفيه غالباً ٦–١٢ جلسةً مع برنامجٍ منزليٍّ جيّد. " +
    "والدليلُ صريحٌ هنا: التمرينُ المنزليّ الجيّد لم يقلّ عن المشرَف عليه (الإرشاداتُ الهولندية 2014 · Kuhn 2009)، وتمرينٌ واحدٌ يُدار ذاتياً عادل العلاجَ الطبيعيّ المعتاد (Littlewood 2016)، وستُّ جلساتٍ من التمارين المتدرّجة لم تتفوّق على جلسة نصيحةٍ واحدة (GRASP 2021) — فالجلسةُ في المركز للتعليم والتصحيح والتدرّج بالحمل والعلاج اليدويّ في البداية، والفائدةُ من البرنامج المنزليّ اليوميّ. " +
    "وتمارينُ الكفّة بحملٍ خفيفٍ وتكرارٍ كثير (٣ × ١٥ يومياً، كما في Holmgren 2012) حتى يثقل الحملُ في المرحلة الثالثة فتصير يوماً بعد يوم (٣ × ٨–١٢). " +
    "والبرنامجُ المنزليّ يستمرّ بعد الجلسة الأخيرة حتى نهاية الأسبوع الثاني عشر (برامجُ التجارب الرئيسية امتدّت ١٢ أسبوعاً — Holmgren 2012 · Littlewood 2016)، مع زيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع. " + PAIN_RULE_AR,
    "Three-phase programme (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Settle, educate and start isometric loading (sessions 1–5): scapular setting, thoracic extension over a towel, supine wand-assisted flexion, isometric external rotation and abduction against a wall, a light band row, and the cross-body stretch for posterior tightness.\n" +
    "Phase 2 — Progressive cuff and scapular strengthening (sessions 6–12): side-lying external rotation with a weight, band external and internal rotation, the scaption raise to shoulder height and then above, rows, prone T then Y raises, forearm wall slides, and pectoral and posterior shoulder stretches for those who need them.\n" +
    "Phase 3 — Heavier, functional and overhead loading (sessions 13–18): heavier cuff loading, rotation with the arm raised to 90° for overhead workers and athletes, full overhead elevation, the wall push-up plus, loaded reaching to a high shelf, and weighted rows, T and Y raises.\n" +
    "Programme: 18 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient: mild cases usually need 6–12 sessions with a good home programme. " +
    "The evidence is explicit here: a good home programme did no worse than supervised exercise (Dutch guideline 2014 · Kuhn 2009), a single self-managed exercise matched usual physiotherapy (Littlewood 2016), and up to six sessions of progressive exercise were no better than a single advice session (GRASP 2021) — so clinic sessions are for teaching, correction, load progression and early manual therapy, and the benefit comes from the daily home programme. " +
    "Cuff exercises use a light load and many repetitions (3 × 15 daily, as in Holmgren 2012) until the load becomes heavy in phase 3, when they move to alternate days (3 × 8–12). " +
    "The home programme continues after the last session until the end of week 12 (the main trial programmes ran for 12 weeks — Holmgren 2012 · Littlewood 2016), with a follow-up visit and reassessment four weeks after discharge. " + PAIN_RULE_EN,
  ],
  contraindications: [
    "علاماتُ خطرٍ تُوقف البرنامج ويُحال المريضُ إلى الطبيب — ومسارُ BESS/BOA 2015 يسمّي منها الالتهابَ الصديديّ، والخلعَ غيرَ المردود، والتمزّقَ الرضّيّ الحادّ، والورمَ، والتهابَ المفاصل الجديد:\n" +
    "• فوراً (طوارئ، في اليوم نفسِه): كتفٌ حارٌّ أحمرُ متورّم مع حمّى أو توعّكٍ عامّ — اشتباهُ التهابٍ صديديّ في المفصل، خاصّةً بعد حقنةٍ أو مع السكّريّ أو ضعف المناعة؛ أو خلعٌ لم يُردّ (شكلُ الكتف متغيّر والذراعُ لا تتحرّك).\n" +
    "• عاجلاً: ضعفٌ مفاجئ في رفع الذراع بعد إصابةٍ أو سقوط — اشتباهُ تمزّقٍ رضّيّ حادّ في الكفّة المدوّرة، يُحال إلى العيادة التخصّصية في أقرب موعد؛ وبعد سقوطٍ عند كبار السنّ مع ألمٍ شديدٍ وكدمةٍ وعجزٍ عن رفع الذراع — أشعةٌ لاستبعاد الكسر.\n" +
    "• كتلةٌ أو تورّمٌ غيرُ مفسَّر، أو ألمٌ ليليٌّ ثابت لا يتغيّر بالوضعية، أو نقصُ وزنٍ غيرُ مفسَّر، أو سرطانٌ سابق — اشتباهُ ورم: مسارُ الإحالة العاجل.\n" +
    "• التهابُ مفاصل جديد (تورّمُ مفاصل أخرى، تيبّسٌ صباحيّ طويل)، أو ألمٌ وتيبّسٌ في الكتفين معاً أو مع الوركين بعد الخمسين (ألمُ العضلات الروماتيزميّ Polymyalgia rheumatica) — طبيبُ المفاصل عاجلاً.\n" +
    "• ألمٌ في الكتف أو الذراع اليسرى يأتي مع الجهد، أو مع ألمٍ في الصدر أو ضيقِ نفسٍ أو تعرّق — اشتباهٌ قلبيّ: يوقف التمرين ويراه الطبيب فوراً.\n" +
    "• ألمٌ في الكتف لا يتغيّر بحركته مع أعراضٍ في البطن أو الصدر، أو مع سعالٍ مزمن عند مدخّن — ألمٌ منقولٌ من عضوٍ داخليّ: الطبيب.\n" +
    "• ألمٌ ينزل في الذراع مع تنميلٍ أو ضعفٍ في عضلات اليد أو نقصٍ في المنعكسات — اعتلالٌ جذريّ رقبيّ: يُقيَّم ويُعالَج ببروتوكول الرقبة.\n" +
    "• نقصٌ واضح في الدوران الخارجيّ المنفعل مع ألمٍ ليليّ — كتفٌ متجمّدة؛ ونوبةُ ألمٍ حادّةٌ شديدة جداً بلا إصابة — تكلّسٌ محتمل: لكلٍّ منهما بروتوكولُه.",
    "Red flags that stop the programme and require medical referral — the BESS/BOA 2015 pathway names septic arthritis, unreduced dislocation, acute traumatic cuff tear, tumour and new inflammatory arthritis among them:\n" +
    "• Immediately (emergency, same day): a hot, red, swollen shoulder with fever or feeling unwell — suspected septic arthritis, especially after an injection or with diabetes or immunosuppression; or an unreduced dislocation (the shoulder looks deformed and the arm will not move).\n" +
    "• Urgently: sudden weakness lifting the arm after an injury or fall — suspected acute traumatic rotator cuff tear, referred to the specialist clinic at the earliest appointment; and after a fall in an older person with severe pain, bruising and inability to lift the arm — X-ray to exclude a fracture.\n" +
    "• An unexplained mass or swelling, constant night pain unaffected by position, unexplained weight loss or past cancer — suspected tumour: the urgent referral pathway.\n" +
    "• New inflammatory arthritis (other swollen joints, long morning stiffness), or pain and stiffness of both shoulders or of the shoulders and hips after age 50 (polymyalgia rheumatica) — urgent rheumatology.\n" +
    "• Left shoulder or arm pain brought on by exertion, or with chest pain, breathlessness or sweating — suspected cardiac cause: stop exercise and see a doctor immediately.\n" +
    "• Shoulder pain unaffected by shoulder movement with abdominal or chest symptoms, or with a chronic cough in a smoker — pain referred from an internal organ: the doctor.\n" +
    "• Pain radiating down the arm with tingling, weakness of the hand muscles or reduced reflexes — cervical radiculopathy: assessed and treated with the neck protocol.\n" +
    "• Clear loss of passive external rotation with night pain — frozen shoulder; and an attack of very severe acute pain without injury — possible calcific tendinopathy: each has its own protocol.",
  ],
  precautions: [
    "• قاعدةُ مراقبة الألم: " + PAIN_RULE_AR + " وإن زاد الألمُ أكثر أو استمرّ تُخفَّض الجرعةُ في الجلسة القادمة ولا يتوقّف البرنامج.\n" +
    "• الراحةُ نسبيةٌ لا تامّة: تعديلُ النشاط المؤلم (الرفعُ المتكرّر فوق الرأس، والحملُ بعيداً عن الجسم) مؤقتاً، ولا تثبيتَ ولا حمّالة (الإرشاداتُ الهولندية 2014).\n" +
    "• العلاجُ اليدويّ (تحريكُ المفصل الحقّانيّ العضديّ والظهر العلويّ، والأنسجةُ الرخوة) إضافةٌ للتمرين في البداية لا بدلَه (Pieters 2020)، وفائدتُه في الألم صغيرةٌ وقصيرة (Desjardins-Charbonneau 2015). والشريطُ اللاصق (Taping) دليلُه ضعيف — مساعدٌ إن أراح.\n" +
    "• حقنةُ الكورتيزون تخفّف الألمَ في الأسابيع الثمانية الأولى وحدها (الإرشاداتُ الهولندية 2014)، فهي نافذةٌ للتمرين لمن يمنعه الألم لا علاجٌ مستقلّ، ولا أكثرَ من حقنتين (BESS/BOA 2015) — قرارُ الطبيب؛ وبعدها يعود إلى البرنامج بحسب تعليماته، بحملٍ يبدأ أخفّ ويزيد تدريجياً.\n" +
    "• النوم: لا ينام على الكتف المؤلم في البداية، والذراعُ على وسادةٍ أو يحتضنها على الجنب الآخر.\n" +
    "• السكّريّ والغدّة الدرقية يرفعان خطرَ الكتف المتجمّدة — فمَن نقص دورانُه الخارجيّ المنفعل يُعاد تقييمُه؛ وضغطُ الدم: لا حبسَ للنفس مع التقوية.\n" +
    "• لا لغةَ تخويف («الوترُ يحتكّ بالعظم»، «الكتفُ مهترئ»، «لا ترفع يدك») — الوترُ يتكيّف مع الحمل المتدرّج ويقوى به، وتغيّراتُ الصور شائعةٌ بلا ألم.",
    "• Pain-monitoring rule: " + PAIN_RULE_EN + " If pain is higher or lasts longer, reduce the dose at the next session rather than stopping the programme.\n" +
    "• Relative, not complete, rest: temporarily modify painful activities (repeated overhead lifting, carrying away from the body), with no immobilisation and no sling (Dutch guideline 2014).\n" +
    "• Manual therapy (glenohumeral and upper thoracic mobilisation, soft-tissue techniques) is an early add-on to exercise, never instead of it (Pieters 2020), and its effect on pain is small and short-term (Desjardins-Charbonneau 2015). Taping has weak evidence — an adjunct if it helps.\n" +
    "• A corticosteroid injection relieves pain in the first eight weeks only (Dutch guideline 2014), so it is a window for exercise when pain prevents it, not a treatment on its own, and no more than two injections (BESS/BOA 2015) — the doctor's decision; afterwards the patient returns to the programme as the doctor advises, with a lighter load that increases gradually.\n" +
    "• Sleep: avoid lying on the painful shoulder at first, with the arm on a pillow or hugging one when lying on the other side.\n" +
    "• Diabetes and thyroid disease raise the risk of frozen shoulder — reassess anyone whose passive external rotation is reduced; blood pressure: no breath-holding during strengthening.\n" +
    "• No frightening language ('the tendon rubs on the bone', 'your shoulder is worn out', 'don't lift your arm') — the tendon adapts to graded load and strengthens with it, and imaging changes are common without pain.",
  ],
  totalSessions: 18, spw: 6, weeks: 3, minutes: 50,
  refs: [
    { title: "Guideline for diagnosis and treatment of subacromial pain syndrome: a multidisciplinary review by the Dutch Orthopaedic Association", org: "Acta Orthopaedica (Diercks et al.)", year: 2014, url: "https://doi.org/10.3109/17453674.2014.920991" },
    { title: "An Update of Systematic Reviews Examining the Effectiveness of Conservative Physical Therapy Interventions for Subacromial Shoulder Pain", org: "Journal of Orthopaedic & Sports Physical Therapy (Pieters et al.)", year: 2020, url: "https://doi.org/10.2519/jospt.2020.8498" },
    { title: "Effectiveness of conservative interventions including exercise, manual therapy and medical management in adults with shoulder impingement: a systematic review and meta-analysis of RCTs", org: "British Journal of Sports Medicine (Steuri et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-096515" },
    { title: "Effect of specific exercise strategy on need for surgery in patients with subacromial impingement syndrome: randomised controlled study", org: "BMJ (Holmgren et al.)", year: 2012, url: "https://doi.org/10.1136/bmj.e787" },
    { title: "Exercise in the treatment of rotator cuff impingement: a systematic review and a synthesized evidence-based rehabilitation protocol", org: "Journal of Shoulder and Elbow Surgery (Kuhn)", year: 2009, url: "https://doi.org/10.1016/j.jse.2008.06.004" },
    { title: "A self-managed single exercise programme versus usual physiotherapy treatment for rotator cuff tendinopathy: a randomised controlled trial (the SELF study)", org: "Clinical Rehabilitation (Littlewood et al.)", year: 2016, url: "https://doi.org/10.1177/0269215515593784" },
    { title: "Arthroscopic subacromial decompression for subacromial shoulder pain (CSAW): a multicentre, pragmatic, parallel group, placebo-controlled, three-group, randomised surgical trial", org: "The Lancet (Beard et al.)", year: 2018, url: "https://doi.org/10.1016/S0140-6736(17)32457-1" },
    { title: "Subacromial decompression versus diagnostic arthroscopy for shoulder impingement: randomised, placebo surgery controlled clinical trial", org: "BMJ — FIMPACT (Paavola et al.)", year: 2018, url: "https://doi.org/10.1136/bmj.k2860" },
    { title: "Progressive exercise compared with best practice advice, with or without corticosteroid injection, for the treatment of patients with rotator cuff disorders (GRASP): a multicentre, pragmatic, 2 × 2 factorial, randomised controlled trial", org: "The Lancet (Hopewell et al.)", year: 2021, url: "https://doi.org/10.1016/S0140-6736(21)00846-1" },
    { title: "Electrotherapy modalities for rotator cuff disease", org: "Cochrane Database of Systematic Reviews (Page et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.CD012225" },
    { title: "The efficacy of manual therapy for rotator cuff tendinopathy: a systematic review and meta-analysis", org: "Journal of Orthopaedic & Sports Physical Therapy (Desjardins-Charbonneau et al.)", year: 2015, url: "https://doi.org/10.2519/jospt.2015.5455" },
    { title: "The efficacy of low-level laser therapy for shoulder tendinopathy: a systematic review and meta-analysis of randomized controlled trials", org: "Physiotherapy Research International (Haslerud et al.)", year: 2015, url: "https://doi.org/10.1002/pri.1606" },
    { title: "The efficacy of therapeutic ultrasound for rotator cuff tendinopathy: a systematic review and meta-analysis", org: "Physical Therapy in Sport (Desmeules et al.)", year: 2015, url: "https://doi.org/10.1016/j.ptsp.2014.09.004" },
    { title: "Subacromial shoulder pain (BESS/BOA patient care pathway)", org: "Shoulder & Elbow (Kulkarni et al.)", year: 2015, url: "https://doi.org/10.1177/1758573215576456" },
    { title: "Reliability and diagnostic accuracy of 5 physical examination tests and combination of tests for subacromial impingement", org: "Archives of Physical Medicine and Rehabilitation (Michener et al.)", year: 2009, url: "https://doi.org/10.1016/j.apmr.2009.05.015" },
    { title: "Measuring shoulder function: a systematic review of four questionnaires", org: "Arthritis & Rheumatism (Roy, MacDermid, Woodhouse)", year: 2009, url: "https://doi.org/10.1002/art.24396" },
    { title: "Exercises and dry needling for subacromial pain syndrome: a randomized parallel-group trial", org: "The Journal of Pain (Arias-Buría et al.)", year: 2017, url: "https://doi.org/10.1016/j.jpain.2016.08.013" },
    { title: "Capacitive resistive monopolar radiofrequency at 448 kHz plus exercising versus exercising alone for subacromial pain: a sham-controlled randomized clinical trial", org: "Clinical Rehabilitation (Avendaño-Coy et al.)", year: 2022, url: "https://doi.org/10.1177/02692155221107736" },
  ],
  //  التمارين أوّلاً، ثمّ المساعدُ بترتيب الركبة، ثمّ ما لا يُستخدم — ولا شدَّ للكتف. والمساعدُ يؤشّره الأخصائيُّ لمريضه (§4.dd).
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: ٣٠–٣٥ دقيقة في الجلسة مع العلاج اليدويّ والتعليم، والكفّةُ بحملٍ خفيفٍ يومياً ثمّ أثقلَ يوماً بعد يوم، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': 30–35 minutes per session with manual therapy and education, the cuff loaded lightly every day and then more heavily on alternate days, plus the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ المتدرّج للكفّة ولوح الكتف أقوى توصيةٍ في كلّ المراجع (الإرشاداتُ الهولندية 2014 · Pieters 2020 · Steuri 2017)، وخفّض اختيارَ الجراحة من ٦٣٪ إلى ٢٠٪ (Holmgren 2012).",
        "Core in every session — graded cuff and scapular exercise is the strongest recommendation in every source (Dutch guideline 2014 · Pieters 2020 · Steuri 2017), and it cut the choice of surgery from 63% to 20% (Holmgren 2012)."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "20–40", durationMin: "10–15" },
      parameters: ["حول الكتف والمريضُ مستلقٍ أو جالسٌ مسنود والذراعُ مرتاحةٌ على وسادة، واللوحُ المرتدّ تحت لوح الكتف أو أعلى الظهر: السعويّ (Capacitive) حول الكتف ثمّ المقاوِم (Resistive) على الكفّة المدوّرة والدالّية بدفءٍ مريح، وقبل التمارين.",
        "Around the shoulder with the patient lying or in supported sitting and the arm resting on a pillow, the return plate under the shoulder blade or upper back: capacitive mode around the shoulder, then resistive over the rotator cuff and deltoid at a comfortable warmth, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). والدليلُ في ألم الكتف محدود: تجربةٌ مضبوطةٌ بالوهميّ لم تجد فرقاً في الألم ولا في SPADI (Avendaño-Coy 2022)، ولا تذكره الإرشادات. ممنوعٌ مع منظّم ضربات القلب أو المعادن المزروعة في المنطقة (ومنها استبدالُ الكتف) أو الحمل أو الأورام أو ضعف الإحساس.",
        "Rotating adjunct — used by the centre with good results (Saleem). The evidence in shoulder pain is limited: a sham-controlled trial found no difference in pain or SPADI (Avendaño-Coy 2022), and guidelines do not address it. Contraindicated with a pacemaker, metal implants in the area (including a shoulder replacement), pregnancy, tumours or impaired sensation."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الكتف في الوضعية الأكثر راحة، قبل التمارين.",
        "Pulsed electromagnetic field (PEMF) around the shoulder in the most comfortable position, before exercise."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). والدليلُ في ألم الكتف يميل إلى عدم الفائدة: مراجعةُ المراجعات (Pieters 2020) وجدت دليلاً متوسّطاً على أنه بلا أثر، وCochrane (Page 2016) أنه قد لا يفيد. ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
        "Rotating adjunct — used by the centre with good results (Saleem). The evidence in shoulder pain leans towards no benefit: an umbrella review (Pieters 2020) found moderate evidence of no effect, and Cochrane (Page 2016) that it may not help. Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["التحفيزُ الكهربائيّ عبر الجلد التقليديّ (Conventional TENS): قطبان أو أربعةٌ حول الكتف (أمامه وخلفه وعلى الدالّية) بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض، قبل التمارين.",
        "Conventional TENS: two or four electrodes around the shoulder (front, back and over the deltoid) at a strong but comfortable tingling without contraction, before exercise."],
      note: ["مساعدٌ يستعمله المركز (سليم) — والإرشاداتُ الهولندية (2014) وجدت التحفيزَ الكهربائيّ لا يفوق الوهميّ في ألم تحت الأخرم، وCochrane (Page 2016) غيرُ متيقّنةٍ من أثره لضعف الدليل. فإن أبقاه سليمٌ مساعداً فلتهدئة الألم قبل التمرين وحده، ولا يُعطى وحده. ممنوعٌ مع منظّم ضربات القلب، وعلى جلدٍ متضرّر أو ضعيف الإحساس، وعلى مقدّمة الرقبة.",
        "An adjunct used by the centre (Saleem) — but the Dutch guideline (2014) found electrical stimulation no better than placebo in subacromial pain, and Cochrane (Page 2016) is uncertain of its effect owing to weak evidence. If Saleem keeps it as an adjunct, it is for settling pain before exercise only and never on its own. Contraindicated with a pacemaker, on damaged or insensate skin, and over the front of the neck."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على الكتف وأعلى الظهر قبل التمارين لتخفيف الألم والتيبّس، لا بدلها؛ وافحص الجلد قبلها وبعدها. وفي البيت كيسُ ماءٍ دافئ ١٥–٢٠ دقيقة قبل التمارين إن أراح.",
        "Over the shoulder and upper back before exercise to ease pain and stiffness, never instead of it; check the skin before and after. At home, a hot-water bottle for 15–20 minutes before exercising if it helps."],
      note: ["مساعدٌ بالتناوب، قصيرُ المدى لمن تريحه الحرارة؛ والدليلُ محدود. ممنوعٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح، وعلى كتفٍ حارٍّ متورّم.",
        "Rotating adjunct, short-term, for patients eased by heat; limited evidence. Contraindicated with impaired sensation, poor circulation or open wounds, and on a hot, swollen shoulder."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها.", "Alternative to the hot pack when unavailable, with the same precautions."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر؛ لا يُعطى وحده، ولا على كتفٍ حارٍّ متورّم.", "Rotating adjunct — comfortable warmth only; never given alone, and not on a hot, swollen shoulder."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { needleSize: "0.25 × 25–40", points: "2–4", sessions: "1 / week × 2–4" },
      parameters: ["النقاطُ الزنادية (Trigger points) في الشوكيّة السفلى (Infraspinatus) وشبه المنحرفة العليا (Upper trapezius)، وفوق الشوكة (Supraspinatus) والدالّية عند الحاجة، بالإدخال والإخراج السريع حتى الارتعاش الموضعيّ (Local twitch response)، ضمن جلسة التمارين ومعها.",
        "Trigger points in infraspinatus and upper trapezius, and supraspinatus and deltoid when needed, using a fast-in/fast-out technique to elicit local twitch responses, within and alongside the exercise session."],
      note: ["مساعدٌ بالتناوب، للمرخَّص بالإبر الجافة وحده. أُضيفت إلى التمارين في تجربةٍ مضبوطة فحسّنت الإعاقةَ حتى سنةٍ دون فرقٍ في الألم (Arias-Buría 2017)؛ والدليلُ محدود. السلامة: في شبه المنحرفة العليا وفوق الشوكة إمساكٌ بين الإصبعين (Pincer grip) أو إبرةٌ موجّهةٌ بعيداً عن قمّة الرئة (خطرُ استرواح الصدر)؛ ولا يُعطى وحده.",
        "Rotating adjunct, dry-needling certified staff only. Added to exercise in a randomised trial, it improved disability up to one year with no difference in pain (Arias-Buría 2017); limited evidence. Safety: over upper trapezius and supraspinatus use a pincer grip or direct the needle away from the lung apex (pneumothorax risk); never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم في المركز لهذه الحالة حتى يقرّر سليم (لم يذكره). والدليلُ متضارب: الإرشاداتُ الهولندية (2014) وجدته أفضلَ من الوهميّ للألم في أسابيعه الأولى، ومراجعةٌ لسبعَ عشرةَ تجربة (Haslerud 2015) وجدت تخفيفاً للألم بالجرعات الموصى بها وحدها، بينما وجدت مراجعةُ المراجعات (Pieters 2020) دليلاً متوسّطاً على أنه بلا أثر. فإن قرّر سليم استعمالَه صار مساعداً بإعداداته.",
        "Not used by the centre for this condition until Saleem decides (not mentioned by him). The evidence conflicts: the Dutch guideline (2014) found it better than placebo for pain in the first weeks, and a review of seventeen trials (Haslerud 2015) found pain relief at the recommended doses only, while an umbrella review (Pieters 2020) found moderate evidence of no effect. If Saleem chooses to use it, it becomes an adjunct with its settings."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في المركز لهذه الحالة (لم يذكره سليم) — والإرشاداتُ الهولندية (2014) وجدت الأمواجَ فوق الصوتية العلاجية لا تفوق الوهميّ ولا التمرين، ولا تضيف شيئاً إلى التمارين (Desmeules 2015 · Pieters 2020).",
        "Not used by the centre for this condition (not mentioned by Saleem) — the Dutch guideline (2014) found therapeutic ultrasound no better than placebo or exercise, and it adds nothing to exercise (Desmeules 2015 · Pieters 2020)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم لهذه الحالة: بلا تكلّسٍ في الوتر لا تفوق الأمواجُ الصادمة الوهميّ، والإرشاداتُ الهولندية (2014) تقول صراحةً «لا» بلا تكلّس وفي الطور الحادّ — ومكانُها التهابُ الأوتار التكلّسيّ، وله بروتوكولُه.",
        "Not used for this condition: without calcification, shockwave therapy is no better than placebo, and the Dutch guideline (2014) explicitly advises against it without calcification and in the acute phase — its place is calcific tendinopathy, which has its own protocol."] },
  ],
  phases: [
    {
      name: ["التهدئة والتعليم والتحميل الثابت", "Settle, educate and start isometric loading"],
      sessionFrom: 1, sessionTo: 5,
      timeframe: ["نحو الأسبوع الأوّل", "About the first week"],
      goals: [
        "يفهم المريضُ أنّ الوترَ يتحسّن بالحمل المتدرّج لا بالراحة ولا بالجراحة؛ ألمٌ أقلّ ونومٌ أفضل؛ رفعٌ فعّال حتى ١٢٠° على الأقلّ؛ انقباضٌ ثابتٌ مريح للدوران الخارجيّ والإبعاد؛ ضبطٌ صحيح للوح الكتف؛ وبرنامجٌ منزليٌّ يوميّ يؤدّيه صحيحاً.",
        "The patient understands that the tendon improves with graded load, not with rest or surgery; less pain and better sleep; active elevation to at least 120°; a comfortable isometric contraction for external rotation and abduction; correct scapular setting; and a daily home programme performed correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة وتُعاد في كلّ جلسة:\n" +
        "• ألمُ الكتف مع رفع الذراع شائعٌ جداً، وأغلبُ المرضى يتحسّنون بالتمارين خلال ثلاثة أشهر.\n" +
        "• الوترُ لا «ينحشر» ولا «يحتكّ بالعظم» فيتآكل: يتهيّج حين يزيد عليه الحملُ فجأةً عمّا اعتاده، ويقوى بحملٍ متدرّج.\n" +
        "• الراحةُ التامّة والحمّالة تُضعفان الكتفَ وتُيبّسانه — نعدّل النشاطَ ولا نوقفه.\n" +
        "• الصورُ تُظهر كثيراً تغيّراتٍ في الأوتار عند مَن لا يشكون شيئاً — ليست حكماً على كتفك.\n" +
        "• عمليةُ «تنظيف الكتف» لم تكن أفضلَ من عمليةٍ وهمية في تجربتين كبيرتين — التمرينُ هو العلاج.\n" +
        "• الحقنةُ تخفّف الألمَ أسابيع ولا تقوّي الوتر.\n" +
        "• النوم: على الظهر، أو على الجنب الآخر محتضناً وسادة.\n" +
        "• في البيت والعمل: قرّب الأغراضَ إلى مستوى الصدر، واحمل قريباً من الجسم، وانشر الغسيلَ على حبلٍ أخفض مؤقتاً، وقسّم العملَ فوق الرأس على فتراتٍ قصيرة.",
        "Key messages — in plain language, repeated every session:\n" +
        "• Shoulder pain with arm elevation is very common, and most patients improve with exercise within three months.\n" +
        "• The tendon is not 'trapped' and does not 'rub on the bone' and wear away: it becomes irritable when its load rises suddenly above what it is used to, and it strengthens with graded load.\n" +
        "• Complete rest and a sling weaken and stiffen the shoulder — we modify activity rather than stop it.\n" +
        "• Scans often show tendon changes in people with no symptoms — they are not a verdict on your shoulder.\n" +
        "• Shoulder 'clean-up' surgery was no better than placebo surgery in two large trials — exercise is the treatment.\n" +
        "• An injection eases pain for weeks but does not strengthen the tendon.\n" +
        "• Sleep: on the back, or on the other side hugging a pillow.\n" +
        "• At home and at work: bring things down to chest height, carry close to the body, hang laundry on a lower line for now, and split overhead work into short spells.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الألمُ ٤ من ١٠ أو أقلّ مع الأنشطة اليومية، أو انخفض نقطتين على الأقلّ عن التقييم الأوّل، والنومُ أفضل.\n" +
        "• الانقباضُ الثابت للدوران الخارجيّ والإبعاد ٥ × ٣٠ ثانية بألمٍ ٣ من ١٠ أو أقلّ.\n" +
        "• رفعُ الذراع الفعّال ١٢٠° على الأقلّ.\n" +
        "• يضبط لوحَ الكتف ويؤدّي البرنامجَ المنزليّ صحيحاً.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثامنة: يعيد الأخصائيُّ التقييمَ (الرقبة، الكتفُ المتجمّدة، التمزّقُ الكامل، التكلّس)، ويُحال إلى الطبيب إن منع الألمُ التمرين.",
        "Progress to phase 2 when all are met:\n" +
        "• Pain 4/10 or less with daily activities, or at least 2 points lower than at baseline, with better sleep.\n" +
        "• Isometric external rotation and abduction 5 × 30 seconds with pain 3/10 or less.\n" +
        "• Active arm elevation of at least 120°.\n" +
        "• Sets the shoulder blade and performs the home programme correctly.\n" +
        "If not achieved by session 8: the specialist reassesses (neck, frozen shoulder, full-thickness tear, calcification), and refers to the doctor if pain prevents exercise.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• العلاجُ اليدويّ في هذه المرحلة خاصّةً: تحريكُ المفصل الحقّانيّ العضديّ والظهر العلويّ والأنسجةُ الرخوة لتخفيف الألم قبل التمرين ومعه (Pieters 2020) — لا وحده.\n" +
        "• اختباراتُ تعديل الأعراض: إن خفّف سحبُ اللوح أو مساعدتُه الألمَ عند الرفع، يُبنى التمرينُ عليه (ضبطُ اللوح قبل كلّ تمرين).\n" +
        "• التمارينُ الثابتة بشدّةٍ يتحمّلها المريض، والمحكُّ أن يهدأ الألمُ قبل الجلسة التالية؛ والانتقالُ إلى الحركة بالمطّاط حين تصير مريحة.\n" +
        "• تمطيطُ خلف الكتف لمن نقص دورانُه الداخليّ في التقييم وحده، لا للجميع.\n" +
        "• التجديفُ بالمطّاط تحت مستوى الكتف يُحتمل غالباً من البداية، ويبدأ به تحميلُ لوح الكتف.",
        "Notes for the specialist:\n" +
        "• Manual therapy matters most in this phase: glenohumeral and upper thoracic mobilisation and soft-tissue techniques to ease pain before and with exercise (Pieters 2020) — never on its own.\n" +
        "• Symptom modification tests: if scapular retraction or assistance eases pain on elevation, build the exercise on it (set the shoulder blade before every exercise).\n" +
        "• Isometrics at an intensity the patient tolerates, judged by pain settling before the next session; move to banded movement once they are comfortable.\n" +
        "• The posterior shoulder stretch only for those with an internal-rotation deficit on assessment, not for everyone.\n" +
        "• The band row below shoulder height is usually tolerated from the start and begins the scapular loading.",
      ],
      exercises: [
        { code: "scapular-setting" },
        { code: "thoracic-extension-towel" },
        { code: "wand-flexion-supine" },
        { code: "isometric-er" },
        { code: "isometric-abduction" },
        { code: "band-row", sets: 2, reps: 15, doseNote: ["يومياً بمطّاطٍ خفيف — ٢ × ١٥، والمرفقان تحت مستوى الكتف.", "Daily with a light band — 2 × 15, elbows below shoulder height."] },
        { code: "cross-body-stretch", note: ["لمن عنده نقصٌ في الدوران الداخليّ أو تيبّسٌ خلفيّ (من التقييم).", "For those with an internal-rotation deficit or posterior tightness (from the assessment)."] },
      ],
    },
    {
      name: ["التقوية المتدرّجة للكفّة المدوّرة ولوح الكتف", "Progressive rotator cuff and scapular strengthening"],
      sessionFrom: 6, sessionTo: 12,
      timeframe: ["نحو الأسبوع الثاني", "About the second week"],
      goals: [
        "قوّةٌ أكبر في الدوّارات الخارجية والداخلية والوتر فوق الشوكة، ولوحُ كتفٍ يتحرّك جيّداً في الرفع، ورفعٌ فعّال ١٥٠° على الأقلّ بلا رفعٍ للكتف، وقوسٌ مؤلمٌ أخفّ، ونومٌ لا يقطعه الألمُ غالباً.",
        "Greater strength in the external and internal rotators and supraspinatus, good scapular motion during elevation, active elevation of at least 150° without shoulder hitching, a milder painful arc, and sleep mostly unbroken by pain.",
      ],
      education: [
        "• الحملُ يزيد خطوةً خطوة: حين تصير المجموعاتُ الثلاث سهلةً بألمٍ ٣ من ١٠ أو أقلّ يزيد الثقلُ أو المطّاطُ درجة.\n" +
        "• تعبُ العضلات بعد التمرين يوماً أو يومين طبيعيّ؛ أمّا ألمُ الوتر الذي يزيد في الليل أو لا يهدأ قبل الجلسة التالية فيعني أنّ الحملَ زاد كثيراً — نخفّفه ولا نتوقّف.\n" +
        "• في العمل: استراحاتٌ قصيرة من العمل فوق الرأس، والكتفان مرتخيتان أمام الحاسوب، والكرسيُّ والشاشةُ بارتفاعٍ مناسب.\n" +
        "• التمرينُ المنزليّ اليوميّ هو الذي يقوّي الوتر — والجلسةُ في المركز للتصحيح والتدرّج.",
        "• Load increases step by step: when all three sets are easy with pain 3/10 or less, the weight or band goes up one level.\n" +
        "• Muscle tiredness for a day or two after exercise is normal; tendon pain that rises at night or does not settle before the next session means the load rose too much — we reduce it rather than stop.\n" +
        "• At work: short breaks from overhead work, relaxed shoulders at the computer, and a chair and screen at a suitable height.\n" +
        "• The daily home exercise is what strengthens the tendon — clinic sessions are for correction and progression.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين:\n" +
        "• الألمُ ٣ من ١٠ أو أقلّ مع الأنشطة اليومية، والنومُ لا يقطعه الألمُ غالباً.\n" +
        "• الدورانُ الخارجيّ على الجنب ٣ × ١٥ بثقل ١–٢ كغ بألمٍ ٣ من ١٠ أو أقلّ يهدأ قبل الجلسة التالية.\n" +
        "• رفعُ الذراع في مستوى لوح الكتف حتى مستوى الكتف بثقل ١ كغ ٣ × ١٥ بلا رفعٍ للكتف.\n" +
        "• رفعُ الذراع الفعّال ١٥٠° على الأقلّ، وتحسّنٌ في SPADI.\n" +
        "وإن لم يتحقّق ذلك بعد الجلسة الثانية عشرة: يُراجَع التشخيصُ والجرعةُ والالتزام، ويُحال إلى الطبيب مَن لم يتحسّن بعد ستّة أسابيع من بدء التمارين (BESS/BOA 2015).",
        "Progress to phase 3 when:\n" +
        "• Pain 3/10 or less with daily activities, with sleep mostly unbroken by pain.\n" +
        "• Side-lying external rotation 3 × 15 with 1–2 kg and pain 3/10 or less that settles before the next session.\n" +
        "• Scaption to shoulder height with 1 kg, 3 × 15, without shoulder hitching.\n" +
        "• Active arm elevation of at least 150°, with SPADI improving.\n" +
        "If not achieved by session 12: review the diagnosis, the dose and adherence, and refer to the doctor anyone not improving six weeks after starting exercise (BESS/BOA 2015).",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• الكفّةُ بحملٍ خفيف وتكرارٍ كثير يومياً (٣ × ١٥ — Holmgren 2012)، والنزولُ البطيء في ٣ ثوانٍ في كلّ تمرين (التحميلُ اللامركزيّ Eccentric).\n" +
        "• رفعُ الذراع في مستوى لوح الكتف حتى مستوى الكتف أوّلاً، ويرتفع فوقه حين يخلو من القوس المؤلم ومن رفع الكتف.\n" +
        "• رفعُ الذراعين Y في الانبطاح أصعبُ من T على الكتف المؤلم: يبدأ بـT، ويُضاف Y حين يُرفع بألمٍ ٣ من ١٠ أو أقلّ.\n" +
        "• تمطيطُ عضلة الصدر لمن قَصُرت في التقييم وحده.\n" +
        "• العلاجُ اليدويّ يقلّ تدريجياً، والجهازُ المساعد (إن اختاره الأخصائيّ) قبل التمارين لا بدلها.",
        "Notes for the specialist:\n" +
        "• Cuff work at a light load with many repetitions every day (3 × 15 — Holmgren 2012), lowering slowly over 3 seconds in every exercise (eccentric loading).\n" +
        "• Scaption to shoulder height first, rising above it once free of the painful arc and of shoulder hitching.\n" +
        "• The prone Y is harder than the T on a painful shoulder: start with T and add Y once it can be lifted with pain 3/10 or less.\n" +
        "• The pectoral stretch only for those with a short pectoralis minor on assessment.\n" +
        "• Manual therapy tapers off, and the adjunct device (if the specialist chooses one) comes before exercise, never instead of it.",
      ],
      exercises: [
        { code: "side-lying-er", doseNote: DAILY_LIGHT },
        { code: "band-er", doseNote: DAILY_LIGHT },
        { code: "band-ir", doseNote: DAILY_LIGHT },
        { code: "scaption-raise", doseNote: DAILY_LIGHT, note: ["حتى مستوى الكتف أوّلاً، ثمّ فوقه حين يخلو من القوس المؤلم.", "To shoulder height first, then above once free of the painful arc."] },
        { code: "band-row", reps: 15, doseNote: ["يومياً بمطّاطٍ متوسّط — ٣ × ١٥.", "Daily with a medium band — 3 × 15."] },
        { code: "prone-y-t", doseNote: ["يوماً بعد يوم — T أوّلاً، ويُضاف Y حين يُحتمل.", "Alternate days — T first, adding Y once tolerated."] },
        { code: "wall-slide-serratus" },
        { code: "doorway-pec-stretch", note: ["لمن عنده قصرٌ في عضلة الصدر الصغرى (من التقييم).", "For those with a short pectoralis minor (from the assessment)."] },
        { code: "cross-body-stretch", note: ["يستمرّ لمن بقي عنده نقصٌ في الدوران الداخليّ.", "Continues for those with a remaining internal-rotation deficit."] },
      ],
    },
    {
      name: ["التحميل الأثقل والوظيفيّ وفوق الرأس", "Heavier, functional and overhead loading"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["نحو الأسبوع الثالث — ثمّ البرنامجُ المنزليّ حتى الأسبوع الثاني عشر", "About week 3 — then the home programme until week 12"],
      goals: [
        "رفعٌ كامل فوق الرأس بلا ألمٍ يُذكر، وقوّةٌ تقارب الجهةَ الأخرى، ورفعُ الأغراض إلى رفٍّ عالٍ وما يحتاجه العملُ أو الرياضة، والنومُ على الكتف، واستقلالٌ تامّ ببرنامجٍ منزليٍّ حتى الأسبوع الثاني عشر وخطّةٍ مكتوبة للنوبة.",
        "Full overhead elevation with little or no pain, strength close to the other side, lifting objects to a high shelf and whatever work or sport requires, sleeping on the shoulder, and full independence with a home programme until week 12 and a written flare-up plan.",
      ],
      education: [
        "• البرنامجُ المنزليّ يستمرّ حتى نهاية الأسبوع الثاني عشر: الكفّةُ ولوحُ الكتف يوماً بعد يوم بحملٍ أثقل يزيد كلّما سهل — ثمّ مرّتين في الأسبوع للوقاية.\n" +
        "• العودةُ إلى العمل أو الرياضة فوق الرأس تدريجياً: كمّيةٌ أقلّ أوّلاً ثمّ تزيد كلَّ أسبوع.\n" +
        "• خطّةُ النوبة — مكتوبةٌ ويأخذها المريض:\n" +
        "  ١. نوبةُ ألمٍ لا تعني تمزّقاً جديداً — لا راحةَ تامّة ولا حمّالة.\n" +
        "  ٢. خفّف التمارينَ إلى النصف أو ارجع إلى التمارين الثابتة يومين أو ثلاثة، وأبقِ الحركة.\n" +
        "  ٣. راجع ما سبق النوبة: عملٌ فوق الرأس أطول، حملٌ ثقيل، قفزةٌ في الثقل.\n" +
        "  ٤. إن لم تتحسّن خلال أسبوعين، أو جاء ضعفٌ مفاجئ في رفع الذراع — راجعنا.",
        "• The home programme continues until the end of week 12: cuff and scapular work on alternate days at a heavier load that rises as it gets easier — then twice a week for prevention.\n" +
        "• Return to overhead work or sport gradually: a smaller amount first, increasing each week.\n" +
        "• Flare-up plan — written and given to the patient:\n" +
        "  1. A flare of pain does not mean a new tear — no complete rest and no sling.\n" +
        "  2. Halve the exercises or go back to the isometrics for two or three days, and keep moving.\n" +
        "  3. Review what came before the flare: longer overhead work, heavy carrying, a jump in weight.\n" +
        "  4. If there is no improvement within two weeks, or sudden weakness lifting the arm appears — come back to us.",
      ],
      criteria: [
        "يتخرّج حين:\n" +
        "• تحسّن SPADI ١٣ نقطةً على الأقلّ، والألمُ ٢ من ١٠ أو أقلّ مع الأنشطة اليومية.\n" +
        "• رفعٌ فعّال كامل أو شبهُ كامل (١٦٠° فأكثر) بلا رفعٍ للكتف.\n" +
        "• قوّةُ الدوران الخارجيّ والإبعاد ٩٠٪ على الأقلّ من الجهة الأخرى، أو كاملةٌ بلا ألمٍ في الفحص اليدويّ.\n" +
        "• يرفع غرضاً بوزن ما يحتاجه (١–٣ كغ غالباً) إلى رفٍّ عالٍ ١٠ مرّاتٍ بتحكّم، ويعود إلى الأنشطة التي اختارها.\n" +
        "• يؤدّي البرنامجَ المنزليّ وحده، ومعه خطّةُ النوبة.\n" +
        "ثمّ زيارةُ متابعةٍ وإعادةُ تقييمٍ بعد التخرّج بأربعة أسابيع، ومراجعةٌ عند نهاية الأسبوع الثاني عشر؛ ومَن لم يتحسّن بما يكفي يُحال إلى الطبيب.",
        "Discharge (graduate) when:\n" +
        "• SPADI has improved by at least 13 points, with pain 2/10 or less in daily activities.\n" +
        "• Full or near-full active elevation (160° or more) without shoulder hitching.\n" +
        "• External rotation and abduction strength at least 90% of the other side, or full and pain-free on manual testing.\n" +
        "• Lifts an object of the weight needed (usually 1–3 kg) to a high shelf 10 times with control, and has returned to the chosen activities.\n" +
        "• Performs the home programme independently, with the flare-up plan.\n" +
        "Then a follow-up visit and reassessment four weeks after discharge, and a review at the end of week 12; anyone not improving enough is referred to the doctor.",
      ],
      notes: [
        "ملاحظاتٌ للأخصائيّ:\n" +
        "• الحملُ الأثقل يوماً بعد يوم (٣ × ٨–١٢) بثقلٍ يُتعب في آخر التكرارات بألمٍ ٣ من ١٠ أو أقلّ، والحركةُ والتمطيطُ يومياً.\n" +
        "• لمن يعمل أو يلعب فوق رأسه: الدورانُ بالمطّاط والذراعُ مرفوعةٌ ٩٠°، والرفعُ الوظيفيّ بكمّية العمل الحقيقيّ.\n" +
        "• الضغطُ على الحائط يتدرّج إلى الطاولة ثمّ الأرض على الركبتين بقدر التحمّل.\n" +
        "• البرنامجُ المنزليّ يُكتب ويُسلَّم بجرعته — وهو الذي يحمل الفائدةَ حتى الأسبوع الثاني عشر.",
        "Notes for the specialist:\n" +
        "• Heavier loading on alternate days (3 × 8–12) with a weight that is tiring by the last repetitions at pain 3/10 or less, with movement and stretching daily.\n" +
        "• For overhead workers and athletes: band rotation with the arm raised to 90°, and functional lifting at the volume of the real job.\n" +
        "• The wall push-up progresses to a table and then to the floor on the knees as tolerated.\n" +
        "• The home programme is written down and handed over with its dose — it carries the benefit through to week 12.",
      ],
      exercises: [
        { code: "side-lying-er", sets: 3, reps: 10, doseNote: HEAVY_ALT },
        { code: "band-er", sets: 3, reps: 10, doseNote: HEAVY_ALT, note: ["بالذراع مرفوعةً جانباً ٩٠° والمرفقُ مثنيٌّ ٩٠° لمن يعمل أو يلعب فوق رأسه.", "With the arm raised to the side at 90° and the elbow bent to 90° for overhead workers and athletes."] },
        { code: "band-ir", sets: 3, reps: 10, doseNote: HEAVY_ALT },
        { code: "scaption-raise", sets: 3, reps: 10, doseNote: HEAVY_ALT, note: ["المدى كاملاً فوق الرأس.", "Through the full overhead range."] },
        { code: "wall-push-up-plus", doseNote: ALTERNATE },
        { code: "prone-y-t", doseNote: ALTERNATE, note: ["بثقلٍ خفيف (٠٫٥–١ كغ) في كلّ يد.", "With a light weight (0.5–1 kg) in each hand."] },
        { code: "band-row", doseNote: ALTERNATE, note: ["بمطّاطٍ أقوى، أو بيدٍ واحدة.", "With a stronger band, or one arm at a time."] },
        { code: "overhead-shelf-lift", doseNote: ALTERNATE },
      ],
    },
  ],
};

export const name = "128_physio_subacromial_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
