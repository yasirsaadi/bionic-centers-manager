// Migration 159: ما بعد إعادة بناء الرباط الصليبيّ الأماميّ — البروتوكولُ الثالث والعشرون مفصَّلاً (§4.er — ٢٠٢٦-١٠-١٩).
//
// المالك (٢٠٢٦-١٠-١٩): «ممتاز نكمل البروتوكول التالي» — فاختار المساعدُ ما بعد إعادة بناء الرباط الصليبيّ الأماميّ (`acl-reconstruction-adult`):
// أشيعُ ما بقي في العلاج الخارجيّ، ومريضُه في العراق شابٌّ يلعب كرةَ القدم ويصل متأخّراً (٤٠٫٦ شهراً إلى العملية في كردستان — Kader 2023، وتمزّقُ
// الغضروف الإنسيّ عند ٨٠٪ في الديوانية — Alardi 2023)؛ ويستعمل بطاقاتِ الركبة القائمة بصورها.
// **بالقالب كاملاً** (§4.dd) **وبأربع مراحل لأوّل مرّة**: ٨٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة في **أربع كتلٍ تفصلها فتراتُ برنامجٍ منزليّ** — فالأسابيعُ
// الأربعةَ عشرَ المشتقّة أسابيعُ حضورٍ لا أسابيعُ تقويم: ١–٢٤ (الأسابيع ١–٤ يومياً) · ٢٥–٤٨ (الأسابيع ٥–١٢) · ٤٩–٧٢ (من الأسبوع ١٢ بمعايير الجري)
// · ٧٣–٨٤ (الأشهر ٦–٩)، واختبارُ العودة في الشهر التاسع أو بعده؛ وتمديدٌ واحد بستٍّ لكلّ كتلة، ومن لا يمارس رياضةً بالتفاف يكتفي بـ٤٨ — اقتراحٌ داخل
// «مرّتين إلى ثلاثٍ في الأسبوع ستّةَ أشهرٍ إلى عشرة» بدرجة A (Logerstedt 2017)، ولا تجربةَ للحضور اليوميّ (بحثٌ صفريّ). ومعاييرُ رقمية لكلّ مرحلة (المدّ،
// ودرجةُ التورّم، ونسبةُ قوّة الفخذ ٨٠٪ ثمّ ٩٠٪، واختباراتُ القفز ٩٠٪، ومقياسُ الركبة الذاتيّ، والجاهزيةُ النفسية) **وقاعدةُ تورّمٍ ووجع** (اختبارُ المسح
// وقواعدُ الوجع وألمُ مقدّم الركبة)؛ **وقواعدُ الطُّعم**: مدُّ الركبة جالساً من الأسبوع الرابع في ٩٠–٤٥° يتّسع حتى الثامن، ووترُ خلف الفخذ بلا ثقلٍ حتى
// الأسبوع ١٢ (van Melick 2016)؛ **وخياطةُ الغضروف تعليماتُ الجرّاح تحكم**؛ وثماني بطاقاتٍ جديدة والمعادةُ بصورها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها
// و«استعمال المركز» (**والتحفيزُ العضليّ أساسيٌّ** كما في استبدال الركبة — A)؛ والمقاييسُ كما زُرعت؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة.
//
// **والأجهزة**: التمرينُ والتحفيزُ أساسيّان، والتبريدُ مع الضغط مساعدٌ له أساس، والمغناطيسُ والحرارةُ مساعدةٌ بقاعدة المركز؛ والتيكارُ «لا يُستخدم» لمسامير
// تثبيت الطُّعم المعدنية، والموجاتُ الصادمة «لا يُستخدم» ولها تجربةٌ بالوهميّ بإعداداتها لقرار سليم — **فلا إعداداتِ جهازٍ تمنع اعتمادَه**.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٣٩٦ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ثمانٍ؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٢٩ و١٣٠ و١٣٨ و١٥٥ و١٥٧ و١٥٨) تُربط برموزها وصورها، وما يخصّ الرباطَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "prone-hang-extension", nameAr: "الانبطاح وتدلّي الساق لمدّ الركبة الكامل", nameEn: "Prone hang for full knee extension",
    kind: "stretch", region: "knee", homeSuitable: true, sets: 1, hold: 600,
    purpose: ["يعيد المدَّ الكامل للركبة — مساوياً للركبة الأخرى بما فيه فرطُ المدّ — بثقل الساق وحده: فنقصُ ٣–٥° من المدّ أضرّ بالنتيجة بعد أربعَ عشرةَ سنة (Shelbourne & Gray 2009)، ونقصُ المدّ في الأسبوع الثالث رفع احتمالَ إعادة العملية لعقدة «السايكلوبس» ٢٫٣٠ مرّة وفي السادس ٧٫٩٦ (Delaloye 2020)؛ وهو من تمارين اليوم الأوّل في برنامج ديلاوير (Adams 2012 · Filbay 2019).",
      "Restores full knee extension — equal to the other knee, including hyperextension — with the weight of the leg alone: a loss of 3–5° of extension harmed the result after fourteen years (Shelbourne & Gray 2009), and an extension deficit at week 3 raised the odds of re-operation for a cyclops lesion 2.30-fold and at week 6 7.96-fold (Delaloye 2020); it is a day-one exercise in the Delaware programme (Adams 2012 · Filbay 2019)."],
    start: ["منبطحاً على سريرٍ أو طاولة علاج، والفخذان مسنودتان، والرضفةُ (صابونة الركبة) خارجَ حافّة السرير مباشرةً، والساقان متدلّيتان بحرّية؛ وحزامٌ فوق الحوض إن ارتفع الورك.",
      "Lying face down on a bed or treatment table with the thighs supported, the kneecap just beyond the edge of the bed, and the lower legs hanging freely; a belt over the pelvis if the hip lifts."],
    steps: [[
      "انبطح على السرير، وتزحزح إلى الخلف حتى تصير الرضفةُ خارجَ الحافّة مباشرةً.",
      "أرخِ عضلاتِ الفخذ وخلفه تماماً ودع الساقَ تتدلّى بثقلها، وتنفّس بهدوء.",
      "ابقَ هكذا عشر دقائق بلا ثقل في البداية.",
      "إن لم يتساوَ المدُّ مع الركبة الأخرى بعد أيّام: أضف ثقلاً على الكاحل ٠٫٥–٢ كغم وأطِل المدّة بقدر ما تتحمّل (Adams 2012).",
      "انهض بثني الركبة السليمة أوّلاً ثمّ الأخرى ببطء.",
    ], [
      "Lie face down on the bed and shuffle back until the kneecap is just beyond the edge.",
      "Relax the front and back of the thigh completely, let the leg hang by its own weight, and breathe calmly.",
      "Stay like this for ten minutes, with no weight at first.",
      "If extension is still not equal to the other knee after a few days: add an ankle weight of 0.5–2 kg and lengthen the time as tolerated (Adams 2012).",
      "Get up by bending the good knee first, then the other one slowly.",
    ]],
    cues: [[
      "ارتفاعُ الورك عن السرير ⟵ حزامٌ فوق الحوض أو يدٌ تضغطه برفق.",
      "شدُّ عضلات خلف الفخذ لا إرادياً ⟵ تنفّسٌ بطيء وإرخاء، ودقيقةٌ أطول.",
      "الرضفةُ على الحافّة فتضغط ⟵ تزحزحٌ إلى الخلف حتى تصير خارجها.",
    ], [
      "The hip lifting off the bed → a belt over the pelvis or a hand pressing it gently.",
      "Involuntary tightening of the hamstrings → slow breathing and relaxing, and a longer minute.",
      "The kneecap on the edge, pressing → shuffle back until it is beyond it.",
    ]],
    easier: ["إسنادُ الكعب في الاستلقاء على الظهر (بطاقة «مدّ الركبة بإسناد الكعب»)، أو مدّةٌ أقصر ٥ دقائق.", "A heel prop lying on the back (the 'heel prop' card), or a shorter time of 5 minutes."],
    harder: ["ثقلٌ على الكاحل ٠٫٥–٢ كغم، ومدّةٌ أطول، ومرّاتٌ أكثر في اليوم.", "An ankle weight of 0.5–2 kg, a longer time and more times a day."],
    stopIf: ["ألمٌ حادّ خلف الركبة، أو خدرٌ أو تنميلٌ في القدم، أو تورّمٌ أكثر صباحَ اليوم التالي ⟵ يخبر الأخصائيّ؛ وحاجزٌ نابض يوقف المدَّ ولا يتغيّر، أو نقصٌ يعود بعد أن تحسّن ⟵ الجرّاح (عقدةُ «السايكلوبس»).",
      "Sharp pain behind the knee, numbness or tingling in the foot, or more swelling the next morning → tell the therapist; and a springy block that stops extension and does not change, or a loss that returns after improving → the surgeon (a cyclops lesion)."],
    equipment: ["سريرٌ أو طاولةُ علاج، ومنشفةٌ تحت الفخذ، وثقلُ كاحل ٠٫٥–٢ كغم، وحزامٌ عند الحاجة.", "A bed or treatment table, a towel under the thigh, a 0.5–2 kg ankle weight, and a belt when needed."],
    doseNote: ["١٠ دقائق ٣–٤ مرّات في اليوم حتى يتساوى المدُّ مع الركبة الأخرى، ويُقاس في كلّ جلسة من الكتلة الأولى؛ ونقصٌ ٥° فأكثر في الأسبوع الثالث يجعله يومياً في المركز، وفي السادس يُحال (اقتراح — Delaloye 2020).",
      "10 minutes 3–4 times a day until extension equals the other knee, measured at every session of block 1; a deficit of 5° or more at week 3 makes it daily in the centre, and at week 6 it is referred (a suggestion — Delaloye 2020)."],
    images: [{ key: "prone-hang-extension-1", ar: "شخصٌ منبطحٌ على طاولة علاج والفخذان مسنودتان، والساقان متدلّيتان من حافّتها فتمتدّ الركبةُ بثقل الساق",
      en: "A person lying face down on a treatment table with the thighs supported and the lower legs hanging over its edge, so the knee straightens under the leg's weight", search: "prone hang knee extension" }],
  },
  {
    code: "acl-open-chain-knee-extension", nameAr: "مدّ الركبة جالساً في مدىً محميّ بعد الرباط الصليبيّ (٩٠–٤٥° ثمّ أوسع)", nameEn: "Open-chain knee extension in a protected range after ACL reconstruction (90–45°, then wider)",
    kind: "strength", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يقوّي عضلةَ الفخذ الأمامية في المدى الذي يُجهد الطُّعمَ أقلّ — فإجهادُ الرباط أعلى في السلسلة المفتوحة وأقصاه بين ١٠ و٣٠°، وأقلُّه بين ٥٠ و١٠٠° (Escamilla 2012) — بقاعدة الدليل الهولنديّ: من الأسبوع الرابع في ٩٠–٤٥° ثمّ يتّسع حتى المدى كاملاً في الثامن، والثقلُ مسموحٌ لطُعم وتر الرضفة وممنوعٌ لطُعم وتر خلف الفخذ حتى الأسبوع ١٢ (van Melick 2016)؛ والمبكّرُ بلا قيدٍ زاد ارتخاءَ طُعم خلف الفخذ ١٫٠–١٫٢ مم (Heijne 2007) أمّا ٩٠–٤٥° من الأسبوع الرابع فلم يزده (Fukuda 2013)، وإضافتُه أعادت ١٢ لاعباً إلى مستواهم مقابل ٥ وأسرعَ بشهرين (Mikkelsen 2000).",
      "Strengthens the front of the thigh in the range that strains the graft least — ACL strain is higher in open-chain work and peaks between 10° and 30°, and is lowest between 50° and 100° (Escamilla 2012) — by the Dutch guideline's rule: from week 4 in 90–45°, then widening to the full range by week 8, with added weight allowed for a patellar-tendon graft and not for a hamstring graft until week 12 (van Melick 2016); unrestricted early work increased hamstring-graft laxity by 1.0–1.2 mm (Heijne 2007), whereas 90–45° from week 4 did not (Fukuda 2013), and adding it returned 12 players to their level versus 5, two months sooner (Mikkelsen 2000)."],
    start: ["جالساً على كرسيٍّ عالٍ أو طاولة، والظهرُ مسنود والفخذُ على المقعد ومنشفةٌ ملفوفة تحته، والركبةُ مثنيّة ٩٠°؛ وعلامةٌ عند حدّ المدى المسموح هذا الأسبوع (كرسيٌّ صغير أمام القدم أو يدُ الأخصائيّ).",
      "Sitting on a high chair or table with the back supported, the thigh on the seat over a rolled towel and the knee bent to 90°; with a marker at the limit of this week's allowed range (a low stool in front of the foot or the therapist's hand)."],
    steps: [[
      "اجلس والركبةُ مثنيّة ٩٠° والقدمُ معلّقة.",
      "مدَّ الركبةَ ببطء (ثانيتان) حتى حدّ المدى المسموح هذا الأسبوع لا أبعد.",
      "اثبت ثانيةً واحدة وعضلةُ الفخذ مشدودة.",
      "أنزل الساقَ ببطء (ثلاث ثوانٍ) حتى ٩٠°.",
      "الثقلُ بحسب الطُّعم: وترُ الرضفة أو وترُ الفخذ بثقلٍ على الكاحل بقاعدة «زائد اثنين»، ووترُ خلف الفخذ بثقل الساق وحده حتى الأسبوع ١٢.",
    ], [
      "Sit with the knee bent to 90° and the foot hanging.",
      "Straighten the knee slowly (two seconds) to the limit of this week's allowed range, no further.",
      "Hold for one second with the thigh muscle tight.",
      "Lower the leg slowly (three seconds) back to 90°.",
      "The load depends on the graft: a patellar-tendon or quadriceps-tendon graft with an ankle weight by the 'plus-two' rule, and a hamstring graft with the weight of the leg alone until week 12.",
    ]],
    cues: [[
      "تجاوزُ حدّ المدى ⟵ القدمُ تلمس العلامةَ وتعود.",
      "رفعُ الفخذ أو الميلُ إلى الخلف ⟵ الفخذُ على المقعد والظهرُ مسنود.",
      "إسقاطُ الساق بسرعة ⟵ إنزالٌ بطيء ثلاثَ ثوانٍ.",
    ], [
      "Going past the range limit → the foot touches the marker and comes back.",
      "Lifting the thigh or leaning back → the thigh on the seat and the back supported.",
      "Letting the leg drop quickly → a slow three-second lowering.",
    ]],
    easier: ["مدىً أصغر (٩٠–٦٠°)، وبلا ثقل، ومرّاتٌ أقلّ.", "A smaller range (90–60°), no weight, and fewer repetitions."],
    harder: ["مدىً أوسع بالجدول، وثقلٌ أكبر بقاعدة «زائد اثنين» (وترُ الرضفة ووترُ الفخذ، وخلفُ الفخذ بعد الأسبوع ١٢)، أو جهازُ مدّ الركبة بساقٍ واحدة.", "A wider range by the schedule, a heavier load by the 'plus-two' rule (patellar- and quadriceps-tendon grafts, and hamstring grafts after week 12), or a knee-extension machine one leg at a time."],
    stopIf: ["ألمٌ في مقدّم الركبة فوق ٣ من ١٠ أثناءه أو لا يهدأ صباحَ اليوم التالي، أو زيادةُ التورّم درجةً ⟵ مدىً أو ثقلٌ أقلّ ويخبر الأخصائيّ؛ وانفلاتٌ جديد في الركبة ⟵ الجرّاح.",
      "Pain at the front of the knee above 3/10 during it or not settled by the next morning, or swelling up one grade → a smaller range or load and tell the therapist; and new giving way of the knee → the surgeon."],
    equipment: ["كرسيٌّ عالٍ أو طاولة، ومنشفة، وأثقالُ كاحل ٠٫٥–٥ كغم أو جهازُ مدّ الركبة، ومنقلةٌ أو علامةٌ للمدى.", "A high chair or table, a towel, ankle weights of 0.5–5 kg or a knee-extension machine, and a goniometer or a range marker."],
    doseNote: ["الأسبوع ٤: ٩٠–٤٥°، والخامس ٩٠–٣٠°، والسادس ٩٠–٢٠°، والسابع ٩٠–١٠°، والثامن المدى كاملاً (van Melick 2016)؛ ٣ × ١٠–١٥ ثمّ ٣–٤ × ٦–٨ بأقصى جهد في أيّام القوّة.",
      "Week 4: 90–45°, week 5: 90–30°, week 6: 90–20°, week 7: 90–10°, week 8: the full range (van Melick 2016); 3 × 10–15, then 3–4 × 6–8 at maximal effort on strength days."],
    images: [{ key: "acl-open-chain-knee-extension-1", ar: "شخصٌ جالسٌ على كرسيٍّ يمدّ ركبةً واحدة من ٩٠° نحو ٤٥° بثقلٍ على الكاحل — لا حتى المدّ الكامل",
      en: "A person sitting on a chair straightening one knee from 90° towards 45° with an ankle weight — not to full extension", search: "seated knee extension ankle weight" }],
  },
  {
    code: "single-leg-pogo-hops", nameAr: "قفزاتُ النابض الصغيرة على ساقٍ واحدة", nameEn: "Single-leg pogo hops",
    kind: "functional", region: "knee", perSide: true, homeSuitable: true, sets: 3, reps: 10, rest: 60,
    purpose: ["يدرّب نابضَ الكاحل وثباتَ الركبة على قفزاتٍ صغيرة متكرّرة — والقفزُ المتكرّر على ساقٍ واحدة بلا ألم أحدُ معايير بدء الجري في الدليل القطريّ (Kotsifaki 2023)؛ فهو تمرينٌ واختبارٌ معاً قبل الجري والقفز الأكبر.",
      "Trains the spring of the ankle and the control of the knee in small repeated hops — pain-free repeated single-leg hopping is one of the criteria for starting to run in the Qatari guideline (Kotsifaki 2023); so it is both an exercise and a test before running and bigger hops."],
    start: ["واقفاً على القدمين بحذاءٍ رياضيّ على أرضٍ مستوية غير زلقة، والركبتان مثنيّتان قليلاً، واليدان على الخصر أو قرب درابزين.",
      "Standing on both feet in sports shoes on a flat, non-slip floor, with the knees slightly bent and the hands on the hips or near a rail."],
    steps: [[
      "ابدأ بقفزاتٍ صغيرة سريعة على القدمين معاً، عشراً.",
      "قف على الساق المُعالَجة وحدها والركبةُ مثنيّة قليلاً فوق الأصابع.",
      "اقفز قفزاتٍ صغيرة (بضعة سنتيمترات) على مقدّم القدم والكاحلُ مشدود كالنابض.",
      "اهبط بهدوءٍ ونعومة في المكان نفسِه، والركبةُ فوق إصبع القدم الثاني.",
      "عشرُ قفزات ثمّ راحة؛ وفي اليوم التالي يُفحص التورّم.",
    ], [
      "Start with small, quick hops on both feet together, ten of them.",
      "Stand on the treated leg alone with the knee slightly bent over the toes.",
      "Make small hops (a few centimetres) on the ball of the foot with the ankle stiff like a spring.",
      "Land quietly and softly on the same spot, with the knee over the second toe.",
      "Ten hops, then rest; the swelling is checked the next day.",
    ]],
    cues: [[
      "الركبةُ تميل إلى الداخل ⟵ الركبةُ فوق الأصابع الوسطى.",
      "هبوطٌ ثقيل بصوتٍ عالٍ ⟵ هبوطٌ هادئ كالنابض.",
      "قفزاتٌ عالية ⟵ قفزاتٌ صغيرة بضعة سنتيمترات.",
    ], [
      "The knee drifting inwards → the knee over the middle toes.",
      "A heavy, loud landing → a quiet, springy landing.",
      "High hops → small hops of a few centimetres.",
    ]],
    easier: ["على القدمين معاً، أو باليد على الدرابزين، أو قفزاتٌ أقلّ.", "On both feet, or with a hand on the rail, or fewer hops."],
    harder: ["٢٠ قفزة، ثمّ قفزاتٌ صغيرة إلى الأمام والخلف والجانبين، وبلا درابزين.", "20 hops, then small hops forwards, backwards and sideways, and without the rail."],
    stopIf: ["ألمٌ في الركبة فوق ٣ من ١٠، أو انفلات، أو تورّمٌ زاد درجةً صباحَ اليوم التالي ⟵ يتوقّف ويعود إلى التمارين السابقة يومين.",
      "Knee pain above 3/10, giving way, or swelling up one grade the next morning → stop and go back to the previous exercises for two days."],
    equipment: ["أرضٌ مستوية غير زلقة، وحذاءٌ رياضيّ، ودرابزين أو حائط.", "A flat, non-slip floor, sports shoes, and a rail or wall."],
    doseNote: ["من الأسبوع ١٢ مع معايير الجري: ٣ × ١٠ ثمّ ٣ × ٢٠؛ وعشرُ قفزاتٍ على الساق المُعالَجة بلا ألم ولا تورّمٍ زائد صباحاً شرطُ بدء الجري (Kotsifaki 2023).",
      "From week 12 with the running criteria: 3 × 10, then 3 × 20; ten hops on the treated leg with no pain and no extra swelling the next morning are the condition for starting to run (Kotsifaki 2023)."],
    images: [{ key: "single-leg-pogo-hops-1", ar: "قفزاتٌ صغيرة متكرّرة في المكان على مقدّم القدم والكاحلُ مشدود والركبةُ شبه ممدودة",
      en: "Small repeated hops in place on the ball of the foot, with the ankle stiff and the knee nearly straight", search: "pogo hops single leg" }],
  },
  {
    code: "walk-jog-progression", nameAr: "العودةُ إلى الجري بالمشي والهرولة المتناوبين (ثماني درجات)", nameEn: "Walk–jog return-to-running progression (eight levels)",
    kind: "aerobic", region: "whole_body", homeSuitable: true,
    purpose: ["يعيد الجريَ بدرجاتٍ محسوبة لا بقفزة: درجاتُ برنامج ديلاوير الثماني، أربعَ مرّاتٍ في الأسبوع على الأكثر ولا يومين متتاليين، ودرجتان على الأكثر في سبعة أيّام، والدرجةُ التالية بعد مسافتها بلا ألمٍ ولا تورّمٍ زائد (Adams 2012)؛ وأكثرُ الدراسات بدأت الجريَ في الأسبوع الثاني عشر أو بعده (Rambaud 2018).",
      "Brings running back in measured levels rather than one jump: the eight levels of the Delaware programme, at most four times a week and never on two consecutive days, at most two levels in seven days, and the next level only after its distance with no pain and no extra swelling (Adams 2012); most studies started running at week 12 or later (Rambaud 2018)."],
    start: ["على مضمارٍ مستوٍ أو سيرٍ متحرّك، بحذاء جري، بعد إحماءٍ خمسَ دقائق مشياً، وفي يومٍ لم يسبقه جري.",
      "On a flat track or a treadmill, in running shoes, after a five-minute walking warm-up, on a day not preceded by running."],
    steps: [[
      "الدرجة ١: مشيُ ١٦٠ متراً ثمّ هرولةُ ١٦٠ متراً، عشرَ مرّات (٣٫٢ كم).",
      "الدرجاتُ ٢–٤: المشيُ ١٦٠ متراً كما هو، والهرولةُ ٣٢٠ ثمّ ٤٨٠ ثمّ ٦٤٠ متراً، حتى ٣٫٢ كم.",
      "الدرجاتُ ٥–٧: هرولةٌ متّصلة ٣٫٢ ثمّ ٤ ثمّ ٤٫٨ كم.",
      "الدرجة ٨: جريٌ وهرولةٌ بالتناوب كلَّ ٤٠٠ متر.",
      "لا ينتقل إلى الدرجة التالية إلّا بعد يومٍ بلا ألمٍ ولا تورّمٍ زائد، وبقواعد الوجع.",
    ], [
      "Level 1: walk 160 m, then jog 160 m, ten times (3.2 km).",
      "Levels 2–4: the walk stays at 160 m and the jog becomes 320, then 480, then 640 m, up to 3.2 km.",
      "Levels 5–7: a continuous jog of 3.2, then 4, then 4.8 km.",
      "Level 8: running and jogging alternately every 400 m.",
      "Move to the next level only after a day with no pain and no extra swelling, by the soreness rules.",
    ]],
    cues: [[
      "الجريُ يومين متتاليين ⟵ يومٌ بلا جري بينهما.",
      "القفزُ ثلاثَ درجات في أسبوع ⟵ درجتان على الأكثر في سبعة أيّام.",
      "العرجُ أو قِصرُ الخطوة على الساق المُعالَجة ⟵ يمشي، ويعود إلى الدرجة السابقة.",
    ], [
      "Running on two consecutive days → a day with no running between them.",
      "Jumping three levels in a week → at most two levels in seven days.",
      "A limp or a short step on the treated leg → walk, and go back to the previous level.",
    ]],
    easier: ["البقاءُ في الدرجة نفسِها، أو السيرُ المتحرّك بدل الأرض، أو مسافةٌ أقصر.", "Staying at the same level, a treadmill instead of the ground, or a shorter distance."],
    harder: ["الدرجةُ التالية بالقاعدة، ثمّ فتراتٌ أسرع في المرحلة الرابعة.", "The next level by the rule, then faster intervals in phase 4."],
    stopIf: ["ألمٌ فوق ٣ من ١٠ أثناء الجري، أو عرج، أو تورّمٌ زاد درجةً صباحَ اليوم التالي ⟵ يومان بلا جري ثمّ درجةٌ أدنى.",
      "Pain above 3/10 while running, a limp, or swelling up one grade the next morning → two days without running, then one level lower."],
    equipment: ["مضمارٌ مستوٍ أو سيرٌ متحرّك، وحذاءُ جري، وتطبيقٌ أو علاماتٌ لقياس المسافة.", "A flat track or a treadmill, running shoes, and an app or markers to measure distance."],
    doseNote: ["أربعُ مرّاتٍ في الأسبوع على الأكثر ولا يومين متتاليين، ودرجتان على الأكثر في سبعة أيّام (Adams 2012)؛ والبدءُ من الأسبوع ١٢ بمعايير الجري في المرحلة الثانية.",
      "At most four times a week and never two days in a row, at most two levels in seven days (Adams 2012); starting from week 12 with the running criteria of phase 2."],
    images: [{ key: "walk-jog-progression-1", ar: "شخصٌ يهرول على مضمارٍ أو سيرٍ متحرّك",
      en: "A person jogging on a track or a treadmill", search: "jogging return to running" }],
  },
  {
    code: "deceleration-cutting-drills", nameAr: "التوقّف وتغيير الاتّجاه المخطَّط (القَطعُ الجانبيّ)", nameEn: "Deceleration and planned side-step cutting",
    kind: "functional", region: "knee", homeSuitable: false, sets: 3, reps: 5, rest: 60,
    purpose: ["يعيد التوقّفَ وتغييرَ الاتّجاه والركبةُ فوق القدم — ففي كرة القدم وقعت ٤٤٪ من إصابات الرباط بلا تماسّ و٤٤٪ بتماسٍّ غير مباشر، والركبةُ مائلةٌ إلى الداخل في ٨١٪، أثناءَ الضغط على الخصم والتعثّر بعد الركل والهبوط (Della Villa 2020)؛ وهو من مراحل التأهيل في الملعب (Buckthorpe 2019).",
      "Restores stopping and changing direction with the knee over the foot — in football 44% of ACL injuries were non-contact and 44% indirect contact, with the knee collapsing inwards in 81%, while pressing an opponent, regaining balance after kicking and landing (Della Villa 2020); it is one of the stages of on-field rehabilitation (Buckthorpe 2019)."],
    start: ["على أرضٍ مستوية غير زلقة أو في الملعب، بحذاءٍ رياضيّ، وأقماعٌ لعشرة أمتار، بعد إحماءٍ وجريٍ خفيف.",
      "On a flat, non-slip floor or on the pitch, in sports shoes, with cones over ten metres, after a warm-up and light running."],
    steps: [[
      "التوقّف: اجرِ عشرةَ أمتار بنصف السرعة وتوقّف في ثلاث خطوات، والوركُ إلى الخلف والركبتان مثنيّتان.",
      "القَطعُ ٤٥°: عند القمع ادفع بالقدم الخارجية وانطلق بزاويةٍ مائلة.",
      "القَطعُ ٩٠°: الحركةُ نفسُها بزاويةٍ قائمة.",
      "القَطعُ المتقاطع: غيّر الاتّجاهَ بعبور القدم أمام الأخرى.",
      "زِد السرعةَ ٥٠٪ ⟵ ٧٥٪ ⟵ ١٠٠٪، ثمّ بإشارةٍ مفاجئة من المدرّب إلى اتّجاهٍ لا تعرفه مسبقاً.",
    ], [
      "Stopping: run ten metres at half speed and stop in three steps, with the hips back and the knees bent.",
      "The 45° cut: at the cone, push off the outside foot and set off at an angle.",
      "The 90° cut: the same movement at a right angle.",
      "The crossover cut: change direction by crossing one foot in front of the other.",
      "Raise the speed 50% → 75% → 100%, then on a sudden signal from the coach to a direction not known in advance.",
    ]],
    cues: [[
      "الركبةُ تنهار إلى الداخل ⟵ الركبةُ فوق القدم.",
      "الجذعُ منتصبٌ والقدمُ بعيدةٌ عن الجسم ⟵ الحوضُ منخفض والجذعُ فوق القدم.",
      "التوقّفُ في خطوةٍ واحدة ⟵ ثلاثُ خطواتٍ قصيرة.",
    ], [
      "The knee collapsing inwards → the knee over the foot.",
      "An upright trunk with the foot far from the body → the pelvis low and the trunk over the foot.",
      "Stopping in a single step → three short steps.",
    ]],
    easier: ["سرعةُ المشي، و٤٥° وحدها، ومرّاتٌ أقلّ.", "Walking speed, 45° only, and fewer repetitions."],
    harder: ["٩٠° والقَطعُ المتقاطع بالسرعة الكاملة، ثمّ بإشارةٍ مفاجئة ومع الكرة.", "90° and the crossover cut at full speed, then on a sudden signal and with the ball."],
    stopIf: ["ألمٌ فوق ٣ من ١٠، أو انفلات، أو تورّمٌ زاد درجةً صباحَ اليوم التالي ⟵ يتوقّف ويعود إلى الجري المستقيم.",
      "Pain above 3/10, giving way, or swelling up one grade the next morning → stop and go back to straight-line running."],
    equipment: ["أقماعٌ ٤–٦، وأرضٌ مستوية غير زلقة أو ملعب، وحذاءٌ رياضيّ أو حذاءُ كرة.", "4–6 cones, a flat non-slip floor or a pitch, and sports shoes or football boots."],
    doseNote: ["من المرحلة الثالثة بعد درجة الجري الخامسة: ٣ × ٥ لكلّ نوع يوماً بعد يوم، والمخطَّطُ قبل المفاجئ (Buckthorpe 2019).",
      "From phase 3 after running level 5: 3 × 5 for each kind, every other day, planned before reactive (Buckthorpe 2019)."],
    images: [{ key: "deceleration-cutting-drills-1", ar: "رياضيٌّ يتوقّف ويغيّر اتّجاهَه حول قمعٍ بقطعٍ جانبيّ والركبةُ مثنيّة فوق القدم",
      en: "An athlete stopping and changing direction around a cone with a side-step cut, the knee bent over the foot", search: "side step cutting drill cones" }],
  },
  {
    code: "nordic-hamstring-curl", nameAr: "تمرينُ النورديك لعضلات خلف الفخذ (الإنزال البطيء)", nameEn: "Nordic hamstring curl",
    kind: "strength", region: "knee", homeSuitable: true, sets: 2, reps: 5, rest: 90,
    purpose: ["يقوّي عضلاتِ خلف الفخذ بالإطالة تحت الحِمل — وعند لاعبين محترفين رفع كلُّ نقصٍ ١٠٪ في نسبة خلف الفخذ إلى أمامه خطرَ تمزّق الطُّعم ١٠٫٦ مرّة (Kyritsis 2016)؛ وهو من تمارين إحماء فيفا ١١+ الذي قلّل الإصابات (Thorborg 2017).",
      "Strengthens the hamstrings while they lengthen under load — in professional players each 10% deficit in the hamstring-to-quadriceps ratio raised the risk of graft rupture 10.6-fold (Kyritsis 2016); it is one of the exercises of the FIFA 11+ warm-up, which reduced injuries (Thorborg 2017)."],
    start: ["راكعاً على وسادةٍ سميكة والجذعُ منتصب، والكاحلان مثبَّتان بيدَي زميل أو تحت قضيبٍ ثابت، واليدان أمام الصدر.",
      "Kneeling on a thick cushion with the trunk upright, the ankles held by a partner's hands or under a fixed bar, and the hands in front of the chest."],
    steps: [[
      "اركع منتصباً، واشدد الألويةَ والبطن فيبقى الوركُ مستقيماً.",
      "مِل إلى الأمام ببطء من الركبتين والجسمُ خطٌّ مستقيم من الركبة إلى الرأس.",
      "قاوِم السقوطَ بعضلات خلف الفخذ أطولَ ما تستطيع.",
      "التقِ الأرضَ بيديك حين لا تستطيع المقاومة.",
      "ادفع بيديك لتعود إلى الركوع المنتصب.",
    ], [
      "Kneel upright and tighten the buttocks and abdomen so the hips stay straight.",
      "Lean forwards slowly from the knees, with the body in a straight line from knee to head.",
      "Resist the fall with the hamstrings for as long as you can.",
      "Catch the floor with your hands when you can no longer resist.",
      "Push with your hands to return to upright kneeling.",
    ]],
    cues: [[
      "الانثناءُ من الورك ⟵ الوركُ مستقيمٌ والجسمُ خطٌّ واحد.",
      "السقوطُ سريعاً ⟵ إنزالٌ بطيء ٣–٥ ثوانٍ.",
      "ارتفاعُ الكاحلين ⟵ تثبيتٌ أقوى من الزميل.",
    ], [
      "Bending at the hips → the hips straight and the body one line.",
      "Falling quickly → a slow lowering of 3–5 seconds.",
      "The ankles lifting → a firmer hold from the partner.",
    ]],
    easier: ["مدىً صغير، أو مطّاطٌ حول الصدر مثبَّتٌ خلفك يساعدك، أو اليدان على مقعدٍ أمامك.", "A small range, or a band around the chest anchored behind you to help, or the hands on a bench in front."],
    harder: ["نزولٌ أعمق وأبطأ، و٣ × ٨.", "A deeper and slower descent, and 3 × 8."],
    stopIf: ["ألمٌ خلف الفخذ مكانَ أخذ الوتر، أو تشنّج، أو ألمُ الركوع على الركبة (طُعمُ وتر الرضفة) ⟵ يتوقّف ويخبر الأخصائيّ.",
      "Pain at the back of the thigh where the tendon was taken, a cramp, or pain kneeling on the knee (a patellar-tendon graft) → stop and tell the therapist."],
    equipment: ["وسادةٌ سميكة أو فرشة، وزميلٌ أو قضيبٌ ثابت.", "A thick cushion or mat, and a partner or a fixed bar."],
    doseNote: ["٢ × ٥ ⟵ ٣ × ٨ مرّةً إلى مرّتين في الأسبوع؛ لوتر الرضفة ووتر الفخذ من نحو الأسبوع ١٢، ولوتر خلف الفخذ لا قبل الأسبوع ١٦ وبعد ثني الركبة ضدّ مقاومةٍ بلا ألم (اقتراح).",
      "2 × 5 → 3 × 8, once or twice a week; for patellar- and quadriceps-tendon grafts from about week 12, and for a hamstring graft not before week 16 and after pain-free resisted knee bending (a suggestion)."],
    images: [{ key: "nordic-hamstring-curl-1", ar: "شخصٌ راكعٌ على فرشة وكاحلاه مثبَّتان بيدَي زميل، يميل بجسمه المستقيم إلى الأمام ببطء نحو الأرض",
      en: "A person kneeling on a mat with the ankles held by a partner, leaning the straight body slowly forwards towards the floor", search: "nordic hamstring curl partner" }],
  },
  {
    code: "fifa-11-plus-warm-up", nameAr: "إحماءُ فيفا ١١+ للوقاية من الإصابات (للاعبي كرة القدم)", nameEn: "FIFA 11+ injury-prevention warm-up (for footballers)",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["يقي من إصابةٍ ثانية في الركبة نفسِها وفي الأخرى — والخطرُ في الأخرى يساوي خطرَ الطُّعم أو يزيد (Wiggins 2016): إحماءُ فيفا ١١+ قلّل الإصابات ٣٩٪ في أربع تجارب (Thorborg 2017)، وبرامجُ الوقاية قلّلت إصاباتِ الرباط إلى النصف (Webster & Hewett 2018)، والالتزامُ العالي قلّل الإصابات ٣٥٪ (Soligard 2010).",
      "Protects against a second injury in the same knee and in the other one — the risk to the other knee equals or exceeds the risk to the graft (Wiggins 2016): the FIFA 11+ warm-up reduced injuries by 39% across four trials (Thorborg 2017), prevention programmes halved ACL injuries (Webster & Hewett 2018), and high compliance reduced injuries by 35% (Soligard 2010)."],
    start: ["في الملعب أو ساحةٍ مستوية مع الفريق أو زميل، وأقماعٌ لمسافة نحو عشرين متراً، قبل التدريب.",
      "On the pitch or a flat area with the team or a partner, with cones over about twenty metres, before training."],
    steps: [[
      "الجزءُ الأوّل — تمارينُ الجري ببطء: مستقيماً، وفتحُ الورك وإغلاقُه، والدورانُ حول الزميل، وتلامسُ الكتفين، والجريُ إلى الأمام والخلف.",
      "الجزءُ الثاني — القوّةُ والقفزُ والتوازن بثلاث درجات: اللوحُ الأماميّ، واللوحُ الجانبيّ، وتمرينُ النورديك، والوقوفُ على ساقٍ واحدة، والقرفصاء، والقفز.",
      "الجزءُ الثالث — الجريُ بسرعةٍ أعلى: عبرَ الملعب، والوثبُ الطويل، وتغييرُ الاتّجاه بالقَطع.",
      "الركبةُ فوق القدم في كلّ قرفصاءٍ وهبوطٍ وقَطع.",
    ], [
      "Part 1 — running exercises at a slow pace: straight ahead, hip out and hip in, circling the partner, shoulder contact, and running forwards and backwards.",
      "Part 2 — strength, jumping and balance at three levels: the front plank, the side plank, the Nordic hamstring curl, single-leg stance, squats and jumping.",
      "Part 3 — running at higher speed: across the pitch, bounding, and changing direction with a cut.",
      "The knee over the foot in every squat, landing and cut.",
    ]],
    cues: [[
      "الركبةُ تميل إلى الداخل في القرفصاء والقفز ⟵ الركبةُ فوق الأصابع.",
      "تخطّي الجزء الثاني ⟵ هو قلبُ البرنامج.",
      "مرّةً كلَّ حين ⟵ مرّتين في الأسبوع على الأقلّ.",
    ], [
      "The knee drifting inwards in squats and jumps → the knee over the toes.",
      "Skipping part 2 → it is the heart of the programme.",
      "Once in a while → at least twice a week.",
    ]],
    easier: ["الجزءان الأوّل والثالث ببطء، والدرجةُ الأولى من الجزء الثاني.", "Parts 1 and 3 slowly, and level 1 of part 2."],
    harder: ["الدرجةُ الثانية ثمّ الثالثة من الجزء الثاني.", "Level 2, then level 3 of part 2."],
    stopIf: ["ألمٌ في الركبة أو تورّمٌ صباحَ اليوم التالي ⟵ الدرجةُ السابقة؛ وفي المرحلة الثالثة القفزُ والوثبُ بمعاييرهما وحدهما.",
      "Knee pain or swelling the next morning → the previous level; and in phase 3, jumping and bounding only by their own criteria."],
    equipment: ["أقماع، وزميل، وأرضٌ مستوية أو ملعب.", "Cones, a partner, and a flat area or a pitch."],
    doseNote: ["نحو ٢٠ دقيقة مرّتين في الأسبوع على الأقلّ، ودائماً بعد العودة (Filbay 2019)؛ والجزءان الأوّل والثالث في المرحلة الثالثة، والثاني بدرجته حين تسمح المعايير.",
      "About 20 minutes at least twice a week, and permanently after the return (Filbay 2019); parts 1 and 3 in phase 3, and part 2 at its level when the criteria allow."],
    images: [{ key: "fifa-11-plus-warm-up-1", ar: "لاعبو كرة قدم يؤدّون تمارينَ إحماء فيفا ١١+ (الجري واللوح والتوازن على ساقٍ والقرفصاء)",
      en: "Football players performing FIFA 11+ warm-up exercises (running, plank, single-leg balance and squats)", search: "FIFA 11+ warm-up exercises" }],
  },
  {
    code: "prayer-kneeling-after-acl", nameAr: "الصلاة والركوع على الركبتين بعد الرباط الصليبيّ", nameEn: "Prayer and kneeling after ACL reconstruction",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["يعيد أوضاعَ الصلاة خطوةً خطوة: الجلوسُ على العقبين (الجلوسُ بين السجدتين والتشهّد) أعمقُها — ١٥٠–١٦٠° — والسجودُ على الركبتين نحو ٩٠–١٢٠° (Hefzy 1997)، وبلغ الثنيُ ١٤١٫٦° عند رجالٍ من الشرق الأوسط (Acker 2011)؛ وطُعمُ وتر الرضفة أقوى منبئٍ بصعوبة الركوع الشديدة — ٢١٫٣٪ مقابل ٩٫٤٪ لوتر خلف الفخذ (Rahardja 2023)؛ ولا دراسةَ للصلاة بعد الرباط (بحثٌ صفريّ) فالخطواتُ اقتراح.",
      "Brings back the prayer positions step by step: sitting back on the heels (between the prostrations and for tashahhud) is the deepest — 150–160° — and kneeling prostration about 90–120° (Hefzy 1997), with flexion reaching 141.6° in Middle-Eastern men (Acker 2011); a patellar-tendon graft is the strongest predictor of severe kneeling difficulty — 21.3% versus 9.4% with a hamstring graft (Rahardja 2023); there is no study of prayer after ACL reconstruction (a documented zero result), so the steps are a suggestion."],
    start: ["على سجّادة الصلاة بجانب كرسيٍّ ثابت، ووسادةٌ سميكة (أو من الجل) للركبتين، ووسادةٌ صلبة للجلوس.",
      "On the prayer mat beside a stable chair, with a thick (or gel) cushion for the knees and a firm cushion to sit on."],
    steps: [[
      "الخطوة ١ (الأسابيع الستّة الأولى للجميع): القيامُ واقفاً والركوعُ واقفاً بثني الركبتين قليلاً، والسجودُ والتشهّدُ جلوساً على الكرسيّ.",
      "الخطوة ٢: السجودُ راكعاً على وسادةٍ سميكة حين يبلغ الثنيُ ١٢٠°، والتورّمُ أثرٌ أو أقلّ، وألمُ الركوع ٣ من ١٠ أو أقلّ (ولطُعم وتر الرضفة ألمُ الوتر كذلك).",
      "الخطوة ٣: الجلوسُ على العقبين للجلوس بين السجدتين والتشهّد بوسادةٍ بين الأليتين والعقبين حين يبلغ الثنيُ ١٤٠°، ثمّ بلا وسادةٍ حين يصير بلا ألم.",
      "النزولُ والقيام: بالساق السليمة أوّلاً ونصفِ ركوعٍ على الركبة السليمة ويدٌ على الكرسيّ.",
      "لا استدارةَ على الركبتين آخرَ الصلاة في الأشهر الثلاثة أو الأربعة الأولى — الاستدارةُ بعد القيام.",
    ], [
      "Step 1 (the first six weeks, for everyone): standing for qiyam and bowing standing with the knees slightly bent, and prostration and tashahhud seated on the chair.",
      "Step 2: kneeling prostration on a thick cushion once flexion reaches 120°, swelling is trace or less and kneeling pain is 3/10 or less (and for a patellar-tendon graft, tendon pain too).",
      "Step 3: sitting back on the heels between the prostrations and for tashahhud, with a cushion between the buttocks and the heels, once flexion reaches 140°, then without the cushion when it is pain-free.",
      "Getting down and up: with the good leg first, through half-kneeling on the good knee, with a hand on the chair.",
      "No turning on the knees at the end of prayer in the first three or four months — turn after standing up.",
    ]],
    cues: [[
      "الاستدارةُ على الركبتين ⟵ يُدار الرأسُ وحده، والجسمُ بعد القيام.",
      "السقوطُ إلى الركوع بلا سند ⟵ نزولٌ بطيء ويدٌ على الكرسيّ.",
      "القيامُ على الساق المُعالَجة ⟵ السليمةُ أوّلاً.",
      "البقاءُ على الكرسيّ دائماً ⟵ الكرسيُّ خطوةٌ مؤقّتة والأرضُ هدف.",
    ], [
      "Turning on the knees → turn the head only, and the body after standing.",
      "Dropping into kneeling without support → a slow descent with a hand on the chair.",
      "Rising on the treated leg → the good leg first.",
      "Staying on the chair for good → the chair is a temporary step and the floor is the goal.",
    ]],
    easier: ["الخطوةُ السابقة، ووسادةٌ أعلى، والسجودُ على الكرسيّ.", "The previous step, a higher cushion, and prostration on the chair."],
    harder: ["وسادةٌ أخفض ثمّ الأرضُ كاملةً، والقيامُ بلا سند.", "A lower cushion, then the floor fully, and rising without support."],
    stopIf: ["ألمٌ في مقدّم الركبة أو الوتر فوق ٣ من ١٠، أو تورّمٌ صباحَ اليوم التالي، أو انحباسٌ أو «طقّة» (بعد خياطة الغضروف) ⟵ الخطوةُ السابقة ويخبر الأخصائيّ؛ وبعد خياطة الغضروف لا خطوةَ على الأرض قبل إذن الجرّاح.",
      "Pain at the front of the knee or in the tendon above 3/10, swelling the next morning, or catching or a 'pop' (after a meniscal repair) → back to the previous step and tell the therapist; and after a meniscal repair no floor step before the surgeon allows it."],
    equipment: ["سجّادة، ووسادةٌ سميكة أو من الجل للركبتين، ووسادةٌ صلبة، وكرسيٌّ ثابت.", "A prayer mat, a thick or gel cushion for the knees, a firm cushion, and a stable chair."],
    doseNote: ["كلُّ خطوةٍ في الصلوات اليومية بقدر ما يتحمّل (اقتراح)؛ وبعد خياطة الغضروف الكرسيُّ أربعةَ أشهرٍ على الأقلّ أو كما يقول الجرّاح (Pujol 2025)، والمرحاضُ العربيّ بعد ثنيٍ ١٣٠° وقرفصاءٍ على ساقٍ بتحكّم.",
      "Each step in the daily prayers as tolerated (a suggestion); after a meniscal repair, the chair for at least four months or as the surgeon says (Pujol 2025), and the squat toilet after 130° of flexion and a controlled single-leg squat."],
    images: [{ key: "prayer-kneeling-after-acl-1", ar: "وضعٌ معدَّل للصلاة: السجودُ راكعاً على وسادةٍ سميكة، أو الصلاةُ جلوساً على كرسيّ",
      en: "A modified prayer position: kneeling prostration on a thick cushion, or praying seated on a chair", search: "prayer kneeling cushion chair" }],
  },
];

const PAIN_RULE_AR = "قاعدةُ التورّم والوجع (في كلّ المراحل) — التورّمُ أوّلاً: يُقاس باختبار المسح قبل كلّ جلسة (لا شيء · أثر · ١+ · ٢+ · ٣+؛ اتّفاقُ فاحصَين كابا ٠٫٧٥ — Sturgill 2009): زاد درجةً منذ الجلسة السابقة أو بلغ ٢+ ⟵ لا تقدّمَ اليوم (حِملٌ ومدىً أقلّ، والدراجة، والتبريدُ مع الضغط)؛ والجريُ والقفزُ لا يكونان إلّا والتورّمُ أثرٌ أو أقلّ (Adams 2012). والألمُ أثناء التمرين: ٠–٢ من ١٠ يتقدّم، و٣–٥ ويهدأ صباحَ اليوم التالي يبقى في درجته، وفوق ٥ أو أسوأ صباحاً ينزل درجة.\n" +
  "وقواعدُ الوجع (Adams 2012): وجعُ الإحماء الذي يستمرّ أو يعود في الجلسة ⟵ يومان راحةٌ من ذلك التمرين ودرجةٌ أدنى؛ والذي يزول ⟵ يبقى في درجته؛ ووجعُ المفصل في اليوم التالي للحِمل ⟵ يومُ راحةٍ ولا تقدّم؛ ولا وجعَ ⟵ يتقدّم درجةً في الأسبوع. وألمُ مقدّم الركبة في مدّ الركبة جالساً وضغط الساقين والركوع (وطُعمُ وتر الرضفة خاصّةً): حتى ٣ من ١٠ ويهدأ صباحاً ⟵ يتقدّم، و٤–٥ ⟵ مدىً أو حِملٌ أقلّ، وفوق ٥ أو يزيد أسبوعاً بعد أسبوع ⟵ يُغيَّر التمرينُ ويُراجَع (van Melick 2016 · Kotsifaki 2023). والمدُّ يُقاس كلَّ جلسة: مساوٍ للركبة الأخرى ⟵ أخضر، ونقصٌ ٣–٤° ⟵ برنامجُ المدّ يومياً، و٥° في الأسبوع السادس أو حاجزٌ نابض ⟵ الجرّاح. (اقتراحٌ يجمع قواعدَ ديلاوير والدليلين الهولنديّ والقطريّ؛ ولا قاعدةَ ألمٍ مجرَّبة بعد الرباط — بحثٌ صفريّ.)";
const PAIN_RULE_EN = "The swelling-and-soreness rule (all phases) — swelling first: graded with the stroke test before every session (zero · trace · 1+ · 2+ · 3+; agreement between two examiners kappa 0.75 — Sturgill 2009): up one grade since the last session or reaching 2+ → no progression today (less load and range, cycling, and cold with compression); running and hopping only with swelling of trace or less (Adams 2012). Pain during exercise: 0–2/10 progresses, 3–5 that settles by the next morning stays at its level, and above 5 or worse in the morning drops one level.\n" +
  "The soreness rules (Adams 2012): warm-up soreness that continues or returns during the session → two days off that exercise and one level down; soreness that goes away → stay at that level; joint soreness the day after loading → one day off and no progression; no soreness → advance one level a week. Anterior knee pain during seated knee extension, the leg press and kneeling (patellar-tendon grafts especially): up to 3/10 and settled by the morning → progress, 4–5 → less range or load, above 5 or rising week on week → change the exercise and review (van Melick 2016 · Kotsifaki 2023). Extension is measured every session: equal to the other knee → green, a 3–4° deficit → the daily extension programme, and 5° at week 6 or a springy block → the surgeon. (A proposal combining the Delaware rules and the Dutch and Qatari guidelines; no pain rule has been tested after ACL reconstruction — a documented zero result.)";

const EXTEND_AR = "التمديدُ والكتلُ والمراجعات: تمديدٌ واحد بستّ جلساتٍ لكلّ كتلة حين لا يتحقّق معيارُ الانتقال رغم الالتزام ولا علامةَ إحالة، والتخلّفُ الثاني ⟵ الجرّاح (عقدةُ «السايكلوبس» أو تثبيطُ العضلة أو التورّم). ومَن لا يمارس رياضةً فيها التفافٌ وقَطع يكتفي بالكتلتين الأوليين (٤٨ جلسة) وبرنامجٍ منزليّ ومراجعتين في الشهرين السادس والثاني عشر، أو بالثالثة إن أراد الجري (يعدّل الأخصائيُّ العددَ في خطّة المريض). وبين الكتل برنامجٌ منزليّ أو في نادٍ بمراجعةٍ كلَّ أربعة أسابيع — فالبيتُ لم يقلّ عن الإشراف الكثير: ٤ زيارات مقابل ١٧ في الأسابيع الاثني عشر الأولى (Grant 2005)، ولم تَرَ المراجعاتُ تفوّقاً للإشراف الأكثر بيقينٍ منخفضٍ جداً (Uchino 2022 · Gamble 2021) — لكنّ الأسابيعَ الستّة الأولى تُحسم فيها عقدةُ المدّ وتثبيطُ الفخذ (عند ٤٨٫٦٪ في الأسبوع الثالث — Sonnery-Cottet 2026)، فهي يومية. واختبارُ العودة إلى الرياضة في الشهر التاسع أو بعده، ومراجعةٌ في الثاني عشر؛ والوقايةُ مرّتين في الأسبوع على الأقلّ بعد العودة دائماً (Filbay 2019).";
const EXTEND_EN = "Extension, blocks and reviews: one extension of six sessions per block when a progression criterion is not met despite adherence and with no referral trigger, and a second miss → the surgeon (a cyclops lesion, muscle inhibition or swelling). Patients who do not play pivoting and cutting sport stop after the first two blocks (48 sessions) with a home programme and reviews at months 6 and 12, or after the third if they want to run (set by the specialist in the patient's plan). Between blocks: a home or gym programme with a review every four weeks — home care was not worse than much supervision: 4 visits versus 17 in the first twelve weeks (Grant 2005), and reviews found no advantage for more supervision, with very low certainty (Uchino 2022 · Gamble 2021) — but the first six weeks decide extension and quadriceps inhibition (present in 48.6% at week 3 — Sonnery-Cottet 2026), so they are daily. Return-to-sport testing at month 9 or later, and a review at month 12; prevention at least twice a week, permanently after the return (Filbay 2019).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "acl-reconstruction-adult",
  summary: [
    "التأهيلُ بعد إعادة بناء الرباط الصليبيّ الأماميّ (ACL reconstruction) للبالغين: بطُعم وتر الرضفة أو وتر خلف الفخذ أو وتر الفخذ أو طُعمٍ من متبرّع، مع استئصالٍ جزئيّ للغضروف أو بلا — وبعد خياطة الغضروف أو إصلاح الغضروف المفصليّ تحكم تعليماتُ الجرّاح وتُعمل البطاقاتُ داخلها (Adams 2012 · Pujol 2025)؛ وإعادةُ العملية والأربطةُ المتعدّدة والأطفالُ وقطعُ العظم خارجَه. ويشمل التأهيلَ قبل العملية، ويُخبر عن العلاج بالتأهيل أوّلاً مع عمليةٍ مؤجّلة عند الحاجة (Frobell 2013 · Reijman 2021) ولا يقرّره. " +
    "ماذا يتوقّع المريض: ٨١٪ يعودون إلى رياضةٍ ما، و٦٥٪ إلى مستواهم قبل الإصابة، و٥٥٪ إلى المنافسة (Ardern 2014)؛ وواحدٌ من كلّ سبعة يصاب ثانيةً (١٥٪: الطُّعمُ ٧٪ والركبةُ الأخرى ٨٪)، و٢٣٪ تحت الخامسة والعشرين ممّن عادوا إلى الرياضة (Wiggins 2016)؛ والخشونةُ اللاحقة شائعة: ١١٫٣٪ بعد خمس سنوات و٥١٫٦٪ بعد عشرين (Cinque 2018). وفي العراق يصل المريضُ متأخّراً: ٤٠٫٦ شهراً من التشخيص إلى العملية وتأهيلٌ منزليّ وحده في كردستان (Kader 2023)، وتمزّقُ الغضروف الإنسيّ عند ٨٠٪ والغضروفُ المفصليّ متضرّرٌ عند ٤٠٪ في الديوانية (Alardi 2023) — فركبةٌ متأخّرة متضرّرة لا ركبةُ التجارب الحادّة المعزولة. " +
    "الإرشادات: JOSPT — الحركةُ خلال الأسبوع الأوّل B، والتبريدُ بعد العملية مباشرةً B، والتمرينُ المشرَف عليه مع برنامجٍ منزليّ متدرّج B، والتمرينُ حاملاً للوزن وغيرَ حامل «من الأسبوع الرابع إلى السادس، مرّتين إلى ثلاثٍ في الأسبوع ستّةَ أشهرٍ إلى عشرة» A، والتحفيزُ العضليّ ستّةَ أسابيع إلى ثمانية A، والتمرينُ العصبيّ العضليّ مع التقوية A (Logerstedt 2017)؛ والهولنديّ: تأهيلٌ قبل العملية وثلاثُ مراحل بالمعايير تسعةَ أشهرٍ إلى اثني عشر، ومدُّ الركبة جالساً من الأسبوع الرابع في ٩٠–٤٥° (van Melick 2016)؛ والقطريّ (أسبيتار): زيارةٌ قبل العملية على الأقلّ، وضدّ الحركة السلبية المستمرّة، والتحفيزُ مبكّراً، ولا وخزَ بالإبر الجافّة مبكّراً، ومعاييرُ الجري والعودة (Kotsifaki 2023)؛ وإجماعُ بانثر: القرارُ بالزمن وحده «يجب أن يُترك» (Meredith 2020)؛ والأكاديميةُ الأمريكية لجرّاحي العظام لا تتناول التأهيلَ ولا توصي بالدعّامة (Brophy 2023)؛ ولا دليلَ للمعهد البريطانيّ في الرباط (بحثٌ صفريّ). " +
    "وفي التجارب: التسريعُ (١٩ أسبوعاً) ساوى غيرَه (٣٢) بعد سنتين (Beynnon 2011)؛ و٤ زياراتٍ مع برنامجٍ منزليّ لم تقلّ عن ١٧ (Grant 2005)؛ والتحفيزُ زاد قوّةَ الفخذ في الأسابيع ٤–١٢ (Hauger 2018)؛ وفي متابعة ديلاوير وأوسلو قلّ خطرُ الإصابة الثانية ٥١٪ عن كلّ شهرٍ تأخّرت فيه العودةُ حتى الشهر التاسع، وكانت ٣٨٫٢٪ عند مَن لم يجتز المعاييرَ مقابل ٥٫٦٪ (Grindem 2016)؛ والعودةُ قبل الشهر التاسع رفعت الخطرَ ٦٫٧ مرّة عند الشباب (Beischer 2020). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ وقاعدةُ التورّم والوجع، والمدُّ الكامل وتنشيطُ الفخذ مع التحفيز، والتقويةُ المتدرّجة بقواعد الطُّعم، والتمرينُ العصبيّ العضليّ، ثمّ الجريُ والقفزُ وتغييرُ الاتّجاه والعودةُ بالمعايير لا بالزمن وحده. " +
    "والعددُ ٨٤ جلسة بستٍّ في الأسبوع في أربع كتل تفصلها فتراتٌ منزلية — ٢٤ في الأسابيع ١–٤، و٢٤ في الأسابيع ٥–١٢، و٢٤ من الأسبوع ١٢ بمعايير الجري، و١٢ في الأشهر ٦–٩ — نحو ٢٫٢ جلسة في الأسبوع على تسعة أشهر، داخلَ درجة A؛ والتجاربُ والممارسةُ ١٦–٣٨ زيارة في الأسابيع الاثني عشر الأولى (Adams 2012 · Wright 2015)، ولا تجربةَ للحضور اليوميّ (بحثٌ صفريّ) — فهو اختيارُ خدمةٍ مكتوبٌ صريحاً.",
    "Rehabilitation after anterior cruciate ligament (ACL) reconstruction in adults: with a patellar-tendon, hamstring, quadriceps-tendon or donor graft, with or without a partial meniscectomy — after a meniscal repair or a cartilage procedure the surgeon's instructions govern and the cards are used within them (Adams 2012 · Pujol 2025); revision surgery, multi-ligament reconstruction, children and osteotomy are outside it. It covers rehabilitation before surgery, and informs about rehabilitation first with optional delayed surgery (Frobell 2013 · Reijman 2021) without deciding it. " +
    "What the patient can expect: 81% return to some sport, 65% to their pre-injury level and 55% to competition (Ardern 2014); one in seven has a second injury (15%: the graft 7% and the other knee 8%), and 23% of those under twenty-five who return to sport (Wiggins 2016); later osteoarthritis is common: 11.3% at five years and 51.6% at twenty (Cinque 2018). In Iraq patients arrive late: 40.6 months from diagnosis to surgery and home rehabilitation only in Kurdistan (Kader 2023), and a medial meniscal tear in 80% with damaged joint cartilage in 40% in Diwaniyah (Alardi 2023) — a late, damaged knee, not the acute isolated knee of the trials. " +
    "Guidelines: JOSPT — mobilisation within the first week B, cryotherapy immediately after surgery B, supervised exercise with a progressed home programme B, weight-bearing and non-weight-bearing exercise 'within 4 to 6 weeks, 2 to 3 times per week for 6 to 10 months' A, neuromuscular stimulation for 6 to 8 weeks A, and neuromuscular training with strengthening A (Logerstedt 2017); the Dutch guideline: rehabilitation before surgery and three criterion-based phases over nine to twelve months, with seated knee extension from week 4 in 90–45° (van Melick 2016); the Qatari (Aspetar) guideline: at least one visit before surgery, against continuous passive motion, early stimulation, no early dry needling, and criteria for running and return (Kotsifaki 2023); the Panther consensus: purely time-based decisions 'should be abandoned' (Meredith 2020); the American Academy of Orthopaedic Surgeons does not address rehabilitation and does not recommend a brace (Brophy 2023); and NICE has no ACL guideline (a documented zero result). " +
    "In trials: an accelerated programme (19 weeks) equalled a slower one (32) at two years (Beynnon 2011); 4 visits with a home programme were not worse than 17 (Grant 2005); stimulation added quadriceps strength at weeks 4–12 (Hauger 2018); in the Delaware-Oslo cohort the re-injury risk fell by 51% for each month the return was delayed up to month 9, and it was 38.2% in those who failed the criteria versus 5.6% (Grindem 2016); and returning before month 9 raised the risk 6.7-fold in young patients (Beischer 2020). " +
    "So the protocol: a core in every session — education and the swelling-and-soreness rule, full extension and quadriceps activation with stimulation, progressive strengthening by the graft rules, neuromuscular training, then running, hopping, changing direction and a return by criteria rather than time alone. " +
    "The dose is 84 sessions at six a week in four blocks separated by home periods — 24 in weeks 1–4, 24 in weeks 5–12, 24 from week 12 with the running criteria, and 12 in months 6–9 — about 2.2 sessions a week over nine months, within the grade-A range; trials and practice used 16–38 visits in the first twelve weeks (Adams 2012 · Wright 2015), and no trial tested daily attendance (a documented zero result) — so it is a service choice stated openly.",
  ],
  goals: [
    "• المدُّ الكامل مساوياً للركبة الأخرى بما فيه فرطُ المدّ (نقصٌ ٢° أو أقلّ في الأسابيع الأولى) — فنقصُ ٣–٥° يضرّ بعد سنوات (Shelbourne & Gray 2009) — والثنيُ ١١٠° في الأسبوع الثاني إلى الرابع ثمّ كاملاً (Adams 2012 · Wright 2015).\n" +
    "• التورّمُ «أثرٌ» أو لا شيء في اختبار المسح (Sturgill 2009)، ورفعُ الساق عشرين مرّة بلا تأخّرٍ في المدّ، ومشيةٌ طبيعية بلا عكّاز ودرجٌ بالتناوب.\n" +
    "• قوّةُ عضلة الفخذ الأمامية ٨٠٪ من الجهة الأخرى قبل الجري، و٩٠٪ فأكثر قبل الرياضة (و١٠٠٪ لرياضات الالتفاف والتماسّ) — وكلُّ نقطةٍ أعلى خفّضت الإصابةَ الثانية ٣٪ (Grindem 2016 · van Melick 2016)؛ ومقارنةً بقيمة الساق السليمة قبل العملية (Wellsandt 2017).\n" +
    "• اختباراتُ القفز الأربعة على ساقٍ واحدة ٩٠٪ فأكثر من الجهة الأخرى (Reid 2007 · Grindem 2016).\n" +
    "• مقياسُ الركبة الذاتيّ (IKDC) بالعربية: تحسّنٌ ١١٫٥ نقطة فأكثر (Irrgang 2006) وعند الخروج ٧٥٫٩ فأكثر — الحالةُ التي يقبلها المريض (Muller 2016)؛ والجاهزيةُ النفسية للعودة (ACL-RSI) ٦٥ فأكثر و٧٦٫٧ لمن عمرُه عشرون فأقلّ (Sadeqi 2018 · McPherson 2019).\n" +
    "• العودةُ إلى رياضة الالتفاف لا قبل الشهر التاسع وبعد اجتياز المعايير كلّها (Grindem 2016 · Beischer 2020)، والصلاةُ على الأرض بخطواتها، والوقايةُ مرّتين في الأسبوع دائماً.\n" +
    "• فهمُ الحالة: نضجُ الطُّعم يستمرّ بعد السنة الأولى (Claes 2011)، والعودةُ مسارٌ بالمعايير لا موعد، والركبةُ الأخرى في خطرٍ كالطُّعم، ومتى يعود فوراً.",
    "• Full extension equal to the other knee, including hyperextension (a deficit of 2° or less in the early weeks) — a 3–5° loss harms the result years later (Shelbourne & Gray 2009) — and flexion of 110° at weeks 2 to 4, then full (Adams 2012 · Wright 2015).\n" +
    "• Swelling 'trace' or none on the stroke test (Sturgill 2009), twenty straight-leg raises without an extensor lag, and normal gait without a crutch with reciprocal stairs.\n" +
    "• Quadriceps strength 80% of the other side before running and 90% or more before sport (and 100% for pivoting and contact sports) — each point higher lowered the second-injury rate by 3% (Grindem 2016 · van Melick 2016); and compared with the uninjured leg's value before surgery (Wellsandt 2017).\n" +
    "• The four single-leg hop tests at 90% or more of the other side (Reid 2007 · Grindem 2016).\n" +
    "• The subjective knee score (IKDC) in Arabic: an improvement of 11.5 points or more (Irrgang 2006) and 75.9 or more at discharge — the state the patient finds acceptable (Muller 2016); and psychological readiness to return (ACL-RSI) of 65 or more, and 76.7 for those aged twenty or younger (Sadeqi 2018 · McPherson 2019).\n" +
    "• A return to pivoting sport not before month 9 and after passing all the criteria (Grindem 2016 · Beischer 2020), prayer on the floor by its steps, and prevention twice a week for good.\n" +
    "• Understanding of the condition: graft maturation continues beyond the first year (Claes 2011), the return is a criterion-based path, not a date, the other knee is at as much risk as the graft, and when to come back at once.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج (نحو ٦٠ دقيقة):\n" +
    "• تقريرُ العملية: نوعُ الطُّعم (وترُ الرضفة · وترُ خلف الفخذ — واحدٌ أو اثنان · وترُ الفخذ · متبرّع)، والجهةُ والساقُ المسيطرة، والتثبيتُ (مساميرُ معدنية أو أزرار — يهمّ التيكارَ والحرارة)، والتثبيتُ الوحشيّ الإضافيّ، وما عُمل للغضروف (استئصالٌ أم خياطة، ومكانُها ونوعُها، وحدودُ الحِمل والمدى ومدّتُها مكتوبةً)، والغضروفُ المفصليّ، وتاريخُ العملية، ومميّعُ الدم الموصوف، وأيُّ تعليمٍ للدعّامة (Adams 2012).\n" +
    "• التاريخ: الرياضةُ ومستواها (كرةُ القدم غالباً)، والمدّةُ من الإصابة إلى العملية، والانفلاتُ قبلها، والحمّى وإفرازُ الجرح، وألمُ الساق وتورّمُها وضيقُ النفَس، والخدرُ تحت الركبة، والسكّريّ، وحقنُ الكورتيزون قبل العملية، والعملُ وعاداتُ الصلاة والمرحاض، والأهداف.\n" +
    "• الفحص (JOSPT B): التورّمُ باختبار المسح المعدَّل (اتّفاقُ فاحصَين كابا ٠٫٧٥ — Sturgill 2009)، والمدّ والثنيُ بالمنقلة بالفاحص نفسِه ومنه فرطُ المدّ مقارنةً بالركبة الأخرى (Watkins 1991 · Brosseau 2001)، وحركةُ الرضفة، والجرحُ وفتحاتُ المنظار، وتأخّرُ المدّ في رفع الساق وانقباضُ العضلة الإنسية المائلة (تثبيطُ العضلة: ٤٨٫٦٪ في الأسبوع الثالث — Sonnery-Cottet 2026)، وقوّةُ عضلة الفخذ بمقياس اليد مثبَّتاً بحزامٍ في ٦٠–٩٠° (Almeida 2019)، والمشية، والإحساسُ فوق مقدّم الساق الإنسيّ قبل الحرارة والتحفيز (Egerci 2024).\n" +
    "• المقاييس: المزروعةُ — مقياسُ الركبة الذاتيّ (IKDC) بالعربية المُتحقَّق منه بعد إعادة بناء الرباط (معاملُ الثبات ٠٫٩٥ — Almalki 2022 · Ahmed 2019)، ونتائجُ الركبة (KOOS) بالعربية المصرية في إصابات الرباط والغضروف (Almangoush 2013)، وثنيُ الركبة — ويُضاف: الألمُ بالعربية (Alghadir 2016)، ودرجةُ التورّم، ونقصُ المدّ، ونسبةُ قوّة الفخذ إلى الجهة الأخرى، واختباراتُ القفز الأربعة من الأسبوع الثاني عشر (Reid 2007)، والجاهزيةُ النفسية بالنسخة العربية القصيرة من الشهر الرابع (Alzhrani 2022)، ومقياسُ النشاط تيغنر بالعربية عند البداية والعودة (Alzhrani 2022b)، والوصولُ الأماميّ بميزان Y في الأسبوع الثاني عشر (Garrison 2015).\n" +
    "• قبل العملية: تُقاس قوّةُ الساق السليمة وقفزُها مرجعاً للعودة — فنسبةُ الجهتين وحدها تبالغ: اجتاز ٥٧٫١٪ معيارَ ٩٠٪ بالنسبة و٢٨٫٦٪ فقط بقيمة ما قبل العملية (Wellsandt 2017).\n" +
    "• يُعاد التقييمُ في نهاية كلّ كتلة (الجلسات ٢٤ و٤٨ و٧٢ و٨٤) وكلَّ أربعة أسابيع بينها، وفي الأشهر ٣ و٦ و٩ و١٢؛ وقاعدةُ التورّم والوجع وأسئلةُ الإحالة في كلّ جلسة.",
    "At the first session, before any treatment (about 60 minutes):\n" +
    "• The operation note: the graft (patellar tendon · hamstring — one or two tendons · quadriceps tendon · donor), the side and the dominant leg, the fixation (metal screws or buttons — relevant to Tecar and heat), any additional lateral tenodesis, what was done to the meniscus (meniscectomy or repair, its site and type, and the written weight-bearing and range limits and their duration), the joint cartilage, the date of surgery, the prescribed anticoagulant, and any brace instruction (Adams 2012).\n" +
    "• History: the sport and its level (usually football), the time from injury to surgery, giving way before it, fever and wound discharge, calf pain and swelling and breathlessness, numbness below the knee, diabetes, steroid injections before surgery, work, prayer and toilet habits, and goals.\n" +
    "• Examination (JOSPT B): swelling with the modified stroke test (agreement between two examiners kappa 0.75 — Sturgill 2009), extension and flexion with a goniometer by the same examiner, including hyperextension compared with the other knee (Watkins 1991 · Brosseau 2001), patellar mobility, the wound and portals, an extensor lag on the straight-leg raise and contraction of the vastus medialis (muscle inhibition: 48.6% at week 3 — Sonnery-Cottet 2026), quadriceps strength with a belt-fixed handheld dynamometer at 60–90° (Almeida 2019), gait, and sensation over the front-inner leg before heat and stimulation (Egerci 2024).\n" +
    "• Measures: the seeded ones — the subjective knee score (IKDC) in Arabic, validated after ACL reconstruction (reliability 0.95 — Almalki 2022 · Ahmed 2019), the KOOS in Egyptian Arabic validated in ligament and meniscal injuries (Almangoush 2013), and knee flexion — and add: pain in Arabic (Alghadir 2016), the swelling grade, the extension deficit, quadriceps strength as a percentage of the other side, the four hop tests from week 12 (Reid 2007), psychological readiness with the short Arabic version from month 4 (Alzhrani 2022), the Tegner activity scale in Arabic at baseline and at the return (Alzhrani 2022b), and the Y-balance anterior reach at week 12 (Garrison 2015).\n" +
    "• Before surgery: the uninjured leg's strength and hops are measured as the reference for the return — the side-to-side ratio alone overestimates: 57.1% passed the 90% criterion by ratio and only 28.6% by the pre-operative value (Wellsandt 2017).\n" +
    "• The assessment is repeated at the end of each block (sessions 24, 48, 72 and 84) and every four weeks between them, and at months 3, 6, 9 and 12; the swelling-and-soreness rule and the referral questions at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• التثقيفُ أوّلاً وفي كلّ جلسة: المدُّ الكامل قبل كلّ شيء، والتورّمُ يقرّر سرعةَ التقدّم، والعودةُ بالمعايير لا بالزمن، والإصابةُ الثانية أكثرُ في السنتين الأوليين وعند الشباب، والوقايةُ للساقين معاً (Filbay 2019 · Wiggins 2016)، ومتى يعود فوراً.\n" +
    "• الكتلةُ الأولى (الأسابيع ١–٤، يومياً): الانبطاحُ وتدلّي الساق وإسنادُ الكعب للمدّ، وتحريكُ الرضفة ٣٠–٥٠ مرّة في اليوم، وشدُّ الفخذ ورفعُ الساق ٣ × ١٠ ثلاثَ مرّاتٍ يومياً مع التحفيز العضليّ، وسحبُ الكعب والدراجةُ للثني، والحِملُ بقدر ما يتحمّل بالعكّازين حتى المشية الطبيعية، والسلسلةُ المغلقة من الأسبوع الثاني (القرفصاءُ ٠–٤٥° وصعودُ الدرجة بلا ألم)، والتبريدُ مع الضغط (Adams 2012 · van Melick 2016 · Wright 2015).\n" +
    "• الكتلةُ الثانية (الأسابيع ٥–١٢): القوّةُ الثقيلة يوماً بعد يوم وبينها ٤٨ ساعة — ضغطُ الساقين والقرفصاءُ والطعنةُ والنزولُ عن الدرجة — بمجموعاتٍ ٣–٤ × ٦–٨ بأقصى جهد وقاعدة «زائد اثنين» (Eitzen 2010)، ومدُّ الركبة جالساً بقواعد الطُّعم، والتوازنُ والاضطرابُ والورك والجذع والدراجة في الأيّام بينها (Kotsifaki 2023 · Risberg 2007).\n" +
    "• الكتلةُ الثالثة (من الأسبوع ١٢ بمعايير الجري): المشيُ والهرولةُ بثماني درجات، وقفزاتُ النابض ثمّ القفزُ على ساقٍ واحدة، والتوقّفُ وتغييرُ الاتّجاه المخطَّط، وتمرينُ النورديك، وإحماءُ فيفا ١١+، واختباراتُ القفز (Adams 2012 · Buckthorpe 2019).\n" +
    "• الكتلةُ الرابعة (الأشهر ٦–٩): تغييرُ الاتّجاه بإشارةٍ مفاجئة، ومراحلُ التأهيل في الملعب الخمس (الجريُ المستقيم ثمّ المتعدّدُ الاتّجاهات ثمّ مهاراتُ الكرة ثمّ حركاتُها ثمّ محاكاةُ التدريب)، ثمّ التدريبُ مع الفريق بلا تماسّ فكاملاً فالمباراةُ بدقائق (Buckthorpe 2019 · Filbay 2019).\n" +
    "• البرنامجُ المنزليّ من الجلسة الأولى، وبين الكتل في البيت أو النادي بمراجعةٍ كلَّ أربعة أسابيع، وبعد العودة الوقايةُ مرّتين في الأسبوع دائماً.\n" +
    PAIN_RULE_AR + "\n" + EXTEND_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Education first and at every session: full extension before anything else, swelling decides the pace, the return is by criteria and not by time, a second injury is commoner in the first two years and in the young, and prevention covers both legs (Filbay 2019 · Wiggins 2016), and when to come back at once.\n" +
    "• Block 1 (weeks 1–4, daily): the prone hang and heel prop for extension, patellar mobilisation 30–50 times a day, quadriceps setting and straight-leg raises at 3 × 10 three times a day with neuromuscular stimulation, heel slides and the bike for flexion, weight bearing as tolerated with two crutches until gait is normal, closed-chain work from week 2 (squats at 0–45° and pain-free step-ups), and cold with compression (Adams 2012 · van Melick 2016 · Wright 2015).\n" +
    "• Block 2 (weeks 5–12): heavy strength every other day with 48 hours between — the leg press, squats, split squats and step-downs — at 3–4 × 6–8 at maximal effort with the 'plus-two' rule (Eitzen 2010), seated knee extension by the graft rules, and balance, perturbation, hip, trunk and cycling on the days between (Kotsifaki 2023 · Risberg 2007).\n" +
    "• Block 3 (from week 12 with the running criteria): the eight-level walk–jog progression, pogo hops and then single-leg hopping, deceleration and planned changes of direction, the Nordic hamstring curl, the FIFA 11+ warm-up, and the hop tests (Adams 2012 · Buckthorpe 2019).\n" +
    "• Block 4 (months 6–9): changes of direction on a sudden signal, the five stages of on-field rehabilitation (straight-line running, then multidirectional, then football skills, then football movements, then training simulation), then team training without contact, then full, then match play by minutes (Buckthorpe 2019 · Filbay 2019).\n" +
    "• The home programme from session 1, between blocks at home or in a gym with a review every four weeks, and after the return, prevention twice a week for good.\n" +
    PAIN_RULE_EN + "\n" + EXTEND_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: هل ارتفعت الحرارةُ أو احمرّ الجرحُ أو أفرز، أو صارت الركبةُ حارّةً متورّمةً مشدودة، أو تورّمت الساقُ أو ضاق النفَس، أو انفلتت الركبةُ أو سُمعت «طقّة»، أو عجز عن رفع الساق فجأةً، أو جاء ألمٌ لا يتناسب مع الحال — فالإحالةُ قبل التمرين.\n" +
    "• إحالةٌ في اليوم نفسِه: حمّى ٣٨° فأكثر، أو إفرازُ الجرح، أو ركبةٌ حارّةٌ متورّمةٌ مشدودة، أو ألمٌ يشتدّ سريعاً — التهابُ المفصل بعد العملية عند ٠٫٦٠٪، وأكثرُ مع طُعم خلف الفخذ والسكّريّ والكورتيزون (Schneider 2024 · Zhang 2023)، والكشفُ المبكّر يحفظ الطُّعمَ في نحو ٩٢٪ (Mustamsir 2025)؛ وألمُ الساق وتورّمُها أو ضيقُ النفَس أو ألمُ الصدر — الجلطةُ عند ٨٫١٪ بالفحص الروتينيّ (Joo 2022) — ⟵ الطبيبُ بقاعدة ويلز (Wells 2003)؛ والعجزُ المفاجئ عن رفع الساق أو فجوةٌ تُلمس في الرضفة أو وترها بعد طُعم وتر الرضفة — كسرُ الرضفة أو تمزّقُ الوتر (٠٫٢٪ — Lee 2008)؛ وركبةٌ انحبست فجأة.\n" +
    "• إحالةٌ خلال أسبوع: انفلاتٌ جديد أو اختبارُ لاكمان موجب (حساسيتُه ونوعيتُه ٠٫٨١ — van Eck 2013) — فشلُ الطُّعم؛ وانحباسٌ أو «طقّة» أو ألمُ خطّ المفصل الجديد بعد خياطة الغضروف؛ وتورّمٌ مشدود رغم تخفيف الحِمل.\n" +
    "• في مراجعة الأسبوع السادس: نقصُ مدٍّ ٥° فأكثر عن الركبة الأخرى (وأبكرَ إن وُجد حاجزٌ نابض أو «تكّة» أمامية أو عاد النقصُ بعد تحسّن) — عقدةُ «السايكلوبس» أو التليّف: النقصُ أكثرُ من ٥° عند ٢٥٫٣٪ في الأسبوع الرابع، واحتاج نصفُهم تقريباً منظاراً (Mauro 2008)، ونقصُ الأسبوع السادس رفع إعادةَ العملية ٧٫٩٦ مرّة (Delaloye 2020)؛ والثنيُ أقلُّ من ٩٠° (اقتراح — التليّفُ المتوسّط ٧٠–٨٩° عند Kalson 2016)؛ وفخذٌ لا ينقبض أو قوّتُه أقلُّ من ٦٠٪ رغم التحفيز والالتزام (Sonnery-Cottet 2022)؛ وتورّمٌ ١+ فأكثر بعد الأسبوع السادس إلى الثامن.\n" +
    "• في مراجعة الأسبوع الثاني عشر: قوّةُ الفخذ أقلُّ من ٨٠٪ رغم الالتزام، أو تورّمٌ ليس أثراً أو أقلّ، أو ألمُ مقدّم الركبة يمنع التحميل.\n" +
    "• في أيّ وقت: ألمٌ بمعايير بودابست (ألمٌ غيرُ متناسب مع تغيّر اللون أو الحرارة أو التعرّق أو التورّم وحساسيةٌ للّمس — Harden 2010)، وألمٌ عصبيّ يزيد فوق منطقة العصب الصافن (يبقى الخدرُ عند ٣٢٫١٪ بعد سنتين — Egerci 2024)، ورغبةُ المريض في مناقشة الطُّعم أو العملية؛ وأيُّ تعارضٍ بين تعليمات الجرّاح ومعايير البروتوكول.\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): المسكّنُ الذي وصفه الجرّاح، فضبطُ الألم يتيح المدَّ والتمرين — والألمُ فوق ٧ بعد العملية رفع خطرَ تثبيط العضلة ٤٫٦٩ مرّة (Sonnery-Cottet 2026)، ولا دليلَ على أنّ مضادّات الالتهاب تضرّ الطُّعم عند الإنسان (Ge 2018)؛ وحقنةُ الكورتيزون في الأسابيع الثمانية قبل العملية ضاعفت الالتهاب (Wainwright 2025)؛ والصفائحُ الدموية أثناء العملية بلا فائدةٍ سريرية ثابتة (Castro 2026)؛ ومميّعُ الدم بحسب طول التخدير والخطر (NICE NG89)؛ والعمليةُ المؤجّلة خيارٌ يقرّره الجرّاح: نصفُ من بدأ بالتأهيل احتاجها (Frobell 2013 · Reijman 2021)، وتُمنع مع غضروفٍ قابلٍ للخياطة.\n" +
    "موانعُ الأجهزة: منظّمُ ضربات القلب والورمُ والجلدُ المجروح أو ضعيفُ الإحساس وفتحاتُ المنظار والجرحُ قبل التئامهما تحت الأقطاب والحرارة والمغناطيس؛ والمساميرُ والأزرارُ المعدنية في مجال التيكار والحرارة العميقة؛ ولا ضغطَ على ساقٍ يُشكّ في جلطتها؛ ولا حرارةَ على ركبةٍ متورّمة ولا في الأسابيع الستّة الأولى.",
    "Before every session: has a fever appeared, the wound become red or discharging, the knee become hot, swollen and tense, the calf swollen or breathing short, the knee given way or a 'pop' been heard, the ability to lift the leg been lost suddenly, or pain out of proportion appeared — then referral comes before exercise.\n" +
    "• Same-day referral: a fever of 38 °C or more, wound discharge, a hot, swollen, tense knee or rapidly increasing pain — septic arthritis after surgery in 0.60%, commoner with hamstring grafts, diabetes and steroids (Schneider 2024 · Zhang 2023), and early detection saves the graft in about 92% (Mustamsir 2025); calf pain and swelling, breathlessness or chest pain — thrombosis in 8.1% on routine ultrasound (Joo 2022) — → the doctor with the Wells rule (Wells 2003); a sudden inability to lift the leg or a palpable gap in the kneecap or its tendon after a patellar-tendon graft — a patellar fracture or tendon rupture (0.2% — Lee 2008); and a knee that has suddenly locked.\n" +
    "• Referral within a week: new giving way or a positive Lachman test (sensitivity and specificity 0.81 — van Eck 2013) — graft failure; new catching, a 'pop' or joint-line pain after a meniscal repair; and a tense swelling despite load reduction.\n" +
    "• At the week-6 review: an extension deficit of 5° or more compared with the other knee (earlier if there is a springy block, an anterior 'clunk', or the loss returns after improving) — a cyclops lesion or fibrosis: a deficit of more than 5° in 25.3% at week 4, of whom about half needed arthroscopy (Mauro 2008), and a deficit at week 6 raised re-operation 7.96-fold (Delaloye 2020); flexion below 90° (a suggestion — moderate fibrosis is 70–89° in Kalson 2016); a quadriceps that does not contract or is below 60% despite stimulation and adherence (Sonnery-Cottet 2022); and swelling of 1+ or more beyond weeks 6 to 8.\n" +
    "• At the week-12 review: quadriceps strength below 80% despite adherence, swelling that is not trace or less, or anterior knee pain that prevents loading.\n" +
    "• At any time: pain meeting the Budapest criteria (disproportionate pain with changes in colour, temperature, sweating or swelling and sensitivity to touch — Harden 2010), increasing neuropathic pain over the saphenous nerve territory (numbness persists in 32.1% at two years — Egerci 2024), the patient's wish to discuss the graft or the operation; and any conflict between the surgeon's instructions and the protocol's criteria.\n" +
    "• What the patient is told (the doctor's decision): the painkiller the surgeon prescribed, since pain control allows extension and exercise — pain above 7 after surgery raised the risk of muscle inhibition 4.69-fold (Sonnery-Cottet 2026), and there is no evidence that anti-inflammatories harm the graft in humans (Ge 2018); a steroid injection in the eight weeks before surgery doubled infection (Wainwright 2025); platelet-rich plasma during surgery has no consistent clinical benefit (Castro 2026); an anticoagulant depending on the length of anaesthesia and the risk (NICE NG89); and delayed surgery is an option the surgeon decides: half of those who started with rehabilitation needed it (Frobell 2013 · Reijman 2021), and it is contraindicated with a repairable meniscal tear.\n" +
    "Contraindications to devices: a pacemaker, tumour, broken or poorly sensate skin, and unhealed portals and wounds under electrodes, heat and magnetic therapy; metal screws and buttons in the field of Tecar and deep heat; no compression on a leg with a suspected thrombosis; and no heat on a swollen knee or in the first six weeks.",
  ],
  precautions: [
    "• قاعدةُ التورّم والوجع في «التمارين» لكلّ المراحل؛ والقوّةُ الثقيلةُ والقفزُ يوماً بعد يوم وبينها ٤٨ ساعة، والجريُ أربعَ مرّاتٍ في الأسبوع على الأكثر ولا يومين متتاليين (Adams 2012 · Eitzen 2010)، والأيّامُ بينها للمدى والتوازن والدراجة والمهامّ اليومية والتثقيف.\n" +
    "• قواعدُ الطُّعم (van Melick 2016 · Adams 2012 · Kotsifaki 2023): مدُّ الركبة جالساً من الأسبوع الرابع في ٩٠–٤٥° ثمّ ٩٠–٣٠° في الخامس و٩٠–٢٠° في السادس و٩٠–١٠° في السابع والمدى كاملاً في الثامن؛ ووترُ الرضفة: الثقلُ مسموح، ويُراقب ألمُ الوتر، والركوعُ أصعب؛ ووترُ خلف الفخذ: لا ثقلَ في مدّ الركبة جالساً ولا مقاومةَ لثني الركبة حتى الأسبوع ١٢، وضعفُ الثني العميق متوقَّع (Ardern 2009)، والخدرُ تحت الركبة شائع؛ ووترُ الفخذ: كوتر الرضفة في التحميل والدليلُ قليل (Zhang 2022)، وبعضُ الجرّاحين يقفل الدعّامةَ ممدودةً أسبوعين إلى أربعة؛ والطُّعمُ من متبرّع: فشلُه أعلى عند الشباب — لا تسريع (Kaeding 2011)؛ والتثبيتُ الوحشيّ الإضافيّ: ألمٌ وحشيّ مبكّر والبرنامجُ نفسُه (Getgood 2020).\n" +
    "• خياطةُ الغضروف مع الرباط: لا يضع البروتوكولُ قيوداً — تُكتب قيودُ الجرّاح في الجلسة الأولى ويُعمل داخلها؛ والشائعُ في المراجع: لا ثنيَ حاملاً للوزن فوق ٤٥° أربعةَ أسابيع ثمّ أقلّ من ٩٠° حتى الثامن (Adams 2012)، وحدُّ المدى ستّةَ أسابيع للخياطة العمودية وحملٌ ومدىً محدودان ٤–٦ أسابيع للمعقّدة والشعاعية والجذر C، ولا قرفصاءَ عميقة ولا قفزَ ولا لفَّ أربعةَ أشهرٍ على الأقلّ D (Pujol 2025) — فالصلاةُ على الكرسيّ تلك المدّة، والقفزُ وتغييرُ الاتّجاه لا قبل الأسبوع ١٦، ويُفحص المدُّ والثنيُ كلَّ جلسة (التليّفُ ٢٫٨٣ مرّة — Huleatt 2018). والتثقيبُ الدقيق للغضروف المفصليّ: بلا حملٍ ٢–٤ أسابيع وحتى ٨ (Adams 2012). وأيُّ تعارضٍ ⟵ الجرّاح.\n" +
    "• الدعّامةُ والعكّاز: لا دعّامةَ بعد إعادة البناء المعزولة — اثنتا عشرةَ تجربة بلا أثرٍ في الألم والمدى والثبات (Wright & Fetzer 2007)، والدعّامةُ الوظيفية للرياضة ليست روتينية (Brophy 2023) وهي اختيارُ المريض D (Logerstedt 2017) لا بديلٌ عن المعايير؛ والحِملُ بقدر ما يتحمّل من اليوم الأوّل بالعكّازين حتى مشيةٍ طبيعية بمدٍّ كامل ودرجٍ بالتناوب — أسبوعٌ أو اثنان غالباً، والحِملُ الفوريّ قلّل ألمَ مقدّم الركبة من ٣٥٪ إلى ٨٪ (Tyler 1998)؛ والشريطُ الحركيّ راحةٌ قصيرة لا علاج (Kotsifaki 2023).\n" +
    "• القيادة: حين يضغط المكبحَ بأمانٍ في اختبار طوارئ مُحاكى — نحو ٤–٦ أسابيع للركبة اليمنى و٢–٣ لليسرى في السيارة الأوتوماتيكية (Kotsifaki 2023 · Salem 2021).\n" +
    "• التحفيزُ قبل الأجهزة: لا جهازَ للحدّ من جريان الدم ولا للاهتزاز ولا للقوّة المتساوية في المركز — والحِملُ الثقيلُ المتدرّج يعطي القوّةَ نفسَها حين تتحمّله الركبة، ومقياسُ اليد المثبَّت بحزامٍ بديلُ قياس القوّة لكنّه يبالغ في التناظر فيُطلب ٩٠٪ مع اختبارات القفز (Almeida 2019 · Sinacore 2017)، ولاعبُ الالتفاف يُحال قبل العودة الكاملة إلى اختبار القوّة المتساوية حيث يتوفّر.\n" +
    "• الصلاةُ والمرحاضُ العربيّ والجلوسُ على الأرض: بطاقةُ «الصلاة والركوع على الركبتين بعد الرباط الصليبيّ» بخطواتها الثلاث — الكرسيُّ للسجود والتشهّد في الأسابيع الستّة الأولى، ثمّ السجودُ على وسادةٍ سميكة بثنيٍ ١٢٠°، ثمّ الجلوسُ على العقبين بثنيٍ ١٤٠° — وطُعمُ وتر الرضفة أبطأ؛ والمرحاضُ العربيّ بعد ثنيٍ ١٣٠° وقرفصاءٍ على ساقٍ بتحكّم (وأربعةُ أشهرٍ بعد خياطة الغضروف) ومقعدٌ مرتفع قبلها؛ ولا استدارةَ على الركبتين في الأشهر الثلاثة أو الأربعة الأولى؛ ولا دراسةَ للصلاة بعد الرباط (بحثٌ صفريّ)؛ والصلاةُ على الكرسيّ طويلاً اقترنت بوظيفةٍ أسوأ في الخشونة (Ateef 2021) فالأرضُ هدف؛ والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• كرةُ القدم: إحماءُ فيفا ١١+ من المرحلة الثالثة ودائماً بعد العودة مرّتين في الأسبوع على الأقلّ (Thorborg 2017)؛ وعاد المحترفون إلى التدريب بعد ٦٫٦ أشهر وإلى المباريات بعد ٧٫٤ (Walden 2016) — لكنّ العودةَ قبل التاسع ترفع الخطرَ عند الشباب (Beischer 2020)، فالمعاييرُ أوّلاً والشهرُ التاسع حدٌّ أدنى لرياضة الالتفاف.\n" +
    "• المناخُ والحضور: حرُّ الصيف يفضّل الدراجةَ والسيرَ المتحرّك في الداخل؛ ومن لا يستطيع الحضورَ يومياً بعد الكتلة الأولى يُعطى البديل: الكتلةُ الثانية ثلاثاً في الأسبوع ثمانيةَ أسابيع (بندٌ لسليم)، ومريضُ ذي قار البعيد بمراجعةٍ عن بُعد بين الكتل — فالتأهيلُ عن بُعد لم يقلّ في تجربة (Yuan 2025).",
    "• The swelling-and-soreness rule under 'Exercises' for every phase; heavy strength and hopping every other day with 48 hours between, and running at most four times a week and never on consecutive days (Adams 2012 · Eitzen 2010), with the days between for range, balance, cycling, daily tasks and education.\n" +
    "• The graft rules (van Melick 2016 · Adams 2012 · Kotsifaki 2023): seated knee extension from week 4 in 90–45°, then 90–30° in week 5, 90–20° in week 6, 90–10° in week 7 and the full range in week 8; patellar tendon: load allowed, tendon pain monitored, kneeling harder; hamstring: no load in seated knee extension and no resisted knee bending until week 12, deep-flexion weakness expected (Ardern 2009), and numbness below the knee common; quadriceps tendon: like the patellar tendon for loading, with little evidence (Zhang 2022), and some surgeons lock a brace in extension for two to four weeks; donor graft: higher failure in the young — no acceleration (Kaeding 2011); additional lateral tenodesis: early lateral pain and the same programme (Getgood 2020).\n" +
    "• A meniscal repair with the ACL: the protocol sets no restrictions — the surgeon's restrictions are written down at the first session and followed; common in the literature: no weight-bearing flexion beyond 45° for four weeks, then below 90° until week 8 (Adams 2012), a range limit for six weeks after vertical repairs and limited weight bearing and range for 4–6 weeks after complex, radial and root repairs C, and no deep squatting, jumping or twisting for at least four months D (Pujol 2025) — so prayer is on a chair for that time, jumping and changes of direction not before week 16, and extension and flexion are checked every session (fibrosis 2.83-fold — Huleatt 2018). A cartilage microfracture: no weight bearing for 2–4 weeks and up to 8 (Adams 2012). Any conflict → the surgeon.\n" +
    "• Brace and crutches: no brace after isolated reconstruction — twelve trials found no effect on pain, range or stability (Wright & Fetzer 2007), and a functional brace for sport is not routine (Brophy 2023) but the patient's preference D (Logerstedt 2017), never a substitute for the criteria; weight bearing as tolerated from day one with two crutches until normal gait with full extension and reciprocal stairs — usually one or two weeks, and immediate weight bearing reduced anterior knee pain from 35% to 8% (Tyler 1998); kinesiology tape is brief comfort, not treatment (Kotsifaki 2023).\n" +
    "• Driving: when the brake can be pressed safely in a simulated emergency — about 4–6 weeks for the right knee and 2–3 weeks for the left in an automatic car (Kotsifaki 2023 · Salem 2021).\n" +
    "• Equipment the centre lacks: there is no blood-flow-restriction, vibration or isokinetic device in the centre — progressive heavy loading gives the same strength when the knee tolerates it, and a belt-fixed handheld dynamometer replaces strength testing but overestimates symmetry, so 90% is required together with the hop tests (Almeida 2019 · Sinacore 2017), and pivoting athletes are referred for isokinetic testing where available before the full return.\n" +
    "• Prayer, the squat toilet and floor sitting: the card 'Prayer and kneeling after ACL reconstruction' with its three steps — the chair for prostration and tashahhud in the first six weeks, then prostration on a thick cushion at 120° of flexion, then sitting back on the heels at 140° — slower with a patellar-tendon graft; the squat toilet after 130° of flexion and a controlled single-leg squat (and four months after a meniscal repair), with a raised seat before that; no turning on the knees in the first three or four months; there is no study of prayer after ACL reconstruction (a documented zero result); long-term chair prayer was associated with worse function in osteoarthritis (Ateef 2021), so the floor is the goal; the religious ruling is for the patient and their scholar.\n" +
    "• Football: the FIFA 11+ warm-up from phase 3 and permanently after the return, at least twice a week (Thorborg 2017); professionals returned to training after 6.6 months and to matches after 7.4 (Walden 2016) — but returning before month 9 raises the risk in the young (Beischer 2020), so criteria come first and month 9 is the minimum for pivoting sport.\n" +
    "• Climate and attendance: summer heat favours the bike and treadmill indoors; those who cannot attend daily after block 1 are offered the alternative: block 2 at three a week for eight weeks (an item for Saleem), and distant Dhi Qar patients a remote review between blocks — telerehabilitation was not inferior in one trial (Yuan 2025).",
  ],
  spw: 6, weeks: 14, minutes: 50, totalSessions: 84,
  refs: [
    { title: "Management of Anterior Cruciate Ligament Injuries — Evidence-Based Clinical Practice Guideline", org: "AAOS — American Academy of Orthopaedic Surgeons", year: 2022, url: "https://www.aaos.org/aclcpg" },
    { title: "Consensus Position Statement on Non-Operative and Operative Management in Anterior Cruciate Ligament Injury", org: "AOA — Australian Orthopaedic Association and AKS — Australian Knee Society", year: 2021, url: "https://kneesociety.org.au/resources/Final-Position-Statement-on-OP-vs-Non-op-ACL-Mx-2021.pdf" },
    { title: "Venous thromboembolism in over 16s: reducing the risk of hospital-acquired deep vein thrombosis or pulmonary embolism (NG89)", org: "NICE — National Institute for Health and Care Excellence", year: 2018, url: "https://www.nice.org.uk/guidance/ng89" },
    { title: "Knee Stability and Movement Coordination Impairments: Knee Ligament Sprain Revision 2017", org: "J Orthop Sports Phys Ther — APTA Academy of Orthopaedic Physical Therapy guideline, knee ligament sprain revision 2017 (Logerstedt et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.0303" },
    { title: "Evidence-based clinical practice update: practice guidelines for anterior cruciate ligament rehabilitation based on a systematic review and multidisciplinary consensus", org: "Br J Sports Med — KNGF Dutch ACL rehabilitation guideline (van Melick et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2015-095898" },
    { title: "Aspetar clinical practice guideline on rehabilitation after anterior cruciate ligament reconstruction", org: "Br J Sports Med — Aspetar clinical practice guideline 2023 (Kotsifaki et al.)", year: 2023, url: "https://doi.org/10.1136/bjsports-2022-106158" },
    { title: "American Academy of Orthopaedic Surgeons Clinical Practice Guideline Summary: Management of Anterior Cruciate Ligament Injuries", org: "J Am Acad Orthop Surg — AAOS ACL guideline summary 2022 (Brophy et al.)", year: 2023, url: "https://doi.org/10.5435/jaaos-d-22-01020" },
    { title: "Return to Sport After Anterior Cruciate Ligament Injury: Panther Symposium ACL Injury Return to Sport Consensus Group", org: "Orthop J Sports Med — Panther Symposium return-to-sport consensus (Meredith et al.)", year: 2020, url: "https://doi.org/10.1177/2325967120930829" },
    { title: "2016 Consensus statement on return to sport from the First World Congress in Sports Physical Therapy, Bern", org: "Br J Sports Med — Bern return-to-sport consensus 2016 (Ardern et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2016-096278" },
    { title: "Anterior Cruciate Ligament Reconstruction Rehabilitation: MOON Guidelines", org: "Sports Health — MOON rehabilitation guideline (Wright et al.)", year: 2015, url: "https://doi.org/10.1177/1941738113517855" },
    { title: "Current concepts for anterior cruciate ligament reconstruction: a criterion-based rehabilitation progression", org: "J Orthop Sports Phys Ther — Delaware criterion-based rehabilitation (Adams et al.)", year: 2012, url: "https://doi.org/10.2519/jospt.2012.3871" },
    { title: "The formal EU-US Meniscus Rehabilitation 2024 Consensus: An ESSKA-AOSSM-AASPT initiative. Part I-Rehabilitation management after meniscus surgery (meniscectomy, repair and reconstruction)", org: "Knee Surg Sports Traumatol Arthrosc — ESSKA–AOSSM–AASPT meniscus rehabilitation consensus 2024, part I (Pujol et al.)", year: 2025, url: "https://doi.org/10.1002/ksa.12674" },
    { title: "Treatment for acute anterior cruciate ligament tear: five year outcome of randomised trial", org: "BMJ (Frobell et al.)", year: 2013, url: "https://doi.org/10.1136/bmj.f232" },
    { title: "Early surgical reconstruction versus rehabilitation with elective delayed reconstruction for patients with anterior cruciate ligament rupture: COMPARE randomised controlled trial", org: "BMJ (Reijman et al.)", year: 2021, url: "https://doi.org/10.1136/bmj.n375" },
    { title: "Fifty-five per cent return to competitive sport following anterior cruciate ligament reconstruction surgery: an updated systematic review and meta-analysis including aspects of physical functioning and contextual factors", org: "Br J Sports Med (Ardern et al.)", year: 2014, url: "https://doi.org/10.1136/bjsports-2013-093398" },
    { title: "Risk of Secondary Injury in Younger Athletes After Anterior Cruciate Ligament Reconstruction: A Systematic Review and Meta-analysis", org: "Am J Sports Med (Wiggins et al.)", year: 2016, url: "https://doi.org/10.1177/0363546515621554" },
    { title: "High Rates of Osteoarthritis Develop After Anterior Cruciate Ligament Surgery: An Analysis of 4108 Patients", org: "Am J Sports Med (Cinque et al.)", year: 2018, url: "https://doi.org/10.1177/0363546517730072" },
    { title: "Home-based rehabilitation following anterior cruciate ligament reconstruction in the Kurdistan region of Iraq: epidemiology and outcomes", org: "Eur J Orthop Surg Traumatol (Kader et al.)", year: 2023, url: "https://doi.org/10.1007/s00590-022-03431-8" },
    { title: "Knee lesions with anterior cruciate ligament (ACL) tear in Iraqi adult males: arthroscopic findings", org: "J Med Life (Alardi et al.)", year: 2023, url: "https://doi.org/10.25122/jml-2023-0055" },
    { title: "Accelerated versus nonaccelerated rehabilitation after anterior cruciate ligament reconstruction: a prospective, randomized, double-blind investigation evaluating knee joint laxity using roentgen stereophotogrammetric analysis", org: "Am J Sports Med (Beynnon et al.)", year: 2011, url: "https://doi.org/10.1177/0363546511422349" },
    { title: "Comparison of home versus physical therapy-supervised rehabilitation programs after anterior cruciate ligament reconstruction: a randomized clinical trial", org: "Am J Sports Med (Grant et al.)", year: 2005, url: "https://doi.org/10.1177/0363546504273051" },
    { title: "Neuromuscular electrical stimulation is effective in strengthening the quadriceps muscle after anterior cruciate ligament surgery", org: "Knee Surg Sports Traumatol Arthrosc (Hauger et al.)", year: 2018, url: "https://doi.org/10.1007/s00167-017-4669-5" },
    { title: "Simple decision rules can reduce reinjury risk by 84% after ACL reconstruction: the Delaware-Oslo ACL cohort study", org: "Br J Sports Med (Grindem et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2016-096031" },
    { title: "Young Athletes Who Return to Sport Before 9 Months After Anterior Cruciate Ligament Reconstruction Have a Rate of New Injury 7 Times That of Those Who Delay Return", org: "J Orthop Sports Phys Ther (Beischer et al.)", year: 2020, url: "https://doi.org/10.2519/jospt.2020.9071" },
    { title: "Minimum 10-year results after anterior cruciate ligament reconstruction: how the loss of normal knee motion compounds other factors related to the development of osteoarthritis after surgery", org: "Am J Sports Med (Shelbourne et al.)", year: 2009, url: "https://doi.org/10.1177/0363546508326709" },
    { title: "Interrater reliability of a clinical scale to assess knee joint effusion", org: "J Orthop Sports Phys Ther (Sturgill et al.)", year: 2009, url: "https://doi.org/10.2519/jospt.2009.3143" },
    { title: "Limb Symmetry Indexes Can Overestimate Knee Function After Anterior Cruciate Ligament Injury", org: "J Orthop Sports Phys Ther (Wellsandt et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.7285" },
    { title: "Hop testing provides a reliable and valid outcome measure during rehabilitation after anterior cruciate ligament reconstruction", org: "Phys Ther (Reid et al.)", year: 2007, url: "https://doi.org/10.2522/ptj.20060143" },
    { title: "Responsiveness of the International Knee Documentation Committee Subjective Knee Form", org: "Am J Sports Med (Irrgang et al.)", year: 2006, url: "https://doi.org/10.1177/0363546506288855" },
    { title: "Defining Thresholds for the Patient Acceptable Symptom State for the IKDC Subjective Knee Form and KOOS for Patients Who Underwent ACL Reconstruction", org: "Am J Sports Med (Muller et al.)", year: 2016, url: "https://doi.org/10.1177/0363546516652888" },
    { title: "Progression of the Psychological ACL-RSI Score and Return to Sport After Anterior Cruciate Ligament Reconstruction: A Prospective 2-Year Follow-up Study From the French Prospective Anterior Cruciate Ligament Reconstruction Cohort Study (FAST)", org: "Orthop J Sports Med (Sadeqi et al.)", year: 2018, url: "https://doi.org/10.1177/2325967118812819" },
    { title: "Psychological Readiness to Return to Sport Is Associated With Second Anterior Cruciate Ligament Injuries", org: "Am J Sports Med (McPherson et al.)", year: 2019, url: "https://doi.org/10.1177/0363546518825258" },
    { title: "The 'ligamentization' process in anterior cruciate ligament reconstruction: what happens to the human graft? A systematic review of the literature", org: "Am J Sports Med (Claes et al.)", year: 2011, url: "https://doi.org/10.1177/0363546511402662" },
    { title: "Reliability of goniometric measurements and visual estimates of knee range of motion obtained in a clinical setting", org: "Phys Ther (Watkins et al.)", year: 1991, url: "https://doi.org/10.1093/ptj/71.2.90" },
    { title: "Intra- and intertester reliability and criterion validity of the parallelogram and universal goniometers for measuring maximum active knee flexion and extension of patients with knee restrictions", org: "Arch Phys Med Rehabil (Brosseau et al.)", year: 2001, url: "https://doi.org/10.1053/apmr.2001.19250" },
    { title: "Incidence and Risk Factors for Arthrogenic Muscle Inhibition in the Early Postoperative Period After ACL Reconstruction. A Cohort Study From the SANTI Study Group", org: "Orthop J Sports Med (Sonnery-Cottet et al.)", year: 2026, url: "https://doi.org/10.1177/23259671251350305" },
    { title: "Hand-held dynamometer identifies asymmetries in torque of the quadriceps muscle after anterior cruciate ligament reconstruction", org: "Knee Surg Sports Traumatol Arthrosc (Almeida et al.)", year: 2019, url: "https://doi.org/10.1007/s00167-018-5245-3" },
    { title: "The prognosis of iatrogenic saphenous nerve injuries during hamstring tendon harvesting in anterior cruciate ligament reconstruction", org: "J Orthop Surg Res (Egerci et al.)", year: 2024, url: "https://doi.org/10.1186/s13018-024-04929-z" },
    { title: "Arabic version of the International Knee Documentation Committee Subjective Knee Form (IKDC): Translation and validation", org: "J Back Musculoskelet Rehabil (Almalki et al.)", year: 2022, url: "https://doi.org/10.3233/bmr-210136" },
    { title: "Arabic translation and validation of three knee scores, Lysholm Knee Score (LKS), Oxford Knee Score (OKS), and International Knee Documentation Committee Subjective Knee Form (IKDC)", org: "SICOT J (Ahmed et al.)", year: 2019, url: "https://doi.org/10.1051/sicotj/2018054" },
    { title: "Cross-cultural adaptation, reliability, internal consistency and validation of the Arabic version of the knee injury and osteoarthritis outcome score (KOOS) for Egyptian people with knee injuries", org: "Osteoarthritis Cartilage (Almangoush et al.)", year: 2013, url: "https://doi.org/10.1016/j.joca.2013.09.010" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "Arabic Version of the Short Anterior Cruciate Ligament-Return to Sport After Injury Scale: Translation, Cross-cultural Adaptation, and Validation", org: "Orthop J Sports Med (Alzhrani et al.)", year: 2022, url: "https://doi.org/10.1177/23259671211066509" },
    { title: "The Arabic Version of the Tegner Activity Scale in Patients with Anterior Cruciate Ligament Reconstruction: Translation, Validation, and Cross-Cultural Adaptation", org: "Int J Environ Res Public Health (Alzhrani et al.)", year: 2022, url: "https://doi.org/10.3390/ijerph19041987" },
    { title: "Y BALANCE TEST™ ANTERIOR REACH SYMMETRY AT THREE MONTHS IS RELATED TO SINGLE LEG FUNCTIONAL PERFORMANCE AT TIME OF RETURN TO SPORTS FOLLOWING ANTERIOR CRUCIATE LIGAMENT RECONSTRUCTION", org: "Int J Sports Phys Ther (Garrison et al.)", year: 2015, url: "https://pubmed.ncbi.nlm.nih.gov/26491610/" },
    { title: "Evidence-based recommendations for the management of anterior cruciate ligament (ACL) rupture", org: "Best Pract Res Clin Rheumatol (Filbay et al.)", year: 2019, url: "https://doi.org/10.1016/j.berh.2019.01.018" },
    { title: "A progressive 5-week exercise therapy program leads to significant improvement in knee function early after anterior cruciate ligament injury", org: "J Orthop Sports Phys Ther (Eitzen et al.)", year: 2010, url: "https://doi.org/10.2519/jospt.2010.3345" },
    { title: "Neuromuscular training versus strength training during first 6 months after anterior cruciate ligament reconstruction: a randomized clinical trial", org: "Phys Ther (Risberg et al.)", year: 2007, url: "https://doi.org/10.2522/ptj.20060041" },
    { title: "On-field Rehabilitation Part 1: 4 Pillars of High-Quality On-field Rehabilitation Are Restoring Movement Quality, Physical Conditioning, Restoring Sport-Specific Skills, and Progressively Developing Chronic Training Load", org: "J Orthop Sports Phys Ther (Buckthorpe et al.)", year: 2019, url: "https://doi.org/10.2519/jospt.2019.8954" },
    { title: "On-field Rehabilitation Part 2: A 5-Stage Program for the Soccer Player Focused on Linear Movements, Multidirectional Movements, Soccer-Specific Skills, Soccer-Specific Movements, and Modified Practice", org: "J Orthop Sports Phys Ther (Buckthorpe et al.)", year: 2019, url: "https://doi.org/10.2519/jospt.2019.8952" },
    { title: "Effectiveness of a supervised rehabilitation compared with a home-based rehabilitation following anterior cruciate ligament reconstruction: A systematic review and meta-analysis", org: "Phys Ther Sport (Uchino et al.)", year: 2022, url: "https://doi.org/10.1016/j.ptsp.2022.05.010" },
    { title: "Intensive supervised rehabilitation versus less supervised rehabilitation following anterior cruciate ligament reconstruction? A systematic review and meta-analysis", org: "J Sci Med Sport (Gamble et al.)", year: 2021, url: "https://doi.org/10.1016/j.jsams.2021.03.003" },
    { title: "Incidence, Common Pathogens, and Risk Factors for Infection after Primary Anterior Cruciate Ligament Reconstruction: A Systematic Review", org: "J Knee Surg (Schneider et al.)", year: 2024, url: "https://doi.org/10.1055/a-2179-3678" },
    { title: "A Systematic Review and Meta-analysis of Risk Factors for an Infection After Anterior Cruciate Ligament Reconstruction", org: "Orthop J Sports Med (Zhang et al.)", year: 2023, url: "https://doi.org/10.1177/23259671231200822" },
    { title: "The effectiveness of arthroscopic irrigation and debridement in the management of septic arthritis following anterior cruciate ligament reconstruction: A Systematic Review and Meta-Analysis", org: "Acta Orthop Traumatol Turc (Mustamsir et al.)", year: 2025, url: "https://doi.org/10.5152/j.aott.2025.24070" },
    { title: "The incidence of deep vein thrombosis after anterior cruciate ligament reconstruction: An analysis using routine ultrasonography of 260 patients", org: "PLoS One (Joo et al.)", year: 2022, url: "https://doi.org/10.1371/journal.pone.0279136" },
    { title: "Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis", org: "N Engl J Med (Wells et al.)", year: 2003, url: "https://doi.org/10.1056/nejmoa023153" },
    { title: "The incidence of acute patellar tendon harvest complications for anterior cruciate ligament reconstruction", org: "Arthroscopy (Lee et al.)", year: 2008, url: "https://doi.org/10.1016/j.arthro.2007.08.020" },
    { title: "Methods to diagnose acute anterior cruciate ligament rupture: a meta-analysis of physical examinations with and without anaesthesia", org: "Knee Surg Sports Traumatol Arthrosc (van Eck et al.)", year: 2013, url: "https://doi.org/10.1007/s00167-012-2250-9" },
    { title: "Loss of extension following anterior cruciate ligament reconstruction: analysis of incidence and etiology using IKDC criteria", org: "Arthroscopy (Mauro et al.)", year: 2008, url: "https://doi.org/10.1016/j.arthro.2007.08.026" },
    { title: "Knee Extension Deficit in the Early Postoperative Period Predisposes to Cyclops Syndrome After Anterior Cruciate Ligament Reconstruction: A Risk Factor Analysis in 3633 Patients From the SANTI Study Group Database", org: "Am J Sports Med (Delaloye et al.)", year: 2020, url: "https://doi.org/10.1177/0363546519897064" },
    { title: "International consensus on the definition and classification of fibrosis of the knee joint", org: "Bone Joint J (Kalson et al.)", year: 2016, url: "https://doi.org/10.1302/0301-620x.98b10.37957" },
    { title: "Arthrogenic Muscle Inhibition Following Knee Injury or Surgery: Pathophysiology, Classification, and Treatment", org: "Video J Sports Med (Sonnery-Cottet et al.)", year: 2022, url: "https://doi.org/10.1177/26350254221086295" },
    { title: "Complex regional pain syndrome workshop at Cardiff: editorial", org: "Pain Med (Harden et al.)", year: 2010, url: "https://doi.org/10.1111/j.1526-4637.2010.00918.x" },
    { title: "Do Nonsteroidal Anti-Inflammatory Drugs Affect Tissue Healing After Arthroscopic Anterior Cruciate Ligament Reconstruction?", org: "Med Sci Monit (Ge et al.)", year: 2018, url: "https://doi.org/10.12659/msm.910942" },
    { title: "Corticosteroid Injection up to 8 Weeks Before Anterior Cruciate Ligament Reconstruction Doubles the Incidence of Postoperative Infection", org: "Arthroscopy (Wainwright et al.)", year: 2025, url: "https://doi.org/10.1016/j.arthro.2025.02.027" },
    { title: "The effects of platelet-rich plasma therapy on outcomes after anterior cruciate ligament reconstruction: A systematic review and meta-analysis", org: "J Exp Orthop (Castro et al.)", year: 2026, url: "https://doi.org/10.1002/jeo2.70913" },
    { title: "Knee flexor strength recovery following hamstring tendon harvest for anterior cruciate ligament reconstruction: a systematic review", org: "Orthop Rev (Pavia) (Ardern et al.)", year: 2009, url: "https://doi.org/10.4081/or.2009.e12" },
    { title: "Quadriceps Tendon Anterior Cruciate Ligament Reconstruction: A Systematic Review of Postoperative Rehabilitation and Complication Profiles", org: "Arthroscopy (Zhang et al.)", year: 2022, url: "https://doi.org/10.1016/j.arthro.2021.12.020" },
    { title: "Allograft Versus Autograft Anterior Cruciate Ligament Reconstruction: Predictors of Failure From a MOON Prospective Longitudinal Cohort", org: "Sports Health (Kaeding et al.)", year: 2011, url: "https://doi.org/10.1177/1941738110386185" },
    { title: "Lateral Extra-articular Tenodesis Reduces Failure of Hamstring Tendon Autograft Anterior Cruciate Ligament Reconstruction: 2-Year Outcomes From the STABILITY Study Randomized Clinical Trial", org: "Am J Sports Med (Getgood et al.)", year: 2020, url: "https://doi.org/10.1177/0363546519896333" },
    { title: "Risk Factors for Manipulation Under Anesthesia and/or Lysis of Adhesions After Anterior Cruciate Ligament Reconstruction", org: "Orthop J Sports Med (Huleatt et al.)", year: 2018, url: "https://doi.org/10.1177/2325967118794490" },
    { title: "Bracing after ACL reconstruction: a systematic review", org: "Clin Orthop Relat Res (Wright et al.)", year: 2007, url: "https://doi.org/10.1097/blo.0b013e31802c9360" },
    { title: "The effect of immediate weightbearing after anterior cruciate ligament reconstruction", org: "Clin Orthop Relat Res (Tyler et al.)", year: 1998, url: "https://doi.org/10.1097/00003086-199812000-00019" },
    { title: "Return to Driving After Anterior Cruciate Ligament Reconstruction: A Systematic Review", org: "Orthop J Sports Med (Salem et al.)", year: 2021, url: "https://doi.org/10.1177/2325967120968556" },
    { title: "Diagnostic Accuracy of Handheld Dynamometry and 1-Repetition-Maximum Tests for Identifying Meaningful Quadriceps Strength Asymmetries", org: "J Orthop Sports Phys Ther (Sinacore et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.6651" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "J Relig Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "Effect of specific exercise-based football injury prevention programmes on the overall injury rate in football: a systematic review and meta-analysis of the FIFA 11 and 11+ programmes", org: "Br J Sports Med (Thorborg et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-097066" },
    { title: "ACL injuries in men's professional football: a 15-year prospective study on time trends and return-to-play rates reveals only 65% of players still play at the top level 3 years after ACL rupture", org: "Br J Sports Med (Waldén et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2015-095952" },
    { title: "The efficacy and cost-effectiveness analysis of telerehabilitation for patients after arthroscopic ACL-reconstruction: a non-inferiority randomized controlled trial", org: "J Orthop Surg Res (Yuan et al.)", year: 2025, url: "https://doi.org/10.1186/s13018-025-06403-w" },
    { title: "A Comparison of Neuromuscular Electrical Stimulation Parameters for Postoperative Quadriceps Strength in Patients After Knee Surgery: A Systematic Review", org: "Sports Health (Conley et al.)", year: 2021, url: "https://doi.org/10.1177/1941738120964817" },
    { title: "Neuromuscular Electrical Stimulation Superimposed on Movement Early after ACL Surgery", org: "Med Sci Sports Exerc (Labanca et al.)", year: 2018, url: "https://doi.org/10.1249/mss.0000000000001462" },
    { title: "Strength of the quadriceps femoris muscle and functional recovery after reconstruction of the anterior cruciate ligament. A prospective, randomized clinical trial of electrical stimulation", org: "J Bone Joint Surg Am (Snyder-Mackler et al.)", year: 1995, url: "https://doi.org/10.2106/00004623-199508000-00004" },
    { title: "Adding high-frequency transcutaneous electrical nerve stimulation to the first phase of post anterior cruciate ligament reconstruction rehabilitation does not improve pain and function in young male athletes more than exercise alone: a randomized single-blind clinical trial", org: "Disabil Rehabil (Forogh et al.)", year: 2019, url: "https://doi.org/10.1080/09638288.2017.1399294" },
    { title: "Cryotherapy after ACL reconstruction: a meta-analysis", org: "J Knee Surg (Raynor et al.)", year: 2005, url: "https://doi.org/10.1055/s-0030-1248169" },
    { title: "Combination of cold and compression after knee surgery. A prospective randomized study", org: "Knee Surg Sports Traumatol Arthrosc (Schröder et al.)", year: 1994, url: "https://doi.org/10.1007/bf01467918" },
    { title: "The efficacy of combined cryotherapy and compression compared with cryotherapy alone following anterior cruciate ligament reconstruction", org: "J Knee Surg (Waterman et al.)", year: 2012, url: "https://doi.org/10.1055/s-0031-1299650" },
    { title: "Effects of biophysical stimulation in patients undergoing arthroscopic reconstruction of anterior cruciate ligament: prospective, randomized and double blind study", org: "Knee Surg Sports Traumatol Arthrosc (Benazzo et al.)", year: 2008, url: "https://doi.org/10.1007/s00167-008-0519-9" },
    { title: "The use of an alternating magnetic field in the resorption of postoperative joint effusion following anterior cruciate ligament reconstruction: A randomized double-blind controlled trial", org: "Medicine (Baltimore) (Ogrodzka-Ciechanowicz et al.)", year: 2021, url: "https://doi.org/10.1097/md.0000000000026572" },
    { title: "Knee temperature remains abnormal in patients successfully treated with anterior cruciate ligament reconstruction: An infrared thermography analysis", org: "J Exp Orthop (De Marziani et al.)", year: 2024, url: "https://doi.org/10.1002/jeo2.70012" },
    { title: "A randomized trial of treatment for anterior cruciate ligament reconstruction by radial extracorporeal shock wave therapy", org: "BMC Musculoskelet Disord (Song et al.)", year: 2024, url: "https://doi.org/10.1186/s12891-024-07177-8" },
    { title: "Use of extracorporeal shockwave therapy combined with standard rehabilitation following anterior cruciate ligament reconstruction: a systematic review with meta-analysis", org: "BMC Musculoskelet Disord (Shin et al.)", year: 2025, url: "https://doi.org/10.1186/s12891-025-08277-9" },
    { title: "Evaluating the efficacy of extracorporeal shockwave therapy in postoperative rehabilitation after anterior cruciate ligament reconstruction: A meta-analysis", org: "World J Orthop (Salimi et al.)", year: 2025, url: "https://doi.org/10.5312/wjo.v16.i12.110324" },
    { title: "Arthrogenic muscle inhibition after ACL reconstruction: a scoping review of the efficacy of interventions", org: "Br J Sports Med (Sonnery-Cottet et al.)", year: 2019, url: "https://doi.org/10.1136/bjsports-2017-098401" },
    { title: "Efficacy of quadriceps vastus medialis dry needling in a rehabilitation protocol after surgical reconstruction of complete anterior cruciate ligament rupture", org: "Medicine (Baltimore) (Velázquez-Saornil et al.)", year: 2017, url: "https://doi.org/10.1097/md.0000000000006726" },
    { title: "[Effect of electroacupuncture on rehabilitation of knee joint movement after anterior cruciate ligament reconstruction]", org: "Zhongguo Zhen Jiu (Ding et al.)", year: 2020, url: "https://pubmed.ncbi.nlm.nih.gov/32100498/" },
    { title: "The Utility of Continuous Passive Motion After Anterior Cruciate Ligament Reconstruction: A Systematic Review of Comparative Studies", org: "Orthop J Sports Med (D'Amore et al.)", year: 2021, url: "https://doi.org/10.1177/23259671211013841" },
    { title: "The effects of immediate continuous passive motion on pain during the inflammatory phase of soft tissue healing following anterior cruciate ligament reconstruction", org: "J Orthop Sports Phys Ther (McCarthy et al.)", year: 1993, url: "https://doi.org/10.2519/jospt.1993.17.2.96" },
    { title: "Effectiveness of an intelligent weight-bearing rehabilitation robot in enhancing recovery following anterior cruciate ligament reconstruction", org: "Front Public Health (Wen et al.)", year: 2025, url: "https://doi.org/10.3389/fpubh.2025.1526105" },
    { title: "[Effect of exoskeleton robot on lower limb function in the early rehabilitation stage of patients after anterior cruciate ligament reconstruction]", org: "Zhongguo Gu Shang (Feng et al.)", year: 2026, url: "https://doi.org/10.12200/j.issn.1003-0034.20250995" },
    { title: "Early versus late start of open kinetic chain quadriceps exercises after ACL reconstruction with patellar tendon or hamstring grafts: a prospective randomized outcome study", org: "Knee Surg Sports Traumatol Arthrosc (Heijne et al.)", year: 2007, url: "https://doi.org/10.1007/s00167-006-0246-z" },
    { title: "Criteria for return to running after anterior cruciate ligament reconstruction: a scoping review", org: "Br J Sports Med (Rambaud et al.)", year: 2018, url: "https://doi.org/10.1136/bjsports-2017-098602" },
    { title: "Systematic video analysis of ACL injuries in professional male football (soccer): injury mechanisms, situational patterns and biomechanics study on 134 consecutive cases", org: "Br J Sports Med (Della Villa et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2019-101247" },
    { title: "Return to sport following anterior cruciate ligament reconstruction surgery: a systematic review and meta-analysis of the state of play", org: "Br J Sports Med (Ardern et al.)", year: 2011, url: "https://doi.org/10.1136/bjsm.2010.076364" },
    { title: "Self-reported knee function can identify athletes who fail return-to-activity criteria up to 1 year after anterior cruciate ligament reconstruction: a delaware-oslo ACL cohort study", org: "J Orthop Sports Phys Ther (Logerstedt et al.)", year: 2014, url: "https://doi.org/10.2519/jospt.2014.4852" },
    { title: "What is the Evidence for and Validity of Return-to-Sport Testing after Anterior Cruciate Ligament Reconstruction Surgery? A Systematic Review and Meta-Analysis", org: "Sports Med (Webster et al.)", year: 2019, url: "https://doi.org/10.1007/s40279-019-01093-x" },
    { title: "Loss of normal knee motion after anterior cruciate ligament reconstruction is associated with radiographic arthritic changes after surgery", org: "Am J Sports Med (Shelbourne et al.)", year: 2012, url: "https://doi.org/10.1177/0363546511423639" },
    { title: "Likelihood of ACL graft rupture: not meeting six clinical discharge criteria before return to sport is associated with a four times greater risk of rupture", org: "Br J Sports Med (Kyritsis et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2015-095908" },
    { title: "Anterior cruciate ligament strain and tensile forces for weight-bearing and non-weight-bearing exercises: a guide to exercise selection", org: "J Orthop Sports Phys Ther (Escamilla et al.)", year: 2012, url: "https://doi.org/10.2519/jospt.2012.3768" },
    { title: "Open kinetic chain exercises in a restricted range of motion after anterior cruciate ligament reconstruction: a randomized controlled clinical trial", org: "Am J Sports Med (Fukuda et al.)", year: 2013, url: "https://doi.org/10.1177/0363546513476482" },
    { title: "Closed kinetic chain alone compared to combined open and closed kinetic chain exercises for quadriceps strengthening after anterior cruciate ligament reconstruction with respect to return to sports: a prospective matched follow-up study", org: "Knee Surg Sports Traumatol Arthrosc (Mikkelsen et al.)", year: 2000, url: "https://doi.org/10.1007/s001670000143" },
    { title: "Meta-analysis of meta-analyses of anterior cruciate ligament injury reduction training programs", org: "J Orthop Res (Webster et al.)", year: 2018, url: "https://doi.org/10.1002/jor.24043" },
    { title: "Compliance with a comprehensive warm-up programme to prevent injuries in youth football", org: "Br J Sports Med (Soligard et al.)", year: 2010, url: "https://doi.org/10.1136/bjsm.2009.070672" },
    { title: "Knee kinematics in-vivo of kneeling in deep flexion examined by bi-planar radiographs", org: "Biomed Sci Instrum (Hefzy et al.)", year: 1997, url: "https://pubmed.ncbi.nlm.nih.gov/9731402/" },
    { title: "Knee kinematics of high-flexion activities of daily living performed by male Muslims in the Middle East", org: "J Arthroplasty (Acker et al.)", year: 2011, url: "https://doi.org/10.1016/j.arth.2010.08.003" },
    { title: "Comparison of Knee Pain and Difficulty With Kneeling Between Patellar Tendon and Hamstring Tendon Autografts After Anterior Cruciate Ligament Reconstruction: A Study From the New Zealand ACL Registry", org: "Am J Sports Med (Rahardja et al.)", year: 2023, url: "https://doi.org/10.1177/03635465231198063" },
    { title: "Preoperative quadriceps strength is a significant predictor of knee function two years after anterior cruciate ligament reconstruction", org: "Br J Sports Med (Eitzen et al.)", year: 2009, url: "https://doi.org/10.1136/bjsm.2008.057059" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 30,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٠ دقيقة في الجلسة بعد إحماءٍ على الدراجة ٥–١٠ دقائق — في الكتلة الأولى المدُّ وتنشيطُ الفخذ والثنيُ والمشية والسلسلةُ المغلقة من الأسبوع الثاني؛ وفي الثانية القوّةُ الثقيلة يوماً بعد يوم (٣–٤ تمارين × ٣–٤ مجموعات × ٦–٨ بأقصى جهد وقاعدة «زائد اثنين» — Eitzen 2010) والتوازنُ والاضطرابُ بينها؛ وفي الثالثة والرابعة الجريُ والقفزُ وتغييرُ الاتّجاه يوماً بعد يوم.",
        "The phased programme and its cards under 'Programme by phase': about 30 minutes per session after a 5–10-minute warm-up on the bike — in block 1 extension, quadriceps activation, flexion, gait and closed-chain work from week 2; in block 2 heavy strength every other day (3–4 exercises × 3–4 sets × 6–8 at maximal effort with the 'plus-two' rule — Eitzen 2010) with balance and perturbation between; in blocks 3 and 4 running, hopping and changes of direction every other day."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ المتدرّج حاملاً للوزن وغيرَ حامل A والتمرينُ العصبيّ العضليّ A والتمرينُ المشرَف عليه مع برنامجٍ منزليّ B (Logerstedt 2017)، و«التمرينُ أساسُ التأهيل» (Kotsifaki 2023). والعلاجُ اليدويّ داخله: تحريكُ الرضفة في الأسبوعين الأوّلين، وتحريكُ المفصل بالدوران في الأسابيع ٣–٥ لمن تحدّدت حركتُه، وتحريكُ الندبة بعد الالتئام (Adams 2012).",
        "Core in every session — progressive weight-bearing and non-weight-bearing exercise A, neuromuscular training A, and supervised exercise with a home programme B (Logerstedt 2017), and 'exercise should be the foundation' (Kotsifaki 2023). Manual therapy is inside it: patellar mobilisation in the first two weeks, joint mobilisation with rotation in weeks 3–5 for limited movement, and scar mobilisation after healing (Adams 2012)."] },
    { code: "electro", centreUse: "core", evidence: "recommended", minutes: 15,
      params: { currentType: "NMES quadriceps — 2500 Hz carrier, burst-modulated (Russian)", frequencyHz: "75 bursts/s (if pulsed biphasic only: ≥50 Hz)", pulseWidthUs: "Burst AC; 250–300 if pulsed biphasic", intensity: "Max tolerated, ≥50% MVIC", onOff: "12 s on / 50 s off, 2 s ramp", durationMin: "≈11 (10 contractions), knee at 60°" },
      parameters: ["تحفيزٌ عضليّ (NMES) لعضلة الفخذ الأمامية بإعدادات ديلاوير: تيّارٌ حامل ٢٥٠٠ هرتز بـ٧٥ دفعةً في الثانية، وصعودٌ ثانيتان، و١٢ ثانيةً عمل و٥٠ راحة، بأقوى انقباضٍ يتحمّله (٥٠٪ من أقصى انقباضٍ إراديّ على الأقلّ)، عشرُ انقباضات والركبةُ ثابتةٌ في ٦٠° (٤٥–٦٠° لطُعم وتر الرضفة بما يريحه)، والقطبان فوق أعلى الفخذ الوحشيّ وأسفله الإنسيّ بعيداً عن فتحة المنظار حتى تلتئم (Adams 2012)؛ وإن لم يُخرج الجهازُ التيّارَ الحامل: ٥٠ هرتز فأكثر ثنائيُّ الطور ٢٥٠–٣٠٠ ميكروثانية وأقطابٌ كبيرة والعملُ إلى الراحة ١ : ٢–٣ (Conley 2021)؛ ويمكن أثناء الجلوس والقيام (Labanca 2018).",
        "Neuromuscular stimulation (NMES) of the quadriceps with the Delaware settings: a 2500 Hz carrier at 75 bursts per second, a two-second ramp, 12 seconds on and 50 off, at the strongest tolerated contraction (at least 50% of maximal voluntary contraction), ten contractions with the knee fixed at 60° (45–60° for a patellar-tendon graft, whichever is comfortable), the electrodes over the upper outer and lower inner thigh, away from the arthroscopy portal until it heals (Adams 2012); if the unit cannot produce the carrier: 50 Hz or more, biphasic, 250–300 µs, large electrodes and an on-to-off ratio of 1:2–3 (Conley 2021); it can be applied during sit-to-stand (Labanca 2018)."],
      note: ["أساسيٌّ في الأسابيع الثمانية الأولى — «يُستعمل ستّةَ أسابيع إلى ثمانية» A (Logerstedt 2017)، والهولنديُّ المستوى الأوّل (van Melick 2016)، والقطريُّ في المرحلة المبكّرة جداً (Kotsifaki 2023)؛ زاد قوّةَ الفخذ في الأسابيع ٤–١٢ (Hauger 2018)، وبلغ التحفيزُ القويّ ٧٠٪ فأكثر من الجهة الأخرى في الأسبوع الرابع مقابل ٥١–٥٧٪ (Snyder-Mackler 1995). يومياً في الكتلة الأولى، و٣–٦ مرّاتٍ في الأسبوع في الثانية، ويتوقّف حين تبلغ القوّةُ ٨٠٪ أو في الأسبوع الثامن أيّهما أبعد (اقتراح)؛ وتُكتب الشدّةُ بالملّي أمبير. والتحفيزُ للألم (TENS) قليلُ القيمة — لم يُضف شيئاً إلى التمرين في ٧٠ رياضيّاً (Forogh 2019). ممنوعٌ مع منظّم ضربات القلب، وعلى جرحٍ لم يلتئم، ومع الشكّ في جلطة.",
        "Core in the first eight weeks — 'should be used for 6 to 8 weeks' A (Logerstedt 2017), level 1 in the Dutch guideline (van Melick 2016), and in the very early phase in the Qatari guideline (Kotsifaki 2023); it added quadriceps strength at weeks 4–12 (Hauger 2018), and high-intensity stimulation reached 70% or more of the other side at week 4 versus 51–57% (Snyder-Mackler 1995). Daily in block 1, 3–6 times a week in block 2, and stopped when strength reaches 80% or at week 8, whichever is later (a suggestion); the intensity is recorded in milliamps. Stimulation for pain (TENS) is of little value — it added nothing to exercise in 70 athletes (Forogh 2019). Contraindicated with a pacemaker, over an unhealed wound, and with a suspected thrombosis."] },
    { code: "compression", centreUse: "adjunct", evidence: "recommended", minutes: 15,
      params: { pressureMmhg: "Device default (trial pressures not reported)", cycleS: "Device default intermittent cycle", durationMin: "15–20, leg elevated, after exercise" },
      parameters: ["تبريدٌ مع ضغطٍ متقطّع والساقُ مرفوعة ١٥–٢٠ دقيقة آخرَ الجلسة — في الأسبوعين الأوّلين، وبعدها حين يكون التورّمُ ١+ فأكثر أو الألمُ فوق ٣ بعد التحميل؛ والضغطُ والدورةُ من برنامج الجهاز (لم تُذكر في ملخّصات التجارب)؛ وفي البيت ١٥ دقيقة كلَّ ساعة في اليوم الأوّل ثمّ ٣٠ دقيقة ثلاثَ مرّاتٍ يومياً (Wright 2015).",
        "Cold with intermittent compression and the leg elevated for 15–20 minutes at the end of the session — in the first two weeks, and after that when swelling is 1+ or more or pain is above 3 after loading; pressure and cycle from the device's programme (not reported in the trial abstracts); at home 15 minutes every hour on the first day, then 30 minutes three times a day (Wright 2015)."],
      note: ["مساعدٌ بالتناوب له أساس — التبريدُ بعد العملية مباشرةً B (Logerstedt 2017)، و«التبريدُ مع الضغط إن توفّر قد يكون أنفعَ من التبريد وحده» (Kotsifaki 2023)؛ قلّل الألمَ ولم يغيّر التصريفَ ولا المدى (Raynor 2005)، والتبريدُ مع الضغط أسبوعين قلّل التورّمَ والألمَ والمسكّنات (Schröder 1994 · Waterman 2012). لا يُعطى بدل التمرين. ممنوعٌ مع الشكّ في جلطة — يُحال ولا يُضغط — ومع قصور الشرايين وحساسية البرد والجرح المفتوح تحت الكمّ.",
        "Rotating adjunct with a basis — cryotherapy immediately after surgery B (Logerstedt 2017), and 'compressive cryotherapy, if available, might be more effective than cryotherapy alone' (Kotsifaki 2023); it reduced pain without changing drainage or range (Raynor 2005), and two weeks of cryo-compression reduced swelling, pain and analgesic use (Schröder 1994 · Waterman 2012). Never instead of exercise. Contraindicated with a suspected thrombosis — refer, do not compress — and with arterial insufficiency, cold sensitivity and an open wound under the sleeve."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الركبة قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز، وإعداداتُه يكتبها المشرفُ من الجهاز.",
        "Pulsed electromagnetic field (PEMF) over the knee before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والتجربةُ الإيجابية بجهازٍ منزليّ ١٫٥ ملّي تسلا و٧٥ هرتز أربعَ ساعاتٍ يومياً ستّين يوماً، فأسرع التعافي المبكّر بلا فرقٍ بعد سنتين (Benazzo 2008)، وبجرعة العيادة — ٣ ملّي تسلا و١٠ هرتز ٣٠ دقيقة يومياً أحدَ عشرَ يوماً — لا أثر (Ogrodzka 2021): فجلسةُ المركز لا تعيد الجرعةَ الإيجابية. ممنوعٌ مع منظّم ضربات القلب والأجهزة المزروعة والحمل.",
        "Rotating adjunct by the centre's rule (Saleem) — the positive trial used a home device at 1.5 mT and 75 Hz for four hours a day for sixty days, which sped early recovery with no difference at two years (Benazzo 2008), and at a clinic dose — 3 mT and 10 Hz for 30 minutes a day for eleven days — it had no effect (Ogrodzka 2021): so a centre session does not reproduce the positive dose. Contraindicated with a pacemaker, implanted devices and pregnancy."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["على الفخذ والركبة قبل تمارين المدى لركبةٍ متيبّسة باردة بلا تورّم — بعد الأسبوع السادس وحده؛ ويُفحص الإحساسُ أوّلاً (الخدرُ تحت الركبة بعد طُعم خلف الفخذ).",
        "Over the thigh and knee before range-of-motion work for a stiff, cool knee without swelling — after week 6 only; sensation is tested first (numbness below the knee after a hamstring graft)."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: لا تجربةَ للحرارة بعد الرباط (بحثٌ صفريّ)، والركبةُ المُعالَجة تبقى أدفأَ من الأخرى سنواتٍ بعد العملية (De Marziani 2024) فلا تضيف الحرارةُ شيئاً لمفصلٍ ملتهب. لا تُعطى وحدها، ولا على تورّم ولا جلدٍ ضعيف الإحساس ولا جرح.",
        "Rotating adjunct — for comfort before exercise: there is no trial of heat after ACL reconstruction (a documented zero result), and the operated knee stays warmer than the other for years after surgery (De Marziani 2024), so heat adds nothing to an inflamed joint. Never given alone, nor on swelling, poorly sensate skin or a wound."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها: بعد الأسبوع السادس، على ركبةٍ متيبّسة بلا تورّم، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: after week 6, on a stiff knee without swelling, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: لا تجربةَ علاجية بعد الرباط، والأشعّةُ تحت الحمراء فيه أداةُ قياسٍ لا علاج (بحثٌ صفريّ). لا تُعطى وحدها ولا على ركبةٍ متورّمة.", "Rotating adjunct — comfortable warmth only: there is no treatment trial after ACL reconstruction, where infrared is a measuring tool rather than a treatment (a documented zero result). Never given alone or on a swollen knee."] },
    { code: "tecar", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ بعد الرباط (بحثٌ صفريّ)، ومساميرُ تثبيت الطُّعم وأزرارُه المعدنية في عظمَي الفخذ والساق في مجاله تمنع التسخينَ العميق، والتورّمُ الحديث كذلك؛ فقاعدةُ المركز في التيكار لا تنطبق هنا إلّا إن قرّر سليمٌ غيرَها بلا معدن.",
        "Not used — there is no trial after ACL reconstruction (a documented zero result), and the graft's metal screws and buttons in the femur and tibia lie in its field and forbid deep heating, as does recent swelling; so the centre's Tecar rule does not apply here unless Saleem decides otherwise for a metal-free fixation."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ بالوهميّ على ٧٢ مريضاً: موجاتٌ شعاعية من اليوم الثاني بعد العملية، ٢٥٠٠ نبضة بـ٦–٨ هرتز و٠٫٢٩٨ ملّي جول/مم² (تُخفَّض إلى ٠٫٠٨–٠٫٢٨ و١٢٠٠–١٥٠٠ نبضة إن لم يتحمّل)، أسبوعياً ستَّ مرّات حول الرضفة وفوقها بعيداً عن مكان العملية — فتحسّنت النتائجُ في الأسبوعين الثالث والسادس بلا فرقٍ في الأسبوع الرابع والعشرين (Song 2024)؛ وفي المراجعة التحسّنُ دون الفرق المهمّ (Shin 2025 · Salimi 2025). وإن جعله سليمٌ مساعداً: بإعدادات التجربة بعيداً عن الجروح والمسامير، ويُمنع مع الالتهاب والورم الدمويّ ومميّعات الدم.",
        "Not used until Saleem decides — one sham-controlled trial of 72 patients: radial waves from post-operative day 2, 2500 impulses at 6–8 Hz and 0.298 mJ/mm² (reduced to 0.08–0.28 and 1200–1500 impulses if not tolerated), weekly six times around and above the kneecap away from the operation site — outcomes improved at weeks 3 and 6 with no difference at week 24 (Song 2024); in the reviews the gains were below the important change (Shin 2025 · Salimi 2025). If Saleem makes it an adjunct: the trial's settings, away from wounds and screws, and contraindicated with infection, haematoma and anticoagulants."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ على الإنسان بعد الرباط (بحثٌ صفريّ)، وما وُجد تجاربُ على الفئران.", "Not used — there is no human trial after ACL reconstruction (a documented zero result); what exists are rat studies."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ على الإنسان بعد الرباط (بحثٌ صفريّ)، وفي مراجعة تثبيط العضلة دليلُه منخفضٌ جداً (Sonnery-Cottet 2019).", "Not used — there is no human trial after ACL reconstruction (a documented zero result), and in the muscle-inhibition review its evidence is very low (Sonnery-Cottet 2019)."] },
    { code: "needle", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — «لا نوصي بالوخز بالإبر الجافّة للعضلة الإنسية في المرحلة المبكّرة جداً لخطر النزف» (١٤٪ — Kotsifaki 2023)، والتجربةُ الوحيدة جلسةٌ واحدة زادت الألمَ في الساعة الأولى (Velázquez-Saornil 2017)؛ والوخزُ الكهربائيّ الصينيّ تجربةٌ واحدة (Ding 2020). وإن قرّر سليم: لا قبل الأسبوع السادس، ولتثبيط عضلةٍ مستمرّ، بعد السؤال عن المميّعات.",
        "Not used — 'We do not recommend vastus medialis trigger point dry needling in the very early rehabilitation phase due to increased risk of haemorrhage' (14% — Kotsifaki 2023), and the only trial was a single session that increased pain in the first hour (Velázquez-Saornil 2017); Chinese electro-acupuncture is one trial (Ding 2020). If Saleem decides: not before week 6, for persistent muscle inhibition, after asking about anticoagulants."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — «نوصي بعدم استعماله» (Kotsifaki 2023): لا فائدةَ على الحركة النشطة في المدى ولا الألم ولا التورّم (D'Amore 2021)، وقلّل المسكّنَ ثلاثةَ أيّامٍ وحدها (McCarthy 1993)؛ والجوسبت يجيزه لألم الأيّام الأولى C (Logerstedt 2017)؛ وبعد إصلاح الغضروف المفصليّ إن طلبه الجرّاح يُتّبع.",
        "Not used — 'We recommend against using it' (Kotsifaki 2023): no benefit over active motion for range, pain or swelling (D'Amore 2021), and it reduced analgesic use for three days only (McCarthy 1993); JOSPT allows it for early pain C (Logerstedt 2017); after a cartilage repair, if the surgeon asks for it, it is followed."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا سببَ للركبة بعد الرباط (بحثٌ صفريّ).", "Not used — no trial and no rationale for the knee after ACL reconstruction (a documented zero result)."] },
    { code: "wax", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — للكفّ والقدم، ولا تجربة (بحثٌ صفريّ).", "Not used — for the hand and foot, and there is no trial (a documented zero result)."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — يمشي المريضُ وحده خلال أسبوعٍ أو اثنين، وما وُجد دراستان صينيتان صغيرتان بلا توزيعٍ عشوائيّ سليم (Wen 2025 · Feng 2026).", "Not used — the patient walks independently within one or two weeks, and what exists are two small Chinese studies without sound randomisation (Wen 2025 · Feng 2026)."] },
  ],
  phases: [
    {
      name: ["حماية الطُّعم واستعادة المدّ الكامل وتنشيط الفخذ", "Protecting the graft, restoring full extension and activating the quadriceps"],
      sessionFrom: 1, sessionTo: 24,
      timeframe: ["الكتلةُ الأولى — الأسابيعُ ١–٤ بعد العملية، يومياً", "Block 1 — weeks 1–4 after surgery, daily"],
      goals: [
        "نقصُ المدّ ٢° أو أقلّ عن الركبة الأخرى؛ والثنيُ ١١٠° فأكثر؛ والتورّمُ ١+ أو أقلّ؛ ورفعُ الساق عشرين مرّة بلا تأخّرٍ في المدّ (أو تأخّرٌ ٥° أو أقلّ)؛ ومشيةٌ طبيعية بلا عكّاز ودرجٌ بالتناوب؛ وفهمُ قاعدة التورّم والوجع وعلامات الإحالة.",
        "An extension deficit of 2° or less compared with the other knee; flexion of 110° or more; swelling of 1+ or less; twenty straight-leg raises without an extensor lag (or a lag of 5° or less); normal gait without a crutch and reciprocal stairs; and understanding of the swelling-and-soreness rule and the referral signs.",
      ],
      education: [
        "• المدُّ الكامل أوّلُ الأهداف: نقصُ ٣–٥° يضرّ بعد سنوات (Shelbourne & Gray 2009)، والأسابيعُ الستّة الأولى تقرّره (Delaloye 2020) — فالانبطاحُ وإسنادُ الكعب عدّةَ مرّاتٍ في اليوم.\n" +
        "• التورّمُ يقرّر سرعةَ التقدّم: الصباحُ التالي هو الحَكَم، والتبريدُ ورفعُ الساق في البيت.\n" +
        "• الحِملُ بقدر ما يتحمّل مسموح من اليوم الأوّل، والعكّازان حتى تصير المشيةُ طبيعية بمدٍّ كامل (van Melick 2016)، وتحريكُ الرضفة ٣٠–٥٠ مرّة في اليوم.\n" +
        "• علاماتُ العودة فوراً: حمّى أو إفرازُ الجرح أو ركبةٌ حارّةٌ مشدودة، وألمُ الساق وتورّمُها أو ضيقُ النفَس، والعجزُ المفاجئ عن رفع الساق.\n" +
        "• الصلاة: القيامُ والركوعُ واقفاً، والسجودُ والتشهّدُ على الكرسيّ في هذه المرحلة.",
        "• Full extension is the first goal: a 3–5° loss harms the result years later (Shelbourne & Gray 2009), and the first six weeks decide it (Delaloye 2020) — so the prone hang and heel prop several times a day.\n" +
        "• Swelling decides the pace: the next morning is the judge, with cold and elevation at home.\n" +
        "• Weight bearing as tolerated is allowed from day one, with two crutches until gait is normal with full extension (van Melick 2016), and patellar mobilisation 30–50 times a day.\n" +
        "• Signs to come back at once: fever, wound discharge or a hot, tense knee; calf pain and swelling or breathlessness; and a sudden inability to lift the leg.\n" +
        "• Prayer: standing and bowing upright, with prostration and tashahhud on the chair in this phase.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• نقصُ المدّ ٢° أو أقلّ عن الركبة الأخرى بما فيه فرطُ المدّ — بالمنقلة بالفاحص نفسِه (Watkins 1991).\n" +
        "• الثنيُ ١١٠° فأكثر (Wright 2015 · Adams 2012).\n" +
        "• التورّمُ ١+ أو أقلّ في اختبار المسح ولا يزيد بعد الجلسات (Sturgill 2009).\n" +
        "• رفعُ الساق مستقيمةً عشرين مرّة بلا تأخّر، أو تأخّرٌ ٥° أو أقلّ (Wright 2015).\n" +
        "• مشيةٌ طبيعية بلا عكّاز ودرجٌ بالتناوب.\n" +
        "(اقتراحٌ يجمع معاييرَ ديلاوير ودليل MOON، لا معيارٌ مجرَّب.) ونقصُ مدٍّ ٥° فأكثر في الأسبوع الثالث ⟵ برنامجُ المدّ يومياً ومراجعةٌ في السادس.",
        "Progress to phase 2 when all are met:\n" +
        "• An extension deficit of 2° or less compared with the other knee, including hyperextension — with a goniometer by the same examiner (Watkins 1991).\n" +
        "• Flexion of 110° or more (Wright 2015 · Adams 2012).\n" +
        "• Swelling of 1+ or less on the stroke test and not rising after sessions (Sturgill 2009).\n" +
        "• Twenty straight-leg raises without a lag, or a lag of 5° or less (Wright 2015).\n" +
        "• Normal gait without a crutch, and reciprocal stairs.\n" +
        "(A proposal combining the Delaware and MOON criteria, not a tested criterion.) An extension deficit of 5° or more at week 3 → the daily extension programme and a review at week 6.",
      ],
      notes: [
        "• المدُّ أوّلاً في كلّ جلسة: الانبطاحُ وتدلّي الساق وإسنادُ الكعب وتحريكُ الرضفة، ومعالجةُ تشنّج خلف الفخذ والتورّم (Sonnery-Cottet 2019).\n" +
        "• التحفيزُ العضليّ للفخذ يومياً بإعدادات ديلاوير أثناء شدّ الفخذ (في «الأجهزة» — Adams 2012).\n" +
        "• الدراجةُ للمدى: هزّاً ثمّ دوراتٍ كاملة حين يبلغ الثنيُ نحو ١٠٠–١١٠°، والمقعدُ عالٍ أوّلاً.\n" +
        "• السلسلةُ المغلقة من الأسبوع الثاني: القرفصاءُ على الحائط ٠–٤٥°، وصعودُ الدرجة المنخفضة بلا ألم، والجلوسُ والقيام (van Melick 2016).\n" +
        "• وترُ خلف الفخذ: الجسرُ بالساقين ثابتاً وحده، ولا ثنيَ للركبة ضدّ مقاومة حتى الأسبوع ١٢ (Adams 2012).\n" +
        "• خياطةُ الغضروف: لا قرفصاءَ ولا ثنيَ حاملاً للوزن فوق ٤٥° أربعةَ أسابيع، أو بحدود الجرّاح.\n" +
        "• الجرحُ وعلاماتُ الالتهاب والجلطة في كلّ جلسة؛ والتبريدُ مع الضغط آخرَ الجلسة.",
        "• Extension first at every session: the prone hang, heel prop and patellar mobilisation, with treatment of hamstring spasm and swelling (Sonnery-Cottet 2019).\n" +
        "• Neuromuscular stimulation of the quadriceps daily with the Delaware settings during quadriceps setting (under 'Devices' — Adams 2012).\n" +
        "• The bike for range: rocking, then full revolutions once flexion reaches about 100–110°, with a high saddle at first.\n" +
        "• Closed-chain work from week 2: the wall squat at 0–45°, pain-free low step-ups, and sit-to-stand (van Melick 2016).\n" +
        "• Hamstring graft: the double-leg static bridge only, and no resisted knee bending until week 12 (Adams 2012).\n" +
        "• Meniscal repair: no squatting and no weight-bearing flexion beyond 45° for four weeks, or the surgeon's limits.\n" +
        "• The wound and the signs of infection and thrombosis at every session; cold with compression at the end of the session.",
      ],
      exercises: [
        { code: "prone-hang-extension", sets: 1, hold: 600 },
        { code: "heel-prop", sets: 2, hold: 300,
          note: ["بالتناوب مع الانبطاح، والكعبُ على منشفةٍ والركبةُ بلا سند؛ وثقلٌ على الفخذ إن بقي النقص.", "Alternating with the prone hang, the heel on a towel and the knee unsupported; a weight on the thigh if the deficit remains."] },
        { code: "patellar-self-mobilisation", sets: 1, reps: 30,
          note: ["٣٠–٥٠ مرّة في اليوم، في الاتّجاهات الأربعة (Adams 2012).", "30–50 times a day, in all four directions (Adams 2012)."] },
        { code: "quad-set", sets: 3, reps: 10, hold: 5,
          note: ["مع دفع الرضفة إلى الأعلى، ومع التحفيز العضليّ؛ ثلاثَ مرّاتٍ في اليوم (Adams 2012).", "With an upward glide of the kneecap and with stimulation; three times a day (Adams 2012)."] },
        { code: "straight-leg-raise", sets: 3, reps: 10,
          note: ["المعيار: عشرون بلا تأخّرٍ في المدّ (Wright 2015)؛ وإن انثنت الركبةُ وهي ترتفع يعود إلى شدّ الفخذ مع التحفيز.", "The criterion: twenty without an extensor lag (Wright 2015); if the knee bends as it rises, back to quadriceps setting with stimulation."] },
        { code: "heel-slide", sets: 2, reps: 10, hold: 3,
          note: ["الهدفُ ٩٠° في الأسبوع الأوّل وأكثرُ من ١١٠° في الثاني (Adams 2012) — وبعد خياطة الغضروف بحدود الجرّاح.", "The target is 90° in week 1 and more than 110° in week 2 (Adams 2012) — after a meniscal repair, within the surgeon's limits."] },
        { code: "seated-knee-flexion-slide", sets: 2, reps: 10, hold: 5 },
        { code: "ankle-pumps", sets: 1, reps: 20,
          note: ["في الأيّام الأولى، مع شرح علامات الجلطة.", "In the first days, with the signs of thrombosis explained."] },
        { code: "cold-elevation",
          note: ["آخرَ الجلسة وفي البيت: ١٥ دقيقة كلَّ ساعة في اليوم الأوّل ثمّ ٣٠ دقيقة ثلاثَ مرّاتٍ يومياً (Wright 2015).", "At the end of the session and at home: 15 minutes every hour on the first day, then 30 minutes three times a day (Wright 2015)."] },
        { code: "walking-aid-gait",
          note: ["الحِملُ بقدر ما يتحمّل من اليوم الأوّل بالعكّازين، والتركُ مع مشيةٍ طبيعية بمدٍّ كامل ودرجٍ بالتناوب (van Melick 2016 · Wright 2015).", "Weight bearing as tolerated from day one with two crutches, discarded with normal gait, full extension and reciprocal stairs (van Melick 2016 · Wright 2015)."] },
        { code: "stationary-cycling",
          doseNote: ["هزّاً للمدى أوّلاً بلا مقاومة والمقعدُ عالٍ، ثمّ دوراتٌ كاملة حين يبلغ الثنيُ ١٠٠–١١٠°، ٥–١٠ دقائق إحماء.", "Rocking for range first without resistance and with a high saddle, then full revolutions once flexion reaches 100–110°, 5–10 minutes of warm-up."] },
        { code: "terminal-knee-extension", sets: 3, reps: 15, hold: 2,
          note: ["لتنشيط الفخذ المثبَّط في السلسلة المغلقة (Sonnery-Cottet 2019).", "To activate an inhibited quadriceps in the closed chain (Sonnery-Cottet 2019)."] },
        { code: "wall-squat", sets: 3, reps: 10,
          note: ["من الأسبوع الثاني في ٠–٤٥° بلا ألم (van Melick 2016) — وبعد خياطة الغضروف لا قبل إذن الجرّاح.", "From week 2 in 0–45° without pain (van Melick 2016) — after a meniscal repair not before the surgeon allows it."] },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["ويمكن مع التحفيز العضليّ أثناءه (Labanca 2018).", "It can be done with stimulation during it (Labanca 2018)."] },
        { code: "step-up", sets: 2, reps: 10,
          note: ["من الأسبوع الثاني على درجةٍ منخفضة بمدىً لا يؤلم (Adams 2012).", "From week 2 on a low step through a pain-free range (Adams 2012)."] },
        { code: "glute-bridge", sets: 3, reps: 10, hold: 3,
          note: ["بالساقين؛ ولطُعم خلف الفخذ ثابتاً وحده حتى الأسبوع ١٢.", "On both legs; for a hamstring graft, static only until week 12."] },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10 },
        { code: "calf-raise", sets: 3, reps: 15 },
        { code: "single-leg-balance", sets: 3, hold: 30,
          note: ["على الساقين ثمّ على الساق المُعالَجة حين يمشي بلا عكّاز.", "On both legs, then on the treated leg once walking without a crutch."] },
        { code: "stairs-after-knee-surgery",
          note: ["معيارُ المرحلة: الدرجُ بالتناوب بلا عكّاز.", "The phase criterion: reciprocal stairs without a crutch."] },
        { code: "prayer-kneeling-after-acl",
          note: ["الخطوة ١ للجميع: القيامُ والركوعُ واقفاً، والسجودُ والتشهّدُ على الكرسيّ.", "Step 1 for everyone: standing and bowing upright, with prostration and tashahhud on the chair."] },
      ],
    },
    {
      name: ["القوّة والتحكّم العصبيّ العضليّ", "Strength and neuromuscular control"],
      sessionFrom: 25, sessionTo: 48,
      timeframe: ["الكتلةُ الثانية — الأسابيعُ ٥–١٢ (ستٌّ في الأسبوع أربعةَ أسابيع، أو ثلاثٌ ثمانية)", "Block 2 — weeks 5–12 (six a week for four weeks, or three for eight)"],
      goals: [
        "المدى كاملاً (الثنيُ ٩٥٪ من الركبة الأخرى والمدُّ مساوٍ)؛ والتورّمُ أثرٌ أو أقلّ؛ وقوّةُ الفخذ ٨٠٪ من الجهة الأخرى؛ والقرفصاءُ على ساقٍ حتى ٦٠° بلا ميلٍ للركبة إلى الداخل؛ والنزولُ عن درجةٍ بارتفاع ٢٠ سم بتحكّم؛ وقضاءُ اثني عشرَ أسبوعاً بعد العملية قبل الجري.",
        "Full range (flexion 95% of the other knee and extension equal); swelling of trace or less; quadriceps strength 80% of the other side; a single-leg squat to 60° without the knee drifting inwards; a controlled step-down from a 20 cm step; and twelve weeks since surgery before running.",
      ],
      education: [
        "• القوّةُ الثقيلةُ يوماً بعد يوم وبينها ٤٨ ساعة، وقاعدةُ «زائد اثنين» ترفع الثقل (Eitzen 2010)؛ والأيّامُ بينها للتوازن والدراجة.\n" +
        "• قواعدُ الطُّعم في مدّ الركبة جالساً وثني الركبة — وتجاوزُها لا يُسرّع بل يرخي الطُّعم (Heijne 2007).\n" +
        "• الجريُ ليس قبل الأسبوع الثاني عشر ومعاييره، ولو شعر أنّ الركبة جيّدة — فنضجُ الطُّعم يستمرّ (Claes 2011).\n" +
        "• الصلاة: السجودُ على وسادةٍ سميكة حين يبلغ الثنيُ ١٢٠° والتورّمُ أثر.\n" +
        "• البرنامجُ المنزليّ أو النادي بين الكتلتين الثانية والثالثة، ومراجعةٌ كلَّ أربعة أسابيع.",
        "• Heavy strength every other day with 48 hours between, and the 'plus-two' rule raises the load (Eitzen 2010); the days between are for balance and cycling.\n" +
        "• The graft rules for seated knee extension and knee bending — breaking them does not speed things up but loosens the graft (Heijne 2007).\n" +
        "• No running before week 12 and its criteria, even if the knee feels good — graft maturation continues (Claes 2011).\n" +
        "• Prayer: prostration on a thick cushion once flexion reaches 120° and swelling is trace.\n" +
        "• The home or gym programme between blocks 2 and 3, with a review every four weeks.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ (الجري) حين تتحقّق كلُّها:\n" +
        "• المدُّ مساوٍ للركبة الأخرى والثنيُ ٩٥٪ منها (Kotsifaki 2023).\n" +
        "• التورّمُ أثرٌ أو أقلّ (Adams 2012).\n" +
        "• قوّةُ الفخذ ٨٠٪ من الجهة الأخرى بمقياس اليد مثبَّتاً بحزام في ٦٠–٩٠° بالفاحص نفسِه — ولأنّه يبالغ يُقرأ بحذر (Almeida 2019 · Sinacore 2017).\n" +
        "• القرفصاءُ على ساقٍ حتى ٦٠° بلا ميلٍ للركبة إلى الداخل، ومشيةٌ طبيعية.\n" +
        "• عشرُ قفزاتٍ صغيرة على الساق المُعالَجة بلا ألم ولا تورّمٍ في اليوم التالي (Kotsifaki 2023).\n" +
        "• اثنا عشرَ أسبوعاً على الأقلّ بعد العملية (Rambaud 2018) — وبعد خياطة الغضروف لا قفزَ قبل السادس عشر.\n" +
        "(اقتراحٌ يجمع معاييرَ الجري في الدليل القطريّ وديلاوير بأدوات المركز.)",
        "Progress to phase 3 (running) when all are met:\n" +
        "• Extension equal to the other knee and flexion 95% of it (Kotsifaki 2023).\n" +
        "• Swelling of trace or less (Adams 2012).\n" +
        "• Quadriceps strength 80% of the other side on a belt-fixed handheld dynamometer at 60–90° by the same examiner — read with caution because it overestimates (Almeida 2019 · Sinacore 2017).\n" +
        "• A single-leg squat to 60° without the knee drifting inwards, and normal gait.\n" +
        "• Ten small hops on the treated leg with no pain and no swelling the next day (Kotsifaki 2023).\n" +
        "• At least twelve weeks since surgery (Rambaud 2018) — and after a meniscal repair no hopping before week 16.\n" +
        "(A proposal combining the Qatari and Delaware running criteria with the centre's tools.)",
      ],
      notes: [
        "• مدُّ الركبة جالساً بجدول الطُّعم: ٩٠–٤٥° في الأسبوع الرابع حتى المدى كاملاً في الثامن، ووترُ خلف الفخذ بلا ثقلٍ حتى الثاني عشر (van Melick 2016).\n" +
        "• ضغطُ الساقين ٠–٤٥° من الأسبوع الثالث لطُعم خلف الفخذ ثمّ أعمق (Kotsifaki 2023)، والقوّةُ الثقيلة ٣–٤ × ٦–٨ بقاعدة «زائد اثنين» (Eitzen 2010).\n" +
        "• ثنيُ الركبة واقفاً: لوتر الرضفة ووتر الفخذ في هذه المرحلة، ولوتر خلف الفخذ بلا ثقلٍ من الأسبوع الثاني عشر (Adams 2012).\n" +
        "• التوازنُ والاضطرابُ والوركُ والجذع في الأيّام بين أيّام القوّة — والتمرينُ العصبيّ العضليّ مع القوّة أفضل (Risberg 2007).\n" +
        "• التحفيزُ العضليّ حتى تبلغ القوّةُ ٨٠٪ أو الأسبوع الثامن.\n" +
        "• ألمُ مقدّم الركبة لطُعم وتر الرضفة: مدىً أو حِملٌ أقلّ، والشريطُ اللاصق للرضفة يمكن (Adams 2012).\n" +
        "• خياطةُ الغضروف: الثنيُ حاملاً للوزن أقلَّ من ٩٠° حتى الأسبوع الثامن (Adams 2012)، والقرفصاءُ ≤٣٠° في الأسابيع ٤–٨ و≤٤٥° في ٨–١٢ (Pujol 2025)، أو بحدود الجرّاح.",
        "• Seated knee extension by the graft schedule: 90–45° at week 4 to the full range at week 8, with a hamstring graft unloaded until week 12 (van Melick 2016).\n" +
        "• The leg press at 0–45° from week 3 for a hamstring graft, then deeper (Kotsifaki 2023), with heavy strength at 3–4 × 6–8 by the 'plus-two' rule (Eitzen 2010).\n" +
        "• The standing knee curl: in this phase for patellar- and quadriceps-tendon grafts, and for a hamstring graft unloaded from week 12 (Adams 2012).\n" +
        "• Balance, perturbation, hip and trunk on the days between strength days — neuromuscular training with strength is better (Risberg 2007).\n" +
        "• Stimulation until strength reaches 80% or week 8.\n" +
        "• Anterior knee pain with a patellar-tendon graft: less range or load, and patellar taping can be used (Adams 2012).\n" +
        "• Meniscal repair: weight-bearing flexion below 90° until week 8 (Adams 2012), and squats ≤30° in weeks 4–8 and ≤45° in weeks 8–12 (Pujol 2025), or the surgeon's limits.",
      ],
      exercises: [
        { code: "acl-open-chain-knee-extension", sets: 3, reps: 10, rest: 60 },
        { code: "leg-press-progressive", sets: 3, reps: 10, rest: 90,
          note: ["٠–٤٥° أوّلاً ثمّ ٠–٦٠° ثمّ ٠–٩٠° في الأسابيع ٦–٨، ثمّ ٣–٤ × ٦–٨ بأقصى جهد بقاعدة «زائد اثنين» (Kotsifaki 2023 · Eitzen 2010).", "0–45° first, then 0–60°, then 0–90° in weeks 6–8, then 3–4 × 6–8 at maximal effort by the 'plus-two' rule (Kotsifaki 2023 · Eitzen 2010)."] },
        { code: "wall-squat", sets: 3, reps: 10,
          note: ["أعمقُ بالتدرّج، والركبةُ فوق الأصابع.", "Gradually deeper, with the knee over the toes."] },
        { code: "split-squat", sets: 3, reps: 10 },
        { code: "step-up", sets: 3, reps: 10 },
        { code: "lateral-step-down", sets: 3, reps: 10,
          note: ["الهدف: النزولُ عن درجة ٢٠ سم بتحكّم (Wright 2015).", "The goal: a controlled step-down from a 20 cm step (Wright 2015)."] },
        { code: "single-leg-squat-to-box", sets: 3, reps: 8,
          note: ["معيارُ المرحلة: حتى ٦٠° بلا ميلٍ للركبة إلى الداخل.", "The phase criterion: to 60° without the knee drifting inwards."] },
        { code: "standing-hamstring-curl", sets: 3, reps: 12, rest: 60,
          note: ["لوتر الرضفة ووتر الفخذ هنا؛ ولوتر خلف الفخذ بلا ثقلٍ من الأسبوع الثاني عشر (Adams 2012).", "Here for patellar- and quadriceps-tendon grafts; for a hamstring graft unloaded from week 12 (Adams 2012)."] },
        { code: "glute-bridge", sets: 3, reps: 12, hold: 3 },
        { code: "standing-band-hip-abduction-er", sets: 3, reps: 12 },
        { code: "side-plank", sets: 3, hold: 20 },
        { code: "front-plank", sets: 3, hold: 30 },
        { code: "calf-raise", sets: 3, reps: 15 },
        { code: "single-leg-balance", sets: 3, hold: 30,
          note: ["بعينين مغمضتين ثمّ على سطحٍ ليّن ثمّ مع اضطرابٍ من الأخصائيّ.", "With the eyes closed, then on a soft surface, then with perturbation from the therapist."] },
        { code: "knee-stability-band-loop", sets: 3, reps: 10 },
        { code: "star-excursion-reach", sets: 3, reps: 5,
          note: ["والوصولُ الأماميّ يُقاس في الأسبوع الثاني عشر: فرقٌ أكثرُ من ٤ سم ينبئ بقفزٍ أقلّ من ٩٠٪ عند العودة (Garrison 2015).", "The anterior reach is measured at week 12: a difference of more than 4 cm predicts hopping below 90% at the return (Garrison 2015)."] },
        { code: "side-stepping", sets: 3, reps: 10,
          note: ["بمطّاطٍ حول الركبتين.", "With a band around the knees."] },
        { code: "reactive-stepping-practice", sets: 3, reps: 8,
          note: ["عنصرُ اضطراب: دفعاتٌ خفيفة من الأخصائيّ وهو واقفٌ على الساق المُعالَجة.", "A perturbation element: light pushes from the therapist while standing on the treated leg."] },
        { code: "stationary-cycling",
          doseNote: ["١٠–٢٠ دقيقة بجهدٍ متوسّط إلى عالٍ في الأيّام بين أيّام القوّة.", "10–20 minutes at moderate to high effort on the days between strength days."] },
        { code: "prone-hang-extension", sets: 1, hold: 600,
          note: ["لمن بقي عنده نقصُ مدّ — يومياً، ونقصٌ ٥° في الأسبوع السادس يُحال.", "For a remaining extension deficit — daily, and a 5° deficit at week 6 is referred."] },
        { code: "knee-flexion-step-stretch", sets: 2, reps: 10, hold: 10,
          note: ["لمن تأخّر ثنيُه — وبعد خياطة الغضروف لا فوق ٩٠° حاملاً للوزن قبل الأسبوع الثامن.", "For lagging flexion — after a meniscal repair not beyond 90° weight-bearing before week 8."] },
        { code: "patellar-taping-mcconnell",
          note: ["لألم مقدّم الركبة مع طُعم وتر الرضفة إن خفّفه أثناء التمرين (Adams 2012).", "For anterior knee pain with a patellar-tendon graft if it eases the pain during exercise (Adams 2012)."] },
        { code: "prayer-kneeling-after-acl",
          note: ["الخطوة ٢: السجودُ على وسادةٍ سميكة بثنيٍ ١٢٠° وتورّمٍ أثر وألمٍ ٣ أو أقلّ — وبعد خياطة الغضروف الكرسيُّ أربعةَ أشهر.", "Step 2: prostration on a thick cushion at 120° of flexion, trace swelling and pain of 3 or less — after a meniscal repair, the chair for four months."] },
        { code: "kneeling-floor-transfer",
          note: ["حين يُسمح بالركوع: نصفُ ركوعٍ على الركبة السليمة أوّلاً.", "Once kneeling is allowed: half-kneeling on the good knee first."] },
      ],
    },
    {
      name: ["الجري والقفز وتغيير الاتّجاه", "Running, hopping and changing direction"],
      sessionFrom: 49, sessionTo: 72,
      timeframe: ["الكتلةُ الثالثة — من الأسبوع ١٢ بمعايير الجري (حتى الشهر السادس تقريباً)", "Block 3 — from week 12 with the running criteria (to about month 6)"],
      goals: [
        "الجريُ المتّصل ٤٫٨ كم ثمّ التناوبُ بين الجري والهرولة بلا ألمٍ ولا تورّم؛ والقفزُ على ساقٍ واحدة في الاتّجاهات بهبوطٍ ليّن والركبةُ فوق القدم؛ وتغييرُ الاتّجاه المخطَّط بالسرعة الكاملة؛ وقوّةُ الفخذ ٩٠٪ واختباراتُ القفز الأربعة ٩٠٪؛ ومقياسُ الركبة الذاتيّ في المدى الطبيعيّ لعمره وجنسه أو ٧٥٫٩ فأكثر.",
        "Continuous running of 4.8 km, then alternating running and jogging without pain or swelling; single-leg hopping in all directions with a soft landing and the knee over the foot; planned changes of direction at full speed; quadriceps strength of 90% and the four hop tests at 90%; and a subjective knee score within the normal range for age and sex, or 75.9 or more.",
      ],
      education: [
        "• الجريُ بدرجاته: أربعَ مرّاتٍ في الأسبوع على الأكثر ولا يومين متتاليين، والتورّمُ صباحاً هو الحَكَم (Adams 2012).\n" +
        "• الإصابةُ الثانية تحدث في الضغط على الخصم والتعثّر بعد الركل والهبوط والركبةُ مائلةٌ إلى الداخل (Della Villa 2020) — فالركبةُ فوق القدم في كلّ قفزٍ وقَطع.\n" +
        "• الوقايةُ للساقين: الركبةُ الأخرى في خطرٍ كالطُّعم (Wiggins 2016)، وإحماءُ فيفا ١١+ يبدأ هنا.\n" +
        "• الجاهزيةُ النفسية تُقاس من الشهر الرابع — والخوفُ من الإصابة أشيعُ أسباب عدم العودة (Ardern 2011).\n" +
        "• الصلاة: الجلوسُ على العقبين بوسادةٍ حين يبلغ الثنيُ ١٤٠°.",
        "• Running by its levels: at most four times a week and never on two consecutive days, with the morning swelling as the judge (Adams 2012).\n" +
        "• Second injuries happen while pressing an opponent, regaining balance after kicking and landing, with the knee collapsing inwards (Della Villa 2020) — so the knee over the foot in every hop and cut.\n" +
        "• Prevention for both legs: the other knee is at as much risk as the graft (Wiggins 2016), and the FIFA 11+ warm-up starts here.\n" +
        "• Psychological readiness is measured from month 4 — fear of re-injury is the commonest reason for not returning (Ardern 2011).\n" +
        "• Prayer: sitting back on the heels with a cushion once flexion reaches 140°.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٤ (العودة إلى الرياضة) حين تتحقّق كلُّها:\n" +
        "• قوّةُ الفخذ ٩٠٪ فأكثر من الجهة الأخرى ومن قيمة الساق السليمة قبل العملية إن قيست (Grindem 2016 · Wellsandt 2017).\n" +
        "• اختباراتُ القفز الأربعة على ساقٍ واحدة (المسافة · الثلاثيّ · المتقاطع · ستّةُ أمتار بالوقت) ٩٠٪ فأكثر (Reid 2007).\n" +
        "• مقياسُ الركبة الذاتيّ في المدى الطبيعيّ لعمره وجنسه أو ٧٥٫٩ فأكثر (Logerstedt 2014 · Muller 2016).\n" +
        "• لا تورّمَ، والمدى كامل، وأتمّ درجاتِ الجري.\n" +
        "(اقتراحٌ يجمع معاييرَ ديلاوير وأوسلو والدليل الهولنديّ.)",
        "Progress to phase 4 (return to sport) when all are met:\n" +
        "• Quadriceps strength of 90% or more of the other side and of the uninjured leg's pre-operative value if it was measured (Grindem 2016 · Wellsandt 2017).\n" +
        "• The four single-leg hop tests (distance · triple · crossover · 6 m timed) at 90% or more (Reid 2007).\n" +
        "• A subjective knee score within the normal range for age and sex, or 75.9 or more (Logerstedt 2014 · Muller 2016).\n" +
        "• No swelling, full range, and the running levels completed.\n" +
        "(A proposal combining the Delaware-Oslo criteria and the Dutch guideline.)",
      ],
      notes: [
        "• الجريُ بدرجاته الثماني من بطاقة «العودة إلى الجري»، واختباراتُ القفز من الأسبوع الثاني عشر حين تبلغ القوّةُ ٨٠٪ والتورّمُ أثرٌ والمدى كامل (Adams 2012).\n" +
        "• القفزُ بالتدرّج: النابضُ على الساقين ثمّ على واحدة، ثمّ إلى الأمام والجانبين والدوران — ولا يُضاف إلّا والجريُ بلا أثرٍ سيّئ والطريقةُ متقنةٌ تحت الإشراف (Adams 2012).\n" +
        "• تغييرُ الاتّجاه بعد درجة الجري الخامسة: التوقّفُ ثمّ ٤٥° ثمّ ٩٠° ثمّ المتقاطع، والسرعةُ ٥٠٪ ⟵ ١٠٠٪، والمخطَّطُ قبل المفاجئ.\n" +
        "• القوّةُ تستمرّ مرّتين إلى ثلاثٍ في الأسبوع، والنورديك لطُعم خلف الفخذ لا قبل الأسبوع السادس عشر.\n" +
        "• القفزُ والجريُ يوماً بعد يوم، والأيّامُ بينها للقوّة الخفيفة والتوازن وإحماء فيفا ١١+.\n" +
        "• خياطةُ الغضروف: لا قفزَ ولا تغييرَ اتّجاهٍ قبل الأسبوع السادس عشر، والجريُ بمعاييره.",
        "• Running by the eight levels of the 'return to running' card, and the hop tests from week 12 once strength reaches 80%, swelling is trace and the range is full (Adams 2012).\n" +
        "• Hopping in steps: pogo hops on two legs, then on one, then forwards, sideways and rotational — added only when running causes no adverse effect and the technique is mastered under supervision (Adams 2012).\n" +
        "• Changes of direction after running level 5: stopping, then 45°, then 90°, then the crossover, with speed 50% → 100%, planned before reactive.\n" +
        "• Strength continues two to three times a week, and the Nordic curl for a hamstring graft not before week 16.\n" +
        "• Hopping and running every other day, with the days between for light strength, balance and the FIFA 11+ warm-up.\n" +
        "• Meniscal repair: no hopping or changes of direction before week 16, and running by its criteria.",
      ],
      exercises: [
        { code: "walk-jog-progression" },
        { code: "single-leg-pogo-hops", sets: 3, reps: 10, rest: 60 },
        { code: "forward-hop-stick", sets: 3, reps: 6,
          note: ["بعد قفزات النابض، والهبوطُ ثابتٌ ثلاثَ ثوانٍ.", "After the pogo hops, with a stable three-second landing."] },
        { code: "lateral-hops", sets: 3, reps: 10 },
        { code: "skater-hop-soft-landing", sets: 3, reps: 10 },
        { code: "hop-cross-four-directions", sets: 3, reps: 3 },
        { code: "deceleration-cutting-drills", sets: 3, reps: 5, rest: 60 },
        { code: "figure-8-agility", sets: 3, reps: 4,
          note: ["بسرعة ٧٥٪ في الأسابيع ١٣–١٦ (Wright 2015).", "At 75% speed in weeks 13–16 (Wright 2015)."] },
        { code: "nordic-hamstring-curl", sets: 2, reps: 5, rest: 90 },
        { code: "fitball-hamstring-curl", sets: 3, reps: 8, rest: 60,
          note: ["لطُعم خلف الفخذ بعد الأسبوع الثاني عشر.", "For a hamstring graft after week 12."] },
        { code: "standing-hamstring-curl", sets: 3, reps: 10, rest: 60 },
        { code: "kettlebell-deadlift", sets: 3, reps: 8, rest: 90,
          note: ["لسلسلة خلف الفخذ والألوية؛ ولطُعم خلف الفخذ بثقلٍ بعد الأسبوع الثاني عشر.", "For the hamstrings and buttocks; for a hamstring graft, loaded after week 12."] },
        { code: "leg-press-progressive", sets: 4, reps: 6, rest: 120 },
        { code: "acl-open-chain-knee-extension", sets: 4, reps: 8, rest: 90,
          note: ["المدى كاملاً بثقلٍ لكلّ الطُّعوم بعد الأسبوع الثاني عشر.", "The full range with load for all grafts after week 12."] },
        { code: "single-leg-squat-to-box", sets: 3, reps: 10 },
        { code: "split-squat", sets: 3, reps: 10 },
        { code: "front-plank", sets: 3, hold: 45 },
        { code: "side-plank", sets: 3, hold: 30 },
        { code: "fifa-11-plus-warm-up",
          note: ["الجزءان الأوّل والثالث أوّلاً، والثاني بدرجته الأولى حين تسمح معاييرُ القفز.", "Parts 1 and 3 first, and part 2 at level 1 once the hopping criteria allow."] },
        { code: "prayer-kneeling-after-acl",
          note: ["الخطوة ٣: الجلوسُ على العقبين بوسادةٍ بثنيٍ ١٤٠° ثمّ بلا وسادة.", "Step 3: sitting back on the heels with a cushion at 140° of flexion, then without it."] },
        { code: "stationary-cycling",
          doseNote: ["١٠–٢٠ دقيقة إحماءً ولياقة.", "10–20 minutes for warm-up and fitness."] },
      ],
    },
    {
      name: ["العودة إلى الرياضة", "Return to sport"],
      sessionFrom: 73, sessionTo: 84,
      timeframe: ["الكتلةُ الرابعة — الأشهرُ ٦–٩، والعودةُ الكاملة لا قبل التاسع", "Block 4 — months 6–9, with the full return not before month 9"],
      goals: [
        "إتمامُ مراحل التأهيل في الملعب الخمس، والتدريبُ مع الفريق بلا تماسّ ثمّ كاملاً؛ واجتيازُ معايير العودة كلّها في الشهر التاسع أو بعده؛ والجاهزيةُ النفسية ٦٥ فأكثر (٧٦٫٧ لمن عمرُه عشرون فأقلّ)؛ وبرنامجُ وقايةٍ مرّتين في الأسبوع يؤدّيه وحده.",
        "Completing the five stages of on-field rehabilitation, and team training without contact, then full; passing all the return criteria at month 9 or later; psychological readiness of 65 or more (76.7 for those aged twenty or younger); and a prevention programme twice a week done independently.",
      ],
      education: [
        "• العودةُ مسارٌ: المشاركةُ ثمّ الرياضةُ ثمّ الأداء، والقرارُ بالزمن وحده «يجب أن يُترك» (Meredith 2020 · Ardern 2016) — لكنّ الشهرَ التاسع حدٌّ أدنى لرياضة الالتفاف: كلُّ شهر تأخيرٍ حتى التاسع خفّض الإصابةَ ٥١٪ (Grindem 2016).\n" +
        "• التدرّج: تدريبٌ بلا تماسّ ⟵ تدريبٌ كامل ⟵ مباراةٌ بدقائق ⟵ مباراةٌ كاملة (Filbay 2019).\n" +
        "• اجتيازُ المعايير قلّل تمزّقَ الطُّعم إلى النصف تقريباً، والإصابةُ الثانية تبقى ممكنة (Webster & Hewett 2019) — فالوقايةُ مرّتين في الأسبوع دائماً.\n" +
        "• الخشونةُ ليست قدراً لكنّها أكثر: يحميها المدى الكامل والقوّةُ والوزن (Shelbourne 2012 · Cinque 2018).",
        "• The return is a path: participation, then sport, then performance, and purely time-based decisions 'should be abandoned' (Meredith 2020 · Ardern 2016) — but month 9 is the minimum for pivoting sport: each month of delay up to month 9 reduced re-injury by 51% (Grindem 2016).\n" +
        "• The progression: training without contact → full training → match play by minutes → full matches (Filbay 2019).\n" +
        "• Passing the criteria roughly halved graft rupture, and a second injury remains possible (Webster & Hewett 2019) — so prevention twice a week for good.\n" +
        "• Osteoarthritis is not fate but is commoner: full range, strength and weight protect against it (Shelbourne 2012 · Cinque 2018).",
      ],
      criteria: [
        "الخروجُ إلى رياضة الالتفاف بلا قيود حين تتحقّق كلُّها:\n" +
        "• الشهرُ التاسع أو بعده (Grindem 2016 · Beischer 2020).\n" +
        "• قوّةُ الفخذ ٩٠٪ فأكثر — والهدفُ ١٠٠٪ لرياضات الالتفاف والتماسّ (van Melick 2016 · Kotsifaki 2023) — ومن قيمة الساق السليمة قبل العملية إن قيست (Wellsandt 2017).\n" +
        "• اختباراتُ القفز الأربعة ٩٠٪ فأكثر (Grindem 2016).\n" +
        "• لا تورّمَ، والمدى كامل، والركبةُ ثابتة، والهبوطُ وتغييرُ الاتّجاه بطريقةٍ سليمة.\n" +
        "• الجاهزيةُ النفسية ٦٥ فأكثر و٧٦٫٧ لمن عمرُه عشرون فأقلّ (Sadeqi 2018 · McPherson 2019).\n" +
        "• أتمّ برنامجَ رياضته ومراحلَ الملعب (Buckthorpe 2019).\n" +
        "ولاعبُ الالتفاف يُحال قبلها إلى اختبار القوّة المتساوية حيث يتوفّر؛ وعدمُ اجتياز معايير العودة الستّة رفع تمزّقَ الطُّعم ٤٫١ مرّة عند المحترفين (Kyritsis 2016). ومراجعةٌ في الشهر الثاني عشر.",
        "Discharge to unrestricted pivoting sport when all are met:\n" +
        "• Month 9 or later (Grindem 2016 · Beischer 2020).\n" +
        "• Quadriceps strength of 90% or more — aiming for 100% for pivoting and contact sports (van Melick 2016 · Kotsifaki 2023) — and of the uninjured leg's pre-operative value if it was measured (Wellsandt 2017).\n" +
        "• The four hop tests at 90% or more (Grindem 2016).\n" +
        "• No swelling, full range, a stable knee, and sound landing and change-of-direction technique.\n" +
        "• Psychological readiness of 65 or more, and 76.7 for those aged twenty or younger (Sadeqi 2018 · McPherson 2019).\n" +
        "• The sport-specific programme and the on-field stages completed (Buckthorpe 2019).\n" +
        "Pivoting athletes are referred before this for isokinetic testing where available; failing the six discharge criteria raised graft rupture 4.1-fold in professionals (Kyritsis 2016). A review at month 12.",
      ],
      notes: [
        "• مراحلُ الملعب الخمس للاعب الكرة: الجريُ المستقيم، ثمّ المتعدّدُ الاتّجاهات، ثمّ المهاراتُ بالكرة، ثمّ حركاتُ اللعب، ثمّ محاكاةُ التدريب (Buckthorpe 2019).\n" +
        "• تغييرُ الاتّجاه بإشارةٍ مفاجئة ومع الكرة، والقفزُ في الاتّجاهات بالسرعة الكاملة.\n" +
        "• القوّةُ الثقيلة مرّتين في الأسبوع حتى تبلغ المعايير ثمّ تُحفظ، والنورديك مرّةً أو مرّتين.\n" +
        "• إحماءُ فيفا ١١+ كاملاً بدرجاته، ويستمرّ بعد العودة مرّتين في الأسبوع.\n" +
        "• اختبارُ العودة في الشهر التاسع: القوّة والقفزُ والمقياسُ الذاتيّ والجاهزيةُ النفسية وطريقةُ الهبوط — ومَن لم يجتز يتمّ برنامجَه ويُعاد اختبارُه بعد أربعة أسابيع.",
        "• The five on-field stages for footballers: straight-line running, then multidirectional, then ball skills, then game movements, then training simulation (Buckthorpe 2019).\n" +
        "• Changes of direction on a sudden signal and with the ball, and hopping in all directions at full speed.\n" +
        "• Heavy strength twice a week until the criteria are reached, then maintained, with the Nordic curl once or twice.\n" +
        "• The full FIFA 11+ warm-up by its levels, continued after the return twice a week.\n" +
        "• The return test at month 9: strength, hops, the subjective score, psychological readiness and landing technique — those who do not pass complete their programme and are retested after four weeks.",
      ],
      exercises: [
        { code: "fifa-11-plus-warm-up",
          note: ["كاملاً بدرجاته الثلاث، ومرّتين في الأسبوع على الأقلّ دائماً.", "In full with its three levels, and at least twice a week for good."] },
        { code: "deceleration-cutting-drills", sets: 3, reps: 6, rest: 60,
          note: ["بإشارةٍ مفاجئة ومع الكرة.", "On a sudden signal and with the ball."] },
        { code: "figure-8-agility", sets: 3, reps: 4,
          note: ["بالسرعة الكاملة.", "At full speed."] },
        { code: "hop-cross-four-directions", sets: 3, reps: 4 },
        { code: "skater-hop-soft-landing", sets: 3, reps: 12 },
        { code: "walk-jog-progression",
          note: ["الدرجةُ الثامنة ثمّ فتراتٌ أسرع وجريٌ بتغيير السرعة.", "Level 8, then faster intervals and running with changes of pace."] },
        { code: "nordic-hamstring-curl", sets: 3, reps: 6, rest: 90 },
        { code: "single-leg-squat-to-box", sets: 3, reps: 10 },
        { code: "leg-press-progressive", sets: 4, reps: 6, rest: 120 },
        { code: "acl-open-chain-knee-extension", sets: 4, reps: 8, rest: 90 },
        { code: "kettlebell-deadlift", sets: 3, reps: 8, rest: 90 },
        { code: "stationary-cycling",
          doseNote: ["١٠ دقائق إحماء.", "10 minutes of warm-up."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٨٤ بستٍّ في الأسبوع في أربع كتلٍ تفصلها فتراتٌ منزلية (٢٤ في الأسابيع ١–٤، و٢٤ في ٥–١٢، و٢٤ من الأسبوع ١٢ بمعايير الجري، و١٢ في الأشهر ٦–٩)، وتمديدٌ واحد بستٍّ لكلّ كتلة، و٤٨ لمن لا يمارس رياضةً بالتفاف، ومراجعةٌ كلَّ أربعة أسابيع بين الكتل، واختبارُ العودة في التاسع ومراجعةٌ في الثاني عشر — والإرشادُ مرّتين إلى ثلاثٍ في الأسبوع ستّةَ أشهرٍ إلى عشرة، ولا تجربةَ للحضور اليوميّ: أبقِه، أو اجعل الكتلةَ الثانية ثلاثاً في الأسبوع ثمانيةَ أسابيع، أو اكتب عددَ المركز. وقبل العملية: زيارةٌ واحدة على الأقلّ، و١٢ جلسةً (حتى ٢٤) لنقص المدّ أو التورّم أو ضعف الفخذ أكثرَ من ٢٠٪ — أبقِه أو عدّله.",
    en: "84 sessions at six a week in four blocks separated by home periods (24 in weeks 1–4, 24 in 5–12, 24 from week 12 with the running criteria, and 12 in months 6–9), one extension of six per block, 48 for those who do not play pivoting sport, a review every four weeks between blocks, and return testing at month 9 with a review at month 12 — the guideline is two to three a week for six to ten months (Logerstedt 2017), and no trial tested daily attendance: keep it, make block 2 three a week for eight weeks, or write the centre's number. Before surgery: at least one visit, and 12 sessions (up to 24) for an extension deficit, swelling or a quadriceps deficit above 20% (Kotsifaki 2023 · Eitzen 2009) — keep or edit it." },
  { key: "limits", topic: "limits",
    ar: "الحدود: قاعدةُ التورّم والوجع (زيادةُ التورّم درجةً أو بلوغُه ٢+ يوقف التقدّمَ يوماً، والجريُ والقفزُ بتورّمٍ أثر أو أقلّ، وقواعدُ الوجع، وألمُ مقدّم الركبة حتى ٣ من ١٠)، والانتقالُ إلى الثانية بنقص مدٍّ ٢° وثنيٍ ١١٠° وتورّمٍ ١+ وعشرين رفعةً بلا تأخّر ومشيةٍ بلا عكّاز، وإلى الجري بقوّة فخذٍ ٨٠٪ ومدىً كامل وتورّمٍ أثر وعشر قفزاتٍ بلا ألم واثني عشرَ أسبوعاً، وإلى العودة بقوّةٍ واختبارات قفزٍ ٩٠٪ ومقياسٍ ذاتيّ ٧٥٫٩، والخروجُ في التاسع بجاهزيةٍ نفسية ٦٥ — أبقِها أو عدّلها.",
    en: "The limits: the swelling-and-soreness rule (swelling up one grade or reaching 2+ stops progression for the day, running and hopping only at trace or less, the soreness rules, and anterior knee pain up to 3/10) (Adams 2012 · Sturgill 2009), progression to phase 2 on a 2° extension deficit, 110° of flexion, 1+ swelling, twenty lag-free raises and gait without a crutch, to running on 80% quadriceps strength, full range, trace swelling, ten pain-free hops and twelve weeks (Kotsifaki 2023), to the return on 90% strength and hop tests and a subjective score of 75.9 (Grindem 2016 · Muller 2016), and discharge at month 9 with psychological readiness of 65 (Sadeqi 2018) — keep or edit them." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: في اليوم نفسِه الحمّى أو إفرازُ الجرح أو الركبةُ الحارّة المشدودة، وألمُ الساق وتورّمُها أو ضيقُ النفَس، والعجزُ المفاجئ عن رفع الساق أو فجوةُ الرضفة بعد طُعم وتر الرضفة، والركبةُ المنحبسة؛ وخلال أسبوع الانفلاتُ الجديد أو لاكمان موجب، والانحباسُ بعد خياطة الغضروف؛ وفي الأسبوع السادس نقصُ مدٍّ ٥° (أو حاجزٌ نابض قبله) والثنيُ أقلُّ من ٩٠° وفخذٌ لا ينقبض أو أقلُّ من ٦٠٪؛ وفي الثاني عشر قوّةٌ أقلُّ من ٨٠٪؛ وألمٌ بمعايير بودابست في أيّ وقت — أبقِها، أو اتّفق مع جرّاحي المركز على مواعيد أخرى.",
    en: "The referral rules: the same day for fever, wound discharge or a hot tense knee, calf pain and swelling or breathlessness, a sudden inability to lift the leg or a patellar gap after a patellar-tendon graft, and a locked knee; within a week for new giving way or a positive Lachman, and catching after a meniscal repair; at week 6 for an extension deficit of 5° (or a springy block earlier) (Delaloye 2020), flexion below 90° and a quadriceps that does not contract or is below 60%; at week 12 for strength below 80%; and Budapest-criteria pain at any time (Harden 2010) — keep them, or agree other dates with the centre's surgeons." },
  { key: "graft-repair", topic: "content",
    ar: "قواعدُ الطُّعم وخياطةُ الغضروف: مدُّ الركبة جالساً من الأسبوع الرابع في ٩٠–٤٥° يتّسع حتى الثامن، والثقلُ لوتر الرضفة ووتر الفخذ، ووترُ خلف الفخذ بلا ثقلٍ ولا ثنيٍ ضدّ مقاومة حتى الأسبوع ١٢ والنورديك لا قبل السادس عشر؛ وبعد خياطة الغضروف لا قيودَ من البروتوكول بل قيودُ الجرّاح، والشائعُ: لا ثنيَ حاملاً للوزن فوق ٤٥° أربعةَ أسابيع ثمّ أقلّ من ٩٠° حتى الثامن، ولا قرفصاءَ عميقة ولا قفزَ ولا لفَّ والصلاةُ على الكرسيّ أربعةَ أشهر — أبقِها، أو اكتب قيوداً افتراضية مع جرّاحي المركز لكلّ طُعم.",
    en: "The graft rules and meniscal repair: seated knee extension from week 4 in 90–45°, widening to week 8, with load for patellar- and quadriceps-tendon grafts, and a hamstring graft without load or resisted bending until week 12 and the Nordic curl not before week 16 (van Melick 2016 · Adams 2012); after a meniscal repair no restrictions from the protocol but the surgeon's, commonly: no weight-bearing flexion beyond 45° for four weeks, then below 90° to week 8, and no deep squatting, jumping or twisting with chair prayer for four months (Pujol 2025) — keep them, or write default restrictions with the centre's surgeons for each graft." },
  { key: "device-electro-compression", topic: "devices",
    ar: "التحفيزُ العضليّ أساسيٌّ في الأسابيع الثمانية الأولى بإعدادات ديلاوير (حاملٌ ٢٥٠٠ هرتز و٧٥ دفعة، و١٢ ثانيةً عمل و٥٠ راحة، وأقوى انقباضٍ لا يقلّ عن ٥٠٪، وعشرُ انقباضات والركبةُ في ٦٠°)، والبديلُ ٥٠ هرتز فأكثر ثنائيُّ الطور ٢٥٠–٣٠٠ ميكروثانية — والإرشادُ بدرجة A؛ هل يُخرج جهازُ المركز التيّارَ الحامل؟ والتبريدُ مع الضغط مساعدٌ في الأسبوعين الأوّلين وبعد التحميل لمن تورّم — هل يبرّد جهازُ الضغط في المركز؟ أبقِهما أو عدّلهما.",
    en: "Neuromuscular stimulation is core in the first eight weeks with the Delaware settings (a 2500 Hz carrier at 75 bursts, 12 seconds on and 50 off, the strongest contraction of at least 50%, and ten contractions with the knee at 60°) (Adams 2012), with the alternative of 50 Hz or more, biphasic, 250–300 µs (Conley 2021) — the guideline grade is A (Logerstedt 2017); can the centre's unit produce the carrier? Cold with compression is an adjunct in the first two weeks and after loading for swelling (Kotsifaki 2023) — does the centre's compression device cool? Keep or edit them." },
  { key: "device-adjuncts", topic: "devices",
    ar: "المغناطيسُ والكمادةُ الحارّة والأشعّةُ تحت الحمراء مساعدةٌ بقاعدتك — والمغناطيسُ الإيجابيّ بجهازٍ منزليّ أربعَ ساعاتٍ يومياً ستّين يوماً وبجرعة العيادة بلا أثر، والحرارةُ بلا تجربة ولا تُعطى قبل الأسبوع السادس ولا على تورّم؛ والتيكارُ «لا يُستخدم» لمسامير الطُّعم المعدنية خلافاً لقاعدتك — أبقِها، أو اجعل بعضَها «لا يُستخدم»، أو اسمح بالتيكار حين لا معدن.",
    en: "Magnetic therapy, the hot pack and infrared are adjuncts by your rule — the positive magnetic trial used a home device for four hours a day for sixty days, and a clinic dose had no effect (Benazzo 2008 · Ogrodzka 2021), and heat has no trial and is not given before week 6 or on swelling; Tecar is 'Not used' because of the graft's metal screws, unlike your rule — keep them, make some 'Not used', or allow Tecar when there is no metal." },
  { key: "device-shock-needle", topic: "devices",
    ar: "الموجاتُ الصادمة «لا يُستخدم» ولها تجربةٌ بالوهميّ (شعاعية ٢٥٠٠ نبضة و٠٫٢٩٨ ملّي جول/مم² أسبوعياً ستَّ مرّات، تحسّنت النتائجُ في الأسابيع الأولى بلا فرقٍ في الرابع والعشرين)، والإبرُ الجافّة «لا يُستخدم» والدليلُ القطريّ ضدّها مبكّراً للنزف، والليزرُ والأمواجُ فوق الصوتية بلا تجربةٍ على الإنسان، والحركةُ السلبية المستمرّة ضدّها الدليلُ القطريّ — أبقِها، أو اجعل الموجاتِ مساعداً بإعدادات التجربة.",
    en: "Shockwave is 'Not used' with one sham-controlled trial (radial, 2500 impulses and 0.298 mJ/mm² weekly six times; outcomes improved in the early weeks with no difference at week 24 — Song 2024), dry needling is 'Not used' and the Qatari guideline is against it early because of bleeding (Kotsifaki 2023), laser and ultrasound have no human trial, and the Qatari guideline is against continuous passive motion — keep them, or make shockwave an adjunct with the trial's settings." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: الألمَ من ١٠ (الأقلّ أفضل)، ودرجةَ التورّم في اختبار المسح من ٠ إلى ٤ (الأقلّ أفضل)، ونقصَ المدّ بالدرجات (الأقلّ أفضل)، ونسبةَ قوّة الفخذ إلى الجهة الأخرى ٪ (الأكثر أفضل)، واختباراتِ القفز الأربعة ٪ (الأكثر أفضل)، والجاهزيةَ النفسية بالعربية من ١٠٠ (الأكثر أفضل)، وتيغنر من ١٠ (الأكثر أفضل)، والوصولَ الأماميّ بميزان Y بالسنتيمتر؛ ونتائجُ الركبة ومقياسُ الركبة الذاتيّ مزروعان بالعربية المُتحقَّقة.",
    en: "Add under 'Measures' → custom measure: pain out of 10 (lower is better), the stroke-test swelling grade from 0 to 4 (lower is better), the extension deficit in degrees (lower is better), quadriceps strength as a % of the other side (higher is better), the four hop tests in % (higher is better) (Reid 2007), psychological readiness in Arabic out of 100 (higher is better) (Alzhrani 2022), the Tegner scale out of 10 (higher is better) (Alzhrani 2022b), and the Y-balance anterior reach in centimetres (Garrison 2015); the KOOS and the subjective knee score are seeded in validated Arabic (Almangoush 2013 · Almalki 2022)." },
];

export const name = "159_physio_acl_reconstruction_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
