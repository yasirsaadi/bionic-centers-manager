// Migration 177: التهابُ المفاصل اليفعيّ مجهولُ السبب — البروتوكولُ الثامن والثلاثون مفصَّلاً (§4.fh — ٢٠٢٦-١٠-٢٤).
//
// بمعيار المالك «تبعا لشيوع حالاته في العراق» اختار المساعدُ «التهابَ المفاصل اليفعيّ» (`jia-pediatric`) مع بروتوكولَي الأطفال الآخرَين: لا مسحَ سكّانيّاً عراقيّاً
// (بحثٌ صفريّ)، والأطفالُ يصلون مراكزَ التأهيل — ففي البصرة عولج ٥٢ طفلاً في مركز تأهيل المعوّقين (Naser 2019)، وفي مستشفيي الرصافة والكاظمية التعليميّين ٦٦ طفلاً
// متعدّدُ المفاصل ٢٩ منهم (Al-Obaidi 2023)، وفي الديوانية بقي ٧٤٪ من ٥٠ طفلاً في مرضٍ نشط وأكثرُ عوائق الدواء انقطاعُه ونفادُه (Almansi 2025)؛ وفي المنطقة الانتشارُ
// السكّانيّ ٣٫٤٣ لكلّ مئة ألف في الشرقية بمصر (Abou El-Soud 2013) و٢٠ في عُمان (Abdwani 2015)، وفرقُ طول الساقين عند ٢٤٫٣٪ من قليل المفاصل في السعودية (Moued 2013)،
// والبلدُ الأفقر أكثرُ ضرراً والضررُ يصحب تأخّرَ الإحالة (Consolaro 2019). بالقالب كاملاً (§4.dd): ٢٤ جلسة × ثلاثٍ في الأسبوع × ٤٥ دقيقة (ثمانيةُ أسابيع) والأهلُ
// يؤدّون البرنامجَ المنزليّ ٣–٤ أيّامٍ أخرى — فأكثرُ التجارب ثلاثٌ في الأسبوع ١٢–٢٨ أسبوعاً (Iversen 2022)، ولا تجربةَ قارنت العدد ولا جرّبت كتلةً يومية أربعةَ أسابيع
// للأطفال — وخيارٌ يوميّ أوّلاً بعد نوبةٍ أو حقنٍ أو تيبّسٍ جديد (١٢ في أسبوعين — Epps 2005، ثمّ ١٢ بمرّةٍ أو مرّتين حتى الأسبوع ١٢ — Tarakci 2012)، ومسارٌ خفيف
// ٦–١٢ جلسة، وتمديدٌ واحد باثنتي عشرة بمعيارٍ مكتوب، ثمّ البيتُ ومراجعةٌ كلَّ ٣–٤ أشهر مع طبيب المفاصل (Davies 2010)؛ وطولُ الجلسة بالعمر لقرار سليم؛ وثلاثُ مراحل
// بنطاقات (١–٦ التقييمُ والتعليمُ والمساند · ٧–١٨ التدريبُ المتدرّج · ١٩–٢٤ المشاركةُ في المدرسة واللعب والصلاة) بمعايير الفرق المهمّ (الوظيفةُ −٠٫١٣ — Dempster 2001،
// والألمُ −١٠ ملم — Powell 2001، والمشيُ ستّ دقائق +٦٥ متراً — Pritchard 2022)؛ وقاعدةُ الجلسة (المفصلُ النشط والألمُ حتى ٣ من ١٠ والحقن)؛ وقواعدُ إحالة (المرضُ الجهازيّ
// وتنشّطُ البلعميات، والمفصلُ الجرثوميّ، والحمّى على الدواء الحيويّ، والعينُ الحمراء وجدولُ فحص العين، والرقبة، وما يشبه سرطانَ الدم، والفكّ، وطولُ الساقين)؛ وعشرُ
// بطاقاتٍ جديدة والمعادةُ برمزها؛ والأجهزةُ الخمسةَ عشرَ: التمرينُ أساسيّ، والكمادةُ والشمعُ لمفصلٍ متيبّسٍ غيرِ حارّ ولطفلٍ يقول «حارّ» وحده، والتيّارُ المتداخل مساعدٌ
// لقرار سليم، والليزرُ «لا يُستخدم» إلّا إن سمح به سليمٌ للمراهق قربَ اكتمال النموّ، والأمواجُ والموجاتُ الصادمة «لا يُستخدم» فوق صفيحة النموّ — فلا إعداداتٍ تمنع اعتمادَه؛
// والمساندُ إحالةٌ إلى قسم المساند في المركز؛ وبنودُ «اضغطه يا سليم» بأداة `checklistSql`. كلُّه مسوّدة حتى يعتمده سليم.
//
// ما يخصّ هذا المرض: الإرشادان الأمريكيّان للعلاج (Ringold 2019 · Onel 2022a · Onel 2022b) وللعين (Angeles-Han 2019)، والأوروبيُّ للمرض الجهازيّ (Fautrel 2024)،
// ولجنةُ أوتاوا للنشاط (Cavallo 2017)، والكنديُّ للرياضة (Philpott 2010)، وإجماعُ الفكّ (Stoustrup 2023)، ومعاييرُ الرعاية البريطانية (Davies 2010)، وإرشادُ الأجهزة
// الكنديّ (Houghton 2010)؛ والجرعة: كوكرين بلا نفعٍ دالّ ولا ضرر (Takken 2008)، ثمّ الوظيفةُ −٠٫٤١ والمشيُ +٢٦٫٧ متراً (Tong 2026). وما يخصّ العراق: انقطاعُ الدواء
// والكلفةُ والطريق، والمدرسة، والصلاةُ والجلوسُ على الأرض والمرحاضُ العربيّ (Madi 2004)، والحرّ، ورمضانُ للمراهق، والأهلُ يعطون أكثرَ الجرعة.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC ومع Crossref (٢٣٤ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ مولَّداً من الجدول، ولا مرجعَ قبل ١٩٩٠)،
// والإرشاداتُ من نصوصها. القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

// البطاقاتُ الجديدة — عشرٌ لالتهاب المفاصل اليفعيّ، بصيغة المخاطبة العامّة للطفل وأهله؛ والمعادةُ تُربط برمزها وصورتها، وما يخصّ هذا المرض في ملاحظة المرحلة.
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "jia-jaw-mobility-home", nameAr: "تمارينُ الفكّ (مفصل الفكّ الصدغيّ) في البيت", nameEn: "Jaw (temporomandibular joint) exercises at home",
    kind: "mobility", region: "face", sets: 1, reps: 10, hold: 5,
    purpose: ["مفصلُ الفكّ مصابٌ عند ٣٩–٧٨٪ من الأطفال بهذا المرض (Ferrillo 2025)، واضطرابُه عند ٣٩٫٨٪ مقابل ١١٫٣٪ من أقرانهم وفتحُ الفم ٤٦٫٢ مقابل ٤٩٫٠ ملم (Fischer 2020)، وكثيراً ما يكون بلا شكوى فيُفحص في كلّ زيارة (Stoustrup 2017 · Stoustrup 2023). وفي دراسةٍ بلا مجموعةٍ ضابطة عند ١٢ مريضاً: علاجٌ طبيعيّ أسبوعيّ ثمانيةَ أسابيع مع تمارين البيت أنقص ألمَ الفكّ من ٥٣٫٨ إلى ٣٢٫٥ ملم وزاد فتحَ الفم بلا ألم من ٣٦٫٠ إلى ٤٣٫٠ ملم (Vassis 2023)؛ والإجماع: العلاجُ الطبيعيّ قد ينفع وهو آمنٌ يُرجَع عنه، ولا بياناتَ له في هذا المرض، فالتمارينُ مأخوذةٌ من اضطرابات الفكّ الأخرى (Stoustrup 2023).",
      "The jaw joint is involved in 39–78% of children with this disease (Ferrillo 2025), jaw-joint disorder affects 39.8% against 11.3% of peers and mouth opening is 46.2 against 49.0 mm (Fischer 2020), and it is often silent, so it is examined at every visit (Stoustrup 2017 · Stoustrup 2023). In an uncontrolled study of 12 patients, weekly physiotherapy for eight weeks with home exercises reduced jaw pain from 53.8 to 32.5 mm and raised pain-free mouth opening from 36.0 to 43.0 mm (Vassis 2023); the consensus: physiotherapy may help and is safe and reversible, but there are no data for it in this disease, so the exercises are taken from other jaw-joint disorders (Stoustrup 2023)."],
    start: ["جالساً مستقيماً أمام مرآة والظهرُ مسنود، واللسانُ مستريحٌ على سقف الفم خلف الأسنان الأمامية العليا.", "Sitting upright in front of a mirror with the back supported, the tongue resting on the roof of the mouth behind the upper front teeth."],
    steps: [[
      "أرخِ الوجهَ والفكّ: الشفتان مطبقتان والأسنانُ متباعدة، وتنفّس ببطء.",
      "افتح الفمَ ببطء في خطٍّ مستقيم والفكُّ في منتصف المرآة حتى أوّل انزعاج، واثبت ٥ ثوانٍ، ثمّ أغلق.",
      "حرّك الفكَّ السفليّ إلى الأمام بلطف، واثبت ٥ ثوانٍ.",
      "حرّكه إلى كلّ جانب بلطف، واثبت ٥ ثوانٍ لكلّ جانب.",
      "اختم بتمطيطٍ لطيف لأعلى الكتف وجانب الرقبة — لمن لم تُصَب رقبتُه وحده.",
      "مرّةً في الأسبوع: قِس الفتحةَ بين الأسنان الأمامية العليا والسفلى بالمسطرة، واكتبها في السجلّ مع الأهل.",
    ], [
      "Relax the face and jaw: lips together and teeth apart, breathing slowly.",
      "Open the mouth slowly in a straight line, keeping the jaw centred in the mirror, to the first discomfort, hold for 5 seconds, then close.",
      "Move the lower jaw gently forward, and hold for 5 seconds.",
      "Move it gently to each side, and hold for 5 seconds on each side.",
      "Finish with a gentle stretch of the top of the shoulder and the side of the neck — only if the neck is not involved.",
      "Once a week: measure the gap between the upper and lower front teeth with a ruler, and write it in the diary with the family.",
    ]],
    cues: [[
      "فتحٌ سريع أو بانحراف الفكّ إلى جهة ⟵ «ببطءٍ وفي خطٍّ مستقيم» أمام المرآة.",
      "الفتحُ بالقوّة حتى الطقطقة ⟵ حتى أوّل انزعاج، بلا طقطقةٍ ولا دفع.",
      "شدُّ الأسنان والتوتّر ⟵ الشفتان مطبقتان والأسنانُ متباعدة.",
      "تمطيطُ الرقبة لكلّ طفل ⟵ لمن لم تُصَب رقبتُه وحده.",
    ], [
      "Opening fast or with the jaw drifting to one side → 'slowly and in a straight line' in the mirror.",
      "Forcing the mouth open until it clicks → to the first discomfort, without clicking or pushing.",
      "Clenching the teeth and tensing → lips together and teeth apart.",
      "A neck stretch for every child → only for a child whose neck is not involved.",
    ]],
    easier: ["مدىً أصغر وتكرارٌ أقلّ، وأحدُ الوالدين يعدّ معه.", "A smaller range and fewer repetitions, with a parent counting along."],
    harder: ["ثباتٌ أطول بمقاومةٍ خفيفة من الإصبع؛ والفتحُ بمساعدة اليد بنصيحة الأخصائيّ وحدها.", "A longer hold against light finger resistance; assisted opening with the hand only on the specialist's advice."],
    stopIf: ["ألمٌ حادّ في الفكّ، أو قفلٌ لا يفتح أو لا يغلق، أو تورّمٌ جديد أمام الأذن ⟵ توقّف، وإلى طبيب المفاصل وطبيب تقويم الأسنان (Stoustrup 2023).", "Sharp jaw pain, locking open or closed, or new swelling in front of the ear → stop, and to the rheumatologist and the orthodontist (Stoustrup 2023)."],
    equipment: ["مرآة، ومسطرةٌ بالملّيمتر، وسجلٌّ منزليّ.", "A mirror, a millimetre ruler, and a home diary."],
    doseNote: ["٥–١٠ مرّات لكلّ حركة × ١–٢ في اليوم في البيت (اقتراح)؛ والدراسةُ وصفت تمارينَ البيت بين ثماني زياراتٍ أسبوعية (Vassis 2023).", "5–10 repetitions of each movement × 1–2 times a day at home (a proposal); the study prescribed home exercises between eight weekly visits (Vassis 2023)."],
    images: [{ key: "jia-jaw-mobility-home-1", ar: "رسمٌ لفتاةٍ نحو الثانية عشرة جالسةٍ أمام مرآة، إصبعٌ على كلّ مفصل فكٍّ أمام الأذن والفمُ مفتوحٌ قليلاً، ومسطرةٌ على الطاولة", en: "Drawing of a girl of about twelve sitting in front of a mirror, one finger on each jaw joint in front of the ear and the mouth slightly open, with a ruler on the table", search: "jaw TMJ exercise child mirror mouth opening ruler" }],
  },
  {
    code: "jia-play-rom-morning-routine", nameAr: "روتينُ الصباح للتيبّس باللعب", nameEn: "Morning stiffness routine through play",
    kind: "mobility", region: "whole_body", sets: 1, reps: 5,
    purpose: ["حفظُ مدى الحركة وتخفيفُ تيبّس الصباح: تمارينُ المدى جزءٌ من البرامج المنزلية التي نفعت — يومٌ في المستشفى وثلاثةُ أيّامٍ بإشراف الأهل اثني عشرَ أسبوعاً حسّنت الوظيفةَ والمشيَ ستّ دقائق وجودةَ الحياة (Tarakci 2012)، والمشيُ الهوائيّ مع المدى ثمانيةَ أسابيع حسّن الوظيفةَ من ٠٫٧٧ إلى ٠٫٢٠ (Dogru Apti 2014)؛ والطفلُ الصغير يحتاج الحركةَ لنموّه النفسيّ والاجتماعيّ (Hafner 1998)، والإرشادُ يوصي بالعلاج الطبيعيّ لحفظ المدى خاصّةً مع التيبّس (Onel 2022b).",
      "Keeping range of motion and easing morning stiffness: range-of-motion work was part of the home programmes that helped — one hospital day and three parent-supervised days for twelve weeks improved function, the six-minute walk and quality of life (Tarakci 2012), and aerobic walking with range of motion for eight weeks improved function from 0.77 to 0.20 (Dogru Apti 2014); a young child needs movement for psychosocial development (Hafner 1998), and the guideline recommends physiotherapy to keep range, particularly with contractures (Onel 2022b)."],
    start: ["على فراشٍ أو سرير بعد حمّامٍ دافئ أو بعد اللبس، وأحدُ الوالدين بجانب الطفل.", "On a mat or bed after a warm shower or after dressing, with a parent beside the child."],
    steps: [[
      "«نجمةُ البحر»: افتح الذراعين والساقين واسعاً، ثمّ تكوّر صغيراً.",
      "«الدرّاجة»: على الظهر، دوّر الساقين في الهواء.",
      "«القطّ والبقرة» على اليدين والركبتين — على القبضتين إن آلمه الرسغ.",
      "«مشيُ الحيوانات» في حدود الراحة: مشيةُ الدبّ ثمّ مشيةُ السلطعون.",
      "«أغنيةُ اليدين»: افتح وأغلق، ولوّح، واقبض.",
      "الرقبة «نعم – لا» صغيرةً وبطيئة — لمن لم تُصَب رقبتُه وحده.",
    ], [
      "'Starfish': open the arms and legs wide, then curl up small.",
      "'Bicycle': on the back, pedal the legs in the air.",
      "'Cat and cow' on hands and knees — on the fists if the wrists hurt.",
      "'Animal walks' within comfort: a bear walk, then a crab walk.",
      "'Hand song': open and close, wave, and make fists.",
      "Neck 'yes – no', small and slow — only for a child whose neck is not involved.",
    ]],
    cues: [[
      "تمرينٌ صامت مملّ ⟵ أغنيةٌ أو عدٌّ أو لوحةُ ملصقات.",
      "الدفعُ إلى نهاية المدى بالقوّة ⟵ حتى «يشدّ قليلاً»، بلا ألمٍ فوق ٣ من ١٠.",
      "المفصلُ الحارّ المتورّم يُعطى مثلَ غيره ⟵ حركةٌ لطيفة بلا حملٍ لذلك المفصل.",
      "الروتينُ يُترك في الأيّام الجيّدة ⟵ كلَّ صباحٍ ومساء.",
    ], [
      "A silent, boring exercise → a song, counting, or a sticker chart.",
      "Pushing hard into the end of range → until it 'pulls a little', with no pain above 3 out of 10.",
      "A hot swollen joint treated like the others → gentle movement with no load for that joint.",
      "Dropping the routine on good days → every morning and evening.",
    ]],
    easier: ["مستلقياً وحده، وأحدُ الوالدين يساعد الحركة.", "Lying down only, with a parent assisting the movement."],
    harder: ["للأكبر: ثباتٌ ١٥–٣٠ ثانية في كلّ تمطيط.", "For older children: a 15–30-second hold in each stretch."],
    stopIf: ["ألمٌ فوق ٣ من ١٠، أو مفصلٌ جديد حارّ متورّم، أو بكاءٌ ورفض ⟵ أوقف ذلك التمرين، وأخبر الأخصائيّ.", "Pain above 3 out of 10, a new hot swollen joint, or crying and refusal → stop that exercise, and tell the specialist."],
    equipment: ["فراشٌ وموسيقى، ولوحةُ ملصقات.", "A mat and music, and a sticker chart."],
    doseNote: ["١٠–١٥ دقيقة كلَّ صباح وقبل النوم (اقتراح)؛ والبرنامجُ المجرَّب في البيت أربعةُ أيّامٍ في الأسبوع (Tarakci 2012).", "10–15 minutes every morning and before bed (a proposal); the tested home programme ran four days a week (Tarakci 2012)."],
    images: [{ key: "jia-play-rom-morning-routine-1", ar: "أمٌّ وطفلٌ في الخامسة على فراشٍ يمدّان الذراعين والساقين واسعاً في «نجمة البحر» ويبتسمان", en: "A mother and a five-year-old child on a mat stretching their arms and legs wide in a 'starfish', both smiling", search: "child morning stretch play parent starfish exercise" }],
  },
  {
    code: "jia-knee-extension-night-splint", nameAr: "جبيرةُ مدّ الركبة الليلية: لبسُها ووقتُها وفحصُ الجلد", nameEn: "Night knee extension splint: putting it on, wear time and skin checks",
    kind: "functional", region: "knee", sets: 1, reps: 1,
    purpose: ["لتيبّس الركبة في الثني: الشدُّ الساكن ليلاً والجبائرُ حسّنت مدَّ الركبة عند خمسة أطفالٍ قبل سنّ المدرسة بتصميم الحالة المفردة (Fredriksen 2000)، ولا تجربةَ مضبوطة لجبائر الركبة ولا للجبس المتسلسل في هذا المرض (بحثٌ صفريّ)؛ والقوّةُ تضيع سريعاً قرب المفصل الملتهب (Lindehammar 1998)، وقوّةُ مدّ الركبة أحسُّ علامةٍ لضعف وظيفتها (Hansmann 2015). والمركزُ يصنع الجبيرة في قسم المساند — وهذه البطاقةُ نصيبُ الأهل.",
      "For a knee stuck in flexion: static night traction and orthoses improved knee extension in five preschool children in a single-subject design (Fredriksen 2000), and there is no controlled trial of knee splints or of serial casting in this disease (a documented zero result); strength is lost quickly near an inflamed joint (Lindehammar 1998), and knee extension torque is the most sensitive marker of impaired knee function (Hansmann 2015). The centre makes the splint in its orthotics department — this card is the family's part."],
    start: ["مستلقياً على الظهر، والجبيرةُ التي صنعها قسمُ المساند إلى أقصى مدٍّ مريحٍ للركبة.", "Lying on the back, with the splint made by the orthotics department set to the knee's most comfortable extension."],
    steps: [[
      "افحص جلدَ الركبة والكعب والفخذ قبل اللبس.",
      "ضع الساقَ في الجبيرة والركبةُ مستقيمةٌ قدرَ ما يريح.",
      "اربط الأحزمة: الفخذ أوّلاً ثمّ الساق ثمّ الكاحل — مشدودةٌ تمرّ تحتها إصبع.",
      "اشدّ عضلةَ الفخذ الأمامية خمسَ مرّات داخل الجبيرة.",
      "صباحاً: انزعها وافحص الجلد — احمرارٌ يبقى أكثرَ من نصف ساعة يُخبَر به الأخصائيّ — ثمّ اسحب الكعبَ لثني الركبة.",
      "أحضر الجبيرةَ إلى كلّ زيارة ليُعاد ضبطُها كلّما زاد المدّ.",
    ], [
      "Check the skin of the knee, heel and thigh before putting it on.",
      "Place the leg in the splint with the knee as straight as is comfortable.",
      "Fasten the straps: the thigh first, then the calf, then the ankle — snug enough for one finger to pass under.",
      "Tighten the front thigh muscle five times inside the splint.",
      "In the morning: take it off and check the skin — redness lasting more than half an hour is reported to the specialist — then slide the heel to bend the knee.",
      "Bring the splint to every visit so it can be readjusted as the range improves.",
    ]],
    cues: [[
      "ركبةٌ تُدفع حتى الألم ⟵ «مستقيمةٌ بلا قوّة».",
      "أحزمةٌ مشدودة جدّاً ⟵ إصبعٌ تمرّ تحت كلّ حزام.",
      "الجبيرةُ نفسُها شهوراً ⟵ تُراجَع كلَّ ٢–٤ أسابيع، فالمدُّ يتغيّر والطفلُ يكبر.",
      "الجبيرةُ للراحة بعد حقن الركبة ⟵ لا جبيرةَ للراحة بعد الحقن (Flanagan 2019).",
    ], [
      "A knee pushed until it hurts → 'straight, not forced'.",
      "Straps far too tight → one finger passes under each strap.",
      "The same splint for months → reviewed every 2–4 weeks, as the range changes and the child grows.",
      "The splint as rest after a knee injection → no resting splint after an injection (Flanagan 2019).",
    ]],
    easier: ["ساعةٌ أو ساعتان مساءً تزيد حتى الليل كلّه خلال أسبوع (اقتراح).", "One to two hours in the evening, building up to the whole night over a week (a proposal)."],
    harder: ["إعادةُ ضبطها إلى مدٍّ أكبر في قسم المساند.", "Readjusting it to more extension in the orthotics department."],
    stopIf: ["تنميلٌ، أو تغيّرُ لون الأصابع، أو جرحٌ في الجلد، أو ألمٌ يوقظ الطفل ⟵ انزعها، ولا تُلبس حتى يراها الأخصائيّ أو قسمُ المساند.", "Numbness, a change in toe colour, broken skin, or pain that wakes the child → take it off, and do not use it until the specialist or the orthotics department has seen it."],
    equipment: ["جبيرةُ مدّ الركبة من قسم المساند (بلاستيكٌ حراريّ أو قابلةٌ للضبط)، وجوربٌ قطنيّ طويل.", "A knee extension splint from the orthotics department (thermoplastic or adjustable), and a long cotton sock."],
    doseNote: ["كلَّ ليلة ما بقي التيبّس، ومراجعةٌ كلَّ ٢–٤ أسابيع (اقتراح — لا تجربةَ لجرعة الجبيرة).", "Every night while the contracture persists, with a review every 2–4 weeks (a proposal — there is no trial of splint dose)."],
    images: [{ key: "jia-knee-extension-night-splint-1", ar: "طفلٌ في السابعة نائم وإحدى ساقيه في جبيرةٍ مبطّنة تمدّ الركبة، وأحدُ الوالدين يفحص الحزامَ بإصبع", en: "A sleeping seven-year-old with one leg in a padded knee extension splint, and a parent checking the strap with one finger", search: "knee extension night splint child juvenile arthritis" }],
  },
  {
    code: "jia-resting-wrist-hand-splint", nameAr: "جبيرةُ الرسغ واليد: وقتُ لبسها وفحصُها", nameEn: "Resting wrist and hand splint: wear time and checks",
    kind: "functional", region: "wrist_hand", sets: 1, reps: 1,
    purpose: ["لراحة الرسغ الملتهب في وضعٍ وظيفيّ: جبيرةُ الرسغ المصنوعةُ على المقاس والجاهزةُ تساوتا عند ١٢ طفلاً — الجاهزةُ أريح، والمصنوعةُ حفظت الوضعَ أحسنَ قليلاً (Eberhard 1993)؛ ولا تجربةَ للجبيرة الليلية للرسغ واليد في هذا المرض (بحثٌ صفريّ)، والالتزامُ بالجبيرة أقلُّ منه بالتمرين ويقلّ عند المراهقين (Kirchner 2023). ولا تُستعمل للراحة بعد حقن الرسغ — فراحتُه زادت الانتكاس ٢٤ من ٥٨ مقابل ١٤ من ٥٩ في تجربةٍ على الكبار (Wallen 2006).",
      "To rest an inflamed wrist in a functional position: a custom-made and a ready-made wrist splint were equivalent in 12 children — the ready-made one more comfortable, the custom one holding the position slightly better (Eberhard 1993); there is no trial of a resting night wrist and hand splint in this disease (a documented zero result), and adherence to splints is lower than to exercise and falls in adolescents (Kirchner 2023). It is not used as rest after a wrist injection — resting the wrist increased relapse, 24 of 58 against 14 of 59, in an adult trial (Wallen 2006)."],
    start: ["جالساً والساعدُ على الطاولة.", "Sitting with the forearm on a table."],
    steps: [[
      "افحص جلدَ اليد والرسغ.",
      "ضع الساعدَ والكفَّ في الجبيرة والرسغُ مرفوعٌ قليلاً والأصابعُ مرتخية.",
      "اربط الأحزمةَ بلا ضغط.",
      "البسها ليلاً (جبيرةُ الراحة) أو في الكتابة والحمل (جبيرةُ العمل) كما وُصفت.",
      "بعد نزعها: تمارينُ انزلاق الأوتار ومدى الرسغ.",
      "نظّفها وأبعدها عن الحرارة والشمس، فالبلاستيكُ الحراريّ يتشوّه (اقتراح).",
    ], [
      "Check the skin of the hand and wrist.",
      "Place the forearm and palm in the splint with the wrist slightly extended and the fingers relaxed.",
      "Fasten the straps without pressure.",
      "Wear it at night (resting splint) or for writing and carrying (working splint), as prescribed.",
      "After taking it off: the tendon-gliding and wrist range-of-motion exercises.",
      "Clean it and keep it away from heat and sun, as thermoplastic deforms (a proposal).",
    ]],
    cues: [[
      "أحزمةٌ تترك آثاراً ⟵ «مريحةٌ لا ضيّقة، والأصابعُ وردية».",
      "الرسغُ منثنٍ داخل الجبيرة ⟵ مرفوعٌ قليلاً.",
      "تُلبس طوال اليوم بلا حركة ⟵ تُخلع للتمارين واللعب كما كُتب.",
      "تُترك في السيارة في الصيف ⟵ بعيداً عن الحرارة.",
    ], [
      "Straps leaving marks → 'comfortable, not tight, and pink fingers'.",
      "The wrist bent inside the splint → slightly extended.",
      "Worn all day without moving → taken off for exercise and play, as written.",
      "Left in the car in summer → away from heat.",
    ]],
    easier: ["وقتُ لبسٍ أقصر.", "A shorter wearing time."],
    harder: ["لا أصعب — يُراجَع وقتُ اللبس في كلّ كتلة.", "No harder version — the wearing time is reviewed at every block."],
    stopIf: ["تنميلٌ، أو تورّمُ الأصابع، أو احمرارٌ أو جرحٌ من الضغط ⟵ انزعها، وإلى قسم المساند.", "Numbness, swollen fingers, or redness or a sore from pressure → take it off, and to the orthotics department."],
    equipment: ["جبيرةُ راحةٍ أو عملٍ للرسغ واليد من قسم المساند.", "A resting or working wrist and hand splint from the orthotics department."],
    doseNote: ["كما وصفها الطبيبُ أو الأخصائيّ، وتُراجَع في كلّ كتلة (اقتراح — لا تجربةَ لوقت لبسها).", "As prescribed by the doctor or specialist, and reviewed at every block (a proposal — there is no trial of wearing time)."],
    images: [{ key: "jia-resting-wrist-hand-splint-1", ar: "ساعدُ طفلٍ في العاشرة ويدُه مستريحان في جبيرة رسغٍ ويد على طاولة، والرسغُ مرفوعٌ قليلاً والأصابعُ وردية مرتخية", en: "The forearm and hand of a ten-year-old resting in a wrist and hand splint on a table, the wrist slightly extended and the fingers pink and relaxed", search: "resting wrist hand splint child juvenile arthritis" }],
  },
  {
    code: "jia-foot-orthoses-shoe-raise", nameAr: "نعلُ القدم الطبّيّ ورفعُ الحذاء في حذاء المدرسة", nameEn: "Foot orthoses and a shoe raise in school shoes",
    kind: "functional", region: "ankle_foot", sets: 1, reps: 1,
    purpose: ["النعلُ أنقص ألمَ القدم والكاحل ٢١٫٤٥ من ١٠٠ بقول الطفل و١١٫٠٨ بقول الأهل في ثلاثة أشهر (Fellas 2025)، والنعلُ المصنوع شبهُ الصلب بوسائد امتصاص الصدمة أنقص الألمَ وحسّن سرعةَ المشي والنشاطَ والعجزَ أكثرَ من النعل المسطّح والحذاء الداعم (Powell 2005)، والجاهزُ المضبوط عند الكرسيّ أنقص الألمَ ٨ ملم في ستّة أشهر (Coda 2014)؛ ومشكلاتُ القدم عند ٦٣٪ (Hendry 2008). وفرقُ طول الساقين عند ٢٤٫٣٪ من قليل المفاصل في السعودية (Moued 2013) — ولا دراسةَ لرفع الحذاء ولا لحدّه في هذا المرض (بحثٌ صفريّ).",
      "Orthoses reduced foot and ankle pain by 21.45 out of 100 by the child's report and 11.08 by the parent's at three months (Fellas 2025), custom semirigid orthoses with shock-absorbing posts reduced pain and improved walking speed, activity and disability more than flat inserts and supportive shoes (Powell 2005), and preformed orthoses adjusted at the chairside reduced pain by 8 mm at six months (Coda 2014); foot problems affect 63% (Hendry 2008). Leg-length difference affects 24.3% of oligoarticular disease in Saudi Arabia (Moued 2013) — and there is no study of shoe raises or of a threshold for one in this disease (a documented zero result)."],
    start: ["جالساً، وحذاءُ المدرسة وحذاءُ الرياضة المعتادان بجانبه.", "Sitting, with the usual school shoes and sports shoes beside the child."],
    steps: [[
      "انزع نعلَ الحذاء الأصليّ.",
      "ضع النعلَ الطبّيّ والكعبُ في آخر الحذاء تماماً.",
      "إن وُصف رفعٌ للحذاء: تأكّد أنّه في حذاء الساق الأقصر.",
      "امشِ عشرةَ أمتار، وتأكّد من الراحة.",
      "زِد وقتَ اللبس: ساعةٌ أو ساعتان أوّلَ يوم، ثمّ ساعةٌ أو ساعتان أكثرَ كلَّ يوم حتى اليوم كلّه (اقتراح).",
      "افحص القدمين كلَّ مساء: احمرارٌ أو فقاعات.",
    ], [
      "Remove the shoe's own insole.",
      "Put the orthosis in, with the heel cup fully at the back of the shoe.",
      "If a shoe raise is prescribed: check that it is in the shoe of the shorter leg.",
      "Walk ten metres, and check that it is comfortable.",
      "Build up the wearing time: one to two hours on the first day, then one to two hours more each day until the whole day (a proposal).",
      "Check the feet every evening for redness or blisters.",
    ]],
    cues: [[
      "النعلُ في حذاءٍ واحد ⟵ «النعلُ نفسُه في كلّ حذاء».",
      "النعلُ فوق النعل الأصليّ فيضيق الحذاء ⟵ النعلُ الأصليّ يُنزع.",
      "الرفعُ في حذاء الساق الأطول ⟵ في حذاء الساق الأقصر كما كُتب.",
      "حذاءٌ قديم ضيّق ⟵ حذاءٌ بمقاسه الآن، فالقدمُ تكبر.",
    ], [
      "The orthosis in one pair of shoes only → 'the same orthosis in every shoe'.",
      "The orthosis on top of the original insole, making the shoe tight → the original insole is removed.",
      "The raise in the shoe of the longer leg → in the shoe of the shorter leg, as written.",
      "An old, tight shoe → a shoe that fits now, as the foot grows.",
    ]],
    easier: ["زيادةٌ أبطأ في وقت اللبس.", "A slower build-up of wearing time."],
    harder: ["في حذاء الرياضة واللعب.", "In sports and play shoes."],
    stopIf: ["ألمٌ جديد، أو فقاعات، أو احمرارٌ يبقى أكثرَ من نصف ساعة ⟵ لا يُلبس حتى يراه قسمُ المساند.", "New pain, blisters, or redness lasting more than half an hour → not worn until the orthotics department has seen it."],
    equipment: ["نعلٌ مصنوعٌ أو جاهزٌ مضبوط من قسم المساند، ورفعُ الحذاء كما يصفه قسمُ المساند.", "A custom or adjusted preformed orthosis from the orthotics department, and a shoe raise as the orthotics department prescribes."],
    doseNote: ["يومياً؛ ومراجعةٌ في ٤ أسابيع و٣ أشهر كمواعيد التجربة (Fellas 2022a)، وقياسُ طول الساقين في كلّ كتلة (Sherry 1999).", "Daily; with a review at 4 weeks and 3 months, as in the trial (Fellas 2022a), and leg length measured at every block (Sherry 1999)."],
    images: [{ key: "jia-foot-orthoses-shoe-raise-1", ar: "حذاءُ مدرسةٍ لطفلٍ يُدخَل فيه نعلٌ طبّيّ مصنوع، وبجانبه حذاءٌ ثانٍ برفعٍ صغير تحت الكعب", en: "A child's school shoe with a custom orthosis being slipped inside, and beside it a second shoe with a small heel raise", search: "child foot orthoses school shoe heel raise juvenile arthritis" }],
  },
  {
    code: "jia-pilates-mat-sequence", nameAr: "سلسلةُ البيلاتس على الفراش للأطفال", nameEn: "Pilates mat sequence for children",
    kind: "motor_control", region: "whole_body", sets: 1, reps: 8,
    purpose: ["البيلاتس حسّن جودةَ الحياة والألمَ والوظيفةَ والمدى أكثرَ من التمرين المعتاد عند ٥٠ طفلاً (Mendonca 2013)، وحسّن الألمَ ولياقةَ القلب والرئة والمشيَ ستّ دقائق وجودةَ الحياة عند ٤٠ طفلاً بمتعدّد المفاصل (Azab 2022)، وهو بدرجة A في لجنة أوتاوا (Cavallo 2017) وبدليلٍ متوسّط الجودة في مراجعة التمرين (Klepper 2019).",
      "Pilates improved quality of life, pain, function and range of motion more than conventional exercise in 50 children (Mendonca 2013), improved pain, cardiorespiratory fitness, the six-minute walk and quality of life in 40 children with polyarticular disease (Azab 2022), and is grade A in the Ottawa Panel (Cavallo 2017), with moderate-quality evidence in the exercise review (Klepper 2019)."],
    start: ["مستلقياً على الظهر على الفراش والركبتان مثنيّتان.", "Lying on the back on a mat with the knees bent."],
    steps: [[
      "تنفّس وشدّ البطنَ بلطف (تثبيتُ الجذع).",
      "لُفّ الحوضَ إلى جسرٍ صغير، ثمّ انزل فقرةً فقرة.",
      "الركبةُ إلى الصدر بالتناوب، والساقُ الأخرى ممدودة.",
      "مستلقياً على الجنب: دوائرُ صغيرة بالساق العليا.",
      "«السباحة» منبطحاً: رفعٌ صغير لليد والرجل المتقابلتين.",
      "على أربع: مدُّ اليد والرجل المتقابلتين — على القبضتين أو الساعدين إن آلمه الرسغ.",
    ], [
      "Breathe and gently tighten the tummy (core set).",
      "Curl the pelvis up into a small bridge, then come down one vertebra at a time.",
      "Alternate one knee to the chest, with the other leg straight.",
      "Lying on the side: small circles with the top leg.",
      "'Swimming' lying face down: small lifts of the opposite arm and leg.",
      "On all fours: reach out the opposite arm and leg — on the fists or forearms if the wrists hurt.",
    ]],
    cues: [[
      "حركةٌ سريعة متأرجحة ⟵ «ببطءٍ وتحكّمٍ وتنفّس».",
      "حبسُ النفَس ⟵ زفيرٌ مع الجهد.",
      "الظهرُ يتقوّس في الجسر ⟵ البطنُ مشدود والأضلاعُ إلى الأسفل.",
      "الاستنادُ على رسغٍ مؤلم ⟵ القبضتان أو الساعدان.",
    ], [
      "Fast, swinging movement → 'slow, controlled, and breathe'.",
      "Holding the breath → breathing out with the effort.",
      "The back arching in the bridge → tummy tight and ribs down.",
      "Leaning on a painful wrist → the fists or the forearms.",
    ]],
    easier: ["تمارينُ أقلّ ومدىً أصغر.", "Fewer exercises and a smaller range."],
    harder: ["ثباتٌ أطول، وكرةٌ صغيرة أو مطّاط.", "Longer holds, and a small ball or band."],
    stopIf: ["ألمُ مفصلٍ فوق ٣ من ١٠، أو ألمُ الرسغ على أربع ⟵ إلى الساعدين، أو اترك ذلك التمرين.", "Joint pain above 3 out of 10, or wrist pain on all fours → move to the forearms, or leave that exercise out."],
    equipment: ["فراش، وكرةٌ صغيرة، ومطّاط.", "A mat, a small ball, and a band."],
    doseNote: ["٥ مرّات لكلّ تمرين في الجلسات الثلاث الأولى ثمّ ٨ ثمّ ١٠ (Mendonca 2013)؛ والمجرَّب ٥٠ دقيقة مرّتين في الأسبوع ستّةَ أشهر أو ثلاثاً ثلاثةَ أشهر (Mendonca 2013 · Azab 2022)، والبيتُ ٣–٤ أيّام (اقتراح).", "5 repetitions of each exercise for the first three sessions, then 8, then 10 (Mendonca 2013); tested as 50 minutes twice a week for six months or three times a week for three months (Mendonca 2013 · Azab 2022), and home 3–4 days (a proposal)."],
    images: [{ key: "jia-pilates-mat-sequence-1", ar: "فتاةٌ في الحادية عشرة على فراشٍ ترفع حوضَها في جسرٍ صغير والذراعان بجانبها، والأخصائيّةُ راكعةٌ بجانبها", en: "An eleven-year-old girl on a mat lifting her pelvis into a small bridge with her arms by her sides, and the therapist kneeling beside her", search: "children Pilates mat bridge exercise therapist" }],
  },
  {
    code: "jia-balance-proprioception-circuit", nameAr: "دائرةُ التوازن والإحساس بوضع المفاصل", nameEn: "Balance and proprioception circuit",
    kind: "balance", region: "whole_body", perSide: true, sets: 2, hold: 30, rest: 30,
    purpose: ["تمارينُ التوازن والإحساس بوضع المفاصل مع التقوية تفوّقت على التقوية وحدها في المشي عشرةَ أمتار وصعودِ الدرج والوقوفِ على ساقٍ واحدة والوصول عند ٣٠ طفلاً، ثلاثاً في الأسبوع × ٤٥ دقيقة اثني عشرَ أسبوعاً (Baydogan 2015)؛ والمراجعةُ تجمع التقويةَ والتمطيطَ والتوازنَ والإحساس (Catania 2017).",
      "Balance and proprioceptive exercises with strengthening beat strengthening alone for the ten-metre walk, stair climbing, single-leg standing and functional reach in 30 children, three times a week × 45 minutes for twelve weeks (Baydogan 2015); the review combines strengthening, stretching, balance and proprioceptive work (Catania 2017)."],
    start: ["دائرةٌ من خمس محطّات في القاعة، وحائطٌ أو عارضةٌ قريبة.", "A circuit of five stations in the gym, with a wall or a bar nearby."],
    steps: [[
      "الوقوفُ على ساقٍ واحدة على الأرض («طائرُ الفلامنغو»)، والعينان مفتوحتان ثمّ مغمضتان.",
      "الوقوفُ على وسادةٍ أو لوح توازن.",
      "المشيُ على خطٍّ مستقيم والكعبُ أمام الأصابع.",
      "الخطوُ فوق عوائق منخفضة.",
      "رميُ الكرة والتقاطُها واقفاً على ساقٍ واحدة.",
      "قفزاتٌ صغيرة على الترامبولين الصغير — حين لا يكون في الساقين مفصلٌ نشط وحده.",
    ], [
      "Standing on one leg on the floor ('flamingo'), eyes open, then closed.",
      "Standing on a cushion or a balance board.",
      "Walking heel-to-toe along a straight line.",
      "Stepping over low obstacles.",
      "Throwing and catching a ball while standing on one leg.",
      "Small bounces on a mini-trampoline — only when there is no active joint in the legs.",
    ]],
    cues: [[
      "ركبتان مقفلتان ⟵ «ركبتان طريّتان وجسمٌ طويل».",
      "النظرُ إلى القدمين ⟵ إلى هدفٍ أمامه.",
      "العينان مغمضتان من البداية ⟵ بعد الثبات والعينان مفتوحتان.",
      "القفزُ مع ركبةٍ متورّمة ⟵ المحطّاتُ الثابتة على الأرض وحدها.",
    ], [
      "Locked knees → 'soft knees and a tall body'.",
      "Looking at the feet → at a target ahead.",
      "Eyes closed from the start → only once steady with the eyes open.",
      "Bouncing with a swollen knee → the stable floor stations only.",
    ]],
    easier: ["سندٌ باليد، والقدمان معاً.", "Hand support, and both feet together."],
    harder: ["العينان مغمضتان، وسطحٌ غير ثابت، ومهمّةٌ ثانية.", "Eyes closed, an unstable surface, and a second task."],
    stopIf: ["ألمٌ فوق ٣ من ١٠، أو ركبةٌ أو كاحلٌ متورّم ⟵ المحطّاتُ على الأرض الثابتة وحدها.", "Pain above 3 out of 10, or a swollen knee or ankle → the stations on stable floor only."],
    equipment: ["وسادةٌ أو لوح توازن، وشريطٌ على الأرض، وأقماع، وكرة، وترامبولين صغير.", "A cushion or balance board, a tape line on the floor, cones, a ball, and a mini-trampoline."],
    doseNote: ["٣٠–٤٥ ثانية لكلّ محطّة × ٢–٣ دورات في الجلسة؛ والمجرَّب ثلاثاً في الأسبوع × ٤٥ دقيقة اثني عشرَ أسبوعاً (Baydogan 2015 — وأوقاتُ المحطّات اقتراح)، ومحطّاتُ الأرض في البيت.", "30–45 seconds per station × 2–3 rounds per session; tested as three times a week × 45 minutes for twelve weeks (Baydogan 2015 — the station times are a proposal), with the floor stations at home."],
    images: [{ key: "jia-balance-proprioception-circuit-1", ar: "صبيٌّ في التاسعة واقفٌ على ساقٍ واحدة على وسادةٍ إسفنجية يلتقط كرة، والأخصائيُّ وعارضةُ الحائط قريبان", en: "A nine-year-old boy standing on one leg on a foam cushion catching a ball, with the therapist and a wall bar nearby", search: "child balance foam cushion single leg ball catch physiotherapy" }],
  },
  {
    code: "jia-cardio-karate-dance", nameAr: "اللياقةُ بلا قفز: حركاتُ الكاراتيه والرقص", nameEn: "Low-impact cardio: karate and dance moves",
    kind: "aerobic", region: "whole_body", sets: 1, reps: 1,
    purpose: ["لياقةُ القلب والرئة عند هؤلاء الأطفال نحو ٧٠–٨٥٪ من أقرانهم (van Brussel 2007 · Lelieveld 2007)؛ والكاراتيه الهوائيّ بدرجة C+ في لجنة أوتاوا (Cavallo 2017)، وبرنامجُ لياقةٍ من ٢٤ جلسة في ثمانية أسابيع حسّن عددَ المفاصل المصابة بلا نوبة (Klepper 1999)، والشدّةُ العالية لم تزد على الكيغونغ اللطيف وقلّ الالتزامُ بها (Singh-Grewal 2007).",
      "Cardiorespiratory fitness in these children is about 70–85% of their peers' (van Brussel 2007 · Lelieveld 2007); aerobic karate is grade C+ in the Ottawa Panel (Cavallo 2017), a 24-session conditioning programme over eight weeks improved joint counts without a flare (Klepper 1999), and high intensity was no better than gentle qigong and had lower adherence (Singh-Grewal 2007)."],
    start: ["واقفاً في مكانٍ واسع.", "Standing in an open space."],
    steps: [[
      "إحماءٌ بالمشي في المكان ودوائر الذراعين، ١٠ دقائق.",
      "لكماتُ الكاراتيه وصدّاتُه مع الخطو.",
      "خطواتٌ جانبية وتقاطعٌ على الموسيقى.",
      "رفعُ الركبتين وركلاتٌ منخفضة متحكَّمٌ بها.",
      "استمرّ ٢٥–٣٠ دقيقة بشدّة «يتكلّم ونفَسُه أسرع».",
      "تهدئةٌ وتمطيط، ١٠ دقائق.",
    ], [
      "Warm up by marching on the spot with arm circles, 10 minutes.",
      "Karate punches and blocks with stepping.",
      "Side steps and grapevines to music.",
      "Knee lifts and low, controlled kicks.",
      "Keep going for 25–30 minutes at 'can talk, breathing faster'.",
      "Cool down and stretch, 10 minutes.",
    ]],
    cues: [[
      "قفزٌ على مفصلٍ مؤلم ⟵ «ركبةٌ طريّة، ولا قفز».",
      "ركلاتٌ عالية بالقوّة ⟵ منخفضةٌ متحكَّمٌ بها.",
      "لا يستطيع الكلام ⟵ أبطأ حتى يستطيع.",
      "الشدّةُ القصوى «ليتعب أكثر» ⟵ متوسّطة، فالعاليةُ لا تزيد النفعَ (Singh-Grewal 2007).",
    ], [
      "Jumping on a sore joint → 'soft knee, and no jumping'.",
      "High, forceful kicks → low and controlled.",
      "Unable to talk → slower until talking is possible.",
      "Maximum intensity 'to tire out more' → moderate, as high intensity adds no benefit (Singh-Grewal 2007).",
    ]],
    easier: ["جالساً بالذراعين وحدهما في نوبة الساقين.", "Seated, with the arms only, during a leg flare."],
    harder: ["فتراتٌ أطول وخطواتٌ أكثر.", "Longer bouts and more steps."],
    stopIf: ["ألمُ مفصلٍ فوق ٣ من ١٠، أو دوخة، أو ضيقُ نفَسٍ غير معتاد ⟵ توقّف واجلس.", "Joint pain above 3 out of 10, dizziness, or unusual breathlessness → stop and sit down."],
    equipment: ["موسيقى، وفيديو مسجَّل للبيت.", "Music, and a recorded video for home."],
    doseNote: ["جلسةٌ ٦٠ دقيقة (١٠ إحماء، ٢٥ هوائيّ، ١٥ تقوية، ١٠ تهدئة) مرّتين في المركز ومرّةً في البيت بالفيديو ثمانيةَ أسابيع (Klepper 1999)، أو ٥٠ دقيقة ثلاثاً واحدةٌ منها بإشراف (Singh-Grewal 2007).", "A 60-minute session (10 warm-up, 25 aerobic, 15 strength, 10 cool-down) twice at the centre and once at home by video for eight weeks (Klepper 1999), or 50 minutes three times a week, one of them supervised (Singh-Grewal 2007)."],
    images: [{ key: "jia-cardio-karate-dance-1", ar: "ثلاثةُ أطفالٍ في قاعة رياضة يلكمون لكمةَ الكاراتيه وقدمٌ تخطو إلى الأمام، ومكبّرُ صوتٍ في الخلف", en: "Three children in a gym throwing karate punches with one foot stepping forward, and a speaker in the background", search: "children cardio karate exercise class punches" }],
  },
  {
    code: "jia-jump-rope-bone-loading", nameAr: "نطُّ الحبل والقفزُ لعظامٍ قويّة", nameEn: "Rope skipping and jumps for strong bones",
    kind: "strength", region: "whole_body", sets: 5, reps: 20, rest: 45,
    purpose: ["خطرُ الكسر ٣٫١٣ ضعفاً في عمر ١٠–١٥ (Burnham 2006)، والعظمُ أضعفُ ممّا تفسّره العضلات (Burnham 2008)؛ ومئةُ قفزةٍ بالقدمين مع التقوية اثني عشرَ أسبوعاً رفعت كثافةَ عظم الجسم كلّه (Sandstedt 2012)، والقفزُ في الماء رفع الكثافة (Elnaggar 2023)، والصحّةُ العالمية توصي بنشاطٍ يقوّي العضلاتِ والعظام ثلاثةَ أيّامٍ في الأسبوع (Bull 2020).",
      "Fracture risk is 3.13 times higher at age 10–15 (Burnham 2006), and bone is weaker than the muscle explains (Burnham 2008); one hundred two-footed jumps with strengthening for twelve weeks raised total-body bone density (Sandstedt 2012), aqua-plyometrics raised density (Elnaggar 2023), and the World Health Organization recommends activity that strengthens muscle and bone on three days a week (Bull 2020)."],
    start: ["واقفاً على أرضٍ ثابتة غير زلقة، بحذاءٍ داعم أو بالنعل الطبّيّ.", "Standing on a firm, non-slip floor, in supportive shoes or with the foot orthoses."],
    steps: [[
      "إحماءٌ بالمشي في المكان.",
      "قفزاتٌ صغيرة بالقدمين في المكان، ١٠.",
      "نطُّ الحبل بالقدمين معاً، مجموعاتٌ من ١٠–٢٠.",
      "راحةٌ ٣٠–٦٠ ثانية بين المجموعات.",
      "الهبوطُ ناعماً على مقدّم القدم والركبتان مثنيّتان.",
      "اختم بتمطيط الساق والفخذ الأماميّ.",
    ], [
      "Warm up by marching on the spot.",
      "Small two-footed hops on the spot, 10.",
      "Rope skipping with both feet together, sets of 10–20.",
      "Rest 30–60 seconds between sets.",
      "Land softly on the front of the foot with the knees bent.",
      "Finish with calf and front-thigh stretches.",
    ]],
    cues: [[
      "هبوطٌ قويّ على الكعبين ⟵ «هبوطٌ هادئ» على مقدّم القدم.",
      "ركبتان مستقيمتان عند الهبوط ⟵ مثنيّتان قليلاً.",
      "القفزُ يومَ تورّم الركبة ⟵ لا قفزَ مع مفصلٍ نشط في الساق.",
      "قفزٌ عالٍ متعب ⟵ قفزاتٌ صغيرة كثيرة.",
    ], [
      "Landing hard on the heels → 'quiet landings' on the front of the foot.",
      "Straight knees on landing → slightly bent.",
      "Jumping on a day the knee is swollen → no jumping with an active joint in the leg.",
      "High, tiring jumps → many small jumps.",
    ]],
    easier: ["رفعُ الكعبين وإسقاطُهما، أو المشيُ في المكان.", "Heel raises and drops, or marching on the spot."],
    harder: ["قفزاتٌ أكثر كما يحتمل.", "More jumps, as tolerated."],
    stopIf: ["ألمُ الركبة أو الكاحل أو الورك فوق ٣ من ١٠، أو تورّمٌ في اليوم التالي ⟵ توقّف عن القفز وأخبر الأخصائيّ؛ ولا يُؤدّى مع مفصلٍ نشط في الساق.", "Knee, ankle or hip pain above 3 out of 10, or swelling the next day → stop jumping and tell the specialist; never with an active joint in the leg."],
    equipment: ["حبلُ نطّ.", "A skipping rope."],
    doseNote: ["نحو ١٠٠ قفزة بالقدمين في الجلسة ثلاثاً في الأسبوع اثني عشرَ أسبوعاً، مع تقويةٍ ٣ × ١٠ (Sandstedt 2012 · Sandstedt 2013).", "About 100 two-footed jumps per session, three times a week for twelve weeks, with strengthening 3 × 10 (Sandstedt 2012 · Sandstedt 2013)."],
    images: [{ key: "jia-jump-rope-bone-loading-1", ar: "فتاةٌ في الحادية عشرة تنطّ الحبلَ في ساحة المدرسة بحذاءٍ رياضيّ والركبتان مثنيّتان قليلاً", en: "An eleven-year-old girl skipping with a rope in a schoolyard in sports shoes, with the knees slightly bent", search: "girl skipping rope schoolyard sports shoes" }],
  },
  {
    code: "jia-prayer-floor-sitting-squat-toilet", nameAr: "الصلاةُ والجلوسُ على الأرض والمرحاضُ العربيّ مع التهاب المفاصل", nameEn: "Prayer, floor sitting and the squat toilet with arthritis",
    kind: "functional", region: "whole_body", sets: 1, reps: 3,
    purpose: ["في النسخة العربية لاستبيان الوظيفة المكيَّفة للأطفال العرب كانت أصعبُ المهامّ الجلوسَ متربّعاً ووضعيةَ الصلاة والمرحاضَ العربيّ (Madi 2004)، وفي البصرة كان النهوضُ والمشيُ والأنشطةُ أكثرَ ما تأثّر (Naser 2019)؛ ولا دراسةَ للصلاة في هذا المرض (بحثٌ صفريّ). والحكمُ الشرعيّ للطفل وأهله ومرجعهم.",
      "In the Arabic version of the function questionnaire adapted for Arab children, the hardest tasks were cross-legged sitting, the prayer position and the Arabic squat toilet (Madi 2004), and in Basrah arising, walking and activities were the most affected (Naser 2019); there is no study of prayer in this disease (a documented zero result). The religious ruling is for the child, the family and their scholar."],
    start: ["على سجّادة الصلاة، بجانب كرسيٍّ ثابت.", "On the prayer mat, beside a steady chair."],
    steps: [[
      "القيام: قِف مستقيماً والوزنُ على الساقين معاً.",
      "الركوع: الركبتان مثنيّتان قليلاً، واليدان على الفخذين إن آلمه الرسغ.",
      "النزولُ إلى الأرض بركبةٍ واحدة على وسادة، ويدٌ على الكرسيّ.",
      "الجلوسُ على العقبين أو متربّعاً في المدى الذي لا يؤلم، ووسادةٌ صغيرة تحت المقعدة إن تيبّست الركبتان أو الكاحلان.",
      "القيامُ على مراحل بالكرسيّ.",
      "المرحاضُ العربيّ بمقبضٍ أو إطار، أو مقعدٌ مرتفع أو كرسيُّ مرحاض ما دامت الركبتان أو الوركان نشطة (اقتراح).",
    ], [
      "Standing: stand tall with the weight on both legs.",
      "Bowing: the knees slightly bent, and the hands on the thighs if the wrists hurt.",
      "Going down to the floor through kneeling on one knee on a cushion, with a hand on the chair.",
      "Sitting on the heels or cross-legged within the pain-free range, with a small cushion under the buttocks if the knees or ankles are stiff.",
      "Getting up in stages using the chair.",
      "The squat toilet with a rail or frame, or a raised seat or commode while the knees or hips are active (a proposal).",
    ]],
    cues: [[
      "النزولُ دفعةً واحدة ⟵ «ببطءٍ وعلى مراحل وبسند».",
      "الجلوسُ على عقبين متورّمين ⟵ وسادةٌ أو الكرسيّ.",
      "الكرسيُّ دائماً ⟵ ما دام المفصلُ نشطاً، ثمّ العودةُ إلى الأرض بالتدريج.",
      "المعالجُ يفتي ⟵ الحكمُ للطفل وأهله ومرجعهم.",
    ], [
      "Going down in one go → 'slowly, in stages, with support'.",
      "Sitting on swollen heels and ankles → a cushion or the chair.",
      "A chair forever → while the joint is active, then back to the floor gradually.",
      "The therapist giving rulings → the ruling is for the child, the family and their scholar.",
    ]],
    easier: ["الصلاةُ على الكرسيّ، وإطارُ المرحاض.", "Praying on the chair, and a toilet frame."],
    harder: ["بلا سندٍ باليد حين تهدأ المفاصل ويعود المدى.", "Without hand support once the joints are quiet and the range has returned."],
    stopIf: ["ألمُ الركبة أو الكاحل فوق ٣ من ١٠، أو تورّمٌ في اليوم التالي ⟵ الكرسيُّ والإطارُ حتى يهدأ.", "Knee or ankle pain above 3 out of 10, or swelling the next day → the chair and the frame until it settles."],
    equipment: ["سجّادةُ صلاة، ووسادة، وكرسيٌّ ثابت، وإطارُ مرحاضٍ أو مقبض.", "A prayer mat, a cushion, a steady chair, and a toilet frame or rail."],
    doseNote: ["٣–٥ مرّات في الجلسة في المرحلة الثالثة، وفي البيت الصلواتُ اليومية والمرحاضُ هي التمرين (اقتراح).", "3–5 times per session in phase 3, and at home the daily prayers and toilet use are the practice (a proposal)."],
    images: [{ key: "jia-prayer-floor-sitting-squat-toilet-1", ar: "صبيٌّ في الثانية عشرة على سجّادة صلاةٍ ينهض من الجلوس على عقبيه ويدُه على كرسيّ، ووسادةٌ تحت ركبتيه", en: "A twelve-year-old boy on a prayer mat rising from sitting on his heels with one hand on a chair, and a cushion under his knees", search: "boy rising from prayer position chair support cushion" }],
  },
];

const PRACTICE_RULE_AR = "قاعدةُ الجلسة (مشتقّةٌ إلّا ما نُسب): قبلها — ١) يُسأل الطفلُ وأهلُه: تورّمٌ جديد، وتيبّسُ الصباح، وحمّى، وطفحٌ جلديّ، وعينٌ حمراء أو مؤلمة، وألمُ الرقبة أو ميلُها (الصعر)؛ ويُكتب يومُ الميثوتريكسات أو الدواء الحيويّ وآخرُ حقنٍ في مفصل؛ وأيُّ علامة خطر ⟵ لا جلسة، والإحالةُ بقواعدها في «موانع الاستعمال»؛ ٢) طولُ الجلسة بالعمر: ٣٠–٤٠ دقيقة دون السادسة لعباً وأحدُ الوالدين حاضر، و٤٥ في ٦–١١، و٥٠–٦٠ للمراهق (اقتراحٌ من أطوال التجارب — Iversen 2022). وأثناءها — ٣) المفصلُ الحارّ المتورّم (النشط): مدىً وتمارينُ ثابتة وحدها بلا مقاومةٍ ولا قفز، «في حدود الألم» (Philpott 2010)، وتُدرَّب المفاصلُ الأخرى ويستمرّ الهوائيّ بالدرّاجة أو بالذراعين — فالقوّةُ تضيع سريعاً قرب المفصل الملتهب (Lindehammar 1998)؛ ٤) الألم: حتى ٣ من ١٠ بمقياس الوجوه أو بدوائر الألم الإحدى والعشرين مقبولٌ أثناء التمرين، ويعود إلى ما كان صباحَ الغد — فالألمُ بعد الجهد تضاعف ثمّ زال قبل المساء (Rochette 2018)، ولم يقع إلّا في ٠٫٤٪ من الجلسات (Houghton 2018)؛ وفوق ذلك أو ألمٌ في اليوم التالي ⟵ ينقص الحجمُ أو الحملُ درجةً لذلك المفصل؛ ٥) تورّمٌ جديد أكثرَ من ٤٨ ساعة أو زيادةُ المفاصل النشطة ⟵ لا تحميلَ لذلك المفصل، ويُخبَر طبيبُ المفاصل — فالدواءُ يُصعَّد ولو لمفصلٍ نشطٍ واحد (Ringold 2019)؛ ٦) بعد حقن المفصل: لا جبيرةَ ولا راحةَ طويلة (Flanagan 2019 · Wallen 2006)، وحركةٌ لطيفة ونشاطٌ يوميّ عاديّ، ولا قفزَ ولا جهدَ شديد على المفصل الحامل للوزن المحقون ٢٤–٤٨ ساعة إلّا إن قال الطبيبُ غيرَ ذلك (اقتراح)؛ ٧) الإعياءُ الأسوأ من المعتاد أكثرَ من ٢٤ ساعة ⟵ ينقص الحجمُ درجة — والطاقةُ منخفضةٌ يومياً عند ٦٠٪ (Armbrust 2016b)؛ ٨) الطفلُ الصغير: يتوقّف مع البكاء أو الرفض أو عرجٍ أسوأ من بداية الجلسة؛ ٩) الحرّ: ماءٌ وفتراتُ راحة وقاعةٌ مكيّفة — فالطفلُ يضبط حرارتَه كالكبير إذا شرب، والخطرُ من قلّة الماء والجهد الزائد وقلّة الراحة واللبس الثقيل (AAP 2011).";
const PRACTICE_RULE_EN = "The session rule (derived unless cited): before it — 1) the child and family are asked about new swelling, morning stiffness, fever, rash, a red or painful eye, and neck pain or tilt (torticollis); the methotrexate or biologic day and the last joint injection are written down; any red flag → no session, and referral by its rules under 'Contraindications'; 2) session length by age: 30–40 minutes under six, play-based with a parent present, 45 at 6–11, and 50–60 for adolescents (a proposal from trial session lengths — Iversen 2022). During it — 3) a hot, swollen (active) joint: range of motion and isometric exercise only, with no resistance and no jumping, 'within pain limits' (Philpott 2010), while the other joints are trained and aerobic work continues on the bike or with the arms — strength is lost quickly near an inflamed joint (Lindehammar 1998); 4) pain: up to 3 out of 10 on the faces scale or the 21-circle pain scale is acceptable during exercise, and it is back to baseline by the next morning — post-exercise pain doubled and then settled before the evening (Rochette 2018), and occurred in only 0.4% of sessions (Houghton 2018); above that, or pain the next day → volume or load goes down a step for that joint; 5) new swelling lasting more than 48 hours, or a rising active joint count → no loading of that joint, and the rheumatologist is informed — treatment is escalated even for a single active joint (Ringold 2019); 6) after a joint injection: no splint and no prolonged rest (Flanagan 2019 · Wallen 2006), gentle movement and normal daily activity, and no jumping or strenuous effort on the injected weight-bearing joint for 24–48 hours unless the doctor says otherwise (a proposal); 7) fatigue worse than usual for more than 24 hours → volume goes down a step — daily low energy affects 60% (Armbrust 2016b); 8) a young child: stop for crying, refusal, or a limp worse than at the start of the session; 9) heat: water, rest breaks and an air-conditioned room — a child thermoregulates as well as an adult when hydrated, and the risk comes from too little water, overexertion, too little recovery and heavy clothing (AAP 2011).";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد باثنتي عشرة جلسة (حتى ٣٦) لمن بلغ الفرقَ المهمّ أو أصغرَ تغيّرٍ يُكتشف في مقياسٍ واحد على الأقلّ — الوظيفةُ −٠٫١٣ (Dempster 2001)، أو الألمُ −١٠ ملم من ١٠٠ (Powell 2001)، أو المشيُ ستّ دقائق +٦٥ متراً (Pritchard 2022)، أو فتحُ الفم +٥ ملم (اقتراح) — ولم يبلغ هدفاً من أهدافه؛ أو صار له تيبّسٌ جديد أو مسندٌ جديد أو حُقن مفصلٌ قريباً ويحتاج عملاً بإشراف؛ ولا يُمدَّد من لم يتغيّر في قياسين متتاليين. ثمّ البرنامجُ المنزليّ ثلاثةَ أيّامٍ في الأسبوع فأكثر مع الأهل نحو ستّين دقيقةً من النشاط في اليوم معدّلاً وتقويةِ العضلات والعظام ثلاثاً في الأسبوع (Bull 2020)، والعودةُ إلى درس الرياضة واللعب (Philpott 2010 · Nordal 2019)؛ ومراجعةٌ كلَّ ٣–٤ أشهر مع طبيب المفاصل — فالمرضُ النشط يُراجَع كلَّ أربعة أشهر على الأكثر (Davies 2010)؛ وكتلةٌ جديدة بعد نوبةٍ أو حقنٍ أو جراحة أو تيبّسٍ جديد أو مسندٍ جديد، ويُراجَع موعدُ العين في كلّ كتلة (Angeles-Han 2019).";
const EXTEND_EN = "At session 24: one extension of twelve sessions (to 36) for a child who reached the important difference or the minimal detectable change on at least one measure — function −0.13 (Dempster 2001), pain −10 mm out of 100 (Powell 2001), the six-minute walk +65 metres (Pritchard 2022), or mouth opening +5 mm (a proposal) — and has not met a goal; or who has a new contracture, a new orthosis or a recent joint injection that needs supervised work; a child with no change across two consecutive tests is not extended. Then the home programme on three days a week or more with the family, towards an average of sixty minutes of activity a day and muscle- and bone-strengthening on three days a week (Bull 2020), and a return to physical education and play (Philpott 2010 · Nordal 2019); a review every 3–4 months alongside the rheumatologist — active disease is reviewed at least every four months (Davies 2010); and a new block after a flare, an injection, surgery, a new contracture or a new orthosis, with the eye-check date reviewed at every block (Angeles-Han 2019).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "jia-pediatric",
  summary: [
    "التهابُ المفاصل اليفعيّ مجهولُ السبب: التهابُ مفصلٍ فأكثر يبدأ قبل السادسة عشرة ويدوم أكثرَ من ستّة أسابيع بلا سببٍ معروف، في سبع فئات (Petty 2004 · Martini 2022)، وأكثرُ أمراض المفاصل الالتهابية المزمنة شيوعاً في الطفولة (Martini 2022)؛ والوقوعُ ١٫٦–٢٣ والانتشارُ ٣٫٨–٤٠٠ لكلّ مئة ألف (Thierry 2014)، ونحو ٢٫٠٧ مليون طفلٍ دون السادسة عشرة مصابون به في العالم (Dave 2020). ومع الدواء الحديث: ٥٩٫٥٪ لم يبلغوا الهدأةَ بلا دواء بعد ثماني سنوات والعجزُ عند ٣٢٫٧٪ (Rypdal 2018)، وصار المرضُ خاملاً عند ٨٣٪ لكنّ ضبطَ الألم وجودةَ الحياة لم يكادا يتحسّنان (Nguyen 2024)؛ والهدفُ الهدأةُ أو أدنى نشاط مع حفظ النموّ (Ravelli 2018). وما يعالجه العلاجُ الطبيعيّ شائع: الإعياءُ عند ٦٠–٧٦٪ (Armbrust 2016a)، ومفصلُ الفكّ عند ٣٩–٧٨٪ (Ferrillo 2025)، وإصابةُ الرقبة بالتصوير عند ٣٥٪ ممّن لهم علاماتُها (Kotecki 2021)، ومشكلاتُ القدم عند ٦٣٪ (Hendry 2008)، ولياقةُ القلب نحو ٧٠–٨٥٪ من الأقران (van Brussel 2007 · Lelieveld 2007)، ولا يبلغ نشاطَ الصحّة العالمية إلّا ١٨٪ ممّن بلغوا الثانية عشرة (Milatz 2024)، وخطرُ الكسر ٣٫١٣ ضعفاً في عمر ١٠–١٥ (Burnham 2006). " +
    "وفي العراق: لا مسحَ سكّانيّاً (بحثٌ صفريّ)، والأرقامُ عيّناتُ عيادات: في البصرة ٥٢ طفلاً في مركز تأهيل المعوّقين — قليلُ المفاصل ٤٨٫٠٨٪ ومتعدّدُها ٣٦٫٥٤٪ والجهازيّ ٩٫٦٢٪ والمرتبطُ بالتهاب مرتكزات الأوتار ٥٫٧٧٪، والوظيفةُ أسوأ من الأقران في النهوض والمشي والأنشطة والألم (Naser 2019)؛ وفي مستشفيي الرصافة والكاظمية التعليميّين ٦٦ طفلاً، متعدّدُ المفاصل ٢٩ منهم والبناتُ ٥٤٫٥٪ وذروةُ العمر ١–٤ سنوات، والأجسامُ المضادّة للنواة إيجابيةٌ عند ٤ فقط (Al-Obaidi 2023)؛ وفي الديوانية مع جامعة بغداد بقي ٧٤٪ من ٥٠ طفلاً في مرضٍ نشط، وأكثرُ عوائق الدواء انقطاعُه (٢١٫٦٪) ونفادُه (١٣٫٥٪) (Almansi 2025)؛ ولا تنظيمَ للبدائل الحيوية في العراق (Al Ani 2019)، وفي البلاد العربية ٠٫٨٤ طبيبَ مفاصل لكلّ مئة ألف (Ziade 2023). وفي المنطقة: الانتشارُ السكّانيّ ٣٫٤٣ لكلّ مئة ألف في الشرقية بمصر (Abou El-Soud 2013) و٢٠ في عُمان (Abdwani 2015)، وفي ٧٠٢ طفلٍ من سبع دولٍ عربية كان الجهازيُّ ٢٤٫٥٪ والقرابةُ وإصابةُ الأخ تصحبان ضرراً أكثر (Al-Mayouf 2021b)، والتهابُ العنبية ٥٫٩٪ في أفريقيا والشرق الأوسط مقابل نحو ١٩٪ في أوروبا، والبلدُ الأفقر أكثرُ نشاطاً للمرض وضرراً والضررُ يصحب تأخّرَ الإحالة (Consolaro 2019)؛ وفي الإمارات تسعةُ أشهرٍ إلى طبيب مفاصل الأطفال وعمي طفلٌ من التهاب العنبية (Khawaja 2017)، وفرقُ طول الساقين عند ٢٤٫٣٪ من قليل المفاصل في السعودية (Moued 2013). ولا تجربةَ علاجٍ طبيعيٍّ عراقية (بحثٌ صفريّ). " +
    "الإرشادات: الأمريكيُّ ٢٠١٩ يوصي بالعلاج الطبيعيّ والوظيفيّ توصيةً مشروطة لمتعدّد المفاصل ومن يُخشى عليه قصورُ الوظيفة (دليلٌ منخفض للطبيعيّ ومنخفضٌ جدّاً للوظيفيّ)، ويصعّد الدواءَ ولو لمفصلٍ نشطٍ واحد، والبياناتُ «محدودةٌ جدّاً» (Ringold 2019)؛ والأمريكيُّ ٢٠٢١ يوصي بهما توصيةً مشروطة مهما كان الدواء — لحفظ المدى خاصّةً مع التيبّس، والقوّةِ والتحمّلِ والوظيفةِ والوقايةِ من الإصابة والمشاركة — و٢٣ من ٣٣ توصيةً مشروطة ولم يكن في لجنة التصويت معالجٌ طبيعيّ (Onel 2022b)، وحقنُ المفصل بالكورتيزون توصيةٌ قويّة لقليل المفاصل، ومفصلُ الفكّ «مفصلٌ عالي الخطر»، ومتلازمةُ تنشّط البلعميات تصحب حتى ٤٠٪ من الشكل الجهازيّ وتهدّد الحياة (Onel 2022a)؛ وإرشادُ العين: فحصٌ كلَّ ثلاثة أشهر لعالي الخطر وكلَّ ٦–١٢ شهراً لغيره (Angeles-Han 2019)، ومعه الأوروبيّ (Constantin 2018) والإسكندنافيّ (Leinonen 2023)؛ والأوروبيُّ للشكل الجهازيّ (Fautrel 2024)؛ ولجنةُ أوتاوا: البيلاتس والبرنامجُ المنزليّ والتمرينُ المائيّ بدرجة A والكاراتيه الهوائيّ C+ (Cavallo 2017)؛ والكنديّ: يشاركون في الرياضة بأمانٍ بلا تهيّج، و«في حدود الألم» مع المفصل الملتهب (Philpott 2010)؛ والصحّةُ العالمية: ستّون دقيقةً في اليوم معدّلاً وتقويةُ العضلات والعظام ثلاثاً في الأسبوع، وللأطفال ذوي الإعاقة أيضاً (Bull 2020)؛ ومعاييرُ الرعاية البريطانية: مراجعةُ المرض النشط كلَّ أربعة أشهر على الأكثر، وفحصُ العين خلال ستّة أسابيع من الإحالة والعينُ المؤلمة خلال أسبوع (Davies 2010)؛ وإجماعُ الفكّ: العلاجُ الطبيعيّ قد ينفع ولا بياناتَ له في هذا المرض (Stoustrup 2023)؛ وإرشادُ الأجهزة الكنديّ: صفيحةُ النموّ المفتوحة تحذيرٌ للأمواج فوق الصوتية والليزر والتحفيز، والحرارةُ السطحية ممنوعةٌ لمن لا يستطيع أن يخبر في وقته (Houghton 2010). ومراجعةُ كوكرين الوحيدة: ثلاثُ تجارب و٢١٢ طفلاً بلا نفعٍ دالّ ولا ضرر، و«التمرينُ لا يهيّج التهابَ المفاصل» (Takken 2008)، ثمّ الوظيفةُ −٠٫٤١ والمشيُ ستّ دقائق +٢٦٫٧ متراً (Tong 2026) والألمُ −١٫٣٧ من ١٠ (Musso-Daury 2024). " +
    "والجرعة: في ١٣ تجربة (٦٧٢ طفلاً) كانت ٦١٪ من الذراعات ثلاثاً في الأسبوع، و٦٥٪ من ١٢ أسبوعاً إلى أقلّ من ٢٨، والجلسةُ ٤٥–٦٠ دقيقة في ٤٤٪، وبلا حدثٍ سيّئ (Iversen 2022)، ومراجعةُ الجودة: ٣٠–٥٠ دقيقة مرّتين أو ثلاثاً في الأسبوع ١٢–٢٤ أسبوعاً (Klepper 2019)؛ ولا تجربةَ قارنت عددَ الجلسات في الأسبوع، ولا تجربةَ جرّبت كتلةً يوميةً أربعةَ أسابيع في العيادات الخارجية للأطفال (بحثٌ صفريّ)؛ والكتلةُ المكثّفة الوحيدة ١٦ جلسةً من ساعة في أسبوعين ثمّ أسبوعياً أو كلَّ أسبوعين شهرين — تحسّن ٦١٪ بلا تهيّج (Epps 2005). والأهلُ يعطون أكثرَ الجرعة: يومٌ في المستشفى وثلاثةُ أيّامٍ بإشراف الأهل (Tarakci 2012)، وجلستان في المركز وواحدةٌ في البيت بالفيديو (Klepper 1999)، والالتزامُ في البيت وحده ٤٧٪ ويقلّ (Houghton 2018)؛ والمدرسةُ تمنع اليوميّ: غاب ٦٩٪ ثلاثةَ أسابيع فأكثر في مصر (Abdul-Sattar 2014a). " +
    "فالبروتوكول: المسارُ الافتراضيّ ٢٤ جلسة بثلاثٍ في الأسبوع × ٤٥ دقيقة (ثمانيةُ أسابيع، وحتى اثني عشرَ أسبوعاً بمرّتين)، والأهلُ يتعلّمون البرنامجَ المنزليّ في الجلسات ١–٣ ويؤدّونه ٣–٤ أيّامٍ أخرى بسجلّ؛ وطولُ الجلسة بالعمر لقرار سليم: ٣٠–٤٠ دقيقة دون السادسة، و٤٥ في ٦–١١، و٥٠–٦٠ للمراهق؛ وخيارٌ لمن يستطيع الحضورَ يومياً بعد نوبةٍ أو حقنٍ أو تيبّسٍ جديد: ١٢ جلسةً بستٍّ في الأسبوع أسبوعين (Epps 2005) ثمّ ١٢ بمرّةٍ أو مرّتين في الأسبوع حتى الأسبوع ١٢ (Tarakci 2012)؛ والمسارُ الخفيف لقليل المفاصل الخامل أو الأدنى نشاطاً (Trincianti 2021): ٦–١٢ جلسة للبرنامج المنزليّ والمساند والمدرسة؛ وتمديدٌ واحد باثنتي عشرة بمعيارٍ مكتوب، ثمّ البيتُ ثلاثاً في الأسبوع فأكثر نحو أهداف الصحّة العالمية (Bull 2020)، ومراجعةٌ كلَّ ٣–٤ أشهر مع طبيب المفاصل (Davies 2010)، وكتلةٌ جديدة بعد نوبةٍ أو حقنٍ أو جراحة. وثلاثُ مراحل: ١–٦ التقييمُ والتعليمُ والمساند، و٧–١٨ التدريبُ المتدرّج، و١٩–٢٤ المشاركةُ في المدرسة واللعب والصلاة. ولا مسبحَ في المركز، والعلاجُ على الأرض ساوى الأرضَ مع المسبح (Epps 2005).",
    "Juvenile idiopathic arthritis: arthritis of one or more joints that starts before the age of sixteen and lasts more than six weeks without a known cause, in seven categories (Petty 2004 · Martini 2022), and the commonest chronic inflammatory joint disease of childhood (Martini 2022); incidence is 1.6–23 and prevalence 3.8–400 per 100,000 (Thierry 2014), and about 2.07 million children under sixteen live with it worldwide (Dave 2020). With modern drugs: 59.5% had not reached remission off medication at eight years and 32.7% had disability (Rypdal 2018), and inactive disease rose to 83% while pain control and quality of life barely improved (Nguyen 2024); the target is remission or low disease activity with growth protected (Ravelli 2018). The problems physiotherapy targets are common: fatigue in 60–76% (Armbrust 2016a), the jaw joint in 39–78% (Ferrillo 2025), neck involvement on imaging in 35% of those with neck signs (Kotecki 2021), foot problems in 63% (Hendry 2008), cardiorespiratory fitness about 70–85% of peers' (van Brussel 2007 · Lelieveld 2007), only 18% of those aged twelve or more meeting the World Health Organization activity level (Milatz 2024), and fracture risk 3.13 times higher at age 10–15 (Burnham 2006). " +
    "In Iraq: there is no population survey (a documented zero result), and the figures are clinic samples: in Basrah, 52 children at the Center for Disabled Rehabilitation — oligoarthritis 48.08%, polyarthritis 36.54%, systemic 9.62% and enthesitis-related 5.77%, with function worse than peers in arising, walking, activities and pain (Naser 2019); at the Al-Rusafa and Kadhimiya teaching hospitals, 66 children, 29 with polyarthritis, 54.5% girls, peak age 1–4 years, and only 4 positive for antinuclear antibodies (Al-Obaidi 2023); in Al-Diwaniya with the University of Baghdad, 74% of 50 children stayed in active disease, and the commonest medication barriers were interruption (21.6%) and running out of supply (13.5%) (Almansi 2025); Iraq has no regulation of biosimilars (Al Ani 2019), and Arab countries have 0.84 rheumatologists per 100,000 (Ziade 2023). In the region: population prevalence is 3.43 per 100,000 in Sharkia, Egypt (Abou El-Soud 2013) and 20 in Oman (Abdwani 2015); in 702 children from seven Arab countries systemic disease was 24.5%, and consanguinity and an affected sibling went with more damage (Al-Mayouf 2021b); uveitis is 5.9% in Africa and the Middle East against about 19% in Europe, poorer countries have more disease activity and damage, and damage goes with referral delay (Consolaro 2019); in the UAE it took nine months to reach a paediatric rheumatologist and one child went blind from uveitis (Khawaja 2017), and leg-length difference affected 24.3% of oligoarticular disease in Saudi Arabia (Moued 2013). There is no Iraqi physiotherapy trial (a documented zero result). " +
    "Guidelines: the 2019 American guideline conditionally recommends physical and occupational therapy for polyarthritis and for those at risk of functional limitation (low evidence for physical therapy and very low for occupational therapy), escalates drugs even for a single active joint, and calls the data 'very limited' (Ringold 2019); the 2021 American guideline conditionally recommends both regardless of medication — for range of motion, particularly with contractures, strength, endurance, function, injury prevention and participation — with 23 of 33 recommendations conditional and no physiotherapist on the voting panel (Onel 2022b), strongly recommends joint steroid injection for oligoarthritis, calls the jaw joint a 'high-risk joint', and notes that macrophage activation syndrome accompanies up to 40% of systemic disease and is life-threatening (Onel 2022a); the eye guideline: screening every three months at high risk and every 6–12 months otherwise (Angeles-Han 2019), with the European (Constantin 2018) and Nordic (Leinonen 2023) ones; the European guideline for systemic disease (Fautrel 2024); the Ottawa Panel: Pilates, the home programme and aquatic exercise grade A, and aerobic karate C+ (Cavallo 2017); the Canadian statement: children take part in sport safely without flares, and 'within pain limits' with an inflamed joint (Philpott 2010); the World Health Organization: an average of sixty minutes a day and muscle- and bone-strengthening on three days a week, including for children with disability (Bull 2020); the British standards of care: active disease reviewed at least every four months, the eye checked within six weeks of referral, and a painful eye within a week (Davies 2010); the jaw consensus: physiotherapy may help, with no data in this disease (Stoustrup 2023); and the Canadian device guideline: an open growth plate is a precaution for ultrasound, laser and stimulation, and superficial heat is contraindicated for anyone who cannot report in time (Houghton 2010). The only Cochrane review: three trials and 212 children with no significant benefit and no harm, and 'exercise does not exacerbate arthritis' (Takken 2008); later, function −0.41 and the six-minute walk +26.7 metres (Tong 2026), and pain −1.37 out of 10 (Musso-Daury 2024). " +
    "Dose: in 13 trials (672 children), 61% of arms ran three times a week, 65% lasted 12 to under 28 weeks, sessions were 45–60 minutes in 44%, with no adverse events (Iversen 2022), and the quality review gives 30–50 minutes two or three times a week for 12–24 weeks (Klepper 2019); no trial has compared the number of sessions a week, and no trial has tested a daily four-week outpatient block in children (a documented zero result); the only intensive block was 16 one-hour sessions over two weeks, then weekly or fortnightly for two months — 61% improved without a flare (Epps 2005). Parents deliver most of the dose: one hospital day and three parent-supervised days (Tarakci 2012), and two centre sessions and one home session by video (Klepper 1999), while adherence to home-only training was 47% and falling (Houghton 2018); school rules out daily attendance: 69% missed three weeks or more in Egypt (Abdul-Sattar 2014a). " +
    "So the protocol: the default pathway is 24 sessions at three a week × 45 minutes (eight weeks, or up to twelve at two a week), with the family learning the home programme in sessions 1–3 and doing it on 3–4 other days with a diary; session length by age is Saleem's call: 30–40 minutes under six, 45 at 6–11, and 50–60 for adolescents; an option for families who can attend daily after a flare, an injection or a new contracture: 12 sessions at six a week for two weeks (Epps 2005), then 12 at one or two a week to week 12 (Tarakci 2012); the light pathway for inactive or minimally active oligoarthritis (Trincianti 2021): 6–12 sessions for the home programme, orthoses and school; one extension of twelve by a written criterion, then home three times a week or more towards the World Health Organization targets (Bull 2020), a review every 3–4 months with the rheumatologist (Davies 2010), and a new block after a flare, an injection or surgery. Three phases: 1–6 assessment, education and orthoses; 7–18 progressive training; 19–24 participation in school, play and prayer. The centre has no pool, and land therapy matched land plus pool (Epps 2005).",
  ],
  goals: [
    "• تتحسّن الوظيفةُ بالاستبيان −٠٫١٣ فأكثر — أصغرُ تحسّنٍ مهمّ (Dempster 2001).\n" +
    "• ينقص الألمُ ١٠ ملم فأكثر من ١٠٠ (Powell 2001)، أو وجهين بمقياس الوجوه (اقتراح).\n" +
    "• يزيد المشيُ ستّ دقائق ٦٥ متراً فأكثر — أصغرُ فرقٍ يُكتشف (Pritchard 2022) — ويقترب من المتوقّع لعمره وطوله ووزنه (Ben Saad 2009).\n" +
    "• لا يزيد عددُ المفاصل النشطة، ويتحسّن المدى في المفاصل المحدودة (Len 1999)، وفتحُ الفم إن أُصيب الفكّ (Muller 2013 · Vassis 2023).\n" +
    "• يبلغ أهدافَه بمقياس بلوغ الأهداف أو بالأداء الكنديّ بالعربية (Steenbeek 2007 · Hadoush 2026).\n" +
    "• يؤدّي البرنامجَ المنزليّ ثلاثةَ أيّامٍ في الأسبوع فأكثر مع الأهل، ويعود إلى درس الرياضة واللعب نحو ستّين دقيقة في اليوم (Bull 2020 · Philpott 2010).\n" +
    "• السلامة: فحصُ العين في موعده، وعلاماتُ الخطر معروفةٌ للأهل، والمساندُ مضبوطة والجلدُ سليم، والإحالاتُ مرسَلة (Angeles-Han 2019 · Fautrel 2024).",
    "• Function on the questionnaire improves by −0.13 or more — the minimal important improvement (Dempster 2001).\n" +
    "• Pain falls by 10 mm or more out of 100 (Powell 2001), or two faces on the faces scale (a proposal).\n" +
    "• The six-minute walk rises by 65 metres or more — the smallest detectable difference (Pritchard 2022) — towards the value expected for age, height and weight (Ben Saad 2009).\n" +
    "• The active joint count does not rise, range improves in the limited joints (Len 1999), and mouth opening improves if the jaw is involved (Muller 2013 · Vassis 2023).\n" +
    "• The goals are met on Goal Attainment Scaling or the Arabic Canadian Occupational Performance Measure (Steenbeek 2007 · Hadoush 2026).\n" +
    "• The child does the home programme on three days a week or more with the family, and returns to physical education and play, towards sixty minutes a day (Bull 2020 · Philpott 2010).\n" +
    "• Safety: the eye check on time, the warning signs known to the family, orthoses fitted with healthy skin, and referrals sent (Angeles-Han 2019 · Fautrel 2024).",
  ],
  assessment: [
    "قبل الجلسة الأولى من رسالة طبيب المفاصل والأهل، وتكملتُه في الجلسات ١–٢:\n" +
    "• المرض: الفئة (Petty 2004)، والأدوية — يومُ الميثوتريكسات، والدواءُ الحيويّ، وجرعةُ الكورتيزون — وآخرُ حقنٍ في مفصل، ونشاطُ المرض من الطبيب: مقياسُ JADAS10 السريريّ للخامل والأدنى والعالي ١٫١ و٤ و١٢ لقليل المفاصل و٢٫٥ و٥ و١٦ لمتعدّدها (Trincianti 2021).\n" +
    "• العين: تاريخُ آخر فحص وموعدُ التالي بجدول خطره (Angeles-Han 2019 · Davies 2010).\n" +
    "• علاماتُ الخطر (في «موانع الاستعمال») والرقبة: ألمٌ أو ميلٌ أو نقصٌ في حركتها (Kotecki 2021 · Hospach 2014 · Quesada-Masachs 2025).\n" +
    "• الفحص: المفاصلُ النشطة والمحدودة (Giannini 1997)، والفحصُ السريع للعضلات والمفاصل للأطفال (Foster 2006)، والفكُّ في كلّ زيارة (Stoustrup 2017)، والقدمُ والحذاء (Hendry 2008)، وطولُ الساقين من الشوكة الحرقفية الأمامية العليا إلى الكعب الإنسيّ (Sherry 1999)، وقوّةُ مدّ الركبة — أحسُّ علامة (Hansmann 2015)، والقبضة (Rashed 2018).\n" +
    "• المقاييس: استبيانُ الوظيفة (CHAQ) — مزروع، بالنسخة العربية السعودية المكيَّفة للأطفال العرب (Madi 2004) أو المصرية (El Miedany 2003)، يكتبه أحدُ الوالدين دون الثامنة والطفلُ بعدها (اقتراح)، والفرقُ المهمّ −٠٫١٣ (Dempster 2001)؛ وعددُ المفاصل النشطة — مزروع، من الطبيب أو الأخصائيّ؛ والألمُ بمقياس الوجوه من الرابعة (Hicks 2001)، وبالعربية من الثامنة (Finianos 2021)؛ والإضافيةُ في بند سليم.\n" +
    "• المسار — يضبطه الأخصائيّ ويعدّل عددَ جلسات نسخة المريض: الافتراضيّ ٢٤ بثلاثٍ في الأسبوع؛ واليوميّ أوّلاً بعد نوبةٍ أو حقنٍ أو تيبّسٍ جديد ١٢ ثمّ ١٢؛ والخفيفُ ٦–١٢ لقليل المفاصل الخامل أو الأدنى نشاطاً.\n" +
    "• الأهداف: يختارها الطفلُ وأهلُه بمقياس بلوغ الأهداف (Steenbeek 2007).\n" +
    "• يُعاد القياسُ في الجلسة ١٢ و٢٤، و٣٦ إن مُدّد، وفي كلّ مراجعة.",
    "Before the first session from the rheumatologist's letter and the family, completed over sessions 1–2:\n" +
    "• The disease: the category (Petty 2004), the medicines — the methotrexate day, the biologic and the steroid dose — the last joint injection, and disease activity from the doctor: clinical JADAS10 cut-offs for inactive, minimal and high activity of 1.1, 4 and 12 in oligoarthritis and 2.5, 5 and 16 in polyarthritis (Trincianti 2021).\n" +
    "• The eye: the date of the last check and the next one by the child's risk schedule (Angeles-Han 2019 · Davies 2010).\n" +
    "• Red flags (under 'Contraindications') and the neck: pain, tilt or reduced movement (Kotecki 2021 · Hospach 2014 · Quesada-Masachs 2025).\n" +
    "• Examination: active and limited joints (Giannini 1997), the paediatric musculoskeletal screen (Foster 2006), the jaw at every visit (Stoustrup 2017), the feet and shoes (Hendry 2008), leg length from the anterior superior iliac spine to the medial malleolus (Sherry 1999), knee extension strength — the most sensitive marker (Hansmann 2015), and grip (Rashed 2018).\n" +
    "• Measures: the function questionnaire (CHAQ) — seeded, in the Saudi Arabic version adapted for Arab children (Madi 2004) or the Egyptian one (El Miedany 2003), completed by a parent under eight and by the child from then on (a proposal), with an important difference of −0.13 (Dempster 2001); the active joint count — seeded, by the doctor or the specialist; pain on the faces scale from age four (Hicks 2001), and in Arabic from age eight (Finianos 2021); the additional ones are in Saleem's item.\n" +
    "• The pathway — set by the specialist, who adjusts the number of sessions in the patient's copy: default 24 at three a week; daily-start after a flare, an injection or a new contracture, 12 then 12; light, 6–12, for inactive or minimally active oligoarthritis.\n" +
    "• Goals: chosen by the child and family on Goal Attainment Scaling (Steenbeek 2007).\n" +
    "• Remeasured at sessions 12 and 24, and 36 if extended, and at every review.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• المدى: روتينُ الصباح باللعب يومياً، ومدى المفاصل المصابة بالقياس (Tarakci 2012 · Onel 2022b).\n" +
    "• القوّة: حول المفصل النشط ثابتةٌ بلا حمل، ثمّ ٣ × ١٠ بأثقالٍ حرّة أو لعبٍ وظيفيّ (Lindehammar 1998 · Sandstedt 2013)، والجذع (Elnaggar 2021)، والبيلاتس ٥ ⟵ ٨ ⟵ ١٠ (Mendonca 2013).\n" +
    "• التوازنُ والإحساس بوضع المفاصل (Baydogan 2015).\n" +
    "• الهوائيّ: ٢٥–٣٠ دقيقة بلا قفز بشدّةٍ متوسّطة — نحو ٧٥٪ من أقصى النبض أو «يتكلّم ونفَسُه أسرع» (Klepper 1999 · Singh-Grewal 2007).\n" +
    "• العظم: القفزُ حين تهدأ مفاصلُ الساق (Sandstedt 2012).\n" +
    "• المساند — إحالةٌ إلى قسم المساند في المركز: النعلُ لألم القدم أوّلاً، بأقوى دليل (Fellas 2025 · Powell 2005)؛ وجبيرةُ مدّ الركبة الليلية وجبيرةُ الرسغ واليد بقرار الطبيب والأخصائيّ — ولا تجربةَ مضبوطة لجبائر الراحة ولا للجبس المتسلسل (بحثٌ صفريّ · Fredriksen 2000 · Eberhard 1993)؛ ورفعُ الحذاء لفرق طول الساقين — بلا دراسةٍ لحدّه (Moued 2013 · Sherry 1999)؛ ولا جبيرةَ للراحة بعد الحقن (Flanagan 2019).\n" +
    "• الفكُّ والصلاةُ والمدرسة (Vassis 2023 · Madi 2004 · Philpott 2010).\n" +
    PRACTICE_RULE_AR,
    "The phased programme and its cards are under 'Programme by phase'; in summary:\n" +
    "• Range of motion: the play-based morning routine daily, and measured range of the affected joints (Tarakci 2012 · Onel 2022b).\n" +
    "• Strength: isometric with no load around an active joint, then 3 × 10 with free weights or functional play (Lindehammar 1998 · Sandstedt 2013), the core (Elnaggar 2021), and Pilates 5 → 8 → 10 (Mendonca 2013).\n" +
    "• Balance and proprioception (Baydogan 2015).\n" +
    "• Aerobic: 25–30 minutes without jumping at moderate intensity — about 75% of maximum heart rate, or 'can talk, breathing faster' (Klepper 1999 · Singh-Grewal 2007).\n" +
    "• Bone: jumping once the leg joints are quiet (Sandstedt 2012).\n" +
    "• Orthoses — a referral to the centre's orthotics department: foot orthoses for foot pain first, with the strongest evidence (Fellas 2025 · Powell 2005); a night knee extension splint and a wrist and hand splint by the doctor's and specialist's decision — with no controlled trial of resting splints or of serial casting (a documented zero result · Fredriksen 2000 · Eberhard 1993); a shoe raise for leg-length difference — with no study of its threshold (Moued 2013 · Sherry 1999); and no resting splint after an injection (Flanagan 2019).\n" +
    "• The jaw, prayer and school (Vassis 2023 · Madi 2004 · Philpott 2010).\n" +
    PRACTICE_RULE_EN,
  ],
  contraindications: [
    "قواعدُ إحالةٍ يطبّقها المعالج:\n" +
    "• الطوارئ أو الطبيب في اليوم نفسه — تُوقف الجلسة:\n" +
    "– طفلٌ يبدو مريضاً بحمّى وطفح، أو بالشكل الجهازيّ وحمّاه مستمرّة: حمّى متقطّعة ٣٩ درجة فأكثر سبعةَ أيّامٍ فأكثر وطفحٌ ورديٌّ عابر على الجذع (Fautrel 2024)، وهو تشخيصُ استبعادٍ يتأخّر كثيراً (Alkwai 2021).\n" +
    "– شبهةُ متلازمة تنشّط البلعميات: حمّى مستمرّة، وتضخّمُ الطحال أو الكبد، ونزفٌ أو كدمات، أو اضطرابٌ في الوعي — الوفاةُ ٨٪ وثلثُهم احتاج العنايةَ المركّزة، والحمّى عند ٩٦٪ وتضخّمُ الكبد ٧٠٪ والدماغُ ٣٥٪ والنزفُ ٢٠٪ (Minoia 2014)، وقد تقع في أيّ وقت (Fautrel 2024 · Onel 2022a)، ولها معاييرُ تصنيفٍ دولية (Ravelli 2016)؛ وسعالٌ مستمرّ أو ضيقُ نفَس أو تعجّرُ الأصابع ⟵ فحصُ الرئة (Fautrel 2024).\n" +
    "– مفصلٌ حارٌّ متورّم مع حمّى أو رفضِ الوقوف عليه أو طفلٌ مريضٌ جدّاً — التهابُ المفصل الجرثوميّ: مع علامةٍ واحدة من أربع (الحمّى، ورفضُ الوقوف، والترسيبُ ٤٠ فأكثر، والكريّاتُ البيض فوق ١٢٠٠٠) احتمالُه ٣٪، ومع اثنتين ٤٠٪، وثلاثٍ ٩٣٪، وأربعٍ ٩٩٫٦٪ (Kocher 1999).\n" +
    "– حمّى عند طفلٍ على دواءٍ حيويّ أو كورتيزونٍ بجرعةٍ عالية: الجرعةُ ١٠ ملغ في اليوم فأكثر رفعت الالتهابَ الجرثوميّ ٣٫١ مرّة (Beukelman 2012)، والالتهاباتُ الخطيرة لكلّ ألف سنةِ مريض ٨٫١ مع الإيتانرسبت و٩٫٧ مع الأداليموماب و١٫٦ مع الميثوتريكسات (Becker 2017).\n" +
    "– عينٌ حمراء مؤلمة مع خوفٍ من الضوء — التهابُ مقدّم العنبية الحادّ في المرتبط بالتهاب مرتكزات الأوتار (Angeles-Han 2019): طبيبُ العيون خلال أسبوعٍ على الأكثر (Davies 2010)، واليومَ نفسَه أحوط (اقتراح).\n" +
    "– الرقبة: ألمٌ جديد مع ضعفٍ أو تنميلٍ في الذراع أو الساق أو تغيّرٍ في المشي، أو ميلٌ بعد إصابةٍ بسيطة — فقد يكون خلعاً جزئيّاً بين الفقرتين العنقيتين الأولى والثانية (Kotecki 2021 · Hospach 2014).\n" +
    "• إلى طبيب المفاصل خلال أيّام: تورّمٌ جديد أو نوبةٌ أكثرَ من ٤٨ ساعة، أو زيادةُ المفاصل النشطة، أو تيبّسُ صباحٍ يسوء (Ringold 2019)؛ وميلُ رقبةٍ مستمرّ عند طفلٍ بلا مرضٍ معروف فيها — فالرقبةُ قد تكون أوّلَ المرض، والميلُ عند ٨٨٫٩٪ منهم (Quesada-Masachs 2025)؛ وما لا يشبه هذا المرض — ألمُ العظم أو الليل فوق المتوقّع، والشحوب، والكدمات، ونقصُ الوزن: ٩٢٪ من أطفال ابيضاض الدم الليمفاويّ الحادّ لهم خطٌّ دمويّ ناقصٌ واحد على الأقلّ، وخطرُه ٩٪ و٦٧٪ و١٠٠٪ مع خطٍّ واحد أو اثنين أو ثلاثة (Brix 2020)؛ وأعراضُ الفكّ أو فتحُ الفم دون معيار عمره (Muller 2013) ⟵ ومعه طبيبُ تقويم الأسنان (Stoustrup 2023)؛ وفرقُ طول الساقين الذي يزيد أو التيبّسُ الثابت الذي لم يتحسّن بكتلة ⟵ جرّاحُ العظام (Sherry 1999 · Skytta 2003)؛ وكسرٌ من إصابةٍ بسيطة ⟵ صحّةُ العظم، فقلّةُ الكثافة حول المفاصل تزيد خطرَ الكسر (Burnham 2006 · Thornton 2008 · Philpott 2010)؛ وتباطؤُ النموّ (Bechtold 2007).\n" +
    "• العيون — روتينيّاً: في بداية كلّ كتلة يُقارَن تاريخُ آخر فحصٍ بالجدول — كلَّ ثلاثة أشهر لعالي الخطر (قليلُ المفاصل، ومتعدّدُها السلبيُّ لعامل الروماتويد، والصدفيّ، وغيرُ المصنَّف، مع إيجابية الأجسام المضادّة للنواة، وبدءٍ قبل السابعة، ومدّةٍ أربعُ سنواتٍ فأقلّ)، وكلَّ ٦–١٢ شهراً لغيره (Angeles-Han 2019)، وأوّلُ فحصٍ خلال ستّة أسابيع من الإحالة (Davies 2010)؛ والتهابُ العنبية صامتٌ غالباً والفحصُ المجدول يمنع فقدَ البصر (Cassidy 2006)، وأعلى خطرٍ ٤٧٪ في البنات الإيجابيات بدءاً في سنّ ١–٢ (Saurenmann 2010)، فيُحال من تأخّر فحصُه.\n" +
    "• النفسُ والمدرسة: المزاجُ والقلق (Fair 2019)، والغيابُ عن المدرسة (Abdul-Sattar 2014a · Nordal 2019)، والألمُ المنتشر المزمن مع الإعياء أكثرَ من ثلاثة أشهر — قد يكون الألمَ العضليّ الليفيّ اليفعيّ، عند ٦٫٧٪ (Ozomay Baykal 2025).\n" +
    "احتياطاتُ الأجهزة والتمرين:\n" +
    "• الحرارةُ السطحية لا تُعطى لطفلٍ لا يستطيع أن يقول «حارّ» في وقته (Houghton 2010)، ولا على مفصلٍ حارٍّ متورّم.\n" +
    "• الأمواجُ فوق الصوتية والليزرُ والتحفيزُ الكهربائيّ والحرارةُ العميقة تحذيرٌ فوق صفيحة النموّ المفتوحة (Houghton 2010)، والموجاتُ الصادمة يمنعها صانعو الأجهزة فوقها (RCPod 2023).\n" +
    "• الرقبةُ المصابة: لا تقويمَ ولا شدَّ ولا مقاومةَ في نهاية مداها حتى ينفي طبيبُ المفاصل عدمَ ثبات الفقرتين الأولى والثانية، والصورةُ قبل رياضات الاحتكاك (Philpott 2010 — وتطبيقُه على العلاج اقتراح)؛ ولا تُعطى قبل ذلك تمارينُ الرقبة الكاملة ولا تحريكُها الذاتيّ بالمنشفة (اقتراح — Kotecki 2021).\n" +
    "• اللقاحاتُ والعدوى بخطّة الطبيب، والحيّةُ تُتجنَّب مع كبت المناعة (Onel 2022b)؛ وحقنُ المفصل بلا جبيرةٍ ولا راحةٍ طويلة بعده (Flanagan 2019 · Wallen 2006).\n" +
    "• ولا يُنصح الطفلُ أو أهلُه أبداً بإيقاف دوائه أو تبديل جرعته؛ وانقطاعُه يُبلَّغ به الطبيب (Almansi 2025).",
    "Referral rules the therapist applies:\n" +
    "• Emergency, or the doctor the same day — the session stops:\n" +
    "– A child who looks unwell with fever and a rash, or with systemic disease and persistent fever: spiking fever of 39 °C or more for seven days or more and a transient salmon-pink rash on the trunk (Fautrel 2024), a diagnosis of exclusion that is often delayed (Alkwai 2021).\n" +
    "– Suspected macrophage activation syndrome: persistent fever, an enlarged spleen or liver, bleeding or bruising, or altered consciousness — mortality is 8% and a third needed intensive care, with fever in 96%, liver enlargement 70%, brain involvement 35% and bleeding 20% (Minoia 2014), and it can occur at any time (Fautrel 2024 · Onel 2022a), with international classification criteria (Ravelli 2016); a persistent cough, breathlessness or finger clubbing → the lungs are checked (Fautrel 2024).\n" +
    "– A hot, swollen joint with fever, refusal to bear weight on it, or a very unwell child — septic arthritis: with one sign of four (fever, refusal to bear weight, sedimentation rate of 40 or more, and a white cell count above 12,000) its probability is 3%, with two 40%, three 93%, and four 99.6% (Kocher 1999).\n" +
    "– Fever in a child on a biologic or on high-dose steroids: 10 mg a day or more raised bacterial infection 3.1-fold (Beukelman 2012), and serious infections per 1,000 patient-years were 8.1 with etanercept, 9.7 with adalimumab and 1.6 with methotrexate (Becker 2017).\n" +
    "– A painful red eye with light sensitivity — acute anterior uveitis in enthesitis-related disease (Angeles-Han 2019): the eye doctor within a week at the latest (Davies 2010), and the same day is safer (a proposal).\n" +
    "– The neck: new pain with weakness or numbness in an arm or leg or a change in walking, or a tilt after a minor injury — it may be a partial dislocation between the first and second neck vertebrae (Kotecki 2021 · Hospach 2014).\n" +
    "• To the rheumatologist within days: new swelling or a flare lasting more than 48 hours, a rising active joint count, or worsening morning stiffness (Ringold 2019); a persistent neck tilt in a child with no known neck disease — the neck can be the first sign of the disease, with tilt in 88.9% (Quesada-Masachs 2025); features that do not fit this disease — bone pain or night pain out of proportion, pallor, bruising and weight loss: 92% of children with acute lymphoblastic leukaemia have at least one low blood cell line, and its risk is 9%, 67% and 100% with one, two or three low lines (Brix 2020); jaw symptoms, or mouth opening below the norm for age (Muller 2013) → together with the orthodontist (Stoustrup 2023); a growing leg-length difference, or a fixed contracture not improved by a block → the orthopaedic surgeon (Sherry 1999 · Skytta 2003); a fracture after minor trauma → bone health, as bone thinning around the joints raises fracture risk (Burnham 2006 · Thornton 2008 · Philpott 2010); and slowing growth (Bechtold 2007).\n" +
    "• The eyes — routinely: at the start of every block the date of the last check is compared with the schedule — every three months at high risk (oligoarthritis, rheumatoid-factor-negative polyarthritis, psoriatic or undifferentiated disease with positive antinuclear antibodies, onset before seven, and disease of four years or less), and every 6–12 months otherwise (Angeles-Han 2019), with the first check within six weeks of referral (Davies 2010); uveitis is usually silent and scheduled examination prevents loss of vision (Cassidy 2006), and the highest risk, 47%, is in antibody-positive girls with onset at 1–2 years (Saurenmann 2010), so a child whose check is overdue is referred.\n" +
    "• Mood and school: mood and anxiety (Fair 2019), school absence (Abdul-Sattar 2014a · Nordal 2019), and chronic widespread pain with fatigue for more than three months — it may be juvenile fibromyalgia, found in 6.7% (Ozomay Baykal 2025).\n" +
    "Device and exercise precautions:\n" +
    "• Superficial heat is not given to a child who cannot say 'hot' in time (Houghton 2010), nor over a hot, swollen joint.\n" +
    "• Ultrasound, laser, electrical stimulation and deep heat are precautions over an open growth plate (Houghton 2010), and device makers contraindicate shockwave over it (RCPod 2023).\n" +
    "• An involved neck: no manipulation, no traction and no resisted end-range work until the rheumatologist has excluded instability of the first and second neck vertebrae, with an X-ray before contact sport (Philpott 2010 — applying this to therapy is a proposal); full-range neck exercises and towel self-mobilisation are not given before then (a proposal — Kotecki 2021).\n" +
    "• Vaccines and infection follow the doctor's plan, and live vaccines are avoided during immunosuppression (Onel 2022b); a joint injection is followed by no splint and no prolonged rest (Flanagan 2019 · Wallen 2006).\n" +
    "• And the child or family is never advised to stop a medicine or change its dose; an interruption is reported to the doctor (Almansi 2025).",
  ],
  precautions: [
    "• قاعدةُ الجلسة في «التمارين» لكلّ المراحل، والجلسةُ بالعمر، والطفلُ يلعب لا «يتمرّن» وحده: الأهلُ يحضرون كلَّ جلسة ويتعلّمون ما يكرّرونه (Tarakci 2012)، والالتزامُ في البيت وحده قليلٌ ويقلّ (Houghton 2018 · Sule 2019)، وعوائقُه الوقتُ والأعراضُ وقلّةُ المتعة (Hu 2024)، والمراهقون أقلُّ التزاماً بالجبيرة (Kirchner 2023) — فلوحةُ ملصقاتٍ وسجلٌّ أو صورةٌ بالهاتف، والتمارينُ قصيرةٌ ممتعة.\n" +
    "• الصلاةُ والجلوسُ على الأرض والمرحاضُ العربيّ: أصعبُ المهامّ في النسخة العربية لاستبيان الوظيفة (Madi 2004)، ولا دراسةَ للصلاة في هذا المرض (بحثٌ صفريّ) — تُدرَّب مهامَّ في المرحلة الثالثة، والكرسيُّ أو المقعدُ للصلاة ما دامت الركبتان أو الوركان أو الكاحلان نشطة، وإطارُ المرحاض أو مقعدُه عند الحاجة (اقتراح)، والحكمُ الشرعيّ للطفل وأهله ومرجعهم (بطاقتُها).\n" +
    "• المدرسة: في مصر غاب ٦٩٪ ثلاثةَ أسابيع فأكثر وضعف أداءُ ٤٦٪، والريفُ أكثرُ غياباً (Abdul-Sattar 2014a)، والغيابُ في البداية تنبّأ بنتيجةٍ أسوأ و٨٠٫٢٪ شاركوا كاملاً في درس الرياضة بعد ثماني سنوات (Nordal 2019) — فالجلساتُ خارجَ ساعات المدرسة ما أمكن (اقتراح)، ورسالةٌ للمدرسة بما يُسمح في درس الرياضة، والحقيبةُ بالحمّالتين.\n" +
    "• الحرّ وانقطاعُ الكهرباء: الطفلُ يضبط حرارتَه كالكبير إذا شرب، وضربةُ الحرّ من قلّة الماء والجهد الزائد وقلّة الراحة واللبس الثقيل وتُتّقى (AAP 2011) — فالتمرينُ صباحاً أو مساءً أو في قاعةٍ مكيّفة بفترات ماء، وفي البيت روتينُ الحرّ والانقطاع (بطاقتُه)؛ ولا بياناتِ للانقطاع في هذا المرض (بحثٌ صفريّ).\n" +
    "• رمضان: لا دراسةَ لصيام الأطفال بهذا المرض (بحثٌ صفريّ) — للمراهق الذي يصوم: الجلسةُ بعد الإفطار، ولا شدّةَ عالية صائماً، ومواعيدُ الدواء لطبيب المفاصل (اقتراح).\n" +
    "• الدواءُ والكلفةُ والطريق: في الديوانية بقي ٧٤٪ في مرضٍ نشط وأكثرُ العوائق انقطاعُ الدواء ونفادُه (Almansi 2025)، ولا تنظيمَ للبدائل الحيوية (Al Ani 2019)، والبلدُ الأفقر أكثرُ ضرراً وتأخّرُ الإحالة يصحبه الضرر (Consolaro 2019) — فانقطاعُ الدواء يُسأل عنه في كلّ جلسة ويُبلَّغ الطبيب؛ وزياراتٌ أقلّ للتعليم مع برنامجٍ منزليّ يؤدّيه الأهل تطابق نماذجَ التجارب وتخفّف الكلفةَ والطريق (Tarakci 2012 · Klepper 1999)، وفي البصرة يُعالَج الأطفالُ في مراكز التأهيل (Naser 2019).\n" +
    "• الأسرة: عبءُ الأهل المادّيّ والوقتيّ (Mawani 2013)، والقرابةُ وإصابةُ الأخ شائعتان وتصحبان ضرراً أكثر (Al-Mayouf 2021b) — فيُسأل عن الإخوة، ويُدرَّب من يحضر من الأهل.\n" +
    "• الوزنُ والعظمُ وفيتامين د: زيادةُ الوزن ٤١٫٤٪ والسمنةُ ٢٢٫٤٪ في المغرب (Amine 2011)، ونقصُ فيتامين د ٧٥٪ (Bouaddi 2014)، والكثافةُ أقلُّ من −٢ عند ٣١٪ في مصر (Eid 2023) — القفزُ في المرحلة الثالثة، والغذاءُ والفيتامينُ للطبيب (Onel 2022b · Nisar 2013).\n" +
    "• الطبُّ البديل: يستعمله ٣٤–٩٢٪ (April 2011)، والحميةُ «لعلاج المرض» ضدّها توصيةٌ قويّة، والأعشابُ والمكمّلاتُ ضدّها مشروطة (Onel 2022b) — يُسأل عنها بلا لوم (اقتراح).\n" +
    "• المسبح: لا مسبحَ في المركز — والعلاجُ على الأرض ساوى الأرضَ مع المسبح بلا مبرّرٍ لكلفة بنائه (Epps 2005)، والمسبحُ أنقص الألمَ ورفع اللياقة بلا أثرٍ في الوظيفة (Verit 2026).\n" +
    "• الانتقال: من أوائل المراهقة يُحضَّر للانتقال إلى طبّ الكبار (Foster 2017)، وتوصياتُ النشاط الأوروبية للكبار تصلح عندها (EULAR 2018 PA · EULAR 2025 PA).\n" +
    "• الصورُ والفيديو بموافقة الأهل المكتوبة وحدها، ولا تُرسل خارجَ ملفّه، وصورُ الجسم بحضور أحد الوالدين، والأخصائيّةُ للبنات عند الطلب (اقتراح).",
    "• The session rule under 'Exercises' for every phase, session length by age, and the child plays rather than 'exercises' alone: a parent attends every session and learns what to repeat (Tarakci 2012), adherence to home-only training is low and falls (Houghton 2018 · Sule 2019), its barriers are time, symptoms and lack of fun (Hu 2024), and adolescents adhere less to splints (Kirchner 2023) — so a sticker chart, a diary or a phone photo, and short, fun exercises.\n" +
    "• Prayer, floor sitting and the squat toilet: the hardest tasks in the Arabic version of the function questionnaire (Madi 2004), and there is no study of prayer in this disease (a documented zero result) — they are practised as tasks in phase 3, with a chair or stool for prayer while the knees, hips or ankles are active, and a toilet frame or seat when needed (a proposal); the religious ruling is for the child, the family and their scholar (its card).\n" +
    "• School: in Egypt 69% missed three weeks or more and 46% functioned poorly at school, with rural children absent more (Abdul-Sattar 2014a), and absence at baseline predicted a worse outcome, while 80.2% took full part in physical education at eight years (Nordal 2019) — so sessions outside school hours where possible (a proposal), a letter to the school about what is allowed in physical education, and the bag carried on both straps.\n" +
    "• Heat and power cuts: a child thermoregulates as well as an adult when hydrated, and heat illness comes from too little water, overexertion, too little recovery and heavy clothing, and is preventable (AAP 2011) — so exercise in the morning or evening or in an air-conditioned room with water breaks, and at home the heat and power-cut routine (its card); there are no data on power cuts in this disease (a documented zero result).\n" +
    "• Ramadan: there is no study of children with this disease fasting (a documented zero result) — for an adolescent who fasts: the session after Iftar, no high intensity while fasting, and medicine times for the rheumatologist (a proposal).\n" +
    "• Medicines, cost and travel: in Al-Diwaniya 74% stayed in active disease and the commonest barriers were medicine interruptions and running out of supply (Almansi 2025), there is no regulation of biosimilars (Al Ani 2019), and poorer countries see more damage, with damage following referral delay (Consolaro 2019) — so interruptions are asked about at every session and reported to the doctor; fewer, teaching-focused visits with a home programme delivered by the family match the trial models and lower cost and travel (Tarakci 2012 · Klepper 1999), and in Basrah children are treated at rehabilitation centres (Naser 2019).\n" +
    "• The family: the financial and time burden on parents (Mawani 2013), and consanguinity and an affected sibling are common and go with more damage (Al-Mayouf 2021b) — so siblings are asked about, and whichever family member attends is trained.\n" +
    "• Weight, bone and vitamin D: overweight 41.4% and obesity 22.4% in Morocco (Amine 2011), low vitamin D 75% (Bouaddi 2014), and bone density below −2 in 31% in Egypt (Eid 2023) — jumping in phase 3, and diet and vitamins for the doctor (Onel 2022b · Nisar 2013).\n" +
    "• Complementary medicine: used by 34–92% (April 2011); a 'diet to treat the disease' is strongly recommended against, and herbs and supplements conditionally against (Onel 2022b) — they are asked about without blame (a proposal).\n" +
    "• The pool: the centre has no pool — land therapy matched land plus pool, with no case for the cost of building one (Epps 2005), and pool therapy reduced pain and raised fitness without an effect on function (Verit 2026).\n" +
    "• Transition: from early adolescence the move to adult care is prepared (Foster 2017), and the European activity recommendations for adults apply then (EULAR 2018 PA · EULAR 2025 PA).\n" +
    "• Photos and video only with the family's written consent, never sent outside the file, body photos with a parent present, and a female specialist for girls on request (a proposal).",
  ],
  spw: 3, weeks: 8, minutes: 45, totalSessions: 24,
  refs: [
    { title: "2019 American College of Rheumatology/Arthritis Foundation Guideline for the Treatment of Juvenile Idiopathic Arthritis: Therapeutic Approaches for Non-Systemic Polyarthritis, Sacroiliitis, and Enthesitis", org: "Arthritis Care Res (Hoboken) — American College of Rheumatology/Arthritis Foundation guideline for JIA: non-systemic polyarthritis, sacroiliitis and enthesitis (Ringold et al.)", year: 2019, url: "https://doi.org/10.1002/acr.23870" },
    { title: "2021 American College of Rheumatology Guideline for the Treatment of Juvenile Idiopathic Arthritis: Therapeutic Approaches for Oligoarthritis, Temporomandibular Joint Arthritis, and Systemic Juvenile Idiopathic Arthritis", org: "Arthritis Care Res (Hoboken) — American College of Rheumatology guideline for JIA: oligoarthritis, temporomandibular joint arthritis and systemic JIA (Onel et al.)", year: 2022, url: "https://doi.org/10.1002/acr.24853" },
    { title: "2021 American College of Rheumatology Guideline for the Treatment of Juvenile Idiopathic Arthritis: Recommendations for Nonpharmacologic Therapies, Medication Monitoring, Immunizations, and Imaging", org: "Arthritis Care Res (Hoboken) — American College of Rheumatology guideline for JIA: non-pharmacologic therapies, medication monitoring, immunisations and imaging (Onel et al.)", year: 2022, url: "https://doi.org/10.1002/acr.24839" },
    { title: "2019 American College of Rheumatology/Arthritis Foundation Guideline for the Screening, Monitoring, and Treatment of Juvenile Idiopathic Arthritis-Associated Uveitis", org: "Arthritis Care Res (Hoboken) — American College of Rheumatology/Arthritis Foundation guideline for JIA-associated uveitis (Angeles-Han et al.)", year: 2019, url: "https://doi.org/10.1002/acr.23871" },
    { title: "Consensus-based recommendations for the management of uveitis associated with juvenile idiopathic arthritis: the SHARE initiative", org: "Ann Rheum Dis — SHARE consensus recommendations for JIA-associated uveitis (Constantin et al.)", year: 2018, url: "https://doi.org/10.1136/annrheumdis-2018-213131" },
    { title: "A Nordic screening guideline for juvenile idiopathic arthritis-related uveitis", org: "Acta Ophthalmol — Nordic screening guideline for JIA-related uveitis (Leinonen)", year: 2023, url: "https://doi.org/10.1111/aos.15299" },
    { title: "Ophthalmologic examinations in children with juvenile rheumatoid arthritis", org: "Pediatrics — American Academy of Pediatrics clinical report on eye examinations in juvenile arthritis (Cassidy et al.)", year: 2006, url: "https://doi.org/10.1542/peds.2006-0421" },
    { title: "EULAR/PReS recommendations for the diagnosis and management of Still's disease, comprising systemic juvenile idiopathic arthritis and adult-onset Still's disease", org: "Ann Rheum Dis — EULAR/PReS recommendations for Still's disease, including systemic JIA (Fautrel et al.)", year: 2024, url: "https://doi.org/10.1136/ard-2024-225851" },
    { title: "2016 Classification Criteria for Macrophage Activation Syndrome Complicating Systemic Juvenile Idiopathic Arthritis: A European League Against Rheumatism/American College of Rheumatology/Paediatric Rheumatology International Trials Organisation Collaborative Initiative", org: "Ann Rheum Dis — EULAR/ACR/PRINTO classification criteria for macrophage activation syndrome in systemic JIA (Ravelli et al.)", year: 2016, url: "https://doi.org/10.1136/annrheumdis-2015-208982" },
    { title: "EULAR/PReS standards and recommendations for the transitional care of young people with juvenile-onset rheumatic diseases", org: "Ann Rheum Dis — EULAR/PReS standards for transitional care in juvenile-onset rheumatic diseases (Foster et al.)", year: 2017, url: "https://doi.org/10.1136/annrheumdis-2016-210112" },
    { title: "Treating juvenile idiopathic arthritis to target: recommendations of an international task force", org: "Ann Rheum Dis — international task force recommendations for treating JIA to target (Ravelli et al.)", year: 2018, url: "https://doi.org/10.1136/annrheumdis-2018-213030" },
    { title: "Ottawa Panel Evidence-Based Clinical Practice Guidelines for Structured Physical Activity in the Management of Juvenile Idiopathic Arthritis", org: "Arch Phys Med Rehabil — Ottawa Panel guidelines for structured physical activity in JIA (Cavallo et al.)", year: 2017, url: "https://doi.org/10.1016/j.apmr.2016.09.135" },
    { title: "Physical activity recommendations for children with specific chronic health conditions: Juvenile idiopathic arthritis, hemophilia, asthma and cystic fibrosis", org: "Paediatr Child Health — Canadian Paediatric Society statement on physical activity for children with JIA (Philpott et al.)", year: 2010, url: "https://doi.org/10.1093/pch/15.4.213" },
    { title: "Management of Orofacial Manifestations of Juvenile Idiopathic Arthritis: Interdisciplinary Consensus-Based Recommendations", org: "Arthritis Rheumatol — interdisciplinary TMJaw consensus recommendations on orofacial manifestations of JIA (Stoustrup et al.)", year: 2023, url: "https://doi.org/10.1002/art.42338" },
    { title: "Clinical Orofacial Examination in Juvenile Idiopathic Arthritis: International Consensus-based Recommendations for Monitoring Patients in Clinical Practice and Research Studies", org: "J Rheumatol — international consensus on the clinical orofacial examination in JIA (Stoustrup et al.)", year: 2017, url: "https://doi.org/10.3899/jrheum.160796" },
    { title: "BSPAR Standards of Care for children and young people with juvenile idiopathic arthritis", org: "Rheumatology (Oxford) — BSPAR Standards of Care for children and young people with JIA (Davies et al.)", year: 2010, url: "https://doi.org/10.1093/rheumatology/kep460" },
    { title: "ELECTROPHYSICAL AGENTS - Contraindications And Precautions: An Evidence-Based Approach To Clinical Decision Making In Physical Therapy", org: "Physiother Can — Canadian Physiotherapy Association guideline on electrophysical agents: contraindications and precautions", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "World Health Organization 2020 guidelines on physical activity and sedentary behaviour", org: "Br J Sports Med — World Health Organization 2020 guidelines on physical activity and sedentary behaviour (Bull et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2020-102955" },
    { title: "Policy statement—Climatic heat stress and exercising children and adolescents", org: "Pediatrics — American Academy of Pediatrics policy statement on climatic heat stress and exercising children and adolescents", year: 2011, url: "https://doi.org/10.1542/peds.2011-1664" },
    { title: "Consensus clinical approach for a newly diagnosed systemic juvenile idiopathic arthritis among members of the pediatric rheumatology Arab group", org: "Int J Pediatr Adolesc Med — Pediatric Rheumatology Arab Group consensus on newly diagnosed systemic JIA (Alkwai et al.)", year: 2021, url: "https://doi.org/10.1016/j.ijpam.2021.05.003" },
    { title: "Use of extracorporeal shock wave therapy for children's foot, ankle and leg concerns - international position statement", org: "International position statement — Australian Podiatry Association, Royal College of Podiatry and partners: shock wave therapy for children's foot, ankle and leg", year: 2023, url: "https://www.podiatry.org.au/documents/item/2952" },
    { title: "2018 EULAR recommendations for physical activity in people with inflammatory arthritis and osteoarthritis", org: "Ann Rheum Dis — EULAR recommendations for physical activity in inflammatory arthritis and osteoarthritis (Rausch Osthoff et al.)", year: 2018, url: "https://doi.org/10.1136/annrheumdis-2018-213585" },
    { title: "EULAR recommendations for physical activity in people with inflammatory arthritis and osteoarthritis: 2025 update", org: "Ann Rheum Dis — EULAR recommendations for physical activity in inflammatory arthritis and osteoarthritis, 2025 update (Rausch Osthoff et al.)", year: 2026, url: "https://doi.org/10.1016/j.ard.2026.03.006" },
    { title: "Ottawa Panel Evidence-Based Clinical Practice Guidelines for Electrotherapy and Thermotherapy Interventions in the Management of Rheumatoid Arthritis in Adults", org: "Phys Ther — Ottawa Panel guidelines for electrotherapy and thermotherapy in adult rheumatoid arthritis (Ottawa Panel)", year: 2004, url: "https://doi.org/10.1093/ptj/84.11.1016" },
    { title: "International League of Associations for Rheumatology classification of juvenile idiopathic arthritis: second revision, Edmonton, 2001", org: "J Rheumatol — International League of Associations for Rheumatology classification of JIA, second revision (Petty et al.)", year: 2004, url: "https://pubmed.ncbi.nlm.nih.gov/14760812/" },
    { title: "Assessment of the quality of life of Iraqi children with juvenile idiopathic arthritis: A single-center study", org: "Medical Journal of Babylon (Naser)", year: 2019, url: "https://doi.org/10.4103/mjbl.mjbl_115_18" },
    { title: "Juvenile Idiopathic Arthritis (JIA): Clinical Characteristics, Drugs, Assessment, and Disease Subtypes", org: "Biomedicine and Chemical Sciences (Al-Obaidi et al.)", year: 2023, url: "https://zenodo.org/records/15282922" },
    { title: "Challenges in application of the treat-to-target with juvenile idiopathic arthritis", org: "Siberian Medical Review (Almansi & Jassim)", year: 2025, url: "https://journals.rcsi.science/1819-9496/article/view/406634" },
    { title: "Prevalence of juvenile idiopathic arthritis in Sharkia Governorate, Egypt: epidemiological study", org: "Rheumatol Int (Abou El-Soud et al.)", year: 2013, url: "https://doi.org/10.1007/s00296-013-2707-2" },
    { title: "Epidemiology of juvenile idiopathic arthritis in Oman", org: "Pediatr Rheumatol Online J (Abdwani et al.)", year: 2015, url: "https://doi.org/10.1186/s12969-015-0030-z" },
    { title: "Oligoarticular juvenile idiopathic arthritis among Saudi children", org: "Ann Saudi Med (Moued et al.)", year: 2013, url: "https://doi.org/10.5144/0256-4947.2013.529" },
    { title: "Phenotypic variability and disparities in treatment and outcomes of childhood arthritis throughout the world: an observational cohort study", org: "Lancet Child Adolesc Health (Consolaro et al.)", year: 2019, url: "https://doi.org/10.1016/s2352-4642(19)30027-6" },
    { title: "Physical Activity Interventions in Children with Juvenile Idiopathic Arthritis: A Systematic Review of Randomized Controlled Trials", org: "Pediatric Health Med Ther (Iversen et al.)", year: 2022, url: "https://doi.org/10.2147/phmt.s282611" },
    { title: "Is hydrotherapy cost-effective? A randomised controlled trial of combined hydrotherapy programmes compared with physiotherapy land techniques in children with juvenile idiopathic arthritis", org: "Health Technol Assess (Epps et al.)", year: 2005, url: "https://doi.org/10.3310/hta9390" },
    { title: "Efficacy of a land-based home exercise programme for patients with juvenile idiopathic arthritis: a randomized, controlled, single-blind study", org: "J Rehabil Med (Tarakci et al.)", year: 2012, url: "https://doi.org/10.2340/16501977-1051" },
    { title: "The clinical meaning of functional outcome scores in children with juvenile arthritis", org: "Arthritis Rheum (Dempster et al.)", year: 2001, url: "https://doi.org/10.1002/1529-0131(200108)44:8<1768::aid-art312>3.0.co;2-q" },
    { title: "Determining the minimum clinically significant difference in visual analog pain score for children", org: "Ann Emerg Med (Powell et al.)", year: 2001, url: "https://doi.org/10.1067/mem.2001.111517" },
    { title: "Reproducibility of the Six-Minute Walk Test in Children and Youth With Juvenile Idiopathic Arthritis", org: "Arthritis Care Res (Hoboken) (Pritchard et al.)", year: 2022, url: "https://doi.org/10.1002/acr.24492" },
    { title: "Exercise therapy in juvenile idiopathic arthritis", org: "Cochrane Database Syst Rev (Takken et al.)", year: 2008, url: "https://doi.org/10.1002/14651858.cd005954.pub2" },
    { title: "Effect of exercise interventions on physical function, cardiorespiratory fitness, and health-related quality of life in patients with juvenile idiopathic arthritis: a meta-analysis of randomized controlled trials", org: "BMC Pediatr (Tong et al.)", year: 2026, url: "https://doi.org/10.1186/s12887-026-06514-1" },
    { title: "The Arabic version of childhood health assessment questionnaire modified for Arabic children", org: "Saudi Med J (Madi et al.)", year: 2004, url: "https://pubmed.ncbi.nlm.nih.gov/14758387/" },
    { title: "Temporomandibular joint rehabilitative approaches for children and adolescents affected by juvenile idiopathic arthritis: A systematic review", org: "Int J Paediatr Dent (Ferrillo et al.)", year: 2025, url: "https://doi.org/10.1111/ipd.13225" },
    { title: "Prevalence of temporomandibular disorder in children and adolescents with juvenile idiopathic arthritis - a Norwegian cross- sectional multicentre study", org: "BMC Oral Health (Fischer et al.)", year: 2020, url: "https://doi.org/10.1186/s12903-020-01234-z" },
    { title: "Impact of physiotherapy on orofacial manifestations of juvenile idiopathic arthritis", org: "Pediatr Rheumatol Online J (Vassis et al.)", year: 2023, url: "https://doi.org/10.1186/s12969-023-00900-0" },
    { title: "Regular aerobic training combined with range of motion exercises in juvenile idiopathic arthritis", org: "Biomed Res Int (Doğru Apti et al.)", year: 2014, url: "https://doi.org/10.1155/2014/748972" },
    { title: "Rehabilitation in children with juvenile chronic arthritis", org: "Baillieres Clin Rheumatol (Häfner et al.)", year: 1998, url: "https://doi.org/10.1016/s0950-3579(98)80022-8" },
    { title: "The effect of static traction and orthoses in the treatment of knee contractures in preschool children with juvenile chronic arthritis: a single-subject design", org: "Arthritis Care Res (Fredriksen et al.)", year: 2000, url: "https://doi.org/10.1002/1529-0131(200012)13:6<352::aid-art4>3.0.co;2-o" },
    { title: "Measurement of quadriceps muscle strength and bulk in juvenile chronic arthritis. A prospective, longitudinal, 2 year survey", org: "J Rheumatol (Lindehammar et al.)", year: 1998, url: "https://pubmed.ncbi.nlm.nih.gov/9818671/" },
    { title: "Dynamic knee joint function in children with juvenile idiopathic arthritis (JIA)", org: "Pediatr Rheumatol Online J (Hansmann et al.)", year: 2015, url: "https://doi.org/10.1186/s12969-015-0004-1" },
    { title: "Retrospective review of immobilization vs. immediate resumption of activity in patients with Oligoarticular juvenile idiopathic arthritis following knee injections", org: "Pediatr Rheumatol Online J (Flanagan et al.)", year: 2019, url: "https://doi.org/10.1186/s12969-019-0339-0" },
    { title: "A comparative study of orthoplast cock-up splints versus ready-made Droitwich work splints in juvenile chronic arthritis", org: "Disabil Rehabil (Eberhard et al.)", year: 1993, url: "https://doi.org/10.3109/09638289309165869" },
    { title: "Adherence, helpfulness and barriers to treatment in juvenile idiopathic arthritis - data from a German Inception cohort", org: "Pediatr Rheumatol Online J (Kirchner et al.)", year: 2023, url: "https://doi.org/10.1186/s12969-023-00811-0" },
    { title: "Intra-articular steroids and splints/rest for children with juvenile idiopathic arthritis and adults with rheumatoid arthritis", org: "Cochrane Database Syst Rev (Wallen et al.)", year: 2006, url: "https://doi.org/10.1002/14651858.cd002824.pub2" },
    { title: "Physical and Mechanical Therapies for Lower Limb Problems in Children With Juvenile Idiopathic Arthritis: A Systematic Review With Meta-Analysis", org: "J Foot Ankle Res (Fellas et al.)", year: 2025, url: "https://doi.org/10.1002/jfa2.70096" },
    { title: "Efficacy of custom foot orthotics in improving pain and functional status in children with juvenile idiopathic arthritis: a randomized trial", org: "J Rheumatol (Powell et al.)", year: 2005, url: "https://pubmed.ncbi.nlm.nih.gov/15868634/" },
    { title: "Foot orthoses in children with juvenile idiopathic arthritis: a randomised controlled trial", org: "Arch Dis Child (Coda et al.)", year: 2014, url: "https://doi.org/10.1136/archdischild-2013-305166" },
    { title: "A survey of foot problems in juvenile idiopathic arthritis", org: "Musculoskeletal Care (Hendry et al.)", year: 2008, url: "https://doi.org/10.1002/msc.134" },
    { title: "Effect of preformed foot orthoses in reducing pain in children with juvenile idiopathic arthritis: a multicentre randomized clinical trial", org: "Rheumatology (Oxford) (Fellas et al.)", year: 2022, url: "https://doi.org/10.1093/rheumatology/keab765" },
    { title: "Prevention of leg length discrepancy in young children with pauciarticular juvenile rheumatoid arthritis by treatment with intraarticular steroids", org: "Arthritis Rheum (Sherry et al.)", year: 1999, url: "https://doi.org/10.1002/1529-0131(199911)42:11<2330::aid-anr11>3.0.co;2-b" },
    { title: "Effects of Pilates exercises on health-related quality of life in individuals with juvenile idiopathic arthritis", org: "Arch Phys Med Rehabil (Mendonça et al.)", year: 2013, url: "https://doi.org/10.1016/j.apmr.2013.05.026" },
    { title: "Impact of Clinical Pilates Exercise on Pain, Cardiorespiratory Fitness, Functional Ability, and Quality of Life in Children with Polyarticular Juvenile Idiopathic Arthritis", org: "Int J Environ Res Public Health (Azab et al.)", year: 2022, url: "https://doi.org/10.3390/ijerph19137793" },
    { title: "Effects of Structured Exercise Training in Children and Adolescents With Juvenile Idiopathic Arthritis", org: "Pediatr Phys Ther (Klepper et al.)", year: 2019, url: "https://doi.org/10.1097/pep.0000000000000555" },
    { title: "Effect of strengthening versus balance-proprioceptive exercises on lower extremity function in patients with juvenile idiopathic arthritis: a randomized, single-blind clinical trial", org: "Am J Phys Med Rehabil (Baydogan et al.)", year: 2015, url: "https://doi.org/10.1097/phm.0000000000000279" },
    { title: "Physical Exercise and Physical Activity for Children and Adolescents With Juvenile Idiopathic Arthritis: A Literature Review", org: "Pediatr Phys Ther (Catania et al.)", year: 2017, url: "https://doi.org/10.1097/pep.0000000000000436" },
    { title: "Aerobic and anaerobic exercise capacity in children with juvenile idiopathic arthritis", org: "Arthritis Rheum (van Brussel et al.)", year: 2007, url: "https://doi.org/10.1002/art.22893" },
    { title: "Aerobic and anaerobic exercise capacity in adolescents with juvenile idiopathic arthritis", org: "Arthritis Rheum (Lelieveld et al.)", year: 2007, url: "https://doi.org/10.1002/art.22897" },
    { title: "Effects of an eight-week physical conditioning program on disease signs and symptoms in children with chronic arthritis", org: "Arthritis Care Res (Klepper)", year: 1999, url: "https://doi.org/10.1002/1529-0131(199902)12:1<52::aid-art9>3.0.co;2-x" },
    { title: "The effects of vigorous exercise training on physical function in children with arthritis: a randomized, controlled, single-blinded trial", org: "Arthritis Rheum (Singh-Grewal et al.)", year: 2007, url: "https://doi.org/10.1002/art.23008" },
    { title: "Childhood onset arthritis is associated with an increased risk of fracture: a population based study using the General Practice Research Database", org: "Ann Rheum Dis (Burnham et al.)", year: 2006, url: "https://doi.org/10.1136/ard.2005.048835" },
    { title: "Bone density, structure, and strength in juvenile idiopathic arthritis: importance of disease severity and muscle deficits", org: "Arthritis Rheum (Burnham et al.)", year: 2008, url: "https://doi.org/10.1002/art.23683" },
    { title: "Bone health in children and adolescents with juvenile idiopathic arthritis and the influence of short-term physical exercise", org: "Pediatr Phys Ther (Sandstedt et al.)", year: 2012, url: "https://doi.org/10.1097/pep.0b013e31824cce6e" },
    { title: "Aqua-Plyometric Exercises-Induced Changes in Muscle Strength, Bone Mineral Properties, and Physical Fitness in Patients With Juvenile Idiopathic Arthritis: A 12-Week, Randomized Controlled Trial", org: "Pediatr Exerc Sci (Elnaggar et al.)", year: 2023, url: "https://doi.org/10.1123/pes.2022-0044" },
    { title: "Muscle strength, physical fitness and well-being in children and adolescents with juvenile idiopathic arthritis and the effect of an exercise programme: a randomized controlled trial", org: "Pediatr Rheumatol Online J (Sandstedt et al.)", year: 2013, url: "https://doi.org/10.1186/1546-0096-11-7" },
    { title: "Inflammatory Response 24 h Post-Exercise in Youth with Juvenile Idiopathic Arthritis", org: "Int J Sports Med (Rochette et al.)", year: 2018, url: "https://doi.org/10.1055/a-0640-9063" },
    { title: "Feasibility and safety of a 6-month exercise program to increase bone and muscle strength in children with juvenile idiopathic arthritis", org: "Pediatr Rheumatol Online J (Houghton et al.)", year: 2018, url: "https://doi.org/10.1186/s12969-018-0283-4" },
    { title: "Fatigue in patients with Juvenile Idiopathic Arthritis: relationship to perceived health, physical health, self-efficacy, and participation", org: "Pediatr Rheumatol Online J (Armbrust et al.)", year: 2016, url: "https://doi.org/10.1186/s12969-016-0125-1" },
    { title: "Participation in school and physical education in juvenile idiopathic arthritis in a Nordic long-term cohort study", org: "Pediatr Rheumatol Online J (Nordal et al.)", year: 2019, url: "https://doi.org/10.1186/s12969-019-0341-6" },
    { title: "Juvenile idiopathic arthritis", org: "Nat Rev Dis Primers (Martini et al.)", year: 2022, url: "https://doi.org/10.1038/s41572-021-00332-8" },
    { title: "Prevalence and incidence of juvenile idiopathic arthritis: a systematic review", org: "Joint Bone Spine (Thierry et al.)", year: 2014, url: "https://doi.org/10.1016/j.jbspin.2013.09.003" },
    { title: "Global prevalence estimates of three chronic musculoskeletal conditions: club foot, juvenile idiopathic arthritis and juvenile systemic lupus erythematosus", org: "Pediatr Rheumatol Online J (Dave et al.)", year: 2020, url: "https://doi.org/10.1186/s12969-020-00443-8" },
    { title: "Predicting unfavorable long-term outcome in juvenile idiopathic arthritis: results from the Nordic cohort study", org: "Arthritis Res Ther (Rypdal et al.)", year: 2018, url: "https://doi.org/10.1186/s13075-018-1571-6" },
    { title: "A decade of progress in juvenile idiopathic arthritis treatments and outcomes in Canada: results from ReACCh-Out and the CAPRI registry", org: "Rheumatology (Oxford) (Nguyen et al.)", year: 2024, url: "https://doi.org/10.1093/rheumatology/kead560" },
    { title: "Fatigue in patients with juvenile idiopathic arthritis: A systematic review of the literature", org: "Semin Arthritis Rheum (Armbrust et al.)", year: 2016, url: "https://doi.org/10.1016/j.semarthrit.2015.10.008" },
    { title: "Radiographs and MRI of the Cervical Spine in Juvenile Idiopathic Arthritis: A Cross-Sectional Retrospective Study", org: "J Clin Med (Kotecki et al.)", year: 2021, url: "https://doi.org/10.3390/jcm10245798" },
    { title: "Level and correlates of physical activity among children and adolescents with juvenile idiopathic arthritis compared to controls: results from a German nationwide prospective observational cohort study", org: "Pediatr Rheumatol Online J (Milatz et al.)", year: 2024, url: "https://doi.org/10.1186/s12969-024-00976-2" },
    { title: "Review of biologics, biosimilars, and intended copies in rheumatology, and current practice in Iraq", org: "Open Access Rheumatol (Al Ani et al.)", year: 2019, url: "https://doi.org/10.2147/oarrr.s176965" },
    { title: "The rheumatology workforce in the Arab countries: current status, challenges, opportunities, and future needs from an ArLAR cross-sectional survey", org: "Rheumatol Int (Ziade et al.)", year: 2023, url: "https://doi.org/10.1007/s00296-023-05427-x" },
    { title: "Cumulative Damage in Juvenile Idiopathic Arthritis: A Multicenter Study From the Pediatric Rheumatology Arab Group", org: "Arthritis Care Res (Hoboken) (Al-Mayouf et al.)", year: 2021, url: "https://doi.org/10.1002/acr.24436" },
    { title: "Access to pediatric rheumatology care for Juvenile Idiopathic Arthritis in the United Arab Emirates", org: "Pediatr Rheumatol Online J (Khawaja et al.)", year: 2017, url: "https://doi.org/10.1186/s12969-017-0170-4" },
    { title: "Conservative, Non-pharmacological Interventions for Pain Management in Juvenile Idiopathic Arthritis: A Systematic Review and Meta-Analysis of Randomized Controlled Trials", org: "Cureus (Musso-Daury et al.)", year: 2024, url: "https://doi.org/10.7759/cureus.73295" },
    { title: "Associates of school impairment in Egyptian patients with juvenile idiopathic arthritis: Sharkia Governorate", org: "Rheumatol Int (Abdul-Sattar et al.)", year: 2014, url: "https://doi.org/10.1007/s00296-013-2871-4" },
    { title: "Definition and Validation of the American College of Rheumatology 2021 Juvenile Arthritis Disease Activity Score Cutoffs for Disease Activity States in Juvenile Idiopathic Arthritis", org: "Arthritis Rheumatol (Trincianti et al.)", year: 2021, url: "https://doi.org/10.1002/art.41879" },
    { title: "Reference equation for 6-min walk distance in healthy North African children 6-16 years old", org: "Pediatr Pulmonol (Ben Saad et al.)", year: 2009, url: "https://doi.org/10.1002/ppul.20942" },
    { title: "Pediatric Escola Paulista de Medicina Range of Motion Scale: a reduced joint count scale for general use in juvenile rheumatoid arthritis", org: "J Rheumatol (Len et al.)", year: 1999, url: "https://pubmed.ncbi.nlm.nih.gov/10229415/" },
    { title: "Maximal mouth opening capacity: percentiles for healthy children 4-17 years of age", org: "Pediatr Rheumatol Online J (Müller et al.)", year: 2013, url: "https://doi.org/10.1186/1546-0096-11-17" },
    { title: "Goal attainment scaling in paediatric rehabilitation: a critical review of the literature", org: "Dev Med Child Neurol (Steenbeek et al.)", year: 2007, url: "https://doi.org/10.1111/j.1469-8749.2007.00550.x" },
    { title: "The Arabic Canadian Occupational Performance Measure (Arabic-COPM) in Pediatric Rehabilitation: Quantitative Reliability Study", org: "JMIR Pediatr Parent (Hadoush et al.)", year: 2026, url: "https://doi.org/10.2196/87822" },
    { title: "Cervical spine involvement in patients with juvenile idiopathic arthritis - MRI follow-up study", org: "Pediatr Rheumatol Online J (Hospach et al.)", year: 2014, url: "https://doi.org/10.1186/1546-0096-12-9" },
    { title: "Cervical spine arthritis as initial manifestation in Juvenile Idiopathic Arthritis: a multicenter retrospective study", org: "Pediatr Rheumatol Online J (Quesada-Masachs et al.)", year: 2025, url: "https://doi.org/10.1186/s12969-025-01161-9" },
    { title: "Preliminary definition of improvement in juvenile arthritis", org: "Arthritis Rheum (Giannini et al.)", year: 1997, url: "https://doi.org/10.1002/1529-0131(199707)40:7<1202::aid-art3>3.0.co;2-r" },
    { title: "Musculoskeletal screening examination (pGALS) for school-age children based on the adult GALS screen", org: "Arthritis Rheum (Foster et al.)", year: 2006, url: "https://doi.org/10.1002/art.22230" },
    { title: "Association of hand grip strength with disease activity, disability and quality of life in children and adolescents with Juvenile Idiopathic Arthritis", org: "Adv Rheumatol (Rashed et al.)", year: 2018, url: "https://doi.org/10.1186/s42358-018-0012-1" },
    { title: "Cross cultural adaptation and validation of the Arabic version of the Childhood Health Assessment Questionnaire for measuring functional status in children with juvenile idiopathic arthritis", org: "Clin Exp Rheumatol (el Miedany et al.)", year: 2003, url: "https://pubmed.ncbi.nlm.nih.gov/12846063/" },
    { title: "The Faces Pain Scale-Revised: toward a common metric in pediatric pain measurement", org: "Pain (Hicks et al.)", year: 2001, url: "https://doi.org/10.1016/s0304-3959(01)00314-1" },
    { title: "The Arabic Version of the Faces Pain Scale-Revised: Cultural Adaptation, Validity, and Reliability Properties When Used with Children and Adolescents", org: "Children (Basel) (Finianos et al.)", year: 2021, url: "https://doi.org/10.3390/children8121184" },
    { title: "Impact of core stability exercises on bone mineralization and functional capacity in children with polyarticular juvenile idiopathic arthritis: a randomized clinical trial", org: "Clin Rheumatol (Elnaggar et al.)", year: 2021, url: "https://doi.org/10.1007/s10067-020-05219-9" },
    { title: "Clinical features, treatment, and outcome of macrophage activation syndrome complicating systemic juvenile idiopathic arthritis: a multinational, multicenter study of 362 patients", org: "Arthritis Rheumatol (Minoia et al.)", year: 2014, url: "https://doi.org/10.1002/art.38802" },
    { title: "Differentiating between septic arthritis and transient synovitis of the hip in children: an evidence-based clinical prediction algorithm", org: "J Bone Joint Surg Am (Kocher et al.)", year: 1999, url: "https://doi.org/10.2106/00004623-199912000-00002" },
    { title: "Rates of hospitalized bacterial infection associated with juvenile idiopathic arthritis and its treatment", org: "Arthritis Rheum (Beukelman et al.)", year: 2012, url: "https://doi.org/10.1002/art.34458" },
    { title: "Risk of Serious Infection in Juvenile Idiopathic Arthritis Patients Associated With Tumor Necrosis Factor Inhibitors and Disease Activity in the German Biologics in Pediatric Rheumatology Registry", org: "Arthritis Care Res (Hoboken) (Becker et al.)", year: 2017, url: "https://doi.org/10.1002/acr.22961" },
    { title: "Identifying acute lymphoblastic leukemia mimicking juvenile idiopathic arthritis in children", org: "PLoS One (Brix et al.)", year: 2020, url: "https://doi.org/10.1371/journal.pone.0237530" },
    { title: "Treatment of leg length discrepancy with temporary epiphyseal stapling in children with juvenile idiopathic arthritis during 1957-99", org: "J Pediatr Orthop (Skyttä et al.)", year: 2003, url: "https://doi.org/10.1097/00004694-200305000-00019" },
    { title: "A systematic review of the effectiveness of strategies for reducing fracture risk in children with juvenile idiopathic arthritis with additional data on long-term risk of fracture and cost of disease management", org: "Health Technol Assess (Thornton et al.)", year: 2008, url: "https://doi.org/10.3310/hta12030" },
    { title: "Growth hormone increases final height in patients with juvenile idiopathic arthritis: data from a randomized controlled study", org: "J Clin Endocrinol Metab (Bechtold et al.)", year: 2007, url: "https://doi.org/10.1210/jc.2007-0544" },
    { title: "Risk factors for development of uveitis differ between girls and boys with juvenile idiopathic arthritis", org: "Arthritis Rheum (Saurenmann et al.)", year: 2010, url: "https://doi.org/10.1002/art.27416" },
    { title: "Depression And Anxiety In Patients With Juvenile Idiopathic Arthritis: Current Insights And Impact On Quality Of Life, A Systematic Review", org: "Open Access Rheumatol (Fair et al.)", year: 2019, url: "https://doi.org/10.2147/oarrr.s174408" },
    { title: "Prevalence of Juvenile Fibromyalgia Syndrome in Turkish Patients with Juvenile Idiopathic Arthritis: A Multicenter Study", org: "ARP Rheumatol (Özomay Baykal et al.)", year: 2025, url: "https://doi.org/10.63032/spis7723" },
    { title: "Slow speed resistance exercise training in children with polyarticular juvenile idiopathic arthritis", org: "Open Access Rheumatol (Sule et al.)", year: 2019, url: "https://doi.org/10.2147/oarrr.s199855" },
    { title: "Adherence to exercise therapy among children and adolescents with Juvenile idiopathic arthritis: a scoping review", org: "Disabil Rehabil (Hu et al.)", year: 2024, url: "https://doi.org/10.1080/09638288.2023.2200261" },
    { title: "Moroccan parents caring for children with juvenile idiopathic arthritis: positive and negative aspects of their experiences", org: "Pediatr Rheumatol Online J (Mawani et al.)", year: 2013, url: "https://doi.org/10.1186/1546-0096-11-39" },
    { title: "Prevalence of overweight among Moroccan children and adolescents with juvenile idiopathic arthritis", org: "Joint Bone Spine (Amine et al.)", year: 2011, url: "https://doi.org/10.1016/j.jbspin.2011.02.001" },
    { title: "Vitamin D concentrations and disease activity in Moroccan children with juvenile idiopathic arthritis", org: "BMC Musculoskelet Disord (Bouaddi et al.)", year: 2014, url: "https://doi.org/10.1186/1471-2474-15-115" },
    { title: "Bone mineral density in egyptian children with juvenile idiopathic arthritis: possible correlation to serum RANKL / osteoprotegerin (OPG) ratio and OPG gene polymorphisms", org: "Pediatr Rheumatol Online J (Eid et al.)", year: 2023, url: "https://doi.org/10.1186/s12969-023-00843-6" },
    { title: "What do we know about juvenile idiopathic arthritis and vitamin D? A systematic literature review and meta-analysis of current evidence", org: "Clin Rheumatol (Nisar et al.)", year: 2013, url: "https://doi.org/10.1007/s10067-012-2159-1" },
    { title: "The state of research on complementary and alternative medicine in pediatric rheumatology", org: "Rheum Dis Clin North Am (April et al.)", year: 2011, url: "https://doi.org/10.1016/j.rdc.2010.11.011" },
    { title: "Effects of Hydrotherapy on Juvenile Idiopathic Arthritis: A Systematic Review and Meta-Analysis", org: "Pediatr Phys Ther (Verit et al.)", year: 2026, url: "https://doi.org/10.1097/pep.0000000000001256" },
    { title: "Effects of Combined Resistive Underwater Exercises and Interferential Current Therapy in Patients with Juvenile Idiopathic Arthritis: A Randomized Controlled Trial", org: "Am J Phys Med Rehabil (Elnaggar et al.)", year: 2016, url: "https://doi.org/10.1097/phm.0000000000000347" },
    { title: "Effect of Electromyographic Biofeedback Training on Pain, Quadriceps Muscle Strength, and Functional Ability in Juvenile Rheumatoid Arthritis", org: "Am J Phys Med Rehabil (Eid et al.)", year: 2016, url: "https://doi.org/10.1097/phm.0000000000000524" },
    { title: "Low-energy laser therapy application on knee joints as an auxiliary treatment in patients with polyarticular juvenile idiopathic arthritis: a dual-arm randomized clinical trial", org: "Lasers Med Sci (Elnaggar et al.)", year: 2022, url: "https://doi.org/10.1007/s10103-021-03427-6" },
    { title: "Low-level laser on femoral growth plate in rats", org: "Acta Cir Bras (Oliveira et al.)", year: 2012, url: "https://doi.org/10.1590/s0102-86502012000200004" },
    { title: "The effects of therapeutic vs. high-intensity ultrasound on the rabbit growth plate", org: "J Orthop Res (Lyon et al.)", year: 2003, url: "https://doi.org/10.1016/s0736-0266(03)00047-0" },
    { title: "Historical ESWT Paradigms Are Overcome: A Narrative Review", org: "Biomed Res Int (Lohrer et al.)", year: 2016, url: "https://doi.org/10.1155/2016/3850461" },
    { title: "Radial shockwave treatment promotes chondrogenesis in human growth plate and longitudinal bone growth in rabbits", org: "Bone (Ramesh et al.)", year: 2022, url: "https://doi.org/10.1016/j.bone.2021.116186" },
    { title: "Does extracorporeal shockwave therapy treat leg length discrepancy? an experimental animal study", org: "Arthritis Res Ther (Jhan et al.)", year: 2025, url: "https://doi.org/10.1186/s13075-025-03519-6" },
    { title: "Focused extracorporeal shockwave therapy for youth sports-related apophyseal injuries: case series", org: "J Orthop Surg Res (Shafshak et al.)", year: 2023, url: "https://doi.org/10.1186/s13018-023-04065-0" },
    { title: "Recommendations for use of extracorporeal shockwave therapy in sports medicine: an international modified Delphi study", org: "Br J Sports Med (Rhim)", year: 2025, url: "https://doi.org/10.1136/bjsports-2024-109082" },
    { title: "The effects of extracorporeal shock wave therapy in children with cerebral palsy: a systematic review", org: "Int J Surg (de Roo et al.)", year: 2025, url: "https://doi.org/10.1097/js9.0000000000002251" },
    { title: "Feasibility of Using Pulsed Electromagnetic Field Therapy to Improve the Dynamic Postural Balance of Children with Cerebral Palsy: A Randomized, Sham-Controlled Pilot Study", org: "J Clin Med (Pulay MÁ et al.)", year: 2024, url: "https://doi.org/10.3390/jcm14010192" },
    { title: "Sleep in children and adolescents with juvenile idiopathic arthritis: a systematic review and meta-analysis of case-control studies", org: "Sleep (Saidi et al.)", year: 2022, url: "https://doi.org/10.1093/sleep/zsab233" },
    { title: "Efficacy of accommodating variable-resistance training on muscle architecture, peak torque, and functional performance in patients with juvenile idiopathic arthritis: A randomized controlled trial", org: "Heliyon (Elnaggar et al.)", year: 2024, url: "https://doi.org/10.1016/j.heliyon.2024.e27693" },
    { title: "Effects of Video Games-Based Task-Oriented Activity Training (Xbox 360 Kinect) on Activity Performance and Participation in Patients With Juvenile Idiopathic Arthritis: A Randomized Clinical Trial", org: "Am J Phys Med Rehabil (Arman et al.)", year: 2019, url: "https://doi.org/10.1097/phm.0000000000001001" },
    { title: "Grip strength is strongly associated with height, weight and gender in childhood: a cross sectional study of 2241 children and adolescents providing reference values", org: "J Physiother (Ploegmakers et al.)", year: 2013, url: "https://doi.org/10.1016/s1836-9553(13)70202-9" },
    { title: "Maximal mouth opening is a simple method to evaluate the treatment outcome of temporomandibular joint arthritis in patients with juvenile idiopathic arthritis", org: "Acta Odontol Scand (Huhtanen et al.)", year: 2024, url: "https://doi.org/10.2340/aos.v83.42438" },
    { title: "Management of temporomandibular joint arthritis-related orofacial symptoms in juvenile idiopathic arthritis by the use of a stabilization splint", org: "Scand J Rheumatol (Stoustrup et al.)", year: 2014, url: "https://doi.org/10.3109/03009742.2013.830146" },
    { title: "Reference values for the Modified Timed Up and Go Test in Saudi children aged 4-12 years old in Riyadh city: cross-sectional study", org: "Ann Med (Al-Toaimi et al.)", year: 2021, url: "https://doi.org/10.1080/07853890.2021.1986638" },
    { title: "Development of stratified normative data and reference equations for the timed up and down stairs test for healthy children 6-14 years of age", org: "Physiotherapy (Del Corral et al.)", year: 2021, url: "https://doi.org/10.1016/j.physio.2021.03.002" },
    { title: "Cross-cultural validation of the Pediatric Quality of Life Inventory™ 4.0 (PedsQL™) generic core scale into Arabic language", org: "Scand J Caring Sci (Arabiat et al.)", year: 2011, url: "https://doi.org/10.1111/j.1471-6712.2011.00889.x" },
    { title: "The PedsQL in pediatric rheumatology: reliability, validity, and responsiveness of the Pediatric Quality of Life Inventory Generic Core Scales and Rheumatology Module", org: "Arthritis Rheum (Varni et al.)", year: 2002, url: "https://doi.org/10.1002/art.10095" },
    { title: "The PedsQL Multidimensional Fatigue Scale in pediatric rheumatology: reliability and validity", org: "J Rheumatol (Varni et al.)", year: 2004, url: "https://pubmed.ncbi.nlm.nih.gov/15570657/" },
    { title: "The Psychometric Properties of an Arabic version of the PedsQL Multidimensional Fatigue Scale Tested for Children with Cancer", org: "Compr Child Adolesc Nurs (Al-Gamal et al.)", year: 2017, url: "https://doi.org/10.1080/24694193.2017.1316791" },
    { title: "The Arabic version of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR)", org: "Rheumatol Int (Al-Mayouf et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3979-3" },
    { title: "The Egyptian Arabic version of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR)", org: "Rheumatol Int (El Miedany et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3949-9" },
    { title: "The Omani Arabic version of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR)", org: "Rheumatol Int (Al-Abrawi et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3965-9" },
    { title: "The Libyan Arabic version of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR)", org: "Rheumatol Int (Hashad et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3962-z" },
    { title: "The Algerian Arabic version of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR)", org: "Rheumatol Int (Aiche et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3937-0" },
    { title: "Cross-cultural adaptation and psychometric evaluation of the Juvenile Arthritis Multidimensional Assessment Report (JAMAR) in 54 languages across 52 countries: review of the general methodology", org: "Rheumatol Int (Bovis et al.)", year: 2018, url: "https://doi.org/10.1007/s00296-018-3944-1" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة من جلسة ٤٥ (وبالعمر ٣٠–٤٠ دون السادسة و٥٠–٦٠ للمراهق) — روتينُ المدى باللعب، ثمّ القوّةُ حول المفاصل بقاعدة المفصل النشط، ثمّ التوازن، ثمّ الهوائيّ بلا قفز، ثمّ مهارةٌ يومية (المساند، أو الفكّ، أو الصلاة، أو المدرسة)، ثمّ تعليمُ الأهل ما يكرّرونه في البيت؛ والشدّةُ بقاعدة الجلسة.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes of a 45-minute session (by age, 30–40 under six and 50–60 for adolescents) — the play-based range-of-motion routine, then strength around the joints by the active-joint rule, then balance, then aerobic work without jumping, then a daily skill (orthoses, the jaw, prayer or school), then teaching the family what to repeat at home; intensity by the session rule."],
      note: ["أساسيٌّ في كلّ جلسة — العلاجُ الطبيعيّ والوظيفيّ توصيةٌ مشروطة مهما كان الدواء (Onel 2022b) ولمتعدّد المفاصل (Ringold 2019) والدليلُ منخفض؛ والبيلاتس والبرنامجُ المنزليّ بدرجة A (Cavallo 2017)، والرياضةُ آمنةٌ بلا تهيّج (Philpott 2010)؛ وفي كوكرين بلا ضرر و«لا يهيّج التهابَ المفاصل» (Takken 2008)، ثمّ الوظيفةُ −٠٫٤١ والمشيُ ستّ دقائق +٢٦٫٧ متراً (Tong 2026) والألمُ −١٫٣٧ من ١٠ (Musso-Daury 2024).",
        "Core in every session — physical and occupational therapy are a conditional recommendation regardless of medication (Onel 2022b) and for polyarthritis (Ringold 2019), on low evidence; Pilates and the home programme are grade A (Cavallo 2017), and sport is safe without flares (Philpott 2010); in the Cochrane review there was no harm and 'exercise does not exacerbate arthritis' (Takken 2008), and later function −0.41, the six-minute walk +26.7 metres (Tong 2026) and pain −1.37 out of 10 (Musso-Daury 2024)."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional",
      parameters: ["دفءٌ سطحيّ قبل التمرين لمفصلٍ متيبّسٍ غيرِ حارّ وحده، لطفلٍ يستطيع أن يقول «حارّ» في وقته، وأحدُ الوالدين حاضر، ويُفحص الجلد — ولا على مفصلٍ حارٍّ متورّم أبداً؛ بقاعدة المركز للكمادة، فلا إعداداتٍ منشورة للأطفال.",
        "Superficial warmth before exercise for a stiff joint that is not hot only, in a child who can say 'hot' in time, with a parent present and the skin checked — never over a hot, swollen joint; by the centre's hot-pack rule, as no paediatric settings are published."],
      note: ["مساعدٌ لقرار سليم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)، والكمادةُ كانت في ذراع «العلاج التقليديّ» الضابطة (Elnaggar 2016)؛ والحرارةُ السطحية تصلح فوق صفيحة النموّ لكنّها ممنوعةٌ لمن لا يستطيع أن يخبر في وقته (Houghton 2010)، وإرشادُ الكبار بالروماتويد يوصي بالعلاج الحراريّ (Ottawa Panel 2004 — غيرُ مباشر).",
        "Adjunct for Saleem's decision — there is no trial in this disease (a documented zero result), and hot packs were part of the 'traditional therapy' control arm (Elnaggar 2016); superficial heat can be used over a growth plate but is contraindicated for anyone who cannot report in time (Houghton 2010), and the adult rheumatoid arthritis guideline recommends thermotherapy (Ottawa Panel 2004 — indirect)."] },
    { code: "wax", centreUse: "adjunct", evidence: "optional",
      parameters: ["لليدين والرسغين المتيبّسة غيرِ الحارّة عند الطفل الأكبر وحده، قبل تمارين اليد مباشرةً، بالشروط نفسِها (يقول «حارّ»، ويُفحص الجلد)؛ والحرارةُ والمدّةُ بإعدادات بروتوكول الروماتويد في المركز إن وافق سليم — فلا إعداداتٍ منشورة للأطفال.",
        "For stiff hands and wrists that are not hot, in older children only, immediately before the hand exercises, under the same conditions (says 'hot', skin checked); temperature and duration follow the centre's rheumatoid arthritis protocol if Saleem agrees — as no paediatric settings are published."],
      note: ["مساعدٌ لقرار سليم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)؛ والحرارةُ السطحية ومنها الشمعُ تصلح فوق صفيحة النموّ وتُمنع لمن لا يخبر في وقته (Houghton 2010)، وإرشادُ الكبار غيرُ مباشر (Ottawa Panel 2004).",
        "Adjunct for Saleem's decision — there is no trial in this disease (a documented zero result); superficial heat, including wax, can be used over a growth plate and is contraindicated for anyone who cannot report in time (Houghton 2010), and the adult guideline is indirect (Ottawa Panel 2004)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["تيّارٌ متداخل لألم المفصل مع التمرين لا بدله، لطفلٍ يستطيع أن يصف الإحساس: ١٥ دقيقة مع تمرين المقاومة تحت الماء ثلاثاً في الأسبوع اثني عشرَ أسبوعاً كما في التجربة (Elnaggar 2016 · Iversen 2022) — والتردّدُ والشدّةُ وعرضُ النبضة لم تُذكر فلا تُكتب؛ ولا أقطابَ على جلدٍ مجروح (اقتراح)، وبحذرٍ فوق صفيحة النموّ (Houghton 2010).",
        "Interferential current for joint pain with exercise, not instead of it, in a child who can describe the sensation: 15 minutes with resistive underwater exercise three times a week for twelve weeks, as in the trial (Elnaggar 2016 · Iversen 2022) — frequency, intensity and pulse width were not reported, so they are not written; no electrodes on broken skin (a proposal), and with caution over a growth plate (Houghton 2010)."],
      note: ["مساعدٌ لقرار سليم — لا توصيةَ في إرشادٍ لهذا المرض؛ وتجربةٌ عند ٣٠ طفلاً بمتعدّد المفاصل: التيّارُ مع تمرين المقاومة تحت الماء فاق العلاجَ التقليديّ في قوّة الفخذ والألم، ولا يُفصل أثرُ التيّار عن التمرين (Elnaggar 2016)؛ والتغذيةُ الراجعة بتخطيط العضلات ليست تحفيزاً (Eid 2016)، ولا تجربةَ للتحفيز العصبيّ ولا العضليّ في هذا المرض (بحثٌ صفريّ)؛ والتحفيزُ تحذيرٌ فوق صفيحة النموّ المفتوحة (Houghton 2010).",
        "Adjunct for Saleem's decision — no guideline for this disease recommends it; in a trial of 30 children with polyarthritis, the current with resistive underwater exercise beat traditional therapy for thigh strength and pain, and the effect of the current cannot be separated from the exercise (Elnaggar 2016); muscle biofeedback is not stimulation (Eid 2016), and there is no trial of nerve or muscle stimulation in this disease (a documented zero result); stimulation is a precaution over an open growth plate (Houghton 2010)."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم افتراضاً، ولسليم أن يسمح به مساعداً للمراهق قربَ اكتمال النموّ — تجربةٌ عند ٦٠ طفلاً بمتعدّد المفاصل: ليزرٌ منخفض الطاقة على الركبتين (٩٠٣ نانومتر، ٥٠ ملّي واط، ١٫٥ جول) مع التمرين حسّن الألمَ والإعياءَ والوظيفةَ حتى ستّة أشهر بلا أثرٍ في القوّة (Elnaggar 2022)، والنقاطُ والجلساتُ لم تُذكر؛ لكنّ ليزر ٨٣٠ نانومتر و٤٠ ملّي واط و١٠ جول/سم² يومياً فوق صفيحة نموّ الفخذ أنقص نموَّ العظم عند الجرذان (Oliveira 2012)، وهو تحذيرٌ فوق صفيحة النموّ النشطة (Houghton 2010).",
        "Not used by default, and Saleem may allow it as an adjunct for adolescents near the end of growth — in a trial of 60 children with polyarthritis, low-energy laser to the knees (903 nm, 50 mW, 1.5 J) with exercise improved pain, fatigue and function to six months, with no effect on strength (Elnaggar 2022), and points and sessions were not reported; but 830 nm, 40 mW, 10 J/cm² daily over the femoral growth plate reduced bone growth in rats (Oliveira 2012), and it is a precaution over an active growth plate (Houghton 2010)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)؛ والدليلُ على صفيحة النموّ متضارب: عند الأرانب ترك ٠٫٥ واط/سم² عشرين دقيقةً يومياً ستّةَ أسابيع الصفيحةَ طبيعية وأفسدها ٢٫٢ (Lyon 2003)، والإرشادُ الكنديّ يجعله تحذيراً بشدّةٍ منخفضة للمراهق وحده ويكتب في جدوله المستمرَّ فوق الصفيحة ممنوعاً — تناقضٌ في الإرشاد نفسِه (Houghton 2010)؛ فبلا نفعٍ معروف وبخطرٍ على النموّ لا يُستعمل.",
        "Not used — there is no trial in this disease (a documented zero result); the growth-plate evidence conflicts: in rabbits 0.5 W/cm² for twenty minutes a day for six weeks left the plate normal while 2.2 damaged it (Lyon 2003), and the Canadian guideline makes it a precaution at low intensity for adolescents only while its own table lists continuous ultrasound over the plate as contraindicated — an inconsistency within the guideline (Houghton 2010); with no known benefit and a risk to growth, it is not used."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم فوق صفيحة النموّ المفتوحة — فلا إعداداتٍ تمنع اعتمادَه: لا دواعيَ ولا تجربةَ في هذا المرض (بحثٌ صفريّ)، وأكثرُ كتيّبات الأجهزة تمنعه أو تحذّر منه في الأطفال والمراهقين قبل اكتمال النموّ، وبيانُ أطبّاء القدم الدوليّ: لا دليلَ عليه في قدم الأطفال وكاحلهم وساقهم، ولا يُستعمل إلّا في تجارب (RCPod 2023)؛ وفي المقابل مراجعةٌ بتمويلٍ صناعيّ تراه «واعداً وآمناً» قرب الصفيحة (Lohrer 2016)، ودراساتٌ حيوانية لم تجد ضرراً (Ramesh 2022 · Jhan 2025)، وسلسلةٌ بلا ضابط لالتهاب منشأ الوتر عند الناشئين (Shafshak 2023)، ودلفي الطبّ الرياضيّ ترك أمراضَ العظم بلا إجماع (Rhim 2025)؛ وتجاربُ الشلل الدماغيّ على العضلات لا المفاصل (de Roo 2025).",
        "Not used over an open growth plate — so no settings block its approval: there is no indication or trial in this disease (a documented zero result), most device manuals contraindicate it or warn against it in children and adolescents before growth is complete, and the international podiatry statement finds no evidence for it in children's feet, ankles and legs and limits it to trials (RCPod 2023); against that, an industry-funded review calls it 'promising and safe' near the plate (Lohrer 2016), animal studies found no harm (Ramesh 2022 · Jhan 2025), an uncontrolled series treated apophysitis in young athletes (Shafshak 2023), and a sports-medicine Delphi left bone conditions unresolved (Rhim 2025); the cerebral palsy trials treat muscle, not joints (de Roo 2025)."] },
    { code: "megnatik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)، والمجالُ الكهرومغناطيسيّ النبضيّ جُرّب في دراسةٍ تجريبية للتوازن في الشلل الدماغيّ وحده بلا نفعٍ واضح (Pulay 2024).", "Not used — there is no trial in this disease (a documented zero result), and a pulsed electromagnetic field has been tried only in a balance pilot in cerebral palsy, with no clear benefit (Pulay 2024)."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)، والدفءُ السطحيّ يُعطى بالكمادة أو الشمع بشروطهما (Houghton 2010).", "Not used — there is no trial in this disease (a documented zero result), and superficial warmth is given with the hot pack or wax under their conditions (Houghton 2010)."] },
    { code: "tecar", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم للأطفال — لا بيانات (بحثٌ صفريّ)؛ والحرارةُ العميقة بالموجات القصيرة تحذيرٌ فوق صفيحة النموّ وممنوعةٌ لمن لا يخبر في وقته (Houghton 2010)، والتيكارُ جهازُ تسخينٍ عميقٍ آخر، فالقاعدةُ تنطبق عليه بالقياس.", "Not used for children — there are no data (a documented zero result); thermal shortwave is a precaution over a growth plate and contraindicated for anyone who cannot report in time (Houghton 2010), and TECAR is another deep-heating device, so the rule applies to it by analogy."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا بياناتِ ولا دواعيَ في هذا المرض (بحثٌ صفريّ).", "Not used — there are no data and no indication in this disease (a documented zero result)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الشدُّ الساكن ليلاً بالأثقال في السرير مع الجبائر حسّن تيبّسَ الركبة عند خمسة أطفالٍ قبل سنّ المدرسة (Fredriksen 2000)، وهو ليس شدَّ الجهاز؛ وشدُّ الرقبة ممنوعٌ مع إصابتها لخطر عدم ثبات الفقرتين الأولى والثانية (Kotecki 2021 · Philpott 2010)؛ ولتيبّس الركبة الجبيرةُ الليلية من قسم المساند (بطاقتُها).", "Not used — static night traction with weights in bed and orthoses improved knee contractures in five preschool children (Fredriksen 2000), which is not the device's traction; neck traction is forbidden with neck involvement because of the risk of instability of the first and second vertebrae (Kotecki 2021 · Philpott 2010); a knee contracture gets the night splint from the orthotics department (its card)."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا بياناتِ في هذا المرض (بحثٌ صفريّ)، ويُستعمل بأمر الجرّاح وحده بعد جراحة المفصل (اقتراح).", "Not used — there are no data in this disease (a documented zero result), and it is used only on the surgeon's order after joint surgery (a proposal)."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا بياناتِ ولا دواعيَ (بحثٌ صفريّ)، فهؤلاء الأطفالُ يمشون، والتدريبُ على الأرض.", "Not used — there are no data and no indication (a documented zero result), as these children walk, and training is overground."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا بياناتِ للإبر الجافّة عند الأطفال بهذا المرض (بحثٌ صفريّ)، والوخزُ في مراجعة الطبّ البديل للأطفال إشاراتٌ واعدة بنفعٍ وسلامةٍ غيرِ مؤكَّدين (April 2011)، وهو ليس إبراً جافّة.", "Not used — there are no data on dry needling in children with this disease (a documented zero result), and acupuncture in the paediatric complementary-medicine review shows promising signals with uncertain efficacy and safety (April 2011), and it is not dry needling."] },
  ],
  phases: [
    {
      name: ["التقييمُ والتعليمُ والمساند", "Assessment, education and orthoses"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلسات ١–٦ (الأسبوعان الأوّل والثاني) — والتمرينُ يبدأ من الجلسة الأولى", "Sessions 1–6 (weeks one and two) — with exercise from the first session"],
      goals: [
        "التقييمُ تمّ (الفئةُ والأدويةُ والعينُ والرقبةُ والمفاصلُ النشطة والمحدودة والفكُّ والقدمُ وطولُ الساقين)، والقياسُ الأوّل والأهدافُ مكتوبة والمسارُ مختار؛ والطفلُ وأهلُه يعرفون قاعدةَ الجلسة وخطّةَ النوبة والألم وحمايةَ المفاصل، وبدأ روتينُ المدى الصباحيّ والتمارينُ الثابتة والفعّالة اللطيفة حول المفاصل النشطة، وطُلبت المساندُ أو رُكّبت، وبدأ السجلُّ المنزليّ وتمارينُ الفكّ إن أُصيب.",
        "Assessment done (category, medicines, eyes, neck, active and limited joints, jaw, feet and leg length), the first measurement and the goals written and the pathway chosen; the child and family know the session rule, the flare and pain plan and joint protection, the morning range-of-motion routine and gentle isometric and active work around the active joints have started, orthoses are ordered or fitted, and the home diary and jaw exercises (if the jaw is involved) have begun.",
      ],
      education: [
        "• التمرينُ آمنٌ ولا يهيّج المرض، والرياضةُ مسموحةٌ في حدود الألم (Takken 2008 · Philpott 2010).\n" +
        "• قاعدةُ الألم والمفصل النشط وخطّةُ يوم النوبة (Rochette 2018 · Philpott 2010).\n" +
        "• الدواءُ لا يُترك ولا يُبدَّل إلّا بالطبيب، وانقطاعُه يُبلَّغ (Almansi 2025).\n" +
        "• علاماتُ الخطر ومتى يُذهب إلى الطوارئ، وموعدُ العين (Fautrel 2024 · Angeles-Han 2019).\n" +
        "• الأهلُ يعطون أكثرَ الجرعة في البيت (Tarakci 2012).",
        "• Exercise is safe and does not flare the disease, and sport is allowed within pain limits (Takken 2008 · Philpott 2010).\n" +
        "• The pain and active-joint rule and the flare-day plan (Rochette 2018 · Philpott 2010).\n" +
        "• Medicines are never stopped or changed except by the doctor, and an interruption is reported (Almansi 2025).\n" +
        "• The warning signs and when to go to the emergency department, and the eye-check date (Fautrel 2024 · Angeles-Han 2019).\n" +
        "• Parents deliver most of the dose at home (Tarakci 2012).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• لا علامةَ خطرٍ لم تُحسم، وموعدُ العين في وقته، والرقبةُ مقيَّمة.\n" +
        "• البرنامجُ المنزليّ ثلاثةَ أيّامٍ في الأسبوع فأكثر أسبوعين في السجلّ (Tarakci 2012).\n" +
        "• ألمُ التمرين في حدود القاعدة — حتى ٣ من ١٠ ويعود صباحاً (Rochette 2018).\n" +
        "• لا تورّمَ جديد يدوم أكثرَ من ٤٨ ساعة.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 2 when all are met:\n" +
        "• No unresolved red flag, the eye check on time, and the neck assessed.\n" +
        "• The home programme on three days a week or more for two weeks in the diary (Tarakci 2012).\n" +
        "• Exercise pain within the rule — up to 3 out of 10 and back to baseline by morning (Rochette 2018).\n" +
        "• No new swelling lasting more than 48 hours.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• التقييمُ لا يأخذ الجلسات كلَّها: من الأولى روتينُ المدى باللعب، وشدُّ الفخذ والتمارينُ الثابتة حول المفصل النشط — فالقوّةُ تنقص إلى النصف قرب الركبة الملتهبة (Lindehammar 1998).\n" +
        "• المساند: النعلُ لألم القدم (Fellas 2025 · Powell 2005)، وجبيرةُ الرسغ أو الركبة بقرار الطبيب والأخصائيّ، وكلُّها تُصنع في قسم المساند.\n" +
        "• الفكّ: التمارينُ في البيت لمن أُصيب فكُّه، والقياسُ بالمسطرة (Vassis 2023 · Muller 2013).\n" +
        "• الرقبةُ المصابة: حركةٌ آمنة وحدها حتى يُنفى عدمُ الثبات (Kotecki 2021).\n" +
        "• المسارُ الخفيف: ثلاثُ جلساتٍ هنا. واليوميّ أوّلاً: الجلسات ١–٦ في الأسبوع الأوّل (Epps 2005).",
        "• Assessment does not take all the sessions: from the first, the play-based range-of-motion routine, and quadriceps setting and isometric work around the active joint — strength falls to half near an inflamed knee (Lindehammar 1998).\n" +
        "• Orthoses: foot orthoses for foot pain (Fellas 2025 · Powell 2005), and a wrist or knee splint by the doctor's and specialist's decision, all made in the orthotics department.\n" +
        "• The jaw: home exercises for a child whose jaw is involved, measured with a ruler (Vassis 2023 · Muller 2013).\n" +
        "• An involved neck: safe movement only until instability is excluded (Kotecki 2021).\n" +
        "• Light pathway: three sessions here. Daily-start: sessions 1–6 in the first week (Epps 2005).",
      ],
      exercises: [
        { code: "jia-play-rom-morning-routine", sets: 1, reps: 5,
          note: ["لكلّ طفل — يتعلّمه الأهلُ في الجلسة الأولى.", "For every child — the family learns it at the first session."] },
        { code: "jia-jaw-mobility-home", sets: 1, reps: 5, hold: 5,
          note: ["لمن أُصيب فكُّه أو شكا منه، والقياسُ الأوّل لفتح الفم.", "For a child whose jaw is involved or symptomatic, with the first mouth-opening measurement."] },
        { code: "jia-foot-orthoses-shoe-raise", sets: 1, reps: 1,
          note: ["لألم القدم أو فرق طول الساقين — الطلبُ من قسم المساند.", "For foot pain or a leg-length difference — ordered from the orthotics department."] },
        { code: "jia-knee-extension-night-splint", sets: 1, reps: 1,
          note: ["لتيبّس الركبة في الثني، بقرار الطبيب والأخصائيّ.", "For a knee stuck in flexion, by the doctor's and specialist's decision."] },
        { code: "jia-resting-wrist-hand-splint", sets: 1, reps: 1,
          note: ["لالتهاب الرسغ، بقرار الطبيب والأخصائيّ.", "For an inflamed wrist, by the doctor's and specialist's decision."] },
        { code: "quad-set", sets: 2, reps: 10, hold: 5,
          note: ["حول الركبة النشطة — بلا حمل.", "Around an active knee — with no load."] },
        { code: "straight-leg-raise", sets: 2, reps: 10 },
        { code: "heel-slide", sets: 2, reps: 10 },
        { code: "heel-prop", sets: 1, reps: 3, hold: 60,
          note: ["لنقص مدّ الركبة، بلا ألمٍ فوق ٣ من ١٠.", "For a knee extension deficit, with no pain above 3 out of 10."] },
        { code: "ankle-pumps", sets: 2, reps: 10 },
        { code: "ankle-alphabet", sets: 1, reps: 2 },
        { code: "wrist-flex-ext-arom", sets: 2, reps: 10 },
        { code: "wrist-deviation-arom", sets: 1, reps: 10 },
        { code: "tendon-gliding", sets: 1, reps: 5,
          note: ["وبعد نزع جبيرة الرسغ.", "Also after taking off the wrist splint."] },
        { code: "forearm-rot-arom", sets: 1, reps: 10 },
        { code: "wand-flexion-supine", sets: 1, reps: 10,
          note: ["لمن أُصيب كتفُه.", "For a child whose shoulder is involved."] },
        { code: "cat-camel", sets: 1, reps: 8,
          note: ["على القبضتين إن آلمه الرسغ.", "On the fists if the wrists hurt."] },
        { code: "glute-bridge", sets: 2, reps: 10 },
        { code: "abdominal-bracing", sets: 1, reps: 10, hold: 5 },
        { code: "wrist-extensor-isometric", sets: 2, reps: 5, hold: 5,
          note: ["حول الرسغ النشط — ثابتٌ بلا حركة.", "Around an active wrist — static, without movement."] },
        { code: "stationary-cycling", sets: 1, reps: 1,
          doseNote: ["١٠–١٥ دقيقة بمقاومةٍ خفيفة — هوائيٌّ بلا قفز يحفظ المفاصلَ النشطة (اقتراح).", "10–15 minutes at light resistance — aerobic work without jumping that spares the active joints (a proposal)."] },
        { code: "ra-joint-protection-hand", sets: 1, reps: 1,
          note: ["حمايةُ مفاصل اليد في الكتابة وحمل الحقيبة — للطفل الأكبر.", "Hand joint protection when writing and carrying the bag — for an older child."] },
        { code: "ra-flare-gentle-routine", sets: 1, reps: 1,
          note: ["خطّةُ يوم النوبة يتعلّمها الأهل.", "The flare-day plan, learnt by the family."] },
        { code: "ra-neck-safe-mobility", sets: 1, reps: 1,
          note: ["لمن أُصيبت رقبتُه وحده — حركةٌ لطيفة وعلاماتُ الخطر حتى ينفي الطبيبُ عدمَ الثبات (Kotecki 2021).", "Only for a child whose neck is involved — gentle movement and the warning signs until the doctor excludes instability (Kotecki 2021)."] },
        { code: "cp-goal-task-practice", sets: 1, reps: 1,
          note: ["الأهدافُ يختارها الطفلُ وأهلُه (Steenbeek 2007).", "The goals are chosen by the child and family (Steenbeek 2007)."] },
        { code: "fm-sleep-routine", sets: 1, reps: 1,
          note: ["لمن تقطّع نومُه — النومُ متقطّعٌ في هذا المرض (Saidi 2022).", "For a child with broken sleep — sleep is fragmented in this disease (Saidi 2022)."] },
        { code: "ra-energy-pacing", sets: 1, reps: 1,
          note: ["للإعياء — عند ٦٠–٧٦٪ (Armbrust 2016a).", "For fatigue — present in 60–76% (Armbrust 2016a)."] },
      ],
    },
    {
      name: ["التدريبُ المتدرّج", "Progressive training"],
      sessionFrom: 7, sessionTo: 18,
      timeframe: ["الجلسات ٧–١٨ (الأسابيع ٣–٦)، والقياسُ في الجلسة ١٢", "Sessions 7–18 (weeks 3–6), with measurement at session 12"],
      goals: [
        "قوّةٌ ٣ × ١٠ بأثقالٍ حرّة أو لعبٍ وظيفيّ للمفاصل الهادئة وتمارينُ ثابتة للنشطة، والبيلاتس من ٥ إلى ١٠ مرّات، ودائرةُ التوازن والإحساس بوضع المفاصل، وهوائيٌّ ٢٥–٣٠ دقيقة بلا قفز بشدّةٍ متوسّطة، وتثبيتُ الجذع، والمساندُ تُلبس بجدولها، والبرنامجُ المنزليّ ٣–٤ أيّامٍ في الأسبوع بسجلّ.",
        "Strength 3 × 10 with free weights or functional play for the quiet joints and isometric work for the active ones, Pilates from 5 to 10 repetitions, the balance and proprioception circuit, aerobic work for 25–30 minutes without jumping at moderate intensity, core stability, orthoses worn on their schedule, and the home programme on 3–4 days a week with a diary.",
      ],
      education: [
        "• القوّةُ والتوازنُ معاً أنفعُ من القوّة وحدها للمشي والدرج (Baydogan 2015).\n" +
        "• الشدّةُ المتوسّطة تكفي، والعاليةُ لا تزيد النفعَ وتُضعف الالتزام (Singh-Grewal 2007).\n" +
        "• الألمُ بعد الجهد يزول قبل المساء (Rochette 2018).\n" +
        "• المساندُ كلَّ يوم، والجلدُ كلَّ مساء.",
        "• Strength and balance together help walking and stairs more than strength alone (Baydogan 2015).\n" +
        "• Moderate intensity is enough, and high intensity adds no benefit and weakens adherence (Singh-Grewal 2007).\n" +
        "• Post-exercise pain settles before the evening (Rochette 2018).\n" +
        "• Orthoses every day, and the skin checked every evening.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين يتحقّق واحدٌ فأكثر في قياس الجلسة ١٢ (أو إعادته في ١٨):\n" +
        "• الوظيفةُ −٠٫١٣ فأكثر (Dempster 2001).\n" +
        "• الألمُ −١٠ ملم من ١٠٠ (Powell 2001)، أو وجهان بمقياس الوجوه (اقتراح).\n" +
        "• المشيُ ستّ دقائق +٦٥ متراً (Pritchard 2022).\n" +
        "• هدفٌ بلغ «المتوقّع» بمقياس بلوغ الأهداف أو بالأداء الكنديّ (Steenbeek 2007 · Hadoush 2026).\n" +
        "ومعه: لم تزد المفاصلُ النشطة.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when one or more is met at the session-12 measurement (or its repeat at 18):\n" +
        "• Function −0.13 or more (Dempster 2001).\n" +
        "• Pain −10 mm out of 100 (Powell 2001), or two faces on the faces scale (a proposal).\n" +
        "• The six-minute walk +65 metres (Pritchard 2022).\n" +
        "• A goal at the 'expected' level on Goal Attainment Scaling or the Canadian Occupational Performance Measure (Steenbeek 2007 · Hadoush 2026).\n" +
        "Together with: no rise in active joints.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• القوّة: ٣ × ١٠ بأثقالٍ حرّة أو لعب (Sandstedt 2013)، والتكرارُ يزيد ٥ ⟵ ٨ ⟵ ١٠ كما في البيلاتس (Mendonca 2013)، ومدُّ الركبة أوّلاً (Hansmann 2015)، والمفصلُ النشط بقاعدته؛ والمقاومةُ المتغيّرة ستّةَ أسابيع حسّنت المشيَ والدرج (Elnaggar 2024).\n" +
        "• التوازنُ والإحساس: دائرةٌ ثلاثاً في الأسبوع (Baydogan 2015).\n" +
        "• الهوائيّ: ٢٥–٣٠ دقيقة في الجلسة بلا قفز، نحو ٧٥٪ من أقصى النبض أو «يتكلّم ونفَسُه أسرع» (Klepper 1999 · Singh-Grewal 2007).\n" +
        "• الجذع (Elnaggar 2021)، واليدان بالمهامّ والألعاب (Arman 2019).\n" +
        "• القياسُ في الجلسة ١٢ — منتصفُ الكتلة.",
        "• Strength: 3 × 10 with free weights or play (Sandstedt 2013), repetitions rising 5 → 8 → 10 as in Pilates (Mendonca 2013), knee extension first (Hansmann 2015), and the active joint by its rule; six weeks of variable-resistance training improved walking and stairs (Elnaggar 2024).\n" +
        "• Balance and proprioception: the circuit three times a week (Baydogan 2015).\n" +
        "• Aerobic: 25–30 minutes per session without jumping, about 75% of maximum heart rate or 'can talk, breathing faster' (Klepper 1999 · Singh-Grewal 2007).\n" +
        "• The core (Elnaggar 2021), and the hands through tasks and games (Arman 2019).\n" +
        "• Measurement at session 12 — halfway through the block.",
      ],
      exercises: [
        { code: "jia-pilates-mat-sequence", sets: 1, reps: 5,
          doseNote: ["٥ مرّات في الجلسات الثلاث الأولى، ثمّ ٨، ثمّ ١٠ (Mendonca 2013).", "5 repetitions for the first three sessions, then 8, then 10 (Mendonca 2013)."] },
        { code: "jia-balance-proprioception-circuit", sets: 2, hold: 30, rest: 30 },
        { code: "jia-cardio-karate-dance", sets: 1, reps: 1,
          doseNote: ["٢٥–٣٠ دقيقة في الجلسة بشدّةٍ متوسّطة (Klepper 1999).", "25–30 minutes per session at moderate intensity (Klepper 1999)."] },
        { code: "jia-play-rom-morning-routine", sets: 1, reps: 5,
          note: ["يستمرّ كلَّ صباح في البيت.", "Continues every morning at home."] },
        { code: "jia-jaw-mobility-home", sets: 1, reps: 10, hold: 5,
          note: ["يستمرّ في البيت، والقياسُ أسبوعياً.", "Continues at home, with weekly measurement."] },
        { code: "sit-to-stand", sets: 3, reps: 10 },
        { code: "step-up", sets: 2, reps: 10 },
        { code: "cp-functional-strength-play", sets: 3, reps: 10,
          note: ["للأصغر — القوّةُ باللعب.", "For younger children — strength through play."] },
        { code: "terminal-knee-extension", sets: 3, reps: 10,
          note: ["لمدّ الركبة — أحسُّ علامة (Hansmann 2015).", "For knee extension — the most sensitive marker (Hansmann 2015)."] },
        { code: "glute-bridge", sets: 3, reps: 10 },
        { code: "clamshell", sets: 2, reps: 10 },
        { code: "side-lying-hip-abduction", sets: 2, reps: 10,
          note: ["عضلاتُ الورك ضعيفةٌ عند كثيرٍ منهم (Sandstedt 2013).", "The hip muscles are weak in many of them (Sandstedt 2013)."] },
        { code: "calf-raise", sets: 2, reps: 10 },
        { code: "wall-squat", sets: 2, reps: 8, hold: 10,
          note: ["حين تهدأ الركبة.", "Once the knee is quiet."] },
        { code: "grip-putty-squeeze", sets: 2, reps: 10,
          note: ["القبضةُ تتبع نشاطَ المرض (Rashed 2018).", "Grip tracks disease activity (Rashed 2018)."] },
        { code: "band-row", sets: 2, reps: 12 },
        { code: "scapular-setting", sets: 1, reps: 10, hold: 5 },
        { code: "bird-dog", sets: 2, reps: 8,
          note: ["على القبضتين إن آلمه الرسغ.", "On the fists if the wrists hurt."] },
        { code: "front-plank", sets: 2, reps: 1, hold: 20,
          note: ["على الساعدين.", "On the forearms."] },
        { code: "single-leg-balance", sets: 2, reps: 3, hold: 20 },
        { code: "star-excursion-reach", sets: 1, reps: 5 },
        { code: "side-stepping", sets: 2, reps: 10 },
        { code: "stationary-cycling", sets: 1, reps: 1,
          doseNote: ["٢٠–٣٠ دقيقة بشدّةٍ متوسّطة، وفي نوبة الساق بمقاومةٍ خفيفة أو بالذراعين (اقتراح).", "20–30 minutes at moderate intensity, and during a leg flare at light resistance or with the arms (a proposal)."] },
        { code: "knee-to-wall-lunge", sets: 2, reps: 10 },
        { code: "calf-stretch-standing", sets: 2, reps: 1, hold: 30 },
        { code: "hamstring-stretch-seated", sets: 2, reps: 1, hold: 30 },
        { code: "thomas-hip-flexor-stretch", sets: 2, reps: 1, hold: 30,
          note: ["لتيبّس الورك في الثني.", "For a hip stuck in flexion."] },
        { code: "prone-hang-extension", sets: 1, reps: 1,
          note: ["لنقص مدّ الركبة عند الطفل الأكبر.", "For a knee extension deficit in an older child."] },
        { code: "bimanual-adl-tasks", sets: 1, reps: 1,
          note: ["اليدان بالمهامّ والألعاب (Arman 2019).", "The hands through tasks and games (Arman 2019)."] },
      ],
    },
    {
      name: ["المشاركةُ في المدرسة واللعب والحياة", "Participation in school, play and daily life"],
      sessionFrom: 19, sessionTo: 24,
      timeframe: ["الجلسات ١٩–٢٤ (الأسبوعان ٧–٨)، ثمّ البيتُ ومراجعةٌ كلَّ ٣–٤ أشهر", "Sessions 19–24 (weeks 7–8), then home with reviews every 3–4 months"],
      goals: [
        "يعود إلى درس الرياضة واللعب والنشاط نحو ستّين دقيقة في اليوم، والقفزُ للعظم حين تهدأ مفاصلُ الساق، والصلاةُ والجلوسُ على الأرض والمرحاضُ مدرَّبة، والبرنامجُ المنزليّ مسلَّمٌ بالصور يؤدّيه الأهلُ ثلاثاً في الأسبوع فأكثر، والمساندُ مضبوطة والأهلُ يفحصون الجلد، والقياسُ الختاميّ ومواعيدُ المراجعة والعين مكتوبة.",
        "Back to physical education, play and activity towards sixty minutes a day, jumping for bone once the leg joints are quiet, prayer, floor sitting and the toilet practised, the home programme handed over with pictures and run by the family three times a week or more, orthoses fitted with the family checking the skin, and the final measurement and the review and eye-check dates written.",
      ],
      education: [
        "• النشاطُ اليوميّ ستّون دقيقةً معدّلاً وتقويةُ العضلات والعظام ثلاثاً في الأسبوع — ولذوي الإعاقة أيضاً (Bull 2020).\n" +
        "• الرياضةُ آمنة، والاحتكاكُ حين يُضبط المرض، وواقي الفم مع إصابة الفكّ، وصورةُ الرقبة قبل رياضات الاحتكاك إن أُصيبت (Philpott 2010).\n" +
        "• النوبةُ ليست فشلاً: خطّةُ يوم النوبة ثمّ عودةٌ تدريجية (Philpott 2010).",
        "• Daily activity averaging sixty minutes and muscle- and bone-strengthening on three days a week — for children with disability too (Bull 2020).\n" +
        "• Sport is safe, contact sport once the disease is controlled, a mouth guard with jaw involvement, and a neck X-ray before contact sport if the neck is involved (Philpott 2010).\n" +
        "• A flare is not a failure: the flare-day plan, then a gradual return (Philpott 2010).",
      ],
      criteria: [
        "الخروجُ من الكتلة حين يتحقّق واحدٌ ممّا يلي (اقتراح):\n" +
        "• بلغ أهدافَه.\n" +
        "• أو لم يتغيّر في قياسين متتاليين.\n" +
        "• أو يؤدّي الأهلُ البرنامجَ وحدهم (السجلُّ ثلاثةُ أيّامٍ في الأسبوع فأكثر).\n" +
        "ومعه: المساندُ مضبوطة والأهلُ يفحصون الجلد. ويُكتب التغيّر في: الوظيفة (−٠٫١٣ — Dempster 2001)، والألم (−١٠ ملم — Powell 2001)، والمشي ستّ دقائق (+٦٥ متراً — Pritchard 2022)، والقبضة (Ploegmakers 2013)، وفتح الفم (Muller 2013)، والمدى (Len 1999)، وطول الساقين (Sherry 1999).\n" +
        EXTEND_AR,
        "Discharge from the block when one of these is met (a proposal):\n" +
        "• The goals are met.\n" +
        "• Or there is no change across two consecutive tests.\n" +
        "• Or the family runs the programme independently (the diary shows three days a week or more).\n" +
        "Together with: orthoses fitted and the family checking the skin. The change is reported in: function (−0.13 — Dempster 2001), pain (−10 mm — Powell 2001), the six-minute walk (+65 metres — Pritchard 2022), grip (Ploegmakers 2013), mouth opening (Muller 2013), range of motion (Len 1999), and leg length (Sherry 1999).\n" +
        EXTEND_EN,
      ],
      notes: [
        "• المدرسةُ ودرسُ الرياضة واللعبُ والحيّ نحو أهداف الصحّة العالمية (Bull 2020 · Philpott 2010).\n" +
        "• القفز: نحو مئة قفزة إن هدأت مفاصلُ الساق (Sandstedt 2012).\n" +
        "• الصلاةُ والجلوسُ على الأرض والمرحاض (Madi 2004).\n" +
        "• للمراهق الرياضيّ بمرضٍ مضبوط: إحماءُ فيفا ١١+ والعودةُ إلى الجري.\n" +
        "• تسليمُ البرنامج المنزليّ بالصور، والقياسُ الختاميّ في الجلسة ٢٤، ورسالةٌ لطبيب المفاصل بالنتائج وموعدِ العين.",
        "• School, physical education, play and the neighbourhood, towards the World Health Organization targets (Bull 2020 · Philpott 2010).\n" +
        "• Jumping: about one hundred jumps if the leg joints are quiet (Sandstedt 2012).\n" +
        "• Prayer, floor sitting and the toilet (Madi 2004).\n" +
        "• For a sporty adolescent with controlled disease: the FIFA 11+ warm-up and the return to running.\n" +
        "• Handing over the home programme with pictures, the final measurement at session 24, and a letter to the rheumatologist with the results and the eye-check date.",
      ],
      exercises: [
        { code: "jia-jump-rope-bone-loading", sets: 5, reps: 20, rest: 45,
          note: ["حين لا يكون في الساق مفصلٌ نشط.", "Only when there is no active joint in the legs."] },
        { code: "jia-prayer-floor-sitting-squat-toilet", sets: 1, reps: 3 },
        { code: "jia-cardio-karate-dance", sets: 1, reps: 1,
          note: ["ومرّةً في الأسبوع في البيت بالفيديو (Klepper 1999).", "And once a week at home by video (Klepper 1999)."] },
        { code: "jia-pilates-mat-sequence", sets: 1, reps: 10,
          note: ["والبيتُ ٣–٤ أيّام.", "And at home on 3–4 days."] },
        { code: "jia-balance-proprioception-circuit", sets: 2, hold: 45, rest: 30,
          note: ["محطّاتُ الأرض في البيت.", "The floor stations at home."] },
        { code: "jia-play-rom-morning-routine", sets: 1, reps: 5,
          note: ["كلَّ صباح ما بقي التيبّس.", "Every morning while stiffness remains."] },
        { code: "jia-foot-orthoses-shoe-raise", sets: 1, reps: 1,
          note: ["مراجعةُ المقاس وطول الساقين.", "A review of the fit and of leg length."] },
        { code: "jia-knee-extension-night-splint", sets: 1, reps: 1,
          note: ["تُراجَع، أو تُوقف إن عاد المدّ.", "Reviewed, or stopped once extension has returned."] },
        { code: "jia-resting-wrist-hand-splint", sets: 1, reps: 1,
          note: ["يُراجَع وقتُ لبسها.", "The wearing time is reviewed."] },
        { code: "jia-jaw-mobility-home", sets: 1, reps: 10, hold: 5,
          note: ["في البيت، والقياسُ في كلّ مراجعة.", "At home, measured at every review."] },
        { code: "walk-jog-progression", sets: 1, reps: 1,
          note: ["للمراهق بمرضٍ مضبوط.", "For an adolescent with controlled disease."] },
        { code: "fifa-11-plus-warm-up", sets: 1, reps: 1,
          note: ["للاعب كرة القدم بمرضٍ مضبوط.", "For a footballer with controlled disease."] },
        { code: "graded-walking", sets: 1, reps: 1,
          doseNote: ["نحو ستّين دقيقةً من النشاط في اليوم معدّلاً (Bull 2020).", "Towards an average of sixty minutes of activity a day (Bull 2020)."] },
        { code: "step-up", sets: 3, reps: 10 },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["في البيت بحقيبةٍ خفيفة على الظهر.", "At home with a light bag on the back."] },
        { code: "star-excursion-reach", sets: 2, reps: 5 },
        { code: "single-leg-balance", sets: 2, reps: 3, hold: 30 },
        { code: "prayer-stretch-wrist", sets: 1, reps: 3, hold: 20,
          note: ["لرسغٍ هادئ قبل الصلاة.", "For a quiet wrist before prayer."] },
        { code: "cp-goal-task-practice", sets: 1, reps: 1,
          note: ["في المدرسة والبيت.", "At school and at home."] },
        { code: "scol-school-bag-carry", sets: 1, reps: 1,
          note: ["الحقيبةُ بالحمّالتين.", "The bag on both straps."] },
        { code: "neutral-wrist-tasks", sets: 1, reps: 1,
          note: ["للكتابة والحمل مع رسغٍ مصاب.", "For writing and carrying with an involved wrist."] },
        { code: "fm-heat-power-cut-routine", sets: 1, reps: 1,
          note: ["صيفُ العراق وانقطاعُ الكهرباء (AAP 2011).", "The Iraqi summer and power cuts (AAP 2011)."] },
        { code: "ra-energy-pacing", sets: 1, reps: 1,
          note: ["للمدرسة والإعياء.", "For school and fatigue."] },
        { code: "ra-flare-gentle-routine", sets: 1, reps: 1,
          note: ["خطّةُ يوم النوبة في البيت.", "The flare-day plan at home."] },
      ],
    },
  ],
};

// «اضغطه يا سليم» (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz).
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ جلسة بثلاثٍ في الأسبوع (ثمانيةُ أسابيع، وحتى اثني عشرَ أسبوعاً بمرّتين) والأهلُ يؤدّون البرنامجَ ٣–٤ أيّامٍ أخرى، وتمديدٌ واحد باثنتي عشرة بمعياره، ثمّ البيتُ ومراجعةٌ كلَّ ٣–٤ أشهر — ولا تجربةَ قارنت عددَ الجلسات في الأسبوع، ولا تجربةَ جرّبت كتلةً يومية أربعةَ أسابيع للأطفال، وأكثرُ التجارب ثلاثاً في الأسبوع ١٢–٢٨ أسبوعاً: أتبقيه ٣ × ٨، أم يبدأ يومياً من يستطيع بعد نوبةٍ أو حقنٍ أو تيبّسٍ جديد (١٢ في أسبوعين ثمّ ١٢ بمرّةٍ أو مرّتين حتى الأسبوع ١٢)، أم ستّاً في الأسبوع أربعةَ أسابيع كبقيّة البروتوكولات؟ والمسارُ الخفيف ٦–١٢ جلسة: أتقبله؟ وطولُ الجلسة ٣٠–٤٠ دقيقة دون السادسة و٤٥ في ٦–١١ و٥٠–٦٠ للمراهق: أتقبله؟ ومَن يتابع البيتَ بين المراجعات؟",
    en: "24 sessions at three a week (eight weeks, or up to twelve at two a week) with the family doing the programme on 3–4 other days, one extension of twelve by its criterion, then home with a review every 3–4 months (Davies 2010) — no trial has compared the number of sessions a week, no trial has tested a daily four-week block in children, and most trials ran three times a week for 12–28 weeks (Iversen 2022 · Klepper 2019): keep it 3 × 8, start daily for families who can after a flare, an injection or a new contracture (12 in two weeks — Epps 2005, then 12 at one or two a week to week 12 — Tarakci 2012), or six a week for four weeks like the other protocols? The light pathway of 6–12 sessions: do you accept it? Session length of 30–40 minutes under six, 45 at 6–11 and 50–60 for adolescents: do you accept it? And who follows the home programme between reviews?" },
  { key: "limits", topic: "limits",
    ar: "الحدود: الوظيفةُ −٠٫١٣، والألمُ −١٠ ملم من ١٠٠ أو وجهان، والمشيُ ستّ دقائق +٦٥ متراً (أصغرُ فرقٍ يُكتشف، ولا فرقَ مهمّاً له في هذا المرض)، وفتحُ الفم +٥ ملم؛ وقاعدةُ الألم حتى ٣ من ١٠ ويعود صباحاً، وتورّمٌ أكثرَ من ٤٨ ساعة يوقف تحميلَ المفصل، ولا قفزَ على المفصل المحقون ٢٤–٤٨ ساعة — والانتقالُ والتمديدُ والقاعدةُ بها اقتراحٌ لا معيارٌ مجرَّب: أتقبلها؟",
    en: "The limits: function −0.13 (Dempster 2001), pain −10 mm out of 100 (Powell 2001) or two faces, the six-minute walk +65 metres (the smallest detectable difference, with no important difference in this disease — Pritchard 2022), and mouth opening +5 mm; the pain rule of up to 3 out of 10 and back by morning (Rochette 2018), swelling for more than 48 hours stopping loading of that joint (Ringold 2019), and no jumping on an injected joint for 24–48 hours — progression, the extension and the rule built on them are proposals, not tested criteria: do you accept them?" },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة مع طبيب المركز وطبيب المفاصل: الطوارئ (الشكلُ الجهازيّ بحمّى مستمرّة، وشبهةُ تنشّط البلعميات، والمفصلُ الحارّ مع حمّى أو رفضِ الوقوف، والحمّى على الدواء الحيويّ أو الكورتيزون العالي، والعينُ الحمراء المؤلمة، وأعراضُ الرقبة العصبية)؛ وإلى طبيب المفاصل خلال أيّام (التورّمُ الجديد، والميلُ المستمرّ للرقبة، وما يشبه سرطانَ الدم — ألمُ الليل والشحوبُ والكدمات)؛ والعيونُ بجدول الخطر (كلَّ ثلاثة أشهر لعالي الخطر)؛ والعظامُ لفرق طول الساقين — راجعها. ومَن يكتب نشاطَ المرض والمفاصلَ النشطة؟ ومَن يتحقّق من موعد العين في بداية كلّ كتلة؟ وإلى أيّ طوارئ أطفالٍ يُرسَل الطفلُ في اليوم نفسه؟",
    en: "The referral rules with the centre's doctor and the rheumatologist: emergency (systemic disease with persistent fever — Fautrel 2024, suspected macrophage activation syndrome — Minoia 2014, a hot joint with fever or refusal to bear weight — Kocher 1999, fever on a biologic or high-dose steroid — Beukelman 2012 · Becker 2017, a painful red eye — Davies 2010, and neurological neck symptoms — Kotecki 2021); to the rheumatologist within days (new swelling — Ringold 2019, a persistent neck tilt — Quesada-Masachs 2025, and leukaemia-like features — night pain, pallor and bruising, Brix 2020); the eyes by risk schedule (every three months at high risk — Angeles-Han 2019); and orthopaedics for leg-length difference (Sherry 1999) — review them. Who records disease activity and the active joints? Who checks the eye date at the start of every block? And to which paediatric emergency department is a child sent the same day?" },
  { key: "heat-devices", topic: "devices",
    ar: "الحرارةُ والأجهزةُ عند الطفل: الكمادةُ والشمعُ مساعدان لمفصلٍ متيبّسٍ غيرِ حارّ وحده، ولطفلٍ يستطيع أن يقول «حارّ» وأحدُ الوالدين حاضر — أتقبله، ومن أيّ عمر؟ وإعداداتُ الشمع من بروتوكول الروماتويد في المركز؟ والتيّارُ المتداخل مع التمرين بلا إعداداتٍ منشورة: أنستعمله؟ والليزرُ «لا يُستخدم» — أم تسمح به للمراهق قربَ اكتمال النموّ بإعدادات التجربة الوحيدة (٩٠٣ نانومتر، ٥٠ ملّي واط، ١٫٥ جول)، مع أنّ ليزراً آخرَ أضرّ صفيحةَ النموّ عند الحيوان؟ ومَن يقرّر أنّ صفيحةَ النموّ أُغلقت؟",
    en: "Heat and devices in children: the hot pack and wax are adjuncts for a stiff joint that is not hot only, in a child who can say 'hot', with a parent present (Houghton 2010) — do you accept this, and from what age? Wax settings from the centre's rheumatoid arthritis protocol? Interferential current with exercise, with no published settings (Elnaggar 2016): do we use it? Laser is 'not used' — or do you allow it for adolescents near the end of growth with the only trial's settings (903 nm, 50 mW, 1.5 J — Elnaggar 2022), although another laser harmed the growth plate in animals (Oliveira 2012)? And who decides that the growth plate has closed?" },
  { key: "orthoses", topic: "content",
    ar: "المساند: المركزُ يصنع جبيرةَ مدّ الركبة الليلية وجبيرةَ الرسغ واليد والنعلَ الطبّيّ ورفعَ الحذاء — مَن يصفها (طبيبُ المفاصل أم الأخصائيّ أم قسمُ المساند)، ومَن يركّبها، وكلَّ كم تُعاد (والمقترحُ كلَّ ٢–٤ أسابيع للركبة، و٤ أسابيع و٣ أشهر للنعل، وفي كلّ كتلة للرسغ)؟ والنعلُ مصنوعٌ شبهُ صلب أم جاهزٌ مضبوط؟ ومن أيّ فرقٍ في طول الساقين يُرفع الحذاء — ولا دراسةَ لحدّه؟ ولا جبيرةَ للراحة بعد الحقن: أتوافق؟ والجبسُ المتسلسل للتيبّس بلا تجربة: أنقدّمه؟",
    en: "Orthoses: the centre makes the night knee extension splint, the wrist and hand splint, foot orthoses and shoe raises — who prescribes them (the rheumatologist, the specialist or the orthotics department), who fits them, and how often are they refitted (proposed: every 2–4 weeks for the knee, at 4 weeks and 3 months for foot orthoses — Fellas 2022a, and every block for the wrist)? Custom semirigid orthoses (Powell 2005) or adjusted preformed ones (Coda 2014 · Fellas 2025)? From what leg-length difference is a shoe raised — with no study of a threshold (Sherry 1999 · Moued 2013)? No resting splint after an injection (Flanagan 2019 · Wallen 2006): do you agree? And serial casting for contractures, with no trial (Fredriksen 2000): do we offer it?" },
  { key: "jaw-neck", topic: "content",
    ar: "الفكُّ والرقبة: أنعطي تمارينَ الفكّ بأنفسنا لكلّ من أُصيب فكُّه، ونقيس فتحَ الفم في كلّ كتلة، ونحيل كلَّ طفلٍ بأعراض الفكّ إلى طبيب تقويم الأسنان للجبيرة الفموية؟ ومع إصابة الرقبة: لا شدَّ ولا تقويمَ ولا مقاومةَ في نهاية المدى ولا تمارينَ الرقبة الكاملة حتى ينفي طبيبُ المفاصل عدمَ ثبات الفقرتين الأولى والثانية — أتوافق؟ ومَن يطلب صورةَ الرقبة في المركز، وهل تُطلب لكلّ طفلٍ أُصيبت رقبتُه قبل رياضات الاحتكاك؟",
    en: "The jaw and neck: do we give jaw exercises ourselves to every child whose jaw is involved (Vassis 2023 · Stoustrup 2023), measure mouth opening at every block (Muller 2013 · Huhtanen 2024), and refer every child with jaw symptoms to the orthodontist for an oral splint (Stoustrup 2014)? With neck involvement: no traction, no manipulation, no resisted end-range work and no full-range neck exercises until the rheumatologist excludes instability of the first and second vertebrae (Kotecki 2021 · Hospach 2014) — do you agree? Who orders the neck X-ray in the centre, and is it ordered for every child with neck involvement before contact sport (Philpott 2010)?" },
  { key: "device-others", topic: "devices",
    ar: "التمرينُ أساسيّ؛ والأمواجُ فوق الصوتية «لا يُستخدم» فوق صفيحة النموّ والدليلُ متضارب، والموجاتُ الصادمة «لا يُستخدم» — يمنعها أكثرُ صانعي الأجهزة قبل اكتمال النموّ ولا دليلَ عليها في الأطفال، فلا إعداداتٍ تمنع اعتمادَه؛ والمغناطيسُ والأشعّةُ تحت الحمراء والتيكارُ والضغطُ والشدُّ (وشدُّ الرقبة ممنوع) والجهازُ السلبيّ (بأمر الجرّاح وحده) والروبوتُ والإبرُ «لا يُستخدم» بلا بياناتٍ في هذا المرض: أبقِها أو غيّرها.",
    en: "Exercise is core; ultrasound is 'not used' over the growth plate, with conflicting evidence (Lyon 2003 · Houghton 2010), and shockwave is 'not used' — most device makers contraindicate it before growth is complete and there is no evidence in children (RCPod 2023), so no settings block approval; magnetic therapy, infrared, TECAR, compression, traction (neck traction forbidden — Kotecki 2021), the passive-motion device (on the surgeon's order only), the robot and needles are 'not used', with no data in this disease (Pulay 2024 · April 2011): keep or change them." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: الألمَ بمقياس الوجوه من ٠ إلى ١٠ (الأقلّ أفضل — له نسخةٌ عربية من الثامنة ولا فرقَ مهمّاً له)، والمشيَ ستّ دقائق بالمتر (الأكثر أفضل)، والقبضةَ بالكيلوغرام، وفتحَ الفم بالملّيمتر، والمدى بمقياس المفاصل المختصر، وفرقَ طول الساقين بالسنتيمتر (الأقلّ أفضل)، والنهوضَ والمشيَ المعدَّل بالثواني والدرجَ صعوداً ونزولاً، وجودةَ الحياة العامّة بالعربية (ولا نسخةَ عربية لوحدة التهاب المفاصل)، والإعياءَ، وبلوغَ الأهداف أو الأداءَ الكنديّ بالعربية؛ والتقريرُ متعدّدُ الأبعاد للمرض له نسخٌ عربية سعودية ومصرية وعُمانية وليبية وجزائرية ولا عراقية — أيُّها نعتمد؟ واستبيانُ الوظيفة مزروع — السعوديةُ المكيَّفة للأطفال العرب أم المصرية؟ وعددُ المفاصل النشطة مزروع — يكتبه الطبيب أم الأخصائيّ؟",
    en: "Add under 'Measures' → custom measure: pain on the faces scale from 0 to 10 (lower is better — an Arabic version from age eight, Finianos 2021, and no important difference — Hicks 2001), the six-minute walk in metres (higher is better — Pritchard 2022 · Ben Saad 2009), grip in kilograms (Ploegmakers 2013), mouth opening in millimetres (Muller 2013), range on the reduced joint scale (Len 1999), leg-length difference in centimetres (lower is better — Sherry 1999), the modified timed up and go in seconds (Al-Toaimi 2021) and timed up-and-down stairs (Del Corral 2021), generic quality of life in Arabic (Arabiat 2011 — with no Arabic arthritis module, Varni 2002), fatigue (Varni 2004 · Al-Gamal 2017), and goal attainment or the Arabic Canadian Occupational Performance Measure (Steenbeek 2007 · Hadoush 2026); the multidimensional disease report has Saudi, Egyptian, Omani, Libyan and Algerian Arabic versions and no Iraqi one (Al-Mayouf 2018 · El Miedany 2018 · Al-Abrawi 2018 · Hashad 2018 · Aiche 2018 · Bovis 2018) — which do we adopt? The function questionnaire is seeded — the Saudi version adapted for Arab children (Madi 2004) or the Egyptian one (El Miedany 2003)? The active joint count is seeded — entered by the doctor or the specialist?" },
];

export const name = "177_physio_jia_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
