// Migration 149: الكتفُ المتجمّد (التهابُ المحفظة اللاصق) — البروتوكولُ الخامس عشر مفصَّلاً (§4.eg — ٢٠٢٦-١٠-١٤).
//
// المالك (٢٠٢٦-١٠-١٤): «اكمل البروتوكول التالي» — وقائمتُه الأولى (العشر) اكتملت بعِرق النسا، فالتالي يختاره المساعدُ من الأكثر شيوعاً في المركز:
// الكتفُ المتجمّد (`frozen-shoulder-adult`) — وهو عند السكّريّين خاصّة (١٣٫٤٪ منهم — Zreik 2016، و١١٫٥٪ من ٢١٦ سكّريّاً في ميسان — Alhashimi 2018).
// **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعة أسابيع) وتمديدٌ واحد بستٍّ لمن ما زال يتحسّن، وثلاثُ مراحل بنطاقات (١–٨ · ٩–١٦ · ١٧–٢٤)
// **تتبع حساسيةَ النسيج لا رقمَ الجلسة** (عالية · متوسّطة · منخفضة — JOSPT 2013)، ومعاييرُ رقمية من خطأ القياس والفرق المهمّ؛ وستُّ بطاقاتٍ جديدة
// (صورُها الستّ وصلت مع الترحيل — بحث عنها المساعد) وأربعَ عشرةَ معادةً بصورها من ١٢٥ و١٢٨ و١٢٩؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (SPADI
// والدورانُ الخارجيّ والعطف) وألمُ الليل والحركة ومسافةُ اليد خلف الظهر وأكسفورد بالعربية إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`.
// كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الكتفَ المتجمّد**: الحقنةُ داخل المفصل أقوى ما في الدليل (JOSPT A · BESS 2025 «قويّة») وأسرعُ من العلاج الطبيعيّ وحده في الأسابيع الأولى
// (Page 2014 · Challoumas 2020) — فالإحالةُ إليها مبكّرةٌ لا آخرَ الحلّ، والعلاجُ يستمرّ معها؛ والعلاجُ الطبيعيّ وحده لم يُثبت أنّه أسرعُ من المسار الطبيعيّ
// (BESS 2025 «محايد»)، وبعد الحقنة «مشروطٌ» لصالحه. والشدّةُ بحسب الحساسية (JOSPT B): التمطيطُ بعد حدّ الألم قد يُسيء النتيجة. **والجرعةُ**: التجاربُ ٦–٣٠
// جلسة في ٢–١٢ أسبوعاً بمعدّل ٢–٣ في الأسبوع غالباً، ولم يرتبط عددُ الجلسات بالنتيجة (UK FROST — Okanlawon 2026، قبل التحكيم) ولا تواترُ التحريك (Tanaka 2010)
// بل التمرينُ اليوميّ في البيت — فالعددُ ٢٤ اختيارُ خدمةٍ مكتوبٌ صريحاً، وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والموجاتُ الصادمة مساعدٌ أسبوعيّ (أقوى
// الأجهزة دليلاً، والخبراءُ البريطانيّون ضدّها في التيبّس — وإعداداتُها لسليم)؛ والحرارةُ والتيكار والتحفيزُ والمغناطيسُ والإبرُ مساعدةٌ بقاعدة المركز والدليلُ
// ضعيفٌ أو ضدّ — كُتب ذلك في كلّ جهاز؛ والليزرُ والجهازُ السلبيّ المستمرّ «لا يُستخدم» حتى يقرّر سليم، والأمواجُ فوق الصوتية «لا يُستخدم» بدليلها.
// **وما يخصّ العراق**: بحثٌ صفريّ لتجربة علاجٍ طبيعيّ عراقية، ولا دراسةَ لمدى الكتف في الصلاة والوضوء — فبطاقةٌ وظيفية للتكبير والمسح على الرأس تُختبر وتتدرّج.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (١٧٩ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ست؛ والمعادةُ (زُرعت في ١٢٥ و١٢٨ و١٢٩) تُربط برموزها وصورها، وما يخصّ الكتفَ المتجمّد في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "codman-pendulum", nameAr: "تمرين البندول (كودمان) للكتف", nameEn: "Codman pendulum exercise",
    kind: "mobility", region: "shoulder", perSide: true, sets: 3, reps: 10, rest: 30,
    purpose: ["أوّلُ تمرينٍ في الحساسية العالية: الذراعُ تتدلّى بثقلها فيتحرّك الكتفُ قليلاً بلا جهدٍ من عضلاته ولا دفعٍ إلى نهاية المدى — حركةٌ لطيفة تحفظ المدى ولا تهيّج الألم. البرنامجُ المنزليّ في التجربة البريطانية الكبرى يبدأ به ثمّ يتدرّج إلى التمطيط الحازم بحسب المرحلة (UK FROST — Hanchard 2020)، واستُعمل في برامج التجارب المنزلية (Vahdatpour 2014 · Sharahili 2025)؛ وفي الحساسية العالية تبقى الحركةُ بلا ألم (JOSPT 2013).",
      "The first exercise at high irritability: the arm hangs by its own weight so the shoulder moves a little with no effort from its muscles and no push to end range — a gentle movement that keeps range without stirring up pain. The home programme in the large UK trial starts with it and progresses to firm stretching by stage (UK FROST — Hanchard 2020), and it was part of trial home programmes (Vahdatpour 2014 · Sharahili 2025); at high irritability the movement stays pain-free (JOSPT 2013)."],
    start: ["واقفٌ بجانب طاولةٍ أو كرسيٍّ ثابت يستند إليه باليد السليمة، منحنٍ من الوركين حتى يميل الجذعُ إلى الأمام نحو ٤٥° أو أكثر، والذراعُ المصابة تتدلّى مرتخيةً نحو الأرض.",
      "Standing beside a table or a steady chair, leaning on it with the healthy hand, bent forward from the hips until the trunk tilts about 45° or more, with the affected arm hanging relaxed towards the floor."],
    steps: [[
      "دَع الذراعَ المصابة تتدلّى مرتخيةً تماماً، والكتفُ لا يشدّ.",
      "حرّك جذعَك قليلاً إلى الأمام والخلف فتتأرجح الذراعُ معه — لا ترفعها بعضلاتها.",
      "ثمّ من جانبٍ إلى جانب، ثمّ دوائرَ صغيرة مع عقارب الساعة وعكسها.",
      "١٠ مرّاتٍ لكلّ اتّجاه، والدوائرُ تكبر قليلاً كلّما ارتخى الكتفُ دون ألم.",
      "استقم ببطء مستعيناً باليد السليمة، وكرّر عدّةَ مرّاتٍ في اليوم.",
    ], [
      "Let the affected arm hang completely relaxed, without tensing the shoulder.",
      "Rock your trunk gently forwards and backwards so that the arm swings with it — do not lift it with its own muscles.",
      "Then side to side, then small circles clockwise and anticlockwise.",
      "10 times in each direction, letting the circles grow a little as the shoulder relaxes without pain.",
      "Straighten up slowly with help from the healthy hand, and repeat several times a day.",
    ]],
    cues: [[
      "رفعُ الذراع أو تحريكُها بعضلات الكتف ⟵ الجذعُ يحرّك والذراعُ تتبع مرتخية.",
      "دوائرُ كبيرة سريعة ⟵ صغيرةٌ هادئة تكبر بالتدريج.",
      "الانحناءُ من الظهر والركبتان مقفولتان ⟵ الانحناءُ من الوركين والركبتان مرتخيتان واليدُ السليمة مسنودة.",
      "الاستمرارُ مع ألمٍ يزيد ⟵ دوائرُ أصغر أو توقّف.",
    ], [
      "Lifting or moving the arm with the shoulder muscles → the trunk moves and the arm follows, relaxed.",
      "Large, fast circles → small, calm circles that grow gradually.",
      "Bending from the back with the knees locked → bend from the hips, knees soft, healthy hand supported.",
      "Carrying on while pain increases → smaller circles or stop.",
    ]],
    easier: ["دوائرُ أصغر ومدّةٌ أقصر، أو جالساً منحنياً على الفخذين والذراعُ تتدلّى بجانبهما.", "Smaller circles for a shorter time, or seated leaning over the thighs with the arm hanging beside them."],
    harder: ["مدىً أوسع ومدّةٌ أطول؛ وفي الحساسية المتوسّطة ينتقل إلى المدى المساعَد بالعصا (بطاقة «الدوران الخارجيّ بالعصا في الاستلقاء») — ولا ثقلَ في اليد في الحساسية العالية.",
      "A wider range for longer; at moderate irritability move on to wand-assisted range (the 'Supine wand-assisted external rotation' card) — and no weight in the hand at high irritability."],
    stopIf: ["ألمٌ يزيد أثناء التمرين ويبقى بعده، أو دوخةٌ من الانحناء؛ وألمٌ شديد مفاجئ مع ضعفٍ بعد سقطة ⟵ الأخصائيّ قبل المتابعة.",
      "Pain that increases during the exercise and stays afterwards, or dizziness from bending forward; sudden severe pain with weakness after a fall → the therapist before continuing."],
    equipment: ["طاولةٌ أو كرسيٌّ ثابت.", "A table or a steady chair."],
    doseNote: ["في التجارب: ٥–١٠ مرّاتٍ لكلّ اتّجاه (Vahdatpour 2014) أو ٣ × ١٠ (Sharahili 2025) — وهنا ٣ × ١٠ عدّةَ مرّاتٍ يومياً بلا ألم.",
      "In trials: 5–10 times each way (Vahdatpour 2014) or 3 × 10 (Sharahili 2025) — here 3 × 10 several times a day, pain-free."],
    images: [{ key: "codman-pendulum-1", ar: "منحنٍ إلى الأمام واليدُ السليمة على الطاولة والذراعُ المصابة تتدلّى وتتأرجح في دوائر صغيرة", en: "Leaning forward with the healthy hand on a table, the affected arm hanging and swinging in small circles", search: "codman pendulum shoulder exercise" }],
  },
  {
    code: "wand-er-supine", nameAr: "الدوران الخارجيّ بالعصا في الاستلقاء", nameEn: "Supine wand-assisted external rotation",
    kind: "mobility", region: "shoulder", perSide: true, sets: 1, reps: 10, hold: 10,
    purpose: ["الدورانُ الخارجيّ أوّلُ ما يُفقد وأشدُّه في الكتف المتجمّد — نقصُه ٥٠٪ فأكثر من الجهة الأخرى معيارُ التجارب (UK FROST — Rangan 2020) — وهو أهمُّ مقاييس التحسّن. التمرينُ بمساعدة اليد السليمة: ١٠ مرّاتٍ بثباتٍ ٥–١٠ ثوانٍ بقدر ما يُحتمل، ثلاثَ إلى خمسَ مرّاتٍ يومياً (برنامجُ Oh 2011 كما يصفه JOSPT 2013). والشدّةُ بحسب الحساسية: في العالية بلا ألم، وفي المتوسّطة والمنخفضة داخلَ مقاومة النسيج دون أن يبقى ألمٌ بعده (JOSPT 2013).",
      "External rotation is the first and most severely lost movement in frozen shoulder — a loss of 50% or more against the other side is the trial criterion (UK FROST — Rangan 2020) — and it is the key measure of progress. Assisted by the healthy hand: 10 repetitions with 5–10-second holds to tolerance, three to five times a day (the Oh 2011 programme as described by JOSPT 2013). Intensity follows irritability: pain-free at high irritability, and into tissue resistance without lasting pain afterwards at moderate and low irritability (JOSPT 2013)."],
    start: ["مستلقٍ على الظهر والركبتان مثنيّتان، والمرفقان مثنيّان ٩٠° ملتصقان بالجنبين، ومنشفةٌ مطويّة تحت مرفق الذراع المصابة، واليدان تمسكان عصا بعرض الجسم.",
      "Lying on the back with the knees bent, both elbows bent to 90° against the sides, a folded towel under the elbow of the affected arm, and the hands holding a stick across the body."],
    steps: [[
      "ادفع العصا باليد السليمة نحو الجهة المصابة فيدور ساعدُ الذراع المصابة إلى الخارج، والمرفقُ ملتصقٌ بالجنب.",
      "توقّف حين تشعر بالشدّ — في الحساسية العالية قبل الألم، وبعدها عند مقاومةٍ محتملة.",
      "اثبت ٥–١٠ ثوانٍ وتنفّس بهدوء.",
      "ارجع ببطء إلى البداية، وكرّر ١٠ مرّات.",
      "حين يسمح الأخصائيّ: الذراعُ مبعدةٌ عن الجسم ٤٥° ثمّ ٩٠° والتمرينُ نفسُه.",
    ], [
      "Push the stick with the healthy hand towards the affected side so that the affected forearm rotates outwards, keeping the elbow against your side.",
      "Stop when you feel a stretch — before pain at high irritability, and at a tolerable resistance later.",
      "Hold for 5–10 seconds, breathing calmly.",
      "Return slowly to the start, and repeat 10 times.",
      "When the therapist allows: the same exercise with the arm moved 45° and then 90° away from the body.",
    ]],
    cues: [[
      "ابتعادُ المرفق عن الجنب ⟵ المرفقُ ملتصقٌ والمنشفةُ تحته.",
      "رفعُ الكتف نحو الأذن أو تقويسُ الظهر ⟵ الكتفُ مرتخٍ والظهرُ على السرير.",
      "الدفعُ بقوّة في الألم ⟵ شدٌّ محتمل يهدأ بعد التمرين.",
      "الحركةُ السريعة المرتدّة ⟵ ثباتٌ هادئ.",
    ], [
      "The elbow drifting away from the side → elbow against the side with the towel under it.",
      "Shrugging the shoulder towards the ear or arching the back → shoulder relaxed and back on the bed.",
      "Pushing hard into pain → a tolerable stretch that settles after the exercise.",
      "Fast, bouncing movement → a calm, steady hold.",
    ]],
    easier: ["مدىً أصغر بلا ثبات، أو جالساً والمرفقُ على الطاولة، أو بيد الأخصائيّ.", "A smaller range without a hold, seated with the elbow on a table, or moved by the therapist."],
    harder: ["الثباتُ ٣٠ ثانية × ٣ في الحساسية المنخفضة والذراعُ مبعدةٌ ٤٥° ثمّ ٩٠°؛ ثمّ عند إطار الباب (بطاقة «تمطيط عضلة الصدر عند إطار الباب»).",
      "30-second holds × 3 at low irritability with the arm abducted 45° and then 90°; then at a door frame (the 'Doorway pectoral stretch' card)."],
    stopIf: ["ألمٌ حادّ، أو ألمٌ يبقى بعد التمرين ويسوء به النومُ تلك الليلة ⟵ مدىً أقلّ في المرّة التالية؛ وتنميلٌ في اليد ⟵ الأخصائيّ.",
      "Sharp pain, or pain that stays after the exercise and disturbs sleep that night → a smaller range next time; tingling in the hand → the therapist."],
    equipment: ["عصا أو عصا مكنسة، ومنشفةٌ مطويّة، وسريرٌ أو فرشة.", "A stick or broom handle, a folded towel, and a bed or mat."],
    doseNote: ["١٠ مرّاتٍ بثباتٍ ٥–١٠ ثوانٍ بقدر ما يُحتمل، ٣–٥ مرّاتٍ يومياً (Oh 2011 كما يصفه JOSPT 2013)؛ ولا جرعةَ مثلى مثبتة للتمطيط (JOSPT 2013).",
      "10 repetitions with 5–10-second holds to tolerance, 3–5 times a day (Oh 2011 as described by JOSPT 2013); no optimal stretching dose has been established (JOSPT 2013)."],
    images: [{ key: "wand-er-supine-1", ar: "مستلقٍ والمرفقان بجانب الجسم يدفع العصا باليد السليمة فيدور ساعدُ الذراع المصابة إلى الخارج", en: "Lying on the back with the elbows at the sides, pushing a stick with the healthy hand to rotate the affected forearm outwards", search: "supine wand external rotation shoulder" }],
  },
  {
    code: "wall-finger-walk", nameAr: "مشي الأصابع على الحائط (السلّم)", nameEn: "Wall finger walk (finger ladder)",
    kind: "mobility", region: "shoulder", perSide: true, sets: 1, reps: 10, hold: 5,
    purpose: ["رفعٌ فعّالٌ مساعَد: الحائطُ يحمل بعضَ ثقل الذراع فترتفع اليدُ أعلى ممّا ترتفع في الهواء، ويرى المريضُ تقدّمه بعلامةٍ على الحائط. «مشيُ الحائط» من البرنامج المنزليّ في تجربة الموجات الصادمة (Vahdatpour 2014) ومن برامج التجارب التي يصفها JOSPT 2013 بلا جرعةٍ منشورة؛ وهو للحساسية المتوسّطة فما دونها — من الأمام أوّلاً ثمّ من الجانب.",
      "Assisted active elevation: the wall takes some of the arm's weight so the hand reaches higher than it can in the air, and the patient sees progress with a mark on the wall. 'Wall walking' was part of the home programme in the shockwave trial (Vahdatpour 2014) and of trial programmes described by JOSPT 2013 without a published dose; it is for moderate irritability and below — facing the wall first, then side-on."],
    start: ["واقفٌ مواجهاً الحائط على بعد طول الساعد تقريباً، وأطرافُ أصابع اليد المصابة على الحائط بمستوى الصدر؛ وفي مرحلةٍ لاحقة الجانبُ المصاب نحو الحائط.",
      "Standing facing the wall about a forearm's length away, with the fingertips of the affected hand on the wall at chest height; later, with the affected side towards the wall."],
    steps: [[
      "امشِ بأصابعك على الحائط إلى الأعلى خطوةً خطوة.",
      "توقّف عند أعلى ارتفاعٍ بلا ألمٍ حادّ واثبت ٥ ثوانٍ، وضع علامةً صغيرة إن أردت.",
      "اقترب من الحائط خطوةً صغيرة إن استطعت ليرتفع الذراعُ أكثر.",
      "انزل بالأصابع ببطء، أو ساعد باليد السليمة.",
      "كرّر ١٠ مرّات، ثمّ من الجانب حين يسمح الأخصائيّ.",
    ], [
      "Walk your fingers up the wall step by step.",
      "Stop at the highest point without sharp pain and hold for 5 seconds; mark it if you like.",
      "Take a small step closer to the wall if you can, so the arm rises further.",
      "Walk the fingers down slowly, or help with the healthy hand.",
      "Repeat 10 times, then side-on when the therapist allows.",
    ]],
    cues: [[
      "رفعُ الكتف نحو الأذن أو ميلُ الجذع إلى الجانب ⟵ الكتفُ منخفض والجذعُ مستقيم.",
      "الوقوفُ على أطراف الأصابع لتصل أعلى ⟵ القدمان مسطّحتان.",
      "تقويسُ أسفل الظهر ⟵ البطنُ مشدودٌ قليلاً والظهرُ مستقيم.",
      "إسقاطُ الذراع فجأةً من الأعلى ⟵ نزولٌ بطيء بالأصابع أو باليد السليمة.",
    ], [
      "Shrugging towards the ear or leaning the trunk sideways → shoulder down and trunk upright.",
      "Rising onto the toes to reach higher → feet flat.",
      "Arching the low back → abdomen lightly braced and back straight.",
      "Letting the arm drop suddenly from the top → walk down slowly or use the healthy hand.",
    ]],
    easier: ["ارتفاعٌ أقلّ، أو زلقُ الذراع على الطاولة (بطاقة «زلق الذراع المصابة على الطاولة بالمنشفة»).", "A lower height, or arm slides on a table (the 'Table-top towel slides' card)."],
    harder: ["من الجانب (الإبعاد)، وثباتٌ ١٠–٣٠ ثانية في الأعلى، ثمّ رفعُ الذراع بلا حائط (بطاقة «رفع الذراع في مستوى لوح الكتف»).",
      "Side-on (abduction), a 10–30-second hold at the top, then raising the arm without the wall (the 'Scaption raise' card)."],
    stopIf: ["ألمٌ حادّ يمنع النزول، أو ألمٌ يبقى بعد التمرين ويسوء به النوم، أو تنميلٌ في اليد.", "Sharp pain that prevents lowering, pain that stays after the exercise and disturbs sleep, or tingling in the hand."],
    equipment: ["حائط، وقلمٌ أو لاصقٌ لعلامة الارتفاع.", "A wall, and a pencil or sticker to mark the height."],
    doseNote: ["١٠ مرّات بثباتٍ ٥ ثوانٍ في الأعلى، مرّتين أو ثلاثاً يومياً — اقتراحٌ عمليّ: مشيُ الحائط في برامج التجارب بلا جرعةٍ منشورة.",
      "10 repetitions with a 5-second hold at the top, two or three times a day — a practical suggestion: wall walking appears in trial programmes without a published dose."],
    images: [{ key: "wall-finger-walk-1", ar: "واقفٌ بزاويةٍ نحو الحائط يصعد بأصابع اليد المصابة عليه", en: "Standing angled towards the wall, walking the fingers of the affected hand up it", search: "wall finger walk shoulder flexion exercise" }],
  },
  {
    code: "towel-ir-behind-back", nameAr: "الدوران الداخليّ خلف الظهر بالمنشفة", nameEn: "Towel-assisted internal rotation behind the back",
    kind: "stretch", region: "shoulder", perSide: true, sets: 1, reps: 5, hold: 15,
    purpose: ["اليدُ خلف الظهر — لبسُ الحزام وإدخالُ القميص وتعليقُ الملابس والطهارة — من أصعب ما يعود في الكتف المتجمّد، وتُقاس بمسافة الإبهام عن خطّ الحوض بالشريط (أوثقُ من عدّ الفقرات — Edwards 2002 · van den Dolder 2014). الدورانُ الداخليّ من الاتّجاهات الأربعة في برنامج Griggs 2000 (جرعتُه غيرُ منشورة)، وهو غالباً أكثرُها ألماً — فيبدأ متأخّراً ولطيفاً (اقتراح).",
      "Hand behind the back — fastening a belt, tucking in a shirt, hooking clothes and toileting — is among the hardest movements to recover in frozen shoulder, and it is measured by the thumb-to-pelvis distance with a tape (more reliable than counting vertebral levels — Edwards 2002 · van den Dolder 2014). Internal rotation is one of the four directions in the Griggs 2000 programme (dose not published), and often the most painful — so it starts later and gently (a suggestion)."],
    start: ["واقفٌ، والمنشفةُ في اليد السليمة فوق الكتف تتدلّى خلف الظهر، واليدُ المصابة خلف الظهر عند الحوض تمسك طرفَها السفليّ.",
      "Standing, with a towel held in the healthy hand over the shoulder and hanging down the back, and the affected hand behind the back at pelvis level holding its lower end."],
    steps: [[
      "اسحب المنشفةَ إلى الأعلى باليد السليمة ببطء فتصعد اليدُ المصابة على الظهر.",
      "توقّف عند شدٍّ محتمل أمام الكتف أو خلفه، واثبت ١٠–٢٠ ثانية.",
      "أرخِ ببطء إلى البداية.",
      "كرّر ٥ مرّات، مرّةً أو مرّتين في اليوم.",
    ], [
      "Pull the towel slowly upwards with the healthy hand so that the affected hand slides up the back.",
      "Stop at a tolerable stretch in the front or back of the shoulder and hold for 10–20 seconds.",
      "Ease back slowly to the start.",
      "Repeat 5 times, once or twice a day.",
    ]],
    cues: [[
      "الانحناءُ إلى الأمام أو ميلُ الجذع ⟵ الجذعُ مستقيم والكتفان مستويتان.",
      "دفعُ الكتف المصابة إلى الأمام ⟵ الكتفُ إلى الخلف قليلاً.",
      "السحبُ بقوّة في ألمٍ حادّ ⟵ شدٌّ محتمل يهدأ بعد التمرين.",
    ], [
      "Bending forward or leaning the trunk → trunk upright and shoulders level.",
      "Rolling the affected shoulder forward → shoulder drawn slightly back.",
      "Pulling hard into sharp pain → a tolerable stretch that settles afterwards.",
    ]],
    easier: ["اليدُ المصابة على الإلية أو الجيب الخلفيّ وتنزلق على الظهر بلا منشفة، أو شدٌّ أقلّ.", "The affected hand on the buttock or back pocket, sliding up the back without a towel, or a lighter pull."],
    harder: ["ثباتٌ ٣٠ ثانية، ثمّ الدورانُ الداخليّ على الجنب (بطاقة «تمطيط النائم»).", "30-second holds, then side-lying internal rotation (the 'Sleeper stretch' card)."],
    stopIf: ["ألمٌ حادّ أمام الكتف، أو ألمٌ يبقى بعد التمرين ويسوء به النوم، أو تنميلٌ في اليد.", "Sharp pain in the front of the shoulder, pain that stays after the exercise and disturbs sleep, or tingling in the hand."],
    equipment: ["منشفةٌ طويلة أو حزام.", "A long towel or a strap."],
    doseNote: ["٥–١٠ مرّاتٍ بثباتٍ ١٠–٢٠ ثانية، مرّةً أو مرّتين يومياً، في المرحلتين الثانية والثالثة — اقتراحٌ عمليّ: الجرعةُ في Griggs 2000 غيرُ منشورة.",
      "5–10 repetitions with 10–20-second holds, once or twice a day, in phases 2 and 3 — a practical suggestion: the Griggs 2000 dose is not published."],
    images: [{ key: "towel-ir-behind-back-1", ar: "منشفةٌ خلف الظهر واليدُ السليمة فوق الكتف تسحبها فتصعد اليدُ المصابة على الظهر", en: "A towel behind the back, the healthy hand above the shoulder pulling it so the affected hand slides up the back", search: "towel internal rotation stretch behind back shoulder" }],
  },
  {
    code: "sleeper-stretch", nameAr: "تمطيط النائم (الدوران الداخليّ على الجنب)", nameEn: "Sleeper stretch (side-lying internal rotation)",
    kind: "stretch", region: "shoulder", perSide: true, sets: 1, reps: 10, hold: 10,
    purpose: ["تمطيطُ خلف المحفظة والدورانِ الداخليّ في وضعٍ يثبّت لوحَ الكتف بثقل الجسم. من البرنامج المنزليّ في Oh 2011 (١٠ مرّاتٍ بثباتٍ ٥–١٠ ثوانٍ، ٣–٥ مرّاتٍ يومياً كما يصفه JOSPT 2013)؛ وقد يثير ألماً أمام الكتف، والنومُ على الجهة المصابة مؤلمٌ في هذه الحالة — فلا يُعطى في الحساسية العالية، وهو للمرحلة الثالثة.",
      "Stretches the posterior capsule and internal rotation in a position where body weight steadies the shoulder blade. From the Oh 2011 home programme (10 repetitions with 5–10-second holds, 3–5 times a day, as described by JOSPT 2013); it can provoke pain at the front of the shoulder, and lying on the affected side is painful in this condition — so it is not given at high irritability and belongs to phase 3."],
    start: ["مستلقٍ على الجنب المصاب ورأسُه على وسادة، والذراعُ المصابة أمامه بزاوية ٩٠° من الجسم والمرفقُ مثنيّ ٩٠° والساعدُ إلى الأعلى؛ ومائلٌ إلى الخلف قليلاً إن ضغط الكتف.",
      "Lying on the affected side with the head on a pillow, the affected arm in front at 90° from the body, the elbow bent to 90° and the forearm pointing up; rolled back slightly if the shoulder feels squashed."],
    steps: [[
      "باليد السليمة ادفع ساعدَ الذراع المصابة ببطء نحو السرير (دورانٌ داخليّ).",
      "توقّف عند شدٍّ محتمل خلف الكتف، واثبت ١٠ ثوانٍ.",
      "أرخِ ببطء إلى البداية.",
      "كرّر ١٠ مرّات.",
    ], [
      "With the healthy hand, slowly press the affected forearm down towards the bed (internal rotation).",
      "Stop at a tolerable stretch at the back of the shoulder and hold for 10 seconds.",
      "Ease back slowly to the start.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "دورانُ الجذع إلى الأمام أو رفعُ الكتف عن السرير ⟵ الجذعُ جانبيّ (أو مائلٌ إلى الخلف قليلاً) والكتفُ تحته.",
      "الدفعُ بقوّة في ألمٍ أمام الكتف ⟵ مدىً أقلّ.",
      "مرفقٌ أعلى من الكتف أو أدنى منه كثيراً ⟵ المرفقُ بمستوى الكتف.",
    ], [
      "Rolling the trunk forwards or lifting the shoulder off the bed → trunk side-on (or rolled back slightly) with the shoulder underneath.",
      "Pressing hard into pain at the front of the shoulder → a smaller range.",
      "The elbow well above or below shoulder level → elbow at shoulder level.",
    ]],
    easier: ["الجذعُ مائلٌ إلى الخلف ٢٠–٣٠° ليقلّ الضغطُ على الكتف، أو دفعٌ أخفّ وثباتٌ أقصر.", "The trunk rolled back 20–30° to take pressure off the shoulder, or a lighter press and a shorter hold."],
    harder: ["ثباتٌ ٣٠ ثانية × ٣.", "30-second holds × 3."],
    stopIf: ["ألمٌ حادّ أمام الكتف أو تنميلٌ في الذراع، أو ألمٌ يبقى بعد التمرين ويسوء به النوم.", "Sharp pain at the front of the shoulder or tingling in the arm, or pain that stays after the exercise and disturbs sleep."],
    equipment: ["سريرٌ أو فرشة، ووسادة.", "A bed or mat, and a pillow."],
    doseNote: ["١٠ مرّاتٍ بثباتٍ ٥–١٠ ثوانٍ، ٣–٥ مرّاتٍ يومياً (برنامجُ Oh 2011 كما يصفه JOSPT 2013) — في المرحلة الثالثة وحدها.",
      "10 repetitions with 5–10-second holds, 3–5 times a day (the Oh 2011 programme as described by JOSPT 2013) — in phase 3 only."],
    images: [{ key: "sleeper-stretch-1", ar: "البدايةُ: مستلقٍ على الجنب والكتفُ والمرفقُ بزاوية ٩٠°؛ والنهايةُ: اليدُ الأخرى تدفع الساعدَ نحو السرير", en: "Start: side-lying with the shoulder and elbow at 90°; finish: the other hand presses the forearm towards the bed", search: "sleeper stretch shoulder internal rotation" }],
  },
  {
    code: "prayer-wudu-reach", nameAr: "مدى الكتف للصلاة والوضوء (التكبير والمسح على الرأس)", nameEn: "Shoulder reach for prayer and ablution (takbir and wiping the head)",
    kind: "functional", region: "shoulder", sets: 1, reps: 5,
    purpose: ["التكبيرُ (رفعُ اليدين إلى الأذنين) والمسحُ على الرأس وغسلُ الذراع الأخرى والسجودُ على اليدين — مهامُّ يومية متكرّرة يطلبها المريض. لا دراسةَ تقيس مدى الكتف اللازم للصلاة أو الوضوء (بحثٌ صفريّ مكتوب)؛ وأقربُ بديل أنّ الأنشطة اليومية تحتاج نحو ١٢٠–١٣٠° من الرفع (Namdari 2012 · Oosterwijk 2018). فتُعامل هدفاً وظيفيّاً يختاره المريض: تُختبر وتتدرّج (JOSPT 2013: دمجُ الحركة في الوصول اليوميّ؛ والخبراءُ البريطانيّون أوصوا بالتمارين الوظيفية في التيبّس — Hanchard 2020). والحكمُ الشرعيّ للمريض ومرجعه لا للمعالج.",
      "Takbir (raising the hands to the ears), wiping the head, washing the other arm and prostrating on the hands are repeated daily tasks that patients ask about. No study measures the shoulder range needed for prayer or ablution (a documented zero result); the nearest proxy is that daily activities need about 120–130° of elevation (Namdari 2012 · Oosterwijk 2018). So they are treated as functional goals chosen by the patient: tested and graded (JOSPT 2013: integrating motion into daily reaching; UK experts recommended function-based exercise in the stiffness-predominant stage — Hanchard 2020). Religious rulings are for the patient and his or her own religious authority, not the therapist."],
    start: ["واقفٌ أو جالسٌ على كرسيٍّ بظهرٍ مستقيم، أمام مرآةٍ إن أمكن.", "Standing, or sitting upright on a chair, in front of a mirror if possible."],
    steps: [[
      "التكبير: ارفع اليدين معاً إلى مستوى الكتفين ثمّ الأذنين ببطء والكفّان إلى الأمام، إلى ما يسمح به الكتفُ بلا ألمٍ حادّ.",
      "اثبت ثانيتين ثمّ أنزل ببطء.",
      "المسحُ على الرأس: ضع اليدَ المصابة على الجبهة ثمّ مرّرها إلى أعلى الرأس فخلفه بقدر ما يسمح الكتف، واليدُ السليمة تساعد عند المرفق إن احتاج.",
      "كرّر كلَّ حركةٍ ٥ مرّات، وسجّل أين تصل اليدُ (الكتف · الأذن · أعلى الرأس · خلفه).",
      "السجود: حين يسمح الأخصائيّ، اسند وزناً يزيد بالتدريج على اليدين من الوضع على أربع.",
    ], [
      "Takbir: raise both hands together slowly to shoulder level and then to the ears, palms forward, as far as the shoulder allows without sharp pain.",
      "Hold for two seconds, then lower slowly.",
      "Wiping the head: place the affected hand on the forehead and slide it over the top of the head and behind it as far as the shoulder allows, with the healthy hand helping at the elbow if needed.",
      "Repeat each movement 5 times and note where the hand reaches (shoulder · ear · top of the head · behind it).",
      "Prostration: when the therapist allows, take gradually more weight through the hands from all fours.",
    ]],
    cues: [[
      "ميلُ الرأس نحو اليد بدلَ رفع اليد ⟵ الرأسُ مستقيم واليدُ تصعد إليه.",
      "رفعُ الكتف نحو الأذن وتقويسُ الظهر ⟵ الكتفان منخفضتان والظهرُ مستقيم.",
      "الإصرارُ على المدى الكامل مع ألمٍ حادّ ⟵ أقصى ما يُحتمل، والمدى يتحسّن بالتدريج.",
    ], [
      "Tilting the head towards the hand instead of raising the hand → head upright and the hand rises to it.",
      "Shrugging towards the ear and arching the back → shoulders down and back straight.",
      "Insisting on full range with sharp pain → the most that is tolerable, with range improving gradually.",
    ]],
    easier: ["التكبيرُ إلى مستوى الصدر أو الكتف، والمسحُ واليدُ السليمة تساعد عند المرفق، أو جالساً.", "Takbir to chest or shoulder level, wiping with the healthy hand helping at the elbow, or seated."],
    harder: ["التكبيرُ الكامل إلى الأذنين، والمسحُ إلى مؤخّرة الرأس، وغسلُ الذراع الأخرى إلى المرفق، والسجودُ بالوزن كاملاً على اليدين — هدفُ المرحلة الثالثة.",
      "Full takbir to the ears, wiping to the back of the head, washing the other arm up to the elbow, and prostration with full weight on the hands — the phase 3 goal."],
    stopIf: ["ألمٌ حادّ، أو ألمٌ يبقى بعد الحركة ويسوء به النوم، أو تنميلٌ في اليد.", "Sharp pain, pain that stays after the movement and disturbs sleep, or tingling in the hand."],
    equipment: ["كرسيٌّ بظهر، ومرآةٌ إن وُجدت.", "A chair with a back, and a mirror if available."],
    doseNote: ["٥ مرّاتٍ لكلّ حركة في الجلسة، والتدرّجُ بالصلوات والوضوء اليوميّ نفسِه — اقتراحٌ عمليّ بلا تجربة.", "5 times for each movement in the session, progressing through the daily prayers and ablutions themselves — a practical suggestion without a trial."],
    images: [{ key: "prayer-wudu-reach-1", ar: "يرفع يديه إلى مستوى الأذنين كالتكبير والكفّان إلى الأمام", en: "Raising both hands to ear level as in takbir, palms facing forward", search: "takbir hands raised ear level prayer" }],
  },
];

const IRRIT_AR = "قاعدةُ الشدّة في كلّ تمرينٍ وتحريك (JOSPT 2013 — B): الحساسيةُ العالية ⟵ بلا ألم؛ والمتوسّطةُ والمنخفضة ⟵ داخلَ مقاومة النسيج «دون أن يُحدث ألماً والتهاباً بعد العلاج» — والتمطيطُ بعد حدّ الألم قد يُسيء النتيجة. وقاعدةٌ عمليّة (لا رقمَ مثبتاً للألم المقبول في الكتف المتجمّد — بحثٌ صفريّ مكتوب): ألمٌ يزيد بعد الجلسة ويبقى إلى صباح اليوم التالي أو يُسيء النومَ تلك الليلة ⟵ الجلسةُ التالية أخفّ.";
const IRRIT_EN = "Intensity rule for every exercise and mobilisation (JOSPT 2013 — B): high irritability → pain-free; moderate and low → into tissue resistance 'without producing post-treatment tissue inflammation and associated pain' — stretching beyond painful limits may worsen the outcome. A practical rule (no acceptable-pain threshold has been established in frozen shoulder — a documented zero result): pain that rises after a session and lasts until the next morning or disturbs sleep that night → the next session is lighter.";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد بستّ جلسات (حتى ٣٠ — كأطول برنامجٍ مجرَّب: Çelik 2010) إن لم يتحقّق واحدٌ أو أكثر من معايير الخروج وكان ما يزال يتحسّن منذ الجلسة ١٢ — الدورانُ الخارجيّ السلبيّ زاد ١٣° فأكثر (أكبرُ من خطأ القياس — Tveitå 2008) أو نقص SPADI ٨ نقاط فأكثر (أدنى الفرق المهمّ — Roy 2009) — ولا علامةَ إحالة (والدليلُ البريطانيّ يجيز ستّةَ أسابيع أخرى لمن تحسّن وحده — Rangan 2015)؛ ولا تمديدَ لمن ثبت بلا تغيّر: يُحال إلى الطبيب أو اختصاصيّ الكتف (التوقّفُ أوّلاً بمعايير «موانع وإحالة»)، والبرنامجُ المنزليّ يستمرّ.";
const EXTEND_EN = "At session 24: one extension of six sessions (to 30 — the longest tested programme: Çelik 2010) if one or more discharge criteria are unmet and the patient is still improving since session 12 — passive external rotation up 13° or more (above the measurement error — Tveitå 2008) or SPADI down 8 points or more (the lower important change — Roy 2009) — with no referral trigger (the British pathway allows a further six weeks only for those improving — Rangan 2015); no extension for a patient who has not changed: refer to the doctor or a shoulder specialist (the stop rules under 'Contraindications and referral' come first), and the home programme continues.";

export const PROTOCOL: ProtocolContentSeed = {
  code: "frozen-shoulder-adult",
  summary: [
    "الكتفُ المتجمّد (التهابُ المحفظة اللاصق — Frozen shoulder / adhesive capsulitis) عند البالغين: ألمٌ يبدأ تدريجاً حول الكتف وأعلى العضد ويسوء ليلاً وعند النوم على الجهة المصابة، ثمّ تيبّسٌ في الحركة الفعّالة والسلبية معاً، أشدُّه في الدوران الخارجيّ (نقصُه ٥٠٪ فأكثر من الجهة الأخرى معيارُ التجارب — UK FROST). تشخيصُه سريريّ بالتاريخ والفحص (BESS 2025). أكثرُه بين ٤٠ و٦٥ سنة وعند النساء، وأقوى عوامله السكّريّ وأمراضُ الدرق (JOSPT 2013): يصيب ١٣٫٤٪ من السكّريّين ونحو ثلثُ المصابين سكّريّون (Zreik 2016)، وفي ميسان ١١٫٥٪ من ٢١٦ سكّريّاً (Alhashimi 2018). " +
    "مسارُه طويل — شهورٌ إلى سنتين أو ثلاث (Rangan 2016) — ولا «يُشفى وحده» دائماً: بقيت أعراضٌ — خفيفةٌ غالباً — عند ٤١٪ بعد أربع سنوات وشديدةٌ عند ٦٪ (Hand 2008)، وأكثرُ التحسّن يأتي مبكّراً (Wong 2017)؛ والسكّريُّ وشدّةُ البداية يُسيئان المآل. " +
    "الإرشادات: الحقنةُ داخل المفصل أقوى ما في الدليل وأسرعُ للألم والوظيفة في الأسابيع الأولى (JOSPT 2013 — A · BESS 2025 «قويّة» · Challoumas 2020)، والتثقيفُ والتمطيطُ بشدّةٍ تتبع حساسيةَ النسيج (B)، والتحريكُ المفصليّ والأجهزةُ مع التمرين (C)؛ والعلاجُ الطبيعيّ بعد الحقنة «مشروطٌ» لصالحه، ووحدَه لم يُثبت أنّه أسرعُ من المسار الطبيعيّ (BESS 2025). وفي التجربة البريطانية الكبرى بلغت الحقنةُ مع علاجٍ طبيعيٍّ منظّم حتى ١٢ جلسة في ١٢ أسبوعاً عند السنة ما بلغته الجراحةُ والتحريكُ تحت التخدير بلا فرقٍ مهمّ سريريّاً (UK FROST — Rangan 2020). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ والطمأنةُ الصادقة، والإحالةُ المبكّرة إلى الطبيب للحقنة، وتمارينُ المدى والتمطيطُ والتحريكُ المفصليّ بشدّةٍ تتبع الحساسية، والبرنامجُ المنزليّ اليوميّ (أهمُّ من عدد الجلسات — Tanaka 2010)، ثمّ التقويةُ والمهامُّ الوظيفية والصلاةُ والوضوء — والأجهزةُ مساعدة. ثلاثُ مراحل بالحساسية: عاليةٌ (الألمُ غالب) ثمّ متوسّطة ثمّ منخفضة (التيبّسُ غالب)، بمعايير رقمية وقواعدِ إحالةٍ في الجلستين ١٢ و٢٤.",
    "Frozen shoulder (adhesive capsulitis) in adults: pain that starts gradually around the shoulder and upper arm, worse at night and when lying on the affected side, followed by stiffness of both active and passive movement, most marked in external rotation (a loss of 50% or more against the other side is the trial criterion — UK FROST). The diagnosis is clinical, from history and examination (BESS 2025). It is commonest between 40 and 65 and in women, and its strongest risk factors are diabetes and thyroid disease (JOSPT 2013): it affects 13.4% of people with diabetes and about a third of patients are diabetic (Zreik 2016), and 11.5% of 216 diabetic patients in Misan (Alhashimi 2018). " +
    "Its course is long — months to two or three years (Rangan 2016) — and not always 'self-limiting': symptoms — mostly mild — persisted in 41% at four years and were severe in 6% (Hand 2008), and most improvement occurs early (Wong 2017); diabetes and severe initial symptoms worsen the outlook. " +
    "Guidelines: intra-articular injection has the strongest evidence and works faster for pain and function in the first weeks (JOSPT 2013 — A · BESS 2025 'strong' · Challoumas 2020); education and stretching with intensity matched to tissue irritability (B), and joint mobilisation and modalities with exercise (C); physiotherapy after injection is a conditional recommendation, and physiotherapy alone has not been shown to be faster than the natural course (BESS 2025). In the large UK trial, injection with structured physiotherapy of up to 12 sessions over 12 weeks reached at one year what surgery and manipulation under anaesthesia reached, with no clinically important difference (UK FROST — Rangan 2020). " +
    "So the protocol: a core in every session — education and honest reassurance, early referral to the doctor for injection, range-of-motion exercise, stretching and joint mobilisation at an intensity matched to irritability, and the daily home programme (more important than the number of sessions — Tanaka 2010), then strengthening, functional tasks, prayer and ablution — with devices as adjuncts. Three phases by irritability: high (pain-predominant), then moderate, then low (stiffness-predominant), with numeric criteria and referral rules at sessions 12 and 24.",
  ],
  goals: [
    "• ألمُ الحركة ينقص نقطتين فأكثر من ١٠ (الفرقُ المهمّ ٢٫١٧ في ألم الكتف — Michener 2011)، ويهدأ ألمُ الليل فيعود النوم.\n" +
    "• مؤشّرُ ألم الكتف وإعاقته (SPADI) ينقص ٨–١٣ نقطة فأكثر (الفرقُ المهمّ — Roy 2009؛ والتغيّرُ الأصغر الموثوق عند الفرد في الكتف المتجمّد ١٧ — Tveitå 2008).\n" +
    "• الدورانُ الخارجيّ السلبيّ يزيد ١٣° فأكثر (أكبرُ من خطأ القياس في الكتف المتجمّد — Tveitå 2008)، والرفعُ نحو ١٢٠–١٣٠° الذي تحتاجه الأنشطةُ اليومية (Namdari 2012) — ولا يُشترط المدى الكامل لنجاح العلاج (JOSPT 2013).\n" +
    "• العودةُ إلى المهامّ التي يختارها المريض: اللبس، وتمشيطُ الشعر، واليدُ خلف الظهر، والتكبيرُ والمسحُ على الرأس في الوضوء، والعمل.\n" +
    "• فهمُ الحالة ومسارِها الطويل، وبرنامجٌ منزليّ يوميّ يُكمله وحده بعد الخروج، والإحالةُ إلى الحقنة في وقتها لا متأخّرة.",
    "• Pain on movement down 2 points or more out of 10 (the important change of 2.17 in shoulder pain — Michener 2011), with night pain settling so sleep returns.\n" +
    "• The Shoulder Pain and Disability Index (SPADI) down 8–13 points or more (the important change — Roy 2009; the smallest reliable individual change in frozen shoulder is 17 — Tveitå 2008).\n" +
    "• Passive external rotation up 13° or more (above the measurement error in frozen shoulder — Tveitå 2008), and elevation towards the 120–130° that daily activities need (Namdari 2012) — full range is not required for successful treatment (JOSPT 2013).\n" +
    "• Return to the tasks the patient chooses: dressing, combing the hair, hand behind the back, takbir and wiping the head in ablution, and work.\n" +
    "• Understanding the condition and its long course, an independent daily home programme continued after discharge, and referral for injection at the right time, not late.",
  ],
  assessment: [
    "• التاريخ: متى بدأ الألم (والمدّةُ تختار الطريق: أقلُّ من سنةٍ والألمُ غالب ⟵ الحقنةُ أنفع — Challoumas 2020)، وألمُ الليل والنومُ على الجهة المصابة، والسكّريُّ وضبطُه وأمراضُ الدرق، وحقنٌ سابقة، والعملُ والمهامُّ المهمّة له (الصلاةُ والوضوءُ واللبس)؛ وعلاماتُ الخطر في «موانع وإحالة».\n" +
    "• التشخيصُ سريريّ (BESS 2025): ألمٌ تدريجيّ حول الدالية، ونقصٌ في الحركة الفعّالة والسلبية معاً في الرفع والدوران، والدورانُ الخارجيّ السلبيّ أكثرُها نقصاً — ونقصُه ٥٠٪ فأكثر من الجهة الأخرى أو أقلُّ من ٣٠° معيارُ التجارب (JOSPT 2013) لا حدٌّ مثبتُ الدقّة (Schiltz 2023). ويُستبعد: مدىً سلبيّ طبيعيّ (اعتلالُ الكفّة لا التجمّد)، وخشونةُ المفصل (طقطقةٌ وصورة)، وخلعٌ خلفيّ مقفل (سقطةٌ أو نوبةُ صرعٍ أو صعقة مع دورانٍ داخليّ ثابت)، وألمٌ منقول من الرقبة أو انحباسُ عصب. وتحسّنُ المدى الكبير الفوريّ يعني غالباً أنّه ليس كتفاً متجمّداً (JOSPT 2013).\n" +
    "• حساسيةُ النسيج في كلّ جلسة (JOSPT 2013): عالية = ألمٌ ٧ من ١٠ فأكثر وألمٌ ليليّ ثابت وألمٌ قبل نهاية المدى والفعّالُ أقلّ كثيراً من السلبيّ؛ متوسّطة = ٤–٦ وليليٌّ متقطّع وألمٌ عند نهاية المدى والفعّالُ قريبٌ من السلبيّ؛ منخفضة = ٣ أو أقلّ وبلا ألمٍ ليليّ والألمُ مع الضغط الزائد وحده والفعّالُ = السلبيّ. والفاصلُ الأهمّ علاقةُ الألم بالمدى؛ ولا دراسةَ لثبات هذا التصنيف بين الفاحصين (بحثٌ صفريّ مكتوب).\n" +
    "• المقاييسُ المزروعة: مؤشّرُ ألم الكتف وإعاقته (SPADI من ١٠٠ — بالعربية Alsanawi 2015؛ الفرقُ المهمّ ٨–١٣ — Roy 2009؛ والتغيّرُ الأصغر الموثوق في الكتف المتجمّد ١٧ — Tveitå 2008)، والدورانُ الخارجيّ — يُقاس سلبيّاً في الاستلقاء والمرفقُ مثنيٌّ ٩٠° بجانب الجسم، بالأداة نفسِها والأخصائيّ نفسِه (التغيّرُ الموثوق ١٣°)، والعطفُ — والمزروعُ فعّال وتغيّرُه الموثوق أكبر (١٣–٢٨° للفعّال و١٧° للسلبيّ — Tveitå 2008) فلا يُحكم بفرقٍ أصغر. ولا تُبدَّل الأداةُ بين قياسٍ وقياس (Kolber 2012).\n" +
    "• ويضيف المشرف: ألمَ الليل وألمَ الحركة كلّاً من ١٠ (والألمُ العامّ مقيسٌ لكلّ مريض؛ ومقياسُ الألم العربيّ مثبتٌ في الركبة — Alghadir 2016)، ومسافةَ الإبهام عن خطّ الحوض خلف الظهر بالشريط (سم — أوثقُ من عدّ الفقرات: Edwards 2002 · van den Dolder 2014)، والإبعادَ والدورانَ الداخليّ السلبيّين (التغيّرُ الموثوق ١٤° لكلٍّ منهما — Tveitå 2008)، ومقياسَ أكسفورد للكتف بالعربية (OSS من ٤٨ — Alsanawi 2021 وفيه مرضى الكتف المتجمّد؛ الفرقُ المهمّ ٦ — van Kampen 2013) أو QuickDASH بالعربية (Alnahdi 2021)؛ ولا يُستعمل مقياسُ كونستانت وحده (JOSPT 2013).\n" +
    "• يُعاد التقييمُ في الجلسات ٨ و١٦ و٢٤ (والحساسيةُ وألمُ الحركة في كلّ جلسة) بقواعد الإحالة في «موانع وإحالة».",
    "• History: when the pain began (the duration picks the route: under a year and pain-predominant → injection helps most — Challoumas 2020), night pain and lying on the affected side, diabetes and its control and thyroid disease, previous injections, and work and the tasks that matter to the patient (prayer, ablution, dressing); and the warning signs under 'Contraindications and referral'.\n" +
    "• The diagnosis is clinical (BESS 2025): gradual pain around the deltoid, loss of both active and passive movement in elevation and rotation, with passive external rotation the most reduced — a loss of 50% or more against the other side, or under 30°, is the trial criterion (JOSPT 2013), not a validated diagnostic threshold (Schiltz 2023). Rule out: normal passive range (a cuff problem, not frozen shoulder), osteoarthritis (crepitus and X-ray), a locked posterior dislocation (a fall, seizure or electric shock with fixed internal rotation), and pain referred from the neck or nerve entrapment. A large, immediate gain in range usually means it was not frozen shoulder (JOSPT 2013).\n" +
    "• Tissue irritability at every session (JOSPT 2013): high = pain 7/10 or more, constant night pain, pain before end range, and active range well below passive; moderate = 4–6, intermittent night pain, pain at end range, and active close to passive; low = 3 or less, no night pain, pain only with overpressure, and active equal to passive. The key discriminator is how pain relates to range; no study has tested the reliability of this classification between examiners (a documented zero result).\n" +
    "• Seeded measures: the Shoulder Pain and Disability Index (SPADI out of 100 — Arabic: Alsanawi 2015; important change 8–13 — Roy 2009; smallest reliable change in frozen shoulder 17 — Tveitå 2008), external rotation — measured passively in supine with the elbow bent to 90° at the side, with the same instrument and the same therapist (reliable change 13°), and flexion — the seeded measure is active, and its reliable change is larger (13–28° active and 17° passive — Tveitå 2008), so smaller differences are not judged real. The instrument is not switched between measurements (Kolber 2012).\n" +
    "• The supervisor adds: night pain and pain on movement, each out of 10 (general pain is recorded for every patient; the Arabic pain scale was validated in the knee — Alghadir 2016), the thumb-to-pelvis distance behind the back with a tape (cm — more reliable than counting vertebral levels: Edwards 2002 · van den Dolder 2014), passive abduction and internal rotation (reliable change 14° each — Tveitå 2008), and the Arabic Oxford Shoulder Score (OSS out of 48 — Alsanawi 2021, including patients with frozen shoulder; important change 6 — van Kampen 2013) or the Arabic QuickDASH (Alnahdi 2021); the Constant score is not used alone (JOSPT 2013).\n" +
    "• Reassess at sessions 8, 16 and 24 (with irritability and pain on movement at every session) using the referral rules under 'Contraindications and referral'.",
  ],
  exercises: [
    "البرنامجُ في «البرنامج على مراحل» بالبطاقات وجرعتها، والمرحلةُ تتبع حساسيةَ النسيج لا رقمَ الجلسة (يختارها الأخصائيّ). الحساسيةُ العالية: البندولُ والمدى المساعَد بالعصا والطاولة بلا ألم، وتحريكٌ مفصليّ لطيف (الدرجتان الأولى والثانية) في المدى غير المؤلم، وضبطُ لوح الكتف والتمارينُ الثابتة دون الألم (JOSPT 2013). المتوسّطة: التمطيطُ والتحريكُ داخلَ مقاومة النسيج — والانزلاقُ الخلفيّ للعضد زاد الدورانَ الخارجيّ أكثرَ من الأماميّ (Johnson 2007)، والتحريكُ بنهاية المدى ومع الحركة أفضلُ من منتصفه (Yang 2007 · Doner 2013)، و«امسك ثمّ أرخِ» (PNF — Tedla 2019)، وتمارينُ لوح الكتف (Çelik 2010). المنخفضة: تحريكٌ بنهاية المدى وسعةٍ عالية (الدرجتان الثالثة والرابعة — أفضلُ قليلاً في الإبعاد والدوران: Vermeulen 2006)، وتمطيطٌ أطول (خلف الكتف، والنائم، والدورانُ الداخليّ خلف الظهر)، والتقويةُ بالمطّاط حين يهدأ الألم، والمهامُّ الوظيفية. " +
    "والبرنامجُ المنزليّ يومياً عدّةَ مرّاتٍ قصيرة (١٠ مرّاتٍ بثباتٍ ٥–١٠ ثوانٍ ٣–٥ مرّاتٍ في اليوم — Oh 2011 كما يصفه JOSPT 2013): الالتزامُ به ارتبط بتحسّنٍ أكبر وأسرع، وتواترُ التحريك في العيادة لم يرتبط (Tanaka 2010). " +
    "ولا يُشترط المدى الكامل (JOSPT 2013)، ولا تمطيطَ بعد حدّ الألم في الحساسية العالية (Diercks 2004 — دراسةٌ غيرُ عشوائية، وعكسُها في تجربة Lubis 2013 الصغيرة)، ولا تثبيتَ للكتف (Salamh 2025).",
    "The programme is under 'Programme by phase' with its cards and doses, and the phase follows tissue irritability, not the session number (the therapist chooses it). High irritability: pendulum and pain-free assisted range with the wand and on the table, gentle joint mobilisation (grades I–II) in the pain-free range, and scapular setting and pain-free isometrics (JOSPT 2013). Moderate: stretching and mobilisation into tissue resistance — the posterior humeral glide gained more external rotation than the anterior glide (Johnson 2007), end-range mobilisation and mobilisation with movement beat mid-range (Yang 2007 · Doner 2013), hold-relax (PNF — Tedla 2019), and scapular exercise (Çelik 2010). Low: end-range, high-amplitude mobilisation (grades III–IV — slightly better for abduction and rotation: Vermeulen 2006), longer stretches (posterior shoulder, sleeper, and internal rotation behind the back), band strengthening once pain settles, and functional tasks. " +
    "The home programme is done daily in several short bouts (10 repetitions with 5–10-second holds, 3–5 times a day — Oh 2011 as described by JOSPT 2013): adherence to it was linked to larger and faster gains, while clinic mobilisation frequency was not (Tanaka 2010). " +
    "Full range is not required (JOSPT 2013), there is no stretching beyond pain at high irritability (Diercks 2004 — a non-randomised study, with the opposite finding in the small Lubis 2013 trial), and the shoulder is not immobilised (Salamh 2025).",
  ],
  contraindications: [
    "قبل البدء وفي كلّ جلسة: علاماتُ الخطر وحساسيةُ النسيج.\n" +
    "• إحالةٌ في اليوم نفسِه أو عاجلة (فئاتُ المسار البريطانيّ — Rangan 2015؛ والأمثلةُ بين القوسين عمليّة): اشتباهُ التهابٍ جرثوميّ في المفصل (حمّى، مفصلٌ حارٌّ متورّم، حقنةٌ حديثة، مناعةٌ ضعيفة)؛ وخلعٌ غيرُ مردود (سقطةٌ أو نوبةُ صرعٍ أو صعقةٌ كهربائية، والذراعُ ثابتةٌ في الدوران الداخليّ والخارجيُّ ممتنعٌ تماماً) — صورةٌ قبل أيّ تحريك (Basal 2018)؛ واشتباهُ ورم (سرطانٌ سابق، نقصُ وزنٍ غير مفسَّر، ألمٌ ليليّ لا يتغيّر بالحركة، كتلة، ومدخّنٌ بألمٍ في أعلى الكتف أو لوحه — ورمُ قمّة الرئة يتنكّر ألماً في الكتف: Al Shammari 2020)؛ وتمزّقُ الكفّة الرضّيّ الحادّ (ضعفٌ مفاجئ بعد إصابة)؛ والتهابُ مفاصلَ جهازيّ (مفاصلُ أخرى وتيبّسٌ صباحيّ).\n" +
    "• صورةٌ شعاعية في مستويين قبل التحريك بنهاية المدى إن وُجد واحدٌ ممّا سبق، أو عمرٌ فوق ٤٠ بصورةٍ غير نموذجية، أو طقطقة (خشونة)، أو لا تحسّنَ بعد ستّة أسابيع — في ٣٥٠ صورةً روتينية لم يُكشف شيءٌ لم يكن التاريخُ والفحصُ يستدعيان صورتَه أصلاً (Roberts 2019)، لكنّ ٢٦٪ من أورام الكتف الخبيثة شُخّصت أوّلاً كتفاً متجمّداً (Sano 2010).\n" +
    "• إلى الطبيب للحقنة مبكّراً لا آخرَ الحلّ: الحقنةُ داخل المفصل مع التمرين أنفعُ قصيرَ المدى من التمرين وحده (JOSPT 2013 — A)، وتُقدَّم عند أوّل لقاء في الكتف المتجمّد الأقلّ من سنة (Challoumas 2020)، والعلاجُ يستمرّ معها. وقواعدُ هذا البروتوكول (اقتراح): حساسيةٌ عالية في الجلسة الأولى (ألمٌ ٧ فأكثر وألمٌ ليليّ ثابت) ⟵ إحالةٌ للحقنة مع البدء بالعلاج؛ وفي الجلسة ١٢ — لم ينقص ألمُ الحركة نقطتين منذ البداية (الفرقُ المهمّ — Michener 2011) أو ساءت الحال ⟵ إلى الطبيب.\n" +
    "• إلى اختصاصيّ الكتف (توسيعُ المحفظة بالسائل، وإحصارُ العصب فوق الكتف، والتحريكُ تحت التخدير، والتحريرُ بالمنظار): بعد نحو ثلاثة أشهر من العلاج غير الجراحيّ بلا نجاح، وأبكرَ مع ألمٍ أو تيبّسٍ شديد أو ألمٍ لا يُضبط أو عجزٍ وظيفيّ كبير أو شكٍّ في التشخيص (Rangan 2015)؛ وفي الجلسة ٢٤ — لم ينقص SPADI ٨ نقاط ولم يزد الدورانُ الخارجيّ ١٣° ⟵ إحالةٌ لا تمديد. ويُعاد النظرُ في التشخيص إن لم يتحسّن (JOSPT 2013).\n" +
    "• للعلم: في UK FROST لم تتفوّق الجراحةُ ولا التحريكُ تحت التخدير سريريّاً على الحقنة مع العلاج الطبيعيّ عند السنة، والأحداثُ الخطيرة أكثرُ بالتحرير بالمنظار (Rangan 2020)؛ وتوسيعُ المحفظة «مشروطٌ» لصالحه (BESS 2025)؛ وإحصارُ العصب فوق الكتف مع الحقنة والعلاج قصّر مدّةَ الأعراض إلى ٥٫٤ أشهر مقابل ١١٫٢ (Shanahan 2022).",
    "Before starting and at every session: the warning signs and tissue irritability.\n" +
    "• Same-day or urgent referral (the categories of the British pathway — Rangan 2015; the examples in brackets are practical cues): suspected joint infection (fever, a hot swollen joint, a recent injection, immunosuppression); an unreduced dislocation (a fall, seizure or electric shock, with the arm fixed in internal rotation and external rotation fully blocked) — an X-ray before any mobilisation (Basal 2018); suspected tumour (previous cancer, unexplained weight loss, night pain unrelated to movement, a mass, or a smoker with pain at the top of the shoulder or shoulder blade — an apical lung tumour can masquerade as shoulder pain: Al Shammari 2020); an acute traumatic cuff tear (sudden weakness after injury); and systemic inflammatory arthritis (other joints and morning stiffness).\n" +
    "• An X-ray in two planes before end-range mobilisation if any of the above, or age over 40 with an atypical picture, crepitus (arthritis), or no improvement after six weeks — among 350 routine X-rays nothing was found that history and examination would not have prompted anyway (Roberts 2019), but 26% of malignant shoulder tumours were first diagnosed as frozen shoulder (Sano 2010).\n" +
    "• To the doctor for injection early, not as a last resort: intra-articular injection with exercise beats exercise alone in the short term (JOSPT 2013 — A), and is offered at first contact in frozen shoulder of under a year (Challoumas 2020), with treatment continuing alongside it. This protocol's rules (a suggestion): high irritability at the first session (pain 7 or more with constant night pain) → refer for injection while starting treatment; at session 12 — pain on movement not down 2 points from the start (the important change — Michener 2011) or worsening → to the doctor.\n" +
    "• To a shoulder specialist (hydrodilatation, suprascapular nerve block, manipulation under anaesthesia, arthroscopic release): after about three months of unsuccessful non-surgical care, and earlier with severe pain or stiffness, uncontrolled pain, considerable loss of function or diagnostic doubt (Rangan 2015); at session 24 — SPADI not down 8 points and external rotation not up 13° → referral, not extension. Reconsider the diagnosis if the patient is not improving (JOSPT 2013).\n" +
    "• For information: in UK FROST neither surgery nor manipulation under anaesthesia was clinically superior to injection with physiotherapy at one year, and serious adverse events were more frequent after arthroscopic release (Rangan 2020); hydrodilatation is a conditional recommendation (BESS 2025); and suprascapular nerve block with injection and physiotherapy shortened symptoms to 5.4 months versus 11.2 (Shanahan 2022).",
  ],
  precautions: [
    IRRIT_AR + "\n" +
    "• السكّريّ: الحقنةُ ترفع سكّرَ الدم ٢٤–٧٢ ساعة وقد يبلغ ٥٠٠ ملغ/دسل — يراقبه المريضُ حتى أسبوع (Choudhry 2016) ويُسأل عنه في الجلسات بعدها؛ والإحساسُ بالحرارة يُفحص على الكتف قبل كلّ جهازٍ حراريّ (خطرُ الحروق عند السكّريّين وكبار السنّ — Physiotherapy Canada 2010)؛ والتحسّنُ عندهم أبطأ (Dyer 2021 · Rangan 2015) فيُقال ذلك صراحةً ولا يُطال علاجٌ لا ينفع.\n" +
    "• بعد الحقنة: يستمرّ العلاجُ أو يبدأ خلال أيّام — لا دراسةَ للفاصل الأمثل (بحثٌ صفريّ مكتوب) — وأسابيعُ الراحة من الألم فرصةٌ لتقدّم المدى (اقتراح).\n" +
    "• التحريكُ بنهاية المدى (الدرجتان الثالثة والرابعة) في الحساسية المنخفضة وحدها، وبعد استبعاد الخشونة والخلع بالصورة حين تلزم.\n" +
    "• التوقّعُ الصادق: المسارُ شهورٌ إلى سنتين أو ثلاث، والألمُ لا يدوم طوالها (Rangan 2016)، وقد تبقى قيودٌ خفيفة (Hand 2008)؛ والعلاجُ يسرّع التحسّن في الأشهر المؤلمة ولم تُثبت تجربةٌ أنّه يغيّر النهايةَ البعيدة — فلا يَعِد الأخصائيُّ بشفاءٍ تامّ ولا يُخيف. والكتفُ الأخرى قد تُصاب (٦–١٧٪ في خمس سنوات — Rangan 2016).\n" +
    "• الدواءُ من الطبيب، وللعلم: الكورتيزونُ بالفم يفيد أسابيعَ قليلة ولا يبقى أثرُه بعد ستّة (Buchbinder 2006)، ومضادّاتُ الالتهاب لم تتفوّق على العلاج الطبيعيّ (Berner 2024).\n" +
    "• الصلاةُ والوضوء: لا دراسةَ لمدى الكتف فيهما (بحثٌ صفريّ مكتوب) — بطاقتُهما في المراحل، والحكمُ الشرعيّ للمريض ومرجعه.",
    IRRIT_EN + "\n" +
    "• Diabetes: injection raises blood glucose for 24–72 hours, sometimes up to 500 mg/dL — the patient monitors it for up to a week (Choudhry 2016) and is asked about it in the following sessions; thermal sensation over the shoulder is tested before every heating device (burn risk in diabetic and older patients — Physiotherapy Canada 2010); recovery is slower in diabetes (Dyer 2021 · Rangan 2015), which is said openly, and ineffective care is not prolonged.\n" +
    "• After injection: treatment continues or starts within days — no study has defined the best interval (a documented zero result) — and the weeks of pain relief are an opportunity to progress range (a suggestion).\n" +
    "• End-range mobilisation (grades III–IV) only at low irritability, and after osteoarthritis and dislocation are excluded by X-ray when one is needed.\n" +
    "• Honest expectations: the course runs from months to two or three years, though pain does not last the whole time (Rangan 2016), and mild restriction may remain (Hand 2008); treatment speeds recovery during the painful months and no trial has shown it changes the long-term end-state — so the therapist neither promises full recovery nor alarms. The other shoulder may be affected (6–17% within five years — Rangan 2016).\n" +
    "• Medicines are for the doctor; for information: oral steroids help for a few weeks with no effect after six (Buchbinder 2006), and anti-inflammatories did not beat physiotherapy (Berner 2024).\n" +
    "• Prayer and ablution: no study has measured the shoulder range they need (a documented zero result) — their card is in the phases, and religious rulings are for the patient and his or her own religious authority.",
  ],
  //  ٢٤ جلسة × ستّ في الأسبوع = أربعةُ أسابيع — اختيارُ خدمة: التجاربُ ٦–٣٠ جلسة بمعدّل ٢–٣ في الأسبوع غالباً، ولم يرتبط العددُ ولا التواترُ بالنتيجة.
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "Shoulder pain and mobility deficits: adhesive capsulitis — clinical practice guidelines", org: "JOSPT / APTA Orthopaedic Section (Kelley et al.)", year: 2013, url: "https://doi.org/10.2519/jospt.2013.0302" },
    { title: "British Elbow and Shoulder Society patient care pathway: Frozen shoulder", org: "Shoulder & Elbow — British Elbow and Shoulder Society, BESS (Rupani et al.)", year: 2025, url: "https://doi.org/10.1177/17585732251335955" },
    { title: "Frozen shoulder — BESS/BOA patient care pathway", org: "Shoulder & Elbow — BESS/BOA (Rangan et al.)", year: 2015, url: "https://doi.org/10.1177/1758573215601779" },
    { title: "An international consensus on the etiology, risk factors, diagnosis and Management for individuals with Frozen Shoulder: a Delphi study", org: "J Man Manip Ther (Salamh et al.)", year: 2025, url: "https://doi.org/10.1080/10669817.2025.2470461" },
    { title: "Physiotherapy for primary frozen shoulder in secondary care: Developing and implementing stand-alone and post operative protocols for UK FROST and inferences for wider practice", org: "Physiotherapy (Hanchard et al.)", year: 2020, url: "https://doi.org/10.1016/j.physio.2019.07.004" },
    { title: "Management of adults with primary frozen shoulder in secondary care (UK FROST): a multicentre, pragmatic, three-arm, superiority randomised clinical trial", org: "Lancet (Rangan et al.)", year: 2020, url: "https://doi.org/10.1016/S0140-6736(20)31965-6" },
    { title: "Delivery of Physiotherapy and effect on patient outcomes: A secondary data analysis of the Early Structured Physiotherapy programme of the UK FROST Trial", org: "NIHR Open Research (Okanlawon et al.)", year: 2026, url: "https://doi.org/10.3310/nihropenres.14291.1" },
    { title: "Manual therapy and exercise for adhesive capsulitis (frozen shoulder)", org: "Cochrane Database Syst Rev (Page et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.CD011275" },
    { title: "Electrotherapy modalities for adhesive capsulitis (frozen shoulder)", org: "Cochrane Database Syst Rev (Page et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.CD011324" },
    { title: "Comparison of Treatments for Frozen Shoulder: A Systematic Review and Meta-analysis", org: "JAMA Netw Open (Challoumas et al.)", year: 2020, url: "https://doi.org/10.1001/jamanetworkopen.2020.29581" },
    { title: "What is the most effective treatment for frozen shoulder?", org: "BMJ (Rangan et al.)", year: 2016, url: "https://doi.org/10.1136/bmj.i4162" },
    { title: "Adhesive capsulitis of the shoulder and diabetes: a meta-analysis of prevalence", org: "Muscles Ligaments Tendons J (Zreik et al.)", year: 2016, url: "https://doi.org/10.11138/mltj/2016.6.1.026" },
    { title: "Analytical Observational Study of Frozen Shoulder among Patients with Diabetes Mellitus", org: "Joints (Alhashimi et al.)", year: 2018, url: "https://doi.org/10.1055/s-0038-1676105" },
    { title: "Long-term outcome of frozen shoulder", org: "J Shoulder Elbow Surg (Hand et al.)", year: 2008, url: "https://doi.org/10.1016/j.jse.2007.05.009" },
    { title: "Natural history of frozen shoulder: fact or fiction? A systematic review", org: "Physiotherapy (Wong et al.)", year: 2017, url: "https://doi.org/10.1016/j.physio.2016.05.009" },
    { title: "Joint mobilization versus self-exercises for limited glenohumeral joint mobility: randomized controlled study of management of rehabilitation", org: "Clin Rheumatol (Tanaka et al.)", year: 2010, url: "https://doi.org/10.1007/s10067-010-1525-0" },
    { title: "Gentle thawing of the frozen shoulder: a prospective study of supervised neglect versus intensive physical therapy in seventy-seven patients with frozen shoulder syndrome followed up for two years", org: "J Shoulder Elbow Surg (Diercks et al.)", year: 2004, url: "https://doi.org/10.1016/j.jse.2004.03.002" },
    { title: "Matrix metalloproteinase, tissue inhibitor of metalloproteinase and transforming growth factor-beta 1 in frozen shoulder, and their changes as response to intensive stretching and supervised neglect exercise", org: "J Orthop Sci (Lubis et al.)", year: 2013, url: "https://doi.org/10.1007/s00776-013-0387-0" },
    { title: "The effect of anterior versus posterior glide joint mobilization on external rotation range of motion in patients with shoulder adhesive capsulitis", org: "J Orthop Sports Phys Ther (Johnson et al.)", year: 2007, url: "https://doi.org/10.2519/jospt.2007.2307" },
    { title: "Mobilization techniques in subjects with frozen shoulder syndrome: randomized multiple-treatment trial", org: "Phys Ther (Yang et al.)", year: 2007, url: "https://doi.org/10.2522/ptj.20060295" },
    { title: "Evalution of Mulligan's technique for adhesive capsulitis of the shoulder", org: "J Rehabil Med (Doner et al.)", year: 2013, url: "https://doi.org/10.2340/16501977-1064" },
    { title: "Comparison of high-grade and low-grade mobilization techniques in the management of adhesive capsulitis of the shoulder: randomized controlled trial", org: "Phys Ther (Vermeulen et al.)", year: 2006, url: "https://doi.org/10.1093/ptj/86.3.355" },
    { title: "Proprioceptive neuromuscular facilitation techniques in adhesive capsulitis: a systematic review and meta-analysis", org: "J Musculoskelet Neuronal Interact (Tedla et al.)", year: 2019, url: "https://pubmed.ncbi.nlm.nih.gov/31789299/" },
    { title: "Comparison of the outcomes of two different exercise programs on frozen shoulder", org: "Acta Orthop Traumatol Turc (Celik et al.)", year: 2010, url: "https://doi.org/10.3944/AOTT.2010.2367" },
    { title: "Comparison of glenohumeral and subacromial steroid injection in primary frozen shoulder: a prospective, randomized short-term comparison study", org: "J Shoulder Elbow Surg (Oh et al.)", year: 2011, url: "https://doi.org/10.1016/j.jse.2011.04.029" },
    { title: "Idiopathic adhesive capsulitis. A prospective functional outcome study of nonoperative treatment", org: "J Bone Joint Surg Am (Griggs et al.)", year: 2000, url: "https://doi.org/10.2106/00004623-200010000-00005" },
    { title: "Effect of radial extracorporeal shockwave therapy combined with evidence-based physical therapy for adhesive capsulitis of the shoulder: A randomized controlled trial", org: "Saudi Med J (Sharahili et al.)", year: 2025, url: "https://doi.org/10.15537/smj.2025.46.7.20250213" },
    { title: "Efficacy of extracorporeal shockwave therapy in frozen shoulder", org: "Int J Prev Med (Vahdatpour et al.)", year: 2014, url: "https://pubmed.ncbi.nlm.nih.gov/25104999/" },
    { title: "Effectiveness of radial extracorporeal shock-wave therapy versus ultrasound-guided low-dose intra-articular steroid injection in improving shoulder pain, function, and range of motion in diabetic patients with shoulder adhesive capsulitis", org: "J Shoulder Elbow Surg (El Naggar et al.)", year: 2020, url: "https://doi.org/10.1016/j.jse.2020.03.005" },
    { title: "Extracorporeal Shockwave Therapy as an Adjunctive Therapy for Frozen Shoulder: A Systematic Review and Meta-analysis", org: "Orthop J Sports Med (Zhang et al.)", year: 2022, url: "https://doi.org/10.1177/23259671211062222" },
    { title: "Comparative Efficacy and Patient-Specific Moderating Factors of Nonsurgical Treatment Strategies for Frozen Shoulder: An Updated Systematic Review and Network Meta-analysis", org: "Am J Sports Med (Zhang et al.)", year: 2021, url: "https://doi.org/10.1177/0363546520956293" },
    { title: "Extracorporeal Shock Wave Therapy for Chronic Adhesive Capsulitis in Type 2 Diabetics: A Systematic Review With Meta-Analysis", org: "Phys Ther (Reno et al.)", year: 2025, url: "https://doi.org/10.1093/ptj/pzaf074" },
    { title: "Low-power laser treatment in patients with frozen shoulder: preliminary results", org: "Photomed Laser Surg (Stergioulas et al.)", year: 2008, url: "https://doi.org/10.1089/pho.2007.2138" },
    { title: "Effectiveness of high-intensity laser therapy in the treatment of patients with frozen shoulder: a systematic review and meta-analysis", org: "Lasers Med Sci (de la Barra Ortiz et al.)", year: 2023, url: "https://doi.org/10.1007/s10103-023-03901-3" },
    { title: "Effectiveness of therapeutic ultrasound in adhesive capsulitis", org: "Joint Bone Spine (Dogru et al.)", year: 2008, url: "https://doi.org/10.1016/j.jbspin.2007.07.016" },
    { title: "Does ultrasound therapy add to the effects of exercise and mobilization in frozen shoulder? A pilot randomized double-blind clinical trial", org: "J Bodyw Mov Ther (Ebadi et al.)", year: 2017, url: "https://doi.org/10.1016/j.jbmt.2016.11.013" },
    { title: "Efficacy of therapeutic ultrasound in treatment of adhesive capsulitis: A prospective double blind placebo-controlled randomized trial", org: "J Back Musculoskelet Rehabil (Balci et al.)", year: 2018, url: "https://doi.org/10.3233/BMR-150482" },
    { title: "Interventions associated with an increased or decreased likelihood of pain reduction and improved function in patients with adhesive capsulitis: a retrospective cohort study", org: "Phys Ther (Jewell et al.)", year: 2009, url: "https://doi.org/10.2522/ptj.20080250" },
    { title: "Effects of deep and superficial heating in the management of frozen shoulder", org: "J Rehabil Med (Leung et al.)", year: 2008, url: "https://doi.org/10.2340/16501977-0146" },
    { title: "Impact of TECAR therapy on pain and function in adhesive capsulitis: a randomized controlled trial", org: "Lasers Med Sci (Uzun et al.)", year: 2025, url: "https://doi.org/10.1007/s10103-025-04492-x" },
    { title: "Effect of Transfer Energy Capacitive and Resistive Therapy on Shoulder Pain, Disability, and Passive Range of Motion in Patients With Shoulder Adhesive Capsulitis: A Preliminary Randomized Trial", org: "J Chiropr Med (Raeisi et al.)", year: 2025, url: "https://doi.org/10.1016/j.jcm.2025.09.015" },
    { title: "Electromagnetic treatment of shoulder periarthritis: a randomized controlled trial of the efficiency and tolerance of magnetotherapy", org: "Arch Phys Med Rehabil (Leclaire et al.)", year: 1991, url: "https://pubmed.ncbi.nlm.nih.gov/2009043/" },
    { title: "Short-term effect of myofascial trigger point dry-needling in patients with Adhesive Capsulitis", org: "J Bodyw Mov Ther (Kalia et al.)", year: 2021, url: "https://doi.org/10.1016/j.jbmt.2020.10.014" },
    { title: "Trigger point dry needling as an adjunct treatment for a patient with adhesive capsulitis of the shoulder", org: "J Orthop Sports Phys Ther (Clewley et al.)", year: 2014, url: "https://doi.org/10.2519/jospt.2014.4915" },
    { title: "Effectiveness of electroacupuncture and interferential eloctrotherapy in the management of frozen shoulder", org: "J Rehabil Med (Cheing et al.)", year: 2008, url: "https://doi.org/10.2340/16501977-0142" },
    { title: "Continuous passive motion provides good pain control in patients with adhesive capsulitis", org: "Int J Rehabil Res (Dundar et al.)", year: 2009, url: "https://doi.org/10.1097/MRR.0b013e3283103aac" },
    { title: "Continuous passive motion in adhesive capsulitis patients with diabetes mellitus: A randomized controlled trial", org: "J Back Musculoskelet Rehabil (Ekim et al.)", year: 2016, url: "https://doi.org/10.3233/BMR-160689" },
    { title: "Is there any advantage between using continuous passive motion and conventional physical therapy in patients with primary adhesive capsulitis?: A systematic review and meta-analysis", org: "J Bodyw Mov Ther (Baradaran et al.)", year: 2023, url: "https://doi.org/10.1016/j.jbmt.2023.06.005" },
    { title: "Effectiveness of sustained stretching of the inferior capsule in the management of a frozen shoulder", org: "Clin Orthop Relat Res (Paul et al.)", year: 2014, url: "https://doi.org/10.1007/s11999-014-3581-2" },
    { title: "Effects of two different mobilization techniques on pain, range of motion and functional disability in patients with adhesive capsulitis: a comparative study", org: "J Phys Ther Sci (Agarwal et al.)", year: 2016, url: "https://doi.org/10.1589/jpts.28.3342" },
    { title: "Robot-assisted rehabilitation therapy for adhesive capsulitis: A pilot randomized controlled trial on clinical and patient-reported outcomes", org: "Medicine (Baltimore) (Ryu et al.)", year: 2026, url: "https://doi.org/10.1097/MD.0000000000050120" },
    { title: "Responsiveness of the numeric pain rating scale in patients with shoulder pain and the effect of surgical status", org: "J Sport Rehabil (Michener et al.)", year: 2011, url: "https://doi.org/10.1123/jsr.20.1.115" },
    { title: "Measuring shoulder function: a systematic review of four questionnaires", org: "Arthritis Rheum (Roy et al.)", year: 2009, url: "https://doi.org/10.1002/art.24396" },
    { title: "Range of shoulder motion in patients with adhesive capsulitis; intra-tester reproducibility is acceptable for group comparisons", org: "BMC Musculoskelet Disord (Tveitå et al.)", year: 2008, url: "https://doi.org/10.1186/1471-2474-9-49" },
    { title: "Responsiveness of the shoulder pain and disability index in patients with adhesive capsulitis", org: "BMC Musculoskelet Disord (Tveitå et al.)", year: 2008, url: "https://doi.org/10.1186/1471-2474-9-161" },
    { title: "Cross-cultural adaptation and psychometric properties of an Arabic version of the Shoulder Pain and Disability Index", org: "Int J Rehabil Res (Alsanawi et al.)", year: 2015, url: "https://doi.org/10.1097/MRR.0000000000000118" },
    { title: "Internal consistency, test-retest reliability, and construct validity of the adapted Arabic version of the Oxford shoulder score in patients with shoulder disorders", org: "Disabil Rehabil (Alsanawi et al.)", year: 2021, url: "https://doi.org/10.1080/09638288.2020.1714757" },
    { title: "Determination and comparison of the smallest detectable change (SDC) and the minimal important change (MIC) of four-shoulder patient-reported outcome measures (PROMs)", org: "J Orthop Surg Res (van Kampen et al.)", year: 2013, url: "https://doi.org/10.1186/1749-799X-8-40" },
    { title: "Validity and reliability of the Arabic quick disabilities of the arm, Shoulder and Hand (QuickDASH-Arabic)", org: "Musculoskelet Sci Pract (Alnahdi et al.)", year: 2021, url: "https://doi.org/10.1016/j.msksp.2021.102372" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "Interobserver and intraobserver reliability of the measurement of shoulder internal rotation by vertebral level", org: "J Shoulder Elbow Surg (Edwards et al.)", year: 2002, url: "https://doi.org/10.1067/mse.2002.119853" },
    { title: "Intra- and inter-rater reliability of a modified measure of hand behind back range of motion", org: "Man Ther (van den Dolder et al.)", year: 2014, url: "https://doi.org/10.1016/j.math.2013.08.002" },
    { title: "The reliability and concurrent validity of shoulder mobility measurements using a digital inclinometer and goniometer: a technical report", org: "Int J Sports Phys Ther (Kolber et al.)", year: 2012, url: "https://pubmed.ncbi.nlm.nih.gov/22666645/" },
    { title: "The diagnostic value of physical examination tests in adhesive capsulitis: a systematic review", org: "Eur J Phys Rehabil Med (Schiltz et al.)", year: 2023, url: "https://doi.org/10.23736/S1973-9087.23.07940-6" },
    { title: "Locked posterior dislocation of the shoulder: A systematic review", org: "EFORT Open Rev (Basal et al.)", year: 2018, url: "https://doi.org/10.1302/2058-5241.3.160089" },
    { title: "Pancoast Tumor: The Overlooked Etiology of Shoulder Pain in Smokers", org: "Am J Case Rep (Al Shammari et al.)", year: 2020, url: "https://doi.org/10.12659/AJCR.926643" },
    { title: "Routine X-rays for suspected frozen shoulder offer little over diagnosis based on history and clinical examination alone", org: "Musculoskeletal Care (Roberts et al.)", year: 2019, url: "https://doi.org/10.1002/msc.1396" },
    { title: "Tumors masked as frozen shoulders: a retrospective analysis", org: "J Shoulder Elbow Surg (Sano et al.)", year: 2010, url: "https://doi.org/10.1016/j.jse.2009.05.010" },
    { title: "Suprascapular nerve block for the treatment of adhesive capsulitis: a randomised double-blind placebo-controlled trial", org: "RMD Open (Shanahan et al.)", year: 2022, url: "https://doi.org/10.1136/rmdopen-2022-002648" },
    { title: "Blood Glucose Levels Following Intra-Articular Steroid Injections in Patients with Diabetes: A Systematic Review", org: "JBJS Rev (Choudhry et al.)", year: 2016, url: "https://doi.org/10.2106/JBJS.RVW.O.00029" },
    { title: "Diabetes as a Prognostic Factor in Frozen Shoulder: A Systematic Review", org: "Arch Rehabil Res Clin Transl (Dyer et al.)", year: 2021, url: "https://doi.org/10.1016/j.arrct.2021.100141" },
    { title: "Oral steroids for adhesive capsulitis", org: "Cochrane Database Syst Rev (Buchbinder et al.)", year: 2006, url: "https://doi.org/10.1002/14651858.CD006189" },
    { title: "Pharmacological interventions for early-stage frozen shoulder: a systematic review and network meta-analysis", org: "Rheumatology (Oxford) (Berner et al.)", year: 2024, url: "https://doi.org/10.1093/rheumatology/keae176" },
    { title: "Defining functional shoulder range of motion for activities of daily living", org: "J Shoulder Elbow Surg (Namdari et al.)", year: 2012, url: "https://doi.org/10.1016/j.jse.2011.07.032" },
    { title: "Shoulder and elbow range of motion for the performance of activities of daily living: A systematic review", org: "Physiother Theory Pract (Oosterwijk et al.)", year: 2018, url: "https://doi.org/10.1080/09593985.2017.1422206" },
    { title: "Association of psychological factors and sleep quality with activity-related pain and disability in individuals with frozen shoulder", org: "Musculoskelet Sci Pract (Fonseca et al.)", year: 2025, url: "https://doi.org/10.1016/j.msksp.2025.103366" },
    { title: "Impact of adhesive capsulitis and economic evaluation of high-grade and low-grade mobilisation techniques", org: "Aust J Physiother (van den Hout et al.)", year: 2005, url: "https://doi.org/10.1016/s0004-9514(05)70020-9" },
    { title: "Electrophysical agents — contraindications and precautions: an evidence-based approach to clinical decision making in physical therapy", org: "Physiotherapy Canada (Physiotherapy Canada 2010 — evidence-based document)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — تبدأ بتقدير الحساسية (الألمُ وعلاقتُه بالمدى)، ثمّ التحريكُ المفصليّ بيد الأخصائيّ بدرجةٍ تتبعها (الانزلاقُ الخلفيّ للدوران الخارجيّ — Johnson 2007: ستُّ جلساتٍ زاد بها الدورانُ ٣١° مقابل ٣° للأماميّ؛ والتحريكُ بنهاية المدى ومع الحركة في المتوسّطة والمنخفضة — Yang 2007 · Vermeulen 2006)، ثمّ المدى والتمطيطُ والتقويةُ بالبطاقات، ثمّ مراجعةُ البرنامج المنزليّ اليوميّ.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — starting with an irritability check (pain and how it relates to range), then therapist-applied joint mobilisation at a matching grade (the posterior glide for external rotation — Johnson 2007: six sessions gained 31° versus 3° with the anterior glide; end-range mobilisation and mobilisation with movement at moderate and low irritability — Yang 2007 · Vermeulen 2006), then range, stretching and strengthening with the cards, then a review of the daily home programme."],
      note: ["أساسيٌّ في كلّ جلسة — JOSPT 2013: التمطيطُ بحسب الحساسية والتثقيفُ (B)، والتحريكُ المفصليّ (C)؛ وBESS 2025: العلاجُ بعد الحقنة «مشروطٌ» لصالحه، ووحدَه «محايد» أمام المسار الطبيعيّ، والحضوريُّ أمام المنزليّ «محايد»؛ والخبراءُ الدوليّون: التحريكُ اليدويّ نافعٌ في التيبّس (٨٥٪) لا في المرحلة المؤلمة (Salamh 2025)؛ وفي UK FROST كان التحريكُ والبرنامجُ المنزليّ المتدرّج من البندول إلى التمطيط الحازم إلزاميّين (Hanchard 2020). وكوكرين: التحريكُ والتمرينُ ستّةَ أسابيع أقلُّ نفعاً من الحقنة عند الأسبوع السابع (Page 2014) — فالحقنةُ تُقترح معه لا بدلَه. والتجاربُ ٦–٣٠ جلسة، ولم يرتبط عددُها بالنتيجة (Okanlawon 2026 — قبل التحكيم).",
        "Core in every session — JOSPT 2013: stretching matched to irritability and education (B), and joint mobilisation (C); BESS 2025: physiotherapy after injection is a conditional recommendation, alone it is 'neutral' against the natural course, and in-person versus home-led is 'neutral'; international experts: manual therapy helps in the stiff stage (85%) but not the painful stage (Salamh 2025); in UK FROST mobilisation and a home programme graded from pendulum to firm stretching were mandatory (Hanchard 2020). Cochrane: six weeks of mobilisation and exercise helped less than injection at week 7 (Page 2014) — so injection is suggested alongside, not instead. Trials used 6–30 sessions, and the number was not linked to the outcome (Okanlawon 2026 — not yet peer reviewed)."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على الكتف من الأمام والخلف في جلوسٍ مريح أو استلقاء والذراعُ مسنودةٌ على وسادة، قبل التمرين لتسهيله لا بدله؛ ويُفحص الإحساسُ بالحرارة قبلها — وعند كلّ سكّريّ.",
        "Over the front and back of the shoulder, sitting comfortably or lying with the arm supported on a pillow, before exercise to ease it, never instead of it; thermal sensation is tested first — in every diabetic patient."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمطيط: في تجربةٍ صغيرة لم تُضف الحرارةُ السطحية إلى التمطيط شيئاً (Leung 2008: ٦٣° عشرين دقيقة ثلاثاً في الأسبوع)، والخبراءُ الدوليّون رأوها غيرَ نافعةٍ في المرحلة المؤلمة (Salamh 2025)، ويذكرها JOSPT 2013 لتهدئة الألم في الحساسية العالية. ممنوعةٌ مع ضعف الإحساس أو اضطراب الدورة أو التهابٍ حادّ في المفصل أو ورم.",
        "Rotating adjunct — for comfort before stretching: in a small trial superficial heat added nothing to stretching (Leung 2008: 63 °C for 20 minutes three times a week), international experts rated it ineffective in the painful stage (Salamh 2025), and JOSPT 2013 lists it for pain modulation at high irritability. Contraindicated with impaired sensation, poor circulation, acute joint inflammation or a tumour."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP → RES", durationMin: "10–15" },
      parameters: ["على الكتف من الأمام والخلف قبل التمطيط مباشرةً في الحساسية المتوسّطة والمنخفضة (التيبّسُ غالب) بدفءٍ مريح — بالنمط السعويّ ثمّ المقاوِم ١٠–١٥ دقيقة، ثمّ التمطيطُ والتحريكُ والنسيجُ دافئ. وفي التجارب: ستُّ جلساتٍ في أسبوعين (Uzun 2025)، وعشرُ دقائق بالنمط المقاوِم (Raeisi 2025)؛ والحرارةُ العميقة بالموجات القصيرة عشرين دقيقة ثلاثاً في الأسبوع (Leung 2008).",
        "Over the front and back of the shoulder immediately before stretching at moderate and low irritability (stiffness-predominant), at comfortable warmth — capacitive then resistive mode for 10–15 minutes, then stretching and mobilisation while the tissue is warm. In trials: six sessions over two weeks (Uzun 2025), and 10 minutes in resistive mode (Raeisi 2025); deep heating with shortwave diathermy for 20 minutes three times a week (Leung 2008)."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم)، والدليلُ ضعيفٌ متضارب: الحرارةُ العميقة قبل التمطيط أفضلُ من السطحية في التيبّس (Leung 2008، ثلاثون مريضاً)، وJOSPT 2013 يذكر الموجاتِ القصيرة مع التمرين (C)؛ وتجربتان صغيرتان للتيكار: إحداهما أفادت الألمَ وSPADI (Uzun 2025) والأخرى لم تجد فرقاً (Raeisi 2025)؛ والخبراءُ البريطانيّون لم يشجّعوا الموجاتِ القصيرة في التيبّس (Hanchard 2020). ممنوعٌ مع منظّم ضربات القلب أو معدنٍ مزروع في المنطقة أو الحمل أو ورم أو جلدٍ لا يحسّ الحرارة.",
        "Rotating adjunct by the centre's rule (Saleem), with weak and conflicting evidence: deep heat before stretching beat superficial heat in the stiff stage (Leung 2008, thirty patients), and JOSPT 2013 lists shortwave diathermy with exercise (C); two small Tecar trials: one improved pain and SPADI (Uzun 2025) and the other found no difference (Raeisi 2025); UK experts discouraged shortwave diathermy in the stiffness-predominant stage (Hanchard 2020). Contraindicated with a pacemaker, a metal implant in the area, pregnancy, a tumour or skin that cannot feel heat."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 20,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "100–150", intensity: "Sensory", durationMin: "15–20" },
      parameters: ["تحفيزٌ عبر الجلد تقليديّ (Conventional TENS) لتهدئة الألم قبل التمرين في الحساسية العالية والمتوسّطة: الأقطابُ حول الكتف من الأمام والخلف، بوخزٍ قويٍّ مريح بلا انقباض — ويُقال للمريض إنّه يسكّن ولا يعالج. وفي التجارب: التيارُ المتداخل مع التمرين عشرَ جلساتٍ في أربعة أسابيع (Cheing 2008).",
        "Conventional TENS to settle pain before exercise at high and moderate irritability: electrodes around the front and back of the shoulder, at a strong but comfortable tingling with no contraction — the patient is told it relieves but does not treat. In trials: interferential current with exercise, ten sessions over four weeks (Cheing 2008)."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — يذكره JOSPT 2013 مع التمرين (C) ولتهدئة الألم في الحساسية العالية، وتحسّن معه التمرينُ أكثرَ من عدم العلاج (Cheing 2008)؛ لكنّ الخبراءَ الدوليّين أجمعوا أنّه غيرُ نافعٍ في المرحلتين (Salamh 2025)، والبريطانيّين منعوا التيارَ المتداخل في التيبّس الغالب (Hanchard 2020)، وكوكرين: غيرُ مؤكَّد (Page 2014). فلا يُعطى وحده ولا في التيبّس الغالب (المرحلة الثالثة) — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو على جلدٍ ضعيف الإحساس أو ورم (Physiotherapy Canada 2010).",
        "Rotating adjunct by the centre's rule (Saleem) — JOSPT 2013 lists it with exercise (C) and for pain modulation at high irritability, and exercise with it improved more than no treatment (Cheing 2008); but international experts agreed it is ineffective in both stages (Salamh 2025), UK experts barred interferential in the stiffness-predominant stage (Hanchard 2020), and Cochrane rates it uncertain (Page 2014). So never alone and not in the stiffness-predominant stage (phase 3) — and an item for Saleem. Contraindicated with a pacemaker, over skin with poor sensation, or over a tumour (Physiotherapy Canada 2010)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) على الكتف قبل التمرين، بلا حرارة — ببرنامج الجهاز في المركز، يكتب المشرفُ إعداداته من جهازه.",
        "Pulsed electromagnetic field (PEMF) over the shoulder before exercise, non-thermal — on the centre device's programme, with the settings entered by the supervisor from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم)، والدليلُ ضدّه أو ضعيفٌ جدّاً: أفضلُ تجربة (ثلاثيةُ التعمية، ٤٧ مريضاً، مع الحرارة والتمطيط والبكرة ثلاثاً في الأسبوع) لم تجد له فائدةً في الألم ولا المدى ولا الوظيفة (Leclaire 1991)، وتجربةٌ أخرى صغيرةٌ جدّاً ضعيفةُ الجودة (كوكرين — Page 2014)؛ ولا تذكره الإرشادات — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو الحمل.",
        "Adjunct by the centre's rule (Saleem), with evidence against it or very weak: the best trial (triple-blind, 47 patients, with heat, stretching and pulley three times a week) found no benefit in pain, range or function (Leclaire 1991), and another very small low-quality trial (Cochrane — Page 2014); guidelines do not address it — and an item for Saleem. Contraindicated with a pacemaker or pregnancy."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 2, times: 6,
      params: { points: "Trigger points that reproduce the familiar shoulder pain", sessions: "6" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، يوماً بعد يوم ستَّ مرّات (كما في Kalia 2021 مع العلاج الطبيعيّ اثني عشرَ يوماً): النقاطُ الزنادية التي تعيد ألمَ الكتف المألوف في عضلات الكفّة المدوّرة والدالية وشبه المنحرفة العليا والصدرية الكبرى؛ ولا وخزَ عميقاً فوق القفص الصدريّ.",
        "Dry-needling certified staff only, every other day six times (as in Kalia 2021 alongside twelve days of physiotherapy): trigger points that reproduce the familiar shoulder pain in the rotator cuff, deltoid, upper trapezius and pectoralis major; no deep needling over the rib cage."],
      note: ["مساعدٌ بموعدٍ دوريّ — لا تجربةَ عشوائية للإبر الجافّة في الكتف المتجمّد (بحثٌ صفريّ مكتوب): دراسةٌ واحدة بلا مجموعة مقارنة تحسّن فيها الألمُ والمدى وSPADI (Kalia 2021)، وتقريرُ حالة (Clewley 2014)؛ ولا تذكرها الإرشادات — وبندٌ لسليم. ممنوعٌ مع مميّعات الدم واضطراب التخثّر ورهاب الإبر والورم أو الالتهاب الموضعيّ.",
        "Adjunct on a periodic schedule — there is no randomised trial of dry needling in frozen shoulder (a documented zero result): one uncontrolled study in which pain, range and SPADI improved (Kalia 2021), and a case report (Clewley 2014); guidelines do not address it — and an item for Saleem. Contraindicated with anticoagulants or clotting disorders, needle phobia, and local tumour or infection."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسها: على الكتف، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the shoulder, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريحٌ لا أكثر: لا تجربةَ تعزل الأشعّةَ تحت الحمراء في الكتف المتجمّد (بحثٌ صفريّ مكتوب)، وظهرت ضمن حزمٍ علاجية في تجارب أخرى (Challoumas 2020)؛ لا يُعطى وحده.",
        "Rotating adjunct — comfortable warmth only: no trial isolates infrared in frozen shoulder (a documented zero result), and it appears only within treatment packages in other trials (Challoumas 2020); never given alone."] },
    { code: "shockwaves", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 4,
      parameters: ["مرّةً في الأسبوع أربعَ جلسات (٤–٦ في التجارب)، على المحفظة من الأمام والخلف، مع التمرين دائماً لا بدله، والأنسبُ في الحساسية العالية والمتوسّطة وعند السكّريّين؛ ولا يؤخّر الإحالةَ للحقنة. " +
        "وفي التجارب: الشعاعيُّ ١٫٨ بار بتردّد ٣–٦ هرتز حتى ٢٠٠٠ نبضة أسبوعياً × ٦ مع العلاج الطبيعيّ (Sharahili 2025)، والمركّزُ ٠٫١–٠٫٣ مللي جول/مم² نحو ١٢٠٠ نبضة أسبوعياً × ٤ (Vahdatpour 2014)، وعند السكّريّين أربعُ جلساتٍ شعاعية أسبوعية تفوّقت على الحقنة في الوظيفة والألم عند ١٢ أسبوعاً (El Naggar 2020). " +
        "والإعداداتُ (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز في خاناتها — يملؤها المشرفُ قبل الاعتماد؛ فقيمُ الأدبيات لا تنتقل بين جهازٍ وآخر.",
        "Once a week for four sessions (4–6 in trials), over the front and back of the capsule, always with exercise, never instead of it, best suited to high and moderate irritability and to diabetic patients; it does not delay referral for injection. " +
        "In trials: radial 1.8 bar at 3–6 Hz with up to 2000 impulses weekly × 6 alongside physiotherapy (Sharahili 2025), focused 0.1–0.3 mJ/mm² with about 1200 impulses weekly × 4 (Vahdatpour 2014), and in diabetic patients four weekly radial sessions beat injection for function and pain at 12 weeks (El Naggar 2020). " +
        "The settings (type, intensity, frequency, impulses) come from the centre's own device, in their fields — the supervisor fills them before approval, since published values do not transfer between devices."],
      note: ["مساعدٌ بموعدٍ أسبوعيّ لا في كلّ جلسة — أقوى الأجهزة دليلاً في الكتف المتجمّد: تحليلٌ لعشرين تجربة وجد تخفيفاً للألم فورياً وقصيرَ المدى وتحسّناً في الوظيفة (Zhang 2022)، ورتّبته شبكةُ المقارنات الأعلى للوظيفة (Zhang 2021)، وتجاربُ السكّريّين إيجابية (Reno 2025)؛ والجودةُ منخفضة والتجاربُ صغيرة، وفي السكّريّ غير المضبوط كانت الاستجابةُ ضعيفة (Vahdatpour 2014). ولا تذكره JOSPT 2013 ولا BESS 2025، والخبراءُ البريطانيّون منعوه في التيبّس الغالب ولم يشجّعوه في المؤلم (Hanchard 2020) — وبندٌ لسليم. " +
        "الموانع (نشرةُ الشركة وISMST): مضادّاتُ التخثّر واضطراباتُ النزف، والحمل، وورمٌ أو التهابٌ أو جرحٌ في موضع العلاج، ومنظّمُ ضربات القلب، وموضعُ حقنة كورتيزون حديثة.",
        "Adjunct on a weekly schedule, not every session — the device with the strongest evidence in frozen shoulder: a meta-analysis of twenty trials found immediate and short-term pain relief and better function (Zhang 2022), a network meta-analysis ranked it highest for function (Zhang 2021), and trials in diabetic patients were positive (Reno 2025); quality is low and trials are small, and response was poor in uncontrolled diabetes (Vahdatpour 2014). Neither JOSPT 2013 nor BESS 2025 mentions it, and UK experts barred it in the stiffness-predominant stage and discouraged it in the painful stage (Hanchard 2020) — and an item for Saleem. " +
        "Contraindications (manufacturer's leaflet and ISMST): anticoagulants and bleeding disorders, pregnancy, a tumour, infection or wound at the site, a pacemaker, and the site of a recent steroid injection."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — الدليلُ للألم لا للمدى: مع التمرين خفّف الألمَ وحسّن الوظيفة أكثرَ من الوهميّ (Stergioulas 2008: ٨١٠ نانومتر، ٦٠ ميلي واط، ١٫٨ جول لكلّ نقطة على ٨ نقاط، ١٢ جلسة في ٨ أسابيع — جودةٌ متوسّطة عند كوكرين)، والليزرُ عالي الشدّة خفّف الألمَ دون المدى (de la Barra Ortiz 2023)؛ لكنّ الخبراءَ البريطانيّين منعوه في كلّ الأحوال (Hanchard 2020).",
        "Not used until Saleem decides — the evidence is for pain, not range: with exercise it reduced pain and improved function more than placebo (Stergioulas 2008: 810 nm, 60 mW, 1.8 J per point over 8 points, 12 sessions over 8 weeks — moderate quality in Cochrane), and high-intensity laser reduced pain but not range (de la Barra Ortiz 2023); but UK experts barred it in all contexts (Hanchard 2020)."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — وله دليلٌ صغير: ساعةٌ يومياً عشرين يوماً خفّفت الألمَ أكثرَ من التمارين المعتادة (Dundar 2009)، وعند السكّريّين كذلك (Ekim 2016)، وتحليلٌ لخمس تجارب: أفضلُ للألم والعطف لا للدوران ولا SPADI، «والكلفةُ والوقتُ يُحسبان» (Baradaran 2023). يصلح إن كان في المركز جهازٌ للكتف، في المدى غير المؤلم.",
        "Not used until Saleem decides — with small supporting evidence: one hour a day for twenty days reduced pain more than usual exercise (Dundar 2009), likewise in diabetic patients (Ekim 2016), and a meta-analysis of five trials: better for pain and flexion but not rotation or SPADI, 'extra cost and time must be considered' (Baradaran 2023). Suitable if the centre has a shoulder unit, within the pain-free range."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — ثلاثُ تجاربَ مقارنةٍ بالوهميّ لم تجد له فائدةً مضافة (Dogru 2008 · Ebadi 2017 · Balci 2018)، والخبراءُ البريطانيّون لم يشجّعوه في كلّ الأحوال (Hanchard 2020)، والدوليّون أجمعوا أنّه غيرُ نافع (Salamh 2025)، وارتبط استعمالُه بتحسّنٍ أقلّ (Jewell 2009) — وإن ذكره JOSPT 2013 (C).",
        "Not used — three sham-controlled trials found no added benefit (Dogru 2008 · Ebadi 2017 · Balci 2018), UK experts discouraged it in all contexts (Hanchard 2020), international experts agreed it is ineffective (Salamh 2025), and its use was linked to less improvement (Jewell 2009) — although JOSPT 2013 lists it (C)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — جهازُ الشدّ في المركز للفقرات لا للكتف؛ والتجربةُ الوحيدة بجهازٍ خاصّ بالكتف (تمطيطٌ مستمرّ للمحفظة السفلى عشرين دقيقة يومياً أسبوعين — Paul 2014) لا تنطبق عليه؛ والشدُّ اليدويّ للمفصل جزءٌ من التحريك بيد الأخصائيّ (Agarwal 2016).",
        "Not used — the centre's traction unit is for the spine, not the shoulder; the only trial used a dedicated shoulder apparatus (sustained inferior-capsule stretch for 20 minutes a day for two weeks — Paul 2014), which does not apply to it; manual joint distraction is part of therapist-applied mobilisation (Agarwal 2016)."] },
    { code: "wax", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الشمعُ لليد والرسغ لا للكتف، ولا تجربةَ في الكتف المتجمّد (بحثٌ صفريّ مكتوب)، والكمادةُ تؤدّي ما يؤدّيه.", "Not used — paraffin is for the hand and wrist, not the shoulder, there is no trial in frozen shoulder (a documented zero result), and the hot pack does the same job."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تورّمَ يُعالَج ولا تجربةَ في الكتف المتجمّد (بحثٌ صفريّ مكتوب).", "Not used — there is no swelling to treat and no trial in frozen shoulder (a documented zero result)."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — روبوتُ المشي لا دورَ له في الكتف (بحثٌ صفريّ مكتوب)، والدراسةُ الوحيدة بروبوتٍ للطرف العلويّ تجريبيةٌ صغيرة (Ryu 2026) وليس جهازَ المركز.", "Not used — the gait robot has no role in the shoulder (a documented zero result), and the only robotic study used an upper-limb robot in a small pilot trial (Ryu 2026), which is not the centre's device."] },
  ],
  phases: [
    {
      name: ["الحساسية العالية — تهدئة الألم وحفظ المدى (الألمُ غالب)", "High irritability — settling pain and keeping range (pain-predominant)"],
      sessionFrom: 1, sessionTo: 8,
      timeframe: ["الجلساتُ الأولى (نحو أسبوعٍ ونصف) — أو ما دامت الحساسيةُ عالية", "The first sessions (about a week and a half) — or while irritability stays high"],
      goals: [
        "ألمُ الحركة ينقص نقطتين فأكثر ويصير ٦ أو أقلّ، وألمُ الليل متقطّعاً؛ والمدى يُحفظ ولا يسوء؛ والبرنامجُ المنزليّ (البندولُ والمدى المساعَد) يؤدّيه وحده عدّةَ مرّاتٍ يومياً؛ وإحالةٌ إلى الحقنة إن كانت الحساسيةُ عالية؛ وفهمٌ للحالة ومسارها ولما يُتجنّب.",
        "Pain on movement down 2 points or more and at 6 or less, with night pain intermittent; range kept and not worsening; the home programme (pendulum and assisted range) done alone several times a day; referral for injection if irritability is high; and understanding of the condition, its course and what to avoid.",
      ],
      education: [
        "• ما هي الحالة: التهابٌ في بطانة المحفظة ثمّ تليّفٌ يشدّها — وشرحُ ذلك يخفّف الخوف (JOSPT 2013)؛ والمسار: الألمُ أوّلاً ثمّ التيبّسُ ثمّ التحسّنُ التدريجيّ شهوراً إلى سنتين أو ثلاث، والألمُ لا يدوم طوالها (Rangan 2016).\n" +
        "• التمارينُ بلا ألمٍ كبير في هذه المرحلة (JOSPT 2013): التمطيطُ بالقوّة الآن يزيد الألمَ ولا يسرّع (Diercks 2004)؛ واستعمالُ الذراع في ما لا يؤلم لا يضرّ (Rangan 2016)، ولا يُثبَّت الكتف.\n" +
        "• النوم: وسادةٌ تحت الذراع المصابة وبجانبها تذكّر بعدم التقلّب عليها (Rangan 2016).\n" +
        "• الحقنةُ داخل المفصل أسرعُ ما يخفّف الألمَ في الأسابيع الأولى (JOSPT 2013 — A)، وهي قرارُ الطبيب والمريض — والعلاجُ يستمرّ معها؛ وعند السكّريّ مراقبةُ السكّر أيّاماً بعدها (Choudhry 2016).",
        "• What the condition is: inflammation of the capsule lining followed by fibrosis that tightens it — explaining this eases fear (JOSPT 2013); the course: pain first, then stiffness, then gradual recovery over months to two or three years, and the pain does not last the whole time (Rangan 2016).\n" +
        "• Exercise without much pain in this phase (JOSPT 2013): forceful stretching now increases pain and does not speed recovery (Diercks 2004); using the arm for what does not hurt does no harm (Rangan 2016), and the shoulder is not immobilised.\n" +
        "• Sleep: a pillow under and beside the affected arm as a reminder not to roll onto it (Rangan 2016).\n" +
        "• An intra-articular injection relieves pain fastest in the first weeks (JOSPT 2013 — A); it is the doctor's and patient's decision, and treatment continues alongside it; with diabetes, blood glucose is monitored for some days afterwards (Choudhry 2016).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• ألمُ الحركة ٦ من ١٠ أو أقلّ، ونقص نقطتين فأكثر من البداية (الفرقُ المهمّ — Michener 2011).\n" +
        "• ألمُ الليل متقطّعٌ لا ثابت.\n" +
        "• الألمُ عند نهاية المدى لا قبلها، والمدى الفعّالُ قريبٌ من السلبيّ (الحساسيةُ المتوسّطة — JOSPT 2013).\n" +
        "(اقتراحٌ يجمع معاييرَ الحساسية والفرقَ المهمّ، لا معيارٌ مجرَّب.) ومن جاء بحساسيةٍ متوسّطة أو منخفضة يبدأ بمرحلتها مباشرةً. وفي الجلسة ١٢ — ما زال هنا ولم ينقص ألمُ الحركة نقطتين ⟵ إلى الطبيب (القاعدةُ في «موانع وإحالة»).",
        "Progress to phase 2 when all are met:\n" +
        "• Pain on movement 6/10 or less, and down 2 points or more from the start (the important change — Michener 2011).\n" +
        "• Night pain intermittent rather than constant.\n" +
        "• Pain at end range rather than before it, and active range close to passive (moderate irritability — JOSPT 2013).\n" +
        "(A proposal combining the irritability criteria and the important change, not a tested criterion.) A patient presenting with moderate or low irritability starts directly in that phase. At session 12 — still here with pain on movement not down 2 points → to the doctor (the rule under 'Contraindications and referral').",
      ],
      notes: [
        "• البندولُ والمدى المساعَد بالعصا (العطفُ والدورانُ الخارجيّ) والطاولة — كلُّها بلا ألم، ٣–٥ مرّاتٍ يومياً قصيرة.\n" +
        "• التحريكُ المفصليّ لطيفٌ (الدرجتان الأولى والثانية) في المدى غير المؤلم لتهدئة الألم (JOSPT 2013).\n" +
        "• ضبطُ لوح الكتف والتمارينُ الثابتة بشدّةٍ خفيفة دون الألم — ٣ × ١٠ بثباتٍ عشر ثوانٍ (Sharahili 2025).\n" +
        "• الأجهزةُ المساعدة للراحة قبل التمرين، والموجاتُ الصادمة أسبوعياً بموعدها.",
        "• Pendulum, wand-assisted range (flexion and external rotation) and table slides — all pain-free, in short bouts 3–5 times a day.\n" +
        "• Gentle joint mobilisation (grades I–II) in the pain-free range to settle pain (JOSPT 2013).\n" +
        "• Scapular setting and isometrics at a light, pain-free effort — 3 × 10 with ten-second holds (Sharahili 2025).\n" +
        "• Adjunct devices for comfort before exercise, and shockwave weekly on its schedule.",
      ],
      exercises: [
        { code: "codman-pendulum", sets: 3, reps: 10, rest: 30 },
        { code: "wand-flexion-supine", sets: 1, reps: 10, hold: 5,
          note: ["بلا ألم، ٣–٥ مرّاتٍ يومياً.", "Pain-free, 3–5 times a day."] },
        { code: "wand-er-supine", sets: 1, reps: 10, hold: 5,
          note: ["بلا ألم والمرفقُ بجانب الجسم.", "Pain-free with the elbow at the side."] },
        { code: "table-towel-slide", sets: 2, reps: 10, rest: 30 },
        { code: "scapular-setting", sets: 3, reps: 10, hold: 10 },
        { code: "isometric-er", sets: 3, reps: 10, hold: 10,
          note: ["شدّةٌ خفيفة دون الألم (Sharahili 2025: ٣ × ١٠ بثباتٍ عشر ثوانٍ).", "Light, pain-free effort (Sharahili 2025: 3 × 10 with ten-second holds)."] },
        { code: "isometric-abduction", sets: 3, reps: 10, hold: 10,
          note: ["شدّةٌ خفيفة دون الألم.", "Light, pain-free effort."] },
      ],
    },
    {
      name: ["الحساسية المتوسّطة — استعادة المدى داخل مقاومة النسيج", "Moderate irritability — restoring range into tissue resistance"],
      sessionFrom: 9, sessionTo: 16,
      timeframe: ["الجلساتُ الوسطى (الأسبوعان الثاني والثالث تقريباً) — أو ما دامت الحساسيةُ متوسّطة", "The middle sessions (about weeks 2–3) — or while irritability is moderate"],
      goals: [
        "الدورانُ الخارجيّ السلبيّ يزيد ١٣° فأكثر من البداية أو يثبت، والرفعُ بالمساعدة يتقدّم؛ وألمُ الحركة ٣ أو أقلّ وبلا ألمٍ ليليّ؛ والتمطيطُ المنزليّ يومياً؛ وبدءُ المهامّ الوظيفية (التكبيرُ إلى مستوى الكتف).",
        "Passive external rotation up 13° or more from the start, or plateaued, with assisted elevation progressing; pain on movement 3 or less with no night pain; daily home stretching; and functional tasks begun (takbir to shoulder level).",
      ],
      education: [
        "• التمطيطُ الآن داخلَ مقاومة النسيج: شدٌّ محتمل يهدأ بعد التمرين، لا ألمٌ يبقى ويُسيء النوم (JOSPT 2013).\n" +
        "• الالتزامُ اليوميّ بالبرنامج المنزليّ أهمُّ من عدد جلسات العيادة (Tanaka 2010).\n" +
        "• لا يُشترط المدى الكامل للعودة إلى الحياة اليومية (JOSPT 2013)، والأنشطةُ اليومية تحتاج نحو ١٢٠–١٣٠° (Namdari 2012).\n" +
        "• الخوفُ من الحركة وضعفُ الثقة بالقدرة على التعامل مع الألم يرتبطان بالإعاقة (Fonseca 2025) — فالتشجيعُ جزءٌ من العلاج.",
        "• Stretching now goes into tissue resistance: a tolerable stretch that settles after the exercise, not pain that lingers and disturbs sleep (JOSPT 2013).\n" +
        "• Daily adherence to the home programme matters more than the number of clinic sessions (Tanaka 2010).\n" +
        "• Full range is not needed to return to daily life (JOSPT 2013), and daily activities need about 120–130° (Namdari 2012).\n" +
        "• Fear of movement and low confidence in coping with pain are linked to disability (Fonseca 2025) — so encouragement is part of treatment.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• ألمُ الحركة ٣ من ١٠ أو أقلّ، وبلا ألمٍ ليليّ.\n" +
        "• الألمُ مع الضغط الزائد وحده، والمدى الفعّالُ = السلبيّ (الحساسيةُ المنخفضة — JOSPT 2013).\n" +
        "• الدورانُ الخارجيّ السلبيّ زاد ١٣° فأكثر من البداية (أكبرُ من خطأ القياس — Tveitå 2008)، أو ثبت في قياسين.\n" +
        "(اقتراح.) وفي الجلسة ١٢: لم ينقص ألمُ الحركة نقطتين منذ البداية أو ساءت الحال ⟵ إلى الطبيب (الحقنةُ أو مراجعةُ التشخيص) قبل الجلسة ١٦.",
        "Progress to phase 3 when all are met:\n" +
        "• Pain on movement 3/10 or less, with no night pain.\n" +
        "• Pain only with overpressure, and active range equal to passive (low irritability — JOSPT 2013).\n" +
        "• Passive external rotation up 13° or more from the start (above the measurement error — Tveitå 2008), or a plateau on two measurements.\n" +
        "(A proposal.) At session 12: pain on movement not down 2 points from the start, or worsening → to the doctor (injection or a review of the diagnosis) before session 16.",
      ],
      notes: [
        "• التحريكُ المفصليّ داخل المقاومة بسعةٍ ومدّةٍ تزيدان: الانزلاقُ الخلفيّ للدوران الخارجيّ (Johnson 2007)، والتحريكُ مع الحركة (Mulligan — Doner 2013)، و«امسك ثمّ أرخِ» (Tedla 2019).\n" +
        "• التمطيطُ المساعَد بثباتٍ أطول (١٠–٣٠ ثانية)، ومشيُ الحائط، وخلفُ الكتف، وبدءُ الدوران الداخليّ خلف الظهر بلطف.\n" +
        "• لوحُ الكتف والظهرُ العلويّ: زلقُ الساعدين على الحائط وبسطُ الظهر العلويّ (Çelik 2010: تمارينُ لوح الكتف حسّنت الألمَ والمدى).\n" +
        "• الحرارةُ العميقة (التيكار) قبل التمطيط حين تُستعمل.",
        "• Joint mobilisation into resistance with increasing amplitude and duration: the posterior glide for external rotation (Johnson 2007), mobilisation with movement (Mulligan — Doner 2013), and hold-relax (Tedla 2019).\n" +
        "• Assisted stretching with longer holds (10–30 seconds), the wall finger walk, the posterior shoulder, and gentle internal rotation behind the back.\n" +
        "• Shoulder blade and upper back: forearm wall slides and thoracic extension (Çelik 2010: scapular exercise improved pain and range).\n" +
        "• Deep heat (Tecar) before stretching when used.",
      ],
      exercises: [
        { code: "wand-er-supine", sets: 1, reps: 10, hold: 10,
          note: ["داخلَ مقاومة النسيج، ثمّ والذراعُ مبعدةٌ ٤٥°.", "Into tissue resistance, then with the arm abducted 45°."] },
        { code: "wand-flexion-supine", sets: 1, reps: 10, hold: 10 },
        { code: "wall-finger-walk", sets: 1, reps: 10, hold: 5 },
        { code: "cross-body-stretch", sets: 1, reps: 3, hold: 30, rest: 15 },
        { code: "towel-ir-behind-back", sets: 1, reps: 5, hold: 15,
          note: ["بلطف — أكثرُ الاتّجاهات ألماً غالباً.", "Gently — often the most painful direction."] },
        { code: "wall-slide-serratus", sets: 2, reps: 10, rest: 45 },
        { code: "thoracic-extension-towel", sets: 1, reps: 10, hold: 3 },
        { code: "isometric-er", sets: 3, reps: 10, hold: 10 },
        { code: "prayer-wudu-reach", reps: 5,
          note: ["التكبيرُ إلى مستوى الكتف، والمسحُ من الجبهة إلى أعلى الرأس بالمساعدة.", "Takbir to shoulder level, and wiping from the forehead to the top of the head with assistance."] },
      ],
    },
    {
      name: ["الحساسية المنخفضة — نهاية المدى والقوّة والعودة إلى المهامّ (التيبّسُ غالب)", "Low irritability — end range, strength and return to tasks (stiffness-predominant)"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["الجلساتُ الأخيرة (الأسبوعان الثالث والرابع تقريباً) — أو من البداية لمن جاء والتيبّسُ غالب", "The final sessions (about weeks 3–4) — or from the start for those presenting stiffness-predominant"],
      goals: [
        "SPADI نقص ١٣ نقطةً فأكثر أو بلغ مستوى يقبله المريض؛ ومدىً يكفي مهامَّه (نحو ١٢٠–١٣٠° رفعاً، واليدُ خلف الظهر)؛ وقوّةُ الدوران ولوح الكتف؛ والتكبيرُ والمسحُ على الرأس والسجودُ كاملةً؛ وبرنامجٌ منزليّ مستقلّ يستمرّ بعد الخروج.",
        "SPADI down 13 points or more, or at a level the patient finds acceptable; range enough for his or her tasks (about 120–130° of elevation, and the hand behind the back); rotator and shoulder-blade strength; full takbir, wiping the head and prostration; and an independent home programme that continues after discharge.",
      ],
      education: [
        "• التحسّنُ يستمرّ بعد الخروج، والبرنامجُ المنزليّ يومياً أشهراً حتى يثبت المدى (اقتراح؛ المسارُ طويل — Hand 2008).\n" +
        "• التقويةُ بعد أن يهدأ الألم (Oh 2011 كما يصفه JOSPT 2013)، والعودةُ إلى العمل بالتدريج — والغيابُ عن العمل نحوُ نصف كلفة المرض (van den Hout 2005).\n" +
        "• الكتفُ الأخرى قد تُصاب (Rangan 2016): ألمٌ ليليّ وتيبّسٌ جديد فيها ⟵ مراجعةٌ مبكّرة.",
        "• Recovery continues after discharge, and the home programme is done daily for months until range is secure (a suggestion; the course is long — Hand 2008).\n" +
        "• Strengthening once pain has settled (Oh 2011 as described by JOSPT 2013), and a graded return to work — absence from work accounts for about half the cost of the condition (van den Hout 2005).\n" +
        "• The other shoulder may be affected (Rangan 2016): new night pain and stiffness there → an early review.",
      ],
      criteria: [
        "يخرج من البرنامج (أو يُمدَّد مرّةً بمعيار) حين يتحقّق واحدٌ ممّا يلي وهو يؤدّي برنامجَه المنزليّ وحده:\n" +
        "• SPADI نقص ١٣ نقطةً فأكثر (أعلى الفرق المهمّ — Roy 2009) أو بلغ مستوى يقبله المريض.\n" +
        "• المهامُّ الوظيفية التي اختارها تحقّقت.\n" +
        "• أو ثباتٌ — تغيّرٌ أقلّ من خطأ القياس في إعادتَي تقييمٍ متتاليتين.\n" +
        "(اقتراح.) وقد يخرج قبل الجلسة ٢٤ إن تحقّق.\n" + EXTEND_AR,
        "Discharge from the programme (or one criteria-based extension) when one of the following is met while the patient does the home programme alone:\n" +
        "• SPADI down 13 points or more (the upper important change — Roy 2009) or at a level the patient finds acceptable.\n" +
        "• The functional tasks the patient chose are achieved.\n" +
        "• Or a plateau — change smaller than the measurement error over two consecutive reassessments.\n" +
        "(A proposal.) Discharge may come before session 24 if met.\n" + EXTEND_EN,
      ],
      notes: [
        "• التحريكُ بنهاية المدى وسعةٍ عالية (الدرجتان الثالثة والرابعة — Vermeulen 2006) بعد استبعاد الخشونة والخلع.\n" +
        "• التمطيطُ الأطول: النائمُ وخلفُ الكتف والدورانُ الداخليّ خلف الظهر، والدورانُ الخارجيّ عند إطار الباب والذراعُ مبعدة — ٣ × ٢٠–٣٠ ثانية.\n" +
        "• التقويةُ بالمطّاط حين يهدأ الألم (الدورانان والتجديفُ ورفعُ الذراع في مستوى لوح الكتف) — ٢–٣ × ١٠–١٥ ثلاثاً في الأسبوع (اقتراح).\n" +
        "• المهامُّ الوظيفية: الرفُّ العالي، والتكبيرُ والمسحُ على الرأس والسجودُ كاملةً (الخبراءُ البريطانيّون أوصوا بالتمارين الوظيفية في التيبّس — Hanchard 2020).",
        "• End-range, high-amplitude mobilisation (grades III–IV — Vermeulen 2006) after osteoarthritis and dislocation are excluded.\n" +
        "• Longer stretches: sleeper, posterior shoulder and internal rotation behind the back, and external rotation at a door frame with the arm abducted — 3 × 20–30 seconds.\n" +
        "• Band strengthening once pain settles (both rotations, rows and the scaption raise) — 2–3 × 10–15 three times a week (a suggestion).\n" +
        "• Functional tasks: the high shelf, and full takbir, wiping the head and prostration (UK experts recommended function-based exercise in the stiffness-predominant stage — Hanchard 2020).",
      ],
      exercises: [
        { code: "sleeper-stretch", sets: 1, reps: 10, hold: 10 },
        { code: "towel-ir-behind-back", sets: 1, reps: 5, hold: 20 },
        { code: "cross-body-stretch", sets: 1, reps: 3, hold: 30, rest: 15 },
        { code: "doorway-pec-stretch", sets: 1, reps: 3, hold: 30, rest: 15,
          note: ["الساعدُ على الإطار والذراعُ مبعدةٌ ٩٠° — يمطّ مقدّمَ المحفظة والدورانَ الخارجيّ؛ في الحساسية المنخفضة وحدها.", "Forearm on the frame with the arm abducted 90° — stretching the front of the capsule and external rotation; low irritability only."] },
        { code: "wand-er-supine", sets: 1, reps: 5, hold: 30,
          note: ["والذراعُ مبعدةٌ ٩٠° إن سمح الأخصائيّ.", "With the arm abducted 90° if the therapist allows."] },
        { code: "band-er", sets: 2, reps: 15, rest: 60,
          note: ["حين يهدأ الألم.", "Once pain has settled."] },
        { code: "band-ir", sets: 2, reps: 15, rest: 60 },
        { code: "scaption-raise", sets: 2, reps: 10, rest: 60,
          note: ["في المدى المتاح بلا رفع الكتف نحو الأذن.", "Within the available range without shrugging."] },
        { code: "band-row", sets: 3, reps: 12, rest: 45 },
        { code: "overhead-shelf-lift", sets: 2, reps: 10, rest: 60 },
        { code: "prayer-wudu-reach", reps: 5,
          note: ["التكبيرُ إلى الأذنين، والمسحُ إلى مؤخّرة الرأس، والسجودُ على اليدين — كاملةً.", "Takbir to the ears, wiping to the back of the head, and prostration on the hands — in full."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — أسئلةُ هذا البروتوكول للمشرف العام، تُزرع بـ`checklistSql` ولا تكتب فوق ما علّمه. والنصُّ العربيّ بلا أسماء دراسات (§4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العدد ٢٤ بستٍّ في الأسبوع وتمديدٌ واحد بستّ لمن ما زال يتحسّن، والخروجُ المبكّر إن تحقّقت المعايير — والتجاربُ ٦–٣٠ جلسة بمعدّل ٢–٣ في الأسبوع غالباً، ولم يرتبط عددُ الجلسات ولا تواترُ التحريك بالنتيجة بل التمرينُ المنزليّ اليوميّ: أبقِه، أو اجعله ثلاثاً في الأسبوع ثمانيةَ أسابيع فيقع التقييمُ عند الأسبوع السادس كما في الدليل البريطانيّ.",
    en: "24 sessions at six a week with one extension of six for those still improving, and early discharge when criteria are met — trials used 6–30 sessions mostly at 2–3 a week, and neither the number of sessions (Okanlawon 2026) nor mobilisation frequency (Tanaka 2010) was linked to the outcome, while daily home exercise was: keep it, or make it three a week for eight weeks so the review falls at week 6 as in the British pathway (Rangan 2015)." },
  { key: "limits", topic: "limits",
    ar: "المرحلةُ بالحساسية لا برقم الجلسة، والحدود: ألمُ الحركة ٦ ثمّ ٣ ونقصُه نقطتين، والدورانُ الخارجيّ السلبيّ ١٣°، وSPADI ٨ ثمّ ١٣ — اقتراحٌ مبنيّ على تصنيف الحساسية وخطأ القياس والفرق المهمّ: أبقِها أو عدّلها.",
    en: "The phase follows irritability, not the session number, and the limits: pain on movement 6 then 3 and down 2 points, passive external rotation 13°, and SPADI 8 then 13 — proposals built on JOSPT 2013, Tveitå 2008, Michener 2011 and Roy 2009: keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: للحقنة من الجلسة الأولى إن كانت الحساسيةُ عالية وفي الجلسة ١٢ إن لم ينقص الألم، وإلى اختصاصيّ الكتف في الجلسة ٢٤ بلا تحسّن، والصورةُ قبل التحريك بنهاية المدى بشروطها — راجعها مع طبيب المركز وأبقِها أو عدّلها.",
    en: "The referral rules: for injection from the first session if irritability is high and at session 12 if pain has not fallen, to a shoulder specialist at session 24 without improvement, and the X-ray before end-range mobilisation with its conditions — review them with the centre's doctor and keep or adjust." },
  { key: "device-shockwaves", topic: "settings",
    ar: "الموجاتُ الصادمة مساعدٌ أسبوعيّ أربعَ مرّات — أقوى الأجهزة دليلاً في هذه الحالة والخبراءُ البريطانيّون ضدّها في التيبّس: أبقِها أو اجعلها «لا يُستخدم»، واملأ إعداداتِها (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز — لا يُعتمد البروتوكولُ بلاها.",
    en: "Shockwave is a weekly adjunct, four times — the device with the strongest evidence here, though UK experts oppose it in the stiff stage: keep it or set it to 'Not used', and fill its settings (type, intensity, frequency, impulses) from the centre's device — the protocol cannot be approved without them." },
  { key: "device-adjuncts", topic: "devices",
    ar: "الحرارةُ والتيكارُ والتحفيزُ الكهربائيّ والمغناطيسُ مساعدةٌ بقاعدتك — والدليلُ ضعيفٌ أو ضدّ (المغناطيسُ لم ينفع في أفضل تجربة، والتحفيزُ رآه الخبراءُ غيرَ نافع، والتحفيزُ ممنوعٌ هنا في التيبّس الغالب): أبقِها أو عدّلها، واملأ إعداداتِ المغناطيس من جهاز المركز.",
    en: "Heat, Tecar, electrotherapy and magnetic therapy are adjuncts by your rule — the evidence is weak or against (magnetic therapy failed in the best trial, experts rated electrotherapy ineffective, and electrotherapy is excluded here in the stiffness-predominant stage): keep or adjust, and fill the magnetic settings from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ يوماً بعد يوم ستَّ مرّات — ولا تجربةَ عشوائية لها في الكتف المتجمّد، دراسةٌ واحدة بلا مقارنة: أبقِها أو عدّلها أو اجعلها «لا يُستخدم».",
    en: "Dry needling is an adjunct every other day, six times — there is no randomised trial in frozen shoulder, only one uncontrolled study (Kalia 2021): keep, adjust, or set it to 'Not used'." },
  { key: "device-laser-cpm", topic: "devices",
    ar: "الليزرُ والجهازُ السلبيّ المستمرّ «لا يُستخدم» لأنّك لم تذكرهما — ولكلٍّ دليلٌ صغير (الليزرُ للألم، والسلبيّ للألم والعطف) والخبراءُ البريطانيّون منعوا الليزر: أبقِهما كذلك أو اجعل أحدَهما مساعداً بإعدادات التجربة المكتوبة في سطره.",
    en: "Laser and continuous passive motion are 'Not used' because you have not mentioned them — each has small supporting evidence (laser for pain, CPM for pain and flexion) and UK experts barred laser: keep them so or make one an adjunct with the trial settings written in its line." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: ألمَ الليل وألمَ الحركة كلّاً من ١٠ (الأقلّ أفضل)، ومسافةَ الإبهام خلف الظهر بالسنتيمتر (الأقلّ أفضل)، والإبعادَ والدورانَ الداخليّ السلبيّين بالدرجات (الأكثر أفضل)، ومقياسَ أكسفورد للكتف بالعربية من ٤٨ (الأكثر أفضل) — ومصادرُها في «التقييم».",
    en: "Add under 'Measures' → custom measure: night pain and pain on movement, each out of 10 (lower is better), the thumb-to-pelvis distance behind the back in cm (lower is better), passive abduction and internal rotation in degrees (higher is better), and the Arabic Oxford Shoulder Score out of 48 (higher is better; Alsanawi 2021)." },
];

export const name = "149_physio_frozen_shoulder_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
