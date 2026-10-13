// Migration 138: ما بعد استبدال مفصل الركبة الكلّيّ — البروتوكولُ الحادي عشر مفصَّلاً (§4.dx — ٢٠٢٦-١٠-١٣).
//
// المالك (٢٠٢٦-١٠-١٣): «هل نكمل البروتوكولات؟» — والتالي بالترتيب المتّفق عليه بعد بروتوكولات الأطراف (§4.dv): ما بعد الاستبدال الكلّيّ للركبة (`tka-geriatric`).
// **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أربعة أسابيع) وتمديدٌ واحد بستٍّ بمعيارٍ مكتوب، وثلاثُ مراحل بنطاقات
// (١–٦ · ٧–١٦ · ١٧–٢٤) ومعايير رقمية مبنيّة على Bade 2011: الحمايةُ والتنشيطُ واستعادةُ الحركة، ثمّ التقويةُ المتدرّجة والمدى والتوازن، ثمّ الوظيفةُ والتحمّلُ
// والركوعُ والعودة؛ واثنتا عشرةَ بطاقةً جديدة (اثنتا عشرةَ صورةً مطلوبة) وعشرون معادة بصورها من ١١٩ و١٢٦ و١٢٩؛ والأجهزةُ الاثنا عشر بدرجة دليلها
// و«استعمال المركز»، والمقاييسُ كما زُرعت (العطفُ ونقصُ البسط وTUG والجلوسُ والوقوف وKOOS-JR) ومقياسُ أكسفورد بالعربية إضافةً للمشرف. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الاستبدال**: الدليلُ أوضحُ من غيره — APTA 2020 (توصيةٌ قوية لتدريب المشي والتوازن والتناظر، ومتوسّطةٌ للتحفيز NMES والتقوية عالية الشدّة المبكّرة
// والبرودة، و«لا» للتحريك المستمرّ CPM) وNICE NG157 وAAOS 2015؛ **لكنّ الإشراف وحده لا يفوق برنامجاً منزلياً منظّماً** (Artz 2015 · Konnyu 2023)، ولا للمعرَّضين
// (Hamilton 2020 · Barker 2021)، **ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع** — فالعددُ ٢٤ اختيارُ خدمةٍ مكتوبٌ صريحاً عند أعلى حجمٍ جُرّب (Bade 2017: ٢٦، Husby 2018: ٢٤).
// **والتحفيزُ «أساسيّ» هنا خلافاً لقاعدة المركز** (مساعد — §4.cx) لأنّ الدليل يوصي به ولثلاثة أسابيع متّصلة، والتناوبُ لا يعطي جرعتَه — ولسليم أن يعيده مساعداً.
// **والتيكارُ «لا يُستخدم»** حول المفصل المعدنيّ (لا تجربة، واللوحُ المرتدّ — García-Marín 2021)، والمغناطيسُ مساعدٌ بقاعدة سليم والدليلُ ضعيفٌ جدّاً مكتوبٌ صريحاً.
// **وما يخصّ العراق**: لا دراسةَ تأهيلٍ عراقية ولا عن الصلاة بعد الاستبدال (بحثٌ صفريّ مكتوب)، والقرفصاءُ تحتاج ١١١–١٦٥° فوق المعتاد بعده، والركوعُ يُدرَّب.
//
// المصادرُ اثنان وستّون، كلُّ معرّفٍ منها طوبق آلياً مع سجلّ Europe PMC (والإرشاداتُ الأربع بلا معرّف من صفحات جهاتها). القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — اثنتا عشرة؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٢٩) تُربط برموزها وصورها، وما يخصّ الاستبدالَ في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "ankle-pumps", nameAr: "ضخّ الكاحل (تحريك القدم للأعلى والأسفل)", nameEn: "Ankle pumps",
    kind: "mobility", region: "ankle_foot", perSide: true, sets: 1, reps: 20,
    purpose: ["يحرّك الدمَ في الساق بانقباض عضلة الساق، فيخفّف تورّمَ القدم والكاحل بعد الجراحة ويحفظ مدى الكاحل — وهو جزءٌ من الحركة المبكّرة لا بديلٌ عن مميّع الدم الذي يصفه الجرّاح.",
      "Moves blood through the leg by contracting the calf, easing foot and ankle swelling after surgery and keeping ankle range — part of early mobility, not a substitute for the blood thinner the surgeon prescribes."],
    start: ["مستلقٍ أو جالسٌ والساقان ممدودتان، والساقُ المعمولةُ مرفوعةٌ على وسادةٍ تحت الكعب لا تحت الركبة.",
      "Lying or sitting with both legs straight, the operated leg raised on a pillow under the heel, not under the knee."],
    steps: [[
      "اسحب مقدّمةَ القدم نحوك إلى آخر ما تستطيع، فتشعر بشدٍّ في عضلة الساق.",
      "ادفعها بعيداً عنك إلى آخر ما تستطيع.",
      "كرّر بإيقاعٍ منتظم نحو ٢٠ مرّة.",
      "ثمّ حرّك القدمَ في دوائر ٥ مرّات لكلّ اتّجاه.",
    ], [
      "Pull the front of the foot towards you as far as it goes, feeling a stretch in the calf.",
      "Push it away from you as far as it goes.",
      "Repeat at a steady rhythm about 20 times.",
      "Then circle the foot 5 times each way.",
    ]],
    cues: [[
      "حركةٌ صغيرة سريعة ⟵ مدىً كامل في الاتّجاهين وبإيقاعٍ هادئ.",
      "وسادةٌ تحت الركبة لراحتها ⟵ تحت الكعب، فالركبةُ تبقى مستقيمة.",
      "تُترك حين يقلّ التورّم ⟵ تستمرّ ما دام المريضُ يجلس أو يستلقي كثيراً.",
    ], [
      "Small, fast movements → full range both ways at a calm rhythm.",
      "A pillow under the knee for comfort → under the heel, so the knee stays straight.",
      "Stopping once the swelling eases → continue while the patient still sits or lies a lot.",
    ]],
    easier: ["القدمان معاً بمدىً أصغر.", "Both feet together with a smaller range."],
    harder: ["مع رفع الساق على وسادتين ولمدّةٍ أطول.", "With the leg raised on two pillows and for longer."],
    stopIf: ["ألمٌ أو تورّمٌ أو احمرارٌ أو سخونةٌ في بطن الساق — علامةُ جلطةٍ محتملة: يُوقف التمرين ويُحال إلى الطبيب فوراً.",
      "Pain, swelling, redness or warmth in the calf — a possible clot: stop and refer to the doctor at once."],
    equipment: ["سريرٌ أو كرسيّ، ووسادة.", "A bed or chair, and a pillow."],
    doseNote: ["كلَّ ساعةٍ في النهار — ٢٠ مرّة — في الأسابيع الأولى.", "Every waking hour — 20 times — in the first weeks."],
    images: [{ key: "ankle-pumps-1", ar: "مستلقٍ والساقُ مرفوعةٌ والقدمُ مسحوبةٌ نحو الجسم", en: "Lying with the leg raised and the foot pulled towards the body", search: "ankle pumps exercise after knee replacement" }],
  },
  {
    code: "patellar-self-mobilisation", nameAr: "تحريك الرضفة باليد (صابونة الركبة)", nameEn: "Patellar self-mobilisation",
    kind: "mobility", region: "knee", perSide: true, sets: 1, reps: 10,
    purpose: ["الرضفةُ تنزلق إلى الأسفل حين تنثني الركبة وإلى الأعلى حين تستقيم — فإن التصقت بعد الجراحة ضاق المدى في الاتّجاهين؛ وتحريكُها من العلاج اليدويّ في تجربة Bade 2017، والمريضُ يكمله في البيت.",
      "The kneecap glides down as the knee bends and up as it straightens — if it sticks after surgery, range is lost both ways; mobilising it was part of the manual therapy in the Bade 2017 trial, and the patient continues it at home."],
    start: ["جالسٌ والساقُ ممدودةٌ ومرتخية على السرير، وعضلةُ الفخذ مرتخيةٌ تماماً.", "Sitting with the leg straight and relaxed on the bed, the thigh muscle completely relaxed."],
    steps: [[
      "ضع الإبهامين على حافّة الرضفة العليا وادفعها برفقٍ نحو القدم، واثبت ٥ ثوانٍ.",
      "ضعهما على حافّتها السفلى وادفعها نحو الفخذ، واثبت ٥ ثوانٍ.",
      "ادفعها نحو الداخل ثمّ نحو الخارج بالطريقة نفسِها.",
      "كرّر كلَّ اتّجاهٍ ١٠ مرّات.",
    ], [
      "Place both thumbs on the upper edge of the kneecap and push it gently towards the foot; hold 5 seconds.",
      "Place them on its lower edge and push it towards the thigh; hold 5 seconds.",
      "Push it inwards, then outwards, the same way.",
      "Repeat each direction 10 times.",
    ]],
    cues: [[
      "شدُّ الفخذ أثناء التحريك ⟵ الفخذُ مرتخٍ تماماً وإلّا لا تتحرّك الرضفة.",
      "الضغطُ على الجرح أو الغرز ⟵ الأصابعُ على العظم بعيداً عن الجرح.",
      "قوّةٌ مؤلمة ⟵ دفعٌ ثابتٌ خفيف، والحركةُ تزيد مع الأيّام.",
    ], [
      "Tightening the thigh while moving it → the thigh fully relaxed, or the kneecap will not move.",
      "Pressing on the wound or stitches → fingers on the bone, away from the incision.",
      "Painful force → a steady, light push; movement grows over the days.",
    ]],
    easier: ["المعالجُ يحرّكها أوّلاً ثمّ يعلّم المريض.", "The therapist moves it first, then teaches the patient."],
    harder: ["ثباتٌ أطول (١٥ ثانية) في الاتّجاه الأضيق.", "A longer hold (15 seconds) in the stiffest direction."],
    stopIf: ["إفرازٌ أو نزفٌ من الجرح، أو ألمٌ حادّ.", "Discharge or bleeding from the wound, or sharp pain."],
    equipment: ["لا شيء.", "None."],
    doseNote: ["مرّتان يومياً حين يأذن الجرّاح ويجفّ الجرح.", "Twice daily once the surgeon allows it and the wound is dry."],
    images: [{ key: "patellar-self-mobilisation-1", ar: "الإبهامان على الرضفة يدفعانها نحو القدم والساقُ ممدودة", en: "Both thumbs on the kneecap pushing it towards the foot with the leg straight", search: "patellar mobilization self exercise knee" }],
  },
  {
    code: "cold-elevation", nameAr: "الكمادة الباردة ورفع الساق للتورّم", nameEn: "Cold pack and leg elevation for swelling",
    kind: "functional", region: "knee", perSide: true,
    purpose: ["التورّمُ بعد الجراحة يُضعف عضلةَ الفخذ (Holm 2010) ويُضيّق المدى ويزيد الألم؛ والبرودةُ تخفّف الألمَ قليلاً في الأيّام الأولى (Cochrane — Aggarwal 2025)، وتعليمُها للمريض توصيةٌ في APTA 2020 — بكمادةٍ أو ثلجٍ في البيت لا بأجهزةٍ غالية.",
      "Swelling after surgery weakens the thigh muscle (Holm 2010), narrows range and adds pain; cold eases pain slightly in the first days (Cochrane — Aggarwal 2025), and teaching it is recommended by APTA 2020 — with a cold pack or ice at home, not expensive devices."],
    start: ["مستلقٍ والساقُ ممدودةٌ مرفوعةٌ على وسادتين تحت الساق والكعب بحيث تكون القدمُ أعلى من مستوى القلب، والركبةُ مستقيمة.",
      "Lying with the leg straight and raised on two pillows under the shin and heel so the foot is above heart level, with the knee straight."],
    steps: [[
      "لفّ الكمادةَ الباردة أو كيسَ الثلج بمنشفةٍ رقيقة مبلّلة.",
      "ضعها حول الركبة لا فوق الجرح مباشرةً.",
      "اتركها ١٠–١٥ دقيقة، وافحص الجلدَ كلَّ ٥ دقائق.",
      "حرّك الكاحلَ (ضخّ الكاحل) أثناءها.",
      "أعِدها بعد كلّ جلسة تمارين وحتى ٣–٤ مرّاتٍ في اليوم.",
    ], [
      "Wrap the cold pack or ice bag in a thin damp towel.",
      "Place it around the knee, not directly over the wound.",
      "Leave it for 10–15 minutes, checking the skin every 5 minutes.",
      "Pump the ankle while it is on.",
      "Repeat after every exercise session and up to 3–4 times a day.",
    ]],
    cues: [[
      "ثلجٌ على الجلد مباشرةً ⟵ منشفةٌ بينهما دائماً، فالبردُ يحرق.",
      "وسادةٌ تحت الركبة ⟵ تحت الساق والكعب، فالركبةُ المثنيّة تتيبّس في الانثناء.",
      "أكثرُ من ١٥ دقيقة أو على الجانب الخارجيّ تحت الركبة ⟵ ١٠–١٥ دقيقة، وبعيداً عن رأس عظم الشظيّة حيث يمرّ العصب (Houghton 2010).",
    ], [
      "Ice straight on the skin → always a towel between, as cold burns.",
      "A pillow under the knee → under the shin and heel, as a bent knee stiffens in flexion.",
      "More than 15 minutes, or over the outer side just below the knee → 10–15 minutes, away from the head of the fibula where the nerve runs (Houghton 2010).",
    ]],
    easier: ["الرفعُ وحده إن لم تتوفّر كمادة.", "Elevation alone if no cold pack is available."],
    harder: ["لا يُصعَّب — يُنقص تدريجياً حين يخفّ التورّم.", "Not progressed — tapered as swelling settles."],
    stopIf: ["خدرٌ أو بياضٌ أو ألمٌ حارق في الجلد، أو سخونةٌ واحمرارٌ يزدادان حول الجرح — ومع ضعف الإحساس (السكّريّ) يُفحص الإحساسُ قبل أوّل مرّة.", "Numbness, white skin or burning pain, or warmth and redness increasing around the wound — with reduced sensation (diabetes), test sensation before the first use."],
    equipment: ["كمادةٌ باردة أو كيسُ ثلج أو كيسُ خضارٍ مجمّدة، ومنشفة، ووسادتان.", "A cold pack, ice bag or bag of frozen vegetables, a towel and two pillows."],
    doseNote: ["١٠–١٥ دقيقة بعد التمارين، وحتى ٣–٤ مرّاتٍ يومياً في الأسابيع الأولى.", "10–15 minutes after exercise, up to 3–4 times daily in the first weeks."],
    images: [{ key: "cold-elevation-1", ar: "الساقُ ممدودةٌ مرفوعةٌ على وسادتين والكمادةُ الباردة ملفوفةٌ حول الركبة", en: "The leg straight and raised on two pillows with a wrapped cold pack around the knee", search: "ice pack knee elevation after knee replacement" }],
  },
  {
    code: "seated-knee-flexion-slide", nameAr: "ثني الركبة جالساً بسحب القدم تحت الكرسيّ", nameEn: "Seated knee flexion slide",
    kind: "mobility", region: "knee", perSide: true, sets: 1, reps: 10, hold: 10,
    purpose: ["يستعيد ثنيَ الركبة بوزن الساق وبمساعدة القدم الأخرى — فالدرجُ والكراسيّ تحتاج ٩٠–١٢٠°، و١١٠° هدفٌ مناسب للتأهيل (Rowe 2000).",
      "Restores knee bending using the leg's weight and help from the other foot — stairs and chairs need 90–120°, and 110° is a suitable rehabilitation goal (Rowe 2000)."],
    start: ["جالسٌ على كرسيٍّ ثابتٍ بلا عجلات، والقدمُ على الأرض على منشفةٍ أو كيسٍ بلاستيكيّ ليسهل الانزلاق.",
      "Sitting on a firm chair without wheels, the foot on the floor on a towel or plastic bag so it slides easily."],
    steps: [[
      "اسحب القدمَ إلى الخلف تحت الكرسيّ حتى تشعر بشدٍّ في الركبة.",
      "ضع القدمَ السليمة أمام كاحل الساق المعمولة وادفعها إلى الخلف قليلاً.",
      "تقدّم بجسمك على الكرسيّ إلى الأمام والقدمُ ثابتة، فيزيد الثني.",
      "اثبت ١٠ ثوانٍ ثمّ أرخِ.",
      "كرّر ١٠ مرّات.",
    ], [
      "Slide the foot back under the chair until you feel a stretch in the knee.",
      "Put the good foot in front of the operated leg's ankle and push it a little further back.",
      "Slide your body forward on the seat with the foot fixed, so the bend increases.",
      "Hold for 10 seconds, then relax.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "رفعُ الكعب لتجنّب الشدّ ⟵ القدمُ مسطّحةٌ على الأرض بقدر المستطاع.",
      "دفعٌ سريعٌ مؤلم ⟵ شدٌّ ثابتٌ محتمَل (حتى ٥ من ١٠) يُثبَّت ويتنفّس معه.",
      "يُترك حين يبلغ ٩٠° ⟵ يستمرّ حتى ١١٠° أو أكثر.",
    ], [
      "Lifting the heel to avoid the stretch → keep the foot as flat as possible.",
      "A fast, painful push → a steady, tolerable stretch (up to 5/10), held while breathing.",
      "Stopping at 90° → continue to 110° or more.",
    ]],
    easier: ["بلا مساعدة القدم الأخرى، وثباتٌ أقصر.", "Without help from the other foot, and a shorter hold."],
    harder: ["ثباتٌ ٣٠ ثانية، ثمّ ثني الركبة على الدرجة.", "A 30-second hold, then the knee-bend on a step."],
    stopIf: ["ألمٌ حادّ أو إفرازٌ من الجرح أو تورّمٌ يزداد بعده.", "Sharp pain, discharge from the wound, or swelling increasing afterwards."],
    equipment: ["كرسيٌّ ثابت، ومنشفةٌ أو كيسٌ بلاستيكيّ.", "A firm chair and a towel or plastic bag."],
    doseNote: ["٣ مرّاتٍ يومياً، وقبل الجلسة وبعدها.", "Three times daily, and before and after the session."],
    images: [{ key: "seated-knee-flexion-slide-1", ar: "جالسٌ على كرسيٍّ والقدمُ مسحوبةٌ تحته والقدمُ الأخرى تدفعها", en: "Seated with the foot slid back under the chair and the other foot pushing it", search: "seated knee flexion slide chair exercise" }],
  },
  {
    code: "walking-aid-gait", nameAr: "المشي بالمشّاية ثمّ العكّازين ثمّ العصا بعد جراحة الركبة", nameEn: "Walking with a frame, crutches, then a cane after knee surgery",
    kind: "functional", region: "whole_body",
    purpose: ["يعيد مشياً متناظراً بخطوتين متساويتين، وضربةَ كعبٍ وركبةٍ مستقيمة عند الوقوف عليها — وتدريبُ المشي والتوازن وتناظرِ الحركة أقوى توصيةٍ في APTA 2020؛ ويُنزل الأداةَ خطوةً بعد خطوة حين يمشي بلا عرج، لا بالتاريخ وحده.",
      "Restores a symmetrical gait with equal steps, a heel strike and a straight knee when standing on it — training walking, balance and movement symmetry is the strongest recommendation in APTA 2020; the aid is stepped down when the patient walks without a limp, not by date alone."],
    start: ["واقفٌ داخلَ المشّاية بطولٍ يجعل المرفقين مثنيّين قليلاً (نحو ٢٠°) والمقبضُ عند ثنية الرسغ، والحملُ على الساق المعمولة كما يأذن الجرّاح (غالباً بقدر ما يحتمل).",
      "Standing inside the frame, set so the elbows bend slightly (about 20°) with the handle at the wrist crease, weight on the operated leg as the surgeon allows (usually as tolerated)."],
    steps: [[
      "قدّم المشّايةَ مسافةَ خطوة.",
      "قدّم الساقَ المعمولة ضارباً الأرضَ بالكعب أوّلاً.",
      "اتّكئ على المشّاية وقدّم الساقَ السليمة متجاوزاً المعمولة (لا بمحاذاتها حين يستطيع).",
      "استقم على الساق المعمولة والركبةُ مستقيمة، ولا تُسرع عنها.",
      "حين يمشي بلا عرجٍ ولا ألمٍ يزيد: عكّازان ثمّ عصا في اليد المقابلة للساق المعمولة.",
    ], [
      "Move the frame forward one step's length.",
      "Step forward with the operated leg, landing heel first.",
      "Lean on the frame and step the good leg past the operated one (not just level with it once able).",
      "Stand tall on the operated leg with the knee straight, without hurrying off it.",
      "Once walking without a limp or rising pain: two crutches, then a cane in the hand opposite the operated leg.",
    ]],
    cues: [[
      "خطوةٌ قصيرة بالساق المعمولة ووقوفٌ قصيرٌ عليها ⟵ خطوتان متساويتان ووقتٌ متساوٍ على كلّ ساق.",
      "الركبةُ مثنيّةٌ طوالَ المشي ⟵ استقم عليها عند الوقوف، واضرب بالكعب.",
      "العصا في يد الساق المعمولة ⟵ في اليد المقابلة، تتقدّم مع الساق المعمولة.",
    ], [
      "A short step and short stance on the operated leg → two equal steps and equal time on each leg.",
      "A bent knee all through walking → straighten it when standing on it, and land on the heel.",
      "The cane in the operated side's hand → in the opposite hand, moving with the operated leg.",
    ]],
    easier: ["المشّايةُ والخطوةُ بمحاذاة الساق السليمة (خطوةٌ إلى) ومسافةٌ قصيرة داخل البيت.", "The frame with a step-to pattern and a short distance indoors."],
    harder: ["العصا ثمّ بلا أداة، ومسافةٌ أطول، وأرضٌ غير مستوية ومنحدر.", "A cane, then no aid, a longer distance, uneven ground and a slope."],
    stopIf: ["دوخةٌ أو ضيقُ نفس أو ألمٌ في الصدر — يجلس ويُحال فوراً؛ أو ألمٌ وتورّمٌ في بطن الساق.", "Dizziness, breathlessness or chest pain — sit and refer at once; or pain and swelling in the calf."],
    equipment: ["مشّايةٌ أو عكّازان أو عصا بطولٍ مضبوط، وحذاءٌ مغلقٌ ثابت.", "A frame, two crutches or a cane set to the right height, and closed, stable shoes."],
    doseNote: ["مشياتٌ قصيرةٌ متكرّرة كلَّ ساعةٍ أو ساعتين في الأسابيع الأولى، تطول تدريجياً.", "Short, frequent walks every hour or two in the first weeks, lengthening gradually."],
    images: [{ key: "walking-aid-gait-1", ar: "مريضٌ بعد استبدال الركبة يمشي بالمشّاية والكعبُ يضرب الأرضَ أوّلاً", en: "A patient after knee replacement walking with a frame, landing heel first", search: "walking with walker after total knee replacement" }],
  },
  {
    code: "stairs-after-knee-surgery", nameAr: "صعود الدرج ونزوله بعد جراحة الركبة (بالدرابزين والعكّاز)", nameEn: "Stairs after knee surgery (rail and crutch)",
    kind: "functional", region: "whole_body",
    purpose: ["يعيد الاستقلالَ على الدرج بأمان قبل الخروج إلى البيت والشارع — بقاعدةٍ واحدة: الصعودُ بالسليمة والنزولُ بالمعمولة، ثمّ درجةً بعد درجة حين تقوى الركبة.",
      "Restores safe independence on stairs before going home and outdoors — with one rule: up with the good leg, down with the operated one, then step over step as the knee strengthens."],
    start: ["أمامَ درجٍ بدرابزين، اليدُ على الدرابزين والعكّازُ في اليد الأخرى، والمعالجُ خلفه في الصعود وأمامه في النزول.",
      "Facing stairs with a rail, one hand on the rail and the crutch in the other, the therapist behind on the way up and in front on the way down."],
    steps: [[
      "في الصعود: اصعد بالساق السليمة أوّلاً.",
      "ثمّ الساقُ المعمولة والعكّازُ معاً إلى الدرجة نفسِها.",
      "في النزول: أنزل العكّازَ أوّلاً، ثمّ الساقَ المعمولة.",
      "ثمّ الساقُ السليمة إلى الدرجة نفسِها.",
      "حين تقوى الركبة: درجةٌ بعد درجة بالتناوب، صعوداً ثمّ نزولاً، بالدرابزين وحده.",
    ], [
      "Going up: step up with the good leg first.",
      "Then the operated leg and the crutch together onto the same step.",
      "Going down: lower the crutch first, then the operated leg.",
      "Then the good leg onto the same step.",
      "As the knee strengthens: step over step, up and then down, with the rail alone.",
    ]],
    cues: [[
      "الساقُ المعمولة أوّلاً في الصعود ⟵ «السليمةُ إلى الجنّة والمعمولةُ إلى الأسفل» (الصعودُ بالسليمة والنزولُ بالمعمولة).",
      "النظرُ إلى القدمين والجسمُ مائلٌ للخلف ⟵ النظرُ إلى الدرجة التالية والجسمُ فوق القدمين.",
      "الإسراعُ في النزول ⟵ درجةً درجة، والركبةُ فوق القدم.",
    ], [
      "The operated leg first going up → 'up with the good, down with the bad'.",
      "Looking at the feet with the body leaning back → eyes on the next step and the body over the feet.",
      "Rushing down → one step at a time, with the knee over the foot.",
    ]],
    easier: ["درجةٌ واحدة منخفضة (١٠ سم) في القاعة.", "A single low step (10 cm) in the gym."],
    harder: ["درجٌ كامل بلا عكّاز، ثمّ درجةً بعد درجة، ثمّ حملُ كيسٍ خفيف.", "A full flight without a crutch, then step over step, then carrying a light bag."],
    stopIf: ["دوخةٌ أو ألمٌ في الصدر أو ضيقُ نفس، أو إحساسٌ بانثناء الركبة فجأةً تحت الوزن.", "Dizziness, chest pain or breathlessness, or the knee suddenly giving way under load."],
    equipment: ["درجٌ بدرابزين أو درجةُ تمرين، وعكّاز.", "Stairs with a rail or an exercise step, and a crutch."],
    doseNote: ["في كلّ جلسةٍ من المرحلة الأولى حتى يستقلّ، ثمّ كلّ يومٍ في البيت.", "Every phase 1 session until independent, then daily at home."],
    images: [{ key: "stairs-after-knee-surgery-1", ar: "مريضٌ يصعد درجةً بالساق السليمة أوّلاً ويدُه على الدرابزين والعكّازُ في اليد الأخرى", en: "A patient stepping up with the good leg first, one hand on the rail and a crutch in the other", search: "stairs with crutch after knee replacement up with good leg" }],
  },
  {
    code: "car-transfer", nameAr: "الدخول إلى السيارة والخروج منها", nameEn: "Getting in and out of a car",
    kind: "functional", region: "whole_body",
    purpose: ["يتيح العودةَ إلى المركز والمراجعات بأمان وبلا ثني الركبة فوق ما تحتمل في الأسابيع الأولى — وأكثرُ المرضى يصلون المركزَ بسيارة.",
      "Allows safe travel to the centre and appointments without bending the knee beyond what it tolerates in the early weeks — most patients reach the centre by car."],
    start: ["المقعدُ الأماميّ مرجَعٌ إلى الخلف ومائلٌ قليلاً، وكيسٌ بلاستيكيّ على المقعد ليسهل الدوران، والسيارةُ بعيدةٌ عن الرصيف أو بمحاذاته بحيث يكون المقعدُ بارتفاعٍ مناسب.",
      "The front seat pushed back and slightly reclined, a plastic bag on the seat to ease turning, and the car parked so the seat is at a suitable height."],
    steps: [[
      "قِف وظهرُك إلى المقعد حتى تلمسه بالساقين.",
      "مدّ الساقَ المعمولة قليلاً إلى الأمام، وأمسك بإطار الباب واللوحة الثابتة لا بالباب.",
      "اجلس ببطء وانحنِ برأسك.",
      "تزحزح إلى الخلف، ثمّ أدِر الساقين معاً إلى الداخل (والمرافقُ يساعد الساقَ المعمولة إن احتاج).",
      "وللخروج: الخطواتُ نفسُها بالعكس — الساقان معاً إلى الخارج أوّلاً.",
    ], [
      "Stand with your back to the seat until your legs touch it.",
      "Slide the operated leg slightly forward and hold the door frame and the dashboard, not the door.",
      "Sit down slowly and duck your head.",
      "Shuffle back, then swing both legs in together (a companion helps the operated leg if needed).",
      "To get out: the same steps in reverse — both legs out together first.",
    ]],
    cues: [[
      "الدخولُ بالساق أوّلاً ⟵ الجلوسُ أوّلاً ثمّ الساقان.",
      "الإمساكُ بالباب ⟵ بإطار الباب الثابت، فالبابُ يتحرّك.",
      "مقعدٌ منخفض ⟵ وسادةٌ صلبة على المقعد.",
    ], [
      "Stepping in leg first → sit first, then bring the legs in.",
      "Holding the door → hold the fixed frame, as the door moves.",
      "A low seat → a firm cushion on the seat.",
    ]],
    easier: ["التدرّبُ على كرسيٍّ في القاعة بالحركة نفسِها.", "Practise the same movement on a chair in the gym."],
    harder: ["المقعدُ الخلفيّ أو سيارةٌ منخفضة، والقيادةُ حين يأذن الجرّاح.", "The back seat or a low car, and driving once the surgeon allows."],
    stopIf: ["ألمٌ حادّ في الركبة أو دوخة.", "Sharp knee pain or dizziness."],
    equipment: ["كرسيٌّ في القاعة للتدريب، وكيسٌ بلاستيكيّ، ووسادةٌ صلبة.", "A chair in the gym for practice, a plastic bag and a firm cushion."],
    doseNote: ["يُتدرّب عليه في الجلسات الأولى قبل أوّل رحلةٍ طويلة.", "Practised in the first sessions before the first long trip."],
    images: [{ key: "car-transfer-1", ar: "مريضٌ جالسٌ على مقعد السيارة الأماميّ يدير ساقيه معاً إلى الداخل", en: "A patient seated on the front car seat swinging both legs in together", search: "car transfer technique after knee replacement" }],
  },
  {
    code: "scar-mobilisation", nameAr: "تدليك الندبة وتحريكها بعد التئام الجرح", nameEn: "Scar massage and mobilisation after wound healing",
    kind: "mobility", region: "knee", perSide: true,
    purpose: ["الندبةُ الطويلة على مقدّم الركبة قد تلتصق بما تحتها فتشدّ عند الثني وتؤلم عند الركوع؛ وتحريكُها بعد التئامها يحفظ انزلاقَ الجلد ويخفّف حساسيتَه.",
      "The long scar on the front of the knee can stick to the tissue beneath, pulling on bending and hurting on kneeling; moving it once healed keeps the skin gliding and eases its sensitivity."],
    start: ["جالسٌ والساقُ ممدودة، بعد التئام الجرح تماماً — أُزيلت الغرزُ أو الدبابيس ولا قشورَ ولا إفراز — ويداه نظيفتان.",
      "Sitting with the leg straight, once the wound has fully healed — stitches or clips removed, no scabs or discharge — with clean hands."],
    steps: [[
      "ضع إصبعين على جانب الندبة وحرّك الجلدَ فوق ما تحته في دوائرَ صغيرة.",
      "تقدّم على طول الندبة كلّها من الأعلى إلى الأسفل.",
      "ثمّ حرّك الجلدَ للأعلى وللأسفل ولليمين ولليسار، فتنزلق الندبةُ في كلّ اتّجاه.",
      "ثمّ اثنِ الركبةَ قليلاً وكرّر في الأماكن التي تشدّ.",
      "أنهِ بمرطّبٍ خفيف.",
    ], [
      "Place two fingers beside the scar and move the skin over the tissue beneath in small circles.",
      "Work along the whole scar from top to bottom.",
      "Then move the skin up, down, left and right, so the scar glides in every direction.",
      "Then bend the knee slightly and repeat over the spots that pull.",
      "Finish with a light moisturiser.",
    ]],
    cues: [[
      "الأصابعُ تنزلق على الجلد ⟵ تحرّك الجلدَ نفسَه فوق ما تحته.",
      "قبل التئام الجرح ⟵ لا تدليكَ على جرحٍ مفتوحٍ أو قشرة.",
      "ضغطٌ مؤلم ⟵ ضغطٌ ثابتٌ محتمَل يزيد مع الأيّام.",
    ], [
      "Fingers sliding over the skin → move the skin itself over the tissue beneath.",
      "Before the wound has healed → no massage on an open wound or scab.",
      "Painful pressure → firm, tolerable pressure that increases over the days.",
    ]],
    easier: ["لمسٌ خفيف ومناديلُ ناعمة على الندبة لتقليل حساسيتها أوّلاً.", "Light touch and soft fabrics over the scar to reduce its sensitivity first."],
    harder: ["التحريكُ والركبةُ مثنيّةٌ في آخر مداها.", "Mobilising with the knee bent to the end of its range."],
    stopIf: ["احمرارٌ أو سخونةٌ أو إفرازٌ أو فتحةٌ في الندبة — يُوقف ويُحال إلى الجرّاح.", "Redness, warmth, discharge or an opening in the scar — stop and refer to the surgeon."],
    equipment: ["مرطّبٌ خفيفٌ بلا عطر.", "A light, unscented moisturiser."],
    doseNote: ["٥ دقائق مرّتين يومياً بعد التئام الجرح (غالباً بعد الأسبوع الثالث).", "5 minutes twice daily once the wound has healed (usually after week 3)."],
    images: [{ key: "scar-mobilisation-1", ar: "إصبعان يحرّكان جلدَ ندبة الركبة الملتئمة في دوائرَ صغيرة", en: "Two fingers moving the skin of a healed knee scar in small circles", search: "knee replacement scar massage" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "terminal-knee-extension", nameAr: "مدّ الركبة الأخير بالمطّاط واقفاً", nameEn: "Standing terminal knee extension with a band",
    kind: "strength", region: "knee", perSide: true, sets: 3, reps: 15, hold: 2,
    purpose: ["يقوّي عضلةَ الفخذ في آخر درجات البسط، وهي التي تُبقي الركبةَ مستقيمةً عند الوقوف عليها في المشي — وفقدُها يعطي «تأخّرَ البسط» ومشياً بركبةٍ مثنيّة؛ وهو من برنامج تجربة Bade 2017.",
      "Strengthens the thigh muscle in the last degrees of extension, which keep the knee straight when standing on it in walking — losing them gives an extensor lag and a bent-knee gait; it is part of the Bade 2017 trial programme."],
    start: ["واقفٌ والمطّاطُ مربوطٌ بشيءٍ ثابتٍ أمامه بارتفاع الركبة وملفوفٌ خلف الركبة المعمولة، والركبةُ مثنيّةٌ قليلاً، ويداه على كرسيٍّ أو طاولة.",
      "Standing with the band tied to something fixed in front at knee height and looped behind the operated knee, the knee slightly bent, hands on a chair or table."],
    steps: [[
      "اشدُد الفخذ وادفع الركبةَ إلى الخلف ضدّ المطّاط حتى تستقيم تماماً.",
      "اثبت ثانيتين والركبةُ مستقيمة.",
      "أرخِ ببطء إلى الثني القليل.",
      "كرّر ١٥ مرّة، ٣ مجموعات.",
    ], [
      "Tighten the thigh and push the knee back against the band until it is fully straight.",
      "Hold for 2 seconds with the knee straight.",
      "Relax slowly back to the slight bend.",
      "Repeat 15 times, 3 sets.",
    ]],
    cues: [[
      "الحركةُ من الورك أو الجذع ⟵ الركبةُ وحدها تتحرّك والجسمُ ثابت.",
      "الكعبُ يرتفع ⟵ القدمُ مسطّحةٌ على الأرض.",
      "الرجوعُ سريعاً ⟵ ببطءٍ وبتحكّم.",
    ], [
      "Moving from the hip or trunk → only the knee moves, the body still.",
      "The heel lifting → the foot flat on the floor.",
      "Snapping back → slowly and with control.",
    ]],
    easier: ["مطّاطٌ أخفّ، أو جالساً بمدّ الركبة الأخير على لفّةٍ تحت الركبة.", "A lighter band, or sitting with a short-arc extension over a roll under the knee."],
    harder: ["مطّاطٌ أقوى، ثمّ الوقوفُ على الساق المعمولة وحدها.", "A stronger band, then standing on the operated leg alone."],
    stopIf: ["ألمٌ حادّ في مقدّم الركبة أو تورّمٌ يزداد في اليوم التالي.", "Sharp pain at the front of the knee or swelling increasing the next day."],
    equipment: ["مطّاطٌ مقاوِم بحلقة، ونقطةُ ربطٍ ثابتة، وكرسيٌّ للاستناد.", "A looped resistance band, a fixed anchor and a chair for support."],
    doseNote: ["يوماً بعد يوم — ٣ × ١٥.", "Alternate days — 3 × 15."],
    images: [{ key: "terminal-knee-extension-1", ar: "واقفٌ والمطّاطُ خلف الركبة يمدّها حتى تستقيم ويداه على كرسيّ", en: "Standing with a band behind the knee, straightening it fully with hands on a chair", search: "terminal knee extension band standing exercise" }],
  },
  {
    code: "knee-flexion-step-stretch", nameAr: "ثني الركبة على الدرجة (تمطيط الثني حاملاً الوزن)", nameEn: "Knee bend on a step (weight-bearing flexion stretch)",
    kind: "mobility", region: "knee", perSide: true, sets: 1, reps: 10, hold: 10,
    purpose: ["يزيد ثنيَ الركبة بوزن الجسم حين يتوقّف تحسّنُه بالتمارين في الجلوس — ويقرّب المريضَ من ١١٠° وما فوقها التي يحتاجها للدرج والجلوس المنخفض والصلاة على الكرسيّ براحة.",
      "Gains knee bend with body weight once seated exercises stop improving it — bringing the patient towards 110° and beyond, needed for stairs, low seats and praying on a chair comfortably."],
    start: ["واقفٌ أمامَ درجةٍ أو كرسيٍّ منخفض، والقدمُ المعمولة على الدرجة، واليدان على الدرابزين أو طاولة.",
      "Standing facing a step or low chair, the operated foot on the step, hands on the rail or a table."],
    steps: [[
      "انقل وزنَك إلى الأمام ببطء فوق القدم التي على الدرجة، فتنثني الركبة.",
      "توقّف عند الشدّ المحتمَل، واثبت ١٠ ثوانٍ.",
      "عُد إلى الخلف ببطء.",
      "كرّر ١٠ مرّات، وزِد ارتفاعَ الدرجة حين يسهل.",
    ], [
      "Shift your weight slowly forward over the foot on the step, so the knee bends.",
      "Stop at a tolerable stretch and hold for 10 seconds.",
      "Come back slowly.",
      "Repeat 10 times, raising the step when it becomes easy.",
    ]],
    cues: [[
      "الكعبُ يرتفع عن الدرجة ⟵ القدمُ مسطّحة.",
      "الركبةُ تنحرف إلى الداخل ⟵ فوق إصبع القدم الثاني.",
      "اندفاعٌ مؤلم ⟵ شدٌّ ثابتٌ محتمَل (حتى ٥ من ١٠).",
    ], [
      "The heel lifting off the step → the foot flat.",
      "The knee drifting inwards → over the second toe.",
      "A painful lunge → a steady, tolerable stretch (up to 5/10).",
    ]],
    easier: ["درجةٌ منخفضة (١٠ سم).", "A low step (10 cm)."],
    harder: ["درجةٌ أعلى (٢٠–٣٠ سم) وثباتٌ ٣٠ ثانية.", "A higher step (20–30 cm) and a 30-second hold."],
    stopIf: ["ألمٌ حادّ أو تورّمٌ يزداد بعده، أو إحساسٌ بعدم ثبات الركبة.", "Sharp pain, swelling increasing afterwards, or the knee feeling unstable."],
    equipment: ["درجةُ تمرينٍ أو درج بدرابزين.", "An exercise step or stairs with a rail."],
    doseNote: ["مرّتين يومياً حين يبلغ الثنيُ ٩٠° ويتوقّف تحسّنه.", "Twice daily once flexion reaches 90° and stops improving."],
    images: [{ key: "knee-flexion-step-stretch-1", ar: "القدمُ المعمولة على درجةٍ والجسمُ يميل إلى الأمام فتنثني الركبة", en: "The operated foot on a step with the body leaning forward to bend the knee", search: "knee flexion stretch on step after knee replacement" }],
  },
  {
    code: "leg-press-progressive", nameAr: "ضغط الساقين بأثقالٍ متدرّجة", nameEn: "Progressive leg press",
    kind: "strength", region: "knee", perSide: true, sets: 2, reps: 8,
    purpose: ["الفخذُ يفقد نحو ٦٠٪ من قوّته في الشهر الأوّل بعد الاستبدال، وأكثرُه من ضعف تنشيط العضلة (Mizner 2005)؛ والتقويةُ المتدرّجة بأثقالٍ تتعب بها العضلةُ في ٨ تكرارات آمنةٌ من الأسبوع الأوّل (Jakobsen 2012 · Bade 2017) وتوصيةٌ في APTA 2020 — وهي ما يعيد القوّة.",
      "The thigh loses about 60% of its strength in the first month after replacement, mostly from poor muscle activation (Mizner 2005); progressive strengthening with loads that tire the muscle in 8 repetitions is safe from the first week (Jakobsen 2012 · Bade 2017) and recommended by APTA 2020 — it is what restores strength."],
    start: ["على جهاز ضغط الساقين بمدىً من ٩٠° إلى البسط، أو مستلقياً والمطّاطُ القويّ حول القدم ومسكُه باليدين إن لم يتوفّر الجهاز.",
      "On the leg-press machine through 90° to extension, or lying with a strong band around the foot held in both hands if no machine is available."],
    steps: [[
      "ابدأ بالساقين معاً بثقلٍ تتعب في آخر تكرارٍ من ٨ (8-RM).",
      "ادفع حتى تستقيم الركبتان بلا قفلٍ عنيف، في ثانيتين.",
      "انزل ببطءٍ في ثلاث ثوانٍ حتى ٩٠°.",
      "كرّر ٨ مرّات، مجموعتين، وراحةُ دقيقةٍ بينهما.",
      "حين تُكمل المجموعتين بلا تعبٍ وبلا علامات التوقّف في اليوم التالي: زِد الثقل، ثمّ انتقل إلى الساق المعمولة وحدها.",
    ], [
      "Start with both legs on a load that tires you by the 8th repetition (8-RM).",
      "Push until both knees are straight without snapping them locked, over 2 seconds.",
      "Lower slowly over 3 seconds to 90°.",
      "Repeat 8 times, 2 sets, with a minute's rest between.",
      "When both sets are completed without fatigue and with no hold signs the next day: add load, then move to the operated leg alone.",
    ]],
    cues: [[
      "الساقُ السليمة تحمل العمل ⟵ الضغطُ متساوٍ، ثمّ المعمولةُ وحدها.",
      "الركبتان تنحرفان إلى الداخل ⟵ الركبةُ فوق القدم.",
      "حبسُ النفس ⟵ زفيرٌ مع الدفع.",
    ], [
      "The good leg doing the work → equal pressure, then the operated leg alone.",
      "Knees drifting inwards → knee over foot.",
      "Holding the breath → breathe out as you push.",
    ]],
    easier: ["ثقلٌ أخفّ ومدىً أقصر (٦٠° إلى البسط).", "A lighter load and a shorter range (60° to extension)."],
    harder: ["الساقُ المعمولة وحدها، ثمّ للقادر ٤ × ٥ بثقلٍ ثقيل (Husby 2018).", "The operated leg alone, then for the able 4 × 5 with a heavy load (Husby 2018)."],
    stopIf: ["علامتان من علامات التوقّف (ألمٌ يبقى ساعتين فأكثر، أو نقصُ المدى ٥° فأكثر، أو زيادةُ محيط الركبة ٢ سم فأكثر، أو ألمُ الراحة يزيد نقطتين — Bade 2011) ⟵ يُخفَّف الثقلُ في الجلسة التالية؛ أو ضغطُ دمٍ مرتفعٌ لا يُضبط.", "Two of the hold signs (soreness lasting 2 hours or more, range down 5° or more, knee girth up 2 cm or more, or resting pain up 2 points — Bade 2011) → reduce the load next session; or uncontrolled high blood pressure."],
    equipment: ["جهازُ ضغط الساقين إن توفّر، وإلّا مطّاطٌ قويّ.", "A leg-press machine if available, otherwise a strong band."],
    doseNote: ["يوماً بعد يوم في المركز — ٢ × ٨ بثقل 8-RM، والثقلُ يزيد كلّما سهل (Bade 2017).", "Alternate days in the centre — 2 × 8 at an 8-RM load, increased whenever it becomes easy (Bade 2017)."],
    images: [{ key: "leg-press-progressive-1", ar: "مريضٌ على جهاز ضغط الساقين والركبتان مثنيّتان نحو ٩٠°", en: "A patient on a leg-press machine with the knees bent to about 90°", search: "leg press exercise rehabilitation older adult" }],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "kneeling-floor-transfer", nameAr: "الركوع على وسادة والنزول إلى الأرض والقيام منها", nameEn: "Kneeling on a cushion and getting down to and up from the floor",
    kind: "functional", region: "whole_body",
    purpose: ["يركع بعد سنةٍ نحو ثلث المرضى وبعد ثلاث سنواتٍ نحو نصفهم (Nadeem 2021)، وكثيرون يتجنّبونه لنصيحةٍ سمعوها مع أنّهم يستطيعونه حين يجرّبون (Palmer 2002)، والتعليمُ يحسّنه (Jenkins 2008 — في الاستبدال الجزئيّ)؛ فالتدرّبُ عليه يعيد النزولَ إلى الأرض والقيامَ منها — والصلاةُ على الكرسيّ رخصةٌ إن لم يبلغه.",
      "About a third of patients kneel at one year and about half at three years (Nadeem 2021); many avoid it because of advice they were given, yet can do it when they try (Palmer 2002), and teaching improves it (Jenkins 2008 — in partial replacement); practising it restores getting down to and up from the floor — and praying on a chair is permitted if it is not reached."],
    start: ["أمامَ كرسيٍّ ثابت أو طاولة، ووسادةٌ سميكة أو فرشةٌ على الأرض، والمعالجُ بجانبه.",
      "Facing a firm chair or table, with a thick cushion or mat on the floor and the therapist beside the patient."],
    steps: [[
      "أمسك بالكرسيّ وانزل على الركبة السليمة أوّلاً على الوسادة.",
      "ثمّ ضع الركبةَ المعمولة على الوسادة بجانبها، وابقَ ١٠–٣٠ ثانية.",
      "للقيام: ضع القدمَ السليمة أمامك (نصفُ ركوع) وادفع بها وبيديك على الكرسيّ.",
      "حين يسهل: انتقل من الركوع إلى الجلوس جانباً على الأرض ثمّ عُد بالطريقة نفسِها.",
      "كرّر ٥ مرّات.",
    ], [
      "Hold the chair and lower onto the good knee first, on the cushion.",
      "Then place the operated knee on the cushion beside it, and stay 10–30 seconds.",
      "To rise: bring the good foot forward (half-kneeling) and push up with it and your hands on the chair.",
      "When easy: move from kneeling to side-sitting on the floor and back the same way.",
      "Repeat 5 times.",
    ]],
    cues: [[
      "النزولُ على الركبة المعمولة أوّلاً ⟵ السليمةُ أوّلاً نزولاً وصعوداً.",
      "الركوعُ على أرضٍ صلبة ⟵ وسادةٌ سميكة تحت الركبة دائماً.",
      "الخوفُ من «كسر المفصل» ⟵ الانزعاجُ يقلّ بالتدريب، والجرّاحُ يُسأل إن منع الركوعَ لسببٍ في عمليته.",
    ], [
      "Kneeling on the operated knee first → the good knee first, down and up.",
      "Kneeling on a hard floor → always a thick cushion under the knee.",
      "Fear of 'breaking the joint' → discomfort eases with practice, and the surgeon is asked if they ruled out kneeling for a reason in the operation.",
    ]],
    easier: ["الركوعُ على كرسيٍّ منخفضٍ مبطَّن بالركبة المعمولة والقدمُ الأخرى على الأرض.", "Kneeling with the operated knee on a low padded stool, the other foot on the floor."],
    harder: ["النزولُ إلى الجلوس على الأرض والقيامُ بلا كرسيّ.", "Getting down to sitting on the floor and up again without a chair."],
    stopIf: ["ألمٌ حادّ في مقدّم الركبة، أو جرحٌ لم يلتئم، أو دوخةٌ عند القيام.", "Sharp pain at the front of the knee, an unhealed wound, or dizziness on rising."],
    equipment: ["وسادةٌ سميكة أو فرشة، وكرسيٌّ ثابت.", "A thick cushion or mat, and a firm chair."],
    doseNote: ["في الجلسات الأخيرة، حين يلتئم الجرح ويبلغ الثنيُ ٩٠° فأكثر، ثمّ في البيت.", "In the later sessions, once the wound has healed and flexion reaches 90° or more, then at home."],
    images: [{ key: "kneeling-floor-transfer-1", ar: "مريضٌ يركع على وسادةٍ سميكة ويدُه على كرسيٍّ ثابت", en: "A patient kneeling on a thick cushion with one hand on a firm chair", search: "kneeling on cushion after knee replacement" }],
  },
];

const PAIN_HOLD_AR = "قاعدةُ التوقّف (Bade 2011): ألمٌ يبقى ساعتين فأكثر بعد الجلسة، أو نقصُ المدى ٥° فأكثر، أو زيادةُ محيط الركبة ٢ سم فأكثر، أو ألمُ الراحة يزيد نقطتين ⟵ لا تُزاد الشدّة؛ واثنتان منها ⟵ تُخفَّف في الجلسة التالية.";
const PAIN_HOLD_EN = "Hold rule (Bade 2011): soreness lasting 2 hours or more after the session, range down 5° or more, knee girth up 2 cm or more, or resting pain up 2 points → do not progress; two of them → reduce intensity next session.";
const EXTEND_AR = "وإن بقي في الجلسة ٢٤ واحدٌ أو أكثر من: ثنيٍ ١٠٠°، ونقصِ بسطٍ ٥° أو أقلّ، ومشيٍ في الشارع بلا أداة، ودرجٍ درجةً بعد درجة ⟵ تمديدٌ واحد بستّ جلسات (حتى ٣٠)؛ ولا تمديدَ لثنيٍ تحت ٩٠° نحو الأسبوع السادس — بل إحالةٌ إلى الجرّاح.";
const EXTEND_EN = "If at session 24 one or more of these is still missing: 100° flexion, an extension deficit of 5° or less, outdoor walking without an aid, step-over-step stairs → one extension of six sessions (to 30); no extension for flexion under 90° at about week 6 — refer to the surgeon instead.";

export const PROTOCOL: ProtocolContentSeed = {
  code: "tka-geriatric",
  summary: [
    "التأهيلُ بعد استبدال مفصل الركبة الكلّيّ (Total knee arthroplasty — TKA) عند البالغين وكبار السنّ — من وصول المريض إلى المركز (غالباً في الأسبوع الأوّل إلى الثالث بعد العملية) إلى المشي بلا أداةٍ والدرجِ والعودةِ إلى البيت والصلاة والعمل. " +
    "أقوى ما في الدليل (APTA 2020): تدريبُ المشي والتوازن وتناظرِ الحركة (التوصيةُ القوية الوحيدة)، ثمّ التقويةُ المتدرّجة عاليةُ الشدّة من الأسبوع الأوّل، والتحفيزُ الكهربائيّ لعضلة الفخذ (NMES)، وتعليمُ البرودة للألم المبكّر — ولا يُستعمل جهازُ التحريك المستمرّ (CPM). " +
    "والإشرافُ وحده ليس هو الفائدة: البرنامجُ المنزليّ المنظَّم يعطي المريضَ المتوسّط ما يعطيه العلاجُ في العيادة (Artz 2015 · Florez-García 2017 · Konnyu 2023)، والمعرَّضون لنتيجةٍ سيّئة لم يستفيدوا من إشرافٍ أكثر (Hamilton 2020 · Barker 2021)، والفائدةُ أوضحُ في الأشهر الثلاثة الأولى منها بعد سنة (Minns Lowe 2007)؛ والعلاجُ المشرَف عليه لمن يعجز عن أنشطته اليومية أو لم ينفعه البرنامجُ الذاتيّ (NICE NG157). فمحتوى الجلسة — القوّةُ والتوازنُ والمشي — هو ما يُحاسَب عليه، والبرنامجُ المنزليُّ اليوميّ شرطٌ لا إضافة. " +
    "ثلاثُ مراحل بنطاقات جلساتٍ ومعايير رقمية تحكم الانتقالَ لا التاريخ: الحمايةُ والتنشيطُ واستعادةُ الحركة، ثمّ التقويةُ المتدرّجة والمدى والتوازن، ثمّ الوظيفةُ والتحمّلُ والركوعُ والعودة — وإحالةٌ مبكّرة إلى الجرّاح إن تيبّست الركبة.",
    "Rehabilitation after total knee arthroplasty (TKA) in adults and older adults — from arrival at the centre (usually in post-op weeks 1–3) to walking without an aid, stairs, and return to home life, prayer and work. " +
    "The strongest evidence (APTA 2020): training walking, balance and movement symmetry (the only strong recommendation), then early high-intensity progressive strengthening from the first week, neuromuscular electrical stimulation (NMES) of the quadriceps, and teaching cryotherapy for early pain — and continuous passive motion (CPM) is not used. " +
    "Supervision itself is not the benefit: a structured home programme gives the average patient what clinic therapy gives (Artz 2015 · Florez-García 2017 · Konnyu 2023), patients at risk of a poor outcome did not benefit from more supervision (Hamilton 2020 · Barker 2021), and gains are clearer at three months than at one year (Minns Lowe 2007); supervised rehabilitation is for those who struggle with daily activities or whom self-directed rehabilitation has not helped (NICE NG157). So the content of the session — strength, balance and walking — is what counts, and the daily home programme is a condition, not an extra. " +
    "Three phases with session ranges and numeric criteria that govern progression, not the calendar: protection, activation and restoring movement, then progressive strengthening, range and balance, then function, endurance, kneeling and return — with early referral to the surgeon if the knee stiffens.",
  ],
  goals: [
    "• جرحٌ ملتئمٌ بلا علامات التهاب، وتورّمٌ وألمٌ تحت السيطرة.\n" +
    "• ثنيُ الركبة ١١٠–١١٥° فأكثر (و١٢٠° لمن هدفُه الجلوسُ على الأرض أو الصلاةُ عليها، في حدود ما يسمح به الجرّاح)، وبسطٌ كامل أو نقصٌ لا يتجاوز ٥°.\n" +
    "• رفعُ الساق مستقيمةً بلا تأخّر بسط، وقوّةٌ تزيد بالأثقال أسبوعاً بعد أسبوع.\n" +
    "• مشيٌ في البيت والشارع بلا أداة وبلا عرجٍ واضح، ومشيٌ متّصلٌ ٣٠ دقيقة، ودرجٌ درجةً بعد درجة.\n" +
    "• «النهوض والمشي» و«الجلوس والوقوف ٣٠ ثانية» يتحسّنان فوق أدنى تغيّرٍ حقيقيّ، ومقياسُ أكسفورد للركبة بالعربية يرتفع ٧ نقاطٍ فأكثر.\n" +
    "• استقلالٌ في البيت: السريرُ والكرسيّ والمرحاضُ والسيارة، وبرنامجٌ منزليٌّ يؤدّيه وحده، وتوقّعاتٌ واقعية عن الركوع والقرفصاء والصلاة.\n" +
    "(الحدودُ الرقمية اقتراحٌ مبنيّ على Bade 2011 وRowe 2000 لا دليلٌ مباشر — يقرّرها المشرف.)",
    "• A healed wound without signs of infection, and swelling and pain under control.\n" +
    "• Knee flexion of 110–115° or more (120° when sitting on the floor or praying on it is a goal, within the surgeon's limits), and full extension or a deficit of no more than 5°.\n" +
    "• A straight-leg raise without extensor lag, and strength that increases with load week by week.\n" +
    "• Walking at home and outdoors without an aid or an obvious limp, 30 minutes of continuous walking, and step-over-step stairs.\n" +
    "• Timed Up and Go and the 30-second chair stand improved beyond the minimal detectable change, and the Arabic Oxford Knee Score up 7 points or more.\n" +
    "• Independence at home — bed, chair, toilet and car — a home programme done alone, and realistic expectations about kneeling, squatting and prayer.\n" +
    "(The numeric limits are proposals built on Bade 2011 and Rowe 2000, not direct evidence — the supervisor decides them.)",
  ],
  assessment: [
    "في الجلسة الأولى، وعند كلّ انتقالٍ بين المراحل، وفي الخروج:\n" +
    "• العملية: تاريخُها ونوعُها، وتعليماتُ الجرّاح في التحميل والركوع، ومميّعُ الدم ومدّتُه.\n" +
    "• الجرح: الغرزُ أو الدبابيس، والإفراز، والاحمرارُ الممتدّ، والسخونة، والحمّى.\n" +
    "• التورّم: محيطُ الركبة عند منتصف الرضفة بالشريط، ويُقارن في كلّ جلسة (زيادةُ ٢ سم علامةُ توقّف — Bade 2011).\n" +
    "• مدى الحركة بمقياس الزوايا (مقياسان في القائمة: عطفُ الركبة ونقصُ بسطها) بالمقيِّم نفسِه والوضعِ نفسِه كلَّ مرّة — الثنيُ السلبيّ جالساً والبسطُ السلبيّ أدقُّها، والفرقُ تحت ٨° بين مقيِّمَين لا يُفرَّق عن خطأ القياس (Lenssen 2007).\n" +
    "• عضلةُ الفخذ: رفعُ الساق مستقيمةً وتأخّرُ البسط (Extensor lag) — وهو علامةُ الحاجة إلى التحفيز الكهربائيّ (APTA 2020).\n" +
    "• الألم (NPRS) في الراحة ومع النشاط.\n" +
    "• مجموعةُ APTA 2020 الأساسية في الأولى والأخيرة على الأقلّ: «النهوض والمشي» (TUG — مقياسٌ في القائمة، أدنى تغيّرٍ حقيقيّ ٢٫٣–٢٫٥ ثانية — Yuksel 2017 · Kennedy 2005)، و«الجلوس والوقوف ٣٠ ثانية» (مقياسٌ في القائمة)، ونتائجُ الركبة المختصر (KOOS-JR — مقياسٌ في القائمة).\n" +
    "• ولا نسخةَ عربيةً موثّقةً من KOOS-JR؛ ومقياسُ أكسفورد للركبة بالعربية (Oxford Knee Score — من ٤٨) موثّقٌ في الاستبدال (Bin Sheeha 2020)، والتحسّنُ المهمّ للمريض ٧ نقاط (Beard 2015) — يضيفه المشرفُ إلى مقاييس البروتوكول.\n" +
    "• اختياريّ: اختبارُ الدرج (أدنى تغيّرٍ حقيقيّ ٥٫٥ ثانية) والمشيُ ستّ دقائق (٦١ متراً) — Kennedy 2005.\n" +
    "• المشي: الأداة، والعرج، وطولُ الخطوتين، ووقتُ الوقوف على كلّ ساق، والدرج.\n" +
    "• الخطر: ألمُ بطن الساق وتورّمُه (جلطة)، وعلاماتُ الالتهاب، وتنميلُ ظهر القدم أو سقوطُها (العصبُ الشظويّ)، والسقوط (يعيش وحده؟ سقطةٌ سابقة؟ — Lo 2019)، والسكّريّ والوزن.\n" +
    "• البيت: الدرج، ونوعُ المرحاض، والجلوسُ على الأرض، والصلاة، ومَن يساعده.",
    "At the first session, at every phase change, and at discharge:\n" +
    "• The operation: date and type, the surgeon's instructions on weight bearing and kneeling, and the blood thinner and its duration.\n" +
    "• The wound: stitches or clips, discharge, spreading redness, warmth and fever.\n" +
    "• Swelling: knee girth at mid-patella with a tape, compared every session (an increase of 2 cm is a hold sign — Bade 2011).\n" +
    "• Range of motion with a goniometer (two listed measures: knee flexion and knee extension deficit), by the same assessor in the same position each time — sitting passive flexion and passive extension are the most reliable, and differences under 8° between two assessors cannot be told from measurement error (Lenssen 2007).\n" +
    "• The quadriceps: straight-leg raise and extensor lag — the sign that NMES is needed (APTA 2020).\n" +
    "• Pain (NPRS) at rest and with activity.\n" +
    "• The APTA 2020 core set at least at the first and last visit: Timed Up and Go (TUG — a listed measure, minimal detectable change 2.3–2.5 s — Yuksel 2017 · Kennedy 2005), the 30-second chair stand (a listed measure), and the KOOS-JR (a listed measure).\n" +
    "• There is no validated Arabic KOOS-JR; the Arabic Oxford Knee Score (out of 48) is validated in TKA (Bin Sheeha 2020), with 7 points the important change for the individual (Beard 2015) — the supervisor adds it to the protocol measures.\n" +
    "• Optional: the stair climb test (minimal detectable change 5.5 s) and the six-minute walk (61 m) — Kennedy 2005.\n" +
    "• Gait: the aid, the limp, step lengths, stance time on each leg, and stairs.\n" +
    "• Risks: calf pain and swelling (clot), signs of infection, numbness of the top of the foot or foot drop (peroneal nerve), falls (living alone? a previous fall? — Lo 2019), diabetes and weight.\n" +
    "• Home: stairs, the type of toilet, floor sitting, prayer, and who helps.",
  ],
  exercises: [
    "البرنامجُ على ثلاث مراحل بالبطاقات في «البرنامج على مراحل»؛ والجلسةُ ٥٠ دقيقة نحو:\n" +
    "• ٥ دقائق: الجرحُ والتورّمُ والمدى والألم، وقاعدةُ التوقّف.\n" +
    "• ١٥ دقيقة في المرحلتين الأولى والثانية: التحفيزُ الكهربائيّ لعضلة الفخذ (١٥ انقباضاً) والمريضُ جالس.\n" +
    "• ١٠ دقائق: المدى والعلاجُ اليدويّ — تحريكُ الرضفة، والتحريكُ السلبيّ، والأنسجةُ الرخوة (حتى ١٥ دقيقة في Bade 2017).\n" +
    "• ١٥ دقيقة: التقويةُ المتدرّجة (مجموعتان × ٨ بثقلٍ يتعب في ٨ — Bade 2017) والتمارينُ الوظيفية والتوازن.\n" +
    "• ٥ دقائق: المشيُ والدرج، ثمّ الكمادةُ الباردة والبرنامجُ المنزليّ.\n" +
    "وفي المرحلة الثالثة يذهب وقتُ التحفيز إلى التقوية والمشي.\n" +
    "العدد: ٢٤ جلسة × ستّ في الأسبوع. التجاربُ أعطت جلستين أو ثلاثاً في الأسبوع ستّةً إلى اثني عشر أسبوعاً (١٢–٢٦ جلسةً مشرَفاً عليها، وأعلاها Bade 2017 بـ٢٦ وHusby 2018 بـ٢٤)، ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع — فهذا نموذجُ المركز لا دليل. " +
    "والعددُ ٢٤ يضع حجمَ الإشراف عند أعلى ما جُرّب بأمان، ويغطّي الأسابيعَ ٢–٦ بعد العملية: أعمقُ ضعفٍ في الفخذ (Mizner 2005)، ونافذةُ التحفيز (ثلاثةُ أسابيع على الأقلّ — APTA 2020)، وقرارُ التيبّس قبل الأسبوع الثاني عشر.\n" +
    EXTEND_AR + "\n" +
    "والبرنامجُ المنزليّ يوميّ وفي أيّام الراحة (Bade 2017)، ويُعلَّم أحدُ أفراد الأسرة الكمادةَ والتمارين.\n" +
    "ومَن يصل في الأسبوع الأوّل والدبابيسُ في الجرح يبقى في المرحلة الأولى حتى يلتئم؛ ومَن يصل في الأسبوع الثالث أو بعده ويحقّق معيارَ المرحلة الأولى في التقييم يبدأ بتمارين الثانية (يختار الأخصائيُّ المرحلةَ في الجلسة، أو يعدّل نطاقات خطّة مريضه)؛ ومَن يصل بعد شهرين إلى أربعة بضعفٍ باقٍ تفيده جلساتٌ مكثّفة فائدةً متواضعة (Moffet 2004).\n" +
    "ومَن يأتي قبل العملية: جلسةُ تقييمٍ وتعليم، وبرنامجٌ منزليّ للقوّة والمدى، والتدرّبُ على المشّاية، والتوقّعات — فائدةٌ صغيرة قصيرةُ المدى (APTA 2020 · Gränicher 2022)، ولا يُبنى له برنامجٌ طويل.",
    "The programme runs in three phases with the cards under 'Programme by phase'; a 50-minute session is roughly:\n" +
    "• 5 minutes: wound, swelling, range and pain, and the hold rule.\n" +
    "• 15 minutes in phases 1 and 2: NMES of the quadriceps (15 contractions) with the patient seated.\n" +
    "• 10 minutes: range and manual therapy — patellar mobilisation, passive motion and soft tissue (up to 15 minutes in Bade 2017).\n" +
    "• 15 minutes: progressive strengthening (2 × 8 at a load that tires in 8 — Bade 2017), functional exercise and balance.\n" +
    "• 5 minutes: walking and stairs, then the cold pack and the home programme.\n" +
    "In phase 3 the NMES time goes to strengthening and walking.\n" +
    "The number: 24 sessions × six a week. Trials gave two or three sessions a week for six to twelve weeks (12–26 supervised sessions, the highest Bade 2017 with 26 and Husby 2018 with 24), and no trial tested six sessions a week — that is the centre's format, not evidence. " +
    "Twenty-four puts supervised volume at the highest that has been tested safely, and covers post-op weeks 2–6: the deepest quadriceps deficit (Mizner 2005), the NMES window (at least three weeks — APTA 2020), and the stiffness decision before week 12.\n" +
    EXTEND_EN + "\n" +
    "The home programme is daily, including rest days (Bade 2017), and a family member is taught the cold pack and the exercises.\n" +
    "A patient arriving in week 1 with clips still in the wound stays in phase 1 until it heals; one arriving in week 3 or later who meets the phase 1 criteria at assessment starts phase 2 exercises (the specialist chooses the phase in the session, or adjusts the ranges of the patient's plan); one arriving at two to four months with residual weakness gains modestly from intensive sessions (Moffet 2004).\n" +
    "A patient seen before surgery: one assessment and teaching session, a home programme for strength and range, practice with the frame, and expectations — a small, short-lived benefit (APTA 2020 · Gränicher 2022); no long programme is built for it.",
  ],
  contraindications: [
    "• ألمٌ أو تورّمٌ أو سخونةٌ أو احمرارٌ في بطن الساق من جهةٍ واحدة (جلطةٌ وريدية محتملة) ⟵ لا تمارينَ ولا تحفيزَ ولا حرارة، وإحالةٌ في اليوم نفسِه؛ وضيقُ نفسٍ أو ألمٌ في الصدر أو سعالٌ بدم ⟵ إسعافٌ فوراً. والتحفيزُ ممنوعٌ موضعياً وبعيداً مع الجلطة أو الشكّ فيها (Houghton 2010).\n" +
    "• علاماتُ التهاب المفصل الصناعيّ: إفرازٌ من الجرح بعد الأيّام الأولى، واحمرارٌ ينتشر، وانفتاحُ الجرح، وحمّى، وألمٌ جديد في الراحة أو الليل، وتورّمٌ يزداد، أو فتحةٌ تُفرز ⟵ إلى الجرّاح فوراً، وتشخيصُه له (Parvizi 2018).\n" +
    "• سقوطُ القدم أو تنميلُ ظهرها (أذى العصب الشظويّ — ١٫٣٪ — Schinsky 2001) ⟵ إحالة، ولا برودةَ على رأس عظم الشظيّة.\n" +
    "• انثناءُ الركبة فجأةً تحت الوزن، أو عدمُ ثباتها، أو ألمٌ وتشوّهٌ بعد سقطة (كسرٌ حول المفصل) ⟵ إحالة.\n" +
    "• التحفيزُ الكهربائيّ: لا على الدبابيس أو جرحٍ مفتوح، ولا مع جلطةٍ أو شكٍّ فيها، ولا مع منظّم ضربات القلب أو مزيل الرجفان؛ ويجوز على جلدٍ سليمٍ فوق المفصل المعدنيّ (Houghton 2010).\n" +
    "• الحرارةُ السطحية في المرحلتين الأولى والثانية — نسيجٌ ملتهب ونزفٌ لم يتوقّف (Houghton 2010)؛ والتيكارُ ذو اللوح المرتدّ حول المفصل الصناعيّ (García-Marín 2021).\n" +
    "• الإبرُ الجافة قربَ محفظة المفصل أو الجرح — خطرُ التهاب المفصل الصناعيّ.",
    "• Pain, swelling, warmth or redness in one calf (possible venous thrombosis) → no exercise, stimulation or heat, and same-day referral; breathlessness, chest pain or coughing blood → emergency at once. Electrical stimulation is contraindicated locally and remotely with a known or suspected clot (Houghton 2010).\n" +
    "• Signs of periprosthetic infection: wound discharge after the first days, spreading redness, wound breakdown, fever, new pain at rest or at night, increasing swelling, or a discharging opening → to the surgeon at once; diagnosis is theirs (Parvizi 2018).\n" +
    "• Foot drop or numbness of the top of the foot (peroneal nerve injury — 1.3% — Schinsky 2001) → refer, and no cold over the head of the fibula.\n" +
    "• The knee suddenly giving way under load, instability, or pain and deformity after a fall (periprosthetic fracture) → refer.\n" +
    "• Electrical stimulation: not over clips or an open wound, not with a known or suspected clot, and not with a pacemaker or defibrillator; it may be used on intact skin over the metal implant (Houghton 2010).\n" +
    "• Superficial heat in phases 1 and 2 — inflamed tissue and bleeding that has not stopped (Houghton 2010); and Tecar with a return plate around the implant (García-Marín 2021).\n" +
    "• Dry needling near the joint capsule or the wound — risk of periprosthetic infection.",
  ],
  precautions: [
    "• مميّعُ الدم (أسبوعان أو أكثر بعد العملية — NICE NG89): الكدماتُ أسهل — حذرٌ مع العمل العميق على الأنسجة.\n" +
    "• التورّمُ مشكلةُ قوّة: يفسّر نحو ربع فقدِ قوّة البسط المبكّر (Holm 2010)، فالسيطرةُ عليه جزءٌ من التقوية.\n" +
    "• " + PAIN_HOLD_AR + "\n" +
    "• التيبّس: يُبلَّغ الجرّاحُ إن كان الثنيُ تحت ٩٠° أو نقصُ البسط فوق ١٠° نحو الأسبوع السادس، أو توقّف التحسّنُ أسبوعين بعد الرابع — فتحريكُ الركبة تحت التخدير أنفعُ في الأسابيع الاثني عشر الأولى (Gu 2018 · Rahardja 2023 · Akhtar 2024). ودرجاتُه (Kalson 2016): الثنيُ ٩٠–١٠٠° خفيف، و٧٠–٨٩° متوسّط، وتحت ٧٠° شديد. ونقصُ البسط الباقي يُسيء النتيجة (Ritter 2007) — فالبسطُ أولويةٌ من أوّل جلسة.\n" +
    "• التوقّعات: القرفصاءُ تحتاج ١١١–١٦٥° (Mulholland 2001) — ١٥٧° في دراسة (Hemmerich 2006) — والثنيُ المعتاد بعد الاستبدال ١٠٩–١٢٧° بعد ستّة أشهر (Bade 2017)، فالقرفصاءُ الكاملة والتربّعُ غالباً لا يُبلَغان، ويُقال هذا من الجلسة الأولى؛ والركوعُ يبلغه نحو الثلث بعد سنة والنصفُ بعد ثلاث (Nadeem 2021).\n" +
    "• الصلاة: لا دراسةَ عنها بعد الاستبدال؛ فعلى الكرسيّ في الأسابيع الأولى، ثمّ يتدرّج نحو الأرض مَن يبلغ ١٢٠° بلا ألمٍ ويريد ذلك — والحكمُ الشرعيّ للمريض ومرجعه. وطولُ الصلاة على الكرسيّ ارتبط بوظيفةٍ أقلّ في خشونة الركبة (Ateef 2021) — ارتباطٌ لا سبب.\n" +
    "• المرحاضُ العربيّ والجلوسُ على الأرض: مقعدُ مرحاضٍ مرتفع أو كرسيُّ حمّام في البيت من أوّل يوم.\n" +
    "• السكّريّ: ٨٫٩٪ من البالغين في العراق مشخَّصون و٨٫١٪ غيرُ مشخَّصين (Pengpid 2022) — مراقبةُ الجرح، وفحصُ الإحساس قبل الحرارة والبرودة؛ ولا يرتبط بنتيجةٍ وظيفيةٍ أسوأ (APTA 2020).\n" +
    "• الوزن: مؤشّرُ كتلةٍ ٤٠ فأكثر يرفع المضاعفات، وخاصّةً التهابَ الجرح (AAOS 2022).\n" +
    "• السقوط: العيشُ وحيداً، والسقطةُ السابقة، والأدويةُ النفسية، والجنسُ الأنثويّ عواملُ خطر بعد الاستبدال (Lo 2019) — تدريبُ التوازن وتأمينُ البيت.\n" +
    "• العراق: التشوّهُ الشديد قبل العملية (تقوّسُ الساق فوق ١٥°) شائع (Alqatub 2023)، فالضعفُ قديمٌ ويحتاج وقتاً؛ واضطرابُ النوم يبلغ ذروتَه في الشهر الأوّل (Fatah 2020 — وكانت ٨٤٪ من مرضاها نساءً)، وقد تفضّل المريضةُ معالِجة.\n" +
    "• الأسرة: قلّةُ الدعم عاملُ خطر (APTA 2020) — يُعلَّم أحدُهم البرنامجَ والكمادة.",
    "• Blood thinners (two weeks or more after surgery — NICE NG89): bruising comes more easily — care with deep soft-tissue work.\n" +
    "• Swelling is a strength problem: it explains about a quarter of the early loss of extension strength (Holm 2010), so controlling it is part of strengthening.\n" +
    "• " + PAIN_HOLD_EN + "\n" +
    "• Stiffness: tell the surgeon if flexion is under 90° or the extension deficit over 10° at about week 6, or progress stalls for two weeks after week 4 — manipulation under anaesthesia works best within the first 12 weeks (Gu 2018 · Rahardja 2023 · Akhtar 2024). Grades (Kalson 2016): flexion 90–100° mild, 70–89° moderate, under 70° severe. A residual extension deficit worsens the result (Ritter 2007) — so extension is a priority from the first session.\n" +
    "• Expectations: squatting needs 111–165° (Mulholland 2001) — 157° in one study (Hemmerich 2006) — and typical flexion after replacement is 109–127° at six months (Bade 2017), so full squatting and cross-legged sitting are usually out of reach, and this is said from the first session; about a third kneel at one year and half at three (Nadeem 2021).\n" +
    "• Prayer: there is no study after replacement; pray on a chair in the first weeks, then progress towards the floor for those who reach 120° without pain and wish to — the religious ruling is for the patient and their authority. Long-term chair prayer was associated with lower function in knee osteoarthritis (Ateef 2021) — an association, not a cause.\n" +
    "• Squat toilets and floor sitting: a raised toilet seat or a shower chair at home from day one.\n" +
    "• Diabetes: 8.9% of adults in Iraq are diagnosed and 8.1% undiagnosed (Pengpid 2022) — watch the wound and test sensation before heat or cold; it is not associated with a worse functional outcome (APTA 2020).\n" +
    "• Weight: a body mass index of 40 or more raises complications, especially wound infection (AAOS 2022).\n" +
    "• Falls: living alone, a previous fall, psychiatric medication and female sex are risk factors after replacement (Lo 2019) — balance training and a safe home.\n" +
    "• Iraq: severe deformity before surgery (varus over 15°) is common (Alqatub 2023), so the weakness is long-standing and needs time; sleep disturbance peaks in the first month (Fatah 2020 — 84% of its patients were women), and a woman may prefer a female therapist.\n" +
    "• Family: lack of support is a risk factor (APTA 2020) — one of them is taught the programme and the cold pack.",
  ],
  totalSessions: 24, spw: 6, weeks: 4, minutes: 50,
  refs: [
    { title: "Physical Therapist Management of Total Knee Arthroplasty", org: "Physical Therapy — APTA clinical practice guideline (Jette et al.)", year: 2020, url: "https://doi.org/10.1093/ptj/pzaa099" },
    { title: "Surgical Management of Osteoarthritis of the Knee — Evidence-Based Clinical Practice Guideline", org: "American Academy of Orthopaedic Surgeons (AAOS)", year: 2022, url: "https://www.aaos.org/smoak2cpg" },
    { title: "Surgical Management of Osteoarthritis of the Knee: Evidence-based Guideline", org: "Journal of the American Academy of Orthopaedic Surgeons — AAOS 2015 guideline summary (McGrory et al.)", year: 2016, url: "https://doi.org/10.5435/JAAOS-D-16-00159" },
    { title: "Joint replacement (primary): hip, knee and shoulder (NG157)", org: "National Institute for Health and Care Excellence (NICE)", year: 2020, url: "https://www.nice.org.uk/guidance/ng157" },
    { title: "Venous thromboembolism in over 16s: reducing the risk of hospital-acquired deep vein thrombosis or pulmonary embolism (NG89)", org: "National Institute for Health and Care Excellence (NICE)", year: 2018, url: "https://www.nice.org.uk/guidance/ng89" },
    { title: "Early High-Intensity Versus Low-Intensity Rehabilitation After Total Knee Arthroplasty: A Randomized Controlled Trial", org: "Arthritis Care & Research (Bade et al.)", year: 2017, url: "https://doi.org/10.1002/acr.23139" },
    { title: "Early high-intensity rehabilitation following total knee arthroplasty improves outcomes", org: "Journal of Orthopaedic & Sports Physical Therapy (Bade & Stevens-Lapsley)", year: 2011, url: "https://doi.org/10.2519/jospt.2011.3734" },
    { title: "Early neuromuscular electrical stimulation to improve quadriceps muscle strength after total knee arthroplasty: a randomized controlled trial", org: "Physical Therapy (Stevens-Lapsley et al.)", year: 2012, url: "https://doi.org/10.2522/ptj.20110124" },
    { title: "Effect of Neuromuscular Electrical Stimulation After Total Knee Arthroplasty: A Systematic Review and Meta-Analysis of Randomized Controlled Trials", org: "Frontiers in Medicine (Peng et al.)", year: 2021, url: "https://doi.org/10.3389/fmed.2021.779019" },
    { title: "Improved function from progressive strengthening interventions after total knee arthroplasty: a randomized clinical trial with an imbedded prospective cohort", org: "Arthritis & Rheumatism (Petterson et al.)", year: 2009, url: "https://doi.org/10.1002/art.24167" },
    { title: "Progressive strength training (10 RM) commenced immediately after fast-track total knee arthroplasty: is it feasible?", org: "Disability and Rehabilitation (Jakobsen et al.)", year: 2012, url: "https://doi.org/10.3109/09638288.2011.629019" },
    { title: "Early progressive strength training to enhance recovery after fast-track total knee arthroplasty: a randomized controlled trial", org: "Arthritis Care & Research (Jakobsen et al.)", year: 2014, url: "https://doi.org/10.1002/acr.22405" },
    { title: "Randomized controlled trial of maximal strength training vs. standard rehabilitation following total knee arthroplasty", org: "European Journal of Physical and Rehabilitation Medicine (Husby et al.)", year: 2018, url: "https://doi.org/10.23736/S1973-9087.17.04712-8" },
    { title: "Functional outcomes of outpatient balance training following total knee replacement in patients with knee osteoarthritis: a randomized controlled trial", org: "Clinical Rehabilitation (Liao et al.)", year: 2015, url: "https://doi.org/10.1177/0269215514564086" },
    { title: "Effectiveness of physiotherapy exercise following total knee replacement: systematic review and meta-analysis", org: "BMC Musculoskeletal Disorders (Artz et al.)", year: 2015, url: "https://doi.org/10.1186/s12891-015-0469-6" },
    { title: "Effectiveness of physiotherapy exercise after knee arthroplasty for osteoarthritis: systematic review and meta-analysis of randomised controlled trials", org: "BMJ (Minns Lowe et al.)", year: 2007, url: "https://doi.org/10.1136/bmj.39311.460093.BE" },
    { title: "Efficacy and safety of home-based exercises versus individualized supervised outpatient physical therapy programs after total knee arthroplasty: a systematic review and meta-analysis", org: "Knee Surgery, Sports Traumatology, Arthroscopy (Florez-García et al.)", year: 2017, url: "https://doi.org/10.1007/s00167-016-4231-x" },
    { title: "Rehabilitation for Total Knee Arthroplasty: A Systematic Review", org: "American Journal of Physical Medicine & Rehabilitation (Konnyu et al.)", year: 2023, url: "https://doi.org/10.1097/PHM.0000000000002008" },
    { title: "Effect of Inpatient Rehabilitation vs a Monitored Home-Based Program on Mobility in Patients With Total Knee Arthroplasty: The HIHO Randomized Clinical Trial", org: "JAMA (Buhagiar et al.)", year: 2017, url: "https://doi.org/10.1001/jama.2017.1224" },
    { title: "Targeting rehabilitation to improve outcomes after total knee arthroplasty in patients at risk of poor outcomes: randomised controlled trial", org: "BMJ (Hamilton et al.)", year: 2020, url: "https://doi.org/10.1136/bmj.m3576" },
    { title: "Home-based rehabilitation programme compared with traditional physiotherapy for patients at risk of poor outcome after knee arthroplasty: the CORKA randomised controlled trial", org: "BMJ Open (Barker et al.)", year: 2021, url: "https://doi.org/10.1136/bmjopen-2021-052598" },
    { title: "Effectiveness of intensive rehabilitation on functional ability and quality of life after first total knee arthroplasty: A single-blind randomized controlled trial", org: "Archives of Physical Medicine and Rehabilitation (Moffet et al.)", year: 2004, url: "https://doi.org/10.1016/j.apmr.2003.08.080" },
    { title: "In-Home Telerehabilitation Compared with Face-to-Face Rehabilitation After Total Knee Arthroplasty: A Noninferiority Randomized Controlled Trial", org: "Journal of Bone and Joint Surgery, American volume (Moffet et al.)", year: 2015, url: "https://doi.org/10.2106/JBJS.N.01066" },
    { title: "Clinical outcomes of remote asynchronous telerehabilitation are equivalent to traditional therapy following total knee arthroplasty: A randomized control study", org: "Journal of Telemedicine and Telecare (Bini & Mahajan)", year: 2017, url: "https://doi.org/10.1177/1357633X16634518" },
    { title: "Prehabilitation Improves Knee Functioning Before and Within the First Year After Total Knee Arthroplasty: A Systematic Review With Meta-analysis", org: "Journal of Orthopaedic & Sports Physical Therapy (Gränicher et al.)", year: 2022, url: "https://doi.org/10.2519/jospt.2022.11160" },
    { title: "Continuous passive motion following total knee arthroplasty in people with arthritis", org: "Cochrane Database of Systematic Reviews (Harvey et al.)", year: 2014, url: "https://doi.org/10.1002/14651858.CD004260.pub3" },
    { title: "Cryotherapy following total knee replacement", org: "Cochrane Database of Systematic Reviews (Aggarwal et al.)", year: 2025, url: "https://doi.org/10.1002/14651858.CD007911.pub4" },
    { title: "Should compression bandage be performed after total knee arthroplasty? A meta-analysis of randomized controlled trials", org: "Journal of Orthopaedic Surgery and Research (Liu et al.)", year: 2020, url: "https://doi.org/10.1186/s13018-019-1527-9" },
    { title: "I-ONE therapy in patients undergoing total knee arthroplasty: a prospective, randomized and controlled study", org: "BMC Musculoskeletal Disorders (Moretti et al.)", year: 2012, url: "https://doi.org/10.1186/1471-2474-13-88" },
    { title: "Effect of pulsed electromagnetic field therapy in patients undergoing total knee arthroplasty: a randomised controlled trial", org: "International Orthopaedics (Adravanti et al.)", year: 2014, url: "https://doi.org/10.1007/s00264-013-2216-7" },
    { title: "Effect of Low-Level Laser Therapy on Knee Range of Motion and Functional Abilities After Total Knee Arthroplasty", org: "Cureus (Alghamdi et al.)", year: 2023, url: "https://doi.org/10.7759/cureus.50893" },
    { title: "Early application of extracorporeal shock wave therapy improves pain control and functional scores in patients undergoing total knee arthroplasty: a randomized controlled trial", org: "International Orthopaedics (Martini et al.)", year: 2023, url: "https://doi.org/10.1007/s00264-023-05906-7" },
    { title: "Efficacy of Non-Invasive Radiofrequency-Based Diathermy in the Postoperative Phase of Knee Arthroplasty: A Double-Blind Randomized Clinical Trial", org: "Journal of Clinical Medicine (García-Marín et al.)", year: 2021, url: "https://doi.org/10.3390/jcm10081611" },
    { title: "Efficacy of myofascial trigger point dry needling in the prevention of pain after total knee arthroplasty: a randomized, double-blinded, placebo-controlled trial", org: "Evidence-Based Complementary and Alternative Medicine (Mayoral et al.)", year: 2013, url: "https://doi.org/10.1155/2013/694941" },
    { title: "A pilot study of post-total knee replacement gait rehabilitation using lower limbs robot-assisted training system", org: "European Journal of Orthopaedic Surgery & Traumatology (Li et al.)", year: 2014, url: "https://doi.org/10.1007/s00590-012-1159-9" },
    { title: "Drug-Free Interventions to Reduce Pain or Opioid Consumption After Total Knee Arthroplasty: A Systematic Review and Meta-analysis", org: "JAMA Surgery (Tedesco et al.)", year: 2017, url: "https://doi.org/10.1001/jamasurg.2017.2872" },
    { title: "Electrophysical Agents — Contraindications and Precautions: An Evidence-Based Approach to Clinical Decision Making in Physical Therapy", org: "Physiotherapy Canada (Houghton, Nussbaum & Hoens)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "Early quadriceps strength loss after total knee arthroplasty. The contributions of muscle atrophy and failure of voluntary muscle activation", org: "Journal of Bone and Joint Surgery, American volume (Mizner et al.)", year: 2005, url: "https://doi.org/10.2106/JBJS.D.01992" },
    { title: "Loss of knee-extension strength is related to knee swelling after total knee arthroplasty", org: "Archives of Physical Medicine and Rehabilitation (Holm et al.)", year: 2010, url: "https://doi.org/10.1016/j.apmr.2010.07.229" },
    { title: "Knee joint kinematics in gait and other functional activities measured using flexible electrogoniometry: how much knee motion is sufficient for normal daily life?", org: "Gait & Posture (Rowe et al.)", year: 2000, url: "https://doi.org/10.1016/S0966-6362(00)00060-6" },
    { title: "The role of flexion contracture on outcomes in primary total knee arthroplasty", org: "Journal of Arthroplasty (Ritter et al.)", year: 2007, url: "https://doi.org/10.1016/j.arth.2006.11.009" },
    { title: "International consensus on the definition and classification of fibrosis of the knee joint", org: "Bone & Joint Journal (Kalson et al.)", year: 2016, url: "https://doi.org/10.1302/0301-620X.98B10.37957" },
    { title: "Efficacy of Manipulation Under Anesthesia for Stiffness Following Total Knee Arthroplasty: A Systematic Review", org: "Journal of Arthroplasty (Gu et al.)", year: 2018, url: "https://doi.org/10.1016/j.arth.2017.11.054" },
    { title: "Early manipulation under anaesthesia for stiffness following total knee arthroplasty is associated with a greater gain in knee flexion", org: "Knee Surgery, Sports Traumatology, Arthroscopy (Rahardja et al.)", year: 2023, url: "https://doi.org/10.1007/s00167-022-07128-7" },
    { title: "Outcomes of Early Versus Delayed Manipulation Under Anesthesia for Stiffness Following Total Knee Arthroplasty: A Systematic Review and Meta-Analysis", org: "Journal of Arthroplasty (Akhtar et al.)", year: 2024, url: "https://doi.org/10.1016/j.arth.2024.05.059" },
    { title: "Reproducibility of goniometric measurement of the knee in the in-hospital phase following total knee arthroplasty", org: "BMC Musculoskeletal Disorders (Lenssen et al.)", year: 2007, url: "https://doi.org/10.1186/1471-2474-8-83" },
    { title: "Assessing stability and change of four performance measures: a longitudinal study evaluating outcome following total hip and knee arthroplasty", org: "BMC Musculoskeletal Disorders (Kennedy et al.)", year: 2005, url: "https://doi.org/10.1186/1471-2474-6-3" },
    { title: "Assessing Minimal Detectable Changes and Test-Retest Reliability of the Timed Up and Go Test and the 2-Minute Walk Test in Patients With Total Knee Arthroplasty", org: "Journal of Arthroplasty (Yuksel et al.)", year: 2017, url: "https://doi.org/10.1016/j.arth.2016.07.031" },
    { title: "Meaningful changes for the Oxford hip and knee scores after joint replacement surgery", org: "Journal of Clinical Epidemiology (Beard et al.)", year: 2015, url: "https://doi.org/10.1016/j.jclinepi.2014.08.009" },
    { title: "Responsiveness, Reliability, and Validity of Arabic Version of Oxford Knee Score for Total Knee Arthroplasty", org: "Journal of Bone and Joint Surgery, American volume (Bin Sheeha et al.)", year: 2020, url: "https://doi.org/10.2106/JBJS.19.00949" },
    { title: "The 2018 Definition of Periprosthetic Hip and Knee Infection: An Evidence-Based and Validated Criteria", org: "Journal of Arthroplasty (Parvizi et al.)", year: 2018, url: "https://doi.org/10.1016/j.arth.2018.02.078" },
    { title: "Nerve injury after primary total knee arthroplasty", org: "Journal of Arthroplasty (Schinsky et al.)", year: 2001, url: "https://doi.org/10.1054/arth.2001.26591" },
    { title: "Risk factors for falls in patients with total hip arthroplasty and total knee arthroplasty: a systematic review and meta-analysis", org: "Osteoarthritis and Cartilage (Lo et al.)", year: 2019, url: "https://doi.org/10.1016/j.joca.2019.04.006" },
    { title: "Prevalence and factors associated with undiagnosed type 2 diabetes among adults in Iraq: analysis of cross-sectional data from the 2015 STEPS survey", org: "BMJ Open (Pengpid & Peltzer)", year: 2022, url: "https://doi.org/10.1136/bmjopen-2022-064293" },
    { title: "Ability to kneel after total knee replacement", org: "Journal of Bone and Joint Surgery, British volume (Palmer et al.)", year: 2002, url: "https://doi.org/10.1302/0301-620X.84B2.12568" },
    { title: "Surgery-related predictors of kneeling ability following total knee arthroplasty: a systematic review and meta-analysis", org: "Knee Surgery & Related Research (Nadeem et al.)", year: 2021, url: "https://doi.org/10.1186/s43019-021-00117-z" },
    { title: "After partial knee replacement, patients can kneel, but they need to be taught to do so: a single-blind randomized controlled trial", org: "Physical Therapy (Jenkins et al.)", year: 2008, url: "https://doi.org/10.2522/ptj.20070374" },
    { title: "Activities of daily living in non-Western cultures: range of motion requirements for hip and knee joint implants", org: "International Journal of Rehabilitation Research (Mulholland & Wyss)", year: 2001, url: "https://doi.org/10.1097/00004356-200109000-00004" },
    { title: "Hip, knee, and ankle kinematics of high range of motion activities of daily living", org: "Journal of Orthopaedic Research (Hemmerich et al.)", year: 2006, url: "https://doi.org/10.1002/jor.20114" },
    { title: "Physical Function and Quality of Life and Modification of Authentic Islamic Prayer Procedure by Osteoarthritis Knee Patients in Saudi Arabia: A Cross-sectional Study", org: "Journal of Religion and Health (Ateef et al.)", year: 2021, url: "https://doi.org/10.1007/s10943-019-00878-8" },
    { title: "Primary constrained condylar knee arthroplasty in severe varus deformity: a prospective 5-year functional follow-up study in Iraqi patients", org: "European Journal of Orthopaedic Surgery & Traumatology (Alqatub et al.)", year: 2023, url: "https://doi.org/10.1007/s00590-022-03470-1" },
    { title: "A sleep disturbance after total knee arthroplasty", org: "Journal of Family Medicine and Primary Care (Fatah et al.)", year: 2020, url: "https://doi.org/10.4103/jfmpc.jfmpc_595_19" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 35,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٣٥ دقيقة في الجلسة — المدى والعلاجُ اليدويّ، والتقويةُ المتدرّجة بالأثقال، والتوازنُ والمشيُ والدرج؛ والبرنامجُ المنزليّ يوميّ.",
        "The phased programme and its cards under 'Programme by phase': about 35 minutes per session — range and manual therapy, progressive loaded strengthening, balance, walking and stairs; the home programme is daily."],
      note: ["أساسيٌّ في كلّ جلسة — تدريبُ المشي والتوازن وتناظرِ الحركة التوصيةُ القوية الوحيدة في APTA 2020، والتقويةُ عاليةُ الشدّة المبكّرة متوسّطة، والتمرينُ المشرَف عليه في الشهرين الأوّلين يحسّن الوظيفة (AAOS 2015 — McGrory 2016)؛ والبرنامجُ المنزليّ المنظَّم يقاربه عند المريض المتوسّط (Artz 2015 · Konnyu 2023).",
        "Core in every session — training walking, balance and movement symmetry is the only strong recommendation in APTA 2020, early high-intensity strengthening is moderate, and supervised exercise in the first two months improves function (AAOS 2015 — McGrory 2016); a structured home programme comes close for the average patient (Artz 2015 · Konnyu 2023)."] },
    { code: "electro", centreUse: "core", evidence: "recommended", minutes: 15,
      params: { currentType: "NMES — biphasic symmetrical", frequencyHz: "50", pulseWidthUs: "250", intensity: "Maximal tolerated", onOff: "15 / 45 (3 s ramp)", durationMin: "15" },
      parameters: ["التحفيزُ الكهربائيّ العصبيّ العضليّ لعضلة الفخذ (NMES) كما في تجربة Stevens-Lapsley 2012: قطبان كبيران على مقدّم الفخذ — أسفلُه من الداخل وأعلاه من الخارج — والمريضُ جالسٌ والوركُ مثنيٌّ نحو ٨٥° والركبةُ نحو ٦٠° مثبّتةً بحزام، والعضلةُ مرتخية؛ ١٥ انقباضاً (١٥ ثانية تشغيل منها ٣ تصاعد، و٤٥ إطفاء) بأقصى شدّةٍ يحتملها ترتفع في كلّ جلسة. والتجربةُ مرّتين يومياً ستّة أسابيع من اليوم الثاني — والمركزُ مرّةً في الجلسة ولثلاثة أسابيع على الأقلّ (APTA 2020). وللألم وحده عند الحاجة: تحفيزٌ حسّيّ (TENS) ٨٠–١٠٠ هرتز حول الركبة بدلاً منه.",
        "Neuromuscular electrical stimulation (NMES) of the quadriceps as in the Stevens-Lapsley 2012 trial: two large electrodes on the front of the thigh — distal-medial and proximal-lateral — with the patient seated, hip flexed about 85° and knee about 60°, strapped, and the muscle relaxed; 15 contractions (15 s on including a 3 s ramp, 45 s off) at the maximal tolerated intensity, raised each session. The trial applied it twice daily for six weeks from day two — the centre gives it once per session for at least three weeks (APTA 2020). For pain alone when needed: sensory TENS at 80–100 Hz around the knee instead."],
      note: ["أساسيٌّ هنا في المرحلتين الأولى والثانية — خلافاً لقاعدة المركز العامّة (التحفيزُ مساعد) لأنّ الدليل يوصي به بعد الاستبدال: توصيةٌ متوسّطة في APTA 2020 لقوّة الفخذ والمشي والأداء، وأثرُه أكبر في الشهر الأوّل (Peng 2021)، وأنسبُ المرضى مَن عنده تأخّرُ بسط؛ ولم يُضف شيئاً حين كانت التقويةُ المتدرّجة قويّة (Petterson 2009) — فيُوقف حين يزول تأخّرُ البسط، ولسليم أن يعيده مساعداً. بموافقة الجرّاح، ولا على الدبابيس أو جرحٍ مفتوح، ولا مع جلطةٍ أو شكٍّ فيها، ولا مع منظّم ضربات القلب؛ ويجوز على جلدٍ سليمٍ فوق المفصل المعدنيّ (Houghton 2010).",
        "Core here in phases 1 and 2 — unlike the centre's general rule (stimulation as an adjunct) because the evidence recommends it after replacement: a moderate recommendation in APTA 2020 for quadriceps strength, gait and performance, with the largest effect in the first month (Peng 2021), best suited to patients with an extensor lag; it added nothing when progressive strengthening was intense (Petterson 2009) — so it stops once the lag resolves, and Saleem may return it to an adjunct. With the surgeon's agreement, not over clips or an open wound, not with a known or suspected clot, and not with a pacemaker; it may be used on intact skin over the metal implant (Houghton 2010)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "75", intensityMt: "1.5", durationMin: "20–30" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الركبة قبل التمارين، بلا حرارة — والقيمُ من التجربتين (٧٥ هرتز، ١٫٥ ملّي تسلا).",
        "Pulsed electromagnetic field (PEMF) around the knee before exercise, non-thermal — the values are those of the two trials (75 Hz, 1.5 mT)."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). والدليلُ ضعيفٌ جدّاً: تجربتان صغيرتان (Moretti 2012 · Adravanti 2014) بجهازٍ منزليّ ٤ ساعاتٍ يومياً ستّين يوماً خفّفتا الألمَ والتورّم، ومن مؤلّفيهما موظّفون في الشركة المصنِّعة؛ فجلسةٌ في المركز ليست الجرعةَ المختبَرة، ولا توصي به أيُّ إرشادات. لا يُعطى بدل التمرين، وممنوعٌ مع منظّم ضربات القلب.",
        "Rotating adjunct — used by the centre (Saleem). The evidence is very weak: two small trials (Moretti 2012 · Adravanti 2014) of a home device used 4 hours a day for 60 days reduced pain and swelling, with manufacturer employees among the authors; a session in the centre is not the tested dose, and no guideline recommends it. Never instead of exercise, and contraindicated with a pacemaker."] },
    { code: "hot_pack", centreUse: "adjunct", evidence: "optional", minutes: 10,
      params: { temperatureC: "70–75", layers: "6–8", durationMin: "10–15" },
      parameters: ["في المرحلة الثالثة وحدها: حول الركبة قبل تمطيط الثني حين هدأ التورّمُ والتأم الجرحُ وسلم الإحساس، ويُفحص الجلدُ قبلها وبعدها.",
        "Phase 3 only: around the knee before flexion stretching once swelling has settled, the wound has healed and sensation is intact; check the skin before and after."],
      note: ["مساعدٌ للمرحلة الثالثة وحدها — لا دراسةَ للحرارة السطحية بعد الاستبدال؛ وهي ممنوعةٌ في المرحلتين الأولى والثانية (نسيجٌ ملتهب، ونزفٌ، وجلطةٌ محتملة) ومع ضعف الإحساس (Houghton 2010)، والمفصلُ المعدنيّ عميقٌ فخطرُه ضئيل.",
        "Adjunct for phase 3 only — there is no study of superficial heat after replacement; it is contraindicated in phases 1 and 2 (inflamed tissue, bleeding, possible clot) and with reduced sensation (Houghton 2010), and the deep metal implant carries negligible risk."] },
    { code: "tecar", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم بعد الاستبدال — لا تجربةَ للتيكار (السعويّ والمقاوِم) بعد الاستبدال، والتجربةُ الوحيدة بالموجات الراديوية كانت بجهازٍ أحاديّ القطب، وكتب مؤلّفوها أنّ الاستعمالَ ثنائيّ القطب لا يُنصح به مع المعادن المزروعة (García-Marín 2021) — وجهازُ المركز يعمل بلوحٍ مرتدّ؛ وهو حراريٌّ يُتجنَّب مع التورّم الحادّ. فإن أراده سليمٌ لاحقاً فبدليل الشركة المصنِّعة لجهاز المركز عن المعادن المزروعة، وبعيداً عن المفصل.",
        "Not used after replacement — there is no trial of capacitive-resistive Tecar after replacement; the only radiofrequency trial used a monopolar device, and its authors wrote that bipolar use is not recommended with implanted metal (García-Marín 2021) — the centre's device works with a return plate; it also heats and is avoided with acute swelling. If Saleem wants it later, it follows the centre's device manufacturer's guidance on metal implants, away from the joint."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — APTA 2020: لا يستعمله المعالجون بعد الاستبدال الأوّليّ غير المعقّد، وAAOS 2015 «دليلٌ قويّ» أنّه لا يحسّن النتائج (McGrory 2016)، وCochrane (Harvey 2014): درجتان من الثني بلا أثرٍ مهمّ على الألم والوظيفة.",
        "Not used — APTA 2020: therapists should not use it after primary uncomplicated replacement, AAOS 2015 found strong evidence that it does not improve outcomes (McGrory 2016), and Cochrane (Harvey 2014): two degrees of flexion with no important effect on pain or function."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم للتورّم في العيادة — دورُ الضغط الهوائيّ الوقايةُ من الجلطة في المستشفى بوصف الجرّاح (NICE NG89)، ولا تجربةَ له على التورّم خارج المستشفى، والرباطُ الضاغط لم يُفد التورّمَ ولا المدى (Liu 2020)؛ ولا يُضغط على ساقٍ متورّمة قبل استبعاد الجلطة.",
        "Not used for swelling in the clinic — pneumatic compression's role is clot prevention in hospital as prescribed by the surgeon (NICE NG89), there is no outpatient trial for swelling, and compression bandaging did not help swelling or range (Liu 2020); a swollen leg is never compressed before a clot is ruled out."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم (لم يذكره). والدليلُ ضعيف: تجربةٌ مصريّة صغيرة (Alghamdi 2023) حسّنت الثنيَ والوظيفة بـ٦٥٠ نانومتر و٦ جول/سم² لكلّ نقطة × ٨ نقاط (٤٨ جول في الجلسة) و١٢ جلسة في ستّة أسابيع — فإن قرّر سليمٌ استعمالَه صار مساعداً بهذه الإعدادات، ولا على جلطةٍ أو نزفٍ أو العينين (Houghton 2010).",
        "Not used until Saleem decides (not mentioned by him). The evidence is weak: a small Egyptian trial (Alghamdi 2023) improved flexion and function with 650 nm, 6 J/cm² per point × 8 points (48 J per session) and 12 sessions over six weeks — if Saleem chooses it, it becomes an adjunct at these settings, never over a clot, bleeding or the eyes (Houghton 2010)."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا تجربةَ له بعد الاستبدال خارج المستشفى، والمستمرُّ لا يُعطى على نسيجٍ ملتهب (Houghton 2010).",
        "Not used (not mentioned by Saleem) — there is no outpatient trial after replacement, and continuous ultrasound is not applied to inflamed tissue (Houghton 2010)."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — تجربةٌ واحدة في الأسبوع الأوّل داخل المستشفى (Martini 2023)، ولا تجربةَ له لتيبّس الركبة بعد الاستبدال؛ فالتيبّسُ يُحال إلى الجرّاح.",
        "Not used — a single trial in the first week in hospital (Martini 2023), and no trial for knee stiffness after replacement; stiffness is referred to the surgeon."] },
    { code: "needle", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم روتينياً — التجربةُ الوحيدة جلسةٌ تحت التخدير قبل العملية (Mayoral 2013)، ولا تجربةَ بعدها في العيادة؛ ويُنظر فيها لألمٍ عضليّ مستمرّ بعد التئام الجرح بموافقة الجرّاح، بعيداً عن الجرح ومحفظة المفصل، مع الانتباه لمميّع الدم.",
        "Not used routinely — the only trial was one session under anaesthesia before surgery (Mayoral 2013), with no outpatient trial after it; it may be considered for persistent muscular pain after the wound has healed, with the surgeon's agreement, away from the wound and joint capsule, and with attention to blood thinners."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ صغيرة (Li 2014) حسّنت التوازنَ والمشي، وتعدّه APTA 2020 من تدريب المشي مع التنبيه إلى كلفته؛ وأكثرُ مرضى الاستبدال يمشون بالمشّاية، فيُنظر فيه لمن ضعف مشيُه أو توازنُه بعد المرحلة الأولى.",
        "Not used until Saleem decides — a small trial (Li 2014) improved balance and gait, and APTA 2020 counts it within gait training while noting its cost; most replacement patients walk with a frame, so it may be considered for those whose gait or balance remains poor after phase 1."] },
  ],
  phases: [
    {
      name: ["الحماية والتنشيط واستعادة الحركة", "Protection, activation and restoring movement"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["نحو الأسبوعين ٢–٣ بعد العملية", "About post-op weeks 2–3"],
      goals: [
        "جرحٌ نظيفٌ يلتئم، وتورّمٌ وألمٌ أقلّ؛ ثنيٌ ٩٠° فأكثر ونقصُ بسطٍ ١٠° أو أقلّ؛ عضلةُ فخذٍ تنقبض جيّداً ورفعُ الساق بلا تأخّر بسط؛ مشيٌ آمن بالمشّاية أو العكّازين بخطوتين متساويتين؛ انتقالٌ مستقلّ (السريرُ والكرسيّ والمرحاضُ والسيارة) ودرجٌ بالأداة؛ وبرنامجٌ منزليٌّ يوميّ والكمادةُ الباردة.",
        "A clean, healing wound and less swelling and pain; 90° or more of flexion and an extension deficit of 10° or less; a good quadriceps contraction and a straight-leg raise without lag; safe walking with a frame or crutches with equal steps; independent transfers (bed, chair, toilet and car) and stairs with the aid; and a daily home programme with the cold pack.",
      ],
      education: [
        "• التورّمُ والدفءُ في الركبة طبيعيّان أسابيعَ وقد يبقيان أشهراً؛ أمّا ألمُ بطن الساق، وضيقُ النفس، وإفرازُ الجرح أو احمرارُه الممتدّ، والحمّى — فتُبلَّغ فوراً.\n" +
        "• مميّعُ الدم يُؤخذ كما وصفه الجرّاح حتى آخر يوم.\n" +
        "• البسطُ أوّلاً: لا وسادةَ تحت الركبة في الراحة بعد الأسبوع الأوّل — الكعبُ على وسادةٍ والركبةُ ممدودة (وفي الأيّام السبعة الأولى قد يُريحها الجرّاحُ مثنيّةً قليلاً — توصيةٌ ضعيفة في APTA 2020).\n" +
        "• الكمادةُ الباردة ١٠–١٥ دقيقة بعد التمارين، ورفعُ الساق.\n" +
        "• الألمُ المقبول: حتى ٥ من ١٠ أثناء التمرين إن هدأ في ساعتين؛ ومسكّنُ الجرّاح قبل الجلسة بوقتٍ كافٍ.\n" +
        "• الدرج: الصعودُ بالسليمة والنزولُ بالمعمولة؛ والعصا في اليد المقابلة.\n" +
        "• الصلاةُ على الكرسيّ في هذه الأسابيع، والوضوءُ جالساً، والجرحُ جافٌّ كما يوصي الجرّاح حتى يلتئم.\n" +
        "• البرنامجُ المنزليّ مرّتين يومياً — والتمارينُ في البيت نصفُ العلاج.",
        "• Swelling and warmth in the knee are normal for weeks and may last months; calf pain, breathlessness, wound discharge or spreading redness, and fever are reported at once.\n" +
        "• The blood thinner is taken as the surgeon prescribed, to the last day.\n" +
        "• Extension first: no pillow under the knee at rest after the first week — the heel on a pillow with the knee straight (in the first seven days the surgeon may rest it slightly bent — a weak recommendation in APTA 2020).\n" +
        "• The cold pack for 10–15 minutes after exercise, with the leg raised.\n" +
        "• Acceptable pain: up to 5/10 during exercise if it settles within two hours; take the surgeon's painkiller in good time before the session.\n" +
        "• Stairs: up with the good leg, down with the operated one; the cane in the opposite hand.\n" +
        "• Pray on a chair during these weeks, do ablution seated, and keep the wound dry as the surgeon advises until it heals.\n" +
        "• The home programme twice a day — exercise at home is half the treatment.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الجرحُ مغلقٌ جافّ بلا علامات التهاب.\n" +
        "• ثنيٌ فعّال ٩٠° فأكثر، ونقصُ بسطٍ ١٠° أو أقلّ.\n" +
        "• رفعُ الساق مستقيمةً ١٠ مرّات بلا تأخّر بسط — وإلّا يستمرّ التحفيز.\n" +
        "• ألمُ الراحة تحت ٥ من ١٠، والتورّمُ لا يزيد (المحيطُ لم يرتفع ٢ سم بين جلستين).\n" +
        "• مجموعتان × ٨ من تمارين المرحلة بلا تعب.\n" +
        "• انتقالٌ مستقلّ، ومشيٌ بالأداة.\n" +
        "(مبنيّةٌ على معالم Bade 2011.) وإن لم يتحقّق ذلك بعد الجلسة الثامنة، أو كان الثنيُ تحت ٩٠° نحو الأسبوع السادس ⟵ يُبلَّغ الجرّاح.",
        "Progress to phase 2 when all are met:\n" +
        "• The wound is closed and dry without signs of infection.\n" +
        "• Active flexion of 90° or more, and an extension deficit of 10° or less.\n" +
        "• 10 straight-leg raises without extensor lag — otherwise NMES continues.\n" +
        "• Resting pain under 5/10, and swelling not increasing (girth not up 2 cm between sessions).\n" +
        "• 2 × 8 of the phase exercises without fatigue.\n" +
        "• Independent transfers, and walking with the aid.\n" +
        "(Built on the Bade 2011 milestones.) If not achieved by session 8, or flexion is under 90° at about week 6 → tell the surgeon.",
      ],
      notes: [
        "• التحفيزُ الكهربائيّ لعضلة الفخذ (إعداداتُه في «الأجهزة»): ١٥ انقباضاً بأقصى شدّةٍ يحتملها، والمريضُ جالسٌ والعضلةُ مرتخية، والأقطابُ بعيدةٌ عن الجرح والدبابيس — بموافقة الجرّاح، ولثلاثة أسابيع على الأقلّ (APTA 2020).\n" +
        "• العلاجُ اليدويّ ١٠–١٥ دقيقة قبل تمارين المدى: تحريكُ الرضفة، والتحريكُ السلبيّ للثني والبسط، والأنسجةُ الرخوة للفخذ وخلف الركبة (Bade 2017) — ثمّ تمرينٌ في المدى الجديد.\n" +
        "• التقويةُ المبكّرة آمنة: لم تزد التورّمَ ولا ألمَ الراحة (Jakobsen 2012)؛ فثقلُ الكاحل في مدّ الركبة جالساً ورفعِ الساق حين يأذن الجرح، والتقدّمُ بقاعدة التوقّف.\n" +
        "• المدى في البيت: ٣٠ دقيقةً في اليوم موزّعة، ثباتاً في آخر الثني وآخر البسط، حتى يبلغ ٠–١٢٠° (Bade 2017).\n" +
        "• المشي: تناظرُ الخطوتين ووقتُ الوقوف على كلّ ساق، ونقلُ الوزن بالتساوي أمام المرآة — تدريبُ تناظر الحركة توصيةٌ قوية (APTA 2020).\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب (المؤشَّرُ لهذا المريض)، وقبل التمارين لا بدلها.",
        "• NMES of the quadriceps (settings under 'Devices'): 15 contractions at the maximal tolerated intensity, the patient seated and the muscle relaxed, electrodes away from the wound and clips — with the surgeon's agreement, for at least three weeks (APTA 2020).\n" +
        "• Manual therapy for 10–15 minutes before range exercises: patellar mobilisation, passive motion into flexion and extension, and soft tissue to the thigh and back of the knee (Bade 2017) — then exercise in the new range.\n" +
        "• Early strengthening is safe: it did not increase swelling or resting pain (Jakobsen 2012); an ankle weight on seated knee extension and the straight-leg raise once the wound allows, progressing by the hold rule.\n" +
        "• Range at home: 30 minutes a day in small bouts, holding at end-range flexion and end-range extension, until 0–120° is reached (Bade 2017).\n" +
        "• Walking: equal steps and equal stance time on each leg, and even weight shifting in front of a mirror — training movement symmetry is a strong recommendation (APTA 2020).\n" +
        "• One adjunct device per session in rotation (those ticked for this patient), before exercise and never instead of it.",
      ],
      exercises: [
        { code: "ankle-pumps" },
        { code: "quad-set", note: ["قبل رفع الساق، ومع التحفيز إن بقي تأخّرُ البسط.", "Before the straight-leg raise, and alongside NMES if the lag persists."] },
        { code: "heel-prop", note: ["الأولويةُ في هذه المرحلة — ثلاثَ مرّاتٍ يومياً حتى يكتمل البسط.", "The priority in this phase — three times daily until extension is full."] },
        { code: "heel-slide" },
        { code: "seated-knee-flexion-slide" },
        { code: "patellar-self-mobilisation" },
        { code: "straight-leg-raise", sets: 2, doseNote: ["يومياً — ٢ × ١٠ بلا ثقل، والركبةُ مستقيمة طوالَ الرفع.", "Daily — 2 × 10 without weight, the knee straight throughout."],
          note: ["إن انثنت الركبةُ عند الرفع: شدُّ الفخذ أوّلاً ثمّ الرفع، والتحفيزُ قبلها.", "If the knee bends as it lifts: tighten the thigh first, then lift, with NMES beforehand."] },
        { code: "seated-knee-extension", sets: 2, doseNote: ["يومياً — ٢ × ١٠ بلا ثقل، ثمّ بثقلٍ خفيف على الكاحل حين يأذن الجرح.", "Daily — 2 × 10 without weight, then a light ankle weight once the wound allows."] },
        { code: "sit-to-stand", sets: 2, reps: 8, doseNote: ["٢ × ٨ من مقعدٍ عالٍ، واليدان على المسندين عند الحاجة.", "2 × 8 from a high seat, hands on the armrests when needed."],
          note: ["الوزنُ على الساقين بالتساوي — لا يقوم على السليمة وحدها.", "Weight evenly on both legs — not rising on the good leg alone."] },
        { code: "standing-weight-shift", note: ["إلى الساق المعمولة أمام المرآة، حتى يتساوى الوزنُ على الساقين.", "Onto the operated leg in front of a mirror, until weight is equal on both legs."] },
        { code: "walking-aid-gait" },
        { code: "stairs-after-knee-surgery" },
        { code: "car-transfer" },
        { code: "cold-elevation" },
      ],
    },
    {
      name: ["التقوية المتدرّجة والمدى والتوازن", "Progressive strengthening, range and balance"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["نحو الأسابيع ٣–٥ بعد العملية", "About post-op weeks 3–5"],
      goals: [
        "ثنيٌ ١٠٥–١١٠° فأكثر ونقصُ بسطٍ ٥° أو أقلّ (والهدفُ صفر)؛ قوّةٌ تتقدّم بالأثقال (مجموعتان × ٨ بثقلٍ يتعب في ٨)؛ توازنٌ على ساقٍ واحدة؛ مشيٌ في البيت بلا أداة وبلا عرجٍ واضح؛ درجٌ درجةً بعد درجة بالدرابزين؛ ومشيٌ متّصلٌ يطول نحو ٢٠–٣٠ دقيقة.",
        "Flexion of 105–110° or more and an extension deficit of 5° or less (target zero); strength progressing with load (2 × 8 at a load that tires in 8); single-leg balance; walking at home without an aid or an obvious limp; step-over-step stairs with the rail; and continuous walking building towards 20–30 minutes.",
      ],
      education: [
        "• الفخذُ يفقد نحو ٦٠٪ من قوّته في الشهر الأوّل (Mizner 2005) ولا يعود وحده — الأثقالُ هي العلاج، وتعبُ الفخذ علامةُ عملٍ صحيح.\n" +
        "• قاعدةُ التوقّف تحكم الزيادةَ لا الخوف: الألمُ الذي يهدأ في ساعتين بلا تورّمٍ ولا نقصٍ في المدى مقبول.\n" +
        "• الأداةُ تُترك حين يمشي بلا عرج: العكّازان ثمّ العصا في الشارع ثمّ لا شيء.\n" +
        "• المشيُ يومياً يطول حتى ٣٠ دقيقة متّصلة خمسةَ أيّامٍ في الأسبوع (Bade 2017).\n" +
        "• الندبة: تدليكُها حين يلتئم الجرح تماماً.\n" +
        "• القيادةُ والعودةُ إلى العمل بإذن الجرّاح.",
        "• The thigh loses about 60% of its strength in the first month (Mizner 2005) and does not recover on its own — load is the treatment, and a tired thigh is a sign of correct work.\n" +
        "• The hold rule, not fear, governs progression: pain that settles within two hours without swelling or lost range is acceptable.\n" +
        "• The aid is dropped once walking without a limp: crutches, then a cane outdoors, then nothing.\n" +
        "• Daily walking builds to 30 continuous minutes five days a week (Bade 2017).\n" +
        "• The scar: massage it once the wound has fully healed.\n" +
        "• Driving and return to work with the surgeon's permission.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• ثنيٌ فعّال ١٠٥–١١٠° فأكثر (Rowe 2000)، ونقصُ بسطٍ ٥° أو أقلّ.\n" +
        "• ألمُ الراحة تحت ٣ من ١٠ (Bade 2011).\n" +
        "• مشيٌ في البيت بلا أداة وبلا عرجٍ واضح (والعصا في الشارع مقبولة).\n" +
        "• درجٌ درجةً بعد درجة صعوداً ونزولاً بالدرابزين.\n" +
        "• «النهوض والمشي» تحسّن ٢٫٣–٢٫٥ ثانية فأكثر عن التقييم الأوّل (فوق أدنى تغيّرٍ حقيقيّ — Yuksel 2017 · Kennedy 2005).\n" +
        "• مجموعتان × ٨ بثقلٍ يتعب في ٨ بلا علامات توقّف.\n" +
        "وإن توقّف تحسّنُ الثني أسبوعين بعد الأسبوع الرابع، أو كان تحت ٩٠° أو نقصُ البسط فوق ١٠° نحو الأسبوع السادس ⟵ يُبلَّغ الجرّاحُ الآن، فنافذةُ التحريك تحت التخدير تُغلق نحو الأسبوع الثاني عشر.",
        "Progress to phase 3 when all are met:\n" +
        "• Active flexion of 105–110° or more (Rowe 2000), and an extension deficit of 5° or less.\n" +
        "• Resting pain under 3/10 (Bade 2011).\n" +
        "• Walking at home without an aid or an obvious limp (a cane outdoors is acceptable).\n" +
        "• Step-over-step stairs up and down with the rail.\n" +
        "• Timed Up and Go improved by 2.3–2.5 s or more from the first assessment (beyond the minimal detectable change — Yuksel 2017 · Kennedy 2005).\n" +
        "• 2 × 8 at a load that tires in 8 without hold signs.\n" +
        "If flexion stalls for two weeks after week 4, or is under 90° or the extension deficit is over 10° at about week 6 → tell the surgeon now, because the window for manipulation under anaesthesia closes at about week 12.",
      ],
      notes: [
        "• التقويةُ المتدرّجة (Bade 2011 · Bade 2017): البدءُ مجموعتين × ٨–١٠ بثقل الكاحل، والانتقالُ إلى الأجهزة حين لا يُتعب ثقلُ الكاحل، والثقلُ يزيد كلّما سهل؛ وللقادر ٤ × ٥ بثقلٍ ثقيل (Husby 2018): زادت القوّةُ ٣٧–٤٣٪ ولم يتغيّر المشيُ ستّ دقائق.\n" +
        "• التحفيزُ يستمرّ ما دام تأخّرُ البسط باقياً، ولم يُضف شيئاً حين كانت التقويةُ المتدرّجة قويّة (Petterson 2009) — فيُوقف حين يُرفع الساقُ بلا تأخّر.\n" +
        "• التوازن: الوقوفُ على ساقٍ واحدة، والمشيُ جانباً، ونقلُ الوزن — حسّن التوازنَ والحركة فوق البرنامج الوظيفيّ وحده (Liao 2015).\n" +
        "• الدرّاجة: نصفُ دورةٍ ذهاباً وإياباً ثمّ دورةٌ كاملة حين يبلغ الثنيُ نحو ١٠٠–١١٠° — للمدى والتحمّل لا تمريناً أساسياً (لم تُضف شيئاً في Artz 2015).\n" +
        "• التمطيطُ من الأسبوع الخامس: مقدّمُ الفخذ وخلفُه والساق، ٣ × دقيقة يومياً (Bade 2017).\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب، وقبل التمارين لا بدلها.",
        "• Progressive strengthening (Bade 2011 · Bade 2017): start with 2 × 8–10 using an ankle weight, move to machines when the ankle weight no longer tires, and increase the load whenever it becomes easy; for the able, 4 × 5 with a heavy load (Husby 2018): strength rose 37–43% while the six-minute walk did not change.\n" +
        "• NMES continues while the extensor lag persists, and added nothing when progressive strengthening was intense (Petterson 2009) — so it stops once the leg lifts without lag.\n" +
        "• Balance: single-leg standing, side-stepping and weight shifting — improved balance and mobility beyond the functional programme alone (Liao 2015).\n" +
        "• Cycling: half-turns back and forth, then full revolutions once flexion reaches about 100–110° — for range and endurance, not a core exercise (it added nothing in Artz 2015).\n" +
        "• Stretching from week 5: front and back of the thigh and the calf, 3 × 1 minute daily (Bade 2017).\n" +
        "• One adjunct device per session in rotation, before exercise and never instead of it.",
      ],
      exercises: [
        { code: "terminal-knee-extension" },
        { code: "leg-press-progressive" },
        { code: "seated-knee-extension", sets: 2, reps: 8, doseNote: ["يوماً بعد يوم — ٢ × ٨ بثقلٍ على الكاحل يتعب في ٨، يزيد كلّما سهل.", "Alternate days — 2 × 8 with an ankle weight that tires in 8, increased whenever easy."] },
        { code: "sit-to-stand", sets: 2, reps: 10, doseNote: ["٢ × ١٠ من مقعدٍ أخفض، بلا يدين حين يستطيع.", "2 × 10 from a lower seat, without the hands once able."] },
        { code: "step-up", sets: 2, reps: 10, doseNote: ["يوماً بعد يوم — ٢ × ١٠ على درجةٍ ١٠ سم ثمّ ١٥–٢٠.", "Alternate days — 2 × 10 on a 10 cm step, then 15–20."] },
        { code: "side-lying-hip-abduction" },
        { code: "glute-bridge" },
        { code: "calf-raise" },
        { code: "single-leg-balance" },
        { code: "side-stepping" },
        { code: "knee-flexion-step-stretch" },
        { code: "scar-mobilisation" },
        { code: "stationary-cycling", doseNote: ["١٠ دقائق إحماءً بلا مقاومة: نصفُ دورةٍ أوّلاً ثمّ دورةٌ كاملة.", "10 minutes' warm-up without resistance: half-turns first, then full revolutions."] },
        { code: "graded-walking", doseNote: ["يومياً، يطول حتى ٢٠–٣٠ دقيقة متّصلة.", "Daily, building to 20–30 continuous minutes."] },
        { code: "heel-prop", note: ["لمن بقي نقصُ بسطه فوق ٥°.", "For those whose extension deficit is still over 5°."] },
      ],
    },
    {
      name: ["الوظيفة والتحمّل والركوع والعودة", "Function, endurance, kneeling and return"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["نحو الأسابيع ٥–٧ بعد العملية", "About post-op weeks 5–7"],
      goals: [
        "ثنيٌ ١١٠–١١٥° فأكثر (و١٢٠° لمن هدفُه الأرض أو الصلاةُ عليها) وبسطٌ ٠–٥°؛ مشيٌ في الشارع بلا أداة ٣٠ دقيقة متّصلة؛ درجٌ درجةً بعد درجة بلا درابزين؛ نزولُ الدرجة بتحكّم؛ ركوعٌ على وسادة ونزولٌ إلى الأرض وقيامٌ منها إن كان هدفاً؛ واستقلالٌ في البرنامج المنزليّ.",
        "Flexion of 110–115° or more (120° when the floor or praying on it is a goal) and extension of 0–5°; 30 minutes of continuous outdoor walking without an aid; step-over-step stairs without the rail; controlled stepping down; kneeling on a cushion and getting down to and up from the floor where this is a goal; and independence in the home programme.",
      ],
      education: [
        "• التحسّنُ يستمرّ أشهراً بعد الخروج — والبرنامجُ المنزليّ يستمرّ ثلاثةَ أشهرٍ على الأقلّ، ثمّ نشاطٌ منتظم مدى الحياة (المشي، والدرّاجة، والسباحة).\n" +
        "• الركوعُ على وسادة يُتدرَّب عليه؛ والقرفصاءُ الكاملة والتربّعُ غالباً لا يُبلَغان — والبدائل: الكرسيّ، ومقعدٌ منخفضٌ ثابت، والصلاةُ على الكرسيّ رخصة.\n" +
        "• الوزن: كلُّ كيلوغرامٍ أقلّ يخفّف الحملَ على المفصل الجديد.\n" +
        "• يعود إلى الجرّاح في أيّ وقتٍ — ولو بعد سنوات — مع احمرارٍ أو سخونةٍ أو إفرازٍ أو حمّى، أو ألمٍ جديد، أو عدمِ ثبات.\n" +
        "• العودةُ إلى العمل والقيادة بإذن الجرّاح.",
        "• Improvement continues for months after discharge — the home programme continues for at least three months, then regular lifelong activity (walking, cycling, swimming).\n" +
        "• Kneeling on a cushion is practised; full squatting and cross-legged sitting are usually out of reach — the alternatives are a chair, a low firm stool, and praying on a chair is permitted.\n" +
        "• Weight: every kilogram less reduces the load on the new joint.\n" +
        "• Return to the surgeon at any time — even years later — with redness, warmth, discharge or fever, new pain, or instability.\n" +
        "• Return to work and driving with the surgeon's permission.",
      ],
      criteria: [
        "الخروجُ في الجلسة ٢٤ حين تتحقّق:\n" +
        "• ثنيٌ ١١٠–١١٥° فأكثر (و١٢٠° لمن هدفُه الأرض)، وبسطٌ ٠–٥°.\n" +
        "• مشيٌ في الشارع بلا أداة، ودرجٌ درجةً بعد درجة.\n" +
        "• «النهوض والمشي» و«الجلوس والوقوف ٣٠ ثانية» تحسّنا فوق أدنى تغيّرٍ حقيقيّ، ومقياسُ أكسفورد بالعربية +٧ إن قيس (Beard 2015).\n" +
        "• يؤدّي برنامجَه المنزليّ وحده.\n" +
        EXTEND_AR,
        "Discharge at session 24 when met:\n" +
        "• Flexion of 110–115° or more (120° when the floor is a goal), and extension of 0–5°.\n" +
        "• Outdoor walking without an aid, and step-over-step stairs.\n" +
        "• Timed Up and Go and the 30-second chair stand improved beyond the minimal detectable change, and the Arabic Oxford Knee Score +7 if measured (Beard 2015).\n" +
        "• Does the home programme alone.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• التمارينُ اللامركزية (النزولُ من الدرجة والقرفصاءُ الجزئية) بعد معايير المرحلة الثالثة (Bade 2011).\n" +
        "• الركوع: بعد التئام الجرح والثنيِ ٩٠° فأكثر، على وسادةٍ سميكة، والسليمةُ أوّلاً — جلسةُ تعليمٍ وتدريبٍ واحدة حسّنت الركوعَ بعد سنة (Jenkins 2008 — في الاستبدال الجزئيّ)، وكثيرون يستطيعونه حين يجرّبون (Palmer 2002).\n" +
        "• الحرارةُ السطحية قبل التمطيط جائزةٌ الآن إن هدأ التورّمُ وسلم الإحساس — مساعدٌ لا أكثر.\n" +
        "• القياسُ الختاميّ: المقاييسُ نفسُها بالمقيِّم نفسِه، وورقةُ تمارين البيت.\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب، وقبل التمارين لا بدلها.",
        "• Eccentric work (stepping down and partial squats) after the phase 3 criteria (Bade 2011).\n" +
        "• Kneeling: once the wound has healed and flexion is 90° or more, on a thick cushion, good knee first — one teaching and practice session improved kneeling at one year (Jenkins 2008 — in partial replacement), and many can kneel when they try (Palmer 2002).\n" +
        "• Superficial heat before stretching is allowed now if swelling has settled and sensation is intact — an adjunct, no more.\n" +
        "• Final measurement: the same measures by the same assessor, and the home exercise sheet.\n" +
        "• One adjunct device per session in rotation, before exercise and never instead of it.",
      ],
      exercises: [
        { code: "lateral-step-down" },
        { code: "step-up", note: ["درجةٌ أعلى (٢٠ سم)، ثمّ بحمل كيسٍ خفيف.", "A higher step (20 cm), then carrying a light bag."] },
        { code: "wall-squat", note: ["حتى ٦٠° لا أعمق، والركبتان فوق القدمين.", "To 60°, no deeper, with the knees over the feet."] },
        { code: "sit-to-stand", sets: 3, reps: 10, doseNote: ["٣ × ١٠ من كرسيٍّ عاديّ بلا يدين — ويُقاس بالجلوس والوقوف ٣٠ ثانية.", "3 × 10 from an ordinary chair without the hands — measured by the 30-second chair stand."] },
        { code: "leg-press-progressive", note: ["الساقُ المعمولة وحدها، والثقلُ يزيد كلّما سهل.", "The operated leg alone, with the load increased whenever it becomes easy."] },
        { code: "single-leg-balance", note: ["على سطحٍ أليَن أو والعينان مغمضتان حين يسهل.", "On a softer surface or with eyes closed once easy."] },
        { code: "obstacle-dual-task-walking" },
        { code: "graded-walking", doseNote: ["٣٠ دقيقة متّصلة خمسةَ أيّامٍ في الأسبوع، وفي الشارع.", "30 continuous minutes five days a week, outdoors."] },
        { code: "stairs-after-knee-surgery", note: ["درجةً بعد درجة بلا درابزين، ثمّ بحمل كيس.", "Step over step without the rail, then carrying a bag."] },
        { code: "kneeling-floor-transfer" },
        { code: "knee-flexion-step-stretch", note: ["لمن هدفُه ١٢٠° أو أكثر.", "For those aiming at 120° or more."] },
        { code: "hamstring-stretch-seated" },
        { code: "calf-stretch-standing" },
        { code: "stationary-cycling", doseNote: ["١٥–٢٠ دقيقة بمقاومةٍ خفيفة تزيد.", "15–20 minutes with light, increasing resistance."] },
      ],
    },
  ],
};

export const name = "138_physio_tka_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
