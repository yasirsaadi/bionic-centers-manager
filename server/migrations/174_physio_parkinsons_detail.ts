// Migration 174: مرض باركنسون — البروتوكولُ الخامس والثلاثون مفصَّلاً (§4.fe — ٢٠٢٦-١٠-٢٤).
//
// بمعيار المالك «تبعا لشيوع حالاته في العراق» اختار المساعدُ «مرض باركنسون» (`parkinsons-geriatric`): لا مسحَ سكّانيّاً عراقيّاً من بيتٍ إلى بيت (بحثٌ صفريّ)،
// والنموذجُ العالميّ يقدّر في العراق ١٤٣٨٢ مريضاً عام ٢٠١٩ بمعدّلٍ معياريّ ٧٤٫٢ لكلّ مئة ألف — أقلَّ ممّا يُتوقَّع لمستوى البلد (Safiri 2023)؛ وفي عيادات بغداد ٥٥٪
// في مرحلةٍ متقدّمة وثلثاهم رجال (Muslim 2017)، وقال أطبّاءُ الأعصاب من خمس محافظات إنّ العلاجَ الطبيعيّ قليلُ الاستعمال والأدويةَ فوق طاقة المرضى (Ibrahim 2025a)؛
// والسقوطُ ربعُ إصابات المدنيّين في بغداد (Stewart 2016) ويسقط ٦٠٫٥٪ من المرضى (Allen 2013). بالقالب كاملاً (§4.dd): المسارُ الرئيس (المرحلة ٢–٤ بمقياس هون وياهر،
// أو أيُّ سقوطٍ أو تجمّدٍ أو هدفٍ للتوازن) ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة — ولا تجربةَ قارنت ستّاً بثلاث، وأدنى جرعة الإرشاد الأوروبيّ ثلاثٌ في الأسبوع ثمانيةَ
// أسابيع (Keus 2014) وهو بندٌ لسليم — وتمديدٌ واحد باثنتي عشرة بمعيارٍ مكتوب، ثمّ البيتُ ثلاثاً في الأسبوع فأكثر حتى الأسبوع ١٢ وبعده ومراجعاتٌ في ٣ و٦ أشهر وكتلةُ تنشيطٍ
// من ١٢ كلَّ ٦–١٢ شهراً أو حين ينقص مقياسٌ أو يظهر سقوطٌ جديد؛ والمسارُ المبكّر ١٢ جلسة ثمّ البيت، والمتأخّرُ ١٢ لتدريب المرافق؛ وثلاثُ مراحل بنطاقات (١–٦ التقييمُ
// والسلامةُ والأسس · ٧–١٨ التدريبُ المكثّف · ١٩–٢٤ النقلُ إلى فترة الانطفاء والبيت) بمعايير الفرق المهمّ (سرعةُ المشي — Hass 2014، وميني-بيست — Godi 2020، والنهوضُ
// والمشي — Taghizadeh 2025)؛ والتدريبُ في فترة عمل الدواء، والضغطُ من الاستلقاء إلى الوقوف، والتوقّفُ بهبوط الانقباضيّ أكثرَ من ١٠ ملم زئبق، والشدّةُ ببورغ؛ وقواعدُ إحالة
// (فرطُ الحرارة بعد إيقاف الدواء، والإغماء، وهبوطُ الضغط، والباركنسونُ غيرُ النمطيّ، والبلع)؛ وعشرُ بطاقاتٍ جديدة والمعادةُ برمزها؛ والأجهزةُ الخمسةَ عشرَ: التمرينُ أساسيّ،
// والروبوتُ مساعدٌ للمرحلة ٣–٤ ولمن يتجمّد، والتحفيزُ العصبيّ والكمادةُ لألم العضلات وحده بشروطهما، والباقي «لا يُستخدم» — ومع منبّه الدماغ المزروع لا شيءَ كهربائيّاً
// (Nutt 2001 · Keus 2014)، والموجاتُ الصادمة «لا يُستخدم» فلا إعداداتٍ تمنع اعتمادَه؛ وبنودُ «اضغطه يا سليم» بأداة `checklistSql`. كلُّه مسوّدة حتى يعتمده سليم.
//
// ما يخصّ هذا المرض: الإرشادُ الأوروبيّ للعلاج الطبيعيّ (Keus 2014) والأمريكيّ (Osborne 2022 — نُشر في مجلّة Physical Therapy) والبريطانيّ (NICE NG71 2017) وإرشادُ
// السقوط العالميّ (Montero-Odasso 2022) والإماراتيّان للمرض ولصيام رمضان (Mittal 2026 · Mittal 2025)؛ والجرعة: التمرينُ أنقص معدّلَ السقوط ٢٦٪ (Allen 2022)، وعددُ
// الجلسات في الأسبوع لم يغيّر الأثرَ (El Hayek 2023)، والإشرافُ القليل في المرض الشديد زاد السقوط (Canning 2015)، والمكسبُ يزول بالتوقّف (Wallen 2018). وما يخصّ العراق:
// غلاءُ الدواء وقلّةُ عيادات الحركة، والصلاةُ ورمضانُ والإفطارُ وهبوطُ الضغط، والحرُّ وانقطاعُ الكهرباء، والرعايةُ في البيت بالأسرة.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC ومع Crossref (٢٨٣ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ مولَّداً من الجدول، ولا مرجعَ قبل ١٩٩٠)،
// والإرشاداتُ من نصوصها (الأوروبيُّ كاملاً في ١٩١ صفحة). القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

// البطاقاتُ الجديدة — عشرٌ لمرض باركنسون؛ والمعادةُ تُربط برمزها وصورتها، وما يخصّ هذا المرض في ملاحظة المرحلة.
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "pd-big-amplitude-movements", nameAr: "الحركاتُ الواسعة للجسم كلِّه (مبدأ السعة)", nameEn: "Big-amplitude whole-body movements (the amplitude principle)",
    kind: "functional", region: "whole_body", sets: 2, reps: 10, rest: 30,
    purpose: ["المرضُ يُصغّر الحركةَ ويُبطئها، والتدريبُ على السعة يقاومه: برنامجُ LSVT BIG ستَّ عشرةَ جلسةً من ساعة في أربعة أسابيع أنقص الفحصَ الحركيّ ٥٫٠٥ نقطة مقابل زيادةٍ ٠٫٥٨ بالمشي النورديّ و١٫٦٨ في البيت (Ebersbach 2010)، وعشرُ جلساتٍ في أسبوعين أعطت مثلَه (Ebersbach 2015)، وفي جمع التجارب −٣٫٢٠ (McDonnell 2018) ويبقى غيرَ مؤكَّد في المقارنة الشبكية (Ernst 2024)؛ والإرشادُ يجعل المهامَّ الوظيفية بحركاتٍ واسعة سريعة أساسَ التمرين (Keus 2014). وهذه البطاقةُ تستعمل مبدأَ السعة، لا البرنامجَ المسجَّل باسمه.",
      "The disease makes movement small and slow, and amplitude training counters it: LSVT BIG, sixteen one-hour sessions in four weeks, reduced the motor examination by 5.05 points against rises of 0.58 with Nordic walking and 1.68 at home (Ebersbach 2010), ten sessions in two weeks gave similar gains (Ebersbach 2015), the pooled effect was −3.20 (McDonnell 2018), and it remains uncertain in the network meta-analysis (Ernst 2024); the guideline makes functional tasks with large, fast movements the basis of exercise (Keus 2014). This card uses the amplitude principle, not the branded programme."],
    start: ["واقفاً مستقيماً في مكانٍ واسع والقدمان بعرض الوركين، وكرسيٌّ ثابت بجانبه؛ وجالساً إن لم يكن الوقوفُ آمناً.", "Standing tall in an open space with the feet hip-width apart and a steady chair beside; seated if standing is not safe."],
    steps: [[
      "ارفع الذراعين عالياً وإلى الجانبين، والأصابعُ مفتوحةٌ ممدودة.",
      "خطوةٌ كبيرة إلى الأمام والذراعُ المقابلة تمتدّ إلى الأمام والأعلى، ثمّ ارجع.",
      "خطوةٌ كبيرة إلى الجانب والذراعان تنفتحان، ثمّ ارجع.",
      "خطوةٌ كبيرة إلى الخلف بجانب الكرسيّ — إن سمح التوازن وحده، فالخطوةُ إلى الخلف قد تُسقط (Keus 2014).",
      "دوّر الجذعَ دورةً واسعة والذراعُ تمتدّ عبر الجسم، ثمّ الجهةَ الأخرى.",
      "امشِ عشرةَ أمتار بخطواتٍ كبيرة وأرجحةٍ واسعة للذراعين، ثمّ اجلس وقم «بحركةٍ كبيرة».",
    ], [
      "Raise both arms high and out to the sides, with the fingers spread wide.",
      "A big step forward with the opposite arm reaching forward and up, then back.",
      "A big step to the side with both arms opening, then back.",
      "A big step back beside the chair — only if balance allows, as backward steps can cause falls (Keus 2014).",
      "Turn the trunk in a wide rotation with the arm reaching across the body, then the other side.",
      "Walk ten metres with big steps and a wide arm swing, then sit down and stand up 'big'.",
    ]],
    cues: [[
      "حركةٌ صغيرة مريحة ⟵ «كبيرة» حتى تبدو مبالغاً فيها في البداية.",
      "النظرُ إلى الأرض ⟵ إلى الحائط البعيد: «امدد يدك إلى الحائط».",
      "العدُّ في الرأس ⟵ العدُّ بصوتٍ عالٍ مع كلّ حركة.",
      "السرعةُ على حساب السعة ⟵ السعةُ أوّلاً ثمّ السرعة.",
    ], [
      "A small, comfortable movement → 'big', until it feels exaggerated at first.",
      "Looking at the floor → at the far wall: 'reach for the wall'.",
      "Counting silently → counting aloud with each movement.",
      "Speed at the cost of size → size first, then speed.",
    ]],
    easier: ["جالساً، أو يدٌ على الكرسيّ، والاتّجاهان الأماميّ والجانبيّ وحدهما.", "Seated, or with a hand on the chair, and the forward and side directions only."],
    harder: ["أسرع، ومع مهمّةٍ ثانية (العدُّ إلى الخلف)، أو بحمل غرض، أو في الخارج.", "Faster, with a second task (counting backwards), carrying an object, or outdoors."],
    stopIf: ["دوخةٌ عند الوقوف أو رفع الذراعين ⟵ اجلس وقِس الضغط؛ فقدُ التوازن في الخطوة إلى الخلف ⟵ اتركها؛ ألمٌ أو أيُّ علامةٍ من قائمة التوقّف (Keus 2014).", "Dizziness on standing or raising the arms → sit and measure blood pressure; loss of balance on the backward step → leave it out; pain or any sign on the stop list (Keus 2014)."],
    equipment: ["كرسيٌّ ثابت، ومكانٌ واسع.", "A steady chair, and an open space."],
    doseNote: ["٨–١٠ مرّات لكلّ اتّجاه × ١–٢ دورة، ١٥–٢٠ دقيقة في الجلسة ويومياً في البيت (اقتراحٌ لا جرعةٌ مجرَّبة)؛ والبرنامجُ المجرَّب ١٦ ساعة في أربعة أسابيع (Ebersbach 2010).", "8–10 repetitions per direction × 1–2 rounds, 15–20 minutes per session and daily at home (a proposal, not a tested dose); the tested programme is 16 hours over four weeks (Ebersbach 2010)."],
    images: [{ key: "pd-big-amplitude-movements-1", ar: "رسومٌ خطّية في زوجين: شخصٌ واقفٌ منكمشٌ صغيراً والقدمان متلاصقتان واليدان على وجهه، ثمّ واقفٌ منتصباً والقدمان متباعدتان والذراعان ممدودتان عالياً والأصابعُ مفتوحة؛ ثمّ الفرقُ نفسُه على كرسيّ: منحنٍ إلى الأمام، ثمّ جالسٌ مستقيماً والساقان متباعدتان والذراعان مفتوحتان", en: "Line drawings in two pairs: a person standing curled up small with feet together and hands at the face, then standing tall with feet wide apart, arms stretched high and fingers spread; then the same contrast on a chair: curled forward, then sitting tall with legs apart and arms opened wide", search: "big amplitude movement exercise Parkinson step reach" }],
  },
  {
    code: "pd-metronome-cued-walking", nameAr: "المشيُ على إيقاع الميترونوم", nameEn: "Walking to a metronome beat",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["الإشاراتُ الخارجية ترفع سرعةَ المشي ٠٫٠٧ م/ث بتوصيةٍ قويّة (Keus 2014) وبجودةٍ عالية (Osborne 2022)، والسمعيةُ أنفعُ من البصرية للإيقاع والسرعة (Spaulding 2013 · Ghai 2018)، والتدريبُ بها في البيت أنقص التجمّدَ ٥٫٥٪ عند من يتجمّد لكنّ الأثرَ خفت بعد ستّة أسابيع (Nieuwboer 2007) — فالإشارةُ تبقى معه دائماً، وتُختار له لا لغيره (Cosentino 2023).",
      "External cues raise walking speed by 0.07 m/s with a strong recommendation (Keus 2014) and high-quality evidence (Osborne 2022), auditory cues work better than visual ones for cadence and speed (Spaulding 2013 · Ghai 2018), and home cue training reduced freezing by 5.5% in freezers, but the effect faded by six weeks (Nieuwboer 2007) — so the cue stays with the person permanently, and it is chosen for the individual (Cosentino 2023)."],
    start: ["واقفاً في أوّل ممرٍّ طوله عشرة أمتار، والهاتفُ عليه تطبيقُ الميترونوم.", "Standing at the start of a ten-metre corridor, with a metronome app ready on the phone."],
    steps: [[
      "عُدّ خطواتِك في الدقيقة بسرعتك المريحة على عشرة أمتار، مرّتين.",
      "اضبط الإيقاعَ على ذلك العدد، وامشِ دقيقتين تضع قدمَك مع كلّ نقرة.",
      "في الخارج، لمن لا يتجمّد: ارفع الإيقاعَ حتى ١٠٪ فوق عدده.",
      "في البيت للثبات: أنزله حتى ١٥٪ تحت عدده، ولمن يتجمّد حتى ١٠٪ تحته (Keus 2014).",
      "أضِف الاستدارةَ والأبوابَ والوقوفَ على الإيقاع.",
      "أطفئ الإيقاعَ طولاً واحداً واحفظه بالعدّ في نفسك، ثمّ أعِده.",
    ], [
      "Count your steps per minute at your comfortable speed over ten metres, twice.",
      "Set the beat to that number, and walk for two minutes placing a foot on each click.",
      "Outdoors, for non-freezers: raise the beat up to 10% above that number.",
      "Indoors for stability: lower it up to 15% below that number, and for freezers up to 10% below (Keus 2014).",
      "Add turns, doorways and stops on the beat.",
      "Switch the beat off for one length and keep the rhythm by counting silently, then switch it back on.",
    ]],
    cues: [[
      "خطواتٌ قصيرة سريعة تسبق الإيقاع ⟵ «قدمٌ مع كلّ نقرة».",
      "مشطُ القدم أوّلاً ⟵ «خطوةٌ كبيرة، الكعبُ أوّلاً».",
      "إيقاعٌ أسرع لمن يتجمّد ⟵ أبطأ قليلاً من عدده، فالأسرعُ قد يُطلق التجمّد (Keus 2014).",
      "الإشارةُ تُترك بعد الكتلة ⟵ تبقى في الهاتف دائماً (Nieuwboer 2007).",
    ], [
      "Short quick steps running ahead of the beat → 'one foot with each click'.",
      "Landing on the forefoot → 'big step, heel first'.",
      "A faster beat for a freezer → slightly slower than their own rate, as a faster one can trigger freezing (Keus 2014).",
      "Dropping the cue after the block → keeping it on the phone permanently (Nieuwboer 2007).",
    ]],
    easier: ["مسافةٌ أقصر، ويدٌ ممسوكة، والإيقاعُ على عدده نفسه.", "A shorter distance, a held hand, and the beat at the person's own rate."],
    harder: ["في الخارج، وعلى أرضٍ غير مستوية، ومع حمل غرض أو مهمّةٍ ثانية، وفي الزحام.", "Outdoors, on uneven ground, carrying an object or with a second task, and in crowds."],
    stopIf: ["التجمّدُ يزيد مع الإيقاع ⟵ أنزل الإيقاعَ أو غيّر نوعَ الإشارة؛ دوخةٌ أو تعبٌ شديد ⟵ اجلس.", "Freezing increases with the beat → lower the beat or change the type of cue; dizziness or severe fatigue → sit down."],
    equipment: ["هاتفٌ بتطبيق ميترونوم أو موسيقاه الإيقاعية المفضّلة، وسمّاعةُ أذن؛ أو أحدُ الأهل يعدّ أو يصفّق (Keus 2014).", "A phone with a metronome app or the person's favourite rhythmic music, and an earphone; or a family member counting or clapping (Keus 2014)."],
    doseNote: ["٢٠–٣٠ دقيقة في الجلسة، وأدناه ثلاثةُ أسابيع × ثلاثاً × ٣٠ دقيقة (Keus 2014)، ثمّ يومياً في البيت بإشارةٍ دائمة (Nieuwboer 2007).", "20–30 minutes per session, with a minimum of three weeks × three times × 30 minutes (Keus 2014), then daily at home with a permanent cue (Nieuwboer 2007)."],
    images: [{ key: "pd-metronome-cued-walking-1", ar: "رسمٌ لرجلٍ مسنّ بقميصٍ أزرق وسمّاعةٍ على أذنه يمشي على ممرٍّ طولُه عشرةُ أمتار عليه آثارُ أقدام، وبجانبه شاشةُ هاتفٍ لتطبيق الإيقاع مضبوطٍ على «الميترونوم» تعرض الخطواتِ في الدقيقة (بالإنكليزية)", en: "Drawing of an older man in a blue shirt wearing a headphone, walking along a 10-metre walkway marked with footprints; beside it a phone screen of a cueing app set to 'Metronome', showing steps per minute (in English)", search: "metronome cueing gait Parkinson walking smartphone" }],
  },
  {
    code: "pd-freezing-release-strategies", nameAr: "بدءُ المشي والخروجُ من التجمّد", nameEn: "Starting to walk and getting out of a freeze",
    kind: "motor_control", region: "whole_body", sets: 3, reps: 5,
    purpose: ["التجمّدُ عند ٥٠٫٦٪ من المرضى — ٣٧٫٩٪ في المرض المبكّر و٦٤٫٦٪ في المتقدّم (Zhang 2021)؛ والتدريبُ المخصّص للتجمّد ينقصه (حجمُ أثرٍ −٠٫٢٤، و−٠٫٤٠ إن دُرّب في مواقفه) والتمرينُ العامّ لا ينقصه، ولا يبقى الأثرُ بعد التوقّف (Gilat 2021)؛ والإشارةُ تُختار لكلّ مريض (Cosentino 2023)، وللمرضى ٥٩ حيلةً اخترعوها في سبع فئات (Nonnekes 2019)؛ والإرشادُ يعدّد حيلَ البدء: الهزُّ يميناً ويساراً، أو الخطوةُ إلى الخلف ثمّ خطوةٌ كبيرة، أو أرجحةُ الذراع إلى الأمام (Keus 2014).",
      "Freezing affects 50.6% of patients — 37.9% in early and 64.6% in advanced disease (Zhang 2021); dedicated freezing training reduces it (effect size −0.24, and −0.40 when trained in its triggers) while generic exercise does not, and the effect is not retained after stopping (Gilat 2021); the cue is chosen for each patient (Cosentino 2023), patients have invented 59 strategies in seven categories (Nonnekes 2019), and the guideline lists ways to start: rocking left and right, a step backwards and then a big step, or swinging the arm forward (Keus 2014)."],
    start: ["عند موقفه هو الذي يتجمّد فيه (بابٌ، أو ممرٌّ ضيّق، أو بدءُ المشي)، وشرائطُ لاصقة على الأرض بطول خطوته.", "At the person's own trigger (a doorway, a narrow passage, or starting to walk), with tape strips on the floor at their step length."],
    steps: [[
      "قِف واستقم — لا تمِل إلى الأمام.",
      "اهتزّ بلطف يميناً ويساراً، تنقل الوزنَ من قدمٍ إلى قدم.",
      "خطوةٌ كبيرة فوق الشريط أو فوق قدم المرافق، أو خطوةٌ إلى الخلف أوّلاً ثمّ خطوةٌ كبيرة (Keus 2014).",
      "عُدّ «واحد–اثنان» بصوتٍ عالٍ، أو شغّل الإيقاع.",
      "أرجح الذراعَ إلى الأمام «مشيراً إلى الاتّجاه»، وانظر إلى هدفٍ بعد الباب (Keus 2014).",
      "درّب مواقفَه هو، في فترة عمل الدواء أوّلاً ثمّ في آخر الجرعة (Keus 2014).",
    ], [
      "Stop and stand tall — do not lean forward.",
      "Rock gently left and right, shifting the weight from foot to foot.",
      "A big step over the tape or over the companion's foot, or a step back first and then a big step (Keus 2014).",
      "Count 'one–two' aloud, or start the beat.",
      "Swing the arm forward, 'pointing the way', and look at a target beyond the doorway (Keus 2014).",
      "Practise the person's own triggers, first in the 'on' period, then at the end of a dose (Keus 2014).",
    ]],
    cues: [[
      "الميلُ إلى الأمام والدفعُ بالقوّة ⟵ «قِف – استقم – اهتزّ – خطوةٌ كبيرة».",
      "المرافقُ يشدّ المريضَ من ذراعه ⟵ «لا تشدّه، أعطه الإشارة».",
      "النظرُ إلى القدمين في الباب ⟵ إلى هدفٍ بعد الباب.",
      "خطواتٌ صغيرة متسارعة ⟵ توقّف، واستقم، وابدأ من جديد.",
    ], [
      "Leaning forward and forcing it → 'stop – stand tall – rock – big step'.",
      "The companion pulling the patient by the arm → 'don't pull, give the cue'.",
      "Looking at the feet in the doorway → at a target beyond the doorway.",
      "Small, hurrying steps → stop, stand tall, and start again.",
    ]],
    easier: ["سندٌ باليد، وخطوطٌ على الأرض، والإيقاع.", "Hand support, lines on the floor, and the beat."],
    harder: ["في فترة الانطفاء، وتحت ضغط الوقت، وبحمل غرض، ومع مهمّةٍ ثانية، وفي الزحام، واستدارةٌ بعد الباب مباشرةً.", "In the 'off' period, under time pressure, carrying an object, with a second task, in crowds, and a turn straight after the doorway."],
    stopIf: ["خطواتٌ صغيرة سريعة يندفع بها إلى الأمام أو سقوط ⟵ توقّف وأعِد الوقفة؛ دوخةٌ أو خوفٌ شديد ⟵ اجلس.", "Small rapid steps propelling the person forwards, or a fall → stop and reset the stance; dizziness or severe fear → sit down."],
    equipment: ["شريطٌ لاصق ملوّن للأرض، وتطبيقُ الإيقاع؛ والعصا المقلوبة هدفاً للخطو فوقها لا تُستعمل إلّا إن جرّبها الأخصائيّ آمنةً (Nonnekes 2019).", "Coloured floor tape and the beat app; an upside-down walking stick as a step-over target only if the specialist has tested it as safe (Nonnekes 2019)."],
    doseNote: ["٣–٥ من مواقفه × ٥ مرّاتٍ لكلٍّ في الجلسة (اقتراح)، وأدناه ثلاثةُ أسابيع × ثلاثاً × ٣٠ دقيقة وأطولُ في المرض المتقدّم (Keus 2014)، ثمّ يومياً في البيت مع المرافق (Gilat 2021).", "3–5 of the person's triggers × 5 repetitions each per session (a proposal), with a minimum of three weeks × three times × 30 minutes and longer in advanced disease (Keus 2014), then daily at home with the companion (Gilat 2021)."],
    images: [{ key: "pd-freezing-release-strategies-1", ar: "صورةٌ لممرٍّ في قاعة العلاج عليه خطوطٌ سوداء من الشريط اللاصق بعرض الأرض وبطول الخطوة تقود إلى بابٍ مفتوح", en: "Photo of a clinic walkway marked with black tape: strips across the floor at step length lead up to an open doorway", search: "freezing of gait strategies doorway step over tape Parkinson" }],
  },
  {
    code: "pd-arc-turning-narrow-spaces", nameAr: "الاستدارةُ بقوسٍ واسع وفي الأماكن الضيّقة", nameEn: "Turning in a wide arc and in narrow spaces",
    kind: "balance", region: "whole_body", perSide: true, sets: 3, reps: 5,
    purpose: ["التجمّدُ في ٣٧٫٥٪ من الاستدارات بنصف دورة مقابل لا شيءَ في المشي المستقيم، والدورةُ الكاملة مع مهمّةٍ ذهنية أشدُّ ما يُطلقه (Spildooren 2010)، و٨٦٪ ممّن يشكون صعوبةَ الاستدارة يتجمّدون كثيراً أو يسقطون (Stack 2006)؛ والإرشاد: الاستدارةُ بقوسٍ واسع لا على قدمٍ واحدة، في المكان المفتوح والضيّق، لمن يخشى السقوط (Keus 2014).",
      "Freezing occurs in 37.5% of half turns against none in straight walking, and a full turn with a mental task is its strongest trigger (Spildooren 2010), while 86% of those who report difficulty turning freeze often or fall (Stack 2006); the guideline: turn in a wide arc rather than pivoting on one foot, in open and narrow spaces, for those at risk of falling (Keus 2014)."],
    start: ["قمعٌ أو كرسيٌّ على بعد ثلاثة أمتار، وطاولةٌ إلى جانبه.", "A cone or a chair three metres away, with a counter to one side."],
    steps: [[
      "امشِ إلى القمع بخطواتٍ كبيرة.",
      "أبطئ قبل الاستدارة.",
      "در حول القمع بقوسٍ واسع على شكل حرف U، ولا تلتفّ على قدمٍ واحدة.",
      "في المكان الضيّق (الحمّام، والمطبخ، ومكانُ الصلاة): در بالخطو في المكان والركبتان عاليتان في دائرةٍ بطيئة، وعُدّ كلَّ خطوة (حيلةُ الإرشاد مكيّفةً للمكان الضيّق — اقتراح).",
      "نصفُ دورة ثمّ دورةٌ كاملة، إلى الجهتين.",
      "أضِف المهمّةَ الثانية في الآخر (Spildooren 2010).",
    ], [
      "Walk to the cone with big steps.",
      "Slow down before the turn.",
      "Walk around the cone in a wide U-shaped arc, never twisting on one foot.",
      "In a narrow space (the bathroom, the kitchen, the place of prayer): turn by marching on the spot with high knees in a slow circle, counting each step (the guideline strategy adapted for small spaces — a proposal).",
      "A half turn, then a full turn, to both sides.",
      "Add the second task last (Spildooren 2010).",
    ]],
    cues: [[
      "الالتفافُ على مشط قدمٍ واحدة ⟵ «استدارةٌ واسعة» بخطواتٍ متتابعة.",
      "الوقوفُ في منتصف الاستدارة ⟵ «استمرّ في الخطو».",
      "خطواتٌ تجرّ القدم ⟵ «ارفع الركبتين».",
      "الاستدارةُ والكلامُ معاً من البداية ⟵ الاستدارةُ وحدها أوّلاً، ثمّ المهمّةُ الثانية.",
    ], [
      "Pivoting on the ball of one foot → 'wide turn' with continuous steps.",
      "Stopping in the middle of the turn → 'keep stepping'.",
      "Shuffling steps → 'lift the knees'.",
      "Turning and talking together from the start → the turn alone first, then the second task.",
    ]],
    easier: ["سندٌ على الطاولة، وربعُ دورة، والإيقاع.", "Support on the counter, quarter turns, and the beat."],
    harder: ["دورةٌ كاملة، ومكانٌ ضيّق، وحملُ كوب، ومهمّةٌ ثانية، وفي فترة الانطفاء.", "A full turn, a narrow space, carrying a cup, a second task, and the 'off' period."],
    stopIf: ["تجمّدٌ مع ميلٍ إلى الأمام ⟵ توقّف وطبّق حيلةَ الخروج من التجمّد؛ فقدُ التوازن أو دوخة ⟵ اجلس.", "Freezing with a forward lean → stop and use the freeze-release strategy; loss of balance or dizziness → sit down."],
    equipment: ["قمعٌ أو كرسيّ، وقوسٌ مرسوم بشريطٍ على الأرض.", "A cone or a chair, and an arc marked with tape on the floor."],
    doseNote: ["٥ استداراتٍ لكلّ جهة × ٢–٣ دورات في الجلسة، ويومياً في البيت في أماكنه الضيّقة الحقيقية (اقتراحٌ ضمن أدنى جرعة الحيل — Keus 2014).", "5 turns to each side × 2–3 rounds per session, and daily at home in the person's real narrow spaces (a proposal within the minimum dose for strategies — Keus 2014)."],
    images: [{ key: "pd-arc-turning-narrow-spaces-1", ar: "ثلاثُ لوحات: قدمان تخطوان في استدارةٍ إلى اليمين متباعدتين (علامةُ صحّ خضراء)، وقدمان تتقاطعان في التفافٍ على المكان (علامةُ خطأ حمراء)، ورسمُ «الاستدارة بالساعة» لخطواتٍ صغيرة مزدوجة من ١٢ إلى ٣ إلى ٦ إلى ٩", en: "Three panels: feet stepping into a right turn kept apart (green tick); feet crossing over each other in a pivot (red cross); a 'clock turn' footprint diagram of small paired steps from 12 to 3 to 6 to 9", search: "wide arc turning strategy Parkinson footprints" }],
  },
  {
    code: "pd-chair-rise-sequence", nameAr: "القيامُ من الكرسيّ والجلوسُ عليه بالخطوات", nameEn: "Getting up from and sitting down on a chair in steps",
    kind: "functional", region: "whole_body", sets: 2, reps: 8, rest: 60,
    purpose: ["حيلُ الحركات المركّبة توصيةٌ قويّة لنقل الجلوس والقيام: تُقسَم الحركةُ أربعَ خطواتٍ إلى ستٍّ بكلماتٍ مفتاحية، ويُقال كلٌّ بصوتٍ عالٍ ويُتخيَّل ثمّ يُؤدّى بانتباه، والتدريبُ في البيت أنفعُ (٢٢٪ مقابل ٩٪ في العيادة) ويبقى نصفُ الأثر بعد ثلاثة أشهر (Keus 2014)؛ والنقلُ سببُ ٢١٪ من السقطات (Ashburn 2008)، والجلوسُ والقيامُ خمساً في أكثرَ من ١٦ ثانية علامةُ من يسقط (Duncan 2011).",
      "Strategies for complex movements are a strong recommendation for chair transfers: the movement is split into four to six steps with key words, each said aloud and imagined, then performed with attention; practice at home works better (22% against 9% in the clinic), and half the effect remains at three months (Keus 2014); transfers cause 21% of falls (Ashburn 2008), and five sit-to-stands taking more than 16 seconds mark a faller (Duncan 2011)."],
    start: ["جالساً على كرسيٍّ ثابت بمسندين.", "Sitting on a steady chair with armrests."],
    steps: [[
      "«تقدّم»: انزلق إلى مقدّم المقعد.",
      "«القدمان إلى الخلف»: خلفَ الركبتين وبعرض الوركين.",
      "«اهتزّ»: حرّك الجذعَ إلى الأمام والخلف مرّتين أو ثلاثاً (Keus 2014).",
      "«الأنفُ فوق الأصابع»: اليدان على المسندين، «واحد–اثنان–ثلاثة»، وادفع إلى الأعلى بقوّة.",
      "«قِف مستقيماً وانتظر» ٣٠–٦٠ ثانية ويدُك على الكرسيّ (Fanciulli 2020b).",
      "للجلوس: در بقوسٍ صغير حتى تلمس ساقاك الكرسيّ، وامدد يديك إلى المسندين، وانحنِ إلى الأمام، وانزل ببطء.",
    ], [
      "'Slide': move to the front of the seat.",
      "'Feet back': behind the knees and hip-width apart.",
      "'Rock': move the trunk forward and back two or three times (Keus 2014).",
      "'Nose over toes': hands on the armrests, 'one–two–three', and push up strongly.",
      "'Stand tall and wait' 30–60 seconds with a hand on the chair (Fanciulli 2020b).",
      "To sit: turn in a small arc until the legs touch the chair, reach back for both armrests, bend forward, and lower slowly.",
    ]],
    cues: [[
      "القيامُ دفعةً واحدة من عمق المقعد ⟵ «تقدّم – القدمان إلى الخلف – اهتزّ – الأنفُ فوق الأصابع».",
      "السقوطُ إلى الخلف في الكرسيّ ⟵ الجذعُ إلى الأمام أكثر قبل الدفع.",
      "المشيُ فورَ الوقوف ⟵ «قِف وانتظر» حتى يستقرّ الضغط.",
      "الكلماتُ في الرأس ⟵ بصوتٍ عالٍ، وتخيُّلُ الحركة قبل كلّ مرّة (Keus 2014).",
    ], [
      "Rising in one go from the back of the seat → 'slide – feet back – rock – nose over toes'.",
      "Falling back into the chair → the trunk further forward before pushing.",
      "Walking straight after standing → 'stand and wait' until the blood pressure settles.",
      "The words said silently → aloud, picturing the movement before each attempt (Keus 2014).",
    ]],
    easier: ["مقعدٌ أعلى، ومسندان، وإشارةٌ من المرافق.", "A higher seat, armrests, and a cue from the companion."],
    harder: ["مقعدٌ أخفض، وبلا مسندين، وحملُ غرض، ومهمّةٌ ثانية، وفي فترة الانطفاء.", "A lower seat, no armrests, holding an object, a second task, and the 'off' period."],
    stopIf: ["دوخةٌ عند الوقوف ⟵ اجلس وقِس الضغط؛ السقوطُ إلى الخلف في الكرسيّ مرّةً بعد مرّة ⟵ مقعدٌ أعلى وأخبر الأخصائيّ.", "Dizziness on standing → sit and measure blood pressure; falling back into the chair again and again → a higher seat, and tell the specialist."],
    equipment: ["كرسيٌّ ثابت بمسندين.", "A steady chair with armrests."],
    doseNote: ["٥–١٠ مرّات × دورتان في الجلسة، ومرّتين أو ثلاثاً في اليوم في البيت (اقتراح)؛ وأدنى جرعة الحيل ثلاثةُ أسابيع × ثلاثاً × ٣٠ دقيقة (Keus 2014).", "5–10 repetitions × two rounds per session, and two or three times a day at home (a proposal); the minimum dose for strategies is three weeks × three times × 30 minutes (Keus 2014)."],
    images: [{ key: "pd-chair-rise-sequence-1", ar: "أربعةُ رسومٍ لامرأةٍ على كرسيٍّ بمسندين وأمامها مشّاية: جالسةٌ إلى الخلف، ثمّ انزلقت إلى مقدّم المقعد والقدمان إلى الخلف، ثمّ تميل «الأنفُ فوق الأصابع» دافعةً بيديها على المسندين، ثمّ واقفةٌ مستقيمةً تمسك المشّاية", en: "Four drawings of a woman on an armchair with a walking frame in front of her: sitting back; slid to the front of the seat with the feet drawn back; leaning forward 'nose over toes' pushing on the armrests; standing tall holding the frame", search: "sit to stand strategy Parkinson nose over toes steps" }],
  },
  {
    code: "pd-bed-turning-sequence", nameAr: "التقلّبُ في السرير والنهوضُ منه بالخطوات", nameEn: "Turning over in bed and getting out of bed in steps",
    kind: "functional", region: "whole_body", perSide: true, sets: 1, reps: 5,
    purpose: ["التقلّبُ والدخولُ إلى السرير والخروجُ منه من أهداف الإرشاد، بحيلة «هزّ الركبتين المثنيّتين» قبل التقلّب والتقسيمِ إلى خطواتٍ تُقال بصوتٍ عالٍ (Keus 2014)؛ و٨٠٪ من السقطات في البيت ومنها غرفُ النوم (Ashburn 2008)، والجلوسُ قليلاً قبل الوقوف يقي هبوطَ الضغط الانتصابيّ (Gibbons 2017).",
      "Rolling over and getting into and out of bed are guideline targets, using the 'rock the bent knees' strategy before rolling and splitting the task into steps said aloud (Keus 2014); 80% of falls happen at home, including bedrooms (Ashburn 2008), and sitting for a moment before standing guards against low blood pressure on standing (Gibbons 2017)."],
    start: ["مستلقياً على الظهر على سريرٍ بارتفاع سرير البيت.", "Lying on the back on a plinth at home-bed height."],
    steps: [[
      "اثنِ الركبتين والقدمان على السرير.",
      "هزّ الركبتين المثنيّتين يميناً ويساراً مرّتين أو ثلاثاً (Keus 2014).",
      "أدر رأسك، ومدّ الذراعَ العليا مدّاً واسعاً عبر الجسم، ودع الركبتين تسقطان، وتقلّب على جنبك.",
      "أنزل الساقين عن الحافّة، وادفع بالمرفق ثمّ بالكفّ حتى تجلس.",
      "اجلس دقيقةً إلى دقيقتين وحرّك الكاحلين قبل الوقوف (اقتراح — Gibbons 2017).",
      "قِف بسند، وانتظر قبل أن تمشي.",
    ], [
      "Bend both knees with the feet on the bed.",
      "Rock the bent knees left and right two or three times (Keus 2014).",
      "Turn your head, reach the top arm widely across the body, let the knees fall, and roll onto your side.",
      "Lower the legs over the edge, and push up through the elbow and then the hand to sitting.",
      "Sit for one to two minutes and move the ankles before standing (a proposal — Gibbons 2017).",
      "Stand with support, and wait before walking.",
    ]],
    cues: [[
      "التقلّبُ بشدّ الملاءة أو بالرقبة ⟵ «الركبتان – اهتزّ – امدد – تقلّب».",
      "حركةٌ صغيرة للذراع ⟵ مدٌّ واسع عبر الجسم.",
      "القيامُ فورَ الجلوس ⟵ دقيقةٌ جالساً وحركةُ الكاحلين.",
      "الكلماتُ في الرأس ⟵ بصوتٍ عالٍ مع تخيّل الحركة.",
    ], [
      "Rolling by pulling on the sheet or leading with the neck → 'knees – rock – reach – roll'.",
      "A small arm movement → a wide reach across the body.",
      "Standing straight after sitting up → a minute seated with ankle movements.",
      "The words said silently → aloud, picturing the movement.",
    ]],
    easier: ["حاجزُ السرير أو يدُ المرافق على الورك، ونصفُ تقلّب.", "A bed rail or the companion's hand on the hip, and a half roll."],
    harder: ["إلى الجهة الأكثر تيبّساً، وفي فترة الانطفاء صباحاً.", "Towards the stiffer side, and in the morning 'off' period."],
    stopIf: ["دوخةٌ عند الجلوس ⟵ عُد إلى الاستلقاء؛ ألمٌ ⟵ أخبر الأخصائيّ.", "Dizziness on sitting up → lie back down; pain → tell the specialist."],
    equipment: ["سريرُ العلاج، وسريرُ المريض نفسُه، وحاجزُ سريرٍ إن وُجد.", "The treatment plinth, the person's own bed, and a bed rail if available."],
    doseNote: ["٥ تقلّباتٍ لكلّ جهة وثلاثُ مرّاتٍ للجلوس في الجلسة، وكلَّ مساءٍ وعند الاستيقاظ في البيت (اقتراحٌ ضمن أدنى جرعة الحيل — Keus 2014).", "5 rolls to each side and three sit-ups per session, and every evening and on waking at home (a proposal within the minimum dose for strategies — Keus 2014)."],
    images: [{ key: "pd-bed-turning-sequence-1", ar: "رسمان من الأعلى لامرأةٍ مستلقيةٍ على ظهرها في السرير ورأسُها على وسادة، والركبتان مثنيّتان والقدمان على الفراش، تُميل ركبتيها معاً إلى جهةٍ ثمّ إلى الأخرى (سهمان أزرقان)", en: "Two top-view drawings of a woman lying on her back in bed on a pillow, knees bent and feet flat, rolling both knees together to one side and then the other (blue arrows)", search: "bed mobility rolling strategy Parkinson knees rock" }],
  },
  {
    code: "pd-orthostatic-safe-rising", nameAr: "الوقوفُ الآمن مع هبوط الضغط عند الوقوف", nameEn: "Standing up safely with low blood pressure on standing",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["هبوطُ الضغط الانتصابيّ عند ٣٠٫١٪ من المرضى (Velseboer 2011)، و٣٥٫٨٪ بالقياس من الاستلقاء ويرافق قلّةَ شرب الماء، والقياسُ من الجلوس لا يكشف إلّا ٣٩٪ منه (Lim 2024)؛ و٢٩٪ ممّن سقطوا سقطوا بإغماء (Fanciulli 2020b)؛ والوسائلُ بلا دواء أوّلاً: الماءُ والحزامُ والوقوفُ على مراحل (Gibbons 2017 · Fanciulli 2020a).",
      "Low blood pressure on standing affects 30.1% of patients (Velseboer 2011), 35.8% when tested from lying, and goes with low fluid intake, while testing from sitting finds only 39% of it (Lim 2024); 29% of the patients who fell did so by fainting (Fanciulli 2020b); non-drug measures come first: water, a binder and rising in stages (Gibbons 2017 · Fanciulli 2020a)."],
    start: ["مستلقياً، وجهازُ الضغط جاهز.", "Lying down, with the blood-pressure monitor ready."],
    steps: [[
      "اشرب نحو ٥٠٠ مل من الماء في خمس دقائق — يرفع الضغطَ الانقباضيّ نحو ٣٠ ملم زئبق نحو ساعة (Gibbons 2017) — إلّا إن قيّد الطبيبُ السوائل.",
      "البس الحزامَ البطنيّ أو الجوربَ الضاغط حتى الخصر إن وصفه الطبيب (Gibbons 2017 · Fanciulli 2016).",
      "حرّك الكاحلين عشرَ مرّات واثنِ الركبتين وأنت مستلقٍ.",
      "اجلس على حافّة السرير دقيقةً إلى دقيقتين.",
      "قِف ممسكاً بسند، ساكناً ٣٠–٦٠ ثانية (Fanciulli 2020b).",
      "إن ظهر دوارٌ أو غباشٌ في النظر أو ألمٌ في الرقبة والكتفين كعلّاقة الثياب عند الوقوف (Fanciulli 2020a) ⟵ اجلس أو استلقِ فوراً وارفع الساقين.",
    ], [
      "Drink about 500 mL of water within five minutes — it raises systolic pressure by about 30 mmHg for about an hour (Gibbons 2017) — unless the doctor has restricted fluids.",
      "Put on the abdominal binder or the waist-high compression garment if the doctor prescribed it (Gibbons 2017 · Fanciulli 2016).",
      "Pump the ankles ten times and bend the knees while lying down.",
      "Sit on the edge of the bed for one to two minutes.",
      "Stand holding a support, still, for 30–60 seconds (Fanciulli 2020b).",
      "If light-headedness, blurred vision or coat-hanger pain in the neck and shoulders appears on standing (Fanciulli 2020a) → sit or lie down at once and raise the legs.",
    ]],
    cues: [[
      "النهوضُ دفعةً واحدة من الاستلقاء ⟵ «اشرب – الحزام – حرّك – اجلس – قِف – انتظر».",
      "المشيُ فورَ الوقوف ⟵ انتظارٌ ساكن ٣٠–٦٠ ثانية.",
      "الجوربُ إلى الركبة ⟵ حتى الخصر أو الحزامُ البطنيّ، فالذي إلى الركبة لا ينفع ولا يُحتمل في الحرّ (Gibbons 2017).",
      "الصبرُ على الدوار واقفاً ⟵ الجلوسُ فوراً.",
    ], [
      "Getting up in one go from lying → 'drink – binder – pump – sit – stand – wait'.",
      "Walking straight after standing → a still wait of 30–60 seconds.",
      "Knee-high stockings → waist-high or the abdominal binder, as knee-high ones do not work and are not tolerated in the heat (Gibbons 2017).",
      "Putting up with dizziness while standing → sitting at once.",
    ]],
    easier: ["المرافقُ بجانبه، ورأسُ السرير مرفوعٌ ١٥–٢٣ سم في الليل (Gibbons 2017).", "The companion at the side, and the head of the bed raised 15–23 cm at night (Gibbons 2017)."],
    harder: ["توقّفاتٌ أقصر حين يستقرّ الضغط.", "Shorter pauses once the blood pressure is stable."],
    stopIf: ["إغماءٌ أو ما يقاربه ⟵ استلقِ وارفع الساقين وأخبر الطبيب؛ هبوطٌ ٢٠/١٠ ملم زئبق فأكثر خلال ثلاث دقائق من الوقوف ⟵ إلى الطبيب لمراجعة الأدوية (Gibbons 2017 · NICE NG71 2017).", "Fainting or near-fainting → lie down, raise the legs and tell the doctor; a fall of 20/10 mmHg or more within three minutes of standing → to the doctor for a medicine review (Gibbons 2017 · NICE NG71 2017)."],
    equipment: ["ماء، وجهازُ ضغط، وحزامٌ بطنيّ أو جوربٌ ضاغط (من الطبيب).", "Water, a blood-pressure monitor, and an abdominal binder or compression garment (through the doctor)."],
    doseNote: ["كلَّما قام من الاستلقاء؛ والقياسُ من الاستلقاء إلى الوقوف في البداية وكلَّما دار رأسُه (Lim 2024)، ولا تمرينَ في الحرّ ولا خلال ساعتين من وجبةٍ كبيرة لمن له أعراض (Gibbons 2017).", "Every time the person gets up from lying; the lying-to-standing test at baseline and whenever dizzy (Lim 2024), with no exercise in the heat or within two hours of a large meal for those with symptoms (Gibbons 2017)."],
    images: [{ key: "pd-orthostatic-safe-rising-1", ar: "رموزٌ سوداء متتالية بأسهم: كأسُ ماء؛ ثمّ شخصٌ جالسٌ على كرسيّ يشدّ قبضتَه ويضغط ساقيه؛ ثمّ الشخصُ نفسُه جالساً ينتظر وبجانبه ساعة؛ ثمّ واقفاً", en: "Black pictograms joined by arrows: a glass of water; a person seated on a chair clenching a fist and squeezing the legs; the same person sitting and waiting beside a clock; then standing", search: "orthostatic hypotension standing up safely water bolus abdominal binder" }],
  },
  {
    code: "pd-prayer-with-parkinsons", nameAr: "الصلاةُ الآمنة مع باركنسون", nameEn: "Praying safely with Parkinson's",
    kind: "functional", region: "whole_body", sets: 1, reps: 3,
    purpose: ["لا دراسةَ للصلاة في هذا المرض (بحثٌ صفريّ): من يصلّون أحسنُ توازناً في الوقوف المتحرّك (Alabdulwahab 2013)، والركوعُ والركبتان مثنيّتان قليلاً يخفّف حملَ أسفل الظهر (AbouHassan 2010)، والضغطُ ينخفض بعد دقيقة من السجود (Ahmad Rufa'i 2013) فالقيامُ منه قد يُطلق هبوطَ الضغط والسقوط، والتجمّدُ يكثر عند الاستدارة (Spildooren 2010)، والكرسيُّ سنواتٍ ليس محايداً — تبعه تراجعُ الوظيفة في خشونة الركبة (Ateef 2021). والحكمُ الشرعيّ للمريض ومرجعه.",
      "There is no study of prayer in this disease (a documented zero result): people who pray have better dynamic standing balance (Alabdulwahab 2013), bowing with slightly bent knees lowers the load on the lower back (AbouHassan 2010), blood pressure falls after a minute in prostration (Ahmad Rufa'i 2013), so rising from it may trigger low blood pressure and a fall, freezing is common on turning (Spildooren 2010), and years on a chair are not neutral — declining function followed in knee osteoarthritis (Ateef 2021). The religious ruling is for the person and their scholar."],
    start: ["واقفاً على السجّادة، وكرسيٌّ أو حائطٌ في متناول اليد.", "Standing on the prayer mat, with a chair or a wall within reach."],
    steps: [[
      "صلِّ في فترة عمل الدواء ما أمكن، ومواعيدُ الليفودوبا تُرتَّب مع طبيب الأعصاب (اقتراحٌ من Keus 2014).",
      "امشِ إلى السجّادة بخطواتٍ كبيرة، واستدر إلى القبلة بقوسٍ واسع (Keus 2014).",
      "القيام: القدمان بعرض الوركين، والجسمُ مستقيم.",
      "الركوع: الركبتان مثنيّتان قليلاً واليدان على الركبتين (AbouHassan 2010).",
      "السجود: انزل بالركوع على الركبتين ويدٌ على الكرسيّ؛ وقُم على مراحل — اجلس على العقبين، ثمّ على الركبتين، ثمّ ركبةً واحدة، ثمّ قِف بالكرسيّ وانتظر ٣٠–٦٠ ثانية قبل المشي (Ahmad Rufa'i 2013 · Fanciulli 2020b، والتسلسلُ اقتراح).",
      "التسليم: أدر الرأسَ ببطء، واجلس لحظةً قبل أن تقوم.",
    ], [
      "Pray in the 'on' period where possible, with levodopa times arranged with the neurologist (a proposal from Keus 2014).",
      "Walk to the mat with big steps, and turn to the qibla in a wide arc (Keus 2014).",
      "Standing: feet hip-width apart and the body tall.",
      "Bowing: the knees slightly bent and the hands on the knees (AbouHassan 2010).",
      "Prostration: go down through kneeling with a hand on the chair; rise in stages — sit back on the heels, then kneel up, then half-kneel, then stand with the chair and wait 30–60 seconds before walking (Ahmad Rufa'i 2013 · Fanciulli 2020b; the sequence is a proposal).",
      "Closing: turn the head slowly, and sit for a moment before rising.",
    ]],
    cues: [[
      "الاستدارةُ إلى القبلة على قدمٍ واحدة ⟵ قوسٌ واسع بخطوات.",
      "القيامُ من السجود دفعةً واحدة ⟵ على مراحل، ثمّ انتظار.",
      "الركوعُ والركبتان مشدودتان ⟵ مثنيّتان قليلاً.",
      "الكرسيُّ لكلّ صلاةٍ دائماً ⟵ في فترة الانطفاء أو مع هبوط الضغط أو في المرحلة المتأخّرة (Ateef 2021).",
      "المعالجُ يفتي ⟵ الحكمُ للمريض ومرجعه.",
    ], [
      "Turning to the qibla on one foot → a wide arc with steps.",
      "Rising from prostration in one go → in stages, then a wait.",
      "Bowing with the knees locked → slightly bent.",
      "A chair for every prayer, always → in the 'off' period, with low blood pressure on standing, or in the late stage (Ateef 2021).",
      "The therapist giving rulings → the ruling is the person's and their scholar's.",
    ]],
    easier: ["الصلاةُ على الكرسيّ في فترة الانطفاء، أو مع هبوط الضغط، أو في المرحلة المتأخّرة (اقتراح).", "Prayer on the chair in the 'off' period, with low blood pressure on standing, or in the late stage (a proposal)."],
    harder: ["بلا سندٍ باليد.", "Without hand support."],
    stopIf: ["دوخةٌ في السجود أو عند القيام منه ⟵ اجلس، والكرسيُّ في الصلاة التالية، وأخبر الأخصائيّ؛ تجمّدٌ عند السجّادة ⟵ حيلةُ الخروج من التجمّد؛ سقوطٌ ⟵ يُسجَّل ويُراجَع.", "Dizziness in prostration or on rising from it → sit, use the chair at the next prayer, and tell the specialist; freezing at the mat → the freeze-release strategy; a fall → recorded and reviewed."],
    equipment: ["سجّادةُ صلاة غيرُ زلقة، وكرسيٌّ ثابت.", "A non-slip prayer mat, and a steady chair."],
    doseNote: ["٣–٥ ركعاتٍ للتدريب في جلسات المرحلة الثالثة (اقتراح)، ثمّ الصلواتُ اليومية هي تمرينُ البيت.", "3–5 practice prayer units in phase-3 sessions (a proposal), then the daily prayers are the home practice."],
    images: [{ key: "pd-prayer-with-parkinsons-1", ar: "خمسُ لوحاتٍ بأسهم: رسمٌ لرجلٍ ساجدٍ على سجّادةٍ خضراء، ثمّ جالساً على عقبيه، ثمّ صورةُ رجلٍ على ركبةٍ واحدة يمسك كرسيّاً بيديه، ثمّ يدفع على مقعد الكرسيّ ليقوم، ثمّ رسمٌ لرجلٍ واقفٍ على السجّادة", en: "Five panels joined by arrows: a drawn man in prostration on a green prayer mat; the same man sitting back on his heels; a photo of a man half-kneeling holding a chair with both hands; the man pushing up on the chair seat to stand; a drawn man standing on the mat", search: "rising from prostration prayer chair support elderly" }],
  },
  {
    code: "pd-fast-cadence-cycling", nameAr: "الدرّاجةُ بإيقاع دوسٍ سريع", nameEn: "Fast-pedalling cycling",
    kind: "aerobic", region: "whole_body", sets: 1, reps: 1,
    purpose: ["الدوسُ «القسريّ» أسرعَ ٣٠٪ من الإيقاع المفضّل بشدّة ٦٠–٨٠٪ من نبض التدريب ثمانيةَ أسابيع أنقص الفحصَ الحركيّ ٣٥٪، والدوسُ بالإيقاع المفضّل لم ينقصه (Ridgel 2009 — عشرةُ مرضى على درّاجةٍ ثنائية مع مدرّب)؛ والدرّاجةُ في البيت ٣٠–٤٥ دقيقة ثلاثاً في الأسبوع ستّةَ أشهر أنقصته ٤٫٢ نقطة (van der Kolk 2019)؛ والهوائيُّ متوسّطُ الشدّة إلى عاليها ثلاثةَ أيّامٍ في الأسبوع ٣٠–٤٠ دقيقة توصيةٌ قويّة (Osborne 2022)؛ والدرّاجةُ المستلقية لمن عنده هبوطُ الضغط (Gibbons 2017). والدوسُ السريع بإرادة المريض وحدها لم يُجرَّب.",
      "'Forced' pedalling 30% faster than the preferred cadence at 60–80% of training heart rate for eight weeks reduced the motor examination by 35%, while pedalling at the preferred cadence did not (Ridgel 2009 — ten patients on a tandem bike with a trainer); home cycling for 30–45 minutes three times a week for six months reduced it by 4.2 points (van der Kolk 2019); moderate-to-high-intensity aerobic exercise on three days a week for 30–40 minutes is a strong recommendation (Osborne 2022); and a recumbent bike suits those with low blood pressure on standing (Gibbons 2017). Voluntary fast pedalling by the patient alone is untested."],
    start: ["جالساً على درّاجةٍ ثابتة أو مستلقية.", "Seated on a stationary or recumbent bike."],
    steps: [[
      "إحماءٌ خمسَ دقائق بإيقاعه المريح، واكتب عددَ الدورات في الدقيقة.",
      "اضبط مقاومةً خفيفة.",
      "دُس أسرعَ بنحو ٣٠٪ من ذلك العدد — مثلاً من ٦٠ إلى ٨٠ (Ridgel 2009).",
      "حافظ على ٦٠–٨٠٪ من النبض أو ١٣–١٥ بمقياس بورغ (Ridgel 2009 · Keus 2014).",
      "باستمرارٍ لا بفترات (Uc 2014).",
      "تهدئةٌ خمسَ دقائق، ثمّ اجلس دقيقةً إلى دقيقتين قبل أن تنزل.",
    ], [
      "Warm up for five minutes at the person's comfortable cadence, and write down the revolutions per minute.",
      "Set a light resistance.",
      "Pedal about 30% faster than that number — for example from 60 to 80 (Ridgel 2009).",
      "Keep 60–80% of heart rate or 13–15 on the Borg scale (Ridgel 2009 · Keus 2014).",
      "Continuously, not in intervals (Uc 2014).",
      "Cool down for five minutes, then sit for one to two minutes before getting off.",
    ]],
    cues: [[
      "مقاومةٌ ثقيلة بدوسٍ بطيء ⟵ «ساقان سريعتان وحملٌ خفيف».",
      "قياسُ الشدّة بالنبض وحده ⟵ ببورغ أيضاً، فارتفاعُ النبض ضعيفٌ عند نصف المرضى (Speelman 2012).",
      "النزولُ فورَ التوقّف ⟵ جلوسٌ قليل ثمّ النزولُ بسند.",
      "فتراتٌ عالية متقطّعة ⟵ دوسٌ مستمرّ (Uc 2014).",
    ], [
      "Heavy resistance with slow pedalling → 'fast legs, light load'.",
      "Judging intensity by heart rate alone → by Borg too, as the heart-rate rise is blunted in half of patients (Speelman 2012).",
      "Getting off as soon as the pedalling stops → a short sit, then getting off with support.",
      "High-intensity intervals → continuous pedalling (Uc 2014).",
    ]],
    easier: ["٣ × ١٠ دقائق بإيقاعه المريح.", "3 × 10 minutes at the person's comfortable cadence."],
    harder: ["٤٥ دقيقة، ومقاومةٌ أكثر بالإيقاع نفسه.", "45 minutes, and more resistance at the same cadence."],
    stopIf: ["أيُّ علامةٍ من قائمة التوقّف — ألمُ الصدر، أو ضيقُ النفَس الشديد، أو الدوخة، أو هبوطُ الانقباضيّ أكثرَ من ١٠ ملم زئبق أثناء التمرين (Keus 2014)؛ دوخةٌ عند النزول ⟵ اجلس.", "Any sign on the stop list — chest pain, severe breathlessness, dizziness, or a fall in systolic pressure of more than 10 mmHg during exercise (Keus 2014); dizziness on getting off → sit down."],
    equipment: ["درّاجةٌ بعدّاد الدورات في الدقيقة؛ والمستلقيةُ لمن عنده هبوطُ الضغط.", "A bike with a revolutions-per-minute display; a recumbent one for those with low blood pressure on standing."],
    doseNote: ["٣٠–٤٥ دقيقة × ثلاثاً في الأسبوع (van der Kolk 2019 · Osborne 2022)، ثمانيةَ أسابيع فأكثر (Ridgel 2009)؛ والتجربةُ الإيجابية بدرّاجةٍ مساعِدة لا بالإرادة وحدها.", "30–45 minutes × three times a week (van der Kolk 2019 · Osborne 2022), for eight weeks or more (Ridgel 2009); the positive trial used an assisted bike, not voluntary effort alone."],
    images: [{ key: "pd-fast-cadence-cycling-1", ar: "صورةُ امرأةٍ مسنّة بشعرٍ رماديّ ونظّارة، بقميصٍ أبيض وبنطالٍ إلى منتصف الساق، تدوس على درّاجةٍ ثابتةٍ مستلقية في البيت ويداها على المقبضين (والعدّادُ لا يظهر)", en: "Photo of an older woman with grey hair and glasses, in a white T-shirt and calf-length trousers, pedalling a recumbent exercise bike indoors with her hands on the handlebars (the console reading is not visible)", search: "recumbent bike fast cadence older adult Parkinson cycling" }],
  },
  {
    code: "pd-home-dexterity-tasks", nameAr: "مهارةُ الأصابع والكتابة في البيت", nameEn: "Home finger-dexterity and writing practice",
    kind: "motor_control", region: "wrist_hand", sets: 1, reps: 10,
    purpose: ["برنامجُ مهارة الأصابع في البيت حسّن اختبارَ الأوتاد التسعة والمهامَّ اليومية التي تحتاج المهارة، ولم يبقَ أثرُه إلى الأسبوع الثاني عشر (Vanbellingen 2017)، وأثرُ تمارين اليد على المهارة صغير (حجمُ أثرٍ ٠٫٢٦ — Proud 2024)، وجلسةُ العلاج الوظيفيّ في البرنامج المكثّف شملت المهارةَ والكتابة (Ferrazzoli 2018)؛ والإشارةُ البصرية — السطور — تعين على حجم الحركة (Keus 2014).",
      "A home finger-dexterity programme improved the Nine-Hole Peg Test and the daily tasks that need dexterity, but the gain did not last to week 12 (Vanbellingen 2017), the effect of hand exercise on dexterity is small (effect size 0.26 — Proud 2024), and the occupational-therapy session in the intensive programme included dexterity and writing (Ferrazzoli 2018); a visual cue — ruled lines — helps movement size (Keus 2014)."],
    start: ["جالساً إلى طاولة، والساعدان مسنودان.", "Sitting at a table, with the forearms supported."],
    steps: [[
      "انقر كلَّ إصبعٍ على الإبهام نقراً كبيراً سريعاً، باليدين.",
      "التقط حبّاتِ الحمّص أو قطعَ النقود إلى كوب، واقلب قطعةَ نقودٍ بين الأصابع.",
      "اربط أزرارَ قميصٍ للتدريب وفكّها.",
      "اكتب سطراً بحروفٍ كبيرة بين خطَّي الورقة، وحافظ على حجمها إلى آخر السطر (اقتراحٌ من الإشارة البصرية — Keus 2014).",
      "مهامٌّ باليدين: افتح برطماناً وأغلقه، واطوِ قطعةَ قماش.",
      "عُدّ حبّاتِ المسبحة بالإبهام (اقتراحٌ محلّيّ).",
    ], [
      "Tap each finger on the thumb, big and quick, with both hands.",
      "Pick chickpeas or coins into a cup, and flip a coin between the fingers.",
      "Do up and undo the buttons of a practice shirt.",
      "Write a line in large letters between two ruled lines, keeping the size to the end of the line (a proposal from visual cueing — Keus 2014).",
      "Two-handed tasks: open and close a jar, and fold a cloth.",
      "Count the beads of a prayer string (misbaha) with the thumb (a local proposal).",
    ]],
    cues: [[
      "نقرٌ صغير بطيء ⟵ «كبيرٌ وسريع».",
      "الحروفُ تصغر في آخر السطر ⟵ «أبقِ الحروفَ كبيرة» بين الخطّين.",
      "يدٌ واحدة دائماً ⟵ اليدان، والأضعفُ أوّلاً.",
      "التمرينُ يُترك بعد الكتلة ⟵ يستمرّ، فالأثرُ يخفت (Vanbellingen 2017).",
    ], [
      "Small, slow taps → 'big and quick'.",
      "The letters shrinking towards the end of the line → 'keep the letters big' between the lines.",
      "Always one hand → both hands, the weaker first.",
      "Stopping after the block → carrying on, as the effect fades (Vanbellingen 2017).",
    ]],
    easier: ["أغراضٌ أكبر، وعددٌ أقلّ.", "Larger objects, and fewer of them."],
    harder: ["أغراضٌ أصغر، وبالوقت، ومع الكلام.", "Smaller objects, timed, and while talking."],
    stopIf: ["ألمٌ أو تشنّجٌ في اليد ⟵ استرح وخفّف؛ ولا مشروباتٍ ساخنة أثناء التدريب.", "Hand pain or cramp → rest and do less; and no hot drinks during practice."],
    equipment: ["قطعُ نقودٍ أو حبوب، وكوب، وقميصٌ بأزرار، وورقٌ مسطّر، وبرطمان، ومسبحة.", "Coins or beans, a cup, a shirt with buttons, ruled paper, a jar, and a prayer string."],
    doseNote: ["٣٠ دقيقة × خمسةَ أيّامٍ في الأسبوع × أربعةَ أسابيع، ثمّ يستمرّ لأنّ المكسبَ يخفت (Vanbellingen 2017).", "30 minutes × five days a week × four weeks, then continued, because the gain fades (Vanbellingen 2017)."],
    images: [{ key: "pd-home-dexterity-tasks-1", ar: "ثلاثُ صور: يدُ امرأةٍ مسنّة تُسقط مشبكَ ورقٍ في كوبٍ بلاستيكيّ على طاولة، ثمّ أصابعُها تقلب صفّاً من أقراص اللعب واحداً بعد واحد، ثمّ يدان تزرّران قميصاً عن قرب", en: "Three photos: an older woman's hand dropping a paper clip into a plastic cup on a table; her fingers flipping a row of draughts chips one by one; a close-up of two hands doing up a shirt button", search: "hand dexterity exercises Parkinson coins buttons handwriting" }],
  },
];

const PRACTICE_RULE_AR = "قاعدةُ الجلسة (مشتقّةٌ إلّا ما نُسب): قبلها — ١) متى أخذ آخرَ جرعة ليفودوبا، وأفي فترة عمل الدواء هو أم في الانطفاء، وأيُّ سقوطٍ أو شبهِ سقوطٍ أو دوخةٍ منذ الجلسة الماضية (Keus 2014)؛ ٢) الضغطُ والنبضُ جالساً: الانقباضيُّ ٢٠٠ فأكثر أو الانبساطيُّ ١١٥ فأكثر ⟵ لا تمرينَ شديد ومراجعةُ الطبيب، والسكّريّ: السكّرُ ٥ ملمول/لتر فأقلّ أو ١٥ فأكثر ⟵ يُصحَّح أو تُؤجَّل الجلسة (Keus 2014)؛ ٣) في فترة الانطفاء ⟵ الحركةُ والحيلُ والعملُ جالساً وحدها، بلا شدّةٍ عالية ولا توازنٍ متحدٍّ. وأثناءها — ٤) الشدّةُ ببورغ ١٣–١٧ (و١٤ مع حاصرات بيتا) لا بالنبض وحده، فارتفاعُه ضعيفٌ عند نحو نصف المرضى (Keus 2014 · Speelman 2012)؛ ٥) توقّف واطلب المشورة عند: الغثيان، أو ألمِ الصدر أكثرَ من دقائق، أو أكثرَ من ٤٠ نفَساً في الدقيقة، أو الإعياءِ أو ضيقِ النفَس الشديد، أو الدوخة، أو الخفقان، أو الألم، أو العرقِ البارد، أو هبوطِ الانقباضيّ أكثرَ من ١٠ ملم زئبق أثناء التمرين (Keus 2014)؛ ٦) دوخةٌ عند الوقوف ⟵ اجلس أو استلقِ وقِس الضغط، ثمّ تابع جالساً أو على الدرّاجة المستلقية (Gibbons 2017)؛ ٧) التجمّد ⟵ بطاقةُ الحيلة، ولا يُشدّ المريضُ أبداً؛ ٨) ألمُ العضلات والمفاصل يبقى خفيفاً ويهدأ قبل الجلسة التالية، والإعياءُ الأسوأُ من المعتاد أكثرَ من ٢٤ ساعة ⟵ ينقص الحجمُ درجة (Siciliano 2018 · Folkerts 2023)؛ ٩) الحرّ: قاعةٌ مكيّفة وماء، والتوقّفُ إن احمرّ وجهُه ولم يتعرّق أو اضطرب (Swinn 2003 · Coon 2018)؛ ١٠) أيُّ سقوطٍ في الجلسة ⟵ يُسجَّل، وينزل تحدّي التوازن درجة، ويُراجَع الإشراف (Canning 2015). والمرحلةُ المعقّدة — الفحصُ الحركيّ ٣٤ فأكثر — لا تمرينَ فيها للتوازن والقوّة إلّا بإشراف أخصائيّ (Montero-Odasso 2022).";
const PRACTICE_RULE_EN = "The session rule (derived unless cited): before it — 1) when the last levodopa dose was taken, whether the person is 'on' or 'off', and any fall, near-fall or dizziness since the last session (Keus 2014); 2) seated blood pressure and pulse: systolic 200 or more or diastolic 115 or more → no vigorous exercise and a doctor's review, and in diabetes a glucose of 5 mmol/L or less or 15 or more → corrected, or the session postponed (Keus 2014); 3) in the 'off' period → mobility, strategies and seated work only, with no high intensity and no challenging balance. During it — 4) intensity by Borg 13–17 (14 on beta-blockers), not by heart rate alone, as its rise is blunted in about half of patients (Keus 2014 · Speelman 2012); 5) stop and seek advice for: nausea, chest pain lasting more than a few minutes, more than 40 breaths a minute, severe fatigue or breathlessness, dizziness, palpitations, pain, cold sweat, or a fall in systolic pressure of more than 10 mmHg during exercise (Keus 2014); 6) dizziness on standing → sit or lie down and measure blood pressure, then continue seated or on the recumbent bike (Gibbons 2017); 7) freezing → the strategy card, and the patient is never pulled; 8) muscle and joint pain stays mild and settles before the next session, and fatigue worse than usual for more than 24 hours → the volume goes down a step (Siciliano 2018 · Folkerts 2023); 9) heat: an air-conditioned room and water, and stop if the face is flushed without sweating, or the person is confused (Swinn 2003 · Coon 2018); 10) any fall in a session → recorded, the balance challenge lowered a level, and supervision reviewed (Canning 2015). In the complex stage — a motor examination score of 34 or more — balance and strength training happen only under a specialist's supervision (Montero-Odasso 2022).";
const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد باثنتي عشرة جلسة (حتى ٣٦، وستٌّ في المسار المبكّر) لمن بلغ الفرقَ المهمّ في مقياسٍ أساسيّ واحد على الأقلّ — سرعةُ المشي ٠٫١٤ م/ث (Hass 2014)، أو النهوضُ والمشي ثانيةٌ واحدة (Taghizadeh 2025)، أو ميني-بيست ٤ (Godi 2020)، أو الجلوسُ والقيامُ ثلاثين ثانية ٣ مرّات (Petersen 2017)، أو جودةُ الحياة ٤٫٧٢ نقطة (Horvath 2017b) — ولم يبلغ هدفاً من أهدافه؛ أو بقي التجمّدُ أو السقوطُ المتكرّر هدفَه الأوّل والحيلُ ما زالت تُتعلَّم (Gilat 2021 · Keus 2014)؛ ومن لم يتغيّر مقياسٌ عنده بأصغر تغيّرٍ يُكتشف لا يُمدَّد — «لا قيمةَ مضافة» (Keus 2014). ثمّ البرنامجُ المنزليّ ثلاثةَ أيّامٍ في الأسبوع فأكثر حتى الأسبوع ١٢ وبعده — هوائيٌّ ٣٠–٤٠ دقيقة وقوّةٌ مرّتين (Osborne 2022 · Montero-Odasso 2022) و١٥٠ دقيقة في الأسبوع فأكثر (Bull 2020 · Mittal 2026) — ومراجعاتٌ في ٣ و٦ أشهر ثمّ كلَّ ٦–١٢ شهراً (Keus 2014)؛ وكتلةُ تنشيطٍ من ١٢ جلسة كلَّ ٦–١٢ شهراً، أو حين تنقص سرعةُ المشي ٠٫١٨ م/ث فأكثر (Steffen 2008) أو يزيد النهوضُ والمشي ٣٫٥ ثانية فأكثر (Huang 2011) أو ينقص ميني-بيست ٤ (Godi 2020) أو بيرغ ٥ (Steffen 2008) عن الخروج، أو يسقط مرّتين فأكثر منذ المراجعة، أو يظهر تجمّدٌ جديد — فالمكسبُ يزول بعد التوقّف (Wallen 2018 · Gilat 2021 · Nieuwboer 2007)، والكتلةُ الثانية بعد سنةٍ نفعت كالأولى (Frazzitta 2012).";
const EXTEND_EN = "At session 24: one extension of twelve sessions (to 36, and six on the early pathway) for a person who reached the important difference on at least one core measure — gait speed 0.14 m/s (Hass 2014), the timed up and go by one second (Taghizadeh 2025), the Mini-BESTest by 4 (Godi 2020), the 30-second sit-to-stand by 3 repetitions (Petersen 2017), or quality of life by 4.72 points (Horvath 2017b) — and has not met a goal; or for whom freezing or recurrent falls remain the main goal while the strategies are still being learnt (Gilat 2021 · Keus 2014); a person with no measure changed by its minimal detectable change is not extended — 'no added value' (Keus 2014). Then the home programme on three days a week or more to week 12 and beyond — aerobic exercise for 30–40 minutes and strength twice a week (Osborne 2022 · Montero-Odasso 2022), and 150 minutes a week or more (Bull 2020 · Mittal 2026) — with reviews at 3 and 6 months, then every 6–12 months (Keus 2014); and a booster block of 12 sessions every 6–12 months, or when, compared with discharge, gait speed falls by 0.18 m/s or more (Steffen 2008), the timed up and go rises by 3.5 seconds or more (Huang 2011), or the Mini-BESTest falls by 4 (Godi 2020) or the Berg by 5 (Steffen 2008), or with two or more falls since the last review, or new freezing — the gain is lost after stopping (Wallen 2018 · Gilat 2021 · Nieuwboer 2007), and a second block a year later worked as well as the first (Frazzitta 2012).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "parkinsons-geriatric",
  summary: [
    "مرضُ باركنسون: تنكّسٌ عصبيّ مزمن يتقدّم، يُصغّر الحركةَ ويُبطئها ويُيبّس العضلات ويُرعش اليد، ثمّ يضطرب المشيُ والتوازن ويأتي التجمّدُ والسقوط، ومعه ما ليس حركيّاً: يسقط ٦٠٫٥٪ من المرضى ويتكرّر عند ٣٩٪ (Allen 2013)، والتجمّدُ عند ٥٠٫٦٪ (Zhang 2021)، وهبوطُ الضغط الانتصابيّ عند ٣٠٫١٪ (Velseboer 2011)، والألمُ عند ٦٧٫٦٪ (Broen 2012)، وصعوبةُ البلع عند ٨٢٪ بالفحص (Kalf 2012)، والاكتئابُ الكبير عند ١٧٪ (Reijnders 2008)، والخرفُ عند ٢٤٫٥٪ (Aarsland 2005)، والإعياءُ عند ٥٠٪ (Siciliano 2018)، وخطرُ الكسر ٢٫٦٦ ضعفاً (Tan 2014). وفي العالم ٦٫١ مليون مريض عام ٢٠١٦ مقابل ٢٫٥ مليون عام ١٩٩٠ (GBD 2016 PD) و١١٫٧٧ مليوناً عام ٢٠٢١ (Luo 2024)، ويُتوقَّع ٢٥٫٢ مليوناً عام ٢٠٥٠ (Su 2025)، ويرتفع مع العمر من ٤٢٨ لكلّ مئة ألف في الستّينات إلى ١٩٠٣ فوق الثمانين (Pringsheim 2014). " +
    "وفي العراق: لا مسحَ سكّانيّاً من بيتٍ إلى بيت (بحثٌ صفريّ)، والأرقامُ نماذجُ أو عيّناتُ عيادات: النموذجُ العالميّ يقدّر ٩٧٧٧ مريضاً عام ٢٠١٦ (GBD 2016 PD) و١٤٣٨٢ عام ٢٠١٩ بمعدّلٍ معياريّ ٧٤٫٢ لكلّ مئة ألف، والعبءُ أقلُّ ممّا يُتوقَّع لمستوى البلد (Safiri 2023) — وقد يكون نقصاً في التشخيص (تفسيرٌ لا دليل)؛ وبالمسح من بيتٍ إلى بيت في أسيوط بمصر ٥٥٧ لكلّ مئة ألف (Khedr 2012)، وفي الشرق الأوسط وشمال أفريقيا ٨٢٫٦ معياريّاً (Safiri 2023). وفي عيادات بغداد: ١٠٢ مريض متوسّطُ عمرهم ٦٠ وثلثاهم رجال و٥٥٪ في مرحلةٍ متقدّمة والإمساكُ عند ٨٠٪ (Muslim 2017)، ونقصُ فيتامين د عند ٦٢٫٥٪ مقابل ٢٧٫٥٪ (Hatem 2019)، و٥٢٪ في أدنى درجات تفعيل المريض لنفسه (Ibrahim 2025b)؛ وقال أربعةَ عشرَ طبيبَ أعصابٍ من خمس محافظات إنّ الالتزامَ بالدواء أوّلُ المشكلات (٧١٫٤٪)، والمرضى لا يقدرون إلّا على دواءٍ أو اثنين، ولا تأمينَ ولا عياداتٍ لاضطرابات الحركة، والعلاجُ الطبيعيّ قليلُ الاستعمال ودعمُ الأسرة مهمّ (Ibrahim 2025a)؛ والسقوطُ ربعُ إصابات المدنيّين في بغداد واقترضت ٣٠٪ من الأسر المصابة (Stewart 2016). ولا تجربةَ تمرينٍ عراقية في هذا المرض (بحثٌ صفريّ). " +
    "الإرشادات: الأوروبيُّ للعلاج الطبيعيّ يقسم المرضَ بمراحل هون وياهر (Hoehn & Yahr): ١–٢ مبكّر، و٣–٤ معقّد، و٥ متأخّر — التثقيفُ في كلّها، والتمرينُ في ١–٤، والحيلُ والتدريبُ على المهامّ في ٢–٥، وفي المتأخّر حفظُ الوظائف ومنعُ قرح الضغط والتيبّس وتدريبُ المرافق؛ والعلاجُ الطبيعيّ يرفع سرعةَ المشي والقوّةَ وينقص الفحصَ الحركيّ بتوصيةٍ قويّة، وأدناه ثمانيةُ أسابيع × ثلاثاً × ٤٥ دقيقة بإشرافٍ وتمرينٌ ذاتيّ في بقيّة الأيّام، و«المعلوماتُ المبنيّة على الدليل عن أفضل عددٍ في الأسبوع وطولِ الجلسة ومدّةِ العلاج غيرُ متاحة» (Keus 2014)؛ والأمريكيّ: الهوائيُّ والمقاومةُ والتوازنُ والمشيُ والمهامُّ والإشاراتُ بجودةٍ عالية وتوصيةٍ قويّة، والتوازنُ ١٦–٣٠ ساعة في ٥–١٠ أسابيع، والمكسبُ يضيع بالتوقّف (Osborne 2022)؛ والبريطانيّ: إحالةٌ مبكّرة إلى معالجٍ خبيرٍ بالمرض، وعلاجٌ طبيعيّ خاصٌّ به لمشكلات التوازن والحركة (NICE NG71 2017)؛ ومراجعةُ جمعية اضطرابات الحركة: العلاجُ الطبيعيّ «مفيدٌ سريرياً» للأعراض الحركية والمشي (Fox 2018)؛ وإرشادُ السقوط العالميّ: أداةُ الأسئلة الثلاثة، والتمرينُ الفرديّ بالتوازن والمقاومة توصيةٌ قويّة بدرجة 1A للمبكّر والمتوسّط، وفي المرحلة المعقّدة بإشراف أخصائيّ وحده، والإشرافُ القليل قد يزيد السقوطَ في المتقدّم (Montero-Odasso 2022)؛ والإماراتيّ: ١٥٠–٣٠٠ دقيقة في الأسبوع، وبرنامجُ السقوط لكلّ من سقط أو تجمّد أو بلغ المرحلة ٣ (Mittal 2026)، ولصيام رمضان اتّفاقٌ خاصّ (Mittal 2025). " +
    "والجرعة: لا تجربةَ قارنت ستّاً في الأسبوع بثلاث، وفي ٤٦ تجربة لم يغيّر عددُ الجلسات في الأسبوع الأثرَ (Keus 2014 · El Hayek 2023)؛ والأقربُ إلى الكتلة اليومية برنامجُ السعة ستَّ عشرةَ ساعةً في أربعة أسابيع (Ebersbach 2010) والبرامجُ الداخلية المكثّفة أربعةَ أسابيع تتكرّر كلَّ سنة (Frazzitta 2012 · Ferrazzoli 2018)؛ والبرنامجُ نفسُه في البيت وحده أقلُّ نفعاً (King 2015)، والإشرافُ القليل في المرض الشديد مال إلى سقوطٍ أكثر ١٫٦١ مرّة (Canning 2015)؛ والتمرينُ أنقص معدّلَ السقوط ٢٦٪ (Allen 2022)؛ والمكسبُ يزول بعد ٦–١٢ شهراً (Wallen 2018)، وأثرُ الإشارة بعد ستّة أسابيع (Nieuwboer 2007)، وتدريبُ التجمّد لا يبقى (Gilat 2021)؛ والمعالجُ المختصّ بالمرض استعمل جلساتٍ أقلّ (٣٣٫٧ مقابل ٤٨٫٠) بمضاعفاتٍ أقلّ (Ypinga 2018). " +
    "فالبروتوكولُ ثلاثةُ مسارات: الرئيس — المرحلة ٢–٤، أو أيُّ سقوطٍ أو تجمّدٍ أو هدفٍ للتوازن والمشي: ٢٤ جلسة بستٍّ في الأسبوع × ٥٠ دقيقة (أربعةُ أسابيع) — لم تُجرَّب خارجَ المستشفى، والمفضَّلُ في الدليل ثلاثٌ في الأسبوع ثمانيةَ أسابيع (Keus 2014) والاختيارُ بندٌ لسليم — وتمديدٌ واحد باثنتي عشرة بمعيارٍ مكتوب؛ والمبكّر — المرحلة ١–٢ بلا سقوطٍ ولا تجمّد: ١٢ جلسة ثمّ برنامجٌ منزليّ بمراجعات؛ والمتأخّر — المرحلة ٥: ١٢ جلسة لتدريب المرافق. ثمّ تمرينٌ منزليّ ثلاثاً في الأسبوع فأكثر حتى الأسبوع ١٢ وبعده — فالكتلةُ أقصرُ من ثمانية أسابيع الإرشاد ومن اثني عشرَ أسبوعاً للسقوط (Montero-Odasso 2022) — ومراجعاتٌ في ٣ و٦ أشهر، وكتلةُ تنشيطٍ من ١٢ جلسة كلَّ ٦–١٢ شهراً أو حين ينقص مقياسٌ بأصغر تغيّرٍ يُكتشف أو يظهر سقوطٌ جديد؛ والتدريبُ في فترة عمل الدواء. ولا مسبحَ في المركز، والبرنامجُ على الأرض يقوم مقامه.",
    "Parkinson's disease: a chronic, progressive neurodegeneration that makes movement small and slow, stiffens the muscles and makes the hand tremble, after which walking and balance are disturbed and freezing and falls appear, with non-motor problems alongside: 60.5% of patients fall, recurrently in 39% (Allen 2013), freezing affects 50.6% (Zhang 2021), low blood pressure on standing 30.1% (Velseboer 2011), pain 67.6% (Broen 2012), swallowing difficulty 82% on testing (Kalf 2012), major depression 17% (Reijnders 2008), dementia 24.5% (Aarsland 2005) and fatigue 50% (Siciliano 2018), and fracture risk is 2.66 times higher (Tan 2014). Worldwide there were 6.1 million patients in 2016 against 2.5 million in 1990 (GBD 2016 PD) and 11.77 million in 2021 (Luo 2024), with 25.2 million expected in 2050 (Su 2025), and prevalence rises with age from 428 per 100,000 in the sixties to 1,903 above eighty (Pringsheim 2014). " +
    "In Iraq: there is no door-to-door population survey (a documented zero result), and the figures are models or clinic samples: the global model estimates 9,777 patients in 2016 (GBD 2016 PD) and 14,382 in 2019, an age-standardised 74.2 per 100,000, with a burden lower than expected for the country's level of development (Safiri 2023) — possibly under-diagnosis (an interpretation, not evidence); a door-to-door survey in Assiut, Egypt, found 557 per 100,000 (Khedr 2012), and the Middle East and North Africa rate is 82.6 age-standardised (Safiri 2023). In Baghdad clinics: 102 patients with a mean age of 60, two-thirds men, 55% at an advanced stage and constipation in 80% (Muslim 2017), vitamin D deficiency in 62.5% against 27.5% (Hatem 2019), and 52% at the lowest level of patient activation (Ibrahim 2025b); fourteen neurologists from five provinces said medication adherence is the first problem (71.4%), patients can afford only one or two drugs, there is no insurance and there are no movement-disorder clinics, and physiotherapy is under-used while family support matters (Ibrahim 2025a); falls are a quarter of civilian injuries in Baghdad, and 30% of affected households borrowed money (Stewart 2016). There is no Iraqi exercise trial in this disease (a documented zero result). " +
    "Guidelines: the European physiotherapy guideline divides the disease by Hoehn & Yahr stage: 1–2 early, 3–4 complicated, 5 late — education at all stages, exercise in 1–4, strategies and task practice in 2–5, and in the late stage preserving vital functions, preventing pressure sores and contractures, and training carers; physiotherapy raises walking speed and strength and reduces the motor examination with a strong recommendation, the minimum is eight weeks × three times × 45 minutes supervised plus self-exercise on the other days, and 'evidence-based information on the optimal number of sessions a week, session time and length of a treatment period are unavailable' (Keus 2014); the American guideline: aerobic, resistance, balance, gait, task-specific training and cueing at high quality with strong recommendations, balance for 16–30 hours over 5–10 weeks, and gains lost on stopping (Osborne 2022); the British guideline: early referral to a physiotherapist experienced in the disease, and disease-specific physiotherapy for balance and motor problems (NICE NG71 2017); the Movement Disorder Society review: physiotherapy is 'clinically useful' for motor symptoms and gait (Fox 2018); the world falls guideline: the three-question tool, individualised exercise with balance and resistance as a strong grade 1A recommendation for early and mid-stage disease, only under a specialist's supervision in the complex stage, and minimally supervised exercise may increase falls in advanced disease (Montero-Odasso 2022); and the UAE guideline: 150–300 minutes a week, and the falls programme for anyone who has fallen, frozen or reached stage 3 (Mittal 2026), with a separate consensus for Ramadan fasting (Mittal 2025). " +
    "Dose: no trial has compared six sessions a week with three, and in 46 trials the number of sessions per week did not change the effect (Keus 2014 · El Hayek 2023); the closest to a daily block are the amplitude programme of sixteen hours over four weeks (Ebersbach 2010) and intensive four-week inpatient programmes repeated yearly (Frazzitta 2012 · Ferrazzoli 2018); the same programme done at home alone helped least (King 2015), and minimal supervision in severe disease trended towards 1.61 times more falls (Canning 2015); exercise reduced the rate of falls by 26% (Allen 2022); the gain fades by 6–12 months (Wallen 2018), the cueing effect by six weeks (Nieuwboer 2007), and freezing training is not retained (Gilat 2021); and disease-specialised physiotherapists used fewer sessions (33.7 against 48.0) with fewer complications (Ypinga 2018). " +
    "So the protocol has three pathways: the main one — stage 2–4, or any fall, freezing, or a balance or walking goal: 24 sessions at six a week × 50 minutes (four weeks) — untested outside hospital, with the evidence-preferred alternative of three a week for eight weeks (Keus 2014) and the choice an item for Saleem — and one extension of twelve by a written criterion; the early one — stage 1–2 without falls or freezing: 12 sessions, then a home programme with reviews; and the late one — stage 5: 12 sessions of carer training. Then home exercise on three days a week or more to week 12 and beyond — as the block is shorter than the guideline's eight weeks and the twelve weeks for falls (Montero-Odasso 2022) — with reviews at 3 and 6 months, and a 12-session booster block every 6–12 months or when a measure falls by its minimal detectable change or a new fall appears; training happens in the 'on' period. The centre has no pool, and the land programme takes its place.",
  ],
  goals: [
    "• تتحسّن سرعةُ المشي ٠٫١٤ م/ث فأكثر — الفرقُ المهمّ المتوسّط (Hass 2014)، وأصغرُ تغيّرٍ يُكتشف ٠٫١٨ (Steffen 2008) — وتبلغ ١٫١ م/ث فأكثر إن أمكن (عتبةُ خطر السقوط — Paul 2013).\n" +
    "• يتحسّن التوازن: ميني-بيست +٤ (Godi 2020)، والنهوضُ والمشي نحو ثانيةٍ فأكثر (Taghizadeh 2025).\n" +
    "• يقلّ السقوطُ في سجلّه (Allen 2022)، ويعرف القيامَ من الأرض وخطّةَ السقوط (Keus 2014).\n" +
    "• يستعمل الإشاراتِ وحيلَ التجمّد والاستدارة والكرسيّ والسرير في البيت، والمرافقُ يعطي الإشارةَ ولا يشدّ (Keus 2014 · Gilat 2021).\n" +
    "• يؤدّي وحده هوائيّاً ثلاثةَ أيّامٍ في الأسبوع ٣٠–٤٠ دقيقة وقوّةً مرّتين، و١٥٠ دقيقة في الأسبوع فأكثر (Osborne 2022 · Bull 2020 · Mittal 2026).\n" +
    "• تتحسّن جودةُ الحياة ٤٫٧٢ نقطة بمقياس PDQ-39 (Horvath 2017b)، ويبلغ أهدافَه بمقياس بلوغ الأهداف (Keus 2014).\n" +
    "• السلامة: الضغطُ عند الوقوف مقيسٌ ومُدار، والأجهزةُ المزروعة مكتوبةٌ في ملفّه، والإحالاتُ مرسَلة (Gibbons 2017 · Keus 2014).",
    "• Walking speed improves by 0.14 m/s or more — the moderate important difference (Hass 2014), with a minimal detectable change of 0.18 (Steffen 2008) — reaching 1.1 m/s or more where possible (the fall-risk threshold — Paul 2013).\n" +
    "• Balance improves: the Mini-BESTest by 4 (Godi 2020), and the timed up and go by about one second or more (Taghizadeh 2025).\n" +
    "• Falls in the diary decrease (Allen 2022), and the person knows how to get up from the floor and the falls plan (Keus 2014).\n" +
    "• The person uses cues and the freezing, turning, chair and bed strategies at home, and the companion gives the cue without pulling (Keus 2014 · Gilat 2021).\n" +
    "• The person independently does aerobic exercise on three days a week for 30–40 minutes and strength twice a week, with 150 minutes a week or more (Osborne 2022 · Bull 2020 · Mittal 2026).\n" +
    "• Quality of life improves by 4.72 points on the PDQ-39 (Horvath 2017b), and the goals are met on Goal Attainment Scaling (Keus 2014).\n" +
    "• Safety: blood pressure on standing measured and managed, implanted devices written in the file, and referrals sent (Gibbons 2017 · Keus 2014).",
  ],
  assessment: [
    "في الجلسة الأولى، وتكملتُه في الجلسات ١–٣ — والقياسُ في فترة عمل الدواء، ويُكتب وقتُ آخر جرعةٍ وحالُ الدواء كلَّ مرّة، فالنهوضُ والمشي يختلف بينهما (Morris 2001 · Keus 2014):\n" +
    "• المرض: مرحلةُ هون وياهر الأصلية (Goetz 2004)، ومدّتُه، والأدويةُ ومواعيدُها وتقلّباتُها (Keus 2014)، والفحصُ الحركيّ من الطبيب — ٣٤ فأكثر مرحلةٌ معقّدة لا تمرينَ فيها بلا إشراف أخصائيّ (Montero-Odasso 2022).\n" +
    "• الأجهزةُ المزروعة — قبل أيّ جهاز: منبّهُ الدماغ (ندبةٌ في فروة الرأس وجهازٌ تحت جلد الصدر)، ومنظّمُ ضربات القلب، ومزيلُ الرجفان (Keus 2014 · Costantino 2026).\n" +
    "• السقوط: أداةُ الأسئلة الثلاثة — سقطةٌ في السنة الماضية، وتجمّدٌ في الشهر الماضي، وسرعةُ مشيٍ أقلُّ من ١٫١ م/ث — وخطرُ السقوط في ستّة أشهر ١٧٪ أو ٥١٪ أو ٨٥٪ (Paul 2013)، وسجلُّ السقطات (Keus 2014 · Ashburn 2008).\n" +
    "• التجمّد: استبيانُ تجمّد المشي الجديد (Nieuwboer 2009) — لا فرقَ مهمّاً له ولا نسخةَ عربية، والاستبيانُ يكشف ضعفَ ما تكشفه الأسئلةُ المفردة (Zhang 2021) — ومواقفُه هو.\n" +
    "• الضغط: من الاستلقاء خمسَ دقائق إلى الوقوف ثلاثاً، والهبوطُ ٢٠/١٠ ملم زئبق فأكثر، أو ٣٠/١٥ إن كان ضغطُ الاستلقاء ١٥٠/٩٠ فأكثر (Gibbons 2017) — فالقياسُ من الجلوس لا يكشف إلّا ٣٩٪ (Lim 2024).\n" +
    "• الذاكرةُ والمزاج: الخرفُ عند ٢٤٫٥٪ (Aarsland 2005) والضعفُ الإدراكيّ الخفيف عند ٤٠٪ (Baiano 2020)، والاكتئاب (Reijnders 2008)؛ والبلعُ والصوت (Kalf 2012)، والألم (Broen 2012).\n" +
    "• المقاييس: الفحصُ الحركيّ (MDS-UPDRS III) — مزروع (يكتبه الطبيب أو أخصائيٌّ مدرَّب بالنسخة العربية الرسمية — Khalil 2022، والفرقُ المهمّ −٣٫٢٥ — Horvath 2015)؛ وميني-بيست — مزروع (الفرقُ المهمّ ٤ — Godi 2020، وأقلُّ من ١٩ يسقط مراراً — Mak 2013، والعربيةُ في مرضى أعصابٍ مختلطين — Alyousef 2023)؛ والنهوضُ والمشي — مزروع (أصغرُ تغيّرٍ يُكتشف ٣٫٥ ثانية — Huang 2011، والفرقُ المهمّ نحو ثانية — Taghizadeh 2025)؛ والمشيُ عشرةَ أمتار مريحاً وسريعاً — مزروعٌ ولكلّ مريض (Keus 2014، والفرقُ المهمّ ٠٫١٤ م/ث — Hass 2014)؛ ومقياسُ بلوغ الأهداف لكلّ مريض (Keus 2014)؛ والإضافيةُ في بند سليم.\n" +
    "• المسار — يضبطه الأخصائيّ ويعدّل عددَ جلسات نسخة المريض: المبكّر (المرحلة ١–٢، والأسئلةُ الثلاثة منخفضة، ولا تجمّد): ١٢ جلسة؛ والرئيس (المرحلة ٢–٤، أو سقوطٌ أو تجمّدٌ أو هدفُ توازنٍ ومشي): ٢٤؛ والمتأخّر (المرحلة ٥، أو لا يمشي بلا مساعدة): ١٢ لتدريب المرافق.\n" +
    "• يُعاد القياسُ في الجلسة ١٢ و٢٤، و٣٦ إن مُدّد، وفي كلّ مراجعة، وبالظروف نفسِها (Keus 2014).",
    "At the first session, completed over sessions 1–3 — testing in the 'on' period, with the time of the last dose and the medication state written each time, as the timed up and go differs between them (Morris 2001 · Keus 2014):\n" +
    "• The disease: the original Hoehn & Yahr stage (Goetz 2004), its duration, the medicines with their times and fluctuations (Keus 2014), and the motor examination from the doctor — 34 or more is the complex stage, with no exercise without a specialist's supervision (Montero-Odasso 2022).\n" +
    "• Implanted devices — before any device: a deep brain stimulator (a scalp scar and a unit under the skin of the chest), a pacemaker, and a defibrillator (Keus 2014 · Costantino 2026).\n" +
    "• Falls: the three-question tool — a fall in the past year, freezing in the past month, and walking speed below 1.1 m/s — giving a six-month fall risk of 17%, 51% or 85% (Paul 2013), and the falls diary (Keus 2014 · Ashburn 2008).\n" +
    "• Freezing: the New Freezing of Gait Questionnaire (Nieuwboer 2009) — with no important difference and no Arabic version, while a questionnaire finds twice as much as single questions (Zhang 2021) — and the person's own triggers.\n" +
    "• Blood pressure: from five minutes lying to three minutes standing, with a fall of 20/10 mmHg or more, or 30/15 if lying pressure is 150/90 or more (Gibbons 2017) — testing from sitting finds only 39% (Lim 2024).\n" +
    "• Memory and mood: dementia in 24.5% (Aarsland 2005) and mild cognitive impairment in 40% (Baiano 2020), and depression (Reijnders 2008); swallowing and voice (Kalf 2012), and pain (Broen 2012).\n" +
    "• Measures: the motor examination (MDS-UPDRS III) — seeded (entered by the doctor or a trained specialist with the official Arabic version — Khalil 2022; important difference −3.25 — Horvath 2015); the Mini-BESTest — seeded (important difference 4 — Godi 2020; below 19 marks a recurrent faller — Mak 2013; the Arabic version was tested in mixed neurological patients — Alyousef 2023); the timed up and go — seeded (minimal detectable change 3.5 seconds — Huang 2011; important difference about one second — Taghizadeh 2025); the ten-metre walk at comfortable and fast speed — seeded and for every patient (Keus 2014; important difference 0.14 m/s — Hass 2014); Goal Attainment Scaling for every patient (Keus 2014); the additional ones are in Saleem's item.\n" +
    "• The pathway — set by the specialist, who adjusts the number of sessions in the patient's copy: early (stage 1–2, low on the three questions, no freezing): 12 sessions; main (stage 2–4, or falls, freezing or a balance and walking goal): 24; late (stage 5, or unable to walk without help): 12 of carer training.\n" +
    "• Remeasured at sessions 12 and 24, and 36 if extended, and at every review, under the same conditions (Keus 2014).",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• الهوائيّ: الدرّاجةُ (والدوسُ السريع) أو المشيُ أو السيرُ المتحرّك ٣٠–٤٠ دقيقة ثلاثاً فأكثر ببورغ ١٣–١٧، وللمرض المبكّر بإذن الطبيب حتى ٨٠–٨٥٪ من أقصى النبض، وباستمرارٍ لا بفترات (Osborne 2022 · Schenkman 2018 · Uc 2014).\n" +
    "• القوّة: ١–٣ × ٨–١٥ بنحو ٦٠–٨٠٪ من أقصى ثقل، والعضلاتُ الكبيرة قبل الصغيرة والمتعدّدةُ المفاصل قبل المفردة (Keus 2014 · Corcos 2013).\n" +
    "• التوازن: متحدٍّ ومتدرّج ١٦–٣٠ ساعة، والخطوةُ الإنقاذية، والمهمّةُ الثانية حين يثبت الأداءُ وحده (Osborne 2022 · Conradsson 2015 · Strouwen 2017).\n" +
    "• الحركاتُ الواسعة والإشاراتُ وحيلُ التجمّد والاستدارة والكرسيّ والسرير، في فترة عمل الدواء ثمّ في الانطفاء (Keus 2014 · Ebersbach 2010 · Gilat 2021).\n" +
    "• الحياة: الوقوفُ الآمن مع هبوط الضغط، والصلاة، ومهارةُ الأصابع، والقيامُ من الأرض، والبيت (Gibbons 2017 · Vanbellingen 2017 · Ashburn 2008).\n" +
    PRACTICE_RULE_AR,
    "The phased programme and its cards are under 'Programme by phase'; in summary:\n" +
    "• Aerobic: cycling (including fast pedalling), walking or the treadmill for 30–40 minutes three times or more at Borg 13–17, up to 80–85% of maximum heart rate for early disease with the doctor's clearance, and continuous rather than in intervals (Osborne 2022 · Schenkman 2018 · Uc 2014).\n" +
    "• Strength: 1–3 × 8–15 at about 60–80% of the maximum load, large muscles before small and multi-joint before single-joint (Keus 2014 · Corcos 2013).\n" +
    "• Balance: challenging and progressive for 16–30 hours, reactive stepping, and a second task once single-task performance is stable (Osborne 2022 · Conradsson 2015 · Strouwen 2017).\n" +
    "• Big movements, cueing, and the freezing, turning, chair and bed strategies, in the 'on' period and then in the 'off' period (Keus 2014 · Ebersbach 2010 · Gilat 2021).\n" +
    "• Daily life: rising safely with low blood pressure, prayer, finger dexterity, getting up from the floor, and the home (Gibbons 2017 · Vanbellingen 2017 · Ashburn 2008).\n" +
    PRACTICE_RULE_EN,
  ],
  contraindications: [
    "الأجهزةُ المزروعة — القاعدةُ الأولى قبل أيّ جهاز:\n" +
    "• يُسأل كلُّ مريضٍ قبل الجلسة الأولى عن منبّه الدماغ المزروع (التحفيزُ العميق للدماغ DBS: ندبةٌ في فروة الرأس وجهازٌ تحت جلد الصدر)، وعن منظّم ضربات القلب ومزيل الرجفان، ويُكتب الجوابُ في ملفّه.\n" +
    "• مع منبّه الدماغ ممنوعٌ كلُّ ما فيه مكوّنٌ كهربائيّ: الموجاتُ القصيرة والحرارةُ العميقة (الدياثرمي) والتيكار، والأمواجُ فوق الصوتية، والتحفيزُ العصبيّ عبر الجلد والتيّارُ المتداخل، والمجالُ المغناطيسيّ؛ ولا ضغطَ باليد قربَ الأسلاك (Keus 2014). فالحرارةُ العميقة عند مريضٍ بمنبّه الدماغ تركته في غيبوبةٍ نباتية دائمة (Nutt 2001)، وسبّبت وذمةً حول الأقطاب وتقلّصاتٍ شديدة (Roark 2008)، والمجالاتُ تُعطب الجهازَ وتؤذي النسيج (Rahimpour 2021).\n" +
    "• مع منظّم القلب أو مزيل الرجفان: لا تيكار — أطلق صدمتين من مزيل رجفانٍ مزروع (Costantino 2026) — ولا تحفيزَ عصبيّاً — تداخلٌ في ١٥٫٩٪ من الأجهزة (Arain 2023).\n" +
    "• ومن عنده منبّهُ الدماغ يتابع التمرينَ والتوازن: المنبّهُ قد لا يحسّن التوازنَ المتحرّك والتجمّد أو يسوّئهما (Collomb-Clerc 2015).\n" +
    "• الاهتزازُ للجسم كلّه: توصيةٌ قويّة ضدّه لسلامته (Keus 2014 · Ebersbach 2008 · Arias 2009).\n" +
    "قواعدُ إحالةٍ يطبّقها المعالج:\n" +
    "• الطوارئ — تُوقف الجلسة، وإلى الطبيب أو الطوارئ في اليوم نفسه: حمّى مع تيبّسٍ واضطراب، خاصّةً بعد إيقاف الدواء أو إنقاصه (متلازمةُ فرط الحرارة الباركنسونية، والوفاةُ حتى ٤٪ — Newman 2009 · NICE NG71 2017 · Mittal 2026)؛ وألمُ الصدر أو اضطرابُ النبض أو استجابةُ الضغط الشاذّة (Keus 2014)؛ والسقوطُ مع ضربة رأسٍ أو كسرٍ مشكوكٍ فيه (Tan 2014)؛ والشرقةُ مع حمّى أو سعال — التهابُ الرئة الاستنشاقيّ ٤٫٢١ ضعفاً ووفاةُ ٦٥٫٢٪ في سنة (Won 2021)؛ والإغماء — ٢٩٪ ممّن سقطوا (Fanciulli 2020b).\n" +
    "• إلى طبيب الأعصاب: هبوطُ الضغط الانتصابيّ بأعراضه أو بالقياس أو بألم الرقبة والكتفين عند الوقوف ⟵ مراجعةُ أدوية الضغط والدوبامين ومضادّات الكولين والاكتئاب (NICE NG71 2017 · Gibbons 2017 · Fanciulli 2020a)؛ والهلاوسُ واضطرابُ الاندفاع والتقلّباتُ المعقّدة (Keus 2014)؛ والسقوطُ الكثير المبكّر أو ضعفُ الاستجابة لليفودوبا — قد يكون باركنسوناً غيرَ نمطيّ (Montero-Odasso 2022)؛ ونوبُ النوم المفاجئ — ولا قيادة (NICE NG71 2017)؛ والاكتئابُ والقلقُ وتراجعُ الذاكرة (Reijnders 2008 · Broen 2016 · Al-Qahtani 2025)؛ والانحناءُ الشديد للجذع نحو ٤٥ درجة فأكثر (Srivanitchapoom 2016)؛ والأدويةُ المرتبطة بالسقوط — المهدّئاتُ خمسةُ أضعاف السقوط المتكرّر (Bloem 2001)؛ وصحّةُ العظم وفيتامين د بعد السقوط (NICE NG71 2017 · Tan 2014)؛ ونيّةُ الصيام ⟵ مراجعةٌ قبل رمضان بأسبوعين إلى أربعة (Mittal 2025).\n" +
    "• إلى النطق والبلع: الصوتُ الخافت (Ramig 2018)، وصعوبةُ البلع (Kalf 2012 · Troche 2010 · Schindler 2021)، وسيلانُ اللعاب (NICE NG71 2017).\n" +
    "• ولا يُنصح المريضُ أبداً بإيقاف دوائه أو إنقاصه (NICE NG71 2017 · Newman 2009).",
    "Implanted devices — the first rule, before any device:\n" +
    "• Every patient is asked before the first session about a deep brain stimulator (DBS: a scalp scar and a unit under the skin of the chest), a pacemaker and a defibrillator, and the answer is written in the file.\n" +
    "• With a deep brain stimulator, anything with an electrical component is forbidden: shortwave and deep heat (diathermy) and TECAR, ultrasound, transcutaneous nerve stimulation and interferential current, and magnetic fields; and no manual pressure near the wires (Keus 2014). Deep heat in a patient with a brain stimulator left him in a permanent vegetative state (Nutt 2001), and caused oedema around the leads and severe contractions (Roark 2008), and electromagnetic fields can damage the device and injure tissue (Rahimpour 2021).\n" +
    "• With a pacemaker or defibrillator: no TECAR — it set off two shocks from an implanted defibrillator (Costantino 2026) — and no nerve stimulation — interference in 15.9% of devices (Arain 2023).\n" +
    "• A person with a brain stimulator continues exercise and balance work: the stimulator may not improve, or may worsen, dynamic balance and freezing (Collomb-Clerc 2015).\n" +
    "• Whole-body vibration: a strong recommendation against it for safety (Keus 2014 · Ebersbach 2008 · Arias 2009).\n" +
    "Referral rules the therapist applies:\n" +
    "• Emergency — stop the session, and to the doctor or the emergency department the same day: fever with rigidity and confusion, especially after stopping or cutting medicines (parkinsonism-hyperpyrexia syndrome, with mortality up to 4% — Newman 2009 · NICE NG71 2017 · Mittal 2026); chest pain, an irregular pulse or an abnormal blood-pressure response (Keus 2014); a fall with a head injury or a suspected fracture (Tan 2014); choking with fever or cough — aspiration pneumonia is 4.21 times more likely, with 65.2% mortality at one year (Won 2021); and fainting — 29% of those who fell (Fanciulli 2020b).\n" +
    "• To the neurologist: low blood pressure on standing by symptoms, by testing, or as neck and shoulder pain on standing → a review of blood-pressure drugs, dopaminergics, anticholinergics and antidepressants (NICE NG71 2017 · Gibbons 2017 · Fanciulli 2020a); hallucinations, impulse-control problems and complex fluctuations (Keus 2014); frequent early falls or a poor response to levodopa — possibly atypical parkinsonism (Montero-Odasso 2022); sudden sleep attacks — and no driving (NICE NG71 2017); depression, anxiety and declining memory (Reijnders 2008 · Broen 2016 · Al-Qahtani 2025); severe forward trunk bending of about 45 degrees or more (Srivanitchapoom 2016); fall-related medicines — sedatives make recurrent falls five times more likely (Bloem 2001); bone health and vitamin D after falls (NICE NG71 2017 · Tan 2014); and an intention to fast → a review two to four weeks before Ramadan (Mittal 2025).\n" +
    "• To speech and swallowing therapy: a soft voice (Ramig 2018), swallowing difficulty (Kalf 2012 · Troche 2010 · Schindler 2021), and drooling (NICE NG71 2017).\n" +
    "• And the patient is never advised to stop or cut a medicine (NICE NG71 2017 · Newman 2009).",
  ],
  precautions: [
    "• قاعدةُ الجلسة في «التمارين» لكلّ المراحل؛ والإشرافُ بأخصائيّ في المرحلة المعقّدة والمتأخّرة: الإشرافُ القليل في المرض الشديد مال إلى سقوطٍ أكثر (Canning 2015 · Montero-Odasso 2022)، ولعبةُ الخطو في البيت قد تضرّ الشديد (Song 2018).\n" +
    "• التوقيت: التمرينُ والقوّةُ في فترة عمل الدواء، والحيلُ تُعلَّم فيها ثمّ تُتقَن في الانطفاء (Keus 2014)؛ ولا يُترك الدواءُ ولا يُنقَص فجأةً أبداً، فذلك يُطلق أزمةَ تعذّر الحركة أو متلازمةَ فرط الحرارة (NICE NG71 2017 · Newman 2009).\n" +
    "• هبوطُ الضغط الانتصابيّ: ماءٌ لا يقلّ عن لترين في اليوم وأكثرُ في الحرّ، والملحُ لا يُقيَّد بلا الطبيب، ورأسُ السرير مرفوعٌ ١٥–٢٣ سم، والجوربُ حتى الخصر أو الحزامُ البطنيّ، والتمرينُ جالساً أو على الدرّاجة المستلقية لمن تشتدّ أعراضُه، ولا حمّامَ ساخناً طويلاً (Gibbons 2017 · Fanciulli 2016)؛ وهو يرافق تمايلاً أكثر (Matinolli 2009).\n" +
    "• الصلاة: لا دراسةَ للصلاة في هذا المرض (بحثٌ صفريّ) — القيامُ من السجود على مراحل والانتظارُ قبل المشي (Ahmad Rufa'i 2013)، والاستدارةُ إلى القبلة بقوس (Spildooren 2010)، والكرسيُّ في الانطفاء أو مع هبوط الضغط أو في المرحلة المتأخّرة لا لكلّ مريض (Ateef 2021)، والتراويحُ والسحورُ يقطعان النوم (Mittal 2025)، والحكمُ الشرعيّ للمريض ومرجعه وإمامه (بطاقتُها).\n" +
    "• رمضان: تقييمٌ قبل رمضان بأسبوعين إلى أربعة مع الأهل — المبكّرُ على دواءٍ واحد خطرُه منخفض، والمرحلةُ ٣ بجرعاتٍ كثيرة متوسّط، والمتقدّمُ لا يُنصح بالصيام وله الرخصة (Mittal 2025)؛ وفجوةٌ أكثرُ من أربع ساعات بلا ليفودوبا تخاطر بأزمة تعذّر الحركة، والليفودوبا قبل وجبة الإفطار ٤٥–٦٠ دقيقة (Mittal 2026)، وصام ٢٠ من ٢٤ بلا حدثٍ خطير في عيّنةٍ صغيرة مختارة (Kamel 2019)، و«نظامُ رمضان» بالدواء الممتدّ أحسنُ من ترك الدواء (Metta 2026 · Damier 2017)؛ ويُفطر عند الانطفاء الشديد الطويل أو الاضطراب أو الهلاوس أو السقوط أو العجز عن بلع الدواء (Mittal 2025). وتوقيتُ الدواء لطبيب الأعصاب، والجلسةُ بعد الإفطار — لا خلال ساعتين من وجبةٍ كبيرة لمن عنده هبوطُ الضغط (Gibbons 2017) — ولا شدّةَ عالية صائماً (اقتراح)؛ ولا دراسةَ لتمرين هذا المرض في رمضان (بحثٌ صفريّ).\n" +
    "• الحرّ وانقطاعُ الكهرباء: كلُّ درجةٍ فوق ٣٤ رفعت دخولَ المستشفى ١٣٪ والوفاةَ ١٤٪ (Linares 2016 · Bobb 2014)، والتعرّقُ وضبطُ الحرارة مضطربان (Swinn 2003 · Coon 2018) — فالتمرينُ قبل الثامنة صباحاً أو بعد السادسة مساءً أو في قاعةٍ مكيّفة، و٢٫٥ لتر ماءٍ في الصيف، ولصقةُ الدواء قد تُطلق جرعةً زائدة في حرّ ٤٥–٥٠ درجة (Mittal 2026)؛ ولا بياناتِ للانقطاع (بحثٌ صفريّ) — فالبيتُ في أبرد الساعات والغرف، وبدائلُ جالساً.\n" +
    "• البيت: ٨٠٪ من السقطات في البيت — ٤٥٪ مشياً و٣٢٪ وقوفاً و٢١٪ في النقل (Ashburn 2008)؛ والدرج: التقويةُ اللامركزية حسّنت النزول (Dibble 2006)؛ والمرحاضُ العربيّ لا بياناتِ له (بحثٌ صفريّ) — يُدرَّب حركةً مركّبة مقسّمة (Keus 2014) بمقبضٍ أو كرسيّ مرحاض (اقتراح).\n" +
    "• الأسرةُ والمرافق: الرعايةُ في البيت وبيوتُ المسنّين موصومة (Mittal 2026)، والرعايةُ بدافع الإيمان (Setyawati 2023)، وعبءُ المرافق واكتئابُه (Schrag 2006 · Mosley 2017) — فيُدرَّب المرافقُ من الجلسة الأولى، والتأهيلُ عن بعد مع المرافق نفع (Gandolfi 2017).\n" +
    "• المعرفةُ والكلفة: المعرفةُ بالمرض قليلة (Alyamani 2018 · Raheema 2023) وتفعيلُ المريض لنفسه منخفض (Ibrahim 2025b) — فالتعليماتُ بسيطةٌ بالصور ومع الأهل؛ والمرضى يقنّنون الدواء (Ibrahim 2025a)، والمعالجُ المختصّ يستعمل جلساتٍ أقلّ (Ypinga 2018)، والمجموعةُ تساوي الفرديّ (Palm 2024)، والمشيُ والتوازنُ في الحيّ بإشرافٍ قليل نفع المرضَ الخفيف والمتوسّط (Mak 2021).\n" +
    "• الغذاء: إعادةُ توزيع البروتين لمن عنده تقلّباتٌ وحده وبلا إنقاص مجموعه (NICE NG71 2017 · Cereda 2010)، وقليلٌ من المرضى يربط التقلّبَ بالبروتين (Virmani 2016)؛ وفيتامين د ناقصٌ في بغداد (Hatem 2019) — والجرعةُ للطبيب.\n" +
    "• المسبح: لا مسبحَ في المركز — والمائيُّ رفع بيرغ ٢٫٧ فوق تمرين الأرض (Cugusi 2019)، والبرنامجُ على الأرض يقوم مقامه.\n" +
    "• الصورُ والفيديو بموافقته المكتوبة وحدها، ولا تُرسل خارجَ ملفّه.",
    "• The session rule under 'Exercises' for every phase; and specialist supervision in the complex and late stages: minimal supervision in severe disease trended towards more falls (Canning 2015 · Montero-Odasso 2022), and a home stepping game may harm people with severe disease (Song 2018).\n" +
    "• Timing: exercise and strength work in the 'on' period, with strategies taught in it and then mastered in the 'off' period (Keus 2014); and medicines are never stopped or cut suddenly, which can trigger an akinetic crisis or the hyperpyrexia syndrome (NICE NG71 2017 · Newman 2009).\n" +
    "• Low blood pressure on standing: at least two litres of water a day and more in the heat, salt not restricted without the doctor, the head of the bed raised 15–23 cm, waist-high compression or an abdominal binder, exercise seated or on the recumbent bike for those with marked symptoms, and no long hot showers (Gibbons 2017 · Fanciulli 2016); it goes with more sway (Matinolli 2009).\n" +
    "• Prayer: there is no study of prayer in this disease (a documented zero result) — rising from prostration in stages and waiting before walking (Ahmad Rufa'i 2013), turning to the qibla in an arc (Spildooren 2010), a chair in the 'off' period, with low blood pressure on standing or in the late stage rather than for everyone (Ateef 2021), the Taraweeh prayers and Suhoor break up sleep (Mittal 2025), and the religious ruling is for the person, their scholar and their imam (its card).\n" +
    "• Ramadan: an assessment two to four weeks before Ramadan with the family — early disease on one drug is low risk, stage 3 on many doses intermediate, and advanced disease is not advised to fast and has the exemption (Mittal 2025); a gap of more than four hours without levodopa risks an akinetic crisis, and levodopa is taken 45–60 minutes before the Iftar meal (Mittal 2026); 20 of 24 fasted without a serious event in a small, selected sample (Kamel 2019), and a 'Ramadan regime' with extended-release medicines was better than stopping medicines (Metta 2026 · Damier 2017); the fast is broken for severe prolonged 'off', confusion, hallucinations, falls or inability to swallow medicines (Mittal 2025). Medicine timing is for the neurologist, and the session is after Iftar — not within two hours of a large meal for those with low blood pressure on standing (Gibbons 2017) — with no high intensity while fasting (a proposal); there is no study of exercise in this disease during Ramadan (a documented zero result).\n" +
    "• Heat and power cuts: each degree above 34 °C raised hospital admissions by 13% and mortality by 14% (Linares 2016 · Bobb 2014), and sweating and temperature control are impaired (Swinn 2003 · Coon 2018) — so exercise before 8 a.m. or after 6 p.m. or in an air-conditioned room, 2.5 litres of water in summer, and a medicine patch may overdose in 45–50 °C heat (Mittal 2026); there are no data on power cuts (a documented zero result) — so the home programme in the coolest hours and rooms, with seated alternatives.\n" +
    "• The home: 80% of falls happen at home — 45% walking, 32% standing and 21% transferring (Ashburn 2008); stairs: eccentric strengthening improved stair descent (Dibble 2006); the squat toilet has no data (a documented zero result) — it is practised as a complex movement split into steps (Keus 2014) with a rail or a commode (a proposal).\n" +
    "• Family and companion: care happens at home and nursing homes are stigmatised (Mittal 2026), caregiving is faith-driven (Setyawati 2023), and carer burden and depression are real (Schrag 2006 · Mosley 2017) — so the companion is trained from the first session, and telerehabilitation with a caregiver helped (Gandolfi 2017).\n" +
    "• Knowledge and cost: knowledge of the disease is low (Alyamani 2018 · Raheema 2023) and patient activation is low (Ibrahim 2025b) — so instructions are simple, with pictures and with the family; patients ration medicines (Ibrahim 2025a), specialised physiotherapists use fewer sessions (Ypinga 2018), groups equal individual sessions (Palm 2024), and community walking and balance with little supervision helped mild-to-moderate disease (Mak 2021).\n" +
    "• Diet: protein redistribution only for those with fluctuations, without cutting total protein (NICE NG71 2017 · Cereda 2010), and few patients link fluctuations to protein (Virmani 2016); vitamin D is low in Baghdad (Hatem 2019) — the dose is for the doctor.\n" +
    "• The pool: the centre has no pool — aquatic exercise raised the Berg by 2.7 over land exercise (Cugusi 2019), and the land programme takes its place.\n" +
    "• Photos and video only with the person's written consent, and never sent outside the file.",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "European Physiotherapy Guideline for Parkinson's Disease (developed with 20 European professional associations)", org: "KNGF / ParkinsonNet — European Physiotherapy Guideline for Parkinson's Disease, with 20 European professional associations (Keus et al.)", year: 2014, url: "https://www.parkinsonnet.nl/app/uploads/sites/3/2019/11/eu_guideline_parkinson_guideline_for_pt_s1.pdf" },
    { title: "Physical Therapist Management of Parkinson Disease: A Clinical Practice Guideline From the American Physical Therapy Association", org: "Phys Ther — American Physical Therapy Association clinical practice guideline for Parkinson disease (Osborne et al.)", year: 2022, url: "https://doi.org/10.1093/ptj/pzab302" },
    { title: "Parkinson's disease in adults (NICE guideline NG71)", org: "NICE guideline NG71 — National Institute for Health and Care Excellence (Parkinson's disease in adults)", year: 2017, url: "https://www.nice.org.uk/guidance/ng71/chapter/Recommendations" },
    { title: "World guidelines for falls prevention and management for older adults: a global initiative", org: "Age Ageing — World Guidelines for Falls Prevention and Management for Older Adults (Montero-Odasso et al.)", year: 2022, url: "https://doi.org/10.1093/ageing/afac205" },
    { title: "Parkinson's disease in the United Arab Emirates (UAE): Emirates Neurology Society consensus guidelines", org: "Front Neurol — Emirates Neurology Society consensus guidelines for Parkinson's disease in the UAE (Mittal et al.)", year: 2026, url: "https://doi.org/10.3389/fneur.2026.1859775" },
    { title: "Faith, fasting, and well-being: Emirates Neurology Society consensus guidelines on safe Ramadan fasting in Parkinson's disease", org: "Front Neurol — Emirates Neurology Society consensus guidelines on safe Ramadan fasting in Parkinson's disease (Mittal et al.)", year: 2025, url: "https://doi.org/10.3389/fneur.2025.1720571" },
    { title: "International Parkinson and movement disorder society evidence-based medicine review: Update on treatments for the motor symptoms of Parkinson's disease", org: "Mov Disord — International Parkinson and Movement Disorder Society evidence-based medicine review of motor treatments (Fox et al.)", year: 2018, url: "https://doi.org/10.1002/mds.27372" },
    { title: "The recommendations of a consensus panel for the screening, diagnosis, and treatment of neurogenic orthostatic hypotension and associated supine hypertension", org: "J Neurol — consensus panel recommendations for neurogenic orthostatic hypotension (Gibbons et al.)", year: 2017, url: "https://doi.org/10.1007/s00415-016-8375-x" },
    { title: "Consensus on the treatment of dysphagia in Parkinson's disease", org: "J Neurol Sci — consensus on the treatment of dysphagia in Parkinson's disease (Schindler et al.)", year: 2021, url: "https://doi.org/10.1016/j.jns.2021.120008" },
    { title: "Recommendations for the Treatment of Patients With Parkinson Disease During Ramadan", org: "JAMA Neurol — recommendations for treating Parkinson disease during Ramadan (Damier & Al-Hashel)", year: 2017, url: "https://doi.org/10.1001/jamaneurol.2016.4291" },
    { title: "World Health Organization 2020 guidelines on physical activity and sedentary behaviour", org: "Br J Sports Med — World Health Organization 2020 guidelines on physical activity and sedentary behaviour (Bull et al.)", year: 2020, url: "https://doi.org/10.1136/bjsports-2020-102955" },
    { title: "Exercise Training Guidelines for Multiple Sclerosis, Stroke, and Parkinson Disease: Rapid Review and Synthesis", org: "Am J Phys Med Rehabil — synthesis of exercise training guidelines for multiple sclerosis, stroke and Parkinson disease (Kim et al.)", year: 2019, url: "https://doi.org/10.1097/phm.0000000000001174" },
    { title: "The burden of Parkinson's disease in the Middle East and North Africa region, 1990-2019: results from the global burden of disease study 2019", org: "BMC Public Health (Safiri et al.)", year: 2023, url: "https://doi.org/10.1186/s12889-023-15018-x" },
    { title: "Non Motor Symptoms In Patients With parkinson's Disease In Baghdad Hospitals", org: "AL-Kindy College Medical Journal (Muslim)", year: 2017, url: "https://doi.org/10.47723/kcmj.v13i1.141" },
    { title: "Neurologists' perspectives on management challenges and mitigation strategies for Parkinson's disease patients: A qualitative study in Iraq", org: "PLoS One (Ibrahim et al.)", year: 2025, url: "https://doi.org/10.1371/journal.pone.0326851" },
    { title: "Fall injuries in Baghdad from 2003 to 2014: Results of a randomised household cluster survey", org: "Injury (Stewart et al.)", year: 2016, url: "https://doi.org/10.1016/j.injury.2015.11.006" },
    { title: "Recurrent falls in Parkinson's disease: a systematic review", org: "Parkinsons Dis (Allen et al.)", year: 2013, url: "https://doi.org/10.1155/2013/906274" },
    { title: "Defining the clinically meaningful difference in gait speed in persons with Parkinson disease", org: "J Neurol Phys Ther (Hass et al.)", year: 2014, url: "https://doi.org/10.1097/npt.0000000000000055" },
    { title: "Responsiveness and minimal clinically important difference of the Mini-BESTest in patients with Parkinson's disease", org: "Gait Posture (Godi et al.)", year: 2020, url: "https://doi.org/10.1016/j.gaitpost.2020.05.004" },
    { title: "Minimal clinically important difference and substantial clinical benefits for single- and dual-task timed up and go test following motor-cognitive training in Parkinson's disease", org: "Age Ageing (Taghizadeh et al.)", year: 2025, url: "https://doi.org/10.1093/ageing/afaf241" },
    { title: "DBS and diathermy interaction induces severe CNS damage", org: "Neurology (Nutt et al.)", year: 2001, url: "https://doi.org/10.1212/wnl.56.10.1384" },
    { title: "Interventions for preventing falls in Parkinson's disease", org: "Cochrane Database Syst Rev (Allen et al.)", year: 2022, url: "https://doi.org/10.1002/14651858.cd011574.pub2" },
    { title: "Type, Timing, Frequency, and Durability of Outcome of Physical Therapy for Parkinson Disease: A Systematic Review and Meta-Analysis", org: "JAMA Netw Open (El Hayek et al.)", year: 2023, url: "https://doi.org/10.1001/jamanetworkopen.2023.24860" },
    { title: "Exercise for falls prevention in Parkinson disease: a randomized controlled trial", org: "Neurology (Canning et al.)", year: 2015, url: "https://doi.org/10.1212/wnl.0000000000001155" },
    { title: "Long-term effects of highly challenging balance training in Parkinson's disease-a randomized controlled trial", org: "Clin Rehabil (Wallén et al.)", year: 2018, url: "https://doi.org/10.1177/0269215518784338" },
    { title: "Comparing exercise in Parkinson's disease--the Berlin LSVT®BIG study", org: "Mov Disord (Ebersbach et al.)", year: 2010, url: "https://doi.org/10.1002/mds.23212" },
    { title: "Amplitude-oriented exercise in Parkinson's disease: a randomized study comparing LSVT-BIG and a short training protocol", org: "J Neural Transm (Vienna) (Ebersbach et al.)", year: 2015, url: "https://doi.org/10.1007/s00702-014-1245-8" },
    { title: "Lee Silverman Voice Treatment (LSVT)-BIG to improve motor function in people with Parkinson's disease: a systematic review and meta-analysis", org: "Clin Rehabil (McDonnell et al.)", year: 2018, url: "https://doi.org/10.1177/0269215517734385" },
    { title: "Physical exercise for people with Parkinson's disease: a systematic review and network meta-analysis", org: "Cochrane Database Syst Rev (Ernst et al.)", year: 2024, url: "https://doi.org/10.1002/14651858.cd013856.pub3" },
    { title: "Cueing and gait improvement among people with Parkinson's disease: a meta-analysis", org: "Arch Phys Med Rehabil (Spaulding et al.)", year: 2013, url: "https://doi.org/10.1016/j.apmr.2012.10.026" },
    { title: "Effect of rhythmic auditory cueing on parkinsonian gait: A systematic review and meta-analysis", org: "Sci Rep (Ghai et al.)", year: 2018, url: "https://doi.org/10.1038/s41598-017-16232-5" },
    { title: "Cueing training in the home improves gait-related mobility in Parkinson's disease: the RESCUE trial", org: "J Neurol Neurosurg Psychiatry (Nieuwboer et al.)", year: 2007, url: "https://doi.org/10.1136/jnnp.200x.097923" },
    { title: "One cue does not fit all: A systematic review with meta-analysis of the effectiveness of cueing on freezing of gait in Parkinson's disease", org: "Neurosci Biobehav Rev (Cosentino et al.)", year: 2023, url: "https://doi.org/10.1016/j.neubiorev.2023.105189" },
    { title: "Prevalence of freezing of gait in Parkinson's disease: a systematic review and meta-analysis", org: "J Neurol (Zhang et al.)", year: 2021, url: "https://doi.org/10.1007/s00415-021-10685-5" },
    { title: "A systematic review on exercise and training-based interventions for freezing of gait in Parkinson's disease", org: "NPJ Parkinsons Dis (Gilat et al.)", year: 2021, url: "https://doi.org/10.1038/s41531-021-00224-4" },
    { title: "Compensation Strategies for Gait Impairments in Parkinson Disease: A Review", org: "JAMA Neurol (Nonnekes et al.)", year: 2019, url: "https://doi.org/10.1001/jamaneurol.2019.0033" },
    { title: "Freezing of gait in Parkinson's disease: the impact of dual-tasking and turning", org: "Mov Disord (Spildooren et al.)", year: 2010, url: "https://doi.org/10.1002/mds.23327" },
    { title: "Strategies used by people with Parkinson's disease who report difficulty turning", org: "Parkinsonism Relat Disord (Stack et al.)", year: 2006, url: "https://doi.org/10.1016/j.parkreldis.2005.08.008" },
    { title: "The circumstances of falls among people with Parkinson's disease and the use of Falls Diaries to facilitate reporting", org: "Disabil Rehabil (Ashburn et al.)", year: 2008, url: "https://doi.org/10.1080/09638280701828930" },
    { title: "Five times sit-to-stand test performance in Parkinson's disease", org: "Arch Phys Med Rehabil (Duncan et al.)", year: 2011, url: "https://doi.org/10.1016/j.apmr.2011.04.008" },
    { title: "Association of transient orthostatic hypotension with falls and syncope in patients with Parkinson disease", org: "Neurology (Fanciulli et al.)", year: 2020, url: "https://doi.org/10.1212/wnl.0000000000010749" },
    { title: "Prevalence of orthostatic hypotension in Parkinson's disease: a systematic review and meta-analysis", org: "Parkinsonism Relat Disord (Velseboer et al.)", year: 2011, url: "https://doi.org/10.1016/j.parkreldis.2011.04.016" },
    { title: "Orthostatic hypotension in Parkinson's disease: Sit-to-stand vs. supine-to-stand protocol and clinical correlates", org: "Parkinsonism Relat Disord (Lim et al.)", year: 2024, url: "https://doi.org/10.1016/j.parkreldis.2024.106980" },
    { title: "Management of Orthostatic Hypotension in Parkinson's Disease", org: "J Parkinsons Dis (Fanciulli et al.)", year: 2020, url: "https://doi.org/10.3233/jpd-202036" },
    { title: "Elastic Abdominal Binders Attenuate Orthostatic Hypotension in Parkinson's Disease", org: "Mov Disord Clin Pract (Fanciulli et al.)", year: 2016, url: "https://doi.org/10.1002/mdc3.12270" },
    { title: "Physical activity associated with prayer regimes improves standing dynamic balance of healthy people", org: "J Phys Ther Sci (Alabdulwahab et al.)", year: 2013, url: "https://doi.org/10.1589/jpts.25.1565" },
    { title: "Can postural modification reduce kinetic and kinematic loading during the bowing postures of Islamic prayer?", org: "Ergonomics (AbouHassan et al.)", year: 2010, url: "https://doi.org/10.1080/00140139.2010.532881" },
    { title: "Cardiovascular Responses during Head-Down Crooked Kneeling Position Assumed in Muslim Prayers", org: "Iran J Med Sci (Ahmad Rufa'i et al.)", year: 2013, url: "https://pubmed.ncbi.nlm.nih.gov/24031108/" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "J Relig Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "Forced, not voluntary, exercise improves motor function in Parkinson's disease patients", org: "Neurorehabil Neural Repair (Ridgel et al.)", year: 2009, url: "https://doi.org/10.1177/1545968308328726" },
    { title: "Effectiveness of home-based and remotely supervised aerobic exercise in Parkinson's disease: a double-blind, randomised controlled trial", org: "Lancet Neurol (van der Kolk et al.)", year: 2019, url: "https://doi.org/10.1016/s1474-4422(19)30285-6" },
    { title: "Phase I/II randomized trial of aerobic exercise in Parkinson disease in a community setting", org: "Neurology (Uc et al.)", year: 2014, url: "https://doi.org/10.1212/wnl.0000000000000644" },
    { title: "Cardiovascular responses during a submaximal exercise test in patients with Parkinson's disease", org: "J Parkinsons Dis (Speelman et al.)", year: 2012, url: "https://doi.org/10.3233/jpd-2012-012111" },
    { title: "Home based training for dexterity in Parkinson's disease: A randomized controlled trial", org: "Parkinsonism Relat Disord (Vanbellingen et al.)", year: 2017, url: "https://doi.org/10.1016/j.parkreldis.2017.05.021" },
    { title: "Effects of Upper Limb Exercise or Training on Hand Dexterity and Function in People With Parkinson Disease: A Systematic Review and Meta-analysis", org: "Arch Phys Med Rehabil (Proud et al.)", year: 2024, url: "https://doi.org/10.1016/j.apmr.2023.11.009" },
    { title: "Efficacy of intensive multidisciplinary rehabilitation in Parkinson's disease: a randomised controlled study", org: "J Neurol Neurosurg Psychiatry (Ferrazzoli et al.)", year: 2018, url: "https://doi.org/10.1136/jnnp-2017-316437" },
    { title: "Fatigue in Parkinson's disease: A systematic review and meta-analysis", org: "Mov Disord (Siciliano et al.)", year: 2018, url: "https://doi.org/10.1002/mds.27461" },
    { title: "Physical Exercise as a Potential Treatment for Fatigue in Parkinson's Disease? A Systematic Review and Meta-Analysis of Pharmacological and Non-Pharmacological Interventions", org: "J Parkinsons Dis (Folkerts et al.)", year: 2023, url: "https://doi.org/10.3233/jpd-225116" },
    { title: "Sweating dysfunction in Parkinson's disease", org: "Mov Disord (Swinn et al.)", year: 2003, url: "https://doi.org/10.1002/mds.10586" },
    { title: "Thermoregulation in Parkinson disease", org: "Handb Clin Neurol (Coon et al.)", year: 2018, url: "https://doi.org/10.1016/b978-0-444-64074-1.00043-4" },
    { title: "Reliability and Minimal Detectable Change for Sit-to-Stand Tests and the Functional Gait Assessment for Individuals With Parkinson Disease", org: "J Geriatr Phys Ther (Petersen et al.)", year: 2017, url: "https://doi.org/10.1519/jpt.0000000000000102" },
    { title: "Changes in Quality of Life in Parkinson's Disease: How Large Must They Be to Be Relevant?", org: "Neuroepidemiology (Horváth et al.)", year: 2017, url: "https://doi.org/10.1159/000455863" },
    { title: "Test-retest reliability and minimal detectable change on balance and ambulation tests, the 36-item short-form health survey, and the unified Parkinson disease rating scale in people with parkinsonism", org: "Phys Ther (Steffen et al.)", year: 2008, url: "https://doi.org/10.2522/ptj.20070214" },
    { title: "Minimal detectable change of the timed \"up & go\" test and the dynamic gait index in people with Parkinson disease", org: "Phys Ther (Huang et al.)", year: 2011, url: "https://doi.org/10.2522/ptj.20090126" },
    { title: "Effectiveness of intensive inpatient rehabilitation treatment on disease progression in parkinsonian patients: a randomized controlled trial with 1-year follow-up", org: "Neurorehabil Neural Repair (Frazzitta et al.)", year: 2012, url: "https://doi.org/10.1177/1545968311416990" },
    { title: "Prevalence of pain in Parkinson's disease: a systematic review using the modified QUADAS tool", org: "Mov Disord (Broen et al.)", year: 2012, url: "https://doi.org/10.1002/mds.24054" },
    { title: "Prevalence of oropharyngeal dysphagia in Parkinson's disease: a meta-analysis", org: "Parkinsonism Relat Disord (Kalf et al.)", year: 2012, url: "https://doi.org/10.1016/j.parkreldis.2011.11.006" },
    { title: "A systematic review of prevalence studies of depression in Parkinson's disease", org: "Mov Disord (Reijnders et al.)", year: 2008, url: "https://doi.org/10.1002/mds.21803" },
    { title: "A systematic review of prevalence studies of dementia in Parkinson's disease", org: "Mov Disord (Aarsland et al.)", year: 2005, url: "https://doi.org/10.1002/mds.20527" },
    { title: "Parkinson's disease and risk of fracture: a meta-analysis of prospective cohort studies", org: "PLoS One (Tan et al.)", year: 2014, url: "https://doi.org/10.1371/journal.pone.0094379" },
    { title: "Global, regional, and national burden of Parkinson's disease, 1990-2016: a systematic analysis for the Global Burden of Disease Study 2016", org: "Lancet Neurol (GBD 2016 Parkinson's Disease Collaborators)", year: 2018, url: "https://doi.org/10.1016/s1474-4422(18)30295-3" },
    { title: "Global, regional, national epidemiology and trends of Parkinson's disease from 1990 to 2021: findings from the Global Burden of Disease Study 2021", org: "Front Aging Neurosci (Luo et al.)", year: 2024, url: "https://doi.org/10.3389/fnagi.2024.1498756" },
    { title: "Projections for prevalence of Parkinson's disease and its driving factors in 195 countries and territories to 2050: modelling study of Global Burden of Disease Study 2021", org: "BMJ (Su et al.)", year: 2025, url: "https://doi.org/10.1136/bmj-2024-080952" },
    { title: "The prevalence of Parkinson's disease: a systematic review and meta-analysis", org: "Mov Disord (Pringsheim et al.)", year: 2014, url: "https://doi.org/10.1002/mds.25945" },
    { title: "Epidemiological study and clinical profile of Parkinson's disease in the Assiut Governorate, Egypt: a community-based study", org: "Neuroepidemiology (Khedr et al.)", year: 2012, url: "https://doi.org/10.1159/000335701" },
    { title: "The state of Vitamin D in Iraqi Patients With Parkinson Disease", org: "AL-Kindy College Medical Journal (Hatem)", year: 2019, url: "https://doi.org/10.47723/kcmj.v13i1.144" },
    { title: "Assessing Patient Activation Among Individuals with Idiopathic Parkinson’s Disease in Iraq: A Cross-Sectional Study Using the PAM-13 Tool", org: "Al-Rafidain Journal of Medical Sciences ( ISSN 2789-3219 ) (Ibrahim et al.)", year: 2025, url: "https://doi.org/10.54133/ajms.v9i2.2361" },
    { title: "Effects of Group, Individual, and Home Exercise in Persons With Parkinson Disease: A Randomized Clinical Trial", org: "J Neurol Phys Ther (King et al.)", year: 2015, url: "https://doi.org/10.1097/npt.0000000000000101" },
    { title: "Effectiveness and costs of specialised physiotherapy given via ParkinsonNet: a retrospective analysis of medical claims data", org: "Lancet Neurol (Ypinga et al.)", year: 2018, url: "https://doi.org/10.1016/s1474-4422(17)30406-4" },
    { title: "Three simple clinical tests to accurately predict falls in people with Parkinson's disease", org: "Mov Disord (Paul et al.)", year: 2013, url: "https://doi.org/10.1002/mds.25404" },
    { title: "Reliability of measurements obtained with the Timed \"Up & Go\" test in people with Parkinson disease", org: "Phys Ther (Morris et al.)", year: 2001, url: "https://doi.org/10.1093/ptj/81.2.810" },
    { title: "Movement Disorder Society Task Force report on the Hoehn and Yahr staging scale: status and recommendations", org: "Mov Disord (Goetz et al.)", year: 2004, url: "https://doi.org/10.1002/mds.20213" },
    { title: "Inappropriate implantable cardioverter defibrillator shocks induced by capacitive-resistive electric transfer therapy: the first documented case report of electromagnetic interference with electrogram evidence", org: "Eur Heart J Case Rep (Costantino et al.)", year: 2026, url: "https://doi.org/10.1093/ehjcr/ytag209" },
    { title: "Reliability of the new freezing of gait questionnaire: agreement between patients with Parkinson's disease and their carers", org: "Gait Posture (Nieuwboer et al.)", year: 2009, url: "https://doi.org/10.1016/j.gaitpost.2009.07.108" },
    { title: "Prevalence and clinical aspects of mild cognitive impairment in Parkinson's disease: A meta-analysis", org: "Mov Disord (Baiano et al.)", year: 2020, url: "https://doi.org/10.1002/mds.27902" },
    { title: "Validation of the Arabic Version of the Movement Disorder Society-Unified Parkinson's Disease Rating Scale", org: "Mov Disord (Khalil et al.)", year: 2022, url: "https://doi.org/10.1002/mds.28905" },
    { title: "Minimal clinically important difference on the Motor Examination part of MDS-UPDRS", org: "Parkinsonism Relat Disord (Horváth et al.)", year: 2015, url: "https://doi.org/10.1016/j.parkreldis.2015.10.006" },
    { title: "The mini-BESTest can predict parkinsonian recurrent fallers: a 6-month prospective study", org: "J Rehabil Med (Mak et al.)", year: 2013, url: "https://doi.org/10.2340/16501977-1144" },
    { title: "Psychometric properties of the Arabic version of the Mini-Balance Evaluation Systems Test in patients with neurological balance disorders", org: "Eur Rev Med Pharmacol Sci (Alyousef et al.)", year: 2023, url: "https://doi.org/10.26355/eurrev_202305_32438" },
    { title: "Effect of High-Intensity Treadmill Exercise on Motor Symptoms in Patients With De Novo Parkinson Disease: A Phase 2 Randomized Clinical Trial", org: "JAMA Neurol (Schenkman et al.)", year: 2018, url: "https://doi.org/10.1001/jamaneurol.2017.3517" },
    { title: "A two-year randomized controlled trial of progressive resistance exercise for Parkinson's disease", org: "Mov Disord (Corcos et al.)", year: 2013, url: "https://doi.org/10.1002/mds.25380" },
    { title: "The Effects of Highly Challenging Balance Training in Elderly With Parkinson's Disease: A Randomized Controlled Trial", org: "Neurorehabil Neural Repair (Conradsson et al.)", year: 2015, url: "https://doi.org/10.1177/1545968314567150" },
    { title: "Training dual tasks together or apart in Parkinson's disease: Results from the DUALITY trial", org: "Mov Disord (Strouwen et al.)", year: 2017, url: "https://doi.org/10.1002/mds.27014" },
    { title: "Reversible neurological symptoms caused by diathermy in a patient with deep brain stimulators: case report", org: "Neurosurgery (Roark et al.)", year: 2008, url: "https://doi.org/10.1227/01.neu.0000311085.73519.b4" },
    { title: "Deep brain stimulation and electromagnetic interference", org: "Clin Neurol Neurosurg (Rahimpour et al.)", year: 2021, url: "https://doi.org/10.1016/j.clineuro.2021.106577" },
    { title: "Risk of occurrence of electromagnetic interference from the application of transcutaneous electrical nerve stimulation on the sensing function of implantable defibrillators", org: "Europace (Suhail Arain et al.)", year: 2023, url: "https://doi.org/10.1093/europace/euad206" },
    { title: "Effects of deep brain stimulation on balance and gait in patients with Parkinson's disease: A systematic neurophysiological review", org: "Neurophysiol Clin (Collomb-Clerc et al.)", year: 2015, url: "https://doi.org/10.1016/j.neucli.2015.07.001" },
    { title: "Whole body vibration versus conventional physiotherapy to improve balance and gait in Parkinson's disease", org: "Arch Phys Med Rehabil (Ebersbach et al.)", year: 2008, url: "https://doi.org/10.1016/j.apmr.2007.09.031" },
    { title: "Effect of whole body vibration in Parkinson's disease: a controlled study", org: "Mov Disord (Arias et al.)", year: 2009, url: "https://doi.org/10.1002/mds.22468" },
    { title: "The parkinsonism-hyperpyrexia syndrome", org: "Neurocrit Care (Newman et al.)", year: 2009, url: "https://doi.org/10.1007/s12028-008-9125-4" },
    { title: "Risk and mortality of aspiration pneumonia in Parkinson's disease: a nationwide database study", org: "Sci Rep (Won et al.)", year: 2021, url: "https://doi.org/10.1038/s41598-021-86011-w" },
    { title: "Prevalence of anxiety in Parkinson's disease: A systematic review and meta-analysis", org: "Mov Disord (Broen et al.)", year: 2016, url: "https://doi.org/10.1002/mds.26643" },
    { title: "The Prevalence of Depression Among Parkinson's Disease Patients in Saudi Arabia: A Cross-Sectional Study", org: "Neuropsychiatr Dis Treat (Al-Qahtani et al.)", year: 2025, url: "https://doi.org/10.2147/ndt.s493629" },
    { title: "Camptocormia in Parkinson's disease: definition, epidemiology, pathogenesis and treatment modalities", org: "J Neurol Neurosurg Psychiatry (Srivanitchapoom et al.)", year: 2016, url: "https://doi.org/10.1136/jnnp-2014-310049" },
    { title: "Prospective assessment of falls in Parkinson's disease", org: "J Neurol (Bloem et al.)", year: 2001, url: "https://doi.org/10.1007/s004150170047" },
    { title: "Speech treatment in Parkinson's disease: Randomized controlled trial (RCT)", org: "Mov Disord (Ramig et al.)", year: 2018, url: "https://doi.org/10.1002/mds.27460" },
    { title: "Aspiration and swallowing in Parkinson disease and rehabilitation with EMST: a randomized trial", org: "Neurology (Troche et al.)", year: 2010, url: "https://doi.org/10.1212/wnl.0b013e3181fef115" },
    { title: "Home-based step training using videogame technology in people with Parkinson's disease: a single-blinded randomised controlled trial", org: "Clin Rehabil (Song et al.)", year: 2018, url: "https://doi.org/10.1177/0269215517721593" },
    { title: "Orthostatic hypotension, balance and falls in Parkinson's disease", org: "Mov Disord (Matinolli et al.)", year: 2009, url: "https://doi.org/10.1002/mds.22457" },
    { title: "How do Parkinson's disease patients manage Ramadan fasting? An observational study", org: "Rev Neurol (Paris) (Kamel et al.)", year: 2019, url: "https://doi.org/10.1016/j.neurol.2018.12.008" },
    { title: "Conceptualizing a Personalized Care Pathway for Parkinson's Disease Using Wearable Sensors in Muslim Patients: The Ramadan Regime", org: "J Mov Disord (Metta et al.)", year: 2026, url: "https://doi.org/10.14802/jmd.25198" },
    { title: "Effect of heat waves on morbidity and mortality due to Parkinson's disease in Madrid: A time-series analysis", org: "Environ Int (Linares et al.)", year: 2016, url: "https://doi.org/10.1016/j.envint.2016.01.017" },
    { title: "Cause-specific risk of hospital admission related to extreme heat in older adults", org: "JAMA (Bobb et al.)", year: 2014, url: "https://doi.org/10.1001/jama.2014.15715" },
    { title: "High-intensity resistance training amplifies muscle hypertrophy and functional gains in persons with Parkinson's disease", org: "Mov Disord (Dibble et al.)", year: 2006, url: "https://doi.org/10.1002/mds.20997" },
    { title: "\"Embracing The Faith\": The Contribution of Islamic Beliefs on the Provision of Care for People with Parkinson's Disease in New Zealand and Indonesia", org: "J Relig Health (Setyawati et al.)", year: 2023, url: "https://doi.org/10.1007/s10943-023-01948-8" },
    { title: "Caregiver-burden in parkinson's disease is closely associated with psychiatric symptoms, falls, and disability", org: "Parkinsonism Relat Disord (Schrag et al.)", year: 2006, url: "https://doi.org/10.1016/j.parkreldis.2005.06.011" },
    { title: "Caregiver Burden in Parkinson Disease: A Critical Review of Recent Literature", org: "J Geriatr Psychiatry Neurol (Mosley et al.)", year: 2017, url: "https://doi.org/10.1177/0891988717720302" },
    { title: "Virtual Reality Telerehabilitation for Postural Instability in Parkinson's Disease: A Multicenter, Single-Blind, Randomized, Controlled Trial", org: "Biomed Res Int (Gandolfi et al.)", year: 2017, url: "https://doi.org/10.1155/2017/7962826" },
    { title: "Public knowledge and awareness about Parkinson's disease in Saudi Arabia", org: "J Family Med Prim Care (Alyamani et al.)", year: 2018, url: "https://doi.org/10.4103/jfmpc.jfmpc_335_18" },
    { title: "Assessment of causes, knowledge and risk factors of Parkinson's disease among general population in Wasit Province, Iraq", org: "World Journal of Advanced Research and Reviews (Rana H. Raheema)", year: 2023, url: "https://doi.org/10.30574/wjarr.2023.18.3.1172" },
    { title: "Effects of Group Exercise on Motor Function and Mobility for Parkinson Disease: A Systematic Review and Meta-Analysis", org: "Phys Ther (Palm et al.)", year: 2024, url: "https://doi.org/10.1093/ptj/pzae014" },
    { title: "Six-Month Community-Based Brisk Walking and Balance Exercise Alleviates Motor Symptoms and Promotes Functions in People with Parkinson's Disease: A Randomized Controlled Trial", org: "J Parkinsons Dis (Mak et al.)", year: 2021, url: "https://doi.org/10.3233/jpd-202503" },
    { title: "Low-protein and protein-redistribution diets for Parkinson's disease patients with motor fluctuations: a systematic review", org: "Mov Disord (Cereda et al.)", year: 2010, url: "https://doi.org/10.1002/mds.23226" },
    { title: "Motor fluctuations due to interaction between dietary protein and levodopa in Parkinson's disease", org: "J Clin Mov Disord (Virmani et al.)", year: 2016, url: "https://doi.org/10.1186/s40734-016-0036-9" },
    { title: "Aquatic exercise improves motor impairments in people with Parkinson's disease, with similar or greater benefits than land-based exercise: a systematic review", org: "J Physiother (Cugusi et al.)", year: 2019, url: "https://doi.org/10.1016/j.jphys.2019.02.003" },
    { title: "Robot-assisted gait training in patients with Parkinson disease: a randomized controlled trial", org: "Neurorehabil Neural Repair (Picelli et al.)", year: 2012, url: "https://doi.org/10.1177/1545968311424417" },
    { title: "Clinical effects of robot-assisted gait training and treadmill training for Parkinson's disease. A randomized controlled trial", org: "Ann Phys Rehabil Med (Capecci et al.)", year: 2019, url: "https://doi.org/10.1016/j.rehab.2019.06.016" },
    { title: "Treadmill training with body weight support: its effect on Parkinson's disease", org: "Arch Phys Med Rehabil (Miyai et al.)", year: 2000, url: "https://doi.org/10.1053/apmr.2000.4439" },
    { title: "Robot-assisted gait training versus equal intensity treadmill training in patients with mild to moderate Parkinson's disease: a randomized controlled trial", org: "Parkinsonism Relat Disord (Picelli et al.)", year: 2013, url: "https://doi.org/10.1016/j.parkreldis.2013.02.010" },
    { title: "Robotic gait training is not superior to conventional treadmill training in parkinson disease: a single-blind randomized controlled trial", org: "Neurorehabil Neural Repair (Carda et al.)", year: 2012, url: "https://doi.org/10.1177/1545968312446753" },
    { title: "Effectiveness of robot-assisted gait training on motor impairments in people with Parkinson's disease: a systematic review and meta-analysis", org: "Int J Rehabil Res (Alwardat et al.)", year: 2018, url: "https://doi.org/10.1097/mrr.0000000000000312" },
    { title: "Robotic-assisted gait training in Parkinson's disease: a three-month follow-up randomized clinical trial", org: "Int J Neurosci (Furnari et al.)", year: 2017, url: "https://doi.org/10.1080/00207454.2017.1288623" },
    { title: "Robot-assisted gait training is not superior to balance training for improving postural instability in patients with mild to moderate Parkinson's disease: a single-blind randomized controlled trial", org: "Clin Rehabil (Picelli et al.)", year: 2015, url: "https://doi.org/10.1177/0269215514544041" },
    { title: "Effect of transcutaneous electrical nerve stimulation associated to exercise for pain in Parkinson's disease: a randomized crossover clinical trial", org: "Pain Manag (Garcez et al.)", year: 2026, url: "https://doi.org/10.1080/17581869.2026.2660894" },
    { title: "The effectiveness of peroneal nerve functional electrical simulation for the reduction of bradykinesia in Parkinson's disease: A feasibility study for a randomised control trial", org: "Clin Rehabil (Taylor et al.)", year: 2021, url: "https://doi.org/10.1177/0269215520972519" },
    { title: "Neuromuscular electrical stimulation versus traditional therapy in patients with Parkinson's disease and oropharyngeal dysphagia: effects on quality of life", org: "Dysphagia (Heijnen et al.)", year: 2012, url: "https://doi.org/10.1007/s00455-011-9371-z" },
    { title: "Effects of neuromuscular electrical stimulation in patients with Parkinson's disease and dysphagia: A randomized, single-blind, placebo-controlled trial", org: "NeuroRehabilitation (Park et al.)", year: 2018, url: "https://doi.org/10.3233/nre-172306" },
    { title: "Effect of transcranial pulsed electromagnetic fields (T-PEMF) on functional rate of force development and movement speed in persons with Parkinson's disease: A randomized clinical trial", org: "PLoS One (Malling et al.)", year: 2018, url: "https://doi.org/10.1371/journal.pone.0204478" },
    { title: "The effect of 8 weeks of treatment with transcranial pulsed electromagnetic fields on hand tremor and inter-hand coherence in persons with Parkinson's disease", org: "J Neuroeng Rehabil (Malling et al.)", year: 2019, url: "https://doi.org/10.1186/s12984-019-0491-2" },
    { title: "Improvements in clinical signs of Parkinson's disease using photobiomodulation: a prospective proof-of-concept study", org: "BMC Neurol (Liebert et al.)", year: 2021, url: "https://doi.org/10.1186/s12883-021-02248-y" },
    { title: "Effects of focal low energy extracorporeal shock wave treatment on reduction of sialorrhea in Parkinson's disease", org: "Front Neurol (Manganotti et al.)", year: 2025, url: "https://doi.org/10.3389/fneur.2025.1740286" },
    { title: "Changes in executive function after acute bouts of passive cycling in Parkinson's disease", org: "J Aging Phys Act (Ridgel et al.)", year: 2011, url: "https://doi.org/10.1123/japa.19.2.87" },
    { title: "Effects of dry needling on gait and muscle tone in Parkinson's disease: a randomized clinical trial", org: "Acupunct Med (Brandín-de la Cruz et al.)", year: 2022, url: "https://doi.org/10.1177/09645284211039232" },
    { title: "Randomized, Controlled Trial of Acupuncture for Fatigue in Parkinson's Disease", org: "Mov Disord (Kluger et al.)", year: 2016, url: "https://doi.org/10.1002/mds.26597" },
    { title: "Electroacupuncture for motor dysfunction and constipation in patients with Parkinson's disease: a randomised controlled multi-centre trial", org: "EClinicalMedicine (Li et al.)", year: 2023, url: "https://doi.org/10.1016/j.eclinm.2022.101814" },
    { title: "Long-term effects of exercise and physical therapy in people with Parkinson disease", org: "Nat Rev Neurol (Mak et al.)", year: 2017, url: "https://doi.org/10.1038/nrneurol.2017.128" },
    { title: "Treadmill training for patients with Parkinson's disease", org: "Cochrane Database Syst Rev (Mehrholz et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd007830.pub3" },
    { title: "Long-term Effect of Regular Physical Activity and Exercise Habits in Patients With Early Parkinson Disease", org: "Neurology (Tsukita et al.)", year: 2022, url: "https://doi.org/10.1212/wnl.0000000000013218" },
    { title: "Minimal Clinically Important Difference of Average Daily Steps Measured Through a Consumer Smartwatch in People With Mild-to-Moderate Parkinson Disease: Cross-Sectional Study", org: "JMIR Mhealth Uhealth (Bianchini et al.)", year: 2025, url: "https://doi.org/10.2196/64213" },
    { title: "Tai chi and postural stability in patients with Parkinson's disease", org: "N Engl J Med (Li et al.)", year: 2012, url: "https://doi.org/10.1056/nejmoa1107911" },
    { title: "Dual tasking with the timed \"up & go\" test improves detection of risk of falls in people with Parkinson disease", org: "Phys Ther (Vance et al.)", year: 2015, url: "https://doi.org/10.2522/ptj.20130386" },
    { title: "Non-Motor Symptoms as Predictors of Quality of Life in Egyptian Patients With Parkinson's Disease: A Cross-Sectional Study Using a Culturally Adapted 39-Item Parkinson's Disease Questionnaire", org: "Front Neurol (Shalash et al.)", year: 2018, url: "https://doi.org/10.3389/fneur.2018.00357" },
    { title: "ASSESSMENT OF THE QUALITY OF LIFE IN MOROCCAN PARKINSON’S PATIENTS", org: "Acta Neuropsychologica (Ahmadou et al.)", year: 2020, url: "https://doi.org/10.5604/01.3001.0013.9739" },
    { title: "Quality of Life in Patients With Parkinson's Disease: A Cross-Sectional Study", org: "Cureus (Al-Khammash et al.)", year: 2023, url: "https://doi.org/10.7759/cureus.33989" },
    { title: "Psychometric properties of Arabic-translated-related quality of life scales for people with parkinson disease: a scoping review", org: "BMC Public Health (Azaiez et al.)", year: 2024, url: "https://doi.org/10.1186/s12889-024-20002-0" },
    { title: "Psychometric properties of the Arabic version of the Activities-Specific Balance Confidence (ABC) scale in ambulatory, community-dwelling, elderly people", org: "Clin Interv Aging (Elboim-Gabyzon et al.)", year: 2019, url: "https://doi.org/10.2147/cia.s194777" },
    { title: "How much change is true change? The minimum detectable change of the Berg Balance Scale in elderly people", org: "J Rehabil Med (Donoghue et al.)", year: 2009, url: "https://doi.org/10.2340/16501977-0337" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 45,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٥ دقيقة في الجلسة في فترة عمل الدواء — الهوائيُّ (الدرّاجةُ أو المشيُ أو السيرُ المتحرّك)، ثمّ القوّةُ المتدرّجة، ثمّ التوازنُ المتحدّي والحركاتُ الواسعة، ثمّ الإشاراتُ وحيلُ التجمّد والاستدارة والنقل، ثمّ تدريبُ المرافق على ما يكرّره في البيت؛ والشدّةُ ببورغ وقاعدةِ الجلسة.",
        "The phased programme and its cards under 'Programme by phase': about 45 minutes per session in the 'on' period — aerobic work (cycling, walking or the treadmill), then progressive strength, then challenging balance and big movements, then cueing and the freezing, turning and transfer strategies, then coaching the companion on what to repeat at home; intensity by Borg and the session rule."],
      note: ["أساسيٌّ في كلّ جلسة — الهوائيُّ والمقاومةُ والتوازنُ والمشيُ والمهامُّ والإشاراتُ كلُّها بجودةٍ عالية وتوصيةٍ قويّة (Osborne 2022)، والعلاجُ الطبيعيّ يرفع السرعةَ والقوّةَ وينقص الفحصَ الحركيّ بتوصيةٍ قويّة (Keus 2014)، والتمرينُ الفرديّ بالتوازن والمقاومة بدرجة 1A للمبكّر والمتوسّط (Montero-Odasso 2022)، وأنواعُ التمرين كلُّها تفوق الضبطَ السلبيّ (Ernst 2024)، وأنقص معدّلَ السقوط ٢٦٪ (Allen 2022).",
        "Core in every session — aerobic, resistance, balance, gait, task-specific training and cueing are all at high quality with strong recommendations (Osborne 2022), physiotherapy raises speed and strength and reduces the motor examination with a strong recommendation (Keus 2014), individualised exercise with balance and resistance is grade 1A for early and mid-stage disease (Montero-Odasso 2022), every exercise type beats passive control (Ernst 2024), and exercise reduced the rate of falls by 26% (Allen 2022)."] },
    { code: "robotik", centreUse: "adjunct", evidence: "optional", minutes: 30,
      params: { durationMin: "30–45", bwsPct: "Up to 20%" },
      parameters: ["مساعدٌ لمن هو في المرحلة ٣–٤، ولمن يتجمّد، ولمن يمشي بمساعدة، ولمن لا يأمن على السير المتحرّك: ٣٠–٤٥ دقيقة في الجلسة و١٢–٢٠ جلسة (Picelli 2012 · Capecci 2019)، وحملُ الوزن حتى ٢٠٪ مأخوذٌ من السير المتحرّك بحمل الوزن (Miyai 2000)، وبالحزام لمن خطرُه عالٍ (Osborne 2022) — والسرعةُ ونسبةُ التوجيه لم تُذكرا في التجارب فلا تُكتبان؛ ويُقاس الضغطُ واقفاً قبله (Gibbons 2017).",
        "An adjunct for those at stage 3–4, freezers, those who walk with help, and those unsafe on the treadmill: 30–45 minutes per session and 12–20 sessions (Picelli 2012 · Capecci 2019), with body-weight support up to 20% taken from body-weight-supported treadmill training (Miyai 2000), and a harness for those at high risk (Osborne 2022) — speed and guidance force are not reported in the trials, so they are not written; blood pressure is measured standing beforehand (Gibbons 2017)."],
      note: ["مساعدٌ بشرطه — الإرشادُ يجعله جزءاً من تدريب المشي بجودةٍ عالية (Osborne 2022)، والروبوتُ يساوي السيرَ المتحرّك (Picelli 2013 · Carda 2012) ويفوق العلاجَ التقليديّ (Alwardat 2018 · Furnari 2017) لا تدريبَ التوازن (Picelli 2015)، وزادت السرعةُ ٠٫١٣ م/ث بلا أهمّيةٍ سريرية مرجّحة (Picelli 2012)، ومن يتجمّد ومن يمشي بمساعدة كسبا منه أكثرَ من السير (Capecci 2019) — فلمن لا يناسبه المشيُ على الأرض أو السيرُ وحده، لا لكلّ مريض.",
        "Adjunct under its condition — the guideline makes it part of gait training at high quality (Osborne 2022), the robot equals the treadmill (Picelli 2013 · Carda 2012) and beats conventional therapy (Alwardat 2018 · Furnari 2017) but not balance training (Picelli 2015), speed rose by 0.13 m/s, judged probably not clinically important (Picelli 2012), and freezers and those who walk with help gained more from it than from the treadmill (Capecci 2019) — so it is for those not suited to overground or treadmill walking alone, not for every patient."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 20,
      params: { currentType: "TENS", frequencyHz: "100", pulseWidthUs: "100", intensity: "Motor threshold", durationMin: "20" },
      parameters: ["لألم العضلات والمفاصل وحده، مع التمرين لا بدله: تحفيزٌ عصبيّ عبر الجلد على الظهر الصدريّ والقطنيّ، ١٠٠ هرتز و١٠٠ ميكروثانية بشدّة عتبة الحركة، مع برنامجٍ تمرينيّ من عشرين دقيقة كما في التجربة (Garcez 2026) — ومدّةُ التحفيز مفترَضةٌ بطول التمرين، والتشغيلُ والإطفاءُ لم يُذكرا. ولا يُستعمل أبداً مع منبّه الدماغ المزروع أو منظّم القلب أو مزيل الرجفان.",
        "For muscle and joint pain only, with exercise and not instead of it: transcutaneous nerve stimulation over the thoracic and lumbar back at 100 Hz and 100 µs at motor-threshold intensity, with a twenty-minute exercise programme as in the trial (Garcez 2026) — the stimulation time is assumed to match the exercise, and on/off times were not reported. Never with a deep brain stimulator, a pacemaker or a defibrillator."],
      note: ["مساعدٌ بشرطه ولقرار سليم — تجربةٌ متصالبة صغيرة عند ١٣ مريضاً أنقصت الألمَ بلا آثارٍ جانبية (Garcez 2026)، والإرشادُ لا يذكره إلّا من الإرشادات العامّة للألم (Keus 2014)، والألمُ عند ٦٧٫٦٪ (Broen 2012)؛ وممنوعٌ مع منبّه الدماغ (Keus 2014)، وأحدث تداخلاً في ١٥٫٩٪ من مزيلات الرجفان المزروعة (Arain 2023)؛ والتحفيزُ الوظيفيّ لعصب الشظية رفع السرعةَ ٠٫١٤ م/ث وزال أثرُه بعد التوقّف (Taylor 2021) فلا يُستعمل الآن، وتحفيزُ البلع شأنُ النطق والبلع (Heijnen 2012 · Park 2018).",
        "Adjunct under its condition, for Saleem's decision — a small crossover trial in 13 patients reduced pain without adverse effects (Garcez 2026), the guideline lists it only from general pain guidelines (Keus 2014), and pain affects 67.6% (Broen 2012); it is forbidden with a brain stimulator (Keus 2014) and caused interference in 15.9% of implanted defibrillators (Arain 2023); peroneal functional stimulation raised speed by 0.14 m/s and the effect faded after stopping (Taylor 2021), so it is not used for now, and swallowing stimulation belongs to speech and swallowing therapy (Heijnen 2012 · Park 2018)."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional",
      parameters: ["دفءٌ موضعيّ لألم العضلات في الرقبة أو الكتف أو الظهر وحده، جالساً أو مستلقياً بعد فحص الإحساس، بقاعدة المركز للكمادة — ولا قبل تمارين التوازن واقفاً مباشرةً لمن عنده هبوطُ الضغط الانتصابيّ (اقتراح)؛ ولا إعداداتٍ من تجارب هذا المرض.",
        "Local warmth for muscle pain in the neck, shoulder or back only, sitting or lying after checking sensation, by the centre's hot-pack rule — and not just before standing balance work for those with low blood pressure on standing (a proposal); there are no settings from trials in this disease."],
      note: ["مساعدٌ بقاعدة المركز ولقرار سليم — لا إرشادَ ولا تجربةَ في هذا المرض (بحثٌ صفريّ)، والتعرّقُ مضطربٌ عند ٦٤٪ (Swinn 2003) وضبطُ الحرارة ضعيف (Coon 2018)، والحرارةُ ترفع حرارةَ الجسم وتزيد هبوطَ الضغط (Gibbons 2017)، ودخولُ المستشفى يزيد مع الحرّ (Linares 2016) — فموضعيٌّ قصير، لا على الجسم كلّه.",
        "Adjunct by the centre's rule, for Saleem's decision — there is no guideline or trial in this disease (a documented zero result), sweating is impaired in 64% (Swinn 2003) and temperature control is weak (Coon 2018), heat raises body temperature and worsens low blood pressure on standing (Gibbons 2017), and hospital admissions rise with heat (Linares 2016) — so local and brief, never over the whole body."] },
    { code: "megnatik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — المجالُ الكهرومغناطيسيّ النبضيّ على الرأس في البيت ثلاثين دقيقة يومياً ثمانيةَ أسابيع لم يزد على الوهميّ (Malling 2018) ولا في الرعاش (Malling 2019)، والمجالاتُ تتداخل مع منبّه الدماغ المزروع (Rahimpour 2021)، والإرشادُ يمنع كلَّ ما فيه مكوّنٌ كهربائيّ معه (Keus 2014).",
        "Not used — a pulsed electromagnetic field over the head at home for thirty minutes a day for eight weeks was no better than placebo (Malling 2018), nor for tremor (Malling 2019), fields interfere with an implanted brain stimulator (Rahimpour 2021), and the guideline forbids anything with an electrical component with one (Keus 2014)."] },
    { code: "wax", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ ولا دواعيَ في هذا المرض (بحثٌ صفريّ)؛ ومع خشونة اليد أو الروماتويد المرافق يتبع بروتوكولَ ذلك المرض.", "Not used — there is no trial or indication in this disease (a documented zero result); with coexisting hand osteoarthritis or rheumatoid arthritis, that condition's protocol applies."] },
    { code: "infrared", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة (بحثٌ صفريّ)، ومحاذيرُ الحرارة نفسُها (Swinn 2003 · Gibbons 2017)؛ والضوءُ تحت الأحمر على الرأس في دراسةٍ صغيرة (Liebert 2021) ليس مصباحَ الحرارة.", "Not used — there is no trial (a documented zero result), the same heat concerns apply (Swinn 2003 · Gibbons 2017), and near-infrared light to the head in a small study (Liebert 2021) is not a heat lamp."] },
    { code: "tecar", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — ممنوعٌ مع أيّ جهازٍ مزروع: الحرارةُ العميقة بالموجات القصيرة عند مريضٍ بمنبّه الدماغ تركته في غيبوبةٍ نباتية دائمة (Nutt 2001) وسبّبت عند آخرَ وذمةً حول الأقطاب وتقلّصات (Roark 2008)، والإرشادُ يمنعها مع منبّه الدماغ (Keus 2014)، والتيكارُ على الظهر أطلق صدمتين من مزيل رجفانٍ مزروع (Costantino 2026)؛ ولا تجربةَ في هذا المرض (بحثٌ صفريّ).",
        "Not used — forbidden with any implant: shortwave deep heat in a patient with a brain stimulator left him in a permanent vegetative state (Nutt 2001) and caused oedema around the leads and contractions in another (Roark 2008), the guideline forbids it with a brain stimulator (Keus 2014), and TECAR to the back set off two shocks from an implanted defibrillator (Costantino 2026); there is no trial in this disease (a documented zero result)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ في هذا المرض (بحثٌ صفريّ)، والإرشادُ يجعله علامةَ خطرٍ مع منبّه الدماغ المزروع (Keus 2014)؛ ولألم العضلات التمرينُ والتحفيزُ والكمادةُ بشروطها.", "Not used — there is no trial in this disease (a documented zero result), and the guideline makes it a red flag with an implanted brain stimulator (Keus 2014); muscle pain gets exercise, nerve stimulation and the hot pack under their conditions."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — دراسةٌ صغيرة من ١٢ مريضاً للضوء على الرأس والأنف والبطن مقابل قائمة الانتظار (Liebert 2021) — ليست ليزرَ العضلات والمفاصل — ولا إرشاد.", "Not used — a small study of 12 patients using light to the head, nose and abdomen against a waiting list (Liebert 2021) — not laser for muscles and joints — and no guideline."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — دراسةٌ تجريبية واحدة من ١٢ مريضاً على الغدد اللعابية لسيلان اللعاب (Manganotti 2025)، ليست علاجاً طبيعيّاً — فلا إعداداتٍ تمنع اعتمادَه.", "Not used — a single pilot of 12 patients on the salivary glands for drooling (Manganotti 2025), which is not physiotherapy — so no settings block its approval."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ للضغط بالجهاز (بحثٌ صفريّ)؛ ولهبوط الضغط الانتصابيّ الجوربُ الضاغط حتى الخصر ٣٠–٤٠ ملم زئبق أو الحزامُ البطنيّ (+١٠ ملم زئبق) من الطبيب، لا الجهاز (Gibbons 2017 · Fanciulli 2016).", "Not used — there is no trial of device compression (a documented zero result); low blood pressure on standing gets waist-high 30–40 mmHg compression or an abdominal binder (+10 mmHg) through the doctor, not the device (Gibbons 2017 · Fanciulli 2016)."] },
    { code: "traction", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ ولا دواعيَ في هذا المرض (بحثٌ صفريّ)، ومع الهشاشة المرافقة ممنوعٌ ببروتوكولها.", "Not used — there is no trial or indication in this disease (a documented zero result), and with coexisting osteoporosis it is forbidden by that protocol."] },
    { code: "cpm", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربة؛ وجولةٌ واحدة من الدوس السلبيّ بلا مجموعةٍ ضابطة (Ridgel 2011)، والدوسُ السريع المساعَد بالمحرّك — إن كان في المركز درّاجةٌ بمحرّك — من التمرين لا من هذا الجهاز (Ridgel 2009).", "Not used — there is no trial; a single bout of passive cycling without a control group (Ridgel 2011), and motor-assisted fast pedalling — if the centre has a motorised bike — belongs under exercise, not this device (Ridgel 2009)."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — جلسةٌ واحدة من الإبر الجافّة ساوت الوهميّ (Brandin-de la Cruz 2022)، والوخزُ ساوى الوهميّ للإعياء (Kluger 2016)، والوخزُ الكهربائيّ مقابل الانتظار بلا تعمية (Li 2023) — وهو وخزٌ لا إبرٌ جافّة.", "Not used — a single dry-needling session equalled sham (Brandin-de la Cruz 2022), acupuncture equalled sham for fatigue (Kluger 2016), and electroacupuncture was compared with a waiting list without blinding (Li 2023) — and that is acupuncture, not dry needling."] },
  ],
  phases: [
    {
      name: ["التقييمُ والسلامةُ والأسس", "Assessment, safety and foundations"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلسات ١–٦ (الأسبوعُ الأوّل) — والتمرينُ يبدأ من الجلسة الأولى", "Sessions 1–6 (the first week) — with exercise starting from the first session"],
      goals: [
        "التقييمُ تمّ (المرحلة، والأسئلةُ الثلاثة للسقوط، والتجمّد، والضغطُ من الاستلقاء إلى الوقوف، والأجهزةُ المزروعة، والذاكرة، ومواعيدُ الدواء)، والقياسُ الأوّل والأهدافُ مكتوبة والمسارُ مختار؛ والمريضُ وأهلُه يعرفون قاعدةَ الجلسة والوقوفَ الآمن، وبدأ الهوائيَّ ببورغ ١١–١٣ والقوّةَ ٤٠–٦٠٪ والحركاتِ الواسعة وتجربةَ الإشارات وأولى حيل الكرسيّ والسرير، وسجلَّ البيت.",
        "Assessment done (stage, the three falls questions, freezing, lying-to-standing blood pressure, implanted devices, memory and medicine times), the first measurement and the goals written and the pathway chosen; the person and the family know the session rule and safe rising, and the person has started aerobic work at Borg 11–13, strength at 40–60%, big movements, trying out cues, the first chair and bed strategies, and the home diary.",
      ],
      education: [
        "• التمرينُ يحسّن المشيَ والتوازنَ والفحصَ الحركيّ، والمكسبُ يحتاج الاستمرار (Keus 2014 · Osborne 2022 · Mak 2017).\n" +
        "• الوقوفُ الآمن وهبوطُ الضغط: الماءُ والحزامُ والوقوفُ على مراحل (Gibbons 2017).\n" +
        "• التمرينُ في فترة عمل الدواء، ولا يُترك الدواءُ أو يُنقَص فجأةً أبداً (Keus 2014 · NICE NG71 2017).\n" +
        "• علاماتُ الخطر ومتى يتّصل بالطبيب، والأجهزةُ المزروعة وما يُمنع معها (Keus 2014).",
        "• Exercise improves walking, balance and the motor examination, and the gain needs continuing (Keus 2014 · Osborne 2022 · Mak 2017).\n" +
        "• Safe rising and low blood pressure: water, the binder and rising in stages (Gibbons 2017).\n" +
        "• Exercise in the 'on' period, and medicines are never stopped or cut suddenly (Keus 2014 · NICE NG71 2017).\n" +
        "• The warning signs and when to contact the doctor, and implanted devices and what is forbidden with them (Keus 2014).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• لا علامةَ خطرٍ لم تُحسم، والأجهزةُ المزروعة مكتوبة، والمسارُ والأهداف (بمقياس بلوغ الأهداف) مكتوبة.\n" +
        "• لا هبوطَ للانقباضيّ أكثرَ من ١٠ ملم زئبق أثناء التمرين (Keus 2014)، وهبوطُ الضغط الانتصابيّ إن وُجد مُدارٌ بوسائله (Gibbons 2017).\n" +
        "• ٢٠–٣٠ دقيقة هوائيّاً متّصلاً ببورغ ١٣ (Keus 2014).\n" +
        "• البرنامجُ المنزليّ ثلاثةَ أيّامٍ فأكثر في السجلّ.\n" +
        "(اقتراحٌ يتبع السلامةَ والتنظيم، لا معيارٌ مجرَّب.)",
        "Progress to phase 2 when all are met:\n" +
        "• No unresolved red flag, implanted devices written, and the pathway and goals (by Goal Attainment Scaling) written.\n" +
        "• No fall in systolic pressure of more than 10 mmHg during exercise (Keus 2014), and any low blood pressure on standing managed by its measures (Gibbons 2017).\n" +
        "• 20–30 minutes of continuous aerobic work at Borg 13 (Keus 2014).\n" +
        "• The home programme on three days or more in the diary.\n" +
        "(A proposal based on safety and organisation, not a tested criterion.)",
      ],
      notes: [
        "• التقييمُ لا يأخذ الجلسات كلَّها: من الأولى هوائيٌّ ٢٠ دقيقة ببورغ ١١–١٣ يصل إلى ١٣ في الجلسة السادسة (Keus 2014)، وقوّةٌ ١–٢ × ١٠–١٥ بنحو ٤٠–٦٠٪ من أقصى ثقل (Kim 2019 · Keus 2014).\n" +
        "• الإشارات: تبدأ من حيله هو، ثمّ يُجرَّب الإيقاعُ والخطوط (Keus 2014).\n" +
        "• المسارُ المبكّر: أربعُ جلساتٍ هنا. والمتأخّر: النقلُ والوضعياتُ وتخفيفُ الضغط ومنعُ التيبّس وتدريبُ المرافق، ولا توازنَ بلا إشراف (Keus 2014 · Montero-Odasso 2022).\n" +
        "• الأجهزةُ المساعدة بشروطها في سطورها، وبعد سؤال الأجهزة المزروعة.",
        "• Assessment does not take all the sessions: from the first, aerobic work for 20 minutes at Borg 11–13 reaching 13 by session six (Keus 2014), and strength 1–2 × 10–15 at about 40–60% of the maximum load (Kim 2019 · Keus 2014).\n" +
        "• Cues: start from the person's own tricks, then try the beat and lines (Keus 2014).\n" +
        "• Early pathway: four sessions here. Late pathway: transfers, positioning, pressure relief, preventing contractures and training the companion, with no unsupervised balance work (Keus 2014 · Montero-Odasso 2022).\n" +
        "• Adjunct devices under the conditions in their lines, and only after asking about implanted devices.",
      ],
      exercises: [
        { code: "pd-orthostatic-safe-rising", sets: 1, reps: 1,
          note: ["لكلّ مريض، والقياسُ من الاستلقاء إلى الوقوف في الجلسة الأولى.", "For every patient, with the lying-to-standing test at the first session."] },
        { code: "pd-big-amplitude-movements", sets: 1, reps: 8,
          note: ["دورةٌ واحدة، وجالساً إن لم يأمن الوقوف.", "One round, and seated if standing is not safe."] },
        { code: "pd-chair-rise-sequence", sets: 2, reps: 5,
          note: ["من كرسيٍّ بمسندين، والمرافقُ يتعلّم الكلمات.", "From a chair with armrests, with the companion learning the words."] },
        { code: "pd-bed-turning-sequence", sets: 1, reps: 3,
          note: ["على سريرٍ بارتفاع سرير البيت، والمرافقُ يحضر.", "On a plinth at home-bed height, with the companion present."] },
        { code: "pd-metronome-cued-walking", sets: 1, reps: 1,
          note: ["قياسُ عدد الخطوات في الدقيقة وتجربةُ الإشارة التي تناسبه.", "Counting steps per minute and trying the cue that suits the person."] },
        { code: "stationary-cycling", sets: 1, reps: 1,
          doseNote: ["٢٠ دقيقة ببورغ ١١–١٣ يصل إلى ١٣ في الجلسة السادسة (Keus 2014)؛ والمستلقيةُ لمن عنده هبوطُ الضغط (Gibbons 2017).", "20 minutes at Borg 11–13 reaching 13 by session six (Keus 2014); the recumbent bike for those with low blood pressure on standing (Gibbons 2017)."] },
        { code: "sit-to-stand", sets: 2, reps: 10,
          note: ["من كرسيٍّ عالٍ بسند.", "From a high chair with support."] },
        { code: "seated-knee-extension", sets: 2, reps: 12,
          note: ["١–٢ × ١٠–١٥ بنحو ٤٠–٦٠٪ من أقصى ثقل.", "1–2 × 10–15 at about 40–60% of the maximum load."] },
        { code: "calf-raise", sets: 2, reps: 10,
          note: ["واليدان على الطاولة.", "With the hands on the counter."] },
        { code: "standing-weight-shift", sets: 2, reps: 10,
          note: ["بجانب الطاولة، إلى الجهتين.", "Beside the counter, to both sides."] },
        { code: "tandem-stance", sets: 1, reps: 3, hold: 20,
          note: ["بجانب سند، لمن يأمن.", "Beside a support, for those who are safe."] },
        { code: "thoracic-extension-towel", sets: 1, reps: 5,
          note: ["مع الحركات الواسعة لا وحده — التمطيطُ وحده ضعيفُ الدليل (Osborne 2022).", "With the big movements, not alone — flexibility work alone has weak evidence (Osborne 2022)."] },
        { code: "pd-home-dexterity-tasks", sets: 1, reps: 10,
          note: ["لمن تشكو يدُه — يبدأ البرنامجُ المنزليّ.", "For a person with hand difficulty — the home programme starts."] },
        { code: "osteo-home-hazard-footwear", sets: 1, reps: 1,
          note: ["صورُ البيت والحذاء — ٨٠٪ من السقطات في البيت (Ashburn 2008).", "Photos of the home and footwear — 80% of falls happen at home (Ashburn 2008)."] },
        { code: "bed-to-chair-transfer", sets: 1, reps: 3,
          note: ["للمسار المتأخّر — مع المرافق.", "For the late pathway — with the companion."] },
        { code: "sci-pressure-relief", sets: 1, reps: 3,
          note: ["للمسار المتأخّر في الكرسيّ — يتعلّمه المرافق لمنع قرح الضغط (Keus 2014).", "For the late pathway in a wheelchair — the companion learns it to prevent pressure sores (Keus 2014)."] },
      ],
    },
    {
      name: ["التدريبُ المكثّف", "Intensive training"],
      sessionFrom: 7, sessionTo: 18,
      timeframe: ["الجلسات ٧–١٨ (الأسبوعان الثاني والثالث)، والقياسُ في الجلسة ١٢", "Sessions 7–18 (the second and third weeks), with measurement at session 12"],
      goals: [
        "هوائيٌّ ٣٠ دقيقة فأكثر بنحو ٦٠–٨٠٪ من أقصى النبض أو ببورغ ١٣–١٧ باستمرار، وقوّةٌ ٢–٣ × ٨–١٢ بنحو ٦٠–٨٠٪ من أقصى ثقل، وتوازنٌ متحدٍّ متدرّج مع الخطوة الإنقاذية والمهمّة الثانية حين يثبت الأداءُ وحده، والإشاراتُ وحيلُ التجمّد والاستدارة والنقل يستعملها في فترة عمل الدواء، والسيرُ المتحرّك أو الروبوتُ بمساره، والبرنامجُ المنزليّ ثلاثاً في الأسبوع فأكثر بسجلّ.",
        "Aerobic work for 30 minutes or more at about 60–80% of maximum heart rate or Borg 13–17, continuously; strength 2–3 × 8–12 at about 60–80% of the maximum load; challenging, progressive balance with reactive stepping and a second task once single-task performance is stable; cueing and the freezing, turning and transfer strategies used in the 'on' period; the treadmill or the robot by pathway; and the home programme three times a week or more with a diary.",
      ],
      education: [
        "• التوازنُ يحتاج ١٦–٣٠ ساعة في ٥–١٠ أسابيع، والإشرافُ يرفع الثقة (Osborne 2022).\n" +
        "• الإشارةُ تبقى معه، فأثرُها يخفت بعد ستّة أسابيع بلاها (Nieuwboer 2007).\n" +
        "• تدريبُ التجمّد في مواقفه هو، لا التمرينُ العامّ (Gilat 2021).\n" +
        "• الشدّةُ ببورغ لا بالنبض وحده (Speelman 2012).",
        "• Balance needs 16–30 hours over 5–10 weeks, and supervision builds confidence (Osborne 2022).\n" +
        "• The cue stays with the person, as its effect fades by six weeks without it (Nieuwboer 2007).\n" +
        "• Freezing training happens in the person's own triggers, not through generic exercise (Gilat 2021).\n" +
        "• Intensity by Borg, not by heart rate alone (Speelman 2012).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• في قياس الجلسة ١٢ (أو إعادته في ١٨): تقدّمٌ بالفرق المهمّ أو بأصغر تغيّرٍ يُكتشف في مقياسٍ واحد على الأقلّ — سرعةُ المشي +٠٫١٤ م/ث (Hass 2014)، أو النهوضُ والمشي −١ ثانية (Taghizadeh 2025)، أو ميني-بيست +٤ (Godi 2020)، أو الجلوسُ والقيامُ ثلاثين ثانية +٣ (Petersen 2017) — أو ثباتٌ وأهدافٌ صارت تحتاج النقلَ إلى المهامّ الحقيقية.\n" +
        "• يستعمل حيلَ التجمّد والاستدارة والنقل في فترة عمل الدواء بلا تذكير.\n" +
        "• البرنامجُ المنزليّ ثلاثاً في الأسبوع فأكثر بسجلّ.\n" +
        "(اقتراحٌ لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when all are met:\n" +
        "• At the session-12 measurement (or its repeat at 18): a gain of at least the important difference or the minimal detectable change on one or more measures — walking speed +0.14 m/s (Hass 2014), the timed up and go −1 second (Taghizadeh 2025), the Mini-BESTest +4 (Godi 2020), or the 30-second sit-to-stand +3 (Petersen 2017) — or a plateau with goals that now need transfer to real tasks.\n" +
        "• Uses the freezing, turning and transfer strategies in the 'on' period without reminders.\n" +
        "• The home programme three times a week or more with a diary.\n" +
        "(A proposal, not a tested criterion.)",
      ],
      notes: [
        "• الهوائيّ: ٣٠ دقيقة فأكثر بنحو ٦٠–٨٠٪ من أقصى النبض أو ببورغ ١٣–١٧ (Keus 2014 · Osborne 2022)، وللمرض المبكّر بإذن الطبيب حتى ٨٠–٨٥٪ على السير المتحرّك (Schenkman 2018)، وباستمرارٍ لا بفترات (Uc 2014).\n" +
        "• القوّة: ٢–٣ × ٨–١٢ بنحو ٦٠–٨٠٪ من أقصى ثقل، و+٢٪ حين يبلغ ٣ × ١٥ بإتقان (Keus 2014 · Osborne 2022).\n" +
        "• التوازن: متحدٍّ ومتدرّج (Conradsson 2015)، والخطوةُ الإنقاذية، والمهمّةُ الثانية حين يثبت الأداءُ وحده (Strouwen 2017)، والخطوُ إلى الخلف بجانب سندٍ وحده (Keus 2014).\n" +
        "• السيرُ المتحرّك (Mehrholz 2015) أو الروبوتُ بمساره (في سطره)، وبالحزام لمن خطرُه عالٍ (Osborne 2022).\n" +
        "• القياسُ في الجلسة ١٢ — منتصفُ الكتلة (Keus 2014).",
        "• Aerobic: 30 minutes or more at about 60–80% of maximum heart rate or Borg 13–17 (Keus 2014 · Osborne 2022), up to 80–85% on the treadmill for early disease with the doctor's clearance (Schenkman 2018), and continuous rather than in intervals (Uc 2014).\n" +
        "• Strength: 2–3 × 8–12 at about 60–80% of the maximum load, with +2% once 3 × 15 is reached with good form (Keus 2014 · Osborne 2022).\n" +
        "• Balance: challenging and progressive (Conradsson 2015), reactive stepping, and a second task once single-task performance is stable (Strouwen 2017), with backward stepping only beside a support (Keus 2014).\n" +
        "• The treadmill (Mehrholz 2015) or the robot by pathway (in its line), with a harness for those at high risk (Osborne 2022).\n" +
        "• Measurement at session 12 — halfway through the block (Keus 2014).",
      ],
      exercises: [
        { code: "pd-big-amplitude-movements", sets: 2, reps: 10 },
        { code: "pd-metronome-cued-walking", sets: 1, reps: 1,
          doseNote: ["٢٠–٣٠ دقيقة، والإيقاعُ حتى +١٠٪ في الخارج لمن لا يتجمّد وحتى −١٠٪ لمن يتجمّد (Keus 2014).", "20–30 minutes, with the beat up to +10% outdoors for non-freezers and down to −10% for freezers (Keus 2014)."] },
        { code: "pd-freezing-release-strategies", sets: 3, reps: 5,
          note: ["لمن يتجمّد — في مواقفه هو.", "For freezers — in their own triggers."] },
        { code: "pd-arc-turning-narrow-spaces", sets: 3, reps: 5 },
        { code: "pd-chair-rise-sequence", sets: 2, reps: 8,
          note: ["مقعدٌ أخفض ومهمّةٌ ثانية.", "A lower seat and a second task."] },
        { code: "pd-fast-cadence-cycling", sets: 1, reps: 1,
          note: ["بدلَ الدرّاجة المعتادة يومين أو ثلاثة في الأسبوع.", "Instead of ordinary cycling on two or three days a week."] },
        { code: "overground-gait-training", sets: 1, reps: 1,
          note: ["خطواتٌ كبيرة وأرجحةُ الذراعين، والعوائقُ والتوقّفُ المفاجئ وتغييرُ الاتّجاه (Keus 2014).", "Big steps and arm swing, with obstacles, sudden stops and changes of direction (Keus 2014)."] },
        { code: "hit-treadmill-walking", sets: 1, reps: 1,
          note: ["للمرض المبكّر وحده، بإذن الطبيب وبالحزام — والدوسُ المستمرّ أسلمُ من الفترات (Schenkman 2018 · Uc 2014).", "For early disease only, with the doctor's clearance and a harness — continuous work is safer than intervals (Schenkman 2018 · Uc 2014)."] },
        { code: "leg-press-progressive", sets: 3, reps: 10,
          doseNote: ["٢–٣ × ٨–١٢ بنحو ٦٠–٨٠٪ من أقصى ثقل، و+٢٪ حين يبلغ ٣ × ١٥ (Keus 2014 · Osborne 2022).", "2–3 × 8–12 at about 60–80% of the maximum load, with +2% once 3 × 15 is reached (Keus 2014 · Osborne 2022)."] },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["بلا يدين ثمّ بثقلٍ في الحضن.", "Without hands, then with a weight held in the lap."] },
        { code: "step-up", sets: 2, reps: 10 },
        { code: "standing-hip-three-way", sets: 2, reps: 10 },
        { code: "band-row", sets: 2, reps: 12,
          note: ["للظهر المنحني، مع بسط الصدر.", "For the stooped back, with the chest lifted."] },
        { code: "osteo-back-extension", sets: 1, reps: 5, hold: 5, rest: 30,
          note: ["أو بالمطّاط واقفاً لمن لا ينبطح.", "Or standing with a band for those who cannot lie face down."] },
        { code: "reactive-stepping-practice", sets: 3, reps: 5,
          note: ["بجانب سندٍ وبحضور الأخصائيّ.", "Beside a support and with the specialist present."] },
        { code: "osteo-tandem-walk", sets: 3, reps: 10, rest: 30 },
        { code: "osteo-backward-turn-walk", sets: 2, reps: 10,
          note: ["بجانب سندٍ وحده — الخطوُ إلى الخلف قد يُسقط (Keus 2014).", "Beside a support only — backward stepping can cause falls (Keus 2014)."] },
        { code: "obstacle-dual-task-walking", sets: 1, reps: 5,
          note: ["المهمّةُ الثانية حين يثبت المشيُ وحده (Strouwen 2017).", "The second task once walking alone is stable (Strouwen 2017)."] },
        { code: "stairs-speed-training", sets: 1, reps: 3,
          note: ["بالدرابزين، والنزولُ ببطءٍ وتحكّم (Dibble 2006).", "With the rail, and coming down slowly with control (Dibble 2006)."] },
        { code: "pd-home-dexterity-tasks", sets: 1, reps: 10 },
        { code: "pd-prayer-with-parkinsons", sets: 1, reps: 3,
          note: ["يبدأ التدريبُ في فترة عمل الدواء.", "Practice starts in the 'on' period."] },
      ],
    },
    {
      name: ["النقلُ إلى فترة الانطفاء والبيت والمجتمع", "Transfer to the 'off' period, home and community"],
      sessionFrom: 19, sessionTo: 24,
      timeframe: ["الجلسات ١٩–٢٤ (الأسبوعُ الرابع)، ثمّ البرنامجُ المنزليّ ومراجعاتٌ في ٣ و٦ أشهر", "Sessions 19–24 (the fourth week), then the home programme with reviews at 3 and 6 months"],
      goals: [
        "الحيلُ تعمل في آخر الجرعة وفي فترة الانطفاء وفي المكان الحقيقيّ (الصلاةُ والمرحاضُ والسريرُ والدرجُ والطريق)، وخطّةُ السقوط والقيامُ من الأرض مكتوبة، والمرافقُ يعرف الحيلَ ويعطي الإشارةَ ولا يشدّ، والبرنامجُ المنزليّ ثلاثاً في الأسبوع فأكثر بسجلّ ومعه خيارُ المجموعة، ومواعيدُ المراجعة والتنشيط مكتوبة.",
        "The strategies work at the end of a dose, in the 'off' period and in the real place (prayer, the toilet, the bed, stairs and the street), the falls plan and getting up from the floor are written, the companion knows the strategies and gives the cue without pulling, the home programme runs three times a week or more with a diary and a group option, and the review and booster dates are written.",
      ],
      education: [
        "• المكسبُ يزول بعد التوقّف (Wallen 2018 · Gilat 2021)، ومن بقي نشيطاً خمسَ سنين تباطأ تدهورُ مشيه وتوازنه (Tsukita 2022).\n" +
        "• لا يُعلَّم «كيف يسقط»، بل كيف يقوم من الأرض وخطّةُ من لا يستطيع (Keus 2014).\n" +
        "• المجموعةُ تساوي الفرديّ وتخفّف الكلفة (Palm 2024).",
        "• The gain fades after stopping (Wallen 2018 · Gilat 2021), and those who stayed active for five years had slower decline of walking and balance (Tsukita 2022).\n" +
        "• The person is not taught 'how to fall', but how to get up from the floor and the plan for when they cannot (Keus 2014).\n" +
        "• Groups equal individual sessions and lower the cost (Palm 2024).",
      ],
      criteria: [
        "الخروجُ من الكتلة حين يتحقّق واحدٌ ممّا يلي (Keus 2014):\n" +
        "• بلغ أهدافَه بمقياس بلوغ الأهداف.\n" +
        "• أو لم يتغيّر بأصغر تغيّرٍ يُكتشف في قياسين متتاليين («لا قيمةَ مضافة»).\n" +
        "• أو يستطيع أن يتابع وحده.\n" +
        "ومعه: السجلُّ يُظهر البرنامجَ المنزليّ ثلاثاً في الأسبوع فأكثر أسبوعين، والمرافقُ مدرَّبٌ على الحيل وخطّة السقوط. ويُكتب التغيّر في: سرعة المشي (الفرقُ المهمّ ٠٫١٤ وأصغرُ تغيّر ٠٫١٨ م/ث — Hass 2014 · Steffen 2008)، والنهوضِ والمشي (نحو ثانية، وأصغرُ تغيّر ٣٫٥ — Taghizadeh 2025 · Huang 2011)، وميني-بيست (+٤ — Godi 2020)، والجلوسِ والقيام ثلاثين ثانية (+٣ — Petersen 2017)، والمشي ستّ دقائق (أصغرُ تغيّر ٨٢ متراً — Steffen 2008)، والثقةِ بالتوازن (١٣٪ — Steffen 2008)، وجودةِ الحياة (−٤٫٧٢ — Horvath 2017b)، وسجلِّ السقطات.\n" +
        EXTEND_AR,
        "Discharge from the block when one of these is met (Keus 2014):\n" +
        "• The goals are met on Goal Attainment Scaling.\n" +
        "• Or no change of at least the minimal detectable change across two consecutive tests ('no added value').\n" +
        "• Or the person can continue alone.\n" +
        "Together with: the diary shows the home programme three times a week or more for two weeks, and the companion is trained in the strategies and the falls plan. The change is reported in: walking speed (important difference 0.14 and minimal detectable change 0.18 m/s — Hass 2014 · Steffen 2008), the timed up and go (about one second, minimal detectable change 3.5 — Taghizadeh 2025 · Huang 2011), the Mini-BESTest (+4 — Godi 2020), the 30-second sit-to-stand (+3 — Petersen 2017), the six-minute walk (minimal detectable change 82 metres — Steffen 2008), balance confidence (13% — Steffen 2008), quality of life (−4.72 — Horvath 2017b), and the falls diary.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• الحيلُ في آخر الجرعة أو في فترة الانطفاء بعد إتقانها في فترة العمل (Keus 2014).\n" +
        "• المهامُّ الحقيقية: الصلاة، والمرحاض، والسرير، والدرج، والمشيُ في الخارج بإيقاعٍ حتى +١٠٪ (Keus 2014).\n" +
        "• القيامُ من الأرض وخطّةُ السقوط، بلا تعليم السقوط (Keus 2014).\n" +
        "• تسليمُ البرنامج المنزليّ بالصور، وخيارُ المجموعة أو المشي في الحيّ (Palm 2024 · Mak 2021)، والقياسُ الختاميّ في الجلسة ٢٤ ورسالةٌ لطبيب الأعصاب بالنتائج.",
        "• The strategies at the end of a dose or in the 'off' period, after mastering them in the 'on' period (Keus 2014).\n" +
        "• The real tasks: prayer, the toilet, the bed, stairs, and walking outdoors with a beat up to +10% (Keus 2014).\n" +
        "• Getting up from the floor and the falls plan, without teaching how to fall (Keus 2014).\n" +
        "• Handing over the home programme with pictures, and the group or neighbourhood-walking option (Palm 2024 · Mak 2021), with the final measurement at session 24 and a letter to the neurologist with the results.",
      ],
      exercises: [
        { code: "pd-freezing-release-strategies", sets: 3, reps: 5,
          note: ["في آخر الجرعة أو فترة الانطفاء، وفي البيت مع المرافق.", "At the end of a dose or in the 'off' period, and at home with the companion."] },
        { code: "pd-arc-turning-narrow-spaces", sets: 3, reps: 5,
          note: ["في الحمّام والمطبخ ومكان الصلاة.", "In the bathroom, the kitchen and the place of prayer."] },
        { code: "pd-chair-rise-sequence", sets: 2, reps: 8,
          note: ["في فترة الانطفاء، وعلى كراسي البيت.", "In the 'off' period, and on the chairs at home."] },
        { code: "pd-bed-turning-sequence", sets: 1, reps: 5,
          note: ["على سريره، صباحاً.", "On the person's own bed, in the morning."] },
        { code: "pd-prayer-with-parkinsons", sets: 1, reps: 3,
          note: ["ركعاتٌ للتدريب في الجلسة، ثمّ الصلواتُ اليومية.", "Practice prayer units in the session, then the daily prayers."] },
        { code: "pd-metronome-cued-walking", sets: 1, reps: 1,
          note: ["في الخارج والطريقِ إلى المسجد والسوق.", "Outdoors, on the way to the mosque and the market."] },
        { code: "pd-orthostatic-safe-rising", sets: 1, reps: 1,
          note: ["روتينٌ في البيت كلَّ صباح.", "A home routine every morning."] },
        { code: "pd-home-dexterity-tasks", sets: 1, reps: 10,
          note: ["يومياً في البيت.", "Daily at home."] },
        { code: "pd-fast-cadence-cycling", sets: 1, reps: 1,
          note: ["لمن عنده درّاجة — ثلاثاً في الأسبوع.", "For those with a bike — three times a week."] },
        { code: "graded-walking", sets: 1, reps: 1,
          doseNote: ["١٥٠ دقيقة في الأسبوع فأكثر موزّعةً على أكثر الأيّام (Bull 2020 · Mittal 2026)، وزيادةُ ٥٨١ خطوة في اليوم فرقٌ مهمّ (Bianchini 2025).", "150 minutes a week or more spread over most days (Bull 2020 · Mittal 2026), with a rise of 581 steps a day as an important difference (Bianchini 2025)."] },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["في البيت بثقلٍ في الحضن، مرّتين في الأسبوع.", "At home with a weight in the lap, twice a week."] },
        { code: "osteo-floor-rise", sets: 1, reps: 2, rest: 120,
          note: ["بحضور أحد الأهل، وخطّةُ من لا يستطيع.", "With a family member present, and the plan for when the person cannot."] },
        { code: "osteo-tai-chi", sets: 1, reps: 1,
          note: ["لمن يرغب — أدنى جرعته ٢٤ أسبوعاً مرّتين في الأسبوع ساعة (Keus 2014)، وأنقص السقوط (Li 2012).", "For those who wish — its minimum is 24 weeks twice a week for an hour (Keus 2014), and it reduced falls (Li 2012)."] },
        { code: "car-transfer", sets: 1, reps: 3,
          note: ["بالحيلة المقسّمة إلى خطوات.", "With the strategy split into steps."] },
        { code: "osteo-home-hazard-footwear", sets: 1, reps: 1,
          note: ["مراجعةُ ما تغيّر في البيت.", "A review of what has changed at home."] },
      ],
    },
  ],
};

// «اضغطه يا سليم» (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz).
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ جلسة بستٍّ في الأسبوع (أربعةُ أسابيع) للمسار الرئيس وتمديدٌ واحد باثنتي عشرة بمعياره، ثمّ البيتُ ثلاثاً في الأسبوع فأكثر حتى الأسبوع ١٢ وبعده ومراجعاتٌ في ٣ و٦ أشهر — ولا تجربةَ قارنت ستّاً في الأسبوع بثلاث، وأدنى جرعة الإرشاد ثلاثٌ في الأسبوع ثمانيةَ أسابيع، وعددُ الجلسات في الأسبوع لم يغيّر الأثرَ في ستٍّ وأربعين تجربة: أتبقيه ٦ × ٤ أم ٣ × ٨ (الجلساتُ الأربعُ والعشرون نفسُها)؟ ومَن يُحضر المريضَ ستَّ مرّاتٍ في الأسبوع؟ ومَن يتابع البيتَ بين المراجعات — مجموعةٌ في المركز؟",
    en: "24 sessions at six a week (four weeks) for the main pathway with one extension of twelve by its criterion, then home three times a week or more to week 12 and beyond with reviews at 3 and 6 months — no trial has compared six a week with three, the guideline minimum is three a week for eight weeks (Keus 2014), and the number of sessions per week did not change the effect in 46 trials (El Hayek 2023): keep it 6 × 4, or 3 × 8 (the same 24 sessions)? Who brings the patient six times a week? And who follows the home programme between reviews — a group at the centre (Palm 2024)?" },
  { key: "limits", topic: "limits",
    ar: "الحدود: الفرقُ المهمّ في سرعة المشي ٠٫١٤ م/ث وأصغرُ تغيّرٍ يُكتشف ٠٫١٨، والنهوضُ والمشي نحو ثانية وأصغرُ تغيّره ٣٫٥ ثانية، وميني-بيست ٤، والجلوسُ والقيامُ ثلاثين ثانية ٣، وجودةُ الحياة ٤٫٧٢؛ والتوقّفُ بهبوط الانقباضيّ أكثرَ من ١٠ ملم زئبق أثناء التمرين، والشدّةُ ببورغ ١٣–١٧ — والانتقالُ بين المراحل والتمديدُ وعتباتُ التنشيط بها اقتراحٌ لا معيارٌ مجرَّب: أتقبلها؟",
    en: "The limits: the important difference in walking speed is 0.14 m/s (Hass 2014) with a minimal detectable change of 0.18 (Steffen 2008), the timed up and go about one second (Taghizadeh 2025) with a minimal detectable change of 3.5 seconds (Huang 2011), the Mini-BESTest 4 (Godi 2020), the 30-second sit-to-stand 3 (Petersen 2017), and quality of life 4.72 (Horvath 2017b); stopping for a systolic fall of more than 10 mmHg during exercise, and intensity by Borg 13–17 (Keus 2014) — progression between phases, the extension and the booster thresholds built on them are proposals, not tested criteria: do you accept them?" },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة مع طبيب المركز وطبيب الأعصاب: الطوارئ (حمّى مع تيبّسٍ واضطراب بعد إيقاف الدواء، وألمُ الصدر واضطرابُ النبض، والسقوطُ مع ضربة رأسٍ أو كسرٍ مشكوكٍ فيه، والشرقةُ مع حمّى أو سعال، والإغماء)؛ وإلى طبيب الأعصاب: هبوطُ الضغط الانتصابيّ لمراجعة الأدوية، والسقوطُ الكثير المبكّر أو ضعفُ الاستجابة لليفودوبا، والهلاوس، ونوبُ النوم، والاكتئابُ والذاكرة، وأدويةُ السقوط، وصحّةُ العظم؛ وإلى النطق والبلع. مَن يقيس الضغطَ مستلقياً وواقفاً؟ ومَن يكتب الفحصَ الحركيّ (٣٤ فأكثر مرحلةٌ معقّدة لا تمرينَ فيها بلا إشراف)؟ وهل في المركز أخصائيُّ نطقٍ وبلع؟",
    en: "The referral rules with the centre's doctor and the neurologist: emergency (fever with rigidity and confusion after stopping medicines — Newman 2009, chest pain and an irregular pulse — Keus 2014, a fall with a head injury or suspected fracture, choking with fever or cough — Won 2021, and fainting — Fanciulli 2020b); to the neurologist: low blood pressure on standing for a medicine review (Gibbons 2017 · NICE NG71 2017), frequent early falls or a poor levodopa response (Montero-Odasso 2022), hallucinations, sleep attacks, depression and memory, fall-related medicines (Bloem 2001), and bone health; and to speech and swallowing (Kalf 2012 · Ramig 2018). Who measures blood pressure lying and standing (Lim 2024)? Who enters the motor examination, where 34 or more is the complex stage with no unsupervised exercise (Montero-Odasso 2022)? And does the centre have a speech and swallowing therapist?" },
  { key: "pathways", topic: "content",
    ar: "المسارات: المبكّرُ (المرحلة ١–٢ بلا سقوطٍ ولا تجمّد) ١٢ جلسة ثمّ البيتُ بمراجعات، والرئيسُ ٢٤، والمتأخّرُ (المرحلة ٥) ١٢ جلسة لتدريب المرافق — أتقبلها؟ والشدّةُ العالية على السير المتحرّك (٨٠–٨٥٪ من أقصى النبض) للمرض المبكّر بإذن الطبيب وبالحزام: أنقدّمها، ومَن يفحص القلبَ قبلها؟ وكتلةُ التنشيط ١٢ جلسة: كلَّ ٦–١٢ شهراً لكلّ مريض، أم حين تنقص سرعةُ المشي أو التوازن أو يزيد السقوط وحده؟",
    en: "The pathways: early (stage 1–2 without falls or freezing) 12 sessions then home with reviews (NICE NG71 2017 · Mak 2021), main 24, and late (stage 5) 12 sessions of carer training (Keus 2014) — do you accept them? High-intensity treadmill work (80–85% of maximum heart rate) for early disease with the doctor's clearance and a harness (Schenkman 2018): do we offer it, and who checks the heart first? And the 12-session booster: every 6–12 months for everyone, or only when walking speed or balance falls or falls increase (Frazzitta 2012 · Wallen 2018)?" },
  { key: "implants-devices", topic: "devices",
    ar: "الأجهزةُ المزروعة: نمنع لمن عنده منبّهُ الدماغ كلَّ جهازٍ فيه مكوّنٌ كهربائيّ — الموجاتُ القصيرة والتيكار والأمواجُ فوق الصوتية والتحفيزُ العصبيّ والتيّارُ المتداخل والمغناطيس — ولا ضغطَ باليد قربَ الأسلاك، ولمن عنده منظّمُ القلب أو مزيلُ الرجفان التيكارَ والتحفيز: أنوافق؟ ومَن يسأل كلَّ مريضٍ عنها ويكتبها في ملفّه قبل الجلسة الأولى — الاستقبالُ أم الطبيب أم الأخصائيّ؟ وهل نضع علامةً ظاهرة على ملفّ من عنده جهازٌ مزروع؟",
    en: "Implanted devices: for a patient with a deep brain stimulator we ban every device with an electrical component — shortwave, TECAR, ultrasound, nerve stimulation, interferential current and magnetic therapy — and manual pressure near the wires (Keus 2014 · Nutt 2001 · Roark 2008), and for a pacemaker or defibrillator TECAR and nerve stimulation (Costantino 2026 · Arain 2023): do you agree? Who asks every patient about them and writes them in the file before the first session — reception, the doctor or the specialist? And do we put a visible flag on the file of anyone with an implant?" },
  { key: "on-timing", topic: "content",
    ar: "التوقيت: أنحجز الجلسةَ في أحسن ساعات عمل الدواء عنده، ونتدرّب على الحيل في فترة الانطفاء في المرحلة الثالثة وحدها؟ وفي رمضان: الجلسةُ بعد الإفطار في قاعةٍ مكيّفة — لا خلال ساعتين من وجبةٍ كبيرة لمن عنده هبوطُ الضغط — ومراجعةُ الأدوية مع طبيب الأعصاب قبل رمضان بأسبوعين إلى أربعة؟ وفي الصيف: قبل الثامنة صباحاً أو بعد السادسة مساءً، وما خطّةُ انقطاع الكهرباء في القاعة؟",
    en: "Timing: do we book sessions in the person's best 'on' hours, and practise the strategies in the 'off' period in phase 3 only (Keus 2014)? In Ramadan: the session after Iftar in an air-conditioned room — not within two hours of a large meal for those with low blood pressure on standing (Gibbons 2017) — and a medicine review with the neurologist two to four weeks before Ramadan (Mittal 2025)? In summer: before 8 a.m. or after 6 p.m. (Mittal 2026), and what is the plan for power cuts in the hall?" },
  { key: "device-others", topic: "devices",
    ar: "الروبوتُ مساعدٌ لمن هو في المرحلة ٣–٤ ولمن يتجمّد ولمن يمشي بمساعدة ولمن لا يأمن على السير المتحرّك، ٣٠–٤٥ دقيقة وحملُ الوزن حتى ٢٠٪ — أنحصره بهم؟ وما سرعتُه ونسبةُ توجيهه في جهاز المركز (لم تُذكرا)؟ والتحفيزُ العصبيّ لألم العضلات وحده بإعدادات التجربة (١٠٠ هرتز، ١٠٠ ميكروثانية، عتبةُ الحركة، ٢٠ دقيقة)، والكمادةُ موضعيةً جالساً أو مستلقياً: أنستعملهما؟ والمغناطيسُ والشمعُ والأشعّةُ تحت الحمراء والتيكارُ والأمواجُ والليزرُ والموجاتُ الصادمة والضغطُ والشدُّ والجهازُ السلبيّ والإبرُ «لا يُستخدم»، والاهتزازُ للجسم كلّه ضدّه توصيةٌ قويّة.",
    en: "The robot is an adjunct for those at stage 3–4, freezers, those who walk with help and those unsafe on the treadmill, 30–45 minutes with body-weight support up to 20% (Capecci 2019 · Picelli 2012 · Miyai 2000) — do we keep it to them? What speed and guidance force does the centre's device use (not reported)? Nerve stimulation for muscle pain only with the trial settings (100 Hz, 100 µs, motor threshold, 20 minutes — Garcez 2026), and the hot pack locally, sitting or lying: do we use them? Magnetic therapy, wax, infrared, TECAR, ultrasound, laser, shockwave, compression, traction, the passive-motion device and needles are 'not used' (Malling 2018 · Brandin-de la Cruz 2022), and whole-body vibration has a strong recommendation against it (Keus 2014)." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: الجلوسَ والقيامَ ثلاثين ثانية (مرّات، الأكثر أفضل)، والنهوضَ والمشي مع مهمّةٍ ذهنية (ثوانٍ)، واستبيانَ تجمّد المشي الجديد (لا نسخةَ عربية له ولا فرقَ مهمّاً)، وعددَ السقطات في سجلّها، واستبيانَ جودة الحياة PDQ-39 (نسخُه العربية ضعيفة — أيُّها نعتمد؟)، ومقياسَ بلوغ الأهداف، والثقةَ بالتوازن بالعربية، والمشيَ ستّ دقائق بالمتر، وبيرغ، والخطواتِ اليومية؛ والفحصُ الحركيّ مزروع — يكتبه الطبيب أو أخصائيٌّ مدرَّب بالنسخة العربية الرسمية؟ وميني-بيست مزروع — بالنسخة العربية التي جُرّبت في مرضى أعصابٍ مختلطين؟",
    en: "Add under 'Measures' → custom measure: the 30-second sit-to-stand (repetitions, higher is better — Petersen 2017), the timed up and go with a mental task (seconds — Vance 2015 · Taghizadeh 2025), the New Freezing of Gait Questionnaire (no Arabic version and no important difference — Nieuwboer 2009), the number of falls in the diary (Keus 2014 · Ashburn 2008), the PDQ-39 (its Arabic versions are weak — Shalash 2018 · Ahmadou 2020 · Al-Khammash 2023 · Azaiez 2024 — which do we adopt?), Goal Attainment Scaling (Keus 2014), balance confidence in Arabic (Elboim-Gabyzon 2019), the six-minute walk in metres (Steffen 2008), the Berg (Donoghue 2009), and daily steps (Bianchini 2025); the motor examination is seeded — entered by the doctor or a trained specialist with the official Arabic version (Khalil 2022)? The Mini-BESTest is seeded — with the Arabic version tested in mixed neurological patients (Alyousef 2023)?" },
];

export const name = "174_physio_parkinsons_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
