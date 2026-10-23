// Migration 168: هشاشة العظام والوقاية من السقوط — البروتوكولُ التاسع والعشرون مفصَّلاً (§4.ey — ٢٠٢٦-١٠-٢٣).
//
// المالك (٢٠٢٦-١٠-٢٣) بعد الحبل الشوكي: «اكمل» — والمعيارُ الذي وضعه قبلها «تبعا لشيوع حالاته في العراق»، فاختار المساعدُ «هشاشة العظام والوقاية من السقوط»
// (`osteoporosis-falls-geriatric`): في كركوك ٣٧٫٥٪ من ١٠٨٥ امرأةً بعد سنّ اليأس مصاباتٌ بالهشاشة و٤٤٫٦٪ بنقص الكثافة (Ismael 2022)، والسقوطُ أكثرُ إصابات المدنيّين
// في بغداد بين ٢٠٠٣ و٢٠١٤ (Stewart 2016)، ونموذجُ الخطر العراقيّ للكسر يجعل خطرَ كسر الورك في العمر نحو واحدةٍ من ١٨ امرأة (Abdulbari 2025) — وهي أوسعُ الستّ عشرة انتشاراً.
// **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة وتمديدٌ واحد باثنتي عشرة لمن بقي عالي الخطر وتقدّم، ثمّ برنامجٌ منزليّ ثلاثاً في الأسبوع حتى الأسبوع ٢٦
// ومراجعاتٌ في ٨ و١٢ و٢٦ ثمّ كلَّ سنة؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–١٨ · ١٩–٢٤): التقييمُ وتصنيفُ الخطر والسلامة، ثمّ التوازنُ المتحدّي والقوّةُ والصدم المتدرّج، ثمّ التثبيتُ
// والبيتُ والمجتمع — ومعاييرُ من أصغر تغيّرٍ يُكتشف في بيرغ (Donoghue 2009) وسرعة المشي (Perera 2006)؛ **ومساراتٌ بالخطر وحال العظم** (منخفضُ الخطر بهشاشةٍ بلا كسر،
// ومتوسّطُه، وعاليه، وبعد كسر الفقرات، وبعد كسر الورك)؛ **وقواعدُ إحالةٍ** (الكسرُ الجديد، والإغماء، والضغطُ الانتصابيّ، والأدوية، وصحّةُ العظم)؛ وتسعُ بطاقاتٍ جديدة والمعادةُ
// بصورتها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛ والمقاييسُ كما زُرعت (النهوضُ والمشي وبيرغ والجلوسُ والقيامُ والخوفُ من السقوط)؛ وبنودُ «اضغطه يا سليم»
// بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده سليم.
//
// **ما يخصّ الهشاشةَ والسقوط**: الإرشادُ العالميّ للسقوط (Montero-Odasso 2022) والبريطانيّان (NICE NG249 2025 · NICE NG259 2026) وإرشادُ الهشاشة البريطانيّ (Gregson 2022)
// واتّفاقُ التمرين للهشاشة (Brooke-Wavell 2022 · Giangregorio 2015) والعربيّ (Jassim 2017). **والجرعة**: التمرينُ أنقص السقوطَ ٢٣٪ والتوازنُ مع المهامّ ٢٤٪ والأنواعُ المتعدّدة ٣٤٪
// (Sherrington 2019)، والتوازنُ المتحدّي فوق ثلاث ساعات في الأسبوع أكثرُ أثراً (Sherrington 2017)، والإرشادُ: ثلاثاً في الأسبوع فأكثر اثني عشرَ أسبوعاً فأكثر ويستمرّ — ولا تجربةَ
// لكتلةٍ يومية من أربعة أسابيع (بحثٌ صفريّ)، فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والمغناطيسُ والتحفيزُ (لألم كسر الفقرة) والكمادةُ بقاعدة
// المركز وشروطها؛ **والموجاتُ الصادمة «لا يُستخدم»** (دراسةٌ واحدة صغيرة — فلا إعداداتٍ تمنع اعتمادَه)؛ والشدُّ ممنوع؛ والباقي «لا يُستخدم». **وما يخصّ العراق**: نقصُ فيتامين د
// (دهوك وأربيل والبصرة)، والسلالمُ والجلوسُ والنومُ على الأرض والمرحاضُ العربيّ، والحرُّ ورمضان، والصلاة.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٣١٣ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ مولَّداً من الجدول، ولا مرجعَ قبل ١٩٩٠)،
// والإرشاداتُ من نصوصها. القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — تسعٌ للهشاشة والسقوط؛ والمعادةُ تُربط برمزها وصورتها، وما يخصّ كبيرَ السنّ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "osteo-tandem-walk", nameAr: "المشي بالكعب أمام الأصابع على خطٍّ واحد بجانب سند", nameEn: "Heel-to-toe walking along a line beside a support",
    kind: "balance", region: "whole_body", sets: 3, reps: 10, rest: 30,
    purpose: ["من تمارين برنامج أوتاغو للتوازن: يضيّق قاعدةَ الوقوف فيتحدّى التوازن وهو يمشي — وأوتاغو في البيت أنقص السقوطَ عند النساء فوق الثمانين (Campbell 1997)، وفي جمع تجاربه ٣٥٪ (Robertson 2002) و٣٢٪ مع نقص الوفاة (Thomas 2010)، ونفع في إيران مَن سقط في السنة السابقة (Dadgari 2016). والتوازنُ المتحدّي أساسُ ما ينقص السقوطَ في كلّ التجارب (Sherrington 2019 · Sherrington 2017)، والإرشادُ يجعله أوّلَ التمرين (Montero-Odasso 2022).",
      "One of the Otago balance exercises: it narrows the base of support so balance is challenged while walking — Otago at home reduced falls in women over eighty (Campbell 1997), by 35% in its pooled trials (Robertson 2002) and by 32% with lower mortality (Thomas 2010), and helped people in Iran who had fallen in the previous year (Dadgari 2016). Challenging balance is the core of what reduces falls across trials (Sherrington 2019 · Sherrington 2017), and the guideline puts it first (Montero-Odasso 2022)."],
    start: ["واقفٌ بجانب طاولة المطبخ أو الحائط أو المتوازيين، ويدٌ عليه، والحذاءُ في القدمين، والطريقُ أمامه خالٍ.", "Standing beside the kitchen counter, a wall or parallel bars with one hand on it, shoes on, and a clear path ahead."],
    steps: [[
      "قف مستقيماً بجانب السند ويدُك عليه، وانظر إلى الأمام لا إلى قدميك.",
      "ضع كعبَ قدمٍ أمام أصابع الأخرى مباشرةً كأنّك تمشي على خطّ.",
      "انقل وزنك إلى القدم الأمامية، ثمّ ضع القدمَ الخلفية أمامها بالطريقة نفسها.",
      "امشِ عشرَ خطواتٍ هكذا، ثمّ استدر ببطء وارجع.",
      "حين تثبت: خفّف اليدَ إلى إصبعٍ واحد، ثمّ بلا يد والسندُ قريب.",
    ], [
      "Stand tall beside the support with your hand on it, looking ahead rather than at your feet.",
      "Place the heel of one foot directly in front of the toes of the other, as if walking on a line.",
      "Shift your weight onto the front foot, then bring the back foot in front of it in the same way.",
      "Walk ten steps like this, then turn slowly and come back.",
      "Once steady: lighten the hand to one finger, then no hand with the support close by.",
    ]],
    cues: [[
      "النظرُ إلى القدمين ⟵ إلى نقطةٍ أمامك على مستوى العين.",
      "فجوةٌ بين الكعب والأصابع ⟵ الكعبُ يلمس الأصابع.",
      "الاستعجال ⟵ خطوةٌ هادئة تثبت عليها قبل التالية.",
      "بعيداً عن السند ⟵ بجانبه دائماً حتى يقول الأخصائيّ غير ذلك.",
    ], [
      "Looking at the feet → at a point ahead at eye level.",
      "A gap between heel and toes → the heel touching the toes.",
      "Rushing → a calm step, steady before the next.",
      "Away from the support → always beside it until the specialist says otherwise.",
    ]],
    easier: ["قدمٌ نصفُ أمام الأخرى (لا على خطٍّ تامّ)، واليدان على السند.", "One foot half in front of the other (not fully on a line), with both hands on the support."],
    harder: ["بلا يد، أو بعينين تنظران يميناً ويساراً، أو مع حمل كوبٍ أو عدٍّ عكسيّ.", "No hand, or with the eyes looking left and right, or while carrying a cup or counting backwards."],
    stopIf: ["دوخةٌ أو غشاوة أو خفقان ⟵ اجلس فوراً وأخبر الأخصائيّ (قد يكون هبوطاً في الضغط أو اضطراباً في القلب)؛ ألمٌ جديد في الورك أو الظهر ⟵ توقّف.", "Dizziness, blurred vision or palpitations → sit down at once and tell the specialist (it may be a drop in blood pressure or a heart rhythm problem); new hip or back pain → stop."],
    equipment: ["سندٌ ثابت بارتفاع الخصر (طاولةُ المطبخ أو الحائط أو المتوازيان)، وشريطٌ لاصق على الأرض خطّاً إن أمكن.", "A steady waist-high support (the kitchen counter, a wall or parallel bars), and tape on the floor as a line if possible."],
    doseNote: ["٣ × ١٠ خطوات في كلّ جلسة، وثلاثاً في الأسبوع في البيت — والتوازنُ في البرنامج كلِّه ثلاثُ ساعاتٍ في الأسبوع فأكثر (Sherrington 2017).", "3 × 10 steps every session and three times a week at home — with balance work totalling three hours a week or more across the programme (Sherrington 2017)."],
    images: [{ key: "osteo-tandem-walk-1", ar: "رسمٌ لامرأةٍ كبيرة تقف مستقيمةً بجانب طاولة ويدُها عليها، وكعبُ قدمٍ أمام أصابع الأخرى وسهمٌ يدلّ على الخطوة", en: "A drawing of an older woman standing tall beside a bench with her hand on it, one heel placed in front of the other foot's toes and an arrow showing the step", search: "Otago heel toe walking hold support" }],
  },
  {
    code: "osteo-backward-turn-walk", nameAr: "المشي إلى الخلف والاستدارة بجانب سند", nameEn: "Backwards walking and turning beside a support",
    kind: "balance", region: "whole_body", sets: 2, reps: 10, rest: 30,
    purpose: ["من تمارين أوتاغو أيضاً: المشيُ إلى الخلف والاستدارة حركاتٌ يقع فيها السقوطُ في البيت (الرجوعُ عن الطبّاخ، والالتفاتُ إلى نداء)، وتدريبُها يتحدّى التوازنَ والتحكّمَ في الخطوة (Campbell 1997 · Robertson 2002). والسقوطُ في المنطقة أكثرُه داخلَ البيت (Alabdullgader 2021 · Abolhassani 2006).",
      "Also from Otago: walking backwards and turning are movements in which falls happen at home (stepping back from the stove, turning to a call), and practising them challenges balance and step control (Campbell 1997 · Robertson 2002). Most falls in the region happen indoors (Alabdullgader 2021 · Abolhassani 2006)."],
    start: ["واقفٌ بجانب سندٍ طويل (طاولةٌ طويلة أو الحائط أو المتوازيان) ويدُه عليه، والطريقُ خلفه خالٍ تماماً.", "Standing beside a long support (a long counter, a wall or parallel bars) with a hand on it, and the path behind completely clear."],
    steps: [[
      "تأكّد أنّ ما خلفك خالٍ من السجّاد والأغراض.",
      "قف مستقيماً ويدُك على السند، ثمّ امشِ إلى الخلف عشرَ خطواتٍ هادئة، أصابعُ القدم أوّلاً ثمّ الكعب.",
      "امشِ إلى الأمام عائداً إلى البداية.",
      "الاستدارة: امشِ على شكل رقم ٨ حول كرسيّين، أو استدر حول نفسك ببطء خطوةً بخطوة لا على قدمٍ واحدة.",
      "حين تثبت: خفّف اليدَ ثمّ بلا يد والسندُ قريب، والمرافقُ بجانبك.",
    ], [
      "Make sure the space behind you is clear of rugs and objects.",
      "Stand tall with your hand on the support, then walk backwards ten calm steps, toes first then heel.",
      "Walk forwards back to the start.",
      "Turning: walk a figure of eight around two chairs, or turn around slowly step by step, not on one foot.",
      "Once steady: lighten the hand, then no hand with the support close, and a companion beside you.",
    ]],
    cues: [[
      "الالتفاتُ بالرأس إلى الخلف وأنت تمشي ⟵ النظرُ إلى الأمام، وتحقّق من الطريق قبل البدء.",
      "الاستدارةُ على قدمٍ واحدة دفعةً ⟵ خطواتٌ صغيرة متتالية.",
      "خطواتٌ طويلة إلى الخلف ⟵ قصيرةٌ هادئة.",
      "بعيداً عن السند ⟵ بجانبه.",
    ], [
      "Twisting the head back while walking → looking ahead, and checking the path before starting.",
      "Pivoting on one foot in one go → small successive steps.",
      "Long backward steps → short calm ones.",
      "Away from the support → beside it.",
    ]],
    easier: ["خمسُ خطواتٍ واليدان على السند، والاستدارةُ حول كرسيٍّ واحد واسعاً.", "Five steps with both hands on the support, and a wide turn around one chair."],
    harder: ["بلا يد، أو أسرع، أو مع الكلام أو حمل غرض (والمرافقُ بجانبه).", "No hand, faster, or while talking or carrying something (with the companion beside)."],
    stopIf: ["دوخةٌ أو دوارٌ عند الاستدارة ⟵ توقّف واجلس، وأخبر الأخصائيّ (قد يكون دوارَ الأذن)؛ سقوطٌ أو كادَ ⟵ يُكتب في سجلّ السقوط.", "Dizziness or vertigo on turning → stop and sit, and tell the specialist (it may be inner-ear vertigo); a fall or near fall → recorded in the falls diary."],
    equipment: ["سندٌ طويل ثابت، وكرسيّان للاستدارة، ومساحةٌ خالية.", "A long steady support, two chairs for turning, and a clear space."],
    doseNote: ["٢ × ١٠ خطوات لكلّ اتّجاه في الجلسة وثلاثاً في الأسبوع في البيت بحضور أحد الأهل أوّلاً.", "2 × 10 steps in each direction per session, and three times a week at home, with a family member present at first."],
    images: [{ key: "osteo-backward-turn-walk-1", ar: "رسمٌ لامرأةٍ كبيرة تمشي إلى الخلف بجانب طاولة ويدُها عليها، وسهمٌ فوقها يدلّ على الاتّجاه إلى الخلف", en: "A drawing of an older woman walking backwards beside a bench with her hand on it, with an arrow above showing the backward direction", search: "Otago backwards walking hold support" }],
  },
  {
    code: "osteo-back-extension", nameAr: "تقوية عضلات الظهر الباسطة (رفعُ الصدر قليلاً في الانبطاح)", nameEn: "Back-extensor strengthening (a small chest lift lying face down)",
    kind: "strength", region: "thoracic", sets: 1, reps: 5, hold: 5, rest: 30,
    purpose: ["عضلاتُ الظهر القويّة تحمي الفقرات وتنقص انحناءَ الظهر: تجربةُ تقويتها سنتين عند نساءٍ بعد سنّ اليأس قلّلت كسورَ الفقرات بعد عشر سنين (١٫٦٪ من الفقرات مقابل ٤٫٣٪ — Sinaki 2002)، وتمرينُ البيت الخفيف رفع قوّتها ٢٦٪ (Hongo 2007)، والتقويةُ ثلاثاً في الأسبوع ستّة أشهر أنقصت الانحناءَ ثلاثَ درجات (Katzman 2017). والاتّفاقُ: ٣–٥ مرّات بثباتٍ ٣–٥ ثوانٍ مرّتين في الأسبوع فأكثر، وبعد كسر الفقرة يومياً بشدّةٍ خفيفة (Brooke-Wavell 2022 · Giangregorio 2015).",
      "Strong back muscles protect the vertebrae and lessen spinal curvature: two years of strengthening in postmenopausal women reduced vertebral fractures ten years later (1.6% of vertebrae against 4.3% — Sinaki 2002), a light home programme raised their strength by 26% (Hongo 2007), and strengthening three times a week for six months reduced kyphosis by three degrees (Katzman 2017). The consensus: 3–5 repetitions held 3–5 seconds at least twice a week, and after a vertebral fracture daily at low intensity (Brooke-Wavell 2022 · Giangregorio 2015)."],
    start: ["منبطحٌ على فرشةٍ أو سرير ووسادةٌ تحت البطن، والذراعان بجانب الجسم والكفّان إلى الأسفل، والجبهةُ على منشفةٍ مطويّة.", "Lying face down on a mat or bed with a pillow under the abdomen, arms by the sides with palms down, and the forehead on a folded towel."],
    steps: [[
      "شدّ لوحَي الكتف إلى الخلف والأسفل بلطف.",
      "ارفع الرأسَ والكتفين قليلاً عن الفرشة — بضعةَ سنتيمترات — والنظرُ إلى الأرض، والرقبةُ على استقامة الظهر.",
      "اثبت ٣–٥ ثوانٍ وتنفّس، ثمّ انزل ببطء.",
      "كرّر ٣–٥ مرّات، واسترح بينها.",
      "مَن لا يستطيع الانبطاح: جالساً مستقيماً على كرسيّ، اضغط ظهرك إلى الخلف على مسنده أو على كرةٍ بين ظهرك والحائط واثبت.",
    ], [
      "Draw the shoulder blades gently back and down.",
      "Lift the head and shoulders a little off the mat — a few centimetres — looking at the floor, with the neck in line with the back.",
      "Hold 3–5 seconds while breathing, then lower slowly.",
      "Repeat 3–5 times, resting between them.",
      "A person who cannot lie face down: sitting tall on a chair, press the back into the backrest or into a ball between the back and a wall, and hold.",
    ]],
    cues: [[
      "رفعٌ عالٍ يقوّس أسفلَ الظهر ⟵ رفعٌ صغير والوسادةُ تحت البطن.",
      "الرأسُ يرتفع إلى الأعلى ⟵ النظرُ إلى الأرض والرقبةُ ممدودة.",
      "حبسُ النفَس ⟵ تنفّسٌ هادئ.",
      "تمرينُ ثني الجذع (رفعُ الجذع من الاستلقاء) ⟵ يُترك، والبسطُ مكانه (Brooke-Wavell 2022).",
    ], [
      "A high lift that arches the lower back → a small lift with the pillow under the abdomen.",
      "The head tipping up → looking at the floor with the neck long.",
      "Holding the breath → calm breathing.",
      "Trunk-curl exercises (sit-ups) → dropped, with extension instead (Brooke-Wavell 2022).",
    ]],
    easier: ["رفعُ الرأس وحده، أو ضغطُ الظهر على الكرسيّ جالساً.", "Lifting the head alone, or pressing the back into the chair in sitting."],
    harder: ["الذراعان إلى الجانبين ثمّ إلى الأمام (بطاقةُ رفع الذراعين في الانبطاح)، أو ثباتٌ أطول حتى ١٠ ثوانٍ.", "Arms out to the sides, then forwards (the prone arm-raise card), or a longer hold up to 10 seconds."],
    stopIf: ["ألمٌ حادّ جديد في الظهر أو الأضلاع ⟵ توقّف، وإلى الطبيب (قد يكون كسراً في فقرةٍ أو ضلع — Gibbs 2019)؛ ضيقُ نفَسٍ في الانبطاح ⟵ جالساً بدله.", "New sharp pain in the back or ribs → stop, and to the doctor (it may be a vertebral or rib fracture — Gibbs 2019); breathlessness lying face down → do it seated instead."],
    equipment: ["فرشةٌ أو سرير، ووسادة، ومنشفة؛ أو كرسيٌّ بظهرٍ مستقيم وكرة.", "A mat or bed, a pillow and a towel; or a straight-backed chair and a ball."],
    doseNote: ["٣–٥ مرّات بثباتٍ ٣–٥ ثوانٍ مرّتين في الأسبوع فأكثر، وبعد كسر الفقرة يومياً بشدّةٍ خفيفة (Brooke-Wavell 2022).", "3–5 repetitions held 3–5 seconds at least twice a week, and after a vertebral fracture daily at low intensity (Brooke-Wavell 2022)."],
    images: [{ key: "osteo-back-extension-1", ar: "رجلٌ منبطحٌ على فرشة، ذراعاه بجانبه والكفّان إلى الأسفل، يرفع رأسه وصدره عن الفرشة", en: "A man lying face down on a mat, arms by his sides with palms down, lifting his head and chest off the mat", search: "osteoporosis prone chest lift back extensor exercise" }],
  },
  {
    code: "osteo-heel-drop-impact", nameAr: "الصدمُ الخفيف للعظم: رفعُ الكعبين ثمّ إسقاطُهما على الأرض", nameEn: "Gentle impact for bone: rising onto the toes and dropping onto the heels",
    kind: "functional", region: "whole_body", sets: 5, reps: 10, rest: 30,
    purpose: ["العظمُ يقوى بالحمل والصدم المتكرّر: الصدمُ المختلط مع المشي أو مع المقاومة رفع كثافةَ الفقرات وعنق الفخذ، والصدمُ العالي وحده لم يفعل (Martyn-St James 2009)، وفي تجربةٍ عند نساءٍ كبيرات بكثافةٍ منخفضة قلّ كسرُ السقوط ٦ مقابل ١٦ (Korpelainen 2006). والاتّفاق: صدمٌ متوسّط أكثرَ أيّام الأسبوع، خمسون صدمةً فأكثر في المرّة (٥ × ١٠) — لمن ليس عنده كسرُ فقرةٍ أو كسورٌ متعدّدة، ومَن عنده فلا أكثرَ من المشي السريع (Brooke-Wavell 2022).",
      "Bone strengthens with repeated loading and impact: mixed impact with walking or with resistance raised spine and femoral-neck density, while high impact alone did not (Martyn-St James 2009), and in a trial of older women with low density fall-related fractures were 6 against 16 (Korpelainen 2006). The consensus: moderate impact on most days, fifty impacts or more per session (5 × 10) — for people without a vertebral fracture or multiple fractures; for those with them, nothing harder than brisk walking (Brooke-Wavell 2022)."],
    start: ["واقفٌ أمام طاولةٍ ثابتة أو المغسلة ويداه عليها، والقدمان بعرض الوركين، والحذاءُ في القدمين.", "Standing at a steady table or the sink with both hands on it, feet hip-width apart, shoes on."],
    steps: [[
      "قف مستقيماً ويداك على الطاولة.",
      "ارتفع على أصابع قدميك.",
      "أسقِط الكعبين على الأرض دفعةً واحدة بصدمةٍ تحسّها في ساقيك — لا قويّةً تؤلم.",
      "كرّر عشرَ مرّات، ثمّ استرح نصفَ دقيقة، والمجموعُ خمسُ مجموعات.",
      "حين يسهل: الدبكُ بالقدم على الأرض، ثمّ قفزاتٌ صغيرة في المكان واليدان على الطاولة — بقرار الأخصائيّ.",
    ], [
      "Stand tall with your hands on the table.",
      "Rise onto your toes.",
      "Drop your heels onto the floor in one go, with a jolt you feel in your legs — not one hard enough to hurt.",
      "Repeat ten times, then rest half a minute, for five sets in all.",
      "When it becomes easy: stamping on the floor, then small jumps on the spot with the hands on the table — by the specialist's decision.",
    ]],
    cues: [[
      "نزولٌ بطيء ناعم ⟵ إسقاطٌ دفعةً واحدة لصدمةٍ تصل العظم.",
      "الركبتان مقفلتان بقوّة ⟵ مستقيمتان بلا قفل.",
      "صدمٌ مع كسر فقرة ⟵ مشيٌ سريع بدله (Brooke-Wavell 2022).",
      "بلا سند ⟵ اليدان على الطاولة دائماً.",
    ], [
      "A slow soft lowering → a drop in one go so the jolt reaches the bone.",
      "Knees locked hard → straight but not locked.",
      "Impact with a vertebral fracture → brisk walking instead (Brooke-Wavell 2022).",
      "No support → hands on the table always.",
    ]],
    easier: ["رفعُ الكعبين وإنزالُهما بهدوء، أو الدبكُ الخفيف جالساً.", "Rising and lowering the heels gently, or light stamping in sitting."],
    harder: ["الدبكُ القويّ بالتناوب، ثمّ قفزاتٌ صغيرة في المكان، ثمّ القفزُ من درجةٍ منخفضة — لمن فُحص وخلا من كسر الفقرات.", "Firm alternating stamping, then small jumps on the spot, then stepping off a low step — for people screened and free of vertebral fractures."],
    stopIf: ["ألمٌ في الظهر أو الورك أو الركبة يزيد ⟵ عُد إلى الأسهل وأخبر الأخصائيّ؛ ألمٌ حادّ جديد في الظهر ⟵ توقّف وإلى الطبيب؛ خشونةٌ مؤلمة في الركبة ⟵ الصدمُ أخفّ.", "Back, hip or knee pain that increases → go back to the easier version and tell the specialist; new sharp back pain → stop and to the doctor; painful knee osteoarthritis → lighter impact."],
    equipment: ["طاولةٌ ثابتة أو المغسلة، وحذاءٌ مريح بنعلٍ لا ينزلق.", "A steady table or the sink, and comfortable shoes with non-slip soles."],
    doseNote: ["خمسون صدمةً فأكثر (٥ × ١٠) أكثرَ أيّام الأسبوع لمن ليس عنده كسرُ فقرة (Brooke-Wavell 2022).", "Fifty impacts or more (5 × 10) on most days for people without a vertebral fracture (Brooke-Wavell 2022)."],
    images: [{ key: "osteo-heel-drop-impact-1", ar: "صورتان لامرأةٍ كبيرة تضع يديها على طاولةٍ خشبية: واقفةٌ على قدميها ثمّ مرتفعةٌ على أصابعها قبل أن تُسقط كعبيها", en: "Two photos of an older woman with her hands on a wooden table: standing flat, then risen onto her toes before dropping her heels", search: "osteoporosis heel drop exercise" }],
  },
  {
    code: "osteo-tai-chi", nameAr: "التاي تشي للتوازن: حركاتٌ بطيئة بالوزن ينتقل والركبتان مثنيّتان", nameEn: "Tai Chi for balance: slow movements shifting weight with bent knees",
    kind: "balance", region: "whole_body", sets: 1, reps: 1,
    purpose: ["التاي تشي أنقص السقوطَ ١٩٪ وعددَ الساقطين ٢٠٪ (Sherrington 2019 · Huang 2017): ثلاثاً في الأسبوع ستّةَ أشهر قلّل السقوطَ المتعدّد ٥٥٪ (Li 2005)، وبرنامجُ «تاي جي تشوان» أنقص السقوطَ ٣١٪ أكثرَ من التمرين المتعدّد (Li 2018)؛ ومرّتين في الأسبوع ثلاثةَ عشرَ أسبوعاً لم ينفع (Logghe 2009) — فالجرعةُ ثلاثٌ في الأسبوع شهوراً. والإرشادُ يضيفه إلى التوازن والقوّة حين يمكن (Montero-Odasso 2022).",
      "Tai Chi reduced falls by 19% and fallers by 20% (Sherrington 2019 · Huang 2017): three times a week for six months reduced multiple falls by 55% (Li 2005), and the 'Tai Ji Quan' programme reduced falls 31% more than multimodal exercise (Li 2018); twice a week for thirteen weeks did not help (Logghe 2009) — so the dose is three a week for months. The guideline adds it to balance and strength where feasible (Montero-Odasso 2022)."],
    start: ["واقفٌ والقدمان بعرض الكتفين والركبتان مثنيّتان قليلاً، والذراعان مرتخيتان أمامه، وكرسيٌّ خلفه لمن يحتاج.", "Standing with feet shoulder-width apart and knees slightly bent, arms relaxed in front, with a chair behind for those who need it."],
    steps: [[
      "ابدأ بالتنفّس الهادئ والوقوف ثابتاً دقيقةً والركبتان مثنيّتان قليلاً.",
      "انقل وزنك ببطء إلى القدم اليمنى ثمّ اليسرى، ثمّ إلى الأمام والخلف.",
      "خطوةٌ بطيئة إلى الأمام على الكعب، وانقل الوزنَ إليها، ثمّ أعِدها.",
      "حرّك الذراعين ببطء مع الوزن: تمتدّ يدٌ إلى الأمام والأخرى إلى الأسفل، ثمّ بالعكس.",
      "اتبع المدرّبَ أو المقطعَ حركةً حركة، ٢٠–٤٥ دقيقة بحسب ما يتحمّل.",
    ], [
      "Begin with calm breathing, standing still for a minute with the knees slightly bent.",
      "Shift your weight slowly to the right foot, then the left, then forwards and back.",
      "Take a slow step forwards onto the heel, shift the weight onto it, then bring it back.",
      "Move the arms slowly with the weight: one hand reaches forward and the other down, then the reverse.",
      "Follow the instructor or video movement by movement, for 20–45 minutes as tolerated.",
    ]],
    cues: [[
      "الركبتان مقفلتان ⟵ مثنيّتان قليلاً طوال الوقت.",
      "حركةٌ سريعة ⟵ بطيئةٌ متّصلة مع النفَس.",
      "الوزنُ على القدمين معاً دائماً ⟵ ينتقل من قدمٍ إلى أخرى.",
      "مرّةٌ في الأسبوع ⟵ ثلاثٌ في الأسبوع فأكثر (Li 2005 · Logghe 2009).",
    ], [
      "Knees locked → slightly bent throughout.",
      "Fast movement → slow and continuous with the breath.",
      "Weight always on both feet → shifting from one foot to the other.",
      "Once a week → three times a week or more (Li 2005 · Logghe 2009).",
    ]],
    easier: ["جالساً على كرسيٍّ للذراعين والجذع، أو واقفاً ويدٌ على ظهر كرسيّ.", "Seated on a chair for the arms and trunk, or standing with a hand on the back of a chair."],
    harder: ["خطواتٌ أطول وأوضاعٌ أخفض، والتتابعُ كاملاً بلا توقّف، والتدريبُ مع مجموعة.", "Longer steps and lower stances, the whole sequence without stopping, and practising with a group."],
    stopIf: ["دوخةٌ أو ألمٌ في الركبة يزيد ⟵ توقّف واجلس؛ خفقانٌ أو ألمٌ في الصدر ⟵ توقّف وإلى الطبيب.", "Dizziness or increasing knee pain → stop and sit; palpitations or chest pain → stop and to the doctor."],
    equipment: ["مساحةٌ خالية، وكرسيٌّ للسند، ومقطعٌ مصوَّر أو مدرّب.", "A clear space, a chair for support, and a video or an instructor."],
    doseNote: ["ثلاثاً في الأسبوع فأكثر، ٢٠–٦٠ دقيقة، ستّةَ أشهرٍ فأكثر في المركز أو البيت أو مجموعة (Li 2005 · Li 2018).", "Three times a week or more, 20–60 minutes, for six months or more at the centre, at home or in a group (Li 2005 · Li 2018)."],
    images: [{ key: "osteo-tai-chi-1", ar: "امرأةٌ كبيرة بنظّارة وسترةٍ حمراء في حديقة، ركبتاها مثنيّتان ويدٌ ممدودةٌ إلى الأمام والأخرى منخفضة — وضعيةُ تاي تشي", en: "An older woman in glasses and a red jacket in a park, knees bent, one hand extended forward and the other low — a Tai Chi posture", search: "elderly tai chi balance falls prevention" }],
  },
  {
    code: "osteo-home-hazard-footwear", nameAr: "فحصُ البيت من مخاطر السقوط والحذاءُ الآمن", nameEn: "Checking the home for fall hazards and safe footwear",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["تعديلُ مخاطر البيت أنقص السقوطَ ٣٨٪ عند عالي الخطر ولم ينفع غيرَ المختارين (Clemson 2023)، وزيارةُ المعالج المختصّ أنفعُ من غيره (Pighills 2011 · Cumming 1999)، والدرابزينُ والإضاءةُ والأسطحُ غيرُ الزلقة أنقصت إصاباتِ السقوط ٢٦٪ (Keall 2015)؛ والحذاءُ الواطئ الثابت غيرُ الزلق أأمن من الجوارب والنعال (Menant 2008)، والعنايةُ بالقدم والحذاء أنقصت السقوطَ (Spink 2011). وفي المنطقة أكثرُ السقوط داخلَ البيت، والسلالمُ أوّلُ أماكنه (Alabdullgader 2021 · Kamel 2013 · Abolhassani 2006).",
      "Modifying home hazards reduced falls by 38% in people at high risk and did not help unselected people (Clemson 2023), with a visit by a trained therapist more effective (Pighills 2011 · Cumming 1999), and rails, lighting and non-slip surfaces reduced fall injuries by 26% (Keall 2015); low, firm, non-slip shoes are safer than socks and slippers (Menant 2008), and foot and footwear care reduced falls (Spink 2011). In the region most falls happen indoors, with stairs the commonest place (Alabdullgader 2021 · Kamel 2013 · Abolhassani 2006)."],
    start: ["المريضُ وأحدُ أهله مع الأخصائيّ، وقائمةُ الفحص، وصورٌ للبيت بالهاتف إن لم تكن زيارة.", "The person and a family member with the specialist, the checklist, and phone photos of the home if there is no visit."],
    steps: [[
      "الطريقُ: أزيلوا السجّادَ المنزلق والأسلاكَ والأغراضَ من ممرّات المشي، وثبّتوا حوافَّ البُسط.",
      "الإضاءة: نورٌ في الممرّ والدرج والحمّام ليلاً، ومصباحٌ يعمل بالبطارية بجانب السرير لانقطاع الكهرباء.",
      "الحمّامُ والمرحاض: مقبضٌ ثابت بجانب المرحاض والدوش، وسجّادةٌ غيرُ زلقة، وكرسيٌّ للاستحمام، ومقعدٌ مرتفع فوق المرحاض العربيّ.",
      "الدرج: درابزينٌ ثابت على الجانبين إن أمكن، وحافّةُ كلّ درجةٍ واضحة، ولا أغراضَ عليه.",
      "الجلوسُ والنوم: سريرٌ وكرسيٌّ بارتفاعٍ يسهل القيامُ منه بدل الأرض لمن صعب عليه النهوض.",
      "الحذاء: واطئُ الكعب، بنعلٍ غيرِ زلق، يثبت على القدم بشريط — لا النعالَ المفتوحة ولا الجواربَ وحدها.",
    ], [
      "Walkways: remove slippery rugs, cables and objects from walking paths, and fix the edges of mats.",
      "Lighting: light in the hallway, stairs and bathroom at night, and a battery lamp beside the bed for power cuts.",
      "Bathroom and toilet: a fixed grab rail beside the toilet and shower, a non-slip mat, a shower chair, and a raised seat over a squat toilet.",
      "Stairs: a fixed rail on both sides if possible, a clear edge on every step, and nothing left on them.",
      "Sitting and sleeping: a bed and chair at a height that is easy to rise from, instead of the floor for those who find rising hard.",
      "Shoes: low-heeled, with non-slip soles, held on the foot with a strap — not open slippers or socks alone.",
    ]],
    cues: [[
      "قائمةٌ تُعطى ولا تُنفَّذ ⟵ تغييرٌ واحد أو اثنان يُتّفق عليهما مع الأهل الآن.",
      "النعالُ المفتوحة في البيت ⟵ حذاءٌ ثابت غيرُ زلق.",
      "الحمّامُ بلا مقبض ⟵ مقبضٌ ثابت يُركَّب.",
      "الظلامُ ليلاً في الطريق إلى الحمّام ⟵ نورٌ ليليّ أو مصباحٌ بالبطارية.",
    ], [
      "A list handed over and never acted on → one or two changes agreed with the family now.",
      "Open slippers at home → firm non-slip shoes.",
      "A bathroom without a rail → a fixed rail fitted.",
      "Darkness at night on the way to the bathroom → a night light or battery lamp.",
    ]],
    easier: ["أهمُّ ثلاثة: لا سجّادَ منزلقاً، ونورٌ ليليّ، ومقبضٌ في الحمّام.", "The top three: no slippery rugs, a night light, and a bathroom rail."],
    harder: ["زيارةُ البيت نفسِه بقائمةٍ موثوقة من المعالج المختصّ (Pighills 2011)، ومراجعةُ ما تغيّر بعد شهر.", "A visit to the home itself with a validated checklist by a trained therapist (Pighills 2011), and a review of the changes a month later."],
    stopIf: ["لا ينطبق — وسقوطٌ جديد أو إصابة ⟵ تُراجَع الخطّةُ كلُّها وإلى الطبيب.", "Not applicable — a new fall or injury → the whole plan is reviewed and to the doctor."],
    equipment: ["قائمةُ فحص البيت، وصورُ الهاتف، ونموذجُ حذاءٍ آمن للعرض.", "The home checklist, phone photos, and a sample safe shoe to show."],
    doseNote: ["مرّةً في المرحلة الأولى، ومراجعةُ ما تغيّر في المرحلة الأخيرة وبعد أيّ سقوط.", "Once in the first phase, with a review of the changes in the last phase and after any fall."],
    images: [{ key: "osteo-home-hazard-footwear-1", ar: "رسمٌ لبيتٍ مقطوع تظهر غرفُه والحمّامُ والدرجُ والمطبخ، ونقاطٌ تشير إلى الأغراض والبُسط والإضاءة ومقابض الحمّام والدرابزين، وتحتها أثرُ حذاءٍ وعبارةٌ بالإنكليزية عن الحذاء الثابت غير الزلق", en: "A cross-section drawing of a house showing its rooms, bathroom, stairs and kitchen, with callouts to objects, mats, lighting, bathroom rails and stair handrails, and below it shoe prints and an English line about firm non-slip shoes", search: "fall proof your home infographic older adults" }],
  },
  {
    code: "osteo-safe-bending-lifting", nameAr: "الحركةُ الآمنة للظهر الهشّ: الانحناءُ من الوركين والركبتين والظهرُ مستقيم", nameEn: "Safe movement for a fragile spine: bending from the hips and knees with a straight back",
    kind: "functional", region: "lumbar", sets: 2, reps: 5, rest: 30,
    purpose: ["الثنيُ المتكرّر أو الطويل أو إلى آخر المدى تحت حمل يُجهد الفقرات الهشّة، فيُعدَّل أو يُتجنَّب — كتمرين رفع الجذع ولمس الأصابع — والتدويرُ الهادئ لا بأس به؛ والرسالةُ «كيف تفعل» لا «لا تفعل»: فكّر مستقيماً، وانحنِ من الورك، وتحرّك بهدوء (Brooke-Wavell 2022 · Giangregorio 2015). وفي ثلاث حالاتٍ كسرت تمارينُ الثني في اليوغا فقراتٍ هشّة (Sinaki 2013).",
      "Repeated, sustained or end-range flexion under load strains fragile vertebrae, so it is modified or avoided — such as sit-ups and toe touches — while smooth twisting is fine; the message is 'how to' rather than 'don't': think straight, hinge from the hip, move smoothly (Brooke-Wavell 2022 · Giangregorio 2015). In three cases yoga flexion exercises fractured fragile vertebrae (Sinaki 2013)."],
    start: ["واقفاً أمام غرضٍ على الأرض (حذاءٌ أو كيس)، والقدمان بعرض الوركين.", "Standing in front of an object on the floor (a shoe or a bag), feet hip-width apart."],
    steps: [[
      "قِف قريباً من الغرض، وقدمٌ أمام الأخرى قليلاً.",
      "انحنِ من الوركين واثنِ الركبتين — كأنّك تجلس — والظهرُ مستقيم والصدرُ إلى الأمام.",
      "أو انزل على ركبةٍ واحدة (وضعيةُ الطعنة) واليدُ الأخرى على الفخذ أو الطاولة.",
      "أمسك الغرضَ قريباً من جسمك، وقُم بدفع الساقين لا برفع الظهر.",
      "الحملُ الثقيل: يُقسَم، ويُحمل قريباً من الجسم، ويُستعان بمن يحمله.",
      "وفي اليوم: لبسُ الحذاء جالساً والقدمُ على كرسيٍّ صغير، والسعالُ والعطاسُ والظهرُ مسنود، والقيامُ من السرير بالتدحرج على الجنب.",
    ], [
      "Stand close to the object, one foot slightly in front of the other.",
      "Hinge from the hips and bend the knees — as if sitting — with the back straight and the chest forward.",
      "Or go down on one knee (a lunge position) with the other hand on the thigh or a table.",
      "Hold the object close to your body, and rise by pushing with the legs, not by lifting with the back.",
      "Heavy loads: split them, carry them close to the body, and get help to carry them.",
      "In the day: put shoes on seated with the foot on a small stool, cough and sneeze with the back supported, and get out of bed by rolling onto the side.",
    ]],
    cues: [[
      "الانحناءُ من الظهر والركبتان مستقيمتان ⟵ من الوركين والركبتين والظهرُ مستقيم.",
      "الغرضُ بعيدٌ عن الجسم ⟵ قريبٌ منه.",
      "رفعُ الجذع من الاستلقاء ولمسُ الأصابع ⟵ يُتركان (Brooke-Wavell 2022).",
      "«لا تتحرّك» ⟵ تحرّك بهذه الطريقة — والتدويرُ الهادئ مسموح.",
    ], [
      "Bending from the back with straight knees → from the hips and knees with a straight back.",
      "The object far from the body → close to it.",
      "Sit-ups and toe touches → dropped (Brooke-Wavell 2022).",
      "'Don't move' → move this way — and smooth twisting is allowed.",
    ]],
    easier: ["عصا الالتقاط لما على الأرض، والجلوسُ على كرسيٍّ للوصول إلى الأسفل.", "A reacher for things on the floor, and sitting on a chair to reach low."],
    harder: ["الانحناءُ من الورك بالعصا على الظهر (بطاقتُه)، ثمّ رفعُ ثقلٍ خفيف بالطريقة نفسها بإشراف.", "The hip hinge with a stick along the back (its card), then lifting a light weight the same way under supervision."],
    stopIf: ["ألمٌ حادّ مفاجئ في الظهر بعد انحناءٍ أو رفعٍ أو سعال ⟵ توقّف، وإلى الطبيب اليوم (قد يكون كسراً جديداً في فقرة — Gregson 2022).", "Sudden sharp back pain after bending, lifting or coughing → stop, and to the doctor the same day (it may be a new vertebral fracture — Gregson 2022)."],
    equipment: ["غرضٌ على الأرض (حذاءٌ أو كيس)، وكرسيٌّ صغير، وعصا التقاط.", "An object on the floor (a shoe or a bag), a small stool, and a reacher."],
    doseNote: ["تُدرَّب في المرحلة الأولى ٢ × ٥، ثمّ تُستعمل في كلّ انحناءٍ ورفعٍ يوميّ.", "Practised in the first phase at 2 × 5, then used in every daily bend and lift."],
    images: [{ key: "osteo-safe-bending-lifting-1", ar: "رسمان لشخصٍ يلتقط حذاءً من الأرض: في الأعلى ينحني من الخصر وعمودُه الفقريّ أحمرُ مقوّس، وفي الأسفل يثني الوركين والركبتين في وضعية الطعنة والظهرُ مستقيمٌ أخضر", en: "Two drawings of a person picking up a shoe from the floor: above, bending from the waist with the spine highlighted red and rounded; below, bending the hips and knees in a lunge with the back straight and highlighted green", search: "osteoporosis safe bending spine sparing hip hinge" }],
  },
  {
    code: "osteo-prayer-safe", nameAr: "الصلاةُ الآمنة مع الهشاشة وخطر السقوط: القيامُ بسند، والركوعُ من الورك، والكرسيُّ عند الحاجة", nameEn: "Safe prayer with osteoporosis and fall risk: standing with support, bowing from the hip, and a chair when needed",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["الصلاةُ لكثيرٍ من كبار السنّ قيامٌ وركوعٌ وسجودٌ وقيامٌ من الأرض خمسَ مرّاتٍ في اليوم — وكلُّها تحدٍّ للتوازن والظهر: والركوعُ المعدَّل بانحناءٍ من الورك أقلُّ حملاً على أسفل الظهر (AbouHassan 2010)، والسجودُ يخفض الضغطَ لحظةً فيكون القيامُ منه ببطء (Ahmad Rufa'i 2013)، والصيامُ عند من تجاوز الثمانين رفع درجةَ خطر السقوط (Basaran 2026). ولا دراسةَ للسجود مع الهشاشة (بحثٌ صفريّ) — والحكمُ الشرعيّ للمريض ومرجعه، والمعالجُ يساعد في الوضع الآمن.",
      "For many older people prayer is standing, bowing, prostrating and rising from the floor five times a day — all challenges to balance and the back: a modified bow hinging from the hip loads the lower back less (AbouHassan 2010), prostration lowers blood pressure briefly so rising from it is done slowly (Ahmad Rufa'i 2013), and fasting in people over eighty raised fall-risk scores (Basaran 2026). There is no study of prostration with osteoporosis (a documented zero result) — the religious ruling is the person's and their scholar's, and the therapist helps with a safe position."],
    start: ["على سجّادةٍ غيرِ زلقة، وكرسيٌّ ثابت أو حائطٌ بجانبه للسند.", "On a non-slip prayer mat, with a steady chair or a wall beside for support."],
    steps: [[
      "اسأله عمّا يريد في الصلاة، واترك الحكمَ الشرعيّ له ولمرجعه.",
      "القيام: القدمان بعرض الوركين، والكرسيُّ أو الحائطُ قريب.",
      "الركوع: انحناءٌ من الورك والظهرُ مستقيم والركبتان مرتخيتان قليلاً، بقدر ما يثبت — لا تقويسٌ للظهر.",
      "النزولُ إلى السجود والقيامُ منه: يدٌ على الكرسيّ، وركبةٌ ثمّ الأخرى، والقيامُ ببطء على مراحل والجلوسُ لحظةً قبل الوقوف.",
      "مَن به كسرٌ حديث في فقرةٍ أو ورك، أو يدوخ، أو يصعب عليه النهوض من الأرض: الصلاةُ على الكرسيّ والركوعُ والسجودُ إيماءً.",
      "في رمضان: الماءُ بعد الإفطار، والحذرُ عند القيام ظهراً، وإخبارُ الطبيب بالأدوية.",
    ], [
      "Ask what they want in prayer, and leave the religious ruling to them and their scholar.",
      "Standing: feet hip-width apart, with the chair or wall close by.",
      "Bowing: hinge from the hips with a straight back and slightly relaxed knees, as far as is stable — no rounding of the back.",
      "Going down to prostration and rising from it: one hand on the chair, one knee then the other, rising slowly in stages and sitting a moment before standing.",
      "A person with a recent vertebral or hip fracture, who gets dizzy, or who finds rising from the floor hard: prayer on the chair, with bowing and prostration by gesture.",
      "In Ramadan: water after breaking the fast, care when rising in the afternoon, and telling the doctor about medicines.",
    ]],
    cues: [[
      "القيامُ من السجود دفعةً واحدة ⟵ على مراحل ويدٌ على الكرسيّ.",
      "الركوعُ بتقويس الظهر ⟵ من الورك والظهرُ مستقيم (AbouHassan 2010).",
      "سجّادةٌ تنزلق على البلاط ⟵ غيرُ زلقة أو مثبّتة.",
      "المعالجُ يفتي ⟵ الحكمُ له ولمرجعه.",
    ], [
      "Rising from prostration in one go → in stages with a hand on the chair.",
      "Bowing with a rounded back → from the hip with a straight back (AbouHassan 2010).",
      "A mat that slides on the tiles → non-slip or fixed.",
      "The therapist giving rulings → the ruling is theirs and their scholar's.",
    ]],
    easier: ["الصلاةُ جالساً على الكرسيّ كلُّها، والقيامُ للتكبير وحده بجانب الكرسيّ إن أمكن.", "Praying seated on the chair throughout, standing only for the opening takbir beside the chair if possible."],
    harder: ["الصلاةُ قائماً كاملةً والقيامُ من السجود بلا سند — لمن ثبت توازنُه ونهوضُه.", "Praying fully standing and rising from prostration without support — for those whose balance and rising are secure."],
    stopIf: ["دوخةٌ عند القيام من السجود ⟵ اجلس، وقِس الضغطَ واقفاً ومستلقياً (هبوطٌ انتصابيّ — Gibbons 2017)؛ ألمٌ حادّ جديد في الظهر أو الورك ⟵ إلى الطبيب.", "Dizziness on rising from prostration → sit, and measure blood pressure lying and standing (orthostatic hypotension — Gibbons 2017); new sharp back or hip pain → to the doctor."],
    equipment: ["سجّادةٌ غيرُ زلقة، وكرسيٌّ ثابت بلا عجلات، وجهازُ ضغط.", "A non-slip prayer mat, a steady chair without wheels, and a blood pressure monitor."],
    doseNote: ["في جلستين أو ثلاثٍ من المرحلتين الأولى والأخيرة، ثمّ في كلّ صلاة.", "In two or three sessions of the first and last phases, then at every prayer."],
    images: [{ key: "osteo-prayer-safe-1", ar: "رجلٌ بثوب المستشفى الأخضر جالسٌ على كرسيٍّ بجانب السرير، يداه على ركبتيه ورأسُه وجذعُه منحنيان قليلاً إلى الأمام — السجودُ إيماءً على الكرسيّ", en: "A man in a green hospital gown sitting on a chair beside the bed, hands on his knees, head and trunk bent slightly forward — prostration by gesture on a chair", search: "prayer on chair sitting sujud gesture" }],
  },
  {
    code: "osteo-floor-rise", nameAr: "القيامُ من الأرض بعد السقوط بمساعدة كرسيّ، وخطّةُ مَن لا يستطيع", nameEn: "Getting up from the floor after a fall using a chair, and a plan for those who cannot",
    kind: "functional", region: "whole_body", sets: 1, reps: 2, rest: 120,
    purpose: ["البقاءُ على الأرض ساعةً فأكثر بعد السقوط علامةُ خطرٍ عالٍ (Montero-Odasso 2022): فوق التسعين عجز ٨٠٪ عن القيام بعد سقطةٍ واحدة على الأقلّ، وبقي ٣٠٪ ساعةً فأكثر، وارتبط ذلك بالإصابة الشديدة ودخول المستشفى ودور الرعاية، ولم يستعملوا أجهزةَ النداء (Fleming 2008)؛ والتدريبُ على القيام لم يثبت أثرُه بعد إلّا ميلاً مع التقوية (Burton 2020) — فيُدرَّب القيامُ وخطّةُ مَن لا يستطيع معاً.",
      "Lying on the floor for an hour or more after a fall marks high risk (Montero-Odasso 2022): in people over ninety, 80% could not get up after at least one fall and 30% lay for an hour or more, linked to serious injury, hospital admission and moves into care, and they did not use call alarms (Fleming 2008); training to get up has not yet shown a clear effect, only a trend with strengthening (Burton 2020) — so rising and a plan for those who cannot are practised together."],
    start: ["على فرشةٍ على الأرض بجانب كرسيٍّ ثابت مسنود إلى الحائط، والأخصائيُّ بجانبه، ويبدأ من الجلوس على الأرض لا من السقوط.", "On a mat on the floor beside a steady chair set against the wall, with the specialist alongside, starting from sitting on the floor, not from falling."],
    steps: [[
      "ابقَ هادئاً، وتأكّد أنّه لا ألمَ شديد ولا عجزَ عن تحريك ساق — وإن كان فلا تقُم: اطلب المساعدة.",
      "تدحرج على جنبك، ثمّ استند على مرفقيك، ثمّ على يديك وركبتيك.",
      "ازحف إلى كرسيٍّ ثابت، وضع ذراعيك على مقعده.",
      "قدّم قدماً واحدة وضعها مسطّحةً على الأرض.",
      "ادفع بذراعيك وساقيك، واستدر لتجلس على الكرسيّ، واسترح قبل أن تتحرّك.",
      "مَن لا يستطيع: نادِ أو استعمل الهاتفَ الذي معه، وتدفّأ بغطاء، وغيّر وضعَك كلَّ قليل، وأخبر الطبيبَ بالسقوط.",
    ], [
      "Stay calm, and make sure there is no severe pain or inability to move a leg — if there is, do not get up: call for help.",
      "Roll onto your side, then up onto your elbows, then onto your hands and knees.",
      "Crawl to a steady chair and place your arms on its seat.",
      "Bring one foot forward and place it flat on the floor.",
      "Push with your arms and legs, turn to sit on the chair, and rest before moving.",
      "A person who cannot: call out or use the phone they carry, keep warm with a cover, change position every so often, and tell the doctor about the fall.",
    ]],
    cues: [[
      "القيامُ مسرعاً بعد السقوط ⟵ هدوءٌ وفحصٌ أوّلاً.",
      "الهاتفُ في الغرفة الأخرى ⟵ معه دائماً، أو جرسٌ للنداء.",
      "القيامُ رغم ألمٍ شديد في الورك ⟵ لا قيام، والمساعدةُ والإسعاف.",
      "تدريبٌ وحده في البيت أوّلاً ⟵ مع الأخصائيّ ثمّ بحضور أحد الأهل.",
    ], [
      "Getting up in a hurry after a fall → calm and a check first.",
      "The phone in another room → always carried, or a call bell.",
      "Getting up despite severe hip pain → no rising, and help and an ambulance.",
      "Practising alone at home first → with the specialist, then with a family member present.",
    ]],
    easier: ["من الجلوس على كرسيٍّ منخفض أو درجة بدل الأرض، أو النزولُ إلى الركبتين والقيامُ منهما وحدهما.", "From sitting on a low chair or a step instead of the floor, or going down to kneeling and rising from there only."],
    harder: ["من الاستلقاء على الظهر، وبلا كرسيٍّ بجانبه (يزحف إليه)، وبزمنٍ يُقاس.", "From lying on the back, with no chair beside (crawling to it), and timed."],
    stopIf: ["دوخةٌ أو ألمٌ في الركبة أو الورك أو الظهر ⟵ توقّف وارجع إلى الأسهل؛ مَن استبدل الركبةَ أو الوركَ في الأسابيع الستّة الأخيرة ⟵ لا يُدرَّب إلّا بإذن جرّاحه وأخصائيّه.", "Dizziness or knee, hip or back pain → stop and go back to the easier version; a person who had a knee or hip replacement in the last six weeks → trained only with the surgeon's and specialist's permission."],
    equipment: ["فرشةٌ على الأرض، وكرسيٌّ ثابت بلا عجلات مسنودٌ إلى الحائط، وهاتفٌ أو جرسُ نداء.", "A floor mat, a steady chair without wheels set against the wall, and a phone or call bell."],
    doseNote: ["مرّتين في الجلسة في المرحلة الثانية، ثمّ في البيت بحضور أحد الأهل؛ وخطّةُ النداء تُكتب للجميع.", "Twice per session in the second phase, then at home with a family member present; the call plan is written for everyone."],
    images: [{ key: "osteo-floor-rise-1", ar: "ثمانيةُ رسومٍ مرقّمة لامرأةٍ كبيرة تقوم من الأرض: ممدّدةٌ ثمّ على مرفقيها ثمّ على يديها وركبتيها، تزحف إلى كرسيّ وتضع ذراعيها عليه وقدماً أمامها، ثمّ تدفع وتستدير لتجلس — والعباراتُ بالإنكليزية", en: "Eight numbered drawings of an older woman getting up from the floor: lying, then on her elbows, then on hands and knees, crawling to a chair, placing her arms on it and one foot forward, then pushing up and turning to sit — with English captions", search: "how to get up from a fall chair older adult leaflet" }],
  },
];

const PRACTICE_RULE_AR = "قاعدةُ الممارسة في كلّ تمرين: التوازنُ متحدٍّ — قاعدةٌ أضيق، ويدٌ أقلّ على السند، وحركةٌ أصعب كلّما ثبت — مع الأمان (السندُ قريب والأخصائيُّ أو المرافقُ بجانبه)، والقوّةُ متدرّجة حتى أثقل ما يُرفع ٨–١٢ مرّة، والصدمُ لمن ليس عنده كسرُ فقرة (Brooke-Wavell 2022 · Sherrington 2019)؛ والظهرُ مستقيمٌ في الانحناء والرفع، ولا ثنيَ للجذع تحت حمل ولا تمارينَ رفع الجذع ولمس الأصابع (Giangregorio 2015)؛ والمشيُ وحده لا ينقص السقوط (Ebrahim 1997 · Voukelatos 2015) فيأتي مع التوازن والقوّة؛ ويُقاس الضغطُ جالساً وواقفاً في الجلسة الأولى وعند الدوخة، ويُكتب كلُّ سقوطٍ في سجلّه.";
const PRACTICE_RULE_EN = "The practice rule for every exercise: balance is challenging — a narrower base, less hand on the support and a harder movement whenever steady — with safety (the support close and the specialist or companion alongside); strength is progressive up to the heaviest load lifted 8–12 times; impact is for those without a vertebral fracture (Brooke-Wavell 2022 · Sherrington 2019); the back stays straight in bending and lifting, with no loaded trunk flexion and no sit-ups or toe touches (Giangregorio 2015); walking alone does not reduce falls (Ebrahim 1997 · Voukelatos 2015), so it comes with balance and strength; blood pressure is measured sitting and standing at the first session and with dizziness, and every fall is recorded in the falls diary.";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد باثنتي عشرة جلسة (حتى ٣٦) لمن بقي عالي الخطر — سقط أثناء الكتلة، أو بقي النهوضُ والمشي فوق ١٥ ثانية أو سرعةُ المشي تحت ٠٫٨ م/ث (Montero-Odasso 2022)، أو بعد كسر الورك — وتقدّم بأصغر تغيّرٍ يُكتشف في بيرغ (Donoghue 2009) أو بـ٠٫١ م/ث في سرعة المشي (Perera 2006)؛ ومَن لم يتقدّم لا يُمدَّد: يُراجَع السببُ (الدوخة، والأدوية، والنظر، والألم، والإدراك، والخوف) مع الطبيب. ثمّ البرنامجُ المنزليّ ثلاثاً في الأسبوع حتى الأسبوع ٢٦ — فالأثرُ يحتاج أكثرَ من خمسين ساعة (Sherrington 2008) ويبقى حتى سنتين لمن استمرّ (Finnegan 2019) — ومراجعاتٌ في الأسابيع ٨ و١٢ و٢٦ ثمّ كلَّ سنة، فلم يستمرّ في التمرين بعد سنةٍ إلّا ٣٦٫٧٪ (Thomas 2010).";
const EXTEND_EN = "At session 24: one extension of twelve sessions (to 36) for a person who remains at high risk — fell during the block, still has a timed up and go above 15 seconds or a gait speed below 0.8 m/s (Montero-Odasso 2022), or is after a hip fracture — and has progressed by the minimal detectable change on Berg (Donoghue 2009) or by 0.1 m/s in gait speed (Perera 2006); a person who has not progressed is not extended: the reason (dizziness, medicines, vision, pain, cognition, fear) is reviewed with the doctor. Then the home programme three times a week to week 26 — the effect needs more than fifty hours (Sherrington 2008) and lasts up to two years in those who continue (Finnegan 2019) — with reviews at weeks 8, 12 and 26 and then yearly, as only 36.7% were still exercising after a year (Thomas 2010).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "osteoporosis-falls-geriatric",
  summary: [
    "هشاشةُ العظام: نقصُ كتلة العظم وتلفُ بنيته فيكسر من سقطةٍ من الوقوف أو أقلّ — الفقرةُ والرسغُ والورك — والسقوطُ هو ما يحوّل الهشاشةَ إلى كسر: يسقط ثلثُ مَن تجاوز الخامسة والستّين كلَّ سنة، وواحدٌ من ثمانيةٍ يبقى على الأرض أكثرَ من ساعة (Montero-Odasso 2022). وبعد كسر الفقرة يتضاعف خطرُ كسرٍ آخر خمسَ مرّات (LeBoff 2022a)، والكسرُ السابق يرفع الخطرَ قرابة ضعفين (Kanis 2004b)، والكسرُ يتكرّر عند ١٠٪ في سنة و٣١٪ في خمس (Balasubramanian 2019)، ووفاةُ كسر الورك أعلى من خمسة أضعافٍ في الأشهر الثلاثة الأولى (Haentjens 2010). " +
    "وفي العراق: في كركوك ٣٧٫٥٪ من ١٠٨٥ امرأةً بعد سنّ اليأس مصاباتٌ بالهشاشة و٤٤٫٦٪ بنقص الكثافة، مع قلّة الحركة والشمس والكالسيوم وكثرة الولادات (Ismael 2022)؛ ونموذجُ الخطر العراقيّ من سجلّات وزارتَي الصحّة (١٨٢٣٩ كسراً في الفخذ في ٢٠٢٢–٢٠٢٣) يجعل خطرَ كسر الورك في العمر نحو واحدةٍ من ١٨ امرأة (Abdulbari 2025)؛ وفي بغداد كان السقوطُ أكثرَ إصابات المدنيّين و٦٣٪ من الإصابات غير المقصودة بعد الخامسة والستّين، وتضاعفت إصاباتُه الشديدة ستّاً بين ٢٠٠٣ و٢٠١٣ (Stewart 2016)؛ ونقصُ فيتامين د شائع (دهوك وأربيل — Mohammed 2021 · Ameen 2023)، واللباسُ الساتر يقلّل الشمس (Odhaib 2021). ولا دراسةَ لانتشار السقوط في العراق ولا تجربةَ تمرين عراقية (بحثٌ صفريّ). " +
    "الإرشادات: يُسأل الجميعُ عن السقوط سنوياً بثلاثة أسئلة، ويُقيَّم المشيُ بسرعته (تحت ٠٫٨ م/ث) أو النهوضُ والمشي (فوق ١٥ ثانية)، ويُصنَّف الخطرُ منخفضاً ومتوسّطاً وعالياً، والتمرينُ ثلاثاً في الأسبوع فأكثر اثني عشرَ أسبوعاً فأكثر ويستمرّ (1A)، والتاي تشي والمقاومة يُضافان (Montero-Odasso 2022 · NICE NG249 2025)؛ ولكلّ مصابٍ بالهشاشة أو كسرٍ هشّ تقييمٌ للسقوط، والتمرينُ الحاملُ للوزن والتقويةُ توصيةٌ قويّة (Gregson 2022 · NICE NG259 2026)؛ واتّفاقُ التمرين: القوّةُ مرّتين إلى ثلاثٍ أسبوعياً بأثقل ما يُرفع ٨–١٢ مرّة، والصدمُ خمسون مرّةً أكثرَ الأيّام لمن ليس عنده كسرُ فقرة، والتوازنُ مرّتين فأكثر، وتمارينُ الظهر للوضعية، والحركةُ الآمنة (Brooke-Wavell 2022 · Giangregorio 2015)؛ والإرشادُ العربيّ مثلُه (Jassim 2017). " +
    "والجرعة: التمرينُ أنقص السقوطَ ٢٣٪ والكسورَ ٢٧٪، والتوازنُ مع المهامّ ٢٤٪ والأنواعُ المتعدّدة ٣٤٪ والتاي تشي ١٩٪ (Sherrington 2019)؛ والتوازنُ المتحدّي مع أكثر من ثلاث ساعاتٍ في الأسبوع أنقصه ٣٩٪ (Sherrington 2017)، وأكثرُ من خمسين ساعةً في المجموع أقوى (Sherrington 2008)؛ وأوتاغو في البيت أنقصه ٣٢–٣٥٪ (Robertson 2002 · Thomas 2010) ونفع في إيران (Dadgari 2016)؛ والتمرينُ البيتيّ بلا إشرافٍ بعد الخروج من المستشفى زاد السقوط (Sherrington 2014). والعظم: التمرينُ عالي الشدّة رفع كثافةَ الفقرات أكثر (Kistler-Fischbacher 2021a)، ومقاومةٌ وصدمٌ عاليا الشدّة مرّتين في الأسبوع ثمانيةَ أشهر بإشرافٍ رفعا كثافةَ الفقرات ٢٫٩٪ بلا كسرٍ جديد (Watson 2018 · Watson 2019). ولا تجربةَ لكتلةٍ يومية من أربعة أسابيع (بحثٌ صفريّ). " +
    "فالبروتوكول: ٢٤ جلسة بستٍّ في الأسبوع × ٥٠ دقيقة (أربعةُ أسابيع، نحو عشرين ساعة بإشراف)، وتمديدٌ واحد باثنتي عشرة لمن بقي عالي الخطر وتقدّم، ثمّ برنامجٌ منزليّ ثلاثاً في الأسبوع حتى الأسبوع ٢٦ ومراجعاتٌ في ٨ و١٢ و٢٦ ثمّ كلَّ سنة؛ بمساراتٍ بالخطر وحال العظم. والاهتزازُ للجسم كلّه أنقص السقوط في تجارب (Jepsen 2017 · Leung 2014) لكنّه ليس من أجهزة المركز. والعددُ اختيارٌ مكتوبٌ صريحاً وبندٌ لسليم.",
    "Osteoporosis: low bone mass and damaged structure, so bone breaks from a fall from standing height or less — the vertebra, wrist and hip — and falling is what turns osteoporosis into a fracture: a third of people over sixty-five fall every year, and one in eight lies on the floor for more than an hour (Montero-Odasso 2022). After a vertebral fracture the risk of another rises five-fold (LeBoff 2022a), a previous fracture almost doubles the risk (Kanis 2004b), refracture occurs in 10% within a year and 31% within five (Balasubramanian 2019), and hip-fracture mortality is over five times higher in the first three months (Haentjens 2010). " +
    "In Iraq: in Kirkuk 37.5% of 1,085 postmenopausal women had osteoporosis and 44.6% osteopenia, with little activity, sun and calcium and high parity (Ismael 2022); the Iraqi risk model built from both health ministries' records (18,239 femoral fractures in 2022–2023) puts the lifetime hip-fracture risk at about one in 18 women (Abdulbari 2025); in Baghdad falls were the commonest civilian injury and 63% of unintentional injuries after sixty-five, with serious fall injuries rising six-fold between 2003 and 2013 (Stewart 2016); vitamin D deficiency is common (Duhok and Erbil — Mohammed 2021 · Ameen 2023), and covering dress limits sun (Odhaib 2021). There is no study of fall prevalence in Iraq and no Iraqi exercise trial (a documented zero result). " +
    "Guidelines: everyone is asked about falls yearly with three questions, gait is assessed by its speed (below 0.8 m/s) or the timed up and go (above 15 seconds), risk is classed low, intermediate or high, and exercise is three times a week or more for twelve weeks or more and continued (1A), with Tai Chi and resistance added (Montero-Odasso 2022 · NICE NG249 2025); everyone with osteoporosis or a fragility fracture has a falls assessment, and weight-bearing and strengthening exercise is a strong recommendation (Gregson 2022 · NICE NG259 2026); the exercise consensus: strength two to three times weekly at the heaviest load lifted 8–12 times, fifty impacts on most days for those without a vertebral fracture, balance at least twice a week, back exercises for posture, and safe movement (Brooke-Wavell 2022 · Giangregorio 2015); the Arab guideline agrees (Jassim 2017). " +
    "Dose: exercise reduced falls by 23% and fractures by 27%, balance with functional tasks by 24%, multiple types by 34% and Tai Chi by 19% (Sherrington 2019); challenging balance with more than three hours a week reduced them by 39% (Sherrington 2017), and more than fifty hours in total was stronger (Sherrington 2008); Otago at home reduced them by 32–35% (Robertson 2002 · Thomas 2010) and worked in Iran (Dadgari 2016); unsupervised home exercise after hospital discharge increased falls (Sherrington 2014). For bone: high-intensity exercise raised spine density more (Kistler-Fischbacher 2021a), and high-intensity resistance and impact twice a week for eight months under supervision raised spine density by 2.9% with no new fracture (Watson 2018 · Watson 2019). No trial has tested a four-week daily block (a documented zero result). " +
    "So the protocol: 24 sessions at six a week × 50 minutes (four weeks, about twenty supervised hours), one extension of twelve for a person who remains at high risk and has progressed, then a home programme three times a week to week 26 with reviews at 8, 12 and 26 weeks and then yearly; with pathways by risk and bone status. Whole-body vibration reduced falls in trials (Jepsen 2017 · Leung 2014) but is not one of the centre's devices. The number is a stated service choice and an item for Saleem.",
  ],
  goals: [
    "• يتقدّم التوازن: بيرغ بأصغر تغيّرٍ يُكتشف لبدايته — ٤ نقاطٍ لمن بدأ ٤٥–٥٦، و٥ لـ٣٥–٤٤، و٧ لـ٢٥–٣٤ (Donoghue 2009) — وسرعةُ المشي +٠٫١ م/ث (Perera 2006)، والنهوضُ والمشي تحت ١٥ ثانية (Montero-Odasso 2022).\n" +
    "• تقوى الساقان: الجلوسُ والقيامُ ثلاثين ثانية يزيد (Jones 1999)، ويقلّ الخوفُ من السقوط (Halaweh 2016).\n" +
    "• لا سقوطَ بإصابة، ومَن سقط يعرف كيف يقوم أو كيف ينادي (Fleming 2008).\n" +
    "• يُؤدّي البرنامجَ المنزليّ ثلاثاً في الأسبوع وحده: توازنٌ وقوّةٌ وصدمٌ لمن يناسبه (Brooke-Wavell 2022).\n" +
    "• صحّةُ العظم في يد الطبيب: تقييمُ خطر الكسر والدواءُ وفيتامين د (Gregson 2022 · NICE NG259 2026)، والبيتُ معدَّل (Clemson 2023).",
    "• Balance improves: Berg by the minimal detectable change for its baseline — 4 points for a start of 45–56, 5 for 35–44 and 7 for 25–34 (Donoghue 2009) — gait speed +0.1 m/s (Perera 2006), and the timed up and go below 15 seconds (Montero-Odasso 2022).\n" +
    "• The legs grow stronger: the 30-second chair stand rises (Jones 1999), and concern about falling falls (Halaweh 2016).\n" +
    "• No injurious fall, and a person who falls knows how to get up or how to call for help (Fleming 2008).\n" +
    "• The home programme is done three times a week independently: balance, strength and impact where suitable (Brooke-Wavell 2022).\n" +
    "• Bone health is with the doctor: fracture-risk assessment, medicines and vitamin D (Gregson 2022 · NICE NG259 2026), and the home has been adapted (Clemson 2023).",
  ],
  assessment: [
    "في الجلسة الأولى، وتكملتُه في الجلسات ١–٣:\n" +
    "• الأسئلةُ الثلاثة: هل سقطتَ في السنة الماضية؟ هل تشعر بعدم الثبات واقفاً أو ماشياً؟ هل تخاف السقوط؟ (Montero-Odasso 2022).\n" +
    "• السقوط: عددُه في السنة، وكيف ومتى وأين، والإصابة، وهل بقي على الأرض ساعةً فأكثر، وهل فقد الوعي أو سبقه دوخةٌ أو خفقان (Montero-Odasso 2022 · Fleming 2008).\n" +
    "• العظم: كسرٌ بعد الخمسين من سقطةٍ خفيفة، ونقصُ الطول ٤ سم فأكثر، وانحناءُ الظهر، والكورتيزون ٥ ملغ فأكثر ثلاثةَ أشهر، وكسرُ الورك عند أحد الوالدين، ونقصُ الوزن، والتدخين، وفحصُ الكثافة إن وُجد، والدواء (NICE NG259 2026 · Gregson 2022)؛ وخطرُ الكسر بالنموذج العراقيّ عند الطبيب (Abdulbari 2025).\n" +
    "• الضغطُ مستلقياً ثمّ واقفاً بعد دقيقةٍ وثلاث: هبوطٌ ٢٠ انقباضيّاً أو ١٠ انبساطيّاً هبوطٌ انتصابيّ (Gibbons 2017)؛ والأدويةُ المسبّبة للسقوط (Seppala 2018a · Seppala 2018b)، والنظرُ، والقدمُ والحذاء، والإدراكُ، والمزاج، والدوار (NICE NG249 2025).\n" +
    "• المقاييس: النهوضُ والمشي — مزروع (فوق ١٥ ثانية خطرٌ عالٍ — Montero-Odasso 2022، ولا رقمَ واحد يكفي — Schoene 2013)؛ وبيرغ — مزروع (بنسخةٍ عربية — Alghwiri 2016؛ و٤٥ فأقلّ لا تكشف إلّا ربعَ الساقطين إلى نصفهم — Muir 2008)؛ والجلوسُ والقيامُ ثلاثين ثانية — مزروع (Jones 1999)؛ والخوفُ من السقوط — مزروع (بالعربية — Halaweh 2016)؛ وسرعةُ المشي (تحت ٠٫٨ م/ث خطر — Montero-Odasso 2022)؛ والإضافيةُ في بند سليم.\n" +
    "• التصنيف — يضبطه الأخصائيّ: منخفضُ الخطر (لا سقوط، أو سقوطٌ بلا اضطرابٍ في المشي) ⟵ التثقيفُ والتمرينُ العامّ وتمرينُ العظم؛ متوسّطُه (سقوطٌ مع اضطرابٍ في المشي أو التوازن) ⟵ التمرينُ الموجَّه؛ عاليه (سقوطٌ بإصابة، أو اثنان في السنة، أو ضعفٌ عامّ، أو بقاءٌ على الأرض ساعة، أو إغماءٌ مشتبه) ⟵ التقييمُ المتعدّد مع الطبيب ثمّ التمرينُ بإشراف (Montero-Odasso 2022).\n" +
    "• المسارُ بحال العظم: هشاشةٌ بلا كسر ⟵ القوّةُ المتدرّجة والصدم (ومقاومةٌ وصدمٌ عاليا الشدّة لمن فُحص — Watson 2018)؛ بعد كسر الفقرة أو انحناءٍ شديد ⟵ تحمّلُ عضلات الظهر يومياً والوضعيةُ والحركةُ الآمنة، والصدمُ لا أكثرَ من المشي السريع، والشدّةُ متوسّطة (Brooke-Wavell 2022 · Giangregorio 2015)؛ بعد كسر الورك ⟵ الحركةُ والمقاومةُ المتدرّجتان بإشراف (Fairhall 2022 · Diong 2016).\n" +
    "• يُعاد القياسُ في الجلسة ١٨ و٢٤، و٣٦ إن مُدّد، وفي كلّ مراجعة.",
    "At the first session, completed over sessions 1–3:\n" +
    "• The three questions: have you fallen in the past year? do you feel unsteady standing or walking? are you worried about falling? (Montero-Odasso 2022).\n" +
    "• Falls: how many in the year, how, when and where, any injury, whether the person lay on the floor for an hour or more, and whether there was loss of consciousness or preceding dizziness or palpitations (Montero-Odasso 2022 · Fleming 2008).\n" +
    "• Bone: a fracture after fifty from a minor fall, height loss of 4 cm or more, kyphosis, glucocorticoids of 5 mg or more for three months, a parental hip fracture, low weight, smoking, any density scan, and medicines (NICE NG259 2026 · Gregson 2022); fracture risk by the Iraqi model is with the doctor (Abdulbari 2025).\n" +
    "• Blood pressure lying, then standing after one and three minutes: a fall of 20 systolic or 10 diastolic is orthostatic hypotension (Gibbons 2017); fall-risk-increasing medicines (Seppala 2018a · Seppala 2018b), vision, feet and footwear, cognition, mood and vertigo (NICE NG249 2025).\n" +
    "• Measures: timed up and go — seeded (above 15 seconds is high risk — Montero-Odasso 2022, and no single cut-off suffices — Schoene 2013); Berg — seeded (with an Arabic version — Alghwiri 2016; 45 or less detects only a quarter to a half of fallers — Muir 2008); the 30-second chair stand — seeded (Jones 1999); concern about falling — seeded (in Arabic — Halaweh 2016); gait speed (below 0.8 m/s is risk — Montero-Odasso 2022); the additional ones are in Saleem's item.\n" +
    "• Stratification — the specialist sets the plan: low risk (no fall, or a fall without gait disturbance) → education, general exercise and bone exercise; intermediate (a fall with gait or balance impairment) → targeted exercise; high (an injurious fall, two in a year, frailty, an hour on the floor, or suspected syncope) → multifactorial assessment with the doctor, then supervised exercise (Montero-Odasso 2022).\n" +
    "• The pathway by bone status: osteoporosis without fracture → progressive strength and impact (with high-intensity resistance and impact for those screened — Watson 2018); after a vertebral fracture or marked kyphosis → daily back-extensor endurance, posture and safe movement, impact no harder than brisk walking, and moderate intensity (Brooke-Wavell 2022 · Giangregorio 2015); after a hip fracture → progressive mobility and resistance under supervision (Fairhall 2022 · Diong 2016).\n" +
    "• Remeasured at sessions 18 and 24, and 36 if extended, and at every review.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• التوازنُ المتحدّي في كلّ جلسة: أوتاغو (المشيُ بالكعب أمام الأصابع، وإلى الخلف والاستدارة، والوقوفُ على ساق) والتاي تشي والخطوةُ الإنقاذية والمشيُ مع مهمّةٍ ثانية (Campbell 1997 · Li 2018 · Mansfield 2015).\n" +
    "• القوّةُ المتدرّجة: الجلوسُ والقيام، والدرجة، والورك، ورفعُ الكعبين، حتى أثقل ما يُرفع ٨–١٢ مرّة (Brooke-Wavell 2022 · Sherrington 2019).\n" +
    "• العظم: الصدمُ خمسين مرّةً أكثرَ الأيّام لمن ليس عنده كسرُ فقرة، والمقاومةُ والصدمُ عاليا الشدّة بفحصٍ وإشراف لمن اختير (Watson 2018 · Martyn-St James 2009).\n" +
    "• الظهرُ والوضعية: تقويةُ عضلات الظهر الباسطة والكتفين، والحركةُ الآمنة في الانحناء والرفع (Sinaki 2002 · Giangregorio 2015).\n" +
    "• الحياةُ اليومية: القيامُ من الأرض وخطّةُ النداء، وفحصُ البيت والحذاء، والصلاةُ الآمنة (Fleming 2008 · Clemson 2023).\n" +
    PRACTICE_RULE_AR,
    "The phased programme and its cards are under 'Programme by phase'; in summary:\n" +
    "• Challenging balance in every session: Otago (heel-to-toe walking, backwards walking and turning, standing on one leg), Tai Chi, reactive stepping and dual-task walking (Campbell 1997 · Li 2018 · Mansfield 2015).\n" +
    "• Progressive strength: sit-to-stand, the step, the hip and heel raises, up to the heaviest load lifted 8–12 times (Brooke-Wavell 2022 · Sherrington 2019).\n" +
    "• Bone: fifty impacts on most days for those without a vertebral fracture, and high-intensity resistance and impact with screening and supervision for those selected (Watson 2018 · Martyn-St James 2009).\n" +
    "• Back and posture: back-extensor and shoulder strengthening, and safe movement in bending and lifting (Sinaki 2002 · Giangregorio 2015).\n" +
    "• Daily life: getting up from the floor and the call plan, checking the home and shoes, and safe prayer (Fleming 2008 · Clemson 2023).\n" +
    PRACTICE_RULE_EN,
  ],
  contraindications: [
    "قواعدُ إحالةٍ يطبّقها المعالج:\n" +
    "• في اليوم نفسه (الطوارئ): ألمٌ حادّ مفاجئ في الظهر بعد انحناءٍ أو رفعٍ أو سعالٍ أو سقطةٍ خفيفة (كسرٌ جديد في فقرة — Gregson 2022)؛ وألمٌ في الورك أو العجزُ عن الوقوف عليه بعد سقوط، أو ساقٌ قصيرة ملتفّة إلى الخارج (كسرُ الورك)؛ وسقوطٌ مع فقد الوعي أو ألمٍ في الصدر أو خفقان، أو سقوطٌ لا يذكره (إغماءٌ يُفحص كالإغماء — Montero-Odasso 2022)؛ وضربةٌ في الرأس مع مميّع الدم؛ وبقاءٌ على الأرض ساعةً فأكثر (Fleming 2008).\n" +
    "• إلى الطبيب لتقييم العظم والدواء: كلُّ كسرٍ هشّ بعد الخمسين، والكورتيزون ٥ ملغ فأكثر ثلاثةَ أشهر، ونقصُ الطول ٤ سم فأكثر أو انحناءُ الظهر (لتصوير الفقرات)، والسقوطُ مرّتين فأكثر في السنة (NICE NG259 2026 · Gregson 2022)؛ وإلى المختصّ: كسرُ فقرةٍ في السنتين الأخيرتين، أو كسران في الفقرات فأكثر، أو كثافةٌ −٣٫٥ فأقلّ (Gregson 2022).\n" +
    "• إلى الطبيب لأسباب السقوط: الهبوطُ الانتصابيّ ٢٠/١٠ فأكثر (Gibbons 2017)، والأدويةُ المسبّبة (المهدّئاتُ ومضادّاتُ الاكتئاب والذهان والمسكّناتُ الأفيونية ومضادّاتُ الصرع ومدرّاتُ البول، وكثرةُ الأدوية — Seppala 2018a · Seppala 2018b · de Vries 2018)، والنظرُ (إزالةُ الساد أنقصت السقوط — Harwood 2005)، والدوارُ عند الالتفات، وضعفُ الذاكرة، والقدم (Spink 2011)، وفيتامين د — ولا جرعاتٍ كبيرة متباعدة، فـ٥٠٠ ألف وحدة سنوياً زادت السقوطَ والكسور (Sanders 2010).\n" +
    "• إلى الطبيب أثناء علاج الهشاشة: ألمُ الفكّ أو عظمٌ مكشوف في الفمّ، أو ألمٌ جديد في الفخذ أو الأربية (آثارٌ نادرة لأدوية العظم — Khan 2015 · Shane 2014).\n" +
    "• إلى المعالج النفسيّ: خوفٌ من السقوط يبقى بعد التمرين (Drahota 2024 · NICE NG249 2025)، والاكتئاب (Abdal Qader 2013).\n" +
    "موانعُ الأجهزة والعلاج: لا شدَّ ولا تحريكَ قويّاً أو طقطقةً للعمود الفقريّ الهشّ — كُسرت فقرةٌ بكرسيّ تدليك (Jeon 2019)؛ ولا حرارةَ على جلدٍ ناقص الإحساس عند كبير السنّ والسكّريّ — حروقُ قِرب الماء الحارّ ارتفعت عندهم (Chu 2024)؛ ولا مغناطيسَ مع منظّم القلب أو جهازٍ مزروع بلا إذن الطبيب.",
    "Referral rules the therapist applies:\n" +
    "• Same day (emergency): sudden sharp back pain after bending, lifting, coughing or a minor fall (a new vertebral fracture — Gregson 2022); hip pain or inability to bear weight after a fall, or a short, externally rotated leg (hip fracture); a fall with loss of consciousness, chest pain or palpitations, or a fall the person cannot remember (investigated as syncope — Montero-Odasso 2022); a head injury on blood thinners; and an hour or more on the floor (Fleming 2008).\n" +
    "• To the doctor for bone and medicine assessment: any fragility fracture after fifty, glucocorticoids of 5 mg or more for three months, height loss of 4 cm or more or kyphosis (for vertebral imaging), and two or more falls in a year (NICE NG259 2026 · Gregson 2022); to a specialist: a vertebral fracture in the last two years, two or more vertebral fractures, or a T-score of −3.5 or below (Gregson 2022).\n" +
    "• To the doctor for causes of falling: orthostatic hypotension of 20/10 or more (Gibbons 2017), causative medicines (sedatives, antidepressants, antipsychotics, opioids, antiepileptics, diuretics and polypharmacy — Seppala 2018a · Seppala 2018b · de Vries 2018), vision (cataract surgery reduced falls — Harwood 2005), vertigo on turning, poor memory, the feet (Spink 2011), and vitamin D — with no large intermittent doses, as 500,000 units yearly increased falls and fractures (Sanders 2010).\n" +
    "• To the doctor during osteoporosis treatment: jaw pain or exposed bone in the mouth, or new thigh or groin pain (rare effects of bone medicines — Khan 2015 · Shane 2014).\n" +
    "• To a psychologist: concern about falling that persists after exercise (Drahota 2024 · NICE NG249 2025), and depression (Abdal Qader 2013).\n" +
    "Contraindications to devices and treatment: no traction and no forceful mobilisation or manipulation of a fragile spine — a vertebra was fractured by a massage chair (Jeon 2019); no heat on skin with reduced sensation in an older or diabetic person — hot-water-bottle burns have risen in older people (Chu 2024); no magnetic therapy with a pacemaker or other implant without the doctor's permission.",
  ],
  precautions: [
    "• قاعدةُ الممارسة في «التمارين» لكلّ المراحل.\n" +
    "• بعد كسر الفقرة: لا ثنيَ للجذع طويلاً أو متكرّراً أو إلى آخر المدى تحت حمل، والتدويرُ الهادئ مسموح، والصدمُ لا أكثر من المشي السريع، والشدّةُ متوسّطة، والرسالةُ «كيف» لا «لا» (Brooke-Wavell 2022 · Giangregorio 2015)؛ وفي تجارب التمرين بعد الكسر كُسر ضلعٌ ونحوه أربعَ مرّات (Gibbs 2019).\n" +
    "• المقاومةُ والصدمُ عاليا الشدّة بفحصٍ قبلها وإشرافٍ قريب وتعليمِ الطريقة أوّلاً (Watson 2018 · Watson 2019).\n" +
    "• البيتُ بإشراف: التمرينُ البيتيّ وحده بعد الخروج من المستشفى زاد السقوط (Sherrington 2014) — فيُتعلَّم في المركز، ويحضره أحدُ الأهل، ويُراجَع.\n" +
    "• المشيُ وحده لا يكفي، وزاد السقوطَ في تجربة (Ebrahim 1997)؛ وواقيات الورك لا تنفع في البيت (Santesso 2014).\n" +
    "• البيتُ العراقيّ: السلالمُ أوّلُ أماكن السقوط في المنطقة (Kamel 2013 · Abolhassani 2006)، والجلوسُ والنومُ على الأرض والمرحاضُ العربيّ يصعّبان النهوض — فالسريرُ والكرسيُّ والمقعدُ المرتفع والمقبض؛ ونورٌ بالبطارية لانقطاع الكهرباء؛ ولا دراسةَ للسقوط من السطوح في العراق (بحثٌ صفريّ).\n" +
    "• الحرُّ ورمضان: الحرُّ يرفع دخولَ المستشفى بالجفاف (Bobb 2014)، والصيامُ بعد الثمانين رفع درجةَ خطر السقوط (Basaran 2026) — فالماءُ والجلسةُ في وقتٍ مناسب وقياسُ الضغط.\n" +
    "• فيتامين د والشمس: النقصُ شائع واللباسُ الساتر يقلّل الشمس (Odhaib 2021 · Chakhtoura 2018)، والشمسُ وحدها لا تكفي (Al-Daghri 2016) — والجرعةُ للطبيب.\n" +
    "• الأهل: يحضرون ويتعلّمون القيامَ من الأرض والبرنامج، ورأيُ المرافق مع ضعف الذاكرة (Montero-Odasso 2022)؛ والحجامةُ والأعشاب يُسأل عنها بلا لوم (Baharith 2019).\n" +
    "• الصلاة: بسندٍ وانحناءٍ من الورك، والكرسيُّ عند الحاجة، والحكمُ الشرعيّ للمريض ومرجعه (بطاقتُها) — لا دراسةَ للسجود مع الهشاشة (بحثٌ صفريّ).\n" +
    "• الصورُ والفيديو بموافقته المكتوبة وحدها، ولا تُرسل خارجَ ملفّه.",
    "• The practice rule under 'Exercises' for every phase.\n" +
    "• After a vertebral fracture: no sustained, repeated or end-range loaded trunk flexion, smooth twisting allowed, impact no harder than brisk walking, moderate intensity, and the message 'how to', not 'don't' (Brooke-Wavell 2022 · Giangregorio 2015); in exercise trials after fracture a rib and similar fractures occurred four times (Gibbs 2019).\n" +
    "• High-intensity resistance and impact only with screening beforehand, close supervision and technique taught first (Watson 2018 · Watson 2019).\n" +
    "• Home with supervision: home exercise alone after hospital discharge increased falls (Sherrington 2014) — so it is learnt at the centre, a family member attends, and it is reviewed.\n" +
    "• Walking alone is not enough and increased falls in one trial (Ebrahim 1997); hip protectors do not help at home (Santesso 2014).\n" +
    "• The Iraqi home: stairs are the commonest place of falls in the region (Kamel 2013 · Abolhassani 2006), and sitting and sleeping on the floor and the squat toilet make rising harder — so a bed, a chair, a raised seat and a rail; a battery light for power cuts; and there is no study of falls from roofs in Iraq (a documented zero result).\n" +
    "• Heat and Ramadan: heat raises hospital admission for dehydration (Bobb 2014), and fasting after eighty raised fall-risk scores (Basaran 2026) — so water, a well-timed session and blood pressure checks.\n" +
    "• Vitamin D and sun: deficiency is common and covering dress limits sun (Odhaib 2021 · Chakhtoura 2018), and sun alone is not enough (Al-Daghri 2016) — the dose is for the doctor.\n" +
    "• The family: they attend and learn getting up from the floor and the programme, with the carer's view when memory is poor (Montero-Odasso 2022); cupping and herbs are asked about without blame (Baharith 2019).\n" +
    "• Prayer: with support and a hip-hinged bow, a chair when needed, and the religious ruling for the person and their scholar (its card) — no study of prostration with osteoporosis (a documented zero result).\n" +
    "• Photos and video only with the person's written consent, and never sent outside the file.",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "World guidelines for falls prevention and management for older adults: a global initiative", org: "Age Ageing — World Guidelines for Falls Prevention and Management for Older Adults (Montero-Odasso et al.)", year: 2022, url: "https://doi.org/10.1093/ageing/afac205" },
    { title: "Falls: assessment and prevention in older people and in people 50 and over at higher risk (NICE guideline NG249)", org: "NICE guideline NG249 — National Institute for Health and Care Excellence (falls)", year: 2025, url: "https://www.nice.org.uk/guidance/ng249/chapter/Recommendations" },
    { title: "Osteoporosis: risk assessment (NICE guideline NG259; replaces CG146)", org: "NICE guideline NG259 — National Institute for Health and Care Excellence (osteoporosis risk assessment)", year: 2026, url: "https://www.nice.org.uk/guidance/ng259/chapter/Fragility-fracture-risk-assessment" },
    { title: "UK clinical guideline for the prevention and treatment of osteoporosis", org: "Arch Osteoporos — UK clinical guideline for osteoporosis, NOGG (Gregson et al.)", year: 2022, url: "https://doi.org/10.1007/s11657-022-01061-5" },
    { title: "Strong, steady and straight: UK consensus statement on physical activity and exercise for osteoporosis", org: "Br J Sports Med — Royal Osteoporosis Society exercise consensus, Strong Steady and Straight (Brooke-Wavell et al.)", year: 2022, url: "https://doi.org/10.1136/bjsports-2021-104634" },
    { title: "Too Fit To Fracture: outcomes of a Delphi consensus process on physical activity and exercise recommendations for adults with osteoporosis with or without vertebral fractures", org: "Osteoporos Int — Too Fit To Fracture outcomes of a Delphi consensus (Giangregorio et al.)", year: 2015, url: "https://doi.org/10.1007/s00198-014-2881-4" },
    { title: "The clinician's guide to prevention and treatment of osteoporosis", org: "Osteoporos Int — Bone Health & Osteoporosis Foundation clinician's guide (LeBoff et al.)", year: 2022, url: "https://doi.org/10.1007/s00198-021-05900-y" },
    { title: "Pan Arab Osteoporosis Society Guidelines for Osteoporosis Management", org: "Mediterr J Rheumatol — Pan Arab Osteoporosis Society guideline (Jassim et al.)", year: 2017, url: "https://doi.org/10.31138/mjr.28.1.27" },
    { title: "Exercise for preventing falls in older people living in the community", org: "Cochrane Database Syst Rev (Sherrington et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd012424.pub2" },
    { title: "Exercise to prevent falls in older adults: an updated systematic review and meta-analysis", org: "Br J Sports Med (Sherrington et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-096547" },
    { title: "Risk factors and Prevalence of Osteoporosis amidst Postmenopausal females turning up the Diabetes and Endocrinology clinic at Azadi Teaching Hospital at Kirkuk /Iraq", org: "Kirkuk J Med Sci (Ismael et al.)", year: 2022, url: "https://doi.org/10.32894/kjms.2022.174641" },
    { title: "Fall injuries in Baghdad from 2003 to 2014: Results of a randomised household cluster survey", org: "Injury (Stewart et al.)", year: 2016, url: "https://doi.org/10.1016/j.injury.2015.11.006" },
    { title: "Epidemiology of hip fracture in Iraq and development of a country-specific FRAX model", org: "Arch Osteoporos (Abdulbari et al.)", year: 2025, url: "https://doi.org/10.1007/s11657-025-01631-3" },
    { title: "How much change is true change? The minimum detectable change of the Berg Balance Scale in elderly people", org: "J Rehabil Med (Donoghue et al.)", year: 2009, url: "https://doi.org/10.2340/16501977-0337" },
    { title: "Meaningful change and responsiveness in common physical performance measures in older adults", org: "J Am Geriatr Soc (Perera et al.)", year: 2006, url: "https://doi.org/10.1111/j.1532-5415.2006.00701.x" },
    { title: "Randomised controlled trial of a general practice programme of home based exercise to prevent falls in elderly women", org: "BMJ (Campbell et al.)", year: 1997, url: "https://doi.org/10.1136/bmj.315.7115.1065" },
    { title: "Preventing injuries in older people by preventing falls: a meta-analysis of individual-level data", org: "J Am Geriatr Soc (Robertson et al.)", year: 2002, url: "https://doi.org/10.1046/j.1532-5415.2002.50218.x" },
    { title: "Does the 'Otago exercise programme' reduce mortality and falls in older adults?: a systematic review and meta-analysis", org: "Age Ageing (Thomas et al.)", year: 2010, url: "https://doi.org/10.1093/ageing/afq102" },
    { title: "Randomized Control Trials on Otago Exercise Program (OEP) to Reduce Falls Among Elderly Community Dwellers in Shahroud, Iran", org: "Iran Red Crescent Med J (Dadgari et al.)", year: 2016, url: "https://doi.org/10.5812/ircmj.26340" },
    { title: "Prevalence and Risk Factors of Falls Among the Elderly in Unaizah City, Saudi Arabia", org: "Sultan Qaboos Univ Med J (Alabdullgader et al.)", year: 2021, url: "https://doi.org/10.18295/squmj.2021.21.01.012" },
    { title: "Incidence and characteristics of falls leading to hip fracture in Iranian population", org: "Bone (Abolhassani et al.)", year: 2006, url: "https://doi.org/10.1016/j.bone.2006.01.144" },
    { title: "Stronger back muscles reduce the incidence of vertebral fractures: a prospective 10 year follow-up of postmenopausal women", org: "Bone (Sinaki et al.)", year: 2002, url: "https://doi.org/10.1016/s8756-3282(02)00739-1" },
    { title: "Effect of low-intensity back exercise on quality of life and back extensor strength in patients with osteoporosis: a randomized controlled trial", org: "Osteoporos Int (Hongo et al.)", year: 2007, url: "https://doi.org/10.1007/s00198-007-0398-9" },
    { title: "Targeted spine strengthening exercise and posture training program to reduce hyperkyphosis in older adults: results from the study of hyperkyphosis, exercise, and function (SHEAF) randomized controlled trial", org: "Osteoporos Int (Katzman et al.)", year: 2017, url: "https://doi.org/10.1007/s00198-017-4109-x" },
    { title: "Exercise for improving outcomes after osteoporotic vertebral fracture", org: "Cochrane Database Syst Rev (Gibbs et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd008618.pub3" },
    { title: "A meta-analysis of impact exercise on postmenopausal bone loss: the case for mixed loading exercise programmes", org: "Br J Sports Med (Martyn-St James et al.)", year: 2009, url: "https://doi.org/10.1136/bjsm.2008.052704" },
    { title: "Effect of impact exercise on bone mineral density in elderly women with low BMD: a population-based randomized controlled 30-month intervention", org: "Osteoporos Int (Korpelainen et al.)", year: 2006, url: "https://doi.org/10.1007/s00198-005-1924-2" },
    { title: "Systematic review and meta-analysis: Tai Chi for preventing falls in older adults", org: "BMJ Open (Huang et al.)", year: 2017, url: "https://doi.org/10.1136/bmjopen-2016-013661" },
    { title: "Tai Chi and fall reductions in older adults: a randomized controlled trial", org: "J Gerontol A Biol Sci Med Sci (Li et al.)", year: 2005, url: "https://doi.org/10.1093/gerona/60.2.187" },
    { title: "Effectiveness of a Therapeutic Tai Ji Quan Intervention vs a Multimodal Exercise Intervention to Prevent Falls Among Older Adults at High Risk of Falling: A Randomized Clinical Trial", org: "JAMA Intern Med (Li et al.)", year: 2018, url: "https://doi.org/10.1001/jamainternmed.2018.3915" },
    { title: "Lack of effect of Tai Chi Chuan in preventing falls in elderly people living at home: a randomized clinical trial", org: "J Am Geriatr Soc (Logghe et al.)", year: 2009, url: "https://doi.org/10.1111/j.1532-5415.2008.02064.x" },
    { title: "Environmental interventions for preventing falls in older people living in the community", org: "Cochrane Database Syst Rev (Clemson et al.)", year: 2023, url: "https://doi.org/10.1002/14651858.cd013258.pub2" },
    { title: "Environmental assessment and modification to prevent falls in older people", org: "J Am Geriatr Soc (Pighills et al.)", year: 2011, url: "https://doi.org/10.1111/j.1532-5415.2010.03221.x" },
    { title: "Home visits by an occupational therapist for assessment and modification of environmental hazards: a randomized trial of falls prevention", org: "J Am Geriatr Soc (Cumming et al.)", year: 1999, url: "https://doi.org/10.1111/j.1532-5415.1999.tb01556.x" },
    { title: "Home modifications to reduce injuries from falls in the home injury prevention intervention (HIPI) study: a cluster-randomised controlled trial", org: "Lancet (Keall et al.)", year: 2015, url: "https://doi.org/10.1016/s0140-6736(14)61006-0" },
    { title: "Optimizing footwear for older people at risk of falls", org: "J Rehabil Res Dev (Menant et al.)", year: 2008, url: "https://doi.org/10.1682/jrrd.2007.10.0168" },
    { title: "Effectiveness of a multifaceted podiatry intervention to prevent falls in community dwelling older people with disabling foot pain: randomised controlled trial", org: "BMJ (Spink et al.)", year: 2011, url: "https://doi.org/10.1136/bmj.d3411" },
    { title: "Risk factors of falls among elderly living in urban Suez--Egypt", org: "Pan Afr Med J (Kamel et al.)", year: 2013, url: "https://doi.org/10.11604/pamj.2013.14.26.1609" },
    { title: "Yoga spinal flexion positions and vertebral compression fracture in osteopenia or osteoporosis of spine: case series", org: "Pain Pract (Sinaki)", year: 2013, url: "https://doi.org/10.1111/j.1533-2500.2012.00545.x" },
    { title: "Can postural modification reduce kinetic and kinematic loading during the bowing postures of Islamic prayer?", org: "Ergonomics (AbouHassan et al.)", year: 2010, url: "https://doi.org/10.1080/00140139.2010.532881" },
    { title: "Cardiovascular Responses during Head-Down Crooked Kneeling Position Assumed in Muslim Prayers", org: "Iran J Med Sci (Ahmad Rufa'i et al.)", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/24031108/" },
    { title: "Ramadan fasting and circadian ambulatory blood pressure patterns in adults aged ≥ 80 years", org: "BMC Geriatr (Başaran et al.)", year: 2026, url: "https://doi.org/10.1186/s12877-026-07695-1" },
    { title: "The recommendations of a consensus panel for the screening, diagnosis, and treatment of neurogenic orthostatic hypotension and associated supine hypertension", org: "J Neurol (Gibbons)", year: 2017, url: "https://doi.org/10.1007/s00415-016-8375-x" },
    { title: "Inability to get up after falling, subsequent time on floor, and summoning help: prospective cohort study in people over 90", org: "BMJ (Fleming et al.)", year: 2008, url: "https://doi.org/10.1136/bmj.a2227" },
    { title: "Are interventions effective in improving the ability of older adults to rise from the floor independently? A mixed method systematic review", org: "Disabil Rehabil (Burton et al.)", year: 2020, url: "https://doi.org/10.1080/09638288.2018.1508509" },
    { title: "Randomized placebo-controlled trial of brisk walking in the prevention of postmenopausal osteoporosis", org: "Age Ageing (Ebrahim et al.)", year: 1997, url: "https://doi.org/10.1093/ageing/26.4.253" },
    { title: "The impact of a home-based walking programme on falls in older people: the Easy Steps randomised controlled trial", org: "Age Ageing (Voukelatos et al.)", year: 2015, url: "https://doi.org/10.1093/ageing/afu186" },
    { title: "Effective exercise for the prevention of falls: a systematic review and meta-analysis", org: "J Am Geriatr Soc (Sherrington et al.)", year: 2008, url: "https://doi.org/10.1111/j.1532-5415.2008.02014.x" },
    { title: "Long-term follow-up of exercise interventions aimed at preventing falls in older people living in the community: a systematic review and meta-analysis", org: "Physiotherapy (Finnegan et al.)", year: 2019, url: "https://doi.org/10.1016/j.physio.2018.09.002" },
    { title: "A meta-analysis of previous fracture and subsequent fracture risk", org: "Bone (Kanis et al.)", year: 2004, url: "https://doi.org/10.1016/j.bone.2004.03.024" },
    { title: "Risk of subsequent fracture after prior fracture among older women", org: "Osteoporos Int (Balasubramanian et al.)", year: 2019, url: "https://doi.org/10.1007/s00198-018-4732-1" },
    { title: "Meta-analysis: excess mortality after hip fracture among older women and men", org: "Ann Intern Med (Haentjens et al.)", year: 2010, url: "https://doi.org/10.7326/0003-4819-152-6-201003160-00008" },
    { title: "Prevalence of Vitamin D deficiency and associated risk factors among General Populations in Duhok province, Kurdistan Region, Iraq: Prevalence of Vitamin D deficiency in Duhok Province, Iraq", org: "Journal of Contemporary Medical Sciences (Mohammed et al.)", year: 2021, url: "https://doi.org/10.22317/jcms.v7i6.1073" },
    { title: "Prevalence and determinants of vitamin D deficiency amongst patients in Erbil, Kurdistan region of Iraq", org: "Journal of Clinical Medicine of Kazakhstan (Ameen et al.)", year: 2023, url: "https://doi.org/10.23950/jcmk/13310" },
    { title: "Vitamin D Metabolic Profiles in Premenopausal Women Wearing Niqab and Hijab in Sunny Basrah", org: "Cureus (Odhaib et al.)", year: 2021, url: "https://doi.org/10.7759/cureus.14909" },
    { title: "A post-hospital home exercise program improved mobility but increased falls in older people: a randomised controlled trial", org: "PLoS One (Sherrington et al.)", year: 2014, url: "https://doi.org/10.1371/journal.pone.0104412" },
    { title: "The effect of exercise intensity on bone in postmenopausal women (part 1): A systematic review", org: "Bone (Kistler-Fischbacher et al.)", year: 2021, url: "https://doi.org/10.1016/j.bone.2020.115696" },
    { title: "High-Intensity Resistance and Impact Training Improves Bone Mineral Density and Physical Function in Postmenopausal Women With Osteopenia and Osteoporosis: The LIFTMOR Randomized Controlled Trial", org: "J Bone Miner Res (Watson et al.)", year: 2018, url: "https://doi.org/10.1002/jbmr.3284" },
    { title: "High-intensity exercise did not cause vertebral fractures and improves thoracic kyphosis in postmenopausal women with low to very low bone mass: the LIFTMOR trial", org: "Osteoporos Int (Watson et al.)", year: 2019, url: "https://doi.org/10.1007/s00198-018-04829-z" },
    { title: "Effect of whole-body vibration exercise in preventing falls and fractures: a systematic review and meta-analysis", org: "BMJ Open (Jepsen et al.)", year: 2017, url: "https://doi.org/10.1136/bmjopen-2017-018342" },
    { title: "Effects of 18-month low-magnitude high-frequency vibration on fall rate and fracture risks in 710 community elderly--a cluster-randomized controlled trial", org: "Osteoporos Int (Leung et al.)", year: 2014, url: "https://doi.org/10.1007/s00198-014-2693-6" },
    { title: "A 30-s chair-stand test as a measure of lower body strength in community-residing older adults", org: "Res Q Exerc Sport (Jones et al.)", year: 1999, url: "https://doi.org/10.1080/02701367.1999.10608028" },
    { title: "Cross-Cultural Adaptation, Validity and Reliability of the Arabic Version of the Falls Efficacy Scale-International (FES-I)", org: "Med Princ Pract (Halaweh et al.)", year: 2016, url: "https://doi.org/10.1159/000441128" },
    { title: "Fall-Risk-Increasing Drugs: A Systematic Review and Meta-Analysis: II. Psychotropics", org: "J Am Med Dir Assoc (Seppala et al.)", year: 2018, url: "https://doi.org/10.1016/j.jamda.2017.12.098" },
    { title: "Fall-Risk-Increasing Drugs: A Systematic Review and Meta-analysis: III. Others", org: "J Am Med Dir Assoc (Seppala et al.)", year: 2018, url: "https://doi.org/10.1016/j.jamda.2017.12.099" },
    { title: "Discriminative ability and predictive validity of the timed up and go test in identifying older people who fall: systematic review and meta-analysis", org: "J Am Geriatr Soc (Schoene et al.)", year: 2013, url: "https://doi.org/10.1111/jgs.12106" },
    { title: "The activities-specific balance confidence scale and berg balance scale: Reliability and validity in Arabic-speaking vestibular patients", org: "J Vestib Res (Alghwiri et al.)", year: 2016, url: "https://doi.org/10.3233/ves-160568" },
    { title: "Use of the Berg Balance Scale for predicting multiple falls in community-dwelling elderly people: a prospective study", org: "Phys Ther (Muir et al.)", year: 2008, url: "https://doi.org/10.2522/ptj.20070251" },
    { title: "Interventions for improving mobility after hip fracture surgery in adults", org: "Cochrane Database Syst Rev (Fairhall et al.)", year: 2022, url: "https://doi.org/10.1002/14651858.cd001704.pub5" },
    { title: "Structured exercise improves mobility after hip fracture: a meta-analysis with meta-regression", org: "Br J Sports Med (Diong et al.)", year: 2016, url: "https://doi.org/10.1136/bjsports-2014-094465" },
    { title: "Does perturbation-based balance training prevent falls? Systematic review and meta-analysis of preliminary randomized controlled trials", org: "Phys Ther (Mansfield et al.)", year: 2015, url: "https://doi.org/10.2522/ptj.20140090" },
    { title: "Fall-Risk-Increasing Drugs: A Systematic Review and Meta-Analysis: I. Cardiovascular Drugs", org: "J Am Med Dir Assoc (de Vries et al.)", year: 2018, url: "https://doi.org/10.1016/j.jamda.2017.12.013" },
    { title: "Falls and health status in elderly women following first eye cataract surgery: a randomised controlled trial", org: "Br J Ophthalmol (Harwood et al.)", year: 2005, url: "https://doi.org/10.1136/bjo.2004.049478" },
    { title: "Annual high-dose oral vitamin D and falls and fractures in older women: a randomized controlled trial", org: "JAMA (Sanders et al.)", year: 2010, url: "https://doi.org/10.1001/jama.2010.594" },
    { title: "Diagnosis and management of osteonecrosis of the jaw: a systematic review and international consensus", org: "J Bone Miner Res (Khan)", year: 2015, url: "https://doi.org/10.1002/jbmr.2405" },
    { title: "Atypical subtrochanteric and diaphyseal femoral fractures: second report of a task force of the American Society for Bone and Mineral Research", org: "J Bone Miner Res (Shane)", year: 2014, url: "https://doi.org/10.1002/jbmr.1998" },
    { title: "Psychological and educational interventions for preventing falls in older people living in the community", org: "Cochrane Database Syst Rev (Drahota et al.)", year: 2024, url: "https://doi.org/10.1002/14651858.cd013480.pub2" },
    { title: "Psychological risk factors associated with falls among elderly people in Baghdad city, Iraq", org: "Open Journal of Preventive Medicine (Abdal Qader et al.)", year: 2013, url: "https://doi.org/10.4236/ojpm.2013.37059" },
    { title: "Case report: electrical automated massage chair use can induce osteoporotic vertebral compression fracture", org: "Osteoporos Int (Jeon et al.)", year: 2019, url: "https://doi.org/10.1007/s00198-019-04961-4" },
    { title: "Has the energy poverty crisis fuelled a rise in hot water bottle burn injuries within the United Kingdom?", org: "Burns (Chu et al.)", year: 2024, url: "https://doi.org/10.1016/j.burns.2024.09.014" },
    { title: "Hip protectors for preventing hip fractures in older people", org: "Cochrane Database Syst Rev (Santesso et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.cd001255.pub5" },
    { title: "Cause-specific risk of hospital admission related to extreme heat in older adults", org: "JAMA (Bobb et al.)", year: 2014, url: "https://doi.org/10.1001/jama.2014.15715" },
    { title: "Vitamin D in the Middle East and North Africa", org: "Bone Rep (Chakhtoura et al.)", year: 2018, url: "https://doi.org/10.1016/j.bonr.2018.03.004" },
    { title: "Sun exposure, skin color and vitamin D status in Arab children and adults", org: "J Steroid Biochem Mol Biol (Al-Daghri et al.)", year: 2016, url: "https://doi.org/10.1016/j.jsbmb.2016.05.012" },
    { title: "Effect of wet cupping on reducing bone pain for patients in King Abdulaziz University Hospital, Saudi Arabia. A retrospective study", org: "Saudi Med J (Baharith et al.)", year: 2019, url: "https://doi.org/10.15537/smj.2019.6.23615" },
    { title: "Exercise for preventing falls in older people living in the community: an abridged Cochrane systematic review", org: "Br J Sports Med (Sherrington et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2019-101512" },
    { title: "Interferential and horizontal therapies in chronic low back pain due to multiple vertebral fractures: a randomized, double blind, clinical study", org: "Osteoporos Int (Zambito et al.)", year: 2007, url: "https://doi.org/10.1007/s00198-007-0391-3" },
    { title: "Does neuromuscular electrical stimulation training of the lower limb have functional effects on the elderly?: A systematic review", org: "Exp Gerontol (Langeard et al.)", year: 2017, url: "https://doi.org/10.1016/j.exger.2017.02.070" },
    { title: "Electromagnetic field versus circuit weight training on bone mineral density in elderly women", org: "Clin Interv Aging (Elsisi et al.)", year: 2015, url: "https://doi.org/10.2147/cia.s78485" },
    { title: "Long-term effect of full-body pulsed electromagnetic field and exercise protocol in the treatment of men with osteopenia or osteoporosis: A randomized placebo-controlled trial", org: "F1000Res (Ebid et al.)", year: 2021, url: "https://doi.org/10.12688/f1000research.54519.3" },
    { title: "Pulse Electromagnetic Field for Treating Postmenopausal Osteoporosis: A Systematic Review and Meta-Analysis of Randomized Controlled Trials", org: "Bioelectromagnetics (Lang et al.)", year: 2022, url: "https://doi.org/10.1002/bem.22419" },
    { title: "Pulsed Electromagnetic Fields May Be Effective for the Management of Primary Osteoporosis: A Systematic Review and Meta-Analysis", org: "IEEE Trans Neural Syst Rehabil Eng (Zhu et al.)", year: 2022, url: "https://doi.org/10.1109/tnsre.2022.3149483" },
    { title: "A Cochrane review of superficial heat or cold for low back pain", org: "Spine (Phila Pa 1976) (French et al.)", year: 2006, url: "https://doi.org/10.1097/01.brs.0000214881.10814.64" },
    { title: "Hot water bottle burn injuries: a 10-year retrospective analysis of incidence and potential predictors in Germany", org: "Innov Surg Sci (Milewski et al.)", year: 2026, url: "https://doi.org/10.1515/iss-2024-0042" },
    { title: "Short-term effects of extracorporeal shock wave therapy on bone mineral density in postmenopausal osteoporotic patients", org: "Osteoporos Int (Shi et al.)", year: 2017, url: "https://doi.org/10.1007/s00198-017-4136-7" },
    { title: "Effects of a robotic walking exercise on walking performance in community-dwelling elderly adults", org: "Geriatr Gerontol Int (Shimada et al.)", year: 2009, url: "https://doi.org/10.1111/j.1447-0594.2009.00546.x" },
    { title: "Training with a balance exercise assist robot is more effective than conventional training for frail older adults", org: "Geriatr Gerontol Int (Ozaki et al.)", year: 2017, url: "https://doi.org/10.1111/ggi.13009" },
    { title: "Efficacy of high intensity laser therapy in the treatment of male with osteopenia or osteoporosis: a randomized placebo-controlled trial", org: "J Phys Ther Sci (Alayat et al.)", year: 2017, url: "https://doi.org/10.1589/jpts.29.1675" },
    { title: "Low intensity pulsed ultrasound for bone healing: systematic review of randomized controlled trials", org: "BMJ (Schandelmaier et al.)", year: 2017, url: "https://doi.org/10.1136/bmj.j656" },
    { title: "Back pain in the emergency department: Pathological fracture following spinal manipulation", org: "CJEM (Skappak et al.)", year: 2018, url: "https://doi.org/10.1017/cem.2017.19" },
    { title: "Integration of balance and strength training into daily life activity to reduce rate of falls in older people (the LiFE study): randomised parallel trial", org: "BMJ (Clemson et al.)", year: 2012, url: "https://doi.org/10.1136/bmj.e4547" },
    { title: "Promoting physical activity in older people in general practice: ProAct65+ cluster randomised controlled trial", org: "Br J Gen Pract (Iliffe et al.)", year: 2015, url: "https://doi.org/10.3399/bjgp15x687361" },
    { title: "The Otago Exercise Program performed as group training versus home training in fall-prone older people: a randomized controlled Trial", org: "Physiother Res Int (Kyrdalen et al.)", year: 2014, url: "https://doi.org/10.1002/pri.1571" },
    { title: "Spinal Orthoses for Vertebral Osteoporosis and Osteoporotic Vertebral Fracture: A Systematic Review", org: "Arch Phys Med Rehabil (Newman et al.)", year: 2016, url: "https://doi.org/10.1016/j.apmr.2015.10.108" },
    { title: "Comparison of Rigid and Soft-Brace Treatments for Acute Osteoporotic Vertebral Compression Fracture: A Prospective, Randomized, Multicenter Study", org: "J Clin Med (Kato et al.)", year: 2019, url: "https://doi.org/10.3390/jcm8020198" },
    { title: "Effects of a new spinal orthosis on posture, trunk strength, and quality of life in women with postmenopausal osteoporosis: a randomized trial", org: "Am J Phys Med Rehabil (Pfeifer et al.)", year: 2004, url: "https://doi.org/10.1097/01.phm.0000113403.16617.93" },
    { title: "Predictive validity of the Stopping Elderly Accidents, Deaths & Injuries (STEADI) program fall risk screening algorithms among community-dwelling Thai elderly", org: "BMC Med (Loonlawong et al.)", year: 2022, url: "https://doi.org/10.1186/s12916-022-02280-w" },
    { title: "Reference values for the five-repetition sit-to-stand test: a descriptive meta-analysis of data from elders", org: "Percept Mot Skills (Bohannon)", year: 2006, url: "https://doi.org/10.2466/pms.103.1.215-222" },
    { title: "One leg standing time predicts fracture risk in older women independent of clinical risk factors and BMD", org: "Osteoporos Int (Larsson et al.)", year: 2022, url: "https://doi.org/10.1007/s00198-021-06039-6" },
    { title: "Psychometric properties of the Arabic version of the Mini-Balance Evaluation Systems Test in patients with neurological balance disorders", org: "Eur Rev Med Pharmacol Sci (Alyousef et al.)", year: 2023, url: "https://doi.org/10.26355/eurrev_202305_32438" },
    { title: "Cultural adaptation and validation of the Arabic short version of the Iconographical Falls Efficacy Scale (Icon-FES): Assessing concern about falling among older adults", org: "Aging Clin Exp Res (Almarwani et al.)", year: 2025, url: "https://doi.org/10.1007/s40520-025-02949-1" },
    { title: "Development of a common outcome data set for fall injury prevention trials: the Prevention of Falls Network Europe consensus", org: "J Am Geriatr Soc (Lamb)", year: 2005, url: "https://doi.org/10.1111/j.1532-5415.2005.53455.x" },
    { title: "Validation of the manual inclinometer and flexicurve for the measurement of thoracic kyphosis", org: "Physiother Theory Pract (Barrett et al.)", year: 2018, url: "https://doi.org/10.1080/09593985.2017.1394411" },
    { title: "Sarcopenia: revised European consensus on definition and diagnosis", org: "Age Ageing (Cruz-Jentoft)", year: 2019, url: "https://doi.org/10.1093/ageing/afy169" },
    { title: "Psychometric properties evaluation of the quality of life questionnaire of the European Foundation for Osteoporosis in Arabic population", org: "Rheumatol Int (Rostom et al.)", year: 2012, url: "https://doi.org/10.1007/s00296-011-1910-2" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 45,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٥ دقيقة في الجلسة — التوازنُ المتحدّي أوّلاً، ثمّ القوّةُ المتدرّجة، ثمّ الصدمُ أو تمارينُ الظهر بحسب حال العظم، ثمّ مهارةٌ يومية (القيامُ من الأرض أو الصلاةُ أو الحركةُ الآمنة)، ثمّ تدريبُ المرافق على ما يكرّره في البيت.",
        "The phased programme and its cards under 'Programme by phase': about 45 minutes per session — challenging balance first, then progressive strength, then impact or back exercises according to bone status, then a daily skill (getting up from the floor, prayer or safe movement), then coaching the companion on what to repeat at home."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ أنقص السقوطَ والكسور (Sherrington 2019)، والإرشادُ يجعل التوازنَ والمهامَّ ثلاثاً في الأسبوع فأكثر أساساً بدرجة 1A (Montero-Odasso 2022)، والتمرينُ الحاملُ للوزن والتقويةُ توصيةٌ قويّة للهشاشة (Gregson 2022)، والتمرينُ حين يقدّمه المختصّ أكثرُ أثراً (Sherrington 2020a).",
        "Core in every session — exercise reduced falls and fractures (Sherrington 2019), the guideline makes balance and functional exercise three times a week or more the base at grade 1A (Montero-Odasso 2022), weight-bearing and strengthening exercise is a strong recommendation for osteoporosis (Gregson 2022), and exercise delivered by a health professional works better (Sherrington 2020a)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 30,
      params: { currentType: "IFC (interferential)", frequencyHz: "Device programme (not given in the trial abstract)", intensity: "Comfortable, strong tingle", durationMin: "30" },
      parameters: ["لألم الظهر المزمن من كسور الفقرات وحده، فوق التمرين لا بدله: التيّارُ المتداخل ٣٠ دقيقة يومياً خمسةَ أيّامٍ في الأسبوع أسبوعين مع برنامج التمرين، كما في التجربة (Zambito 2007) — والتردّدُ من برنامج جهاز المركز، فلم يُذكر في ملخّصها.",
        "For chronic back pain from vertebral fractures only, on top of exercise and not instead of it: interferential current for 30 minutes daily, five days a week for two weeks with the exercise programme, as in the trial (Zambito 2007) — the frequency comes from the centre's device programme, as the trial abstract does not give it."],
      note: ["مساعدٌ بقاعدة المركز — تجربةٌ واحدة مضبوطة بالوهميّ عند ١١٥ امرأة حسّنت الألمَ والعجز في الأسبوعين السادس والرابعَ عشر (Zambito 2007)، ولا تجربةَ للتحفيز الحسّيّ وحده (بحثٌ صفريّ)؛ والتحفيزُ العضليّ يقوّي عضلاتِ كبار السنّ (Langeard 2017) بلا بياناتٍ للسقوط — فلا يحلّ محلَّ التمرين.",
        "Adjunct by the centre's rule — one sham-controlled trial in 115 women improved pain and disability at weeks six and fourteen (Zambito 2007), and there is no trial of sensory stimulation alone (a documented zero result); muscle stimulation strengthens older muscles (Langeard 2017) with no falls data — so it does not replace exercise."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 20,
      parameters: ["على الظهر أو الورك بعيداً عن أيّ جهازٍ مزروع، والإعداداتُ من جهاز المركز — فالتجاربُ قليلة ومتباينة: مجالٌ نبضيّ منخفض التردّد ثلاثاً في الأسبوع اثني عشرَ أسبوعاً (Elsisi 2015)، وحصيرةٌ للجسم كلّه ثلاثاً في الأسبوع مع التمرين (Ebid 2021).",
        "Over the back or hip away from any implant, with settings from the centre's device — the trials are few and varied: a low-frequency pulsed field three times a week for twelve weeks (Elsisi 2015), and a whole-body mat three times a week with exercise (Ebid 2021)."],
      note: ["مساعدٌ بقاعدة المركز — والدليلُ ضعيف: تحليلان من تجارب صغيرة أكثرُها صينية رأيا الكثافةَ ترتفع والألمَ يقلّ (Lang 2022 · Zhu 2022)، ولا تجربةَ تقيس الكسرَ أو السقوط (بحثٌ صفريّ) — فلا يحلّ محلَّ الدواء ولا التمرين؛ ولا يُستعمل مع منظّم القلب أو جهازٍ مزروع بلا إذن الطبيب.",
        "Adjunct by the centre's rule — the evidence is weak: two analyses of small, mostly Chinese trials found density rose and pain fell (Lang 2022 · Zhu 2022), and no trial measured fractures or falls (a documented zero result) — so it replaces neither medicine nor exercise; not used with a pacemaker or other implant without the doctor's permission."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "8–10", durationMin: "10" },
      parameters: ["دفءٌ على عضلات الظهر المشدودة أو المؤلمة قبل التمرين عشرَ دقائق — لمن إحساسُه سليم وحده، بطبقاتٍ أكثر لرقّة جلد كبير السنّ، ويُفحص الجلدُ كلَّ خمس دقائق؛ ولا على جلدٍ ناقص الإحساس (السكّريّ) ولا لمن لا يستطيع أن يشكو.",
        "Warmth on tight or painful back muscles before exercise for ten minutes — only with intact sensation, with more layers for an older person's thin skin and the skin checked every five minutes; never on skin with reduced sensation (diabetes) or for someone who cannot complain."],
      note: ["مساعدٌ بقاعدة المركز — الحرارةُ تنقص ألمَ الظهر قليلاً وقصيراً (French 2006)، ولا تجربةَ في الهشاشة (بحثٌ صفريّ)؛ وحروقُ قِرب الماء الحارّ ارتفعت ٦٨٫٥٪ عند مَن تجاوز الخامسة والستّين (Chu 2024)، وأكثرُها من الدرجة الثانية (Milewski 2026).",
        "Adjunct by the centre's rule — heat reduces back pain a little and briefly (French 2006), with no trial in osteoporosis (a documented zero result); hot-water-bottle burns rose 68.5% in people over sixty-five (Chu 2024), mostly second-degree (Milewski 2026)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — دراسةٌ واحدة صغيرة غيرُ معمّاة: جلسةٌ واحدة على الورك مع دواء العظم رفعت كثافتَه الموضعية (Shi 2017)، ولا تجربةَ تقيس الكسرَ أو السقوط (بحثٌ صفريّ).",
        "Not used until Saleem decides — one small unblinded study: a single session to the hip with bone medicine raised local density (Shi 2017), and no trial measured fractures or falls (a documented zero result)."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجارب صغيرة عند كبار السنّ بلا قياسٍ للسقوط (Shimada 2009 · Ozaki 2017)، والتوازنُ المتحدّي على الأرض هو ما ينقص السقوط (Sherrington 2019).",
        "Not used until Saleem decides — small trials in older people with no falls outcome (Shimada 2009 · Ozaki 2017), and challenging balance on the floor is what reduces falls (Sherrington 2019)."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ واحدة لليزر عالي الشدّة عند رجالٍ بهشاشة أنقصت الألمَ مع التمرين (Alayat 2017)، ولا تجربةَ لليزر منخفض الشدّة في الهشاشة (بحثٌ صفريّ).",
        "Not used until Saleem decides — one trial of high-intensity laser in men with osteoporosis reduced pain with exercise (Alayat 2017), and there is no trial of low-level laser in osteoporosis (a documented zero result)."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ في الهشاشة أو السقوط (بحثٌ صفريّ).", "Not used — there is no trial in osteoporosis or falls (a documented zero result)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الأمواجُ النبضية منخفضة الشدّة لم تنفع الكسورَ في التجارب الجيّدة (Schandelmaier 2017)، ولا تجربةَ للهشاشة.", "Not used — low-intensity pulsed ultrasound did not help fractures in good-quality trials (Schandelmaier 2017), with no trial in osteoporosis."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، وخطرُ الحرق عند كبير السنّ (Chu 2024).", "Not used — there is no trial (a documented zero result), with a burn risk in older people (Chu 2024)."] },
    { code: "tecar", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، وحرارةٌ عميقة قربَ المعادن بعد تثبيت كسر الورك.", "Not used — there is no trial (a documented zero result), with deep heat near metal after hip-fracture fixation."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق ولا تجربة (بحثٌ صفريّ).", "Not used — not applicable and no trial (a documented zero result)."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق ولا تجربة (بحثٌ صفريّ).", "Not used — not applicable and no trial (a documented zero result)."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق ولا تجربة (بحثٌ صفريّ).", "Not used — not applicable and no trial (a documented zero result)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — ممنوعٌ على العمود الفقريّ الهشّ: لا تجربة، والقوّةُ على فقرةٍ هشّة تكسرها — كُسرت فقرةٌ بكرسيّ تدليك (Jeon 2019)، وطُقطق ظهرٌ قبل أن يُكشف فيه ورمٌ نقيّ (Skappak 2018).",
        "Not used — forbidden on a fragile spine: there is no trial, and force on a fragile vertebra breaks it — a vertebra was fractured by a massage chair (Jeon 2019), and a back was manipulated before myeloma was found in it (Skappak 2018)."] },
  ],
  phases: [
    {
      name: ["التقييم وتصنيف الخطر والسلامة", "Assessment, risk stratification and safety"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلسات ١–٦ (الأسبوعُ الأوّل) — والتمرينُ يبدأ من الجلسة الأولى", "Sessions 1–6 (the first week) — with exercise starting from the first session"],
      goals: [
        "الأسئلةُ الثلاثة والقياسُ الأوّل مكتوبان، والخطرُ مصنَّف والمسارُ مختار، والضغطُ مستلقياً وواقفاً مقيس، والإحالاتُ إلى الطبيب مرسَلة (العظمُ والأدويةُ والنظر)؛ والمريضُ يتحرّك بالطريقة الآمنة، ويعرف خطّةَ السقوط، والبيتُ مفحوص.",
        "The three questions and the first measurement recorded, risk stratified and the pathway chosen, blood pressure measured lying and standing, and referrals to the doctor sent (bone, medicines, vision); the person moves in the safe way, knows the fall plan, and the home has been checked.",
      ],
      education: [
        "• الهشاشةُ لا تؤلم حتى تكسر، والسقوطُ هو ما يكسر — فالتوازنُ والقوّةُ يحميان العظم (Sherrington 2019).\n" +
        "• الحركةُ الآمنة: الانحناءُ من الوركين والظهرُ مستقيم (Giangregorio 2015).\n" +
        "• ماذا تفعل إن سقطت، والهاتفُ معك دائماً (Fleming 2008).\n" +
        "• الدواءُ وفيتامين د عند الطبيب — ولا جرعاتٍ كبيرة متباعدة (Sanders 2010).",
        "• Osteoporosis does not hurt until it breaks, and falling is what breaks it — so balance and strength protect the bone (Sherrington 2019).\n" +
        "• Safe movement: bending from the hips with a straight back (Giangregorio 2015).\n" +
        "• What to do if you fall, and keep the phone with you always (Fleming 2008).\n" +
        "• Medicines and vitamin D are with the doctor — no large intermittent doses (Sanders 2010).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• القياسُ الأوّل والتصنيفُ تمّا، والمسارُ مكتوب.\n" +
        "• لا علامةَ إحالةٍ عاجلة، والضغطُ لا يهبط عند الوقوف أو أُحيل.\n" +
        "• يؤدّي الحركةَ الآمنة أمام الأخصائيّ، وفحصُ البيت تمّ.\n" +
        "(اقتراحٌ يتبع السلامةَ والتنظيم، لا معيارٌ مجرَّب.)",
        "Progress to phase 2 when all are met:\n" +
        "• The first measurement and stratification done, and the pathway written.\n" +
        "• No urgent referral sign, and blood pressure does not drop on standing or has been referred.\n" +
        "• Performs safe movement in front of the specialist, and the home check is done.\n" +
        "(A proposal based on safety and organisation, not a tested criterion.)",
      ],
      notes: [
        "• التقييمُ لا يأخذ الجلسات كلَّها: من الأولى يبدأ التوازنُ والقوّةُ بشدّةٍ متوسّطة.\n" +
        "• عالي الخطر: التقييمُ المتعدّد مع الطبيب في هذه المرحلة، والتمرينُ بإشرافٍ قريب.\n" +
        "• كسرُ الفقرة المؤلم: النهوضُ من السرير بالتدحرج، وتمارينُ الظهر الخفيفة يومياً، والتيّارُ المتداخل بشرطه.\n" +
        "• المرافقُ يحضر الجلسات الأولى ليتعلّم.\n" +
        "• الأجهزةُ المساعدة بالتناوب وبشروطها في سطورها.",
        "• Assessment does not take all the sessions: balance and strength at moderate intensity start from the first.\n" +
        "• High risk: the multifactorial assessment with the doctor in this phase, with closely supervised exercise.\n" +
        "• A painful vertebral fracture: getting out of bed by log rolling, light daily back exercises, and interferential current under its condition.\n" +
        "• The companion attends the first sessions to learn.\n" +
        "• Adjunct devices in rotation, under the conditions in their lines.",
      ],
      exercises: [
        { code: "osteo-safe-bending-lifting", sets: 2, reps: 5, rest: 30,
          note: ["للجميع، ومن الجلسة الأولى.", "For everyone, from the first session."] },
        { code: "osteo-home-hazard-footwear", sets: 1, reps: 1,
          note: ["مع المرافق، بصور البيت أو زيارته.", "With the companion, using photos of the home or a visit."] },
        { code: "sit-to-stand", sets: 2, reps: 10,
          note: ["من كرسيٍّ بمسندين أوّلاً، واليدان على الصدر حين يقدر.", "From a chair with armrests first, with the hands on the chest when able."] },
        { code: "tandem-stance", sets: 1, reps: 3, hold: 30,
          note: ["بجانب سندٍ ثابت.", "Beside a steady support."] },
        { code: "calf-raise", sets: 2, reps: 10,
          note: ["واليدان على الطاولة.", "With the hands on the table."] },
        { code: "osteo-back-extension", sets: 1, reps: 5, hold: 5, rest: 30,
          note: ["للجميع، وبعد كسر الفقرة جالساً أو منبطحاً بلطفٍ يومياً.", "For everyone, and after a vertebral fracture gently each day seated or lying face down."] },
        { code: "log-roll", sets: 1, reps: 3,
          note: ["لمن به كسرٌ مؤلم في فقرة.", "For a person with a painful vertebral fracture."] },
        { code: "osteo-prayer-safe", sets: 1, reps: 1,
          note: ["لمن يريد: القيامُ والركوعُ والسجودُ الآمن.", "For those who wish: safe standing, bowing and prostration."] },
      ],
    },
    {
      name: ["التوازن المتحدّي والقوّة والصدم المتدرّج", "Challenging balance, strength and graded impact"],
      sessionFrom: 7, sessionTo: 18,
      timeframe: ["الجلسات ٧–١٨ (الأسبوعان الثاني والثالث)، والقياسُ في الجلسة ١٨", "Sessions 7–18 (the second and third weeks), with measurement at session 18"],
      goals: [
        "التوازنُ يتحدّى أكثرَ كلَّ أسبوع (قاعدةٌ أضيق ويدٌ أقلّ)، والقوّةُ تقترب من أثقل ما يُرفع ٨–١٢ مرّة، والصدمُ خمسون مرّةً لمن يناسبه، وتمارينُ الظهر منتظمة؛ ويقوم من الأرض بمساعدة كرسيٍّ أو يعرف خطّةَ النداء؛ والبرنامجُ المنزليّ بدأ ثلاثاً في الأسبوع بسجلّ.",
        "Balance is more challenging each week (a narrower base and less hand), strength approaches the heaviest load lifted 8–12 times, fifty impacts for those suited, regular back exercises; the person gets up from the floor with a chair or knows the call plan; and the home programme has started three times a week with a diary.",
      ],
      education: [
        "• التوازنُ يتحسّن بالتحدّي الآمن، ولا يتحسّن بالمشي وحده (Sherrington 2017 · Ebrahim 1997).\n" +
        "• العظمُ يحتاج حملاً أثقل وصدماً متكرّراً، لا تمريناً خفيفاً (Kistler-Fischbacher 2021a).\n" +
        "• التاي تشي ثلاثاً في الأسبوع شهوراً (Li 2005).",
        "• Balance improves with safe challenge, not with walking alone (Sherrington 2017 · Ebrahim 1997).\n" +
        "• Bone needs heavier loading and repeated impact, not light exercise (Kistler-Fischbacher 2021a).\n" +
        "• Tai Chi three times a week for months (Li 2005).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• في الجلسة ١٨: بيرغ ارتفع بأصغر تغيّرٍ يُكتشف لبدايته (٤ أو ٥ أو ٧ — Donoghue 2009) أو سرعةُ المشي +٠٫١ م/ث (Perera 2006) — أو أُعيدت كتابةُ الهدف الذي لم يتقدّم مع سببه.\n" +
        "• لا سقوطَ بإصابة، ويؤدّي البرنامجَ المنزليّ ثلاثاً في الأسبوع بسجلّ.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when all are met:\n" +
        "• At session 18: Berg up by the minimal detectable change for its baseline (4, 5 or 7 — Donoghue 2009) or gait speed +0.1 m/s (Perera 2006) — or a goal that has not progressed rewritten with its reason.\n" +
        "• No injurious fall, and the home programme done three times a week with a diary.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• متوسّطُ الخطر وعاليه: أوتاغو المتحدّي والتاي تشي والخطوةُ الإنقاذية، وثلاثُ ساعاتٍ في الأسبوع فأكثر للتوازن بالمركز والبيت معاً (Sherrington 2017).\n" +
        "• هشاشةٌ بلا كسر: الصدمُ خمسون مرّةً أكثرَ الأيّام، والقوّةُ حتى ٣ مجموعات × ٨–١٢ (Brooke-Wavell 2022)؛ والمقاومةُ والصدمُ عاليا الشدّة — ٥ × ٥ بأكثر من ٨٥٪ من أقصى ثقل مرّتين في الأسبوع — لمن فُحص واختير وبإشرافٍ قريب (Watson 2018).\n" +
        "• بعد كسر الفقرة: تمارينُ الظهر يومياً، والصدمُ لا أكثر من المشي السريع، والشدّةُ متوسّطة (Brooke-Wavell 2022).\n" +
        "• بعد كسر الورك: المقاومةُ المتدرّجة للساقين والمشيُ بالأداة حتى بدونها، بإشراف (Diong 2016 · Sherrington 2014).",
        "• Intermediate and high risk: challenging Otago, Tai Chi and reactive stepping, with three hours a week or more of balance across the centre and home (Sherrington 2017).\n" +
        "• Osteoporosis without fracture: fifty impacts on most days, and strength up to 3 sets × 8–12 (Brooke-Wavell 2022); high-intensity resistance and impact — 5 × 5 above 85% of maximum twice a week — for those screened and selected, under close supervision (Watson 2018).\n" +
        "• After a vertebral fracture: daily back exercises, impact no harder than brisk walking, and moderate intensity (Brooke-Wavell 2022).\n" +
        "• After a hip fracture: progressive leg resistance and walking from an aid to none, under supervision (Diong 2016 · Sherrington 2014).",
      ],
      exercises: [
        { code: "osteo-tandem-walk", sets: 3, reps: 10, rest: 30 },
        { code: "osteo-backward-turn-walk", sets: 2, reps: 10, rest: 30 },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 30,
          note: ["بجانب السند، ويُقاس الزمن (تحت ١٠ ثوانٍ خطر).", "Beside the support, timed (under 10 seconds is risk)."] },
        { code: "reactive-stepping-practice", sets: 3, reps: 5,
          doseNote: ["٣ × ٥ لكلّ اتّجاه في الجلسة بحزامٍ أو بيد الأخصائيّ (Mansfield 2015 — والعددُ اقتراح).", "3 × 5 in each direction per session with a belt or the specialist's hand (Mansfield 2015 — the number is a suggestion)."],
          note: ["لمتوسّط الخطر وعاليه، والأخصائيُّ يمسك الحزام.", "For intermediate and high risk, with the specialist holding the belt."] },
        { code: "osteo-tai-chi", sets: 1, reps: 1,
          note: ["٢٠ دقيقة في الجلسة ثلاثاً في الأسبوع، والبقيّةُ في البيت أو مجموعة.", "20 minutes per session three times a week, the rest at home or in a group."] },
        { code: "obstacle-dual-task-walking", sets: 1, reps: 5,
          doseNote: ["في كلّ جلسةٍ من هذه المرحلة، بالعوائق ثمّ مع عدٍّ أو كلام.", "In every session of this phase, with obstacles and then with counting or talking."] },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["بلا يدين، ثمّ بثقلٍ في اليدين حتى أثقل ما يُرفع ٨–١٢ مرّة.", "Without hands, then holding a weight up to the heaviest lifted 8–12 times."] },
        { code: "step-up", sets: 3, reps: 10 },
        { code: "standing-hip-three-way", sets: 2, reps: 10,
          doseNote: ["٢ × ١٠ لكلّ اتّجاه بثقلٍ على الكاحل يزيد، مرّتين إلى ثلاثٍ في الأسبوع.", "2 × 10 in each direction with an increasing ankle weight, two to three times a week."] },
        { code: "osteo-heel-drop-impact", sets: 5, reps: 10, rest: 30,
          note: ["لمن ليس عنده كسرُ فقرةٍ أو كسورٌ متعدّدة.", "For those without a vertebral fracture or multiple fractures."] },
        { code: "kettlebell-deadlift", sets: 5, reps: 5,
          doseNote: ["٥ × ٥ بأكثر من ٨٥٪ من أقصى ثقل مرّتين في الأسبوع بفحصٍ وإشرافٍ قريب، والطريقةُ بثقلٍ خفيف أوّلاً (Watson 2018).", "5 × 5 above 85% of maximum twice a week with screening and close supervision, technique with a light weight first (Watson 2018)."],
          note: ["لمسار العظم عالي الشدّة وحده، لا بعد كسر الفقرة.", "For the high-intensity bone pathway only, not after a vertebral fracture."] },
        { code: "osteo-back-extension", sets: 1, reps: 5, hold: 5, rest: 30 },
        { code: "band-row", sets: 3, reps: 12,
          note: ["عضلاتُ الكتفين والظهر العلويّ للوضعية.", "The shoulder and upper-back muscles for posture."] },
        { code: "osteo-floor-rise", sets: 1, reps: 2, rest: 120 },
      ],
    },
    {
      name: ["التثبيت والبيت والمجتمع وخطّة ما بعد الكتلة", "Consolidation, home and community, and the plan after the block"],
      sessionFrom: 19, sessionTo: 24,
      timeframe: ["الجلسات ١٩–٢٤ (الأسبوعُ الرابع)، ثمّ البرنامجُ المنزليّ ثلاثاً في الأسبوع حتى الأسبوع ٢٦ ومراجعاتٌ في ٨ و١٢ و٢٦", "Sessions 19–24 (the fourth week), then the home programme three times a week to week 26 with reviews at 8, 12 and 26"],
      goals: [
        "البرنامجُ المنزليّ يُؤدّى وحده ثلاثاً في الأسبوع بسجلّ (توازنٌ وقوّةٌ وصدمٌ لمن يناسبه)، والمشيُ والتاي تشي أو المجموعةُ في الحيّ، والبيتُ معدَّل، والصلاةُ آمنة، ومواعيدُ المراجعة وزيارةُ الطبيب للعظم مكتوبة.",
        "The home programme done independently three times a week with a diary (balance, strength and impact where suitable), walking and Tai Chi or a group in the neighbourhood, the home adapted, prayer safe, and the review dates and the doctor's bone visit written down.",
      ],
      education: [
        "• المكسبُ يبقى بالاستمرار: لم يستمرّ بعد سنةٍ إلّا ثلثُ المتمرّنين (Thomas 2010)، ومَن استمرّ بقي أثرُه سنتين (Finnegan 2019).\n" +
        "• التمرينُ مع الحياة اليومية: عند غسل الأطباق، وفي الطريق إلى المسجد (Clemson 2012).\n" +
        "• السقوطُ الجديد يُخبَر به الطبيب، فقد يكون له سببٌ يُعالج.",
        "• The gain lasts by continuing: only a third were still exercising after a year (Thomas 2010), and in those who continued the effect lasted two years (Finnegan 2019).\n" +
        "• Exercise woven into daily life: while washing dishes and on the way to the mosque (Clemson 2012).\n" +
        "• A new fall is reported to the doctor, as it may have a treatable cause.",
      ],
      criteria: [
        "الخروجُ من الكتلة حين تتحقّق كلُّها:\n" +
        "• بيرغ أو سرعةُ المشي بلغا الحدَّ المهمّ، أو تقدّمٌ بلا بلوغٍ مع سببٍ مكتوب.\n" +
        "• يؤدّي البرنامجَ المنزليّ وحده، ويقوم من الأرض أو يعرف خطّةَ النداء.\n" +
        "• تقييمُ العظم عند الطبيب تمّ أو حُدّد موعدُه.\n" +
        EXTEND_AR,
        "Discharge from the block when all are met:\n" +
        "• Berg or gait speed has reached the important threshold, or progress without reaching it with a written reason.\n" +
        "• Does the home programme independently, and gets up from the floor or knows the call plan.\n" +
        "• The doctor's bone assessment is done or booked.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• التدريبُ في المكان الحقيقيّ: الدرجُ والحمّامُ والمطبخُ والطريقُ إلى المسجد والسوق.\n" +
        "• البرنامجُ المنزليّ مكتوبٌ بالصور، وسجلُّ التمرين والسقوط، والمرافقُ يعرفه.\n" +
        "• مجموعةُ تمرينٍ أو تاي تشي في الحيّ أو المركز — المجموعةُ نفعت أكثر من البيت وحده (Iliffe 2015 · Kyrdalen 2014).\n" +
        "• مراجعةُ ما تغيّر في البيت والحذاء.",
        "• Practice in the real place: stairs, bathroom, kitchen, and the way to the mosque and the market.\n" +
        "• The home programme written with pictures, an exercise and falls diary, and the companion knows it.\n" +
        "• An exercise or Tai Chi group in the neighbourhood or the centre — groups helped more than home alone (Iliffe 2015 · Kyrdalen 2014).\n" +
        "• A review of the changes to the home and shoes.",
      ],
      exercises: [
        { code: "osteo-tandem-walk", sets: 3, reps: 10, rest: 30,
          note: ["بلا يد والسندُ قريب، ومع مهمّةٍ ثانية.", "With no hand and the support close, and with a second task."] },
        { code: "osteo-tai-chi", sets: 1, reps: 1,
          note: ["مع مجموعة أو مقطعٍ في البيت ثلاثاً في الأسبوع.", "With a group or a video at home three times a week."] },
        { code: "obstacle-dual-task-walking", sets: 1, reps: 5 },
        { code: "graded-walking", sets: 1, reps: 1,
          doseNote: ["مشيٌ يوميّ مع التوازن والقوّة لا بدلهما، ولمن به كسرُ فقرة المشيُ السريع نحو ١٥٠ دقيقة في الأسبوع (Brooke-Wavell 2022).", "Daily walking alongside balance and strength, not instead of them, and for those with a vertebral fracture brisk walking of about 150 minutes a week (Brooke-Wavell 2022)."],
          note: ["في الشارع والسوق والطريق إلى المسجد.", "In the street, the market and on the way to the mosque."] },
        { code: "osteo-heel-drop-impact", sets: 5, reps: 10, rest: 30,
          note: ["في البيت أكثرَ أيّام الأسبوع، لمن يناسبه.", "At home on most days, for those suited."] },
        { code: "osteo-back-extension", sets: 1, reps: 5, hold: 5, rest: 30 },
        { code: "osteo-floor-rise", sets: 1, reps: 2, rest: 120,
          note: ["في البيت بحضور أحد الأهل، وخطّةُ النداء مكتوبة.", "At home with a family member present, and the call plan written."] },
        { code: "osteo-prayer-safe", sets: 1, reps: 1,
          note: ["في البيت والمسجد.", "At home and in the mosque."] },
        { code: "osteo-home-hazard-footwear", sets: 1, reps: 1,
          note: ["مراجعةُ ما تغيّر.", "A review of what has changed."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ جلسة بستٍّ في الأسبوع (أربعةُ أسابيع) وتمديدٌ واحد باثنتي عشرة لعالي الخطر، ثمّ البيتُ ثلاثاً في الأسبوع حتى الأسبوع ٢٦ ومراجعاتٌ في ٨ و١٢ و٢٦ — والإرشادُ ثلاثٌ في الأسبوع فأكثر اثني عشرَ أسبوعاً فأكثر، ولا تجربةَ لكتلةٍ يومية من أربعة أسابيع: أتبقيه هكذا، أم ٣ × ١٢ (٣٦ جلسة) في المركز أو مجموعة؟ ومَن يتابع البيتَ بين المراجعات؟",
    en: "24 sessions at six a week (four weeks) with one extension of twelve for high risk, then home three times a week to week 26 with reviews at 8, 12 and 26 — the guideline is three times a week or more for twelve weeks or more (Montero-Odasso 2022), with more than three hours of balance a week (Sherrington 2017), and no trial of a four-week daily block: keep it so, or 3 × 12 (36 sessions) at the centre or in a group? And who follows the home programme between reviews?" },
  { key: "limits", topic: "limits",
    ar: "الحدود: بيرغ بأصغر تغيّرٍ يُكتشف لبدايته (٤ أو ٥ أو ٧)، وسرعةُ المشي +٠٫١ م/ث، والنهوضُ والمشي فوق ١٥ ثانية أو سرعةُ المشي تحت ٠٫٨ م/ث خطرٌ عالٍ يمدّد — والانتقالُ بين المراحل اقتراحٌ لا معيارٌ مجرَّب: أتقبلها؟",
    en: "The limits: Berg by the minimal detectable change for its baseline (4, 5 or 7 — Donoghue 2009), gait speed +0.1 m/s (Perera 2006), and a timed up and go above 15 seconds or gait speed below 0.8 m/s as high risk that extends (Montero-Odasso 2022) — progression between phases is a proposal, not a tested criterion: do you accept them?" },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة مع طبيب المركز: الطوارئ (كسرُ الفقرة أو الورك الجديد، والإغماء، والضربةُ في الرأس مع مميّع الدم، والبقاءُ ساعةً على الأرض)، وتقييمُ العظم والدواء والسقوط (الضغطُ الانتصابيّ، والأدوية، والنظر، وفيتامين د بلا جرعاتٍ كبيرة متباعدة): مَن يقيس الضغطَ مستلقياً وواقفاً ويراجع الأدوية؟ ومَن يطلب فحصَ الكثافة وتصويرَ الفقرات ويحسب خطرَ الكسر بالنموذج العراقيّ؟",
    en: "The referral rules with the centre's doctor: emergency (a new vertebral or hip fracture, syncope, a head injury on blood thinners, an hour on the floor — Montero-Odasso 2022), and bone, medicine and falls assessment (orthostatic hypotension, medicines, vision, vitamin D with no large intermittent doses — Sanders 2010): who measures blood pressure lying and standing and reviews medicines? And who orders the density scan and vertebral imaging and calculates fracture risk by the Iraqi model (Abdulbari 2025)?" },
  { key: "impact-hirit", topic: "content",
    ar: "الصدمُ خمسون مرّةً أكثرَ الأيّام لمن ليس عنده كسرُ فقرة، والمقاومةُ والصدمُ عاليا الشدّة (٥ × ٥ بأكثر من ٨٥٪ مرّتين في الأسبوع ثمانيةَ أشهر) آمنان بفحصٍ وإشراف: أنقدّم المسارَ عالي الشدّة في المركز؟ ومَن يفحص قبله (تصويرُ الفقرات)؟ وهل في المركز أثقالٌ حرّة تكفي؟",
    en: "Fifty impacts on most days for those without a vertebral fracture (Brooke-Wavell 2022), and high-intensity resistance and impact (5 × 5 above 85% twice a week for eight months) is safe with screening and supervision (Watson 2018 · Watson 2019): do we offer the high-intensity pathway at the centre? Who screens beforehand (vertebral imaging)? And does the centre have enough free weights?" },
  { key: "orthoses-aids", topic: "content",
    ar: "المركزُ يصنع المساند: دعامةُ الظهر بعد كسر الفقرة دليلُها غيرُ حاسم، والصلبةُ كالليّنة وأكثرُ مضاعفات، ودراسةُ الدعامة المرنة الشهيرة ممّولةٌ من صانعها — أنصنعها لمن يحتاجها لألمٍ مؤقّت؟ وأداةُ المشي والحذاءُ ومقعدُ المرحاض المرتفع: يوفّرها المركز أم يُحيل؟ وواقيات الورك لا تنفع في البيت.",
    en: "The centre makes orthoses: a spinal orthosis after vertebral fracture has inconclusive evidence, rigid equals soft with more complications, and the well-known flexible-orthosis study was funded by its maker (Newman 2016 · Kato 2019 · Pfeifer 2004) — do we make one for those who need it for temporary pain? Walking aids, shoes and a raised toilet seat: does the centre supply them or refer? And hip protectors do not help at home (Santesso 2014)." },
  { key: "home-heat-prayer", topic: "content",
    ar: "البيتُ والحرُّ والصلاة: تعديلُ البيت ينفع عالي الخطر وأكثر بزيارة المعالج المختصّ — هل نزور البيت أم نكتفي بصوره؟ وفي رمضان والصيف: هل تكون جلساتُ مَن تجاوز الثمانين بعد الإفطار أو صباحاً؟ والصلاةُ الآمنة: هل يكفي ما كُتب في البطاقة؟",
    en: "Home, heat and prayer: modifying the home helps people at high risk, more so with a trained therapist's visit (Clemson 2023 · Pighills 2011) — do we visit the home or rely on photos? In Ramadan and summer: should sessions for people over eighty be after breaking the fast or in the morning (Basaran 2026)? And safe prayer: is what the card says enough?" },
  { key: "device-others", topic: "devices",
    ar: "التيّارُ المتداخل لألم كسر الفقرات المزمن مساعدٌ ٣٠ دقيقة يومياً أسبوعين — ما برنامجُه في جهاز المركز؟ والمغناطيسُ بقاعدتك بدليلٍ ضعيف ولا تجربةَ للكسر أو السقوط — أيُّ نوعٍ جهازُه وما إعداداتُه؟ والكمادةُ بشرط الإحساس؛ والموجاتُ الصادمة والروبوتُ والليزرُ «لا يُستخدم» لقرارك، والشدُّ ممنوع.",
    en: "Interferential current for chronic vertebral-fracture pain is an adjunct, 30 minutes daily for two weeks (Zambito 2007) — what is its programme on the centre's device? Magnetic therapy by your rule with weak evidence and no fracture or falls trial (Lang 2022) — which type is the device and what are its settings? The hot pack with intact sensation; shockwave, the robot and laser are 'not used' for your decision (Shi 2017 · Ozaki 2017 · Alayat 2017), and traction is forbidden." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: سرعةَ المشي (م/ث، الأكثر أفضل)، واختبارَ التوازن بأربع مراحل، والجلوسَ والقيامَ خمسَ مرّات بالثواني (الأقلّ أفضل)، والوقوفَ على ساقٍ بالثواني، وميني-بيست بالعربية (من ٢٨)، والخوفَ من السقوط بالصور بالعربية، وعددَ السقطات في سجلّها، والطولَ وانحناءَ الظهر، وقوّةَ القبضة، وجودةَ الحياة مع كسر الفقرات بالعربية.",
    en: "Add under 'Measures' → custom measure: gait speed (m/s, higher is better — Perera 2006), the four-stage balance test (Loonlawong 2022), five-times sit-to-stand in seconds (lower is better — Bohannon 2006b), one-leg stance in seconds (Larsson 2022), the Arabic Mini-BESTest (out of 28 — Alyousef 2023), the Arabic picture-based fear-of-falling scale (Almarwani 2025), the number of falls in the diary (Lamb 2005), height and kyphosis (Barrett 2018), grip strength (Cruz-Jentoft 2019), and Arabic quality of life with vertebral fracture (Rostom 2012)." },
];

export const name = "168_physio_osteoporosis_falls_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
