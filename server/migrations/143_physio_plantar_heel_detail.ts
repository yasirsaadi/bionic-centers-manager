// Migration 143: ألمُ الكعب الأخمصيّ (التهابُ اللفافة الأخمصية) — البروتوكولُ الثالث عشر مفصَّلاً (§4.eb — ٢٠٢٦-١٠-١٤).
//
// المالك (٢٠٢٦-١٠-١٤): «الآن نكمل البروتوكول الذي وصلنا إليه» — والتالي بالترتيب المكتوب في القسم ٠: ألمُ الكعب (`plantar-heel-pain-adult`).
// **بالقالب كاملاً** (§4.dd): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع) وتمديدٌ واحد بستٍّ بمعيارٍ مكتوب، وثلاثُ مراحل بنطاقات
// (١–٦ · ٧–١٢ · ١٣–١٨) ومعايير رقمية: تهدئةُ الألم وبدءُ التحميل، ثمّ التحميلُ المتدرّج، ثمّ الوظيفةُ والعودةُ إلى الوقوف والعمل؛ وستُّ بطاقاتٍ جديدة
// (ستُّ صورٍ مطلوبة) وسبعٍ معادة بصورها من ١١٩ و١٢٦ و١٢٩ و١٣٠؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»، **والموجاتُ الصادمةُ والإبرُ
// الجافّة بموعدٍ أسبوعيّ** (والموعدُ يُكتب مع السطر — الأداةُ وُسّعت له)؛ والمقاييسُ كما زُرعت (FAAM-ADL وعطفُ الكاحل) وألمُ الخطوة الأولى ومقياسٌ
// عربيٌّ للقدم إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» السبعة بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الكعب**: الدليلُ الإرشاديّ للمعالجين (JOSPT 2023) يقول العلاجَ اليدويّ والتمطيطَ والشريطَ وجبيرةَ الليل (A)، والليزرَ والإبرَ والتقويةَ
// بالمقاومة (B)، **والدعاماتُ لا تُستعمل وحدها** (B)، **والأمواجُ فوق الصوتية لا** (A ضدّ)؛ والموجاتُ الصادمة خارجَ نطاقه — **وهي وحدها بقي أثرُها
// على المدى المتوسّط والطويل** (Guimarães 2023)، ولا تُعطى أوّلاً في الحادّ (Rompe 2010 · ACFAS 2018). **ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع**:
// المشرَفُ في التجارب ٦–٢٤ جلسة بمعدّل ١–٣ في الأسبوع — فالعددُ ١٨ اختيارُ خدمةٍ مكتوبٌ صريحاً، والتقويةُ الثقيلةُ يوماً بعد يوم (Rathleff 2015)،
// والبرنامجُ المنزليّ حتى الأسبوع ١٢ (نقاطُ نهاية التجارب). **والتقويةُ ليست أفضلَ من النصيحة وكوب الكعب عند ١٢ أسبوعاً** (Riel 2023) — كُتب ذلك صريحاً.
// **وما يخصّ العراق**: نساءُ الرمادي المصاباتُ أكثرُهنّ بوزنٍ فوق ٣٠ (Abdulazeez 2021)، ولا تجربةَ علاجٍ عراقية، ولا دراسةَ عن السجود وألم الكعب
// (بحثٌ صفريّ مكتوب) — وقسمُ المساند في المركز يصنع الفرشاتِ الطبية، **والدليلُ لا يرى المفصَّلةَ أفضلَ من الجاهزة** (Landorf 2006 · Rasenberg 2021).
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref؛ **والدرجاتُ من مسوّدة الدليل المنشورة للتعليق** لأنّ نصَّه المنشور حُجب، ودرجةُ التقوية
// (B) من ثلاثة مصادر تنقل النسخةَ المنشورة (والمسوّدةُ C). القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ستّ؛ والسبعُ المعادة (زُرعت في ١١٩ و١٢٦ و١٢٩ و١٣٠) تُربط برموزها وصورها، وما يخصّ الكعب في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "plantar-fascia-stretch", nameAr: "تمطيط اللفافة الأخمصية جالساً (سحب الأصابع إلى الخلف)", nameEn: "Plantar fascia-specific stretch (seated)",
    kind: "stretch", region: "ankle_foot", perSide: true, sets: 1, reps: 3, hold: 30, rest: 10,
    purpose: ["أقوى ما في الدليل لألم الخطوة الأولى على المدى القصير (تمطيطُ اللفافة — Morrissey 2021، ودرجةُ A في JOSPT 2023): يشدّ اللفافةَ تحت القوس بسحب الأصابع إلى الخلف والقدمُ بلا حمل؛ وكان أفضلَ من تمطيط وتر العرقوب واقفاً عند ثمانية أسابيع (DiGiovanni 2003) وبقي أثرُه بعد سنتين (DiGiovanni 2006)، وفي الحادّ (حتى ستّة أسابيع) كان أفضلَ من الموجات الصادمة (Rompe 2010).",
      "The strongest short-term evidence for first-step pain (plantar fascia stretching — Morrissey 2021, grade A in JOSPT 2023): it tensions the fascia under the arch by pulling the toes back with the foot unloaded; it beat a weight-bearing Achilles stretch at eight weeks (DiGiovanni 2003), the gain lasted two years (DiGiovanni 2006), and in acute cases (up to six weeks) it beat shockwave (Rompe 2010)."],
    start: ["جالسٌ على كرسيّ أو حافّة السرير، والقدمُ المصابة فوق ركبة الساق الأخرى.",
      "Sitting on a chair or the edge of the bed with the affected foot crossed over the other knee."],
    steps: [[
      "أمسك أصابعَ القدم كلَّها بيدٍ واسحبها إلى الخلف نحو الساق حتى تشعر بشدٍّ تحت القوس.",
      "تحسّس اللفافةَ تحت القوس باليد الأخرى — تكون مشدودةً كالوتر.",
      "اثبت ٣٠ ثانية وتنفّس.",
      "أرخِ ١٠ ثوانٍ، ثمّ كرّر ٣ مرّات.",
      "ثلاثَ مرّاتٍ في اليوم: أوّلُها قبل أن تضع قدمك على الأرض صباحاً، وبعد الجلوس الطويل.",
    ], [
      "Hold all the toes with one hand and pull them back towards the shin until you feel a stretch under the arch.",
      "Feel the fascia under the arch with the other hand — it should be taut like a cord.",
      "Hold for 30 seconds and breathe.",
      "Relax for 10 seconds, then repeat 3 times.",
      "Three times a day: the first before putting the foot on the floor in the morning, and after long sitting.",
    ]],
    cues: [[
      "سحبُ القدم كلِّها بدل الأصابع ⟵ اليدُ على الأصابع والشدُّ تحت القوس لا في بطن الساق.",
      "الشدُّ بقوّةٍ تؤلم ألماً حادّاً ⟵ شدٌّ محتمل (٣–٤ من ١٠) يخفّ مع الثبات.",
      "الهزُّ والارتداد ⟵ ثباتٌ هادئ طوالَ الثلاثين ثانية.",
    ], [
      "Pulling the whole foot instead of the toes → the hand on the toes and the stretch under the arch, not in the calf.",
      "Pulling hard enough to cause sharp pain → a tolerable stretch (3–4/10) that eases as you hold.",
      "Bouncing → a calm, steady hold for the full 30 seconds.",
    ]],
    easier: ["منشفةٌ حول الأصابع تُسحب باليدين إن صعب الوصول إلى القدم.", "A towel around the toes pulled with both hands if the foot is hard to reach."],
    harder: ["واقفاً: الأصابعُ مرفوعةٌ على الجدار والكعبُ على الأرض، ثمّ تُقرَّب الركبةُ من الجدار.", "Standing: toes propped up against the wall with the heel on the floor, then bring the knee towards the wall."],
    stopIf: ["حرقةٌ أو خدرٌ أو تنميلٌ في باطن القدم (العصب)، أو ألمٌ حادّ يزيد بعد التمرين.", "Burning, numbness or tingling in the sole (nerve), or sharp pain that is worse after the exercise."],
    equipment: ["كرسيّ، ومنشفةٌ عند الحاجة.", "A chair, and a towel if needed."],
    doseNote: ["٣ × ٣٠ ثانية وراحةُ ١٠ ثوانٍ، ثلاثَ مرّاتٍ يومياً (Thong-On 2019) — والأولى قبل الخطوة الأولى صباحاً (اقتراحٌ عمليّ).", "3 × 30 seconds with 10 seconds' rest, three times a day (Thong-On 2019) — the first before the first step in the morning (a practical suggestion)."],
    images: [{ key: "plantar-fascia-stretch-1", ar: "جالسٌ والقدمُ فوق الركبة الأخرى وهو يسحب أصابعَ القدم إلى الخلف بيده", en: "Seated with the foot over the other knee, pulling the toes back with the hand", search: "plantar fascia specific stretch seated pulling toes" }],
  },
  {
    code: "heel-raise-towel-high-load", nameAr: "رفع الكعب على ساقٍ واحدة بحملٍ عالٍ ومنشفةٌ تحت الأصابع", nameEn: "High-load single-leg heel raise with a towel under the toes",
    kind: "strength", region: "ankle_foot", perSide: true, sets: 3, reps: 12, rest: 120,
    purpose: ["التقويةُ بالحمل العالي للساق واللفافة معاً: المنشفةُ الملفوفة تحت الأصابع ترفعها إلى الخلف فتشدّ اللفافة (آليةُ الرافعة) والكعبُ يرتفع بالحمل — وكانت أفضلَ من التمطيط وحده عند ثلاثة أشهر (Rathleff 2015: مؤشّرُ وظيفة القدم أفضل بـ٢٩ نقطة) ولم تختلف عند شهرٍ وستّةٍ واثني عشر؛ والتقويةُ بالمقاومة درجةُ B في الدليل. ولم تكن أفضلَ من النصيحة وكوب الكعب عند ١٢ أسبوعاً (Riel 2023) — فهي جزءٌ من البرنامج لا وعدٌ وحدها.",
      "High-load strengthening for the calf and the fascia together: a rolled towel under the toes extends them and tensions the fascia (the windlass mechanism) while the heel rises under load — it beat stretching alone at three months (Rathleff 2015: Foot Function Index 29 points better) with no difference at one, six and twelve months; resistance training is grade B in the guideline. It was no better than advice and a heel cup at 12 weeks (Riel 2023) — so it is part of the programme, not a promise on its own."],
    start: ["واقفٌ على درجةٍ بالقدم المصابة وحدها، ومقدّمُ القدم على الدرجة والكعبُ في الهواء، ومنشفةٌ ملفوفة تحت الأصابع تثنيها إلى الخلف، واليدُ على الدرابزين للتوازن، والساقُ الأخرى مرفوعة.",
      "Standing on a step on the affected foot only, forefoot on the step and heel in the air, a rolled towel under the toes bending them back, a hand on the rail for balance, the other leg lifted."],
    steps: [[
      "ارتفع على أطراف الأصابع في ٣ ثوانٍ حتى أعلى ما تستطيع.",
      "اثبت في الأعلى ثانيتين.",
      "انزل في ٣ ثوانٍ حتى ينزل الكعبُ تحت مستوى الدرجة.",
      "كرّر حتى ١٢ مرّة — والحملُ المناسب يجعل الثانيةَ عشرةَ آخرَ ما تقدر عليه.",
      "استرح دقيقتين بين المجموعات، ٣ مجموعات، يوماً بعد يوم لا كلَّ يوم.",
    ], [
      "Rise onto the toes over 3 seconds, as high as you can.",
      "Hold at the top for 2 seconds.",
      "Lower over 3 seconds until the heel drops below the level of the step.",
      "Repeat up to 12 times — the right load makes the 12th the last you can do.",
      "Rest 2 minutes between sets, 3 sets, every other day — not every day.",
    ]],
    cues: [[
      "السرعةُ والارتدادُ في الأسفل ⟵ عدٌّ ٣–٢–٣ بصوتٍ مسموع.",
      "ميلُ القدم للخارج نحو الإصبع الصغير ⟵ الضغطُ عبر الإصبع الكبير.",
      "ثنيُ الركبة لتسهيل الرفع ⟵ الركبةُ مستقيمةٌ بلا قفل.",
    ], [
      "Rushing and bouncing at the bottom → count 3–2–3 out loud.",
      "The foot rolling out towards the little toe → push through the big toe.",
      "Bending the knee to make it easier → knee straight but not locked.",
    ]],
    easier: ["على القدمين معاً على الأرض بلا درجة (بطاقة «رفع الكعبين واقفاً»)، ثمّ على القدمين على الدرجة، ثمّ على ساقٍ واحدة بالإمساك — مستوياتُ Thong-On 2019.", "Both feet on the floor without a step (the 'Standing heel raise' card), then both feet on the step, then one leg holding on — the Thong-On 2019 levels."],
    harder: ["حقيبةُ ظهرٍ بأثقالٍ حين تقدر على أكثر من العدد: ١٢ مرّةً × ٣ في الأسبوعين الأوّلين، ثمّ ١٠ × ٤، ثمّ ٨ × ٥ من الأسبوع الخامس (بروتوكول Riel 2019).", "A backpack with weights once you can do more than the target: 12 × 3 for the first two weeks, then 10 × 4, then 8 × 5 from week five (the Riel 2019 protocol)."],
    stopIf: ["ألمٌ فوق ٥ من ١٠ أثناءه، أو ألمُ الخطوة الأولى صباحَ الغد أسوأ ممّا كان؛ أو ألمٌ حادّ أو «طقّة» في وتر العرقوب.", "Pain above 5/10 during it, or first-step pain the next morning worse than before; or sharp pain or a 'pop' in the Achilles tendon."],
    equipment: ["درجةٌ بدرابزين، ومنشفةٌ ملفوفة، وحقيبةُ ظهرٍ بأثقال (كتبٌ أو قناني ماء).", "A step with a rail, a rolled towel, and a backpack with weights (books or water bottles)."],
    doseNote: ["١٢ أقصى × ٣ ثمّ ١٠ × ٤ ثمّ ٨ × ٥، والإيقاعُ ٣ ثوانٍ صعوداً وثانيتان ثباتاً و٣ نزولاً، وراحةُ دقيقتين، يوماً بعد يوم.", "12-repetition maximum × 3, then 10 × 4, then 8 × 5; tempo 3 seconds up, 2 held, 3 down; 2 minutes' rest; every other day."],
    images: [{ key: "heel-raise-towel-high-load-1", ar: "واقفٌ على ساقٍ واحدة على درجة ومنشفةٌ ملفوفة تحت أصابع القدم وهو يرفع الكعب", en: "Standing on one leg on a step with a rolled towel under the toes, rising onto the toes", search: "high load heel raise towel under toes step plantar fasciitis" }],
  },
  {
    code: "towel-toe-curl", nameAr: "جمع المنشفة بأصابع القدم", nameEn: "Towel toe curl",
    kind: "strength", region: "ankle_foot", perSide: true, sets: 3, reps: 15,
    purpose: ["يقوّي العضلاتِ التي تثني الأصابع — وأداؤها أضعفُ عند مرضى ألم الكعب (McClinton 2016)؛ وهو جزءٌ من برنامج التقوية الذي عادل التمطيطَ في الألم والمشي (Thong-On 2019). والدليلُ لتقوية عضلات القدم وحدها ضعيف: لم تُضف شيئاً فوق التمطيط عند ثمانية أسابيع (Kamonseki 2016)، ولم يُوجد صغرٌ في حجمها بالرنين (Osborne 2026) — فيبقى تمريناً مساعداً سهلاً في البيت.",
      "Strengthens the muscles that curl the toes — their performance is weaker in people with heel pain (McClinton 2016); it is part of the strengthening programme that matched stretching for pain and gait (Thong-On 2019). The evidence for foot-muscle strengthening on its own is weak: it added nothing to stretching at eight weeks (Kamonseki 2016), and no loss of muscle size was found on MRI (Osborne 2026) — so it stays an easy supporting exercise at home."],
    start: ["جالسٌ على كرسيّ والقدمُ حافيةٌ على منشفةٍ مفرودة على أرضٍ ملساء، والكعبُ ثابتٌ على الأرض.",
      "Sitting on a chair with the bare foot on a towel spread on a smooth floor, the heel fixed on the floor."],
    steps: [[
      "اثنِ الأصابعَ لتجمع المنشفةَ وتسحبها نحوك.",
      "أرخِ الأصابعَ وافردها، ثمّ أعد الجمع.",
      "كرّر حتى تُجمع المنشفةُ كلُّها تحت القدم، ثمّ افردها من جديد.",
      "١٥ مرّة × ٣ مجموعات.",
    ], [
      "Curl the toes to scrunch the towel and draw it towards you.",
      "Relax and spread the toes, then scrunch again.",
      "Repeat until the whole towel is gathered under the foot, then spread it out again.",
      "15 times × 3 sets.",
    ]],
    cues: [[
      "رفعُ الكعب عن الأرض ⟵ الكعبُ ثابتٌ والحركةُ من الأصابع وحدها.",
      "دورانُ القدم للداخل أو للخارج ⟵ القدمُ مستقيمةٌ إلى الأمام.",
      "تشنّجُ القوس ⟵ استرح وقلّل العددَ ثمّ زِد.",
    ], [
      "Lifting the heel off the floor → heel fixed, the movement from the toes alone.",
      "The foot turning in or out → foot pointing straight ahead.",
      "Cramp in the arch → rest, do fewer and then build up.",
    ]],
    easier: ["أقلُّ عدداً، أو جمعُ مناديل ورقية بالأصابع.", "Fewer repetitions, or picking up tissues with the toes."],
    harder: ["ثقلٌ على طرف المنشفة البعيد يزيد كيلوغراماً كلَّ مستوى (Thong-On 2019).", "A weight on the far end of the towel, adding a kilogram each level (Thong-On 2019)."],
    stopIf: ["ألمٌ حادّ في الكعب أو القوس يبقى بعد التمرين، أو تنميلٌ في الأصابع.", "Sharp heel or arch pain that persists after the exercise, or tingling in the toes."],
    equipment: ["كرسيّ، ومنشفة، وأرضٌ ملساء، وثقلٌ صغير للتدرّج.", "A chair, a towel, a smooth floor, and a small weight to progress."],
    doseNote: ["١٥ مرّة × ٣، ويُزاد الثقلُ على طرف المنشفة.", "15 times × 3, adding weight on the end of the towel."],
    images: [{ key: "towel-toe-curl-1", ar: "قدمٌ حافية على منشفةٍ على الأرض تجمعها بأصابعها", en: "A bare foot on a towel on the floor scrunching it with the toes", search: "towel scrunch toe curl exercise foot" }],
  },
  {
    code: "short-foot", nameAr: "تمرين القدم القصيرة (رفع القوس بلا ثني الأصابع)", nameEn: "Short-foot exercise",
    kind: "motor_control", region: "ankle_foot", perSide: true, sets: 3, reps: 10, hold: 5,
    purpose: ["يعلّم عضلاتِ القدم الداخلية أن ترفع القوسَ وتثبّته دون ثني الأصابع — أوّلُ مرحلةٍ في برنامج التقوية الذي اتّفق عليه خبراء ألم الكعب (Osborne 2023 — إجماعُ خبراء لا تجربة)؛ واستعملته تجربةٌ مصرية مع الشريط ورفع الكعب ثلاثَ مرّاتٍ في الأسبوع ثمانيةَ أسابيع فتحسّنت وضعيةُ القدم أكثر وتساوى الألم (Ibraheem 2026).",
      "Teaches the intrinsic foot muscles to raise and hold the arch without curling the toes — stage one of the strengthening programme agreed by heel-pain experts (Osborne 2023 — expert consensus, not a trial); an Egyptian trial used it with taping and heel raises three times a week for eight weeks, improving foot posture more with similar pain (Ibraheem 2026)."],
    start: ["جالسٌ على كرسيّ والقدمُ حافيةٌ مسطّحة على الأرض، والركبةُ فوق القدم.",
      "Sitting on a chair with the bare foot flat on the floor, the knee above the foot."],
    steps: [[
      "اسحب قاعدةَ الإصبع الكبير نحو الكعب فيقصر طولُ القدم ويرتفع القوس.",
      "الأصابعُ ممدودةٌ مرتخية على الأرض لا تنثني.",
      "اثبت ٥ ثوانٍ وتنفّس.",
      "أرخِ، ثمّ كرّر ١٠ مرّات × ٣ مجموعات.",
    ], [
      "Draw the ball of the big toe towards the heel so the foot shortens and the arch rises.",
      "Keep the toes long and relaxed on the floor — do not curl them.",
      "Hold for 5 seconds and breathe.",
      "Relax, then repeat 10 times × 3 sets.",
    ]],
    cues: [[
      "ثنيُ الأصابع بدل رفع القوس ⟵ الأصابعُ مستقيمة والحركةُ من منتصف القدم.",
      "رفعُ قاعدة الإصبع الكبير عن الأرض ⟵ تبقى ملامسةً للأرض.",
      "دورانُ الركبة للخارج ⟵ الركبةُ ثابتةٌ فوق القدم.",
    ], [
      "Curling the toes instead of raising the arch → toes straight, the movement from the middle of the foot.",
      "Lifting the ball of the big toe off the floor → it stays in contact with the floor.",
      "The knee rolling out → knee still, above the foot.",
    ]],
    easier: ["المعالجُ يشكّل القوسَ بيده أوّلاً ليشعر المريضُ بالحركة.", "The therapist shapes the arch by hand first so the patient feels the movement."],
    harder: ["واقفاً على القدمين، ثمّ على القدم المصابة وحدها (٣ × ٦–١٠ — Osborne 2023).", "Standing on both feet, then on the affected foot alone (3 × 6–10 — Osborne 2023)."],
    stopIf: ["تشنّجٌ أو ألمٌ حادّ في القوس يبقى بعد التمرين.", "Cramp or sharp arch pain that persists after the exercise."],
    equipment: ["كرسيّ.", "A chair."],
    doseNote: ["١٠ مرّات × ثباتُ ٥ ثوانٍ × ٣ جالساً، ثمّ واقفاً؛ ويُتقدَّم حين لا يكون صعوبةٌ ولا ألم (قاعدةُ Osborne 2023).", "10 times × a 5-second hold × 3 seated, then standing; progress when there is no difficulty or pain (the Osborne 2023 rule)."],
    images: [{ key: "short-foot-1", ar: "قدمٌ حافية على الأرض والقوسُ مرتفعٌ والأصابعُ ممدودة (القدم القصيرة)", en: "A bare foot on the floor with the arch raised and the toes long (short foot)", search: "short foot exercise arch raise intrinsic" }],
  },
  {
    code: "low-dye-taping", nameAr: "الشريط اللاصق المضادّ لهبوط القوس (Low-Dye)", nameEn: "Low-Dye taping",
    kind: "functional", region: "ankle_foot", perSide: true, homeSuitable: false,
    purpose: ["يسند القوسَ ويخفّف الشدَّ على اللفافة مؤقّتاً فيخفّ ألمُ الخطوة الأولى أيّاماً — درجةُ A في الدليل للمدى القصير (حتى ستّة أسابيع) مع العلاج لا وحده، ومن أساس الدليل البريطانيّ (Morrissey 2021)؛ والأثرُ في أسبوعٍ واحد أقلُّ من الفرق المهمّ للمريض (Radford 2006: ١٢ ملم من ١٠٠) — فهو يسهّل البدءَ بالتمارين ولا يعالج وحده.",
      "Supports the arch and briefly offloads the fascia so first-step pain eases for a few days — grade A in the guideline for the short term (up to six weeks) with other treatment, not alone, and part of the core of the British guide (Morrissey 2021); the one-week effect is smaller than the change that matters to patients (Radford 2006: 12 mm out of 100) — so it eases the start of exercise and does not treat on its own."],
    start: ["المريضُ مستلقٍ على بطنه أو جالسٌ والقدمُ خارج حافّة السرير، والكاحلُ بزاويةٍ قائمة، والجلدُ نظيفٌ جافٌّ بلا زيت.",
      "The patient lying face down or sitting with the foot over the edge of the bed, the ankle at a right angle, the skin clean, dry and free of oil."],
    steps: [[
      "شريطُ تثبيتٍ حول مقدّم القدم من قاعدة الإصبع الصغير إلى قاعدة الإصبع الكبير على جانب القدم، بلا شدٍّ يلتفّ حول القدم كلِّها.",
      "شريطان أو ثلاثةٌ من الجانب الخارجيّ لشريط التثبيت، حول الكعب من الخلف، إلى الجانب الداخليّ — وجانبُ الإصبع الكبير مدفوعٌ إلى الأسفل قليلاً فيرتفع القوس.",
      "شرائطُ عرضية تحت القوس من الخارج إلى الداخل، كلٌّ يغطّي نصفَ ما قبله.",
      "شريطُ تثبيتٍ أخير فوق الأوّل، ثمّ يمشي المريضُ ويُسأل عن الراحة ولونُ الأصابع يُفحص.",
      "يبقى يومين إلى ثلاثة، ويُنزع بلطفٍ بالماء الدافئ.",
    ], [
      "An anchor strip around the forefoot from the base of the little toe to the base of the big toe along the side of the foot, without tension and not encircling the whole foot.",
      "Two or three strips from the outer side of the anchor, around the back of the heel, to the inner side — with the big-toe side pushed down a little so the arch rises.",
      "Cross strips under the arch from outside to inside, each covering half of the one before.",
      "A final anchor strip over the first, then the patient walks, is asked about comfort, and toe colour is checked.",
      "Leave it for two to three days and remove it gently with warm water.",
    ]],
    cues: [[
      "شدٌّ زائد يلتفّ حول القدم ⟵ خدرٌ أو ازرقاقٌ في الأصابع: يُنزع ويُعاد أرخى.",
      "تجاعيدُ في الشريط ⟵ فقاعاتٌ في الجلد: يُفرد الشريطُ ملساً.",
      "جلدٌ مبلّلٌ أو مدهون ⟵ يسقط الشريط: يُنظَّف ويُجفَّف أوّلاً.",
    ], [
      "Too much tension around the foot → numb or blue toes: remove and reapply looser.",
      "Wrinkles in the tape → skin blisters: lay the tape smooth.",
      "Wet or oily skin → the tape falls off: clean and dry first.",
    ]],
    easier: ["الشريطُ المطّاطيّ (Kinesio) بدل الصلب — والدليلُ يقبل الاثنين.", "Elastic (kinesiology) tape instead of rigid — the guideline accepts both."],
    harder: ["يتعلّمه أحدُ أفراد الأسرة فيعيده في البيت بعد أن يراه المعالج.", "A family member learns it and reapplies it at home after the therapist has checked it."],
    stopIf: ["حكّةٌ أو احمرارٌ أو فقاعة، أو خدرٌ أو تغيّرُ لون الأصابع، أو حساسيةٌ من اللاصق؛ والسكّريُّ مع ضعف الإحساس أو جلدٍ رقيق — بحذرٍ وفحصٍ يوميّ.", "Itch, redness or a blister, numbness or a change in toe colour, or adhesive allergy; diabetes with reduced sensation or thin skin — with caution and a daily skin check."],
    equipment: ["شريطٌ صلب (أكسيد الزنك) بعرض ٢٫٥–٣٫٨ سم، ومقصّ.", "Rigid zinc oxide tape 2.5–3.8 cm wide, and scissors."],
    doseNote: ["يُجدَّد كلَّ ٢–٣ أيّام في المرحلتين الأولى والثانية — حتى ستّة أسابيع إن ظلّ يريح.", "Renewed every 2–3 days in phases one and two — up to six weeks while it still helps."],
    images: [{ key: "low-dye-taping-1", ar: "قدمٌ ملفوفةٌ بالشريط اللاصق حول مقدّمها والكعب وتحت القوس (Low-Dye)", en: "A foot taped around the forefoot, the heel and under the arch (Low-Dye)", search: "low dye taping plantar fasciitis foot" }],
  },
  {
    code: "night-splint", nameAr: "جبيرة الليل لإبقاء الكاحل والأصابع مرفوعةً إلى الأعلى", nameEn: "Dorsiflexion night splint",
    kind: "functional", region: "ankle_foot", perSide: true,
    purpose: ["تبقي الكاحلَ بزاويةٍ قائمة أو أكثرَ قليلاً طوال الليل فلا تنكمش اللفافةُ وعضلةُ الساق في النوم، فيخفّ ألمُ الخطوة الأولى — درجةُ A في الدليل لمن ألمُ خطوته الأولى ثابتٌ كلَّ صباح، شهراً إلى ثلاثة (Powell 1998 · Batt 1996)؛ ولم تُضف شيئاً فوق مسكّنٍ وتمطيطٍ ونصيحة حذاءٍ عند ١٢ أسبوعاً (Probe 1999) — فليست لكلّ مريض.",
      "Keeps the ankle at a right angle or slightly beyond through the night so the fascia and calf do not shorten during sleep, easing first-step pain — grade A in the guideline for people whose first-step pain is present every morning, for one to three months (Powell 1998 · Batt 1996); it added nothing to a painkiller, stretching and shoe advice at 12 weeks (Probe 1999) — so it is not for every patient."],
    start: ["قبل النوم، جالسٌ على السرير، والجبيرةُ الجاهزة (خلفية أو جوربٌ بشريط) بمقاس القدم — ويمكن أن يصنعها قسمُ المساند في المركز.",
      "At bedtime, sitting on the bed, with a ready-made splint (posterior shell or a strapped sock) sized to the foot — the centre's orthotics department can make one."],
    steps: [[
      "ضع القدمَ في الجبيرة والكعبُ في آخرها.",
      "اربط الأشرطةَ من الكاحل ثمّ القدم ثمّ الساق، بإحكامٍ لا يضغط.",
      "اضبط الزاويةَ قائمةً (٩٠°)، ويُشدّ شريطُ الأصابع قليلاً إن وُجد.",
      "إن صعب النومُ بها: ساعةٌ أو ساعتان مساءً تزيد كلَّ ليلة حتى الليل كلِّه.",
      "انزعها قبل أن تمشي ليلاً إلى الحمّام، وافحص الجلدَ صباحاً.",
    ], [
      "Place the foot in the splint with the heel at the back.",
      "Fasten the straps at the ankle, then the foot, then the leg — snug, not tight.",
      "Set the angle to a right angle (90°), with the toe strap slightly tight if it has one.",
      "If sleep is hard with it: one to two hours in the evening, adding time each night until it is worn all night.",
      "Take it off before walking to the bathroom at night, and check the skin in the morning.",
    ]],
    cues: [[
      "شدُّ الأشرطة بقوّة ⟵ خدرٌ أو برودةٌ في الأصابع: أرخِها.",
      "الكعبُ مرتفعٌ عن قاع الجبيرة ⟵ أعد إدخالَه حتى آخرها.",
      "المشيُ بالجبيرة ⟵ تُنزع قبل أيّ خطوة (خطرُ السقوط).",
    ], [
      "Straps pulled tight → numb or cold toes: loosen them.",
      "The heel lifting off the base of the splint → push it back to the end.",
      "Walking in the splint → take it off before any step (fall risk).",
    ]],
    easier: ["زاويةٌ أقلّ (حتى الوضع المريح) في الليالي الأولى.", "A smaller angle (just to comfort) for the first nights."],
    harder: ["خمسُ درجاتٍ بعد القائمة إن كانت مريحة.", "Five degrees beyond a right angle if comfortable."],
    stopIf: ["ألمٌ أو تورّمٌ في بطن الساق (خثرة — إلى الطبيب فوراً)، أو جرحٌ أو احمرارٌ في الجلد، أو خدرٌ يبقى صباحاً.", "Pain or swelling in the calf (clot — to the doctor at once), a sore or redness on the skin, or numbness that persists in the morning."],
    equipment: ["جبيرةُ ليلٍ جاهزة أو مصنوعة في قسم المساند.", "A ready-made night splint, or one made by the orthotics department."],
    doseNote: ["كلَّ ليلة شهراً إلى ثلاثة، لمن ألمُ خطوته الأولى ثابت.", "Every night for one to three months, for those with consistent first-step pain."],
    images: [{ key: "night-splint-1", ar: "قدمٌ في جبيرة ليلٍ خلفية تُبقي الكاحلَ بزاويةٍ قائمة", en: "A foot in a posterior night splint holding the ankle at a right angle", search: "plantar fasciitis night splint dorsiflexion" }],
  },
];

const PAIN_HOLD_AR = "قاعدةُ الألم في التحميل (على نمط نموذج مراقبة الألم — Silbernagel 2007 في وتر العرقوب، ولم يُختبر في الكعب): الألمُ أثناء التمرين وبعده حتى ٥ من ١٠ مقبول، ولا يكون ألمُ الخطوة الأولى صباحَ الغد أسوأ ممّا كان، ولا يزيد أسبوعاً بعد أسبوع ⟵ يُتقدَّم؛ وإن زاد صباحَ الغد ⟵ يبقى الحملُ كما هو؛ ومرّتين متتاليتين ⟵ يُخفَّف. والتمرينُ الثابت لا يخفّف الألمَ فوراً (Riel 2018) فلا يُعطى لذلك.";
const PAIN_HOLD_EN = "Load and pain rule (modelled on the pain-monitoring model — Silbernagel 2007 in the Achilles, not tested in the heel): pain up to 5/10 during and after exercise is acceptable, as long as first-step pain the next morning is no worse than before and it does not rise week on week → progress; if it is worse the next morning → keep the load; twice in a row → reduce it. Isometric exercise does not relieve pain immediately (Riel 2018), so it is not given for that.";
const EXTEND_AR = "وفي الجلسة ١٨: تمديدٌ واحد بستّ جلسات (حتى ٢٤) إن لم يتحقّق واحدٌ أو أكثر من معايير الخروج وكان ما يزال يتحسّن — ألمُ الخطوة الأولى نقص نقطتين فأكثر منذ الجلسة ١٢ (نحو الفرق المهمّ للمريض: ١٩ ملم من ١٠٠ — Landorf 2024)، أو زاد التحميلُ مستوىً — أو لم تكتمل جلساتُ الموجات الصادمة الثلاث؛ ولا تمديدَ لمن ثبت بلا تغيّرٍ ستَّ جلسات: يُراجَع التشخيصُ (العصب، كسرُ الإجهاد، وسادةُ الكعب، الالتهابُ المفصليّ) ويُحال إلى الطبيب.";
const EXTEND_EN = "At session 18: one extension of six sessions (to 24) if one or more discharge criteria are unmet and the patient is still improving — first-step pain down 2 points or more since session 12 (about the change that matters to patients: 19 mm out of 100 — Landorf 2024), or a loading level gained — or if the three shockwave sessions are not complete; no extension for a patient with no change over six sessions: recheck the diagnosis (nerve, stress fracture, fat pad, inflammatory arthritis) and refer to the doctor.";

export const PROTOCOL: ProtocolContentSeed = {
  code: "plantar-heel-pain-adult",
  summary: [
    "ألمُ الكعب الأخمصيّ (التهابُ اللفافة الأخمصية — Plantar heel pain / plantar fasciitis) عند البالغين: ألمٌ أسفل الكعب من جهته الداخلية يشتدّ مع الخطوات الأولى بعد النوم أو الجلوس وبعد الوقوف الطويل. أكثرُه يتحسّن بالعلاج غير الجراحيّ خلال أشهر (Davis 1994: ٨٩٫٥٪ خلال نحو أحدَ عشرَ شهراً)، لكنّه قد يطول: في مستشفىً بقيت الأعراضُ عند ثمانين بالمئة بعد سنة وعند نصفهم بعد خمس (Hansen 2018). " +
    "الدليلُ الإرشاديّ الأحدث للمعالجين (JOSPT 2023): العلاجُ اليدويّ والتمطيطُ (اللفافةُ وعضلةُ الساق) والشريطُ اللاصق وجبيرةُ الليل بدرجة A، والليزرُ والإبرُ الجافّة والتقويةُ بالمقاومة لعضلات القدم والكاحل بدرجة B، والدعاماتُ (الفرشاتُ الطبية) لا تُستعمل وحدها، والأمواجُ فوق الصوتية لا تُستعمل (A ضدّ). " +
    "والموجاتُ الصادمة خارجَ نطاق دليل المعالجين: يضعها الدليلُ البريطانيّ (Morrissey 2021) خطوةً ثانية لمن لم يتحسّن بالأساس، وتراها جمعيةُ جرّاحي القدم الأمريكية آمنةً وفعّالة لكن ليست أوّلَ علاجٍ في الحادّ (ACFAS 2018)، وكان التمطيطُ أفضلَ منها في الحادّ (Rompe 2010)، وهي وحدها التي بقي أثرُها على المدى المتوسّط والطويل في تحليلٍ مجمّع كبير (Guimarães 2023). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ وإدارةُ الحمل، وتمطيطُ اللفافة والساق، والعلاجُ اليدويّ، والشريط، ثمّ التقويةُ بالحمل العالي يوماً بعد يوم (Rathleff 2015) — والموجاتُ الصادمة مرّةً في الأسبوع لمن تجاوزت أعراضُه ستّةَ أسابيع، والليزرُ والإبرُ الجافّة والمغناطيسُ مساعدة. ثلاثُ مراحل بمعايير رقمية: تهدئةُ الألم وبدءُ التحميل، ثمّ التحميلُ المتدرّج، ثمّ الوظيفةُ والعودةُ إلى الوقوف والعمل.",
    "Plantar heel pain (plantar fasciitis) in adults: pain under the inner heel that is worst with the first steps after sleep or sitting and after long standing. Most cases improve with non-surgical care over months (Davis 1994: 89.5% within about eleven months), but it can last: in a hospital cohort symptoms remained in eighty per cent at one year and in half at five (Hansen 2018). " +
    "The latest physiotherapy guideline (JOSPT 2023): manual therapy, stretching (fascia and calf), taping and night splints at grade A; laser, dry needling and resistance training of the foot and ankle muscles at grade B; foot orthoses not used on their own; and therapeutic ultrasound not used (A against). " +
    "Shockwave lies outside the therapists' guideline: the British best-practice guide (Morrissey 2021) makes it a second step for those not improving on the core approach, the American College of Foot and Ankle Surgeons judges it safe and effective but not a first treatment in acute cases (ACFAS 2018), stretching beat it in acute cases (Rompe 2010), and it was the only treatment whose effect lasted into the medium and long term in a large meta-analysis (Guimarães 2023). " +
    "So the protocol: a core in every session — education and load management, fascia and calf stretching, manual therapy and taping, then high-load strengthening every other day (Rathleff 2015) — with shockwave once a week for those whose symptoms have lasted more than six weeks, and laser, dry needling and magnetic therapy as adjuncts. Three phases with numeric criteria: settling pain and starting load, then progressive loading, then function and return to standing and work.",
  ],
  goals: [
    "• ألمُ الخطوة الأولى صباحاً ينقص نقطتين فأكثر من ١٠ (نحو الفرق المهمّ للمريض: ١٩ ملم من ١٠٠ — Landorf 2010 · Landorf 2024) ويبلغ ٢ أو أقلّ.\n" +
    "• الوقوفُ والمشيُ في العمل والبيت بلا ألمٍ يحدّهما، والعودةُ إلى المشي للرياضة إن كان يمشي.\n" +
    "• رفعُ الكعب على الساق المصابة بالحمل العالي (١٠ مرّات × ٤ بحمل) وبرنامجٌ منزليّ يُكمله حتى الأسبوع ١٢.\n" +
    "• فهمُ الحالة وإدارةُ الحمل: فتراتُ وقوفٍ تُكسر، وحذاءٌ مريحٌ بفرقٍ صغير بين الكعب ومقدّم القدم (Morrissey 2021)، والوزنُ إن كان زائداً.\n" +
    "• منعُ العودة: يعرف ماذا يفعل إن عاد ألمُ الصباح.",
    "• First-step morning pain down 2 points or more out of 10 (about the change that matters to patients: 19 mm out of 100 — Landorf 2010 · Landorf 2024) and at 2 or less.\n" +
    "• Standing and walking at work and home without pain limiting them, and a return to walking for exercise if that was the habit.\n" +
    "• A high-load single-leg heel raise on the affected side (10 × 4 with load) and a home programme continued to week 12.\n" +
    "• Understanding the condition and managing load: breaking up long standing, comfortable footwear with a small heel-to-forefoot drop (Morrissey 2021), and weight if it is high.\n" +
    "• Preventing recurrence: knowing what to do if morning pain returns.",
  ],
  assessment: [
    "• التشخيصُ سريريّ (JOSPT 2023 · ACFAS 2018): ألمٌ أسفل الكعب من الداخل أشدُّه مع الخطوات الأولى وبعد الوقوف الطويل، وبدأ بعد زيادة الوقوف أو المشي، وألمٌ بالضغط على منشأ اللفافة؛ واختبارُ الرافعة (رفعُ الإصبع الكبير واقفاً) إن أعاد الألمَ فهو قويّ الدلالة وإن لم يُعده لا ينفي (حساسيته ٣٢٪ وخصوصيته ١٠٠٪ — De Garceau 2003)؛ واختبارُ النفق الرسغيّ (ثنيُ الكاحل للأعلى مع قلب القدم للخارج ٥–١٠ ثوانٍ — Kinoshita 2001) سلبيّ.\n" +
    "• الأشعّةُ لا تلزم في البداية، والشوكةُ العظمية لا تغيّر العلاج (ACFAS 2018)؛ والسونارُ عند الشكّ: سماكةُ اللفافة فوق ٤ ملم (McMillan 2009) — وأقلُّ خصوصيةً في السكّري لأنّ اللفافةَ أسمكُ عنده عموماً (Bozkuş 2025).\n" +
    "• عواملُ الخطر: الوزنُ (مؤشّرُ كتلة الجسم فوق ٢٧ يرفع الخطرَ ثلاثةَ أضعاف ونصفاً — van Leeuwen 2016، وفوق ٣٠ خمسةَ أضعاف ونصفاً — Riddle 2003)، والوقوفُ أكثرَ يوم العمل (Riddle 2003)، والقدمُ المنبسطة (Irving 2007)؛ وفي الرمادي كان أكثرُ المصابات بوزنٍ فوق ٣٠ (Abdulazeez 2021). ونقصُ عطف الكاحل متضاربُ الدليل (Riddle 2003 · Irving 2007 · Hamstra-Wright 2021) — يُقاس ويُعالج إن نقص.\n" +
    "• الفحص: عطفُ الكاحل والركبةُ ممدودةٌ ومثنيّة، واختبارُ الطعنة نحو الحائط بالسنتيمتر (أدنى تغيّرٍ حقيقيّ ١٫٦–١٫٩ سم — Powden 2015)، وعددُ رفعات الكعب على ساقٍ واحدة حتى التعب (الطبيعيّ ٢٥ فأكثر — Lunsford 1995؛ والوسيط ٢٤ للرجال و٢١ للنساء — Hébert-Losier 2017)، ووضعيةُ القدم، والوقوفُ على ساق، والمشي.\n" +
    "• المقاييسُ المزروعة: قدرةُ القدم والكاحل (FAAM-ADL — وبالعربية Althagafi 2025؛ أدنى تغيّرٍ حقيقيّ نحو ٦ نقاط — Martin 2005) وعطفُ الكاحل. ويضيف المشرف: ألمَ الخطوة الأولى من ١٠ (الفرقُ المهمّ نحو نقطتين)، ومؤشّرَ وظيفة القدم بالعربية (FFI — Khan 2022؛ الفرقُ المهمّ في المجموع ٦٫٥ — Landorf 2008) أو استبيانَ صحّة القدم بالعربية المجرَّبَ في هذه الحالة (FHSQ — Alshammari 2023؛ الفرقُ المهمّ للألم ١٢٫٤ — Landorf 2024)، أو مقياسَ الطرف السفليّ بالعربية (LEFS — Alnahdi 2016؛ الفرقُ المهمّ ٩ — Binkley 1999).\n" +
    "• يُعاد التقييمُ في الجلسات ٦ و١٢ و١٨، ثمّ عند الأسبوع ١٢.",
    "• Diagnosis is clinical (JOSPT 2023 · ACFAS 2018): pain under the inner heel worst with the first steps and after long standing, starting after more standing or walking, with tenderness at the fascia insertion; the windlass test (lifting the big toe in standing) is strong evidence when it reproduces the pain but does not rule it out when it does not (sensitivity 32%, specificity 100% — De Garceau 2003); the tarsal tunnel test (ankle up with the foot turned out for 5–10 seconds — Kinoshita 2001) is negative.\n" +
    "• X-rays are not needed at the start and a heel spur does not change treatment (ACFAS 2018); ultrasound if in doubt: fascia thicker than 4 mm (McMillan 2009) — less specific in diabetes, where the fascia is generally thicker (Bozkuş 2025).\n" +
    "• Risk factors: weight (BMI over 27 raises the risk about three and a half times — van Leeuwen 2016, over 30 about five and a half times — Riddle 2003), standing for most of the working day (Riddle 2003), and a flat, pronated foot (Irving 2007); in Ramadi most affected women had a BMI over 30 (Abdulazeez 2021). Limited ankle dorsiflexion has conflicting evidence (Riddle 2003 · Irving 2007 · Hamstra-Wright 2021) — measure it and treat it if limited.\n" +
    "• Examination: ankle dorsiflexion with the knee straight and bent, the knee-to-wall lunge in centimetres (minimal detectable change 1.6–1.9 cm — Powden 2015), single-leg heel raises to fatigue (normal 25 or more — Lunsford 1995; median 24 in men and 21 in women — Hébert-Losier 2017), foot posture, single-leg stance and gait.\n" +
    "• Seeded measures: the Foot and Ankle Ability Measure (FAAM-ADL — Arabic, Althagafi 2025; minimal detectable change about 6 points — Martin 2005) and ankle dorsiflexion. The supervisor adds: first-step pain out of 10 (important change about 2 points), the Arabic Foot Function Index (FFI — Khan 2022; important change in the total 6.5 — Landorf 2008) or the Arabic Foot Health Status Questionnaire tested in this condition (FHSQ — Alshammari 2023; important change for pain 12.4 — Landorf 2024), or the Arabic Lower Extremity Functional Scale (LEFS — Alnahdi 2016; important change 9 — Binkley 1999).\n" +
    "• Reassess at sessions 6, 12 and 18, then at week 12.",
  ],
  exercises: [
    "البرنامجُ في «البرنامج على مراحل» بالبطاقات وجرعتها: تمطيطُ اللفافة الأخمصية جالساً ثلاثَ مرّاتٍ يومياً وأوّلُها قبل الخطوة الأولى، وتمطيطُ عضلة الساق (والركبةُ ممدودةٌ ثمّ مثنيّة)، والعلاجُ اليدويّ للمفاصل والأنسجة (A — Cleland 2009 · Renan-Ordine 2011)، والشريطُ في الأسابيع الأولى؛ ثمّ التقويةُ: رفعُ الكعبين ثمّ رفعُ الكعب على ساقٍ واحدة بالحمل العالي ومنشفةٌ تحت الأصابع يوماً بعد يوم (١٢ × ٣ ثمّ ١٠ × ٤ ثمّ ٨ × ٥ — Rathleff 2015 · Riel 2019)، وتمارينُ القدم (القدمُ القصيرة وجمعُ المنشفة)، والمطّاطُ للكاحل، والتوازن، والطعنةُ نحو الحائط إن نقص عطفُ الكاحل؛ ثمّ المشيُ المتدرّج والدرّاجة. " +
    "وجبيرةُ الليل لمن ألمُ خطوته الأولى ثابت. والفرشاتُ الطبية (من قسم المساند) مع العلاج لا وحدها، والجاهزةُ كالمفصَّلة (Landorf 2006 · Whittaker 2018 · Rasenberg 2021)، والصندلُ المشكَّلُ على القوس كالفرشة (Vicenzino 2015). والبرنامجُ المنزليّ حتى الأسبوع ١٢، والتقويةُ تستمرّ حتى النتيجة المرضية ثمّ أربعةَ أسابيع (Riel 2023).",
    "The programme is under 'Programme by phase' with its cards and doses: seated plantar fascia stretching three times a day with the first before the first step, calf stretching (knee straight, then bent), manual therapy to the joints and soft tissues (A — Cleland 2009 · Renan-Ordine 2011), and taping in the early weeks; then strengthening: double-leg heel raises, then the high-load single-leg heel raise with a towel under the toes every other day (12 × 3, then 10 × 4, then 8 × 5 — Rathleff 2015 · Riel 2019), foot exercises (short foot and towel curls), band work for the ankle, balance, and the knee-to-wall lunge if dorsiflexion is limited; then graded walking and cycling. " +
    "A night splint for those with consistent first-step pain. Foot orthoses (from the orthotics department) with treatment, not alone, with prefabricated equal to custom (Landorf 2006 · Whittaker 2018 · Rasenberg 2021), and contoured sandals equal to insoles (Vicenzino 2015). The home programme continues to week 12, and strengthening continues until a satisfactory result and then four more weeks (Riel 2023).",
  ],
  contraindications: [
    "يُوقف ويُحال قبل البدء أو أثناءه:\n" +
    "• كسرُ إجهادٍ في عظم الكعب: ألمٌ بعصر جانبي الكعب أو بالمشي بعد زيادةٍ مفاجئة في المشي أو الجري أو مع هشاشة العظم — ولم يُوجد اختبارٌ مثبَت الدقّة (بحثٌ صفريّ مكتوب)، فالشكُّ وحده يكفي للإحالة والأشعّة.\n" +
    "• ألمٌ عصبيّ: حرقةٌ أو خدرٌ أو تنميل، أو اختبارُ النفق الرسغيّ إيجابيّ، أو ألمٌ ينزل من الظهر (اعتلالُ الجذر S1) — Alshami 2008؛ يُقيَّم العصب.\n" +
    "• التهابٌ مفصليّ: الكعبان معاً عند شابّ، أو تيبّسٌ صباحيّ طويل، أو ألمٌ في الظهر ليلاً، أو تورّمٌ في مفاصل أخرى — إلى الطبيب (JOSPT 2023).\n" +
    "• «طقّة» مفاجئة وكدمةٌ تحت القوس بعد حقنة كورتيزون (تمزّقُ اللفافة — Acevedo 1998).\n" +
    "• ألمٌ ليليّ أو في الراحة لا يتغيّر، أو حمّى، أو احمرارٌ وحرارة، أو جرحٌ أو قرحةٌ في قدم السكّري.\n" +
    "• للموجات الصادمة موانعُها في «الأجهزة» (نشرةُ الشركة وISMST — Auersperg 2020).",
    "Stop and refer before or during treatment for:\n" +
    "• Calcaneal stress fracture: pain on squeezing the sides of the heel, or on walking after a sudden increase in walking or running, or with osteoporosis — no test of proven accuracy was found (a documented zero result), so suspicion alone is enough to refer for imaging.\n" +
    "• Nerve pain: burning, numbness or tingling, a positive tarsal tunnel test, or pain travelling from the back (S1 radiculopathy) — Alshami 2008; assess the nerve.\n" +
    "• Inflammatory arthritis: both heels in a young person, long morning stiffness, night back pain, or swelling in other joints — to the doctor (JOSPT 2023).\n" +
    "• A sudden 'pop' and bruising under the arch after a cortisone injection (fascia rupture — Acevedo 1998).\n" +
    "• Night or resting pain that does not change, fever, redness and heat, or a wound or ulcer on a diabetic foot.\n" +
    "• Shockwave contraindications are listed under the device (the manufacturer's insert and ISMST — Auersperg 2020).",
  ],
  precautions: [
    PAIN_HOLD_AR + "\n" +
    "• وسادةُ الكعب (Heel fat pad): ألمٌ في وسط الكعب يزيد حافياً على أرضٍ صلبة — حالةٌ أخرى بلا تجارب (Chang 2022) — تُفرَّق، ولا يُطبَّق عليها هذا البروتوكولُ كما هو.\n" +
    "• حقنُ الكورتيزون: نفعُها شهرٌ أو أقلّ (David 2017)، وبحدٍّ أقصى ٢–٣ في السنة لخطر تمزّق اللفافة وضمور وسادة الكعب (ACFAS 2018)؛ ولا موجاتٍ صادمة على موضع حقنةٍ حديثة.\n" +
    "• الإبرُ الجافّة: آثارٌ عابرة خفيفة في ثلث الجلسات (Cotchett 2014) — ألمٌ وكدمة؛ وتعقيمٌ كامل، وحذرٌ في السكّري ومميّعات الدم.\n" +
    "• الشريطُ وجبيرةُ الليل: الجلدُ يُفحص، وألمُ بطن الساق وتورّمُه مع الجبيرة إلى الطبيب فوراً.\n" +
    "• السجودُ والصلاة: لا دراسةَ عن الصلاة وألم الكعب (بحثٌ صفريّ مكتوب)؛ وإن آلم الجلوسُ على الأصابع المثنيّة إلى الخلف تُقصَّر مدّتُه حتى يخفّ — اقتراحٌ لا دليل. والمشيُ حافياً على البلاط في البيت والمسجد يُستبدل بنعالٍ مريح.\n" +
    "• التوقّعُ الصادق: أكثرُ التجارب تقيس عند ٦–١٢ أسبوعاً، والتحسّنُ يأخذ أسابيع إلى أشهر (Morrissey 2021)، وقليلٌ بلغوا حالةً مرضية بالتقوية وحدها عند ١٢ أسبوعاً (Riel 2019) — ومَن لم يتحسّن بعد ستّة أشهر من العلاج المناسب يُحال إلى الطبيب (ACFAS 2018).",
    PAIN_HOLD_EN + "\n" +
    "• Heel fat pad: pain in the centre of the heel, worse barefoot on hard floors — a different condition without trials (Chang 2022) — tell it apart, and do not apply this protocol to it unchanged.\n" +
    "• Cortisone injections: benefit lasts a month or less (David 2017), with a maximum of 2–3 a year because of fascia rupture and fat-pad atrophy (ACFAS 2018); no shockwave over a recent injection site.\n" +
    "• Dry needling: minor transient effects in a third of appointments (Cotchett 2014) — soreness and bruising; full asepsis, and caution with diabetes and blood thinners.\n" +
    "• Taping and the night splint: check the skin; calf pain and swelling while using the splint → to the doctor at once.\n" +
    "• Prostration and prayer: there is no study of prayer and heel pain (a documented zero result); if sitting on toes bent back is painful, shorten it until it eases — a suggestion, not evidence. Walking barefoot on tiles at home and in the mosque is replaced by comfortable slippers.\n" +
    "• Honest expectations: most trials measure at 6–12 weeks, improvement takes weeks to months (Morrissey 2021), and few reached a satisfactory state with strengthening alone at 12 weeks (Riel 2019) — anyone not improving after six months of appropriate care is referred to the doctor (ACFAS 2018).",
  ],
  //  ١٨ جلسة × ستّ في الأسبوع = ثلاثةُ أسابيع — اختيارُ خدمةٍ داخل ما نفع (٦–٢٤ جلسة مشرَفة)، والبرنامجُ المنزليّ حتى الأسبوع ١٢.
  spw: 6, weeks: 3, minutes: 50, totalSessions: 18,
  refs: [
    { title: "Heel Pain — Plantar Fasciitis: Revision 2023 (Clinical Practice Guidelines)", org: "JOSPT / APTA Orthopaedics (Koc et al.)", year: 2023, url: "https://doi.org/10.2519/jospt.2023.0303" },
    { title: "Heel Pain — Plantar Fasciitis: Revision 2014 (Clinical Practice Guidelines)", org: "JOSPT / APTA Orthopaedics (Martin et al.)", year: 2014, url: "https://doi.org/10.2519/jospt.2014.0303" },
    { title: "Extracorporeal shockwave therapy for refractory plantar fasciitis (Interventional procedures guidance IPG311)", org: "NICE", year: 2009, url: "https://www.nice.org.uk/guidance/ipg311" },
    { title: "Management of plantar heel pain: a best practice guide informed by a systematic review, expert clinical reasoning and patient values", org: "British Journal of Sports Medicine (Morrissey et al.)", year: 2021, url: "https://doi.org/10.1136/bjsports-2019-101970" },
    { title: "ACFAS Clinical Consensus Statement: Diagnosis and Treatment of Adult Acquired Infracalcaneal Heel Pain", org: "Journal of Foot and Ankle Surgery (Schneider et al. — ACFAS)", year: 2018, url: "https://doi.org/10.1053/j.jfas.2017.10.018" },
    { title: "Effects of therapeutic interventions on pain due to plantar fasciitis: a systematic review and meta-analysis", org: "Clinical Rehabilitation (Guimarães et al.)", year: 2023, url: "https://doi.org/10.1177/02692155221143865" },
    { title: "Painful heel syndrome: results of nonoperative treatment", org: "Foot & Ankle International (Davis et al.)", year: 1994, url: "https://doi.org/10.1177/107110079401501002" },
    { title: "Long-Term Prognosis of Plantar Fasciitis: A 5- to 15-Year Follow-up Study of 174 Patients With Ultrasound Examination", org: "Orthopaedic Journal of Sports Medicine (Hansen et al.)", year: 2018, url: "https://doi.org/10.1177/2325967118757983" },
    { title: "Plantar fascia-specific stretching versus radial shock-wave therapy as initial treatment of plantar fasciopathy", org: "Journal of Bone and Joint Surgery (Rompe et al.)", year: 2010, url: "https://doi.org/10.2106/JBJS.I.01651" },
    { title: "Radial shock wave treatment alone is less efficient than radial shock wave combined with plantar fascia stretching", org: "International Journal of Surgery (Rompe et al.)", year: 2015, url: "https://doi.org/10.1016/j.ijsu.2015.04.082" },
    { title: "High-load strength training improves outcome in patients with plantar fasciitis: a randomized controlled trial with 12-month follow-up", org: "Scandinavian Journal of Medicine & Science in Sports (Rathleff et al.)", year: 2015, url: "https://doi.org/10.1111/sms.12313" },
    { title: "Self-dosed and pre-determined progressive heavy-slow resistance training have similar effects in people with plantar fasciopathy", org: "Journal of Physiotherapy (Riel et al.)", year: 2019, url: "https://doi.org/10.1016/j.jphys.2019.05.011" },
    { title: "Corticosteroid injection plus exercise versus exercise, beyond advice and a heel cup for patients with plantar fasciopathy: a randomised clinical superiority trial", org: "British Journal of Sports Medicine (Riel et al.)", year: 2023, url: "https://doi.org/10.1136/bjsports-2023-106948" },
    { title: "The immediate effects of isometric exercise on pain in plantar fasciopathy: a randomized crossover trial", org: "Scandinavian Journal of Medicine & Science in Sports (Riel et al.)", year: 2018, url: "https://doi.org/10.1111/sms.13296" },
    { title: "Tissue-specific plantar fascia-stretching exercise enhances outcomes in patients with chronic heel pain", org: "Journal of Bone and Joint Surgery (DiGiovanni et al.)", year: 2003, url: "https://doi.org/10.2106/00004623-200307000-00013" },
    { title: "Plantar fascia-specific stretching exercise improves outcomes in patients with chronic plantar fasciitis: a prospective clinical trial with two-year follow-up", org: "Journal of Bone and Joint Surgery (DiGiovanni et al.)", year: 2006, url: "https://doi.org/10.2106/JBJS.E.01281" },
    { title: "Effects of strengthening and stretching exercises on the temporospatial gait parameters in patients with plantar fasciitis: a randomized controlled trial", org: "Annals of Rehabilitation Medicine (Thong-On et al.)", year: 2019, url: "https://doi.org/10.5535/arm.2019.43.6.662" },
    { title: "Effectiveness of calf muscle stretching for the short-term treatment of plantar heel pain: a randomised trial", org: "BMC Musculoskeletal Disorders (Radford et al.)", year: 2007, url: "https://doi.org/10.1186/1471-2474-8-36" },
    { title: "Stretching with and without foot and hip strengthening in patients with plantar fasciitis: a randomized controlled trial", org: "Manual Therapy (Kamonseki et al.)", year: 2016, url: "https://doi.org/10.1016/j.math.2015.10.006" },
    { title: "Development of a foot and ankle strengthening program for the treatment of plantar heel pain: a Delphi consensus study", org: "Journal of Foot and Ankle Research (Osborne et al.)", year: 2023, url: "https://doi.org/10.1186/s13047-023-00668-2" },
    { title: "Intrinsic foot muscle cross-sectional area in people with plantar heel pain: an MRI case–control study", org: "Journal of Foot and Ankle Research (Osborne et al.)", year: 2026, url: "https://doi.org/10.1002/jfa2.70183" },
    { title: "Impaired foot plantar flexor muscle performance in individuals with plantar heel pain and association with foot orthosis use", org: "Journal of Orthopaedic & Sports Physical Therapy (McClinton et al.)", year: 2016, url: "https://doi.org/10.2519/jospt.2016.6482" },
    { title: "Effectiveness of a multimodal rehabilitation program on foot posture and plantar fascia thickness in plantar fasciitis: a randomized controlled trial", org: "BMC Musculoskeletal Disorders (Ibraheem et al.)", year: 2026, url: "https://doi.org/10.1186/s12891-026-09562-x" },
    { title: "Outpatient vs Home Management Protocol Results for Plantar Fasciitis", org: "Foot & Ankle International (Çil et al.)", year: 2019, url: "https://doi.org/10.1177/1071100719865302" },
    { title: "A randomized controlled trial comparing physical therapy with independent home stretching for plantar fasciitis", org: "Journal of the American Academy of Orthopaedic Surgeons (Kaiser et al.)", year: 2022, url: "https://doi.org/10.5435/JAAOS-D-21-00009" },
    { title: "Manual physical therapy and exercise versus electrophysical agents and exercise in the management of plantar heel pain: a multicenter randomized clinical trial", org: "Journal of Orthopaedic & Sports Physical Therapy (Cleland et al.)", year: 2009, url: "https://doi.org/10.2519/jospt.2009.3036" },
    { title: "Effectiveness of myofascial trigger point manual therapy combined with a self-stretching protocol for the management of plantar heel pain: a randomized controlled trial", org: "Journal of Orthopaedic & Sports Physical Therapy (Renan-Ordine et al.)", year: 2011, url: "https://doi.org/10.2519/jospt.2011.3504" },
    { title: "Effectiveness of low-Dye taping for the short-term treatment of plantar heel pain: a randomised trial", org: "BMC Musculoskeletal Disorders (Radford et al.)", year: 2006, url: "https://doi.org/10.1186/1471-2474-7-64" },
    { title: "Effectiveness of foot orthoses to treat plantar fasciitis: a randomized trial", org: "Archives of Internal Medicine (Landorf et al.)", year: 2006, url: "https://doi.org/10.1001/archinte.166.12.1305" },
    { title: "Effect of custom-made insoles vs sham insoles and GP-led usual care in patients with plantar heel pain: the STAP randomised controlled trial", org: "British Journal of Sports Medicine (Rasenberg et al.)", year: 2021, url: "https://doi.org/10.1136/bjsports-2019-101409" },
    { title: "Foot orthoses for plantar heel pain: a systematic review and meta-analysis", org: "British Journal of Sports Medicine (Whittaker et al.)", year: 2018, url: "https://doi.org/10.1136/bjsports-2016-097355" },
    { title: "Effectiveness of orthosis-shaped sandals compared to in-shoe orthoses and flat sandals for plantar heel pain: a randomised trial", org: "PLoS One (Vicenzino et al.)", year: 2015, url: "https://doi.org/10.1371/journal.pone.0142789" },
    { title: "Dorsiflexion night splints in the treatment of chronic plantar fasciitis: a randomized crossover trial", org: "Foot & Ankle International (Powell et al.)", year: 1998, url: "https://doi.org/10.1177/107110079801900103" },
    { title: "Plantar fasciitis: a prospective randomized clinical trial of the tension night splint", org: "Clinical Journal of Sport Medicine (Batt et al.)", year: 1996, url: "https://doi.org/10.1097/00042752-199607000-00004" },
    { title: "Night splint treatment for plantar fasciitis: a prospective randomized study", org: "Clinical Orthopaedics and Related Research (Probe et al.)", year: 1999, url: "https://doi.org/10.1097/00003086-199911000-00023" },
    { title: "Focused extracorporeal shock wave therapy in chronic plantar fasciitis: a multicenter randomized controlled trial", org: "Journal of Bone and Joint Surgery (Gollwitzer et al.)", year: 2015, url: "https://doi.org/10.2106/JBJS.M.01331" },
    { title: "Radial extracorporeal shock wave therapy is safe and effective in the treatment of chronic recalcitrant plantar fasciitis", org: "American Journal of Sports Medicine (Gerdesmeyer et al.)", year: 2008, url: "https://doi.org/10.1177/0363546508324176" },
    { title: "Chronic plantar fasciitis treated with two sessions of radial extracorporeal shock wave therapy", org: "Foot & Ankle International (Ibrahim et al.)", year: 2010, url: "https://doi.org/10.3113/FAI.2010.0391" },
    { title: "Long-term results of radial extracorporeal shock wave treatment for chronic plantar fasciopathy: a prospective, randomized, placebo-controlled trial with two years follow-up", org: "Journal of Orthopaedic Research (Ibrahim et al.)", year: 2017, url: "https://doi.org/10.1002/jor.23403" },
    { title: "One-year treatment follow-up of plantar fasciitis: radial shockwaves vs. conventional physiotherapy", org: "Clinics (Grecco et al.)", year: 2013, url: "https://doi.org/10.6061/clinics/2013(08)05" },
    { title: "Extracorporeal shock wave therapy versus ultrasound-guided local corticosteroid injection for plantar fasciitis: a meta-analysis", org: "Medicine (Li S et al.)", year: 2018, url: "https://doi.org/10.1097/MD.0000000000013687" },
    { title: "Intensity levels of extracorporeal shock wave therapy in plantar heel pain: a network meta-analysis", org: "PM&R (Zhao et al.)", year: 2025, url: "https://doi.org/10.1002/pmrj.13417" },
    { title: "Extracorporeal shock wave therapy: an update", org: "EFORT Open Reviews (Auersperg & Trieb)", year: 2020, url: "https://doi.org/10.1302/2058-5241.5.190067" },
    { title: "Extracorporeal shock wave therapy for plantar fasciitis: randomised controlled multicentre trial", org: "BMJ (Haake et al.)", year: 2003, url: "https://doi.org/10.1136/bmj.327.7406.75" },
    { title: "Ultrasound-guided extracorporeal shock wave therapy for plantar fasciitis: a randomized controlled trial", org: "JAMA (Buchbinder et al.)", year: 2002, url: "https://doi.org/10.1001/jama.288.11.1364" },
    { title: "Effectiveness of low-level laser therapy in lower extremity tendinopathy or plantar fasciitis: systematic review and meta-analysis of randomised controlled trials", org: "BMJ Open (Naterstad et al.)", year: 2022, url: "https://doi.org/10.1136/bmjopen-2021-059479" },
    { title: "Effects of low-level laser therapy on pain and disability in patients with plantar fasciitis: a systematic review and meta-analysis", org: "Musculoskeletal Science and Practice (Guimarães et al.)", year: 2022, url: "https://doi.org/10.1016/j.msksp.2021.102478" },
    { title: "Low-level laser therapy at 635 nm for treatment of chronic plantar fasciitis: a placebo-controlled, randomized study", org: "Journal of Foot and Ankle Surgery (Macias et al.)", year: 2015, url: "https://doi.org/10.1053/j.jfas.2014.12.014" },
    { title: "Ultrasonographic evaluation of plantar fasciitis after low-level laser therapy: results of a double-blind, randomized, placebo-controlled trial", org: "Lasers in Medical Science (Kiritsi et al.)", year: 2010, url: "https://doi.org/10.1007/s10103-009-0737-5" },
    { title: "Magnetic Resonance Imaging and Clinical Outcomes of Laser Therapy, Ultrasound Therapy, and Extracorporeal Shock Wave Therapy for Treatment of Plantar Fasciitis: A Randomized Controlled Trial", org: "Journal of Foot and Ankle Surgery (Ulusoy et al.)", year: 2017, url: "https://doi.org/10.1053/j.jfas.2017.02.013" },
    { title: "Trigger point dry needling for plantar heel pain: a randomized controlled trial", org: "Physical Therapy (Cotchett et al.)", year: 2014, url: "https://doi.org/10.2522/ptj.20130255" },
    { title: "Effectiveness of trigger point dry needling for plantar heel pain: study protocol for a randomised controlled trial", org: "Journal of Foot and Ankle Research (Cotchett et al.)", year: 2011, url: "https://doi.org/10.1186/1757-1146-4-5" },
    { title: "Is dry needling effective for the management of plantar heel pain or plantar fasciitis? An updated systematic review and meta-analysis", org: "Pain Medicine (Llurda-Almuzara et al.)", year: 2021, url: "https://doi.org/10.1093/pm/pnab114" },
    { title: "Electrical dry needling as an adjunct to exercise, manual therapy and ultrasound for plantar fasciitis: a multi-center randomized clinical trial", org: "PLoS One (Dunning et al.)", year: 2018, url: "https://doi.org/10.1371/journal.pone.0205405" },
    { title: "How effective is therapeutic ultrasound in the treatment of heel pain?", org: "Annals of the Rheumatic Diseases (Crawford et al.)", year: 1996, url: "https://doi.org/10.1136/ard.55.4.265" },
    { title: "Additive effect of therapeutic ultrasound in the treatment of plantar fasciitis: a randomized controlled trial", org: "Journal of Orthopaedic & Sports Physical Therapy (Katzap et al.)", year: 2018, url: "https://doi.org/10.2519/jospt.2018.8110" },
    { title: "Effect of magnetic vs sham-magnetic insoles on plantar heel pain: a randomized controlled trial", org: "JAMA (Winemiller et al.)", year: 2003, url: "https://doi.org/10.1001/jama.290.11.1474" },
    { title: "Effects of pulsed electromagnetic field on pain and foot function index in patients with plantar fasciitis", org: "Bioelectromagnetics (Arani et al.)", year: 2026, url: "https://doi.org/10.1002/bem.70061" },
    { title: "Local heating of trigger points reduces neck and plantar fascia pain", org: "Journal of Back and Musculoskeletal Rehabilitation (Petrofsky et al.)", year: 2020, url: "https://doi.org/10.3233/BMR-181222" },
    { title: "Diagnosis of plantar fasciitis by the Windlass test", org: "Foot & Ankle International (De Garceau et al.)", year: 2003, url: "https://doi.org/10.1177/107110070302400309" },
    { title: "A new diagnostic test for tarsal tunnel syndrome (dorsiflexion-eversion test)", org: "Journal of Bone and Joint Surgery (Kinoshita et al.)", year: 2001, url: "https://doi.org/10.2106/00004623-200112000-00011" },
    { title: "Diagnostic imaging for chronic plantar heel pain: a systematic review and meta-analysis", org: "Journal of Foot and Ankle Research (McMillan et al.)", year: 2009, url: "https://doi.org/10.1186/1757-1146-2-32" },
    { title: "Plantar fascia and Achilles tendon alterations in type 2 diabetes", org: "Turkish Journal of Medical Sciences (Bozkuş et al.)", year: 2025, url: "https://doi.org/10.55730/1300-0144.6042" },
    { title: "Higher body mass index is associated with plantar fasciopathy/'plantar fasciitis': systematic review and meta-analysis", org: "British Journal of Sports Medicine (van Leeuwen et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2015-094695" },
    { title: "Risk factors for plantar fasciitis: a matched case-control study", org: "Journal of Bone and Joint Surgery (Riddle et al.)", year: 2003, url: "https://doi.org/10.2106/00004623-200305000-00015" },
    { title: "Obesity and pronated foot type may increase the risk of chronic plantar heel pain: a matched case-control study", org: "BMC Musculoskeletal Disorders (Irving et al.)", year: 2007, url: "https://doi.org/10.1186/1471-2474-8-41" },
    { title: "Risk factors for plantar fasciitis in physically active individuals: a systematic review and meta-analysis", org: "Sports Health (Hamstra-Wright et al.)", year: 2021, url: "https://doi.org/10.1177/1941738120970976" },
    { title: "Clinical characteristics of Iraqi women who had plantar fasciitis", org: "Journal of Clinical and Biomedical Investigation (Abdulazeez et al.)", year: 2021, url: "https://doi.org/10.52916/jcbi214009" },
    { title: "Reliability and minimal detectable change of the weight-bearing lunge test: a systematic review", org: "Manual Therapy (Powden et al.)", year: 2015, url: "https://doi.org/10.1016/j.math.2015.01.004" },
    { title: "The standing heel-rise test for ankle plantar flexion: criterion for normal", org: "Physical Therapy (Lunsford & Perry)", year: 1995, url: "https://doi.org/10.1093/ptj/75.8.694" },
    { title: "Updated reliability and normative values for the standing heel-rise test in healthy adults", org: "Physiotherapy (Hébert-Losier et al.)", year: 2017, url: "https://doi.org/10.1016/j.physio.2017.03.002" },
    { title: "Cross-cultural adaptation and validation of the Arabic version of the Foot and Ankle Ability Measure (FAAM-AR)", org: "Journal of Back and Musculoskeletal Rehabilitation (Althagafi et al.)", year: 2025, url: "https://doi.org/10.1177/10538127251339166" },
    { title: "Evidence of validity for the Foot and Ankle Ability Measure (FAAM)", org: "Foot & Ankle International (Martin et al.)", year: 2005, url: "https://doi.org/10.1177/107110070502601113" },
    { title: "Cross-cultural adaptation and validation of the Foot Function Index for Arabic-speaking patients (FFI-Ar)", org: "Journal of Orthopaedic Surgery and Research (Khan et al.)", year: 2022, url: "https://doi.org/10.1186/s13018-022-03092-7" },
    { title: "Minimal important difference values of the Foot Health Status Questionnaire, Foot Function Index and Visual Analogue Scale", org: "The Foot (Landorf & Radford)", year: 2008, url: "https://doi.org/10.1016/j.foot.2007.06.006" },
    { title: "Cross-cultural adaptation and validation of the Arabic Foot Health Status Questionnaire among Saudi individuals with plantar fasciitis", org: "Journal of Orthopaedic Surgery and Research (Alshammari et al.)", year: 2023, url: "https://doi.org/10.1186/s13018-023-04202-9" },
    { title: "Minimal Important Difference values of the Foot Health Status Questionnaire and visual analogue scale for plantar heel pain", org: "Journal of Foot and Ankle Research (Landorf et al.)", year: 2010, url: "https://doi.org/10.1186/1757-1146-3-7" },
    { title: "Revised minimal important difference values for the visual analogue scale and Foot Health Status Questionnaire in plantar heel pain", org: "Journal of Foot and Ankle Research (Landorf et al.)", year: 2024, url: "https://doi.org/10.1002/jfa2.70021" },
    { title: "Cross-cultural adaptation and psychometric properties of the Arabic version of the Lower Extremity Functional Scale", org: "Disability and Rehabilitation (Alnahdi et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1066452" },
    { title: "The Lower Extremity Functional Scale (LEFS): scale development, measurement properties, and clinical application", org: "Physical Therapy (Binkley et al.)", year: 1999, url: "https://pubmed.ncbi.nlm.nih.gov/10201543/" },
    { title: "Plantar heel pain of neural origin: differential diagnosis and management", org: "Manual Therapy (Alshami et al.)", year: 2008, url: "https://doi.org/10.1016/j.math.2007.01.014" },
    { title: "Plantar fascia rupture associated with corticosteroid injection", org: "Foot & Ankle International (Acevedo & Beskin)", year: 1998, url: "https://doi.org/10.1177/107110079801900207" },
    { title: "Injected corticosteroids for treating plantar heel pain in adults", org: "Cochrane Database of Systematic Reviews (David et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.CD009348.pub2" },
    { title: "Heel fat pad syndrome: a scoping review", org: "Journal of Foot and Ankle Research (Chang et al.)", year: 2022, url: "https://doi.org/10.1186/s13047-022-00568-x" },
    { title: "Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy: a randomized controlled study", org: "American Journal of Sports Medicine (Silbernagel et al.)", year: 2007, url: "https://doi.org/10.1177/0363546506298279" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — العلاجُ اليدويّ للكاحل والقدم وعضلة الساق والشريطُ والتمطيطُ في كلّ جلسة، والتقويةُ الثقيلة في ثلاثة أيّامٍ غير متتالية (يوماً بعد يوم) وفي الأيّام الأخرى التوازنُ وتمارينُ القدم والمشي؛ والبرنامجُ المنزليّ يومياً حتى الأسبوع ١٢.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — manual therapy to the ankle, foot and calf, taping and stretching every session, heavy strengthening on three non-consecutive days (every other day), and balance, foot exercises and walking on the others; the home programme daily until week 12."],
      note: ["أساسيٌّ في كلّ جلسة — JOSPT 2023: العلاجُ اليدويّ والتمطيطُ والشريطُ بدرجة A، والتقويةُ بالمقاومة بدرجة B (كما تنقلها المصادرُ عن النسخة المنشورة؛ والمسوّدةُ C)؛ والعلاجُ اليدويّ مع التمرين أفضلُ من الأجهزة الفيزيائية مع التمرين (Cleland 2009). والمشرَفُ في التجارب ٦–٢٤ جلسة بمعدّل ١–٣ في الأسبوع ولم تختبر واحدةٌ ستّاً؛ وأفضليّةُ الإشراف على البرنامج المنزليّ متضاربة (أفضلُ عند Çil 2019، ومثلُ التمطيط في البيت عند Kaiser 2022).",
        "Core in every session — JOSPT 2023: manual therapy, stretching and taping at grade A, and resistance training at grade B (as secondary sources report from the published version; the draft says C); manual therapy with exercise beat electrophysical agents with exercise (Cleland 2009). Supervised trials used 6–24 sessions at 1–3 a week and none tested six a week; whether supervision beats a home programme is conflicting (better in Çil 2019, equal to home stretching in Kaiser 2022)."] },
    { code: "shockwaves", centreUse: "core", evidence: "recommended", minutes: 10, everyDays: 7, times: 3,
      parameters: ["مرّةً في الأسبوع ثلاثُ جلسات (٣–٥ عند ACFAS 2018)، بلا تخدير (يُرجَّح أنّه يُضعف الأثر — ACFAS 2018)، لمن تجاوزت أعراضُه ستّةَ أسابيع — وفي الحادّ التمطيطُ أوّلاً (Rompe 2010) ثمّ الموجاتُ إن لم يتحسّن عند الأسبوع السادس؛ وعلى أشدّ النقاط ألماً عند منشأ اللفافة على الكعب من الداخل، ومع التمطيط دائماً (Rompe 2015). " +
        "وفي التجارب: المركّزُ ٠٫٢٥ مللي جول/مم² و٢٠٠٠ نبضة أسبوعياً × ٣ (Gollwitzer 2015)؛ والشعاعيُّ ٠٫١٦ مللي جول/مم² و٢٠٠٠ نبضة (Gerdesmeyer 2008 · Ibrahim 2010، وبقي أثرُه بعد سنتين — Ibrahim 2017)، أو ٣ بار بتردّد ٦ و٢٠٠٠ نبضة أسبوعياً × ٣ (Grecco 2013)؛ والشدّةُ المتوسّطة أفضلُ للألم (Zhao 2025) والعاليةُ تفوق حقنةَ الكورتيزون في الأشهر الثلاثة الأولى (Li S 2018). " +
        "والإعداداتُ (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز في خاناتها — يملؤها المشرفُ قبل الاعتماد؛ فقيمُ الأدبيات لا تنتقل بين جهازٍ وآخر.",
        "Once a week for three sessions (3–5 per ACFAS 2018), without anaesthesia (it likely weakens the effect — ACFAS 2018), for patients whose symptoms have lasted more than six weeks — in acute cases stretching comes first (Rompe 2010) and shockwave only if not improving by week six; over the most tender points at the fascia origin on the inner heel, always with stretching (Rompe 2015). " +
        "In trials: focused 0.25 mJ/mm² and 2000 impulses weekly × 3 (Gollwitzer 2015); radial 0.16 mJ/mm² and 2000 impulses (Gerdesmeyer 2008 · Ibrahim 2010, with the effect holding at two years — Ibrahim 2017), or 3 bar at 6 Hz and 2000 impulses weekly × 3 (Grecco 2013); medium intensity was best for pain (Zhao 2025) and high intensity beat a cortisone injection over the first three months (Li S 2018). " +
        "The settings (type, intensity, frequency, impulses) come from the centre's own device, in their fields — the supervisor fills them before approval, since published values do not transfer between devices."],
      note: ["أساسيٌّ بموعدٍ أسبوعيّ لا في كلّ جلسة — ليس في دليل المعالجين (خارجُ نطاقه)، وهو الخطوةُ الثانية في الدليل البريطانيّ (Morrissey 2021)، وآمنٌ فعّالٌ عند ACFAS 2018 وليس أوّلَ علاجٍ في الحادّ، والوحيدُ الذي بقي أثرُه على المدى المتوسّط والطويل (Guimarães 2023)؛ وتجربتان قديمتان لم تجدا فرقاً (Haake 2003 · Buchbinder 2002) وحذّرت NICE (2009) لعدم اتّساق الدليل حينها. " +
        "الموانع (نشرةُ الشركة وISMST): مضادّاتُ التخثّر واضطراباتُ النزف، والحمل، وورمٌ أو التهابٌ أو جرحٌ في موضع العلاج، ومنظّمُ ضربات القلب، وصفائحُ النموّ عند الصغار، وموضعُ حقنة كورتيزون حديثة.",
        "Core on a weekly schedule, not every session — it is not in the therapists' guideline (outside its scope), it is the second step in the British guide (Morrissey 2021), safe and effective per ACFAS 2018 though not a first treatment in acute cases, and the only treatment whose effect lasted into the medium and long term (Guimarães 2023); two older trials found no difference (Haake 2003 · Buchbinder 2002) and NICE (2009) urged caution because the evidence was then inconsistent. " +
        "Contraindications (the manufacturer's insert and ISMST): anticoagulants and bleeding disorders, pregnancy, a tumour, infection or wound in the treatment area, a pacemaker, children's growth plates, and a recent cortisone injection site."] },
    { code: "laser", centreUse: "adjunct", evidence: "recommended", minutes: 10,
      params: { doseJ: "≥4 J/point (780–860 nm) or ≥2 J/point (904 nm)", points: "3 or more" },
      parameters: ["على منشأ اللفافة والنقاط المؤلمة تحت الكعب والقوس، مع التمارين لا بدلها: الجرعةُ الدنيا للجمعية العالمية لليزر — ٤ جول لكلّ نقطة بطول موجة ٧٨٠–٨٦٠ نانومتر أو ٢ جول بطول ٩٠٤، على ٢–٣ نقاطٍ فأكثر (Naterstad 2022)؛ وفي التجارب ٦٣٥ نانومتر مرّتين أسبوعياً ثلاثةَ أسابيع (Macias 2015)، و٩٠٤ نانومتر ستّةَ أسابيع (Kiritsi 2010)، و٨٣٠ نانومتر ١٥ جلسة (Ulusoy 2017). وطولُ الموجة والقوّةُ من جهاز المركز.",
        "Over the fascia origin and tender points under the heel and arch, with exercise, not instead of it: the World Association for Laser Therapy minimum dose — 4 J per point at 780–860 nm or 2 J per point at 904 nm, over 2–3 points or more (Naterstad 2022); trials used 635 nm twice a week for three weeks (Macias 2015), 904 nm for six weeks (Kiritsi 2010) and 830 nm for 15 sessions (Ulusoy 2017). Wavelength and power come from the centre's device."],
      note: ["مساعدٌ بقاعدة المركز — درجةُ B في الدليل جزءاً من برنامج التأهيل في الحادّ والمزمن لألم المدى القصير؛ خفّف الألمَ أكثرَ من الوهميّ ولم يغيّر العجز، ولم يختلف عن الموجات الصادمة (Guimarães 2022 · Ulusoy 2017). ولا يُسلَّط على العين، ولا على ورمٍ أو جرح.",
        "Adjunct by the centre's rule — grade B in the guideline as part of rehabilitation in acute and chronic cases for short-term pain; it reduced pain more than placebo without changing disability, and did not differ from shockwave (Guimarães 2022 · Ulusoy 2017). Never at the eyes, a tumour or a wound."] },
    { code: "needle", centreUse: "adjunct", evidence: "recommended", minutes: 10, everyDays: 7, times: 3,
      parameters: ["مرّةً في الأسبوع (أسبوعياً ستَّ مرّاتٍ في Cotchett 2014) لحامل علَم الإبر: النقاطُ الزنادية في عضلة الساق الخلفية العميقة أوّلاً ثمّ عضلات باطن القدم (المربّعة الأخمصية، والمثنية القصيرة للأصابع، والمبعِّدة للإصبع الكبير) ثمّ عضلة الساق السطحية؛ ١–٥ إدخالاتٍ لكلّ نقطة حتى الانتفاضة الموضعية أو إعادة الألم، وتبقى الإبرةُ ٥ دقائق بعدها (بروتوكول Cotchett 2011)؛ والكهربائيةُ ٢٠ دقيقة في Dunning 2018.",
        "Once a week (weekly, six times, in Cotchett 2014) by a needling-certified therapist: trigger points in the deep calf (soleus) first, then the sole muscles (quadratus plantae, flexor digitorum brevis, abductor hallucis), then the gastrocnemius; 1–5 insertions per point until a local twitch or the pain is reproduced, leaving the needle 5 minutes afterwards (Cotchett 2011 protocol); electrical needling for 20 minutes in Dunning 2018."],
      note: ["مساعدٌ بموعدٍ أسبوعيّ — درجةُ B في الدليل للنقاط الزنادية في عضلات الساق والقدم (الألمُ على المديين والوظيفةُ على المدى الطويل)، ومحايدٌ في الدليل البريطانيّ؛ والفرقُ في التجربة الرئيسة أقلُّ من الفرق المهمّ للمريض (Cotchett 2014)، والتحليلُ المجمّع وجد ألماً أقلّ على المديين (Llurda-Almuzara 2021). وآثارٌ عابرة خفيفة في ثلث الجلسات؛ وتعقيمٌ كامل، وحذرٌ في السكّري ومميّعات الدم.",
        "Adjunct on a weekly schedule — grade B in the guideline for trigger points in the calf and foot muscles (pain in the short and long term and function in the long term), and neutral in the British guide; the effect in the main trial was smaller than the change that matters to patients (Cotchett 2014), and the meta-analysis found less pain at both time points (Llurda-Almuzara 2021). Minor transient effects in a third of appointments; full asepsis, and caution with diabetes and blood thinners."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الكعب والقوس قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز؛ وقيمُ التجربة (الشدّةُ والتردّد) في نصّها الكامل لم تُقرأ، فيكتبها المشرفُ من جهازه.",
        "Pulsed electromagnetic field (PEMF) over the heel and arch before exercise, non-thermal — on the centre device's programme; the trial's values (intensity and frequency) are in a full text that could not be read, so the supervisor enters them from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم)، والدليلُ ضعيف: تجربةٌ صغيرة (٤٠ مريضاً) أضافته إلى العلاج المعتاد فحسّن ألمَ المساء ومؤشّرَ وظيفة القدم لا ألمَ الصباح (Arani 2026)؛ والمغناطيسُ الثابت في الفرشات لم ينفع (Winemiller 2003).",
        "Adjunct by the centre's rule (Saleem), with weak evidence: a small trial (40 patients) added it to usual physiotherapy and improved evening pain and the Foot Function Index but not morning pain (Arani 2026); static magnets in insoles did not help (Winemiller 2003)."] },
    { code: "electro", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — الدليلُ (D): العلاجُ اليدويّ والتمطيطُ والفرشاتُ بدلَ العلاج الكهربائيّ لنتائج الشهر إلى ستّة أشهر، والتيارُ المتداخل خيارٌ ثانٍ؛ ولا تجربةَ للتحفيز عبر الجلد (TENS) في ألم الكعب (بحثٌ صفريّ مكتوب).",
        "Not used until Saleem decides — the guideline (D): manual therapy, stretching and orthoses instead of electrotherapy for one-to-six-month outcomes, with interferential current as a second line; there is no trial of TENS in plantar heel pain (a documented zero result)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الدليلُ (A ضدّ): لا تُضاف الأمواجُ فوق الصوتية إلى التمطيط (Katzap 2018)، ولم تختلف عن الوهميّ (Crawford 1996).",
        "Not used — the guideline (A against): do not add ultrasound to stretching (Katzap 2018), and it did not differ from placebo (Crawford 1996)."] },
    { code: "hot_pack", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — التجربةُ الوحيدة للحرارة أربعُ ساعاتٍ بلصقات حرارةٍ مضبوطة على النقاط الزنادية في عضلة الساق (Petrofsky 2020)، لا كمادةُ ربع ساعة؛ ويجوز على عضلة الساق المشدودة قبل التمطيط لمن يريحه.",
        "Not used until Saleem decides — the only heat trial used four hours of temperature-controlled heat patches on calf trigger points (Petrofsky 2020), not a fifteen-minute hot pack; it may be used on a tight calf before stretching for those it relaxes."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للأشعّة تحت الحمراء في ألم الكعب، وفي قدم السكّريّ ضعيف الإحساس خطرُ حرق.",
        "Not used — there is no trial of infrared in plantar heel pain, and in a diabetic foot with poor sensation there is a burn risk."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للشمع في ألم الكعب.", "Not used — there is no trial of paraffin wax in plantar heel pain."] },
    { code: "tecar", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — لا تجربةَ للتيكار في ألم الكعب (بحثٌ صفريّ مكتوب: ما وُجد إجراءاتٌ بالإبر لا علاجٌ بالجهاز).",
        "Not used until Saleem decides — there is no trial of Tecar in plantar heel pain (a documented zero result: only needle-based radiofrequency procedures were found)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا مكانَ للشدّ في ألم الكعب.", "Not used — traction has no place in plantar heel pain."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تورّمَ يُعالَج في ألم الكعب ولا تجربة.", "Not used — there is no swelling to treat in plantar heel pain and no trial."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — المريضُ يمشي، ولا تجربةَ لروبوت المشي في ألم الكعب.", "Not used — the patient walks, and there is no trial of a gait robot in plantar heel pain."] },
  ],
  phases: [
    {
      name: ["تهدئة الألم وبدء التحميل", "Settling pain and starting load"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الأسبوع الأوّل", "Week 1"],
      goals: [
        "ألمُ الخطوة الأولى يبدأ بالنقصان؛ وتمطيطٌ يؤدّيه المريضُ وحده ثلاثَ مرّاتٍ يومياً؛ وشريطٌ يريحه؛ ورفعُ الكعبين على الأرض دون أن يزيد ألمُ الصباح؛ وفهمٌ للحالة ولإدارة الحمل؛ وجبيرةُ ليلٍ لمن ألمُ خطوته الأولى ثابت.",
        "First-step pain starting to fall; stretching the patient does alone three times a day; taping that helps; double-leg heel raises on the floor without morning pain getting worse; understanding the condition and load management; a night splint for those with consistent first-step pain.",
      ],
      education: [
        "• ما هي الحالة: إجهادُ اللفافة عند منشئها على الكعب من الحمل المتكرّر — ليست «عظمةً زائدة»: الشوكةُ لا تغيّر العلاج (ACFAS 2018)، والأشعّةُ لا تلزم.\n" +
        "• التوقّعُ الصادق: يتحسّن أكثرُ المرضى، لكن في أسابيع إلى أشهر لا أيّام؛ والتمارينُ في البيت نصفُ العلاج.\n" +
        "• إدارةُ الحمل: يُكسر الوقوفُ الطويل بجلوسٍ قصير، ويُخفَّف المشيُ الذي يزيد ألمَ صباح الغد ولا يُترك المشي.\n" +
        "• الحذاء: مريحٌ بفرقٍ صغير بين الكعب ومقدّم القدم وبطانةٍ لا قاسية (Morrissey 2021)، ونعالٌ في البيت بدل المشي حافياً على البلاط.\n" +
        "• الصباح: التمطيطُ قبل أن تضع قدمك على الأرض.\n" +
        "• الوزن: إن كان زائداً فإنقاصُه يخفّف الحملَ — ولا تجربةَ على إنقاص الوزن في هذه الحالة (بحثٌ صفريّ مكتوب، والدليلُ E).\n" +
        "• ألمٌ حتى ٥ من ١٠ في التمرين مقبول إن لم يزد ألمُ الصباح التالي.",
        "• What it is: strain of the fascia at its origin on the heel from repeated load — not an 'extra bone': a spur does not change treatment (ACFAS 2018), and X-rays are not needed.\n" +
        "• Honest expectations: most patients improve, but over weeks to months, not days; home exercise is half the treatment.\n" +
        "• Load management: break up long standing with short sitting, and cut back walking that worsens the next morning's pain without stopping walking.\n" +
        "• Footwear: comfortable, with a small heel-to-forefoot drop and a cushioned rather than hard sole (Morrissey 2021), and slippers at home instead of walking barefoot on tiles.\n" +
        "• Mornings: stretch before putting the foot on the floor.\n" +
        "• Weight: if high, losing it reduces load — there is no trial of weight loss in this condition (a documented zero result, and the guideline grade is E).\n" +
        "• Pain up to 5/10 during exercise is acceptable if the next morning's pain is no worse.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• ألمُ الخطوة الأولى ٥ من ١٠ أو أقلّ، أو نقص نقطتين منذ البداية.\n" +
        "• رفعُ الكعبين على الأرض ٣ × ١٥ والألمُ ٥ أو أقلّ، دون أن يزيد ألمُ الصباح التالي.\n" +
        "• يؤدّي التمطيطَ وتمارينَ القدم وحده، ويعرف قاعدةَ الألم.\n" +
        "(اقتراحٌ مبنيّ على الفرق المهمّ للمريض — Landorf 2024 — وقاعدةِ الألم، لا معيارٌ مجرَّب.) وإن لم يتحقّق ذلك بعد الجلسة الثامنة ⟵ يُراجَع التشخيص (العصب، كسرُ الإجهاد، وسادةُ الكعب).",
        "Progress to phase 2 when all are met:\n" +
        "• First-step pain 5/10 or less, or down 2 points from the start.\n" +
        "• Double-leg heel raises on the floor 3 × 15 with pain 5/10 or less, without the next morning's pain getting worse.\n" +
        "• Does the stretching and foot exercises alone and knows the pain rule.\n" +
        "(A proposal built on the change that matters to patients — Landorf 2024 — and the pain rule, not a tested criterion.) If not achieved by session 8 → recheck the diagnosis (nerve, stress fracture, fat pad).",
      ],
      notes: [
        "• العلاجُ اليدويّ في كلّ جلسة (A): تحريكُ مفصل الكاحل وما تحته، والنقاطُ الزنادية في عضلة الساق ثمّ التمطيطُ الذاتيّ (Renan-Ordine 2011).\n" +
        "• تمطيطُ الساق: والركبةُ الخلفية مستقيمةٌ (العضلةُ السطحية)، ثمّ مثنيّةٌ قليلاً والكعبُ على الأرض (العضلةُ العميقة) — ٣ × ٣٠ ثانية لكلٍّ ثلاثَ مرّاتٍ يومياً (Thong-On 2019)؛ ووحده لم ينفع في أسبوعين (Radford 2007)، فهو مع تمطيط اللفافة لا بدله.\n" +
        "• رفعُ الكعبين على الأرض (بطاقة «رفع الكعبين واقفاً») ٣ × ١٥ يوماً بعد يوم، ومنشفةٌ تحت الأصابع حين يصير سهلاً — تمهيداً للحمل العالي.\n" +
        "• الموجاتُ الصادمة: الجلسةُ الأولى من الثلاث هذا الأسبوع لمن تجاوزت أعراضُه ستّةَ أسابيع — وفي الحادّ تُؤجَّل.\n" +
        "• جبيرةُ الليل لمن ألمُ خطوته الأولى ثابتٌ كلَّ صباح، والفرشةُ من قسم المساند مع العلاج لمن يريحه الشريط (وأوصى الدليلُ القديم بالفرشة خاصّةً لمن يريحه الشريط — JOSPT 2014).",
        "• Manual therapy every session (A): mobilisation of the ankle and subtalar joints, and calf trigger points followed by self-stretching (Renan-Ordine 2011).\n" +
        "• Calf stretching: back knee straight (gastrocnemius), then slightly bent with the heel down (soleus) — 3 × 30 seconds each, three times a day (Thong-On 2019); alone it did not help over two weeks (Radford 2007), so it goes with fascia stretching, not instead.\n" +
        "• Double-leg heel raises on the floor (the 'Standing heel raise' card) 3 × 15 every other day, with a towel under the toes once easy — preparing for high load.\n" +
        "• Shockwave: the first of three sessions this week for those whose symptoms have lasted more than six weeks — postponed in acute cases.\n" +
        "• A night splint for those with first-step pain every morning, and an insole from the orthotics department, with treatment, for those whom taping relieves (the older guideline recommended orthoses especially for those who respond to taping — JOSPT 2014).",
      ],
      exercises: [
        { code: "plantar-fascia-stretch", sets: 1, reps: 3, hold: 30, rest: 10 },
        { code: "calf-stretch-standing", sets: 1, reps: 3, hold: 30,
          note: ["والركبةُ الخلفية مثنيّةٌ قليلاً للعضلة العميقة (السوليوس) — ٣ × ٣٠ ثانية أيضاً.", "Also with the back knee slightly bent for the soleus — 3 × 30 seconds too."] },
        { code: "low-dye-taping",
          note: ["يُجدَّد كلَّ ٢–٣ أيّام، ويُعلَّم أحدُ أفراد الأسرة.", "Renewed every 2–3 days, and a family member is taught."] },
        { code: "calf-raise", sets: 3, reps: 15,
          note: ["على القدمين يوماً بعد يوم، ومنشفةٌ تحت الأصابع حين يصير سهلاً.", "On both feet every other day, with a towel under the toes once easy."] },
        { code: "short-foot", sets: 3, reps: 10, hold: 5 },
        { code: "towel-toe-curl", sets: 3, reps: 15 },
        { code: "night-splint",
          note: ["لمن ألمُ خطوته الأولى ثابتٌ كلَّ صباح وحده.", "Only for those whose first-step pain is present every morning."] },
      ],
    },
    {
      name: ["التحميل المتدرّج", "Progressive loading"],
      sessionFrom: 7, sessionTo: 12,
      timeframe: ["الأسبوع الثاني", "Week 2"],
      goals: [
        "رفعُ الكعب على الساق المصابة بالحمل العالي ومنشفةٌ تحت الأصابع ١٢ × ٣ يوماً بعد يوم؛ وعطفُ كاحلٍ مساوٍ للجهة الأخرى؛ وتوازنٌ على الساق المصابة؛ ومشيٌ يوميّ يتزايد دون أن يزيد ألمُ الصباح.",
        "High-load single-leg heel raises with a towel under the toes, 12 × 3 every other day; ankle dorsiflexion equal to the other side; balance on the affected leg; daily walking that increases without morning pain getting worse.",
      ],
      education: [
        "• التقويةُ الثقيلة يوماً بعد يوم لا كلَّ يوم: العضلةُ واللفافةُ تحتاجان ٤٨ ساعة (Rathleff 2015 · Riel 2019).\n" +
        "• الحملُ يُزاد حين تقدر على أكثر من العدد بالإيقاع الصحيح — بحقيبة ظهرٍ فيها كتبٌ أو قناني ماء.\n" +
        "• ألمُ الصباح بوصلتُك: إن زاد بعد يوم تقوية فلا تزد الحملَ في المرّة القادمة.\n" +
        "• العودةُ للمشي: زِد المدّةَ دقيقتين كلَّ يومين إن بقي ألمُ الصباح كما هو.",
        "• Heavy strengthening every other day, not daily: the muscle and fascia need 48 hours (Rathleff 2015 · Riel 2019).\n" +
        "• Load is added once you can do more than the target at the right tempo — with a backpack holding books or water bottles.\n" +
        "• Morning pain is your compass: if it is worse after a strengthening day, do not add load next time.\n" +
        "• Returning to walking: add two minutes every two days if morning pain stays the same.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• رفعُ الكعب على الساق المصابة بالحمل ١٢ × ٣ بالإيقاع ٣–٢–٣ والألمُ ٥ أو أقلّ دون أن يزيد ألمُ الصباح.\n" +
        "• ألمُ الخطوة الأولى ٣ من ١٠ أو أقلّ.\n" +
        "• الطعنةُ نحو الحائط في حدود ٢ سم من الجهة الأخرى (أدنى تغيّرٍ حقيقيّ ١٫٦–١٫٩ سم — Powden 2015).\n" +
        "• الوقوفُ على الساق المصابة ٣٠ ثانية.\n" +
        "(اقتراحٌ مبنيّ على بروتوكول Riel 2019 وقاعدةِ الألم، لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when all are met:\n" +
        "• Loaded single-leg heel raises 12 × 3 at the 3–2–3 tempo with pain 5/10 or less, without morning pain getting worse.\n" +
        "• First-step pain 3/10 or less.\n" +
        "• Knee-to-wall lunge within 2 cm of the other side (minimal detectable change 1.6–1.9 cm — Powden 2015).\n" +
        "• Single-leg stance on the affected leg for 30 seconds.\n" +
        "(A proposal built on the Riel 2019 protocol and the pain rule, not a tested criterion.)",
      ],
      notes: [
        "• أيّامُ التقوية الثقيلة (يوماً بعد يوم): رفعُ الكعب بالحمل العالي ثمّ المطّاط؛ والأيّامُ الأخرى: التوازنُ وتمارينُ القدم والمشيُ والتمطيط.\n" +
        "• الطعنةُ نحو الحائط لمن ينقص عطفُ كاحله عن الجهة الأخرى؛ ومَن عطفُه طبيعيّ لا يحتاجها.\n" +
        "• تمارينُ القدم واقفاً الآن (القدمُ القصيرة على الساقين ثمّ على المصابة).\n" +
        "• الموجاتُ الصادمة: الجلسةُ الثانية؛ والليزرُ والإبرُ والمغناطيسُ مساعدة.\n" +
        "• الشريطُ مستمرٌّ إن ظلّ يريح — حتى ستّة أسابيع.",
        "• Heavy-strengthening days (every other day): the high-load heel raise then band work; other days: balance, foot exercises, walking and stretching.\n" +
        "• The knee-to-wall lunge for those with less dorsiflexion than the other side; those with normal dorsiflexion do not need it.\n" +
        "• Foot exercises now in standing (short foot on both legs, then on the affected one).\n" +
        "• Shockwave: the second session; laser, needling and magnetic therapy as adjuncts.\n" +
        "• Taping continues while it helps — up to six weeks.",
      ],
      exercises: [
        { code: "heel-raise-towel-high-load", sets: 3, reps: 12, rest: 120,
          note: ["١٢ أقصى × ٣ يوماً بعد يوم بالإيقاع ٣–٢–٣؛ ويبدأ بالإمساك.", "A 12-repetition maximum × 3 every other day at the 3–2–3 tempo; start while holding on."] },
        { code: "plantar-fascia-stretch", sets: 1, reps: 3, hold: 30, rest: 10 },
        { code: "calf-stretch-standing", sets: 1, reps: 3, hold: 30,
          note: ["والركبةُ مثنيّةٌ قليلاً للسوليوس أيضاً.", "Also with the knee slightly bent for the soleus."] },
        { code: "knee-to-wall-lunge", sets: 2, reps: 10, hold: 2,
          note: ["لمن ينقص عطفُ كاحله عن الجهة الأخرى.", "For those with less dorsiflexion than the other side."] },
        { code: "band-ankle-strengthening", sets: 3, reps: 10,
          note: ["للخارج وللداخل خاصّةً (Thong-On 2019)، في أيّام التقوية.", "Especially eversion and inversion (Thong-On 2019), on strengthening days."] },
        { code: "short-foot", sets: 3, reps: 8,
          note: ["واقفاً على الساقين ثمّ على المصابة.", "Standing on both legs, then on the affected one."] },
        { code: "ankle-single-leg-balance", sets: 1, reps: 3, hold: 30 },
        { code: "graded-walking",
          note: ["يُزاد دقيقتين كلَّ يومين إن بقي ألمُ الصباح كما هو.", "Add two minutes every two days if morning pain stays the same."] },
        { code: "low-dye-taping",
          note: ["إن ظلّ يريح.", "While it still helps."] },
      ],
    },
    {
      name: ["الوظيفة والعودة إلى الوقوف والعمل", "Function and return to standing and work"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["الأسبوع الثالث، والبرنامجُ المنزليّ حتى الأسبوع ١٢", "Week 3, and the home programme to week 12"],
      goals: [
        "رفعُ الكعب بالحمل ١٠ × ٤؛ وألمُ الخطوة الأولى ٢ أو أقلّ؛ والوقوفُ والمشيُ في العمل والبيت بلا ألمٍ يحدّهما؛ وبرنامجٌ منزليّ مكتوب حتى الأسبوع ١٢ يعرف كيف يتدرّج فيه.",
        "Loaded heel raises 10 × 4; first-step pain 2/10 or less; standing and walking at work and home without pain limiting them; a written home programme to week 12 that the patient knows how to progress.",
      ],
      education: [
        "• التقويةُ تستمرّ في البيت: ٨ × ٥ من الأسبوع الخامس (بروتوكول Riel 2019)، حتى النتيجة المرضية ثمّ أربعةَ أسابيع (Riel 2023).\n" +
        "• إن عاد ألمُ الصباح: عُد إلى تمطيط اللفافة صباحاً والشريط وخفّف الحملَ أسبوعاً، ثمّ ارجع كما كنت.\n" +
        "• العمل: الوقوفُ الطويل يُكسر، والحذاءُ المريح أو الصندلُ المشكَّل على القوس (Vicenzino 2015).\n" +
        "• المتابعة: تقييمٌ عند الأسبوع ١٢؛ ومَن لم يتحسّن بعد ستّة أشهر من العلاج المناسب يُحال إلى الطبيب (ACFAS 2018).",
        "• Strengthening continues at home: 8 × 5 from week five (Riel 2019 protocol), until a satisfactory result and then four more weeks (Riel 2023).\n" +
        "• If morning pain returns: go back to morning fascia stretching and taping and reduce load for a week, then return to where you were.\n" +
        "• Work: break up long standing, with comfortable footwear or a contoured sandal (Vicenzino 2015).\n" +
        "• Follow-up: a review at week 12; anyone not improving after six months of appropriate care is referred to the doctor (ACFAS 2018).",
      ],
      criteria: [
        "معاييرُ الخروج (اقتراحٌ لا معيارٌ مجرَّب):\n" +
        "• ألمُ الخطوة الأولى ٢ من ١٠ أو أقلّ، أو نقص نقطتين فأكثر منذ البداية (الفرقُ المهمّ — Landorf 2024).\n" +
        "• المقياسُ الذي أضافه المشرف تحسّن فوق فرقه المهمّ (مؤشّرُ وظيفة القدم ٦٫٥ — Landorf 2008، أو ألمُ استبيان صحّة القدم ١٢٫٤ — Landorf 2024).\n" +
        "• رفعُ الكعب بالحمل ١٠ × ٤ بالإيقاع والألمُ ٥ أو أقلّ، ورفعاتُ الكعب حتى التعب على المصابة ٢٠ فأكثر أو ٩٠٪ من الأخرى (والطبيعيّ ٢٥ — Lunsford 1995).\n" +
        "• يقف ويمشي في عمله ويومه دون أن يحدّه الألم، ويؤدّي برنامجَه المنزليّ وحده.\n" +
        EXTEND_AR,
        "Discharge criteria (a proposal, not a tested criterion):\n" +
        "• First-step pain 2/10 or less, or down 2 points or more from the start (the important change — Landorf 2024).\n" +
        "• The measure the supervisor added improved beyond its important change (Foot Function Index 6.5 — Landorf 2008, or Foot Health Status Questionnaire pain 12.4 — Landorf 2024).\n" +
        "• Loaded heel raises 10 × 4 at tempo with pain 5/10 or less, and heel raises to fatigue on the affected side 20 or more or 90% of the other side (normal 25 — Lunsford 1995).\n" +
        "• Stands and walks through work and the day without pain limiting them, and does the home programme alone.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• الموجاتُ الصادمة: الجلسةُ الثالثة؛ ومَن بدأها متأخّراً يُكملها في التمديد.\n" +
        "• التوازنُ أصعب: بعينين مغلقتين، ثمّ على وسادة.\n" +
        "• المشيُ المتدرّج والدرّاجةُ للياقة وإنقاص الوزن بلا صدمة على الكعب.\n" +
        "• يُكتب البرنامجُ المنزليّ ويُرسل (ورقةُ تمارين البيت — §4.ds): تمطيطُ اللفافة صباحاً، والتقويةُ يوماً بعد يوم بتدرّجها، والمشي.",
        "• Shockwave: the third session; anyone who started late completes it in the extension.\n" +
        "• Harder balance: eyes closed, then on a cushion.\n" +
        "• Graded walking and cycling for fitness and weight loss without impact on the heel.\n" +
        "• The home programme is written and sent (the home exercise sheet — §4.ds): morning fascia stretching, every-other-day strengthening with its progression, and walking.",
      ],
      exercises: [
        { code: "heel-raise-towel-high-load", sets: 4, reps: 10, rest: 120,
          note: ["١٠ أقصى × ٤ بالحمل؛ وفي البيت ٨ × ٥ من الأسبوع الخامس.", "A 10-repetition maximum × 4 with load; at home 8 × 5 from week five."] },
        { code: "plantar-fascia-stretch", sets: 1, reps: 3, hold: 30, rest: 10 },
        { code: "knee-to-wall-lunge", sets: 2, reps: 10, hold: 2 },
        { code: "ankle-single-leg-balance", sets: 1, reps: 3, hold: 30,
          note: ["بعينين مغلقتين ثمّ على وسادة.", "Eyes closed, then on a cushion."] },
        { code: "graded-walking" },
        { code: "stationary-cycling",
          note: ["للياقة وإنقاص الوزن بلا صدمة على الكعب.", "For fitness and weight loss without impact on the heel."] },
        { code: "night-splint",
          note: ["يستمرّ في البيت حتى ثلاثة أشهر إن بقي ألمُ الصباح.", "Continues at home for up to three months if morning pain remains."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — أسئلةُ هذا البروتوكول للمشرف العام، تُزرع بـ`checklistSql` ولا تكتب فوق ما علّمه. */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العدد ١٨ وتمديدٌ واحد بستّ بمعيار — والتجاربُ المشرَفة ٦–٢٤ جلسة بمعدّل ١–٣ في الأسبوع، ولم تختبر واحدةٌ ستّاً في الأسبوع: أبقِه أو عدّله.",
    en: "18 sessions with one criteria-based extension of six — supervised trials used 6–24 sessions at 1–3 a week, and none tested six a week: keep or adjust." },
  { key: "limits", topic: "limits",
    ar: "الحدود: ألمُ الخطوة الأولى ٥ ثمّ ٣ ثمّ ٢، ورفعُ الكعب ١٢ × ٣ ثمّ ١٠ × ٤، والطعنةُ في حدود ٢ سم، ورفعاتُ الكعب ٢٠ أو ٩٠٪ من الأخرى — اقتراحٌ مبنيّ على الدراسات المكتوبة في معايير المراحل: أبقِها أو عدّلها.",
    en: "Limits: first-step pain 5, then 3, then 2; heel raises 12 × 3 then 10 × 4; the lunge within 2 cm; heel raises to fatigue 20 or 90% of the other side — proposals built on Landorf 2024, Riel 2019, Powden 2015 and Lunsford 1995: keep or adjust." },
  { key: "device-shockwave", topic: "devices",
    ar: "الموجاتُ الصادمة أساسيّ أسبوعياً × ٣ لمن تجاوزت أعراضُه ستّةَ أسابيع، وفي الحادّ التمطيطُ أوّلاً — أبقِها كذلك أو عدّل العددَ (حتى ٥)، واملأ إعداداتِها من جهاز المركز.",
    en: "Shockwave is core, weekly × 3, for symptoms longer than six weeks, with stretching first in acute cases — keep it so or change the count (up to 5), and fill its settings from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ أسبوعياً × ٣ للنقاط الزنادية في الساق والقدم (درجةُ B في الدليل، والفرقُ في التجربة الرئيسة صغير) — أبقِها أو عدّلها أو اجعلها «لا يُستخدم».",
    en: "Dry needling is an adjunct, weekly × 3, for calf and foot trigger points (grade B in the guideline, with a small effect in the main trial) — keep, adjust, or set it to 'Not used'." },
  { key: "device-laser", topic: "devices",
    ar: "الليزرُ مساعدٌ بجرعة الجمعية العالمية لليزر (٤ جول لكلّ نقطة أو ٢ بطول موجة ٩٠٤، على ٣ نقاطٍ فأكثر) — أضف طولَ الموجة والقوّة من جهاز المركز، أو عدّل.",
    en: "Laser is an adjunct at the World Association for Laser Therapy dose (4 J per point, or 2 at 904 nm, over 3 points or more) — add the wavelength and power from the centre's device, or adjust." },
  { key: "device-magnet", topic: "devices",
    ar: "المغناطيسُ مساعدٌ بقاعدتك والدليلُ ضعيف (تجربةٌ صغيرة حسّنت ألمَ المساء لا الصباح)، وبلا إعدادات — املأها من جهاز المركز، أو اجعله «لا يُستخدم».",
    en: "Magnetic therapy is an adjunct by your rule with weak evidence (a small trial improved evening, not morning, pain), and has no settings — fill them in from the centre's device, or set it to 'Not used'." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: ألمَ الخطوة الأولى من ١٠ (الأقلّ أفضل)، ومؤشّرَ وظيفة القدم بالعربية أو استبيانَ صحّة القدم بالعربية، وعددَ رفعات الكعب على الساق المصابة — ومصادرُها في «التقييم».",
    en: "Add under 'Measures' → custom measure: first-step pain out of 10 (lower is better), the Arabic Foot Function Index (Khan 2022) or the Arabic Foot Health Status Questionnaire (Alshammari 2023), and the number of heel raises on the affected side." },
];

export const name = "143_physio_plantar_heel_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
