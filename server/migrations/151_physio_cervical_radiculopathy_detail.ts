// Migration 151: الاعتلالُ الجذريّ العنقيّ — البروتوكولُ السادس عشر مفصَّلاً (§4.ei — ٢٠٢٦-١٠-١٧).
//
// المالك (٢٠٢٦-١٠-١٦): «الآن نكمل البروتوكولات» — فاختار المساعدُ الأكثرَ شيوعاً من التسعة والعشرين الباقية: الاعتلالُ الجذريّ العنقيّ
// (`cervical-radiculopathy-adult`)، ألمُ الرقبة النازلُ إلى الذراع — يكمّل «ألم الرقبة» (١٢٥) و«عِرق النسا» (١٤٥) ويستعمل بطاقاتهما بصورها.
// **بالقالب كاملاً** (§4.dd): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع) وتمديدٌ واحد بستٍّ لمن ما زال يتحسّن، وثلاثُ مراحل بنطاقات
// (١–٦ · ٧–١٢ · ١٣–١٨) **تتبع الحساسيةَ لا رقمَ الجلسة**، ومعاييرُ رقمية من الفرق المهمّ وخطأ القياس في الاعتلال الجذريّ نفسِه؛ وستُّ بطاقاتٍ جديدة
// (منزلقا العصبين الأوسط والزنديّ، ووضعيةُ اليد على الرأس، وتقويةُ ثلاثية الرؤوس وباسطات الرسغ والقبضة) والمعادةُ بصورها من ١١٩ و١٢٥ و١٢٨ و١٤٩؛
// والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (NDI ودورانُ الرقبة) وألمُ الذراع والرقبة منفصلين والأنشطةُ والقبضةُ
// وDN4 بالعربية إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الاعتلالَ الجذريّ العنقيّ**: التشخيصُ بمجموعة الاختبارات (Wainner 2003) وفحصُ اعتلال النخاع في كلّ تقييم (Cook 2010)؛ والمسارُ مطمئنٌ بطيء
// (Wong 2014)؛ والعلاجُ الطبيعيّ أسرعُ من الانتظار في الأسابيع الستّة الأولى ويتساويان بعد ستّة أشهر (Kuijper 2009)، وبلغ ما بلغته الجراحةُ في الإعاقة
// وألم الذراع عند سنتين (Engquist 2013). **وأقوى التقنيات الخاصّة دليلاً تحريكُ العصب** (Lascurain-Aguirrebeña 2024)؛ **وأقوى الأجهزة الشدُّ** —
// «ينبغي» في المزمن مع التمرين (JOSPT 2017 — B) ويُوقف إن لم ينفع في الحال (Kjaer 2017)، وأثرُه المجمَّع صغيرٌ سريريّاً (Colombo 2020) — فهو تجربةٌ
// مساعدة لمن يستجيب. **والجرعة**: التجاربُ ٨–٢٤ جلسة في ٣–٦ أسابيع بمعدّل ٢–٣ في الأسبوع غالباً، ولا تجربةَ بستٍّ في الأسبوع ولا لدورةٍ ثانية —
// فالعددُ ١٨ اختيارُ خدمةٍ مكتوبٌ صريحاً، وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والشدُّ والحرارةُ والتيكار والتحفيزُ والمغناطيسُ والإبرُ مساعدةٌ
// بقاعدة المركز والدليلُ لكلٍّ مكتوبٌ في سطره؛ والليزرُ «لا يُستخدم» حتى يقرّر سليم (وله «يمكن» في الحادّ وإعداداتُ تجربته في سطره)، والموجاتُ
// الصادمة والأمواجُ فوق الصوتية «لا يُستخدم» بدليلهما. **وما يخصّ العراق**: بحثٌ صفريّ لدراسةٍ عراقية في الاعتلال الجذريّ، ولا دراسةَ لوضعيات الرقبة
// في الصلاة والوضوء — فتُختبر حركاتُ المريض نفسُها أنشطةً تتدرّج.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (١٨٧ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ست؛ والمعادةُ (زُرعت في ١١٩ و١٢٥ و١٢٨ و١٤٩) تُربط برموزها وصورها، وما يخصّ الاعتلالَ الجذريّ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "median-nerve-slider", nameAr: "انزلاق العصب الأوسط (المنزلق)", nameEn: "Median nerve slider",
    kind: "neural", region: "cervical", sets: 1, reps: 10, hold: 3,
    purpose: ["تحريكُ العصب أقوى التقنيات الخاصّة دليلاً في الاعتلال الجذريّ العنقيّ: أنقص الألمَ نحو نقطةٍ ونصف من ١٠ حين أُضيف إلى العلاج الطبيعيّ (Lascurain-Aguirrebeña 2024)، وتحريكُ العصب الأوسط وحده أنقصه نحو ثلاث نقاط مقارنةً بلا علاج (Gillot 2025) — والدليلُ منخفضُ اليقين. وفي تجربةٍ أضاف هذا المنزلقُ (١ × ١٠ بثبات ثلاث ثوانٍ) إلى التمارين الثابتة نقصاً أكبرَ في الألم والإعاقة (Rafiq 2022). والمنزلقُ يطيل العصبَ من طرفٍ ويرخيه من الآخر في الوقت نفسه، فيتحرّك العصبُ بشدٍّ أقلّ بكثير من «الشادّ» (Coppieters 2008 — على الجثث) — ولذلك يبدأ به ذو الأعراض المتهيّجة.",
      "Nerve mobilisation is the specific technique with the best support in cervical radiculopathy: it reduced pain by about one and a half points out of 10 when added to physiotherapy (Lascurain-Aguirrebeña 2024), and median-nerve mobilisation alone reduced it by about three points against no treatment (Gillot 2025) — with low-certainty evidence. In one trial, adding this slider (1 × 10 with a three-second hold) to isometric exercise reduced pain and disability more (Rafiq 2022). A slider lengthens the nerve at one end while slackening it at the other, so the nerve glides with far less strain than with a 'tensioner' (Coppieters 2008 — cadaver data) — which is why patients with irritable symptoms start with it."],
    start: ["جالسٌ مستقيماً، والذراعُ المصابة مرفوعةٌ جانباً حتى مستوى الكتف، والمرفقُ مثنيّ ٩٠° والكفُّ إلى الأمام، والكتفُ منخفضٌ لا يرتفع نحو الأذن، والرأسُ مائلٌ قليلاً بعيداً عن الذراع.",
      "Sitting upright with the affected arm raised to the side at shoulder height, elbow bent to 90° and palm facing forward, the shoulder kept down rather than hitched towards the ear, and the head tilted slightly away from the arm."],
    steps: [[
      "ابدأ من وضع البداية: المرفقُ مثنيّ والرأسُ مائلٌ قليلاً بعيداً عن الذراع.",
      "معاً وفي الوقت نفسه: افرد المرفقَ وارجع بالرسغ والأصابع إلى الخلف (الكفّ إلى الأعلى)، وأمِل رأسَك نحو الذراع.",
      "ثمّ معاً عُد: اثنِ المرفقَ والرسغ، وأمِل الرأسَ بعيداً عن الذراع.",
      "حركةٌ سلسة ذهاباً وإياباً، بثباتٍ قصير (ثلاث ثوانٍ) في كلّ طرف — بلا تمطيطٍ ولا وخزٍ يزيد.",
      "١٠ مرّات، والكتفُ منخفضٌ طوالها.",
    ], [
      "Start from the starting position: elbow bent, head tilted slightly away from the arm.",
      "Together and at the same time: straighten the elbow and take the wrist and fingers back (palm up), while tilting your head towards the arm.",
      "Then return together: bend the elbow and wrist and tilt the head away from the arm.",
      "A smooth back-and-forth movement with a short hold (three seconds) at each end — no stretching and no increasing tingling.",
      "10 times, keeping the shoulder down throughout.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ منخفضٌ مرتخٍ.",
      "الرأسُ والذراعُ يشدّان العصبَ معاً (الرأسُ بعيداً والذراعُ منفردة) ⟵ الرأسُ نحو الذراع حين تنفرد: هذا هو المنزلق.",
      "الضغطُ حتى الوخز أو الألم ⟵ حركةٌ سلسة في مدىً مريح.",
      "حبسُ النفس والسرعة ⟵ تنفّسٌ طبيعيّ وإيقاعٌ هادئ.",
    ], [
      "Hitching the shoulder towards the ear → the shoulder down and relaxed.",
      "Head and arm tensioning the nerve together (head away while the arm straightens) → the head goes towards the arm as it straightens: that is the slider.",
      "Pushing into tingling or pain → a smooth movement within a comfortable range.",
      "Holding the breath and rushing → normal breathing and a calm rhythm.",
    ]],
    easier: ["مدىً أصغر: الذراعُ أخفضُ من الكتف، أو يتحرّك المرفقُ والرسغُ وحدهما والرأسُ ثابت؛ أو في الاستلقاء كما في التجربة (Rafiq 2022).",
      "A smaller range: the arm lower than the shoulder, or the elbow and wrist moving alone with the head still; or lying down as in the trial (Rafiq 2022)."],
    harder: ["مجموعاتٌ أكثر (٢–٣ × ١٠) إن لم يزد ألمُ الذراع بعدها؛ «والشادّ» (الرأسُ بعيداً والذراعُ منفردة معاً) يقرّره الأخصائيّ بعد أن تهدأ الأعراض ولا يبقى وخزٌ في اليوم التالي — قاعدةٌ من الخبرة، ولا تجربةَ قارنت المنزلقَ بالشادّ في الاعتلال الجذريّ.",
      "More sets (2–3 × 10) if arm pain does not increase afterwards; the 'tensioner' (head away while the arm straightens) is the therapist's decision once symptoms have settled and no tingling remains the next day — an expert rule, as no trial has compared sliders with tensioners in radiculopathy."],
    stopIf: ["وخزٌ أو خدرٌ أو ألمٌ في الذراع يزيد ويبقى بعد التمرين أكثر من نصف ساعة أو إلى اليوم التالي، أو ينزل أبعدَ في الذراع؛ وضعفٌ جديد أو يزيد، أو ثقلٌ في اليدين أو تعثّرٌ في المشي ⟵ الأخصائيّ قبل المتابعة.",
      "Tingling, numbness or arm pain that increases and lasts more than half an hour after the exercise or into the next day, or spreads further down the arm; new or increasing weakness, clumsy hands or unsteady walking → the therapist before continuing."],
    equipment: ["كرسيٌّ بلا مساند؛ أو سرير.", "A chair without armrests; or a bed."],
    doseNote: ["في التجربة: ١ × ١٠ بثبات ثلاث ثوانٍ في الجلسة (Rafiq 2022) — والزيادةُ إلى ٢–٣ مجموعات اقتراحٌ يتبع الاستجابة.",
      "In the trial: 1 × 10 with a three-second hold per session (Rafiq 2022) — progressing to 2–3 sets is a suggestion that follows the response."],
    images: [{ key: "median-nerve-slider-1", ar: "الأعلى: الذراعُ جانباً بمستوى الكتف والمرفقُ مثنيّ والرأسُ مائلٌ بعيداً؛ الأسفل: المرفقُ والرسغُ منفردان والرأسُ مائلٌ نحو الذراع",
      en: "Top: arm out at shoulder height, elbow bent, head tilted away; bottom: elbow and wrist straightened with the head tilted towards the arm", search: "median nerve slider glide exercise" }],
  },
  {
    code: "ulnar-nerve-slider", nameAr: "انزلاق العصب الزنديّ", nameEn: "Ulnar nerve slider",
    kind: "neural", region: "cervical", sets: 1, reps: 10, hold: 3,
    purpose: ["لمن تنزل أعراضُه إلى جهة الإصبع الصغيرة (الجذرُ الثامن ومسارُ العصب الزنديّ): يتحرّك العصبُ برجوع الرسغ وثني المرفق والذراعُ جانباً، والرأسُ يميل نحو الذراع فيرخيه من الأعلى — منزلقٌ لا شادّ. استُعمل تحريكُ العصب الزنديّ ضمن تسلسل تحريك الأعصاب في التجارب (Tiwari 2026)، ولا تجربةَ لهذا المنزلق وحده — فالجرعةُ كمنزلق العصب الأوسط (Rafiq 2022)، والمنزلقُ أوّلاً لأنّه أقلُّ شدّاً على العصب (Coppieters 2008).",
      "For patients whose symptoms travel to the little-finger side (the C8 root and the ulnar nerve path): the nerve moves as the wrist goes back and the elbow bends with the arm out to the side, while the head tilts towards the arm to slacken it from above — a slider, not a tensioner. Ulnar-nerve mobilisation was part of the nerve-mobilisation sequences in trials (Tiwari 2026), and there is no trial of this slider on its own — so the dose follows the median slider (Rafiq 2022), and the slider comes first because it puts less strain on the nerve (Coppieters 2008)."],
    start: ["جالسٌ أو واقفٌ مستقيماً، والذراعُ المصابة مرفوعةٌ جانباً بمستوى الكتف والمرفقُ مستقيم والكفُّ إلى الأسفل، والكتفُ منخفض.",
      "Sitting or standing upright with the affected arm raised to the side at shoulder height, the elbow straight and the palm down, and the shoulder kept down."],
    steps: [[
      "من وضع البداية: الذراعُ جانباً والكفُّ إلى الأسفل.",
      "ارجع بالرسغ حتى تشير الأصابعُ إلى السقف.",
      "اثنِ المرفقَ واقلب الكفَّ إلى الأعلى فتقترب اليدُ من جانب الرأس، والرسغُ ما زال راجعاً — وأمِل رأسَك قليلاً نحو الذراع في الوقت نفسه؛ ونهايةُ الحركة لمن يحتملها: الإبهامُ والسبّابةُ حلقةٌ على العين كالقناع.",
      "اثبت ثلاث ثوانٍ بلا وخزٍ يزيد، ثمّ عُد ببطء بالترتيب نفسه إلى البداية والرأسُ مستقيم.",
      "١٠ مرّات، والكتفُ منخفضٌ طوالها.",
    ], [
      "From the starting position: arm out to the side with the palm down.",
      "Bend the wrist back until the fingers point to the ceiling.",
      "Bend the elbow and turn the palm up so the hand comes towards the side of the head, with the wrist still bent back — while tilting your head slightly towards the arm at the same time; the end of the movement, for those who tolerate it: the thumb and index finger in a ring over the eye like a mask.",
      "Hold for three seconds with no increase in tingling, then return slowly in the same order to the start with the head upright.",
      "10 times, keeping the shoulder down throughout.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن ⟵ الكتفُ منخفضٌ مرتخٍ.",
      "ميلُ الرأس بعيداً عن الذراع واليدُ عند الرأس (شادٌّ لا منزلق) ⟵ الرأسُ نحو الذراع.",
      "الضغطُ حتى الوخز في الإصبع الصغيرة ⟵ مدىً أصغر بلا وخز.",
      "حبسُ النفس والسرعة ⟵ تنفّسٌ طبيعيّ وإيقاعٌ هادئ.",
    ], [
      "Hitching the shoulder towards the ear → the shoulder down and relaxed.",
      "Tilting the head away from the arm with the hand at the head (a tensioner, not a slider) → the head towards the arm.",
      "Pushing into tingling in the little finger → a smaller range without tingling.",
      "Holding the breath and rushing → normal breathing and a calm rhythm.",
    ]],
    easier: ["نصفُ الحركة: الرسغُ وحده ثمّ ثنيٌ قليل للمرفق، والذراعُ أخفضُ من الكتف.", "Half the movement: the wrist alone, then only a little elbow bend, with the arm lower than the shoulder."],
    harder: ["مجموعاتٌ أكثر (٢–٣ × ١٠) إن لم يزد ألمُ الذراع بعدها، والقناعُ على العين نهايةً للحركة؛ والشادُّ يقرّره الأخصائيّ.", "More sets (2–3 × 10) if arm pain does not increase afterwards, with the mask over the eye as the end of the movement; the tensioner is the therapist's decision."],
    stopIf: ["وخزٌ أو خدرٌ في الإصبع الصغيرة أو الذراع يزيد ويبقى بعد التمرين، أو ألمٌ في المرفق من الداخل؛ وضعفٌ جديد أو يزيد في اليد ⟵ الأخصائيّ قبل المتابعة.",
      "Tingling or numbness in the little finger or arm that increases and lasts after the exercise, or pain on the inner elbow; new or increasing weakness in the hand → the therapist before continuing."],
    equipment: ["لا شيء.", "None."],
    doseNote: ["لا تجربةَ لهذا المنزلق وحده — الجرعةُ كمنزلق العصب الأوسط في التجربة (١ × ١٠ بثبات ثلاث ثوانٍ — Rafiq 2022)؛ اقتراح.",
      "No trial of this slider on its own — the dose follows the median slider in the trial (1 × 10 with a three-second hold — Rafiq 2022); a suggestion."],
    images: [{ key: "ulnar-nerve-slider-1", ar: "ثلاث صور: الذراعُ جانباً والكفُّ إلى الأسفل، ثمّ الرسغُ راجعٌ والأصابعُ إلى الأعلى، ثمّ المرفقُ مثنيّ والكفُّ إلى الأعلى نحو الرأس",
      en: "Three photos: arm out to the side with the palm down, then the wrist bent back with the fingers up, then the elbow bent with the palm up towards the head", search: "ulnar nerve glide exercise sequence" }],
  },
  {
    code: "shoulder-abduction-relief", nameAr: "وضعية اليد على الرأس لتخفيف ألم الذراع", nameEn: "Shoulder abduction relief position (hand on head)",
    kind: "neural", region: "cervical",
    purpose: ["عند كثيرٍ من المرضى يخفّ ألمُ الذراع حين توضع كفُّ الذراع المؤلمة على أعلى الرأس — فالوضعيةُ ترخي الشدَّ على الجذر العصبيّ (علامةُ تخفيف الإبعاد). تظهر عند جزءٍ من المرضى لا كلّهم (Thoomes 2026)، وهي من علامات الاستجابة للشدّ (Raney 2009)، و«تخفُّ الأعراضُ حين أمشي ويدي في جيبي» من أسئلة التاريخ (Sleijser-Koehorst 2021)؛ والخبراءُ يضعون وضعياتِ الراحة في المرحلة الحادّة (Thoomes 2022). ولا تجربةَ لاستعمالها علاجاً (بحثٌ صفريّ) — فتُستعمل لمن تريحه، ولا تُفرض على من تؤلمه.",
      "In many patients arm pain eases when the hand of the painful arm is placed on top of the head — the position slackens the tension on the nerve root (the shoulder abduction relief sign). It is present in some patients, not all (Thoomes 2026), it is one of the signs of response to traction (Raney 2009), and 'my symptoms ease when I walk with my hand in my pocket' is one of the history questions (Sleijser-Koehorst 2021); experts place sustained pain-relieving positions in the acute stage (Thoomes 2022). There is no trial of using it as a treatment (a documented zero result) — so it is used by those it relieves and never forced on those it hurts."],
    start: ["جالسٌ على كرسيٍّ والظهرُ مسنود والقدمان على الأرض، والرأسُ مستقيم.", "Sitting on a chair with the back supported and the feet on the floor, head upright."],
    steps: [[
      "ارفع الذراعَ المؤلمة ببطء وضع كفَّها على أعلى رأسك، والمرفقُ إلى الجانب.",
      "أرخِ الكتفَ والذراع واترك ثقلها على الرأس.",
      "ابقَ ما دامت تريحك — دقيقةً إلى بضع دقائق — وتنفّس بهدوء.",
      "أنزل الذراعَ ببطء.",
      "كرّرها حين يشتدّ ألمُ الذراع: في العمل، وقبل النوم، وبعد الجلوس الطويل.",
    ], [
      "Slowly raise the painful arm and rest its palm on top of your head, with the elbow out to the side.",
      "Relax the shoulder and arm and let their weight rest on the head.",
      "Stay as long as it eases the pain — a minute to a few minutes — breathing calmly.",
      "Lower the arm slowly.",
      "Repeat whenever arm pain builds: at work, before sleep and after long sitting.",
    ]],
    cues: [[
      "فرضُ الوضعية وهي تزيد الألم ⟵ تُترك؛ ليست لكلّ مريض.",
      "شدُّ الكتف ورفعُه ⟵ الكتفُ مرتخٍ والذراعُ بثقلها على الرأس.",
      "انحناءُ الرأس إلى الأمام ⟵ الرأسُ مستقيم.",
      "البقاءُ طويلاً مع خدرٍ في اليد المرفوعة ⟵ مدّةٌ أقصر.",
    ], [
      "Forcing the position when it increases pain → drop it; it is not for every patient.",
      "Tensing and hitching the shoulder → the shoulder relaxed with the arm's weight on the head.",
      "The head bent forward → the head upright.",
      "Staying a long time with numbness in the raised hand → a shorter time.",
    ]],
    easier: ["الذراعُ على وسادةٍ عالية أو مسند كرسيٍّ مرتفع، أو اليدُ في جيب البنطلون أثناء المشي (يذكرها بعضُ المرضى مريحة — Sleijser-Koehorst 2021).",
      "The arm resting on a high pillow or a raised chair armrest, or the hand in a trouser pocket while walking (some patients report it as relieving — Sleijser-Koehorst 2021)."],
    harder: ["لا تُصعَّب — وضعيةُ راحة؛ وحين لا يعود المريضُ يحتاجها فهذا تحسّن.", "Not progressed — it is a resting position; when the patient no longer needs it, that is improvement."],
    stopIf: ["يزيد ألمُ الذراع أو الوخز، أو ألمٌ في الكتف نفسه، أو دوخة.", "Arm pain or tingling increases, the shoulder itself hurts, or dizziness."],
    equipment: ["كرسيٌّ بظهر؛ وسادة.", "A chair with a back; a pillow."],
    doseNote: ["لا جرعةَ مجرَّبة (بحثٌ صفريّ): بقدر ما يريح، عدّةَ مرّاتٍ في اليوم.", "No tested dose (a documented zero result): as long as it relieves, several times a day."],
    images: [{ key: "shoulder-abduction-relief-1", ar: "رجلٌ يضع كفَّ ذراعه على أعلى رأسه والمرفقُ إلى الجانب، والذراعُ الأخرى إلى جانبه",
      en: "A man resting the palm of one hand on top of his head with the elbow out to the side, the other arm by his side", search: "shoulder abduction relief sign hand on head" }],
  },
  {
    code: "triceps-band-extension", nameAr: "بسط المرفق بالمطّاط (العضلة ثلاثية الرؤوس)", nameEn: "Triceps extension with an elastic band (kickback)",
    kind: "strength", region: "elbow", sets: 3, reps: 10, rest: 60,
    purpose: ["الجذرُ السابع أكثرُ الجذور إصابةً (Radhakrishnan 1994)، وضعفُه يظهر في بسط المرفق — العضلة ثلاثية الرؤوس (Iyer 2016). والضعفُ يعود غالباً: ٧٣٪ استعادوا قوّةً أربعةً من خمس خلال شهرين إلى ثلاثة (Kwon 2026). ولا تجربةَ لتقوية العضلة الضعيفة في الاعتلال الجذريّ (بحثٌ صفريّ) — فهي اقتراحٌ يُعطى دون أن يزيد ألمُ الذراع، والقوّةُ تُقاس كلَّ أسبوع: ضعفٌ يزيد ⟵ قواعدُ الإحالة.",
      "The C7 root is the most commonly affected (Radhakrishnan 1994), and its weakness shows in elbow extension — the triceps (Iyer 2016). Weakness usually recovers: 73% regained strength of four out of five within two to three months (Kwon 2026). There is no trial of strengthening the weak muscle in radiculopathy (a documented zero result) — so it is a suggestion given without increasing arm pain, and strength is measured every week: increasing weakness → the referral rules."],
    start: ["واقفٌ بقدمٍ أمام الأخرى والمطّاطُ تحت القدم الأمامية، والجذعُ مائلٌ قليلاً إلى الأمام والظهرُ مستقيم، واليدُ (جهة الذراع الضعيفة) تمسك طرفَ المطّاط والمرفقُ مثنيّ والعضدُ بجانب الجسم.",
      "Standing with one foot in front of the other and the band under the front foot, the trunk leaning slightly forward with a straight back, and the hand of the weak arm holding the band end with the elbow bent and the upper arm by the side."],
    steps: [[
      "ثبّت العضدَ بجانب الجسم — هو لا يتحرّك.",
      "افرد المرفقَ ببطء حتى تصير اليدُ خلف الجسم.",
      "اثبت ثانيةً عند الفرد الكامل.",
      "ارجع ببطء في ثلاث ثوانٍ إلى البداية.",
      "٣ × ١٠ بمقاومةٍ تجعل آخرَ تكرارين جهداً بلا ألمٍ في الذراع، وراحةُ دقيقةٍ بين المجموعات.",
    ], [
      "Keep the upper arm fixed by the side — it does not move.",
      "Slowly straighten the elbow until the hand is behind the body.",
      "Hold for a second at full extension.",
      "Return slowly over three seconds to the start.",
      "3 × 10 with a resistance that makes the last two repetitions an effort without arm pain, resting a minute between sets.",
    ]],
    cues: [[
      "تحريكُ الكتف والعضد ⟵ العضدُ ثابتٌ والمرفقُ وحده يتحرّك.",
      "رفعُ الرأس وبسطُ الرقبة ⟵ الرقبةُ على استقامة الظهر والنظرُ إلى الأرض أمامك.",
      "الرجوعُ السريع ⟵ ثلاثُ ثوانٍ في الرجوع.",
      "مقاومةٌ تُحدث وخزاً في الذراع ⟵ مطّاطٌ أخفّ.",
    ], [
      "Moving the shoulder and upper arm → the upper arm still, only the elbow moving.",
      "Lifting the head and arching the neck → the neck in line with the back, eyes on the floor ahead.",
      "A fast return → three seconds on the way back.",
      "Resistance that causes tingling in the arm → a lighter band.",
    ]],
    easier: ["مطّاطٌ أخفّ، أو بلا مطّاط (وزنُ الساعد وحده)، أو جالساً والعضدُ مسنود.", "A lighter band, no band (the forearm's own weight), or seated with the upper arm supported."],
    harder: ["مطّاطٌ أقوى أو ثقلٌ صغير (١–٢ كغم)، أو ٣ × ١٥.", "A stronger band or a small weight (1–2 kg), or 3 × 15."],
    stopIf: ["وخزٌ أو ألمٌ في الذراع يزيد أثناء التمرين ويبقى بعده، أو ضعفٌ يزيد من أسبوعٍ إلى أسبوع ⟵ الأخصائيّ.",
      "Tingling or arm pain that increases during the exercise and lasts after it, or weakness that increases from week to week → the therapist."],
    equipment: ["مطّاطُ مقاومة.", "A resistance band."],
    doseNote: ["لا تجربةَ لتقوية العضلة الضعيفة في الاعتلال الجذريّ (بحثٌ صفريّ) — ٣ × ١٠ اقتراح.", "No trial of strengthening the weak muscle in radiculopathy (a documented zero result) — 3 × 10 is a suggestion."],
    images: [{ key: "triceps-band-extension-1", ar: "واقفٌ بقدمٍ أمام الأخرى والمطّاطُ تحت القدم الأمامية: المرفقُ مثنيّ ثمّ منفردٌ واليدُ خلف الجسم",
      en: "Standing in a split stance with the band under the front foot: the elbow bent, then straightened with the hand behind the body", search: "triceps kickback resistance band" }],
  },
  {
    code: "wrist-extension-weight", nameAr: "بسط الرسغ بثقلٍ خفيف", nameEn: "Wrist extension with a light weight",
    kind: "strength", region: "wrist_hand", sets: 3, reps: 10, rest: 60,
    purpose: ["ضعفُ الجذر السادس يظهر في باسطات الرسغ (ومعها ذاتُ الرأسين — Iyer 2016). والضعفُ يعود غالباً (Kwon 2026)، ولا تجربةَ لتقوية العضلة الضعيفة في الاعتلال الجذريّ (بحثٌ صفريّ) — فهي اقتراحٌ يُعطى دون أن يزيد ألمُ الذراع، والقوّةُ تُقاس كلَّ أسبوع.",
      "C6 weakness shows in the wrist extensors (together with the biceps — Iyer 2016). Weakness usually recovers (Kwon 2026), and there is no trial of strengthening the weak muscle in radiculopathy (a documented zero result) — so it is a suggestion given without increasing arm pain, and strength is measured every week."],
    start: ["جالسٌ والساعدُ مسنودٌ على طاولةٍ أو الفخذ والكفُّ إلى الأسفل، واليدُ خارج الحافّة تمسك ثقلاً خفيفاً (نصف كيلو إلى كيلو، أو قنينة ماء).",
      "Sitting with the forearm supported on a table or the thigh, palm down, and the hand over the edge holding a light weight (half a kilo to a kilo, or a water bottle)."],
    steps: [[
      "دَع الرسغَ ينخفض قليلاً بالثقل.",
      "ارفع ظهرَ اليد ببطء إلى الأعلى برجوع الرسغ، والساعدُ ثابتٌ على الطاولة.",
      "اثبت ثانيةً في الأعلى.",
      "أنزل ببطء في ثلاث ثوانٍ.",
      "٣ × ١٠، وراحةُ دقيقةٍ بين المجموعات.",
    ], [
      "Let the wrist drop slightly with the weight.",
      "Slowly lift the back of the hand by bending the wrist back, with the forearm still on the table.",
      "Hold for a second at the top.",
      "Lower slowly over three seconds.",
      "3 × 10, resting a minute between sets.",
    ]],
    cues: [[
      "رفعُ الساعد عن الطاولة ⟵ الساعدُ ثابت والرسغُ وحده يتحرّك.",
      "الحركةُ بالقذف ⟵ رفعٌ ونزولٌ بطيئان.",
      "ثقلٌ كبير يُحدث ألماً في المرفق ⟵ ثقلٌ أخفّ.",
      "رفعُ الكتف ⟵ الكتفُ مرتخٍ.",
    ], [
      "Lifting the forearm off the table → the forearm still, only the wrist moving.",
      "Flicking the weight → slow lifting and lowering.",
      "A heavy weight causing elbow pain → a lighter weight.",
      "Hitching the shoulder → the shoulder relaxed.",
    ]],
    easier: ["بلا ثقل، أو بمساعدة اليد الأخرى في الرفع.", "No weight, or with the other hand helping the lift."],
    harder: ["ثقلٌ أكبر قليلاً (١–٢ كغم) أو ٣ × ١٥.", "A slightly heavier weight (1–2 kg) or 3 × 15."],
    stopIf: ["ألمٌ في المرفق من الخارج، أو وخزٌ في الذراع يزيد ويبقى، أو ضعفٌ يزيد ⟵ الأخصائيّ.", "Pain on the outer elbow, tingling in the arm that increases and lasts, or increasing weakness → the therapist."],
    equipment: ["ثقلٌ خفيف أو قنينةُ ماء؛ طاولة.", "A light weight or a water bottle; a table."],
    doseNote: ["٣ × ١٠ اقتراح — لا تجربة (بحثٌ صفريّ).", "3 × 10 is a suggestion — no trial (a documented zero result)."],
    images: [{ key: "wrist-extension-weight-1", ar: "الساعدُ على الطاولة والكفُّ إلى الأسفل واليدُ خارج الحافّة: الرسغُ منخفضٌ ثمّ مرفوعٌ بالثقل",
      en: "Forearm on a table, palm down, hand over the edge: the wrist lowered, then lifted with the weight", search: "wrist extension dumbbell forearm supported" }],
  },
  {
    code: "grip-putty-squeeze", nameAr: "تقوية القبضة بعصر المعجون أو الكرة الطرية", nameEn: "Grip strengthening — squeezing therapy putty or a soft ball",
    kind: "strength", region: "wrist_hand", sets: 3, reps: 10, hold: 3, rest: 60,
    purpose: ["ضعفُ الجذر الثامن يظهر في قابضات الأصابع وعضلات اليد الصغيرة — القبضة (Iyer 2016)؛ والقبضةُ بالمقياس من مقاييس المتابعة (الفرقُ المهمّ ٥–٦٫٥ كغم — Bohannon 2019). والضعفُ يعود غالباً (Kwon 2026)، ولا تجربةَ لتقوية العضلة الضعيفة في الاعتلال الجذريّ (بحثٌ صفريّ) — فهي اقتراحٌ يُعطى دون أن يزيد ألمُ الذراع.",
      "C8 weakness shows in the finger flexors and the small hand muscles — grip (Iyer 2016); dynamometer grip is one of the follow-up measures (important change 5–6.5 kg — Bohannon 2019). Weakness usually recovers (Kwon 2026), and there is no trial of strengthening the weak muscle in radiculopathy (a documented zero result) — so it is a suggestion given without increasing arm pain."],
    start: ["جالسٌ والساعدُ على الطاولة، واليدُ الضعيفة تمسك كرةً من معجون العلاج أو كرةً طرية.", "Sitting with the forearm on the table and the weak hand holding a ball of therapy putty or a soft ball."],
    steps: [[
      "اعصر المعجونَ بكلّ الأصابع ببطء حتى قبضةٍ كاملة.",
      "اثبت ثلاث ثوانٍ.",
      "أرخِ الأصابعَ ببطء.",
      "٣ × ١٠، وراحةُ دقيقةٍ بين المجموعات.",
    ], [
      "Squeeze the putty slowly with all the fingers into a full fist.",
      "Hold for three seconds.",
      "Relax the fingers slowly.",
      "3 × 10, resting a minute between sets.",
    ]],
    cues: [[
      "ثنيُ الرسغ إلى الأسفل أثناء العصر ⟵ الرسغُ مستقيمٌ أو راجعٌ قليلاً.",
      "العصرُ السريع ⟵ عصرٌ وإرخاءٌ بطيئان.",
      "حبسُ النفس ⟵ تنفّسٌ طبيعيّ.",
      "معجونٌ قاسٍ يؤلم اليد ⟵ معجونٌ أطرى.",
    ], [
      "Bending the wrist down while squeezing → the wrist straight or slightly back.",
      "Squeezing fast → slow squeezing and releasing.",
      "Holding the breath → normal breathing.",
      "A hard putty that hurts the hand → a softer putty.",
    ]],
    easier: ["معجونٌ أطرى أو إسفنجة، أو عصرٌ بلا ثبات.", "A softer putty or a sponge, or squeezing without the hold."],
    harder: ["معجونٌ أقسى، أو تمارينُ الأصابع: القرصُ بين الإبهام وكلّ إصبع، وفتحُ الأصابع ضدّ حلقةٍ مطّاطية.", "A firmer putty, or finger exercises: pinching between the thumb and each finger, and opening the fingers against a rubber ring."],
    stopIf: ["ألمٌ في اليد أو وخزٌ يزيد ويبقى، أو ضعفٌ يزيد ⟵ الأخصائيّ.", "Hand pain or tingling that increases and lasts, or increasing weakness → the therapist."],
    equipment: ["معجونُ علاجٍ أو كرةٌ طرية.", "Therapy putty or a soft ball."],
    doseNote: ["٣ × ١٠ بثبات ثلاث ثوانٍ اقتراح — لا تجربة؛ والقبضةُ تُقاس بالمقياس كلَّ أسبوع.", "3 × 10 with a three-second hold is a suggestion — no trial; grip is measured with the dynamometer every week."],
    images: [{ key: "grip-putty-squeeze-1", ar: "يدٌ تعصر كرةً من معجون العلاج بقبضةٍ كاملة", en: "A hand squeezing a ball of therapy putty into a full fist", search: "therapy putty grip squeeze" }],
  },
];

const EXTEND_AR = "وفي الجلسة ١٨: تمديدٌ واحد بستّ جلسات (حتى ٢٤ — أربعةُ أسابيع، كمدّة كثيرٍ من التجارب الإيجابية: Fritz 2014 · Rafiq 2022 · Jellad 2024) إن لم يتحقّق واحدٌ أو أكثر من معايير الخروج وكان ما يزال يتحسّن منذ الجلسة ١٢ — ألمُ الذراع نقص ٢٫٢ نقطة فأكثر أو NDI نقص ٧ نقاط فأكثر (الفرقُ المهمّ — Young 2010 · Cleland 2006) — ولا علامةَ إحالة؛ ولا تمديدَ لمن ثبت بلا تغيّر: يُحال إلى الطبيب (القواعدُ في «موانع وإحالة»)، والبرنامجُ المنزليّ يستمرّ. ولا تجربةَ لدورةٍ ثانية (بحثٌ صفريّ).";
const EXTEND_EN = "At session 18: one extension of six sessions (to 24 — four weeks, the length of many positive trials: Fritz 2014 · Rafiq 2022 · Jellad 2024) if one or more discharge criteria are unmet and the patient is still improving since session 12 — arm pain down 2.2 points or more or NDI down 7 points or more (the important change — Young 2010 · Cleland 2006) — with no referral trigger; no extension for a patient who has not changed: refer to the doctor (the rules under 'Contraindications and referral'), and the home programme continues. There is no trial of a second course (a documented zero result).";
const INTENSITY_AR = "قاعدةُ الشدّة في كلّ تمرينٍ وتحريك: البدءُ بشدّةٍ منخفضة والتدرّجُ بحسب الاستجابة (Kjaer 2017)؛ ألمُ الذراع أو الوخزُ يزيد بعد الجلسة ويبقى أكثر من نصف ساعة أو إلى صباح اليوم التالي، أو ينزل أبعدَ في الذراع ⟵ الجلسةُ التالية أخفّ والحركةُ التي أنزلته تُترك — قاعدةٌ عمليّة لا رقمٌ مجرَّب.";
const INTENSITY_EN = "Intensity rule for every exercise and mobilisation: start at low intensity and progress by response (Kjaer 2017); arm pain or tingling that rises after a session and lasts more than half an hour or until the next morning, or spreads further down the arm → the next session is lighter and the movement that spread it is dropped — a practical rule, not a tested threshold.";

export const PROTOCOL: ProtocolContentSeed = {
  code: "cervical-radiculopathy-adult",
  summary: [
    "الاعتلالُ الجذريّ العنقيّ (Cervical radiculopathy) عند البالغين: ألمٌ ينزل من الرقبة إلى الذراع — وغالباً أشدُّ من ألم الرقبة نفسِها — مع تنميلٍ أو وخزٍ أو ضعفٍ أو نقصٍ في المنعكس في توزيع جذرٍ عصبيّ، من انزلاقٍ غضروفيّ أو تضيّقٍ في الثقبة الفقرية بالتنكّس. أكثرُه بين ٥٠ و٥٤ سنة (٨٣ لكلّ مئة ألف في السنة)، والجذرُ السابع أكثرُ الجذور إصابةً ثمّ السادس (Radhakrishnan 1994). تشخيصُه سريريّ بمجموعة الاختبارات لا باختبارٍ وحده: ثلاثةٌ من أربعة (سبرلنغ، والتوتّرُ العصبيّ للعصب الأوسط، والجذب، ودورانُ الرقبة أقلُّ من ٦٠° لجهة الألم) ترجّحه بقوّة (Wainner 2003 · Grondin 2026)، والصورةُ للعلامات الحمراء أو لمن يُفكَّر له بالجراحة (Iyer 2016). " +
    "مسارُه مطمئنٌ غالباً لكنّه بطيء: تحسّنٌ كبير خلال ٤–٦ أشهر وشفاءٌ كامل عند نحو ٨٣٪ بعد سنتين إلى ثلاث (Wong 2014)، ونحو ٩٠٪ بلا عجزٍ أو بعجزٍ خفيف بعد خمس سنوات مع عودةٍ عند الثلث (Radhakrishnan 1994)؛ والضعفُ يعود غالباً — ٧٣٪ استعادوا قوّةً أربعةً من خمس خلال شهرين إلى ثلاثة (Kwon 2026). " +
    "الإرشادات: في الحادّ «يمكن» تمارينُ التحريك والتثبيت والليزرُ والطوقُ لمدّةٍ قصيرة (JOSPT 2017 — C)، وفي المزمن «ينبغي» الشدُّ الآليّ المتقطّع مع التمطيط والتقوية وتحريكِ الفقرات الرقبية والصدرية (B)، والتثقيفُ للبقاء في العمل والنشاط (B)؛ والإرشادُ الدنماركيّ يوصي — توصيةً ضعيفة — بتمارين التحكّم الحركيّ والعلاج اليدويّ والشدّ، ويوقف الشدَّ إن لم ينفع في الحال (Kjaer 2017)؛ وNASS لا يجد دراساتٍ كافية للعلاج الطبيعيّ ويقترح الجراحةَ لمن يريد تخفيفاً سريعاً (Bono 2011)؛ وإرشاداتٌ أخرى ضدّ الطوق والليزر والشدّ (Côté 2016 · Bier 2018) — فالإرشاداتُ متضاربةٌ في هذه الثلاثة. " +
    "وفي التجارب: ١٢ جلسة في ستّة أسابيع أنقصت ألمَ الذراع ١٢ ملم من ١٠٠ فوق الانتظار عند ستّة أسابيع، وتساوت المجموعاتُ عند ستّة أشهر (Kuijper 2009)؛ والعلاجُ الطبيعيّ المنظّم بلغ ما بلغته الجراحةُ في الإعاقة وألم الذراع عند سنتين، والجراحةُ أسرعُ وأفضلُ لألم الرقبة (Engquist 2013)؛ وتحريكُ العصب أقوى التقنيات الخاصّة دليلاً (Lascurain-Aguirrebeña 2024)، والشدُّ مع التمرين أنقص الإعاقةَ عند ستّة أشهر وسنة (Fritz 2014) وأثرُه المجمَّع صغيرٌ سريريّاً (Colombo 2020). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — فحصُ النخاع والفحصُ العصبيّ، والتثقيفُ والطمأنةُ الصادقة، ووضعياتُ الراحة، وتحريكُ العصب بالمنزلقات، والعضلاتُ العميقة للرقبة ولوحُ الكتف، والعلاجُ اليدويّ، وتقويةُ العضلة الضعيفة، والبرنامجُ المنزليّ اليوميّ — والشدُّ تجربةٌ لمن يستجيب، والأجهزةُ الأخرى مساعدة. ثلاثُ مراحل بالحساسية: عاليةٌ (ألمُ الذراع غالب) ثمّ متوسّطة ثمّ منخفضة وعودةٌ إلى العمل والصلاة، بمعايير رقمية من الفرق المهمّ وخطأ القياس، وقواعدِ إحالةٍ في الجلسات ٦ و١٢ و١٨.",
    "Cervical radiculopathy in adults: pain travelling from the neck into the arm — usually worse than the neck pain itself — with numbness, tingling, weakness or a reduced reflex in the distribution of a nerve root, from a disc herniation or degenerative narrowing of the intervertebral foramen. It peaks at 50–54 years (83 per 100,000 per year), and C7 is the most commonly affected root, then C6 (Radhakrishnan 1994). Diagnosis is clinical, by a cluster of tests rather than any single one: three of four (Spurling, the median-nerve neurodynamic test, distraction, and neck rotation under 60° towards the painful side) make it highly likely (Wainner 2003 · Grondin 2026), and imaging is for red flags or when surgery is being considered (Iyer 2016). " +
    "Its course is usually reassuring but slow: substantial improvement within 4–6 months and complete recovery in about 83% by two to three years (Wong 2014), and about 90% with no or mild disability at five years, though a third have a recurrence (Radhakrishnan 1994); weakness usually recovers — 73% regained strength of four out of five within two to three months (Kwon 2026). " +
    "Guidelines: in the acute stage clinicians 'may' use mobilising and stabilising exercises, laser and short-term collar use (JOSPT 2017 — C), and in the chronic stage 'should' use mechanical intermittent traction with stretching, strengthening and cervical and thoracic mobilisation (B), plus education to stay at work and active (B); the Danish guideline makes weak recommendations for motor-control exercise, manual therapy and traction, stopping traction if it does not help immediately (Kjaer 2017); NASS finds insufficient studies on physiotherapy and suggests surgery for those wanting rapid relief (Bono 2011); other guidelines oppose the collar, laser and traction (Côté 2016 · Bier 2018) — so guidelines conflict on these three. " +
    "In trials: 12 sessions over six weeks reduced arm pain by 12 mm out of 100 more than waiting at six weeks, with the groups equal at six months (Kuijper 2009); structured physiotherapy matched surgery on disability and arm pain at two years, with surgery faster and better for neck pain (Engquist 2013); nerve mobilisation is the specific technique with the best support (Lascurain-Aguirrebeña 2024), and traction added to exercise reduced disability at six and twelve months (Fritz 2014) with a pooled effect that is clinically small (Colombo 2020). " +
    "So the protocol: a core in every session — myelopathy and neurological screening, education and honest reassurance, relief positions, nerve sliders, deep neck and scapular muscles, manual therapy, strengthening of the weak muscle and the daily home programme — with traction as a trial for responders and other devices as adjuncts. Three phases by irritability: high (arm pain predominant), then moderate, then low with a return to work and prayer, with numeric criteria from the important change and measurement error, and referral rules at sessions 6, 12 and 18.",
  ],
  goals: [
    "• ألمُ الذراع (من ١٠) ينقص ٢٫٢ نقطة فأكثر (الفرقُ المهمّ — Young 2010) ويصير ٣ أو أقلّ، وألمُ الرقبة كذلك.\n" +
    "• مؤشّرُ إعاقة الرقبة (NDI من ٥٠) ينقص ٧ نقاط فأكثر (Cleland 2006)، والأفضلُ ١٠ فأكثر — أكبرُ من خطأ القياس.\n" +
    "• الأنشطةُ التي اختارها المريض (PSFS) تتحسّن نقطتين فأكثر (٢٫١٥ في النسخة العربية — Alnahdi 2025).\n" +
    "• قوّةُ العضلة الضعيفة لا تنقص بل تزيد، والقبضةُ بالمقياس تقترب من الجهة الأخرى (الفرقُ المهمّ ٥–٦٫٥ كغم — Bohannon 2019).\n" +
    "• سبرلنغ واختبارُ التوتّر العصبيّ لا يعيدان الأعراضَ في اليد، أو يحتاجان مدىً أكبر لإعادتها.\n" +
    "• العودةُ إلى العمل والقيادة والنوم والصلاة والوضوء بلا ألمٍ ينزل إلى الذراع، وبرنامجٌ منزليّ يؤدّيه وحده.\n" +
    "• فهمُ الحالة ومسارها وعلاماتِ الخطر التي توجب العودةَ فوراً.",
    "• Arm pain (out of 10) down 2.2 points or more (the important change — Young 2010) and at 3 or less, and neck pain likewise.\n" +
    "• Neck Disability Index (NDI out of 50) down 7 points or more (Cleland 2006), ideally 10 or more — beyond the measurement error.\n" +
    "• The activities the patient chose (PSFS) improve by 2 points or more (2.15 in the Arabic version — Alnahdi 2025).\n" +
    "• Strength of the weak muscle does not fall but rises, and dynamometer grip approaches the other side (important change 5–6.5 kg — Bohannon 2019).\n" +
    "• Spurling and the neurodynamic test no longer reproduce hand symptoms, or need more range to do so.\n" +
    "• Return to work, driving, sleep, prayer and ablution without pain travelling into the arm, with a home programme done independently.\n" +
    "• Understanding of the condition, its course and the warning signs that require an immediate return.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج:\n" +
    "• التاريخ: موضعُ الألم ونزولُه (الذراعُ أشدُّ أم الرقبة)، والتنميلُ والضعف، وما يريحه (اليدُ على الرأس أو في الجيب — Sleijser-Koehorst 2021) وما يزيده (النظرُ إلى الأسفل والقراءة — Abdulwahab 2000)، ومدّتُه، والنومُ والعمل.\n" +
    "• فحصُ اعتلال النخاع في كلّ تقييم — يشبه الاعتلالَ الجذريّ: اضطرابُ المشي، وعلامةُ هوفمان، والمنعكسُ الكعبريّ المقلوب، وبابنسكي، والعمرُ فوق ٤٥ — واحدةٌ أو لا شيء تستبعده، وثلاثٌ من خمسٍ ترجّحه بقوّة (Cook 2010)؛ ومعها خراقةُ اليدين وعلامةُ لرميت (صعقةٌ كالكهرباء في الظهر أو الأطراف عند ثني الرقبة — Davies 2018).\n" +
    "• فحصُ الشرايين والعلامات الحمراء قبل العلاج اليدويّ والشدّ: عواملُ الخطر (رضٌّ قريب، تدخين، ضغط، صداعٌ نصفيّ، كوليسترول)، وضغطُ الدم، وأعراضُ الأعصاب القحفية والدوخة — واختباراتُ وضعيات الشريان الفقريّ لا يُعتمد عليها (Rushton 2023).\n" +
    "• الفحصُ العصبيّ للجذور: القوّةُ من ٥ (MRC) للعضلات المفتاحية — الخامس: الدالية؛ السادس: ذاتُ الرأسين وباسطاتُ الرسغ؛ السابع: ثلاثيةُ الرؤوس وقابضاتُ الرسغ؛ الثامن: قابضاتُ الأصابع؛ الصدريّ الأوّل: عضلاتُ اليد الصغيرة — والإحساسُ والمنعكسات (Iyer 2016)؛ والألمُ قد لا يتبع خريطةَ الجلد (Slipman 1998).\n" +
    "• مجموعةُ التشخيص (Wainner 2003): سبرلنغ، والتوتّرُ العصبيّ للعصب الأوسط (ULNT1)، والجذب، ودورانُ الرقبة لجهة الألم — ثلاثةٌ من أربعة ترجّح (نسبةُ الأرجحية ٦٫١، وأربعةٌ ٣٠٫٣ — Murphy 2008)، ولا شيءَ منها يستبعد (Grondin 2026)؛ واختباراتُ التوتّر العصبيّ الأربعة إن كانت كلُّها سلبيةً تستبعد (Thoomes 2026).\n" +
    "• المقاييس: ألمُ الذراع وألمُ الرقبة كلٌّ من ١٠ منفصلين (العربيّ — Alghadir 2016؛ والفرقُ المهمّ ٢٫٢ وخطأُ القياس ٤٫١ — Young 2010: فتغيّرُ نقطتين قد يكون ضمن الخطأ للمريض الواحد فيُؤكَّد بالإعاقة والأنشطة)، ومؤشّرُ إعاقة الرقبة بالعربية (NDI — Shaheen 2013؛ الفرقُ المهمّ ٧ وخطأُ القياس ١٠٫٢ — Cleland 2006)، والأنشطةُ التي يختارها المريض بالعربية (PSFS — Alnahdi 2025، ومنها الصلاةُ والوضوءُ والعمل)، والقبضةُ بالمقياس للجهتين (Bohannon 2019)، ودورانُ الرقبة (خطأُ القياس ٣٫٦–٦٫٥° — Audette 2010)، واستبيانُ الألم العصبيّ DN4 بالعربية إن كان الألمُ حارقاً أو كالكهرباء (Chatila 2017).\n" +
    "• الحساسيةُ للمرحلة: عاليةٌ — ألمٌ في الراحة أو قبل منتصف المدى، والذراعُ أشدُّ من الرقبة، وأعراضٌ أحدثُ من ستّة أسابيع أو سريعةُ التهيّج؛ ومتوسّطة؛ ومنخفضة — ألمٌ عند نهاية المدى وأعراضُ ذراعٍ متقطّعة (اقتراحٌ من وصف المراحل — Thoomes 2022).\n" +
    "• يُعاد التقييمُ كاملاً في الجلسات ٦ و١٢ و١٨ (و٢٤ إن مُدّد)، والقوّةُ والقبضةُ كلَّ أسبوع.",
    "At the first session, before any treatment:\n" +
    "• History: where the pain is and how far it travels (is the arm worse than the neck), numbness and weakness, what eases it (the hand on the head or in a pocket — Sleijser-Koehorst 2021) and what aggravates it (looking down and reading — Abdulwahab 2000), its duration, sleep and work.\n" +
    "• Myelopathy screen at every assessment — it can mimic radiculopathy: gait disturbance, Hoffmann sign, inverted supinator sign, Babinski, age over 45 — one or none rules it out, three of five make it highly likely (Cook 2010); together with clumsy hands and Lhermitte's sign (an electric-shock sensation down the back or limbs on neck flexion — Davies 2018).\n" +
    "• Vascular and red-flag screen before manual therapy and traction: risk factors (recent trauma, smoking, hypertension, migraine, high cholesterol), blood pressure, cranial-nerve symptoms and dizziness — positional vertebral-artery tests are not reliable (Rushton 2023).\n" +
    "• Root neurological examination: strength out of 5 (MRC) in key muscles — C5: deltoid; C6: biceps and wrist extensors; C7: triceps and wrist flexors; C8: finger flexors; T1: the small hand muscles — with sensation and reflexes (Iyer 2016); pain may not follow the dermatome map (Slipman 1998).\n" +
    "• Diagnostic cluster (Wainner 2003): Spurling, the median-nerve neurodynamic test (ULNT1), distraction and neck rotation towards the painful side — three of four make it likely (likelihood ratio 6.1, and four 30.3 — Murphy 2008), and none positive rules it out (Grondin 2026); all four neurodynamic tests negative rules it out (Thoomes 2026).\n" +
    "• Measures: arm pain and neck pain, each out of 10, separately (Arabic — Alghadir 2016; important change 2.2 and measurement error 4.1 — Young 2010: so a 2-point change may be within error for an individual and is confirmed by disability and activities), the Arabic Neck Disability Index (NDI — Shaheen 2013; important change 7, measurement error 10.2 — Cleland 2006), the Arabic Patient-Specific Functional Scale (PSFS — Alnahdi 2025, including prayer, ablution and work), dynamometer grip on both sides (Bohannon 2019), neck rotation (measurement error 3.6–6.5° — Audette 2010), and the Arabic DN4 neuropathic questionnaire when pain is burning or electric (Chatila 2017).\n" +
    "• Irritability for the phase: high — pain at rest or before mid-range, arm worse than neck, symptoms under six weeks or quickly provoked; moderate; and low — pain at end range with intermittent arm symptoms (a proposal from the stage descriptions — Thoomes 2022).\n" +
    "• The full assessment is repeated at sessions 6, 12 and 18 (and 24 if extended), with strength and grip every week.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• وضعياتُ الراحة: اليدُ على الرأس واليدُ في الجيب؛ وسحبُ الذقن للخلف المتكرّر يُستعمل فقط إن أنقص ألمَ الذراع أو ركّزه في الرقبة، ويُترك إن نزل الألمُ أبعد (Abdulwahab 2000 · Kjaer 2017).\n" +
    "• تحريكُ العصب: منزلقُ العصب الأوسط (١ × ١٠ بثبات ثلاث ثوانٍ — Rafiq 2022) ومنزلقُ الزنديّ لمن أعراضُه في الإصبع الصغيرة، ثمّ زيادةُ المجموعات؛ والشادّاتُ لاحقاً إن لم تُهيّج — والمنزلقاتُ أقلُّ شدّاً على العصب (Coppieters 2008)؛ والانزلاقُ الجانبيّ للرقبة بيد الأخصائيّ (Coppieters 2003).\n" +
    "• العضلاتُ العميقة القابضة للرقبة: إيماءةُ الذقن ١٠ × ١٠ ثوانٍ مرّتين يومياً (Raney 2009) ثمّ التحمّل؛ والتمارينُ الثابتة ٣ × ١٠ بثبات خمس ثوانٍ (Rafiq 2022) — بلا زيادةٍ في الألم (Kjaer 2017).\n" +
    "• لوحُ الكتف والظهرُ العلويّ: ضبطُ اللوح والتجديفُ ورفعُ الذراعين في الانبطاح وبسطُ الظهر العلويّ (٣ × ١٠).\n" +
    "• العلاجُ اليدويّ مع التمرين لا وحده: تحريكُ الفقرات الرقبية (الدرجتان الأولى والثانية ثمّ الثالثة والرابعة) والصدرية؛ والتلاعبُ الصدريّ يخفّف ألمَ الرقبة لا الذراع (Young 2019) — وكلُّه بعد فحص الشرايين.\n" +
    "• تقويةُ العضلة الضعيفة: ثلاثيةُ الرؤوس (السابع) وباسطاتُ الرسغ (السادس) والقبضة (الثامن) — ٣ × ١٠ دون أن يزيد ألمُ الذراع؛ لا تجربةَ لها (بحثٌ صفريّ) فهي اقتراح، والقوّةُ تُتابَع كلَّ أسبوع.\n" +
    "• المرحلةُ الثالثة: مشيٌ متدرّج وتقويةٌ عامّة (Thoomes 2022)، وتحمّلُ عضلات الرقبة بحِمل، والمهامُّ الوظيفية: العملُ والصلاةُ والوضوء.\n" +
    "• البرنامجُ المنزليّ يوميّ في كلّ المراحل: المنزلقاتُ وإيماءةُ الذقن ووضعياتُ الراحة — وهو ما بقي بعد انتهاء الإشراف في التجارب (Dedering 2014).\n" +
    INTENSITY_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Relief positions: the hand on the head and the hand in a pocket; repeated chin retraction is used only if it reduces arm pain or centralises it into the neck, and is dropped if pain spreads further (Abdulwahab 2000 · Kjaer 2017).\n" +
    "• Nerve mobilisation: the median-nerve slider (1 × 10 with a three-second hold — Rafiq 2022) and the ulnar slider for symptoms in the little finger, then more sets; tensioners later if they do not provoke — sliders put less strain on the nerve (Coppieters 2008); the cervical lateral glide by the therapist (Coppieters 2003).\n" +
    "• Deep neck flexors: chin nods 10 × 10 seconds twice a day (Raney 2009), then endurance; isometrics 3 × 10 with five-second holds (Rafiq 2022) — without increasing pain (Kjaer 2017).\n" +
    "• Scapula and upper back: scapular setting, rows, prone arm raises and upper-back extension (3 × 10).\n" +
    "• Manual therapy alongside exercise, never alone: cervical mobilisation (grades I–II, then III–IV) and thoracic mobilisation; thoracic thrust manipulation eases neck pain, not arm pain (Young 2019) — all after the vascular screen.\n" +
    "• Strengthening the weak muscle: triceps (C7), wrist extensors (C6) and grip (C8) — 3 × 10 without increasing arm pain; there is no trial (a documented zero result), so it is a suggestion, and strength is followed every week.\n" +
    "• Phase 3: graded walking and general strengthening (Thoomes 2022), loaded neck-muscle endurance, and functional tasks: work, prayer and ablution.\n" +
    "• The daily home programme in every phase: sliders, chin nods and relief positions — what continued after supervision ended in trials (Dedering 2014).\n" +
    INTENSITY_EN,
  ],
  contraindications: [
    "قواعدُ إحالةٍ يطبّقها المعالج (Rushton 2023 · Cook 2010 · Kjaer 2017 · Kwon 2026):\n" +
    "• طارئة — يتوقّف العلاج ويُحال في اليوم نفسه: اعتلالُ نخاعٍ يسوء بسرعة، أو اضطرابٌ جديد في البول أو البراز؛ أعراضٌ وعائية (صداعٌ مفاجئ شديد، تدلّي الجفن وصغرُ الحدقة، أعراضُ الأعصاب القحفية، دوخةٌ جديدة مع ألم الرقبة بعد رضّ، أعراضٌ كالسكتة العابرة) — وتسلّخُ الشريان الفقريّ قد يبدأ بألم رقبةٍ ينزل إلى الذراع (Feller 2026)؛ التهابٌ جرثوميّ (ألمٌ مع حمّى وأعراضٍ عصبية، والسكّريّ وضعفُ المناعة يزيدان خطره — Yusuf 2019)؛ كسرٌ بعد رضّ.\n" +
    "• عاجلة — خلال أيّام إلى الطبيب والرنين: ثلاثٌ من خمسٍ في مجموعة النخاع أو علاماتُه تسوء؛ ضعفٌ يزيد؛ ضعفٌ شديد (قوّةٌ ٢ من ٥ أو أقلّ، أو ٣ ولا يتحسّن)؛ أعراضٌ في الذراعين معاً؛ سوابقُ ورمٍ أو نقصُ وزنٍ غير مفسَّر أو ألمٌ ليليّ لا علاقةَ له بالحركة (Occhetto 2026).\n" +
    "• في الجلسة ٦: ألمُ الذراع لم ينقص أو زاد، أو ضعفٌ جديد ⟵ يُراجَع التشخيصُ والعلاج مع طبيب المركز.\n" +
    "• في الجلسة ١٢: لم ينقص ألمُ الذراع ٢٫٢ نقطة ولا NDI ٧ نقاط ⟵ إلى الطبيب للمراجعة وربّما الرنين.\n" +
    "• في الجلسة ١٨ (أو ٢٤ إن مُدّد) بلا تحسّنٍ مهمّ، أو مرّت ٨–١٢ أسبوعاً على البداية بلا تحسّن ⟵ رأيُ جرّاح العمود الفقريّ (Kjaer 2017)؛ والضعفُ الذي لا يعود خلال شهرين عند من عمرُه ٥٩ فأكثر أو قوّتُه ٢ من ٥ أو أقلّ ⟵ رأيُ الجرّاح (Kwon 2026)؛ والجراحةُ في الأشهر الستّة الأولى أنقصت ألمَ الذراع أكثر (Burneikiene 2015) — فلا يُطال علاجٌ محافظٌ لا ينفع.\n" +
    "• الحقنةُ فوق الجافية قرارُ الطبيب لمن يمنعه ألمُ الذراع الشديد من العلاج (Cohen 2014)، ولها في الحقن عبر الثقبة مخاطرُ نادرة لكنّها خطيرة (Scanlon 2007).\n" +
    "موانعُ العلاج اليدويّ والشدّ: علاماتُ اعتلال النخاع (والشدُّ «لا يُعطى روتينياً» في المتوسّط والشديد منه — JOSPT 2017)، والأعراضُ الوعائية أو فحصُها الإيجابيّ (Rushton 2023)، والكسرُ والورمُ والالتهاب؛ وعدمُ ثبات الفقرات العليا (والرثيانيّ) وهشاشةُ العظام الشديدة من قوائم الخبرة العامّة لا من تجارب الاعتلال الجذريّ.",
    "Referral rules the therapist applies (Rushton 2023 · Cook 2010 · Kjaer 2017 · Kwon 2026):\n" +
    "• Emergency — stop treatment and refer the same day: rapidly worsening myelopathy, or new bladder or bowel disturbance; vascular features (sudden severe headache, drooping eyelid with a small pupil, cranial-nerve symptoms, new dizziness with neck pain after trauma, TIA-like symptoms) — vertebral artery dissection can start as neck pain travelling into the arm (Feller 2026); infection (pain with fever and neurological symptoms, with diabetes and immunosuppression raising the risk — Yusuf 2019); fracture after trauma.\n" +
    "• Urgent — to the doctor and MRI within days: three of five in the myelopathy cluster or worsening myelopathic signs; increasing weakness; severe weakness (strength 2 of 5 or less, or 3 and not improving); symptoms in both arms; a history of cancer, unexplained weight loss or night pain unrelated to movement (Occhetto 2026).\n" +
    "• At session 6: arm pain not reduced or worse, or new weakness → review the diagnosis and treatment with the centre's doctor.\n" +
    "• At session 12: arm pain not down 2.2 points and NDI not down 7 points → to the doctor for review and possibly MRI.\n" +
    "• At session 18 (or 24 if extended) without important improvement, or 8–12 weeks since onset without improvement → a spinal surgeon's opinion (Kjaer 2017); weakness not recovering within two months in a patient aged 59 or more or with strength 2 of 5 or less → a surgeon's opinion (Kwon 2026); surgery within the first six months reduced arm pain more (Burneikiene 2015) — so ineffective conservative care is not prolonged.\n" +
    "• An epidural injection is the doctor's decision for a patient whose severe arm pain prevents rehabilitation (Cohen 2014), and transforaminal injections carry rare but serious risks (Scanlon 2007).\n" +
    "Contraindications to manual therapy and traction: signs of myelopathy (traction 'should not be routinely prescribed' in moderate to severe myelopathy — JOSPT 2017), vascular features or a positive vascular screen (Rushton 2023), fracture, tumour and infection; upper-cervical instability (including rheumatoid) and severe osteoporosis come from general expert lists rather than radiculopathy trials.",
  ],
  precautions: [
    "• الشدّة: الحساسيةُ العالية ⟵ بلا زيادةٍ في ألم الذراع أثناء التمرين وبعده، وقاعدةُ الشدّة في «التمارين» لكلّ المراحل.\n" +
    "• الشدّ: تجربةٌ في جلستين أو ثلاث، ويستمرّ فقط إن خفّف في الحال أو ركّز الألم (Kjaer 2017)، ويُوقف عند الدوخة (Jellad 2024)؛ ولا يُعطى مع اعتلال النخاع.\n" +
    "• التلاعبُ الرقبيّ بحذرٍ وبعد فحص الشرايين وحده (Bono 2011 · Rushton 2023)؛ والصدريُّ يخفّف ألمَ الرقبة (Young 2019).\n" +
    "• الطوقُ الرقبيّ: خيارٌ في الأسابيع الأولى لألم ذراعٍ حادٍّ شديد لا يهدأ بغيره، جزءاً من النهار، ويُترك خلال ٣–٦ أسابيع (Kuijper 2009 · JOSPT 2017 — C)؛ لا في المزمن، وإرشاداتٌ أخرى ضدّه (Côté 2016).\n" +
    "• الضعف: القوّةُ والقبضةُ تُقاسان كلَّ أسبوع، وأيُّ نقصٍ ⟵ قواعدُ الإحالة.\n" +
    "• الأدويةُ والحقنُ ليست من عمل المعالج: يُسأل المريضُ عنها ويُحال إلى الطبيب (Kjaer 2017).\n" +
    "• السكّريُّ والضغطُ والتدخين: تُسأل لفحص الشرايين، والسكّريُّ يزيد خطرَ الالتهاب.\n" +
    "• العمل: البقاءُ نشيطاً والعودةُ بالتدرّج (JOSPT 2017 — B)؛ والهاتفُ ووضعيةُ الرأس: لا دليلَ قويّاً أنّها تسبّبه (Damasceno 2018)، والقراءةُ الطويلة بالرأس المنحني قد تزيده (Abdulwahab 2000) — فتُكسر بفترات.\n" +
    "• النوم: رقبةٌ محايدة ووضعياتٌ لا تعيد ألمَ الذراع؛ ولا وسادةَ ثبت أنّها أفضل (Ghosh 2025).\n" +
    "• الصلاةُ والوضوء: لا دراسةَ لوضعيات الرقبة فيهما (بحثٌ صفريّ) — تُختبر حركاتُ المريض نفسُها أنشطةً (PSFS)، وما يُنزل الألمَ إلى الذراع يُعدَّل مؤقّتاً (السجودُ بانثناءٍ أقلّ للرقبة، والمسحُ على الرأس باليد الأخرى، والصلاةُ جالساً عند الحاجة) حتى يعود؛ والحكمُ الشرعيّ للمريض ومرجعه.",
    "• Intensity: high irritability → no increase in arm pain during or after exercise, with the intensity rule under 'Exercises' for every phase.\n" +
    "• Traction: a trial of two or three sessions, continued only if it relieves immediately or centralises the pain (Kjaer 2017), stopped with dizziness (Jellad 2024); not given with myelopathy.\n" +
    "• Cervical manipulation with caution and only after the vascular screen (Bono 2011 · Rushton 2023); thoracic manipulation eases neck pain (Young 2019).\n" +
    "• Cervical collar: an option in the first weeks for severe acute arm pain not controlled otherwise, worn part of the day and weaned within 3–6 weeks (Kuijper 2009 · JOSPT 2017 — C); not in chronic radiculopathy, and other guidelines oppose it (Côté 2016).\n" +
    "• Weakness: strength and grip are measured every week, and any decline → the referral rules.\n" +
    "• Medicines and injections are not the therapist's role: the patient is asked about them and referred to the doctor (Kjaer 2017).\n" +
    "• Diabetes, hypertension and smoking: asked about for the vascular screen, and diabetes raises the risk of infection.\n" +
    "• Work: stay active and return gradually (JOSPT 2017 — B); phones and head posture: no strong evidence that they cause it (Damasceno 2018), while prolonged reading with the head bent can aggravate it (Abdulwahab 2000) — so it is broken up with breaks.\n" +
    "• Sleep: a neutral neck and positions that do not bring back arm pain; no pillow has been shown to be better (Ghosh 2025).\n" +
    "• Prayer and ablution: there is no study of neck positions in either (a documented zero result) — the patient's own movements are tested as activities (PSFS), and whatever sends pain into the arm is adapted temporarily (prostration with less neck bending, wiping the head with the other hand, praying seated if needed) until it recovers; the religious ruling is for the patient and their authority.",
  ],
  spw: 6, weeks: 3, minutes: 50, totalSessions: 18,
  refs: [
    { title: "Neck pain: revision 2017 — clinical practice guidelines", org: "JOSPT / APTA Orthopaedic Section (Blanpied et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.0302" },
    { title: "National clinical guidelines for non-surgical treatment of patients with recent onset neck pain or cervical radiculopathy", org: "Eur Spine J — Danish national clinical guideline (Kjaer et al.)", year: 2017, url: "https://doi.org/10.1007/s00586-017-5121-8" },
    { title: "An evidence-based clinical guideline for the diagnosis and treatment of cervical radiculopathy from degenerative disorders", org: "Spine J — North American Spine Society, NASS (Bono et al.)", year: 2011, url: "https://doi.org/10.1016/j.spinee.2010.10.023" },
    { title: "Management of neck pain and associated disorders: A clinical practice guideline from the Ontario Protocol for Traffic Injury Management (OPTIMa) Collaboration", org: "Eur Spine J — OPTIMa Collaboration (Côté et al.)", year: 2016, url: "https://doi.org/10.1007/s00586-016-4467-7" },
    { title: "Clinical Practice Guideline for Physical Therapy Assessment and Treatment in Patients With Nonspecific Neck Pain", org: "Phys Ther — Dutch KNGF guideline (Bier et al.)", year: 2018, url: "https://doi.org/10.1093/ptj/pzx118" },
    { title: "Epidemiology of cervical radiculopathy. A population-based study from Rochester, Minnesota, 1976 through 1990", org: "Brain (Radhakrishnan et al.)", year: 1994, url: "https://doi.org/10.1093/brain/117.2.325" },
    { title: "Reliability and diagnostic accuracy of the clinical examination and patient self-report measures for cervical radiculopathy", org: "Spine (Phila Pa 1976) (Wainner et al.)", year: 2003, url: "https://doi.org/10.1097/00007632-200301010-00014" },
    { title: "An independent validation of a clinical prediction rule for the diagnosis of cervical radiculopathy with radicular pain", org: "Braz J Phys Ther (Grondin et al.)", year: 2026, url: "https://doi.org/10.1016/j.bjpt.2026.101581" },
    { title: "Cervical radiculopathy", org: "Curr Rev Musculoskelet Med (Iyer et al.)", year: 2016, url: "https://doi.org/10.1007/s12178-016-9349-4" },
    { title: "The course and prognostic factors of symptomatic cervical disc herniation with radiculopathy: a systematic review of the literature", org: "Spine J (Wong et al.)", year: 2014, url: "https://doi.org/10.1016/j.spinee.2014.02.032" },
    { title: "Is motor weakness in cervical radiculopathy an indication for surgery? Analysis of risk factors for poor recovery", org: "Eur Spine J (Kwon et al.)", year: 2026, url: "https://doi.org/10.1007/s00586-025-09677-0" },
    { title: "Cervical collar or physiotherapy versus wait and see policy for recent onset cervical radiculopathy: randomised trial", org: "BMJ (Kuijper et al.)", year: 2009, url: "https://doi.org/10.1136/bmj.b3883" },
    { title: "Surgery versus nonsurgical treatment of cervical radiculopathy: a prospective, randomized study comparing surgery plus physiotherapy with physiotherapy alone with a 2-year follow-up", org: "Spine (Phila Pa 1976) (Engquist et al.)", year: 2013, url: "https://doi.org/10.1097/brs.0b013e31829ff095" },
    { title: "Effectiveness of neural mobilisation for the treatment of nerve-related cervicobrachial pain: a systematic review with subgroup meta-analysis", org: "Pain (Lascurain-Aguirrebeña et al.)", year: 2024, url: "https://doi.org/10.1097/j.pain.0000000000003071" },
    { title: "Exercise only, exercise with mechanical traction, or exercise with over-door traction for patients with cervical radiculopathy, with or without consideration of status on a previously described subgrouping rule: a randomized clinical trial", org: "J Orthop Sports Phys Ther (Fritz et al.)", year: 2014, url: "https://doi.org/10.2519/jospt.2014.5065" },
    { title: "Traction Therapy for Cervical Radicular Syndrome is Statistically Significant but not Clinically Relevant for Pain Relief. A Systematic Literature Review with Meta-Analysis and Trial Sequential Analysis", org: "J Clin Med (Colombo et al.)", year: 2020, url: "https://doi.org/10.3390/jcm9113389" },
    { title: "Reliability, construct validity, and responsiveness of the neck disability index, patient-specific functional scale, and numeric pain rating scale in patients with cervical radiculopathy", org: "Am J Phys Med Rehabil (Young et al.)", year: 2010, url: "https://doi.org/10.1097/phm.0b013e3181ec98e6" },
    { title: "The reliability and construct validity of the Neck Disability Index and patient specific functional scale in patients with cervical radiculopathy", org: "Spine (Phila Pa 1976) (Cleland et al.)", year: 2006, url: "https://doi.org/10.1097/01.brs.0000201241.90914.22" },
    { title: "Reliability, measurement error, and validity of the Arabic version of the Patient-Specific Functional Scale in patients with upper extremity musculoskeletal disorders", org: "Disabil Rehabil (Alnahdi et al.)", year: 2025, url: "https://doi.org/10.1080/09638288.2024.2423766" },
    { title: "Minimal important change and responsiveness of the arabic patient-specific functional Scale in patients with upper extremity musculoskeletal disorders", org: "Disabil Rehabil (Alnahdi et al.)", year: 2025, url: "https://doi.org/10.1080/09638288.2025.2507719" },
    { title: "Minimal clinically important difference for grip strength: a systematic review", org: "J Phys Ther Sci (Bohannon et al.)", year: 2019, url: "https://doi.org/10.1589/jpts.31.75" },
    { title: "Diagnostic accuracy of patient interview items and clinical tests for cervical radiculopathy", org: "Physiotherapy (Sleijser-Koehorst et al.)", year: 2021, url: "https://doi.org/10.1016/j.physio.2020.07.007" },
    { title: "Neck retractions, cervical root decompression, and radicular pain", org: "J Orthop Sports Phys Ther (Abdulwahab et al.)", year: 2000, url: "https://doi.org/10.2519/jospt.2000.30.1.4" },
    { title: "Clustered clinical findings for diagnosis of cervical spine myelopathy", org: "J Man Manip Ther (Cook et al.)", year: 2010, url: "https://doi.org/10.1179/106698110x12804993427045" },
    { title: "Degenerative cervical myelopathy", org: "BMJ (Davies et al.)", year: 2018, url: "https://doi.org/10.1136/bmj.k186" },
    { title: "International Framework for Examination of the Cervical Region for Potential of Vascular Pathologies of the Neck Prior to Musculoskeletal Intervention: International IFOMPT Cervical Framework", org: "J Orthop Sports Phys Ther (Rushton et al.)", year: 2023, url: "https://doi.org/10.2519/jospt.2022.11147" },
    { title: "Symptom provocation of fluoroscopically guided cervical nerve root stimulation. Are dynatomal maps identical to dermatomal maps?", org: "Spine (Phila Pa 1976) (Slipman et al.)", year: 1998, url: "https://doi.org/10.1097/00007632-199810150-00019" },
    { title: "A diagnosis-based clinical decision rule for spinal pain part 2: review of the literature", org: "Chiropr Osteopat (Murphy et al.)", year: 2008, url: "https://doi.org/10.1186/1746-1340-16-7" },
    { title: "Diagnostic accuracy of physical examination tests for painful cervical radiculopathy: update of a systematic review and meta-analysis", org: "BMC Musculoskelet Disord (Thoomes et al.)", year: 2026, url: "https://doi.org/10.1186/s12891-026-09551-0" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "Cross-cultural adaptation, reliability, and validity of the Arabic version of neck disability index in patients with neck pain", org: "Spine (Phila Pa 1976) (Shaheen et al.)", year: 2013, url: "https://doi.org/10.1097/brs.0b013e31828b2d09" },
    { title: "Validity and between-day reliability of the cervical range of motion (CROM) device", org: "J Orthop Sports Phys Ther (Audette et al.)", year: 2010, url: "https://doi.org/10.2519/jospt.2010.3180" },
    { title: "Validation of a New Arabic Version of the Neuropathic Pain Diagnostic Questionnaire (DN4)", org: "Pain Pract (Chatila et al.)", year: 2017, url: "https://doi.org/10.1111/papr.12419" },
    { title: "Timing of Evidence-Based Nonsurgical Interventions as Part of Multimodal Treatment Guidelines for the Management of Cervical Radiculopathy: A Delphi Study", org: "Phys Ther (Thoomes et al.)", year: 2022, url: "https://doi.org/10.1093/ptj/pzab312" },
    { title: "Comparison of neural mobilization and conservative treatment on pain, range of motion, and disability in cervical radiculopathy: A randomized controlled trial", org: "PLoS One (Rafiq et al.)", year: 2022, url: "https://doi.org/10.1371/journal.pone.0278177" },
    { title: "Do 'sliders' slide and 'tensioners' tension? An analysis of neurodynamic techniques and considerations regarding their application", org: "Man Ther (Coppieters et al.)", year: 2008, url: "https://doi.org/10.1016/j.math.2006.12.008" },
    { title: "The immediate effects of a cervical lateral glide treatment technique in patients with neurogenic cervicobrachial pain", org: "J Orthop Sports Phys Ther (Coppieters et al.)", year: 2003, url: "https://doi.org/10.2519/jospt.2003.33.7.369" },
    { title: "Development of a clinical prediction rule to identify patients with neck pain likely to benefit from cervical traction and exercise", org: "Eur Spine J (Raney et al.)", year: 2009, url: "https://doi.org/10.1007/s00586-008-0859-7" },
    { title: "Immediate and Short-term Effects of Thoracic Spine Manipulation in Patients With Cervical Radiculopathy: A Randomized Controlled Trial", org: "J Orthop Sports Phys Ther (Young et al.)", year: 2019, url: "https://doi.org/10.2519/jospt.2019.8150" },
    { title: "Neck-specific training with a cognitive behavioural approach compared with prescribed physical activity in patients with cervical radiculopathy: a protocol of a prospective randomised clinical trial", org: "BMC Musculoskelet Disord (Dedering et al.)", year: 2014, url: "https://doi.org/10.1186/1471-2474-15-274" },
    { title: "Red flags for extracranial vertebral artery dissections in patients with neck pain: a scoping review", org: "J Man Manip Ther (Feller et al.)", year: 2026, url: "https://doi.org/10.1080/10669817.2026.2720218" },
    { title: "Red flags for the early detection of spinal infection in back pain patients", org: "BMC Musculoskelet Disord (Yusuf et al.)", year: 2019, url: "https://doi.org/10.1186/s12891-019-2949-6" },
    { title: "Red flags to screen for tumours in patients with neck pain: A scoping review", org: "Physiotherapy (Occhetto et al.)", year: 2026, url: "https://doi.org/10.1016/j.physio.2025.101869" },
    { title: "The duration of symptoms and clinical outcomes in patients undergoing anterior cervical discectomy and fusion for degenerative disc disease and radiculopathy", org: "Spine J (Burneikiene et al.)", year: 2015, url: "https://doi.org/10.1016/j.spinee.2014.09.017" },
    { title: "Epidural steroid injections, conservative treatment, or combination treatment for cervical radicular pain: a multicenter, randomized, comparative-effectiveness study", org: "Anesthesiology (Cohen et al.)", year: 2014, url: "https://doi.org/10.1097/aln.0000000000000409" },
    { title: "Cervical transforaminal epidural steroid injections: more dangerous than we think?", org: "Spine (Phila Pa 1976) (Scanlon et al.)", year: 2007, url: "https://doi.org/10.1097/brs.0b013e318053ec50" },
    { title: "Effect of cervical traction on cervicogenic headache in patients with cervical radiculopathy: a preliminary randomized controlled trial", org: "BMC Musculoskelet Disord (Jellad et al.)", year: 2024, url: "https://doi.org/10.1186/s12891-024-07930-z" },
    { title: "Text neck and neck pain in 18-21-year-old young adults", org: "Eur Spine J (Damasceno et al.)", year: 2018, url: "https://doi.org/10.1007/s00586-017-5444-5" },
    { title: "Effect of pillow on pain, disability and sleep quality in patients with chronic neck pain: A systematic review", org: "Rehabilitacion (Madr) (Ghosh et al.)", year: 2025, url: "https://doi.org/10.1016/j.rh.2025.100922" },
    { title: "Effect of median nerve neural mobilisation and cervical lateral glide on pain, disability and function in patients with nerve-related neck and arm pain: A systematic review and meta-analysis", org: "Clin Rehabil (Gillot et al.)", year: 2025, url: "https://doi.org/10.1177/02692155251370881" },
    { title: "A randomized controlled trial of intermittent Cervical Traction in sitting Vs. Supine position for the management of Cervical Radiculopathy", org: "Pak J Med Sci (Khan et al.)", year: 2017, url: "https://doi.org/10.12669/pjms.336.13851" },
    { title: "Manual therapy, exercise, and traction for patients with cervical radiculopathy: a randomized clinical trial", org: "Phys Ther (Young et al.)", year: 2009, url: "https://doi.org/10.2522/ptj.20080283" },
    { title: "Cervical traction combined with neural mobilization for patients with cervical radiculopathy: A randomized controlled trial", org: "J Bodyw Mov Ther (Savva et al.)", year: 2021, url: "https://doi.org/10.1016/j.jbmt.2020.08.019" },
    { title: "Effectiveness of simultaneous application of cervical traction and neural mobilization on pain and disability in patients with cervical radiculopathy: A systematic review and meta-analysis", org: "J Back Musculoskelet Rehabil (Wu et al.)", year: 2026, url: "https://doi.org/10.1177/10538127251380052" },
    { title: "High-frequency laser therapy: a new alternative to physiotherapy in the treatment of cervical disk hernia", org: "Front Med (Lausanne) (Kuculmez et al.)", year: 2024, url: "https://doi.org/10.3389/fmed.2024.1429660" },
    { title: "Transcutaneous electrical nerve stimulation (TENS) for chronic neck pain", org: "Cochrane Database Syst Rev (Martimbianco et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd011927.pub2" },
    { title: "Unlocking the Effects of Neural Mobilization versus Transcutaneous Electrical Nerve Stimulation in Cervical Radiculopathy", org: "J Orthop Case Rep (Tiwari et al.)", year: 2026, url: "https://doi.org/10.13107/jocr.2026.v16.i04.7174" },
    { title: "Effectiveness of pulsed electromagnetic field therapy on pain, functional status, and quality of life in patients with chronic non-specific neck pain: A prospective, randomized-controlled study", org: "Turk J Phys Med Rehabil (Karakaş et al.)", year: 2020, url: "https://doi.org/10.5606/tftrd.2020.5169" },
    { title: "Dry Needling Plus Cervical Interlaminar Epidural Steroid Injections: Do We Have More Favorable Results in Cervical Disc Herniation? A Randomized Sham-Controlled Clinical Study", org: "Am J Phys Med Rehabil (Yolcu et al.)", year: 2024, url: "https://doi.org/10.1097/phm.0000000000002509" },
    { title: "Low-level laser therapy for acute neck pain with radiculopathy: a double-blind placebo-controlled randomized study", org: "Pain Med (Konstantinovic et al.)", year: 2010, url: "https://doi.org/10.1111/j.1526-4637.2010.00907.x" },
    { title: "Clinical evaluation of the efficacy of focused extracorporeal shock-wave therapy in patients with cervical spondylosis: A randomized control trial", org: "Medicine (Baltimore) (Li et al.)", year: 2024, url: "https://doi.org/10.1097/md.0000000000040573" },
    { title: "Mechanisms of recovery after neck-specific or general exercises in patients with cervical radiculopathy", org: "Eur J Pain (Liew et al.)", year: 2021, url: "https://doi.org/10.1002/ejp.1741" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — تبدأ بإعادة الفحص العصبيّ القصير ووضعيات الراحة، ثمّ تحريكُ العصب والعلاجُ اليدويّ مع التمرين، ثمّ العضلاتُ العميقة للرقبة ولوحُ الكتف وتقويةُ العضلة الضعيفة، والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — starting with a short neurological re-check and relief positions, then nerve mobilisation and manual therapy with exercise, then deep neck and scapular muscles and strengthening of the weak muscle, with a daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — في الحادّ «يمكن» تمارينُ التحريك والتثبيت (JOSPT 2017 — C)، وفي المزمن «ينبغي» التمطيطُ والتقوية مع تحريك الفقرات (B)؛ والدنماركيّ يوصي بتمارين التحكّم الحركيّ والعلاج اليدويّ توصيةً ضعيفة (Kjaer 2017)؛ وتحريكُ العصب أقوى التقنيات دليلاً (Lascurain-Aguirrebeña 2024 · Gillot 2025)؛ و١٢ جلسة سبقت الانتظارَ في ستّة أسابيع (Kuijper 2009)، والعلاجُ المنظّم بلغ الجراحةَ في الإعاقة عند سنتين (Engquist 2013).",
        "Core in every session — in the acute stage mobilising and stabilising exercises 'may' be used (JOSPT 2017 — C), and in the chronic stage stretching and strengthening with spinal mobilisation 'should' be (B); the Danish guideline makes weak recommendations for motor-control exercise and manual therapy (Kjaer 2017); nerve mobilisation is the best-supported technique (Lascurain-Aguirrebeña 2024 · Gillot 2025); 12 sessions beat waiting at six weeks (Kuijper 2009), and structured physiotherapy matched surgery on disability at two years (Engquist 2013)."] },
    { code: "traction", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { forcePctBw: "6–16", holdRestS: "60 / 20", durationMin: "15", mode: "Intermittent, supine, 15–24° flexion" },
      parameters: ["تجربةٌ في جلستين أو ثلاث، ويستمرّ فقط إن خفّف في الحال أو ركّز الألم (Kjaer 2017) — وأرجحُ من يستجيب: الأعراضُ تخفّ بالجذب اليدويّ أو باليد على الرأس، والعمرُ ٥٥ فأكثر، واختبارُ التوتّر العصبيّ إيجابيّ (Raney 2009): شدٌّ آليّ متقطّع في الاستلقاء والرقبةُ بانثناء ٢٤° (أو ١٥° إن نقص انثناؤها)، ٦٠ ثانيةً شدّاً و٢٠ ثانيةً راحة، ١٥ دقيقة؛ يبدأ بـ٤٫٥–٥٫٥ كغم (وزنُ الرأس) ويُزاد في الجلسة نفسها حتى «متوسّطٍ إلى قويّ» بلا زيادةٍ في الأعراض (Raney 2009)، ويتدرّج نحو ٨–١٢ كغم في المرحلة الثانية (١٢ كغم أفضلُ من ٨ ومن ٢ — Jellad 2024)، والاستلقاءُ أفضلُ من الجلوس (Khan 2017). والتجاربُ وزنت بالكيلوغرام لا بنسبة وزن الجسم — والنسبةُ في الخانة تحويلٌ لبالغٍ وزنُه نحو ٧٥ كغم. يُوقف فوراً عند الدوخة أو زيادة ألم الذراع أو الوخز، ثمّ التمرين.",
        "A trial of two or three sessions, continued only if it relieves immediately or centralises the pain (Kjaer 2017) — the likeliest responders: symptoms ease with manual distraction or with the hand on the head, age 55 or more, and a positive neurodynamic test (Raney 2009): mechanical intermittent traction in supine with the neck in 24° of flexion (or 15° if flexion is limited), 60 seconds pull and 20 seconds rest, 15 minutes; start at 4.5–5.5 kg (the weight of the head) and increase within the session to 'moderately strong to strong' without increasing symptoms (Raney 2009), progressing towards 8–12 kg in phase 2 (12 kg beat 8 kg and 2 kg — Jellad 2024), with supine better than sitting (Khan 2017). Trials dosed in kilograms, not as a percentage of body weight — the percentage in the field is a conversion for an adult of about 75 kg. Stop at once with dizziness or increasing arm pain or tingling, then exercise."],
      note: ["مساعدٌ بقاعدة المركز بشروطه — وهو أقوى الأجهزة دليلاً هنا: «ينبغي» في المزمن مع التمرين والتحريك (JOSPT 2017 — B)، والدنماركيّ يوصي به توصيةً ضعيفة (Kjaer 2017)؛ أضاف إلى التمرين نقصاً في الإعاقة عند ستّة أشهر وسنة (Fritz 2014)، ولم يُضف شيئاً فوق العلاج اليدويّ والتمرين عند أربعة أسابيع (Young 2009)، وأثرُه المجمَّع دالٌّ إحصائياً صغيرٌ سريريّاً (Colombo 2020)، ومع تحريك العصب أفضلُ منه وحده (Savva 2021 · Wu 2026)؛ وإرشاداتٌ أخرى ضدّه (Côté 2016 · Bier 2018). لا يُعطى وحده. ممنوعٌ مع اعتلال النخاع (JOSPT 2017) والأعراض الوعائية والكسر والورم والالتهاب.",
        "Adjunct by the centre's rule, with conditions — and the device with the strongest evidence here: 'should' in chronic radiculopathy with exercise and mobilisation (JOSPT 2017 — B), with a weak recommendation from the Danish guideline (Kjaer 2017); added to exercise it reduced disability at six and twelve months (Fritz 2014), added nothing over manual therapy and exercise at four weeks (Young 2009), and its pooled effect is statistically significant but clinically small (Colombo 2020), with traction plus nerve mobilisation better than traction alone (Savva 2021 · Wu 2026); other guidelines oppose it (Côté 2016 · Bier 2018). Never given alone. Contraindicated with myelopathy (JOSPT 2017), vascular features, fracture, tumour and infection."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["على الرقبة وأعلى الكتفين في الجلوس المسنود أو الاستلقاء، قبل التمارين لتسهيلها لا بدلها؛ ويُفحص الإحساسُ في جلد الذراع المصابة قبلها، ولا تُوضع على جلدٍ خدر.",
        "Over the neck and upper shoulders in supported sitting or lying, before exercise to ease it, never instead of it; check sensation over the affected arm first, and never place it on numb skin."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين، والدليلُ ضعيف: لا تجربةَ للحرارة وحدها في الاعتلال الجذريّ (بحثٌ صفريّ مكتوب)، واستُعملت عشرَ دقائق قبل العلاج في ذراعي تجربة (Rafiq 2022). ممنوعةٌ مع ضعف الإحساس أو اضطراب الدورة الدموية أو جرحٍ مفتوح.",
        "Rotating adjunct — for comfort before exercise, with weak evidence: there is no trial of heat alone in radiculopathy (a documented zero result), and it was used for ten minutes before treatment in both arms of one trial (Rafiq 2022). Contraindicated with impaired sensation, poor circulation or an open wound."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 20,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "100–180", intensity: "Sensory", durationMin: "20" },
      parameters: ["تحفيزٌ عبر الجلد تقليديّ (Conventional TENS) لتهدئة الألم قبل التمرين: أربعةُ أقطابٍ على العضلات المجاورة للفقرات الرقبية (٨٠ هرتز، ١٨٠ ميكروثانية، ٢٠ دقيقة — Kuculmez 2024)، بشدّةٍ تعطي وخزاً قوياً مريحاً بلا انقباض — ولا على مقدّمة الرقبة ولا الجيب السباتيّ؛ ويُقال للمريض إنّه يسكّن ولا يعالج.",
        "Conventional TENS to settle pain before exercise: four electrodes over the cervical paraspinals (80 Hz, 180 µs, 20 minutes — Kuculmez 2024), at a strong but comfortable tingling with no contraction — never over the front of the neck or the carotid sinus; the patient is told it relieves but does not treat."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز — والدليلُ ضعيف: في ألم الرقبة المزمن لا فرقَ عن الوهميّ (Martimbianco 2019)، وتحريكُ العصب ساواه في الاعتلال الجذريّ (Tiwari 2026)، والتحفيزُ العضليّ بلا فائدة (JOSPT 2017). ممنوعٌ مع منظّم ضربات القلب، وعلى مقدّمة الرقبة والجيب السباتيّ، وعلى جلدٍ مخدوش أو خدر.",
        "Rotating adjunct by the centre's rule — with weak evidence: in chronic neck pain it was no different from sham (Martimbianco 2019), nerve mobilisation equalled it in radiculopathy (Tiwari 2026), and electrical muscle stimulation showed no benefit (JOSPT 2017). Contraindicated with a pacemaker, over the front of the neck and the carotid sinus, and on broken or numb skin."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على شبه المنحرفة العليا والعضلات المجاورة للفقرات الرقبية والصدرية العليا في الجلوس المسنود أو الانبطاح بوسادة: بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف في الحساسية العالية، بالنمط السعويّ ثمّ المقاوِم؛ قبل التمارين، ولا على مقدّمة الرقبة ولا على جلدٍ ضعيف الإحساس.",
        "Over the upper trapezius and the cervical and upper thoracic paraspinals in supported sitting or prone with a pillow: at a low, athermic-to-mildly-warm intensity at high irritability, capacitive then resistive; before exercise, never over the front of the neck or skin with poor sensation."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — لا تجربةَ للتيكار في الاعتلال الجذريّ العنقيّ (بحثٌ صفريّ مكتوب). ممنوعٌ مع منظّم ضربات القلب أو معدنٍ مزروع في المنطقة أو الحمل أو الورم.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial of Tecar in cervical radiculopathy (a documented zero result). Contraindicated with a pacemaker, a metal implant in the area, pregnancy or a tumour."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الرقبة وأعلى الكتفين في الوضعية المريحة قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز، وإعداداتُه يكتبها المشرفُ من جهازه.",
        "Pulsed electromagnetic field (PEMF) over the neck and upper shoulders in a comfortable position before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم) — ودرجةُ دليله «لا ينصح»: لا تجربةَ للمغناطيس في الاعتلال الجذريّ (بحثٌ صفريّ مكتوب)، وفي ألم الرقبة المزمن لم يزد على الوهميّ حين أُضيف إلى ١٥ جلسة علاجٍ طبيعيّ (Karakas 2020). ممنوعٌ مع منظّم ضربات القلب أو المضخّات المزروعة أو الحمل.",
        "Adjunct by the centre's rule (Saleem) — with an evidence grade of 'not recommended': there is no trial of magnetic therapy in radiculopathy (a documented zero result), and in chronic neck pain it was no better than sham when added to 15 physiotherapy sessions (Karakas 2020). Contraindicated with a pacemaker, implanted pumps or pregnancy."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 3,
      params: { needleSize: "0.25 × 25–40", points: "Active trigger points: upper trapezius, levator scapulae, infraspinatus", sessions: "1 / week × 3" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، ولمن معه نقاطٌ زنادية نشطة تعيد ألمَه المألوف — أسبوعياً ثلاثَ مرّات (اقتراح): في شبه المنحرفة العليا بإمساكٍ بين الإصبعين والإبرةُ أفقيةٌ بعيداً عن قمّة الرئة، والرافعةِ للوح الكتف، وتحت الشوكة؛ ولا في مقدّمة الرقبة ولا العضلات الأخمعية (قربَ الضفيرة العصبية والرئة).",
        "Dry-needling certified staff only, and only for active trigger points that reproduce the familiar pain — weekly, three times (a suggestion): upper trapezius with a pincer grip and the needle directed horizontally away from the lung apex, levator scapulae and infraspinatus; never the front of the neck or the scalenes (close to the brachial plexus and the lung)."],
      note: ["مساعدٌ بموعدٍ دوريّ لنقاطٍ زنادية مصاحبة وحدها — تجربةٌ واحدة: الإبرُ للنقاط النشطة مع الحقنة فوق الجافية أنقصت الألمَ أكثرَ من الحقنة وحدها (Yolcu 2024)، ولا تجربةَ للإبر وحدها في الاعتلال الجذريّ، وجدولُها في التجربة لم يُتحقّق منه — والجدولُ هنا اقتراح؛ وإرشادٌ ضدّها في ألم الرقبة (Bier 2018). ممنوعةٌ مع مضادّات التخثّر أو الالتهاب الموضعيّ أو الخوف الشديد من الإبر.",
        "Adjunct on a periodic schedule for co-existing trigger points only — one trial: needling active trigger points alongside an epidural injection reduced pain more than the injection alone (Yolcu 2024); there is no trial of needling alone in radiculopathy, and the trial's schedule could not be verified — the schedule here is a suggestion; one guideline opposes it in neck pain (Bier 2018). Contraindicated with anticoagulants, local infection or severe needle fear."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها، والعينان بعيدتان عن المصباح.", "An alternative to the hot pack when it is unavailable, with the same conditions, keeping the eyes away from the lamp."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: لا تجربةَ للأشعّة تحت الحمراء وحدها في الاعتلال الجذريّ (بحثٌ صفريّ مكتوب)؛ لا يُعطى وحده.", "Rotating adjunct — comfortable warmth only: there is no trial of infrared alone in radiculopathy (a documented zero result); never given alone."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم (لم يذكره) — مع أنّ له في الحادّ «يمكن» (JOSPT 2017 — C) وتجاربَ إيجابية: ليزرٌ منخفضُ الشدّة ٩٠٥ نانومتر، ٥٠٠٠ هرتز، ١٢ ملي واط/سم²، ٢ جول/سم² لكلّ نقطة في ١٢٠ ثانية (١٢ جول/سم² مجموعاً) على المقطع المصاب، ١٥ جلسة في ثلاثة أسابيع — أنقص ألمَ الذراع أكثرَ من الوهميّ (Konstantinovic 2010)؛ والليزرُ عالي الشدّة مع التمرين فاق التمرينَ وحده (Kuculmez 2024)؛ وإرشاداتٌ أخرى ضدّه (Côté 2016 · Bier 2018). فإن قرّره صار مساعداً بهذه الإعدادات.",
        "Not used until Saleem decides (he has not mentioned it) — although it has a 'may' in the acute stage (JOSPT 2017 — C) and positive trials: low-level laser at 905 nm, 5,000 Hz, 12 mW/cm², 2 J/cm² per point over 120 seconds (12 J/cm² in total) over the affected segment, 15 sessions in three weeks — reduced arm pain more than sham (Konstantinovic 2010); high-intensity laser with exercise beat exercise alone (Kuculmez 2024); other guidelines oppose it (Côté 2016 · Bier 2018). If he decides on it, it becomes an adjunct with these settings."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — إرشادٌ ضدّه في ألم الرقبة (Bier 2018)، والانزلاقُ الجانبيّ للرقبة فاقه في ألم العصب العنقيّ (Coppieters 2003).", "Not used — a guideline opposes it in neck pain (Bier 2018), and the cervical lateral glide beat it in neurogenic cervicobrachial pain (Coppieters 2003)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — تجربةٌ واحدة في الاعتلال الجذريّ مصداقيّتُها ضعيفة (توزيعٌ شبهُ عشوائيّ ونصٌّ يخلط بين الرقبة وأسفل الظهر — Li 2024)، ولا يذكره إرشاد؛ وتسليطُه على الجذر لم يُختبر كما ينبغي.",
        "Not used — a single trial in radiculopathy with low credibility (quasi-random allocation and methods mixing the neck with the low back — Li 2024), and no guideline mentions it; applying it over the nerve root has not been properly tested."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للشمع في الاعتلال الجذريّ.", "Not used — there is no trial of paraffin in radiculopathy."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تورّمَ يُعالَج ولا تجربة.", "Not used — there is no swelling to treat and no trial."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — روبوتُ المشي لا مكانَ له في الاعتلال الجذريّ العنقيّ.", "Not used — the gait robot has no place in cervical radiculopathy."] },
  ],
  phases: [
    {
      name: ["الحساسية العالية — تهدئة ألم الذراع وحماية الجذر (ألمُ الذراع غالب)", "High irritability — settling arm pain and protecting the root (arm pain predominant)"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (أسبوع) — أو ما دامت الحساسيةُ عالية", "The first six sessions (a week) — or while irritability stays high"],
      goals: [
        "ألمُ الذراع ينقص ٢٫٢ نقطة فأكثر أو يصير ٥ أو أقلّ؛ ولا ضعفَ جديد ولا يزيد؛ ووضعياتُ الراحة والمنزلقُ وإيماءةُ الذقن يؤدّيها وحده في البيت؛ وفهمٌ للحالة ومسارها وعلامات الخطر.",
        "Arm pain down 2.2 points or more, or at 5 or less; no new or increasing weakness; relief positions, the slider and chin nods done alone at home; and understanding of the condition, its course and the warning signs.",
      ],
      education: [
        "• ما هي الحالة: جذرٌ عصبيّ متهيّج في الرقبة يُرسل الألمَ إلى الذراع؛ والمسار: تحسّنٌ كبير خلال ٤–٦ أشهر عند أكثر المرضى (Wong 2014)، والضعفُ يعود غالباً (Kwon 2026).\n" +
        "• ابقَ نشيطاً قدرَ ما تستطيع (Kjaer 2017)، والراحةُ التامّة لا تسرّع الشفاء.\n" +
        "• وضعياتُ الراحة: اليدُ على الرأس أو في الجيب لمن تريحه، ونومٌ برقبةٍ محايدة.\n" +
        "• الطوقُ الرقبيّ خيارٌ مؤقّت لألمٍ شديد لا يهدأ بغيره، جزءاً من النهار، ويُترك خلال ٣–٦ أسابيع (Kuijper 2009).\n" +
        "• علاماتُ الخطر التي توجب العودةَ فوراً: ضعفٌ يزيد، خراقةُ اليدين، تعثّرٌ في المشي، أعراضٌ في الذراعين معاً، أو اضطرابٌ في البول.\n" +
        "• الأدويةُ والحقنةُ قرارُ الطبيب (Kjaer 2017 · Cohen 2014).",
        "• What the condition is: an irritated nerve root in the neck sending pain into the arm; the course: substantial improvement within 4–6 months in most patients (Wong 2014), and weakness usually recovers (Kwon 2026).\n" +
        "• Stay as active as you can (Kjaer 2017); complete rest does not speed recovery.\n" +
        "• Relief positions: the hand on the head or in a pocket for those it relieves, and sleep with a neutral neck.\n" +
        "• A cervical collar is a temporary option for severe pain not controlled otherwise, worn part of the day and weaned within 3–6 weeks (Kuijper 2009).\n" +
        "• Warning signs that require an immediate return: increasing weakness, clumsy hands, unsteady walking, symptoms in both arms, or bladder disturbance.\n" +
        "• Medicines and injections are the doctor's decision (Kjaer 2017 · Cohen 2014).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• ألمُ الذراع ٥ من ١٠ أو أقلّ، أو نقص ٢٫٢ نقطة فأكثر (الفرقُ المهمّ — Young 2010) — وخطأُ القياس ٤٫١ فيُؤكَّد بالإعاقة والأنشطة.\n" +
        "• لا ضعفَ جديد ولا يزيد.\n" +
        "• الألمُ لم يعد ثابتاً في الراحة.\n" +
        "(اقتراحٌ يجمع وصفَ المراحل والفرقَ المهمّ، لا معيارٌ مجرَّب — Thoomes 2022.) ومن جاء بحساسيةٍ متوسّطة أو منخفضة يبدأ بمرحلتها مباشرةً. وفي الجلسة ٦ — لم ينقص ألمُ الذراع أو زاد، أو ضعفٌ جديد ⟵ مع طبيب المركز (القاعدةُ في «موانع وإحالة»).",
        "Progress to phase 2 when all are met:\n" +
        "• Arm pain 5/10 or less, or down 2.2 points or more (the important change — Young 2010) — the measurement error is 4.1, so it is confirmed by disability and activities.\n" +
        "• No new or increasing weakness.\n" +
        "• Pain no longer constant at rest.\n" +
        "(A proposal combining the stage descriptions and the important change, not a tested criterion — Thoomes 2022.) A patient presenting with moderate or low irritability starts directly in that phase. At session 6 — arm pain not reduced or worse, or new weakness → with the centre's doctor (the rule under 'Contraindications and referral').",
      ],
      notes: [
        "• وضعياتُ الراحة ومنزلقُ العصب الأوسط (١ × ١٠ بثبات ثلاث ثوانٍ — Rafiq 2022) والزنديّ لمن أعراضُه في الإصبع الصغيرة — كلُّها بلا زيادةٍ في ألم الذراع.\n" +
        "• سحبُ الذقن المتكرّر فقط إن أنقص ألمَ الذراع أو ركّزه (Abdulwahab 2000)؛ وإيماءةُ الذقن ١٠ × ١٠ ثوانٍ (Raney 2009).\n" +
        "• العلاجُ اليدويّ لطيف: الانزلاقُ الجانبيّ للرقبة (Coppieters 2003) وتحريكُ الفقرات بالدرجتين الأولى والثانية، والتلاعبُ الصدريّ بعد فحص الشرايين لألم الرقبة (Young 2019).\n" +
        "• الشدُّ تجربةٌ اختيارية في هذه المرحلة لمن تريحه اليدُ على الرأس أو الجذبُ اليدويّ، ويستمرّ إن خفّف في الحال (Kjaer 2017).\n" +
        "• الأجهزةُ المساعدة للراحة قبل التمرين.",
        "• Relief positions and the median-nerve slider (1 × 10 with a three-second hold — Rafiq 2022), plus the ulnar slider for symptoms in the little finger — all without increasing arm pain.\n" +
        "• Repeated chin retraction only if it reduces or centralises arm pain (Abdulwahab 2000); chin nods 10 × 10 seconds (Raney 2009).\n" +
        "• Gentle manual therapy: the cervical lateral glide (Coppieters 2003) and grade I–II mobilisation, with thoracic manipulation after the vascular screen for neck pain (Young 2019).\n" +
        "• Traction is an optional trial in this phase for patients relieved by the hand on the head or manual distraction, continued if it relieves immediately (Kjaer 2017).\n" +
        "• Adjunct devices for comfort before exercise.",
      ],
      exercises: [
        { code: "shoulder-abduction-relief", doseNote: ["بقدر ما يريح، عدّةَ مرّاتٍ في اليوم.", "As long as it relieves, several times a day."] },
        { code: "median-nerve-slider", sets: 1, reps: 10, hold: 3,
          note: ["بلا زيادةٍ في ألم الذراع أو الوخز، في الجلسة وفي البيت.", "Without increasing arm pain or tingling, in the session and at home."] },
        { code: "ulnar-nerve-slider", sets: 1, reps: 10, hold: 3,
          note: ["لمن تنزل أعراضُه إلى جهة الإصبع الصغيرة وحده.", "Only for symptoms travelling to the little-finger side."] },
        { code: "chin-tuck-supine", sets: 1, reps: 10, hold: 10,
          note: ["١٠ × ١٠ ثوانٍ مرّتين يومياً، بلا شدّ العضلات السطحية (Raney 2009).", "10 × 10 seconds twice a day, without tensing the superficial muscles (Raney 2009)."] },
        { code: "cervical-retraction", sets: 1, reps: 10,
          note: ["فقط إن أنقص ألمَ الذراع أو ركّزه في الرقبة؛ ويُترك إن نزل الألمُ أبعد.", "Only if it reduces arm pain or centralises it into the neck; dropped if pain spreads further."] },
        { code: "scapular-setting", sets: 3, reps: 10, hold: 10 },
        { code: "neck-arom", sets: 1, reps: 5,
          note: ["في المدى غير المؤلم، وما ينزل الألمَ إلى الذراع يُترك.", "Within the pain-free range, dropping any direction that sends pain into the arm."] },
      ],
    },
    {
      name: ["الحساسية المتوسّطة — تحريك العصب والتحكّم الحركيّ وتقوية العضلة الضعيفة", "Moderate irritability — nerve mobilisation, motor control and strengthening the weak muscle"],
      sessionFrom: 7, sessionTo: 12,
      timeframe: ["الجلسات ٧–١٢ (الأسبوع الثاني)", "Sessions 7–12 (the second week)"],
      goals: [
        "NDI ينقص ٧ نقاط فأكثر من البداية؛ والأنشطةُ المختارة تتحسّن نقطتين؛ وألمُ الذراع ٣ أو أقلّ؛ والقوّةُ والقبضةُ تزيدان؛ والبرنامجُ المنزليّ منتظم.",
        "NDI down 7 points or more from the start; the chosen activities improve by 2 points; arm pain 3 or less; strength and grip increasing; and a regular home programme.",
      ],
      education: [
        "• النشاطُ المتدرّج والعودةُ إلى العمل بالتدرّج (JOSPT 2017 — B)؛ والثقةُ بالقدرة على إدارة الألم ترتبط بالإعاقة (Liew 2021).\n" +
        "• القراءةُ والهاتفُ برأسٍ منحنٍ طويلاً قد تزيد الأعراض (Abdulwahab 2000) — فتُكسر بفترات؛ ولا دليلَ قويّاً أنّ وضعيةَ الهاتف تسبّب المرض (Damasceno 2018).\n" +
        "• الضعفُ يُقاس كلَّ أسبوع، وتقويتُه بلا زيادةٍ في ألم الذراع.",
        "• Graded activity and a gradual return to work (JOSPT 2017 — B); confidence in managing pain is linked to disability (Liew 2021).\n" +
        "• Prolonged reading or phone use with the head bent can aggravate symptoms (Abdulwahab 2000) — so it is broken up with breaks; there is no strong evidence that phone posture causes the condition (Damasceno 2018).\n" +
        "• Weakness is measured every week, and strengthened without increasing arm pain.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• NDI نقص ٧ نقاط فأكثر من البداية (الفرقُ المهمّ — Cleland 2006)، والأفضلُ ١٠ فأكثر (أكبرُ من خطأ القياس).\n" +
        "• الأنشطةُ المختارة تحسّنت ٢٫١٥ نقطة فأكثر (النسخةُ العربية — Alnahdi 2025).\n" +
        "• سبرلنغ واختبارُ التوتّر العصبيّ لا يعيدان الأعراضَ في اليد، أو يحتاجان مدىً أكبر.\n" +
        "• القبضةُ زادت ٥ كغم فأكثر أو صار الفرقُ بين الجهتين ١٠٪ أو أقلّ (Bohannon 2019 — والعشرةُ بالمئة اقتراح).\n" +
        "(اقتراحٌ مبنيّ على الفرق المهمّ وخطأ القياس، لا معيارٌ مجرَّب.) وفي الجلسة ١٢ — لم ينقص ألمُ الذراع ٢٫٢ نقطة ولا NDI ٧ نقاط ⟵ إلى الطبيب (القاعدةُ في «موانع وإحالة»).",
        "Progress to phase 3 when all are met:\n" +
        "• NDI down 7 points or more from the start (the important change — Cleland 2006), ideally 10 or more (beyond the measurement error).\n" +
        "• The chosen activities improved by 2.15 points or more (Arabic version — Alnahdi 2025).\n" +
        "• Spurling and the neurodynamic test no longer reproduce hand symptoms, or need more range to do so.\n" +
        "• Grip up 5 kg or more, or a side-to-side difference of 10% or less (Bohannon 2019 — the 10% is a suggestion).\n" +
        "(A proposal built on the important change and measurement error, not a tested criterion.) At session 12 — arm pain not down 2.2 points and NDI not down 7 points → to the doctor (the rule under 'Contraindications and referral').",
      ],
      notes: [
        "• المنزلقاتُ ٢–٣ × ١٠، والشادّاتُ إن لم يبقَ وخزٌ في اليوم التالي (Coppieters 2008)؛ وتحريكُ العصب مع الشدّ في الجلسة نفسها لمن يستجيب (Savva 2021 · Wu 2026).\n" +
        "• الشدُّ يتدرّج نحو ٨–١٢ كغم لمن خفّف عنه (Jellad 2024)، وتحريكُ الفقرات بالدرجتين الثالثة والرابعة.\n" +
        "• تحمّلُ العضلات العميقة للرقبة، والتمارينُ الثابتة ٣ × ١٠ بثبات خمس ثوانٍ (Rafiq 2022)، والتجديفُ ورفعُ الذراعين في الانبطاح وبسطُ الظهر العلويّ.\n" +
        "• تقويةُ العضلة الضعيفة: ثلاثيةُ الرؤوس للسابع، وباسطاتُ الرسغ للسادس، والقبضةُ للثامن — ٣ × ١٠ (اقتراح).",
        "• Sliders 2–3 × 10, and tensioners if no tingling remains the next day (Coppieters 2008); nerve mobilisation with traction in the same session for responders (Savva 2021 · Wu 2026).\n" +
        "• Traction progresses towards 8–12 kg for those it relieved (Jellad 2024), with grade III–IV mobilisation.\n" +
        "• Deep neck flexor endurance, isometrics 3 × 10 with five-second holds (Rafiq 2022), rows, prone arm raises and upper-back extension.\n" +
        "• Strengthening the weak muscle: triceps for C7, wrist extensors for C6, grip for C8 — 3 × 10 (a suggestion).",
      ],
      exercises: [
        { code: "median-nerve-slider", sets: 2, reps: 10, hold: 3 },
        { code: "ulnar-nerve-slider", sets: 2, reps: 10, hold: 3,
          note: ["لمن تنزل أعراضُه إلى جهة الإصبع الصغيرة.", "For symptoms travelling to the little-finger side."] },
        { code: "deep-neck-flexor-endurance", sets: 1, reps: 10, hold: 10 },
        { code: "cervical-isometrics", sets: 3, reps: 10, hold: 5, rest: 30,
          note: ["في كلّ اتّجاه، بشدّةٍ لا تزيد الألم (Rafiq 2022).", "In each direction, at an effort that does not increase pain (Rafiq 2022)."] },
        { code: "band-row", sets: 3, reps: 12, rest: 45 },
        { code: "prone-y-t", sets: 2, reps: 10, rest: 45 },
        { code: "thoracic-extension-towel", sets: 1, reps: 10, hold: 3 },
        { code: "triceps-band-extension", sets: 3, reps: 10, rest: 60,
          note: ["لضعف الجذر السابع (بسط المرفق).", "For C7 weakness (elbow extension)."] },
        { code: "wrist-extension-weight", sets: 3, reps: 10, rest: 60,
          note: ["لضعف الجذر السادس (بسط الرسغ).", "For C6 weakness (wrist extension)."] },
        { code: "grip-putty-squeeze", sets: 3, reps: 10, hold: 3, rest: 60,
          note: ["لضعف الجذر الثامن (القبضة).", "For C8 weakness (grip)."] },
      ],
    },
    {
      name: ["الحساسية المنخفضة — القوّة والتحمّل والعودة إلى العمل والصلاة", "Low irritability — strength, endurance and return to work and prayer"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["الجلسات ١٣–١٨ (الأسبوع الثالث) — والتمديدُ ١٩–٢٤ بمعيار", "Sessions 13–18 (the third week) — with an extension to 19–24 by criterion"],
      goals: [
        "معاييرُ الخروج: الأنشطةُ المختارة بلغت أهدافَها، وNDI ١٠ من ٥٠ أو أقلّ (اقتراح)، وألمُ الذراع ٢ أو أقلّ، والقوّةُ قريبةٌ من الجهة الأخرى، والعودةُ إلى العمل والصلاة والوضوء، وبرنامجٌ منزليّ يؤدّيه وحده.",
        "Discharge criteria: the chosen activities reach their goals, NDI 10 out of 50 or less (a suggestion), arm pain 2 or less, strength close to the other side, a return to work, prayer and ablution, and an independent home programme.",
      ],
      education: [
        "• الإدارةُ الذاتية والبرنامجُ المنزليّ بعد انتهاء الجلسات — كما استمرّ في التجارب (Dedering 2014)؛ والمشيُ والنشاطُ العامّ (Thoomes 2022).\n" +
        "• العودةُ ممكنة (عند الثلث بعد سنوات — Radhakrishnan 1994): فالتمارينُ تستمرّ، وتُعرف علاماتُ العودة المبكّرة وما يُفعل عندها.\n" +
        "• الصلاةُ والوضوء: تُعاد الحركاتُ التي عُدّلت إلى صورتها بالتدرّج ما دامت لا تُنزل الألمَ إلى الذراع.",
        "• Self-management and the home programme after sessions end — as continued in trials (Dedering 2014); walking and general activity (Thoomes 2022).\n" +
        "• Recurrence is possible (in a third over the years — Radhakrishnan 1994): exercise continues, and the early signs of a recurrence and what to do are known.\n" +
        "• Prayer and ablution: the adapted movements return gradually to their usual form as long as they do not send pain into the arm.",
      ],
      criteria: [
        "الخروجُ حين تتحقّق معاييرُ الخروج — أو ثباتٌ بتغيّرٍ أقلَّ من خطأ القياس في تقييمين متتاليين مع برنامجٍ منزليّ مستقلّ (اقتراح).\n" + EXTEND_AR,
        "Discharge when the discharge criteria are met — or a plateau with change below the measurement error on two consecutive assessments with an independent home programme (a suggestion).\n" + EXTEND_EN,
      ],
      notes: [
        "• تقويةٌ متدرّجة للرقبة ولوح الكتف والذراع، وتحمّلٌ بحِمل؛ ومشيٌ متدرّج (Thoomes 2022).\n" +
        "• المهامُّ الوظيفية: العملُ (الرفعُ والحاسوبُ والقيادة)، والصلاةُ (التكبيرُ والركوعُ والسجود)، والوضوء — كما في الأنشطة المختارة.\n" +
        "• الإشرافُ يقلّ والبرنامجُ المنزليّ يكبر، والشدُّ يُترك لمن لم يعد يحتاجه.",
        "• Graded strengthening of the neck, scapula and arm, with loaded endurance; graded walking (Thoomes 2022).\n" +
        "• Functional tasks: work (lifting, computer, driving), prayer (takbir, bowing and prostration) and ablution — as in the chosen activities.\n" +
        "• Supervision tapers and the home programme grows, with traction dropped for those who no longer need it.",
      ],
      exercises: [
        { code: "deep-neck-flexor-endurance", sets: 2, reps: 10, hold: 10 },
        { code: "band-row", sets: 3, reps: 15, rest: 45 },
        { code: "prone-y-t", sets: 3, reps: 10, rest: 45 },
        { code: "wall-slide-serratus", sets: 2, reps: 10, rest: 45 },
        { code: "scaption-raise", sets: 2, reps: 10, rest: 60 },
        { code: "triceps-band-extension", sets: 3, reps: 15, rest: 60,
          note: ["لمن بقي عنده ضعفٌ في بسط المرفق.", "For persisting weakness in elbow extension."] },
        { code: "grip-putty-squeeze", sets: 3, reps: 10, hold: 3, rest: 60,
          note: ["لمن بقي عنده ضعفٌ في القبضة.", "For persisting grip weakness."] },
        { code: "median-nerve-slider", sets: 2, reps: 10, hold: 3,
          note: ["للصيانة في البيت.", "For maintenance at home."] },
        { code: "doorway-pec-stretch", sets: 1, reps: 3, hold: 30, rest: 15 },
        { code: "graded-walking",
          doseNote: ["مشيٌ متدرّج يومياً، يزيد بالدقائق كلَّ أسبوع.", "Graded daily walking, increasing by minutes each week."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العدد ١٨ بستٍّ في الأسبوع وتمديدٌ واحد بستّ لمن ما زال يتحسّن، والخروجُ المبكّر إن تحقّقت المعايير — والتجاربُ ٨–٢٤ جلسة في ٣–٦ أسابيع بمعدّل ٢–٣ في الأسبوع غالباً، ولا تجربةَ بستٍّ في الأسبوع ولا لدورةٍ ثانية: أبقِه، أو اجعله ثلاثاً في الأسبوع أربعةَ إلى ستّة أسابيع.",
    en: "18 sessions at six a week with one extension of six for those still improving, and early discharge when criteria are met — trials used 8–24 sessions over 3–6 weeks mostly at 2–3 a week, with no trial at six a week and none of a second course: keep it, or make it three a week for four to six weeks (as in Kuijper 2009, Fritz 2014 and Rafiq 2022)." },
  { key: "limits", topic: "limits",
    ar: "المرحلةُ بالحساسية لا برقم الجلسة، والحدود: ألمُ الذراع ٥ ثمّ ٣ ونقصُه ٢٫٢، وNDI ٧ (والأفضلُ ١٠)، والأنشطةُ المختارة ٢٫١٥، والقبضةُ ٥ كغم أو فرقٌ ١٠٪ — اقتراحٌ مبنيّ على الفرق المهمّ وخطأ القياس: أبقِها أو عدّلها.",
    en: "The phase follows irritability, not the session number, and the limits: arm pain 5 then 3 and down 2.2, NDI 7 (ideally 10), the chosen activities 2.15, and grip 5 kg or a 10% side difference — proposals built on Young 2010, Cleland 2006, Alnahdi 2025 and Bohannon 2019: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: الطارئةُ والعاجلة (النخاعُ والضعفُ الذي يزيد والأعراضُ الوعائية)، ومع طبيب المركز في الجلسة ٦، وإلى الطبيب في الجلسة ١٢ بلا تحسّنٍ مهمّ، ورأيُ الجرّاح في الجلسة ١٨ أو بعد ٨–١٢ أسبوعاً بلا تحسّن — راجعها مع طبيب المركز وأبقِها أو عدّلها.",
    en: "The referral rules: emergency and urgent (myelopathy, increasing weakness, vascular features), with the centre's doctor at session 6, to the doctor at session 12 without important improvement, and a surgeon's opinion at session 18 or after 8–12 weeks without improvement (Kjaer 2017 · Kwon 2026) — review them with the centre's doctor and keep or adjust." },
  { key: "device-traction", topic: "devices",
    ar: "الشدُّ مساعدٌ بشروطه — تجربةٌ في جلستين أو ثلاث ويستمرّ إن خفّف في الحال، بالاستلقاء والرقبةُ منثنية والحِملُ بالكيلوغرام كما في التجارب: أبقِه مساعداً أو اجعله أساسيّاً لمن يستجيب، وتأكّد أنّ جهازَ المركز يعطي شدّاً عنقيّاً في الاستلقاء واكتب حِملَه.",
    en: "Traction is a conditional adjunct — a trial of two or three sessions, continued if it relieves immediately, supine with the neck flexed and the load in kilograms as in the trials (Raney 2009 · Jellad 2024): keep it an adjunct or make it core for responders, and confirm the centre's device gives cervical traction in supine and record its load." },
  { key: "device-adjuncts", topic: "devices",
    ar: "الحرارةُ والتيكارُ والتحفيزُ الكهربائيّ والمغناطيسُ مساعدةٌ بقاعدتك — والدليلُ ضعيفٌ أو لا تجربةَ له هنا (والمغناطيسُ لم يزد على الوهميّ في ألم الرقبة المزمن): أبقِها أو عدّلها، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Heat, Tecar, electrotherapy and magnetic therapy are adjuncts by your rule — the evidence is weak or there is no trial here (magnetic therapy was no better than sham in chronic neck pain — Karakas 2020): keep or adjust, and fill the magnetic settings from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ أسبوعيّ ثلاثَ مرّات لنقاطٍ زنادية مصاحبة وحدها — تجربةٌ واحدة مع الحقنة فوق الجافية، ولا تجربةَ للإبر وحدها هنا، والجدولُ اقتراح: أبقِها أو عدّلها أو اجعلها «لا يُستخدم».",
    en: "Dry needling is a weekly adjunct, three times, for co-existing trigger points only — one trial alongside an epidural injection (Yolcu 2024), no trial of needling alone here, and the schedule is a suggestion: keep, adjust, or set it to 'Not used'." },
  { key: "device-laser", topic: "devices",
    ar: "الليزرُ «لا يُستخدم» لأنّك لم تذكره — وله في الحادّ توصيةٌ «يمكن» وتجاربُ إيجابية للألم وإرشاداتٌ أخرى ضدّه: أبقِه كذلك أو اجعله مساعداً بإعدادات التجربة المكتوبة في سطره.",
    en: "Laser is 'Not used' because you have not mentioned it — it has a 'may' in the acute stage (JOSPT 2017 — C) and positive pain trials (Konstantinovic 2010), while other guidelines oppose it: keep it so or make it an adjunct with the trial settings written in its line." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: ألمَ الذراع وألمَ الرقبة كلّاً من ١٠ (الأقلّ أفضل)، والأنشطةَ التي يختارها المريض بالعربية من ١٠ (الأكثر أفضل)، والقبضةَ بالمقياس بالكيلوغرام للجهة المصابة (الأكثر أفضل)، واستبيانَ الألم العصبيّ DN4 بالعربية من ١٠ (الأقلّ أفضل) — ومصادرُها في «التقييم».",
    en: "Add under 'Measures' → custom measure: arm pain and neck pain, each out of 10 (lower is better), the Arabic Patient-Specific Functional Scale out of 10 (higher is better), dynamometer grip in kg on the affected side (higher is better), and the Arabic DN4 neuropathic questionnaire out of 10 (lower is better; Chatila 2017)." },
];

export const name = "151_physio_cervical_radiculopathy_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
