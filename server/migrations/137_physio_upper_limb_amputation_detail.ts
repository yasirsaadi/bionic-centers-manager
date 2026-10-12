// Migration 137: تأهيلُ بتر الطرف العلويّ — البروتوكولُ العاشر مفصَّلاً (§4.dv — ٢٠٢٦-١٠-١٢).
//
// **بقرار المالك تتقدّم بروتوكولاتُ الأطراف** («نعم انت محق فالاطراف مهمة ايضا» — ٢٠٢٦-١٠-١٢): المشيُ بالطرف (١٣٥)، وما قبل الطرف السفليّ (١٣٦)، ثمّ هذا.
// `upper-limb-amputation-adult` **بالقالب كاملاً** (§4.dd): ٣٠ جلسة × ستّ في الأسبوع × ٥٠ دقيقة لبتر جزء الكفّ والرسغ وتحت المرفق، **و٤٢ (١–١٢ · ١٣–٣٠ · ٣١–٤٢)
// لبتر المرفق وفوقه والكتف، ولمبتور الطرفين، ولمن يُركَّب له تحكّمٌ بالتعرّف على الأنماط أو طرفٌ متعدّد المفاصل** (يعدّله الأخصائيُّ لمريضه)؛ وثلاثُ مراحل بنطاقات
// (١–٨ · ٩–٢٠ · ٢١–٣٠) ومعايير رقمية: ما قبل الطرف وتدريبُ إشارات العضلات، ثمّ التحكّمُ بالطرف والتمارينُ المتكرّرة، ثمّ الاستعمالُ بكلتا اليدين والعملُ والخروج.
// ثماني عشرةَ بطاقةً جديدة (ثماني عشرةَ صورةً مطلوبة) وثماني بطاقاتٍ معادة بصورها (إزالةُ حساسية الجذع من ١٣٦، وضبطُ لوحَي الكتف وتمطيطُ شبه المنحرفة وبسطُ الظهر
// العلويّ من الرقبة، وتمطيطُ الصدر والدورانُ الخارجيّ والرفعُ في مستوى اللوح من الكتف — للذراع السليمة، والدرّاجةُ من الركبة)؛ والأجهزةُ الاثنا عشر بدرجة دليلها
// و«استعمال المركز»، والمقاييسُ كما زُرعت (AM-ULA · الألمُ الشبحيّ). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ الطرفَ العلويّ**: الدليلُ رقيقٌ جدّاً — VA/DoD 2022 «لا دليلَ كافياً» لأيّ برنامج تدريبٍ أو شدّةٍ أو نوعِ طرف (التوصيات ٤ و٦ و٨)، **ولا مصدرَ يعطي عددَ
// جلسات**: ما نُشر ساعاتُ تدريب (٦–٨ ساعات لطرفٍ بسيط، ونحو ١٨–٢٥ لطرفٍ متعدّد المفاصل) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً والانتقالُ بالمعيار.
// **ولا جهازَ له دليلٌ في هذه الفئة** إلّا تجربةً صغيرة للموجات الصادمة على الورم العصبيّ (Jung 2014) — فالتحفيزُ (للألم) والمغناطيسُ والتيكارُ مساعدةٌ بقاعدة
// سليم بشروطها، والشمعُ لبتر جزء الكفّ وحده، والباقي «لا يُستخدم» بسببه. **وتدريبُ إشارات العضلات (EMG biofeedback) تمرينٌ لا جهازُ علاج** — في بطاقاته.
//
// المصادرُ سبعةٌ وأربعون، عناوينُها ومعرّفاتُها من سجلّ Europe PMC (ودليلا VA/DoD وOneHand من مواقع جهاتهما). القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ثماني عشرة؛ والمعادةُ الثماني (زُرعت في ١٢٥ و١٢٦ و١٢٨ و١٣٦) تُربط برموزها وصورها، وما يخصّ الطرفَ العلويّ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "ul-residual-skin-care", nameAr: "فحص جلد الجذع والعناية به وسجلّ اللبس", nameEn: "Residual-limb skin check, care and wear log",
    kind: "functional", region: "whole_body",
    purpose: ["يمنع تقرّحَ الجلد تحت القالب أو الرباط، ويجعل المريضَ يدير جذعَه بنفسه: فحصٌ يوميّ بالمرآة، وحذرٌ أكبر مع الجلد المرقَّع أو ضعيف الإحساس (VA/DoD 2022)؛ والسجلُّ يقول كم لبس الطرفَ وماذا فعل به.",
      "Prevents skin breakdown under the socket or wrap and makes the patient manage the residual limb: a daily mirror check, with more care for grafted or numb skin (VA/DoD 2022); the log shows how long the prosthesis is worn and what it is used for."],
    start: ["جالسٌ في ضوءٍ جيّد، وأمامه مرآةٌ صغيرة ومنشفةٌ وورقةُ السجلّ.", "Sitting in good light with a small mirror, a towel and the log sheet."],
    steps: [[
      "انزع الرباطَ أو البطانةَ أو القالب.",
      "افحص الجذعَ كلَّه بالمرآة — ومنه الإبطُ لبتر فوق المرفق ومكانُ الحزام على الكتف والظهر.",
      "اضغط على أيّ احمرار: هل يبيضّ ثمّ يعود لونُه؟ وكم دقيقةً يبقى بعد النزع؟",
      "اغسل الجذعَ بماءٍ وصابونٍ خفيف وجفّفه تماماً، وخاصّةً في الثنايا.",
      "اكتب في السجلّ: ساعاتِ اللبس، ومدّةَ الاحمرار، والألمَ من ١٠، وما فعلتَه بالطرف.",
    ], [
      "Remove the wrap, liner or socket.",
      "Check the whole limb with the mirror — including the armpit above the elbow and where the harness sits on the shoulder and back.",
      "Press on any redness: does it blanch and return? How many minutes does it last after removal?",
      "Wash the limb with water and mild soap and dry it completely, especially in skin folds.",
      "Write in the log: hours worn, how long redness lasted, pain out of 10, and what you did with the prosthesis.",
    ]],
    cues: [[
      "إهمالُ الجهة الخلفية من الجذع ⟵ مرآةٌ على حامل أو بيد شخصٍ آخر.",
      "كريمٌ مرطّب قبل لبس الطرف مباشرةً ⟵ في الليل وحده، فالجلدُ الرطب يُضعف تماسَّ الأقطاب.",
      "احمرارٌ يبقى أكثرَ من ٢٠ دقيقة يُترك ⟵ يُسجَّل ويُخبَر به المعالجُ أو فنّيُّ الأطراف.",
    ], [
      "Skipping the back of the limb → a mirror on a stand, or someone else holding it.",
      "Moisturiser just before donning → at night only; damp skin weakens electrode contact.",
      "Redness lasting more than 20 minutes is ignored → record it and tell the therapist or prosthetist.",
    ]],
    easier: ["الفحصُ بيد المرافق، والسجلُّ يملؤه معه.", "The carer does the check and fills in the log with the patient."],
    harder: ["يفحص وحده ويعلّم أهلَه، ويقرأ سجلَّه أسبوعياً مع المعالج.", "Checks alone, teaches the family, and reviews the log weekly with the therapist."],
    stopIf: ["جرحٌ أو فقاعةٌ أو سخونةٌ في الجلد — لا يُلبس القالبُ حتى يراه المعالج.", "A wound, blister or warm skin — no socket until the therapist has seen it."],
    equipment: ["مرآةٌ صغيرة، ومنشفة، وورقةُ السجلّ.", "A small mirror, a towel and the log sheet."],
    doseNote: ["يومياً، وبعد كلّ فترة لبس.", "Daily, and after every period of wear."],
    images: [{ key: "ul-residual-skin-care-1", ar: "مبتورُ ذراعٍ يفحص جذعَه بمرآةٍ صغيرة", en: "An arm amputee checking the residual limb with a small mirror", search: "upper limb amputee residual limb skin inspection mirror" }],
  },
  {
    code: "ul-compression-wrap", nameAr: "لفّ جذع الذراع بالرباط الضاغط أو لبس الجورب الضاغط", nameEn: "Compression wrapping or shrinker for the arm residual limb",
    kind: "functional", region: "whole_body",
    purpose: ["يقلّل التورّمَ ويشكّل الجذعَ قبل أخذ القالب — جزءٌ أساسيّ من العلاج (OneHand 2024)؛ لفٌّ ثمّ جوربٌ ضاغطٌ حين يأذن الجرّاح، والجوربُ كلّما خُلع الطرف (VA/DoD 2022).",
      "Reduces swelling and shapes the limb before casting — an essential part of care (OneHand 2024); a wrap, then a shrinker once the surgeon allows it, and the shrinker whenever the prosthesis is off (VA/DoD 2022)."],
    start: ["جالسٌ والجذعُ مسنودٌ على وسادة، والرباطُ المطّاطيّ ملفوفٌ جاهز أو الجوربُ بمقاسه.", "Sitting with the limb supported on a pillow, the elastic bandage rolled ready or the shrinker in the right size."],
    steps: [[
      "ابدأ اللفَّ من طرف الجذع، بلفّاتٍ مائلة على شكل ٨ — لا دائرية.",
      "الضغطُ أشدُّ عند الطرف ويخفّ كلّما صعدتَ.",
      "ثبّت اللفَّ فوق المرفق (تحت المرفق) أو حول الصدر (فوق المرفق) بلاصقٍ لا بمشابك.",
      "أعِد اللفَّ كلّما ارتخى.",
      "حين يلتئم الجرح ويأذن الجرّاح: الجوربُ الضاغط بدل الرباط، يُلبس بلا تجاعيد.",
    ], [
      "Start wrapping at the end of the limb with diagonal figure-of-eight turns — not circular ones.",
      "Pressure is firmest at the end and lighter as you go up.",
      "Anchor the wrap above the elbow (below-elbow) or around the chest (above-elbow) with tape, not clips.",
      "Rewrap whenever it loosens.",
      "Once the wound heals and the surgeon allows it: a shrinker instead of the bandage, put on without wrinkles.",
    ]],
    cues: [[
      "لفّاتٌ دائرية تخنق الجذع ⟵ لفّاتٌ مائلة.",
      "تجاعيدُ في الرباط ⟵ تُفرد كلُّ طبقة.",
      "اللفُّ باليد الواحدة صعب ⟵ يُثبَّت طرفُ الرباط تحت الإبط أو بيد المرافق.",
    ], [
      "Circular turns acting like a tourniquet → diagonal turns.",
      "Wrinkles in the bandage → smooth each layer.",
      "Wrapping one-handed is hard → trap the bandage end under the arm, or the carer holds it.",
    ]],
    easier: ["المرافقُ يلفّ، والمريضُ يتعلّم.", "The carer wraps while the patient learns."],
    harder: ["يلفّ وحده بيدٍ واحدة، ويلبس الجوربَ وحده.", "Wraps alone one-handed, and puts the shrinker on alone."],
    stopIf: ["ألمٌ نابض، أو تغيّرُ لون الجذع، أو تنميل — انزعه وأخبر المعالج.", "Throbbing, a colour change in the limb, or numbness — remove it and tell the therapist."],
    equipment: ["رباطٌ مطّاطيّ ولاصق، أو جوربٌ ضاغط بمقاسه.", "Elastic bandage and tape, or a shrinker in the right size."],
    doseNote: ["معظمَ اليوم ما دام الطرفُ غيرَ ملبوس.", "Most of the day whenever the prosthesis is not worn."],
    images: [{ key: "ul-compression-wrap-1", ar: "لفُّ جذع الذراع برباطٍ مطّاطيّ لفّاتٍ مائلة", en: "Wrapping an arm residual limb with an elastic bandage in diagonal turns", search: "below elbow residual limb figure of eight elastic bandage wrapping" }],
  },
  {
    code: "ul-distal-joint-rom", nameAr: "مدى حركة المرفق والساعد (وما بقي من الرسغ والأصابع)", nameEn: "Elbow and forearm range of motion (and remaining wrist and fingers)",
    kind: "mobility", region: "elbow", sets: 1, reps: 10, hold: 5,
    purpose: ["يحفظ مدى المرفق والساعد لبتر تحت المرفق، والرسغِ والأصابع الباقية لبتر جزء الكفّ — شرطُ ملاءمة القالب والتحكّم به؛ والترتيب: سلبيٌّ ثمّ بمساعدةٍ ثمّ فاعل (VA/DoD 2022).",
      "Keeps elbow and forearm range below the elbow, and the remaining wrist and fingers after partial-hand loss — a condition for socket fit and control; the order is passive, then assisted, then active (VA/DoD 2022)."],
    start: ["جالسٌ والمرفقُ على الطاولة فوق منشفة.", "Sitting with the elbow resting on a towel on the table."],
    steps: [[
      "اثنِ المرفقَ ومدّه ببطء ١٠ مرّات، واثبت في آخر المدى ٥ ثوانٍ.",
      "أدِر الساعدَ إلى الداخل والخارج ١٠ مرّات إن بقي دورانُه.",
      "لبتر جزء الكفّ: ثنيُ الرسغ وبسطُه، وثنيُ الأصابع الباقية وبسطُها، ولمسُ الإبهام لها — ١٠ لكلٍّ.",
      "في آخر المدى أضف تمطيطاً بمساعدة اليد السليمة: ٣ مرّات × ٣٠ ثانية.",
    ], [
      "Bend and straighten the elbow slowly 10 times, holding the end of the range for 5 seconds.",
      "Turn the forearm in and out 10 times if rotation remains.",
      "After partial-hand loss: wrist bending and straightening, remaining finger bending and straightening, and thumb opposition — 10 each.",
      "At the end of the range add a stretch assisted by the sound hand: 3 × 30 seconds.",
    ]],
    cues: [[
      "ميلُ الجذع بدل حركة المرفق ⟵ المرفقُ ثابتٌ على الطاولة.",
      "حركةٌ مرتدّة سريعة ⟵ بطءٌ وثباتٌ في آخر المدى.",
      "تركُ المدى يضيع لأنّ الجذعَ «لا يُستعمل» ⟵ المدى يُحفظ كلَّ يوم، فالقالبُ يحتاجه.",
    ], [
      "Leaning the trunk instead of moving the elbow → keep the elbow fixed on the table.",
      "Fast bouncing → slow movement with holds at the end of the range.",
      "Letting range go because the limb 'is not used' → range is kept every day; the socket needs it.",
    ]],
    easier: ["بمساعدة اليد السليمة طوال الحركة.", "Assisted by the sound hand throughout."],
    harder: ["مطّاطٌ خفيف في آخر المدى.", "A light band at the end of the range."],
    stopIf: ["نقصٌ في المدى أو حدٌّ صلب عند المرفق — قد يكون تعظّماً حول المفصل بعد الانفجار (Melcer 2011)؛ يُحال للتصوير.", "Lost range or a hard block at the elbow — possibly heterotopic ossification after blast (Melcer 2011); refer for imaging."],
    equipment: ["طاولة ومنشفة.", "A table and a towel."],
    doseNote: ["مرّتين أو ثلاثاً يومياً.", "Two or three times a day."],
    images: [{ key: "ul-distal-joint-rom-1", ar: "مبتورٌ تحت المرفق يثني مرفقَه ويمدّه والمرفقُ على الطاولة", en: "A below-elbow amputee bending and straightening the elbow with it resting on the table", search: "below elbow amputee elbow flexion extension exercise table" }],
  },
  {
    code: "ul-residual-shoulder-rom", nameAr: "مدى حركة الكتف في جهة البتر", nameEn: "Shoulder range of motion on the amputated side",
    kind: "mobility", region: "shoulder", sets: 1, reps: 10, hold: 5,
    purpose: ["الكتفُ الكاملةُ الحركة يحتاجها حزامُ الطرف ومدى عمله، والكتفُ المتيبّسة من أقوى ما تنبّأ بترك الطرف (Wright 1995) — وهي أهمّ لبتر فوق المرفق والكتف.",
      "A fully mobile shoulder is needed for the harness and the prosthesis's working range, and a stiff shoulder strongly predicted giving up the prosthesis (Wright 1995) — more so above the elbow and at shoulder level."],
    start: ["مستلقٍ على ظهره أوّلاً، ثمّ جالساً أو واقفاً.", "Lying on the back first, then sitting or standing."],
    steps: [[
      "ارفع الجذعَ إلى الأمام فوق الرأس ببطء، واليدُ السليمة تساعد من تحت المرفق أو الجذع.",
      "أبعِده إلى الجانب ثمّ أعِده.",
      "أدِر الكتفَ إلى الخارج والداخل والجذعُ قرب الجسم (لبتر تحت المرفق: والمرفقُ مثنيّ).",
      "مدّ الكتفَ إلى الخلف.",
      "اثبت ٥ ثوانٍ في آخر كلّ حركة، وكرّر ١٠ مرّات.",
    ], [
      "Raise the residual limb forwards overhead slowly, with the sound hand helping under the elbow or the limb.",
      "Take it out to the side and back.",
      "Rotate the shoulder out and in with the limb close to the body (below the elbow: with the elbow bent).",
      "Take the shoulder back into extension.",
      "Hold 5 seconds at the end of each movement, and repeat 10 times.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن ⟵ اخفضها أوّلاً ثمّ تحرّك.",
      "تقوّسُ الظهر ليبدو المدى أكبر ⟵ البطنُ مشدودٌ خفيفاً والظهرُ ثابت.",
      "الاكتفاءُ بالحركة الصغيرة ⟵ آخرُ المدى كلَّ مرّة، فهو ما يحتاجه الحزام.",
    ], [
      "Hiking the shoulder towards the ear → lower it first, then move.",
      "Arching the back to look like more range → light abdominal brace, back still.",
      "Settling for small movements → the end of the range every time; that is what the harness needs.",
    ]],
    easier: ["مستلقياً وبمساعدة المعالج.", "Lying down with the therapist assisting."],
    harder: ["واقفاً، وبمطّاطٍ خفيف في آخر المدى.", "Standing, with a light band at the end of the range."],
    stopIf: ["تنميلٌ أو وخزٌ في الذراع السليمة أو الجذع (تهيّجُ الضفيرة العضدية) — توقّف وأعِد التقييم.", "Pins and needles in the sound arm or the residual limb (brachial plexus irritation) — stop and reassess."],
    equipment: ["فرشة، ومطّاطٌ خفيف للتصعيب.", "A mat, and a light band for progression."],
    doseNote: ["يومياً.", "Daily."],
    images: [{ key: "ul-residual-shoulder-rom-1", ar: "مبتورُ ذراعٍ مستلقٍ يرفع جذعَه فوق رأسه واليدُ السليمة تساعده", en: "An arm amputee lying down raising the residual limb overhead with the sound hand helping", search: "transhumeral amputee shoulder flexion range of motion exercise" }],
  },
  {
    code: "ul-residual-limb-loading", nameAr: "تقوية الجذع تدريجياً حتى وزن الطرف", nameEn: "Progressive residual-limb strengthening towards prosthesis weight",
    kind: "strength", region: "shoulder", sets: 3, reps: 12,
    purpose: ["يبني القوّةَ والتحمّلَ لحمل الطرف والعمل به بعيداً عن الجسم ساعاتٍ في اليوم — بثقلٍ على الجذع أو مطّاط (VA/DoD 2022)؛ والهدفُ أن يحمل الجذعُ وزنَ الطرف المتوقَّع في وضع العمل ٦٠ ثانية.",
      "Builds the strength and endurance to carry the prosthesis and work with it away from the body for hours a day — with a cuff weight or band on the limb (VA/DoD 2022); the target is holding the expected prosthesis weight in the working position for 60 seconds."],
    start: ["واقفٌ (أو مستلقٍ لبتر فوق المرفق والكتف أوّلاً)، وثقلٌ بحزامٍ على الجذع أو مطّاطٌ مثبَّت.", "Standing (or lying first above the elbow and at shoulder level), with a cuff weight strapped to the limb or an anchored band."],
    steps: [[
      "رفعُ الكتف إلى الأمام، ومدُّها إلى الخلف، وإبعادُها، ودورانُها للداخل والخارج — ١٠–١٥ لكلّ حركة.",
      "لبتر تحت المرفق: ثنيُ المرفق ومدُّه بالثقل.",
      "احمل الجذعَ في وضع العمل (أمام الجسم ومرفقٌ مثنيّ أو ذراعٌ ممدودة قليلاً) ٣٠–٦٠ ثانية.",
      "زِد الثقلَ ٠٫٢٥–٠٫٥ كغ في الأسبوع نحو وزن الطرف المتوقَّع (اسأل فنّيَّ الأطراف).",
    ], [
      "Shoulder forward raise, extension, abduction, and internal and external rotation — 10–15 of each.",
      "Below the elbow: elbow bending and straightening with the weight.",
      "Hold the limb in the working position (in front of the body, elbow bent or arm slightly forward) for 30–60 seconds.",
      "Add 0.25–0.5 kg a week towards the expected prosthesis weight (ask the prosthetist).",
    ]],
    cues: [[
      "رفعُ الكتف أو ميلُ الجذع ⟵ ثقلٌ أخفّ.",
      "حبسُ النفس ⟵ عُدَّ بصوتٍ مسموع.",
      "الحزامُ يحتكّ بالجلد ⟵ حشوةٌ تحته ويُنقل مكانُه.",
    ], [
      "Shoulder hiking or trunk lean → a lighter weight.",
      "Holding the breath → count out loud.",
      "The strap rubbing the skin → pad it and move it.",
    ]],
    easier: ["بلا ثقل، أو مستلقياً بلا جاذبية.", "No weight, or lying down with gravity eliminated."],
    harder: ["ثقلٌ أكبر نحو وزن الطرف، وثباتٌ أطول بعيداً عن الجسم.", "More weight towards the prosthesis weight, and longer holds away from the body."],
    stopIf: ["احمرارٌ من الحزام لا يزول، أو ألمٌ في الكتف يزيد على ٥ من ١٠.", "Redness from the strap that does not fade, or shoulder pain above 5/10."],
    equipment: ["أثقالٌ بحزام (٠٫٢٥–٢ كغ)، ومطّاط، وحشوة.", "Cuff weights (0.25–2 kg), bands and padding."],
    doseNote: ["٢–٣ مجموعات × ١٠–١٥ مرّةً يومياً، والثباتُ في وضع العمل ٣ × ٦٠ ثانية هدفُ المرحلة الأولى.", "2–3 sets × 10–15 once daily; holding the working position 3 × 60 seconds is the phase 1 target."],
    images: [{ key: "ul-residual-limb-loading-1", ar: "مبتورُ ذراعٍ يرفع جذعَه إلى الأمام وعليه ثقلٌ بحزام", en: "An arm amputee raising the residual limb forwards with a cuff weight strapped on", search: "upper limb amputee residual limb cuff weight strengthening" }],
  },
  {
    code: "one-handed-adl", nameAr: "الاستقلال بيدٍ واحدة في الحياة اليومية", nameEn: "One-handed independence in daily activities",
    kind: "functional", region: "wrist_hand",
    purpose: ["الاستقلالُ بلا طرف أوّلُ الأهداف (VA/DoD 2022)، وهو البديلُ لمن لا يلبس طرفاً أو حين يكون في الصيانة — اللبسُ والأكلُ والحمّامُ والوضوءُ بطرقٍ وأدواتٍ مكيّفة.",
      "Independence without a prosthesis is the first goal (VA/DoD 2022), and the fallback for those who do not wear one or while it is being repaired — dressing, eating, the bathroom and ablution with adapted methods and tools."],
    start: ["مهامُّ حقيقية على الطاولة وفي الحمّام، بالملابس والأدوات التي يستعملها في بيته.", "Real tasks at the table and in the bathroom, with the clothes and tools used at home."],
    steps: [[
      "القميصُ أو الدشداشة: الجهةُ المبتورة تدخل أوّلاً وتخرج آخراً.",
      "البنطالُ بخصرٍ مطّاطيّ، والأزرارُ بخطّاف الأزرار.",
      "السكّينُ المتأرجح، وحصيرةٌ مانعةٌ للانزلاق، وفتحُ العلبة بين الركبتين أو في درج.",
      "الحمّامُ والاستنجاءُ والوضوءُ بخطواتٍ يُتّفق عليها مع المريض وأهله بحسب اليد الباقية.",
      "الهاتفُ ولوحةُ المفاتيح بيدٍ واحدة.",
    ], [
      "Shirt or dishdasha: the amputated side goes in first and comes out last.",
      "Trousers with an elastic waist, and buttons with a buttonhook.",
      "A rocker knife, a non-slip mat, and opening a jar between the knees or in a drawer.",
      "Toileting, washing after the toilet and ablution in steps agreed with the patient and family according to the remaining hand.",
      "Phone and keyboard one-handed.",
    ]],
    cues: [[
      "القبضُ القويّ الطويل باليد السليمة ⟵ مثبّتاتٌ (حصيرة، ملقط) تحمل عنها.",
      "الأهلُ يفعلون كلَّ شيءٍ عنه ⟵ يُعلَّمون أن يتركوه يحاول أوّلاً.",
      "تجنّبُ الحديث عن الاستنجاء والأكل باليد الأخرى ⟵ حلٌّ صريحٌ محترم مع المريض وأهله.",
    ], [
      "Long, strong gripping with the sound hand → stabilisers (a mat, a clamp) take the load.",
      "The family doing everything for the patient → teach them to let the patient try first.",
      "Avoiding talk of toilet hygiene and eating with the other hand → frank, respectful problem-solving with the patient and family.",
    ]],
    easier: ["ملابسُ مكيّفة وأدواتٌ مساعدة.", "Adapted clothing and aids."],
    harder: ["ملابسُ عادية، وبالوقت.", "Ordinary clothing, timed."],
    stopIf: ["ألمٌ يزيد في اليد أو الكتف السليمة.", "Rising pain in the sound hand or shoulder."],
    equipment: ["حصيرةٌ مانعةٌ للانزلاق، وسكّينٌ متأرجح، وخطّافُ أزرار، وأربطةُ حذاءٍ مطّاطية.", "A non-slip mat, a rocker knife, a buttonhook and elastic laces."],
    doseNote: ["١٥–٢٠ دقيقةً في الجلسة، وفي البيت كلَّ يوم.", "15–20 minutes per session, and every day at home."],
    images: [{ key: "one-handed-adl-1", ar: "مبتورُ ذراعٍ يقطع طعاماً بسكّينٍ متأرجح وحصيرةٌ مانعةٌ للانزلاق تحت الصحن", en: "An arm amputee cutting food with a rocker knife and a non-slip mat under the plate", search: "one handed rocker knife non slip mat amputee eating" }],
  },
  {
    code: "hand-dominance-writing", nameAr: "تحويل اليد المسيطرة: الكتابة والمهارات الدقيقة باليد الأخرى", nameEn: "Hand-dominance transfer: writing and fine skills with the other hand",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["بعد فقد اليد المسيطرة: يُبدأ تحويلُ السيطرة متى ناسب (VA/DoD 2022) — الكتابةُ والقصُّ والسكّين (OneHand 2024)؛ والاستعمالُ الطويل لليد غير المسيطرة يبلغ سرعةَ الأصحّاء ونعومتَهم لا دقّتَهم (Philip 2014).",
      "After losing the dominant hand: start dominance transfer when appropriate (VA/DoD 2022) — writing, scissors and the knife (OneHand 2024); long forced use of the non-dominant hand reaches normal speed and smoothness but not accuracy (Philip 2014)."],
    start: ["جالسٌ إلى طاولة، والورقةُ مثبّتةٌ بزاويةٍ تناسب اليدَ الجديدة.", "Sitting at a table with the paper taped at an angle that suits the new hand."],
    steps: [[
      "حلقاتٌ وخطوطٌ تمهيدية دقيقتين.",
      "الحروفُ العربية حرفاً حرفاً، ثمّ كلماتٌ والتوقيع.",
      "نسخُ جملةٍ بالوقت.",
      "المقصّ ثمّ السكّين.",
      "الصبُّ والكتابةُ على الهاتف.",
    ], [
      "Warm-up loops and lines for two minutes.",
      "Arabic letters one at a time, then words and the signature.",
      "Copying a sentence, timed.",
      "Scissors, then a knife.",
      "Pouring and typing on the phone.",
    ]],
    cues: [[
      "قبضٌ شديد على القلم ⟵ قلمٌ بمقبضٍ سميك وقبضٌ خفيف.",
      "الرسغُ معقوفٌ فوق السطر ⟵ أدِر الورقة.",
      "الاستعجالُ في الوضوح ⟵ الحجمُ الكبير أوّلاً ثمّ يصغر.",
    ], [
      "Gripping the pen too hard → a thick-grip pen and a light hold.",
      "The wrist hooked over the line → rotate the paper.",
      "Rushing legibility → large writing first, then smaller.",
    ]],
    easier: ["قلمٌ سميك وسطورٌ عريضة.", "A thick pen and wide lines."],
    harder: ["قلمٌ عاديّ، وبالوقت، ووضوحٌ يُقيَّم.", "An ordinary pen, timed, with legibility scored."],
    stopIf: ["تشنّجٌ في اليد — استرح.", "Hand cramp — rest."],
    equipment: ["أقلام، وورقٌ مسطّر، ومقصّ.", "Pens, lined paper and scissors."],
    doseNote: ["١٠–١٥ دقيقةً في الجلسة و١٠ دقائق يومياً في البيت.", "10–15 minutes per session and 10 minutes a day at home."],
    images: [{ key: "hand-dominance-writing-1", ar: "يكتب بيده غير المسيطرة والورقةُ مثبّتةٌ مائلة", en: "Writing with the non-dominant hand with the paper taped at an angle", search: "non dominant hand handwriting practice amputee" }],
  },
  {
    code: "myo-site-training", nameAr: "تحديد مواقع إشارات العضلات وعزلها (للطرف الكهربائيّ)", nameEn: "Myo-site identification and isolation (for a myoelectric prosthesis)",
    kind: "motor_control", region: "elbow", sets: 1, reps: 10,
    purpose: ["قبل تركيب الطرف الكهربائيّ (الذكيّ): إيجادُ موقعين ثابتين لإشارتي الفتح والإغلاق، وتعلّمُ انقباض كلٍّ وحده والارتخاء التامّ — على شاشة جهاز الإشارات ومع فنّيّ الأطراف (VA/DoD 2022 · Stubblefield 2009). وهو تمرينٌ لا جهازُ علاج: يقيس إشارةَ المريض فيتعلّم منها.",
      "Before fitting a myoelectric ('smart') prosthesis: find two reliable sites for the open and close signals, and learn to contract each alone and relax fully — on the signal tester's screen and with the prosthetist (VA/DoD 2022 · Stubblefield 2009). It is training, not a treatment device: it reads the patient's own signal so they can learn from it."],
    start: ["جالسٌ والمرفقُ مسنود، والجلدُ نظيفٌ جافّ، وأقطابُ جهاز الإشارات (من فنّيّ الأطراف) أو جهازُ التغذية الراجعة جاهز.", "Sitting with the elbow supported, the skin clean and dry, and the electrodes of the prosthetist's signal tester or a biofeedback unit ready."],
    steps: [[
      "تخيّل مدَّ الرسغ المبتور (فتحُ اليد) ثمّ ثنيَه (إغلاقُها)، والمعالجُ يتحسّس أقوى نقطتين.",
      "ضع القطبين على أقوى النقطتين (فوق المرفق: العضلةُ الأمامية والخلفية للعضد).",
      "انقبض ثانيتين ثمّ ارتخِ تماماً — والارتخاءُ أسهل أن يُحسّ بعد انقباضٍ قويّ.",
      "كرّر لكلّ موقعٍ والآخرُ ساكنٌ على الشاشة.",
      "كرّر والجذعُ في أوضاعٍ مختلفة (أمامك، فوق، بجانبك).",
      "علّم الموقعين المتّفق عليهما للقالب، وصوّرهما للتمرين في البيت.",
    ], [
      "Imagine extending the missing wrist (hand open), then bending it (hand close), while the therapist feels for the two strongest points.",
      "Place the electrodes over the two strongest points (above the elbow: the front and back muscles of the upper arm).",
      "Contract for two seconds, then relax fully — relaxation is easiest to feel after a strong contraction.",
      "Repeat at each site while the other channel stays quiet on the screen.",
      "Repeat with the limb in different positions (in front, up, at the side).",
      "Mark the two agreed sites for the socket, and photograph them for home practice.",
    ]],
    cues: [[
      "الإشارتان معاً (انقباضٌ مشترك) ⟵ أبطأ وبجهدٍ أقلّ.",
      "تحريكُ الكتف أو الجذع ⟵ ثبّتهما، فالإشارةُ من العضلة وحدها.",
      "الضغطُ أقوى حين يضعف التحكّم ⟵ جهدٌ متوسّط، فالقوّةُ تُفسد التحكّم (Simon 2012).",
    ], [
      "Both signals at once (co-contraction) → slower and with less effort.",
      "Moving the shoulder or trunk → keep them still; the signal comes from the muscle alone.",
      "Trying harder when control is poor → moderate effort; force spoils control (Simon 2012).",
    ]],
    easier: ["الجذعُ مسنود، والعينان على الشاشة.", "The limb supported, eyes on the screen."],
    harder: ["الجذعُ غيرُ مسنود، والعينان مغمضتان، وواقفاً.", "The limb unsupported, eyes closed, standing."],
    stopIf: ["تعبٌ تضعف معه الإشارة — استرح؛ فالراحاتُ المتكرّرة ضرورية.", "Fatigue with a falling signal — rest; frequent rests are necessary."],
    equipment: ["جهازُ قياس الإشارات (من فنّيّ الأطراف) أو جهازُ تغذيةٍ راجعة بالإشارة العضلية، ومناديلُ تنظيف.", "The prosthetist's signal tester or an EMG biofeedback unit, and skin wipes."],
    doseNote: ["فتراتُ ١٠–١٥ دقيقة، مرّةً أو مرّتين في الجلسة، والانقباضاتُ في البيت يومياً من الصور.", "10–15-minute blocks, once or twice per session, and the contractions at home daily from the photos."],
    images: [{ key: "myo-site-training-1", ar: "أقطابُ جهاز الإشارات على جذع الساعد والإشارةُ على الشاشة", en: "Signal-tester electrodes on a forearm residual limb with the signal on screen", search: "myoelectric site testing electrodes residual limb EMG screen" }],
  },
  {
    code: "myo-graded-control", nameAr: "التحكّم المتدرّج بإشارة العضلة والتبديل بين الوظائف", nameEn: "Graded myo-signal control and mode switching",
    kind: "motor_control", region: "elbow", homeSuitable: false,
    purpose: ["سرعةٌ وقوّةٌ مضبوطتان وتبديلٌ موثوق بين الوظائف قبل الطرف وبعده. وضبطُ قوّة القبض يحتاج تمريناً أطول من ضبط الوضع (Bouwsema 2014)، والألعابُ المرتبطة بمهامّ حقيقية تنتقل إلى الطرف أكثر من غيرها (van Dijk 2016) — وانتقالُ هذا كلّه إلى الاستعمال اليوميّ لم يُثبَت بعد (Parr 2022).",
      "Controlled speed and force and reliable switching between functions, before and after fitting. Grip-force control needs more practice than positioning (Bouwsema 2014), and task-oriented games transfer to the prosthesis better than others (van Dijk 2016) — though transfer of all this to daily use is not yet proven (Parr 2022)."],
    start: ["كبطاقة «تحديد مواقع الإشارات»، والشاشةُ تُظهر شرائطَ هدفٍ ثلاثة.", "As for the 'myo-site identification' card, with the screen showing three target bands."],
    steps: [[
      "اصعد بالإشارة إلى الشريط المنخفض ثمّ المتوسّط ثمّ العالي، واثبت في كلٍّ ٣ ثوانٍ.",
      "اتبع خطّاً صاعداً ونازلاً ببطء.",
      "انقباضٌ سريع ثمّ بطيء.",
      "إشارةُ التبديل كما برمجها فنّيُّ الأطراف (انقباضٌ مشترك أو نبضتان).",
      "لعبةُ التقاط: فتحةُ اليد تطابق حجمَ الشيء.",
      "يدٌ مثبّتةٌ على الطاولة: افتحها إلى النصف وتوقّف.",
    ], [
      "Bring the signal to the low, then medium, then high band, holding each for 3 seconds.",
      "Follow a line up and down slowly.",
      "A fast contraction, then a slow one.",
      "The switch signal as the prosthetist programmed it (co-contraction or a double pulse).",
      "A catching game: hand opening matches the size of the object.",
      "A hand mounted on the table: open it halfway and stop.",
    ]],
    cues: [[
      "تجاوزُ الهدف ⟵ ابدأ بالشريط المنخفض.",
      "تبديلٌ غيرُ مقصود ⟵ ارتخاءٌ تامّ بين المحاولات.",
      "اللعبُ للفوز لا للتحكّم ⟵ الدقّةُ قبل السرعة.",
    ], [
      "Overshooting the target → start with the low band.",
      "Accidental switching → full relaxation between attempts.",
      "Playing to win rather than for control → accuracy before speed.",
    ]],
    easier: ["شرائطُ هدفٍ عريضة.", "Wide target bands."],
    harder: ["شرائطُ ضيّقة، وتتابعٌ أسرع، ومع شاغلٍ ذهنيّ.", "Narrow bands, faster sequences, and a mental distraction."],
    stopIf: ["تعبٌ تضعف معه الإشارة — استرح.", "Fatigue with a falling signal — rest."],
    equipment: ["جهازُ الإشارات أو برنامجُه، وحاسوب، ويدٌ مثبّتةٌ على الطاولة إن وُجدت.", "The signal tester or its software, a laptop, and a table-mounted hand if available."],
    doseNote: ["١٠–١٥ دقيقة، مرّةً أو مرّتين في الجلسة في المرحلة الأولى، ثمّ إحماءٌ في الثانية.", "10–15 minutes, one or two blocks per session in phase 1, then as a warm-up in phase 2."],
    images: [{ key: "myo-graded-control-1", ar: "مبتورٌ يتابع شرائطَ هدفٍ على شاشة جهاز الإشارات", en: "An amputee following target bands on the myo-signal screen", search: "myoelectric control training software target amputee" }],
  },
  {
    code: "pattern-recognition-training", nameAr: "التحكّم بالتعرّف على الأنماط: المعايرة وإعادة المعايرة", nameEn: "Pattern-recognition control: calibration and recalibration",
    kind: "motor_control", region: "elbow", homeSuitable: false,
    purpose: ["في الأطراف الذكية المتعدّدة الحركات يتعلّم الجهازُ نمطَ إشارات كلّ حركةٍ متخيَّلة — فيحتاج المريضُ حركاتٍ ثابتةً متكرّرة (Simon 2012). وكان أفضلَ من التحكّم المباشر بعد إعادة توجيه الأعصاب (Hargrove 2017) وأوسعَ استعمالاً للقبضات في البيت (Simon 2023)، لكنّ مستعمليه يجدونه بديهياً غيرَ موثوقٍ دائماً.",
      "In multi-movement smart prostheses the device learns the signal pattern of each imagined movement — so the patient needs consistent, repeatable movements (Simon 2012). It beat direct control after targeted muscle reinnervation (Hargrove 2017) and widened grip use at home (Simon 2023), but users find it intuitive yet not always reliable."],
    start: ["جالسٌ والقالبُ التجريبيّ أو كمُّ الأقطاب ملبوس، والشاشةُ أمامه.", "Sitting with the check socket or electrode sleeve on and the screen in front."],
    steps: [[
      "اتّفقا على أسماء الحركات (مثلاً «الكفُّ إلى الأعلى»).",
      "اختر حركةً متخيَّلةً واحدة لكلّ وظيفة — وحرّك اليدَ السليمة معها إن كان الطرفُ الشبحيّ ساكناً أو مؤلماً.",
      "انظر إلى الشاشة: كلُّ حركةٍ نمطٌ مختلف.",
      "المعايرةُ بإرشاد الشاشة.",
      "التحكّمُ في يدٍ افتراضية أو حقيقية، بالأسهل أوّلاً (تحت المرفق: فتحٌ وإغلاق؛ فوقه: رفعُ المرفق وخفضُه).",
      "أضف حركةً جديدة حين تثق بالسابقة، وأعِد المعايرةَ (نحو دقيقة) كلّما ضعف التحكّم.",
    ], [
      "Agree on names for the movements (for example 'palm up').",
      "Choose one imagined movement per function — and move the sound hand with it if the phantom feels still or painful.",
      "Look at the screen: each movement gives a different pattern.",
      "Calibrate following the screen.",
      "Control a virtual or real hand, easiest first (below the elbow: open and close; above it: elbow up and down).",
      "Add a new movement only when the previous one is confident, and recalibrate (about a minute) whenever control degrades.",
    ]],
    cues: [[
      "«انقباضٌ أقوى» ⟵ جهدٌ متوسّطٌ ثابت.",
      "تغييرُ طريقة الحركة من يومٍ ليوم ⟵ صِفها واكتبها في الملفّ.",
      "البدءُ بلا فحص ⟵ فحصٌ سريع للحركات بعد كلّ لبس.",
    ], [
      "'A stronger contraction' → a steady, moderate effort.",
      "Changing how a movement is done from day to day → describe it and write it in the file.",
      "Starting without a check → a quick movement check after every donning.",
    ]],
    easier: ["حركتان فقط.", "Two movements only."],
    harder: ["أربعُ حركاتٍ إلى ستّ، والذراعُ في أوضاعٍ مختلفة.", "Four to six movements, with the arm in different positions."],
    stopIf: ["تعب — استرح.", "Fatigue — rest."],
    equipment: ["نظامُ التعرّف على الأنماط وبرنامجُه، وقالبٌ تجريبيّ أو كمُّ أقطاب.", "The pattern-recognition system and software, and a check socket or electrode sleeve."],
    doseNote: ["فتراتُ ١٠–١٥ دقيقة؛ وورقةُ الحركات للبيت.", "10–15-minute blocks; a sheet of the movements for home."],
    images: [{ key: "pattern-recognition-training-1", ar: "مبتورٌ يعاير طرفاً ذكياً والأنماطُ على شاشة الحاسوب", en: "An amputee calibrating a smart prosthesis with the patterns on a laptop screen", search: "pattern recognition prosthesis calibration amputee laptop" }],
  },
  {
    code: "ul-phantom-mirror-gmi", nameAr: "الألم الشبحيّ في اليد: التخيّل الحركيّ المتدرّج والمرآة", nameEn: "Phantom hand pain: graded motor imagery and mirror therapy",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["الألمُ الشبحيّ شائعٌ بعد بتر الذراع (نحو ثلاثة أرباع المبتورين). والعلاجُ بالمرآة توصيةٌ ضعيفة للمدى القصير (VA/DoD 2022)؛ خفّض الألمَ في تجربةٍ على مبتوري الذراع (Finn 2017)، والمراجعاتُ متضاربة (Xie 2022 · Guémann 2023)؛ والتخيّلُ المتدرّج مراحلُ أسبوعين لكلّ خطوة (Moseley 2006). يُجرَّب لمن يتألّم ويُقاس.",
      "Phantom pain is common after arm loss (about three in four). Mirror therapy is a weak recommendation for short-term relief (VA/DoD 2022); it reduced pain in a trial in arm amputees (Finn 2017), reviews conflict (Xie 2022 · Guémann 2023), and graded imagery runs in two-week steps (Moseley 2006). It is tried for those in pain, and measured."],
    start: ["جالسٌ إلى طاولة، وصندوقُ مرآةٍ أو مرآةٌ قائمة، والجذعُ خلفها لا يُرى، واليدُ السليمة أمامها.", "Sitting at a table with a mirror box or upright mirror, the residual limb hidden behind it and the sound hand in front."],
    steps: [[
      "الأسبوعان ١–٢: تمييزُ اليد اليمنى من اليسرى في صورٍ (بطاقاتٌ أو تطبيق).",
      "الأسبوعان ٣–٤: تخيّلُ حركات اليد المبتورة دون تحريك شيء.",
      "ثمّ المرآة: حرّك اليدَ السليمة (فتحٌ وقبض، رسغ، لمسُ الإبهام للأصابع) وانظر إلى انعكاسها وحاول الحركةَ نفسَها باليد الشبحيّة.",
      "زِد السرعةَ والتعقيد تدريجياً.",
      "سجّل الألمَ من ١٠ قبل الجلسة وبعدها.",
    ], [
      "Weeks 1–2: telling left from right hands in pictures (cards or an app).",
      "Weeks 3–4: imagining movements of the missing hand without moving anything.",
      "Then the mirror: move the sound hand (open and close, wrist, thumb to fingers), watch its reflection and attempt the same with the phantom hand.",
      "Gradually increase speed and complexity.",
      "Score the pain out of 10 before and after the session.",
    ]],
    cues: [[
      "النظرُ إلى الجذع ⟵ العينان على المرآة.",
      "وضعياتٌ مؤلمة ⟵ حركاتٌ مريحة.",
      "الاستمرارُ بلا فائدة ⟵ إن لم ينقص الألمُ نحو نقطتين بحلول الجلسة العاشرة يُراجَع العلاج.",
    ], [
      "Looking at the residual limb → eyes on the mirror.",
      "Painful postures → comfortable movements.",
      "Carrying on without benefit → if pain has not dropped by about 2 points by session 10, review the treatment.",
    ]],
    easier: ["تكراراتٌ أقلّ وحركاتٌ بسيطة.", "Fewer repetitions and simple movements."],
    harder: ["تتابعاتٌ معقّدة وأغراضٌ في اليد السليمة.", "Complex sequences and objects in the sound hand."],
    stopIf: ["ألمٌ أو ضيقٌ يزيد أكثرَ من ٣٠ دقيقة بعد الجلسة — عُد خطوةً إلى الوراء.", "Pain or distress rising for more than 30 minutes after a session — go back one step."],
    equipment: ["صندوقُ مرآة أو مرآةٌ قائمة، وبطاقاتُ صورٍ أو تطبيق.", "A mirror box or upright mirror, and picture cards or an app."],
    doseNote: ["١٥ دقيقةً يومياً، ٥–٧ أيّامٍ في الأسبوع، أربعةَ أسابيع فأكثر — لمن يتألّم.", "15 minutes a day, 5–7 days a week, for four weeks or more — for those in pain."],
    images: [{ key: "ul-phantom-mirror-gmi-1", ar: "مبتورُ ذراعٍ أمام صندوق مرآة ينظر إلى انعكاس يده السليمة", en: "An arm amputee at a mirror box watching the reflection of the sound hand", search: "mirror box therapy upper limb amputee phantom pain" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "ul-prosthesis-donning", nameAr: "لبس طرف الذراع وخلعه وفحص التحكّم بعد كلّ لبس", nameEn: "Putting the arm prosthesis on and off, with a control check after every donning",
    kind: "functional", region: "whole_body",
    purpose: ["الاستقلالُ في اللبس والخلع والجورب والحزام (VA/DoD 2022)، وتماسُّ الأقطاب الصحيح — والتحكّمُ يُفحص بعد كلّ لبس (Simon 2012)؛ والهدف: وحده خلال دقيقتين (أربعٍ لفوق المرفق أو الحزام).",
      "Independence in donning, doffing, the sock and the harness (VA/DoD 2022), and correct electrode contact — with control checked after every donning (Simon 2012); the target is alone within two minutes (four above the elbow or with a harness)."],
    start: ["جالسٌ والطرفُ على الطاولة أمامه.", "Sitting with the prosthesis on the table in front."],
    steps: [[
      "افحص الجلد.",
      "البطانةُ أو الكمُّ أو جوربُ السحب كما وُصف.",
      "أدخل الجذع والأقطابُ فوق الموقعين المعلَّمين.",
      "الحزامُ (للطرف الميكانيكيّ وفوق المرفق): بطريقة «فوق الرأس» أو «المعطف».",
      "شغّل الطرف، وافحص الحركاتِ كلَّها مرّةً واحدة.",
      "الخلعُ بالعكس، ثمّ فحصُ الجلد.",
    ], [
      "Check the skin.",
      "The liner, sleeve or pull-sock as prescribed.",
      "Insert the limb with the electrodes over the marked sites.",
      "The harness (body-powered and above the elbow): the overhead or the coat method.",
      "Switch the prosthesis on and check every movement once.",
      "Take it off in reverse, then check the skin.",
    ]],
    cues: [[
      "القالبُ مُدارٌ عن مكانه ⟵ طابق العلاماتِ المرجعية.",
      "جلدٌ رطب ⟵ جفّفه تماماً، فالرطوبةُ تُفسد الإشارة.",
      "الحزامُ ملتوٍ ⟵ افرده على الطاولة أوّلاً.",
    ], [
      "The socket rotated out of place → line up the reference marks.",
      "Damp skin → dry it completely; moisture spoils the signal.",
      "A twisted harness → lay it flat on the table first.",
    ]],
    easier: ["بمساعدة، والطرفُ مثبّتٌ على الطاولة.", "With help, and the prosthesis fixed on the table."],
    harder: ["بالوقت مقابل المعيار؛ ولمبتور الطرفين بحاملٍ للبس وحده.", "Timed against the criterion; for bilateral amputees, alone with a donning stand."],
    stopIf: ["ألمٌ أو تنميل، أو احمرارٌ يبقى أكثرَ من ٢٠ دقيقة بعد الخلع.", "Pain, numbness, or redness lasting more than 20 minutes after removal."],
    equipment: ["الطرف، وأدواتُ اللبس.", "The prosthesis and donning aids."],
    doseNote: ["٣–٥ مرّاتٍ في الجلسة في المرحلة الثانية، ومدّةُ اللبس تبدأ ١–٢ ساعة وتزيد نحو ساعةٍ كلَّ بضعة أيّام (VA/DoD 2022).", "3–5 times per session in phase 2; wearing time starts at 1–2 hours and adds about an hour every few days (VA/DoD 2022)."],
    images: [{ key: "ul-prosthesis-donning-1", ar: "مبتورٌ يُدخل جذعَه في قالب طرف الذراع", en: "An amputee inserting the residual limb into the arm prosthesis socket", search: "upper limb prosthesis donning transradial socket" }],
  },
  {
    code: "myo-control-accuracy", nameAr: "التحكّم بالطرف الكهربائيّ واختبار الحركات الاثنتي عشرة", nameEn: "Myoelectric control on the prosthesis and the 12-motion accuracy test",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["فتحٌ وإغلاقٌ موثوقان، وسرعةٌ متدرّجة، ودورانُ الرسغ — واختبارُ الدقّة: فتحُ ثلاثة أرباع ⟵ دورانُ ١٨٠° للخارج ⟵ إغلاقٌ إلى الربع ⟵ دورانُ ١٨٠° للداخل، ثلاثَ مرّات، والنتيجةُ من ١٢ (VA/DoD 2022). وحركةٌ جديدة لا تُضاف قبل الثقة بالسابقة (Simon 2012).",
      "Reliable opening and closing, graded speed, and wrist rotation — with the accuracy test: open three-quarters → rotate 180° out → close to a quarter → rotate 180° in, three times, scored out of 12 (VA/DoD 2022). A new movement is not added until the previous one is confident (Simon 2012)."],
    start: ["جالسٌ والساعدُ مسنود، ثمّ واقفاً بلا سند.", "Sitting with the forearm supported, then standing unsupported."],
    steps: [[
      "فتحٌ وإغلاقٌ كاملان ١٠ مرّات.",
      "فتحٌ إلى النصف ثمّ توقّف، ١٠ مرّات.",
      "حركةٌ بطيئة ثمّ سريعة.",
      "دورانُ الرسغ إن وُجد.",
      "تتابعاتٌ بأمر المعالج.",
      "في آخر الجلسة: اختبارُ الحركات الاثنتي عشرة، وسجّل النتيجة.",
    ], [
      "Full open and close 10 times.",
      "Open halfway and stop, 10 times.",
      "Slow movement, then fast.",
      "Wrist rotation if present.",
      "Sequences on the therapist's command.",
      "At the end of the session: the 12-motion test, and record the score.",
    ]],
    cues: [[
      "اليدُ تنفتح حين يُرفع الذراع (أثرُ وضع الذراع) ⟵ تمرّن في أوضاعٍ كثيرة، ويضبط فنّيُّ الأطراف الحسّاسية.",
      "تعبٌ فتضيع الدقّة ⟵ راحة.",
      "النظرُ المستمرّ إلى اليد ⟵ يقلّ تدريجياً مع الثقة.",
    ], [
      "The hand opening when the arm is lifted (arm-position effect) → practise in many positions, and the prosthetist adjusts the gain.",
      "Fatigue losing accuracy → rest.",
      "Watching the hand all the time → less and less as confidence grows.",
    ]],
    easier: ["الساعدُ مسنود.", "The forearm supported."],
    harder: ["فوق الرأس، وأثناء المشي، ومع شاغل.", "Overhead, while walking, and with a distraction."],
    stopIf: ["تهيّجُ الجلد تحت الأقطاب.", "Skin irritation under the electrodes."],
    equipment: ["الطرف.", "The prosthesis."],
    doseNote: ["١٥ دقيقةً في الجلسة في المرحلة الثانية.", "15 minutes per session in phase 2."],
    images: [{ key: "myo-control-accuracy-1", ar: "مبتورٌ يفتح يدَه الكهربائية إلى النصف والساعدُ مسنود", en: "An amputee opening a myoelectric hand halfway with the forearm supported", search: "myoelectric hand prosthesis control training open close" }],
  },
  {
    code: "body-powered-control", nameAr: "التحكّم بالطرف الميكانيكيّ (بالحزام) في مدى العمل", nameEn: "Body-powered prosthesis control across the working range",
    kind: "motor_control", region: "shoulder",
    purpose: ["يُفتح الطرفُ الميكانيكيّ بثني الكتف مع مباعدة اللوحين، ويُقفل مرفقُ فوق المرفق بالمدّ مع خفض الكتف (VA/DoD 2022) — ويُتعلّم في «مدى العمل» كلّه: عند الفم والطاولة والقدم والكتف والجانب. وهو أقوى في الغبار والماء والاهتزاز ويحتاج تدريباً أقلّ (Carey 2015).",
      "A body-powered prosthesis opens with shoulder flexion plus spreading the shoulder blades, and an above-elbow elbow locks with extension plus shoulder depression (VA/DoD 2022) — learned across the whole working range: at the mouth, table, foot, shoulder and side. It is tougher in dust, water and vibration and needs less training (Carey 2015)."],
    start: ["قبل الطرف: جالسٌ ومطّاطٌ من حزامٍ حول الكتف السليمة إلى الجذع. ومع الطرف: واقفٌ أمام طاولة.", "Before the prosthesis: sitting with a band from a strap around the sound shoulder to the limb. With the prosthesis: standing at a table."],
    steps: [[
      "قبل الطرف: مُدّ الجذعَ إلى الأمام وباعد اللوحين حتى يُشدّ المطّاطُ ٥ سم، واثبت ثانيتين، وارتخِ ببطء.",
      "بالطرف: افتح الكلّابة وأغلقها عند منتصف الطاولة ١٠ مرّات.",
      "ثمّ عند الفم، والحضنِ أو الحذاء، ومستوى الكتف، والجانب.",
      "فوق المرفق: اثنِ المرفق، واقفله (إلى الأسفل والخلف)، وافتح الكلّابة، وافتح القفل، ومدّ.",
      "تدرّج في الفتح: نصفٌ ثمّ كامل.",
    ], [
      "Before the prosthesis: reach the limb forwards while spreading the shoulder blades until the band stretches 5 cm, hold two seconds, relax slowly.",
      "With the prosthesis: open and close the hook at the middle of the table 10 times.",
      "Then at the mouth, the lap or shoe, shoulder height and the side.",
      "Above the elbow: bend the elbow, lock it (down and back), open the hook, unlock, straighten.",
      "Grade the opening: half, then full.",
    ]],
    cues: [[
      "تحريكُ الكتف السليمة ⟵ ثابتة؛ الحركةُ من جهة البتر.",
      "ميلُ الجذع بدل ثني الكتف ⟵ إشارةٌ في المرآة.",
      "المرفقُ لا يُقفل ⟵ أرخِ شدَّ السلك أوّلاً: الكتفُ في الوسط ثمّ ارفعها.",
    ], [
      "Moving the sound shoulder → keep it still; the movement comes from the amputated side.",
      "Leaning the trunk instead of flexing the shoulder → a cue in the mirror.",
      "The elbow will not lock → release cable tension first: shoulder neutral, then elevate.",
    ]],
    easier: ["مطّاطٌ خفيف، ومنتصفُ الطاولة وحده.", "A light band, and the middle of the table only."],
    harder: ["أطرافُ مدى العمل، وأثناء المشي.", "The extremes of the working range, and while walking."],
    stopIf: ["احتكاكُ الحزام بالإبط أو الجلد — حشوة.", "The harness rubbing the armpit or skin — pad it."],
    equipment: ["مطّاطٌ وحزام، أو الطرفُ الميكانيكيّ وأغراض.", "A band and a strap, or the body-powered prosthesis and objects."],
    doseNote: ["قبل الطرف ٣ × ١٥؛ وبالطرف ١٥–٢٠ دقيقةً في الجلسة.", "Before the prosthesis 3 × 15; with it, 15–20 minutes per session."],
    images: [{ key: "body-powered-control-1", ar: "مبتورٌ بطرفٍ ميكانيكيّ يفتح الكلّابة عند الطاولة بحركة الكتف", en: "An amputee with a body-powered prosthesis opening the hook at the table with a shoulder movement", search: "body powered prosthesis hook harness training amputee" }],
  },
  {
    code: "multigrip-selection", nameAr: "اختيار القبضة في اليد الذكية المتعدّدة القبضات", nameEn: "Grip selection with a multi-grip smart hand",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["اليدُ المتعدّدة القبضات أنفع حين تُستعمل قبضاتُها — وكثيراً ما لا تُستعمل إلّا قبضةٌ واحدة، وإرشاداتُ التدريب عليها ناقصة (Widehammar 2021).",
      "A multi-grip hand is more useful when its grips are actually used — often only one is, and training guidance for these hands is inadequate (Widehammar 2021)."],
    start: ["جالسٌ إلى طاولة عليها خمسةُ أغراض: مفتاح، بطاقة، كوب، كرة، قلم.", "Sitting at a table with five objects: a key, a card, a cup, a ball and a pen."],
    steps: [[
      "سمِّ القبضةَ المناسبة لكلّ غرض.",
      "بدّل القبضةَ (بالإشارة أو التطبيق أو التعرّف على الأنماط) قبل أن تمدّ يدَك.",
      "وجّه اليدَ نحو الغرض.",
      "اقبض ثمّ أفلت.",
      "خلط الأغراضَ عشوائياً.",
    ], [
      "Name the right grip for each object.",
      "Switch the grip (by signal, app or pattern recognition) before reaching.",
      "Orient the hand to the object.",
      "Grasp, then release.",
      "Mix the objects randomly.",
    ]],
    cues: [[
      "التبديلُ أثناء المدّ ⟵ بدّل أوّلاً ثمّ مدّ.",
      "قبضةٌ واحدة لكلّ شيء ⟵ الجلسةُ للقبضة المستهدفة وحدها.",
      "الإحباطُ من كثرة القبضات ⟵ ارجع إلى قبضتين.",
    ], [
      "Switching while reaching → switch first, then reach.",
      "One grip for everything → limit the session to the target grip.",
      "Frustration with too many grips → go back to two.",
    ]],
    easier: ["قبضتان.", "Two grips."],
    harder: ["أربعُ قبضاتٍ أو خمس، بالوقت وعشوائياً.", "Four or five grips, timed and random."],
    stopIf: ["الإحباطُ الشديد — ارجع إلى قبضتين.", "Marked frustration — go back to two grips."],
    equipment: ["اليدُ الذكية، والأغراض، والتطبيق.", "The smart hand, the objects, and the app."],
    doseNote: ["١٠–١٥ دقيقةً في الجلسة.", "10–15 minutes per session."],
    images: [{ key: "multigrip-selection-1", ar: "يدٌ ذكية متعدّدة القبضات تمسك مفتاحاً بقبضة المفتاح", en: "A multi-grip smart hand holding a key in a key grip", search: "multi articulating prosthetic hand grip patterns key grip" }],
  },
  {
    code: "graded-object-grasp", nameAr: "القبض والإفلات لأغراضٍ متدرّجة الحجم والهشاشة", nameEn: "Grasp and release of graded objects (size, fragility, weight)",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["ضبطُ قوّة القبض وتوجيهُ اليد قبل القبض: المبتورون يقبضون الغرضَ الهشّ بقوّةٍ أكبر بكثير ويكسرونه في المحاولات الأولى، ثمّ يخفّضون القوّةَ نحو النصف بعشر تكرارات (Lum 2014)؛ والأسهلُ أخذُ الغرض من اليد السليمة أوّلاً (Bouwsema 2014).",
      "Grip-force control and orienting the hand before grasping: amputees grip a fragile object much harder and break it on early attempts, then cut the force by about half within ten repetitions (Lum 2014); taking the object from the sound hand first is easiest (Bouwsema 2014)."],
    start: ["جالسٌ إلى طاولة عليها عشرةُ أغراض: مكعّبٌ خشبيّ كبير، كرةُ تنس، قنينة، مكعّبٌ صغير، قلم، عملةٌ أو بطاقة، مكعّبٌ إسفنجيّ، كوبٌ ورقيّ (فارغٌ ثمّ فيه ماء)، بيضة (أو بيضةٌ بلاستيكية)، كيسٌ بكيلوغرام.",
      "Sitting at a table with ten objects: a large wooden block, a tennis ball, a bottle, a small cube, a pen, a coin or card, a foam cube, a paper cup (empty, then with water), an egg (or plastic egg), and a 1-kg bag."],
    steps: [[
      "وجّه اليدَ نحو الغرض قبل القبض.",
      "اقبض.",
      "ارفعه وانقله ٣٠ سم.",
      "أفلته.",
      "تدرّج: من الطاولة إلى الرفّ إلى الأرض، ومن الكبير الصلب إلى الصغير الهشّ.",
    ], [
      "Orient the hand to the object before grasping.",
      "Grasp.",
      "Lift it and carry it 30 cm.",
      "Release it.",
      "Progress: from the table to a shelf to the floor, and from large and rigid to small and fragile.",
    ]],
    cues: [[
      "سحقُ الغرض الهشّ ⟵ أغلق ببطءٍ أو جزئياً.",
      "سقوطُ الثقيل ⟵ قبضةٌ كاملة واسنده باليد السليمة.",
      "البدءُ من الصعب ⟵ خذ الغرضَ من يدك السليمة أوّلاً.",
    ], [
      "Crushing the fragile object → close slowly or partly.",
      "Dropping the heavy one → a full grip, supported by the sound hand.",
      "Starting with the hardest → take the object from your sound hand first.",
    ]],
    easier: ["أغراضٌ كبيرةٌ صلبة.", "Large, rigid objects."],
    harder: ["أغراضٌ صغيرةٌ هشّة، بالوقت.", "Small, fragile objects, timed."],
    stopIf: ["ألمٌ في الكتف أو تهيّجٌ في الجلد تحت القالب.", "Shoulder pain or skin irritation under the socket."],
    equipment: ["مجموعةُ الأغراض العشرة.", "The set of ten objects."],
    doseNote: ["ثلاثُ جولاتٍ في الجلسة؛ وفي البيت بأغراض المطبخ.", "Three rounds per session; at home with kitchen items."],
    images: [{ key: "graded-object-grasp-1", ar: "يدٌ صناعية تمسك كوباً ورقياً دون أن تسحقه", en: "A prosthetic hand holding a paper cup without crushing it", search: "prosthetic hand grasping paper cup fragile object training" }],
  },
  {
    code: "prosthetic-hand-drills", nameAr: "تمارين متكرّرة بالطرف: التبادل بين اليدين والنقل والتكديس", nameEn: "Repetitive prosthetic drills: hand-to-hand transfer, relocation and stacking",
    kind: "motor_control", region: "wrist_hand",
    purpose: ["التلقائيةُ والسرعة: التمارينُ المتكرّرة مرحلةٌ من التدريب (Johnson 2014) — تبادلُ الأغراض بين اليدين في كلّ الأوضاع ولو بلا نظر، ونقلُ المكعّبات والتكديسُ بالساعة (VA/DoD 2022).",
      "Automaticity and speed: repetitive drills are a training phase (Johnson 2014) — passing objects between the hands in every position, even without looking, and moving blocks and stacking against a stopwatch (VA/DoD 2022)."],
    start: ["واقفٌ أمام طاولة عليها ملاقطُ غسيل وعمودٌ قائم، ومكعّبات، وأقماع، وساعة توقيت.", "Standing at a table with clothespins and an upright rod, blocks, cones and a stopwatch."],
    steps: [[
      "مرّر الأغراضَ بين اليدين عند الخصر، وفوق الرأس، وخلف الظهر.",
      "انقل ملاقطَ الغسيل على العمود من الأسفل إلى الأعلى.",
      "انقل المكعّباتِ فوق حاجزٍ دقيقةً واحدة (كاختبار الصندوق والمكعّبات).",
      "كدّس الأقماعَ بالساعة.",
    ], [
      "Pass objects between the hands at the waist, overhead and behind the back.",
      "Move clothespins up the vertical rod.",
      "Move blocks over a partition for one minute (as in the Box and Block test).",
      "Stack the cones against the clock.",
    ]],
    cues: [[
      "النظرُ إلى اليد الصناعية طوال الوقت ⟵ يقلّ النظرُ تدريجياً.",
      "السرعةُ قبل الدقّة ⟵ الدقّةُ أوّلاً ثمّ الساعة.",
      "الكتفُ السليمة تتعب ⟵ دورٌ أكبر لجهة الطرف.",
    ], [
      "Watching the prosthetic hand all the time → look less and less.",
      "Speed before accuracy → accuracy first, then the clock.",
      "The sound shoulder tiring → a bigger role for the prosthetic side.",
    ]],
    easier: ["المهمّةُ نفسُها مكرّرةً بالترتيب.", "The same task repeated in order."],
    harder: ["ترتيبٌ عشوائيّ، ومع مهمّةٍ ذهنية.", "Random order, with a mental task."],
    stopIf: ["ألمٌ في الكتف السليمة.", "Pain in the sound shoulder."],
    equipment: ["ملاقطُ غسيل وعمود، ومكعّبات، وأقماع، وساعةُ توقيت.", "Clothespins and a rod, blocks, cones and a stopwatch."],
    doseNote: ["١٠ دقائق في الجلسة.", "10 minutes per session."],
    images: [{ key: "prosthetic-hand-drills-1", ar: "مبتورٌ ينقل ملاقطَ غسيل على عمودٍ قائم بيده الصناعية", en: "An amputee moving clothespins on an upright rod with the prosthetic hand", search: "clothespin relocation test prosthetic hand training" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "bimanual-adl-tasks", nameAr: "المهامّ اليومية بكلتا اليدين (والعمل والقيادة)", nameEn: "Two-handed daily tasks (and work and driving)",
    kind: "functional", region: "whole_body",
    purpose: ["الطرفُ كثيراً ما يُلبس ولا يُستعمل: استعمله المبتورون في ربع المهامّ بيدٍ واحدة وثلثها بيدين (Resnik 2023) — فالتدريبُ على المهامّ التي يختارها المريض هو ما يجعله يُستعمل (VA/DoD 2022)؛ ومعظمُ السائقين يحتاجون تعديلاً واحداً في السيّارة على الأقلّ (Burger 2013).",
      "The prosthesis is often worn but little used: amputees used it in a quarter of one-handed and a third of two-handed tasks (Resnik 2023) — so training on the tasks the patient chooses is what makes it used (VA/DoD 2022); most drivers need at least one car adaptation (Burger 2013)."],
    start: ["بحسب المهمّة: المطبخ، والطاولة، والملابس، ومكانُ العمل أو السيّارة.", "Depending on the task: the kitchen, the table, clothing, the workplace or the car."],
    steps: [[
      "يختار المريضُ ٣–٥ مهامّ هدفاً (مقياسُ الوظيفة الخاصّ بالمريض PSFS) — مثل: تقطيعُ الخبز والخضار، صبُّ الشاي، حملُ المصحف أو الهاتف وتقليبُ الصفحات، الوضوء، تثبيتُ الحجاب أو الشماغ، الأزرار والأربطة، حملُ أكياس التسوّق، عدُّ النقود.",
      "حلّل كلَّ مهمّةٍ إلى خطوات.",
      "تمرّن والطرفُ مثبِّتٌ أوّلاً ثمّ يدٌ فاعلة.",
      "جرّب ثلاثَ طرقٍ واختر الأنسب.",
      "بالوقت، ثمّ مع شاغل.",
      "العملُ والقيادة: تحليلُ مهامّ العمل وتجربتُها، وأدواتٌ بمقابض سميكة، ومقبضٌ للمقود في جهة اليد السليمة.",
    ], [
      "The patient chooses 3–5 goal tasks (Patient-Specific Functional Scale) — such as cutting bread and vegetables, pouring tea, holding the Qur'an or a phone while turning pages, ablution, pinning a hijab or shemagh, buttons and laces, carrying shopping bags, counting money.",
      "Break each task into steps.",
      "Practise with the prosthesis as the stabiliser first, then as the active hand.",
      "Try three methods and choose the best.",
      "Timed, then with a distraction.",
      "Work and driving: analyse and practise the job tasks, tools with thick handles, and a steering knob on the sound side.",
    ]],
    cues: [[
      "العودةُ إلى طريقة اليد الواحدة ⟵ حدّد دورَ الطرف قبل البدء.",
      "تعويضٌ مُتعِبٌ بالجذع والكتف ⟵ مرآةٌ أو تصويرٌ بالهاتف.",
      "اليدُ الكهربائية مع آلاتٍ ثقيلةٍ تهتزّ ⟵ طرفٌ ميكانيكيّ أو أداةٌ خاصّة بالعمل، فالكهربائيُّ يتأثّر بالاهتزاز والماء والغبار (VA/DoD 2022).",
    ], [
      "Going back to one-handed methods → set the prosthesis's role before starting.",
      "Tiring compensation with the trunk and shoulder → a mirror or a phone video.",
      "A myoelectric hand with heavy vibrating machinery → a body-powered or activity-specific device; myoelectric hands are affected by vibration, water and dust (VA/DoD 2022).",
    ]],
    easier: ["مهامُّ بخطوةٍ واحدة.", "Single-step tasks."],
    harder: ["مهامُّ متعدّدةُ الخطوات كطبخ وجبة، وساعةُ عملٍ كاملة.", "Multi-step tasks such as cooking a meal, and a full working hour."],
    stopIf: ["ألمٌ في الذراع السليمة، أو تحكّمٌ غيرُ آمنٍ بأداة.", "Pain in the sound arm, or unsafe control of a tool."],
    equipment: ["أدواتُ المطبخ والبيت، وأدواتُ العمل.", "Kitchen and household items, and work tools."],
    doseNote: ["٢٠–٣٠ دقيقةً في الجلسة في المرحلة الثالثة، والمهامُّ نفسُها في البيت كلَّ يوم.", "20–30 minutes per session in phase 3, and the same tasks at home every day."],
    images: [{ key: "bimanual-adl-tasks-1", ar: "مبتورٌ يثبّت رغيفاً بيده الصناعية ويقطعه بيده السليمة", en: "An amputee holding a loaf with the prosthetic hand and cutting it with the sound hand", search: "upper limb prosthesis bimanual task cutting bread" }],
  },
];

const TIER_B_AR = "ولبتر المرفق وفوقه والكتف، ولمبتور الطرفين، ولمن يُركَّب له تحكّمٌ بالتعرّف على الأنماط أو طرفٌ متعدّد المفاصل: ٤٢ جلسة بنطاقات ١–١٢ · ١٣–٣٠ · ٣١–٤٢ (يعدّلها الأخصائيُّ في خطّة المريض).";
const TIER_B_EN = "Elbow and above-elbow, shoulder level, bilateral loss, or a pattern-recognition or multi-joint fitting: 42 sessions with ranges 1–12 · 13–30 · 31–42 (the specialist adjusts them in the patient's plan).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "upper-limb-amputation-adult",
  summary: [
    "تأهيلُ بتر الطرف العلويّ عند البالغين (Upper limb amputation rehabilitation) — بترُ جزء الكفّ أو الرسغ أو تحت المرفق (Transradial) أو المرفق أو فوقه (Transhumeral) أو الكتف، في طرفٍ أو طرفين، من التئام الجرح إلى الاستعمال اليوميّ للطرف: كهربائيّاً (Myoelectric) ومنه الذكيُّ المتعدّد القبضات، أو ميكانيكيّاً بالحزام (Body-powered). " +
    "الدليلُ رقيقٌ جدّاً: لم يجد VA/DoD 2022 دليلاً كافياً لأيّ برنامج تدريبٍ أو شدّةٍ أو نوعِ طرف، وأوصى توصيةً ضعيفة بالطرف الكهربائيّ أو الميكانيكيّ (أيّهما) وبالمرآة للألم الشبحيّ قصيرَ المدى؛ ولا مصدرَ يعطي عددَ جلسات. " +
    "ثلاثُ مراحل بنطاقات جلساتٍ ومعايير مكتوبة: ما قبل الطرف وتدريبُ إشارات العضلات، ثمّ التحكّمُ بالطرف والتمارينُ المتكرّرة، ثمّ الاستعمالُ بكلتا اليدين والعملُ والخروج. " +
    "ويتركُ الطرفَ خُمسُ البالغين إلى قرابة نصفهم (Biddiss 2007 · Salminger 2022)، وأكثرُ في البتر الأعلى — فالتدريبُ على ما يختاره المريض وراحةُ القالب أساسُ الاستمرار؛ والذراعُ السليمة والرقبةُ تُحميان من الإجهاد طوالَ العمر.",
    "Upper limb amputation rehabilitation in adults — partial hand, wrist, below-elbow (transradial), elbow or above-elbow (transhumeral), or shoulder level, one or both arms, from wound healing to daily use of the prosthesis: myoelectric (including multi-grip smart hands) or body-powered with a harness. " +
    "The evidence is very thin: VA/DoD 2022 found insufficient evidence for any training programme, intensity or prosthesis type, made a weak recommendation for a myoelectric or body-powered prosthesis (either) and for mirror therapy for short-term phantom pain, and no source gives a number of sessions. " +
    "Three phases with session ranges and written criteria: pre-prosthetic care and myo-signal training, then prosthetic control and repetitive drills, then two-handed use, work and discharge. " +
    "A fifth to almost half of adults abandon the prosthesis (Biddiss 2007 · Salminger 2022), more at higher levels — so training on what the patient chooses and a comfortable socket are what keep it in use; the sound arm and the neck are protected from overuse for life.",
  ],
  goals: [
    "• جذعٌ ملتئمٌ ثابتُ الحجم يتحمّل الضغط، ومدى المرفق والكتف محفوظ، والجذعُ يحمل وزنَ الطرف في وضع العمل.\n" +
    "• استقلالٌ بيدٍ واحدة في اللبس والأكل والحمّام والوضوء — قبل الطرف وبدونه.\n" +
    "• لمن يُركَّب له طرفٌ كهربائيّ: موقعان ثابتان للإشارة بعزلٍ وارتخاءٍ وثلاثِ درجاتٍ مضبوطة، ثمّ دقّةٌ ١١ من ١٢ في اختبار الحركات.\n" +
    "• لبسٌ وخلعٌ وحده، ولبسٌ يوميّ بلا أذىً للجلد، وقبضٌ وإفلاتٌ لأغراضٍ هشّة بلا سحق.\n" +
    "• استعمالُ الطرف في المهامّ التي اختارها المريض: AM-ULA يرتفع ٤ نقاطٍ فأكثر أو يثبت، وأهدافُ مقياس الوظيفة الخاصّ بالمريض تتحقّق.\n" +
    "• ألمٌ شبحيّ تحت السيطرة، وذراعٌ سليمةٌ ورقبةٌ بلا إجهاد، وعودةٌ إلى العمل والقيادة حين تكونان هدفاً.\n" +
    "(الحدودُ الرقمية اقتراحٌ لا دليل — يقرّرها المشرف.)",
    "• A healed residual limb of stable volume that tolerates pressure, preserved elbow and shoulder range, and a limb that holds the prosthesis weight in the working position.\n" +
    "• One-handed independence in dressing, eating, the bathroom and ablution — before and without the prosthesis.\n" +
    "• For a myoelectric fitting: two reliable signal sites with isolation, relaxation and three graded levels, then 11 of 12 on the motion-accuracy test.\n" +
    "• Independent donning and doffing, daily wear without skin damage, and grasping and releasing fragile objects without crushing them.\n" +
    "• Use of the prosthesis in the tasks the patient chose: AM-ULA up 4 points or more or plateaued, and the Patient-Specific Functional Scale goals met.\n" +
    "• Phantom pain under control, a sound arm and neck without overuse, and a return to work and driving where these are goals.\n" +
    "(The numeric limits are proposals, not evidence — the supervisor decides them.)",
  ],
  assessment: [
    "في الجلسة الأولى، وعند كلّ انتقالٍ بين المراحل، وفي الخروج:\n" +
    "• الجذع: الالتئامُ والجلدُ المرقَّع والإحساس، والندبةُ وحركتُها، ونقاطُ الألم الكهربائيّ (ورمٌ عصبيّ)، والمحيطُ عند مستويين معلَّمين.\n" +
    "• مدى الحركة: المرفقُ والساعد (تحت المرفق)، والكتفُ في جهة البتر والجهة السليمة، والرقبة — والكتفُ المتيبّسة من أقوى ما تنبّأ بترك الطرف (Wright 1995).\n" +
    "• القوّة: عضلاتُ لوح الكتف والكتف من ٥، وثباتُ الجذع بوزن الطرف المتوقَّع في وضع العمل.\n" +
    "• AM-ULA (مقياسٌ في القائمة، من ٤٠ — نشاطُ الطرف العلويّ للمبتورين): ثماني عشرةَ مهمّةً يومية، موثوقٌ عند المبتورين وأدنى تغيّرٍ حقيقيّ ٣٫٧ (Resnik 2013)، ويستجيب للتدريب (Resnik 2016)؛ يحتاج تدريبَ المقيِّم، ولمستعملي الطرف وحدهم.\n" +
    "• الألمُ الشبحيّ (مقياسٌ في القائمة، من ١٠) وألمُ الجذع والإحساسُ الشبحيّ كلٌّ وحده، كلَّ ستّ جلسات — والتغيّرُ المهمّ نحو نقطتين أو ٣٠٪.\n" +
    "• اختبارُ الصندوق والمكعّبات (Box and Block): مكعّباتٌ في دقيقة، باليد السليمة عند البدء وبالطرف بعده — وأدنى تغيّرٍ حقيقيّ عند المبتورين ٦٫٥ مكعّب (VA/DoD 2022)، ويُصنع محلّياً بقياساته المنشورة.\n" +
    "• QuickDASH بالعربية (من ١٠٠ — الأعلى أسوأ): موثوقٌ بالعربية في أمراض الذراع (Alnahdi 2021)، وعند المبتورين أدنى تغيّرٍ حقيقيّ ١٧٫٤ (Resnik 2015).\n" +
    "• مقياسُ الوظيفة الخاصّ بالمريض (PSFS): ثلاثةُ أهدافٍ من ١٠ يختارها المريض — وكان أكثرَ المقاييس استجابةً للتدريب (Resnik 2016).\n" +
    "• لمن يُركَّب له طرفٌ كهربائيّ: معاييرُ الإشارة (الموقعان، العزل، الارتخاء خلال ثانية، الدرجاتُ الثلاث، إشارةُ التبديل)، ثمّ اختبارُ الحركات الاثنتي عشرة في كلّ جلسةٍ من المرحلة الثانية.\n" +
    "• سجلُّ اللبس والاستعمال: ساعاتٌ في اليوم، وما فعله بالطرف.\n" +
    "• الإدراك، والمزاج، والضغطُ النفسيّ (VA/DoD 2022 — التوصية ١٣)، والعملُ والقيادة والبيت.\n" +
    "ولا يُستعمل أوّلاً: SHAP (يحتاج عُدّةً تجارية)، وACMC (يحتاج شهادة)، وPEQ (صُمّم لمبتور الساق).",
    "At the first session, at every phase change, and at discharge:\n" +
    "• Residual limb: healing, grafted skin and sensation, the scar and its mobility, points of electric pain (neuroma), and circumference at two marked levels.\n" +
    "• Range of motion: elbow and forearm (below the elbow), shoulder on the amputated and sound sides, and the neck — a stiff shoulder strongly predicted abandoning the prosthesis (Wright 1995).\n" +
    "• Strength: scapular and shoulder muscles out of 5, and holding the expected prosthesis weight in the working position.\n" +
    "• AM-ULA (a listed measure, out of 40 — Activities Measure for Upper Limb Amputees): 18 daily tasks, reliable in amputees with a minimal detectable change of 3.7 (Resnik 2013) and responsive to training (Resnik 2016); it needs rater training, and is for prosthesis users only.\n" +
    "• Phantom pain (a listed measure, out of 10), residual-limb pain and phantom sensation recorded separately, every six sessions — an important change is about 2 points or 30%.\n" +
    "• Box and Block test: blocks in one minute, with the sound hand at entry and with the prosthesis afterwards — the minimal detectable change in amputees is 6.5 blocks (VA/DoD 2022), and it can be built locally to its published dimensions.\n" +
    "• Arabic QuickDASH (out of 100 — higher is worse): reliable in Arabic for arm conditions (Alnahdi 2021), with a minimal detectable change of 17.4 in amputees (Resnik 2015).\n" +
    "• Patient-Specific Functional Scale (PSFS): three goals out of 10 chosen by the patient — the most responsive measure to training (Resnik 2016).\n" +
    "• For a myoelectric fitting: the signal criteria (two sites, isolation, relaxation within a second, three graded levels, the switch signal), then the 12-motion test at every phase 2 session.\n" +
    "• Wear and use log: hours a day, and what the prosthesis was used for.\n" +
    "• Cognition, mood and distress (VA/DoD 2022 — recommendation 13), work, driving and the home.\n" +
    "Not first-line: SHAP (needs a commercial kit), ACMC (needs certification), and PEQ (built for leg amputees).",
  ],
  exercises: [
    "البرنامجُ على ثلاث مراحل بالبطاقات في «البرنامج على مراحل»؛ والجلسةُ ٥٠ دقيقة نحو:\n" +
    "• ٥ دقائق: الجلدُ والجذع، والألمُ من ١٠.\n" +
    "• ١٠ دقائق: مدى الحركة والتمطيط.\n" +
    "• ١٠–١٥ دقيقة: تدريبُ الإشارات أو التحكّمُ بالطرف — فتراتٌ قصيرة لا تزيد على ١٥ دقيقة بينها راحة، فالتعبُ يُفسد التحكّم (Simon 2012).\n" +
    "• ١٠–١٥ دقيقة: التقوية — الجذعُ نحو وزن الطرف، والكتفان، والذراعُ السليمة، والظهر.\n" +
    "• ١٠ دقائق: المهامُّ اليومية بيدٍ واحدة ثمّ بكلتا اليدين.\n" +
    "• ٥ دقائق: التثقيفُ والبرنامجُ المنزليّ.\n" +
    "والطرفُ الكهربائيّ يحتاج عملاً أكثر على الإشارات في المرحلة الأولى، والميكانيكيُّ يبلغ المعاييرَ أسرع غالباً — والعددُ واحد والخروجُ بالمعيار.\n" +
    "وإن لم يجهز القالبُ في آخر المرحلة الأولى: ثلاثُ جلساتٍ في الأسبوع والبرنامجُ المنزليّ حتى يُركَّب، فلا تُصرف جلساتُ التحكّم بلا طرف. " +
    "ومستعملٌ قديم يأخذ طرفاً جديداً: جلستان أو ثلاثٌ للتقييم ثمّ المرحلةُ الثانية — فالطرفُ الجديد يُنقص الأداءَ أوّلاً ثمّ يعود بالتدريب (Dromerick 2008).\n" +
    "والمنشورُ من «جرعة» التدريب ساعات: ٦–٨ ساعاتٍ لطرفٍ بسيط عند مستعملٍ متمرّس (Godfrey 2018)، ونحو ١٨–٢٥ لطرفٍ متعدّد المفاصل (VA/DoD 2022) — والجلساتُ هنا تضع وقتَ التدريب على الطرف داخلَ هذا المدى.",
    "The programme runs in three phases with the cards under 'Programme by phase'; a 50-minute session is roughly:\n" +
    "• 5 minutes: skin and residual limb, pain out of 10.\n" +
    "• 10 minutes: range of motion and stretching.\n" +
    "• 10–15 minutes: signal training or prosthetic control — blocks of no more than 15 minutes with rests, because fatigue spoils control (Simon 2012).\n" +
    "• 10–15 minutes: strengthening — the residual limb towards prosthesis weight, both shoulders, the sound arm and the back.\n" +
    "• 10 minutes: daily tasks one-handed, then two-handed.\n" +
    "• 5 minutes: education and the home programme.\n" +
    "A myoelectric fitting needs more signal work in phase 1, and body-powered users often meet the criteria sooner — the number is the same and discharge is by criteria.\n" +
    "If the socket is not ready at the end of phase 1: three sessions a week plus the home programme until fitting, so control sessions are not spent without a prosthesis. " +
    "An experienced user receiving a new prosthesis: two or three assessment sessions, then phase 2 — a new device first lowers performance, which training restores (Dromerick 2008).\n" +
    "Published training 'doses' are in hours: 6–8 hours for a simple hand in an experienced user (Godfrey 2018), and about 18–25 for a multi-joint arm (VA/DoD 2022) — the sessions here put prosthetic training time inside that range.",
  ],
  contraindications: [
    "• جرحٌ لم يلتئم، أو التهاب، أو كسرٌ غيرُ ثابت — لا قالبَ ولا تحميلَ على الجذع.\n" +
    "• تعظّمٌ مؤلم حول الجذع أو المرفق (شائعٌ بعد الانفجار — Melcer 2011): ألمٌ وتورّمٌ ونقصُ مدىً وكتلةٌ تُحسّ ⟵ تصويرٌ وتخفيفُ القالب.\n" +
    "• ورمٌ عصبيّ مؤلم (ألمٌ كهربائيّ في نقطة، والنقرُ عليه ينشر الألم) ⟵ تخفيفُ الضغط عنه في القالب وإحالةٌ إلى الطبيب.\n" +
    "• الحرارةُ (الكمادات والأشعةُ تحت الحمراء والشمعُ والتيكار) على جلدٍ مرقَّع أو ضعيف الإحساس أو ندبةٍ حديثة، والتيكارُ فوق شظايا معدنيةٍ باقية بعد الانفجار (Houghton 2010).\n" +
    "• التحفيزُ الكهربائيّ على جرح، أو مع منظّم ضربات القلب أو مزيل الرجفان، أو على مقدّم الرقبة، أو على الصدر لبتر الكتف (Houghton 2010).\n" +
    "• أفكارُ إيذاء النفس ⟵ إحالةٌ فورية (VA/DoD 2022).",
    "• An unhealed wound, infection, or an unstable fracture — no socket and no loading of the residual limb.\n" +
    "• Painful heterotopic ossification around the limb or the elbow (common after blast — Melcer 2011): pain, swelling, lost range or a palpable mass → imaging and socket relief.\n" +
    "• A painful neuroma (electric pain at one point, with tapping spreading the pain) → relieve socket pressure over it and refer to the doctor.\n" +
    "• Heat (hot packs, infrared, wax and Tecar) over grafted or numb skin or a fresh scar, and Tecar over metal fragments retained after blast (Houghton 2010).\n" +
    "• Electrical stimulation over a wound, with a pacemaker or defibrillator, over the front of the neck, or over the chest at shoulder level (Houghton 2010).\n" +
    "• Thoughts of self-harm → immediate referral (VA/DoD 2022).",
  ],
  precautions: [
    "• الذراعُ السليمة والرقبةُ والظهر: ألمُ الكتف عند ٥٩٪ والرقبة والظهر العلويّ عند ٥٧٪ (Østlie 2011)، والنفقُ الرسغيّ شائع (Burger 2016)، وألمُ الظهر والرقبة عند أكثر مبتوري الذراع (Resnik 2021)، ولبسُ الطرف وحده لا يمنعها — فتراتُ راحة، وأدواتٌ مساعدة، وتمرينٌ مدى الحياة، والتنميلُ الليليّ في اليد يُبلَّغ.\n" +
    "• الصحّةُ النفسية: اضطرابُ ما بعد الصدمة عند ربع مبتوري الإصابة (Kearns 2019) والاكتئاب — فحصٌ عند البدء وبعده (VA/DoD 2022)، ولقاءُ مبتورٍ آخر بمستواه، ولا أصواتَ مفاجئة في القاعة.\n" +
    "• التوقّعات: الطرفُ الكهربائيّ «ليس نظاماً كاملاً — الأخطاءُ تحدث» (VA/DoD 2022)، وصورُ الأيدي الذكية على الإنترنت ترفع التوقّع؛ ولا دليلَ يفضّل نوعاً على نوع (Carey 2015)، والميكانيكيُّ أنسبُ للعمل الثقيل والغبار والماء.\n" +
    "• الإدراكُ وإصاباتُ الرأس: تحكّمٌ أبسط (وظائفُ وقبضاتٌ أقلّ) لمن يضعف انتباهُه.\n" +
    "• العراق: الحربُ أوّلُ أسباب البتر المسجّلة (Kokz 2026)؛ ومبتورو الذراع من حرب العراق وإيران بعد سبعةَ عشرَ عاماً: إحساسٌ شبحيّ ٦٤٪ وألمٌ شبحيّ ٣٢٪ (Ebrahimzadeh 2006)؛ وبترُ جزء الكفّ أكثرُ بتر الذراع المصاحب لبتر الساق بعد الانفجار (McMenemy 2023).\n" +
    "• الحرُّ والعرقُ والغبار: يغيّرون تماسَّ الأقطاب والجلد — تجفيفٌ متكرّر، وإعادةُ معايرة، وشحنٌ ليليّ للبطارية وبطاريةٌ احتياطية، ولا يُترك الطرفُ في سيّارةٍ مركونةٍ صيفاً، ويُغطّى في العواصف الترابية، ويُبعد عن ماء الوضوء.\n" +
    "• الأكلُ باليمين والاستنجاءُ باليسار عادةً: فقدُ أيٍّ منهما يُحلّ صراحةً واحتراماً مع المريض وأهله؛ والمرأةُ قد تفضّل معالِجة.\n" +
    "• الإصلاح: الأعطالُ وكلفتُها أكثرُ ما يوقف الاستعمال في البلدان محدودة الدخل (Bhaskaranand 2003) — طرفٌ احتياطيّ أو ميكانيكيٌّ بسيط حين يمكن.",
    "• The sound arm, neck and back: shoulder pain in 59% and neck and upper-back pain in 57% (Østlie 2011), carpal tunnel syndrome is common (Burger 2016), and back and neck pain affect most arm amputees (Resnik 2021); wearing a prosthesis alone does not prevent them — breaks, aids, lifelong exercise, and night-time tingling in the hand is reported.\n" +
    "• Mental health: post-traumatic stress in a quarter of traumatic amputees (Kearns 2019), and depression — screen at entry and later (VA/DoD 2022), offer a meeting with another amputee at the same level, and no sudden loud noises in the gym.\n" +
    "• Expectations: a myoelectric prosthesis 'is not a perfect system — errors happen' (VA/DoD 2022), and online images of smart hands raise expectations; no evidence favours one type (Carey 2015), and body-powered suits heavy work, dust and water.\n" +
    "• Cognition and head injury: simpler control (fewer functions and grips) for patients with weak attention.\n" +
    "• Iraq: war is the leading recorded cause of amputation (Kokz 2026); arm amputees from the Iran–Iraq war 17 years on had phantom sensation in 64% and phantom pain in 32% (Ebrahimzadeh 2006); and partial-hand loss is the commonest arm amputation accompanying a leg amputation after blast (McMenemy 2023).\n" +
    "• Heat, sweat and dust: they change electrode contact and the skin — frequent drying, recalibration, nightly battery charging with a spare, never leaving the prosthesis in a parked car in summer, covering it in dust storms, and keeping it away from ablution water.\n" +
    "• Eating is customarily with the right hand and toilet hygiene with the left: the loss of either is solved frankly and respectfully with the patient and family; a woman may prefer a female therapist.\n" +
    "• Repairs: breakdowns and their cost are the main reason for non-use in low-income settings (Bhaskaranand 2003) — a back-up or simple body-powered device where possible.",
  ],
  spw: 6, weeks: 5, minutes: 50, totalSessions: 30,
  refs: [
    { title: "VA/DoD Clinical Practice Guideline for the Management of Upper Limb Amputation Rehabilitation (version 2.0)", org: "U.S. Department of Veterans Affairs and Department of Defense", year: 2022, url: "https://www.healthquality.va.gov/guidelines/Rehab/ULA/" },
    { title: "Upper Limb Amputation Rehabilitation: from Context to Standards and Guidelines", org: "International Confederation of Amputee Associations — OneHand Project (Sheehan et al.)", year: 2024, url: "https://www.ic2a.world/documents/OneHand/Upper%20Limb%20Amputation%20Rehabhilitation.pdf" },
    { title: "Prosthetic training: upper limb", org: "Physical Medicine and Rehabilitation Clinics of North America (Johnson & Mansfield)", year: 2014, url: "https://doi.org/10.1016/j.pmr.2013.09.012" },
    { title: "Upper limb prosthesis use and abandonment: a survey of the last 25 years", org: "Prosthetics and Orthotics International (Biddiss & Chau)", year: 2007, url: "https://doi.org/10.1080/03093640600994581" },
    { title: "Current rates of prosthetic usage in upper-limb amputees - have innovations had an impact on device acceptance?", org: "Disability and Rehabilitation (Salminger et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2020.1866684" },
    { title: "Prosthesis rejection in acquired major upper-limb amputees: a population-based survey", org: "Disability and Rehabilitation: Assistive Technology (Østlie et al.)", year: 2012, url: "https://doi.org/10.3109/17483107.2011.635405" },
    { title: "Prosthesis use in adult acquired major upper-limb amputees: patterns of wear, prosthetic skills and the actual use of prostheses in activities of daily life", org: "Disability and Rehabilitation: Assistive Technology (Østlie et al.)", year: 2012, url: "https://doi.org/10.3109/17483107.2011.653296" },
    { title: "Prosthetic usage in major upper extremity amputations", org: "Journal of Hand Surgery, American volume (Wright et al.)", year: 1995, url: "https://doi.org/10.1016/s0363-5023(05)80278-3" },
    { title: "A national study of Veterans with major upper limb amputation: Survey methods, participants, and summary findings", org: "PLoS One (Resnik et al.)", year: 2019, url: "https://doi.org/10.1371/journal.pone.0213578" },
    { title: "Prosthetic rehabilitation in traumatic upper limb amputees (an Indian perspective)", org: "Archives of Orthopaedic and Trauma Surgery (Bhaskaranand et al.)", year: 2003, url: "https://doi.org/10.1007/s00402-003-0546-4" },
    { title: "Differences in myoelectric and body-powered upper-limb prostheses: Systematic literature review", org: "Journal of Rehabilitation Research and Development (Carey et al.)", year: 2015, url: "https://doi.org/10.1682/jrrd.2014.08.0192" },
    { title: "The SoftHand Pro: Functional evaluation of a novel, flexible, and robust myoelectric prosthesis", org: "PLoS One (Godfrey et al.)", year: 2018, url: "https://doi.org/10.1371/journal.pone.0205653" },
    { title: "Effect of training on upper-extremity prosthetic performance and motor learning: a single-case study", org: "Archives of Physical Medicine and Rehabilitation (Dromerick et al.)", year: 2008, url: "https://doi.org/10.1016/j.apmr.2007.09.058" },
    { title: "Responsiveness of outcome measures for upper limb prosthetic rehabilitation", org: "Prosthetics and Orthotics International (Resnik & Borgia)", year: 2016, url: "https://doi.org/10.1177/0309364614554032" },
    { title: "Patient training for functional use of pattern recognition-controlled prostheses", org: "Journal of Prosthetics and Orthotics (Simon et al.)", year: 2012, url: "https://doi.org/10.1097/jpo.0b013e3182515437" },
    { title: "Occupational therapy protocol for amputees with targeted muscle reinnervation", org: "Journal of Rehabilitation Research and Development (Stubblefield et al.)", year: 2009, url: "https://doi.org/10.1682/jrrd.2008.10.0138" },
    { title: "Myoelectric Pattern Recognition Outperforms Direct Control for Transhumeral Amputees with Targeted Muscle Reinnervation: A Randomized Clinical Trial", org: "Scientific Reports (Hargrove et al.)", year: 2017, url: "https://doi.org/10.1038/s41598-017-14386-w" },
    { title: "User Performance With a Transradial Multi-Articulating Hand Prosthesis During Pattern Recognition and Direct Control Home Use", org: "IEEE Transactions on Neural Systems and Rehabilitation Engineering (Simon et al.)", year: 2023, url: "https://doi.org/10.1109/tnsre.2022.3221558" },
    { title: "Training for users of myoelectric multigrip hand prostheses: a scoping review", org: "Prosthetics and Orthotics International (Widehammar et al.)", year: 2021, url: "https://doi.org/10.1097/pxr.0000000000000037" },
    { title: "A scoping review of the application of motor learning principles to optimize myoelectric prosthetic hand control", org: "Prosthetics and Orthotics International (Parr et al.)", year: 2022, url: "https://doi.org/10.1097/pxr.0000000000000083" },
    { title: "Changes in performance over time while learning to use a myoelectric prosthesis", org: "Journal of NeuroEngineering and Rehabilitation (Bouwsema et al.)", year: 2014, url: "https://doi.org/10.1186/1743-0003-11-16" },
    { title: "Task-Oriented Gaming for Transfer to Prosthesis Use", org: "IEEE Transactions on Neural Systems and Rehabilitation Engineering (van Dijk et al.)", year: 2016, url: "https://doi.org/10.1109/tnsre.2015.2502424" },
    { title: "Transfer of mode switching performance: from training to upper-limb prosthesis use", org: "Journal of NeuroEngineering and Rehabilitation (Heerschop et al.)", year: 2021, url: "https://doi.org/10.1186/s12984-021-00878-4" },
    { title: "Internal models of upper limb prosthesis users when grasping and lifting a fragile object with their prosthetic limb", org: "Experimental Brain Research (Lum et al.)", year: 2014, url: "https://doi.org/10.1007/s00221-014-4071-1" },
    { title: "Compensatory changes accompanying chronic forced use of the nondominant hand by unilateral amputees", org: "Journal of Neuroscience (Philip & Frey)", year: 2014, url: "https://doi.org/10.1523/jneurosci.3770-13.2014" },
    { title: "Driving ability following upper limb amputation", org: "Prosthetics and Orthotics International (Burger & Marincek)", year: 2013, url: "https://doi.org/10.1177/0309364612473500" },
    { title: "The Upper Extremity Functional Scale for Prosthesis Users (UEFS-P): subscales for one and two-handed tasks", org: "Disability and Rehabilitation (Resnik et al.)", year: 2023, url: "https://doi.org/10.1080/09638288.2022.2138572" },
    { title: "Musculoskeletal pain and overuse syndromes in adult acquired major upper-limb amputees", org: "Archives of Physical Medicine and Rehabilitation (Østlie et al.)", year: 2011, url: "https://doi.org/10.1016/j.apmr.2011.06.026" },
    { title: "A survey of overuse problems in patients with acquired or congenital upper limb deficiency", org: "Prosthetics and Orthotics International (Burger & Vidmar)", year: 2016, url: "https://doi.org/10.1177/0309364615584658" },
    { title: "The Prevalence and Impact of Back and Neck Pain in Veterans With Upper Limb Amputation", org: "American Journal of Physical Medicine and Rehabilitation (Resnik et al.)", year: 2021, url: "https://doi.org/10.1097/phm.0000000000001694" },
    { title: "A Randomized, Controlled Trial of Mirror Therapy for Upper Extremity Phantom Limb Pain in Male Amputees", org: "Frontiers in Neurology (Finn et al.)", year: 2017, url: "https://doi.org/10.3389/fneur.2017.00267" },
    { title: "Effectiveness of Mirror Therapy for Phantom Limb Pain: A Systematic Review and Meta-analysis", org: "Archives of Physical Medicine and Rehabilitation (Xie et al.)", year: 2022, url: "https://doi.org/10.1016/j.apmr.2021.07.810" },
    { title: "Effect of mirror therapy in the treatment of phantom limb pain in amputees: A systematic review of randomized placebo-controlled trials does not find any evidence of efficacy", org: "European Journal of Pain (Guémann et al.)", year: 2023, url: "https://doi.org/10.1002/ejp.2035" },
    { title: "Graded motor imagery for pathologic pain: a randomized controlled trial", org: "Neurology (Moseley)", year: 2006, url: "https://doi.org/10.1212/01.wnl.0000249112.56935.32" },
    { title: "Transcutaneous electrical nerve stimulation (TENS) for phantom pain and stump pain following amputation in adults", org: "Cochrane Database of Systematic Reviews (Johnson et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd007264.pub3" },
    { title: "Transcutaneous electrical nerve stimulation for phantom pain and stump pain in adult amputees", org: "Pain Practice (Mulvey et al.)", year: 2013, url: "https://doi.org/10.1111/j.1533-2500.2012.00593.x" },
    { title: "Targeted Muscle Reinnervation Treats Neuroma and Phantom Pain in Major Limb Amputees: A Randomized Clinical Trial", org: "Annals of Surgery (Dumanian et al.)", year: 2019, url: "https://doi.org/10.1097/sla.0000000000003088" },
    { title: "Outcomes of ultrasound-guided extracorporeal shock wave therapy for painful stump neuroma", org: "Annals of Rehabilitation Medicine (Jung et al.)", year: 2014, url: "https://doi.org/10.5535/arm.2014.38.4.523" },
    { title: "Electrophysical Agents — Contraindications and Precautions: An Evidence-Based Approach to Clinical Decision Making in Physical Therapy", org: "Physiotherapy Canada (Houghton, Nussbaum & Hoens)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "Development and evaluation of the activities measure for upper limb amputees", org: "Archives of Physical Medicine and Rehabilitation (Resnik et al.)", year: 2013, url: "https://doi.org/10.1016/j.apmr.2012.10.004" },
    { title: "Reliability, Validity, and Responsiveness of the QuickDASH in Patients With Upper Limb Amputation", org: "Archives of Physical Medicine and Rehabilitation (Resnik & Borgia)", year: 2015, url: "https://doi.org/10.1016/j.apmr.2015.03.023" },
    { title: "Validity and reliability of the Arabic quick disabilities of the arm, Shoulder and Hand (QuickDASH-Arabic)", org: "Musculoskeletal Science and Practice (Alnahdi)", year: 2021, url: "https://doi.org/10.1016/j.msksp.2021.102372" },
    { title: "Long-term follow-up of Iranian veteran upper extremity amputees from the Iran-Iraq war (1980-1988)", org: "Journal of Trauma (Ebrahimzadeh et al.)", year: 2006, url: "https://doi.org/10.1097/01.ta.0000236014.78230.77" },
    { title: "Engineering-based statistical analysis of amputation prevalence and the impact of contributing factors in 4 Iraqi cities (1980-2024)", org: "Chinese Journal of Traumatology (Kokz et al.)", year: 2026, url: "https://doi.org/10.1016/j.cjtee.2025.06.003" },
    { title: "Pattern of upper limb amputation associated with lower limb amputation: the UK military experience from Iraq and Afghanistan", org: "BMJ Military Health (McMenemy et al.)", year: 2023, url: "https://doi.org/10.1136/bmjmilitary-2021-001783" },
    { title: "Posttraumatic stress disorder symptom clusters and substance use among patients with upper limb amputations due to traumatic injury", org: "Disability and Rehabilitation (Kearns et al.)", year: 2019, url: "https://doi.org/10.1080/09638288.2018.1485180" },
    { title: "Heterotopic ossification in combat amputees from Afghanistan and Iraq wars: five case histories and results from a small series of patients", org: "Journal of Rehabilitation Research and Development (Melcer et al.)", year: 2011, url: "https://doi.org/10.1682/jrrd.2010.03.0033" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة من الجلسة — العنايةُ بالجذع ومداه وتقويتُه، والاستقلالُ بيدٍ واحدة، وتدريبُ إشارات العضلات على شاشة جهاز الإشارات (تغذيةٌ راجعة — تمرينٌ لا علاج) أو التحكّمُ بالطرف، والمهامُّ بكلتا اليدين؛ وفتراتُ التحكّم ١٠–١٥ دقيقة بينها راحة.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes of the session — residual-limb care, range and strengthening, one-handed independence, myo-signal training on the signal tester's screen (biofeedback — training, not treatment) or prosthetic control, and two-handed tasks; control blocks of 10–15 minutes with rests."],
      note: ["أساسيٌّ في كلّ جلسة — وهو وحده المستعمَل في المراحل كلّها، والإجماعُ عليه (VA/DoD 2022 · OneHand 2024)؛ لكنّ أيَّ برنامجٍ أو شدّةٍ بعينها بلا دليلٍ كافٍ (VA/DoD 2022 — التوصيتان ٤ و٦)، فالقياسُ لكلّ مريضٍ هو الذي يحكم.",
        "Core in every session — the only intervention used in every phase, with consensus behind it (VA/DoD 2022 · OneHand 2024); but no particular programme or intensity has sufficient evidence (VA/DoD 2022 — recommendations 4 and 6), so each patient's own measures decide."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Strong, comfortable", durationMin: "15–20" },
      parameters: ["لألم الجذع أو الألم الشبحيّ ٤ من ١٠ فأكثر حين يحدّ من التدريب: قطبان على موضع الألم في الجذع أو فوق مسار العصب المقطوع في العضد فيصل الإحساسُ إلى اليد الشبحيّة، أو على الذراع السليمة في الموضع المقابل — بوخزٍ قويٍّ مريح بلا انقباض.",
        "For residual-limb or phantom pain of 4/10 or more that limits training: two electrodes over the painful area of the limb or over the course of the cut nerve in the upper arm so the sensation projects into the phantom hand, or on the matching area of the sound arm — at a strong but comfortable tingling without contraction."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم)، وللألم وحده: لا تجاربَ عشوائية (Cochrane — Johnson 2015)، وتجربةٌ أوّليةٌ صغيرة خفّفت الألم (Mulvey 2013). وهو غيرُ جهاز قياس الإشارات الذي يُدرَّب عليه الطرفُ الكهربائيّ؛ ولا يوضع على موقعَي الأقطاب قبل معايرة الطرف، ولا على جرحٍ أو مقدّم الرقبة أو الصدر، ولا مع منظّم ضربات القلب (Houghton 2010).",
        "Rotating adjunct — used by the centre (Saleem), and for pain only: there are no randomised trials (Cochrane — Johnson 2015), and a small pilot reduced pain (Mulvey 2013). It is not the signal tester used to train myoelectric control; it is never placed over the electrode sites just before calibrating the prosthesis, over a wound, the front of the neck or the chest, or with a pacemaker (Houghton 2010)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض حول الجذع أو الكتف قبل التمارين — بلا حرارة، لألم الجذع.",
        "Pulsed electromagnetic field around the residual limb or shoulder before exercise — non-thermal, for residual-limb pain."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). ولم يُعثر على أيّ دراسةٍ له في بتر الطرف العلويّ؛ لا يُعطى بدل التمرين، وممنوعٌ مع منظّم ضربات القلب.",
        "Rotating adjunct — used by the centre with good results (Saleem). No study of it in upper-limb amputation was found; never instead of exercise, and contraindicated with a pacemaker."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على عضلات الكتف والرقبة المشدودة من الاستعمال الزائد (في الجهتين) قبل تمطيطها — نمطٌ سعويّ بدفءٍ خفيف؛ ولا على الجذع المرقَّع أو ضعيف الإحساس أو الندبة الحديثة.",
        "Over shoulder and neck muscles tight from overuse (either side) before stretching them — capacitive mode at gentle warmth; never over a grafted or numb residual limb or a fresh scar."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). ولم يُعثر على دراسةٍ له في هذه الفئة، وهو جهازٌ حراريّ: ممنوعٌ فوق شظايا معدنيةٍ باقية بعد الانفجار، وعلى الجلد ضعيف الإحساس (Houghton 2010).",
        "Rotating adjunct — used by the centre (Saleem). No study of it in this group was found, and it heats: contraindicated over metal fragments retained after blast and over numb skin (Houghton 2010)."] },
    { code: "wax", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "50–52", mode: "Dip-wrap", durationMin: "10–15" },
      parameters: ["لبتر جزء الكفّ وحده: غمسٌ ولفٌّ للرسغ والأصابع الباقية المتيبّسة ١٠–١٥ دقيقة قبل تمارين المدى — والجلدُ ملتئمٌ والإحساسُ سليم.",
        "For partial-hand amputation only: dip-and-wrap of the stiff wrist and remaining fingers for 10–15 minutes before range exercises — with healed skin and intact sensation."],
      note: ["مساعدٌ لبتر جزء الكفّ وحده — استعمالٌ معتاد في علاج اليد بلا دليلٍ في البتر؛ ولا على جرحٍ أو ندبةٍ حديثة أو جلدٍ مرقَّع أو ضعيف الإحساس (Houghton 2010)، ولا على الجذع في غير جزء الكفّ.",
        "Adjunct for partial-hand amputation only — routine in hand therapy, with no evidence in amputation; never over a wound, a fresh scar, grafted or numb skin (Houghton 2010), and not on the residual limb at other levels."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — اللفُّ والجوربُ الضاغط هما المعيار (VA/DoD 2022)، ولا دراسةَ للضغط الهوائيّ على جذع الذراع، والجذعُ القصير أو المخروطيّ لا يناسب الأكمام.",
        "Not used — wrapping and the shrinker are the standard (VA/DoD 2022), there is no study of pneumatic compression on the arm residual limb, and a short or conical limb does not suit the sleeves."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — جهازُ المشي الروبوتيّ لا علاقةَ له بالطرف العلويّ؛ ومن معه بترٌ في الساق أيضاً (شائعٌ بعد الانفجار) يأخذ بروتوكولَ الطرف السفليّ معه.",
        "Not used — the robotic gait trainer has nothing to do with the upper limb; a patient who also has a leg amputation (common after blast) follows the lower-limb protocol as well."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لم يُعثر على أيّ دراسةٍ له في البتر أو الألم الشبحيّ.",
        "Not used (not mentioned by Saleem) — no study of it in amputation or phantom pain was found."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا دراسةَ له في الألم الشبحيّ أو الورم العصبيّ، ولا سببَ لاستعماله هنا.",
        "Not used (not mentioned by Saleem) — no study of it for phantom pain or neuroma, and no reason to use it here."] },
    { code: "hot_pack", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم على الجذع — بلا فائدةٍ مثبتة، وخطرُ حرقٍ على الجذع المرقَّع أو ضعيف الإحساس (Houghton 2010)؛ وألمُ الرقبة أو الكتف السليمة يُعالج ببروتوكوله.",
        "Not used on the residual limb — no proven benefit and a burn risk on grafted or numb skin (Houghton 2010); neck or sound-shoulder pain is treated under its own protocol."] },
    { code: "infrared", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم للسبب نفسِه — حرارةٌ سطحية بلا فائدةٍ مثبتة على جلدٍ قد يكون مرقَّعاً أو ضعيفَ الإحساس (Houghton 2010).",
        "Not used for the same reason — superficial heat with no proven benefit on skin that may be grafted or numb (Houghton 2010)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم روتينياً — ويُنظر فيه لورمٍ عصبيٍّ مؤلم مؤكَّدٍ بالسونار على جذعٍ ملتئم بقرار الطبيب وسليم: تجربةٌ صغيرة مفتوحة (٣٠ مريضاً) بالموجات المركّزة ٠٫١٠ مللي جول/مم² و١٥٠٠ نبضة أسبوعياً × ٣ تفوّقت على التحفيز وإزالة الحساسية (Jung 2014)؛ وإعداداتُه تتبع نوعَ جهاز المركز. ويُناقش معه الحلُّ الجراحيّ (Dumanian 2019).",
        "Not used routinely — it may be considered for an ultrasound-confirmed painful neuroma on a healed limb by the doctor and Saleem: a small open trial (30 patients) of focused shockwave at 0.10 mJ/mm² and 1,500 pulses weekly × 3 beat TENS and desensitisation (Jung 2014); its settings depend on the centre's device type. Surgical options are discussed too (Dumanian 2019)."] },
  ],
  phases: [
    {
      name: ["ما قبل الطرف وتدريب إشارات العضلات", "Pre-prosthetic preparation and myo-signal training"],
      sessionFrom: 1, sessionTo: 8,
      timeframe: ["الأسبوعُ الأوّل والثاني — ولبتر فوق المرفق والكتف والطرفين والتحكّم بالأنماط الجلسات ١–١٢", "Weeks 1–2 — sessions 1–12 above the elbow, at shoulder level, bilateral or pattern recognition"],
      goals: [
        "جذعٌ ملتئمٌ يتحمّل الضغط وحجمُه ثابت، ومدى المرفق والكتف والرقبة محفوظ، والجذعُ يحمل وزنَ الطرف المتوقَّع، واستقلالٌ بيدٍ واحدة في الحياة اليومية، وألمٌ شبحيّ يديره المريض؛ ولمن يُركَّب له طرفٌ كهربائيّ موقعان للإشارة بعزلٍ وارتخاءٍ وثلاثِ درجات.",
        "A healed residual limb that tolerates pressure with a stable volume, preserved elbow, shoulder and neck range, a limb that holds the expected prosthesis weight, one-handed independence in daily life, and phantom pain the patient can manage; for a myoelectric fitting, two signal sites with isolation, relaxation and three graded levels.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• افحص جذعَك كلَّ يومٍ بالمرآة، واغسله وجفّفه جيداً، والبس الرباطَ أو الجوربَ الضاغط كلّما لم تلبس الطرف.\n" +
        "• الإحساسُ باليد المبتورة طبيعيّ، وألمُها يُعالج — أخبرنا به وسجّله من ١٠.\n" +
        "• يدُك السليمة تعمل الآن عن اثنتين: استرح كلَّ نصف ساعة من العمل بيدٍ واحدة، واستعمل الأدوات المساعدة، وأخبرنا عن أيّ تنميلٍ في الليل.\n" +
        "• الطرفُ الكهربائيّ يتعلّم من عضلاتك: تمرّن على الانقباضات من الصور كلَّ يوم بجهدٍ متوسّط لا قويّ.\n" +
        "• لا يوجد طرفٌ يعيد اليدَ كما كانت — والطرفُ الذي يُستعمل هو الطرفُ المريح الذي تدرّبتَ عليه؛ واختيارُ نوعه يكون معك.\n" +
        "• لقاءُ مبتورٍ آخر بمستواك يساعد كثيراً، والحزنُ والقلقُ بعد البتر شائعان ولهما علاج — لا تتردّد في الكلام عنهما.",
        "Key messages — in plain language:\n" +
        "• Check your residual limb every day with a mirror, wash and dry it well, and wear the wrap or shrinker whenever the prosthesis is off.\n" +
        "• Feeling the missing hand is normal, and its pain can be treated — tell us and score it out of 10.\n" +
        "• Your sound hand now does the work of two: rest every half hour of one-handed work, use aids, and tell us about any tingling at night.\n" +
        "• A myoelectric prosthesis learns from your muscles: practise the contractions from the photos every day at moderate, not hard, effort.\n" +
        "• No prosthesis gives the hand back as it was — the one that gets used is the comfortable one you have trained with, and its type is chosen with you.\n" +
        "• Meeting another amputee at your level helps a great deal, and sadness and anxiety after amputation are common and treatable — do not hesitate to talk about them.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّ ما ينطبق منها:\n" +
        "• جرحٌ مغلقٌ بلا إفراز ٧ أيّام، ويتحمّل الضغطَ القويّ والنقرَ على الجذع كلّه دقيقتين بألمٍ ٣ من ١٠ أو أقلّ.\n" +
        "• حجمٌ ثابت: المحيطُ عند مستويين معلَّمين لا يتغيّر أكثرَ من ٠٫٥ سم في ثلاثة قياساتٍ خلال أسبوع.\n" +
        "• المدى: تحت المرفق نقصُ بسط المرفق ١٥° على الأكثر وثنيُه ١٢٠° فأكثر؛ وفوق المرفق والكتف رفعُ الكتف وإبعادُه ١٢٠° فأكثر في جهة البتر؛ ودورانُ الرقبة ٦٠° لكلّ جهة.\n" +
        "• يحمل الجذعُ وزنَ الطرف المتوقَّع في وضع العمل ٣ × ٦٠ ثانية بلا ميلٍ ولا رفعٍ للكتف، وعضلاتُ لوح الكتف ٤ من ٥.\n" +
        "• للطرف الكهربائيّ: موقعان متّفقٌ عليهما مع فنّيّ الأطراف، وانقباضٌ وارتخاءٌ خلال ثانية في ١٠ من ١٠، وعزلٌ في ٨ من ١٠، وثلاثُ درجاتٍ تُمسك ٣ ثوانٍ في ٨ من ١٠، وإشارةُ التبديل صحيحة في ٨ من ١٠؛ وللتعرّف على الأنماط دقّةُ معايرةٍ ٨٥٪ فأكثر.\n" +
        "• استقلالٌ بيدٍ واحدة في الأكل واللبس والحمّام والوضوء.\n" +
        "• وصل الطرفُ أو قالبٌ تجريبيّ.\n" +
        "(الحدودُ اقتراحٌ لا دليل — والمنهجُ من VA/DoD 2022 وSimon 2012.)",
        "Moves to phase 2 when all that apply are met:\n" +
        "• Wound closed without discharge for 7 days, tolerating firm pressure and tapping over the whole limb for two minutes with pain at 3/10 or less.\n" +
        "• Stable volume: circumference at two marked levels changes by no more than 0.5 cm over three measurements in a week.\n" +
        "• Range: below the elbow, elbow extension lacking no more than 15° and flexion 120° or more; above the elbow and at shoulder level, shoulder flexion and abduction 120° or more on the amputated side; neck rotation 60° each way.\n" +
        "• The limb holds the expected prosthesis weight in the working position 3 × 60 seconds without leaning or shoulder hiking, and the scapular muscles are 4/5.\n" +
        "• For a myoelectric fitting: two sites agreed with the prosthetist, contraction and relaxation within a second in 10 of 10, isolation in 8 of 10, three graded levels held 3 seconds in 8 of 10, and the switch signal correct in 8 of 10; for pattern recognition, calibration accuracy of 85% or more.\n" +
        "• One-handed independence in eating, dressing, the bathroom and ablution.\n" +
        "• The prosthesis or a check socket has arrived.\n" +
        "(The limits are proposals, not evidence — the method is from VA/DoD 2022 and Simon 2012.)",
      ],
      notes: [
        "• ابدأ حين يسمح الجرح، واطلب من فنّيّ الأطراف قالباً تجريبياً مبكّراً (خلال ٣٠ يوماً من البتر إن أمكن) — «النافذةُ الذهبية» تقوم على سلسلةِ حالاتٍ واحدة قديمة (١٩٨٤) ووجدت دراسةٌ هندية ألّا أثرَ للتأخير (Bhaskaranand 2003)، فلا يُرفض مريضٌ تأخّر.\n" +
        "• فحصُ الإدراك والمزاج والضغط النفسيّ والألم عند البدء (VA/DoD 2022)، وعرضُ لقاء مبتورٍ آخر.\n" +
        "• تدريبُ الإشارات فتراتٌ ١٠–١٥ دقيقة بينها راحة، بجهدٍ متوسّط؛ والتدريبُ بلا مهمّةٍ حقيقية لا ينتقل إلى الطرف وحده (van Dijk 2016) — فاليدُ المثبّتةُ على الطاولة والأغراض في آخر المرحلة.\n" +
        "• لمن سيُركَّب له طرفٌ ميكانيكيّ: بطاقةُ التحكّم بالحزام بالمطّاط قبل الطرف.\n" +
        "• نوعُ الطرف يُختار مع المريض — المشاركةُ في الاختيار ارتبطت بقبوله (Biddiss 2007)؛ ولا دليلَ يفضّل الكهربائيّ على الميكانيكيّ (VA/DoD 2022).\n" +
        "• " + TIER_B_AR,
        "• Start as soon as the wound allows, and ask the prosthetist for an early check socket (within 30 days of amputation where possible) — the 'golden window' rests on one old case series (1984) and an Indian cohort found no effect of delay (Bhaskaranand 2003), so a late presenter is never refused.\n" +
        "• Screen cognition, mood, distress and pain at entry (VA/DoD 2022), and offer a meeting with another amputee.\n" +
        "• Signal training in 10–15-minute blocks with rests, at moderate effort; training without a real task does not transfer to the prosthesis on its own (van Dijk 2016) — so the table-mounted hand and objects come at the end of the phase.\n" +
        "• For a body-powered fitting: the harness-control card with a band before the prosthesis.\n" +
        "• The prosthesis type is chosen with the patient — involvement in the choice was linked to acceptance (Biddiss 2007); no evidence favours myoelectric over body-powered (VA/DoD 2022).\n" +
        "• " + TIER_B_EN,
      ],
      exercises: [
        { code: "ul-residual-skin-care" },
        { code: "ul-compression-wrap" },
        { code: "residual-limb-desensitisation",
          note: ["لجذع الذراع — ومعه بعد الالتئام ضغطٌ عميق دقيقةً أو دقيقتين فوق موقعَي الأقطاب المعلَّمين، والجلدُ نظيفٌ جافّ قبل اختبار الإشارة (VA/DoD 2022).", "For the arm residual limb — and after healing, deep pressure for a minute or two over the marked electrode sites, with the skin clean and dry before signal testing (VA/DoD 2022)."] },
        { code: "ul-distal-joint-rom" },
        { code: "ul-residual-shoulder-rom" },
        { code: "scapular-setting", sets: 2, reps: 10, hold: 10,
          note: ["أمام مرآة: اللوحان معاً، ثمّ لوحُ جهة البتر وحده — فهو ما يحرّك سلكَ الطرف الميكانيكيّ ويمنع ميلَ الجسم (VA/DoD 2022).", "In front of a mirror: both shoulder blades, then the amputated side alone — this is what pulls the body-powered cable and prevents body lean (VA/DoD 2022)."] },
        { code: "upper-trap-stretch",
          note: ["للجهتين — وفي جهة البتر تُخفض الكتفُ بالإرادة بدل مسك الكرسيّ.", "Both sides — on the amputated side the shoulder is held down actively instead of gripping the chair."] },
        { code: "ul-residual-limb-loading" },
        { code: "one-handed-adl" },
        { code: "hand-dominance-writing",
          note: ["حين فُقدت اليدُ المسيطرة.", "When the dominant hand was lost."] },
        { code: "myo-site-training",
          note: ["لمن سيُركَّب له طرفٌ كهربائيّ، ومع فنّيّ الأطراف.", "For a myoelectric fitting, with the prosthetist."] },
        { code: "myo-graded-control",
          note: ["بعد إتقان الموقعين.", "Once the two sites are mastered."] },
        { code: "pattern-recognition-training",
          note: ["لمن سيُركَّب له طرفٌ ذكيّ بالتعرّف على الأنماط — الفكرةُ والمعايرةُ على القالب التجريبيّ.", "For a pattern-recognition smart prosthesis — the concept and calibration on the check socket."] },
        { code: "body-powered-control",
          note: ["الخطوةُ الأولى وحدها بالمطّاط — لمن سيُركَّب له طرفٌ ميكانيكيّ.", "The first step only, with the band — for a body-powered fitting."] },
        { code: "ul-phantom-mirror-gmi",
          note: ["لمن ألمُه الشبحيّ ٤ من ١٠ فأكثر.", "For phantom pain of 4/10 or more."] },
        { code: "band-er", sets: 2, reps: 15,
          note: ["للذراع السليمة — وقايةٌ من الإجهاد قبل أن يبدأ، بمطّاطٍ خفيف وبلا تعب.", "For the sound arm — preventing overuse before it starts, with a light band and without fatigue."] },
      ],
    },
    {
      name: ["التحكم بالطرف والتمارين المتكررة", "Prosthetic control and repetitive drills"],
      sessionFrom: 9, sessionTo: 20,
      timeframe: ["نحو الأسبوعين الثاني والثالث — ولبتر فوق المرفق والكتف والطرفين الجلسات ١٣–٣٠", "About weeks 2–3 — sessions 13–30 above the elbow, at shoulder level or bilateral"],
      goals: [
        "لبسٌ وخلعٌ وحده، ولبسٌ يوميّ يزيد بلا أذىً للجلد، وتحكّمٌ دقيقٌ في الأوضاع كلّها (١١ من ١٢ في اختبار الحركات للكهربائيّ، أو الفتحُ الكامل في مدى العمل للميكانيكيّ)، وقبضٌ وإفلاتٌ لأغراضٍ متدرّجة بلا سحقٍ ولا سقوط، وسرعةٌ في التمارين المتكرّرة.",
        "Independent donning and doffing, daily wear increasing without skin damage, accurate control in every position (11 of 12 on the motion test for myoelectric, or full opening across the working range for body-powered), grasping and releasing graded objects without crushing or dropping them, and speed in repetitive drills.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• البس الطرفَ ساعةً أو ساعتين أوّلاً، وزِد نحو ساعةٍ كلَّ بضعة أيّام، وافحص الجلدَ بعد كلّ خلع (VA/DoD 2022).\n" +
        "• افحص الحركاتِ كلَّها بعد كلّ لبس؛ وإن ضعف التحكّم: جفّف الجلدَ وأعِد اللبس، ثمّ أعِد المعايرةَ إن كانت.\n" +
        "• الطرفُ الكهربائيّ «ليس نظاماً كاملاً — الأخطاءُ تحدث»: لا تمسك به ما يؤذي إن انفتحت اليد، ولا آلةً ثقيلةً بلا طريقة إفلات.\n" +
        "• البطارية تُشحن كلَّ ليلة، والطرفُ بعيدٌ عن الماء والغبار والحرّ الشديد، ولا يُترك في سيّارةٍ مركونة.\n" +
        "• سجّل كلَّ يوم: كم ساعةً لبسته، وماذا فعلت به.",
        "Key messages — in plain language:\n" +
        "• Wear the prosthesis for one or two hours at first, add about an hour every few days, and check the skin after every removal (VA/DoD 2022).\n" +
        "• Check every movement after each donning; if control weakens: dry the skin and put it on again, then recalibrate if that applies.\n" +
        "• A myoelectric prosthesis 'is not a perfect system — errors happen': do not hold anything with it that would cause harm if the hand opened, or heavy machinery without a way to let go.\n" +
        "• Charge the battery every night, keep the prosthesis away from water, dust and great heat, and never leave it in a parked car.\n" +
        "• Log every day: how many hours you wore it, and what you did with it.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّ ما ينطبق منها:\n" +
        "• يلبس الطرفَ ويخلعه وحده خلال دقيقتين (أربعٍ لفوق المرفق أو الحزام، ولمبتور الطرفين بحامل اللبس).\n" +
        "• يلبسه ٤ ساعاتٍ يومياً فأكثر خمسةَ أيّامٍ متتالية بلا أذىً للجلد، والاحمرارُ يزول خلال ٢٠ دقيقة من الخلع.\n" +
        "• في جلستين متتاليتين: ١١ من ١٢ في اختبار الحركات (للكهربائيّ بدوران الرسغ؛ وبلا دورانٍ ١٢ أمرَ فتحٍ وإغلاقٍ كاملٍ وجزئيّ)، أو للميكانيكيّ فتحٌ كاملٌ في ٤ من ٥ أوضاع (الفم، منتصفُ الطاولة، الحضن أو الحذاء، مستوى الكتف، الجانب).\n" +
        "• ٩ من ١٠ أغراضٍ من مجموعة القبض المتدرّج تُقبض وتُنقل ٣٠ سم وتُفلت بلا سقوطٍ ولا سحق، ومنها المكعّبُ الإسفنجيّ والكوبُ الورقيّ المملوء.\n" +
        "• الصندوقُ والمكعّبات بالطرف ٧ مكعّباتٍ فأكثر فوق أوّل قياسٍ بالطرف (أدنى تغيّرٍ حقيقيّ ٦٫٥ — VA/DoD 2022).\n" +
        "• لليد المتعدّدة القبضات: القبضةُ الصحيحة من أوّل محاولة لـ ٤ من ٥ أغراض.\n" +
        "(الحدودُ اقتراحٌ لا دليل.)",
        "Moves to phase 3 when all that apply are met:\n" +
        "• Puts the prosthesis on and off alone within two minutes (four above the elbow or with a harness; with a donning stand for bilateral amputees).\n" +
        "• Wears it 4 hours a day or more for five days in a row without skin damage, with redness fading within 20 minutes of removal.\n" +
        "• In two consecutive sessions: 11 of 12 on the motion test (myoelectric with wrist rotation; without rotation, 12 full and partial open–close commands), or for body-powered, full opening in 4 of 5 positions (mouth, table midline, lap or shoe, shoulder height, side).\n" +
        "• 9 of 10 objects from the graded grasp set grasped, carried 30 cm and released without dropping or crushing, including the foam cube and the filled paper cup.\n" +
        "• Box and Block with the prosthesis 7 or more blocks above the first prosthetic score (minimal detectable change 6.5 — VA/DoD 2022).\n" +
        "• For a multi-grip hand: the right grip on the first attempt for 4 of 5 objects.\n" +
        "(The limits are proposals, not evidence.)",
      ],
      notes: [
        "• التحكّمُ أوّلاً ثمّ التمارينُ المتكرّرة ثمّ المهامّ — المراحلُ الثلاث للتدريب على الطرف (Johnson 2014).\n" +
        "• حركةٌ جديدة لا تُضاف قبل الثقة بالسابقة، والتعبُ يُفسد التحكّم (Simon 2012)؛ وضبطُ قوّة القبض يحتاج وقتاً أطول من الوضع (Bouwsema 2014).\n" +
        "• اليدُ تنفتح حين يُرفع الذراع ⟵ مع فنّيّ الأطراف (الحسّاسية والحدّ)، لا بجهدٍ أكبر من المريض.\n" +
        "• التدريبُ الكافي ارتبط بالاستعمال الفعليّ (Østlie 2012) — وأكثرُ ما يُترك الطرفُ له عدمُ الراحة والوزن (Salminger 2022): أيُّ شكوى من القالب تُحال إلى فنّيّ الأطراف قبل أن تصير تركاً.\n" +
        "• سجّل اختبارَ الحركات في كلّ جلسة، والصندوقَ والمكعّبات وAM-ULA في أوّل جلسةٍ بالطرف وعند الانتقال.",
        "• Control first, then repetitive drills, then tasks — the three stages of prosthetic training (Johnson 2014).\n" +
        "• No new movement until the previous one is confident, and fatigue spoils control (Simon 2012); grip-force control takes longer than positioning (Bouwsema 2014).\n" +
        "• The hand opening when the arm is raised → for the prosthetist (gain and threshold), not more effort from the patient.\n" +
        "• Sufficient training was linked to actual use (Østlie 2012) — and discomfort and weight are the commonest reasons for abandonment (Salminger 2022): any socket complaint goes to the prosthetist before it becomes abandonment.\n" +
        "• Record the motion test every session, and Box and Block and AM-ULA at the first prosthetic session and at the phase change.",
      ],
      exercises: [
        { code: "ul-prosthesis-donning" },
        { code: "myo-control-accuracy",
          note: ["للطرف الكهربائيّ.", "For a myoelectric prosthesis."] },
        { code: "body-powered-control",
          note: ["للطرف الميكانيكيّ — بالطرف في مدى العمل كلّه.", "For a body-powered prosthesis — with the prosthesis across the whole working range."] },
        { code: "pattern-recognition-training",
          note: ["إعادةُ المعايرة على الطرف نفسِه، وحركةٌ جديدة بعد الثقة بالسابقة.", "Recalibration on the prosthesis itself, adding a movement once the previous one is confident."] },
        { code: "multigrip-selection",
          note: ["لليد المتعدّدة القبضات.", "For a multi-grip hand."] },
        { code: "graded-object-grasp" },
        { code: "prosthetic-hand-drills" },
        { code: "ul-residual-limb-loading", sets: 3, reps: 12,
          note: ["بالطرف ملبوساً أو بثقلٍ يعادله، وثباتٌ أطول في وضع العمل.", "With the prosthesis on or an equal weight, and longer holds in the working position."] },
        { code: "ul-residual-skin-care",
          note: ["بعد كلّ خلع، وسجلُّ ساعات اللبس والاستعمال يومياً.", "After every removal, with the daily log of wear and use."] },
        { code: "doorway-pec-stretch",
          note: ["للجهتين — والجذعُ على إطار الباب في جهة البتر؛ فالجلوسُ والعملُ بيدٍ واحدة يقصّران عضلةَ الصدر.", "Both sides — with the residual limb on the door frame on the amputated side; sitting and one-handed work shorten the chest muscle."] },
        { code: "thoracic-extension-towel",
          note: ["والذراعان متقاطعتان على الصدر إن تعذّر سندُ الرأس باليدين — لوضعية الظهر والرقبة.", "With the arms crossed on the chest if the head cannot be supported with both hands — for back and neck posture."] },
        { code: "scaption-raise", sets: 2, reps: 15,
          note: ["للذراع السليمة بثقلٍ خفيف — وقايةٌ من الإجهاد.", "For the sound arm with a light weight — preventing overuse."] },
        { code: "stationary-cycling",
          note: ["لياقةٌ هوائية بلا قبضٍ بجهة البتر: جلسةٌ منتصبة، ١٠–٢٠ دقيقةً بجهدٍ متوسّط — فاستعمالُ الطرف يزيد الجهد (VA/DoD 2022).", "Aerobic fitness without gripping on the amputated side: an upright seat, 10–20 minutes at moderate effort — using a prosthesis raises energy demand (VA/DoD 2022)."] },
      ],
    },
    {
      name: ["الاستعمال بكلتا اليدين والعمل والخروج", "Two-handed use, work and discharge"],
      sessionFrom: 21, sessionTo: 30,
      timeframe: ["نحو الأسبوعين الرابع والخامس — ولبتر فوق المرفق والكتف والطرفين الجلسات ٣١–٤٢", "About weeks 4–5 — sessions 31–42 above the elbow, at shoulder level or bilateral"],
      goals: [
        "استعمالُ الطرف في المهامّ التي اختارها المريض (البيت والعمل والقيادة)، وAM-ULA يرتفع ٤ نقاطٍ فأكثر أو يثبت، ولبسٌ يوميّ يوافق أهدافَه، والعنايةُ بالطرف وحده، وبرنامجُ وقايةٍ للذراع السليمة والرقبة مدى الحياة.",
        "Use of the prosthesis in the tasks the patient chose (home, work and driving), AM-ULA up 4 points or more or plateaued, daily wear that matches the patient's goals, independent prosthesis care, and a lifelong prevention programme for the sound arm and neck.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• الطرفُ يُستعمل، لا يُلبس فقط: اجعله يمسك ويثبّت في كلّ مهمّةٍ بكلتا اليدين.\n" +
        "• تمارينُ الذراع السليمة والرقبة ثلاثَ مرّاتٍ في الأسبوع مدى الحياة، والراحةُ كلَّ نصف ساعة من العمل بيد.\n" +
        "• عُد إلينا عند: احمرارٍ أو جرحٍ في الجذع، أو ألمٍ جديد في الذراع السليمة أو الرقبة، أو تنميلٍ في الليل، أو تحكّمٍ ضعف، أو تركٍ للطرف.\n" +
        "• المراجعةُ بعد ٣ و٦ أشهر ثمّ كلَّ سنة على الأقلّ — لبستَ الطرفَ أو لم تلبسه (VA/DoD 2022).\n" +
        "• العملُ الثقيل والغبارُ والماء: طرفٌ ميكانيكيّ أو أداةٌ خاصّة بالعمل أنسبُ من اليد الكهربائية.",
        "Key messages — in plain language:\n" +
        "• The prosthesis is for using, not just wearing: let it hold and steady things in every two-handed task.\n" +
        "• Sound-arm and neck exercises three times a week for life, and a break every half hour of one-handed work.\n" +
        "• Come back for: redness or a wound on the limb, new pain in the sound arm or neck, tingling at night, control getting worse, or giving up the prosthesis.\n" +
        "• Reviews at 3 and 6 months, then at least yearly — whether or not you wear the prosthesis (VA/DoD 2022).\n" +
        "• Heavy work, dust and water: a body-powered or work-specific device suits better than the myoelectric hand.",
      ],
      criteria: [
        "الخروجُ من البرنامج حين:\n" +
        "• يرتفع AM-ULA ٤ نقاطٍ فأكثر عن أوّل قياسٍ بالطرف (أدنى تغيّرٍ حقيقيّ ٣٫٧ — Resnik 2013)، أو يثبت (أقلّ من ٤) في قياسين بينهما أسبوع.\n" +
        "• كلُّ هدفٍ من أهداف مقياس الوظيفة الخاصّ يرتفع نقطتين أو يبلغ ٧ من ١٠.\n" +
        "• يعتني بالطرف وحده (البطارية، والقفّاز والقالب، والسلكُ والحزام) ويفحص جلدَه بالمرآة، ويشرحه للمعالج.\n" +
        "• نمطُ اللبس والاستعمال يوافق أهدافَه (السجلّ) — ولمن هدفُه الاستعمالُ اليوميّ ٦ ساعاتٍ فأكثر خمسةَ أيّامٍ في الأسبوع.\n" +
        "• خطّةُ العمل والقيادة مكتوبةٌ حين تكونان هدفاً.\n" +
        "• يؤدّي برنامجَ الوقاية، وألمُ الذراع السليمة لا يزيد نقطتين على أوّل قياس.\n" +
        "(الحدودُ اقتراحٌ لا دليل.)",
        "Discharge from the programme when:\n" +
        "• AM-ULA rises 4 points or more above the first prosthetic score (minimal detectable change 3.7 — Resnik 2013), or plateaus (less than 4) on two tests a week apart.\n" +
        "• Each Patient-Specific Functional Scale goal rises 2 points or reaches 7 of 10.\n" +
        "• Cares for the prosthesis alone (battery, glove and socket, cable and harness) and checks the skin with a mirror, explaining it back to the therapist.\n" +
        "• The wear and use pattern matches the patient's goals (log) — for daily use, 6 hours or more on five days a week.\n" +
        "• A written work and driving plan where these are goals.\n" +
        "• Does the prevention programme, with sound-arm pain no more than 2 points above the first score.\n" +
        "(The limits are proposals, not evidence.)",
      ],
      notes: [
        "• العددُ (٣٠، و٤٢ للمستويات العليا والطرفين والأنماط) اختيارُ خدمةٍ لا دليل — يضع وقتَ التدريب على الطرف داخل الساعات المنشورة (Godfrey 2018 · VA/DoD 2022)؛ والخروجُ بالمعيار.\n" +
        "• المهامُّ من اختيار المريض، وثلاثُ طرقٍ لكلّ مهمّة، والطرفُ مثبِّتٌ قبل أن يكون يداً فاعلة (VA/DoD 2022).\n" +
        "• العملُ: تحليلُ المهامّ والأدوات، وتجربةُ أداةٍ خاصّة بالعمل؛ والقيادة: تعديلٌ في السيّارة وتقييمٌ عمليّ قبل العودة (Burger 2013).\n" +
        "• في الخروج: AM-ULA والصندوقُ والمكعّبات وQuickDASH ومقياسُ الوظيفة الخاصّ والألمُ الشبحيّ، وموعدُ المتابعة بعد ٣ و٦ أشهر ثمّ سنوياً، ومراجعةُ فنّيّ الأطراف كلَّ سنةٍ أو سنتين.",
        "• The number (30, and 42 for higher levels, bilateral and pattern recognition) is a service choice, not evidence — it puts prosthetic training time inside the published hours (Godfrey 2018 · VA/DoD 2022); discharge is by criteria.\n" +
        "• Tasks are chosen by the patient, with three methods per task, and the prosthesis as the stabiliser before it is the active hand (VA/DoD 2022).\n" +
        "• Work: task and tool analysis, and trying a work-specific device; driving: car adaptations and a practical assessment before returning (Burger 2013).\n" +
        "• At discharge: AM-ULA, Box and Block, QuickDASH, the Patient-Specific Functional Scale and phantom pain, follow-up at 3 and 6 months then yearly, and a prosthetist review every one to two years.",
      ],
      exercises: [
        { code: "bimanual-adl-tasks" },
        { code: "graded-object-grasp",
          note: ["الأصعب: صغيرٌ هشّ، ومن الرفّ والأرض، وبالوقت.", "The harder end: small and fragile, from the shelf and floor, timed."] },
        { code: "prosthetic-hand-drills",
          note: ["ترتيبٌ عشوائيّ ومع مهمّةٍ ذهنية، وبلا نظرٍ إلى اليد.", "Random order with a mental task, without looking at the hand."] },
        { code: "multigrip-selection",
          note: ["عشوائياً وبالوقت.", "Random and timed."] },
        { code: "band-er", sets: 3, reps: 15,
          note: ["للذراع السليمة — ثلاثَ مرّاتٍ في الأسبوع مدى الحياة.", "For the sound arm — three times a week for life."] },
        { code: "scaption-raise", sets: 3, reps: 15,
          note: ["للذراع السليمة — ثلاثَ مرّاتٍ في الأسبوع مدى الحياة.", "For the sound arm — three times a week for life."] },
        { code: "thoracic-extension-towel" },
        { code: "stationary-cycling",
          note: ["٢٠–٣٠ دقيقة، ثلاثاً إلى خمسٍ في الأسبوع؛ ولا تمرينَ خارجيّاً في ظهيرة الصيف.", "20–30 minutes, three to five times a week; no outdoor exercise at midday in summer."] },
      ],
    },
  ],
};

export const name = "137_physio_upper_limb_amputation_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
