// Migration 157: الجلطةُ الدماغية في المرحلة المزمنة — البروتوكولُ الحادي والعشرون مفصَّلاً (§4.ep — ٢٠٢٦-١٠-١٨).
//
// المالك (٢٠٢٦-١٠-١٨): «ممتاز نكمل البروتوكول التالي» — فاختار المساعدُ الجلطةَ المزمنة (`stroke-chronic-adult`، بعد ستّة أشهر): الجلطةُ من أكبر
// أسباب العجز — ٩٣٫٨ مليون حيٍّ بعد جلطة في العالم سنة ٢٠٢١ (Feigin 2024) — وأكثرُ مرضى المركز بعد الأشهر الستّة الأولى يعيشون معها سنواتٍ؛ ويستعمل بطاقاتِ
// الجلطة تحت الحادّة (١٢٩) بصورها. **بالقالب كاملاً** (§4.dd): ٣٦ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ستّةُ أسابيع) — أربعةُ أيّامٍ للمشي عالي الشدّة ويومان
// أخفّ للقوّة والتوازن والذراع — وتمديدٌ واحد باثنتي عشرة لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر، ومراجعةٌ كلَّ ستّة
// أشهر بقواعد عودةٍ مكتوبة؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–٣٠ · ٣١–٣٦) بمعايير الفرق المهمّ (السرعةُ ٠٫١٠–٠٫١٦ م/ث، والمشيُ ستّ دقائق ٣٤ متراً، وبيرغ ٥)
// **وقاعدةُ الشدّة والسلامة** (٦٠–٨٠٪ من احتياطيّ النبض أو جهدٌ ١٤–١٧، وحدودُ الضغط والسكّر قبل الجلسة وأثناءها، وإذنُ الطبيب قبل الشدّة العالية)؛ وستُّ
// بطاقاتٍ جديدة (المشيُ عالي الشدّة على السير، والخطوةُ الإنقاذية، والدرجُ بسرعة، والنزولُ إلى الأرض والقيامُ منها، والصلاةُ بعد الجلطة، والوضوءُ والذراعُ
// المصابة تساعد) والمعادةُ بصورها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`.
// كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الجلطةَ المزمنة**: «الثبات» بعد ستّة أشهر ليس سقفاً — ٣٣٩ تجربةً بدأت بعدها وأكثرُها إيجابية (Teasell 2012) — والتحسّنُ في المشي يتبع **الشدّة
// وعددَ الخطوات** لا الوقتَ وحده (Hornby 2019 · Richards 2026)؛ فالمشيُ بشدّةٍ متوسّطة إلى عالية توصيةٌ قوية (Hornby 2020 · Alt Murphy 2025)، والجهازُ الروبوتيّ
// للقادر على المشي «بلا فائدة» (Richards 2026) وضدّه بقوّة (Hornby 2020) — **فهو لمن لا يمشي وحده فقط**؛ والدعامةُ أو التحفيزُ الوظيفيّ للقدم المتدلّية
// متكافئان (Richards 2026 · Kluding 2013)، والمركزُ يصنع الدعامات. **والجرعة**: التجاربُ ثلاثاً في الأسبوع اثني عشرَ أسبوعاً (٣٦ جلسة — Boyne 2023) أو حتى
// ثلاثين جلسةً في شهرين (Hornby 2019)، والإرشادُ الأمريكيّ يقبل خمساً في الأسبوع أربعةَ أسابيع إلى ثمانية (Richards 2026)، ولا تجربةَ لستٍّ في الأسبوع (بحثٌ
// صفريّ) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **وما يخصّ العراق**: الضغطُ في ٧٠٫٥٪ والسكّريُّ في ٣٨٫٣٪ من مرضى الجلطة في سجلٍّ عراقيّ
// (Al-Shahni 2026) والالتزامُ بالأدوية ضعيف (Basheti 2024) — فقاعدةُ الضغط والسكّر قبل كلّ جلسة؛ ولا دراسةَ عراقية لتأهيل الجلطة المزمنة (بحثٌ صفريّ)،
// والصلاةُ بتكرار حركاتها تجربةٌ واحدة إيجابية (Ghous 2017) ولا دراسةَ للوضوء.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٢٨١ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ستّ؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٢٩ و١٣٠) تُربط برموزها وصورها، وما يخصّ الجلطةَ المزمنة في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "hit-treadmill-walking", nameAr: "المشي عالي الشدّة على السير المتحرّك بالدفعات", nameEn: "High-intensity interval treadmill walking (with a safety harness)",
    kind: "aerobic", region: "whole_body", homeSuitable: false,
    purpose: ["المشيُ نفسُه بشدّةٍ عالية هو ما يحسّن المشيَ بعد ستّة أشهر: في تجربة HIT-Stroke (٣٦ جلسة ٤٥ دقيقة ثلاثاً في الأسبوع اثني عشرَ أسبوعاً) فاقت دفعاتُ ٣٠ ثانية بأعلى سرعةٍ آمنة المشيَ المتوسّطَ المستمرّ في مسافة المشي ستّ دقائق بـ٤٤ متراً في الأسبوع الثاني عشر — والفرقُ كان ١٥ متراً في الأسبوع الرابع فقط (Boyne 2023)؛ وفي تجربة Hornby تجاوز ٥٧–٨٠٪ ممّن تدرّبوا بشدّةٍ عالية الفرقَ المهمّ مقابل ٩–٣١٪ بالشدّة المنخفضة، والتحسّنُ تبع عددَ الخطوات في الجلسة أكثرَ من النبض (Hornby 2019). والإرشادات: قويٌّ بـ٦٠–٨٠٪ من احتياطيّ النبض (Hornby 2020)، وقويٌّ للمرحلة المزمنة مع ثبات القلب (Alt Murphy 2025)، و2a عند الأمريكيّ — أمّا السيرُ الخفيف إلى المتوسّط للقادر على المشي فبلا فائدة (Richards 2026).",
      "Walking itself at high intensity is what improves walking after six months: in the HIT-Stroke trial (36 sessions of 45 minutes, three a week for twelve weeks), 30-second bursts at the fastest safe speed beat moderate continuous walking by 44 metres on the six-minute walk at week 12 — the difference was only 15 metres at week 4 (Boyne 2023); in the Hornby trial 57–80% of those trained at high intensity exceeded the important change against 9–31% at low intensity, and gains followed the number of steps per session more than heart rate (Hornby 2019). Guidelines: strong at 60–80% of heart-rate reserve (Hornby 2020), strong for the chronic stage with stable cardiovascular status (Alt Murphy 2025), and 2a in the American guideline — whereas light-to-moderate treadmill walking in people who can walk gives no benefit (Richards 2026)."],
    start: ["حزامُ أمانٍ فوق الرأس لا يحمل الوزن، ونبضٌ يُقاس كلَّ ٣–٥ دقائق (حزامُ صدرٍ أو ساعة)، والضغطُ مقيسٌ قبلها وفي حدوده، ودعامةُ القدم إن وُصفت، والمعالجُ بجانب الساق المصابة وزرُّ التوقّف في يده.",
      "A safety harness overhead that does not take body weight, heart rate checked every 3–5 minutes (chest strap or watch), blood pressure measured beforehand and within limits, the ankle-foot orthosis if prescribed, and the therapist beside the affected leg with the stop button in hand."],
    steps: [[
      "إحماءٌ ثلاثَ دقائق بسرعةٍ مريحة (٣٠–٤٠٪ من احتياطيّ النبض).",
      "دفعةُ ٣٠ ثانية بأعلى سرعةٍ آمنة: يرجع فيها قليلاً إلى الخلف أو يهتزّ ثمّ يستعيد توازنه وحده (Miller 2021).",
      "راحةُ ٣٠–٦٠ ثانية بمشيٍ بطيء أو وقوف.",
      "كرّر حتى ٢٠ دقيقة، وقِس النبضَ والجهدَ المحسوس (١٤–١٧ من ٢٠) واكتب السرعةَ في كلّ جلسة.",
      "تبريدٌ دقيقتين، ثمّ المشيُ على الأرض بالسرعة التي تدرّب عليها.",
    ], [
      "Warm up for three minutes at a comfortable speed (30–40% of heart-rate reserve).",
      "A 30-second burst at the fastest safe speed: drifting back slightly or wobbling, then recovering balance unaided (Miller 2021).",
      "Recover for 30–60 seconds by walking slowly or standing.",
      "Repeat for up to 20 minutes, checking heart rate and perceived exertion (14–17 out of 20), and record the speed at every session.",
      "Cool down for two minutes, then walk overground at the speed just practised.",
    ]],
    cues: [[
      "القبضُ بقوّةٍ على الدرابزين ⟵ اليدُ تلمس ولا تحمل، فالقبضُ يخفّض الجهدَ والتوازن.",
      "خطوةٌ قصيرة بالساق السليمة ⟵ خطوتان متساويتان والكعبُ أوّلاً.",
      "النظرُ إلى القدمين ⟵ النظرُ إلى الأمام.",
    ], [
      "Gripping the handrail hard → the hand touches but does not carry, as gripping lowers the effort and the balance challenge.",
      "A short step with the good leg → two equal steps, heel first.",
      "Looking at the feet → eyes forward.",
    ]],
    easier: ["دفعاتٌ أقصر (١٥–٢٠ ثانية) وراحةٌ أطول، أو مشيٌ مستمرّ بشدّةٍ متوسّطة ٤٠–٦٠٪ لمن لم يُؤذن له بالعالية (Boyne 2023).",
      "Shorter bursts (15–20 seconds) and longer rests, or continuous walking at moderate intensity, 40–60%, for those not yet cleared for high intensity (Boyne 2023)."],
    harder: ["سرعةٌ أعلى حين تكتمل الدفعاتُ بأمان، ثمّ ميل، ثمّ أوزانٌ على الكاحل أو صدرية، والمشيُ للخلف وللجانب بسرعةٍ آمنة (Hornby 2019).",
      "A higher speed once the bursts are completed safely, then an incline, then ankle weights or a weighted vest, and walking backwards and sideways at a safe speed (Hornby 2019)."],
    stopIf: ["ألمٌ في الصدر، أو ضيقُ نفسٍ شديد، أو دوخةٌ أو شحوب، أو علامةٌ عصبية جديدة، أو ضغطٌ فوق الحدّ، أو هبوطُ الضغط مع زيادة السرعة ⟵ يتوقّف فوراً ويُبلَّغ الطبيب (قاعدةُ الشدّة والسلامة).",
      "Chest pain, severe breathlessness, dizziness or pallor, a new neurological sign, blood pressure above the limit, or blood pressure falling as the speed rises → stop at once and inform the doctor (the intensity and safety rule)."],
    equipment: ["سيرٌ متحرّك بحزام أمانٍ فوق الرأس وزرّ توقّف، وجهازُ قياس النبض، وجهازُ ضغط، وعدّادُ خطوات.",
      "A treadmill with an overhead safety harness and a stop button, a heart-rate monitor, a blood-pressure monitor and a step counter."],
    doseNote: ["٢٠ دقيقة من الدفعات داخل كتلة مشيٍ نحو ٣٠ دقيقة في أيّام الشدّة الأربعة — ٢٠٠٠–٣٠٠٠ خطوة في الجلسة كما في التجارب (Hornby 2019 · Boyne 2023).",
      "20 minutes of bursts within a walking block of about 30 minutes on the four high-intensity days — 2,000–3,000 steps per session, as in the trials (Hornby 2019 · Boyne 2023)."],
    images: [{ key: "hit-treadmill-walking-1", ar: "مريضُ جلطة يمشي على سيرٍ متحرّك بحزام أمانٍ فوق الرأس والمعالجُ بجانبه",
      en: "A stroke survivor walking on a treadmill in an overhead safety harness with the therapist beside them", search: "stroke treadmill training safety harness" }],
  },
  {
    code: "reactive-stepping-practice", nameAr: "تمرين الخطوة الإنقاذية (التوازن التفاعليّ)", nameEn: "Reactive stepping practice (lean-and-release and pushes)",
    kind: "balance", region: "whole_body", homeSuitable: false, sets: 3, reps: 5,
    purpose: ["السقوطُ شائعٌ بعد ستّة أشهر — ٠٫٨٨ سقطة للشخص في السنة وأكثرُه في البيت في الطريق إلى المرحاض (Goto 2019)، و٣٦٪ يسقطون في سنةٍ مقابل ٢٤٪ من أقرانهم (Mackintosh 2005) — والخطوةُ السريعة عند فقد التوازن هي ما يمنع السقطة. في تجربة التدريب بالاضطراب (ساعةٌ مرّتين في الأسبوع ستّةَ أسابيع وجلستان تذكيريتان) تحسّنت ردودُ التوازن واستمرّت حتى ١٢ شهراً، ونقصُ السقطات لم يُحسم (Mansfield 2018)؛ وفي التحليل الجامع تحسّن التوازن بيقينٍ منخفضٍ جداً (Alayat 2022) ولا دليلَ كافياً على نقص السقوط (Brown 2023) — فهو تمرينُ توازنٍ لا ضمانٌ ضدّ السقوط.",
      "Falls are common after six months — 0.88 falls per person per year, most at home on the way to the toilet (Goto 2019), and 36% fall within a year against 24% of their peers (Mackintosh 2005) — and a quick step when balance is lost is what prevents the fall. In the perturbation-training trial (one hour twice a week for six weeks plus two booster sessions), reactive balance improved and lasted to 12 months, while the fall reduction was inconclusive (Mansfield 2018); in a meta-analysis balance improved with very low certainty (Alayat 2022), and there is not enough evidence that it reduces falls (Brown 2023) — so it is balance training, not a guarantee against falling."],
    start: ["واقفٌ بحزام أمانٍ فوق الرأس أو بين القضيبين المتوازيين ومعالجٌ ثانٍ قريب، والدعامةُ بالقدم إن وُصفت، والأرضُ خالية من العوائق.",
      "Standing in an overhead safety harness or between the parallel bars with a second therapist close by, the orthosis on if prescribed, and the floor clear."],
    steps: [[
      "الميلُ والإفلات: المعالجُ يمسك المريضَ بحزامٍ عند الصدر، والمريضُ يميل إلى الأمام حتى يحمل المعالجُ وزنَه.",
      "يُفلته المعالجُ فجأةً فيخطو خطوةً سريعة واحدة يمسك بها نفسه — بالساق المصابة مرّةً وبالسليمة مرّة.",
      "كرّر للخلف وللجانبين.",
      "الدفعُ الخفيف: المعالجُ يدفع الحوضَ بلا إنذارٍ بقوّةٍ تكفي لخطوة.",
      "كبّر الميلَ أو الدفعَ تدريجياً، ثمّ أثناء المشي، ثمّ مع عائقٍ يُتخطّى.",
    ], [
      "Lean and release: the therapist holds the patient with a strap around the chest, and the patient leans forward until the therapist takes their weight.",
      "The therapist lets go suddenly and the patient takes one quick step to catch themselves — with the affected leg one time and the good leg the next.",
      "Repeat backwards and to each side.",
      "Light pushes: the therapist pushes the pelvis without warning, hard enough to need a step.",
      "Increase the lean or the push gradually, then do it during walking, then with an obstacle to step over.",
    ]],
    cues: [[
      "التصلّبُ لمنع الخطوة ⟵ تُترك الساقُ تخطو بسرعة.",
      "الخطوةُ بالساق السليمة دائماً ⟵ الساقُ المصابة تُدرَّب أيضاً.",
      "خطواتٌ صغيرةٌ كثيرة ⟵ خطوةٌ واحدةٌ واسعة.",
    ], [
      "Stiffening to avoid the step → let the leg step quickly.",
      "Always stepping with the good leg → the affected leg is trained too.",
      "Many small steps → one long step.",
    ]],
    easier: ["ميلٌ أصغر قبل الإفلات، والاتّجاهُ معلَنٌ مسبقاً، والقضبانُ بجانبه.", "A smaller lean before the release, the direction announced in advance, and the bars beside the patient."],
    harder: ["ميلٌ أكبر، واتّجاهٌ غيرُ معلَن، ودفعٌ أثناء المشي أو مع مهمّةٍ ثانية.", "A bigger lean, an unannounced direction, and pushes during walking or with a second task."],
    stopIf: ["دوخة، أو ألمٌ في الكتف المصابة، أو خوفٌ شديد، أو ضغطٌ فوق الحدّ ⟵ يتوقّف؛ ولا يُعمل بلا حزامٍ أو بلا معالجٍ ثانٍ.",
      "Dizziness, pain in the affected shoulder, marked fear, or blood pressure above the limit → stop; never done without a harness or a second therapist."],
    equipment: ["حزامُ أمانٍ فوق الرأس أو قضبانٌ متوازية، وحزامُ إمساكٍ عند الصدر، ومعالجان، وعوائقُ خفيفة.", "An overhead safety harness or parallel bars, a chest strap, two therapists and light obstacles."],
    doseNote: ["٣ مجموعات × ٥ لكلّ اتّجاه في اليومين الأخفّ من كلّ أسبوع (Mansfield 2018 — والعددُ اقتراح).", "3 sets × 5 in each direction on the two lighter days of each week (Mansfield 2018 — the numbers are a suggestion)."],
    images: [{ key: "reactive-stepping-practice-1", ar: "معالجٌ يمسك المريضَ المائلَ إلى الأمام بحزامٍ ثمّ يُفلته فيخطو خطوةً سريعة",
      en: "A therapist holding a forward-leaning patient by a strap, then releasing so the patient takes a quick step", search: "lean and release reactive balance training stroke" }],
  },
  {
    code: "stairs-speed-training", nameAr: "الدرج بسرعةٍ متزايدة ودرابزينٍ أقلّ", nameEn: "Stair training at increasing speed with less rail",
    kind: "functional", region: "whole_body", homeSuitable: true, sets: 3, reps: 3, rest: 60,
    purpose: ["الدرجُ بين البيت والمسجد والسوق من أصعب المهامّ بعد الجلطة: التمرينُ حسّن زمنَ صعود الدرج ٣٫٤ ثانية (يقينٌ منخفضٌ جداً، ٥٠ دقيقة أربعاً في الأسبوع ستّةَ أسابيع — Nascimento 2025)، والدرجُ بخطوةٍ تلو الأخرى أسرعَ وبدرابزينٍ أقلّ جزءٌ من التدريب عالي الشدّة المتغيّر (Hornby 2019). ولا تجربةَ للدرج وحده في المرحلة المزمنة تقيس السقوط (بحثٌ صفريّ).",
      "Stairs between home, the mosque and the market are among the hardest tasks after stroke: exercise improved stair-climbing time by 3.4 seconds (very low certainty; 50 minutes four times a week for six weeks — Nascimento 2025), and stairs step over step, faster and with less rail, are part of high-intensity variable training (Hornby 2019). There is no chronic-stage trial of stair training alone that measured falls (a documented zero result)."],
    start: ["درجٌ بدرابزين على جهة الذراع السليمة، والدعامةُ بالقدم إن وُصفت، وحزامُ إمساكٍ عند الخصر، والمعالجُ أسفلَ المريض قليلاً وفي جهته المصابة.",
      "A staircase with a rail on the side of the good arm, the orthosis on if prescribed, a gait belt at the waist, and the therapist slightly below the patient on the affected side."],
    steps: [[
      "البداية: صعوداً بالسليمة أوّلاً ونزولاً بالمصابة أوّلاً، درجةً درجة.",
      "ثمّ خطوةٌ تلو الأخرى (ساقٌ في كلّ درجة) صعوداً، ثمّ نزولاً.",
      "خفّف الإمساكَ بالدرابزين: اليدُ تنزلق عليه ولا تسحب.",
      "قِس زمنَ عددٍ ثابت من الدرجات، وحاول أسرعَ قليلاً في كلّ مرّة بأمان.",
      "ثمّ مع حمل غرضٍ خفيف باليد السليمة، أو بلا درابزين لمن توازنُه جيّد.",
    ], [
      "To start: up with the good leg first and down with the affected leg first, one step at a time.",
      "Then step over step (one leg per stair) going up, then coming down.",
      "Ease the grip on the rail: the hand slides along it and does not pull.",
      "Time a fixed number of stairs and try to be slightly faster each time, safely.",
      "Then carry a light object in the good hand, or go without the rail if balance is good.",
    ]],
    cues: [[
      "سحبُ الجسم بالذراع ⟵ الساقُ تدفع والذراعُ للتوازن.",
      "القدمُ المصابة على حافّة الدرجة ⟵ القدمُ كاملةً على الدرجة.",
      "النظرُ إلى القدمين طوال الوقت ⟵ نظرةٌ إلى الدرجة ثمّ إلى الأمام.",
    ], [
      "Pulling the body up with the arm → the leg pushes and the arm is for balance.",
      "The affected foot on the edge of the stair → the whole foot on the stair.",
      "Looking at the feet all the time → a glance at the stair, then forward.",
    ]],
    easier: ["درجةٌ واحدة أو درجٌ قصير، ودرجةً درجة، والدرابزينُ باليد السليمة.", "One step or a short flight, one step at a time, with the rail in the good hand."],
    harder: ["خطوةٌ تلو الأخرى أسرع، ودرجٌ أطول، ومع حمل غرض، وبلا درابزين.", "Faster step over step, a longer flight, carrying an object, and without the rail."],
    stopIf: ["انثناءُ الركبة فجأةً، أو تعثّرُ القدم المصابة، أو علامةٌ من قاعدة الشدّة والسلامة ⟵ يتوقّف ويعود إلى درجةٍ درجة.",
      "The knee buckling suddenly, the affected foot catching, or any sign from the intensity and safety rule → stop and go back to one step at a time."],
    equipment: ["درجٌ بدرابزين أو درجاتُ تدريب، وحزامُ إمساك، وساعةُ توقيت.", "A staircase with a rail or training steps, a gait belt and a stopwatch."],
    doseNote: ["٣ مجموعات من ٣ صعوداتٍ ونزولات لدرجٍ ثابت مع قياس الزمن في أيّام الشدّة، وفي البيت بالدرابزين — والتجاربُ ٢٤ جلسة ٥٠ دقيقة (Nascimento 2025).",
      "3 sets of 3 ascents and descents of a fixed flight, timed, on the high-intensity days, and at home with the rail — the trials used 24 sessions of 50 minutes (Nascimento 2025)."],
    images: [{ key: "stairs-speed-training-1", ar: "مريضُ جلطة يصعد الدرجَ ممسكاً بالدرابزين والمعالجُ بجانبه",
      en: "A stroke survivor climbing stairs holding the rail with the therapist beside them", search: "stroke stair climbing training therapist rail" }],
  },
  {
    code: "floor-rise-hemiparesis", nameAr: "النزول إلى الأرض والقيام منها مع شلل نصف الجسم (وخطّة السقوط)", nameEn: "Getting down to and up from the floor with hemiparesis (and the fall plan)",
    kind: "functional", region: "whole_body", homeSuitable: true, sets: 1, reps: 3,
    purpose: ["ثلثُ مَن يسقط من مرضى الجلطة في بيوتهم لا يستطيع القيامَ وحده (٣٤٫١٪ — Goto 2019)، والإرشادُ الكنديّ يوصي بتعليم «كيف تقوم بعد السقوط» (Salbach 2026)؛ وفي تجربةٍ أوّلية أدّى ٦٤٪ من مرضى الجلطة طريقةَ القيام المستقلّ من الأرض صحيحاً وخطرُ الإصابة أثناءها ٦٫٨٪ (Hollands 2022)؛ واختبارُ النزول إلى الأرض والقيام منها موثوقٌ في المرحلة المزمنة — وأصغرُ تغيّرٍ يُعتدّ به ٧٫٧ ثانية (Ng 2015). وهو أيضاً طريقُ السجود والجلوس على الأرض.",
      "A third of stroke survivors who fall at home cannot get up alone (34.1% — Goto 2019), and the Canadian guideline recommends teaching 'how to get up from a fall' (Salbach 2026); in a pilot trial 64% of stroke survivors performed the independent getting-up technique correctly, with a 6.8% risk of injury while doing it (Hollands 2022); and the floor transfer test is reliable in the chronic stage — the smallest real change is 7.7 seconds (Ng 2015). It is also the route to prostration and floor sitting."],
    start: ["فرشةٌ على الأرض، وكرسيٌّ ثابتٌ أو أريكةٌ بجانب الجهة السليمة، والمعالجُ خلف المريض بحزام إمساك.",
      "A mat on the floor, a stable chair or sofa on the good side, and the therapist behind the patient with a gait belt."],
    steps: [[
      "النزول: قِف أمام الكرسيّ واليدُ السليمة على مقعده، وانزل على ركبة الساق السليمة ثمّ المصابة.",
      "انتقل إلى الأربع، ثمّ اجلس على الورك السليم، ثمّ استلقِ إن لزم.",
      "القيام: انقلب نحو الجهة السليمة، وارتكز على الساعد ثمّ اليد إلى الجلوس الجانبيّ، ثمّ إلى الأربع.",
      "اركع على الركبتين أمام الكرسيّ واليدُ السليمة على مقعده، ثمّ قدّم الساقَ السليمة (نصفُ ركوع) وادفع بها وباليد إلى الوقوف، ثمّ اجلس على الكرسيّ.",
      "إن لم يستطع: يزحف إلى الهاتف أو يطلب المساعدة، ويبقى دافئاً حتى تصل — وهذه خطّةُ السقوط في البيت.",
    ], [
      "Getting down: stand in front of the chair with the good hand on its seat, and kneel onto the good knee, then the affected knee.",
      "Move onto all fours, then sit onto the good hip, then lie down if needed.",
      "Getting up: roll towards the good side, push up on the forearm and then the hand into side-sitting, then onto all fours.",
      "Kneel up facing the chair with the good hand on its seat, bring the good leg forward (half-kneeling) and push with it and the hand to stand, then sit on the chair.",
      "If it is not possible: shuffle to the phone or call for help, and keep warm until help arrives — this is the fall plan at home.",
    ]],
    cues: [[
      "القيامُ بسحب الذراع المصابة، أو أن يسحبها أحد ⟵ لا شدَّ على الكتف المصابة أبداً.",
      "الاستعجالُ في الوقوف ⟵ وقفةٌ قصيرة في كلّ وضع.",
      "محاولةُ القيام بعد السقوط وهو مصابٌ أو دائخ ⟵ يبقى ويطلب المساعدة.",
    ], [
      "Getting up by pulling on the affected arm, or someone pulling it → never any pull on the affected shoulder.",
      "Rushing to stand → a short pause in each position.",
      "Trying to get up after a fall while injured or dizzy → stay down and call for help.",
    ]],
    easier: ["من مقعدٍ منخفض إلى الأرض بدرجاتٍ متوسّطة (كرسيٌّ صغير ثمّ وسادة)، أو بمساعدة شخصٍ واحد.", "From a low seat to the floor in intermediate stages (a low stool, then a cushion), or with one person helping."],
    harder: ["بلا كرسيّ، وأسرع، ومن الاستلقاء على الظهر، ومع قياس الزمن (اختبارُ النزول والقيام).", "Without a chair, faster, from lying on the back, and timed (the floor transfer test)."],
    stopIf: ["دوخة، أو ألمٌ في الكتف أو الركبة، أو ضغطٌ فوق الحدّ ⟵ يتوقّف؛ ومَن سقط وضرب رأسه وهو على مميّعٍ للدم ⟵ الطوارئ.",
      "Dizziness, shoulder or knee pain, or blood pressure above the limit → stop; anyone who falls and hits their head while on a blood thinner → emergency department."],
    equipment: ["فرشة، وكرسيٌّ ثابتٌ أو أريكة، وحزامُ إمساك، وهاتفٌ في المتناول في البيت.", "A mat, a stable chair or sofa, a gait belt, and a phone within reach at home."],
    doseNote: ["مرّتان إلى ثلاثٍ في اليومين الأخفّ من المرحلة الثانية، ثمّ مع المرافق في البيت أسبوعياً (اقتراح).", "Two to three times on the two lighter days of phase 2, then weekly at home with the carer (a suggestion)."],
    images: [{ key: "floor-rise-hemiparesis-1", ar: "مريضُ جلطة يقوم من الأرض بنصف ركوعٍ والساقُ السليمة أمامه ويدُه السليمة على كرسيّ",
      en: "A stroke survivor rising from the floor through half-kneeling with the good leg forward and the good hand on a chair", search: "stroke getting up from the floor half kneeling chair" }],
  },
  {
    code: "prayer-hemiparesis-pathway", nameAr: "الصلاة بعد الجلطة: القيامُ بجانب كرسيّ ثمّ الركوعُ ثمّ السجود", nameEn: "Prayer after stroke: standing beside a chair, bowing, then prostration",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["الصلاةُ خمسَ مرّاتٍ يومياً هدفٌ يريده كثيرٌ من المرضى وتمرينٌ متكرّر: في تجربةٍ واحدة في ٣٢ مريضاً كان التدريبُ بتكرار حركات الصلاة أفضلَ في التوازن والحركة والنهوض والمشي من التدريب الموجَّه بالمهمّة في الأسبوعين الرابع والسادس (Ghous 2017)، والمرضى المسلمون يجدون الصلاةَ والوضوءَ صعبين بعد الجلطة ويريدون المساعدةَ فيهما (Mohamed 2015)، والمعهدُ البريطانيّ يعدّ زيارةَ مكان العبادة من أهداف المشاركة (NICE NG236). ولا دراسةَ لطريقٍ متدرّجٍ للصلاة بعد الجلطة (بحثٌ صفريّ) — اقتراح، والحكمُ الشرعيّ — ومنه الصلاةُ جالساً حين يتعذّر القيامُ أو السجود — للمريض ومرجعه.",
      "Prayer five times a day is a goal many patients want and a repeated exercise: in one trial of 32 patients, training by repeating the movements of prayer was better for balance, movement, rising and walking than task-oriented training at weeks 4 and 6 (Ghous 2017); Muslim stroke survivors find prayer and ablution difficult and want help with them (Mohamed 2015); and NICE lists visiting a place of worship among participation goals (NICE NG236). There is no study of a graded prayer pathway after stroke (a documented zero result) — a suggestion, with the religious ruling — including praying seated when standing or prostration is not possible — for the patient and their scholar."],
    start: ["سجّادة، وكرسيٌّ ثابتٌ بجانب الجهة المصابة، والدعامةُ بالقدم إن وُصفت، والمعالجُ أو المرافق في الجهة المصابة.",
      "A prayer mat, a stable chair beside the affected side, the orthosis on if prescribed, and the therapist or carer on the affected side."],
    steps: [[
      "القيام: واقفاً والكرسيُّ بجانب الجهة المصابة، والوزنُ على الساقين معاً، والذراعُ المصابة على البطن بلا شدّ.",
      "الركوع: اليدان على الفخذين أو اليدُ السليمة على الكرسيّ، والركبتان مثنيّتان قليلاً.",
      "السجود: بطريقة النزول إلى الأرض في بطاقتها — الركبتان ثمّ اليدان — واليدُ المصابة على الأرض إن استطاعت حملَ شيءٍ من الوزن.",
      "الجلوسُ بين السجدتين وللتشهّد على الأرض أو على وسادة، ثمّ القيامُ بطريقة القيام من الأرض.",
      "ومن لا يسجد بأمان بعد: يصلّي جالساً على الكرسيّ ويومئ بالركوع والسجود، ويتدرّب على الأوضاع في الجلسات حتى يعود إليها.",
    ], [
      "Standing: upright with the chair beside the affected side, weight on both legs, and the affected arm resting on the abdomen without pulling.",
      "Bowing: hands on the thighs or the good hand on the chair, with the knees slightly bent.",
      "Prostration: by the getting-down method on its card — knees, then hands — with the affected hand on the floor if it can take some weight.",
      "Sitting between the prostrations and for tashahhud on the floor or on a cushion, then rising by the getting-up method.",
      "Anyone not yet safe to prostrate: prays seated on the chair, gesturing the bow and prostration, and practises the positions in sessions until able to return to them.",
    ]],
    cues: [[
      "الوقوفُ على الساق السليمة وحدها ⟵ الوزنُ على الساقين.",
      "سحبُ الذراع المصابة أو تركُها معلّقة ⟵ على الفخذ أو على الأرض.",
      "القيامُ من السجود بسرعة ⟵ وقفةٌ على الركبتين ثمّ نصفُ ركوع.",
    ], [
      "Standing on the good leg only → weight on both legs.",
      "Pulling the affected arm or leaving it hanging → on the thigh or on the floor.",
      "Rising quickly from prostration → a pause on the knees, then half-kneeling.",
    ]],
    easier: ["الصلاةُ جالساً على الكرسيّ مع الإيماء، والقيامُ وحده واقفاً بجانب الكرسيّ.", "Praying seated on the chair with gestures, and only the standing part done upright beside the chair."],
    harder: ["السجودُ والجلوسُ على الأرض كاملاً، والقيامُ بلا كرسيّ، وصلاةٌ أطول.", "Full prostration and floor sitting, rising without the chair, and longer prayers."],
    stopIf: ["دوخةٌ عند القيام من السجود، أو فقدُ التوازن، أو ألمٌ في الكتف المصابة ⟵ الخطوةُ السابقة ويخبر الأخصائيّ.",
      "Dizziness on rising from prostration, loss of balance, or pain in the affected shoulder → back to the previous step and tell the therapist."],
    equipment: ["سجّادةُ صلاة، وكرسيٌّ ثابت، ووسادة، وحزامُ إمساكٍ في الجلسة.", "A prayer mat, a stable chair, a cushion, and a gait belt in the session."],
    doseNote: ["كلُّ وضعٍ ٣–٥ مرّات في الأيّام الأخفّ من المرحلة الثالثة، ثمّ في الصلوات اليومية بقدر ما يستطيع بأمان (اقتراح).", "Each position 3–5 times on the lighter days of phase 3, then in the daily prayers as far as is safe (a suggestion)."],
    images: [{ key: "prayer-hemiparesis-pathway-1", ar: "أوضاعُ الصلاة: القيامُ والركوعُ والسجود — والكرسيُّ بجانب الجهة المصابة في الخطوات",
      en: "The positions of prayer: standing, bowing and prostration — the chair beside the affected side is in the steps", search: "muslim prayer positions standing bowing prostration chair" }],
  },
  {
    code: "wudu-affected-arm-assist", nameAr: "الوضوء جالساً والذراعُ المصابة تساعد", nameEn: "Wudu (ablution) seated with the affected arm assisting",
    kind: "functional", region: "wrist_hand", homeSuitable: true,
    purpose: ["الوضوءُ مهمّةٌ يومية يجدها مرضى الجلطة صعبة (Mohamed 2015)، وتكرارُ المهامّ الحقيقية المتدرّجة هو ما يعيد استعمالَ اليد (1 A — Richards 2026)؛ والوضوءُ خمسَ مرّاتٍ يومياً فرصةٌ لاستعمال الذراع المصابة في مهمّةٍ ذات معنى بدل الاعتماد على السليمة وحدها («عدمُ الاستعمال المتعلَّم»). ولا دراسةَ للوضوء بعد الجلطة (بحثٌ صفريّ) — اقتراحٌ يتبع مبادئ تدريب المهامّ، والحكمُ الشرعيّ للمريض ومرجعه.",
      "Ablution is a daily task that stroke survivors find difficult (Mohamed 2015), and repeated, graded practice of real tasks is what restores use of the hand (1 A — Richards 2026); ablution five times a day is a chance to use the affected arm in a meaningful task instead of relying on the good one ('learned non-use'). There is no study of ablution after stroke (a documented zero result) — a suggestion following task-training principles, with the religious ruling for the patient and their scholar."],
    start: ["جالسٌ على كرسيٍّ ثابت أمام المغسلة أو أمام إناءٍ على طاولة، والقدمان على الأرض، وسجّادةٌ مانعةٌ للانزلاق، ومنشفةٌ قريبة.",
      "Sitting on a stable chair at the basin or in front of a bowl on a table, feet on the floor, a non-slip mat, and a towel within reach."],
    steps: [[
      "افتح الصنبورَ وأغلقه باليد المصابة إن استطاعت، أو باليدين معاً.",
      "اغسل اليدين معاً، واجعل اليدَ المصابة تحمل الماءَ بقدر ما تستطيع.",
      "المضمضةُ والاستنشاقُ وغسلُ الوجه باليدين معاً — والمرفقُ المصاب على حافّة المغسلة إن تعب.",
      "اغسل الذراعَ السليمة باليد المصابة، ثمّ المصابةَ باليد السليمة، ثمّ امسح الرأسَ والأذنين.",
      "القدمان جالساً بإناءٍ صغير على الأرض، أو المسحُ على الجوارب لمن يأخذ به — وتُجفَّف الأرضُ بعدها.",
    ], [
      "Turn the tap on and off with the affected hand if it can, or with both hands.",
      "Wash both hands together, letting the affected hand hold the water as far as it can.",
      "Rinse the mouth and nose and wash the face with both hands — resting the affected elbow on the edge of the basin if it tires.",
      "Wash the good arm with the affected hand, then the affected arm with the good hand, then wipe the head and ears.",
      "The feet seated with a small bowl on the floor, or wiping over socks for those who follow that ruling — and the floor is dried afterwards.",
    ]],
    cues: [[
      "الوقوفُ على أرضٍ مبلّلة ⟵ جالساً دائماً.",
      "تركُ اليد المصابة في الحِجر ⟵ تشارك في كلّ خطوةٍ تستطيعها.",
      "الانحناءُ إلى القدمين من الوقوف ⟵ الإناءُ على الأرض وهو جالس.",
    ], [
      "Standing on a wet floor → always seated.",
      "Leaving the affected hand in the lap → it takes part in every step it can.",
      "Bending down to the feet from standing → the bowl on the floor while seated.",
    ]],
    easier: ["اليدُ المصابة تساعد فقط (تثبيتُ الإناء أو الصنبور)، والمرافقُ يساعد في القدمين.", "The affected hand only assists (steadying the bowl or the tap), and the carer helps with the feet."],
    harder: ["اليدُ المصابة تحمل الماءَ وتغسل الوجه وحدها، ثمّ الوقوفُ إلى المغسلة بسندٍ لمن توازنُه جيّد.", "The affected hand holds the water and washes the face alone, then standing at the basin with support for those with good balance."],
    stopIf: ["انزلاقٌ أو دوخة، أو ألمٌ في الكتف المصابة عند رفع اليد إلى الرأس ⟵ مدىً أقلّ (المرفقُ على الحافّة) ويخبر الأخصائيّ.",
      "Slipping or dizziness, or pain in the affected shoulder on raising the hand to the head → a smaller range (elbow on the edge) and tell the therapist."],
    equipment: ["كرسيٌّ ثابت، وإناءٌ صغير، وسجّادةٌ مانعةٌ للانزلاق، ومنشفة.", "A stable chair, a small bowl, a non-slip mat and a towel."],
    doseNote: ["مرّةً في الجلسة في المرحلة الثالثة، ثمّ في كلّ وضوءٍ في البيت (اقتراح).", "Once per session in phase 3, then at every ablution at home (a suggestion)."],
    images: [{ key: "wudu-affected-arm-assist-1", ar: "شخصٌ جالسٌ على كرسيّ يتوضّأ أمام المغسلة بيديه معاً",
      en: "A person seated on a chair performing ablution at a basin with both hands", search: "wudu ablution seated chair" }],
  },
];

const SAFETY_RULE_AR = "قاعدةُ الشدّة والسلامة (في كلّ المراحل): قبل كلّ جلسة الضغطُ والنبضُ جالساً، ولا تبدأ الجلسةُ إن كان الانقباضيّ فوق ٢٠٠ أو الانبساطيّ فوق ١١٠ بعد خمس دقائق جلوس — وهو حدُّ منع اختبار الجهد (Henzlova 2016)، واستعمالُه قبل الجلسة اقتراح — ويُحال في اليوم نفسِه إن بقي؛ ولمن يأخذ الإنسولين أو منشّطات إفرازه يُقاس السكّر: تحت ٩٠ ملغم/دل يأخذ ١٥–٣٠ غراماً من سكّرٍ سريع قبل التمرين (Colberg 2016). والشدّةُ المستهدفة في المشي ٦٠–٨٠٪ من احتياطيّ النبض (النبضُ الأقصى ٢٠٨ − ٠٫٧ × العمر) أو جهدٌ محسوس ١٤–١٧ من ٢٠ (Hornby 2020 · Alt Murphy 2025)؛ ومع حاصرات بيتا يُخفض المدى عشرَ نبضات (Hornby 2019) أو يُقدَّر الأقصى ١٦٤ − ٠٫٧ × العمر (Richards 2026) ويُقاد بالجهد ١٤–١٦، ومع الرجفان الأذينيّ بالجهد وحده. يُقاس النبضُ كلَّ ٣–٥ دقائق والضغطُ مرّةً على الأقلّ في الجلسة، والخطواتُ بعدّاد (Miller 2021). ويتوقّف التمرينُ عند: انقباضيّ فوق ٢٤٠ مع انبساطيّ فوق ١١٠ (Miller 2021) — ولا يُتجاوز ٢٥٠/١١٥ أبداً (Billinger 2014) — أو هبوطِ الانقباضيّ ١٠ فأكثر مع زيادة الحِمل، أو ألمِ الصدر، أو ضيقِ نفسٍ شديد، أو شحوبٍ أو دوخة، أو علامةٍ عصبية جديدة، أو سقطةٍ بإصابة (Miller 2021). والشدّةُ العالية بعد إذن الطبيب: استشارتُه واختبارُ جهدٍ قصيرٌ أو أقصى جزءٌ من الإذن، والمشيُ ستّ دقائق يكفي وحده لشدّةٍ تحت ٥٠٪ (Richards 2026 · MacKay-Lyons 2020)؛ ومن لم يُجرِ اختباراً تبقى شدّتُه أقلّ ويُعوَّض بالمدّة والتكرار (Billinger 2014). ولا وفاةَ ولا حوادثَ خطيرة في تجارب الشدّة العالية بعد الجلطة (Boyne 2023 · Hornby 2019).\n";
const SAFETY_RULE_EN = "The intensity and safety rule (all phases): before every session, seated blood pressure and heart rate; the session does not start if systolic pressure is above 200 or diastolic above 110 after five minutes' sitting — the limit at which exercise testing is contraindicated (Henzlova 2016), used before a session as a suggestion — with same-day referral if it persists; for patients on insulin or insulin secretagogues, blood glucose is checked: below 90 mg/dL they take 15–30 g of fast-acting carbohydrate before exercise (Colberg 2016). The walking target is 60–80% of heart-rate reserve (maximum heart rate 208 − 0.7 × age) or perceived exertion of 14–17 out of 20 (Hornby 2020 · Alt Murphy 2025); on beta-blockers the range is lowered by ten beats (Hornby 2019) or the maximum estimated as 164 − 0.7 × age (Richards 2026) and steered by exertion 14–16, and with atrial fibrillation by exertion alone. Heart rate is checked every 3–5 minutes, blood pressure at least once per session, and steps with a counter (Miller 2021). Exercise stops for systolic pressure above 240 with diastolic above 110 (Miller 2021) — and 250/115 is never exceeded (Billinger 2014) — or for a fall of 10 or more in systolic pressure as the workload rises, chest pain, severe breathlessness, pallor or dizziness, a new neurological sign, or a fall with injury (Miller 2021). High intensity needs the doctor's clearance: a consultation and a submaximal or symptom-limited stress test are part of clearance, and a six-minute walk alone is enough only for training below 50% (Richards 2026 · MacKay-Lyons 2020); without a test the intensity stays lower and frequency and duration make up for it (Billinger 2014). There were no deaths or serious events in high-intensity trials after stroke (Boyne 2023 · Hornby 2019).\n";

const EXTEND_AR = "وفي الجلسة ٣٠ ثمّ ٣٦ يُعاد القياس: تمديدٌ واحد باثنتي عشرةَ جلسة (حتى ٤٨) إن بلغ مقياسٌ أساسيّ واحد على الأقلّ الفرقَ المهمّ في آخر اثنتي عشرةَ جلسة (السرعةُ ٠٫١٠ م/ث فأكثر، أو المشيُ ستّ دقائق ٣٤ متراً، أو بيرغ ٥، أو ميني-بيست ٤، أو فوغل-ماير للساق ٦ وللذراع ٥، أو ARAT ٦، أو الجلوسُ والقيامُ خمساً أسرعَ ٣ ثوانٍ — Bohannon 2014 · Tang 2012 · Hiengkaew 2012 · Beauchamp 2021 · Pandian 2016 · Page 2012 · Agustin 2021) ولم يبلغ أهدافَه، والالتزامُ جيّد، ولا علامةَ إحالة. والخروجُ حين تتحقّق الأهداف، أو حين يكون التغيّرُ في كلّ المقاييس الأساسية أقلَّ من خطأ القياس في آخر اثنتي عشرةَ جلسة. وبعد الخروج: البرنامجُ المنزليّ حتى الأسبوع الثاني عشر — المشيُ أو الدراجة ثلاثاً في الأسبوع فأكثر، والقوّةُ والتوازنُ مرّتين إلى ثلاث، نحو ١٥٠ دقيقة نشاطٍ متوسّط في الأسبوع (Richards 2026) — فالتجربةُ نشرت ٣٦ جلسةً على اثني عشرَ أسبوعاً والفائدةُ كانت تزيد حتى نهايتها (Boyne 2023)، والتمرينُ الهوائيّ ثمانيةُ أسابيع على الأقلّ (MacKay-Lyons 2020)؛ والخطواتُ تحتاج متابعةً بعدّاد، فالتدريبُ وحده لم يزد خطواتِ اليوم (Thompson 2025). ومراجعةٌ كلَّ ستّة أشهر، ودورةٌ جديدة حين تنقص السرعةُ ٠٫١٦ م/ث أو ARAT ستّاً أو بارثيل نقطتين (الهولنديّ KNGF)، أو بيرغ خمساً، أو يسقط بإصابة أو مرّتين، أو تتغيّر حاجتُه إلى دعامةٍ أو تحفيز، أو يظهر هدفٌ جديد، أو بعد حقنة البوتوكس (Nelson 2026 · NICE NG236). ولا تجربةَ تقول كم مرّةً تُعاد الدورة (بحثٌ صفريّ).";
const EXTEND_EN = "At session 30 and again at 36 the measures are repeated: one extension of twelve sessions (to 48) if at least one primary measure has reached the important change over the last twelve sessions (speed by 0.10 m/s or more, the six-minute walk by 34 metres, Berg by 5, Mini-BESTest by 4, Fugl-Meyer by 6 for the leg or 5 for the arm, ARAT by 6, or five sit-to-stands 3 seconds faster — Bohannon 2014 · Tang 2012 · Hiengkaew 2012 · Beauchamp 2021 · Pandian 2016 · Page 2012 · Agustin 2021) without the goals being met, with good adherence and no referral trigger. Discharge comes when the goals are met, or when change in every primary measure over the last twelve sessions is below measurement error. After discharge: the home programme to week 12 — walking or cycling three times a week or more and strength and balance two to three times, about 150 minutes of moderate activity a week (Richards 2026) — because the trial spread 36 sessions over twelve weeks and the benefit was still growing at the end (Boyne 2023), and aerobic training lasts at least eight weeks (MacKay-Lyons 2020); daily steps need follow-up with a counter, as training alone did not raise them (Thompson 2025). A review every six months, with a new course when speed falls by 0.16 m/s, ARAT by six or Barthel by two points (the Dutch KNGF guideline), or Berg by five, after a fall with injury or two falls, a change in the need for an orthosis or stimulator, a new goal, or after a botulinum toxin injection (Nelson 2026 · NICE NG236). No trial says how often a course should be repeated (a documented zero result).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "stroke-chronic-adult",
  summary: [
    "الجلطةُ الدماغية في المرحلة المزمنة: بعد ستّة أشهر من الجلطة — اصطلاحٌ للبحث لا حدٌّ للتعافي (Picelli 2026). عاش ٩٣٫٨ مليون شخصٍ في العالم بعد جلطةٍ سنة ٢٠٢١، وأُصيب ١١٫٩ مليوناً جديداً (Feigin 2024)؛ وفي سجلٍّ عراقيّ كان الضغطُ عند ٧٠٫٥٪ من مرضى الجلطة والسكّريُّ عند ٣٨٫٣٪ (Al-Shahni 2026)، والالتزامُ بالأدوية ضعيف (Basheti 2024)، ولا دراسةَ عراقية لتأهيل المرحلة المزمنة (بحثٌ صفريّ). " +
    "ومريضُ هذه المرحلة قليلُ الحركة — ٢٨٣٧ خطوة في اليوم في المتوسّط (Michael 2005) — ولياقتُه ٢٦–٨٧٪ من أقرانه (Smith 2012)، ويسقط أكثر: ٣٦٪ في السنة مقابل ٢٤٪ (Mackintosh 2005)، وثلثُ مَن يسقط لا يقوم وحده (Goto 2019). " +
    "و«الثبات» ليس سقفاً: ٣٣٩ تجربةً بدأت بعد ستّة أشهر وأكثرُها إيجابية (Teasell 2012)، والحساسيةُ للعلاج تمتدّ بعد السنة (Ballester 2019)، وبرنامجٌ مكثّف للذراع رفع فوغل-ماير من ٢٦ إلى ٣٧ بعد سنةٍ ونصف من الجلطة في المتوسّط (Ward 2019). " +
    "الإرشادات: الأمريكيّ ٢٠٢٦ — تدريبُ المشي والخطوات والتوازن الموجَّه بالمهمّة 1 A، والخطواتُ بشدّةٍ متوسّطة إلى عالية أو الدفعاتُ عالية الشدّة 2a، وأربعةُ أسابيع إلى ثمانية من جرعةٍ عالية (جلساتُ ساعةٍ إلى ساعتين خمساً في الأسبوع) 2a، والجهازُ الروبوتيّ للمشي عند القادر على المشي «بلا فائدة» A، والدعامةُ أو التحفيزُ الوظيفيّ للقدم 1 A، والبكراتُ فوق الرأس «ضارّة»، و١٥٠–٣٠٠ دقيقة نشاطٍ في الأسبوع 1 A (Richards 2026)؛ والأمريكيّ للعلاج الطبيعيّ — المشيُ بـ٦٠–٨٠٪ من احتياطيّ النبض قويٌّ معه، وضدّه بقوّة السيرُ بحمل الوزن والروبوتُ على السير وتمرينُ التوازن الثابت لأجل سرعة المشي (Hornby 2020)؛ والأوروبيّ — المشيُ عالي الشدّة للمرحلة المزمنة قويٌّ وزاد المشيَ ستّ دقائق ٣٩ متراً (Alt Murphy 2025)؛ والبريطانيّ — تدريبُ المشي «يُقدَّم»، والمشيُ الآليّ «في البحث فقط»، والروبوتُ للذراع «لا يُقدَّم»، ومراجعةٌ في الشهر السادس ثمّ كلَّ سنة، والمريضُ يحيل نفسه (NICE NG236)؛ والكنديّ — التحفيزُ الوظيفيّ والدعامةُ بقوّة، والروبوتُ لا يُفضَّل على التدريب المعتاد (Salbach 2026)، و«فترةُ تأهيلٍ أخرى» كلّما تغيّرت الوظيفة (Nelson 2026)؛ والهولنديّ — قياسٌ كلَّ ستّة أشهر، والتغيّرُ المهمّ ٠٫١٦ م/ث في السرعة وستُّ نقاط في ARAT ونقطتان في بارثيل (KNGF). " +
    "وفي التجارب: دفعاتُ ٣٠ ثانية بأعلى سرعةٍ آمنة ٣٦ جلسة زادت المشيَ ستّ دقائق ٤٤ متراً على المشي المتوسّط (Boyne 2023)، والخطواتُ المتغيّرة عالية الشدّة حتى ثلاثين جلسةً تفوّقت على المنخفضة في كلّ مقاييس المشي (Hornby 2019)، والتدريبُ الدائريّ زاد المشيَ ستّ دقائق ٦١ متراً والسرعةَ ٠٫١٥ م/ث (English 2017)، والقوّةُ وحدها لم تزد سرعةَ المشي (Saunders 2025a). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — قاعدةُ الشدّة والسلامة، والمشيُ عالي الشدّة على السير وعلى الأرض بخطواتٍ كثيرة متغيّرة، والدرج، والقوّةُ للساقين، والتوازنُ والخطوةُ الإنقاذية والقيامُ من الأرض، والذراعُ بمسارها، والمهامُّ اليومية (الصلاةُ والوضوءُ والمرحاض)، والبرنامجُ المنزليّ مع المرافق — والأجهزةُ مساعدة؛ ومساران: مَن لا يمشي وحده (FAC 0–2) ومَن يمشي (FAC 3–5)؛ وثلاثُ مراحل: الفحصُ والإذنُ والتعوّد، ثمّ التدريبُ عالي الشدّة كثيرُ التكرار، ثمّ الانتقالُ إلى النشاط الذاتيّ. " +
    "والعددُ ٣٦ جلسة بستٍّ في الأسبوع: التجاربُ ثلاثاً في الأسبوع اثني عشرَ أسبوعاً (Boyne 2023) أو حتى ثلاثين جلسةً في شهرين (Hornby 2019)، ونحو ثلاثين جلسةَ مشيٍ تلزم لتحسّنٍ مهمّ (Richards 2026 · Balinski 2022)، ولا تجربةَ لستٍّ في الأسبوع (بحثٌ صفريّ)؛ فهو اختيارُ خدمةٍ مكتوبٌ صريحاً: أربعةُ أيّامٍ للمشي عالي الشدّة ويومان أخفّ للقوّة والتوازن والذراع.",
    "Chronic stroke: more than six months after the stroke — a research convention, not a limit on recovery (Picelli 2026). 93.8 million people worldwide were living after a stroke in 2021 and 11.9 million had a new one (Feigin 2024); in an Iraqi registry hypertension was present in 70.5% of stroke patients and diabetes in 38.3% (Al-Shahni 2026), medication adherence is poor (Basheti 2024), and there is no Iraqi study of chronic-stage rehabilitation (a documented zero result). " +
    "Patients at this stage move little — 2,837 steps a day on average (Michael 2005) — their fitness is 26–87% of their peers' (Smith 2012), and they fall more: 36% a year against 24% (Mackintosh 2005), with a third of fallers unable to get up alone (Goto 2019). " +
    "The 'plateau' is not a ceiling: 339 trials began after six months and most were positive (Teasell 2012), responsiveness to treatment extends beyond a year (Ballester 2019), and an intensive arm programme raised Fugl-Meyer from 26 to 37 at a median of eighteen months after stroke (Ward 2019). " +
    "Guidelines: the 2026 American guideline — task-specific training of overground walking, stepping and balance 1 A, moderate-to-high-intensity stepping or high-intensity interval exercise 2a, four to eight weeks of high-dose therapy (sessions of one to two hours, five times a week) 2a, robot-assisted gait training in people who can walk 'no benefit' A, an ankle-foot orthosis or functional electrical stimulation for the foot 1 A, overhead pulleys 'harm', and 150–300 minutes of activity a week 1 A (Richards 2026); the American physical-therapy guideline — strong for walking at 60–80% of heart-rate reserve, and strong against body-weight-supported treadmill training, treadmill robots and static balance training for walking speed (Hornby 2020); the European guideline — high-intensity walking strong for the chronic stage, adding 39 metres to the six-minute walk (Alt Murphy 2025); NICE — offer walking training, electromechanical gait training only in research, do not offer robot arm training, review at six months and then yearly, and patients may refer themselves (NICE NG236); the Canadian guideline — functional electrical stimulation and orthoses strongly recommended, robots not recommended over conventional training (Salbach 2026), and 'a further period of rehabilitation' whenever function changes (Nelson 2026); and the Dutch guideline — measurement every six months, with important changes of 0.16 m/s in speed, six ARAT points and two Barthel points (KNGF). " +
    "In trials: 36 sessions of 30-second bursts at the fastest safe speed added 44 metres to the six-minute walk over moderate walking (Boyne 2023), high-intensity variable stepping over up to thirty sessions beat low intensity on every walking measure (Hornby 2019), circuit class training added 61 metres to the six-minute walk and 0.15 m/s to speed (English 2017), and strength training alone did not increase walking speed (Saunders 2025a). " +
    "So the protocol: a core in every session — the intensity and safety rule, high-intensity walking on the treadmill and overground with many varied steps, stairs, leg strength, balance with reactive stepping and getting up from the floor, the arm by its pathway, daily tasks (prayer, ablution and the toilet), and the home programme with the carer — with devices as adjuncts; two pathways: those who cannot walk alone (FAC 0–2) and those who can (FAC 3–5); and three phases: screening, clearance and familiarisation, then high-intensity, high-repetition training, then transfer to self-directed activity. " +
    "The dose is 36 sessions at six a week: trials used three a week for twelve weeks (Boyne 2023) or up to thirty sessions in two months (Hornby 2019), and about thirty walking sessions are needed for an important change (Richards 2026 · Balinski 2022), with no trial of six a week (a documented zero result); so it is a service choice stated openly: four days of high-intensity walking and two lighter days for strength, balance and the arm.",
  ],
  goals: [
    "• سرعةُ المشي ١٠ أمتار تزيد ٠٫١٠–٠٫١٦ م/ث فأكثر (Bohannon 2014 · KNGF)، أو ينتقل إلى فئة مشيٍ أعلى: البيتُ تحت ٠٫٤٩، والمجتمعُ المحدود ٠٫٤٩–٠٫٩٣، والمجتمعُ الكامل فوق ٠٫٩٣ م/ث (Fulk 2017).\n" +
    "• المشيُ ستّ دقائق يزيد ٣٤ متراً فأكثر (Tang 2012) — أقوى ما يتنبّأ بالمشي في المجتمع (Fulk 2017).\n" +
    "• بيرغ يزيد ٥ (Hiengkaew 2012) أو ميني-بيست ٤ (Beauchamp 2021)، والجلوسُ والقيامُ خمساً أسرعَ ٣ ثوانٍ (Agustin 2021)، ويعرف كيف يقوم من الأرض أو يطلب المساعدة.\n" +
    "• لمن له هدفٌ في الذراع: فوغل-ماير للذراع يزيد ٤٫٢٥–٧٫٢٥ (Page 2012) أو ARAT ستّاً (KNGF)، والذراعُ المصابة تشارك في مهمّةٍ يومية يختارها (الوضوءُ أو الأكل).\n" +
    "• خطواتُ اليوم تزيد نحو ألفٍ كلَّ شهر نحو ٥٠٠٠ فأكثر (اقتراح — Fulk 2017)، و١٥٠ دقيقة نشاطٍ متوسّط في الأسبوع (Richards 2026).\n" +
    "• الأهدافُ التي يختارها: الصلاةُ بأوضاعها، والوضوء، والمرحاض، والمشيُ إلى المسجد أو السوق.\n" +
    "• برنامجٌ منزليّ يؤدّيه مع المرافق حتى الأسبوع الثاني عشر، ويعرف علاماتِ الجلطة الجديدة (BE-FAST) وخطّةَ السقوط.",
    "• 10-metre walk speed up 0.10–0.16 m/s or more (Bohannon 2014 · KNGF), or a move to a higher walking category: household below 0.49, limited community 0.49–0.93, and full community above 0.93 m/s (Fulk 2017).\n" +
    "• The six-minute walk up 34 metres or more (Tang 2012) — the strongest predictor of community walking (Fulk 2017).\n" +
    "• Berg up 5 (Hiengkaew 2012) or Mini-BESTest up 4 (Beauchamp 2021), five sit-to-stands 3 seconds faster (Agustin 2021), and knowing how to get up from the floor or call for help.\n" +
    "• For those with an arm goal: Fugl-Meyer for the arm up 4.25–7.25 (Page 2012) or ARAT up six (KNGF), with the affected arm taking part in a daily task the patient chooses (ablution or eating).\n" +
    "• Daily steps up about a thousand each month towards 5,000 or more (a suggestion — Fulk 2017), and 150 minutes of moderate activity a week (Richards 2026).\n" +
    "• The goals the patient chooses: prayer in its positions, ablution, the toilet, and walking to the mosque or the market.\n" +
    "• A home programme done with the carer to week 12, and knowing the signs of a new stroke (BE-FAST) and the fall plan.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ تمرين (نحو ٦٠ دقيقة):\n" +
    "• التاريخ: نوعُ الجلطة وتاريخُها وما قبلها، وأمراضُ القلب والرجفانُ الأذينيّ، والضغطُ والسكّريّ وعلاجُه (الإنسولين)، وحاصراتُ بيتا، ومميّعاتُ الدم، والصرع، والسقوطُ في السنة الأخيرة وهل قام وحده، وحقنُ البوتوكس وتوقيتُها، والدعامةُ أو العصا، والمزاجُ والإعياء، والأهدافُ — ومنها الصلاةُ والوضوءُ والمرحاضُ والمسجد.\n" +
    "• الإذنُ قبل الشدّة العالية: استشارةُ الطبيب واختبارُ جهدٍ قصيرٌ أو أقصى، والمشيُ ستّ دقائق بالنبض والضغط والجهد يكفي لشدّةٍ تحت ٥٠٪ (Richards 2026 · MacKay-Lyons 2020)؛ والضغطُ والنبضُ قبل كلّ جلسة.\n" +
    "• المسار: مستوى المشي (FAC 0–5 — Mehrholz 2007) يحدّد المسار؛ والذراعُ بمستواها — شديدة (لا حركةَ في الرسغ والأصابع)، ومتوسّطة، وخفيفة (رسغٌ ٢٠° وأصابعُ ١٠° فأكثر للعلاج القسريّ — NICE NG236).\n" +
    "• المقاييس: المزروعةُ — سرعةُ المشي ١٠ أمتار، والمشيُ ستّ دقائق، وبيرغ، وفوغل-ماير للذراع، وأشوورث المعدَّل — ويُضاف: الجلوسُ والقيامُ خمساً (Mong 2010)، والنهوضُ والمشي، وميني-بيست (Tsang 2013)، وفوغل-ماير للساق (Pandian 2016)، وARAT وصندوقُ المكعّبات لمن له هدفٌ في الذراع (Chen 2009)، وخطواتُ اليوم بعدّادٍ يومين (Fini 2023)، والإعياءُ بالعربية (Abdulla 2019)، والخوفُ من السقوط بالعربية (Halaweh 2016)، ومقياسُ أثر الجلطة المختصر بالعربية (Albishi 2026)، واختبارُ النزول إلى الأرض والقيام (Ng 2015)؛ ولا نسخةَ عربية مُتحقَّقة لفوغل-ماير ولا ARAT ولا بارثيل ولا أشوورث (بحثٌ صفريّ) — فتُعطى بتعليماتها المعيارية.\n" +
    "• يُعاد التقييمُ كاملاً في الجلسات ٦ و١٨ و٣٠ و٣٦ (و٤٨ إن مُدّد) وكلَّ ستّة أشهر، والضغطُ وأسئلةُ الإحالة في كلّ جلسة.",
    "At the first session, before any exercise (about 60 minutes):\n" +
    "• History: the type and date of the stroke and any before it, heart disease and atrial fibrillation, blood pressure, diabetes and its treatment (insulin), beta-blockers, blood thinners, epilepsy, falls in the past year and whether the patient got up alone, botulinum toxin injections and their timing, the orthosis or cane, mood and fatigue, and the goals — including prayer, ablution, the toilet and the mosque.\n" +
    "• Clearance before high intensity: a medical consultation and a submaximal or symptom-limited stress test, and a six-minute walk with heart rate, blood pressure and exertion is enough for training below 50% (Richards 2026 · MacKay-Lyons 2020); blood pressure and heart rate before every session.\n" +
    "• The pathway: walking level (FAC 0–5 — Mehrholz 2007) sets the pathway; and the arm by its level — severe (no wrist or finger movement), moderate, and mild (20° of wrist and 10° of finger extension or more for constraint therapy — NICE NG236).\n" +
    "• Measures: the seeded ones — 10-metre walk speed, the six-minute walk, Berg, Fugl-Meyer for the arm and the modified Ashworth — plus: five sit-to-stands (Mong 2010), the timed up-and-go, the Mini-BESTest (Tsang 2013), Fugl-Meyer for the leg (Pandian 2016), ARAT and the Box and Block Test for arm goals (Chen 2009), daily steps with a counter over two days (Fini 2023), fatigue in Arabic (Abdulla 2019), fear of falling in Arabic (Halaweh 2016), the Arabic short-form Stroke Impact Scale (Albishi 2026), and the floor transfer test (Ng 2015); there is no validated Arabic version of Fugl-Meyer, ARAT, Barthel or the Ashworth scale (a documented zero result), so they are given with their standard instructions.\n" +
    "• The full assessment is repeated at sessions 6, 18, 30 and 36 (and 48 if extended) and every six months, with blood pressure and the referral questions at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• أيّامُ الشدّة الأربعة: ٣٠ دقيقة من المشي — دفعاتٌ على السير بحزام أمان (Boyne 2023)، وخطواتٌ متغيّرة: للخلف وللجانب، وميل، وعوائق، وأرضٌ غيرُ مستوية وضيّقة، ودرجٌ بسرعة (Hornby 2019) — بـ٦٠–٨٠٪ من احتياطيّ النبض، و٢٠٠٠–٣٠٠٠ خطوة في الجلسة، والصعوبةُ تقلّ بعد ٣–٥ خطواتٍ فاشلة متتالية وتزيد بعد ٣–٥ ناجحة (Hornby 2019).\n" +
    "• اليومان الأخفّ: مشيٌ متوسّط ٤٠–٦٠٪، والقوّةُ للساقين معاً ٢–٣ مجموعات × ٨–١٢ بثقلٍ يزيد (Richards 2026) — والقوّةُ وحدها لا تزيد سرعةَ المشي (Saunders 2025a) فتُقرن بالجلوس والقيام وصعود الدرجة؛ والتوازنُ والخطوةُ الإنقاذية (Mansfield 2018)؛ والقيامُ من الأرض.\n" +
    "• الذراع لمن له هدفٌ فيها: ١٥–٢٠ دقيقة نحو مئة تكرار لمهامّ متدرّجة (Birkenmeier 2010)، والتقدّمُ بصعوبة المهمّة لا بالعدد وحده (Lang 2016)، والعلاجُ القسريّ لمن يمدّ الرسغَ ٢٠° والأصابعَ ١٠° (Kwakkel 2015)، والمرآةُ للضعيفة جداً (Thieme 2018).\n" +
    "• الكتف: لا شدَّ على الذراع المصابة، ولا حركةَ منفعلة فوق ٩٠° بلا دوران اللوح، ولا بكراتٍ فوق الرأس (Richards 2026).\n" +
    "• مَن لا يمشي وحده (FAC 0–2): الجلوسُ والانتقالُ والوقوفُ والخطواتُ بمساعدة، والروبوتُ لزيادة الخطوات (Mehrholz 2025)، ثمّ المشيُ على الأرض حين يبلغ FAC 3.\n" +
    "• البرنامجُ المنزليّ مع المرافق ودفترُ المشي والخطوات (Vloothuis 2016 · Thompson 2025).\n" +
    SAFETY_RULE_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• The four high-intensity days: 30 minutes of walking — treadmill bursts in a safety harness (Boyne 2023) and varied stepping: backwards and sideways, inclines, obstacles, uneven and narrow surfaces, and stairs at speed (Hornby 2019) — at 60–80% of heart-rate reserve and 2,000–3,000 steps per session, with the difficulty reduced after 3–5 consecutive failed steps and increased after 3–5 successful ones (Hornby 2019).\n" +
    "• The two lighter days: moderate walking at 40–60%, strength for both legs at 2–3 sets × 8–12 with a rising load (Richards 2026) — strength alone does not raise walking speed (Saunders 2025a), so it is paired with sit-to-stand and step-ups; balance and reactive stepping (Mansfield 2018); and getting up from the floor.\n" +
    "• The arm, for those with an arm goal: 15–20 minutes of about a hundred repetitions of graded tasks (Birkenmeier 2010), progressing by task difficulty rather than by number alone (Lang 2016), constraint therapy for those with 20° of wrist and 10° of finger extension (Kwakkel 2015), and the mirror for a very weak arm (Thieme 2018).\n" +
    "• The shoulder: no pulling on the affected arm, no passive movement beyond 90° without scapular rotation, and no overhead pulleys (Richards 2026).\n" +
    "• Those who cannot walk alone (FAC 0–2): sitting, transfers, standing and assisted stepping, with the robot to add steps (Mehrholz 2025), then overground walking once FAC 3 is reached.\n" +
    "• The home programme with the carer, and a walking and step diary (Vloothuis 2016 · Thompson 2025).\n" +
    SAFETY_RULE_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: علاماتُ الجلطة الجديدة، وألمُ الصدر، والضغطُ والنبض، والسكّرُ لمن يأخذ الإنسولين، وسقطةٌ منذ الجلسة الماضية، وتورّمُ الساق، والمزاج.\n" +
    "• الطوارئ فوراً: علامةُ جلطةٍ جديدة بطريقة BE-FAST — التوازن والعينان والوجه والذراع والكلام والوقت — فالطريقةُ القديمة بلا التوازن والعينين تفوّت ١٤٫١٪ من الجلطات (Aroor 2017)؛ وألمُ الصدر أو ضيقُ نفسٍ شديد أو إغماء؛ وضربةُ رأسٍ بعد سقطة لمن يأخذ مميّعاً أو مضادَّ صفائح غيرَ الأسبرين وحده؛ وتفكيرٌ بإيذاء النفس (خطرُ الانتحار بعد الجلطة ١٫٧٣ ضعفاً — Vyas 2021)؛ ونوبةُ صرعٍ طويلة.\n" +
    "• مراجعةُ الطبيب في اليوم نفسِه (بلا تمرين): ضغطٌ فوق ٢٠٠/١١٠ بعد إعادة القياس؛ وشكٌّ في خثرةٍ في الساق — والشللُ نقطةٌ في مقياس ويلز فعلامةٌ واحدة أخرى تجعلها «مرجّحة»؛ ونوبةُ صرعٍ أولى أو جديدة؛ وهبوطُ سكّرٍ لا يتحسّن.\n" +
    "• مراجعةٌ خلال أيّام أو مخطَّطة: تشنّجٌ موضعيّ يعيق هدفاً ⟵ تقييمٌ للبوتوكس (والمعالجُ يراجعه بعد ٧–١٤ يوماً من الحقنة)؛ وتيبّسٌ يزيد رغم التمرين؛ وألمُ الكتف لا يهدأ في أسبوعين إلى أربعة أو علاماتُ متلازمة الألم الناحيّ المعقّد (تورّمٌ وتغيّرُ لون الجلد وحرارتِه)؛ والاكتئاب؛ والإعياء (ومنه انقطاعُ النفس أثناء النوم)؛ والضغطُ فوق ١٦٠/١٠٠ في زيارتين، أو نسيانُ الأدوية؛ ومشكلةُ الدعامة (احمرارٌ يبقى أكثرَ من ٣٠ دقيقة، أو ألم، أو تعثّرٌ جديد، أو فرطُ بسط الركبة) ⟵ قسمُ المساند.\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): البوتوكس يخفّف التشنّجَ الموضعيّ ويبلغ أثرُه ذروتَه في ٤–٨ أسابيع ويزول نحو ١٢ أسبوعاً (Richards 2026)، ويساعد في النظافة واللبس والألم أكثرَ من وظيفة الذراع (Shaw 2011)، ولم يزد سرعةَ المشي في الساق (De Santis 2025)؛ وأدويةُ التشنّج بالفم قد تسبّب النعاسَ والضعف (Richards 2026)؛ والفلوكستين لا يحسّن الحركة ويزيد الكسورَ والسقوط (FOCUS 2019 · Mead 2024)؛ والضغطُ والمميّعاتُ والستاتين وقايةٌ من جلطةٍ أخرى (Kleindorfer 2021).\n" +
    "موانعُ الأجهزة: منظّمُ ضربات القلب ومزيلُ الرجفان المزروع، وأمامُ الرقبة، والورم، والخثرة، والجلدُ المجروح للتحفيز والمغناطيس والموجات؛ والجلدُ ضعيفُ الإحساس للحرارة والشمع والتيكار؛ والمعدنُ في مجال التيكار؛ والصرعُ غيرُ المنضبط حذرٌ مع التحفيز (قواعدُ عامّة)؛ والمميّعاتُ واضطرابُ التخثّر للإبر والموجات.",
    "Before every session: signs of a new stroke, chest pain, blood pressure and heart rate, glucose for those on insulin, any fall since the last session, leg swelling, and mood.\n" +
    "• Emergency at once: a sign of a new stroke by BE-FAST — balance, eyes, face, arm, speech, time — since the older method without balance and eyes misses 14.1% of strokes (Aroor 2017); chest pain, severe breathlessness or fainting; a head injury after a fall in someone on an anticoagulant or an antiplatelet other than aspirin alone; thoughts of self-harm (suicide risk after stroke is 1.73 times higher — Vyas 2021); and a prolonged seizure.\n" +
    "• Same-day medical review (no exercise): blood pressure above 200/110 on repeat measurement; a suspected deep-vein thrombosis — the paralysis already scores one Wells point, so one more sign makes it 'likely'; a first or new seizure; and hypoglycaemia that does not settle.\n" +
    "• Review within days or planned: focal spasticity limiting a goal → assessment for botulinum toxin (with a therapy review 7–14 days after the injection); stiffness increasing despite exercise; shoulder pain not settling within two to four weeks or signs of complex regional pain syndrome (swelling and changes in skin colour and temperature); depression; fatigue (including sleep apnoea); blood pressure above 160/100 on two visits, or missed medicines; and orthosis problems (redness lasting more than 30 minutes, pain, new tripping, or knee hyperextension) → the orthotics department.\n" +
    "• What the patient is told (the doctor's decision): botulinum toxin reduces focal spasticity, peaks at 4–8 weeks and wears off at about 12 weeks (Richards 2026), helps hygiene, dressing and pain more than arm function (Shaw 2011), and did not increase walking speed when injected in the leg (De Santis 2025); oral antispasticity drugs may cause drowsiness and weakness (Richards 2026); fluoxetine does not improve movement and increases fractures and falls (FOCUS 2019 · Mead 2024); and blood pressure, blood thinners and statins protect against another stroke (Kleindorfer 2021).\n" +
    "Contraindications to devices: a pacemaker or implanted defibrillator, the front of the neck, tumour, thrombosis and broken skin for stimulation, magnetic therapy and shockwave; skin with poor sensation for heat, wax and Tecar; metal in the Tecar field; uncontrolled epilepsy as a caution with stimulation (general rules); and anticoagulants or bleeding disorders for needling and shockwave.",
  ],
  precautions: [
    "• قاعدةُ الشدّة والسلامة في «التمارين» لكلّ المراحل؛ والأسبوع: أربعةُ أيّامٍ للمشي عالي الشدّة ويومان أخفّ — والقوّةُ يوماً بعد يوم.\n" +
    "• الدعامةُ والتحفيزُ الوظيفيّ للقدم المتدلّية متكافئان في المشي (Kluding 2013 · Bethoux 2014 · Prenton 2018) — والدعامةُ تحسّن المشيَ ما دامت تُلبس (Choo 2021 · Tyson 2013)، والمركزُ يصنعها: فحصٌ عند التسليم وبعد أسبوعين وفي كلّ مراجعة؛ والتحفيزُ أفضلُ لمن جلدُه سليم وفهمُه جيّد ولا تيبّسَ ثابتاً في الكاحل، والدعامةُ لعدم ثبات الكاحل جانبياً وفرطِ بسط الركبة وضعفِ الإحساس الشديد (اقتراح).\n" +
    "• العصا: أنفعُ لمن سرعتُه ٠٫٤–٠٫٨ م/ث (+٠٫١٨ م/ث)، وقد تبطئ مَن يمشي فوق ٠٫٨ (Nascimento 2016).\n" +
    "• الكتف: الحمّالةُ للذراع الرخوة وحدها، ولا تُلبس روتينياً بعد ذلك (Ada 2005 · Salbach 2026)؛ والجبائرُ للرسغ واليد لا تمنع التيبّس (Lannin 2007) والتمطيطُ وحده لا يزيد المدى (Harvey 2017) — فالتمطيطُ داخل المهامّ وحمل الوزن.\n" +
    "• الإعياءُ عند نحو النصف (Alghamdi 2021): الجلسةُ في أنشط وقته، وراحةٌ قصيرة بين الكتل، والتمرينُ المتدرّج نفسُه علاجه.\n" +
    "• الصلاةُ والوضوءُ والمرحاض: بطاقتا الصلاة والوضوء، والقيامُ من الأرض طريقُ السجود؛ والسقوطُ أكثرُه في الطريق إلى المرحاض (Goto 2019) — فمقعدٌ مرتفعٌ فوق المرحاض العربيّ أو كرسيُّ مرحاضٍ ومقبضٌ وإضاءةٌ ليلية؛ ولا دراسةَ للمرحاض العربيّ بعد الجلطة (بحثٌ صفريّ)؛ والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• المرافق: يتعلّم البرنامجَ المنزليّ وخطّةَ السقوط وعلاماتِ الجلطة، فتمرينُ المرافق يحسّن التوازن بلا عبءٍ زائد (Vloothuis 2016).\n" +
    "• الحرُّ والحضور: الحرُّ في الصيف يرفع النبضَ والجهد — فالماءُ والمكانُ المكيّف والمشيُ صباحاً أو مساءً؛ ومن لا يستطيع الحضورَ يومياً يُعطى البديل: ثلاثاً في الأسبوع اثني عشرَ أسبوعاً كما في التجربة (Boyne 2023) — بندٌ لسليم.",
    "• The intensity and safety rule under 'Exercises' for every phase; the week: four days of high-intensity walking and two lighter days — with strength training every other day.\n" +
    "• An ankle-foot orthosis and functional electrical stimulation for foot drop are equivalent for walking (Kluding 2013 · Bethoux 2014 · Prenton 2018) — the orthosis improves walking while it is worn (Choo 2021 · Tyson 2013), and the centre makes it: checked at delivery, after two weeks and at every review; stimulation suits those with healthy skin, good understanding and no fixed ankle stiffness, and the orthosis suits sideways ankle instability, knee hyperextension and severe sensory loss (a suggestion).\n" +
    "• The cane: most useful for those walking at 0.4–0.8 m/s (+0.18 m/s), and it may slow those walking faster than 0.8 (Nascimento 2016).\n" +
    "• The shoulder: a sling only for a flaccid arm and not worn routinely after that (Ada 2005 · Salbach 2026); wrist and hand splints do not prevent contracture (Lannin 2007) and stretching alone does not increase range (Harvey 2017) — so stretching happens within tasks and weight-bearing.\n" +
    "• Fatigue affects about half (Alghamdi 2021): sessions at the patient's most alert time, short rests between blocks, and graded exercise itself as its treatment.\n" +
    "• Prayer, ablution and the toilet: the prayer and ablution cards, with getting up from the floor as the route to prostration; most falls happen on the way to the toilet (Goto 2019) — so a raised seat over the squat toilet or a commode, a grab rail and a night light; there is no study of the squat toilet after stroke (a documented zero result); the religious ruling is for the patient and their scholar.\n" +
    "• The carer: learns the home programme, the fall plan and the stroke signs, as carer-mediated exercise improves balance without added burden (Vloothuis 2016).\n" +
    "• Heat and attendance: summer heat raises heart rate and exertion — so water, an air-conditioned room and walking in the morning or evening; and those who cannot attend daily are offered the alternative: three times a week for twelve weeks, as in the trial (Boyne 2023) — an item for Saleem.",
  ],
  spw: 6, weeks: 6, minutes: 50, totalSessions: 36,
  refs: [
    { title: "Stroke rehabilitation in adults (NG236)", org: "NICE — National Institute for Health and Care Excellence", year: 2023, url: "https://www.nice.org.uk/guidance/ng236" },
    { title: "KNGF Clinical Practice Guideline for Physical Therapy in patients with stroke (English translation, V-12/2014)", org: "KNGF — Royal Dutch Society for Physical Therapy guideline (hosted copy)", year: 2014, url: "https://www.sfphysio.fr/docs/2015214232_kngf-stroke-2014.pdf" },
    { title: "Canadian Stroke Best Practice Recommendations — Rehabilitation, Recovery and Community Participation following Stroke, 7th edition", org: "Heart and Stroke Foundation of Canada", year: 2025, url: "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/" },
    { title: "Living Clinical Guidelines for Stroke Management — Chapter 5: Rehabilitation", org: "Stroke Foundation (Australia and New Zealand) living guideline", year: 2026, url: "https://informme.org.au/Guidelines/Living-guidelines-for-stroke-management" },
    { title: "Spasticity in adults: management using botulinum toxin — National guidelines (2nd edition)", org: "Royal College of Physicians (London) with BSRM, CSP, ACPIN and RCOT", year: 2018, url: "https://rcp.ac.uk/media/i1ijs0tm/spasticity-in-adults_final-version_march-2019.pdf" },
    { title: "2026 Guideline for Adult Stroke Rehabilitation and Recovery: A Guideline From the American Heart Association and American Stroke Association", org: "Stroke — American Heart Association / American Stroke Association guideline 2026 (Richards et al.)", year: 2026, url: "https://doi.org/10.1161/str.0000000000000536" },
    { title: "Clinical Practice Guideline to Improve Locomotor Function Following Chronic Stroke, Incomplete Spinal Cord Injury, and Brain Injury", org: "J Neurol Phys Ther — Academy of Neurologic Physical Therapy (APTA) guideline (Hornby et al.)", year: 2020, url: "https://doi.org/10.1097/npt.0000000000000303" },
    { title: "European Stroke Organisation (ESO) guideline on motor rehabilitation", org: "Eur Stroke J — European Stroke Organisation guideline (Alt Murphy et al.)", year: 2025, url: "https://doi.org/10.1177/23969873251338142" },
    { title: "Canadian Stroke Best Practice Recommendations: Rehabilitation, Recovery and Community Participation Following Stroke. Part One: Stroke Rehabilitation Planning for Optimal Care Delivery, 7th Edition Update 2025", org: "Am J Phys Med Rehabil — Canadian Stroke Best Practice Recommendations, 7th edition, part one (Nelson et al.)", year: 2026, url: "https://doi.org/10.1097/phm.0000000000002802" },
    { title: "Canadian Stroke Best Practice Recommendations Rehabilitation, Recovery, and Community Participation Following Stroke, Part Two: Delivery of Stroke Rehabilitation to Optimize Functional Recovery, 7th Edition Update 2025", org: "Am J Phys Med Rehabil — Canadian Stroke Best Practice Recommendations, 7th edition, part two (Salbach et al.)", year: 2026, url: "https://doi.org/10.1097/phm.0000000000002821" },
    { title: "Physical activity and exercise recommendations for stroke survivors: a statement for healthcare professionals from the American Heart Association/American Stroke Association", org: "Stroke — American Heart Association / American Stroke Association scientific statement (Billinger et al.)", year: 2014, url: "https://doi.org/10.1161/str.0000000000000022" },
    { title: "Aerobic Exercise Recommendations to Optimize Best Practices in Care After Stroke: AEROBICS 2019 Update", org: "Phys Ther — AEROBICS 2019 update (MacKay-Lyons et al.)", year: 2020, url: "https://doi.org/10.1093/ptj/pzz153" },
    { title: "Early Treatment of Post-Stroke Spasticity with Botulinum Toxin Type A: Myth or Reality?", org: "Toxins (Basel) (Picelli et al.)", year: 2026, url: "https://doi.org/10.3390/toxins18080356" },
    { title: "Global, regional, and national burden of stroke and its risk factors, 1990-2021: a systematic analysis for the Global Burden of Disease Study 2021", org: "Lancet Neurol (GBD 2021 Stroke Risk Factor et al.)", year: 2024, url: "https://doi.org/10.1016/s1474-4422(24)00369-7" },
    { title: "Acute Stroke Care in a Thrombolysis-Capable Emergency Department in Iraq: Patient Characteristics, Risk Factors, and Reperfusion Metrics From a One-Year Registry", org: "Cureus (Al-Shahni et al.)", year: 2026, url: "https://doi.org/10.7759/cureus.111782" },
    { title: "Medications Adherence and Associated Factors Among Patients with Stroke in Iraq", org: "Patient Prefer Adherence (Basheti et al.)", year: 2024, url: "https://doi.org/10.2147/ppa.s459289" },
    { title: "Reduced ambulatory activity after stroke: the role of balance, gait, and cardiovascular fitness", org: "Arch Phys Med Rehabil (Michael et al.)", year: 2005, url: "https://doi.org/10.1016/j.apmr.2004.12.026" },
    { title: "Cardiorespiratory fitness after stroke: a systematic review", org: "Int J Stroke (Smith et al.)", year: 2012, url: "https://doi.org/10.1111/j.1747-4949.2012.00791.x" },
    { title: "Falls incidence and factors associated with falling in older, community-dwelling, chronic stroke survivors (> 1 year after stroke) and matched controls", org: "Aging Clin Exp Res (Mackintosh et al.)", year: 2005, url: "https://doi.org/10.1007/bf03324577" },
    { title: "Incidence and circumstances of falls among community-dwelling ambulatory stroke survivors: A prospective study", org: "Geriatr Gerontol Int (Goto et al.)", year: 2019, url: "https://doi.org/10.1111/ggi.13594" },
    { title: "Time to rethink long-term rehabilitation management of stroke patients", org: "Top Stroke Rehabil (Teasell et al.)", year: 2012, url: "https://doi.org/10.1310/tsr1906-457" },
    { title: "A critical time window for recovery extends beyond one-year post-stroke", org: "J Neurophysiol (Ballester et al.)", year: 2019, url: "https://doi.org/10.1152/jn.00762.2018" },
    { title: "Intensive upper limb neurorehabilitation in chronic stroke: outcomes from the Queen Square programme", org: "J Neurol Neurosurg Psychiatry (Ward et al.)", year: 2019, url: "https://doi.org/10.1136/jnnp-2018-319954" },
    { title: "Optimal Intensity and Duration of Walking Rehabilitation in Patients With Chronic Stroke: A Randomized Clinical Trial", org: "JAMA Neurol (Boyne et al.)", year: 2023, url: "https://doi.org/10.1001/jamaneurol.2023.0033" },
    { title: "Contributions of Stepping Intensity and Variability to Mobility in Individuals Poststroke", org: "Stroke (Hornby et al.)", year: 2019, url: "https://doi.org/10.1161/strokeaha.119.026254" },
    { title: "Circuit class therapy for improving mobility after stroke", org: "Cochrane Database Syst Rev (English et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.cd007513.pub3" },
    { title: "Resistance training for people with stroke", org: "Cochrane Database Syst Rev (Saunders et al.)", year: 2025, url: "https://doi.org/10.1002/14651858.cd016001" },
    { title: "'Magic' Number of Treadmill Sessions Needed to Achieve Meaningful Change in Gait Speed After Stroke: A Systematic Review", org: "Am J Phys Med Rehabil (Balinski et al.)", year: 2022, url: "https://doi.org/10.1097/phm.0000000000001920" },
    { title: "Minimal clinically important difference for change in comfortable gait speed of adults with pathology: a systematic review", org: "J Eval Clin Pract (Bohannon et al.)", year: 2014, url: "https://doi.org/10.1111/jep.12158" },
    { title: "Predicting Home and Community Walking Activity Poststroke", org: "Stroke (Fulk et al.)", year: 2017, url: "https://doi.org/10.1161/strokeaha.116.015309" },
    { title: "Relationship between perceived and measured changes in walking after stroke", org: "J Neurol Phys Ther (Tang et al.)", year: 2012, url: "https://doi.org/10.1097/npt.0b013e318262dbd0" },
    { title: "Minimal detectable changes of the Berg Balance Scale, Fugl-Meyer Assessment Scale, Timed 'Up & Go' Test, gait speeds, and 2-minute walk test in individuals with chronic stroke with different degrees of ankle plantarflexor tone", org: "Arch Phys Med Rehabil (Hiengkaew et al.)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2012.01.014" },
    { title: "A prospective study to establish the minimal clinically important difference of the Mini-BESTest in individuals with stroke", org: "Clin Rehabil (Beauchamp et al.)", year: 2021, url: "https://doi.org/10.1177/02692155211025131" },
    { title: "Responsiveness and Minimal Clinically Important Difference of the Five Times Sit-to-Stand Test in Patients with Stroke", org: "Int J Environ Res Public Health (Agustín et al.)", year: 2021, url: "https://doi.org/10.3390/ijerph18052314" },
    { title: "Clinically important differences for the upper-extremity Fugl-Meyer Scale in people with minimal to moderate impairment due to chronic stroke", org: "Phys Ther (Page et al.)", year: 2012, url: "https://doi.org/10.2522/ptj.20110009" },
    { title: "Predictive validity and responsiveness of the functional ambulation category in hemiparetic patients after stroke", org: "Arch Phys Med Rehabil (Mehrholz et al.)", year: 2007, url: "https://doi.org/10.1016/j.apmr.2007.06.764" },
    { title: "5-repetition sit-to-stand test in subjects with chronic stroke: reliability and validity", org: "Arch Phys Med Rehabil (Mong et al.)", year: 2010, url: "https://doi.org/10.1016/j.apmr.2009.10.030" },
    { title: "Psychometric properties of the Mini-Balance Evaluation Systems Test (Mini-BESTest) in community-dwelling individuals with chronic stroke", org: "Phys Ther (Tsang et al.)", year: 2013, url: "https://doi.org/10.2522/ptj.20120454" },
    { title: "Minimal clinically important difference of the lower-extremity fugl-meyer assessment in chronic-stroke", org: "Top Stroke Rehabil (Pandian et al.)", year: 2016, url: "https://doi.org/10.1179/1945511915y.0000000003" },
    { title: "Test-retest reproducibility and smallest real difference of 5 hand function tests in patients with stroke", org: "Neurorehabil Neural Repair (Chen et al.)", year: 2009, url: "https://doi.org/10.1177/1545968308331146" },
    { title: "How should we measure physical activity after stroke? An international consensus", org: "Int J Stroke (Fini et al.)", year: 2023, url: "https://doi.org/10.1177/17474930231184108" },
    { title: "Psychometric properties of an Arabic version of the fatigue severity scale in patients with stroke", org: "Top Stroke Rehabil (Abdulla et al.)", year: 2019, url: "https://doi.org/10.1080/10749357.2019.1628465" },
    { title: "Cross-Cultural Adaptation, Validity and Reliability of the Arabic Version of the Falls Efficacy Scale-International (FES-I)", org: "Med Princ Pract (Halaweh et al.)", year: 2016, url: "https://doi.org/10.1159/000441128" },
    { title: "Cross-cultural adaptation and validation of the Short Form Stroke Impact Scale (SF-SIS) into Arabic among stroke survivors in Saudi Arabia", org: "Disabil Rehabil (Albishi et al.)", year: 2026, url: "https://doi.org/10.1080/09638288.2026.2729418" },
    { title: "Floor transfer test for assessing people with chronic stroke", org: "J Rehabil Med (Ng et al.)", year: 2015, url: "https://doi.org/10.2340/16501977-1958" },
    { title: "Does perturbation-based balance training prevent falls among individuals with chronic stroke? A randomised controlled trial", org: "BMJ Open (Mansfield et al.)", year: 2018, url: "https://doi.org/10.1136/bmjopen-2018-021510" },
    { title: "Translating animal doses of task-specific training to people with chronic stroke in 1-hour therapy sessions: a proof-of-concept study", org: "Neurorehabil Neural Repair (Birkenmeier et al.)", year: 2010, url: "https://doi.org/10.1177/1545968310361957" },
    { title: "Dose response of task-specific upper limb training in people at least 6 months poststroke: A phase II, single-blind, randomized, controlled trial", org: "Ann Neurol (Lang et al.)", year: 2016, url: "https://doi.org/10.1002/ana.24734" },
    { title: "Constraint-induced movement therapy after stroke", org: "Lancet Neurol (Kwakkel et al.)", year: 2015, url: "https://doi.org/10.1016/s1474-4422(14)70160-7" },
    { title: "Mirror therapy for improving motor function after stroke", org: "Cochrane Database Syst Rev (Thieme et al.)", year: 2018, url: "https://doi.org/10.1002/14651858.cd008449.pub3" },
    { title: "Electromechanical-assisted training for walking after stroke", org: "Cochrane Database Syst Rev (Mehrholz et al.)", year: 2025, url: "https://doi.org/10.1002/14651858.cd006185.pub6" },
    { title: "Caregiver-mediated exercises for improving outcomes after stroke", org: "Cochrane Database Syst Rev (Vloothuis et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.cd011058.pub2" },
    { title: "Maintenance of Improvements in Walking Activity in Individuals with Chronic Stroke: Follow-Up From the PROWALKS Randomized Controlled Trial", org: "Neurorehabil Neural Repair (Thompson et al.)", year: 2025, url: "https://doi.org/10.1177/15459683251352493" },
    { title: "ASNC imaging guidelines for SPECT nuclear cardiology procedures: Stress, protocols, and tracers", org: "J Nucl Cardiol (Henzlova et al.)", year: 2016, url: "https://doi.org/10.1007/s12350-015-0387-x" },
    { title: "Physical Activity/Exercise and Diabetes: A Position Statement of the American Diabetes Association", org: "Diabetes Care — American Diabetes Association position statement (Colberg et al.)", year: 2016, url: "https://doi.org/10.2337/dc16-1728" },
    { title: "Moderate-intensity exercise versus high-intensity interval training to recover walking post-stroke: protocol for a randomized controlled trial", org: "Trials (Miller et al.)", year: 2021, url: "https://doi.org/10.1186/s13063-021-05419-x" },
    { title: "BE-FAST (Balance, Eyes, Face, Arm, Speech, Time): Reducing the Proportion of Strokes Missed Using the FAST Mnemonic", org: "Stroke (Aroor et al.)", year: 2017, url: "https://doi.org/10.1161/strokeaha.116.015169" },
    { title: "Association Between Stroke and Subsequent Risk of Suicide: A Systematic Review and Meta-Analysis", org: "Stroke (Vyas et al.)", year: 2021, url: "https://doi.org/10.1161/strokeaha.120.032692" },
    { title: "Botulinum Toxin for the Upper Limb after Stroke (BoTULS) Trial: effect on impairment, activity limitation, and pain", org: "Stroke (Shaw et al.)", year: 2011, url: "https://doi.org/10.1161/strokeaha.110.582197" },
    { title: "Effects of lower limb botulinum toxin injections on gait functional outcomes in stroke survivors: a systematic review and meta-analysis", org: "Eur J Phys Rehabil Med (De Santis et al.)", year: 2025, url: "https://doi.org/10.23736/s1973-9087.25.08995-6" },
    { title: "Effects of fluoxetine on functional outcomes after acute stroke (FOCUS): a pragmatic, double-blind, randomised, controlled trial", org: "Lancet (FOCUS Trial et al.)", year: 2019, url: "https://doi.org/10.1016/s0140-6736(18)32823-x" },
    { title: "Individual patient data meta-analysis of the effects of fluoxetine on functional outcomes after acute stroke", org: "Int J Stroke (Mead et al.)", year: 2024, url: "https://doi.org/10.1177/17474930241242628" },
    { title: "2021 Guideline for the Prevention of Stroke in Patients With Stroke and Transient Ischemic Attack: A Guideline From the American Heart Association/American Stroke Association", org: "Stroke — American Heart Association / American Stroke Association secondary-prevention guideline 2021 (Kleindorfer et al.)", year: 2021, url: "https://doi.org/10.1161/str.0000000000000375" },
    { title: "Foot drop stimulation versus ankle foot orthosis after stroke: 30-week outcomes", org: "Stroke (Kluding et al.)", year: 2013, url: "https://doi.org/10.1161/strokeaha.111.000334" },
    { title: "The effects of peroneal nerve functional electrical stimulation versus ankle-foot orthosis in patients with chronic stroke: a randomized controlled trial", org: "Neurorehabil Neural Repair (Bethoux et al.)", year: 2014, url: "https://doi.org/10.1177/1545968314521007" },
    { title: "Functional electrical stimulation and ankle foot orthoses provide equivalent therapeutic effects on foot drop: A meta-analysis providing direction for future research", org: "J Rehabil Med (Prenton et al.)", year: 2018, url: "https://doi.org/10.2340/16501977-2289" },
    { title: "Effectiveness of an ankle-foot orthosis on walking in patients with stroke: a systematic review and meta-analysis", org: "Sci Rep (Choo et al.)", year: 2021, url: "https://doi.org/10.1038/s41598-021-95449-x" },
    { title: "Effects of an ankle-foot orthosis on balance and walking after stroke: a systematic review and pooled meta-analysis", org: "Arch Phys Med Rehabil (Tyson et al.)", year: 2013, url: "https://doi.org/10.1016/j.apmr.2012.12.025" },
    { title: "The provision of a cane provides greater benefit to community-dwelling people after stroke with a baseline walking speed between 0.4 and 0.8 metres/second: an experimental study", org: "Physiotherapy (Nascimento et al.)", year: 2016, url: "https://doi.org/10.1016/j.physio.2015.10.005" },
    { title: "Supportive devices for preventing and treating subluxation of the shoulder after stroke", org: "Cochrane Database Syst Rev (Ada et al.)", year: 2005, url: "https://doi.org/10.1002/14651858.cd003863.pub2" },
    { title: "Effects of splinting on wrist contracture after stroke: a randomized controlled trial", org: "Stroke (Lannin et al.)", year: 2007, url: "https://doi.org/10.1161/01.str.0000251722.77088.12" },
    { title: "Stretch for the treatment and prevention of contracture: an abridged republication of a Cochrane Systematic Review", org: "J Physiother (Harvey et al.)", year: 2017, url: "https://doi.org/10.1016/j.jphys.2017.02.014" },
    { title: "Prevalence of fatigue after stroke: A systematic review and meta-analysis", org: "Eur Stroke J (Alghamdi et al.)", year: 2021, url: "https://doi.org/10.1177/23969873211047681" },
    { title: "Factors Influencing the Efficacy of Aerobic Exercise for Improving Fitness and Walking Capacity After Stroke: A Meta-Analysis With Meta-Regression", org: "Arch Phys Med Rehabil (Boyne et al.)", year: 2017, url: "https://doi.org/10.1016/j.apmr.2016.08.484" },
    { title: "Robot-assisted gait training in people with subacute and chronic stroke: a randomized controlled trial", org: "Front Neurol (Stampfer-Kountchev et al.)", year: 2026, url: "https://doi.org/10.3389/fneur.2026.1898475" },
    { title: "Enhanced gait-related improvements after therapist- versus robotic-assisted locomotor training in subjects with chronic stroke: a randomized controlled study", org: "Stroke (Hornby et al.)", year: 2008, url: "https://doi.org/10.1161/strokeaha.107.504779" },
    { title: "Electrical stimulation of the motor system after stroke", org: "Cochrane Database Syst Rev (Scrivener et al.)", year: 2025, url: "https://doi.org/10.1002/14651858.cd015338.pub2" },
    { title: "Effect of Transcutaneous Electrical Nerve Stimulation on Spasticity in Adults With Stroke: A Systematic Review and Meta-analysis", org: "Arch Phys Med Rehabil (Mahmood et al.)", year: 2019, url: "https://doi.org/10.1016/j.apmr.2018.10.016" },
    { title: "Superior efficacy of 100-Hz transcutaneous electrical nerve stimulation in reducing post-stroke spasticity: a systematic review and meta-analysis", org: "J Neuroeng Rehabil (Diao et al.)", year: 2025, url: "https://doi.org/10.1186/s12984-025-01744-3" },
    { title: "Effectiveness of upper limb functional electrical stimulation after stroke for the improvement of activities of daily living and motor function: a systematic review and meta-analysis", org: "Syst Rev (Eraifej et al.)", year: 2017, url: "https://doi.org/10.1186/s13643-017-0435-5" },
    { title: "Short-Term Effects of Radial Extracorporeal Shock Wave Therapy in Addition to Physiotherapy on Spasticity, Walking Performance, and Quality of Life in Chronic Stroke: A Sham-Controlled Randomized Trial", org: "NeuroRehabilitation (Zeren et al.)", year: 2026, url: "https://doi.org/10.1177/10538135261486875" },
    { title: "Comparison of Therapeutic Ultrasound and Radial Shock Wave Therapy in the Treatment of Plantar Flexor Spasticity After Stroke: A Prospective, Single-blind, Randomized Clinical Trial", org: "J Stroke Cerebrovasc Dis (Radinmehr et al.)", year: 2019, url: "https://doi.org/10.1016/j.jstrokecerebrovasdis.2019.03.008" },
    { title: "Effect of Radial Shock Wave Therapy on Spasticity of the Upper Limb in Patients With Chronic Stroke: A Prospective, Randomized, Single Blind, Controlled Trial", org: "Medicine (Baltimore) (Li et al.)", year: 2016, url: "https://doi.org/10.1097/md.0000000000003544" },
    { title: "Long-term Effects of Extracorporeal Shock Wave Therapy on Poststroke Spasticity: A Meta-analysis of Randomized Controlled Trials", org: "J Stroke Cerebrovasc Dis (Jia et al.)", year: 2020, url: "https://doi.org/10.1016/j.jstrokecerebrovasdis.2019.104591" },
    { title: "Positive Effects of Extracorporeal Shock Wave Therapy on Spasticity in Poststroke Patients: A Meta-Analysis", org: "J Stroke Cerebrovasc Dis (Guo et al.)", year: 2017, url: "https://doi.org/10.1016/j.jstrokecerebrovasdis.2017.08.019" },
    { title: "The Current State of Knowledge on the Clinical and Methodological Aspects of Extracorporeal Shock Waves Therapy in the Management of Post-Stroke Spasticity-Overview of 20 Years of Experiences", org: "J Clin Med (Opara et al.)", year: 2021, url: "https://doi.org/10.3390/jcm10020261" },
    { title: "Effects of dry needling session frequency on wrist flexor spasticity and motor recovery after stroke: a single-blind randomized clinical trial", org: "Physiother Theory Pract (Nakhostin Ansari et al.)", year: 2024, url: "https://doi.org/10.1080/09593985.2023.2254827" },
    { title: "The Effect of Dry Needling on Lower Limb Dysfunction in Poststroke Survivors", org: "J Stroke Cerebrovasc Dis (Ghannadi et al.)", year: 2020, url: "https://doi.org/10.1016/j.jstrokecerebrovasdis.2020.104814" },
    { title: "Efficacy of dry needling in reducing spasticity after stroke: A systematic review and meta-analysis", org: "Complement Ther Med (Yuan et al.)", year: 2026, url: "https://doi.org/10.1016/j.ctim.2026.103420" },
    { title: "Is Dry Needling Effective for the Management of Spasticity, Pain, and Motor Function in Post-Stroke Patients? A Systematic Review and Meta-Analysis", org: "Pain Med (Fernández-de-Las-Peñas et al.)", year: 2021, url: "https://doi.org/10.1093/pm/pnaa392" },
    { title: "Dry Needling and Antithrombotic Drugs", org: "Pain Res Manag (Muñoz et al.)", year: 2022, url: "https://doi.org/10.1155/2022/1363477" },
    { title: "Effects of repetitive peripheral magnetic stimulation on upper extremity motor function recovery after stroke: a meta-analysis and dose-response study", org: "Front Neurol (Hui et al.)", year: 2026, url: "https://doi.org/10.3389/fneur.2026.1824669" },
    { title: "Effects of repetitive peripheral magnetic stimulation for the upper limb after stroke: Meta-analysis of randomized controlled trials", org: "Heliyon (Chen et al.)", year: 2023, url: "https://doi.org/10.1016/j.heliyon.2023.e15767" },
    { title: "Short-wave diathermy for spastic equinus foot in chronic stroke patients: a proof-of-concept pilot study", org: "Minerva Med (Picelli et al.)", year: 2023, url: "https://doi.org/10.23736/s0026-4806.21.07581-9" },
    { title: "Reduction in spasticity in stroke patient with paraffin therapy", org: "Neurol Res (Wang et al.)", year: 2017, url: "https://doi.org/10.1080/01616412.2016.1248169" },
    { title: "The clinical impact of high intensity laser therapy on post stroke shoulder pain and dysfunction associated with hemiplegia: a systematic review", org: "Neurol Sci (Bathla et al.)", year: 2026, url: "https://doi.org/10.1007/s10072-026-09004-5" },
    { title: "Comparative effectiveness of high-intensity laser therapy and ultrasound therapy for hemiplegic shoulder pain in stroke patients: a randomized controlled trial'", org: "Top Stroke Rehabil (Dajpratham et al.)", year: 2024, url: "https://doi.org/10.1080/10749357.2024.2359343" },
    { title: "Efficacy of therapeutic ultrasound in the treatment of spasticity: a randomized controlled study", org: "NeuroRehabilitation (Sahin et al.)", year: 2011, url: "https://doi.org/10.3233/nre-2011-0678" },
    { title: "Efficacy of therapeutic ultrasound and infrared in the management of muscle spasticity", org: "Brain Inj (Nakhostin Ansari et al.)", year: 2009, url: "https://doi.org/10.1080/02699050902973939" },
    { title: "Continuous passive motion improves shoulder joint integrity following stroke", org: "Clin Rehabil (Lynch et al.)", year: 2005, url: "https://doi.org/10.1191/0269215505cr901oa" },
    { title: "Backward walking training is as effective as or better than forward walking training for improving walking speed after stroke: a systematic review with meta-analysis", org: "Top Stroke Rehabil (Menezes et al.)", year: 2025, url: "https://doi.org/10.1080/10749357.2024.2420547" },
    { title: "Effects of detraining on cardiorespiratory fitness of individuals with chronic stroke", org: "Top Stroke Rehabil (Pereira et al.)", year: 2021, url: "https://doi.org/10.1080/10749357.2020.1816074" },
    { title: "Clinometric properties of the six-minute walk test in individuals undergoing rehabilitation poststroke", org: "Physiother Theory Pract (Fulk et al.)", year: 2008, url: "https://doi.org/10.1080/09593980701588284" },
    { title: "The Effectiveness of Perturbation-Based Training in the Treatment of Patients With Stroke: A Systematic Review and Meta-Analysis", org: "Neurosci Insights (Alayat et al.)", year: 2022, url: "https://doi.org/10.1177/26331055221114818" },
    { title: "A systematic review of perturbation-based balance training on reducing fall risk among individuals with stroke", org: "Clin Biomech (Bristol) (Brown et al.)", year: 2023, url: "https://doi.org/10.1016/j.clinbiomech.2023.106078" },
    { title: "Exercise improves stair climbing performance after stroke: A systematic review of randomized trials with meta-analysis", org: "PM R (Nascimento et al.)", year: 2025, url: "https://doi.org/10.1002/pmrj.13373" },
    { title: "Assessing the fidelity of the independently getting up off the floor (IGO) technique as part of the ReTrain pilot feasibility randomised controlled trial for stroke survivors", org: "Disabil Rehabil (Hollands et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1998672" },
    { title: "Effects of activity repetition training with Salat (prayer) versus task oriented training on functional outcomes of stroke", org: "J Pak Med Assoc (Ghous et al.)", year: 2017, url: "https://pubmed.ncbi.nlm.nih.gov/28770893/" },
    { title: "Issues post-stroke for Muslim people in maintaining the practice of salat (prayer): A qualitative study", org: "Collegian (Mohamed et al.)", year: 2015, url: "https://doi.org/10.1016/j.colegn.2014.01.001" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة في الجلسة — في أيّام الشدّة الأربعة ٣٠ دقيقة مشيٍ بـ٦٠–٨٠٪ من احتياطيّ النبض (دفعاتٌ على السير وخطواتٌ متغيّرة على الأرض ودرج — Boyne 2023 · Hornby 2019) و١٠ دقائق للتوازن أو الذراع، وفي اليومين الأخفّ مشيٌ متوسّط وقوّةٌ للساقين ٢–٣ × ٨–١٢ وتوازنٌ وخطوةٌ إنقاذية وقيامٌ من الأرض ومهامّ؛ والنبضُ كلَّ ٣–٥ دقائق والخطواتُ بعدّاد.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes per session — on the four high-intensity days 30 minutes of walking at 60–80% of heart-rate reserve (treadmill bursts, varied overground stepping and stairs — Boyne 2023 · Hornby 2019) and 10 minutes of balance or arm work, and on the two lighter days moderate walking, leg strength at 2–3 × 8–12, balance, reactive stepping, getting up from the floor and tasks; heart rate every 3–5 minutes and steps with a counter."],
      note: ["أساسيٌّ في كلّ جلسة — المشيُ والخطواتُ الموجَّهة بالمهمّة 1 A والشدّةُ المتوسّطة إلى العالية 2a (Richards 2026)، وقويٌّ بـ٦٠–٨٠٪ (Hornby 2020)، وقويٌّ للمرحلة المزمنة (Alt Murphy 2025)؛ والدراجةُ هنا بديلٌ للياقة في الأيّام التي لا يُمشى فيها — فالفائدةُ في المشي تأتي من المشي نفسِه (Boyne 2017).",
        "Core in every session — task-specific walking and stepping 1 A and moderate-to-high intensity 2a (Richards 2026), strong at 60–80% (Hornby 2020), and strong for the chronic stage (Alt Murphy 2025); cycling here is a fitness alternative on days without walking — walking benefits come from walking itself (Boyne 2017)."] },
    { code: "robotik", centreUse: "adjunct", evidence: "not_recommended", minutes: 25,
      params: { bwsPct: "As little as tolerated (suggestion — not verified)", speed: "Fast enough for HR at 40–60% of reserve", guidancePct: "As low as tolerated", durationMin: "20–30" },
      parameters: ["لمن لا يمشي وحده (FAC 0–2) فقط: ٢٠–٣٠ دقيقة داخل الجلسة لزيادة الخطوات، بأقلّ حملٍ للوزن وأقلّ توجيهٍ يتحمّلهما ونبضٍ ٤٠–٦٠٪ من الاحتياطيّ، ثمّ المشيُ على السير أو الأرض حين يبلغ FAC 3 — والإعداداتُ اقتراحٌ لم يُتحقَّق منه، فتُكتب من جهاز المركز؛ وفي التجارب ٤٥–٥٠ دقيقة أربعاً في الأسبوع أربعةَ أسابيع (Stampfer-Kountchev 2026).",
        "Only for those who cannot walk alone (FAC 0–2): 20–30 minutes within the session to add steps, with the least body-weight support and guidance tolerated and a heart rate of 40–60% of reserve, then treadmill or overground walking once FAC 3 is reached — the settings are an unverified suggestion, so they are entered from the centre's device; trials used 45–50 minutes four times a week for four weeks (Stampfer-Kountchev 2026)."],
      note: ["مساعدٌ بشرط — ولمن يمشي ممنوع: للقادر على المشي «بلا فائدة» A (Richards 2026)، وضدّه بقوّة على السير (Hornby 2020)، ولا يُفضَّل على التدريب المعتاد (Salbach 2026)، و«في البحث فقط» عند البريطانيّ (NICE NG236)، والتدريبُ بيد المعالج فاقه عند الماشين (Hornby 2008)؛ ولغير الماشي زاد فرصةَ المشي المستقلّ (نسبةُ الأرجحية ١٫٦٥) بلا فرقٍ بين ما قبل ثلاثة أشهر وما بعدها (Mehrholz 2025) — بندٌ لسليم.",
        "A conditional adjunct — and not for those who walk: for people who can walk 'no benefit' A (Richards 2026), strongly against on a treadmill (Hornby 2020), not preferred over conventional training (Salbach 2026), and 'research only' for NICE (NICE NG236), with therapist-assisted training beating it in walkers (Hornby 2008); for non-walkers it raised the chance of independent walking (odds ratio 1.65) with no difference before or after three months (Mehrholz 2025) — an item for Saleem."] },
    { code: "electro", centreUse: "adjunct", evidence: "recommended", minutes: 30,
      params: { currentType: "FES (foot drop) · CES (weakness) · TENS (spasticity)", frequencyHz: "TENS 100 (trials); FES/CES: device programme", pulseWidthUs: "Device programme (pulse settings not verified)", intensity: "FES clears the toes; CES visible contraction; TENS strong tingle", onOff: "CES cyclical — device programme", durationMin: "CES 30; TENS 30 or more" },
      parameters: ["ثلاثةُ استعمالات: (١) التحفيزُ الوظيفيّ لعصب الشظية للقدم المتدلّية أثناء المشي بديلاً للدعامة عند مَن يناسبه، (٢) التحفيزُ الدوريّ للعضلة الضعيفة التي لا تغلب الجاذبية — رافعاتُ القدم وباسطاتُ الرسغ والأصابع — ٣٠ دقيقة خمساً في الأسبوع بانقباضٍ مرئيّ (Scrivener 2025)، (٣) التحفيزُ عبر الجلد للتشنّج ٣٠ دقيقة فأكثر بـ١٠٠ هرتز قبل تدريب المهمّة (Mahmood 2019 · Diao 2025)؛ وللكتف المؤلم تحفيزٌ عضليّ بعد مراجعة الطبيب. وإعداداتُ النبضة لم يُتحقَّق منها في التجارب — فمن برنامج الجهاز.",
        "Three uses: (1) peroneal functional electrical stimulation for foot drop during walking, as an alternative to the orthosis for those it suits, (2) cyclical stimulation of a weak muscle that cannot overcome gravity — the ankle dorsiflexors and the wrist and finger extensors — 30 minutes five times a week with a visible contraction (Scrivener 2025), and (3) TENS for spasticity for 30 minutes or more at 100 Hz before task practice (Mahmood 2019 · Diao 2025); for a painful shoulder, NMES after medical review. The pulse settings were not verified in the trials — so they come from the device programme."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والدليلُ هنا قويّ: الدعامةُ أو التحفيزُ الوظيفيّ 1 A (Richards 2026) والتحفيزُ الوظيفيّ بقوّة (Salbach 2026) ومتكافئٌ مع الدعامة (Kluding 2013 · Bethoux 2014)، والتحفيزُ الدوريّ زاد القوّةَ بيقينٍ عالٍ (Scrivener 2025)، والتحفيزُ عبر الجلد خفّف التشنّج (Mahmood 2019)؛ وللذراع بعد السنة لم يحسّن الأنشطةَ اليومية (Eraifej 2017) و«لا يُقدَّم روتينياً» عند البريطانيّ إلّا تجربةً (NICE NG236). لا يُعطى بدلَ التمرين. ممنوعٌ مع منظّم ضربات القلب وعلى الجلد ضعيف الإحساس، وحذرٌ مع الصرع.",
        "Rotating adjunct by the centre's rule (Saleem) — and here the evidence is strong: an orthosis or functional stimulation 1 A (Richards 2026), functional stimulation strongly recommended (Salbach 2026) and equivalent to the orthosis (Kluding 2013 · Bethoux 2014), cyclical stimulation increased strength with high certainty (Scrivener 2025), and TENS reduced spasticity (Mahmood 2019); for the arm after a year it did not improve daily activities (Eraifej 2017), and NICE says not routinely, except as a trial (NICE NG236). Never instead of exercise. Contraindicated with a pacemaker and over skin with poor sensation, with caution in epilepsy."] },
    { code: "shockwaves", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 3,
      params: { sessions: "3 (1 / week × 3) — or 3 / week × 4 weeks" },
      parameters: ["للتشنّج الموضعيّ الذي يعيق هدفاً — باسطاتُ القدم (الساق) أو قابضاتُ الرسغ والأصابع — بعد التمطيط أو البوتوكس لا بدلهما: على بطن العضلة واتّصالها بالوتر، أسبوعياً ثلاثَ جلسات، ويتبعه تمطيطٌ وتدريبُ مهمّةٍ فوراً، ويُعاد قياسُ أشوورث في الأسبوعين الرابع والثاني عشر؛ ولألم الكتف بعد مراجعة الطبيب وحدها. " +
        "وفي التجارب: الشعاعيُّ ٠٫١٠–٠٫٢٠ مللي جول/مم² و٤٠٠٠–٦٠٠٠ نبضة ثلاثاً في الأسبوع أربعةَ أسابيع مع العلاج الطبيعيّ للساق (Zeren 2026)، و٠٫٣٤ مللي جول/مم² و٢٠٠٠ نبضة جلسةً واحدة (Radinmehr 2019)، وأسبوعياً ثلاثاً للذراع فبقي الأثرُ ١٦ أسبوعاً مقابل ثمانية لجلسةٍ واحدة (Li 2016). " +
        "والإعداداتُ (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز في خاناتها — يملؤها المشرفُ قبل الاعتماد؛ فقيمُ الأدبيات لا تنتقل بين جهازٍ وآخر.",
        "For focal spasticity that limits a goal — the ankle plantar flexors (calf) or the wrist and finger flexors — after stretching or botulinum toxin, never instead of them: over the muscle belly and the muscle–tendon junction, weekly for three sessions, followed at once by stretching and task practice, with the Ashworth score re-measured at weeks 4 and 12; and for shoulder pain only after medical review. " +
        "In trials: radial 0.10–0.20 mJ/mm² and 4,000–6,000 pulses three times a week for four weeks with physiotherapy for the leg (Zeren 2026), 0.34 mJ/mm² and 2,000 pulses as a single session (Radinmehr 2019), and weekly × 3 for the arm, with the effect lasting 16 weeks against eight for a single session (Li 2016). " +
        "The settings (type, intensity, frequency, impulses) come from the centre's own device, in their fields — the supervisor fills them before approval, since published values do not transfer between devices."],
      note: ["مساعدٌ بموعدٍ دوريّ — الكنديّ «يُنظر فيه» لتشنّج باسطات القدم وألمِ الكتف (Salbach 2026)، والأمريكيّ يعدّه للتشنّج فجوةً معرفية ولألم الكتف 2a (Richards 2026)، والبريطانيّ لم يذكره؛ وفي التحليلات خفّف التشنّجَ حتى ١٢ أسبوعاً (Jia 2020 · Guo 2017) ولا إعداداتِ معيارية (Opara 2021). حذرٌ مع المميّعات (لا قاعدةَ من التجارب)؛ ممنوعٌ على الخثرة والورم والجلد المجروح.",
        "Adjunct on a periodic schedule — the Canadian guideline says consider it for plantar-flexor spasticity and shoulder pain (Salbach 2026), the American guideline calls it a knowledge gap for spasticity and 2a for shoulder pain (Richards 2026), and NICE does not mention it; in meta-analyses it reduced spasticity for up to 12 weeks (Jia 2020 · Guo 2017), with no standard settings (Opara 2021). Caution with anticoagulants (no trial-based rule); contraindicated over thrombosis, tumour and broken skin."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 2, times: 3,
      params: { needleSize: "Centre's needles (sizes in trials not verified)", points: "Focal spastic muscle: calf, wrist and finger flexors", sessions: "3 within about a week" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، ولتشنّجٍ موضعيّ يعيق هدفاً: الإبرةُ الجافّة العميقة في العضلة المتشنّجة — عضلةُ الساق أو قابضاتُ الرسغ والأصابع — ثلاثُ جلساتٍ في نحو أسبوع، فالثلاثُ أفضلُ من واحدة في مقاومة الحركة والمدى (Nakhostin Ansari 2024 · Ghannadi 2020)، ويتبعها تدريبُ المهمّة فوراً؛ ولا تُعمل على ذراعٍ متورّمة أو جلدٍ متقرّح، ولا لمن يأخذ الوارفارين بلا قياس تخثّرٍ معروف.",
        "Dry-needling certified staff only, for focal spasticity that limits a goal: deep dry needling of the spastic muscle — the calf or the wrist and finger flexors — three sessions within about a week, as three beat one for resistance to movement and range (Nakhostin Ansari 2024 · Ghannadi 2020), followed at once by task practice; not over a swollen limb or broken skin, and not for patients on warfarin without a known clotting result."],
      note: ["مساعدٌ بموعدٍ دوريّ قصير الأثر — خفّف أشوورث ٠٫٦٥ والساقَ أكثرَ من الذراع على المدى القصير بيقينٍ متوسّط إلى منخفض (Yuan 2026)، ولم يبقَ الأثرُ في الأسبوع الرابع ولم يحسّن الحركة (Fernández-de-las-Peñas 2021)؛ والوخزُ الصينيّ للتشنّج ضعيفٌ ضدّه عند الأستراليّ. والمميّعاتُ ليست مانعاً مطلقاً لكنّها تحتاج تقديراً (Muñoz 2022).",
        "Adjunct on a short periodic schedule — it reduced the Ashworth score by 0.65, more in the leg than the arm, in the short term with moderate-to-low certainty (Yuan 2026), the effect was gone by week 4 and movement did not improve (Fernández-de-las-Peñas 2021); acupuncture for spasticity is weakly against in the Australian guideline. Anticoagulants are not an absolute contraindication but need a risk judgement (Muñoz 2022)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      params: { frequencyHz: "If peripheral magnetic stimulator: 10 (trials); if PEMF: device", durationMin: "10–20" },
      parameters: ["يُعرف نوعُ الجهاز أوّلاً من مواصفاته: إن كان محفّزاً مغناطيسياً طرفياً عالي الشدّة فالتجارب ١٠ هرتز ١٠–٢٠ دقيقة بـ٢٠–٥٥٪ من أقصى الجهاز ثلاثةَ أسابيع فأكثر على الذراع (Hui 2026)؛ وإن كان مجالاً نابضاً منخفض الشدّة (الأكثرُ في العيادات) فلا دليلَ له في الجلطة المزمنة — ويُكتب برنامجُ الجهاز.",
        "First find out the device type from its specification: if it is a high-intensity peripheral magnetic stimulator, trials used 10 Hz for 10–20 minutes at 20–55% of the maximum output for three weeks or more on the arm (Hui 2026); if it is a low-intensity pulsed field (the commonest in clinics), there is no chronic-stroke evidence — and the device programme is entered."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والمجالُ النابض بلا تجربةٍ في التعافي أو التشنّج بعد الجلطة (بحثٌ صفريّ)، والتحفيزُ الطرفيّ عالي الشدّة حسّن فوغل-ماير للذراع (Hui 2026 · Chen 2023) والتشنّجَ في بعضها لا كلّها — مستوى بحث، ولا إرشادَ يذكره. بندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب والمعدن قرب الملفّ والورم والحمل.",
        "Rotating adjunct by the centre's rule (Saleem) — a pulsed field has no trial in recovery or spasticity after stroke (a documented zero result), while high-intensity peripheral stimulation improved arm Fugl-Meyer (Hui 2026 · Chen 2023) and spasticity in some trials but not all — research level, and no guideline mentions it. An item for Saleem. Contraindicated with a pacemaker, metal near the coil, tumour and pregnancy."] },
    { code: "tecar", centreUse: "adjunct", evidence: "not_recommended", minutes: 10,
      params: { mode: "CAP, athermic to mild warmth (suggestion)", powerPct: "Low (suggestion — no trial)", durationMin: "10" },
      parameters: ["قبل التمطيط وتدريب المهمّة على العضلة المتشنّجة، بشدّةٍ منخفضة بلا حرارة أو بدفءٍ خفيف — والإعداداتُ اقتراح فلا تجربة؛ ويُفحص الإحساسُ قبله.",
        "Before stretching and task practice over the spastic muscle, at low athermic-to-mildly-warm intensity — the settings are a suggestion, as there is no trial; sensation is tested first."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — لا تجربةَ للتيكار في الجلطة (بحثٌ صفريّ)، ودراسةٌ أوّلية بلا مقارنة للموجات القصيرة في القدم المتشنّجة (Picelli 2023). ممنوعٌ مع منظّم ضربات القلب والمعدن في المجال والورم والجلد ضعيف الإحساس — وضعفُ الإحساس شائعٌ في الجهة المصابة.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial of Tecar in stroke (a documented zero result), only an uncontrolled pilot of short-wave diathermy in the spastic foot (Picelli 2023). Contraindicated with a pacemaker, metal in the field, tumour and skin with poor sensation — and poor sensation is common on the affected side."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "not_recommended", minutes: 10,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["للراحة قبل التمطيط وتدريب المهمّة فقط، على جلدٍ إحساسُه سليم — يُفحص الإحساسُ قبلها والجلدُ بعد خمس دقائق، ولا على الجهة المصابة إن ضعف إحساسُها.",
        "For comfort before stretching and task practice only, over skin with intact sensation — sensation is tested first and the skin checked after five minutes, and never over the affected side if its sensation is reduced."],
      note: ["مساعدٌ بالتناوب للراحة لا أكثر — لا تجربةَ للكمادة قبل التمطيط في الجلطة (بحثٌ صفريّ)، والإرشاداتُ لا تذكرها. وخطرُ الحرق مع ضعف الإحساس.",
        "Rotating adjunct for comfort only — there is no trial of hot packs before stretching in stroke (a documented zero result), and the guidelines do not mention them. The risk is a burn where sensation is reduced."] },
    { code: "wax", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["لليد المتشنّجة قبل تدريب المهمّة، بالغمس واللفّ، على يدٍ إحساسُها سليم وغيرِ متورّمة.", "For a spastic hand before task practice, by dip and wrap, on a hand with intact sensation and no swelling."],
      note: ["مساعدٌ بالتناوب — تجربةٌ واحدة: الشمعُ أربعةَ أسابيع خفّف تشنّجَ الذراع أكثرَ من الوهميّ ولم يغيّر الألم (Wang 2017). يُفحص الإحساسُ قبله.",
        "Rotating adjunct — one trial: four weeks of paraffin reduced arm spasticity more than placebo, without changing pain (Wang 2017). Sensation is tested first."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — والليزرُ عالي الشدّة لألم الكتف بعد الجلطة 2a مع غيره من الوسائل المساعدة (Richards 2026)، وفي المراجعة خفّف الألمَ أكثرَ من المقارنة (Bathla 2026) وساوى الأمواجَ فوق الصوتية (Dajpratham 2024) — فلسليم أن يجعله مساعداً لألم الكتف وحده.",
        "Not used until Saleem decides — high-intensity laser for shoulder pain after stroke is 2a among other adjuncts (Richards 2026), it reduced pain more than comparators in a review (Bathla 2026) and equalled ultrasound (Dajpratham 2024) — so Saleem may make it an adjunct for shoulder pain only."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لم يُضف شيئاً إلى التمطيط في التشنّج (Sahin 2011)، والهولنديّ يراه غيرَ فعّالٍ على الساق.", "Not used — it added nothing to stretching for spasticity (Sahin 2011), and the Dutch guideline finds it ineffective over the calf."] },
    { code: "infrared", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — جلسةٌ واحدة لم تخفّف التشنّج (Nakhostin Ansari 2009)، وخطرُ الحرق مع ضعف الإحساس.", "Not used — a single session did not reduce spasticity (Nakhostin Ansari 2009), and there is a burn risk with reduced sensation."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم الضغطُ الهوائيّ — لا تجربةَ له في تورّم اليد بعد الجلطة (بحثٌ صفريّ)؛ والتورّمُ بالحركة ورفعِ اليد والتدليكِ نحو القلب، وقفّازٍ ضاغطٍ بمراقبة (Salbach 2026).", "Pneumatic compression is not used — there is no trial for hand swelling after stroke (a documented zero result); swelling is managed with movement, elevation, retrograde massage and a compression glove with monitoring (Salbach 2026)."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — تجربةٌ واحدة في المرحلة الحادّة بلا فرقٍ في الألم أو التشنّج (Lynch 2005)، ولا تجربةَ في المرحلة المزمنة (بحثٌ صفريّ).", "Not used — one acute-stage trial with no difference in pain or tone (Lynch 2005), and no chronic-stage trial (a documented zero result)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا مكانَ للشدّ في الشلل النصفيّ (بحثٌ صفريّ)؛ ومَن معه اعتلالٌ جذريّ في الظهر أو الرقبة يأخذ بروتوكولَه.", "Not used — traction has no place in hemiparesis (a documented zero result); a patient with lumbar or cervical radiculopathy follows that protocol."] },
  ],
  phases: [
    {
      name: ["الفحصُ والإذنُ والتعوّد", "Screening, clearance and familiarisation"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (الأسبوعُ الأوّل)", "The first six sessions (the first week)"],
      goals: [
        "القياساتُ كلُّها مكتوبة، والإذنُ للشدّة العالية موجود (أو خطّةٌ بالجهد وحده)، واستجابةُ النبض والضغط معروفة، والمشيُ يرتفع من ٤٠–٦٠٪ إلى ٦٠–٧٠٪ من احتياطيّ النبض، وأثقالُ القوّة مضبوطة، والدعامةُ أو العصا مفحوصة، والبرنامجُ المنزليّ ودفترُ الخطوات بدآ؛ والمريضُ والمرافق يعرفان علاماتِ الجلطة وقاعدةَ الجهد.",
        "All baseline measures recorded, clearance for high intensity in place (or an exertion-only plan), the heart-rate and blood-pressure response known, walking rising from 40–60% to 60–70% of heart-rate reserve, strength loads set, the orthosis or cane checked, and the home programme and step diary started; the patient and carer know the stroke signs and the exertion rule.",
      ],
      education: [
        "• ما زال التحسّنُ ممكناً بعد ستّة أشهر — بالتدريب الكثير الشدّة والتكرار لا بالانتظار (Teasell 2012 · Hornby 2019).\n" +
        "• المشيُ هو التمرين: كلّما كثرت الخطوات في الجلسة تحسّن المشي (Hornby 2019)، والجهدُ ١٤–١٧ من ٢٠ «صعبٌ لكن ممكن».\n" +
        "• علاماتُ الجلطة الجديدة (BE-FAST) ⟵ الإسعافُ فوراً، لا الانتظار إلى الجلسة (Aroor 2017).\n" +
        "• الضغطُ والسكّرُ والأدوية: تؤخذ في وقتها، والضغطُ يُقاس قبل كلّ جلسة — والوقايةُ من جلطةٍ أخرى جزءٌ من العلاج (Kleindorfer 2021).\n" +
        "• المرافق: يتعلّم المساعدةَ بأقلّ ما يلزم، ولا يسحب الذراعَ المصابة أبداً.",
        "• Improvement is still possible after six months — with plenty of intense, repeated training, not by waiting (Teasell 2012 · Hornby 2019).\n" +
        "• Walking is the exercise: the more steps in a session, the more walking improves (Hornby 2019), and exertion of 14–17 out of 20 is 'hard but doable'.\n" +
        "• Signs of a new stroke (BE-FAST) → call an ambulance at once, do not wait for the session (Aroor 2017).\n" +
        "• Blood pressure, glucose and medicines: taken on time, with blood pressure measured before every session — preventing another stroke is part of the treatment (Kleindorfer 2021).\n" +
        "• The carer: learns to help as little as needed, and never to pull on the affected arm.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• إذنُ الطبيب لـ٦٠٪ فأكثر من احتياطيّ النبض (أو خطّةٌ مكتوبة بالجهد وحده لمن يأخذ حاصراتِ بيتا أو معه رجفان).\n" +
        "• ٢٠ دقيقة مجموعةً من الخطوات في الجلسة بلا استجابةٍ غيرِ طبيعية للنبض أو الضغط.\n" +
        "• الضغطُ والسكّرُ في حدودهما قبل ثلاث جلساتٍ فأكثر، ولا علامةَ إحالة.\n" +
        "• المشيُ على السير بحزام الأمان آمن (أو بديلٌ على الأرض).\n" +
        "(اقتراحٌ مبنيٌّ على شروط التجارب، لا معيارٌ مجرَّب.) ومَن لا يمشي وحده (FAC 0–2) يبقى في مساره حتى يبلغ FAC 3.",
        "Progress to phase 2 when all are met:\n" +
        "• The doctor's clearance for 60% or more of heart-rate reserve (or a written exertion-only plan for those on beta-blockers or with atrial fibrillation).\n" +
        "• 20 minutes of stepping in total per session without an abnormal heart-rate or blood-pressure response.\n" +
        "• Blood pressure and glucose within limits before three sessions or more, with no referral sign.\n" +
        "• Walking on the treadmill in the safety harness is safe (or an overground alternative).\n" +
        "(A proposal built on the trials' entry conditions, not a tested criterion.) Those who cannot walk alone (FAC 0–2) stay on their pathway until FAC 3.",
      ],
      notes: [
        "• القياسُ الأوّل: المشيُ ستّ دقائق بالنبض والضغط والجهد اختبارٌ للاستجابة أيضاً (Richards 2026)، وتُضبط سرعةُ السير الأولى نحو ٧٥٪ من أقصى سرعة في الاختبار (Miller 2021).\n" +
        "• المشيُ يرتفع تدريجياً: ٤٠–٦٠٪ في الجلستين الأوليين ثمّ ٦٠–٧٠٪، والدراجةُ للإحماء أو البديل.\n" +
        "• القوّة: تُضبط أثقالُ ٨–١٢ مرّة للجلوس والقيام وصعود الدرجة ورفع الكعبين والجسر (Richards 2026).\n" +
        "• الدعامةُ أو التحفيزُ الوظيفيّ: فحصٌ مع قسم المساند، والعصا لمن سرعتُه ٠٫٤–٠٫٨ م/ث (Nascimento 2016).\n" +
        "• الذراعُ بمسارها: مهامّ للمتوسّطة والخفيفة، والمرآةُ والتحفيزُ الدوريّ للشديدة.\n" +
        "• مسارُ FAC 0–2: الجلوسُ والانتقالُ والوقوفُ ونقلُ الوزن والخطواتُ بمساعدة، والروبوتُ إن قرّره سليم.",
        "• The first measurement: the six-minute walk with heart rate, blood pressure and exertion is also a response test (Richards 2026), and the first treadmill speed is set at about 75% of the fastest speed on the test (Miller 2021).\n" +
        "• Walking rises gradually: 40–60% in the first two sessions, then 60–70%, with the bike for warm-up or as the alternative.\n" +
        "• Strength: 8–12-repetition loads set for sit-to-stand, step-ups, heel raises and the bridge (Richards 2026).\n" +
        "• The orthosis or functional stimulation: checked with the orthotics department, and a cane for those walking at 0.4–0.8 m/s (Nascimento 2016).\n" +
        "• The arm by its pathway: tasks for moderate and mild, the mirror and cyclical stimulation for severe.\n" +
        "• The FAC 0–2 pathway: sitting, transfers, standing, weight shifting and assisted stepping, with the robot if Saleem decides.",
      ],
      exercises: [
        { code: "overground-gait-training",
          doseNote: ["كلَّ جلسة ١٠–٢٠ دقيقة بأقلّ مساعدة، والشدّةُ ترتفع من ٤٠–٦٠٪ إلى ٦٠–٧٠٪ من احتياطيّ النبض.", "Every session for 10–20 minutes with the least help, intensity rising from 40–60% to 60–70% of heart-rate reserve."] },
        { code: "hit-treadmill-walking",
          note: ["للتعوّد بشدّةٍ متوسّطة ٤٠–٦٠٪ حتى يأتي الإذن: الحزامُ وزرُّ التوقّف والسرعةُ واليدُ التي تلمس الدرابزين ولا تحمل.", "For familiarisation at moderate intensity, 40–60%, until clearance arrives: the harness, the stop button, the speed, and a hand that touches the rail without carrying weight."] },
        { code: "standing-weight-shift",
          note: ["للوقوف والتوازن لا لسرعة المشي — فتمرينُ التوازن الثابت وحده لا يزيدها (Hornby 2020).", "For standing and balance, not for walking speed — static balance training alone does not increase it (Hornby 2020)."] },
        { code: "side-stepping" },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["من مقعدٍ أخفض تدريجياً والقدمُ المصابة إلى الخلف قليلاً لتحمل وزناً؛ والعددُ خمساً بالزمن مقياسٌ (Mong 2010).", "From a gradually lower seat with the affected foot slightly back so it takes weight; five repetitions timed are a measure (Mong 2010)."] },
        { code: "step-up", sets: 2, reps: 10, rest: 60,
          note: ["بالساق المصابة أوّلاً، وارتفاعُ الدرجة يُضبط لثقل ٨–١٢ مرّة.", "Leading with the affected leg, with the step height set for an 8–12-repetition load."] },
        { code: "calf-raise", sets: 2, reps: 10, rest: 60 },
        { code: "glute-bridge", sets: 2, reps: 10, rest: 60 },
        { code: "ankle-dorsiflexion-seated",
          note: ["مع التحفيز الدوريّ لرافعات القدم إن لم تغلب الجاذبية (Scrivener 2025).", "With cyclical stimulation of the dorsiflexors if they cannot overcome gravity (Scrivener 2025)."] },
        { code: "calf-stretch-standing",
          note: ["تمطيطٌ نشط وهو يحمل الوزن، لا تمطيطٌ منفعلٌ وحده (Harvey 2017).", "An active stretch while bearing weight, not a passive stretch on its own (Harvey 2017)."] },
        { code: "stationary-cycling",
          doseNote: ["عشرُ دقائق إحماءً، أو بديلُ المشي في الأيّام التي لا يُمشى فيها.", "Ten minutes as a warm-up, or the alternative to walking on days without walking."] },
        { code: "reach-grasp-task",
          note: ["لمن له هدفٌ في الذراع: ١٥–٢٠ دقيقة نحو مئة تكرار لمهامّ يختارها (Birkenmeier 2010).", "For those with an arm goal: 15–20 minutes of about a hundred repetitions of tasks the patient chooses (Birkenmeier 2010)."] },
        { code: "table-towel-slide",
          note: ["للذراع الضعيفة جداً أو الكتف المؤلم — بلا بكراتٍ فوق الرأس (Richards 2026).", "For a very weak arm or a painful shoulder — without overhead pulleys (Richards 2026)."] },
        { code: "affected-arm-weight-bearing" },
        { code: "mirror-therapy",
          note: ["للذراع الضعيفة جداً: ١٥–٣٠ دقيقة، ويُتعلَّم للبيت (Thieme 2018).", "For a very weak arm: 15–30 minutes, taught for home use (Thieme 2018)."] },
        { code: "sitting-reach",
          note: ["لمسار FAC 0–2 وحده.", "For the FAC 0–2 pathway only."] },
        { code: "bed-to-chair-transfer",
          note: ["لمسار FAC 0–2 وحده — ولمن يقوم الليلَ إلى المرحاض.", "For the FAC 0–2 pathway only — and for those who get up at night to the toilet."] },
      ],
    },
    {
      name: ["التدريبُ عالي الشدّة كثيرُ التكرار", "High-intensity, high-repetition training"],
      sessionFrom: 7, sessionTo: 30,
      timeframe: ["الجلسات ٧–٣٠ (الأسابيعُ الثاني إلى الخامس)", "Sessions 7–30 (weeks 2 to 5)"],
      goals: [
        "مشيٌ بـ٦٠–٨٠٪ من احتياطيّ النبض و٢٠٠٠–٣٠٠٠ خطوة في جلسات الشدّة، والقوّةُ تزيد، والتوازنُ والخطوةُ الإنقاذية والقيامُ من الأرض تتقدّم، والذراعُ نحو مئة تكرار في الجلسة لمن له هدف؛ وفي الجلستين ١٨ و٣٠: السرعةُ +٠٫١٠–٠٫١٦ م/ث، والمشيُ ستّ دقائق +٣٤ متراً، وبيرغ +٥.",
        "Walking at 60–80% of heart-rate reserve and 2,000–3,000 steps on high-intensity days, strength increasing, balance, reactive stepping and getting up from the floor progressing, and about a hundred arm repetitions per session for those with an arm goal; at sessions 18 and 30: speed +0.10–0.16 m/s, the six-minute walk +34 metres, and Berg +5.",
      ],
      education: [
        "• الفائدةُ تحتاج وقتاً: الفرقُ في التجربة كان صغيراً في الأسبوع الرابع وكبيراً في الثاني عشر (Boyne 2023) — فلا يحكم مبكراً.\n" +
        "• الجهدُ العالي آمنٌ بالقاعدة: لا حوادثَ خطيرة في التجارب (Boyne 2023 · Hornby 2019)، والتوقّفُ عند علاماتها.\n" +
        "• الخطواتُ في اليوم: عدّادٌ أو هاتف، وألفُ خطوةٍ أكثر كلَّ شهر (اقتراح).\n" +
        "• الذراع: تُستعمل في كلّ ما تستطيع في البيت — فعدمُ استعمالها يضعفها أكثر.",
        "• Benefit takes time: in the trial the difference was small at week 4 and large at week 12 (Boyne 2023) — so do not judge early.\n" +
        "• High effort is safe within the rule: there were no serious events in the trials (Boyne 2023 · Hornby 2019), and exercise stops at its signs.\n" +
        "• Daily steps: a counter or a phone, and a thousand more steps each month (a suggestion).\n" +
        "• The arm: used for everything it can do at home — not using it weakens it further.",
      ],
      criteria: [
        "يُعاد القياسُ في الجلسة ١٨ و٣٠، وينتقل إلى المرحلة ٣ في الجلسة ٣٠ أو قبلها إن بلغ أهدافَه. ويُعلَّم للتمديد إن بلغ في آخر قياسٍ واحداً من:\n" +
        "• السرعةُ +٠٫١٠ م/ث فأكثر (Bohannon 2014) أو +٠٫١٦ (KNGF).\n" +
        "• المشيُ ستّ دقائق +٣٤ متراً (Tang 2012).\n" +
        "• بيرغ +٥ (Hiengkaew 2012) أو ميني-بيست +٤ (Beauchamp 2021).\n" +
        "• فوغل-ماير للساق +٦ (Pandian 2016) أو للذراع +٥ (Page 2012) أو ARAT +٦ (KNGF)، أو الجلوسُ والقيامُ خمساً أسرعَ ٣ ثوانٍ (Agustin 2021).\n" +
        "ولم يبلغ أهدافَه. (اقتراحٌ مبنيٌّ على الفرق المهمّ، لا معيارٌ مجرَّب.)",
        "Measures are repeated at sessions 18 and 30, and the patient moves to phase 3 at session 30, or earlier if the goals are met. The patient is flagged for extension if the last measurement shows one of:\n" +
        "• Speed +0.10 m/s or more (Bohannon 2014) or +0.16 (KNGF).\n" +
        "• The six-minute walk +34 metres (Tang 2012).\n" +
        "• Berg +5 (Hiengkaew 2012) or Mini-BESTest +4 (Beauchamp 2021).\n" +
        "• Fugl-Meyer for the leg +6 (Pandian 2016) or the arm +5 (Page 2012) or ARAT +6 (KNGF), or five sit-to-stands 3 seconds faster (Agustin 2021).\n" +
        "without the goals being met. (A proposal built on the important changes, not a tested criterion.)",
      ],
      notes: [
        "• أيّامُ الشدّة الأربعة: دفعاتُ السير ٢٠ دقيقة، ثمّ خطواتٌ متغيّرة على الأرض — للخلف (فالمشيُ للخلف ساوى الأمامَ أو فاقه — Menezes 2025) وللجانب، وأرضٌ ليّنة وضيّقة وغيرُ مستوية، وعوائق، ودرجٌ بسرعة — والصعوبةُ تقلّ بعد ٣–٥ خطواتٍ فاشلة وتزيد بعد ٣–٥ ناجحة (Hornby 2019).\n" +
        "• التقدّم: الشدّةُ +٥–١٠٪ من الاحتياطيّ كلَّ أسبوعٍ إلى أربعة، ومدّةُ المشي +٥–١٠ دقائق كلَّ أسبوعٍ أو اثنين (MacKay-Lyons 2020).\n" +
        "• اليومان الأخفّ: القوّةُ ٢–٣ × ٨–١٢ بثقلٍ يزيد (الجلوسُ والقيامُ بثقل، وصعودُ الدرجة، والطعنة، ورفعُ الكعبين)، والتوازنُ في الحركة، والخطوةُ الإنقاذية، والقيامُ من الأرض.\n" +
        "• الذراع: مهامُّ متدرّجة، والعلاجُ القسريّ في البيت لمن يناسبه، والمرآةُ للشديدة، والتحفيزُ الدوريّ للضعيفة جداً.\n" +
        "• الأجهزةُ المساعدة لمن يحتاجها ولا تأخذ وقتَ التدريب: التحفيزُ الوظيفيّ أثناء المشي، والتحفيزُ للتشنّج قبل المهمّة، والموجاتُ والإبرُ للتشنّج الموضعيّ بمواعيدها.",
        "• The four high-intensity days: 20 minutes of treadmill bursts, then varied overground stepping — backwards (backward walking equalled or beat forward walking — Menezes 2025) and sideways, on soft, narrow and uneven surfaces, over obstacles, and stairs at speed — with difficulty reduced after 3–5 failed steps and increased after 3–5 successful ones (Hornby 2019).\n" +
        "• Progression: intensity +5–10% of reserve every one to four weeks, and walking time +5–10 minutes every one to two weeks (MacKay-Lyons 2020).\n" +
        "• The two lighter days: strength at 2–3 × 8–12 with a rising load (loaded sit-to-stand, step-ups, the split squat and heel raises), balance on the move, reactive stepping, and getting up from the floor.\n" +
        "• The arm: graded tasks, constraint therapy at home for those it suits, the mirror for severe weakness, and cyclical stimulation for a very weak arm.\n" +
        "• Adjunct devices for those who need them, never taking training time: functional stimulation during walking, stimulation for spasticity before tasks, and shockwave and needling for focal spasticity on their schedules.",
      ],
      exercises: [
        { code: "hit-treadmill-walking",
          doseNote: ["٢٠ دقيقة من دفعات ٣٠ ثانية في أيّام الشدّة الأربعة بـ٦٠–٨٠٪ من احتياطيّ النبض أو جهدٍ ١٤–١٧ (Boyne 2023).", "20 minutes of 30-second bursts on the four high-intensity days at 60–80% of heart-rate reserve or exertion 14–17 (Boyne 2023)."] },
        { code: "overground-gait-training",
          note: ["متغيّر: للخلف وللجانب، وأرضٌ ليّنة وضيّقة وغيرُ مستوية، وأوزانٌ على الكاحل — بالشدّة نفسِها (Hornby 2019 · Menezes 2025).", "Varied: backwards and sideways, on soft, narrow and uneven surfaces, with ankle weights — at the same intensity (Hornby 2019 · Menezes 2025)."] },
        { code: "obstacle-dual-task-walking",
          note: ["العوائقُ والمنعطفاتُ والمهمّةُ الثانية بسرعة — للسوق والمسجد.", "Obstacles, turns and a second task at speed — for the market and the mosque."] },
        { code: "stairs-speed-training", sets: 3, reps: 3, rest: 60 },
        { code: "side-stepping",
          note: ["بسرعة وفي الاتّجاهين، ثمّ مع مطّاطٍ حول الركبتين.", "Fast and in both directions, then with a band around the knees."] },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["بثقلٍ في اليدين حين يسهل — ٨–١٢ مرّة.", "Holding a weight once it is easy — 8–12 repetitions."] },
        { code: "step-up", sets: 3, reps: 10, rest: 60 },
        { code: "calf-raise", sets: 3, reps: 12, rest: 60 },
        { code: "split-squat", sets: 2, reps: 10, rest: 60,
          note: ["الساقُ المصابة في الأمام ثمّ في الخلف، وبسندٍ أوّلاً.", "The affected leg in front, then behind, with support at first."] },
        { code: "star-excursion-reach", sets: 1, reps: 3,
          note: ["الوقوفُ على الساق المصابة والوصولُ بالسليمة، ثمّ العكس.", "Standing on the affected leg and reaching with the good one, then the reverse."] },
        { code: "reactive-stepping-practice", sets: 3, reps: 5 },
        { code: "floor-rise-hemiparesis", sets: 1, reps: 3 },
        { code: "reach-grasp-task",
          note: ["مهامُّ أصعب كلّما نجح، نحو مئة تكرار في ١٥–٢٠ دقيقة — والتقدّمُ بالصعوبة لا بالعدد وحده (Lang 2016).", "Harder tasks as the patient succeeds, about a hundred repetitions in 15–20 minutes — progressing by difficulty rather than by number alone (Lang 2016)."] },
        { code: "forced-use-mitt",
          note: ["لمن يمدّ الرسغَ ٢٠° والأصابعَ ١٠° فأكثر: القفّازُ ساعاتٍ في البيت مع تدريبٍ يوميّ، ويُنتبه للسقوط والإعياء والمزاج (NICE NG236).", "For those with 20° of wrist and 10° of finger extension or more: the mitt for set hours at home with daily practice, watching for falls, fatigue and low mood (NICE NG236)."] },
        { code: "mirror-therapy" },
        { code: "stationary-cycling",
          doseNote: ["بديلُ الهوائيّ في الحرّ أو حين لا يُمشى — والفائدةُ في المشي من المشي نفسِه (Boyne 2017).", "The aerobic alternative in the heat or when walking is not possible — walking benefits come from walking itself (Boyne 2017)."] },
      ],
    },
    {
      name: ["الانتقالُ إلى النشاط الذاتيّ والحياة اليومية", "Transfer to self-directed activity and daily life"],
      sessionFrom: 31, sessionTo: 36,
      timeframe: ["الجلسات ٣١–٣٦ (الأسبوعُ السادس) — والتمديدُ ٣٧–٤٨", "Sessions 31–36 (week 6) — and the extension 37–48"],
      goals: [
        "المشيُ في المجتمع (الأرصفةُ والحوافُّ والمنحدراتُ والزحام) والدرج، والصلاةُ والوضوءُ والمرحاضُ بالأوضاع التي يختارها، والقيامُ من الأرض، وبرنامجٌ منزليّ أخير مكتوب مع المرافق، وهدفُ خطواتٍ يوميّ، وموعدُ المراجعة بعد ستّة أشهر.",
        "Community walking (pavements, kerbs, slopes and crowds) and stairs, prayer, ablution and the toilet in the positions the patient chooses, getting up from the floor, a final written home programme with the carer, a daily step target, and a review date six months on.",
      ],
      education: [
        "• الخطّةُ المنزلية: المشيُ السريع أو الدراجة ثلاثاً في الأسبوع ٢٠–٣٠ دقيقة بجهدٍ ١٤–١٦، والقوّةُ مرّتين إلى ثلاث بالمطّاط أو قناني الماء، والتوازن — فالفائدةُ تضيع خلال أسابيع من التوقّف (MacKay-Lyons 2020 · Pereira 2021).\n" +
        "• الخطوات: التدريبُ وحده لم يزد خطواتِ اليوم، والمتابعةُ بعدّادٍ وهدفٍ هي التي زادتها (Thompson 2025).\n" +
        "• متى يعود: علامةُ جلطة ⟵ الإسعاف؛ وسقطةٌ بإصابة، أو تراجعٌ في المشي أو اليد، أو تشنّجٌ يزيد، أو هدفٌ جديد ⟵ دورةٌ جديدة (Nelson 2026).",
        "• The home plan: brisk walking or cycling three times a week for 20–30 minutes at exertion 14–16, strength two to three times with bands or water bottles, and balance — benefits are lost within weeks of stopping (MacKay-Lyons 2020 · Pereira 2021).\n" +
        "• Steps: training alone did not raise daily steps; follow-up with a counter and a target did (Thompson 2025).\n" +
        "• When to come back: a stroke sign → an ambulance; a fall with injury, a decline in walking or the hand, increasing spasticity, or a new goal → a new course (Nelson 2026).",
      ],
      criteria: [
        "معاييرُ الخروج (مع البرنامج المنزليّ):\n" +
        "• تحقّقت الأهدافُ التي اختارها، أو كان التغيّرُ في كلّ المقاييس الأساسية في آخر اثنتي عشرةَ جلسة أقلَّ من خطأ القياس — والسرعةُ ٠٫٢ م/ث والمشيُ ستّ دقائق نحو ٥٤ متراً وبيرغ ٥ (Hiengkaew 2012 · Fulk 2008).\n" +
        "• البرنامجُ المنزليّ يؤدّيه مع المرافق، ودفترُ الخطوات والهدف، وخطّةُ السقوط وعلاماتُ الجلطة واضحة، وموعدُ المراجعة بعد ستّة أشهر.\n" +
        EXTEND_AR,
        "Discharge criteria (with the home programme):\n" +
        "• The goals the patient chose have been met, or change in every primary measure over the last twelve sessions is below measurement error — about 0.2 m/s for speed, 54 metres for the six-minute walk and 5 for Berg (Hiengkaew 2012 · Fulk 2008).\n" +
        "• The home programme done with the carer, the step diary and target, the fall plan and stroke signs clear, and a review six months on.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• المشيُ في المجتمع: الأرصفةُ والحوافُّ والمنحدراتُ والزحامُ والعبورُ بزمن الإشارة، والمشيُ إلى مكانٍ يقصده (المسجدُ أو السوق).\n" +
        "• الصلاةُ والوضوءُ والمرحاض: بالبطاقات وبالأوضاع التي اختارها، والقيامُ من الأرض طريقُ السجود.\n" +
        "• الخطّةُ المنزلية مكتوبة: ٣–٥ تمارين قوّة ومشيٌ سريع أو دراجة وتوازن، مع المرافق، وعدّادُ الخطوات وهدفٌ يزيد ألفاً كلَّ شهر.\n" +
        "• القياسُ الأخير في الجلسة ٣٦، وقرارُ الخروج أو التمديد، وموعدُ المراجعة بعد ستّة أشهر بقواعد العودة.",
        "• Community walking: pavements, kerbs, slopes, crowds and crossing within the signal time, and walking to a place the patient wants to reach (the mosque or the market).\n" +
        "• Prayer, ablution and the toilet: with the cards and in the positions the patient chose, with getting up from the floor as the route to prostration.\n" +
        "• The home plan in writing: 3–5 strength exercises, brisk walking or cycling and balance, with the carer, a step counter and a target rising by a thousand each month.\n" +
        "• The final measurement at session 36, the decision to discharge or extend, and a review six months on with the re-access rules.",
      ],
      exercises: [
        { code: "overground-gait-training",
          note: ["في المجتمع: الأرصفةُ والحوافُّ والمنحدراتُ والزحام، والخطّةُ المنزلية مشيٌ سريع ٣ × ٢٠–٣٠ دقيقة في الأسبوع بجهدٍ ١٤–١٦.", "In the community: pavements, kerbs, slopes and crowds, with a home plan of brisk walking 3 × 20–30 minutes a week at exertion 14–16."] },
        { code: "hit-treadmill-walking",
          doseNote: ["في أيّام الشدّة الباقية بالجرعة نفسِها، والقياسُ الأخير للسرعة التي يمشي بها.", "On the remaining high-intensity days at the same dose, with a final check of the speed achieved."] },
        { code: "obstacle-dual-task-walking" },
        { code: "stairs-speed-training", sets: 3, reps: 3, rest: 60,
          note: ["درجُ البيت والمسجد، وبلا درابزين لمن توازنُه جيّد.", "The stairs at home and at the mosque, and without the rail for those with good balance."] },
        { code: "floor-rise-hemiparesis", sets: 1, reps: 3,
          note: ["مع المرافق وخطّةُ السقوط في البيت.", "With the carer, and the fall plan at home."] },
        { code: "prayer-hemiparesis-pathway",
          note: ["بالأوضاع التي اختارها المريض، من الكرسيّ إلى الأرض بقدر ما يأمن.", "In the positions the patient chose, from the chair to the floor as far as is safe."] },
        { code: "wudu-affected-arm-assist" },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["في البيت بقنينة ماءٍ أو حقيبة — والعددُ خمساً بالزمن مقياسُ الخروج.", "At home holding a water bottle or a bag — five repetitions timed are the discharge measure."] },
        { code: "step-up", sets: 3, reps: 10, rest: 60 },
        { code: "reactive-stepping-practice", sets: 3, reps: 5 },
        { code: "reach-grasp-task",
          note: ["المهامُّ التي اختارها في البيت: الأكلُ والشربُ واللبسُ والوضوء.", "The tasks chosen at home: eating, drinking, dressing and ablution."] },
        { code: "forced-use-mitt" },
        { code: "stationary-cycling",
          doseNote: ["بديلُ المشي في الحرّ: ٢٠–٣٠ دقيقة بجهدٍ ١٤–١٦.", "The alternative to walking in the heat: 20–30 minutes at exertion 14–16."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٣٦ بستٍّ في الأسبوع (ستّةُ أسابيع): أربعةُ أيّامٍ للمشي عالي الشدّة ويومان أخفّ، وتمديدٌ واحد باثنتي عشرةَ جلسة لمن بلغ فرقاً مهمّاً ولم يبلغ أهدافَه، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر، ومراجعةٌ كلَّ ستّة أشهر — والتجاربُ ثلاثاً في الأسبوع اثني عشرَ أسبوعاً (٣٦ جلسة) أو حتى ثلاثين في شهرين، ولا تجربةَ لستٍّ في الأسبوع: أبقِه، أو اجعله ثلاثاً في الأسبوع اثني عشرَ أسبوعاً — خاصّةً لمن لا يستطيع الحضورَ يومياً.",
    en: "36 sessions at six a week (six weeks): four days of high-intensity walking and two lighter days, one extension of twelve sessions for those who reached an important change without meeting their goals, the home programme to week 12, and a review every six months — trials used three a week for twelve weeks (36 sessions — Boyne 2023) or up to thirty in two months (Hornby 2019), and none tested six a week: keep it, or make it three a week for twelve weeks — especially for those who cannot attend daily." },
  { key: "limits", topic: "limits",
    ar: "الحدود: الشدّةُ ٦٠–٨٠٪ من احتياطيّ النبض أو جهدٌ ١٤–١٧ (ومع حاصرات بيتا عشرُ نبضاتٍ أقلّ والجهدُ ١٤–١٦)، ولا جلسةَ فوق ٢٠٠/١١٠ قبلها، والتوقّفُ فوق ٢٤٠/١١٠ ولا تجاوزَ لـ٢٥٠/١١٥، والسكّرُ تحت ٩٠ لمن يأخذ الإنسولين يحتاج سكّراً سريعاً قبلها؛ والانتقالُ بعد الإذن وعشرين دقيقة خطواتٍ بأمان، والتمديدُ بفرقٍ مهمّ في السرعة ٠٫١٠–٠٫١٦ أو المشي ستّ دقائق ٣٤ متراً أو بيرغ ٥ — اقتراحٌ مبنيٌّ على شروط التجارب والفرق المهمّ: أبقِها أو عدّلها.",
    en: "The limits: intensity 60–80% of heart-rate reserve or exertion 14–17 (on beta-blockers ten beats lower and exertion 14–16 — Hornby 2019), no session above 200/110 beforehand (Henzlova 2016), stopping above 240/110 and never beyond 250/115 (Miller 2021 · Billinger 2014), and glucose below 90 on insulin needs fast carbohydrate first (Colberg 2016); progression after clearance and twenty minutes of safe stepping, and extension for an important change of 0.10–0.16 m/s in speed, 34 metres on the six-minute walk or 5 on Berg (Bohannon 2014 · Tang 2012 · Hiengkaew 2012) — proposals built on trial conditions and important changes: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة والإذن: الإسعافُ لعلامات الجلطة الجديدة (BE-FAST) وألمِ الصدر وضربةِ الرأس مع المميّع والتفكيرِ بإيذاء النفس؛ والطبيبُ في اليوم نفسِه للضغط فوق ٢٠٠/١١٠ والشكّ في الخثرة والنوبة؛ والبوتوكسُ للتشنّج الموضعيّ الذي يعيق هدفاً؛ وإذنُ الطبيب واختبارُ الجهد قبل الشدّة العالية — مَن في المركز يعطي الإذنَ ويُجري اختبارَ الجهد أو المشيَ ستّ دقائق بالنبض والضغط؟ أبقِها أو عدّلها مع طبيب المركز.",
    en: "The referral and clearance rules: an ambulance for signs of a new stroke (BE-FAST — Aroor 2017), chest pain, a head injury on a blood thinner and thoughts of self-harm (Vyas 2021); a same-day doctor for blood pressure above 200/110, a suspected thrombosis and a seizure; botulinum toxin for focal spasticity limiting a goal; and the doctor's clearance with a stress test before high intensity (Richards 2026 · MacKay-Lyons 2020) — who in the centre gives clearance and runs the stress test or the six-minute walk with heart rate and blood pressure? Keep or adjust with the centre's doctor." },
  { key: "device-robot-electro", topic: "devices",
    ar: "جهازُ المشي الروبوتيّ مساعدٌ لمن لا يمشي وحده فقط (FAC 0–2) — وللقادر على المشي بلا فائدة والإرشاداتُ ضدّه بقوّة: أبقِه كذلك أو اجعله «لا يُستخدم»، واكتب إعداداتِه من الجهاز؛ والتحفيزُ بثلاثة استعمالات — الوظيفيّ للقدم المتدلّية بديلاً للدعامة، والدوريّ للعضلة الضعيفة ٣٠ دقيقة خمساً في الأسبوع، وعبر الجلد للتشنّج ٣٠ دقيقة بـ١٠٠ هرتز — وإعداداتُ النبضة من برنامج الجهاز: هل في المركز محفّزٌ لعصب الشظية يُلبس أثناء المشي؟",
    en: "The robotic gait trainer is an adjunct only for those who cannot walk alone (FAC 0–2 — Mehrholz 2025) — for those who can walk it gives no benefit and the guidelines are strongly against it (Richards 2026 · Hornby 2020): keep it so or set it to 'Not used', and enter its settings from the device; stimulation has three uses — functional stimulation for foot drop as an alternative to the orthosis (Kluding 2013), cyclical stimulation of a weak muscle for 30 minutes five times a week (Scrivener 2025), and TENS for spasticity for 30 minutes at 100 Hz (Mahmood 2019 · Diao 2025) — with pulse settings from the device programme: does the centre have a peroneal stimulator worn while walking?" },
  { key: "device-shockwaves", topic: "settings",
    ar: "الموجاتُ الصادمة مساعدٌ للتشنّج الموضعيّ (عضلةُ الساق وقابضاتُ الرسغ والأصابع) أسبوعياً ثلاثَ جلسات بعد التمطيط أو البوتوكس، ولألم الكتف بعد مراجعة الطبيب — املأ إعداداتِها من جهاز المركز (النوعُ والشدّةُ والتردّدُ والنبضات) فلا يُعتمد البروتوكولُ قبلها، أو اجعلها «لا يُستخدم».",
    en: "Shockwave is an adjunct for focal spasticity (the calf and the wrist and finger flexors) weekly for three sessions after stretching or botulinum toxin (Li 2016 · Zeren 2026), and for shoulder pain after medical review (Salbach 2026) — fill in its settings from the centre's device (type, intensity, frequency, impulses), as the protocol cannot be approved before that, or set it to 'Not used'." },
  { key: "device-others", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ قصيرُ الأثر للتشنّج الموضعيّ (ثلاثُ جلساتٍ في نحو أسبوع)؛ والتيكارُ والمغناطيسُ مساعدان بقاعدتك ولا دليلَ لهما في الجلطة — ما نوعُ جهاز المغناطيس: محفّزٌ طرفيّ عالي الشدّة أم مجالٌ نابض؟ والكمادةُ للراحة والشمعُ لليد المتشنّجة بشرط الإحساس؛ والليزرُ «لا يُستخدم» وله دليلٌ لألم الكتف وحده — اجعله مساعداً لألم الكتف أو أبقِه؛ والأمواجُ والأشعّة والضغطُ والسلبيُّ والشدُّ «لا يُستخدم»: أبقِها أو غيّرها.",
    en: "Dry needling is a short-acting adjunct for focal spasticity (three sessions within about a week — Nakhostin Ansari 2024 · Yuan 2026); Tecar and magnetic therapy are adjuncts by your rule with no evidence in stroke — which type is the magnetic device: a high-intensity peripheral stimulator or a pulsed field (Hui 2026)? The hot pack is for comfort and wax for a spastic hand, provided sensation is intact (Wang 2017); laser is 'Not used' and has evidence for shoulder pain only (Richards 2026 · Bathla 2026) — make it an adjunct for shoulder pain or keep it; ultrasound, infrared, compression, CPM and traction are 'Not used': keep them so or change them." },
  { key: "aids-prayer", topic: "content",
    ar: "الدعامةُ والتحفيزُ الوظيفيّ للقدم المتدلّية متكافئان، والمركزُ يصنع الدعامة: فحصٌ عند التسليم وبعد أسبوعين وفي كلّ مراجعة؛ والعصا لمن سرعتُه ٠٫٤–٠٫٨ م/ث؛ ولا حمّالةَ روتينية بعد الطور الرخو؛ وبطاقتا الصلاة والوضوء والقيامُ من الأرض: أبقِ ذلك أو عدّله — ومَن يتابع الدعامةَ بين قسم المساند والعلاج الطبيعيّ؟",
    en: "An orthosis and functional stimulation for foot drop are equivalent (Kluding 2013 · Prenton 2018), and the centre makes the orthosis: checked at delivery, after two weeks and at every review; a cane for those walking at 0.4–0.8 m/s (Nascimento 2016); no routine sling after the flaccid stage (Salbach 2026); and the prayer and ablution cards with getting up from the floor (Ghous 2017 · Mohamed 2015): keep or adjust — and who follows up the orthosis between the orthotics department and physiotherapy?" },
  { key: "measures-add", topic: "measures",
    ar: "المقاييسُ المزروعة: سرعةُ المشي ١٠ أمتار، والمشيُ ستّ دقائق، وبيرغ، وفوغل-ماير للذراع، وأشوورث المعدَّل — أبقِها؛ وأضف من «المقاييس» ← مقياسٌ خاص: مستوى المشي FAC من ٥ (الأكثر أفضل)، والجلوسَ والقيامَ خمساً بالثواني (الأقلّ أفضل)، والنهوضَ والمشي بالثواني (الأقلّ أفضل)، وميني-بيست من ٢٨ (الأكثر أفضل)، وفوغل-ماير للساق من ٣٤ (الأكثر أفضل)، وARAT من ٥٧ لمن له هدفٌ في الذراع (الأكثر أفضل)، وخطواتِ اليوم (الأكثر أفضل)، والإعياءَ بالعربية (الأقلّ أفضل) — ولا نسخةَ عربية مُتحقَّقة لفوغل-ماير ولا ARAT ولا بارثيل.",
    en: "The seeded measures: 10-metre walk speed, the six-minute walk, Berg, Fugl-Meyer for the arm and the modified Ashworth — keep them; and add under 'Measures' → custom measure: walking level FAC out of 5 (higher is better — Mehrholz 2007), five sit-to-stands in seconds (lower is better — Mong 2010), the timed up-and-go in seconds (lower is better), the Mini-BESTest out of 28 (higher is better — Tsang 2013), Fugl-Meyer for the leg out of 34 (higher is better — Pandian 2016), ARAT out of 57 for those with an arm goal (higher is better — KNGF), daily steps (higher is better — Fini 2023), and fatigue in Arabic (lower is better — Abdulla 2019) — there is no validated Arabic version of Fugl-Meyer, ARAT or Barthel (a documented zero result)." },
];

export const name = "157_physio_stroke_chronic_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
