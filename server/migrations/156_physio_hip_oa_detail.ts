// Migration 156: خشونةُ مفصل الورك — البروتوكولُ العشرون مفصَّلاً (§4.eo — ٢٠٢٦-١٠-١٨).
//
// المالك (٢٠٢٦-١٠-١٨): «ممتاز نكمل البروتوكول التالي» — فاختار المساعدُ خشونةَ الورك (`hip-oa-geriatric`): من أشيع أسباب الألم والعجز عند كبار السنّ —
// انتشارُها في الأشعّة ٨٫٥٥٪ في تحليلٍ جامع لإحدى وثلاثين دراسة (Fan 2023)، وخطرُها مدى الحياة ٢٥٫٣٪ (Murphy 2010)؛ ويستعمل بطاقاتِ الركبة والورك والظهر
// القائمة بصورها. **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعةُ أسابيع) — والتقويةُ الثقيلة يوماً بعد يوم كما في التجارب — وتمديدٌ
// واحد بستٍّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين في الأسبوعين السادس والثاني عشر؛ وثلاثُ مراحل
// بنطاقات (١–٦ · ٧–١٦ · ١٧–٢٤) بمعايير الفرق المهمّ (الألمُ نقطتان، والجلوسُ والقيامُ ٣٠ ثانية +٢، والأنشطةُ المختارة +٢) **وقاعدةُ ألمٍ بالإشارة الضوئية**
// (٠–٢ آمن، ٣–٥ مقبول، فوق ٥ كثير، وصباحُ اليوم التالي)؛ وخمسُ بطاقاتٍ جديدة (تمطيطُ التدوير الداخليّ، والرجوعُ على أربع، والشدُّ الطوليّ للورك باليد،
// والمشيُ بالعصا في اليد المقابلة، والصلاةُ والجلوسُ على الأرض لخشونة الورك) والمعادةُ بصورها؛ والأجهزةُ الخمسةَ عشرَ بدرجة دليلها و«استعمال المركز»؛
// والمقاييسُ كما زُرعت (ونتائجُ الورك HOOS بلا نسخةٍ عربية مُتحقَّقة — بندٌ لسليم)؛ وبنودُ «اضغطه يا سليم» بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ خشونةَ الورك**: التمرينُ هو العلاجُ الأساسيّ في كلّ إرشاد — والعلاجُ اليدويّ داخلَه، **وفيه خلافٌ مكتوب**: إرشادُ JOSPT يعطيه A (Koc 2025)،
// والمعهدُ البريطانيّ «مع التمرين وحده» (NICE NG226)، والكلّيةُ الأمريكية «مشروطٌ ضدّ إضافته» (Kolasinski 2020)، والهولنديّ ضدّ التحريك السلبيّ؛
// **والعصا في اليد المقابلة** توصيةٌ قوية (Kolasinski 2020). **والجرعة**: التجاربُ مرّةً إلى ثلاثٍ في الأسبوع خمسةَ أسابيع إلى ستّةَ عشرَ، وأكثرُها مرّتين
// اثني عشرَ أسبوعاً (٢٤ جلسة) — ولا تجربةَ لخمسٍ أو ستٍّ في الأسبوع (بحثٌ صفريّ) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً وبندٌ لسليم. **والأجهزة**: التمرينُ
// أساسيّ؛ والشدُّ والتحفيزُ والتيكارُ والمغناطيسُ والحرارةُ مساعدةٌ بقاعدة المركز والدليلُ ضدّ أكثرها مكتوب؛ والإبرُ الجافّة مساعدٌ بموعدٍ دوريّ (A في JOSPT و«لا
// تُقدَّم» عند NICE)؛ والأمواجُ فوق الصوتية والليزرُ والصادمةُ «لا يُستخدم» — **فلا إعداداتِ جهازٍ تمنع اعتمادَه**. **وما يخصّ العراق**: لا دراسةَ عراقية
// لخشونة الورك (بحثٌ صفريّ)، **وفقرُ الدم المنجليّ في أقصى الجنوب والشمال** (Al-Allawi 2012) يرفع أولويةَ فحص نخر رأس الفخذ، ولا دراسةَ للصلاة والمرحاض العربيّ.
//
// المصادرُ كلُّ معرّفٍ منها طوبق آلياً مع Europe PMC وCrossref (٢١٣ مرجعاً في تقرير البحث، وفي الترحيل ما ذُكر في النصّ)، والإرشاداتُ من نصوصها.
// القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — خمس؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٢٨ و١٣٠ و١٣٨ و١٤٠ و١٥٥) تُربط برموزها وصورها، وما يخصّ الوركَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  {
    code: "hip-internal-rotation-stretch", nameAr: "تمطيط التدوير الداخليّ للورك", nameEn: "Hip internal-rotation stretch",
    kind: "stretch", region: "hip", perSide: true, homeSuitable: true, sets: 1, reps: 3, hold: 45, rest: 15,
    purpose: ["يعيد التدويرَ الداخليّ للورك — أوّلَ ما ينقص في الخشونة وأكثرَه دلالةً عليها (Birrell 2001)، وحدُّه في الإرشاد أقلُّ من ٢٤° أو ١٥° أقلّ من الجهة الأخرى (Koc 2025)؛ ويحتاجه المريضُ للسجود والركبتان متقاربتان وللدخول إلى السيارة. والتمطيطُ الذاتيّ ٤٥ ثانية ثلاثَ مرّات مرّتين يومياً هو ما استعملته التجربةُ للمقارنة (Ceballos-Laita 2022)، ولا تجربةَ للتمطيط وحده في خشونة الورك (بحثٌ صفريّ) — فهو جزءٌ من البرنامج لا علاجٌ وحده.",
      "Restores hip internal rotation — the first movement to be lost in osteoarthritis and the one that points to it most (Birrell 2001); the guideline's threshold is below 24° or 15° less than the other side (Koc 2025); the patient needs it for prostration with the knees close together and for getting into a car. Self-stretching for 45 seconds three times, twice a day, is what the trial used as its comparison (Ceballos-Laita 2022), and there is no trial of stretching alone in hip osteoarthritis (a documented zero result) — so it is part of the programme, not a treatment on its own."],
    start: ["جالسٌ على كرسيٍّ ثابت، والقدمان على الأرض، والركبتان بعرض الورك — أو منبطحاً والركبتان مثنيّتان ٩٠° لنسخةٍ أسهل.",
      "Sitting on a firm chair with the feet flat and the knees hip-width apart — or lying face down with the knees bent to 90° for an easier version."],
    steps: [[
      "قرّب الركبتين حتى تتلامسا وأبقِهما متلاصقتين.",
      "حرّك قدمَ الجهة المتألّمة إلى الخارج على الأرض ببطء، فيدور الفخذُ إلى الداخل.",
      "توقّف عند أوّل شدٍّ تشعر به في الألية أو جانب الورك — لا عند ألمٍ في الأربية.",
      "اثبت ٤٥ ثانية وتنفّس بهدوء، ثمّ أرخِ ١٥ ثانية.",
      "أعد ثلاثَ مرّات. ومنبطحاً: اترك القدمين تسقطان إلى الخارج معاً كمسّاحتَي السيارة واثبت.",
    ], [
      "Bring the knees together until they touch and keep them together.",
      "Slide the foot on the painful side slowly outwards on the floor, so the thigh rotates inwards.",
      "Stop at the first stretch you feel in the buttock or the side of the hip — not at groin pain.",
      "Hold for 45 seconds, breathing calmly, then relax for 15 seconds.",
      "Repeat three times. Lying face down: let both feet fall outwards together like windscreen wipers and hold.",
    ]],
    cues: [[
      "رفعُ الألية عن الكرسيّ ⟵ الأليتان على المقعد طوالَ الحركة.",
      "تدويرُ الجذع بدل الفخذ ⟵ الجذعُ ثابتٌ والكتفان إلى الأمام.",
      "الدفعُ إلى ألمٍ حادّ في الأربية ⟵ مدىً أقلّ وثباتٌ أطول.",
    ], [
      "Lifting the buttock off the chair → both buttocks stay on the seat throughout.",
      "Turning the trunk instead of the thigh → the trunk still and the shoulders facing forward.",
      "Pushing into sharp groin pain → a smaller range and a longer hold.",
    ]],
    easier: ["منبطحاً بوسادةٍ تحت البطن ومدىً أصغر، أو ساقٌ واحدة في كلّ مرّة.", "Lying face down with a pillow under the abdomen and a smaller range, or one leg at a time."],
    harder: ["جالساً ومطّاطٌ يسحب القدمَ إلى الخارج، أو بيد المعالج في آخر المدى مع حركة المريض (Beselga 2016).", "Sitting with a band pulling the foot outwards, or with the therapist's hands at end range during the patient's movement (Beselga 2016)."],
    stopIf: ["ألمٌ في الأربية فوق ٥ من ١٠ أثناءه، أو ألمٌ لا يعود إلى المعتاد صباحَ اليوم التالي ⟵ مدىً أقلّ ويخبر الأخصائيّ.",
      "Groin pain above 5/10 during it, or pain not back to usual by the next morning → a smaller range and tell the therapist."],
    equipment: ["كرسيٌّ ثابت بلا عجلات، أو سريرٌ للانبطاح.", "A firm chair without wheels, or a bed for lying face down."],
    doseNote: ["٣ × ٤٥ ثانية بينها ١٥ ثانية، مرّتين يومياً في البيت — جرعةُ التمطيط في التجربة (Ceballos-Laita 2022).", "3 × 45 seconds with 15 seconds between, twice a day at home — the trial's stretching dose (Ceballos-Laita 2022)."],
    images: [{ key: "hip-internal-rotation-stretch-1", ar: "جالسٌ على حافّة سرير والفاحصُ يدير ساقَه إلى الخارج فيدور الفخذُ إلى الداخل (صورةُ قياسٍ من بحث، بهاتفٍ على الساق) — والمريضُ يؤدّيها وحده والركبتان متلاصقتان كما في الخطوات",
      en: "Sitting on the edge of a couch while the examiner turns the lower leg outwards so the thigh rotates inwards (a measurement photo from a study, with a phone on the shin) — the patient does it alone with the knees together, as in the steps", search: "seated hip internal rotation stretch knees together" }],
  },
  {
    code: "quadruped-rock-back", nameAr: "الرجوع على أربع نحو الكعبين (ثني الورك للسجود)", nameEn: "Quadruped rock-back (hip flexion for prostration)",
    kind: "mobility", region: "hip", homeSuitable: true, sets: 2, reps: 10, hold: 5,
    purpose: ["يكسب ثنيَ الورك بلا ألمٍ وهو يحمل الوزن في وضعٍ يشبه السجود — فالسجودُ يحتاج ثنياً يشبه جلسةَ الركوع اليابانية، والجلوسُ الأخير بالساقين في وضعين مختلفين أقصى مدىً في الصلاة (Jamari 2017)؛ ويُعطي المريضَ طريقاً متدرّجاً إلى السجود والجلوس على الأرض. ولا تجربةَ له في خشونة الورك (بحثٌ صفريّ) — اقتراحٌ يُراجع بقاعدة الألم.",
      "Gains pain-free hip flexion while bearing weight in a position like prostration — prostration needs flexion similar to the Japanese kneeling bow, and the final sitting with the two legs in different positions is the most extreme range in prayer (Jamari 2017); it gives the patient a graded route back to prostration and floor sitting. There is no trial of it in hip osteoarthritis (a documented zero result) — a suggestion checked against the pain rule."],
    start: ["على اليدين والركبتين فوق فرشة: اليدان تحت الكتفين والركبتان تحت الوركين والظهرُ مستوٍ — ووسادةٌ تحت الركبتين إن آلمهما الركوع.",
      "On the hands and knees on a mat: hands under the shoulders, knees under the hips and the back level — with a pillow under the knees if kneeling hurts."],
    steps: [[
      "شدّ البطنَ قليلاً وأبقِ الظهرَ مستوياً كالطاولة.",
      "أرجِع الأليتين ببطء نحو الكعبين بقدر ما يسمح الوركُ بلا ألمٍ في الأربية.",
      "اثبت خمسَ ثوانٍ في آخر مدىً مريح.",
      "عُد إلى البداية ببطء.",
      "باعِد الركبتين قليلاً إن ضاق الورك — فالتباعدُ يخفّف اجتماعَ الثني والتدوير.",
    ], [
      "Tighten the abdomen slightly and keep the back level like a table.",
      "Rock the buttocks slowly back towards the heels as far as the hip allows without groin pain.",
      "Hold for five seconds at the last comfortable point.",
      "Return slowly to the start.",
      "Widen the knees a little if the hip feels tight — a wider position eases the combined bend and rotation.",
    ]],
    cues: [[
      "تقويسُ أسفل الظهر ليبدو الثني أكبر ⟵ الظهرُ مستوٍ والحركةُ من الورك.",
      "الدخولُ في ألمٍ قارص في الأربية ⟵ مدىً أقلّ وركبتان أبعد.",
      "حبسُ النفس ⟵ زفيرٌ مع الرجوع.",
    ], [
      "Rounding the lower back to fake hip flexion → the back level and the movement from the hip.",
      "Moving into a pinching groin pain → a smaller range and wider knees.",
      "Holding the breath → breathe out while rocking back.",
    ]],
    easier: ["مدىً أصغر، أو اليدان على كرسيٍّ صغير أو أريكة (سندٌ أعلى).", "A smaller range, or the hands on a low stool or sofa (a higher support)."],
    harder: ["الرجوعُ حتى وضع السجود كاملاً، وثباتٌ ١٠–٢٠ ثانية.", "Rocking back into the full prostration position, with a 10–20-second hold."],
    stopIf: ["ألمٌ في الأربية فوق ٥ من ١٠، أو ألمٌ في الركبة، أو ألمٌ لا يهدأ صباحَ اليوم التالي ⟵ يتوقّف ويخبر الأخصائيّ.",
      "Groin pain above 5/10, knee pain, or pain not settled by the next morning → stop and tell the therapist."],
    equipment: ["فرشةٌ ووسادةٌ للركبتين.", "A mat and a pillow for the knees."],
    doseNote: ["٢–٣ × ١٠ ببطءٍ يومياً (اقتراح — لا تجربة).", "2–3 × 10 slowly, daily (a suggestion — no trial)."],
    images: [{ key: "quadruped-rock-back-1", ar: "صورتان: اليسرى البداية على اليدين والركبتين والوركُ فوق الركبة، واليمنى الأليتان راجعتان نحو الكعبين والظهرُ مستوٍ — ويدا الأخصائيّة على الحوض",
      en: "Two photos: on the hands and knees with the hip over the knee (left), then the buttocks rocked back towards the heels with the back level (right) — with the therapist's hands on the pelvis", search: "quadruped rock back hip flexion" }],
  },
  {
    code: "hip-long-axis-distraction", nameAr: "الشدّ الطوليّ للورك باليد (يؤدّيه الأخصائيّ)", nameEn: "Long-axis hip distraction (therapist technique)",
    kind: "mobility", region: "hip", perSide: true, homeSuitable: false, sets: 1, reps: 4, hold: 45, rest: 15,
    purpose: ["يخفّف الألمَ ويزيد المدى قبل التمرين: العلاجُ اليدويّ ومنه الشدُّ الطوليّ للورك بقوّةٍ عالية ومنخفضة A في إرشاد JOSPT (Koc 2025)، وتحريكُ الورك بالشدّ والدفعة فاق التمرينَ على المدى القصير (نجاحٌ ٨١٪ مقابل ٥٠٪ — Hoeksma 2004)، والشدُّ بقوّةٍ عالية (نحو ٦٩ نيوتن) زاد المدى أكثرَ من المنخفضة (Shepherd 2022). وفيه خلافٌ مكتوب: المعهدُ البريطانيّ «مع التمرين وحده» (NICE NG226)، والكلّيةُ الأمريكية مشروطٌ ضدّ إضافته (Kolasinski 2020)، ولم يُضف إلى التمرين على المدى الطويل (Runge 2022) — فهو قصير، يُتبع بالحركة النشطة في الجلسة نفسِها.",
      "Eases pain and increases range before exercise: manual therapy including high- and low-force long-axis hip distraction is grade A in the JOSPT guideline (Koc 2025), traction manipulation of the hip beat exercise in the short term (success 81% vs 50% — Hoeksma 2004), and high-force distraction (about 69 N) gained more range than low force (Shepherd 2022). The disagreement is recorded: NICE says 'only alongside exercise' (NICE NG226), the American College conditionally recommends against adding it (Kolasinski 2020), and it added nothing to exercise in the long term (Runge 2022) — so it is short, and always followed by active movement in the same session."],
    start: ["المريضُ مستلقٍ على ظهره، والوركُ في وضعه المرتخي (ثنيٌ نحو ٣٠° وتبعيدٌ نحو ٣٠° وتدويرٌ خارجيّ قليل)؛ والحزامُ حول حوض الأخصائيّ وفخذ المريض فوق الركبة — لا عبر الكاحل إن كانت الركبةُ مؤلمة أو مستبدَلة.",
      "The patient lies on the back with the hip in its loose-packed position (about 30° of flexion, about 30° of abduction and slight external rotation); a belt around the therapist's pelvis and the patient's thigh above the knee — not through the ankle if the knee is painful or replaced."],
    steps: [[
      "اختبر قبلها التدويرَ الداخليّ والثنيَ وحركةً مؤلمة (القيامُ من الكرسيّ أو المشي).",
      "ميلُ الأخصائيّ للخلف يشدّ الفخذَ على طوله شدّاً متدرّجاً ثابتاً ٣٠–٦٠ ثانية، ٣–٥ مرّات، أو بذبذباتٍ لطيفة.",
      "الدفعةُ السريعة القصيرة (حتى خمس دفعات) لمن تدرّب عليها وحده (Shepherd 2022).",
      "أعد الاختبارَ بعدها: إن زاد المدى أو خفّ الألمُ يُكمل، وإلّا يُترك.",
      "تبدأ الحركةُ النشطة والتقويةُ مباشرةً بعده في الجلسة نفسِها.",
    ], [
      "Test internal rotation, flexion and a painful task (rising from a chair or walking) beforehand.",
      "The therapist leans back to draw the thigh along its length in a graded, sustained pull of 30–60 seconds, 3–5 times, or with gentle oscillations.",
      "The quick, short thrust (up to five thrusts) is only for staff trained in it (Shepherd 2022).",
      "Re-test afterwards: continue if the range increased or the pain eased, otherwise stop using it.",
      "Active movement and strengthening start immediately afterwards in the same session.",
    ]],
    cues: [[
      "الشدُّ عبر ركبةٍ مؤلمة ⟵ الحزامُ فوق الركبة.",
      "الاكتفاءُ به دون تمرين ⟵ يتبعه التمرينُ دائماً.",
      "الاستمرارُ بلا كسبٍ في المدى ⟵ يُترك بعد ٤–٦ جلسات.",
    ], [
      "Pulling through a painful knee → the belt above the knee.",
      "Using it without exercise → always followed by exercise.",
      "Continuing without any gain in range → stop after 4–6 sessions.",
    ]],
    easier: ["تحريكٌ متدرّجٌ خفيف بقوّةٍ منخفضة.", "Gentle graded mobilisation at low force."],
    harder: ["شدٌّ بقوّةٍ أعلى (نحو ٦٩ نيوتن في التجارب — Shepherd 2022) أو مع حركة المريض نحو التدوير الداخليّ والثني (Beselga 2016).", "Higher-force distraction (about 69 N in trials — Shepherd 2022) or combined with the patient's movement into internal rotation and flexion (Beselga 2016)."],
    stopIf: ["لا يُعمل مع اشتباه نخر رأس الفخذ أو كسرٍ أو التهابٍ أو ورم، أو هشاشةٍ شديدة، أو مفصلٍ صناعيّ في الورك نفسِه، أو نوبةٍ بعد حقنةٍ حديثة؛ ويتوقّف إن زاد الألمُ أو ظهر خدرٌ في الساق.",
      "Not done with suspected avascular necrosis, fracture, infection or tumour, severe osteoporosis, a replacement in the same hip, or a flare after a recent injection; stop if pain increases or numbness appears in the leg."],
    equipment: ["سريرُ علاج، وحزامُ تحريكٍ عريض، ومنشفةٌ للتبطين.", "A treatment couch, a wide mobilisation belt and a towel for padding."],
    doseNote: ["١٠–٣٠ دقيقة من العلاج اليدويّ في الجلسة، ٢–٣ مرّات في الأسبوع، وستُّ جلساتٍ إلى عشر في الدورة على الأكثر (Shepherd 2022).", "10–30 minutes of manual therapy per session, 2–3 times a week, and at most six to ten sessions per course (Shepherd 2022)."],
    images: [{ key: "hip-long-axis-distraction-1", ar: "المريضُ مستلقٍ على ظهره والأخصائيّ يمسك الكاحلَ وأسفلَ الساق بيديه ويشدّ الساقَ المستقيمة على طولها والوركُ مثنيٌّ قليلاً، وسهمٌ يبيّن الاتّجاه — والحزامُ فوق الركبة بديلٌ إن آلمته الركبة",
      en: "The patient lying on the back with the therapist holding the ankle and lower leg and pulling the straight leg along its length with the hip slightly flexed, an arrow showing the direction — a belt above the knee is the alternative if the knee hurts", search: "long axis hip distraction manual therapy" }],
  },
  {
    code: "contralateral-cane-walking", nameAr: "المشي بالعصا في اليد المقابلة للورك المتألّم", nameEn: "Walking with a cane in the hand opposite the painful hip",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["يخفّف الحِملَ على الورك والألمَ في المشي: العصا في اليد المقابلة خفّضت عزمَ تقريب الورك نحو ٢٥٪ وألمَ المشي من ٤٢ إلى ٢٦ من ١٠٠ في الخشونة المتقدّمة (Tazawa 2022)، ونشاطَ عضلات التبعيد ٣١٪ — و٤٢٪ مع الضغط القويّ — ولم تُخفّفه في اليد نفسِها (Neumann 1998)؛ والكلّيةُ الأمريكية توصي بها بقوّة حين يؤثّر الوركُ في المشي أو الثبات أو الألم (Kolasinski 2020). ولا تجربةَ عشوائية للعصا في خشونة الورك (بحثٌ صفريّ) — وفي خشونة الركبة خفّفت الألمَ وحسّنت الوظيفةَ في شهرين (Jones 2012).",
      "Reduces the load on the hip and pain on walking: a cane in the opposite hand cut the hip adduction moment by about 25% and walking pain from 42 to 26 out of 100 in advanced osteoarthritis (Tazawa 2022), and abductor muscle activity by 31% — 42% with firm pushing — whereas a cane in the same-side hand did not (Neumann 1998); the American College strongly recommends a cane when the hip affects walking, stability or pain (Kolasinski 2020). There is no randomised trial of a cane in hip osteoarthritis (a documented zero result) — in knee osteoarthritis it reduced pain and improved function within two months (Jones 2012)."],
    start: ["عصا بنقطةٍ واحدة طولُها عند ثنية الرسغ والذراعُ متدلّية، فيكون المرفقُ مثنيّاً ٢٠–٣٠° وهو يمسكها؛ وحذاءٌ ثابت.",
      "A single-point cane set to the wrist crease with the arm hanging, so the elbow is bent 20–30° when holding it; and stable shoes."],
    steps: [[
      "أمسك العصا باليد المقابلة للورك المتألّم.",
      "حرّك العصا إلى الأمام مع الساق المتألّمة في الخطوة نفسِها.",
      "اضغط على العصا بثبات وأنت تنقل الوزنَ إلى الساق المتألّمة.",
      "ثمّ تقدّم بالساق السليمة متجاوزاً العصا.",
      "الدرج: صعوداً بالساق السليمة أوّلاً، ونزولاً بالمتألّمة والعصا معاً — والدرابزينُ باليد الأخرى.",
    ], [
      "Hold the cane in the hand opposite the painful hip.",
      "Move the cane forward together with the painful leg in the same step.",
      "Press firmly on the cane as the weight moves onto the painful leg.",
      "Then step through with the good leg past the cane.",
      "Stairs: up with the good leg first, and down with the painful leg and the cane together — with the rail in the other hand.",
    ]],
    cues: [[
      "العصا في يد الجهة المتألّمة ⟵ في اليد المقابلة، فإلّا لا تخفّف عن عضلات الورك (Neumann 1998).",
      "عصا طويلة أو قصيرة ⟵ عند ثنية الرسغ.",
      "الانحناءُ على العصا ⟵ الجذعُ مستقيمٌ والنظرُ إلى الأمام.",
      "حملُ الأغراض في جهة الورك المتألّم ⟵ يزيد الضغطَ على المفصل (McGibbon 1997): الحملُ موزَّعٌ أو بعربة.",
    ], [
      "The cane in the hand on the painful side → in the opposite hand, otherwise it does not unload the hip muscles (Neumann 1998).",
      "A cane too long or too short → at the wrist crease.",
      "Leaning over the cane → trunk upright and eyes forward.",
      "Carrying shopping on the painful side → it raises the pressure in the joint (McGibbon 1997): split the load or use a trolley.",
    ]],
    easier: ["مشّايةٌ داخلَ البيت في أيّام النوبة.", "A walking frame indoors on flare days."],
    harder: ["وزنٌ أقلّ على العصا كلّما قويت العضلات، ثمّ عصا المشي الإسكندنافيّ في الخارج (Bieler 2017).", "Less weight through the cane as the muscles strengthen, then Nordic walking poles outdoors (Bieler 2017)."],
    stopIf: ["ألمٌ في كتف العصا أو رسغها، أو عدمُ ثبات ⟵ يُراجع الأخصائيّ (تقييمُ التوازن).", "Shoulder or wrist pain on the cane side, or unsteadiness → see the therapist (a balance assessment)."],
    equipment: ["عصا بنقطةٍ واحدة قابلةٌ لضبط الطول، وطرفٌ مطاطيٌّ سليم.", "An adjustable single-point cane with an intact rubber tip."],
    doseNote: ["كلّما كان ألمُ المشي ٤ من ١٠ فأكثر أو ظهر العرج (اقتراح)، ويُراجع استعمالُها عند كلّ انتقالٍ بين المراحل.", "Whenever walking pain is 4/10 or more or a limp appears (a suggestion), with its use reviewed at each change of phase."],
    images: [{ key: "contralateral-cane-walking-1", ar: "رسمان لكبيرٍ في السنّ من الجانب: واقفٌ والعصا بجانبه، ثمّ يخطو فتتقدّم العصا مع الساق البعيدة — المقابلة لليد التي تمسكها",
      en: "Two side-view drawings of an older man: standing with the stick beside him, then stepping so that the stick moves forward with the far leg — the one opposite the hand holding it", search: "walking with cane opposite hand hip" }],
  },
  {
    code: "prayer-floor-sitting-hip-oa", nameAr: "الصلاة والجلوس على الأرض مع خشونة الورك", nameEn: "Prayer and floor sitting with hip osteoarthritis",
    kind: "functional", region: "whole_body", homeSuitable: true,
    purpose: ["يحفظ أنشطةً يقدّرها المريض — الصلاةُ بأوضاعها والجلوسُ على الأرض والمرحاض — بقاعدة الألم: فالصلاةُ تجمع ثنياً عميقاً وجلوساً أخيراً غيرَ متماثل هو أقصى مدىً للورك فيها (Jamari 2017)، والركوعُ بثني الركبتين قلّل الحِملَ على أسفل الظهر (Abou Hassan 2010)، والصلاةُ على الكرسيّ طويلاً اقترنت بوظيفةٍ أسوأ في خشونة الركبة (Ateef 2021). ولا دراسةَ تدخّلٍ للصلاة أو المرحاض العربيّ أو الجلوس على الأرض في خشونة الورك (بحثٌ صفريّ) — اقتراحٌ يُراجع بقاعدة الألم، والحكمُ الشرعيّ للمريض ومرجعه.",
      "Keeps activities the patient values — prayer in its positions, floor sitting and the toilet — within the pain rule: prayer combines deep bending with an asymmetric final sitting that is the hip's most extreme range in it (Jamari 2017), bowing with bent knees reduced the load on the low back (Abou Hassan 2010), and long-term chair prayer was associated with worse function in knee osteoarthritis (Ateef 2021). There is no intervention study of prayer, the squat toilet or floor sitting in hip osteoarthritis (a documented zero result) — a suggestion checked against the pain rule, with the religious ruling for the patient and their scholar."],
    start: ["سجّادةُ الصلاة ووسادةٌ صلبة أو بساطٌ مطويّ، وكرسيٌّ صغير، وكرسيٌّ عاديّ قريب.",
      "A prayer mat, a firm cushion or folded mat, a low stool, and an ordinary chair nearby."],
    steps: [[
      "القيامُ والركوع: واقفاً، والركوعُ بثني الركبتين قليلاً إن آلمه الركوعُ المستقيم (Abou Hassan 2010).",
      "السجود: من الركوع على الركبتين، والركبتان أبعدُ من عرض الورك، واليدان تحملان وزناً أكثر.",
      "الجلوسُ بين السجدتين والتشهّد: على وسادةٍ صلبة تحت الأليتين، وبالوضع المتماثل الذي لا يؤلم قبل غير المتماثل.",
      "الخطوةُ الحمراء (فوق ٥ من ١٠) وحدها على الكرسيّ مؤقّتاً، وبقيّةُ الصلاة على الأرض — مع خطّةٍ للعودة.",
      "القيامُ من الأرض بسند (كرسيٌّ أو أريكة)؛ والمرحاضُ العربيّ في أيّام النوبة بمقعدٍ مرتفعٍ متنقّل أو كرسيٍّ صغير ومقبض.",
    ], [
      "Standing and bowing: standing, with the bow done with slightly bent knees if a straight bow hurts (Abou Hassan 2010).",
      "Prostration: from kneeling, with the knees wider than hip-width and the hands taking more weight.",
      "Sitting between prostrations and for tashahhud: on a firm cushion under the buttocks, in a pain-free symmetrical position before an asymmetrical one.",
      "Only the red step (above 5/10) is done on a chair for now, with the rest of the prayer on the floor — with a plan to return.",
      "Getting up from the floor with support (a chair or sofa); and the squat toilet on flare days with a portable raised seat or a low stool and a grab rail.",
    ]],
    cues: [[
      "الانتقالُ إلى الصلاة على الكرسيّ دائماً بعد نوبةٍ واحدة ⟵ الكرسيُّ للخطوة الحمراء وحدها ومؤقّتاً.",
      "البدءُ بأشدّ أوضاع الجلوس ألماً ⟵ المتماثلُ أوّلاً ثمّ غيرُه.",
      "القيامُ من الأرض بلا سند ⟵ يدٌ على كرسيٍّ ثابت.",
    ], [
      "Switching to chair prayer for good after a single flare → the chair for the red step only, and only for now.",
      "Starting with the most painful sitting position → symmetrical first, then the others.",
      "Getting up from the floor without support → a hand on a stable chair.",
    ]],
    easier: ["وسادةٌ أعلى تحت الأليتين، والكرسيُّ للسجود وحده.", "A higher cushion under the buttocks, and the chair for prostration only."],
    harder: ["وسادةٌ أخفض ثمّ الجلوسُ على الأرض كاملاً، والقيامُ بلا سند.", "A lower cushion, then full floor sitting, and rising without support."],
    stopIf: ["ألمٌ فوق ٥ من ١٠، أو ألمٌ لا يهدأ صباحَ اليوم التالي، أو انفلاتُ الساق ⟵ الخطوةُ السابقة ويخبر الأخصائيّ.",
      "Pain above 5/10, pain not settled by the next morning, or the leg giving way → back to the previous step and tell the therapist."],
    equipment: ["سجّادة، ووسادةٌ صلبة أو بساطٌ مطويّ، وكرسيٌّ صغير، وكرسيٌّ ثابت، ومقعدُ مرحاضٍ مرتفعٌ متنقّل عند الحاجة.", "A prayer mat, a firm cushion or folded mat, a low stool, a stable chair, and a portable raised toilet seat when needed."],
    doseNote: ["كلُّ وضعٍ ٣–٥ مرّات في الأيّام الخفيفة، ثمّ في الصلوات اليومية بقدر ما يتحمّل (اقتراح).", "Each position 3–5 times on light days, then in the daily prayers as tolerated (a suggestion)."],
    images: [{ key: "prayer-floor-sitting-hip-oa-1", ar: "رمزان: الجلوسُ للتشهّد (اليسار) والسجودُ (اليمين) على سجّادة الصلاة بوضعهما المعتاد — والوسادةُ تحت الأليتين وتباعدُ الركبتين في الخطوات",
      en: "Two symbols: sitting for tashahhud (left) and prostration (right) on a prayer mat in their usual form — the cushion under the buttocks and the wider knees are in the steps", search: "muslim prayer sujood position hip" }],
  },
];

const PAIN_RULE_AR = "قاعدةُ الألم للتمارين (في كلّ المراحل) — الإشارةُ الضوئية من تجارب خشونة الورك: الألمُ أثناء التمرين وبعده مباشرةً ٠–٢ من ١٠ أخضر «آمن»، و٣–٥ أصفر «مقبول»، وفوق ٥ أحمر «كثير»؛ ويعود ألمُ الورك إلى المعتاد صباحَ اليوم التالي، وإلّا تخفّ الجلسةُ التالية (Ageberg 2010 · Bryld 2025) بالترتيب: السرعة ثمّ المدى ثمّ الثقل (Kjeldsen 2022). ولمن تهيّجُه عالٍ القاعدةُ الهولندية الأشدّ: تخفّ الجلسةُ التالية إن بقي الألمُ زائداً أكثرَ من ساعتين بعد التمرين (KNGF — van Doormaal 2020). ويُقال للمريض: قد يزيد الألمُ حين يبدأ التمرين، وهذا لا يعني ضرراً (NICE NG226)؛ وواحدٌ من خمسةٍ تثور نوبتُه بعد اختبار الجلوس والقيام ثمّ تهدأ (Skou 2020). ولم تُقارَن قاعدتان (بحثٌ صفريّ).\n" +
  "وإن احترمها مرّتين متتاليتين في أيّام القوّة: يزيد الثقلُ ٢–١٠٪ (Kjeldsen 2022)؛ ولا يتوقّف عن الحركة في النوبة: يتحوّل يومين أو ثلاثةً إلى الدراجة أو مدىً أصغر، ثمّ يعود إلى خطوته السابقة.";
const PAIN_RULE_EN = "The pain rule for exercise (all phases) — the traffic light from hip-osteoarthritis trials: pain during and right after exercise of 0–2/10 is green, 'safe'; 3–5 is amber, 'acceptable'; above 5 is red, 'too much'; and hip pain is back to its usual level by the next morning, otherwise the next session is lighter (Ageberg 2010 · Bryld 2025), in this order: pace, then range, then load (Kjeldsen 2022). For a highly irritable hip, the stricter Dutch rule: the next session is lighter if pain stays raised for more than two hours after exercise (KNGF — van Doormaal 2020). The patient is told: pain may increase when exercise starts, and this does not mean damage (NICE NG226); one in five flares after a chair-stand test and it settles (Skou 2020). No trial compared pain rules (a documented zero result).\n" +
  "When it is respected twice in a row on strength days, the load goes up 2–10% (Kjeldsen 2022); and movement does not stop during a flare: two or three days of cycling or a smaller range, then back to the previous step.";

const EXTEND_AR = "وفي الجلسة ٢٤: تمديدٌ واحد بستّ جلسات (حتى ٣٠) إن بلغ مقياسٌ واحد على الأقلّ الفرقَ المهمّ (الألمُ نقطتين، أو الجلوسُ والقيامُ ٣٠ ثانية +٢، أو الأنشطةُ المختارة +٢ — Guerrero 2026 · Wright 2011) ولم تتحقّق معاييرُ الخروج، والالتزامُ جيّد، ولا علامةَ إحالة. ومَن لم يبلغ أيّاً منها في الجلسة ١٦ أو مراجعة الأسبوع السادس لا يُمدَّد: يُعاد الفحصُ (أسفلُ الظهر، وأوتارُ جانب الورك، ونخرُ رأس الفخذ، والخشونةُ سريعةُ التقدّم)، وتُراجع الجرعةُ والالتزام، ويراجع طبيبَ المركز (القواعدُ في «موانع وإحالة»). وبعد الخروج: البرنامجُ المنزليّ حتى الأسبوع الثاني عشر — التقويةُ مرّتين إلى ثلاثٍ في الأسبوع والمشيُ أو الدراجة ٣٠ دقيقة خمسةَ أيّامٍ فأكثر — ومراجعتان في الأسبوعين السادس والثاني عشر (KNGF — van Doormaal 2020)؛ والجلساتُ التذكيرية لم تحفظ الأثرَ أكثرَ من عدمها (Kjeldsen 2025) لكنّها تحسّن الالتزام (Moseng 2024). ولا تجربةَ لدورةٍ ثانية أو ممدَّدة (بحثٌ صفريّ).";
const EXTEND_EN = "At session 24: one extension of six sessions (to 30) if at least one measure has reached the important change (pain by 2 points, the 30-second chair stand by 2, or the chosen activities by 2 — Guerrero 2026 · Wright 2011) without meeting the discharge criteria, with good adherence and no referral trigger. A patient who has reached none of them by session 16 or the week-6 review is not extended: they are re-screened (low back, lateral hip tendons, avascular necrosis of the femoral head, rapidly progressive osteoarthritis), the dose and adherence are reviewed, and they see the centre's doctor (the rules under 'Contraindications and referral'). After discharge: the home programme to week 12 — strengthening two to three times a week and walking or cycling for 30 minutes on five days or more — with reviews at weeks 6 and 12 (KNGF — van Doormaal 2020); booster sessions did not maintain the effect better than none (Kjeldsen 2025) but they improve adherence (Moseng 2024). There is no trial of a second or extended course (a documented zero result).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "hip-oa-geriatric",
  summary: [
    "خشونةُ مفصل الورك (Hip osteoarthritis): تُشخَّص سريرياً بلا صورٍ عند من عمرُه ٤٥ فأكثر، بألمٍ يتبع النشاط، وتيبّسٍ صباحيّ لا يتجاوز ٣٠ دقيقة أو لا تيبّس — والصورُ لما هو غيرُ معتاد فقط: إصابةٌ حديثة أو تيبّسٌ طويل أو تدهورٌ سريع أو مفصلٌ حارٌّ متورّم أو شكٌّ في التهابٍ أو ورم (NICE NG226)؛ وفي إرشاد JOSPT: فوق الخمسين، وألمٌ أماميّ أو جانبيّ في الورك مع حمل الوزن، وتيبّسٌ صباحيّ أقلُّ من ساعة، وتدويرٌ داخليّ أقلُّ من ٢٤° أو هو والثني ١٥° أقلّ من الجهة الأخرى، أو ألمٌ مع التدوير الداخليّ (Koc 2025). " +
    "انتشارُها في الأشعّة ٨٫٥٥٪ في تحليلٍ جامع — ٤٫٢٦٪ في آسيا و١٢٫٥٩٪ في أوروبا (Fan 2023)، وخطرُها مدى الحياة ٢٥٫٣٪ (Murphy 2010)؛ ولا دراسةَ عراقيةَ لخشونة الورك (بحثٌ صفريّ)، وتقديراتُ العبء الإقليميّة للعراق نماذجُ لا مسوح (Hoveidaei 2023). " +
    "وفي متابعةٍ عشر سنوات لمن بدأ ألمُ وركه: ١٢٪ استبدلوا المفصل، وبقيت أعراضُ الآخرين على حالها في المتوسّط (van Berkel 2021)؛ والأشعّةُ تنبئ بالجراحة لا بالأعراض اليومية، والوزنُ لا ينبئ بالاستبدال، ونقصُ التدوير لا ينبئ بالتقدّم السريريّ (Teirlinck 2019). " +
    "الإرشادات: المعهدُ البريطانيّ — التمرينُ العلاجيّ المناسب لكلّ مريض، ويُنظر في الإشراف عليه، والعلاجُ اليدويّ «مع التمرين وحده»، و«لا تُقدَّم» الإبرُ الصينية ولا الجافّة ولا التحفيزُ عبر الجلد ولا الأمواجُ فوق الصوتية ولا التداخليّ ولا الليزرُ ولا الموجاتُ القصيرة النبضية ولا التحفيزُ العضليّ، والإحالةُ للاستبدال بالتقييم السريريّ لا بالمقاييس (NICE NG226)؛ وOARSI: التمرينُ الأرضيّ المنظَّم وحده «أساسيّ» للورك (Bannuru 2019)؛ والكلّيةُ الأمريكية: التمرينُ وخسارةُ الوزن والإدارةُ الذاتية والتاي تشي والعصا بقوّة، والعلاجُ اليدويّ مضافاً إلى التمرين مشروطٌ ضدّه، والتحفيزُ عبر الجلد ضدّه بقوّة (Kolasinski 2020)؛ وEULAR: خطّةٌ متعدّدة المكوّنات بتثقيفٍ وتمرينٍ بجرعةٍ وتدرّجٍ كافيين (Moseng 2024)؛ وإرشادُ JOSPT: العلاجُ اليدويّ ومنه الشدُّ الطوليّ A، والتمرينُ A مرّةً إلى خمسٍ في الأسبوع ٣٠–١٢٠ دقيقة خمسةَ أسابيع إلى ستّةَ عشرَ، والإبرُ الجافّة A، والتثقيفُ وخسارةُ الوزن B، والأمواجُ فوق الصوتية D، والدعّامة F (Koc 2025)؛ والهولنديّ: التمرينُ لكلّ مريضٍ بجرعته، ولا للحرارة والليزر والمجال المغناطيسيّ والموجات الصادمة والأمواج فوق الصوتية والتحريك السلبيّ (KNGF — van Doormaal 2020). " +
    "وفي التجارب: التمرينُ خفّض الألمَ ٨ من ١٠٠ والوظيفةَ ٧ (يستفيد واحدٌ من كلّ ستّة) واستمرّ ٣–٦ أشهر (Fransen 2014)، وفي التحديث ٧٫٢ و٨٫٨ عن الرعاية المعتادة بيقينٍ متوسّط وأثرٍ صغير (Hall 2026)؛ وحزمةُ علاجٍ طبيعيّ بعشر جلسات لم تتفوّق على الوهميّ وزادت الآثارَ الخفيفة (٤١٪ مقابل ١٤٪ — Bennell 2014)؛ والتقويةُ بالأثقال ساوت التمرينَ العصبيّ العضليّ (Kjeldsen 2024)؛ والتمرينُ مع التثقيف أخّر الاستبدال — بقي الوركُ الطبيعيّ ٤١٪ مقابل ٢٥٪ بعد ستّ سنوات (Svege 2015)؛ وفي الخشونة الشديدة المستحقّة للجراحة فاق الاستبدالُ التقويةَ بوضوح (Frydendal 2024). " +
    "فالبروتوكول: أساسٌ في كلّ جلسة — التثقيفُ وقاعدةُ الألم، والتقويةُ المتدرّجة للورك والركبة، والمدى والتمطيط، والمشيُ والدراجة، والتوازنُ والمهامُّ اليومية (الصلاةُ والسيارةُ والدرج)، والبرنامجُ المنزليّ — والعلاجُ اليدويّ قصيرٌ داخله، والعصا لمن يحتاجها، والأجهزةُ مساعدة؛ وثلاثُ مراحل: الحِملُ المحتمَل والحركة، ثمّ التقويةُ المتدرّجة والتمرينُ العصبيّ العضليّ، ثمّ القوّةُ الثقيلة والوظيفة. " +
    "والعددُ ٢٤ جلسة بستٍّ في الأسبوع: التجاربُ مرّةً إلى ثلاثٍ في الأسبوع خمسةَ أسابيع إلى ستّةَ عشرَ، وأكثرُها مرّتين اثني عشرَ أسبوعاً (٢٤ جلسة — Bryld 2025 · Kjeldsen 2022 · Svege 2015)، ولا تجربةَ لخمسٍ أو ستٍّ في الأسبوع (بحثٌ صفريّ — والبرنامجُ اليوميّ الوحيد كان في ذراعَي تجربة ليزر — de Sire 2026)؛ فهو اختيارُ خدمةٍ مكتوبٌ صريحاً: القوّةُ الثقيلة يوماً بعد يوم وبينها ٤٨ ساعة كما في التجربة (Bryld 2025)، وأيّامٌ خفيفة بينها.",
    "Hip osteoarthritis: diagnosed clinically without imaging in people aged 45 or over with activity-related pain and no morning stiffness or stiffness lasting no longer than 30 minutes — imaging only for atypical features: recent trauma, prolonged stiffness, rapid worsening, a hot swollen joint, or concern about infection or tumour (NICE NG226); in the JOSPT guideline: over 50, anterior or lateral hip pain on weight-bearing, morning stiffness under an hour, internal rotation below 24° or internal rotation and flexion 15° less than the other side, or pain on internal rotation (Koc 2025). " +
    "Radiographic prevalence is 8.55% in a meta-analysis — 4.26% in Asia and 12.59% in Europe (Fan 2023) — and the lifetime risk is 25.3% (Murphy 2010); there is no Iraqi study of hip osteoarthritis (a documented zero result), and regional burden figures for Iraq are models, not surveys (Hoveidaei 2023). " +
    "Over ten years after hip pain began, 12% had a replacement and the others' symptoms stayed the same on average (van Berkel 2021); radiographs predict surgery, not day-to-day symptoms, weight does not predict replacement, and limited rotation does not predict clinical progression (Teirlinck 2019). " +
    "Guidelines: NICE — therapeutic exercise tailored to the person, with supervision considered, manual therapy 'only alongside' exercise, and do not offer acupuncture, dry needling, TENS, ultrasound, interferential, laser, pulsed short-wave or NMES, with referral for replacement by clinical assessment rather than scores (NICE NG226); OARSI: structured land-based exercise is the only 'core' treatment for the hip (Bannuru 2019); the American College: exercise, weight loss, self-management, tai chi and a cane strongly recommended, manual therapy added to exercise conditionally against, and TENS strongly against (Kolasinski 2020); EULAR: a multicomponent plan with education and exercise of adequate dose and progression (Moseng 2024); the JOSPT guideline: manual therapy including long-axis distraction A, exercise A one to five times a week for 30–120 minutes over 5–16 weeks, dry needling A, education and weight loss B, ultrasound D and bracing F (Koc 2025); and the Dutch guideline: exercise for everyone at its dose, and no thermotherapy, laser, electromagnetic field, shockwave, ultrasound or passive mobilisation (KNGF — van Doormaal 2020). " +
    "In trials: exercise reduced pain by 8 and improved function by 7 out of 100 (one in six benefits) for 3–6 months (Fransen 2014), and in the update by 7.2 and 8.8 compared with usual care with moderate certainty and a small effect (Hall 2026); a ten-session physiotherapy package did not beat sham and caused more mild side effects (41% vs 14% — Bennell 2014); resistance training equalled neuromuscular exercise (Kjeldsen 2024); exercise with education delayed replacement — 41% vs 25% still had their own hip at six years (Svege 2015); and in severe osteoarthritis with a surgical indication, replacement clearly beat strengthening (Frydendal 2024). " +
    "So the protocol: a core in every session — education and the pain rule, progressive hip and knee strengthening, range of motion and stretching, walking and cycling, balance and daily tasks (prayer, the car and stairs), and the home programme — with brief manual therapy inside it, a cane for those who need it, and devices as adjuncts; three phases: load tolerance and movement, then progressive strengthening and neuromuscular exercise, then heavy strength and function. " +
    "The dose is 24 sessions at six a week: trials used one to three a week for 5–16 weeks, most often twice a week for twelve weeks (24 sessions — Bryld 2025 · Kjeldsen 2022 · Svege 2015), and no trial tested five or six a week (a documented zero result — the only daily programme was given to both arms of a laser trial — de Sire 2026); so it is a service choice stated openly: heavy strength every other day with 48 hours between, as in the trial (Bryld 2025), and light days in between.",
  ],
  goals: [
    "• ألمُ المشي أو الألمُ المعتاد في الأسبوع الأخير (من ١٠) ينقص نقطتين فأكثر — الفرقُ المهمّ ٢٫١ في تمارين خشونة الورك (Guerrero 2026)، فوق خطأ القياس بالعربية ١٫٩٦ (Alghadir 2016).\n" +
    "• الجلوسُ والقيامُ ٣٠ ثانية يزيد مرّتين فأكثر (Wright 2011)، ويبلغ ١١–١٢ مرّة — الحالةُ التي يقبلها المريض (Emerson Kavchak 2013).\n" +
    "• الأنشطةُ التي يختارها المريض بالعربية (السجودُ والجلوسُ للتشهّد، والدرج، والمشيُ إلى المسجد أو السوق، والسيارة، ولبسُ الجوارب) تتحسّن نقطتين فأكثر لكلٍّ منها (Guerrero 2026 · Alnahdi 2022).\n" +
    "• النهوضُ والمشي ٦٫٠٥ ثانية أو أقلّ، أو ينقص ١٫٢ ثانية (Wright 2011 · Emerson Kavchak 2013)؛ والتدويرُ الداخليّ والثنيُ يزيدان ١٠° فأكثر لمن نقصا — فوق خطأ القياس (Cibulka 2017).\n" +
    "• المشيُ ٣٠ دقيقة خمسةَ أيّامٍ في الأسبوع فأكثر (KNGF — van Doormaal 2020)، والعصا في اليد المقابلة لمن يحتاجها.\n" +
    "• برنامجٌ منزليّ يؤدّيه وحده حتى الأسبوع الثاني عشر ثمّ يحافظ عليه، وخطّةٌ للنوبة.\n" +
    "• فهمُ الحالة: الألمُ ليس ضرراً، والتمرينُ وإدارةُ الوزن هما العلاجُ الأساسيّ، وقاعدةُ الإشارة الضوئية.",
    "• Walking pain or usual pain over the past week (out of 10) down 2 points or more — the important change is 2.1 in hip-osteoarthritis exercise (Guerrero 2026), above the Arabic measurement error of 1.96 (Alghadir 2016).\n" +
    "• The 30-second chair stand up by 2 or more (Wright 2011), reaching 11–12 — the state patients find acceptable (Emerson Kavchak 2013).\n" +
    "• The activities the patient chooses, in Arabic (prostration and sitting for tashahhud, stairs, walking to the mosque or market, the car, putting on socks), each up 2 points or more (Guerrero 2026 · Alnahdi 2022).\n" +
    "• Timed up-and-go of 6.05 seconds or less, or 1.2 seconds faster (Wright 2011 · Emerson Kavchak 2013); and internal rotation and flexion up 10° or more where limited — beyond measurement error (Cibulka 2017).\n" +
    "• Walking for 30 minutes on five days a week or more (KNGF — van Doormaal 2020), with a cane in the opposite hand for those who need it.\n" +
    "• A home programme done independently to week 12 and then maintained, with a flare plan.\n" +
    "• Understanding of the condition: hurt is not harm, exercise and weight management are the core treatments, and the traffic-light rule.",
  ],
  assessment: [
    "في الجلسة الأولى قبل أيّ علاج (نحو ٦٠ دقيقة):\n" +
    "• التاريخ: مكانُ الألم (الأربية والألية والفخذ وجانبُ الورك، وتحت الركبة عند نحو نصفهم — Khan 2004؛ ولا يكون في الركبة وحدها — Poulsen 2016)، وما يزيده، ومدّةُ التيبّس الصباحيّ، والألمُ الليليّ، والسقوط، والحقنُ السابقة وتوقيتُها، والكورتيزون، وفقرُ الدم المنجليّ، والسرطانُ والحمّى ونقصُ الوزن، والحِملُ في العمل (الزراعةُ ورفعُ الأثقال — Jensen 2008)؛ والأنشطةُ التي يريد استعادتها.\n" +
    "• التشخيص: ألمُ الخلف مع القرفصاء، وألمُ الأربية مع التبعيد أو التقريب السلبيّ، وضعفُ المبعِّدات، ونقصُ التقريب والتدوير الداخليّ ترجّحها، والتقريبُ الطبيعيّ أقوى ما ينفيها (Metcalfe 2019)؛ وأربعةٌ من خمسة في قاعدة Sutlive ترجّحها بقوّة لكنّها غيرُ مُتحقَّقة (Sutlive 2008)؛ ونقصُ التدوير الداخليّ أدلُّ حركة (Birrell 2001).\n" +
    "• التفريقُ عن غيرها: أسفلُ الظهر — ألمٌ تحت الركبة مع تنميل وعلاماتٌ عصبية؛ والخشونةُ يرجّحها ألمٌ مؤلمٌ محدود في حركات الورك وألمُ الدخول إلى السيارة (Rainville 2019)؛ وأوتارُ جانب الورك — ألمٌ خلال ٣٠ ثانية من الوقوف على ساقٍ واحدة يرجّحها، وغيابُ الألم عند لمس النتوء الجانبيّ ينفيها (Grimaldi 2017).\n" +
    "• الفحص: التدويرُ الداخليّ والثنيُ بالمنقلة بالفاحص نفسِه، والبسطُ (اختبار توماس)، والتقريب، واختبارُ فابر؛ وقوّةُ المبعِّدات والباسطات والثانيات ومادّات الركبة بمقياس اليد إن توفّر (Vaz 2023)؛ والمشية (علامةُ ترندلنبرغ ليست تشخيصية — Youdas 2010).\n" +
    "• المقاييس: المزروعةُ — نتائجُ الورك (HOOS) والتدويرُ الداخليّ والجلوسُ والقيامُ ٣٠ ثانية والنهوضُ والمشي — ونتائجُ الورك بلا نسخةٍ عربية مُتحقَّقة (بحثٌ صفريّ)، فيُضاف: الألمُ بالعربية (Alghadir 2016)، والأنشطةُ المختارة بالعربية (Alnahdi 2022)، ومقياسُ الطرف السفليّ بالعربية (Alnahdi 2021)، والمشيُ السريع ٤٠ متراً والدرج (Dobson 2013)، والوقوفُ على ساقٍ أو اختبارُ الخطوة (Choi 2014)، والخوفُ من السقوط بالعربية عند السقوط (Halaweh 2016).\n" +
    "• يُعاد التقييمُ كاملاً في الجلسات ٦ و١٦ و٢٤ (و٣٠ إن مُدّد) وفي الأسبوعين ٦ و١٢، وقاعدةُ الألم وأسئلةُ الإحالة في كلّ جلسة.",
    "At the first session, before any treatment (about 60 minutes):\n" +
    "• History: where the pain is (groin, buttock, thigh and side of the hip, and below the knee in about half — Khan 2004; never in the knee alone — Poulsen 2016), what aggravates it, how long morning stiffness lasts, night pain, falls, previous injections and their timing, steroids, sickle cell disease, cancer, fever and weight loss, and load at work (farming and heavy lifting — Jensen 2008); and the activities the patient wants back.\n" +
    "• Diagnosis: posterior pain on squatting, groin pain on passive abduction or adduction, abductor weakness, and reduced adduction and internal rotation favour it, while normal adduction argues most strongly against it (Metcalfe 2019); four of the five Sutlive findings strongly favour it but the rule is not validated (Sutlive 2008); reduced internal rotation is the most telling movement (Birrell 2001).\n" +
    "• Telling it apart: the low back — pain below the knee with tingling and neurological signs; osteoarthritis is favoured by painful restricted hip movements and pain getting into a car (Rainville 2019); the lateral hip tendons — pain within 30 seconds of single-leg standing favours them, and no tenderness over the greater trochanter rules them out (Grimaldi 2017).\n" +
    "• Examination: internal rotation and flexion with a goniometer by the same examiner, extension (Thomas test), adduction and the FABER test; abductor, extensor, flexor and knee-extensor strength with a handheld dynamometer if available (Vaz 2023); and gait (the Trendelenburg sign is not diagnostic — Youdas 2010).\n" +
    "• Measures: the seeded ones — the Hip disability and Osteoarthritis Outcome Score (HOOS), internal rotation, the 30-second chair stand and the timed up-and-go — the HOOS has no validated Arabic version (a documented zero result), so add: pain in Arabic (Alghadir 2016), the Arabic Patient-Specific Functional Scale (Alnahdi 2022), the Arabic Lower Extremity Functional Scale (Alnahdi 2021), the 40-metre fast walk and stairs (Dobson 2013), single-leg stance or the Step Test (Choi 2014), and the Arabic fear-of-falling scale after falls (Halaweh 2016).\n" +
    "• The full assessment is repeated at sessions 6, 16 and 24 (and 30 if extended) and at weeks 6 and 12, with the pain rule and the referral questions at every session.",
  ],
  exercises: [
    "البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»، وهذا ملخّصُه:\n" +
    "• التثقيفُ أوّلاً وفي كلّ جلسة: الخشونةُ شائعةٌ وتُشخَّص سريرياً، والتمرينُ وإدارةُ الوزن هما العلاجُ الأساسيّ، وقد يزيد الألمُ في البداية (NICE NG226)، وقاعدةُ الإشارة الضوئية؛ والتثقيفُ وحده لم يخفّف الألم (Poulsen 2013 · Fernandes 2010)، فيُقرن بالتمرين.\n" +
    "• التقويةُ المتدرّجة كما في التجربة (Bryld 2025): ضغطُ الساقين، وبسطُ الورك وثنيُه وتبعيدُه بالكابل أو أثقال الكاحل — ٣ مجموعات وراحةُ ٦٠ ثانية، بثقلٍ يُرفع ١٢ مرّةً ثمّ ١٠ ثمّ ٨، ويزيد ٢–١٠٪ حين تكتمل المجموعةُ الثالثة (Kjeldsen 2022)؛ والسرعةُ نشيطةٌ في الرفع وبطيئةٌ في الإنزال (Fukumoto 2017)؛ وبلا أجهزة: الوقوفُ بثلاثة اتّجاهات والجسرُ والجلوسُ والقيامُ بثقلٍ وصعودُ الدرجة (اقتراح).\n" +
    "• التمرينُ العصبيّ العضليّ في الأيّام الخفيفة: عشرةُ تمارين للثبات ووضع الجسم والقوّة الوظيفية، ٢–٣ × ١٠–١٥ بأربعة مستويات (Kjeldsen 2022) — ساوى التقويةَ بالأثقال (Kjeldsen 2024).\n" +
    "• المدى والتمطيط: التدويرُ الداخليّ والثنيُ والبسط — ٣ × ٤٥ ثانية مرّتين يومياً (Ceballos-Laita 2022)؛ والعلاجُ اليدويّ (الشدُّ الطوليّ والتحريك) قصيرٌ لمن نقص مداه، يتبعه التمرينُ دائماً (Koc 2025 · Runge 2022).\n" +
    "• المشيُ والدراجة: ٣٠ دقيقة خمسةَ أيّامٍ فأكثر تبدأ بعشر دقائق (KNGF — van Doormaal 2020)، والدراجةُ للإحماء عشرَ دقائق (Bryld 2025) والمقعدُ عالٍ لمن نقص ثنيُه (اقتراح — بحثٌ صفريّ)، والمشيُ الإسكندنافيّ خيار (Bieler 2017)؛ والهوائيُّ للصحّة العامّة لا مسكّناً إضافياً (Hall 2025).\n" +
    "• التوازن: خشونةُ الورك تقترن بتكرار السقوط (Zhang 2023)، فتمارينُ الوقوف على ساقٍ والخطوات والعوائق في المرحلتين الثانية والثالثة.\n" +
    "• الوظيفة: الجلوسُ والقيام، والدرج، والسيارة، ولبسُ الجوارب، والصلاةُ والجلوسُ على الأرض (Rainville 2019 · Jamari 2017).\n" +
    "• البرنامجُ المنزليّ: التقويةُ مرّتين إلى ثلاثٍ في الأسبوع، والمشيُ أو الدراجة، والتمطيطُ يومياً، حتى الأسبوع الثاني عشر.\n" +
    PAIN_RULE_AR,
    "The programme with its phases and cards is under 'Programme by phase'; in summary:\n" +
    "• Education first and at every session: osteoarthritis is common and diagnosed clinically, exercise and weight management are the core treatments, pain may rise at the start (NICE NG226), and the traffic-light rule; education alone did not reduce pain (Poulsen 2013 · Fernandes 2010), so it is paired with exercise.\n" +
    "• Progressive strengthening as in the trial (Bryld 2025): leg press, and hip extension, flexion and abduction with a cable or ankle weights — 3 sets with 60 seconds' rest, at a load that can be lifted 12 times, then 10, then 8, rising 2–10% when the third set is completed (Kjeldsen 2022); brisk on the way up and slow on the way down (Fukumoto 2017); without machines: standing three-way hip work, the bridge, loaded sit-to-stand and step-ups (a suggestion).\n" +
    "• Neuromuscular exercise on light days: ten exercises for stability, posture and functional strength, 2–3 × 10–15 at four levels (Kjeldsen 2022) — it equalled resistance training (Kjeldsen 2024).\n" +
    "• Range and stretching: internal rotation, flexion and extension — 3 × 45 seconds twice a day (Ceballos-Laita 2022); and brief manual therapy (long-axis distraction and mobilisation) for limited range, always followed by exercise (Koc 2025 · Runge 2022).\n" +
    "• Walking and cycling: 30 minutes on five days or more, starting with ten minutes (KNGF — van Doormaal 2020), the bike for a ten-minute warm-up (Bryld 2025) with a high saddle when flexion is limited (a suggestion — a documented zero result), and Nordic walking as an option (Bieler 2017); aerobic work is for general health, not an extra painkiller (Hall 2025).\n" +
    "• Balance: hip osteoarthritis is associated with recurrent falls (Zhang 2023), so single-leg, stepping and obstacle exercises in phases 2 and 3.\n" +
    "• Function: sitting and standing, stairs, the car, putting on socks, prayer and floor sitting (Rainville 2019 · Jamari 2017).\n" +
    "• The home programme: strengthening two to three times a week, walking or cycling, and stretching daily, to week 12.\n" +
    PAIN_RULE_EN,
  ],
  contraindications: [
    "قبل كلّ جلسة: هل الوركُ حارٌّ متورّم، أو في الليل ألمٌ لا يهدأ بالراحة، أو سقط، أو ساء الألمُ بسرعة، أو ظهر خدرٌ أو ضعفٌ في الساق — فالتشخيصُ يُراجع إن لم يتّسق مع الخشونة (Koc 2025).\n" +
    "• إحالةٌ في اليوم نفسِه: حمّى أو مفصلٌ حارٌّ متورّم أو لا يحمل الوزن، خاصّةً بعد حقنةٍ حديثة أو مع نقص المناعة — التهابٌ صديديّ محتمل (Ravn 2023 · NICE NG226)؛ وسقوطٌ ثمّ عجزٌ جديد عن حمل الوزن أو ساقٌ قصرت ودارت للخارج — كسرٌ محتمل، والرنينُ أدقّ (Qu 2024)؛ وألمٌ شديدٌ مفاجئ عند كبيرةٍ بهشاشة العظام — كسرٌ تحت الغضروف (Chen 2022).\n" +
    "• إحالةٌ خلال أيّام: تدهورٌ سريع في الألم أو الحركة خلال أسابيع إلى أشهر — خشونةٌ سريعةُ التقدّم (نحو ٦٪ بعد حقن الكورتيزون — Sabatini 2023؛ ومتوسّطُ العمر ٧٧ — Montero Furelos 2024)؛ ومن معه خطرُ نخر رأس الفخذ: فقرُ الدم المنجليّ — وأكثرُه في أقصى جنوب العراق وشماله (Al-Allawi 2012)، وفيه صار النخرُ الصامت مؤلماً عند ٩١٪ (Hernigou 2006) — والكورتيزونُ بجرعاتٍ عالية (Mont 2015) أو بعد علاج كورونا (Assad 2023)، خاصّةً تحت الخمسين ⟵ رنينٌ عبر الطبيب؛ وألمٌ ليليّ أو نقصُ وزن أو سرطانٌ سابق؛ وتيبّسٌ صباحيّ أطولُ من ساعة أو مفاصلُ أخرى متورّمة — مراجعةُ الروماتيزم؛ وعلاماتٌ عصبية — أسفلُ الظهر (Rainville 2019).\n" +
    "• مراجعةُ الطبيب: ألمٌ يمنع البرنامجَ رغم التخفيف نحو أسبوعين ⟵ مسكّنٌ أو حقنةُ كورتيزون موجَّهة بالأمواج «لدعم التمرين» تُريح ٢–١٠ أسابيع (NICE NG226 · Kolasinski 2020)، ويُخبر المريضُ بخطر التقدّم السريع القليل بعدها (Sabatini 2023)؛ وألمٌ منتشر أو اكتئاب ⟵ برنامجٌ متعدّد التخصّصات (Bannuru 2019)؛ وأمراضُ القلب والسكّريّ ⟵ إذنٌ قبل التمرين الهوائيّ الشديد والأثقال (قاعدةٌ عامّة).\n" +
    "• قواعدُ هذا البروتوكول (اقتراحٌ مبنيٌّ على الهولنديّ والمعهد البريطانيّ): الجلسةُ ٦ بتهيّجٍ عالٍ رغم التخفيف ⟵ طبيبُ المركز (مسكّنٌ أو حقنة)؛ والجلسةُ ١٦ أو الأسبوعُ السادس بلا فرقٍ مهمّ في أيّ مقياس ⟵ يُعاد الفحصُ ويراجع الطبيب؛ والأسبوعُ الثاني عشر وأعراضٌ تؤثّر كثيراً في حياته رغم رعايةٍ كافية ⟵ رأيُ جرّاح العظام بالتقييم السريريّ لا بالمقاييس، ولا يُستبعد للعمر أو الوزن (NICE NG226)، ولا يؤجَّل الاستبدالُ بعد فشل الرعاية غير الجراحية (Hannon 2023). ومن جاء بهذه الحال أصلاً يُحال فوراً ويتمرّن وهو ينتظر.\n" +
    "• ما يُقال للمريض (قرارُ الطبيب): مضادّاتُ الالتهاب بالفم أفعلُ الأدوية والمسكّناتُ الأفيونية أضعفُها وأضرّها (da Costa 2021 · Osani 2021 · Krebs 2018)، والمرهمُ الموضعيّ أقلُّ فائدةً لمفصلٍ عميق كالورك (Kolasinski 2020)، والباراسيتامول أثرُه صغير (Leopoldino 2019)؛ وحقنُ الهيالورونيك لا تُنصح (Pereira 2025)؛ والاستبدالُ أنفعُ كثيراً حين يستحقّه (Frydendal 2024)، والتمرينُ قبله لا يضرّه (Villadsen 2014)؛ ومنظارُ الورك لا يُعالج الخشونة (NICE NG226).\n" +
    "موانعُ الأجهزة: منظّمُ ضربات القلب والورمُ والجلدُ المجروح أو ضعيفُ الإحساس للتحفيز والتيكار والمغناطيس والحرارة؛ والمعدنُ في مجال التيكار؛ والمميّعاتُ واضطرابُ التخثّر للإبر.",
    "Before every session: is the hip hot and swollen, is there night pain not eased by rest, has there been a fall, has the pain worsened rapidly, or is there numbness or weakness in the leg — the diagnosis is revised if it does not fit osteoarthritis (Koc 2025).\n" +
    "• Same-day referral: fever, or a hot, swollen joint or inability to bear weight, especially after a recent injection or with impaired immunity — possible septic arthritis (Ravn 2023 · NICE NG226); a fall followed by new inability to bear weight or a shortened, externally rotated leg — possible fracture, for which MRI is more accurate (Qu 2024); and sudden severe pain in an older woman with osteoporosis — a subchondral insufficiency fracture (Chen 2022).\n" +
    "• Referral within days: rapid worsening of pain or movement over weeks to months — rapidly progressive osteoarthritis (about 6% after steroid injections — Sabatini 2023; mean age 77 — Montero Furelos 2024); a risk of avascular necrosis of the femoral head: sickle cell disease — most common in the far south and north of Iraq (Al-Allawi 2012), in which silent necrosis became painful in 91% (Hernigou 2006) — high-dose steroids (Mont 2015) or steroid-treated COVID-19 (Assad 2023), especially under 50 → MRI through the doctor; night pain, weight loss or a past cancer; morning stiffness over an hour or other swollen joints — a rheumatology review; and neurological signs — the low back (Rainville 2019).\n" +
    "• A medical review: pain that blocks the programme despite load modification for about two weeks → a painkiller or an ultrasound-guided steroid injection 'to support exercise', which relieves for 2–10 weeks (NICE NG226 · Kolasinski 2020), with the patient told of the small risk of rapid progression after it (Sabatini 2023); widespread pain or depression → a multidisciplinary programme (Bannuru 2019); and heart disease or diabetes → clearance before vigorous aerobic or weight training (a general rule).\n" +
    "• This protocol's rules (a suggestion built on the Dutch guideline and NICE): session 6 with high irritability despite load modification → the centre's doctor (a painkiller or an injection); session 16 or week 6 with no important change in any measure → re-screen and a medical review; week 12 with symptoms still substantially affecting life despite adequate care → an orthopaedic opinion by clinical assessment, not by scores, and never excluded for age or weight (NICE NG226), and replacement is not delayed once non-surgical care has failed (Hannon 2023). A patient who already arrives in this state is referred at once and exercises while waiting.\n" +
    "• What the patient is told (the doctor's decision): oral anti-inflammatories are the most effective medicines and opioids the weakest and most harmful (da Costa 2021 · Osani 2021 · Krebs 2018), a topical gel helps a deep joint like the hip less (Kolasinski 2020), and paracetamol has a small effect (Leopoldino 2019); hyaluronic acid injections are not advised (Pereira 2025); replacement helps much more when it is indicated (Frydendal 2024), and exercise beforehand does not harm it (Villadsen 2014); and hip arthroscopy does not treat osteoarthritis (NICE NG226).\n" +
    "Contraindications to devices: a pacemaker, tumour, broken skin or reduced sensation for stimulation, Tecar, magnetic therapy and heat; metal in the Tecar field; and anticoagulants or bleeding disorders for needling.",
  ],
  precautions: [
    "• قاعدةُ الإشارة الضوئية في «التمارين» لكلّ المراحل؛ والقوّةُ الثقيلة يوماً بعد يوم وبينها ٤٨ ساعة، وأيّامُ ما بينها للعلاج اليدويّ والمدى والتمرين العصبيّ العضليّ والتوازن والمشي والمهامّ اليومية والتثقيف.\n" +
    "• العصا: في اليد المقابلة للورك المتألّم حين يكون ألمُ المشي ٤ من ١٠ فأكثر أو يظهر العرج (Kolasinski 2020 · Tazawa 2022)؛ وطولُها عند ثنية الرسغ.\n" +
    "• الحذاء: حذاءٌ مريح يختاره المريض بمساحةٍ للأصابع (Moseng 2024)؛ والمسطّحُ المرن والداعمُ الثابت ساويا ألمَ المشي، والداعمُ أقلُّ آثاراً جانبية (Paterson 2026)؛ ولا نعلَ مائلاً (Kolasinski 2020)، ورفعُ الكعب لفرق الطول لا دراسةَ له (بحثٌ صفريّ) — فقط لفرقٍ حقيقيّ ١–٢ سم يغيّر المشية بعد الطبيب.\n" +
    "• الدعّامة: ليست أوّلَ العلاج (F — Koc 2025)، ولا تُوصف إلّا لعدم ثباتٍ في الاستدارة بعد فشل التمرين — رأيٌ متخصّص.\n" +
    "• الوزن: خسارةُ ٥–١٠٪ تفيد الوظيفةَ والصحّة العامّة (Kolasinski 2020)، والأثرُ على ألم الورك أقلُّ يقيناً منه في الركبة — في التجربة الوحيدة لم يتغيّر الألمُ بوضوح (Hall 2025).\n" +
    "• الماء: التمرينُ في الماء له أثرٌ صغير قصير (Bartels 2016)، وحسّن ٧٢–٧٥٪ في ستّة أسابيع (Hinman 2007) — نصيحةٌ لمن يصل إلى مسبح، وليس من أجهزة المركز.\n" +
    "• الصلاةُ والجلوسُ على الأرض والمرحاضُ العربيّ والنوم: لا دراسةَ تدخّل (بحثٌ صفريّ)؛ فبطاقةُ «الصلاة والجلوس على الأرض مع خشونة الورك»: السجودُ والركبتان أبعد، والجلوسُ على وسادة، والكرسيُّ للخطوة الحمراء وحدها ومؤقّتاً — فالصلاةُ على الكرسيّ طويلاً اقترنت بوظيفةٍ أسوأ في الركبة (Ateef 2021)؛ ومقعدٌ مرتفعٌ متنقّل أو كرسيٌّ صغير فوق المرحاض العربيّ في النوبة؛ والنومُ على الظهر أو على الجهة السليمة ووسادةٌ بين الركبتين (اقتراح)؛ والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• العمل: الفلّاحون والعمّال — توزيعُ الحِمل والعربةُ وفتراتُ راحة، فرفعُ الأثقال الطويل والزراعةُ يزيدان الخطر (Jensen 2008).\n" +
    "• المناخُ والحضور: حرُّ الصيف يفضّل الدراجةَ في الداخل والمشيَ صباحاً أو مساءً؛ ومن لا يستطيع الحضورَ يومياً — كبيرٌ ينتظر من يوصله — يُعطى البديل: مرّتين إلى ثلاثٍ في الأسبوع ثمانيةَ أسابيع إلى اثني عشر كما في التجارب (بندٌ لسليم).",
    "• The traffic-light rule under 'Exercises' for every phase; heavy strength every other day with 48 hours between, and the days between for manual therapy, range of motion, neuromuscular exercise, balance, walking, daily tasks and education.\n" +
    "• The cane: in the hand opposite the painful hip when walking pain is 4/10 or more or a limp appears (Kolasinski 2020 · Tazawa 2022); set to the wrist crease.\n" +
    "• Footwear: comfortable shoes of the patient's choice with room for the toes (Moseng 2024); flat flexible and stable supportive shoes gave the same walking pain, with fewer side effects in the supportive ones (Paterson 2026); no wedged insoles (Kolasinski 2020), and heel lifts for a leg-length difference have no study (a documented zero result) — only for a true 1–2 cm difference that changes gait, after the doctor.\n" +
    "• Bracing: not a first-line treatment (F — Koc 2025), prescribed only for instability on turning after exercise has failed — a specialist opinion.\n" +
    "• Weight: losing 5–10% helps function and general health (Kolasinski 2020), and the effect on hip pain is less certain than for the knee — in the only trial the pain did not clearly change (Hall 2025).\n" +
    "• Water: exercise in water has a small short-term effect (Bartels 2016) and improved 72–75% within six weeks (Hinman 2007) — advice for those with access to a pool, not a centre device.\n" +
    "• Prayer, floor sitting, the squat toilet and sleep: no intervention study (a documented zero result); so the card 'Prayer and floor sitting with hip osteoarthritis': prostration with the knees wider, sitting on a cushion, and the chair for the red step only and only for now — long-term chair prayer was associated with worse function in the knee (Ateef 2021); a portable raised seat or low stool over the squat toilet during a flare; and sleeping on the back or on the good side with a pillow between the knees (a suggestion); the religious ruling is for the patient and their scholar.\n" +
    "• Work: farmers and labourers — split loads, use a trolley and take breaks, as long-term heavy lifting and farming raise the risk (Jensen 2008).\n" +
    "• Climate and attendance: summer heat favours indoor cycling and walking in the morning or evening; and those who cannot attend daily — an older person waiting for a lift — are offered the alternative: two to three times a week for eight to twelve weeks, as in the trials (an item for Saleem).",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "Osteoarthritis in over 16s: diagnosis and management (NG226)", org: "NICE — National Institute for Health and Care Excellence", year: 2022, url: "https://www.nice.org.uk/guidance/ng226" },
    { title: "KNGF-richtlijn Artrose heup-knie (Osteoarthritis of the hip and knee)", org: "KNGF — Royal Dutch Society for Physical Therapy guideline", year: 2018, url: "https://www.kngf.nl/kennisplatform/guidelines/osteoarthritis-of-the-hip-and-knee" },
    { title: "Hip Pain and Mobility Deficits-Hip Osteoarthritis: Revision 2025", org: "J Orthop Sports Phys Ther — APTA Academy of Orthopaedic Physical Therapy guideline, revision 2025 (Koc et al.)", year: 2025, url: "https://doi.org/10.2519/jospt.2025.0301" },
    { title: "Hip Pain and Mobility Deficits-Hip Osteoarthritis: Revision 2017", org: "J Orthop Sports Phys Ther — APTA Academy of Orthopaedic Physical Therapy guideline, revision 2017 (Cibulka et al.)", year: 2017, url: "https://doi.org/10.2519/jospt.2017.0301" },
    { title: "2019 American College of Rheumatology/Arthritis Foundation Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee", org: "Arthritis Care Res — American College of Rheumatology / Arthritis Foundation guideline 2019 (Kolasinski et al.)", year: 2020, url: "https://doi.org/10.1002/acr.24131" },
    { title: "OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis", org: "Osteoarthritis Cartilage — OARSI guideline 2019 (Bannuru et al.)", year: 2019, url: "https://doi.org/10.1016/j.joca.2019.06.011" },
    { title: "EULAR recommendations for the non-pharmacological core management of hip and knee osteoarthritis: 2023 update", org: "Ann Rheum Dis — EULAR recommendations, 2023 update (Moseng et al.)", year: 2024, url: "https://doi.org/10.1136/ard-2023-225041" },
    { title: "A clinical practice guideline for physical therapy in patients with hip or knee osteoarthritis", org: "Musculoskeletal Care — English summary of the Dutch KNGF guideline (van Doormaal et al.)", year: 2020, url: "https://doi.org/10.1002/msc.1492" },
    { title: "2023 American College of Rheumatology and American Association of Hip and Knee Surgeons Clinical Practice Guideline for the Optimal Timing of Elective Hip or Knee Arthroplasty for Patients With Symptomatic Moderate-to-Severe Osteoarthritis or Advanced Symptomatic Osteonecrosis With Secondary Arthritis for Whom Nonoperative Therapy Is Ineffective", org: "J Arthroplasty — American College of Rheumatology / American Association of Hip and Knee Surgeons guideline (Hannon et al.)", year: 2023, url: "https://doi.org/10.1002/acr.25175" },
    { title: "The prevalence of hip osteoarthritis: a systematic review and meta-analysis", org: "Arthritis Res Ther (Fan et al.)", year: 2023, url: "https://doi.org/10.1186/s13075-023-03033-7" },
    { title: "One in four people may develop symptomatic hip osteoarthritis in his or her lifetime", org: "Osteoarthritis Cartilage (Murphy et al.)", year: 2010, url: "https://doi.org/10.1016/j.joca.2010.08.005" },
    { title: "Increasing burden of hip osteoarthritis in the Middle East and North Africa (MENA): an epidemiological analysis from 1990 to 2019", org: "Arch Orthop Trauma Surg (Hoveidaei et al.)", year: 2023, url: "https://doi.org/10.1007/s00402-022-04582-3" },
    { title: "10-Year natural course of early hip osteoarthritis in middle-aged persons with hip pain: a CHECK study", org: "Ann Rheum Dis (van Berkel et al.)", year: 2021, url: "https://doi.org/10.1136/annrheumdis-2020-218625" },
    { title: "Prognostic factors for progression of osteoarthritis of the hip: a systematic review", org: "Arthritis Res Ther (Teirlinck et al.)", year: 2019, url: "https://doi.org/10.1186/s13075-019-1969-9" },
    { title: "Exercise for osteoarthritis of the hip", org: "Cochrane Database Syst Rev (Fransen et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.cd007912.pub2" },
    { title: "Exercise for osteoarthritis of the hip", org: "Cochrane Database Syst Rev (Hall et al.)", year: 2026, url: "https://doi.org/10.1002/14651858.cd007912.pub3" },
    { title: "Effect of physical therapy on pain and function in patients with hip osteoarthritis: a randomized clinical trial", org: "JAMA (Bennell et al.)", year: 2014, url: "https://doi.org/10.1001/jama.2014.4591" },
    { title: "Progressive Resistance Training or Neuromuscular Exercise for Hip Osteoarthritis : A Multicenter Cluster Randomized Controlled Trial", org: "Ann Intern Med (Kjeldsen et al.)", year: 2024, url: "https://doi.org/10.7326/m23-3225" },
    { title: "Exercise therapy may postpone total hip replacement surgery in patients with hip osteoarthritis: a long-term follow-up of a randomised trial", org: "Ann Rheum Dis (Svege et al.)", year: 2015, url: "https://doi.org/10.1136/annrheumdis-2013-203628" },
    { title: "Total Hip Replacement or Resistance Training for Severe Hip Osteoarthritis", org: "N Engl J Med (Frydendal et al.)", year: 2024, url: "https://doi.org/10.1056/nejmoa2400141" },
    { title: "Training load and pain response during progressive resistance training in patients with hip osteoarthritis in the PROHIP trial", org: "Osteoarthr Cartil Open (Bryld et al.)", year: 2025, url: "https://doi.org/10.1016/j.ocarto.2025.100690" },
    { title: "Progressive resistance training compared to neuromuscular exercise in patients with hip osteoarthritis and the additive effect of exercise booster sessions: protocol for a multicentre cluster randomised controlled trial (The Hip Booster Trial)", org: "BMJ Open (Kjeldsen et al.)", year: 2022, url: "https://doi.org/10.1136/bmjopen-2022-061053" },
    { title: "Combined ultrasound-guided hyaluronic acid injections, high-power laser therapy and physiotherapy improve hip function in osteoarthritis: A randomized controlled trial", org: "J Exp Orthop (de Sire et al.)", year: 2026, url: "https://doi.org/10.1002/jeo2.70685" },
    { title: "Minimal Important Change and Minimal Clinically Important Difference in Pain and Function With Exercise in Hip Osteoarthritis", org: "Arthritis Care Res (Hoboken) (Guerrero et al.)", year: 2026, url: "https://doi.org/10.1002/acr.80029" },
    { title: "The psychometric properties of an Arabic numeric pain rating scale for measuring osteoarthritis knee pain", org: "Disabil Rehabil (Alghadir et al.)", year: 2016, url: "https://doi.org/10.3109/09638288.2015.1129441" },
    { title: "A comparison of 3 methodological approaches to defining major clinically important improvement of 4 performance measures in patients with hip osteoarthritis", org: "J Orthop Sports Phys Ther (Wright et al.)", year: 2011, url: "https://doi.org/10.2519/jospt.2011.3515" },
    { title: "Identification of cut-points in commonly used hip osteoarthritis-related outcome measures that define the patient acceptable symptom state (PASS)", org: "Rheumatol Int (Emerson Kavchak et al.)", year: 2013, url: "https://doi.org/10.1007/s00296-013-2813-1" },
    { title: "Cross-cultural adaptation and measurement properties of the Arabic version of the Patient-Specific Functional Scale in patients with lower extremity musculoskeletal disorders", org: "Disabil Rehabil (Alnahdi et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1880651" },
    { title: "Hip osteoarthritis: where is the pain?", org: "Ann R Coll Surg Engl (Khan et al.)", year: 2004, url: "https://doi.org/10.1308/003588404322827518" },
    { title: "Pain distribution in primary care patients with hip osteoarthritis", org: "Fam Pract (Poulsen et al.)", year: 2016, url: "https://doi.org/10.1093/fampra/cmw071" },
    { title: "Hip osteoarthritis: influence of work with heavy lifting, climbing stairs or ladders, or combining kneeling/squatting with heavy lifting", org: "Occup Environ Med (Jensen et al.)", year: 2008, url: "https://doi.org/10.1136/oem.2006.032409" },
    { title: "Does This Patient Have Hip Osteoarthritis?: The Rational Clinical Examination Systematic Review", org: "JAMA (Metcalfe et al.)", year: 2019, url: "https://doi.org/10.1001/jama.2019.19413" },
    { title: "Development of a clinical prediction rule for diagnosing hip osteoarthritis in individuals with unilateral hip pain", org: "J Orthop Sports Phys Ther (Sutlive et al.)", year: 2008, url: "https://doi.org/10.2519/jospt.2008.2753" },
    { title: "Predicting radiographic hip osteoarthritis from range of movement", org: "Rheumatology (Oxford) (Birrell et al.)", year: 2001, url: "https://doi.org/10.1093/rheumatology/40.5.506" },
    { title: "Comparison of the history and physical examination for hip osteoarthritis and lumbar spinal stenosis", org: "Spine J (Rainville et al.)", year: 2019, url: "https://doi.org/10.1016/j.spinee.2019.01.006" },
    { title: "Utility of clinical tests to diagnose MRI-confirmed gluteal tendinopathy in patients presenting with lateral hip pain", org: "Br J Sports Med (Grimaldi et al.)", year: 2017, url: "https://doi.org/10.1136/bjsports-2016-096175" },
    { title: "Intra- and inter-rater reliability, agreement, and minimal detectable change of the handheld dynamometer in individuals with symptomatic hip osteoarthritis", org: "PLoS One (Vaz et al.)", year: 2023, url: "https://doi.org/10.1371/journal.pone.0278086" },
    { title: "Usefulness of the Trendelenburg test for identification of patients with hip joint osteoarthritis", org: "Physiother Theory Pract (Youdas et al.)", year: 2010, url: "https://doi.org/10.3109/09593980902750857" },
    { title: "Measurement properties of the 15-item Arabic lower extremity functional scale", org: "Disabil Rehabil (Alnahdi et al.)", year: 2021, url: "https://doi.org/10.1080/09638288.2020.1754927" },
    { title: "OARSI recommended performance-based tests to assess physical function in people diagnosed with hip or knee osteoarthritis", org: "Osteoarthritis Cartilage (Dobson et al.)", year: 2013, url: "https://doi.org/10.1016/j.joca.2013.05.002" },
    { title: "Interrater and intrarater reliability of common clinical standing balance tests for people with hip osteoarthritis", org: "Phys Ther (Choi et al.)", year: 2014, url: "https://doi.org/10.2522/ptj.20130266" },
    { title: "Cross-Cultural Adaptation, Validity and Reliability of the Arabic Version of the Falls Efficacy Scale-International (FES-I)", org: "Med Princ Pract (Halaweh et al.)", year: 2016, url: "https://doi.org/10.1159/000441128" },
    { title: "Patient education with or without manual therapy compared to a control group in patients with osteoarthritis of the hip. A proof-of-principle three-arm parallel group randomized clinical trial", org: "Osteoarthritis Cartilage (Poulsen et al.)", year: 2013, url: "https://doi.org/10.1016/j.joca.2013.06.009" },
    { title: "Efficacy of patient education and supervised exercise vs patient education alone in patients with hip osteoarthritis: a single blind randomized clinical trial", org: "Osteoarthritis Cartilage (Fernandes et al.)", year: 2010, url: "https://doi.org/10.1016/j.joca.2010.05.015" },
    { title: "Effects of High- and Low-Velocity Resistance Training on Gait Kinematics and Kinetics in Individuals with Hip Osteoarthritis: A Randomized Controlled Trial", org: "Am J Phys Med Rehabil (Fukumoto et al.)", year: 2017, url: "https://doi.org/10.1097/phm.0000000000000640" },
    { title: "Comparison of dry needling and self-stretching in muscle extensibility, pain, stiffness, and physical function in hip osteoarthritis: A randomized controlled trial", org: "Complement Ther Clin Pract (Ceballos-Laita et al.)", year: 2022, url: "https://doi.org/10.1016/j.ctcp.2022.101667" },
    { title: "The Benefits of Adding Manual Therapy to Exercise Therapy for Improving Pain and Function in Patients With Knee or Hip Osteoarthritis: A Systematic Review With Meta-analysis", org: "J Orthop Sports Phys Ther (Runge et al.)", year: 2022, url: "https://doi.org/10.2519/jospt.2022.11062" },
    { title: "In hip osteoarthritis, Nordic Walking is superior to strength training and home-based exercise for improving function", org: "Scand J Med Sci Sports (Bieler et al.)", year: 2017, url: "https://doi.org/10.1111/sms.12694" },
    { title: "Efficacy of a Very-Low-Calorie Weight Loss Diet Plus Exercise Compared With Exercise Alone on Hip Osteoarthritis Pain : A Randomized Controlled Trial", org: "Ann Intern Med (Hall et al.)", year: 2025, url: "https://doi.org/10.7326/annals-25-00045" },
    { title: "Addition of aerobic physical activity to resistance exercise for hip osteoarthritis (PHOENIX): a randomised comparative effectiveness trial", org: "Lancet Rheumatol (Hall et al.)", year: 2025, url: "https://doi.org/10.1016/s2665-9913(24)00373-4" },
    { title: "Association of knee and hip osteoarthritis with the risk of falls and fractures: a systematic review and meta-analysis", org: "Arthritis Res Ther (Zhang et al.)", year: 2023, url: "https://doi.org/10.1186/s13075-023-03179-4" },
    { title: "Range of Motion Simulation of Hip Joint Movement During Salat Activity", org: "J Arthroplasty (Jamari et al.)", year: 2017, url: "https://doi.org/10.1016/j.arth.2017.03.056" },
    { title: "Feasibility of neuromuscular training in patients with severe hip or knee OA: the individualized goal-based NEMEX-TJR training program", org: "BMC Musculoskelet Disord (Ageberg et al.)", year: 2010, url: "https://doi.org/10.1186/1471-2474-11-126" },
    { title: "Prevalence, Severity, and Correlates of Pain Flares in Response to a Repeated Sit-to-Stand Activity: A Cross-sectional Study of 14 902 Patients With Knee and Hip Osteoarthritis in Primary Care", org: "J Orthop Sports Phys Ther (Skou et al.)", year: 2020, url: "https://doi.org/10.2519/jospt.2019.9125" },
    { title: "Guideline for management of septic arthritis in native joints (SANJO)", org: "J Bone Jt Infect (Ravn et al.)", year: 2023, url: "https://doi.org/10.5194/jbji-8-29-2023" },
    { title: "Comparison of CT and MRI in diagnosing occult hip fracture: a systematic review and meta-analysis", org: "Am J Transl Res (Qu et al.)", year: 2024, url: "https://doi.org/10.62347/nubb1946" },
    { title: "Current Research on Subchondral Insufficiency Fracture of the Femoral Head", org: "Clin Orthop Surg (Chen et al.)", year: 2022, url: "https://doi.org/10.4055/cios22175" },
    { title: "Incidence of Rapidly Progressive Osteoarthritis Following Intra-articular Hip Corticosteroid Injection: A Systematic Review and Meta-Analysis", org: "Arthroplast Today (Sabatini et al.)", year: 2023, url: "https://doi.org/10.1016/j.artd.2023.101242" },
    { title: "Rapidly Progressive Osteoarthritis of the Hip: A Prospective Study", org: "J Clin Med (Montero Furelos et al.)", year: 2024, url: "https://doi.org/10.3390/jcm13092467" },
    { title: "Sickle cell disease in the Kurdish population of northern Iraq", org: "Hemoglobin (Al-Allawi et al.)", year: 2012, url: "https://doi.org/10.3109/03630269.2012.692344" },
    { title: "The natural history of asymptomatic osteonecrosis of the femoral head in adults with sickle cell disease", org: "J Bone Joint Surg Am (Hernigou et al.)", year: 2006, url: "https://doi.org/10.2106/jbjs.e.01455" },
    { title: "High-Dose Corticosteroid Use and Risk of Hip Osteonecrosis: Meta-Analysis and Systematic Literature Review", org: "J Arthroplasty (Mont et al.)", year: 2015, url: "https://doi.org/10.1016/j.arth.2015.03.036" },
    { title: "Avascular necrosis of femoral head following COVID-19 infection", org: "Ann Med Surg (Lond) (Assad et al.)", year: 2023, url: "https://doi.org/10.1097/ms9.0000000000001098" },
    { title: "Effectiveness and safety of non-steroidal anti-inflammatory drugs and opioid treatment for knee and hip osteoarthritis: network meta-analysis", org: "BMJ (da Costa et al.)", year: 2021, url: "https://doi.org/10.1136/bmj.n2321" },
    { title: "Is There Any Role for Opioids in the Management of Knee and Hip Osteoarthritis? A Systematic Review and Meta-Analysis", org: "Arthritis Care Res (Hoboken) (Osani et al.)", year: 2021, url: "https://doi.org/10.1002/acr.24363" },
    { title: "Effect of Opioid vs Nonopioid Medications on Pain-Related Function in Patients With Chronic Back Pain or Hip or Knee Osteoarthritis Pain: The SPACE Randomized Clinical Trial", org: "JAMA (Krebs et al.)", year: 2018, url: "https://doi.org/10.1001/jama.2018.0899" },
    { title: "Paracetamol versus placebo for knee and hip osteoarthritis", org: "Cochrane Database Syst Rev (Leopoldino et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd013273" },
    { title: "Effectiveness and safety of intra-articular interventions for knee and hip osteoarthritis based on large randomized trials: A systematic review and network meta-analysis", org: "Osteoarthritis Cartilage (Pereira et al.)", year: 2025, url: "https://doi.org/10.1016/j.joca.2024.08.014" },
    { title: "Postoperative effects of neuromuscular exercise prior to hip or knee arthroplasty: a randomised controlled trial", org: "Ann Rheum Dis (Villadsen et al.)", year: 2014, url: "https://doi.org/10.1136/annrheumdis-2012-203135" },
    { title: "Effects of Walking With a Cane on Frontal Plane Hip Joint Loading in Patients With Late-Stage Unilateral Hip Osteoarthritis", org: "Arch Rehabil Res Clin Transl (Tazawa et al.)", year: 2022, url: "https://doi.org/10.1016/j.arrct.2022.100209" },
    { title: "Stable Supportive Footwear for Self-managing Hip Osteoarthritis Pain : A Randomized Clinical Trial", org: "Ann Intern Med (Paterson et al.)", year: 2026, url: "https://doi.org/10.7326/annals-25-03660" },
    { title: "Aquatic exercise for the treatment of knee and hip osteoarthritis", org: "Cochrane Database Syst Rev (Bartels et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.cd005523.pub3" },
    { title: "Aquatic physical therapy for hip and knee osteoarthritis: results of a single-blind randomized controlled trial", org: "Phys Ther (Hinman et al.)", year: 2007, url: "https://doi.org/10.2522/ptj.20060006" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "J Relig Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "Reporting of Adverse Events in Randomized Controlled Trials of Therapeutic Exercise for Hip Osteoarthritis: A Systematic Review", org: "Phys Ther (James et al.)", year: 2021, url: "https://doi.org/10.1093/ptj/pzab195" },
    { title: "Effects of device-performed and manual hip traction and vibration therapy in older adults with symptomatic hip osteoarthritis: A randomized single-blind controlled trial", org: "J Back Musculoskelet Rehabil (Josipović et al.)", year: 2024, url: "https://doi.org/10.3233/bmr-230109" },
    { title: "The ability of a sustained within-session finding of pain reduction during traction to dictate improved outcomes from a manual therapy approach on patients with osteoarthritis of the hip", org: "J Man Manip Ther (Wright et al.)", year: 2010, url: "https://doi.org/10.1179/106698110x12640740712536" },
    { title: "Effect of transcutaneous electrical nerve stimulation (TENS) on knee pain and physical function in patients with symptomatic knee osteoarthritis: the ETRELKA randomized clinical trial", org: "Osteoarthritis Cartilage (Reichenbach et al.)", year: 2022, url: "https://doi.org/10.1016/j.joca.2021.10.015" },
    { title: "The effect of additional therapeutic ultrasound in patients with primary hip osteoarthritis: a randomized placebo-controlled study", org: "Clin Rheumatol (Köybaşi et al.)", year: 2010, url: "https://doi.org/10.1007/s10067-010-1468-5" },
    { title: "Evaluation of β-endorphin concentration, mood, and pain intensity in men with idiopathic hip osteoarthritis treated with variable magnetic field", org: "Medicine (Baltimore) (Koczy et al.)", year: 2019, url: "https://doi.org/10.1097/md.0000000000016431" },
    { title: "Efficacy and safety of the pulsed electromagnetic field in osteoarthritis: a meta-analysis", org: "BMJ Open (Wu et al.)", year: 2018, url: "https://doi.org/10.1136/bmjopen-2018-022879" },
    { title: "Effects of dry needling in HIP muscles in patients with HIP osteoarthritis: A randomized controlled trial", org: "Musculoskelet Sci Pract (Ceballos-Laita et al.)", year: 2019, url: "https://doi.org/10.1016/j.msksp.2019.07.006" },
    { title: "Effectiveness of Dry Needling Therapy on Pain, Hip Muscle Strength, and Physical Function in Patients With Hip Osteoarthritis: A Randomized Controlled Trial", org: "Arch Phys Med Rehabil (Ceballos-Laita et al.)", year: 2021, url: "https://doi.org/10.1016/j.apmr.2021.01.077" },
    { title: "Acupuncture for hip osteoarthritis", org: "Cochrane Database Syst Rev (Manheimer et al.)", year: 2018, url: "https://doi.org/10.1002/14651858.cd013010" },
    { title: "Effects of various types of ultrasound therapy in hip osteoarthritis - a double-blind, randomized, controlled, follow-up study", org: "Physiother Theory Pract (Király et al.)", year: 2022, url: "https://doi.org/10.1080/09593985.2021.1895386" },
    { title: "Therapeutic ultrasound for osteoarthritis of the knee or hip", org: "Cochrane Database Syst Rev (Rutjes et al.)", year: 2010, url: "https://doi.org/10.1002/14651858.cd003132.pub2" },
    { title: "The Short-Term Efficacy of Large-Focused and Controlled-Unfocused (Radial) Extracorporeal Shock Wave Therapies in the Treatment of Hip Osteoarthritis", org: "J Pers Med (Şah et al.)", year: 2022, url: "https://doi.org/10.3390/jpm13010048" },
    { title: "Continuous passive motion for osteoarthritis of the hip: a pilot study", org: "J Rheumatol (Simkin et al.)", year: 1999, url: "https://pubmed.ncbi.nlm.nih.gov/10493681/" },
    { title: "Weight-shifting-based robot control system improves the weight-bearing rate and balance ability of the static standing position in hip osteoarthritis patients: a randomized controlled trial focusing on outcomes after total hip arthroplasty", org: "PeerJ (Miyazaki et al.)", year: 2023, url: "https://doi.org/10.7717/peerj.15397" },
    { title: "Hip abductor muscle activity as subjects with hip prostheses walk with different methods of using a cane", org: "Phys Ther (Neumann et al.)", year: 1998, url: "https://doi.org/10.1093/ptj/78.5.490" },
    { title: "In vivo hip pressures during cane and load-carrying gait", org: "Arthritis Care Res (McGibbon et al.)", year: 1997, url: "https://doi.org/10.1002/art.1790100504" },
    { title: "Prognosis of hip pain in general practice: a prospective followup study", org: "Arthritis Rheum (Lievense et al.)", year: 2007, url: "https://doi.org/10.1002/art.23094" },
    { title: "Efficacy and potential determinants of exercise therapy in knee and hip osteoarthritis: A systematic review and meta-analysis", org: "Ann Phys Rehabil Med (Goh et al.)", year: 2019, url: "https://doi.org/10.1016/j.rehab.2019.04.006" },
    { title: "Booster sessions for maintaining the effect of neuromuscular exercise and progressive resistance training in hip osteoarthritis: 12-month follow-up from a multicenter cluster-randomized controlled trial", org: "Osteoarthritis Cartilage (Kjeldsen et al.)", year: 2025, url: "https://doi.org/10.1016/j.joca.2025.07.012" },
    { title: "Immediate effects of hip mobilization with movement in patients with hip osteoarthritis: A randomised controlled trial", org: "Man Ther (Beselga et al.)", year: 2016, url: "https://doi.org/10.1016/j.math.2015.10.007" },
    { title: "Comparison of manual therapy and exercise therapy in osteoarthritis of the hip: a randomized clinical trial", org: "Arthritis Rheum (Hoeksma et al.)", year: 2004, url: "https://doi.org/10.1002/art.20685" },
    { title: "The influence of manual therapy dosing on outcomes in patients with hip osteoarthritis: a systematic review", org: "J Man Manip Ther (Shepherd et al.)", year: 2022, url: "https://doi.org/10.1080/10669817.2022.2037193" },
    { title: "Impact of cane use on pain, function, general health and energy expenditure during gait in patients with knee osteoarthritis: a randomised controlled trial", org: "Ann Rheum Dis (Jones et al.)", year: 2012, url: "https://doi.org/10.1136/ard.2010.140178" },
    { title: "Can postural modification reduce kinetic and kinematic loading during the bowing postures of Islamic prayer?", org: "Ergonomics (AbouHassan et al.)", year: 2010, url: "https://doi.org/10.1080/00140139.2010.532881" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — أيّامُ القوّة الثلاثة يوماً بعد يوم وبينها ٤٨ ساعة (إحماءٌ على الدراجة عشرَ دقائق، ثمّ ضغطُ الساقين وبسطُ الورك وثنيُه وتبعيدُه ٣ مجموعات بثقلٍ يُرفع ١٢ ثمّ ١٠ ثمّ ٨ مرّات وراحةُ ٦٠ ثانية — Bryld 2025)، والأيّامُ الخفيفة بينها (العلاجُ اليدويّ لمن نقص مداه، والمدى والتمطيط، والتمرينُ العصبيّ العضليّ والتوازن، والمشيُ بالعصا إن احتاجها، والمهامُّ اليومية، والتثقيفُ ومراجعةُ البرنامج المنزليّ).",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — three strength days every other day with 48 hours between (a ten-minute warm-up on the bike, then leg press and hip extension, flexion and abduction for 3 sets at a load lifted 12, then 10, then 8 times, with 60 seconds' rest — Bryld 2025), and light days in between (manual therapy for limited range, range of motion and stretching, neuromuscular and balance exercise, walking with a cane if needed, daily tasks, and education with a review of the home programme)."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ الأرضيّ «أساسيّ» (Bannuru 2019) وبقوّة (Kolasinski 2020) وA (Koc 2025)؛ وخفّض الألمَ ٨ من ١٠٠ (Fransen 2014)؛ والعلاجُ اليدويّ داخلَه قصيراً لا وحده — وفيه الخلافُ المكتوب (NICE NG226 · Kolasinski 2020). والدراجةُ من التمرين هنا — للإحماء واللياقة. والآثارُ الجانبية خفيفةٌ قليلة (٥٫٨٪ — James 2021).",
        "Core in every session — land-based exercise is 'core' (Bannuru 2019), strongly recommended (Kolasinski 2020) and grade A (Koc 2025); it reduced pain by 8 out of 100 (Fransen 2014); manual therapy is inside it, brief and never alone — with the disagreement recorded (NICE NG226 · Kolasinski 2020). Cycling is part of exercise here — for warm-up and fitness. Side effects are mild and few (5.8% — James 2021)."] },
    { code: "traction", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { forcePctBw: "400–600 N in the trial (~55–80% of a 75-kg body)", holdRestS: "Sustained, with 6–15 Hz vibration in the trial", durationMin: "10–15 (suggestion — trial time not stated)", mode: "Long-axis, supine, hip ~30° flexion and abduction" },
      parameters: ["شدٌّ طوليٌّ للورك بالجهاز فقط إن كان جهازُ المركز يشدّ الوركَ بحزامٍ حول الفخذ فوق الركبة (لا عبر ركبةٍ مؤلمة أو مستبدَلة): في الاستلقاء والوركُ مثنيٌّ ومبعَدٌ نحو ٣٠°، وفي التجربة ٤٠٠–٦٠٠ نيوتن مع اهتزاز ٦–١٥ هرتز مرّتين في الأسبوع اثني عشرَ أسبوعاً (Josipović 2024)؛ وإلّا فالشدُّ الطوليّ باليد في بطاقته داخلَ التمرين؛ ويتبعه التمرينُ دائماً.",
        "Mechanical long-axis traction of the hip only if the centre's device can pull the hip through a cuff around the thigh above the knee (not through a painful or replaced knee): lying on the back with the hip flexed and abducted about 30°, and in the trial 400–600 N with 6–15 Hz vibration twice a week for twelve weeks (Josipović 2024); otherwise the manual long-axis distraction on its card within exercise; always followed by exercise."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والدليلُ ضعيف: تجربةٌ واحدة صغيرة (٢٨ مريضاً) ساوى فيها الجهازُ الشدَّ باليد وفاق الوهميّ (Josipović 2024)، والشدُّ الطوليّ باليد A داخل العلاج اليدويّ (Koc 2025)، والهولنديّ ضدّ التحريك السلبيّ (KNGF — van Doormaal 2020)؛ والراحةُ أثناء الشدّ في الجلسة الأولى لا تنبئ بالنتيجة (Wright 2010). ممنوعٌ مع اشتباه النخر أو الكسر أو الالتهاب أو الورم والهشاشة الشديدة ومفصلٍ صناعيّ في الورك نفسِه.",
        "Rotating adjunct by the centre's rule (Saleem) — the evidence is weak: one small trial (28 patients) in which the device equalled manual traction and beat sham (Josipović 2024), manual long-axis distraction is grade A within manual therapy (Koc 2025), and the Dutch guideline is against passive mobilisation (KNGF — van Doormaal 2020); relief during traction at the first session does not predict the outcome (Wright 2010). Contraindicated with suspected necrosis, fracture, infection or tumour, severe osteoporosis and a replacement in the same hip."] },
    { code: "electro", centreUse: "adjunct", evidence: "not_recommended", minutes: 20,
      params: { currentType: "TENS (conventional)", frequencyHz: "80–100", pulseWidthUs: "100–200", intensity: "Strong comfortable tingling, no contraction", durationMin: "20–30" },
      parameters: ["تحفيزٌ عبر الجلد تقليديّ (Conventional TENS) قبل التمرين وحده، لمن يمنعه الألمُ من التمرين: الأقطابُ حول الورك المتألّم، بوخزٍ قويٍّ مريح بلا انقباض — ويُقال للمريض إنّه يسكّن ولا يعالج؛ والتحفيزُ العضليّ والتداخليّ لا يُستعملان (NICE NG226).",
        "Conventional TENS before exercise only, for those whose pain stops them exercising: electrodes around the painful hip, at a strong but comfortable tingling with no contraction — the patient is told it relieves but does not treat; NMES and interferential are not used (NICE NG226)."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والإرشاداتُ ضدّه: الكلّيةُ الأمريكية ضدّه بقوّة (Kolasinski 2020)، و«لا يُقدَّم» (NICE NG226)، والهولنديّ لا يقبله إلّا قصيراً إن منع الألمُ التمرين (KNGF — van Doormaal 2020)؛ ولا تجربةَ له في خشونة الورك (بحثٌ صفريّ)، وفي الركبة ساوى الوهميّ (Reichenbach 2022). فلا يُعطى وحده ولا بدلَ التمرين — وبندٌ لسليم. ممنوعٌ مع منظّم ضربات القلب أو على جلدٍ ضعيف الإحساس.",
        "Rotating adjunct by the centre's rule (Saleem) — and the guidelines are against it: the American College strongly against (Kolasinski 2020), 'do not offer' (NICE NG226), and the Dutch guideline accepts it only briefly if pain blocks exercise (KNGF — van Doormaal 2020); there is no trial of it in hip osteoarthritis (a documented zero result), and in the knee it equalled placebo (Reichenbach 2022). So never alone and never instead of exercise — and an item for Saleem. Contraindicated with a pacemaker or over skin with poor sensation."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "15–20" },
      parameters: ["على مقدّمة الورك وجانبه قبل التمارين لتسهيلها لا بدلها، وفي البيت للراحة؛ ويُفحص الجلدُ بعد خمس دقائق، ولا على جلدٍ ضعيف الإحساس (اعتلالُ أعصاب السكّريّ).",
        "Over the front and side of the hip before exercise to ease it, never instead of it, and at home for comfort; check the skin after five minutes, and never over skin with poor sensation (diabetic neuropathy)."],
      note: ["مساعدٌ بالتناوب — للراحة قبل التمرين: العلاجاتُ الحرارية مشروطةٌ معها (Kolasinski 2020)، والهولنديّ ضدّ العلاج بالحرارة (KNGF — van Doormaal 2020)؛ ولا تجربةَ للحرارة وحدها في خشونة الورك (بحثٌ صفريّ) — والكمادةُ كانت في ذراعي تجربة الأمواج فوق الصوتية مع التمرين (Köybaşı 2010).",
        "Rotating adjunct — for comfort before exercise: thermal treatments are conditionally recommended (Kolasinski 2020), and the Dutch guideline is against thermotherapy (KNGF — van Doormaal 2020); there is no trial of heat alone in hip osteoarthritis (a documented zero result) — the hot pack was in all arms of an ultrasound trial alongside exercise (Köybaşı 2010)."] },
    { code: "infrared", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { distanceCm: "45–60", durationMin: "10–15" },
      parameters: ["بديلُ الكمادة الحارّة حين لا تتوفّر، بالشروط نفسِها: على مقدّمة الورك وجانبه، ويُفحص الإحساسُ قبلها.", "An alternative to the hot pack when it is unavailable, with the same conditions: over the front and side of the hip, with sensation tested first."],
      note: ["مساعدٌ بالتناوب — دفءٌ مريح لا أكثر: لا تجربةَ للأشعّة تحت الحمراء في خشونة الورك (بحثٌ صفريّ)، والحرارةُ السطحية لا تصل إلى مفصل الورك العميق. لا يُعطى وحده.",
        "Rotating adjunct — comfortable warmth only: there is no trial of infrared in hip osteoarthritis (a documented zero result), and superficial heat does not reach the deep hip joint. Never given alone."] },
    { code: "tecar", centreUse: "adjunct", evidence: "not_recommended", minutes: 12,
      params: { mode: "CAP → RES, athermic to mild warmth", powerPct: "10–30 (suggestion)", durationMin: "10–12" },
      parameters: ["على مقدّمة الورك وجانبه في الاستلقاء، بشدّةٍ منخفضة بلا حرارةٍ أو بدفءٍ خفيف، قبل التمرين — والإعداداتُ اقتراح، فلا تجربة.",
        "Over the front and side of the hip lying down, at low athermic-to-mildly-warm intensity, before exercise — the settings are a suggestion, as there is no trial."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — لا تجربةَ للتيكار في خشونة الورك (بحثٌ صفريّ)، و«لا تُقدَّم» الموجاتُ القصيرة النبضية (NICE NG226)، والكلّيةُ الأمريكية تعدّ الإنفاذَ الحراريّ ضمن «الحرارة» المشروطة (Kolasinski 2020). ممنوعٌ مع منظّم ضربات القلب والمعدن في المجال والورم والحمل والجلد ضعيف الإحساس.",
        "Rotating adjunct by the centre's rule (Saleem) — there is no trial of Tecar in hip osteoarthritis (a documented zero result), pulsed short-wave is 'do not offer' (NICE NG226), and the American College counts diathermy among conditionally recommended 'thermal' treatments (Kolasinski 2020). Contraindicated with a pacemaker, metal in the field, tumour, pregnancy and skin with poor sensation."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "not_recommended", minutes: 12,
      params: { frequencyHz: "Trial: 180–195 Hz impulses grouped at 12.5–29 Hz", durationMin: "12" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول مفصل الورك قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز؛ وفي الدراسة الوحيدة ١٢ دقيقة يومياً خمسةَ أيّام في الأسبوع ثلاثةَ أسابيع (Koczy 2019)، وإعداداتُ الشدّة يكتبها المشرفُ من الجهاز.",
        "Pulsed electromagnetic field (PEMF) around the hip joint before exercise, non-thermal — on the centre device's programme; the only study used 12 minutes daily, five days a week for three weeks (Koczy 2019), and the intensity settings are entered by the supervisor from the device."],
      note: ["مساعدٌ بالتناوب بقاعدة المركز (سليم) — والدليلُ شبهُ معدوم: دراسةٌ واحدة في ثلاثين رجلاً بلا مجموعةٍ وهمية نقص فيها الألمُ ٩–١٤٪ في المجموعتين (Koczy 2019)، والهولنديّ ضدّ المجال المغناطيسيّ (KNGF — van Doormaal 2020)، وتحليلاتُه الجامعة في الركبة لا الورك (Wu 2018). ممنوعٌ مع منظّم ضربات القلب والحمل والورم.",
        "Rotating adjunct by the centre's rule (Saleem) — with almost no evidence: one study of thirty men without a sham group, in which pain fell 9–14% in both groups (Koczy 2019); the Dutch guideline is against electromagnetic fields (KNGF — van Doormaal 2020), and its meta-analyses are in the knee, not the hip (Wu 2018). Contraindicated with a pacemaker, pregnancy and tumour."] },
    { code: "needle", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 3,
      params: { needleSize: "0.25 × 50", points: "Active trigger points: iliopsoas, rectus femoris, TFL, gluteus medius/minimus", sessions: "3 (1 / week × 3)" },
      parameters: ["لحامل علَم الإبر الجافّة وحده، ولمن يرغب فيها ولا يأخذ مميّعات الدم: النقاطُ الزنادية النشطة التي تعيد ألمَه وتحدّ المدى أو القوّة — في الحرقفية القطنية والمستقيمة الفخذية وموتّر اللفافة والألوية الوسطى والصغرى — دخولٌ وخروجٌ سريع بإبرة ٠٫٢٥ × ٥٠ ملم، مرّةً في الأسبوع ثلاثَ مرّات (Koc 2025)، في يومٍ خفيف ويتبعها التمرين؛ والحرقفيةُ القطنية بجانب الحزمة الوعائية العصبية الفخذية — لمن تدرّب عليها وحده.",
        "Dry-needling certified staff only, for patients who want it and are not on anticoagulants: active trigger points that reproduce the pain and limit range or strength — in the iliopsoas, rectus femoris, tensor fasciae latae and gluteus medius and minimus — fast in and fast out with a 0.25 × 50 mm needle, once a week three times (Koc 2025), on a light day and followed by exercise; the iliopsoas lies beside the femoral neurovascular bundle — only for those trained in it."],
      note: ["مساعدٌ بموعدٍ دوريّ — وفيه خلافٌ صريح: إرشادُ JOSPT يعطيه A قصيرَ المدى ثلاثةَ أسابيع (Koc 2025)، والمعهدُ البريطانيّ «لا تُقدَّم» الإبرُ الصينية ولا الجافّة (NICE NG226)؛ ودليلُه من مجموعةٍ بحثية واحدة: أقلُّ ألماً وأكثرُ مدىً وقوّةً من الوهميّ (Ceballos-Laita 2019 · Ceballos-Laita 2021) وأكثرُ مرونةً من التمطيط (Ceballos-Laita 2022)؛ والوخزُ الصينيّ قليلُ الأثر أو بلا أثرٍ على الوهميّ (Manheimer 2018) فلا يُستعمل. يُشرح الخلافُ للمريض. ممنوعٌ مع المميّعات والالتهاب الموضعيّ والوذمة اللمفية والحمل.",
        "Adjunct on a periodic schedule — with an open disagreement: the JOSPT guideline gives it grade A for the short term over three weeks (Koc 2025), while NICE says do not offer acupuncture or dry needling (NICE NG226); its evidence comes from one research group: less pain and more range and strength than sham (Ceballos-Laita 2019 · Ceballos-Laita 2021) and more flexibility than stretching (Ceballos-Laita 2022); acupuncture had little or no effect over sham (Manheimer 2018) and is not used. The disagreement is explained to the patient. Contraindicated with anticoagulants, local infection, lymphoedema and pregnancy."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم حتى يقرّر سليم — D في إرشاد JOSPT (Koc 2025)، و«لا يُقدَّم» (NICE NG226)، والهولنديّ ضدّه؛ وتجربةٌ إيجابية (Köybaşı 2010) وأخرى سلبية (Király 2022)، ولا تجربةَ وركٍ في مراجعة كوكرين (Rutjes 2010). فإن طلبه مريضٌ بعد قرارٍ مشترك: ١ ميغاهرتز مستمرّ و١ واط لكلّ سم² خمسَ دقائق لكلٍّ من مقدّمة الورك وجانبه وخلفه، عشرَ جلساتٍ في أسبوعين مع التمرين (Köybaşı 2010).",
        "Not used until Saleem decides — grade D in the JOSPT guideline (Koc 2025), 'do not offer' (NICE NG226), and the Dutch guideline is against it; one positive trial (Köybaşı 2010) and one negative (Király 2022), and no hip trial in the Cochrane review (Rutjes 2010). If a patient asks for it after a shared decision: 1 MHz continuous at 1 W/cm² for five minutes each to the front, side and back of the hip, ten sessions in two weeks with exercise (Köybaşı 2010)."] },
    { code: "laser", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — «لا يُقدَّم» (NICE NG226) والهولنديّ ضدّه؛ والتجربةُ الوحيدة أضافت الليزرَ عالي الشدّة إلى حقن الهيالورونيك والعلاج الطبيعيّ في الذراعين، ولم يختلف المقياسُ الأساسيّ (de Sire 2026).",
        "Not used — 'do not offer' (NICE NG226) and the Dutch guideline is against it; the only trial added high-intensity laser to hyaluronic acid injections and physiotherapy given in both arms, and the primary measure did not differ (de Sire 2026)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — تجربةٌ واحدة (Şah 2022) والهولنديّ ضدّه — فلا إعداداتِ جهازٍ تمنع اعتمادَه. وإعداداتُها للمرجع إن أراده سليم خطّاً ثانياً: أربعُ جلساتٍ أسبوعية؛ المركّزةُ ٤ ثمّ ٨ هرتز و١٫٦ ثمّ ١٫٨ بار و٥٠٠ ثمّ ١٥٠٠ نبضة، والشعاعيةُ ٦ ثمّ ٨ هرتز و١٫٥ ثمّ ١٫٦ بار و٥٠٠ ثمّ ١٥٠٠ نبضة (Şah 2022). وموجاتُ نخر رأس الفخذ وأوتار جانب الورك قرارٌ آخر لا يخصّ الخشونة.",
        "Not used — a single trial (Şah 2022), and the Dutch guideline is against it — so no device settings block approval. Its settings for reference if Saleem wants it as second line: four weekly sessions; focused 4 then 8 Hz, 1.6 then 1.8 bar and 500 then 1,500 pulses, and radial 6 then 8 Hz, 1.5 then 1.6 bar and 500 then 1,500 pulses (Şah 2022). Shockwave for femoral-head necrosis or the lateral hip tendons is a separate decision, not for osteoarthritis."] },
    { code: "wax", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — الشمعُ لخشونة اليد لا الورك (Kolasinski 2020)، ولا تجربة.", "Not used — paraffin is for hand osteoarthritis, not the hip (Kolasinski 2020), and there is no trial."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ ولا مكان.", "Not used — no trial and no place."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — دراسةٌ أوّلية بلا مقارنة (Simkin 1999)، والهولنديّ ضدّه.", "Not used — an uncontrolled pilot study (Simkin 1999), and the Dutch guideline is against it."] },
    { code: "robotik", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — مريضُ الخشونة يمشي وحده، والتجربةُ الوحيدة بعد الاستبدال (Miyazaki 2023).", "Not used — patients with osteoarthritis walk independently, and the only trial was after replacement (Miyazaki 2023)."] },
  ],
  phases: [
    {
      name: ["الحِملُ المحتمَل والحركة", "Load tolerance and movement"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الجلساتُ الستّ الأولى (الأسبوعُ الأوّل)", "The first six sessions (the first week)"],
      goals: [
        "قاعدةُ الإشارة الضوئية محترمةٌ في أيّام القوّة، وأثقالُ ١٢ مرّةً مضبوطةٌ لثلاثة تمارين على الأقلّ، والمدى يتحسّن لمن نقص، والمشيُ اليوميّ بدأ (بالعصا لمن يحتاجها)، والبرنامجُ المنزليّ يؤدّيه وحده؛ وفهمُ الحالة وقاعدةِ الألم.",
        "The traffic-light rule respected on strength days, 12-repetition loads set for at least three exercises, range improving where limited, daily walking started (with a cane for those who need it), and the home programme done independently; and understanding of the condition and the pain rule.",
      ],
      education: [
        "• ما هي الحالة: الخشونةُ شائعة وتُشخَّص سريرياً، والمفصلُ يتكيّف مع التحميل المتدرّج — والتمرينُ وإدارةُ الوزن هما العلاجُ الأساسيّ (NICE NG226).\n" +
        "• المسار: أكثرُهم تبقى أعراضُهم مستقرّة سنواتٍ (van Berkel 2021)، والتمرينُ مع التثقيف أخّر الاستبدال (Svege 2015).\n" +
        "• قاعدةُ الإشارة الضوئية: ٠–٢ آمن، و٣–٥ مقبول، وفوق ٥ كثير، والصباحُ هو الحَكَم (Ageberg 2010).\n" +
        "• العصا في اليد المقابلة حين يؤلم المشي، والأحمالُ موزّعة (Neumann 1998 · McGibbon 1997).\n" +
        "• لا حلولَ سلبية: الأجهزةُ تسكّن ولا تعالج، والحقنةُ إن احتاجها تدعم التمرينَ لا تحلّ محلَّه (NICE NG226).",
        "• What the condition is: osteoarthritis is common and diagnosed clinically, and the joint adapts to graded loading — exercise and weight management are the core treatments (NICE NG226).\n" +
        "• The course: most people's symptoms stay stable for years (van Berkel 2021), and exercise with education delayed replacement (Svege 2015).\n" +
        "• The traffic-light rule: 0–2 safe, 3–5 acceptable, above 5 too much, and the next morning is the judge (Ageberg 2010).\n" +
        "• A cane in the opposite hand when walking hurts, and loads split between the hands (Neumann 1998 · McGibbon 1997).\n" +
        "• No passive fixes: devices relieve rather than treat, and an injection, if needed, supports exercise rather than replacing it (NICE NG226).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• قاعدةُ الإشارة الضوئية محترمة (بعد الجلسة ٥ من ١٠ أو أقلّ ويعود المعتادُ صباحاً) في آخر جلستَي قوّة.\n" +
        "• أثقالُ ١٢ مرّةً مضبوطةٌ لثلاثة تمارين فأكثر (Bryld 2025 · Kjeldsen 2022).\n" +
        "• البرنامجُ المنزليّ يؤدّيه صحيحاً وحده، ولا علامةَ إحالة.\n" +
        "(اقتراحٌ يجمع قاعدةَ الألم وطريقةَ التجارب، لا معيارٌ مجرَّب.) ومن تهيّجُه عالٍ (ألمُ الراحة أو الليل ٧ من ١٠ فأكثر) يبقى فيها أطولَ بقاعدة الساعتين الهولندية.",
        "Progress to phase 2 when all are met:\n" +
        "• The traffic-light rule respected (5/10 or less after the session and back to usual by the morning) on the last two strength sessions.\n" +
        "• 12-repetition loads set for three or more exercises (Bryld 2025 · Kjeldsen 2022).\n" +
        "• The home programme done correctly and independently, with no referral sign.\n" +
        "(A proposal combining the pain rule and the trials' method, not a tested criterion.) A patient with high irritability (rest or night pain of 7/10 or more) stays longer, using the Dutch two-hour rule.",
      ],
      notes: [
        "• العلاجُ اليدويّ لمن نقص تدويرُه الداخليّ أو ثنيُه: الشدُّ الطوليّ والتحريك (Koc 2025)، قصيرٌ ويتبعه التمرينُ في الجلسة نفسِها، ويُترك إن لم يكسب مدىً بعد ٤–٦ جلسات.\n" +
        "• التمطيط: التدويرُ الداخليّ والرجوعُ على أربع والانبطاح للبسط — فنقصُ البسط ينبئ بالاستبدال (Lievense 2007).\n" +
        "• التقويةُ بثقلٍ خفيف: الجسرُ ورفعُ الساق جانباً والصدفةُ والجلوسُ والقيامُ من مقعدٍ مرتفع ومدُّ الركبة جالساً؛ وتُضبط أثقالُ ١٢ مرّةً لضغط الساقين والورك في الجلسات ٣–٦ بدءاً بنحو نصف الأقصى (Kjeldsen 2022).\n" +
        "• الدراجةُ عشرَ دقائق والمقعدُ عالٍ، والمشيُ يبدأ بعشر دقائق، والعصا إن كان ألمُ المشي ٤ من ١٠ فأكثر أو ظهر العرج.\n" +
        "• الأجهزةُ المساعدة للراحة قبل التمرين لا بدله.",
        "• Manual therapy for limited internal rotation or flexion: long-axis distraction and mobilisation (Koc 2025), brief and followed by exercise in the same session, and stopped if it gains no range after 4–6 sessions.\n" +
        "• Stretching: internal rotation, the quadruped rock-back and prone lying for extension — loss of extension predicts replacement (Lievense 2007).\n" +
        "• Low-load strengthening: the bridge, side-lying abduction, the clamshell, sit-to-stand from a raised seat and seated knee extension; 12-repetition loads are set for the leg press and the hip in sessions 3–6, starting at about half of maximum (Kjeldsen 2022).\n" +
        "• The bike for ten minutes with a high saddle, walking starting at ten minutes, and a cane if walking pain is 4/10 or more or a limp appears.\n" +
        "• Adjunct devices for comfort before exercise, never instead of it.",
      ],
      exercises: [
        { code: "stationary-cycling",
          doseNote: ["عشرُ دقائق بجهدٍ خفيف إلى متوسّط والمقعدُ عالٍ لمن نقص ثنيُه (اقتراح) — إحماءُ أيّام القوّة (Bryld 2025).", "Ten minutes at light to moderate effort with a high saddle for limited flexion (a suggestion) — the strength-day warm-up (Bryld 2025)."] },
        { code: "hip-long-axis-distraction",
          note: ["لمن نقص تدويرُه الداخليّ أو ثنيُه مع ألم: في الأيّام الخفيفة، يتبعه التمرينُ مباشرةً، ويُترك إن لم يكسب مدىً بعد ٤–٦ جلسات.", "For limited, painful internal rotation or flexion: on light days, followed immediately by exercise, and stopped if it gains no range after 4–6 sessions."] },
        { code: "hip-internal-rotation-stretch", sets: 1, reps: 3, hold: 45, rest: 15 },
        { code: "quadruped-rock-back", sets: 2, reps: 10, hold: 5 },
        { code: "prone-lying-hip-extension",
          note: ["لمن نقص بسطُ وركه (اختبار توماس): الانبطاحُ دقائقَ بالقدر المريح والرفعُ ٣ × ١٠ — فنقصُ البسط ينبئ بالاستبدال (Lievense 2007).", "For limited hip extension (Thomas test): lying face down for as many minutes as is comfortable and the lift 3 × 10 — loss of extension predicts replacement (Lievense 2007)."] },
        { code: "glute-bridge", sets: 3, reps: 10, hold: 3, rest: 60 },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10, rest: 60,
          note: ["وإن آلمه الاستلقاءُ على الجنب: تبعيدُ الورك في الاستلقاء بالانزلاق بدلاً منه.", "If lying on the side hurts: the supine hip abduction slide instead."] },
        { code: "clamshell", sets: 3, reps: 10, rest: 60 },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["من مقعدٍ مرتفع أوّلاً — والعددُ في ٣٠ ثانية مقياسُ المرحلة (Wright 2011).", "From a raised seat at first — the 30-second count is the phase measure (Wright 2011)."] },
        { code: "seated-knee-extension", sets: 3, reps: 12, rest: 60 },
        { code: "leg-press-progressive", sets: 3, reps: 12, rest: 60,
          note: ["يُضبط ثقلُ ١٢ مرّةً في الجلسات ٣–٦ بدءاً بنحو نصف الأقصى (Kjeldsen 2022)، بمدىً كاملٍ بقدر ما يسمح الورك (Bryld 2025).", "The 12-repetition load is set in sessions 3–6 starting at about half of maximum (Kjeldsen 2022), through as full a range as the hip allows (Bryld 2025)."] },
        { code: "graded-walking",
          doseNote: ["تبدأ بعشر دقائق في أيّامٍ مختلفة وتزيد خمسَ دقائق في الأسبوع، بقاعدة الإشارة الضوئية (KNGF — van Doormaal 2020).", "Starting at ten minutes on separate days and adding five minutes a week, within the traffic-light rule (KNGF — van Doormaal 2020)."] },
        { code: "contralateral-cane-walking",
          note: ["لمن ألمُ مشيه ٤ من ١٠ فأكثر أو يعرج: ضبطُ الطول والتدريبُ في الممرّ والدرج (Tazawa 2022).", "For walking pain of 4/10 or more or a limp: setting the height and practising in the corridor and on stairs (Tazawa 2022)."] },
      ],
    },
    {
      name: ["التقوية المتدرّجة والتمرين العصبيّ العضليّ", "Progressive strengthening and neuromuscular exercise"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["الجلسات ٧–١٦ (الأسبوعان الثاني والثالث تقريباً)", "Sessions 7–16 (roughly weeks 2 and 3)"],
      goals: [
        "أثقالُ ١٢ ثمّ ١٠ مرّات تزيد بانتظام، والتمرينُ العصبيّ العضليّ بمستواه الثاني أو الثالث، والمشيُ أو الدراجة ٢٠–٣٠ دقيقة بجهدٍ متوسّط، والألمُ ينقص نقطتين، والجلوسُ والقيامُ ٣٠ ثانية +٢، والأنشطةُ المختارة +٢.",
        "12- then 10-repetition loads rising steadily, neuromuscular exercise at its second or third level, walking or cycling for 20–30 minutes at moderate effort, pain down 2 points, the 30-second chair stand up 2, and the chosen activities up 2.",
      ],
      education: [
        "• الثقلُ هو الدواء: يزيد ٢–١٠٪ حين تكتمل المجموعةُ الثالثة، والإنزالُ البطيء (Kjeldsen 2022).\n" +
        "• التوازنُ يحمي من السقوط — والسقوطُ أكثرُ مع خشونة الورك (Zhang 2023).\n" +
        "• النوبةُ ليست ضرراً: يومان أو ثلاثةٌ أخفّ ثمّ يعود — ولا يتوقّف عن الحركة.\n" +
        "• الوزنُ والنشاطُ اليوميّ: المشيُ ٣٠ دقيقة خمسةَ أيّام هدفٌ للصحّة العامّة أيضاً (KNGF — van Doormaal 2020).",
        "• The load is the medicine: it goes up 2–10% when the third set is completed, with a slow lowering (Kjeldsen 2022).\n" +
        "• Balance protects against falls — and falls are more common with hip osteoarthritis (Zhang 2023).\n" +
        "• A flare is not damage: two or three lighter days, then back — without stopping movement.\n" +
        "• Weight and daily activity: walking for 30 minutes on five days is a goal for general health too (KNGF — van Doormaal 2020).",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين يتحقّق اثنان من ثلاثة:\n" +
        "• الألمُ نقص نقطتين فأكثر (الفرقُ المهمّ ٢٫١ — Guerrero 2026؛ فوق خطأ القياس بالعربية — Alghadir 2016).\n" +
        "• الجلوسُ والقيامُ ٣٠ ثانية زاد مرّتين فأكثر (Wright 2011) — والأربعُ فوق خطأ القياس (Cibulka 2017).\n" +
        "• الأنشطةُ المختارة بالعربية زادت نقطتين في المتوسّط (Guerrero 2026 · Alnahdi 2022).\n" +
        "(اقتراحٌ مبنيٌّ على الفرق المهمّ، لا معيارٌ مجرَّب.)",
        "Progress to phase 3 when two of three are met:\n" +
        "• Pain down 2 points or more (the important change is 2.1 — Guerrero 2026; beyond the Arabic measurement error — Alghadir 2016).\n" +
        "• The 30-second chair stand up 2 or more (Wright 2011) — and 4 is beyond measurement error (Cibulka 2017).\n" +
        "• The chosen activities in Arabic up 2 points on average (Guerrero 2026 · Alnahdi 2022).\n" +
        "(A proposal built on the important changes, not a tested criterion.)",
      ],
      notes: [
        "• أيّامُ القوّة: ضغطُ الساقين والوركُ بثلاثة اتّجاهات بالكابل أو أثقال الكاحل ٣ × ١٢ ثمّ ١٠ (Bryld 2025)، والجلوسُ والقيامُ بثقلٍ من مقعدٍ أخفض، وصعودُ الدرجة، والطعنةُ بعمقٍ لا يؤلم، والانحناءُ من الورك.\n" +
        "• الأيّامُ الخفيفة: التمرينُ العصبيّ العضليّ — الوقوفُ على ساق، والقدمُ أمام الأخرى، والمشيُ جانباً، والنزولُ الجانبيّ عن الدرجة — ٢–٣ × ١٠–١٥، ويتقدّم المستوى حين يؤدّي ٣ × ١٥ بتحكّمٍ جيّد (Kjeldsen 2022).\n" +
        "• المشيُ أو الدراجة ٢٠–٣٠ دقيقة بجهدٍ متوسّط، والمشيُ الإسكندنافيّ خيار (Bieler 2017).\n" +
        "• العلاجُ اليدويّ يقلّ ويتوقّف، والتمطيطُ يستمرّ في البيت.",
        "• Strength days: leg press and three-way hip work with a cable or ankle weights 3 × 12, then 10 (Bryld 2025), loaded sit-to-stand from a lower seat, step-ups, lunges at a pain-free depth, and the hip hinge.\n" +
        "• Light days: neuromuscular exercise — single-leg standing, tandem stance, side-stepping and the lateral step-down — 2–3 × 10–15, moving up a level when 3 × 15 is done with good control (Kjeldsen 2022).\n" +
        "• Walking or cycling for 20–30 minutes at moderate effort, with Nordic walking as an option (Bieler 2017).\n" +
        "• Manual therapy tapers and stops, and stretching continues at home.",
      ],
      exercises: [
        { code: "stationary-cycling",
          doseNote: ["عشرُ دقائق إحماءً في أيّام القوّة، و٢٠–٣٠ دقيقة بجهدٍ متوسّط في غيرها.", "Ten minutes as a warm-up on strength days, and 20–30 minutes at moderate effort on others."] },
        { code: "leg-press-progressive", sets: 3, reps: 10, rest: 60,
          note: ["١٢ مرّةً ثمّ ١٠ (Bryld 2025)، ويزيد الثقلُ ٢–١٠٪ حين تكتمل المجموعةُ الثالثة (Kjeldsen 2022).", "12 then 10 repetitions (Bryld 2025), with the load rising 2–10% when the third set is completed (Kjeldsen 2022)."] },
        { code: "standing-hip-three-way", sets: 3, reps: 10, rest: 60,
          note: ["التبعيدُ والبسطُ والثني بالكابل أو أثقال الكاحل كما في التجربة (Bryld 2025)، والساقان كلتاهما.", "Abduction, extension and flexion with a cable or ankle weights as in the trial (Bryld 2025), on both legs."] },
        { code: "standing-band-hip-abduction-er", sets: 3, reps: 15, rest: 60 },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["من مقعدٍ أخفض ثمّ بثقلٍ في اليدين.", "From a lower seat, then holding a weight."] },
        { code: "step-up", sets: 3, reps: 10, rest: 60 },
        { code: "split-squat", sets: 3, reps: 10, rest: 60,
          note: ["بعمقٍ لا يتجاوز الأصفر في الإشارة؛ وألمُ الخلف مع القرفصاء علامةُ خشونة (Metcalfe 2019) فيبدأ قصيراً.", "At a depth that stays in the amber zone; posterior pain on squatting is a sign of osteoarthritis (Metcalfe 2019), so it starts shallow."] },
        { code: "hip-hinge-dowel", sets: 3, reps: 10 },
        { code: "single-leg-balance", sets: 1, reps: 3, hold: 30 },
        { code: "tandem-stance", sets: 1, reps: 3, hold: 30 },
        { code: "side-stepping", sets: 2, reps: 10 },
        { code: "lateral-step-down", sets: 2, reps: 10, rest: 60 },
        { code: "hip-internal-rotation-stretch", sets: 1, reps: 3, hold: 45, rest: 15 },
        { code: "graded-walking",
          doseNote: ["٢٠–٣٠ دقيقة بجهدٍ متوسّط (يتكلّم ولا يغنّي)، خمسةَ أيّامٍ في الأسبوع.", "20–30 minutes at moderate effort (able to talk but not sing), five days a week."] },
      ],
    },
    {
      name: ["القوّة الثقيلة والوظيفة والحياة اليومية", "Heavy strength, function and daily life"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["الجلسات ١٧–٢٤ (الأسبوعُ الرابع) — والتمديدُ ٢٥–٣٠", "Sessions 17–24 (week 4) — and the extension 25–30"],
      goals: [
        "أثقالُ ٨–١٠ مرّات، والدرجُ والسيارةُ والجلوسُ على الأرض والصلاةُ بالأوضاع التي يختارها بقاعدة الإشارة، والمشيُ ٣٠ دقيقة خمسةَ أيّام، وبرنامجٌ منزليّ أخير وخطّةٌ للنوبة.",
        "8–10-repetition loads, stairs, the car, floor sitting and prayer in the positions the patient chooses within the traffic light, walking for 30 minutes on five days, and a final home programme with a flare plan.",
      ],
      education: [
        "• الإدارةُ الذاتية: إن عاد الألم، يومان أو ثلاثةٌ أخفّ ثمّ يعود — ولا يترك التقوية.\n" +
        "• البرنامجُ المنزليّ: التقويةُ مرّتين إلى ثلاثٍ في الأسبوع في البيت أو النادي، والمشيُ أو الدراجة، والتمطيط — الأثرُ يبلغ ذروتَه نحو شهرين ثمّ يقلّ إن توقّف (Goh 2019).\n" +
        "• متى يعود: مفصلٌ حارّ، أو ألمٌ ليليّ دائم، أو عجزٌ مفاجئ عن المشي، أو أعراضٌ تؤثّر كثيراً في حياته رغم البرنامج — فرأيُ الجرّاح بلا تأخير (Hannon 2023).",
        "• Self-management: if the pain returns, two or three lighter days, then back — without dropping strengthening.\n" +
        "• The home programme: strengthening two to three times a week at home or in a gym, walking or cycling, and stretching — the effect peaks at about two months and fades if it stops (Goh 2019).\n" +
        "• When to come back: a hot joint, constant night pain, sudden inability to walk, or symptoms substantially affecting life despite the programme — then a surgeon's opinion without delay (Hannon 2023).",
      ],
      criteria: [
        "معاييرُ الخروج (اثنان فأكثر، مع البرنامج المنزليّ):\n" +
        "• الألمُ نقص نقطتين فأكثر عن البداية (Guerrero 2026).\n" +
        "• الجلوسُ والقيامُ ٣٠ ثانية ١١–١٢ مرّة فأكثر — الحالةُ المقبولة (Emerson Kavchak 2013) — أو زاد ٢٫٦ (Wright 2011).\n" +
        "• النهوضُ والمشي ٦٫٠٥ ثانية أو أقلّ أو نقص ١٫٢ ثانية (Wright 2011 · Emerson Kavchak 2013).\n" +
        "• كلُّ نشاطٍ مختار زاد نقطتين، أو مقياسُ الطرف السفليّ بالعربية زاد ٨ — فوق خطأ قياسه (Alnahdi 2021).\n" +
        "• البرنامجُ المنزليّ يؤدّيه وحده، وخطّةُ النوبة واضحة.\n" +
        EXTEND_AR,
        "Discharge criteria (two or more, plus the home programme):\n" +
        "• Pain down 2 points or more from baseline (Guerrero 2026).\n" +
        "• The 30-second chair stand at 11–12 or more — the acceptable state (Emerson Kavchak 2013) — or up 2.6 (Wright 2011).\n" +
        "• Timed up-and-go of 6.05 seconds or less, or 1.2 seconds faster (Wright 2011 · Emerson Kavchak 2013).\n" +
        "• Each chosen activity up 2 points, or the Arabic Lower Extremity Functional Scale up 8 — beyond its measurement error (Alnahdi 2021).\n" +
        "• The home programme done independently, with a clear flare plan.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• أيّامُ القوّة: ٣ × ٨–١٠ لضغط الساقين والورك بثلاثة اتّجاهات (Bryld 2025)، ورفعُ الثقل من الأرض بالورك إن سمح الظهر، والطعنةُ أعمق.\n" +
        "• الوظيفة: الدرجُ بخطوةٍ تلو الأخرى، والسيارة — ألمُ الدخول إليها يرجّح الخشونة (Rainville 2019) — ولبسُ الجوارب، والصلاةُ والجلوسُ على الأرض والقيامُ منها بالبطاقة.\n" +
        "• التوازنُ في الحركة: الوصولُ بالقدم في الاتّجاهات، والمشيُ بين العوائق ومع مهمّةٍ ثانية.\n" +
        "• المشيُ ٣٠ دقيقة خمسةَ أيّام، والمشيُ الإسكندنافيّ خيار (Bieler 2017).\n" +
        "• البرنامجُ المنزليّ الأخير مكتوباً: ٣–٥ تمارين تقوية بمجموعتين إلى ثلاث، مرّتين إلى ثلاثٍ في الأسبوع حتى الأسبوع الثاني عشر.",
        "• Strength days: 3 × 8–10 for the leg press and three-way hip work (Bryld 2025), the hip-hinge lift from the floor if the back allows, and deeper lunges.\n" +
        "• Function: stairs step over step, the car — pain getting in favours osteoarthritis (Rainville 2019) — putting on socks, and prayer, floor sitting and rising from the floor with the card.\n" +
        "• Balance on the move: reaching with the foot in each direction, and walking between obstacles and with a second task.\n" +
        "• Walking for 30 minutes on five days, with Nordic walking as an option (Bieler 2017).\n" +
        "• The final home programme in writing: 3–5 strengthening exercises of two to three sets, two to three times a week to week 12.",
      ],
      exercises: [
        { code: "leg-press-progressive", sets: 3, reps: 8, rest: 60,
          note: ["٨–١٠ مرّات (Bryld 2025)، والساقان كلتاهما ثمّ كلٌّ وحدها.", "8–10 repetitions (Bryld 2025), both legs then each one alone."] },
        { code: "standing-hip-three-way", sets: 3, reps: 8, rest: 60,
          note: ["٨–١٠ مرّات بثقلٍ أعلى (Bryld 2025).", "8–10 repetitions with a heavier load (Bryld 2025)."] },
        { code: "kettlebell-deadlift", sets: 3, reps: 8, rest: 60,
          note: ["إن سمح الظهرُ والورك؛ وإلّا الانحناءُ من الورك بالعصا.", "If the back and hip allow; otherwise the hip hinge with the dowel."] },
        { code: "split-squat", sets: 3, reps: 10, rest: 60 },
        { code: "step-up", sets: 3, reps: 10, rest: 60,
          note: ["درجةٌ أعلى، ثمّ الدرجُ بخطوةٍ تلو الأخرى.", "A higher step, then stairs step over step."] },
        { code: "sit-to-stand", sets: 3, reps: 10, rest: 60,
          note: ["من أخفض مقعد بثقل — والعددُ في ٣٠ ثانية مقياسُ الخروج.", "From the lowest seat with a weight — the 30-second count is the discharge measure."] },
        { code: "star-excursion-reach", sets: 1, reps: 3,
          note: ["الوصولُ بالقدم في الاتّجاهات والركبةُ الواقفة فوق القدم والحوضُ مستوٍ.", "Reaching with the foot in each direction with the standing knee over the foot and the pelvis level."] },
        { code: "obstacle-dual-task-walking",
          note: ["للسوق والشارع، وخاصّةً لمن سقط.", "For the market and the street, especially for those who have fallen."] },
        { code: "prayer-floor-sitting-hip-oa",
          note: ["بالأنشطة التي اختارها المريض: السجودُ والجلوسُ للتشهّد والقيامُ من الأرض والمرحاضُ العربيّ.", "With the activities the patient chose: prostration, sitting for tashahhud, rising from the floor and the squat toilet."] },
        { code: "car-transfer",
          note: ["بلا قيود الجراحة: الدخولُ جالساً ثمّ إدخالُ الساقين معاً — وألمُه يرجّح الخشونة (Rainville 2019).", "Without surgical restrictions: sitting first, then bringing both legs in together — pain on doing it favours osteoarthritis (Rainville 2019)."] },
        { code: "graded-walking",
          doseNote: ["٣٠ دقيقة خمسةَ أيّامٍ فأكثر (KNGF — van Doormaal 2020)، وأرضٌ غيرُ مستوية ومنحدرات.", "30 minutes on five days or more (KNGF — van Doormaal 2020), with uneven ground and slopes."] },
        { code: "stationary-cycling",
          doseNote: ["عشرُ دقائق إحماءً، أو ٢٠–٣٠ دقيقة بديلاً عن المشي في الحرّ.", "Ten minutes as a warm-up, or 20–30 minutes instead of walking in the heat."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — ما ينتظر قرارَه في هذا البروتوكول؛ والنصُّ العربيّ بلا أسماء دراسات (درسُ §4.dz). */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العددُ ٢٤ بستٍّ في الأسبوع (أربعةُ أسابيع) والقوّةُ الثقيلة يوماً بعد يوم، وتمديدٌ واحد بستّ لمن بلغ فرقاً مهمّاً ولم يبلغ الخروج، والبرنامجُ المنزليّ حتى الأسبوع الثاني عشر بمراجعتين في السادس والثاني عشر — والتجاربُ مرّتين في الأسبوع اثني عشرَ أسبوعاً غالباً (٢٤ جلسة)، ولا تجربةَ لخمسٍ أو ستّ: أبقِه، أو اجعله مرّتين إلى ثلاثٍ في الأسبوع ثمانيةَ أسابيع إلى اثني عشر — خاصّةً لكبيرٍ لا يستطيع الحضورَ يومياً.",
    en: "24 sessions at six a week (four weeks) with heavy strength every other day, one extension of six for those who reached an important change without meeting discharge, and the home programme to week 12 with reviews at weeks 6 and 12 — trials mostly used twice a week for twelve weeks (24 sessions — Bryld 2025 · Kjeldsen 2022), and no trial tested five or six a week: keep it, or make it two to three a week for eight to twelve weeks — especially for an older person who cannot attend daily." },
  { key: "limits", topic: "limits",
    ar: "الحدود: الإشارةُ الضوئية (٠–٢ آمن، ٣–٥ مقبول، فوق ٥ كثير، والعودةُ إلى المعتاد صباحاً) وقاعدةُ الساعتين للورك شديد التهيّج، والانتقالُ بضبط أثقال ١٢ مرّةً ثمّ اثنين من: الألمُ نقطتين، والجلوسُ والقيامُ ٣٠ ثانية +٢، والأنشطةُ المختارة +٢؛ والخروجُ بالجلوس والقيام ١١–١٢ والنهوضِ والمشي ٦ ثوانٍ والأنشطةِ +٢ — اقتراحٌ مبنيٌّ على الفرق المهمّ وما استعملته التجارب: أبقِها أو عدّلها.",
    en: "The limits: the traffic light (0–2 safe, 3–5 acceptable, above 5 too much, back to usual by the morning — Ageberg 2010 · Bryld 2025) with the two-hour rule for a very irritable hip (KNGF — van Doormaal 2020), progression once 12-repetition loads are set and then two of: pain down 2, the 30-second chair stand up 2, the chosen activities up 2; and discharge at a chair stand of 11–12, a timed up-and-go of about 6 seconds and the activities up 2 — proposals built on the important changes and trial practice (Guerrero 2026 · Wright 2011 · Emerson Kavchak 2013): keep or adjust." },
  { key: "referral", topic: "content",
    ar: "قواعدُ الإحالة: في اليوم نفسِه للمفصل الحارّ أو الحمّى أو العجز عن حمل الوزن بعد سقوط؛ وخلال أيّام للتدهور السريع، ولخطر نخر رأس الفخذ (فقرُ الدم المنجليّ والكورتيزون وعلاجُ كورونا)، والألمِ الليليّ ونقصِ الوزن، والتيبّسِ الطويل؛ والحقنةُ الموجَّهة «لدعم التمرين» حين يمنعه الألم؛ ورأيُ الجرّاح بالتقييم السريريّ لا بالمقاييس ولا يُستبعد للعمر أو الوزن، والجلستان ٦ و١٦ والأسبوعُ الثاني عشر: أبقِها أو عدّلها مع طبيب المركز.",
    en: "The referral rules: same day for a hot joint, fever or inability to bear weight after a fall; within days for rapid worsening, a risk of femoral-head necrosis (sickle cell disease, steroids, COVID-19 treatment — Al-Allawi 2012 · Mont 2015), night pain and weight loss, and long morning stiffness; an ultrasound-guided injection 'to support exercise' when pain blocks it (NICE NG226); and a surgeon's opinion by clinical assessment, not scores, never excluded for age or weight (NICE NG226 · Hannon 2023), with checkpoints at sessions 6 and 16 and week 12: keep or adjust with the centre's doctor." },
  { key: "manual-traction", topic: "devices",
    ar: "العلاجُ اليدويّ: الشدُّ الطوليّ للورك باليد قصيراً داخلَ التمرين لمن نقص مداه (أعلى درجة في إرشاد العلاج الطبيعيّ الأمريكيّ، والكلّيةُ الأمريكية مشروطٌ ضدّ إضافته، والهولنديّ ضدّ التحريك السلبيّ)، والدفعةُ السريعة لمن تدرّب عليها وحده؛ والشدُّ بالجهاز مساعدٌ بقاعدتك فقط إن كان جهازُ المركز يشدّ الوركَ بحزامٍ حول الفخذ: أبقِهما أو اجعل الجهازَ «لا يُستخدم»، ومَن في المركز مدرَّبٌ على الدفعة؟",
    en: "Manual therapy: brief manual long-axis hip distraction within exercise for limited range (grade A in the JOSPT guideline — Koc 2025; the American College conditionally against adding it — Kolasinski 2020; the Dutch guideline against passive mobilisation), with the quick thrust only for trained staff; and mechanical traction as an adjunct by your rule only if the centre's device can pull the hip through a thigh cuff (Josipović 2024): keep both or set the device to 'Not used' — and who in the centre is trained in the thrust?" },
  { key: "device-adjuncts", topic: "devices",
    ar: "التحفيزُ عبر الجلد والتيكارُ والمغناطيسُ والحرارةُ والأشعّة تحت الحمراء مساعدةٌ بقاعدتك — والتحفيزُ ضدّه بقوّة عند الكلّية الأمريكية ولا يُقدَّم عند المعهد البريطانيّ (قبل التمرين وحده لمن يمنعه الألم)، والتيكارُ بلا تجربة، والمغناطيسُ دراسةٌ بلا مجموعةٍ وهمية، والحرارةُ للراحة: أبقِها بشروطها أو اجعل بعضَها «لا يُستخدم»، واكتب شدّةَ المغناطيس من جهاز المركز.",
    en: "TENS, Tecar, magnetic therapy, heat and infrared are adjuncts by your rule — TENS is strongly against for the American College and 'do not offer' for NICE (before exercise only, when pain blocks it — Kolasinski 2020 · NICE NG226), Tecar has no trial, magnetic therapy one study without a sham group (Koczy 2019), and heat is for comfort: keep them with their conditions or set some to 'Not used', and enter the magnetic intensity from the centre's device." },
  { key: "device-needle", topic: "devices",
    ar: "الإبرُ الجافّة مساعدٌ بموعدٍ دوريّ (مرّةً في الأسبوع ثلاثَ مرّات، بإبرة ٠٫٢٥ × ٥٠، على النقاط الزنادية النشطة حول الورك) — أعلى درجة في إرشاد العلاج الطبيعيّ الأمريكيّ و«لا تُقدَّم» عند المعهد البريطانيّ، ودليلُها من مجموعةٍ واحدة: أبقِها أو اجعلها «لا يُستخدم»؛ والأمواجُ فوق الصوتية والليزرُ والموجاتُ الصادمة «لا يُستخدم» (وإعداداتُ تجاربها مكتوبةٌ للمرجع): أبقِها كذلك أو غيّرها.",
    en: "Dry needling is an adjunct on a periodic schedule (once a week three times, 0.25 × 50 mm, active trigger points around the hip) — grade A in the JOSPT guideline (Koc 2025) and 'do not offer' for NICE (NICE NG226), with its evidence from one group (Ceballos-Laita 2021): keep it or set it to 'Not used'; ultrasound, laser and shockwave are 'Not used' (their trial settings are recorded for reference — Köybaşı 2010 · Şah 2022): keep them so or change them." },
  { key: "aids-prayer", topic: "content",
    ar: "العصا في اليد المقابلة حين يكون ألمُ المشي ٤ من ١٠ فأكثر أو يظهر العرج، والحذاءُ المريح الذي يختاره المريض بلا نعلٍ مائل ولا دعّامة، وبطاقةُ الصلاة والجلوس على الأرض (الكرسيُّ للخطوة المؤلمة وحدها ومؤقّتاً): أبقِ ذلك أو عدّله — ومَن يوفّر العصا ويضبط طولَها في المركز؟",
    en: "A cane in the opposite hand when walking pain is 4/10 or more or a limp appears (Kolasinski 2020 · Tazawa 2022), comfortable shoes of the patient's choice with no wedged insoles and no brace (Paterson 2026 · Koc 2025), and the prayer and floor-sitting card (the chair for the painful step only, and only for now): keep or adjust — and who supplies the cane and sets its height in the centre?" },
  { key: "measures-add", topic: "measures",
    ar: "المقياسُ المزروع «نتائجُ الورك (HOOS)» بلا نسخةٍ عربية مُتحقَّقة: أبقِه أو احذفه؛ وأضف من «المقاييس» ← مقياسٌ خاص: ألمَ المشي في الأسبوع من ١٠ (الأقلّ أفضل)، والأنشطةَ التي يختارها المريض بالعربية من ١٠ (الأكثر أفضل)، ومقياسَ الطرف السفليّ بالعربية من ٨٠ (الأكثر أفضل)، والمشيَ السريع ٤٠ متراً بالثواني (الأقلّ أفضل)، وثنيَ الورك بالدرجات (الأكثر أفضل)، وقوّةَ مبعِّدات الورك إن توفّر مقياسُ القوّة (الأكثر أفضل).",
    en: "The seeded Hip disability and Osteoarthritis Outcome Score (HOOS) has no validated Arabic version (a documented zero result): keep or remove it; and add under 'Measures' → custom measure: walking pain over the past week out of 10 (lower is better — Alghadir 2016), the Arabic Patient-Specific Functional Scale out of 10 (higher is better — Alnahdi 2022), the Arabic Lower Extremity Functional Scale out of 80 (higher is better — Alnahdi 2021), the 40-metre fast-paced walk in seconds (lower is better — Dobson 2013), hip flexion in degrees (higher is better — Cibulka 2017), and hip abductor strength if a dynamometer is available (higher is better — Vaz 2023)." },
];

export const name = "156_physio_hip_oa_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
