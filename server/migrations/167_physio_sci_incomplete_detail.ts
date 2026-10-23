// Migration 167: إصابة الحبل الشوكي — البروتوكولُ الثامن والعشرون مفصَّلاً (§4.ex — ٢٠٢٦-١٠-٢٣).
//
// المالك (٢٠٢٦-١٠-٢٣): «نكمل البروتوكول القادم تبعا لشيوع حالاته في العراق» — فاختار المساعدُ إصابةَ الحبل الشوكي (`sci-incomplete-adult`): في مركز الصليب الأحمر
// العراقيّ ٦١٣ مستفيداً بالشلل السفليّ والرباعيّ بعد البتر والشلل الدماغيّ وعقابيل شلل الأطفال (Barth 2020)، والأوّلان مفصَّلان وشللُ الأطفال لا بروتوكولَ له في المكتبة —
// فهي الأكثرُ شيوعاً في السبعةَ عشرَ الباقية؛ وفي ابن القف ببغداد ١٥٠٠ سجلٍّ بين ٢٠٠٣ و٢٠٠٨ (Al-Rubaye 2012).
// **بالقالب كاملاً** (§4.dd): ٣٦ جلسة × ستّ في الأسبوع × ٦٠ دقيقة وتمديدٌ واحد باثنتي عشرة لمن تقدّم بالفرق المهمّ ولم يبلغ أهدافَه، ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر
// في السنة الأولى وكلَّ ستّةٍ بعدها؛ وثلاثُ مراحل بنطاقات (١–٦ · ٧–٣٠ · ٣١–٣٦): التقييمُ والسلامةُ والأساسيات، ثمّ التدريبُ المكثّف القائم على النشاط بمسار المستوى،
// ثمّ المجتمعُ والبيتُ والوقاية — ومعاييرُ من الفرق المهمّ في المشي (Forrest 2014) والاستقلال (Scivoletto 2013a) وقوّة الساق (Scivoletto 2013b)؛ **ومساراتٌ بشدّة الإصابة
// ومستواها** (الحركيُّ الكامل A–B بالكرسيّ والانتقال والوقوف، وC بالمشي المسنود، وD بالمشي عالي الشدّة، والرباعيُّ باليد والتنفّس)؛ **وقواعدُ إحالةٍ** (فرطُ المنعكس
// اللاإراديّ، والخثرةُ، والكسرُ، والتدهورُ العصبيّ، وما ليس إصابةً رضّية)؛ وعشرُ بطاقاتٍ جديدة والمعادةُ بصورتها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛
// والمقاييسُ كما زُرعت (مستوى المشي وعشرةُ الأمتار وبيرغ والاستقلال)؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده سليم.
//
// **ما يخصّ الحبلَ الشوكيّ**: الإرشاداتُ الأمريكية للحبل الشوكيّ في السلامة كلِّها (فرطُ المنعكس والضغطُ والحرارة — Krassioukov 2021، والجلد — PVA 2014، والكتف — PVA 2005a،
// والتنفّس — PVA 2005b، والعظم — PVA 2022، والألم — PVA 2026a، والنتائج — PVA 2026b)، والتمرينُ (Martin Ginis 2018)، والمشيُ بعد ستّة أشهر بشدّةٍ متوسّطة إلى عالية والسيرُ
// المسنودُ والروبوتُ ضدّه للماشي المزمن (Hornby 2020). **والجرعة**: التجاربُ ٣–٥ في الأسبوع ٨–٢٤ أسبوعاً، و٤٤٪ من ساعات التأهيل في السنة الأولى بعد الخروج (Whiteneck 2011)،
// ولا تجربةَ قارنت الكتلَ بالمستمرّ (بحثٌ صفريّ) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ أساسيّ؛ والتحفيزُ مساعدٌ بأرقامه (PVA 2022 · Bekhet 2019)؛
// والروبوتُ مساعدٌ بشرطه لغير الماشي في السنة الأولى؛ والمغناطيسُ والكمادةُ بقاعدة المركز وشروطها؛ **والموجاتُ الصادمة «لا يُستخدم»** (لا تجربةَ مضبوطة — فلا إعداداتٍ تمنع اعتمادَه)؛
// والباقي «لا يُستخدم». **وما يخصّ العراق**: العنفُ أوّلُ الأسباب (٦٤٪ في بغداد، والحربُ ٦٦٫٢٪ في تكريت — Al-Rubaye 2012 · Azeez 2022) والكاملةُ أكثرُها (٧٩٫٢٪ · ٧١٫٨٪)،
// وناجو الحرب في الموصل بمضاعفاتٍ مزمنة (Fathe 2024)، والنفقُ الرسغيّ عند ٦٤٪ من مستعملي الكرسيّ في ابن القف (Alwan 2012)، وحقنُ الخلايا الجذعية بلا مجموعةٍ ضابطة (Hammadi 2012)،
// وحرُّ الصيف عند مَن لا يتعرّق (Trbovich 2021 · Griggs 2019).
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٢٦٠ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ مولَّداً من الجدول، ولا مرجعَ قبل ١٩٩٠)،
// والإرشاداتُ من نصوصها. القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — عشرٌ للحبل الشوكيّ؛ والمعادةُ تُربط برمزها وصورتها، وما يخصّ الإصابةَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "sci-pressure-relief", nameAr: "تخفيف الضغط في الكرسيّ: الميلُ إلى الأمام أو الجانبين دقيقتين كلَّ نصف ساعة", nameEn: "Pressure relief in the wheelchair: leaning forward or to each side for two minutes every half hour",
    kind: "functional", region: "whole_body", sets: 1, reps: 1, hold: 120,
    purpose: ["قرحةُ الضغط أخطرُ ما يتكرّر بعد إصابة الحبل الشوكيّ: أصابت ٣٧٫٥٪ أثناء العلاج في المستشفى، وأكثرَ مَن إصابتُه كاملة (Brienza 2018)، وتعفّنُها أوّلُ أسباب الوفاة في السنتين بعد الخروج في بنغلادش (Hossain 2016)، وفي ابن القف ببغداد أصابت المضاعفاتُ الثانوية ٦٠٫٦٪ (Al-Rubaye 2012). والإرشاد: يُرفع الضغطُ عن المقعد دقيقةً إلى دقيقتين كلَّ ٣٠ دقيقة، والرفعُ المعتاد ١٥–٣٠ ثانية لا يكفي، والميلُ إلى الأمام أو الجانب أو إمالةُ الكرسيّ ٤٥–٦٥° فأكثر تكفي (PVA 2014) — فالنسيجُ احتاج دقيقةً و٥١ ثانية في المتوسّط ليستعيد أكسجينه (Coggrave 2003)، والميلُ خفض ضغطَ عظمتَي الجلوس وزاد الدمَ فيهما على كلّ وسادة (Sonenblum 2014)، وهو أحفظُ للكتف من رفع الجسم باليدين (Coggrave 2003).",
      "Pressure injury is the most dangerous recurring complication after spinal cord injury: it affected 37.5% during hospital treatment, more often with complete injury (Brienza 2018), its infection was the leading cause of death in the two years after discharge in Bangladesh (Hossain 2016), and at Ibn Al-Quff in Baghdad secondary complications affected 60.6% (Al-Rubaye 2012). The guideline: offload the seat for one to two minutes every 30 minutes; the usual 15–30-second lifts are not enough, while forward or side leans or a chair tilt of 45–65° or more work (PVA 2014) — tissue needed a mean of 1 minute 51 seconds to regain its oxygen (Coggrave 2003), and leaning lowered pressure under the sitting bones and raised blood flow on every cushion (Sonenblum 2014), and it spares the shoulder more than a push-up lift (Coggrave 2003)."],
    start: ["جالسٌ في كرسيّه على وسادته الموصوفة، والفرامل مقفلة، والقدمان ثابتتان على المسند أو الأرض، ومنبّهُ الهاتف مضبوطٌ على كلّ ٣٠ دقيقة.", "Sitting in the wheelchair on the prescribed cushion, brakes locked, feet steady on the footplate or floor, and a phone alarm set for every 30 minutes."],
    steps: [[
      "اقفل الفرامل، وثبّت القدمين على الأرض أو المسند قبل أن تميل.",
      "إلى الأمام: انحنِ بصدرك على فخذيك ويداك نحو قدميك أو على إطار الكرسيّ، فترتفع عظمتا الجلوس عن الوسادة.",
      "ابقَ دقيقتين وتنفّس طبيعياً، ثمّ اعتدل ببطء بيديك على فخذيك.",
      "أو إلى الجانب: علّق ذراعاً خلف مقبض الكرسيّ وامِل إلى الجهة الأخرى دقيقة، ثمّ الجهةَ الثانية دقيقة.",
      "في الكرسيّ الكهربائيّ بالإمالة: أمِل الظهرَ إلى ٤٥° فأكثر دقيقتين.",
      "مَن لا يستطيع وحده (إصابةُ الرقبة العالية): المرافقُ يميل به إلى الأمام أو الجانب بالطريقة نفسها كلَّ ٣٠ دقيقة.",
      "افحص الجلدَ صباحاً ومساءً بمرآة (عظمتا الجلوس، والعجز، والكعبان، والوركان)، والاحمرارُ الذي لا يزول علامةُ خطر.",
    ], [
      "Lock the brakes and steady the feet on the floor or footplate before leaning.",
      "Forward: bend your chest onto your thighs with your hands towards your feet or on the chair frame, so the sitting bones lift off the cushion.",
      "Stay for two minutes breathing normally, then sit up slowly with your hands on your thighs.",
      "Or to the side: hook one arm behind the push handle and lean to the other side for a minute, then the second side for a minute.",
      "In a tilt-in-space power chair: tilt back to 45° or more for two minutes.",
      "A person who cannot do it alone (high neck injury): the carer leans them forward or sideways in the same way every 30 minutes.",
      "Check the skin morning and evening with a mirror (sitting bones, sacrum, heels and hips); redness that does not fade is a warning sign.",
    ]],
    cues: [[
      "رفعُ الجسم باليدين ١٥–٣٠ ثانية ⟵ ميلٌ دقيقتين (PVA 2014).",
      "مرّةً كلَّ ساعتين أو حين يتذكّر ⟵ كلَّ ٣٠ دقيقة بمنبّه.",
      "الفرامل مفتوحة أو القدمان معلّقتان ⟵ فرامل مقفلة وقدمان ثابتتان قبل الميل.",
      "وسادةٌ رقيقة أو مطويّة أو بلا وسادة ⟵ وسادتُه الموصوفة تُفحص كلَّ يوم (PVA 2014).",
    ], [
      "A push-up lift for 15–30 seconds → a two-minute lean (PVA 2014).",
      "Once every two hours or whenever remembered → every 30 minutes with an alarm.",
      "Brakes off or feet dangling → brakes locked and feet steady before leaning.",
      "A thin, folded or missing cushion → the prescribed cushion, checked daily (PVA 2014).",
    ]],
    easier: ["الميلُ إلى الأمام وصدرُه على وسادةٍ فوق فخذيه أو على طاولة، أو المرافقُ يسنده من كتفيه.", "Leaning forward with the chest on a pillow over the thighs or on a table, or with the carer supporting the shoulders."],
    harder: ["الميلُ وحده بلا إسناد، ودمجُه في الحياة: يميل وهو يقرأ أو يكلّم أو يلبس حذاءه.", "Leaning alone without support, and folding it into life: leaning while reading, talking or putting on shoes."],
    stopIf: ["دوخةٌ أو غشاوة (هبوطُ الضغط) ⟵ اعتدل ببطء وارفع ساقيك؛ صداعٌ نابض أو تعرّقٌ واحمرارٌ فوق مستوى الإصابة (فرطُ المنعكس اللاإراديّ) ⟵ اجلس مستقيماً وافحص المثانةَ والملابس كما في بطاقته؛ احمرارٌ لا يزول أو جرح ⟵ لا جلوسَ عليه وإلى الأخصائيّ.", "Dizziness or blurred vision (low blood pressure) → sit up slowly and raise the legs; a pounding headache, or sweating and flushing above the injury level (autonomic dysreflexia) → sit upright and check the bladder and clothing as on its card; redness that does not fade or a wound → no sitting on it and see the specialist."],
    equipment: ["وسادةُ كرسيٍّ موصوفة، ومنبّهٌ في الهاتف أو الساعة، ومرآةٌ لفحص الجلد.", "A prescribed wheelchair cushion, an alarm on a phone or watch, and a mirror for skin checks."],
    doseNote: ["دقيقةٌ إلى دقيقتين كلَّ ٣٠ دقيقة من الجلوس طوال اليوم، وتغييرُ الوضع في السرير كلَّ ساعتين في الأشهر الأولى (PVA 2014).", "One to two minutes every 30 minutes of sitting all day, and turning in bed every two hours in the early months (PVA 2014)."],
    images: [{ key: "sci-pressure-relief-1", ar: "رسمٌ لشخصٍ في كرسيّه المتحرّك ينحني بصدره على فخذيه ويداه عند قدميه، فيرتفع الضغطُ عن عظمتَي الجلوس", en: "A drawing of a person in a wheelchair bending the chest onto the thighs with the hands at the feet, lifting the pressure off the sitting bones", search: "spinal cord injury wheelchair forward lean pressure relief" }],
  },
  {
    code: "sci-sliding-board-transfer", nameAr: "الانتقالُ بلوح الانزلاق بين الكرسيّ والسرير", nameEn: "Sliding-board transfer between the wheelchair and the bed",
    kind: "functional", region: "whole_body", sets: 1, reps: 5, rest: 60,
    purpose: ["الانتقالُ مفتاحُ الاستقلال لمن يستعمل الكرسيّ: تدريبُ الانتقال وتوازنِ الجلوس لكلّ مَن ضعُف جذعُه أو ذراعاه (PVA 2026b)، واللوحُ يجعل الانتقالَ أقلَّ حِملاً على الكتف — فالانتقالُ بين سطحين بارتفاعٍ واحد، وتبديلُ اليد القائدة، والمقابضُ والألواح، وأقلُّ عددٍ في اليوم (PVA 2005a)؛ ففي الانتقال بالدوران قوى على الكتف أكبرُ منها في رفع الجسم، وأكبرُ في اليد القائدة (Gagnon 2008). والكتفُ يتألّم عند ٥٩٪ في الشلل الرباعيّ و٤٢٪ في السفليّ (Curtis 1999)، والانتقالُ من الأرض إلى الكرسيّ نجح فيه ٤٠٫٦٪ وحدهم (Hosseini 2012).",
      "Transferring is the key to independence for a wheelchair user: transfer and seated-balance training for everyone with a weak trunk or arms (PVA 2026b), and the board lowers the load on the shoulder — level transfers, varying the leading arm, handgrips and boards, and as few transfers a day as possible (PVA 2005a); a sitting pivot transfer loads the shoulder more than a weight-relief lift, and the leading arm most (Gagnon 2008). Shoulder pain affects 59% with tetraplegia and 42% with paraplegia (Curtis 1999), and only 40.6% succeeded at a floor-to-wheelchair transfer (Hosseini 2012)."],
    start: ["الكرسيُّ بجانب السرير بزاويةٍ صغيرة والسطحان بارتفاعٍ واحد، والفرامل مقفلة، ومسندُ الذراع القريب مرفوع، والقدمان على الأرض.", "The wheelchair beside the bed at a slight angle with both surfaces level, brakes locked, the near armrest removed, and the feet on the floor."],
    steps: [[
      "قرّب الكرسيَّ من السرير بزاويةٍ صغيرة واقفل الفرامل، وأزل مسندَ الذراع القريب وأبعد مسندَي القدمين.",
      "انقل وزنك إلى الجهة البعيدة، وادفع طرفَ اللوح تحت فخذك القريب، وضع طرفَه الآخر على السرير.",
      "ثبّت القدمين على الأرض، وانحنِ إلى الأمام قليلاً — الرأسُ يذهب عكسَ الحوض.",
      "يدٌ على اللوح ويدٌ على الكرسيّ، وادفع بدفعاتٍ قصيرة تنزلق فيها على اللوح ولا تقفز.",
      "حين تصل اثبت جالساً، ثمّ انقل وزنك وأخرج اللوح ورتّب ساقيك.",
      "بدّل اليدَ القائدة بين انتقالٍ وآخر، واجعل السطحين بارتفاعٍ واحد قدر الإمكان.",
    ], [
      "Bring the chair close to the bed at a slight angle and lock the brakes; remove the near armrest and swing away the footrests.",
      "Shift your weight to the far side, push one end of the board under your near thigh, and rest the other end on the bed.",
      "Steady both feet on the floor and lean forward a little — the head goes opposite to the hips.",
      "One hand on the board and one on the chair, push in short moves that slide you along the board rather than jumping.",
      "Once across, settle in sitting, then shift your weight, take out the board and arrange your legs.",
      "Change the leading arm from one transfer to the next, and keep both surfaces level as far as possible.",
    ]],
    cues: [[
      "قفزةٌ واحدة كبيرة ⟵ دفعاتٌ قصيرة على اللوح.",
      "الجلدُ العاري يحتكّ باللوح ⟵ ملابسُ بين الجلد واللوح، والحوضُ يرتفع قليلاً مع كلّ دفعة.",
      "اليدُ نفسُها تقود كلَّ مرّة ⟵ تبديلُ اليد القائدة (Gagnon 2008).",
      "الكرسيُّ بعيدٌ أو الفرامل مفتوحة ⟵ قريبٌ مقفل قبل البدء.",
    ], [
      "One big jump → short pushes along the board.",
      "Bare skin dragging on the board → clothing between skin and board, with the hips lifted a little on each push.",
      "The same arm leading every time → changing the leading arm (Gagnon 2008).",
      "The chair far away or the brakes off → close and locked before starting.",
    ]],
    easier: ["المرافقُ أمامه يثبّت ركبتيه بركبتيه ويمسك حزامَ النقل عند الحوض، والسطحُ المقصود أخفضُ قليلاً من الكرسيّ.", "The carer in front steadies the knees with their own and holds a transfer belt at the hips, with the target surface slightly lower than the chair."],
    harder: ["بلا لوح (انتقالٌ بالدوران)، ثمّ إلى سطوحٍ أخرى: المرحاض، والسيارة، والأرض — وهي أصعبُها (Hosseini 2012).", "Without a board (a pivot transfer), then to other surfaces: the toilet, the car and the floor — the hardest of them (Hosseini 2012)."],
    stopIf: ["ألمٌ في الكتف أو الرسغ يزيد ⟵ قلّل عددَ الانتقالات في اليوم وأخبر الأخصائيّ؛ احمرارٌ أو خدشٌ في الفخذ أو الحوض ⟵ افحص الجلد ولا تنتقل عليه حتى يُفحص؛ دوخةٌ أو صداعٌ نابض ⟵ توقّف واجلس مستقيماً.", "Shoulder or wrist pain that is increasing → fewer transfers a day and tell the specialist; redness or a scrape on the thigh or buttock → check the skin and do not transfer on it until checked; dizziness or a pounding headache → stop and sit upright."],
    equipment: ["لوحُ انتقالٍ أملس بفتحتين، وكرسيٌّ بمسند ذراعٍ يُنزع، وحزامُ نقلٍ للمرافق.", "A smooth transfer board with two hand holes, a wheelchair with a removable armrest, and a transfer belt for the carer."],
    doseNote: ["خمسةُ انتقالاتٍ متدرّبة في الجلسة ثمّ في الحياة اليومية، وأقلُّ عددٍ يكفي في اليوم حفظاً للكتف (PVA 2005a).", "Five practised transfers per session, then in daily life, with the fewest a day that suffice to protect the shoulder (PVA 2005a)."],
    images: [{ key: "sci-sliding-board-transfer-1", ar: "امرأةٌ جالسةٌ على حافّة السرير تضع لوحَ الانتقال الخشبيّ بين السرير وكرسيّها المتحرّك قبل أن تنزلق عليه", en: "A woman sitting on the edge of the bed places the wooden transfer board between the bed and her wheelchair before sliding across", search: "spinal cord injury sliding board transfer bed wheelchair" }],
  },
  {
    code: "sci-standing-frame", nameAr: "الوقوفُ في جهاز الوقوف للبالغ", nameEn: "Standing in a standing frame for adults",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["لمن لا يقف وحده: الوقوفُ المسنود في البيت ٣٠ دقيقة خمسَ مرّاتٍ في الأسبوع حسّن المدى والنشاط، وساعةٌ يومياً للمزاج وكثافة العظم (Paleg 2015)؛ والإرشادُ يجيز الوقوفَ ساعةً خمسَ مرّاتٍ في الأسبوع سنتين فأكثر لإبطاء نقص عظم الورك والركبة، ولا رقمَ لكثافة العظم يمنع الوقوفَ وحده (PVA 2022). فالكسرُ أصاب أكثرَ من نصف مَن إصابتُه حركيّاً كاملة، وأكثرُه عند الركبة (Morse 2019)، والتيبّسُ أصاب ٦٦٪ في السنة الأولى والكاحلُ ٤٠٪ (Diong 2012)، والتمطيطُ وحده لا يزيد المدى إلّا درجتين (Harvey 2017).",
      "For a person who cannot stand alone: supported standing at home for 30 minutes five times a week improved range and activity, and an hour a day helped mood and bone density (Paleg 2015); the guideline allows standing for an hour five times a week for two years or more to slow bone loss at the hip and knee, and no bone density value on its own rules standing out (PVA 2022). Fractures affected more than half of those with motor-complete injury, mostly at the knee (Morse 2019), contractures affected 66% in the first year with the ankle in 40% (Diong 2012), and stretching alone adds only two degrees of range (Harvey 2017)."],
    start: ["جالسٌ بجانب جهاز الوقوف أو الطاولة المائلة، وجهازُ الضغط على ذراعه، والحذاءُ في قدميه.", "Sitting beside the standing frame or tilt table, with the blood pressure cuff on the arm and shoes on."],
    steps: [[
      "قِس الضغطَ والنبضَ جالساً قبل البدء.",
      "انتقل إلى الجهاز (بلوح الانتقال إن لزم)، واربط الأحزمة عند الركبتين والحوض والصدر إن لزم.",
      "ارفعه تدريجياً — زاويةٌ أقلّ في الأيّام الأولى ثمّ أكثر — وقِس الضغطَ والنبض بعد كلّ رفعة.",
      "القدمان مسطّحتان على اللوح والكعبان على الأرض، فيمتدّ الساقُ والكاحل.",
      "ضع أمامه على الطاولة عملاً بيديه — قراءةً أو أكلاً أو لعبةً أو تمارينَ للذراع — ليمضي الوقتُ مفيداً.",
      "أنزله ببطء آخرَ الوقت، وافحص جلدَ الركبتين والقدمين والحوض.",
    ], [
      "Measure blood pressure and pulse in sitting before starting.",
      "Transfer into the frame (with the board if needed) and fasten the straps at the knees, the hips and the chest if needed.",
      "Raise them gradually — a smaller angle in the first days, then more — measuring blood pressure and pulse after each rise.",
      "Feet flat on the plate with the heels down, so the calf and ankle are stretched.",
      "Put work for the hands on the tray — reading, eating, a game or arm exercises — so the time is useful.",
      "Lower them slowly at the end, and check the skin of the knees, feet and hips.",
    ]],
    cues: [[
      "رفعٌ مفاجئ إلى الوقوف الكامل ⟵ تدريجياً مع قياس الضغط (Krassioukov 2021).",
      "الكعبان مرتفعان والقدمان معلّقتان ⟵ القدمان مسطّحتان بالحذاء.",
      "وقوفٌ يُعدّ دقائقُه وهو يحدّق في الحائط ⟵ عملٌ بيديه على الطاولة.",
      "يُترك وحده أوّلَ مرّة ⟵ معه مَن يقيس الضغطَ حتى يثبت.",
    ], [
      "A sudden rise to full standing → gradually, with blood pressure checks (Krassioukov 2021).",
      "Heels raised and feet hanging → feet flat in shoes.",
      "Standing while counting the minutes and staring at the wall → work for the hands on the tray.",
      "Left alone the first time → someone measuring blood pressure until it is stable.",
    ]],
    easier: ["الطاولةُ المائلة بزاويةٍ أقلّ وأوقاتٌ أقصر، ومشدّةُ البطن والجواربُ الضاغطة إن وصفها الطبيب.", "The tilt table at a smaller angle for shorter times, with the abdominal binder and compression stockings if the doctor prescribed them."],
    harder: ["نقلُ الوزن والوصولُ بيدٍ واحدة خارج الجهاز، ثمّ الوقوفُ بالدعامتين الطويلتين بين المتوازيين (بطاقتُها).", "Shifting weight and reaching with one hand outside the frame, then standing in long leg braces between parallel bars (its own card)."],
    stopIf: ["دوخةٌ أو غشاوةٌ أو غثيان، أو هبوطُ الضغط الانقباضيّ ٢٠ ملم زئبق فأكثر (هبوطٌ انتصابيّ — Krassioukov 2021) ⟵ أنزله إلى الجلوس أو الاستلقاء وارفع ساقيه؛ صداعٌ نابض وتعرّقٌ فوق الإصابة ⟵ فكّ الأحزمة واتّبع بطاقة فرط المنعكس؛ تورّمٌ أو حرارةٌ أو تشوّهٌ في ساقٍ أو ركبة (كسرٌ أو خثرة) ⟵ لا وقوف، وإلى الطبيب اليوم.", "Dizziness, blurred vision or nausea, or a fall in systolic pressure of 20 mmHg or more (orthostatic hypotension — Krassioukov 2021) → lower to sitting or lying and raise the legs; a pounding headache and sweating above the injury → loosen the straps and follow the dysreflexia card; swelling, warmth or deformity in a leg or knee (a fracture or a clot) → no standing, and to the doctor the same day."],
    equipment: ["جهازُ وقوفٍ بأحزمةٍ ومسندَي ركبةٍ وطاولة، أو طاولةٌ مائلة، وجهازُ ضغط.", "A standing frame with straps, knee blocks and a tray, or a tilt table, and a blood pressure monitor."],
    doseNote: ["٣٠ دقيقة خمسَ مرّاتٍ في الأسبوع للمدى والنشاط، وساعةٌ يومياً للعظم والمزاج (Paleg 2015 · PVA 2022).", "30 minutes five times a week for range and activity, and an hour a day for bone and mood (Paleg 2015 · PVA 2022)."],
    images: [{ key: "sci-standing-frame-1", ar: "امرأةٌ واقفةٌ في جهاز الوقوف، ركبتاها على مسندَي الركبة وذراعاها على الطاولة أمامها", en: "A woman standing in a standing frame with her knees against the knee blocks and her arms resting on the tray in front of her", search: "adult spinal cord injury standing frame stander" }],
  },
  {
    code: "sci-tenodesis-grasp", nameAr: "قبضةُ الوتر: رفعُ الرسغ يقبض الأصابعَ وثنيُه يفتحها", nameEn: "Tenodesis grasp: lifting the wrist closes the fingers and dropping it opens them",
    kind: "functional", region: "wrist_hand", sets: 3, reps: 10, rest: 60,
    purpose: ["في الشلل الرباعيّ حين تعمل رافعاتُ الرسغ ولا تعمل الأصابع: رفعُ الرسغ يشدّ أوتارَ الأصابع فتنقبض نحو الإبهام، وثنيُه يفتحها — فيمسك المريضُ الكوبَ والملعقةَ والمفتاحَ بلا عضلات أصابع. وفي الهند حسّنت جبيرةُ قبضة الوتر الرخيصة من البلاستيك الحراريّ مع أسبوعين من التدريب اليوميّ وظيفةَ اليد في الأسبوع ١٢ — للأزرار والمفتاح — عند مَن قوّةُ رافعات رسغه ٣ من ٥ فأكثر (Sonune 2024). وقوّةُ الرسغ وحدها لم تتحسّن بالمقاومة إلّا ٨٪ ولم يتغيّر بها استعمالُ اليد (Glinsky 2008)، والتدريبُ الكثير على المهمّة نفع (Anderson 2019 · Hoffman 2010) — فالمهمّةُ هي التمرين.",
      "In tetraplegia when the wrist extensors work and the finger muscles do not: lifting the wrist tightens the finger tendons so the fingers close towards the thumb, and dropping it opens them — so the person can hold a cup, a spoon or a key without finger muscles. In India a low-cost thermoplastic tenodesis splint with two weeks of daily training improved hand function at week 12 — for buttons and keys — in people with wrist extensor strength of 3/5 or more (Sonune 2024). Wrist strength alone rose only 8% with resistance and hand use did not change (Glinsky 2008), while massed task practice helped (Anderson 2019 · Hoffman 2010) — so the task is the exercise."],
    start: ["جالسٌ إلى طاولة، والساعدُ مسنودٌ عليها، والأغراضُ أمامه: كوبٌ خفيف، وملعقةٌ بمقبضٍ سميك، ومكعّبات، ومفتاح.", "Sitting at a table with the forearm supported on it, and the objects in front: a light cup, a thick-handled spoon, blocks and a key."],
    steps: [[
      "دع الرسغَ يسقط إلى الأسفل بالجاذبية فتنفتح الأصابع.",
      "ضع اليدَ المفتوحة حول الغرض — الكوب أو المكعّب.",
      "ارفع الرسغَ إلى الأعلى بقوّة فتنقبض الأصابعُ حول الغرض.",
      "أبقِ الرسغَ مرفوعاً وأنت تنقل الغرضَ إلى مكانٍ آخر.",
      "اترك الرسغَ يسقط فينفلت الغرض.",
      "انتقل من الكبير إلى الصغير، ثمّ إلى مهامّ الحياة: الأكلُ بالملعقة، والشربُ بالكوب، وفتحُ الباب بالمفتاح.",
    ], [
      "Let the wrist drop down with gravity so the fingers open.",
      "Place the open hand around the object — the cup or the block.",
      "Lift the wrist up firmly so the fingers close around the object.",
      "Keep the wrist lifted while moving the object to another place.",
      "Let the wrist drop so the object is released.",
      "Move from large to small, then to daily tasks: eating with a spoon, drinking from a cup, opening a door with a key.",
    ]],
    cues: [[
      "تمطيطُ الأصابع والرسغُ مرفوع ⟵ الأصابعُ تُمطّ والرسغُ مثنيّ، فلا يرتخي الوترُ الذي يقبضها.",
      "تمرينُ مقاومةٍ للرسغ وحده ⟵ المهمّةُ نفسُها بالقبضة مرّاتٍ كثيرة (Glinsky 2008).",
      "غرضٌ ثقيلٌ أو أملس يسقط ⟵ خفيفٌ بمقبضٍ سميك أو مطّاطيّ أوّلاً.",
      "المرافقُ يمسك عنه ⟵ يحاول هو والمرافقُ يثبّت الطاولة.",
    ], [
      "Stretching the fingers with the wrist lifted → the fingers are stretched with the wrist bent, so the tendon that closes them does not slacken.",
      "Resistance exercise for the wrist alone → the task itself with the grasp, many times (Glinsky 2008).",
      "A heavy or slippery object that falls → a light one with a thick or rubber handle first.",
      "The carer holding things for them → the person tries and the carer steadies the table.",
    ]],
    easier: ["أغراضٌ أكبر وأخفّ، وجبيرةُ قبضة الوتر كما صنعها قسمُ المساند، والساعدُ مسنود.", "Bigger, lighter objects, the tenodesis splint as made by the orthotics department, and the forearm supported."],
    harder: ["أغراضٌ أصغر (عملةٌ معدنية، وقلم)، والساعدُ في الهواء، ومهامُّ بالترتيب: يصبّ ثمّ يشرب.", "Smaller objects (a coin, a pen), the forearm in the air, and tasks in sequence: pour and then drink."],
    stopIf: ["ألمٌ أو تنميلٌ جديد في الرسغ أو الإبهام ⟵ توقّف وأخبر الأخصائيّ — فالنفقُ الرسغيّ شائعٌ عند مستعملي الكرسيّ (Alwan 2012)؛ احمرارٌ تحت الجبيرة ⟵ تُنزع وتُعدَّل.", "New pain or tingling in the wrist or thumb → stop and tell the specialist — carpal tunnel syndrome is common in wheelchair users (Alwan 2012); redness under the splint → remove it for adjustment."],
    equipment: ["كوبٌ خفيف، وملعقةٌ بمقبضٍ سميك، ومكعّبات، ومفتاح، وجبيرةُ قبضة الوتر إن صُنعت.", "A light cup, a thick-handled spoon, blocks, a key, and the tenodesis splint if made."],
    doseNote: ["٣ × ١٠ قبضاتٍ في الجلسة، ثمّ في مهامّ اليوم كلِّه؛ والجبيرةُ بأسبوعين من التدريب اليوميّ (Sonune 2024).", "3 × 10 grasps per session, then in the whole day's tasks; with the splint, two weeks of daily training (Sonune 2024)."],
    images: [{ key: "sci-tenodesis-grasp-1", ar: "يدٌ في صورتين: الرسغُ مثنيٌّ إلى الأسفل فتنفتح الأصابع، ثمّ مرفوعٌ إلى الأعلى فتنقبض الأصابعُ نحو الإبهام", en: "A hand in two photos: the wrist bent down so the fingers open, then lifted up so the fingers close towards the thumb", search: "tenodesis grasp wrist extension tetraplegia hand" }],
  },
  {
    code: "sci-assisted-cough", nameAr: "السعالُ المُعان: دفعُ البطن مع السعال", nameEn: "Assisted cough: an abdominal push timed with the cough",
    kind: "breathing", region: "thoracic", sets: 3, reps: 3, rest: 60,
    purpose: ["في الشلل الرباعيّ والسفليّ العالي تضعف عضلاتُ البطن فيضعف السعال، والتهابُ الرئة أصاب ١٤٪ أثناء التأهيل في وسط اليوم السادس، وأكثرَ في الرباعيّ وفي الإصابة الكاملة (Mueller 2024)؛ والإرشادُ يجعل السعالَ المُعانَ ومشدّةَ البطن وجهازَ السعال الآليّ أدواتِ تنظيف الصدر، ويقيس سعةَ الرئة وقوّةَ الشهيق وقوّةَ السعال دورياً (PVA 2005b). ومشدّةُ البطن رفعت قوّةَ السعال من ٢٧٧ إلى ٣٤٥ لتراً في الدقيقة (Julia 2011) وسعةَ الرئة ٠٫٣٤ لتر (Wadsworth 2012).",
      "In tetraplegia and high paraplegia the abdominal muscles are weak, so the cough is weak; pneumonia affected 14% during rehabilitation at a median of day six, more often with tetraplegia and complete injury (Mueller 2024). The guideline makes assisted coughing, the abdominal binder and mechanical cough assistance the tools for clearing the chest, with vital capacity, inspiratory strength and cough strength measured periodically (PVA 2005b). A binder raised cough peak flow from 277 to 345 litres per minute (Julia 2011) and vital capacity by 0.34 litres (Wadsworth 2012)."],
    start: ["جالسٌ في كرسيّه أو مستلقٍ على ظهره، والمرافقُ أمامه أو بجانبه، وكفّا المرافق فوق بعضهما على أعلى البطن تحت الأضلاع.", "Sitting in the wheelchair or lying on the back, the carer in front or alongside, with the carer's hands one over the other on the upper abdomen below the ribs."],
    steps: [[
      "ضع كفّاً فوق الأخرى على أعلى البطن تحت الأضلاع — لا على الأضلاع ولا على المعدة الممتلئة.",
      "اطلب منه أن يأخذ أعمقَ نفسٍ يستطيع، مرّتين أو ثلاثاً، ويحبسه لحظة.",
      "قولا معاً «واحد، اثنان، اسعل».",
      "مع السعال ادفع بكفّيك إلى الداخل والأعلى بسرعةٍ وقوّة.",
      "ارتح بين المرّات، وكرّر حتى يخرج البلغم أو يتعب.",
      "علّم الأهلَ والمريضَ نفسَه — ومن يستطيع يدفع بطنَه بذراعيه وهو ينحني إلى الأمام.",
    ], [
      "Place one hand over the other on the upper abdomen below the ribs — not on the ribs and not on a full stomach.",
      "Ask the person to take the deepest breath they can, two or three times, and hold it for a moment.",
      "Count together 'one, two, cough'.",
      "With the cough, push your hands in and up quickly and firmly.",
      "Rest between tries and repeat until the phlegm comes up or they tire.",
      "Teach the family and the person themselves — someone who can presses the abdomen with the arms while leaning forward.",
    ]],
    cues: [[
      "الدفعُ قبل السعال أو بعده ⟵ في اللحظة نفسها مع السعال.",
      "الكفّان على الأضلاع ⟵ على أعلى البطن تحت الأضلاع.",
      "بعد الطعام مباشرة ⟵ قبله أو بعده بساعة.",
      "نفسٌ قصير قبل السعال ⟵ أعمقُ نفسٍ ممكن أوّلاً.",
    ], [
      "Pushing before or after the cough → at the same moment as the cough.",
      "Hands on the ribs → on the upper abdomen below the ribs.",
      "Straight after a meal → before it or an hour after.",
      "A short breath before the cough → the deepest breath possible first.",
    ]],
    easier: ["دفعٌ أخفّ في الاستلقاء، ومشدّةُ البطن في الجلوس إن وصفها الطبيب.", "A gentler push in lying, and the abdominal binder in sitting if the doctor prescribed it."],
    harder: ["يسعل وحده منحنياً إلى الأمام ويدفع بطنَه بذراعيه، أو مع تدريب عضلات الشهيق (بطاقةُ الجهاز).", "Coughing alone while leaning forward and pressing the abdomen with the arms, or with inspiratory muscle training (the device card)."],
    stopIf: ["ضيقُ نفسٍ يزيد، أو حرارة، أو بلغمٌ أصفر أو أخضر، أو نقصٌ في قوّة السعال (التهابُ رئة — PVA 2005b) ⟵ إلى الطبيب اليوم؛ ألمٌ في البطن أو الصدر، أو مصفاةٌ في الوريد الأجوف أو جراحةٌ حديثة في البطن، أو كسرٌ في الأضلاع ⟵ لا دفع.", "Increasing breathlessness, fever, yellow or green phlegm, or a weaker cough (pneumonia — PVA 2005b) → to the doctor the same day; abdominal or chest pain, a vena cava filter or recent abdominal surgery, or broken ribs → no pushing."],
    equipment: ["لا شيء — أو مشدّةُ بطنٍ موصوفة، ومنديلٌ ووعاء.", "Nothing — or a prescribed abdominal binder, tissues and a bowl."],
    doseNote: ["٣ × ٣ سعلاتٍ في الجلسة ومرّتين يومياً في البيت، وكلّما احتاج عند البرد والبلغم.", "3 × 3 coughs per session and twice a day at home, and whenever needed with colds and phlegm."],
    images: [{ key: "sci-assisted-cough-1", ar: "رسمٌ لمرافقٍ يدفع بكفّيه على أعلى بطن رجلٍ جالس وهو يسعل، وفي الإطارين موضعُ اليدين تحت الأضلاع والكفُّ فوق الكفّ", en: "A drawing of a carer pushing with both hands on the upper abdomen of a seated man as he coughs, with insets showing the hand position below the ribs and one hand over the other", search: "spinal cord injury assisted cough abdominal thrust" }],
  },
  {
    code: "sci-kafo-walking", nameAr: "المشيُ بالدعامتين الطويلتين والعكّازين", nameEn: "Walking with long leg braces and crutches",
    kind: "functional", region: "whole_body", sets: 1, reps: 5, rest: 120,
    purpose: ["لمن إصابتُه في الظهر أو أسفله: المتوقّعُ للإصابة الكاملة حركيّاً من T1 إلى T12 المشيُ في البيت أو الوقوفُ بالدعامات الطويلة والمشّاية أو العكّازين، ومن L1 إلى L3 المشيُ بالدعامة الطويلة أو القصيرة والكرسيُّ للمسافات، ومن L4 إلى S1 بالقصيرة والعكّازين (PVA 2026b). لكنّه بطيءٌ مكلف: ١١٫٥ متراً في الدقيقة على الأكثر بدعامةٍ تبادلية (Harvey 1998)، وتوقّف ٧١٪ عنها في خمس سنين (Sykes 1995)، وترك ٢٤ من ٧٤ دعاماتهم في ستّة أشهر ولم تكن بديلاً للكرسيّ (Franceschini 1997). فهي تمرينٌ ووقوفٌ وهدفٌ يختاره المريض، لا وعدٌ بالاستغناء عن الكرسيّ. وللإصابة غير الكاملة: الدعامةُ القصيرة بمفصل مع التحفيز أسرعُ مشياً من أحدهما وحده (Kim 2004).",
      "For a thoracic or lower injury: the expected outcome for motor-complete T1–T12 is household walking or standing with long leg braces and a walker or crutches, for L1–L3 walking with long or short braces and a wheelchair for distance, and for L4–S1 short braces and crutches (PVA 2026b). But it is slow and costly: at most 11.5 metres a minute with a reciprocating orthosis (Harvey 1998), 71% had stopped using it within five years (Sykes 1995), and 24 of 74 abandoned their orthoses within six months, which were no alternative to the wheelchair (Franceschini 1997). So it is exercise, standing and a goal the person chooses, not a promise of leaving the wheelchair. For incomplete injury: a hinged short brace with stimulation gave faster walking than either alone (Kim 2004)."],
    start: ["واقفٌ بين المتوازيين أو بالمشّاية، والدعامتان مقفلتان عند الركبة، والحذاءُ في القدمين، والمعالجُ خلفه بحزام النقل.", "Standing between parallel bars or with a walker, both braces locked at the knee, shoes on, with the therapist behind holding a transfer belt."],
    steps: [[
      "قم من الكرسيّ إلى الوقوف بالدعامتين المقفلتين بين المتوازيين، والمعالجُ يمسك الحزام.",
      "قف مستقيماً: الحوضُ إلى الأمام والكتفان إلى الخلف، فيستند الجسمُ على أربطة الورك.",
      "انقل الوزنَ من جهةٍ إلى أخرى ومن الأمام إلى الخلف حتى يثبت التوازن.",
      "امشِ بالتأرجح: العكّازان أو المتوازيان إلى الأمام، ثمّ ادفع بذراعيك وأرجح الساقين معاً إلى ما بعدهما أو إلى مستواهما.",
      "أو بالخطوة التبادلية إن كان في الوركين حركة: عكّازٌ ثمّ الساقُ المقابلة.",
      "انتقل من المتوازيين إلى المشّاية ثمّ العكّازين، والجلوسُ والقيامُ والدرجةُ بالعكّازين حين يثبت.",
    ], [
      "Stand up from the chair with both braces locked between parallel bars, the therapist holding the belt.",
      "Stand upright: hips forward and shoulders back, so the body rests on the hip ligaments.",
      "Shift weight side to side and front to back until the balance is steady.",
      "Swing-to or swing-through: crutches or hands forward on the bars, then push with the arms and swing both legs together up to or past them.",
      "Or a reciprocal step if the hips have some movement: one crutch, then the opposite leg.",
      "Progress from the bars to a walker then crutches, with sitting, standing and a step with crutches once steady.",
    ]],
    cues: [[
      "الحوضُ إلى الخلف والجذعُ منحنٍ ⟵ الحوضُ إلى الأمام والصدرُ مرفوع.",
      "النظرُ إلى القدمين ⟵ إلى الأمام.",
      "خطواتٌ طويلة قبل أن يثبت ⟵ تأرجحٌ قصير إلى مستوى العكّازين أوّلاً.",
      "مسافاتٌ طويلة يتعب فيها الكتف ⟵ مسافةٌ قصيرة مفيدة والكرسيُّ للبعيد (PVA 2026b).",
    ], [
      "Hips back and trunk bent → hips forward and chest up.",
      "Looking at the feet → looking ahead.",
      "Long swings before balance is steady → a short swing-to first.",
      "Long distances that tire the shoulders → a short useful distance, with the wheelchair for far (PVA 2026b).",
    ]],
    easier: ["الوقوفُ ونقلُ الوزن بين المتوازيين وحده، أو الدعامةُ القصيرة لمن تعمل فخذاه.", "Standing and weight shifting between the bars only, or a short brace for someone whose thighs work."],
    harder: ["المشيُ بالعكّازين خارج المتوازيين، ثمّ الدرجةُ والرصيف، ثمّ القيامُ من الأرض بالدعامتين.", "Walking with crutches outside the bars, then a step and a kerb, then getting up from the floor in the braces."],
    stopIf: ["ألمٌ في الكتف أو الرسغ ⟵ مسافةٌ أقصر؛ احمرارٌ تحت الدعامة لا يزول ⟵ تُنزع وتُعدَّل في قسم المساند؛ تورّمٌ أو حرارةٌ في الساق أو الركبة (كسرٌ في العظم الهشّ أو خثرة) ⟵ لا وقوف، وإلى الطبيب اليوم؛ دوخة ⟵ اجلس.", "Shoulder or wrist pain → a shorter distance; redness under the brace that does not fade → remove it for adjustment in the orthotics department; swelling or warmth in the leg or knee (a fracture of fragile bone or a clot) → no standing, and to the doctor the same day; dizziness → sit down."],
    equipment: ["دعامتان طويلتان من الفخذ إلى القدم بأقفال الركبة (من قسم المساند)، ومتوازيان، ومشّاية، وعكّازان، وحزامُ نقل.", "Two knee-ankle-foot orthoses with knee locks (from the orthotics department), parallel bars, a walker, crutches and a transfer belt."],
    doseNote: ["خمسُ دفعاتٍ قصيرة بينها راحة في الجلسة، والمشيُ بها في البيت تمرينٌ وهدفٌ يختاره هو.", "Five short bouts with rests per session, and walking in them at home as exercise and a goal the person chooses."],
    images: [{ key: "sci-kafo-walking-1", ar: "ساقان في دعامتين طويلتين من الفخذ إلى القدم بأقفال الركبة، تمشيان بعكّازين على رصيف", en: "Two legs in long knee-ankle-foot braces with knee locks, walking with crutches on a pavement", search: "paraplegia KAFO long leg braces crutches walking" }],
  },
  {
    code: "sci-bwstt-locomotor", nameAr: "تدريبُ المشي على السير مع حمل جزءٍ من الوزن ومدرّبين", nameEn: "Locomotor training on the treadmill with partial body-weight support and trainers",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["لمن إصابتُه غيرُ كاملة (C أو D) ولا يمشي أو يمشي قليلاً في السنة الأولى: الحزامُ يحمل جزءاً من الوزن والمدرّبون يحرّكون الساقين والحوض، فتتكرّر الخطواتُ آلافاً. ولم يكن أفضلَ من المشي على الأرض بالوقت نفسِه في الأسابيع الأولى (Dobkin 2006)، ولا طريقةٌ أفضلُ من غيرها (Mehrholz 2012)، والإرشادُ يجعله إضافةً للمشي على الأرض بحسب الموارد (Fehlings 2017a)؛ وبعد ستّة أشهر توصيةٌ قويّة ضدّه للماشي لزيادة السرعة والمسافة (Hornby 2020)، ولم يُعِد المشيَ لمن لا يمشي بعد سنتين (Piira 2019). لكنّ برنامجاً من عشرين جلسة فأكثر بالسير ثمّ الأرض ثمّ المجتمع حسّن التوازنَ والمشي في C وD حتى بعد سنين (Harkema 2012) — فهو بابٌ للمشي على الأرض لا بديلٌ عنه.",
      "For incomplete injury (C or D) with no or little walking in the first year: the harness carries part of the weight and the trainers move the legs and pelvis, so steps are repeated in thousands. It was no better than overground walking for the same time in the early weeks (Dobkin 2006), no method beats another (Mehrholz 2012), and the guideline makes it an addition to overground walking depending on resources (Fehlings 2017a); after six months there is a strong recommendation against it for walkers to improve speed and distance (Hornby 2020), and it did not restore walking in non-walkers after two years (Piira 2019). Yet a programme of twenty sessions or more moving from treadmill to overground to community improved balance and walking in C and D even years later (Harkema 2012) — so it is a door to overground walking, not a substitute for it."],
    start: ["في حزام الحمل فوق السير المتحرّك، ومدرّبٌ عند كلّ ساق ومدرّبٌ خلفه عند الحوض، وجهازُ الضغط والنبض قريب.", "In the support harness over the treadmill, a trainer at each leg and one behind at the pelvis, with the blood pressure and pulse monitor nearby."],
    steps: [[
      "اربط الحزامَ واضبط الحملَ على أقلّ ما يكفي ليقف مستقيماً بركبتين لا تنثنيان.",
      "شغّل السيرَ بسرعة المشي الطبيعيّ قدرَ ما يستطيع.",
      "المدرّبان يضعان القدمَ على الكعب ويمدّان الركبةَ عند الوقوف ويثنيانها عند الخطوة، والثالثُ يحرّك الحوضَ ويعدّل الجذع.",
      "قلّل المساعدةَ والحِملَ كلّما استطاع وحده، وزِد السرعة.",
      "امشِ دفعاتٍ بينها راحةٌ قصيرة، وقِس الضغطَ والنبض.",
      "انقل ما تعلّمه في الحال إلى المشي على الأرض بالمشّاية أو بالمساعدة في الجلسة نفسها.",
    ], [
      "Fasten the harness and set the support to the least that lets them stand upright without the knees buckling.",
      "Start the treadmill at as close to normal walking speed as they can manage.",
      "The two leg trainers place the foot heel-first, straighten the knee in stance and bend it in swing, while the third moves the pelvis and corrects the trunk.",
      "Reduce the help and the support whenever they manage alone, and raise the speed.",
      "Walk in bouts with short rests, measuring blood pressure and pulse.",
      "Carry what was learnt straight to overground walking with a walker or help in the same session.",
    ]],
    cues: [[
      "حملٌ كثيرٌ يتدلّى فيه ⟵ أقلُّ حملٍ يكفي.",
      "سرعةٌ بطيئة جداً ⟵ أقربُ إلى المشي الطبيعيّ.",
      "المدرّبون يحرّكون كلَّ شيءٍ كلَّ الوقت ⟵ مساعدةٌ تقلّ كلّما استطاع.",
      "السيرُ وحده جلسةً بعد جلسة ⟵ المشيُ على الأرض بعده في الجلسة نفسها.",
    ], [
      "So much support that they hang in the harness → the least support that suffices.",
      "A very slow speed → as close to normal walking as possible.",
      "Trainers moving everything all the time → help reduced whenever they manage.",
      "The treadmill alone session after session → overground walking after it in the same session.",
    ]],
    easier: ["حملٌ أكثر وسرعةٌ أقلّ ودفعاتٌ أقصر، ومدرّبٌ على كلّ ساق.", "More support, lower speed and shorter bouts, with a trainer on each leg."],
    harder: ["حملٌ أقلّ وسرعةٌ أعلى ودفعاتٌ أطول، ثمّ بلا حزام إلى الأرض.", "Less support, higher speed and longer bouts, then without the harness on the floor."],
    stopIf: ["صداعٌ نابض وتعرّقٌ فوق الإصابة أو ارتفاعُ الضغط ٢٠ ملم زئبق فوق المعتاد (فرطُ المنعكس — Krassioukov 2021) ⟵ أوقف السيرَ وأجلسه وفكّ الحزامَ وافحص المثانة؛ دوخةٌ أو هبوطُ الضغط ⟵ أوقفه واستلقِه؛ احمرارٌ في الفخذين أو الحوض من الحزام ⟵ عدّل الحزامَ وافحص الجلد.", "A pounding headache and sweating above the injury, or blood pressure 20 mmHg above usual (dysreflexia — Krassioukov 2021) → stop the treadmill, sit them down, loosen the harness and check the bladder; dizziness or a fall in blood pressure → stop and lie them down; redness on the thighs or hips from the harness → adjust it and check the skin."],
    equipment: ["سيرٌ متحرّك بإطار حزامٍ يحمل الوزن، ومقعدان للمدرّبين، وجهازُ ضغط.", "A treadmill with a body-weight-support frame and harness, two stools for the trainers, and a blood pressure monitor."],
    doseNote: ["٢٠–٣٠ دقيقة من الخطوات في الجلسة ثمّ المشيُ على الأرض، وعشرون جلسةً فأكثر (Harkema 2012).", "20–30 minutes of stepping per session followed by overground walking, for twenty sessions or more (Harkema 2012)."],
    images: [{ key: "sci-bwstt-locomotor-1", ar: "امرأةٌ في حزامٍ يحمل جزءاً من وزنها على السير المتحرّك، ومدرّبان جالسان يحرّكان ساقيها ومدرّبةٌ خلفها عند الحوض، والرابعُ عند الجهاز", en: "A woman in a harness carrying part of her weight on the treadmill, with two seated trainers moving her legs, a trainer behind her at the pelvis, and a fourth at the controls", search: "locomotor training body weight support treadmill spinal cord injury trainers" }],
  },
  {
    code: "sci-autonomic-dysreflexia", nameAr: "فرطُ المنعكس اللاإراديّ: يعرفه المريضُ وأهلُه ويتصرّفون فيه", nameEn: "Autonomic dysreflexia: the person and family recognise it and act",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["لمن إصابتُه في السادس الصدريّ أو أعلى (وأحياناً السابع والثامن): ألمٌ أو امتلاءٌ تحت الإصابة لا يحسّه — مثانةٌ ممتلئة، أو قسطرةٌ مسدودة، أو إمساك، أو ملابسُ ضيّقة، أو جرح — فيرتفع الضغطُ الانقباضيّ أكثرَ من ٢٠ ملم زئبق فوق معتاده (ومعتادُه جالساً نحو ١٠٠) مع صداعٍ نابض وتعرّقٍ واحمرارٍ فوق الإصابة وانسدادِ الأنف وبطءِ النبض، وقد يكون صامتاً (Krassioukov 2021). وفي ٣٢ حالةً منشورة مهدّدة للحياة كان ٧٢٪ نزيفاً أو نوباتٍ في الدماغ وتوفّي ٢٢٪ (Wan 2014) — فيحفظ المريضُ وأهلُه الخطواتِ ويحمل بطاقتَها، ويعرفها كلُّ معالج.",
      "For an injury at the sixth thoracic level or above (sometimes the seventh and eighth): pain or fullness below the injury that the person cannot feel — a full bladder, a blocked catheter, constipation, tight clothing or a wound — raises systolic pressure more than 20 mmHg above the person's usual (usually about 100 in sitting), with a pounding headache, sweating and flushing above the injury, a blocked nose and a slow pulse, and it may be silent (Krassioukov 2021). Of 32 published life-threatening cases 72% were brain bleeds or seizures and 22% died (Wan 2014) — so the person and family learn the steps and carry the card, and every therapist knows them."],
    start: ["المريضُ وأهلُه مع الأخصائيّ، وجهازُ الضغط وبطاقةُ فرط المنعكس بالعربية.", "The person and family with the specialist, with a blood pressure monitor and the Arabic dysreflexia card."],
    steps: [[
      "تعلّموا قياسَ ضغطه المعتاد جالساً، واكتبوه على البطاقة.",
      "عند الصداع أو التعرّق أو الاحمرار فوق الإصابة: أجلسوه مستقيماً وأنزلوا ساقيه.",
      "فكّوا كلَّ ضيّق: الحزامَ والملابسَ ومشدّةَ البطن والجواربَ الضاغطة وحزامَ كيس البول.",
      "قيسوا الضغطَ والنبضَ كلَّ دقيقةٍ إلى دقيقتين.",
      "افحصوا المثانةَ أوّلاً: القسطرةُ مثنيّةٌ أو مسدودة؟ أفرغوها أو بدّلوها، ولا تضغطوا على البطن.",
      "ثمّ الأمعاءَ بهلامٍ مخدّر، ثمّ الجلدَ والجروحَ والأظافرَ والملابس.",
      "إن بقي الانقباضيّ ١٥٠ فأكثر أو لم يُعرف السبب: الطوارئ أو الطبيب الآن، ومعكم البطاقة.",
    ], [
      "Learn to measure the person's usual blood pressure in sitting, and write it on the card.",
      "With a headache, sweating or flushing above the injury: sit them upright and lower the legs.",
      "Loosen everything tight: the belt, clothing, the abdominal binder, compression stockings and the leg-bag strap.",
      "Measure blood pressure and pulse every one to two minutes.",
      "Check the bladder first: is the catheter kinked or blocked? Empty or change it, and do not press on the abdomen.",
      "Then the bowel with an anaesthetic gel, then the skin, wounds, nails and clothing.",
      "If systolic stays at 150 or more or the cause is not found: emergency or the doctor now, with the card.",
    ]],
    cues: [[
      "يُستلقى المريضُ ليرتاح ⟵ يُجلس مستقيماً والساقان إلى الأسفل.",
      "يُعطى مسكّنٌ للصداع وينتظر ⟵ يُبحث عن السبب تحت الإصابة الآن.",
      "يُضغط على البطن لإفراغ المثانة ⟵ قسطرةٌ أو تبديلُها، ولا ضغط (Krassioukov 2021).",
      "«ضغطه ١٤٠ فهو طبيعيّ» ⟵ ٢٠ فوق معتاده — ومعتادُه نحو ١٠٠ — فرطُ منعكس.",
    ], [
      "Lying the person down to rest → sitting upright with the legs down.",
      "Giving a painkiller for the headache and waiting → looking for the cause below the injury now.",
      "Pressing on the abdomen to empty the bladder → catheterising or changing it, with no pressing (Krassioukov 2021).",
      "'His pressure is 140, so it is normal' → 20 above usual — and usual is about 100 — is dysreflexia.",
    ]],
    easier: ["الأهلُ يحفظون ثلاثاً أوّلاً: أجلِسه، وفكّ الضيّق، وافحص المثانة.", "The family learns three first: sit up, loosen, check the bladder."],
    harder: ["المريضُ يقيس ضغطَه ويشرح الخطواتِ لمن حوله بنفسه، ويحمل البطاقةَ دائماً.", "The person measures their own pressure, explains the steps to those around them, and always carries the card."],
    stopIf: ["هذه البطاقةُ هي الحالةُ نفسُها: صداعٌ شديد مع تشوّش أو نوبة أو ألمٍ في الصدر، أو بقاءُ الانقباضيّ ١٥٠ فأكثر ⟵ الطوارئ الآن (Krassioukov 2021 · Wan 2014)؛ وفي التمرين يوقَف التمرينُ عند أوّل علامة.", "This card is the condition itself: a severe headache with confusion, a seizure or chest pain, or systolic staying at 150 or more → emergency now (Krassioukov 2021 · Wan 2014); during exercise, the exercise stops at the first sign."],
    equipment: ["جهازُ ضغطٍ للذراع، وبطاقةُ فرط المنعكس بالعربية في محفظته وعلى كرسيّه، وقسطرةٌ احتياطية.", "An arm blood pressure monitor, the Arabic dysreflexia card in the wallet and on the chair, and a spare catheter."],
    doseNote: ["مرّةً في الجلستين الأوليين للتعليم، ثمّ سؤالٌ وتذكيرٌ في كلّ مرحلة.", "Once in the first two sessions for teaching, then a question and a reminder in every phase."],
    images: [{ key: "sci-autonomic-dysreflexia-1", ar: "بطاقةٌ بالعربية لفرط المنعكس اللاإراديّ: الأعراضُ فوق مستوى الإصابة وتحته، وخطواتُ «كيف تتصرّف» — اجلس مستقيماً، واخلع الضيّق، وافحص الضغطَ والمثانةَ والأمعاءَ والجلد، واطلب العون", en: "An Arabic autonomic dysreflexia card: the signs above and below the injury level, and the 'what to do' steps — sit upright, loosen tight clothing, check blood pressure, bladder, bowel and skin, and call for help", search: "autonomic dysreflexia wallet card Arabic" }],
  },
  {
    code: "sci-long-sitting-bed-mobility", nameAr: "الجلوسُ والساقان ممدودتان والحركةُ في السرير", nameEn: "Long sitting and bed mobility",
    kind: "functional", region: "whole_body", sets: 1, reps: 5, rest: 60,
    purpose: ["الجلوسُ في السرير والساقان ممدودتان أمامه أساسُ لبس السروال والحذاء وفحصِ الجلد والقسطرةِ والانتقال، والتقلّبُ والقيامُ من الاستلقاء يحفظان الجلدَ ويسهّلان الرعاية؛ والإرشادُ يجعل تدريبَ الانتقال وتوازنِ الجلوس لكلّ مَن ضعُف جذعُه وذراعاه (PVA 2026b)، ولا يضيف تدريباً منفصلاً على الجلوس بلا إسناد فوق التأهيل المعتاد (Fehlings 2017a) — فيُدرَّب في المهامّ نفسها. ويحتاج خلفَ الفخذ مرناً بقدرٍ يسمح بالجلوس، والتيبّسُ شائع (Diong 2012).",
      "Sitting in bed with the legs straight out in front is the base for putting on trousers and shoes, skin checks, catheterising and transfers, while rolling and coming up from lying protect the skin and ease care; the guideline gives transfer and seated-balance training to everyone with a weak trunk or arms (PVA 2026b), and adds no separate unsupported-sitting training beyond usual rehabilitation (Fehlings 2017a) — so it is practised within the tasks themselves. It needs enough hamstring length to sit up, and contractures are common (Diong 2012)."],
    start: ["مستلقٍ على ظهره في السرير، والكرسيُّ بجانب السرير مقفل، والمعالجُ بجانبه.", "Lying on the back in bed, the wheelchair locked beside the bed, with the therapist alongside."],
    steps: [[
      "التقلّب: أرجح الذراعين معاً من جهةٍ إلى أخرى مرّتين ثمّ إلى جهة التقلّب، والرأسُ يقود.",
      "القيامُ إلى الجلوس: على المرفقين أوّلاً، ثمّ يدٌ بعد يدٍ إلى الخلف حتى تجلس على يديك الممدودتين.",
      "انقل يديك إلى الأمام بجانب فخذيك، واثبت جالساً والساقان ممدودتان.",
      "انحنِ إلى الأمام وامسك قدميك — كما في لبس الجورب والحذاء — ثمّ اعتدل.",
      "تحرّك في السرير جالساً: ارفع الحوضَ قليلاً بيديك وانتقل إلى الجانب أو الأمام.",
      "عُد إلى الاستلقاء بعكس الخطوات بهدوء.",
    ], [
      "Rolling: swing both arms together from side to side twice, then over to the side of the roll, with the head leading.",
      "Coming up to sit: onto the elbows first, then hand by hand backwards until sitting on straight arms.",
      "Walk the hands forward beside the thighs and settle in sitting with the legs straight.",
      "Lean forward and hold the feet — as when putting on socks and shoes — then sit back up.",
      "Move around the bed in sitting: lift the hips a little with the hands and move sideways or forward.",
      "Return to lying by reversing the steps gently.",
    ]],
    cues: [[
      "الركبتان مثنيّتان فيسقط إلى الخلف ⟵ الساقان ممدودتان والوزنُ فوق الحوض.",
      "شدٌّ بالرقبة وحدها ⟵ أرجحةُ الذراعين والرأسُ يقود.",
      "خلفُ الفخذ مشدودٌ يمنع الجلوس ⟵ يُمطّ في البرنامج حتى يسمح بالجلوس.",
      "المرافقُ يرفعه في كلّ مرّة ⟵ يحاول هو والمرافقُ يساعد قليلاً.",
    ], [
      "Knees bent so they fall backwards → legs straight with the weight over the hips.",
      "Straining with the neck alone → swinging the arms with the head leading.",
      "Tight hamstrings that block sitting → stretched in the programme until sitting is possible.",
      "The carer lifting every time → the person tries and the carer helps a little.",
    ]],
    easier: ["رأسُ السرير مرفوعٌ قليلاً، وحبلٌ أو حلقةٌ مربوطةٌ بالسرير يشدّ بها، والمرافقُ يسند الكتف.", "The head of the bed raised a little, a rope ladder or loop tied to the bed to pull on, and the carer supporting the shoulder."],
    harder: ["لبسُ السروال والحذاء جالساً وحده، والوصولُ إلى الجانبين بيدٍ واحدة والأخرى تسند.", "Putting on trousers and shoes alone in sitting, and reaching to each side with one hand while the other supports."],
    stopIf: ["دوخةٌ عند الجلوس (هبوطُ الضغط) ⟵ عُد إلى الاستلقاء وارفع ساقيك؛ ألمٌ في الكتف ⟵ أقلّ؛ احمرارٌ عند العجز أو الكعبين من الاحتكاك ⟵ افحص الجلد ولا تجرّ الجسمَ على الفراش.", "Dizziness on sitting up (low blood pressure) → return to lying and raise the legs; shoulder pain → do less; redness at the sacrum or heels from friction → check the skin and do not drag the body on the sheet."],
    equipment: ["سريرٌ ثابت، وحلقةٌ أو حبلٌ للشدّ إن لزم.", "A steady bed, and a loop or rope ladder to pull on if needed."],
    doseNote: ["خمسُ مرّاتٍ لكلّ حركة في الجلسة، ثمّ صباحَ كلّ يومٍ ومساءه في البيت.", "Five times for each movement per session, then every morning and evening at home."],
    images: [{ key: "sci-long-sitting-bed-mobility-1", ar: "رجلٌ جالسٌ على السرير وساقاه ممدودتان أمامه يمسك قدميه بيديه، وكرسيُّه المتحرّك بجانب السرير", en: "A man sitting on the bed with his legs straight out in front, holding his feet with his hands, his wheelchair beside the bed", search: "spinal cord injury long sitting bed mobility" }],
  },
  {
    code: "sci-wheelchair-prayer", nameAr: "الصلاةُ على الكرسيّ المتحرّك والوضوءُ والطهارة", nameEn: "Praying in the wheelchair, ablution and ritual purity",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["الصلاةُ لكثيرٍ من المرضى هدفٌ يومياً، والمسجدُ مشاركة: الصلاةُ في الكرسيّ بما يستطيع، والوضوءُ جالساً أو التيمّم، وطهارةُ القسطرة والكيس — والحكمُ الشرعيّ له ولأهله ومرجعهم، فلا دراسةَ عن الصلاة والوضوء والتيمّم والقسطرة في إصابة الحبل الشوكيّ (بحثٌ صفريّ)، ومراجعةٌ تقترح الصلاةَ مورداً في التأهيل بلا بياناتٍ للحبل الشوكيّ (Chamsi-Pasha 2021). ودورُ المعالج: الوضعُ الآمن والجلدُ والضغطُ وتخفيفُ الضغط وأداةُ الوضوء، وخصوصيةُ القسطرة — فالرجالُ في الرياض وصفوا الخصوصيةَ والنظافةَ والسوائلَ والسفرَ صعوباتِها (Abuzied 2024 · Abuzied 2026).",
      "For many patients prayer is a daily goal and the mosque is participation: praying in the chair as able, ablution in sitting or dry ablution, and the purity of the catheter and bag — with the religious ruling for the person, the family and their scholar, as there is no study of prayer, ablution, dry ablution or catheters in spinal cord injury (a documented zero result), and a review proposes prayer as a resource in rehabilitation with no spinal cord data (Chamsi-Pasha 2021). The therapist's part: a safe position, the skin, blood pressure, pressure relief and ablution aids, and privacy for catheterising — men in Riyadh described privacy, cleanliness, fluids and travel as its difficulties (Abuzied 2024 · Abuzied 2026)."],
    start: ["في كرسيّه بالفرامل المقفلة متّجهاً إلى القبلة، أو جالساً أمام المغسلة بكرسيّ ثابت.", "In the wheelchair with the brakes locked facing the qibla, or sitting in front of the basin on a steady chair."],
    steps: [[
      "اسأله وأهلَه عمّا يريد في الصلاة والوضوء، واتركوا الحكمَ الشرعيّ له ولمرجعه.",
      "الوضوء: مغسلةٌ بارتفاع الكرسيّ وصنبورٌ بذراعٍ طويلة، وإبريقٌ أو رشّاشٌ للقدمين، ومنشفةٌ تُجفّف بها بين الأصابع والجلد.",
      "الصلاة: في الكرسيّ بالفرامل المقفلة، والركوعُ والسجودُ إيماءً بالانحناء إلى الأمام بقدر ما يثبت — ومسندٌ أمامه إن لزم.",
      "الانحناءُ في السجود يميل بالجسم إلى الأمام فيخفّف الضغطَ عن عظمتَي الجلوس — ويُفحص الجلدُ بعد الجلوس الطويل في المسجد.",
      "القسطرةُ والكيس: موعدُها قبل الصلاة، ومكانٌ خاصّ في البيت والمسجد، والكيسُ مغلقٌ ومثبّت.",
      "المسجد: الطريقُ والمنحدرُ والدرجُ، والصفُّ الذي يجلس فيه، ومَن يرافقه.",
    ], [
      "Ask the person and family what they want in prayer and ablution, and leave the religious ruling to the person and their scholar.",
      "Ablution: a basin at chair height with a long-lever tap, a jug or hand shower for the feet, and a towel to dry between the toes and the skin.",
      "Prayer: in the chair with the brakes locked, bowing and prostration by leaning forward as far as is stable — with support in front if needed.",
      "Leaning forward in prostration tilts the body and relieves the sitting bones — and the skin is checked after long sitting in the mosque.",
      "The catheter and bag: timed before prayer, a private place at home and in the mosque, and the bag closed and secured.",
      "The mosque: the route, the ramp and steps, the row where they sit, and who goes with them.",
    ]],
    cues: [[
      "الانحناءُ بلا فرامل أو بلا إسناد ⟵ فرامل مقفلة ومسندٌ أمامه حتى يثبت.",
      "جلوسٌ ساعاتٍ في المسجد بلا تخفيف ⟵ الميلُ دقيقتين كلَّ ٣٠ دقيقة (PVA 2014).",
      "ماءٌ حارّ على جلدٍ لا يحسّ ⟵ يُفحص الماءُ بيدٍ تحسّ قبل الوضوء.",
      "المعالجُ يفتي ⟵ الحكمُ له ولمرجعه، والمعالجُ يساعد في الحركة.",
    ], [
      "Leaning without brakes or support → brakes locked and support in front until stable.",
      "Sitting for hours in the mosque without relief → a two-minute lean every 30 minutes (PVA 2014).",
      "Hot water on skin without feeling → water tested with a hand that feels before ablution.",
      "The therapist giving rulings → the ruling is theirs and their scholar's, while the therapist helps with movement.",
    ]],
    easier: ["الصلاةُ في الكرسيّ مستنداً إلى ظهره بالإيماء بالرأس، والوضوءُ بمساعدة أحد الأهل.", "Praying in the chair leaning on its back with nods of the head, and ablution with help from a family member."],
    harder: ["الوضوءُ وحده بأدواته، والذهابُ إلى المسجد بالكرسيّ ومنحدره.", "Ablution alone with its aids, and going to the mosque by wheelchair and its ramp."],
    stopIf: ["دوخةٌ عند الانحناء أو الاعتدال ⟵ اعتدل ببطء وتوقّف؛ صداعٌ نابض وتعرّقٌ فوق الإصابة ⟵ بطاقةُ فرط المنعكس؛ احمرارٌ أو جرحٌ بعد الجلوس الطويل ⟵ لا جلوسَ عليه وإلى الأخصائيّ؛ حرقٌ من الماء ⟵ إلى الطبيب.", "Dizziness when bending or sitting up → straighten slowly and stop; a pounding headache and sweating above the injury → the dysreflexia card; redness or a wound after long sitting → no sitting on it and see the specialist; a burn from the water → to the doctor."],
    equipment: ["كرسيٌّ بفرامل، ومسندٌ أمامه، وإبريقٌ أو رشّاش، وصنبورٌ بذراعٍ طويلة، ومنشفة، ومرآةٌ لفحص الجلد.", "A wheelchair with brakes, a support in front, a jug or hand shower, a long-lever tap, a towel and a mirror for skin checks."],
    doseNote: ["في جلستين أو ثلاثٍ من المرحلة الأخيرة، ثمّ في البيت والمسجد كلَّ يوم.", "In two or three sessions of the last phase, then at home and in the mosque every day."],
    images: [{ key: "sci-wheelchair-prayer-1", ar: "شيخٌ في كرسيّه المتحرّك في المسجد النبويّ يرفع يديه بالدعاء بين المصلّين، وحوله مَن يسجد على الأرض", en: "An elderly man in his wheelchair in the Prophet's Mosque raising his hands in supplication among worshippers, with others prostrating on the floor around him", search: "wheelchair user prayer mosque" }],
  },
];

const PRACTICE_RULE_AR = "قاعدةُ الممارسة في كلّ تمرين: التدريبُ قائمٌ على النشاط — المهمّةُ نفسُها بتكرارٍ كثير وشدّةٍ تزيد كلّما استطاع (PVA 2026b · Hornby 2020)، والمريضُ فاعلٌ والمساعدةُ أقلُّ ما يكفي؛ ويُقاس الضغطُ قبل كلّ جلسة لمن إصابتُه في السادس الصدريّ فأعلى ويُراقَب هو والحرارةُ أثناءها (Krassioukov 2021)، وتُفرَغ المثانةُ قبل التمرين، ويُخفَّف الضغطُ في الجلوس كلَّ ٣٠ دقيقة (PVA 2014)، ويُحفظ الكتفُ في كلّ انتقالٍ ودفع (PVA 2005a)؛ والتمطيطُ وحده يزيد المدى درجتين (Harvey 2017) — فيأتي مع الوقوف والوضع والدعامة.";
const PRACTICE_RULE_EN = "The practice rule for every exercise: training is activity-based — the task itself, with many repetitions and intensity raised whenever the person can (PVA 2026b · Hornby 2020); the person is active and the help is the least that suffices; blood pressure is measured before every session for an injury at the sixth thoracic level or above, and it and temperature are watched during it (Krassioukov 2021); the bladder is emptied before exercise, sitting pressure is relieved every 30 minutes (PVA 2014), and the shoulder is protected in every transfer and push (PVA 2005a); stretching alone adds two degrees of range (Harvey 2017) — so it comes with standing, positioning and orthoses.";
const EXTEND_AR = "وفي الجلسة ٣٦: تمديدٌ واحد باثنتي عشرة جلسة (حتى ٤٨) لمن تقدّم بالفرق المهمّ — سرعةُ المشي +٠٫١٥ م/ث (Forrest 2014) أو الاستقلالُ +٤ (Scivoletto 2013a) أو قوّةُ الساقين +٥ (Scivoletto 2013b) — ولم يبلغ أهدافَه؛ ومَن لم يتقدّم لا يُمدَّد: يُراجَع السببُ (الألم، والتشنّج، والجلد، والمزاج، والتدهورُ العصبيّ) مع الطبيب. ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر في السنة الأولى وكلَّ ستّةٍ بعدها، وكتلةٌ جديدة لمن تحسّن في البيت أو تراجع — فالتعافي قد يستمرّ حتى ١٨ شهراً (Fawcett 2007)، والتدريبُ أفاد حتى بعد سنين (Harkema 2012).";
const EXTEND_EN = "At session 36: one extension of twelve sessions (to 48) for a person who has progressed by the important difference — walking speed +0.15 m/s (Forrest 2014), independence +4 (Scivoletto 2013a) or leg strength +5 (Scivoletto 2013b) — without reaching the goals; a person who has not progressed is not extended: the reason (pain, spasticity, skin, mood, neurological decline) is reviewed with the doctor. Then a home programme with a review every three months in the first year and every six months after, and a new block for a person who improves at home or declines — recovery can continue to 18 months (Fawcett 2007), and training helped even years later (Harkema 2012).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "sci-incomplete-adult",
  summary: [
    "إصابةُ الحبل الشوكيّ: ضعفٌ أو شللٌ ونقصُ إحساسٍ تحت مستوى الإصابة، ومعه اضطرابُ المثانة والأمعاء والضغط والحرارة والتنفّس بحسب المستوى. وتُصنَّف بالفحص الدوليّ (ISNCSCI) إلى شدّات (AIS): A كاملةٌ بلا إحساسٍ ولا حركةٍ في آخر الحبل (S4–S5)، وB إحساسٌ بلا حركةٍ تحت الإصابة، وC حركةٌ في أقلَّ من نصف العضلات الأساسية تحت المستوى بقوّة ٣ فأكثر، وD في نصفها فأكثر (Rupp 2021 · Kirshblum 2011). والتعافي أكثرُه في الأشهر الثلاثة الأولى ويستمرّ حتى ١٨ شهراً (Fawcett 2007)، وتحسّن درجةً فأكثر ١٩٫٣٪ من A و٧٣٫٨٪ من B و٨٧٫٣٪ من C (Khorasanizadeh 2019)، ومشى بعد ستّة أشهر ٣٥٪ من B و٩٢٪ من C وكلُّ D (Dobkin 2006)؛ وقاعدةُ التنبّؤ الهولندية من العمر وقوّة L3 وS1 وإحساسهما في الأيّام الخمسة عشر الأولى تتنبّأ بالمشي المستقلّ في سنة: ٤٪ عند صفر و٦٨٪ عند ١٥ و٩٧٪ عند ٢٥ (van Middendorp 2011 · Mahanes 2024). " +
    "وفي العالم نحو ٢٠٫٦ مليون مصاب (GBD SCI 2023)، وفي الشرق الأوسط ٢٣٫٢ في كلّ مليون سنوياً ومتوسّطُ العمر ٣١ و٧٧٪ رجال (Elshahidi 2018). وفي العراق: في ابن القف ببغداد ٩١٨ إصابةً جديدة بين ٢٠٠٣ و٢٠٠٨، ٨٤٫٤٪ رجال ومتوسّطُ العمر ٢٩٫٥، والعنفُ ٦٤٪ وحوادثُ السير ٢٠٪ والسقوطُ ١٢٪، والشللُ السفليّ ٧٩٪ والكاملةُ ٧٩٫٢٪، والمضاعفاتُ ٦٠٫٦٪، ومشى في المجتمع ١٩٫٨٪ (Al-Rubaye 2012)؛ وفي تكريت ١٤٢ إصابة، الحربُ ٦٦٫٢٪ والكاملةُ ٧١٫٨٪ ولا سجلَّ وطنيّاً (Azeez 2022)؛ وفي الموصل ٢٦٧ إصابةً في حرب ٢٠١٧–٢٠١٨ والناجون بمضاعفاتٍ جسدية ونفسية مزمنة (Fathe 2024)؛ وفي مركز الصليب الأحمر العراقيّ ٦١٣ مستفيداً بالشلل السفليّ والرباعيّ، ٢٩٫٧٪ نساء (Barth 2020). وإصاباتُ الرصاص والشظايا أقلُّ تعافياً (Khorasanizadeh 2019)، وفي حرب إيران والعراق مشى ٥٢ من ٥٥ إصابةً غيرَ كاملة ولم تُفِد الجراحة (Aarabi 1996). " +
    "الإرشادات: المشيُ مبكّراً بالشدّة والتكرار والمهمّة، وقاعدةُ التنبّؤ، والانتقالُ وتوازنُ الجلوس (PVA 2026b)؛ وبعد ستّة أشهر المشيُ بشدّةٍ متوسّطة إلى عالية توصيةٌ قويّة، والسيرُ المسنودُ والروبوتُ والتوازنُ بلا واقعٍ افتراضيّ ضدّها للماشي (Hornby 2020)؛ والتمرين: ٢٠ دقيقةً هوائية مرّتين في الأسبوع وثلاثُ مجموعات قوّةٍ لكلّ عضلةٍ عاملة مرّتين للياقة، و٣٠ دقيقة ثلاثاً للقلب والسكّر (Martin Ginis 2018)؛ والسلامةُ في فرط المنعكس والضغط والحرارة (Krassioukov 2021) والجلد (PVA 2014) والكتف (PVA 2005a) والتنفّس (PVA 2005b) والمثانة (PVA 2006) والأمعاء (Johns 2021) والخثرة (PVA 2016) والعظم (PVA 2022) والألم (PVA 2026a) والنفس (Bombardier 2021). " +
    "والجرعة: التجاربُ ثلاثاً إلى خمساً في الأسبوع ٨–٢٤ أسبوعاً — ٩ ساعاتٍ في الأسبوع ٢٤ أسبوعاً رفعت سرعةَ المشي ٠٫٠٩٦ م/ث والمشيَ ستّ دقائق ٣٦ متراً (Jones 2014)، وخمساً في الأسبوع ١٢ أسبوعاً أفاد فيها المشيُ على الأرض أكثرَ من غيره (Field-Fote 2011)، وحتى ٣٠ جلسةً بنبضٍ فوق ٧٠٪ من الاحتياطيّ رفعت أقصى سرعةٍ على السير ٠٫٢٥ م/ث (Hornby 2026)؛ و٤٤٪ من ساعات التأهيل في السنة الأولى تقع بعد الخروج (Whiteneck 2011). ولا تجربةَ قارنت الكتلَ بالعلاج المستمرّ ولا وجدت عدداً بعينه (بحثٌ صفريّ). " +
    "فالبروتوكول: ٣٦ جلسة بستٍّ في الأسبوع × ٦٠ دقيقة (ستّةُ أسابيع)، وتمديدٌ واحد باثنتي عشرة لمن تقدّم بالفرق المهمّ ولم يبلغ أهدافَه، ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر في السنة الأولى وكلَّ ستّةٍ بعدها، وكتلةٌ جديدة لمن تحسّن أو تراجع؛ بمساراتٍ بالشدّة والمستوى — وللإصابة الكاملة (A) مسارُ الكرسيّ نفسُه، فهي أكثرُ الإصابات في العراق ولا بروتوكولَ لها منفصلاً في المكتبة. والعددُ اختيارٌ مكتوبٌ صريحاً وبندٌ لسليم.",
    "Spinal cord injury: weakness or paralysis and sensory loss below the level of injury, with disordered bladder, bowel, blood pressure, temperature and breathing according to the level. It is classified by the international examination (ISNCSCI) into grades (AIS): A complete with no sensation or movement at the end of the cord (S4–S5), B sensation without movement below the injury, C movement in fewer than half of the key muscles below the level at grade 3 or more, and D in half or more (Rupp 2021 · Kirshblum 2011). Most recovery occurs in the first three months and some continues to 18 months (Fawcett 2007); one grade or more of improvement occurred in 19.3% of A, 73.8% of B and 87.3% of C (Khorasanizadeh 2019), and at six months 35% of B, 92% of C and all of D walked (Dobkin 2006); the Dutch prediction rule from age and L3 and S1 strength and sensation in the first fifteen days predicts independent walking at one year: 4% at a score of zero, 68% at 15 and 97% at 25 (van Middendorp 2011 · Mahanes 2024). " +
    "Worldwide about 20.6 million people live with it (GBD SCI 2023), and in the Middle East it occurs in 23.2 per million a year, at a mean age of 31, with 77% men (Elshahidi 2018). In Iraq: at Ibn Al-Quff in Baghdad, 918 new injuries between 2003 and 2008, 84.4% men with a mean age of 29.5, violence 64%, road traffic 20% and falls 12%, paraplegia 79% and complete injury 79.2%, complications 60.6%, and 19.8% walking in the community (Al-Rubaye 2012); in Tikrit 142 injuries, war 66.2% and complete 71.8%, with no national registry (Azeez 2022); in Mosul 267 injuries in the 2017–2018 war, with survivors living with chronic physical and psychological complications (Fathe 2024); and in the ICRC centre in Iraq 613 users with paraplegia or tetraplegia, 29.7% women (Barth 2020). Gunshot and fragment injuries recover less (Khorasanizadeh 2019), and in the Iran–Iraq war 52 of 55 incomplete injuries walked, with no benefit from surgery (Aarabi 1996). " +
    "Guidelines: early walking training with intensity, repetition and task specificity, the prediction rule, and transfer and seated-balance training (PVA 2026b); after six months, walking at moderate to high intensity is a strong recommendation, while body-weight-supported treadmill training, robots and balance training without virtual reality are recommended against for walkers (Hornby 2020); exercise: 20 minutes of aerobic exercise twice a week and three sets of strength exercise for each working muscle twice a week for fitness, and 30 minutes three times a week for heart and glucose (Martin Ginis 2018); and safety for dysreflexia, blood pressure and temperature (Krassioukov 2021), skin (PVA 2014), the shoulder (PVA 2005a), breathing (PVA 2005b), the bladder (PVA 2006), the bowel (Johns 2021), clots (PVA 2016), bone (PVA 2022), pain (PVA 2026a) and mental health (Bombardier 2021). " +
    "Dose: trials used three to five sessions a week for 8–24 weeks — 9 hours a week for 24 weeks raised walking speed by 0.096 m/s and the six-minute walk by 36 metres (Jones 2014), five a week for 12 weeks favoured overground walking over the other methods (Field-Fote 2011), and up to 30 sessions with a heart rate above 70% of reserve raised peak treadmill speed by 0.25 m/s (Hornby 2026); 44% of first-year rehabilitation hours take place after discharge (Whiteneck 2011). No trial compared blocks with continuous therapy or found a particular number (a documented zero result). " +
    "So the protocol: 36 sessions at six a week × 60 minutes (six weeks), one extension of twelve for a person who has progressed by the important difference without reaching the goals, then a home programme with a review every three months in the first year and every six months after, and a new block for a person who improves or declines; with pathways by grade and level — and complete injury (A) follows the same wheelchair pathway, as it is the commonest injury in Iraq and has no separate protocol in the library. The number is a stated service choice and an item for Saleem.",
  ],
  goals: [
    "• المسارُ يبلغ هدفَه: لمن يمشي (C–D) سرعةُ عشرة الأمتار +٠٫١٥ م/ث فأكثر (الفرقُ المهمّ — Forrest 2014)، وللمشي خارجَ البيت نحو ٠٫٤٤ م/ث بأداة و٠٫٧٠ بلا أداة (van Hedel 2009)؛ ولمن يستعمل الكرسيّ الانتقالُ ومهاراتُ الكرسيّ وتخفيفُ الضغط وحدَه أو بمرافقٍ مدرَّب (PVA 2026b · Keeler 2019).\n" +
    "• الاستقلالُ (SCIM III) +٤ فأكثر، و+١٠ تحسّنٌ كبير (Scivoletto 2013a)، وقوّةُ الساقين +٥ (Scivoletto 2013b).\n" +
    "• لا قرحةَ ضغط، ولا نوبةَ فرط منعكسٍ بلا تصرّفٍ صحيح، ولا سقوطَ بإصابة (PVA 2014 · Krassioukov 2021 · PVA 2022).\n" +
    "• الكتفُ بلا ألمٍ يزيد، والتمرينُ مستمرٌّ في البيت بحدّ الإرشاد: ٢٠ دقيقةً هوائية مرّتين وقوّةٌ مرّتين في الأسبوع (Martin Ginis 2018 · PVA 2005a).\n" +
    "• المريضُ وأهلُه يديرون الجلدَ والمثانةَ والأمعاءَ والحرارةَ والبرنامجَ المنزليّ وحدهم.",
    "• The pathway reaches its goal: for walkers (C–D) ten-metre walk speed +0.15 m/s or more (the important difference — Forrest 2014), and for walking outdoors about 0.44 m/s with an aid and 0.70 without (van Hedel 2009); for wheelchair users, transfers, wheelchair skills and pressure relief done alone or by a trained carer (PVA 2026b · Keeler 2019).\n" +
    "• Independence (SCIM III) +4 or more, with +10 a large improvement (Scivoletto 2013a), and leg strength +5 (Scivoletto 2013b).\n" +
    "• No pressure injury, no dysreflexia episode without the right response, and no injurious fall (PVA 2014 · Krassioukov 2021 · PVA 2022).\n" +
    "• The shoulder without increasing pain, and exercise continuing at home at the guideline level: 20 minutes of aerobic exercise twice and strength twice a week (Martin Ginis 2018 · PVA 2005a).\n" +
    "• The person and family manage skin, bladder, bowel, temperature and the home programme by themselves.",
  ],
  assessment: [
    "في الجلسة الأولى، وتكملتُه في الجلسات ١–٣:\n" +
    "• التاريخ: السببُ وتاريخُه، والجراحةُ وتعليماتُ الجرّاح، والمثانةُ (القسطرة المتقطّعة أو الدائمة) والأمعاءُ وجدولُهما، والجلدُ وقرحٌ سابقة، ونوباتُ فرط المنعكس والدوخة، والتهاباتُ الصدر، والألمُ ونوعُه، والتشنّج، والمزاجُ والنوم، والأدوية، والبيتُ (الدرجُ والحمّامُ والمرحاض) والعملُ والمرافق، وعلاجاتٌ جُرّبت خارجَ المركز.\n" +
    "• التصنيف: الفحصُ الدوليّ (ISNCSCI) بالمستوى والشدّة (AIS) يجريه الطبيبُ أو الأخصائيُّ المدرَّب في الأسبوع الأوّل ويُعاد في السنة الأولى (PVA 2026b · Rupp 2021)، وقاعدةُ التنبّؤ في الأيّام الخمسة عشر الأولى إن أمكن (van Middendorp 2011)، والفحصُ اللاإراديّ (Krassioukov 2012).\n" +
    "• السلامة: الضغطُ والنبضُ جالساً ومستلقياً — معتادُه نحو ١٠٠ جالساً في السادس الصدريّ فأعلى، وهبوطُ الانقباضيّ ٢٠ عند الجلوس هبوطٌ انتصابيّ (Krassioukov 2021)؛ والجلدُ كلُّه بمراحل القرحة (Edsberg 2016)؛ وسعةُ الرئة وقوّةُ الشهيق وقوّةُ السعال للرباعيّ والصدريّ العالي (PVA 2005b)؛ وعلاماتُ الخثرة (PVA 2016)؛ والمزاجُ بسؤالٍ عن الانتحار (PHQ-9 — Bombardier 2021).\n" +
    "• الحركة: قوّةُ العضلات الأساسية في الذراعين والساقين (UEMS · LEMS — Marino 2008)، والتشنّجُ (أشوورث المعدّل — Baunsgaard 2016)، والمدى (الكتفُ والرسغُ والكاحلُ أكثرُه تيبّساً — Diong 2012)، والجلوسُ والانتقالُ والكرسيّ، والمشيُ لمن يمشي.\n" +
    "• الكتفُ والرسغ: الألم (Curtis 1999)، والنفقُ الرسغيّ — ٦٤٪ في ابن القف ويزيد بالسنين (Alwan 2012).\n" +
    "• الألم: يُسأل في كلّ زيارة ويُصنَّف (ISCIP — Bryce 2012 · PVA 2026a)، والألمُ الجديد أو الأسوأ يُعاد معه الفحصُ العصبيّ.\n" +
    "• المقاييس: مستوى المشي (WISCI II — Ditunno 2013) — مزروع؛ وعشرةُ الأمتار — مزروع (الفرقُ المهمّ ٠٫١٥ م/ث — Forrest 2014)؛ وبيرغ — مزروع (موثوقٌ ولا يفرّق الساقطَ وحده — Wirz 2010 · Abou 2019)؛ والاستقلالُ (SCIM III) — مزروع (٤ ثمّ ١٠ — Scivoletto 2013a، وله نسخةٌ عربية في رسالةٍ ببغداد — Al-Rubaye 2012)؛ والإضافيةُ في بند سليم.\n" +
    "• المسار — يضبطه الأخصائيّ: الحركيُّ الكامل (A–B) ⟵ الكرسيّ والانتقال والوقوف والكتف، والدعامتان الطويلتان تمريناً للصدريّ والقطنيّ (PVA 2026b)؛ C ⟵ المشيُ المسنود على السير ثمّ الأرض والدعامة والوقوف (Harkema 2012)؛ D ⟵ المشيُ عالي الشدّة والتوازنُ والمجتمع (Hornby 2026 · Brazg 2017)؛ الرباعيّ ⟵ قبضةُ الوتر والمهمّة والتحفيز والتنفّس والسعال (Popovic 2011 · Boswell-Ruys 2020)؛ وغيرُ الرضّيّ (السلّ، والورم، واعتلالُ النخاع العنقيّ التنكّسيّ) ⟵ الطبيبُ قبل كلّ شيء (Rajasekaran 2018 · Savage 2014 · Fehlings 2017c).\n" +
    "• يُعاد التقييمُ في الجلسة ١٨ و٣٠ و٣٦، و٤٨ إن مُدّد، وفي كلّ مراجعة.",
    "At the first session, completed over sessions 1–3:\n" +
    "• History: the cause and its date, surgery and the surgeon's instructions, the bladder (intermittent or indwelling catheter) and bowel and their schedules, the skin and previous ulcers, episodes of dysreflexia and dizziness, chest infections, pain and its type, spasticity, mood and sleep, medicines, the home (stairs, bathroom and toilet), work and the carer, and treatments tried outside the centre.\n" +
    "• Classification: the international examination (ISNCSCI) with level and grade (AIS), done by the doctor or a trained specialist in the first week and repeated in the first year (PVA 2026b · Rupp 2021), the prediction rule in the first fifteen days if possible (van Middendorp 2011), and the autonomic examination (Krassioukov 2012).\n" +
    "• Safety: blood pressure and pulse sitting and lying — usually about 100 in sitting at the sixth thoracic level or above, and a fall in systolic of 20 on sitting up is orthostatic hypotension (Krassioukov 2021); the whole skin with pressure-injury stages (Edsberg 2016); vital capacity, inspiratory strength and cough strength for tetraplegia and high thoracic injury (PVA 2005b); signs of a clot (PVA 2016); and mood with a question about suicide (PHQ-9 — Bombardier 2021).\n" +
    "• Movement: key muscle strength in the arms and legs (UEMS · LEMS — Marino 2008), spasticity (Modified Ashworth — Baunsgaard 2016), range (shoulder, wrist and ankle stiffen most — Diong 2012), sitting, transfers and the wheelchair, and walking for walkers.\n" +
    "• The shoulder and wrist: pain (Curtis 1999), and carpal tunnel syndrome — 64% at Ibn Al-Quff, rising with years (Alwan 2012).\n" +
    "• Pain: asked at every visit and classified (ISCIP — Bryce 2012 · PVA 2026a), with the neurological examination repeated for new or worse pain.\n" +
    "• Measures: walking level (WISCI II — Ditunno 2013) — seeded; the ten-metre walk — seeded (important difference 0.15 m/s — Forrest 2014); Berg — seeded (reliable, but does not identify fallers on its own — Wirz 2010 · Abou 2019); and independence (SCIM III) — seeded (4 then 10 — Scivoletto 2013a, with an Arabic version in a Baghdad thesis — Al-Rubaye 2012); the additional ones are in Saleem's item.\n" +
    "• The pathway — the specialist sets the plan: motor-complete (A–B) → the wheelchair, transfers, standing and the shoulder, with long leg braces as exercise for thoracic and lumbar injury (PVA 2026b); C → supported treadmill walking then overground, the orthosis and standing (Harkema 2012); D → high-intensity walking, balance and the community (Hornby 2026 · Brazg 2017); tetraplegia → tenodesis grasp, task practice, stimulation, breathing and coughing (Popovic 2011 · Boswell-Ruys 2020); and non-traumatic causes (tuberculosis, tumour, degenerative cervical myelopathy) → the doctor before anything else (Rajasekaran 2018 · Savage 2014 · Fehlings 2017c).\n" +
    "• Reassessment at sessions 18, 30 and 36, and 48 if extended, and at every review.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• السلامةُ والجلدُ أوّلاً: تخفيفُ الضغط كلَّ ٣٠ دقيقة (PVA 2014)، وبطاقةُ فرط المنعكس (Krassioukov 2021)، والسعالُ المُعان (PVA 2005b).\n" +
    "• الحركيُّ الكامل والكرسيّ: الانتقالُ باللوح والحركةُ في السرير ومهاراتُ الكرسيّ (Keeler 2019)، وتقويةُ الكتف وحفظُه (PVA 2005a · Mulroy 2011)، والوقوفُ في الجهاز (Paleg 2015)، والدعامتان الطويلتان لمن يختارهما (PVA 2026b).\n" +
    "• المشي: على الأرض بالمساعدة أوّلاً، والسيرُ المسنودُ بابٌ إليه في السنة الأولى (Dobkin 2006 · Harkema 2012)، والمشيُ عالي الشدّة لمن يمشي (Hornby 2020 · Hornby 2026)، والتوازنُ في المشي والعوائق (Benn 2025).\n" +
    "• القوّة: مقاومةٌ للعضلات العاملة والضعيفة يوماً بعد يوم (Bye 2017 · Jayaraman 2013)، والتحفيزُ فوق التمرين للضعيفة (Harvey 2010).\n" +
    "• الرباعيّ: قبضةُ الوتر والمهامُّ الكثيرة (Sonune 2024 · Anderson 2019)، وتدريبُ عضلات الشهيق (Boswell-Ruys 2020).\n" +
    "• اللياقة: ٢٠ دقيقةً هوائيةً مرّتين في الأسبوع وقوّةٌ مرّتين، بالذراعين أو الدراجة (Martin Ginis 2018).\n" +
    PRACTICE_RULE_AR,
    "The phased programme and its cards are under 'Programme by phase'; in summary:\n" +
    "• Safety and skin first: pressure relief every 30 minutes (PVA 2014), the dysreflexia card (Krassioukov 2021), and assisted coughing (PVA 2005b).\n" +
    "• Motor-complete injury and the wheelchair: sliding-board transfers, bed mobility and wheelchair skills (Keeler 2019), shoulder strengthening and protection (PVA 2005a · Mulroy 2011), standing in a frame (Paleg 2015), and long leg braces for those who choose them (PVA 2026b).\n" +
    "• Walking: overground with help first, with the supported treadmill as a door to it in the first year (Dobkin 2006 · Harkema 2012), high-intensity walking for walkers (Hornby 2020 · Hornby 2026), and balance while walking and around obstacles (Benn 2025).\n" +
    "• Strength: resistance for working and weak muscles every other day (Bye 2017 · Jayaraman 2013), with stimulation on top of exercise for weak muscles (Harvey 2010).\n" +
    "• Tetraplegia: tenodesis grasp and massed task practice (Sonune 2024 · Anderson 2019), and inspiratory muscle training (Boswell-Ruys 2020).\n" +
    "• Fitness: 20 minutes of aerobic exercise twice a week and strength twice a week, with the arms or the bicycle (Martin Ginis 2018).\n" +
    PRACTICE_RULE_EN,
  ],
  contraindications: [
    "قواعدُ إحالةٍ يطبّقها المعالج:\n" +
    "• في اليوم نفسه (الطوارئ): فرطُ المنعكس الذي لا يهدأ بعد الجلوس وفكّ الضيّق وإفراغ المثانة، أو الانقباضيّ ١٥٠ فأكثر (Krassioukov 2021)؛ وتورّمٌ أو احمرارٌ أو حرارةٌ في ساق أو ضيقُ نفسٍ مفاجئ (خثرة — أصابت ٥٫٤٪ في ٩١ يوماً، Jones 2005 · PVA 2016)؛ وتورّمٌ أو تشوّهٌ في طرفٍ بلا إصابةٍ قويّة (كسرٌ في العظم الهشّ — PVA 2022)؛ وحرارةٌ مع ضيق نفسٍ أو بلغم (التهابُ رئة — Mueller 2024)؛ وحرارةٌ فوق ٣٧٫٨° مع تشوّشٍ في الحرّ (Krassioukov 2021).\n" +
    "• إلى الطبيب خلال أيّام: ضعفٌ أو تنميلٌ جديد، أو ألمٌ جديدٌ أو أسوأ، أو فقدُ مهارة — يُعاد الفحصُ العصبيّ (PVA 2026a)، وتكهّفُ الحبل (السيرنكس) تحسّن بالجراحة عند ٥٨–٩٣٪ (Vazirizadeh-Mahabadi 2026)؛ وحرارةٌ وتورّمٌ وتيبّسٌ حول الورك أو الركبة (التعظّمُ المتغاير — Xie 2026)؛ وحرقةُ البول وحرارتُه ورائحتُه (Zhang 2026)؛ وقرحةُ ضغطٍ في المرحلة الثانية فأكثر (Edsberg 2016).\n" +
    "• ما ليس إصابةً رضّية: ضعفٌ يتقدّم بلا حادث، أو ألمُ ظهرٍ ليليّ وحرارةٌ ونقصُ وزن (السلّ — Rajasekaran 2018)، أو سرطانٌ معروف أو غيرُ معروف (ضغطُ الحبل من ورم — ٢١٪ لم يُعرف لهم سرطانٌ قبله، Savage 2014)، أو تنميلُ اليدين وثقلُ المشي يتقدّمان ببطء عند الكبير (اعتلالُ النخاع العنقيّ — Fehlings 2017c) ⟵ الطبيبُ قبل التمرين.\n" +
    "• إلى الطبيب النفسيّ أو المعالج النفسيّ: الاكتئابُ — ٢٢٫٢٪ (Williams 2015) — وأفكارُ الانتحار بسؤالٍ مباشر (Bombardier 2021)، وكربُ ما بعد الحرب (Fathe 2024).\n" +
    "• بعد الجراحة: تعليماتُ الجرّاح تحكم، ولا قيودَ مكتوبةً خاصّةً بالحبل الشوكيّ (بحثٌ صفريّ)، ويبدأ التأهيلُ حين يستقرّ ويتحمّل (Fehlings 2017a).\n" +
    "موانعُ الأجهزة: لا حرارةَ على جلدٍ ناقص الإحساس — حرقٌ لم يحسّه انتهى ببتر (Vasudeva 2025)؛ ولا أقطابَ على جرحٍ أو جلدٍ ملتهب، والتحفيزُ قد يثير فرطَ المنعكس فيُقاس الضغط (Krassioukov 2021)؛ ولا مغناطيسَ مع جهازٍ مزروع (منظّمُ القلب، ومضخّةُ الدواء، ومحفّزُ الحبل) بلا إذن الطبيب؛ والجواربُ الضاغطة ومشدّةُ البطن تُفكّ في فرط المنعكس (Krassioukov 2021).",
    "Referral rules the therapist applies:\n" +
    "• Same day (emergency): dysreflexia that does not settle after sitting up, loosening tight items and emptying the bladder, or systolic of 150 or more (Krassioukov 2021); swelling, redness or warmth in a leg, or sudden breathlessness (a clot — 5.4% within 91 days, Jones 2005 · PVA 2016); swelling or deformity of a limb without major injury (a fracture of fragile bone — PVA 2022); fever with breathlessness or phlegm (pneumonia — Mueller 2024); and a temperature above 37.8° with confusion in the heat (Krassioukov 2021).\n" +
    "• To the doctor within days: new weakness or numbness, new or worse pain, or loss of a skill — the neurological examination is repeated (PVA 2026a), and a syrinx improved with surgery in 58–93% (Vazirizadeh-Mahabadi 2026); warmth, swelling and stiffness around the hip or knee (heterotopic ossification — Xie 2026); burning, fever or smelly urine (Zhang 2026); and a pressure injury of stage 2 or more (Edsberg 2016).\n" +
    "• Not a traumatic injury: weakness progressing without an accident, or night back pain with fever and weight loss (tuberculosis — Rajasekaran 2018), or known or unknown cancer (cord compression from a tumour — 21% had no known cancer beforehand, Savage 2014), or numb hands and heavy walking slowly worsening in an older person (cervical myelopathy — Fehlings 2017c) → the doctor before exercise.\n" +
    "• To a psychiatrist or psychologist: depression — 22.2% (Williams 2015) — and suicidal thoughts, asked about directly (Bombardier 2021), and post-war stress (Fathe 2024).\n" +
    "• After surgery: the surgeon's instructions rule, there are no written restrictions specific to spinal cord injury (a documented zero result), and rehabilitation starts once stable and able to tolerate it (Fehlings 2017a).\n" +
    "Contraindications to devices: no heat on skin with reduced sensation — an unnoticed burn ended in amputation (Vasudeva 2025); no electrodes on a wound or inflamed skin, and stimulation can trigger dysreflexia, so blood pressure is measured (Krassioukov 2021); no magnetic therapy with an implanted device (pacemaker, drug pump, spinal cord stimulator) without the doctor's permission; and compression stockings and abdominal binders are loosened in dysreflexia (Krassioukov 2021).",
  ],
  precautions: [
    "• قاعدةُ الممارسة في «التمارين» لكلّ المراحل.\n" +
    "• الحرّ في العراق: المصابُ في الرقبة لا يتعرّق أبداً، والمصابُ في الظهر يتعرّق حتى مستوىً واحدٍ تحت الإصابة (Trbovich 2021)، وفي ٣٧° لم يبلغ أحدٌ من الرباعيّ توازنَ الحرارة ولم يحسّوا شدّتها (Griggs 2019)، ومنع الحرُّ ٦٢٪ منهم من الخروج (Vasquez 2024): التمرينُ في مكانٍ مكيَّف أو في الصباح، والرشُّ بالماء أنفعُ تبريد (Trbovich 2019)، والتبريدُ قبل التمرين أنفعُ منه أثناءه (O'Brien 2022)، وخطّةٌ مكتوبة إن انقطعت الكهرباء.\n" +
    "• المثانةُ والأمعاء: القسطرةُ المتقطّعة مفضّلة، والكمّيةُ فوق ٥٠٠ مل تُعدَّل، ولا ضغطَ على البطن لإفراغ المثانة (PVA 2006)؛ والأمعاءُ في وقتٍ ثابت يوماً أو يوماً بعد يوم، أقلَّ من ٣٠ دقيقة ولا أكثرَ من ساعة (Johns 2021) — فالجلسةُ في وقتٍ لا يصطدم بها.\n" +
    "• الكتف: أكثرُ ما يؤلم في الحياة الطويلة على الكرسيّ (Curtis 1999 · Bossuyt 2018) — كرسيٌّ خفيفٌ يُضبط ومحورُه إلى الأمام، ودفعاتٌ طويلة هادئة، وانتقالٌ بين سطحين بارتفاعٍ واحد، وتقويةٌ للكتف (PVA 2005a)، وبرنامجُ البيت ١٢ أسبوعاً أنقص الألمَ إلى ثلثه (Mulroy 2011)، والكرسيُّ الكهربائيّ أو المساعد لمن يتألّم (PVA 2026a).\n" +
    "• العظم: الكسرُ بلا إصابةٍ قويّة عند الركبة غالباً (Morse 2019)، ولا رقمَ يمنع الوقوفَ وحده (PVA 2022) — يُحرَّك الطرفُ بلطف ولا مدى قسريّ، والسقوطُ أصاب ٣٩٪ من الماشين في ستّة أشهر (Phonthee 2013).\n" +
    "• الخلايا الجذعية والعلاجاتُ غيرُ المثبتة: حُقنت في بغداد بلا مجموعةٍ ضابطة، والتحسّنُ التلقائيّ لا يُستبعد (Hammadi 2012)، وفي الكويت شعر ٥٥٫٥٪ بالتحسّن بلا تغيّرٍ يُقاس (Al Kandari 2018) — يُسأل عنها بلا لوم، ولا تُوقف التأهيل.\n" +
    "• الأهلُ والمرافق: يتدرّب على الجلد والانتقال والسعال وفرط المنعكس (Saud 2026)؛ وفي باكستان بعد الزلزال كان ٨٢٪ بلا قرحةٍ بتأهيلٍ في المجتمع (Chishtie 2019).\n" +
    "• العملُ والمشاركة: في السعودية نقص العملُ من ٥٨٪ إلى ١٦٫٥٪، و٧٨٪ لا يعرفون التأهيلَ المهنيّ (Abdulsalam 2026) — يُسأل عن العمل ويُحال.\n" +
    "• الصلاة: في الكرسيّ بما يستطيع، والحكمُ الشرعيّ له ولمرجعه (بطاقتُها) — لا دراسة (بحثٌ صفريّ).\n" +
    "• الصورُ والفيديو بموافقته المكتوبة وحدها، ولا تُرسل خارجَ ملفّه.",
    "• The practice rule under 'Exercises' for every phase.\n" +
    "• Heat in Iraq: a person with a neck injury does not sweat at all, and one with a back injury sweats only to about one level below the injury (Trbovich 2021); at 37° no one with tetraplegia reached heat balance or sensed how hot they were (Griggs 2019), and heat stopped 62% of them going out (Vasquez 2024): exercise in an air-conditioned place or in the morning, water spray is the best cooling (Trbovich 2019), cooling before exercise works better than during it (O'Brien 2022), and a written plan for power cuts.\n" +
    "• Bladder and bowel: intermittent catheterisation is preferred, volumes above 500 mL lead to adjustment, and no pressing on the abdomen to empty the bladder (PVA 2006); the bowel at a fixed time daily or every other day, under 30 minutes and never more than an hour (Johns 2021) — so the session is timed not to clash with it.\n" +
    "• The shoulder: the commonest pain of a long life in the wheelchair (Curtis 1999 · Bossuyt 2018) — a light adjustable chair with the axle forward, long smooth strokes, level transfers and shoulder strengthening (PVA 2005a); a 12-week home programme cut pain to a third (Mulroy 2011), and a power or power-assist chair for those in pain (PVA 2026a).\n" +
    "• Bone: fractures without major injury, mostly at the knee (Morse 2019), and no single value rules standing out (PVA 2022) — the limbs are moved gently with no forced range, and falls affected 39% of walkers within six months (Phonthee 2013).\n" +
    "• Stem cells and unproven treatments: injected in Baghdad without a control group, where spontaneous recovery cannot be excluded (Hammadi 2012), and in Kuwait 55.5% felt better with no measurable change (Al Kandari 2018) — asked about without blame, and they do not stop rehabilitation.\n" +
    "• Family and carer: trained in skin, transfers, coughing and dysreflexia (Saud 2026); in Pakistan after the earthquake 82% were free of ulcers with community-based rehabilitation (Chishtie 2019).\n" +
    "• Work and participation: in Saudi Arabia employment fell from 58% to 16.5%, and 78% did not know vocational rehabilitation (Abdulsalam 2026) — work is asked about and referred.\n" +
    "• Prayer: in the chair as able, with the religious ruling for the person and their scholar (its card) — no study (a documented zero result).\n" +
    "• Photos and video only with the person's written consent, and never sent outside the file.",
  ],
  spw: 6, weeks: 6, minutes: 60, totalSessions: 36,
  refs: [
    { title: "Outcomes Following Traumatic Spinal Cord Injury, 2nd edition: Clinical Practice Guideline", org: "Paralyzed Veterans of America — Consortium for Spinal Cord Medicine clinical practice guideline (outcomes, 2nd ed.)", year: 2026, url: "https://pva.org/wp-content/uploads/2026/07/CPG_Outcomes_digital_Final.pdf" },
    { title: "Clinical Practice Guideline to Improve Locomotor Function Following Chronic Stroke, Incomplete Spinal Cord Injury, and Brain Injury", org: "J Neurol Phys Ther — APTA Academy of Neurologic Physical Therapy clinical practice guideline (Hornby et al.)", year: 2020, url: "https://doi.org/10.1097/npt.0000000000000303" },
    { title: "Evidence-based scientific exercise guidelines for adults with spinal cord injury: an update and a new guideline", org: "Spinal Cord — international scientific exercise guidelines (Martin Ginis et al.)", year: 2018, url: "https://doi.org/10.1038/s41393-017-0017-3" },
    { title: "A Clinical Practice Guideline for the Management of Patients With Acute Spinal Cord Injury: Recommendations on the Type and Timing of Rehabilitation", org: "Global Spine J — AO Spine clinical practice guideline (Fehlings et al.)", year: 2017, url: "https://doi.org/10.1177/2192568217701910" },
    { title: "Evaluation and Management of Autonomic Dysreflexia and Other Autonomic Dysfunctions: Preventing the Highs and Lows: Management of Blood Pressure, Sweating, and Temperature Dysfunction", org: "Top Spinal Cord Inj Rehabil — Consortium for Spinal Cord Medicine clinical practice guideline (Krassioukov et al.)", year: 2021, url: "https://doi.org/10.46292/sci2702-225" },
    { title: "Pressure Ulcer Prevention and Treatment Following Spinal Cord Injury: A Clinical Practice Guideline for Health-Care Professionals, 2nd edition", org: "Paralyzed Veterans of America — Consortium for Spinal Cord Medicine clinical practice guideline (pressure ulcers, 2nd ed.)", year: 2014, url: "https://pva.org/wp-content/uploads/2021/09/cpg_pressure-ulcer.pdf" },
    { title: "Preservation of upper limb function following spinal cord injury: a clinical practice guideline for health-care professionals", org: "J Spinal Cord Med — Consortium for Spinal Cord Medicine clinical practice guideline (upper limb)", year: 2005, url: "https://doi.org/10.1080/10790268.2005.11753844" },
    { title: "Respiratory management following spinal cord injury: a clinical practice guideline for health-care professionals", org: "J Spinal Cord Med — Consortium for Spinal Cord Medicine clinical practice guideline (respiratory)", year: 2005, url: "https://doi.org/10.1080/10790268.2005.11753821" },
    { title: "Bladder management for adults with spinal cord injury: a clinical practice guideline for health-care providers", org: "J Spinal Cord Med — Consortium for Spinal Cord Medicine clinical practice guideline (bladder)", year: 2006, url: "https://pubmed.ncbi.nlm.nih.gov/17274492/" },
    { title: "Management of Neurogenic Bowel Dysfunction in Adults after Spinal Cord Injury: Clinical Practice Guideline for Health Care Providers", org: "Top Spinal Cord Inj Rehabil — Consortium for Spinal Cord Medicine clinical practice guideline (Johns et al.)", year: 2021, url: "https://doi.org/10.46292/sci2702-75" },
    { title: "Prevention of Venous Thromboembolism in Individuals with Spinal Cord Injury: Clinical Practice Guidelines for Health Care Providers, 3rd ed.: Consortium for Spinal Cord Medicine", org: "Top Spinal Cord Inj Rehabil — Consortium for Spinal Cord Medicine clinical practice guideline (VTE prevention)", year: 2016, url: "https://doi.org/10.1310/sci2203-209" },
    { title: "Bone Health and Osteoporosis Management in Individuals with Spinal Cord Injury: Clinical Practice Guideline for Health Care Providers", org: "Paralyzed Veterans of America — Consortium for Spinal Cord Medicine clinical practice guideline (bone health)", year: 2022, url: "https://pva.org/wp-content/uploads/2023/01/updated_cpg_bone_health.pdf" },
    { title: "Evaluation and Management of Pain After Spinal Cord Injury: Clinical Practice Guideline", org: "Paralyzed Veterans of America — Consortium for Spinal Cord Medicine clinical practice guideline (pain)", year: 2026, url: "https://pva.org/wp-content/uploads/2021/09/CPG_Pain_digital_FINAL.pdf" },
    { title: "Identification and Management of Cardiometabolic Risk after Spinal Cord Injury: Clinical Practice Guideline for Health Care Providers", org: "Top Spinal Cord Inj Rehabil — Consortium for Spinal Cord Medicine clinical practice guideline (Nash et al.)", year: 2018, url: "https://doi.org/10.1310/sci2404-379" },
    { title: "Management of Mental Health Disorders, Substance Use Disorders, and Suicide in Adults with Spinal Cord Injury: Clinical Practice Guideline for Healthcare Providers", org: "Top Spinal Cord Inj Rehabil — Consortium for Spinal Cord Medicine clinical practice guideline (Bombardier et al.)", year: 2021, url: "https://doi.org/10.46292/sci2702-152" },
    { title: "International Standards for Neurological Classification of Spinal Cord Injury: Revised 2019", org: "Top Spinal Cord Inj Rehabil — ISNCSCI 2019 revision (Rupp et al.)", year: 2021, url: "https://doi.org/10.46292/sci2702-1" },
    { title: "International standards for neurological classification of spinal cord injury (revised 2011)", org: "J Spinal Cord Med — ISNCSCI 2011 revision (Kirshblum et al.)", year: 2011, url: "https://doi.org/10.1179/204577211x13207446293695" },
    { title: "Guidelines for neuroprognostication in adults with traumatic spinal cord injury", org: "Neurocrit Care — Neurocritical Care Society GRADE guideline (Mahanes et al.)", year: 2024, url: "https://doi.org/10.1007/s12028-023-01845-8" },
    { title: "Users of rehabilitation services in 14 countries and territories affected by conflict, 1988-2018", org: "Bull World Health Organ (Barth et al.)", year: 2020, url: "https://doi.org/10.2471/blt.19.249060" },
    { title: "Epidemiology and Rehabilitation Outcomes of Traumatic Spinal Cord Injury in Iraq (PhD thesis; Ibn Al-Quff Hospital, Baghdad; includes Arabic SCIM III)", org: "PhD thesis — Al-Nahrain University College of Medicine, Baghdad (Al-Rubaye)", year: 2012, url: "https://www.nahrainuniv.edu.iq/en/node/1903" },
    { title: "Are the 10 meter and 6 minute walk tests redundant in patients with spinal cord injury?", org: "PLoS One (Forrest et al.)", year: 2014, url: "https://doi.org/10.1371/journal.pone.0094108" },
    { title: "The spinal cord independence measure: how much change is clinically significant for spinal cord injury subjects", org: "Disabil Rehabil (Scivoletto et al.)", year: 2013, url: "https://doi.org/10.3109/09638288.2012.756942" },
    { title: "Distribution-based estimates of clinically significant changes in the International Standards for Neurological Classification of Spinal Cord Injury motor and sensory scores", org: "Eur J Phys Rehabil Med (Scivoletto et al.)", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/23486305/" },
    { title: "Inpatient and postdischarge rehabilitation services provided in the first year after spinal cord injury: findings from the SCIRehab Study", org: "Arch Phys Med Rehabil (Whiteneck et al.)", year: 2011, url: "https://doi.org/10.1016/j.apmr.2010.07.241" },
    { title: "The Effects of Electrical Stimulation Parameters in Managing Spasticity After Spinal Cord Injury: A Systematic Review", org: "Am J Phys Med Rehabil (Bekhet et al.)", year: 2019, url: "https://doi.org/10.1097/phm.0000000000001064" },
    { title: "Epidemiology of Traumatic Spinal Cord Injury in Salah-Aldeen Province - Iraq", org: "Int J Med Sci Clin Res Stud — Tikrit (Azeez et al.)", year: 2022, url: "https://zenodo.org/records/7110273" },
    { title: "Spinal Cord Injuries in Iraq: A Teleassessment Survey of the Survivors from 2017 to 2018 Islamic State of Iraq and Syria War", org: "Telemed J E Health (Fathe et al.)", year: 2024, url: "https://doi.org/10.1089/tmj.2024.0037" },
    { title: "Carpal tunnel syndrome in Iraqi paraplegic patients", org: "Journal of the Faculty of Medicine Baghdad (Alwan)", year: 2012, url: "https://doi.org/10.32007/jfacmedbagdad.542751" },
    { title: "Clinical response of 277 patients with spinal cord injury to stem cell therapy in iraq", org: "Int J Stem Cells (Hammadi et al.)", year: 2012, url: "https://doi.org/10.15283/ijsc.2012.5.1.76" },
    { title: "Correlation of neurological level and sweating level of injury in persons with spinal cord injury", org: "J Spinal Cord Med (Trbovich et al.)", year: 2021, url: "https://doi.org/10.1080/10790268.2020.1751489" },
    { title: "Evaporative heat loss insufficient to attain heat balance at rest in individuals with a spinal cord injury at high ambient temperature", org: "J Appl Physiol (1985) (Griggs et al.)", year: 2019, url: "https://doi.org/10.1152/japplphysiol.00893.2018" },
    { title: "Predictors of pressure ulcer incidence following traumatic spinal cord injury: a secondary analysis of a prospective longitudinal study", org: "Spinal Cord (Brienza et al.)", year: 2018, url: "https://doi.org/10.1038/sc.2017.96" },
    { title: "Two-year survival following discharge from hospital after spinal cord injury in Bangladesh", org: "Spinal Cord (Hossain et al.)", year: 2016, url: "https://doi.org/10.1038/sc.2015.92" },
    { title: "A specialist seating assessment clinic: changing pressure relief practice", org: "Spinal Cord (Coggrave et al.)", year: 2003, url: "https://doi.org/10.1038/sj.sc.3101527" },
    { title: "Effects of wheelchair cushions and pressure relief maneuvers on ischial interface pressure and blood flow in people with spinal cord injury", org: "Arch Phys Med Rehabil (Sonenblum et al.)", year: 2014, url: "https://doi.org/10.1016/j.apmr.2014.01.007" },
    { title: "Comparison of peak shoulder and elbow mechanical loads during weight-relief lifts and sitting pivot transfers among manual wheelchair users with spinal cord injury", org: "J Rehabil Res Dev (Gagnon et al.)", year: 2008, url: "https://doi.org/10.1682/jrrd.2007.11.0189" },
    { title: "Shoulder pain in wheelchair users with tetraplegia and paraplegia", org: "Arch Phys Med Rehabil (Curtis et al.)", year: 1999, url: "https://doi.org/10.1016/s0003-9993(99)90285-x" },
    { title: "Manual wheelchair skills capacity predicts quality of life and community integration in persons with spinal cord injury", org: "Arch Phys Med Rehabil (Hosseini et al.)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2012.05.021" },
    { title: "Systematic review and clinical recommendations for dosage of supported home-based standing programs for adults with stroke, spinal cord injury and other neurological conditions", org: "BMC Musculoskelet Disord (Paleg et al.)", year: 2015, url: "https://doi.org/10.1186/s12891-015-0813-x" },
    { title: "Bone Mineral Density Testing in Spinal Cord Injury: 2019 ISCD Official Position", org: "J Clin Densitom (Morse)", year: 2019, url: "https://doi.org/10.1016/j.jocd.2019.07.012" },
    { title: "Incidence and predictors of contracture after spinal cord injury--a prospective cohort study", org: "Spinal Cord (Diong et al.)", year: 2012, url: "https://doi.org/10.1038/sc.2012.25" },
    { title: "Stretch for the treatment and prevention of contractures", org: "Cochrane Database Syst Rev (Harvey et al.)", year: 2017, url: "https://doi.org/10.1002/14651858.cd007455.pub3" },
    { title: "The Effect of a Modified Tenodesis Wrist-hand Orthosis on Hand Function in Patients With Tetraplegia", org: "Can Prosthet Orthot J (Sonune et al.)", year: 2024, url: "https://doi.org/10.33137/cpoj.v7i1.42879" },
    { title: "Short-term progressive resistance exercise may not be effective at increasing wrist strength in people with tetraplegia: a randomised controlled trial", org: "Aust J Physiother (Glinsky et al.)", year: 2008, url: "https://doi.org/10.1016/s0004-9514(08)70043-6" },
    { title: "The effects of unimanual and bimanual massed practice on upper limb function in adults with cervical spinal cord injury: a systematic review", org: "Physiotherapy (Anderson et al.)", year: 2019, url: "https://doi.org/10.1016/j.physio.2018.10.003" },
    { title: "Functional and corticomotor changes in individuals with tetraplegia following unimanual or bimanual massed practice training with somatosensory stimulation: a pilot study", org: "J Neurol Phys Ther (Hoffman et al.)", year: 2010, url: "https://doi.org/10.1097/npt.0b013e3181fbe692" },
    { title: "Incidence and Risk Factors of Pneumonia in Individuals With Acute Spinal Cord Injury: A Multi-national, Multi-center, Prospective Cohort Study", org: "Arch Phys Med Rehabil (Mueller et al.)", year: 2024, url: "https://doi.org/10.1016/j.apmr.2023.11.002" },
    { title: "Benefit of triple-strap abdominal binder on voluntary cough in patients with spinal cord injury", org: "Spinal Cord (Julia et al.)", year: 2011, url: "https://doi.org/10.1038/sc.2011.53" },
    { title: "Abdominal binder improves lung volumes and voice in people with tetraplegic spinal cord injury", org: "Arch Phys Med Rehabil (Wadsworth et al.)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2012.06.010" },
    { title: "Energy expenditure during gait using the walkabout and isocentric reciprocal gait orthoses in persons with paraplegia", org: "Arch Phys Med Rehabil (Harvey et al.)", year: 1998, url: "https://doi.org/10.1016/s0003-9993(98)90092-2" },
    { title: "The reciprocating gait orthosis: long-term usage patterns", org: "Arch Phys Med Rehabil (Sykes et al.)", year: 1995, url: "https://doi.org/10.1016/s0003-9993(95)80534-6" },
    { title: "Reciprocating gait orthoses: a multicenter study of their use by spinal cord injured patients", org: "Arch Phys Med Rehabil (Franceschini et al.)", year: 1997, url: "https://doi.org/10.1016/s0003-9993(97)90422-6" },
    { title: "Effects of a simple functional electric system and/or a hinged ankle-foot orthosis on walking in persons with incomplete spinal cord injury", org: "Arch Phys Med Rehabil (Kim et al.)", year: 2004, url: "https://doi.org/10.1016/j.apmr.2004.02.015" },
    { title: "Weight-supported treadmill vs over-ground training for walking after acute incomplete SCI", org: "Neurology (Dobkin et al.)", year: 2006, url: "https://doi.org/10.1212/01.wnl.0000202600.72018.39" },
    { title: "Locomotor training for walking after spinal cord injury", org: "Cochrane Database Syst Rev (Mehrholz et al.)", year: 2012, url: "https://doi.org/10.1002/14651858.cd006676.pub3" },
    { title: "Manually assisted body-weight supported locomotor training does not re-establish walking in non-walking subjects with chronic incomplete spinal cord injury: A randomized clinical trial", org: "J Rehabil Med (Piira et al.)", year: 2019, url: "https://doi.org/10.2340/16501977-2508" },
    { title: "Balance and ambulation improvements in individuals with chronic incomplete spinal cord injury using locomotor training-based rehabilitation", org: "Arch Phys Med Rehabil (Harkema et al.)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2011.01.024" },
    { title: "Life-threatening outcomes associated with autonomic dysreflexia: a clinical review", org: "J Spinal Cord Med (Wan et al.)", year: 2014, url: "https://doi.org/10.1179/2045772313y.0000000098" },
    { title: "A review of the literature on the health benefits of Salat (Islamic prayer)", org: "Med J Malaysia (Chamsi-Pasha et al.)", year: 2021, url: "https://pubmed.ncbi.nlm.nih.gov/33510116/" },
    { title: "Exploring the lived experience of Arab male patients on intermittent catheterization after spinal cord injury: A phenomenological study", org: "Int J Nurs Pract (Abuzied et al.)", year: 2024, url: "https://doi.org/10.1111/ijn.13268" },
    { title: "Lived experiences, challenges and coping strategies of patients with spinal cord injury using intermittent catheterisation in Riyadh, Saudi Arabia: a qualitative study", org: "BMJ Open (Abuzied et al.)", year: 2026, url: "https://doi.org/10.1136/bmjopen-2025-115907" },
    { title: "Guidelines for the conduct of clinical trials for spinal cord injury as developed by the ICCP panel: spontaneous recovery after spinal cord injury and statistical power needed for therapeutic clinical trials", org: "Spinal Cord (Fawcett et al.)", year: 2007, url: "https://doi.org/10.1038/sj.sc.3102007" },
    { title: "Neurological recovery following traumatic spinal cord injury: a systematic review and meta-analysis", org: "J Neurosurg Spine (Khorasanizadeh et al.)", year: 2019, url: "https://doi.org/10.3171/2018.10.spine18802" },
    { title: "A clinical prediction rule for ambulation outcomes after traumatic spinal cord injury: a longitudinal cohort study", org: "Lancet (van Middendorp et al.)", year: 2011, url: "https://doi.org/10.1016/s0140-6736(10)62276-3" },
    { title: "Global, regional, and national burden of spinal cord injury, 1990-2019: a systematic analysis for the Global Burden of Disease Study 2019", org: "Lancet Neurol (GBD Spinal Cord Injuries Collaborators)", year: 2023, url: "https://doi.org/10.1016/s1474-4422(23)00287-9" },
    { title: "Epidemiological Characteristics of Traumatic Spinal Cord Injury (TSCI) in the Middle-East and North-Africa (MENA) Region: A Systematic Review and Meta-Analysis", org: "Bull Emerg Trauma (Elshahidi et al.)", year: 2018, url: "https://doi.org/10.29252/beat-060201" },
    { title: "Comparative study of functional recovery for surgically explored and conservatively managed spinal cord missile injuries", org: "Neurosurgery (Aarabi et al.)", year: 1996, url: "https://doi.org/10.1097/00006123-199612000-00013" },
    { title: "Activity-based therapy for recovery of walking in individuals with chronic spinal cord injury: results from a randomized clinical trial", org: "Arch Phys Med Rehabil (Jones et al.)", year: 2014, url: "https://doi.org/10.1016/j.apmr.2014.07.400" },
    { title: "Influence of a locomotor training approach on walking speed and distance in people with chronic spinal cord injury: a randomized clinical trial", org: "Phys Ther (Field-Fote et al.)", year: 2011, url: "https://doi.org/10.2522/ptj.20090359" },
    { title: "Higher Intensity Walking Training in Individuals With Chronic Motor Incomplete Spinal Cord Injury: A Randomized Clinical Trial", org: "Neurorehabil Neural Repair (Hornby et al.)", year: 2026, url: "https://doi.org/10.1177/15459683251399158" },
    { title: "Gait speed in relation to categories of functional ambulation after spinal cord injury", org: "Neurorehabil Neural Repair (van Hedel et al.)", year: 2009, url: "https://doi.org/10.1177/1545968308324224" },
    { title: "Effectiveness of the Wheelchair Skills Training Program: a systematic review and meta-analysis", org: "Disabil Rehabil Assist Technol (Keeler et al.)", year: 2019, url: "https://doi.org/10.1080/17483107.2018.1456566" },
    { title: "International standards to document remaining autonomic function after spinal cord injury", org: "J Spinal Cord Med (Krassioukov)", year: 2012, url: "https://doi.org/10.1179/1079026812z.00000000053" },
    { title: "Revised National Pressure Ulcer Advisory Panel Pressure Injury Staging System: Revised Pressure Injury Staging System", org: "J Wound Ostomy Continence Nurs (Edsberg)", year: 2016, url: "https://doi.org/10.1097/won.0000000000000281" },
    { title: "Reliability and repeatability of the motor and sensory examination of the international standards for neurological classification of spinal cord injury", org: "J Spinal Cord Med (Marino et al.)", year: 2008, url: "https://doi.org/10.1080/10790268.2008.11760707" },
    { title: "Modified Ashworth scale and spasm frequency score in spinal cord injury: reliability and correlation", org: "Spinal Cord (Baunsgaard et al.)", year: 2016, url: "https://doi.org/10.1038/sc.2015.230" },
    { title: "International spinal cord injury pain classification: part I. Background and description. March 6-7, 2009", org: "Spinal Cord (Bryce)", year: 2012, url: "https://doi.org/10.1038/sc.2011.156" },
    { title: "The Walking Index for Spinal Cord Injury (WISCI/WISCI II): nature, metric properties, use and misuse", org: "Spinal Cord (Ditunno et al.)", year: 2013, url: "https://doi.org/10.1038/sc.2013.9" },
    { title: "Falls in persons with spinal cord injury: validity and reliability of the Berg Balance Scale", org: "Neurorehabil Neural Repair (Wirz et al.)", year: 2010, url: "https://doi.org/10.1177/1545968309341059" },
    { title: "Do clinical balance measures have the ability to predict falls among ambulatory individuals with spinal cord injury? A systematic review and meta-analysis", org: "Spinal Cord (Abou et al.)", year: 2019, url: "https://doi.org/10.1038/s41393-019-0346-5" },
    { title: "Effects of Training Intensity on Locomotor Performance in Individuals With Chronic Spinal Cord Injury: A Randomized Crossover Study", org: "Neurorehabil Neural Repair (Brazg et al.)", year: 2017, url: "https://doi.org/10.1177/1545968317731538" },
    { title: "Functional electrical stimulation therapy of voluntary grasping versus only conventional rehabilitation for patients with subacute incomplete tetraplegia: a randomized clinical trial", org: "Neurorehabil Neural Repair (Popovic et al.)", year: 2011, url: "https://doi.org/10.1177/1545968310392924" },
    { title: "Impact of respiratory muscle training on respiratory muscle strength, respiratory function and quality of life in individuals with tetraplegia: a randomised clinical trial", org: "Thorax (Boswell-Ruys et al.)", year: 2020, url: "https://doi.org/10.1136/thoraxjnl-2019-213917" },
    { title: "Spinal Tuberculosis: Current Concepts", org: "Global Spine J (Rajasekaran et al.)", year: 2018, url: "https://doi.org/10.1177/2192568218769053" },
    { title: "Malignant spinal cord compression: NICE guidance, improvements and challenges", org: "QJM (Savage et al.)", year: 2014, url: "https://doi.org/10.1093/qjmed/hct244" },
    { title: "A Clinical Practice Guideline for the Management of Patients With Degenerative Cervical Myelopathy: Recommendations for Patients With Mild, Moderate, and Severe Disease and Nonmyelopathic Patients With Evidence of Cord Compression", org: "Global Spine J (Fehlings)", year: 2017, url: "https://doi.org/10.1177/2192568217701914" },
    { title: "Strengthening and optimal movements for painful shoulders (STOMPS) in chronic spinal cord injury: a randomized controlled trial", org: "Phys Ther (Mulroy et al.)", year: 2011, url: "https://doi.org/10.2522/ptj.20100182" },
    { title: "Balance Interventions to Improve Upright Balance Control and Balance Confidence in People With Motor-Incomplete Spinal Cord Injury or Disease: A Systematic Review and Meta-analysis", org: "Arch Phys Med Rehabil (Benn et al.)", year: 2025, url: "https://doi.org/10.1016/j.apmr.2024.07.013" },
    { title: "Strength training for partially paralysed muscles in people with recent spinal cord injury: a within-participant randomised controlled trial", org: "Spinal Cord (Bye et al.)", year: 2017, url: "https://doi.org/10.1038/sc.2016.162" },
    { title: "Short-term maximal-intensity resistance training increases volitional function and strength in chronic incomplete spinal cord injury: a pilot study", org: "J Neurol Phys Ther (Jayaraman et al.)", year: 2013, url: "https://doi.org/10.1097/npt.0b013e31828390a1" },
    { title: "Electrical stimulation plus progressive resistance training for leg strength in spinal cord injury: a randomized controlled trial", org: "Spinal Cord (Harvey et al.)", year: 2010, url: "https://doi.org/10.1038/sc.2009.191" },
    { title: "Venous thromboembolism after spinal cord injury: incidence, time course, and associated risk factors in 16,240 adults and children", org: "Arch Phys Med Rehabil (Jones et al.)", year: 2005, url: "https://doi.org/10.1016/j.apmr.2005.07.286" },
    { title: "The efficacy of surgical management in post traumatic syringomyelia: A systematic review", org: "J Spinal Cord Med (Vazirizadeh-Mahabadi et al.)", year: 2026, url: "https://doi.org/10.1080/10790268.2025.2607832" },
    { title: "Risk factors and clinical correlations of heterotopic ossification following spinal cord injury: a systematic review and meta-analysis", org: "J Orthop Surg Res (Xie et al.)", year: 2026, url: "https://doi.org/10.1186/s13018-026-06947-5" },
    { title: "Incidence and risk factors of urinary tract infection in patients with spinal cord injury: a meta-analysis", org: "Eur Spine J (Zhang et al.)", year: 2026, url: "https://doi.org/10.1007/s00586-025-09337-3" },
    { title: "Prevalence of depression after spinal cord injury: a meta-analysis", org: "Arch Phys Med Rehabil (Williams et al.)", year: 2015, url: "https://doi.org/10.1016/j.apmr.2014.08.016" },
    { title: "Preventable Burn Injury in a Person With Paraparesis Leading to Amputation: A Case Report", org: "Cureus (Vasudeva et al.)", year: 2025, url: "https://doi.org/10.7759/cureus.79526" },
    { title: "Self-reported effects of warm seasonal temperatures in persons with spinal cord injury", org: "J Spinal Cord Med (Vasquez et al.)", year: 2024, url: "https://doi.org/10.1080/10790268.2023.2194962" },
    { title: "Efficacy of Various Cooling Techniques During Exercise in Persons With Spinal Cord Injury: A Pilot Crossover Intervention Study", org: "Top Spinal Cord Inj Rehabil (Trbovich)", year: 2019, url: "https://doi.org/10.1310/sci2501-74" },
    { title: "The effect of pre-cooling or per-cooling in athletes with a spinal cord injury: A systematic review and meta-analysis", org: "J Sci Med Sport (O'Brien et al.)", year: 2022, url: "https://doi.org/10.1016/j.jsams.2022.02.005" },
    { title: "Shoulder pain in the Swiss spinal cord injury community: prevalence and associated factors", org: "Disabil Rehabil (Bossuyt et al.)", year: 2018, url: "https://doi.org/10.1080/09638288.2016.1276974" },
    { title: "Incidence and factors associated with falls in independent ambulatory individuals with spinal cord injury: a 6-month prospective study", org: "Phys Ther (Phonthee et al.)", year: 2013, url: "https://doi.org/10.2522/ptj.20120467" },
    { title: "Cell transplantation and clinical reality: Kuwait experience in persons with spinal cord injury", org: "Spinal Cord (Al Kandari et al.)", year: 2018, url: "https://doi.org/10.1038/s41393-018-0074-2" },
    { title: "Effectiveness of an Educational Program in Reducing Pressure Injuries in Patients With Spinal Cord Injury in Iraq", org: "Nurs Sci Q (Saud et al.)", year: 2026, url: "https://doi.org/10.1177/08943184251388289" },
    { title: "Spinal cord injury rehabilitation and pressure ulcer prevention after the 2005 South Asian Earthquake: a CBR case study from Pakistan", org: "Disabil Rehabil (Chishtie et al.)", year: 2019, url: "https://doi.org/10.1080/09638288.2018.1445783" },
    { title: "Employment and Social Integration Failures in Spinal Cord Injury Rehabilitation Across Arabic-Speaking Countries: A Narrative Review", org: "Am J Phys Med Rehabil (Abdulsalam et al.)", year: 2026, url: "https://doi.org/10.1097/phm.0000000000002940" },
    { title: "Non-pharmacological interventions for chronic pain in people with spinal cord injury", org: "Cochrane Database Syst Rev (Boldt et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.cd009177.pub2" },
    { title: "Functional electrical stimulation cycling exercise after spinal cord injury: a systematic review of health and fitness-related outcomes", org: "J Neuroeng Rehabil (van der Scheer et al.)", year: 2021, url: "https://doi.org/10.1186/s12984-021-00882-8" },
    { title: "The effect of low-frequency TENS in the treatment of neuropathic pain in patients with spinal cord injury", org: "Spinal Cord (Celik et al.)", year: 2013, url: "https://doi.org/10.1038/sc.2012.159" },
    { title: "The Effect and Dose-Response of Functional Electrical Stimulation Cycling Training on Spasticity in Individuals With Spinal Cord Injury: A Systematic Review With Meta-Analysis", org: "Front Physiol (Fang et al.)", year: 2021, url: "https://doi.org/10.3389/fphys.2021.756200" },
    { title: "High-volume FES-cycling partially reverses bone loss in people with chronic spinal cord injury", org: "Bone (Frotzler et al.)", year: 2008, url: "https://doi.org/10.1016/j.bone.2008.03.004" },
    { title: "Effectiveness of Functional Electrical Stimulation Assisted Locomotor Training on walking Outcomes Following Incomplete Spinal Cord Injury: Systematic Review and Meta-Analysis", org: "Neurorehabil Neural Repair (Unger et al.)", year: 2026, url: "https://doi.org/10.1177/15459683251395722" },
    { title: "Multi-center, single-blind randomized controlled trial comparing functional electrical stimulation therapy to conventional therapy in incomplete tetraplegia", org: "Front Rehabil Sci (Anderson et al.)", year: 2022, url: "https://doi.org/10.3389/fresc.2022.995244" },
    { title: "Lokomat robotic-assisted versus overground training within 3 to 6 months of incomplete spinal cord lesion: randomized controlled trial", org: "Neurorehabil Neural Repair (Alcobendas-Maestro et al.)", year: 2012, url: "https://doi.org/10.1177/1545968312448232" },
    { title: "Robot-Assisted Gait Training in Individuals With Spinal Cord Injury: A Systematic Review and Meta-Analysis of Randomized Controlled Trials", org: "Ann Rehabil Med (Park et al.)", year: 2024, url: "https://doi.org/10.5535/arm.230039" },
    { title: "Robot-assisted gait training (Lokomat) improves walking function and activity in people with spinal cord injury: a systematic review", org: "J Neuroeng Rehabil (Nam et al.)", year: 2017, url: "https://doi.org/10.1186/s12984-017-0232-3" },
    { title: "Clinical effectiveness and safety of powered exoskeleton-assisted walking in patients with spinal cord injury: systematic review with meta-analysis", org: "Med Devices (Auckl) (Miller et al.)", year: 2016, url: "https://doi.org/10.2147/mder.s103102" },
    { title: "Does sacral pulsed electromagnetic field therapy have a better effect than transcutaneous electrical nerve stimulation in patients with neurogenic overactive bladder?", org: "Arab J Urol (Fergany et al.)", year: 2017, url: "https://doi.org/10.1016/j.aju.2017.01.007" },
    { title: "Effects of repetitive transcranial magnetic stimulation on neuropathic pain in patients with spinal cord injury: a systematic review and meta-analysis of randomized controlled trials", org: "Front Neurol (Luo et al.)", year: 2026, url: "https://doi.org/10.3389/fneur.2026.1725648" },
    { title: "Shockwave therapy in persons with a spinal cord injury and spasticity: A multiple single-case experimental design study", org: "J Spinal Cord Med (Hellenbrand et al.)", year: 2025, url: "https://doi.org/10.1080/10790268.2024.2379067" },
    { title: "Extracorporeal shock wave for plantar flexor spasticity in spinal cord injury: A case report and review of literature", org: "World J Clin Cases (Comino-Suárez et al.)", year: 2023, url: "https://doi.org/10.12998/wjcc.v11.i1.127" },
    { title: "Current Preclinical and Clinical Evidence of Shock Wave Therapy for Spinal Cord Injury: A Systematic Review", org: "Cells (Nagele et al.)", year: 2026, url: "https://doi.org/10.3390/cells15080687" },
    { title: "Extracorporeal Shock Wave Therapy (eSWT) in Spinal Cord Injury-A Narrative Review", org: "J Clin Med (Opara et al.)", year: 2024, url: "https://doi.org/10.3390/jcm13175112" },
    { title: "Radial extracorporeal shock wave therapy in a patient with decubitus ulcer after spinal cord injury: a case report", org: "Am J Transl Res (Kang et al.)", year: 2020, url: "https://pubmed.ncbi.nlm.nih.gov/32509203/" },
    { title: "A systematic review of electrical stimulation for pressure ulcer prevention and treatment in people with spinal cord injuries", org: "J Spinal Cord Med (Liu et al.)", year: 2014, url: "https://doi.org/10.1179/2045772314y.0000000226" },
    { title: "Dry needling technique decreases spasticity and improves general functioning in incomplete spinal cord injury: A case report", org: "J Spinal Cord Med (Cruz-Montecinos et al.)", year: 2020, url: "https://doi.org/10.1080/10790268.2018.1533316" },
    { title: "Decrease of hypertonia after continuous passive motion treatment in individuals with spinal cord injury", org: "Clin Rehabil (Chang et al.)", year: 2007, url: "https://doi.org/10.1177/0269215507079137" },
    { title: "A systematic review of the management of orthostatic hypotension after spinal cord injury", org: "Arch Phys Med Rehabil (Krassioukov et al.)", year: 2009, url: "https://doi.org/10.1016/j.apmr.2009.01.009" },
    { title: "Non-pharmacological management of orthostatic hypotension after spinal cord injury: a critical review of the literature", org: "Spinal Cord (Gillis et al.)", year: 2008, url: "https://doi.org/10.1038/sc.2008.48" },
    { title: "The prevalence of orthostatic hypotension during physiotherapy treatment in patients with an acute spinal cord injury", org: "Spinal Cord (Illman et al.)", year: 2000, url: "https://doi.org/10.1038/sj.sc.3101089" },
    { title: "Effectiveness of home exercise on pain, function, and strength of manual wheelchair users with spinal cord injury: a high-dose shoulder program with telerehabilitation", org: "Arch Phys Med Rehabil (Van Straaten et al.)", year: 2014, url: "https://doi.org/10.1016/j.apmr.2014.05.004" },
    { title: "Feasibility Telerehabilitation at Home on Body Composition, Anthropometric Measures and Muscular Strength After Interruption 4-5 Years of Spinal Cord Injury: Serial Cases Study on Islamic State of Iraq and Syria War Survivors in Iraq", org: "Telemed J E Health (Abdullah Fathe et al.)", year: 2024, url: "https://doi.org/10.1089/tmj.2024.0078" },
    { title: "Do all patients with functional motor-incomplete (AIS-D) traumatic spinal cord injury need specialized inpatient functional rehabilitation? A prospective observational cohort study proposing clinical criteria for home-based rehabilitation after acute care", org: "J Spinal Cord Med (Richard-Denis et al.)", year: 2024, url: "https://doi.org/10.1080/10790268.2023.2200354" },
    { title: "Assessing walking ability in subjects with spinal cord injury: validity and reliability of 3 walking tests", org: "Arch Phys Med Rehabil (van Hedel et al.)", year: 2005, url: "https://doi.org/10.1016/j.apmr.2004.02.010" },
    { title: "Comparison of the Berg Balance Scale and the Mini-BESTest for Assessing Balance in Ambulatory People With Spinal Cord Injury: Validation Study", org: "Phys Ther (Jørgensen et al.)", year: 2017, url: "https://doi.org/10.1093/ptj/pzx030" },
    { title: "Intra-rater and inter-rater reliability of the Penn Spasm Frequency Scale in People with chronic traumatic spinal cord injury", org: "Spinal Cord (Mills et al.)", year: 2018, url: "https://doi.org/10.1038/s41393-018-0063-5" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 45,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٥ دقيقة في الجلسة — السلامةُ والجلدُ أوّلاً، ثمّ مسارُ الشدّة والمستوى (الانتقالُ والكرسيُّ والوقوف، أو المشيُ المسنود، أو المشيُ عالي الشدّة، أو اليدُ والتنفّس)، ثمّ القوّةُ واللياقة، ثمّ تدريبُ المرافق على ما يكرّره في البيت؛ والمريضُ فاعلٌ في كلّ دقيقة.",
        "The phased programme and its cards under 'Programme by phase': about 45 minutes per session — safety and skin first, then the pathway for grade and level (transfers, the wheelchair and standing; supported walking; high-intensity walking; or the hand and breathing), then strength and fitness, then coaching the carer on what to repeat at home; the person is active in every minute."],
      note: ["أساسيٌّ في كلّ جلسة — المشيُ المبكّر بالشدّة والتكرار والمهمّة (PVA 2026b)، والمشيُ بشدّةٍ متوسّطة إلى عالية توصيةٌ قويّة بعد ستّة أشهر (Hornby 2020)، والتمرينُ للياقة توصيةٌ قويّة (Martin Ginis 2018)، والتمرينُ أكبرُ ما أنقص ألمَ الكتف (Boldt 2014)؛ ولا طريقةُ مشيٍ أفضلُ من غيرها (Mehrholz 2012).",
        "Core in every session — early walking training with intensity, repetition and task specificity (PVA 2026b), walking at moderate to high intensity is a strong recommendation after six months (Hornby 2020), exercise for fitness is a strong recommendation (Martin Ginis 2018), and exercise gave the largest reduction in shoulder pain (Boldt 2014); no walking method is better than another (Mehrholz 2012)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 30,
      params: { currentType: "NMES / FES — biphasic symmetrical", frequencyHz: "20–33", pulseWidthUs: "200–350", intensity: "Strong visible contraction (up to 140 mA)", onOff: "During the task, or device programme", durationMin: "30" },
      parameters: ["التحفيزُ العضليّ على العضلة الضعيفة فوق التمرين لا بدله: للقوّة (الفخذُ مع المقاومة — Harvey 2010)، ولليد في الرباعيّ مع المهمّة (Popovic 2011)، ولرافعات القدم أثناء المشي مع الدعامة القصيرة بمفصل (Kim 2004)، وللدراجة بالتحفيز لمن عنده جهازُها (van der Scheer 2021). والأرقامُ من الإرشاد للعظم: انقباضٌ قويّ ظاهر بنبضةٍ ٢٠٠ ميكروثانية فأكثر و٢٠–٣٣ هرتز حتى ١٤٠ ملّي أمبير، ٣٠ دقيقة فأكثر ثلاثاً إلى خمساً في الأسبوع سنةً فأكثر (PVA 2022)، وللتشنّج ٢٠–٣٠ هرتز و٣٠٠–٣٥٠ ميكروثانية وأكثرُ من ١٠٠ ملّي أمبير (Bekhet 2019)؛ وللألم العصبيّ التحفيزُ الحسّيّ (TENS) اقتراحٌ مشروط — منخفضُ التردّد ٣٠ دقيقة يومياً عشرةَ أيّام (Celik 2013 · PVA 2026a).",
        "Muscle stimulation of a weak muscle on top of exercise, not instead of it: for strength (the thigh with resistance — Harvey 2010), for the hand in tetraplegia with task practice (Popovic 2011), for the ankle dorsiflexors while walking with a hinged short brace (Kim 2004), and for stimulated cycling where the centre has the device (van der Scheer 2021). The numbers come from the bone guideline: a strong visible contraction with a pulse of 200 microseconds or more at 20–33 Hz up to 140 mA, 30 minutes or more three to five times a week for a year or more (PVA 2022), and for spasticity 20–30 Hz, 300–350 microseconds and over 100 mA (Bekhet 2019); for neuropathic pain, sensory stimulation (TENS) is a conditional suggestion — low frequency for 30 minutes daily for ten days (Celik 2013 · PVA 2026a)."],
      note: ["مساعدٌ بقاعدة المركز — أنقص التشنّجَ ٤٥–٦٠٪ (Bekhet 2019)، والدراجةُ بالتحفيز بعد عشرين جلسةً فأكثر (Fang 2021) وزادت كثافةَ عظم الفخذ ١٤٫٤٪ في سنة (Frotzler 2008)، والإرشادُ يقترحه لليد في الرقبة بدليلٍ منخفض (Fehlings 2017a)؛ لكنّه لم يزد المشيَ على التدريب وحده (Unger 2026)، وتجربةُ اليد الكبرى تساوت مع العلاج المعتاد (Anderson 2022). وهو مسبّبٌ معروف لفرط المنعكس — يُقاس الضغط (Krassioukov 2021) — ولا أقطابَ على جلدٍ لا يحسّ وفيه احمرار.",
        "Adjunct by the centre's rule — it reduced spasticity by 45–60% (Bekhet 2019), stimulated cycling did so after more than twenty sessions (Fang 2021) and raised femoral bone density by 14.4% in a year (Frotzler 2008), and the guideline suggests it for the hand in cervical injury with low evidence (Fehlings 2017a); but it added nothing to walking over training alone (Unger 2026), and the largest hand trial found it equal to usual therapy (Anderson 2022). It is a known trigger of dysreflexia — blood pressure is measured (Krassioukov 2021) — and no electrodes go on insensate skin that is red."] },
    { code: "robotik", centreUse: "adjunct", evidence: "optional", minutes: 30,
      params: { bwsPct: "As little as tolerated (suggestion — not verified)", speed: "As close to normal walking as tolerated", guidancePct: "As low as tolerated", durationMin: "30–45" },
      parameters: ["لمن إصابتُه غيرُ كاملة (C–D) ولا يمشي أو يمشي قليلاً في السنة الأولى، ولا يكفيه المشيُ بيد المعالج والسيرُ المسنود لزيادة الخطوات: ٣٠–٤٥ دقيقة داخل الجلسة بأقلّ حملٍ للوزن وأقلّ توجيهٍ يتحمّلهما، ثمّ المشيُ على الأرض في الجلسة نفسها — والإعداداتُ اقتراحٌ لم يُتحقَّق منه فتُكتب من جهاز المركز؛ وفي التجربة ٤٠ جلسةً مع المشي على الأرض (Alcobendas-Maestro 2012)، والفائدةُ أكبرُ تحت الحادّة وفي البرامج فوق شهرين (Park 2024).",
        "For incomplete injury (C–D) with no or little walking in the first year, when therapist-assisted walking and the supported treadmill are not enough to add steps: 30–45 minutes within the session with the least body-weight support and guidance tolerated, then overground walking in the same session — the settings are an unverified suggestion, so they are entered from the centre's device; the trial used 40 sessions with overground walking (Alcobendas-Maestro 2012), and benefit was larger in the subacute stage and in programmes over two months (Park 2024)."],
      note: ["مساعدٌ بشرط — والدليلُ متضارب: أفاد في المرحلة الحادّة المسافةَ ٤٥ متراً وقوّةَ الساقين (Nam 2017)، ونفعٌ صغير في الاستقلال والمشي (Park 2024)، ومستوى المشي أفضل مع حاجةٍ أقلّ للأدوات (Alcobendas-Maestro 2012)؛ لكنّه لم يُفِد في المزمن الماشي (Field-Fote 2011)، وتوصيةٌ قويّة ضدّه للماشي بعد ستّة أشهر (Hornby 2020)، وفي تجربةٍ أنقص قدرةَ المشي (Mehrholz 2012). والهيكلُ الخارجيّ الآليّ غيرُ الروبوت: كسورُ العظم ٣٫٤٪ في تدريبه (Miller 2016) — بندٌ لسليم.",
        "A conditional adjunct — and the evidence conflicts: in the acute stage it improved distance by 45 metres and leg strength (Nam 2017), with small gains in independence and walking (Park 2024) and a better walking level with less need for aids (Alcobendas-Maestro 2012); but it did not help chronic walkers (Field-Fote 2011), there is a strong recommendation against it for walkers after six months (Hornby 2020), and in one trial it reduced walking capacity (Mehrholz 2012). A powered exoskeleton is not the robot: bone fractures occurred in 3.4% of its training (Miller 2016) — an item for Saleem."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["على الأطراف أو الظهر بعيداً عن أيّ جهازٍ مزروع، والإعداداتُ من جهاز المركز — فلا تجربةَ للحركة أو الألم أو التشنّج تحدّدها؛ والدراسةُ الوحيدة كانت للمثانة: على العجز ١٥ هرتز بنصف القدرة ٢٠ دقيقة ثلاثاً في الأسبوع عشرين جلسة (Fergany 2017).",
        "Over the limbs or the back away from any implant, with settings from the centre's device — no trial for movement, pain or spasticity sets them; the only study was for the bladder: over the sacrum at 15 Hz and half output for 20 minutes three times a week for twenty sessions (Fergany 2017)."],
      note: ["مساعدٌ بقاعدة المركز — ولا دليلَ للحركة أو الألم أو التشنّج أو العظم (بحثٌ صفريّ)، والدراسةُ الوحيدة في مصر حسّنت سعةَ المثانة أكثرَ من التحفيز الحسّيّ (Fergany 2017)؛ والتحفيزُ المغناطيسيّ للدماغ جهازٌ آخر أنقص الألمَ العصبيّ (Luo 2026) ولا ينتقل أثرُه؛ ولا يُستعمل مع جهازٍ مزروع بلا إذن الطبيب.",
        "Adjunct by the centre's rule — there is no evidence for movement, pain, spasticity or bone (a documented zero result); the only study, in Egypt, improved bladder capacity more than sensory stimulation (Fergany 2017); magnetic brain stimulation is a different device that reduced neuropathic pain (Luo 2026), and its effect does not transfer; not used with an implant without the doctor's permission."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "8–10", durationMin: "10" },
      parameters: ["دفءٌ على عضلةٍ مشدودة أو مؤلمة فوق مستوى الإصابة وحده — الكتفُ والرقبة — حيث الإحساسُ سليم، بطبقاتٍ أكثر عشرَ دقائق، ويُفحص الجلدُ كلَّ خمس دقائق؛ ولا تحت الإصابة ولا على جلدٍ ناقص الإحساس ولا على احمرار.",
        "Warmth on a tight or painful muscle above the injury level only — the shoulder and neck — where sensation is intact, with more layers for ten minutes and the skin checked every five minutes; never below the injury, on skin with reduced sensation, or over redness."],
      note: ["مساعدٌ بقاعدة المركز — لا دراسةَ للكمادة في الحبل الشوكيّ (بحثٌ صفريّ)؛ وحرقٌ لم يحسّه المريضُ انتهى ببترٍ تحت الركبة (Vasudeva 2025) — فالشرطُ الإحساسُ السليم.",
        "Adjunct by the centre's rule — there is no study of the hot pack in spinal cord injury (a documented zero result); an unnoticed burn ended in a below-knee amputation (Vasudeva 2025) — so intact sensation is the condition."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — لا تجربةَ مضبوطة في الحبل الشوكيّ: دراسةُ حالاتٍ منفردة بالشعاعيّ أسبوعياً ثلاثَ مرّات لعضلة الساق أو قابضات الرسغ حسّنت أهدافاً بلا إعداداتٍ في ملخّصها (Hellenbrand 2025)، وحالةٌ واحدة (Comino-Suarez 2023)، والمراجعاتُ: آمنٌ والبروتوكولاتُ لم تُحدَّد (Nagele 2026 · Opara 2024)؛ وفي قرحة الكعب حالةٌ واحدة بعد التنظيف الجراحيّ (Kang 2020).",
        "Not used until Saleem decides — there is no controlled trial in spinal cord injury: a single-case series of radial shockwave weekly for three sessions to the calf or wrist flexors improved goals with no settings in its abstract (Hellenbrand 2025), one case report (Comino-Suarez 2023), and the reviews: safe, with protocols not yet defined (Nagele 2026 · Opara 2024); and for a heel ulcer, one case after surgical debridement (Kang 2020)."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ في الحبل الشوكيّ للحركة أو الألم (بحثٌ صفريّ)، وفي قرحة الضغط لم يُفِد الشفاءَ في تجربة (PVA 2014)؛ والتحفيزُ الكهربائيّ هو ما يُسرّع شفاءَ القرحة عند الإرشاد (PVA 2014 · Liu 2014).",
        "Not used — there is no trial in spinal cord injury for movement or pain (a documented zero result), and for pressure injury it did not help healing in a trial (PVA 2014); electrical stimulation is what the guideline uses to speed ulcer healing (PVA 2014 · Liu 2014)."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تقريرُ حالةٍ واحد للإبر الجافّة في التشنّج عشرةَ أسابيع (Cruz-Montecinos 2020)، ولا تجربة؛ والوخزُ الصينيّ لم يثبت للألم (Boldt 2014)، ونزفٌ أو عدوى على جلدٍ لا يحسّ.",
        "Not used until Saleem decides — one case report of dry needling for spasticity over ten weeks (Cruz-Montecinos 2020), with no trial; acupuncture was not shown to reduce pain (Boldt 2014), and there is a bleeding or infection risk on insensate skin."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — ساعةٌ للكاحل خفّضت التشنّجَ عشرَ دقائق على الأقلّ ثمّ زال (Chang 2007)، والتمطيطُ وحده لا يكفي (Harvey 2017)؛ والوقوفُ والوضعُ أنفع.",
        "Not used until Saleem decides — an hour at the ankle lowered spasticity for at least ten minutes and then faded (Chang 2007), and stretching alone is not enough (Harvey 2017); standing and positioning help more."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، وخطرُ الحرق على جلدٍ لا يحسّ (Vasudeva 2025).", "Not used — there is no trial (a documented zero result), with a burn risk on insensate skin (Vasudeva 2025)."] },
    { code: "tecar", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، وحرارةٌ عميقة على جلدٍ لا يحسّ وقربَ المعادن بعد تثبيت الفقرات.", "Not used — there is no trial (a documented zero result), with deep heat on insensate skin and near metal after spinal fixation."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ).", "Not used — there is no trial (a documented zero result)."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، وخطرُ الحرق على يدٍ لا تحسّ في الرباعيّ.", "Not used — there is no trial (a documented zero result), with a burn risk on an insensate hand in tetraplegia."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم الجهاز — والجواربُ الضاغطة ومشدّةُ البطن أدواتٌ لا جهاز: للخثرة الضغطُ الهوائيّ مبكّراً في المستشفى (PVA 2016)، وللهبوط الانتصابيّ دليلُها غيرُ حاسم (Krassioukov 2009b · Gillis 2008)، وتُفكّ في فرط المنعكس (Krassioukov 2021).",
        "The device is not used — compression stockings and abdominal binders are aids, not this device: pneumatic compression is for clots early in hospital (PVA 2016), the evidence for orthostatic hypotension is inconclusive (Krassioukov 2009b · Gillis 2008), and they are loosened in dysreflexia (Krassioukov 2021)."] },
    { code: "traction", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا ينطبق ولا دليل (بحثٌ صفريّ)، وقد يضرّ الفقراتِ المثبّتة.", "Not used — not applicable and no evidence (a documented zero result), and it may harm a fixed spine."] },
  ],
  phases: [
    {
      name: ["التقييم والسلامة والأساسيات", "Assessment, safety and foundations"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلسات ١–٦ (الأسبوعُ الأوّل) — والتدريبُ يبدأ من الجلسة الأولى", "Sessions 1–6 (the first week) — with training starting from the first session"],
      goals: [
        "الفحصُ والمقاييسُ مكتوبة، والمسارُ مختار، وعلاماتُ الإحالة مفحوصة؛ والضغطُ المعتاد مكتوب، والمريضُ وأهلُه يعرفون فرطَ المنعكس والهبوطَ الانتصابيّ وتخفيفَ الضغط وفحصَ الجلد؛ وجدولُ المثانة والأمعاء معروفٌ والجلسةُ لا تصطدم به؛ وطريقةُ الانتقال والجلوسِ مختارة.",
        "The examination and measures recorded, the pathway chosen, and the referral signs checked; the usual blood pressure written down, and the person and family know dysreflexia, orthostatic hypotension, pressure relief and skin checks; the bladder and bowel schedule known with the session not clashing with it; and the method of transfer and sitting chosen.",
      ],
      education: [
        "• ما الإصابةُ وما المتوقّع: الشدّةُ (AIS) والمستوى وقاعدةُ التنبّؤ يرسمون المسار، والتعافي أكثرُه في الأشهر الأولى ويستمرّ (Fawcett 2007 · van Middendorp 2011).\n" +
        "• فرطُ المنعكس وبطاقتُه، والهبوطُ الانتصابيّ (Krassioukov 2021).\n" +
        "• الجلدُ: الميلُ دقيقتين كلَّ ٣٠ دقيقة والفحصُ صباحاً ومساءً (PVA 2014).\n" +
        "• ما لا ينفع وما يضرّ: الحقنُ غيرُ المثبتة (Hammadi 2012)، والحرارةُ على جلدٍ لا يحسّ (Vasudeva 2025).",
        "• What the injury is and what to expect: the grade (AIS), the level and the prediction rule map the course, and most recovery comes in the early months and continues (Fawcett 2007 · van Middendorp 2011).\n" +
        "• Dysreflexia and its card, and orthostatic hypotension (Krassioukov 2021).\n" +
        "• The skin: a two-minute lean every 30 minutes, and checks morning and evening (PVA 2014).\n" +
        "• What does not help and what harms: unproven injections (Hammadi 2012), and heat on insensate skin (Vasudeva 2025).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الفحصُ والقياسُ الأوّل تمّ، والمسارُ مكتوب.\n" +
        "• لا علامةَ إحالةٍ عاجلة، والضغطُ ثابتٌ في الجلوس.\n" +
        "• المريضُ أو مرافقُه يخفّف الضغطَ ويعرف خطواتِ فرط المنعكس أمام الأخصائيّ.\n" +
        "(اقتراحٌ يتبع السلامةَ والتنظيم، لا معيارٌ مجرَّب.)",
        "Progress to phase 2 when all are met:\n" +
        "• The examination and first measurement done, and the pathway written.\n" +
        "• No urgent referral sign, and blood pressure stable in sitting.\n" +
        "• The person or carer performs pressure relief and knows the dysreflexia steps in front of the specialist.\n" +
        "(A proposal based on safety and organisation, not a tested criterion.)",
      ],
      notes: [
        "• التقييمُ لا يأخذ الجلسات كلَّها: من الأولى يبدأ تدريبُ الجلوس والانتقال أو المشي بمساره.\n" +
        "• الضغطُ قبل كلّ جلسةٍ وأثناءها لمن إصابتُه في السادس الصدريّ فأعلى، والجلوسُ والوقوفُ تدريجياً (Krassioukov 2021 · Illman 2000).\n" +
        "• الكرسيُّ والوسادةُ يُفحصان، والدعامةُ والجبيرةُ تُطلبان من قسم المساند إن لزمتا.\n" +
        "• الرباعيّ: سعةُ الرئة وقوّةُ السعال، وتدريبُ المرافق على السعال المُعان.\n" +
        "• الأجهزةُ المساعدة بالتناوب وبشروطها في سطورها.",
        "• Assessment does not take all the sessions: sitting and transfer training, or walking for the walking pathway, start from the first.\n" +
        "• Blood pressure before and during every session for an injury at the sixth thoracic level or above, with sitting and standing introduced gradually (Krassioukov 2021 · Illman 2000).\n" +
        "• The wheelchair and cushion checked, and an orthosis or splint requested from the orthotics department if needed.\n" +
        "• Tetraplegia: vital capacity and cough strength, and training the carer in assisted coughing.\n" +
        "• Adjunct devices in rotation, under the conditions in their lines.",
      ],
      exercises: [
        { code: "sci-autonomic-dysreflexia", sets: 1, reps: 1,
          note: ["لمن إصابتُه في السادس الصدريّ فأعلى ولأهله: الخطواتُ والبطاقة.", "For an injury at the sixth thoracic level or above and the family: the steps and the card."] },
        { code: "sci-pressure-relief", sets: 1, reps: 1, hold: 120,
          note: ["للجميع في الكرسيّ — ويُضبط المنبّه من اليوم الأوّل.", "For everyone in a wheelchair — with the alarm set from day one."] },
        { code: "sci-long-sitting-bed-mobility", sets: 1, reps: 5, rest: 60,
          note: ["لمسار الكرسيّ (A–B) والرباعيّ.", "For the wheelchair pathway (A–B) and tetraplegia."] },
        { code: "sci-sliding-board-transfer", sets: 1, reps: 5, rest: 60,
          note: ["لمسار الكرسيّ (A–B) والرباعيّ، والمرافقُ يتعلّم المساعدة.", "For the wheelchair pathway (A–B) and tetraplegia, with the carer learning to help."] },
        { code: "sci-assisted-cough", sets: 3, reps: 3, rest: 60,
          note: ["للرباعيّ والصدريّ العالي، والمرافقُ يتعلّم.", "For tetraplegia and high thoracic injury, with the carer learning."] },
        { code: "overground-gait-training", sets: 1, reps: 1,
          note: ["لمسار المشي (C–D): بالمساعدة أو المشّاية من الجلسة الأولى.", "For the walking pathway (C–D): with help or a walker from the first session."] },
      ],
    },
    {
      name: ["التدريب المكثّف القائم على النشاط", "Intensive activity-based training"],
      sessionFrom: 7, sessionTo: 30,
      timeframe: ["الجلسات ٧–٣٠ (الأسابيعُ الثاني إلى الخامس)، والقياسُ في الجلسة ١٨ و٣٠", "Sessions 7–30 (the second to fifth weeks), with measurement at sessions 18 and 30"],
      goals: [
        "كلُّ مسارٍ يتقدّم: للمشي السرعةُ والمسافةُ تزيدان ومستوى المشي يرتفع؛ وللكرسيّ الانتقالُ ومهاراتُه وحده أو بمرافق والوقوفُ يومياً؛ وللرباعيّ القبضةُ في مهامّ اليوم وقوّةُ الشهيق تزيد؛ والقوّةُ واللياقةُ بحدّ الإرشاد؛ والكتفُ بلا ألمٍ يزيد.",
        "Every pathway progresses: for walking, speed and distance increase and the walking level rises; for the wheelchair, transfers and wheelchair skills alone or with a carer, and daily standing; for tetraplegia, the grasp in daily tasks and rising inspiratory strength; strength and fitness at the guideline level; and the shoulder without increasing pain.",
      ],
      education: [
        "• التدريبُ الكثير بشدّةٍ أفضلُ من القليل الخفيف: النبضُ فوق ٧٠٪ من الاحتياطيّ أو الجهدُ ١٥ فأكثر لمن يمشي (Hornby 2026).\n" +
        "• الكتفُ رأسُ المال: أقلُّ انتقالٍ يكفي، ودفعاتٌ طويلة، وتقويةٌ (PVA 2005a).\n" +
        "• الحرّ: التبريدُ قبل التمرين وبعده، والماءُ البارد والرشّ (O'Brien 2022 · Trbovich 2019).",
        "• Plenty of training at intensity is better than a little that is light: heart rate above 70% of reserve or effort of 15 or more for walkers (Hornby 2026).\n" +
        "• The shoulder is the capital: the fewest transfers that suffice, long strokes, and strengthening (PVA 2005a).\n" +
        "• Heat: cooling before and after exercise, cold water and spraying (O'Brien 2022 · Trbovich 2019).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• تقدّمٌ بالفرق المهمّ في مقياسٍ من مسار المريض في الجلسة ١٨ أو ٣٠: سرعةُ المشي +٠٫١٥ م/ث (Forrest 2014)، أو الاستقلالُ +٤ (Scivoletto 2013a)، أو مهاراتُ الكرسيّ والانتقالُ وحده أو بمرافق — أو أُعيدت كتابةُ الهدف الذي لم يتقدّم مع سببه.\n" +
        "• لا قرحةَ جديدة، ولا ألمَ كتفٍ يزيد.\n" +
        "• البرنامجُ المنزليّ يُؤدّى، والمرافقُ مدرَّب.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when all are met:\n" +
        "• Progress by the important difference on a measure from the person's pathway at session 18 or 30: walking speed +0.15 m/s (Forrest 2014), independence +4 (Scivoletto 2013a), or wheelchair skills and transfers alone or with a carer — or a goal that has not progressed rewritten with its reason.\n" +
        "• No new pressure injury, and no increasing shoulder pain.\n" +
        "• The home programme being done, and the carer trained.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• مسارُ الكرسيّ (A–B): الانتقالُ إلى سطوحٍ أخرى، ومهاراتُ الكرسيّ (Keeler 2019)، والوقوفُ في الجهاز ٣٠–٦٠ دقيقة (Paleg 2015)، والدعامتان الطويلتان لمن يختارهما بين المتوازيين (PVA 2026b)، وتقويةُ الكتف ٣ × ٣٠ ثلاثاً في الأسبوع لمن يتألّم (Van Straaten 2014).\n" +
        "• مسارُ C: السيرُ المسنود ثمّ الأرضُ في الجلسة نفسها (Harkema 2012)، والدعامةُ القصيرة بمفصل مع التحفيز لمن تسقط قدمُه (Kim 2004)، والروبوتُ بشرطه في السنة الأولى.\n" +
        "• مسارُ D: المشيُ عالي الشدّة على السير والأرض، والتوازنُ والعوائق (Hornby 2026 · Benn 2025)، والقوّةُ القصوى (Jayaraman 2013).\n" +
        "• الرباعيّ: قبضةُ الوتر والمهامُّ الكثيرة والتحفيزُ لليد (Popovic 2011)، وتدريبُ عضلات الشهيق مرّتين يومياً ستّةَ أسابيع (Boswell-Ruys 2020).\n" +
        "• اللياقةُ والقوّة: ٢٠ دقيقةً هوائية مرّتين وثلاثُ مجموعات قوّةٍ مرّتين في الأسبوع (Martin Ginis 2018).",
        "• Wheelchair pathway (A–B): transfers to other surfaces, wheelchair skills (Keeler 2019), standing in the frame for 30–60 minutes (Paleg 2015), long leg braces between parallel bars for those who choose them (PVA 2026b), and shoulder strengthening at 3 × 30 three times a week for those in pain (Van Straaten 2014).\n" +
        "• Pathway C: the supported treadmill then overground in the same session (Harkema 2012), a hinged short brace with stimulation for foot drop (Kim 2004), and the robot under its condition in the first year.\n" +
        "• Pathway D: high-intensity treadmill and overground walking, balance and obstacles (Hornby 2026 · Benn 2025), and maximal strength (Jayaraman 2013).\n" +
        "• Tetraplegia: tenodesis grasp, massed task practice and hand stimulation (Popovic 2011), and inspiratory muscle training twice a day for six weeks (Boswell-Ruys 2020).\n" +
        "• Fitness and strength: 20 minutes of aerobic exercise twice and three sets of strength twice a week (Martin Ginis 2018).",
      ],
      exercises: [
        { code: "sci-pressure-relief", sets: 1, reps: 1, hold: 120 },
        { code: "sci-sliding-board-transfer", sets: 1, reps: 5, rest: 60,
          note: ["إلى الكرسيّ والسرير ثمّ المرحاض والسيارة.", "To the chair and bed, then the toilet and the car."] },
        { code: "wheelchair-skills", sets: 1, reps: 5,
          doseNote: ["نحو ١٠–١٥ دقيقة في الجلسة، والكرسيُّ في البيت والشارع يومياً — والبرنامجُ رفع المهارةَ ١٤٪ (Keeler 2019).", "About 10–15 minutes per session, with the chair used daily at home and in the street — the programme raised skill by 14% (Keeler 2019)."],
          note: ["لمسار الكرسيّ: الدفعُ الطويل الهادئ، والمنحدر، والرصيف، والتوازنُ على العجلتين.", "For the wheelchair pathway: long smooth strokes, ramps, kerbs and wheelies."] },
        { code: "seated-push-ups", sets: 3, reps: 10,
          doseNote: ["٣ × ١٠ يوماً بعد يوم للقوّة — وتخفيفُ الضغط بالميل دقيقتين لا بالرفع (بطاقتُه).", "3 × 10 every other day for strength — with pressure relief by a two-minute lean, not by lifting (its card)."],
          note: ["تقويةٌ للانتقال والدفع، لا لتخفيف الضغط.", "Strength for transfers and pushing, not for pressure relief."] },
        { code: "band-row", sets: 3, reps: 15,
          note: ["عضلاتُ الكتف الخلفية حفظاً للكتف (PVA 2005a · Mulroy 2011).", "The back of the shoulder, to protect it (PVA 2005a · Mulroy 2011)."] },
        { code: "band-er", sets: 3, reps: 15,
          note: ["الكفّةُ المدوّرة؛ ٣ × ٣٠ ثلاثاً في الأسبوع لمن يتألّم كتفُه (Van Straaten 2014).", "The rotator cuff; 3 × 30 three times a week for a painful shoulder (Van Straaten 2014)."] },
        { code: "sci-standing-frame", sets: 1, reps: 1,
          note: ["لمن لا يقف وحده: ٣٠ دقيقة خمساً في الأسبوع ثمّ ساعةٌ يومياً.", "For those who cannot stand alone: 30 minutes five times a week, then an hour daily."] },
        { code: "sci-kafo-walking", sets: 1, reps: 5, rest: 120,
          note: ["للصدريّ والقطنيّ الكامل حركيّاً إن اختارها هدفاً، وللشدّة C بالدعامة القصيرة أو الطويلة.", "For motor-complete thoracic and lumbar injury if chosen as a goal, and for C with a short or long brace."] },
        { code: "sci-bwstt-locomotor", sets: 1, reps: 1,
          note: ["للشدّتين C وD البطيء في السنة الأولى، ثمّ الأرضُ في الجلسة نفسها.", "For C and slow D in the first year, then overground in the same session."] },
        { code: "overground-gait-training", sets: 1, reps: 1,
          note: ["للشدّتين C–D في كلّ جلسة، بأقلّ أداةٍ ومساعدة.", "For C–D in every session, with the least aid and help."] },
        { code: "hit-treadmill-walking", sets: 1, reps: 1,
          doseNote: ["حتى ٣٠ جلسة بنبضٍ فوق ٧٠٪ من الاحتياطيّ أو جهدٍ ١٥ فأكثر، والسرعةُ أو الحملُ يزيدان (Hornby 2026 · Brazg 2017).", "Up to 30 sessions with a heart rate above 70% of reserve or effort of 15 or more, raising speed or load (Hornby 2026 · Brazg 2017)."],
          note: ["للشدّة D الماشي بلا مساعدة أو بأداة، مع حزامٍ بلا حملٍ للأمان؛ وتُراقَب الحرارةُ والضغط.", "For D walking unaided or with an aid, in a safety harness without support; with temperature and blood pressure watched."] },
        { code: "standing-weight-shift", sets: 2, reps: 10,
          note: ["للشدّتين C–D: نقلُ الوزن والوصولُ واقفاً بجانب سطحٍ ثابت.", "For C–D: weight shifting and reaching in standing beside a steady surface."] },
        { code: "sci-tenodesis-grasp", sets: 3, reps: 10, rest: 60,
          note: ["للرباعيّ برافعات رسغٍ ٣ من ٥ فأكثر، ومع التحفيز لليد إن وُصف.", "For tetraplegia with wrist extensors of 3/5 or more, with hand stimulation if prescribed."] },
        { code: "reach-grasp-task", sets: 1, reps: 10,
          note: ["للرباعيّ بأصابع تعمل: مهامُّ كثيرة بالكوب والملعقة والأزرار (Anderson 2019).", "For tetraplegia with working fingers: massed tasks with a cup, spoon and buttons (Anderson 2019)."] },
        { code: "sci-assisted-cough", sets: 3, reps: 3, rest: 60,
          note: ["للرباعيّ والصدريّ العالي، ومع تدريب عضلات الشهيق.", "For tetraplegia and high thoracic injury, with inspiratory muscle training."] },
      ],
    },
    {
      name: ["المجتمع والبيت والوقاية وخطّة ما بعد الكتلة", "Community, home, prevention and the plan after the block"],
      sessionFrom: 31, sessionTo: 36,
      timeframe: ["الجلسات ٣١–٣٦ (الأسبوعُ السادس)، ثمّ البرنامجُ المنزليّ ومراجعةٌ كلَّ ثلاثة أشهر في السنة الأولى وكلَّ ستّةٍ بعدها", "Sessions 31–36 (week six), then the home programme with reviews every 3 months in year one and every 6 months after"],
      goals: [
        "ما تعلّمه يُؤدّى في مكانه الحقيقيّ (البيت، والشارع، والمسجد، والعمل)؛ والمريضُ وأهلُه يديرون الجلدَ والحرارةَ والبرنامجَ وحدهم؛ والتمرينُ في البيت بحدّ الإرشاد؛ وموعدُ المراجعة وخطّةُ الكتلة التالية مكتوبان.",
        "What was learnt performed in its real place (home, the street, the mosque, work); the person and family managing skin, heat and the programme by themselves; exercise at home at the guideline level; and the review date and the plan for the next block written down.",
      ],
      education: [
        "• المكسبُ يبقى بالتمرين المستمرّ: ٢٠ دقيقةً هوائية مرّتين وقوّةٌ مرّتين للياقة، و٣٠ دقيقة ثلاثاً للقلب والسكّر (Martin Ginis 2018 · Nash 2018).\n" +
        "• خطّةُ الحرّ للصيف: الوقتُ والمكانُ والماءُ والرشُّ وانقطاعُ الكهرباء (Trbovich 2021 · Griggs 2019).\n" +
        "• الكتفُ والرسغ: فحصٌ في كلّ مراجعة، والكرسيُّ يُراجَع كلَّ سنة (PVA 2026a · Alwan 2012).\n" +
        "• الكسرُ والسقوط: علاماتُهما وما يُفعل (PVA 2022 · Phonthee 2013).",
        "• The gain is kept by continuing exercise: 20 minutes of aerobic exercise twice and strength twice for fitness, and 30 minutes three times for heart and glucose (Martin Ginis 2018 · Nash 2018).\n" +
        "• A summer heat plan: timing, place, water, spraying and power cuts (Trbovich 2021 · Griggs 2019).\n" +
        "• The shoulder and wrist: checked at every review, with the wheelchair reviewed every year (PVA 2026a · Alwan 2012).\n" +
        "• Fractures and falls: their signs and what to do (PVA 2022 · Phonthee 2013).",
      ],
      criteria: [
        "الخروجُ من الكتلة حين تتحقّق كلُّها:\n" +
        "• هدفُ المسار بلغ، أو تقدّمٌ بلا بلوغٍ مع سببٍ مكتوب.\n" +
        "• لا قرحةَ ضغط، والمريضُ أو مرافقُه يدير الجلدَ والمثانةَ والأمعاءَ وفرطَ المنعكس.\n" +
        "• البرنامجُ المنزليّ مكتوبٌ ويُؤدّى، والمراجعةُ في موعدها.\n" +
        EXTEND_AR,
        "Discharge from the block when all are met:\n" +
        "• The pathway goal reached, or progress without reaching it with a written reason.\n" +
        "• No pressure injury, and the person or carer manages skin, bladder, bowel and dysreflexia.\n" +
        "• The home programme written and being done, with the review on time.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• التدريبُ في المكان الحقيقيّ: البيتُ ودرجُه، والشارعُ والرصيف، والسيارة، والمسجد.\n" +
        "• البرنامجُ المنزليّ بأدوات البيت — وفي الموصل تحسّنت القوّةُ ببرنامجٍ منزليّ عن بُعد ستّةَ أشهر (Abdullah Fathe 2024)، والبيتُ نفع مَن إصابتُه D (Richard-Denis 2024).\n" +
        "• العملُ والدراسة: يُسأل عنهما ويُحال (Abdulsalam 2026).\n" +
        "• مراجعةُ الكرسيّ والوسادة والدعامة قبل الخروج.\n" +
        "• التصويرُ بالفيديو في آخر جلسة بموافقته للمقارنة في المراجعة.",
        "• Practice in the real place: the home and its stairs, the street and kerb, the car and the mosque.\n" +
        "• A home programme with household items — in Mosul strength improved with a six-month home telerehabilitation programme (Abdullah Fathe 2024), and home-based rehabilitation helped people with D injuries (Richard-Denis 2024).\n" +
        "• Work and study: asked about and referred (Abdulsalam 2026).\n" +
        "• Review of the wheelchair, cushion and orthosis before discharge.\n" +
        "• A video at the last session, with consent, for comparison at the review.",
      ],
      exercises: [
        { code: "sci-pressure-relief", sets: 1, reps: 1, hold: 120,
          note: ["وحده أو بمرافقه بلا تذكير.", "Alone or with the carer without reminders."] },
        { code: "sci-wheelchair-prayer", sets: 1, reps: 1,
          note: ["لمن يريد: الوضوءُ والصلاةُ والمسجد.", "For those who wish: ablution, prayer and the mosque."] },
        { code: "wheelchair-skills", sets: 1, reps: 5,
          doseNote: ["نحو ١٠ دقائق في الجلسة في الشارع والرصيف، والكرسيُّ في الحياة يومياً.", "About 10 minutes per session in the street and on kerbs, with the chair used in daily life."],
          note: ["الرصيفُ والمنحدرُ والقيامُ من الأرض إلى الكرسيّ (Hosseini 2012).", "Kerbs, ramps and getting up from the floor into the chair (Hosseini 2012)."] },
        { code: "obstacle-dual-task-walking", sets: 1, reps: 5,
          note: ["للشدّتين C–D: المشيُ في الشارع والسوق والمسجد.", "For C–D: walking in the street, the market and the mosque."] },
        { code: "hit-treadmill-walking", sets: 1, reps: 1,
          doseNote: ["مشيٌ سريع ٣٠ دقيقة ثلاثاً في الأسبوع فأكثر في البيت أو النادي (Martin Ginis 2018 · Nash 2018).", "Brisk walking for 30 minutes three times a week or more at home or a gym (Martin Ginis 2018 · Nash 2018)."],
          note: ["للشدّة D: يستمرّ في البيت أو النادي مشياً سريعاً.", "For D: continued at home or a gym as brisk walking."] },
        { code: "sci-standing-frame", sets: 1, reps: 1,
          note: ["في البيت يومياً لمن عنده الجهاز.", "Daily at home for those who have the frame."] },
        { code: "band-er", sets: 3, reps: 15,
          note: ["برنامجُ الكتف في البيت ١٢ أسبوعاً (Mulroy 2011).", "The shoulder home programme for 12 weeks (Mulroy 2011)."] },
        { code: "sci-autonomic-dysreflexia", sets: 1, reps: 1,
          note: ["سؤالٌ وتذكير: البطاقةُ معه دائماً.", "A question and a reminder: the card always with them."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٣٦ جلسة بستٍّ في الأسبوع (ستّةُ أسابيع) وتمديدٌ واحد باثنتي عشرة لمن تقدّم، ثمّ برنامجٌ منزليّ ومراجعةٌ كلَّ ثلاثة أشهر في السنة الأولى وكلَّ ستّةٍ بعدها وكتلةٌ جديدة — والتجاربُ ثلاثاً إلى خمساً في الأسبوع ٨–٢٤ أسبوعاً، ولا تجربةَ قارنت الكتلَ بالمستمرّ: أتبقيه ٦ × ٦، أم ٣ × ١٢ (ثلاثاً في الأسبوع اثنا عشرَ أسبوعاً)، أم ٥ × ١٢ للمشي؟ وكم كتلةً في السنة الأولى؟",
    en: "36 sessions at six a week (six weeks) with one extension of twelve for those progressing, then a home programme with a review every three months in the first year and every six months after, and a new block — trials used three to five a week for 8–24 weeks (Jones 2014 · Field-Fote 2011 · Hornby 2026), and no trial compared blocks with continuous therapy: keep it at 6 × 6, or 3 × 12 (three a week for twelve weeks), or 5 × 12 for walking? And how many blocks in the first year?" },
  { key: "limits", topic: "limits",
    ar: "الحدود: سرعةُ المشي +٠٫١٥ م/ث، والاستقلالُ +٤ (و+١٠ كبير)، وقوّةُ الساقين +٥ للانتقال والتمديد؛ و٠٫٤٤ م/ث للمشي خارجَ البيت بأداة و٠٫٧٠ بلا أداة؛ وشدّةُ المشي فوق ٧٠٪ من احتياطيّ النبض أو جهدٌ ١٥ فأكثر للشدّة D — والانتقالُ بين المراحل اقتراحٌ لا معيارٌ مجرَّب: أتقبلها؟",
    en: "The limits: walking speed +0.15 m/s (Forrest 2014), independence +4 with +10 large (Scivoletto 2013a), and leg strength +5 (Scivoletto 2013b) to progress and extend; 0.44 m/s for outdoor walking with an aid and 0.70 without (van Hedel 2009); and walking intensity above 70% of heart-rate reserve or effort of 15 or more for D (Hornby 2026) — progression between phases is a proposal, not a tested criterion: do you accept them?" },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة مع طبيب المركز: الطوارئ (فرطُ المنعكس الذي لا يهدأ أو الانقباضيّ ١٥٠ فأكثر، والخثرة، والكسرُ بلا إصابة، والتهابُ الرئة، والحرارةُ مع التشوّش)، والطبيبُ خلال أيّام (ضعفٌ أو ألمٌ جديد، والتعظّمُ المتغاير، والتهابُ البول، والقرحة)، وما ليس رضّياً (السلّ، والورم، واعتلالُ النخاع العنقيّ)، والنفسيّ (الاكتئاب والانتحار): مَن يُجري الفحصَ الدوليّ (ISNCSCI) في المركز؟ ومَن يتابع المثانةَ والمسالكَ البولية؟",
    en: "The referral rules with the centre's doctor: emergency (dysreflexia that does not settle or systolic of 150 or more — Krassioukov 2021, a clot, a fracture without injury, pneumonia, fever with confusion), the doctor within days (new weakness or pain — PVA 2026a, heterotopic ossification, urinary infection, an ulcer), non-traumatic causes (tuberculosis, tumour, cervical myelopathy — Savage 2014 · Fehlings 2017c), and mental health (depression and suicide — Bombardier 2021): who performs the international examination (ISNCSCI) in the centre? And who follows the bladder and urology?" },
  { key: "heat-prayer", topic: "content",
    ar: "الحرُّ والصلاة: المصابُ في الرقبة لا يتعرّق — هل في قاعة العلاج تكييفٌ ومولّدٌ عند انقطاع الكهرباء، وهل نجعل جلساتِ الصيف صباحاً لمن إصابتُه في السادس الصدريّ فأعلى؟ والصلاةُ والوضوءُ والتيمّمُ وطهارةُ القسطرة: الحكمُ للمريض ومرجعه — هل يكفي ما كُتب في البطاقة، وهل في المركز مكانٌ خاصّ للقسطرة؟",
    en: "Heat and prayer: a person with a neck injury does not sweat (Trbovich 2021 · Griggs 2019) — does the treatment hall have air-conditioning and a generator for power cuts, and should summer sessions be in the morning for injuries at the sixth thoracic level or above? Prayer, ablution, dry ablution and catheter purity: the ruling is the person's and their scholar's — is what the card says enough, and is there a private place in the centre for catheterising?" },
  { key: "orthoses-equipment", topic: "content",
    ar: "المركزُ يصنع الدعامات: الدعامتان الطويلتان للصدريّ والقطنيّ الكامل — يتركها أكثرُ المستعملين في سنين (والتبادليةُ بطيئةٌ مكلفة)؛ أنصنعها لمن يختارها هدفاً وتمريناً وحده؟ والدعامةُ القصيرة بمفصل للشدّتين C–D؟ وجبيرةُ قبضة الوتر للرباعيّ؟ والكرسيُّ الخفيف والوسادةُ وجهازُ الوقوف ولوحُ الانتقال ومشدّةُ البطن: يوفّرها المركز أم يُحيل؟",
    en: "The centre makes orthoses: long leg braces for complete thoracic and lumbar injury — most users abandon them within years (Sykes 1995 · Franceschini 1997), and reciprocating ones are slow and costly (Harvey 1998); do we make them only for those who choose them as a goal and exercise? A hinged short brace for C–D (Kim 2004)? A tenodesis splint for tetraplegia (Sonune 2024)? And the light wheelchair, cushion, standing frame, transfer board and abdominal binder: does the centre supply them or refer?" },
  { key: "device-robotik", topic: "devices",
    ar: "الروبوتُ مساعدٌ بشرط (C–D لا يمشي أو يمشي قليلاً في السنة الأولى) والدليلُ متضارب، وضدّه بقوّة للماشي بعد ستّة أشهر: أتبقيه بشرطه، أم «لا يُستخدم»؟ واكتب إعداداتِه (الحملُ والتوجيهُ والسرعةُ والمدّة) من جهاز المركز.",
    en: "The robot is a conditional adjunct (C–D with no or little walking in the first year — Park 2024 · Nam 2017) and the evidence conflicts, with a strong recommendation against it for walkers after six months (Hornby 2020): keep it with its condition, or 'not used'? And write its settings (support, guidance, speed, duration) from the centre's device." },
  { key: "device-others", topic: "devices",
    ar: "التحفيزُ مساعدٌ بأرقام الإرشاد (٢٠–٣٣ هرتز و٢٠٠–٣٥٠ ميكروثانية وانقباضٌ قويّ ٣٠ دقيقة) — هل يُخرجها جهازُ المركز، وهل فيه برنامجٌ للدراجة أو للقدم؟ والكمادةُ فوق الإصابة وحدها؛ والمغناطيسُ بقاعدتك بلا دليلٍ إلّا للمثانة — أيُّ نوعٍ جهازُه؟ والموجاتُ الصادمة والإبرُ والجهازُ السلبيّ «لا يُستخدم» لقرارك (لا تجربةَ مضبوطة)، والليزر «لا يُستخدم».",
    en: "Stimulation is an adjunct with the guideline numbers (20–33 Hz, 200–350 microseconds, a strong contraction for 30 minutes — PVA 2022 · Bekhet 2019) — does the centre's device deliver them, and does it have a cycling or foot-drop programme? The hot pack above the injury only; magnetic therapy by your rule with no evidence except for the bladder (Fergany 2017) — which type is the device? Shockwave, needling and the passive-motion device are 'not used' for your decision (no controlled trial — Hellenbrand 2025 · Cruz-Montecinos 2020 · Chang 2007), and laser is 'not used'." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: قوّةَ الساقين والذراعين (من ٥٠ لكلٍّ، الأكثر أفضل)، والمشيَ ستّ دقائق بالمتر، والنهوضَ والمشيَ بالثواني (الأقلّ أفضل)، وميني-بيست (من ٢٨)، والتشنّجَ بأشوورث المعدّل، والتشنّجاتِ بمقياس بن، والألمَ من ١٠، وقوّةَ الشهيق للرباعيّ، واختبارَ مهارات الكرسيّ — ونسخةُ الاستقلال العربية في رسالةٍ ببغداد لم تُنشر في مجلّة: أتعتمدها؟",
    en: "Add under 'Measures' → custom measure: lower- and upper-limb motor scores (out of 50 each, higher is better — Marino 2008), the six-minute walk in metres (Forrest 2014), timed up and go in seconds (lower is better — van Hedel 2005), the Mini-BESTest (out of 28 — Jorgensen 2017), spasticity on the Modified Ashworth (Baunsgaard 2016), spasms on the Penn scale (Mills 2018), pain out of 10, inspiratory strength for tetraplegia (Boswell-Ruys 2020), and the Wheelchair Skills Test (Keeler 2019) — the Arabic version of the independence measure is in a Baghdad thesis not published in a journal (Al-Rubaye 2012): do you adopt it?" },
];

export const name = "167_physio_sci_incomplete_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
