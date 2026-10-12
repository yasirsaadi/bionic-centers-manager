// Migration 136: تأهيلُ ما قبل الطرف الصناعيّ السفليّ — البروتوكولُ التاسع مفصَّلاً (§4.du — ٢٠٢٦-١٠-١٢).
//
// **بقرار المالك تتقدّم بروتوكولاتُ الأطراف** («نعم انت محق فالاطراف مهمة ايضا» — ٢٠٢٦-١٠-١٢): المشيُ بالطرف (١٣٥)، ثمّ هذا، ثمّ بترُ الطرف العلويّ.
// `lower-limb-preprosthetic-adult` **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة، وثلاثُ مراحل بنطاقاتٍ (١–٦ · ٧–١٦ · ١٧–٢٤) ومعايير
// انتقالٍ رقمية، **والخروجُ بمعايير الجاهزية للقالب لا بالعدد** — ويمتدّ بستِّ جلساتٍ في كلّ مرّة حتى نحو ٤٨ حين لا تتحقّق (مكتوبٌ في المرحلة الثالثة).
// إحدى عشرةَ بطاقةً جديدة (اثنتا عشرةَ صورةً مطلوبة) وإحدى عشرةَ بطاقةً معادة بصورها — بقاعدة المالك «لا تطلب صوراً مكرّرة»؛ ومنها بطاقتا الانبطاح والنهوض
// من الأرض من البروتوكول الثامن، وما يخصّ الجذعَ في البطاقات المشتركة مكتوبٌ في ملاحظة المرحلة. والأجهزةُ الأحدَ عشر بدرجة دليلها و«استعمال المركز»،
// والمقاييسُ كما زُرعت (محيطُ الجذع · بسطُ الورك · AMPnoPRO · الألمُ الشبحيّ). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ ما قبل الطرف**: الأدلّةُ متّفقةٌ على ما يُفعل (VA/DoD 2024 · BACPAR الطبعة الثالثة 2025 · WHO 2023) ودليلُها كلُّه منخفضُ اليقين أو إجماع،
// **ولا دليلَ على عدد الجلسات** (Heyns 2025 يعدّه فجوةً لم تُدرس) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً والانتقالُ بالمعيار. **ولا جهازَ له دليلٌ خاصّ بالمبتور**،
// والحرارةُ ممنوعةٌ على جلدٍ ضعيف الإحساس أو ناقص التروية أو على جرح (Houghton 2010) — فالتحفيزُ (للألم الشبحيّ وألم الجذع) والمغناطيسُ والتيكارُ مساعدةٌ
// بقاعدة سليم بشروطها، والباقي «لا يُستخدم» بسببه؛ والروبوتُ لا يُستعمل قبل الطرف أصلاً.
//
// المصادرُ ثلاثةٌ وأربعون، عناوينُها ومعرّفاتُها من سجلّ Europe PMC (وخمسةُ أدلّةٍ من مواقع جهاتها — ومنها طبعةُ BACPAR الثالثة التي صدرت بعد البحث
// فقُرئت توصياتُها كاملةً وبُنيت عليها). القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — إحدى عشرة؛ والمعادةُ الإحدى عشرة (زُرعت في ١١٩ و١٢٥ و١٢٦ و١٣٥) تُربط برموزها وصورها، وما يخصّ الجذعَ فيها في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "residual-limb-positioning", nameAr: "وضعية الجذع في السرير والكرسيّ (منعُ التيبّس والتورّم)", nameEn: "Positioning the residual limb in bed and in the chair (preventing contracture and swelling)",
    kind: "mobility", region: "whole_body",
    purpose: ["تيبّسُ ثني الركبة (بعد بترٍ تحت الركبة) وتيبّسُ ثني الورك وإبعاده (فوق الركبة) يبدأان في الأسابيع الأولى من الجلوس الطويل والوسادة تحت الجذع — وغيابُ التيبّس من أقوى ما تنبّأ بالمشي المبكّر بالطرف (Munin 2001)، والتيبّسُ الشديد يصعّب تركيبَ القالب (Poonsiri 2022). ورفعُ الجذع على لوحٍ في الكرسيّ يخفّف تورّمَه (BACPAR 2025).",
      "Knee flexion contracture (below the knee) and hip flexion and abduction contracture (above the knee) start in the first weeks from long sitting and a pillow under the residual limb — and the absence of contracture was one of the strongest predictors of early walking with a prosthesis (Munin 2001), while a severe contracture makes fitting the socket harder (Poonsiri 2022). Supporting the limb on a board in the wheelchair reduces its swelling (BACPAR 2025)."],
    start: ["في السرير: مستلقٍ على ظهره على فراشٍ ثابت والجذعُ ممدودٌ على خطّ الجسم. وفي الكرسيّ المتحرّك: لوحُ الجذع (Stump board) مثبّتٌ تحت جذع مبتور تحت الركبة.",
      "In bed: lying on the back on a firm mattress with the residual limb straight in line with the body. In the wheelchair: a stump board fixed under a below-knee residual limb."],
    steps: [[
      "في السرير: الجذعُ ممدودٌ على الفراش — لا وسادةَ تحت الركبة ولا تحت الفخذ ولا بين الفخذين.",
      "مبتورُ فوق الركبة: الفخذُ قريبٌ من الساق السليمة لا مائلٌ إلى الخارج، والحوضُ مستوٍ.",
      "في الكرسيّ المتحرّك: جذعُ مبتور تحت الركبة ممدودٌ على اللوح والركبةُ مستقيمة — لا متدلٍّ من حافّة المقعد.",
      "لا تجلس أكثرَ من ساعةٍ متّصلة: استلقِ أو انبطح (بطاقة «الانبطاح وبسط الورك») ثلاثَ مرّاتٍ في اليوم على الأقلّ.",
      "في الليل: الجذعُ ممدود، ولا تنم والوسادةُ تحت الجذع ولو كانت مريحة.",
    ], [
      "In bed: the residual limb lies straight on the mattress — no pillow under the knee, under the thigh or between the thighs.",
      "Above the knee: keep the thigh close to the sound leg, not drifting outwards, with the pelvis level.",
      "In the wheelchair: a below-knee residual limb rests straight on the board with the knee straight — not hanging over the edge of the seat.",
      "Do not sit for more than an hour at a time: lie down or lie face down (the 'Prone lying and prone hip extension' card) at least three times a day.",
      "At night: keep the limb straight, and do not sleep with a pillow under it even if it feels comfortable.",
    ]],
    cues: [[
      "وسادةٌ تحت الركبة أو الفخذ «لأنّها مريحة» ⟵ تُزال؛ راحةُ اليوم تيبّسٌ بعد أسبوعين يؤخّر القالب.",
      "الجذعُ يتدلّى من حافّة الكرسيّ أو السرير ⟵ على اللوح أو ممدودٌ على الفراش.",
      "مبتورُ فوق الركبة يباعد فخذَه إلى الخارج ⟵ الفخذان متقاربان، ومنشفةٌ ملفوفة على جانبه الخارجيّ إن مال.",
      "الجلوسُ معظمَ اليوم ⟵ فتراتُ استلقاءٍ وانبطاحٍ موزّعةٌ على اليوم.",
    ], [
      "A pillow under the knee or thigh 'because it is comfortable' → remove it; today's comfort is a contracture in two weeks that delays the socket.",
      "The limb hanging over the edge of the chair or bed → on the board or straight on the mattress.",
      "An above-knee limb drifting outwards → thighs close together, with a rolled towel along the outer side if it drifts.",
      "Sitting most of the day → spells of lying down and lying face down spread through the day.",
    ]],
    easier: ["نصفُ استلقاءٍ على الجنب السليم إن تعذّر الانبطاح، والجذعُ ممدود.", "Half side-lying on the sound side if lying face down is not possible, with the limb straight."],
    harder: ["انبطاحٌ أطول (٢٠–٣٠ دقيقة) بإذن المعالج، وجلوسٌ أقلّ.", "Longer prone lying (20–30 minutes) if the therapist allows it, and less sitting."],
    stopIf: ["ألمٌ يزيد في طرف الجذع، أو نزفٌ أو إفرازٌ جديد من الجرح، أو ضيقُ نفسٍ عند الاستلقاء — أخبر المعالج.",
      "Rising pain at the end of the limb, new bleeding or discharge from the wound, or breathlessness lying flat — tell the therapist."],
    equipment: ["فراشٌ ثابت، ولوحُ جذعٍ للكرسيّ المتحرّك (لمبتور تحت الركبة)، ومنشفةٌ ملفوفة.", "A firm mattress, a wheelchair stump board (below the knee) and a rolled towel."],
    doseNote: ["طوالَ اليوم والليل؛ والانبطاحُ ١٠ دقائق ثلاثَ مرّاتٍ يومياً ثمّ أطول.", "All day and night; prone lying 10 minutes three times a day, then longer."],
    images: [{ key: "residual-limb-stump-board-1", ar: "جذعُ مبتورٍ تحت الركبة ممدودٌ على لوح الجذع في الكرسيّ المتحرّك", en: "A below-knee residual limb supported straight on a stump board in a wheelchair", search: "wheelchair stump board below knee amputee" }],
  },
  {
    code: "thomas-hip-flexor-stretch", nameAr: "تمطيط مقدّمة الورك بوضعية توماس (وبسط الركبة لمبتور تحت الركبة)", nameEn: "Hip flexor stretch in the Thomas position (and knee extension below the knee)",
    kind: "stretch", region: "hip", sets: 1, reps: 5, hold: 30,
    purpose: ["يحفظ بسطَ الورك حتى الصفر على الأقلّ وبسطَ الركبة كاملاً — فالطرفُ لاحقاً يحتاج وركاً يستقيم تحت الجسم وركبةً تستقيم في القالب. والتمطيطُ مع الوضعيات أساسُ منع التيبّس في الأدلّة كلّها (VA/DoD 2024 · BACPAR 2025 — 5.10).",
      "Keeps hip extension at zero or better and full knee extension — later the prosthesis needs a hip that straightens under the body and a knee that straightens in the socket. Stretching with positioning is the basis of contracture prevention in every guideline (VA/DoD 2024 · BACPAR 2025 — 5.10)."],
    start: ["مستلقٍ على ظهره على فراشٍ ثابت قرب حافّته، بلا وسادةٍ تحت الرأس أو بوسادةٍ رقيقة.", "Lying on the back on a firm mattress near its edge, with no pillow under the head or a thin one."],
    steps: [[
      "اضمم الركبةَ السليمة إلى صدرك بيديك — فيستقيم أسفلُ الظهر على الفراش.",
      "اترك الجذعَ ممدوداً على الفراش، واضغطه نحو الفراش بهدوء.",
      "اثبت ٣٠–٦٠ ثانية وتنفّس بشكلٍ طبيعيّ، ثمّ أرخِ.",
      "مبتورُ تحت الركبة: اجلس والجذعُ ممدودٌ أمامك، واضغط مؤخّرةَ الركبة نحو الفراش حتى تستقيم تماماً، واثبت ١٠ ثوانٍ.",
      "كرّر ٥ مرّات.",
    ], [
      "Hug the sound knee to your chest with both hands — the lower back flattens onto the mattress.",
      "Leave the residual limb straight on the mattress and press it gently down.",
      "Hold 30–60 seconds breathing normally, then relax.",
      "Below the knee: sit with the limb straight in front of you and press the back of the knee down into the mattress until it is fully straight, holding 10 seconds.",
      "Repeat 5 times.",
    ]],
    cues: [[
      "الظهرُ يتقوّس عن الفراش ⟵ اضمم الركبةَ السليمة أكثر حتى يستقيم الظهر.",
      "الجذعُ يرتفع عن الفراش ⟵ ضغطٌ هادئ إلى الأسفل، وبيد المعالج أو ثقلٍ خفيف فوق الفخذ إن لزم.",
      "شدٌّ على خطّ الجرح ⟵ مدىً أقلّ؛ التمطيطُ شدٌّ في مقدّمة الورك أو خلف الركبة لا في الجرح.",
    ], [
      "The back arching off the mattress → hug the sound knee further until the back flattens.",
      "The residual limb lifting off the mattress → gentle downward pressure, with the therapist's hand or a light weight above the knee if needed.",
      "Pulling on the suture line → a smaller range; the stretch is felt at the front of the hip or behind the knee, not in the wound.",
    ]],
    easier: ["حركةٌ فاعلة بلا ثبات (يرفع الجذعَ ويُنزله)، أو ضمُّ الركبة السليمة أقلّ.", "Active movement without a hold (lifting and lowering the limb), or hugging the sound knee less."],
    harder: ["الجذعُ يتدلّى قليلاً عن حافّة السرير (بسطٌ أبعد للورك) بإشراف المعالج، أو ثقلٌ خفيف فوق الفخذ.",
      "Letting the limb drop slightly over the edge of the bed (further hip extension) under the therapist's supervision, or a light weight on the thigh."],
    stopIf: ["شدٌّ أو ألمٌ على خطّ الجرح، أو نزف، أو ألمٌ في أسفل الظهر.", "Pulling or pain on the suture line, bleeding, or low back pain."],
    equipment: ["فراشٌ أو سريرٌ ثابت.", "A firm mattress or bed."],
    doseNote: ["٥ مرّات بثباتٍ ٣٠–٦٠ ثانية، مرّتين أو ثلاثاً يومياً.", "5 times with 30–60 second holds, two or three times a day."],
    images: [{ key: "thomas-stretch-amputee-1", ar: "مستلقٍ يضمّ ركبتَه السليمة إلى صدره والجذعُ ممدودٌ على الفراش", en: "Lying on the back hugging the sound knee to the chest with the residual limb flat on the mattress", search: "Thomas stretch hip flexor amputee residual limb supine" }],
  },
  {
    code: "amputee-bed-mobility", nameAr: "الحركة في السرير: التدحرج والتزحزح والجلوس", nameEn: "Bed mobility: rolling, shuffling and sitting up",
    kind: "functional", region: "whole_body", sets: 1, reps: 5,
    purpose: ["أوّلُ الاستقلال بعد البتر وأوّلُ بنود مقياس الحركة الأساسيّ للمبتور (BAMS)، ويُعلَّم من اليوم الأوّل (BACPAR 2025 — 5.6.2). والتدحرجُ للجهتين تمرينٌ مبكّرٌ ممتاز للجذع كثيراً ما يُهمَل (HI 2020)، وهو أهمّ لمبتور فوق الركبة والطرفين لأنّ مركزَ ثقل الجسم تغيّر.",
      "The first step to independence after amputation and the first item of the Basic Amputee Mobility Score (BAMS), taught from day one (BACPAR 2025 — 5.6.2). Rolling both ways is an excellent early trunk exercise that is often overlooked (HI 2020), and matters more above the knee and after bilateral loss because the body's centre of gravity has shifted."],
    start: ["مستلقٍ على ظهره على سريرٍ ثابت، والكرسيُّ المتحرّك مقفولٌ بجانب السرير.", "Lying on the back on a firm bed, with the wheelchair locked beside it."],
    steps: [[
      "التدحرج: اثنِ الركبةَ السليمة وضع قدمَها على السرير، ومدّ ذراعَك عبر جسمك وتدحرج إلى جنبك — ثمّ إلى الجهة الأخرى.",
      "التزحزح: ادفع بالقدم السليمة واليدين لترفع الحوضَ قليلاً وتنتقل إلى الأعلى أو إلى الجانب.",
      "الجلوس: تدحرج إلى جنبك، وأنزل الساقَ السليمة عن الحافّة، وادفع بالمرفق ثمّ باليد لتجلس.",
      "اجلس منتصباً دقيقةً قبل أيّ انتقال، والقدمُ السليمة على الأرض.",
      "العودةُ إلى الاستلقاء بالعكس، ببطء.",
    ], [
      "Rolling: bend the sound knee with the foot on the bed, reach your arm across your body and roll onto your side — then to the other side.",
      "Shuffling: push through the sound foot and both hands to lift the pelvis slightly and move up the bed or sideways.",
      "Sitting up: roll onto your side, lower the sound leg over the edge, and push up on the elbow and then the hand to sit.",
      "Sit upright for a minute before any transfer, with the sound foot on the floor.",
      "Lie back down in reverse order, slowly.",
    ]],
    cues: [[
      "سحبُ الجسم بالحبل أو بحافّة السرير وحدها ⟵ الجذعُ والساقُ السليمة يعملان، واليدان تساعدان.",
      "الجذعُ يُجرّ على الفراش ⟵ ارفع الحوضَ قليلاً قبل التزحزح لئلّا يحتكّ الجرح.",
      "الوقوفُ فورَ الجلوس ⟵ لحظةُ جلوسٍ أوّلاً — الدوخةُ شائعةٌ بعد الاستلقاء الطويل.",
    ], [
      "Hauling the body up with a rope or the bed edge alone → the trunk and sound leg do the work, the hands help.",
      "Dragging the residual limb across the sheet → lift the pelvis slightly before shuffling so the wound is not rubbed.",
      "Standing straight after sitting up → sit for a moment first — dizziness is common after lying for long.",
    ]],
    easier: ["رأسُ السرير مرفوع، أو مساعدةُ شخصٍ واحد من الكتف والحوض.", "The head of the bed raised, or one person helping at the shoulder and pelvis."],
    harder: ["بلا مساعدةٍ ولا حبل، ومن سريرٍ منخفض أو فرشةٍ على الأرض كما في بيوتٍ كثيرة.", "Without help or a rope, and from a low bed or a mattress on the floor as in many homes."],
    stopIf: ["دوخةٌ شديدة عند الجلوس، أو ألمٌ أو نزفٌ من الجرح.", "Marked dizziness on sitting up, or pain or bleeding from the wound."],
    equipment: ["سريرٌ ثابت، وكرسيٌّ متحرّك مقفولٌ بجانبه.", "A firm bed, with a locked wheelchair beside it."],
    doseNote: ["عند كلّ نهوضٍ من السرير، و٥ مرّاتٍ في الجلسة حتى يستقلّ.", "Every time the patient gets out of bed, and 5 times per session until independent."],
    images: [{ key: "amputee-bed-sit-up-1", ar: "مبتورُ ساقٍ يدفع بمرفقه ويده ليجلس على حافّة السرير", en: "A leg amputee pushing up on the elbow and hand to sit on the edge of the bed", search: "amputee sitting up edge of bed" }],
  },
  {
    code: "amputee-transfers", nameAr: "الانتقال بين السرير والكرسيّ والمرحاض (على الساق السليمة أو بلوح الانزلاق)", nameEn: "Transfers between bed, chair and toilet (pivoting on the sound leg or with a sliding board)",
    kind: "functional", region: "whole_body", sets: 1, reps: 5,
    purpose: ["الانتقالُ المستقلّ أساسُ الحياة قبل الطرف (BACPAR 2025 — 5.6.5)، والمستقلّون فيه في اليوم الحادي والعشرين بعد العملية كانوا أقربَ إلى تركيب الطرف (Madsen 2018). ويُعلَّم على ما في بيت المريض: السريرُ المنخفض، والفرشةُ على الأرض، والمرحاضُ العربيّ.",
      "Independent transfers are the basis of life before the prosthesis (BACPAR 2025 — 5.6.5), and patients independent in them by day 21 after surgery were more likely to go on to a prosthesis (Madsen 2018). They are taught for what the patient's home has: a low bed, a mattress on the floor, a squat toilet."],
    start: ["جالسٌ على حافّة السرير والقدمُ السليمة على الأرض تحت ركبته، والكرسيُّ المتحرّك بزاويةٍ صغيرة (٣٠–٤٥°) في جهة الساق السليمة، مقفولٌ ومسندُ قدمه مرفوع.",
      "Sitting on the edge of the bed with the sound foot on the floor under the knee, and the wheelchair at a small angle (30–45°) on the sound side, locked, with its footplate up."],
    steps: [[
      "اقفل الكرسيّ، وارفع مسندَ القدم، وأزِل مسندَ الذراع القريب إن كان يُزال.",
      "تقدّم إلى حافّة المقعد والقدمُ السليمة تحتك، والجذعُ بعيدٌ عن أيّ شيءٍ يصطدم به.",
      "ضع يداً على مسند الكرسيّ البعيد والأخرى على السرير، وانحنِ إلى الأمام حتى يصير الأنفُ فوق القدم.",
      "ادفع باليدين والساق السليمة، واستدر على القدم السليمة، واجلس في الكرسيّ ببطء.",
      "لوحُ الانزلاق (Sliding board) لمن لا يقف على ساقه السليمة بأمان: ضعه بين السرير والكرسيّ وانزلق عليه بدفعاتٍ قصيرة باليدين.",
      "تدرّب على كلّ انتقالٍ في بيتك: المرحاضُ العربيّ أو الغربيّ، والسيّارة، والجلوسُ على الأرض والقيامُ منها.",
    ], [
      "Lock the chair, lift the footplate, and remove the near armrest if it comes off.",
      "Move forward to the edge of the seat with the sound foot under you, and the residual limb clear of anything it could knock.",
      "Put one hand on the far armrest of the chair and the other on the bed, and lean forward until your nose is over your foot.",
      "Push through both hands and the sound leg, pivot on the sound foot, and sit down into the chair slowly.",
      "A sliding board for anyone who cannot stand safely on the sound leg: place it between bed and chair and slide across in short pushes with the hands.",
      "Practise every transfer your home needs: a squat or a sitting toilet, the car, and getting down to and up from the floor.",
    ]],
    cues: [[
      "الكرسيُّ غيرُ مقفول ⟵ القفلُ أوّلاً في كلّ مرّة.",
      "الوقوفُ معتدلاً ثمّ الاستدارة ⟵ انحناءٌ إلى الأمام والاستدارةُ على القدم السليمة دون وقوفٍ كامل.",
      "الجذعُ يصطدم بالكرسيّ أو السرير ⟵ أبعِده، ومسندُ القدم مرفوع.",
      "الجلوسُ سقوطاً في المقعد ⟵ نزولٌ بطيءٌ باليدين على المسندين.",
    ], [
      "The chair not locked → lock it first, every time.",
      "Standing fully upright and then turning → lean forward and pivot on the sound foot without standing all the way up.",
      "The residual limb knocking the chair or bed → keep it clear, with the footplate up.",
      "Dropping into the seat → lower yourself slowly with the hands on the armrests.",
    ]],
    easier: ["لوحُ الانزلاق، أو مقعدٌ أعلى، أو مساعدةُ شخصٍ واحد من حزامٍ حول الوسط.", "The sliding board, a higher seat, or one person helping with a belt around the waist."],
    harder: ["ارتفاعاتٌ مختلفة ومقاعدُ منخفضة، والمرحاضُ العربيّ، والانتقالُ إلى الأرض ومنها.", "Unequal heights and low seats, a squat toilet, and transfers down to and up from the floor."],
    stopIf: ["دوخة، أو ارتطامُ الجذع، أو ألمٌ في القدم السليمة أو احمرارٌ لا يزول عليها.", "Dizziness, a knock to the residual limb, or pain or redness that does not fade on the sound foot."],
    equipment: ["كرسيٌّ متحرّك بمسندي ذراعٍ يُزالان ومسندِ قدمٍ يُرفع، ولوحُ انزلاق، وسريرٌ ثابت.", "A wheelchair with removable armrests and lift-up footplates, a sliding board and a firm bed."],
    doseNote: ["٥–١٠ مرّاتٍ لكلّ انتقالٍ يحتاجه في بيته في كلّ جلسة، ويتعلّمه المرافق.", "5–10 practices of each transfer the home needs in every session, taught to the carer too."],
    images: [{ key: "amputee-pivot-transfer-1", ar: "مبتورُ ساقٍ ينتقل من السرير إلى الكرسيّ المتحرّك مستديراً على ساقه السليمة", en: "A leg amputee transferring from bed to wheelchair by pivoting on the sound leg", search: "amputee stand pivot transfer bed to wheelchair" }],
  },
  {
    code: "wheelchair-skills", nameAr: "مهارات الكرسيّ المتحرّك", nameEn: "Wheelchair skills",
    kind: "functional", region: "whole_body",
    purpose: ["الكرسيُّ هو التنقّلُ الآمن الأساسيّ قبل الطرف (BACPAR 2025 — 5.6.6)، وتدريبُ مهاراته يرفع القدرةَ عليها بدليلٍ متوسّط اليقين (Keeler 2019)؛ ويبقى نافعاً بعد الطرف للمسافات الطويلة وفي الليل (BACPAR 2025).",
      "The wheelchair is the main safe means of getting about before the prosthesis (BACPAR 2025 — 5.6.6), and wheelchair skills training improves capacity with moderate-certainty evidence (Keeler 2019); it stays useful after the prosthesis for long distances and at night (BACPAR 2025)."],
    start: ["جالسٌ في الكرسيّ المتحرّك والجذعُ على لوحه (تحت الركبة)، ومانعا الانقلاب (Anti-tippers) مركَّبان.", "Sitting in the wheelchair with a below-knee limb on its board and the anti-tippers fitted."],
    steps: [[
      "القفلُ والفكّ، ورفعُ مسند القدم وإنزالُه، وإزالةُ مسند الذراع — قبل كلّ انتقال.",
      "الدفعُ إلى الأمام بضرباتٍ طويلةٍ هادئة من خلف العجلة إلى أمامها، ثمّ الرجوعُ إلى الخلف.",
      "الاستدارةُ في مكانٍ ضيّق، والمرورُ من الباب.",
      "المنحدرُ صعوداً والجذعُ مائلٌ إلى الأمام، ونزولاً ببطءٍ والعجلتان تنزلقان بين اليدين.",
      "تخفيفُ الضغط عن المقعد: ارفع جسمك بيديك على المسندين ١٥–٣٠ ثانيةً كلَّ ٣٠ دقيقة.",
    ], [
      "Locking and unlocking, lifting and lowering the footplate, and removing the armrest — before every transfer.",
      "Pushing forwards with long, steady strokes from the back of the wheel to the front, then backwards.",
      "Turning in a tight space and going through a doorway.",
      "Up a ramp leaning the trunk forwards, and down slowly letting the wheels slide through the hands.",
      "Pressure relief: lift yourself on the armrests for 15–30 seconds every 30 minutes.",
    ]],
    cues: [[
      "الكرسيُّ ينقلب إلى الخلف (فبلا الساق يصير ثقلُ الجسم إلى الخلف) ⟵ مانعا الانقلاب دائماً، أو محورُ العجلتين إلى الخلف لمبتور فوق الركبة والطرفين، وميلٌ إلى الأمام على المنحدر.",
      "ضرباتٌ قصيرةٌ سريعة ⟵ طويلةٌ هادئة تحفظ الكتفين.",
      "الجذعُ يتدلّى أو يصطدم في الطريق ⟵ على لوحه.",
    ], [
      "The chair tipping backwards (without the leg the body's weight sits further back) → anti-tippers always, or the rear axle moved back above the knee and in bilateral loss, and leaning forwards on ramps.",
      "Short, fast strokes → long, steady strokes that protect the shoulders.",
      "The residual limb hanging down or knocking things → on its board.",
    ]],
    easier: ["أرضٌ مستوية داخل المركز، ومسافاتٌ قصيرة.", "Level floors inside the centre, and short distances."],
    harder: ["منحدرٌ أطول، وأرضٌ خارجية غيرُ مستوية، وعتبةٌ صغيرة بمساعدة — والتوازنُ على العجلتين الخلفيّتين لا يُعلَّم إلّا لمن يتقن غيرَه وبحضور المعالج.",
      "A longer ramp, uneven outdoor ground, and a small kerb with help — balancing on the back wheels is taught only to those who have mastered the rest, with the therapist present."],
    stopIf: ["ألمٌ في الكتف، أو خطرُ انقلاب، أو دوخة.", "Shoulder pain, a risk of tipping, or dizziness."],
    equipment: ["كرسيٌّ متحرّك بمانعي انقلاب ولوحِ جذع، ومنحدرٌ في المركز.", "A wheelchair with anti-tippers and a stump board, and a ramp at the centre."],
    doseNote: ["نحو ١٠ دقائق في الجلسة في المرحلتين الأوليين، ويستعمله في البيت يومياً.", "About 10 minutes per session in the first two phases, and daily use at home."],
    images: [{ key: "wheelchair-amputee-propulsion-1", ar: "مبتورُ ساقٍ يدفع كرسيَّه المتحرّك والجذعُ على لوحه", en: "A leg amputee pushing the wheelchair with the residual limb on its board", search: "amputee self propelling wheelchair stump board" }],
  },
  {
    code: "residual-limb-desensitisation", nameAr: "إزالة حساسية الجذع وتدليك الندبة", nameEn: "Residual-limb desensitisation and scar massage",
    kind: "neural", region: "whole_body",
    purpose: ["يعوّد الجذعَ على اللمس والضغط قبل القالب، ويُبقي الندبةَ متحرّكةً غيرَ ملتصقة (BACPAR 2025 — 5.4.10)، ويخفّف الحساسيةَ الزائدة وبعضَ ألم الجذع — إجماعُ الأدلّة (VA/DoD 2024).",
      "Gets the residual limb used to touch and pressure before the socket, keeps the scar mobile rather than stuck down (BACPAR 2025 — 5.4.10), and eases oversensitivity and some residual-limb pain — guideline consensus (VA/DoD 2024)."],
    start: ["جالسٌ أو مستلقٍ والجذعُ مكشوفٌ نظيفٌ جافّ، وأمامه موادُّ بخشونةٍ متدرّجة: قطن، وقماشٌ ناعم، ومنشفة، وفرشاةٌ ناعمة.",
      "Sitting or lying with the residual limb uncovered, clean and dry, and materials of increasing roughness to hand: cotton wool, soft cloth, a towel and a soft brush."],
    steps: [[
      "ابدأ بالقطن: مرّره على الجذع كلّه بحركاتٍ هادئة دقيقةً أو دقيقتين — بعيداً عن الجرح ما دام لم يلتئم.",
      "انتقل إلى مادّةٍ أخشن حين تصير السابقةُ مريحة: القماش، ثمّ المنشفة، ثمّ الفرشاة.",
      "اطرق الجذعَ خفيفاً بأطراف الأصابع، ثمّ اضغط عليه بالكفّ المسطّحة واثبت ٥ ثوانٍ.",
      "بعد التئام الجرح وبإذن الطبيب: ضع إصبعين على الندبة وحرّك الجلدَ فوقها بدوائر صغيرة — الإصبعان لا ينزلقان على الجلد.",
      "اختم بلبس رباط الجذع الضاغط إن كان موصوفاً.",
    ], [
      "Start with cotton wool: stroke it over the whole limb gently for a minute or two — away from the wound while it is not healed.",
      "Move to a rougher material once the previous one feels comfortable: the cloth, then the towel, then the brush.",
      "Tap the limb lightly with the fingertips, then press on it with the flat hand and hold 5 seconds.",
      "Once the wound has healed and the doctor allows it: put two fingers on the scar and move the skin over it in small circles — the fingers do not slide over the skin.",
      "Finish by putting the shrinker on if one is prescribed.",
    ]],
    cues: [[
      "البدءُ بالأخشن ⟵ الأنعمُ أوّلاً، والتدرّجُ بحسب الراحة.",
      "التدليكُ على جرحٍ لم يلتئم أو على قشرة ⟵ حولَه فقط حتى يلتئم.",
      "تجنّبُ لمس الجذع كلّياً ⟵ اللمسُ اليوميّ المتدرّج هو العلاج، والتجنّبُ يزيد الحساسية.",
    ], [
      "Starting with the roughest → the softest first, progressing as comfort allows.",
      "Massaging an unhealed wound or a scab → only around it until it heals.",
      "Avoiding touching the limb at all → graded daily touch is the treatment; avoidance makes the sensitivity worse.",
    ]],
    easier: ["القطنُ وحده، وحولَ الجذع لا على طرفه.", "Cotton wool alone, around the limb rather than on its end."],
    harder: ["الفرشاة، والطَّرقُ الأقوى، والضغطُ على راحةٍ أو وسادةٍ أقسى — تمهيداً لتحميل القالب.", "The brush, firmer tapping, and pressing onto a firmer cushion — preparing for loading in the socket."],
    stopIf: ["انفتاحٌ في الجرح أو نزفٌ أو إفراز، أو ألمٌ شديد من اللمس الخفيف — أخبر المعالج (قد يُحوَّل إلى العلاج بالمرآة أو التخيّل الحركيّ).",
      "The wound opening, bleeding or discharge, or severe pain from light touch — tell the therapist (mirror therapy or motor imagery may be used instead)."],
    equipment: ["قطن، وقماشٌ ناعم، ومنشفة، وفرشاةٌ ناعمة، وكريمٌ مرطّب للجلد الملتئم.", "Cotton wool, soft cloth, a towel, a soft brush, and moisturiser for healed skin."],
    doseNote: ["٥ دقائق، مرّتين أو ثلاثاً يومياً.", "5 minutes, two or three times a day."],
    images: [{ key: "residual-limb-desensitisation-1", ar: "مبتورٌ يمرّر قماشاً ناعماً على جذعه", en: "An amputee stroking a soft cloth over the residual limb", search: "residual limb desensitisation texture rubbing amputee" }],
  },
  {
    code: "shrinker-donning", nameAr: "لبس رباط الجذع الضاغط (Shrinker)", nameEn: "Putting on the residual-limb shrinker",
    kind: "functional", region: "whole_body",
    purpose: ["يقلّل تورّمَ الجذع ويشكّله فيثبت حجمُه — وثباتُ الحجم شرطُ أخذ قالب الطرف. والجوربُ الضاغط أفضلُ من الرباط المطّاطيّ الملفوف (BACPAR 2025 — 5.4.8)، ويُبدأ حين يأذن الجرّاح، وفي الأدلّة خلال عشرة أيّامٍ من العملية (BACPAR 2025).",
      "Reduces swelling and shapes the residual limb so its volume settles — and a stable volume is the condition for casting the socket. A compression sock is preferred to an elastic bandage (BACPAR 2025 — 5.4.8); it starts when the surgeon allows, which the guidance puts within ten days of surgery (BACPAR 2025)."],
    start: ["جالسٌ والجذعُ نظيفٌ جافّ، والرباطُ الضاغط بمقاسه، وأداةُ اللبس (أنبوبٌ بلاستيكيّ أو كيسٌ ناعم) إن وُجدت.", "Sitting with the limb clean and dry, the shrinker in the right size, and the applicator (a plastic tube or a smooth bag) if available."],
    steps: [[
      "افحص الجرحَ والجلد: لا نزفَ ولا إفرازَ جديد.",
      "ضع الرباطَ على أداة اللبس، أو اقلبه على نفسه حتى طرفه.",
      "أدخل الجذعَ حتى يلامس طرفُه قاعَ الرباط، ثمّ اسحب الأداةَ أو افرد الرباطَ إلى الأعلى — دون أن تشدّ طرفَ الجذع إلى الأسفل.",
      "افرده بلا تجاعيد ولا التفاف، حتى فوق الركبة (تحت الركبة) أو أعلى الفخذ (فوق الركبة).",
      "البسه طوالَ اليوم والليل إلّا عند الغسل والتمارين، وانزعه وافحص الجلدَ مرّتين يومياً.",
    ], [
      "Check the wound and skin: no bleeding and no new discharge.",
      "Load the shrinker onto the applicator, or turn it inside out down to its end.",
      "Put the limb in until its end touches the bottom of the shrinker, then pull off the applicator or unroll the shrinker upwards — without dragging the end of the limb downwards.",
      "Smooth it out with no wrinkles or rolls, up above the knee (below-knee) or to the top of the thigh (above-knee).",
      "Wear it all day and night except for washing and exercise, and take it off to check the skin twice a day.",
    ]],
    cues: [[
      "الرباطُ ملفوفٌ عند حافّته العليا كالحبل ⟵ يُفرد؛ الالتفافُ يخنق الجذعَ ويزيد التورّم تحته.",
      "تجاعيدُ عند طرف الجذع ⟵ تُفرد، فهي تضغط الجلدَ وتجرحه.",
      "رباطٌ مطّاطيٌّ ملفوف بدل الجورب ⟵ إن لم يتوفّر غيرُه فلفٌّ على شكل ٨ يشتدّ عند الطرف ويخفّ إلى الأعلى، حتى فوق الركبة أو أعلى الفخذ، ويُثبَّت بلاصقٍ لا بمشابك (HI 2020)، ويُعاد لفُّه كلّما ارتخى.",
    ], [
      "The top edge rolled down like a rope → smooth it out; a roll strangles the limb and increases the swelling below it.",
      "Wrinkles at the end of the limb → smooth them out; they press on the skin and injure it.",
      "An elastic bandage instead of the sock → if nothing else is available, a figure-of-eight wrap that is firmest at the end and looser higher up, to above the knee or the top of the thigh, fixed with tape rather than clips (HI 2020), and rewrapped whenever it loosens.",
    ]],
    easier: ["بمساعدة المرافق، وبأداة اللبس.", "With the carer's help and the applicator."],
    harder: ["يلبسه وحده بلا أداة، ويعرف متى يحتاج مقاساً أصغر حين يرتخي.", "Putting it on alone without the applicator, and knowing when a smaller size is needed as it loosens."],
    stopIf: ["ألمٌ نابض، أو تنميل، أو تغيّرُ لون الجذع إلى الأزرق أو الأبيض، أو جرحٌ ينفتح — انزعه وأخبر المعالج.",
      "Throbbing pain, numbness, the limb turning blue or white, or the wound opening — take it off and tell the therapist."],
    equipment: ["رباطُ الجذع الضاغط بمقاسه (قطعتان للتبديل)، وأداةُ اللبس.", "The shrinker in the right size (two, to alternate) and the applicator."],
    doseNote: ["يُلبس طوالَ اليوم والليل حين يأذن الجرّاح، ويُفحص الجلدُ مرّتين يومياً.", "Worn all day and night once the surgeon allows it, with a skin check twice a day."],
    images: [{ key: "shrinker-donning-1", ar: "مبتورٌ يلبس رباطَ الجذع الضاغط بأداة اللبس", en: "An amputee putting on the residual-limb shrinker with an applicator", search: "residual limb shrinker donning applicator amputee" }],
  },
  {
    code: "seated-push-ups", nameAr: "رفع الجسم باليدين على مسندي الكرسيّ", nameEn: "Seated push-ups on the armrests",
    kind: "strength", region: "shoulder", sets: 3, reps: 10, hold: 3,
    purpose: ["الذراعان تحملان الجسمَ في الانتقال والكرسيّ والمشّاية قبل الطرف — وتقويتُهما تقلّل إصاباتِ الكتف من الاستعمال الزائد (VA/DoD 2024)، والرفعُ نفسُه يخفّف الضغطَ عن جلد الحوض في الجلوس الطويل.",
      "The arms carry the body in transfers, the wheelchair and the walking frame before the prosthesis — strengthening them reduces shoulder overuse injuries (VA/DoD 2024), and the lift itself relieves pressure on the skin of the buttocks during long sitting."],
    start: ["جالسٌ في كرسيٍّ ثابتٍ بمسندين أو في الكرسيّ المتحرّك المقفول، واليدان على المسندين بجانب الوركين.", "Sitting in a stable chair with armrests or in the locked wheelchair, with the hands on the armrests beside the hips."],
    steps: [[
      "اضغط بيديك على المسندين والمرفقان قريبان من الجسم.",
      "مدّ المرفقين لترفع الوركين عن المقعد، والكتفان إلى الأسفل لا نحو الأذنين.",
      "اثبت ٣–٥ ثوانٍ.",
      "انزل ببطءٍ إلى المقعد.",
    ], [
      "Press down on the armrests with the elbows close to the body.",
      "Straighten the elbows to lift the hips off the seat, with the shoulders down, not up by the ears.",
      "Hold 3–5 seconds.",
      "Lower slowly back to the seat.",
    ]],
    cues: [[
      "رفعُ الكتفين نحو الأذنين ⟵ الكتفان إلى الأسفل، والدفعُ من الكفّين.",
      "الكرسيُّ يتحرّك ⟵ يُقفل أوّلاً.",
      "الهبوطُ سقوطاً ⟵ نزولٌ بطيء.",
    ], [
      "Shrugging the shoulders up to the ears → shoulders down, pushing through the palms.",
      "The chair moving → lock it first.",
      "Dropping down → lower slowly.",
    ]],
    easier: ["رفعٌ جزئيّ (تخفيفُ الوزن دون رفعه كاملاً)، أو بمساعدة القدم السليمة.", "A partial lift (taking weight off without lifting fully), or with help from the sound foot."],
    harder: ["ثباتٌ أطول (١٠ ثوانٍ)، أو رفعٌ بلا القدم السليمة.", "Longer holds (10 seconds), or lifting without the sound foot."],
    stopIf: ["ألمٌ في الكتف أو المرفق أو الرسغ.", "Pain in the shoulder, elbow or wrist."],
    equipment: ["كرسيٌّ ثابتٌ بمسندين أو كرسيٌّ متحرّك مقفول.", "A stable chair with armrests or a locked wheelchair."],
    doseNote: ["٣ × ١٠ يومياً، وتخفيفُ الضغط بالرفع كلَّ ٣٠ دقيقةً من الجلوس.", "3 × 10 daily, and a pressure-relief lift every 30 minutes of sitting."],
    images: [{ key: "seated-push-up-1", ar: "جالسٌ يرفع وركيه عن المقعد بيديه على مسندي الكرسيّ", en: "Seated, lifting the hips off the seat with the hands on the armrests", search: "seated push up wheelchair armrest dips" }],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "walker-hop-to", nameAr: "المشي بالمشّاية أو العكّازين على الساق السليمة، والدرج جلوساً", nameEn: "Walking with a frame or crutches on the sound leg, and stairs sitting down",
    kind: "functional", region: "whole_body", homeSuitable: false,
    purpose: ["تنقّلٌ قصير في البيت حيث لا يصل الكرسيّ (الحمّامُ الضيّق والعتبات)، والكرسيُّ هو الأساس والمشّايةُ لسببٍ مكتوب (BACPAR 2025 — 5.6.6). والدرجُ جلوساً طريقةٌ آمنة فعّالة لمبتور الساق الواحدة (BACPAR 2025 — 5.6.7).",
      "Short-distance mobility at home where the wheelchair cannot go (a narrow bathroom, thresholds); the wheelchair is the default and the frame needs a documented reason (BACPAR 2025 — 5.6.6). Going up and down stairs sitting is a safe, effective method for single-leg amputees (BACPAR 2025 — 5.6.7)."],
    start: ["واقفٌ بين القضبان المتوازية على الساق السليمة، ثمّ بالمشّاية، والمعالجُ بجانبه من جهة الجذع، وحذاءٌ مغلقٌ ثابت في القدم السليمة.",
      "Standing on the sound leg in the parallel bars, then with the frame, with the therapist alongside on the amputated side and a closed, stable shoe on the sound foot."],
    steps: [[
      "قِف على الساق السليمة والمشّايةُ أمامك، واليدان عليها والمرفقان مثنيّان قليلاً.",
      "قدّم المشّايةَ مسافةً قصيرة (طولَ قدم) وثبّتها بأرجلها الأربع.",
      "احمل وزنك على اليدين، وانقل القدمَ السليمة إلى داخل المشّاية بقفزةٍ صغيرة، وانزل عليها بنعومة.",
      "كرّر بإيقاعٍ هادئ، واسترح جالساً متى تعبت.",
      "الدرجُ جلوساً: اجلس على الدرجة، وادفع بيديك والساق السليمة لترفع الوركين إلى الدرجة التالية خلفك، درجةً بعد درجة — والنزولُ بالعكس.",
      "في أعلى الدرج: طريقةُ القيام من الأرض إلى الكرسيّ أو المشّاية متّفقٌ عليها مع المعالج قبل البدء.",
    ], [
      "Stand on the sound leg with the frame in front of you, hands on it and elbows slightly bent.",
      "Move the frame a short distance forward (one foot length) and set all four legs down.",
      "Take your weight through your hands and bring the sound foot into the frame with a small hop, landing softly.",
      "Repeat at a calm rhythm, and sit to rest whenever you are tired.",
      "Stairs sitting down: sit on a step and push with the hands and the sound leg to lift the hips onto the step behind you, one step at a time — and down the same way in reverse.",
      "At the top of the stairs: the way back up from the floor to the chair or frame is agreed with the therapist before starting.",
    ]],
    cues: [[
      "قفزةٌ عالية وهبوطٌ قاسٍ ⟵ قفزةٌ قصيرة وهبوطٌ ناعم.",
      "القفزُ إلى خارج المشّاية أو إلى حافّتها ⟵ القدمُ تنزل في منتصفها.",
      "الجذعُ يتدلّى طويلاً أثناء المشي ⟵ مسافاتٌ قصيرة، فالتدلّي يزيد التورّم (HI 2020).",
      "مريضُ السكّري يقفز كثيراً ⟵ القفزُ قليلٌ والقدمُ السليمة تُفحص بعده — الضغطُ المتكرّر عليها خطر.",
    ], [
      "A high hop and a hard landing → a short hop and a soft landing.",
      "Hopping out of the frame or to its edge → land in the middle of it.",
      "The residual limb hanging down for long while walking → short distances; hanging increases swelling (HI 2020).",
      "A patient with diabetes hopping a lot → little hopping, with the sound foot checked afterwards — repeated pressure on it is a risk.",
    ]],
    easier: ["بين القضبان وحدها، ومسافاتٌ أقصر.", "In the parallel bars only, and shorter distances."],
    harder: ["العكّازان بدل المشّاية، وأرضٌ خارجية، والدرجُ جلوساً صعوداً ونزولاً كاملاً.", "Crutches instead of the frame, outdoor ground, and a full flight of stairs up and down sitting."],
    stopIf: ["احمرارٌ لا يزول أو فقاعةٌ في القدم السليمة، أو ضعفُ توازن، أو تعبٌ شديد أو ضيقُ نفس، أو ألمٌ في الصدر.",
      "Redness that does not fade or a blister on the sound foot, poor balance, marked fatigue or breathlessness, or chest pain."],
    equipment: ["القضبانُ المتوازية، ومشّايةٌ بأربع أرجل بارتفاع الرسغ أو عكّازان، وحذاءٌ مغلقٌ ثابت للقدم السليمة.",
      "The parallel bars, a four-legged frame set at wrist height or crutches, and a closed, stable shoe for the sound foot."],
    doseNote: ["نوباتٌ قصيرة داخل الجلسة؛ وفي البيت بعد أن يتحقّق المعالجُ من الأمان والبيت.", "Short bouts within the session; at home only after the therapist has checked safety and the home."],
    images: [
      { key: "walker-hop-to-1", ar: "مبتورُ ساقٍ يمشي بالمشّاية قفزاً على ساقه السليمة", en: "A leg amputee walking with a frame, hopping on the sound leg", search: "amputee walking frame hop to gait sound leg" },
      { key: "seated-stair-climbing-1", ar: "مبتورٌ يصعد الدرجَ جالساً يدفع بيديه وساقه السليمة", en: "An amputee going up the stairs sitting, pushing with the hands and the sound leg", search: "bottom shuffle stairs amputee seated stair climbing" },
    ],
  },
  {
    code: "arm-ergometer", nameAr: "جهاز تدوير الذراعين (أو الدرّاجة بالساق السليمة)", nameEn: "Arm ergometer (or sound-leg cycling)",
    kind: "aerobic", region: "whole_body", homeSuitable: false,
    purpose: ["المشيُ بالطرف يستهلك طاقةً أكثر من المشي الطبيعيّ، وبعد بترٍ فوق الركبة أكثرَ بكثير — واللياقةُ تتنبّأ بالمشي: مَن بلغ ٣٠ واط على جهاز تدوير الذراعين عند بدء التأهيل بعد بترٍ وعائيٍّ فوق الركبة رُجّح أن يمشي في البيت بالطرف (Erjavec 2014)، وتدريبٌ هوائيٌّ ستّةَ أسابيع رفع العتبةَ اللاهوائية ٣٦٪ (Chin 2001).",
      "Walking with a prosthesis costs more energy than normal walking, and much more above the knee — and fitness predicts walking: after a vascular above-knee amputation, reaching 30 W on an arm ergometer at the start of rehabilitation made indoor walking with a prosthesis likely (Erjavec 2014), and six weeks of aerobic training raised the anaerobic threshold by 36% (Chin 2001)."],
    start: ["جالسٌ أمام جهاز تدوير الذراعين على كرسيٍّ ثابت أو في الكرسيّ المتحرّك المقفول، والمحورُ بمستوى الكتفين أو تحته قليلاً.", "Sitting at the arm ergometer on a stable chair or in the locked wheelchair, with the axle at or slightly below shoulder height."],
    steps: [[
      "قِس النبضَ والضغطَ قبل البدء، ومريضُ السكّري سكّرَه.",
      "إحماءٌ دقيقتين أو ثلاثاً بمقاومةٍ خفيفة.",
      "دوّر بإيقاعٍ ثابت بجهدٍ متوسّط (يتكلّم بجملٍ قصيرة — ١١–١٣ من ٢٠ على مقياس بورغ) دقيقةً أو دقيقتين، ثمّ استرح دقيقة.",
      "كرّر حتى ١٠–١٥ دقيقة، ثمّ تهدئةٌ دقيقتين.",
      "قِس النبضَ بعد الانتهاء، وسجّل الواطَ والمدّة.",
    ], [
      "Check pulse and blood pressure before starting, and blood sugar in diabetes.",
      "Warm up for two or three minutes at light resistance.",
      "Crank at a steady rhythm at moderate effort (able to talk in short sentences — 11–13 out of 20 on the Borg scale) for one or two minutes, then rest a minute.",
      "Repeat up to 10–15 minutes, then cool down for two minutes.",
      "Check the pulse at the end, and record the watts and the time.",
    ]],
    cues: [[
      "حبسُ النفس وشدُّ الكتفين ⟵ تنفّسٌ منتظم وكتفان مرتخيان.",
      "جهدٌ لا يسمح بالكلام ⟵ أخفّ؛ «متوسّط» يعني الكلامَ بجملٍ قصيرة.",
      "الجلوسُ مائلاً إلى جهة الجذع ⟵ الجذعُ مستقيمٌ في المنتصف.",
    ], [
      "Holding the breath and tensing the shoulders → steady breathing and relaxed shoulders.",
      "Effort too hard to talk → lighter; 'moderate' means talking in short sentences.",
      "Sitting tilted towards the amputated side → trunk upright in the middle.",
    ]],
    easier: ["نوباتٌ من دقيقةٍ واحدة ومقاومةٌ أخفّ.", "One-minute bouts and lighter resistance."],
    harder: ["١٥–٢٠ دقيقةً متّصلة، أو مقاومةٌ أعلى بخطواتٍ من ١٠ واط؛ أو الدرّاجةُ الثابتة بالساق السليمة مثبّتةً على الدوّاسة لمن يناسبه.",
      "15–20 minutes continuously, or higher resistance in 10 W steps; or a stationary bike with the sound foot strapped to the pedal for those it suits."],
    stopIf: ["ألمٌ في الصدر، أو خفقانٌ غيرُ منتظم، أو ضيقُ نفسٍ شديد، أو دوخة، أو أعراضُ هبوط السكّر — توقّف وأخبر المعالج.",
      "Chest pain, an irregular heartbeat, marked breathlessness, dizziness, or symptoms of low blood sugar — stop and tell the therapist."],
    equipment: ["جهازُ تدوير الذراعين أو درّاجةٌ ثابتة، وجهازُ ضغطٍ ونبض، ومقياسُ سكّرٍ لمرضى السكّري.", "An arm ergometer or a stationary bike, a blood pressure and pulse monitor, and a glucose meter for patients with diabetes."],
    doseNote: ["١٠–١٥ دقيقةً في الجلسة بنوبات، ثمّ ١٥–٢٠ متّصلة؛ وفي البيت دفعُ الكرسيّ ٢٠–٣٠ دقيقةً يومياً بقدر ما يسمح المعالج.",
      "10–15 minutes per session in bouts, then 15–20 continuous; at home, 20–30 minutes of wheeling a day as the therapist allows."],
    images: [{ key: "arm-ergometer-1", ar: "جالسٌ يدوّر جهازَ تدوير الذراعين", en: "Seated, cranking an arm ergometer", search: "arm crank ergometer amputee exercise" }],
  },
  {
    code: "phantom-mirror-therapy", nameAr: "العلاج بالمرآة للألم الشبحيّ", nameEn: "Mirror therapy for phantom limb pain",
    kind: "motor_control", region: "whole_body",
    purpose: ["يرى المريضُ في المرآة الساقَ السليمة مكانَ المبتورة وهي تتحرّك — فيخفّ عند بعضهم الألمُ الشبحيّ. يقترحه دليلُ VA/DoD 2024 (توصيةٌ ضعيفة)، وتجربةٌ على مبتوري الألغام في كمبوديا خفّضت الألمَ إلى أقلّ من النصف في مجموعاتها كلّها (Ol 2018)، ومراجعةُ التجارب المقارنة بالوهميّ لم تجد فرقاً (Guémann 2023) — فهو رخيصٌ بلا ضررٍ معروف، يُجرَّب لمن يتألّم ويُقاس قبله وبعده.",
      "The patient watches the sound leg in the mirror in place of the missing one as it moves — and for some, phantom pain eases. VA/DoD 2024 suggests it (weak recommendation), a trial in landmine amputees in Cambodia more than halved pain in all its groups (Ol 2018), and a review of placebo-controlled trials found no difference (Guémann 2023) — so it is cheap with no known harm, tried for those in pain and measured before and after."],
    start: ["جالسٌ على الأرض أو على سريرٍ والساقان ممدودتان، ومرآةٌ طويلة قائمة بين الساقين وجهُها إلى الساق السليمة، والجذعُ خلفها لا يُرى.",
      "Sitting on the floor or a bed with both legs out straight, and a long upright mirror between the legs facing the sound leg, with the residual limb hidden behind it."],
    steps: [[
      "انظر إلى انعكاس الساق السليمة في المرآة كأنّها الساقُ المبتورة.",
      "حرّك الساقَ السليمة ببطء: اسحب أصابعَ القدم وادفعها، ثمّ أدِر الكاحل، ثمّ اثنِ الركبةَ ومدّها.",
      "تخيّل الساقَ المبتورة تتحرّك الحركةَ نفسَها خلف المرآة، وحرّك الجذعَ معها إن استطعت.",
      "إن كانت الساقُ الشبحيّة «متشنّجةً» في وضعٍ مؤلم: حرّك السليمةَ نحو الوضع المريح ببطء.",
      "استمرّ ٥ دقائق صباحاً ومساءً، وسجّل الألمَ من ١٠ قبلها وبعدها.",
    ], [
      "Look at the reflection of the sound leg in the mirror as if it were the missing leg.",
      "Move the sound leg slowly: pull the toes up and push them down, then circle the ankle, then bend and straighten the knee.",
      "Imagine the missing leg making the same movement behind the mirror, and move the residual limb with it if you can.",
      "If the phantom leg feels 'cramped' in a painful position: slowly move the sound leg towards a comfortable position.",
      "Continue for 5 minutes morning and evening, and score the pain out of 10 before and after.",
    ]],
    cues: [[
      "النظرُ إلى الجذع خلف المرآة ⟵ النظرُ إلى المرآة وحدها.",
      "حركاتٌ سريعة ⟵ بطيئةٌ واضحة.",
      "مرآةٌ قصيرة لا تُخفي الجذع ⟵ مرآةٌ طويلة (نحو ٣٠ × ١٢٠ سم) أو مرآةُ باب.",
    ], [
      "Looking at the residual limb behind the mirror → look only at the mirror.",
      "Fast movements → slow, clear ones.",
      "A short mirror that does not hide the limb → a long one (about 30 × 120 cm) or a door mirror.",
    ]],
    easier: ["النظرُ إلى المرآة بلا حركةٍ أوّلاً، ثمّ حركةٌ واحدة.", "Looking at the mirror without moving at first, then a single movement."],
    harder: ["حركاتٌ أكثر تعقيداً، أو مع لمس الساق السليمة باليد (المرآةُ مع اللمس كانت أفضلَ قليلاً — Ol 2018).", "More complex movements, or touching the sound leg with the hand (mirror plus touch did slightly better — Ol 2018)."],
    stopIf: ["ألمٌ يزيد، أو دوخة، أو ضيقٌ نفسيّ — توقّف؛ ومَن يزيد ألمُه يُحال إلى التخيّل الحركيّ المتدرّج بيد معالجٍ متمرّس.",
      "Rising pain, dizziness or distress — stop; anyone whose pain gets worse is referred for graded motor imagery with an experienced therapist."],
    equipment: ["مرآةٌ طويلة قائمة، وفرشةٌ أو سرير.", "A long upright mirror, and a mat or bed."],
    doseNote: ["٥ دقائق مرّتين يومياً لأربعة أسابيع (Ol 2018) — لمن يتألّم وحده.", "5 minutes twice a day for four weeks (Ol 2018) — only for those in pain."],
    images: [{ key: "phantom-mirror-therapy-1", ar: "مبتورُ ساقٍ جالسٌ ومرآةٌ طويلة بين ساقيه تعكس ساقَه السليمة", en: "A leg amputee sitting with a long mirror between the legs reflecting the sound leg", search: "mirror therapy phantom limb pain leg amputee" }],
  },
];

export const PROTOCOL: ProtocolContentSeed = {
  code: "lower-limb-preprosthetic-adult",
  summary: [
    "تأهيلُ ما قبل الطرف الصناعيّ السفليّ عند البالغين (Pre-prosthetic rehabilitation) — بعد بترٍ تحت الركبة (Transtibial) أو فوقها (Transfemoral)، لسببٍ وعائيّ أو سكّريّ أو إصابةٍ وانفجار، من وصول المريض إلى المركز حتى يجهز جذعُه وجسمُه لأخذ قالب الطرف. " +
    "الأدلّةُ متّفقةٌ على ما يُفعل (VA/DoD 2024 · BACPAR 2025 · WHO 2023): البدءُ مبكّراً، وحمايةُ الجذع وتشكيلُه بالرباط الضاغط، ومنعُ تيبّس الورك والركبة، والتقوية، والتوازنُ على الساق السليمة، والانتقالُ والكرسيّ المتحرّك، والتثقيفُ ومنعُ السقوط — ودليلُها كلُّه منخفضُ اليقين أو إجماع، ولا دليلَ على عدد الجلسات (Heyns 2025). " +
    "ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة: الحمايةُ والحركةُ المبكّرة، ثمّ التقويةُ وتشكيلُ الجذع، ثمّ الاستعدادُ للقالب — والإحالةُ للقالب بمعايير الجاهزية لا بالعدد (التئامُ الجرح، وثباتُ محيط الجذع، وحدُّ التيبّس، والوقوفُ على الساق السليمة). " +
    "والجرحُ والقدمُ السليمة يُفحصان في كلّ جلسة، ومريضُ القلب والسكّري والشرايين يُراقب نبضُه وضغطُه وسكّرُه، ومصابُ الانفجار يُفحص لإصاباته الأخرى.",
    "Pre-prosthetic rehabilitation of the lower limb in adults — after a below-knee (transtibial) or above-knee (transfemoral) amputation for vascular disease, diabetes, injury or blast, from arrival at the centre until the residual limb and the body are ready for casting the socket. " +
    "Guidelines agree on what to do (VA/DoD 2024 · BACPAR 2025 · WHO 2023): start early, protect and shape the residual limb with compression, prevent hip and knee contracture, strengthen, train balance on the sound leg, teach transfers and the wheelchair, educate and prevent falls — but all of it rests on low-certainty evidence or consensus, and there is no evidence on the number of sessions (Heyns 2025). " +
    "Three phases with session ranges and written progression criteria: protection and early movement, then strengthening and shaping the residual limb, then readiness for casting — with referral for casting by readiness criteria, not by count (healed wound, stable limb circumference, contracture limits, standing on the sound leg). " +
    "The wound and the sound foot are checked every session, patients with heart disease, diabetes or arterial disease have pulse, blood pressure and blood sugar monitored, and blast casualties are checked for their other injuries.",
  ],
  goals: [
    "• جرحٌ ملتئمٌ وجذعٌ ثابتُ الحجم جاهزٌ للقالب: محيطُه لا يتغيّر أكثرَ من ٠٫٥ سم في ثلاثة قياساتٍ بين كلٍّ منها يومان.\n" +
    "• لا تيبّسَ يمنع القالب: الركبةُ تستقيم أو ينقصها ١٠° على الأكثر (تحت الركبة)، والوركُ يستقيم أو ينقصه ١٥° على الأكثر (فوق الركبة).\n" +
    "• استقلالٌ في السرير والانتقال (والمرحاضِ العربيّ والأرضِ إن كانا في البيت) والكرسيّ المتحرّك — BAMS ٨ من ٨ لمبتور الساق الواحدة.\n" +
    "• وقوفٌ على الساق السليمة ١٥–٣٠ ثانية بلا يدين، وباسطاتُ الورك ومبعداتُه ٤ من ٥ فأكثر.\n" +
    "• لياقةٌ للمشي بالطرف: تحسّنٌ على جهاز تدوير الذراعين، و٣٠ واط لمبتور فوق الركبة الوعائيّ (Erjavec 2014).\n" +
    "• ألمٌ شبحيّ وألمُ جذعٍ تحت السيطرة، ويعرف المريضُ كيف يديرهما.\n" +
    "• يعرف كيف ينهض من الأرض وماذا يفعل إن لم يستطع، ويحمي قدمَه السليمة، ويؤدّي برنامجَه المنزليّ وحده.\n" +
    "(حدُّ المحيط وحدودُ التيبّس اقتراحٌ لا دليل — يقرّرها المشرف.)",
    "• A healed wound and a residual limb of stable volume ready for casting: circumference changing by no more than 0.5 cm over three measurements two days apart.\n" +
    "• No contracture that prevents casting: the knee straight or within 10° (below the knee), the hip straight or within 15° (above the knee).\n" +
    "• Independence in bed, transfers (including a squat toilet and the floor if the home has them) and the wheelchair — BAMS 8 of 8 for a single-leg amputee.\n" +
    "• Standing on the sound leg for 15–30 seconds without hands, and hip extensors and abductors at 4/5 or better.\n" +
    "• Fitness for prosthetic walking: improvement on the arm ergometer, and 30 W for a vascular above-knee amputee (Erjavec 2014).\n" +
    "• Phantom and residual-limb pain under control, with the patient knowing how to manage them.\n" +
    "• Knows how to get up from the floor and what to do if unable, protects the sound foot, and does the home programme independently.\n" +
    "(The circumference and contracture limits are proposals, not evidence — the supervisor decides them.)",
  ],
  assessment: [
    "في الجلسة الأولى، ثمّ عند كلّ انتقالٍ بين المراحل، وفي الإحالة للقالب:\n" +
    "• الجرحُ والجلد: الالتئامُ والإفراز، وعلاماتُ الالتهاب (رائحة، حرارة، احمرارٌ ينتشر، حوافُّ تنفتح)، والندبةُ وحركتُها، ونتوءاتُ العظم والورمُ العصبيّ المؤلم.\n" +
    "• محيطُ الجذع (مقياسٌ في القائمة): بشريطٍ كلَّ ٤–٥ سم من نقطةٍ ثابتة (حدبةُ الظنبوب تحت الركبة، ومعلمٌ في الفخذ فوقها)، في الوقت نفسِه من اليوم — موثوقٌ عند مبتور تحت الركبة (Armitage 2019)؛ والجاهزيةُ ثلاثةُ قياساتٍ بين كلٍّ منها يومان بلا تغيّر (Sanders & Fatone 2011)، والسماحُ ٠٫٥ سم اقتراح.\n" +
    "• مدى الحركة (بسطُ الورك مقياسٌ في القائمة): بسطُ الورك بوضعية توماس (سالبٌ مع التيبّس)، وبسطُ الركبة تحت البتر — والتيبّسُ ٢٥° فأكثر «شديد» ويُركَّب له الطرفُ بقالبٍ معدَّل (Poonsiri 2022).\n" +
    "• القوّة: الاختبارُ اليدويّ من ٥ لباسطات الورك ومبعداته بجهتيه وللساق السليمة — وقوّةُ باسطات الورك أقوى ما تنبّأ بالمشي ستّ دقائق بالطرف (Raya 2010).\n" +
    "• مؤشّرُ الحركة للمبتور بلا طرف (AMPnoPRO — مقياسٌ في القائمة، من ٤٣): موثوق (Gailey 2002)، وتنبّأ بالمشي دقيقتين وTUG ومستوى K في نهاية التأهيل (Spaan 2017) — لكنّ أدنى تغيّرٍ حقيقيّ (٣٫٤ نقطة) مأخوذٌ من مستعملي الطرف (Resnik 2011)، ومتوسّطاتُ مستويات K فيه متداخلة: لا يُقرَّر مستوى K منه وحده. ولا يُجرى لمبتور الطرفين فوق مفصل القدم.\n" +
    "• الألمُ الشبحيّ (مقياسٌ في القائمة، من ١٠) وألمُ الجذع والإحساسُ الشبحيّ كلٌّ وحده، وعددُ النوبات في اليوم — والتغيّرُ المهمّ نحو نقطتين أو ٣٠٪.\n" +
    "• مقياسُ الحركة الأساسيّ للمبتور (BAMS، من ٨) لمن لا يمشي: الجلوسُ من الاستلقاء، والانتقالُ إلى الكرسيّ، والتنقّلُ به في الداخل، والوقوفُ على الساق السليمة — والتغيّرُ بنقطةٍ واحدة حقيقيّ (Kristensen 2018).\n" +
    "• الوقوفُ على الساق السليمة بالثواني (بإسنادٍ ومهلةٍ ثابتين في كلّ قياس) — من أكثر ما تكرّر في التنبّؤ بالمشي بالطرف (Schoppen 2003 · Sansam 2009 · Spaan 2017).\n" +
    "• TUG والمشيُ دقيقتين بالمشّاية أو العكّازين لمن يستطيع — TUG موثوقٌ عند المبتورين (Schoppen 1999)، وفي العراق أقوى ما ارتبط بالنشاط البدنيّ (Al-Falahi 2024)؛ والقدمُ السليمة عند السكّريّ تُحمى منه.\n" +
    "• مهاراتُ الكرسيّ: استبيانُ اختبار مهارات الكرسيّ المتحرّك بالعربية (WST-Q) — موثوق (Sarsak 2026).\n" +
    "• اللياقة: أعلى واطٍ على جهاز تدوير الذراعين — ٣٠ واط فأكثر عند البدء رجّح المشيَ في البيت بالطرف بعد بترٍ وعائيٍّ فوق الركبة (Erjavec 2014).\n" +
    "• الاستقلالُ اليوميّ (Barthel من ١٠٠)، والإدراك، والمزاجُ والضغطُ النفسيّ (BACPAR 2025 — 6.3)، والبيت: الدرج، والمرحاض، والنومُ على الأرض.\n" +
    "• القدمُ السليمة: الإحساسُ والنبضُ والجلدُ والحذاء.\n" +
    "ولا يصلح قبل الطرف: Houghton وAMPPRO ومستوى K بالطرف — تُجرى في بروتوكول «التدريب على المشي بالطرف».",
    "At the first session, at every phase change, and at referral for casting:\n" +
    "• Wound and skin: healing and discharge, signs of infection (smell, heat, spreading redness, edges opening), the scar and its mobility, bony prominences and a painful neuroma.\n" +
    "• Residual-limb circumference (a listed measure): with a tape every 4–5 cm from a fixed point (the tibial tubercle below the knee, a thigh landmark above it), at the same time of day — reliable below the knee (Armitage 2019); readiness is three measurements two days apart without change (Sanders & Fatone 2011), and the 0.5 cm tolerance is a proposal.\n" +
    "• Range of motion (hip extension is a listed measure): hip extension in the Thomas position (negative with contracture), and knee extension below the knee — a contracture of 25° or more is 'severe' and is fitted with an adapted socket (Poonsiri 2022).\n" +
    "• Strength: manual muscle testing out of 5 for the hip extensors and abductors on both sides and the sound leg — hip extensor strength was the strongest predictor of the six-minute walk with a prosthesis (Raya 2010).\n" +
    "• Amputee Mobility Predictor without prosthesis (AMPnoPRO — a listed measure, out of 43): reliable (Gailey 2002), and predicted the two-minute walk, TUG and K-level at the end of rehabilitation (Spaan 2017) — but the minimal detectable change (3.4 points) comes from prosthesis users (Resnik 2011), and its K-level means overlap: do not assign a K-level from it alone. Not done for bilateral amputation above the ankle.\n" +
    "• Phantom pain (a listed measure, out of 10), residual-limb pain and phantom sensation recorded separately, with episodes per day — an important change is about 2 points or 30%.\n" +
    "• Basic Amputee Mobility Score (BAMS, out of 8) for those not walking: lying to sitting, transfer to the chair, indoor wheelchair mobility, and standing on the sound leg — a one-point change is real (Kristensen 2018).\n" +
    "• Standing on the sound leg in seconds (with the same support and time limit each time) — among the most repeated predictors of prosthetic walking (Schoppen 2003 · Sansam 2009 · Spaan 2017).\n" +
    "• TUG and the two-minute walk with a frame or crutches for those who can — TUG is reliable in amputees (Schoppen 1999) and in Iraq was the strongest correlate of physical activity (Al-Falahi 2024); protect the diabetic sound foot from it.\n" +
    "• Wheelchair skills: the Arabic Wheelchair Skills Test Questionnaire (WST-Q) — reliable (Sarsak 2026).\n" +
    "• Fitness: peak watts on the arm ergometer — 30 W or more at the start made indoor prosthetic walking likely after a vascular above-knee amputation (Erjavec 2014).\n" +
    "• Daily independence (Barthel out of 100), cognition, mood and distress (BACPAR 2025 — 6.3), and the home: stairs, toilet, sleeping on the floor.\n" +
    "• The sound foot: sensation, pulses, skin and footwear.\n" +
    "Not applicable before the prosthesis: Houghton, AMPPRO and prosthetic K-level — they belong to the 'Prosthetic gait training' protocol.",
  ],
  exercises: [
    "البرنامجُ على ثلاث مراحل بالبطاقات في «البرنامج على مراحل»؛ والجلسةُ ٥٠ دقيقة نحو:\n" +
    "• ٥ دقائق: الجرحُ والجلدُ والقدمُ السليمة، والنبضُ والضغط (والسكّر)، والألمُ من ١٠.\n" +
    "• ١٠ دقائق: الوضعياتُ والتمطيط (الورك والركبة).\n" +
    "• ١٥ دقيقة: التقوية — الورك بجهتيه، والركبةُ تحت البتر، والساقُ السليمة، والذراعان، والجذع.\n" +
    "• ١٠ دقائق: الوظيفة — الانتقال، والكرسيّ، والتوازن، والمشّاية.\n" +
    "• ٥–١٠ دقائق: جهازُ تدوير الذراعين.\n" +
    "• ٥ دقائق: التثقيفُ ومراجعةُ البرنامج المنزليّ.\n" +
    "والجرعةُ العامّة اقتراحٌ (لا تجاربَ للجرعة): ١–٢ مجموعة × ٨–١٢ تكراراً بجهدٍ متوسّط (٤–٦ من ١٠) ثمّ ٣ مجموعاتٍ بمقاومة، والثباتُ ٥–١٠ ثوانٍ.\n" +
    "والبرنامجُ المنزليّ يوميّ بدفتر متابعة — كالتجربة الكبيرة الوحيدة في بلدٍ متوسّط الدخل (Godlwana 2020، جنوب أفريقيا): تحسّنت المشاركةُ وجودةُ الحياة بعد ثلاثة أشهر وتلاشى أكثرُها بعد ستّة، فالمتابعةُ تستمرّ. " +
    "والبرامجُ المشرَف عليها الأعلى شدّةً بدت أنفع من غيرها (Wijekoon 2023).\n" +
    "ولا تُستعمل أدواتُ النقل وقوفاً للمبتور بلا طرف (BACPAR 2025)؛ ومساعدُ المشي المبكّر (PPAM) ليس في أجهزة المركز، ولا يُستعمل إلّا بيد معالجٍ مدرَّب عليه.",
    "The programme runs in three phases with the cards under 'Programme by phase'; a 50-minute session is roughly:\n" +
    "• 5 minutes: wound, skin and sound foot, pulse and blood pressure (and blood sugar), pain out of 10.\n" +
    "• 10 minutes: positioning and stretching (hip and knee).\n" +
    "• 15 minutes: strengthening — both hips, the knee below the amputation, the sound leg, the arms and the trunk.\n" +
    "• 10 minutes: function — transfers, the wheelchair, balance, the frame.\n" +
    "• 5–10 minutes: the arm ergometer.\n" +
    "• 5 minutes: education and home programme review.\n" +
    "The general dose is a proposal (there are no dose trials): 1–2 sets × 8–12 repetitions at moderate effort (4–6 out of 10), then 3 sets with resistance, and holds of 5–10 seconds.\n" +
    "The home programme is daily with a diary — as in the only large trial in a middle-income country (Godlwana 2020, South Africa): participation and quality of life improved at three months and most of it faded by six, so follow-up continues. " +
    "Supervised, higher-intensity programmes looked more promising than others (Wijekoon 2023).\n" +
    "Standing transfer aids are not used for an amputee without a prosthesis (BACPAR 2025); an early walking aid (PPAM) is not among the centre's devices and is used only by a therapist trained in it.",
  ],
  contraindications: [
    "• علاماتُ التهاب الجرح أو الجذع (حرارة، احمرارٌ ينتشر، رائحة، إفرازٌ جديد، حوافُّ تنفتح) أو حمّى — يُوقف تمرينُ الجذع ويُحال إلى الجرّاح في اليوم نفسِه.\n" +
    "• اشتباهُ جلطةٍ في الوريد العميق (ألمٌ وتورّمٌ وحرارةٌ في الفخذ أو ساق الجهة السليمة) — لا تمرينَ ولا تحفيزَ كهربائيّ حتى تُستبعد (Houghton 2010)، وهي ليست نادرةً بعد البتر الكبير.\n" +
    "• ألمُ صدرٍ أو خفقانٌ أو ضيقُ نفسٍ في الراحة، أو ضغطٌ انقباضيّ فوق ١٨٠ تقريباً، أو نبضٌ في الراحة فوق ١١٠ تقريباً (حدودٌ مقترحة) — لا جهدَ حتى يراه الطبيب.\n" +
    "• هبوطُ السكّر أو ارتفاعُه الشديد.\n" +
    "• الحرارةُ (الكمادات، والأشعةُ تحت الحمراء، والتيكار) على جلدٍ ضعيف الإحساس أو ناقص التروية أو على جرح، والتحفيزُ حيث لا يحسّ المريضُ بالشدّة (Houghton 2010).\n" +
    "• الانبطاحُ مع ضيق النفس، أو جرحٍ في البطن أو الصدر، أو جراحةٍ حديثة في العمود الفقريّ.\n" +
    "• القفزُ بالمشّاية على قدمٍ سليمة فيها قرحةٌ أو فقاعة.",
    "• Signs of infection in the wound or the limb (heat, spreading redness, smell, new discharge, edges opening) or fever — stop residual-limb exercise and refer to the surgeon the same day.\n" +
    "• Suspected deep vein thrombosis (pain, swelling and heat in the thigh or the sound calf) — no exercise and no electrical stimulation until it is excluded (Houghton 2010); it is not rare after major amputation.\n" +
    "• Chest pain, palpitations or breathlessness at rest, systolic blood pressure above about 180, or a resting pulse above about 110 (proposed limits) — no exertion until the doctor has seen the patient.\n" +
    "• Low blood sugar, or very high blood sugar.\n" +
    "• Heat (hot packs, infrared, Tecar) over skin with poor sensation or blood supply or over a wound, and electrical stimulation where the patient cannot feel the intensity (Houghton 2010).\n" +
    "• Prone lying with breathlessness, an abdominal or chest wound, or recent spinal surgery.\n" +
    "• Hopping with a frame on a sound foot with an ulcer or blister.",
  ],
  precautions: [
    "• المريضُ الوعائيّ والسكّريّ: القلبُ والضغطُ والسكّرُ قبل الجهد، والجلسةُ بفترات راحة، والجهدُ بمقياس بورغ. وفي العراق الحربُ أوّلُ الأسباب المسجّلة وتحت الركبة أكثرُ المستويات (Kokz 2026).\n" +
    "• القدمُ السليمة: خطرُ بترها ٥٫٧٪ في سنة و١١٫٥٪ في خمس سنوات (Glaser 2013) — فحصٌ يوميّ، وحذاءٌ مغلقٌ مناسب، ولا مشيَ حافياً، والقفزُ قليل، وإحالةٌ مبكّرة لأيّ جرح (BACPAR 2025 — 5.3).\n" +
    "• السقوط: ٦١٪ سقطوا بين العملية والتأهيل (Vu 2019)، وكثيراً ما ينسى المريضُ ليلاً أنّ ساقه مبتورة فيقف عليها (BACPAR 2025 — 5.12.8) — ضوءٌ ليليّ، والكرسيّ بجانب السرير، وتعليمُ النهوض من الأرض.\n" +
    "• مصابُ الانفجار والإصابة: إصاباتٌ أخرى (الرأس والكسور والأعصاب والسمع)، والتعظّمُ حول الجذع شائع (٦٣٪ من مبتوري الحرب — Potter 2007): ألمٌ وتورّمٌ ونقصُ مدىً وكتلةٌ تُحسّ ⟵ تصوير؛ وكذلك الورمُ العصبيّ ونتوءُ العظم.\n" +
    "• الصحّةُ النفسية: الحزنُ والقلقُ والاكتئاب شائعة — اسأل، وأحِل للدعم النفسيّ، ورتّب لقاءَ مبتورٍ آخر إن أمكن (BACPAR 2025 — 6)؛ ولا تَعِد بطرفٍ قبل قرار الفريق.\n" +
    "• التدخينُ وسوءُ التغذية يؤخّران الالتئام — نصيحةٌ وإحالة (BACPAR 2025 — 5.4.5).\n" +
    "• حجمُ الجذع يتغيّر لأشهر، وأكثرُ عند الوعائيّ (Sanders & Fatone 2011) — والقالبُ يُطلب بالمعيار لا بالتاريخ.\n" +
    "• مبتورُ الطرفين: الكرسيُّ أساسيّ، ومحورُ العجلتين إلى الخلف أو مانعا انقلاب، والانتقالُ من الأمام أو الخلف (HI 2020).",
    "• Vascular and diabetic patients: heart, blood pressure and blood sugar before exertion, sessions split with rests, and effort rated on the Borg scale. In Iraq, war is the leading recorded cause and below-knee the commonest level (Kokz 2026).\n" +
    "• The sound foot: its risk of amputation is 5.7% at one year and 11.5% at five years (Glaser 2013) — daily inspection, a suitable closed shoe, no barefoot walking, little hopping, and early referral for any wound (BACPAR 2025 — 5.3).\n" +
    "• Falls: 61% fell between surgery and rehabilitation (Vu 2019), often because at night the patient forgets the leg is gone and stands on it (BACPAR 2025 — 5.12.8) — a night light, the wheelchair beside the bed, and teaching how to get up from the floor.\n" +
    "• Blast and trauma casualties: other injuries (head, fractures, nerves, hearing), and heterotopic ossification around the residual limb is common (63% of combat amputees — Potter 2007): pain, swelling, lost range or a palpable mass → imaging; likewise a neuroma or bone spur.\n" +
    "• Mental health: grief, anxiety and depression are common — ask, refer for psychological support, and arrange to meet another amputee if possible (BACPAR 2025 — 6); do not promise a prosthesis before the team decides.\n" +
    "• Smoking and poor nutrition delay healing — advice and referral (BACPAR 2025 — 5.4.5).\n" +
    "• Residual-limb volume changes for months, more in vascular patients (Sanders & Fatone 2011) — casting is requested by the criteria, not by the date.\n" +
    "• Bilateral amputation: the wheelchair is essential, with the rear axle set back or anti-tippers, and transfers forwards or backwards (HI 2020).",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "VA/DoD Clinical Practice Guideline for the Rehabilitation of Individuals with Lower Limb Amputation (version 3.0)", org: "U.S. Department of Veterans Affairs and Department of Defense", year: 2024, url: "https://www.healthquality.va.gov/guidelines/Rehab/amp/" },
    { title: "Clinical guidelines for the pre and post-operative physiotherapy management of adults with lower limb amputations (3rd edition)", org: "British Association of Chartered Physiotherapists in Limb Absence Rehabilitation (BACPAR)", year: 2025, url: "https://www.bacpar.org/resources/healthcare-professionals-resources/pre-and-post-op-guidelines/" },
    { title: "Toolbox of Outcome Measures", org: "British Association of Chartered Physiotherapists in Limb Absence Rehabilitation (BACPAR)", year: 2014, url: "https://www.bacpar.org/Data/Resource_Downloads/ToolboxofOutcomeMeasures.pdf" },
    { title: "Package of interventions for rehabilitation: module 2: musculoskeletal conditions", org: "World Health Organization", year: 2023, url: "https://www.who.int/publications/i/item/9789240071100" },
    { title: "Early Rehabilitation in Conflicts and Disasters", org: "Humanity & Inclusion (Lathia, Skelton & Clift, eds.)", year: 2020, url: "https://www.hi.org/en/early-rehabilitation-in-conflicts-and-disasters" },
    { title: "Overview of Cochrane Systematic Reviews for rehabilitation interventions in persons with amputation: a mapping synthesis", org: "European Journal of Physical and Rehabilitation Medicine (Heyns et al.)", year: 2025, url: "https://doi.org/10.23736/s1973-9087.25.08664-2" },
    { title: "Interventions for motor rehabilitation in people with transtibial amputation due to peripheral arterial disease or diabetes", org: "Cochrane Database of Systematic Reviews (Aledi et al.)", year: 2023, url: "https://doi.org/10.1002/14651858.cd013711.pub2" },
    { title: "Rigid dressings versus soft dressings for transtibial amputations", org: "Cochrane Database of Systematic Reviews (Kwah et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd012427.pub2" },
    { title: "Do rigid dressings reduce the time from amputation to prosthetic fitting? A systematic review and meta-analysis", org: "Annals of Vascular Surgery (Churilov et al.)", year: 2014, url: "https://doi.org/10.1016/j.avsg.2014.05.002" },
    { title: "Residual limb volume change: systematic review of measurement and management", org: "Journal of Rehabilitation Research and Development (Sanders & Fatone)", year: 2011, url: "https://doi.org/10.1682/jrrd.2010.09.0189" },
    { title: "Reliability and Validity of Measurement Tools for Residual Limb Volume in People With Limb Amputations: A Systematic Review", org: "Physical Therapy (Armitage et al.)", year: 2019, url: "https://doi.org/10.1093/ptj/pzz010" },
    { title: "Fitting transtibial and transfemoral prostheses in persons with a severe flexion contracture: problems and solutions - a systematic review", org: "Disability and Rehabilitation (Poonsiri et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2021.1893393" },
    { title: "Predicting walking ability following lower limb amputation: a systematic review of the literature", org: "Journal of Rehabilitation Medicine (Sansam et al.)", year: 2009, url: "https://doi.org/10.2340/16501977-0393" },
    { title: "Effectiveness and Equity in Community-Based Rehabilitation on Pain, Physical Function, and Quality of Life After Unilateral Lower Limb Amputation: A Systematic Review", org: "Archives of Physical Medicine and Rehabilitation (Wijekoon et al.)", year: 2023, url: "https://doi.org/10.1016/j.apmr.2023.02.009" },
    { title: "Risk Factors for Falls in People With a Lower Limb Amputation: A Systematic Review", org: "PM&R (Hunter et al.)", year: 2017, url: "https://doi.org/10.1016/j.pmrj.2016.07.531" },
    { title: "Effectiveness of the Wheelchair Skills Training Program: a systematic review and meta-analysis", org: "Disability and Rehabilitation: Assistive Technology (Keeler et al.)", year: 2019, url: "https://doi.org/10.1080/17483107.2018.1456566" },
    { title: "Effect of mirror therapy in the treatment of phantom limb pain in amputees: A systematic review of randomized placebo-controlled trials does not find any evidence of efficacy", org: "European Journal of Pain (Guémann et al.)", year: 2023, url: "https://doi.org/10.1002/ejp.2035" },
    { title: "Transcutaneous electrical nerve stimulation (TENS) for phantom pain and stump pain following amputation in adults", org: "Cochrane Database of Systematic Reviews (Johnson et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd007264.pub3" },
    { title: "Electrophysical Agents — Contraindications and Precautions: An Evidence-Based Approach to Clinical Decision Making in Physical Therapy", org: "Physiotherapy Canada (Houghton, Nussbaum & Hoens)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "The effect of a home exercise intervention on persons with lower limb amputations: a randomized controlled trial", org: "Clinical Rehabilitation (Godlwana et al.)", year: 2020, url: "https://doi.org/10.1177/0269215519880295" },
    { title: "Mirror therapy for phantom limb and stump pain: a randomized controlled clinical trial in landmine amputees in Cambodia", org: "Scandinavian Journal of Pain (Ol et al.)", year: 2018, url: "https://doi.org/10.1515/sjpain-2018-0042" },
    { title: "The effectiveness of graded motor imagery for reducing phantom limb pain in amputees: a randomised controlled trial", org: "Physiotherapy (Limakatso et al.)", year: 2020, url: "https://doi.org/10.1016/j.physio.2019.06.009" },
    { title: "Outcomes of ultrasound-guided extracorporeal shock wave therapy for painful stump neuroma", org: "Annals of Rehabilitation Medicine (Jung et al.)", year: 2014, url: "https://doi.org/10.5535/arm.2014.38.4.523" },
    { title: "Effects of Adding Neuromuscular Electrical Stimulation to Traditional Military Amputee Rehabilitation", org: "Military Medicine (Talbot et al.)", year: 2017, url: "https://doi.org/10.7205/milmed-d-16-00037" },
    { title: "Transcutaneous electrical nerve stimulation for phantom pain and stump pain in adult amputees", org: "Pain Practice (Mulvey et al.)", year: 2013, url: "https://doi.org/10.1111/j.1533-2500.2012.00593.x" },
    { title: "Effect of endurance training program based on anaerobic threshold (AT) for lower limb amputees", org: "Journal of Rehabilitation Research and Development (Chin et al.)", year: 2001 },
    { title: "Exercise testing as a screening measure for ability to walk with a prosthesis after transfemoral amputation due to peripheral vascular disease", org: "Disability and Rehabilitation (Erjavec et al.)", year: 2014, url: "https://doi.org/10.3109/09638288.2013.833307" },
    { title: "A prospective study of short-term functional outcome after dysvascular major lower limb amputation", org: "International Journal of Orthopaedic and Trauma Nursing (Madsen et al.)", year: 2018, url: "https://doi.org/10.1016/j.ijotn.2017.08.001" },
    { title: "The amputee mobility predictor: an instrument to assess determinants of the lower-limb amputee's ability to ambulate", org: "Archives of Physical Medicine and Rehabilitation (Gailey et al.)", year: 2002, url: "https://doi.org/10.1053/apmr.2002.32309" },
    { title: "Reliability of outcome measures for people with lower-limb amputations: distinguishing true change from statistical error", org: "Physical Therapy (Resnik & Borgia)", year: 2011, url: "https://doi.org/10.2522/ptj.20100287" },
    { title: "Predicting mobility outcome in lower limb amputees with motor ability tests used in early rehabilitation", org: "Prosthetics and Orthotics International (Spaan et al.)", year: 2017, url: "https://doi.org/10.1177/0309364616670397" },
    { title: "Physical, mental, and social predictors of functional outcome in unilateral lower-limb amputees", org: "Archives of Physical Medicine and Rehabilitation (Schoppen et al.)", year: 2003, url: "https://doi.org/10.1016/s0003-9993(02)04952-3" },
    { title: "The Timed \"up and go\" test: reliability and validity in persons with unilateral lower limb amputation", org: "Archives of Physical Medicine and Rehabilitation (Schoppen et al.)", year: 1999, url: "https://doi.org/10.1016/s0003-9993(99)90234-4" },
    { title: "Development and psychometric properties of the Basic Amputee Mobility Score for use in patients with a major lower extremity amputation", org: "Geriatrics & Gerontology International (Kristensen et al.)", year: 2018, url: "https://doi.org/10.1111/ggi.13156" },
    { title: "Impairment variables predicting activity limitation in individuals with lower limb amputation", org: "Prosthetics and Orthotics International (Raya et al.)", year: 2010, url: "https://doi.org/10.3109/03093640903585008" },
    { title: "Predictive factors for successful early prosthetic ambulation among lower-limb amputees", org: "Journal of Rehabilitation Research and Development (Munin et al.)", year: 2001 },
    { title: "Impact of Incision Technique and Post-operative Factors on Time to Prosthetic Fitting following Transtibial Amputation: A SwedeAmp Registry Study", org: "European Journal of Vascular and Endovascular Surgery (Fridriksson et al.)", year: 2026, url: "https://doi.org/10.1016/j.ejvs.2025.10.040" },
    { title: "Risk Factors for Falls in Individuals With Lower Extremity Amputations During the Pre-Prosthetic Phase: A Retrospective Cohort Study", org: "PM&R (Vu et al.)", year: 2019, url: "https://doi.org/10.1002/pmrj.12046" },
    { title: "Fate of the contralateral limb after lower extremity amputation", org: "Journal of Vascular Surgery (Glaser et al.)", year: 2013, url: "https://doi.org/10.1016/j.jvs.2013.06.055" },
    { title: "Heterotopic ossification following traumatic and combat-related amputations. Prevalence, risk factors, and preliminary results of excision", org: "Journal of Bone and Joint Surgery, American volume (Potter et al.)", year: 2007, url: "https://doi.org/10.2106/jbjs.f.00412" },
    { title: "Engineering-based statistical analysis of amputation prevalence and the impact of contributing factors in 4 Iraqi cities (1980-2024)", org: "Chinese Journal of Traumatology (Kokz et al.)", year: 2026, url: "https://doi.org/10.1016/j.cjtee.2025.06.003" },
    { title: "Factors Affecting Physical Activity in Iraqi Patients with Lower Limb Amputation", org: "Medical Journal of the Islamic Republic of Iran (Al-Falahi et al.)", year: 2024, url: "https://doi.org/10.47176/mjiri.38.102" },
    { title: "Wheelchair skills test questionnaire for manual and powered wheelchair users: arabic translation, adaptation, and validation", org: "Frontiers in Rehabilitation Sciences (Sarsak)", year: 2026, url: "https://doi.org/10.3389/fresc.2026.1805871" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة من الجلسة — الوضعياتُ والتمطيط، وتقويةُ الورك بجهتيه والركبة والساق السليمة والذراعين والجذع، والانتقالُ والكرسيّ والتوازن، وجهازُ تدوير الذراعين؛ وبفترات راحةٍ لمرضى القلب والشرايين.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes of the session — positioning and stretching, strengthening of both hips, the knee, the sound leg, the arms and the trunk, transfers, the wheelchair and balance, and the arm ergometer; with rest breaks for heart and arterial patients."],
      note: ["أساسيٌّ في كلّ جلسة — والتمرينُ وحده بدليلٍ، وهو منخفضُ اليقين وأكثرُه من مستعملي الطرف (VA/DoD 2024 توصيةٌ ضعيفةٌ لصالحه · Aledi 2023 لا تجاربَ قبل الطرف)؛ والأدلّةُ متّفقةٌ على مكوّناته (BACPAR 2025 · WHO 2023)، فالقياسُ لكلّ مريضٍ هو الذي يحكم.",
        "Core in every session — exercise is the only intervention with evidence, of low certainty and mostly from prosthesis users (VA/DoD 2024 weak recommendation for · Aledi 2023 no pre-prosthetic trials); guidelines agree on its components (BACPAR 2025 · WHO 2023), so each patient's own measures decide."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Strong, comfortable", durationMin: "15–20" },
      parameters: ["للألم الشبحيّ أو ألم الجذع حين يحدّ من التمرين أو النوم: قطبان على الجذع بعيداً عن الجرح أو فوق مسار العصب المقطوع في الفخذ، بوخزٍ قويٍّ مريحٍ بلا انقباض، قبل التمارين — ولا على جرحٍ ولا على جلدٍ ضعيف الإحساس.",
        "For phantom or residual-limb pain that limits exercise or sleep: two electrodes on the limb away from the wound or over the course of the cut nerve in the thigh, at a strong but comfortable tingling without contraction, before exercise — never over a wound or skin with poor sensation."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم)، وللألم وحده: لا تجاربَ عشوائية في الألم الشبحيّ (Cochrane — Johnson 2015)، وتجربةٌ أوّليةٌ صغيرة خفّفت الألمَ في الراحة والحركة (Mulvey 2013). ولا يُستعمل للتقوية — إضافتُه إلى تمرين الفخذ لم تُفِد (Talbot 2017). ممنوعٌ مع اشتباه جلطة الوريد العميق، وحيث يمنع ضعفُ الإحساس الشعورَ بالشدّة، ومع منظّم ضربات القلب (Houghton 2010).",
        "Rotating adjunct — used by the centre (Saleem), and for pain only: there are no randomised trials in phantom pain (Cochrane — Johnson 2015), and a small pilot reduced pain at rest and on movement (Mulvey 2013). Not used for strengthening — adding it to thigh exercise did not help (Talbot 2017). Contraindicated with suspected deep vein thrombosis, where poor sensation prevents feeling the intensity, and with a pacemaker (Houghton 2010)."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الجذع أو الفخذ قبل التمارين — بلا حرارة، لألم الجذع.",
        "Pulsed electromagnetic field (PEMF) around the residual limb or thigh before exercise — non-thermal, for residual-limb pain."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). ولا دليلَ له في تأهيل المبتور، ولا يُخلط بتحفيز الدماغ المغناطيسيّ (rTMS) الذي جُرّب في ألم مبتوري الألغام — جهازٌ آخر؛ لا يُعطى بدل التمرين، وممنوعٌ مع منظّم ضربات القلب.",
        "Rotating adjunct — used by the centre with good results (Saleem). There is no evidence for it in amputee rehabilitation, and it is not to be confused with transcranial magnetic stimulation (rTMS) tried for landmine amputees' pain — a different device; never instead of exercise, and contraindicated with a pacemaker."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على عضلات مقدّمة الورك والفخذ قبل تمطيطها — نمطٌ سعويّ بدفءٍ خفيف؛ ولا على الجذع ما دام فيه جرحٌ أو ضعفُ إحساسٍ أو تروية، ولا على الندبة.",
        "Over the muscles at the front of the hip and thigh before stretching them — capacitive mode at gentle warmth; never over the residual limb while it has a wound or poor sensation or blood supply, and never over the scar."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). ولا دليلَ له في المبتور، وهو جهازٌ حراريّ: الحرارةُ ممنوعةٌ على جلدٍ ضعيف الإحساس أو ناقص التروية أو على جرح (Houghton 2010) — فلا يُعطى على جذع مريض السكّري أو قاصر الشرايين.",
        "Rotating adjunct — used by the centre (Saleem). There is no evidence for it in amputees, and it heats: heat is contraindicated over skin with poor sensation or blood supply or over a wound (Houghton 2010) — so it is never applied to the residual limb in diabetes or arterial disease."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم في الجلسة — الرباطُ الضاغط (الجورب) يُلبس طوالَ اليوم والليل هو الأساس (BACPAR 2025)، وأكمامُ الضغط الهوائيّ مصمّمةٌ للطرف السليم ولا تجاربَ لها على الجذع؛ وتُتجنّب مع قصور الشرايين والالتهاب والجلطة. وضغطُ الساق السليمة للوقاية من الجلطة بأمر الطبيب وحده.",
        "Not used in the session — the shrinker worn all day and night is the routine (BACPAR 2025), pneumatic sleeves are designed for intact limbs with no residual-limb trials, and they are avoided with arterial disease, infection and thrombosis. Compression of the sound leg to prevent thrombosis only on a doctor's order."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — جهازُ المشي الروبوتيّ يحتاج طرفاً صناعياً، فلا يُستعمل قبله، ولا دليلَ له قبل الطرف.",
        "Not used — the robotic gait trainer needs a prosthesis, so it cannot be used before one, and there is no pre-prosthetic evidence."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا تجاربَ له على الجذع؛ وأدبيّاتُه في قرح القدم السكّرية بيقينٍ منخفضٍ جدّاً، فإن تأخّر التئامُ الجرح فقرارُه لفريق الجروح.",
        "Not used (not mentioned by Saleem) — there are no residual-limb trials; its literature is in diabetic foot ulcers at very low certainty, so delayed wound healing is for the wound team to decide."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا دليلَ له في المبتور ولا في التئام الجروح، والمستمرُّ منه ممنوعٌ مع ضعف الإحساس أو قصور الشرايين الشديد أو فوق جلطة (Houghton 2010).",
        "Not used (not mentioned by Saleem) — there is no evidence for it in amputees or for wound healing, and continuous ultrasound is contraindicated with poor sensation, severe arterial disease or over a thrombosis (Houghton 2010)."] },
    { code: "hot_pack", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم على الجذع ولا على القدم السليمة عند السكّريّ وقاصر الدوران — خطرُ حرقٍ على جلدٍ ضعيف الإحساس أو ناقص التروية أو على جرح (Houghton 2010)؛ وللظهر أو عضلات الجهة السليمة حين يسلم الإحساسُ والتروية بقرار المعالج.",
        "Not used on the residual limb or on the sound foot in diabetes or poor circulation — risk of burns on skin with poor sensation or blood supply or over a wound (Houghton 2010); for the back or sound-side muscles with intact sensation and circulation at the therapist's decision."] },
    { code: "infrared", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم للسبب نفسِه — حرارةٌ سطحية على جلدٍ قد يضعف إحساسُه أو ترويتُه، أو على جرح (Houghton 2010)، بلا دليل.",
        "Not used for the same reason — superficial heat on skin that may have poor sensation or blood supply, or over a wound (Houghton 2010), with no evidence."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم قبل الطرف — ممنوعٌ على جرحٍ لم يلتئم أو ملتهب. ويُنظر فيه لاحقاً على جذعٍ ملتئم لورمٍ عصبيٍّ مؤلم مثبَت (تجربةٌ صغيرة مفتوحة: ١٥٠٠ نبضة أسبوعياً × ٣ تفوّقت على التحفيز وإزالة الحساسية — Jung 2014).",
        "Not used before the prosthesis — contraindicated on an unhealed or infected wound. It may be considered later on a healed limb for a confirmed painful neuroma (a small open trial: 1,500 pulses weekly × 3 beat TENS and desensitisation — Jung 2014)."] },
  ],
  phases: [
    {
      name: ["الحماية والحركة المبكّرة", "Protection and early movement"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الأسبوعُ الأوّل في المركز — وغالباً بعد أسبوعين أو ثلاثة من العملية", "The first week at the centre — usually two to three weeks after surgery"],
      goals: [
        "جرحٌ يُحمى ويُراقب، ووضعياتٌ يعرفها المريضُ ومرافقُه، وركبةٌ تستقيم (تحت الركبة) ووركٌ يبلغ الصفر (فوق الركبة) أو لا نقصَ عن القياس الأوّل، وحركةٌ في السرير وانتقالٌ إلى الكرسيّ وتنقّلٌ به في الداخل وحده (BAMS ٨ من ٨)، وألمٌ في التمرين ٤ من ١٠ أو أقلّ، ورباطٌ ضاغطٌ بدأ حين أذن الجرّاح، وبرنامجٌ منزليّ يوميّ يؤدّى صحيحاً.",
        "A protected, monitored wound; positioning known by the patient and carer; a straight knee (below the knee) and a hip at zero (above the knee) or no loss from baseline; independent bed mobility, transfer to the wheelchair and indoor wheeling (BAMS 8 of 8); exercise pain at 4/10 or less; a shrinker started once the surgeon allows; and a daily home programme done correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• لا وسادةَ تحت الركبة ولا تحت الفخذ، ولا جلوسَ طويلاً والجذعُ مثنيّ — والانبطاحُ ثلاثَ مرّاتٍ يومياً.\n" +
        "• الجرحُ لا يُفتح ولا يُغيَّر ضمادُه إلّا ممّن يعرف؛ وأخبرنا فوراً عن رائحةٍ أو حرارةٍ أو احمرارٍ ينتشر أو إفرازٍ جديد.\n" +
        "• الإحساسُ بالساق المبتورة طبيعيّ — لكنّه قد يجعلك تقف عليها ليلاً فتسقط: الكرسيّ بجانب السرير وضوءٌ في الليل.\n" +
        "• القدمُ السليمة ثمينة: افحصها كلَّ يومٍ بالمرآة، والبس حذاءً مغلقاً، ولا تمشِ حافياً.\n" +
        "• التدخينُ يؤخّر التئامَ الجرح، والأكلُ الغنيّ بالبروتين وضبطُ السكّر يسرّعانه.\n" +
        "• رباطُ الجذع الضاغط يُلبس حين يأذن الجرّاح — يحفظ شكلَ الجذع لقالب الطرف.\n" +
        "• الطرفُ يأتي حين يجهز الجذع، والفريقُ يقرّره — والمراحلُ ومدّتُها تُشرح لك ولأهلك.",
        "Key messages — in plain language:\n" +
        "• No pillow under the knee or thigh, and no long sitting with the limb bent — and lie face down three times a day.\n" +
        "• The wound is not uncovered or redressed except by someone trained to; tell us at once about a smell, heat, spreading redness or new discharge.\n" +
        "• Feeling the missing leg is normal — but it can make you stand on it at night and fall: the wheelchair beside the bed and a light at night.\n" +
        "• The sound foot is precious: check it every day with a mirror, wear a closed shoe, and never walk barefoot.\n" +
        "• Smoking delays wound healing; protein-rich food and good blood-sugar control speed it up.\n" +
        "• The shrinker goes on when the surgeon allows — it keeps the limb shaped for the socket.\n" +
        "• The prosthesis comes when the limb is ready, and the team decides — the stages and their length are explained to you and your family.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• يأذن الجرّاحُ أو فريقُ الجروح، ولا علامةَ التهاب.\n" +
        "• BAMS ٨ من ٨ لمبتور الساق الواحدة: يجلس من الاستلقاء، وينتقل إلى الكرسيّ، ويتنقّل به في الداخل، ويقف على ساقه السليمة — وحده (Kristensen 2018).\n" +
        "• الركبةُ تستقيم تماماً (تحت الركبة)، أو الوركُ يبلغ الصفرَ في وضعية توماس (فوق الركبة)، أو لا نقصَ عن القياس الأوّل.\n" +
        "• الألمُ في التمرين ٤ من ١٠ أو أقلّ.\n" +
        "• يؤدّي هو أو مرافقُه الوضعياتِ والبرنامجَ المنزليّ صحيحاً أمام المعالج.",
        "Moves to phase 2 when all of these are met:\n" +
        "• The surgeon or wound team agrees, with no signs of infection.\n" +
        "• BAMS 8 of 8 for a single-leg amputee: lying to sitting, transfer to the chair, indoor wheeling, and standing on the sound leg — all independently (Kristensen 2018).\n" +
        "• The knee straightens fully (below the knee), or the hip reaches zero in the Thomas position (above the knee), or there is no loss from baseline.\n" +
        "• Exercise pain at 4/10 or less.\n" +
        "• The patient or carer performs the positioning and home programme correctly in front of the therapist.",
      ],
      notes: [
        "• الجرحُ والقدمُ السليمة والعلاماتُ الحيوية في أوّل كلّ جلسة، والجلسةُ بتقسيمها في «التمارين» من النصّ العامّ.\n" +
        "• سجّل في الجلسة الأولى مقاييسَ البروتوكول: محيطَ الجذع، وبسطَ الورك (والركبة)، وAMPnoPRO أو BAMS، والألمَ الشبحيّ.\n" +
        "• الرباطُ الضاغط بقرار الجرّاح، وفي الأدلّة خلال عشرة أيّامٍ من العملية — والجوربُ قبل الرباط المطّاطيّ الملفوف (BACPAR 2025).\n" +
        "• الانتقالُ بالاستدارة على الساق السليمة أو بلوح الانزلاق — ولا تُستعمل أدواتُ النقل وقوفاً بلا طرف (BACPAR 2025).\n" +
        "• الكرسيُّ هو التنقّلُ الأساسيّ (BACPAR 2025 — 5.6.6)؛ والمشّايةُ في المرحلة ٢ لسببٍ مكتوب.\n" +
        "• مَن وصل وجرحُه ملتئمٌ ومعاييرُ المرحلة متحقّقة يبدأ من المرحلة ٢ أو ٣ — يعدّلها الأخصائيُّ في خطّة المريض.\n" +
        "• أخبر الطبيبَ عن: علامات الالتهاب، واشتباه الجلطة، وألمٍ لا يُضبط.",
        "• Wound, sound foot and vital signs at the start of every session, with the session split as in the general 'Exercises' text.\n" +
        "• Record the protocol's measures at the first session: residual-limb circumference, hip (and knee) extension, AMPnoPRO or BAMS, and phantom pain.\n" +
        "• The shrinker as the surgeon decides, within ten days of surgery in the guidance — a sock before an elastic bandage (BACPAR 2025).\n" +
        "• Transfers by pivoting on the sound leg or with a sliding board — standing transfer aids are not used without a prosthesis (BACPAR 2025).\n" +
        "• The wheelchair is the main means of getting about (BACPAR 2025 — 5.6.6); the frame comes in phase 2 for a documented reason.\n" +
        "• A patient who arrives with a healed wound and the phase criteria met starts in phase 2 or 3 — the specialist adjusts it in the patient's plan.\n" +
        "• Tell the doctor about signs of infection, suspected thrombosis, or uncontrolled pain.",
      ],
      exercises: [
        { code: "residual-limb-positioning" },
        { code: "prone-lying-hip-extension", sets: 2, reps: 10, hold: 5,
          doseNote: ["الانبطاحُ ١٠ دقائق ثلاثَ مرّاتٍ يومياً ثمّ أطول، والرفعُ ٢ × ١٠ بثباتٍ ٥ ثوانٍ بلا ثقل.", "Prone lying 10 minutes three times a day, then longer, and the lift 2 × 10 with 5-second holds, no weight."],
          note: ["قبل الطرف: الجرحُ لا يُضغط على السرير، ولمبتور تحت الركبة الركبةُ ممدودة؛ وبإذن الطبيب لمرضى القلب والرئة.", "Before the prosthesis: no pressure on the wound against the bed, and below the knee the knee stays straight; with the doctor's permission in heart and lung disease."] },
        { code: "thomas-hip-flexor-stretch" },
        { code: "quad-set", sets: 2, reps: 10, hold: 5,
          note: ["لمبتور تحت الركبة: الجذعُ ممدودٌ على المنشفة والفخذُ يشدّ حتى تستقيم الركبةُ تماماً — بلا خطوة سحب القدم؛ وهو أوّلُ منع تيبّس الركبة.", "Below the knee: the limb straight on the towel and the thigh tightening until the knee is fully straight — skip the toe-pull step; it is the first defence against knee contracture."] },
        { code: "glute-bridge", sets: 2, reps: 10, hold: 5,
          note: ["فوق وسادةٍ صلبة أو بطانيةٍ ملفوفة تحت الفخذين (الجذعُ والساقُ السليمة عليها)، والرفعُ متساوٍ — ولا ضغطَ على الجرح.", "Over a firm bolster or rolled blanket under both thighs (the residual limb and the sound leg on it), lifting evenly — and no pressure on the wound."] },
        { code: "amputee-bed-mobility" },
        { code: "amputee-transfers" },
        { code: "wheelchair-skills" },
        { code: "seated-push-ups" },
        { code: "residual-limb-desensitisation",
          note: ["حولَ الجرح وعلى الجذع الملتئم وحده — وتدليكُ الندبة بعد التئامها في المرحلة ٣.", "Around the wound and on healed skin only — scar massage once healed, in phase 3."] },
        { code: "shrinker-donning",
          note: ["حين يأذن الجرّاح — والمعالجُ يلبسه أوّلاً ثمّ المرافق ثمّ المريض.", "Once the surgeon allows it — the therapist puts it on first, then the carer, then the patient."] },
      ],
    },
    {
      name: ["التقوية وتشكيل الجذع", "Strengthening and shaping the residual limb"],
      sessionFrom: 7, sessionTo: 16,
      timeframe: ["نحو الأسبوعين الثاني والثالث في المركز", "About weeks 2–3 at the centre"],
      goals: [
        "باسطاتُ الورك ومبعداتُه بجهتيه ٤ من ٥، وعضلاتُ الركبة تحت البتر والساقُ السليمة والذراعان والجذعُ أقوى؛ ووقوفٌ على الساق السليمة ١٠ ثوانٍ بلا يدين؛ وانتقالٌ مستقلّ في كلّ ما يحتاجه البيت ومهاراتُ كرسيٍّ على الأرض المستوية؛ ورباطٌ ضاغطٌ يلبسه وحده سبعةَ أيّامٍ بلا أذىً للجلد؛ وتنقّلٌ قصيرٌ بالمشّاية لمن يحتاجه بأمان؛ ونهوضٌ من الأرض جُرِّب.",
        "Hip extensors and abductors on both sides at 4/5, with stronger knee muscles below the amputation, sound leg, arms and trunk; standing on the sound leg for 10 seconds without hands; independent transfers for everything the home needs and wheelchair skills on level ground; a shrinker put on independently for seven days without skin damage; short, safe walking with a frame for those who need it; and floor recovery tried.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• الرباطُ الضاغط طوالَ اليوم والليل، ويُنزع للغسل والتمارين — وفحصُ الجلد مرّتين يومياً.\n" +
        "• الألمُ الشبحيّ يُعالج: التدليكُ والرباطُ والحركةُ، والعلاجُ بالمرآة لمن يرغب (VA/DoD 2024)، وأخبر الطبيبَ عن الأدوية.\n" +
        "• السقوطُ شائعٌ قبل الطرف: تعلّم النهوضَ من الأرض، واحمل هاتفك، وإن لم تستطع النهوضَ فازحف إلى الهاتف أو الباب وابقَ دافئاً (BACPAR 2025 — 5.9).\n" +
        "• البيت: الطريقُ من السرير إلى الحمّام بلا عوائق ومضاء، والكرسيُّ يمرّ من الأبواب، ومقعدٌ للاستحمام.\n" +
        "• المشّايةُ في البيت بعد أن يتحقّق المعالجُ من الأمان — والجذعُ لا يتدلّى طويلاً.\n" +
        "• دفعُ الكرسيّ أو التنقّلُ ٢٠–٣٠ دقيقةً يومياً يحفظ اللياقة للمشي بالطرف.",
        "Key messages — in plain language:\n" +
        "• The shrinker all day and night, off for washing and exercise — and a skin check twice a day.\n" +
        "• Phantom pain can be treated: massage, the shrinker, movement, and mirror therapy for those who wish (VA/DoD 2024); tell the doctor about medicines.\n" +
        "• Falls are common before the prosthesis: learn to get up from the floor, carry your phone, and if you cannot get up crawl to the phone or the door and keep warm (BACPAR 2025 — 5.9).\n" +
        "• The home: a clear, lit path from bed to bathroom, doorways the wheelchair fits through, and a shower seat.\n" +
        "• The frame at home only after the therapist has checked it is safe — and the limb does not hang down for long.\n" +
        "• Wheeling or moving about for 20–30 minutes a day keeps you fit for prosthetic walking.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• الجرحُ مغلقٌ بلا إفراز.\n" +
        "• الرباطُ الضاغط يُلبس كما وُصف سبعةَ أيّامٍ متتالية بلا أذىً في الجلد.\n" +
        "• انتقالٌ مستقلّ بين السرير والكرسيّ والمرحاض (والمرحاضِ العربيّ والأرضِ إن كانا في بيته).\n" +
        "• جُرِّب النهوضُ من الأرض بإشراف.\n" +
        "• مهاراتُ الكرسيّ على الأرض المستوية مستقلّة، ومسجّلةٌ في الاستبيان العربيّ (Sarsak 2026).\n" +
        "• يقف على الساق السليمة ١٠ ثوانٍ بلا يدين (وبأطراف الأصابع للضعيف الوعائيّ).\n" +
        "• باسطاتُ الورك ومبعداتُه ٤ من ٥ فأكثر في الاختبار اليدويّ.",
        "Moves to phase 3 when all of these are met:\n" +
        "• The wound is closed with no discharge.\n" +
        "• The shrinker has been worn as prescribed for seven days in a row with no skin damage.\n" +
        "• Independent transfers between bed, chair and toilet (including a squat toilet and the floor if the home has them).\n" +
        "• Floor recovery has been tried under supervision.\n" +
        "• Independent wheelchair skills on level ground, recorded on the Arabic questionnaire (Sarsak 2026).\n" +
        "• Stands on the sound leg for 10 seconds without hands (fingertip support for a frail vascular patient).\n" +
        "• Hip extensors and abductors at 4/5 or better on manual testing.",
      ],
      notes: [
        "• التقويةُ متدرّجة: من وزن الجسم إلى المطّاط والثقل، ٣ × ٨–١٢ بجهدٍ متوسّط — وباسطاتُ الورك أوّلاً (Raya 2010).\n" +
        "• عضلاتُ الفخذ تُقوّى بالتمرين الإراديّ — إضافةُ التحفيز الكهربائيّ إليه لم تُفِد (Talbot 2017).\n" +
        "• الوقوفُ على الساق السليمة: من يدين إلى يدٍ إلى أطراف الأصابع إلى بلا يدين، ثمّ الوصولُ والتقاطُ الكرة.\n" +
        "• المشّاية: الكرسيُّ أساس (BACPAR 2025 — 5.6.6)، فالمشّايةُ لسببٍ يُكتب في الخطّة (حمّامٌ أو بيتٌ لا يدخله الكرسيّ) وتُناقش مخاطرُها مع المريض.\n" +
        "• الدرجُ جلوساً لمن في بيته درج (BACPAR 2025 — 5.6.7)، وطريقةُ القيام في أعلاه متّفقٌ عليها.\n" +
        "• العلاجُ بالمرآة لمن يتألّم وحده، والألمُ قبله وبعده يُسجَّل؛ ومَن يزيد ألمُه يُحال إلى التخيّل الحركيّ المتدرّج بيد معالجٍ متمرّس (Limakatso 2020).\n" +
        "• جهازُ تدوير الذراعين: النبضُ والضغطُ قبله وبعده لمرضى القلب، وسجّل الواط.",
        "• Progressive strengthening: from body weight to bands and weights, 3 × 8–12 at moderate effort — hip extensors first (Raya 2010).\n" +
        "• The thigh muscles are strengthened by voluntary exercise — adding electrical stimulation did not help (Talbot 2017).\n" +
        "• Standing on the sound leg: from two hands to one hand to fingertips to no hands, then reaching and catching a ball.\n" +
        "• The frame: the wheelchair is the default (BACPAR 2025 — 5.6.6), so a frame needs a reason written in the plan (a bathroom or home the wheelchair cannot enter) with its risks discussed with the patient.\n" +
        "• Stairs sitting down for those with stairs at home (BACPAR 2025 — 5.6.7), with the way up from the floor at the top agreed.\n" +
        "• Mirror therapy only for those in pain, with pain recorded before and after; anyone whose pain gets worse is referred for graded motor imagery with an experienced therapist (Limakatso 2020).\n" +
        "• Arm ergometer: pulse and blood pressure before and after in heart patients, and record the watts.",
      ],
      exercises: [
        { code: "prone-lying-hip-extension", sets: 3, reps: 10, hold: 5,
          note: ["بمطّاطٍ أو ثقلٍ خفيف فوق طرف الجذع حين يلتئم — باسطاتُ الورك أقوى ما يتنبّأ بالمشي بالطرف (Raya 2010).", "With a band or a light weight above the end of the limb once healed — hip extensor strength is the strongest predictor of prosthetic walking (Raya 2010)."] },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10,
          note: ["للجهتين: على الجنب السليم يُرفع الجذع، وعلى جنب الجذع تُرفع الساقُ السليمة؛ ولمبتور فوق الركبة يُضاف ضمُّ الفخذين على منشفةٍ ملفوفة ضدّ تيبّس الإبعاد.", "Both sides: lying on the sound side the residual limb lifts, lying on the amputated side the sound leg lifts; above the knee, add squeezing a rolled towel between the thighs against abduction contracture."] },
        { code: "straight-leg-raise", sets: 3, reps: 10, hold: 3,
          note: ["لمبتور تحت الركبة: الجذعُ ممدودٌ والركبةُ مستقيمة قبل الرفع؛ ولمبتور فوق الركبة لا يُستعمل.", "Below the knee: the limb straight with the knee locked before lifting; not used above the knee."] },
        { code: "seated-knee-extension", sets: 3, reps: 10, hold: 3,
          note: ["لمبتور تحت الركبة: مدُّ الجذع حتى تستقيم الركبةُ تماماً، والمقاومةُ مطّاطٌ حول الجذع فوق الضماد أو حزامُ ثقلٍ بعد الالتئام — لا ثقلَ كاحل؛ ولمبتور فوق الركبة لا يُستعمل.", "Below the knee: straightening the limb until the knee is fully straight, with resistance from a band around the limb over the dressing or a weight strap once healed — no ankle weight; not used above the knee."] },
        { code: "sit-to-stand", sets: 3, reps: 8,
          note: ["على الساق السليمة: القدمُ تحت الجسم والأنفُ فوقها، واليدان على المسندين أوّلاً ثمّ أقلّ؛ ومن مقعدٍ أعلى أوّلاً. وتوقّف عند ألمٍ في القدم السليمة أو أثرِ ضغطٍ عليها.", "On the sound leg: the foot under the body and the nose over it, hands on the armrests at first and then less; from a higher seat first. Stop for pain or pressure marks on the sound foot."] },
        { code: "single-leg-balance", sets: 1, reps: 5, hold: 10,
          note: ["على الساق السليمة بين القضبان أو بجانب طاولةٍ ثابتة: من يدين إلى يدٍ إلى أطراف الأصابع — والوقوفُ عليها من أكثر ما تنبّأ بالمشي بالطرف (Schoppen 2003). في البيت بجانب سندٍ ثابت ومرافق.", "On the sound leg in the bars or beside a solid table: from two hands to one to fingertips — standing on it is among the strongest predictors of prosthetic walking (Schoppen 2003). At home beside a fixed support with a carer."] },
        { code: "band-row", sets: 3, reps: 10,
          note: ["جالساً في الكرسيّ — لعضلات الظهر والكتفين التي تدفع الكرسيّ وتحمل المشّاية (VA/DoD 2024).", "Seated in the wheelchair — for the back and shoulder muscles that push the chair and carry the frame (VA/DoD 2024)."] },
        { code: "seated-push-ups", sets: 3, reps: 10 },
        { code: "walker-hop-to" },
        { code: "arm-ergometer" },
        { code: "shrinker-donning",
          note: ["يلبسه المريضُ وحده، ويُراجع المقاسَ حين يرتخي.", "The patient puts it on alone, with the size reviewed as it loosens."] },
        { code: "phantom-mirror-therapy" },
        { code: "floor-to-stand-recovery",
          doseNote: ["مرّتين أو ثلاثاً في الجلسة بإشراف، وفي البيت بحضور شخص.", "Two or three supervised rehearsals per session, and at home with someone present."],
          note: ["بلا طرف: الركوعُ على ركبة الساق السليمة والجذعُ محميّ، أو الجلوسُ على الدرجة الأولى ثمّ الكرسيّ — وخطّةُ «لا أستطيع النهوض» لكلّ مريض.", "Without a prosthesis: kneel on the sound knee with the residual limb protected, or sit on a low step and then the chair — and the 'I can't get up' plan for every patient."] },
      ],
    },
    {
      name: ["الاستعداد للقالب", "Getting ready for casting"],
      sessionFrom: 17, sessionTo: 24,
      timeframe: ["نحو الأسبوع الرابع — ويمتدّ بستِّ جلساتٍ في كلّ مرّة حتى نحو ٤٨ حين لا تتحقّق المعايير", "About week 4 — extended by six sessions at a time up to about 48 when the criteria are not met"],
      goals: [
        "جذعٌ ملتئمٌ ثابتُ الحجم بندبةٍ متحرّكة وبلا تيبّسٍ يمنع القالب، ووقوفٌ على الساق السليمة ١٥–٣٠ ثانية، وتنقّلٌ آمن بالكرسيّ أو المشّاية أو العكّازين، وAMPnoPRO وTUG أو المشيُ دقيقتين بالمساعد مسجّلةٌ ومتحسّنة، وبرنامجٌ منزليّ مستقلّ — ثمّ الإحالةُ لأخذ القالب.",
        "A healed residual limb of stable volume with a mobile scar and no contracture that prevents casting, standing on the sound leg for 15–30 seconds, safe mobility in the wheelchair or with a frame or crutches, AMPnoPRO and TUG or the two-minute walk with the aid recorded and improved, and an independent home programme — then referral for casting.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• القالبُ يُؤخذ حين يثبت حجمُ الجذع — ويُقاس في المركز ثلاثَ مرّاتٍ بين كلٍّ منها يومان.\n" +
        "• الرباطُ الضاغط يستمرّ حتى استلام الطرف، وبعده كلّما خُلع الطرف.\n" +
        "• بعد القالب: لبسُ الطرف والتدريبُ على المشي به في بروتوكول «التدريب على المشي بالطرف»، وقد يستغرق أسابيع.\n" +
        "• الكرسيُّ يبقى نافعاً بعد الطرف للمسافات الطويلة والليل.\n" +
        "• إن تأخّر الطرف: برنامجُك المنزليّ يوميّ، وجلستان أو ثلاثٌ في الأسبوع تحفظ ما كسبت.",
        "Key messages — in plain language:\n" +
        "• The socket is cast when the limb volume is stable — measured at the centre three times, two days apart.\n" +
        "• The shrinker continues until the prosthesis arrives, and afterwards whenever the prosthesis is off.\n" +
        "• After casting: putting on the prosthesis and learning to walk with it follow in the 'Prosthetic gait training' protocol, which may take weeks.\n" +
        "• The wheelchair stays useful after the prosthesis for long distances and at night.\n" +
        "• If the prosthesis is delayed: your home programme is daily, and two or three sessions a week keep what you have gained.",
      ],
      criteria: [
        "يُحال لأخذ القالب حين تتحقّق كلُّها:\n" +
        "• الجرحُ ملتئمٌ والندبةُ متحرّكة، ولا ورمٌ عصبيّ مؤلم ولا نتوءُ عظمٍ يمنع تحميلَ القالب.\n" +
        "• محيطُ الجذع ثابت: لا يتغيّر أكثرَ من ٠٫٥ سم عند كلّ مستوى في ثلاثة قياساتٍ بين كلٍّ منها يومان (القاعدةُ من Sanders & Fatone 2011، والسماحُ مقترح).\n" +
        "• التيبّس: نقصُ بسط الركبة ١٠° على الأكثر (تحت الركبة)، ونقصُ بسط الورك ١٥° على الأكثر (فوق الركبة) — حدودٌ مقترحة، والأشدُّ يُركَّب له بقالبٍ معدَّل (Poonsiri 2022).\n" +
        "• يقف على الساق السليمة ١٥–٣٠ ثانية.\n" +
        "• AMPnoPRO وTUG أو المشيُ دقيقتين بالمساعد مسجّلةٌ ومتحسّنة.\n" +
        "• يؤدّي برنامجَه المنزليّ وحده.\n" +
        "وإن لم تتحقّق في الجلسة ٢٤: ستُّ جلساتٍ أخرى في كلّ مرّة حتى نحو ٤٨ — خاصّةً مع جرحٍ لم يلتئم، أو بترٍ وعائيٍّ فوق الركبة، أو بترِ الطرفين، أو كسورٍ أو إصابةِ أعصاب.",
        "Referred for casting when all of these are met:\n" +
        "• The wound is healed and the scar mobile, with no painful neuroma or bony prominence that prevents socket loading.\n" +
        "• Stable circumference: no more than 0.5 cm change at each level over three measurements two days apart (the rule from Sanders & Fatone 2011; the tolerance is a proposal).\n" +
        "• Contracture: knee extension lacking no more than 10° (below the knee), and hip extension lacking no more than 15° (above the knee) — proposed limits; worse contractures are fitted with an adapted socket (Poonsiri 2022).\n" +
        "• Stands on the sound leg for 15–30 seconds.\n" +
        "• AMPnoPRO and TUG or the two-minute walk with the aid recorded and improved.\n" +
        "• Does the home programme independently.\n" +
        "If they are not met by session 24: six more sessions at a time up to about 48 — especially with an unhealed wound, a vascular above-knee amputation, bilateral amputation, or fractures or nerve injury.",
      ],
      notes: [
        "• العددُ (٢٤ ويمتدّ بستّ جلسات) اختيارُ خدمةٍ لا دليل: أفضلُ حالات تحت الركبة جهزت للطرف بعد نحو خمسة أسابيع من العملية (Fridriksson 2026)، والوعائيُّ وفوق الركبة أطول.\n" +
        "• القياسُ الدقيق للمحيط: الشريطُ نفسُه، والنقاطُ نفسُها، والوقتُ نفسُه من اليوم، وبعد نزع الرباط بوقتٍ ثابت.\n" +
        "• جلسةٌ مشتركة مع فنّيّ الأطراف قبل القالب: الجذعُ والندبةُ ونقاطُ الضغط والتيبّس.\n" +
        "• إن تأخّر الطرف بعد القالب: جلستان أو ثلاثٌ في الأسبوع للحفظ، والبرنامجُ المنزليّ يوميّ.\n" +
        "• في الإحالة: المقاييسُ كلُّها، ومستوى المشي المتوقّع يُناقش بصراحة مع المريض وأهله (BACPAR 2025 — 3.2).",
        "• The number (24, extended by six) is a service choice, not evidence: the best below-knee cases were ready for a prosthesis about five weeks after surgery (Fridriksson 2026), and vascular and above-knee cases take longer.\n" +
        "• Precise circumference measurement: the same tape, the same points, the same time of day, and a fixed interval after taking the shrinker off.\n" +
        "• A joint session with the prosthetist before casting: the limb, the scar, pressure points and contracture.\n" +
        "• If the prosthesis is delayed after casting: two or three maintenance sessions a week, with the daily home programme.\n" +
        "• At referral: all the measures, and the expected level of walking discussed frankly with the patient and family (BACPAR 2025 — 3.2).",
      ],
      exercises: [
        { code: "single-leg-balance", sets: 1, reps: 5, hold: 30,
          note: ["على الساق السليمة بلا يدين ثمّ مع الوصول والتقاط الكرة، والعينان مغمضتان والسندُ قريب.", "On the sound leg without hands, then reaching and catching a ball, and eyes closed with support close by."] },
        { code: "sit-to-stand", sets: 3, reps: 10,
          note: ["على الساق السليمة من مقعدٍ أخفض وبيدين أقلّ، والنزولُ بطيء.", "On the sound leg from a lower seat with less arm use, lowering slowly."] },
        { code: "prone-lying-hip-extension", sets: 3, reps: 12, hold: 5,
          note: ["بمقاومةٍ أكبر، ثمّ بسطُ الورك واقفاً بين القضبان على الساق السليمة.", "With more resistance, then standing hip extension in the bars on the sound leg."] },
        { code: "side-lying-hip-abduction", sets: 3, reps: 12,
          note: ["بمطّاطٍ أو ثقلٍ على الفخذ — للجهتين.", "With a band or a weight on the thigh — both sides."] },
        { code: "glute-bridge", sets: 3, reps: 10, hold: 5,
          note: ["فوق الوسادة الصلبة، والذراعان على الصدر، والحملُ أكثر على جهة الجذع.", "Over the firm bolster, arms crossed on the chest, with more load through the amputated side."] },
        { code: "mcgill-curl-up", sets: 2, reps: 6,
          note: ["لثبات الجذع — وهو أهمّ لمبتور فوق الركبة والطرفين؛ والساقُ المثنيّة هي السليمة.", "For trunk stability — more important above the knee and in bilateral loss; the bent leg is the sound one."] },
        { code: "walker-hop-to",
          note: ["العكّازان والأرضُ الخارجية لمن يناسبه، والدرجُ جلوساً كاملاً لمن في بيته درج.", "Crutches and outdoor ground for those it suits, and a full flight of stairs sitting for those with stairs at home."] },
        { code: "arm-ergometer",
          note: ["١٥–٢٠ دقيقةً متّصلة، وسجّل أعلى واط — ٣٠ واط هدفٌ لمبتور فوق الركبة الوعائيّ (Erjavec 2014).", "15–20 minutes continuously, recording peak watts — 30 W is a target for a vascular above-knee amputee (Erjavec 2014)."] },
        { code: "floor-to-stand-recovery",
          doseNote: ["مرّةً أو مرّتين في الجلسة حتى يتقنه، ثمّ في البيت بحضور شخص.", "Once or twice per session until mastered, then at home with someone present."],
          note: ["بلا طرف — حتى ينهض وحده أو يُتقن خطّةَ «لا أستطيع النهوض».", "Without a prosthesis — until the patient gets up alone or has mastered the 'I can't get up' plan."] },
        { code: "residual-limb-desensitisation",
          note: ["والآن تدليكُ الندبة الملتئمة، والضغطُ على سطحٍ أقسى تمهيداً لتحميل القالب.", "Now scar massage on the healed scar, and pressing onto a firmer surface in preparation for socket loading."] },
        { code: "shrinker-donning",
          note: ["يستمرّ حتى استلام الطرف، والمقاسُ الأصغر حين يرتخي.", "Continues until the prosthesis arrives, with a smaller size as it loosens."] },
      ],
    },
  ],
};

export const name = "136_physio_preprosthetic_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
